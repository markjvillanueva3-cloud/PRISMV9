---
type: "chat-session"
source: "claude-code-cli"
session_id: "03315be5-fba7-4186-8b85-d4558278f3e3"
title: "Per-file scrutiny review (Arm A — content specialist). File to review: H:/prism/"
date: "2026-05-21"
first_ts: "2026-05-21T01:03:20.261Z"
last_ts: "2026-05-21T01:07:20.324Z"
cwd: "H:\\prism"
messages: 21
user_msgs: 8
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/03315be5-fba7-4186-8b85-d4558278f3e3/subagents/agent-aa43ab31277c60451.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Per-file scrutiny review (Arm A — content specialist). File to review: H:/prism/

> **claude-code-cli** | 2026-05-21 | 21 msgs (8 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/03315be5-fba7-4186-8b85-d4558278f3e3/subagents/agent-aa43ab31277c60451.jsonl`

## Transcript

### User | 2026-05-21T01:03:20.261Z

Per-file scrutiny review (Arm A — content specialist).

File to review: H:/prism/mcp-server/src/engines/MasterBrainBackpropPropagatorEngine.ts (~390 lines)

Context — what this is:
- Unit U-CADC-LP04 of CAD-COMPLETE-MS0 closed-loop NN cluster.
- Stage 4 of 5: LP01 (CADExecutionOutcomeBusEngine) → LP02 (CADPerAdapterFeedbackCollectorEngine) → LP03 (CADHeadReplayBufferEngine, prioritized replay) → LP04 (this engine, backprop propagator) → NN01 (foundation encoder, not yet built).
- Acceptance criterion: "Gradient update visible on master + heads; EWC++ / LoRA-safe preservation of prior skills."

Model: each target (master + each per-CAD-system head) is a linear value head v = θ·φ over a fixed 4-d feature vector φ. Loss L = w·(v-r)² with PER importance-sampling weights, gradient g = w·2·(v-r)·φ. Two catastrophic-forgetting mechanisms: online EWC++ (γ-decayed Fisher F, consolidated reference θ*, penalty gradient λ·F⊙(θ-θ*)) and LoRA-safe mode (frozen base θ, all updates accumulate in loraDelta).

What to verify (READ THE FILE END-TO-END FIRST — do not skim, do not guess):
1. **Correctness of the math.** Is `gradSum[i] += isw * 2 * err * phi[i]` the right WLS gradient given L = w·(v-r)²? Is the mean-of-gradients applied (gradSum/n) consistent with the loss being a sum (not a mean)? Is the EWC penalty `λ·F⊙(θ_eff − θ*)` applied at the right θ point (effective vs base)?
2. **LoRA-safe semantics.** When `loraMode=true`, does the base `theta` stay zero across all updates? Does `loraDelta` move? Is the `effective(t) = θ + loraDelta` reading point correct for both `before` and `after`?
3. **EWC++ Fisher accumulation.** `gradSqAccum[i] += meanGrad[i]²` — is the squared *mean* gradient correct here, or should it be the per-sample squared gradient (the "empirical Fisher")? Whichever is chosen, is it defensible against Kirkpatrick 2017 + Schwarz 2018?
4. **Reward shaping.** `SUCCESS_BASE * success + REGEN_BONUS * regenOk - COLLISION_PENALTY * collision - TIMING_PENALTY * normTimin
... [+2399 chars truncated]

### Assistant | 2026-05-21T01:03:58.344Z

I'll read the file end-to-end and verify every claim against the actual code.

### Assistant | 2026-05-21T01:03:59.135Z

[tool_use: Read]

### User | 2026-05-21T01:04:02.048Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\MasterBrainBackpropPropagatorEngine.ts' was already read 2m ago in this session and is unchanged (mtime 1779323883448). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: P
... [+18 chars truncated]

### Assistant | 2026-05-21T01:04:06.454Z

The file is in my context but I need to actually see it to review. Let me bypass the cache.

### Assistant | 2026-05-21T01:04:07.683Z

[tool_use: Bash]

### User | 2026-05-21T01:04:46.383Z

[tool_result] 390 H:/prism/mcp-server/src/engines/MasterBrainBackpropPropagatorEngine.ts

### Assistant | 2026-05-21T01:04:49.605Z

[tool_use: Read]

### User | 2026-05-21T01:04:56.351Z

[tool_result] 1	/**
2	 * MasterBrainBackpropPropagatorEngine — U-CADC-LP04 / CAD-COMPLETE-MS0
3	 *
4	 * The back-propagation stage of the CAD closed-loop learner. Given a
5	 * prioritized replay batch (from LP03), it computes a gradient step and
6	 * applies it to BOTH:
7	 *   - the shared MASTER policy (cross-CAD-system knowledge), and
8	 *   - the per-CAD-system NN HEAD that produced the batch.
9	 * so a sing
... [+4463 chars truncated]

### Assistant | 2026-05-21T01:05:00.006Z

I'll acknowledge the audit chain note and continue reading the file to complete the review.

### Assistant | 2026-05-21T01:05:01.344Z

[tool_use: Read]

### User | 2026-05-21T01:05:12.817Z

[tool_result] 100	}
101	
102	/** Snapshot of one target's parameters + EWC state. */
103	export interface TargetParams {
104	  /** Target id. */
105	  target: string;
106	  /** Base weight vector (frozen in LoRA mode). */
107	  theta: number[];
108	  /** LoRA-style delta vector (always zero outside LoRA mode). */
109	  loraDelta: number[];
110	  /** Effective params = theta + loraDelta. */
111	  effective: numb
... [+6010 chars truncated]

### Assistant | 2026-05-21T01:05:17.849Z

Acknowledged. Continuing the read.

### Assistant | 2026-05-21T01:05:19.052Z

[tool_use: Read]

### User | 2026-05-21T01:05:28.193Z

[tool_result] 248	    const t = this.getOrCreate(target);
249	    return {
250	      target,
251	      theta: [...t.theta],
252	      loraDelta: [...t.loraDelta],
253	      effective: this.effective(t),
254	      fisher: [...t.fisher],
255	      thetaStar: [...t.thetaStar],
256	      updates: t.updates,
257	    };
258	  }
259	
260	  /** The reserved master-policy target id. */
261	  static get MASTER(): string 
... [+4830 chars truncated]

### Assistant | 2026-05-21T01:05:32.203Z

Acknowledged. Now let me verify the FeedbackSample type and ReplayBatch contracts so I can grade items 4/5 honestly.

### Assistant | 2026-05-21T01:05:34.139Z

[tool_use: Grep]

### Assistant | 2026-05-21T01:05:35.698Z

[tool_use: Grep]

### User | 2026-05-21T01:05:58.832Z

[tool_result] 73:export interface ReplayEntry {
74-  /** Monotonic per-head id — stable across eviction (an evicted id is simply absent). */
75-  id: number;
76-  /** NN head id (== CAD adapter) this entry belongs to. */
77-  headId: string;
78-  /** The buffered training sample. */
79-  sample: FeedbackSample;
80-  /** Raw priority p_i = |TD-error| + ε (α applied at sample time, not here). */
81-  priority: nu
... [+976 chars truncated]

### User | 2026-05-21T01:05:58.834Z

[tool_result] 57:export interface FeedbackSample {
58-  /** NN head id — equal to the producing CAD adapter (cadSystem). */
59-  headId: string;
60-  /** True iff the CAD operation completed without error. */
61-  success: boolean;
62-  /** Wall-clock execution time in ms (non-negative finite). */
63-  timingMs: number;
64-  /** True iff a collision was reported (undefined outcome field → false). */
65-  collis
... [+902 chars truncated]

### Assistant | 2026-05-21T01:07:20.324Z

I have everything I need to grade end-to-end. Acknowledging the task-list reminder (the in-progress task tracks this same unit; I'll leave it as-is since this is the review, not the build).

---

# VERDICT: PASS (with P1 fixes required before commit)

The math is correct, contract integration is clean, fail-loud + fail-soft boundaries match the JSDoc, and LoRA/EWC++ semantics hold up against Kirkpatrick 2017 + Schwarz 2018. There are real issues — but none are P0 blockers; the next file in the cluster can proceed in parallel with the P1 fixes.

---

## P0 (must fix before next file)

None. No code path crashes on prod-shaped input, no math is silently wrong in a way that would propagate downstream into LP05/NN01.

---

## P1 (must fix before commit)

### P1-1 — `consolidate()` on a never-stepped target inflates Fisher with phantom zeros
`MasterBrainBackpropPropagatorEngine.ts:233-243`

```
const denom = Math.max(1, t.gradSqCount);
for (let i = 0; i < FEATURE_DIM; i++) {
  const fisherNew = t.gradSqAccum[i] / denom;
  t.fisher[i] = this.fisherDecay * t.fisher[i] + fisherNew;
}
t.thetaStar = this.effective(t);
```

If `consolidate("h")` is called on a target with **`gradSqCount === 0`** (never stepped, or stepped-then-consolidated-then-consolidated-again), the path still runs: `fisherNew = 0 / 1 = 0`, `fisher[i] *= γ`, **`thetaStar` is overwritten to the current effective**, and `totalConsolidations++`. The Fisher decay-without-evidence is a real EWC++ defect — Schwarz 2018 only applies γ-decay *when new Fisher mass arrives*. Repeated no-op consolidates will exponentially shrink the EWC anchor's protective strength.

Fix: guard `if (t.gradSqCount === 0) return { target, fisherNorm: l2(t.fisher) };` BEFORE touching `fisher` / `thetaStar` / the counter.

### P1-2 — EWC penalty uses pre-step effective θ but mean-grad reduction has wrong loss-sum semantics for n>1
`MasterBrainBackpropPropagatorEngine.ts:309, 312, 322`

The docstring (lines 13-17) says `L = w·(v − r)²` and
... [+9864 chars truncated]
