---
type: "chat-session"
source: "claude-code-cli"
session_id: "dc3f020e-9a94-4310-adf2-a60d9533cfec"
title: "PRISM 3-of-3 scrutiny gate, ARM A (holistic). Review commit 409532c31e on branch"
date: "2026-06-16"
first_ts: "2026-06-16T22:49:01.470Z"
last_ts: "2026-06-16T22:51:09.535Z"
cwd: "H:\\prism-slot-sierra"
messages: 29
user_msgs: 10
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-a7484982e82c419e8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# PRISM 3-of-3 scrutiny gate, ARM A (holistic). Review commit 409532c31e on branch

> **claude-code-cli** | 2026-06-16 | 29 msgs (10 user / 19 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-a7484982e82c419e8.jsonl`

## Transcript

### User | 2026-06-16T22:49:01.470Z

PRISM 3-of-3 scrutiny gate, ARM A (holistic). Review commit 409532c31e on branch cad-fusion-live-ms0 in worktree H:/prism. Grade PASS or FAIL with P0/P1/P2 + file:line.

Inspect it: `cd /h/prism && git show 409532c31e`. Two files changed: scripts/promote-memory-to-wiki.mjs (+ its .test.mjs).

WHAT IT DOES: adds a `nonPromotableReason(fm)` exclusion to the Obsidian-memory -> wiki promoter so graph-node-pointer memories (frontmatter `node_kind`) and explicitly-unverified content (`advisoryOnly`/`mustHumanVerify` YAML-truthy) are never promoted to the canonical wiki. Wired into runMemoryPromotion Pass-2 BEFORE the refs/age/type gate; new report counter `skippedNonPromotable`; CLI summary surfaces `skipNonProm=`. The fix prevents a freeze-disabled nightly cron from bloating the wiki with 34 MIT course/formula audit-pending stubs when it arms.

Review holistically: correctness, the exclusion placement/counting, no over- or under-exclusion, regression risk to the existing promotion path, test quality (real reference-value asserts vs stubs), convention conformance, any inlined constants, security/error-budget. Claims to confirm: 30/30 tests pass; live dry-run 54->17 candidates with 0 node_* leaking. Run the tests yourself if useful (`node --test scripts/promote-memory-to-wiki.test.mjs`). Report PASS/FAIL + findings.

### Assistant | 2026-06-16T22:49:04.053Z

I'll review commit 409532c31e holistically. Let me start by inspecting the commit and reading both files end-to-end.

### Assistant | 2026-06-16T22:49:04.591Z

[tool_use: Bash]

### User | 2026-06-16T22:49:07.869Z

[tool_result] commit 409532c31e4abae5151f858574f412c26fbf3284
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 16 17:45:10 2026 -0500

    [MAIN-FORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-PROMOTE-GATE-HARDEN (slot:sierra): exclude graph-node-pointer + explicitly-unverified memories from wiki promotion
    
    The freeze-disabled vault-promotion cron (install-vault-promotion-cron.ps1 ->
    
... [+15655 chars truncated]

### Assistant | 2026-06-16T22:49:09.378Z

Now let me read the full source file end-to-end to understand the surrounding contract.

### Assistant | 2026-06-16T22:49:09.895Z

[tool_use: Read]

### User | 2026-06-16T22:49:11.682Z

[tool_result] 1	#!/usr/bin/env node
2	// KNOWLEDGE-VAULT-MS0/U-VAULT02 — Memory->Wiki promotion engine (slot:sierra, 2026-06-06).
3	//
4	// Closes the compounding spine the vault was missing: memories that have
5	// proven durable (referenced from >=3 places AND >=7 days old) graduate into
6	// the project-lifetime wiki namespace, per the promotion path defined in
7	// [[reference_u_vault01_knowledge_vault_sche
... [+18412 chars truncated]

### Assistant | 2026-06-16T22:49:13.701Z

Now let me read the full test file end-to-end to assess test quality and the `makeVault` helper.

### Assistant | 2026-06-16T22:49:14.306Z

[tool_use: Read]

### User | 2026-06-16T22:49:15.454Z

[tool_result] 1	// Tests for scripts/promote-memory-to-wiki.mjs (U-VAULT02).
2	// Pure-function units + a hermetic real-FS end-to-end (tmp vault, controlled
3	// `nowMs` for age) so the promotion gate is exercised on real file IO, not mocks.
4	
5	import { test } from "node:test";
6	import assert from "node:assert/strict";
7	import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 
... [+19583 chars truncated]

### Assistant | 2026-06-16T22:49:18.048Z

I've now read both files end-to-end. Let me run the test suite to verify the 30/30 claim, then check the counting-integrity invariant claimed in the commit message.

### Assistant | 2026-06-16T22:49:18.706Z

[tool_use: Bash]

### User | 2026-06-16T22:49:22.861Z

[tool_result]   ...
# Subtest: runMemoryPromotion: --backlink adds an idempotent memory->wiki pointer
ok 28 - runMemoryPromotion: --backlink adds an idempotent memory->wiki pointer
  ---
  duration_ms: 4.1036
  ...
# Subtest: runMemoryPromotion: malformed memory counted, does not crash the run
ok 29 - runMemoryPromotion: malformed memory counted, does not crash the run
  ---
  duration_ms: 3.2649
  ...
# Subtes
... [+284 chars truncated]

### Assistant | 2026-06-16T22:49:24.907Z

30/30 confirmed. Now let me verify the live dry-run claim (54 -> 17 candidates, 0 node_* leaking) and the counting-integrity invariant.

### Assistant | 2026-06-16T22:49:30.066Z

[tool_use: Bash]

### User | 2026-06-16T22:49:37.311Z

[tool_result] totalMemories     = 19453
malformed         = 0
skippedNonPromot  = 12893
skippedType       = 401
belowRefs         = 5357
belowAge          = 733
skippedExisting   = 52
candidates        = 17
--- counting integrity ---
sum(buckets)+cands= 19453   vs totalMemories= 19453   MATCH: true
node_* leaking into candidates: 0 []

### Assistant | 2026-06-16T22:49:42.699Z

The live run confirms the core claims: 17 final candidates, 0 `node_*` leaking, and the counting-integrity invariant holds exactly (12893 + 401 + 5357 + 733 + 52 + 17 = 19453 = totalMemories). 

Note: the run scans the full `H:/prism/knowledge/memories` (19,453 files / 12,893 non-promotable), not the 54-candidate sub-vault the commit message references — the "54 -> 17" was the pre-fix candidate count from the original session's vault state. The fix's effect is sound regardless: 0 node-pointer leak and exact counting integrity. Let me verify the candidate list contains no node/advisory leakage and check the `malformed` double-counting concern against the integrity invariant.

### Assistant | 2026-06-16T22:49:44.891Z

[tool_use: Bash]

### User | 2026-06-16T22:49:54.326Z

[tool_result] === final 17 candidates ===
  feedback_d2_bom_smoke.md (refs 10, age 24d) -> lessons/feedback_d2_bom_smoke.md
  feedback_d2_smoke.md (refs 10, age 24d) -> lessons/feedback_d2_smoke.md
  reference_forge_audit_token_context_2026_05_26.md (refs 3, age 21d) -> reference/reference-forge-audit-token-context-2026-05-26.md
  reference_master_index_filter_contract_fix_2026_05_18.md (refs 3, age 22d) -> ref
... [+1419 chars truncated]

### Assistant | 2026-06-16T22:50:00.196Z

This confirms the commit's own self-disclosed P2 follow-up: 11 of the 17 candidates are `reference_nn_retrain_<ts>` run-logs (machine-generated training logs, not synthesized knowledge) that still clear the gate. The commit explicitly flagged this as out-of-scope and filed to handoff, which is honest (R12). This is correctly scoped out — it's a *separate* signal (run-log detection), not a regression introduced by this change.

Let me verify the `malformed`/counting-integrity edge: malformed files are counted in Pass 1 but excluded from `parsed`, so they never reach Pass 2. Let me confirm the integrity invariant holds across that boundary and check one node_kind memory's actual frontmatter to confirm the exclusion fires on real data.

### Assistant | 2026-06-16T22:50:02.652Z

[tool_use: Bash]

### User | 2026-06-16T22:50:13.623Z

[tool_result] === sample node_kind memories that SHOULD be excluded ===
=== count of node_kind memories ===
0
=== advisoryOnly/mustHumanVerify memories ===
0

### Assistant | 2026-06-16T22:50:16.642Z

Interesting — zero `node_kind` memories at file-start. The 12,893 `skippedNonPromotable` must be matching differently. Let me check how `node_kind` actually appears in the vault (indentation, nesting, or different casing) since the parser flattens nested keys.

### Assistant | 2026-06-16T22:50:18.684Z

[tool_use: Bash]

### User | 2026-06-16T22:50:26.371Z

[tool_result] === grep node_kind anywhere (indented or not) ===
12862
=== sample lines ===
   7634   node_kind: formula
   4388   node_kind: tribal
    550   node_kind: milestone
    124   node_kind: course
    102   node_kind: registry
     61   node_kind: algorithm
      2   (`metadata.node_kind: course|formula`; bodies 1-2 lines like "Pointer: [[mit-x]]. No
      1   node_kind: engine
=== one full sample fil
... [+1382 chars truncated]

### Assistant | 2026-06-16T22:50:33.299Z

The `node_kind` lines are indented (`  node_kind: formula`) — they are nested under a `metadata:` block. The parser's regex `/^\s*([A-Za-z_][\w-]*):\s*(.*)$/` matches leading whitespace and flattens nested keys (first-writer-wins), so `metadata.node_kind: formula` becomes top-level `fm.node_kind`. That's why 12,862 files match and the exclusion fires correctly. The flattening behavior is documented in the existing `parseMemoryFrontmatter` contract (lines 73-74). This is well-aligned — the helper relies on existing parser behavior rather than re-implementing.

Let me do a final verification: confirm there's no false-positive over-exclusion where a legitimate top-level `node_kind` field could collide, and check that the `skippedNonPromotable` count (12,893) reasonably matches the grep count (12,862) plus advisory-only files.

### Assistant | 2026-06-16T22:50:37.527Z

[tool_use: Bash]

### User | 2026-06-16T22:50:45.373Z

[tool_result] === node_kind file count (grep) ===
12860
=== advisoryOnly/mustHumanVerify truthy file count ===
35
=== overlap: files with node_kind AND in mem root used by script (DEFAULT_MEMORY_ROOT=H:/prism/knowledge/memories) ===
Note: script walkMd skips _archive/archive/quarantine/dot dirs
=== archived node_kind files (excluded from walk) ===
0

### Assistant | 2026-06-16T22:51:09.535Z

The counts reconcile: 12,860 `node_kind` files + ~35 advisory files ≈ 12,893 `skippedNonPromotable` (small delta is the overlap of files carrying both flags, counted once since `nonPromotableReason` short-circuits on `node_kind` first). The exclusion fires on real data exactly as designed, and the counting integrity invariant holds at the full-vault scale (sum of all buckets + candidates == totalMemories exactly).

I have everything I need. Here is my verdict.

---

VERDICT: PASS

summary: Commit 409532c31e adds a clean, well-isolated `nonPromotableReason(fm)` exclusion to the memory→wiki promoter, correctly placed BEFORE the refs/age/type gate so popular-but-junk graph-node-pointer stubs and explicitly-unverified memories can never graduate to the canonical wiki. I verified 30/30 tests pass, the live full-vault dry-run yields 17 final candidates with 0 `node_*` leakage, the counting-integrity invariant holds exactly (12893+401+5357+733+52+17 == 19453 totalMemories), and the exclusion fires on real data (12,860 `node_kind` + ~35 advisory files matched). The change is surgical, additive, regression-safe, and the commit's R12 disclosures (54→17 was the original-session vault; nn-retrain run-logs scoped out) are honest.

findings:
  - [P2] `scripts/promote-memory-to-wiki.mjs:286` — As the commit itself discloses, 11 of the 17 surviving candidates are `reference_nn_retrain_<ts>` machine-generated run-logs that still clear the gate (verified live: refs 5-10, age 8-23d). These are not synthesized knowledge and arguably should not promote either, but they carry no `node_kind`/advisory flag so this fix correctly does not address them. — Out of scope for this commit; properly filed to handoff as a separate run-log signal. No action required here.
  - [P2] `scripts/promote-memory-to-wiki.mjs:147` — `nonPromotableReason` short-circuits on `node_kind` before checking the advisory flags, so a memory carrying BOTH always reports `"node-pointer"`. This is correct for exclusion (ei
... [+2169 chars truncated]
