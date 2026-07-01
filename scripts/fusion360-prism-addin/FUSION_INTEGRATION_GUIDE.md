# PRISM × Fusion 360 Integration Guide

## How It Works

```
User selects material in Fusion → PRISM does everything else

┌─────────────────────────────────────────────────────┐
│  FUSION 360                                         │
│  ┌────────────────────────────────────────────┐     │
│  │ PRISM Panel                                │     │
│  │  1. Material: [P20 Steel ▼]                │     │
│  │  2. Machine:  [DMG DMU 50 ▼] (optional)    │     │
│  │  3. [🚀 PRISM Optimize]                    │     │
│  │     ↓                                      │     │
│  │  Auto-filled:                              │     │
│  │  • Tool: OSG AE-VMS Ø10 3FL TiAlN (89/100)│     │
│  │  • S: 4775 RPM  F: 1432 mm/min            │     │
│  │  • DOC: 5mm  WOC: 3mm (chip thinning ×1.3)│     │
│  │  • Strategy: Adaptive Clearing (TGAR)      │     │
│  │  • Post: Siemens 840D sl                   │     │
│  │  ╔══ Physics ══╗                           │     │
│  │  ║ Fc: 450N    ║                           │     │
│  │  ║ P: 2.1kW    ║                           │     │
│  │  ║ δ: 8μm      ║                           │     │
│  │  ║ Cpk: 1.45   ║                           │     │
│  │  ║ Life: 85min  ║                           │     │
│  │  ╚═════════════╝                           │     │
│  │  4. [📋 Generate Program]                  │     │
│  └────────────────────┬───────────────────────┘     │
│                       │ HTTP localhost:18361         │
│                       ▼                             │
│  ┌────────────────────────────────────────────┐     │
│  │ PRISM MCP Server                           │     │
│  │                                            │     │
│  │ Step 1: cam_smart_tool                     │     │
│  │   → Queries 73,827 tools                   │     │
│  │   → 7-factor physics scoring               │     │
│  │   → Returns top 5 with Kienzle validation   │     │
│  │                                            │     │
│  │ Step 2: cam_unified_generate               │     │
│  │   → production_mode: true                   │     │
│  │   → Real polygon offset toolpaths           │     │
│  │   → Variable S/F (chip thinning + corner)   │     │
│  │   → Per-segment physics annotations         │     │
│  │                                            │     │
│  │ Step 3: AutoSpeedFeedEngine (optimize_sf)   │     │
│  │   → Line-by-line Kienzle/Taylor S/F         │     │
│  │   → Chip thinning compensation              │     │
│  │   → Corner deceleration                     │     │
│  │   → Power/torque limiting                   │     │
│  │                                            │     │
│  │ Step 4: PostProcessorPipeline (post_process)│     │
│  │   → 35 stages across 7 phases:             │     │
│  │   P0: Parse + context resolve               │     │
│  │   P1: Kienzle S/F + stability lobes        │     │
│  │       + deflection + coolant + Cpk          │     │
│  │   P2: Per-block engagement + chip thinning  │     │
│  │       + corner/plunge + wear + thermal      │     │
│  │   P3: S-curve velocity + look-ahead         │     │
│  │       + AICC/Cycle832/G187 injection        │     │
│  │   P4: Monte Carlo force CI + Taguchi score  │     │
│  │   P5: 24 safety rules + 296 playbook rules  │     │
│  │       + 3700 tribal tips                    │     │
│  │   P6: Controller dialect (20 controllers)   │     │
│  │       + probe routines + setup sheet         │     │
│  │       + cycle time + verification            │     │
│  │                                            │     │
│  │ → Returns:                                  │     │
│  │   ✓ Optimized G-code (controller-specific)  │     │
│  │   ✓ Setup sheet (tool list, WCS, notes)     │     │
│  │   ✓ Physics report (force/power/deflection) │     │
│  │   ✓ Tribal tips (from 3700+ tips)           │     │
│  │   ✓ Cycle time (P50/P75/P95 Monte Carlo)   │     │
│  │   ✓ Cost estimate (tool+machine+energy)     │     │
│  └────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────┘
```

## For Complete Novices

1. Open your part in Fusion 360
2. Go to Manufacturing workspace
3. Open PRISM panel (right sidebar)
4. Select your material from the dropdown
5. Click "PRISM Optimize"
6. Everything auto-fills — tool, speeds, feeds, strategy
7. Click "Generate Program"
8. Done — G-code, setup sheet, and physics report ready

**You don't need to know:**
- What tool to use (PRISM picks from 73,827 real tools)
- What speed/feed to set (Kienzle/Taylor physics calculates them)
- What strategy to use (34 algorithms, auto-selected per feature)
- What post-processor to use (20 controller dialects, auto-matched)

## For Expert Programmers

Everything PRISM auto-fills is **editable**. Override any parameter:

- Change tool → PRISM recalculates S/F for your choice
- Change speed → PRISM warns if outside physics limits
- Change strategy → PRISM regenerates toolpath
- Change controller → PRISM re-posts for your machine

Expert benefits:
- Per-segment physics (see force/power/deflection at every point)
- Stochastic chatter-safe RPM (Monte Carlo, not guesswork)
- Cost-per-feature breakdown (know exactly where money goes)
- Cross-CAM tribal knowledge (tips from 18 CAM systems)
- Self-learning (gets better with every job you run)

## API Methods (prism_api_client.py)

```python
from prism_api_client import PRISMClient

client = PRISMClient()

# 1. Select best tool from 73K catalog
tool = client.smart_tool_select(
    operation_type="pocket",
    material_iso_group="P",
    feature_diameter_mm=30,
    feature_depth_mm=15,
)

# 2. Generate complete program (auto S/F + post-processing)
result = client.generate_program(
    features=[{
        "type": "pocket_rectangular",
        "operation": "roughing",
        "dimensions": {"length_mm": 80, "width_mm": 50, "depth_mm": 15},
    }],
    material="P20 Mold Steel",
    machine_name="DMG DMU 50",
    post_process=True,    # Run full 35-stage PP pipeline
    optimize_sf=True,     # Line-by-line variable S/F
    production_mode=True, # Real polygon offset toolpaths
)

# 3. Or optimize existing G-code from Fusion
result = client.generate_full_pipeline(
    gcode=open("my_program.nc").read(),
    material="Ti-6Al-4V",
    machine_name="Hermle C42",
    controller="heidenhain",
    aggressiveness=0.7,
)

# 4. Export Fusion-format tool library
lib = client.export_tool_library(
    material_iso_group="P",
    max_tools=50,
)
# Save as .tools file for Fusion import
with open("prism_tools.tools", "w") as f:
    json.dump(lib, f, indent=2)

# 5. DFM check before machining
dfm = client.dfm_check(
    features=[...],
    material_iso_group="S",
)
# Returns: manufacturability score, issues, recommendations
```

## Tool Library Auto-Fill

PRISM exports tool libraries in Fusion 360's native `.tools` format:

- **Geometry**: diameter, shank, flute length, OAL, flutes, corner R, helix angle
- **Shaft**: neck transition segments for 3D visualization
- **Holder**: ER16/20/32/40 auto-selected, body segments for visualization
- **Presets**: 6 material presets per tool (Steel/Stainless/CastIron/Aluminum/Superalloy/Hardened)
- **Physics**: Each preset has Kienzle-backed S/F, DOC, WOC, ramp rates, coolant

When you import the tool library, every field in Fusion's tool editor is filled.

## Machine + Controller Auto-Detection

PRISM matches your machine against 910 profiles (48 manufacturers):
- Spindle curve (base RPM, max RPM, rated power, max torque)
- Axis travel limits
- Rapid rates
- Controller type → auto-selects from 20 post-processor dialects
- Tool changer capacity

Controller-specific G-code features auto-injected:
- Fanuc: G05.1 Q1 (AICC), G05 P10000 (HSC)
- Siemens: CYCLE832 (tolerance), COMPCAD/COMPCURV
- Heidenhain: FUNCTION TCPM, CYCLE 32
- Haas: G187 P1/P2/P3 (smoothing modes)
- Mazak: G05.1, G61.1 (path blend)

## What Makes This Different

No other CAM system does this:
1. **Per-segment physics** — force, power, deflection at every cut
2. **73,827 real tools** — not generic, actual manufacturer tools
3. **3,700+ tribal tips** — wisdom from 18 CAM systems combined
4. **Monte Carlo cycle time** — P50/P75/P95, not single number
5. **Stochastic chatter RPM** — probability-based, not guesswork
6. **Self-learning** — Bayesian calibration improves with every job
7. **35-stage post-processor** — nothing else runs this many physics checks
