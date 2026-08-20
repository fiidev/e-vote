import { isVoteError } from "@/lib/vote/errors";
import { getActiveElection } from "@/lib/vote/service";
import { getVoteSession } from "@/lib/vote/session";
import { redirect } from "next/navigation";
import { VoteClient } from "@/components/public/vote-client";
import { ErrorAlert } from "@/components/public/error-alert";
import { LinkButton } from "@/components/ui/button";

/** Langkah 2 — /vote. Tanpa session → kembali ke /verify. */
export default async function VotePage() {
  const session = await getVoteSession();
  if (!session) redirect("/verify");

  try {
    const election = await getActiveElection();
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 pb-16">
        <VoteClient candidates={election.candidates} />
      </main>
    );
  } catch (error) {
    if (isVoteError(error)) {
      return (
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 pb-16 text-center">
          <ErrorAlert code={error.code} />
          <LinkButton href="/verify" variant="outline">
            Kembali
          </LinkButton>
        </main>
      );
    }
    throw error;
  }
}