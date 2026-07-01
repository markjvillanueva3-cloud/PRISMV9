---
type: "chat-session"
source: "claude-code-cli"
session_id: "6a8a0fc5-4275-43b0-b847-449c590c706b"
title: "Review a single-file change (analyst arm, weighted to silent breakage / regressi"
date: "2026-06-23"
first_ts: "2026-06-23T07:54:03.264Z"
last_ts: "2026-06-23T07:55:44.442Z"
cwd: "H:\\prism"
messages: 30
user_msgs: 12
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-ac5b95186ed5854c8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Review a single-file change (analyst arm, weighted to silent breakage / regressi

> **claude-code-cli** | 2026-06-23 | 30 msgs (12 user / 18 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-ac5b95186ed5854c8.jsonl`

## Transcript

### User | 2026-06-23T07:54:03.264Z

Review a single-file change (analyst arm, weighted to silent breakage / regression / schema coupling) for PRISM unit U-XRAY-ENSEMBLE-NONDIM-UNION (consumer half).

FILE CHANGED: H:\prism\scripts\lib\ocr-training-loop-lib.mjs
TEST FILE: H:\prism\scripts\lib\ocr-training-loop-lib.test.mjs

WHAT THE CHANGE DOES:
- `buildTrainsetRow(part, fused, calibration, opts)` now ALSO records non-dimension coverage counts read from the fused object: `gdt_count / note_count / profile_count / surface_finish_count` (each `Array.isArray(fused.X) ? fused.X.length : 0`). These come from the producer change where `fuseEnsemble` now unions gdt/notes/profiles/surface_finishes (previously dropped).
- `aggregateTrainingLoop(perPartResults, calibration)` now rolls those up into a `non_dim_coverage: {gdt, notes, profiles, surface_finishes}` object (defaulting missing per-row counts to 0).

CONTEXT: The trainset row is written to a JSONL corpus by `scripts/blueprint-ocr-training-loop.mjs`; the aggregate is the run report. Both feed the closed-loop OCR training pipeline.

VERIFY (grade PASS/FAIL with P0/P1/P2 + file:line):
1. ADDITIVITY/BACK-COMPAT — are the new keys strictly additive? A legacy fused object (dimensions only, no gdt/notes/...) must yield counts 0 and never throw. Confirm the existing `labels`/`trainable_label_count`/`tier_counts`/`corroboration_possible` logic and the existing aggregate fields are byte-unchanged.
2. CONSUMER SAFETY — does any reader of the trainset JSONL or the aggregate report break from the new keys? (Check scripts/blueprint-ocr-training-loop.mjs and any trainset/LoRA-dataset consumer — extra keys should be ignored, but confirm nothing does strict schema validation or a fixed-key assertion.)
3. CORRECTNESS — counts match the fused arrays; rollup sums correctly; missing per-row counts treated as 0.
4. TEST INTEGRITY — are the 3 new tests real reference-value assertions (not stubs)? Do they fail if the count logic regresses? Any .skip/.only?

Read both changed fi
... [+131 chars truncated]

### Assistant | 2026-06-23T07:54:14.820Z

I'll review this change end-to-end. Let me start by reading both changed files.

### Assistant | 2026-06-23T07:54:15.770Z

[tool_use: Read]

### Assistant | 2026-06-23T07:54:15.874Z

[tool_use: Read]

### User | 2026-06-23T07:54:16.971Z

[tool_result] 1	// scripts/lib/ocr-training-loop-lib.mjs
2	//
3	// U-XRAY-OCR-TRAINING-LOOP — closed-loop OCR training-data engine (pure core).
4	//
5	// WHY (ready-now, no delta): the full print→CAD→gcode→CAD-gen loop is gated on delta's CAD-gen,
6	// but the print-READING stage trains TODAY. The multi-VLM ensemble (vision-ensemble-fuse.mjs) is a
7	// TEACHER: run it over real prints and the dims models corrob
... [+21743 chars truncated]

### User | 2026-06-23T07:54:17.802Z

[tool_result] 1	// scripts/lib/ocr-training-loop-lib.test.mjs
2	// Tests for U-XRAY-OCR-TRAINING-LOOP pure core. Reference values + algebraic invariants — no
3	// toBeDefined() stubs. The calibration decides which pseudo-labels are TRUSTED enough to train a
4	// model on, so each test encodes WHY a trust verdict matters (a wrong calibration = silently
5	// training on garbage labels — the exact "garbage in, gar
... [+24782 chars truncated]

### Assistant | 2026-06-23T07:54:22.807Z

Now let me trace the consumers. The key blast-radius question: does anything read the trainset JSONL or the aggregate report with strict schema validation or fixed-key assertions? Let me check the producer/runner and any LoRA-dataset consumers.

### Assistant | 2026-06-23T07:54:23.748Z

[tool_use: Read]

### Assistant | 2026-06-23T07:54:24.463Z

[tool_use: Grep]

### User | 2026-06-23T07:54:25.352Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/blueprint-ocr-training-loop.mjs
3	//
4	// U-XRAY-OCR-TRAINING-LOOP — the closed-loop OCR training-data engine (runner).
5	//
6	// Trains the print-READING stage TODAY, without delta's CAD-gen. Three phases:
7	//   1. CALIBRATE — generate perfect-GT synthetic prints (mixed difficulty) → multi-VLM ensemble →
8	//      measure P(consensus dim CORRECT | corroboration
... [+35243 chars truncated]

### User | 2026-06-23T07:54:28.217Z

[tool_result] Found 65 files
scripts\lib\ocr-training-loop-lib.test.mjs
scripts\lib\ocr-training-loop-lib.mjs
state\shared\handoffs\consolidated\xray.md
state\HANDOFF.md
knowledge\memories\reference\reference_xray_perprint_unit_propagation_2026_06_22.md
knowledge\memories\reference\reference_xray_p15_region_routing_arc_complete_2026_06_22.md
knowledge\memories\reference\reference_delta_course_system_and_channel
... [+3505 chars truncated]

### Assistant | 2026-06-23T07:54:39.168Z

Key observation: the runner (line 396) writes the trainset JSONL row by hand-picking fields (`{key, page, part, image, n_models, labels, source}`) — it does NOT serialize the full `buildTrainsetRow` output. So the new `gdt_count`/`note_count`/`profile_count`/`surface_finish_count` keys never reach `trainset.jsonl`. They live ONLY in the in-memory row used for `classifyActiveLearning`. The aggregate `non_dim_coverage` is also NOT used by the runner — the runner builds its own report inline and never calls `aggregateTrainingLoop`. Let me confirm who actually consumes `aggregateTrainingLoop` and the trainset JSONL.

### Assistant | 2026-06-23T07:54:40.422Z

[tool_use: Grep]

### Assistant | 2026-06-23T07:54:40.753Z

[tool_use: Grep]

### User | 2026-06-23T07:54:42.181Z

[tool_result] scripts\lib\ocr-training-loop-lib.test.mjs:20:  aggregateTrainingLoop,
scripts\lib\ocr-training-loop-lib.test.mjs:198:// ── aggregateTrainingLoop ─────────────────────────────────────────────────────
scripts\lib\ocr-training-loop-lib.test.mjs:200:test("aggregateTrainingLoop: rolls up tier totals, trainable yield, AL queue", () => {
scripts\lib\ocr-training-loop-lib.test.mjs:205:  const agg = aggre
... [+502 chars truncated]

### User | 2026-06-23T07:54:42.457Z

[tool_result] Found 13 files
scripts\lib\ocr-training-loop-lib.test.mjs
scripts\lib\ocr-training-loop-lib.mjs
scripts\blueprint-ocr-training-loop.mjs
scripts\build-ocr-gold-verify-package.mjs
scripts\ocr-al-queue-surface.mjs
scripts\xray-trainset-to-lora.mjs
scripts\xray-trainset-to-lora.test.mjs
scripts\lib\trainset-to-lora-pairs.test.mjs
scripts\lib\trainset-to-lora-pairs.mjs
scripts\lib\dimension-corroborate
... [+139 chars truncated]

### Assistant | 2026-06-23T07:54:47.882Z

`aggregateTrainingLoop` is consumed only by its own test — confirming it's a library function not yet wired into the runner (the runner builds its report inline). Now I need to verify the trainset JSONL consumers don't break. The critical one is `xray-trainset-to-lora.mjs` (it reads `trainset.jsonl`). Let me check the LoRA-dataset consumer and the curate consumer for strict schema validation / fixed-key assertions.

### Assistant | 2026-06-23T07:54:48.826Z

[tool_use: Read]

### Assistant | 2026-06-23T07:54:48.926Z

[tool_use: Read]

### User | 2026-06-23T07:54:49.906Z

[tool_result] 1	// scripts/lib/trainset-to-lora-pairs.mjs
2	//
3	// U-XRAY-BLUEPRINT-LORA-STAGE — pure adapter: closed-loop OCR trainset rows → the
4	// BlueprintLoRABridgeEngine's LoRATrainingPair[] contract (the xray→india LoRA seam).
5	//
6	// This is the ONLY genuinely-new code in the staging unit: the bridge CONSUMES LoRATrainingPair[]
7	// (anonymize → per-provider serialize → staging-gated export) but do
... [+3938 chars truncated]

### User | 2026-06-23T07:54:50.082Z

[tool_result] 1	// scripts/lib/blueprint-trainset-curate-lib.mjs
2	//
3	// U-PSGB-XRAY-TRAINSET-CURATE — pure curation core for the OCR/print→CAD training set.
4	//
5	// THE PROBLEM (grounded in the real corpus, blueprint-training-pairs.jsonl, 76,205 parts):
6	// `train_eligible` (has_print && (has_program||has_cad)) OVERCOUNTS the trustworthy labels.
7	// The corpus' own `match_confidence` shows 5,029 "garbage
... [+7229 chars truncated]

### Assistant | 2026-06-23T07:55:00.591Z

Both consumers confirmed safe:

- `trainsetRowToPairs` (trainset-to-lora-pairs.mjs:35-61) reads only `row.labels`, `row.part`, `row.image`, `row.source` — iterates `labels` and ignores all other top-level keys. New count keys are invisible to it. No fixed-key assertion, no strict schema.
- `blueprint-trainset-curate-lib.mjs` operates on `blueprint-training-pairs.jsonl` (the 76K-part corpus join), a completely different file — not the ensemble `trainset.jsonl`. Not a consumer of this row shape at all.

Now let me verify the producer side claim that `fuseEnsemble` actually unions `gdt/notes/profiles/surface_finishes` onto the fused object (so the new counts read real data, not always-zero), and check the AL-queue surface + gold-verify package consumers for fixed-key handling of the report.

### Assistant | 2026-06-23T07:55:02.041Z

[tool_use: Grep]

### User | 2026-06-23T07:55:03.527Z

[tool_result] scripts\lib\vision-ensemble-fuse.mjs:182:// NON-DIMENSION FIELD UNION (recall-first) -- gdt / notes / profiles / surface_finishes.
scripts\lib\vision-ensemble-fuse.mjs:188:// pass-through already ASSUMED the fused carried gdt/notes/...). This unions each field
scripts\lib\vision-ensemble-fuse.mjs:207:function gdtKey(g) {
scripts\lib\vision-ensemble-fuse.mjs:229: * @param {string} field  "gdt" | "n
... [+1677 chars truncated]

### Assistant | 2026-06-23T07:55:03.788Z

[tool_use: Grep]

### User | 2026-06-23T07:55:05.333Z

[tool_result] scripts\xray-trainset-to-lora.mjs:39:    trainset: get("--trainset", join(REPO_ROOT, "state", "shared", "ocr-training-loop", "trainset.jsonl")),
scripts\xray-trainset-to-lora.mjs:72:    try { row = JSON.parse(t); } catch { continue; } // skip malformed line; fail-loud below if zero rows
scripts\ocr-al-queue-surface.mjs:148:    try { out.push(JSON.parse(t)); } catch { /* torn/partial line -- skip, 
... [+439 chars truncated]

### Assistant | 2026-06-23T07:55:15.468Z

Confirmed on both fronts:

1. **Producer is real** — `fuseEnsemble` (vision-ensemble-fuse.mjs:406) returns `{ dimensions, gdt, notes, profiles, surface_finishes, ambiguous_pairs, summary, per_model }`. So `fused.gdt`/`fused.notes`/`fused.profiles`/`fused.surface_finishes` are genuine arrays at runtime — the new counts read real data, not always-zero. The lib's `Array.isArray(fused.X) ? fused.X.length : 0` matches the producer's array contract exactly, and the `n_gdt`/`n_notes`/etc. summary counts (lines 399-402) corroborate the `.length` semantics.

2. **All trainset consumers are tolerant** — `xray-trainset-to-lora.mjs:72` and `ocr-al-queue-surface.mjs:148` and `build-ocr-gold-verify-package.mjs:48` all do `JSON.parse` then read named fields; none does strict schema validation or a fixed-key/`Object.keys` assertion. Extra keys are silently ignored. (And note: the runner at blueprint-ocr-training-loop.mjs:396 hand-picks fields when writing `trainset.jsonl`, so the new count keys don't even reach that file — they live only in the in-memory row consumed by `classifyActiveLearning`. The aggregate `non_dim_coverage` is likewise unused by the runner. Both are additive, dormant-but-correct surfaces; no consumer breaks.)

Let me do the final correctness checks on the two pieces of new logic and verify the existing fields are byte-unchanged. Let me look at the git diff to confirm the change scope is exactly additive.

### Assistant | 2026-06-23T07:55:16.824Z

[tool_use: Bash]

### User | 2026-06-23T07:55:19.928Z

[tool_result]  scripts/lib/ocr-training-loop-lib.mjs      | 14 +++++++++++
 scripts/lib/ocr-training-loop-lib.test.mjs | 37 ++++++++++++++++++++++++++++++
 2 files changed, 51 insertions(+)
----DIFF----
diff --git a/scripts/lib/ocr-training-loop-lib.mjs b/scripts/lib/ocr-training-loop-lib.mjs
index 1e5d8b9069..43e3ff2f38 100644
--- a/scripts/lib/ocr-training-loop-lib.mjs
+++ b/scripts/lib/ocr-training-loop-lib.
... [+2320 chars truncated]

### Assistant | 2026-06-23T07:55:44.442Z

The diff confirms the change is exactly 14 added lines in the lib — strictly additive, no existing line modified.

Verification complete on all four axes:

**1. ADDITIVITY/BACK-COMPAT** — Confirmed. The diff shows only additions; `labels`/`trainable_label_count`/`tier_counts`/`corroboration_possible`/`source` and the existing aggregate fields (`parts`/`total_labels`/`trainable_labels`/`trainable_yield`/`tier_totals`/`active_learning_queue`/`calibration`) are byte-unchanged. A legacy fused object (dimensions only) yields 0 for every new count via the `Array.isArray(fused.X) ? ... : 0` guard, and the `fused &&` short-circuit means a null/undefined `fused` never throws (lib.mjs:157-160). The aggregate's `row.X_count || 0` (lib.mjs:201-204) defaults a missing per-row count to 0.

**2. CONSUMER SAFETY** — Confirmed. No consumer breaks:
- `trainset.jsonl` readers (`xray-trainset-to-lora.mjs:72`, `ocr-al-queue-surface.mjs:148`, `build-ocr-gold-verify-package.mjs:48`) all do tolerant `JSON.parse` + named-field reads — zero strict schema/fixed-key assertions. `trainsetRowToPairs` only touches `labels`/`part`/`image`/`source`.
- The runner writes `trainset.jsonl` with a hand-picked field set (blueprint-ocr-training-loop.mjs:396), so the new count keys don't even land in the file — they exist only on the in-memory row.
- `aggregateTrainingLoop` has no production caller (only its test); `non_dim_coverage` is a dormant additive report field.

**3. CORRECTNESS** — Confirmed. Counts equal the fused array lengths (matches producer `n_gdt`/`n_notes`/etc. at vision-ensemble-fuse.mjs:399-402). Rollup sums each row's count; missing per-row counts coerced to 0 via `|| 0`. Test at .test.mjs:222 proves an exact rollup `{gdt:3, notes:5, profiles:0, surface_finishes:3}` including a row that omits `profile_count`/`surface_finish_count`.

**4. TEST INTEGRITY** — Confirmed. Three new tests, all real reference-value assertions, no `.skip`/`.only`:
- .test.mjs:157-173 asserts exact counts 2/1/1/
... [+2038 chars truncated]
