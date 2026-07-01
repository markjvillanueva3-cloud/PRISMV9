# BLACKWELL-GPU-SWAP/U-BLACKWELL-HOST-PRESET — [MAIN] [BLACKWELL-GPU-SWAP]/U-BLACKWELL-HOST-PRESET (slot:golf): fleet-reaper 'blackwell' host preset for RTX PRO 6000 96GB (qwen2.5-coder:32b prewarm, 24GB GPU floor, 60m keep-alive) + BUILTIN_PRESETS.blackwell + 3 tests (26/26 green) + nim-bridge/host-tuning 4080->Blackwell comment fixes. Pairs with live ollama v0.30.3 GPU consolidation (CPU 1.3->GPU 220 tok/s, system-level).

**Commit:** `4047a82236a2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-03T12:21:21-05:00
**Tags:** blackwell-gpu-swap, u-blackwell-host-preset, auto-distilled

## Subject
[MAIN] [BLACKWELL-GPU-SWAP]/U-BLACKWELL-HOST-PRESET (slot:golf): fleet-reaper 'blackwell' host preset for RTX PRO 6000 96GB (qwen2.5-coder:32b prewarm, 24GB GPU floor, 60m keep-alive) + BUILTIN_PRESETS.blackwell + 3 tests (26/26 green) + nim-bridge/host-tuning 4080->Blackwell comment fixes. Pairs with live ollama v0.30.3 GPU consolidation (CPU 1.3->GPU 220 tok/s, system-level).

## Body
```
[MAIN] [BLACKWELL-GPU-SWAP]/U-BLACKWELL-HOST-PRESET (slot:golf): fleet-reaper 'blackwell' host preset for RTX PRO 6000 96GB (qwen2.5-coder:32b prewarm, 24GB GPU floor, 60m keep-alive) + BUILTIN_PRESETS.blackwell + 3 tests (26/26 green) + nim-bridge/host-tuning 4080->Blackwell comment fixes. Pairs with live ollama v0.30.3 GPU consolidation (CPU 1.3->GPU 220 tok/s, system-level).
```

## Files touched (5)
- .claude/helpers/fleet-reaper-host-presets.mjs          | 14 +++++++++++++-
- .claude/helpers/fleet-reaper-host-presets.test.mjs     | 33 ++++++++++++++++++++++++++++++++-
- .claude/hooks/lib/nim-hook-bridge.mjs                  |  7 ++++---
- state/shared/dashboards/fleet-reaper-host-presets.json | 16 ++++++++--------
- 4 files changed, 57 insertions(+), 13 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4047a82236a2`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-GPU-SWAP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._