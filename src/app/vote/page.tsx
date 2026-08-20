import { redirect } from "next/navigation";
import { ErrorAlert } from "@/components/public/error-alert";
import { VoteClient } from "@/components/public/vote-client";
import { LinkButton } from "@/components/ui/button";
import { isVoteError } from "@/lib/vote/errors";
import { getActiveElection } from "@/lib/vote/service";
import { getVoteSession } from "@/lib/vote/session";

export default async function VotePage() {
  const session = await getVoteSession();
  if (!session) redirect("/verify");

  try {
    const election = await getActiveElection();
    return <VoteClient candidates={election.candidates} />;
  } catch (error) {
    if (isVoteError(error)) {
      return (
        <main className="flex min-h-dvh items-center justify-center bg-stone-100">
          <div className="flex flex-col items-center gap-4">
            <ErrorAlert code={error.code} />
            <LinkButton href="/verify" variant="outline">
              Kembali
            </LinkButton>
          </div>
        </main>
      );
    }
    throw error;
  }
}
