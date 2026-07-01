---
name: reference-d3-conflict-resolution-2026-05-16
description: OBSIDIAN-INTELLIGENCE-MS3/D3 U-CONFLICT-RESOLUTION shipped — MemoryConflictResolverEngine (semantic memory-key conflict detect + policy resolve + append-only diff persistence) + prism_session:memory_conflict_resolve
source: prism-memory
synced: 2026-05-18T01:02:09.264Z
aliases: reference_d3_conflict_resolution_2026_05_16
---


# D3 U-CONFLICT-RESOLUTION shipped (OBSIDIAN-INTELLIGENCE-MS3)

2026-05-16, slot **charlie** (claude-c0f06dee), /loop continuation. Ship commit `a6a119663` on `cad-fusion-live-ms0` (main tree). Envelope flip same session: MS3 `completed_units` 8→9/24, D3 `status=completed` + `ship_record`.

**Deliverables (4 files, 1415 ins):**
- `mcp-server/src/engines/MemoryConflictResolverEngine.ts` (~710 LOC) — pure `detectConflict` (SHA-256 + timestamp-window; reasons `concurrent|superseded|identical-content|same-author`) + side-effecting `resolveConflict`. `ConflictPolicySchema` last-writer|first-writer|human-arbitrate, deterministic exact-ts agent-id tiebreak. Persists both versions to `knowledge/memories/conflicts/<key>.diff.md`, append-only, serialized per key by a token-stamped advisory lockfile. Frozen singleton.
- `mcp-server/src/__tests__/MemoryConflictResolverEngine.test.ts` — 50 hermetic vitest cases (50/50 PASS).
- `mcp-server/src/tools/dispatchers/sessionDispatcher.ts` + `sessionActionSchemas.ts` — `prism_session:memory_conflict_resolve` action (`.strict()` schema; `existing`/`incoming` match `MemoryWriteSchema`).

**Quality:** 50/50 vitest PASS, D3 type-clean vs the repo's pre-existing tsc baseline, 6 sessionDispatcher regression suites PASS (92 tests). Per-file 2-arm gate: engine 2/2 + test 2/2 + wiring 2/2 PASS. End-of-task 3-of-3: arms A+B+C all PASS at session claude-c0f06dee (commit a6a119663).

**The per-file gate ran 4 ROUNDS — it caught a real bug class each round:**
- R1: P0 silent data-loss on `outside-window` (a cross-agent divergent write beyond the window was dropped); P0 spoofable section counter (hostile `## Conflict @` in memo content inflates the count).
- R2: P1 concurrent read-modify-write clobber (two resolvers on one key lose a section).
- R3: P0 lock-timeout **threw** → lost the conflict record; guaranteed by `LOCK_TIMEOUT < LOCK_STALE`.
- R4: P1 wrong-owner lock release (`finally` deleted the lock by path; a stale-stolen+reacquired lock got freed by the original owner → torn section).
Each fix held; the convergence round + 3-of-3 all PASS.

**Key design lessons worth remembering:**
- **Data-loss invariant beats fail-loud-throw for a *preservation* engine.** R3's first fix threw on lock-timeout (fail-loud, Karpathy R12) — but for an engine whose whole job is to NOT lose a conflict, a throw that drops the record is *worse* than the torn file it traded against. The right answer: never throw away the record — spill to a unique contention-free `<key>.diff.locktimeout-<pid>-<hrtime>.md` (`degraded:true`). Fail-loud is correct for *invalid input* (pre-detection); for a *known* conflict it must be fail-**preserve**.
- **`appendFileSync` is NOT size-atomic.** D4's append-JSONL single-host model does NOT transfer to an engine whose records embed multi-MB memo bodies — concurrent appends interleave/tear. Per-key advisory lockfile (token-stamped, atomic `renameSync` steal, token-checked release) serializes it.
- **Lock constants are ordered for safety:** `LOCK_TIMEOUT_MS (90s) > LOCK_STALE_MS (60s)` so a crashed-owner lock is always stealable *before* a waiter gives up. Reversed ordering guarantees data loss under a crashed owner.
- **Out-of-band sentinel for counting.** Counting `## Conflict @` headings is spoofable by hostile memo content; count an `<!-- prism:conflict-section -->` sentinel instead + escape embedded copies.
- **Semantic vs file-level** (exit-condition #5): documented the distinction in-engine rather than blocking the autonomous /loop on a user-clarification round-trip — `commit-ownership-guard` is a file/git lock; D3 is a post-hoc semantic reconciliation layer for races that slip past locks.

**Process lesson — shared-index commit collision:** the first commit attempt swept 2 peer-claimed files (`checkin.md`, `checkin-recall.mjs`, pre-staged in the shared `H:/prism` index by claude-339c8ff7) into the D3 commit. Fixed non-destructively: `git reset --soft HEAD~1` → `git restore --staged` the 2 peer files → recommit only the 4 D3 files. `git commit` commits the whole staged index, not just your `git add` set — always `git diff --cached --name-only` before committing in the shared tree.

**Cumulative this charlie chat (across compactions):** 10 MS3 units — A2+C1+C3+D1+G1+G3+D2+D4+D3 mine; C2 hotel-forked.

**Deferred (P2/P3, logged):** dispatcher echoes `winner.content` (≤5MB) — could return hash+role; spill-path containment parity; `dispatcherError` leaks host path via `err.stack` on fs error (pre-existing); no dispatcher E2E round-trip test; reconcile cron for spill/husk files; PostToolUse memory-mirror-race hook (the write-path consumer).

Sister: [[reference_d4_action_traces_2026_05_16]] · [[reference_e1_ideablock_extractor_2026_05_15]] · [[feedback_scrutiny_gate_finds_hostile_payload_class]] (the per-file gate again caught real bugs — D3 added: window-drop data-loss, spoofable counter, RMW clobber, lock-timeout-throw, wrong-owner release). Wiki: [[memory-conflict-resolver-engine]].

**Next pickable for charlie MS3:** D5 (U-CONTEXT-EVAL-GATE) is BLOCKED — its dep is D1+**E3**, and E3 is not done (the prior handoff RESUME wrongly said D5 dep was D4). G2 (U-AGENT-PIXEL-DEPT-OVERLAY, dep D4 ✓) is pickable. B-series cron (B1-B6) blocked on A1 (in_progress). Avoid F2 (spec-blocker) + E1-E4 (hotel-series) + C2 (hotel-forked) + F1 (whisper).


## Related
[[engines/MemoryConflictResolverEngine|MemoryConflictResolverEngine]] • [[dispatchers/prism_session|prism_session]] • [[skills/loop|/loop]] • [[skills/src|/src]] • [[skills/engines|/engines]] • [[skills/memories|/memories]] • [[skills/conflicts|/conflicts]] • [[skills/tools|/tools]] • [[skills/dispatchers|/dispatchers]] • [[skills/session|/session]]