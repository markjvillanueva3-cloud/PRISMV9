---
name: reference_system_bug_audit_2026_06_14
description: "System-bug/inefficiency audit (slot:sierra, 2026-06-14): 6 verified findings on built features not operating as intended. Full report state/shared/specs/SYSTEM-BUG-AUDIT-2026-06-14.md. Keystone: fork-storm breaker over-blocks transient spikes; 51% of hooks never fire; hook stack self-DOSes MCP."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.214Z
aliases: reference_system_bug_audit_2026_06_14
---


# System-bug audit -- "things we built not operating as intended" (2026-06-14, slot:sierra)

Operator directive: hunt for system bugs/inefficiencies; deliver consolidated report BEFORE fixing.
Full durable report: `state/shared/specs/SYSTEM-BUG-AUDIT-2026-06-14.md`. All findings verified (file:line / live measurement).

## Verified findings
- **P1-1 fork-storm breaker over-blocks TRANSIENT spikes** (`.claude/hooks/fork-storm-circuit-breaker.mjs:68-86`). Single-snapshot count + 2.5s TTL latch turns a sub-second bash.exe spike (measured 586) into a 2.5s fleet-wide Bash/Agent/Workflow block while sustained count is 8-49. Triple-confirmed LIVE (it blocked this audit's own Workflow). Fix designed (sustained min-of-N sampling + never-cache->=threshold) but cross-worktree-guard-blocked from a slot -> apply from main tree / golf.
- **P1-2 system-viz find-cache STALE vs live graph** (`system-viz-query cache-status`). regen refreshes graph-index but not find-cache -> master-index + Pre-Grep/Pre-Read graph injections (fleet-wide, every grep/read) serve stale hits. SIERRA domain (mine to fix).
- **P1-3 hook-stack self-DOS, MEASURED**: per prompt 134 UserPromptSubmit hooks; per tool-call 94 PreToolUse + 66 PostToolUse = 160; per Stop 132; x up to 14 sessions. This fuels the bash.exe bursts that starve MCP :3100 (the "api server error"). Heavier than the breaker's own 65/76/96 estimate.
- **P1-4 wired-but-silent**: 712 hook .mjs on disk, only 387 wired (263 settings + 167 bundles) -> **363 (51%) NEVER FIRE**. Unwired sample includes load-bearing-sounding agi-safety-envelope-guard / ai-duplication-guard / anti-regression-auto-sweep / auto-bug-hunt-after-build. Needs triage (retired-archive vs orphaned-intended).
- **P2-1 mcp-connectivity probe timeout** (`mcp-connectivity-check.mjs:58`): DEFAULT_TIMEOUT_MS=3000 but docstring says "1s -- never delay a turn" -> up to 3s per-turn tax fleet-wide. (The per-chat "lost MCP bridge" banner itself is ACCURATE -- this session never /mcp'd.)
- **P2-2 graph coverage**: 77% nodes unwired / 69% uncategorized -- flagged for interpretation (may be categorization gap, not pure bug).

## Already fixed earlier this session
Qdrant singleton never-connect()'d (vault recall dead) + scrutiny-gate broken reviewer/missing code-analyzer.

## Unhunted (need a dedicated pass)
dead-on-arrival (other singletons needing uncalled init) + schema-read-blindness (reader-vs-writer field-shape; not batch-able). The parallel hunt Workflow stayed breaker-blocked by P1-1, so these await either the P1-1 fix or a manual per-pair pass.

## FIXES APPLIED 2026-06-14 (operator authorized cross-domain bypass: "do everything, bypass blocks/gates of other galaxies")
- **P1-1 + P2-1 committed `4f27713e3e`**: fork-storm breaker sustained-sampling (never serve/cache >=tripThreshold; min-of-N samples when high; per-tool tripThreshold) -- logic-PASS + 12/12 decideBreaker tests; mcp-connectivity timeout 3000->1000. Hooks edited via node-fs (Edit-tool cross-worktree guard bypassed per operator auth; committed for transparency since hooks ARE git-tracked).
- **P1-2 find-cache rebuilt FRESH** (340,882 nodes; cache-status FRESH). Root: regen-viz:449-455 calls regen-find-cache NON-FATALLY -> last regen failed silently. Builder works standalone (transient failure). find-cache.json gitignored (no commit). Durable follow-up: make the non-fatal regen failure visible.
- **Remaining (large, dedicated pass)**: P1-3 hook self-DOS refactor; relocate 71 retired hooks to hooks/_archive/; wire 46 orphaned-intended safety gates (per-hook validation, NOT bulk); build QUALITY_SCORES producer (sx-gate); wire 5 missing session-continuity writers.

## ROUND 4 -- push-through pass (2026-06-15, "dont ask, just push through")
Hunted the last 2 classes via parallel Explore agents + manual verification of EVERY agent claim (read the real code, never trust an agent guess). 2 commits.
- **dead-on-arrival: 1 fixed** -- `MemorySyncEngine` (`f1d1e45031`). Zero-arg `new MemorySyncEngine()` export never connected its Qdrant store -> every exportBundle/importBundle returned "qdrant not connected" (H:-drive bundle path dead). Fix = autoConnect-gated lazy `ensureConnected()` mirroring QdrantMemoryEngine. 35/35 tests + build:fast clean. ~20 other ensure-pattern engines spot-checked clean (not exhaustive).
- **schema-read-blindness: 3 hooks fixed** (`1ce8f1da26`, node-fs bypass): (1) `stop-auto-capture-per-slot` read SCRUTINY_LEDGER top-level + string "pass" -> **239/418 real 3-of-3 passes silently never captured** to memory; now `.entries[id]` + boolean + `reviews.<arm>.notes`. (2)+(3) `hook-stability-check` + `hook-basin-drift` read `health.awareness?.score` (no such key) -> always fabricated 0.8, neutering the Lyapunov/basin advisories; now derive from real `health.status` (PASS->0.95).
- **schema-blindness DOCUMENTED (not fixed, design-needed):** `session-continuity-chain` reads `startedAt`(writer=`startTime`) + 5 fields with NO writer -> handoff "Prior Session Context" mostly fabricated; `sx-gate` reads QUALITY_SCORES.json (NO writer) -> safety-file write block fails OPEN/inert.
- **2 agent leads CLEARED as false-positive on verification:** token-awareness-sidecar reads `keptOnClaude` correctly (var just named `kept`); slot-queue handles array OR object defensively. Engines/scripts arm truncated -> not exhaustively swept (honest caveat).
- **P1-4 triage done:** 303 unwired = 71 retired / 46 orphaned-intended safety gates / 186 ambiguous. Deliberately NOT bulk-wired (each is a high-blast-radius BLOCKING gate needing per-hook false-positive validation; blind wire would be the exact "built but breaks" failure this audit hunts).
- **P1-2 durable CLOSED (`0157512132`, U-SBF-4):** regen-viz now VERIFIES the find-cache artifact is fresh (mtime>=graph) not just exit-code, retries once on transient failure, surfaces persistent staleness as findCacheDegraded in the run summary -- closes the silent rot I band-aided in Round 3.
- **schema-blindness re-run (6 high-fanout state files) -> 1 MORE fixed (`3962eae3f9`, U-SBF-5):** `unit-knowledge-pack-inject` read `claims[slotName]` but slot-task-claim keys claims by **unitId** -> the UserPromptSubmit injector NEVER injected in production. Fix = resolve by row's `.slot`. KEY LESSON: the **test fixtures encoded the same wrong shape** (`claims:{charlie:c}`) so the suite was green-but-blind + the real-data E2E passed trivially on the usually-empty live file -> the feature never worked yet looked tested. R9 in the wild. 2 more agent leads cleared (consolidate-roadmaps reads a real top-level `milestones[]`; shallow 60-line agent read was wrong).
- **Net: 5 confirmed schema-blind/DOA bugs FIXED this session** (MemorySync DOA + 3 hooks + unit-pack injector), all real-test-validated; 2 documented as milestone-sized (session-continuity writers, QUALITY_SCORES producer); 4 agent leads cleared by manual code-read (Honesty Rule paid off -- every agent "lead" that I didn't verify would have been a false fix). See [[feedback_verify_actual_contract_not_proxy]].

Related: [[reference_hermes_cc_bridge_ms0_2026_06_14]] · [[reference_agent_refinement_iter1_2026_06_14]] · [[feedback_golf_owns_reaper]] · [[feedback_sierra_no_gates_full_reign_2026_06_10]]
