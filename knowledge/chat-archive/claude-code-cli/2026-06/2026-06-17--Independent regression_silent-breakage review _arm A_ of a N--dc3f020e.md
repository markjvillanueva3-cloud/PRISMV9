---
type: "chat-session"
source: "claude-code-cli"
session_id: "dc3f020e-9a94-4310-adf2-a60d9533cfec"
title: "Independent regression/silent-breakage review (arm A) of a NEW read-only script:"
date: "2026-06-17"
first_ts: "2026-06-17T18:41:28.167Z"
last_ts: "2026-06-17T18:49:00.468Z"
cwd: "H:\\prism-slot-sierra"
messages: 34
user_msgs: 14
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-aa1606cff0bacf3db.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Independent regression/silent-breakage review (arm A) of a NEW read-only script:

> **claude-code-cli** | 2026-06-17 | 34 msgs (14 user / 20 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-aa1606cff0bacf3db.jsonl`

## Transcript

### User | 2026-06-17T18:41:28.167Z

Independent regression/silent-breakage review (arm A) of a NEW read-only script: H:/prism/scripts/vault-supersession-detector.mjs (read it end-to-end).

CONTEXT/CONTRACT it must satisfy:
1. It detects "memory supersession": a dated PRISM memory file (basename `..._YYYY-MM-DD.md`) whose topic-STEM (basename minus trailing date) has a strictly-NEWER dated sibling is a supersession candidate (the older one is stale-but-unmarked). Each older file must point to the NEWEST sibling of its stem (not the immediate successor).
2. It MUST be READ-ONLY — it imports `isSupersededMemory` from scripts/lib/memory-index-search-lib.mjs (the SINGLE source of truth the live recall path uses — verify it does NOT re-implement that regex) and never writes/deletes/moves any memory file. The only write is the optional `--write` report JSON to state/shared/.
3. `formatMarker(date, newerId)` must emit a string the REAL `isSupersededMemory` returns true on (the canonical `> **SUPERSEDED <date> -- see [[newer]].**` blockquote), so a future --mark unit's output wires into recall-exclusion. Confirm the consumer's regex `SUPERSEDED_DECL_RE` (in memory-index-search-lib.mjs ~line 207) actually matches formatMarker's output.
4. Edge cases that must hold: co-current tie (same stem+date via separator variants → nothing superseded), prefix-sharing stems NOT merged, archive dirs skipped, impossible calendar dates rejected, C:-source detection fail-soft when the C: dir is absent.

Look HARD for: silent breakage (e.g. stem-grouping merging distinct topics, pointing to wrong sibling, the non-greedy date regex mis-parsing two-date names), I/O safety (readdir/readFile/exists throwing un-caught), regex correctness, and any way the report could mislead an operator (over/under-counting). The companion test is H:/prism/scripts/vault-supersession-detector.test.mjs (13 tests pass) — note any UNTESTED risk path. Grade PASS or FAIL with P0/P1/P2 findings and file:line citations. Read-only review; do not edit.

### Assistant | 2026-06-17T18:41:31.471Z

I'll review this read-only script end-to-end, then verify its contract against the live recall library it depends on.

### Assistant | 2026-06-17T18:41:31.939Z

[tool_use: Read]

### Assistant | 2026-06-17T18:41:32.420Z

[tool_use: Read]

### Assistant | 2026-06-17T18:41:32.758Z

[tool_use: Read]

### User | 2026-06-17T18:41:34.611Z

[tool_result] 1	#!/usr/bin/env node
2	// Pure-core search over the Obsidian memory vault for free-floating memories
3	// not pre-joined to system-graph.json nodes.
4	//
5	// H7 of [[audit-system-synergy-2026-05-09]]: master-index-search-lib only finds
6	// memories that some system-graph node has linked via knowledge.memoryEntries[].
7	// The ~492 memory .md files in H:/prism/knowledge/memories/{feedback,refere
... [+47895 chars truncated]

### User | 2026-06-17T18:41:34.790Z

[tool_result] 1	#!/usr/bin/env node
2	// SIERRA-VAULT-OPS/U-VAULT-SUPERSEDE-DETECT -- Memory supersession detector (slot:sierra, 2026-06-17).
3	//
4	// The worst failure mode of a 2nd-brain (per the 2026 PKM articles) is surfacing
5	// STALE information as CURRENT -- "confidently wrong about your own data". PRISM has
6	// thousands of date-stamped memories (reference_X_2026-06-15.md) where a newer
7	// dated si
... [+10957 chars truncated]

### User | 2026-06-17T18:41:35.091Z

[tool_result] 1	// Tests for vault-supersession-detector.mjs (SIERRA-VAULT-OPS/U-VAULT-SUPERSEDE-DETECT).
2	// node --test scripts/vault-supersession-detector.test.mjs
3	//
4	// Mutation-proof: asserts EXACT older->newer pairings + the recall-readable marker
5	// string (a swapped pointer or a non-newest target fails), not just counts.
6	
7	import { test } from "node:test";
8	import assert from "node:assert/str
... [+8212 chars truncated]

### Assistant | 2026-06-17T18:41:37.732Z

Now let me verify the consumer regex behavior precisely, since it's the load-bearing contract. I'll trace `formatMarker`'s output through `SUPERSEDED_DECL_RE`, and check the non-greedy date regex on edge cases.

### Assistant | 2026-06-17T18:41:44.864Z

[tool_use: Bash]

### User | 2026-06-17T18:41:48.901Z

[tool_result] standalone: true
embedded: true
crlf: true
firstline: true
after-fm: true
supersedes(should be false): false
lowercase(should be false): false

### Assistant | 2026-06-17T18:41:50.424Z

[tool_use: Bash]

### User | 2026-06-17T18:41:54.560Z

[tool_result] "reference_foo_2026-06-15.md" -> {"stem":"reference_foo","dateStr":"2026-06-15","dateMs":1781481600000}
"reference_foo_2026_06_15.md" -> {"stem":"reference_foo","dateStr":"2026-06-15","dateMs":1781481600000}
"reference_bar-2026-06-15.md" -> {"stem":"reference_bar","dateStr":"2026-06-15","dateMs":1781481600000}
"reference_2026-01-01_audit_2026-06-17.md" -> {"stem":"reference_2026-01-01_audit","date
... [+680 chars truncated]

### Assistant | 2026-06-17T18:41:59.333Z

The contract holds on the regex. Now I see the calendar-validation finding: `2026-06-31` (June has 30 days) and `2026-02-30` both parse rather than being rejected — the doc comment at line 13 of the test and the script's claim "rejects 2026-13-40 etc." / "impossible dates rejected" is only partially true. Let me confirm whether this is a real correctness risk and check the separator-mixing / stem-grouping behavior more deeply, plus the `Date.parse` lenience claim.

### Assistant | 2026-06-17T18:42:05.359Z

[tool_use: Bash]

### User | 2026-06-17T18:42:10.696Z

[tool_result] Feb30 parse finite? true 1772409600000
Mar01: 1772323200000  Feb28: 1772236800000
Feb30 > Mar01? true  Feb30 ms == Mar02? true

### Assistant | 2026-06-17T18:42:11.924Z

[tool_use: Bash]

### User | 2026-06-17T18:42:19.672Z

[tool_result] --- scanning live vault for impossible day/month basenames ---
--- done ---

### Assistant | 2026-06-17T18:42:24.949Z

Good — the live vault has zero calendar-impossible dated basenames, so the lenient Feb-30/June-31 validation is a latent (not active) edge case. It's worth noting but P2 at most. Let me verify the remaining contract claims: (1) the detector does NOT re-implement the regex (it imports), (2) the C:-source detection failsoft, and (3) check the one genuine concern I want to confirm — the `walkMd` archive-skip regex and whether `current` (the supersession target) can itself be already-marked (a real-world poisoning risk).

### Assistant | 2026-06-17T18:42:36.766Z

[tool_use: Bash]

### User | 2026-06-17T18:42:41.167Z

[tool_result] CASE A newest-is-current candidates: [{"older":"mem/ref_x_2026-06-15.md","newer":"ref_x_2026-06-17"}]
  alreadyMarked: 1 unmarked: 1
CASE B (read throws on older): candidates= 0 dated= 1

### Assistant | 2026-06-17T18:42:48.331Z

Both behaviors are correct and safe:

- **CASE A** (chain): the already-marked middle file is counted as `alreadyMarked`, the unmarked oldest correctly points to the newest (06-17), and the newest is the target. No double-counting, no mispointing. Sound.
- **CASE B** (read throws on a member): the file with the I/O error is silently dropped (`continue` at line 124), so `dated=1` and zero candidates — no crash, no partial-state corruption. The blast radius of an unreadable file is just that one file vanishing from the analysis, which is acceptable for a read-only triage report (though it does mean an unreadable older file is silently NOT flagged — an under-count, but fail-soft and not misleading since the report counts reflect what was actually scanned).

Let me confirm the two remaining verification points: that the script genuinely imports the predicate (no re-implementation), and run the actual test suite to confirm the 13 tests pass as claimed.

### Assistant | 2026-06-17T18:42:50.007Z

[tool_use: Grep]

### Assistant | 2026-06-17T18:42:50.456Z

[tool_use: Bash]

### User | 2026-06-17T18:42:50.702Z

[tool_result] PRISM MCP DISCONNECTED -- ENFORCED CHECK (your prism MCP tools are dead this session)
   THIS chat's bridge is stale-heartbeat (pid 31712 gone) | fleet-wide: 0 mcp-http-bridge processes running (enum-cache 263s old).
   The daemon (:3100) may be UP, but THIS session has no live MCP bridge -- every mcp__prism__* call will fail.
   This block fires ONCE per disconnect episode (~3min), then degraded-
... [+521 chars truncated]

### User | 2026-06-17T18:42:55.804Z

[tool_result]   ...
# Subtest: archive dirs are skipped (an _archive sibling does not form a supersession set)
ok 12 - archive dirs are skipped (an _archive sibling does not form a supersession set)
  ---
  duration_ms: 0.168
  ...
# Subtest: missing C: dir is fail-soft (existsImpl false) -> scan still runs, hasCSource all false
ok 13 - missing C: dir is fail-soft (existsImpl false) -> scan still runs, hasCSour
... [+151 chars truncated]

### Assistant | 2026-06-17T18:43:02.947Z

The Grep tool failed (MCP bridge dead, not my concern), but the test suite confirms **13/13 pass**. Let me confirm the no-re-implementation point directly via the file content I already read: line 36 `import { isSupersededMemory } from "./lib/memory-index-search-lib.mjs";` is the only source — the script never defines its own `SUPERSEDED_DECL_RE` or `isSupersededMemory`. `formatMarker` (lines 90-92) only constructs the marker string; it does not re-parse it. Confirmed: single source of truth, no drift.

Let me do one final blast-radius check — confirm nothing else in the repo consumes this new script in a way that could break, and verify the C:-source set lowercasing can't cause a false durability flag.

### Assistant | 2026-06-17T18:43:07.788Z

[tool_use: Bash]

### User | 2026-06-17T18:48:11.197Z

[tool_result] Command running in background with ID: bqwhe9lh8. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\08f4432f-3514-45e4-9280-4a727d75e30a\tasks\bqwhe9lh8.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-17T18:48:14.956Z

[tool_use: Bash]

### User | 2026-06-17T18:48:26.133Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-17T18:48:30.058Z

[tool_use: Bash]

### User | 2026-06-17T18:48:34.870Z

[tool_result] em-dash marker matches: true
no-dash marker matches: true
--- consumers ---
/h/prism/scripts/vault-supersession-detector.mjs
/h/prism/scripts/vault-supersession-detector.test.mjs

### Assistant | 2026-06-17T18:49:00.468Z

All verifications complete. The dash is confirmed non-load-bearing (regex keys on `SUPERSEDED\b`), so `formatMarker`'s ASCII `--` produces a marker the real consumer matches — even em-dash or no-dash variants match, meaning the contract is robust against future cosmetic drift. The only consumers are the script and its test (no external coupling to break).

Here is my verdict.

---

VERDICT: PASS

summary: The detector is genuinely read-only (sole write is the optional `--write` report JSON; it imports `isSupersededMemory` from the live recall lib rather than re-implementing the regex, so detection and recall-exclusion cannot drift). `formatMarker`'s output is verified to satisfy the real `SUPERSEDED_DECL_RE` (`memory-index-search-lib.mjs:207`) across every body position (first-line, embedded, CRLF, post-frontmatter), so a future `--mark` unit wires cleanly into recall exclusion. Stem-grouping, newest-target pointing, co-current ties, prefix-sharing separation, archive skipping, and C:-source fail-soft all behave correctly; 13/13 tests pass.

findings:
- [P2] `scripts/vault-supersession-detector.mjs:80-81` -- The calendar validator only range-checks `month 1-12` / `day 1-31`, so genuinely-impossible dates `2026-06-31` (June=30d), `2026-02-30`, `2026-02-31` PARSE rather than being rejected, contradicting the script comment "rejects 2026-13-40 etc." and the test's "impossible calendar dates rejected" claim. Worse, `Date.parse` silently *rolls these over* (`2026-02-30T00:00:00Z` → ms-equal to Mar 02), so `dateMs` (used for ordering at :145) diverges from `dateStr` (used in the operator-facing marker at :91/:164): a rolled-over Feb-30 would sort AFTER a real Mar-01 sibling yet render `> **SUPERSEDED 2026-02-30 ...**`. Verified latent-only: a live-vault scan found ZERO calendar-impossible dated basenames, so this never fires today — but a typo'd future filename could mis-order siblings or point the wrong direction. Fix: add real days-in-month validation (e.g. reconstruct 
... [+2521 chars truncated]
