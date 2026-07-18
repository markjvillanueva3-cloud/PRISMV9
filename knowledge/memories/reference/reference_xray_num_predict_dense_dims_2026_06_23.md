---
name: reference_xray_num_predict_dense_dims_2026_06_23
description: MEASURED -- dense JM prints hold 2-3x more dims than the num_predict:4096 output cap (28 -> 56-86 dims at 8192). num_predict now env-tunable (PRISM_OCR_NUM_PREDICT, auto-coupled num_ctx); default stays 4096 pending hallucination-validity GT check. 2026-06-23.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.274Z
aliases: reference_xray_num_predict_dense_dims_2026_06_23
---


**xray session 2026-06-23 (slot xray, cad-fusion-live-ms0): U-XRAY-NUM-PREDICT-TUNABLE (commit af184483e2) -- follow-on to the truncation-keycut salvage.**

`salvageTruncatedJson` (U-XRAY-TRUNCATION-KEYCUT, fa6a037974) recovers the dims BEFORE a `num_predict:4096` truncation. But a measurement shows the cap was hiding far more: probing **qwen2.5vl:7b** on a dense JM punch block (`.cache/temp/tdp-vision/HDR 16...`):
- `num_predict 4096` (+salvage): **28 dims**, parse_ok=true, ms 16-24k, raw_len ~6900.
- `num_predict 8192` (num_ctx 16384): **56 and 86 dims**, parse_ok=true, ms **43-47k (well under the 180s per-call timeout)**, raw_len 13887-21461.

So 4096 was HARD-CAPPING real recall on dense prints (~28 dims fit in 4096 tokens; the print has 56-86), not merely truncating the JSON tail. The higher cap is SAFE on latency.

**R12 CAUTION -- DEFAULT KEPT AT 4096:** 86 dims on a punch block is suspiciously high and the 56<->86 run variance is a red flag -- a larger cap also gives the VLM more room to REPEAT/hallucinate. The extra dims' VALIDITY is UNVERIFIED. They need ensemble-corroboration (>=2 models agree, which the production ensemble does -- a single-model probe does NOT) and/or GT scoring (recall-up-AND-precision-held) before the default is flipped.

**Shipped (operability, default unchanged = zero regression):** `buildOllamaRequestBody` num_predict is env-raisable via **`PRISM_OCR_NUM_PREDICT`**; **num_ctx AUTO-COUPLES** to `max(8192, 2 x num_predict)` so the larger output fits (input vision-tokens + prompt + output must all fit the context, else overflow) unless `PRISM_OCR_NUM_CTX` is set. Env UNSET -> 4096 / 8192 = **byte-identical** to the prior fixed body; `opts.modelOptions` still overrides both (spread last). Reachable by the production cron via env without threading modelOptions through every layer. `probe-vision-model.mjs --num-predict N` (couples num_ctx) is the permanent diagnostic. 128/128 + 45/45 tests.

**GATED next (the default-ON decision):** run `validate-perfect-parts` on part 05850 at `PRISM_OCR_NUM_PREDICT=4096` vs `8192` and confirm the extra dims are REAL via the callout-GT score (recall up, precision held) before raising the production default. Also check GPU/num_ctx memory on the PRODUCTION model (qwen3-vl:8b-instruct, not the qwen2.5vl:7b I probed) at the doubled num_ctx. Pairs with [[reference_xray_truncation_keycut_2026_06_23]] + [[reference_xray_reading_knowledge_2026_06_23]]. Backlog [[blueprint-reading-improvement-backlog-2026-06-19]].
