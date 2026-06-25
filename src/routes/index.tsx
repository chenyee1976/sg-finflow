import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CashFlow AI — Your Personal AI Treasury" },
      { name: "description", content: "AI-powered personal cash flow, statements, miles and cashback for Singapore." },
      { property: "og:title", content: "CashFlow AI" },
      { property: "og:description", content: "Your Personal AI Treasury." },
    ],
  }),
  component: Splash,
  ssr: false,
});

function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate({ to: "/dashboard", replace: true });
      } else {
        navigate({ to: "/auth", replace: true });
      }
    }, 1400);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary-light to-background px-6">
      <div className="flex flex-col items-center gap-4">
        <div className="grid h-20 w-20 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <Wallet className="h-10 w-10" strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">CashFlow AI</h1>
        <p className="text-sm text-muted-foreground">Your Personal AI Treasury</p>
      </div>
    </div>
  );
}
