# DOMAIN-PIPELINE-MS0 — Per-Domain Print-to-Part Pipeline Design

> Slot juliett (claude-9f57075a) /forge-audit-v2 /forge7, 2026-05-17. Advisory.
> Canonical 18-stage pipeline from print intake → completed part, instantiated
> per machining domain, with the adaptive orchestrator that handles missing
> input intelligently and picks cost-optimal paths under safety constraints.
> Config: `DOMAIN-PIPELINE-MS0-CONFIG.json`. Visualized in `/system-viz` via
> `ghost.domain_pipelines` roost.

## The canonical 18-stage pipeline

A part flows through these stages from blueprint to delivered, in order:

```
1.  PRINT_INTAKE       upload blueprint PDF / CAD STEP/IGES/DXF/IPT/SLDPRT
2.  GEOMETRY_PARSE     BREP from CAD; build solid model
3.  PRINT_OCR          PDF blueprint → dims + GD&T + title-block (eDOCr2/vision-LLM)
4.  FEATURE_RECOG      pockets, holes, threads, slots, ID/OD, grooves
5.  MATERIAL_SELECT    print spec → material DB → Kienzle/Taylor params
6.  MACHINE_SELECT     envelope + kinematics + controller match across shop fleet
7.  TOOLING_SELECT     tool DB lookup, geometry-compatible, prefer existing inventory
8.  FIXTURE_DESIGN     vise/chuck/3R/custom by geometry; workholding-force gate
9.  OPERATION_SEQUENCE order of ops, setup count, datum strategy, rough→finish
10. SPEED_FEED         Kienzle force, Taylor life, deflection, machine HP limits
11. TOOLPATH_GEN       domain-specific (3-axis/5-axis mill, turn/groove, wire-cut)
12. SAFETY_VALIDATE    collision, force, thermal, workholding, vibration; Ω/S(x) gates
13. POST_PROCESS       controller-specific NC (Fanuc/Haas/Okuma/Mitsubishi/...)
14. SIMULATE           virtual machining, voxel stock removal, cycle-time
15. OPERATOR_GATE      UNCONDITIONAL human approval — never auto-bypass
16. MACHINE_RUN        DNC drip, MTConnect/OPC-UA telemetry, tool-wear monitor
17. QUALITY_VERIFY     CMM, FAI, SPC, Cpk; first-article + ongoing sampling
18. LEARNING_LOOP      outcomes → tribal corpus → SF refinement → strategy weights
```

## Per-domain instantiation (slot allocation)

| Slot | Domain | Scope | Stages owned |
|------|--------|-------|--------------|
| alpha | mill | FULL_PIPELINE | all 18 |
| bravo | lathe | FULL_PIPELINE | all 18 |
| charlie | wire (WEDM) | FULL_PIPELINE | all 18, with wire-cut toolpath + WEDM-controller posts |
| delta | cad | INPUT_HALF | 1–4 (intake → feature recognition) |
| echo | cam | MIDDLE | 7–14 (tooling → simulate) |
| foxtrot | tribal | SUPPORT_ALL | injects playbook rules at every stage |
| hotel | erp/business+hr | BUSINESS_WRAPPER | wraps with quote → cost → schedule → invoice + HR |
| india | post | STAGE_SPECIALIST | 13 (post-process across 7 controller dialects) |
| juliett | speed/feed | STAGE_SPECIALIST | 10 (Kienzle/Taylor/Deflection/Gilbert) |
| kilo | print-to-program | ORCHESTRATOR | the adaptive orchestrator that runs the whole pipeline |
| lima | academy+learning | TRAINING_OVERLAY | tutorial / video / blueprint training across stages |
| mike | misc | INFRA_CROSS_CUTTING | observability, telemetry, devtools |
| golf | database | DATA_LAYER | material/tool/machine/fixture/alarm DBs |

## The adaptive orchestrator (the missing connective tissue)

The 18 stages exist as PRISM engines at varying maturity, but **no engine runs
the full pipeline adaptively**. The highest-leverage missing piece is
`PrintToProgramOrchestratorEngine` (slot kilo). Its job:

### Missing-data intelligent defaults

| Field missing | Default action |
|---------------|----------------|
| material | most-common JM-DIE stock for the part envelope + flag + confidence score |
| machine | cheapest machine with envelope fit AND required kinematics AND spindle HP |
| tooling | closest geometry-compatible tool from existing inventory; flag if substitution >10% |
| fixture | vise-with-stop (mill) / 3-jaw chuck (lathe) / 3R clamp (wire) + force gate |
| tolerance | ISO 2768 medium grade when print-OCR fails; flag operator |
| feature recog confidence < threshold | operator-confirm dialog with feature-tree visualization |
| Kienzle k-c missing for material | default from ISO material group; flag |

### Cost-optimal path picking

`GilbertEconomicSpeedEngine` triad ranks alternatives:
- **min-cost** — lowest total cost (tooling + cycle time + machine rate)
- **max-prod** — fastest cycle time (maximizes throughput)
- **max-profit** — best margin (default unless operator overrides)

**Hard invariant:** never pick a configuration that fails the safety gate even
if it is the cheapest. Safety wins. Always.

### Machine / tooling / fixture adaptation

The orchestrator reads `ShopConfigurationEngine` (21-machine JM-DIE fleet),
`ToolCatalogEngine` (287 .tooldb files / 131MB), and the (missing)
`WorkholdingCatalogEngine` at runtime — picks the best fit for THIS part on
THIS day given THIS shop's current inventory. The choice is not pre-baked
into the toolpath; it's selected per-job from live state.

### Safety invariant (load-bearing)

```
SAFETY_VALIDATE failure → HARD BLOCK (no operator override at this gate)
MACHINE_RUN  ←  REQUIRES  OPERATOR_GATE approval (no auto-bypass)
shop_floor output (G-code, feed/speed → real machine): Ω ≥ 0.95, S(x) ≥ 0.98
```

## Coverage map — what's built vs missing

(See `DOMAIN-PIPELINE-MS0-CONFIG.json` for the per-(domain, stage) status.)

**Majority-built stages** — GEOMETRY_PARSE, FEATURE_RECOG, MACHINE_SELECT,
SPEED_FEED, SAFETY_VALIDATE.

**Majority-gap stages** — FIXTURE_DESIGN, SIMULATE, MACHINE_RUN, QUALITY_VERIFY,
LEARNING_LOOP. These are systemic gaps across most domains.

**Highest-leverage single missing engine** — `PrintToProgramOrchestratorEngine`.
Without it, the per-stage engines don't compose into a real print-to-part
flow; with it, the existing stage engines start producing value end-to-end.

## How operators consume this

1. Each chat slot opens onto its domain's pipeline-stage queue.
2. The slot picks the highest-status-gap stage in its domain and works it.
3. When a slot ships a stage, it updates the CONFIG (`status: built`) and
   the system-viz visualization auto-refreshes on the next regen-viz.
4. The orchestrator (kilo) is the consumer — once it exists, the per-stage
   work composes automatically.

## How `/system-viz` shows this

`scripts/generate-domain-pipeline-features.mjs` emits a `ghost.domain_pipelines`
roost (L8) with one `domain-pipeline` child per domain (L9), and one
`pipeline-stage` grandchild per (domain, stage) pair (L10). Color-coded by
domain; status-coded by built/partial/missing (full opacity / dimmed / outline).
Edges between consecutive stages show the flow. Operators see the full picture
at a glance.

## Honest caveats

- Engine mappings in the CONFIG are best-effort initial mappings — many entries
  are `?` or `partial` pending operator refinement. The CONFIG is the editable
  surface; the viz auto-updates from it.
- The 18-stage canonical pipeline is a strong default but not normative for
  every part. Re-cuts, repair work, and reverse-engineering paths may skip
  stages or loop back; the orchestrator should treat the linear flow as the
  fast-path with explicit branch-out points.
- The adaptive defaults table above is the starting policy — refine from
  shop-floor telemetry once `MTConnectIngesterEngine` (also missing) is wired.

## See also

- `DOMAIN-PIPELINE-MS0-CONFIG.json` — the editable per-domain config
- `FEATURE-GAP-AUDIT-2026-05-17.md` — the gap inventory that fed this
- `JULIETT-PER-SLOT-RGS-ALLOCATION-2026-05-17.md` — slot ↔ domain map
- `state/shared/PRISM-SELF-AWARENESS-DIRECTIVE.md` — JM-Die test shop profile
