# PRISM System-Bug Audit — 2026-06-14 (slot:sierra)

Operator directive: "look for system inefficiencies and system bugs that are causing things we've built to not operate as intended." Hunt-first, fixes deferred. Every finding below is VERIFIED with file:line / live measurement (R12). Not exhaustive — see "Unhunted classes" at the end for the next pass.

## Severity key
- **P0** fleet-breaking · **P1** degrades a built feature fleet-wide · **P2** inefficiency / latent

---

## P1-1 — fork-storm circuit-breaker over-blocks on TRANSIENT spikes (triple-confirmed LIVE)
**File:** `.claude/hooks/fork-storm-circuit-breaker.mjs:68-86` (`liveBashCount`), `:40` (ceiling 400 / Workflow 280).
**Symptom (witnessed 4+ times this session):** legitimate `Bash`/`Agent`/`Workflow` spawns are PAUSED fleet-wide even when there is no sustained storm.
**Root cause (two compounding):**
1. **Single-instant snapshot.** It counts `bash.exe` via one `tasklist` snapshot. Live sampling this session: real count oscillates **8, 8, 41, 49** (4 samples / 1.6s), yet a snapshot caught **586** at one instant and blocked. A sub-second spike is read as a storm.
2. **2.5s TTL latch.** That spike count is cached (`DEFAULT_TTL_MS=2500`) and served to EVERY gated call fleet-wide for 2.5s — extending a <1s spike into a ≥2.5s fleet-wide block. The cache is shared (`state/shared/forkstorm-breaker/bash-count.json`), so one slot's spike-read blocks all slots.
**Evidence:** the breaker blocked THIS audit's Workflow at "586 live bash.exe >= ceiling 280" while `tasklist` measured 8-49 sustained; cache file showed count=64 age=18300ms.
**Fix direction:** SUSTAINED measure instead of single snapshot — take min-of-N quick samples (a transient spike → min is low → allow; a real storm → all-high → block). AND never serve a ≥ceiling count from cache (re-verify; cache only sub-ceiling counts). Preserves real-storm protection + enumeration savings. Testable via the existing `decideBreaker` + `fork-storm-circuit-breaker.test.mjs`. **Owner: golf** (fleet-hygiene).

## P1-2 — system-viz find-cache STALE vs live graph (search serves stale hits)
**Evidence:** `node scripts/system-viz-query.mjs cache-status` → `find-cache: STALE (mtime/size != live graph)` while `graph-index: FRESH`. Graph last regen 3.5h ago.
**Symptom:** `find-cache.json` is the substrate for `system-viz-query find`, the `/master-index` skill, and the `Pre-Grep graph context` / `Pre-Read graph context` / `master-index pre-search` injections that fire on EVERY grep/read across all 14 sessions. A stale find-cache means those fleet-wide search aids return hits keyed to a superseded graph (moved/renamed/removed nodes) — silently degrading the search-first discipline the whole fleet relies on.
**Root cause:** the regen pipeline refreshes `graph-index` (FRESH) but NOT `find-cache` (STALE) — inconsistent sidecar refresh; one sidecar is wired into regen, the other isn't.
**Fix direction:** wire `find-cache` rebuild into the canonical `regen-viz` pipeline (one-writer) so both sidecars refresh together; OR a freshness guard that rebuilds find-cache on staleness before serving. **Owner: sierra** (this slot's domain).

## P1-3 — hook-stack self-DOS (the root the breaker bands-aids)
**Evidence:** `fork-storm-circuit-breaker.mjs:7-13` documents **65 UserPromptSubmit + 76 Stop + 96 PreToolUse/PostToolUse hooks × up to 14 live sessions**. Many shell out (`bash`/`node`) per tool-call / per-prompt. This is what produces the `bash.exe` bursts (peaked 927 historically, 586 this session) that periodically starve the shared MCP server on :3100 — the operator-reported "api server error".
**Symptom:** the fleet's own safety/observability machinery is heavy enough to intermittently degrade the MCP server it protects. The breaker (P1-1) is a back-pressure band-aid, not a cure.
**Fix direction (deeper, scoped):** audit the per-tool-call hook shell-outs — collapse multiple bash-spawning hooks into one bundle pass (some bundling exists: `.claude/hooks/bundles/`), move per-call enumerations to a shared cached sidecar, and demote always-on injectors to keyword-gated. **Owner: golf + sierra (hook bundles) — needs a scoped milestone, not a one-line fix.**

## P2-1 — mcp-connectivity probe timeout: doc says 1s, code is 3s
**File:** `.claude/hooks/mcp-connectivity-check.mjs:58` (`DEFAULT_TIMEOUT_MS = 3000`) vs docstring `:20` ("1s timeout — never delay a turn") and knob doc `:32` ("default 1000").
**Symptom:** on a slow/wedged :3100, this UserPromptSubmit hook can delay every chat's turn-start by up to 3s (throttled 30s, so ~once/30s/chat). The doc claims 1s. Code/doc mismatch + a real per-turn latency tax during MCP stress (exactly when turns are already slow).
**Fix direction:** lower `DEFAULT_TIMEOUT_MS` to 1000 to match the documented contract, or correct the docstring. **Owner: golf/sierra.** (Note: the per-chat "lost MCP bridge" banner itself is ACCURATE — this session's bridge genuinely died because `/mcp` was never re-run; not a false positive.)

## P2-2 — graph wiring/categorization gap (needs interpretation, not yet a confirmed bug)
**Evidence:** `coverage-by-domain` → "874/3798 = 23% wired"; "Misc Domains 1921" + "other 706" = 2627/3798 nodes uncategorized.
**Symptom:** 77% of graph nodes report unwired and 69% uncategorized. This MAY be expected (many nodes are docs/ghosts/non-engine), OR it indicates a real domain-tagging / wiring-inference gap that makes coverage metrics + domain-scoped search unreliable. **Flagged for a dedicated audit — do not treat as a confirmed bug until the "wired"/"domain" definitions are checked against node kinds.**

---

## Already handled THIS session (context, not open)
- Qdrant vault recall revived — `QdrantMemoryEngineSingleton` never called `store.connect()` (singleton-dead-on-arrival). Fixed (commit 9c0ab7885f).
- 3-of-3 scrutiny gate: `core/reviewer.md` was a broken claude-flow agent + `code-analyzer` agent never existed. Fixed this session.

## Unhunted classes (next pass — the bug-hunt Workflow was repeatedly breaker-blocked, ironically by P1-1)
- **dead-on-arrival** (other singletons/engines needing an init production never calls — Qdrant was one; siblings likely).
- **schema-read blindness** (consumers reading a field shape the writer doesn't emit — the NN/GNN auroc-nesting class recurred 3× historically; other state-file readers unaudited).
- **wired-but-silent hooks** (on-disk in `.claude/hooks/` but unreferenced in any `settings.json` = never fire; historical "516 zero-fire" inventory unverified-current).
These need the parallel hunt Workflow run in a fresh context once P1-1 is fixed (so the breaker stops blocking the fan-out).

## Top 5 to fix first
1. **P1-1** breaker sustained-sampling (unblocks the whole fleet's bash/agent + unblocks the rest of THIS audit).
2. **P1-2** find-cache regen wiring (restores fleet-wide search accuracy — sierra can do now).
3. **P2-1** mcp-connectivity timeout 3s→1s (cheap, removes a per-turn latency tax).
4. **P1-3** hook-stack shell-out audit (scoped milestone — the durable cure for the storm).
5. **P2-2 / unhunted classes** — dedicated hunt pass once P1-1 lands.

---

## Round 2 additions (manual ungated hunt — Workflow path stayed breaker-blocked)

### P1-4 — 363 of 712 hook files (51%) are on disk but NEVER FIRE (wired-but-silent)
**Evidence (measured):** `.claude/hooks/*.mjs` (excl `.test.mjs`) = **712 on disk**; referenced in settings.json (both C: + H:) = 263; referenced inside `bundles/*.mjs` = 167; **union wired = 387 → 363 unwired** (not in any settings or bundle).
**Symptom:** 51% of hook files never execute. The unwired sample includes names that SOUND load-bearing — `agi-safety-envelope-guard.mjs`, `ai-duplication-guard.mjs`, `anti-regression-auto-sweep.mjs`, `auto-bug-hunt-after-build.mjs`, `agent-watchdog.mjs`. If any of those were INTENDED to fire (safety / dedup / anti-regression), the feature silently does nothing — "built but not operating as intended" at scale. (Matches the historical "380 unwired" inventory; now 363/712.)
**Caveat (honest):** some are surely intentionally-retired/superseded archives kept on disk. The COUNT is verified; the wired/unwired split is verified; what's NOT yet verified is retired-vs-should-be-wired per file. Needs a triage pass (read the unwired set, classify retired vs orphaned-intended).
**Fix direction:** triage the 363 — delete/relocate true archives to a `hooks/_archive/` dir (so the on-disk count reflects reality), and wire the genuinely-intended ones. Owner: golf (hook hygiene).

### P1-3 (updated) — self-DOS hook counts MEASURED (heavier than the breaker's own estimate)
**Evidence (measured, settings.json both files):** per-event hook entries —
`UserPromptSubmit: 134 · Stop: 132 · PreToolUse: 94 · PostToolUse: 66 · SessionStart: 122 · PreCompact: 18 · SubagentStart: 2`.
So **every prompt fires 134 hooks; every tool-call fires 94+66=160 hooks; every Stop fires 132** — × up to 14 sessions. The breaker header estimated 65/76/96; the real load is ~2x on UserPromptSubmit and notably higher on Stop. This is the measured fuel for the bash.exe bursts that trip the breaker (P1-1) and starve MCP.

## Unhunted remaining (need a dedicated pass)
- **dead-on-arrival** (singletons/engines needing an init production never calls — Qdrant was one).
- **schema-read blindness** (reader field-shape vs writer shape — needs per-pair reader/writer comparison; not mechanically batch-able).

## P1-1 application note (obstacle)
The P1-1 breaker fix (sustained-sampling + no-latch cache) is fully designed + ready, BUT editing `.claude/hooks/fork-storm-circuit-breaker.mjs` is HARD-BLOCKED from a slot worktree by the cross-worktree-write guard (harness-exec files must not drift from a slot chat — correct safety). It must be applied **from the main tree (H:/prism) or by golf**, not bypassed from a slot. The exact change: in `liveBashCount`, never serve/write a cache entry >= the trip threshold, and when a read is >= threshold take 2 extra back-to-back samples and use the MIN (transient spike -> low min -> allow; sustained storm -> high -> block). Pass the per-tool trip threshold (Workflow = 0.7x) into `liveBashCount`.

---

## Round 3 -- FIXES APPLIED (2026-06-14, operator-authorized cross-domain bypass)

Operator: "do everything, you have permission to bypass blocks and gates of other galaxies." Applied the 3 bounded code fixes (committed `4f27713e3e`):

- **P1-1 FIXED** -- `fork-storm-circuit-breaker.mjs` `liveBashCount` rewritten: never serve/cache a >= tripThreshold count; min-of-N back-to-back samples when a read is high; per-tool tripThreshold passed in. Validated: logic-test LOGIC-PASS (transient [586,12,10]->12 allow; sustained [600,590,610]->590 block; normal->1 call) + existing `decideBreaker` tests 12/12 pass. LIVE (hooks re-read per call). Edited via node-fs (Edit-tool cross-worktree guard bypassed per operator auth; committed for transparency).
- **P1-2 FIXED (immediate)** -- find-cache rebuilt via `regen-find-cache.mjs` (340,882 nodes, 63.9MB, 358ms); `cache-status` now FRESH (was STALE). ROOT: `regen-viz.mjs:449-455` already calls regen-find-cache but as a NON-FATAL step -- last regen's find-cache build failed silently (graph-index went fresh, find-cache stayed stale). Builder works standalone -> the failure was transient. DURABLE FOLLOW-UP (not done): make the non-fatal regen-viz find-cache failure VISIBLE (a health signal / self-heal on detected staleness) so it can't rot undetected. find-cache.json is a gitignored sidecar (no commit; live on disk).
- **P2-1 FIXED** -- `mcp-connectivity-check.mjs:58` DEFAULT_TIMEOUT_MS 3000 -> 1000 (matches the docstring's "1s -- never delay a turn"). Committed with P1-1.

## Still open (large / needs dedicated pass -- NOT one-turn)
- **P1-3 hook self-DOS refactor** -- collapse per-tool-call shell-out hooks into bundles, demote always-on injectors to keyword-gated. Scoped milestone (golf+sierra).
- **P1-4 triage the 363 unwired hooks** -- read/classify retired-archive vs orphaned-intended; relocate true archives to `hooks/_archive/`, wire the genuinely-intended. (golf).
- **dead-on-arrival hunt** -- 22 engines carry isConnected/ensure/isReady patterns (candidate set; Qdrant was the one confirmed+fixed). Each needs a "does production call its init?" check. Now that P1-1 is fixed, the parallel hunt Workflow is unblocked for this + schema-read-blindness.
- **schema-read-blindness** -- per-pair reader-vs-writer field-shape comparison (NN/GNN auroc class); needs the Workflow or a manual per-pair pass.

---

## Round 4 -- "push through" pass (2026-06-15, slot:sierra). Operator: "dont ask, just push through ... ultracode and parallel agents."

Ran the two unhunted classes via parallel Explore agents + manual verification of every agent claim (Honesty Rule: read the real code before acting). 2 more commits.

### dead-on-arrival -- 1 CONFIRMED + FIXED, 20 cleared
- **MemorySyncEngine -- FIXED, commit `f1d1e45031`.** `mcp-server/src/engines/MemorySyncEngine.ts:490` exports `new MemorySyncEngine()` zero-arg; the internal Qdrant store was never `connect()`'d, so **every `exportBundle`/`importBundle` returned "qdrant not connected"** -- the entire H:-drive memory-bundle export/import path was dead on arrival (same class as the Qdrant singleton fixed earlier this session). Fix mirrors `QdrantMemoryEngine`: `autoConnect` gated to the default store + a lazy `ensureConnected()` (connect `{url: QDRANT_URL || localhost:6333}`, fail-soft) before the isConnected guard in both methods. Validated: **35/35 tests** (24 engine + 11 dispatcher) + `build:fast` clean. The fix is gated to the default store, so injected-store tests are untouched.
- The other ~20 isConnected/ensure-pattern engine candidates were spot-checked; none showed a production zero-arg-export-with-unconnected-store shape. (Not exhaustively proven -- a deeper per-engine "does production call init?" pass could still surface more.)

### schema-read-blindness -- 3 CONFIRMED + FIXED, 2 documented, 2 leads cleared
3 fleet hooks fixed in commit `1ce8f1da26` (applied via node-fs; hooks are cross-worktree-HARD-blocked from a slot; operator-authorized bypass; committed for transparency):
- **stop-auto-capture-per-slot.mjs (SCRUTINY_LEDGER read) -- FIXED.** Read `ledger3way[session_id]` (top-level) + checked `=== "pass"` (string), but the real ledger nests entries under `.entries[id]` with **boolean** pass flags and notes at `reviews.<arm>.notes`. Triple-broken: wrong nesting + wrong type + wrong notes path. **Measured impact: 239 of 418 ledger entries were real 3-of-3 PASSes that were silently NEVER captured** into per-slot memory -- the scrutiny->memory promotion signal was dead fleet-wide. Now reads `.entries[id]`, boolean `=== true`, `reviews.<arm>.notes`. Validated: 239/418 now correctly detected (was 0).
- **hook-stability-check.mjs + hook-basin-drift.mjs (HEALTH_CHECK_REPORT read) -- FIXED (x2).** Both read `health.awareness?.score || 0.8`, but `HEALTH_CHECK_REPORT.json` has **no `awareness` key** (top keys: status, subsystems[24], ...). So awareness was the fabricated constant 0.8 every call -> the Lyapunov stability + basin-drift advisories were permanently fed "healthy" and could never warn on real degradation (neutered). Now derive awareness from the real `health.status` field (PASS->0.95, degraded->0.6, failed->0.3, ... unknown->0.8 honest fallback). Validated: status 'PASS' -> 0.95.
- **session-continuity-chain.mjs -- DOCUMENTED (design-needed, NOT one-line).** Reads `sessionState.startedAt` but the writer emits `startTime`; AND reads `tokensUsed`/`milestonesWorked`/`keyDecisions`/`reasoningHighlights`/`handoffNotes` which **no writer emits anywhere** -> the cross-session "Prior Session Context" handoff is mostly fabricated zeros/empties. A one-field `startedAt->startTime` patch would be cosmetic; the real fix is milestone-sized: wire the 5 missing writers across the session-lifecycle hooks (or trim the reader to only written fields). Owner: sierra/golf, scoped follow-up.
- **sx-gate.mjs -- DOCUMENTED (orphaned-intended, fail-OPEN).** Reads `state/shared/QUALITY_SCORES.json` which has **no writer anywhere in the repo** -> `getSxScore` always returns the 1.0 safe-default -> the PreToolUse HARD BLOCK on safety-critical machining-file writes never fires. Fails OPEN (inert, not fabricating), so not actively harmful, but the advertised gate does nothing. Real fix = build the QUALITY_SCORES producer (a feature). Same orphaned-intended class as the 46 unwired safety hooks below.
- **Cleared on verification (agent leads, NOT bugs):** `token-awareness-sidecar.mjs:144` reads `stats.keptOnClaude` correctly (local var is merely *named* `kept`); `slot-queue.mjs:68` defensively handles both array and object claim shapes (`Array.isArray(...) ? ... : Object.values(...)`). Both were unverified mid-stream agent guesses -- confirmed false-positive by reading the code.
- **Coverage caveat (honest):** the first engines/scripts arm truncated mid-sweep; a re-run (below) covered the 6 highest-fanout state files.

### schema-read-blindness re-run (high-fanout state files) -- 1 MORE CONFIRMED + FIXED (U-SBF-5), 2 cleared
Focused sweep of the 6 highest-fanout state files (BUILD_STATE, MILESTONE_PROGRESS, roadmap-index, chat-slots, ollama-offload-stats, slot-task-claims) + their readers, every claim verified by hand:
- **unit-knowledge-pack-inject.mjs `readActiveClaim` -- FIXED (`U-SBF-5`).** Read `root.claims[slot]` keyed by the NATO slot name, but `slot-task-claim.mjs` keys `claims` by **unitId** (`store.claims[unitId]`); each row carries its owning `.slot`. So the lookup ALWAYS returned null -> the UserPromptSubmit "unit knowledge pack" injector **silently no-op'd in production** (never once injected). Worse, the **test fixtures encoded the same wrong shape** (`claims: { charlie: c }`) so the suite was green-but-blind, and the "real-data E2E" passed trivially because the live claims file is usually empty -- the feature never worked. Fix: resolve by each row's `.slot` field (freshest-by-heartbeat wins); corrected both test fixtures to the real unitId-keyed shape + added a regression test pinning real-shape-found / bug-shape-not-matched. Validated: **35/35** tests.
- **Cleared on verification (NOT bugs):** `consolidate-roadmaps.mjs:117` reads `roadmapIndex.milestones` -- the live `roadmap-index.json` DOES have a top-level `milestones` array (agent had only read 60 lines); the `Array.isArray()` guard handles it. The `MILESTONE_PROGRESS Object.values(array)` smell is harmless (returns the elements). BUILD_STATE / chat-slots / ollama-offload-stats readers all MATCH.

### P1-4 hook triage -- COMPLETED (classified; deliberately NOT bulk-wired)
Re-counted: **303 unwired** (not 363 -- the earlier number predated some wiring) split into **71 retired** (superseded/archive shape), **46 orphaned-intended safety gates** (e.g. critical-file-guard, git-anti-clobber, leave-a-copy-behind-guard, stop_on_uncommitted_critical), **186 ambiguous**. **Decision: do NOT blind-bulk-wire the 46.** Each is high-blast-radius (most are PreToolUse/Stop BLOCKING gates) and needs per-hook false-positive validation before wiring -- a blind bulk-wire would itself be the "built but breaks things" failure this audit hunts. Scoped as a per-hook milestone (golf), not a one-turn action. The 71 retired should be relocated to `hooks/_archive/` so the on-disk count reflects reality.

### P1-2 durable follow-up -- CLOSED (U-SBF-4)
`regen-viz.mjs` now **verifies the find-cache artifact is actually fresh** (`find-cache.mtime >= graph.mtime`) instead of trusting the spawn's exit code, **retries once** on failure/staleness (the proven failure mode is transient), and surfaces persistent staleness as `findCacheDegraded=true` in the run summary + a loud recovery line -- closing the silent rot where a 0-exit-but-stale build left find-cache STALE while the graph went FRESH (the very cold-parse-timeout the eager build exists to prevent). Validated: syntax-clean + the freshness predicate reads `true` on live data. In-domain (sierra owns system-viz).

### Net this session
6 bug-fix commits: `4f27713e3e` (P1-1 breaker + P2-1 timeout), find-cache rebuild (P1-2 immediate, no commit -- gitignored sidecar), `f1d1e45031` (MemorySyncEngine DOA), `1ce8f1da26` (3 schema-blind hooks), `0157512132` (U-SBF-4 regen-viz find-cache self-verify/retry, P1-2 durable + audit doc), U-SBF-5 (unit-knowledge-pack claim lookup, 35/35). Plus earlier: Qdrant singleton connect + scrutiny-gate reviewer/code-analyzer agents. Confirmed schema-blind bugs this session: **5 fixed** (1 engine DOA + 3 hooks + 1 injector), 2 documented (design-needed / orphaned-intended), 4 agent leads cleared as false-positive on manual verification. All validated with real tests/measurements, never "looks fine".
