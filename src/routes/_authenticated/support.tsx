import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Mail,
  MessageCircle,
  BookOpen,
  ChevronDown,
  Shield,
  FileText,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({ meta: [{ title: "Support — CashFlow AI" }] }),
  component: Page,
});

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I upload a statement?",
    a: "Go to the Home tab and tap 'Upload a statement'. We accept PDF, CSV, JPG and PNG up to 20 MB. Our AI extracts your transactions automatically.",
  },
  {
    q: "Is my financial data secure?",
    a: "Yes. Your files are stored in a private vault scoped to your account, and only you can access your transactions. We never share your data with third parties.",
  },
  {
    q: "Why are some transactions miscategorised?",
    a: "AI extraction is ~95% accurate. You can edit any transaction to correct the category, merchant, or amount — your corrections help improve future suggestions.",
  },
  {
    q: "How are miles and cashback calculated?",
    a: "We use the reward rate from the credit card you assigned each transaction to. You can adjust earned miles/cashback manually on any transaction.",
  },
  {
    q: "Can I add a bank or card that's not listed?",
    a: "Yes — during onboarding or from the Account tab, you can add custom banks and cards. Choose 'Other' and enter the name.",
  },
  {
    q: "How do I delete my account?",
    a: "Email us at support@cashflow.ai and we'll permanently delete your account and all associated data within 7 days.",
  },
];

function Page() {
  return (
    <AppShell>
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-semibold tracking-tight">Support</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We're here to help — usually reply within 24 hours.
        </p>
      </header>

      <div className="space-y-6 px-4 pb-4">
        <section className="grid grid-cols-2 gap-3">
          <QuickAction
            icon={<Mail className="h-5 w-5" />}
            label="Email us"
            sublabel="support@cashflow.ai"
            href="mailto:support@cashflow.ai"
          />
          <QuickAction
            icon={<MessageCircle className="h-5 w-5" />}
            label="WhatsApp"
            sublabel="Chat with us"
            href="https://wa.me/6500000000"
          />
        </section>

        <section>
          <SectionHeading icon={<BookOpen className="h-4 w-4" />} title="Frequently asked" />
          <div className="mt-3 overflow-hidden rounded-2xl bg-card shadow-sm">
            {FAQS.map((f, i) => (
              <FaqItem key={f.q} item={f} divider={i !== FAQS.length - 1} />
            ))}
          </div>
        </section>

        <ContactCard />

        <section>
          <SectionHeading icon={<Sparkles className="h-4 w-4" />} title="More" />
          <div className="mt-3 overflow-hidden rounded-2xl bg-card shadow-sm">
            <LinkRow icon={<FileText className="h-4 w-4" />} label="Terms of Service" />
            <LinkRow icon={<Shield className="h-4 w-4" />} label="Privacy Policy" />
          </div>
        </section>

        <p className="pt-2 text-center text-xs text-muted-foreground">
          CashFlow AI v1.0 — made in Singapore 🇸🇬
        </p>
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

function QuickAction({
  icon,
  label,
  sublabel,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noreferrer"
      className="flex flex-col gap-2 rounded-2xl bg-card p-4 shadow-sm transition-colors hover:bg-accent"
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-light text-primary">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      </div>
    </a>
  );
}

function FaqItem({ item, divider }: { item: { q: string; a: string }; divider: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn(divider && "border-b border-border")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-sm font-medium">{item.q}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <p className="px-4 pb-4 text-sm text-muted-foreground">{item.a}</p>}
    </div>
  );
}

function LinkRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={() => toast.info(`${label} — coming soon`)}
      className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-accent"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
    </button>
  );
}

function ContactCard() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("Add a subject and message");
      return;
    }
    const body = encodeURIComponent(message);
    const subj = encodeURIComponent(subject);
    window.location.href = `mailto:support@cashflow.ai?subject=${subj}&body=${body}`;
    toast.success("Opening your email app…");
    setSubject("");
    setMessage("");
  }

  return (
    <section>
      <SectionHeading icon={<Mail className="h-4 w-4" />} title="Send us a message" />
      <form onSubmit={handleSend} className="mt-3 space-y-3 rounded-2xl bg-card p-4 shadow-sm">
        <div className="space-y-1.5">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What can we help with?"
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the issue or question…"
            rows={5}
            maxLength={2000}
          />
        </div>
        <Button type="submit" className="h-11 w-full">
          Send message
        </Button>
      </form>
    </section>
  );
}
