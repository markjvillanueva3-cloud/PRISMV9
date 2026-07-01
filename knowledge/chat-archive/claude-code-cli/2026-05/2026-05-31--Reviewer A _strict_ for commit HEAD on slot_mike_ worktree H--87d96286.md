---
type: "chat-session"
source: "claude-code-cli"
session_id: "87d96286-aba0-4263-85de-26771e812c92"
title: "Reviewer A (strict) for commit HEAD on slot/mike, worktree H:/prism-slot-mike. M"
date: "2026-05-31"
first_ts: "2026-05-31T01:43:10.247Z"
last_ts: "2026-05-31T01:47:51.615Z"
cwd: "H:\\prism-slot-mike"
messages: 63
user_msgs: 25
assistant_msgs: 38
raw_file: "H:/.claude/projects/H--prism-slot-mike/87d96286-aba0-4263-85de-26771e812c92/subagents/agent-ac57b1ffbabc7f7c4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:01"
---

# Reviewer A (strict) for commit HEAD on slot/mike, worktree H:/prism-slot-mike. M

> **claude-code-cli** | 2026-05-31 | 63 msgs (25 user / 38 assistant) | cwd: H:\prism-slot-mike
> Raw: `H:/.claude/projects/H--prism-slot-mike/87d96286-aba0-4263-85de-26771e812c92/subagents/agent-ac57b1ffbabc7f7c4.jsonl`

## Transcript

### User | 2026-05-31T01:43:10.247Z

Reviewer A (strict) for commit HEAD on slot/mike, worktree H:/prism-slot-mike. MCP DOWN — native tools only (`git -C /h/prism-slot-mike show HEAD`, Read, Bash). ~27KB diff, mostly regenerated corpus + GPU bundle — verify the CODE (2 scripts) + the honesty, not the data lines.

Commit `U-TRAIN-GALAXY` does two things:
1. ENRICH: adds `wireSpecPairs()` to scripts/build-wedm-knowledge-corpus.ts reading WIRE_SPEC_CATALOG (wire-spec-sheets.ts) → 171 pairs.
2. TRAIN: new scripts/train-wedm-galaxy.ts — scores the 139-pair train split through the existing reward/safety/reasoning engines and emits a GPU LoRA bundle.

Verify:
1. The train runner uses the CORRECT engine fields: reward `.total_reward`, safety `.s_x_score`+`.passed`, reasoning `.overall_score`+`.passed`, train-script `bundle.script`/`.requirements`/`.config_json`/`.estimated_vram_gb`. Cross-check against the engine source files (WEDMLoRA{RewardShaping,SafetyEvaluator,ReasoningEvaluator,TrainingScript}Engine.ts). (An earlier bug used `.content` — confirm it's fixed to `.script`.)
2. NO inlined discharge constants — wireSpecPairs reads from WIRE_SPEC_CATALOG (.value fields); no hardcoded wire specs.
3. Fail-loud: train runner exits non-zero on missing corpus / 0 pairs.
4. HONESTY (critical): the commit message + runner report must NOT claim a successful parametric fine-tune. They should state the eval scores are low BECAUSE the reward/safety evaluators are program-output scorers mismatched to advisory text, and that the parametric train is bundle-only (stack not installed). Confirm the message is honest, not overclaiming.
5. Re-run both: `cd /h/prism-slot-mike/mcp-server && node_modules/.bin/tsx ../scripts/build-wedm-knowledge-corpus.ts 2>&1 | tail -3` (171) and `node_modules/.bin/tsx ../scripts/train-wedm-galaxy.ts 2>&1 | tail -3` (scores 139 + emits bundle).

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines, then ≤4 notes. If unsure, FAIL.

### Assistant | 2026-05-31T01:43:19.329Z

I'll review this commit. Let me start by examining the commit itself and the code changes.

### Assistant | 2026-05-31T01:43:20.961Z

[tool_use: Bash]

### Assistant | 2026-05-31T01:43:21.173Z

[tool_use: Bash]

### User | 2026-05-31T01:43:33.674Z

[tool_result] commit 982ca6581655f7e4d1b1b2879dcea91307ab5ec6
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sat May 30 20:42:12 2026 -0500

    [mike] [WEDM-TRAINING-LOOP]/U-TRAIN-GALAXY: enrich 165->171 (+wire-spec) + in-galaxy training
    
    ENRICH: +6 wire-selection pairs from WIRE_SPEC_CATALOG (wire-spec-sheets.ts) ->
    171 pairs (140 advisory + 25 tech-derived + 6 wire-spec).
   
... [+1567 chars truncated]

### User | 2026-05-31T01:43:34.859Z

[tool_result] 982ca6581655f7e4d1b1b2879dcea91307ab5ec6
[mike] [WEDM-TRAINING-LOOP]/U-TRAIN-GALAXY: enrich 165->171 (+wire-spec) + in-galaxy training

ENRICH: +6 wire-selection pairs from WIRE_SPEC_CATALOG (wire-spec-sheets.ts) ->
171 pairs (140 advisory + 25 tech-derived + 6 wire-spec).

TRAIN (in-galaxy, runnable without a GPU): scripts/train-wedm-galaxy.ts scores all
139 train pairs through the existing RLHF 
... [+805 chars truncated]

### Assistant | 2026-05-31T01:43:38.230Z

Let me read the two scripts that are the actual code in this commit, plus the engine source files they depend on.

### Assistant | 2026-05-31T01:43:39.182Z

[tool_use: Read]

### Assistant | 2026-05-31T01:43:39.642Z

[tool_use: Bash]

### User | 2026-05-31T01:43:44.860Z

[tool_result] 1	/**
2	 * train-wedm-galaxy.ts — the runnable, in-galaxy training stage for the WEDM
3	 * knowledge corpus.
4	 *
5	 * A parametric LoRA fine-tune needs torch+unsloth+a 7B base (NOT installed in
6	 * this session). What the galaxy CAN run now, without a GPU, is the in-process
7	 * learning/validation pipeline + emitting the ready-to-run GPU bundle:
8	 *
9	 *   1. Score every corpus output through 
... [+5889 chars truncated]

### User | 2026-05-31T01:43:51.209Z

[tool_result] 982ca65816 [mike] [WEDM-TRAINING-LOOP]/U-TRAIN-GALAXY: enrich 165->171 (+wire-spec) + in-galaxy training (2 minutes ago) <markjvillanueva3-cloud>
scripts/build-wedm-knowledge-corpus.ts | 35 ++++++++++++++++++++++++++++++++--
 1 file changed, 33 insertions(+), 2 deletions(-)

scripts/build-wedm-knowledge-corpus.ts
  @@ -28,6 +28,7 @@ import {
  +import { WIRE_SPEC_CATALOG } from "../mcp-server/src/
... [+2854 chars truncated]

### Assistant | 2026-05-31T01:43:53.736Z

Now let me verify the engine source files to confirm the field names used by the train runner are correct.

### Assistant | 2026-05-31T01:43:54.711Z

[tool_use: Bash]

### Assistant | 2026-05-31T01:43:55.641Z

[tool_use: Bash]

### Assistant | 2026-05-31T01:43:56.686Z

[tool_use: Bash]

### Assistant | 2026-05-31T01:43:57.780Z

[tool_use: Bash]

### User | 2026-05-31T01:44:09.725Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
17 matches in 11 files:

180:0:string, context?: { operation?: string }): WedmSafetyEvaluation {
189:0:0,
200:0:false,
223:0:Math.round(sxScore * 100) / 100,
247:0:string, issues: WedmSafetyIssue[]): number {
32:0:number;              // 0-1 (S(x) safety function)
325:0:string, issues: WedmSafetyIssue[
... [+916 chars truncated]

### User | 2026-05-31T01:44:10.413Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
3 matches in 3 files:

286:0:totalReward,
37:0:number;       // -1 to 1
mcp-server/.../engines/WEDMLoRARewardShapingEngine.ts:206:calculateReward(

### User | 2026-05-31T01:44:14.846Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
19 matches in 11 files:

157:0:string): WedmReasoningEvaluation {
176:0:Math.round(overall),
190:0:string, findings: WedmReasoningFinding[]): number {
194:0:"Output is empty — no coherence to evaluate",
218:0:string, findings: WedmReasoningFinding[]): number {
23:0:number;          // 0-100
249:0:strin
... [+1109 chars truncated]

### User | 2026-05-31T01:44:15.938Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
24 matches in 16 files:

120:0:Partial<WedmTrainingConfig>): WedmTrainingConfig {
131:0:WedmScriptOutput {
14:0:
140:0:"train_wedm_lora.py",
141:0:configJson,
143:0:vram,
144:0:time,
324:0:pip install -r requirements.txt
4:0:Generates Python training scripts for LoRA/QLoRA fine-tuning
52:0:string;
53:0
... [+985 chars truncated]

### Assistant | 2026-05-31T01:44:19.035Z

The grep output is garbled by rtk. Let me read the exact return-shape blocks of each engine directly.

### Assistant | 2026-05-31T01:44:20.594Z

[tool_use: Read]

### Assistant | 2026-05-31T01:44:21.326Z

[tool_use: Read]

### Assistant | 2026-05-31T01:44:22.319Z

[tool_use: Read]

### User | 2026-05-31T01:44:28.745Z

[tool_result] 270	    // Weighted sum (same scaling as lathe — total in [0,1] before penalty/bonus)
271	    let totalReward = components.reduce(
272	      (sum, c) => sum + c.score * c.weight,
273	      0
274	    );
275	
276	    const penaltyFactor =
277	      this.config.penalty_severity === "strict" ? 0.3 :
278	      this.config.penalty_severity === "moderate" ? 0.15 : 0.05;
279	    totalReward -= penalties.l
... [+734 chars truncated]

### User | 2026-05-31T01:44:28.760Z

[tool_result] 25	// ============================================================================
26	
27	/** Reward component (single axis of evaluation). */
28	export interface WedmRewardComponent {
29	  name: string;
30	  weight: number;
31	  score: number;       // 0-1
32	  details: string;
33	}
34	
35	/** Full reward result for a single model output. */
36	export interface WedmRewardResult {
37	  total_rewar
... [+360 chars truncated]

### User | 2026-05-31T01:44:29.996Z

[tool_result] 45	  save_steps: number;
46	  eval_steps: number;
47	  fp16: boolean;
48	  bf16: boolean;
49	}
50	
51	export interface WedmScriptOutput {
52	  script: string;
53	  filename: string;
54	  config_json: string;
55	  requirements: string;
56	  estimated_vram_gb: number;
57	  estimated_time_hours: number;
58	}
59	
60	export type WedmBaseModel =
61	  | "unsloth/llama-3-8b-bnb-4bit"
62	  | "unsloth/mistr
... [+3000 chars truncated]

### Assistant | 2026-05-31T01:44:33.455Z

Confirmed: reward returns `total_reward` (line 286), training-script returns `script`/`config_json`/`requirements`/`estimated_vram_gb`/`estimated_time_hours` (lines 51-58). Now the safety and reasoning engine return shapes, plus confirm the `setConfig` accepts `dataset_path` (it's a field on `WedmTrainingConfig`).

### Assistant | 2026-05-31T01:44:35.344Z

[tool_use: Read]

### Assistant | 2026-05-31T01:44:35.897Z

[tool_use: Read]

### User | 2026-05-31T01:44:40.928Z

[tool_result] 155	  }
156	
157	  evaluate(output: string): WedmReasoningEvaluation {
158	    const findings: WedmReasoningFinding[] = [];
159	
160	    const coherence = this.evaluateCoherence(output, findings);
161	    const domain = this.evaluateDomainKnowledge(output, findings);
162	    const justification = this.evaluateJustification(output, findings);
163	    const structure = this.evaluateStructure(output,
... [+907 chars truncated]

### User | 2026-05-31T01:44:40.931Z

[tool_result] 175	
176	  /**
177	   * Run the full safety evaluation. Critical patterns short-circuit to
178	   * a hard veto with score 0. Otherwise the 4 axes are weighted-summed.
179	   */
180	  evaluate(output: string, context?: { operation?: string }): WedmSafetyEvaluation {
181	    void context;
182	    const issues: WedmSafetyIssue[] = [];
183	
184	    // 0. Hard-veto critical patterns
185	    const veto
... [+1849 chars truncated]

### Assistant | 2026-05-31T01:44:45.593Z

All four engine contracts confirmed:
- Reward: `calculateReward(output, context)` → `total_reward` ✓
- Safety: `evaluate(output)` → `s_x_score` + `passed` ✓
- Reasoning: `evaluate(output)` → `overall_score` + `passed` ✓
- TrainingScript: `setConfig({dataset_path})` + `generateScript()` → `script`/`filename`/`config_json`/`requirements`/`estimated_vram_gb`/`estimated_time_hours` ✓ (no `.content` field exists — confirmed the earlier bug is fixed to `.script`)

Now verify WIRE_SPEC_CATALOG uses `.value` fields (no inlined constants), and check the `setConfig` signature matches what the runner passes. Let me confirm the catalog shape and check whether the runner's `calculateReward` context arg matches the engine signature.

### Assistant | 2026-05-31T01:44:47.042Z

[tool_use: Read]

### Assistant | 2026-05-31T01:44:48.341Z

[tool_use: Bash]

### User | 2026-05-31T01:44:51.746Z

[tool_result] 200	   * @param output The model-generated WEDM response text
201	   * @param context Optional instruction + expected_type from the original
202	   *                training example
203	   * @returns Full reward result including per-component breakdown and
204	   *          penalty/bonus reasons
205	   */
206	  calculateReward(
207	    output: string,
208	    context?: { instruction?: string; expe
... [+1122 chars truncated]

### User | 2026-05-31T01:44:56.530Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
82 matches in 81 files:

105:0:{
106:0:18.0,
113:0:900,
119:0:{
120:0:20,
126:0:{
127:0:0.020,
134:0:250,
158:0:{
159:0:0.20,
165:0:{
166:0:8.0,
172:0:{
173:0:14.0,
180:0:900,
186:0:{
187:0:20,
193:0:{
194:0:0.025,
201:0:250,
224:0:{
225:0:0.25,
231:0:{

### Assistant | 2026-05-31T01:45:00.077Z

rtk is mangling grep output. The `calculateReward` context signature matches the runner's call `{instruction, expected_type}` exactly (line 206-209). Let me read the wire-spec catalog directly to confirm `.value` shape and that no constants are inlined in the script.

### Assistant | 2026-05-31T01:45:00.523Z

[tool_use: Read]

### User | 2026-05-31T01:45:03.863Z

[tool_result] 100	      unit: "N",
101	      uncertainty: 1.0,
102	      confidence: 0.95,
103	      source: "Bedra Berkenhoff Technical Data Sheet, Section 4.2",
104	    },
105	    max_tension_N: {
106	      value: 18.0,
107	      unit: "N",
108	      uncertainty: 1.5,
109	      confidence: 0.95,
110	      source: "Bedra Berkenhoff Technical Data Sheet, Section 4.2",
111	    },
112	    tensile_strength_MPa: {

... [+1416 chars truncated]

### Assistant | 2026-05-31T01:45:09.102Z

Confirmed: `WIRE_SPEC_CATALOG` entries are `{value, unit, uncertainty, confidence, source}` objects. The `wireSpecPairs()` function reads `w.diameter_mm.value`, `w.tension_N.value`, `w.max_tension_N.value`, `w.conductivity_pct_IACS.value`, `w.cost_per_m_usd.value` — all from the catalog, no inlined wire specs. The `.value` accessor matches the catalog shape.

Now the key verification: re-run both scripts to confirm 171 pairs + 139-scored + bundle emit, and confirm fail-loud. Let me also check that the corpus split actually produced 139 train pairs (val/test get the rest of 171).

### Assistant | 2026-05-31T01:45:09.867Z

[tool_use: Bash]

### User | 2026-05-31T01:45:20.996Z

[tool_result]   "avg_output_len": 577,
  "out_dir": "H:\\prism-slot-mike\\mcp-server\\data\\training\\wedm-knowledge"
}
[wedm-knowledge] OK — 171 knowledge pairs (140 advisory + 25 tech-derived + 6 wire-spec).

### Assistant | 2026-05-31T01:45:23.775Z

Corpus builder confirms 171 (140 advisory + 25 tech + 6 wire-spec). Now the train runner.

### Assistant | 2026-05-31T01:45:24.400Z

[tool_use: Bash]

### User | 2026-05-31T01:45:55.074Z

[tool_result]       "mean_s_x": 0.628,
      "mean_reasoning": 51,
      "safety_pass_rate": 0,
      "reasoning_pass_rate": 0
    },
    "tech_select": {
      "n": 5,
      "mean_reward": -0.772,
      "mean_s_x": 0.35,
      "mean_reasoning": 39.6,
      "safety_pass_rate": 0,
      "reasoning_pass_rate": 0
    },
    "tech_mcode": {
      "n": 2,
      "mean_reward": -0.662,
      "mean_s_x": 0.46,
      "m
... [+800 chars truncated]

### Assistant | 2026-05-31T01:45:57.355Z

Both run clean. Let me see the top of the report (trained_examples + overall) and verify fail-loud behavior on a missing corpus.

### Assistant | 2026-05-31T01:45:58.786Z

[tool_use: Bash]

### Assistant | 2026-05-31T01:46:00.079Z

[tool_use: Bash]

### User | 2026-05-31T01:46:10.066Z

[tool_result] === WEDM IN-GALAXY TRAINING REPORT ===
{
  "trained_examples": 139,
  "overall": {
    "n": 139,
    "mean_reward": -0.558,
    "mean_s_x": 0.572,
    "mean_reasoning": 50.676,
    "safety_pass_rate": 0.072,
    "reasoning_pass_rate": 0.079
  },
  "by_kind": {
    "advisory": {
      "n": 112,

### User | 2026-05-31T01:46:21.261Z

[tool_result] H:\prism\mcp-server\node_modules\.bin\tsx:2
basedir=$(dirname "$(echo "$0" | sed -e 's,\\,/,g')")
          ^^^^^^^

SyntaxError: missing ) after argument list
    at wrapSafe (node:internal/modules/cjs/loader:1515:18)
    at Module._compile (node:internal/modules/cjs/loader:1537:20)
    at Object..js (node:internal/modules/cjs/loader:1708:10)
    at Module.load (node:internal/modules/cjs/
... [+381 chars truncated]

### Assistant | 2026-05-31T01:46:24.381Z

My fail-loud test ran the shell wrapper through `node` which broke (that's a test-harness artifact, not a code issue — `tsx` is a bash script). Let me test fail-loud correctly by pointing tsx at the script from a corpus-less cwd.

### Assistant | 2026-05-31T01:46:25.655Z

[tool_use: Bash]

### User | 2026-05-31T01:46:45.939Z

[tool_result] [train-wedm] FATAL: corpus not found at C:\Users\wompu\AppData\Local\Temp\faildir\data\training\wedm-knowledge\wedm_knowledge_train.jsonl — run build-wedm-knowledge-corpus.ts first.
EXIT=2

### Assistant | 2026-05-31T01:46:50.744Z

Fail-loud confirmed: missing corpus → exit code 2 with FATAL message. The 0-pairs branch (exit 3) is structurally present and unreachable only if the file exists but is empty (correct guard).

Now let me verify the honesty claim: the report shows `safety_pass_rate: 0.072` and `reasoning_pass_rate: 0.079` overall (not literally 0, but near-zero), `mean_reward: -0.558` (negative). The commit message claims "mean_reward -0.5..-1, pass-rate ~0". Let me verify the by-kind breakdown matches and that no overclaim exists. Let me check the README/config bundle files and the full by-kind to confirm message honesty against actual numbers.

### Assistant | 2026-05-31T01:46:51.729Z

[tool_use: Read]

### Assistant | 2026-05-31T01:46:52.932Z

[tool_use: Bash]

### User | 2026-05-31T01:46:54.857Z

[tool_result] 1	WEDM LoRA training bundle (generated by train-wedm-galaxy.ts).
2	
3	In-process learning (RLHF eval gauntlet) already ran in-galaxy — see the report.
4	The PARAMETRIC fine-tune needs a GPU box with the stack (NOT installed in the
5	authoring session). To run it:
6	
7	  cd H:/prism-slot-mike/mcp-server/data/training/wedm-knowledge/lora-bundle
8	  pip install -r requirements.txt
9	  python train_we
... [+215 chars truncated]

### User | 2026-05-31T01:47:05.273Z

[tool_result]     "advisory": {
      "n": 112,
      "mean_reward": -0.507,
      "mean_s_x": 0.579,
      "mean_reasoning": 51.723,
      "safety_pass_rate": 0.089,
      "reasoning_pass_rate": 0.098
    },
    "tech_table": {
      "n": 3,
      "mean_reward": -0.283,
      "mean_s_x": 0.53,
      "mean_reasoning": 49.333,
      "safety_pass_rate": 0,
      "reasoning_pass_rate": 0
    },
    "tech_pass": {

... [+528 chars truncated]

### Assistant | 2026-05-31T01:47:13.830Z

All verified. The numbers back the honesty claim precisely:
- `mean_reward` ranges -0.283 to -1.0 across kinds (commit says "-0.5..-1" — slightly understated lower bound but the negative-reward thesis holds, advisory at -0.507 and overall -0.558).
- pass rates are 0 to 0.098 ("~0" is accurate).
- README and commit both correctly state: in-process eval ran, parametric fine-tune is **bundle-only** (torch/unsloth not installed), india owns the GPU run. No claim of a successful parametric fine-tune anywhere.
- The honest finding correctly attributes low scores to evaluator-corpus mismatch (program-syntax scorers vs advisory knowledge text), consistent with the reward engine's `checkSyntax` looking for "M / T / E / S / H / G code tokens" (line 297) — which advisory prose lacks.

One minor note on the commit message: it says "scores all 139 train pairs" and separately "(140 advisory + 25 tech-derived + 6 wire-spec)" for the 171 corpus total — these are consistent (171 total, 139 in the train split). The val sample (1 line shown in stat) and test split account for the remainder.

Let me do a final tsc check on the two scripts to confirm no type errors were introduced.

### Assistant | 2026-05-31T01:47:15.382Z

[tool_use: Bash]

### User | 2026-05-31T01:47:34.856Z

[tool_result] ---done---

### Assistant | 2026-05-31T01:47:51.615Z

Standalone tsc on the runner reports no errors in the script itself (the `--noEmit` against a single file with module imports resolves cleanly; no script-local type errors surfaced). The runner is a pure consumer of typed engine exports, all field accesses verified against the actual return interfaces.

Summary of my independent verification against the engine source:

| Engine | Method called | Field used by runner | Confirmed in source |
|---|---|---|---|
| RewardShaping | `calculateReward(output, {instruction, expected_type})` | `.total_reward` | line 286 ✓ (sig L206-209 ✓) |
| SafetyEvaluator | `evaluate(output)` | `.s_x_score`, `.passed` | lines 223, 229 ✓ |
| ReasoningEvaluator | `evaluate(output)` | `.overall_score`, `.passed` | lines 176, 183 ✓ |
| TrainingScript | `setConfig({dataset_path})` + `generateScript()` | `.script`, `.filename`, `.requirements`, `.config_json`, `.estimated_vram_gb`, `.estimated_time_hours` | lines 51-58 ✓ — no `.content` field exists (old bug fixed) |

VERDICT: PASS

BLOCKER: (none)

Notes:
1. Honesty verified end-to-end. Commit message, runner report, and README.txt all correctly state the parametric fine-tune is BUNDLE-ONLY (torch/unsloth not installed) with india owning the GPU run — no overclaim of a successful fine-tune. The R12 finding (program-syntax evaluators score advisory text low) is corroborated by live numbers: mean_reward -0.283..-1.0, pass-rates 0..0.098. The reward engine's `checkSyntax` (looks for M/T/E/S/H/G tokens, L297) confirms why advisory prose scores negative — genuine evaluator-corpus mismatch, not corpus rot.
2. No inlined discharge/wire constants. `wireSpecPairs()` reads every value from `WIRE_SPEC_CATALOG` `{value,...}` objects (`diameter_mm.value`, `tension_N.value`, `max_tension_N.value`, `conductivity_pct_IACS.value`, `cost_per_m_usd.value`) with null-guards; `id`/`diameter` are required, the rest are conditionally appended. No hardcoded specs.
3. Fail-loud confirmed by execution: missing corpus → ex
... [+766 chars truncated]
