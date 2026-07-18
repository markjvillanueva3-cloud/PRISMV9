---
name: reference_post_ship_domain-knowledge-u-papa-lora-distill-resumable
description: Auto-distilled learnings from shipping DOMAIN-KNOWLEDGE/U-PAPA-LORA-DISTILL-RESUMABLE (commit c328f877f). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.838Z
aliases: reference_post_ship_domain-knowledge-u-papa-lora-distill-resumable
---


# DOMAIN-KNOWLEDGE/U-PAPA-LORA-DISTILL-RESUMABLE

[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-LORA-DISTILL-RESUMABLE (slot:papa): make the --distill LoRA regen reap-resumable -- per-entry streaming append + sibling .cursor.jsonl so the ~65-Ollama-call run survives the fleet-reaper kill (the OCR-loop burn class). New pure parseCursorDoneSet + partitionByResumeCursor; main() truncates on fresh run, skips cursor-done slugs on resume, raw path byte-identical. Data-first at-least-once (never silently drops a spec; assembler dedupes raw, distilled over-weight bounded). 26/26 tests (+6), live-validated: limit-2 fresh -> 2 streamed+cursor=2; limit-3 resume -> "2 done, 63 to process", appended 5 (7 total no clobber), all rows valid jsonl. 2-arm scrutiny PASS no P0/P1.

**Shipped:** 2026-06-24T21:56:24-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[domain-knowledge-u-papa-lora-distill-resumable]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._