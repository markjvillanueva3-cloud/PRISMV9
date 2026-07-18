---
type: "chat-session"
source: "claude-code-cli"
session_id: "58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d"
title: "Independent correctness/convention review (arm B) of Unit B \"U-XRAY-PROGRAM-GT-C"
date: "2026-06-23"
first_ts: "2026-06-23T13:48:03.891Z"
last_ts: "2026-06-23T13:51:33.294Z"
cwd: "H:\\prism"
messages: 54
user_msgs: 19
assistant_msgs: 35
raw_file: "H:/.claude/projects/H--prism/58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d/subagents/agent-ad3bb6204054fb1ca.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Independent correctness/convention review (arm B) of Unit B "U-XRAY-PROGRAM-GT-C

> **claude-code-cli** | 2026-06-23 | 54 msgs (19 user / 35 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d/subagents/agent-ad3bb6204054fb1ca.jsonl`

## Transcript

### User | 2026-06-23T13:48:03.891Z

Independent correctness/convention review (arm B) of Unit B "U-XRAY-PROGRAM-GT-CALIB" in H:/prism. Grade PASS or FAIL with P0/P1/P2 + file:line. Read end-to-end; do not assume the analyst caught everything. See `git -C H:/prism diff` and `git -C H:/prism status`.

CONTEXT: new pure export `programGtAgreementSamples` in scripts/lib/cnc-program-gt-lib.mjs (the program-GT analog of perDimCorrectness) + opt-in `--emit-calibration` wiring in scripts/validate-perfect-parts.mjs that harvests real {f,correct} samples (source:"program-gt") from gtReliable-gated scored parts into the durable calibration-sample-store (built in the prior commit 5ab3c49002). New test scripts/lib/cnc-program-gt-calibration.test.mjs (8 pass). Existing cnc-program-gt-lib.test.mjs still 29/29.

Weight toward what an analyst is less likely to catch:
- **Semantic soundness of the calibration signal:** the helper emits correct=false for a confidently-agreed dim (f=1) that does NOT match any machined diameter. Is that the RIGHT signal for calibrating P(correct | agreement)? Consider: a real print dim that the program GT does not carry (the GT is callout-class diameters only — feed-move feature dia + length for lathe; hole/bore dia for mill). A legitimately-read linear dimension or a chamfer that isn't a machined diameter would be labeled correct=false even though the OCR read it correctly. Is this a FALSE-NEGATIVE contamination of the calibration corpus? Assess severity and whether it should be scoped (e.g. only emit for dims whose TYPE is diameter, or document the limitation). This is the most important question — think about it carefully against scorePartAgainstProgram's precision definition (it has the same property: precision counts an OCR dim as a miss if it doesn't match a callout dia).
- **Provenance value:** samples tagged source:"program-gt" mix with source:"synthetic-gt" in the same store; calibrateAgreement weights all equally. Is mixing real + synthetic sound, or should they be weighted/sepa
... [+782 chars truncated]

### Assistant | 2026-06-23T13:48:07.569Z

I'll review this change end-to-end. Let me start by examining the diff and the relevant files.

### Assistant | 2026-06-23T13:48:08.388Z

[tool_use: Bash]

### User | 2026-06-23T13:48:11.058Z

[tool_result] <persisted-output>
Output too large (2.8MB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d\tool-results\bitswhcs6.txt

Preview (first 2KB):
warning: in the working copy of 'knowledge/wiki/architecture/skills/project/checkin.md', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of 'knowledge/wiki/architecture
... [+1755 chars truncated]

### Assistant | 2026-06-23T13:48:16.393Z

The full diff is huge (lots of unrelated changes). Let me scope to just the files in this unit.

### Assistant | 2026-06-23T13:48:17.285Z

[tool_use: Bash]

### User | 2026-06-23T13:48:18.783Z

[tool_result] diff --git a/scripts/lib/cnc-program-gt-lib.mjs b/scripts/lib/cnc-program-gt-lib.mjs
index 6fb039f653..2242dd931e 100644
--- a/scripts/lib/cnc-program-gt-lib.mjs
+++ b/scripts/lib/cnc-program-gt-lib.mjs
@@ -331,6 +331,44 @@ export function scorePartAgainstProgram(ocrDimsMm, programGT, opts = {}) {
   };
 }
 
+/**
+ * Pure: the program-GT analog of the synthetic `perDimCorrectness` -- turn a part's
... [+10569 chars truncated]

### Assistant | 2026-06-23T13:48:29.826Z

Now let me read the full `cnc-program-gt-lib.mjs` end-to-end to understand `scorePartAgainstProgram`, `dimMatchesProgram`, and the precision definition.

### Assistant | 2026-06-23T13:48:30.208Z

[tool_use: Read]

### User | 2026-06-23T13:48:30.926Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\cnc-program-gt-lib.mjs' was already read 25s ago in this session and is unchanged (mtime 1782222224315). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-23T13:48:35.036Z

The read-once guard says I've already read it. Let me view it via Bash since the diff only showed me the new function, not the rest of the file.

### Assistant | 2026-06-23T13:48:35.792Z

[tool_use: Bash]

### User | 2026-06-23T13:48:37.558Z

[tool_result]      1	// scripts/lib/cnc-program-gt-lib.mjs
     2	//
     3	// U-XRAY-PERFECT-PARTS-TRUETEST — extract objective ground-truth dimensions from a CNC program, to
     4	// validate what the OCR pipeline reads off the matching blueprint. The program is the STRONGEST GT
     5	// available: it encodes the ACTUAL machined coordinates (what the part is literally cut to), in plain
     6	// text, no ST
... [+8312 chars truncated]

### Assistant | 2026-06-23T13:48:40.370Z

Let me continue reading the key sections, particularly `dimMatchesProgram` and `scorePartAgainstProgram` with its precision definition.

### Assistant | 2026-06-23T13:48:41.509Z

[tool_use: Bash]

### User | 2026-06-23T13:48:43.029Z

[tool_result]  * @returns {number[]}
 */
export function clusterDiameters(sortedAsc, relTol = 0.03) {
  const xs = (Array.isArray(sortedAsc) ? sortedAsc : []).filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (!xs.length) return [];
  const reps = [];
  let clusterMax = xs[0];
  let prev = xs[0];
  for (let i = 1; i < xs.length; i++) {
    const v = xs[i];
    // same cluster if within relT
... [+8998 chars truncated]

### Assistant | 2026-06-23T13:48:47.185Z

Now I understand `scorePartAgainstProgram` and its precision definition. The `gtDistinct` computation in the new `programGtAgreementSamples` (lines using `calloutIn.map((v) => +Math.abs(v).toFixed(3))`) is identical to the one in `scorePartAgainstProgram`. Let me confirm by viewing the new function's exact lines and the mill GT section to understand `calloutDimsIn` semantics for mill.

### Assistant | 2026-06-23T13:48:48.539Z

[tool_use: Bash]

### User | 2026-06-23T13:48:51.092Z

[tool_result] /**
 * Pure: the program-GT analog of the synthetic `perDimCorrectness` -- turn a part's fused OCR dimensions
 * into {f, correct} calibration samples using the CNC program as the answer key (REAL machined GT, not
 * synthetic). For each fused dim: f = agreement fraction (corroboration / n_models); correct = the dim
 * matches a callout-class machined diameter within relTol (the SAME dimMatchesPro
... [+2463 chars truncated]

### Assistant | 2026-06-23T13:48:55.289Z

Now let me look at the calibration-sample-store and its `calibrateAgreement` / `perDimCorrectness` to understand the existing synthetic signal that this is analogous to, and how mixing source matters.

### Assistant | 2026-06-23T13:48:55.909Z

[tool_use: Bash]

### User | 2026-06-23T13:48:58.340Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * calibration-sample-store.mjs -- durable cross-run accumulation of agreement
     4	 * calibration samples for the blueprint-OCR closed loop (and any other
     5	 * isotonic-agreement calibrator that is starved for samples per single run).
     6	 *
     7	 * Why this exists: `blueprint-ocr-training-loop.mjs` PHASE-1 calibrates
     8	 * P(consensus 
... [+9582 chars truncated]

### Assistant | 2026-06-23T13:49:01.196Z

Now let me look at the synthetic `perDimCorrectness` to compare its semantics against the new program-GT analog. Let me find where it's defined.

### Assistant | 2026-06-23T13:49:01.640Z

[tool_use: Grep]

### User | 2026-06-23T13:49:05.753Z

[tool_result] Found 9 files
scripts\lib\cnc-program-gt-calibration.test.mjs
scripts\lib\cnc-program-gt-lib.mjs
scripts\blueprint-ocr-training-loop.mjs
scripts\lib\calibration-sample-store.test.mjs
scripts\lib\calibration-sample-store.mjs
scripts\lib\ocr-training-loop-lib.test.mjs
scripts\lib\ocr-training-loop-lib.mjs
state\shared\search-plots\_scripts.json
knowledge\wiki\lessons\ocr-closed-loop-training-ensembl
... [+17 chars truncated]

### Assistant | 2026-06-23T13:49:11.500Z

[tool_use: Grep]

### User | 2026-06-23T13:49:12.960Z

[tool_result] No matches found

### Assistant | 2026-06-23T13:49:16.813Z

[tool_use: Grep]

### User | 2026-06-23T13:49:18.253Z

[tool_result] 211-/**
212- * Per consensus dim: {f: agreement fraction, correct} where f = corroboration / nModels and
213- * correct = it matches ANY ground-truth dim (value within tolerance AND type-compatible). f is the
214- * ensemble-size-invariant calibration sample; the caller MUST only pass dims from n_models≥2 prints.
215- */
216:function perDimCorrectness(consensusDims, truthDims, nModels) {
217-  con
... [+7658 chars truncated]

### Assistant | 2026-06-23T13:49:24.748Z

This is the crux. The synthetic `perDimCorrectness` (line 216-224) does `correct = truth.some((t) => dimMatches(d.value_mm, t.mm) && typesCompatible(ctype, t.type))`. Critically, the synthetic version checks against the FULL truth dimension set (every dimension on the synthetic print, of all types — diameter, linear, chamfer, etc.) AND requires type-compatibility. The program-GT analog checks against only callout-class **diameters** (lathe feed-move feature diameters + length; mill hole/bore diameters), labeling everything else `correct=false`.

This is the core question the prompt flagged. Let me confirm the truth set in the synthetic case is the full multi-type print and examine `dimType`/`typesCompatible`.

### Assistant | 2026-06-23T13:49:26.248Z

[tool_use: Grep]

### User | 2026-06-23T13:49:28.076Z

[tool_result] 209:function consensusType(t) { return (typeof t === "string" && t && t.toLowerCase() !== "unknown") ? t.toLowerCase() : null; }
210-
211-/**
212- * Per consensus dim: {f: agreement fraction, correct} where f = corroboration / nModels and
213- * correct = it matches ANY ground-truth dim (value within tolerance AND type-compatible). f is the
214- * ensemble-size-invariant calibration sample; the ca
... [+362 chars truncated]

### Assistant | 2026-06-23T13:49:32.702Z

The synthetic truth comes from `g.truth.dimensions` (the FULL generated print — every dim of every type). So in the synthetic case, a correctly-read linear/chamfer dim matches a truth linear/chamfer dim and is labeled `correct=true`. In the program-GT case, the "truth" is ONLY callout-class diameters, so a correctly-read linear dim or chamfer matches nothing and gets `correct=false`.

This confirms the semantic asymmetry. Now let me check the new test file to see what behavior is asserted and whether this false-negative property is acknowledged/tested.

### Assistant | 2026-06-23T13:49:33.514Z

[tool_use: Bash]

### User | 2026-06-23T13:49:35.810Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * cnc-program-gt-calibration.test.mjs -- node:test coverage for
     4	 * programGtAgreementSamples (U-XRAY-PROGRAM-GT-CALIB): the program-GT analog of
     5	 * the synthetic perDimCorrectness that turns fused OCR dims into {f,correct}
     6	 * calibration samples using the CNC program as the answer key.
     7	 *
     8	 * Isolated test file (the fu
... [+4660 chars truncated]

### Assistant | 2026-06-23T13:49:45.999Z

The test at line 31/37 explicitly asserts the `correct=false` for `0.731"` (a confidently-agreed dim that doesn't match a callout diameter), with the comment "the calibration signal we want." This is the crux question. Let me now examine `consensusType`/`dimType` to confirm the synthetic path actually has type-awareness that the program-GT path lacks, and understand the magnitude of the false-negative contamination.

The key insight: in the synthetic case, a correctly-OCR'd linear dimension matches a synthetic-truth linear dimension AND passes the type check → `correct=true`. In the program-GT case, that same correctly-OCR'd linear dim matches NOTHING (program GT carries only diameters) → `correct=false`. So a perfectly-read dim that the OCR got right is labeled "incorrect" purely because the program GT doesn't carry that dimension class. This poisons the P(correct | f) calibration: dims with high agreement f that are correctly-read non-diameters drag down the empirical correctness rate at high f.

Let me verify how `dimMatchesProgram` precision behaves and quantify whether real prints carry many non-diameter dims. Let me check the run output / a real part to understand the realistic ratio of non-diameter OCR dims. Let me look at how the validate runner feeds `allFusedDims` — specifically whether the fused dims include all dim types.

### Assistant | 2026-06-23T13:49:46.762Z

[tool_use: Bash]

### User | 2026-06-23T13:49:48.155Z

[tool_result]             // 3. OCR the print -- ALL pages, UNION the dims. Multi-page bundles (cover/table page +
            //    the drawing on a LATER page) were silently read page-0-only -> the drawing was missed
            //    -> false recall=0 (verified 2026-06-19). Mirrors the grinder's multi-page discipline.
            //    Sequential (not Promise.all) on purpose: Ollama serializes per-model + mu
... [+9699 chars truncated]

### Assistant | 2026-06-23T13:49:55.543Z

Now I have the complete picture. The fused dims pushed into `allFusedDims` are ALL dim types (every `res.fused.dimensions` entry with a positive value_mm) — diameters, linear dims, chamfers, hole positions, etc. The program GT only carries callout-class diameters (+ lathe length). So every correctly-read non-diameter dim becomes a `correct=false` sample.

Let me verify the gating context — that scored parts here are gated. Let me check the `gtReliable` gate the comment claims, and whether the scoring path runs only on reliable parts. Let me look at where `gt` is built and what skips happen before scoring.

### Assistant | 2026-06-23T13:49:56.567Z

[tool_use: Bash]

### User | 2026-06-23T13:49:59.024Z

[tool_result]   console.log(`\n🧪 TRUE-TEST — ${parts.length} perfect parts · ${todo.length} todo · ${parts.length - todo.length} resumed · models ${models.join(",")}`);
  const rasterDir = join(tmpdir(), `truetest-raster-${process.pid}`);
  mkdirSync(rasterDir, { recursive: true });

  const agg = { scored: 0, passed: 0, print_unresolved: 0, prog_unresolved: 0, prog_not_nc: 0, prog_non_lathe: 0, prog_contour_gt
... [+3794 chars truncated]

### Assistant | 2026-06-23T13:50:03.017Z

Confirmed: the calibration emission only fires on `gtReliable`-gated, scored parts (stepped lathe parts or mill parts with hole/bore features). The GT is callout-class diameters only. But the emitted fused dims include ALL OCR dim types.

Now let me run the tests to confirm the claimed pass counts, and run tsc/node check on the lib.

### Assistant | 2026-06-23T13:50:04.433Z

[tool_use: Bash]

### User | 2026-06-23T13:50:06.704Z

[tool_result]   ...
# Subtest: empty/garbage fused input -> []
ok 7 - empty/garbage fused input -> []
  ---
  duration_ms: 0.1351
  ...
# Subtest: samples are store-valid (consumable by calibration-sample-store.isValidSample)
ok 8 - samples are store-valid (consumable by calibration-sample-store.isValidSample)
  ---
  duration_ms: 6.2368
  ...
1..8
# tests 8
# suites 0
# pass 8
# fail 0
# cancelled 0
# skipped 
... [+143 chars truncated]

### Assistant | 2026-06-23T13:50:13.554Z

Both suites pass (8 + 29). Let me verify the validate-perfect-parts.mjs parses cleanly with `node --check` and confirm `get`/`join` helpers exist for the new arg.

### Assistant | 2026-06-23T13:50:15.736Z

[tool_use: Bash]

### User | 2026-06-23T13:50:17.358Z

[tool_result] validate OK
lib OK
===get/num/has defs===
92:  const get = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
93:  const has = (f) => args.includes(f);
94:  const num = (f, d) => { const v = Number(get(f, d)); return Number.isFinite(v) ? v : d; };

### Assistant | 2026-06-23T13:50:21.576Z

All helpers exist (`get`, `has`, `num`), syntax clean. Now let me verify `opts.relTol` exists (the new emission passes `relTol: opts.relTol`) and check ASCII-only conformance on the new code.

### Assistant | 2026-06-23T13:50:24.871Z

[tool_use: Bash]

### User | 2026-06-23T13:50:26.655Z

[tool_result] 101:    relTol: num("--rel-tol", 0.02),
293:                const score = scorePartAgainstProgram(ocrDimsMm, gt, { relTol: opts.relTol });
310:                  const calSamples = programGtAgreementSamples(allFusedDims, gt, { relTol: opts.relTol });
332:    schemaVersion: "1.0.0", generated_from: opts.parts, models, rel_tol: opts.relTol, recall_pass_threshold: RECALL_PASS,
===non-ASCII in new lib 
... [+201 chars truncated]

### Assistant | 2026-06-23T13:50:46.472Z

`opts.relTol` exists (line 101), ASCII-only throughout the new code. The `--rel-tol` default 0.02 matches `programGtAgreementSamples`'s internal default — consistent.

Now let me confirm the precision-definition parallel the prompt highlighted. The prompt notes `scorePartAgainstProgram` precision ALSO counts an OCR dim as a miss if it doesn't match a callout dia — meaning the false-negative property is a pre-existing, accepted characteristic of this whole module's precision metric. Let me verify the existing `note` documents precision honestly and check whether the false-negative is documented for the calibration use.

I have enough to assess. Let me do one final check: verify the validate runner's emission only fires on the plain branch (not tiling/region) — the comment claims so, and confirm `allFusedDims` stays empty under tiling/region (which would silently emit nothing — is that a correctness gap or intended?).

### Assistant | 2026-06-23T13:50:46.980Z

[tool_use: Bash]

### User | 2026-06-23T13:50:48.710Z

[tool_result] 211:              const allFusedDims = [];
277:                        allFusedDims.push({ value_mm: d.value_mm, corroboration: d.corroboration, n_models: Number.isFinite(d.n_models) && d.n_models > 0 ? d.n_models : pnm });
309:                if (opts.emitCalibration && allFusedDims.length) {
310:                  const calSamples = programGtAgreementSamples(allFusedDims, gt, { relTol: opts.relTo
... [+5 chars truncated]

### Assistant | 2026-06-23T13:51:33.294Z

Confirmed: `allFusedDims` is only populated in the plain (`else`) branch at line 277. Under `--tile` or `--region-route`, it stays empty, so emission silently produces zero samples. The parseArgs comment ("Plain full-page branch only (it reliably carries the per-dim agreement metadata)") documents this, and `--emit-calibration` is opt-in/off-by-default, so it's an intentional scoping, not silent breakage. It is fail-soft (no error), which is acceptable for an opt-in harvesting feature, though a one-line operator-visible note when combined with `--tile`/`--region-route` would be nice-to-have (P2 at most, but the comment already covers it for a reader).

I now have a complete, verified picture. Let me finalize my assessment.

## Verdict

VERDICT: PASS

summary: `programGtAgreementSamples` is a correct, pure, well-tested mirror of `scorePartAgainstProgram`'s contract (same `gtDistinct` computation, same `dimMatchesProgram` matcher, same `relTol` default), and the `--emit-calibration` wiring is opt-in, off-by-default, fail-soft, and byte-identical when absent. Tests pass (8 new + 29 existing), syntax is clean, and the code is ASCII-only and matches the heavily-documented `scripts/lib` idiom. The one real concern — a correctly-read non-diameter dim is labeled `correct=false` because the program GT carries only callout-class diameters — is a genuine semantic limitation, but I rate it P2 (not P1) because it is an inherited, already-accepted property of this module's precision definition and the design intent is explicitly documented and tested; it should be documented as a known calibration-bias limitation rather than blocking the merge.

findings:
- [P2] `scripts/lib/cnc-program-gt-lib.mjs:366` — **Diameter-type false-negative contamination of the calibration corpus.** `correct = dimMatchesProgram(d.value_mm, gtDistinct, {relTol}).matched`, where `gtDistinct` is callout-class **diameters only** (lathe feed-move feature diameters + overall length; mill hole/bore diameters 
... [+6401 chars truncated]
