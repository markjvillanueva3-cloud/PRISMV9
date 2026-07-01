# SFC-CONVERGENCE/U-SFC-MACHINE-FALLBACK-WARN — [MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-MACHINE-FALLBACK-WARN (slot:oscar): surface an honest warning when a named machine falls back to generic spindle defaults

**Commit:** `ab58dbcafc7f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T18:29:26-05:00
**Tags:** sfc-convergence, u-sfc-machine-fallback-warn, auto-distilled

## Subject
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-MACHINE-FALLBACK-WARN (slot:oscar): surface an honest warning when a named machine falls back to generic spindle defaults

## Body
```
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-MACHINE-FALLBACK-WARN (slot:oscar): surface an honest warning when a named machine falls back to generic spindle defaults

GAP (found via the JM-fleet x material correctness sweep, 30/30): only `haas vf-2` resolves to real
specs; the other 4 JM mill machines (Hurco VM30i, Okuma M460V-5AX, Haas OM-2, Roku-Roku) and any
unknown machine_name silently fall back to generic DEFAULT_MACHINE_PROFILES (power/rpm/torque at
confidence 0.4) -- WHILE resolved_machine.name still echoes the user's name at 0.9 confidence. So the
result LOOKS machine-specific while the power/torque SAFETY LIMITS are generic, with no disclosure.
That violates the SFC's never-publish-without-disclosing-uncertainty principle.

FIX (no fabricated specs -- pure honest disclosure): when machine_name is supplied AND the resolved
power_kw provenance is `default_for_<type>` (i.e. matched no capability/catalog/registry source), emit
a playbook_warning naming the machine + the generic specs used + their confidence + that the limits
are NOT machine-specific, advising the user to pass machine_power_kw/_max_rpm/_max_torque_nm
explicitly. Suppressed when the user provided explicit scalars (source user_input) or the machine
resolves to real specs (capability_*/catalog_*).

TEST: SpeedFeedOrchestrator-machine-fallback-warn.test.ts (4/4): unknown named machine -> warning
names machine + generic + NOT machine-specific + provenance default_for_/conf<=0.5; haas vf-2 -> no
warning + real >18kW; no machine_name -> no warning; named-unknown + explicit power -> suppressed +
source user_input. 0 tsc errors.

This makes the machine-spec gap (real spec registration for the 4 JM machines = a future foxtrot/
juliett machine-DB unit) HONEST in the meantime rather than silent.
```

## Files touched (3)
- .../src/__tests__/SpeedFeedOrchestrator-machine-fallback-warn.test.ts       | 72 +++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts                       | 18 ++++++++++
- 2 files changed, 90 insertions(+)

## Lessons surfaced in commit body
- till echoes the user's name at 0.9 confidence. So the

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ab58dbcafc7f`
- Milestone envelope: `mcp-server/data/milestones/SFC-CONVERGENCE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._