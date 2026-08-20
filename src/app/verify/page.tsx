import { redirect } from "next/navigation";
import { VerifyClient } from "@/components/public/verify-client";
import { getVoteSession } from "@/lib/vote/session";

export default async function VerifyPage() {
  const session = await getVoteSession();
  if (session) redirect("/vote");

  return <VerifyClient />;
}
