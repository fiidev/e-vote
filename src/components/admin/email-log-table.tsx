"use client";

import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatToken } from "@/lib/utils/format";

type EmailLog = {
  log_id: string;
  email: string;
  status: string;
  sent_at: Date;
  voter?: { name: string | null } | null;
  token?: { token_code: string } | null;
};

const columns: DataTableColumn<EmailLog>[] = [
  {
    key: "email",
    header: "Email",
    cell: (l) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{l.email}</p>
        <p className="truncate text-xs text-ink-muted">
          {l.voter?.name ?? "—"}
        </p>
      </div>
    ),
  },
  {
    key: "token",
    header: "Token",
    cell: (l) => (
      <span className="font-mono text-sm">
        {formatToken(l.token?.token_code ?? "")}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (l) => (
      <Badge
        variant={
          l.status === "SENT" || l.status === "RESEND"
            ? "default"
            : "destructive"
        }
        className={
          l.status === "SENT" || l.status === "RESEND"
            ? "bg-primary text-primary-foreground"
            : ""
        }
      >
        {l.status === "RESEND" ? "Kirim Ulang" : l.status}
      </Badge>
    ),
  },
  {
    key: "sent_at",
    header: "Waktu",
    cell: (l) => (
      <span className="text-sm text-ink-muted">{formatDate(l.sent_at)}</span>
    ),
  },
];

export function EmailLogTable({ logs }: { logs: EmailLog[] }) {
  return (
    <DataTable
      columns={columns}
      rows={logs}
      keyFn={(l) => l.log_id}
      empty={<EmptyState title="Belum ada email terkirim" />}
    />
  );
}
