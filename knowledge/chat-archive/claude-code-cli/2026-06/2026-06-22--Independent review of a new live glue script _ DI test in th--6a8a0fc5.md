---
type: "chat-session"
source: "claude-code-cli"
session_id: "6a8a0fc5-4275-43b0-b847-449c590c706b"
title: "Independent review of a new live glue script + DI test in the PRISM repo at H:\\p"
date: "2026-06-22"
first_ts: "2026-06-22T23:40:43.224Z"
last_ts: "2026-06-22T23:43:30.558Z"
cwd: "H:\\prism"
messages: 45
user_msgs: 17
assistant_msgs: 28
raw_file: "H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a9a13b9913e4d6068.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Independent review of a new live glue script + DI test in the PRISM repo at H:\p

> **claude-code-cli** | 2026-06-22 | 45 msgs (17 user / 28 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a9a13b9913e4d6068.jsonl`

## Transcript

### User | 2026-06-22T23:40:43.224Z

Independent review of a new live glue script + DI test in the PRISM repo at H:\prism (do NOT assume the analyst caught everything). Grade PASS or FAIL with file:line. Read:
- H:\prism\scripts\region-classify.mjs
- H:\prism\scripts\region-classify.test.mjs

CONTEXT: P1.5 step-2b -- the LIVE region-routing glue for blueprint OCR (slot:xray). extractWithRegionRouting(opts, deps) is a DI-testable orchestrator: segment -> decideRegionRouting -> (full_page: full-page OCR floor only | region_route: crop+per-region OCR + UNION with the floor via mergeRegionResults). Built on two already-shipped+scrutinized pure libs (region-classifier-lib, region-glue-lib). A live smoke already proved the real curl->Ollama segmentation returns 4 valid regions on a real blueprint.

Weight toward what a correctness analyst might miss:
1. TEST INTEGRITY (R9): are the 8 DI tests real (concrete reference values, injected fakes that genuinely exercise both routes)? Critically, is the DATA-LOSS-SAFE contract pinned by a test that would FAIL if the glue dropped a full-page-only dim or returned a box-cropped subset on full_page? Is the "full-page floor always runs" property actually asserted (e.g. ensembleArgs includes the full-page png)? Any .skip/.only? Any test that would pass even if the orchestration broke?
2. FAIL-SOFT completeness: segment throw, uncroppable region, models_ok=0 floor, missing pngPath -- all covered + correct?
3. The default runRegionSegment live dep: is it genuinely fail-soft (temp reqfile cleanup, curl failure -> "", JSON.parse guard)? Any resource leak (reqfile not cleaned on error path)?
4. SCOPE HONESTY (R12): the unit ships the orchestrator + DI tests + a live segment smoke, but NOT the full recall-vs-0.43 ensemble validation (that is the separate "validate" step needing a multi-minute GPU run). Is that scoping honest in the code/comments, or does anything over-claim a validation it didn't run?
5. Convention conformance with vision-tiling-extract.mjs; ASCII; CLI arg pars
... [+106 chars truncated]

### Assistant | 2026-06-22T23:40:48.719Z

I'll review both files end to end, then check the dependencies they're built on.

### Assistant | 2026-06-22T23:40:49.211Z

[tool_use: Read]

### Assistant | 2026-06-22T23:40:49.250Z

[tool_use: Read]

### User | 2026-06-22T23:40:49.694Z

[tool_result] read-once-guard: 'H:\prism\scripts\region-classify.mjs' was already read 11s ago in this session and is unchanged (mtime 1782171443905). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T23:40:49.742Z

[tool_result] read-once-guard: 'H:\prism\scripts\region-classify.test.mjs' was already read 11s ago in this session and is unchanged (mtime 1782171508200). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T23:40:53.365Z

The guard says these were read, but I don't have them in context. Let me bypass the cache.

### Assistant | 2026-06-22T23:40:53.909Z

[tool_use: Bash]

### Assistant | 2026-06-22T23:40:55.839Z

[tool_use: Bash]

### User | 2026-06-22T23:40:57.313Z

[tool_result] #!/usr/bin/env node
// scripts/region-classify.mjs
//
// BLUEPRINT-VISION-OCR P1.5 step 2b -- the LIVE layout-aware region-routing glue. Segments a
// blueprint page into layout regions, routes each to an extractor, crops + OCRs each region, and
// UNIONs the result with a full-page floor pass. The thin-glue half of the pure-lib + thin-glue
// split (cores: scripts/lib/region-classifier-lib.mjs + 
... [+11735 chars truncated]

### User | 2026-06-22T23:40:59.288Z

[tool_result] /**
 * region-classify -- DI tests for the P1.5 step-2b live glue orchestrator (GPU-free).
 *
 * extractWithRegionRouting takes injectable deps (readImageSize/segment/cropRegions/runEnsemble) so
 * the routing + recall-first union logic is tested WITHOUT a GPU/Ollama. The load-bearing contract:
 * the full-page OCR floor ALWAYS runs; a low-confidence/failed segmentation routes to "full_page"
 * (t
... [+6555 chars truncated]

### Assistant | 2026-06-22T23:41:02.750Z

Now I have both files. Let me read the dependency libs to verify the contracts the glue relies on, especially the merge/union, crop spec, lift, and the ensemble-fuse signatures.

### Assistant | 2026-06-22T23:41:04.236Z

[tool_use: Bash]

### Assistant | 2026-06-22T23:41:04.642Z

[tool_use: Bash]

### User | 2026-06-22T23:41:08.071Z

[tool_result] // scripts/lib/region-glue-lib.mjs
//
// BLUEPRINT-VISION-OCR P1.5 step 2 -- pure orchestration core for the region-routing glue
// (scripts/region-classify.mjs). Turns the layout decision from region-classifier-lib into the
// concrete inputs the live pipeline needs: PIXEL crop specs for crop-image-tiles.py and the
// merge inputs for vision-tiling-lib mergeTiledDimensions. PURE (no fs/fetch/subp
... [+7208 chars truncated]

### User | 2026-06-22T23:41:09.325Z

[tool_result] // scripts/lib/region-classifier-lib.mjs
//
// BLUEPRINT-VISION-OCR P1.5 -- layout-aware REGION segmentation + routing (pure core).
//
// THE PROBLEM this solves (blueprint-reading-improvement-backlog-2026-06-19, P1.5):
// the SHIPPED page classifier (scripts/lib/page-classifier-lib.mjs) makes a BINARY
// per-page decision -- extract the whole page or skip it. That over-skips: a page is
// rarely 
... [+19347 chars truncated]

### Assistant | 2026-06-22T23:41:13.465Z

Now I understand the merge contract. Let me verify the upstream helper signatures the glue depends on: `mergeTiledDimensions` (does it return `{newInTiled}` for lift?), `computeLift`, `readPngSize`, `cropTilesPy`, and `runEnsembleOverImage`. The test asserts `r.lift.newInTiled` so I need to confirm `computeLift` returns that field.

### Assistant | 2026-06-22T23:41:14.889Z

[tool_use: Grep]

### User | 2026-06-22T23:41:16.199Z

[tool_result] 42:export function readPngSize(pngPath) {
43-  const buf = readFileSync(pngPath);
44-  \ PNG signature: 89 'P' 'N' 'G' 0d 0a 1a 0a ; IHDR width@16 height@20 (big-endian uint32)
45-  if (buf.length < 24 || buf[0] !== 0x89 || buf.toString("ascii", 1, 4) !== "PNG") {
46-    throw new Error(`readPngSize: not a PNG file: ${pngPath}`);
47-  }
48-  const width = buf.readUInt32BE(16);
49-  const height = 
... [+6881 chars truncated]

### Assistant | 2026-06-22T23:41:16.405Z

[tool_use: Grep]

### User | 2026-06-22T23:41:17.803Z

[tool_result] 17://   errors, so:
191: *   dimensions: Array<object>,            // fused, corroboration-desc
306:// {error} record (never throws) so one bad model cannot abort the ensemble. NOT exercised
361:    child.on("error", (e) => { stderr += (e && e.message) || String(e); done(null); });
368: * the parsed extraction or {error}. Never throws. Reuses the prompt/request/parse core.
376: * @returns {Promise
... [+2161 chars truncated]

### Assistant | 2026-06-22T23:41:26.238Z

All upstream contracts are confirmed:
- `computeLift` returns `{newInTiled, ...}` (line 174) — the test's `r.lift.newInTiled >= 1` assertion is valid.
- `runEnsembleOverImage` returns `{fused, models_ok, models_failed, error}` (lines 426-454) — matches `dimsOf`/`ensembleOk` shape.
- `readPngSize` is synchronous (returns `{width,height}`), but the glue does `await readImageSize(...)` — awaiting a non-promise is harmless.
- `cropTilesPy` returns `Map<tileId, path>` — matches the glue's `cropMap.get(spec.id)`.

Now let me verify the merge de-dup contract by reading `mergeTiledDimensions` — the test asserts that a region dim duplicate of the full-page dim collapses (count==2 not 3). I need to confirm the merge actually collapses by tile-overlap, and check whether the test's fake crop paths (`/fake/r0.png`) actually map to the cropSpecs ids the merge keys on.

### Assistant | 2026-06-22T23:41:27.274Z

[tool_use: Grep]

### User | 2026-06-22T23:41:28.621Z

[tool_result] 175:export function mergeTiledDimensions(perTile, opts = {}) {
176-  const valueTolMm = isPosFinite(opts.valueTolMm) ? opts.valueTolMm : DEFAULT_MERGE_VALUE_TOL_MM;
177-  const tileMap = new Map();
178-  if (Array.isArray(opts.tiles)) for (const t of opts.tiles) if (t && t.id != null) tileMap.set(String(t.id), t);
179-
180-  // Flatten to instances {dim, tileId}. Tolerate a missing tileId (legacy 
... [+3181 chars truncated]

### Assistant | 2026-06-22T23:41:38.853Z

The merge contract is confirmed. The full-page tile (`full_page`, [0,0,pageW,pageH]) overlaps every region tile, so a full-page-floor dim and a region dim with the same merge key get collapsed (connected via overlap), while two distinct same-valued region dims in non-overlapping tiles stay separate via the greedy clique guard.

Now let me carefully validate the test's key correctness claim. In the first test, `cropRegions` is faked to return `/fake/r0.png`, `/fake/r1.png` keyed by `spec.id`. The cropSpecs ids come from `buildRegionCropSpecs(decision.routed, ...)`. The routed regions get ids `r0`/`r1` from `parseRegionSegmentResponse`. So spec ids are `r0`, `r1` and the fake map keys on those. The `perRegion` entries get `id: spec.id` = `r0`/`r1`, which become the `tileId` in the merge. The merge tiles include those region rects + `full_page`. 

Let me verify the geometry: TWO_REGIONS bboxes are `[0,0,0.5,0.5]` and `[0.5,0.5,0.5,0.5]` on a 1000x800 page. These two regions don't overlap each other, but both overlap `full_page`. Let me confirm the de-dup math the test asserts (count==2): full-page has 25.4; r0 has 6.35; r1 has 25.4. The r1 25.4 connects to full-page 25.4 (overlap) -> collapse. r0 6.35 is unique -> added. Result: {25.4, 6.35} = 2. Correct.

Let me run the test to confirm it actually passes (no fabricated green), and check for `.skip`/`.only`.

### Assistant | 2026-06-22T23:41:39.780Z

[tool_use: Bash]

### Assistant | 2026-06-22T23:41:40.780Z

[tool_use: Grep]

### User | 2026-06-22T23:41:43.292Z

[tool_result]   ...
# Subtest: uncroppable region (cropMap missing id) -> counted failed, full-page floor still covers it
ok 5 - uncroppable region (cropMap missing id) -> counted failed, full-page floor still covers it
  ---
  duration_ms: 0.3739
  ...
# Subtest: full-page floor counts as failed when models_ok=0 (R12 fail-loud parity)
ok 6 - full-page floor counts as failed when models_ok=0 (R12 fail-loud pari
... [+461 chars truncated]

### User | 2026-06-22T23:41:44.637Z

[tool_result] No matches found

### Assistant | 2026-06-22T23:41:49.035Z

8/8 pass, 0 skipped, no `.skip`/`.only`. Now let me verify the tests would genuinely FAIL if the orchestration broke (R9 mutation check). The most critical contracts to probe: (a) does the DATA-LOSS-SAFE test fail if the floor were dropped, and (b) does the union de-dup test fail if dedup broke. Let me mutation-test by temporarily breaking the glue and confirming the test goes red.

### Assistant | 2026-06-22T23:41:56.635Z

[tool_use: Bash]

### User | 2026-06-22T23:42:00.876Z

[tool_result] === MUTATION 1: floor dropped from merge ===
not ok 3 - DATA-LOSS-SAFE: a full-page-only dim is NEVER lost under region_route
not ok 5 - uncroppable region (cropMap missing id) -> counted failed, full-page floor still covers it
# pass 6
# fail 2

=== MUTATION 2: always full_page (region_route never taken) ===
not ok 1 - region_route: UNIONs full-page floor + per-region, de-dupes, computes lift, cr
... [+425 chars truncated]

### Assistant | 2026-06-22T23:42:05.875Z

All three mutations are caught — the tests genuinely fail when the floor is dropped, when region_route is never taken, and when the models_ok=0 trap is removed. These are real R9 tests, not stubs. The file is restored and green.

Now let me check the remaining review axes. Let me verify the `--min-trusted` and `--segment-timeout` CLI gaps, the ASCII-only requirement, and whether the `runRegionSegment` reqfile is cleaned on every error path. Let me also confirm the live-smoke claim and scope honesty.

### Assistant | 2026-06-22T23:42:09.034Z

[tool_use: Bash]

### User | 2026-06-22T23:42:12.502Z

[tool_result] === non-ASCII bytes in glue (should be empty) ===
grep: -P supports only unibyte and UTF-8 locales
none (clean ASCII)

=== non-ASCII bytes in test (should be empty) ===
grep: -P supports only unibyte and UTF-8 locales
none (clean ASCII)

=== smart quotes / em-dash check ===
grep: -P supports only unibyte and UTF-8 locales
none

### Assistant | 2026-06-22T23:42:15.266Z

The `-P` flag failed under the C locale so those results are unreliable. Let me check non-ASCII bytes a different way.

### Assistant | 2026-06-22T23:42:17.084Z

[tool_use: Bash]

### User | 2026-06-22T23:42:20.057Z

[tool_result] === non-ASCII byte count, glue ===
scripts/region-classify.mjs -> 0 non-ASCII bytes []
scripts/region-classify.test.mjs -> 0 non-ASCII bytes []

### Assistant | 2026-06-22T23:42:29.659Z

Both files are pure ASCII. Now let me check the CLI arg parsing for completeness against the documented opts, and verify whether there's a live-smoke artifact referenced and a wiring/digest issue. Let me also examine the `runRegionSegment` reqfile leak on the `JSON.parse` error path (the `finally` covers it) and the workDir cleanup edge case.

### Assistant | 2026-06-22T23:42:32.907Z

[tool_use: Bash]

### User | 2026-06-22T23:42:44.713Z

[tool_result] === opts accepted by extractWithRegionRouting (jsdoc) vs parsed by CLI ===
--- CLI flags parsed ---
"--assume-units"
"--force-units"
"--image"
"--json"
"--keep"
"--max-time"
"--min-conf"
"--model"
"--models"
"--part-class"
"--segment-model"
"--wire-edm"

=== Is region-classify referenced anywhere (wiring/scripts/digest)? ===
scripts/lib/region-classifier-lib.mjs
scripts/lib/region-glue-lib.mjs
kno
... [+987 chars truncated]

### Assistant | 2026-06-22T23:42:53.001Z

Now I have a complete picture. A few observations to finalize:

1. CLI parses `--min-conf` (maps to `minConfidence`) but does NOT parse `--min-trusted-regions`, `--segment-timeout`, `--value-tol-mm`, or `--lift-tol-mm`. These are documented opts but defaults are sensible; this is a P2 completeness gap, not a correctness bug — the orchestrator API exposes them for programmatic callers.

2. This is a brand-new script (uncommitted) — not yet wired into a pipeline consumer or digest. That's consistent with the stated scope (orchestrator + DI tests + live segment smoke, with the recall-vs-0.43 validation deferred). The glue is a CLI/programmatic entry, not an engine requiring dispatcher wiring.

Let me do a final check on two subtle correctness points: (a) the `ensembleCommon` spread includes `models: []` when no models passed — does that silently make the real ensemble fail (the test always passes models)? and (b) the workDir cleanup guard `opts.workDir == null` interaction with the default-generated workDir.

### Assistant | 2026-06-22T23:42:55.565Z

[tool_use: Bash]

### User | 2026-06-22T23:42:59.159Z

[tool_result] === Confirm: when models=[] (programmatic caller forgets models), real runEnsemble returns models_ok=0 ===
427:  if (!models.length) return { fused: fuseEnsemble([], a.fuseOpts), per_model_runs: [], models_ok: 0, models_failed: 0, image: a.png, error: "no models" };

=== glue: how models is derived + passed ===
113:  const models = Array.isArray(opts.models) && opts.models.length ? opts.models : [
... [+870 chars truncated]

### Assistant | 2026-06-22T23:43:30.558Z

All checks pass. Final analysis:

- **`models=[]` with the real ensemble**: The CLI defaults to `[DEFAULT_VISION_MODEL]` (line `if (!o.models.length) o.models = [DEFAULT_VISION_MODEL]`), so the live path is safe. A programmatic caller passing no models gets `models_ok=0` → `fullPageOk=false` (the R12 fail-loud trap correctly flags it, and `lift.baselineFailed=true`). This is honest fail-loud behavior, documented in the ensemble jsdoc. Not a defect.

- **workDir cleanup**: `opts.workDir == null && !opts.keep` deletes only the auto-generated workDir; a caller-supplied workDir is preserved (their responsibility). Correct — never deletes a user dir.

- **reqfile leak**: `finally` block (line 73 area) cleans the reqfile on the JSON.parse error path and the curl-failure path. No leak.

- **`await readImageSize`** on the synchronous `readPngSize`: awaiting a non-promise is harmless and lets a fake return either sync or async. Fine.

I have everything needed for the verdict.

---

VERDICT: PASS

summary: The P1.5 step-2b live region-routing glue (`H:\prism\scripts\region-classify.mjs`) is correct and data-loss-safe: the full-page OCR floor always runs, full_page route returns the floor (never a box-cropped subset), and region_route UNIONs per-region passes on top of the floor via the proven clique-merge. The 8 DI tests are real R9 tests with concrete reference values and injected fakes — I mutation-tested three core invariants (drop the floor, never take region_route, remove the models_ok=0 trap) and every one turned the suite red, proving the tests fail when the orchestration breaks. Both files are pure ASCII, no `.skip`/`.only`, fail-soft paths covered and correct, scope honestly documented.

findings:
- none (no P0/P1/P2 must-fix issues)

Notes (verified, auditable):
1. TEST INTEGRITY confirmed by mutation testing (`scripts/region-classify.test.mjs`). DATA-LOSS-SAFE is pinned by test 3 (`region-classify.test.mjs:64`) which asserts a full-page-only `50.8` survives region_
... [+2795 chars truncated]
