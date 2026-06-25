import { Link, useRouterState } from "@tanstack/react-router";
import { Home, BarChart3, CreditCard, Plane, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = {
  to: "/dashboard" | "/cashflow" | "/rewards" | "/miles" | "/support" | "/account";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const TABS: Tab[] = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/cashflow", label: "Cash Flow", icon: BarChart3 },
  { to: "/rewards", label: "Rewards", icon: CreditCard },
  { to: "/miles", label: "Miles", icon: Plane },
  { to: "/support", label: "Support", icon: MessageCircle },
  { to: "/account", label: "Account", icon: User },
];

export function BottomTabs({ showMiles = true }: { showMiles?: boolean }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tabs = showMiles ? TABS : TABS.filter((t) => t.to !== "/miles");

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex h-16 max-w-md items-stretch justify-between px-1">
        {tabs.map((t) => {
          const active = path === t.to || path.startsWith(t.to + "/");
          const Icon = t.icon;
          return (
            <li key={t.to} className="flex-1">
              <Link
                to={t.to}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}