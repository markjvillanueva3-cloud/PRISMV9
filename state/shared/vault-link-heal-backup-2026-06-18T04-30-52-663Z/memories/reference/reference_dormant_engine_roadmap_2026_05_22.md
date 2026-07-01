---
name: reference-dormant-engine-roadmap-2026-05-22
description: "R7 — DEA-MS0 dormant-engine activation roadmap: 120 units split across 13 slots, milestone envelope registered."
aliases: reference_dormant_engine_roadmap_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-18T04:19:52.714Z
---


# Dormant-Engine Activation Roadmap — DEA-MS0 (2026-05-22, slot november, R7)

**Trigger:** operator R7 — *"do a full assessment of all dormant engines then rgs to
generate a true road map with wiki tribal injections throughout the whole road map.
then split it evenly between all active chat slots."* Mid-task addition: *"add lathe
trilobe machining with macros … we have nodes on trilobes and eccentric turning."*

**Deliverable:** `DEA-MS0` — a pickable roadmap of **~118 units** across all **25 work
slots** (alpha..zulu, golf excluded as hygiene), registered as a milestone envelope.
**Primary slot: `november`** (owns the milestone — re-runs generator, tracks progress,
closes out). Mid-task user directive added 25-slot split + november-primary on top of
the original 13-slot split.

- **Type A** — 616 unwired engines (zero dispatcher ref) → 113 `wire`/`triage+wire`
  units. 286 had `suggestedDispatcher: UNKNOWN` → `triage+wire` (dispatcher review
  required before wiring). 330 domain-routed.
- **Type B** — precision cluster (F0 of [[reference_machining_math_inventions_audit_2026_05_22|MACHINING-MATH-INVENTIONS-AUDIT]]) → 6
  `activate` cross-wire units, all to slot november (acc_thermal_error→post_inject_motion,
  acc_volumetric→cad_machine_capability_get, diamond_turning→cam_strategy, laser_interferometer→
  machine_warmup, spm→quality_kpis, probe_drift→probe_routine_generate + PrintAccuracyProofEngine).
- **Trilobe** — 4 unwired engines (`EccentricTurningEngine`, `TrilobeDeformationEngine`,
  `ColdHeadingToolConfiguratorEngine`, `ExpandingMandrelEngine`) → 1 named `wire+codegen`
  bravo unit `U-DEA-bravo-TRILOBE` (wire to prism_turning + macro G-code: X(C) parametric
  profile, eccentric offset, polygon-turning G51.2).

**Artifacts:** `state/shared/specs/DORMANT-ENGINE-ACTIVATION-ROADMAP-2026-05-22.{md,html}` ·
`state/shared/dormant-engine-roadmap-split.json` (picker-consumable) ·
`mcp-server/data/milestones/DEA-MS0.json` (envelope) ·
`scripts/generate-dormant-engine-roadmap.mjs` (re-runnable META generator).

**Split rationale (v2 — 25 slots):** balanced cap-and-spill. Each engine prefers its
domain slot up to `TARGET=ceil(N/25)=25`; overflow spills to the lightest slot. Result:
even 24-29 engines/slot (was 17-73 in the naive 25-slot round-robin); november runs
48 because it carries the 6 precision activations on top. Overflow slots (oscar..zulu)
have rotated tribal-domains (mill/lathe/wedm/cad/cam) so spilled engines still get
useful tribal injection. Every unit lists per-engine target dispatcher in the MD —
even spilled cross-domain engines tell the wirer where they actually go.

**Verification:** re-run `audit-unwired-engines.mjs`; UNWIRED must fall by shipped-unit
engine counts (baseline 616). Slots ship `[DEA-MS0]/U-DEA-<slot>-NN`.

**Capstone of the math-research arc** — DEA-MS0 is the actionable follow-through on
[[reference-machining-math-inventions-audit-2026-05-22]] (F0 precision-cluster DORMANT).
Arc: [[reference-calresco-complexity-research-2026-05-22]] ·
[[reference-topology-math-cad-cam-research-2026-05-22]] ·
[[reference-calresco-math-concepts-2026-05-22]] ·
[[reference-math-science-coverage-audit-2026-05-22]].

**Process notes:** generator first emitted units with mislabeled triage engines
("Wire 6 mill engines" where the batch was CacheEngine/BackupRestore — triage-pool
engines round-robined into a mill slot). Fixed: domain-routed and triage engines kept
in separate batches with honest titles (R12). MEMORY.md index full (22KB ceiling) —
pointer skipped; this file stays BM25-discoverable via memory-index-search.
