# OCR yield A/B experiment — 2026-06-10 (xray d00dc7c4)

**Question:** does adding a 3rd vision model (llama3.2-vision:11b) raise the OCR trainset yield by unlocking an f=0.67 (2-of-3 agree) trainable bucket?

**Method:** 2-model vs 3-model calibration (16 synthetic perfect-GT prints each) + a per-model dropout diagnostic (diag-ensemble.mjs).

**Result — hypothesis REFUTED:**
- llama3.2-vision:11b returned `empty response` on 32/32 prints (0 survivors). Ensemble never reached 3 voices; no f=0.67 bucket formed.
- The production 2-model pin is empirically correct ("other families fail dense dims" validated; root cause = empty response).

**Real lever found:** qwen2.5vl:7b drops out ~30-37% of prints via runaway malformed-JSON generation (480-line/73s blob hits num_predict:4096 mid-structure -> parse-fail). qwen3-vl:8b-instruct is the reliable anchor.

**Calibration (2-model, n=51, reliable):** f=0.5 -> 0.51 (bronze, not trainable); f=1.0 -> 0.87 (gold, trainable).

**Fix (next ROI unit):** add Ollama constrained JSON decoding (format:"json") to the vision extraction call (ollama-vision-extract-lib.mjs:408 has no `format`). Recovers ~30% dropped prints + cuts latency. Needs A/B vs anchor + test + 3-of-3 (shared OCR pipeline = safety-relevant).

Full record: memory reference_xray_ocr_yield_mechanics_2026_06_10.
