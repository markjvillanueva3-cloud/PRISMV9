# OSCAR-SFC-9AXIS-MS0/U-OSC-COOLANT-VC — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-COOLANT-VC (slot:oscar): wire coolant into SFC Vc — REUSE existing CoolantVcModifier (algo 8.5), no forked table

**Commit:** `585584e3aef0` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T09:24:09-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-coolant-vc, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-COOLANT-VC (slot:oscar): wire coolant into SFC Vc — REUSE existing CoolantVcModifier (algo 8.5), no forked table

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-COOLANT-VC (slot:oscar): wire coolant into SFC Vc — REUSE existing CoolantVcModifier (algo 8.5), no forked table

2nd inert axis fixed. Operator found coolant inert in the SFC (flood≡dry → identical Vc). Root cause was a WIRING gap, not a missing model: tango's CoolantVcModifier (8.5, 6 ISO × 5 coolant, cited+tested+dispatcher-wired) already modeled coolant→Vc+Taylor-C but was never consumed by UltimateSpeedFeedEngine.calculate().

- DEDUP (R7/R8): aborted an initial parallel CANONICAL_COOLANT_SPEED_FACTOR in constants.ts on discovering 8.5 exists; reverted constants, wired the EXISTING algorithm (no 2nd source of truth, conforms to the algorithms/8.x convention).
- Engine: Vc = base × hardness × strategy × tool_material × coolant_factor; coolant_factor = getCoolantVcMultipliers({iso_group, coolant}).vc_multiplier.value. EXPLICIT-only (inferred/unspecified coolant → 1.0, no double-count — base Vc already assumes the recommended coolant). 7→5 coolant map: air_blast→dry (conservative), through_tool→flood (HPC boost needs algo 8.7 pressure inputs, not claimed here).
- Material-aware: dry derates steel/stainless/superalloy (dry-S 0.55 ≪ dry-P 0.78 < dry-K 0.92); cryo lifts superalloys (S 1.60) — a global scalar can't span this.
- Tests: coolantSpeedFactor.test.ts (8) verify the model property + engine wiring; +2 variability it.todo promoted to real tests (tool_material Vc differentiation, U-OSC-TOOLMAT-VC, now satisfied). Also fixed 25 PRE-EXISTING variability failures: stale assertCanonicalUnits expected spindle_rpm "RPM" but the engine canonically emits "rev/min" (main gauntlet pins "rev/min" at :41) — corrected to the canonical/tested unit (NOT weakening).
- Verified: coolant 8 + toolmat 10 + gauntlet 52 + variability 105(+1 todo) green; tsc clean for ALL touched files (10 pre-existing errors live in unrelated shopDispatcher.ts, not this unit).
- Follow-up (P3): coolant's Taylor-C multiplier (tool-life coupling) not yet wired — next.
```

## Files touched (4)
- mcp-server/src/__tests__/UltimateSpeedFeedEngine.variability.test.ts |  33 ++++++++++++--------
- mcp-server/src/__tests__/coolantSpeedFactor.test.ts                  | 100 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/UltimateSpeedFeedEngine.ts                    |  29 ++++++++++++++++--
- 3 files changed, 148 insertions(+), 14 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 585584e3aef0`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._