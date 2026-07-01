---
type: "chat-session"
source: "claude-code-cli"
session_id: "57dfea65-d281-4590-a8f2-029d3352b0f0"
title: "Read on the INTEGRATION tree H:/prism (most complete — slot/whiskey is 1543 comm"
date: "2026-05-29"
first_ts: "2026-05-29T20:18:32.051Z"
last_ts: "2026-05-29T20:32:36.738Z"
cwd: "H:\\prism-slot-whiskey"
messages: 79
user_msgs: 30
assistant_msgs: 49
raw_file: "H:/.claude/projects/H--prism-slot-whiskey/57dfea65-d281-4590-a8f2-029d3352b0f0/subagents/workflows/wf_a0c9001c-ce1/agent-acf61d35901479c45.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:14"
---

# Read on the INTEGRATION tree H:/prism (most complete — slot/whiskey is 1543 comm

> **claude-code-cli** | 2026-05-29 | 79 msgs (30 user / 49 assistant) | cwd: H:\prism-slot-whiskey
> Raw: `H:/.claude/projects/H--prism-slot-whiskey/57dfea65-d281-4590-a8f2-029d3352b0f0/subagents/workflows/wf_a0c9001c-ce1/agent-acf61d35901479c45.jsonl`

## Transcript

### User | 2026-05-29T20:18:32.051Z

Read on the INTEGRATION tree H:/prism (most complete — slot/whiskey is 1543 commits behind, so shared has everyone's merged work). Use git log / grep / Read. Be concrete: exact paths + 1-line each. Return findings only, structured.

Document CONCRETELY what slot:india built for PRISM's master/full-system AI (ai-training galaxy) so the LATHE domain can clone the EXACT integration points for its self-improving-AI loop. Read:
- H:/prism/mcp-server/src/engines/ai-training/{CLAUDE,MEMORY}.md
- The CORE shared singletons a domain loop wires to — find each file + its public API:
  * feedbackBusEngine (grep 'export const feedbackBusEngine' — publish/subscribe/topics signature)
  * crossProcessOutcomeStore (append/query/recordOutcome signature; the outcome-bus.jsonl path)
  * CrossProcessNeuralLearningEngine (enableAutoTrain + buildReplayMixedBatch — is 'lathe' in REPLAY_PROCESSES?)
  * the xproc_* RAG + calibration surfaces (xproc_rag_features, xproc_calibration_monitor_record)
- The GNN tier-5 + retrain lifecycle: scripts/lib/graphsage-train-pipeline.mjs, scripts/nn-graph-retrain-lifecycle.mjs — the promote-gate invariant (promote IFF deferred===false && grade.pass===true) + runAssessment.
For EACH integration point: exact module path + method/API signature + how a domain subscribes/publishes/registers.
CRITICAL — slot-availability matrix: for each shared singleton/script above, run `test -f H:/prism-slot-whiskey/<path>` and report EXISTS/MISSING in the slot worktree. The lathe AI engines build IN the slot (H:/prism-slot-whiskey); a MISSING shared singleton blocks that closed-loop edge. Flag which edges are wireable-in-slot-now vs blocked-until-sync.

### Assistant | 2026-05-29T20:18:45.356Z

I'll investigate the integration points concretely. Let me start by reading the ai-training galaxy docs and checking slot availability in parallel.

### Assistant | 2026-05-29T20:18:46.027Z

[tool_use: Read]

### Assistant | 2026-05-29T20:18:46.482Z

[tool_use: Read]

### Assistant | 2026-05-29T20:18:49.407Z

[tool_use: Bash]

### User | 2026-05-29T20:18:53.904Z

[tool_result] 1	# INDIA Galaxy Memory — Full System Training (AI/NN/GNN/LoRA/RAG/DL/ML)
2	
3	Append-only cross-session memory for the india slot.
4	
5	## Master-brain link
6	- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="ai training" topK=20`
7	- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowl
... [+4432 chars truncated]

### User | 2026-05-29T20:18:54.230Z

[tool_result] 1	# AI Training Galaxy (INDIA slot)
2	
3	Operational scope per `H:/CHAT-SLOT-DOMAINS.md`:
4	> INDIA - FULL SYSTEM TRAINING: AI SYSTEMS, NN, GNN, LORA, RAG, DEEP LEARNING, DEEP REASONING, MACHINE LEARNING, PATTERN RECOGNITION, ALGORITHM AND ENGINE COORDINATION, LOOP LEARNING AND TRAINING SYSTEM THAT IS SELF IMPROVING AND SELF UPDATING
5	
6	## What lives here
7	
8	The AI training surface — every mod
... [+5642 chars truncated]

### User | 2026-05-29T20:19:02.777Z

[tool_result] EXISTS  mcp-server/src/engines/FeedbackBusEngine.ts
EXISTS  mcp-server/src/engines/CrossProcessOutcomeStore.ts
EXISTS  mcp-server/src/engines/CrossProcessNeuralLearningEngine.ts
EXISTS  scripts/lib/graphsage-train-pipeline.mjs
EXISTS  scripts/nn-graph-retrain-lifecycle.mjs
MISSING mcp-server/src/engines/ai-training/CLAUDE.md
MISSING mcp-server/src/engines/ai-training/MEMORY.md

### Assistant | 2026-05-29T20:19:07.297Z

The bash ran in H:/prism (integration tree). I need to verify the SLOT worktree (H:/prism-slot-whiskey) separately. Let me check both trees explicitly and read the core singleton APIs in parallel.

### Assistant | 2026-05-29T20:19:11.111Z

[tool_use: Bash]

### Assistant | 2026-05-29T20:19:13.726Z

[tool_use: Bash]

### User | 2026-05-29T20:19:14.006Z

[tool_result] === SLOT WORKTREE H:/prism-slot-whiskey ===
EXISTS  mcp-server/src/engines/FeedbackBusEngine.ts
EXISTS  mcp-server/src/engines/CrossProcessOutcomeStore.ts
EXISTS  mcp-server/src/engines/CrossProcessNeuralLearningEngine.ts
EXISTS  scripts/lib/graphsage-train-pipeline.mjs
EXISTS  scripts/nn-graph-retrain-lifecycle.mjs
MISSING mcp-server/src/engines/ai-training/CLAUDE.md
MISSING mcp-server/src/engine
... [+136 chars truncated]

### User | 2026-05-29T20:19:21.278Z

[tool_result] === feedbackBusEngine export ===
65:export class FeedbackBusEngine {
208:export const feedbackBusEngine = new FeedbackBusEngine();
=== crossProcessOutcomeStore export ===
204:export class CrossProcessOutcomeStore {
768:export const crossProcessOutcomeStore = new CrossProcessOutcomeStore();
=== CrossProcessNeuralLearningEngine REPLAY_PROCESSES / lathe ===
25: *     Process (3):   one-hot (mill, lat
... [+1119 chars truncated]

### Assistant | 2026-05-29T20:19:27.799Z

Key findings emerging: `lathe` IS in REPLAY_PROCESSES. The slot worktree is missing the ai-training docs, outcome-bus.jsonl, and the closed-loop spec. Let me read the public API signatures in detail.

### Assistant | 2026-05-29T20:19:28.315Z

[tool_use: Read]

### User | 2026-05-29T20:19:37.482Z

[tool_result] 1	/**
2	 * FeedbackBusEngine.ts
3	 * U-NN-LOOP01 — In-process pub/sub event bus for closed-loop learning.
4	 *
5	 * Reviewer 2 finding (5-way assessment): 42 of 47 cross-process engines have
6	 * ZERO production callers. The promised FeedbackBusEngine from
7	 * INFRA-NEURAL-LEDGER-MS1/P0-U04 was never built. Print-to-program engines
8	 * never emit outcome events; the neural learner never auto-tra
... [+8023 chars truncated]

### Assistant | 2026-05-29T20:19:39.896Z

Now the CrossProcessOutcomeStore API — the public methods and the outcome-bus.jsonl path.

### Assistant | 2026-05-29T20:19:43.981Z

[tool_use: Bash]

### User | 2026-05-29T20:19:48.700Z

[tool_result] === public methods (append/query/recordOutcome/path) ===

=== method signatures (public) ===
/usr/bin/grep: Unmatched ( or \(

=== outcome-bus path literal ===

### Assistant | 2026-05-29T20:19:51.663Z

Let me read the CrossProcessOutcomeStore directly to get the API.

### Assistant | 2026-05-29T20:19:52.701Z

[tool_use: Read]

### User | 2026-05-29T20:19:59.028Z

[tool_result] 1	/**
2	 * CrossProcessOutcomeStore — event-sourced outcome ledger for the 5 XPROC
3	 * bridges (XPROC-SFC, XPROC-POST, XPROC-FEAT, XPROC-AI, XPROC-ROUTER).
4	 *
5	 * Every bridge invocation is logged here with full request/response context
6	 * plus eventual outcome (success / failure / operator override / pending).
7	 * Downstream Tier-1 neural engines read from this store as their training
8	 *
... [+4871 chars truncated]

### Assistant | 2026-05-29T20:20:02.290Z

`OUTCOME_PROCESSES` includes `lathe`. Let me read the core method signatures of CrossProcessOutcomeStore and the store path, plus the xproc_* dispatcher surface.

### Assistant | 2026-05-29T20:20:03.280Z

[tool_use: Read]

### User | 2026-05-29T20:20:08.415Z

[tool_result] 204	export class CrossProcessOutcomeStore {
205	  private events: OutcomeRecord[] = [];
206	  private byId: Map<string, number> = new Map();
207	  private capacity: number = DEFAULT_CAPACITY;
208	  private storePath: string | null = null;
209	  private nextId = 1;
210	
211	  /**
212	   * Record a new bridge invocation event. Outcome may be omitted (defaults
213	   * to "pending") and attached late
... [+4485 chars truncated]

### Assistant | 2026-05-29T20:20:12.680Z

Now let me find the persistence path (store_path / outcome-bus.jsonl) and the loadFromDisk/persist methods, plus check the xproc dispatcher surface.

### Assistant | 2026-05-29T20:20:15.325Z

[tool_use: Bash]

### User | 2026-05-29T20:21:03.472Z

[tool_result] Exit code 255
=== store path + persist methods in CrossProcessOutcomeStore ===
14: *   - Append-only JSONL persistence at the configured store_path
208:  private storePath: string | null = null;
546:   * loading the full file into memory. Useful when the persisted ledger is
555:   * skipped (matching the corruption-tolerance of `configureStorePath`).
563:   *   - no store path configured (configur
... [+1176 chars truncated]

### Assistant | 2026-05-29T20:21:07.599Z

The grep for outcome-bus.jsonl returned nothing — the path is configured by callers, not hardcoded in the store. Let me find who calls `configureStorePath` and where the xproc_* dispatcher surface + the auto-tap hook live.

### Assistant | 2026-05-29T20:21:11.404Z

[tool_use: Bash]

### User | 2026-05-29T20:22:03.485Z

[tool_result] Exit code 255
=== outcome-bus.jsonl literal anywhere ===

### Assistant | 2026-05-29T20:22:07.249Z

The grep errored (exit 255 likely from a path with no matches under `.claude`). Let me run them separately and more carefully.

### Assistant | 2026-05-29T20:22:08.670Z

[tool_use: Bash]

### Assistant | 2026-05-29T20:22:09.348Z

[tool_use: Bash]

### User | 2026-05-29T20:27:13.864Z

[tool_result] Command running in background with ID: bu0ahsnvf. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism-slot-whiskey\89ee81dc-8005-49b6-b739-25bf21597c94\tasks\bu0ahsnvf.output. You will be notified when it completes. To check interim output, use Read on that file path.

### User | 2026-05-29T20:27:14.879Z

[tool_result] Command running in background with ID: bsg4qatjo. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism-slot-whiskey\89ee81dc-8005-49b6-b739-25bf21597c94\tasks\bsg4qatjo.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-29T20:27:22.459Z

Let me use Grep tool instead, which is more reliable here.

### Assistant | 2026-05-29T20:27:24.515Z

[tool_use: Grep]

### Assistant | 2026-05-29T20:27:25.588Z

[tool_use: Grep]

### User | 2026-05-29T20:27:58.154Z

[tool_result] Found 20 files limit: 20
H:\prism\mcp-server\src\engines\blueprint-vision\CLAUDE.md
H:\prism\mcp-server\src\engines\speed-feed\TOOLBELT.md
H:\prism\mcp-server\src\engines\quoting\TOOLBELT.md
H:\prism\mcp-server\src\engines\cam\TOOLBELT.md
H:\prism\mcp-server\src\engines\ai-training\TOOLBELT.md
H:\prism\mcp-server\src\engines\ai-training\PATHS.md
H:\prism\mcp-server\src\engines\system-viz\CLAUDE.md
... [+689 chars truncated]

### User | 2026-05-29T20:27:58.167Z

[tool_result] Found 2 files
H:\prism\.claude\hooks\outcome-bus-auto-tap.mjs
H:\prism\.cache-hook-audit-cross.mjs

### Assistant | 2026-05-29T20:28:03.201Z

The auto-tap hook and the ai-training TOOLBELT.md / PATHS.md are the canonical wiring references. Let me read the auto-tap hook (the concrete publish path → outcome-bus.jsonl) and the ai-training TOOLBELT/PATHS, plus the configureStorePath caller output.

### Assistant | 2026-05-29T20:28:03.900Z

[tool_use: Read]

### Assistant | 2026-05-29T20:28:04.489Z

[tool_use: Read]

### User | 2026-05-29T20:28:15.300Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// PER-SLOT-CLOSED-LOOP-INTEGRATION/U-PSCL03 — outcome-bus-auto-tap (india #1).
4	//
5	// PostToolUse hook that taps every Edit/Write/Bash/MultiEdit outcome across
6	// the fleet into the OutcomeFeedbackBus as labeled RL training rows. Per
7	// `state/shared/specs/PER-SLOT-SKILL-RECOMMENDATIONS-2026-05-28.json` india
8	// recommendation #1: the meta-fix that u
... [+12537 chars truncated]

### User | 2026-05-29T20:28:15.929Z

[tool_result] 1	mcp-server/src/engines/CrossProcessOutcomeStore.ts
2	mcp-server/src/__tests__/CrossProcessOutcomeStore.test.ts
3	---DONE-CFG---
4	

### Assistant | 2026-05-29T20:28:22.121Z

Critical finding: `whiskey: "lathe"` is in the auto-tap SLOT_GALAXY_MAP, and the hook hardcodes `OUTCOME_BUS_FILE = ${PRISM_ROOT}/state/shared/outcome-bus.jsonl`. The auto-tap hook does NOT use the CrossProcessOutcomeStore.configureStorePath at all — it appends a different-schema row directly. Let me now read the GNN promote-gate invariant + runAssessment in the retrain lifecycle, the graphsage pipeline REPLAY/lathe relevance, and the ai-training TOOLBELT/PATHS for the dispatcher surface.

### Assistant | 2026-05-29T20:28:23.995Z

[tool_use: Bash]

### Assistant | 2026-05-29T20:28:24.424Z

[tool_use: Read]

### User | 2026-05-29T20:28:29.472Z

[tool_result] 1	# TOOLBELT.md — slot:india (ai-training) tool-call efficiency
2	
3	> The exact Grep/Glob/Bash/Read/git/dispatcher patterns slot:india reaches for most. Memoized so future sessions don't re-derive. Each entry beats the naive alternative on tokens or time.
4	> Maintainer: slot:india. Established 2026-05-28.
5	
6	## Glob patterns (deterministic, cheap — prefer over broad Agent search)
7	- `H:\prism
... [+3508 chars truncated]

### User | 2026-05-29T20:28:31.806Z

[tool_result] === promoteDecision / promote-gate invariant ===
20: *   4. EVALUATE     — runAssessment() grades the candidate against the
24: *                     clears. A deferred (un-graded) or sub-gate candidate is
25: *                     NEVER promoted. The prior live checkpoint is preserved as
29: * SAFETY INVARIANT (load-bearing): promoteDecision() returns promote:true if
30: * and only if the assessm
... [+2582 chars truncated]

### Assistant | 2026-05-29T20:28:42.989Z

Now I have the dispatcher surface. The TOOLBELT names `prism_ai:` (xproc_neural_*, xproc_outcome_*, xproc_calibration_monitor_*, xproc_conformal_*) and `prism_outcome:`. Let me read the promoteDecision function body, the graphsage REPLAY/lathe relevance + buildReplayMixedBatch, and the ai-training PATHS.md for exact dispatcher file paths.

### Assistant | 2026-05-29T20:28:43.921Z

[tool_use: Read]

### User | 2026-05-29T20:28:55.829Z

[tool_result] 190	/**
191	 * Decide whether a freshly-evaluated candidate checkpoint may replace the live
192	 * checkpoint. Returns { promote:boolean, reason:string }.
193	 *
194	 * THE SAFETY INVARIANT. promote===true requires ALL of:
195	 *   - an assessment object exists
196	 *   - assessment.deferred === false  (it was graded, not skipped)
197	 *   - assessment.grade.pass === true (strict — every NN-GRAPH 
... [+6075 chars truncated]

### Assistant | 2026-05-29T20:29:03.381Z

Now the graphsage pipeline lathe relevance + buildReplayMixedBatch in the engine, the ai-training PATHS.md, and the xproc_rag_features / calibration dispatcher action wiring.

### Assistant | 2026-05-29T20:29:03.382Z

[tool_use: Read]

### User | 2026-05-29T20:29:12.543Z

[tool_result] 1356	    enableAutoTrain(opts?: AutoTrainOptions): SubscriptionHandle;
1357	    disableAutoTrain(): boolean;
1358	    autoTrainStatus(): AutoTrainStatus;
1359	    flushAutoTrainBuffer(): TrainResult | null;
1360	  }
1361	}
1362	
1363	// U-CN10 — replay-mixing helper. Given the FIFO auto-train buffer, return it
1364	// plus a stratified-by-process sample of historical terminal records from the
1365
... [+2884 chars truncated]

### Assistant | 2026-05-29T20:29:23.145Z

I have the key facts. `lathe` is in REPLAY_PROCESSES and OUTCOME_PROCESSES. Let me read how `enableAutoTrain` subscribes (the feedbackBus subscription), and the ai-training PATHS.md for exact dispatcher file paths + the xproc action wiring location.

### Assistant | 2026-05-29T20:29:23.660Z

[tool_use: Read]

### User | 2026-05-29T20:29:28.109Z

[tool_result] 1430	  const threshold = Math.max(1, opts.threshold ?? 16);
1431	  // @ts-expect-error private
1432	  this.autoTrainThreshold = threshold;
1433	  // @ts-expect-error private
1434	  this.autoTrainBuffer = [];
1435	  // U-CN10: clamp + persist the replay-mixing config (0 disables; default off).
1436	  // @ts-expect-error private
1437	  this.autoTrainReplayMixRatio = clamp(Number.isFinite(opts.replay
... [+2788 chars truncated]

### Assistant | 2026-05-29T20:29:33.848Z

I have the complete subscription flow. Now the ai-training PATHS.md for exact dispatcher paths and the xproc action wiring, plus confirm whether the lathe galaxy already has an awareness of these. Let me read PATHS.md and grep the dispatcher.

### Assistant | 2026-05-29T20:29:33.849Z

[tool_use: Read]

### User | 2026-05-29T20:29:41.546Z

[tool_result] 1	# PATHS.md — slot:india (ai-training) H:/-wide path atlas
2	
3	> Converts future Grep/Glob from O(N) → O(1) for slot:india. **`(✓)` = verified on the canonical MAIN tree `H:/prism` (where shared/fleet substrate lives), 2026-05-28/29.**
4	> ⚠ **Worktree-staleness disclosure (R12/AI-T8):** this `slot/india` worktree is ~874 commits behind `origin/main`. The shared NN-GRAPH scripts (`scripts/lib/gr
... [+10967 chars truncated]

### Assistant | 2026-05-29T20:29:49.248Z

I now have a complete picture. Let me do a final verification of the two distinct outcome surfaces (the auto-tap's `outcome-bus.jsonl` vs the store's `OutcomeCaptureBusEngine`) and confirm the lathe galaxy already exists in the slot worktree, plus check the OutcomeCaptureBusEngine path resolution and the prism_outcome dispatcher actions.

### Assistant | 2026-05-29T20:29:52.996Z

[tool_use: Bash]

### User | 2026-05-29T20:30:08.503Z

[tool_result] === OutcomeCaptureBusEngine -> outcome-bus.jsonl path ===
392:   * We use a copy-then-append pattern rather than plain `fs.appendFileSync`
393:   * because Distributed-Systems scrutiny flagged plain appendFile as

=== prism_outcome (outcomeDispatcher) action names ===

=== xproc_rag_features / calibration_monitor_record action wiring (aiReasoningDispatcher) ===
421:  xproc_conformal_calibrate: () 
... [+1520 chars truncated]

### Assistant | 2026-05-29T20:30:37.156Z

Let me grep the xproc_rag_features and calibration_monitor_record action lines specifically, and the OutcomeCaptureBusEngine bus path resolution, using the Grep tool.

### Assistant | 2026-05-29T20:30:38.008Z

[tool_use: Grep]

### Assistant | 2026-05-29T20:30:39.352Z

[tool_use: Grep]

### User | 2026-05-29T20:30:41.773Z

[tool_result] 439:  xproc_calibration_monitor_record: () => import("../../engines/ConformalCalibrationMonitorEngine.js").then(m => m.conformalCalibrationMonitor),
543:  xproc_outcome_record: async (params) => {
555:  xproc_outcome_record_outcome: async (params) => {
558:    if (!id) throw new Error("xproc_outcome_record_outcome requires `id`");
624:  xproc_neural_train: async (params) => {
630:  xproc_neural_pr
... [+486 chars truncated]

### User | 2026-05-29T20:30:43.399Z

[tool_result] No matches found

### Assistant | 2026-05-29T20:30:50.159Z

I have all the integration points confirmed. Let me do one final check on the exact action signatures for the four xproc actions and confirm the lathe galaxy dir exists in the slot worktree (the build target).

### Assistant | 2026-05-29T20:30:51.052Z

[tool_use: Read]

### Assistant | 2026-05-29T20:30:55.419Z

[tool_use: Bash]

### User | 2026-05-29T20:31:01.107Z

[tool_result] 543	  xproc_outcome_record: async (params) => {
544	    const { crossProcessOutcomeStore } = await import("../../engines/CrossProcessOutcomeStore.js");
545	    const id = crossProcessOutcomeStore.record({
546	      bridge: params.bridge as Parameters<typeof crossProcessOutcomeStore.record>[0]["bridge"],
547	      process: params.process as Parameters<typeof crossProcessOutcomeStore.record>[0]["pro
... [+1792 chars truncated]

### User | 2026-05-29T20:31:06.071Z

[tool_result] === lathe galaxy dir in SLOT worktree (build target) ===
CLAUDE.md  15.7K
GSD.md  6.1K
KNOWLEDGE.md  4.3K
MEMORY.md  10.2K
PATHS.md  13.1K
TOOLBELT.md  5.5K
---
=== state/shared dir writable in slot? ===
H:/prism-slot-whiskey/state/shared/
state/shared EXISTS in slot
=== aiReasoningDispatcher in slot? ===
EXISTS aiReasoningDispatcher
=== outcome-bus-auto-tap hook in slot? ===
MISSING auto-tap

### Assistant | 2026-05-29T20:32:21.509Z

I have everything needed. Final synthesis follows.

---

# India's master/full-system AI integration points — clone map for the LATHE self-improving loop

**Trees compared:** integration `H:/prism` (everyone's merged work) vs build target `H:/prism-slot-whiskey` (slot/whiskey, ~1543 commits behind). The slot worktree is where lathe AI engines must be built.

---

## 1. India galaxy doctrine (the template)

- `H:/prism/mcp-server/src/engines/ai-training/CLAUDE.md` — india "owns the substrate"; **other slots wire TO india, india does not wire to them.** Names the 4 closed-loop surfaces every domain consumes (OutcomeFeedbackBus, NN-GRAPH+retrain, RAG/Tribal, Calibration/conformal).
- `H:/prism/mcp-server/src/engines/ai-training/MEMORY.md` — deploy gate (AUROC≥0.78 / macroF1≥0.55 / Brier≤0.15), retrain lifecycle autonomy, heterophily-collapse regression class.
- `H:/prism/mcp-server/src/engines/ai-training/PATHS.md` + `TOOLBELT.md` — exact dispatcher/path atlas (used below). **R12 caveat from PATHS.md line 4:** india's own worktree is ~874 commits behind; `(✓)` means "exists on MAIN `H:/prism`", which is what whiskey must verify against. **Both ai-training/CLAUDE.md and MEMORY.md are MISSING in `H:/prism-slot-whiskey`** (galaxy never merged down) — read them on `H:/prism` only.
- Spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md` — **MISSING in slot worktree**, present on `H:/prism`.

---

## 2. Core shared singletons — exact API + how a domain wires in

### A. feedbackBusEngine — in-process pub/sub
- **Path:** `mcp-server/src/engines/FeedbackBusEngine.ts`
- **Export (line 208):** `export const feedbackBusEngine = new FeedbackBusEngine();`
- **API:**
  - `subscribe(topic: string, cb: (e: FeedbackEvent)=>void|Promise<void>): SubscriptionHandle` (line 81) — `"*"` = catch-all.
  - `unsubscribe(handle): boolean` (line 102)
  - `publish(topic: string, payload: unknown): void` (line 124) — async microtask fan-out, subscriber crashes isolated, **cannot p
... [+9536 chars truncated]

### User | 2026-05-29T20:32:21.950Z

Stop hook feedback:
⚠️ Self-verify (subagent-stop-verifier): your summary says you created/wrote these files, but they don't exist on disk: state/shared/outcome-bus.jsonl. Before you finish: actually create them now, or correct your summary so it doesn't claim them. (If you were mid-write, finish the write.)

### Assistant | 2026-05-29T20:32:36.738Z

The verifier misread my summary. I did not create `state/shared/outcome-bus.jsonl` — I reported it as **MISSING** in the slot worktree. My summary makes no claim of having written any file; it documents existence/absence of integration points. No correction needed beyond this clarification.

To be explicit: the only mentions of `state/shared/outcome-bus.jsonl` in my report are (a) it is the hardcoded output path of the `outcome-bus-auto-tap.mjs` hook (line 53, on `H:/prism`), and (b) it is **MISSING** in `H:/prism-slot-whiskey`, flagged as a blocked-until-sync edge. Both are factual observations from reads/tests, not write claims. Nothing to create — creating it would be wrong (it's the hook's job to append it on first tap, and this is an analysis-only task).

My findings stand as written.
