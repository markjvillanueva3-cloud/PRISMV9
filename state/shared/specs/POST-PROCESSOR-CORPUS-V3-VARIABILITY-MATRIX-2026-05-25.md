# Post-Processor Corpus v3 — Full Variability Matrix

**Spec date:** 2026-05-25 (slot:india /loop, P0-U06 continuation)
**Source:** Synthesis of 4 parallel-agent exhaustive enumerations against PRISM codebase.
**Goal:** Ultimate adaptability + variability for the post-processor cross-controller corpus.
**Status:** ENUMERATION COMPLETE. Architecture phased per token budget.

---

## TL;DR

The current v2 corpus (200 scenarios per batch, 9 coverage axes) samples ~0.003% of the realistic variability surface PRISM already has data for. v3 expands the SAMPLING SOURCE without expanding generator complexity:

- **Controllers 7 → 17 (CFME fully-detailed) → 62 (all variants)** — adapter over `ControllerFeatureMatrixEngine.CONTROLLER_MATRIX`
- **Machines 99 → ~1,200** — JOIN over `machine-post-enriched.ts` + `machine-kinematics-enriched.ts` + `jm-die-profile.ts` + `okuma-machines-from-step.ts`
- **Cycles ~25 → ~150** — import from `ToolpathStrategyRegistry` 6 banks
- **Adaptability 9 axes → ~40 axes** — operator prefs · customer override · material 4-layer · coolant 3-typed · safety 4-tier · 10 hard-overrides · vendor tool catalogs

Combined: ~7,800 → ~5M+ theoretical scenarios. Realistic stratified target: **5,000-10,000 well-formed across the full variability matrix.**

---

## Section 1 — Controller Universe (62 enumerated)

### 1.1 Sources of truth (3 catalogs PRISM already has)

| Source | Path | Count | Field schema |
|---|---|---|---|
| CFME `CONTROLLER_MATRIX` | `mcp-server/src/engines/ControllerFeatureMatrixEngine.ts` | 17 fully-detailed | 25-axis `ControllerFeatureSet.features` (hsm_smoothing, ai_contour, look_ahead_blocks, tcp_rtcp, tilted_workplane, extended_cycles, rigid_tapping, deep_hole_drilling, probing_cycles, macro_programming, conversational, subprograms, nurbs, spline, helical, polar_interpolation, max_axes, max_channels, max_wcs, max_tools, max_program_size, ssv, thermal_comp, collision_avoidance, adaptive_control) + key_gcodes map + notes[] |
| MPPUAGE `CONTROLLER_PROFILES` | `mcp-server/src/engines/MasterPostProcessorUnifiedAGIEngine.ts:317-508` | 15 vendor profiles | hsm.code/modes/tolerance, tsc.on/off, probing.type/probe/toolSetter, fiveAxis.tcp/dwo/dwoff, ssv.on/off/range, coolant.{flood,mist,air,tsc}, cas.code/desc, rtcp_mode, hsm_code, market_share |
| controller-knowledge-tips | `mcp-server/src/data/controller-knowledge-tips.ts` | 121 tips | applies_to.controllers[] cross-ref |

### 1.2 The 62 enumerated controller variants

(Source: Agent E exhaustive enumeration — see `state/shared/handoffs/HANDOFF-claude-333c36e8-launch-readiness-ms0.md` agent transcripts for verbatim table.)

**By vendor family** (count = distinct family/variant rows):

| Vendor | Variants | Currently in v2 catalog? |
|---|---:|:---:|
| Fanuc | 8 (0i-F, 0i-TF, 0i-MF, 16i, 18i, 30i, 31i, 32i-B) | NO — only generic `fanuc` |
| Siemens | 6 (808D, 810D, 828D, 840C, 840D, 840D sl, SINUMERIK ONE) | NO — only generic `siemens` |
| Heidenhain | 4 (iTNC 530, TNC 620, TNC 640, TNC7) | NO — only generic `heidenhain` |
| Mazak | 4 (SmoothG, SmoothX, SmoothAi, SmoothEz) | NO — only generic `mazak` |
| Okuma | 5 (OSP-P200, OSP-P300M, OSP-P300L, OSP-P300A, OSP-P500) | NO — only generic `okuma` |
| Mitsubishi | 3 (M70, M80, M800) | NO — only generic `mitsubishi` |
| Haas | 1 (NGC) | YES |
| Fagor | 3 (8070, 8060, 8055) | NO entirely |
| Hurco | 2 (WinMAX BNC, WinMAX ISNC) | NO entirely |
| DMG MORI CELOS | 3 (Siemens/Fanuc/Mitsubishi kernels) | NO entirely |
| Brother | 1 (C00) | NO entirely |
| Doosan/DN | 2 (Fanuc 0i, 31i variants) | NO entirely |
| Citizen Cincom | 2 (M70, M720 swiss) | NO entirely |
| Makino | 2 (Pro6, Hyper-i) | NO entirely |
| Specialty | 9 (Fidia C40, Datron next, Sodick LN, Fadal, Traub TX8i, Kitamura Arumatik, Index C200, EMAG VL, Heller) | NO entirely |
| Body-keyword only | 6 (Star, Tsugami, Nakamura, Toyoda, Chiron, Grob) | NO entirely |
| Generic | 1 (Fanuc-compatible) | NO |

### 1.3 Feature axes my current 6-feature gate misses

Current: `hsm, tsc, probing, ssv, five_axis_tcp, cas, coolant{flood,mist,air,tsc}`.

CFME-additional axes the v3 generator should sample:

- `ai_contour` (Fanuc 30i+ / Siemens 828D+ / Heid TNC 640+ / Mazak SmoothAi / Okuma P300+)
- `look_ahead_blocks` (40 vs 1000 vs unlimited — affects HSM tolerance scenarios)
- `tilted_workplane` (G68.2 vs PLANE SPATIAL vs CYCLE800 vs TCV — all distinct dialects)
- `extended_cycles` (G54.1 P1-P48 vs Heid Q-params vs Siemens GUD)
- `deep_hole_drilling` (G83 chip-break vs G73 partial-retract — vendor variants)
- `macro_programming` (G65 vs Mazatrol vs Heid Q vs Siemens R)
- `conversational` (Heid Klartext vs Mazak MAZATROL vs Hurco NC/Conv merge)
- `nurbs` (Fanuc 16i+ / Siemens BSPLINE/ASPLINE/CSPLINE / Mazak no / Okuma G06.2 Super-NURBS)
- `polar_interpolation` (G12.1/G13.1 vs Siemens TRANSMIT/TRACYL)
- `max_axes` (3 → 8 → 31 → 64)
- `max_channels` (1 → 4 → 10 → 31)
- `thermal_comp` (Mazak Thermo-Shield vs Okuma TAS-C vs Heid KinematicsOpt)
- `collision_avoidance` (Okuma CAS vs Mazak SmoothAi vs Heid DCM 2.0)
- `adaptive_control` (Okuma AI Servo vs Mazak AI Spindle Health vs Heid ADP 2.0)

Vendor-unique axes (per MPPUAGE + tribal):

- Haas: `G103 P1 look-ahead limit`, `G12/G13 circular pocket`, `G150 pocket`, `WIPS`, `G254/G255 DWO`
- Brother: `M280/M281/M282 accuracy mode`, `G77 tap`, `M241-M250 acc/dec`
- Mazak: `IPM intelligent pocket`, `SMC smooth machining config`, `M11 spindle-tool unclamp gotcha`, `MAZATROL TWINS`
- Okuma: `Super-NURBS G06.2`, `Machining Navi M-Navi`, `Thermo-Friendly TAS-S/TAS-C`
- Heidenhain: `3D-ToolComp`, `KinematicsOpt 450-453`, `Klartext vs ISO`, `FK free-contour`
- Siemens: `TRANSMIT/TRACYL`, `ORIWKS/ORIMKS`, `COMPCURV/COMPCAD/COMPON`, `BSPLINE/ASPLINE/CSPLINE`, `R/GUD/LUD parameters`, `FFWON`
- Hurco: `UltiMotion`, `Transform Plane`, `AdaptiPath`, `NC/Conv merge`
- Makino: `SGI.5`, `ATLM`, `HyperCut/HyperSpark E-Packs`

---

## Section 2 — Machine Universe (~1,200-1,500 enumerated across 16 catalogs)

### 2.1 Per-catalog enumeration (full table from Agent F)

| # | Catalog file | Count | Brands | Unique strength | JM-Die? |
|---:|---|---:|---:|---|:---:|
| 1 | `gwizard-machines.json` (CURRENT) | 99 | ~15 | spindle torque curves | NO |
| 2 | `hsm-advisor-machines.json` | 18 | ~10 | torque + HP | NO |
| 3 | `machine-profiles-catalog.ts` | (interfaces only) | — | schema | NO |
| 4 | `machine-profiles-catalog-ext.ts` | 180 | ~25 | broad mix | NO |
| 5 | `machine-profiles-catalog-ext2.ts` | 656 | ~40 | biggest spread (VMC 255/5ax 119/lathe 110/HMC 66/mill_turn 60/swiss 34/bridge 12/EDM 3/router 1) | NO |
| 6 | `machine-enrichment-catalog.ts` (Haas LEVEL5) | 377 | ~5 | deepest field set (high_speed, trunnion, pallet, toolroom flags) | partial (Haas) |
| 7 | `machine-enrichment-inferred.ts` | ~7 | ~3 | — | NO |
| 8 | `machine-kinematics-catalog.ts` | 250 | 33 | kinematic_chain + collision_zones (132) | partial |
| 9 | `machine-kinematics-enriched.ts` | 660 | 34 | superset of #8 | partial |
| 10 | **`machine-post-enriched.ts`** | **827** | **47** | **broadest brand spread + controller string per machine** | partial |
| 11 | `machine-torque-curves.ts` | ~1062 curve points | per-id | only real torque-curve source | partial |
| 12 | `machine-spindle-corrections.ts` | small | — | spindle correction map | — |
| 13 | `machine-3d-model-catalog.ts` | 261 | 12 | STEP file paths | Okuma block likely |
| 14 | `wedm-published-machines.ts` | 10 | ~5 | WEDM specialist | Mitsubishi FA10S = JM-Die WEDM-01 |
| 15 | `okuma-machines-from-step.ts` | 39 | 1 | full Okuma fleet inc. JM-Die's 7 lathes + Multus + M460V-5AX | **YES (canonical)** |
| 16 | **`jm-die-profile.ts JM_DIE_CONTROLLER_MAP`** | **15** named of 21 | 5 | **only source with `post_processor: "*.cps"` filenames** | **YES (canonical)** |

### 2.2 Recommended v3 JOIN strategy

```
loadMachines(opts = { mode: 'broad' | 'jm-die-faithful' }) {
  // mode 'broad' = max variability for cross-shop scenarios
  // mode 'jm-die-faithful' = JM-Die's 21 canonical machines only
  
  const base = readJson('machine-post-enriched.ts');           // 827 base universe
  const kine = readJson('machine-kinematics-enriched.ts');     // 660 with kinematics
  const jmd  = readTs ('jm-die-profile.ts').JM_DIE_CONTROLLER_MAP; // 15 with .cps pairing
  const oku  = readTs ('okuma-machines-from-step.ts');         // Okuma fleet specifics
  const torq = readTs ('machine-torque-curves.ts');            // per-machine torque
  
  return joinByBrandModel(base, kine, jmd, oku, torq);
}
```

JOIN key: `lowercase(brand + model).replace(/[-_ ]/g, '')`. Brand aliases: `DMG MORI`→`dmgmori`, `Mazak MAZATROL`→`mazak`.

### 2.3 Variability gaps current gwizard-only generator misses

- **Brand spread:** 32 brands missing (DMG MORI, Mazak verbose, Makino, Hermle, Matsuura, GROB, Chiron, Citizen, Brother, Hardinge, Index, Nakamura-Tome, Kitamura, Mitsui Seiki, Roku-Roku, Mikron, Soraluce, Spinner, Hyundai WIA, DN Solutions, EMAG, Sodick, Hartford, Leadwell, Quaser, OKK, Heller, Fidia, MHI, Kern, Cincinnati, Giddings & Lewis, AWEA, DATRON, Fadal, Feeler)
- **5-axis topology:** 0 in gwizard, 160 in post-enriched. Trunnion vs swivel vs table-table vs head-head = distinct RTCP/TCPM post blocks
- **Mill-turn/swiss/bridge/VTL:** gwizard has none
- **Controller diversity:** gwizard's `controller` field is single-token; post-enriched carries verbose strings (Siemens 840D sl / Fanuc Hyper i / MAZATROL SmoothAi/SmoothG/SmoothX / OSP-P300MA-H / WinMAX v10) that pair to distinct posts
- **Kinematic chain + collision zones:** 132 entries unused
- **Real `.cps` pairing:** only `jm-die-profile.ts` has it
- **WEDM/EDM:** gwizard has none
- **Torque curves vs flat HP:** gwizard 3-point vs torque-curves multi-point
- **Pallet/trunnion/high-speed/toolroom flags:** only in `machine-enrichment-catalog.ts`

---

## Section 3 — Cycle/Strategy Universe (~1,500 across 6 banks)

### 3.1 Strategy bank inventory (Agent G)

| Bank | Count | Source | Currently in v2? |
|---|---:|---|:---:|
| MILLING_ROUGHING | ~120 | `ToolpathStrategyRegistry.MILLING_ROUGHING_STRATEGIES` | partial |
| MILLING_FINISHING | ~120 | `MILLING_FINISHING_STRATEGIES` | partial |
| TURNING | ~70 | `TURNING_STRATEGIES` | minimal |
| HOLE_MAKING | ~50 | `HOLE_MAKING_STRATEGIES` | partial |
| MULTIAXIS | ~40 | `MULTIAXIS_STRATEGIES` | NO (axis_count is number, not op) |
| PRISM_NOVEL | ~50 | `PRISM_NOVEL_STRATEGIES` | NO |
| EXTENDED (consolidated cross-vendor) | 1500+ | `consolidateExtendedStrategies()` line 4514 | NO |

### 3.2 Canonical G-code coverage (30+ codes documented, v2 covers ~12)

Drilling: G73, G74, G81, G82, G83, G84, G84.2, G84.3, G85, G86, G87, G88, G89.
Turning: G70, G71, G72, G73, G74, G75, G76, G92, G32, G33, G34.
Mill-turn: G07.1 (G107), G12.1/G13.1, G68.2, G43.4, G43.5, G53.1.
HSM: G05.1 Q1 (AICC), G05 P10000 (HPCC).
Probing: G31 (skip), G65 (Renishaw macros P9810-P9856).
WCS: G54-G59 + G54.1 P1..P48.
Sub-spindle/multi-channel: M198 sub-call, P/Q sub-program range, !L W (Mazak channel-wait), G50 RPM clamp, G96/G97 CSS.

### 3.3 5-axis-specific operation types (12 enumerated, v2 covers 0)

3+2 positional · simultaneous-5 (RTCP) · tool-axis vector · swarf (flank) · indexed undercut (lollipop) · port/cavity · blade flank · blisk plunge · impeller hub/fillet · barrel-tool · spline drilling · HPCC/AICC smoothing.

Each varies per controller dialect (Fanuc G43.4/.5+G68.2 vs Heid M128+PLANE family vs Siemens TRAORI+CYCLE800 vs Okuma TCPC+TCV).

### 3.4 Multi-domain cross-products (13 enumerated)

Mill-turn (YES), Lathe-EDM electrode prep (PARTIAL), Mill-EDM (PARTIAL), Lathe-Grinder (NO bridge), Mill-Grinder (PARTIAL), Mill-Polish (PARTIAL), Additive-Subtractive (PARTIAL), Swiss-turn (YES), Wire+Sinker EDM (NO bridge), Laser+Mill (NO), Waterjet+Mill (NO bridge), 5ax+Probe in-cycle (PARTIAL), Mill+Probe in-cycle (YES), Mill+Deburr in-cycle (YES).

---

## Section 4 — Adaptability Universe (~40 axes vs current 9)

### 4.1 Shop profile (1 profile loaded: JM-Die canonical only)

`ShopProfile` fields: id, name, rates × 6, machines[] × 33 fields, overhead_pct, material_markup_pct, tooling_cost_per_op, material_cost_per_part_default, admin_burden_pct, company_profile × 10, source_roots × 10, seed_domains[]. **No aerospace / medical / garage / job-shop profile exists** — every scenario implicitly inherits JM-Die's specialization (Midwest fastener-die, 21-machine roster, Mastercam+hyperMILL+GibbsCAM CAM stack).

### 4.2 Customer adaptability layer

- `CustomerKnowledgeProfile` (CustomerKnowledgeEngine.ts:18-34)
- `ShopModifier` (per-customer learned speed/feed/doc factor with confidence)
- `CustomerMaterialMapEngine` (per-customer ISO-group distribution from filename heuristics + print back-annotation)
- `CrossCustomerPolicyTransferEngine` (transfer keys: material_class × operation_type × machine_class)
- **JM_DIE_CUSTOMERS = 118 canonical names; filesystem reality = 476 customer folders → 4× silent drift**

### 4.3 Material policy (7 ISO groups, v2 covers 6 — missing X)

Material-record-level overrides not sampled: condition (heat-treat), mechanical.hardness, machinability_rating, kienzle.{kc1_1,mc}, taylor.{C,n}, johnson_cook.{A,B,n,m,C}, coolant compatibility list, coating compatibility 1-5 per ISO, subcategory (free_machining / tool_steel / aluminum_2xxx), fallback chain (S→M, H→P, X→all).

4-layer override chain: CORE → ENHANCED → USER → LEARNED (priority 1→4).

Condition/temper variants: stainless 11197-line table, carbon_alloy_steel 29941, tool_steels_hardness 31048, aluminum_temper 15595, copper_temper 8585.

Schema-NOT-modeled (scenario-tag only): virgin-vs-recycled, certified-vs-commodity, RoHS/REACH, AS9100 chain-of-custody.

### 4.4 Tooling pool (20 vendor catalogs, 85-field CuttingTool schema)

Catalogs (sizes): helical(3.9M) · emuge(2.9M) · additional(2.1M) · indexable(1.9M) · osg(1.7M) · sumitomo(1.2M) · ampc(1.0M) · global-cnc(482K) · guhring(455K) · sandvik(391K) · ingersoll(386K) · sandvik-2022(247K) · seco(215K) · mitsubishi(205K) · tungaloy-us(114K) · sgs(50K) · dormer-pramet(44K) · niagara(40K) · zenit(40K) · horn(28K).

Tool fields the corpus should sample: substrate ∈ {carbide,HSS,ceramic,PCD,CBN}, grade, coating{type,thickness,hardness,max_temperature,multi_layer,layer_count}, geometry{diameter,helix,rake,relief,corner_radius,chamfer,taper,point_angle,edge_preparation,chip_breaker}, holder{interface(BT40/CAT50/HSK-A63),gauge_length,overhang,balance_grade,pullout_force}, performance.recommendations[iso_group].{speed_sfm,feed_ipt,doc_max,woc_max,coolant}, collision_envelope, prior_wear_state (from magazine).

### 4.5 Safety tier matrix (4 tiers; 3 of 4 actions ASPIRATIONAL)

| Tier | Ω min | S(x) min | Cpk | FAI | Status |
|---|---|---|---|---|---|
| shop_floor | 0.95 | 0.98 | — | YES | check_action aspirational |
| production | 0.90 | 0.95 | 1.33 | — | promote_action aspirational |
| proven_out | 0.85 | 0.90 | — | — | evidence_chain_action aspirational |
| sim | 0.50 | 0.70 | — | — | enforced |

Runtime canonical is `omegaDispatcher.ts` flat: RELEASE=0.70, SAFETY_MIN=0.70. **Scenario must record claim tier AND `is_runtime_enforced:boolean`** — fail-loud documentation of the gap.

OmegaSafetyScoreEngine: 6 dimensions {collision, overload, chatter, thermal, breakage, workholding}, per-dimension safe=1.0/caution=0.85/warning=0.60/critical=0.25/veto=0, geometric mean, any veto → S(x)=0 hard block.

### 4.6 Operator preferences (5 bias axes, v2 covers 0)

`OperatorPreferences`: speedFeedBias ∈ {conservative,balanced,aggressive}, surfaceFinishPriority ∈ {low,medium,high,critical}, cycleTimeVsToolLife ∈ {favor_cycle,balanced,favor_tool_life}, coolantPreference ∈ {flood,mist,air,through_tool,machine_default}, chipBreakStrategy ∈ {standard,aggressive_peck,high_pressure_coolant}, safetyMarginPercent, maxSpindleRpmOverride, maxFeedrateOverride_mmpm.

**No skill-tier enum** — only `experienceYears:number`. Apprentice/journeyman/master is graph-only.

### 4.7 10 hard-override rules (v2 covers 0)

`ContextualStrategyOverrideEngine`: thin_wall, deep_bore, fragile_material, prototype_batch, hard_material, soft_gummy, micro_feature, interrupted_cut, very_deep_pocket, unsupported_overhang.

### 4.8 Adaptive arbitration

`AdaptiveOverrideEngine`: mode ∈ {conservative, balanced, aggressive}, max/min feed/speed override bounds.

---

## Section 5 — v3 Architecture

### 5.1 Adapter-pattern catalog libs (dedup-first)

Replace inline catalog constants with thin adapters over canonical PRISM engines:

```
scripts/lib/post-processor-catalog.mjs
  ├─ adapter: ControllerFeatureMatrixEngine.CONTROLLER_MATRIX  (17 → 62 phased)
  ├─ adapter: machine-post-enriched.ts + jm-die-profile.ts JOIN  (827 + 15 canonical)
  ├─ adapter: ToolpathStrategyRegistry banks                    (1500+ strategies)
  ├─ adapter: OperatorPreferencesEngine biases                  (5 axes)
  ├─ adapter: ContextualStrategyOverrideEngine 10 hard-overrides
  ├─ adapter: omega-thresholds.json 4-tier ladder
  └─ adapter: CustomerKnowledgeEngine ShopModifier              (per-customer learned)
```

### 5.2 v3 scenario schema

Adds (on top of v2):

```jsonc
{
  // v3 additions:
  "controller_variant": "fanuc-31i-b5",   // not just "fanuc" — pick CFME-detailed variant
  "feature_axes": {                       // 25-axis CFME superset (replaces 6-axis OPTIONAL_FEATURES)
    "hsm_smoothing": "AICC-Q2", "ai_contour": true, "look_ahead_blocks": 1000,
    "tcp_rtcp": "G43.4", "tilted_workplane": "G68.2", "extended_cycles": "G54.1 P1..P48",
    "nurbs": true, "polar_interpolation": "G12.1", "thermal_comp": "Mazak-Thermo-Shield",
    "collision_avoidance": "Okuma-CAS", "adaptive_control": "AI-Servo",
    "max_axes": 5, "max_channels": 1
  },
  "machine_kinematics": {
    "topology": "table-table" | "table-head" | "head-head" | "bridge",
    "kinematic_chain": [...],
    "collision_zones": [...],
    "rtcp_support": "G43.4" | "M128" | "TRAORI" | "TCPC",
    "torque_curve_id": "...",
    "post_processor_cps": "JM_DIE_2.cps"   // when JOIN matches JM-Die
  },
  "operator_preferences": {
    "speedFeedBias": "balanced",
    "surfaceFinishPriority": "high",
    "cycleTimeVsToolLife": "balanced",
    "coolantPreference": "through_tool",
    "chipBreakStrategy": "high_pressure_coolant"
  },
  "customer_context": {
    "customer_id": "ALCOA",
    "iso_distribution": { "M": 0.6, "N": 0.4 },
    "learned_modifiers": [
      { "type": "speed_factor", "value": 1.15, "confidence": 0.85, "observations": 23 }
    ]
  },
  "material_overrides": {
    "condition": "annealed" | "Q&T" | "as-rolled",
    "layer_source": "ENHANCED",   // CORE | ENHANCED | USER | LEARNED
    "fallback_chain": ["S", "M"]
  },
  "tool_overrides": {
    "vendor_quality_tier": "premium" | "standard" | "value",
    "coating_layer_count": 3,
    "prior_wear_state": { "edges_used": 2, "remaining_life_min": 67 }
  },
  "hard_overrides_applicable": ["thin_wall", "interrupted_cut"],   // from 10-list
  "safety_tier_claim": "shop_floor",
  "safety_tier_runtime_enforced": false   // R12 fail-loud — most tier-actions aspirational
}
```

### 5.3 Coverage uplift target

| Axis | v2 | v3 phased | v3 full |
|---|---:|---:|---:|
| controllers | 7 | 17 (CFME-detailed) | 62 (all variants) |
| machines | 99 | 827 (post-enriched) | ~1,500 (joined) |
| cycles | ~25 | ~75 (canonical G-codes + 5-ax ops) | ~150 (full ToolpathStrategyRegistry) |
| optional_features → feature_axes | 6 | 25 (CFME superset) | 25 + vendor-unique |
| operator preferences | 0 | 5 axes | 5 + safetyMarginPercent + RPM/feed overrides |
| customer context | 0 | per-scenario customer_id + iso_dist | + learned ShopModifier sample |
| material overrides | 0 (1 ISO group only) | 7 ISO groups + condition | + 4-layer source tracking |
| tool overrides | 0 | vendor tier + coating layers | + prior_wear_state |
| hard_overrides | 0 | 10-rule applicability | + ContextualStrategyOverride mode |
| safety_tier | implicit shop_floor | explicit 4-tier claim + runtime gap flag | + 6-dim S(x) breakdown |
| machine_kinematics | type-only | topology + RTCP | + kinematic_chain + collision_zones |

**Estimated v3 batch composite-coverage:** 91.8% (v2) → **95%+ (v3 phased)** **with 5× more sampled axes.**

---

## Section 6 — Phased Build Plan (v3 sub-units)

Each closes a portion of the variability matrix. Listed in leverage order.

| Sub-unit | Description | Closes axes | LOC est | Owner |
|---|---|---|---:|---|
| **P0-U06.7 (in progress this turn)** | CONTROLLER_FEATURES → adapter over CFME (17 variants) | controllers 7→17 + CFME 25-axis feature superset | ~250 | india |
| P0-U06.11 (next) | Machine catalog → JOIN over post-enriched + kinematics-enriched + jm-die + okuma-step | machines 99→1500 + machine_kinematics + .cps pairing | ~350 | india |
| P0-U06.13 (NEW) | ToolpathStrategyRegistry adapter | cycles ~25→~150 + 5-ax-specific ops | ~200 | india |
| P0-U06.14 (NEW) | OperatorPreferencesEngine adapter | 5 operator-bias axes | ~120 | india |
| P0-U06.15 (NEW) | ContextualStrategyOverrideEngine adapter | 10 hard-override rules | ~100 | india |
| P0-U06.16 (NEW) | omega-thresholds.json + runtime-vs-claim gap flag | 4 safety tiers + R12 enforcement-gap | ~80 | india |
| P0-U06.17 (NEW) | Material 4-layer override + condition/temper variants | 7 ISO groups + 4-layer + condition | ~150 | india |
| P0-U06.18 (NEW) | CustomerKnowledgeEngine + ShopModifier adapter | per-customer iso_dist + learned modifiers | ~180 | india |
| P0-U06.19 (NEW) | Tool catalog vendor tier + coating layers + prior_wear | 20 vendor catalogs + 85-field schema | ~250 | india |
| P0-U06.20 (NEW) | Shop profile multi-profile registry (aerospace / medical / garage in addition to JM-Die) | shop_profile diversity | ~200 | india |

---

## Section 7 — Verification channels (Boris-discipline)

Per finding, the re-measurement path:

1. **Controller count uplift:** `node -e "const m=require('H:/prism/mcp-server/dist/engines/ControllerFeatureMatrixEngine.js');console.log(m.CONTROLLER_MATRIX.length)"` → expect ≥17 (currently CFME has 17 fully-detailed).
2. **Machine count uplift:** v3 manifest.coverage.by_machine_make should report ≥40 unique makes (vs gwizard's ~15).
3. **Cycle code uplift:** scenario `cycle` field sampled from ToolpathStrategyRegistry-derived list → expect ≥50 distinct codes per 200-scenario batch.
4. **Per-controller feature_axes density:** scenario.feature_axes object should have ≥10 populated keys per scenario (vs v2's ≤4).
5. **JM-Die alignment:** when scenario.customer_id ∈ JM_DIE_CUSTOMERS, scenario.machine MUST exist in JM_DIE_CONTROLLER_MAP (anti-regression).
6. **Safety tier runtime-vs-claim:** scenario.safety_tier_runtime_enforced field present + truthful (false where omegaDispatcher uses flat 0.70).

---

## Section 8 — Open questions for operator

1. **JM-Die-faithful vs broad-market mode:** v3 should default to which? My recommendation: `--mode broad` for max variability, `--mode jm-die-faithful` for shop-floor prove-out. Both modes ship.
2. **Safety tier gap policy:** flag `is_runtime_enforced:false` scenarios as warnings or fails? Recommendation: WARN by default, FAIL with `--strict-tier-enforcement`.
3. **Customer roster drift (118 canonical vs 476 filesystem):** v3 samples from the canonical 118 OR filesystem 476? Recommendation: 118 (canonical wins; surface drift as separate audit).
4. **Multi-shop profiles:** ship v3 with JM-Die only and queue aerospace/medical/garage profiles to P0-U06.20? Recommendation: YES — single shop today, additive shop-registry later.

---

## Section 9 — Source citations

All paths absolute. Read end-to-end during enumeration:

**Agent E (controllers):**
- `H:/prism/mcp-server/src/engines/ControllerFeatureMatrixEngine.ts` (1650 lines)
- `H:/prism/mcp-server/src/engines/MasterPostProcessorUnifiedAGIEngine.ts` lines 317-508
- `H:/prism/mcp-server/src/data/controller-knowledge.json`
- `H:/prism/mcp-server/src/data/controller-knowledge-tips.ts`
- 25 `*Controller*Engine.ts` + 12 `*Dialect*Engine.ts`

**Agent F (machines):**
- All 16 catalogs in `mcp-server/src/data/` named in §2.1

**Agent G (cycles/strategies):**
- `H:/prism/mcp-server/src/engines/CAMScenarioGeneratorEngine.ts`
- `H:/prism/mcp-server/src/registries/ToolpathStrategyRegistry.ts` (4700+ lines, 6 banks)
- `H:/prism/mcp-server/src/registries/CAMSystemRegistry.ts` (18 CAM systems)
- `H:/prism/mcp-server/src/data/pipelineDecisionTaxonomy.ts` (114 decision points × 9 pipelines)
- `H:/prism/mcp-server/src/data/wedm-engine-registry.ts`
- Thread data: `threadDataAcme/ISO/Pipe/Unified.ts`

**Agent H (adaptability):**
- `H:/prism/mcp-server/src/engines/ShopConfigurationEngine.ts` (1036 lines)
- `H:/prism/mcp-server/src/data/jm-die-profile.ts`
- `H:/prism/state/shared/omega-thresholds.json`
- `H:/prism/mcp-server/src/registries/MaterialRegistry.ts`
- `H:/prism/mcp-server/src/registries/ToolRegistry.ts` (85-field CuttingTool)
- `H:/prism/mcp-server/src/registries/CoatingRegistry.ts`
- `H:/prism/mcp-server/src/registries/CoolantRegistry.ts`
- `H:/prism/mcp-server/src/engines/OmegaSafetyScoreEngine.ts`
- `H:/prism/mcp-server/src/engines/ContextualStrategyOverrideEngine.ts`
- `H:/prism/mcp-server/src/engines/AdaptiveOverrideEngine.ts`
- `H:/prism/mcp-server/src/engines/OperatorPreferencesEngine.ts`
- `H:/prism/mcp-server/src/engines/CustomerKnowledgeEngine.ts`
- `H:/prism/mcp-server/src/engines/CustomerMaterialMapEngine.ts`
- `H:/prism/mcp-server/src/engines/CrossCustomerPolicyTransferEngine.ts`

**Parent context:**
- `state/shared/specs/LAUNCH-READINESS-2026-05-24.md` (PRISM-LAUNCH-READINESS-MS0 audit + envelope)
- `knowledge/wiki/code-tribal/post-processor-cross-controller-corpus.md` (silent-dialect-cross-map class)
- `knowledge/wiki/architecture/p0-u06-post-processor-corpus.md` (component map + API)
- `C:/Users/wompu/.claude/projects/H--prism/memory/reference_p0_u06_post_processor_corpus_2026_05_25.md`
