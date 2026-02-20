# R1-MS2 Registry Dual-Path Investigation
## Date: 2026-02-15 | Session 60

## STATUS AFTER R1-MS1 RESTART

### Materials: RESOLVED
- 3,392 loaded / 3,518 target (96.4%) — gap was server restart, not code bug

### Tools: ALREADY CORRECT
- 1,944 loaded = 1,944 unique on disk (100%)
- CUTTING_TOOLS_INDEX.json + per-category files = same tools, deduped by loader
- Knowledge engine count matches registry count

### Alarms: ALREADY CORRECT
- 10,033 loaded from C:\PRISM\extracted\controllers\alarms\
- Knowledge engine count matches registry count
- Previous "dual-path" concern was wrong — alarms load correctly from alarm files

### Machines: FIX APPLIED — NEEDS RESTART
- 402 loaded, 532 on disk — 130 gap
- Root cause: CORE/PRISM_MACHINE_3D_MODEL_DATABASE_V2.json has 67 machines with id="unknown"
  All 67 collapse into single "unknown" entry
- Plus duplicate Haas machines between ENHANCED (65) and LEVEL5 (65+58)
- FIX: MachineRegistry.ts loadLayer now treats "unknown" as invalid ID,
  falls through to manufacturer+name-based ID generation
- After restart, expect ~470+ machines (402 current + ~67 from 3D model + some dedup)

## SUMMARY
The "dual-path" issue was largely a misdiagnosis. The actual issues were:
1. Materials: Server not restarted after data expansion (FIXED in R1-MS1)
2. Tools: Already at 100% — no issue
3. Alarms: Already at 100% — no issue  
4. Machines: id="unknown" bug causing 67 machines to collapse (FIX APPLIED, needs restart)
