---
type: "chat-session"
source: "claude-code-cli"
session_id: "beab93ce-1457-474c-b6f8-bb8723757910"
title: "Independent second-pass review of H:/prism/scripts/bench-vision-ocr-ab.mjs. Weig"
date: "2026-06-03"
first_ts: "2026-06-03T20:01:07.330Z"
last_ts: "2026-06-03T20:09:33.311Z"
cwd: "H:\\prism"
messages: 35
user_msgs: 13
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/beab93ce-1457-474c-b6f8-bb8723757910/subagents/agent-a6b536391c2d4c955.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:25"
---

# Independent second-pass review of H:/prism/scripts/bench-vision-ocr-ab.mjs. Weig

> **claude-code-cli** | 2026-06-03 | 35 msgs (13 user / 22 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/beab93ce-1457-474c-b6f8-bb8723757910/subagents/agent-a6b536391c2d4c955.jsonl`

## Transcript

### User | 2026-06-03T20:01:07.330Z

Independent second-pass review of H:/prism/scripts/bench-vision-ocr-ab.mjs. Weight toward what a correctness reviewer misses: integration coupling, hidden assumptions, silent-failure surfaces, convention conformance, resource/cleanup correctness.

Context: this CLI is the empirical A/B gate that scripts/lib/vision-model-select.mjs references. It benchmarks blueprint-OCR vision models on a 96GB RTX 6000 Blackwell to decide whether to upgrade from the qwen3-vl:8b-instruct safe default to a bigger model. It pairs with vision-ab-compare.mjs (verdict core) and vision-model-select.mjs (selection seam). Compare its synthetic-print generation + OCR transport against the proven scripts/ocr-closed-loop.mjs to confirm the numbers are comparable.

VERIFY (flag P0/P1, grade PASS/FAIL):
1. INTEGRATION: does buildUpgradeRecommendation's output (recommendedModel/nextStep) get surfaced in a way an operator can act on? Does selectVisionModel get called with the right {vramGB, availableModels} so the "SEAM currently picks X" line is accurate?
2. WARM-FIRST CORRECTNESS: the warm call must hit the SAME model+transport as the timed calls and its latency must NOT be counted in the model's scored latency/coverage. Confirm the warm result is fully discarded and doesn't pollute the paired scores.
3. SILENT FAILURE / BIAS: any path where a model that produced garbage scores well; where a systematic per-model failure (e.g. one model OOM-evicted by ollama) is hidden; where genFailures silently shrink the print set without being reported; where the report's headline could imply more coverage than achieved.
4. RESOURCE: temp files (req-*.json inside the lib, png + truth.json) — are prints cleaned up (--keep gate)? Could concurrent runs collide on workDir? Is atomicWriteJson safe?
5. CONVENTION: matches ocr-closed-loop.mjs / run-ocr-benchmark.mjs CLI conventions (arg parsing, --json, exit codes, atomic write, REPO_ROOT resolution)? Any inlined constant that should be named/imported? Does --difficu
... [+271 chars truncated]

### Assistant | 2026-06-03T20:01:19.475Z

I'll review the A/B vision OCR benchmark CLI. Let me start by reading the target file and its companions to understand the integration coupling.

### Assistant | 2026-06-03T20:01:19.994Z

[tool_use: Read]

### User | 2026-06-03T20:01:37.051Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/bench-vision-ocr-ab.mjs
3	//
4	// U-XRAY-VISION-AB — paired A/B blueprint-OCR benchmark across vision models.
5	//
6	// THE GATE vision-model-select.mjs REFERENCES. It answers, with evidence on real
7	// prints, the question that file declares EMPIRICAL: does a bigger GPU-resident
8	// vision model (now affordable on the 96GB RTX 6000 Blackwell) actually beat the
... [+13276 chars truncated]

### Assistant | 2026-06-03T20:01:42.386Z

Now let me read the companion libraries to verify the integration coupling, contracts, and the proven reference (ocr-closed-loop.mjs).

### Assistant | 2026-06-03T20:01:42.542Z

[tool_use: Read]

### User | 2026-06-03T20:02:03.678Z

[tool_result] 1	// scripts/lib/vision-ab-compare.mjs
2	//
3	// U-XRAY-VISION-AB — paired A/B comparison + upgrade verdict for blueprint-OCR
4	// vision models. THIS is the empirical gate that vision-model-select.mjs
5	// references in its header ("answered by the A/B benchmark bench-vision-ocr-ab.mjs,
6	// NOT by an assumed ranking baked in here") but which was never built. Without it,
7	// the Blackwell big-VR
... [+24682 chars truncated]

### Assistant | 2026-06-03T20:02:08.120Z

Now let me read the selection seam and the proven reference closed-loop in parallel to verify the integration contracts and convention conformance.

### Assistant | 2026-06-03T20:02:08.684Z

[tool_use: Read]

### User | 2026-06-03T20:02:26.598Z

[tool_result] 1	// scripts/lib/vision-model-select.mjs
2	//
3	// U-XRAY-VISION-PROFILE — profile/VRAM-aware vision-model selection for blueprint OCR.
4	//
5	// WHY THIS EXISTS
6	//   ollama-vision-extract-lib.mjs pins DEFAULT_VISION_MODEL = "qwen3-vl:8b-instruct"
7	//   because the old RTX 4080 SUPER (16GB) could not fit a larger vision model
8	//   GPU-resident alongside the chat fleet's coder offload (qwen2.5
... [+17610 chars truncated]

### Assistant | 2026-06-03T20:02:39.113Z

Now the proven reference closed-loop and the benchmark CLI conventions. Let me read both in parallel.

### Assistant | 2026-06-03T20:02:39.114Z

[tool_use: Read]

### User | 2026-06-03T20:03:05.509Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/ocr-closed-loop.mjs
3	//
4	// U-PSGB-XRAY-CLOSED-LOOP — the OCR print-reading closed loop, end to end:
5	//   GENERATE a clean synthetic dimensioned print with KNOWN ground-truth dims
6	//   → OCR it with qwen3-vl:8b-instruct (the concurrent GPU-resident model)
7	//   → SCORE the extracted dims vs ground truth (value-recovery precision/recall/F1/MAE)
8	//   → AGG
... [+8396 chars truncated]

### Assistant | 2026-06-03T20:03:15.595Z

[tool_use: Bash]

### Assistant | 2026-06-03T20:03:13.566Z

[tool_use: Bash]

### Assistant | 2026-06-03T20:03:12.624Z

Now let me check the synthetic-print-gen.py truth file naming and the dimension scorer to confirm contract alignment, plus whether tests exist for the benchmark.

### User | 2026-06-03T20:04:18.905Z

[tool_result] 7:# truth, then emits the PNG plus a <png>.truth.json sidecar listing the true dims
13:# truth nominal_mm = inches * 25.4 so it lines up with the code-side inch->mm
129:    # (x25.4). Recorded in truth.gdt[]; the dimension scorer does NOT grade GD&T (orthogonal — for
150:    # bed scan does — the truth dims are unchanged; only the rendering is harder.
160:    truth = {"seed": seed, "units": "in", 
... [+275 chars truncated]

### User | 2026-06-03T20:04:18.914Z

[tool_result] scripts/lib/ocr-benchmark-lib.test.mjs
scripts/lib/ollama-vision-extract-lib.test.mjs
scripts/lib/vision-ab-compare.test.mjs
scripts/lib/vision-model-select.test.mjs
---
--- existsSync usage in gen lib ---
7:# truth, then emits the PNG plus a <png>.truth.json sidecar listing the true dims
16:# USAGE: python synthetic-print-gen.py --out <png> --seed <int> [--units in|mm]
97:        # leader + Ø cal
... [+213 chars truncated]

### Assistant | 2026-06-03T20:04:25.705Z

The truth-file naming (`<png>.truth.json`) matches what the benchmark uses. Now let me verify the run-ocr-benchmark.mjs convention reference (mentioned in the review prompt) and check the `summarizeModelRun` field `s.ran` usage plus the `s.maeMm` field used in the human report.

### Assistant | 2026-06-03T20:04:33.276Z

[tool_use: Bash]

### Assistant | 2026-06-03T20:04:28.676Z

[tool_use: Bash]

### User | 2026-06-03T20:04:40.732Z

[tool_result] Exit code 126
EXISTS
28://   node scripts/run-ocr-benchmark.mjs --ground-truth-dir <dir> [--stub-mode] [--json]
52:const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
53:const DEFAULT_GT_DIR = env.PRISM_OCR_GT_DIR || join(REPO_ROOT, "state", "shared", "ocr-ground-truth");
54:const DEFAULT_OUT_DIR = env.PRISM_OCR_BENCHMARK_DIR || join(REPO_ROOT, "state", "shared", "ocr-benchma
... [+323 chars truncated]

### User | 2026-06-03T20:05:14.328Z

[tool_result] scripts/bench-vision-ocr-ab.mjs:64:const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
=== does the test import the impure shell? ===
6:import { test } from "node:test";
7:import assert from "node:assert/strict";
9:import {
16:  runModelOverPrints,
309:// ── runModelOverPrints (impure shell — hermetic via injected deps) ───────────
311:test("runModelOverPrints: every OCR fail
... [+280 chars truncated]

### Assistant | 2026-06-03T20:05:18.497Z

Let me verify the `atomicWriteJson` convention in run-ocr-benchmark.mjs (to compare with the benchmark's version) and confirm `run-ocr-benchmark.mjs` uses a main-guard, plus check the benchmark's lack of a main-guard against its peers.

### Assistant | 2026-06-03T20:05:19.517Z

[tool_use: Read]

### Assistant | 2026-06-03T20:05:21.780Z

[tool_use: Bash]

### User | 2026-06-03T20:05:43.209Z

[tool_result] 60	  };
61	  for (let i = 0; i < args.length; i++) {
62	    const a = args[i];
63	    if (a === "--ground-truth-dir") out.groundTruthDir = args[++i];
64	    else if (a === "--ground-truth-file") out.groundTruthFile = args[++i];
65	    else if (a === "--stub-mode") out.stubMode = true;
66	    else if (a === "--no-vlm") out.noVlm = true;
67	    else if (a === "--json") out.json = true;
68	  }
69	  r
... [+662 chars truncated]

### User | 2026-06-03T20:06:13.689Z

[tool_result] 202:main().catch((e) => {
=== warm-bias + concurrency: does workDir collide? grep tmp paths ===
scripts/bench-vision-ocr-ab.mjs:41:import { tmpdir } from "node:os";
scripts/bench-vision-ocr-ab.mjs:105:  const tmp = path + ".tmp-" + process.pid + "-" + Date.now();
scripts/bench-vision-ocr-ab.mjs:163:  const workDir = join(tmpdir(), "vision-ocr-ab");
scripts/bench-vision-ocr-ab.mjs:164:  mkdirSync(w
... [+1162 chars truncated]

### Assistant | 2026-06-03T20:06:36.174Z

I have everything I need. Let me trace through the key concerns precisely, focusing on the warm-first correctness, the workDir collision, and the seed-base reproducibility.

Key observations from the trace:

1. **WorkDir collision (P1)**: `workDir = join(tmpdir(), "vision-ocr-ab")` is a fixed shared path. PNG names are `ab-<seed>.png` (no PID). Two concurrent benchmark runs with overlapping `--seed-base` write the same PNG/truth files. The req-file names DO include `model` (line 415) but NOT pid, and `seed: "warm"` collides across concurrent runs of the same model. The atomicWriteJson for the *report* is safe (pid+timestamp tmp), but the prints workdir is not isolated. ocr-closed-loop.mjs has the identical pattern, so this is a pre-existing convention — but the A/B is explicitly meant to be run on a shared Blackwell host where the fleet may collide.

2. **Warm result discard — CONFIRMED CORRECT**: The warm call at line 185 captures into local `warm`, logs it, and never pushes it into `runs`. The timed `runModelOverPrints` (line 189) is a separate call. Warm latency is not in `latencyMsList`. Clean.

Let me verify one subtle bias concern — whether the warm call reuses `prints[0].png` and whether a warm-induced file mutation could affect the timed run, and confirm the `seedBase` default collision between bench (7000) and closed-loop (1000).

### Assistant | 2026-06-03T20:06:39.076Z

[tool_use: Bash]

### User | 2026-06-03T20:07:14.160Z

[tool_result] === bench seed-base default vs closed-loop (collision check) ===
scripts/ocr-closed-loop.mjs:68:  const seedBase = parseInt(get("--seed-base", "1000"), 10) || 1000;
scripts/ocr-closed-loop.mjs:75:  console.log(`[closed-loop] model=${model} count=${count} seed-base=${seedBase} difficulty=${difficulty}`);
scripts/ocr-closed-loop.mjs:79:    const seed = seedBase + i;
scripts/bench-vision-ocr-ab.mjs:9
... [+926 chars truncated]

### Assistant | 2026-06-03T20:07:25.444Z

I have a complete picture. The bench uses `seedBase` 7000 vs closed-loop 1000, so seeds differ but the workDir basenames also differ (`ab-` vs `syn-`), so no cross-script collision — but same-script concurrency still collides. The `selectVisionModel` call passes `{vramGB, availableModels: available}` correctly (the full pulled set, not just vision-filtered), matching what the SEAM uses in production.

Let me confirm one final integration point: whether `available` (passed to selectVisionModel) is the raw `/api/tags` list including non-vision models — because the SEAM's availability gate checks `available.includes(preferenceModel)`, and the preference models are vision tags, so passing the full list is correct. And verify `fetchAvailableVisionModels` returns ALL models or only vision ones (the name suggests vision-only).

### Assistant | 2026-06-03T20:07:28.285Z

[tool_use: Bash]

### User | 2026-06-03T20:07:58.169Z

[tool_result] === does fetchAvailableVisionModels filter to vision-only, or return ALL pulled tags? ===
178:    const arr = raw.map((s) => String(s).trim()).filter(Boolean);
182:  const arr = raw.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
212:  const available = Array.isArray(args.availableModels) ? args.availableModels.filter((m) => typeof m === "string") : [];
295:    const mibs = String(r.stdout).
... [+733 chars truncated]

### Assistant | 2026-06-03T20:09:33.311Z

Confirmed: `fetchAvailableVisionModels` despite its name returns ALL pulled tags (line 322 maps every `m.name`, no vision filter). So `selectVisionModel({availableModels: available})` receives the full store list — exactly what the production seam sees — so the "SEAM currently picks X" line is accurate. The `isVisionModel` filter is correctly applied ONLY to auto-discovery (line 118), not to the availability gate.

I now have everything needed for the verdict.

---

## Independent Second-Pass Review — `scripts/bench-vision-ocr-ab.mjs`

**Verdict: PASS** (0 P0, 1 P1, several P2/P3). The integration coupling is sound, the warm-first discard is correct, and the silent-failure surfaces a correctness reviewer would chase are all guarded. The one P1 is a shared-workDir concurrency hazard the file's own header invites by targeting a multi-chat Blackwell host.

### 1. INTEGRATION — PASS
- **`buildUpgradeRecommendation` is actionable.** Its `recommendedModel`/`nextStep` are in `report.recommendation` (line 231) AND surfaced to the operator at line 249 (`[ab] NEXT: ${recommendation.nextStep}`). On `--json`, the whole `report` (incl. `recommendation`) plus `reportPath` is emitted (line 236). The thinking-trap edge in `buildUpgradeRecommendation` (vision-ab-compare.mjs:330-335) means a recommended bare-tag would print a WARNING next-step rather than a wire-this lie. Good.
- **`selectVisionModel` is called with the right args** (line 212): `{ vramGB, availableModels: available }`. Critically, `available` is the *raw full* `/api/tags` list (the function name `fetchAvailableVisionModels` is misleading — it returns ALL tags, vision-ab-compare.mjs path / vision-model-select.mjs:322 confirm no vision filter). That is exactly what the production seam consumes, so the `[ab] SEAM: vision-model-select currently picks "X"` line (248) is faithful — it is not biased by the bench's own vision-only auto-discovery filter (which is correctly scoped to line 118 only). No P0/P1 here.

### 2. WARM
... [+8009 chars truncated]
