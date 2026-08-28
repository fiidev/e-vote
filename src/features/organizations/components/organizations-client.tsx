"use client";

import {
  Building2,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
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
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
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
  createOrganizationAction,
  deleteOrganizationAction,
  provisionAdminUserAction,
  removeAdminUserAction,
  updateOrganizationAction,
} from "@/features/organizations/actions";
import type {
  OrgAdminRow,
  OrganizationRow,
} from "@/features/organizations/types";
import type { ActionState } from "@/types/action-state";

interface OrgItem {
  id: string;
  name: string;
  slug: string;
  code: string;
  parentId?: string | null;
  description?: string | null;
  electionCount?: number;
  voterCount?: number;
  childCount?: number;
}

interface OrganizationsClientProps {
  organizations: OrganizationRow[];
  allOrgOptions: { id: string; name: string; code: string; type: string }[];
}

const initialActionState: ActionState = { ok: false };

export function OrganizationsClient({
  organizations,
  allOrgOptions,
}: OrganizationsClientProps) {
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrgItem | null>(null);
  const [parentOrgForSub, setParentOrgForSub] = useState<string | null>(null);

  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [preselectedOrgId, setPreselectedOrgId] = useState<string | null>(null);

  const [deletingOrg, setDeletingOrg] = useState<OrgItem | null>(null);
  const [revokingAdmin, setRevokingAdmin] = useState<OrgAdminRow | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const [orgFormState, orgFormAction, isOrgPending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      if (editingOrg) {
        return updateOrganizationAction(prev, formData);
      }
      return createOrganizationAction(prev, formData);
    },
    initialActionState,
  );

  const [adminFormState, adminFormAction, isAdminPending] = useActionState(
    provisionAdminUserAction,
    initialActionState,
  );

  useEffect(() => {
    if (orgFormState?.ok) {
      toast.success(orgFormState.message ?? "Organisasi berhasil disimpan.");
      setOrgDialogOpen(false);
      setEditingOrg(null);
      setParentOrgForSub(null);
    } else if (orgFormState?.errors?._form) {
      toast.error(orgFormState.errors._form[0]);
    }
  }, [orgFormState]);

  useEffect(() => {
    if (adminFormState?.ok) {
      toast.success(adminFormState.message ?? "Admin berhasil didaftarkan.");
      setAdminDialogOpen(false);
      setPreselectedOrgId(null);
    } else if (adminFormState?.errors?._form) {
      toast.error(adminFormState.errors._form[0]);
    }
  }, [adminFormState]);

  const handleDeleteOrg = () => {
    if (!deletingOrg) return;
    const fd = new FormData();
    fd.set("id", deletingOrg.id);
    startDeleteTransition(async () => {
      const res = await deleteOrganizationAction(fd);
      if (res.ok) {
        toast.success(res.message ?? "Organisasi berhasil dihapus.");
        setDeletingOrg(null);
      } else {
        toast.error(res.errors?._form?.[0] ?? "Gagal menghapus organisasi.");
      }
    });
  };

  const handleRevokeAdmin = () => {
    if (!revokingAdmin) return;
    const fd = new FormData();
    fd.set("user_id", revokingAdmin.id);
    startDeleteTransition(async () => {
      const res = await removeAdminUserAction(fd);
      if (res.ok) {
        toast.success(res.message ?? "Akses admin berhasil dicabut.");
        setRevokingAdmin(null);
      } else {
        toast.error(res.errors?._form?.[0] ?? "Gagal mencabut akses admin.");
      }
    });
  };

  const isTenureActive = (start?: Date | null, end?: Date | null) => {
    if (!start && !end) return true;
    const now = new Date();
    if (start && now < new Date(start)) return false;
    if (end && now > new Date(end)) return false;
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            Tata Kelola Organisasi
          </h1>
          <p className="text-sm text-ink-muted">
            Struktur hierarki organisasi induk, sub-organisasi, dan whitelist
            panitia pemilihan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onPress={() => {
              setPreselectedOrgId(null);
              setAdminDialogOpen(true);
            }}
          >
            <UserPlus className="size-4 mr-2" />
            Assign Admin
          </Button>
          <Button
            variant="default"
            onPress={() => {
              setEditingOrg(null);
              setParentOrgForSub(null);
              setOrgDialogOpen(true);
            }}
          >
            <Plus className="size-4 mr-2" />
            Tambah Organisasi Induk
          </Button>
        </div>
      </div>

      {/* Organizations Tree View */}
      <div className="space-y-4">
        {organizations.length === 0 ? (
          <div className="border border-dashed border-line rounded-2xl p-12 text-center bg-card">
            <Building2 className="size-12 text-ink-muted mx-auto mb-3 opacity-40" />
            <h3 className="font-semibold text-ink text-lg">
              Belum Ada Organisasi
            </h3>
            <p className="text-sm text-ink-muted max-w-sm mx-auto mt-1 mb-4">
              Mulai dengan menambahkan organisasi induk seperti OSIS, MPK, atau
              Dewan Ambalan.
            </p>
            <Button
              variant="default"
              onPress={() => {
                setEditingOrg(null);
                setParentOrgForSub(null);
                setOrgDialogOpen(true);
              }}
            >
              <Plus className="size-4 mr-2" />
              Buat Organisasi Pertama
            </Button>
          </div>
        ) : (
          organizations.map((org) => (
            <div
              key={org.id}
              className="border border-line rounded-2xl bg-card overflow-hidden shadow-xs"
            >
              {/* Parent Org Card Header */}
              <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-stone-50/50 border-b border-line/60">
                <div className="flex items-center gap-3.5">
                  <div className="size-11 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center font-bold text-orange-800 text-sm shadow-2xs">
                    {org.code}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-lg text-ink">{org.name}</h2>
                      <Badge
                        variant="outline"
                        className="text-xs bg-white font-mono"
                      >
                        Prefix: {org.code}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Induk
                      </Badge>
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Slug:{" "}
                      <span className="font-mono text-ink">{org.slug}</span> ·{" "}
                      {org._count?.elections ?? 0} Sesi Pemilihan ·{" "}
                      {org.children?.length ?? 0} Sub-Organisasi
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() => {
                      setEditingOrg(null);
                      setParentOrgForSub(org.id);
                      setOrgDialogOpen(true);
                    }}
                  >
                    <Plus className="size-3.5 mr-1" />
                    Sub-Org
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() => {
                      setPreselectedOrgId(org.id);
                      setAdminDialogOpen(true);
                    }}
                  >
                    <UserPlus className="size-3.5 mr-1" />
                    Admin
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onPress={() => {
                      setEditingOrg(org);
                      setParentOrgForSub(null);
                      setOrgDialogOpen(true);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onPress={() => {
                      const electionCount = org._count?.elections ?? 0;
                      const voterCount =
                        org.elections?.reduce(
                          (sum, e) => sum + (e._count?.voters ?? 0),
                          0,
                        ) ?? 0;
                      const childCount = org.children?.length ?? 0;
                      setDeletingOrg({
                        ...org,
                        electionCount,
                        voterCount,
                        childCount,
                      });
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* Parent Org Admins */}
              {org.admins && org.admins.length > 0 && (
                <div className="px-5 py-3 bg-white border-b border-line/40 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-ink-muted flex items-center gap-1.5 mr-2">
                    <ShieldCheck className="size-3.5 text-orange-600" />
                    Panitia Induk:
                  </span>
                  {org.admins.map((adm) => (
                    <div
                      key={adm.id}
                      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border border-line bg-stone-50 text-xs"
                    >
                      <span className="font-medium text-ink">{adm.name}</span>
                      <span className="text-ink-muted">({adm.email})</span>
                      <button
                        type="button"
                        onClick={() => setRevokingAdmin(adm)}
                        className="text-red-500 hover:text-red-700 ml-1"
                        title="Cabut Akses"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Sub-Organizations List */}
              {org.children && org.children.length > 0 && (
                <div className="divide-y divide-line/60 bg-white">
                  {org.children.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-4.5 pl-8 md:pl-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:bg-stone-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-cyan-100 border border-cyan-200 flex items-center justify-center font-bold text-cyan-800 text-xs font-mono">
                          {sub.code}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-ink">
                              {sub.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[11px] font-mono py-0"
                            >
                              Prefix: {sub.code}
                            </Badge>
                          </div>
                          {/* Sub Org Admins inline */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {sub.admins && sub.admins.length > 0 ? (
                              sub.admins.map((adm) => (
                                <span
                                  key={adm.id}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                                    isTenureActive(adm.termStart, adm.termEnd)
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : "bg-red-50 text-red-700 border-red-200"
                                  }`}
                                >
                                  {adm.name} ({adm.email})
                                  <button
                                    type="button"
                                    onClick={() => setRevokingAdmin(adm)}
                                    className="text-red-500 hover:text-red-700 ml-0.5"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-ink-muted italic">
                                Belum ada panitia di-assign
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end md:self-auto">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onPress={() => {
                            setPreselectedOrgId(sub.id);
                            setAdminDialogOpen(true);
                          }}
                        >
                          <UserPlus className="size-3 mr-1" />
                          Admin
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onPress={() => {
                            setEditingOrg(sub);
                            setParentOrgForSub(org.id);
                            setOrgDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onPress={() => {
                            const electionCount = sub._count?.elections ?? 0;
                            const voterCount =
                              sub.elections?.reduce(
                                (sum, e) => sum + (e._count?.voters ?? 0),
                                0,
                              ) ?? 0;
                            setDeletingOrg({
                              ...sub,
                              electionCount,
                              voterCount,
                              childCount: 0,
                            });
                          }}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Org Form Dialog */}
      <FormDialog
        open={orgDialogOpen}
        onOpenChange={setOrgDialogOpen}
        title={
          editingOrg
            ? "Edit Organisasi"
            : parentOrgForSub
              ? "Tambah Sub-Organisasi"
              : "Tambah Organisasi Induk"
        }
        description="Konfigurasi nama, slug URL, dan kode prefix token unik."
        isSubmitting={isOrgPending}
      >
        <form action={orgFormAction} className="space-y-4">
          {editingOrg && (
            <input type="hidden" name="id" value={editingOrg.id} />
          )}
          <input
            type="hidden"
            name="type"
            value={
              parentOrgForSub || editingOrg?.parentId
                ? "SUB_ORGANIZATION"
                : "MAIN_ORGANIZATION"
            }
          />
          {parentOrgForSub && (
            <input type="hidden" name="parentId" value={parentOrgForSub} />
          )}

          <div>
            <Label htmlFor="name">Nama Organisasi</Label>
            <Input
              id="name"
              name="name"
              placeholder="Contoh: PUSTEL, METIC, OSIS"
              defaultValue={editingOrg?.name ?? ""}
              required
            />
            {orgFormState?.errors?.name && (
              <p className="text-xs text-red-600 mt-1">
                {orgFormState.errors.name[0]}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Kode Prefix Token</Label>
              <Input
                id="code"
                name="code"
                placeholder="PST, MTC, OSS"
                defaultValue={editingOrg?.code ?? ""}
                className="font-mono uppercase"
                required
              />
              <p className="text-[11px] text-ink-muted mt-1">
                Contoh: <span className="font-mono">PST-K7X9-2P4W</span>
              </p>
              {orgFormState?.errors?.code && (
                <p className="text-xs text-red-600 mt-1">
                  {orgFormState.errors.code[0]}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="slug">Slug URL</Label>
              <Input
                id="slug"
                name="slug"
                placeholder="pustel, metic, osis"
                defaultValue={editingOrg?.slug ?? ""}
                className="font-mono lowercase"
                required
              />
              {orgFormState?.errors?.slug && (
                <p className="text-xs text-red-600 mt-1">
                  {orgFormState.errors.slug[0]}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Deskripsi (Opsional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Keterangan singkat tentang organisasi..."
              defaultValue={editingOrg?.description ?? ""}
            />
          </div>

          <DialogFooter>
            <DialogClose isDisabled={isOrgPending}>Batal</DialogClose>
            <Button type="submit" variant="default" isDisabled={isOrgPending}>
              {isOrgPending ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              {editingOrg ? "Simpan Perubahan" : "Buat Organisasi"}
            </Button>
          </DialogFooter>
        </form>
      </FormDialog>

      {/* Admin Provisioning Dialog */}
      <FormDialog
        open={adminDialogOpen}
        onOpenChange={setAdminDialogOpen}
        title="Daftarkan Administrator Organisasi"
        description="Whitelist email Google panitia dan tentukan masa aktif jabatannya."
        isSubmitting={isAdminPending}
      >
        <form action={adminFormAction} className="space-y-4">
          <div>
            <Label htmlFor="admin_name">Nama Penanggung Jawab</Label>
            <Input
              id="admin_name"
              name="name"
              placeholder="Contoh: Muhammad Raihan (Ketua)"
              required
            />
          </div>

          <div>
            <Label htmlFor="admin_email">Email Akun Google Resmi</Label>
            <Input
              id="admin_email"
              name="email"
              type="email"
              placeholder="panitia@smktelkom-mlg.sch.id"
              required
            />
            <p className="text-[11px] text-ink-muted mt-1">
              Panitia akan login menggunakan Google dengan email ini.
            </p>
            {adminFormState?.errors?.email && (
              <p className="text-xs text-red-600 mt-1">
                {adminFormState.errors.email[0]}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="organizationId">Pilih Organisasi</Label>
            <Select
              name="organizationId"
              defaultValue={preselectedOrgId ?? allOrgOptions[0]?.id}
            >
              <SelectTrigger id="organizationId">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allOrgOptions.map((opt) => (
                  <SelectItem key={opt.id} id={opt.id} textValue={opt.name}>
                    {opt.name} ({opt.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {adminFormState?.errors?.organizationId && (
              <p className="text-xs text-red-600 mt-1">
                {adminFormState.errors.organizationId[0]}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="termStart">Mulai Jabatan</Label>
              <Input id="termStart" name="termStart" type="date" />
            </div>
            <div>
              <Label htmlFor="termEnd">Selesai Jabatan (Auto-Lock)</Label>
              <Input id="termEnd" name="termEnd" type="date" />
            </div>
          </div>
          {adminFormState?.errors?.termEnd && (
            <p className="text-xs text-red-600">
              {adminFormState.errors.termEnd[0]}
            </p>
          )}

          <DialogFooter>
            <DialogClose isDisabled={isAdminPending}>Batal</DialogClose>
            <Button type="submit" variant="default" isDisabled={isAdminPending}>
              {isAdminPending ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              Daftarkan Panitia
            </Button>
          </DialogFooter>
        </form>
      </FormDialog>

      {/* Delete Org Confirmation */}
      <AlertDialog
        isOpen={deletingOrg !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeletingOrg(null);
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Organisasi?</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus organisasi{" "}
            <span className="font-semibold text-ink">{deletingOrg?.name}</span>?
          </AlertDialogDescription>
        </AlertDialogHeader>

        {((deletingOrg?.electionCount ?? 0) > 0 ||
          (deletingOrg?.voterCount ?? 0) > 0 ||
          (deletingOrg?.childCount ?? 0) > 0) && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1.5 my-2">
            <p className="font-semibold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
              <span className="inline-block size-2 rounded-full bg-amber-500 animate-pulse" />
              Peringatan: Data Terkait Akan Terhapus
            </p>
            <p className="leading-relaxed">
              Organisasi ini memiliki{" "}
              <strong>{deletingOrg?.electionCount ?? 0} sesi pemilihan</strong>,{" "}
              <strong>{deletingOrg?.voterCount ?? 0} data pemilih</strong>
              {(deletingOrg?.childCount ?? 0) > 0
                ? `, dan ${deletingOrg?.childCount} sub-organisasi`
                : ""}
              .
            </p>
            <p className="text-[11px] text-amber-700/90 dark:text-amber-400">
              Menghapus organisasi ini akan menghapus seluruh data sesi
              pemilihan, kandidat, dan pemilih terkait secara permanen (selama
              belum ada suara yang dicoblos).
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel isDisabled={isDeleting}>Batal</AlertDialogCancel>
          <Button
            variant="destructive"
            onPress={handleDeleteOrg}
            isDisabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : null}
            {(deletingOrg?.electionCount ?? 0) > 0
              ? "Ya, Hapus Semua Data"
              : "Hapus Organisasi"}
          </Button>
        </AlertDialogFooter>
      </AlertDialog>

      {/* Revoke Admin Confirmation */}
      <AlertDialog
        isOpen={revokingAdmin !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setRevokingAdmin(null);
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Cabut Akses Admin?</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin mencabut hak akses administrator untuk{" "}
            <span className="font-semibold text-ink">
              {revokingAdmin?.email}
            </span>
            ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel isDisabled={isDeleting}>Batal</AlertDialogCancel>
          <Button
            variant="destructive"
            onPress={handleRevokeAdmin}
            isDisabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : null}
            Cabut Akses
          </Button>
        </AlertDialogFooter>
      </AlertDialog>
    </div>
  );
}
