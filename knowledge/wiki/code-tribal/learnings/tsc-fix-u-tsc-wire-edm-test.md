# TSC-FIX/U-TSC-WIRE-EDM-TEST — [MAIN] [TSC-FIX]/U-TSC-WIRE-EDM-TEST: WireEDMSettingsEngine wiring-gate test + 2 real bug fixes

**Commit:** `56f90ae999ee` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T12:09:17-05:00
**Tags:** tsc-fix, u-tsc-wire-edm-test, auto-distilled

## Subject
[MAIN] [TSC-FIX]/U-TSC-WIRE-EDM-TEST: WireEDMSettingsEngine wiring-gate test + 2 real bug fixes

## Body
```
[MAIN] [TSC-FIX]/U-TSC-WIRE-EDM-TEST: WireEDMSettingsEngine wiring-gate test + 2 real bug fixes

stop_on_unwired_assets flagged WireEDMSettingsEngine as UNTESTED (no
dedicated __tests__/<Name>.test.ts; only indirect cwedm-e2e coverage).
Adding the test surfaced two real pre-existing engine defects:

BUG 1 — matMap pointed at non-existent canonical keys. getEDMThermalProps
mapped abbreviated names to keys ('steel','tool_steel','stainless_304',
'low_carbon_steel') that do NOT exist in CANONICAL_MATERIAL_DB (indexed
by AISI designations '1018','1045','D2','304','6061','Ti-6Al-4V',
'Inconel 718','tungsten_carbide','gray_iron'). Every lookup returned
undefined -> 'Cannot read density_kg_m3 of undefined' crash. Fixed to
target the real AISI keys; fallback 'low_carbon_steel' -> '1045'.

BUG 2 — silent NaN feed for any wire diameter without a published
condition (e.g. brass_0.20). PUBLISHED_PULSE_CONDITIONS only carries
0.25mm-wire entries; 0.20mm misses the lookup AND the Kunieda fallback
degenerated to NaN, which flowed unguarded to first_cut_speed_mm_per_min
-> straight into generated WEDM G-code (shop-floor safety defect). Added
a Karpathy-R12 fail-loud guard: non-finite/non-positive feed now throws
with full derivation context naming the unsupported wire/material/
thickness combo, instead of returning NaN.

Test: 26 it() cases — happy path, skim-ladder boundary contract
(>0.8 exclusive), published_lookup vs kunieda method, multi-material
(D2/304/6061/Inconel eta ordering verified against Kunieda 2005),
multi-wire, thickness spans, numeric-integrity (no NaN/Inf leak),
fail-loud adversarial (brass_0.20 must throw not NaN), submerged
on/off, taper. Concrete physics invariants, zero toBeDefined stubs.
26/26 PASS. esbuild clean (exit 0).
```

## Files touched (3)
- .../src/__tests__/WireEDMSettingsEngine.test.ts    | 290 +++++++++++++++++++++
- mcp-server/src/engines/WireEDMSettingsEngine.ts    |  50 +++-
- 2 files changed, 329 insertions(+), 11 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 56f90ae999ee`
- Milestone envelope: `mcp-server/data/milestones/TSC-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._