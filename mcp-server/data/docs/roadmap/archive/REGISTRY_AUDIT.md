# REGISTRY AUDIT — R1-MS0
> Generated: 2026-02-14T22:10:00Z | Session: 60 | Phase: R1-MS0

## Current Registry Counts

| Registry   | Expected | Knowledge Engine | MaterialRegistry | Gap vs Expected | Status |
|------------|----------|------------------|------------------|-----------------|--------|
| Materials  | 3,518    | 521              | 521 (loaded OK)  | 2,997 (85%)     | PARTIAL |
| Machines   | 824      | 402              | 402 (loaded OK)  | 422 (51%)       | PARTIAL |
| Tools      | 1,944    | 0                | 0                | 1,944 (100%)    | MISSING |
| Alarms     | 9,200    | 10,033           | 0 (load path issue) | 9,200+ (TBD) | LOAD BUG |
| Formulas   | 500+     | 500              | N/A              | 0               | OK |

## Key Findings

### F1: Search Wildcard Bug (FIXED)
- `material_search query="*"` returned 0 because `"*"` was treated as literal text
- Fixed in MaterialRegistry, MachineRegistry, ToolRegistry, AlarmRegistry
- `query="*"` now correctly returns all entries
- Build successful, awaiting server restart to take effect

### F2: MaterialRegistry loaded, data verified
- 521 materials loaded from 7 ISO group directories (verified JSON files)
- `material_get identifier="CS-1018-ANNEALED"` returns full 127-parameter record
- All Kienzle, Taylor, Johnson-Cook parameters present and populated
- MASTER_INDEX.json claims 3,518 but only 521 are in verified JSON files
- Gap: The original 3,518 count was from Session 46's enhanced dataset; only 521 passed handbook verification with full 127 params

### F3: MachineRegistry
- Knowledge engine reports 402 machines
- Direct search returns 0 (same wildcard bug — now fixed)
- Expected 824 from MASTER_INDEX, 402 currently available
- Gap: 422 machines need data files created

### F4: ToolRegistry empty
- 0 tools loaded — TOOLS_DB path needs data files
- No tool JSON files exist at the configured path
- This is a data creation gap, not a code bug

### F5: AlarmRegistry load path issue
- Knowledge engine shows 10,033 alarm entries (exceeds 9,200 target!)
- AlarmRegistry loads from `C:\PRISM\extracted\controllers\alarms\` — path may not exist
- Alarm data may be in knowledge engine via different ingestion path
- Need to verify extracted dir has alarm JSON files

### F6: Formulas
- 500 formulas in knowledge engine — meets target
- FormulaRegistry loading TBD verification

## Code Changes Applied This Session

1. `MaterialRegistry.ts` — wildcard fix: `query="*"` skips text filter
2. `MachineRegistry.ts` — same wildcard fix
3. `ToolRegistry.ts` — same wildcard fix  
4. `AlarmRegistry.ts` — same wildcard fix
5. Build completed (dist/index.js updated 2026-02-14)

## Path Forward (R1-MS1+)

### Materials (521/3518 = 14.8%)
- Current 521 are HIGH QUALITY (verified, 127 params, Kienzle+Taylor+JC)
- Target: Recover remaining ~2,997 from pre-verified datasets
- OR: Accept 521 as production-quality subset, document gap for R3 data campaigns

### Machines (402/824 = 48.8%)
- 402 loaded — need to verify data quality per machine
- 422 gap requires data file creation in future sessions

### Tools (0/1944 = 0%)
- Complete data gap — requires dedicated data creation campaign
- Defer to R3 unless critical for R2 safety testing

### Alarms (10,033 in knowledge / 0 in registry)
- Alarm DATA exists (10,033 entries) but in knowledge engine, not AlarmRegistry
- Fix: Either bridge knowledge→registry or fix alarm loader path
- This is the highest-impact R1 fix

## Server Restart Required
All code fixes are built but the MCP server process is running the old build from Feb 10.
A server restart will activate all wildcard fixes and updated P0 code.
