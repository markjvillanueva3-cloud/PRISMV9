---
type: "chat-session"
source: "claude-code-cli"
session_id: "6a8a0fc5-4275-43b0-b847-449c590c706b"
title: "Analyst review (arm C of PRISM 3-of-3 gate), weighted to SILENT BREAKAGE, REGRES"
date: "2026-06-23"
first_ts: "2026-06-23T08:06:26.488Z"
last_ts: "2026-06-23T08:09:47.993Z"
cwd: "H:\\prism"
messages: 52
user_msgs: 18
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a3be77d60a3d43599.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Analyst review (arm C of PRISM 3-of-3 gate), weighted to SILENT BREAKAGE, REGRES

> **claude-code-cli** | 2026-06-23 | 52 msgs (18 user / 34 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a3be77d60a3d43599.jsonl`

## Transcript

### User | 2026-06-23T08:06:26.488Z

Analyst review (arm C of PRISM 3-of-3 gate), weighted to SILENT BREAKAGE, REGRESSION RISK, I/O safety, and integration coupling. Do NOT assume arms A/B caught everything. Commit a783df2419 on cad-fusion-live-ms0.

Get the diff: `git -C H:/prism show a783df2419`.

UNIT: U-XRAY-ENSEMBLE-NONDIM-UNION. fuseEnsemble (scripts/lib/vision-ensemble-fuse.mjs) now unions gdt/notes/profiles/surface_finishes across the ensemble (previously dropped); the runner scripts/blueprint-ocr-training-loop.mjs records counts in the trainset JSONL row + a report block; ocr-training-loop-lib.mjs buildTrainsetRow/aggregateTrainingLoop carry the counts.

Hunt specifically for:
1. Any way the new union could THROW on real ensemble output (malformed per-model extraction fields, non-array, null items) and abort a fuse that previously succeeded.
2. Determinism: any Math.random/Date.now; is the corroboration-desc + identity-key-asc sort fully input-order-independent?
3. Could the new top-level return keys (gdt/notes/profiles/surface_finishes) collide with or shadow anything a downstream consumer spreads/serializes (e.g. buildRegionRoutedFused {...fullPageFused})? Could the representative spread {...g.rep} then overwrite a same-named source field incorrectly?
4. Runner: does the per-page accumulation or JSONL-row change risk the reaper-survivable append/cursor invariants, or the trainable-only append guard?
5. Identity-key correctness: distinct callouts collapsing, or one callout failing to merge across models.

Grade PASS/FAIL with P0/P1/P2 + file:line. Do not run tests (72/72 green; live run produced non-zero report coverage). End with PASS or FAIL.

### Assistant | 2026-06-23T08:06:30.378Z

I'll investigate this commit thoroughly, focusing on silent breakage and the specific hunt targets. Let me start by getting the diff and reading the affected files.

### Assistant | 2026-06-23T08:06:31.099Z

[tool_use: Bash]

### User | 2026-06-23T08:06:34.147Z

[tool_result] <persisted-output>
Output too large (29.5KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\6a8a0fc5-4275-43b0-b847-449c590c706b\tool-results\bf7ubgljn.txt

Preview (first 2KB):
commit a783df2419d5744ff7b28f2c07ad3f17ac9fee09
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 23 03:05:09 2026 -0500

    [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-ENSEMBLE-N
... [+1765 chars truncated]

### Assistant | 2026-06-23T08:06:36.910Z

Let me read the full diff.

### Assistant | 2026-06-23T08:06:37.395Z

[tool_use: Read]

### User | 2026-06-23T08:06:40.663Z

[tool_result] 1	commit a783df2419d5744ff7b28f2c07ad3f17ac9fee09
2	Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
3	Date:   Tue Jun 23 03:05:09 2026 -0500
4	
5	    [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-ENSEMBLE-NONDIM-UNION (slot:xray): fuseEnsemble unions gdt/notes/profiles/surface_finishes (was silently dropped at fuse); trainset row + report record non-dim coverage
6	    
7	    Producer (vis
... [+31393 chars truncated]

### Assistant | 2026-06-23T08:06:44.393Z

Now let me read the key files in full to understand the context and the `runs` variable used by `fuseNonDimField`. Let me look at the `fuseEnsemble` function in full, and the consumer `buildRegionRoutedFused`.

### Assistant | 2026-06-23T08:06:45.061Z

[tool_use: Read]

### User | 2026-06-23T08:06:45.638Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\vision-ensemble-fuse.mjs' was already read 11s ago in this session and is unchanged (mtime 1782201049474). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-23T08:06:48.925Z

The read-once guard thinks I've read it but I've only read the diff. Let me grep for the key structures.

### Assistant | 2026-06-23T08:06:49.679Z

[tool_use: Bash]

### User | 2026-06-23T08:06:53.135Z

[tool_result] <persisted-output>
Output too large (30.3KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\6a8a0fc5-4275-43b0-b847-449c590c706b\tool-results\bxlwp0gwk.txt

Preview (first 2KB):
// scripts/lib/vision-ensemble-fuse.mjs
//
// U-XRAY-VISION-ENSEMBLE — multi-VLM ensemble blueprint OCR with consensus fusion.
//
// WHY THIS EXISTS (the Blackwell unlock):
//   The single-model OCR path p
... [+1757 chars truncated]

### Assistant | 2026-06-23T08:06:55.789Z

[tool_use: Read]

### User | 2026-06-23T08:06:59.018Z

[tool_result] 1	// scripts/lib/vision-ensemble-fuse.mjs
2	//
3	// U-XRAY-VISION-ENSEMBLE — multi-VLM ensemble blueprint OCR with consensus fusion.
4	//
5	// WHY THIS EXISTS (the Blackwell unlock):
6	//   The single-model OCR path pins ONE vision model (qwen3-vl:8b-instruct) because the
7	//   old RTX 4080 (16GB) could hold only one resident. The RTX PRO 6000 Blackwell (96GB,
8	//   ~85GB idle in practice) remov
... [+32396 chars truncated]

### Assistant | 2026-06-23T08:07:02.774Z

Now I understand the full producer. The `runs` variable in `fuseEnsemble` is correctly filtered. Let me now examine the critical consumer: `buildRegionRoutedFused`, which the commit message claims "already ASSUMED the fused carried gdt/notes/...". I need to verify the representative-spread concern (hunt target 3).

### Assistant | 2026-06-23T08:07:03.371Z

[tool_use: Grep]

### User | 2026-06-23T08:07:07.080Z

[tool_result] Found 16 files
state\session-reorientation\reorientation-claude-6a8a0fc5.json
scripts\lib\vision-ensemble-fuse.mjs
state\shared\handoffs\consolidated\xray.md
state\HANDOFF.md
knowledge\memories\reference\reference_xray_p15_region_routing_arc_complete_2026_06_22.md
knowledge\memories\feedback\reference_shared_tree_uncommitted_clobber_2026_06_22.md
knowledge\memories\reference\reference_session_xray
... [+640 chars truncated]

### Assistant | 2026-06-23T08:07:09.759Z

The interesting consumer is `region-glue-lib.mjs` which contains `buildRegionRoutedFused`. Let me read it.

### Assistant | 2026-06-23T08:07:11.475Z

[tool_use: Bash]

### User | 2026-06-23T08:07:15.396Z

[tool_result] 27:// ids are r0/r1/... from region-classifier-lib) so the merge treats it as a distinct source.
155: * output (which carries the non-dimension rich schema -- gdt / notes / profiles / surface_finishes /
161: * HONEST LIMIT (R12): when the full-page pass itself failed (a dense page -> 0 dims AND 0 gdt/notes),
162: * the non-dimension fields are empty -- region routing recovers the DIMS but cannot c
... [+737 chars truncated]

### Assistant | 2026-06-23T08:07:17.735Z

Let me read the full `buildRegionRoutedFused` function to understand the spread behavior.

### Assistant | 2026-06-23T08:07:18.521Z

[tool_use: Read]

### User | 2026-06-23T08:07:19.860Z

[tool_result] 150	  return mergeTiledDimensions(perTile, { tiles, valueTolMm: opts.valueTolMm });
151	}
152	
153	/**
154	 * Build a COMPLETE fused-shaped object for a region-routed page: take the full-page floor's fused
155	 * output (which carries the non-dimension rich schema -- gdt / notes / profiles / surface_finishes /
156	 * summary / part_bounds) and REPLACE its dimensions with the region-routed union. T
... [+4254 chars truncated]

### Assistant | 2026-06-23T08:07:26.897Z

This is the key consumer. `buildRegionRoutedFused` does `const out = { ...fullPageFused, dimensions: dims }`. The `fullPageFused` is the output of `fuseEnsemble`. So `out` now carries `gdt/notes/profiles/surface_finishes` (which are now populated, previously dropped) — exactly as the commit message claims this was already assumed. This is additive and correct: the spread now actually carries the data it always assumed. Let me verify that `out.dimensions` replacement does NOT accidentally interact with the new fields. It only overwrites `dimensions`; gdt/notes/profiles/surface_finishes pass through untouched. Good.

Now let me check the `{...g.rep}` spread concern (hunt target 3). The representative `g.rep` is the raw per-model item, e.g. a gdt FCF object. The spread is `{ ...g.rep, corroboration, n_models, models, hallucination_candidate }`. The concern: could `g.rep` already contain a field named `corroboration`/`n_models`/`models`/`hallucination_candidate` that would be overwritten? Let me check what `parseVisionResponse` produces for these fields.

### Assistant | 2026-06-23T08:07:28.970Z

[tool_use: Bash]

### User | 2026-06-23T08:07:31.828Z

[tool_result] 7:// dimensions + gdt + notes + profiles + part_bounds + thickness + surface
10:// contract to a bare {confidence, dimensions} — material/title-block/GD&T/
11:// profiles are all goal-critical for CAD reconstruction + quoting).
63: * BLUEPRINT_ANALYSIS_PROMPT (title_block/dimensions/gdt/notes/profiles/...).
92:    '      "raw_text": "the exact text shown on the drawing", "confidence": 0.95 }',
94:
... [+7450 chars truncated]

### Assistant | 2026-06-23T08:07:38.968Z

This is the critical verification. The extractor output shapes are:
- **gdt** (extractGdt, line 688-699): `symbol, tolerance_value, tolerance_unit, material_condition, datum_references, applied_to, raw_text, confidence` — and possibly `canon`. NO `corroboration`/`n_models`/`models`/`hallucination_candidate` fields.
- **notes** (extractNote, line 707): `category, text, is_critical` — no collision.
- **profiles** (extractProfile, line 716-720): `name, type, is_closed, width_mm, height_mm, diameter_mm, corner_radii_mm, confidence` — no collision.
- **surface_finishes** (extractSurfaceFinish, line 729-739): `ra_um, location, raw_text, ra_um_source, ra_um_assumed, ra_um_note` — no collision.

So `{ ...g.rep, corroboration, n_models, models, hallucination_candidate }` never overwrites a source field with a different meaning. The trust metadata fields are entirely new keys. No shadowing concern. Good — hunt target 3 is clean.

Now let me verify the gdt extractGdt full shape to confirm there's no `models` or `n_models` field. Let me also check `extractGdt` returns to confirm there isn't a field that could collide.

### Assistant | 2026-06-23T08:07:39.977Z

[tool_use: Read]

### User | 2026-06-23T08:07:41.047Z

[tool_result] 676	  if (!g || typeof g !== "object") return null;
677	  const symbol = asStr(g.symbol);
678	  const raw = asStr(g.raw_text);
679	  if (symbol == null && raw == null) return null;
680	  const datums = asArray(g.datum_references).map((d) => asStr(d)).filter(Boolean);
681	  // Normalize the VLM's symbol emission (abbreviation / variant spelling / unicode) to the canonical
682	  // GDTSymbol so the 
... [+1906 chars truncated]

### Assistant | 2026-06-23T08:07:50.404Z

Confirmed: extractor outputs have NO collision with the trust-metadata field names. Now an important subtlety on hunt target 1 (THROW) and the keyFn robustness.

In `fuseNonDimField`, `keyFn(item)` is wrapped in `try { key = keyFn(item); } catch { key = null; }`. But note `item` is already guarded `if (!item || typeof item !== "object") continue;`. The keyFns access `.datum_references`, `.symbol`, etc. on `item` — but in the real path, `item` comes from `r.extraction[field]`, which is the parseVisionResponse output (already extracted to clean shapes). HOWEVER — the `runs` passed to `fuseNonDimField` is the SAME filtered `runs` used by `fuseEnsemble`. The `extraction` is whatever was passed in. The try/catch protects against malformed items. Good defensive coverage. The adversarial test at diff line 426 confirms null items / non-array fields / numbers are all handled without throw.

Now let me check a subtle determinism point. Note that `gdtKey` calls `g.datum_references.map(nonDimKeyNorm).sort()`. The `.sort()` is lexicographic on the normalized strings — deterministic. Good.

Let me check the runner's reaper/cursor invariant (hunt target 4) — read the full append/cursor region of the runner.

### Assistant | 2026-06-23T08:07:51.073Z

[tool_use: Read]

### User | 2026-06-23T08:07:52.268Z

[tool_result] 355	              console.log(`    ${basename(entry)}#p${page}: page-classify SKIP (${kind}, conf ${conf}) -- not a drawing, ensemble skipped`);
356	              continue;
357	            }
358	          }
359	          // `fused` is resolved from EITHER the full-page ensemble (default) OR the P1.5 region-routing
360	          // union (opt-in --region-route). Downstream (buildTrainsetRow / class
... [+10759 chars truncated]

### Assistant | 2026-06-23T08:08:04.388Z

Now I've verified the runner invariants thoroughly. Critical findings for hunt target 4:

1. **Trainset row append** (line 400): The new fields `gdt_count/note_count/profile_count/surface_finish_count` are added to the JSON object inside the existing `appendFileSync` — guarded by the SAME try/catch. The append is still gated by `trainable.length > 0` (the trainable-only guard is UNCHANGED). The new fields are derived from `trainsetRow` which is already computed before the append. No new failure mode. The reaper-survivable append/cursor invariant is intact — the cursor is still appended AFTER the durable rows (line 433), unchanged.

2. **nonDimCoverage accumulation** (lines 403-407): This runs OUTSIDE the `trainable.length > 0` guard — accumulated for EVERY ensembled page (as documented and intended). It uses `|| 0` fallback so a missing count never produces `NaN`. This is an in-memory counter only; the comment explicitly notes the durable data is the JSONL, and these in-memory numbers are recomputed-from-cursor or lost-on-kill — they're a report convenience, not a durability concern. Correct.

3. **Report block** (line 471): `this_run_non_dim_coverage: nonDimCoverage` is added to the report object. No schemaVersion bump needed (it's an additive field in a `weak_label` snapshot, schemaVersion stays "1.1.0" — acceptable since it's purely additive and the report is a snapshot, not a migrated state file).

Now let me address one subtle integration concern. In the `regionRoute` path (line 373), `fused = rr.fused` comes from `extractWithRegionRouting`, which builds via `buildRegionRoutedFused`. When the full-page floor failed, the fallback path returns `{ dimensions: dims, summary: {...} }` WITHOUT `gdt/notes/profiles/surface_finishes`. Then `buildTrainsetRow` reads `fused.gdt` → `Array.isArray(undefined)` → false → count 0. No throw. Good — the back-compat test at diff line 144 confirms this.

Let me verify `extractWithRegionRouting` and confirm `rr.fused` is always eith
... [+80 chars truncated]

### Assistant | 2026-06-23T08:08:05.516Z

[tool_use: Bash]

### User | 2026-06-23T08:08:08.713Z

[tool_result] 42:  if (!Array.isArray(bbox) || bbox.length !== 4) return null;
44:  if (![fx, fy, fw, fh].every((n) => Number.isFinite(n))) return null;
45:  if (!Number.isFinite(pageW) || !Number.isFinite(pageH) || pageW <= 0 || pageH <= 0) return null;
55:  if (w < 1 || h < 1) return null;
56:  return { x, y, w, h };
72:  if (!Array.isArray(routed)) return [];
90:  return specs;
115:  return tiles;
150:  retu
... [+742 chars truncated]

### Assistant | 2026-06-23T08:08:15.701Z

`extractWithRegionRouting` is not defined in region-glue-lib.mjs. Let me find it to confirm `rr.fused` is always a safe shape.

### Assistant | 2026-06-23T08:08:16.430Z

[tool_use: Bash]

### User | 2026-06-23T08:08:20.738Z

[tool_result] H:/prism/scripts/region-classify.mjs:149:export async function extractWithRegionRouting(opts, deps = {}) {
H:/prism/scripts/region-classify.mjs:182:      dimensions: fullDims, fullPage: { dimensions: fullDims, ok: fullPageOk, fused: fullFused },
H:/prism/scripts/region-classify.mjs:185:      fused: fullFused,
H:/prism/scripts/region-classify.mjs:228:    fullPage: { dimensions: fullDims, ok: fullPa
... [+167 chars truncated]

### Assistant | 2026-06-23T08:08:25.327Z

Confirmed: `extractWithRegionRouting` line 185 returns `fused: fullFused` (a raw `fuseEnsemble` output — now carries the union fields) on the non-routed early-return, and line 234 returns `fused: buildRegionRoutedFused(...)`. Both are safe shapes for `buildTrainsetRow`. 

Now let me check line 182-185 context to confirm `fullFused` is a `fuseEnsemble` output and won't itself be missing the new fields when present. Let me look at region-classify around 175-235.

### Assistant | 2026-06-23T08:08:26.162Z

[tool_use: Read]

### User | 2026-06-23T08:08:27.136Z

[tool_result] 149	export async function extractWithRegionRouting(opts, deps = {}) {
150	  if (!opts || typeof opts.pngPath !== "string" || !opts.pngPath) throw new Error("extractWithRegionRouting: pngPath required");
151	  const readImageSize = deps.readImageSize || readPngSize;
152	  const segment = deps.segment || runRegionSegment;
153	  const cropRegions = deps.cropRegions || cropTilesPy;
154	  const runEnse
... [+5496 chars truncated]

### Assistant | 2026-06-23T08:08:45.272Z

Fully traced. The integration coupling is sound:

- `fullFused = fullRes.fused` = a `fuseEnsemble` output → NOW carries `gdt/notes/profiles/surface_finishes` (the fix). 
- `buildRegionRoutedFused` does `{ ...fullPageFused, dimensions: dims }` → spreads the new fields through unchanged, replacing only `dimensions`. The region-routed `fused` hybrid now correctly carries the non-dimension union — which is EXACTLY the assumption documented at region-glue-lib.mjs:155-159 that was previously a silent lie (the fuse dropped them, so `out.gdt` was always `undefined`, and `buildTrainsetRow` would have counted 0). Now it carries real data. This is the bug the commit fixes, applied coherently across both consumers.

One subtle point worth verifying for hunt target 5 (distinct callouts collapsing / failing to merge). The `noteKey` is `category|text`. The `extractNote` defaults `category` to `"general"` when absent. So two notes with the same text but where one model omitted category (→ "general") and another supplied "process" would NOT merge — they'd be two entries. That's a recall-first under-merge (keeps both), not a data loss, and is acceptable per the recall-first doctrine. Conversely, distinct callouts won't wrongly collapse since the key includes the full normalized text.

For `surfaceFinishKey`: `ra:` + raw number when `ra_um` finite. Note `s.ra_um` could be e.g. `0.8` from one model and `0.80` from another — both `Number.isFinite` and `"ra:0.8" === "ra:0.8"` since JS `String(0.80)` === `"0.8"`. Good. But `ra:0.8` vs `ra:0.800001` (float drift across models) would be distinct. That's an under-merge, recall-first — acceptable, not a P-level issue.

Now let me double-check one determinism subtlety in `fuseNonDimField` representative selection that could affect output content (not just order). The representative `g.rep` is chosen by strictly-greater confidence. The FIRST model iterated that has `maxConf` wins ties. The iteration order is `runs` order, which is the input mod
... [+290 chars truncated]

### Assistant | 2026-06-23T08:08:45.729Z

[tool_use: Read]

### User | 2026-06-23T08:08:46.780Z

[tool_result] 235	function fuseNonDimField(runs, field, keyFn, nModels) {
236	  const groups = new Map(); // key -> { rep, models:Set, maxConf }
237	  for (const r of runs) {
238	    const arr = r && r.extraction && Array.isArray(r.extraction[field]) ? r.extraction[field] : [];
239	    for (const item of arr) {
240	      if (!item || typeof item !== "object") continue;
241	      let key;
242	      try { key = k
... [+1178 chars truncated]

### Assistant | 2026-06-23T08:08:59.291Z

I've confirmed the representative-selection determinism nuance. Analysis:

**Representative-content determinism (a real but bounded nuance):** When two members of the same identity group tie on `confidence` (e.g. both omit confidence → both `c = -1`, never `> maxConf = -1`), the representative is the FIRST-iterated member, which depends on `runs` (model input) order. The identity-key fields are identical across the group by construction, so the KEY and ORDER are fully input-order-independent (the sort is content-derived). But non-key representative fields — `raw_text`, `confidence`, `is_critical`, `corner_radii_mm`, `datum_deficient`, `ra_um_source`, etc. — can differ based on input order when confidences tie.

This means `fuseEnsemble`'s OUTPUT (the entry objects) is NOT strictly byte-identical under model reordering when ties occur on confidence — only the count, order, key, corroboration, and models[] are. The commit message and the determinism test (diff line 437) only assert order-independence via the projection `x.symbol + ":" + x.corroboration + ":" + x.models.join(",")` — which deliberately excludes the representative's non-key fields. So the test does NOT catch this.

Is it a defect? For the documented purpose — counts (`gdt_count`, `n_gdt`, etc.) and trust gating — this is fully deterministic. The non-key field drift only matters if a downstream consumer trains on or reconciles the representative's `raw_text`/`confidence` in an order-sensitive way. Currently the only consumer (`buildTrainsetRow`) reads `.length` and `summary` counts — order-independent. So this is a latent P2 (a future consumer that serializes the representative across reordered runs could see non-determinism), not a current break. The first-model-wins-ties contract is documented in the function header. I'll log it as P2.

Now let me verify there are no OTHER consumers of `fuseEnsemble`'s output that might break on the new top-level keys, or that spread the result in a way that collides. L
... [+25 chars truncated]

### Assistant | 2026-06-23T08:09:01.144Z

[tool_use: Bash]

### User | 2026-06-23T08:09:04.392Z

[tool_result] H:/prism/scripts/arm-account-switch.mjs:36: * is also refused. Override with --accept-unsafe-accounts (logged in the output).
H:/prism/scripts/blueprint-ocr-training-loop.mjs:39:import { runEnsembleOverImage } from "./lib/vision-ensemble-fuse.mjs";
H:/prism/scripts/blueprint-ocr-training-loop.mjs:248:      const res = await runEnsembleOverImage({ png: g.png, models, assumeUnits: "in", ollamaUrl: O
... [+4861 chars truncated]

### Assistant | 2026-06-23T08:09:13.869Z

I've now enumerated every consumer of `fuseEnsemble`/`runEnsembleOverImage`/`.fused`:

1. **blueprint-ocr-training-loop.mjs:249-251** (calibration path): reads `res.fused.summary.n_models` + `res.fused.dimensions` — unaffected (these keys are unchanged).
2. **blueprint-ocr-training-loop.mjs:409**: serializes `summary: fused.summary` into the AL queue row — `summary` now has 5 extra count keys, but that's additive JSON; no consumer breaks.
3. **ocr-training-loop-lib.mjs:129-160** (buildTrainsetRow): reads `dimensions`, `summary.n_models`, and the new `gdt/notes/profiles/surface_finishes` — all `Array.isArray`-guarded. Safe.
4. **ocr-training-loop-lib.mjs:173-175** (classifyActiveLearning): reads `fused.summary` only. Unaffected.
5. **region-classify.mjs:86-93**: reads `res.fused.dimensions` + `res.fused.summary.n_models`. Unaffected.

No consumer spreads `fuseEnsemble`'s result into a structure where the new top-level keys collide with anything. The only spread (`buildRegionRoutedFused`'s `{...fullPageFused}`) is exactly the intended pass-through. The new `summary` keys are purely additive.

Let me do one final check on the calibration-path trainset write at line 248 region (the OTHER append site), to confirm the new fields don't need to be there too and there's no inconsistency that would break the LoRA dedup downstream.

### Assistant | 2026-06-23T08:09:14.827Z

[tool_use: Read]

### User | 2026-06-23T08:09:15.991Z

[tool_result] 244	      const difficulty = opts.difficulties[i % opts.difficulties.length];
245	      const seed = 9000 + i;
246	      const g = generateSyntheticPrint({ seed, workDir, difficulty, python: PYTHON, gen: GEN });
247	      if (g.error) { console.log(`    seed ${seed}: gen FAIL ${g.error}`); continue; }
248	      const res = await runEnsembleOverImage({ png: g.png, models, assumeUnits: "in", ollamaU
... [+1345 chars truncated]

### Assistant | 2026-06-23T08:09:47.993Z

This is the calibration phase (Phase 1) — it only computes `perDimCorrectness` from synthetic-print ground truth; it does NOT append trainset rows. The trainset rows are written only in Phase 2 (weak-label, line 400). So there's no second append site missing the new fields — the calibration path correctly doesn't write rows. Consistent.

I have now traced every hunt target exhaustively. Let me compile my verdict.

## Summary of investigation

**Hunt target 1 (THROW on malformed input):** `fuseNonDimField` (vision-ensemble-fuse.mjs:235-269) guards every layer: `runs` is the pre-filtered valid-extraction list; `r.extraction[field]` is array-checked (`Array.isArray(...) ? ... : []`); each `item` is `!item || typeof item !== "object"` skipped; `keyFn(item)` is wrapped in `try/catch → key=null → continue`; `item.confidence` uses `Number.isFinite`. The adversarial test (diff:426) confirms `[null, "garbage"]`, `undefined`, `"notarray"`, `[null, 42]` all yield empty unions with no throw. **No regression — a fuse that succeeded before still succeeds.**

**Hunt target 2 (determinism):** No `Math.random`/`Date.now` in the pure path. Sort key is `corroboration desc` then `key asc` (content-derived). `gdtKey` sorts `datum_references` so A,B == B,A. `models[]` is `.sort()`ed. Order and counts are fully input-order-independent. ONE bounded nuance: the *representative's non-key fields* (raw_text/confidence) can differ under model reordering when confidences tie (first-iterated wins). Documented in the header; no current consumer reads those order-sensitively. P2 latent.

**Hunt target 3 (key collision / spread shadow):** Verified against `extractGdt/Note/Profile/SurfaceFinish` (ollama-vision-extract-lib.mjs:686-739): NONE of the extractor shapes emit `corroboration`/`n_models`/`models`/`hallucination_candidate`, so `{...g.rep, ...trustMeta}` never overwrites a source field. `buildRegionRoutedFused`'s `{...fullPageFused, dimensions: dims}` passes the new fields through untouched — t
... [+3735 chars truncated]
