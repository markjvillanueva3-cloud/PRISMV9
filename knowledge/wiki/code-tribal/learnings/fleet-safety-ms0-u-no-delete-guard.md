# FLEET-SAFETY-MS0/U-NO-DELETE-GUARD — [MAIN] [FLEET-SAFETY-MS0]/U-NO-DELETE-GUARD+HOST-PRESETS: claude-no-delete-files PreToolUse + per-PC fleet-reaper variants

**Commit:** `92432b01dc28` · **By:** markjvillanueva3-cloud · **At:** 2026-05-19T08:04:51-05:00
**Tags:** fleet-safety-ms0, u-no-delete-guard, auto-distilled

## Subject
[MAIN] [FLEET-SAFETY-MS0]/U-NO-DELETE-GUARD+HOST-PRESETS: claude-no-delete-files PreToolUse + per-PC fleet-reaper variants

## Body
```
[MAIN] [FLEET-SAFETY-MS0]/U-NO-DELETE-GUARD+HOST-PRESETS: claude-no-delete-files PreToolUse + per-PC fleet-reaper variants

U-NO-DELETE-GUARD (slot golf, claude-cedef311 on work PC MarkV):
- new .claude/hooks/claude-no-delete-files.mjs hard-blocks 15 destructive bash patterns (rm/Remove-Item/del/git rm/truncate/shred/fs.unlinkSync/fs.rmSync/fs.rmdirSync/os.remove/shutil.rmtree/truncate-redirect/empty-to-file/rmdir/unlink-shell). Narrow exceptions for *.tmp.PID, *.bak-, /tmp/, node_modules, .lock files. Operator-only bypass PRISM_CLAUDE_DELETE_OK=1 audits to state/shared/.claude-delete-bypass.jsonl.
- 36-case node:test with subprocess oracle + rule-ordering drift-guard (git-rm BEFORE rm precedence).
- wired in H:/.claude/settings.json PreToolUse Bash matcher BEFORE bash-bundle so deny-by-default short-circuits before any expensive work.
- Per-file scrutiny PASS via tests catching 2 real bugs mid-build (rule precedence + bare *Sync verb pattern).

U-HOST-PRESETS (per-PC fleet-reaper tuning):
- new .claude/helpers/fleet-reaper-host-presets.mjs — hostname-keyed preset overlay (home: 7b model + 90% floor + 2GB GPU floor; work: 3b model + 85% floor + 1GB GPU floor + more aggressive offload).
- new /fleet-reaper-home + /fleet-reaper-work skills write the appropriate preset to state/shared/dashboards/fleet-reaper-host-presets.json keyed by os.hostname().
- patch scripts/fleet-reaper-sweep.mjs (2 import lines + 1 call) to applyHostPresetForCurrent() at module top — durable across the 5-min scheduled task and the in-session Monitor.
- 24-case node:test covering schema, frozen builtins, case-insensitive host match, env-wins-over-preset, atomic round-trip.
- This PC (MarkV) seeded with the work preset.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (7)
- .claude/helpers/fleet-reaper-host-presets.mjs      | 174 ++++++++++++
- .claude/helpers/fleet-reaper-host-presets.test.mjs | 295 +++++++++++++++++++++
- .claude/hooks/claude-no-delete-files.mjs           | 179 +++++++++++++
- .claude/hooks/claude-no-delete-files.test.mjs      | 282 ++++++++++++++++++++
- scripts/fleet-reaper-sweep.mjs                     |  12 +
- .../dashboards/fleet-reaper-host-presets.json      |  19 ++
- 6 files changed, 961 insertions(+)

## Lessons surfaced in commit body
- til.rmtree/truncate-redirect/empty-to-file/rmdir/unlink-shell). Narrow exceptions for *.tmp.PID, *.bak-, /tmp/, node_modules, .lock files. Operator-only bypass PRISM_CLAUDE_DELETE_OK=1 audits to state/shared/.claude-delete-bypass.jsonl.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 92432b01dc28`
- Milestone envelope: `mcp-server/data/milestones/FLEET-SAFETY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._