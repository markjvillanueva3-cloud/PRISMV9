---
name: reference_xray_async_ocr_job_route_2026_06_25
description: "Async VLM-OCR job+poll path for POST /api/v1/drawing/extract SHIPPED -- completes Phase-1 of the blueprint-vision app-integration plan (slot xray, 2026-06-25)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.269Z
aliases: reference_xray_async_ocr_job_route_2026_06_25
---


# Async VLM-OCR job+poll route -- Phase-1 complete (slot xray, 2026-06-25)

The PDF/raster branch of `POST /api/v1/drawing/extract` no longer returns an inert 202 stub -- it
enqueues a real durable job and the client polls a result. This completes Phase-1 of
[[blueprint-vision-app-integration-plan-2026-06-23]] (the upload->extract->structured-display core loop)
for BOTH producer paths (DXF synchronous + PDF/raster async).

## Commits (slot xray, branch cad-fusion-live-ms0, [MAIN-FORCE])
- `5282a059e1` U-XRAY-EXTRACTION-JOB-ENGINE -- the durable substrate (store + runner), foundation only.
- `7db54c683c` U-XRAY-DRAWING-EXTRACT-ROUTE-ASYNC -- wires the engine into the route + poll endpoint + real OCR exec (removes the orphan; R15).
- `d350e3818a` U-XRAY-DRAWING-EXTRACT-POLL-PRUNE -- closes the 2 P2 gaps (poll-handler test + scheduled prune; R16 don't one-shot).

## The chain (no orphan, R15 verified by both scrutiny arms)
`POST /api/v1/drawing/extract` (PDF/raster) -> `extractDrawingChain(callTool, body, jobDeps)` path-confines
+ `jobDeps.store.create` + `jobDeps.enqueue` (fire-and-forget) -> `runExtractionJob(jobId, {store, ocr, callTool, nowIso})`
-> `ocr` = `ocrViaSubprocess` spawns `scripts/ocr-extract-one.mjs` -> rasterize PDF page via `scripts/lib/pdf-to-png.py`
+ SHARED `runEnsembleOverImage` core -> slim `{fused, models_ok, error}` -> runner calls
`prism_cad:blueprint_extract_and_route {fused}` (cadDispatcher accepts it) -> `markDone(annotateEmptyExtraction(payload))`.
`GET /api/v1/drawing/extract/job/:jobId` -> `pollJobResponse(store, jobId)` -> `{status, result?, error?}`.

Files: `mcp-server/src/engines/blueprint-vision/extractionJob{Store,Runner}.ts` · `mcp-server/src/routes/drawing.ts`
(`extractDrawingChain` + `pollJobResponse` + `ocrViaSubprocess` + `createDrawingRouter`) · `scripts/ocr-extract-one.mjs`.
60 tests: 16 route (5 async + 7 poll) + 13 runner + 15 store + 16 exec-cores.

## Lessons (so the next chat doesn't re-learn them)
- **Path-confine the ASYNC branch too, not just the sync .dxf branch.** The OCR exec fs-reads the
  caller-supplied path out-of-process, so an out-of-root `.pdf` is the SAME arbitrary-file-read hole the
  `.dxf` guard closed. Confine with `isWithinAllowedRoot(effPath, drawingExtractAllowRoots())` -> 403
  BEFORE create/enqueue. (Both scrutiny arms verified; sibling of [[reference_xray_drawing_extract_real_dxf_2026_06_24]].)
- **A thin wrapper reuses the shared core -- do NOT dup the CLI.** `ocr-extract-one.mjs` adds only the
  PDF->PNG raster step and reuses `runEnsembleOverImage` + `VISION_FAMILY_LEADERS` + `isThinkingTrap`;
  `vision-ensemble-extract.mjs` stays the human-facing scoring/synthetic CLI (R8/dedup).
- **R9: a cap test must be able to FAIL.** A `.slice(0,3)` against a 3-entry roster makes `models.length <= 3`
  vacuous (asserts `0 <= 3`). Fix: make the leaders list + cap INJECTABLE (`chooseModels(explicit, available, leaders, maxModels)`)
  so the cap is exercised with a 5-leader injected set -> deleting the cap makes the test fail.
- **Unauthenticated surface error hygiene:** keep subprocess stderr / python paths server-side
  (`console.error`), surface a generic client error -- matches the route's sync-path 422 hygiene.
- **Bound tmp growth WITHOUT a background timer (no R14 orphan):** prune-on-enqueue (terminal jobs older
  than a >=60s-clamped TTL); a fresh queued job is younger than the TTL so it is never swept.
- **Shared-tree git-lock contention (26-chat fleet):** a 0-byte `.git/index.lock` sitting >1min while
  commits fail is a STALE lock from a reaped peer (a live commit holds it sub-second). `rm -f .git/index.lock`
  then retry. The `git-add-lane-guard` reads the COMMAND STRING for `[MAIN-FORCE]` -- so `git add && git commit -m "[MAIN-FORCE]..."`
  must be ONE chained command (a bare `git add` lacks the token and is blocked). See [[feedback_conflict_fork_rule]].

## R15-VALIDATE on LIVE data (2026-06-25, real numbers -- not mocks)
Ran the new exec on a real JM electrode print:
`node scripts/ocr-extract-one.mjs --source "H:/PRISM/JM DIE/CNC LATHE/ELECTRODE/CONTINENTAL MID. ELECTR/TT2000_206H_It-068040A_source.pdf" --assume-units in`
-> `exit 0, ok:true, models_ok:2, models_failed:1, page:0`. Stack was live (:3100 healthy uptime 49min;
Ollama pulled qwen3-vl:8b-instruct + qwen2.5vl:7b + qwen3-vl:32b).
- Auto-selected 3 leaders (qwen3-vl:8b-instruct, qwen2.5vl:7b, llama3.2-vision:11b); **llama FAILED yet the
  ensemble still produced a result from the 2 survivors** -- survivor-fusion resilience proven on real data.
- 40 dims clustered; **2 corroborated (>=2 models agree)** = diameters 31.344mm + 31.351mm @ conf 0.99;
  **38 singleton hallucination-candidates + 110 ambiguous pairs** -> the consensus gate honestly surfaces
  low inter-model agreement for operator review instead of trusting a single model (galaxy rail validated).
- Slim tuple shape `{ok, fused:{dimensions,summary}, models_ok, models_failed, page, models}` is well-formed
  and is exactly what extractionJobRunner reads.
- **Real OCR-accuracy signal:** 2/40 corroboration is LOW on this electrode print -- the 8b/7b ensemble
  struggles on it; this is the target the closed-loop training cron improves. qwen3-vl:32b (stronger, resident)
  is CORRECTLY excluded by isThinkingTrap (no -instruct variant pulled) -- a future qwen3-vl:32b-instruct pull
  would lift accuracy. This is the concrete "keep improving OCR" lever.
- **NOT yet validated via HTTP:** the running :3100 server predates these commits (old dist), so the full
  POST->202->poll->done round-trip needs a shared-server REBUILD+restart -- a FLEET-AFFECTING action (25 peer
  chats depend on :3100), so it is operator/coordination-gated, NOT a unilateral xray action. The exec
  (the heavy component) IS live-validated; the wiring is unit-test-validated (60 green).

## BUG found BY the live validation (7bcd73ab95) -- the inert hallucination flag
The R15-VALIDATE run did more than confirm the chain -- it surfaced a real confidence-gating defect that
ALL 60 mocked tests missed: `normalizeFusedToContract` (BlueprintExtractionContract.ts) set
`needs_confirm = confidence < floor` ONLY. A single-model dim flagged `hallucination_candidate:true` has a
DEFAULT self-confidence (~0.9, NOT corroboration) >= the 0.70 floor, so it passed as `needs_confirm:false`.
The router's operator-review count reads `needs_confirm` only (never `hallucination_candidate`), so the
ensemble's entire low-trust signal was COLLECTED BUT INERT -- 38/40 single-model dims on the live print
passed as "confirmed". Fix: `needs_confirm = confidence < floor || hallucination_candidate` (dims + callouts);
monotonic/safe-direction; geometry normalizer inert (hallucination=false there). Router verified to ANNOTATE
not REFUSE, so it is a safety improvement, not a pipeline break. 4 new R9 locks + 1 corrected test (the old
one conflated floor+halluc on one fixture dim). **Lesson: a flag is only as good as the gate that READS it
-- mocked tests with synthetic fixtures never had a halluc-candidate ABOVE the floor, so the inert-flag gap
was invisible until LIVE data (38/40 single-model) exposed it. R15-VALIDATE on real data is what found it.**

## Remaining (next chat)
Backend Phase-1 is 100% live; the gate is now quebec's React surface (upload form -> POST -> poll the job
-> render contract + per-field confidence badges + the confirm-gated consumer plan). Logged P2: tighten the
"durable" doc wording (tmp default is process- not reboot-durable; `PRISM_EXTRACTION_JOBS_DIR` for persistence).
Next backend phases per the plan: Phase-2 blueprint->quote autopopulation (charlie), Phase-3 auto-redaction
surface (the redact-lib already shipped), Phase-5 print->program (kilo).
