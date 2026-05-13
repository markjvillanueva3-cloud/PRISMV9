/**
 * golf-hook-ordering.test.ts — CLEANUP-MS0 / U-CLEANUP-ORDERING-TEST
 *
 * Snapshot of the H:/prism/.claude/settings.json PreToolUse chain that
 * protects the 7th "golf" hygiene chat slot. The golf slot's write-allowlist
 * hook (`golf-slot-write-allowlist.mjs`, U-CLEANUP-A5) is Tier-0 critical —
 * it must:
 *   - exist in the PreToolUse chain at all (regression guard against the
 *     hook being accidentally deleted during a hookify-driven cleanup)
 *   - fire on the write-family matcher (Edit | Write | MultiEdit | NotebookEdit)
 *   - run BEFORE any non-T0 hook in that same block (so a misbehaving
 *     downstream hook can't bypass the allowlist by running first and
 *     short-circuiting the chain)
 *   - share its block with the cross-worktree firewall hook
 *     (`hook-cross-worktree-block.mjs`, HOOK-SYNERGY-MS0) which has the
 *     same Tier-0 / write-family characteristics
 *
 * The test asserts STRUCTURAL invariants rather than freezing the exact
 * hook list — new T0 write-family hooks landing in this block are fine
 * as long as the golf hook is still present and well-positioned.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

const SETTINGS_PATH = "H:/prism/.claude/settings.json";
const WRITE_FAMILY_MATCHER = "^(Edit|Write|MultiEdit|NotebookEdit)$";
const GOLF_HOOK_BASENAME = "golf-slot-write-allowlist.mjs";
const CROSS_WORKTREE_HOOK_BASENAME = "hook-cross-worktree-block.mjs";

interface HookCommandEntry { type: string; command: string }
interface HookBlock { matcher: string; hooks: HookCommandEntry[] }
interface ClaudeSettings { hooks: { PreToolUse?: HookBlock[]; PostToolUse?: HookBlock[]; Stop?: HookBlock[] } }

function loadSettings(): ClaudeSettings {
  if (!existsSync(SETTINGS_PATH)) {
    throw new Error(`settings.json not found at ${SETTINGS_PATH}`);
  }
  const raw = readFileSync(SETTINGS_PATH, "utf-8");
  return JSON.parse(raw) as ClaudeSettings;
}

function basenameOf(command: string): string {
  const m = /hooks\/([^"\s'\\]+\.mjs)/.exec(command);
  return m ? m[1] : "";
}

/**
 * Returns every PreToolUse block whose matcher equals the write-family regex.
 * In a freshly-merged settings.json there is usually exactly one; if a peer
 * commit has just split the matcher into two blocks (planned future
 * refactor — see hook-fast-lane work), both come back.
 */
function getWriteFamilyBlocks(s: ClaudeSettings): HookBlock[] {
  return (s.hooks.PreToolUse || []).filter((b) => b.matcher === WRITE_FAMILY_MATCHER);
}

/** The single block that actually carries the named hook (skips empty/duplicate blocks). */
function findBlockHostingHook(s: ClaudeSettings, hookBasename: string): HookBlock | undefined {
  return getWriteFamilyBlocks(s).find((b) =>
    (b.hooks || []).some((h) => basenameOf(h.command) === hookBasename)
  );
}

describe("golf-slot-write-allowlist — PreToolUse chain placement", () => {
  it("settings.json exists and parses as JSON", () => {
    const s = loadSettings();
    expect(s.hooks).toBeTypeOf("object");
    expect(Array.isArray(s.hooks.PreToolUse)).toBe(true);
  });

  it("PreToolUse has at least one block on the write-family matcher", () => {
    const s = loadSettings();
    const blocks = getWriteFamilyBlocks(s);
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    // At least one of those blocks must actually carry hooks (an empty
    // duplicate is permitted during transition states but cannot be the
    // sole listing).
    const nonEmpty = blocks.filter((b) => (b.hooks || []).length > 0);
    expect(nonEmpty.length).toBeGreaterThanOrEqual(1);
  });

  it("golf-slot-write-allowlist is present in the write-family chain", () => {
    const s = loadSettings();
    const block = findBlockHostingHook(s, GOLF_HOOK_BASENAME);
    expect(block).toBeTypeOf("object");
    const basenames = (block!.hooks || []).map((h) => basenameOf(h.command));
    expect(basenames).toContain(GOLF_HOOK_BASENAME);
  });

  it("cross-worktree-block hook coexists in the same block as the golf hook (both T0)", () => {
    const s = loadSettings();
    const block = findBlockHostingHook(s, GOLF_HOOK_BASENAME);
    expect(block).toBeTypeOf("object");
    const basenames = (block!.hooks || []).map((h) => basenameOf(h.command));
    expect(basenames).toContain(CROSS_WORKTREE_HOOK_BASENAME);
  });

  it("golf hook runs within the first 4 entries of its block (Tier-0 priority)", () => {
    const s = loadSettings();
    const block = findBlockHostingHook(s, GOLF_HOOK_BASENAME);
    expect(block).toBeTypeOf("object");
    const basenames = (block!.hooks || []).map((h) => basenameOf(h.command));
    const golfIdx = basenames.indexOf(GOLF_HOOK_BASENAME);
    expect(golfIdx).toBeGreaterThanOrEqual(0);
    expect(golfIdx).toBeLessThanOrEqual(3);
  });

  it("golf hook is invoked through portable-node (not bare 'node' which may be missing on CI hosts)", () => {
    const s = loadSettings();
    const block = findBlockHostingHook(s, GOLF_HOOK_BASENAME);
    expect(block).toBeTypeOf("object");
    const golfEntry = (block!.hooks || []).find(
      (h) => basenameOf(h.command) === GOLF_HOOK_BASENAME
    );
    expect(golfEntry).toBeTypeOf("object");
    expect(golfEntry!.command).toContain("portable-node");
    expect(golfEntry!.type).toBe("command");
  });

  it("block hosting the golf hook does not contain duplicate registrations of it", () => {
    const s = loadSettings();
    const block = findBlockHostingHook(s, GOLF_HOOK_BASENAME);
    expect(block).toBeTypeOf("object");
    const count = (block!.hooks || []).filter(
      (h) => basenameOf(h.command) === GOLF_HOOK_BASENAME
    ).length;
    expect(count).toBe(1);
  });

  it("no other PreToolUse block redundantly fires the golf hook (single-source rule)", () => {
    const s = loadSettings();
    let totalFires = 0;
    for (const block of s.hooks.PreToolUse || []) {
      for (const h of block.hooks || []) {
        if (basenameOf(h.command) === GOLF_HOOK_BASENAME) totalFires += 1;
      }
    }
    expect(totalFires).toBe(1);
  });

  it("write-family matcher value is the exact regex string (not a paraphrase)", () => {
    const s = loadSettings();
    const matchers = (s.hooks.PreToolUse || []).map((b) => b.matcher);
    expect(matchers).toContain(WRITE_FAMILY_MATCHER);
  });

  it("settings.json exposes Stop hooks (sanity check that the file isn't truncated)", () => {
    const s = loadSettings();
    expect(Array.isArray(s.hooks.Stop)).toBe(true);
    expect((s.hooks.Stop || []).length).toBeGreaterThan(0);
  });
});
