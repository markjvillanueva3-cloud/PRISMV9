# BLACKWELL-DB-GEN-MS0/U-CGP-PROFILE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-DB-GEN-MS0]/U-CGP-PROFILE (slot:romeo): host-aware catalog-extraction GPU profile — Blackwell unlocks CONCURRENT vision-OCR (was baked-in 16GB overnight-only assumption)

**Commit:** `6e00a8cfb2e9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-03T13:32:58-05:00
**Tags:** blackwell-db-gen-ms0, u-cgp-profile, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-DB-GEN-MS0]/U-CGP-PROFILE (slot:romeo): host-aware catalog-extraction GPU profile — Blackwell unlocks CONCURRENT vision-OCR (was baked-in 16GB overnight-only assumption)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-DB-GEN-MS0]/U-CGP-PROFILE (slot:romeo): host-aware catalog-extraction GPU profile — Blackwell unlocks CONCURRENT vision-OCR (was baked-in 16GB overnight-only assumption)

catalog-gpu-profile.mjs: single source of truth for which VLM + worker concurrency
+ whether catalog DB extraction must wait for an idle overnight GPU window. Reads the
LIVE host GPU (nvidia-smi probe, fail-soft → env override → hostname preset → low),
NOT a baked-in 16GB RTX 4080 assumption. On the new RTX PRO 6000 Blackwell 96GB the
VL model (qwen3-vl:8b-instruct 8GB) is co-resident with the coder + embed models with
~70GB headroom, so catalog extraction runs CONCURRENT with the live fleet at x3 workers
— no overnight window. Live probe verified: 95.6GB -> blackwell tier, concurrent x3.

Wired into catalog-extraction-router.mjs (patch-sibling; existing exports unchanged):
the ollama-vision-ocr extractor's GPU gating is now host-aware, and EXTRACTION-ROUTING.json
carries the resolved gpuProfile. Reuses, does not duplicate: reaper host-preset (process
reaping) + ModelRoutingEngine home_blackwell (chat routing) own different decisions.

21 node:test cases (tier boundaries, multi-GPU nvidia-smi parse, 4-step fail-soft
precedence, field overrides, adversarial 0/neg/NaN/Infinity). Router 11/11 still green.
Knobs: PRISM_CATALOG_GPU_VRAM_GB / _VISION_MODEL / _GPU_CONCURRENCY.
```

## Files touched (4)
- scripts/lib/catalog-extraction-router.mjs |  16 ++++-
- scripts/lib/catalog-gpu-profile.mjs       | 204 +++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/catalog-gpu-profile.test.mjs  | 163 ++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 381 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till green.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6e00a8cfb2e9`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-DB-GEN-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._