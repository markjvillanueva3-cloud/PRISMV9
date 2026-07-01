# PRISM Baseline Master Post Processors

**Generated:** 2026-04-26
**Location:** `mcp-server/src/engines/`

---

## 1. HurcoV11MillMasterPostEngine

**File:** `HurcoV11MillMasterPostEngine.ts` (16,941 bytes)
**Machine:** JM Die Hurco VMX24 with WinMax V11 controller

### Machine Specifications
- Axes: X=24", Y=20", Z=24" (610×508×610mm)
- Spindle: 10,000 RPM, 15 HP, CT40 taper
- Tool Changer: 24-tool side-mount ATC
- Accuracy: ±0.0001" (0.0025mm)
- Rapids: X/Y=1300 IPM, Z=1000 IPM

### Controller-Specific Features
- G65 conversational macros (unique to Hurco)
- UltiMotion trajectory control (G187 P3)
- DXF import capability
- Work surface definition (G68.2 equivalent)
- Renishaw OMP40 probing

### PRISM AGI Integration
- 8 reasoning modes for intelligent G-code generation
- Physics-aware feed optimization via **Kienzle force model**
- Material-adaptive cutting parameters (ISO P/M/K/N/S/H)
- JM Die tribal knowledge: **20+ embedded tips**
- Learning from production feedback

---

## 2. OkumaB250LatheMasterPostEngine

**File:** `OkumaB250LatheMasterPostEngine.ts` (23,091 bytes)
**Machine:** JM Die Okuma LB250II-M with OSP-P300L controller

### Machine Specifications
- Max Swing: 16.14" (410mm)
- Max Turning Diameter: 13.78" (350mm)
- Spindle: 5000 RPM max, 20 HP, A2-6 nose
- Turret: 12-station BMT65 live tooling
- C-Axis: 0.001° resolution, 360° positioning
- Sub-Spindle: Yes

### Controller-Specific Features
- G96 constant surface speed (CSS)
- G72/G70 canned cycles (roughing/finishing)
- G76 threading cycle (multi-pass)
- G83/G87 drilling cycles
- G112 polar interpolation (C-axis milling)
- M38/M39 spindle sync for sub-spindle

### PRISM AGI Integration
- 8 reasoning modes for intelligent G-code generation
- Physics-aware feed optimization via **Kienzle + Taylor models**
- Material-adaptive cutting parameters
- JM Die tribal knowledge: **25+ embedded tips**
- Learning from production feedback

---

## 3. MitsubishiMV1200RWireEDMMasterPostEngine

**File:** `MitsubishiMV1200RWireEDMMasterPostEngine.ts` (44,591 bytes)
**Machine:** JM Die Mitsubishi MV1200R with M800 (or M700V) controller

### Machine Specifications
- Axes: X=400mm, Y=300mm, Z=220mm
- UV Axes: ±60mm (taper up to ±45°)
- Wire: 0.10–0.30mm brass wire
- Max Workpiece: 610×400×215mm, 400kg
- Auto Wire Threading (AWT)
- Typical Ra: 0.15µm (4 skim passes)

### Controller-Specific Features
- M800 dialect (M20/M21/M78/M58/M80/M82/M84/M90/M91) — default
- M700V dialect (M6/M7/M28/M29) — legacy
- G51/G50 taper mode
- G41/G42 wire offset compensation
- E-pack power conditions (E1–E20)
- Corner control (CC) for sharp angles

### Wire EDM Physics (unique to EDM)
- Electrical discharge energy: E = V × I × t_on × frequency
- Wire tension: 800–1500g (0.25mm wire)
- Flushing pressure: 5–12 bar
- Kerf width ≈ wire diameter + 2×spark gap

### PRISM AGI Integration
- 8 reasoning modes for intelligent program generation
- Physics-aware **energy optimization**
- Material-adaptive power conditions
- JM Die tribal knowledge: **20+ tips from shop floor**
- Learning from production feedback

---

## Physics Engines Integrated into Post Processors

| Engine | Purpose | Used By |
|--------|---------|---------|
| `KienzleForceModelEngine` | Cutting force prediction (Fc = kc1.1 × ap × fz^(1-mc)) | Mill, Lathe |
| `TaylorToolLifeEngine` | Tool wear/life prediction (T = C/Vc^(1/n)) | Mill, Lathe |
| `ChatterStabilityLobeEngine` | Spindle RPM vs depth stability | Mill |
| `BayesianToolLifeEngine` | Probabilistic tool life with confidence | Mill, Lathe |
| `PostProcessorFeedOptimizerEngine` | Feed rate optimization | All 3 |
| `TribalKnowledgeAdvisorEngine` | Shop floor wisdom injection | All 3 |
| `MachineProfileEngine` | Machine limits/capabilities | All 3 |

---

## Testing Infrastructure

### Integration Tests (142 total)
- `MasterPostHurcoV11.integration.test.ts` — 48 tests
- `MasterPostOkumaB250.integration.test.ts` — 50 tests
- `MasterPostMitsubishiMV1200R.integration.test.ts` — 44 tests

### Test Scenarios Covered
1. Basic G-code generation from toolpath
2. Physics integration (Kienzle/Taylor annotations)
3. Tribal knowledge injection as comments
4. Controller dialect correctness
5. Machine envelope safety limits
6. Prove-out mode derating
7. Feed optimization active
8. Cross-controller comparison
9. Setup sheet + G-code download
10. Round-trip validation

### Dispatcher Actions for Testing
```
prism_cam:master_post_hurco_v11
prism_cam:master_post_okuma_b250
prism_cam:master_post_mitsubishi_mv1200r
prism_cam:master_post_by_machine  (auto-routes by model)
```

### API Endpoints
```
POST /ppg/master/hurco-v11
POST /ppg/master/okuma-b250
POST /ppg/master/mitsubishi-mv1200r
POST /ppg/master/auto
```

---

## JM Die Test Programs Available

**Location:** `H:\PRISM\JM DIE\`

| Folder | Content |
|--------|---------|
| `CNC MILL HAAS/` | Haas mill programs (Fontana, SFS Group) |
| `CNC LATHE/` | Lathe programs (SIG Sauer, Optimas, CSM) |
| `HAAS-HURCO/` | Hurco-compatible programs |
| `OKUMA/` | Okuma-specific programs |
| `QUEUE/` | Test queue programs |
| `JM DIE COMPANY/` | Legacy JM Die programs |

**45+ NC files** ready for validation testing.

---

## Gap Analysis: What's NOT Yet Fully Integrated

| Gap | Impact | Status |
|-----|--------|--------|
| CAD model → toolpath extraction | Can't auto-generate from CAD files directly | CAD engines exist but not wired to posts |
| Fusion 360 live bridge | No real-time CAM sync | Bridge exists, needs post integration |
| Production feedback loop | Learning not yet connected | Engines exist, need wiring |
| Full 38-stage PPG pipeline | Stages exist separately | Pipeline orchestrator exists |

---

## How to Test a Baseline Post

```typescript
// Via MCP dispatcher
const result = await prism_cam.master_post_hurco_v11({
  toolpath: [...],  // PostMove[] from CAM
  material: { iso_group: "P", kc1_1: 1800, mc: 0.25, hardness_HB: 200 },
  tool: { diameter_mm: 12, flutes: 4, coating: "TiAlN", stickout_mm: 40 },
  operation: "adaptive",
  aggressiveness: 5,
  prove_out_mode: false
});

// Result includes:
// - gcode: string[] — ready for machine
// - physics_checks: Array<{line, check, passed, value, limit}>
// - tribal_tips_applied: string[]
// - estimated_cycle_min: number
// - warnings: string[]
```

---

## Are We Feeding ALL PRISM Engines Into Posts?

**Current State:** PARTIALLY

### What IS Connected:
- Kienzle force model (canonical constants from `physics/constants.ts`)
- Taylor tool life model
- Chatter stability lobes (ChatterStabilityLobeEngine)
- Bayesian tool life (BayesianToolLifeEngine)
- Feed optimization (PostProcessorFeedOptimizerEngine)
- Tribal knowledge (65+ tips across 3 machines)
- Machine profiles (21 JM Die machines)

### What COULD Be Connected (2,389+ engines available):
- `AdaptivePhysicsBridgeEngine` — dynamic physics selection
- `CrossDisciplinaryDeepLearningEngine` — 15-domain reasoning
- `PRISMCreativeReasoningEngine` — novel optimization paths
- `SFCReasoningEngine` — speed/feed/cut depth reasoning
- `ToolpathOptimizationEngine` — geometry-aware paths
- `ThermalCompensationEngine` — heat-based adjustments
- `VibrationDampingEngine` — chatter mitigation
- `WearPredictionEngine` — proactive tool changes
- `CostEstimationEngine` — cycle time → cost mapping
- `QualityPredictionEngine` — surface finish prediction

### Recommendation:
Wire `MasterPostProcessorUnifiedAGIEngine` (59,521 bytes) as the orchestrator — it already references 40+ physics engines and could serve as the "everything pipe" into each post.
