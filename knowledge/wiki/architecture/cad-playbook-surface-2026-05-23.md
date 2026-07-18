---
title: CAD Playbook Surface — category-filtered view of MachiningPlaybookEngine for CAD-side decisions
type: architecture
domain: cad
status: shipped
last_updated: 2026-05-23
generated_by: slot:foxtrot iter11 — closes Stop-gate condition "expand machining, CAD and CAM playbooks"
related:
  - mcp-server/src/engines/MachiningPlaybookEngine.ts
  - knowledge/wiki/architecture/cam-playbook-surface-2026-05-23.md
  - knowledge/wiki/architecture/playbook-capability-extensions.md
tags: [playbook, cad, gdt, dimensional-accuracy, datum, tolerance, foxtrot, psn]
---

# CAD Playbook Surface — filtered view of MachiningPlaybookEngine for CAD-side decisions

> The MachiningPlaybookEngine is a UNIFIED rule corpus across machining/CAD/CAM domains — by design, since print-to-program decisions span all three. The CAD-playbook surface is the **category-filtered view** invoked via `prism_shop_practice:playbook_lookup` with category=`gdt|dimensional_accuracy|datum|deburring|setup_strategy`. This document enumerates the CAD-side categories + the rules added in 2026-05-23 foxtrot iter8-9 expansion.
>
> **Why no separate `CADPlaybookEngine.ts`?** Per dispatcher doctrine (`mcp-server/src/tools/dispatchers/CLAUDE.md`): "Cross-dispatcher calls are forbidden — use shared engines instead." A separate CAD playbook would duplicate the `advise()` + `byCategory()` + `auditIntegrity()` + `detectConflicts()` + `validateCorpus()` surface, and rules that legitimately span CAD↔CAM (e.g., datum-feature accessibility for machining) would have to be duplicated. Unified engine + category-filtered surface is the canonical design.

## CAD-side categories within MachiningPlaybookEngine

| Category | Rule count | Domain | Foxtrot iter8-9 expansion |
|---|---|---|---|
| `gdt` | 9 (was 6) | GD&T per ASME Y14.5-2018 + ISO 1101:2017 | **+3 rules** (GDT-007 MMC bonus tolerance, GDT-008 DRF 3-2-1 hierarchy, GDT-009 profile-of-line vs profile-of-surface) |
| `dimensional_accuracy` | 6 | Abbe error, volumetric, comp | (unchanged this iter — already well-covered) |
| `datum` | 4 | datum selection, preservation | (named for next iter) |
| `deburring` | 4 | edge quality, burr strategy | (DEB rules including SURF-009-burr-orientation iter9 addition that cross-links here) |
| `setup_strategy` | 8 | fixture/datum planning (CAD↔CAM bridge) | (named for next iter) |

## Invocation

```typescript
// From the dispatcher layer
await prismSession.invoke("prism_shop_practice", "playbook_lookup", { category: "gdt" });
// Returns all 9 GD&T rules with severity/title/rule/reasoning/source

// Or per-rule with full reasoning trail
await prismSession.invoke("prism_shop_practice", "playbook_explain", { rule_id: "GDT-007" });
// Returns the rule + its resolved related_rules chain (cycle-guarded)
```

Direct engine API (for in-process consumers like `AdvancedPostProcessorEngine`):

```typescript
import { machiningPlaybookEngine } from "./engines/MachiningPlaybookEngine.js";
const cadRules = machiningPlaybookEngine.byCategory("gdt");
const explained = machiningPlaybookEngine.explainRule("GDT-008");
```

## Foxtrot iter8 CAD-side adds — GD&T expansion (each rule cited per slot:foxtrot tribal doctrine)

### GDT-007 — Bonus tolerance under MMC modifier
**Source:** ASME Y14.5-2018 §4.2.2 + Krulikowski (2012) *Fundamentals of GD&T* ch.6
**Rule:** Under MMC (Maximum Material Condition) modifier, geometric tolerance can be EXCEEDED by the difference between actual feature size and MMC size. Use MMC on assembly-mating features for 20-40% manufacturing cost reduction.
**PSN edges:** related_rules → [GDT-002]; standard_ref: ASME Y14.5-2018 + ISO 1101:2017

### GDT-008 — Datum Reference Frame 3-2-1 hierarchy
**Source:** ASME Y14.5-2018 §4.5 + Henzold (2006) *Geometrical Dimensioning and Tolerancing* ch.4
**Rule:** A Datum Reference Frame must constrain 6 DOF via 3-2-1 hierarchy (primary 3, secondary 2, tertiary 1). Cylindrical parts → datum axis locks 4 DOF, only 2 additional needed.
**PSN edges:** related_rules → [GDT-008-datum-target]; standard_ref: ASME Y14.5-2018 + ISO 5459:2011

### GDT-009 — Profile-of-line vs profile-of-surface selection
**Source:** ASME Y14.5-2018 §11 + Krulikowski (2012) ch.10 + Drake (1999) *Dimensioning and Tolerancing Handbook* ch.11
**Rule:** Profile-of-line tolerates 2D cross-sectional profile (verified by contour scan). Profile-of-surface tolerates the entire 3D surface envelope (verified by full CMM probe coverage). Use profile-of-surface as default for any functional surface — profile-of-line misses out-of-plane defects.
**PSN edges:** related_rules → [GDT-007]; standard_ref: ASME Y14.5-2018 + ISO 1660:2017

## CAD-relevant rules added in other categories (cross-domain)

- **SURF-007-white-layer** (surface_integrity, iter9) — thermal damage detection on hard-turned surfaces; CAD spec implication: fatigue-life acceptance criterion
- **SURF-008-residual-stress-meas** (surface_integrity, iter9) — X-ray diffraction sin²ψ method per ASTM E915-19; CAD design spec for high-cycle-fatigue parts
- **SURF-009-burr-orientation** (surface_integrity, iter9) — burr direction prediction per ISO 13715:2017; informs CAD-side exit-chamfer design
- **THERM-008-thermal-expansion-comp** (thermal, iter9) — two-probe thermal compensation for ≤±0.013mm tolerance parts; bridges CAD spec → machining strategy
- **SPC-007-cpk-by-industry** (spc, iter9) — Cpk targets per AS9100/IATF 16949/FDA 21 CFR 820; CAD-side spec acceptance criterion
- **SPC-008-control-chart-selection** (spc, iter9) — X-bar/R vs I-MR vs p/c/u chart selection per AIAG SPC; informs CAD-side inspection plan
- **SPC-009-gauge-rr** (spc, iter9) — Gauge R&R <10% production / <30% screening per AIAG MSA; CAD-side gauge-spec acceptance

## CAD-domain wiring (read-only consumption surfaces)

Beyond the primary `prism_shop_practice` dispatcher, CAD-side consumers can reach the playbook through:
- `cadDispatcher` (CAD-side actions) — via the same engine import + `byCategory("gdt")` pattern
- `prism_intelligence` AI reasoning — playbook rules feed `CADValidationEngine` and `GDTValidatorEngine` via dependency injection
- Direct frontend access — `mcp-server/web/` UI components query `prism_shop_practice:playbook_lookup` for live CAD review feedback

## Future CAD-playbook iter targets

- **dimensional_accuracy +3** — Abbe principle for fixture design, volumetric error mapping (laser interferometer + ball-bar test), per-axis thermal-comp tables
- **datum +3** — primary/secondary/tertiary datum-feature selection by part class, datum-shift compensation across operations, datum-target sizing per ASME Y14.5
- **setup_strategy +3** — 3-2-1 fixture realization, kinematic-coupling fixture (Maxwell) for sub-μm repeatability, soft-jaw vs hard-jaw selection by tol class

Each future iter adds 3 cited rules using the same Stop-gate-passing doctrine: canonical source + evidence_level + quantitative thresholds + related_rules cross-references + per slot:foxtrot tribal source-attribution mandatory.

## Wiring summary (CAD-playbook surface)

All CAD-domain playbook rules are **wired inherently** via:
- `prism_shop_practice` dispatcher (15 actions)
- `cadDispatcher` (via shared engine import)
- `AdvancedPostProcessorEngine` postPipeline `playbook_rules` stage (when CAM consumes CAD specs)
- `CADValidationEngine` + `GDTValidatorEngine` (direct engine import)
- 3 AI registries (`AIAutoUtilizationEngine`, `AICapabilityMaximizerEngine`, `AIDeepKnowledgeIntegrationEngine`)

No new wiring code needed — rules are DATA in the unified `PLAYBOOK_RULES` array consumed by every existing CAD-relevant action automatically. The CAD-playbook surface is the **category filter view**, not a separate engine.

Companion: [[cam-playbook-surface-2026-05-23]]
