import { redirect } from "next/navigation";
import { VerifyForm } from "@/features/voting/components/verify-form";
import { getVoteSession } from "@/features/voting/session";

export default async function VerifyPage() {
  const session = await getVoteSession();
  if (session) redirect("/vote");

  return <VerifyForm />;
}
