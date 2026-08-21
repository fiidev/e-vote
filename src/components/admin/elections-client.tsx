"use client";

import { KeyRound, Loader2, Pencil, Plus, Send, Trash2 } from "lucide-react";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  createElectionAction,
  deleteElectionAction,
  generateTokensAction,
  sendTokensEmailAction,
  updateElectionAction,
} from "@/app/actions/admin";
import { DataTable } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { FormDialog } from "@/components/admin/form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils/format";
import type { ActionState } from "@/types/admin";

export interface ElectionRow {
  election_id: string;
  title: string;
  description: string | null;
  start_time: Date;
  end_time: Date;
  is_active: boolean;
  eligible_roles: string[];
  is_weighted: boolean;
  role_weights: unknown;
  _count: { candidates: number; votes: number; tokens: number };
}

const ROLE_OPTIONS = ["SISWA", "OSIS", "MPK", "GUKAR"] as const;

interface ElectionsClientProps {
  elections: ElectionRow[];
}

const initialActionState: ActionState = { ok: false };

export function ElectionsClient({ elections }: ElectionsClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ElectionRow | null>(null);
  const [isWeighted, setIsWeighted] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [roleWeights, setRoleWeights] = useState<Record<string, string>>({});
  // Reset dialog form key setiap kali dialog open/close atau editing berubah,
  // agar useActionState tidak leak error dari form sebelumnya.
  const [dialogKey, setDialogKey] = useState(0);
  const [actionState, formAction, isPending] = useActionState(
    editing ? updateElectionAction : createElectionAction,
    initialActionState,
  );
  const [tokenPending, startTokenTransition] = useTransition();
  const [emailPending, startEmailTransition] = useTransition();

  // Toast feedback setelah form submit selesai
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

  async function handleGenerateTokens(electionId: string) {
    startTokenTransition(async () => {
      const formData = new FormData();
      formData.set("election_id", electionId);
      const result = await generateTokensAction(formData);
      if (result.ok) {
        toast.success(result.message ?? "Token berhasil dibuat.");
      } else {
        toast.error(result.errors?._form?.[0] ?? "Gagal membuat token.");
      }
    });
  }

  async function handleSendEmails(electionId: string) {
    startEmailTransition(async () => {
      const formData = new FormData();
      formData.set("election_id", electionId);
      const result = await sendTokensEmailAction(formData);
      if (result.ok) {
        toast.success(result.message ?? "Email berhasil dikirim.");
      } else {
        toast.error(result.errors?._form?.[0] ?? "Gagal mengirim email.");
      }
    });
  }

  async function handleDeleteElection(electionId: string, title: string) {
    const formData = new FormData();
    formData.set("election_id", electionId);
    const result = await deleteElectionAction(formData);
    if (result.ok) {
      toast.success(result.message ?? `${title} berhasil dihapus.`);
    } else {
      toast.error(result.errors?._form?.[0] ?? "Gagal menghapus.");
    }
  }

  function openCreate() {
    setEditing(null);
    setIsWeighted(false);
    setIsActive(true);
    setRoleWeights({});
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(election: ElectionRow) {
    setEditing(election);
    setIsWeighted(election.is_weighted);
    setIsActive(election.is_active);
    const weights = (election.role_weights ?? {}) as Record<string, number>;
    setRoleWeights(
      Object.fromEntries(
        Object.entries(weights).map(([k, v]) => [k, String(v)]),
      ),
    );
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function updateWeight(role: string, value: string) {
    setRoleWeights((prev) => ({ ...prev, [role]: value }));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          {elections.length} pemilihan terdaftar.
        </p>
        <Button onPress={openCreate}>
          <Plus className="size-4" aria-hidden />
          Buat Pemilihan
        </Button>
      </div>

      <DataTable
        columns={[
          {
            key: "title",
            header: "Judul",
            cell: (e) => (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{e.title}</span>
                {e.is_active ? (
                  <Badge
                    variant="default"
                    className="bg-primary text-primary-foreground"
                  >
                    Aktif
                  </Badge>
                ) : (
                  <Badge variant="outline">Nonaktif</Badge>
                )}
                {e.is_weighted ? (
                  <Badge variant="secondary">Bobot</Badge>
                ) : null}
              </div>
            ),
          },
          {
            key: "window",
            header: "Jadwal",
            cell: (e) => (
              <div className="text-sm text-ink-muted">
                <p>{formatDate(e.start_time)}</p>
                <p>— {formatDate(e.end_time)}</p>
              </div>
            ),
          },
          {
            key: "eligible",
            header: "Pemilih",
            cell: (e) => (
              <div className="flex flex-wrap gap-1">
                {e.eligible_roles.map((r) => (
                  <Badge key={r} variant="outline">
                    {r}
                  </Badge>
                ))}
              </div>
            ),
          },
          {
            key: "stats",
            header: "Progres",
            cell: (e) => (
              <div className="text-sm">
                <p>{e._count.votes} suara</p>
                <p className="text-xs text-ink-muted">
                  {e._count.tokens} token
                </p>
              </div>
            ),
          },
          {
            key: "actions",
            header: "Aksi",
            cell: (e) => (
              <div className="flex flex-wrap gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  isDisabled={tokenPending}
                  onPress={() => handleGenerateTokens(e.election_id)}
                >
                  {tokenPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <KeyRound className="size-4" aria-hidden />
                  )}
                  Token
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  isDisabled={emailPending}
                  onPress={() => handleSendEmails(e.election_id)}
                >
                  {emailPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Send className="size-4" aria-hidden />
                  )}
                  Kirim Email
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${e.title}`}
                  onPress={() => openEdit(e)}
                >
                  <Pencil className="size-4" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Hapus ${e.title}`}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onPress={() => handleDeleteElection(e.election_id, e.title)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ),
          },
        ]}
        rows={elections}
        keyFn={(e) => e.election_id}
        empty={
          <EmptyState
            title="Belum ada pemilihan"
            description="Buat pemilihan pertama untuk memulai."
            action={
              <Button onPress={openCreate}>
                <Plus className="size-4" aria-hidden />
                Buat Pemilihan
              </Button>
            }
          />
        }
      />

      <FormDialog
        key={dialogKey}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit Pemilihan" : "Buat Pemilihan"}
        description="Atur jadwal, role pemilih, dan sistem perhitungan suara."
        isSubmitting={isPending}
      >
        <form action={formAction} className="space-y-4">
          <input
            type="hidden"
            name="election_id"
            value={editing?.election_id ?? ""}
          />

          {actionState.errors?._form ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {actionState.errors._form[0]}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="title">Judul</Label>
            <Input
              id="title"
              name="title"
              defaultValue={editing?.title ?? undefined}
              placeholder="Pemilihan Ketua OSIS 2026"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi (opsional)</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={editing?.description ?? undefined}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_time">Mulai</Label>
              <Input
                id="start_time"
                name="start_time"
                type="datetime-local"
                defaultValue={
                  editing ? toLocalInput(editing.start_time) : undefined
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Selesai</Label>
              <Input
                id="end_time"
                name="end_time"
                type="datetime-local"
                defaultValue={
                  editing ? toLocalInput(editing.end_time) : undefined
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Role yang Berhak Memilih</Label>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm text-ink transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <Checkbox
                    name="eligible_roles"
                    value={role}
                    defaultSelected={
                      editing?.eligible_roles.includes(role) ?? role === "SISWA"
                    }
                    aria-label={`Role ${role}`}
                  />
                  {role}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="is_weighted"
              isSelected={isWeighted}
              onChange={setIsWeighted}
            />
            <Label htmlFor="is_weighted">Gunakan sistem bobot per role</Label>
            <input
              type="hidden"
              name="is_weighted"
              value={isWeighted ? "on" : ""}
            />
          </div>

          {isWeighted ? (
            <div className="space-y-3 rounded-xl border border-line bg-surface/60 p-4">
              <p className="text-sm font-medium text-ink">
                Bobot per role (total harus 100%)
              </p>
              {actionState.errors?.role_weights ? (
                <p className="text-sm text-destructive">
                  {actionState.errors.role_weights[0]}
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                {ROLE_OPTIONS.map((role) => (
                  <div key={role} className="space-y-1">
                    <Label
                      htmlFor={`weight_${role}`}
                      className="text-xs text-ink-muted"
                    >
                      {role}
                    </Label>
                    <Input
                      id={`weight_${role}`}
                      type="number"
                      min={0}
                      max={100}
                      placeholder="0"
                      value={roleWeights[role] ?? ""}
                      onChange={(e) => updateWeight(role, e.target.value)}
                      data-role-weight={role}
                    />
                  </div>
                ))}
              </div>
              <input
                type="hidden"
                name="role_weights"
                value={JSON.stringify(
                  Object.fromEntries(
                    Object.entries(roleWeights).map(([k, v]) => [k, Number(v)]),
                  ),
                )}
              />
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-muted">Total</span>
                <span
                  className={
                    totalWeight(roleWeights) === 100
                      ? "font-semibold text-ink"
                      : "font-semibold text-destructive"
                  }
                >
                  {totalWeight(roleWeights)}%
                </span>
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <Switch
              id="is_active"
              isSelected={isActive}
              onChange={setIsActive}
            />
            <Label htmlFor="is_active">Aktifkan pemilihan</Label>
            <input
              type="hidden"
              name="is_active"
              value={isActive ? "on" : ""}
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
    </div>
  );
}

function toLocalInput(date: Date): string {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function totalWeight(weights: Record<string, string>): number {
  return Object.values(weights).reduce((acc, v) => acc + (Number(v) || 0), 0);
}
