import { getVoteSession } from "@/lib/vote/session";
import { redirect } from "next/navigation";
import { VerifyClient } from "@/components/public/verify-client";

/** Langkah 1 — /verify. Session aktif → langsung lanjut ke /vote. */
export default async function VerifyPage() {
  const session = await getVoteSession();
  if (session) redirect("/vote");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-16">
      <VerifyClient />
    </main>
  );
}