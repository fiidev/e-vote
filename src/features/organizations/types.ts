import type { listOrganizationsHierarchy } from "@/features/organizations/service";
import type { AdminRole } from "@/generated/prisma/enums";

export type OrganizationRow = Awaited<
  ReturnType<typeof listOrganizationsHierarchy>
>[number];

export interface OrgAdminRow {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  organizationId?: string | null;
  termStart?: Date | null;
  termEnd?: Date | null;
  createdAt?: Date;
  organization?: {
    id: string;
    name: string;
    code: string;
  } | null;
}
