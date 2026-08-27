import { redirect } from "next/navigation";
import { LinkButton } from "@/components/ui/button";
import { VoteBoard } from "@/features/voting/components/vote-board";
import { ErrorAlert } from "@/features/voting/error-alert";
import { isVoteError } from "@/features/voting/errors";
import { getActiveElection } from "@/features/voting/service";
import { getVoteSession } from "@/features/voting/session";

export default async function VotePage() {
  const session = await getVoteSession();
  if (!session) redirect("/verify");

  try {
    const election = await getActiveElection(session);
    return (
      <VoteBoard
        candidates={election.candidates}
        organizationName={election.organization?.name}
        electionTitle={election.title}
      />
    );
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
