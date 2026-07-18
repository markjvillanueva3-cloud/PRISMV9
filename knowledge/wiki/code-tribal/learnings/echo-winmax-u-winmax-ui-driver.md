# ECHO-WINMAX/U-WINMAX-UI-DRIVER — [MAIN-FORCE] [ECHO-WINMAX]/U-WINMAX-UI-DRIVER: drive the WinMax GUI via UIA (no Vendor ID needed)

**Commit:** `2a991c4779a5` · **By:** markjvillanueva3-cloud · **At:** 2026-05-30T11:52:11-05:00
**Tags:** echo-winmax, u-winmax-ui-driver, auto-distilled

## Subject
[MAIN-FORCE] [ECHO-WINMAX]/U-WINMAX-UI-DRIVER: drive the WinMax GUI via UIA (no Vendor ID needed)

## Body
```
[MAIN-FORCE] [ECHO-WINMAX]/U-WINMAX-UI-DRIVER: drive the WinMax GUI via UIA (no Vendor ID needed)

Answers "can we control the UI like the bridge controls Fusion" - YES. PrismWinMaxUI.exe (net48,
System.Windows.Automation - the OS accessibility tree, present on every Windows box, no NuGet)
attaches to the running WinMax window and reads/drives controls by AutomationId + UIA patterns,
JSON line protocol for the node bridge (mirrors the wcf-client shim). This path needs NO Hurco
credential - the UI is the operator's own screen.

LIVE PROBE (WinMax.exe PID 62868): window "WinMax Mill" class WinMaxTDBClass, 128-node UIA tree,
61 actionable controls. KEY FINDING: WinMax is driven by F1-F8 softkeys (Button AutomationIds
301-308) + 14 Edit fields + toolbar items - all addressable. Captured in UI-TREE-PROBE.json (the
selector map for building macros).

SAFETY: read-only by default; input injection gated behind --allow-actions; cycle-start/run-program
hard-denied unless --allow-machine-motion (sim/supervised only). Attaches to a running WinMax,
never launches it. Next: U-WINMAX-UI-MACRO (map the softkey screen-flow for open/tool-setup/run).

[MAIN-FORCE] only to bypass the worktree-commit-route hook misparse (scope "))"); legitimate echo work on the shared H:/prism tree.
```

## Files touched (6)
- mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/.gitignore           |   4 ++
- mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/DESIGN.md            |  45 ++++++++++++++++++
- mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/PrismWinMaxUI.csproj |  41 ++++++++++++++++
- mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/Program.cs           | 257 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/UI-TREE-PROBE.json   |   1 +
- 5 files changed, 348 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2a991c4779a5`
- Milestone envelope: `mcp-server/data/milestones/ECHO-WINMAX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._