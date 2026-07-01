---
name: reference_html_help_tribal_lane_2026_06_26
description: "Built the CAD/CAM software help-HTML -> tribal /learn lane (slot:india 2026-06-26): Fusion/hyperCAD-S/hyperMILL/Mastercam HTML help systems were 100% uningested (PDF drain can't reach them). 3-layer dedup (English-only + newest-version-dir + topic-identity). Sibling of the PDF + web + video lanes."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.613Z
aliases: reference_html_help_tribal_lane_2026_06_26
---


# CAD/CAM software help-HTML /learn lane (2026-06-26, slot:india)

Operator: "/learn pipeline on all cad and engineering related sources in H:\PRISM\resources ...
include videos and OTHER reputable sources ... don't duplicate knowledge, only add NEW."
The PDF/web/video lanes already existed (zulu's `drain-resources-tribal.mjs` PDF drain was RUNNING).
THE GAP I found: the software the operator NAMED (Fusion 360, hyperCAD-S, hyperMILL, Mastercam)
ships its real procedural CAD/CAM knowledge as HTML HELP SYSTEMS that a PDF pipeline structurally
cannot reach. Census: ~4,245 content-rich (>=1200 stripped chars) help docs, ZERO ingested.

## What shipped ([CAD-LEARNING-AI]/U-HTML-HELP-TRIBAL-LANE, cad-fusion-live-ms0)
- `scripts/drain-html-help-tribal.mjs` (+ `.test.mjs`, 10 tests): walk software help dirs ->
  `readHelpDocRow` (REUSE `stripHtmlToText` from drain-web-sources-tribal.mjs, latin1 read for
  windows-1252 help files, MIN_RICH_CHARS=1200 gate) -> `rowToNodes` (REUSE chunk-pdf-text-to-nodes.mjs)
  into `state/shared/pdf-tribal-tips/html-help-nodes/` -> `generate-pdf-tribal-tips-hermes.mjs`
  (source-agnostic via `PRISM_TRIBAL_SOURCE_DIR` + `PRISM_TRIBAL_OUT`) -> `html-help-tips.jsonl`.
  Run-lock (dead-PID-aware) + per-doc resumable cursor + SIGTERM release + Ollama-only ($0 Claude).
- `embed-pdf-tribal-tips-into-index.mjs` edit (+ `embed-html-help-tips.test.mjs`, 2 tests):
  new `collectHtmlHelpTips` reader (id namespace `tip:html-<sha8>-<i>`, corpus `cad-cam-html-help`)
  wired into `collectAllTips` + added to the DEFAULT sources, so the already-armed "PRISM Tribal Embed"
  task (runs the embedder with NO args) auto-embeds html tips with ZERO new wiring (R15 build-once).
- `scripts/install-html-help-tribal-drain-task.ps1`: clones the resources-PDF drain installer ->
  "PRISM HTML Help Tribal Drain" task (every 20 min, --max-docs 12 --no-embed, user-level, +3min phase
  offset from the PDF drain so they don't both spike Ollama). REGISTERED + Ready.

## THE "ONLY NEW KNOWLEDGE" DEDUP (3 layers — the operator's hard requirement)
1. **LANGUAGE** (`isForeignLanguagePath`): keep English (en/en-US/no-locale) only. These help trees
   ship the SAME topic in de-DE/fr-FR/ja-JP/zh-CN/... -- ingesting all = 8x the same knowledge in
   languages the tribal store + reranker don't serve.
2. **VERSION-DIR** (`pruneStaleVersionDirs`): OPEN MIND ships PARALLEL `<product>/31.0/` AND
   `<product>/33.0/` trees with OPAQUE UUID filenames -- topic-identity CANNOT collapse them (different
   UUIDs), and the embedder's per-tip hash-skip won't either (different source paths -> different ids).
   The directory STRUCTURE is the dedup hinge: for each parent dir, keep ONLY the max version dir; drop
   any doc whose path passes through a non-max version sibling. Collapsed hypermill 4899 -> 2576.
   Single-version corpora (Mastercam mcamX8) are untouched. THIS was the key insight.
3. **TOPIC-IDENTITY** (`dedupHelpDocs`): within a software root, strip version+locale segments to a
   topic id, keep the newest English copy per topic.
   Net: 5404 raw -> 3081 deduped candidates. Plus the generator chunk-cursor + embedder hash-skip
   make a re-run skip-everything ("only new" proven: re-embed -> embedded=0 skipped=14).

## VALIDATED THROUGH THE CONSUMER (R15 — the lesson from the web lane)
Real E2E, not "looks fine": Mastercam help -> real tips ("Dock the backplot window on a second monitor",
"Use `force: true` to output a value regardless of the last", "Compare `movement` with MOVE_CUTTING/
MOVE_RAPID"). Embed delta PROVEN: tribal index 116,918 -> 116,940 (22 `tip:html-*` tips live in shard-003).
Re-embed skipped all (only-new holds). Full embedder suite 15/15 (incl papa's catalog test) + my 12 tests.

## Status + OPEN
- LANE works end-to-end + autonomous task armed. hyperMILL (2237 rich) + Mastercam (82 rich) draining.
- Mastercam help is ~18% rich (rest = thin VBScript/UI stubs, correctly filtered). hyperMILL is ~46% rich.
- Fusion360 resources dir is mostly thin post-processor config snippets (correctly rejected); the rich
  Fusion knowledge is in PDFs (already in the PDF drain) + would need the online Autodesk help (web lane).
- NEXT: let the task drain the ~3081 corpus over many ticks; the embed task lands them. Consider a
  `hyperCAD-S`-specific pass (the operator named "hyperCAD" — it's under OPEN MIND/hyperCAD-S, included).

## Lesson (generalizable)
When the operator names specific software, find WHERE that software's knowledge actually lives — CAD/CAM
apps ship procedural knowledge as HTML help systems, NOT just PDFs. A PDF-only ingestion pipeline silently
misses the largest, most on-target corpus. And version/locale duplication in help trees needs a
DIRECTORY-STRUCTURE dedup (UUID filenames defeat content/topic dedup). -> [[feedback_wire_test_validate_all_galaxies]]
