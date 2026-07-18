---
type: "chat-session"
source: "claude-code-cli"
session_id: "8662b848-9487-4a3c-8be1-fe8358a6db18"
title: "PRISM closed-loop lathe print->program accuracy run (slot:whiskey, JM Die corpus"
date: "2026-06-04"
first_ts: "2026-06-04T04:00:03.029Z"
last_ts: "2026-06-04T04:04:22.451Z"
cwd: "H:\\prism"
messages: 23
user_msgs: 9
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/8662b848-9487-4a3c-8be1-fe8358a6db18/subagents/workflows/wf_e9d33dd3-726/agent-ace79b206cd9efc15.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# PRISM closed-loop lathe print->program accuracy run (slot:whiskey, JM Die corpus

> **claude-code-cli** | 2026-06-04 | 23 msgs (9 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/8662b848-9487-4a3c-8be1-fe8358a6db18/subagents/workflows/wf_e9d33dd3-726/agent-ace79b206cd9efc15.jsonl`

## Transcript

### User | 2026-06-04T04:00:03.029Z


PRISM closed-loop lathe print->program accuracy run (slot:whiskey, JM Die corpus, 100% Okuma OSP).
MEASURED RESULTS (live turningPrintToProgramEngine over a 10-material x 6-archetype grid = 60 programs, 0 errors):
- Feed (IPR) envelope agreement vs empirical JM band: 96.3% (183/190 ops) — strong.
- SFM envelope agreement vs empirical JM per-op band: 67% (134/200 ops) — the divergence under investigation.
- Safety: G50 cap 100%, M30 100%, canned cycles 100%, CSS 100% (legacy corpus: 44% / 7.5% / 32%).
- PRISM generated SFM p50 (rough+finish) = 524.9 SFM (~160 m/min).
EMPIRICAL REFERENCE BANDS (mined from 16,558 real JM .MIN programs by scripts/lathe-jmdie-param-accuracy-harness.mjs):
- rough op SFM band: p05=31.8, p50=250, p95=600  (n=1981)
- finish op SFM band: p05=11.78, p50=150, p95=550 (n=7832)
- ARTIFACT-FREE programmed G96-CSS literals: p05=100, p50=200, p95=550 (n=1415)
- G96(CSS) programs=759, G97(constant-RPM) programs=775.
KNOWN CONCERN: the per-op SFM band's implied-SFM for G97 programs is computed SFM = pi*D_inch*RPM/12 using the X-diameter at cut. JM runs mostly small fastener parts (sub-1-inch). A p05 of 12-32 SFM is non-physical (you cannot turn steel that slow) => the band's low tail/p50 is likely contaminated by small-diameter weighting, NOT real surface speed.
FILES (read only what your lens needs; do NOT load the 548MB system graph):
- PRISM lathe generator: H:/prism/mcp-server/src/engines/TurningPrintToProgramEngine.ts (speed/feed selection ~ search 'cutting_speed_m_min', 'cutting_speed', 'Vc', speed tables)
- canonical constants: H:/prism/mcp-server/src/physics/constants.ts
- Rung-A empirical harness: H:/prism/scripts/lathe-jmdie-param-accuracy-harness.mjs
- Rung-B roundtrip harness: H:/prism/mcp-server/scripts/lathe-roundtrip-accuracy-harness.ts (+ test src/__tests__/LatheRoundtripAccuracyHarness.test.ts)
- dashboards: H:/prism/state/shared/dashboards/lathe-roundtrip-accuracy.json and lathe-jmdie-param-accuracy.json


LENS A — PHYSICS VALIDITY.
... [+834 chars truncated]

### Assistant | 2026-06-04T04:00:13.854Z

I'll execute Lens A — Physics Validity. Let me read the engine's speed selection logic and constants.

### Assistant | 2026-06-04T04:00:15.742Z

[tool_use: Grep]

### Assistant | 2026-06-04T04:00:16.382Z

[tool_use: Bash]

### User | 2026-06-04T04:00:25.216Z

[tool_result] 1822 H:/prism/mcp-server/src/engines/TurningPrintToProgramEngine.ts

### User | 2026-06-04T04:00:26.391Z

[tool_result] 10: *   - Taylor (1907): T = (C/Vc)^(1/n)
12: *   - Power: P = Fc × Vc / (60000)  [kW]
13: *   - MRR: ap × f × Vc × 1000 / π  [mm³/min, approximate]
160:  insert_type: "CNMG" | "DNMG" | "WNMG" | "VNMG" | "TNMG" | "CCMT" | "DCMT" | "VCMT" | "TCMT"
174:  cutting_speed_m_min: number;
284:function taylorLifeTurning(C: number, n: number, Vc: number): number {
285:  if (Vc <= 0) return Infinity;
286:  r
... [+2625 chars truncated]

### Assistant | 2026-06-04T04:00:28.844Z

The key is the `speeds` object on line 655-665. Let me find where `speeds.rough` and `speeds.finish` are populated — that's the material-differentiation question.

### Assistant | 2026-06-04T04:00:30.767Z

[tool_use: Grep]

### User | 2026-06-04T04:00:39.879Z

[tool_result] 11: *   - Surface finish: Ra = f² / (32 × r_nose)
270:const TURNING_SPEEDS = CANONICAL_TURNING_SPEEDS as Record<string, { rough: number; finish: number }>;
271:const TURNING_FEEDS = CANONICAL_TURNING_FEEDS as Record<string, { rough: number; finish: number }>;
477:      drill_center: 3, drill_through: 3, drill_blind: 3,
646:    const speeds = TURNING_SPEEDS[iso] || TURNING_SPEEDS.P;
657:      Vc = 
... [+269 chars truncated]

### Assistant | 2026-06-04T04:00:43.918Z

Speeds come from `CANONICAL_TURNING_SPEEDS`, keyed by `iso` (ISO group), with a fallback to `.P`. Critical detail on line 646: `TURNING_SPEEDS[iso]` — keyed by ISO group ONLY, not by specific material/hardness. Let me read the canonical table and how `iso` is resolved.

### Assistant | 2026-06-04T04:00:45.258Z

[tool_use: Grep]

### Assistant | 2026-06-04T04:00:46.908Z

[tool_use: Grep]

### User | 2026-06-04T04:00:54.764Z

[tool_result] 101- * Raw material records — the hand-maintained source values. The exported
102- * CANONICAL_MATERIAL_DB is built from this by buildMaterialPhysics() once the
103: * per-ISO physics tables (CANONICAL_TURNING_SPEEDS etc.) are in scope; that
104- * enrichment fills the MaterialPhysics cutting-physics fields (kc1_1, mc,
105- * vc_base_*, machinability_factor, E_GPa, sigma_y_MPa, hardness_HB ...) so
... [+1481 chars truncated]

### User | 2026-06-04T04:00:56.237Z

[tool_result] 74:function mapToCoolantMaterial(iso: string): string {
79:  return m[iso] || "carbon_steel";
612:    const iso = mat.iso_group || "P";
621:        m.iso_group === iso && (
633:      resolveMaterial({ material_name: mat.material_name, iso_group: iso as ISOGroup })
642:      : getKienzleByISO(iso);
645:      : getTaylor(iso);
646:    const speeds = TURNING_SPEEDS[iso] || TURNING_SPEEDS.P;
647:    c
... [+253 chars truncated]

### Assistant | 2026-06-04T04:00:59.443Z

Now I have the core. Let me read the full canonical speeds table and the line 612 resolution to confirm it's ISO-group-only, plus check whether there's any per-material/hardness override path between line 612-655.

### Assistant | 2026-06-04T04:01:00.215Z

[tool_use: Read]

### Assistant | 2026-06-04T04:01:01.252Z

[tool_use: Read]

### User | 2026-06-04T04:03:42.871Z

[tool_result] 605	    opType: TurningOpType,
606	    feat: TurningFeature,
607	    mat: TurningMaterial,
608	    tool: TurningInsert,
609	    maxRPM: number,
610	    target: string,
611	  ): { params: TurningCuttingParams; physics: TurningOperationPhysics } {
612	    const iso = mat.iso_group || "P";
613	
614	    // U-ARCH3: Material-specific physics from CANONICAL_MATERIAL_DB (13 materials, sync)
615	    // + 
... [+3009 chars truncated]

### User | 2026-06-04T04:03:42.877Z

[tool_result] 881	} as const;
882	
883	export const CANONICAL_TURNING_SPEEDS: Record<ISOGroup, { rough: number; finish: number }> = {
884	  P: { rough: 220, finish: 320 },
885	  M: { rough: 150, finish: 220 },
886	  K: { rough: 180, finish: 280 },
887	  N: { rough: 400, finish: 600 },
888	  S: { rough: 35,  finish: 70  },
889	  H: { rough: 80,  finish: 130 },
890	};
891	
892	export const CANONICAL_TURNING_FEEDS
... [+57 chars truncated]

### Assistant | 2026-06-04T04:03:47.417Z

I now have everything I need. Let me confirm the per-material override does NOT touch speeds (only Kienzle/Taylor), by checking the CANONICAL_MATERIAL_DB structure and whether `canonicalMat` carries any vc field that feeds `speeds`.

### Assistant | 2026-06-04T04:03:48.881Z

[tool_use: Grep]

### User | 2026-06-04T04:03:54.345Z

[tool_result] 174:  cutting_speed_m_min: number;
732:        cutting_speed_m_min: Math.round(actualVc),
838:        lines.push(`${ln()} G96 S${op.cutting_params.cutting_speed_m_min} M03 (CSS ${op.cutting_params.cutting_speed_m_min} m/min)`);
1090:          lines.push(`${ln()} G96 S${op.cutting_params.cutting_speed_m_min} (Return to CSS)`);
1107:          lines.push(`${ln()} G96 S${op.cutting_params.cutting_spee
... [+186 chars truncated]

### Assistant | 2026-06-04T04:04:22.451Z

Confirmed. The engine's `Vc` is sourced ONLY from `TURNING_SPEEDS[iso]` (line 646) — the per-material `canonicalMat`/`rm` resolution (lines 618-645) only overrides Kienzle (`kz`) and Taylor (`tay`), NOT the speed. The `machinability_factor` / `vc_base_*` fields in CANONICAL_MATERIAL_DB are never read in the speed-selection path. So the speed bins to 6 ISO-group values, full stop.

Here is my Lens A finding.

---

LENS A — PHYSICS VALIDITY: VERDICT = **TOO-FLAT (insufficient material spread) — and structurally so, by one ISO bin per family.**

**1. How Vc is selected (engine code).**
`TurningPrintToProgramEngine.ts` line 646: `const speeds = TURNING_SPEEDS[iso] || TURNING_SPEEDS.P;` — speed is keyed ONLY by `iso = mat.iso_group || "P"` (line 612). Per-op Vc is then a fixed multiple of two numbers (lines 655-666):
- rough = `speeds.rough`; finish = `speeds.finish`; drill = `rough×0.6`; thread = `rough×0.5`; groove/part-off = `rough×0.7`; then target trim ×1.15/0.80/1.05.

Critically: the per-material resolution above (lines 618-645, `canonicalMat`/`_resolvedMaterial`) feeds ONLY Kienzle (`kz`) and Taylor (`tay`). It does **not** touch `speeds`. The `machinability_factor` and `vc_base_*` fields that exist in `CANONICAL_MATERIAL_DB` are never read in the speed path. So every P-steel — 12L14, 1018, 4140-annealed, 4140-HT-30HRC — gets the *identical* Vc. There is zero intra-group differentiation by material, hardness, or machinability.

The canonical table (`constants.ts` lines 883-890, carbide, m/min → SFM ×3.28):
| ISO | rough m/min (SFM) | finish m/min (SFM) |
|----|----|----|
| P | 220 (722) | 320 (1050) |
| M | 150 (492) | 220 (722) |
| K | 180 (590) | 280 (919) |
| N | 400 (1312) | 600 (1969) |
| S | 35 (115) | 70 (230) |
| H | 80 (262) | 130 (427) |

**2. Is 524.9 SFM defensible, and what SHOULD each material be (carbide, m/min → SFM):**
- 12L14 free-machining steel (P): real 180-300 m/min ≈ **590-985 SFM** (free-machining runs HOT; ~250 m/min / 820 SFM typical). P
... [+2109 chars truncated]
