---
type: "chat-session"
source: "claude-code-cli"
session_id: "f593aee3-12cf-4e8a-a566-8411386cc606"
title: "LENS 3 — CONCRETE WIRING CANDIDATES in delta's codebase (where Claude tokens are"
date: "2026-06-09"
first_ts: "2026-06-09T16:09:47.888Z"
last_ts: "2026-06-09T16:14:47.448Z"
cwd: "H:\\prism"
messages: 58
user_msgs: 24
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism/f593aee3-12cf-4e8a-a566-8411386cc606/subagents/workflows/wf_28042811-3c4/agent-a186031bf454d81d6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# LENS 3 — CONCRETE WIRING CANDIDATES in delta's codebase (where Claude tokens are

> **claude-code-cli** | 2026-06-09 | 58 msgs (24 user / 34 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/f593aee3-12cf-4e8a-a566-8411386cc606/subagents/workflows/wf_28042811-3c4/agent-a186031bf454d81d6.jsonl`

## Transcript

### User | 2026-06-09T16:09:47.888Z

LENS 3 — CONCRETE WIRING CANDIDATES in delta's codebase (where Claude tokens are burned on mechanical work today).

Goal: name specific delta scripts/engines/flows that currently use Claude (or could) for mechanical text work that should route to local Ollama, with the EXACT invocation.

Read: `state/shared/delta-context-briefing-2026-06-09.md` (esp. the "NOTABLE ASSETS BUILT" list — cad-* scripts), `mcp-server/src/engines/cad/TOOLBELT.md` + `PATHS.md`, and grep `scripts/` for delta cad-* scripts that summarize/narrate/label/classify. Check how `scripts/lib/transcript-digest.mjs` (deterministic, no LLM) is the model to imitate vs which steps still need an LLM.

For each candidate output: file/flow · what mechanical step burns tokens · which `ask-ollama.mjs` mode or OllamaHookBridge call replaces it · est % token savings · effort to wire (drop-in / small / build). Prioritize drop-ins. Be specific.

### Assistant | 2026-06-09T16:09:55.896Z

I'll start by reading the key files this task names, then grep for delta cad-* scripts.

### Assistant | 2026-06-09T16:09:55.898Z

[tool_use: Read]

### Assistant | 2026-06-09T16:09:55.903Z

[tool_use: Read]

### User | 2026-06-09T16:10:00.493Z

[tool_result] 1	#!/usr/bin/env node
2	// transcript-digest.mjs — compact, bounded digest of a Claude Code session
3	// transcript (.jsonl) for cheap re-reading of RAW session history.
4	//
5	// A raw transcript is mostly tool_result bulk (a 122MB file ≈ tens of millions
6	// of tokens). This streams the file line-by-line (bounded memory — never loads
7	// the whole file as one string, dodging V8's 512MiB string
... [+6436 chars truncated]

### User | 2026-06-09T16:10:00.567Z

[tool_result] 1	<!-- delta context briefing — reconstructed 2026-06-09 from 26 raw session transcripts via scripts/lib/transcript-digest.mjs + bounded-3 workflow wf_66199e81-28f. NOTE: the embedded line saying the synthesis workflow "never completed" reflects a mid-run snapshot of THIS session; the resume succeeded 26/26. -->
2	
3	I'll produce this briefing now. The session digests are already provided in full 
... [+22456 chars truncated]

### Assistant | 2026-06-09T16:10:14.784Z

I have the briefing's NOTABLE ASSETS list. Now let me read the cad galaxy TOOLBELT.md + PATHS.md, the ask-ollama modes, and grep for delta cad-* scripts that do mechanical text work.

### Assistant | 2026-06-09T16:10:15.779Z

[tool_use: Read]

### Assistant | 2026-06-09T16:10:16.337Z

[tool_use: Read]

### Assistant | 2026-06-09T16:10:16.354Z

[tool_use: Read]

### User | 2026-06-09T16:10:31.595Z

[tool_result] 1	# CAD Galaxy TOOLBELT.md — tool-call efficiency for slot:delta
2	
3	> Memoized Grep/Glob/Bash/Read/git/dispatcher patterns delta reaches for most. Each entry saves tokens or time vs. the naive alternative. Sourced from [[reference_delta_cad_toolchain_session_2026_05_27]].
4	
5	## prism_* dispatcher actions used most (route BEFORE Grep — soul: route-before-grep)
6	- `prism_session:master_index_qu
... [+4921 chars truncated]

### User | 2026-06-09T16:10:31.759Z

[tool_result] 1	# CAD Galaxy PATHS.md — H:/-wide path atlas for slot:delta
2	
3	> Highest-ROI artifact: converts every future Grep/Glob from O(N) → O(1) for CAD work. Sourced from [[reference_cad_domain_map_for_delta_2026_05_27]] (4-parallel-agent hunt, iter112). Format: `<path> | <purpose> | <maintainer>`.
4	>
5	> **External corpus + software + launchers:** this file covers repo/engine paths; for the **129,306
... [+11034 chars truncated]

### User | 2026-06-09T16:10:31.773Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+30421 chars truncated]

### Assistant | 2026-06-09T16:10:42.085Z

I now understand the pattern (`transcript-digest.mjs` = deterministic spine extraction, no LLM) and the offload targets (`ask-ollama.mjs` modes: viz/summarize/explain/triage/ask + `callLocalModel`). Now let me grep the delta cad-* scripts for the actual mechanical LLM-burning steps. The briefing's NOTABLE ASSETS lists the scripts; let me find which ones contain summarize/narrate/label/classify work, plus check OllamaHookBridge.

### Assistant | 2026-06-09T16:10:43.537Z

[tool_use: Grep]

### Assistant | 2026-06-09T16:10:44.006Z

[tool_use: Glob]

### Assistant | 2026-06-09T16:10:44.505Z

[tool_use: Glob]

### User | 2026-06-09T16:10:47.292Z

[tool_result] No files found

### User | 2026-06-09T16:11:05.870Z

[tool_result] scripts\cad-pipeline-coverage-scorer.mjs
scripts\cad-regen-test.mjs
scripts\cad-param-pull-fusion360.mjs
scripts\cad-corpus-catalog-build.mjs
scripts\cad-param-pull-fusion360-chunked.mjs
scripts\cad-pipeline-knowledge-index.mjs
scripts\cad-design-book-sources.mjs

### User | 2026-06-09T16:11:06.122Z

[tool_result] scripts\lib\cnc-ground-truth-lib.mjs

### Assistant | 2026-06-09T16:11:13.496Z

The briefing's script list doesn't all match disk — many cad-* scripts live in the slot/delta worktree (`H:/prism-slot-delta`), unmerged, not in `H:/prism`. The ones present in `H:/prism/scripts/` are the merged subset. Let me look at the actually-present scripts for LLM-burning steps, and check the slot/delta worktree for the unmerged training scripts. Let me also grep OllamaHookBridge to know the call surface.

### Assistant | 2026-06-09T16:11:15.343Z

[tool_use: Grep]

### Assistant | 2026-06-09T16:11:17.228Z

[tool_use: Grep]

### Assistant | 2026-06-09T16:11:18.597Z

[tool_use: Bash]

### User | 2026-06-09T16:11:27.917Z

[tool_result] 186:    summary: {
205:  console.log(`  systems=${out.summary.systems} ops=${opCount} params=${paramCount}`);
207:  console.log(`  tokenIndex=${out.summary.tokenIndexSize} tokens, build=${elapsedMs}ms`);

### User | 2026-06-09T16:11:28.585Z

[tool_result] 16: * Default mode is APPLY (writes the catalog). --dry-run prints summary only.
108:    const summary = walk(root, budget);
109:    result.perDir[dir] = summary;
110:    if (summary.missing) continue;
111:    result.totals.files += summary.fileCount;
112:    result.totals.dirs  += summary.dirCount;
113:    for (const [ext, n] of Object.entries(summary.byExt)) {

### User | 2026-06-09T16:11:52.439Z

[tool_result] cad-4cam-function-catalog.mjs*
cad-abc-dataset-connector.mjs*
cad-abc-dataset-connector.test.mjs
cad-abc-shard-roundtrip.mjs*
cad-ai-deep-reasoning.mjs*
cad-ai-deep-reasoning.test.mjs
cad-ai-rag-index.mjs*
cad-ai-rag-index.test.mjs
cad-ai-train-knn.mjs*
cad-ai-train-knn.test.mjs
cad-ai-train-lora.mjs*
cad-ai-train-lora.test.mjs
cad-ai-train-pagerank.mjs*
cad-ai-train-pagerank.test.mjs
cad-ai-train
... [+2044 chars truncated]

### Assistant | 2026-06-09T16:11:58.937Z

The interesting candidates are in the slot/delta worktree: `cad-ai-deep-reasoning.mjs`, `cad-feature-vocabulary-expand.mjs`, `cad-feature-template-extract.mjs`, `cad-feature-wiki-seed.mjs`, `cad-corpus-print-compare.mjs`, `cnc-ground-truth-lib.mjs`, `cad-atomic-ops-ontology.mjs`. Let me read the LLM-call surfaces in these. Let me check which actually invoke an LLM vs. are deterministic, and how (Claude vs already-Ollama).

### Assistant | 2026-06-09T16:12:01.024Z

[tool_use: Grep]

### Assistant | 2026-06-09T16:12:01.744Z

[tool_use: Read]

### User | 2026-06-09T16:12:08.804Z

[tool_result] 2:// cad-ai-deep-reasoning.mjs
3:// Unified "deep-reasoning" inference layer that fuses all 4 trained CAD models
4:// (k-NN classifier, PageRank-GNN, TF-IDF RAG, LoRA recipe-completion) behind a single
17://     reasoning: { steps, verdict, alternatives } }
19:// "Reasoning" = chain-of-evidence: each model contributes a signal, ensemble fuses them
22:// READS the 4 trained models from state/shared
... [+2739 chars truncated]

### User | 2026-06-09T16:12:09.007Z

[tool_result] 1	#!/usr/bin/env node
2	// cad-ai-deep-reasoning.mjs
3	// Unified "deep-reasoning" inference layer that fuses all 4 trained CAD models
4	// (k-NN classifier, PageRank-GNN, TF-IDF RAG, LoRA recipe-completion) behind a single
5	// query interface. Demonstrates the 4 systems working together as an integrated whole.
6	//
7	// Query shape:
8	//   { geometry?: {primitives, boundingBox},  // for k-NN arc
... [+2903 chars truncated]

### Assistant | 2026-06-09T16:12:16.702Z

`cad-ai-deep-reasoning.mjs` is fully deterministic (model fusion, no LLM call) — already the model to imitate, not a candidate. The real candidates are the steps that produce natural-language text: feature vocabulary, wiki seeds, template descriptions, print-compare narration, ground-truth labeling. Let me check those for LLM calls and how the OCR/vision step works (the briefing's TDP05/06 OCR is the heaviest), plus the OllamaHookBridge surface and the vision-extract lib.

### Assistant | 2026-06-09T16:12:19.607Z

[tool_use: Grep]

### Assistant | 2026-06-09T16:12:21.647Z

[tool_use: Grep]

### Assistant | 2026-06-09T16:12:23.257Z

[tool_use: Grep]

### User | 2026-06-09T16:12:23.262Z

[tool_result] <tool_use_error>Path does not exist: H:\prism-slot-delta\scripts\lib\cnc-ground-truth-lib.mjs. Note: your current working directory is H:\prism.</tool_use_error>

### Assistant | 2026-06-09T16:12:24.506Z

[tool_use: Grep]

### User | 2026-06-09T16:12:27.260Z

[tool_result] No matches found

### User | 2026-06-09T16:12:27.873Z

[tool_result] No matches found

### User | 2026-06-09T16:12:28.862Z

[tool_result] 3: * ollama-prism-bridge.mjs — Ollama → PRISM agentic harness (OLLAMA-EXPAND-MS0/U-OE-BRIDGE-L2)
5: * Layer 2 of the OLLAMA→PRISM-MCP bridge ladder (Layer 1 = ask-ollama.mjs).
27: * Scope (honest — see state/shared/specs/OLLAMA-PRISM-MCP-BRIDGE-DESIGN.md):
70:const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
194: *  OLLAMA-PRISM-MCP-BRIDGE-DESIGN.md §L2b is therefore RESOLVED.
... [+1440 chars truncated]

### Assistant | 2026-06-09T16:12:35.191Z

The slot/delta wiki-seed and print-compare scripts have no LLM calls — they're deterministic. So the cad-* scripts are largely already deterministic (good — they imitate transcript-digest). The heavy LLM-burning work is the **OCR/vision step** (the ground-truth lib + the vision-extract lib) and the **handoff/transcript synthesis** flow this very session burned Claude on. Let me confirm: (1) the vision-extract lib already uses Ollama vision, (2) whether `cad-ai-rag-index` / `cad-feature-vocabulary-expand` generate any prose, and (3) check the cad-* scripts in slot/delta that actually do call an LLM.

### Assistant | 2026-06-09T16:12:37.708Z

[tool_use: Bash]

### User | 2026-06-09T16:12:56.291Z

[tool_result] scripts/cad-ollama-archetype-label.mjs
===VISION LIB EXISTS===
ocr-benchmark-lib.mjs
ocr-benchmark-lib.test.mjs

### Assistant | 2026-06-09T16:13:05.836Z

Only ONE delta cad script calls an LLM directly: `cad-ollama-archetype-label.mjs` (already routed to Ollama — name says so). The vision/OCR lib (`ollama-vision-extract-lib.mjs` from the regressions list) lives in `H:/prism/scripts/lib/`, not the delta worktree. So delta's cad-* scripts are overwhelmingly deterministic already — the token burn isn't in the committed scripts, it's in the **interactive Claude flows** delta runs each session (context-regain, print-compare narration, archetype description, handoff synthesis). Let me confirm the archetype-label script's current routing and check the regen-overwrite of cad tribal/wiki (where Claude prose is the burn), plus verify the vision lib is the real OCR path.

### Assistant | 2026-06-09T16:13:05.837Z

[tool_use: Read]

### Assistant | 2026-06-09T16:13:07.477Z

[tool_use: Bash]

### User | 2026-06-09T16:13:14.209Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2 / CAD-PIPELINE-WIRE-MS0/U-CAD-OLLAMA-ARCHETYPE-LABEL
3	// Ollama archetype classifier — feeds geom.json features to qwen2.5-coder:7b,
4	// gets back {archetype, confidence, reasoning}. Graceful no-op when Ollama
5	// /api/chat is dead (current state — GPU contention).
6	
7	import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";

... [+2708 chars truncated]

### User | 2026-06-09T16:13:25.029Z

[tool_result] scripts/lib/ollama-vision-extract-lib.mjs
VISION-LIB-PRESENT-IN-MAIN
14://   the model reports each dimension's nominal in the unit AS DRAWN plus the
27:// is mandatory — the bare qwen3-vl:8b is a "thinking" model that routes all output into a
37:// Feature kinds we hint the model to expect per part class (NOT the dimension
395:  const model = typeof opts.model === "string" && opts.model ? opts.mo
... [+314 chars truncated]

### Assistant | 2026-06-09T16:13:35.526Z

I now have a clear, evidence-grounded picture. The committed cad-* scripts are already deterministic or already-Ollama-routed (`cad-ollama-archetype-label.mjs` → qwen2.5-coder:7b; vision OCR → qwen3-vl:8b). The real Claude token burn in delta is in the **interactive flows** — context-regain, print-compare narration, archetype/template prose, handoff/transcript synthesis — none of which are scripted yet. Let me confirm two more specifics: whether the regen-overwritten cad tribal/wiki prose has a generator (where Claude writes prose by hand) and the model the archetype-label uses (a retired 7b tag → cold-fail risk).

### Assistant | 2026-06-09T16:13:36.085Z

[tool_use: Grep]

### Assistant | 2026-06-09T16:13:38.024Z

[tool_use: Grep]

### User | 2026-06-09T16:13:38.954Z

[tool_result] Found 18 files
H:\prism-slot-delta\scripts\cad-ollama-archetype-label.mjs
H:\prism-slot-delta\scripts\ollama-prism-bridge.mjs
H:\prism-slot-delta\scripts\tribal-graph-course-content-mine.mjs
H:\prism-slot-delta\scripts\seed-ghost-nodes.mjs
H:\prism-slot-delta\scripts\seed-ghost-llm-classify.test.mjs
H:\prism-slot-delta\scripts\seed-ghost-llm-classify.mjs
H:\prism-slot-delta\scripts\rgs-tool-planne
... [+620 chars truncated]

### User | 2026-06-09T16:13:41.373Z

[tool_result] No matches found

### Assistant | 2026-06-09T16:13:47.957Z

I have what I need. `cad-feature-vocabulary-expand.mjs` is deterministic (no prose). The `qwen2.5-coder:7b` references are a stale-tag risk (retired per BLACKWELL-MODEL-UPGRADE — `cad-ollama-archetype-label.mjs` points at it). And `summarize-all-scripts-via-ollama.mjs` exists as a model to imitate. I have enough concrete evidence to deliver LENS 3.

### Assistant | 2026-06-09T16:13:48.077Z

[tool_use: TaskUpdate]

### User | 2026-06-09T16:13:51.665Z

[tool_result] Updated task #3 status

### Assistant | 2026-06-09T16:14:47.448Z

# LENS 3 — CONCRETE WIRING CANDIDATES in delta's codebase

**Headline finding (R12, surprising but verified):** delta's *committed* cad-* scripts are **already overwhelmingly deterministic or already-Ollama-routed** — they imitate `transcript-digest.mjs` well. I grepped every `scripts/cad-*.mjs` + `scripts/lib/cad-*.mjs` + `cnc-*` lib in both `H:/prism` and the unmerged `slot/delta` worktree for any LLM call (`api/generate|ollama|anthropic|claude-opus/sonnet/haiku|callLocalModel|ask-ollama`). **Exactly ONE delta cad script calls an LLM at all** — `cad-ollama-archetype-label.mjs` — and it already routes to Ollama. `cad-ai-deep-reasoning.mjs` (the "deep-reasoning ensemble") is pure model-fusion math (`cad-ai-deep-reasoning.mjs:42-227`, no fetch). `cad-feature-vocabulary-expand.mjs`, `cad-feature-template-extract.mjs`, `cad-feature-wiki-seed.mjs`, `cad-corpus-print-compare.mjs` have **zero** narrate/describe/prose/LLM matches — they emit structured records, not English.

So the Claude token burn in delta is **NOT in the scripts** — it's in the **interactive Claude flows that were never scripted** (context-regain, print-compare narration, archetype/template prose, handoff synthesis), plus **two latent infra bugs** in the one Ollama-routed path. Candidates below, drop-ins first.

---

## A. DROP-IN — already-Ollama scripts that point at a RETIRED model (cold-fail risk, ~0 effort)

**A1. `H:/prism-slot-delta/scripts/cad-ollama-archetype-label.mjs:14`**
- **Burn:** none today — but it is *silently dead*. It pins `OLLAMA_MODEL = "qwen2.5-coder:7b"` (line 14, `/api/generate` line 46-51). Per the BLACKWELL-MODEL-UPGRADE-PLAN (root CLAUDE.md + `ask-ollama.mjs:60-65`), the **3b/7b/14b coders were retired** — `qwen2.5-coder:32b` is the smallest KEPT tag. This script's "graceful no-op when Ollama dead" masks a *permanent* no-op: it cold-fails on a deleted tag, so every archetype-label run falls back to nothing, and whatever fallback path Claude is doing instead burns Claude token
... [+6921 chars truncated]
