"use client";

import {
  FileDown,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createVoterAction,
  deleteVoterAction,
  importVotersAction,
  resendTokenEmailAction,
  updateVoterAction,
} from "@/features/voters/actions";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDate, formatToken } from "@/lib/utils/format";
import type { ActionState } from "@/types/admin";

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
  const [exportOpen, setExportOpen] = useState(false);
  const [editing, setEditing] = useState<VoterRow | null>(null);
  const [deletingVoter, setDeletingVoter] = useState<VoterRow | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const [dialogKey, setDialogKey] = useState(0);

  async function voterFormAction(
    prevState: ActionState,
    formData: FormData,
  ): Promise<ActionState> {
    const voterId = formData.get("voter_id");
    if (voterId && typeof voterId === "string" && voterId.trim() !== "") {
      return updateVoterAction(prevState, formData);
    }
    return createVoterAction(prevState, formData);
  }

  const [actionState, formAction, isPending] = useActionState(
    voterFormAction,
    initialActionState,
  );
  const [importState, importAction, importPending] = useActionState(
    importVotersAction,
    initialActionState,
  );

  const [isDeleting, startDeleteTransition] = useTransition();
  const [isResending, startResendTransition] = useTransition();

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

  function confirmDelete() {
    if (!deletingVoter) return;
    startDeleteTransition(async () => {
      const formData = new FormData();
      formData.set("voter_id", deletingVoter.voter_id);
      const result = await deleteVoterAction(formData);
      if (result.ok) {
        toast.success(
          result.message ?? `${deletingVoter.name} berhasil dihapus.`,
        );
        setDeletingVoter(null);
      } else {
        toast.error(result.errors?._form?.[0] ?? "Gagal menghapus pemilih.");
      }
    });
  }

  function handleResendToken(tokenId: string) {
    setResendingId(tokenId);
    startResendTransition(async () => {
      const formData = new FormData();
      formData.set("token_id", tokenId);
      const result = await resendTokenEmailAction(formData);
      setResendingId(null);
      if (result.ok) {
        toast.success(result.message ?? "Email token berhasil dikirim ulang.");
      } else {
        toast.error(
          result.errors?._form?.[0] ?? "Gagal mengirim ulang email token.",
        );
      }
    });
  }

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      if (key === "q" || key === "status") params.delete("page");
      router.push(`/admin/voters?${params.toString()}`);
    },
    [router, searchParams],
  );

  const status = searchParams.get("status") ?? "ALL";
  const urlSearch = searchParams.get("q") ?? "";
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const debouncedSearch = useDebounce(searchTerm, 350);

  // Sync searchTerm jika URL berubah (misal dari reset filter atau navigasi)
  useEffect(() => {
    setSearchTerm(urlSearch);
  }, [urlSearch]);

  // Update query parameter URL saat debounced search berubah
  useEffect(() => {
    if (debouncedSearch !== urlSearch) {
      updateParam("q", debouncedSearch);
    }
  }, [debouncedSearch, urlSearch, updateParam]);

  return (
    <div className="space-y-4">
      {/* Top Header & Primary Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
            <Users className="mr-1.5 size-4 text-ink-muted" />
            {total} Pemilih Terdaftar
          </Badge>
          {(urlSearch || status !== "ALL") && (
            <Badge variant="outline" className="text-xs text-ink-muted">
              Filter aktif
            </Badge>
          )}
        </div>

        {/* Action Buttons Group */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/admin/voters/template"
            className={buttonVariants({ variant: "outline" })}
            title="Download Template Excel Pemilih"
          >
            <FileDown className="size-4" aria-hidden />
            Template
          </a>
          <Button variant="outline" onPress={() => setImportOpen(true)}>
            <Upload className="size-4" aria-hidden />
            Import Excel
          </Button>
          <Button
            variant="outline"
            onPress={() => {
              if (electionOptions.length === 0) {
                toast.error(
                  "Belum ada pemilihan yang tersedia untuk ekspor token.",
                );
                return;
              }
              setExportOpen(true);
            }}
          >
            <FileDown className="size-4" aria-hidden />
            Export Token
          </Button>
          <Button onPress={openCreate}>
            <Plus className="size-4" aria-hidden />
            Tambah Pemilih
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama atau email…"
              className="pl-9 pr-8 w-full"
              aria-label="Cari pemilih berdasarkan nama atau email"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink transition-colors cursor-pointer"
                aria-label="Hapus teks pencarian"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <div className="w-48 sm:w-52">
              <Select
                selectedKey={status}
                onSelectionChange={(key) =>
                  updateParam("status", String(key ?? "ALL"))
                }
                placeholder="Status email"
                aria-label="Filter status email"
                className="w-full"
              >
                <SelectTrigger aria-label="Filter status email">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem id="ALL">Semua status email</SelectItem>
                  <SelectItem id="SENT">Terkirim</SelectItem>
                  <SelectItem id="FAILED">Gagal kirim</SelectItem>
                  <SelectItem id="NO_EMAIL">Belum kirim</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {urlSearch || status !== "ALL" ? (
              <Button
                variant="ghost"
                size="sm"
                onPress={() => {
                  setSearchTerm("");
                  router.push("/admin/voters");
                }}
                className="text-xs text-ink-muted hover:text-destructive hover:bg-destructive/10 shrink-0"
                aria-label="Reset filter"
              >
                <X className="size-3.5 mr-1" />
                Reset Filter
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <DataTable
        columns={[
          {
            key: "name",
            header: "Nama",
            cell: (v) => (
              <div className="min-w-0">
                <p className="font-medium truncate">{v.name}</p>
                <p className="text-xs text-ink-muted truncate">{v.email}</p>
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
                  <p className="text-xs text-ink-muted truncate">
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
                  <div className="space-y-0.5 max-w-40">
                    <Badge variant="destructive">Gagal</Badge>
                    <p
                      className="truncate text-xs text-ink-muted"
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
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Kirim ulang email ${v.name}`}
                    isDisabled={
                      isResending && resendingId === v.tokens[0].token_id
                    }
                    onPress={() => handleResendToken(v.tokens[0].token_id)}
                  >
                    {isResending && resendingId === v.tokens[0].token_id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <RefreshCw className="size-4" aria-hidden />
                    )}
                  </Button>
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
                  onPress={() => setDeletingVoter(v)}
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

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <p className="text-sm text-ink-muted">
          Menampilkan{" "}
          <span className="font-medium text-ink">
            {total === 0 ? 0 : (page - 1) * 50 + 1}
          </span>
          {" - "}
          <span className="font-medium text-ink">
            {Math.min(page * 50, total)}
          </span>{" "}
          dari <span className="font-medium text-ink">{total}</span> pemilih
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              isDisabled={page <= 1}
              onPress={() => updateParam("page", String(page - 1))}
            >
              Sebelumnya
            </Button>
            <span className="text-xs px-2 font-medium text-ink">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              isDisabled={page >= totalPages}
              onPress={() => updateParam("page", String(page + 1))}
            >
              Berikutnya
            </Button>
          </div>
        )}
      </div>
      <AlertDialog
        isOpen={deletingVoter !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeletingVoter(null);
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Pemilih</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah kamu yakin ingin menghapus pemilih{" "}
            <span className="font-semibold text-ink">
              {deletingVoter?.name} ({deletingVoter?.email})
            </span>
            ? Pemilih yang sudah memberikan suara tidak dapat dihapus demi
            integritas data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel isDisabled={isDeleting}>Batal</AlertDialogCancel>
          <Button
            variant="destructive"
            isDisabled={isDeleting}
            onPress={confirmDelete}
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Menghapus…
              </>
            ) : (
              "Hapus"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialog>

      <FormDialog
        key={dialogKey}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit Pemilih" : "Tambah Pemilih"}
        description="Data pemilih untuk distribusi token."
        isSubmitting={isPending}
      >
        <form action={formAction} className="space-y-4 w-full min-w-0">
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
          <div className="space-y-1.5">
            <Label htmlFor="name">Nama</Label>
            <Input
              id="name"
              name="name"
              defaultValue={editing?.name ?? undefined}
              placeholder="Nama lengkap"
              aria-invalid={Boolean(actionState.errors?.name)}
            />
            {actionState.errors?.name ? (
              <p className="text-xs text-destructive">
                {actionState.errors.name[0]}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={editing?.email ?? undefined}
              placeholder="nama@email.com"
              aria-invalid={Boolean(actionState.errors?.email)}
            />
            {actionState.errors?.email ? (
              <p className="text-xs text-destructive">
                {actionState.errors.email[0]}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">Role</Label>
            <Select
              name="role"
              defaultSelectedKey={editing?.role ?? "SISWA"}
              placeholder="Pilih role"
              className="w-full"
            >
              <SelectTrigger id="role" aria-label="Pilih role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="SISWA">SISWA</SelectItem>
                <SelectItem id="OSIS">OSIS</SelectItem>
                <SelectItem id="MPK">MPK</SelectItem>
                <SelectItem id="GUKAR">GUKAR</SelectItem>
              </SelectContent>
            </Select>
            {actionState.errors?.role ? (
              <p className="text-xs text-destructive">
                {actionState.errors.role[0]}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="generation">Angkatan (opsional)</Label>
            <Input
              id="generation"
              name="generation"
              defaultValue={editing?.generation ?? undefined}
              placeholder="34"
              aria-invalid={Boolean(actionState.errors?.generation)}
            />
            {actionState.errors?.generation ? (
              <p className="text-xs text-destructive">
                {actionState.errors.generation[0]}
              </p>
            ) : null}
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

      <FormDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Pemilih dari Excel"
        description="Format: Nama | Email | Role | Angkatan — unduh template untuk contoh."
        isSubmitting={importPending}
      >
        <form action={importAction} className="space-y-4 w-full min-w-0">
          {importState.errors?.file ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {importState.errors.file[0]}
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="file">File Excel (.xlsx)</Label>
            <Input
              id="file"
              name="file"
              type="file"
              accept=".xlsx"
              aria-invalid={Boolean(importState.errors?.file)}
            />
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
              {importPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Mengimpor…
                </>
              ) : (
                "Import"
              )}
            </Button>
          </div>
        </form>
      </FormDialog>

      <FormDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Export Token Pemilih"
        description="Pilih pemilihan yang daftar tokennya ingin kamu unduh dalam file Excel (.xlsx)."
      >
        <div className="space-y-4 w-full min-w-0">
          <div className="space-y-1.5">
            <Label htmlFor="export_election_select">Pemilihan</Label>
            <Select
              selectedKey={selectedElection}
              onSelectionChange={(key) =>
                setSelectedElection(String(key ?? ""))
              }
              placeholder="Pilih pemilihan"
              aria-label="Pilih pemilihan untuk ekspor token"
              className="w-full"
            >
              <SelectTrigger
                id="export_election_select"
                aria-label="Pilih pemilihan"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {electionOptions.map((e) => (
                  <SelectItem
                    key={e.election_id}
                    id={e.election_id}
                    textValue={e.title}
                  >
                    <span className="truncate">{e.title}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onPress={() => setExportOpen(false)}
            >
              Batal
            </Button>
            <a
              href={
                selectedElection
                  ? `/api/admin/voters/export?election_id=${selectedElection}`
                  : "#"
              }
              onClick={(e) => {
                if (!selectedElection) {
                  e.preventDefault();
                  toast.error("Pilih pemilihan terlebih dahulu.");
                  return;
                }
                setExportOpen(false);
              }}
              className={buttonVariants({ variant: "default" })}
            >
              <FileDown className="size-4 mr-1.5" aria-hidden />
              Unduh Excel
            </a>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}

export { formatDate };
