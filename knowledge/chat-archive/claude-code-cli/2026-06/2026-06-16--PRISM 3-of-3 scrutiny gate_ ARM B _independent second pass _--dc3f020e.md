---
type: "chat-session"
source: "claude-code-cli"
session_id: "dc3f020e-9a94-4310-adf2-a60d9533cfec"
title: "PRISM 3-of-3 scrutiny gate, ARM B (independent second pass — do NOT assume arm A"
date: "2026-06-16"
first_ts: "2026-06-16T22:49:07.858Z"
last_ts: "2026-06-16T22:53:15.725Z"
cwd: "H:\\prism-slot-sierra"
messages: 66
user_msgs: 23
assistant_msgs: 43
raw_file: "H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-af532bf53017a0c5a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# PRISM 3-of-3 scrutiny gate, ARM B (independent second pass — do NOT assume arm A

> **claude-code-cli** | 2026-06-16 | 66 msgs (23 user / 43 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-af532bf53017a0c5a.jsonl`

## Transcript

### User | 2026-06-16T22:49:07.858Z

PRISM 3-of-3 scrutiny gate, ARM B (independent second pass — do NOT assume arm A caught everything). Review commit 409532c31e on cad-fusion-live-ms0 in H:/prism. Weight toward TEST INTEGRITY, dispatcher/consumer wiring completeness, and inlined-constant detection. Grade PASS or FAIL with P0/P1/P2 + file:line.

Inspect: `cd /h/prism && git show 409532c31e`. The change adds an exclusion gate (`nonPromotableReason`) to scripts/promote-memory-to-wiki.mjs (skip `node_kind` graph-pointer memories + `advisoryOnly`/`mustHumanVerify` unverified content from wiki promotion) + 7 new tests.

VERIFY: (1) Do the 7 new tests actually fail if the production logic regresses (no toBeDefined/tautology stubs, no .skip/.only)? Is there a no-over-blocking regression test (a clean atom STILL promotes)? (2) Is the consuming cron (.claude/helpers/install-vault-promotion-cron.ps1, runs `--apply --backlink`) or any --json consumer broken by the new `skippedNonPromotable` field / new summary token? (3) Any hardcoded constants that should be imported? (4) Is the premise sound — could excluding ALL node_kind memories drop something legitimately wiki-worthy? Argue the counter-case. Report PASS/FAIL + findings.

### Assistant | 2026-06-16T22:49:14.580Z

I'll review commit 409532c31e with focus on test integrity, wiring completeness, and inlined constants. Let me start by examining the commit.

### Assistant | 2026-06-16T22:49:14.765Z

[tool_use: Bash]

### User | 2026-06-16T22:49:20.084Z

[tool_result] commit 409532c31e4abae5151f858574f412c26fbf3284
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 16 17:45:10 2026 -0500

    [MAIN-FORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-PROMOTE-GATE-HARDEN (slot:sierra): exclude graph-node-pointer + explicitly-unverified memories from wiki promotion
    
    The freeze-disabled vault-promotion cron (install-vault-promotion-cron.ps1 ->
    
... [+2601 chars truncated]

### Assistant | 2026-06-16T22:49:22.561Z

Let me read the full diff and both files end to end.

### Assistant | 2026-06-16T22:49:23.218Z

[tool_use: Bash]

### User | 2026-06-16T22:49:25.245Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-06-16T22:49:27.243Z

The diff content wasn't shown fully. Let me read both files end to end directly.

### Assistant | 2026-06-16T22:49:27.367Z

[tool_use: Read]

### User | 2026-06-16T22:49:27.864Z

[tool_result] read-once-guard: 'H:\prism\scripts\promote-memory-to-wiki.mjs' was already read 17s ago in this session and is unchanged (mtime 1781649743850). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-16T22:49:30.645Z

The guard says it was already read, but I don't have it in context yet. Let me get the full diff via a modified command and read the test file.

### Assistant | 2026-06-16T22:49:31.230Z

[tool_use: Bash]

### User | 2026-06-16T22:49:35.107Z

[tool_result] commit 409532c31e4abae5151f858574f412c26fbf3284
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 16 17:45:10 2026 -0500

    [MAIN-FORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-PROMOTE-GATE-HARDEN (slot:sierra): exclude graph-node-pointer + explicitly-unverified memories from wiki promotion
    
    The freeze-disabled vault-promotion cron (install-vault-promotion-cron.ps1 ->
    
... [+6145 chars truncated]

### Assistant | 2026-06-16T22:49:37.611Z

Now let me read the full production file to understand the surrounding contract, and the test file end to end.

### Assistant | 2026-06-16T22:49:37.949Z

[tool_use: Bash]

### User | 2026-06-16T22:49:41.587Z

[tool_result]      1	#!/usr/bin/env node
     2	// KNOWLEDGE-VAULT-MS0/U-VAULT02 — Memory->Wiki promotion engine (slot:sierra, 2026-06-06).
     3	//
     4	// Closes the compounding spine the vault was missing: memories that have
     5	// proven durable (referenced from >=3 places AND >=7 days old) graduate into
     6	// the project-lifetime wiki namespace, per the promotion path defined in
     7	// [[refer
... [+19739 chars truncated]

### Assistant | 2026-06-16T22:49:43.915Z

Now the full test file.

### Assistant | 2026-06-16T22:49:44.441Z

[tool_use: Bash]

### User | 2026-06-16T22:49:50.190Z

[tool_result]      1	// Tests for scripts/promote-memory-to-wiki.mjs (U-VAULT02).
     2	// Pure-function units + a hermetic real-FS end-to-end (tmp vault, controlled
     3	// `nowMs` for age) so the promotion gate is exercised on real file IO, not mocks.
     4	
     5	import { test } from "node:test";
     6	import assert from "node:assert/strict";
     7	import { mkdtempSync, mkdirSync, writeFileSync, readF
... [+20655 chars truncated]

### Assistant | 2026-06-16T22:49:52.810Z

Now let me verify the consumers. The task asks about the cron installer and any `--json` consumer. Let me check the cron PowerShell installer and grep for other consumers of this script and the report fields.

### Assistant | 2026-06-16T22:49:53.685Z

[tool_use: Bash]

### User | 2026-06-16T22:49:57.930Z

[tool_result]      1	# install-vault-promotion-cron.ps1 — OBSIDIAN-VAULT-OPS / U-VAULT-MAINT-CRON
     2	# Register a durable Windows Scheduled Task that runs the Memory->Wiki promotion
     3	# (promote-memory-to-wiki.mjs) nightly. Closes the "promotion runs only by hand"
     4	# gap from the 2026-06-08 vault audit (the engine + script work but were never
     5	# scheduled, so durable memories never auto-gra
... [+5555 chars truncated]

### Assistant | 2026-06-16T22:50:01.135Z

The cron invokes `--apply --backlink` and does NOT parse stdout in any structured way — it just runs the script. So the new `skipNonProm` summary token and `skippedNonPromotable` JSON field cannot break the cron. Now let me search for any OTHER consumer that parses the report fields or the summary line (e.g. dashboards, other scripts, tests).

### Assistant | 2026-06-16T22:50:02.837Z

[tool_use: Grep]

### Assistant | 2026-06-16T22:50:03.572Z

[tool_use: Grep]

### User | 2026-06-16T22:50:10.753Z

[tool_result] Found 20 files
H:\prism\knowledge\memories\reference\reference_sierra_vault_promote_gate_harden_2026_06_16.md
H:\prism\scripts\promote-memory-to-wiki.test.mjs
H:\prism\scripts\promote-memory-to-wiki.mjs
H:\prism\mcp-server\src\engines\McxBatchExtractorEngine.ts
H:\prism\mcp-server\src\engines\MINBatchExtractorEngine.ts
H:\prism\mcp-server\src\__tests__\McxBatchExtractorEngine.test.ts
H:\prism\mcp-
... [+851 chars truncated]

### User | 2026-06-16T22:50:10.814Z

[tool_result] Found 30 files
H:\prism\mcp-server\data\state\session-file-ownership.json
H:\prism\knowledge\memories\reference\reference_sierra_vault_promote_gate_harden_2026_06_16.md
H:\prism\knowledge\memories\reference\reference_sierra_open_threads_context_map_2026_06_10.md
H:\prism\knowledge\memories\reference\reference_obsidian_vault_audit_2026_06_08.md
H:\prism\knowledge\memories\reference\reference_obsidi
... [+1649 chars truncated]

### Assistant | 2026-06-16T22:50:15.406Z

The `skippedType`/`belowRefs`/etc. matches in the McxBatchExtractor/Marketplace engines are unrelated (different `skippedType` semantics). The relevant consumers are: the cron installer (`.ps1`), the cron installer test (`install-vault-crons.test.mjs`), and `vault-rot-sentinel.mjs`. Let me check the cron test and the vault-rot sentinel to confirm neither parses the summary token or JSON fields that changed.

### Assistant | 2026-06-16T22:50:17.090Z

[tool_use: Bash]

### User | 2026-06-16T22:50:23.644Z

[tool_result] .claude/helpers/install-vault-crons.test.mjs:27:    targetScript: "promote-memory-to-wiki.mjs --apply --backlink",
scripts/vault-rot-sentinel.mjs:12:// extraction + normId from promote-memory-to-wiki.mjs so there is ONE source of
scripts/vault-rot-sentinel.mjs:19://   node scripts/vault-rot-sentinel.mjs --json           # machine report
scripts/vault-rot-sentinel.mjs:26:import { extractWikilinkTar
... [+831 chars truncated]

### Assistant | 2026-06-16T22:50:29.613Z

Key findings on consumers:

1. **`vault-rot-sentinel.mjs`** imports only `extractWikilinkTargets` and `normId` (line 26) — pure functions, unchanged by this commit. Not affected.
2. **`install-vault-crons.test.mjs`** (line 27) only asserts the `targetScript` string `"promote-memory-to-wiki.mjs --apply --backlink"` — unchanged. Not affected.
3. **`install-vault-promotion-cron.ps1`** runs the script without parsing stdout/JSON. Not affected.

No consumer parses the `skippedType`/`belowRefs` summary token order or the JSON report shape. The new `skippedNonPromotable` field is purely additive to the JSON object, and the summary string change inserts a new `skipNonProm=N` token (also additive). No downstream breakage.

Now let me verify the 7 new tests actually run and pass, and that none are stubs/skips. Let me also confirm there are no `.skip`/`.only` and run the suite.

### Assistant | 2026-06-16T22:50:31.063Z

[tool_use: Bash]

### User | 2026-06-16T22:50:37.178Z

[tool_result] ---SKIP/ONLY SCAN DONE---

### Assistant | 2026-06-16T22:50:39.464Z

No `.skip`/`.only`/`toBeDefined`/`todo`. Now let me run the test suite to confirm 30/30 pass and that the new tests are real.

### Assistant | 2026-06-16T22:50:40.119Z

[tool_use: Bash]

### User | 2026-06-16T22:50:45.086Z

[tool_result]   ...
# Subtest: runMemoryPromotion: --backlink adds an idempotent memory->wiki pointer
ok 28 - runMemoryPromotion: --backlink adds an idempotent memory->wiki pointer
  ---
  duration_ms: 5.7324
  ...
# Subtest: runMemoryPromotion: malformed memory counted, does not crash the run
ok 29 - runMemoryPromotion: malformed memory counted, does not crash the run
  ---
  duration_ms: 4.008
  ...
# Subtest
... [+284 chars truncated]

### Assistant | 2026-06-16T22:50:47.891Z

30/30 pass, 0 skipped/todo. Now let me verify the tests are NOT tautologies — that they would actually FAIL if the production logic regressed. I'll do a mutation test: revert the production change in a copy and confirm the new tests go red.

### Assistant | 2026-06-16T22:50:51.618Z

[tool_use: Bash]

### User | 2026-06-16T22:50:56.154Z

[tool_result] not ok 13 - nonPromotableReason: node_kind graph-pointer is excluded
not ok 14 - nonPromotableReason: advisoryOnly / mustHumanVerify (YAML-truthy spellings) excluded
not ok 24 - runMemoryPromotion: never promotes a node_kind graph-pointer (inflated index-hub refs)
not ok 25 - runMemoryPromotion: never promotes explicitly-unverified (advisoryOnly/mustHumanVerify) content
# tests 30
# pass 26
# fail
... [+38 chars truncated]

### Assistant | 2026-06-16T22:50:59.811Z

Disabling the gate turns exactly the 4 unit/integration tests for the new logic RED — they are not tautologies. Now let me run a second mutation to confirm the over-blocking guard tests are real: make the gate over-aggressive (always return a reason), and confirm the "clean atom still promotes" regression tests catch it.

### Assistant | 2026-06-16T22:51:02.687Z

[tool_use: Bash]

### User | 2026-06-16T22:51:06.868Z

[tool_result] not ok 13 - nonPromotableReason: node_kind graph-pointer is excluded
not ok 14 - nonPromotableReason: advisoryOnly / mustHumanVerify (YAML-truthy spellings) excluded
not ok 15 - nonPromotableReason: a clean knowledge atom is promotable (null) -- no over-blocking
not ok 16 - nonPromotableReason: garbage fm fails open to null (no crash)
not ok 21 - runMemoryPromotion: promotes a durable (refs>=3, ol
... [+865 chars truncated]

### Assistant | 2026-06-16T22:51:13.315Z

The over-block mutant (gate excludes everything) turns the over-block guard test (#15) and the "genuine atom STILL promotes" regression test (#26) RED, plus all the integration tests that promote real atoms. The no-over-blocking regression test (the one the prompt specifically asked about) is genuinely load-bearing.

Confirmed both directions:
- **Disable gate** → 4 new gate tests fail (the gate is actually checked).
- **Over-block gate** → tests #15 and #26 fail (over-blocking is caught; clean atoms must still promote).

Now let me check inlined constants. The frozen sets are `node_kind` and the truthy spellings `["true","1","yes","on"]`. Let me check whether there's a canonical source for "advisoryOnly/mustHumanVerify" semantics or YAML-truthy parsing elsewhere in the repo that this duplicates, and whether `node_kind` values are defined canonically anywhere.

### Assistant | 2026-06-16T22:51:14.727Z

[tool_use: Grep]

### Assistant | 2026-06-16T22:51:15.897Z

[tool_use: Grep]

### User | 2026-06-16T22:51:16.131Z

[tool_result] H:\prism\scripts\audit-wiki-coverage.mjs:239:node_kind_coverage_pct: ${summary.coveragePct}
H:\prism\scripts\build-node-capability-index.test.mjs:15:  node_kind: algorithm
H:\prism\scripts\build-node-capability-index.test.mjs:67:  node_kind: engine
H:\prism\scripts\build-node-capability-index.mjs:75:  const kind = fm.node_kind;
H:\prism\scripts\generate-unwired-engine-wiki.test.mjs:25:    assert.m
... [+2436 chars truncated]

### User | 2026-06-16T22:51:16.908Z

[tool_result] H:\prism\scripts\claude-md-collapse-milestones.mjs:62:[Omitted long matching line]
H:\prism\scripts\course-to-tribal-tips.mjs:259:// Wrap tips with provenance envelope. `advisoryOnly` + `mustHumanVerify` +
H:\prism\scripts\course-data-router.mjs:270:  lines.push(`**Advisory:** \`advisoryOnly: ${ledger.advisoryOnly}\` · \`mustHumanVerify: ${ledger.mustHumanVerify}\``);
H:\prism\scripts\feature-gap-
... [+2421 chars truncated]

### Assistant | 2026-06-16T22:51:26.105Z

This is informative for the premise check. Two important observations:

1. **`node_kind` is not a constant defined in a canonical source** — it's a frontmatter key emitted by `mit-extracted-node-emitter.mjs` (values `course`, `formula`) and `emit-node-memory-pointer.mjs` (values like `engine`, `algorithm`). The new gate checks for *presence* of any non-empty `node_kind` string, not against an enumerated set. So there is no canonical constant being inlined here — the check is presence-based, which is the correct and robust choice (it covers all node kinds: course/formula/engine/algorithm). No inlined-constant violation.

2. **`advisoryOnly`/`mustHumanVerify`** are an established repo-wide convention (the "advisory provenance envelope" used by `feature-gap-classifier`, `course-data-router`, `generate-dormant-engine-roadmap`, `stub-class-audit`, etc.). These memories self-declare "verify before trusting." The gate correctly targets exactly this convention. The YAML-truthy spelling set `["true","1","yes","on"]` is a small local literal — there's no shared YAML-truthy helper in the repo to import (these other sites write `: true` booleans directly), so this is not a duplication of an importable constant. Acceptable as a local literal, well-commented.

Now let me confirm the premise counter-case: **could excluding ALL `node_kind` memories drop something legitimately wiki-worthy?** Let me check how `emit-node-memory-pointer.mjs` produces bodies, and whether any `node_kind` memory could carry genuine synthesized knowledge (not just a stub pointer).

### Assistant | 2026-06-16T22:51:26.557Z

[tool_use: Read]

### User | 2026-06-16T22:51:27.376Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * emit-node-memory-pointer.mjs (pure library)
4	 *
5	 * For each wiki entry that documents a graph node (engine, algorithm, formula,
6	 * action, skill, hook, milestone, registry, test, dispatcher, frontend, layer,
7	 * domain, monolith-module, course, tribal-category), emit a lightweight
8	 * memory-vault pointer at
9	 *   knowledge/memories/reference/node_<kind>_<s
... [+7896 chars truncated]

### Assistant | 2026-06-16T22:51:41.238Z

This is decisive for the premise check. Every `node_kind` memory is generated by `emit-node-memory-pointer.mjs` (or `mit-extracted-node-emitter.mjs`), and by construction it is a thin pointer whose authoritative content already lives in the wiki (`wiki_path` frontmatter + `[[wikislug]]` link in body). Crucially:

- The pointer's whole purpose is to point AT an existing wiki entry (`> The authoritative documentation is in the wiki entry below`). Promoting a node-pointer back into the wiki would be a circular re-promotion of content the wiki already holds.
- Human free-text appended below the `AUTO-NODE-MEMORY-POINTER` markers ("Human notes") is the one place a `node_kind` memory could carry genuine synthesized knowledge. But that human knowledge belongs in the wiki entry the pointer references, not promoted as a duplicate `node_<kind>_<slug>` wiki page. So the exclusion premise holds: **no `node_kind` memory is legitimately wiki-worthy as its own promoted entry** — its knowledge either already IS in the wiki or belongs there directly.

The counter-case is therefore weak: the worst plausible loss is a node-pointer with rich human notes, but that's a content-placement problem (notes should go in the referenced wiki entry), not a promotion the gate should allow. The gate is sound.

Let me do a final check on the test-quality concern the prompt raised about the `node_kind: ""` empty-string case and confirm the `truthy` helper handles the documented YAML-falsy spellings, then verify counting integrity (the commit message claims `skipNonProm + skipType + belowRefs + belowAge + skipExisting + candidates == totalMemories`). Let me verify whether that invariant actually holds in code, since `nonPromotableReason` short-circuits before `type`/`refs`/`age` — a node-pointer of a NON-promotable type is counted once (good), but I want to confirm no double-count and that the `limit` break path doesn't corrupt the invariant.

### Assistant | 2026-06-16T22:51:51.702Z

[tool_use: Bash]

### User | 2026-06-16T22:51:58.645Z

[tool_result] node:internal/modules/run_main:122
    triggerUncaughtException(
    ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'H:\prism\tmp\scripts\promote-memory-to-wiki.mjs' imported from H:\prism\tmp\count-integrity-check.mjs
Did you mean to import "../scripts/promote-memory-to-wiki.mjs"?
    at finalizeResolution (node:internal/modules/esm/resolve:275:11)
    at moduleResolve (node:internal/
... [+594 chars truncated]

### Assistant | 2026-06-16T22:52:00.656Z

Relative path issue — the file is in `tmp/`. Let me fix the import path.

### Assistant | 2026-06-16T22:52:10.098Z

[tool_use: Bash]

### User | 2026-06-16T22:52:15.615Z

[tool_result] {"totalMemories":8,"malformed":1,"skippedNonPromotable":2,"skippedType":1,"belowRefs":4,"belowAge":0,"skippedExisting":0,"candidates":1}
LHS(buckets)= 8  totalMemories= 8  INVARIANT lhs==totalMemories: true

### Assistant | 2026-06-16T22:52:23.144Z

Counting integrity holds: with a mixed input (node-pointer + advisory + project-type + below-refs + genuine + malformed), the buckets `skipNonProm(2) + skipType(1) + belowRefs(4) + belowAge(0) + skipExisting(0) + candidates(1) = 8 == totalMemories(8)`. The `malformed(1)` is correctly excluded from `totalMemories` (counted in Pass 1 before `parsed`), so the invariant is well-formed and verified — no double-counting, the new bucket slots in cleanly before the existing gates.

Note one nuance I verified: the node-pointer (`node_course_x`) is type `reference` (a promotable type) but is counted in `skipNonProm`, NOT `skipType` — because the exclusion runs first and `continue`s. This is correct and exactly the intended behavior (a node-pointer of a promotable type would otherwise leak through). The 2 in `skipNonProm` = node-pointer + advisory, both correctly diverted.

I have everything I need. Let me confirm there are no stray smart-quotes/em-dashes or non-ASCII in the changed lines of the production file (the comment uses `--` which is ASCII).

### Assistant | 2026-06-16T22:52:25.300Z

[tool_use: Bash]

### User | 2026-06-16T22:52:30.070Z

[tool_result] grep: -P supports only unibyte and UTF-8 locales
ASCII-CLEAN (new gate block)
grep: -P supports only unibyte and UTF-8 locales
ASCII-CLEAN (Pass-2 hunk)

### Assistant | 2026-06-16T22:52:32.730Z

The `-P` locale warning means the byte-class check didn't run reliably. Let me verify ASCII-cleanliness with a tool-independent method.

### Assistant | 2026-06-16T22:52:35.088Z

[tool_use: Bash]

### User | 2026-06-16T22:52:35.766Z

[tool_result] PRISM MCP DISCONNECTED -- ENFORCED CHECK (your prism MCP tools are dead this session)
   THIS chat's bridge is stale-heartbeat (pid 35996 gone) | fleet-wide: 0 mcp-http-bridge processes running (enum-cache 203s old).
   The daemon (:3100) may be UP, but THIS session has no live MCP bridge -- every mcp__prism__* call will fail.
   This block fires ONCE per disconnect episode (~3min), then degraded-
... [+521 chars truncated]

### Assistant | 2026-06-16T22:52:38.044Z

That was an MCP-bridge advisory block, not my command failing. Let me re-run the ASCII check (it doesn't use MCP).

### Assistant | 2026-06-16T22:52:40.146Z

[tool_use: Bash]

### User | 2026-06-16T22:52:46.152Z

[tool_result] ASCII-CLEAN on all changed production lines

### Assistant | 2026-06-16T22:53:15.725Z

All changed production lines are ASCII-clean. I have completed a thorough independent second-pass review. Here is my verdict.

---

VERDICT: PASS

summary: Commit 409532c31e adds a sound, well-tested `nonPromotableReason()` exclusion gate to `scripts/promote-memory-to-wiki.mjs` that blocks graph-node-pointer (`node_kind`) and explicitly-unverified (`advisoryOnly`/`mustHumanVerify`) memories from wiki promotion. I verified by mutation testing that all 7 new tests are load-bearing (not tautologies), confirmed no consumer is broken by the additive `skippedNonPromotable` field / `skipNonProm` summary token, found no inlined constants requiring import, and confirmed the exclusion premise is sound (the counter-case is weak). Counting integrity holds.

findings: none

What I verified (so the PASS is auditable):

1. **Test integrity (mutation-proven, not just "30/30 green").**
   - `scripts/promote-memory-to-wiki.test.mjs` — no `.skip`/`.only`/`toBeDefined`/`.todo`; suite runs 30/30 pass, 0 skipped/todo.
   - Mutation A (force `nonPromotableReason` to always return `null`): exactly tests #13, #14, #24, #25 go RED — proves the gate is actually exercised, no tautology.
   - Mutation B (force the gate to over-block everything): the no-over-blocking guard at `promote-memory-to-wiki.test.mjs:103` (#15) AND the "genuine atom STILL promotes" regression at `:249` (#26) both go RED — proves the over-blocking regression test the prompt asked about is genuinely load-bearing. A clean atom still promoting is verified.
   - YAML-truthy coverage is real: `:95-101` asserts `true`/`"true"`/`"TRUE"`/`"1"`/`"yes"`/`"on"`; `:107-110` asserts falsy spellings (`"0"`/`"no"`/`"off"`) do NOT exclude; `:112-117` asserts garbage `fm` fails open to `null` without crashing — matching production `promote-memory-to-wiki.mjs:146-154`.

2. **Consumer / wiring completeness — nothing breaks.**
   - `.claude/helpers/install-vault-promotion-cron.ps1:58` runs `promote-memory-to-wiki.mjs --apply --backlink` and 
... [+3203 chars truncated]
