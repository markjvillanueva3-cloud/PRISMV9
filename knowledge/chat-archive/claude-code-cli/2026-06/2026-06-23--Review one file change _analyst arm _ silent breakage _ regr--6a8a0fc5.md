---
type: "chat-session"
source: "claude-code-cli"
session_id: "6a8a0fc5-4275-43b0-b847-449c590c706b"
title: "Review one file change (analyst arm — silent breakage / regression / honesty) fo"
date: "2026-06-23"
first_ts: "2026-06-23T08:21:09.380Z"
last_ts: "2026-06-23T08:22:56.568Z"
cwd: "H:\\prism"
messages: 30
user_msgs: 12
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-af4dafa5d83501172.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Review one file change (analyst arm — silent breakage / regression / honesty) fo

> **claude-code-cli** | 2026-06-23 | 30 msgs (12 user / 18 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-af4dafa5d83501172.jsonl`

## Transcript

### User | 2026-06-23T08:21:09.380Z

Review one file change (analyst arm — silent breakage / regression / honesty) for PRISM unit U-XRAY-GDT-LABEL-TIER (file 1 of 3, the foundation lib).

FILE: H:\prism\scripts\lib\ocr-training-loop-lib.mjs
TEST: H:\prism\scripts\lib\ocr-training-loop-lib.test.mjs

WHAT CHANGED:
- New pure export `buildFcfText(g)`: renders a fused.gdt entry to a canonical ASCII ground-truth string ("symbol tol+unit MC [A|B]"; falls back to raw_text; "" on malformed).
- `buildTrainsetRow` now also emits `gdt_labels[]`: each fused.gdt entry tiered by the SAME corroboration gate + `assignLabelTier(agreement_fraction, calibration)` the dimensions use (agreement_fraction = corroboration/n_models). trainable = corroboration_possible && gold/silver. Each label is tagged `calibration_basis: "dimension-agreement"` (R12 honesty — the isotonic curve is dimension-derived, NOT GD&T-specific). Adds `gdt_labels` + `trainable_gdt_label_count` to the row.
- `aggregateTrainingLoop` rolls up `trainable_gdt_labels`.

VERIFY (PASS/FAIL + P0/P1/P2 + file:line):
1. ADDITIVITY/BACK-COMPAT: existing dimension `labels`/`trainable_label_count`/`tier_counts`/`corroboration_possible` and the existing aggregate fields are byte-unchanged; a fused with NO `gdt` field yields `gdt_labels: []` + count 0 without throwing.
2. CONSISTENCY: the GD&T tiering uses the IDENTICAL corroboration-possible gate + assignLabelTier as dims (no divergent/weakened logic); single-model run mints zero trainable gdt labels (matches the dim P1 regression guard).
3. HONESTY (R12): is the `calibration_basis: "dimension-agreement"` flag accurate and does nothing claim GD&T-specific accuracy? The expected_accuracy is borrowed from the dimension isotonic curve — is that surfaced, not hidden?
4. buildFcfText: deterministic (no Math.random), ASCII-only, malformed-safe; does the rendered FCF string faithfully capture symbol+tolerance+MC+datums?
5. TEST INTEGRITY: are the new tests real reference-value assertions (happy + >=3 failure + >=2 adversari
... [+119 chars truncated]

### Assistant | 2026-06-23T08:21:14.350Z

I'll review the two files end-to-end, then trace consistency against the dimension path and check the honesty claims.

### Assistant | 2026-06-23T08:21:14.837Z

[tool_use: Read]

### Assistant | 2026-06-23T08:21:15.251Z

[tool_use: Read]

### User | 2026-06-23T08:21:16.082Z

[tool_result] 1	// scripts/lib/ocr-training-loop-lib.mjs
2	//
3	// U-XRAY-OCR-TRAINING-LOOP — closed-loop OCR training-data engine (pure core).
4	//
5	// WHY (ready-now, no delta): the full print→CAD→gcode→CAD-gen loop is gated on delta's CAD-gen,
6	// but the print-READING stage trains TODAY. The multi-VLM ensemble (vision-ensemble-fuse.mjs) is a
7	// TEACHER: run it over real prints and the dims models corrob
... [+25628 chars truncated]

### User | 2026-06-23T08:21:16.789Z

[tool_result] 1	// scripts/lib/ocr-training-loop-lib.test.mjs
2	// Tests for U-XRAY-OCR-TRAINING-LOOP pure core. Reference values + algebraic invariants — no
3	// toBeDefined() stubs. The calibration decides which pseudo-labels are TRUSTED enough to train a
4	// model on, so each test encodes WHY a trust verdict matters (a wrong calibration = silently
5	// training on garbage labels — the exact "garbage in, gar
... [+29570 chars truncated]

### Assistant | 2026-06-23T08:21:21.055Z

Both files read end-to-end. Now I'll trace the dimension path against the GD&T path for divergence, and check the consumer surface for any callers of `buildTrainsetRow`/`aggregateTrainingLoop` whose contract could be silently broken by the new fields.

### Assistant | 2026-06-23T08:21:22.022Z

[tool_use: Grep]

### Assistant | 2026-06-23T08:21:23.325Z

[tool_use: Grep]

### User | 2026-06-23T08:21:25.358Z

[tool_result] Found 15 files
scripts\lib\ocr-training-loop-lib.test.mjs
scripts\lib\ocr-training-loop-lib.mjs
scripts\blueprint-ocr-training-loop.mjs
scripts\lib\vision-ensemble-fuse.test.mjs
scripts\lib\vision-ensemble-fuse.mjs
scripts\region-classify.test.mjs
scripts\lib\region-glue-lib.test.mjs
scripts\lib\region-glue-lib.mjs
scripts\lib\ollama-vision-extract-lib.test.mjs
scripts\lib\ollama-vision-extract-li
... [+182 chars truncated]

### User | 2026-06-23T08:21:25.863Z

[tool_result] Found 20 files
scripts\lib\ocr-training-loop-lib.test.mjs
scripts\lib\ocr-training-loop-lib.mjs
knowledge\memories\reference\reference_xray_perprint_unit_propagation_2026_06_22.md
knowledge\memories\reference\reference_xray_p15_region_routing_arc_complete_2026_06_22.md
knowledge\memories\reference\reference_xray_ensemble_nondim_union_2026_06_23.md
knowledge\wiki\code-tribal\learnings\blueprint-vis
... [+824 chars truncated]

### Assistant | 2026-06-23T08:21:32.986Z

The runner `scripts/blueprint-ocr-training-loop.mjs` is the real consumer. I need to verify (a) what `fuseEnsemble` actually emits for `gdt` entries — does its shape match the field names `buildTrainsetRow` reads — and (b) whether the runner consumes the new `gdt_labels` / writes them anywhere whose schema could drift.

### Assistant | 2026-06-23T08:21:34.313Z

[tool_use: Grep]

### User | 2026-06-23T08:21:35.654Z

[tool_result] 23://   This is the exact noisy-OR corroboration doctrine PRISM already uses for cross-SOURCE
60:// corroboration yields literal certainty (1.0): a residual ~1% reserves the possibility
111: * One-vote-per-model: a cluster never contains two dims from the SAME model — corroboration
113: * instances, not self-corroboration. A candidate joins the FEASIBLE cluster (type-compatible
182:// NON-DIMENSIO
... [+3403 chars truncated]

### Assistant | 2026-06-23T08:21:35.803Z

[tool_use: Grep]

### User | 2026-06-23T08:21:37.113Z

[tool_result] 44:  buildTrainsetRow,
333:      // temp-PNG cleanup fires even if buildTrainsetRow/classifyActiveLearning throws (the parser has
360:          // union (opt-in --region-route). Downstream (buildTrainsetRow / classifyActiveLearning / queue
392:          const trainsetRow = buildTrainsetRow({ part: `${basename(entry)}#p${page}`, image: pageImage }, fused, calibration);
404:          nonDimCoverage.
... [+34 chars truncated]

### Assistant | 2026-06-23T08:21:41.371Z

I've confirmed the producer (`fuseEnsemble`) and consumer (the runner) contracts. Let me verify the exact field-name match between what `fuseNonDimField` emits for a `gdt` entry and what `buildTrainsetRow` reads, and how the runner writes/consumes `gdt_labels` downstream (to check for schema drift or a half-written trainset row).

### Assistant | 2026-06-23T08:21:43.260Z

[tool_use: Read]

### Assistant | 2026-06-23T08:21:43.941Z

[tool_use: Read]

### User | 2026-06-23T08:21:44.342Z

[tool_result] 236	  const groups = new Map(); // key -> { rep, models:Set, maxConf }
237	  for (const r of runs) {
238	    const arr = r && r.extraction && Array.isArray(r.extraction[field]) ? r.extraction[field] : [];
239	    for (const item of arr) {
240	      if (!item || typeof item !== "object") continue;
241	      let key;
242	      try { key = keyFn(item); } catch { key = null; }
243	      if (key == nul
... [+1123 chars truncated]

### User | 2026-06-23T08:21:45.391Z

[tool_result] 388	            fused = res.fused;
389	          }
390	          anyPageOk = true;
391	          const pageImage = rast.pageCount > 1 ? `${entry}#page=${page}` : entry;
392	          const trainsetRow = buildTrainsetRow({ part: `${basename(entry)}#p${page}`, image: pageImage }, fused, calibration);
393	          const activeLearning = classifyActiveLearning({ fused, trainsetRow });
394	
395	      
... [+4294 chars truncated]

### Assistant | 2026-06-23T08:21:58.093Z

I now have the full picture. Let me check the producer/consumer field-name match precisely and confirm the one observation worth surfacing about the runner's trainset write.

Key findings from tracing:

**Producer contract (`fuseNonDimField`, vision-ensemble-fuse.mjs:251-268):** each `gdt` entry is `{...g.rep, corroboration, n_models, models, hallucination_candidate}`. `g.rep` is the verbatim VLM extraction item, so `symbol`, `tolerance_value`, `tolerance_unit`, `material_condition`, `datum_references`, `raw_text` flow through only if the model emitted them. `buildTrainsetRow` reads exactly `g.corroboration`, `g.n_models`, `g.hallucination_candidate`, `g.symbol`, `g.tolerance_value`, `g.datum_references` (lib lines 182-191) — every field name matches the producer. No drift. `buildFcfText` reads `g.tolerance_unit`/`g.material_condition`/`g.raw_text`, all of which are pass-through rep fields. Consistent.

**Consistency of the GD&T tier path vs the dim path:** identical gate. Dims use `corroborationPossible = runNModels >= MIN_ENSEMBLE_FOR_CORROBORATION` (line 160) and the GD&T block reuses *that same variable* (line 195) — not a re-derived copy. Both call `assignLabelTier(f, calibration, {thresholds: opts.thresholds})` with the same calibration and same `trainable = gold||silver` rule (lines 172 vs 197). The `f` derivation is byte-identical logic (lines 162-163 vs 182-184). No divergence, no weakening.

**Single-model gate:** GD&T block returns `no_corroboration`/`trainable:false`/`expected_accuracy:null` when `!corroborationPossible` (line 195), mirroring the dim regression guard (line 170). Test at lib.test.mjs:224-236 pins it.

Now one consumer observation worth verifying — the runner's trainset write at line 400 does **not** include `gdt_labels`. Let me confirm whether that is intentional (this is file 1 of 3; the runner wiring may be file 2) versus a silent drop.

### Assistant | 2026-06-23T08:21:59.497Z

[tool_use: Grep]

### User | 2026-06-23T08:22:00.810Z

[tool_result] 400:            try { appendFileSync(trainsetPath, JSON.stringify({ key, page, part: trainsetRow.part, image: pageImage, n_models: trainsetRow.n_models, labels: trainable, gdt_count: trainsetRow.gdt_count, note_count: trainsetRow.note_count, profile_count: trainsetRow.profile_count, surface_finish_count: trainsetRow.surface_finish_count, source: "ensemble-distillation" }) + "\n"); }
465:        th
... [+120 chars truncated]

### Assistant | 2026-06-23T08:22:01.314Z

[tool_use: Bash]

### User | 2026-06-23T08:22:05.983Z

[tool_result] a783df2419 [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-ENSEMBLE-NONDIM-UNION (slot:xray): fuseEnsemble unions gdt/notes/profiles/surface_finishes (was silently dropped at fuse); trainset row + report record non-dim coverage
73582a78c0 [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-RETRY-FAILED (slot:xray): --retry-failed re-queues ensemble/rasterize failures + corrected recall diagnosis
8cfd4da130 [MAI
... [+897 chars truncated]

### Assistant | 2026-06-23T08:22:30.165Z

Confirmed. The diff is exactly the lib + test (143 insertions, 0 to the runner). The runner (`blueprint-ocr-training-loop.mjs`) is **unchanged** this session — its trainset write at line 400 still emits only dimension `labels`, not `gdt_labels`. This is the expected state for "file 1 of 3, the foundation lib": the runner wiring is a later file. The lib is purely additive and the new GD&T fields are computed-and-returned but not yet consumed/persisted, so there is no silent breakage in the current diff — the consumer simply ignores fields it doesn't read.

Let me verify the five checkpoints precisely against the code I've read.

**1. Additivity / back-compat (PASS):** The dimension `labels` (161-173), `trainable_label_count` (205), `tier_counts` (174, 206), `corroboration_possible` (203) are byte-identical to the prior version — the diff adds only the `gdtArr`/`gdt_labels` block (180-198) and three new emitted keys (208-209) plus the aggregate rollup (252-253, 262, 272). A fused with no `gdt` field: `gdtArr = []` (line 180 guards with `Array.isArray(fused.gdt) ? fused.gdt : []`), so `.map` yields `[]` and `trainable_gdt_label_count = 0`. No throw. Pinned by test at 253-257.

**2. Consistency (PASS):** Verified above — same `corroborationPossible` variable, same `assignLabelTier`, same `trainable = gold||silver`, same `f` derivation. Single-model mints zero (line 195, test 224-236). No weakened/divergent logic.

**3. Honesty / R12 (PASS):** `calibration_basis: "dimension-agreement"` is accurate — `assignLabelTier` is called with the *same* `calibration` object passed to the dim path (a dimension-derived isotonic curve; the runner builds it from synthetic dimension GT). `expected_accuracy` is the borrowed dimension isotonic value, and it is surfaced as a field on every GD&T label (line 197) alongside the explicit `calibration_basis` flag. Nothing claims GD&T-specific accuracy; the code comment (176-179) and test (220) both assert this. Honest.

**4. buildFcfText (PASS)
... [+1068 chars truncated]

### Assistant | 2026-06-23T08:22:30.405Z

[tool_use: Read]

### User | 2026-06-23T08:22:31.700Z

[tool_result] 125	export function buildFcfText(g) {
126	  if (!g || typeof g !== "object") return "";
127	  const sym = g.symbol != null ? String(g.symbol).trim() : "";
128	  const tol = Number.isFinite(g.tolerance_value) ? String(g.tolerance_value) : "";
129	  const unit = g.tolerance_unit != null && String(g.tolerance_unit).trim() ? String(g.tolerance_unit).trim() : "";
130	  const mc = g.material_condition !
... [+604 chars truncated]

### Assistant | 2026-06-23T08:22:56.568Z

Confirmed the `tolerance_value: 0` edge. At line 128, `tol = String(0) = "0"`, which is truthy as a string, so `if (tol)` at line 136 passes and `"0"` is correctly included — a zero tolerance renders. So that is *not* a bug. The only genuine edge: if `tolerance_value === 0` and unit is present, it renders `"0mm"` correctly. No issue there.

The one real behavioral subtlety (P2, not a break): `buildFcfText` puts datums *after* material condition with no symbol-vs-datum disambiguation when the FCF has a symbol but the symbol string itself is whitespace-trimmed to empty while datums exist — but that path is exercised (datums-only → `[A|B]`) and is honest. There is no silent failure.

I traced the full producer→lib→consumer chain. The PASS is auditable on these edge-paths:

- **Producer field-name match** (`vision-ensemble-fuse.mjs:251-268` → lib `:182-191`): every field `buildTrainsetRow` reads off a `gdt` entry (`corroboration`, `n_models`, `hallucination_candidate`, `symbol`, `tolerance_value`, `datum_references`) is emitted by `fuseNonDimField`; `buildFcfText`'s reads (`tolerance_unit`, `material_condition`, `raw_text`) are verbatim `g.rep` pass-throughs. No contract drift.
- **Consumer (runner) unchanged** (`blueprint-ocr-training-loop.mjs:392,400`): the runner still calls `buildTrainsetRow` and ignores the new `gdt_labels`/`trainable_gdt_label_count` fields — additive fields, no break. Persisting them is correctly deferred to a later file (this is file 1 of 3). Diff stat confirms 0 runner lines changed.
- **Single-model gate parity** (lib `:160,195` share `corroborationPossible`): GD&T and dims use the identical gate + `assignLabelTier` + `trainable=gold||silver`.
- **No-`gdt`/back-compat** (lib `:180`): `[] → [] → count 0`, no throw.
- **`tolerance_value:0`** renders correctly as `"0"` (string-truthy), not dropped.

---

VERDICT: PASS

summary: This is a clean, purely-additive foundation-lib change (143 insertions to lib+test, 0 to any consumer). The new GD&T tie
... [+2035 chars truncated]
