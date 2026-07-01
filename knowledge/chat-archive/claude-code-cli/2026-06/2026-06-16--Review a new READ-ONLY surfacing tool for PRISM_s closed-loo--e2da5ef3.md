---
type: "chat-session"
source: "claude-code-cli"
session_id: "e2da5ef3-054c-4ce9-bf15-ccdd4c5dbc63"
title: "Review a new READ-ONLY surfacing tool for PRISM's closed-loop OCR active-learnin"
date: "2026-06-16"
first_ts: "2026-06-16T22:33:37.535Z"
last_ts: "2026-06-16T22:36:43.621Z"
cwd: "H:\\prism-slot-xray"
messages: 45
user_msgs: 17
assistant_msgs: 28
raw_file: "H:/.claude/projects/H--prism-slot-xray/e2da5ef3-054c-4ce9-bf15-ccdd4c5dbc63/subagents/agent-aee5fbb0e05ef1918.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:15"
---

# Review a new READ-ONLY surfacing tool for PRISM's closed-loop OCR active-learnin

> **claude-code-cli** | 2026-06-16 | 45 msgs (17 user / 28 assistant) | cwd: H:\prism-slot-xray
> Raw: `H:/.claude/projects/H--prism-slot-xray/e2da5ef3-054c-4ce9-bf15-ccdd4c5dbc63/subagents/agent-aee5fbb0e05ef1918.jsonl`

## Transcript

### User | 2026-06-16T22:33:37.535Z

Review a new READ-ONLY surfacing tool for PRISM's closed-loop OCR active-learning queue. Read both files END-TO-END in H:/prism and grade PASS/FAIL with P0/P1/P2 + file:line.

Files:
- scripts/ocr-al-queue-surface.mjs — reads state/shared/ocr-training-loop/corpus-train/active-learning-queue.jsonl (prints/pages whose ensemble pseudo-labels need operator GOLD-verification), dedups reaper-kill duplicate rows (last-wins by key+page), ranks prints by "gold readiness" (confidence-weighted corroborated-dim count penalized by ambiguous+hallucination noise), and writes a markdown worklist + JSON. Pure-core exports: dedupRows, profileRow, goldReadiness, surfaceAlQueue, renderMarkdown. IO shell: readJsonl + main().
- scripts/ocr-al-queue-surface.test.mjs — 8 node:test cases.

VERIFY:
1. READ-ONLY guarantee: the tool must NEVER mutate the AL-queue, the trainset, or write any GOLD label — it only reads the queue and writes its own report files. Confirm no write touches the input queue or trainset.jsonl.
2. Fail-soft: malformed jsonl lines skipped (not abort); missing summary fields collapse to 0 not NaN; non-array/empty input safe; div-by-zero impossible in goldReadiness (noise denominator always >= 1).
3. Dedup correctness: last-wins by key+page is the right convention (matches xray-trainset-to-lora.mjs); dropped count correct.
4. goldReadiness math: monotone increasing in corroborated dims, decreasing in noise; a noise-free full-confidence print scores exactly its corroborated count; zero corroborated -> zero.
5. The main() isMain guard correctly runs only when invoked directly (not on import) — check the cross-platform path compare (Windows backslash vs argv).
6. ASCII-only in code; no stubs; no inlined physics constants.
7. Tests are real reference-value asserts (would fail on revert), cover happy + >=3 edge/adversarial.

Run `node --test scripts/ocr-al-queue-surface.test.mjs` to confirm. Be adversarial: find any path where the tool could mutate source data, produce NaN/Infi
... [+107 chars truncated]

### Assistant | 2026-06-16T22:33:40.420Z

I'll review both files end-to-end, focusing on the read-only guarantee, fail-soft behavior, and the math correctness.

### Assistant | 2026-06-16T22:33:40.893Z

[tool_use: Read]

### Assistant | 2026-06-16T22:33:41.299Z

[tool_use: Read]

### User | 2026-06-16T22:33:42.149Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/ocr-al-queue-surface.mjs
3	//
4	// U-XRAY-AL-QUEUE-SURFACE -- surface the closed-loop OCR active-learning queue for operator
5	// GOLD-verification (the gate to 100% print-reading accuracy). The training loop
6	// (blueprint-ocr-training-loop.mjs) writes active-learning-queue.jsonl: prints/pages whose
7	// ensemble pseudo-labels need a HUMAN decision before they 
... [+10005 chars truncated]

### User | 2026-06-16T22:33:42.633Z

[tool_result] 1	// scripts/ocr-al-queue-surface.test.mjs
2	// Real reference-value tests for the OCR active-learning-queue GOLD-verification surface.
3	// Run: node --test scripts/ocr-al-queue-surface.test.mjs
4	
5	import { test } from "node:test";
6	import assert from "node:assert/strict";
7	import { dedupRows, profileRow, goldReadiness, surfaceAlQueue, renderMarkdown } from "./ocr-al-queue-surface.mjs";
8	
9	
... [+5354 chars truncated]

### Assistant | 2026-06-16T22:33:44.770Z

Both files read end-to-end. Now let me verify the dedup convention against the referenced sibling tool and run the tests.

### Assistant | 2026-06-16T22:33:46.183Z

[tool_use: Bash]

### Assistant | 2026-06-16T22:33:47.450Z

[tool_use: Bash]

### User | 2026-06-16T22:33:49.582Z

[tool_result]   ...
# Subtest: surfaceAlQueue: aggregates GOLD/ambiguous/halluc pools and ranks densest-GOLD first
ok 5 - surfaceAlQueue: aggregates GOLD/ambiguous/halluc pools and ranks densest-GOLD first
  ---
  duration_ms: 0.1758
  ...
# Subtest: surfaceAlQueue: empty + malformed input is safe
ok 6 - surfaceAlQueue: empty + malformed input is safe
  ---
  duration_ms: 0.1026
  ...
# Subtest: renderMarkdown:
... [+520 chars truncated]

### User | 2026-06-16T22:33:53.503Z

[tool_result] 1:#!/usr/bin/env node
45: * Last-wins dedup identity for a trainset row. The resumable runner appends per-page rows BEFORE the
47: * The runner promises these are deduped here last-wins by key+page (runner report note). Falls back to
49: * collapsed; a legacy row without key/page dedups by its image path.
53:  if (row.key != null && row.page != null) return `${row.key}#p${row.page}`;
63:  // Last-
... [+572 chars truncated]

### Assistant | 2026-06-16T22:33:56.918Z

All 8 tests pass. Now let me examine the dedup-key convention divergence I notice between this tool and the sibling, and check the `isMain` guard plus a couple of adversarial paths.

### Assistant | 2026-06-16T22:33:57.858Z

[tool_use: Read]

### User | 2026-06-16T22:33:58.754Z

[tool_result] 43	
44	/**
45	 * Last-wins dedup identity for a trainset row. The resumable runner appends per-page rows BEFORE the
46	 * per-print cursor, so a reaper kill mid-print leaves duplicate rows on resume (same page re-emitted).
47	 * The runner promises these are deduped here last-wins by key+page (runner report note). Falls back to
48	 * image, then part. Two genuinely-different pages of one print car
... [+1581 chars truncated]

### Assistant | 2026-06-16T22:34:08.324Z

[tool_use: Bash]

### User | 2026-06-16T22:34:11.401Z

[tool_result] Exit code 1
node:internal/modules/run_main:122
    triggerUncaughtException(
    ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Users\wompu\AppData\Local\Temp\scripts\ocr-al-queue-surface.mjs' imported from C:\Users\wompu\AppData\Local\Temp\al_adv.mjs
Did you mean to import "../../../../../../H:/prism/scripts/ocr-al-queue-surface.mjs"?
    at finalizeResolution (node:internal/module
... [+672 chars truncated]

### Assistant | 2026-06-16T22:34:15.363Z

The temp file used a relative import that resolved against the temp dir. Let me write the probe with an absolute import path.

### Assistant | 2026-06-16T22:34:27.007Z

[tool_use: Bash]

### User | 2026-06-16T22:34:30.977Z

[tool_result] === ADV 1: goldReadiness NaN/Infinity/div-by-zero ===
   {"corroborated":null,"mean_conf":1,"ambiguous":0,"hallucination":0} => Infinity *** NON-FINITE ***
   {"corroborated":1,"mean_conf":null,"ambiguous":0,"hallucination":0} => Infinity *** NON-FINITE ***
   {"corroborated":-5,"mean_conf":1,"ambiguous":0,"hallucination":0} => -5 FINITE
   {"corroborated":1,"mean_conf":1,"ambiguous":-10,"hallucin
... [+592 chars truncated]

### Assistant | 2026-06-16T22:34:34.649Z

I found a concrete div-by-zero/Infinity path. Let me confirm whether the live queue producer can ever emit a negative `n_ambiguous_pairs`, and verify the `isMain` guard and read-only guarantee with the actual producer.

### Assistant | 2026-06-16T22:34:36.536Z

[tool_use: Grep]

### User | 2026-06-16T22:34:38.030Z

[tool_result] H:\prism\scripts\docustrata\phase16-blueprint-program-join-v6.py:316:    n_corroborated = 0
H:\prism\scripts\docustrata\phase16-blueprint-program-join-v6.py:344:                n_corroborated += 1
H:\prism\scripts\docustrata\phase16-blueprint-program-join-v6.py:435:    print(f"  customer cross-check: {n_with_print_cust} usable | {n_corroborated} corroborated | {n_narrowed_by_cust} narrowed", flush
... [+5318 chars truncated]

### Assistant | 2026-06-16T22:34:38.517Z

[tool_use: Bash]

### User | 2026-06-16T22:34:43.152Z

[tool_result] -rw-r--r-- 1 wompu 197611 107071 Jun 16 16:25 state/shared/ocr-training-loop/corpus-train/active-learning-queue.jsonl
---HEAD OF QUEUE---
{"key":"d22706-38.pdf","page":0,"part":"D22706-38.PDF#p0","image":"H:\\PRISM\\Docustrata\\Unfiled\\D22706-38.PDF","reasons":["51 ambiguous pair(s) — model value-disagreement","20 hallucination candidate(s)"],"summary":{"n_models":2,"models":["qwen3-vl:8b-instruc
... [+934 chars truncated]

### Assistant | 2026-06-16T22:34:47.004Z

The producer (`vision-ensemble-fuse.mjs`) emits counts from `.length` of filtered arrays, so a well-formed live row will always have non-negative integers — the live queue is safe in practice. The Infinity/div-by-zero paths I found require a malformed/adversarial row with negative `n_ambiguous_pairs`. Let me confirm the producer always yields non-negative, and verify the real queue runs clean through the tool to confirm no write touches the source.

### Assistant | 2026-06-16T22:34:48.425Z

[tool_use: Read]

### User | 2026-06-16T22:34:49.640Z

[tool_result] 283	    n_models: nModels,
284	    models: runs.map((r) => r.model),
285	    per_model_dim_count: Object.fromEntries(per_model.map((p) => [p.model, p.dim_count])),
286	    quorum,
287	    n_clusters: dimensions.length,
288	    n_corroborated: corroborated.length,                 // ≥2 models agree (consensus, high-trust)
289	    n_partial: dimensions.filter((d) => d.status === "partial").length,
2
... [+443 chars truncated]

### Assistant | 2026-06-16T22:34:55.341Z

[tool_use: Bash]

### User | 2026-06-16T22:34:59.655Z

[tool_result] distinct_prints: 133 | GOLD-candidate dims: 142 | ambiguous: 3119 | halluc: 1028 | dedup_dropped: 16 | total_rows: 149
NON-FINITE numbers in JSON report: 0
SOURCE SHA before == after :  YES_READONLY_OK
md report NaN/Infinity occurrences: 0

### Assistant | 2026-06-16T22:35:05.172Z

Confirmed: over the live 149-row queue the tool produces 0 non-finite numbers, the source file SHA is byte-identical before/after (read-only verified), and 16 reaper-duplicate rows deduped correctly (149 rows → 133 distinct). The producer emits `.length` of arrays, so live data is always non-negative. The Infinity paths require an adversarial malformed row, which the spec's own fail-soft criterion #2 explicitly claims is impossible ("div-by-zero impossible... noise denominator always >= 1"). Let me verify the `isMain` guard behavior and ASCII-only constraint.

### Assistant | 2026-06-16T22:35:11.101Z

[tool_use: Bash]

### User | 2026-06-16T22:35:15.535Z

[tool_result] === isMain guard: import must NOT trigger main() ===
imported cleanly, main() did NOT run (no exit/write side-effect)

=== ASCII-only check (non-ASCII bytes in source) ===
grep: -P supports only unibyte and UTF-8 locales
ASCII-only: OK (both files)

=== second isMain disjunct: endsWith guard with a same-named importer ===
argv1=other-runner.mjs -> main did NOT run (correct)

### Assistant | 2026-06-16T22:35:21.437Z

Let me verify the ASCII check properly (the `-P` locale error suppressed it) and probe one remaining concern: the second `isMain` disjunct could falsely fire if a *different* tool whose entry file happens to end with `ocr-al-queue-surface.mjs` imports it — but more importantly, whether a consumer that imports this module while being *run* via a path ending in that name exists.

### Assistant | 2026-06-16T22:35:28.933Z

[tool_use: Bash]

### User | 2026-06-16T22:35:33.280Z

[tool_result] === Proper ASCII check via od (find any byte > 0x7F) ===
  scripts/ocr-al-queue-surface.mjs : 0 non-ASCII bytes
  scripts/ocr-al-queue-surface.test.mjs : 0 non-ASCII bytes

=== any other module that imports this surface (would the endsWith disjunct mis-fire)? ===
  (no external importer other than the test) -> endsWith disjunct cannot mis-fire from a sibling importer

=== isMain primary compare: f
... [+188 chars truncated]

### Assistant | 2026-06-16T22:35:38.942Z

This confirms a real correctness defect in the `isMain` primary compare. On Windows, `fileURLToPath` returns a backslash path (`H:\prism\scripts\...`), but the guard normalizes `argv[1]` with `.split("\\").join("/")` and compares to the *un-normalized* `fileURLToPath(import.meta.url)`. They can never match on Windows — the primary disjunct is dead. The tool only runs because of the *second* disjunct (`endsWith("ocr-al-queue-surface.mjs")`). That second disjunct is the actual load-bearing guard, and it is fragile: any future module run from a path ending in that exact filename that imports this would mis-fire. It works today, but the primary guard is broken-by-construction. Let me do a final confirmation of the dedup-key divergence from the sibling and the GOLD-pool count integrity.

### Assistant | 2026-06-16T22:35:45.580Z

[tool_use: Bash]

### User | 2026-06-16T22:35:50.119Z

[tool_result] === dedup-key divergence: this tool uses key#page (no 'p'); sibling uses key#pPAGE + image/part fallback ===
  this tool key:    `${key}#${page}`     (line 40)  e.g.  a.pdf#0
  sibling key:      `${key}#p${page}`   (line 53)  e.g.  a.pdf#p0  + image/part fallback
  -> different string, SAME semantic grouping (key+page). Last-wins identical. Sibling has extra
     keyless-row preservation (image/pa
... [+253 chars truncated]

### Assistant | 2026-06-16T22:35:56.308Z

Confirmed a second real defect: two distinct keyless rows (different images, both missing `key`) collapse onto a single bucket `#0`, and one is silently dropped + miscounted as a reaper-duplicate. The sibling `xray-trainset-to-lora.mjs` explicitly guards against this with an `image → part` fallback chain (lines 53-56) precisely so a "legacy row without key/page dedups by its image path." This tool's spec claims it "matches the convention of xray-trainset-to-lora.mjs," but it dropped the fallback.

However, I need to assess severity honestly against the *live* data: every live queue row carries a `key` and `page` (verified in the head sample), so this only bites legacy/keyless rows. Let me confirm no keyless rows exist in the live queue.

### Assistant | 2026-06-16T22:36:01.886Z

[tool_use: Bash]

### User | 2026-06-16T22:36:02.478Z

[tool_result] PRISM MCP DISCONNECTED -- ENFORCED CHECK (your prism MCP tools are dead this session)
   THIS chat's bridge is stale-heartbeat (pid 87244 gone) | fleet-wide: 0 mcp-http-bridge processes running (enum-cache 86s old).
   The daemon (:3100) may be UP, but THIS session has no live MCP bridge -- every mcp__prism__* call will fail.
   This block fires ONCE per disconnect episode (~3min), then degraded-m
... [+520 chars truncated]

### Assistant | 2026-06-16T22:36:06.847Z

That was an unrelated MCP-bridge advisory (no MCP tool was used; my Bash command didn't execute). Let me re-run the live-exposure check.

### Assistant | 2026-06-16T22:36:10.516Z

[tool_use: Bash]

### User | 2026-06-16T22:36:14.920Z

[tool_result] total rows: 149 | rows missing key: 0 | rows missing page: 0
keyless rows that would WRONGLY collapse/drop: 0
live impact: NONE (every live row has a key; defect is latent)

### Assistant | 2026-06-16T22:36:43.621Z

Live data confirms both defects are latent (every live row has key+page, non-negative integer counts). My review is complete.

---

VERDICT: PASS

summary: The tool is genuinely READ-ONLY (verified by byte-identical source SHA before/after a live run; the only writes are to its own `AL-QUEUE-GOLD-REVIEW.{md,json}` report files, never the queue or `trainset.jsonl`). Over the live 149-row queue it produces zero non-finite numbers, correctly dedups 16 reaper-duplicate rows (149→133 distinct), and all 8 tests pass on real reference values. Two real defects exist but are *latent* — they bite only on malformed/legacy rows the live producer (`vision-ensemble-fuse.mjs`, which emits `.length` of arrays = always non-negative integers with key+page) never generates. The math, fail-soft posture, dedup convention, and ASCII/no-stub constraints are otherwise sound.

findings:
- [P2] `scripts/ocr-al-queue-surface.mjs:188` -- The PRIMARY `isMain` compare is dead on Windows: `fileURLToPath(import.meta.url)` returns a backslash path (`H:\prism\scripts\...`) but it is compared against `argv[1].split("\\").join("/")` (forward-slashed), so they can never be equal on Windows (verified: `match: false`). The tool only runs because of the SECOND disjunct `argv[1].endsWith("ocr-al-queue-surface.mjs")`. That fallback works today (no external importer exists) but is fragile by construction — any future module run from a path ending in that exact filename that imports this module would auto-fire `main()`. -- Fix: normalize BOTH sides before compare, e.g. `fileURLToPath(import.meta.url).split("\\").join("/") === argv[1].split("\\").join("/")`, then drop the fragile `endsWith` disjunct.

- [P2] `scripts/ocr-al-queue-surface.mjs:40` -- Dedup divergence from the cited sibling: this tool's key is `${key}#${page}` with NO fallback, so two distinct keyless rows (different `image`, both missing `key`) collapse onto one bucket `#0` — one row is silently dropped AND miscounted as a reaper-duplicate in `d
... [+2995 chars truncated]
