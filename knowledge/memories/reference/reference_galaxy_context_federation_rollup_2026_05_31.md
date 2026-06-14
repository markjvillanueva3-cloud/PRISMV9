---
name: reference_galaxy_context_federation_rollup_2026_05_31
description: "GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-ROLLUP (shipped 2026-05-31, slot alpha) — Phase B feed-up: rolls the 34 per-galaxy cards UP into ONE salience-ranked master fleet-context digest (MASTER-DIGEST.md/.json), consuming the U-GCF-SALIENCE scores from INDEX. Single-writer sidecars (never INDEX.json)."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.125Z
aliases: reference_galaxy_context_federation_rollup_2026_05_31
---


**GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-ROLLUP** (shipped 2026-05-31, slot alpha) — 5th federation unit
(after U-GCF-CARD, U-GCF-CAG-CARDS, U-GCF-XGALAXY-INJECT, U-GCF-SALIENCE — see
[[reference_galaxy_context_federation_salience_2026_05_31]], [[reference_galaxy_context_federation_xgalaxy_inject_2026_05_31]]).

**What it is:** Phase B FEED-UP — roll the 34 per-galaxy ≤1 KB context-cards UP into ONE salience-ranked
**master fleet-context digest** so the master brain injects a single ranked roll-up (galaxy + score + its
top domain "delta") instead of re-reading 34 multi-KB brains. The feed-up half of the hub-and-spoke federation.
Directly consumes the per-galaxy salience scores U-GCF-SALIENCE wrote to `INDEX.json` (R8 — READS
`cards[].salience`/`salienceFactors`, schema 1.2.0; NEVER recomputes).

**Shipped (committed this session):**
- `scripts/lib/galaxy-rollup.mjs` — pure-core + injected-deps + fail-soft; reuses `parseCardRole`
  (xgalaxy-inject) + `utf8Truncate`/`DEFAULT_ROOTS` (galaxy-context-card); NO ESM cycle (reviewer-traced
  acyclic — galaxy-context-card never imports rollup). 30 `node:test`.
- `scripts/galaxy-rollup.mjs` — CLI `build | show [--json]`, fail-soft, always exit 0.
- Output sidecars (regenerable build artifacts, NOT committed): `state/shared/galaxy-cards/MASTER-DIGEST.md`
  + `MASTER-DIGEST.json` (schema 1.0.0).
- 2-reviewer per-file scrutiny PASS/PASS (0 P0/P1; only P3 cosmetics).

**Real build (live):** 34 galaxies · 7315 B · **32/34 real deltas**, 2 honest `(no delta)` (quoting,
post-processor). Ranking: top quoting 7.60 · token-optimization 7.46 · hermes-zulu 7.40 · system-viz 7.37.

**How to apply / lessons:**
1. **SINGLE-WRITER-PER-FILE beats the multi-writer clobber class.** INDEX.json already has a writer
   (`buildAllCards`). Rollup writes ONLY its own `MASTER-DIGEST.{md,json}` sidecars — it NEVER touches
   INDEX.json. A second INDEX writer would clobber the salience fields (the last-writer-wins regression
   class all over CLAUDE.md's log: system-graph.json 3 writers, roadmap-index.json 5 writers). A
   fail-on-revert test asserts exactly 2 writes, neither ending `INDEX.json`. When a new consumer needs
   to annotate shared state, give it its OWN sidecar, don't co-write the producer's file.
2. **Inspect a REAL card before writing the parser (R8/R12).** The naive "first non-boilerplate line"
   extractor bled a `— recall:` master-brain-link command through as quoting's "top delta" — because the
   UP/DOWN bullets WRAP onto continuation lines (`- — recall: …`, `- \`C:/…\` → fed to …`) a per-line
   prefix match misses. Fix: the 4-axis link block is template-ordered and TERMINATES at `**Last master-sync`,
   so scan for the first real fact AFTER it (hardened fallback skips truncation marker + `—`/`→`/`recall:`
   fragments). Caught by the real-build inspection, NOT a hermetic test — always run the live build and read
   the output.
3. **Honest `null` is a signal, not a failure (R12).** 2/34 cards (quoting, post-processor) have NO domain
   delta because their verbose master-brain link block consumed the whole 1 KB card budget. The digest shows
   `(no delta)` honestly — which is exactly the `U-GCF-COMPACT` punch-list (compress the boilerplate so those
   cards regain a delta). Don't fabricate a delta to fill the row.
4. **Advisory companion, not a rewrite of peer-locked state.** The master `MEMORY.md` `[galaxy:*]` registry is
   hand-curated + peer-locked. Rollup RANKS the galaxies by activity as an advisory artifact; it does NOT
   rewrite the registry (descriptions stay curated). Synergy without stomping a peer's surface.

Knob: `PRISM_GCF_ROLLUP_DISABLE=1`. Wiki: [[galaxy-context-federation]]. Sister:
[[reference_galaxy_context_federation_salience_2026_05_31]]. PSN [[feedback_psn_definition]].
