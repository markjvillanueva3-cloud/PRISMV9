---
title: Meta-systems utilization truth-harness — is-it-USED probe + 3 phantom-green bug classes
slug: meta-systems-utilization-truth-harness-2026-06-22
galaxy: hermes-zulu
slot: zulu
created: 2026-06-22
tags: [zulu, harness, utilization, ollama, octopus, obsidian, hermes, phantom-green, recency-gate, R8, R12, R16]
---

# Meta-systems utilization truth-harness — is-it-USED probe + 3 phantom-green bug classes

Synthesized from a zulu session (2026-06-22, `6f0bf387e5` + harden) that extended
`scripts/reconcile-zulu-ledger.mjs` with a **META-SYSTEMS UTILIZATION** block (ollama / hermes /
octopus / obsidian) and fixed two phantom verdicts. The bug classes below are transferable to ANY
"is this subsystem healthy / used / done" probe.

## The pattern: separate "is it BUILT" from "is it USED"

A reconciler/health-harness that only answers *is X built* mis-routes the fleet, because the
operator's recurring question is *is X actually USED now*. Add a parallel axis of **pure grade
functions** (`gradeXUtilization(parsedArtifact) -> {system,status,evidence,action}`,
status ∈ UTILIZED | UNDER-UTILIZED | DOWN) that READ EXISTING artifacts (offload-stats,
consensus-queue jsonls, synthesis corpus) and AGGREGATE them into the orchestrator's own sidecar —
naming the deep-dive tool in `action`. This is additive, not a duplicate dashboard (R8): the
dashboard owns the rate math; the harness owns the one-line liveness verdict the orchestrator reads.

## Bug class 1 — mtime ≠ staleness (phantom-OPEN)

`checkSynthesisFreshness` gated "is the reflection arm fresh" on **mtime < 24h**. But the canonical
staleness of a galaxy synthesis is **hash-based** (`galaxy-synthesis-refresh.mjs`: stale only if the
memory CLUSTER changed). An old mtime just means "no new memories", NOT stale content — so a quiet
but fully-current corpus (34 present, 0 need re-synthesis) read only 20 mtime-fresh → **false OPEN**.
**Fix:** gate on COUNT (corpus populated); demote mtime to informational evidence; delegate
content-staleness to the hash-based cron. Same class as the A-06 wrong-path phantom this same harness
once carried.

## Bug class 2 — lifetime monotonic counters read UTILIZED forever (phantom-green)

`offloaded` (since lastReset) and `consensus-queue-processed.jsonl` (append-only, never rotated) are
**lifetime cumulative**. Gating `UTILIZED` on `count > 0` means a lane that died weeks ago still reads
green. The question is a **recency** question. **Fix:** gate on recency — `stats.lastUpdated` freshness
for ollama; newest **drain** timestamp (`newestJsonlTs`) for octopus — within a named window
(`META_RECENCY_H = 48`). A drain fallen >48h behind a growing queue now reads UNDER-UTILIZED. (Caught
a live octopus drain 45.5h behind — within window, but the harness now WILL flag it if it crosses.)

## Bug class 3 — wrong fail-soft direction (torn artifact → false-green)

`newestJsonlTs` parsing only the LAST line returned `null` on a torn/partial final line (crash
mid-append) → `lastDrainAgeH=null` → the octopus grade skipped the "fell behind" branch → **false
green for a stalled drain**. A truth-harness must fail toward NEEDS-ATTENTION, never green. **Fix:**
walk BACKWARD to the newest parseable record; treat unknown recency atop a backlog as UNDER-UTILIZED;
key drain-recency on `drained_at` only (an enqueue-`ts` fallback understates staleness → false-green).

## Meta-lesson — VERIFY before you BUILD kills phantom builds (R8/R12)

The stale `ZULU-MASTER-CONTEXT-LEDGER` listed "wire octopus `consensus_ask` to 7 dispatchers" (A-04)
as open. A 2-grep verification showed it is **built + centralized** in `aiReasoningDispatcher`
(OCTOPUS-NEURAL-MS0) and intentionally **WIRE-EXEMPT** — spreading it to 7 dispatchers would be a dedup
anti-pattern. Three of the work-order's named "gaps" (octopus A-04, ollama 17.9%, zulu-opt-in bug) were
**stale-ledger phantoms**. Always run `node scripts/reconcile-zulu-ledger.mjs` ($0 live probe) BEFORE
trusting any ledger's ROI order. Related: [[zulu-ledger-reconciler]] · [[feedback_read_full_content_not_titles]] · memory [[reference_zulu_meta_systems_utilization_probe_2026_06_22]].
