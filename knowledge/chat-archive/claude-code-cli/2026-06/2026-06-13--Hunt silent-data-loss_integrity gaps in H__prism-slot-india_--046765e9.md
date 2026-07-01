---
type: "chat-session"
source: "claude-code-cli"
session_id: "046765e9-1878-49aa-b195-de74c14c3930"
title: "Hunt silent-data-loss/integrity gaps in H:/prism-slot-india/scripts/extract-vide"
date: "2026-06-13"
first_ts: "2026-06-13T14:30:42.200Z"
last_ts: "2026-06-13T14:31:33.072Z"
cwd: "H:\\prism-slot-india"
messages: 4
user_msgs: 2
assistant_msgs: 2
raw_file: "H:/.claude/projects/H--prism-slot-india/046765e9-1878-49aa-b195-de74c14c3930/subagents/agent-af5d025ccfc6530ce.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:56"
---

# Hunt silent-data-loss/integrity gaps in H:/prism-slot-india/scripts/extract-vide

> **claude-code-cli** | 2026-06-13 | 4 msgs (2 user / 2 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/046765e9-1878-49aa-b195-de74c14c3930/subagents/agent-af5d025ccfc6530ce.jsonl`

## Transcript

### User | 2026-06-13T14:30:42.200Z

Hunt silent-data-loss/integrity gaps in H:/prism-slot-india/scripts/extract-video-captions.py (parses .vtt/.srt -> corpus JSONL chunks). Hard cap ~5 tool calls.

Prime suspects:
1. parse_cues: could caption text be silently dropped? e.g. a cue text line that appears BEFORE the first timestamp (cur_start is None -> dropped) -- is that correct or a loss? A multi-line cue where the 2nd line is a digit (mistaken for an SRT index)? Lines containing '-->' inside actual caption text?
2. merge_cues dedup: `if t == last_line: continue` -- does this wrongly drop legitimately-repeated content (e.g. a professor repeating a phrase across non-adjacent cues vs adjacent rolling-caption dupes)? Only adjacent dupes should drop.
3. The trailing-chunk guard `if buf and size >= MIN_CHUNK_CHARS` -- does a final substantive chunk between MIN and CHUNK_CHARS get emitted, or silently lost if exactly at a boundary?
4. id collision: same caption basename in two course dirs -> path-hash distinct? confirm.
5. notability_floor: could it silently drop a whole short-but-valuable caption file to 0 entries with no failed/empty signal?

Report each with line number + severity + minimal fix. PASS/FAIL. Under 300 words.

### Assistant | 2026-06-13T14:30:48.880Z

[tool_use: Read]

### User | 2026-06-13T14:30:56.450Z

[tool_result] 1	#!/usr/bin/env python
2	"""
3	extract-video-captions.py -- local video-learn via existing .vtt/.srt sidecars.
4	
5	The video-learn half of AI-SYSTEMS-MAXOUT, done GPU-free: parses caption
6	sidecars (no download, no Whisper, no API) into the SAME corpus-page schema as
7	extract-corpus-pages.py, so transcript knowledge flows through the identical
8	embed-corpus-into-qdrant.mjs -> prism_corpus RAG
... [+11484 chars truncated]

### Assistant | 2026-06-13T14:31:33.072Z

**VERDICT: FAIL — 4 confirmed data-loss bugs, 1 confirmed integrity gap**

---

**BUG 1 — CRITICAL: Repeated legitimate phrase silently dropped (line 128)**

`if t == last_line: continue` compares the entire merged cue text, not adjacent lines. But `last_line` is updated on every non-duplicate, so this IS adjacent-only. However, the comparison is against the full joined text of a cue (`" ".join(cur_text)` at line 104). A cue with two text lines produces a single merged string. A subsequent cue with identical content is dropped. This is correct for rolling captions.

**Actual CRITICAL issue:** `last_line` is never reset between caption files. At line 253, `merge_cues(parse_cues(raw))` is called per file, but `merge_cues` receives a fresh `cues` list each time — `last_line` is local to `merge_cues`, so this is NOT a cross-file leak. This check passes.

**BUG 1 (REVISED) — HIGH: Pre-timestamp text silently dropped (line 112)**

Lines that appear before the first timestamp in a file (e.g., VTT metadata lines that are not `WEBVTT`, or a cue identifier line like `"intro"`) are silently dropped because `cur_start is None`. For SRT files, a numeric-only SRT index is correctly filtered at line 109 (`s.isdigit()`). However, a non-numeric cue identifier (e.g., `"id: v_00001"`) passes the `isdigit()` guard, `cur_start` is still `None`, so the line is silently dropped. Not a corpus loss — cue identifiers have no content value. PASS on this sub-case.

**BUG 2 — CRITICAL: Final chunk lost when size equals exactly MIN_CHUNK_CHARS boundary (line 139)**

`if buf and size >= MIN_CHUNK_CHARS` — this emits the trailing chunk only if accumulated size (counting `+1` per cue for the space) is at least 80 chars. A trailing chunk of 79 chars is silently dropped with zero signal. This is the documented guard for noise, so the behavior is intentional. However there is no log/counter increment for this case — `skipped_low` only counts notability failures, not MIN_CHUNK_CHARS drops. A 79-char tr
... [+2918 chars truncated]
