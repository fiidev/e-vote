import { AlertCircle } from "lucide-react";
import { voteErrorMessage } from "@/features/voting/error-messages";
import type { VoteErrorCode } from "@/types/error";

export function ErrorAlert({ code }: { code: VoteErrorCode }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 text-red-700 border border-red-200">
      <AlertCircle className="w-5 h-5 shrink-0" />
      <p className="text-sm font-medium">{voteErrorMessage(code)}</p>
    </div>
  );
}
