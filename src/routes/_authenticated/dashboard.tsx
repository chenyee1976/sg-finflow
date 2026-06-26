import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Wallet, TrendingUp, PieChart, Sparkles, FileUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";

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
          <p className="mt-2 text-3xl font-bold text-primary">S$0.00</p>
          <p className="mt-1 text-xs text-muted-foreground">No accounts yet</p>
        </WidgetCard>

        <WidgetCard icon={<TrendingUp className="h-4 w-4" />} title="Monthly Income">
          <p className="mt-2 text-3xl font-bold">S$0.00</p>
          <p className="mt-1 text-xs text-muted-foreground">Upload a statement to see income</p>
        </WidgetCard>

        <WidgetCard icon={<PieChart className="h-4 w-4" />} title="Monthly Expenses">
          <p className="mt-2 text-3xl font-bold">S$0.00</p>
          <p className="mt-1 text-xs text-muted-foreground">Top categories will appear here</p>
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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}