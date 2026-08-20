import { ListChecks, MailWarning, Users, Vote } from "lucide-react";
import { DataTable } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import db from "@/lib/db";
import { formatDate, formatToken } from "@/lib/utils/format";

/**
 * Dashboard admin — ringkasan angka + aktivitas terakhir.
 * Hanya tampilkan voter_id untuk statistik; data pribadi voter
 * (kecuali nama/email di log) tidak pernah dirender (hybrid anonymity).
 */
export default async function AdminDashboardPage() {
  const [elections, voterCount, voteCount, logs] = await Promise.all([
    db.election.findMany({
      include: {
        _count: { select: { candidates: true, votes: true, tokens: true } },
      },
      orderBy: { start_time: "desc" },
    }),
    db.voter.count(),
    db.vote.count(),
    db.emailLog.findMany({
      orderBy: { sent_at: "desc" },
      take: 8,
      include: {
        voter: { select: { name: true } },
        token: { select: { token_code: true } },
      },
    }),
  ]);

  const activeElections = elections.filter((e) => e.is_active).length;
  const totalTokens = elections.reduce((acc, e) => acc + e._count.tokens, 0);
  const failedEmails = logs.filter((l) => l.status === "FAILED").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
        <p className="text-sm text-ink-muted">
          Ringkasan pemilihan ketua OSIS — SMK Telkom Malang.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pemilihan Aktif" value={activeElections} icon={Vote} />
        <StatCard label="Total Pemilih" value={voterCount} icon={Users} />
        <StatCard label="Suara Masuk" value={voteCount} icon={ListChecks} />
        <StatCard
          label="Token Dibuat"
          value={totalTokens}
          hint={
            failedEmails > 0
              ? `${failedEmails} email gagal terkirim (8 log terakhir)`
              : undefined
          }
          icon={MailWarning}
        />
      </div>

      <Card className="border-line bg-card">
        <CardHeader>
          <CardTitle>Pemilihan</CardTitle>
          <CardDescription>Daftar pemilihan dan progresnya.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              {
                key: "title",
                header: "Judul",
                cell: (e) => (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{e.title}</span>
                    {e.is_active ? (
                      <Badge
                        variant="default"
                        className="bg-primary text-primary-foreground"
                      >
                        Aktif
                      </Badge>
                    ) : (
                      <Badge variant="outline">Selesai</Badge>
                    )}
                  </div>
                ),
              },
              {
                key: "window",
                header: "Jadwal",
                cell: (e) => (
                  <span className="text-sm text-ink-muted">
                    {formatDate(e.start_time)} — {formatDate(e.end_time)}
                  </span>
                ),
              },
              {
                key: "candidates",
                header: "Kandidat",
                cell: (e) => e._count.candidates,
              },
              { key: "tokens", header: "Token", cell: (e) => e._count.tokens },
              { key: "votes", header: "Suara", cell: (e) => e._count.votes },
            ]}
            rows={elections}
            keyFn={(e) => e.election_id}
            empty={<EmptyState title="Belum ada pemilihan" />}
          />
        </CardContent>
      </Card>

      <Card className="border-line bg-card">
        <CardHeader>
          <CardTitle>Aktivitas Email Terakhir</CardTitle>
          <CardDescription>
            Status pengiriman token (8 log terakhir).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
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
                  <span className="text-sm text-ink-muted">
                    {formatDate(l.sent_at)}
                  </span>
                ),
              },
            ]}
            rows={logs}
            keyFn={(l) => l.log_id}
            empty={<EmptyState title="Belum ada email terkirim" />}
          />
        </CardContent>
      </Card>
    </div>
  );
}
