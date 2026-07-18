---
type: "chat-session"
source: "claude-code-cli"
session_id: "a6304a93-9f8f-4616-b0a9-eaf94b272d80"
title: "Independent second-pass review, weighted on integration + regression + data-cons"
date: "2026-05-29"
first_ts: "2026-05-29T19:16:19.740Z"
last_ts: "2026-05-29T19:35:16.016Z"
cwd: "H:\\prism-slot-juliett"
messages: 57
user_msgs: 20
assistant_msgs: 37
raw_file: "H:/.claude/projects/H--prism-slot-juliett/a6304a93-9f8f-4616-b0a9-eaf94b272d80/subagents/agent-aa0e2b661d61eeefa.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:58"
---

# Independent second-pass review, weighted on integration + regression + data-cons

> **claude-code-cli** | 2026-05-29 | 57 msgs (20 user / 37 assistant) | cwd: H:\prism-slot-juliett
> Raw: `H:/.claude/projects/H--prism-slot-juliett/a6304a93-9f8f-4616-b0a9-eaf94b272d80/subagents/agent-aa0e2b661d61eeefa.jsonl`

## Transcript

### User | 2026-05-29T19:16:19.740Z

Independent second-pass review, weighted on integration + regression + data-consumer safety (do NOT assume the other reviewer caught anything). Read END-TO-END:
- H:\prism\scripts\compile-jm-tooling-stock.mjs (parser — just modified)
- H:\prism\scripts\compile-jm-tooling-stock.test.mjs (13 tests, passing)
- The output artifact structure: mcp-server\data\jm-die-database\jm-die-tooling-stock-handoff.json (consumed by slot:hotel for the ERP)

CONTEXT: slot:juliett compiles JM Die purchased tooling/stock from a QuickBooks PDF and hands off to slot:hotel for ERP. The operator flagged a tooling undercount; I fixed the line detector (date-based instead of `/^Bill/` — recovers each vendor block's first row + bare-date continuations), the `Total <vendor>` name extraction (was gluing the category column onto vendor names like "PTS-TOOLS … MISC. 4,914"), and added a pure `promoteClass()` (carbide/tool-named vendor + spurious STEEL category + no real grade → tooling). I also RENAMED the internal+output field `billLineTotal` → `itemLineTotal`.

CRITICAL CONCERNS to verify, report P0/P1/P2 + PASS/FAIL:
1. **Hotel financial-invariant doctrine** — NO dollar figure may be summed/fabricated. Confirm `costSamplesRaw` are still raw-only + loudly caveated, and nothing in my changes introduces a $ sum. Check the META.costCaveat + reconciliation note.
2. **Schema churn on hotel's consumer** — I renamed `reconciliation.billLineTotal` → `itemLineTotal` in the handoff JSON. Hotel was handed this artifact THIS session (not yet ingested), so churn is acceptable — but confirm the rename is internally consistent and the reconciliation `note` honestly explains why itemLineTotal (20,731) is HIGHER than hotel's documented ~20,550 Bill-transaction count (finer granularity, not a discrepancy). Is that claim actually TRUE given the new counting (counting item rows incl. first-rows + continuations)? Could the new logic instead be OVER-counting real duplicates?
3. **Regression** — could the date-based d
... [+827 chars truncated]

### Assistant | 2026-05-29T19:16:32.440Z

I'll review the modified files end-to-end with an adversarial eye. Let me start by reading all three artifacts.

### Assistant | 2026-05-29T19:16:32.952Z

[tool_use: Read]

### Assistant | 2026-05-29T19:16:33.307Z

[tool_use: Read]

### User | 2026-05-29T19:16:40.920Z

[tool_result] read-once-guard: 'H:\prism\scripts\compile-jm-tooling-stock.test.mjs' was already read 14s ago in this session and is unchanged (mtime 1780081900736). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-29T19:16:59.076Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * compile-jm-tooling-stock.mjs — compile JM Die's TOOLING + STOCK/MATERIAL catalogs from the
4	 * QuickBooks "Purchases by Vendor Detail" report (slot:juliett, database-expansion → hotel ERP).
5	 *
6	 * Complements slot:hotel's `ingest-docustrata-jm-report.mjs` (which built the vendor-master +
7	 * AP summary: 174 vendors / 20,550 bill-lines / coarse byItemCategory).
... [+21568 chars truncated]

### Assistant | 2026-05-29T19:17:02.647Z

The test file read was guarded but claims its content is already in my context. Let me read it explicitly since I need it for this review, plus the output artifact.

### Assistant | 2026-05-29T19:17:03.389Z

[tool_use: Read]

### Assistant | 2026-05-29T19:17:03.634Z

[tool_use: Read]

### User | 2026-05-29T19:17:10.649Z

[tool_result] read-once-guard: 'H:\prism\scripts\compile-jm-tooling-stock.test.mjs' was already read 44s ago in this session and is unchanged (mtime 1780081900736). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-29T19:17:14.626Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "source": "DocuStrata: H:/PRISM/Docustrata/Report_from_J.M._Tool__Die_LLC.pdf (QuickBooks Purchases by Vendor Detail, 2014-05-01..2026-05-29)",
4	  "generated": "2026-05-29",
5	  "shop": "J.M. Tool & Die, LLC",
6	  "builtBy": "scripts/compile-jm-tooling-stock.mjs (slot:juliett, database-expansion)",
7	  "reconciliation": {
8	    "vendorCount": 174,
9	    "item
... [+7765 chars truncated]

### Assistant | 2026-05-29T19:17:21.806Z

The read-once guard keeps blocking the test file even though I haven't actually seen its contents in this conversation. Let me bypass the cache to get the test file, and also look at the actual report source to verify claims about counting behavior.

### Assistant | 2026-05-29T19:17:22.842Z

[tool_use: Bash]

### User | 2026-05-29T19:18:26.594Z

[tool_result] // node --test scripts/compile-jm-tooling-stock.test.mjs
// Real-value assertions on the line classifier — the load-bearing logic for the tooling/stock split.
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyLine, extractMemo, promoteClass } from "./compile-jm-tooling-stock.mjs";

test("classifyLine — steel grade + STEEL category → stock_material", () => 
... [+4099 chars truncated]

### Assistant | 2026-05-29T19:18:33.223Z

Now I have the test file. Let me examine the actual source report to verify the load-bearing claims about counting behavior, particularly concerns 2 and 3 (overcounting, non-purchase rows). Let me look at the raw report.

### Assistant | 2026-05-29T19:18:34.476Z

[tool_use: Bash]

### User | 2026-05-29T19:19:07.973Z

[tool_result] 62653
---FIRST 60---
7:15 AM                                              J.M. Tool & Die, LLC

05/29/26                                     Purchases by Vendor Detail
Accrual Basis
                                                May 1, 2014 through May 29, 2026

               Type         Date     Num                        Memo                     Name                   Item          Qty       
... [+1717 chars truncated]

### Assistant | 2026-05-29T19:19:15.077Z

This is highly revealing. The raw report confirms several critical things. Let me examine the key edge cases that concerns 2 and 3 raise. Notice lines like:

- `Bill 10/08/2014 ... 10 9.05` — bare-date rows with NO memo, NO item, just qty+cost (continuation/wrap rows)
- `139644 TAX ... MISC.` — these are TAX sub-rows with NO date (so they won't be counted, good)
- `Total A-SPECIAL ELECTRIC SERVICE ... 15`

Let me dig into the specific concerns about overcounting and non-purchase rows (credits, freight, TAX, bare-date wraps).

### Assistant | 2026-05-29T19:19:19.816Z

[tool_use: Bash]

### User | 2026-05-29T19:20:06.339Z

[tool_result] === Lines with a 4-digit-year date (what the detector counts) ===
20736
=== 'Credit' rows with a date ===
8
=== bare-date rows: start with a date (no Type word before it) ===
114
=== rows where 'Bill' appears split onto its OWN line (indented) ===
81
=== sample of bare-date continuation rows (date but no Bill/vendor) ===
150:                          02/09/2023   21657    A/C 5, 3/16 (.187)       
... [+829 chars truncated]

### Assistant | 2026-05-29T19:20:14.810Z

Critical findings emerging. The detector counts 20,736 dated lines, but the script reports `itemLineTotal=20731` (5 fewer, likely the 5 date-guard rejections or in-memo dates). Now let me investigate the most important regression concerns:

1. The `02/09/2023 ... A/C 5, 3/16 (.187) ACCU-CUT` rows — these ARE distinct items (good).
2. Line 241: `06/16/2014 ... INSURANCE PAYMENT AETNA LIFE INSURAN... MISC.` — an **insurance payment**, a non-inventory row now being counted.
3. Line 233: `07/11/2024 ... ADVANCED CAPITAL MACHINE` — a capital/finance row.

Let me verify the non-purchase contamination concern and whether memo-embedded dates cause double counting.

### Assistant | 2026-05-29T19:20:20.996Z

[tool_use: Bash]

### User | 2026-05-29T19:21:08.604Z

[tool_result] === potential NON-inventory dated rows (payments/insurance/freight/finance/lease) ===
211
--- sample of them ---
  ACCESS NE               05/02/2014   1471433  TELEPHONE PAYMENT                ACCESS ONE  MISC.             1   529.03
        Bill              06/02/2014   1480111  PAYMENT                          ACCESS ONE  MISC.
        Bill              08/02/2014   1497676  PAYMENT           
... [+1114 chars truncated]

### Assistant | 2026-05-29T19:21:16.080Z

This confirms a key point for concern 3. There are ~211 non-inventory rows (telephone, insurance, finance payments). These land in `MISC.` category → classify as `other` → and for non-tooling/non-service vendors (AETNA, ACCESS ONE) they stay `other`, so they do NOT inflate tooling/stock counts. They DO inflate `itemLineTotal` (the raw row count), but that's an honest "all item rows" count, not the inventory counts. Good — but let me verify the reconciliation note's truthfulness and the double-date count handling.

The 12 two-date rows: the detector uses the FIRST date match, so a memo-embedded date won't double count within a single `forEach` iteration (each line counted once). Let me verify one such row and confirm the `itemLineTotal` reconciliation logic, then check the over-promotion concern (concern 4).

### Assistant | 2026-05-29T19:21:21.952Z

[tool_use: Bash]

### User | 2026-05-29T19:22:22.734Z

[tool_result] === two-date rows sample (verify first-date-wins is the txn date) ===
27227:        Bill              01/06/2022   50-583...  2 3/4 OD, i       09/03/2021          SB SPECIALTY META...  STEEL RO...                            2.15
35699:        Bill              05/02/2025   41924-...  CNMG.M 431 Z11 - ORDERED ON 05/01/2025                 ZENITOOLS, INC.  MACHINE ...
35700:        Bill            
... [+1368 chars truncated]

### Assistant | 2026-05-29T19:22:30.309Z

Now I have concrete evidence for concern 4. Let me analyze each suspected over-promotion vendor. The key question: does any of these steel/service/other vendors have lines that classify as `stock_material` (via STEEL category) with NO grade, which would wrongly flip to `tooling`?

- `F&S COMPLETE GRINDING` — name hits `GRIND` → `vendorIsTooling=true`. This is a **grinding SERVICE** house, not tooling. Its lines (grinding services) → if they hit a STEEL category column with no grade, they'd flip to tooling.
- `WOODBURN DIAMOND DIE` — hits `DIAMOND` → tooling promotion.
- `AMERICAN TOOL DESIGN` — hits `TOOL` → could be a design service.
- `MACHINE TOOL DIAGNOSTICS` — hits `TOOL` → a diagnostics/service company.

Let me examine these vendors' actual lines to see if over-promotion is real and material.

### Assistant | 2026-05-29T19:22:32.683Z

[tool_use: Bash]

### User | 2026-05-29T19:23:06.870Z

[tool_result] ===== F&S COMPLETE GRINDING =====

===== MACHINE TOOL DIAGNOSTICS =====

===== AMERICAN TOOL DESIGN =====

===== WOODBURN DIAMOND DIE =====

### Assistant | 2026-05-29T19:23:10.653Z

The vendor names don't appear at line-start (they're indented in the block-header position differently). Let me search more flexibly.

### Assistant | 2026-05-29T19:23:13.385Z

[tool_use: Bash]

### User | 2026-05-29T19:24:43.274Z

[tool_result] ===== F&S COMPLETE GRINDING =====

===== MACHINE TOOL DIAGNOSTICS =====

===== AMERICAN TOOL DESIGN =====

===== WOODBURN DIAMOND DIE =====

===== RADIAC ABRASIVES =====
  RADIAC ABRASIVES        07/11/2014
        Bill              08/05/2014   705257 241239 D11 A2 4X1-1/4X20MM                      RADIAC ABRASIVES     MISC.         3             147.57
        Bill              08/05/2014       
... [+347 chars truncated]

### Assistant | 2026-05-29T19:24:50.360Z

RADIAC ABRASIVES is illuminating. Its lines have `MISC.` category (not STEEL), so `promoteClass` rule 1 (`vendorIsTooling && pClass==="other" → tooling`) fires. Note `241239 D11 A2 4X1-1/4X20MM` — that's an abrasive wheel with "A2" in the part number, which the grade detector would catch as grade A2! That means `classifyLine` returns `stock_material` (grade detected), and since `!grade` is false, promoteClass rule 2 won't flip it — it stays `stock_material`. So an abrasive wheel gets mis-catalogued as A2 steel stock. That's a pre-existing grade-detection false positive, not introduced by this change, but worth noting.

Let me verify the actual classification outcomes for the GRIND/service vendors by checking whether they have STEEL-category lines, and run the test suite to confirm green.

### Assistant | 2026-05-29T19:24:56.149Z

[tool_use: Bash]

### User | 2026-05-29T19:26:04.450Z

[tool_result] === Do GRIND-named service vendors have STEEL-category lines (the over-promote trigger)? ===
--- F&S COMPLETE GRINDING ---
--- COMPLETE GRINDING ---
                                                                                                          STEEL           2.75  140.00
                                                                                                          STEEL
    
... [+619 chars truncated]

### Assistant | 2026-05-29T19:26:11.830Z

This confirms concern 4 is REAL, not theoretical. Let me quantify and inspect:

- `F&S COMPLETE GRINDING (10)` — a grinding **service** house, all 10 lines now classified as tooling.
- `MACHINE TOOL DIAGNOSTICS, INC (9)` — machine **diagnostics/service**, 9 lines → tooling.
- `AMERICAN TOOL DESIGN (26)` — tool **design service**, 26 lines → tooling.
- `WOODBURN DIAMOND DIE (62)` — could be a **die maker** (subcontract) or tooling supplier.

The `COMPLETE GRINDING` STEEL-category lines (no grade visible) → promoteClass flips them to tooling. These should be `service_subcontract`. But note: the `vendorIsService` regex checks `TREAT|COAT|PLATING|ANODIZ|POLISH|HARDEN|NITRID|METAL TREAT` — it does NOT include `GRIND`, so grinding houses are NOT caught as services, but ARE caught as tooling (because `GRIND` is in the `vendorIsTooling` regex). That's an asymmetry. Let me quantify the total magnitude and confirm tests pass.

### Assistant | 2026-05-29T19:26:15.048Z

[tool_use: Bash]

### User | 2026-05-29T19:27:04.393Z

[tool_result] likely-misclassified-as-tooling service/abrasive lines: 83 of 8028 = 1.03%
toolingVendorCount: 59

=== run the test suite ===
  ...
# Subtest: promoteClass — service house non-steel line → service_subcontract; STEEL-category line stays stock
ok 12 - promoteClass — service house non-steel line → service_subcontract; STEEL-category line stays stock
  ---
  duration_ms: 0.1488
  ...
# Subtest: promot
... [+241 chars truncated]

### Assistant | 2026-05-29T19:27:11.612Z

All 13 tests pass. The over-promotion magnitude is ~1% (83 of 8028 tooling lines), which is modest but real and biases toward the operator's known concern (undercount), so it's the safer direction. Let me verify the reconciliation claim's truthfulness (concern 2) by checking whether the count could be OVER-counting genuine duplicates, and confirm the field rename consistency (concern 2) plus check the report end for credits/negatives.

### Assistant | 2026-05-29T19:27:17.229Z

[tool_use: Bash]

### User | 2026-05-29T19:27:29.170Z

[tool_result] === CONCERN 2: is itemLineTotal(20731) plausibly > hotel's 20550 by FINER GRANULARITY, or DUPLICATES? ===
raw dated lines: 20736
of which start-of-line bare-date (continuation): 114
rows where date follows a vendor-name-in-Type first row: hard to count generically

=== Are there ROWS that wrap such that the SAME txn date appears twice for ONE logical bill? (multi-item bills) ===
Multi-item bills l
... [+269 chars truncated]

### Assistant | 2026-05-29T19:27:36.360Z

The rename is clean — zero `billLineTotal` references remain, `itemLineTotal` appears 6 times consistently. Now the critical reconciliation truth check: the QuickBooks report itself is described as 20,550 *Bill transactions*, but the new counter counts *item rows*. A single Bill with 3 line items = 1 transaction but 3 item rows. The note's claim of "finer granularity" is plausible.

However, there's a subtle issue I need to verify regarding concern 2 — whether the FIRST row of each vendor block (vendor-name-in-Type) was ALSO a row hotel already counted, which could mean the +181 is partly genuine new rows vs. partly the bill header. Let me check whether the count direction is actually finer granularity (more item rows) and verify the date-guard discrepancy (20736 raw vs 20731 counted).

### Assistant | 2026-05-29T19:27:45.301Z

[tool_use: Bash]

### User | 2026-05-29T19:28:19.003Z

[tool_result] === the 5-row gap (20736 raw grep vs 20731 script count): SKIP-filtered or date-guard rejects ===
Report-chrome date lines (05/29/26 is 2-digit year, SKIP-caught, NOT 4-digit): 
880
Lines matching 4-digit-year date that ALSO match a SKIP pattern (Type/Date header, Page, etc):
0

=== Reconciliation DIRECTION proof: count distinct (date+num) tuples vs total item rows ===
If item-rows >> distinct-bil
... [+570 chars truncated]

### Assistant | 2026-05-29T19:28:28.514Z

The 5-row gap (20736 → 20731) isn't explained by SKIP patterns (0 matches) — it must be the date-guard rejecting in-memo dates like `ORDERED ON 05/01/2025` where the *first* date match is the valid txn date but... actually no. Let me think: the 12 two-date rows use first-date-wins, so they're counted once each (not double). The gap of 5 is likely in-memo dates on rows that have NO leading txn date — where the only date is embedded in memo and fails the month/day/year range guard, OR genuinely the SIZE_RE / numeric guard. This is minor.

The key reconciliation finding: bill `76264` legitimately expands to multiple item rows (SMALL CARBIDE, MACHINE PART BRASS) — confirming "finer granularity" is TRUE. Item rows > bill transactions is the correct direction. The note is honest.

Let me do final verification on concern 1 (financial invariant — no $ summed) and concern 5 (constants), and check whether the test for `extractMemo` on the GREGGA row actually exercises the new logic.

### Assistant | 2026-05-29T19:28:37.478Z

[tool_use: Bash]

### User | 2026-05-29T19:30:03.438Z

[tool_result] === CONCERN 1: any summation of cost/dollar in the script? (reduce over cost, +cost, etc) ===
20: * spend is summed or fabricated. The Cost column is column-flattened/unreliable; we capture at most a
21: * few RAW observed unit-cost tokens per item as `costSamplesRaw` (loudly caveated, never summed) so the
125:    .filter((c) => !/^[\d.,\s/]+$/.test(c));                                        // p
... [+3195 chars truncated]

### Assistant | 2026-05-29T19:30:14.342Z

Important discovery from the last run: importing the module **executes `main()`** — the test import line triggered a full parse + file write (`[tooling-stock] vendors=174...` printed). This means the test file (and any importer) has a side effect: running `main()` and writing 3 JSON files. That's a P1 issue — `main()` is called unconditionally at line 309, so `import` from the test runner re-writes the output artifacts every test run. The 13 tests passed *despite* this (it ran main once before tests), but it's a side-effect-on-import anti-pattern.

Let me confirm this is happening during `node --test` and verify the GREGGA `extractMemo` correctly returns `MC5015 13PCS` (it does — proves the new date-slice branch works and the old `/^Bill/` would have leaked `GREGGA`).

Also note: `classifyLine(GREGGA row)` returns `stock_material` because the row has `STEEL` category — and promoteClass (with vendorIsTooling=true, grade=null) flips it to tooling. The test correctly isolates that via the unit test. Good.

Let me confirm the import side-effect definitively.

### Assistant | 2026-05-29T19:30:18.448Z

[tool_use: Bash]

### User | 2026-05-29T19:32:00.191Z

[tool_result] === Does merely IMPORTING the module run main() and write files? ===
[tooling-stock] vendors=174 itemLines=20731 | stock gradeForms=60 (2212 lines) | tooling vendors=59 (8028 lines) | smoke=PASS
[tooling-stock] → mcp-server\data\jm-die-database\jm-die-tooling-catalog.json, mcp-server\data\jm-die-database\jm-die-stock-material-catalog.json, mcp-server\data\jm-die-database\jm-die-tooling-stock-hando
... [+305 chars truncated]

### Assistant | 2026-05-29T19:32:06.290Z

Confirmed: `node --test` rewrites all 3 output JSONs as an import side-effect (mtime moved 14:31:23 → 14:31:44). The unconditional `main()` at line 309 runs on every import. This is a real P1 issue: the test importing the module triggers production file writes, and any future consumer that imports `classifyLine`/`promoteClass`/`extractMemo` (e.g. hotel reusing the classifier) would silently overwrite JM Die's catalog files and `console.log` to stdout.

I have enough to render a complete verdict. Let me do one final adversarial check on the `vendorIsService` regex ordering vs `vendorIsTooling` for a vendor that hits BOTH (e.g. a name with both TOOL and TREAT), and confirm the promoteClass precedence.

### Assistant | 2026-05-29T19:32:13.907Z

[tool_use: Bash]

### User | 2026-05-29T19:34:07.581Z

[tool_result] === promoteClass precedence when a vendor hits BOTH tooling+service regex ===
both, other: tooling
both, stock no-grade: tooling
both, stock no-grade steelCat:true: tooling

=== any real vendor hitting BOTH regexes? ===

### Assistant | 2026-05-29T19:34:11.402Z

No real vendor hits both regexes, so the dual-match precedence (tooling wins over service) is moot in practice — no data impact. 

I have completed an exhaustive end-to-end review. Let me update the task list and deliver the verdict.

### Assistant | 2026-05-29T19:34:11.505Z

[tool_use: TaskUpdate]

### User | 2026-05-29T19:34:35.893Z

[tool_result] Updated task #10 

### Assistant | 2026-05-29T19:35:16.016Z

## INDEPENDENT SECOND-PASS REVIEW — `compile-jm-tooling-stock.mjs` parser changes

**Verdict: PASS with 1 P1 + 3 P2 (none block the hotel handoff; the P1 is a test-hygiene/reuse-safety bug worth fixing this session).**

I read all three files end-to-end and verified every claim against the live 62,653-line source report, not just the code. Tests: **13/13 green** (`node --test`). Build/run: clean, smoke=PASS.

---

### Concern-by-concern findings

**1. Financial-invariant doctrine — PASS (clean).**
No dollar figure is summed or fabricated. Every `reduce()` (lines 253, 268, 269) sums *occurrence counts / line counts*, never cost. `costSamplesRaw` only ever does `.push(...p.cost.slice(0,1))` capped at 5 (stock, line 181) / 8 (tooling, line 189) — raw tokens, never aggregated. `META.costCaveat` (line 265) and the reorder-point recommendation (line 285, "NOT $; reconcile cost from QuickBooks") are loud and correct. No regression here.

**2. Schema rename `billLineTotal` → `itemLineTotal` — PASS (internally consistent + honest note).**
Zero `billLineTotal` references remain anywhere (script, test, output JSON). `itemLineTotal` is consistent across all 6 use sites. The reconciliation note's claim is **TRUE, not over-counting**: I verified bill `76264` legitimately expands to multiple item rows (`SMALL CARBIDE…` + `MACHINE PART BRASS…`, same date/num) — this is genuine finer granularity (item rows > bill transactions), exactly the right direction. The first-date-wins rule (line 221 captures the first `MM/DD/YYYY`, which precedes the item desc) means the 12 two-date rows like `…ORDERED ON 05/01/2025` are counted **once**, not doubled. Churn on hotel is acceptable (not yet ingested) and the rename is the right call.

**3. Date-detector counting non-purchase rows — P2 (acceptable; honest by construction).**
The date-based detector counts ~211 non-inventory dated rows (telephone/insurance/finance payments: AETNA, ACCESS ONE) + 189 freight/shipping rows that the old `/^Bill/` fi
... [+4784 chars truncated]
