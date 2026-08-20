import { voteErrorMessage } from "@/components/public/error-messages";
import { describe, expect, it } from "vitest";

describe("voteErrorMessage", () => {
  it("memetakan semua VoteErrorCode ke pesan non-kosong", () => {
    const codes = [
      "TOKEN_INVALID",
      "TOKEN_ALREADY_USED",
      "TOKEN_LOCKED",
      "ELECTION_NOT_FOUND",
      "ELECTION_NOT_STARTED",
      "ELECTION_ENDED",
      "ALREADY_VOTED",
      "CANDIDATE_NOT_FOUND",
      "NO_VOTE_SESSION",
      "RATE_LIMITED",
      "VOTER_NOT_ELIGIBLE",
      "INVALID_INPUT",
      "EMAIL_SEND_FAILED",
    ] as const;

    for (const code of codes) {
      expect(voteErrorMessage(code).length).toBeGreaterThan(0);
    }
  });

  it("pesan berbahasa Indonesia", () => {
    expect(voteErrorMessage("TOKEN_INVALID")).toContain("Token");
    expect(voteErrorMessage("ELECTION_ENDED")).toContain("berakhir");
  });
});