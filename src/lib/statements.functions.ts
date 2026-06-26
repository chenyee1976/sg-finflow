import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({ statementId: z.string().uuid() });

const TxnSchema = z.object({
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
});

const SYSTEM_PROMPT = `You are a financial statement parser. Extract every transaction from the provided statement (Singapore bank or credit card).

Return STRICT JSON only, matching this shape:
{
  "period_start": "YYYY-MM-DD" | null,
  "period_end": "YYYY-MM-DD" | null,
  "bank_or_card": string | null,
  "source_type": "bank" | "card" | null,
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
      .select("id, file_path, file_type, file_name, status")
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

    let userContent: unknown;
    if (mime.startsWith("image/")) {
      const b64 = bufferToBase64(arrayBuf);
      userContent = [
        { type: "text", text: "Extract all transactions from this statement image." },
        { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
      ];
    } else if (mime === "application/pdf" || stmt.file_name.toLowerCase().endsWith(".pdf")) {
      const b64 = bufferToBase64(arrayBuf);
      userContent = [
        { type: "text", text: "Extract all transactions from this PDF statement." },
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
      userContent = `Extract all transactions from this CSV/text statement:\n\n${text.slice(0, 200_000)}`;
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
    let parsed: z.infer<typeof TxnSchema>;
    try {
      parsed = TxnSchema.parse(JSON.parse(stripCodeFence(raw)));
    } catch (e) {
      await supabase.from("statements").update({ status: "failed" }).eq("id", stmt.id);
      throw new Error(`AI returned invalid JSON: ${(e as Error).message}`);
    }

    const rows = parsed.transactions.map((t) => ({
      user_id: userId,
      statement_id: stmt.id,
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

    await supabase
      .from("statements")
      .update({
        status: "completed",
        processed_at: new Date().toISOString(),
        transaction_count: rows.length,
        period_start: parsed.period_start ?? null,
        period_end: parsed.period_end ?? null,
        bank_or_card: parsed.bank_or_card ?? null,
        source_type: parsed.source_type ?? null,
        ai_model_used: "google/gemini-2.5-flash",
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