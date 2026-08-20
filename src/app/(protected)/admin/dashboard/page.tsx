import { ListChecks, MailWarning, Users, Vote } from "lucide-react";
import { ElectionTable } from "@/components/admin/election-table";
import { EmailLogTable } from "@/components/admin/email-log-table";
import { StatCard } from "@/components/admin/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import db from "@/lib/db";

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
          <ElectionTable elections={elections} />
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
          <EmailLogTable logs={logs} />
        </CardContent>
      </Card>
    </div>
  );
}
