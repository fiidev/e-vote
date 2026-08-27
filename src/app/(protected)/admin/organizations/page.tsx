import { redirect } from "next/navigation";
import { OrganizationsClient } from "@/features/organizations/components/organizations-client";
import {
  listAllOrganizationsSimple,
  listOrganizationsHierarchy,
} from "@/features/organizations/service";
import { getAuthUser } from "@/lib/auth";

export default async function AdminOrganizationsPage() {
  const user = await getAuthUser();

  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/unauthorized");
  }

  const [organizations, allOrgOptions] = await Promise.all([
    listOrganizationsHierarchy(),
    listAllOrganizationsSimple(),
  ]);

  return (
    <OrganizationsClient
      organizations={organizations}
      allOrgOptions={allOrgOptions}
    />
  );
}
