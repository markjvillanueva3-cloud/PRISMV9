/**
 * hook-profile — behavioural tests against the gate logic.
 * Exercises every (profile × allowlist × disabled) combination that matters.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { shouldSkipHook, gateHook, getHookProfileState } from "./hook-profile.mjs";

const ENV_KEYS = ["PRISM_HOOK_PROFILE", "PRISM_DISABLED_HOOKS"];
const SAVED = {};

beforeEach(() => {
  for (const k of ENV_KEYS) SAVED[k] = process.env[k];
  for (const k of ENV_KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (SAVED[k] === undefined) delete process.env[k];
    else process.env[k] = SAVED[k];
  }
});

describe("shouldSkipHook — profile semantics", () => {
  it("default profile is standard — advisory hooks fire", () => {
    expect(shouldSkipHook("some-advisory-hook")).toBe(false);
  });

  it("default profile — allowlisted hooks fire", () => {
    expect(shouldSkipHook("code-completeness-gate")).toBe(false);
  });

  it("strict profile — advisory hook fires", () => {
    process.env.PRISM_HOOK_PROFILE = "strict";
    expect(shouldSkipHook("some-advisory-hook")).toBe(false);
  });

  it("minimal profile — allowlisted hook fires", () => {
    process.env.PRISM_HOOK_PROFILE = "minimal";
    expect(shouldSkipHook("code-completeness-gate")).toBe(false);
    expect(shouldSkipHook("duplication-hard-block")).toBe(false);
    expect(shouldSkipHook("test-legitimacy")).toBe(false);
  });

  it("minimal profile — non-allowlisted advisory hook is skipped", () => {
    process.env.PRISM_HOOK_PROFILE = "minimal";
    expect(shouldSkipHook("some-advisory-hook")).toBe(true);
    expect(shouldSkipHook("ollama-context-aggregator")).toBe(true);
  });

  it("invalid profile string falls back to standard (advisory hooks fire)", () => {
    process.env.PRISM_HOOK_PROFILE = "bogus-profile-name";
    expect(shouldSkipHook("some-advisory-hook")).toBe(false);
  });

  it("profile name is case-insensitive", () => {
    process.env.PRISM_HOOK_PROFILE = "MINIMAL";
    expect(shouldSkipHook("some-advisory-hook")).toBe(true);
    expect(shouldSkipHook("code-completeness-gate")).toBe(false);
  });
});

describe("shouldSkipHook — explicit disable list", () => {
  it("disabled hook is skipped under standard profile", () => {
    process.env.PRISM_DISABLED_HOOKS = "noisy-hint";
    expect(shouldSkipHook("noisy-hint")).toBe(true);
    expect(shouldSkipHook("other-hint")).toBe(false);
  });

  it("disabled hook is skipped under strict profile", () => {
    process.env.PRISM_HOOK_PROFILE = "strict";
    process.env.PRISM_DISABLED_HOOKS = "noisy-hint";
    expect(shouldSkipHook("noisy-hint")).toBe(true);
  });

  it("disable list overrides minimal-allowlist (explicit user choice wins)", () => {
    process.env.PRISM_HOOK_PROFILE = "minimal";
    process.env.PRISM_DISABLED_HOOKS = "code-completeness-gate";
    expect(shouldSkipHook("code-completeness-gate")).toBe(true);
  });

  it("multi-entry disable list with whitespace tolerated", () => {
    process.env.PRISM_DISABLED_HOOKS = " a , b ,  c";
    expect(shouldSkipHook("a")).toBe(true);
    expect(shouldSkipHook("b")).toBe(true);
    expect(shouldSkipHook("c")).toBe(true);
    expect(shouldSkipHook("d")).toBe(false);
  });

  it("empty hookName returns false (defensive)", () => {
    expect(shouldSkipHook("")).toBe(false);
  });

  it("non-string hookName returns false (defensive)", () => {
    expect(shouldSkipHook(null)).toBe(false);
    expect(shouldSkipHook(undefined)).toBe(false);
    expect(shouldSkipHook(42)).toBe(false);
  });
});

describe("getHookProfileState — diagnostic surface", () => {
  it("returns standard profile with empty disabled list by default", () => {
    const state = getHookProfileState();
    expect(state.profile).toBe("standard");
    expect(state.disabled).toEqual([]);
    expect(state.allowlist.length).toBeGreaterThanOrEqual(10);
  });

  it("reflects active profile env var", () => {
    process.env.PRISM_HOOK_PROFILE = "minimal";
    expect(getHookProfileState().profile).toBe("minimal");
  });

  it("reflects disabled list env var", () => {
    process.env.PRISM_DISABLED_HOOKS = "alpha,beta";
    expect(getHookProfileState().disabled).toEqual(["alpha", "beta"]);
  });

  it("invalid profile reported as standard (post-validation)", () => {
    process.env.PRISM_HOOK_PROFILE = "garbage";
    expect(getHookProfileState().profile).toBe("standard");
  });
});

describe("gateHook — convenience wrapper", () => {
  it("returns false when hook should run (no early exit)", () => {
    expect(gateHook("code-completeness-gate")).toBe(false);
  });

  it("returns true and emits continue:true when skipped", () => {
    process.env.PRISM_DISABLED_HOOKS = "noisy";
    const logs = [];
    const orig = console.log;
    console.log = (msg) => logs.push(msg);
    try {
      const skipped = gateHook("noisy");
      expect(skipped).toBe(true);
      expect(logs).toEqual(['{"continue":true}']);
    } finally {
      console.log = orig;
    }
  });
});
