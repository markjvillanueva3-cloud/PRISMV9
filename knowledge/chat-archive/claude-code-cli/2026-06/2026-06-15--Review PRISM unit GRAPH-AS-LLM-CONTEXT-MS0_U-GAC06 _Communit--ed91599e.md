---
type: "chat-session"
source: "claude-code-cli"
session_id: "ed91599e-19b8-4bdb-8ea8-87e47b6ee322"
title: "Review PRISM unit GRAPH-AS-LLM-CONTEXT-MS0/U-GAC06 (CommunitySummaryEngine). CRI"
date: "2026-06-15"
first_ts: "2026-06-15T18:37:00.610Z"
last_ts: "2026-06-15T18:39:20.532Z"
cwd: "H:\\prism-slot-sierra"
messages: 33
user_msgs: 14
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a4e52806f5999ffc6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Review PRISM unit GRAPH-AS-LLM-CONTEXT-MS0/U-GAC06 (CommunitySummaryEngine). CRI

> **claude-code-cli** | 2026-06-15 | 33 msgs (14 user / 19 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a4e52806f5999ffc6.jsonl`

## Transcript

### User | 2026-06-15T18:37:00.610Z

Review PRISM unit GRAPH-AS-LLM-CONTEXT-MS0/U-GAC06 (CommunitySummaryEngine). CRITICAL: your cwd is a different git worktree (H:/prism-slot-sierra) that does NOT have these files. IGNORE cwd, do NOT run git. Use the Read tool on these EXACT ABSOLUTE paths (they exist):
1. H:/prism/mcp-server/src/engines/CommunitySummaryEngine.ts
2. H:/prism/mcp-server/src/__tests__/CommunitySummaryEngine.test.ts
3. H:/prism/mcp-server/src/__tests__/devDispatcher.communitySummary-wire.test.ts
4. H:/prism/scripts/community-summary-gen.mjs
5. H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts  (Grep for: community_summary)
6. H:/prism/mcp-server/src/schemas/devActionSchemas.ts          (Grep for: community_summary)

Spec: collapse the ~3200-engine catalog into per-DOMAIN community summaries <=200 tokens each. Clusters ENGINE_DIGEST.md by keyword-domain (DOMAIN_RULES, first-match), extractive summary default (free/deterministic/bounded), opt-in Ollama (fail-soft). Wired prism_dev:community_summary + scripts/community-summary-gen.mjs. Live: 10 domains, 3222 engines, every summary 80-91 tokens; "Other"=2108 (heuristic leaves cross-cutting engines unclassified -- acknowledged).

Verify and report P0/P1/P2 (file:line + fix), then end with exactly "VERDICT: PASS" or "VERDICT: FAIL":
- The handler reads params correctly (domain optional, useLlm, maxTokens, topK) and returns {success:true, data} (devDispatcher accumulates into `result`); schema matches handler (no drift); ACTIONS tuple contains "community_summary".
- The token-cap truncation is suffix-aware (final string incl. " ...[truncated]" stays <= maxTokens) -- confirm the just-applied fix at the truncation block.
- summarizeAll preserves all engines across clusters (no drops); deterministic order.
- loadCatalog fail-loud if ENGINE_DIGEST.md absent; mtime-cached; the DIGEST_LINE regex correctly parses `- **Name**: desc`.
- The Ollama path is fail-soft on throw AND on empty-string (both -> extractive + warn). No silent Claude spend
... [+219 chars truncated]

### Assistant | 2026-06-15T18:37:06.436Z

I'll systematically read all the relevant files to perform a thorough scrutiny review.

### Assistant | 2026-06-15T18:37:06.822Z

[tool_use: Read]

### Assistant | 2026-06-15T18:37:07.057Z

[tool_use: Read]

### User | 2026-06-15T18:37:09.313Z

[tool_result] 1	/**
2	 * CommunitySummaryEngine -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC06 (slot:sierra)
3	 *
4	 * Collapses the ~3200-engine catalog into per-DOMAIN community summaries so an LLM
5	 * can grasp a cluster in <=200 tokens instead of enumerating ~8000 tokens of engine
6	 * names. Clusters the ENGINE_DIGEST.md catalog by manufacturing domain (keyword
7	 * inference -- the digest is a flat `- **Name**: d
... [+12601 chars truncated]

### User | 2026-06-15T18:37:09.373Z

[tool_result] 1	/**
2	 * CommunitySummaryEngine.test.ts -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC06
3	 *
4	 * Hermetic: injected engine catalog (no ENGINE_DIGEST.md read) + injected Ollama
5	 * caller (no network). Covers the 5 spec tests (happy / empty cluster / Ollama
6	 * unreachable / oversized cluster / token-cap exceeded) + 2 adversarial (Ollama
7	 * returns empty string; 1000-engine single cluster) + clusterin
... [+6179 chars truncated]

### Assistant | 2026-06-15T18:37:15.588Z

[tool_use: Read]

### Assistant | 2026-06-15T18:37:15.610Z

[tool_use: Read]

### User | 2026-06-15T18:37:32.191Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\devDispatcher.communitySummary-wire.test.ts' was already read 4s ago in this session and is unchanged (mtime 1781548477217). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (dis
... [+25 chars truncated]

### User | 2026-06-15T18:37:35.391Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * community-summary-gen.mjs -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC06 (slot:sierra)
4	 *
5	 * CLI over CommunitySummaryEngine: cluster the ENGINE_DIGEST.md catalog by domain
6	 * and emit a token-bounded summary per cluster to state/shared/community-summaries.json.
7	 * The engine is .ts, so we esbuild-bundle it to a gitignored temp ESM and import
8	 * (the graphrag-eval
... [+2903 chars truncated]

### Assistant | 2026-06-15T18:37:38.566Z

[tool_use: Grep]

### Assistant | 2026-06-15T18:37:39.218Z

[tool_use: Grep]

### User | 2026-06-15T18:37:40.362Z

[tool_result] 638-  "code_integrity_validate",
639-  "code_integrity_stats",
640-  \ U-GAC03: CodeGraphProjectionEngine (GRAPH-AS-LLM-CONTEXT-MS0, slot:sierra 2026-06-15)
641-  "code_graph_project",
642-  \ U-GAC06: CommunitySummaryEngine (GRAPH-AS-LLM-CONTEXT-MS0, slot:sierra 2026-06-15)
643:  "community_summary",
644-  \ U-WIRE-DR \ WIRE-UNWIRED-PAPA: DisasterRecoveryEngine surfaces (3 read actions, slot:papa
... [+902 chars truncated]

### User | 2026-06-15T18:37:41.156Z

[tool_result] 135-    hops: z.number().int().min(0).max(12).optional().describe("Ego radius when center is set (default 1)"),
136-    maxFiles: z.number().int().min(1).optional().describe("Walk cap for dir targets (default 2000)"),
137-    maxFileBytes: z.number().int().min(1).optional().describe("Per-file size skip cap in bytes (default 5MB)"),
138-  }).describe("CodeGraphProjectionEngine.project/egoGraph -- T
... [+913 chars truncated]

### Assistant | 2026-06-15T18:37:44.073Z

Now let me read the full handler section to verify parameter passing and result shape:

### Assistant | 2026-06-15T18:37:45.655Z

[tool_use: Grep]

### User | 2026-06-15T18:37:47.219Z

[tool_result] 618-  "frequent_path_track",
619-  "dead_letter_queue_manage",
620-  "utilization_contract_audit",
621-  "capability_index_search",
622-  "report_render",
623-  "standard_dimension_lookup",
624-  "troubleshoot_diagnose_cnc",
625-  "execution_verification_run",
626-  "vision_action_analyze",
627-  "qt_validation_run",
628-  "pdf_handbook_batch_process",
629-  "pdf_source_registry_manage",
630-  "pd
... [+4929 chars truncated]

### Assistant | 2026-06-15T18:37:50.550Z

[tool_use: Read]

### User | 2026-06-15T18:37:58.211Z

[tool_result] 0	/**
1	 * Round-trip wiring test for prism_dev:community_summary
2	 * (GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC06). Invokes THROUGH the registered devDispatcher
3	 * handler (schema validation + dispatch), summarizing the REAL ENGINE_DIGEST.md
4	 * catalog (live-data E2E) -- extractive default, no Ollama, no network.
5	 */
6	import { describe, it, expect, beforeAll, vi } from "vitest";
7	import { registe
... [+2461 chars truncated]

### Assistant | 2026-06-15T18:38:02.843Z

Now let me check the truncation logic more carefully and look for the wire test's dispatcher round-trip pattern:

### Assistant | 2026-06-15T18:38:04.804Z

[tool_use: Grep]

### Assistant | 2026-06-15T18:38:05.964Z

[tool_use: Grep]

### User | 2026-06-15T18:38:07.209Z

[tool_result] 790-        switch (action) {
791-          case "session_boot": {
792:            result = { timestamp: new Date().toISOString() };
793-            \ Multi-chat coordination: register this instance and reap stale claims
794-            try {
--
1283-                const hasErrors = preCheck.includes("❌") && preCheck.includes("FIX BEFORE BUILDING");
1284-                if (hasErrors) {
1285:    
... [+997 chars truncated]

### User | 2026-06-15T18:38:08.028Z

[tool_result] 785-        // was a typo (no such field), so `details` was always silently undefined.
786-        return { content: [{ type: "text" as const, text: JSON.stringify({ error: `Invalid params for ${action}`, details: validation.errorMessage }) }] };
787-      }
788:      let result: any;
789-      try {
790-        switch (action) {
791-          case "session_boot": {
--
11686-          default:
116
... [+414 chars truncated]

### Assistant | 2026-06-15T18:38:12.730Z

Now I have enough data. Let me verify the token-cap truncation math precisely and check the DIGEST_LINE regex against the actual digest format:

### Assistant | 2026-06-15T18:38:13.956Z

[tool_use: Grep]

### Assistant | 2026-06-15T18:38:14.606Z

[tool_use: Grep]

### User | 2026-06-15T18:38:15.497Z

[tool_result] 5:- **AbrasiveJetMachiningEngine**: Physics-Based Abrasive Waterjet Prediction
6:- **AbsorptionChillerEngine**: Absorption refrigeration cycle analysis
7:- **AbstractionHierarchyEngine**: Multi-level tip→principle→law generalization
8:- **AccessControlListEngine**: U-LPR-SEC03
9:- **AccessibilityAnalysisEngine**: Verify tool+holder can reach every feature.
10:- **AccountingHardeningEngine**: SQ4-3
... [+427 chars truncated]

### User | 2026-06-15T18:38:16.571Z

[tool_result] 5-import { z } from "zod";
6-import { log } from "../../utils/Logger.js";
7-import * as fs from "fs";
8-import * as path from "path";
9-import { execSync, execFileSync } from "child_process";
10:import { slimResponse } from "../../utils/responseSlimmer.js";
11-import { safeRegex } from "../../utils/SafetyValidator.js";
12-import { dispatcherError, validateActionParams } from "../../utils/dispatche
... [+820 chars truncated]

### Assistant | 2026-06-15T18:38:19.802Z

Now I have all the data I need. Let me do one final targeted check on the truncation math to confirm the suffix-aware fix is correct:

### Assistant | 2026-06-15T18:38:20.722Z

[tool_use: Read]

### User | 2026-06-15T18:38:22.393Z

[tool_result] 183	    // token-cap: truncate to maxTokens (chars) + warn. Reserve room for the suffix so
184	    // the FINAL string (body + suffix) still fits under the cap (suffix-aware budget).
185	    let truncated = false;
186	    let tokens = this.estimateTokens(summary);
187	    if (tokens > maxTokens) {
188	      const suffix = " ...[truncated]";
189	      const charBudget = Math.max(0, maxTokens * CHAR
... [+383 chars truncated]

### Assistant | 2026-06-15T18:39:20.532Z

Now I have a complete picture. Let me analyze the truncation math edge case and verify all the spec points before writing my verdict.

**Truncation math verification (line 189):**
- `maxTokens * CHARS_PER_TOKEN - suffix.length` = `maxTokens * 4 - 15`
- After slice + word-boundary strip + suffix append, the final string is AT MOST `(maxTokens*4 - 15) + 15 = maxTokens*4` chars.
- `estimateTokens` = `ceil(len / 4)` so final tokens = `ceil(maxTokens*4 / 4)` = `maxTokens`. Correct, cap holds.
- BUT: the word-boundary strip `.replace(/\s+\S*$/, "")` can SHRINK the string below `charBudget`, then the suffix is appended. The estimate re-runs at line 192. The post-truncation `tokens` field could report values slightly under `maxTokens`, which is correct and conservative.
- Edge: `maxTokens=1`, `charBudget = 1*4 - 15 = -11 → Math.max(0,-11) = 0`. `summary = "".replace(...) + suffix = " ...[truncated]"`. Length = 15, `ceil(15/4) = 4`. The field `tokens = 4 > maxTokens = 1`. The hard-cap guarantee is broken for `maxTokens < 4` (approximately, depending on suffix length). However, the schema enforces `maxTokens >= 1` and `<= 300`, and the only caller that sets a small value in the test uses `maxTokens: 50` which is safely above 4.

**The schema min bound for `maxTokens` is `z.number().int().min(1)` (devActionSchemas.ts:143) — so values 1, 2, 3 are schema-valid but break the cap guarantee at line 192.** This is a latent correctness issue.

**Wire test scrutiny — schema rejects maxTokens > 300 test (line 53-57):** The test calls `call(handler, "community_summary", { domain: "Mill", maxTokens: 5000 })` and expects an error match. The schema has `.max(300)`. The handler runs `validateActionParams` against `ACTION_DEV_SCHEMAS` before dispatch. This is correct: schema validation runs first, the handler is not reached, and `{error: "Invalid params…"}` is returned. The test's regex `/Invalid|error|max/i` will match. Correct.

**`summarizeAll` no-drop check:** The test at line 130 of the
... [+5902 chars truncated]
