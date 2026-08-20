import { describe, expect, it } from "vitest";
import { castVoteSchema, verifyTokenSchema } from "./schemas";

describe("verifyTokenSchema", () => {
  it("menerima 8 digit murni dan menormalkan", () => {
    const result = verifyTokenSchema.safeParse({ token: "48219037" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.token).toBe("48219037");
  });

  it("menerima format XXXX-XXXX dan menormalkan", () => {
    const result = verifyTokenSchema.safeParse({ token: "4821-9037" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.token).toBe("48219037");
  });

  it("menerima token dengan spasi", () => {
    const result = verifyTokenSchema.safeParse({ token: "4821 9037" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.token).toBe("48219037");
  });

  it("menolak kurang dari 8 digit", () => {
    const result = verifyTokenSchema.safeParse({ token: "4821903" });
    expect(result.success).toBe(false);
  });

  it("menolak non-digit", () => {
    const result = verifyTokenSchema.safeParse({ token: "4821-abc7" });
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
