---
type: "chat-session"
source: "claude-code-cli"
session_id: "e54d46d0-456b-46c4-b18d-0917e3332faa"
title: "Review the integration + empirical-honesty of an LLM-judge stress metric (slot:a"
date: "2026-06-25"
first_ts: "2026-06-25T21:45:48.500Z"
last_ts: "2026-06-25T21:48:18.694Z"
cwd: "H:\\prism"
messages: 45
user_msgs: 17
assistant_msgs: 28
raw_file: "H:/.claude/projects/H--prism/e54d46d0-456b-46c4-b18d-0917e3332faa/subagents/agent-a28369146f413348c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# Review the integration + empirical-honesty of an LLM-judge stress metric (slot:a

> **claude-code-cli** | 2026-06-25 | 45 msgs (17 user / 28 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/e54d46d0-456b-46c4-b18d-0917e3332faa/subagents/agent-a28369146f413348c.jsonl`

## Transcript

### User | 2026-06-25T21:45:48.500Z

Review the integration + empirical-honesty of an LLM-judge stress metric (slot:alpha, commit 014cfefb46) for PRISM. Focus on silent breakage, regression, and whether the CLAIMS match the evidence (R12). Read END-TO-END and grade PASS/FAIL with P0/P1 + file:line:

1. H:/prism/scripts/lib/stress-judge.mjs + H:/prism/scripts/lib/stress-battery-generative-judged.mjs + the `await task.verify` change in H:/prism/scripts/ollama-stress-test.mjs (runTaskOnModel). Confirm: a SYNC verify still works under `await` (no regression to the 6 exact-match batteries + the capability probe that use sync verify), and the judged battery's async verify is awaited correctly.

2. Validate the HONESTY of the result doc H:/prism/state/shared/ollama-generative-stratified-2026-06-25.md against the code. The doc claims: (a) easy/medium generative -> cheap models (1.5b/7b) sufficient (routable now); (b) hard tier is n=1/task -> NOT yet routable; (c) the judge correctly graded a 32b summary as FAIL because it dropped 2 of 4 required facts. Does the harness actually support these claims, or is there over-claiming? In particular: is the n=1 hard-tier caveat correctly stated (each hard task has how many cases)? Read the battery cases to confirm.

3. Any silent failure modes: judge timeout under load -> false (does that wrongly penalize a subject whose answer was fine but the JUDGE timed out)? Is that risk acknowledged? Is there a scenario where the judged metric is LESS trustworthy than claimed?

Be concise -- only real findings. Grade PASS/FAIL.

### Assistant | 2026-06-25T21:45:52.051Z

I'll review this LLM-judge stress metric integration. Let me start by reading the key files end-to-end.

### Assistant | 2026-06-25T21:45:52.541Z

[tool_use: Read]

### User | 2026-06-25T21:45:53.011Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\stress-judge.mjs' was already read 8s ago in this session and is unchanged (mtime 1782422143476). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-25T21:45:53.054Z

[tool_use: Read]

### Assistant | 2026-06-25T21:45:53.275Z

[tool_use: Read]

### User | 2026-06-25T21:45:53.503Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\stress-battery-generative-judged.mjs' was already read 8s ago in this session and is unchanged (mtime 1782422197534). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CAC
... [+5 chars truncated]

### User | 2026-06-25T21:45:54.535Z

[tool_result] 1	# Ollama generative-mode stratified stress -- harness, false-0 guard, LLM-judge (2026-06-25, slot:alpha)
2	
3	Operator goal facet "stress test ollama llms to see what the hardest task each llm can do before
4	diminishing returns" -- for the GENERATIVE offload modes (summarize/explain). Three commits:
5	`5e8638f141` (harness) -> `cc24367e41` (false-0 guard) -> `014cfefb46` (LLM-judge). Run on the
... [+4232 chars truncated]

### Assistant | 2026-06-25T21:45:58.105Z

The doc was just read. The two lib files were apparently read 8s ago by the harness, but I don't actually have their content in my context window from this session start. Let me read them with the cache disabled, plus the key call site.

### Assistant | 2026-06-25T21:45:58.572Z

[tool_use: Read]

### Assistant | 2026-06-25T21:45:58.813Z

[tool_use: Read]

### User | 2026-06-25T21:45:58.977Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\stress-judge.mjs' was already read 14s ago in this session and is unchanged (mtime 1782422143476). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-25T21:45:59.241Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\stress-battery-generative-judged.mjs' was already read 14s ago in this session and is unchanged (mtime 1782422197534). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### Assistant | 2026-06-25T21:46:02.123Z

The cache guard is blocking but I don't have the content. Let me disable the cache via environment variable using the Bash tool to inspect, or use offset to bypass.

### Assistant | 2026-06-25T21:46:03.022Z

[tool_use: Bash]

### Assistant | 2026-06-25T21:46:03.526Z

[tool_use: Read]

### User | 2026-06-25T21:46:07.039Z

[tool_result] /**
 * stress-judge.mjs -- LLM-as-judge quality metric for the GENERATIVE stress battery.
 *
 * WHY: the keyword-overlap metric (coversFacts in stress-battery-generative.mjs) is a good cheap
 * gate for EASY/MEDIUM generative tasks but is BRITTLE on the HARD tier -- a strong model gives a
 * correct CONCISE/PARAPHRASED answer that does not contain the exact required synonyms, so it scores
 * a fal
... [+4413 chars truncated]

### User | 2026-06-25T21:46:07.870Z

[tool_result] 1	/**
2	 * stress-battery-generative-judged.mjs -- the GENERATIVE battery (summarize/explain x easy/med/hard)
3	 * graded by the LLM-JUDGE instead of keyword-overlap. Reuses the EXACT same cases + prompts as
4	 * stress-battery-generative.mjs (clone-don't-fork: one source of truth for the texts + required
5	 * facts), swapping only the SYNC keyword `verify` for the ASYNC judgeFactCapture. Register
... [+3825 chars truncated]

### Assistant | 2026-06-25T21:46:12.394Z

Now let me read the runner's `runTaskOnModel` (the `await task.verify` change) and the base generative battery (to confirm sync verify back-compat and the case structure / n-per-task).

### Assistant | 2026-06-25T21:46:13.534Z

[tool_use: Bash]

### User | 2026-06-25T21:46:22.906Z

[tool_result] 163: * @param {number} [sampleSize] - cases per model behind each passRate. When < MIN_CONFIDENT_N
165: * @returns {{ verdict, smallestPassing, beyondLocal, confident, sampleSize }}
169:export function classifyTaskFrontier(rows, threshold = 1, sampleSize) {
170:  const n = Number.isFinite(sampleSize) ? sampleSize : NaN;
176:  if (!smallest) return { verdict: "beyond-local", smallestPassing: null, 
... [+2569 chars truncated]

### Assistant | 2026-06-25T21:46:25.642Z

Let me read the `runTaskOnModel` body in full (lines 239-280) and the `classifyTaskFrontier`/confidence logic (lines 160-185), then the base generative battery to confirm case counts per hard task.

### Assistant | 2026-06-25T21:46:26.449Z

[tool_use: Read]

### User | 2026-06-25T21:46:27.585Z

[tool_result] 155	  }
156	  return null;
157	}
158	
159	/**
160	 * Classify a task's capability frontier from its per-model pass rows. PURE.
161	 * @param {Array<{model:string, passRate:number}>} rows ordered any way.
162	 * @param {number} [threshold=1]
163	 * @param {number} [sampleSize] - cases per model behind each passRate. When < MIN_CONFIDENT_N
164	 *   the verdict is flagged `confident:false` so a consu
... [+6875 chars truncated]

### Assistant | 2026-06-25T21:46:30.560Z

The runner logic is clear and correct. Now the critical claim to verify: how many cases does each HARD task actually have? The doc claims "n=1/task" for the hard tier. Let me read the base generative battery.

### Assistant | 2026-06-25T21:46:31.562Z

[tool_use: Bash]

### User | 2026-06-25T21:46:37.251Z

[tool_result] /**
 * stress-battery-generative.mjs -- GENERATIVE-mode capability battery for Ollama stress-testing.
 * Consumed by scripts/ollama-stress-test.mjs runTierSweep (pass as tasks: BATTERY), registered in
 * scripts/ollama-stress-expanded-run.mjs as the "generative" battery.
 *
 * WHY THIS EXISTS (the named gap):
 *   The 6 existing batteries (reasoning/jsonschema/mfgdomain/instruction/codegen/longcon
... [+10601 chars truncated]

### Assistant | 2026-06-25T21:46:44.151Z

Now I have the full picture. Let me confirm the case counts:

- `summarize-easy`: 2 cases, `summarize-medium`: 2 cases, **`summarize-hard`: 1 case**
- `explain-easy`: 2 cases, `explain-medium`: 1 case, **`explain-hard`: 1 case**

So the doc's claim "hard tier is n=1/task" is **correct** — each hard task has exactly 1 case. Now let me verify `MIN_CONFIDENT_N` and check the verify-throw contract subtlety, plus confirm what other batteries' sync verify look like (to confirm no regression).

### Assistant | 2026-06-25T21:46:46.041Z

[tool_use: Bash]

### Assistant | 2026-06-25T21:46:46.925Z

[tool_use: Bash]

### User | 2026-06-25T21:46:49.910Z

[tool_result] 64:const MODEL_PARAM_B = Object.freeze({
82:const MIN_CONFIDENT_N = 3;
149:export function smallestPassingModel(rows, threshold = 1) {
152:    .sort((a, b) => (MODEL_PARAM_B[a.model] ?? Infinity) - (MODEL_PARAM_B[b.model] ?? Infinity));
163: * @param {number} [sampleSize] - cases per model behind each passRate. When < MIN_CONFIDENT_N
171:  const confident = Number.isFinite(n) ? n >= MIN_CONFIDENT_
... [+418 chars truncated]

### User | 2026-06-25T21:46:54.094Z

[tool_result] H:/prism/scripts/lib/ollama-capability-battery.mjs:50:    verify: (out, c) => norm(out).toLowerCase().replace(/[.]/g, "") === c.expect,
H:/prism/scripts/lib/ollama-capability-battery.mjs:59:    verify: (out, c) => { const n = firstNumber(out); return n != null && Math.abs(n - c.input * INCH_TO_MM) < 0.01; },
H:/prism/scripts/lib/ollama-capability-battery.mjs:69:    verify: (out, c) => { const n = 
... [+2916 chars truncated]

### Assistant | 2026-06-25T21:47:01.254Z

All verify signatures across the other 6 batteries are synchronous (`(out, c) => ...` returning a bool). Under `await task.verify(...)`, `await boolean` resolves to the boolean unchanged — confirmed no regression. `MIN_CONFIDENT_N = 3`, so the hard tier (n=1) is correctly flagged `confident: false` and rendered with `(low-n)` + the advisory.

Now let me verify the one substantive honesty concern: the doc's claim 3(c) that the judge graded a 32b summary FAIL because it "dropped 2 of 4 required facts." Let me check the report-rendering path and whether the judged battery was actually wired into the expanded run as claimed. Let me also confirm the `answeredRate` vs `passRate` reporting — since for the judged battery a judge-timeout produces `false` (counted as a fail in passRate, not as noSignal).

### Assistant | 2026-06-25T21:47:02.740Z

[tool_use: Bash]

### User | 2026-06-25T21:47:08.561Z

[tool_result] 32:  generative: "./lib/stress-battery-generative.mjs", // summarize/explain, stratified, reference-overlap metric
33:  "generative-judged": "./lib/stress-battery-generative-judged.mjs", // same cases, LLM-judge (32b) semantic metric
38:const DEFAULT_BATTERIES = ["reasoning", "longcontext", "jsonschema", "mfgdomain"];
48:      : (a.includes("--include-codegen") ? [...DEFAULT_BATTERIES, "codegen"] 
... [+21 chars truncated]

### Assistant | 2026-06-25T21:47:14.141Z

Both batteries are registered. Let me read the registration/loading section and confirm the battery import path resolves a `BATTERY` export (so the judged battery actually loads), and check the report rendering for how `noSignal`/`(low-n)` tags surface.

### Assistant | 2026-06-25T21:47:14.741Z

[tool_use: Read]

### User | 2026-06-25T21:47:16.063Z

[tool_result] 28	  jsonschema: "./lib/stress-battery-jsonschema.mjs",
29	  mfgdomain: "./lib/stress-battery-mfgdomain.mjs",
30	  instruction: "./lib/stress-battery-instruction.mjs",
31	  codegen: "./lib/stress-battery-codegen.mjs",
32	  generative: "./lib/stress-battery-generative.mjs", // summarize/explain, stratified, reference-overlap metric
33	  "generative-judged": "./lib/stress-battery-generative-judged.m
... [+4249 chars truncated]

### Assistant | 2026-06-25T21:47:22.736Z

I now have the complete integration picture. Let me verify one final concern: whether the report rendering / `(low-n)` confidence flag actually surfaces in the expanded-run output (the doc claims "the runner flags low sampleSize"). The expanded-run renderer above does NOT render the `confident`/`(low-n)` flag — it only renders `verdict`, `smallestPassing`, and `noSignal`. The `(low-n)` advisory at line 409 is in `ollama-stress-test.mjs`'s OWN renderer (`renderTierTable`), used by the standalone path, not the expanded-run path. Let me confirm which path produced Run 2 and whether the doc's "runner flags low sampleSize" is accurate.

### Assistant | 2026-06-25T21:47:23.506Z

[tool_use: Read]

### User | 2026-06-25T21:47:26.977Z

[tool_result] 395	    L.push(`## Model-tier capability frontier (smallest model that passes)`);
396	    L.push(`| task | n | verdict | smallest-passing | per-model passRate (passed/total) |`);
397	    L.push(`|---|---|---|---|---|`);
398	    let anyLowN = false;
399	    for (const t of report.tier.perTask) {
400	      const pm = t.perModel.map((m) => `${(m.model.split(":")[1] || m.model)}=${(m.passRate * 100).t
... [+851 chars truncated]

### Assistant | 2026-06-25T21:47:42.265Z

I now have everything needed. The `(low-n)` flag rendering lives in `renderTierTable` (the standalone `ollama-stress-test.mjs` main path), NOT in `ollama-stress-expanded-run.mjs` (which is the path that loads the `generative-judged` battery by name and produced Run 2's matrix). This is a real gap worth noting, but the underlying `classifyTaskFrontier` does compute `confident: false` correctly for n=1, and the doc itself states the n=1 caveat in prose. Let me trace my findings.

Verification summary of the three questions:

**Q1 — sync verify under await:** Confirmed. All 6 exact-match batteries + the capability probe use `verify: (out, c) => boolean` (sync). `await <boolean>` === the boolean; control flow identical (line 269). The judged battery's `verify: async (out, c) => judgeFactCapture(...)` returns `Promise<bool>`, correctly awaited. Throw/reject caught → not a pass (conservative). No regression.

**Q2 — n=1 hard tier honesty:** Confirmed correct. `summarize-hard` = 1 case, `explain-hard` = 1 case (read the battery directly). `MIN_CONFIDENT_N = 3`, so `classifyTaskFrontier` flags `confident: false`. Doc's "n=1/task → NOT yet routable" is accurate. Note: easy/medium claim — easy tiers have 2 cases each; `summarize-medium` 2, but `explain-medium` is only 1 case — so the "medium → cheap models sufficient" claim partly rests on n=1 for explain-medium too. The doc says "consistent 100% under BOTH metrics across multiple cases" which slightly over-generalizes for explain-medium (n=1).

**Q3 — judge-timeout false-penalty:** Real, partially-unacknowledged risk. Let me confirm the timeout default and how it interacts.

The judge uses `AbortSignal.timeout(... default 60000)` and fail-soft `catch → false`. In `runTaskOnModel`, the *subject's* answer arrives first (non-empty text → not noSignal), THEN the judge runs. If the **judge** times out/errors, `judgeFactCapture` returns `false` → counted as `pass` failure in `passRate` — but the subject DID answer, so it is NOT co
... [+354 chars truncated]

### Assistant | 2026-06-25T21:47:44.908Z

[tool_use: Bash]

### User | 2026-06-25T21:47:49.327Z

[tool_result] 12: * Integration: the generative-judged battery's `verify` is ASYNC and calls judgeFactCapture; the
75:export async function judgeFactCapture(output, mustGroups, opts = {}) {
---selftest run---
SELFTEST OK 9/9

### Assistant | 2026-06-25T21:48:18.694Z

Confirmed. `judgeFactCapture` is strictly boolean (no tri-state / null abstain). A judge timeout, non-ok HTTP, or JSON-parse error all collapse to `false`, indistinguishable from a genuine semantic FAIL. The self-test passes (9/9), proving the async verify wiring.

I have everything. Final assessment.

---

VERDICT: PASS

summary: The `await task.verify` integration is correct and back-compat-safe — all 6 exact-match batteries plus the capability probe use sync `(out,c)=>bool` verifiers and `await boolean` is the boolean unchanged (control flow identical); the judged battery's async verify is correctly awaited with a conservative catch. The n=1 hard-tier honesty claim is accurate (each hard task has exactly 1 case, `MIN_CONFIDENT_N=3` flags it). The one genuinely under-acknowledged risk is judge-side failure (timeout/HTTP/parse) collapsing to `false` and being silently charged to the SUBJECT as a measured FAIL — the harness's own false-0 class, reintroduced one layer up — but nothing it asserts is contradicted by the code, so the doc is honest, just incomplete on this caveat.

findings:
- [P2] `scripts/lib/stress-judge.mjs:75-101` -- judge-side false-FAIL: `judgeFactCapture` is strictly boolean; a judge timeout (`AbortSignal.timeout` default 60s), non-ok HTTP, or JSON-parse error all `catch -> false`, indistinguishable from a genuine semantic FAIL. In `ollama-stress-test.mjs:260-269` the SUBJECT answered (non-empty text -> NOT `noSignal`), so a judge-side failure is attributed to the subject as a measured 0% with NO `(ns)` tag. This is exactly the false-0 class the false-0 guard was built to fix, reintroduced at the judge layer, and the result doc (`ollama-generative-stratified-2026-06-25.md`) does not acknowledge it. Under fleet contention (the doc explicitly contrasts contended vs idle runs for the subject) the 32b judge is itself cold-load/timeout-prone, so the judged metric is LESS trustworthy than "validated correct + consistent" implies whenever the GPU is not
... [+2802 chars truncated]
