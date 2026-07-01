# SFC-CONVERGENCE/U-SFC-MACHINEAWARE-CONSTRAINTS — [MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-MACHINEAWARE-CONSTRAINTS (slot:oscar): make machine-aware S/F clamping respect per-machine feed/base-rpm (was hardcoded) + fix fixture field names (7 reds)

**Commit:** `efb570b72049` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T00:37:41-05:00
**Tags:** sfc-convergence, u-sfc-machineaware-constraints, auto-distilled

## Subject
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-MACHINEAWARE-CONSTRAINTS (slot:oscar): make machine-aware S/F clamping respect per-machine feed/base-rpm (was hardcoded) + fix fixture field names (7 reds)

## Body
```
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-MACHINEAWARE-CONSTRAINTS (slot:oscar): make machine-aware S/F clamping respect per-machine feed/base-rpm (was hardcoded) + fix fixture field names (7 reds)

MachineAwareSpeedFeedEngine.extractConstraints had a real machine-awareness bug:
maxFeedRate (15000) and baseRpm (1500) were HARDCODED, ignoring the machine
entirely -- so a 35kW DMU 50 (30000 mm/min, base 2500) was clamped to the same
generic limits as a 22.4kW Haas VF-2. The power/torque reads were correct
(spindle.power/spindle.torque) but the test fixtures (cast `as any`) used
NON-EXISTENT field names (power_kw/power_continuous_kw, max_torque_nm,
axes.max_feed_mmmin) so the engine read undefined -> defaulted to 15kW/100Nm.
Result: 7 RED tests + machine-awareness effectively dead for feed/base-rpm.

Root cause verified against the authoritative types (src/types.ts:420
MachineSpindle, :434 MachineAxes): MachineSpindle has `power`/`torque` but no
`base_rpm`; MachineAxes has no max-cutting-feed field. The capability was never
modeled (engine comment admitted it).

COMPREHENSIVE FIX (R13 -- model the data, do NOT lower test expectations):
- types.ts: added two ADDITIVE OPTIONAL fields -- MachineSpindle.base_rpm? +
  MachineAxes.max_cutting_feed_mmmin? (backward-compatible; tsc fully clean,
  zero consumer breakage).
- extractConstraints: maxFeedRate = axes?.max_cutting_feed_mmmin ?? 15000;
  baseRpm = spindle.base_rpm ?? 1500. Un-enriched machines keep the conservative
  defaults via `??` (byte-identical fallback).
- test fixtures: corrected to real field names (power_kw->power, max_torque_nm->
  torque, max_feed_mmmin->max_cutting_feed_mmmin, rapid_mmmin->x_rapid) +
  linear/rotary axes counts.

SAFETY (safety-physics PASS S(x)=1.00): the new limits are the machines GENUINE
rated specs -- power-torque-baseRpm self-consistent per P=T*n/9549 (VF-2
122*1750/9549=22.36 vs 22.4; DMU 130*2500/9549=34.0 vs 35). Clamping to real
limits is accurate not over-permissive; un-enriched machines stay conservative;
torque-limit flag still protects on the corrected curve. No path over-states a
machine beyond its rated limit.

Follow-up (non-blocking, safety-physics advisory): assert the P=T*n/9549 triple
consistency inside extractConstraints to guard against future inconsistent
enrichment data.

Verify: MachineAwareSpeedFeedEngine.test.ts 19/19 (was 12/19). tsc clean.
```

## Files touched (4)
- mcp-server/src/__tests__/MachineAwareSpeedFeedEngine.test.ts | 22 ++++++++++++----------
- mcp-server/src/engines/MachineAwareSpeedFeedEngine.ts        | 12 +++++++-----
- mcp-server/src/types.ts                                      |  8 ++++++++
- 3 files changed, 27 insertions(+), 15 deletions(-)

## Lessons surfaced in commit body
- till protects on the corrected curve. No path over-states a

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show efb570b72049`
- Milestone envelope: `mcp-server/data/milestones/SFC-CONVERGENCE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._