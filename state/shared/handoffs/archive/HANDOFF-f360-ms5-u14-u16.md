# HANDOFF — F360-AP-MS5 U14-U16

## Session Summary
Completed U14-U16 of F360-AP-MS5 (Full Machine Coverage).

## Units Completed

### U14: Wire EDM Multi-Cut Pass Strategy
- Added `EDM_MULTI_CUT_TABLE` constant: 4-pass table (rough/trim/trim/skim) with decreasing wire offsets, speeds, tensions, flushing pressures
- Added `edmPassCountForRa()`: maps target Ra to pass count (1-4 passes)
- Modified S7 to use `flatMap` — wire EDM features expand into multi-cut sequences
- Taper cuts get 0.7× speed multiplier (UV axis coordination per Mitsubishi MV2400R spec)
- Added `edm_pass_type` and `edm_pass_index` to PlannedOperation interface
- Re-sequencing after flatMap ensures correct op numbering
- **Tests**: 6 new (Ra 1.6→2 passes, Ra 0.4→4 passes, Ra 3.2→1 pass, decreasing offsets, type fields, taper speed)

### U15: Multi-Setup Program Support
- Added multi-setup detection in S4 after existing sorting blocks
- Milling: features with z-normal < -0.5 → Op2 (setup_index=1), rest → Op1 (setup_index=0)
- Mill-turn: setup_index from channel_id (C1→0, C2→1, Cm→2)
- Lathe/wire EDM: always single setup
- S8 modified to create multiple setups in a loop, routing ops to correct setup
- Added `setup_index` to PlannedOperation, `setup_count` to S4 and S8 data
- **Tests**: 6 new (opposing normals→2 setups, all-top→1, lathe→1, EDM→1, type field, S8 data)

### U16: Post-Processor Machine-Type G-code Headers
- Added `generateMachineHeader()` static method: 7 machine types with correct preamble codes
  - VMC: G17 G21 G40 G49 G80 G90 + G28 Z home
  - HMC: + G28 B0 (B-axis home)
  - 5-axis 3+2: + G43.4 H0 (RTCP enable)
  - 5-axis simultaneous: + G43.5 H0 (TCPC enable)
  - Lathe: G18 G21 G40 G80 G99 + G50 S[clamp]
  - Mill-turn: $1/$2/$3 channel declarations
  - Wire EDM: G92 datum + M50 wire threading
- Added `generateMachineFooter()`: matching postamble (M05/M09/M30/%, RTCP cancel, wire cut)
- S10 now generates header/footer and includes line counts in stage data
- **Tests**: 12 new (all 7 types header, all 7 footer, specific codes per type, S10 integration)

## Physics Review
- **CRITICAL fixed**: EDM Trim2 wire offset 0.04→0.08 mm (within industry standard 0.08-0.12 mm)
- **HIGH fixed**: Taper speed 0.7× documented with Mitsubishi MV2400R UV axis spec reference
- **MEDIUM fixed**: CSS RPM clamp default now derives from MACHINE_DEFAULTS.lathe.max_rpm × 0.9
- **MEDIUM fixed**: edmPassCountForRa boundary semantics documented with manual section reference

## Verified State
- Build: PASS (0 errors in AutoProgramOrchestratorEngine.ts + Fusion360LiveBridgeEngine.ts)
- Tests: 148/148 passing (124→148, +24 new)
- F360-AP-MS5: 16/24 units complete
- Engine: ~2600 LOC
- Physics review: 1 CRITICAL + 1 HIGH + 2 MEDIUM — all fixed

## Resume
Continue F360-AP-MS5 at U17. Run `/autopilot-full /startup continue f360 roadmap`.
