import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Wallet, TrendingUp, PieChart, Sparkles, FileUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CashFlow AI" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, reward_focus, onboarding_completed")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile && profile.onboarding_completed === false) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [profile, navigate]);

  const showMiles = profile?.reward_focus !== "cashback";
  const greeting = getGreeting();

  const periods = useMemo(buildPeriods, []);

  const { data: accounts } = useQuery({
    queryKey: ["bank_accounts_balances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("id, bank_name, account_name, currency, current_balance, balance_as_of");
      if (error) throw error;
      return data as {
        id: string;
        bank_name: string | null;
        account_name: string | null;
        currency: string | null;
        current_balance: number;
        balance_as_of: string | null;
      }[];
    },
  });

  const { data: txns } = useQuery({
    queryKey: ["dashboard_txns", periods.earliest],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("date, amount")
        .gte("date", periods.earliest);
      if (error) throw error;
      return data as { date: string; amount: number }[];
    },
  });

  const currentBalance = (accounts ?? []).reduce(
    (s, a) => s + Number(a.current_balance || 0),
    0,
  );
  // Historical balance = current - sum(amount where date > asOf)
  const balanceAt = (asOf: string) => {
    const delta = (txns ?? [])
      .filter((t) => t.date > asOf)
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    return currentBalance - delta;
  };

  const monthTotals = (startISO: string, endISO: string) => {
    let income = 0;
    let expenses = 0;
    for (const t of txns ?? []) {
      if (t.date < startISO || t.date > endISO) continue;
      const a = Number(t.amount || 0);
      if (a >= 0) income += a;
      else expenses += -a;
    }
    return { income, expenses };
  };

  const m0 = monthTotals(periods.m0.start, periods.m0.end);
  const m1 = monthTotals(periods.m1.start, periods.m1.end);
  const m2 = monthTotals(periods.m2.start, periods.m2.end);

  const [breakdown, setBreakdown] = useState<
    null | { title: string; asOf: string; total: number }
  >(null);

  return (
    <AppShell showMiles={showMiles}>
      <header className="px-4 pt-6 pb-2">
        <div className="flex items-center gap-2 text-primary">
          <Wallet className="h-5 w-5" strokeWidth={2.5} />
          <span className="text-sm font-bold tracking-tight">CashFlow AI</span>
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">
          {greeting}{profile?.first_name ? `, ${profile.first_name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-SG", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </header>

      <div className="space-y-4 px-4 pt-4">
        <Link
          to="/upload"
          className="flex items-center gap-3 rounded-2xl bg-primary p-4 text-primary-foreground shadow-md shadow-primary/30"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
            <FileUp className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Upload a statement</p>
            <p className="text-xs text-primary-foreground/80">
              PDF, CSV or photo — we extract transactions with AI
            </p>
          </div>
        </Link>

        <WidgetCard icon={<Wallet className="h-4 w-4" />} title="Cash Position">
          <div className="mt-3 space-y-2">
            <BalanceRow
              label="Current balance"
              dateLabel={`as of ${formatDMY(periods.today)}`}
              amount={currentBalance}
              highlight
              onClick={() =>
                setBreakdown({
                  title: "Current balance",
                  asOf: periods.today,
                  total: currentBalance,
                })
              }
            />
            <BalanceRow
              label="Previous month balance"
              dateLabel={`as of ${formatDMY(periods.prevMonthEnd)}`}
              amount={balanceAt(periods.prevMonthEnd)}
              onClick={() =>
                setBreakdown({
                  title: "Previous month balance",
                  asOf: periods.prevMonthEnd,
                  total: balanceAt(periods.prevMonthEnd),
                })
              }
            />
            <BalanceRow
              label="Previous year balance"
              dateLabel={`as of ${formatDMY(periods.prevYearEnd)}`}
              amount={balanceAt(periods.prevYearEnd)}
              onClick={() =>
                setBreakdown({
                  title: "Previous year balance",
                  asOf: periods.prevYearEnd,
                  total: balanceAt(periods.prevYearEnd),
                })
              }
            />
          </div>
        </WidgetCard>

        <WidgetCard icon={<TrendingUp className="h-4 w-4" />} title="Monthly Income">
          <div className="mt-3 space-y-2">
            <BalanceRow label="Current month" dateLabel={periods.m0.label} amount={m0.income} highlight income />
            <BalanceRow label="Last month" dateLabel={periods.m1.label} amount={m1.income} income />
            <BalanceRow label="2 months ago" dateLabel={periods.m2.label} amount={m2.income} income />
          </div>
        </WidgetCard>

        <WidgetCard icon={<PieChart className="h-4 w-4" />} title="Monthly Expenses">
          <div className="mt-3 space-y-2">
            <BalanceRow label="Current month" dateLabel={periods.m0.label} amount={-m0.expenses} highlight negative />
            <BalanceRow label="Last month" dateLabel={periods.m1.label} amount={-m1.expenses} negative />
            <BalanceRow label="2 months ago" dateLabel={periods.m2.label} amount={-m2.expenses} negative />
          </div>
        </WidgetCard>

        <div className="rounded-2xl border border-primary/20 bg-primary-light p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-accent-foreground">
                Unlock up to 10 widgets with Pro
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Customise your dashboard and try Pro free for 14 days.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!breakdown} onOpenChange={(o) => !o && setBreakdown(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{breakdown?.title}</DialogTitle>
            <DialogDescription>
              Breakdown by bank account as of {breakdown ? formatDMY(breakdown.asOf) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {(accounts ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">
                No bank accounts yet. Upload a statement to add one.
              </p>
            )}
            {(accounts ?? []).map((a) => (
              <div
                key={a.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/60 p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {a.account_name ?? a.bank_name ?? "Account"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.bank_name ?? ""}
                    {a.balance_as_of ? ` · as of ${formatDMY(a.balance_as_of)}` : ""}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-foreground">
                  {a.currency ?? "SGD"}{" "}
                  {Number(a.current_balance || 0).toLocaleString("en-SG", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            ))}
            {(accounts ?? []).length > 0 && (
              <div className="flex items-center justify-between border-t border-border pt-3">
                <p className="text-sm font-semibold">Total</p>
                <p className="text-sm font-bold tabular-nums text-primary">
                  S${(breakdown?.total ?? 0).toLocaleString("en-SG", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground pt-1">
              Per-account historical balances reflect the most recent statement on file.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function WidgetCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
      <div className="h-1 w-full bg-primary" />
      <div className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}

function BalanceRow({
  label,
  dateLabel,
  amount,
  highlight,
  negative,
  income,
  onClick,
}: {
  label: string;
  dateLabel: string;
  amount: number;
  highlight?: boolean;
  negative?: boolean;
  income?: boolean;
  onClick?: () => void;
}) {
  const colorClass = negative
    ? "text-destructive"
    : income
      ? "text-primary"
      : highlight
        ? "text-primary"
        : "text-foreground";
  const sizeClass = highlight ? "text-lg font-bold" : "text-base font-semibold";
  const Wrapper: "button" | "div" = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={`flex w-full items-start justify-between gap-3 border-t border-border/60 pt-2 first:border-t-0 first:pt-0 text-left ${
        onClick ? "cursor-pointer hover:bg-accent/40 rounded-md -mx-1 px-1" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{dateLabel}</p>
      </div>
      <p className={`${sizeClass} tabular-nums ${colorClass}`}>
        {amount < 0 ? "-" : ""}S${Math.abs(amount).toLocaleString("en-SG", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </p>
    </Wrapper>
  );
}

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDMY(s: string) {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function buildPeriods() {
  const now = new Date();
  const today = iso(now);
  const prevMonthEnd = iso(new Date(now.getFullYear(), now.getMonth(), 0));
  const prevYearEnd = iso(new Date(now.getFullYear() - 1, 11, 31));
  const monthRange = (offset: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const start = iso(new Date(d.getFullYear(), d.getMonth(), 1));
    const end = iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    const label = d.toLocaleDateString("en-SG", { month: "long", year: "numeric" });
    return { start, end, label };
  };
  const m0 = monthRange(0);
  const m1 = monthRange(-1);
  const m2 = monthRange(-2);
  return { today, prevMonthEnd, prevYearEnd, m0, m1, m2, earliest: m2.start };
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}