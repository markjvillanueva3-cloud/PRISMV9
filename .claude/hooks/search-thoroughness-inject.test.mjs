// tier: T2
// Tests for search-thoroughness-inject.mjs (advisory UserPromptSubmit hook).
// Behavior-focused: trigger CLASSIFICATION accuracy (the SUT is a text classifier
// + a fail-soft script), not presence stubs. Run: npx vitest run search-thoroughness-inject.test.mjs
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import { shouldFire, buildContext } from "./search-thoroughness-inject.mjs";

const HOOK = path.join(path.dirname(fileURLToPath(import.meta.url)), "search-thoroughness-inject.mjs");

describe("shouldFire — classification accuracy", () => {
  // The classifier's whole job: TRUE on genuine search/inventory intent,
  // FALSE on ordinary work prompts. We assert the violating SET is empty so a
  // failure names exactly which prompt was misclassified.
  it("classifies EVERY genuine search/inventory request as fire (zero false negatives)", () => {
    const positives = [
      "check the resources folder for tooling catalogs",
      "check the original monolith build and the entire H drive",
      "how many materials do we have",
      "do we have all the tool holder brands",
      "find all the post processors in the repo",
      "list all controllers in the database",
      "sweep the codebase for unwired engines",
      "search the archive for old material data",
      "double check database completeness",
      "are we missing any vendors",
      "inventory the catalog directory",
      "what's inside the resources directory",
    ];
    const misclassified = positives.filter((p) => !shouldFire(p));
    expect(misclassified).toEqual([]);
  });

  it("classifies EVERY ordinary work prompt as silent (zero false positives)", () => {
    const negatives = [
      "build it and ship the hook",
      "we have a rule to never delete only deactivate",
      "fix the bug in the dispatcher",
      "thanks, that looks good",
      "commit the changes with a foxtrot prefix",
      "add a test for the milling force engine",
      "the database connection is slow, optimize it",
      "check that the tests pass",
      "explain how the Kienzle formula works",
    ];
    const falsePositives = negatives.filter((p) => shouldFire(p));
    expect(falsePositives).toEqual([]);
  });

  it("distinguishes the exact trap that motivated the rule: 'do we have ALL X' (search) vs 'we have a rule' (statement)", () => {
    expect(shouldFire("do we have all the holder brands in the system")).toBe(true);
    expect(shouldFire("we have a rule to never delete only deactivate")).toBe(false);
  });

  it("requires a scope-noun near the verb: 'check the drive' fires, bare 'check the tests' does not", () => {
    expect(shouldFire("check the H drive")).toBe(true);
    expect(shouldFire("check the tests pass before commit")).toBe(false);
  });
});

describe("shouldFire — non-string + boundary input (fail-safe classification)", () => {
  it("returns false for null/undefined/number (never throws on bad type)", () => {
    expect(shouldFire(null)).toBe(false);
    expect(shouldFire(undefined)).toBe(false);
    expect(shouldFire(42)).toBe(false);
  });
  it("returns false for empty string", () => { expect(shouldFire("")).toBe(false); });
  it("matches at the head of a 50KB input without hanging (bounded scan is ReDoS-safe)", () => {
    const t0 = Date.now();
    const fired = shouldFire("check the resources folder " + "x".repeat(50000));
    expect(fired).toBe(true);
    expect(Date.now() - t0).toBeLessThan(500); // bounded — no catastrophic backtracking
  });
  it("returns false for 50KB of non-matching noise", () => {
    expect(shouldFire("z".repeat(50000))).toBe(false);
  });
});

describe("buildContext — structural invariants of the injected reminder", () => {
  it("emits exactly the 3 numbered discipline steps in order", () => {
    // Match the numbered-step prefix + its UPPERCASE label, then trim — the
    // label is followed by " — …" so the greedy [A-Z ]+ pulls one trailing
    // space; that whitespace is irrelevant to the intent (3 ordered labels).
    const steps = (buildContext().match(/^\d\.\s+([A-Z][A-Z ]+)/gm) || []).map((s) => s.trim());
    expect(steps).toEqual([
      "1. QUERY FIRST",
      "2. SWEEP THE WHOLE TREE",
      "3. FAN OUT PARALLEL AGENTS",
    ]);
  });
  it("points at BOTH discovery surfaces (index + system-viz) so step 1 is actionable", () => {
    const ctx = buildContext();
    expect(ctx).toContain("master_index_query");
    expect(ctx).toContain("system-viz-query.mjs");
  });
  it("cites the canonical rule + the disable knob (auditability)", () => {
    const ctx = buildContext();
    expect(ctx).toContain("feedback_full_recursive_parallel_search");
    expect(ctx).toContain("PRISM_SEARCH_THOROUGHNESS_DISABLE=1");
  });
});

describe("script contract — end-to-end via real subprocess (stdin → stdout JSON)", () => {
  function run(input, env = {}) {
    const out = execFileSync(process.execPath, [HOOK], { input, encoding: "utf-8", env: { ...process.env, ...env } });
    return JSON.parse(out); // non-JSON output → throws → test fails (the contract IS valid JSON)
  }
  it("matching prompt injects additionalContext under the UserPromptSubmit event", () => {
    const r = run(JSON.stringify({ prompt: "check the resources folder" }));
    expect(r.continue).toBe(true);
    expect(r.hookSpecificOutput.hookEventName).toBe("UserPromptSubmit");
    expect(r.hookSpecificOutput.additionalContext).toContain("FAN OUT PARALLEL AGENTS");
  });
  it("non-matching prompt returns continue with NO injection", () => {
    const r = run(JSON.stringify({ prompt: "thanks" }));
    expect(r).toEqual({ continue: true });
  });
  it("disable knob suppresses injection even on a matching prompt", () => {
    const r = run(JSON.stringify({ prompt: "check the resources folder" }), { PRISM_SEARCH_THOROUGHNESS_DISABLE: "1" });
    expect(r).toEqual({ continue: true });
  });
  it("malformed stdin fails soft (continue:true, never blocks the user's prompt)", () => {
    expect(run("not json at all")).toEqual({ continue: true });
  });
  it("empty stdin fails soft", () => {
    expect(run("")).toEqual({ continue: true });
  });
});
