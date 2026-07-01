---
type: "chat-session"
source: "claude-code-cli"
session_id: "dc3f020e-9a94-4310-adf2-a60d9533cfec"
title: "Review a focused 2-file change to PRISM's Obsidian->wiki promotion gate. Read BO"
date: "2026-06-17"
first_ts: "2026-06-17T13:21:27.421Z"
last_ts: "2026-06-17T13:30:17.542Z"
cwd: "H:\\prism-slot-sierra"
messages: 64
user_msgs: 23
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-a1eb59877a6dbfd97.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Review a focused 2-file change to PRISM's Obsidian->wiki promotion gate. Read BO

> **claude-code-cli** | 2026-06-17 | 64 msgs (23 user / 41 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-a1eb59877a6dbfd97.jsonl`

## Transcript

### User | 2026-06-17T13:21:27.421Z

Review a focused 2-file change to PRISM's Obsidian->wiki promotion gate. Read BOTH files end-to-end and grade PASS or FAIL with P0/P1/P2 findings + file:line citations.

FILES:
1. H:/prism/scripts/promote-memory-to-wiki.mjs  (the promoter; canonical-only)
2. H:/prism/scripts/promote-memory-to-wiki.test.mjs  (its node:test suite)

WHAT CHANGED (this session): added an exported `isHubSource(filePath)` helper + wired it into `runMemoryPromotion`'s inbound-ref scan loop so that [[ref]] links originating from auto-generated AGGREGATOR / free-association files do NOT count toward the inbound-ref promotion gate. Three hub categories: a `dreams/` path segment, an `_index/` path segment, or a basename `index.md` (any dir). Also added report field `hubSourcesSkipped` + a CLI `hubSrcSkip=` counter. Added 3 tests (1 unit for isHubSource, 2 integration that are designed to be mutation-proof).

CONTEXT / INTENT: this is STRUCTURAL ref-count de-inflation. The gate already has a content-signature filter `nonPromotableReason(fm)` (4 classes: node-pointer/unverified-advisory/run-log/test-fixture). The recurring root cause behind 3 of those classes was that auto-gen hub files inflate inbound [[ref]] counts, letting junk clear minRefs=3. isHubSource makes the COUNT itself honest so a FUTURE hub-inflated junk class can't clear the gate via hub inflation alone. Empirically proven on the live vault: excluding all 15 hub sources (11 dreams + 4 index.md) drops 0 of 55 genuine candidates below the gate.

REVIEW FOR (weight these):
- Correctness of the `isHubSource` predicate: is the regex `/(^|\/)(dreams|_index)\//` correctly SEGMENT-anchored (not substring), and does it handle Windows backslash paths (the loop builds paths via path.join)? Any over-exclusion (a genuine memory wrongly classified hub) or under-exclusion?
- Integration: is `if (isHubSource(f)) continue;` placed correctly at the TOP of the scan loop (before read), and does it correctly increment `report.hubSourcesSkipped`? Does 
... [+746 chars truncated]

### Assistant | 2026-06-17T13:21:29.752Z

I'll review both files end-to-end. Let me start by reading them completely.

### Assistant | 2026-06-17T13:21:30.221Z

[tool_use: Read]

### Assistant | 2026-06-17T13:21:30.683Z

[tool_use: Read]

### User | 2026-06-17T13:21:30.933Z

[tool_result] PRISM MCP DISCONNECTED -- ENFORCED CHECK (your prism MCP tools are dead this session)
   THIS chat's bridge is stale-heartbeat (pid 74532 gone) | fleet-wide: 0 mcp-http-bridge processes running (enum-cache 177s old).
   The daemon (:3100) may be UP, but THIS session has no live MCP bridge -- every mcp__prism__* call will fail.
   This block fires ONCE per disconnect episode (~3min), then degraded-
... [+521 chars truncated]

### User | 2026-06-17T13:21:31.857Z

[tool_result] 1	// Tests for scripts/promote-memory-to-wiki.mjs (U-VAULT02).
2	// Pure-function units + a hermetic real-FS end-to-end (tmp vault, controlled
3	// `nowMs` for age) so the promotion gate is exercised on real file IO, not mocks.
4	
5	import { test } from "node:test";
6	import assert from "node:assert/strict";
7	import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 
... [+27948 chars truncated]

### Assistant | 2026-06-17T13:21:35.078Z

The MCP read failed but the test file read succeeded. Let me read the main file with a fallback approach.

### Assistant | 2026-06-17T13:21:35.818Z

[tool_use: Bash]

### User | 2026-06-17T13:21:39.781Z

[tool_result] #!/usr/bin/env node
// KNOWLEDGE-VAULT-MS0/U-VAULT02 — Memory->Wiki promotion engine (slot:sierra, 2026-06-06).
//
// Closes the compounding spine the vault was missing: memories that have
// proven durable (referenced from >=3 places AND >=7 days old) graduate into
// the project-lifetime wiki namespace, per the promotion path defined in
// [[reference_u_vault01_knowledge_vault_schema]]: fleeting
... [+19874 chars truncated]

### Assistant | 2026-06-17T13:21:42.674Z

I have both files fully read. Let me verify a few specific concerns adversarially before reporting. First, let me confirm the regex behavior and check whether there are any other consumers of the report fields, and verify the ASCII concern.

### Assistant | 2026-06-17T13:21:50.867Z

[tool_use: Bash]

### User | 2026-06-17T13:21:53.822Z

[tool_result] Exit code 1
[eval]:3
  const u = String(filePath).replace(/\/g, "/");
                                     ^^^^^^^^

SyntaxError: missing ) after argument list
    at makeContextifyScript (node:internal/vm:185:14)
    at node:internal/process/execution:107:22
    at [eval]-wrapper:6:24
    at runScript (node:internal/process/execution:101:62)
    at evalScript (node:internal/process/execu
... [+75 chars truncated]

### Assistant | 2026-06-17T13:21:57.147Z

The backslashes got mangled in the shell heredoc. Let me write a temp test file instead to avoid escaping issues.

### Assistant | 2026-06-17T13:22:03.233Z

[tool_use: Bash]

### User | 2026-06-17T13:22:08.467Z

[tool_result] file:///C:/Users/wompu/AppData/Local/Temp/hubtest.mjs:7
  ["C:\Users\x\knowledge\memories\dreams\d.md", true],
            ^^^^

SyntaxError: Invalid hexadecimal escape sequence
    at compileSourceTextModule (node:internal/modules/esm/utils:338:16)
    at ModuleLoader.moduleStrategy (node:internal/modules/esm/translators:102:18)
    at #translate (node:internal/modules/esm/loader:437:12)

... [+174 chars truncated]

### Assistant | 2026-06-17T13:22:11.960Z

The temp-file write through the heredoc still consumed backslashes. Let me write the file with a literal backslash that survives by reading from the actual test file's approach, or use String.fromCharCode for the backslash.

### Assistant | 2026-06-17T13:22:18.657Z

[tool_use: Bash]

### User | 2026-06-17T13:22:23.502Z

[tool_result] node:internal/modules/run_main:122
    triggerUncaughtException(
    ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Users\wompu\AppData\Local\Temp\scripts\promote-memory-to-wiki.mjs' imported from C:\Users\wompu\AppData\Local\Temp\hubtest.mjs
Did you mean to import "../../../../../../H:/prism/scripts/promote-memory-to-wiki.mjs"?
    at finalizeResolution (node:internal/modules/esm/r
... [+667 chars truncated]

### Assistant | 2026-06-17T13:22:25.637Z

The relative import resolved against the temp dir. Let me use an absolute file:// URL for the import.

### Assistant | 2026-06-17T13:22:31.923Z

[tool_use: Bash]

### User | 2026-06-17T13:22:37.064Z

[tool_result] ok   "H:/prism/knowledge/memories/dreams/dream_42.md" => true (exp true)
ok   "H:/prism/knowledge/memories/_index/all.md" => true (exp true)
ok   "H:/prism/knowledge/wiki/index.md" => true (exp true)
ok   "H:/prism/knowledge/wiki/consensus/index.md" => true (exp true)
ok   "C:\\Users\\x\\knowledge\\memories\\dreams\\d.md" => true (exp true)
ok   "H:/prism/knowledge/memories/feedback/feedback_x.md"
... [+671 chars truncated]

### Assistant | 2026-06-17T13:22:45.099Z

The predicate is correct across all 18 edge cases, including segment-anchoring (no substring over-match: `dreamscape`, `my_index`, `_indexed`, `reference_dreams_analysis` all correctly return false), backslash normalization, and case-insensitive `index.md` basename. Now let me run the actual test suite to confirm it passes, and run the mutation check independently.

### Assistant | 2026-06-17T13:22:45.861Z

[tool_use: Bash]

### User | 2026-06-17T13:22:50.478Z

[tool_result]   ...
# Subtest: runMemoryPromotion: refs from a dreams/ hub do NOT count toward the gate (de-inflation)
ok 37 - runMemoryPromotion: refs from a dreams/ hub do NOT count toward the gate (de-inflation)
  ---
  duration_ms: 2.7251
  ...
# Subtest: runMemoryPromotion: genuine refs still promote; a wiki index.md source does not pad the count
ok 38 - runMemoryPromotion: genuine refs still promote; a wi
... [+180 chars truncated]

### Assistant | 2026-06-17T13:22:53.076Z

38/38 pass. Now the critical mutation check — I'll independently verify the operator's claim that neutering `isHubSource` makes exactly the 3 new tests fail (mutation-proof).

### Assistant | 2026-06-17T13:22:56.422Z

[tool_use: Bash]

### User | 2026-06-17T13:23:01.097Z

[tool_result] mutated
not ok 36 - isHubSource: dreams/ _index/ index.md are hub sources; atoms + wiki entries are not
not ok 37 - runMemoryPromotion: refs from a dreams/ hub do NOT count toward the gate (de-inflation)
not ok 38 - runMemoryPromotion: genuine refs still promote; a wiki index.md source does not pad the count
# tests 38
# pass 35
# fail 3
RESTORED

### Assistant | 2026-06-17T13:23:04.678Z

Mutation check confirmed independently: neutering `isHubSource` to `return false` causes exactly 3 failures (tests 36, 37, 38 — the 3 new tests) and 35 pass. The 2 integration tests (37, 38) are genuinely mutation-proof, not just the unit test. File restored. Let me verify a couple remaining concerns: ASCII-only conformance on the added lines, and whether any other consumer reads the report fields.

### Assistant | 2026-06-17T13:23:06.572Z

[tool_use: Bash]

### User | 2026-06-17T13:23:11.212Z

[tool_result] === non-ASCII bytes in promoter (line:col) ===
grep: -P supports only unibyte and UTF-8 locales
=== non-ASCII in test ===
grep: -P supports only unibyte and UTF-8 locales
=== done ===

### Assistant | 2026-06-17T13:23:16.233Z

[tool_use: Bash]

### User | 2026-06-17T13:23:20.544Z

[tool_result] === scripts/promote-memory-to-wiki.mjs (3 non-ascii lines) ===
2: U+2014 "—"  | // KNOWLEDGE-VAULT-MS0/U-VAULT02 — Memory->Wiki promotion engine (slot
53: U+2014 "—"  | // Do NOT "sync" this back to the engine's weaker regex — that would s
77: U+feff "﻿"  | const text = raw.replace(/^﻿/, "");
=== scripts/promote-memory-to-wiki.test.mjs (9 non-ascii lines) ===
19: U+2500 "─"  | // ── extractWikilin
... [+764 chars truncated]

### Assistant | 2026-06-17T13:23:23.339Z

There are non-ASCII characters (em-dashes U+2014, box-drawing U+2500), but I need to determine whether they are in lines ADDED this session or pre-existing. The ascii-guard rejects em-dashes "in added lines." Let me check the git diff to see exactly what this session added.

### Assistant | 2026-06-17T13:23:25.582Z

[tool_use: Bash]

### User | 2026-06-17T13:23:31.505Z

[tool_result] === STATUS of these 2 files ===
 M scripts/promote-memory-to-wiki.mjs
 M scripts/promote-memory-to-wiki.test.mjs
=== diff stat vs HEAD ===
 scripts/promote-memory-to-wiki.mjs      | 29 +++++++++++++++--
 scripts/promote-memory-to-wiki.test.mjs | 55 ++++++++++++++++++++++++++++++++-
 2 files changed, 81 insertions(+), 3 deletions(-)
=== is the .mjs tracked at HEAD? ===
scripts/promote-memory-to-wik
... [+45 chars truncated]

### Assistant | 2026-06-17T13:23:33.790Z

Both files are tracked and modified. Let me see the exact added lines (the `+` lines) to check for non-ASCII in added content specifically.

### Assistant | 2026-06-17T13:23:36.955Z

[tool_use: Bash]

### User | 2026-06-17T13:23:42.354Z

[tool_result] NO non-ASCII in added (+) lines

### Assistant | 2026-06-17T13:23:49.008Z

No non-ASCII in any added line — the em-dashes/box-drawing chars are all pre-existing. The added lines use ASCII `--` (e.g. line 392 `-- structural ref-count de-inflation --`). The ascii-guard concern is clean. Let me view the actual full diff to confirm integration placement and check the report-field consumers.

### Assistant | 2026-06-17T13:23:49.696Z

[tool_use: Bash]

### User | 2026-06-17T13:23:54.987Z

[tool_result] diff --git a/scripts/promote-memory-to-wiki.mjs b/scripts/promote-memory-to-wiki.mjs
index ccf762e18c..1f113700bf 100644
--- a/scripts/promote-memory-to-wiki.mjs
+++ b/scripts/promote-memory-to-wiki.mjs
@@ -235,6 +235,28 @@ function isIndexFile(fileName) {
   return b === "memory.md" || b === "memory-archive.md" || b === "memory-recent.md";
 }
 
+// Auto-generated AGGREGATOR / free-association fil
... [+3311 chars truncated]

### Assistant | 2026-06-17T13:24:00.375Z

The diff is clean and surgical. Now let me check two remaining adversarial concerns:

1. The hub exclusion is applied to the **scan source** loop. But could a hub file itself be a promotion CANDIDATE that's now wrongly affected? Hubs in `memFiles` go through Pass 2 regardless of `isHubSource`. Let me verify the candidate-exclusion path for hub files (the operator's "no regression" concern).

2. Whether `dreams/` files are even in `memFiles` — they live under `memoryRoot`, so `walkMd` picks them up. A `dreams/` file as a candidate: does it get excluded from promotion? It would only be excluded by type or refs — not by `isHubSource`. Let me check.

### Assistant | 2026-06-17T13:24:09.087Z

[tool_use: Bash]

### User | 2026-06-17T13:24:18.222Z

[tool_result] dreams/ file candidates: [ 'reference_dreamatom.md' ]
promoted: 1 | hubSourcesSkipped: 1
=> a hub-located file CAN still be promoted as a candidate (its links are skipped as a SOURCE, but it is still scanned as a TARGET): true

### Assistant | 2026-06-17T13:24:24.027Z

This confirms an important nuance worth noting: the exclusion is correctly **source-only** — a file located in `dreams/` is still eligible to be a promotion *target/candidate* (it's only skipped when acting as a *referencing source*). This is the correct asymmetry. Note a dreams-located atom referenced by 3 genuine non-hub files still promotes, which is arguably acceptable behavior (matches the operator's stated intent — only the COUNT-padding is removed, not the target's eligibility). This is consistent and not a regression.

One last check — whether any external caller/consumer references these report fields by position or expects a stable field set (e.g. a dashboard or another script reads `hubSourcesSkipped` or the CLI line format).

### Assistant | 2026-06-17T13:24:26.954Z

[tool_use: Bash]

### User | 2026-06-17T13:29:28.367Z

[tool_result] Command running in background with ID: bzf2jk2of. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\08f4432f-3514-45e4-9280-4a727d75e30a\tasks\bzf2jk2of.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-17T13:29:31.181Z

[tool_use: Bash]

### User | 2026-06-17T13:29:31.845Z

[tool_result] PRISM MCP DISCONNECTED -- ENFORCED CHECK (your prism MCP tools are dead this session)
   THIS chat's bridge is stale-heartbeat (pid 74532 gone) | fleet-wide: 0 mcp-http-bridge processes running (enum-cache 58s old).
   The daemon (:3100) may be UP, but THIS session has no live MCP bridge -- every mcp__prism__* call will fail.
   This block fires ONCE per disconnect episode (~3min), then degraded-m
... [+520 chars truncated]

### Assistant | 2026-06-17T13:29:33.511Z

Let me use Grep tool instead, which is more reliable here.

### Assistant | 2026-06-17T13:29:34.469Z

[tool_use: Grep]

### Assistant | 2026-06-17T13:29:34.703Z

[tool_use: Grep]

### User | 2026-06-17T13:29:37.537Z

[tool_result] No files found

### User | 2026-06-17T13:29:37.865Z

[tool_result] No files found

### Assistant | 2026-06-17T13:29:40.392Z

The Grep for `promote-memory-to-wiki` returned no files — let me confirm whether the default Grep excludes `.md`/`.json` or whether there genuinely are no consumers. Let me broaden explicitly.

### Assistant | 2026-06-17T13:29:40.923Z

[tool_use: Grep]

### User | 2026-06-17T13:29:43.354Z

[tool_result] Found 1 file
.claude\scheduled_tasks.json

### Assistant | 2026-06-17T13:29:45.861Z

There is one external consumer: a scheduled task. Let me check how it invokes the script to confirm the new fields/CLI changes don't break it.

### Assistant | 2026-06-17T13:29:46.535Z

[tool_use: Grep]

### User | 2026-06-17T13:29:47.700Z

[tool_result] 1-{
2-  "tasks": [
3-    {
4-      "id": "395d927d",
5-      "cron": "37 */3 * * *",
6:[Omitted long matching line]
7-      "createdAt": 1781670191259,
8-      "lastFiredAt": 1781686630853,
9-      "recurring": true,
10-      "createdBySessionId": "dc3f020e-9a94-4310-adf2-a60d9533cfec",
11-      "createdByPid": 57404,
12-      "createdByProcStart": "639172259186513690"

### Assistant | 2026-06-17T13:29:50.799Z

The matching line is omitted as long. Let me read the command field directly to see the exact invocation.

### Assistant | 2026-06-17T13:29:51.444Z

[tool_use: Read]

### User | 2026-06-17T13:29:52.423Z

[tool_result] 1	{
2	  "tasks": []
3	}
4	

### Assistant | 2026-06-17T13:30:17.542Z

Interesting — the H: copy of `scheduled_tasks.json` now shows an empty tasks array (the Grep matched a different/cached state, or there are two copies). Regardless, the invocation matters: the script's CLI is invoked with flags (`--apply`, `--json`, etc.). The new field `hubSourcesSkipped` is **additive** to the report object and the CLI text line — it adds `hubSrcSkip=` to existing output but changes no flag semantics, no exit code, and no existing field. A scheduled-task consumer that runs `--json` gets a superset object (backward compatible); one that parses the text line by token still finds every prior token unchanged. This is a non-breaking additive change. I have enough to render a verdict.

## Verdict

VERDICT: PASS

summary: The change adds an exported `isHubSource(filePath)` predicate and wires it as a top-of-loop `continue` in the inbound-ref scan, structurally de-inflating ref counts from auto-generated aggregator files (dreams/, _index/, index.md). The predicate is correctly segment-anchored, backslash-normalized, and case-insensitive on the basename; the integration is placed correctly before the read and increments the new `hubSourcesSkipped` field; the 2 new integration tests are genuinely mutation-proof (I independently neutered `isHubSource` to `return false` and confirmed exactly tests 36/37/38 fail, 35 pass). No P0/P1/P2 findings.

findings:
  - none

What I verified (so the PASS is auditable):

1. Correctness of `isHubSource` (`promote-memory-to-wiki.mjs:228-233`). Ran the predicate against 18 cases including the operator's listed ones plus adversarial substring traps. All pass. The regex `/(^|\/)(dreams|_index)\//` is correctly segment-anchored: `dreamscape/`, `my_index/`, `_indexed/`, and `reference_dreams_analysis.md` (substring "dreams") all correctly return `false`. Backslash normalization via `.replace(/\\/g, "/")` (line 229) handles Windows `path.join` output — confirmed a `C:\...\dreams\d.md` path returns `true`. The `index.md` basename 
... [+2501 chars truncated]
