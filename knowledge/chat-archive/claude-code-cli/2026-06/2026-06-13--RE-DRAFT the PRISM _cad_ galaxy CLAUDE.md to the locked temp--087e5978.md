---
type: "chat-session"
source: "claude-code-cli"
session_id: "087e5978-f3ed-4657-820e-aed49ae8aa0d"
title: "RE-DRAFT the PRISM \"cad\" galaxy CLAUDE.md to the locked template. The first-pass"
date: "2026-06-13"
first_ts: "2026-06-13T22:37:48.813Z"
last_ts: "2026-06-13T22:52:41.774Z"
cwd: "H:\\PRISM"
messages: 209
user_msgs: 86
assistant_msgs: 123
raw_file: "H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_3d0967eb-63a/agent-a30ee173a89ed8b42.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# RE-DRAFT the PRISM "cad" galaxy CLAUDE.md to the locked template. The first-pass

> **claude-code-cli** | 2026-06-13 | 209 msgs (86 user / 123 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_3d0967eb-63a/agent-a30ee173a89ed8b42.jsonl`

## Transcript

### User | 2026-06-13T22:37:48.813Z

RE-DRAFT the PRISM "cad" galaxy CLAUDE.md to the locked template. The first-pass draft of THIS galaxy FAILED adversarial verify -- almost always FABRICATION (a named engine / dispatcher action / file path / hook that does NOT exist on disk). The galaxies that failed are exactly the ones the Phase-A assessment flagged for fabricated symbols in their CURRENT files (e.g. cam's cam-vendor-matrix.ts, backend-helper's outcome-bus-auto-tap.mjs, blueprint-vision's 21 phantom CAD*Engine names). DO NOT repeat that.

READ (absolute paths):
1. Template: H:/prism/state/shared/slot-claude-md-assessment/_TEMPLATE.md (14-section skeleton + rules).
2. Assessment for cad: H:/prism/state/shared/slot-claude-md-assessment/cad.md (KEEP/DROP/ADD -- your spec; it already lists which CURRENT-file symbols are FABRICATED -- DROP those).
3. Current file: H:/prism/mcp-server/src/engines/cad/CLAUDE.md.

ABSOLUTE RULES (the FAIL was caused by breaking these):
- VERIFY EVERY SYMBOL ON DISK BEFORE WRITING IT. For each engine: Glob H:/prism/mcp-server/src/engines/cad/*.ts (and src/engines/*.ts if it lives at top level) and confirm the file exists. For each dispatcher action: Grep the dispatcher source for the exact action string. For each script/hook: confirm the path exists. If you CANNOT confirm a symbol exists, OMIT IT ENTIRELY -- do not write it, do not even mark it UNVERIFIED if it is a core engine/action name. Better a short verified file than a long fabricated one. The verifier WILL spot-check 6+ symbols and FAIL the whole draft on ONE fabrication.
- The assessment names specific FABRICATED symbols in the current file -- those are DROP. Replace them with the verified real name the assessment gives, or omit.
- HARD CAP 180 LINES. Be lean: §3 dispatcher quick-ref = the 8-12 MOST-USED actions + a "full list: <dispatcher>.ts ACTIONS" pointer (NOT every action); §5 gotchas <= 6; DROP rot-prone live metrics (offload %, take-rate) -- replace with the regenerate command. Collapse the 4 boilerplate bl
... [+466 chars truncated]

### Assistant | 2026-06-13T22:37:57.883Z

I'll read all three source files first, then verify every symbol on disk before writing.

### Assistant | 2026-06-13T22:37:58.020Z

[tool_use: Read]

### User | 2026-06-13T22:38:10.072Z

[tool_result] 1	# CANONICAL PER-SLOT GALAXY CLAUDE.md TEMPLATE
2	
3	> Synthesis lead output, 2026-06-13. Source: 34 domain-expert galaxy assessments in this directory
4	> (`state/shared/slot-claude-md-assessment/*.md`), every one read end-to-end.
5	> This file is the LOCKED skeleton every galaxy `mcp-server/src/engines/<galaxy>/CLAUDE.md` is rewritten to.
6	> Target per-galaxy size: **80–160 lines** (replaces t
... [+31609 chars truncated]

### Assistant | 2026-06-13T22:38:12.663Z

Now let me read the assessment and current file in parallel.

### Assistant | 2026-06-13T22:38:13.415Z

[tool_use: Read]

### Assistant | 2026-06-13T22:38:13.743Z

[tool_use: Read]

### User | 2026-06-13T22:38:25.680Z

[tool_result] 1	## cad — slot:delta
2	
3	### Current state
4	
5	**Size:** 20,573 bytes / 172 lines (galaxy CLAUDE.md at `mcp-server/src/engines/cad/CLAUDE.md`).
6	
7	**Quality grade: EXCELLENT**
8	
9	The cad galaxy CLAUDE.md is one of the strongest in the fleet. It was purpose-built for the Bibryam Context Cascade pattern and loaded with verified, specific content. No fabrications found. Specific findings:
10	

... [+15876 chars truncated]

### User | 2026-06-13T22:38:25.701Z

[tool_result] 1	# CAD Galaxy — Domain-local CLAUDE.md (galactic center)
2	
3	> **Bibryam Context Cascade pattern.** Auto-loads when Claude edits under `mcp-server/src/engines/cad/`. Root `/CLAUDE.md` covers PRISM-wide doctrine; the `engines/CLAUDE.md` baseline covers dev/build/search-first discipline; THIS file covers cad-domain surface only. **Owning slot: delta** (CAD specialist — see PATHS.md maintainership 
... [+20514 chars truncated]

### Assistant | 2026-06-13T22:38:29.650Z

Now I need to verify every symbol on disk before writing. Let me glob the cad engine directory and check dispatcher files.

### Assistant | 2026-06-13T22:38:29.984Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:38:30.249Z

[tool_use: Glob]

### User | 2026-06-13T22:38:47.439Z

[tool_result] No files found

### User | 2026-06-13T22:38:47.545Z

[tool_result] mcp-server\src\tools\dispatchers\cadDrawingKnowledgeDispatcher.ts
mcp-server\src\tools\dispatchers\cadAutomationDispatcher.ts
mcp-server\src\tools\dispatchers\cadRegressionDispatcher.ts
mcp-server\src\tools\dispatchers\cadDispatcher.ts

### Assistant | 2026-06-13T22:38:50.053Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:38:50.191Z

[tool_use: Glob]

### User | 2026-06-13T22:39:01.209Z

[tool_result] mcp-server\src\engines\CADKernelEngine.ts
mcp-server\src\engines\CADDrawingKnowledgeEngine.ts
mcp-server\src\engines\hypermill\CADSequenceLearningEngine.ts
mcp-server\src\engines\CADTokenRepresentationEngine.ts
mcp-server\src\engines\CADCorpusIngesterEngine.ts
mcp-server\src\engines\CADSequenceTrainerEngine.ts
mcp-server\src\engines\CADFeatureEmbeddingEngine.ts
mcp-server\src\engines\CADRetrievalA
... [+5055 chars truncated]

### User | 2026-06-13T22:39:01.592Z

[tool_result] scripts\_archive\closed-milestones\cad-uix-capability-lock.mjs
scripts\_archive\closed-milestones\cad-uix-p8-realtime.mjs
scripts\_archive\closed-milestones\cad-uix-round2.mjs
scripts\_archive\closed-milestones\cad-uix-round3.mjs
scripts\lib\cad-ground-truth-lib.mjs
scripts\lib\cad-ground-truth-lib.test.mjs
scripts\cad-pipeline-coverage-scorer.mjs
scripts\__tests__\cad-regen-test.test.mjs
scripts\
... [+826 chars truncated]

### Assistant | 2026-06-13T22:39:04.437Z

Good. Now let me verify a few specific engines from the current CLAUDE.md that are NOT in the CAD* glob (they live at top-level engines), and check the scripts referenced in the assessment.

### Assistant | 2026-06-13T22:39:05.257Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:39:06.099Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:39:06.402Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:39:06.789Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:39:07.616Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:39:07.788Z

[tool_use: Glob]

### User | 2026-06-13T22:39:23.913Z

[tool_result] mcp-server\src\engines\GeometryEngine.ts

### User | 2026-06-13T22:39:24.157Z

[tool_result] mcp-server\src\engines\MeshEngine.ts

### User | 2026-06-13T22:39:24.945Z

[tool_result] mcp-server\src\engines\BRepTessellatorEngine.ts

### User | 2026-06-13T22:39:25.873Z

[tool_result] mcp-server\src\engines\StockModelEngine.ts

### User | 2026-06-13T22:39:28.300Z

[tool_result] mcp-server\src\engines\CollisionDetectionEngine.ts

### User | 2026-06-13T22:39:28.372Z

[tool_result] mcp-server\src\engines\CADFeatureRecognitionEngine.ts

### Assistant | 2026-06-13T22:39:31.089Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:39:31.804Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:39:32.250Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:39:32.863Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:39:33.417Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:39:33.792Z

[tool_use: Glob]

### User | 2026-06-13T22:39:45.666Z

[tool_result] mcp-server\src\engines\BlueprintToCADGenerationEngine.ts

### User | 2026-06-13T22:39:46.194Z

[tool_result] mcp-server\src\engines\PartMediaToCADEngine.ts

### User | 2026-06-13T22:39:46.558Z

[tool_result] mcp-server\src\engines\BliskCADEngine.ts

### system

... [129 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-13T22:49:28.746Z

[tool_use: Edit]

### User | 2026-06-13T22:49:31.465Z

[tool_result] The file H:/prism/state/shared/slot-claude-md-drafts/cad.md has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-13T22:49:34.609Z

Now trim §6 (refuses) — collapse the 10 bullets to 7 tighter ones:

### Assistant | 2026-06-13T22:49:46.070Z

[tool_use: Edit]

### User | 2026-06-13T22:49:48.823Z

[tool_result] The file H:/prism/state/shared/slot-claude-md-drafts/cad.md has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-13T22:49:54.025Z

Now also trim §8 (tribal) — collapse the redundant memory search line and condense resource roots:

### Assistant | 2026-06-13T22:50:07.246Z

[tool_use: Edit]

### User | 2026-06-13T22:50:10.054Z

[tool_result] The file H:/prism/state/shared/slot-claude-md-drafts/cad.md has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-13T22:50:12.175Z

[tool_use: Bash]

### User | 2026-06-13T22:50:13.853Z

[tool_result] 209 H:/prism/state/shared/slot-claude-md-drafts/cad.md

### Assistant | 2026-06-13T22:50:16.934Z

209 lines — still 29 over the 180 cap. Let me trim §5 (gotchas — 7 items, can tighten prose) and §12 (AI surface):

### Assistant | 2026-06-13T22:50:34.046Z

[tool_use: Edit]

### User | 2026-06-13T22:50:36.858Z

[tool_result] The file H:/prism/state/shared/slot-claude-md-drafts/cad.md has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-13T22:50:40.150Z

[tool_use: Bash]

### User | 2026-06-13T22:50:40.848Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-06-13T22:50:43.624Z

[tool_use: Bash]

### User | 2026-06-13T22:50:45.584Z

[tool_result]    198	<!-- AI-SYSTEMS-STATE:BEGIN -->
   199	> Live AI-systems fleet state (GNN selective-deploy, octopus, RAG/CAG, Ollama offload):
   200	> `knowledge/memories/patterns/ai-systems-fleet-state.md`.
   201	> Regenerate: `node scripts/ai-systems-fleet-state.mjs`.
   202	<!-- AI-SYSTEMS-STATE:END -->
202 H:/prism/state/shared/slot-claude-md-drafts/cad.md

### Assistant | 2026-06-13T22:50:50.919Z

202 lines — still 22 over the 180 cap. Let me trim §12 (AI surface) and §7 (text→CAD) to get under 180.

### Assistant | 2026-06-13T22:51:00.536Z

[tool_use: Edit]

### User | 2026-06-13T22:51:04.127Z

[tool_result] The file H:/prism/state/shared/slot-claude-md-drafts/cad.md has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-13T22:51:11.362Z

[tool_use: Edit]

### User | 2026-06-13T22:51:17.736Z

[tool_result] The file H:/prism/state/shared/slot-claude-md-drafts/cad.md has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-13T22:51:20.740Z

[tool_use: Bash]

### User | 2026-06-13T22:51:25.562Z

[tool_result] 188 H:/prism/state/shared/slot-claude-md-drafts/cad.md

### Assistant | 2026-06-13T22:51:29.984Z

188 lines — 8 over the 180 cap. One more trim: the §0 startup section has a redundant blank line structure and §10 closed-loop can shed 2 lines.

### Assistant | 2026-06-13T22:51:35.279Z

[tool_use: Edit]

### User | 2026-06-13T22:51:43.095Z

[tool_result] The file H:/prism/state/shared/slot-claude-md-drafts/cad.md has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-13T22:51:50.810Z

[tool_use: Edit]

### User | 2026-06-13T22:52:01.293Z

[tool_result] The file H:/prism/state/shared/slot-claude-md-drafts/cad.md has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-13T22:52:04.379Z

[tool_use: Bash]

### User | 2026-06-13T22:52:09.754Z

[tool_result] 181 H:/prism/state/shared/slot-claude-md-drafts/cad.md

### Assistant | 2026-06-13T22:52:13.490Z

181 lines — 1 over cap. One final 1-line trim: remove the blank line between `---` separators in §2.

### Assistant | 2026-06-13T22:52:15.075Z

[tool_use: Edit]

### User | 2026-06-13T22:52:22.901Z

[tool_result] The file H:/prism/state/shared/slot-claude-md-drafts/cad.md has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-13T22:52:27.616Z

[tool_use: PowerShell]

### User | 2026-06-13T22:52:29.143Z

[tool_result] 179

### Assistant | 2026-06-13T22:52:31.254Z

179 lines — within cap. Final verification of structure and symbol count:

### Assistant | 2026-06-13T22:52:32.165Z

[tool_use: PowerShell]

### User | 2026-06-13T22:52:33.429Z

[tool_result] 8: ## 0. Startup: read context ledger first
14: ## 1. Domain scope — what counts as "cad"
34: ## 2. Canonical constants + data paths
51: ## 3. Verified engines
87: ## 4. Dispatcher quick-ref
104: ## 5. Domain gotchas / safety rails
116: ## 6. What NOT to do (domain refuses)
128: ## 7. Text→CAD generation lane
134: ## 8. Tribal + corpus pointers
143: ## 9. Cross-galaxy edges (PSN)
156: ##
... [+99 chars truncated]

### Assistant | 2026-06-13T22:52:41.774Z

13 sections (§0–§12), 179 lines. All mandatory sections present (§0 startup, §1 scope+excludes, §2 constants, §3 engines, §4 dispatchers, §5 gotchas, §6 refuses, §8 tribal, §9 PSN, §10 closed-loop, §11 tests, §12 AI). No safety sections dropped.

**Symbol tally:**
- Verified on disk (Glob-confirmed): 28 engine `.ts` files + 4 dispatcher `.ts` files + 2 algorithm `.ts` files + 2 scripts + 2 data files + 1 state file + 2 spec/ledger files = **41 symbols verified**
- Dropped as fabricated/absent (not found by Glob): `cad-fleet-verify.mjs`, `cad-fleet-regen-valid.mjs`, `cad-analyze-step.mjs`, `cad-assembly-plan-lib.mjs`, `cad-step-parse-lib.mjs`, `cad-generate-stepped-trilobe-cli.mjs`, `InverseKinematicsSolverEngine.ts`, `octopus-outcomes/cad.jsonl` path = **8 dropped**

galaxy=cad | lines=179 | symbols-verified=41 | symbols-dropped-as-fabricated=8
