---
type: "chat-session"
source: "claude-code-cli"
session_id: "c0895ba0-2690-4d76-aa1d-08b469017b9b"
title: "You previously reviewed a PRISM build (slot charlie) — the JM-corpus → Obsidian "
date: "2026-06-14"
first_ts: "2026-06-14T05:50:53.066Z"
last_ts: "2026-06-14T05:51:57.082Z"
cwd: "H:\\prism-slot-charlie"
messages: 18
user_msgs: 7
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism-slot-charlie/c0895ba0-2690-4d76-aa1d-08b469017b9b/subagents/agent-aa4e07a453c32f133.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:40"
---

# You previously reviewed a PRISM build (slot charlie) — the JM-corpus → Obsidian 

> **claude-code-cli** | 2026-06-14 | 18 msgs (7 user / 11 assistant) | cwd: H:\prism-slot-charlie
> Raw: `H:/.claude/projects/H--prism-slot-charlie/c0895ba0-2690-4d76-aa1d-08b469017b9b/subagents/agent-aa4e07a453c32f133.jsonl`

## Transcript

### User | 2026-06-14T05:50:53.066Z

You previously reviewed a PRISM build (slot charlie) — the JM-corpus → Obsidian per-customer recall notes — and returned FAIL with 4 data-quality/recall-poisoning findings. They have now been addressed. Re-review to confirm each is CLOSED + no new defect. Read:
1. `H:/prism/scripts/lib/jm-corpus-vault-lib.mjs`
2. `H:/prism/scripts/jm-corpus-to-vault.mjs`
3. `H:/prism/scripts/lib/jm-corpus-vault-lib.test.mjs` (11 tests, pass)
Spot-check the regenerated notes: `ls H:/prism/knowledge/jm-corpus/customers/ | wc -l` (now 394), and confirm NO fake-customer notes remain: `ls H:/prism/knowledge/jm-corpus/customers/address-*.md H:/prism/knowledge/jm-corpus/customers/shipto-*.md H:/prism/knowledge/jm-corpus/customers/this-drawing-*.md 2>/dev/null` (expect none). Read `H:/prism/knowledge/jm-corpus/INDEX.md` top-customers — confirm they're all real customers.

Your 4 findings + the fixes:
- **P0 form-label leak** ("ADDRESS" $1.06M, "SHIPTO", "THIS DRAWING IS THE PROPERTY OF…"): `isFormLabelCustomer` upgraded from exact-Set to exact-Set + `FORM_PHRASE_RE` word-boundary regex (ADDRESS|VENDOR|QUANTITY|DESCRIPTION|SHIP TO|BILL TO|PO BOX|ORDER DATE|LI NAME|LINE DESC|PROPERTY OF|REGULATORY|AUTHORITIES|THIS DRAWING|DRAWING IS). Live: form-label exclusions 45→426, fake "ADDRESS"/"ADDRESS 1"/"ADDRESS VENDOR ADDRESS" notes pruned.
- **P1 sub-dollar** ($0.002 → "$0" rows): added `DEFAULT_MIN_PLAUSIBLE_USD=$1` floor (`price < minUsd → ex.subDollar++`). Live subDollar=20.
- **P1 bad dates** (year 4611 dominating newest-first table): `sanitizeDate` nulls out-of-window (1990-2031) dates, keeping the price row. Live nulledDate=154.
- **P1 orphan notes on re-run**: added a PRUNE step (remove notes not in current slug set, only when emitting full set / no --limit). Live: pruned-orphans=14 then 3.

CONFIRM each of the 4 is genuinely closed (trace the code + check a regenerated note has no year-4xxx date at the top of its table, no $0 rows). Check the new tests assert these (R12). Watch for OVER-fi
... [+327 chars truncated]

### Assistant | 2026-06-14T05:50:57.087Z

I'll re-review the build to confirm the 4 findings are closed. Keeping tool use minimal per the fork-storm note — I'll read the 3 source files in parallel, then do targeted spot-checks.

### Assistant | 2026-06-14T05:50:57.549Z

[tool_use: Read]

### Assistant | 2026-06-14T05:50:58.163Z

[tool_use: Read]

### Assistant | 2026-06-14T05:50:58.487Z

[tool_use: Read]

### User | 2026-06-14T05:51:00.799Z

[tool_result] 1	// jm-corpus-vault-lib.mjs -- pure core for the JM-documents -> Obsidian-vault recall bridge.
2	//
3	// Turns the real settled-price actuals (orders-closed-actuals.jsonl, $355M / 6,718 JM Orders-Closed
4	// POs) into PER-CUSTOMER Obsidian notes so the quoting AI can SEMANTICALLY RECALL "what have we
5	// settled for this customer / part?" when quoting a new job. This is the RAG layer for quoting
... [+11224 chars truncated]

### User | 2026-06-14T05:51:01.583Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * jm-corpus-to-vault.mjs -- emit the JM settled-price corpus into the Obsidian vault as
4	 * PER-CUSTOMER recall notes, so the quoting AI can semantically recall "what have we settled for
5	 * this customer / part?" when quoting a new job (RAG-for-quoting; flat JSONL has no semantic search
6	 * or backlink graph -- the vault does).
7	 *
8	 * Source : state/shared/quo
... [+8642 chars truncated]

### User | 2026-06-14T05:51:01.698Z

[tool_result] 1	// Tests for jm-corpus-vault-lib.mjs (node:test). Real-value assertions.
2	import { test } from "node:test";
3	import assert from "node:assert/strict";
4	import {
5	  normCustomer, slugifyCustomer, groupActualsByCustomer, customerPriceStats, renderCustomerNote,
6	  isFormLabelCustomer, sanitizeDate, DEFAULT_MAX_PLAUSIBLE_USD,
7	} from "./jm-corpus-vault-lib.mjs";
8	
9	test("data-quality gates: h
... [+8617 chars truncated]

### Assistant | 2026-06-14T05:51:05.844Z

I've traced all 3 files. Now let me do the targeted spot-checks (kept to two minimal commands per the fork-storm note).

### Assistant | 2026-06-14T05:51:08.336Z

[tool_use: Bash]

### User | 2026-06-14T05:51:10.327Z

[tool_result] === count ===
394
=== fake-customer notes (expect none) ===
(exit 2)
=== INDEX top-customers ===
# JM Die customer settled-price corpus (quoting recall)

Per-customer Obsidian notes distilled from the real $355M Orders-Closed actuals so the quoting AI can semantically recall a customer's settled-price history. Generated by `jm-corpus-to-vault.mjs`.

- Customers: **394** | Parts covered: **1250** |
... [+1949 chars truncated]

### Assistant | 2026-06-14T05:51:15.620Z

The spot-checks pass cleanly. Let me verify the date-nulling and $0-row claims by checking a regenerated note — picking BIRMINGHAM since the test data and earlier finding flagged it, and it's now plausibly capped (was a $130M outlier, now $450K survives = the high outlier rows were dropped but legitimate rows kept).

### Assistant | 2026-06-14T05:51:19.667Z

[tool_use: Bash]

### User | 2026-06-14T05:51:21.847Z

[tool_result] === BIRMINGHAM note table head (check no year-4xxx date, no $0 rows) ===
---
name: jm_corpus_customer_birmingham-1xz4
description: JM Die settled-price recall for BIRMINGHAM -- 5 parts, 1 orders, $450,673 settled (quoting recall)
type: reference
metadata:
  node_type: jm-corpus-customer
  customer: "BIRMINGHAM"
  part_count: 5
  order_count: 1
  settled_total_usd: 450673
  price_median_usd: 1923
 
... [+1405 chars truncated]

### Assistant | 2026-06-14T05:51:29.748Z

One note matched the bad-date scan. Let me inspect it — the regex `[3-9][0-9]{3}-` could be a false positive (e.g. a part number like `5000-` or a price). I need to confirm whether it's actually a corrupt date in the Date column.

### Assistant | 2026-06-14T05:51:31.717Z

[tool_use: Bash]

### User | 2026-06-14T05:51:34.994Z

[tool_result] === matching lines in jm-tool-die-1dpq.md ===
27:| 3418-1 | $440 | 13425 | 2018-03-05 |
=== table header for column reference ===
25:| Part | Settled $ | Order # | Date |

### Assistant | 2026-06-14T05:51:57.082Z

False positive confirmed — the match `3418-1` is in the **Part** column (a part number), not the Date column. The Date column shows `2018-03-05` (valid, in-window). The `13425` is an order number. No corrupt date appears in any Date column. The grep regex was anchored too loosely; the actual date column is clean across all 394 notes.

All checks complete. Let me trace each of the 4 findings against the code:

**Trace summary:**

1. **P0 form-label leak** — `isFormLabelCustomer` (lib:43-46) now does `FORM_LABEL_EXACT.has()` OR `FORM_PHRASE_RE.test()`. The regex (lib:40) has word-boundary anchors for ADDRESS|VENDOR|SHIP TO|PROPERTY OF|THIS DRAWING|DRAWING IS etc. Applied at the group gate (lib:105). Live: zero `address-*`, `shipto-*`, `this-drawing-*` notes (exit 2 = no match = none exist). INDEX top-customers are all real die-shop names (DARLINGTON, AGRATI, OMG, OPTIMAS, KEYSTONE SCREW, BRAINARD RIVET). CLOSED.

2. **P1 sub-dollar** — `DEFAULT_MIN_PLAUSIBLE_USD=1` (lib:22), gate at lib:102 (`price < minUsd → ex.subDollar++`), placed correctly *after* the `price<=0` badPrice check and the outlier check. Zero `$0` rows in any note table. CLOSED.

3. **P1 bad dates** — `sanitizeDate` (lib:49-54) nulls years outside 1990-2031, keeps the price row (lib:106-107). BIRMINGHAM note table is newest-first with valid 2021/2020 dates at top — no year-4xxx leading the table. Full-corpus scan found zero corrupt dates in Date columns. CLOSED.

4. **P1 orphan prune** — prune step (vault:99-106) gated on `Number.isFinite(limit) === false`, i.e. only when no `--limit` (full set). Builds `want` set from `toWrite` slugs, unlinks `.md` files not in the set. Correctly scoped. CLOSED.

**Over-filtering check (R12):** The `FORM_PHRASE_RE` did not drop real customers. INDEX top-20 are all legitimate die-shop names; garbled-but-real names like `AGRATL PARK FOREST`, `OLOMGTOOLCRIB`, `MULTITCCH` (test:34) are correctly KEPT — the regex matches only form-field word tokens (ADDRESS, VENDOR, SHIP T
... [+1059 chars truncated]
