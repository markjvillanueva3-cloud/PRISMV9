# HOOKS-REGISTRY-HEALTH/U-AAM04-FIX3 — [MAIN] [HOOKS-REGISTRY-HEALTH]/U-AAM04-FIX3: remove 2 dead+redundant ${HOOK_BASE}/ bundle refs (scope-mismatch close-out)

**Commit:** `f8c9c7a8673b` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T22:20:35-05:00
**Tags:** hooks-registry-health, u-aam04-fix3, auto-distilled

## Subject
[MAIN] [HOOKS-REGISTRY-HEALTH]/U-AAM04-FIX3: remove 2 dead+redundant ${HOOK_BASE}/ bundle refs (scope-mismatch close-out)

## Body
```
[MAIN] [HOOKS-REGISTRY-HEALTH]/U-AAM04-FIX3: remove 2 dead+redundant ${HOOK_BASE}/ bundle refs (scope-mismatch close-out)

Closes task #15 (the 2 real scope-mismatches AAM04 surfaced after FIX1).

INVESTIGATION: posttool-edit-bundle.mjs:46-47 referenced
`${HOOK_BASE}/build-cache-manager.mjs` + `${HOOK_BASE}/build-tracker.mjs`
(= .claude/hooks/, where neither file exists). Both ARE legitimate PostToolUse
hooks (stdin readers; build-tracker's own header says "PostToolUse hook for
Write|Edit|MultiEdit") but they live in .claude/helpers/. The bundle has NO
HELPER_BASE const so it cannot reference helpers/ — and crucially, BOTH hooks
are ALREADY wired correctly in H:/prism/.claude/settings.json:999,1004 via the
literal helpers/ path. So the bundle refs were dead (ENOENT at runtime) AND
redundant double-wires.

FIX: removed the 2 dead bundle entries, replaced with a comment documenting
why they're intentionally absent (prevents a future reader re-adding broken
${HOOK_BASE}/ refs). Surgical — no HELPER_BASE infra added (YAGNI), no file
moves (the hooks already fire from settings.json where they are).

VERIFICATION:
- node --check posttool-edit-bundle.mjs → syntax OK
- harness-wiring-audit dangling 8 → 6 (build-cache-manager + build-tracker
  gone; remaining 6 are the documented helper-scope-blindness false-positives,
  not real bugs — see CLAUDE.md Recent regressions 2026-05-16 AAM04 entry)
- grep settings.json:999,1004 → both hooks STILL wired via helpers/ path
  (verified the PROJECT layer H:/prism/.claude/settings.json, not the C: user
  layer — they were never in the user layer)
- build-cache-manager + build-tracker continue firing unchanged

Karpathy: R3 surgical (delete dead refs, no new infra), R8 read-before-write
(traced full reference surface across 3 settings layers + bundle + migrate
script before deciding), R12 fail-loud (caught + corrected my own verification
grepping the wrong settings layer before claiming "still fires").

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- .claude/hooks/bundles/posttool-edit-bundle.mjs | 7 +++++--
- 1 file changed, 5 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- TILL wired via helpers/ path
- wrong settings layer before claiming "still fires").

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f8c9c7a8673b`
- Milestone envelope: `mcp-server/data/milestones/HOOKS-REGISTRY-HEALTH.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._