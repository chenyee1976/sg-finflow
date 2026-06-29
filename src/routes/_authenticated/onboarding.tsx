import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Plane, Wallet, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ACCOUNT_TYPES,
  CURRENCIES,
  SG_BANKS,
  OTHER_SUBTYPE,
  getSubtypeOptions,
  type AccountType,
} from "@/lib/bank-accounts-catalog";
import {
  CARD_TYPES,
  CARD_OTHER,
  getCardOptions,
  formatCardNumber,
} from "@/lib/credit-cards-catalog";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Get started — CashFlow AI" }] }),
  component: OnboardingPage,
});

const CARD_REWARD_TYPES = [
  { value: "miles", label: "Miles" },
  { value: "cashback", label: "Cashback" },
  { value: "points", label: "Points" },
] as const;

type RewardFocus = "miles" | "cashback" | "both";
type BankRow = {
  bank_name: string;
  account_type: AccountType;
  account_name: string;
  account_number: string;
  currency: string;
  currency_other: string;
  account_subtype: string;
  account_subtype_other: string;
};
type CardRow = {
  bank_name: string;
  card_name: string;
  card_name_other: string;
  card_type: string;
  reward_type: string;
  card_number: string;
};

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");

  // Step 2
  const [rewardFocus, setRewardFocus] = useState<RewardFocus | null>(null);

  // Step 3
  const [banks, setBanks] = useState<BankRow[]>([
    {
      bank_name: "",
      account_type: "Savings",
      account_name: "",
      account_number: "",
      currency: "SGD",
      currency_other: "",
      account_subtype: "",
      account_subtype_other: "",
    },
  ]);

  // Step 4
  const [cards, setCards] = useState<CardRow[]>([
    {
      bank_name: "",
      card_name: "",
      card_name_other: "",
      card_type: "",
      reward_type: "miles",
      card_number: "",
    },
  ]);

  // Skip if already onboarded; prefill name
  const { data: profile } = useQuery({
    queryKey: ["profile-onboarding"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, mobile_number, reward_focus, onboarding_completed")
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!profile) return;
    if (profile.onboarding_completed) {
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    if (profile.first_name) setFirstName(profile.first_name);
    if (profile.last_name) setLastName(profile.last_name);
    if (profile.mobile_number) setMobile(profile.mobile_number);
    if (profile.reward_focus === "miles" || profile.reward_focus === "cashback" || profile.reward_focus === "both") {
      setRewardFocus(profile.reward_focus);
    }
  }, [profile, navigate]);

  function canAdvance(): boolean {
    if (step === 1) return firstName.trim().length > 0;
    if (step === 2) return rewardFocus !== null;
    if (step === 3) return true; // banks optional
    if (step === 4) return true; // cards optional
    return false;
  }

  async function handleNext() {
    if (!canAdvance()) {
      toast.error("Please complete this step first");
      return;
    }
    if (step < 4) {
      setStep(step + 1);
      return;
    }
    await finish();
  }

  async function finish() {
    setSaving(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw userErr ?? new Error("Not signed in");
      const uid = userData.user.id;

      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          mobile_number: mobile.trim() || null,
          reward_focus: rewardFocus,
          onboarding_completed: true,
        })
        .eq("id", uid);
      if (profErr) throw profErr;

      const validBanks = banks
        .filter((b) => b.bank_name.trim())
        .map((b) => ({
          user_id: uid,
          bank_name: b.bank_name,
          account_type: b.account_type,
          account_name: b.account_name.trim() || null,
          account_number: b.account_number.trim() || null,
          currency:
            b.currency === "Others"
              ? (b.currency_other.trim().toUpperCase() || "SGD")
              : b.currency,
          account_subtype:
            b.account_subtype === OTHER_SUBTYPE
              ? (b.account_subtype_other.trim() || null)
              : (b.account_subtype || null),
        }));
      if (validBanks.length) {
        const { error } = await supabase.from("bank_accounts").insert(validBanks);
        if (error) throw error;
      }

      const validCards = cards
        .filter((c) => c.bank_name.trim() && c.card_name.trim())
        .map((c) => ({
          user_id: uid,
          bank_name: c.bank_name,
          card_name:
            c.card_name === CARD_OTHER
              ? c.card_name_other.trim() || "Other"
              : c.card_name.trim(),
          card_type: c.card_type || null,
          reward_type: c.reward_type,
          last_four: c.card_number.trim() || null,
        }));
      if (validCards.length) {
        const { error } = await supabase.from("credit_cards").insert(validCards);
        if (error) throw error;
      }

      toast.success("You're all set!");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your details");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-light to-background">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pt-8 pb-24">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => (step > 1 ? setStep(step - 1) : null)}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full bg-card shadow-sm",
              step === 1 && "invisible",
            )}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Step {step} of 4
          </span>
          <button
            type="button"
            onClick={() => (step < 4 ? setStep(step + 1) : null)}
            className={cn(
              "text-xs font-semibold text-primary",
              (step === 4 || (step === 1 && !firstName.trim())) && "invisible",
            )}
          >
            Skip
          </button>
        </header>

        <div className="mt-4 flex gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-border",
              )}
            />
          ))}
        </div>

        <main className="mt-8 flex-1">
          {step === 1 && (
            <StepIntro
              firstName={firstName}
              setFirstName={setFirstName}
              lastName={lastName}
              setLastName={setLastName}
              mobile={mobile}
              setMobile={setMobile}
            />
          )}
          {step === 2 && <StepRewards value={rewardFocus} onChange={setRewardFocus} />}
          {step === 3 && <StepBanks banks={banks} setBanks={setBanks} />}
          {step === 4 && <StepCards cards={cards} setCards={setCards} />}
        </main>

        <div className="sticky bottom-0 mt-6 bg-gradient-to-t from-background via-background to-transparent pt-4">
          <Button
            className="h-12 w-full text-base"
            onClick={handleNext}
            disabled={saving || !canAdvance()}
          >
            {saving ? "Saving…" : step === 4 ? "Finish" : "Continue"}
            {!saving && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepIntro(props: {
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  mobile: string;
  setMobile: (v: string) => void;
}) {
  return (
    <div>
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
        <Wallet className="h-6 w-6" strokeWidth={2.5} />
      </div>
      <h1 className="mt-5 text-2xl font-bold tracking-tight">Welcome to CashFlow AI</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tell us a bit about yourself so we can personalise your dashboard.
      </p>

      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={props.firstName}
              onChange={(e) => props.setFirstName(e.target.value)}
              placeholder="Alex"
              maxLength={50}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={props.lastName}
              onChange={(e) => props.setLastName(e.target.value)}
              placeholder="Tan"
              maxLength={50}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mobile">Mobile (optional)</Label>
          <Input
            id="mobile"
            type="tel"
            inputMode="tel"
            value={props.mobile}
            onChange={(e) => props.setMobile(e.target.value)}
            placeholder="+65 9123 4567"
            maxLength={20}
          />
        </div>
      </div>
    </div>
  );
}

function StepRewards({
  value,
  onChange,
}: {
  value: RewardFocus | null;
  onChange: (v: RewardFocus) => void;
}) {
  const options: { id: RewardFocus; title: string; desc: string; icon: React.ReactNode }[] = [
    { id: "miles", title: "Miles", desc: "I optimise for air miles & travel rewards.", icon: <Plane className="h-5 w-5" /> },
    { id: "cashback", title: "Cashback", desc: "I prefer straight cash rebates.", icon: <Wallet className="h-5 w-5" /> },
    { id: "both", title: "Both", desc: "Mix of miles cards and cashback cards.", icon: <Sparkles className="h-5 w-5" /> },
  ];
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">What do you optimise for?</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This tailors your rewards view. You can change it later.
      </p>
      <div className="mt-6 space-y-3">
        {options.map((o) => {
          const active = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border-2 bg-card p-4 text-left transition-colors",
                active ? "border-primary bg-primary-light" : "border-border",
              )}
            >
              <div
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-xl",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {o.icon}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{o.title}</p>
                <p className="text-xs text-muted-foreground">{o.desc}</p>
              </div>
              {active && <Check className="h-5 w-5 text-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepBanks({
  banks,
  setBanks,
}: {
  banks: BankRow[];
  setBanks: (b: BankRow[]) => void;
}) {
  function update(i: number, patch: Partial<BankRow>) {
    setBanks(banks.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }
  function remove(i: number) {
    setBanks(banks.filter((_, idx) => idx !== i));
  }
  function add() {
    setBanks([
      ...banks,
      {
        bank_name: "",
        account_type: "Savings",
        account_name: "",
        account_number: "",
        currency: "SGD",
        currency_other: "",
        account_subtype: "",
        account_subtype_other: "",
      },
    ]);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Add your bank accounts</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick the banks where you hold cash. Optional — you can add later.
      </p>
      <div className="mt-6 space-y-4">
        {banks.map((b, i) => (
          <div key={i} className="rounded-2xl bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Account {i + 1}
              </p>
              {banks.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-xs font-semibold text-destructive"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <Label>Bank</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={b.bank_name}
                  onChange={(e) =>
                    update(i, {
                      bank_name: e.target.value,
                      account_subtype: "",
                      account_subtype_other: "",
                    })
                  }
                >
                  <option value="">Select bank…</option>
                  {SG_BANKS.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={b.account_type}
                    onChange={(e) =>
                      update(i, {
                        account_type: e.target.value as AccountType,
                        account_subtype: "",
                        account_subtype_other: "",
                      })
                    }
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Nickname</Label>
                  <Input
                    value={b.account_name}
                    onChange={(e) => update(i, { account_name: e.target.value })}
                    placeholder="e.g. Main"
                    maxLength={50}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={b.currency}
                    onChange={(e) => update(i, { currency: e.target.value })}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {b.currency === "Others" && (
                    <Input
                      className="mt-2"
                      value={b.currency_other}
                      onChange={(e) =>
                        update(i, { currency_other: e.target.value.toUpperCase().slice(0, 6) })
                      }
                      placeholder="e.g. AUD"
                      maxLength={6}
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Bank account number</Label>
                  <Input
                    value={b.account_number}
                    onChange={(e) =>
                      update(i, { account_number: e.target.value.replace(/[^0-9-]/g, "") })
                    }
                    placeholder="e.g. 123-45678-9"
                    inputMode="numeric"
                    maxLength={30}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Bank Account Type</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-60"
                  value={b.account_subtype}
                  disabled={!b.bank_name}
                  onChange={(e) =>
                    update(i, { account_subtype: e.target.value, account_subtype_other: "" })
                  }
                >
                  <option value="">
                    {b.bank_name ? "Select account…" : "Pick a bank first"}
                  </option>
                  {b.bank_name &&
                    getSubtypeOptions(b.bank_name, b.account_type).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                </select>
                {b.account_subtype === OTHER_SUBTYPE && (
                  <Input
                    className="mt-2"
                    value={b.account_subtype_other}
                    onChange={(e) => update(i, { account_subtype_other: e.target.value })}
                    placeholder="Enter account name"
                    maxLength={80}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" className="w-full" onClick={add}>
          + Add another account
        </Button>
        <p className="px-1 pt-2 text-[11px] leading-relaxed text-muted-foreground">
          Phase 1 includes 4 account types (Savings, Current, Multi-Currency, Fixed/Term Deposits),
          7 currencies (SGD, USD, MYR, EUR, GBP, CNY, JPY) plus an "Others" input, and the bank
          account products listed under <em>Bank Account Type</em>. Additional types, currencies and
          products will be added in the next phase.
        </p>
      </div>
    </div>
  );
}

function StepCards({
  cards,
  setCards,
}: {
  cards: CardRow[];
  setCards: (c: CardRow[]) => void;
}) {
  function update(i: number, patch: Partial<CardRow>) {
    setCards(cards.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function remove(i: number) {
    setCards(cards.filter((_, idx) => idx !== i));
  }
  function add() {
    setCards([...cards, { bank_name: "", card_name: "", reward_type: "miles", last_four: "" }]);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Add your credit cards</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        We'll track miles, cashback and points earned per card.
      </p>
      <div className="mt-6 space-y-4">
        {cards.map((c, i) => (
          <div key={i} className="rounded-2xl bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Card {i + 1}
              </p>
              {cards.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-xs font-semibold text-destructive"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <Label>Issuing bank</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={c.bank_name}
                  onChange={(e) => update(i, { bank_name: e.target.value })}
                >
                  <option value="">Select bank…</option>
                  {SG_BANKS.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Card name</Label>
                <Input
                  value={c.card_name}
                  onChange={(e) => update(i, { card_name: e.target.value })}
                  placeholder="e.g. KrisFlyer UOB"
                  maxLength={60}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Reward type</Label>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={c.reward_type}
                    onChange={(e) => update(i, { reward_type: e.target.value })}
                  >
                    {CARD_REWARD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Last 4 digits</Label>
                  <Input
                    inputMode="numeric"
                    value={c.last_four}
                    onChange={(e) =>
                      update(i, { last_four: e.target.value.replace(/\D/g, "").slice(0, 4) })
                    }
                    placeholder="1234"
                    maxLength={4}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" className="w-full" onClick={add}>
          + Add another card
        </Button>
      </div>
    </div>
  );
}