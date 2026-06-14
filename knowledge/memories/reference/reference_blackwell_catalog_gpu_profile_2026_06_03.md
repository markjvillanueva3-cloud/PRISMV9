---
name: reference_blackwell_catalog_gpu_profile_2026_06_03
description: Host-aware GPU profile for catalog/DB extraction — Blackwell unlocks concurrent vision-OCR (was overnight-gated 16GB assumption). BLACKWELL-DB-GEN-MS0 (slot:romeo).
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.029Z
aliases: reference_blackwell_catalog_gpu_profile_2026_06_03
---


**BLACKWELL-DB-GEN-MS0 / U-CGP-PROFILE + U-CGP-PLAN (slot:romeo, 2026-06-03).** The GPU efficiency lever for romeo's tool-catalog / machine / material database generation.

**What:** `scripts/lib/catalog-gpu-profile.mjs` — single source of truth for which VLM + worker concurrency + whether catalog-PDF vision extraction must wait for an idle overnight GPU window. Reads the LIVE host GPU: `detectGpuTier()` fail-soft precedence = `PRISM_CATALOG_GPU_VRAM_GB` env → `nvidia-smi` probe (execFileSync, 4s, array-arg, never throws) → hostname preset (`HOST_VRAM_GB`: DESKTOP-N7MI1VB=96, MarkV=16) → conservative `low`. Tiers (high→low minVramGB 48/24/12/0): blackwell ×3 concurrent / highend ×2 concurrent / midrange ×1 overnight-gated / low ×1 overnight-gated. VL model `qwen3-vl:8b-instruct` (8.1GB) across all tiers (the proven INSTRUCT variant; bare qwen3-vl:8b is a thinking model that never emits JSON; qwen2.5vl:7b was 15.3GB and CPU-spilled on 16GB).

**Why it's the lever:** the catalog-extraction router (`scripts/lib/catalog-extraction-router.mjs`, juliett) routed scanned/complex catalog PDFs to `ollama-vision-ocr` with a baked-in 16GB-RTX-4080 note — *"needs uncontended GPU, resumable OVERNIGHT."* On the new RTX PRO 6000 Blackwell 96GB the VL model is co-resident with the coder + embed models (~70GB headroom) so extraction runs CONCURRENT with the live fleet — no overnight wait. Wired patch-sibling: router import + 2 host-aware string fixes + a `gpuProfile` field in the generated `EXTRACTION-ROUTING.json`. Existing exports unchanged; live probe verified 95.6GB→blackwell ×3.

**Quantified (`estimateExtractionPlan()`):** given a MEASURED `pagesPerMinPerWorker` (R12 refuses to fabricate it), surfaces the two real levers — concurrency (÷N) + removal of overnight-wait latency. Worked: 300 pages @2ppm → Blackwell 50min (×3, immediate) vs 16GB 630min (×1 + 8h wait) = 12.6× faster to first result.

**Knobs:** `PRISM_CATALOG_GPU_VRAM_GB` / `PRISM_CATALOG_VISION_MODEL` / `PRISM_CATALOG_GPU_CONCURRENCY`. **Tests:** 26 node:test (boundaries, multi-GPU parse, 4-step fail-soft, adversarial, plan math). 3-of-3 on core + 2-reviewer per-file on the estimator, 0 P0/P1.

**How to apply:** import `detectGpuTier`/`estimateExtractionPlan` from this module for ANY GPU-bound DB-generation extraction decision — do NOT re-bake a 16GB assumption. NOT a dup of the reaper host-preset (process reaping) or ModelRoutingEngine `home_blackwell` (chat routing) — those own different decisions.

**NEXT (follow-up, gated):** the profile is *published* (advisory) but not yet *consumed* by an extractor to drive actual worker count. The obvious consumer (`batch-ollama-vision-extract.mjs`) is xray's active blueprint-OCR file — a catalog-specific orchestrator (catalog schema/prompt, MANUFACTURER_CATALOGS worklist) should consume `detectGpuTier()` without touching xray's runner. Coordinate with xray (shares the VL runner). Related: [[reference_vendor_catalog_db_2026_05_31]], [[reference_xray_ocr_gpu_concurrency_2026_05_31]].
