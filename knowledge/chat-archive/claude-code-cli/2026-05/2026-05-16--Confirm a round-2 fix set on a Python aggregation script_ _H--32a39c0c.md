---
type: "chat-session"
source: "claude-code-cli"
session_id: "32a39c0c-ec85-4b35-bb0c-265f75d8b968"
title: "Confirm a round-2 fix set on a Python aggregation script: `H:\\prism\\Docustrata\\."
date: "2026-05-16"
first_ts: "2026-05-16T13:29:59.460Z"
last_ts: "2026-05-16T13:30:38.300Z"
cwd: "H:\\prism\\Docustrata\\.index"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-a9365f17ce22af2f4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Confirm a round-2 fix set on a Python aggregation script: `H:\prism\Docustrata\.

> **claude-code-cli** | 2026-05-16 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism\Docustrata\.index
> Raw: `H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-a9365f17ce22af2f4.jsonl`

## Transcript

### User | 2026-05-16T13:29:59.460Z

Confirm a round-2 fix set on a Python aggregation script: `H:\prism\Docustrata\.index\phase23-customer-folder-match.py` (~380 lines). Read the WHOLE file.

This script rolls PRISM's part-number-keyed print<->program join up BY customer folder (inputs: `jm-die-full-program-index.json` 34,786 files; `blueprint-program-join-full-v6.jsonl` 73,876 records; `part-library-layout.json` customer alias map). A prior review returned FAIL with 2 P0s + 3 P1s. The author applied fixes — VERIFY each is correct and complete, and that the rewrite introduced no new bug.

1. P0 — a real customer "RING SCREW" was silently eaten because the noise prefix "RING" matched via `startswith`. CLAIMED FIX: noise prefixes are split into `noise_multi` (contains a space — matched by ordinary `startswith`) and `noise_single` (no space — matches ONLY by exact equality or a no-whitespace concatenation: `key.startswith(p) and " " not in key[len(p):]`). So "RING SCREW" (single-token prefix "RING", tail " SCREW" contains a space) is NOT noise and survives as a verbatim customer; "DRAWNDATE" (tail "DATE", no space) IS still noise. Verify the logic in `build_canonicalizer`/`canonicalize` is correct, the alias check still precedes noise, and trace: "RING"→noise, "RING SCREW"→verbatim customer, "DRAWNDATE"→noise, "CNC LATHE"(multi)→noise, "PURCHASE ORDER 5"(multi)→noise. A live dry-run now reports 241 customers (was 232).

2. P0 — the `.md` headline lumped exact/loose/ambiguous matches as one number. CLAIMED FIX: `load_join` now tallies `by_confidence` per blueprint-attribution; per-customer `match_confidence` dict + `matched_print_exact`; `totals.attributions_by_confidence`; the `.md` headline shows the split and the table has an `exact` column. Live dry-run: ambiguous:25360 / exact:7070 / loose:22037. Verify the tallies are per-blueprint (not per-record) and the .md is now honest.

3. P1 — same blueprint multi-counted across customers with no distinct counter. CLAIMED FIX: `totals.distinct_blueprints_attr
... [+1104 chars truncated]

### Assistant | 2026-05-16T13:30:07.579Z

I'll read the entire file and verify each claimed fix.

### Assistant | 2026-05-16T13:30:07.911Z

[tool_use: Read]

### User | 2026-05-16T13:30:08.774Z

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
... [+21563 chars truncated]

### Assistant | 2026-05-16T13:30:38.300Z

I have the full file. Let me verify each claimed fix and check for new bugs.

## Verification of the 5 claimed fixes

### P0 #1 — RING SCREW noise-prefix fix

Lines 125-129 split prefixes into `noise_multi` (has space) and `noise_single` (no space). Lines 147-153:

```python
elif any(key.startswith(p) for p in noise_multi):          # 147
    r = ("_NOISE", "noise_prefix")
elif any(key.startswith(p) and " " not in key[len(p):]     # 149-150
         for p in noise_single):
    r = ("_NOISE", "noise_prefix")
```

The alias check (line 145) precedes both noise checks — correct ordering preserved.

**Trace verification:**
- `"RING"` — single-token prefix `"RING"`. `key.startswith("RING")` True; `key[4:]` = `""`; `" " not in ""` True → noise. ✓
- `"RING SCREW"` — single prefix `"RING"`. `startswith("RING")` True; `key[4:]` = `" SCREW"`; `" " in " SCREW"` True → condition False → falls to verbatim customer. ✓
- `"DRAWNDATE"` — single prefix `"DRAWN"`. `startswith("DRAWN")` True; `key[5:]` = `"DATE"`; `" " not in "DATE"` True → noise. ✓
- `"CNC LATHE"` — multi prefix `"CNC LATHE"`. `startswith` True → noise via line 147. ✓
- `"PURCHASE ORDER 5"` — multi prefix `"PURCHASE ORDER"`. `startswith` True → noise via line 147. ✓

**Slice check `key[len(p):]`:** `key.startswith(p)` guarantees `len(key) >= len(p)`, so the slice is the exact tail after the prefix — no off-by-one. When `key == p` exactly, slice is `""`, `" " not in ""` is True → exact match still classified noise. Correct. **PASS.**

One subtle edge: a single-token prefix can still eat a no-space concatenation that is itself a real customer (e.g. hypothetical `"RINGSCREW"` one word). That is inherent to the "concatenation" rule the spec explicitly requested ("DRAWNDATE" must stay noise), so it is by-design, not a bug.

### P0 #2 — confidence split honesty

`load_join` tallies `stats["by_confidence"]` (line 275-276) and `c["_print_conf"]` (line 271) **inside the `for bp in blueprints` loop, after the dedup `continue` 
... [+3183 chars truncated]
