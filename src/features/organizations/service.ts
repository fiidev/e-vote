import type {
  AdminProvisionInput,
  OrganizationCreateInput,
  OrganizationUpdateInput,
} from "@/features/organizations/schemas";
import db from "@/lib/db";

export async function listOrganizationsHierarchy() {
  return db.organization.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
    include: {
      children: {
        orderBy: { name: "asc" },
        include: {
          admins: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              termStart: true,
              termEnd: true,
            },
          },
          elections: {
            select: {
              election_id: true,
              _count: {
                select: { voters: true },
              },
            },
          },
          _count: {
            select: { elections: true, admins: true },
          },
        },
      },
      elections: {
        select: {
          election_id: true,
          _count: {
            select: { voters: true },
          },
        },
      },
      admins: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          termStart: true,
          termEnd: true,
        },
      },
      _count: {
        select: { elections: true, admins: true, children: true },
      },
    },
  });
}

export async function listAllOrganizationsSimple() {
  return db.organization.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      slug: true,
      type: true,
      parentId: true,
    },
  });
}

export async function getOrganization(id: string) {
  return db.organization.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, name: true, code: true } },
      children: true,
      admins: true,
      _count: { select: { elections: true } },
    },
  });
}

export async function createOrganization(data: OrganizationCreateInput) {
  const [existingSlug, existingCode] = await Promise.all([
    db.organization.findUnique({ where: { slug: data.slug } }),
    db.organization.findUnique({ where: { code: data.code } }),
  ]);

  if (existingSlug) throw new Error("ORG_SLUG_EXISTS");
  if (existingCode) throw new Error("ORG_CODE_EXISTS");

  return db.organization.create({
    data: {
      name: data.name,
      slug: data.slug,
      code: data.code,
      type: data.type,
      parentId: data.parentId ?? null,
      logoUrl: data.logoUrl ?? null,
      description: data.description ?? null,
    },
  });
}

export async function updateOrganization(data: OrganizationUpdateInput) {
  const { id, ...rest } = data;

  if (rest.slug || rest.code) {
    const [existingSlug, existingCode] = await Promise.all([
      rest.slug
        ? db.organization.findFirst({
            where: { slug: rest.slug, id: { not: id } },
          })
        : null,
      rest.code
        ? db.organization.findFirst({
            where: { code: rest.code, id: { not: id } },
          })
        : null,
    ]);

    if (existingSlug) throw new Error("ORG_SLUG_EXISTS");
    if (existingCode) throw new Error("ORG_CODE_EXISTS");
  }

  return db.organization.update({
    where: { id },
    data: {
      ...(rest.name !== undefined && { name: rest.name }),
      ...(rest.slug !== undefined && { slug: rest.slug }),
      ...(rest.code !== undefined && { code: rest.code }),
      ...(rest.type !== undefined && { type: rest.type }),
      ...(rest.logoUrl !== undefined && { logoUrl: rest.logoUrl ?? null }),
      ...(rest.description !== undefined && {
        description: rest.description ?? null,
      }),
      ...(rest.parentId !== undefined && {
        parentId: rest.parentId ?? null,
      }),
    },
  });
}

export async function deleteOrganization(id: string) {
  const org = await db.organization.findUnique({
    where: { id },
    include: {
      children: {
        include: {
          elections: {
            include: {
              _count: { select: { votes: true } },
            },
          },
        },
      },
      elections: {
        include: {
          _count: { select: { votes: true } },
        },
      },
    },
  });

  if (!org) throw new Error("ORG_NOT_FOUND");

  // Periksa apakah ada suara sah yang sudah masuk
  const allElections = [
    ...org.elections,
    ...org.children.flatMap((c) => c.elections),
  ];
  const hasCastVotes = allElections.some((e) => e._count.votes > 0);

  if (hasCastVotes) {
    throw new Error("ORG_HAS_CAST_VOTES");
  }

  const allElectionIds = allElections.map((e) => e.election_id);
  const childOrgIds = org.children.map((c) => c.id);

  // Jalankan atomic cascade delete dalam transaksi
  await db.$transaction(
    async (tx) => {
      if (allElectionIds.length > 0) {
        // 1. Hapus token pemilih
        await tx.voteToken.deleteMany({
          where: { election_id: { in: allElectionIds } },
        });

        // 2. Hapus data pemilih (DPT)
        await tx.voter.deleteMany({
          where: { election_id: { in: allElectionIds } },
        });

        // 3. Hapus kandidat
        await tx.candidate.deleteMany({
          where: { election_id: { in: allElectionIds } },
        });

        // 4. Hapus sesi pemilihan
        await tx.election.deleteMany({
          where: { election_id: { in: allElectionIds } },
        });
      }

      // 5. Lepas relasi panitia / admin organisasi
      await tx.adminUser.updateMany({
        where: { organizationId: { in: [id, ...childOrgIds] } },
        data: { organizationId: null },
      });

      // 6. Hapus sub-organisasi jika ada
      if (childOrgIds.length > 0) {
        await tx.organization.deleteMany({
          where: { id: { in: childOrgIds } },
        });
      }

      // 7. Hapus organisasi utama
      await tx.organization.delete({
        where: { id },
      });
    },
    { timeout: 60000 },
  );
}

export async function listOrgAdmins(orgId?: string) {
  return db.adminUser.findMany({
    where: orgId ? { organizationId: orgId } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      organization: { select: { id: true, name: true, code: true } },
    },
  });
}

export async function provisionAdminUser(data: AdminProvisionInput) {
  const existing = await db.adminUser.findUnique({
    where: { email: data.email },
  });

  const termStart = data.termStart ? new Date(data.termStart) : null;
  const termEnd = data.termEnd ? new Date(data.termEnd) : null;

  if (existing) {
    return db.adminUser.update({
      where: { email: data.email },
      data: {
        name: data.name,
        role: data.role,
        organizationId:
          data.role === "SUPER_ADMIN" ? null : (data.organizationId ?? null),
        termStart,
        termEnd,
      },
    });
  }

  return db.adminUser.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      organizationId:
        data.role === "SUPER_ADMIN" ? null : (data.organizationId ?? null),
      termStart,
      termEnd,
      emailVerified: true,
    },
  });
}

export async function removeAdminUser(userId: string) {
  return db.adminUser.delete({ where: { id: userId } });
}
