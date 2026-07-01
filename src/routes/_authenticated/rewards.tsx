import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Gift, Sparkles, FileUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated/rewards")({
  head: () => ({ meta: [{ title: "Rewards — CashFlow AI" }] }),
  component: RewardsPage,
});

type Txn = {
  id: string;
  date: string;
  merchant: string | null;
  description: string | null;
  category: string | null;
  amount: number;
  cashback_earned: number;
  miles_earned: number;
};

type Card = {
  id: string;
  bank_name: string;
  card_name: string;
  reward_type: string | null;
  last_four: string | null;
  card_type: string | null;
  payment_due_date: string | null;
  miles_opening: number | null;
  miles_earned: number | null;
  miles_bonus: number | null;
  miles_redeemed: number | null;
  miles_ending: number | null;
};

function RewardsPage() {
  const { start, end, label } = useMemo(() => currentMonth(), []);

  const { data: cards } = useQuery({
    queryKey: ["credit_cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_cards")
        .select(
          "id, bank_name, card_name, reward_type, last_four, card_type, payment_due_date, miles_opening, miles_earned, miles_bonus, miles_redeemed, miles_ending",
        );
      if (error) throw error;
      return data as Card[];
    },
  });

  const { data: txns } = useQuery({
    queryKey: ["rewards-txns", start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, date, merchant, description, category, amount, cashback_earned, miles_earned")
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as Txn[];
    },
  });

  const totals = useMemo(() => {
    let cashback = 0;
    let miles = 0;
    let spend = 0;
    for (const t of txns ?? []) {
      cashback += Number(t.cashback_earned || 0);
      miles += Number(t.miles_earned || 0);
      if (t.amount < 0) spend += -t.amount;
    }
    return { cashback, miles, spend };
  }, [txns]);

  const withRewards = (txns ?? []).filter(
    (t) => Number(t.cashback_earned || 0) > 0 || Number(t.miles_earned || 0) > 0,
  );

  return (
    <AppShell>
      <header className="px-4 pt-6 pb-2">
        <h1 className="text-xl font-semibold tracking-tight">Rewards</h1>
        <p className="text-sm text-muted-foreground">{label}</p>
      </header>

      <div className="space-y-4 px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            icon={<Gift className="h-4 w-4" />}
            label="Cashback earned"
            value={`S$${totals.cashback.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          />
          <SummaryCard
            icon={<Sparkles className="h-4 w-4" />}
            label="Miles earned"
            value={totals.miles.toLocaleString("en-SG")}
          />
        </div>

        <div className="rounded-2xl bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            <h2 className="text-xs font-semibold uppercase tracking-wide">Card spend this month</h2>
          </div>
          <p className="mt-2 text-2xl font-bold">
            S${totals.spend.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Across {cards?.length ?? 0} card{cards?.length === 1 ? "" : "s"}
          </p>
        </div>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your cards
          </h2>
          {!cards?.length ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No cards yet — add one in onboarding or your account.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {cards.map((c) => {
                const hasMiles =
                  c.miles_opening != null ||
                  c.miles_earned != null ||
                  c.miles_bonus != null ||
                  c.miles_redeemed != null ||
                  c.miles_ending != null;
                return (
                  <li key={c.id} className="rounded-xl bg-card p-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-light text-primary">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.card_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.bank_name}
                          {c.card_type ? ` · ${c.card_type}` : ""}
                          {c.last_four ? ` · •••• ${c.last_four}` : ""}
                        </p>
                      </div>
                    </div>
                    {hasMiles && (
                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-primary-light/50 p-2 text-xs">
                        <MilesRow label="Opening" value={c.miles_opening} />
                        <MilesRow
                          label="Earned + Bonus"
                          value={
                            (c.miles_earned ?? 0) + (c.miles_bonus ?? 0) || null
                          }
                          extra={
                            c.miles_bonus != null && c.miles_earned != null
                              ? `${c.miles_earned.toLocaleString("en-SG")} + ${c.miles_bonus.toLocaleString("en-SG")}`
                              : undefined
                          }
                        />
                        <MilesRow label="Redeemed / adj." value={c.miles_redeemed} />
                        <MilesRow label="Ending" value={c.miles_ending} bold />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recent reward activity
          </h2>
          {withRewards.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No reward earnings recorded for this month yet.
              </p>
              <Link
                to="/upload"
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                <FileUp className="h-4 w-4" /> Upload a card statement
              </Link>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {withRewards.map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-light text-primary">
                    <Gift className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {t.merchant || t.description || "Transaction"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.date).toLocaleDateString("en-SG", { day: "numeric", month: "short" })} ·{" "}
                      {t.category ?? "Uncategorised"}
                    </p>
                  </div>
                  <div className="text-right">
                    {Number(t.cashback_earned) > 0 && (
                      <p className="text-sm font-semibold text-primary">
                        +S${Number(t.cashback_earned).toFixed(2)}
                      </p>
                    )}
                    {Number(t.miles_earned) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        +{Number(t.miles_earned).toLocaleString("en-SG")} mi
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h2>
      </div>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}

function currentMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const iso = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  return {
    start: iso(start),
    end: iso(end),
    label: now.toLocaleDateString("en-SG", { month: "long", year: "numeric" }),
  };
}
