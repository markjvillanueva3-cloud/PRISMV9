# Recall Fire Telemetry (slot:alpha)

**Verdict:** HEALTHY · transcripts scanned: 11 · generated: (run via Stop/cron; mtime authoritative)

Production-truth fire counts for the recall layer ("retrieval at point of need"). A DEAD row = the brain is write-only on that channel. Method: emit-signature grep over recent transcripts (CLI hook repro is unreliable on Windows).

| Injector | Event | Fires | Floor | Status |
|----------|-------|------:|------:|:------:|
| Memory-vault pre-search | UserPromptSubmit | 75 | 5 | ✅ ok |
| Wiki precheck | UserPromptSubmit (cag fan-out) | 201 | 5 | ✅ ok |
| Master-index / pre-grep graph | UserPromptSubmit | 145 | 3 | ✅ ok |
| Memory recall (per-edit) | PreToolUse Edit/Write | 189 | 1 | ✅ ok |
| Tribal-by-domain | UserPromptSubmit | 33 | — | ✅ ok |
| Obsidian vault precheck | UserPromptSubmit | 22 | — | ✅ ok |
| CAG route | UserPromptSubmit | 168 | 3 | ✅ ok |


_Caveat: counts emoji-anchored emit-signatures in transcripts — a session that itself DISCUSSES these headers (e.g. recall-debugging) over-counts. Read against a normal work session for a clean signal._
_Source: `scripts/recall-fire-telemetry.mjs`. Consumption (was a resurfaced memory USED?) is a deeper follow-up; this measures FIRING, the prerequisite. Owner: slot:alpha._