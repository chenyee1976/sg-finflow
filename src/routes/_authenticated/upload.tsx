import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, Loader2, CheckCircle2, AlertCircle, Trash2, Landmark, CreditCard, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { extractStatement } from "@/lib/statements.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({ meta: [{ title: "Upload statement — CashFlow AI" }] }),
  component: UploadPage,
});

const ACCEPTED = ".pdf,.csv,.png,.jpg,.jpeg,.webp";
const MAX_BYTES = 20 * 1024 * 1024;

function UploadPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const extract = useServerFn(extractStatement);
  const [uploading, setUploading] = useState<null | "bank" | "card">(null);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);

  const { data: statements, refetch } = useQuery({
    queryKey: ["statements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("statements")
        .select("id, file_name, file_path, status, transaction_count, uploaded_at, bank_or_card, source_type")
        .order("uploaded_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  async function handleFile(file: File, kind: "bank" | "card") {
    if (file.size > MAX_BYTES) {
      toast.error("File too large (max 20 MB)");
      return;
    }
    setUploading(kind);
    setProgressLabel("Uploading…");
    try {
      const { data: userData, error: uErr } = await supabase.auth.getUser();
      if (uErr || !userData.user) throw uErr ?? new Error("Not signed in");
      const uid = userData.user.id;
      const path = `${uid}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;

      const { error: upErr } = await supabase.storage
        .from("statements")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { data: stmt, error: insErr } = await supabase
        .from("statements")
        .insert({
          user_id: uid,
          file_name: file.name,
          file_path: path,
          file_type: file.type,
          file_size_bytes: file.size,
          status: "pending",
          source_type: kind,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      await refetch();
      setProgressLabel(
        kind === "card" ? "Extracting card details with AI…" : "Extracting transactions with AI…",
      );
      const result = await extract({ data: { statementId: stmt.id, statementKind: kind } });
      toast.success(
        `Extracted ${result.count} transaction${result.count === 1 ? "" : "s"} — please review`,
      );
      await refetch();
      navigate({ to: "/upload/review/$id", params: { id: stmt.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      await refetch();
    } finally {
      setUploading(null);
      setProgressLabel(null);
    }
  }

  async function deleteStatement(id: string, path?: string | null) {
    if (!confirm("Delete this statement and all extracted transactions?")) return;
    try {
      if (path) await supabase.storage.from("statements").remove([path]);
      await supabase.from("transactions").delete().eq("statement_id", id);
      await supabase.from("statements").delete().eq("id", id);
      toast.success("Deleted");
      await refetch();
      qc.invalidateQueries({ queryKey: ["transactions"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="mx-auto w-full max-w-md px-4 pt-6">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="grid h-9 w-9 place-items-center rounded-full bg-card shadow-sm"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-semibold tracking-tight">Upload statement</h1>
        </header>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <UploadTile
            kind="bank"
            title="Bank statement"
            icon={<Landmark className="h-6 w-6 text-primary" />}
            uploading={uploading}
            progressLabel={progressLabel}
            onFile={(f) => handleFile(f, "bank")}
          />
          <UploadTile
            kind="card"
            title="Credit card statement"
            icon={<CreditCard className="h-6 w-6 text-primary" />}
            uploading={uploading}
            progressLabel={progressLabel}
            onFile={(f) => handleFile(f, "card")}
          />
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          We use AI to extract transactions. Review them after upload.
        </p>

        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recent uploads
          </h2>
          {!statements?.length ? (
            <p className="mt-3 text-sm text-muted-foreground">No statements uploaded yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {statements.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {statusLabel(s.status)} · {s.transaction_count} txn
                      {s.bank_or_card ? ` · ${s.bank_or_card}` : ""}
                    </p>
                  </div>
                  {s.status === "review" ? (
                    <Link
                      to="/upload/review/$id"
                      params={{ id: s.id }}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground"
                    >
                      <Eye className="h-3 w-3" /> Review
                    </Link>
                  ) : (
                    <StatusIcon status={s.status} />
                  )}
                  <button
                    type="button"
                    onClick={() => deleteStatement(s.id, s.file_path)}
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

        <div className="mt-8 text-center">
          <Link to="/cashflow" className="text-sm font-semibold text-primary">
            View extracted cash flow →
          </Link>
        </div>
      </div>
    </div>
  );
}

function statusLabel(s: string) {
  if (s === "completed") return "Completed";
  if (s === "review") return "Awaiting review";
  if (s === "processing") return "Processing";
  if (s === "failed") return "Failed";
  return "Pending";
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-primary" />;
  if (status === "failed") return <AlertCircle className="h-4 w-4 text-destructive" />;
  if (status === "processing" || status === "pending")
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  return null;
}

function UploadTile({
  kind,
  title,
  icon,
  uploading,
  progressLabel,
  onFile,
}: {
  kind: "bank" | "card";
  title: string;
  icon: React.ReactNode;
  uploading: null | "bank" | "card";
  progressLabel: string | null;
  onFile: (f: File) => void;
}) {
  const isActive = uploading === kind;
  const disabled = uploading !== null;
  return (
    <label
      className={cn(
        "flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/40 bg-primary-light/40 p-4 text-center transition-colors hover:bg-primary-light/60",
        disabled && "cursor-wait opacity-70 hover:bg-primary-light/40",
      )}
    >
      <input
        type="file"
        accept={ACCEPTED}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      {isActive ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : icon}
      <p className="mt-2 text-sm font-semibold leading-tight">{title}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {isActive ? progressLabel ?? "Working…" : "PDF, CSV, JPG or PNG · 20 MB"}
      </p>
    </label>
  );
}