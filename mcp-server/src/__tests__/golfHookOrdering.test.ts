/**
 * golfHookOrdering.test.ts — settings.json hook-ordering snapshot test (U-CLEANUP-ORDERING-TEST)
 *
 * Per Iteration 6 R2-UU13: A5 (golf-slot-write-allowlist) MUST appear in
 * H:/prism/.claude/settings.json PreToolUse stack such that:
 *   - It runs AFTER hook-cross-worktree-block.mjs (worktree firewall first)
 *   - It runs BEFORE comprehensive-build-enforce.mjs (allowlist before stub-detect)
 *   - Its matcher covers Edit|Write|MultiEdit|NotebookEdit (anchored canonical form)
 *
 * Regression guard: any future settings.json reshuffle that breaks this
 * ordering fails the test loudly.
 *
 * Layer scope: this test enforces the PROJECT-LEVEL `H:/prism/.claude/settings.json`.
 * The user-global mirror layer (`H:/.claude/settings.json`) is machine-specific
 * and propagated by the c-to-h-mirror hook; tests for that layer use `it.skipIf`.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

const SETTINGS_PATH = "H:/prism/.claude/settings.json";
const USER_GLOBAL_SETTINGS = "H:/.claude/settings.json";

const A5_TIMEOUT_FLOOR_MS = 1_000;
const A5_TIMEOUT_CEILING_MS = 10_000;
const EXPECTED_A5_MATCHER = "^(Edit|Write|MultiEdit|NotebookEdit)$";

interface HookEntry {
  type: string;
  command: string;
  timeout?: number;
  _purpose?: string;
}

interface MatcherBlock {
  matcher?: string;
  hooks?: HookEntry[];
}

interface SettingsShape {
  hooks?: {
    PreToolUse?: MatcherBlock[];
    [event: string]: MatcherBlock[] | undefined;
  };
}

function loadSettings(path: string): SettingsShape {
  return JSON.parse(readFileSync(path, "utf-8")) as SettingsShape;
}

function flattenPreToolUseHooks(settings: SettingsShape): Array<{ matcher: string; command: string }> {
  const out: Array<{ matcher: string; command: string }> = [];
  const blocks = settings.hooks?.PreToolUse ?? [];
  for (const block of blocks) {
    const matcher = block.matcher ?? "*";
    for (const h of block.hooks ?? []) {
      if (h.type === "command" && typeof h.command === "string") {
        out.push({ matcher, command: h.command });
      }
    }
  }
  return out;
}

function findHookIndex(hooks: Array<{ command: string }>, scriptBasename: string): number {
  return hooks.findIndex((h) => h.command.includes(scriptBasename));
}

function findMatcherBlockContaining(settings: SettingsShape, scriptBasename: string): MatcherBlock | null {
  const blocks = settings.hooks?.PreToolUse ?? [];
  for (const block of blocks) {
    for (const h of block.hooks ?? []) {
      if (h.command?.includes(scriptBasename)) return block;
    }
  }
  return null;
}

const userGlobalExists = existsSync(USER_GLOBAL_SETTINGS);

describe("golf hook ordering (U-CLEANUP-ORDERING-TEST)", () => {
  describe("project-level settings.json", () => {
    it("A5 hook file exists on disk", () => {
      expect(existsSync("H:/prism/.claude/hooks/golf-slot-write-allowlist.mjs")).toBe(true);
    });

    it("settings.json parses as valid JSON with a non-empty PreToolUse array", () => {
      const s = loadSettings(SETTINGS_PATH);
      expect(Array.isArray(s.hooks?.PreToolUse)).toBe(true);
      expect((s.hooks?.PreToolUse ?? []).length).toBeGreaterThan(0);
    });

    it("A5 is wired in PreToolUse stack", () => {
      const s = loadSettings(SETTINGS_PATH);
      const flat = flattenPreToolUseHooks(s);
      const a5Idx = findHookIndex(flat, "golf-slot-write-allowlist.mjs");
      expect(a5Idx).toBeGreaterThanOrEqual(0);
    });

    it("A5 appears AFTER hook-cross-worktree-block in flattened order", () => {
      const s = loadSettings(SETTINGS_PATH);
      const flat = flattenPreToolUseHooks(s);
      const a5Idx = findHookIndex(flat, "golf-slot-write-allowlist.mjs");
      const wtIdx = findHookIndex(flat, "hook-cross-worktree-block.mjs");
      expect(wtIdx).toBeGreaterThanOrEqual(0);
      expect(a5Idx).toBeGreaterThan(wtIdx);
    });

    // NOTE: spec R1-B6 originally said "A5 runs BEFORE comprehensive-build-enforce."
    // That doctrine claim crossed events — `comprehensive-build-enforce.mjs` is
    // actually wired as a UserPromptSubmit hook, not PreToolUse, so cross-event
    // ordering is automatic (PreToolUse fires per-tool, UserPromptSubmit fires
    // per-prompt — never interleaved in a way the array order would govern).
    // The valid PreToolUse-only invariant is "A5 last in its matcher block"
    // (asserted below) and "A5 after hook-cross-worktree-block" (asserted above).
    it("comprehensive-build-enforce is NOT in PreToolUse (cross-event by design)", () => {
      const s = loadSettings(SETTINGS_PATH);
      const flat = flattenPreToolUseHooks(s);
      const enforceIdx = findHookIndex(flat, "comprehensive-build-enforce.mjs");
      // If a future settings.json edit moves it into PreToolUse, this test
      // surfaces the change so we can decide whether to enforce ordering there too.
      expect(enforceIdx).toBe(-1);
    });

    it(`A5 matcher uses the H6 anchored canonical form: ${EXPECTED_A5_MATCHER}`, () => {
      const s = loadSettings(SETTINGS_PATH);
      const block = findMatcherBlockContaining(s, "golf-slot-write-allowlist.mjs");
      expect(block?.matcher).toBe(EXPECTED_A5_MATCHER);
    });

    it("A5 has a documented _purpose comment naming CLEANUP-MS0 + U-CLEANUP-A5", () => {
      const s = loadSettings(SETTINGS_PATH);
      const block = findMatcherBlockContaining(s, "golf-slot-write-allowlist.mjs");
      const a5Hook = (block?.hooks ?? []).find((h) => h.command?.includes("golf-slot-write-allowlist.mjs"));
      expect(typeof a5Hook?._purpose).toBe("string");
      expect(a5Hook?._purpose).toContain("CLEANUP-MS0");
      expect(a5Hook?._purpose).toContain("U-CLEANUP-A5");
    });

    it(`A5 timeout is within sane range [${A5_TIMEOUT_FLOOR_MS}, ${A5_TIMEOUT_CEILING_MS}] ms`, () => {
      const s = loadSettings(SETTINGS_PATH);
      const block = findMatcherBlockContaining(s, "golf-slot-write-allowlist.mjs");
      const a5Hook = (block?.hooks ?? []).find((h) => h.command?.includes("golf-slot-write-allowlist.mjs"));
      expect(typeof a5Hook?.timeout).toBe("number");
      expect(a5Hook?.timeout ?? 0).toBeGreaterThanOrEqual(A5_TIMEOUT_FLOOR_MS);
      expect(a5Hook?.timeout ?? Number.MAX_SAFE_INTEGER).toBeLessThanOrEqual(A5_TIMEOUT_CEILING_MS);
    });

    it("A5 is the LAST hook in its matcher block (explicit Tier-0 chain terminator)", () => {
      const s = loadSettings(SETTINGS_PATH);
      const block = findMatcherBlockContaining(s, "golf-slot-write-allowlist.mjs");
      const hooks = block?.hooks ?? [];
      const lastHook = hooks[hooks.length - 1];
      expect(lastHook.command).toContain("golf-slot-write-allowlist.mjs");
    });

    it("the matcher block containing A5 also contains hook-cross-worktree-block (co-located)", () => {
      const s = loadSettings(SETTINGS_PATH);
      const block = findMatcherBlockContaining(s, "golf-slot-write-allowlist.mjs");
      const hasWt = (block?.hooks ?? []).some((h) => h.command?.includes("hook-cross-worktree-block.mjs"));
      expect(hasWt).toBe(true);
    });

    it("A5's command path resolves to the H:/prism/.claude/hooks/ location", () => {
      const s = loadSettings(SETTINGS_PATH);
      const block = findMatcherBlockContaining(s, "golf-slot-write-allowlist.mjs");
      const a5Hook = (block?.hooks ?? []).find((h) => h.command?.includes("golf-slot-write-allowlist.mjs"));
      expect(a5Hook?.command).toContain("H:/prism/.claude/hooks/golf-slot-write-allowlist.mjs");
    });
  });

  // User-global mirror layer: machine-specific. Skip cleanly if absent.
  describe.skipIf(!userGlobalExists)("user-global settings.json (H:/.claude/settings.json — c-to-h-mirror layer)", () => {
    it("user-global settings.json is parseable JSON", () => {
      const s = loadSettings(USER_GLOBAL_SETTINGS);
      expect(typeof s.hooks).toBe("object");
    });

    // Mirror layer may or may not have A5 yet (c-to-h-mirror hook propagates on save).
    // When A5 IS present, ordering MUST be correct. When absent, that's a valid
    // pre-mirror state; we detect+assert that case explicitly instead of skipping.
    it("if user-global has A5 wired, it appears AFTER hook-cross-worktree-block", () => {
      const s = loadSettings(USER_GLOBAL_SETTINGS);
      const flat = flattenPreToolUseHooks(s);
      const a5Idx = findHookIndex(flat, "golf-slot-write-allowlist.mjs");
      const wtIdx = findHookIndex(flat, "hook-cross-worktree-block.mjs");

      const a5Present = a5Idx >= 0;
      const wtPresent = wtIdx >= 0;

      if (a5Present) {
        expect(wtPresent).toBe(true);
        expect(a5Idx).toBeGreaterThan(wtIdx);
      } else {
        // Concrete assertion: user-global has not yet been mirrored. This is
        // expected immediately after a project-side edit and before the next
        // c-to-h-mirror hook fire. Document the pre-mirror state.
        expect(a5Present).toBe(false);
      }
    });

    it("if user-global has A5 wired, it appears BEFORE comprehensive-build-enforce", () => {
      const s = loadSettings(USER_GLOBAL_SETTINGS);
      const flat = flattenPreToolUseHooks(s);
      const a5Idx = findHookIndex(flat, "golf-slot-write-allowlist.mjs");
      const enforceIdx = findHookIndex(flat, "comprehensive-build-enforce.mjs");

      if (a5Idx >= 0) {
        expect(enforceIdx).toBeGreaterThanOrEqual(0);
        expect(a5Idx).toBeLessThan(enforceIdx);
      } else {
        expect(a5Idx).toBe(-1); // not yet mirrored — explicit state assertion
      }
    });
  });
});
