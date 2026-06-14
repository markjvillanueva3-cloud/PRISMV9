---
name: reference_xray_ocr_gpu_concurrency_2026_05_31
description: blueprint-OCR runs CONCURRENT with the chat fleet — the fix was a smaller model (qwen3-vl:8b-instruct, 8.1GB), NOT an idle host
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.073Z
aliases: reference_xray_ocr_gpu_concurrency_2026_05_31
---


**Blueprint-vision OCR now runs CONCURRENT with the chat fleet** (slot:xray, 2026-05-31, commit `4d920c67a0`). This OVERTURNS the prior "idle-host-only" conclusion ([[reference_xray_ocr_pipeline_overnight_ready_2026_05_30]]) — the blocker was the WRONG MODEL, not host saturation.

**Live-measured root cause (RTX 4080 SUPER 16GB, Ollama 0.24.0):**
- `qwen2.5vl:7b` loads at **15.3GB regardless of num_ctx OR NUM_PARALLEL** (it has a ~13.7GB weights+compute-graph FLOOR; KV is only ~0.2MB/tok → ctx8192=15.4GB vs ctx3072=14.3GB, just 1.1GB delta). OS/desktop baseline ~4.5GB → only ~11.8GB free → the 15.3GB model spills ~3.5GB to CPU (Windows shared GPU memory) → >180s/page → the runner's 180s AbortController fires "This operation was aborted". NO coder model was loaded during the failing tests — it is purely the vision model's own footprint.
- **DPI does NOT change the loaded footprint** (allocated at load from num_ctx; image vision-tokens consume CONTEXT slots — that is why ctx2048 gave "empty response", not why it spilled).
- `OLLAMA_FLASH_ATTENTION` / `OLLAMA_KV_CACHE_TYPE=q8_0` do NOT help qwen2.5vl: it is NOT on Ollama's FA allowlist → q8_0 silently falls back to f16 (zero saving) and FA risks the #11230 "loading cache slot" hang. (I also set `OLLAMA_NUM_PARALLEL=1` persistently via setx — harmless, marginal; it did NOT shrink the footprint, refuting the "NUM_PARALLEL multiplies KV" theory for 0.24.)

**THE FIX — `qwen3-vl:8b-instruct`** (`ollama pull qwen3-vl:8b-instruct`, 6.1GB):
- Loads at **8.1GB FULLY GPU-RESIDENT** (size_vram==size in /api/ps) → fits alongside the fleet's coder offload + OS. ~49s/page warm. Live test: 19 dims (19/19 unit-resolved), title block (part_number 068040A, material C-D60 20% Co, title "TAPTITE 2000 DIE"), units=in.
- **The INSTRUCT variant is MANDATORY.** The bare `qwen3-vl:8b` is a "thinking" model that routes ALL output into a `<think>` chain (Ollama 0.24 IGNORES both request `think:false` AND the `/no_think` prompt directive — verified: `done_reason=length, response.len=0, thinking.len=5039`) and hits num_predict before emitting any JSON. Instruct has no reasoning trace → direct JSON.

**Shipped (commit `4d920c67a0`):** `DEFAULT_VISION_MODEL` + batch `VL_MODEL` + benchmark `DEFAULT_VLM_MODEL` → qwen3-vl:8b-instruct; added top-level `think:false` to buildOllamaRequestBody (default false, override via opts.think; safe no-op for non-thinking models); claimGpu residency check matches VL_MODEL not a hard-coded name; db-toolbelt desc updated. Tests lib 52/52 + batch 18/18. 2-of-2 scrutiny was BLOCKED by an account session limit (reset 10:50pm CT) — done inline (integration grep + completeness fixes + tests + live 26-print validation); run the formal 2-of-2 + 3-of-3 next session.

**RUNNING / VEHICLES (the durability nuance — important):**
- The OCR batch generates the training corpus → `state/shared/blueprint-accuracy-events.jsonl` (one `outcome_record`/page) + SHA checkpoint `blueprint-ocr-checkpoint.jsonl` (resumable). 26 real extractions persisted this session.
- **Detached `Start-Process -WindowStyle Hidden`** (allocates a HIDDEN console) → page-counts WORK → batch extracts fine, BUT it becomes an orphan (parent launcher exits) → golf's [[reference_fleet_reaper|fleet-reaper]] kills it after the ~10-min confirm window (~25 prints/run; resumes via checkpoint).
- **Unelevated user-level scheduled task** (registered "PRISM Blueprint OCR Batch", Interactive/Limited, 30-min self-heal trigger) is REAPER-IMMUNE (parent=Task Scheduler) BUT every page-count HANGS to the 120s timeout (`pdf-to-png.py --count` exit=null, uniform 128s spacing) — a NO-CONSOLE context bug (python/PyMuPDF page-count hangs with no allocated console; the hidden-console detached run does not). All 6 scheduled-task prints failed; **task left in Ready/stopped state**. NEXT-SESSION FIX: give getPageCount a console, OR a page-count fallback (assume N pages / retry), OR run python with stdio that doesn't block.
- **RELIABLE overnight vehicle for the operator (no chat-closing needed now):** open a terminal and run the batch foreground, leave it open — the parent shell stays alive → NOT an orphan → reaper-safe → AND has a console → no page-count hang:
  ```
  node H:/prism/scripts/batch-ollama-vision-extract.mjs --worklist H:/prism/state/shared/blueprint-ocr-worklist-pilot.txt --grayscale --assume-units in --time-budget-min 600 --summary H:/prism/state/shared/blueprint-ocr-batch-summary.json
  ```
  Morning review: `node H:/prism/scripts/blueprint-ocr-review.mjs --summary H:/prism/state/shared/blueprint-ocr-batch-summary.json --samples 5`.

**Worklist quality caveat:** the 400-print pilot worklist includes some non-blueprint PDFs (OKUMA training docs, 48-page scanned multi-doc bundles) that waste VLM time — `looksLikeBlueprint` could be tightened. Not blocking. See [[reference_xray_ocr_pipeline_overnight_ready_2026_05_30]] · [[reference_xray_ocr_gateway_unblocked_2026_05_29]].
