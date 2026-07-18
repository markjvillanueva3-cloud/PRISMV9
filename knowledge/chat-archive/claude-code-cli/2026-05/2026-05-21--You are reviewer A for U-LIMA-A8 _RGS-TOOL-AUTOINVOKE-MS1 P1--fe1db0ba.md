---
type: "chat-session"
source: "claude-code-cli"
session_id: "fe1db0ba-56e2-4bf4-8faa-3ecc49b65d27"
title: "You are reviewer A for U-LIMA-A8 (RGS-TOOL-AUTOINVOKE-MS1 P1 item #6 — cross-pip"
date: "2026-05-21"
first_ts: "2026-05-21T01:24:59.521Z"
last_ts: "2026-05-21T01:26:06.700Z"
cwd: "H:\\prism"
messages: 4
user_msgs: 2
assistant_msgs: 2
raw_file: "H:/.claude/projects/H--prism/fe1db0ba-56e2-4bf4-8faa-3ecc49b65d27/subagents/agent-ab82d4151310962a9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# You are reviewer A for U-LIMA-A8 (RGS-TOOL-AUTOINVOKE-MS1 P1 item #6 — cross-pip

> **claude-code-cli** | 2026-05-21 | 4 msgs (2 user / 2 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/fe1db0ba-56e2-4bf4-8faa-3ecc49b65d27/subagents/agent-ab82d4151310962a9.jsonl`

## Transcript

### User | 2026-05-21T01:24:59.521Z

You are reviewer A for U-LIMA-A8 (RGS-TOOL-AUTOINVOKE-MS1 P1 item #6 — cross-pipeline transfer-priors adapter). Read the WHOLE FILE end to end and grade PASS or FAIL.

FILE: H:/prism/scripts/lib/rgs-transfer-priors-adapter.mjs

CONTRACT this file MUST satisfy:
1. Export `makeTransferPriorsOutcomes(baseReader, opts)` — returns a function with signature `({pipeline, tier, verdict}) -> Promise<{shipped, blocked, reverted}>` (non-negative finite integers).
2. When the underlying `baseReader` returns nonzero own outcomes, the wrapper PASSES THROUGH unchanged — own signal always wins.
3. When own outcomes are `{0,0,0}`, the wrapper aggregates donor pipelines from `TRANSFER_PAIRS` and returns the discounted (default 0.5x) Math.floor'd aggregate.
4. Graceful degradation: baseReader throws → return zeros; one donor throws → other donors still aggregated; opts.discount=0 → identity pass-through; non-finite/negative discount → falls back to DEFAULT_DISCOUNT.
5. `pipelineToCluster` is null-safe (handles null/undefined/empty/non-string), and `Object.prototype.hasOwnProperty.call` guards against `__proto__`/`constructor` prototype-walk.
6. `wedm` cluster has empty donor set (different physics from cutting).
7. CONSTANTS (`PIPELINE_CLUSTERS`, `PIPELINE_CLUSTER_MAP`, `TRANSFER_PAIRS`) are Object.freeze'd at the outer level.

CONTEXT: this mirrors A6 (rgs-rie-adapter.mjs) and A7 (rgs-calibration-adapter.mjs) — same author, same family of adapters in scripts/lib/. The TEST file at H:/prism/scripts/lib/rgs-transfer-priors-adapter.test.mjs has 36 cases (35 pass + 1 honest skip — node:test run cleanly).

REVIEW FOCUS (your unique angle — silent-breakage / integration / correctness):
- Donor enumeration correctness — does `listDonorPipelines` ever return the target itself? Does the donor list match the TRANSFER_PAIRS table?
- Integer-discount semantics — does Math.floor on the discount produce a "subtle silent bias" (e.g. discount<1 always rounds donor signal DOWN, so a single donor succ
... [+732 chars truncated]

### Assistant | 2026-05-21T01:25:12.473Z

[tool_use: Read]

### User | 2026-05-21T01:25:41.621Z

[tool_result] 1	/**
2	 * rgs-transfer-priors-adapter.mjs — cross-pipeline transfer-priors adapter for
3	 * the rgs-tool-planner outcomes reader.
4	 *
5	 * Why this exists (U-LIMA-A8 / RGS-TOOL-AUTOINVOKE-MS1 P1 punch-list item #6):
6	 *   The punch-list names this unit "Cross-milestone transfer priors —
7	 *   `prism_ai:xproc_transfer_*` for cold-start milestones." Reality check:
8	 *   `prism_ai:xproc_transfer
... [+15919 chars truncated]

### Assistant | 2026-05-21T01:26:06.700Z

## Reviewer A — U-LIMA-A8 transfer-priors adapter

### Findings

**P2 — Donor enumeration crosses cluster boundaries silently.** `listDonorPipelines` skips `donorPipeline === targetPipeline` (string match), but does NOT filter donors that re-resolve to the target cluster. Today's `PIPELINE_CLUSTER_MAP` is consistent, so this is latent — but if a future entry maps `/mill-foo` to cluster `lathe` by typo, `/mill` could receive `/mill-foo` as a donor. Same-cluster contamination would be invisible. Doc-block at L219 claims the future-proofing covers this but the guard is by name, not by cluster.

**P2 — Integer-discount silent-zero bias is documented but still load-bearing.** `applyDiscount` with `discount=0.5` Math.floors each field independently. Donor aggregate `{shipped:1, blocked:1, reverted:1}` → `{0,0,0}`. The doc-block at L274 says this is correct ("a single donor success at half-weight is honestly less than one full success"), but the wrapper then returns indistinguishably-zero outcomes — the planner's re-rank cannot tell "no donors found" from "donors found but all sub-threshold." Honestly designed fail-soft, but worth flagging since the unit description claims "donor signal aggregated."

**P3 — Cluster typo in `PIPELINE_CLUSTER_MAP` is silently dropped.** L164: `if (map[cluster]) map[cluster].push(pipeline)` — if a future entry uses cluster `"miil"`, the pipeline vanishes from `PIPELINES_BY_CLUSTER` with zero diagnostic. No throw, no console warn. Matches the file's fail-soft posture but invisible to schema validators.

**P3 — `pipelineToCluster(non-string)` correct; `pipelinesInCluster(non-string)` not guarded.** L200: `PIPELINES_BY_CLUSTER[cluster] ?? Object.freeze([])` — passing `null`/`{}` returns `undefined ?? frozen[]` → `frozen[]` (safe by accident). Object key coercion makes `pipelinesInCluster({toString:()=>"mill"})` return the mill array. Defensive but not in the contract's null-safety spirit.

**P3 — Async error swallow at L331 is symmetric but mask
... [+926 chars truncated]
