# FORK-STORM-CONSOLIDATION/U-GREP-GLOB-BUNDLE — [MAIN-FORCE] [FORK-STORM-CONSOLIDATION]/U-GREP-GLOB-BUNDLE (slot:tango): bundle Grep/Glob PreToolUse hooks

**Commit:** `9b20d92efcda` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T21:20:59-05:00
**Tags:** fork-storm-consolidation, u-grep-glob-bundle, auto-distilled

## Subject
[MAIN-FORCE] [FORK-STORM-CONSOLIDATION]/U-GREP-GLOB-BUNDLE (slot:tango): bundle Grep/Glob PreToolUse hooks

## Body
```
[MAIN-FORCE] [FORK-STORM-CONSOLIDATION]/U-GREP-GLOB-BUNDLE (slot:tango): bundle Grep/Glob PreToolUse hooks

Grep + Glob had NO bundle -- every advisory fired as a separate portable-node
bash.exe spawn (5 per Grep, 5 per Glob). This is a direct contributor to the
fork-storm that repeatedly blocked this fleet (460-695 live bash.exe vs 400
ceiling) -- the operator's named efficiency target.

grep-glob-bundle.mjs folds the three advisory matcher blocks (Glob|Grep, Grep,
Glob) into ONE bundled invocation, dispatched on tool_name, mirroring india's
bash-bundle consolidation (complementary -- india owns bash-bundle, this is the
unclaimed Grep/Glob leg). Bundled hooks mirror the EXACT prior wiring (verified
on disk 2026-06-14): Grep = search-optimizer + grep-index-first + viz-first-
redirect + pre-grep-graph-inject + pre-tool-savings-multi; Glob = same common 3 +
glob-narrow-path + pre-tool-savings-multi. All advisory + fail-open, so a bundle
defect degrades to lost-advisory, never a broken Grep/Glob.

Result: Grep/Glob specific PreToolUse spawns 5 -> 1 each, fleet-wide. Verified:
bundle node --check clean; Grep + Glob payloads -> {continue:true} (+ context for
Grep); a LIVE Grep routed through the bundle returned correctly; both C:/ and H:/
settings.json wired + valid JSON (idempotent content-matched patcher, --dry/
--revert, backups). settings.json is user-global config (not in repo); committed
files are the bundle + the patcher.

CHANGE-3 (duplicate pre-bash-graph-inject) was already done by india today.
CHANGE-1 (absorb 5 loose Read advisories into read-bundle) remains open.
```

## Files touched (3)
- .claude/hooks/bundles/grep-glob-bundle.mjs | 57 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/wire-grep-glob-bundle-settings.mjs | 74 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 131 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9b20d92efcda`
- Milestone envelope: `mcp-server/data/milestones/FORK-STORM-CONSOLIDATION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._