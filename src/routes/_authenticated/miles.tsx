import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plane, Plus, Wallet as WalletIcon, Trash2, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/miles")({
  head: () => ({ meta: [{ title: "Miles — CashFlow AI" }] }),
  component: MilesPage,
});

type WalletRow = {
  id: string;
  program_name: string;
  program_type: string | null;
  balance: number;
  expiry_date: string | null;
};
type Goal = {
  id: string;
  destination: string;
  airline: string | null;
  cabin_class: string | null;
  miles_required: number;
  miles_current: number;
  target_date: string | null;
};

function MilesPage() {
  const qc = useQueryClient();

  const { data: wallets } = useQuery({
    queryKey: ["miles_wallet"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("miles_wallet")
        .select("id, program_name, program_type, balance, expiry_date")
        .order("balance", { ascending: false });
      if (error) throw error;
      return data as WalletRow[];
    },
  });

  const { data: goals } = useQuery({
    queryKey: ["travel_goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("travel_goals")
        .select("id, destination, airline, cabin_class, miles_required, miles_current, target_date")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Goal[];
    },
  });

  const totalMiles = (wallets ?? []).reduce((s, w) => s + Number(w.balance || 0), 0);

  async function deleteWallet(id: string) {
    if (!confirm("Remove this miles wallet?")) return;
    const { error } = await supabase.from("miles_wallet").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["miles_wallet"] });
  }

  async function deleteGoal(id: string) {
    if (!confirm("Remove this travel goal?")) return;
    const { error } = await supabase.from("travel_goals").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["travel_goals"] });
  }

  return (
    <AppShell>
      <header className="px-4 pt-6 pb-2">
        <h1 className="text-xl font-semibold tracking-tight">Miles</h1>
        <p className="text-sm text-muted-foreground">Track loyalty balances and travel goals</p>
      </header>

      <div className="space-y-5 px-4 pt-4">
        <div className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-md shadow-primary/30">
          <div className="flex items-center gap-2">
            <WalletIcon className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Total miles</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{totalMiles.toLocaleString("en-SG")}</p>
          <p className="mt-1 text-xs text-primary-foreground/80">
            Across {wallets?.length ?? 0} program{wallets?.length === 1 ? "" : "s"}
          </p>
        </div>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Loyalty programs
            </h2>
            <AddWalletDialog onAdded={() => qc.invalidateQueries({ queryKey: ["miles_wallet"] })} />
          </div>
          {!wallets?.length ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No programs yet — tap + to add one (e.g. KrisFlyer, Asia Miles).
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {wallets.map((w) => (
                <li key={w.id} className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-light text-primary">
                    <Plane className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{w.program_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {Number(w.balance).toLocaleString("en-SG")} miles
                      {w.expiry_date ? ` · expires ${formatDate(w.expiry_date)}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteWallet(w.id)}
                    className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Travel goals
            </h2>
            <AddGoalDialog onAdded={() => qc.invalidateQueries({ queryKey: ["travel_goals"] })} />
          </div>
          {!goals?.length ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Set a destination and miles target to track progress.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {goals.map((g) => {
                const pct = g.miles_required > 0
                  ? Math.min(100, (Number(g.miles_current) / Number(g.miles_required)) * 100)
                  : 0;
                return (
                  <li key={g.id} className="rounded-2xl bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-primary" />
                          <p className="truncate text-sm font-semibold">{g.destination}</p>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[g.airline, g.cabin_class, g.target_date && formatDate(g.target_date)]
                            .filter(Boolean)
                            .join(" · ") || "No details"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteGoal(g.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="font-medium">
                        {Number(g.miles_current).toLocaleString("en-SG")} /{" "}
                        {Number(g.miles_required).toLocaleString("en-SG")} mi
                      </span>
                      <span className="text-muted-foreground">{Math.round(pct)}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function AddWalletDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [program, setProgram] = useState("");
  const [balance, setBalance] = useState("");
  const [expiry, setExpiry] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!program.trim()) return toast.error("Program name is required");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return toast.error("Not signed in"); }
    const { error } = await supabase.from("miles_wallet").insert({
      user_id: u.user.id,
      program_name: program.trim(),
      balance: Number(balance) || 0,
      expiry_date: expiry || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setProgram(""); setBalance(""); setExpiry("");
    setOpen(false);
    onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground">
          <Plus className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add loyalty program</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Program name</Label><Input value={program} onChange={(e) => setProgram(e.target.value)} placeholder="KrisFlyer" /></div>
          <div><Label>Current balance (miles)</Label><Input inputMode="numeric" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0" /></div>
          <div><Label>Expiry date (optional)</Label><Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving} className="w-full">{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddGoalDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState("");
  const [airline, setAirline] = useState("");
  const [cabin, setCabin] = useState("");
  const [required, setRequired] = useState("");
  const [current, setCurrent] = useState("");
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!destination.trim()) return toast.error("Destination is required");
    if (!Number(required)) return toast.error("Miles required must be > 0");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return toast.error("Not signed in"); }
    const { error } = await supabase.from("travel_goals").insert({
      user_id: u.user.id,
      destination: destination.trim(),
      airline: airline.trim() || null,
      cabin_class: cabin.trim() || null,
      miles_required: Number(required),
      miles_current: Number(current) || 0,
      target_date: target || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setDestination(""); setAirline(""); setCabin(""); setRequired(""); setCurrent(""); setTarget("");
    setOpen(false);
    onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground">
          <Plus className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>New travel goal</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Destination</Label><Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Tokyo" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Airline</Label><Input value={airline} onChange={(e) => setAirline(e.target.value)} placeholder="SQ" /></div>
            <div><Label>Cabin</Label><Input value={cabin} onChange={(e) => setCabin(e.target.value)} placeholder="Business" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Miles required</Label><Input inputMode="numeric" value={required} onChange={(e) => setRequired(e.target.value)} placeholder="92000" /></div>
            <div><Label>Miles current</Label><Input inputMode="numeric" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="0" /></div>
          </div>
          <div><Label>Target date (optional)</Label><Input type="date" value={target} onChange={(e) => setTarget(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving} className="w-full">{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
}
