# DOMAIN-KNOWLEDGE/U-PAPA-LORA-DISTILL-RESUMABLE — [MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-LORA-DISTILL-RESUMABLE (slot:papa): make the --distill LoRA regen reap-resumable -- per-entry streaming append + sibling .cursor.jsonl so the ~65-Ollama-call run survives the fleet-reaper kill (the OCR-loop burn class). New pure parseCursorDoneSet + partitionByResumeCursor; main() truncates on fresh run, skips cursor-done slugs on resume, raw path byte-identical. Data-first at-least-once (never silently drops a spec; assembler dedupes raw, distilled over-weight bounded). 26/26 tests (+6), live-validated: limit-2 fresh -> 2 streamed+cursor=2; limit-3 resume -> "2 done, 63 to process", appended 5 (7 total no clobber), all rows valid jsonl. 2-arm scrutiny PASS no P0/P1.

**Commit:** `c328f877f439` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T21:56:24-05:00
**Tags:** domain-knowledge, u-papa-lora-distill-resumable, auto-distilled

## Subject
[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-LORA-DISTILL-RESUMABLE (slot:papa): make the --distill LoRA regen reap-resumable -- per-entry streaming append + sibling .cursor.jsonl so the ~65-Ollama-call run survives the fleet-reaper kill (the OCR-loop burn class). New pure parseCursorDoneSet + partitionByResumeCursor; main() truncates on fresh run, skips cursor-done slugs on resume, raw path byte-identical. Data-first at-least-once (never silently drops a spec; assembler dedupes raw, distilled over-weight bounded). 26/26 tests (+6), live-validated: limit-2 fresh -> 2 streamed+cursor=2; limit-3 resume -> "2 done, 63 to process", appended 5 (7 total no clobber), all rows valid jsonl. 2-arm scrutiny PASS no P0/P1.

## Body
```
[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-LORA-DISTILL-RESUMABLE (slot:papa): make the --distill LoRA regen reap-resumable -- per-entry streaming append + sibling .cursor.jsonl so the ~65-Ollama-call run survives the fleet-reaper kill (the OCR-loop burn class). New pure parseCursorDoneSet + partitionByResumeCursor; main() truncates on fresh run, skips cursor-done slugs on resume, raw path byte-identical. Data-first at-least-once (never silently drops a spec; assembler dedupes raw, distilled over-weight bounded). 26/26 tests (+6), live-validated: limit-2 fresh -> 2 streamed+cursor=2; limit-3 resume -> "2 done, 63 to process", appended 5 (7 total no clobber), all rows valid jsonl. 2-arm scrutiny PASS no P0/P1.
```

## Files touched (3)
- scripts/domain-corpus-to-lora-dataset.mjs      | 71 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++----
- scripts/domain-corpus-to-lora-dataset.test.mjs | 66 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 133 insertions(+), 4 deletions(-)

## Lessons surfaced in commit body
- TILL-RESUMABLE (slot:papa): make the --distill LoRA regen reap-resumable -- per-entry streaming append + sibling .cursor.jsonl so the ~65-Ollama-call run survives the fleet-reaper kill (the OCR-loop burn class). New pure parseCursorDoneSet + partitionByResumeCursor; main() truncates on fresh run, skips cursor-done slugs on resume, raw path byte-identical. Data-first at-least-once (never silently drop
- tilled over-weight bounded). 26/26 tests (+6), live-validated: limit-2 fresh -> 2 streamed+cursor=2; limit-3 resume -> "2 done, 63 to process", appended 5 (7 total no clobber), all rows valid jsonl. 2-arm scrutiny PASS no P0/P1.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c328f877f439`
- Milestone envelope: `mcp-server/data/milestones/DOMAIN-KNOWLEDGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._