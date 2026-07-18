# SIERRA-VIZ/U-VIZ-WINDOWSHIDE-DETACHED — [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-WINDOWSHIDE-DETACHED (slot:sierra): hide detached-spawn console windows fleet-wide

**Commit:** `6a1cf88bb4a1` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T20:17:17-05:00
**Tags:** sierra-viz, u-viz-windowshide-detached, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-WINDOWSHIDE-DETACHED (slot:sierra): hide detached-spawn console windows fleet-wide

## Body
```
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-WINDOWSHIDE-DETACHED (slot:sierra): hide detached-spawn console windows fleet-wide

Operator: 'please fix whatever is causing a bunch of terminal windows to open.'

Root cause: on Windows, spawn(..., {detached:true}) WITHOUT windowsHide:true opens
a VISIBLE console window for the detached child that PERSISTS for the child's life
(unlike a sync spawn, which only flashes). Across the interactively-fired layer --
Stop hooks (stop-brain-refresh, stop-auto-wire, stop-extraction-intake-drain,
stop-graph-staleness-backstop, stop-tab-blink, stop-wiki x3), UserPromptSubmit
injectors (awareness-snapshot, cag-cold-cache, directive-summary, injection-budget,
wiki-precheck prewarm), and autostarts (prism-http, mcp-server-daemon) -- every
turn-end + every prompt fired a burst of persistent console windows = the symptom.

Fix: add windowsHide:true to all 22 detached spawn sites across 19 files via a new
idempotent, re-runnable remediation tool (scripts/fix-detached-windowshide.mjs,
companion to the existing audit-windows-hide.mjs auditor). The transform anchors on
the 'detached: true' literal, NOT a spawn-fn name, so it also covers the auditor's
blind spots: _spawn() (self-compact), spawnImpl() (wiki-precheck), and options
objects whose 'detached' falls past the auditor's 140-char snippet window.

Verify: 11/11 tests (scripts/fix-detached-windowshide.test.mjs -- idempotency,
multi-line/single-line/detached-after-stdio shapes, spawn-fn-agnostic, no-double-add,
comment-FP allowlist exclusion); --verify reports 0 bare; node --check passes on all
19 targets; re-audit shows only 3 comment/docstring false-positives remaining
(fleet-reaper-stop:14, stop_close_prism_nodes_v2:12, and this tool's own docstring).

SCOPED: this commit fixes the DETACHED class (persistent windows = the symptom).
The SYNC-spawn FLASHER class (256 sites / 154 files: spawnSync/execFileSync missing
windowsHide -- brief flash, not persist) is a separate, larger, higher-risk surface
(varied option-object shapes; some calls have no options object) deferred to a
carefully-verified follow-up pass, NOT swept blindly across 154 critical hooks.
```

## Files touched (22)
- .claude/helpers/mcp-server-daemon.mjs               |   2 +-
- .claude/hooks/awareness-snapshot-inject.mjs         |   2 +-
- .claude/hooks/cad-coverage-auto-refresh.mjs         |   2 +-
- .claude/hooks/cag-cold-cache-anchor.mjs             |   2 +-
- .claude/hooks/directive-summary-refresh.mjs         |   2 +-
- .claude/hooks/extraction-intake-trigger.mjs         |   4 +-
- .claude/hooks/injection-budget-snapshot-refresh.mjs |   2 +-
- .claude/hooks/obsidian-viz-edge-autosync.mjs        |   2 +-
- .claude/hooks/prism-http-autostart.mjs              |   2 +-
- .claude/hooks/stop-auto-wire.mjs                    |   2 +-
_(+12 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6a1cf88bb4a1`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._