# RECENT-SHIPMENTS — 2026-05-26 (slot:alpha)

> Inbox for shipments that need CLAUDE.md `## Recent regressions` / milestone-summary entries
> on the next golf-slot weekly drain. Per CLAUDE.md guard: alpha + other non-golf slots write here;
> golf authors the full CLAUDE.md sections from this queue.

## SLOT-BRIDGE-MS0 — auto-seed branch-binding on first claim (slot:alpha iter1)

**Commits:** *(pending — code on disk, awaiting commit-to-slot-worktree-cutover)* · **Date:** 2026-05-26 · **Slot:** alpha (`claude-227a8626`) · **Tests:** 22/22 PASS (`__tests__/chat-slots-bindings.test.mjs`) · **End-to-end verifier:** 3/3 PASS (`scripts/verify-slot-bridge-enforcement.mjs`)

Closes the slot-worktree auto-invoke gap discovered 2026-05-26: U-WAVE5a built `state/shared/slot-branch-bindings.json` as the override that the 3 enforcement hooks (`worktree-commit-route` + `git-add-lane-guard` + `main-tree-write-block`) key off, but **only alpha had a binding entry** — 25 of 26 slots were silently unarmed, every peer's commits drifted to the shared tree, regressing per [[feedback_commit_to_slot_worktree]].

Four units shipped:

- **U-SBB01** `scripts/seed-slot-branch-bindings.mjs` (~90 LOC) — one-shot seeder for all 25 work slots (`alpha..foxtrot, hotel..zulu`). golf EXEMPT (integrator). Idempotent (`--dry-run` flag). Uses the public `writeSlotBranchBindings()` API. First run: 24 new bindings written.
- **U-SBB02** `scripts/backfill-chat-slots-branch.mjs` (~100 LOC) — patches live `chat-slots.json` for the 17 already-claimed peers that carried stale `branch="cad-fusion-live-ms0"`. Arms the hooks immediately without waiting for the next heartbeat. golf doubly-protected (never has a binding AND never overwritten). First run: 17 live slots armed; total 19/19 alive non-empty slots now on `slot/<nato>`.
- **U-SBB03** `.claude/helpers/chat-slots.mjs claimSlot()` patch (~25 LOC) — self-healing auto-seed inside `inputForSlot()`: if `slot !== "golf"` AND `slotBindings[slot]` is missing, write the binding before applying the override. Means every NEW chat that claims a slot in the future auto-arms — no operator action needed for any new slot or any new chat. Constant `INTEGRATOR_SLOT_NAME = "golf"` aligned with `main-tree-write-block.mjs:108`. Fail-soft per R12: errors log to stderr, claim still succeeds (degraded — hooks dormant until next attempt).
- **U-SBB04** `scripts/verify-slot-bridge-enforcement.mjs` (~90 LOC) — pure-core verifier against the live `chat-slots.json`. Exercises `decideOnEdit()` on 3 cases: non-alpha armed slot → main-tree write DENIED, same slot → own-worktree write ALLOWED, golf → main-tree write ALLOWED (integrator invariant). Standalone hook invocation can't be used because `resolveSessionId()` spawns `stable-session-id.mjs` against the CURRENT process tree.

**Per-file scrutiny** — each file checked against `chat-slots.mjs` exports + `main-tree-write-block.mjs` contract before next file. Pre-write graph-context advisory confirmed no duplicates (`SLOT-WORKTREE-MS0/U-CUTOVER` is the unrelated original cutover commit). Caught my own near-duplication of existing `scripts/slot-worktree-bootstrap.mjs` via duplication-guard recall in the prior session.

**Test contract change** — 2 tests in `chat-slots-bindings.test.mjs` were rewritten per R9 (tests verify intent, not behavior) to encode the new U-SBB03 contract:
- *was* `"no binding leaves input.branch intact (back-compat)"` — asserted old behavior
- *now* `"no binding auto-seeds for non-golf slot (U-SBB03 contract)"` + `"golf is EXEMPT from auto-seed (integrator invariant)"`
- *was* `"bindings file missing is fail-soft (no crash, no override)"`
- *now* `"bindings file missing → auto-seeds on first non-golf claim (creates file)"` + `"bindings file missing + golf claim → file NOT created (golf exempt)"`
- Net: 18→22 tests, with the golf-exempt invariant doubly-guarded across both file-present and file-missing cases.

**End-of-task 3-of-3** — pending (this section will be updated on commit-to-slot-worktree-cutover and Stop-hook fire).

**Files shipped on disk (this session):**
- `H:/prism/scripts/seed-slot-branch-bindings.mjs`
- `H:/prism/scripts/backfill-chat-slots-branch.mjs`
- `H:/prism/scripts/verify-slot-bridge-enforcement.mjs`
- `H:/prism/.claude/helpers/chat-slots.mjs` (modified — added `INTEGRATOR_SLOT_NAME` const + auto-seed branch inside `inputForSlot`)
- `H:/prism/.claude/helpers/__tests__/chat-slots-bindings.test.mjs` (modified — 2 tests rewritten, 2 added)
- `H:/prism/state/shared/slot-branch-bindings.json` (data — 25 work-slot bindings)
- `H:/prism/state/shared/chat-slots.json` (data — 17 live slots backfilled)

**Live fleet effect (verified):**
- Before: 1/19 live slots armed (alpha=slot/alpha; 18 stale with `branch=cad-fusion-live-ms0` or `null`)
- After: 19/19 live slots armed
- `verify-slot-bridge-enforcement.mjs` confirms bravo's writes to `H:/prism/state/shared/*` would now BLOCK; bravo writes to `H:/prism-slot-bravo/*` ALLOW; golf writes to main tree ALLOW.

**Open follow-ups** (deferred — explicit scope):
- Commit these files via `[BOOTSTRAP-SLOT-ENFORCE]` escape (alpha-tree files; or migrate to alpha worktree first). Currently uncommitted.
- Document the gap in `knowledge/wiki/architecture/slot-bridge-auto-seed.md` (wiki entry pending).
- Drop the per-session memory `reference_slot_bridge_ms0_2026_05_26.md`.

**Memory:** [[reference_slot_bridge_ms0_2026_05_26]] (pending write this session)

**Suggested CLAUDE.md section** — add under §PER-CHAT HANDOFF after the `### Lane discipline + conflict-fork rule` block, as a sibling `### SLOT-BRIDGE-MS0` subsection. Suggested wording (≤120 chars/line so it stays in the doctrine-pointer ceiling):

> **SLOT-BRIDGE-MS0 — auto-seed binding on first claim (2026-05-26, slot:alpha).** The 3 enforcement hooks key off `chat-slots.json[slot].branch.startsWith("slot/")`. U-WAVE5a built the per-slot binding sidecar `state/shared/slot-branch-bindings.json` so the binding overrides `input.branch` even when `/checkin` runs from `H:/prism`, but only alpha had a binding entry — 25/26 slots were silently unarmed, every peer commit drifted to the shared tree. U-SBB01..U-SBB04 close the gap: (a) `scripts/seed-slot-branch-bindings.mjs` one-shot seeds all 25 work slots (golf exempt), (b) `scripts/backfill-chat-slots-branch.mjs` patches live `chat-slots.json` for already-claimed peers, (c) `claimSlot()` auto-seeds on first claim — self-healing for every new chat going forward, (d) `scripts/verify-slot-bridge-enforcement.mjs` is the pure-core verifier. 22/22 tests + 3/3 e2e PASS. Re-run anytime: `node scripts/seed-slot-branch-bindings.mjs && node scripts/backfill-chat-slots-branch.mjs`. Memory: [[reference_slot_bridge_ms0_2026_05_26]]. Wiki: [[slot-bridge-auto-seed]].
