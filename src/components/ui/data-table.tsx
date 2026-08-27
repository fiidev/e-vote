"use client";

import type * as React from "react";
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

export function DataTable<T>({
  columns,
  rows,
  keyFn,
  empty,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-surface/60">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "h-11 px-3.5 py-2.5 sm:px-4 text-left font-medium whitespace-nowrap text-ink-muted",
                  col.headClassName,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="h-28 text-center text-ink-muted"
              >
                {empty ?? "Belum ada data."}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={keyFn(row)}
                className="border-b transition-colors hover:bg-muted/50"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "p-3.5 sm:p-4 align-middle text-ink",
                      col.className,
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
