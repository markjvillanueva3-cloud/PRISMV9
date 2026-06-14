# Golf Galaxy (fleet-hygiene) — Work-Queue Completion Plan (v2, ultracode-refined)
**Generated:** 2026-06-09 (slot golf, session c7361c9f) · **Goal:** finish all open golf units, staging grunt work on Ollama when viable.
**Method:** Ollama `gpt-oss:120b` deep-read 43 golf handoffs + CLOSE-OUT-DEFERRED → 14 candidates; Claude reconciled; **bounded 3-lens ultracode brainstorm (`wf_cfbf3c86-4c4`, 3 agents, no rate-limit) did repo-verified ground-truth pulls** that corrected v1 (phantom symbols, already-shipped guards, a hidden P0). This is the finalized plan.
**Status:** v2 final. Advisory plan — each build unit still passes per-file 2-agent scrutiny + the 3-of-3 Stop gate.

> ⚠ **LIVE UPDATE (2026-06-09 ~14:01, mid-plan):** **G3 (tribal-index write-side sharding) was SHIPPED by papa** — `caf3bcbc30 U-TRIBAL-SHARD-WRITER` (`write-tribal-index.mjs` monolith<480MiB + N shards+manifest, manifest-aware loader, `writeIndex` delegates, 12/12 writer + 10/10 loader tests, live-validated on the 159.9MB monolith). **G3 disposition BUILD → VERIFY-ONLY:** golf's residual is the live >480MiB round-trip THROUGH `tribal-rerank.mjs` that papa explicitly deferred (the shard path can't trigger until the wiki re-embed regrows the index past 480MB; papa validated only the unchanged monolith path live). **DO NOT rebuild G3** — coordinate with papa (operator's standing "coordinate with bravo and papa"). Fleet moves fast: re-verify each unit's shipped-state at pickup.

---

## Repo-verified ground truth (load-bearing corrections from the ultracode pass)
1. **`state/shared/.active-chat-boost/` does NOT exist** (0 stamps). Boost is the `active-chat-priority-{boost,decay}.mjs` hooks + a single `.fleet-reaper-bg-throttle.json` stamp whose cleanup (`unlinkSync`) is ALREADY at `fleet-reaper-sweep.mjs:1682`. → the v1 "boost-stamp janitor" was specced against a phantom dir.
2. **`selectSoftReliefTargets` has 0 grep refs** (phantom symbol) AND `fleet-reaper-soft-relief-v2.test.mjs` already exists (19+ tests incl. "reap-path candidates excluded even when V2 active"). → the boost-exclusion guard is largely covered.
3. **70 worktrees registered; `git worktree prune --dry-run` = 0 prunable.** → "broken .git dirs" is unconfirmed; the real issue is COUNT/staleness, not breakage.
4. **22,218 untracked files** confirmed (no `core.excludesfile` set) → noise-filter is REAL + high-ROI.
5. **Docker guard + scheduled-task partitioning + MCP concurrency all shipped this week** (`docker-service-health-{check,stop}.mjs`, fleet-task-health 39-task enum, `ed94bc479f`+`54efb82485`) → those raw items downgrade to VERIFY-ONLY.
6. **HIDDEN P0 promoted:** tribal-index WRITE-side sharding — the 2026-06-08 fix closed the READ path + clobber-guard, but the WRITE side (`JSON.stringify` of a >512MiB object) still throws; appending needs sharding. PSN leg #5, golf-domain, unshipped.

---

## CORRECTED GOLF UNIT SET — 9 golf (4 build + 5 verify) + 5 hand-offs + 1 hidden P0

### BUILD (genuine, in-domain, net-new)
| ID | Unit | Effort | Ollama staging | done = |
|----|------|--------|----------------|--------|
| **G1** | Noise-filter `settings.json`/`core.excludesfile` exclusions (22,218 untracked verified) | S | **yes** — 1.5b bulk-classifies `git status --porcelain` into cache/tmp/node_modules/build/log/genuine-source buckets; 32b drafts the exclusion diff; **Claude confirms no real source is hidden** (silent-untrack risk) before apply | `git status` untracked drops below threshold; 0 tracked/real asset excluded |
| **G2** | gpt-oss model-pull durability smoke-test automation | M | **yes** — it IS an ollama probe; 32b writes the `/api/generate` per-model runner + pull-durability check; Claude owns pass/fail thresholds + cadence wiring | a killed `ollama pull` resumes; smoke asserts the model answers post-resume |
| **G3** | **Tribal-index WRITE-side sharding [HIDDEN P0]** (V8 512MiB cap; PSN leg #5) | L | **partial** — 120b proposes the shard schema; **Claude owns the atomic torn-write + fail-loud guard** (clobber-class file — see [[reference_tribal_index_v8_string_cap_2026_06_08]]) | a wiki Write appends an embedding with index >512MiB without throwing; round-trips THROUGH `tribal-rerank.mjs` on a real >512MiB index (R15 live-data, not just unit-test) |
| **G4** | Worktree consolidation + slot adoption U-FGC-3 (**merge of raw 1+6**; 70 registered worktrees) | M | **no** — pruning/cutover is multi-chat-contention judgment; 1.5b only classifies per-slot adoption state (worktree? `slot/*` branch? hooks armed?) | registered-vs-active reconciled; dead/stale pruned (archive-not-delete); all 26 slots route to `slot/<name>` with 0 main-tree leaks over a fleet day |

### VERIFY (premise-gated or likely-shipped — confirm before any build; do NOT rebuild)
| ID | Unit | Action | Ollama |
|----|------|--------|--------|
| **G5** | Reaper boost-stamp lifecycle (**merge raw 3+4**) | **VERIFY-FIRST**: does any code path create `.active-chat-boost/`? If never populates → CLOSE (no-op). If yes → janitor + the one named invariant test (boosted PID never in soft-relief output) in ONE commit (R15). | 1.5b dumps candidate reaper symbols; Claude picks the real one + owns the safety assertion |
| **G6** | Docker/qdrant/postgres/ollama health-probe gap-fill (raw 7) | **VERIFY→scope-down**: enumerate which services the shipped guard misses a health probe for; fill ONLY a proven gap. Soul: NEVER auto-restart the Docker daemon. | 1.5b diffs guarded-list vs compose |
| **G7** | Scheduled-task audit (raw 8) | **VERIFY-ONLY** (~20 min): fleet-task-health already enumerates 39 tasks; confirm no DISABLED task is silently expected-to-run (recall the 7-disabled-crash-critical regression `2bc54961b`); Zombie-Reaper-v2 = intended-superseded. Flip envelope. | 1.5b labels active/disabled/superseded; 120b reasons supersession chains |
| **G8** | E2E eval-suite / golf-reviewer-eval verification (U-CLEANUP-B9) | **VERIFY-leaning**: corpus round-trips with REAL metrics; slope/floor alerts fire on a seeded regression. | 1.5b/32b run cases as eval subject; **scrutiny synthesis stays Claude-only** |
| **G9** | MCP :3100 + `.cron-locks` + watchdog-consumption sweep **[HIDDEN]** | **VERIFY**: post-`1297b0a8f5` the disconnect loop is quiet; orphan cron/chat-slots locks swept; fleet-memory-monitor/fleet-task-health advisories are actually consumed (advisory-noise was a live 2026-06-09 concern) | no |

### HAND-OFF (NOT golf-core — route to owner, do not build in golf)
| Raw # | Item | Owner | Why not golf |
|-------|------|-------|--------------|
| 11 | Scoped-skill path-glob | **alpha** | skill-trigger + galaxy doctrine is alpha-owned |
| 12 | Context-cascade per-subdir CLAUDE.md | **alpha** | Bibryam cascade = alpha's DOMAIN-GALAXY-DOCTRINE |
| 13 | LSP symbol-lookup hint | **papa** (backend) | MCP dev-tooling, not hygiene |
| 10 | Combo-efficiency dashboard | **quebec** (UI) + golf supplies data | dashboard-build is frontend; golf owns the metric source only |
| 9 | CAMP triage close-out | **operator / originator** | undefined scope; soul-refuse not-my-galaxy creep — mark `[HANDOFF: needs-owner]` |

---

## Dependency-ordered execution (reconcile-lens spine + blast-radius)
1. **G7, G9** (verify-only, no build) — clear the board / confirm premises. ~30 min, parallel.
2. **G5** (verify boost-stamp premise) — GATES whether any reaper build happens. Empty dir → close.
3. **G1** (noise-filter) — independent, high-ROI, Ollama-staged; unblocks faster `git status` for everything after.
4. **G6** (docker probe gap-fill) — independent, Ollama-staged.
5. **G2** (gpt-oss smoke) — independent, Ollama-staged; de-risks every gpt-oss-as-SUT unit.
6. **G4** (worktree consolidation) — after G1 cuts git noise (needs a clean tree to reason about 70 worktrees safely).
7. **G3** (tribal-index sharding) — **last + heaviest**; read-loader foundation already proven, design the write-sharder on top (R13 logical order). Live-data round-trip mandatory (last 2 tribal regressions were silent-total-destruction).
8. **G8** (eval-suite verify) — terminal verification gate over the batch.

**Blast-radius rationale:** reaper-safety items can crash live chats (reap a working session) → first, on a proven foundation. Reliability (docker/ollama) fails safe (degrade, not crash) → middle. Hygiene/eval is idempotent + recoverable → last.

## Ollama-staging doctrine (per [[feedback_utilize_ollama_for_efficiency]])
- **1.5b** — bulk classify (path/stamp/task labeling, the 80%-by-volume jobs).
- **qwen2.5-coder:32b** — all code/test scaffolds (exclusion diff, smoke runner, glob matcher, guard diffs).
- **gpt-oss:120b** — sparingly: shard schema (G3), supersession reasoning (G7), self-judge smoke (G2).
- **Claude NON-NEGOTIABLE on 5 axes:** (a) any destructive/reap/unlink/disable op, (b) dispatcher/hook wiring, (c) scrutiny-gate synthesis + 3-of-3 marks, (d) test-*intent* authoring (R9 — the invariant itself), (e) fact-checking Ollama drafts against real file:line before commit (R12). Ollama drafts/reads/classifies → Claude decides/wires/gates. Per-file 2-agent scrutiny + 3-of-3 stay 100% Claude (Ollama may be an advisory pre-flight arm only, never marks the ledger).

## Iter-2 execution log (2026-06-09)
- **G7 (scheduled-task audit verify) — DONE + FIX SHIPPED.** Found `PRISM Zombie Reaper v2` (a `CRASH_CRITICAL_TASKS` member + `/fleet-reaper` Step-0 supporting reaper) **wrongly DISABLED** — the all-session cry-wolf WARN was CORRECT. Re-enabled + kicked it (non-elevated, golf owns it): `crashCritDegraded [Zombie Reaper v2]->[]`, healthy 44->45/50. **R12 self-correction:** my earlier-session "it's superseded, don't re-enable" was unverified + WRONG (see [[reference_golf_g7_zombie_reaper_reenabled_2026_06_09]]). Remaining WARN = only `Blueprint OCR Batch` (stale 3.5d, **xray-domain**, non-crash-critical - flagged for xray, not golf-core).
- **DEEP-READ COMPLETENESS VALIDATION (gpt-oss:120b over the full 174KB corpus = 43 handoffs + 31KB consolidated cross-session threads).** Surfaced 10 candidates; verified each → ALL stale/shipped/other-domain/already-present: U-FH02 reaper-observability files EXIST (6 present), U-MCP-FACTORY shipped `1297b0a8f5`, U-RAG-1 race diagnosed + papa's shard-writer (folds into G3), rest are juliett/alpha/papa/delta domain. **0 genuine new golf gaps → the 9-unit plan is COMPLETE.**
- **NEW G10 [hidden, surfaced by G7] - crash-critical-task auto-re-enable guard.** Disabled crash-critical reapers is RECURRING (precedent `2bc54961b` re-enabled 7; this was the 8th). Proposed: a guard that detects a DISABLED `CRASH_CRITICAL_TASKS` member and auto-re-enables (or surfaces an elevated one-liner), wired into the fleet-task-health Stop hook -> the WARN self-heals instead of nagging. Root-cause of WHAT disables them still open.

## Iter-3 drift re-validation (2026-06-09)
- **Ollama `gpt-oss:120b` drift-check** (this turn, over the last 20 golf commits + plan): **SHIPPED** = G3 (papa's tribal sharding), G7 (sched-task audit + Zombie Reaper v2 re-enable), G9-MCP-leg (:3100 verified healthy, 6.4h uptime). **STILL OPEN** = G1, G2, G4, G5(verify-gate), G6, G8, G9-rest (cron-lock + watchdog-consumption), G10. No new golf-domain gaps in the commit drift.
- **Ultracode re-brainstorm** `wf_a71638f9-b1b` (w2t68mu3k, 2 lenses: sequence + Ollama-staging) launched to re-order ONLY the remaining open units for budget-constrained iters; folds async.
- **MCP concurrency-harden** (`U-MCP-CONCURRENCY-HARDEN`) confirmed live-on-next-restart: `/health.inflight=undefined` => server still on the pre-change bundle (6.4h uptime); activates on next supervisor recycle — NOT force-restarting (would disconnect the fleet).

## Next /loop iters (budget-aware — ultracode `wf_a71638f9-b1b` re-sequence, folded)
- **Build-iter A:** ~~G5~~ **CLOSED-REDUNDANT (iter-4, 2026-06-09 post-compact)** — `active-chat-priority-decay.mjs` is ALREADY the TTL janitor (`pickExpiredStamps` sweeps every `expiresAt<=now` stamp incl. pid-less crashed-chat orphans, on EVERY Stop fleet-wide); `active-chat-priority-boost.mjs:102` always writes a finite `expiresAt` (ttlSec clamp [60,1800]) so the lone malformed-stamp leak cannot occur. The FLEET-REAPER-MS4 boost-stamp-janitor CLOSE-OUT-DEFERRED premise was stale → reap it. A second janitor would duplicate decay.mjs (DRY). [[reference_golf_g5_boost_janitor_redundant_2026_06_09]]. ~~G1~~ **CLOSED-PREMISE-CORRECTED (iter-4)** — R12 fail-loud: the 22,302 untracked lines (= 75,233 files) are NOT noise, they're a genuine fleet-wide UNCOMMITTED BACKLOG (16,662 wiki/tribal = alpha's domain w/ 17,472 ALSO tracked; 68 real src .ts; 648 milestone envelopes). No safe broad exclusion (`*.hash` 56 tracked, `*.out`/`*.err` tracked members, tracked source trees). Golf quarantined ONLY 51 verified-zero-tracked ephemeral strays (`.tmp-*`/`*.pid`/scrutiny/audit/commit-msg) to LOCAL `.git/info/exclude` (reversible, unmirrored); knowledge-tracking DEFERRED to operator policy (matches pre-existing golf 05-30 quarantine note). HAND-OFF: wiki corpus→alpha, src→galaxy owners, operator sets tracking policy. [[reference_golf_g1_untracked_is_backlog_not_noise_2026_06_09]]. ~~G10~~ **SHIPPED** (U-GOLF-G10 + U-GOLF-G10-HARDEN): `selectReenableTargets`+`reenableTasks` wired into `runOnce`, `buildAdvisory` surfacing, knob `PRISM_FTH_AUTO_REENABLE_DISABLE=1`, Enable-only (soul-safe), 14 tests, R15 live (real Task Scheduler round-trip), 3-of-3 PASS + arm-C P2 try/catch hardening applied. Inline drift-close +4 `KNOWN_PRISM_TASKS` → 86/86. [[reference_golf_g10_autoreenable_guard_2026_06_09]]. **build-iter-A COMPLETE (G5,G1,G10).** Remaining open: G2, G4, G6, G8, G9-rest (build-iters B+C — next /loop). G2 (gpt-oss pull smoke-test) for a later iter.
- **Build-iter B:** ~~G9-rest~~ **CLOSED (iter-5, 2026-06-09 post-compact #2)** — cron-lock board clean (0 orphans: root `.cron-locks/` empty, `state/shared/.cron-locks/` only `.gitkeep`); watchdog-consumption PROVEN LIVE (this session's Stop hook consumed the fleet-task-health WARN); MCP :3100 already verified healthy. ~~G6~~ **SHIPPED (U-GOLF-G6-OLLAMA-HEALTH-ARM)** — native-ollama :11434 Stop-advisory arm in `docker-service-health-stop.mjs` (`buildOllamaAdvisory`+`ollamaNativeProbe`, probed UNCONDITIONALLY so docker-down doesn't suppress it; cheap /api/tags + reachable===false gate = no cry-wolf; 11/11 tests incl 4 IO failure-mode via injected fetch; R15 live-proven: healthy=silent, closed-port=fires, docker-down-doesn't-suppress; 2-agent scrutiny PASS+PASS, P1 doc-drift + P2 naming/IO-coverage addressed). [[reference_golf_g6_ollama_health_arm_2026_06_09]]. ~~G10~~ **SHIPPED iter-A** (auto-re-enable guard). **build-iter-B COMPLETE (G9,G6,G10).** Remaining open: **G2** (gpt-oss pull smoke-test) + build-iter-C (G8, G4).
- **Build-iter C:** G8 (golf-reviewer-eval E2E; 1.5b synth fixtures, Claude judges correctness), then G4 alone (70-worktree consolidation, L, spills its own iter).
- Each multi-file build: per-file 2-agent scrutiny + 3-of-3. Hand-offs (alpha/papa/quebec/operator) posted to chat-bus. **Open a build only in fresh/green context** (R6 — not at YELLOW).
