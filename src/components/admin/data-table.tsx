"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  headClassName?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  keyFn: (row: T) => string;
  empty?: React.ReactNode;
}

/** Tabel generik berbasis Table shadcn — kolom & cell dikontrol pemanggil. */
export function DataTable<T>({
  columns,
  rows,
  keyFn,
  empty,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-surface/60 hover:bg-surface/60">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn("text-ink-muted", col.headClassName)}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-ink-muted"
              >
                {empty ?? "Belum ada data."}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={keyFn(row)}>
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={cn("text-ink", col.className)}
                  >
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
