---
type: "chat-session"
source: "claude-code-cli"
session_id: "087e5978-f3ed-4657-820e-aed49ae8aa0d"
title: "Adversarially verify the staged rewrite of the PRISM \"tribal-knowledge\" galaxy C"
date: "2026-06-13"
first_ts: "2026-06-13T22:28:21.396Z"
last_ts: "2026-06-13T22:32:00.774Z"
cwd: "H:\\PRISM"
messages: 49
user_msgs: 22
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-a67766a208b4751cc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# Adversarially verify the staged rewrite of the PRISM "tribal-knowledge" galaxy C

> **claude-code-cli** | 2026-06-13 | 49 msgs (22 user / 27 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-a67766a208b4751cc.jsonl`

## Transcript

### User | 2026-06-13T22:28:21.396Z

Adversarially verify the staged rewrite of the PRISM "tribal-knowledge" galaxy CLAUDE.md. Grade PASS or FAIL.

READ:
1. The DRAFT: H:/prism/state/shared/slot-claude-md-drafts/tribal-knowledge.md
2. The assessment spec: H:/prism/state/shared/slot-claude-md-assessment/tribal-knowledge.md
3. The template: H:/prism/state/shared/slot-claude-md-assessment/_TEMPLATE.md
4. The CURRENT live file: H:/prism/mcp-server/src/engines/tribal-knowledge/CLAUDE.md

CHECK (be adversarial -- the draft was written by a cheaper model):
1. FABRICATION (the top risk): spot-check 4-6 of the engine/action/path/hook names the draft asserts -- Glob/Grep/Read to confirm each EXISTS. Any fabricated/nonexistent symbol that is NOT marked "// UNVERIFIED" = FAIL.
2. SAFETY SECTIONS intact: §0 universal-core pointer present; §4 constants/data-paths (NEVER-inline rule) present; §5 domain gotchas/safety present; §6 what-NOT-to-do present. Any of these MISSING or gutted of its safety numerics = FAIL.
3. NO LOSS: did the draft drop any load-bearing content from the CURRENT file that the assessment did NOT mark DROP? (e.g. a real domain gotcha, a units rule, a dispatcher action.) Material loss = FAIL.
4. TEMPLATE conformance: follows the 14-section order; token-lean (80-160 lines, allow up to ~180 for deep domains); boilerplate collapsed to the §0 pointer.
5. ACCURACY: the domain claims are correct for tribal-knowledge (not copied from another galaxy).

Return: "VERDICT: PASS" or "VERDICT: FAIL" then a short bullet list of issues (with the specific fabricated symbol or missing section if FAIL). If PASS, note any P2 nits to fix on apply.

### Assistant | 2026-06-13T22:28:30.073Z

I'll read all four files in parallel to do a thorough adversarial review.

### Assistant | 2026-06-13T22:28:30.382Z

[tool_use: Read]

### Assistant | 2026-06-13T22:28:30.776Z

[tool_use: Read]

### Assistant | 2026-06-13T22:28:31.160Z

[tool_use: Read]

### Assistant | 2026-06-13T22:28:31.302Z

[tool_use: Read]

### User | 2026-06-13T22:28:45.284Z

[tool_result] 1	# Tribal-Knowledge Galaxy — Domain-local CLAUDE.md (P1 Galactic Center, populated 2026-06-09)
2	
3	> Auto-loads when editing under `engines/tribal-knowledge/`. **Populated 2026-06-09** (domain-knowledge core grounded from PATHS/MEMORY/synthesis). No canonical slot — golf hosts hygiene of tribal-tip pipeline; per-domain tribal tips live in respective galaxy MEMORY.md indexes.
4	
5	## Scope
6	Oper
... [+8617 chars truncated]

### User | 2026-06-13T22:28:45.286Z

[tool_result] 1	# CANONICAL PER-SLOT GALAXY CLAUDE.md TEMPLATE
2	
3	> Synthesis lead output, 2026-06-13. Source: 34 domain-expert galaxy assessments in this directory
4	> (`state/shared/slot-claude-md-assessment/*.md`), every one read end-to-end.
5	> This file is the LOCKED skeleton every galaxy `mcp-server/src/engines/<galaxy>/CLAUDE.md` is rewritten to.
6	> Target per-galaxy size: **80–160 lines** (replaces t
... [+31609 chars truncated]

### User | 2026-06-13T22:28:45.287Z

[tool_result] 1	# tribal-knowledge Galaxy — fleet-managed (no dedicated slot; golf owns pipeline hygiene)
2	> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
3	> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
4	> → `H:/prism/CLAUDE.md`. THIS file = tribal-knowledge domain doctrine ONLY; never re-inline un
... [+12701 chars truncated]

### User | 2026-06-13T22:28:45.288Z

[tool_result] 1	# tribal-knowledge — fleet-managed
2	
3	## Current state
4	
5	**Size:** ~3,800 bytes / 85 lines (CLAUDE.md). MEMORY.md ~4,100 bytes / 110 lines.
6	
7	**Quality grade: PARTIAL**
8	
9	The file was auto-populated 2026-06-09 by `scripts/fill-galaxy-claudemd-domain.mjs` (Ollama distillation from PATHS/MEMORY/synthesis). It has real structure and several accurate pointers but has significant problems:
... [+15638 chars truncated]

### Assistant | 2026-06-13T22:28:48.654Z

Now I need to spot-check the specific claims in the draft. Let me verify the key engine names, dispatcher actions, script paths, and hook paths simultaneously.

### Assistant | 2026-06-13T22:28:49.807Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:28:50.199Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:28:50.635Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:28:51.336Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:28:52.095Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:28:52.349Z

[tool_use: Glob]

### User | 2026-06-13T22:29:25.808Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T22:29:25.947Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T22:29:26.208Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T22:29:26.390Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T22:29:26.422Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T22:29:26.423Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-13T22:29:28.615Z

Glob is timing out on the full tree. Let me use Bash with targeted paths instead.

### Assistant | 2026-06-13T22:29:29.883Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:29:30.258Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:29:30.690Z

[tool_use: Bash]

### User | 2026-06-13T22:30:03.266Z

[tool_result] audit-tribal-coverage.mjs
audit-tribal-coverage.test.mjs
audit-tribal-coverage-by-domain.mjs
audit-tribal-coverage-by-domain.test.mjs
catalog-jm-die-tribal-wiki-corpus.mjs
course-to-tribal-tips.mjs
course-to-tribal-tips.test.mjs
distill-tribal.mjs
distill-tribal.test.mjs
embed-cited-tips-into-tribal-index.mjs
embed-cited-tips-into-tribal-index.test.mjs
embed-engines-into-tribal-index.mjs
embed-eng
... [+1384 chars truncated]

### User | 2026-06-13T22:30:03.276Z

[tool_result] extraction-to-tribal.mjs
stop-tribal-distill-suggest.mjs
tribal-autowire.mjs
tribal-by-domain-inject.mjs
tribal-by-domain-inject.test.mjs
tribal-inject-on-edit.mjs
tribal-spike.mjs
wiki-tribal-coverage-inject.mjs
wiki-tribal-coverage-inject.test.mjs
wiki-tribal-coverage-per-domain-inject.mjs
wiki-tribal-coverage-per-domain-inject.test.mjs

### User | 2026-06-13T22:30:03.597Z

[tool_result] AdditiveManufacturingTribalCorpusEngine.ts
CAMTribalKnowledgeEngine.ts
CAMTribalKnowledgeInjectionEngine.ts
CAMTribalRAGEngine.ts
CAMTribalTipLinkerEngine.ts
GrindingTribalCorpusEngine.ts
LaserCuttingTribalCorpusEngine.ts
LatheLoRATribalAugmentationEngine.ts
LatheLoRATribalExtractorEngine.ts
LatheTribalInjectorEngine.ts
LatheTribalIntegrationEngine.ts
MillLoRATribalAugmentationEngine.ts
MillLoRATr
... [+568 chars truncated]

### Assistant | 2026-06-13T22:30:06.803Z

Good. Now let me check the remaining engines the draft lists (continued from the `ls` output), verify dispatcher action claims, and check the scripts/lib path and shard claim.

### Assistant | 2026-06-13T22:30:08.480Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:30:09.252Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:30:09.999Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:30:11.538Z

[tool_use: Bash]

### User | 2026-06-13T22:30:21.287Z

[tool_result] TribalCorpusOrchestratorEngine.ts
TribalEnrichmentCoordinatorEngine.ts
TribalEvolutionEngine.ts
TribalExplanationEngine.ts
tribal-knowledge
TribalKnowledgeActivationEngine.ts
TribalKnowledgeAdvisorEngine.ts
TribalKnowledgeApplicatorEngine.ts
TribalKnowledgeEngine.ts
TribalKnowledgeMaximizerEngine.ts
TribalKnowledgeOutcomeBridgeEngine.ts
TribalKnowledgeTrainingEngine.ts
TribalPlaybookEnforcementEng
... [+205 chars truncated]

### User | 2026-06-13T22:30:27.200Z

[tool_result] curriculum-tribal-candidate.mjs
curriculum-tribal-candidate.test.mjs
jm-die-tribal-wiki-classifier.mjs
jm-die-tribal-wiki-classifier.test.mjs
load-tribal-index.mjs
load-tribal-index.test.mjs
tribal-graph-clusters.mjs
tribal-graph-clusters.test.mjs
tribal-graph-embedding.mjs
tribal-graph-embedding.test.mjs
tribal-index-guarded-io.mjs
tribal-index-guarded-io.test.mjs
tribal-index-lock.mjs
tribal-ind
... [+120 chars truncated]

### User | 2026-06-13T22:30:32.094Z

[tool_result] 31: *     - tribal_search:      Search tips by keyword, material, operation, category
32: *     - tribal_add:         Capture a new tribal knowledge tip (persists immediately)
123:  "tribal_search",
124:  "tribal_add",
128:  "tribal_enrich",
129:  "tribal_enrich_check",
130:  "tribal_enrich_tips_only",
131:  "tribal_enrich_playbook_only",
132:  "tribal_enrich_controller_only",
143:  "tribal_apply"
... [+493 chars truncated]

### User | 2026-06-13T22:30:33.371Z

[tool_result] tribal-embed-index.blurbs-cache.json
tribal-embed-index.CLOBBERED-2026-06-08-stub.json
tribal-embed-index.manifest.json
tribal-embed-index.shard-000.json
tribal-embed-index.shard-001.json
tribal-embed-index.shard-002.json

### Assistant | 2026-06-13T22:30:37.121Z

Now let me verify the remaining disputed claims: knowledgeDispatcher tribal actions, cross-domain dispatcher line refs (mill_tribal_add, pp_tribal_apply, rag_tribal_search), the tribal-rerank script location, and the tribal-citation-log path.

### Assistant | 2026-06-13T22:30:38.679Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:30:39.822Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:30:42.290Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:30:42.399Z

[tool_use: Bash]

### User | 2026-06-13T22:30:49.837Z

[tool_result] 135:  "tribal_enrich",
173:  "tribal_capture", "tribal_search", "tribal_suggest", "tribal_stats",
344:          case "tribal_capture": {
358:          case "tribal_search": {
370:          case "tribal_suggest": {
378:          case "tribal_stats": {
954:          case "tribal_enrich": {
963:                    "[tribal_enrich] mode 'enrich' requires input object",
973:                    "[tribal
... [+386 chars truncated]

### User | 2026-06-13T22:31:07.620Z

[tool_result] H:/prism/mcp-server/src/tools/dispatchers/millDispatcher.ts:710:  "mill_tribal_add",
H:/prism/mcp-server/src/tools/dispatchers/millDispatcher.ts:2996:          case "mill_tribal_add": {
H:/prism/mcp-server/src/tools/dispatchers/ppDispatcher.ts:827:  "pp_tribal_apply",             // Apply tribal tips to program
H:/prism/mcp-server/src/tools/dispatchers/ppDispatcher.ts:1892:          case "pp_triba
... [+111 chars truncated]

### User | 2026-06-13T22:31:13.717Z

[tool_result] tribal-citation-log.jsonl

### User | 2026-06-13T22:31:13.790Z

[tool_result] tribal-rerank.mjs

### Assistant | 2026-06-13T22:32:00.774Z

I now have enough evidence to render a full verdict. Let me compile the findings.

**Summary of what I verified:**

**CHECK 1 — FABRICATION spot-check (4-6 symbols):**

1. `TribalKnowledgeEngine.ts` — EXISTS (confirmed in ls output)
2. `TribalRAGEngine.ts` — EXISTS
3. `TribalEnrichmentCoordinatorEngine.ts` — EXISTS
4. `TribalPlaybookEnforcementEngine.ts` — EXISTS
5. `TribalKnowledgeTrainingEngine.ts` — EXISTS
6. `TribalKnowledgeOutcomeBridgeEngine.ts` — EXISTS
7. `MillTribalIntegrationEngine.ts` — EXISTS; `LatheTribalIntegrationEngine.ts` — EXISTS
8. `scripts/lib/tribal-index-lock.mjs` — EXISTS
9. `scripts/promote-tribal-to-wiki.mjs` — EXISTS
10. `.claude/hooks/tribal-by-domain-inject.mjs` — EXISTS
11. `scripts/distill-tribal.mjs` — EXISTS
12. `state/shared/tribal-embed-index.shard-000/001/002.json` — EXISTS (shard claim verified)
13. `state/shared/tribal-citation-log.jsonl` — EXISTS
14. `prism_shop_practice` tribal actions (`tribal_search`, `tribal_add`, `tribal_enrich`, `tribal_enrich_check`, `tribal_enrich_tips_only`, `tribal_enrich_playbook_only`, `tribal_enrich_controller_only`, `tribal_apply`, `tribal_apply_stats`) — ALL VERIFIED at correct line numbers in shopPracticeDispatcher.ts
15. `prism_knowledge` actions (`tribal_search`, `tribal_capture`, `tribal_suggest`, `tribal_stats`, `tribal_enrich`) — ALL VERIFIED in knowledgeDispatcher.ts
16. Cross-domain actions: `mill_tribal_add` at millDispatcher.ts:710 — VERIFIED; `pp_tribal_apply` at ppDispatcher.ts:827 — VERIFIED; `rag_tribal_search` at mlDispatcher.ts:452 — VERIFIED (exact line numbers match the draft's claims)
17. `tribal-rerank.mjs` — EXISTS in `scripts/` (not `.claude/scripts/` as the draft's §7 workflow box says; the §11 test block says `scripts/tribal-rerank.mjs` correctly)

**One discrepancy found:** The draft §7 pipeline box and §13 mention `scripts/tribal-rerank.mjs`, but the §3 dispatcher quick-ref footnote says "MCP-down fallback: `node scripts/distill-tribal.mjs` · `node scripts/promote-tribal-
... [+4961 chars truncated]
