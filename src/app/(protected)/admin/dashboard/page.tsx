import { ListChecks, MailWarning, Users, Vote } from "lucide-react";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ElectionTable } from "@/features/elections/components/election-table";
import { EmailLogTable } from "@/features/voters/components/email-log-table";
import { getAuthUser } from "@/lib/auth";
import db from "@/lib/db";

export default async function AdminDashboardPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const orgId = user.role === "SUPER_ADMIN" ? null : user.organizationId;

  const [elections, voterCount, voteCount, logs] = await Promise.all([
    db.election.findMany({
      where: orgId ? { organizationId: orgId } : undefined,
      include: {
        _count: { select: { candidates: true, votes: true, tokens: true } },
      },
      orderBy: { start_time: "desc" },
    }),
    db.voter.count({
      where: orgId ? { election: { organizationId: orgId } } : undefined,
    }),
    db.vote.count({
      where: orgId ? { election: { organizationId: orgId } } : undefined,
    }),
    db.emailLog.findMany({
      where: orgId
        ? { voter: { election: { organizationId: orgId } } }
        : undefined,
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
          Ringkasan pemilihan ketua Organisasi / Sub-Organisasi SMK Telkom
          Malang.
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
