import { Role } from "@/generated/prisma/enums";

export interface VoterRoleOption {
  id: Role;
  label: string;
}

export const VOTER_ROLE_OPTIONS: readonly VoterRoleOption[] = [
  { id: Role.SISWA, label: "SISWA (Peserta Didik)" },
  { id: Role.GUKAR, label: "GUKAR (Guru & Karyawan)" },
  { id: Role.UMUM, label: "UMUM (Alumni / Tamu)" },
] as const;

export const VOTER_ROLE_LABELS: Record<Role, string> = {
  [Role.SISWA]: "SISWA",
  [Role.GUKAR]: "GUKAR",
  [Role.UMUM]: "UMUM",
};

export const ADMIN_ROLE = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ORG_ADMIN: "ORG_ADMIN",
} as const;

export type AdminRole = (typeof ADMIN_ROLE)[keyof typeof ADMIN_ROLE];
