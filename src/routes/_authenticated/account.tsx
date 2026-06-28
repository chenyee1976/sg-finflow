import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  User as UserIcon,
  LogOut,
  Building2,
  CreditCard,
  Sparkles,
  ChevronRight,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "Account — CashFlow AI" }] }),
  component: Page,
});

type RewardFocus = "miles" | "cashback" | "both";

function Page() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, mobile_number, reward_focus, currency_pref")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["account-counts"],
    queryFn: async () => {
      const [b, c] = await Promise.all([
        supabase.from("bank_accounts").select("id", { count: "exact", head: true }),
        supabase.from("credit_cards").select("id", { count: "exact", head: true }),
      ]);
      return { banks: b.count ?? 0, cards: c.count ?? 0 };
    },
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [rewardFocus, setRewardFocus] = useState<RewardFocus>("both");
  const [currency, setCurrency] = useState("SGD");

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? "");
    setLastName(profile.last_name ?? "");
    setMobile(profile.mobile_number ?? "");
    setRewardFocus((profile.reward_focus as RewardFocus) ?? "both");
    setCurrency(profile.currency_pref ?? "SGD");
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          mobile_number: mobile.trim() || null,
          reward_focus: rewardFocus,
          currency_pref: currency,
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const wipe = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const uid = user.id;
      // Clear user-owned domain data. Statement files stay in storage; the bucket
      // is private and orphaned rows are easy to clean up later.
      const [t, s, c, b, mw, tg] = await Promise.all([
        supabase.from("transactions").delete().eq("user_id", uid),
        supabase.from("statements").delete().eq("user_id", uid),
        supabase.from("credit_cards").delete().eq("user_id", uid),
        supabase.from("bank_accounts").delete().eq("user_id", uid),
        supabase.from("miles_wallet").delete().eq("user_id", uid),
        supabase.from("travel_goals").delete().eq("user_id", uid),
      ]);
      const err = t.error ?? s.error ?? c.error ?? b.error ?? mw.error ?? tg.error;
      if (err) throw err;
    },
    onSuccess: () => {
      toast.success("All your data was cleared");
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not clear data"),
  });

  const initials = (
    (firstName?.[0] ?? "") + (lastName?.[0] ?? "")
  ).toUpperCase() || user?.email?.[0]?.toUpperCase() || "?";

  return (
    <AppShell showMiles={rewardFocus !== "cashback"}>
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-semibold tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile and app preferences.
        </p>
      </header>

      <div className="space-y-6 px-4 pb-4">
        {/* Identity */}
        <section className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">
              {firstName || lastName ? `${firstName} ${lastName}`.trim() : "Your account"}
            </p>
            <p className="truncate text-sm text-muted-foreground">{user?.email ?? "—"}</p>
          </div>
        </section>

        {/* Profile form */}
        <section>
          <SectionHeading icon={<UserIcon className="h-4 w-4" />} title="Personal info" />
          <div className="mt-3 space-y-3 rounded-2xl bg-card p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fn">First name</Label>
                <Input
                  id="fn"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={profileLoading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ln">Last name</Label>
                <Input
                  id="ln"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={profileLoading}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mob">Mobile number</Label>
              <Input
                id="mob"
                inputMode="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+65 9123 4567"
                disabled={profileLoading}
              />
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section>
          <SectionHeading icon={<Sparkles className="h-4 w-4" />} title="Preferences" />
          <div className="mt-3 space-y-3 rounded-2xl bg-card p-4 shadow-sm">
            <div className="space-y-1.5">
              <Label>Reward focus</Label>
              <Select
                value={rewardFocus}
                onValueChange={(v) => setRewardFocus(v as RewardFocus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="miles">Miles</SelectItem>
                  <SelectItem value="cashback">Cashback</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Hides the Miles tab when set to Cashback only.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SGD">SGD — Singapore Dollar</SelectItem>
                  <SelectItem value="USD">USD — US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR — Euro</SelectItem>
                  <SelectItem value="GBP">GBP — British Pound</SelectItem>
                  <SelectItem value="MYR">MYR — Malaysian Ringgit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            type="button"
            className="mt-3 h-11 w-full"
            onClick={() => save.mutate()}
            disabled={save.isPending || profileLoading}
          >
            <Save className="mr-2 h-4 w-4" />
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </section>

        {/* Linked finance */}
        <section>
          <SectionHeading icon={<Building2 className="h-4 w-4" />} title="Linked finance" />
          <div className="mt-3 overflow-hidden rounded-2xl bg-card shadow-sm">
            <NavRow
              icon={<Building2 className="h-4 w-4" />}
              label="Bank accounts"
              value={`${counts?.banks ?? 0}`}
              to="/onboarding"
            />
            <NavRow
              icon={<CreditCard className="h-4 w-4" />}
              label="Credit cards"
              value={`${counts?.cards ?? 0}`}
              to="/onboarding"
            />
          </div>
          <p className="mt-2 px-1 text-xs text-muted-foreground">
            Re-run onboarding to add or update banks and cards.
          </p>
        </section>

        {/* Danger / session */}
        <section className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear all my data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all your data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This deletes your transactions, statements, banks, cards, miles wallets
                  and travel goals. Your account stays active. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => wipe.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {wipe.isPending ? "Clearing…" : "Yes, clear it"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>

        <p className="pt-2 text-center text-xs text-muted-foreground">CashFlow AI v1.0</p>
      </div>
    </AppShell>
  );
}

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 px-1 text-muted-foreground">
      {icon}
      <h2 className="text-xs font-semibold uppercase tracking-wide">{title}</h2>
    </div>
  );
}

function NavRow({
  icon,
  label,
  value,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  to: "/onboarding";
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-accent"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span className="text-sm text-muted-foreground">{value}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
