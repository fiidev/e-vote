"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  createCandidateAction,
  deleteCandidateAction,
  updateCandidateAction,
} from "@/app/actions/admin";
import { DataTable } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { FormDialog } from "@/components/admin/form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/types/admin";

export interface CandidateRow {
  candidate_id: string;
  election_id: string;
  candidate_number: number;
  name: string;
  class_name: string;
  photo_url: string;
  vision: string;
  mission: string;
  election: { title: string };
  _count: { votes: number };
}

interface CandidatesClientProps {
  candidates: CandidateRow[];
  elections: Array<{ election_id: string; title: string }>;
}

const initialActionState: ActionState = { ok: false };

export function CandidatesClient({
  candidates,
  elections,
}: CandidatesClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CandidateRow | null>(null);
  // Reset dialog form key setiap kali dialog open/close atau editing berubah,
  // agar useActionState tidak leak error dari form sebelumnya.
  const [dialogKey, setDialogKey] = useState(0);
  const [actionState, formAction, isPending] = useActionState(
    editing ? updateCandidateAction : createCandidateAction,
    initialActionState,
  );

  // Toast feedback setelah form submit selesai
  const prevPending = useRef(isPending);
  useEffect(() => {
    if (prevPending.current && !isPending) {
      // Submit baru selesai
      if (actionState.ok && actionState.message) {
        toast.success(actionState.message);
        setDialogOpen(false);
      } else if (!actionState.ok && actionState.errors?._form) {
        toast.error(actionState.errors._form[0]);
      }
    }
    prevPending.current = isPending;
  }, [isPending, actionState]);

  function openCreate() {
    setEditing(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(candidate: CandidateRow) {
    setEditing(candidate);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  async function handleDelete(candidateId: string, name: string) {
    const formData = new FormData();
    formData.set("candidate_id", candidateId);
    const result = await deleteCandidateAction(formData);
    if (result.ok) {
      toast.success(result.message ?? `${name} berhasil dihapus.`);
    } else {
      toast.error(result.errors?._form?.[0] ?? "Gagal menghapus.");
    }
  }

  const hasElections = elections.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          {candidates.length} kandidat terdaftar.
        </p>
        <Button onPress={openCreate} isDisabled={!hasElections}>
          <Plus className="size-4" aria-hidden />
          Tambah Kandidat
        </Button>
      </div>

      <DataTable
        columns={[
          {
            key: "number",
            header: "No",
            cell: (c) => (
              <span className="font-semibold">{c.candidate_number}</span>
            ),
          },
          {
            key: "name",
            header: "Nama",
            cell: (c) => (
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-peach text-sm font-bold text-primary">
                  {c.name[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-ink-muted">{c.class_name}</p>
                </div>
              </div>
            ),
          },
          {
            key: "election",
            header: "Pemilihan",
            cell: (c) => <span className="text-sm">{c.election.title}</span>,
          },
          {
            key: "votes",
            header: "Suara",
            cell: (c) => (
              <Badge variant="outline">{c._count.votes} suara</Badge>
            ),
          },
          {
            key: "actions",
            header: "Aksi",
            cell: (c) => (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${c.name}`}
                  onPress={() => openEdit(c)}
                >
                  <Pencil className="size-4" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Hapus ${c.name}`}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onPress={() => handleDelete(c.candidate_id, c.name)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ),
          },
        ]}
        rows={candidates}
        keyFn={(c) => c.candidate_id}
        empty={
          candidates.length === 0 && !hasElections ? (
            <EmptyState
              title="Belum ada pemilihan"
              description="Buat pemilihan terlebih dahulu sebelum menambahkan kandidat."
            />
          ) : (
            <EmptyState
              title="Belum ada kandidat"
              description="Tambahkan kandidat untuk pemilihan yang sedang berjalan."
              action={
                <Button onPress={openCreate}>
                  <Plus className="size-4" aria-hidden />
                  Tambah Kandidat
                </Button>
              }
            />
          )
        }
      />

      <FormDialog
        key={dialogKey}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit Kandidat" : "Tambah Kandidat"}
        description="Lengkapi data kandidat di bawah."
        isSubmitting={isPending}
      >
        <form action={formAction} className="space-y-4">
          {editing ? (
            <>
              <input
                type="hidden"
                name="candidate_id"
                value={editing.candidate_id}
              />
              <input
                type="hidden"
                name="election_id"
                value={editing.election_id}
              />
            </>
          ) : null}

          {actionState.errors?._form ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {actionState.errors._form[0]}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="candidate_number">Nomor Urut</Label>
            <Input
              id="candidate_number"
              name="candidate_number"
              type="number"
              min={1}
              defaultValue={editing?.candidate_number ?? undefined}
              placeholder="1"
            />
          </div>

          {!editing ? (
            <div className="space-y-2">
              <Label htmlFor="election_select">Pemilihan</Label>
              <Select
                name="election_id"
                defaultSelectedKey={elections[0]?.election_id}
                placeholder="Pilih pemilihan"
                aria-label="Pilih pemilihan untuk kandidat"
              >
                <SelectTrigger
                  id="election_select"
                  aria-label="Pilih pemilihan"
                />
                <SelectContent>
                  {elections.map((e) => (
                    <SelectItem key={e.election_id} id={e.election_id}>
                      {e.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="name">Nama Kandidat</Label>
            <Input
              id="name"
              name="name"
              defaultValue={editing?.name ?? undefined}
              placeholder="Nama lengkap"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="class_name">Kelas</Label>
            <Input
              id="class_name"
              name="class_name"
              defaultValue={editing?.class_name ?? undefined}
              placeholder="XI-1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="photo_url">URL Foto (opsional)</Label>
            <Input
              id="photo_url"
              name="photo_url"
              defaultValue={editing?.photo_url ?? undefined}
              placeholder="https://…"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vision">Visi</Label>
            <Textarea
              id="vision"
              name="vision"
              defaultValue={editing?.vision ?? undefined}
              placeholder="Visi kandidat"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mission">Misi</Label>
            <Textarea
              id="mission"
              name="mission"
              defaultValue={editing?.mission ?? undefined}
              placeholder="Misi kandidat"
              rows={3}
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
