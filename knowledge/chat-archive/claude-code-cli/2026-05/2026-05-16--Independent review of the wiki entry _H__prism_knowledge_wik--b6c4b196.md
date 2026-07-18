---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "Independent review of the wiki entry `H:/prism/knowledge/wiki/architecture/nn-gr"
date: "2026-05-16"
first_ts: "2026-05-16T19:23:59.215Z"
last_ts: "2026-05-16T19:26:49.754Z"
cwd: "H:\\prism"
messages: 24
user_msgs: 9
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a3b620d008ddc4af5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# Independent review of the wiki entry `H:/prism/knowledge/wiki/architecture/nn-gr

> **claude-code-cli** | 2026-05-16 | 24 msgs (9 user / 15 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a3b620d008ddc4af5.jsonl`

## Transcript

### User | 2026-05-16T19:23:59.215Z

Independent review of the wiki entry `H:/prism/knowledge/wiki/architecture/nn-graph-ms0.md` — the U8 documentation artifact for milestone NN-GRAPH-MS0 (a GraphSAGE GNN tier-5 added to PRISM's wiring-inference cascade). Use the Read tool.

Weight your review toward documentation QUALITY and OPERATOR CLARITY:
  - Could a fresh engineer who has never seen this milestone read this entry and understand (a) what the GNN tier does, (b) why it is "the floor is hybrid, the ceiling is GNN", (c) how to run it, (d) why the milestone is "shipped-research-only" rather than "completed"?
  - The entry claims the milestone is `shipped-research-only` with a DEFERRED deploy gate. Is the REASON for the deferral clearly explained (no trained checkpoint; producing one is a U4-pipeline run, not harness work)? An operator must not be confused into thinking the milestone failed.
  - Is the "Run it" section's commands correct and copy-pasteable?
  - The unit table (U1..U8) — is it coherent and complete?
  - Does the entry honestly distinguish what was MEASURED (nothing — no checkpoint) from what was BUILT (all 8 units)? A reader must not mistake "all units shipped" for "the model hits AUROC 0.78".
  - Tone/length: is it appropriately concise for a wiki architecture entry, or padded?
  - Are the `[[related]]` frontmatter links sensible?
  - Markdown well-formed (tables, code fences, headings)?

Report concrete P0/P1 findings with specifics. A P0/P1 = a passage that would mislead an operator, a missing critical explanation, or a correctness error. End with `VERDICT: PASS` or `VERDICT: FAIL`.

### Assistant | 2026-05-16T19:24:02.348Z

I'll review the wiki entry for NN-GRAPH-MS0.

### Assistant | 2026-05-16T19:24:02.769Z

[tool_use: Read]

### User | 2026-05-16T19:24:04.227Z

[tool_result] read-once-guard: 'H:\prism\knowledge\wiki\architecture\nn-graph-ms0.md' was already read 7s ago in this session and is unchanged (mtime 1778959408839). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T19:24:07.023Z

The read-once guard claims the file is already in my context, but I do not actually have its content. Let me retrieve it.

### Assistant | 2026-05-16T19:24:07.947Z

[tool_use: Bash]

### User | 2026-05-16T19:24:28.302Z

[tool_result] ---
title: NN-GRAPH-MS0 — Hybrid neural-symbolic GNN tier-5 wiring inference
slug: nn-graph-ms0
kind: architecture
domain: ai-routing
status: shipped-research-only
shipped_at: 2026-05-16
shipped_by: claude-b6c4b196 (slot alpha)
milestone: NN-GRAPH-MS0
related:
  - graphsage-predictor
  - system-viz-first-audit
  - close-out-audit
---

# NN-GRAPH-MS0 — GraphSAGE link-prediction over system-viz

## 
... [+5315 chars truncated]

### Assistant | 2026-05-16T19:24:30.613Z

I have the full content. Now let me verify the load-bearing claims against the actual repo.

### Assistant | 2026-05-16T19:24:33.409Z

[tool_use: Bash]

### Assistant | 2026-05-16T19:24:34.300Z

[tool_use: Bash]

### User | 2026-05-16T19:24:57.912Z

[tool_result] scripts/lib/edge-typology-normalizer.mjs*
scripts/lib/graphsage-predictor.mjs*
scripts/lib/nn-graph-eval.mjs*
scripts/seed-ghost-gnn-classify.mjs*
scripts/seed-ghost-llm-classify.mjs*
---U3---
scripts/lib/graph-random-walk.mjs*
scripts/lib/node2vec-embedder.mjs*
scripts/lib/systemviz-node-feature-projector.mjs*
---U4---
scripts/lib/graphsage-checkpoint.mjs*
scripts/lib/graphsage-model.mjs*
scripts
... [+69 chars truncated]

### User | 2026-05-16T19:24:58.094Z

[tool_result] 6655a98a1 [MAIN] [NN-GRAPH-MS0]/U-NNG-INFERENCE-FIFTH-TIER: U6 — GNN tier-5 wiring-inference gate
e7db71cbc [MAIN] [NN-GRAPH-MS0]/U-NNG-EVAL-HARNESS: U7 — GNN tier-5 assessment harness
645f5fe99 [MAIN] [NN-GRAPH-MS0]/U-NNG-GRAPHSAGE-TRAIN: U4c — model checkpoint JSON serialization
ae25ba33d [MAIN] [NN-GRAPH-MS0]/U-NNG-GRAPHSAGE-TRAIN: U4d — end-to-end training-pipeline CLI orchestrator
458ece24a [
... [+76 chars truncated]

### Assistant | 2026-05-16T19:25:00.531Z

All 14 referenced files exist and all 5 commit SHAs resolve to the claimed units. Let me verify the CLI commands are accurate and check the entrypoint behavior.

### Assistant | 2026-05-16T19:25:03.529Z

[tool_use: Bash]

### User | 2026-05-16T19:25:18.673Z

[tool_result] ===gnn-classify dry-run flag===
36: *   node scripts/seed-ghost-gnn-classify.mjs --dry-run
431:  const out = { dryRun: false, apply: false, limit: Infinity, checkpoint: undefined, minConf: undefined };
435:    if (a === "--dry-run") out.dryRun = true;
443:  if (!out.dryRun && !out.apply) out.dryRun = true;
451:  --dry-run            classify + report, do not write the graph (default)
490:  if (opt
... [+244 chars truncated]

### Assistant | 2026-05-16T19:25:21.252Z

`nn-graph-eval.mjs` has a CLI main guard and `seed-ghost-gnn-classify.mjs` supports `--dry-run`. Let me confirm the eval harness emits to the documented path and check the seed-ghost-llm-classify dry-run flag.

### Assistant | 2026-05-16T19:25:23.370Z

[tool_use: Bash]

### User | 2026-05-16T19:25:34.935Z

[tool_result] 3: * nn-graph-eval.mjs — NN-GRAPH-MS0 / U-NNG-EVAL-HARNESS U7
31: *   node scripts/lib/nn-graph-eval.mjs
32: *   node scripts/lib/nn-graph-eval.mjs --checkpoint c.json --holdout 200 --seed 7
33: *   node scripts/lib/nn-graph-eval.mjs --out-dir state/shared/nn-graph
46:const OUT_DIR = path.join(ROOT, "state", "shared", "nn-graph");
48:const REPORT_NAME = "NN-EVAL";
384:const USAGE = `nn-graph-eval 
... [+1356 chars truncated]

### Assistant | 2026-05-16T19:25:38.070Z

Every load-bearing claim in the entry verifies against the actual code. Let me do a final check on the env knob defaults and the test-count claims.

### Assistant | 2026-05-16T19:25:39.244Z

[tool_use: Bash]

### User | 2026-05-16T19:26:03.434Z

[tool_result] 17: *      confidence >= PRISM_NNG_REF_MIN_CONF (the keyword tier, ~0.85).
62:  minConf: 0.7,         // GNN gate fires only at/above this (PRISM_NNG_MIN_CONF)
108:    disabled: env.PRISM_NNG_DISABLE === "1" || overrides.disabled === true,
109:    minConf: finiteOr(pick(overrides.minConf, env.PRISM_NNG_MIN_CONF), d.minConf, { min: 0, max: 1 }),
110:    refMinConf: finiteOr(pick(overrides.refMinCon
... [+441 chars truncated]

### Assistant | 2026-05-16T19:26:09.641Z

[tool_use: Bash]

### User | 2026-05-16T19:26:21.784Z

[tool_result] 63:  refMinConf: 0.8,      // a ghost is a vote-reference only at/above this confidence
64:  topK: 15,             // nearest references that vote per target
110:    refMinConf: finiteOr(pick(overrides.refMinConf, env.PRISM_NNG_REF_MIN_CONF), d.refMinConf, { min: 0, max: 1 }),
111:    topK: intOr(pick(overrides.topK, env.PRISM_NNG_TOPK), d.topK),
282:    refMinConf: cfg.refMinConf,
319:      topK:
... [+249 chars truncated]

### Assistant | 2026-05-16T19:26:49.754Z

All defaults in the env-knob table verify exactly: `minConf` 0.7, `refMinConf` 0.8, `topK` 15, checkpoint path `state/shared/nn-graph/graphsage-checkpoint.json`, `PRISM_NNG_DISABLE` reverting to the 4-tier cascade. The review is complete.

---

## Review of `nn-graph-ms0.md`

### Verification performed
- All 14 referenced script/lib files exist on disk (`scripts/seed-ghost-gnn-classify.mjs`, `seed-ghost-llm-classify.mjs`, `nn-graph-eval.mjs`, `edge-typology-normalizer.mjs`, `graphsage-predictor.mjs`, all U3 + U4 libs).
- All 5 commit SHAs (`6655a98a1`, `e7db71cbc`, `645f5fe99`, `ae25ba33d`, `458ece24a`) resolve and their commit messages match the claimed units exactly.
- All 5 env-knob defaults in the table match the code constants (`minConf: 0.7`, `refMinConf: 0.8`, `topK: 15`, checkpoint path, `PRISM_NNG_DISABLE` revert semantics).
- The tier-5 gate is genuinely wired into `seed-ghost-llm-classify.mjs:268-276` via `import { gnnClassifyUnknowns }`, and the code comments confirm the "hybrid stays the floor / missing checkpoint = no-op" claim.
- `--dry-run` is a real flag on both `seed-ghost-gnn-classify.mjs` (line 435; default-on when neither `--dry-run`/`--apply` given) and `seed-ghost-llm-classify.mjs` (line 244).
- `nn-graph-eval.mjs` has a proper CLI `main` guard (`import.meta.url === pathToFileURL(process.argv[1])`) and writes `NN-EVAL` into `state/shared/nn-graph` — matching the documented output path.

### Documentation-quality assessment

**(a) What the GNN tier does** — Clear. The "What it is" section frames the cascade's single question (which dispatcher should an unwired ghost engine wire to?), lists the 4 prior tiers cheapest-first with confidences, and positions tier 5 as strictly additive.

**(b) "Floor is hybrid, ceiling is GNN"** — Although the wiki body never uses that exact phrase, the concept is explained precisely and repeatedly: "the 4-tier hybrid is the always-on floor; the GNN only augments," `PRISM_NNG_DISABLE=1` reverts exactly, missing chec
... [+2817 chars truncated]
