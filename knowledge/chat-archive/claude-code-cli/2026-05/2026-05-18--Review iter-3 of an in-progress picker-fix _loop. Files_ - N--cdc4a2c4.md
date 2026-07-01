---
type: "chat-session"
source: "claude-code-cli"
session_id: "cdc4a2c4-eeb5-4533-9a1e-da4d27dadc81"
title: "Review iter-3 of an in-progress picker-fix /loop. Files: - NEW: `H:/prism/script"
date: "2026-05-18"
first_ts: "2026-05-18T00:33:39.015Z"
last_ts: "2026-05-18T00:35:16.758Z"
cwd: "H:\\prism"
messages: 32
user_msgs: 13
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/cdc4a2c4-eeb5-4533-9a1e-da4d27dadc81/subagents/agent-a497197922c573859.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# Review iter-3 of an in-progress picker-fix /loop. Files: - NEW: `H:/prism/script

> **claude-code-cli** | 2026-05-18 | 32 msgs (13 user / 19 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/cdc4a2c4-eeb5-4533-9a1e-da4d27dadc81/subagents/agent-a497197922c573859.jsonl`

## Transcript

### User | 2026-05-18T00:33:39.015Z

Review iter-3 of an in-progress picker-fix /loop. Files:
- NEW: `H:/prism/scripts/lib/domain-classifier.mjs` — single source of truth for slot↔domain mapping + unit→domain classification (extracted from `scripts/allocate-domains-to-slots.mjs`'s inline DOMAIN_RULES so the allocator and the pickup picker can't drift).
- NEW: `H:/prism/scripts/lib/domain-classifier.test.mjs` — 16 tests, all passing.
- EDITED: `H:/prism/scripts/allocate-domains-to-slots.mjs` — refactored to import DOMAIN_RULES/DEFAULT_DOMAIN/DOMAIN_TO_SLOT/SLOT_DOMAIN_LABEL/classifyUnit from the new lib. Behavior must be PRESERVED (it's a domain allocator that re-keys slot-task-queues.json for 13 chat slots). Live dry-run post-refactor: 3238 units → 13 domains, echo=181 cam (verify this matches pre-refactor expectations).
- EDITED: `H:/prism/.claude/helpers/priority-queue.mjs` — `pickNextUnit({slot})` now filters ranked candidates to the slot's domain (echo=cam, alpha=mill per JULIETT-12CHAT-ALLOCATION). R12 fallback: if no in-domain work, returns global ranking flagged `_crossDomain:true` instead of empty.
- EDITED: `H:/prism/.claude/helpers/priority-queue.test.mjs` — 5 new pickNextUnit integration tests.

Context: iters 1-2 (commits c84a0c7cbc, 9cdc2db2e1) fixed shipped-detection. Iter 3 closes the deferred P2 "slot-domain filter" so `priority-queue --pick --slot echo` returns cam units, not random hygiene units.

Verify:
1. **Behavior preservation in allocate-domains-to-slots.mjs** — does the refactor change ANY classification outcome? The old inline `classify(unit)` returned the full rule object `{domain,slot,rx}`; the new `classifyUnit` returns `{domain,slot}`. Confirm the only callsite (`const {domain,slot}=classify(u)`) is compatible. Did the old code use `rx` anywhere else? Grep.
2. **Rule ordering preserved** — the cam-before-mill / wire-before-lathe ordering is load-bearing (HYPERMILL contains MILL). Confirm the lib's DOMAIN_RULES array order is byte-identical to the original.
3. **classifyUni
... [+1113 chars truncated]

### Assistant | 2026-05-18T00:33:43.702Z

I'll review the iter-3 picker-fix changes systematically.

### Assistant | 2026-05-18T00:33:44.061Z

[tool_use: Read]

### Assistant | 2026-05-18T00:33:44.457Z

[tool_use: Read]

### Assistant | 2026-05-18T00:33:44.674Z

[tool_use: Read]

### User | 2026-05-18T00:33:45.324Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/lib/domain-classifier.mjs
3	//
4	// Single source of truth for slot↔domain mapping + unit→domain classification.
5	//
6	// Background: PRISM runs 13 NATO-named chat slots, each assigned a PRISM system
7	// domain (alpha=mill, bravo=lathe, charlie=wire-EDM, etc. per JULIETT-12CHAT-
8	// ALLOCATION-MS0). The slot-task queue allocator (scripts/allocate-domains-to-
9
... [+5624 chars truncated]

### User | 2026-05-18T00:33:45.606Z

[tool_result] 1	#!/usr/bin/env node
2	// Tests for domain-classifier.mjs — slot↔domain single source of truth.
3	
4	import { test } from "node:test";
5	import assert from "node:assert/strict";
6	import {
7	  DEFAULT_DOMAIN,
8	  DOMAIN_RULES,
9	  DOMAIN_TO_SLOT,
10	  SLOT_TO_DOMAIN,
11	  classifyText,
12	  classifyUnit,
13	  filterUnitsBySlot,
14	  slotDomain,
15	} from "./domain-classifier.mjs";
16	
17	test("cl
... [+5918 chars truncated]

### User | 2026-05-18T00:33:45.852Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * priority-queue.mjs — runtime API over ROADMAP-CONSOLIDATED priority queue.
4	 *
5	 * Spec: PRIORITY-QUEUE-MS0 (slot juliett, forge7, 2026-05-16).
6	 *
7	 * Consumed by Stop hooks (stop-auto-pickup-next.mjs in particular) to suggest
8	 * the next-best unit for a chat to take. Uses the same `classifyUnit` from
9	 * scripts/generate-priority-queue-features.mjs so visu
... [+10367 chars truncated]

### Assistant | 2026-05-18T00:33:48.588Z

Now let me check the original allocator's classify usage and verify rule ordering preservation.

### Assistant | 2026-05-18T00:33:50.751Z

[tool_use: Bash]

### Assistant | 2026-05-18T00:33:51.931Z

[tool_use: Bash]

### User | 2026-05-18T00:33:55.294Z

[tool_result] 40:const DOMAIN_RULES = [
41:  { domain: "wire",       slot: "charlie", rx: /\bWEDM\b|WIRE.?EDM|\bEDM\b|ELECTRODE|TAPTITE|SINKER/ },
42:  { domain: "lathe",      slot: "bravo",   rx: /\bLATHE|TURNING|\bTURN\b|SWISS|\bGROOV|HARD.?TURN/ },
43:  { domain: "cam",        slot: "echo",    rx: /\bCAM\b|TOOLPATH|HYPERMILL|MASTERCAM|\bESPRIT\b|INVENTOR.?HSM|SOLIDWORKS|SOLIDCAM|POWERMILL|\bNX.?CAM|CATIA|SPR
... [+1867 chars truncated]

### User | 2026-05-18T00:33:56.705Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'classify\|DOMAIN_RULES\|DEFAULT_DOMAIN\|DOMAIN_TO_SLOT\|SLOT_DOMAIN_LABEL\|\.rx\b\|import.*domain-classifier'

### Assistant | 2026-05-18T00:34:01.065Z

The grep showed git HEAD output (old code). Let me read the current allocator file directly.

### Assistant | 2026-05-18T00:34:02.331Z

[tool_use: Grep]

### User | 2026-05-18T00:34:04.545Z

[tool_result] 34:  DEFAULT_DOMAIN,
35:  DOMAIN_RULES,
36:  DOMAIN_TO_SLOT,
37:  SLOT_DOMAIN_LABEL,
38:  classifyUnit,
39:} from "./lib/domain-classifier.mjs";
46:// DOMAIN_RULES / DEFAULT_DOMAIN / DOMAIN_TO_SLOT / SLOT_DOMAIN_LABEL now live
47:// in scripts/lib/domain-classifier.mjs (single source of truth — shared with
71:// classify() now delegates to the shared classifier (was an inline duplicate
72:// of DO
... [+505 chars truncated]

### Assistant | 2026-05-18T00:34:07.647Z

Now let me check the original allocator for `rx` usage outside `classify()` and verify SLOT_DOMAIN_LABEL existed before, plus the test file for priority-queue.

### Assistant | 2026-05-18T00:34:08.904Z

[tool_use: Bash]

### Assistant | 2026-05-18T00:34:09.361Z

[tool_use: Read]

### User | 2026-05-18T00:34:14.877Z

[tool_result] 61:const SLOT_DOMAIN_LABEL = {
92:    if (rule.rx.test(text)) return rule;
127:  for (const s of Object.keys(SLOT_DOMAIN_LABEL)) bySlot[s] = [];
183:    perSlot[s] = { domain: SLOT_DOMAIN_LABEL[s], units: bySlot[s].length, gapUnits: gapBySlot[s].length };
208:    slotDomains: SLOT_DOMAIN_LABEL,

### User | 2026-05-18T00:34:15.809Z

[tool_result] 1	#!/usr/bin/env node
2	import test from "node:test";
3	import assert from "node:assert/strict";
4	import { collectUnits, buildShippedIds, buildClaimedIds, rankUnits, pickNextUnit } from "./priority-queue.mjs";
5	import { slotDomain, classifyUnit as classifyUnitDomain } from "../../scripts/lib/domain-classifier.mjs";
6	
7	test("collectUnits — flattens pending + prose + bridge into one list", () =>
... [+6836 chars truncated]

### Assistant | 2026-05-18T00:34:19.870Z

Let me verify the original `classify()` callsite compatibility and check for `.rx` usage in the new lib's consumers, plus run both test suites.

### Assistant | 2026-05-18T00:34:22.044Z

[tool_use: Bash]

### Assistant | 2026-05-18T00:34:24.749Z

[tool_use: Bash]

### User | 2026-05-18T00:34:27.025Z

[tool_result] # tests 16
# suites 0
# pass 16
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 239.5737
---PQ---
# tests 12
# suites 0
# pass 12
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 421.1536

### User | 2026-05-18T00:34:31.327Z

[tool_result] order: wire,lathe,cam,mill,cad,post,speedfeed,print2prog,academy,tribal,erp,database
orig: wire,lathe,cam,mill,cad,post,speedfeed,print2prog,academy,tribal,erp,database

### Assistant | 2026-05-18T00:34:35.498Z

All 28 tests pass. Rule order is byte-identical. Let me verify the original `classify()` callsite compatibility (old returned full rule with `rx`; new returns `{domain,slot}`) and confirm no `.rx`/`.slot` field access beyond destructuring.

### Assistant | 2026-05-18T00:34:36.747Z

[tool_use: Bash]

### Assistant | 2026-05-18T00:34:37.884Z

[tool_use: Bash]

### User | 2026-05-18T00:34:42.377Z

[tool_result] 5:function classify(unit) {
7:  for (const rule of DOMAIN_RULES) {
8:    if (rule.rx.test(text)) return rule;
36:  // Collect + classify. pending_units (envelope-backed) lead prose (no envelope).
50:    const { domain, slot } = classify(u);

### User | 2026-05-18T00:34:51.825Z

[tool_result] 4:  // Collect + classify. pending_units (envelope-backed) lead prose (no envelope).
18:    const { domain, slot } = classify(u);
47:    const slot = DOMAIN_TO_SLOT[g.domain];
58:      domain: g.domain,

### Assistant | 2026-05-18T00:35:16.758Z

Confirmed. Original `classify()` returned the full rule object but the **only** callsite destructures `const {domain,slot} = classify(u)` — `rx` was never accessed by callers. The new `classifyUnit` returns exactly `{domain,slot}`. Behavior preserved.

---

## Code Quality Analysis Report — iter-3 picker-fix

### Summary
- Overall Quality Score: **9/10**
- Files Analyzed: 5 (2 new, 3 edited)
- Tests: 16/16 + 12/12 PASS; rule order byte-identical
- Issues Found: 0 P0, 0 P1, 3 P2

### Verification Results

**1. Behavior preservation — PASS.** Sole callsite `const {domain,slot}=classify(u)` (allocator line ~135). Old `classify` returned the full rule object incl. `rx`; new `classifyUnit` returns `{domain,slot}`. `rx` is never read by any caller (grep-confirmed: only `rule.rx.test()` internally). Identical match semantics (same `.toUpperCase()`, same field concat `milestone+unit_id||id+title`, same first-match-wins loop). `SLOT_DOMAIN_LABEL` content unchanged from original lines 61–. Live dry-run claim (3238→13, echo=181) is consistent with byte-identical rules.

**2. Rule ordering — PASS.** Programmatically verified `wire,lathe,cam,mill,cad,post,speedfeed,print2prog,academy,tribal,erp,database` identical new-lib vs git-HEAD. cam-before-mill / wire-before-lathe invariants intact; explicitly tested (HYPERMILL→cam).

**3. classifyUnit drift — PASS.** Two imports cleanly aliased: `classifyUnit` (category, from generate-priority-queue-features) and `classifyUnitDomain` (domain, from domain-classifier). No shadowing — distinct bindings, distinct usage (`rankUnits` uses category-classifier; domain filter uses `classifyUnitDomain`).

**4. Slot-filter correctness — PASS.** Filter applied to `ranked` which is already post-exclusion (`rankUnits(collectUnits, exc)` where `exc`=shipped∪claimed∪excludeIds). `.slice(0,n)` applied AFTER domain filter. Order correct — no shipped leak.

**5. R12 fallback — PASS (sound design).** Cross-domain fallback stamps `_crossDomain:true` + `_slotD
... [+1544 chars truncated]
