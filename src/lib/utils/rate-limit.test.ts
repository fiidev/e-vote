import { beforeEach, describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  let limiter: ReturnType<typeof createRateLimiter>;

  beforeEach(() => {
    limiter = createRateLimiter();
  });

  describe("per-token lock", () => {
    it("token tidak terkunci pada awalnya", () => {
      expect(limiter.isTokenLocked("48219037")).toBe(false);
    });

    it("token terkunci setelah 5 kegagalan", () => {
      for (let i = 0; i < 5; i++) limiter.recordTokenFailure("48219037");
      expect(limiter.isTokenLocked("48219037")).toBe(true);
    });

    it("token lain tidak terpengaruh", () => {
      for (let i = 0; i < 5; i++) limiter.recordTokenFailure("48219037");
      expect(limiter.isTokenLocked("11112222")).toBe(false);
    });

    it("resetTokenAttempts membuka kunci token", () => {
      for (let i = 0; i < 5; i++) limiter.recordTokenFailure("48219037");
      limiter.resetTokenAttempts("48219037");
      expect(limiter.isTokenLocked("48219037")).toBe(false);
    });
  });

  describe("global throttle", () => {
    it("tidak throttle pada awalnya", () => {
      expect(limiter.isGloballyThrottled()).toBe(false);
    });

    it("throttle setelah 50 kegagalan global", () => {
      for (let i = 0; i < 50; i++) limiter.recordGlobalFailure();
      expect(limiter.isGloballyThrottled()).toBe(true);
    });

    it("reset() membersihkan throttle", () => {
      for (let i = 0; i < 50; i++) limiter.recordGlobalFailure();
      limiter.reset();
      expect(limiter.isGloballyThrottled()).toBe(false);
    });
  });
});
