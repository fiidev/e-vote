import { describe, expect, it } from "vitest";
import { castVoteSchema, verifyTokenSchema } from "./schemas";

describe("verifyTokenSchema", () => {
  it("menerima format [PREFIX]-[BLOCK1]-[BLOCK2] dan menormalkan ke uppercase", () => {
    const result = verifyTokenSchema.safeParse({ token: "MTC-K7X9-2P4W" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.token).toBe("MTC-K7X9-2P4W");
  });

  it("menerima token tanpa strip dan otomatis memformat", () => {
    const result = verifyTokenSchema.safeParse({ token: "mtck7x92p4w" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.token).toBe("MTC-K7X9-2P4W");
  });

  it("menerima token dengan spasi dan menormalkan", () => {
    const result = verifyTokenSchema.safeParse({ token: "MTC K7X9 2P4W" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.token).toBe("MTC-K7X9-2P4W");
  });

  it("menolak token terlalu pendek", () => {
    const result = verifyTokenSchema.safeParse({ token: "MTC" });
    expect(result.success).toBe(false);
  });

  it("menolak input non-string (null dari FormData)", () => {
    const result = verifyTokenSchema.safeParse({ token: null });
    expect(result.success).toBe(false);
  });
});

describe("castVoteSchema", () => {
  it("menerima UUID valid", () => {
    const result = castVoteSchema.safeParse({
      candidateId: "3f7b6e2a-1c4d-4e5f-9a8b-0c1d2e3f4a5b",
    });
    expect(result.success).toBe(true);
  });

  it("menolak non-UUID", () => {
    const result = castVoteSchema.safeParse({ candidateId: "abc" });
    expect(result.success).toBe(false);
  });

  it("menolak input non-string", () => {
    const result = castVoteSchema.safeParse({ candidateId: null });
    expect(result.success).toBe(false);
  });
});
