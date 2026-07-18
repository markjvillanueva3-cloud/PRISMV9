---
type: "chat-session"
source: "claude-code-cli"
session_id: "571d4bdd-5118-4307-b29c-fa75fed32e14"
title: "Independent second-pass review of `H:\\prism\\scripts\\lib\\cnc-ground-truth-lib.mjs"
date: "2026-05-19"
first_ts: "2026-05-19T00:31:58.936Z"
last_ts: "2026-05-19T00:35:00.978Z"
cwd: "H:\\prism"
messages: 20
user_msgs: 8
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/571d4bdd-5118-4307-b29c-fa75fed32e14/subagents/agent-a8bfa06a50d08bd01.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Independent second-pass review of `H:\prism\scripts\lib\cnc-ground-truth-lib.mjs

> **claude-code-cli** | 2026-05-19 | 20 msgs (8 user / 12 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/571d4bdd-5118-4307-b29c-fa75fed32e14/subagents/agent-a8bfa06a50d08bd01.jsonl`

## Transcript

### User | 2026-05-19T00:31:58.936Z

Independent second-pass review of `H:\prism\scripts\lib\cnc-ground-truth-lib.mjs` (read the WHOLE file). Do NOT assume a prior reviewer caught anything. This is a PURE ground-truth-derivation library (unit U-TDP06, BLUEPRINT-OCR-TRAINING-MS2) that turns CNC G-code into benchmark ground-truth records.

Weight your review toward what a code-correctness pass typically misses:
- **Honest-data integrity (Karpathy R12):** the highest risk is emitting a `nominal_mm` that is NOT a real cut dimension (e.g. a G0 safe-retract/tool-change park X, an approach plane, a tool-clearance Z). A wrong nominal silently poisons a downstream benchmark graded at p95 ≤ 0.05mm — worse than emitting nothing. Trace EVERY code path that pushes to `nominals`/`feedXValues` and prove each value is a real cutting move. Look for the inverse too: real cut dimensions silently dropped.
- **Integration coupling:** record shape + `groupRecordsByPartClass` output must be byte-compatible with the sibling `H:\prism\scripts\lib\cad-ground-truth-lib.mjs` (read it) and consumable by `H:\prism\scripts\lib\ocr-benchmark-lib.mjs` (read it). Any field-name or shape drift is a P0.
- **Naming/convention conformance** with the cad sibling (export names, opts shape, Object.freeze, fallback semantics).
- **Adversarial input:** binary garbage, 50MB file, lines >512 chars, non-ASCII comments, nested/unterminated parens, `G1` with no coordinates, NaN words, subprogram calls (M98/M99), absolute-vs-incremental ambiguity, negative Z.
- **Manufacturing-domain truthfulness:** is each G-code→PRISM-feature-kind claim defensible to a machinist? Over-triggering (every lathe program → stepped_revolved_axis) vs under-triggering.

Report PASS/FAIL with a prioritized P0/P1 list and the exact line numbers.

### Assistant | 2026-05-19T00:32:08.875Z

I'll review the file thoroughly along with its integration siblings.

### Assistant | 2026-05-19T00:32:09.464Z

[tool_use: Read]

### Assistant | 2026-05-19T00:32:09.651Z

[tool_use: Read]

### Assistant | 2026-05-19T00:32:09.976Z

[tool_use: Read]

### User | 2026-05-19T00:32:12.788Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\cnc-ground-truth-lib.mjs' was already read 11s ago in this session and is unchanged (mtime 1779150661245). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-19T00:32:12.874Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\cad-ground-truth-lib.mjs' was already read 8m ago in this session and is unchanged (mtime 1779124930840). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-19T00:32:13.506Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\ocr-benchmark-lib.mjs' was already read 11s ago in this session and is unchanged (mtime 1779124814219). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-19T00:32:16.707Z

The files are already in my context from earlier reads in this session. Let me work from that. Let me re-read the key file directly to ensure I have the current content for line-accurate review.

### Assistant | 2026-05-19T00:32:18.328Z

[tool_use: Bash]

### User | 2026-05-19T00:32:24.445Z

[tool_result] 270 cnc-ground-truth-lib.mjs
143 cad-ground-truth-lib.mjs
337 ocr-benchmark-lib.mjs
Σ 750
---PRISM_READ_CACHE bypass---

### Assistant | 2026-05-19T00:32:27.158Z

Let me read the actual content with cache disabled so I have accurate line numbers for all three.

### Assistant | 2026-05-19T00:32:28.044Z

[tool_use: Bash]

### User | 2026-05-19T00:32:33.215Z

[tool_result]   1 │ // scripts/lib/cnc-ground-truth-lib.mjs
  2 │ //
  3 │ // U-TDP06 - CNC-derived Ground Truth (pure core).
  4 │ //
  5 │ // Converts a CNC program's G/M-code content into BlueprintExtraction-shape GT
  6 │ // records for the U-TDP04 benchmark. Unlike the CAD half (STEP geometry =
  7 │ // presence only), a CNC program encodes the dimensions the programmer
  8 │ // actually cut: drill Z-depth
... [+12688 chars truncated]

### Assistant | 2026-05-19T00:32:36.059Z

Now the cad sibling and the ocr-benchmark consumer for integration verification.

### Assistant | 2026-05-19T00:32:36.817Z

[tool_use: Bash]

### User | 2026-05-19T00:32:52.580Z

[tool_result]   1 │ // scripts/lib/cad-ground-truth-lib.mjs
  2 │ //
  3 │ // U-TDP05 - CAD-derived Ground Truth (pure core).
  4 │ //
  5 │ // Converts STEP-geometry parse results into BlueprintExtraction-shape GT
  6 │ // records for the U-TDP04 benchmark. CAD files give presence (not nominals)
  7 │ // so emitted GT entries use presence_only: true.
  8 │ //
  9 │ // User insight: "you can also compare to cad
... [+5397 chars truncated]

### Assistant | 2026-05-19T00:32:56.622Z

[tool_use: Bash]

### User | 2026-05-19T00:32:59.497Z

[tool_result]   1 │ // scripts/lib/ocr-benchmark-lib.mjs
  2 │ //
  3 │ // U-TDP04 — OCR Extraction Benchmark (pure core).
  4 │ //
  5 │ // Grades the OCR/print-reading pipeline against hand-labeled ground truth.
  6 │ // This is the "prove we can extract correct data from prints before anything
  7 │ // else" unit — the gate that decides whether to progress from print-reading
  8 │ // training to CAD/CAM trai
... [+15161 chars truncated]

### Assistant | 2026-05-19T00:35:00.978Z

I now have all three files with accurate line numbers. Let me trace the critical data-integrity paths carefully.

## Analysis

### Honest-data integrity trace (every push to `nominals` / `feedXValues`)

**Path 1 — L107-112 (G83 peck drill):** `op.words.Z` from a G83 line. G83 is a canned drilling cycle; Z IS the final hole depth. ✅ Defensible. *But:* G83 Z in **absolute mode (G90)** is an absolute coordinate, not a depth. If the part Z-zero is the top of the stock, `Z-25.0` → depth 25mm (abs of negative). But if Z-zero is set elsewhere (common: chuck face on a lathe, or G54 offset), the absolute Z is NOT the hole depth. The code does `Math.abs(Z)` unconditionally — **no G90/G91 modal tracking**. This is a real R12 risk (see P1 below).

**Path 2 — L113-117 (G81/G82 drill):** same as Path 1. Same absolute-Z risk.

**Path 3 — L121-124 (G85/86/76/89 boring):** pushes `op.words.X` as "lathe diameter". **G76 is a threading cycle on a lathe (Fanuc), but G76 is ALSO a fine-boring cycle on a mill.** On a mill, X in a G76 line is a *position*, not a diameter. Worse: at L121 G76 is grouped with boring cycles emitting an X nominal, while at L104/L128 G76 is NOT in the lathe-cycle list but G70/71/72 are. The X-as-diameter claim is only defensible on a lathe. On a mill G76 (fine bore) the X word is the hole *location* in the work envelope — emitting it as `central_oil_hole nominal_mm` is a fabricated dimension. **P1.**

**Path 4 — L169-183 (lathe X-span):** Guarded by `isLathe && hasFeedCut`, and `feedXValues` is populated **only** at L148 inside `if (hasG(op, 1))` — G1 feed moves only, never G0. The span is `max - min` of G1 X values. This is the most carefully reasoned path and the comment (L165-168) explicitly defends it. ✅ The G0-park exclusion is correctly implemented.

**However** — the *inverse* (real cut dims silently dropped) and a subtle poisoning remain:

- **L148 `feedXValues.push(Math.abs(Number(op.words.X)))` — modal-coordinate bug.** A G1 X move in **G91 incrementa
... [+16243 chars truncated]
