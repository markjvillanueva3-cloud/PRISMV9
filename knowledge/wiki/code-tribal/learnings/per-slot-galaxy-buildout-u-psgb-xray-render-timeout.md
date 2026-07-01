# PER-SLOT-GALAXY-BUILDOUT/U-PSGB-XRAY-RENDER-TIMEOUT — [MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-RENDER-TIMEOUT (slot:xray): bump PDF render/count spawn timeout 60s->120s (configurable) — live pilots showed the python subprocess starves >60s under full-fleet host saturation (CPU+IO), not just GPU. PRISM_RENDER_TIMEOUT_MS override; batch runner #6 will need it.

**Commit:** `ff51fadd78a2` · **By:** markjvillanueva3-cloud · **At:** 2026-05-30T20:40:26-05:00
**Tags:** per-slot-galaxy-buildout, u-psgb-xray-render-timeout, auto-distilled

## Subject
[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-RENDER-TIMEOUT (slot:xray): bump PDF render/count spawn timeout 60s->120s (configurable) — live pilots showed the python subprocess starves >60s under full-fleet host saturation (CPU+IO), not just GPU. PRISM_RENDER_TIMEOUT_MS override; batch runner #6 will need it.

## Body
```
[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-RENDER-TIMEOUT (slot:xray): bump PDF render/count spawn timeout 60s->120s (configurable) — live pilots showed the python subprocess starves >60s under full-fleet host saturation (CPU+IO), not just GPU. PRISM_RENDER_TIMEOUT_MS override; batch runner #6 will need it.
```

## Files touched (2)
- scripts/run-ollama-vision-extract.mjs | 8 ++++++--
- 1 file changed, 6 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ff51fadd78a2`
- Milestone envelope: `mcp-server/data/milestones/PER-SLOT-GALAXY-BUILDOUT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._