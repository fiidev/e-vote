"use client";

import { ImageIcon, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import {
  useActionState,
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
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createCandidateAction,
  deleteCandidateAction,
  updateCandidateAction,
} from "@/features/candidates/actions";
import {
  ALLOWED_IMAGE_EXTENSIONS,
  MAX_IMAGE_FILE_SIZE_MB,
} from "@/lib/constants/upload";
import type { ActionState } from "@/types/action-state";

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
  const [deletingCandidate, setDeletingCandidate] =
    useState<CandidateRow | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const [selectedElectionId, setSelectedElectionId] = useState<string>(
    elections[0]?.election_id ?? "",
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function candidateFormAction(
    prevState: ActionState,
    formData: FormData,
  ): Promise<ActionState> {
    const candidateId = formData.get("candidate_id");
    if (
      candidateId &&
      typeof candidateId === "string" &&
      candidateId.trim() !== ""
    ) {
      return updateCandidateAction(prevState, formData);
    }
    return createCandidateAction(prevState, formData);
  }

  const [dialogKey, setDialogKey] = useState(0);
  const [actionState, formAction, isPending] = useActionState(
    candidateFormAction,
    initialActionState,
  );

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

  function openCreate() {
    setEditing(null);
    setPreviewUrl(null);
    setSelectedElectionId(elections[0]?.election_id ?? "");
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(candidate: CandidateRow) {
    setEditing(candidate);
    setPreviewUrl(candidate.photo_url);
    setSelectedElectionId(candidate.election_id);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function confirmDelete() {
    if (!deletingCandidate) return;
    startDeleteTransition(async () => {
      const formData = new FormData();
      formData.set("candidate_id", deletingCandidate.candidate_id);
      const result = await deleteCandidateAction(formData);
      if (result.ok) {
        toast.success(
          result.message ?? `${deletingCandidate.name} berhasil dihapus.`,
        );
        setDeletingCandidate(null);
      } else {
        toast.error(result.errors?._form?.[0] ?? "Gagal menghapus kandidat.");
      }
    });
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
                  <p className="font-medium truncate">{c.name}</p>
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
                  onPress={() => setDeletingCandidate(c)}
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

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        isOpen={deletingCandidate !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeletingCandidate(null);
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Kandidat</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah kamu yakin ingin menghapus kandidat{" "}
            <span className="font-semibold text-ink">
              {deletingCandidate?.name} (No.{" "}
              {deletingCandidate?.candidate_number})
            </span>
            ? Tindakan ini tidak dapat dibatalkan.
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

      {/* Form Dialog Create / Edit Candidate */}
      <FormDialog
        key={dialogKey}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit Kandidat" : "Tambah Kandidat"}
        description="Lengkapi data kandidat di bawah."
        isSubmitting={isPending}
      >
        <form action={formAction} className="space-y-4 w-full min-w-0">
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
              <div className="space-y-1.5">
                <Label>Pemilihan</Label>
                <div className="flex min-h-9 w-full items-center rounded-2xl border border-transparent bg-input/40 px-3 py-2 text-sm text-ink font-medium">
                  <span className="truncate">{editing.election.title}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="election_select">Pemilihan</Label>
              <Select
                name="election_id"
                selectedKey={selectedElectionId}
                onSelectionChange={(key) =>
                  setSelectedElectionId(String(key ?? ""))
                }
                placeholder="Pilih pemilihan"
                aria-label="Pilih pemilihan untuk kandidat"
                className="w-full"
              >
                <SelectTrigger
                  id="election_select"
                  aria-label="Pilih pemilihan"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {elections.map((e) => (
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
              {actionState.errors?.election_id ? (
                <p className="text-xs text-destructive">
                  {actionState.errors.election_id[0]}
                </p>
              ) : null}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="candidate_number">Nomor Urut</Label>
            <Input
              id="candidate_number"
              name="candidate_number"
              type="number"
              min={1}
              defaultValue={
                editing
                  ? editing.candidate_number
                  : candidates.filter(
                        (c) => c.election_id === selectedElectionId,
                      ).length > 0
                    ? Math.max(
                        ...candidates
                          .filter((c) => c.election_id === selectedElectionId)
                          .map((c) => c.candidate_number),
                      ) + 1
                    : 1
              }
              placeholder="1"
              aria-invalid={Boolean(actionState.errors?.candidate_number)}
            />
            {actionState.errors?.candidate_number ? (
              <p className="text-xs text-destructive">
                {actionState.errors.candidate_number[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Nama Kandidat</Label>
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
            <Label htmlFor="class_name">Kelas</Label>
            <Input
              id="class_name"
              name="class_name"
              defaultValue={editing?.class_name ?? undefined}
              placeholder="XI-1"
              aria-invalid={Boolean(actionState.errors?.class_name)}
            />
            {actionState.errors?.class_name ? (
              <p className="text-xs text-destructive">
                {actionState.errors.class_name[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="photo_file">Foto Kandidat (opsional)</Label>
            <div className="flex items-center gap-4 p-3 rounded-xl border border-line bg-surface/50">
              <div className="relative size-16 rounded-xl overflow-hidden bg-muted flex items-center justify-center shrink-0 border border-line">
                {previewUrl ? (
                  // biome-ignore lint/performance/noImgElement: user upload preview
                  <img
                    src={previewUrl}
                    alt="Preview foto kandidat"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="size-6 text-muted-foreground opacity-50" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <input
                  ref={fileInputRef}
                  id="photo_file"
                  name="photo_file"
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPreviewUrl(URL.createObjectURL(file));
                    }
                  }}
                />
                <input
                  type="hidden"
                  name="photo_url"
                  value={previewUrl ?? ""}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onPress={() => fileInputRef.current?.click()}
                  >
                    <Upload className="size-3.5" aria-hidden />
                    {previewUrl ? "Ganti Foto" : "Unggah Foto"}
                  </Button>
                  {previewUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onPress={() => {
                        setPreviewUrl(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                      Hapus
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Format {ALLOWED_IMAGE_EXTENSIONS} (Maks{" "}
                  {MAX_IMAGE_FILE_SIZE_MB}MB). Foto disimpan langsung ke
                  Cloudinary.
                </p>
              </div>
            </div>
            {actionState.errors?.photo_url ? (
              <p className="text-xs text-destructive">
                {actionState.errors.photo_url[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vision">Visi</Label>
            <Textarea
              id="vision"
              name="vision"
              defaultValue={editing?.vision ?? undefined}
              placeholder="Visi kandidat"
              rows={3}
              aria-invalid={Boolean(actionState.errors?.vision)}
            />
            {actionState.errors?.vision ? (
              <p className="text-xs text-destructive">
                {actionState.errors.vision[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mission">Misi</Label>
            <Textarea
              id="mission"
              name="mission"
              defaultValue={editing?.mission ?? undefined}
              placeholder="Misi kandidat"
              rows={3}
              aria-invalid={Boolean(actionState.errors?.mission)}
            />
            {actionState.errors?.mission ? (
              <p className="text-xs text-destructive">
                {actionState.errors.mission[0]}
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
    </div>
  );
}
