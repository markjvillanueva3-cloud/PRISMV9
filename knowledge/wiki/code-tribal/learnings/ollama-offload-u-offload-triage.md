# OLLAMA-OFFLOAD/U-OFFLOAD-TRIAGE — [MAIN-FORCE] [OLLAMA-OFFLOAD]/U-OFFLOAD-TRIAGE (slot:india, operator full-reign): wire ask-ollama triage mode into the offloader as a new error_triage category

**Commit:** `a4ec24e6667a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T15:27:30-05:00
**Tags:** ollama-offload, u-offload-triage, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-OFFLOAD-TRIAGE (slot:india, operator full-reign): wire ask-ollama triage mode into the offloader as a new error_triage category

## Body
```
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-OFFLOAD-TRIAGE (slot:india, operator full-reign): wire ask-ollama triage mode into the offloader as a new error_triage category

Operator "find more ways to offload to ollama / do everything". The offloader had no category routing to ask-ollama's existing `triage` FILE_MODE (error/log analysis), so "triage/summarize the error log" tasks never auto-offloaded. Additive (fail-loud transform on zulu's hook, not claimed): new OFFLOADABLE pattern (narrow -- only explicit triage/summarize/read the (error) log/output/traceback; "fix the error" still KEEPs as operator_directive) + SAFE_AUTOEXEC error_triage->triage mapping. VERIFIED: "triage the error log at X" -> AUTO-OFFLOAD(error_triage); "fix the error in the engine" -> KEEP. 60/60 offloader tests pass (no regression). Pairs with feedback_adopt_ollama_offload_directives.
```

## Files touched (2)
- .claude/hooks/ollama-task-offloader.mjs | 4 ++++
- 1 file changed, 4 insertions(+)

## Lessons surfaced in commit body
- till KEEPs as operator_directive) + SAFE_AUTOEXEC error_triage->triage mapping. VERIFIED: "triage the error log at X" -> AUTO-OFFLOAD(error_triage); "fix the error in the engine" -> KEEP. 60/60 offloader tests pass (no regression). Pairs with feedback_adopt_ollama_offload_directives.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a4ec24e6667a`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._