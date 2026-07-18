---
type: "chat-session"
source: "claude-code-cli"
session_id: "046765e9-1878-49aa-b195-de74c14c3930"
title: "You are mining slot:india's AI-TRAINING GALAXY for open TECHNICAL work. This is "
date: "2026-06-15"
first_ts: "2026-06-15T05:32:30.128Z"
last_ts: "2026-06-15T05:40:08.089Z"
cwd: "H:\\prism-slot-india"
messages: 23
user_msgs: 10
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism-slot-india/046765e9-1878-49aa-b195-de74c14c3930/subagents/agent-ac4061ff8f394dca4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:56"
---

# You are mining slot:india's AI-TRAINING GALAXY for open TECHNICAL work. This is 

> **claude-code-cli** | 2026-06-15 | 23 msgs (10 user / 13 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/046765e9-1878-49aa-b195-de74c14c3930/subagents/agent-ac4061ff8f394dca4.jsonl`

## Transcript

### User | 2026-06-15T05:32:30.128Z

You are mining slot:india's AI-TRAINING GALAXY for open TECHNICAL work. This is for a "compile all india remaining work" effort — be EXHAUSTIVE.

CONSTRAINT: this host session has NO MCP bridge — do NOT call any mcp__prism__* tool (they fail). Use Bash, Read, Glob ONLY. Work in H:/prism. Node binary is H:/Tools/nodejs/node.exe. Ground every claim in a file you actually read; cite it.

(A) Read IN FULL:
  H:/prism/mcp-server/src/engines/ai-training/CLAUDE.md
  H:/prism/mcp-server/src/engines/ai-training/MEMORY.md
  H:/prism/mcp-server/src/engines/ai-training/PATHS.md
  H:/prism/mcp-server/src/engines/ai-training/TOOLBELT.md
  H:/prism/knowledge/memories/patterns/ai-training_synthesis.md  (if present)

(B) Check the LIVE GNN state — run:
  H:/Tools/nodejs/node.exe H:/prism/scripts/nn-graph-retrain-lifecycle.mjs --status
  Note: AUROC, gate verdict, last-run action, drift baseline.

OUTPUT: a markdown list of EVERY open TECHNICAL work item across these areas:
  - GNN: full-coverage lift, reference-pool growth, feature richness (H2GCN / GPU retrain), selective-deploy @ tau=0.7
  - LoRA adapter stacks
  - RAG corpus pipelines
  - octopus multi-model consensus
  - calibration / conformal / drift
  - closed-loop outcome backbone
For each item: one-line description + current state (cite the file/metric) + what is needed + Effort (S<2h / M<1day / L>1day) + Impact (1-5).
IMPORTANT india metrics discipline (state it correctly): GNN full-coverage lift = reference-pool growth + sharper features, NOT calibration (calibration is a MEASURED dead-end for the Brier gate); selective-deploy @ tau=0.7 is the VALIDATED production path (AUROC 0.808 emitted-set, abstains below gate). Promote only on real held-out AUROC>=0.78 / macroF1>=0.55 / Brier<=0.15.
Be exhaustive. Your final message IS the data — return only the structured markdown list, no preamble.

### Assistant | 2026-06-15T05:33:06.185Z

I'll read all the specified files and run the GNN status check in parallel.

### Assistant | 2026-06-15T05:33:06.926Z

[tool_use: Read]

### Assistant | 2026-06-15T05:33:07.679Z

[tool_use: Read]

### Assistant | 2026-06-15T05:33:08.383Z

[tool_use: Read]

### Assistant | 2026-06-15T05:33:09.224Z

[tool_use: Read]

### Assistant | 2026-06-15T05:33:09.663Z

[tool_use: Bash]

### User | 2026-06-15T05:33:40.096Z

[tool_result] 1	# AI Training Galaxy — slot:india
2	> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
3	> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
4	> → `H:/prism/CLAUDE.md`. THIS file = ai-training domain doctrine ONLY; never re-inline universal prose.
5	
6	---
7	
8	## §1 — Domain scope + slot iden
... [+14284 chars truncated]

### User | 2026-06-15T05:33:40.204Z

[tool_result] 1	# PATHS.md — slot:india (ai-training) H:/-wide path atlas
2	
3	> Converts future Grep/Glob from O(N) → O(1) for slot:india. **`(✓)` = verified on the canonical MAIN tree `H:/prism` (where shared/fleet substrate lives), 2026-05-28/29.**
4	> ⚠ **Worktree-staleness disclosure (R12/AI-T8):** this `slot/india` worktree is ~874 commits behind `origin/main`. The shared NN-GRAPH scripts (`scripts/lib/gr
... [+18110 chars truncated]

### User | 2026-06-15T05:33:40.217Z

[tool_result] 1	# INDIA Galaxy Memory — Full System Training (AI/NN/GNN/LoRA/RAG/DL/ML)
2	
3	Append-only cross-session memory for the india slot.
4	
5	## Master-brain link
6	- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="ai training" topK=20`
7	- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowl
... [+20998 chars truncated]

### User | 2026-06-15T05:33:40.398Z

[tool_result] 1	# TOOLBELT.md — slot:india (ai-training) tool-call efficiency
2	
3	> The exact Grep/Glob/Bash/Read/git/dispatcher patterns slot:india reaches for most. Memoized so future sessions don't re-derive. Each entry beats the naive alternative on tokens or time.
4	> Maintainer: slot:india. Established 2026-05-28.
5	
6	## Glob patterns (deterministic, cheap — prefer over broad Agent search)
7	- `H:\prism
... [+5225 chars truncated]

### User | 2026-06-15T05:33:54.656Z

[tool_result] [fork-storm-breaker] fork-storm guard: 629 live bash.exe >= ceiling 400. New Bash spawns are PAUSED to protect the MCP server (:3100) from process-storm starvation -- the "api server error" root cause. The storm drains within seconds; WAIT briefly, then retry. Do NOT fan out more agents/bash right now. Override only if you are certain: append [SCOPED] / --force-spawn, raise PRISM_FORKSTORM_CEILING
... [+39 chars truncated]

### Assistant | 2026-06-15T05:34:06.400Z

The fork-storm blocked the GNN status run. Let me retry it and also check the synthesis file and NN-EVAL state.

### Assistant | 2026-06-15T05:34:07.982Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:34:08.331Z

[tool_use: Read]

### User | 2026-06-15T05:36:31.357Z

[tool_result] NN-GRAPH retrain lifecycle — status

Live checkpoint: trained 2026-05-16T21:34:13.774Z
  AUROC 0.09607579891061868 · epochs 30 · stratified no
Drift baseline: recorded 2026-06-14T06:05:53.224Z
  nodes 340882 · edges 757816 · ghosts 208
Last run: 2026-06-15T00:05:53.427Z — action=skip ok=true
  drift: no significant drift — nodes 0.0%, edges 0.0%, ghosts 0.0%; baseline age 18.0h < 168h

### User | 2026-06-15T05:36:40.848Z

[tool_result] 1	---
2	name: ai-training_synthesis
3	description: "[auto-synth · verify] Compounding synthesis of the ai-training domain — recurring patterns, decisions, open threads distilled from 12 memories (LLM-generated; verify against source memories before trusting)"
4	metadata:
5	  type: patterns
6	  galaxy: ai-training
7	  synthesizedFrom: 12
8	  model: gpt-oss:120b
9	  synthesizedAt: 2026-06-15T00:28:4
... [+4244 chars truncated]

### Assistant | 2026-06-15T05:36:44.296Z

Now I have all the data I need. Let me also check the live NN-EVAL and the India context ledger for any additional open items.

### Assistant | 2026-06-15T05:36:45.062Z

[tool_use: Read]

### Assistant | 2026-06-15T05:36:45.508Z

[tool_use: Read]

### User | 2026-06-15T05:36:56.137Z

[tool_result] 1	# INDIA-CONTEXT-LEDGER — full-system AI training (slot:india)
2	
3	> **Read this FIRST on `/startup-india`** to regain full domain context in ONE read
4	> (supersedes stitching the handoff + galaxy MEMORY + git-log + the 8-agent survey map).
5	> Curated, ROI-ordered, git-reconciled. Reconcile §2 (done) + §3 (open) on each
6	> `/handoff-india`. The india analogue of `DELTA-CONTEXT-LEDGER.md` /
7	
... [+8181 chars truncated]

### User | 2026-06-15T05:36:56.176Z

[tool_result] 1	{
2	  "deferred": false,
3	  "assessedAt": "2026-06-06T05:59:03.419Z",
4	  "holdoutN": 62,
5	  "embeddingMode": "direct",
6	  "checkpointPresent": true,
7	  "holdoutSplit": "stratified",
8	  "heldClasses": 6,
9	  "gates": {
10	    "auroc": 0.78,
11	    "macroF1": 0.55,
12	    "brier": 0.15
13	  },
14	  "metrics": {
15	    "auroc": 0.8084,
16	    "macroF1": 0.4389,
17	    "brier": 0.179,
18	    "
... [+18549 chars truncated]

### Assistant | 2026-06-15T05:40:08.089Z

I now have all the data needed. Here is the exhaustive structured list of every open technical work item for slot:india's AI-Training Galaxy.

---

## slot:india — Open Technical Work Items (AI-Training Galaxy)

**Live GNN state (from `--status` run 2026-06-15):**
- Live checkpoint: trained 2026-05-16, AUROC 0.096, epochs 30, stratified=no (this is the OLD 8-dim checkpoint; the graded holdout eval in `NN-EVAL.json` is the 2026-06-06 direct-embed run: AUROC 0.808 ✓, macro-F1 0.439 ✗, Brier 0.179 ✗)
- Last action: `skip` (no significant drift — graph nodes/edges/ghosts 0.0% delta, baseline age 18h < 168h threshold)
- Selective deploy: ACTIVE at τ=0.7 — emitted Brier 0.041, macro-F1 1.0, 32% coverage, 2 of 6 classes emitted
- Drift baseline recorded: 2026-06-14T06:05:53Z; graph: 340,882 nodes / 757,816 edges / 208 ghosts
- Grade: `shipped-research-only` (full-holdout fails macro-F1 + Brier); `deploy-ready-selective` (emitted-set at τ=0.7 passes)

---

## 1 — GNN: Reference-Pool Growth (Full-Coverage Lift — Primary Lever)

### 1.1 Operator labeling of active-learning worklist
- **Description:** Label the ranked ghosts in `state/shared/nn-graph/active-label-worklist.md` to grow the reference pool. This is the #1 unblocking lever for macro-F1 0.439 → 0.55 gate.
- **Current state:** `gnn-active-pool-select.mjs` shipped (commit `f512700c56`), emits `active-label-worklist.{json,md}`. Live run found 33 unlabeled / 23 refs / 5 classes. `propose-worklist-labels.mjs` (commit `9371ce90e9`) emits independent LLM proposals; live finding: GNN predicts `prism_cam` for ALL 31 ghosts (~0.27 conf) — class-collapse confirmed. 31/31 CONFLICT between LLM proposals and GNN predictions. Source: `INDIA-CONTEXT-LEDGER.md §2` + `[[reference_gnn_class_collapse_finding_2026_06_11]]`.
- **What is needed:** Operator reads `active-label-worklist-proposed.md`, resolves CONFLICTs, writes confirmed labels → seeds `scripts/vault-to-gnn-refpool.mjs` → next lifecycle run retrains with class-balanced label
... [+27654 chars truncated]
