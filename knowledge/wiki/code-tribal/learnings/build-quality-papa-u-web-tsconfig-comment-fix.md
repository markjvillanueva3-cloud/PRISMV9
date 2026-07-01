# BUILD-QUALITY-PAPA/U-WEB-TSCONFIG-COMMENT-FIX — [MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-WEB-TSCONFIG-COMMENT-FIX (slot:papa): fix web/tsconfig.json TS5023 -- malformed key-value comment (7->6 web tsc)

**Commit:** `4faad6b64c27` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T10:37:21-05:00
**Tags:** build-quality-papa, u-web-tsconfig-comment-fix, auto-distilled

## Subject
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-WEB-TSCONFIG-COMMENT-FIX (slot:papa): fix web/tsconfig.json TS5023 -- malformed key-value comment (7->6 web tsc)

## Body
```
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-WEB-TSCONFIG-COMMENT-FIX (slot:papa): fix web/tsconfig.json TS5023 -- malformed key-value comment (7->6 web tsc)

The noUnusedLocals/noUnusedParameters rationale (golf, 2026-05-26) was embedded
as a JSON key-value "// ...": "...", which tsc parses as an unknown compiler
option (TS5023). Converted to a real JSONC // line comment -- SAME decision
(noUnusedLocals:false preserved), valid syntax. Build-config hygiene = papa lane.
web tsc 7->6; vite build (esbuild) was already green. Remaining 6 are frontend
feature code (5 LessonView content-type TS2367 + 1 performance.ts window-never)
-> surfaced to quebec/lima for the frontend-focus pass.
```

## Files touched (2)
- mcp-server/web/tsconfig.json | 9 ++++++++-
- 1 file changed, 8 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- LessonView content-type TS2367 + 1 performance.ts window-never)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4faad6b64c27`
- Milestone envelope: `mcp-server/data/milestones/BUILD-QUALITY-PAPA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._