# DOC-DRIFT/U-S1-CASCADE-DESCRIBE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DOC-DRIFT]/U-S1-CASCADE-DESCRIBE: align two_pass/cascade .describe() model defaults to Blackwell runtime

**Commit:** `f9c36c37076b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T18:13:57-05:00
**Tags:** doc-drift, u-s1-cascade-describe, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DOC-DRIFT]/U-S1-CASCADE-DESCRIBE: align two_pass/cascade .describe() model defaults to Blackwell runtime

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DOC-DRIFT]/U-S1-CASCADE-DESCRIBE: align two_pass/cascade .describe() model defaults to Blackwell runtime

The aiReasoningDispatcher runtime fallbacks were already migrated to the
installed Blackwell roster on 2026-06-04 (U-BW-RESEARCH-REFINE):
- two_pass:  cheap qwen2.5-coder:1.5b / strong qwen2.5-coder:32b
- cascade:   cheap 1.5b / mid gpt-oss:20b / strong qwen2.5-coder:32b
but the schema .describe() text still advertised the RETIRED :3b/:7b/:14b
tags (uninstalled on this host). A caller reading the MCP tool description
would set an env override to a model that 404s on /api/generate.

Doc-only fix: 5 .describe() strings aligned to the canonical runtime
(aiReasoningDispatcher.ts:3180-3256). No runtime change. Verified 0 stale
tags remain in the schema. DOC-DRIFT campaign slice S1.
```

## Files touched (2)
- mcp-server/src/schemas/aiReasoningActionSchemas.ts | 12 +++++++-----
- 1 file changed, 7 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- till advertised the RETIRED :3b/:7b/:14b

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f9c36c37076b`
- Milestone envelope: `mcp-server/data/milestones/DOC-DRIFT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._