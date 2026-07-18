/**
 * golfHookOrdering.test.ts -- settings.json A5 doctrine-state snapshot test
 * (U-CLEANUP-ORDERING-TEST; doctrine-corrected 2026-07-01, U-GOLF-RED-TESTS)
 *
 * CURRENT DOCTRINE (CLAUDE.md section GOLF SLOT, doc-corrected 2026-06-09):
 * A5 (golf-slot-write-allowlist) is deliberately UNWIRED -- 0 settings.json
 * refs -- per the 2026-05-20 operator directive that made golf a normal work
 * slot. The hook FILE is preserved on disk (never-delete-only-disable).
 * This file asserts that state both ways:
 *   - the hook file must keep existing on disk;
 *   - A5 must NOT appear in the project PreToolUse stack (an accidental
 *     re-wire would silently restore write-confinement on golf).
 *
 * The original Iteration 6 R2-UU13 ordering invariants (A5 after
 * hook-cross-worktree-block, last in its matcher block, canonical matcher,
 * sane timeout, documented _purpose) -- plus the non-positional invariants
 * absorbed from the retired duplicate suite golf-hook-ordering.test.ts
 * (portable-node invocation, single-source registration) -- are PRESERVED in
 * a describe.skipIf block that auto-arms the day write-confinement is
 * deliberately reinstated -- delete the "deliberately UNWIRED" test then;
 * nothing else needs edits. The retired suite's live sanity checks
 * (write-family matcher, Stop-hooks truncation) run unconditionally below.
 *
 * Layer scope: this test enforces the PROJECT-LEVEL `H:/prism/.claude/settings.json`.
 * The user-global mirror layer (`H:/.claude/settings.json`) is machine-specific
 * and propagated by the c-to-h-mirror hook; tests for that layer use `describe.skipIf`.
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

// Is A5 currently wired in the project-level PreToolUse stack? Doctrine says
// NO (deliberately unwired since 2026-05-20) -- computed at load so the
// ordering-invariant suite below auto-arms the day a re-wire lands.
const a5WiredInProject = (() => {
  try {
    return findHookIndex(flattenPreToolUseHooks(loadSettings(SETTINGS_PATH)), "golf-slot-write-allowlist.mjs") >= 0;
  } catch {
    return false;
  }
})();

describe("golf hook ordering (U-CLEANUP-ORDERING-TEST)", () => {
  describe("project-level settings.json", () => {
    it("A5 hook file is preserved on disk (never-delete-only-disable)", () => {
      expect(existsSync("H:/prism/.claude/hooks/golf-slot-write-allowlist.mjs")).toBe(true);
    });

    it("settings.json parses as valid JSON with a non-empty PreToolUse array", () => {
      const s = loadSettings(SETTINGS_PATH);
      expect(Array.isArray(s.hooks?.PreToolUse)).toBe(true);
      expect((s.hooks?.PreToolUse ?? []).length).toBeGreaterThan(0);
    });

    it("A5 is deliberately UNWIRED from project PreToolUse (2026-05-20 operator directive)", () => {
      // Golf operates as a normal work slot: the A5 write-confinement hook is
      // preserved on disk but has 0 settings.json refs (CLAUDE.md section GOLF
      // SLOT, doc-corrected 2026-06-09). This is a two-way regression guard:
      // an ACCIDENTAL re-wire would silently restore write-confinement on golf
      // and must surface here. Reinstating write-confinement DELIBERATELY?
      // Delete this one test -- the ordering-invariant suite below auto-arms
      // via a5WiredInProject and takes over as the regression guard.
      const s = loadSettings(SETTINGS_PATH);
      const flat = flattenPreToolUseHooks(s);
      expect(findHookIndex(flat, "golf-slot-write-allowlist.mjs")).toBe(-1);
    });

    // NOTE: spec R1-B6 originally said "A5 runs BEFORE comprehensive-build-enforce."
    // That doctrine claim crossed events -- `comprehensive-build-enforce.mjs` is
    // actually wired as a UserPromptSubmit hook, not PreToolUse, so cross-event
    // ordering is automatic (PreToolUse fires per-tool, UserPromptSubmit fires
    // per-prompt). Kept live even while A5 is unwired: if a future edit moves it
    // into PreToolUse, this surfaces the change so ordering can be re-decided.
    it("comprehensive-build-enforce is NOT in PreToolUse (cross-event by design)", () => {
      const s = loadSettings(SETTINGS_PATH);
      const flat = flattenPreToolUseHooks(s);
      const enforceIdx = findHookIndex(flat, "comprehensive-build-enforce.mjs");
      expect(enforceIdx).toBe(-1);
    });

    // Absorbed from the retired duplicate suite golf-hook-ordering.test.ts
    // (R7/dedup, U-GOLF-RED-TESTS): generic settings-truncation sanity that
    // stays live regardless of A5 wiring state.
    it("settings.json exposes Stop hooks (sanity check that the file isn't truncated)", () => {
      const s = loadSettings(SETTINGS_PATH);
      expect(Array.isArray(s.hooks?.Stop)).toBe(true);
      expect((s.hooks?.Stop ?? []).length).toBeGreaterThan(0);
    });

    // Also absorbed live (regardless of A5 wiring): the write-family matcher
    // gates the ENTIRE write-enforcement stack (file-claim-guard,
    // duplication-hard-block, and A5 itself on re-wire). A paraphrase or
    // anchor drift of the regex string would silently un-fire every hook on
    // it -- guard the exact canonical form and that it actually carries hooks.
    it("a non-empty PreToolUse block exists on the exact canonical write-family matcher", () => {
      const s = loadSettings(SETTINGS_PATH);
      const blocks = (s.hooks?.PreToolUse ?? []).filter((b) => b.matcher === EXPECTED_A5_MATCHER);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks.some((b) => (b.hooks ?? []).length > 0)).toBe(true);
    });

    // Iteration 6 R2-UU13 ordering invariants -- the contract A5 must satisfy
    // WHEN wired (after the cross-worktree firewall, last in its matcher block,
    // canonical matcher, sane timeout, documented _purpose). Skipped while A5
    // is deliberately unwired; auto-armed by a re-wire with zero edits here.
    describe.skipIf(!a5WiredInProject)("ordering invariants (auto-armed when A5 is re-wired)", () => {
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
        expect(lastHook?.command ?? "").toContain("golf-slot-write-allowlist.mjs");
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

      // Absorbed from the retired duplicate suite golf-hook-ordering.test.ts
      // (R7/dedup): its unique non-positional invariants. Its "within first 4
      // entries" positional assert CONFLICTED with "last in block" above --
      // last-in-block retained as the single positional invariant (explicit
      // Tier-0 chain-terminator rationale); do not resurrect first-4.
      it("A5 is invoked through portable-node as a command hook (not bare 'node')", () => {
        const s = loadSettings(SETTINGS_PATH);
        const block = findMatcherBlockContaining(s, "golf-slot-write-allowlist.mjs");
        const a5Hook = (block?.hooks ?? []).find((h) => h.command?.includes("golf-slot-write-allowlist.mjs"));
        expect(a5Hook?.command ?? "").toContain("portable-node");
        expect(a5Hook?.type).toBe("command");
      });

      it("A5 is registered exactly once across the whole PreToolUse stack (single-source rule)", () => {
        const s = loadSettings(SETTINGS_PATH);
        const flat = flattenPreToolUseHooks(s);
        const fires = flat.filter((h) => h.command.includes("golf-slot-write-allowlist.mjs")).length;
        expect(fires).toBe(1);
      });
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
