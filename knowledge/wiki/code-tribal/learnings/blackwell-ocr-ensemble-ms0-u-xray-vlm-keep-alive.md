# BLACKWELL-OCR-ENSEMBLE-MS0/U-XRAY-VLM-KEEP-ALIVE — [MAIN-FORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-VLM-KEEP-ALIVE (slot:xray): pin VLMs GPU-resident during corpus runs to kill cold-reload eviction. Calibration crawled ~4x (17->67s/seed) + '1 model survived' timeouts because ensemble Ollama calls set no keep_alive -> evicted+cold-reloaded each call (/api/ps empty, GPU 3GB mid-calib). Fix: buildOllamaRequestBody keep_alive = opts.keepAlive ?? env PRISM_OLLAMA_VISION_KEEP_ALIVE (undefined-when-unset -> dropped on serialize -> other callers unchanged); wrapper sets =15m so nightly cold-start stays warm. 3 new tests, 64/64 pass. VLMs lean ~7-10GB on the 96GB Blackwell. Live: WEAK-LABEL running, cursor 32->35+.

**Commit:** `670329d41ec2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T15:53:27-05:00
**Tags:** blackwell-ocr-ensemble-ms0, u-xray-vlm-keep-alive, auto-distilled

## Subject
[MAIN-FORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-VLM-KEEP-ALIVE (slot:xray): pin VLMs GPU-resident during corpus runs to kill cold-reload eviction. Calibration crawled ~4x (17->67s/seed) + '1 model survived' timeouts because ensemble Ollama calls set no keep_alive -> evicted+cold-reloaded each call (/api/ps empty, GPU 3GB mid-calib). Fix: buildOllamaRequestBody keep_alive = opts.keepAlive ?? env PRISM_OLLAMA_VISION_KEEP_ALIVE (undefined-when-unset -> dropped on serialize -> other callers unchanged); wrapper sets =15m so nightly cold-start stays warm. 3 new tests, 64/64 pass. VLMs lean ~7-10GB on the 96GB Blackwell. Live: WEAK-LABEL running, cursor 32->35+.

## Body
```
[MAIN-FORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-VLM-KEEP-ALIVE (slot:xray): pin VLMs GPU-resident during corpus runs to kill cold-reload eviction. Calibration crawled ~4x (17->67s/seed) + '1 model survived' timeouts because ensemble Ollama calls set no keep_alive -> evicted+cold-reloaded each call (/api/ps empty, GPU 3GB mid-calib). Fix: buildOllamaRequestBody keep_alive = opts.keepAlive ?? env PRISM_OLLAMA_VISION_KEEP_ALIVE (undefined-when-unset -> dropped on serialize -> other callers unchanged); wrapper sets =15m so nightly cold-start stays warm. 3 new tests, 64/64 pass. VLMs lean ~7-10GB on the 96GB Blackwell. Live: WEAK-LABEL running, cursor 32->35+.
```

## Files touched (2)
- scripts/run-ocr-training-loop-overnight.ps1 | 6 ++++++
- 1 file changed, 6 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 670329d41ec2`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-OCR-ENSEMBLE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._