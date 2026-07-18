---
name: cam-generate
description: Generate complete CNC program from natural language description
user_invocable: true
---

# CAM Generate — Feature-to-G-Code in One Command

Generate a complete, verified CNC program from a natural language description of your part features.

## Usage
```
/cam-generate pocket 80x50mm, 15mm deep, P20 steel, DMG DMU 50
/cam-generate drill 10mm hole, 30mm deep, 304 stainless, Haas VF-2
/cam-generate turn OD 50mm, 80mm long, Ti-6Al-4V, Mazak QT-250
/cam-generate grind surface, 0.3mm stock, Ra 0.4, hardened H13
```

## What It Does

Chains the full PRISM CAM kernel pipeline:
1. **SmartToolSelector** — picks optimal tool from 46,590-tool catalog with physics scoring
2. **AdaptiveToolpathRouter** — routes to best algorithm from 34 available (TGAR, HRAF, CFSF, etc.)
3. **IntelligentSequencing** — 33-rule production ordering (datum first, tool grouping, thermal gaps)
4. **ProductionToolpath** — real polygon offsets with chip thinning, corner arcs, variable feed
5. **IntegratedVerification** — collision + physics + safety + Cpk check
6. **ProductionPackage** — G-code + setup sheet + tool list + physics report + tribal tips

## Output

- Complete G-code program (controller-specific: Fanuc/Haas/Siemens/Heidenhain/Mazak/Okuma)
- Setup sheet with tool list, WCS, fixture notes
- Physics report (Kienzle force, deflection, thermal, Cpk per operation)
- Tribal knowledge tips from 3,700+ tips across 18 CAM systems
- Monte Carlo cycle time (P50/P75/P95)
- Cost estimate (tool + machine + energy per part)

## Supported Processes

- **Milling**: pocket, contour, face, adaptive, HSM, flowline, geodesic, scallop, swarf, thread
- **Turning**: OD/ID roughing, finishing, threading, grooving, parting, facing, CSS
- **Mill-Turn**: live tool C/Y-axis, sub-spindle, multi-channel, Swiss bar management
- **Wire EDM**: 2-axis profile, taper, skim cuts
- **Sinker EDM**: electrode design, burn parameters
- **Grinding**: surface, cylindrical, centerless, creep feed
- **Laser**: CO2/fiber cutting, marking
- **Waterjet**: abrasive cutting, taper compensation
- **5-Axis**: 3→5 conversion, lead/lean, RTCP, singularity avoidance

## Dispatcher Actions

| Action | Engine | Description |
|--------|--------|-------------|
| `cam_unified_generate` | UnifiedCAMPipelineEngine | Simple parts (1-5 features) |
| `cam_complex_generate` | ScalableCAMOrchestratorEngine | Complex parts (200+ features) |
| `cam_production_toolpath` | ProductionToolpathEngine | Production-grade pocket toolpath |
| `cam_multi_process` | MultiProcessCAMBridgeEngine | Turning + EDM + grinding + laser + waterjet |
| `cam_mill_turn` | MillTurnCAMEngine | Mill-turn / Swiss programming |
| `cam_5axis_convert` | FiveAxisCAMIntegrationEngine | 3→5 axis conversion |
| `cam_advanced_strategy` | AdvancedMillingStrategiesEngine | Flowline/geodesic/scallop/swarf/thread |
| `cam_smart_tool` | SmartToolSelectorEngine | Physics-scored tool selection |
| `cam_verify` | IntegratedVerificationEngine | Collision + physics + safety |
| `cam_chatter_rpm` | ProductionToolpathEngine | Monte Carlo chatter-safe RPM |
| `cam_cost_feature` | ProductionToolpathEngine | Cost-per-feature breakdown |
| `cam_intelligent_sequence` | IntelligentSequencingEngine | 33-rule production ordering |
| `cam_list_actions` | CAMKernelDispatcherBridge | List all available actions |

## Novel Differentiators (no commercial CAM has these)

- Per-segment physics annotations (force, power, deflection, temperature)
- AI tool selection from 46,590 real manufacturer tools
- Cross-CAM tribal intelligence (3,700+ tips from 18 systems)
- Stochastic chatter-safe RPM (Monte Carlo + Altintas model)
- Cost-per-feature breakdown (tool + machine + energy)
- Self-learning Bayesian calibration from production data
