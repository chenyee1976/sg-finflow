import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  statementId: z.string().uuid(),
  statementKind: z.enum(["bank", "card"]).optional().default("bank"),
});

export const ExtractedSchema = z.object({
  transactions: z.array(
    z.object({
      date: z.string(),
      description: z.string().optional().default(""),
      merchant: z.string().optional().default(""),
      amount: z.number(),
      category: z.string().optional().default("Uncategorised"),
      mcc_code: z.string().optional().nullable(),
    }),
  ),
  period_start: z.string().optional().nullable(),
  period_end: z.string().optional().nullable(),
  bank_or_card: z.string().optional().nullable(),
  source_type: z.enum(["bank", "card"]).optional().nullable(),
  accounts: z
    .array(
      z.object({
        bank_name: z.string().optional().nullable(),
        account_name: z.string().optional().nullable(),
        account_number: z.string().optional().nullable(),
        currency: z.string().optional().nullable(),
        balance: z.number().optional().nullable(),
        balance_as_of: z.string().optional().nullable(),
      }),
    )
    .optional()
    .default([]),
  card: z
    .object({
      issuer: z.string().optional().nullable(),
      card_type: z.string().optional().nullable(),
      card_name: z.string().optional().nullable(),
      card_number: z.string().optional().nullable(),
      payment_due_date: z.string().optional().nullable(),
      miles_opening: z.number().optional().nullable(),
      miles_earned: z.number().optional().nullable(),
      miles_bonus: z.number().optional().nullable(),
      miles_redeemed: z.number().optional().nullable(),
      miles_ending: z.number().optional().nullable(),
    })
    .optional()
    .nullable(),
});

export type ExtractedData = z.infer<typeof ExtractedSchema>;

const CommitInput = z.object({
  statementId: z.string().uuid(),
  statementKind: z.enum(["bank", "card"]),
  data: ExtractedSchema,
});

const SYSTEM_PROMPT = `You are a financial statement parser. Extract every transaction from the provided statement (Singapore bank or credit card).

Return STRICT JSON only, matching this shape:
{
  "period_start": "YYYY-MM-DD" | null,
  "period_end": "YYYY-MM-DD" | null,
  "bank_or_card": string | null,
  "source_type": "bank" | "card" | null,
  "accounts": [
    {
      "bank_name": string | null,        // e.g. "POSB", "DBS", "OCBC"
      "account_name": string | null,     // e.g. "POSB Passbook Savings Account"
      "account_number": string | null,   // as shown, keep dashes e.g. "199-00618-5"
      "currency": string | null,         // ISO code e.g. "SGD"
      "balance": number | null,          // closing balance as of statement date
      "balance_as_of": "YYYY-MM-DD" | null
    }
  ],
  "card": {
    "issuer": string | null,             // e.g. "Citibank", "DBS", "OCBC"
    "card_type": string | null,          // "Visa" | "Mastercard" | "American Express" | "UnionPay" | null
    "card_name": string | null,          // e.g. "Citi PremierMiles World Mastercard"
    "card_number": string | null,        // full formatted e.g. "5425-5033-0193-7628"
    "payment_due_date": "YYYY-MM-DD" | null,
    "miles_opening": number | null,      // miles carried forward
    "miles_earned": number | null,       // base miles earned this month
    "miles_bonus": number | null,        // bonus miles earned this month
    "miles_redeemed": number | null,     // miles redeemed or adjusted this month
    "miles_ending": number | null        // total available / ending balance
  },
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": string,
      "merchant": string,
      "amount": number,   // negative for debits/expenses, positive for credits/income
      "category": string, // one of: Food, Transport, Groceries, Shopping, Bills, Entertainment, Travel, Health, Income, Transfer, Other
      "mcc_code": string | null
    }
  ]
}

Rules:
- Use ISO dates. If only DD/MM is present, infer year from the statement period.
- amount is signed: spends/withdrawals are negative, income/credits are positive.
- Skip running balances and summary rows. Only individual transactions.
- For bank statements, populate "accounts" with every account listed in the Account Summary (name, number, currency, closing balance, as-of date). Even if there are no transactions, still return the account row(s).
 - For credit card statements, set source_type="card" and populate "card" with issuer, card type (Visa/Mastercard/Amex/UnionPay), full card number (keep the dashes shown), payment due date, and the miles summary block if present (carried forward = miles_opening, earned this month = miles_earned, bonus this month = miles_bonus, redeemed/adjusted = miles_redeemed, total available = miles_ending). Set "accounts" to [] for card statements.
- No commentary, no markdown, JSON object only.`;

export const extractStatement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const { supabase, userId } = context;

    const { data: stmt, error: stmtErr } = await supabase
      .from("statements")
      .select("id, file_path, file_type, file_name, status, source_type")
      .eq("id", data.statementId)
      .maybeSingle();
    if (stmtErr) throw stmtErr;
    if (!stmt) throw new Error("Statement not found");
    if (!stmt.file_path) throw new Error("Statement has no file");

    await supabase.from("statements").update({ status: "processing" }).eq("id", stmt.id);

    // Download from storage
    const { data: blob, error: dlErr } = await supabase.storage
      .from("statements")
      .download(stmt.file_path);
    if (dlErr || !blob) throw dlErr ?? new Error("Could not download file");

    const mime = stmt.file_type ?? blob.type ?? "application/octet-stream";
    const arrayBuf = await blob.arrayBuffer();

    const kindHint =
      data.statementKind === "card"
        ? "This is a CREDIT CARD statement. Populate the 'card' object (issuer, card type, card name, full card number with dashes, payment due date, miles opening/earned/bonus/redeemed/ending) and list every card transaction."
        : "This is a BANK statement. Populate 'accounts' with each account's closing balance.";
    let userContent: unknown;
    if (mime.startsWith("image/")) {
      const b64 = bufferToBase64(arrayBuf);
      userContent = [
        { type: "text", text: `${kindHint} Extract all data from this statement image.` },
        { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
      ];
    } else if (mime === "application/pdf" || stmt.file_name.toLowerCase().endsWith(".pdf")) {
      const b64 = bufferToBase64(arrayBuf);
      userContent = [
        { type: "text", text: `${kindHint} Extract all data from this PDF statement.` },
        {
          type: "file",
          file: {
            filename: stmt.file_name,
            file_data: `data:application/pdf;base64,${b64}`,
          },
        },
      ];
    } else {
      // CSV / text
      const text = new TextDecoder().decode(arrayBuf);
      userContent = `${kindHint}\n\nExtract all data from this CSV/text statement:\n\n${text.slice(0, 200_000)}`;
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const body = await aiRes.text();
      await supabase
        .from("statements")
        .update({ status: "failed" })
        .eq("id", stmt.id);
      if (aiRes.status === 429) throw new Error("AI rate limit. Try again in a moment.");
      if (aiRes.status === 402) throw new Error("AI credits exhausted. Add credits in workspace billing.");
      throw new Error(`AI extraction failed: ${body.slice(0, 200)}`);
    }

    const json = (await aiRes.json()) as {
      choices: { message: { content: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: ExtractedData;
    try {
      parsed = ExtractedSchema.parse(JSON.parse(stripCodeFence(raw)));
    } catch (e) {
      await supabase.from("statements").update({ status: "failed" }).eq("id", stmt.id);
      throw new Error(`AI returned invalid JSON: ${(e as Error).message}`);
    }

    // Save extracted data for user review — do NOT commit to transactions/accounts/cards yet.
    await supabase
      .from("statements")
      .update({
        status: "review",
        extracted_data: parsed,
        period_start: parsed.period_start ?? null,
        period_end: parsed.period_end ?? null,
        bank_or_card: parsed.bank_or_card ?? null,
        source_type: data.statementKind ?? parsed.source_type ?? null,
        ai_model_used: "google/gemini-2.5-flash",
      })
      .eq("id", stmt.id);

    return { count: parsed.transactions.length, needsReview: true as const };
  });

export const commitStatement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CommitInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const parsed = data.data;

    const { data: stmt, error: stmtErr } = await supabase
      .from("statements")
      .select("id")
      .eq("id", data.statementId)
      .maybeSingle();
    if (stmtErr) throw stmtErr;
    if (!stmt) throw new Error("Statement not found");

    // Remove any previously committed rows for this statement (idempotent commit).
    await supabase.from("transactions").delete().eq("statement_id", stmt.id);

    // Upsert credit card if present (card statement)
    let cardId: string | null = null;
    const c = parsed.card ?? null;
    const normalizeCard = (s: string | null | undefined) =>
      (s ?? "").replace(/[\s-]/g, "").toLowerCase();
    if (data.statementKind === "card" && c) {
      const issuer = c?.issuer ?? parsed.bank_or_card ?? "Unknown";
      const cardName = c?.card_name ?? parsed.bank_or_card ?? "Credit Card";
      const cardNumber = c?.card_number ?? null;
      const lastFour = cardNumber ? cardNumber.replace(/\D/g, "").slice(-4) : null;

      const { data: existingCards } = await supabase
        .from("credit_cards")
        .select("id, card_number, card_name, bank_name, last_four")
        .eq("user_id", userId);

      const match = (existingCards ?? []).find((r) => {
        if (cardNumber && r.card_number) {
          return normalizeCard(r.card_number) === normalizeCard(cardNumber);
        }
        if (lastFour && r.last_four) return r.last_four === lastFour;
        return (
          normalizeCard(r.bank_name) === normalizeCard(issuer) &&
          normalizeCard(r.card_name) === normalizeCard(cardName)
        );
      });

      const update = {
        card_number: cardNumber ?? undefined,
        card_type: c?.card_type ?? undefined,
        payment_due_date: c?.payment_due_date ?? undefined,
        statement_period_end: parsed.period_end ?? undefined,
        miles_opening: c?.miles_opening ?? undefined,
        miles_earned: c?.miles_earned ?? undefined,
        miles_bonus: c?.miles_bonus ?? undefined,
        miles_redeemed: c?.miles_redeemed ?? undefined,
        miles_ending: c?.miles_ending ?? undefined,
        last_four: lastFour ?? undefined,
      };

      if (match) {
        await supabase.from("credit_cards").update(update).eq("id", match.id);
        cardId = match.id;
      } else {
        const { data: inserted } = await supabase
          .from("credit_cards")
          .insert({
            user_id: userId,
            bank_name: issuer,
            card_name: cardName,
            card_type: c?.card_type ?? null,
            card_number: cardNumber,
            last_four: lastFour,
            payment_due_date: c?.payment_due_date ?? null,
            statement_period_end: parsed.period_end ?? null,
            miles_opening: c?.miles_opening ?? null,
            miles_earned: c?.miles_earned ?? null,
            miles_bonus: c?.miles_bonus ?? null,
            miles_redeemed: c?.miles_redeemed ?? null,
            miles_ending: c?.miles_ending ?? null,
          })
          .select("id")
          .single();
        cardId = inserted?.id ?? null;
      }
    }

    const rows = parsed.transactions.map((t) => ({
      user_id: userId,
      statement_id: stmt.id,
      credit_card_id: cardId,
      date: t.date,
      description: t.description,
      merchant: t.merchant,
      amount: t.amount,
      category: t.category,
      mcc_code: t.mcc_code ?? null,
      ai_confidence: 0.85,
    }));

    if (rows.length) {
      const { error: insErr } = await supabase.from("transactions").insert(rows);
      if (insErr) throw insErr;
    }

    // Upsert bank accounts extracted from the statement (skip for card statements)
    if (data.statementKind !== "card") for (const acc of parsed.accounts ?? []) {
      if (!acc.account_name && !acc.account_number) continue;
      const bankName = acc.bank_name ?? parsed.bank_or_card ?? "Unknown";
      const accountName = acc.account_name ?? bankName;
      const currency = acc.currency ?? "SGD";
      const balance = Number(acc.balance ?? 0);
      const asOf = acc.balance_as_of ?? parsed.period_end ?? null;

      // Try to match an existing account
      const { data: existing } = await supabase
        .from("bank_accounts")
        .select("id, account_number, account_name, bank_name, balance_as_of")
        .eq("user_id", userId);

      const normalize = (s: string | null | undefined) =>
        (s ?? "").replace(/[\s-]/g, "").toLowerCase();

      const match = (existing ?? []).find((r) => {
        if (acc.account_number && r.account_number) {
          return normalize(r.account_number) === normalize(acc.account_number);
        }
        return (
          normalize(r.bank_name) === normalize(bankName) &&
          normalize(r.account_name) === normalize(accountName)
        );
      });

      if (match) {
        // Only update balance if this statement is newer (or no prior date)
        const shouldUpdate =
          !match.balance_as_of || (asOf && asOf >= match.balance_as_of);
        if (shouldUpdate) {
          await supabase
            .from("bank_accounts")
            .update({
              current_balance: balance,
              balance_as_of: asOf,
              currency,
              account_number: acc.account_number ?? null,
            })
            .eq("id", match.id);
        }
      } else {
        await supabase.from("bank_accounts").insert({
          user_id: userId,
          bank_name: bankName,
          account_name: accountName,
          account_type: "Savings",
          account_number: acc.account_number ?? null,
          currency,
          opening_balance: balance,
          current_balance: balance,
          balance_as_of: asOf,
        });
      }
    }

    await supabase
      .from("statements")
      .update({
        status: "completed",
        processed_at: new Date().toISOString(),
        transaction_count: rows.length,
        period_start: parsed.period_start ?? null,
        period_end: parsed.period_end ?? null,
        bank_or_card: parsed.bank_or_card ?? null,
        source_type: data.statementKind ?? parsed.source_type ?? null,
        extracted_data: parsed,
      })
      .eq("id", stmt.id);

    return { count: rows.length };
  });

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function stripCodeFence(s: string): string {
  const t = s.trim();
  if (t.startsWith("```")) {
    return t.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  return t;
}