import { voteErrorMessage } from "@/components/public/error-messages";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { VoteErrorCode } from "@/types/error";

export function ErrorAlert({ code }: { code: VoteErrorCode }) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle>Terjadi Masalah</AlertTitle>
      <AlertDescription>{voteErrorMessage(code)}</AlertDescription>
    </Alert>
  );
}
