---
type: "chat-session"
source: "claude-code-cli"
session_id: "dc3f020e-9a94-4310-adf2-a60d9533cfec"
title: "You are arm A of a per-file scrutiny gate for a PRISM (slot:sierra) change. Revi"
date: "2026-06-16"
first_ts: "2026-06-16T22:38:06.394Z"
last_ts: "2026-06-16T22:41:22.141Z"
cwd: "H:\\prism-slot-sierra"
messages: 39
user_msgs: 15
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-afd9d8ae87edab449.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# You are arm A of a per-file scrutiny gate for a PRISM (slot:sierra) change. Revi

> **claude-code-cli** | 2026-06-16 | 39 msgs (15 user / 24 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-afd9d8ae87edab449.jsonl`

## Transcript

### User | 2026-06-16T22:38:06.394Z

You are arm A of a per-file scrutiny gate for a PRISM (slot:sierra) change. Review for correctness, silent breakage, and regression risk. Grade PASS or FAIL with P0/P1/P2 findings and file:line citations. Read the WHOLE files end-to-end.

CONTEXT — the change (uncommitted, in worktree H:/prism on branch cad-fusion-live-ms0):
`scripts/promote-memory-to-wiki.mjs` promotes durable Obsidian memories (≥3 inbound [[wikilink]] refs, ≥7 days old) into the canonical wiki. A nightly cron (currently freeze-disabled) runs it with --apply. 

THE BUG FIXED: the promotion gate had NO exclusion for graph-node-pointer memories (frontmatter `node_kind: course|formula|...`) nor explicitly-unverified content (`advisoryOnly`/`mustHumanVerify` true). On the LIVE vault, 34 of 54 candidates were `node_*` MIT course/formula pointer stubs (bodies are 1-2 lines like "Pointer: [[mit-x]]. No engines mapped -- lima audit pending") whose inbound refs are inflated to ~10 by a single MIT-course index hub linking all of them -- so they cleared minRefs=3 without being genuinely cross-referenced. Promoting them = graduating unverified stub metadata into the canonical wiki (R9/R12 violation) the moment the cron arms.

THE FIX:
1. New exported `nonPromotableReason(fm)` helper (returns "node-pointer" | "unverified-advisory" | null).
2. Wired into `runMemoryPromotion` Pass-2 loop as a hard exclusion BEFORE the refs/age/type gate; new report counter `skippedNonPromotable`.
3. CLI summary line surfaces `skipNonProm=N`.

VERIFY SPECIFICALLY:
- Is the exclusion placed correctly (before the type/refs/age gate) and counted correctly? Could it double-count or skip incorrectly?
- `nonPromotableReason` edge cases: empty-string node_kind, false-valued flags, string "false", null/garbage fm. Does it OVER-exclude any legitimate memory? Does it UNDER-exclude (e.g. node_kind nested deeper than the flat-parser reaches)?
- The frontmatter parser (`parseMemoryFrontmatter`) flattens nested `metadata:` keys to top-level fm.
... [+636 chars truncated]

### Assistant | 2026-06-16T22:38:09.033Z

I'll review the changed files end-to-end, focusing on the bug fix and the specific verification points. Let me start by reading both files.

### Assistant | 2026-06-16T22:38:09.958Z

[tool_use: Read]

### Assistant | 2026-06-16T22:38:09.963Z

[tool_use: Read]

### User | 2026-06-16T22:38:10.505Z

[tool_result] PRISM MCP DISCONNECTED -- ENFORCED CHECK (your prism MCP tools are dead this session)
   THIS chat's bridge is stale-heartbeat (pid 35996 gone) | fleet-wide: 0 mcp-http-bridge processes running (enum-cache 110s old).
   The daemon (:3100) may be UP, but THIS session has no live MCP bridge -- every mcp__prism__* call will fail.
   This block fires ONCE per disconnect episode (~3min), then degraded-
... [+521 chars truncated]

### User | 2026-06-16T22:38:10.904Z

[tool_result] 1	// Tests for scripts/promote-memory-to-wiki.mjs (U-VAULT02).
2	// Pure-function units + a hermetic real-FS end-to-end (tmp vault, controlled
3	// `nowMs` for age) so the promotion gate is exercised on real file IO, not mocks.
4	
5	import { test } from "node:test";
6	import assert from "node:assert/strict";
7	import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 
... [+18916 chars truncated]

### Assistant | 2026-06-16T22:38:12.953Z

The MCP error is advisory; I'll use direct file reads as instructed. The test file read succeeded. Now let me read the main script.

### Assistant | 2026-06-16T22:38:13.287Z

[tool_use: Read]

### User | 2026-06-16T22:38:13.724Z

[tool_result] read-once-guard: 'H:\prism\scripts\promote-memory-to-wiki.mjs' was already read 3s ago in this session and is unchanged (mtime 1781649053560). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-16T22:38:15.917Z

The guard says it's already in context, but the first read returned the MCP-disconnect error, not the file content. Let me work around the guard.

### Assistant | 2026-06-16T22:38:16.806Z

[tool_use: Bash]

### User | 2026-06-16T22:38:22.778Z

[tool_result]      1	#!/usr/bin/env node
     2	// KNOWLEDGE-VAULT-MS0/U-VAULT02 — Memory->Wiki promotion engine (slot:sierra, 2026-06-06).
     3	//
     4	// Closes the compounding spine the vault was missing: memories that have
     5	// proven durable (referenced from >=3 places AND >=7 days old) graduate into
     6	// the project-lifetime wiki namespace, per the promotion path defined in
     7	// [[refer
... [+19510 chars truncated]

### Assistant | 2026-06-16T22:38:25.577Z

I have the full main script now. Let me trace the specific verification points carefully. First, let me verify the claims about the live dry-run and confirm the test suite actually passes, and check the cron wiring context.

### Assistant | 2026-06-16T22:38:26.522Z

[tool_use: Bash]

### Assistant | 2026-06-16T22:38:27.353Z

[tool_use: Grep]

### User | 2026-06-16T22:38:31.431Z

[tool_result]   ...
# Subtest: runMemoryPromotion: malformed memory counted, does not crash the run
ok 29 - runMemoryPromotion: malformed memory counted, does not crash the run
  ---
  duration_ms: 3.5539
  ...
# Subtest: runMemoryPromotion: a self-referencing memory does not count itself
ok 30 - runMemoryPromotion: a self-referencing memory does not count itself
  ---
  duration_ms: 1.582
  ...
1..30
# tests 3
... [+88 chars truncated]

### User | 2026-06-16T22:38:37.376Z

[tool_result] Found 26 files
H:\prism\mcp-server\data\state\session-file-ownership.json
H:\prism\knowledge\memories\reference\reference_sierra_open_threads_context_map_2026_06_10.md
H:\prism\knowledge\memories\reference\reference_obsidian_vault_audit_2026_06_08.md
H:\prism\knowledge\memories\reference\reference_obsidian_vault_ops_2026_06_06.md
H:\prism\scripts\promote-memory-to-wiki.mjs
H:\prism\mcp-server\src\
... [+1425 chars truncated]

### Assistant | 2026-06-16T22:38:40.911Z

30/30 tests pass, confirmed. Now let me check the cron wiring to understand the blast radius (what arms the live --apply run), and look at how the live dry-run claim can be verified. Let me also check the git diff to see exactly what changed (to confirm the change is scoped to what's described).

### Assistant | 2026-06-16T22:38:42.327Z

[tool_use: Bash]

### Assistant | 2026-06-16T22:38:42.773Z

[tool_use: Read]

### User | 2026-06-16T22:38:45.978Z

[tool_result]  scripts/promote-memory-to-wiki.mjs      | 30 ++++++++++++-
 scripts/promote-memory-to-wiki.test.mjs | 76 ++++++++++++++++++++++++++++++++-
 2 files changed, 103 insertions(+), 3 deletions(-)
---DIFF MAIN---
diff --git a/scripts/promote-memory-to-wiki.mjs b/scripts/promote-memory-to-wiki.mjs
index b4897fa7ab..d7f1a94d93 100644
--- a/scripts/promote-memory-to-wiki.mjs
+++ b/scripts/promote-memory-t
... [+3332 chars truncated]

### User | 2026-06-16T22:38:46.621Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\install-vault-promotion-cron.ps1' was already read 20s ago in this session and is unchanged (mtime 1780935948438). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### Assistant | 2026-06-16T22:38:50.128Z

The diff confirms the change is exactly as described and scoped to the two files. The cron read returned a guard error (it was read earlier in some session but not in MY context). Let me read it to understand the live-apply blast radius, and run the live dry-run to verify the 54→17 claim.

### Assistant | 2026-06-16T22:38:51.080Z

[tool_use: Bash]

### Assistant | 2026-06-16T22:38:55.211Z

[tool_use: Bash]

### User | 2026-06-16T22:38:56.413Z

[tool_result]      1	# install-vault-promotion-cron.ps1 — OBSIDIAN-VAULT-OPS / U-VAULT-MAINT-CRON
     2	# Register a durable Windows Scheduled Task that runs the Memory->Wiki promotion
     3	# (promote-memory-to-wiki.mjs) nightly. Closes the "promotion runs only by hand"
     4	# gap from the 2026-06-08 vault audit (the engine + script work but were never
     5	# scheduled, so durable memories never auto-gra
... [+2890 chars truncated]

### User | 2026-06-16T22:39:03.001Z

[tool_result] {
  "totalMemories": 19443,
  "malformed": 0,
  "skippedNonPromotable": 12893,
  "skippedType": 401,
  "belowRefs": 5350,
  "belowAge": 730,
  "skippedExisting": 52,
  "candidateCount": 17,
  "nodeCandidatesLeaked": []
}

### Assistant | 2026-06-16T22:39:07.850Z

The live dry-run confirms the core claim: **0 `node_*` candidates leak** through. The candidate count is 17 (matching the claimed "54→17"). Note: the live vault now scans 19,443 memories (the C:/H: mirror trees, much larger than the "54 candidates" recon snapshot), with 12,893 skippedNonPromotable — the exclusion is doing heavy lifting. No node_ candidates leak.

Let me verify two remaining edge cases the prompt flagged: (1) the nested-metadata parser actually populates `fm.node_kind` for `metadata:\n  node_kind: formula` form, and (2) whether the flat parser misses a node_kind nested under `metadata:`. Let me test the parser directly against the real nested form, and inspect a real node_* memory.

### Assistant | 2026-06-16T22:39:14.942Z

[tool_use: Bash]

### Assistant | 2026-06-16T22:39:16.551Z

[tool_use: Bash]

### User | 2026-06-16T22:39:33.230Z

[tool_result] A nested fm: {"name":"y","node_kind":"formula"}
A nonPromotableReason: node-pointer
B flat node_kind: "course" -> node-pointer
C empty node_kind fm: {"name":"y"} -> null
D false: null | str false: null | str FALSE: null
E ws node_kind: "formula" -> node-pointer

### User | 2026-06-16T22:39:49.718Z

[tool_result] === real node_* memories (sample frontmatter) ===
--- knowledge/memories/reference/node_algorithm_alg_adaptivecontrollermodel.md ---
---
name: node-algorithm-alg_adaptivecontrollermodel
description: Node-indexed pointer — algorithm Algorithm — AdaptiveControllerModel → wiki knowledge/wiki/architecture/algorithms/alg-adaptivecontrollermodel.md
aliases: [node-algorithm-alg-adaptivecontrollermodel, N
... [+1626 chars truncated]

### Assistant | 2026-06-16T22:39:59.681Z

This is the critical verification, and it all holds:

1. **Nested `metadata:\n  node_kind: formula` IS flattened to `fm.node_kind`** (Case A returns `node-pointer`) — the real node_* memories use exactly this nested form, and the flat parser's `^\s*([A-Za-z_][\w-]*):` regex matches the indented key (the indent is consumed by `\s*`). Confirmed against 3 real files.
2. **Empty-string node_kind does NOT over-exclude** (Case C → null) — because `parseMemoryFrontmatter` skips empty values (`if (val === "") continue;`), so `fm.node_kind` is absent; even if it were present, the `.trim()` guard in `nonPromotableReason` handles it.
3. **`false` / `"false"` / `"FALSE"` flags do NOT exclude** (Case D → null) — the `truthy()` helper only matches `true`/`"true"`.
4. **Whitespace-padded values trim correctly** (Case E → node-pointer).
5. **12,858 real node_* files exist** and all carry `node_kind` under `metadata:` — these are exactly the inflated-ref stubs the fix targets. The live run skips 12,893 (node pointers + advisory) with **0 leaking** into candidates.

Now let me verify the counting correctness — specifically whether the exclusion could double-count or interact badly with the `limit` break, and confirm a genuine memory still promotes. Let me check the `idToPath` first-writer-wins interaction (could a node_* pointer "own" an id that a real memory shares, suppressing the real memory's refs?).

### Assistant | 2026-06-16T22:40:09.326Z

[tool_use: Bash]

### User | 2026-06-16T22:40:30.616Z

[tool_result] skipNonProm: 2 (expect 2: node + advisory)
candidates: [ 'reference_real.md refs=4' ]
belowRefs: 4 belowAge: 0 skipType: 0
totalMemories: 7
accounted: 7 == totalMemories: 7 -> true

### Assistant | 2026-06-16T22:40:36.030Z

**Counting integrity is exact**: `skipNonProm(2) + skipType(0) + belowRefs(4) + belowAge(0) + skipExisting(0) + candidates(1) = 7 = totalMemories`. Every parsed memory is accounted for exactly once — no double-counting. The `continue` after the exclusion correctly removes it from the loop before any other counter touches it. The genuine memory (`reference_real`) still promotes with its 4 refs intact, proving no over-exclusion and no ref-suppression from the `idToPath` first-writer-wins interaction.

Let me do a final check on one subtle regression vector: the `limit` interaction and whether the exclusion order matters for the `report.promoted >= limit` break placement, plus confirm the parser's `metadata:` line itself doesn't get mis-captured as a key with a node_kind-like value.

### Assistant | 2026-06-16T22:40:44.146Z

[tool_use: Bash]

### User | 2026-06-16T22:40:59.342Z

[tool_result] body-mention fm: {"name":"x","type":"feedback"} -> null (expect null)
metadata parent key present in fm? false (expect false - empty val skipped)
array node_kind: null (expect null - not string, falls through; array node_kind never arises from parser)
numeric-ish advisoryOnly 1 (string): null (null - only literal true/"true" excludes; acceptable, real flags are bool/true)

### Assistant | 2026-06-16T22:41:22.141Z

All edge cases resolve correctly:
- A body-prose mention of `node_kind: course` does NOT poison fm (frontmatter-only parse, body is sliced off) → not excluded.
- The `metadata:` parent key with empty value is correctly skipped (not a phantom fm key).
- Array/non-string `node_kind` falls through to null — but this never arises from the real parser (frontmatter values are always strings or `[...]`-arrays, and node_kind is never written as an array by `emit-node-memory-pointer.mjs`).

One minor observation worth noting (P2): the `truthy()` helper only matches literal `true`/`"true"`. A frontmatter flag written as `advisoryOnly: 1` or `advisoryOnly: yes` would NOT be excluded. But I verified the real convention uses boolean `true` (per the CLAUDE.md spec: `advisoryOnly:true, mustHumanVerify:true`), so this is not a live gap — just a documented narrowness.

I have completed all verification. Let me compile the findings.

---

VERDICT: PASS

summary: The fix is correct, surgically scoped to the two named files, and verified against the LIVE vault — 0 of 12,858 real `node_*` graph-pointer stubs leak into the 17 candidates (the claimed 54→17 holds; the snapshot now scans 19,443 memories with 12,893 skippedNonPromotable). The exclusion is placed before the type/refs/age gate, counted exactly once per memory (proven: skipNonProm + skipType + belowRefs + belowAge + skipExisting + candidates == totalMemories), and does not suppress or over-exclude any genuine reference/feedback memory. 30/30 tests pass; the nested `metadata:\n  node_kind:` form (the real-world shape) IS flattened to `fm.node_kind` and correctly triggers exclusion.

findings:
- [P2] H:/prism/scripts/promote-memory-to-wiki.mjs:148-149 -- `truthy()` only recognizes boolean `true` and string `"true"`/`"TRUE"`; a frontmatter flag written as `advisoryOnly: 1`, `yes`, or `on` would NOT be excluded and could promote unverified content. Verified the live convention (CLAUDE.md §CLOSE-OUT) uses boolean `true`, so this is 
... [+2042 chars truncated]
