import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { voteErrorMessage } from "@/components/public/error-messages";
import type { VoteErrorCode } from "@/types/error";

/** Alert error voting — pesan diambil dari error contract terpusat. */
export function ErrorAlert({ code }: { code: VoteErrorCode }) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle>Terjadi Masalah</AlertTitle>
      <AlertDescription>{voteErrorMessage(code)}</AlertDescription>
    </Alert>
  );
}