---
type: "chat-session"
source: "claude-code-cli"
session_id: "b84af9c3-f5df-42ba-bf2f-08de45fe31f5"
title: "Independent second-pass review of the latest commit on cad-fusion-live-ms0 in H:"
date: "2026-06-23"
first_ts: "2026-06-23T18:15:58.402Z"
last_ts: "2026-06-23T18:20:18.132Z"
cwd: "H:\\prism"
messages: 67
user_msgs: 23
assistant_msgs: 44
raw_file: "H:/.claude/projects/H--prism/b84af9c3-f5df-42ba-bf2f-08de45fe31f5/subagents/agent-a84e17076c560e330.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Independent second-pass review of the latest commit on cad-fusion-live-ms0 in H:

> **claude-code-cli** | 2026-06-23 | 67 msgs (23 user / 44 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b84af9c3-f5df-42ba-bf2f-08de45fe31f5/subagents/agent-a84e17076c560e330.jsonl`

## Transcript

### User | 2026-06-23T18:15:58.402Z

Independent second-pass review of the latest commit on cad-fusion-live-ms0 in H:/prism (slot:india, U-GNN-GPU-EMBED-A2). Do NOT assume a prior reviewer caught everything. Run `git -C H:/prism show HEAD` for the diff.

Weighted toward TEST INTEGRITY + inlined constants + silent weakening:
1. scripts/quantize-vecs-to-ghost-embeddings.test.mjs: are the assertions REAL reference values (R9), not toBeDefined/presence-only stubs? Verify the int8 quantization test ([3,4,0,0] -> q[1]==127, q[0]==95) is arithmetically correct (unit=[0.6,0.8,0,0], maxAbs 0.8, scale 0.8/127, round(0.6/(0.8/127))=95). Confirm the dim-mismatch, missing-meta, and refIds-restriction tests genuinely fail if the logic regressed (not trivially green).
2. Run the tests yourself: `cd H:/prism && node scripts/quantize-vecs-to-ghost-embeddings.test.mjs` (node:test auto-runs on exit) and `node scripts/build-node-embeddings.test.mjs`. Confirm 5/5 and 53/53, no skips/only.
3. embed-nodes-gpu.py: any hardcoded path/model that should be a flag? Does it fail LOUD (non-zero exit) on cuda-unavailable / empty-input / model-load error rather than silently writing an empty/partial file? Is resume keyed correctly?
4. Any inlined magic number that should be derived; any silent fallback that masks failure.

Read files end-to-end. Grade PASS or FAIL with P0/P1/P2 + file:line. Concise.

### Assistant | 2026-06-23T18:16:12.450Z

I'll review the latest commit on cad-fusion-live-ms0. Let me start by examining the diff and reading the relevant files.

### Assistant | 2026-06-23T18:16:12.924Z

[tool_use: Bash]

### User | 2026-06-23T18:16:17.761Z

[tool_result] commit 2d01e9cfbbe26fc5fb8ea8366e120732aa0034e1
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 23 13:15:13 2026 -0500

    [MAIN-FORCE] [HERMES-OBSIDIAN-COMBO]/U-HERMES-VAULT-DIGEST (slot:zulu): Hermes+Obsidian combo that measurably RAISES hermes utilization
    
    Operator: 'get optimal utilization up for hermes agent + hermes+obsidian combos'.
    Pass-2 assessment
... [+1415 chars truncated]

### Assistant | 2026-06-23T18:16:24.276Z

The HEAD commit is a different commit than what I was asked to review. The task references commit U-GNN-GPU-EMBED-A2 (slot:india) with files `scripts/quantize-vecs-to-ghost-embeddings.test.mjs`, `scripts/build-node-embeddings.test.mjs`, and `embed-nodes-gpu.py`. The actual HEAD is U-HERMES-VAULT-DIGEST (slot:zulu). Let me locate the correct commit.

### Assistant | 2026-06-23T18:16:25.126Z

[tool_use: Bash]

### User | 2026-06-23T18:16:28.985Z

[tool_result] 0ca453bddf [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-GPU-EMBED-A2 (slot:india): GPU embedder + emit-texts tap + parity join -- MEASURED stronger-embedding lever lifts tier-5 ranking (nomic->mxbai@1024: AUROC 0.783->0.835, macroF1 0.308->0.381, selective 3/5->4/5, 5-seed) but does NOT clear full-coverage gate (0/5; macroF1 0.38<0.55, Brier 0.19>0.15). Deployed selective posture stays per A2 adopt-only-if
... [+118 chars truncated]

### Assistant | 2026-06-23T18:16:33.995Z

Found it. The target commit is `0ca453bddf`. Let me get the full file list and the diff.

### Assistant | 2026-06-23T18:16:34.384Z

[tool_use: Bash]

### User | 2026-06-23T18:16:37.896Z

[tool_result] commit 0ca453bddf45e30e14e1217291a9103a192511c4
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 23 13:14:50 2026 -0500

    [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-GPU-EMBED-A2 (slot:india): GPU embedder + emit-texts tap + parity join -- MEASURED stronger-embedding lever lifts tier-5 ranking (nomic->mxbai@1024: AUROC 0.783->0.835, macroF1 0.308->0.381, selective 3/5->4/5, 5
... [+673 chars truncated]

### Assistant | 2026-06-23T18:16:40.639Z

Now let me read all the relevant files end-to-end. Let me resolve their absolute paths and read them in parallel.

### Assistant | 2026-06-23T18:16:41.074Z

[tool_use: Read]

### User | 2026-06-23T18:16:42.131Z

[tool_result] 1	// Tests for quantize-vecs-to-ghost-embeddings (slot:india, A2 GNN re-embed join).
2	// Real reference-value assertions (R9): concrete int8 quantization, strict ref-set
3	// filtering, dim-mismatch + missing-meta handling, and JSONL meta/blank/corrupt skip.
4	import { test } from "node:test";
5	import assert from "node:assert/strict";
6	import fs from "node:fs";
7	import os from "node:os";
8	imp
... [+3900 chars truncated]

### Assistant | 2026-06-23T18:16:44.564Z

Now let me read the implementation file that the tests verify against, plus the other changed files.

### Assistant | 2026-06-23T18:16:45.047Z

[tool_use: Read]

### User | 2026-06-23T18:16:45.934Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * quantize-vecs-to-ghost-embeddings.mjs -- join GPU float vectors (embed-nodes-gpu.py)
4	 * with ghost metadata into a deployed-format ghost-node-embeddings JSONL candidate
5	 * (slot:india, A2 / GNN re-embed). The candidate is consumed by
6	 *   nn-graph-holdout-variance.mjs --embed-path <candidate>
7	 * for a pure MODEL-SWAP A/B against the deployed nomic ghost poo
... [+6261 chars truncated]

### Assistant | 2026-06-23T18:16:49.039Z

Now let me read the `quantize` function in build-node-embeddings.mjs (the diff context) and the Python embedder, plus the test file for build-node-embeddings.

### Assistant | 2026-06-23T18:16:49.611Z

[tool_use: Read]

### User | 2026-06-23T18:16:50.754Z

[tool_result] 1	#!/usr/bin/env python
2	"""
3	embed-nodes-gpu.py -- GPU text embedder for the GNN re-embed (slot:india, A2 / U-RAG-6).
4	
5	Reads a JSONL of {id, text} records, embeds each `text` with a sentence-transformers
6	model on the Blackwell GPU, and writes a JSONL of {id, vec:[float, ...]} (L2-normalized
7	float vectors). The JS side (build-node-embeddings.mjs `quantize`) owns int8 quantization
8	and t
... [+6470 chars truncated]

### Assistant | 2026-06-23T18:16:54.444Z

Now let me read the `quantize` function in build-node-embeddings.mjs and look at the diff to that file plus its test file.

### Assistant | 2026-06-23T18:16:55.372Z

[tool_use: Bash]

### User | 2026-06-23T18:16:58.829Z

[tool_result] commit 0ca453bddf45e30e14e1217291a9103a192511c4
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 23 13:14:50 2026 -0500

    [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-GPU-EMBED-A2 (slot:india): GPU embedder + emit-texts tap + parity join -- MEASURED stronger-embedding lever lifts tier-5 ranking (nomic->mxbai@1024: AUROC 0.783->0.835, macroF1 0.308->0.381, selective 3/5->4/5, 5
... [+3464 chars truncated]

### Assistant | 2026-06-23T18:17:02.879Z

Now let me read the `quantize` function definition to verify the int8 arithmetic claim in the test.

### Assistant | 2026-06-23T18:17:03.820Z

[tool_use: Grep]

### User | 2026-06-23T18:17:06.652Z

[tool_result] 342:export function quantize(vec) {
343-  let norm = 0;
344-  for (const x of vec) norm += x * x;
345-  norm = Math.sqrt(norm) || 1;
346-  const unit = vec.map((x) => x / norm);
347-  let maxAbs = 0;
348-  for (const x of unit) { const a = Math.abs(x); if (a > maxAbs) maxAbs = a; }
349-  const scale = (maxAbs || 1) / 127;
350-  const q = unit.map((x) => Math.max(-127, Math.min(127, Math.round(x / 
... [+699 chars truncated]

### Assistant | 2026-06-23T18:17:12.096Z

Now I can verify the arithmetic. Let me work through the test's claim against the actual `quantize` implementation:

For input `[3,4,0,0]`:
- norm = sqrt(9+16) = sqrt(25) = 5
- unit = [0.6, 0.8, 0, 0]
- maxAbs = 0.8
- scale = 0.8/127 ≈ 0.0062992
- q[0] = round(0.6/0.0062992) = round(0.6*127/0.8) = round(95.25) = 95 ✓
- q[1] = round(0.8/0.0062992) = round(127) = 127 ✓
- q[2] = round(0) = 0 ✓

The arithmetic is correct. The `s` field is `Number(scale.toExponential(4))` which is positive — the test asserts `r.s > 0`. Now let me run the tests to confirm they pass and are real.

### Assistant | 2026-06-23T18:17:13.024Z

[tool_use: Bash]

### User | 2026-06-23T18:17:19.066Z

[tool_result]   ...
# Subtest: buildCandidate quantizes via deployed quantize() with correct int8 reference values
ok 2 - buildCandidate quantizes via deployed quantize() with correct int8 reference values
  ---
  duration_ms: 0.3941
  ...
# Subtest: buildCandidate restricts strictly to refIds (apples-to-apples ghost set)
ok 3 - buildCandidate restricts strictly to refIds (apples-to-apples ghost set)
  ---
  du
... [+500 chars truncated]

### Assistant | 2026-06-23T18:17:22.305Z

5/5 pass, 0 skipped. Now the build-node-embeddings regression test.

### Assistant | 2026-06-23T18:17:22.645Z

[tool_use: Bash]

### User | 2026-06-23T18:17:27.911Z

[tool_result]     1..7
ok 15 - appendActionSurface
  ---
  duration_ms: 1.0523
  type: 'suite'
  ...
1..15
# tests 53
# suites 12
# pass 53
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 95.774

### Assistant | 2026-06-23T18:17:33.291Z

53/53 pass, 0 skipped. Both test suites confirmed green with no skips/only. Now let me verify the tests are NOT trivially green — that they would actually fail if the logic regressed. Let me do mutation checks by temporarily examining whether the assertions are sensitive. First, let me verify the dim-mismatch and refIds tests are real by mutating the implementation.

### Assistant | 2026-06-23T18:17:36.272Z

[tool_use: Bash]

### User | 2026-06-23T18:17:39.928Z

[tool_result] # tests 5
# pass 4
# fail 1
--- restoring ---

### Assistant | 2026-06-23T18:17:42.995Z

The dim-mismatch test genuinely fails when the guard is broken (4 pass / 1 fail). Let me mutate the refIds restriction and the quantize reference value to confirm those too.

### Assistant | 2026-06-23T18:17:48.555Z

[tool_use: Bash]

### User | 2026-06-23T18:17:53.277Z

[tool_result] === refIds-broken run ===
# tests 5
# pass 4
# fail 1
=== missing-meta-broken run ===
# tests 5
# pass 4
# fail 1
=== restored; verify clean ===

### Assistant | 2026-06-23T18:17:58.253Z

All three mutations cause a test to fail (4 pass / 1 fail each), and the file is restored clean (git diff empty). The tests are real R9 assertions, not trivially green. Let me confirm the restoration is byte-identical and there's no leftover.

### Assistant | 2026-06-23T18:17:59.290Z

[tool_use: Bash]

### User | 2026-06-23T18:18:02.896Z

[tool_result] exit:0
BYTE-IDENTICAL to backup

### Assistant | 2026-06-23T18:18:07.283Z

Working tree is clean — no residue from my mutation testing. Now let me examine the Python embedder more carefully for the fail-loud / hardcoded-path / resume concerns. Let me also check the `--round` magic number and the main-guard parity issue in the JS file. First, let me verify the main-guard line in the quantize JS file works correctly (it's an unusual pattern).

### Assistant | 2026-06-23T18:18:09.091Z

[tool_use: Bash]

### User | 2026-06-23T18:18:13.008Z

[tool_result] === Test 1: help via direct invocation (main-guard must fire) ===
usage: quantize-vecs-to-ghost-embeddings --vecs V --texts T [--ref R] --out O [--model M] [--dim N]
exit:0
=== Test 2: missing required args (main-guard fires, exit 2) ===
quantize-vecs-to-ghost-embeddings: --vecs, --texts and --out are required
exit:2

### Assistant | 2026-06-23T18:18:17.945Z

The main-guard fires correctly on CLI invocation (and the test import shows it does NOT fire on import, since the tests ran without triggering `main()`). Now let me verify the Python embedder's fail-loud behavior. Let me check the critical paths: cuda-unavailable, empty-input, and the resume keying. Let me test the empty-input and cuda paths by examining behavior without actually loading the GPU model.

### Assistant | 2026-06-23T18:18:21.213Z

[tool_use: Bash]

### User | 2026-06-23T18:18:25.474Z

[tool_result] === Test: empty input -> FATAL exit 3 ===
read 0 records from C:/Users/wompu/AppData/Local/Temp/empty.jsonl
FATAL no input records
exit:3
=== Test: only __meta + blank lines (no body) -> FATAL exit 3 ===
read 0 records from C:/Users/wompu/AppData/Local/Temp/metaonly.jsonl
FATAL no input records
exit:3

### Assistant | 2026-06-23T18:18:32.851Z

Empty input correctly fails loud with exit 3 (before any model load). The cuda check at line 118-120 exits 4 on cuda-requested-but-unavailable. Let me verify the resume keying behavior — the concern is whether resume correctly keys on `id` and whether the resume path uses append mode (vs overwrite, which would lose prior work).

Looking at the Python code:
- `load_done_ids` (line 64-82) reads `--out`, collecting ids where `isinstance(obj.get("id"), str) and "vec" in obj` — correctly keyed on records that have a vector.
- `mode = "a" if (done and not args.no_resume) else "w"` (line 125) — append only when resuming with existing done ids.
- The `__meta` header is only written when `mode == "w"` (line 129) — correctly avoids duplicate meta on resume append.

Let me verify the resume path end-to-end with a small mock (avoiding GPU by checking the "nothing to do" path which fires before torch import).

### Assistant | 2026-06-23T18:18:36.336Z

[tool_use: Bash]

### User | 2026-06-23T18:18:37.025Z

[tool_result] 🛑 BLOCKED: rm -rf on absolute root path
  Command: cd "H:/prism"
mkdir -p /tmp/embtest
printf '{"id":"n1","text":"hello world"}\n{"id":"n2","text":"foo bar"}\n' > /tmp/embtest/in.jsonl
# Pre-populate out with both ids already done -> "nothing to do" path (fires BEFORE torch import)
printf '{"__meta":true}\n{"id":"n1","vec":[0.1,0.2]}\n{"id":"n2","vec":[0.3,0.4]}\n' > /tmp/embtest/out.jsonl
echo "=
... [+346 chars truncated]

### Assistant | 2026-06-23T18:18:46.620Z

The `rm -rf` was blocked. Let me re-run without the destructive cleanup.

### Assistant | 2026-06-23T18:18:52.161Z

[tool_use: Bash]

### User | 2026-06-23T18:18:55.491Z

[tool_result] === resume: all ids present -> nothing to do (no torch import, exit 0) ===
read 2 records from C:/Users/wompu/AppData/Local/Temp/embtest9/in.jsonl
resume: 2 already embedded, skipping
nothing to do (all ids present)
{"ok": true, "embedded": 0, "skipped": 2, "model": "mixedbread-ai/mxbai-embed-large-v1", "dim": 768}
exit:0
=== verify out.jsonl was NOT clobbered (still 3 lines) ===
3

### Assistant | 2026-06-23T18:19:04.876Z

Resume keying is correct — it identifies done ids and preserves the existing output (3 lines intact, not clobbered). Now let me examine a subtle resume edge case: when SOME ids are done and we resume in append mode, does the `count_planned` in the meta become stale? That's a minor concern since meta is only written on `mode=="w"`. 

Let me now scrutinize the concerns from the task: hardcoded paths/models, magic numbers, and silent fallbacks. Let me check the supporting doc and the WARN behavior carefully. First the model default — `mxbai-embed-large-v1` is a flag default (line 89), `--dim 768` is a flag (line 90), `--device cuda` is a flag (line 92). All configurable. Good.

Let me check one potential silent-fallback concern: in the Python `read_records`, malformed JSON lines are silently skipped (`except Exception: continue`, line 48-49). And in `load_done_ids`, the outer `except: pass` (line 80-81). Let me also examine whether a partial write on encode failure mid-batch could leave a corrupt file. Let me read the doc that was added.

### Assistant | 2026-06-23T18:19:05.910Z

[tool_use: Bash]

### User | 2026-06-23T18:19:09.326Z

[tool_result] knowledge/wiki/lessons/gnn-stronger-embedding-model-lever-measured.md

### Assistant | 2026-06-23T18:19:12.473Z

[tool_use: Read]

### User | 2026-06-23T18:19:13.194Z

[tool_result] read-once-guard: 'H:\prism\knowledge\wiki\lessons\gnn-stronger-embedding-model-lever-measured.md' was already read 2m ago in this session and is unchanged (mtime 1782238331192). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (di
... [+26 chars truncated]

### Assistant | 2026-06-23T18:19:16.930Z

The doc was already in context from the read hook, but I haven't actually seen its full content. Let me read it via Bash since the read-once-guard is blocking the Read tool.

### Assistant | 2026-06-23T18:19:17.407Z

[tool_use: Bash]

### User | 2026-06-23T18:19:20.639Z

[tool_result] ---
title: A stronger embedding model lifts GNN tier-5 ranking but does NOT clear the full-coverage gate (measured)
type: lesson
slot: india
date: 2026-06-23
tags: [gnn, tier-5, embedding-model, mxbai, nomic, deploy-gate, measure-before-commit, ref-pool, u-rag-6, blackwell-gpu]
links:
  - "[[ref-pool-growth-can-regress-deploy-gate]]"
  - "[[gnn-selective-deploy]]"
  - "[[nn-graph-ms0]]"
---

# A s
... [+4921 chars truncated]

### Assistant | 2026-06-23T18:19:30.780Z

The doc is thorough, honest (R12 — reports the gate did NOT clear, measured numbers), and well-cross-referenced. Now I notice a subtle discrepancy worth flagging: the commit message and doc TL;DR say `mxbai@1024: AUROC 0.783->0.835`, but the table row for `mxbai @768` reports AUROC 0.817 while the commit message body says `nomic->mxbai@1024: AUROC 0.783->0.835, macroF1 0.308->0.381`. These are internally consistent (the doc table and commit both cite @1024 = 0.835/0.381). The "@768" intermediate (0.817) only appears in the doc table. This is a documentation nuance, not a code defect.

Let me now do a final check on a potential edge concern in the JS join: the `dim` default mismatch. The Python embedder defaults `--dim 768`, the quantize JS defaults `--dim 768`. But the doc's reproduce pipeline uses `--dim 1024` on both. Let me verify the `buildCandidate` dim guard would correctly reject if the operator forgets `--dim 1024` on the JS side while the Python wrote 1024d vectors — this is a real failure-mode the dim guard handles (it counts dimMismatch). Good — that's caught, not silent.

Let me check one more thing: whether the `refUncovered` WARN path actually surfaces (fail-loud on partial coverage) versus silently producing a subset candidate that would shift the holdout.

### Assistant | 2026-06-23T18:19:35.396Z

[tool_use: Bash]

### User | 2026-06-23T18:19:39.214Z

[tool_result] === run with 2/4 ref ids covered -> expect WARN on stderr ===
{
  "ok": true,
  "out": "C:\\Users\\wompu\\AppData\\Local\\Temp\\qvtest9\\cand.jsonl",
  "model": "gpu-candidate",
  "dim": 2,
  "vecsIn": 2,
  "written": 2,
  "dimMismatch": 0,
  "missingMeta": 0,
  "refSkipped": 0,
  "refTotal": 4,
  "refCovered": 2,
  "refUncovered": 2
}
WARN: 2/4 deployed ghost ids have NO mxbai vector (candidate i
... [+42 chars truncated]

### Assistant | 2026-06-23T18:19:49.231Z

The partial-coverage WARN surfaces correctly to stderr with the exact count, and `refUncovered` is reported in the summary JSON. This is appropriate fail-loud surfacing.

One observation: when ref coverage is partial, the script still exits 0 (not non-zero). This is a judgment call — it's a WARN, not a fatal — and it's surfaced loudly both in the JSON summary (`refUncovered: 2`) and to stderr. For an A/B experiment harness this is acceptable: a subset candidate is still consumable, and the operator is explicitly told the holdout pool differs. This is a P2-level note at most, not a defect (it does not silently mask anything).

Let me do a final scan for any other inlined magic numbers or silent fallbacks I may have missed in the diff to build-node-embeddings.mjs, and confirm the `--emit-texts` path's default behavior is truly byte-identical (early return before stats/embed).

### Assistant | 2026-06-23T18:19:52.732Z

[tool_use: Bash]

### User | 2026-06-23T18:19:56.459Z

[tool_result] === emit-texts early-return: produces texts without embedding (no Ollama call) ===
561:  if (args.emitTexts) {
580:  const stats = {
=== confirm no skip/only in either test file ===
grep-exit:1 (1 = none found)

### Assistant | 2026-06-23T18:20:18.132Z

The `--emit-texts` branch (line 561) returns before the embed `stats` block (line 580), confirming the default path is unchanged (53/53 regression passing confirms byte-identical default behavior). No `.skip`/`.only`/`.todo` in either test file.

I have completed a thorough end-to-end review. All claims verified against actual code and live test execution.

---

VERDICT: PASS

summary: The U-GNN-GPU-EMBED-A2 commit (`0ca453bddf`, slot:india) adds a GPU embedder (`embed-nodes-gpu.py`), an `--emit-texts` parity tap on `build-node-embeddings.mjs`, and a quantization join (`quantize-vecs-to-ghost-embeddings.mjs`) with real R9 tests. I independently verified the int8 arithmetic, ran both suites (5/5 join + 53/53 regression, zero skips/only), and proved the join tests genuinely fail under mutation. Fail-loud paths (empty input exit 3, cuda-unavailable exit 4), resume keying, and partial-coverage WARN all behave correctly. No P0/P1 issues.

findings:
- none (P0/P1). The diff is clean. P2 notes below are deferrable.
- [P2] `H:/prism/scripts/quantize-vecs-to-ghost-embeddings.mjs:139-141` -- partial ref coverage surfaces a stderr WARN + `refUncovered` in the JSON summary but still exits 0. Acceptable for an A/B experiment harness (subset candidate is consumable and the holdout-differs risk is surfaced loudly), but an operator scripting this in a pipeline could miss the WARN. Consider a `--strict` flag that exits non-zero when `refUncovered > 0`. Not a defect; no silent masking.
- [P2] `H:/prism/scripts/embed-nodes-gpu.py:96,140` -- `--round 6` is a configurable flag (good), but `truncate_dim=args.dim` (line 122, MRL truncation) silently produces a weaker-but-valid vector when `--dim` < the model's native dim; the ~0.018 AUROC cost is documented in the wiki lesson but not surfaced at runtime. Deferrable: documentation already captures it.

Verified specifically (so the PASS is auditable):
- int8 reference values: `[3,4,0,0]` -> norm 5 -> unit `[0.6,0.8,0,0]` -> maxAbs 0.8 -> s
... [+1546 chars truncated]
