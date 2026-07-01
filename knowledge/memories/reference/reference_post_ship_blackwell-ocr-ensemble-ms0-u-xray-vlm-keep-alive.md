---
name: reference_post_ship_blackwell-ocr-ensemble-ms0-u-xray-vlm-keep-alive
description: Auto-distilled learnings from shipping BLACKWELL-OCR-ENSEMBLE-MS0/U-XRAY-VLM-KEEP-ALIVE (commit 670329d41). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.766Z
aliases: reference_post_ship_blackwell-ocr-ensemble-ms0-u-xray-vlm-keep-alive
---


# BLACKWELL-OCR-ENSEMBLE-MS0/U-XRAY-VLM-KEEP-ALIVE

[MAIN-FORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-VLM-KEEP-ALIVE (slot:xray): pin VLMs GPU-resident during corpus runs to kill cold-reload eviction. Calibration crawled ~4x (17->67s/seed) + '1 model survived' timeouts because ensemble Ollama calls set no keep_alive -> evicted+cold-reloaded each call (/api/ps empty, GPU 3GB mid-calib). Fix: buildOllamaRequestBody keep_alive = opts.keepAlive ?? env PRISM_OLLAMA_VISION_KEEP_ALIVE (undefined-when-unset -> dropped on serialize -> other callers unchanged); wrapper sets =15m so nightly cold-start stays warm. 3 new tests, 64/64 pass. VLMs lean ~7-10GB on the 96GB Blackwell. Live: WEAK-LABEL running, cursor 32->35+.

**Shipped:** 2026-06-16T15:53:27-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[blackwell-ocr-ensemble-ms0-u-xray-vlm-keep-alive]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._