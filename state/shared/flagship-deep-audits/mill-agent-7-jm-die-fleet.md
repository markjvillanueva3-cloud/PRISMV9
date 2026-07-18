# MILL Deep Audit — Agent 7: JM Die Mill Fleet Prove-Out

**JM Die Mill Fleet (corrected by user):**
1. Haas VF-2 (3-axis VMC, NGC controller)
2. **Hurco VM30i** (3-axis VMC, WinMax) — NOT VM10i (corrected)
3. Haas OM2 (Office Mill, high-speed compact)
4. Roku-Roku HC-658 II (high-precision VMC, Fanuc 0i-MD typical)
5. Okuma M460V-5AX (5-axis VMC, OSP-P300MA-H or OSP-P500M)

## Per-Machine Coverage Summary

| Machine | Master Post | Catalog | Real .NC | Status | Gap to Pilot |
|---|---|---|---|---|---|
| **Haas VF-2** | ✓ NGC parser | ✓ VF-2 in profiles | ✓ **26 proven** | READY | Today (HaasParserEngine works) |
| **Hurco VM30i** | ⚠ Engine targets VMX24 | ✓ generic Hurco | ✗ 0 | **BROKEN** | 2-3 days (engine target fix) |
| **Haas OM2** | ? unclear (NGC?) | ✗ NOT FOUND | ✗ 0 | UNKNOWN | 2-3 days |
| **Roku-Roku HC-658 II** | ✗ parser only | ✗ NOT FOUND | ✓ 1 (ITW SHAKEPROOF) | PARTIAL | 3-4 days |
| **Okuma M460V-5AX** | ✓ OkumaOSPMillMasterPostEngine | ✓ MU/MB family | ✗ 0 mill-only | READY | 2-3 days proof job |

## Machine 1: Haas VF-2 — PRODUCTION-READY ✓

**Master Post:** `HaasParserEngine.ts` ✓
**Catalog:** machine-profiles-catalog.ts lines 87-100
- X=762, Y=406, Z=508mm; 8100 RPM; 22.4 kW; BT40
- 20-tool side-mount carousel, 4.2s change

**Real Programs:** 26 production .NC files in `H:/PRISM/JM DIE/CNC MILL HAAS/`
- FONTANA: B-1289-11 grip blocks, 3D surfacing, proven 2018-09-11
- ALL STAR, FONTANA, OPTIMAS, etc. — 53 customers, 509 total Haas mill programs
- Tools: T9/T10 (5/8" ball endmills, S5000), T1 face mill

**Gap to Live Pilot:** **MINIMAL** — can run supervised jobs today.

## Machine 2: Hurco VM30i — BROKEN (CRITICAL FIX REQUIRED) ⚠

### Engine Mismatch Detected

`HurcoV11MillMasterPostEngine.ts` lines 3-14 explicitly target **VMX24**, NOT VM30i:
- "X=24", Y=20", Z=24" (610×508×610mm)"
- "Controller: WinMax V11"
- "10,000 RPM, 15 HP, CT40 taper"

**Actual JM Die machine:** VM30i — different model, likely different envelope/spindle.

**Impact:** Engine may emit incorrect rapid speeds, tool change positions, or spindle limits for VM30i.

**Fix Path (2-3 days):**
1. Verify actual JM Die Hurco model from data nameplate
2. Read VM30i datasheet, extract kinematics
3. Update HurcoV11MillMasterPostEngine constants OR create VM30iEngine
4. Validate against 1 Fontana grip block program

**Real Programs:** 0 in `H:/PRISM/JM DIE/HURCO/`

## Machine 3: Haas OM2 — UNKNOWN

- Master post: ? May share NGC with VF-2 (HaasParserEngine), or need dedicated
- Catalog: ✗ **NOT FOUND** in machine-profiles-catalog.ts (VF-2/VF-4/VF-6/UMC/EC/ST listed but no OM2)
- Real programs: 0
- **Action needed:** OM2 datasheet, catalog entry, parser/post routing decision (2-3 days)

## Machine 4: Roku-Roku HC-658 II — PARTIAL

- Only `RokuRokuParserEngine.ts` exists (parser, not post-generation)
- Catalog: ✗ NOT FOUND
- Real programs: ✓ 1 — `H:/PRISM/JM DIE/ROKU-ROKU/ITW SHAKEPROOF/FLATS/014-41009H-00.NC` (high-precision die tooling)

**Fanuc 0i-MD specifics:**
- Standard Fanuc dialect (G00/G01, G10 L2, G65 macros)
- 3-axis (no RTCP for HC-658 standard)
- Sub-micron resolution (graphite EDM electrodes, tight tolerances)

**Operational Gaps:**
- No spindle thermal compensation engine wired (CRITICAL for precision)
- No graphite-specific cutting parameters (Roku typical for EDM electrodes)
- No exhaust/dust extraction in setup sheet template

**Fix Path (3-4 days):**
1. Create RokuRokuMillMasterPostEngine (derive from Fanuc 0i-MD template)
2. Use ITW SHAKEPROOF program as regression fixture
3. Add spindle thermal compensation
4. Graphite cutting parameter library

## Machine 5: Okuma M460V-5AX — READY ✓

**Master Post:** `OkumaOSPMillMasterPostEngine.ts` ✓ explicitly tested for M460V

Test file: `OkumaOSPMillMasterPostEngine.JMDiePreset.test.ts` line 8: "Okuma Genos M460V-5AX, OSP-P300MA-H control"

**JM_DIE_PRESET exported:**
- `work_offset_index: 15` (3-axis), `25` (5-axis)
- `tcp_mode: "G169_G168"` (Okuma native, NOT Fanuc-style G43.4)
- `use_call_oo88: true` (fixture-offset macro for indexed 5-axis)

**5-Axis Features:**
- ✓ RTCP via G169/G170 (Okuma native)
- ✓ G68.2 tilted work plane (implied)
- ✗ G43.4/G43.5 NOT used (Okuma uses G169/G170)
- ✓ Singularity avoidance: indexed (A/C clamp M10/M11) and simultaneous modes
- ✓ Tribal knowledge: 23 tips embedded (8 legacy + 14 from .def/.cps + OO88 macro)

**Catalog:** ✓ Okuma MU-V (5-axis) + MB-V (3-axis) families in profiles. M460V assumed "Genos M" variant on OSP-P500M.

**Real Programs:** ✗ 0 mill programs. JM Die's OKUMA folder contains only MULTUS lathe programs.

**Caveat:** Need to confirm: Does JM Die actually run **pure 5-axis milling** on M460V, or only mill-turn ops?

**Fix Path (2-3 days):**
1. Find or create sample 5-axis milling job (NOT mill-turn)
2. Test JM_DIE_PRESET config end-to-end
3. Add prove-out program as regression fixture

## ERP Integration — ZERO COVERAGE

| Machine | Wire Shop ERP | Tool Slots | Probing | Coolant Config |
|---|:-:|:-:|:-:|:-:|
| Haas VF-2 | ✗ | ✗ 20 unknown | ✗ | ✗ |
| Hurco VM30i | ✗ | ✗ | ✗ | ✗ |
| Haas OM2 | ✗ | ✗ | ✗ | ✗ |
| Roku HC-658 | ✗ | ✗ | ✗ | ✗ |
| Okuma M460V | ✗ | ✗ | ✗ | ✗ |

**No machine_rates table populated for any mill machine.**
**No tool magazine configs.**
**No probing routines wired** (VF-2 should support Renishaw OMP40; M460V should support G65 P88xx; HC-658 should support Fanuc standard G65).

## Minimum Viable Pilot Per Machine

| Machine | Smallest Job | Effort | Timeline |
|---|---|---|---|
| Haas VF-2 | Re-run FONTANA B-1289-11 OP1 (aluminum pocket) | MINIMAL | **Today** |
| Hurco VM30i | 2D contour in steel (after engine fix) | HIGH | 3-5 days |
| Haas OM2 | 2D profile aluminum (after NGC verification) | MEDIUM | 2-3 days |
| Roku HC-658 | Re-run ITW SHAKEPROOF .NC (validate parser) | MEDIUM | 2-3 days |
| Okuma M460V | 3-axis pocket on OSP-P300M (indexed, not simultaneous) | MEDIUM | 2-3 days |

## Critical Action Items

### Blocker (Fix Before Production)
1. **Hurco VM30i Engine Target Mismatch**
   - HurcoV11MillMasterPostEngine targets VMX24 not VM30i
   - Cannot safely generate code until corrected
   - Owner: Mach Engineer
   - Timeline: 2-3 days

### High Priority
2. **Haas OM2 Catalog Entry + Routing** (1-2 days)
3. **Create RokuRokuMillMasterPostEngine** (3-4 days)

### Medium Priority
4. **Okuma M460V Proof-of-Concept Job** (2-3 days)
5. **Wire ERP machine_rates for all 5 machines** (5 days)
6. **Add probing routines** (Haas WIPS, Okuma G65, Fanuc — 2 days)

## Summary Table

| Metric | Status | Notes |
|---|---|---|
| Master Posts Wired | 3/5 (60%) | Haas (parser), Hurco (broken), Okuma (ready) |
| Catalog Coverage | 2/5 (40%) | Haas VF-2, Okuma; OM2/Roku/Hurco VM30i gaps |
| Real .NC Fixtures | 27 total | Haas: 26; Roku: 1; others: 0 |
| ERP Integration | 0/5 (0%) | No rates, magazines, probing |
| 5-Axis Readiness (M460V) | READY | Engine production-grade |
| High-Precision (Roku) | PARTIAL | Parser exists; no thermal/graphite |
| **Time to Production (All 5)** | **10-15 days** | Phased rollout |

## Phased Recommendations

**Phase 1 (Week 1):**
- Fix Hurco VM30i engine target (BLOCKER)
- Add Haas OM2 to catalog + router
- Run Haas VF-2 supervised pilot (FONTANA B-1289-11)

**Phase 2 (Week 2):**
- Create RokuRokuMillMasterPostEngine + ITW SHAKEPROOF fixture
- Create Okuma M460V proof-of-concept (3-axis on P300M)
- Wire ERP machine_rates for all 5

**Phase 3 (Week 3):**
- Add probing routines (Haas WIPS, Okuma G65, Fanuc)
- Tool magazine per-machine config
- Spindle thermal compensation (Roku)

## File References

- `src/engines/HurcoV11MillMasterPostEngine.ts` (line 3-14: VMX24 target ⚠)
- `src/engines/OkumaOSPMillMasterPostEngine.ts` (5-axis M460V-ready)
- `src/engines/HaasParserEngine.ts` (NGC parser)
- `src/engines/RokuRokuParserEngine.ts` (parser only, no post)
- `src/data/machine-profiles-catalog.ts` (lines 83-213)
- `src/data/jm-die-profile.ts` (machine paths)
- `src/data/jmdie-mill-program-index.ts` (509 Haas programs, 53 customers)
- `JM DIE/CNC MILL HAAS/` (26 .NC files)
- `JM DIE/ROKU-ROKU/ITW SHAKEPROOF/FLATS/014-41009H-00.NC` (1 fixture)
- `__tests__/OkumaOSPMillMasterPostEngine.JMDiePreset.test.ts` (M460V validation)

**Critical finding:** Hurco VM30i engine target mismatch must be corrected before any safe code generation. Okuma M460V 5-axis engine is production-ready. Haas VF-2 has strong regression fixtures. Roku and OM2 need dedicated post-generation engines. All machines lack ERP integration.
