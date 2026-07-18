---
name: reference_xray_reading_knowledge_2026_06_23
description: U-XRAY-READING-KNOWLEDGE -- the bounded curated knowledge-injection CHANNEL that ties tribal + ASME Y14.5 reading wisdom into the live VLM extraction prompt (opt-in); + the honest truncation-regime validation finding (2026-06-23).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.277Z
aliases: reference_xray_reading_knowledge_2026_06_23
---


**xray session 2026-06-23 (slot xray, cad-fusion-live-ms0): U-XRAY-READING-KNOWLEDGE (commit b8ef51c9fe) -- tie PRISM knowledge substrates INTO the live blueprint VLM prompt.**

Operator ask: "improve blueprint reading by tying in all gd&t, engineering courses, resources, wikis and tribal knowledge." 6-substrate discovery (sonnet-fanout blocked by the agent-fanout-gate -> ran direct reads) mapped the reality:
- The live VLM prompt is `buildVisionPrompt(partClass, opts)` in `scripts/lib/ollama-vision-extract-lib.mjs` -- ALREADY parameterized (`opts.wireEdm` appends a domain block), and it bakes in the FCF read-order + form-vs-datum + stepped-bore + lead-in-chamfer + anti-hallucination rules. But the BROADER tribal callout-reading corpus, the GD&T symbol/convention reference, and courses do NOT reach the reader.
- `BlueprintExtractionRAGEngine` is DORMANT w.r.t. the live prompt: only reporting/training-driver scripts reference it; NO live extraction script (ollama-vision-extract-lib / blueprint-ocr-training-loop / vision-ensemble-fuse) invokes it or injects its retrieved sources into the prompt. The RAG centerpiece is callable-standalone-only.
- The GD&T corpus drop-zone `resources/blueprint-gdt-corpus/` is EMPTY (README only) -- operator-gated Y14.5 PDF drop pending.

**Keystone built (R13 -- the channel every substrate feeds):** `scripts/lib/blueprint-reading-knowledge.mjs` (pure) -- `READING_GUIDANCE` curated bundle distilled from the REAL tribal corpus (`knowledge/wiki/code-tribal/blueprint-dim-*` each has an "## Extraction guidance" line + `blueprint-ocr-operator-wisdom.md`) + ASME Y14.5-2018, provenance-tagged per entry. `selectReadingGuidanceEntries` / `buildReadingGuidanceBlock` are HARD-bounded (maxItems 8, maxChars 1100) because prompt BLOAT is the #1 regression risk (this file's history: a prompt instruction was PROVEN IGNORED by qwen2.5-VL). Entries are purely ADDITIVE (runout single-vs-crossed-arrow misread, profile circled-U, MMC/LMC/RFS+circled-F, per-callout diameter/linear/radius/thread/surface/material patterns, customer decimal-comma/house-abbrev variance) -- none repeat a base-prompt rule. No-targetKinds (general print) => full bounded callout guidance; explicit targetKinds => filtered.

**Wired (opt-in, default OFF, byte-identical when off -- both scrutiny arms verified zero-regression on all 4 prompt paths):** `buildVisionPrompt` gains `opts.readingGuidance` (append, mirrors wireEdm); `ocrImageWithModelAsync` + `runEnsembleOverImage` thread `injectReadingGuidance` through the LIVE ensemble call; `probe-vision-model.mjs` gains `--reading-guidance`. Tests 14 (lib) + 45 (ensemble, 2 new R9 threading tests prove the block reaches EVERY model's request body) + 121 (extract-lib no-regression). Per-file 2-arm PASS (closed 2 P2: Y14.5-2018 circled-F; per-callout entries fire on the live general path).

**LIVE VALIDATION -- INCONCLUSIVE, default-ON correctly NOT set (R12):** probed qwen2.5vl:7b with/without guidance on 4 dense JM punch-block prints (`.cache/temp/tdp-vision/`). The full-page BASELINE itself is in the `num_predict:4096` TRUNCATION-FAILURE regime (parse_ok=false 3/3 across 3 prints, raw_len ~7000 near the cap) -- so the comparison is confounded by truncation, NOT the guidance. Guidance adds ~400 chars output (marginal extra truncation risk on near-cap prints); on one run it recovered 21 dims where baseline got 0. The earlier single 27-dim baseline read was a lucky run (high variance).

**Gated next (default-ON decision):** enable guidance on the REGION-ROUTE crop path (smaller crops => shorter output => NOT truncation-bound -- the right place), or co-deliver a num_predict bump, THEN score via `validate-perfect-parts` on part 05850 (the one scoreable callout-GT part). Follow-ons feed richer sources into the SAME channel: live tribal retrieval, the academy blueprint-reading course (`academy-course-0c-blueprint-reading`, surfaced by the graph), the operator-gated Y14.5 corpus once dropped, and the dormant `BlueprintExtractionRAGEngine`. Pairs with [[reference_xray_app_redact_wire_2026_06_23]] (prior session) + the backlog [[blueprint-reading-improvement-backlog-2026-06-19]]. Lesson: a bounded CURATED bundle beats a raw-corpus dump into a VLM prompt (bloat hurts recall); validate reading changes against a NON-truncation-regime baseline or the signal is confounded.
