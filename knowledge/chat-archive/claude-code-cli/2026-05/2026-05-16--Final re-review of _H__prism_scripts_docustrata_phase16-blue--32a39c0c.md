---
type: "chat-session"
source: "claude-code-cli"
session_id: "32a39c0c-ec85-4b35-bb0c-265f75d8b968"
title: "Final re-review of `H:/prism/scripts/docustrata/phase16-blueprint-program-join-v"
date: "2026-05-16"
first_ts: "2026-05-16T19:20:12.357Z"
last_ts: "2026-05-16T19:20:41.080Z"
cwd: "H:\\prism\\Docustrata\\.index"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-af157b68c935fd7d8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Final re-review of `H:/prism/scripts/docustrata/phase16-blueprint-program-join-v

> **claude-code-cli** | 2026-05-16 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism\Docustrata\.index
> Raw: `H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-af157b68c935fd7d8.jsonl`

## Transcript

### User | 2026-05-16T19:20:12.357Z

Final re-review of `H:/prism/scripts/docustrata/phase16-blueprint-program-join-v6.py` — read it end-to-end.

This join script was changed to opportunistically consume an optional vision-LLM OCR file (`phase9-unified-pages.jsonl`) to augment a Tesseract-based blueprint↔part-number join. Two prior review rounds flagged issues; all are now claimed fixed. The LATEST fix (this round): the `_vlm_key()` helper's page_index coercion — previously `if isinstance(pi,str) and pi.lstrip("-").isdigit(): pi = int(pi)` which could still raise an uncaught `ValueError` on `"--3"` or unicode-digit superscripts — is now a guarded `try: pi = int(pi) except ValueError: return None`.

VERIFY:
1. `_vlm_key` is now fully crash-safe for ALL input classes (unhashable doc_id/page_index, non-scalar, bool, malformed numeric strings, unicode) — returning None (page skipped) in every bad case, never raising.
2. `_vlm_pn_ok` correctly gates VLM part numbers (len 4-24, no whitespace, ≥1 digit, garbage_class) without rejecting legitimate part numbers.
3. The join is behaviorally identical when `phase9-unified-pages.jsonl` is absent.
4. The `(agg, vlm_stats)` return contract, the `n_vlm_pn`/`n_vlm_cust` counters, and the summary output are all consistent.
5. Any remaining P0/P1 in the changed code (the helpers + `load_vlm_page_fields` + `collect_blueprints` + `main`).

Report any P0/P1 with line numbers, then end with exactly `VERDICT: PASS` or `VERDICT: FAIL`.

### Assistant | 2026-05-16T19:20:15.622Z

I'll read the file end-to-end and verify each point.

### Assistant | 2026-05-16T19:20:15.701Z

[tool_use: Read]

### User | 2026-05-16T19:20:17.322Z

[tool_result] 1	"""
2	Phase 16 — Blueprint <-> Program/CAD join v6
3	
4	v6 = v5's proven join logic, re-pointed at the CLEANED, COMPLETE inputs:
5	  - v5 ran 2026-05-12 against a still-running phase-15 (673 huge PDFs deferred) and
6	    the RAW per-page part_numbers (which leak dates / phones / dimension callouts).
7	  - v6 reads `phase20-verified-prints.jsonl` — the consolidated verified-prints
8	    index bui
... [+27485 chars truncated]

### Assistant | 2026-05-16T19:20:41.080Z

I've read the file end-to-end. Verifying each point against the changed code.

## Verification

### 1. `_vlm_key` crash-safety (lines 256-275)

Walking every input class for `doc_id` and `page_index`:

- **`doc_id` unhashable (list/dict)** — line 263: `isinstance(doc_id, (str, int))` is False → `return None`. SAFE.
- **`doc_id` bool** — line 263: `isinstance(doc_id, bool)` is True → `return None`. (Caught explicitly because `bool` is a subclass of `int` and would otherwise slip through.) SAFE.
- **`doc_id` None/float** — not `(str, int)` → `return None`. SAFE.
- **`page_index` bool** — line 267-268 → `return None`. SAFE.
- **`page_index` str, malformed (`"--3"`, `"5.0"`, unicode superscript `"\u00b2"`, `""`, `"abc"`)** — line 269-272: `int(pi)` raises `ValueError` → caught → `return None`. SAFE. (`"\u00b2"` is a digit per `str.isdigit()` but `int()` rejects it with `ValueError` — confirmed: `int("\u00b2")` raises `ValueError`. The old `.isdigit()` guard would have *passed* it through to `int()` and crashed; the new `try/except` catches it.)
- **`page_index` str valid (`"5"`, `"-3"`, `" 5 "`)** — `int()` succeeds. SAFE and correct.
- **`page_index` int** — line 273 `elif not isinstance(pi, int)` is False → falls through to `return (doc_id, pi)`. SAFE.
- **`page_index` None/float/list/dict** — line 273: not int → `return None`. SAFE.

One edge worth noting, **not a defect**: `int()` can raise `TypeError` for some argument types, but here `pi` is already confirmed `str` before the `int()` call (line 269 guard), and `int(str)` only ever raises `ValueError`, never `TypeError`. The narrow `except ValueError` is correct and complete for this code path.

`_vlm_key` is fully crash-safe for all input classes — every bad case returns `None`, never raises.

### 2. `_vlm_pn_ok` gating (lines 278-293)

- Length 4-24 (line 286) — rejects too-short OCR fragments and long hallucinated phrases.
- `any(c.isspace())` (line 288) — rejects `"SEE NOTE 4"`, `"PART NO. 12345"`, `"DETAIL A"`
... [+2339 chars truncated]
