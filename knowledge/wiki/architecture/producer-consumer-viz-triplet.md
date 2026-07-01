---
title: Producer/Consumer/Viz Triplet — substrate-observability doctrine
type: architecture
status: active
created: 2026-05-21
tags: [observability, system-viz, sessionstart-hooks, goal-synergy, substrate-drift]
---

# Producer/Consumer/Viz Triplet

The canonical pattern for making a **substrate-drift surface** visible across the PRISM
fleet. Established by the `GOAL-SYNERGY-LOOP-MS0` /goal synergize loop (echo, 2026-05-21,
20 iterations). A "substrate" is any cross-cutting health surface — broken wiki links,
wiki↔tribal coverage, engine↔memo coverage, GNN tier health, memory-index integrity.

## The problem

A substrate-drift audit run once, by hand, produces a number nobody sees again. The
gap rots silently. The /goal synergize loop's recurring finding: **every substrate,
audited for the first time, revealed a large hidden gap** — 4,136 broken `[[name]]`
links, 23,802 wiki files lacking tribal embedding, 4/7 PRISM-AI engines with no memo
coverage, a dormant GNN tier (AUROC 0.096), 516/597 orphan memory files.

## The triplet

Each substrate gets **three tiers**, in order. One tier alone is insufficient:

| Tier | Artifact | Without it… |
|------|----------|-------------|
| **Producer** | An audit script → `state/shared/.<substrate>-audit.json`. Pure-core / IO-shell split; deterministic; fail-soft. Cron- or Stop-hook-piggybacked so it re-runs. | The number is computed once and never refreshed — silent rot. |
| **Consumer** | A `SessionStart` hook that reads the audit JSON → threshold/stale-gated `additionalContext` digest. Wired in `settings.json`. Advisory, never blocking, knob-disablable. | The drift exists in a file but no chat sees it at session start. |
| **Viz** | A `scripts/generate-<substrate>-features.mjs` augmentation → a `ghost.<substrate>` roost + child nodes in `/system-viz`. Registered in `regen-viz.mjs FAST[]` + `merge-augmentations.mjs` (3-splice). | The drift is in text but not on the visual system map — an operator browsing the graph can't see it. |

Single-tier accumulates silent drift; two-tier surfaces in text but not visually;
**three-tier is the minimum for "an operator sees it without typing a query."**

## The meta-roost (compounding)

Once ≥2 substrates have triplets, a **meta-roost** compounds them: a rollup producer
(`goal-synergy-status.mjs`) aggregates the per-substrate audits into one status file;
a meta-roost generator emits `ghost.substrate_health` (L7) that draws an `aggregates`
edge to each substrate roost. New substrates register one key in a frozen
`SUBSTRATE_TO_ROOST` map and the meta-roost picks them up with zero logic change —
the extensibility seam is the whole point of freezing the map.

## Build lessons (compounded across the 20-iter loop)

- **env=0 guard** — `Number(env) || DEFAULT` swallows a legitimate `0`. Use
  `env !== undefined && env !== "" ? Number(env) : NaN` then `Number.isFinite`.
- **Identity = the thing, not (thing, source)** — a node id keyed on the audited
  artifact alone; a re-covered/renamed source cleanly drops the node instead of
  orphaning a stale one.
- **Plain-text labels** — never embed a literal `[[name]]` in a viz label/info; it
  feeds back into the next link-audit producer scan as fake drift.
- **Fail-soft everywhere** — a malformed audit JSON yields an empty result, never a
  crash. No inject beats a broken inject.
- **Schema mirroring** — every producer emits the same `{stats, <lists>}` shape so a
  later consumer/viz splices without contract drift.

## Instances (GOAL-SYNERGY-LOOP-MS0)

| Substrate | Producer | Consumer | Viz |
|-----------|----------|----------|-----|
| wiki↔memory links | iter 4 | iter 5 | iter 6 |
| wiki↔tribal coverage | iter 7 | iter 8 | iter 9 |
| prism-ai engine↔memo | iter 13 | iter 14 | iter 16 |
| nn/gnn tier health | (existing nn-graph-eval) | iter 18 | (existing ghost nodes) |
| memory-index integrity | iter 19 | (deferred) | (deferred) |
| — meta-roost — | iter 10 rollup | iter 11 digest | iter 12 + iter 17 |

## Related

- `knowledge/wiki/architecture/close-out-audit.md` — sister pattern for shipped-but-pending debt
- `knowledge/wiki/architecture/silent-close-out-drift.md` — another silent-drift class
- Memory: `reference_u_memory_index_audit_2026_05_21`, `reference_u_meta_roost_integrate_2026_05_21`
