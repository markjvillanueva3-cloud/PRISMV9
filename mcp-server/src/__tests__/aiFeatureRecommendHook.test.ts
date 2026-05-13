/**
 * ai-feature-recommend hook — U-AWARE04 re-enable tests.
 *
 * Verifies shouldHint() pure function fires on build/create/audit/forge
 * intents and stays silent on non-build conversation. The hook itself is
 * `.claude/hooks/ai-feature-recommend.mjs` (off the mcp-server tsconfig
 * path), so we import via absolute file URL with library-mode flag set
 * so the side-effecting stdin/stdout block is skipped.
 */
import { describe, it, expect } from "vitest";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

process.env.PRISM_AI_FEATURE_HINT_AS_LIB = "1";

const HOOK_URL = pathToFileURL(
  resolve("H:/prism/.claude/hooks/ai-feature-recommend.mjs"),
).href;

const mod = (await import(/* @vite-ignore */ HOOK_URL)) as {
  shouldHint: (message: string) => boolean;
};
const { shouldHint } = mod;

describe("shouldHint — input guards", () => {
  it("returns false for empty string", () => {
    expect(shouldHint("")).toBe(false);
  });

  it("returns false for null", () => {
    expect(shouldHint(null as unknown as string)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(shouldHint(undefined as unknown as string)).toBe(false);
  });

  it("returns false for non-string number", () => {
    expect(shouldHint(42 as unknown as string)).toBe(false);
  });
});

describe("shouldHint — build/create patterns", () => {
  it("matches 'build a new engine'", () => {
    expect(shouldHint("build a new engine")).toBe(true);
  });

  it("matches 'create an algorithm'", () => {
    expect(shouldHint("create an algorithm for tool life prediction")).toBe(true);
  });

  it("matches 'implement a new hook'", () => {
    expect(shouldHint("implement a new hook for build intent detection")).toBe(true);
  });

  it("matches 'new dispatcher'", () => {
    expect(shouldHint("we need a new dispatcher for the lathe domain")).toBe(true);
  });

  it("matches 'new action'", () => {
    expect(shouldHint("add a new action to prism_calc")).toBe(true);
  });

  it("matches 'add a feature' (build + feature)", () => {
    expect(shouldHint("add a new feature to support five-axis")).toBe(true);
  });
});

describe("shouldHint — audit/review patterns", () => {
  it("matches 'audit the system architecture'", () => {
    expect(shouldHint("audit the system architecture")).toBe(true);
  });

  it("matches 'investigate engine regressions'", () => {
    expect(shouldHint("investigate engine regressions")).toBe(true);
  });

  it("matches 'review the code'", () => {
    expect(shouldHint("review the code for safety violations")).toBe(true);
  });

  it("matches 'find a capability for force prediction'", () => {
    expect(shouldHint("find a capability for force prediction")).toBe(true);
  });
});

describe("shouldHint — slash command triggers", () => {
  it("matches /forge", () => {
    expect(shouldHint("/forge-triple engine+skill+hook")).toBe(true);
  });

  it("matches /dedup", () => {
    expect(shouldHint("/dedup before creating")).toBe(true);
  });
});

describe("shouldHint — negative cases (no false positives)", () => {
  it("returns false for casual conversation", () => {
    expect(shouldHint("what's for breakfast")).toBe(false);
  });

  it("returns false for 'engineering' (word-boundary defense)", () => {
    // "engineering" must not trip the "engine" keyword.
    expect(shouldHint("explore engineering principles for the new product")).toBe(false);
  });

  it("returns false for 'actionable' (word-boundary defense)", () => {
    // "actionable" must not trip the "action" keyword.
    expect(shouldHint("the report should be actionable")).toBe(false);
  });

  it("returns false for 'audit' without code/system/engine context", () => {
    // Audit verbs need a downstream noun — generic 'audit the books' does not fire.
    expect(shouldHint("audit the books quarterly")).toBe(false);
  });

  it("returns false for question-only prompts", () => {
    expect(shouldHint("what is PRISM?")).toBe(false);
  });

  it("returns false for prompts that mention 'engine' without verb", () => {
    expect(shouldHint("the engine is loud")).toBe(false);
  });
});
