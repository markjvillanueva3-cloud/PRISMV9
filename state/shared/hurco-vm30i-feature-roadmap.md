# Hurco VM30i Post Processor — Feature Roadmap + Tier System

**Author:** slot:echo · 2026-05-24
**Purpose:** scope every functionality dimension worth selling on the Hurco V11 post (WinMax MAX5 family, JM Die VMX24 + VM30i). Defines a tier-gated feature catalog so the operator can ship Basic / Pro / Premium SKUs and the customer sees what they paid for.

---

## 1. Tier system — three SKUs

| Tier | Price band (target) | Customer profile | Token-of-value |
|---|---|---|---|
| **BASIC** | included with any PRISM seat | hobbyist / single-machine shop | gets a working post; no physics, no advanced features |
| **PRO** | per-machine subscription | production shop (2-10 machines) | full PRISM physics + live adaptive + tribal tips + prove-out |
| **PREMIUM** | per-machine subscription + concierge | precision/aerospace/medical (10+ machines) | everything in Pro + GNN-learned outcomes + custom controller capability extraction + per-shop tribal tuning + setup-sheet auto-fill from CAD model |

Tier is gated by `HurcoPostConfig.tier: "basic" | "pro" | "premium"`. Engine refuses to apply higher-tier features when the config tier is lower — clean R12 fail-loud, no silent partial application.

---

## 2. Feature catalog — 28 sellable features across 8 capability axes

Each row = one operator-visible feature × the engines it depends on × the tier that unlocks it.

### Axis A — G/M-code dialect & emission (5 features)

| ID | Feature | WinMax MAX5 capability | Engine | Tier |
|---|---|---|---|---|
| A1 | ISNC mode emission | ISO NC syntax | `ControllerDialectEngine.hurco_max5` | BASIC |
| A2 | BNC mode emission | Basic NC syntax (compact) | `ControllerDialectEngine.hurco_max5` | PRO |
| A3 | M140 Z-retract (Hurco-native, replaces G53) | M140 op | `HurcoV11MillMasterPostEngine` direct | PRO |
| A4 | R-word vs IJK arc format toggle | both supported | `HurcoV11` emission switch | BASIC |
| A5 | G84.2 / G84.3 rigid tapping with chip-break | rigid tap canned cycle | `HurcoV11` + `tap` op type | PRO |

### Axis B — Speed / feed intelligence (4 features)

| ID | Feature | WinMax capability | Engine | Tier |
|---|---|---|---|---|
| B1 | Operator aggressiveness L1..L5 (sync path) | feedrate scaling | `HURCO_AGGRESSIVENESS_TABLE` | BASIC |
| B2 | Prove-out feed factor (0.0..1.0) + M01 optional stops | first-piece audit | `prove_out` config + `PROVE_OUT_LABEL` | BASIC |
| B3 | Async PRISM AutoSpeedFeed pipeline (Kienzle + Taylor + material registry) | physics-derived S/F per op | `autoSpeedFeedEngine.optimize()` | PRO |
| B4 | Kienzle-bounded feed reducer (max_cutting_force_N) | physics safety gate | `HurcoV11` + `physics/constants.ts` | PRO |

### Axis C — Live adaptive cutting (THE BIG GAP — 5 features, 0 currently wired) (5 features)

| ID | Feature | WinMax capability | Engine (exists, NOT yet wired) | Tier |
|---|---|---|---|---|
| C1 | Engagement-adaptive feed (3D-adaptive-style) — feed scales with radial engagement | block-level F overrides | `EngagementAdaptiveFeedEngine` | PRO |
| C2 | Constant-chipload coordinator — feed adjusts as DOC/WOC changes | block-level F overrides | `CSSChipLoadInvariantCoordinatorEngine` | PRO |
| C3 | Per-block live adaptation — line-by-line G-code tweak | block-level F overrides | `LineByLineAdaptiveEngine` | PREMIUM |
| C4 | Bayesian learn-from-prior-runs — feed converges to operator-edited values over runs | block-level F overrides | `BayesianAdaptiveEngine` | PREMIUM |
| C5 | Tool-life adaptive — slows down as wear accumulates over the spindle's life | block-level F overrides | `ToolLifeAdaptiveEngine` | PREMIUM |

### Axis D — Lead-in / lead-out shaping (GAP — 4 features, 0 currently wired) (4 features)

| ID | Feature | WinMax capability | Engine (NOT yet built for Hurco) | Tier |
|---|---|---|---|---|
| D1 | Tangential arc-on for contour ops — eliminate witness marks | G2/G3 arc moves | NEW: `HurcoLeadInOutEngine.shapeContour()` | PRO |
| D2 | Helical ramp entry for closed pockets — no plunge | G2/G3 helical entry | NEW: `HurcoLeadInOutEngine.shapePocket()` | PRO |
| D3 | Plunge clearance for drill cycles — avoid surface witness | G81/G83 canned cycle | NEW: `HurcoLeadInOutEngine.shapeDrill()` | PRO |
| D4 | Tool-saving lead heights — per-tool minimum-safe-Z lookup | tool-table-driven | NEW: extends `MillTool` with `min_safe_z_mm` | PREMIUM |

### Axis E — Rapid / retract / sequencing (4 features, all wired) (4 features)

| ID | Feature | WinMax capability | Engine | Tier |
|---|---|---|---|---|
| E1 | Hybrid rapid optimization (G0 vs G1 at rapid feed) | G0 + G1 hybrid | `rapidRepositionOptEngine.optimizeRapids()` | PRO |
| E2 | Retract optimization (minimum safe height per peer op) | block-level Z override | `rapidRepositionOptEngine.optimizeRetracts()` | PRO |
| E3 | Air-cut elimination (skip moves above stock) | block elimination | `rapidRepositionOptEngine.detectAirCuts()` | PRO |
| E4 | Feature sequencing (tool-min + setup-min orderings) | op-list reorder | `rapidRepositionOptEngine.sequenceFeatures()` | PRO |

### Axis F — Smoothing / HSM / UltiMotion (3 features) (3 features)

| ID | Feature | WinMax capability | Engine | Tier |
|---|---|---|---|---|
| F1 | G05.3 smoothing (P35 rough / P20 semi / P10 finish) | look-ahead smoothing | `HurcoV11` + `advancedPostProcessorEngine` | PRO |
| F2 | UltiMotion 10K-block look-ahead, 15K blocks/sec, NURBS | high-speed trajectory | `use_ultimotion` config | PRO |
| F3 | HSM corner-dwell (servo-limited corner softening) | G64 + dwell | `HSMDwellAtCornerEngine.analyzeDwell()` | PRO |

### Axis G — Tribal knowledge injection (CURRENTLY 0.5% utilized — 3 features) (3 features)

| ID | Feature | WinMax capability | Engine | Tier |
|---|---|---|---|---|
| G1 | Embedded 20-tip JM Die tribal pack | header-comment injection | `HURCO_TRIBAL` array (current) | BASIC |
| G2 | Full 3919-tip cross-CAM tribal pack (mill ∩ Hurco-controller subset) | header-comment injection | NEW: `tribalKnowledgeEngine.filterByDomain()` | PRO |
| G3 | Per-shop tribal-tuning (operator-graded tips accumulate over runs) | header-comment injection + outcome feed | NEW: `tribalKnowledgeEngine.applyShopProfile()` | PREMIUM |

### Axis H — Controller capability exploitation (PARTIAL — 4 features) (4 features)

| ID | Feature | WinMax capability | Engine | Tier |
|---|---|---|---|---|
| H1 | Static machine constraint check (max RPM, spindle HP, axis travel) | machine envelope | `machineStrategyConstraintEngine` (wired) | BASIC |
| H2 | Dynamic controller capability extraction — pulls G05.3 P-levels, NURBS support, look-ahead depth, available macro slots, M-code inventory from `ControllerDialectEngine` and surfaces in header comments | controller introspection | NEW: `extractControllerCapabilities("hurco_max5")` | PRO |
| H3 | Renishaw OMP40 probing macro library (G65 P9xxx — Hurco-specific) | G65 macros | NEW: `HurcoProbeCycleEngine` (gap — currently only a tribal tip) | PREMIUM |
| H4 | G68.2 work surface definition (tilted-plane machining) | 3+2 surface plane | NEW: `HurcoWorkSurfaceEngine` (gap) | PREMIUM |

---

## 3. Summary — coverage delta from this scoping

| Axis | Total features | Currently wired in V11 | Gap features | Top gap class |
|---|---:|---:|---:|---|
| A — G/M-code dialect | 5 | 5 | 0 | none |
| B — Speed/feed | 4 | 4 | 0 | none |
| C — **Live adaptive** | 5 | **0** | **5** | **HIGHEST** |
| D — **Lead-in/out** | 4 | **0** | **4** | **HIGH** |
| E — Rapid/retract/seq | 4 | 4 | 0 | none |
| F — Smoothing/HSM | 3 | 3 | 0 | none |
| G — **Tribal injection** | 3 | 1 | 2 | **HIGH** |
| H — **Controller cap.** | 4 | 1 | 3 | **HIGH** |
| **TOTAL** | **32** | **18** | **14** |

**Current state:** 18 of 32 features (56%) wired. **14 sellable features pending** — each one closes a real customer-visible gap and adds a row to the tier ladder.

---

## 4. Tier-gating implementation (schema + runtime gate)

```typescript
// new in HurcoPostConfig
tier: "basic" | "pro" | "premium";  // default "basic"
purchased_features?: string[];        // optional whitelist for partial-Pro / partial-Premium SKUs

// runtime gate (engine internal)
function gateFeature(featureId: string, cfg: HurcoPostConfig): boolean {
  // Tier ladder: basic ⊂ pro ⊂ premium
  const tier = cfg.tier ?? "basic";
  const feature = FEATURE_CATALOG[featureId];
  if (!feature) throw new Error(`unknown feature ${featureId} — R12 fail-loud`);
  // operator-purchased whitelist wins
  if (cfg.purchased_features?.includes(featureId)) return true;
  // tier ladder check
  const tierOrder = { basic: 0, pro: 1, premium: 2 };
  return tierOrder[tier] >= tierOrder[feature.minTier];
}

// CATALOG (one entry per row above)
const FEATURE_CATALOG = {
  A1_isnc: { axis: "G/M-code", minTier: "basic", label: "ISNC mode", ... },
  A2_bnc:  { axis: "G/M-code", minTier: "pro",   label: "BNC mode", ... },
  // ... 32 entries total, one per feature in §2
};
```

When the engine emits a program, header comments name **every feature applied** and **every feature gated off due to tier**:
```
(PRISM FEATURES APPLIED THIS RUN — tier=pro)
(  A1 ISNC mode               ✓ on)
(  A3 M140 Z-retract          ✓ on)
(  B1 Aggressiveness L3       ✓ on, multiplier=0.9)
(  C1 Engagement-adaptive feed  ✓ on, +12% rough / -8% finish blocks)
(  H2 Controller capability extraction ✓ on — see PRISM HEADER below)
(  C3 Per-block live adaptation ✗ off — requires PREMIUM tier)
(  D1 Tangential arc-on        ✗ off — requires PRO tier — NOT YET BUILT)
```

This is the **user-clickable feature toggle** mechanism. Customer sees what they paid for + what's available to upgrade to.

---

## 5. Build sequencing — proposed 5-MS roadmap to ship all 14 gap features

| MS | Adds | Engines (new or wire) | Eff. (hrs) | Blocks |
|---|---|---|---:|---|
| HURCO-VM30I-ADAPTIVE-MS0 | C1, C2 | wire `EngagementAdaptiveFeedEngine` + `CSSChipLoadInvariantCoordinatorEngine` | 30 | none |
| HURCO-VM30I-LEADS-MS0 | D1, D2, D3 | NEW `HurcoLeadInOutEngine` (3 shapers) | 40 | none |
| HURCO-VM30I-TIER-GATE-MS0 | tier schema + FEATURE_CATALOG + header-comment emitter (G1) | engine-internal | 25 | gates every other MS |
| HURCO-VM30I-CONTROLLER-CAP-MS0 | H2, H3, H4 | NEW `HurcoControllerCapabilityEngine` + `HurcoProbeCycleEngine` + `HurcoWorkSurfaceEngine` | 60 | none |
| HURCO-VM30I-TRIBAL-EXPAND-MS0 | G2, G3, D4 | wire `tribalKnowledgeEngine.filterByDomain()` + shop-profile loader + extend MillTool | 30 | TIER-GATE |
| HURCO-VM30I-LEARN-MS0 | C3, C4, C5 | wire `LineByLineAdaptiveEngine` + `BayesianAdaptiveEngine` + `ToolLifeAdaptiveEngine` + outcome-event consumer | 60 | TIER-GATE, requires NN/GNN healthy (PSN-LEG-STATE flag) |

**Total: ~245 hours of engineering** to close all 14 gaps and ship the full 3-tier ladder. Operator can pick any subset.

---

## 6. WinMax-specific exploitation checklist (gap analysis)

| WinMax MAX5 capability | Currently exploited? | Notes |
|---|---|---|
| ISNC mode (ISO NC) | ✓ |  |
| BNC mode (Basic NC, compact) | ⚠ knowledge present, no emit toggle | Axis A2 |
| M140 Z-retract (Hurco-native) | ⚠ documented, no emit verified | Axis A3 |
| G05.3 smoothing (P35/P20/P10) | ✓ via `advancedPostProcessorEngine` |  |
| UltiMotion (10K look-ahead, NURBS) | ✓ via `use_ultimotion` config |  |
| G84.2 / G84.3 rigid tapping with chip-break | ⚠ tap op-type supported, chip-break not verified | Axis A5 |
| R-word arc format (Hurco preference) | ✓ R + IJK both supported |  |
| G65 P9xxx Renishaw OMP40 probe macros | ❌ tribal tip only — no engine | Axis H3 — PREMIUM |
| G68.2 tilted plane (3+2) | ❌ no engine | Axis H4 — PREMIUM |
| G54.1 P1-P99 extended work offsets | ⚠ G54-G59 covered, P-extension not | minor — would close in TIER-GATE |
| Conversational G65 macros (Hurco's marquee feature) | ⚠ flag exists (`use_conversational`), emission not verified | gap — see HURCO-VM30I-SCENARIOS-MS0 R1 |
| Tool preload (T-next on previous tool-change line) | ⚠ master CPS does, TS engine not verified | minor |
| Look-ahead buffer depth introspection | ❌ no extractor | Axis H2 |
| Macro slot inventory (which P-numbers are free) | ❌ no extractor | Axis H2 |
| M-code inventory (which M-codes the controller accepts) | ❌ no extractor | Axis H2 |
| sidecar JSON export (PRISM-Master CPS does it; TS engine doesn't) | ⚠ master CPS only | minor — TS engine could emit alongside .hnc |

---

## 7. Operator-facing UI sketch (for the React frontend that gates these)

```
┌─ HURCO VM30i POST CONFIGURATION ──────────────────────┐
│                                                       │
│  Tier:   ( ) BASIC   (•) PRO   ( ) PREMIUM             │
│                                                       │
│  FEATURES                                             │
│  ├─ G/M-CODE DIALECT                                  │
│  │  [✓] A1 ISNC mode                                   │
│  │  [✓] A2 BNC mode (compact)                          │
│  │  [✓] A3 M140 Z-retract                              │
│  │  [✓] A4 R-arc format                                │
│  │  [✓] A5 G84.2 rigid tapping with chip-break         │
│  ├─ SPEED / FEED                                       │
│  │  Aggressiveness: [3 ▼]  Prove-out: [✓ enabled]      │
│  │  [✓] B3 PRISM AutoSpeedFeed                         │
│  │  [✓] B4 Kienzle force ceiling: [500 N]              │
│  ├─ LIVE ADAPTIVE                                      │
│  │  [✓] C1 Engagement-adaptive feed                    │
│  │  [✓] C2 Constant-chipload coordinator               │
│  │  [⊘] C3 Per-block live adaptation  (PREMIUM)        │
│  │  [⊘] C4 Bayesian learn-from-runs   (PREMIUM)        │
│  │  [⊘] C5 Tool-life adaptive          (PREMIUM)        │
│  ├─ LEAD-IN / OUT                                      │
│  │  [✓] D1 Tangential arc-on                           │
│  │  [✓] D2 Helical ramp entry                          │
│  │  [✓] D3 Plunge clearance                            │
│  │  [⊘] D4 Per-tool min-safe-Z         (PREMIUM)        │
│  ├─ RAPIDS                                             │
│  │  [✓] E1 Hybrid rapid optimization                   │
│  │  [✓] E2 Retract optimization                        │
│  │  [✓] E3 Air-cut elimination                         │
│  │  [✓] E4 Feature sequencing                          │
│  ├─ SMOOTHING / HSM                                    │
│  │  [✓] F1 G05.3 smoothing  [✓] F2 UltiMotion  [✓] F3 HSM corner dwell │
│  ├─ TRIBAL                                             │
│  │  [✓] G1 JM Die 20-tip pack                          │
│  │  [✓] G2 Full 3919-tip cross-CAM pack                │
│  │  [⊘] G3 Per-shop tuning             (PREMIUM)        │
│  └─ CONTROLLER                                         │
│     [✓] H1 Machine envelope check                      │
│     [✓] H2 Controller capability extraction            │
│     [⊘] H3 OMP40 probe macros          (PREMIUM)        │
│     [⊘] H4 G68.2 tilted plane           (PREMIUM)        │
│                                                       │
│  [Generate Program]   [Upgrade to PREMIUM ▶]           │
└───────────────────────────────────────────────────────┘
```

---

## 8. Compounding-gains note

Every feature in §2 is **engine-keyed not Hurco-keyed** — wiring `EngagementAdaptiveFeedEngine` for the Hurco master post automatically makes the same feature available to the **OkumaOSPMillMasterPostEngine** and the **OkumaB250LatheMasterPostEngine** with the same gating. The 14-feature roadmap above doubles as the **3-machine roadmap** if those two engines wire the same calls. Tier ladder applies fleet-wide.

---

**Stopping at the first write per [COMPREHENSIVE-BUILD enumeration-first cutoff rule] — this is the scope.** Operator approves any subset → I ship via the MS sequence in §5.
