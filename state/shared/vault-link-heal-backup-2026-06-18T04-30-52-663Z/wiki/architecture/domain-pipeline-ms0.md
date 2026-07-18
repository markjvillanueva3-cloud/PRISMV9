---
title: Domain-Pipeline MS0 — per-domain print-to-part pipeline
type: architecture
status: in-progress
milestone: DOMAIN-PIPELINE-MS0
slot: juliett
created: 2026-05-17
tags: [pipeline, domain, print-to-part, system-viz, orchestrator, adaptive]
---

# DOMAIN-PIPELINE-MS0 — Per-Domain Print-to-Part Pipeline

Canonical 18-stage pipeline (print intake → completed part), instantiated per
machining domain with status-tagged engine mappings. Designed to make coverage
gaps legible in `/system-viz` so each slot knows what its domain still needs.

## Stages (canonical)

```
1.  PRINT_INTAKE          11. TOOLPATH_GEN
2.  GEOMETRY_PARSE        12. SAFETY_VALIDATE
3.  PRINT_OCR             13. POST_PROCESS
4.  FEATURE_RECOG         14. SIMULATE
5.  MATERIAL_SELECT       15. OPERATOR_GATE  ← unconditional human approval
6.  MACHINE_SELECT        16. MACHINE_RUN
7.  TOOLING_SELECT        17. QUALITY_VERIFY
8.  FIXTURE_DESIGN        18. LEARNING_LOOP  ← closed-loop refinement
9.  OPERATION_SEQUENCE
10. SPEED_FEED
```

## Per-domain scope

- **FULL_PIPELINE** — mill (alpha), lathe (bravo), wire (charlie) own all 18 stages.
- **INPUT_HALF** — cad (delta) owns 1–4.
- **MIDDLE** — cam (echo) owns 7–14.
- **STAGE_SPECIALIST** — post (india) owns 13, speedfeed (juliett) owns 10.
- **ORCHESTRATOR** — print-to-program (kilo) owns the **PrintToProgramOrchestratorEngine** that runs the whole pipeline adaptively (currently missing — highest-leverage gap).
- **SUPPORT_ALL** — tribal (foxtrot) injects playbook rules at every stage.
- **BUSINESS_WRAPPER** — erp/hr (hotel) wraps with quote → cost → schedule → invoice.
- **TRAINING_OVERLAY** — academy (lima) trains operators across stages.
- **DATA_LAYER** — database (golf) provides material/tool/machine/fixture/alarm DBs.
- **INFRA_CROSS_CUTTING** — misc (mike) — observability, telemetry, devtools.

## The adaptive orchestrator (the missing connective tissue)

`PrintToProgramOrchestratorEngine` (slot kilo) is the single highest-leverage
missing engine. It must:

- Handle **missing user input** with safe defaults (most-common JM-DIE material
  for the envelope, cheapest envelope-fit machine, geometry-compatible tool
  from existing inventory, default fixtures per machine class, ISO 2768 medium
  when OCR fails, Kienzle defaults from ISO group when k-c missing).
- Pick the **cost-optimal path** via `GilbertEconomicSpeedEngine` triad
  (min-cost / max-prod / max-profit — default max-profit, never override
  safety even for cost).
- **Adapt** to live shop inventory each run (machines / tooling / fixtures
  read from `ShopConfigurationEngine` + `ToolCatalogEngine` at runtime).
- Enforce **hard safety invariants**: SAFETY_VALIDATE failure → block; no
  MACHINE_RUN without OPERATOR_GATE explicit approval; shop-floor outputs
  must hit Ω ≥ 0.95 / S(x) ≥ 0.98.

## System-viz integration

`scripts/generate-domain-pipeline-features.mjs` emits:

- `ghost.domain_pipelines` roost (L8)
- 13 `domain-pipeline` children (L9), color-coded by domain
- 86 `pipeline-stage` grandchildren (L10), status-coded by `built`/`partial`/
  `missing` (opacity 1.0 / 0.6 / 0.35; glyph ●/◐/○)
- 73 `pipeline-flow` edges between consecutive stages within each domain

Registered in `regen-viz.mjs` FAST[] + `merge-augmentations.mjs` splice
(matches the feature-gap-audit pattern). Post-commit + hourly cron auto-pick-up
edits to `DOMAIN-PIPELINE-MS0-CONFIG.json` — operators refine the config and
the viz auto-updates.

## Coverage at first scan

86 (domain, stage) cells: **24 built · 34 partial · 28 missing**.

**Majority-built stages** — GEOMETRY_PARSE, FEATURE_RECOG, MACHINE_SELECT,
SPEED_FEED, SAFETY_VALIDATE.

**Majority-gap stages** — FIXTURE_DESIGN, SIMULATE, MACHINE_RUN, QUALITY_VERIFY,
LEARNING_LOOP. These are systemic gaps to close before any domain can run
its full pipeline end-to-end.

## Pre-revenue training priority

Per [[feedback-ai-training-first-before-revenue]]: when the fleet enters
revenue work, the LEARNING_LOOP stage per domain (the `*MetaLearning` /
`*DeepLearning` / `*UltraIntelligence` engines — mostly `partial` in the
config) ships first. The JM-DIE 76K-print corpus + the Resources/ MIT-OCW
curriculum + the v8.89 monolith's MIT kernels are the training inputs.

## See also

- `state/shared/specs/DOMAIN-PIPELINE-MS0-CONFIG.json` — editable per-domain config
- `state/shared/specs/DOMAIN-PIPELINE-MS0-DESIGN.md` — full design spec
- [[feature-gap-audit-2026-05-17]] — gap inventory that fed this
- [[per-slot-rgs-allocation]] — slot ↔ domain mapping
- [[feedback-ai-training-first-before-revenue]] — pre-revenue training rule
