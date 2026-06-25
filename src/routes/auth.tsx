import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — CashFlow AI" },
      { name: "description", content: "Sign in to CashFlow AI to track your cash flow, miles and cashback." },
    ],
  }),
  component: AuthPage,
  ssr: false,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If already signed in, leave the auth page.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created. You're signed in.");
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-primary-light to-background px-6 pt-12 pb-8">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col">
        <div className="flex flex-col items-center gap-3 pb-8">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Wallet className="h-7 w-7" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">CashFlow AI</h1>
          <p className="text-sm text-muted-foreground">Your Personal AI Treasury</p>
        </div>

        <div className="rounded-2xl bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to see your cash flow."
              : "Start tracking your finances in seconds."}
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
              />
            </div>
            <Button type="submit" className="h-12 w-full text-base" disabled={loading}>
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-12 w-full text-base"
            onClick={handleGoogle}
            disabled={loading}
          >
            <GoogleIcon className="mr-2 h-5 w-5" />
            Continue with Google
          </Button>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.227c0-.709-.064-1.39-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.995 3.018v2.51h3.229c1.89-1.74 2.984-4.305 2.984-7.351Z"/>
      <path fill="#34A853" d="M12 22c2.7 0 4.964-.895 6.616-2.422l-3.23-2.51c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.598-4.123H3.064v2.59A9.997 9.997 0 0 0 12 22Z"/>
      <path fill="#FBBC05" d="M6.402 13.9A6.012 6.012 0 0 1 6.09 12c0-.66.114-1.302.313-1.9V7.51H3.064A9.997 9.997 0 0 0 2 12c0 1.614.386 3.14 1.064 4.49l3.338-2.59Z"/>
      <path fill="#EA4335" d="M12 5.977c1.468 0 2.786.505 3.823 1.496l2.867-2.866C16.96 2.99 14.697 2 12 2A9.997 9.997 0 0 0 3.064 7.51l3.338 2.59C7.19 7.737 9.395 5.977 12 5.977Z"/>
    </svg>
  );
}