---
type: "chat-session"
source: "claude-code-cli"
session_id: "0f3a0c22-434c-4b12-9967-54ebbcb52788"
title: "Determine HOW wiki + tribal knowledge is INJECTED, and crucially whether it feed"
date: "2026-06-02"
first_ts: "2026-06-02T13:42:37.409Z"
last_ts: "2026-06-02T14:12:01.037Z"
cwd: "H:\\prism-slot-foxtrot"
messages: 127
user_msgs: 48
assistant_msgs: 79
raw_file: "H:/.claude/projects/H--prism-slot-foxtrot/0f3a0c22-434c-4b12-9967-54ebbcb52788/subagents/workflows/wf_12f1711e-1fe/agent-ad18839135f15ff08.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:45"
---

# Determine HOW wiki + tribal knowledge is INJECTED, and crucially whether it feed

> **claude-code-cli** | 2026-06-02 | 127 msgs (48 user / 79 assistant) | cwd: H:\prism-slot-foxtrot
> Raw: `H:/.claude/projects/H--prism-slot-foxtrot/0f3a0c22-434c-4b12-9967-54ebbcb52788/subagents/workflows/wf_12f1711e-1fe/agent-ad18839135f15ff08.jsonl`

## Transcript

### User | 2026-06-02T13:42:37.409Z

Determine HOW wiki + tribal knowledge is INJECTED, and crucially whether it feeds the TRAINING pipeline or only the live chat context. Read/grep (don't guess):
  - grep H:/prism-slot-foxtrot/.claude/hooks for: tribal-by-domain, wiki-precheck, foxtrot-mill-awareness, wiki-tribal coverage injectors
  - H:/prism-slot-foxtrot/mcp-server/src/engines for any engine that pulls wiki/tribal INTO a training corpus / LoRA dataset / RAG index for mill (vs just UserPromptSubmit context injection)
  - the mill galaxy AWARENESS.md PSN section (which legs feed training)
The key distinction: a hook that injects tribal tips into the CHAT prompt is NOT the same as wiki/tribal feeding the print→program TRAINING corpus. State clearly which exists. If the only injection is chat-context (not training-corpus), that is the central finding — answer whether a wiki/tribal→training-corpus bridge is the missing piece.

Return ONLY the structured object. dimension="injection-wiring". Be concrete and cite real paths/counts you opened — do not speculate.

### Assistant | 2026-06-02T13:42:57.424Z

I'll investigate how wiki and tribal knowledge are injected, specifically whether they feed the training pipeline or just live chat context. Let me start by exploring the hooks and engines.

### Assistant | 2026-06-02T13:42:57.860Z

[tool_use: Bash]

### User | 2026-06-02T13:43:57.311Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Get-ChildItem: command not found
/usr/bin/bash: line 1: Select-Object: command not found

### Assistant | 2026-06-02T13:43:59.230Z

Let me use bash instead:

### Assistant | 2026-06-02T13:43:59.296Z

[tool_use: Bash]

### User | 2026-06-02T13:45:31.788Z

[tool_result] __tests__/
bundles/
lib/
AGI_INFRA_PHASE_A_WIRING.md  9.7K
README.md  2.8K
_envelope.mjs  6.3K
agent-boundary-guard.mjs  3.5K
agent-pid-tracker.mjs  4.5K
agent-registry-load.mjs  1.5K
agent-rules-inject.mjs  2.2K
agent-util-log.mjs  2.8K
agent-vs-direct.mjs  3.2K
agent-worktree-stale-unlock.mjs  4.5K
aggressive-killer-stop.mjs  2.4K
agi-safety-envelope-guard.mjs  4.0K
ai-auto-command-router.mjs  5
... [+1137 chars truncated]

### Assistant | 2026-06-02T13:45:34.062Z

Let me search more efficiently for the wiki/tribal injection hooks and engines.

### Assistant | 2026-06-02T13:45:34.408Z

[tool_use: Glob]

### User | 2026-06-02T13:46:07.534Z

[tool_result] .claude\hooks\extraction-to-tribal.mjs
.claude\hooks\tribal-autowire.mjs
.claude\hooks\tribal-inject-on-edit.mjs
.claude\hooks\tribal-spike.mjs

### Assistant | 2026-06-02T13:46:13.596Z

[tool_use: Glob]

### User | 2026-06-02T13:46:27.505Z

[tool_result] .claude\hooks\wiki-link-suggest.mjs
.claude\hooks\wiki-precheck-inject.mjs
.claude\hooks\wiki-recall-on-read.mjs

### Assistant | 2026-06-02T13:46:28.812Z

[tool_use: Glob]

### User | 2026-06-02T13:47:13.141Z

[tool_result] No files found

### Assistant | 2026-06-02T13:47:14.465Z

[tool_use: Glob]

### User | 2026-06-02T13:47:46.779Z

[tool_result] .claude\hooks\ai-command-awareness.mjs
.claude\hooks\awareness-bootstrap.mjs
.claude\hooks\awareness-snapshot-inject.mjs
.claude\hooks\awareness-snapshot.mjs
.claude\hooks\cog-bridge-awareness-rebuild.mjs
.claude\hooks\cross-session-awareness.mjs
.claude\hooks\multi-computer-awareness.mjs
.claude\hooks\multi-session-awareness.mjs
.claude\hooks\prism-awareness-cache.mjs
.claude\hooks\prism-awarenes
... [+134 chars truncated]

### Assistant | 2026-06-02T13:47:49.040Z

Now let me read the tribal and wiki injection hooks to understand what they do:

### Assistant | 2026-06-02T13:47:49.052Z

[tool_use: Read]

### Assistant | 2026-06-02T13:47:49.251Z

[tool_use: Read]

### Assistant | 2026-06-02T13:47:49.468Z

[tool_use: Read]

### Assistant | 2026-06-02T13:47:49.497Z

[tool_use: Read]

### User | 2026-06-02T13:48:21.760Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * tribal-inject-on-edit.mjs — L4 of TRIBAL × AI
5	 *
6	 * PreToolUse hook. When the assistant is about to edit a file under
7	 * src/engines/, src/tools/dispatchers/, src/algorithms/,
8	 * .claude/scripts/, or .claude/hooks/, query L2 (tribal-rerank) with
9	 * the file basename + first 200 chars of the file's current content,
10	 * and surface the top-3
... [+4046 chars truncated]

### User | 2026-06-02T13:48:22.377Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * wiki-precheck-inject.mjs — UserPromptSubmit hook.
5	 *
6	 * Karpathy LLM-Wiki integration: when the user's prompt mentions a concept
7	 * already in knowledge/wiki/index.md, inject the top-3 matching entries as
8	 * additionalContext so Claude doesn't re-derive what the wiki already knows.
9	 *
10	 * Scoring: BM25-lite over [[Name]] + description toke
... [+21519 chars truncated]

### User | 2026-06-02T13:48:22.407Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * tribal-autowire.mjs — L6 of TRIBAL × AI
5	 *
6	 * PostToolUse hook. When the assistant edits/writes a file inside
7	 * knowledge/wiki/ or knowledge/memories/, re-embed that single file
8	 * into the unified tribal index by invoking
9	 *   node tribal-embed-index.mjs --add <path>
10	 *
11	 * Silent on success. On failure, prints to stderr but never blo
... [+1732 chars truncated]

### User | 2026-06-02T13:48:22.542Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * Extraction to Tribal Knowledge — PostToolUse Hook
5	 *
6	 * Ensures ALL extractions flow into categorized tribal knowledge:
7	 * - PDF extractions → tribal tips by domain
8	 * - MIT course extractions → formulas/algorithms registry
9	 * - Video extractions → machining best practices
10	 * - Resource folder content → categorized knowledge
11	 * - JM DI
... [+4916 chars truncated]

### Assistant | 2026-06-02T13:48:25.594Z

Now let me search the mcp-server/src/engines for any training corpus / LoRA dataset / RAG index builders:

### Assistant | 2026-06-02T13:48:25.892Z

[tool_use: Glob]

### User | 2026-06-02T13:48:54.753Z

[tool_result] mcp-server\src\engines\AGISafetyContainmentEngine.ts
mcp-server\src\engines\AHPEngine.ts
mcp-server\src\engines\AIAutoUtilizationEngine.ts
mcp-server\src\engines\AICapabilityMaximizerEngine.ts
mcp-server\src\engines\AIDecisionExplanationEngine.ts
mcp-server\src\engines\AIDeepKnowledgeIntegrationEngine.ts
mcp-server\src\engines\AIExtractionReasonerEngine.ts
mcp-server\src\engines\AIFeatureAutoRegis
... [+4817 chars truncated]

### Assistant | 2026-06-02T13:48:57.617Z

Let me search more specifically for training/LoRA/RAG/corpus builders:

### Assistant | 2026-06-02T13:48:58.097Z

[tool_use: Grep]

### User | 2026-06-02T13:49:26.171Z

[tool_result] Found 250 files limit: 250
mcp-server\src\engines\MillTemplateTrainingHarnessEngine.ts
mcp-server\src\engines\MillToolpathTemplateLibraryEngine.ts
mcp-server\src\engines\MillCorpusTriageEngine.ts
mcp-server\src\engines\MillTurnOrchestrationEngine.ts
mcp-server\src\engines\MillTurnLoRADatasetBuilderEngine.ts
mcp-server\src\engines\MachiningPlaybookEngine.ts
mcp-server\src\engines\hypermill\CADSeque
... [+13025 chars truncated]

### Assistant | 2026-06-02T13:49:28.075Z

Let me read some of the key training engines to understand the wiring:

### Assistant | 2026-06-02T13:49:28.647Z

[tool_use: Read]

### Assistant | 2026-06-02T13:49:29.059Z

[tool_use: Read]

### Assistant | 2026-06-02T13:49:29.366Z

[tool_use: Read]

### User | 2026-06-02T13:49:48.034Z

[tool_result] 1	/**
2	 * WikiRAGFeatureEngine.ts
3	 * U-NN-FEAT04 — Wiki tribal-tip RAG features for the cross-process neural learner.
4	 *
5	 * Reviewer 1 finding (5-way assessment): zero CrossProcess*Engine.ts references
6	 * searchTribalKnowledge. PRISM holds 3,700+ tribal tips and 296 playbook rules
7	 * accumulated from real shop-floor experience, but the neural network has no
8	 * access to them. This eng
... [+3539 chars truncated]

### User | 2026-06-02T13:49:48.035Z

[tool_result] 1	/**
2	 * TribalKnowledgeTrainingEngine — Deep Tribal Wisdom Integration for AI Training
3	 * ================================================================================
4	 * This engine deeply incorporates ALL tribal knowledge (3,700+ tips, 296 playbook
5	 * rules) into the AI training process. It provides:
6	 *
7	 *   1. Training data extraction from tribal tips and playbook rules
8	 *   2
... [+3292 chars truncated]

### User | 2026-06-02T13:49:48.106Z

[tool_result] 1	/**
2	 * MillTurnLoRADatasetBuilderEngine — CAM-ML-CLOSEDLOOP-MS0 U-CMCCL03
3	 * ===================================================================
4	 *
5	 * Mill-turn LoRA dataset builder. Captures multi-channel sync performance:
6	 *   - wait_ms_per_sync         — idle time at each sync marker
7	 *   - channel_imbalance_ratio  — max(T1, T2, ...) / sum(Ti)
8	 *   - sub_spindle_transfer_ms  — s
... [+3227 chars truncated]

### Assistant | 2026-06-02T13:49:50.219Z

Now let me check the AWARENESS.md file for the mill galaxy PSN section:

### Assistant | 2026-06-02T13:49:50.705Z

[tool_use: Bash]

### system

... [47 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-02T13:57:50.239Z

[tool_use: Grep]

### User | 2026-06-02T13:58:15.533Z

[tool_result] 57:let _tribal: any, _e2e: any, _traceLedger: any, _inferenceOrch: any;
111:      return _program ??= (await import("../../engines/MillingPrintToProgramEngine.js")).millingPrintToProgramEngine;
139:      return _wisdom ??= (await import("../../engines/TribalKnowledgeAdvisorEngine.js")).tribalKnowledgeAdvisorEngine;
152:    case "tribal":
153:      return _tribal ??= (await import("../../engines/Mi
... [+633 chars truncated]

### Assistant | 2026-06-02T13:58:17.356Z

Let me check what the MillingPrintToProgramEngine actually does and whether it uses tribal knowledge:

### Assistant | 2026-06-02T13:58:18.106Z

[tool_use: Bash]

### User | 2026-06-02T13:58:54.715Z

[tool_result] 6 matches in 4 files:

2229:0:KnowledgeTip[] = [];
2346:0:tribalTips,
355:0:KnowledgeTip[];
H:/.../engines/MillingPrintToProgramEngine.ts:67:import { tribalKnowledgeEngine, type KnowledgeTip } from "./TribalKnowledgeEn...
H:/.../engines/MillingPrintToProgramEngine.ts:2231:tribalTips = tribalKnowledgeEngine.search(
H:/.../engines/MillingPrintToProgramEngine.ts:2234:} catch { tribalTips = []; }

### Assistant | 2026-06-02T13:58:56.709Z

Let me read the relevant lines from MillingPrintToProgramEngine.ts:

### Assistant | 2026-06-02T13:58:57.153Z

[tool_use: Read]

### Assistant | 2026-06-02T13:58:57.341Z

[tool_use: Read]

### User | 2026-06-02T13:59:17.797Z

[tool_result] 60	import { smartToolSelectorEngine } from "./SmartToolSelectorEngine.js";
61	import { coolantStrategyEngine } from "./CoolantStrategyEngine.js";
62	import { entryExitStrategyEngine } from "./EntryExitStrategyEngine.js";
63	import { intelligentSequencingEngine } from "./IntelligentSequencingEngine.js";
64	import { workholdingVerificationEngine } from "./WorkholdingVerificationEngine.js";
65	import
... [+501 chars truncated]

### User | 2026-06-02T13:59:18.085Z

[tool_result] 2225	    const passCount = safetyChecks.filter(c => c.status === "pass").length;
2226	    const passRate = safetyChecks.length > 0 ? passCount / safetyChecks.length : 0;
2227	
2228	    // Tribal knowledge tips (JM Die shop floor)
2229	    let tribalTips: KnowledgeTip[] = [];
2230	    try {
2231	      tribalTips = tribalKnowledgeEngine.search(
2232	        `milling ${input.material?.material_name ?
... [+502 chars truncated]

### Assistant | 2026-06-02T13:59:22.252Z

Perfect! Now let me check if this tribal knowledge is captured back into training data. Let me search for where print outcomes are recorded and whether they feed back into training:

### Assistant | 2026-06-02T13:59:22.253Z

[tool_use: Bash]

### User | 2026-06-02T13:59:43.270Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-02T13:59:45.763Z

Let me check the CrossProcessOutcomeStore to see if print outcomes are recorded:

### Assistant | 2026-06-02T13:59:46.126Z

[tool_use: Bash]

### User | 2026-06-02T14:00:10.091Z

[tool_result] 0 matches for 'mill.*print\|print.*mill\|MillingPrint'

### Assistant | 2026-06-02T14:00:11.766Z

Let me look at the structure of CrossProcessOutcomeStore to understand what it records:

### Assistant | 2026-06-02T14:00:12.446Z

[tool_use: Read]

### User | 2026-06-02T14:00:20.219Z

[tool_result] 1	/**
2	 * CrossProcessOutcomeStore — event-sourced outcome ledger for the 5 XPROC
3	 * bridges (XPROC-SFC, XPROC-POST, XPROC-FEAT, XPROC-AI, XPROC-ROUTER).
4	 *
5	 * Every bridge invocation is logged here with full request/response context
6	 * plus eventual outcome (success / failure / operator override / pending).
7	 * Downstream Tier-1 neural engines read from this store as their training
8	 *
... [+4237 chars truncated]

### Assistant | 2026-06-02T14:00:26.123Z

Now I have a clear picture. Let me verify by checking if there's a direct path from print→outcome→training. Let me search for where MillingPrintToProgramEngine records outcomes:

### Assistant | 2026-06-02T14:00:26.930Z

[tool_use: Bash]

### User | 2026-06-02T14:01:09.526Z

[tool_result] 0 matches for 'record.*Outcome\|crossProcessOutcomeStore\|feedbackBusEngine'

### Assistant | 2026-06-02T14:01:11.907Z

Let me check if print-to-program results are recorded anywhere:

### Assistant | 2026-06-02T14:01:12.090Z

[tool_use: Bash]

### User | 2026-06-02T14:02:24.854Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-02T14:02:26.738Z

Let me search across the entire mcp-server for where print outcomes might be captured:

### Assistant | 2026-06-02T14:02:27.579Z

[tool_use: Bash]

### User | 2026-06-02T14:08:27.035Z

[tool_result] Command running in background with ID: b51aj04oa. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\52b75240-700f-4727-9323-86775374b9eb\tasks\b51aj04oa.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-02T14:08:29.180Z

Let me wait for that to complete and then check the output:

### Assistant | 2026-06-02T14:08:29.372Z

[tool_use: Read]

### User | 2026-06-02T14:09:15.236Z

[tool_result] <system-reminder>Warning: the file exists but is shorter than the provided offset (1). The file has 1 lines.</system-reminder>

### Assistant | 2026-06-02T14:09:17.405Z

Let me try a simpler approach to find where outcomes are recorded:

### Assistant | 2026-06-02T14:09:18.015Z

[tool_use: Bash]

### User | 2026-06-02T14:10:36.348Z

[tool_result] H:/prism-slot-foxtrot/mcp-server/src/schemas/millActionSchemas.ts:const mill_print_to_program = z
H:/prism-slot-foxtrot/mcp-server/src/schemas/millActionSchemas.ts:  mill_print_to_program,
H:/prism-slot-foxtrot/mcp-server/src/tools/dispatchers/millDispatcher.ts:  "mill_print_to_program",
H:/prism-slot-foxtrot/mcp-server/src/tools/dispatchers/millDispatcher.ts:          case "mill_print_to_program"
... [+3 chars truncated]

### Assistant | 2026-06-02T14:10:38.725Z

Now let me read the background task result:

### Assistant | 2026-06-02T14:10:38.868Z

[tool_use: Read]

### User | 2026-06-02T14:11:21.040Z

[tool_result] 1	H:/prism-slot-foxtrot/mcp-server/src/data/fusion360-cam-tips-ext.ts
2	

### Assistant | 2026-06-02T14:11:47.750Z

Excellent. So print-to-program outcomes are NOT currently recorded in the CrossProcessOutcomeStore. Now I have enough information. Let me compile my findings into the structured output.

Based on my comprehensive analysis, here's what I found:

**INJECTION ARCHITECTURE:**
1. **Chat-context injection only** (hooks):
   - `tribal-inject-on-edit.mjs` (PreToolUse): queries tribal index when editing files
   - `wiki-precheck-inject.mjs` (UserPromptSubmit): BM25/semantic search over wiki/leaf corpus, injects top-3 matches as additionalContext
   - `tribal-autowire.mjs` (PostToolUse): re-embeds edited wiki/memory files into tribal index

2. **Training pipeline integration** (engines):
   - `TribalKnowledgeTrainingEngine.ts`: converts 3,700+ tribal tips + 296 playbook rules into neural training patterns
   - `WikiRAGFeatureEngine.ts`: extracts 8 RAG features (tip counts, confidences, category indicators) into ML training
   - `CrossProcessNeuralLearningEngine.ts`: uses WikiRAGFeatureEngine.extractRAGFeatures() as part of input layer (dim 144 total)
   - `MillTribalIntegrationEngine.ts`: hardcoded JM Die milling tribal tips converted to training signals
   - `MillingPrintToProgramEngine.ts` (line 2231): searches tribal knowledge at runtime but **does NOT record outcomes back**

3. **CRITICAL GAP**: Print→program outputs are **NOT recorded** into CrossProcessOutcomeStore:
   - No `recordOutcome()` calls found in millDispatcher or MillingPrintToProgramEngine
   - Outcomes are not fed back to CrossProcessNeuralLearningEngine
   - Tribal knowledge flows INTO print-to-program (consulted at generation time) but results don't feed training
   - This is a one-way street: tribal tips inform print→program, but print→program success/failure doesn't inform future tribal learning

4. **Mill galaxy PSN** (mill-galaxy-foxtrot.md line 38): lists cross-galaxy edges but no explicit "mill ← wiki/tribal training feedback" edge.

<StructuredOutput>
{
  "dimension": "injection-wiring",
  "state_s
... [+5975 chars truncated]

### User | 2026-06-02T14:11:47.753Z

Stop hook feedback:
You did not call StructuredOutput. You MUST call StructuredOutput to return your answer — the tool input IS your answer. Call it now.

### User | 2026-06-02T14:12:01.037Z

[Request interrupted by user]
