# HOOKS-AUTOMATION-V2/P0 — [HOOKS-AUTOMATION-V2]/P0.3-B-followup: harden fileSuffix() — reject command strings

**Commit:** `48f32a5c0c0f` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T23:28:32-05:00
**Tags:** hooks-automation-v2, p0, auto-distilled

## Subject
[HOOKS-AUTOMATION-V2]/P0.3-B-followup: harden fileSuffix() — reject command strings

## Body
```
[HOOKS-AUTOMATION-V2]/P0.3-B-followup: harden fileSuffix() — reject command strings

Root cause behind P0.3-B: capture hooks pass Bash command strings to
fileSuffix() (Bash events have no file), so it emitted polluted "suffixes"
like "ts 2>&1 | tail -80" — fragmenting error-pattern grouping. Hardened at
the boundary: if the basename carries shell metacharacters/whitespace it is
not a real filename → return "". Fixes the whole caller class (every
current + future fileSuffix caller), not one instance. Verified by direct
execution: real paths keep extensions (x.ts→ts, foo.test.ts→test.ts, even
a spaced-parent-dir path), all 3 command-string pollution cases → "".
Added a vitest it-block to the existing fileSuffix describe; the helpers/
vitest runner has a known pre-existing config bug (can't discover
.claude/helpers/ tests) so the case is verified by direct node execution.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- .claude/helpers/error-learn-store.mjs      |  7 ++++++-
- .claude/helpers/error-learn-store.test.mjs | 13 +++++++++++++
- 2 files changed, 19 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 48f32a5c0c0f`
- Milestone envelope: `mcp-server/data/milestones/HOOKS-AUTOMATION-V2.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._