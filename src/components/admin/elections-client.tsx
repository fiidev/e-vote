"use client";

import { KeyRound, Loader2, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import {
  type ActionState,
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
  const [roleWeights, setRoleWeights] = useState<Record<string, string>>({});
  const [actionState, formAction, isPending] = useActionState(
    editing ? updateElectionAction : createElectionAction,
    initialActionState,
  );

  function openCreate() {
    setEditing(null);
    setIsWeighted(false);
    setRoleWeights({});
    setDialogOpen(true);
  }

  function openEdit(election: ElectionRow) {
    setEditing(election);
    setIsWeighted(election.is_weighted);
    const weights = (election.role_weights ?? {}) as Record<string, number>;
    setRoleWeights(
      Object.fromEntries(
        Object.entries(weights).map(([k, v]) => [k, String(v)]),
      ),
    );
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
                <form action={generateTokensAction}>
                  <input
                    type="hidden"
                    name="election_id"
                    value={e.election_id}
                  />
                  <Button variant="outline" size="sm">
                    <KeyRound className="size-4" aria-hidden />
                    Token
                  </Button>
                </form>
                <form action={sendTokensEmailAction}>
                  <input
                    type="hidden"
                    name="election_id"
                    value={e.election_id}
                  />
                  <Button variant="outline" size="sm">
                    <Send className="size-4" aria-hidden />
                    Kirim Email
                  </Button>
                </form>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${e.title}`}
                  onPress={() => openEdit(e)}
                >
                  <Pencil className="size-4" aria-hidden />
                </Button>
                <form action={deleteElectionAction}>
                  <input
                    type="hidden"
                    name="election_id"
                    value={e.election_id}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Hapus ${e.title}`}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </form>
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
            <div className="flex flex-wrap gap-3">
              {ROLE_OPTIONS.map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 text-sm text-ink"
                >
                  <Checkbox
                    name="eligible_roles"
                    value={role}
                    defaultSelected={
                      editing?.eligible_roles.includes(role) ?? role === "SISWA"
                    }
                  />
                  {role}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="is_weighted"
              name="is_weighted"
              isSelected={isWeighted}
              onChange={setIsWeighted}
            />
            <Label htmlFor="is_weighted">Gunakan sistem bobot per role</Label>
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
              name="is_active"
              defaultSelected={editing?.is_active ?? true}
            />
            <Label htmlFor="is_active">Aktifkan pemilihan</Label>
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

export { Loader2 };
