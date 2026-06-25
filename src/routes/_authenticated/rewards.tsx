import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated/rewards")({
  head: () => ({ meta: [{ title: "Rewards — CashFlow AI" }] }),
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <header className="px-4 pt-6 pb-2">
        <h1 className="text-xl font-semibold tracking-tight">Rewards</h1>
        <p className="mt-1 text-sm text-muted-foreground">Coming soon — we'll build this screen next.</p>
      </header>
    </AppShell>
  );
}
