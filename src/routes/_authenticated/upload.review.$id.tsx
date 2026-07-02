import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Loader2, Landmark, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { commitStatement, type ExtractedData } from "@/lib/statements.functions";

export const Route = createFileRoute("/_authenticated/upload/review/$id")({
  head: () => ({ meta: [{ title: "Review extraction — CashFlow AI" }] }),
  component: ReviewPage,
});

type Statement = {
  id: string;
  file_name: string;
  source_type: "bank" | "card" | null;
  extracted_data: ExtractedData | null;
};

function ReviewPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const commit = useServerFn(commitStatement);
  const [data, setData] = useState<ExtractedData | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: stmt, isLoading } = useQuery({
    queryKey: ["statement-review", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("statements")
        .select("id, file_name, source_type, extracted_data")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Statement | null;
    },
  });

  useEffect(() => {
    if (stmt?.extracted_data && !data) setData(stmt.extracted_data);
  }, [stmt, data]);

  if (isLoading || !stmt || !data) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const kind: "bank" | "card" = stmt.source_type === "card" ? "card" : "bank";

  function update(patch: Partial<ExtractedData>) {
    setData((d) => (d ? { ...d, ...patch } : d));
  }

  async function onConfirm() {
    if (!data) return;
    setSaving(true);
    try {
      const result = await commit({ data: { statementId: id, statementKind: kind, data } });
      toast.success(`Saved ${result.count} transaction${result.count === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["credit_cards"] });
      qc.invalidateQueries({ queryKey: ["bank_accounts_balances"] });
      qc.invalidateQueries({ queryKey: ["statements"] });
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="mx-auto w-full max-w-2xl px-4 pt-6">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/upload" })}
            className="grid h-9 w-9 place-items-center rounded-full bg-card shadow-sm"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">Review extraction</h1>
            <p className="truncate text-xs text-muted-foreground">{stmt.file_name}</p>
          </div>
        </header>

        <div className="mt-3 rounded-xl border border-primary/30 bg-primary-light/40 p-3 text-xs text-muted-foreground">
          AI extracted the details below. Verify and edit anything wrong before saving — this data
          will then appear on your Home / Cashflow / Rewards dashboards.
        </div>

        {kind === "bank" ? (
          <BankSection data={data} update={update} />
        ) : (
          <CardSection data={data} update={update} />
        )}

        <TxnSection data={data} update={update} kind={kind} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 p-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate({ to: "/upload" })}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button className="flex-1" onClick={onConfirm} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirm & save
          </Button>
        </div>
      </div>
    </div>
  );
}

function BankSection({
  data,
  update,
}: {
  data: ExtractedData;
  update: (p: Partial<ExtractedData>) => void;
}) {
  const accounts = data.accounts ?? [];

  function setAcc(i: number, patch: Partial<(typeof accounts)[number]>) {
    const next = accounts.map((a, idx) => (idx === i ? { ...a, ...patch } : a));
    update({ accounts: next });
  }
  function addAcc() {
    update({
      accounts: [
        ...accounts,
        {
          bank_name: "",
          account_name: "",
          account_number: "",
          currency: "SGD",
          balance: 0,
          balance_as_of: data.period_end ?? null,
        },
      ],
    });
  }
  function delAcc(i: number) {
    update({ accounts: accounts.filter((_, idx) => idx !== i) });
  }

  return (
    <section className="mt-4">
      <SectionHeader icon={<Landmark className="h-4 w-4" />} title="Bank account(s)" />
      {accounts.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">No account extracted.</p>
      )}
      <div className="mt-2 space-y-3">
        {accounts.map((a, i) => (
          <div key={i} className="rounded-2xl bg-card p-3 shadow-sm">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Bank name" value={a.bank_name ?? ""} onChange={(v) => setAcc(i, { bank_name: v })} />
              <Field label="Account name" value={a.account_name ?? ""} onChange={(v) => setAcc(i, { account_name: v })} />
              <Field label="Account number" value={a.account_number ?? ""} onChange={(v) => setAcc(i, { account_number: v })} />
              <Field label="Currency" value={a.currency ?? ""} onChange={(v) => setAcc(i, { currency: v })} />
              <Field
                label="Balance"
                type="number"
                value={a.balance ?? 0}
                onChange={(v) => setAcc(i, { balance: Number(v) || 0 })}
              />
              <Field
                label="Balance as of"
                type="date"
                value={a.balance_as_of ?? ""}
                onChange={(v) => setAcc(i, { balance_as_of: v })}
              />
            </div>
            <button
              type="button"
              onClick={() => delAcc(i)}
              className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" /> Remove account
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addAcc}
        className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary"
      >
        <Plus className="h-4 w-4" /> Add account
      </button>
    </section>
  );
}

function CardSection({
  data,
  update,
}: {
  data: ExtractedData;
  update: (p: Partial<ExtractedData>) => void;
}) {
  const c = data.card ?? {
    issuer: "",
    card_type: "",
    card_name: "",
    card_number: "",
    payment_due_date: null,
    miles_opening: null,
    miles_earned: null,
    miles_bonus: null,
    miles_redeemed: null,
    miles_ending: null,
  };

  function set(patch: Partial<typeof c>) {
    update({ card: { ...c, ...patch } });
  }

  return (
    <section className="mt-4 space-y-3">
      <SectionHeader icon={<CreditCard className="h-4 w-4" />} title="Credit card details" />
      <div className="rounded-2xl bg-card p-3 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Issuer / Bank" value={c.issuer ?? ""} onChange={(v) => set({ issuer: v })} />
          <Field label="Card type" value={c.card_type ?? ""} onChange={(v) => set({ card_type: v })} />
          <Field label="Card name" value={c.card_name ?? ""} onChange={(v) => set({ card_name: v })} />
          <Field label="Card number" value={c.card_number ?? ""} onChange={(v) => set({ card_number: v })} />
          <Field
            label="Payment due date"
            type="date"
            value={c.payment_due_date ?? ""}
            onChange={(v) => set({ payment_due_date: v })}
          />
        </div>
      </div>
      <SectionHeader title="Miles summary" small />
      <div className="rounded-2xl bg-card p-3 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <NumField label="Opening balance" value={c.miles_opening} onChange={(v) => set({ miles_opening: v })} />
          <NumField label="Earned this month" value={c.miles_earned} onChange={(v) => set({ miles_earned: v })} />
          <NumField label="Bonus this month" value={c.miles_bonus} onChange={(v) => set({ miles_bonus: v })} />
          <NumField label="Redeemed / adjusted" value={c.miles_redeemed} onChange={(v) => set({ miles_redeemed: v })} />
          <NumField label="Ending balance" value={c.miles_ending} onChange={(v) => set({ miles_ending: v })} />
        </div>
      </div>
    </section>
  );
}

function TxnSection({
  data,
  update,
  kind,
}: {
  data: ExtractedData;
  update: (p: Partial<ExtractedData>) => void;
  kind: "bank" | "card";
}) {
  const txns = data.transactions ?? [];
  function setT(i: number, patch: Partial<(typeof txns)[number]>) {
    update({ transactions: txns.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) });
  }
  function addT() {
    update({
      transactions: [
        ...txns,
        {
          date: data.period_end ?? new Date().toISOString().slice(0, 10),
          description: "",
          merchant: "",
          amount: 0,
          category: "Other",
          mcc_code: null,
        },
      ],
    });
  }
  function delT(i: number) {
    update({ transactions: txns.filter((_, idx) => idx !== i) });
  }

  return (
    <section className="mt-6">
      <SectionHeader
        title={`Transactions (${txns.length})`}
        subtitle={
          kind === "card"
            ? "Spending on the card statement. Negative = charge."
            : "Income and expenses on the bank statement."
        }
      />
      <div className="mt-2 space-y-2">
        {txns.map((t, i) => (
          <div key={i} className="rounded-xl bg-card p-3 shadow-sm">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Date" type="date" value={t.date} onChange={(v) => setT(i, { date: v })} />
              <Field
                label="Amount"
                type="number"
                value={t.amount}
                onChange={(v) => setT(i, { amount: Number(v) || 0 })}
              />
              <Field
                label="Merchant"
                value={t.merchant}
                onChange={(v) => setT(i, { merchant: v })}
              />
              <Field
                label="Category"
                value={t.category}
                onChange={(v) => setT(i, { category: v })}
              />
              <div className="col-span-2">
                <Field
                  label="Description"
                  value={t.description}
                  onChange={(v) => setT(i, { description: v })}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => delT(i)}
              className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" /> Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addT}
        className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary"
      >
        <Plus className="h-4 w-4" /> Add transaction
      </button>
    </section>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  small,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  small?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="mt-0.5 text-primary">{icon}</span>}
      <div>
        <h2
          className={
            small
              ? "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              : "text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          }
        >
          {title}
        </h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
}) {
  return (
    <Field
      label={label}
      type="number"
      value={value ?? ""}
      onChange={(v) => onChange(v === "" ? null : Number(v))}
    />
  );
}