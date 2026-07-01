---
type: "chat-session"
source: "claude-code-cli"
session_id: "ebe4f6cb-0d7e-440f-a982-8837c4bdce93"
title: "Review commit `c243f01414` in H:/prism (run `git -C H:/prism show c243f01414`). "
date: "2026-06-25"
first_ts: "2026-06-25T14:20:35.043Z"
last_ts: "2026-06-25T14:23:14.573Z"
cwd: "H:\\prism"
messages: 29
user_msgs: 10
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/ebe4f6cb-0d7e-440f-a982-8837c4bdce93/subagents/agent-a9c5213ea736b4d1a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Review commit `c243f01414` in H:/prism (run `git -C H:/prism show c243f01414`). 

> **claude-code-cli** | 2026-06-25 | 29 msgs (10 user / 19 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ebe4f6cb-0d7e-440f-a982-8837c4bdce93/subagents/agent-a9c5213ea736b4d1a.jsonl`

## Transcript

### User | 2026-06-25T14:20:35.043Z

Review commit `c243f01414` in H:/prism (run `git -C H:/prism show c243f01414`). It changes `scripts/lib/model-routing-policy.mjs` + its test `scripts/lib/model-routing-policy.test.mjs`.

CONTEXT: This is PRISM's per-prompt Ollama-offload routing brain. `ollamaSafeClassModels(matrix, threshold)` derives `{taskClass -> bestModel}` from the measured capability matrix, choosing WHICH local model a matrix-proven mechanical class offloads to. The change replaces the old `best = best || model` (first-qualifying in matrix/roster iteration order) with selection of the CHEAPEST qualifying model via a new pure `modelCostRank(modelTag)` that parses the param-size suffix (`:1.5b`/`:32b`/`:120b`). Intent: route each task to the smallest sufficient (matrix-proven 100%) model to free VRAM + raise offload concurrency on the 96GB box.

REVIEW HOLISTICALLY for correctness:
- Is the argmin selection logic correct for: small-first order, big-first order, all-equal/unparseable (must preserve prior first-seen behavior = no regression), single qualifier, zero qualifiers?
- Does `modelCostRank` correctly read ONLY the post-colon tag segment (so `qwen2.5-coder` name decimal isn't parsed as a size)? Edge cases: no colon, `:latest`, quant suffix `7b-instruct-q4`, null/non-string.
- Is the `best === null || rank < bestRank` initialization correct so an all-Infinity set still selects (no silent class drop)?
- Convention conformance, comment honesty (R12), any inlined constants.
Read both files end-to-end. Grade PASS or FAIL with P0/P1/P2 + file:line. Return a concise verdict.

### Assistant | 2026-06-25T14:20:42.981Z

I'll review commit `c243f01414` holistically. Let me start by reading the diff and both files end to end.

### Assistant | 2026-06-25T14:20:43.648Z

[tool_use: Bash]

### User | 2026-06-25T14:20:48.146Z

[tool_result] commit c243f01414a73f80d77ef2ae30c305bb16b1d49d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 25 09:19:45 2026 -0500

    [MAIN-FORCE] [OLLAMA-ROUTING]/U-ALPHA-OLLAMA-CHEAPEST-MODEL-SELECT (slot:alpha): route each matrix-proven mechanical class to the CHEAPEST proven local model, not first-in-roster-order -- completes U-ALPHA-OLLAMA-ROSTER-SYNC (measuring 9 models onl
... [+13047 chars truncated]

### Assistant | 2026-06-25T14:20:52.383Z

Now let me read both files end to end to understand the full contract, not just the diff hunks.

### Assistant | 2026-06-25T14:20:52.894Z

[tool_use: Read]

### User | 2026-06-25T14:20:54.264Z

[tool_result] 1	/**
2	 * model-routing-policy.mjs -- pure: the SINGLE per-prompt model-routing verdict that fuses the
3	 * Claude-tier decision with the MEASURED Ollama capability matrix (U-MODEL-ROUTE-POLICY, slot:india
4	 * 2026-06-11). This is the brain the advisor hook calls.
5	 *
6	 * OPERATOR POLICY (2026-06-11, "fable demolished session limits") -> one verdict per prompt:
7	 *   - ollama  : mechanical ta
... [+12096 chars truncated]

### Assistant | 2026-06-25T14:20:58.671Z

Now let me read the test file end to end to verify the tests actually encode the intent and would fail on a regression.

### Assistant | 2026-06-25T14:20:58.836Z

[tool_use: Read]

### User | 2026-06-25T14:21:00.171Z

[tool_result] 1	// scripts/lib/model-routing-policy.test.mjs
2	// Tests for U-MODEL-ROUTE-POLICY: per-prompt verdict fusing tier-router + capability matrix.
3	
4	import { describe, it } from "node:test";
5	import assert from "node:assert/strict";
6	import { ollamaSafeClassModels, routePrompt, routeCloudLongContext, BATTERY_TO_CLASS, modelCostRank } from "./model-routing-policy.mjs";
7	
8	// A matrix shaped like
... [+16502 chars truncated]

### Assistant | 2026-06-25T14:21:04.266Z

Now let me verify the original (pre-commit) code to confirm the "no regression" claim about the prior `best = best || model` behavior, and run the tests to confirm they pass.

### Assistant | 2026-06-25T14:21:05.373Z

[tool_use: Bash]

### User | 2026-06-25T14:21:09.175Z

[tool_result]   // the deterministic "extract the values/dims/fields" class the prompt classifier emits. It scores
  // ~0% (correctly -- fuzzy listing has no single right answer), so mapping it to "extract" would
  // poison the class and block offloading proven numeric/JSON extraction. It stays probe-only.
});

/**
 * From a capability matrix, derive { class -> bestModel } for every class whose representative
... [+1837 chars truncated]

### Assistant | 2026-06-25T14:21:15.374Z

Confirmed the prior behavior used `Set` iteration (which in JS preserves insertion order for string keys), and `best = best || model` picked first-qualifying in that order. Now let me verify a subtle point: the original used a `Set` while the new code builds an array in first-seen order across taskIds. Let me run the tests to confirm they pass and check the consumers of these functions.

### Assistant | 2026-06-25T14:21:16.079Z

[tool_use: Bash]

### User | 2026-06-25T14:21:23.415Z

[tool_result]       ---
      duration_ms: 0.0756
      ...
    1..5
ok 5 - routePrompt cloud tier ordering
  ---
  duration_ms: 0.4012
  type: 'suite'
  ...
# Subtest: BATTERY_TO_CLASS
    # Subtest: maps every battery task to a real class
    ok 1 - maps every battery task to a real class
      ---
      duration_ms: 0.0569
      ...
    1..1
ok 6 - BATTERY_TO_CLASS
  ---
  duration_ms: 0.0871
  type: 'suite'
... [+109 chars truncated]

### Assistant | 2026-06-25T14:21:27.754Z

All 34 tests pass. Now let me verify the consumers of `ollamaSafeClassModels` and `modelCostRank` to check for silent breakage in downstream callers (the return shape is unchanged — still `Map<class, modelTag>` — but let me confirm).

### Assistant | 2026-06-25T14:21:28.943Z

[tool_use: Grep]

### User | 2026-06-25T14:21:34.178Z

[tool_result] .claude\hooks\model-tier-advisor.mjs.bak-effort-wire:10: * directive on every prompt, sourced from the SINGLE policy brain (model-routing-policy.routePrompt)
.claude\hooks\model-tier-advisor.mjs.bak-effort-wire:54:  try { ({ routePrompt } = await import("../../scripts/lib/model-routing-policy.mjs")); }
.claude\hooks\model-tier-advisor.mjs:10: * directive on every prompt, sourced from the SINGLE po
... [+14803 chars truncated]

### Assistant | 2026-06-25T14:21:43.918Z

The only runtime consumer is `routePrompt` (same module) via `model-tier-advisor.mjs` and `effort-tier-router.mjs`, both of which consume the `{engine, model, tier, taskClass, reason}` verdict shape — unchanged. The `ollamaSafeClassModels` return shape (`Map<class, modelTag>`) and `modelCostRank` is a new export; no consumer breakage.

Let me verify one subtle correctness concern: the original used a `Set` for `models`, and there's a known JS detail about `Set` ordering vs the new array. Both preserve insertion order, but let me confirm the new de-dup loop produces the exact same first-seen order as the old `Set`, since the "no regression on equal/unknown ranks" claim depends on it. I'll also double-check the `clearsAll` guard handles the `s.total > 0` edge and check whether `modelCostRank` regex could mis-parse a name like `qwen3` (no colon).

### Assistant | 2026-06-25T14:21:48.844Z

[tool_use: Bash]

### User | 2026-06-25T14:21:53.127Z

[tool_result] "llama3" => Infinity   // no colon, no b-suffix
"llama3:8b" => 8   // normal
"qwen2.5-coder" => Infinity   // no colon -> reads whole string, 2.5 then... b? no
"codellama:13b" => 13   // normal
"llava:7b" => 7   // normal
"nomic-embed-text:latest" => Infinity   // latest -> Infinity
"gemma2:2b" => 2   // normal
"mixtral:8x7b" => 7   // MoE 8x7b notation
"deepseek-coder-v2:16b" => 16   // v2 in nam
... [+99 chars truncated]

### Assistant | 2026-06-25T14:22:26.035Z

One interesting finding: `qwen2.5-coder` (no colon) returns `Infinity`, NOT 2.5 — because the regex requires a `b` immediately after the number, and `coder` has no `b` right after `2.5`. Good, that's safe. But note `mixtral:8x7b` parses as `7` (the `8x` MoE multiplier is dropped) — this is a rough proxy as the comment honestly admits. Not a defect for the current roster.

Let me verify the `s.total > 0` guard is meaningful and check one boundary: does `clearsAll` correctly require a model to be present in EVERY task (so a model proven on task A but absent from task B is rejected, not silently passed)?

### Assistant | 2026-06-25T14:22:34.451Z

[tool_use: Bash]

### User | 2026-06-25T14:22:38.889Z

[tool_result] extract => proven:32b (expect proven:32b; cheap:1b absent from json-extract must be rejected)
all-unparseable extract => alpha (expect alpha = first-seen, no silent drop)
total=0 extract => undefined (expect undefined - 0 measured runs is not proof)

### Assistant | 2026-06-25T14:22:44.929Z

All three correctness invariants hold:
- A model absent from one task of the class is correctly rejected (the `s &&` guard handles `undefined`).
- An all-`Infinity` (all-unparseable) qualifying set still selects the first-seen model — the `best === null || rank < bestRank` init is correct; no silent class drop.
- The `s.total > 0` guard correctly rejects a 0-measurement model even at `rate 1.0`.

Now the one remaining subtle point: the old code iterated a `Set` while the new code builds an array. Both are first-seen insertion order, so the tie-break is identical. Let me verify that the new de-dup order matches the old `Set` order exactly when a model appears in a later task first (multi-task first-seen ordering parity), to confirm the "preserved exactly" claim.

### Assistant | 2026-06-25T14:22:48.730Z

[tool_use: Bash]

### User | 2026-06-25T14:22:52.571Z

[tool_result] old Set order: b,a,c
new arr order: b,a,c
PARITY: true

### Assistant | 2026-06-25T14:23:14.573Z

First-seen ordering is byte-identical between the old `Set` and the new array. The "stable first-seen tie-break, preserved exactly when sizes are equal or unknown" claim is verified — including the existing `MATRIX` fixture test where both `small`/`big` rank `Infinity` and the result stays `"small"` (the un-regressed first-seen pick).

I have read both files end to end, verified the prior behavior, run all 34 tests (pass), probed every edge case the prompt named, and confirmed no consumer breakage. Here is my verdict.

---

VERDICT: PASS

summary: The argmin-by-cost rewrite of `ollamaSafeClassModels` is correct across every case in scope: small-first, big-first (regression-oracle test pins it), all-equal/unparseable (first-seen preserved — byte-identical to the old `Set` order), single qualifier, and zero qualifiers. `modelCostRank` correctly reads only the post-colon segment so name-decimals (`qwen2.5-coder`) are never parsed as sizes, and the `best === null || rank < bestRank` init guarantees an all-`Infinity` set still selects (no silent class drop). Tests are real R9 oracles (the big-first fixture genuinely fails on the old code), the return shape is unchanged, and no downstream consumer breaks. Comments are honest (R12) — the MoE-rough-proxy caveat is disclosed — and no physics/other constants are inlined.

findings:
- none

What I verified to make this PASS auditable:
- Both files read end to end: `H:/prism/scripts/lib/model-routing-policy.mjs` and `H:/prism/scripts/lib/model-routing-policy.test.mjs`.
- Argmin logic (`model-routing-policy.mjs:153-161`): `if (best === null || rank < bestRank)` with strict `<` gives a stable first-seen tie-break; the `if (!clearsAll) continue` skip is correct.
- Init correctness for all-`Infinity` qualifiers: live-probed — an all-unparseable proven set selects the first-seen model (no class drop). The `best === null` disjunct is load-bearing and present.
- `modelCostRank` (`model-routing-policy.mjs:114-119`): post-colon slice vi
... [+1612 chars truncated]
