"use client";

import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatScheduleRange } from "@/lib/utils/format";

type Election = {
  election_id: string;
  title: string;
  is_active: boolean;
  start_time: Date;
  end_time: Date;
  _count: { candidates: number; votes: number; tokens: number };
};

const columns: DataTableColumn<Election>[] = [
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
      <span className="text-sm text-ink font-medium font-mono text-xs sm:text-sm">
        {formatScheduleRange(e.start_time, e.end_time)}
      </span>
    ),
  },
  { key: "candidates", header: "Kandidat", cell: (e) => e._count.candidates },
  { key: "tokens", header: "Token", cell: (e) => e._count.tokens },
  { key: "votes", header: "Suara", cell: (e) => e._count.votes },
];

export function ElectionTable({ elections }: { elections: Election[] }) {
  return (
    <DataTable
      columns={columns}
      rows={elections}
      keyFn={(e) => e.election_id}
      empty={<EmptyState title="Belum ada pemilihan" />}
    />
  );
}
