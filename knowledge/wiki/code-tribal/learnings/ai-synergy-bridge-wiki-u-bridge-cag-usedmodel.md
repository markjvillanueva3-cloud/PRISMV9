# AI-SYNERGY-BRIDGE-WIKI/U-BRIDGE-CAG-USEDMODEL — [MAIN-FORCE] [AI-SYNERGY-BRIDGE-WIKI]/U-BRIDGE-CAG-USEDMODEL (slot:bravo): CAG hit reports actual producer model (usedModel), not requested -- R12 transparency

**Commit:** `30b776574323` · **By:** markjvillanueva3-cloud · **At:** 2026-06-13T16:39:14-05:00
**Tags:** ai-synergy-bridge-wiki, u-bridge-cag-usedmodel, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYNERGY-BRIDGE-WIKI]/U-BRIDGE-CAG-USEDMODEL (slot:bravo): CAG hit reports actual producer model (usedModel), not requested -- R12 transparency

## Body
```
[MAIN-FORCE] [AI-SYNERGY-BRIDGE-WIKI]/U-BRIDGE-CAG-USEDMODEL (slot:bravo): CAG hit reports actual producer model (usedModel), not requested -- R12 transparency

The galaxy-reasoning-bridge (PSN leg #10, all 34 galaxies) fallback ladder can descend
from the requested model to a smaller installed one. The live path already reports
model: usedModel, but a CAG cache HIT reported the REQUESTED model -- a cached fallback
answer lied about its producer (flagged by 3-of-3 arm C P2).

Fix: persist usedModel on write; report hit.usedModel || model on hit (legacy entries
fall back to requested -- backward-compat). Now consistent with the live fallback path.

Tests 43/43 (new R9 test FAILS on revert, verified). Live: bogus-top:999b -> descended
to qwen2.5-coder:1.5b -> entry persisted usedModel -> hit reports the producer.
```

## Files touched (3)
- scripts/lib/galaxy-reasoning-bridge.mjs      |  9 +++++++--
- scripts/lib/galaxy-reasoning-bridge.test.mjs | 32 ++++++++++++++++++++++++++++++++
- 2 files changed, 39 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 30b776574323`
- Milestone envelope: `mcp-server/data/milestones/AI-SYNERGY-BRIDGE-WIKI.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._