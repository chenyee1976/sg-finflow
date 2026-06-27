import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, FileUp, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/cashflow")({
  head: () => ({ meta: [{ title: "Cash Flow — CashFlow AI" }] }),
  component: CashFlowPage,
});

type Txn = {
  id: string;
  date: string;
  description: string | null;
  merchant: string | null;
  amount: number;
  category: string | null;
};

function CashFlowPage() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [tab, setTab] = useState<"all" | "in" | "out">("all");

  const { start, end, label } = useMemo(() => monthRange(monthOffset), [monthOffset]);

  const { data: txns, isLoading } = useQuery({
    queryKey: ["transactions", start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, date, description, merchant, amount, category")
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as Txn[];
    },
  });

  const { income, expenses, byCategory } = useMemo(() => summarise(txns ?? []), [txns]);
  const net = income - expenses;

  const filtered = (txns ?? []).filter((t) =>
    tab === "all" ? true : tab === "in" ? t.amount > 0 : t.amount < 0,
  );

  return (
    <AppShell>
      <header className="px-4 pt-6 pb-2">
        <h1 className="text-xl font-semibold tracking-tight">Cash Flow</h1>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-card p-2 shadow-sm">
          <button
            type="button"
            onClick={() => setMonthOffset((o) => o - 1)}
            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold">{label}</span>
          <button
            type="button"
            onClick={() => setMonthOffset((o) => Math.min(0, o + 1))}
            disabled={monthOffset === 0}
            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted disabled:opacity-30"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="space-y-4 px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            tone="in"
            icon={<ArrowDownCircle className="h-4 w-4" />}
            label="Income"
            amount={income}
          />
          <SummaryCard
            tone="out"
            icon={<ArrowUpCircle className="h-4 w-4" />}
            label="Expenses"
            amount={expenses}
          />
        </div>

        <div className="rounded-2xl bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="h-4 w-4" />
            <h2 className="text-xs font-semibold uppercase tracking-wide">Net cash flow</h2>
          </div>
          <p
            className={cn(
              "mt-2 text-3xl font-bold",
              net >= 0 ? "text-primary" : "text-destructive",
            )}
          >
            {net < 0 ? "-" : ""}S${Math.abs(net).toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {byCategory.length > 0 && (
          <div className="rounded-2xl bg-card p-4 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Top categories
            </h2>
            <ul className="mt-3 space-y-3">
              {byCategory.slice(0, 5).map((c) => {
                const pct = expenses > 0 ? (c.total / expenses) * 100 : 0;
                return (
                  <li key={c.category}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{c.category}</span>
                      <span className="text-muted-foreground">
                        S${c.total.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="flex rounded-xl bg-muted p-1">
          {(["all", "in", "out"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors",
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {t === "all" ? "All" : t === "in" ? "Income" : "Expenses"}
            </button>
          ))}
        </div>

        <section>
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
              <p className="text-sm text-muted-foreground">No transactions in this period.</p>
              <Link
                to="/upload"
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                <FileUp className="h-4 w-4" /> Upload a statement
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm">
                  <div
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                      t.amount >= 0 ? "bg-primary-light text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {t.amount >= 0 ? (
                      <ArrowDownCircle className="h-4 w-4" />
                    ) : (
                      <ArrowUpCircle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {t.merchant || t.description || "Transaction"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(t.date)} · {t.category ?? "Uncategorised"}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      t.amount >= 0 ? "text-primary" : "text-foreground",
                    )}
                  >
                    {t.amount < 0 ? "-" : "+"}S${Math.abs(t.amount).toLocaleString("en-SG", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function SummaryCard({
  tone,
  icon,
  label,
  amount,
}: {
  tone: "in" | "out";
  icon: React.ReactNode;
  label: string;
  amount: number;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <div
        className={cn(
          "flex items-center gap-2",
          tone === "in" ? "text-primary" : "text-muted-foreground",
        )}
      >
        {icon}
        <h2 className="text-xs font-semibold uppercase tracking-wide">{label}</h2>
      </div>
      <p className="mt-2 text-xl font-bold">
        S${amount.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}

function summarise(txns: Txn[]) {
  let income = 0;
  let expenses = 0;
  const cats = new Map<string, number>();
  for (const t of txns) {
    if (t.amount >= 0) income += t.amount;
    else {
      const abs = -t.amount;
      expenses += abs;
      const k = t.category || "Uncategorised";
      cats.set(k, (cats.get(k) ?? 0) + abs);
    }
  }
  const byCategory = [...cats.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
  return { income, expenses, byCategory };
}

function monthRange(offset: number) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const iso = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  const label = d.toLocaleDateString("en-SG", { month: "long", year: "numeric" });
  return { start: iso(start), end: iso(end), label };
}

function formatDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString("en-SG", { day: "numeric", month: "short" });
}