---
type: "chat-session"
source: "claude-code-cli"
session_id: "32a39c0c-ec85-4b35-bb0c-265f75d8b968"
title: "Review a Python aggregation script for correctness. Read the WHOLE file end-to-e"
date: "2026-05-16"
first_ts: "2026-05-16T13:19:03.614Z"
last_ts: "2026-05-16T13:19:47.441Z"
cwd: "H:\\prism\\Docustrata\\.index"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-ad45db53aceb3a275.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Review a Python aggregation script for correctness. Read the WHOLE file end-to-e

> **claude-code-cli** | 2026-05-16 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism\Docustrata\.index
> Raw: `H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-ad45db53aceb3a275.jsonl`

## Transcript

### User | 2026-05-16T13:19:03.614Z

Review a Python aggregation script for correctness. Read the WHOLE file end-to-end: `H:\prism\Docustrata\.index\phase23-customer-folder-match.py` (~330 lines).

CONTEXT: PRISM's Docustrata pipeline. The print<->program matching ALREADY exists, part-number-keyed. This script is a ROLLUP that aggregates it BY customer folder — it does NOT re-match. Inputs (all read-only):
- `jm-die-full-program-index.json` (or `-v2.json`) — top-level key `labels` is a list of 34,786 file records `{filePath, fileName, customer, machineCategory, kind ("cad"|"program"), ext, sizeBytes, topFolder}`.
- `blueprint-program-join-full-v6.jsonl` — 73,876 lines, each `{part_number, part_number_normalized, blueprints:[{doc_id,page_index,filename,drawing_score}], programs:[{source_path,filename,customer,machineCategory,ext,kind}], match_confidence, n_programs}`.
- `part-library-layout.json` — `customerResolution` with `aliases` (list of `{canonical, variants:[...]}`), `noisePrefixes` (list of strings), `noiseRegexes` (list of regex strings).

The script builds a canonicalizer (variant->canonical dict; a customer string is `_NOISE` if it startswith any noise prefix or matches a noise regex; else verbatim-uppercased), buckets every program-index file under its canonical customer, then streams the join attributing each blueprint to the canonical customer(s) of the programs its part number matched. Output: `phase23-customer-folder-index.json` + a `.md` summary.

A live dry-run reported: 383 alias variants, 232 real customer folders (66 alias-resolved), 15,358 programs + 7,917 CAD + 11,511 noise (15358+7917+11511 = 34,786 ✓), 52,453 blueprint attributions, 0 bad lines.

VERIFY:
1. Canonicalization correctness: `canonicalize()` order (alias check before noise check — critical, so a real customer that happens to start with a short noise prefix like "BORE" is still caught as an alias first if it IS one); the memo cache; empty/non-string `customer` handling.
2. The arithmetic: does every program-index file
... [+988 chars truncated]

### Assistant | 2026-05-16T13:19:10.323Z

I'll read the entire file and verify it against the requirements.

### Assistant | 2026-05-16T13:19:10.442Z

[tool_use: Read]

### User | 2026-05-16T13:19:13.944Z

[tool_result] 1	#!/usr/bin/env python3
2	"""
3	phase23-customer-folder-match.py — roll the print<->program/CAD join up BY
4	customer folder.
5	
6	WHY THIS EXISTS:
7	  The matching already exists but is PART-NUMBER-keyed:
8	    - phase16 produced `blueprint-program-join-full-v6.jsonl` — 73,876 records,
9	      one per normalized part number: {part_number, blueprints[], programs[],
10	      match_confidence}.
11	
... [+16874 chars truncated]

### Assistant | 2026-05-16T13:19:47.441Z

I have read the entire file. Let me verify each requirement carefully.

## Code Quality Analysis Report

### 1. Canonicalization correctness — `canonicalize()` lines 122-137

**Order is correct.** The if/elif chain at lines 126-135 evaluates: `empty` → `alias` (line 128) → `noise_prefix` (line 130) → `noise_regex` (line 132) → `verbatim` (line 135). The alias check at line 128 fires **before** the noise-prefix check at line 130, so a real customer whose name happens to start with a short noise prefix is correctly caught as an alias if it IS one. The reverse-length sort of `noise_prefixes` (line 110-112, `key=len, reverse=True`) is cosmetic given `any()` is order-insensitive — but it's harmless.

**Memo cache is correct** (lines 120, 124-125, 136). Keyed on the normalized `key`, returns the cached tuple on hit, stores before return. Note: the cache key is the *normalized* string, so two raw inputs `" fastenal "` and `"FASTENAL"` correctly collapse to one entry.

**Empty/non-string handling is correct** (line 123). `(raw or "").strip().upper() if isinstance(raw, str) else ""` — a non-string (None, int, dict) becomes `""`, falsy raw becomes `""`, and line 127 maps `""` → `("_UNKNOWN", "empty")`. No crash path.

### 2. Arithmetic — every program-index file lands in exactly one bucket

**Structurally guaranteed.** Per `rec` in the loop (lines 165-190): `canon()` always returns a name. Lines 167-172: if `name in NON_CUSTOMER` → tallied into `noise` and `continue`. Otherwise lines 173-190 bucket it into exactly one customer via `setdefault`, and within that, the `is_cad` branch (lines 183-190) puts it in **exactly one** of `cad` or `programs`. No `continue` is skipped, no record is dropped, no double-count. The dry-run `15358 + 7917 + 11511 = 34786` is structurally backed.

One subtlety worth noting (not a bug): `noise["empty"]` counts `_UNKNOWN` files (kind `"empty"`), but `noise_samples` deliberately skips them (line 170, `kind != "empty"`). `totals` (lines 292-293) repo
... [+3920 chars truncated]
