# HANDOFF — claude-de9949da — cleanup-ms0

## Standing rule
**NEVER call ScheduleWakeup between /loop iterations.** Continue immediately to the next unit in the same chat turn. See [[feedback_no_schedule_wakeup_in_loop]].

## Resume directive
Continue CLEANUP-MS0 critical-path build. NEXT: U-CLEANUP-B4 — commit-reviewer-dispatch.mjs hook (4-hr unit: awareness-enrich + Ollama cascade + self-attribution + adversarial sanitization).

## Progress (session 2026-05-13 ~11:00-12:30 UTC)
- U-CLEANUP-A1 ✓ (prior, commit 8cd6ab1a5)
- U-CLEANUP-A5 ✓ (prior)
- U-CLEANUP-A6 ✓ (prior)
- **U-CLEANUP-B3 ✓ (dd20a1da6)** — `.claude/helpers/git-log-tail.mjs` + 21 tests
- **U-CLEANUP-B10 ✓ (d9f2a29bc)** — `LedgerStoreEngine.ts` + `golf-ledger-v1.sql` + 37 tests
- **U-CLEANUP-B1 ✓ (5f11d0eef)** — `PeerCommitAuditorEngine.ts` + 22 tests
- **U-CLEANUP-B11 ✓ (4bc764e59)** — `LedgerProjectorEngine.ts` + 16 tests
- **U-CLEANUP-B2 ✓ (722bb7dd9 + b60dd777b + 4d7c964c5)** — prism_dev:peer_audit_* dispatcher wiring + 11 E2E tests. **3 hybrid-race commits** — peer chats absorbed my dispatcher+test into their commit message, then I committed schemas separately.

## Fleet ops note (2026-05-13 ~12:25 UTC)
**7 chats concurrent commits** causing severe index.lock contention. Cleanup just swept a 215-sec-old stale lock (way past the 60s threshold). Memory at 77% / 7.3 GB free. Recommend tuning the lock-staleness threshold from 60s → 30s in `git-lock-sweeper.mjs` if this pattern persists.

## Critical path remaining
A1 ✓ → A6 ✓ → A5 ✓ → B3 ✓ → B10 ✓ → B1 ✓ → B11 ✓ → B2 ✓ → **B4** → B5 → G3 → C5 → F8 → G11 → E2 (7 units to go)

## NEXT: U-CLEANUP-B2 — Dispatcher wiring
- Spec: `state/shared/specs/GOLF-WATCHDOG-MS0-2026-05-13.md` §R1-B1, §R1-B2
- Envelope: `mcp-server/data/milestones/CLEANUP-MS0.json` (U-CLEANUP-B2)
- Title: "B2 — prism_dev:peer_audit_tick / peer_audit_attribution / peer_audit_dispatch_plan dispatcher actions wired in devDispatcher.ts (action enum + schema + lazy import; E2E test invokes via dispatcher not singleton)"
- Dependencies: U-CLEANUP-B1 ✓, U-CLEANUP-B10 ✓

### Implementation steps
1. Add `peer_audit_tick`, `peer_audit_attribution`, `peer_audit_dispatch_plan` to ACTIONS enum in `mcp-server/src/schemas/devActionSchemas.ts`.
2. Add Zod schemas for each (input + output).
3. Add case handlers in `mcp-server/src/tools/dispatchers/devDispatcher.ts` (lazy imports per H7/H8 pattern).
4. E2E test in new file `mcp-server/src/__tests__/devDispatcherPeerAudit.test.ts` invoking via dispatcher (not singleton).

## Build pattern (proven 4× this session)
1. Read envelope spec + grep §R-codes for unit
2. Write engine/dispatcher code
3. Write test (concrete assertions, no `toBeDefined`-only)
4. Run vitest, fix failures
5. **Dispatch 2 parallel scrutiny agents** (code-analyzer + reviewer) after each file
6. Fix ALL P0/P1 findings same commit per [[feedback_always_close_out]]
7. Re-run tests, re-scrutiny if needed
8. Commit with `[MAIN]` prefix to override worktree-route-guard (or commit from worktree)
9. Continue immediately to next unit — NEVER ScheduleWakeup

## Recurring gotchas
- Stale `.git/index.lock` from peers — sweep with `rm -f .git/index.lock` and retry
- TEST_LEGITIMACY_GATE rejects `toBeTruthy()` / `toBeDefined()`-only — use concrete value checks
- Inject `now` into BOTH the engine AND its LedgerStoreEngine in tests when verifying `finished_at`
- For test fixture SHAs use `padStart(40, "0")` not `padEnd` (padEnd-collision: `"1".padEnd(40,"0") === "10".padEnd(40,"0")`)
- `signal_id` should use FULL sha not slice(0,12) — fixtures collide on prefix

## Background context
- Memory monitor cron `3036ea16` continues firing every 7 min (mostly `[mon-quiet]`)
- Branch: `cad-fusion-live-ms0` (commits ahead of origin — git-sync-stop handles push)
- Working tree has ~4643 changes total (mostly peer chats' work)

## Memory pointers
- [[feedback_no_schedule_wakeup_in_loop]] — standing rule, all 7 chats
- [[feedback_always_close_out]] — fix all P0/P1 in same commit
- [[feedback_parallel_scrutiny_per_file]] — 2 agents per file
- [[reference_h8_coordination_store]] — DB pattern (coordination.db shared with B10)
- [[reference_h7_async_hook_dispatcher]] — async dispatcher pattern (for B2 design parallel)
