"use client";

import { FileDown, Pencil, RefreshCw, Trash2, Upload } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  createVoterAction,
  deleteVoterAction,
  importVotersAction,
  resendTokenEmailAction,
  updateVoterAction,
} from "@/app/actions/admin";
import type { ActionState } from "@/types/admin";
import { DataTable } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { FormDialog } from "@/components/admin/form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { formatDate, formatToken } from "@/lib/utils/format";

export interface VoterToken {
  token_id: string;
  token_code: string;
  is_used: boolean;
  email_sent_at: Date | null;
  email_error: string | null;
  election: { title: string };
}

export interface VoterRow {
  voter_id: string;
  name: string;
  email: string;
  role: string;
  generation: string | null;
  tokens: VoterToken[];
}

const initialActionState: ActionState = { ok: false };

interface VotersClientProps {
  voters: VoterRow[];
  total: number;
  page: number;
  totalPages: number;
  electionOptions: Array<{ election_id: string; title: string }>;
}

export function VotersClient({
  voters,
  total,
  page,
  totalPages,
  electionOptions,
}: VotersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<VoterRow | null>(null);
  // Reset dialog form key setiap kali dialog open/close atau editing berubah,
  // agar useActionState tidak leak error dari form sebelumnya.
  const [dialogKey, setDialogKey] = useState(0);
  const [actionState, formAction, isPending] = useActionState(
    editing ? updateVoterAction : createVoterAction,
    initialActionState,
  );
  const [importState, importAction, importPending] = useActionState(
    importVotersAction,
    initialActionState,
  );

  // Toast feedback setelah form voter submit selesai
  const prevPending = useRef(isPending);
  useEffect(() => {
    if (prevPending.current && !isPending) {
      if (actionState.ok && actionState.message) {
        toast.success(actionState.message);
        setDialogOpen(false);
      } else if (!actionState.ok && actionState.errors?._form) {
        toast.error(actionState.errors._form[0]);
      }
    }
    prevPending.current = isPending;
  }, [isPending, actionState]);

  // Toast feedback setelah import selesai
  const prevImportPending = useRef(importPending);
  useEffect(() => {
    if (prevImportPending.current && !importPending) {
      if (importState.ok && importState.message) {
        toast.success(importState.message);
        setImportOpen(false);
      } else if (!importState.ok && importState.errors?.file) {
        toast.error(importState.errors.file[0]);
      }
    }
    prevImportPending.current = importPending;
  }, [importPending, importState]);

  const [selectedElection, setSelectedElection] = useState(
    electionOptions[0]?.election_id ?? "",
  );

  function openCreate() {
    setEditing(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(voter: VoterRow) {
    setEditing(voter);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  async function handleDelete(voterId: string, name: string) {
    const formData = new FormData();
    formData.set("voter_id", voterId);
    const result = await deleteVoterAction(formData);
    if (result.ok) {
      toast.success(result.message ?? `${name} berhasil dihapus.`);
    } else {
      toast.error(result.errors?._form?.[0] ?? "Gagal menghapus.");
    }
  }

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key === "q" || key === "status") params.delete("page");
    router.push(`/admin/voters?${params.toString()}`);
  }

  const status = searchParams.get("status") ?? "ALL";
  const search = searchParams.get("q") ?? "";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            updateParam("q", String(data.get("q") ?? ""));
          }}
        >
          <Input
            name="q"
            defaultValue={search}
            placeholder="Cari nama / email…"
            className="w-64"
            aria-label="Cari pemilih berdasarkan nama atau email"
          />
          <Button type="submit" variant="outline">
            Cari
          </Button>
        </form>

        <Select
          selectedKey={status}
          onSelectionChange={(key) =>
            updateParam("status", String(key ?? "ALL"))
          }
          placeholder="Semua status"
          aria-label="Filter status email"
        >
          <SelectTrigger
            className="w-44"
            aria-label="Filter berdasarkan status email"
          />
          <SelectContent>
            <SelectItem id="ALL">Semua status</SelectItem>
            <SelectItem id="SENT">Terkirim</SelectItem>
            <SelectItem id="FAILED">Gagal</SelectItem>
            <SelectItem id="NO_EMAIL">Belum kirim</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select
            selectedKey={selectedElection}
            onSelectionChange={(key) => setSelectedElection(String(key ?? ""))}
            placeholder="Pilih pemilihan"
            aria-label="Pilih pemilihan untuk export token"
          >
            <SelectTrigger
              className="w-52"
              aria-label="Pilih pemilihan untuk export"
            />
            <SelectContent>
              {electionOptions.map((e) => (
                <SelectItem key={e.election_id} id={e.election_id}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <a
            href={`/api/admin/voters/export?election_id=${selectedElection}`}
            className={buttonVariants({ variant: "outline" })}
          >
            <FileDown className="size-4" aria-hidden />
            Export Token
          </a>
          <a
            href="/api/admin/voters/template"
            className={buttonVariants({ variant: "outline" })}
          >
            <FileDown className="size-4" aria-hidden />
            Template
          </a>
          <Button variant="outline" onPress={() => setImportOpen(true)}>
            <Upload className="size-4" aria-hidden />
            Import Excel
          </Button>
          <Button onPress={openCreate}>Tambah Pemilih</Button>
        </div>
      </div>

      <p className="text-sm text-ink-muted">
        {total} pemilih · halaman {page}/{totalPages}
      </p>

      {/* Tabel */}
      <DataTable
        columns={[
          {
            key: "name",
            header: "Nama",
            cell: (v) => (
              <div className="min-w-0">
                <p className="font-medium">{v.name}</p>
                <p className="text-xs text-ink-muted">{v.email}</p>
              </div>
            ),
          },
          {
            key: "role",
            header: "Role",
            cell: (v) => <Badge variant="outline">{v.role}</Badge>,
          },
          {
            key: "generation",
            header: "Angkatan",
            cell: (v) => <span className="text-sm">{v.generation ?? "—"}</span>,
          },
          {
            key: "token",
            header: "Token",
            cell: (v) => {
              const token = v.tokens[0];
              if (!token)
                return (
                  <span className="text-sm text-ink-muted">Belum ada</span>
                );
              return (
                <div className="min-w-0">
                  <p className="font-mono text-sm">
                    {formatToken(token.token_code)}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {token.election.title}
                  </p>
                </div>
              );
            },
          },
          {
            key: "email_status",
            header: "Status Email",
            cell: (v) => {
              const token = v.tokens[0];
              if (!token) return <Badge variant="outline">—</Badge>;
              if (token.email_sent_at) {
                return (
                  <Badge
                    variant="default"
                    className="bg-primary text-primary-foreground"
                  >
                    Terkirim
                  </Badge>
                );
              }
              if (token.email_error) {
                return (
                  <div className="space-y-0.5">
                    <Badge variant="destructive">Gagal</Badge>
                    <p
                      className="max-w-40 truncate text-xs text-ink-muted"
                      title={token.email_error}
                    >
                      {token.email_error}
                    </p>
                  </div>
                );
              }
              return <Badge variant="outline">Belum kirim</Badge>;
            },
          },
          {
            key: "used",
            header: "Status",
            cell: (v) =>
              v.tokens[0]?.is_used ? (
                <Badge variant="secondary">Sudah memilih</Badge>
              ) : (
                <span className="text-sm text-ink-muted">Belum memilih</span>
              ),
          },
          {
            key: "actions",
            header: "Aksi",
            cell: (v) => (
              <div className="flex gap-1">
                {v.tokens[0]?.token_id ? (
                  <form action={resendTokenEmailAction}>
                    <input
                      type="hidden"
                      name="token_id"
                      value={v.tokens[0].token_id}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Kirim ulang email ${v.name}`}
                    >
                      <RefreshCw className="size-4" aria-hidden />
                    </Button>
                  </form>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${v.name}`}
                  onPress={() => openEdit(v)}
                >
                  <Pencil className="size-4" aria-hidden />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Hapus ${v.name}`}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onPress={() => handleDelete(v.voter_id, v.name)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
              </div>
            ),
          },
        ]}
        rows={voters}
        keyFn={(v) => v.voter_id}
        empty={
          <EmptyState
            title="Belum ada pemilih"
            description="Tambahkan manual atau impor dari file Excel."
            action={<Button onPress={openCreate}>Tambah Pemilih</Button>}
          />
        }
      />

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            isDisabled={page <= 1}
            onPress={() => updateParam("page", String(page - 1))}
          >
            Sebelumnya
          </Button>
          <span className="text-sm text-ink-muted">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            isDisabled={page >= totalPages}
            onPress={() => updateParam("page", String(page + 1))}
          >
            Berikutnya
          </Button>
        </div>
      ) : null}

      {/* Form tambah/edit voter */}
      <FormDialog
        key={dialogKey}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit Pemilih" : "Tambah Pemilih"}
        description="Data pemilih untuk distribusi token."
        isSubmitting={isPending}
      >
        <form action={formAction} className="space-y-4">
          <input
            type="hidden"
            name="voter_id"
            value={editing?.voter_id ?? ""}
          />
          {actionState.errors?._form ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {actionState.errors._form[0]}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="name">Nama</Label>
            <Input
              id="name"
              name="name"
              defaultValue={editing?.name ?? undefined}
              placeholder="Nama lengkap"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={editing?.email ?? undefined}
              placeholder="nama@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              name="role"
              defaultSelectedKey={editing?.role ?? "SISWA"}
              placeholder="Pilih role"
            >
              <SelectTrigger id="role" />
              <SelectContent>
                <SelectItem id="SISWA">SISWA</SelectItem>
                <SelectItem id="OSIS">OSIS</SelectItem>
                <SelectItem id="MPK">MPK</SelectItem>
                <SelectItem id="GUKAR">GUKAR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="generation">Angkatan (opsional)</Label>
            <Input
              id="generation"
              name="generation"
              defaultValue={editing?.generation ?? undefined}
              placeholder="34"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              isDisabled={isPending}
              onPress={() => setDialogOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" isDisabled={isPending}>
              {isPending ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Dialog import excel */}
      <FormDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Pemilih dari Excel"
        description="Format: Nama | Email | Role | Angkatan — unduh template untuk contoh."
        isSubmitting={importPending}
      >
        <form action={importAction} className="space-y-4">
          {importState.errors?.file ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {importState.errors.file[0]}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="file">File Excel (.xlsx)</Label>
            <Input id="file" name="file" type="file" accept=".xlsx" />
          </div>
          <p className="text-xs text-ink-muted">
            <a href="/api/admin/voters/template" className="underline">
              Download template
            </a>{" "}
            — seluruh file ditolak jika ada satu baris bermasalah (rollback).
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              isDisabled={importPending}
              onPress={() => setImportOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" isDisabled={importPending}>
              {importPending ? "Mengimpor…" : "Import"}
            </Button>
          </div>
        </form>
      </FormDialog>
    </div>
  );
}

export { formatDate };
