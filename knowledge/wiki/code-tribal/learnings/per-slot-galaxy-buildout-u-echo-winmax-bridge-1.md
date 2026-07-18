# PER-SLOT-GALAXY-BUILDOUT/U-ECHO-WINMAX-BRIDGE-1 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PER-SLOT-GALAXY-BUILDOUT]/U-ECHO-WINMAX-BRIDGE-1: PRISM<->WinMax automation bridge foundation, mirroring delta's *AutomationBridge pattern. winmax-probe.mjs (read-only surface discovery: WCF net.pipe/tcp:4502/http:8080 + DataBlockXMLTools.dll) + winmax-bridge.mjs (action executor, pluggable transport, mock-by-default, ncToDatablocks + compareDatablocks compare loop, probeWcfLive, AtomicValue) + winmax.actions.json + DESIGN.md + SURFACE-PROBE.json. 11 tests (parser fix G28/G43=rapid; live-fails-loud). local transport LIVE; wcf/xml/uia need operator session

**Commit:** `e158abbe4224` · **By:** markjvillanueva3-cloud · **At:** 2026-05-30T00:10:41-05:00
**Tags:** per-slot-galaxy-buildout, u-echo-winmax-bridge-1, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PER-SLOT-GALAXY-BUILDOUT]/U-ECHO-WINMAX-BRIDGE-1: PRISM<->WinMax automation bridge foundation, mirroring delta's *AutomationBridge pattern. winmax-probe.mjs (read-only surface discovery: WCF net.pipe/tcp:4502/http:8080 + DataBlockXMLTools.dll) + winmax-bridge.mjs (action executor, pluggable transport, mock-by-default, ncToDatablocks + compareDatablocks compare loop, probeWcfLive, AtomicValue) + winmax.actions.json + DESIGN.md + SURFACE-PROBE.json. 11 tests (parser fix G28/G43=rapid; live-fails-loud). local transport LIVE; wcf/xml/uia need operator session

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PER-SLOT-GALAXY-BUILDOUT]/U-ECHO-WINMAX-BRIDGE-1: PRISM<->WinMax automation bridge foundation, mirroring delta's *AutomationBridge pattern. winmax-probe.mjs (read-only surface discovery: WCF net.pipe/tcp:4502/http:8080 + DataBlockXMLTools.dll) + winmax-bridge.mjs (action executor, pluggable transport, mock-by-default, ncToDatablocks + compareDatablocks compare loop, probeWcfLive, AtomicValue) + winmax.actions.json + DESIGN.md + SURFACE-PROBE.json. 11 tests (parser fix G28/G43=rapid; live-fails-loud). local transport LIVE; wcf/xml/uia need operator session
```

## Files touched (7)
- mcp-server/data/posts/prism-base/winmax-bridge/DESIGN.md           |  43 ++++++++++++++++++++++
- mcp-server/data/posts/prism-base/winmax-bridge/SURFACE-PROBE.json  | 222 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/data/posts/prism-base/winmax-bridge/winmax.actions.json |  23 ++++++++++++
- scripts/winmax-bridge.mjs                                          | 146 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/winmax-bridge.test.mjs                                     | 126 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/winmax-probe.mjs                                           | 103 ++++++++++++++++++++++++++++++++++++++++++++++++++++
- 6 files changed, 663 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e158abbe4224`
- Milestone envelope: `mcp-server/data/milestones/PER-SLOT-GALAXY-BUILDOUT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._