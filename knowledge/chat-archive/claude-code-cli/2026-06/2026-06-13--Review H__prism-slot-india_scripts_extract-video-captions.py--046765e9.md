---
type: "chat-session"
source: "claude-code-cli"
session_id: "046765e9-1878-49aa-b195-de74c14c3930"
title: "Review H:/prism-slot-india/scripts/extract-video-captions.py end-to-end (hard ca"
date: "2026-06-13"
first_ts: "2026-06-13T14:30:42.204Z"
last_ts: "2026-06-13T14:31:24.704Z"
cwd: "H:\\prism-slot-india"
messages: 4
user_msgs: 2
assistant_msgs: 2
raw_file: "H:/.claude/projects/H--prism-slot-india/046765e9-1878-49aa-b195-de74c14c3930/subagents/agent-ad58e1d58d92f57dc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:56"
---

# Review H:/prism-slot-india/scripts/extract-video-captions.py end-to-end (hard ca

> **claude-code-cli** | 2026-06-13 | 4 msgs (2 user / 2 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/046765e9-1878-49aa-b195-de74c14c3930/subagents/agent-ad58e1d58d92f57dc.jsonl`

## Transcript

### User | 2026-06-13T14:30:42.204Z

Review H:/prism-slot-india/scripts/extract-video-captions.py end-to-end (hard cap ~5 tool calls). It parses .vtt/.srt caption sidecars into the SAME corpus-page JSONL schema as extract-corpus-pages.py so the output flows through embed-corpus-into-qdrant.mjs unchanged.

Verify:
1. PARSE correctness: handles both WEBVTT (ms sep '.') and SRT (ms sep ',', numeric index lines); strips WEBVTT header, NOTE blocks, SRT indices, inline <tags>. Confirm TS_RE + parse_cues logic.
2. CHUNK merge: fragment cues merged to ~CHUNK_CHARS; consecutive duplicate lines (rolling captions) deduped; chunk keeps first-start/last-end timestamp; trailing tiny chunk dropped below MIN_CHUNK_CHARS.
3. APPEND-SAFE + id dedup: opens "a", dedups by id (load_existing_ids), id folds a path-hash so same-named caption files in different course dirs don't collide.
4. SCHEMA: emits `id` + `claim` (the two fields the embedder consumes) + provenance (source_video, ts span). advisory:true, extraction_method "caption-local".
5. ROBUST: one unreadable/empty/malformed caption file doesn't crash the run (counted as failed/skipped).

Report P0/P1/P2 with line numbers + PASS/FAIL. Under 300 words.

### Assistant | 2026-06-13T14:30:48.668Z

[tool_use: Read]

### User | 2026-06-13T14:30:56.382Z

[tool_result] 1	#!/usr/bin/env python
2	"""
3	extract-video-captions.py -- local video-learn via existing .vtt/.srt sidecars.
4	
5	The video-learn half of AI-SYSTEMS-MAXOUT, done GPU-free: parses caption
6	sidecars (no download, no Whisper, no API) into the SAME corpus-page schema as
7	extract-corpus-pages.py, so transcript knowledge flows through the identical
8	embed-corpus-into-qdrant.mjs -> prism_corpus RAG
... [+11484 chars truncated]

### Assistant | 2026-06-13T14:31:24.704Z

Reviewing `H:/prism-slot-india/scripts/extract-video-captions.py` (277 lines).

---

**PASS** - No P0 or P1 issues found. Two P2 observations below.

---

**1. PARSE correctness — PASS**

`TS_RE` (line 56) correctly handles both `.` (VTT) and `,` (SRT) millisecond separators via `[.,]`. `parse_cues` strips `WEBVTT` header, `NOTE`-prefix lines (line 109), SRT numeric index lines (`s.isdigit()`), and inline tags via `TAG_RE` (line 57). The cue-settings fields on the timestamp line itself are harmless — `TS_RE.search(line)` extracts only the two `HH:MM:SS` groups and ignores cue-settings that follow (e.g. `align:center`). First-cue flush guard (`cur_start and cur_text`, line 103) and identical post-loop flush (line 114) are symmetric. PASS.

**2. CHUNK merge — PASS**

`merge_cues` deduplicates by comparing full cue text against `last_line` (line 128-129), which correctly handles rolling auto-captions. `start` is pinned on first cue of a window (line 132), `end` is updated every iteration (line 133), so first-start/last-end is correct. Trailing chunk is dropped when `size < MIN_CHUNK_CHARS` (line 139). PASS.

**3. APPEND-SAFE + id dedup — PASS**

Opens in `"a"` mode (line 244). `load_existing_ids` reads every existing line with a graceful `json.JSONDecodeError` catch (line 155). The id `caption-{slug}-{path_hash}-c{idx:04d}` includes an 8-char SHA-1 of the relative path (line 178), so same-named files in different directories produce distinct hashes. PASS.

**4. SCHEMA — PASS**

Emits `id` and `claim` (lines 192, 199) as required by `embed-corpus-into-qdrant.mjs`. Provenance fields `source_video`, `ts_start`, `ts_end`, `source` are present. `advisory: True`, `extraction_method: "caption-local"`, `schemaVersion` all present. PASS.

**5. ROBUSTNESS — PASS**

`OSError` on `cap.read_text` is caught, increments `failed`, and continues (lines 248-251). Empty files produce zero cues, zero chunks, zero entries — no crash. Malformed lines without a timestamp are skipped by the `
... [+1003 chars truncated]
