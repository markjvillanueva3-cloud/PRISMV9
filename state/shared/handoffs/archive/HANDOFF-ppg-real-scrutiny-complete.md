# PPG-REAL-MS0 — 20-Agent Scrutiny Complete

## Generated: 2026-04-06
## Status: Scrutiny complete, v2 rewrite needed

## RESUME
Rewrite PPG-REAL-MS0.json incorporating all 20 agent findings. The scorecard averaged 53/100 — below the 70 threshold. Read this handoff + the milestone at data/milestones/PPG-REAL-MS0.json, then apply ALL fixes listed below.

## 20-AGENT SCORECARD (avg 53/100)

| # | Dimension | Score | Critical Finding |
|---|-----------|-------|-----------------|
| 1 | Protocol Structure | 72 | 33/36 units missing abort criteria, no compaction points |
| 2 | Unit Naming | 92 | Minor S7/S9 ordering concern |
| 3 | Physics Rigor | 38 | Chatter SLD, thermal-wear, Taylor unwired; embedded lookup table |
| 4 | Exit Gate Rigor | 62 | No vitest commands, Fusion 360 makes 8 units untestable |
| 5 | Forge-Triple | 42 | Zero cascade metadata, actions not wired |
| 6 | Dependency Graph | 56 | 8 hidden deps, zero machine-readable |
| 7 | MCP Utilization | 42 | 4 units rebuild existing engines, 40+ actions unused |
| 8 | Cross-Roadmap | 62 | PPG-VAR superseded not declared |
| 9 | Controller Dialect | 88 | Brother thin, Doosan Puma lathe missing |
| 10 | Safety-Critical | 56 | No collision detection, no tool change validation |
| 11 | Test Coverage | — | Agent incomplete |
| 12 | Fusion 360 CPS API | 32 | getGlobalParameter CANNOT read add-in attributes |
| 13 | Product Completeness | 60 | No bug reporting, no versioning |
| 14 | Scope Estimation | 38 | 36 units needs 52; S3/S4/S6 must split |
| 15 | Codebase Gap Analysis | HIGH | PostValidationHardeningEngine already does machine limits |
| 16 | Rollback Procedures | 38 | Zero rollback procedures defined |
| 17 | Feature Cascade | 42 | Zero AVAILABLE_TO declarations |
| 18 | Customer Journey | 72 | Journey B missing API route + material input |
| 19 | Machinist Trust | 62 | No override mechanism, prove-out underspecified |
| 20 | Performance | 26 | Pipeline O(blocks*stages) unaddressed |

## CRITICAL ARCHITECTURE CHANGE: Fusion 360 CPS API

The #1 finding: `getGlobalParameter('prism:rpm_T1')` does NOT read custom add-in attributes.
The CPS runtime only reads CAM kernel globals, not design attributes.

CORRECT approach: Add-in modifies operation S/F directly via `adsk.cam` API before posting.
The post reads normal `spindleSpeed` and feed values. No custom property bridge needed.

This invalidates: S1 U-PPR01 (property replacement), S1 U-PPR03 (property bridge spec),
S3 U-PPR07/09 (property reading in Master Post), S6 U-PPR16-18 (property writer).

## FIXES REQUIRED FOR V2

### 1. Architecture (Fusion 360 API — score 32)
- Replace property bridge with direct CAM API S/F modification
- Add-in calls PRISM server, gets physics S/F, writes to operation params via adsk.cam
- Post reads normal spindleSpeed/feed — no custom bridge needed
- For extra data (force, confidence, tool life): use operation comments or temp file sidecar

### 2. Physics Wiring (score 38)
- Add units to wire ChatterStabilityLobeEngine to RPM output
- Add units to wire ThermalWearCouplingEngine to tool life derating
- Add Taylor tool life display in G-code comments
- Remove "embedded lookup table from Kienzle" in U-PPR09 — use server-computed values only
- Define Monte Carlo confidence semantics
- Specify power formula: P_kW = Fc_N * Vc_m_min / 60000

### 3. Safety (score 56)
- Add collision detection basics (rapid at cutting depth, missing Z retract before tool change)
- Add tool change sequence validation (every T use has preceding M06)
- Make travel limit validation WCS-aware (account for G54-G59 offsets)
- Move NaN guards into S2 (not deferred to S11)
- Prove-out default: 50% feed, 80% speed, ON by default

### 4. Scope (score 38)
- Split S3 into S3a (core + top 3 controllers) + S3b (remaining 7 + physics)
- Split S4 into S4a (Fanuc-compat cycles) + S4b (divergent + probing + 5-axis)
- Split S6 into S6a (bridge modules) + S6b (validation)
- Add physics wiring session (S6c or similar)
- Total: 36 units → ~52 units, 12 sessions → ~16 sessions

### 5. Existing Engine Reuse (codebase gap analysis)
- U-PPR04: Use PostValidationHardeningEngine (already does machine limits), don't rebuild
- U-PPR07: Use MasterPostProcessorEngine (already exists), don't rebuild
- U-PPR28: Use CrossCAMPostEngine (1,380 lines), don't rebuild
- U-PPR29: Use ProgramCompareEngine (already has diffGCode + comparePhysics)

### 6. Protocol Compliance (score 72)
- Add abort_criteria to all 33 units in S2-S12
- Add compact_after: true to every session
- Add four_loop: true to every unit
- Add depends_on per session
- Mark S8 || S9 as parallel

### 7. Cross-Roadmap (score 62)
- dependencies: ["PPG-VAR-MS0", "PP-MOAT-MS2", "PP-MOAT-MS4"]
- supersedes: ["PPG-VAR-MS0"]
- Preserve PP-MOAT-MS4 features in S12 UI polish

### 8. Machinist Trust (score 62)
- Add per-tool S/F override mechanism
- Display SFM/IPT/chip load alongside S/F values
- Specify prove-out defaults (50% feed, 80% speed)
- Add "match my current post" baseline mode
- Enrich program header (part number, material, tool list, setup notes)

### 9. Performance (score 26)
- Add performance session: pipeline stage fusion, large program benchmarks
- Worker thread pool for concurrent pipeline execution
- Result caching for tool+material+machine tuples
- Web UI virtualization for 900+ entry lists

### 10. Exit Gates (score 62)
- Every exit gate must end with an executable `npx vitest run` command
- Add negative test cases (bad input MUST fail)
- Replace subjective gates ("reviewed", "complete") with measurable criteria

## EXISTING WORK THIS SESSION (preserve)
- Fixed Hurco PRISM post feed rates (v8.9.154)
- Extracted 2,883 programs from Box to H drive (2,734 Okuma, 138 Haas, 11 Hurco)
- Copied 471 CPS posts + 14 PRISM-enhanced posts to H drive
- Built ppg-asset-catalog.json (471 posts + 2,784 programs indexed)
- Added /api/ppg/programs/* routes (catalog, list, load, stats)
- Added program browser to PPG web UI
- Fixed Node 24 createRequire build bug (postbuild script)
- Added /api/health and /api/ppg/ route aliases for PRISM.cps
- 6 real-program integration tests pass
- 72/72 PPG tests pass total
