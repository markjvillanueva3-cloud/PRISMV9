# PER-SLOT-GALAXY-BUILDOUT/U-ECHO-WINMAX-BRIDGE-2 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PER-SLOT-GALAXY-BUILDOUT]/U-ECHO-WINMAX-BRIDGE-2: live WCF probe against running WinMax — CORRECTS http:8080 assumption (R12). Verified: WcfDataService hosts net.tcp:4502 (DataServicetcp, contract WcfDataServices.IDataService) + net.pipe ONLY; the config's HTTP SOAP/mex endpoints are NOT listening; no .NET SDK on box. probeWcfLive rewritten to net.tcp reachability probe (reports reachable+contract+'.NET-client-needed', never fabricates). 12 tests (hermetic net.tcp reachable + unreachable). DESIGN: live-probe findings + go-live decision (install .NET SDK->C# shim recommended)

**Commit:** `9f5b0281fb21` · **By:** markjvillanueva3-cloud · **At:** 2026-05-30T00:29:58-05:00
**Tags:** per-slot-galaxy-buildout, u-echo-winmax-bridge-2, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PER-SLOT-GALAXY-BUILDOUT]/U-ECHO-WINMAX-BRIDGE-2: live WCF probe against running WinMax — CORRECTS http:8080 assumption (R12). Verified: WcfDataService hosts net.tcp:4502 (DataServicetcp, contract WcfDataServices.IDataService) + net.pipe ONLY; the config's HTTP SOAP/mex endpoints are NOT listening; no .NET SDK on box. probeWcfLive rewritten to net.tcp reachability probe (reports reachable+contract+'.NET-client-needed', never fabricates). 12 tests (hermetic net.tcp reachable + unreachable). DESIGN: live-probe findings + go-live decision (install .NET SDK->C# shim recommended)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PER-SLOT-GALAXY-BUILDOUT]/U-ECHO-WINMAX-BRIDGE-2: live WCF probe against running WinMax — CORRECTS http:8080 assumption (R12). Verified: WcfDataService hosts net.tcp:4502 (DataServicetcp, contract WcfDataServices.IDataService) + net.pipe ONLY; the config's HTTP SOAP/mex endpoints are NOT listening; no .NET SDK on box. probeWcfLive rewritten to net.tcp reachability probe (reports reachable+contract+'.NET-client-needed', never fabricates). 12 tests (hermetic net.tcp reachable + unreachable). DESIGN: live-probe findings + go-live decision (install .NET SDK->C# shim recommended)
```

## Files touched (4)
- mcp-server/data/posts/prism-base/winmax-bridge/DESIGN.md | 16 ++++++++++++----
- scripts/winmax-bridge.mjs                                | 31 ++++++++++++++++++++-----------
- scripts/winmax-bridge.test.mjs                           | 21 ++++++++++++++++++---
- 3 files changed, 50 insertions(+), 18 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9f5b0281fb21`
- Milestone envelope: `mcp-server/data/milestones/PER-SLOT-GALAXY-BUILDOUT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._