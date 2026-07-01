---
title: CAM Playbook Surface — category-filtered view of MachiningPlaybookEngine for CAM toolpath + post decisions
type: architecture
domain: cam
status: shipped
last_updated: 2026-05-23
generated_by: slot:foxtrot iter11 — closes Stop-gate condition "expand machining, CAD and CAM playbooks"
related:
  - mcp-server/src/engines/MachiningPlaybookEngine.ts
  - mcp-server/src/engines/AdvancedPostProcessorEngine.ts
  - knowledge/wiki/architecture/cad-playbook-surface-2026-05-23.md
  - knowledge/wiki/architecture/playbook-capability-extensions.md
tags: [playbook, cam, toolpath, 5axis, hsm, post-processing, foxtrot, psn]
---

# CAM Playbook Surface — filtered view of MachiningPlaybookEngine for CAM-side decisions

> The MachiningPlaybookEngine is a UNIFIED rule corpus across machining/CAD/CAM domains. The CAM-playbook surface is the **category-filtered view** invoked via `prism_shop_practice:playbook_lookup` with category=`toolpath_strategy|5axis|hsm|post_processing|setup_strategy|micro_machining|hybrid_additive`. This document enumerates the CAM-side categories + the rules added in 2026-05-23 foxtrot iter8-9 expansion (9 new rules across these categories).
>
> **Why no separate `CAMPlaybookEngine.ts`?** Per dispatcher doctrine — cross-dispatcher calls are forbidden; use shared engines instead. A separate CAM playbook would duplicate the engine surface AND rules that legitimately span CAM↔machining (e.g., trochoidal slotting is BOTH a CAM strategy AND a chip-thinning machining tactic). Unified engine + category-filtered view = canonical design. **`AdvancedPostProcessorEngine.postPipeline` already consumes playbook rules** via its `playbook_rules` stage — this IS the CAM-side wiring.

## CAM-side categories within MachiningPlaybookEngine

| Category | Rule count | Domain | Foxtrot iter8-9 expansion |
|---|---|---|---|
| `toolpath_strategy` | 11 (was 8) | CAM strategy selection | **+3 rules** (TPS-trochoidal-slotting, TPS-peel-milling, TPS-tangent-entry-roughing) |
| `5axis` | 7 (was 4) | multi-axis programming | **+3 rules** (5AX-005 ball-end tilt 5-15°, 5AX-006 rotary feed ≤50% rated, 5AX-007 air-run preflight) |
| `hsm` | 8 (was 5) | high-speed-machining | **+3 rules** (HSM-CHORD-TOLERANCE ≤Ra/4, HSM-LOOKAHEAD ≥200 blocks, HSM-TANGENT-NO-STOP ≥50% feed) |
| `post_processing` | 6 | G-code optimization | (named for next iter) |
| `setup_strategy` | 8 | fixture + CAM-side planning | (named for next iter) |
| `micro_machining` | 5 | sub-1mm feature | (named for next iter) |
| `hybrid_additive` | 5 | hybrid AM+SM | (named for next iter) |

## Invocation surfaces

### Via dispatcher (recommended for cross-process calls)
```typescript
await prismSession.invoke("prism_shop_practice", "playbook_lookup", { category: "toolpath_strategy" });
await prismSession.invoke("prism_shop_practice", "playbook_explain", { rule_id: "TPS-trochoidal-slotting" });
await prismSession.invoke("prism_shop_practice", "playbook_coverage", { /* per-job query */ });
```

### Via direct engine (in-process — `AdvancedPostProcessorEngine`, `AdaptiveFeedControlEngine`, etc.)
```typescript
import { machiningPlaybookEngine } from "./engines/MachiningPlaybookEngine.js";
const camRules = machiningPlaybookEngine.byCategory("toolpath_strategy");
const stable = machiningPlaybookEngine.explainRule("HSM-LOOKAHEAD");
```

### Via postPipeline `playbook_rules` stage (the canonical CAM-side consumption)
`AdvancedPostProcessorEngine.process({ stages: { playbook_rules: true, ... } })` runs playbook rules in-stream during G-code generation. The 38-stage pipeline includes playbook_rules as a deterministic stage between speed_feed and engagement_analysis. The CAM-playbook surface is **already wired** as a built-in postPipeline stage — no new wiring code needed for newly-added rules.

## Foxtrot iter8 CAM-side adds (9 rules, all cited per slot:foxtrot tribal doctrine)

### toolpath_strategy (+3)

**TPS-trochoidal-slotting** — Use trochoidal slotting in slots ≥1.5×D, ae 0.1-0.2×D, 2-4× faster feed
- Source: OPEN MIND hyperMILL iMachining + Iscar Slotting bulletin + HSMAdvisor calculators
- PSN edges: → [milling-low-radial-chip-thin-comp, TPS-001]

**TPS-peel-milling** — High axial (1.5-3×D) + low radial (0.05-0.1×D) for deep pockets, 5-10× radial force reduction
- Source: Iscar Peel Milling Application Manual + Kennametal High-Productivity Milling + Mazak Integrex Application Tips
- PSN edges: → [TPS-trochoidal-slotting, drill-stickout-runout]

**TPS-tangent-entry-roughing** — Tangential arc entry/exit eliminates witness mark (5-20μm dig-in without)
- Source: OPEN MIND hyperMILL Finishing Best Practices + Mastercam Tangent Entry Config + Boothroyd & Knight (2006) §7
- PSN edges: → [TPS-001]

### 5axis (+3)

**5AX-005** — Tilt ball-end 5-15° to escape zero-velocity centerline; effective dia 0.087D-0.26D; Ra improves 2-4×
- Source: Altintas (2012) *Manufacturing Automation* ch.5 + Tlusty (2000) §13.4 + Siemens NX Multi-Axis Surfacing
- PSN edges: → [5AX-004]

**5AX-006** — Cap rotary feed at 50% rated to prevent block-cycle starvation; modern controllers spec 1000-5000 blocks
- Source: Heidenhain TNC640 Cycle Optimization §6 + Mori Seiki/DMG MORI 5-Axis Programming Best Practices
- PSN edges: → [5AX-004, HSM-LOOKAHEAD]

**5AX-007** — Air-run new programs at Z+50mm, 50% rapid before first metal cut; 5-axis crashes 5-20× more expensive
- Source: DMG MORI 5-Axis Application Guide §10 + Mazak Integrex Programming Manual safety
- PSN edges: → [5AX-001, 5AX-003]

### hsm (+3)

**HSM-CHORD-TOLERANCE** — CAM chord tolerance ≤Ra/4; NURBS-capable controllers bypass via curve-degree spec
- Source: Heidenhain TNC640 HSC Optimization + Siemens 840D 5-Axis HSC Best Practices + Erdel (2003) §6
- PSN edges: → [HSM-LOOKAHEAD, TPS-001]

**HSM-LOOKAHEAD** — ≥200 block lookahead for >10 m/min HSM; legacy controllers cap 50-100, modern 1000-5000
- Source: Heidenhain TNC640 HSC Programming + Siemens 840D Look-Ahead Function Manual + Fanuc 30i AI Contour Control
- PSN edges: → [HSM-CHORD-TOLERANCE, 5AX-006]

**HSM-TANGENT-NO-STOP** — Maintain ≥50% feed through ALL transitions; thermal-cycle every stop micro-cracks AlTiN coating
- Source: Erdel (2003) *High-Speed Machining* §5 + Sandvik HSM Tool Life Optimization + Iscar AlTiN Thermal Behavior bulletin
- PSN edges: → [HSM-LOOKAHEAD, ANTI-thermal-cycling]

## CAM-relevant rules added in other categories (cross-domain wiring)

- **milling-climb-default** (milling, iter8) — climb milling default for rigid CNC; CAM-side selects climb vs conventional
- **milling-low-radial-chip-thin-comp** (milling, iter8) — chip-thinning compensation formula; CAM applies automatically at low ae
- **milling-ramp-angle-limit** (milling, iter8) — CAM-emitted ramp angle must match end-mill geometry rating
- **VIB-FRF-impact-test** (vibration_dynamics, iter9) — FRF impact test before high-speed finishing; CAM-pre-flight check
- **VIB-VARIABLE-PITCH** (vibration_dynamics, iter9) — variable-pitch end mill suppresses chatter without RPM tuning
- **VIB-TUNED-MASS-DAMPER** (vibration_dynamics, iter9) — TMD holder for L/D ≥5; CAM-side strategy when deep cavity geometry
- **TL-007-taylor-fit-production** (tool_life, iter9) — 3-point Taylor fit from shop data; CAM feeds-and-speeds calibration
- **TL-008-coating-material-match** (tool_life, iter9) — TiAlN/AlCrN/nACo/TiCN selection by material; CAM tool selection
- **TL-009-regrind-economics** (tool_life, iter9) — 3-5× regrind ceiling; CAM tool-life budget input
- **CHIP-006-bue-speed-threshold** (chip_control, iter10) — avoid BUE zone Vc 30-80 m/min; CAM Vc-selection guard
- **CHIP-007-chip-type-decision-tree** (chip_control, iter10) — 6-rule chip-type precedence; CAM chip-breaker selection
- **CF-009-merchants-circle** (cutting_force, iter10) — Merchant's circle for force prediction; CAM force-budget validation
- **CF-010-sandvik-vc-tables** (cutting_force, iter10) — manufacturer-specific Vc overrides Kienzle generic
- **ADAPT-007-chip-type-feedback** (adaptive, iter10) — chip-type-aware adaptive feed controller; CAM-side closed-loop wire
- **ADAPT-008-merchant-circle-realtime** (adaptive, iter10) — real-time Merchant's circle for in-process feedback

## CAM-domain wiring (read-only consumption surfaces)

CAM-side consumers reach the playbook through:
- `prism_cam` dispatcher — `pp_resolve_context` action consumes `AdvancedPostProcessorEngine` which runs the `playbook_rules` stage internally
- `prism_shop_practice` dispatcher — direct CAM-flavored action calls (`playbook_lookup`, `playbook_advise` with operation_type filter)
- `AdvancedPostProcessorEngine.postPipeline` — 38-stage pipeline includes playbook_rules as a dedicated stage (the CANONICAL CAM wiring)
- `AdaptiveFeedControlEngine` — direct `machiningPlaybookEngine.advise()` calls for chip-type-aware feed adjustment
- CAM-bridge engines: `mastercamBridge`, `hypermillBridge`, `nxCAMBridge`, `solidcamBridge`, `powermillBridge`, `catiaCAMBridge` — each can consume the engine directly via import
- Per-iter10 cross-references: peer slot:juliett's `SF-PSN-WIRE-MS0` algorithms (`ChipTypePredictionModel`, merchant's circle predictor, Sandvik tribal merge) — bidirectional PSN edges

## Future CAM-playbook iter targets

- **post_processing +3** — controller-dialect optimization rules (Heidenhain vs Siemens vs Fanuc block density), G-code compression strategy, NURBS vs polyline tradeoff per machine
- **setup_strategy +3 (CAM side)** — work-offset selection by part class, multi-fixture strategy for batch jobs, datum-cycle in subprogram
- **micro_machining +3** — sub-1mm tool catastrophic-failure modes, runout limits for micro-mills (≤3μm TIR), spindle-speed scaling for micro tools
- **hybrid_additive +3** — DED-then-mill interface accuracy, post-AM stress-relief before machining, MAM allowance per part feature class

Each future iter adds 3 cited rules using the same Stop-gate-passing doctrine.

## Wiring summary (CAM-playbook surface)

All CAM-domain playbook rules are **wired inherently** via:
- `prism_shop_practice` (15 actions)
- `prism_cam` (via `pp_resolve_context` → `AdvancedPostProcessorEngine.postPipeline` `playbook_rules` stage)
- `AdvancedPostProcessorEngine.postPipeline` (canonical CAM wiring — playbook_rules is a 38-stage member)
- `AdaptiveFeedControlEngine` (direct engine consumption in adaptive loops)
- 6+ CAM-bridge engines via direct import (mastercam/hypermill/nxcam/solidcam/powermill/catiacam)
- 3 AI registries (utilization + capability-maximizer + deep-knowledge-integration)

No new wiring code needed — rules are DATA in the unified `PLAYBOOK_RULES` array consumed by every existing CAM-relevant surface automatically. The CAM-playbook surface is the **category filter view** of the unified engine — the canonical design per dispatcher doctrine.

Companion: [[cad-playbook-surface-2026-05-23]]
