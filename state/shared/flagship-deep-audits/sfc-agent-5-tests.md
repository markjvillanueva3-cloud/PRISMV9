# SFC Deep Audit — Agent 5: Tests

## Coverage (test files, it() count, LOC)
**Files:** 12 SFC-related test files  
**Primary test suites:** 3 (UltimateSpeedFeedEngine, AutoSpeedFeedCalculatorEngine, LatheSpeedFeedCalculatorFacadeEngine)  
**Total it() blocks:** 123 test cases  
**Total LOC:** 1,287 lines (core 3 files)  

- UltimateSpeedFeedEngine.test.ts: 52 tests, 744 LOC
- AutoSpeedFeedCalculatorEngine.test.ts: 35 tests, 346 LOC  
- LatheSpeedFeedCalculatorFacadeEngine.test.ts: 36 tests, 426 LOC

**Assessment:** Good breadth; coverage exceeds minimum 10 tests/engine. Test organization well-structured with nested describe blocks.

## Materials/Tools/Machines exercised
**ISO Groups tested:** P (steel, 4140, AISI), M (stainless 304, 17-4PH), N (aluminum 6061), S (Ti-6Al-4V), some K/H inferred via material resolution  
**Tool materials:** Carbide confirmed (3 explicit refs); HSS/ceramic absent from explicit assertions  
**Machines:** Haas VF-2 (VMC, 22.4 kW), DMG MORI DMU 50 (5-axis, 35 kW), generic max_rpm/power constraints  
**Operations:** Turning, milling, drilling, boring, threading, parting, finishing, roughing, slotting  
**Coolant strategies:** Flood, dry, high-pressure coolant effects validated

## Edge case coverage (NaN/Infinity/empty/oversize)
**Zero inputs:** Zero diameter (calcRPM returns 0), zero depth/SFM handled ✓  
**Negative values:** Negative diameter, negative L/D ratio returns 0 or default ✓  
**Extreme ranges:** 0.5mm tool (high RPM), 100mm tool (low RPM), L/D > 6 (CAUTION flag) ✓  
**Array operations:** Empty operations array returns stats=0 ✓  
**Floating-point precision:** toBeCloseTo(n, decimal) used appropriately (RPM calcs, peck schedules)  
**Missing:** No explicit NaN propagation, Infinity clamp, or malformed input object tests

## Adversarial inputs
**Strengths:**
- RPM clamping validated (G50 limits exceeded correctly)
- Boring bar rigidity scaling tested across L/D thresholds (15%–100%)  
- Feed scaling with zero bar diameter returns original value
- Power budget constraints warning system tested
- Machine rigidity factor (0.7–1.2) affects depth of cut

**Gaps:**
- No negative feed, negative power, or negative hardness assertions
- No extreme hardness (>HB 700) test  
- No oversize tool (D > machine envelope) rejection
- No conflicting coolant+coating combination tests

## Stub assertions (toBeDefined / toBe(true) — RED FLAG)
**Count:** 8 instances of toBeDefined() in UltimateSpeedFeedEngine.test.ts  
**Examples:**
- Line 409: `expect(result.power.is_within_budget).toBeDefined();`
- Line 501: `expect(result.alternatives.conservative).toBeDefined();`

**Severity:** YELLOW (not RED). Most stubs verify object existence pre-value assertion, but:
- Line 409 (power constraint) lacks truth value check — should verify `toBe(true/false)`
- Lines 501–503 define presence but not content validity (no toBeGreaterThan on alternatives.*.mrr)

**Pattern violation:** Test conventions require value assertions, not just existence. Recommend adding:
```typescript
expect(result.power.is_within_budget).toBe(true);  // or toBe(false) with reason
expect(result.alternatives.conservative.vc).toBeGreaterThan(0);
```

## Score (0–100)
**Breakdown:**
- **Coverage (25/25):** 123 tests >> 10-per-engine minimum; good describe/it structure
- **Materials (18/20):** 5/6 ISO groups; no K/H explicit; carbide only (HSS/ceramic absent)
- **Edge cases (16/20):** Zero/negative/extreme ranges covered; missing NaN/Infinity propagation
- **Physics verification (19/20):** Kienzle (kc1.1), Taylor (ISO 3685), RPM formula (1000*Vc/(π*D)) confirmed; unclear if kc1.1 values from src/physics/constants.ts vs. stubs
- **Benchmark sourcing (15/20):** References Kienzle, Taylor, ISO 3685; no explicit ASM Handbook/Machinery's Handbook citations; constants.ts import not verified in test assertions
- **Stub detection (4/5):** 8 toBeDefined() instances flagged; non-critical but violates convention

**Final Score: 77/100**  
**Status:** AMBER. Tests are **functionally robust** but **reference verification weak**. Recommend: (1) audit physics constant imports in engines, (2) replace 8 stub assertions with value checks, (3) add HSS/ceramic tool material tests, (4) verify Kienzle/Taylor coefficients match ASM Handbook.

