# CIMCO-INTEGRATION-MS0/U-CIMCO-LAUNCH-PROBE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-LAUNCH-PROBE (slot:echo): blind launch surface — exe inventory + honest CLI patterns + the blind-safe External-Commands integration hook

**Commit:** `54da7cd8ae88` · **By:** markjvillanueva3-cloud · **At:** 2026-06-03T09:09:37-05:00
**Tags:** cimco-integration-ms0, u-cimco-launch-probe, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-LAUNCH-PROBE (slot:echo): blind launch surface — exe inventory + honest CLI patterns + the blind-safe External-Commands integration hook

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-LAUNCH-PROBE (slot:echo): blind launch surface — exe inventory + honest CLI patterns + the blind-safe External-Commands integration hook

R13 foundation under the run-sim/compare path: HOW a blind agent starts/drives the local CIMCO Edit 2026 install to prove a JM-fleet post.

DATA: state/shared/cimco/launch-surface.json (schemaVersion 1.0.0). LOADER: scripts/cimco-launch-probe.mjs (fail-loud loader, CLI summary|verify|patterns|hook|open, 10 tests). WIRED: CimcoVerificationBridgeEngine.launchSurface() -> prism_cimco cimco_launch_surface (dispatcher 8->9 actions, schema + enum + switch).

VERIFIED EXE INVENTORY (paths+sizeBytes confirmed): CIMCOEdit.exe (30.8MB editor+FileCompare+Machine-Sim host), Dll/CIMCOSimulation.exe (7.0MB sim-verdict surface = SPINE-2 UIA target), Sys/KeyManager.exe (license-gate), Dll/GroovingKernelWrapper.exe. verify() returns missing[], never fabricates.

HONEST PATTERN SPLIT (R12): VERIFIED = CIMCOEdit.exe "<ncFile>" (file open). NEEDS-LIVE-VERIFY = open-pair compare (File-Compare ACTION is UIA-only, no documented flag) + standalone-sim-replay. strings scan found no usage banner -> no CLI flag asserted beyond file-open.

HEADLINE: blind-safe integration hook (FILE channel, NO UIA) — Editor Setup > External Commands invokes an external program on the open NC file with macros $FILE/$FILENOEXT/$PATH/$FILEPATH/$OUTFILE. PRISM use: register "PRISM Verify" -> receives $FILEPATH, runs prism_cimco verify, writes verdict to $OUTFILE. Complements (not replaces) SPINE-2 UIA report reader for the Machine-Sim collision verdict.

Tests: cimco-launch-probe.test.mjs 10/10 + bridge engine 31/31. tsc-clean (30 workspace errors all pre-existing peer-domain drift). Wiki [[cimco-verification-simulation-integration]] + memory [[reference_cimco_launch_probe_2026_06_03]].
```

## Files touched (9)
- .../architecture/cimco-verification-simulation-integration.md    |   7 ++
- mcp-server/src/__tests__/CimcoVerificationBridgeEngine.test.ts   |  35 +++++++
- .../src/engines/post-processor/CimcoVerificationBridgeEngine.ts  |  46 ++++++++
- mcp-server/src/schemas/cimcoActionSchemas.ts                     |   8 ++
- mcp-server/src/tools/dispatchers/cimcoDispatcher.ts              |   8 +-
- scripts/cimco-launch-probe.mjs                                   | 162 +++++++++++++++++++++++++++++
- scripts/cimco-launch-probe.test.mjs                              | 142 +++++++++++++++++++++++++
- state/shared/cimco/launch-surface.json                           |  61 +++++++++++
- 8 files changed, 468 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 54da7cd8ae88`
- Milestone envelope: `mcp-server/data/milestones/CIMCO-INTEGRATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._