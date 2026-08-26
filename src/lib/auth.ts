import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import type { AdminRole } from "@/generated/prisma/enums";
import db from "@/lib/db";

const SUPER_ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isSuperAdminEmail(email: string): boolean {
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

export const auth = betterAuth({
  secret:
    process.env.BETTER_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV === "production"
      ? undefined
      : "dev-better-auth-secret-key-32-chars-long-e-vote"),
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  user: {
    modelName: "AdminUser",
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "ORG_ADMIN",
        required: false,
      },
      organizationId: {
        type: "string",
        required: false,
      },
      termStart: {
        type: "date",
        required: false,
      },
      termEnd: {
        type: "date",
        required: false,
      },
    },
  },
  session: {
    modelName: "AdminSession",
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Refresh every 1 day
  },
  account: {
    modelName: "AdminAccount",
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      requireLocalEmailVerified: false,
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const email = user.email.toLowerCase().trim();

          // 1. Super admin via environment variable
          if (isSuperAdminEmail(email)) {
            return {
              data: {
                ...user,
                role: "SUPER_ADMIN",
              },
            };
          }

          // 2. Cek apakah sudah di-preprovision oleh Super Admin
          const preprovisioned = await db.adminUser.findUnique({
            where: { email },
          });

          if (!preprovisioned) {
            throw new APIError("FORBIDDEN", {
              message:
                "Email ini belum didaftarkan sebagai administrator organisasi.",
            });
          }

          // Periksa masa jabatan jika ORG_ADMIN
          if (preprovisioned.role === "ORG_ADMIN") {
            const now = new Date();
            if (preprovisioned.termStart && now < preprovisioned.termStart) {
              throw new APIError("FORBIDDEN", {
                message: "Masa jabatan Anda belum dimulai.",
              });
            }
            if (preprovisioned.termEnd && now > preprovisioned.termEnd) {
              throw new APIError("FORBIDDEN", {
                message: "Masa jabatan Anda telah berakhir.",
              });
            }
          }

          return {
            data: {
              ...user,
              role: preprovisioned.role,
              organizationId: preprovisioned.organizationId,
              termStart: preprovisioned.termStart,
              termEnd: preprovisioned.termEnd,
            },
          };
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const user = await db.adminUser.findUnique({
            where: { id: session.userId },
            include: { organization: true },
          });

          if (!user) {
            throw new APIError("FORBIDDEN", {
              message: "Akun tidak ditemukan.",
            });
          }

          if (user.role === "SUPER_ADMIN" || isSuperAdminEmail(user.email)) {
            return { data: session };
          }

          // Validasi masa jabatan ORG_ADMIN
          const now = new Date();
          if (user.termStart && now < user.termStart) {
            throw new APIError("FORBIDDEN", {
              message: "Masa jabatan Anda belum dimulai.",
            });
          }
          if (user.termEnd && now > user.termEnd) {
            throw new APIError("FORBIDDEN", {
              message: "Masa jabatan Anda telah berakhir.",
            });
          }

          return { data: session };
        },
      },
    },
  },
  advanced: {
    database: {
      generateId: false,
      joins: true,
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: AdminRole;
  organizationId?: string | null;
  organizationName?: string | null;
  organizationSlug?: string | null;
  organizationCode?: string | null;
  termStart?: Date | null;
  termEnd?: Date | null;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) return null;

  const dbUser = await db.adminUser.findUnique({
    where: { id: session.user.id },
    include: { organization: true },
  });

  if (!dbUser) return null;

  // Auto upgrade jika ada di SUPER_ADMIN_EMAILS
  let role: AdminRole = dbUser.role;
  if (isSuperAdminEmail(dbUser.email)) {
    role = "SUPER_ADMIN";
  }

  // Tenure check untuk ORG_ADMIN
  if (role === "ORG_ADMIN") {
    const now = new Date();
    if (
      (dbUser.termStart && now < dbUser.termStart) ||
      (dbUser.termEnd && now > dbUser.termEnd)
    ) {
      return null; // Expired tenure treated as unauthenticated
    }
  }

  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    image: dbUser.image,
    role,
    organizationId: dbUser.organizationId,
    organizationName: dbUser.organization?.name,
    organizationSlug: dbUser.organization?.slug,
    organizationCode: dbUser.organization?.code,
    termStart: dbUser.termStart,
    termEnd: dbUser.termEnd,
  };
}
