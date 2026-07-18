/**
 * golf-hook-ordering.test.ts -- RETIRED SUITE (tombstone, U-GOLF-RED-TESTS 2026-07-01)
 *
 * This suite asserted that the A5 golf-slot-write-allowlist hook IS wired in
 * H:/prism/.claude/settings.json PreToolUse -- stale doctrine: the operator
 * deliberately UNWIRED A5 on 2026-05-20 (golf = normal work slot; CLAUDE.md
 * section GOLF SLOT, doc-corrected 2026-06-09: 0 settings.json refs, hook
 * file preserved on disk). That left ~6 of its 10 tests red on shared HEAD
 * and put it in direct contradiction with golfHookOrdering.test.ts.
 *
 * ALL of its unique coverage was absorbed into golfHookOrdering.test.ts:
 *   - live (regardless of A5 wiring): exact canonical write-family matcher
 *     present + non-empty, Stop-hooks truncation sanity;
 *   - skipIf-armed (activate when A5 is deliberately re-wired): portable-node
 *     invocation + type:"command", single-source registration (fires === 1,
 *     which strictly subsumes the old in-block duplicate check);
 *   - the "within first 4 entries" positional assert was deliberately DROPPED
 *     -- it conflicted with the retained "last in block" chain-terminator
 *     invariant (R7: pick, don't blend; documented at the absorption site).
 *
 * The file is kept as a tombstone per never-delete-only-disable (a straight
 * `git rm` in the shared tree did not stick -- the file was restored within
 * minutes by a peer action or the asset-preservation stack; root restorer
 * unverified). Do NOT add assertions here -- extend golfHookOrdering.test.ts.
 */

import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";

describe("golf-hook-ordering (retired -- absorbed into golfHookOrdering.test.ts)", () => {
  it("the canonical successor suite exists on disk", () => {
    expect(existsSync("H:/prism/mcp-server/src/__tests__/golfHookOrdering.test.ts")).toBe(true);
  });
});
