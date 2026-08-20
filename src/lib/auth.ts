import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import db from "@/lib/db";

// Whitelist email yang boleh sign in
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  user: {
    modelName: "AdminUser",
  },
  session: {
    modelName: "AdminSession",
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Refresh every 1 day
  },
  account: {
    modelName: "AdminAccount",
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Block sign-up kalau email bukan admin yang terdaftar
          if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
            throw new APIError("FORBIDDEN", {
              message: "Email ini tidak memiliki akses.",
            });
          }
          return { data: user };
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
export type User = Session["user"];

export async function getAuthUser(): Promise<User | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user ?? null;
}
