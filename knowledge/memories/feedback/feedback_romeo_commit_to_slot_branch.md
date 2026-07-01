---
name: feedback_romeo_commit_to_slot_branch
description: "RULE (operator 2026-06-10, fleet-wide) — romeo (wiring galaxy) stages + commits to its own slot/romeo NATO branch in H:/prism-slot-romeo, NOT shared cad-fusion-live-ms0. Plus the worktree test-env caveat."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.441Z
aliases: feedback_romeo_commit_to_slot_branch
---


# RULE — romeo commits to its own `slot/romeo` branch, not shared MAIN

**Operator directive (2026-06-10, "good night /yolo-mode"):** *"make a memory and rule for your domain to stage and commit to your own chat slot nato named branch to git tree."* Same directive was given fleet-wide — hotel got it identically ([[feedback_hotel_commit_to_slot_branch]]).

**The rule:** romeo (the **wiring** galaxy) stages + commits in its own worktree **`H:/prism-slot-romeo`** on branch **`slot/romeo`**. Do NOT commit engine-wiring directly to the shared `cad-fusion-live-ms0` integration trunk (the earlier romeo sessions — JMDB/DocuStrata `[MAIN] [BOOTSTRAP-SLOT-ENFORCE]` — used the bootstrap escape; that is now SUPERSEDED for routine wiring).

**Why:** the `SLOT-COMMIT-ENFORCE` hook BLOCKS a romeo-bound chat from committing on the shared trunk ("slot romeo must commit from its own worktree"). The shared trunk is high-peer-contention → H8 commit-misattribution. Each slot's own HEAD + git lock eliminates the race. Golf no longer owns the slot→MAIN merge — **each slot merges its own branch** ([[feedback_each_slot_merges_own_galaxy]]), so the eventual `slot/romeo → cad-fusion-live-ms0` reconciliation is romeo's own job.

**How to apply (mechanics that bit me — U-WIRE-ERPIMPORT, 2026-06-11):**
1. **Work IN the worktree** `H:/prism-slot-romeo`, not `H:/prism`. (I drifted into H:/prism, authored the wire on `cad-fusion-live-ms0`, then had to re-author it on slot/romeo. Edit in the slot worktree from the start.)
2. **Lead the commit subject with `[slot/romeo]`.** A bare `[WIRING]` scope makes `worktree-commit-route` fuzzy-match the `wire-unwired` worktrees ("wire") and BLOCK. Leading `[slot/romeo]` routes to the romeo worktree. (Alternative: `[MAIN]` prefix overrides the route check entirely.)
3. **A blocked commit UNSTAGES your files** ([[feedback_commit_prefix_main_on_shared_tree]]) — after any route/enforce block, `git add` again before retrying.
4. Stage ONLY your files explicitly (`git add <path1> <path2>`) — the romeo worktree carries a large pile of pre-existing `.claude/commands-archive|helpers|hooks` modifications (mirror/sync noise); never `git add -A`.

**CRITICAL CAVEAT — the romeo worktree CANNOT run tests/tsc:** `H:/prism-slot-romeo/mcp-server/node_modules` lacks **vitest AND typescript** (partial install). So a wire committed to slot/romeo cannot be vitest/tsc-verified in-place. Two honest paths until fixed:
- **(preferred fix)** run `npm ci` (or `npm install`) once in `H:/prism-slot-romeo/mcp-server` so the slot worktree gets a full dev/test toolchain → then wires verify in-place before commit.
- **(interim, what I did)** author + fully verify the wire on `cad-fusion-live-ms0` (where vitest works: 21/21 round-trip + 2-of-2 scrutiny + tsc-clean), confirm the engine is **byte-identical across branches** (`git diff cad-fusion-live-ms0 slot/romeo -- <engine>` empty), `esbuild.transform` the slot/romeo dispatcher to catch syntax errors, verify enum↔case bijection, THEN commit the identical wire on slot/romeo. R12-honest: do NOT claim "tests pass on slot/romeo" — they ran on the identical code on main.

**Divergence reality (2026-06-11):** `slot/romeo` is **24-ahead / 3000-behind** `cad-fusion-live-ms0` on `businessDispatcher.ts` + `calcDispatcher`/`dataDispatcher`/schemas/routes. romeo's entire real engine-wiring history (JMDB, DocuStrata, db-coverage-gapfill, cimco-integration) actually lives on `cad-fusion-live-ms0`; `slot/romeo` is an old bridge-map/jm-die-shop-page experimental line (HEAD 2026-05-24). Committing fresh wiring to slot/romeo is correct per the rule, but the slot→MAIN merge will need real conflict resolution (romeo's job).

**Sister memories:** [[feedback_hotel_commit_to_slot_branch]] · [[feedback_each_slot_merges_own_galaxy]] · [[feedback_commit_prefix_main_on_shared_tree]] · [[reference_romeo_db_engine_wiring_2026_06_10]] (the prior romeo wiring session + reusable wire patterns).
