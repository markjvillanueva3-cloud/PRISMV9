---
type: "chat-session"
source: "claude-code-cli"
session_id: "046765e9-1878-49aa-b195-de74c14c3930"
title: "Hunt for SILENT DATA LOSS / silent failures in H:/prism/scripts/extract-corpus-p"
date: "2026-06-13"
first_ts: "2026-06-13T06:56:19.940Z"
last_ts: "2026-06-13T06:57:27.241Z"
cwd: "H:\\prism-slot-india"
messages: 8
user_msgs: 4
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism-slot-india/046765e9-1878-49aa-b195-de74c14c3930/subagents/agent-a590b5151c372d1c9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:56"
---

# Hunt for SILENT DATA LOSS / silent failures in H:/prism/scripts/extract-corpus-p

> **claude-code-cli** | 2026-06-13 | 8 msgs (4 user / 4 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/046765e9-1878-49aa-b195-de74c14c3930/subagents/agent-a590b5151c372d1c9.jsonl`

## Transcript

### User | 2026-06-13T06:56:19.940Z

Hunt for SILENT DATA LOSS / silent failures in H:/prism/scripts/extract-corpus-pages.py (NEW local PDF page extractor that walks a directory RECURSIVELY and dedups entries by id). Read the whole file.

Prime suspect to confirm or refute: the entry id is `corpus-page-<slug>-p<NNNN>` where slug = slugify(FILENAME ONLY) at the emit step. Since walk_pdfs uses rglob (recursive), two different PDFs with the SAME basename in different subfolders (common in a resources/ tree of vendor catalogs) would produce IDENTICAL slugs -> identical ids -> the second PDF's pages get silently dropped as "duplicates". Verify this is a real bug, quantify the blast radius, and propose the minimal fix (e.g. fold a short hash of the relative path into the slug/id).

Also check for other silent-loss paths: torn-JSONL existing line silently skipped (acceptable?), empty extract_text() pages, a PDF that opens but yields 0 pages, the `--limit 0` / negative case, encoding errors on write.

Report each finding with line number + severity (P0/P1/P2) + minimal fix. Final PASS/FAIL. Under ~350 words.

### Assistant | 2026-06-13T06:56:24.934Z

[tool_use: Read]

### User | 2026-06-13T06:56:27.481Z

[tool_result] read-once-guard: 'H:\prism\scripts\extract-corpus-pages.py' was already read 7s ago in this session and is unchanged (mtime 1781333606447). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-13T06:56:29.720Z

[tool_use: Glob]

### User | 2026-06-13T06:56:51.371Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-13T06:56:53.245Z

[tool_use: Bash]

### User | 2026-06-13T06:57:00.961Z

[tool_result]      1	#!/usr/bin/env python
     2	"""
     3	extract-corpus-pages.py -- generalized, append-safe, local PDF page extractor.
     4	
     5	India-owned generalization of lima's `extract-jm-die-corpus-page-by-page.py`
     6	(reuses its proven page-level notability + provenance heuristics) with the three
     7	fixes that make it safe for fleet-wide corpus ingestion:
     8	
     9	  1. Directory-
... [+14959 chars truncated]

### Assistant | 2026-06-13T06:57:27.241Z

Here is the full analysis of `H:/prism/scripts/extract-corpus-pages.py`.

---

**P0 — CONFIRMED: Basename-only slug causes silent dedup collision for same-named PDFs in different subdirs**

Location: `slugify()` line 118-122, consumed at line 212 and line 219 in `emit_entries()`.

`walk_pdfs()` uses `rglob` (line 140) so it surfaces `resources/VENDOR-A/catalog.pdf` and `resources/VENDOR-B/catalog.pdf`. Both produce `slug = "catalog"`, both produce ids like `corpus-page-catalog-p0001`. When the second PDF is processed, every one of its pages is already in `seen_ids` (added by the first PDF at line 223) and falls through the `skipped_dup` branch at lines 220-222 — silently dropped. The counter increments but nothing in the output distinguishes "true re-run duplicate" from "basename collision first-run drop." In a deep vendor-catalog tree this is not a corner case; it is the common case.

Minimal fix: fold a short hash of the relative path into the slug. In `emit_entries`, replace line 212:

```python
slug = slugify(item["filename"])
```

with:

```python
import hashlib
rel = str(item["path"].relative_to(input_dir)) if "input_dir" in item else item["filename"]
path_hash = hashlib.sha1(rel.encode()).hexdigest()[:6]
slug = f"{slugify(item['filename'])}-{path_hash}"
```

This requires threading `input_dir` into `emit_entries` (add it as a parameter). The change is backward-compatible for single-directory inputs where paths are unique anyway.

---

**P1 — Zero-page PDF yields 0 entries with no log line**

Location: `extract_pdf_pages()` line 188-190. When `total = 0`, `range(0)` produces no iterations, returns `[]`. Back in `main()` line 299, `pages` is falsy so `pages[0]` is never reached — the PDF is silently counted as processed with 0 pages, no failure increment. A zero-page PDF that opened successfully is not an error sentinel, so it is never logged as failed and never produces entries.

Minimal fix: after line 186 (`capped = ...`), add:

```python
if total == 0:
    
... [+1896 chars truncated]
