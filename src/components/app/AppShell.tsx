import type { ReactNode } from "react";
import { BottomTabs } from "./BottomTabs";

export function AppShell({
  children,
  showMiles = true,
}: {
  children: ReactNode;
  showMiles?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto w-full max-w-md">{children}</div>
      <BottomTabs showMiles={showMiles} />
    </div>
  );
}