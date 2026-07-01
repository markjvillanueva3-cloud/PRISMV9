# DB-COVERAGE-GAPFILL-MS0/U-MACH01 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DB-COVERAGE-GAPFILL-MS0]/U-MACH01 (slot:romeo): JM mill handbooks VMC-01/02/03 (spec-sheet tier), registry-resolvable by JM roster machine_id

**Commit:** `3f941f2885f3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-03T09:53:12-05:00
**Tags:** db-coverage-gapfill-ms0, u-mach01, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DB-COVERAGE-GAPFILL-MS0]/U-MACH01 (slot:romeo): JM mill handbooks VMC-01/02/03 (spec-sheet tier), registry-resolvable by JM roster machine_id

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DB-COVERAGE-GAPFILL-MS0]/U-MACH01 (slot:romeo): JM mill handbooks VMC-01/02/03 (spec-sheet tier), registry-resolvable by JM roster machine_id

Builds machine_id-keyed handbooks for 3 well-documented JM mills, closing
part of the 14/15-machines-lack-handbook gap (only LTH-06 had a prior match):
  - VMC-01 Hurco VM30i  (WinMAX v10)
  - VMC-02 Okuma M460V-5AX (OSP-P300MA-H, true 5-axis A+C trunnion)
  - VMC-03 Haas VF-2  (Classic/PRE-NGC)

Spec-sheet tier (honest provenance): every section source = extraction_method
'web_scrape', confidence 0.6-0.85 (NOT the 0.95/'manual' band reserved for
service-manual extraction). alarm_codes/parts_book intentionally EMPTY — no
fabricated OEM part numbers (R12). Populated: spindle (rpm/power/torque/taper),
axis kinematics + work envelope, controller G/M codes (real Haas/OSP/WinMAX),
tooling constraints, safety limits.

machine_id keyed to JM roster id (VMC-0x) so getByMachineId('VMC-03') resolves
(legacy handbooks key machine_id=model-slug and are not roster-resolvable).

Per-file scrutiny: 2 reviewers; Agent A web-verified specs and caught 3 P0s in
the VM30i draft (Haas geometry had been cloned -> corrected to 1270x508x508mm,
20hp/15kW/99Nm, 24-tool/7kg) + P1s (Okuma trunnion 200->300kg, VM30i rapids
->27990mm/min); corrected values locked into the test.

+8 tests (machine-handbook-jm-fleet.test.ts) all green: machine_id resolution,
concrete specs, provenance-honesty band, no-fabrication invariant.

NOTE (separate finding, next unit): all 8 PRE-EXISTING handbooks fail the
current MachineHandbookSchema (null on optional fields) and load 0/8 -> registry
silently degraded. Fix queued as U-MACH02.
```

## Files touched (5)
- mcp-server/data/machine-handbooks/haas-vf-2.json           | 206 +++++++++++++++++++++++++++++++++++
- mcp-server/data/machine-handbooks/hurco-vm30i.json         | 148 +++++++++++++++++++++++++
- mcp-server/data/machine-handbooks/okuma-m460v-5ax.json     | 170 +++++++++++++++++++++++++++++
- mcp-server/src/__tests__/machine-handbook-jm-fleet.test.ts | 143 ++++++++++++++++++++++++
- 4 files changed, 667 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3f941f2885f3`
- Milestone envelope: `mcp-server/data/milestones/DB-COVERAGE-GAPFILL-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._