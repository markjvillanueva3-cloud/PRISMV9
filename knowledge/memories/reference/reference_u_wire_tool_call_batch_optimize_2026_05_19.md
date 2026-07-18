---
name: reference-u-wire-tool-call-batch-optimize-2026-05-19
description: U-WIRE-TOOL-CALL-BATCH-OPTIMIZE (slot foxtrot 2026-05-19) — wired ToolCallBatchOptimizerEngine → prism_dev:tool_call_batch_optimize (op-discriminator, 4 ops). Wiring swept into peer charlie's commit 2ed91ab127 via shared-tree git-add (cross-chat misattribution class); test landed correctly in own commit. Both on HEAD, 11/11 tests pass. 1 P1 fixed (guard && → ||).
metadata:
  type: reference
---

# U-WIRE-TOOL-CALL-BATCH-OPTIMIZE — ToolCallBatchOptimizerEngine → prism_dev

**Slot:** foxtrot (claude-f09b33aa, 2026-05-19, branch cad-fusion-live-ms0).
**Status:** COMPLETE — wiring + test both on HEAD, 11/11 vitest PASS, tsc 0 errors.

## What shipped

Wired the genuine-unwired `ToolCallBatchOptimizerEngine` (199-line dev-tooling
engine, 4 public methods, singleton) to `prism_dev` via a new op-discriminator
action `tool_call_batch_optimize` (ops: plan / analyze / estimate_cost /
summary). R8 dedup-preflight (`grep -rl ToolCallBatchOptimizer
mcp-server/src/tools/` → empty) confirmed unwired before wiring. Pattern
matches sibling `tool_call_dedup` / `tool_call_throttle` op-discriminator
blocks (R11).

Test: `mcp-server/src/__tests__/wire-tool-call-batch-optimize.test.ts` —
11 cases (3 source-grep wiring gates + 6 real-data engine oracles + 1
import-path anti-regression guard).

## Cross-chat commit misattribution (recurring class)

The two halves of this unit landed in **different commits with one mislabeled**:

- **Wiring half** (`devDispatcher.ts` enum entry + case block) → swept into
  peer **charlie's** commit `2ed91ab127` `[WIRE-UNWIRED-MS0]/U-WIRE-TOOL-CALL-DEDUP
  (slot:charlie)`. Verified via `git log -S "U-WIRE-TOOL-CALL-BATCH-OPTIMIZE"
  -- devDispatcher.ts` → `2ed91ab127`. The P1 guard fix likely rode charlie's
  next commit `c49df07fed` (U-WIRE-TOOL-CALL-PIPELINE).
- **Test half** → landed correctly in foxtrot's own commit (`b78jt5fzj`,
  `[WIRE-UNWIRED-MS0]/U-WIRE-TOOL-CALL-BATCH-OPTIMIZE (slot:foxtrot)`) —
  but git reported "1 file changed" because `devDispatcher.ts` was already
  swept by charlie before foxtrot's `git add` ran.

**Root cause:** foxtrot working in the SHARED `H:/prism` main tree (not the
slot worktree — slot-worktree-cwd advisory was active but not migrated). A
peer charlie `git add devDispatcher.ts` / `git commit -a` window caught the
uncommitted `tool_call_batch_optimize` edit. Same class as
[[reference_cross_chat_commit_misattribution_2026_05_18]] +
[[reference_git_index_saturation_camx11_2026_05_18]].

**Not rewritten** — the work is correct on disk + HEAD; rewriting history is
downstream-visible. A future commit-subject audit needs a manual
`2ed91ab127 → also U-WIRE-TOOL-CALL-BATCH-OPTIMIZE` override.

## P1 caught by per-file scrutiny

2-reviewer gate (wiring-review-agent + test-review-agent), both PASS. 1
genuine P1 from the wiring reviewer: the guard `if (!calls && op !==
undefined)` would let `{calls:null}` with no `op` fall through to the
op-switch `default` and emit a misleading `"unknown op: undefined"` instead
of the real `"requires {calls, op}"`. **Fixed in-session**: `&&` → `||` so
the guard fires on EITHER absent input. No NPE either way (the `default`
branch never dereferences `calls!`) — it was an error-message-quality bug,
not a crash.

## Lessons

- **Shared-main-tree git-add is a misattribution hazard.** A peer's
  `git commit -a` or broad `git add` sweeps your uncommitted edits. The fix
  is slot-worktree migration (`/checkin-<slot>` Step 2c) — the
  slot-worktree-cwd advisory was firing this whole session and was not
  acted on. Migrate, or commit IMMEDIATELY after each file edit to shrink
  the sweep window.
- **`git show <peer-commit> -- <file>` is the verification tool** when your
  own commit reports fewer files than you staged — `git log -S "<unique
  string>"` finds which commit actually carried the work.
- **Guard logic: a multi-input precondition that should reject on ANY
  absent input uses `||`, not `&&`.** `&&` only rejects when ALL are absent.

## See also

- [[reference_cross_chat_commit_misattribution_2026_05_18]] — same class, hotel
- [[reference_u_wire_session_event_log_2026_05_18]] — op-discriminator wiring pattern
- [[reference_audit_actionmap_synergy_chain_2026_05_18]] — BUILD_STATE false-positive class (why R8 preflight matters)
