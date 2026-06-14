---
name: reference_galaxy_context_federation_compact_2026_05_31
description: "GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-COMPACT (shipped 2026-05-31, slot alpha) — Phase A complete: per-galaxy MEMORY.md size-watchdog + pointer-compression advisor. Candidacy = over-budget size OR card no-delta; truncation is NOT a signal. Found quoting at 90KB (critical)."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.124Z
aliases: reference_galaxy_context_federation_compact_2026_05_31
---


**GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-COMPACT** (shipped 2026-05-31, slot alpha) — 6th federation unit,
**Phase A complete** (U-GCF-CARD + U-GCF-SALIENCE + U-GCF-COMPACT). Sisters:
[[reference_galaxy_context_federation_rollup_2026_05_31]], [[reference_galaxy_context_federation_salience_2026_05_31]].

**What it is:** a per-galaxy MEMORY.md **size-watchdog + pointer-compression advisor** — the 24 KB master-ceiling
lesson applied per galaxy. Measures every `mcp-server/src/engines/<g>/MEMORY.md`, cross-references card-distillation
health (no-delta, READ from MASTER-DIGEST.json — R8), ranks COMPACTION CANDIDATES with the MEMORY-ARCHIVE
pointer-compression suggestion. **ADVISORY ONLY (R12)** — never rewrites the peer-locked galaxy MEMORY.md.

**Shipped:** `scripts/lib/galaxy-memory-watch.mjs` (pure-core + injected-deps + fail-soft; reuses CEILING_BYTES
from memory-size-watch.mjs + DEFAULT_ROOTS; 24 `node:test`), `scripts/galaxy-memory-watch.mjs` (CLI, cron exit
codes 0/1/2). Sidecars (regenerable, NOT committed): `state/shared/galaxy-cards/MEMORY-WATCH.{md,json}` + history jsonl.

**Real fleet (live):** 34 galaxies, **2 candidates** — `quoting` (90,139 B = 3.7× the master ceiling, **critical**
+ no-delta) and `post-processor` (no-delta at 8 KB). The 32 healthy galaxies correctly clean. This is exactly the
set U-GCF-ROLLUP's honest `(no delta)` rows flagged — COMPACT closes that loop. 2-reviewer scrutiny: round-1 arm B
FAIL → fix → round-2 PASS/PASS.

**How to apply / lessons:**
1. **Run the REAL build before trusting the signal (recurring lesson, 3rd time this session).** The first cut used
   `cardTruncated` as a candidacy signal → the live run flagged **32/34** galaxies. A 1 KB card being truncated is
   its NORMAL operation (most galaxies have >1 KB of salient facts) — truncation ≠ a problem. The precise signal is
   `cardNoDelta` (`hasDelta===false`): only quoting + post-processor. Dropped truncation from candidacy → 2 honest
   candidates. The hermetic tests all passed BOTH before and after — only running the real build exposed the noise.
   Added a fail-on-revert test pinning "truncation is NOT a candidacy signal".
2. **A test must NEVER do real filesystem IO (arm-B P1, round 1).** The "watch(null) never throws" test fell through
   to the real `fs.writeFileSync`/`appendFileSync` (no injected deps) → mutated the production MEMORY-WATCH sidecars
   + grew the real history jsonl every run (non-hermetic, non-deterministic, slow). Fix: split into (a) a disable-knob
   path (`PRISM_GCF_COMPACT_DISABLE=1` returns before any write → tests the null-coercion type-guard hermetically) +
   (b) a fully-injected no-op-writer path. Empirically verified byte-identical artifacts across two suite runs.
   Lesson: every `watch()`/orchestrator call in a test either sets the disable knob OR injects no-op writeImpl+appendImpl.
3. **Surface a conflated rationale, don't paper over it (R7/R12, arm-B P2).** Reusing the master's 24576 ceiling
   (R8) is fine as a hard line, but the operator-facing wording implied a *truncation cliff* — which doesn't exist
   for a galaxy brain (NOT auto-loaded fleet-wide, unlike the master MEMORY.md). Reworded: size is a DISTILLATION-COST
   proxy; `cardNoDelta` is the direct distillation-failure detector (post-processor flagged at only 8 KB proves size
   isn't the whole story).
4. **Single-writer-per-file again:** COMPACT writes ONLY its own MEMORY-WATCH.{md,json} + history — never a galaxy
   MEMORY.md, never INDEX.json. Same discipline as ROLLUP (own sidecar, never co-write a peer's file).

Knob: `PRISM_GCF_COMPACT_DISABLE=1`. Wiki: [[galaxy-context-federation]]. PSN [[feedback_psn_definition]].
