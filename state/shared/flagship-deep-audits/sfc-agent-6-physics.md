# SFC Deep Audit — Agent 6: Physics

Files reviewed:
- H:/PRISM/mcp-server/src/engines/UltimateSpeedFeedEngine.ts
- H:/PRISM/mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts
- H:/PRISM/mcp-server/src/engines/AutoSpeedFeedEngine.ts
- H:/PRISM/mcp-server/src/engines/AutoSpeedFeedCalculatorEngine.ts (peer)
- H:/PRISM/mcp-server/src/physics/constants.ts (canonical)

## Constants Hygiene (canonical imports vs inline)

PARTIAL COMPLIANCE.

- UltimateSpeedFeedEngine: imports CANONICAL_KIENZLE / CANONICAL_TAYLOR / CANONICAL_MATERIAL_DB and overwrites a local MATERIAL_DB at module init (lines 562-579), so inline literals at 391-544 (kc1_1: 1800/2000/2100/2400/2300/1100/1300/700/780/650/350/2800/2800/3200) are runtime-shadowed. Still: dual source-of-truth is a maintenance hazard and the inline values for alloy_steel (2000), aisi_1045 (1900), 17-4PH (2400), duplex (2300), ductile_iron (1300), brass (780), copper (650), plastic (350) are NOT in CANONICAL_KIENZLE and only the ISO-group fallback overrides them.
- SpeedFeedOrchestratorEngine: imports CANONICAL_KIENZLE/TAYLOR (line 31) but the orchestrator's record at lines 452-597 still hardcodes kc1_1=1800/2100/2200/1200/1400/700/750/900/2800/3200 inline. Loop at 618-624 overwrites only when iso_group matches a CANONICAL key — silent drift risk.
- AutoSpeedFeedEngine: HARD VIOLATION at line 809 — `_getKc()` declares `{ P: 1800, M: 2100, K: 1100, N: 700, S: 2800, H: 3200 }` inline. No import from constants.ts. This duplicates ISO 3685 numerically and bypasses the canonical table entirely.
- AutoSpeedFeedCalculatorEngine: HARD VIOLATION at lines 161-167 — `APPROX_KC1_1` mirror table with the same six values, no import.

## Formula Correctness

- Vc <-> RPM: Ultimate L1863 `Vc = pi*Dc*rpm/1000`, L1883 `rpm = 1000*Vc/(pi*Dc)` — correct ISO 3002-1.
  Orchestrator L2349/2715 same identity. CORRECT.
- Feed/tooth: chip-thinning at Ultimate L905-910 implements Kennametal hex = fz*sin(kr)*2*sqrt(ae/Dc - (ae/Dc)^2) for partial radial engagement. CORRECT geometry. L1996 uses `sin(acos(1-2*ae/Dc))` (= chord-based hex), also correct and equivalent.
- MRR (milling): Orchestrator L2483 `MRR = ap*ae*Vf/1000` cm^3/min — CORRECT.
- MRR (turning): no explicit `MRR = vc*f*ap` form found in the three engines — uses milling form generically. MINOR GAP.
- Tool life: CANONICAL_TAYLOR consumed at SpeedFeed L1879/1937/2506/3277. Equation T=(C/Vc)^(1/n) per `taylorLife()` in constants.ts. CORRECT but VB=0.3mm wear criterion never explicitly cited in the engine bodies.
- Surface roughness: Orchestrator L2522 `Ra = fz^2*1000/(32*r_corner)` µm. This is the BRAMMERTZ form (matches `predictedRa()` in constants.ts). The audit prompt asks for `Ra = fz^2/(8*re)` — that is Boothroyd peak-to-valley Rt, not Ra. Engine is correct; prompt formula is Rt. Flag as PROMPT-vs-ENGINE convention difference, NOT a defect.

## Dimensional Consistency

- Vc [m/min], D [mm], n [rev/min] — factor 1000 present, units consistent.
- Pc on AutoSpeed L458: `(kc1_1*ap*ae*fz*z*n)/(60e6*0.85)` — N/mm^2 * mm * mm * mm * rev/min / 60e6 = (N*mm/min)/60e6 = kW after eta=0.85. CORRECT.
- Torque L2499 `(P_kW*30000)/(pi*rpm)` -> N*m. CORRECT.
- Ra L2522 multiplies fz^2[mm^2]/r[mm]*1000 -> µm. CORRECT annotation.
- I_moment L2531 `pi*d^4/64` [mm^4]. CORRECT.

## Source Citations

Canonical constants.ts cites Sandvik 2024, ISO 3685:1993, Taylor 1907, Kienzle 1957, Brammertz, ISO 3002-1. Engines cite Kennametal/Sandvik handbooks for cutting-data tables (L689-723 Ultimate). Albrecht ploughing (L2222 Ultimate) cited inline. ISO 3685 VB criterion is implicit but never named in engine source — should be added.

## Grade: C+ / Score: 72/100

Math is correct; canonical wiring is incomplete. Two engines (AutoSpeedFeed, AutoSpeedFeedCalculator) have hard-coded kc tables that violate the project's HARD BLOCK rule. UltimateSpeedFeed and SpeedFeedOrchestrator launder inline values through a re-sync loop, which works but creates drift surface. Required fixes: (1) delete `_getKc` literals in AutoSpeedFeedEngine L809 and import from CANONICAL_KIENZLE; (2) delete `APPROX_KC1_1` in AutoSpeedFeedCalculatorEngine and import; (3) refactor Ultimate/Orchestrator MATERIAL_DB to be derived (not declared) from canonical; (4) add explicit MRR_turning = vc*f*ap helper; (5) annotate VB=0.3mm in Taylor call sites.
