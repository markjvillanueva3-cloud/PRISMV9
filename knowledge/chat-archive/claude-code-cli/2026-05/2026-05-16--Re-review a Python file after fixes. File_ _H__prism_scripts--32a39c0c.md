---
type: "chat-session"
source: "claude-code-cli"
session_id: "32a39c0c-ec85-4b35-bb0c-265f75d8b968"
title: "Re-review a Python file after fixes. File: `H:/prism/scripts/docustrata/phase16-"
date: "2026-05-16"
first_ts: "2026-05-16T19:17:44.418Z"
last_ts: "2026-05-16T19:18:12.082Z"
cwd: "H:\\prism\\Docustrata\\.index"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-abb7251c27217ae3b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Re-review a Python file after fixes. File: `H:/prism/scripts/docustrata/phase16-

> **claude-code-cli** | 2026-05-16 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism\Docustrata\.index
> Raw: `H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-abb7251c27217ae3b.jsonl`

## Transcript

### User | 2026-05-16T19:17:44.418Z

Re-review a Python file after fixes. File: `H:/prism/scripts/docustrata/phase16-blueprint-program-join-v6.py` — read it end-to-end.

This is a document-pipeline join script. A prior review of a change (which opportunistically consumes an optional vision-LLM OCR file `phase9-unified-pages.jsonl` to augment a Tesseract-based blueprint↔program join) raised TWO P1 issues. The fixes just applied:

FIX 1 (was: crash on unhashable doc_id/page_index + silent str-vs-int key mismatch between the two producer files). A new helper `_vlm_key(doc_id, page_index)` now builds the map key: returns `None` (caller skips the page) when doc_id/page_index aren't scalar str/int, rejects bool, and coerces an int-valued string page_index to int so phase-9 and phase-20 agree on key type. Used in both `load_vlm_page_fields()` and `collect_blueprints()`.

FIX 2 (was: VLM part numbers got only the weak `garbage_class` filter, letting hallucinated phrases like 'SEE NOTE 4' create standalone miss records). A new helper `_vlm_pn_ok(raw_pn)` requires len 4-24, no whitespace, ≥1 digit, plus the existing `garbage_class(normalize_pn())` check. Also the VLM-customer counter `n_vlm_cust` is now incremented only when `vlm_cust and page_pns` (so it is not overcounted on a hypothetical PN-less page).

VERIFY:
1. Both P1 fixes are correctly and completely applied — `_vlm_key` used at every relevant site, `_vlm_pn_ok` replaces the old weak check, the counter fix is correct.
2. The fixes introduce NO new bug: `_vlm_key`'s int-coercion is sound; `_vlm_pn_ok`'s length/whitespace/digit gates don't reject legitimate part numbers; the `vlm_cust`/`n_vlm_cust` restructure is logically correct.
3. The join is still behaviorally identical when `phase9-unified-pages.jsonl` is absent (the normal case).
4. Any remaining P0/P1 anywhere in the changed code (the two helpers + `load_vlm_page_fields` + `collect_blueprints` + `main`).

Report concise P0/P1 findings with line numbers, then end with exactly `VERDICT: PASS` or `V
... [+14 chars truncated]

### Assistant | 2026-05-16T19:17:47.936Z

I'll read the file end-to-end and verify the two P1 fixes.

### Assistant | 2026-05-16T19:17:48.242Z

[tool_use: Read]

### User | 2026-05-16T19:17:49.277Z

[tool_result] 1	"""
2	Phase 16 — Blueprint <-> Program/CAD join v6
3	
4	v6 = v5's proven join logic, re-pointed at the CLEANED, COMPLETE inputs:
5	  - v5 ran 2026-05-12 against a still-running phase-15 (673 huge PDFs deferred) and
6	    the RAW per-page part_numbers (which leak dates / phones / dimension callouts).
7	  - v6 reads `phase20-verified-prints.jsonl` — the consolidated verified-prints
8	    index bui
... [+27317 chars truncated]

### Assistant | 2026-05-16T19:18:12.082Z

I've read the file end-to-end. Here is my verification of the two P1 fixes and a fresh scan of the changed code.

## FIX 1 — `_vlm_key` (unhashable/type-mismatch key)

**Correctly applied.** `_vlm_key` (lines 256-272) is defined and used at both relevant call sites:
- Line 319 — `load_vlm_page_fields()`: `k = _vlm_key(r.get("doc_id"), r.get("page_index"))`, with `if k is None: continue` guard.
- Line 371 — `collect_blueprints()`: `vlm = vlm_fields.get(_vlm_key(doc_id, pi)) if vlm_fields else None`.

The int-coercion is sound: `bool` is rejected first (line 263, 266) before the `isinstance(..., int)` checks, so `True`/`False` can't slip through as `1`/`0`. `pi.lstrip("-").isdigit()` correctly handles negatives and rejects `"+5"`, floats, empties. One subtle but **correct** consistency point: the producer (line 319) and consumer (line 371) both pass the raw values through the *same* `_vlm_key`, so even if phase-9 stored `page_index` as `"3"` and phase-20 as `3`, both normalize to `(doc_id, 3)` — the keys agree. No P0/P1 here.

## FIX 2 — `_vlm_pn_ok` + counter restructure

**Correctly applied.** `_vlm_pn_ok` (lines 275-290) replaces the weak check at the only VLM-PN admission site (line 381): `if vpn not in page_pns and _vlm_pn_ok(vpn)`. The old path that would have used bare `garbage_class` is gone. The gates are sound and don't reject legitimate PNs — JM Die PNs are contiguous alphanumeric tokens 4-24 chars with digits; `'SEE NOTE 4'` fails on whitespace, `'DETAIL A'` fails on no-digit. The `garbage_class(normalize_pn(s))` tail still catches dates/phones/years.

Counter fix (lines 386-387): `n_vlm_cust` is incremented only `if vlm_cust and page_pns`. This is **logically correct** — `page_ck` (which carries the VLM customer) only lands on a record via the `for pn in page_pns` loop at lines 397-398, so a PN-less page genuinely contributes zero customers. No overcount.

## Behavior when `phase9-unified-pages.jsonl` is absent

**Identical to v5.** `load_vlm_page_fields(
... [+1590 chars truncated]
