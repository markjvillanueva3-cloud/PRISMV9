# AGENTIC-SUBSTRATE-BRIDGE/U-SOUL-AISTACK-DURABLE — [MAIN-FORCE] [AGENTIC-SUBSTRATE-BRIDGE]/U-SOUL-AISTACK-DURABLE (slot:bravo): make the per-galaxy soul AI-synergy block survive regen + single-source it (R7)

**Commit:** `c1b4e0a00d8b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T20:18:51-05:00
**Tags:** agentic-substrate-bridge, u-soul-aistack-durable, auto-distilled

## Subject
[MAIN-FORCE] [AGENTIC-SUBSTRATE-BRIDGE]/U-SOUL-AISTACK-DURABLE (slot:bravo): make the per-galaxy soul AI-synergy block survive regen + single-source it (R7)

## Body
```
[MAIN-FORCE] [AGENTIC-SUBSTRATE-BRIDGE]/U-SOUL-AISTACK-DURABLE (slot:bravo): make the per-galaxy soul AI-synergy block survive regen + single-source it (R7)

The /goal names "souls.md of each galaxy" as an AI-synergy surface. All 34 galaxy
SOUL.md carry an "## AI Stack (synergized)" block (reasoning-bridge PSN leg #10 +
hybrid RAG + CAG + LoRA-emit + GNN cross-substrate), but it was a manual
`AI-SYNERGY-STACK:tango-2026-06-11` block hand-appended by soul-ai-synergy-stamp.mjs
and RENDER-ORPHANED: renderGalaxySoul never emitted it, so the next
generate-galaxy-souls.mjs regen OVERWRITES each soul WITHOUT it -- stripping the AI
stack from all 34 souls fleet-wide. VERIFIED: ran the regen, it deleted the block
from 34/34; reverted.

FIX (R7 one-writer-of-record + R8 read-the-sibling):
- Single-source the block: galaxy-soul-render.mjs now exports buildAiStackBlock(galaxy)
  + AI_SYNERGY_STACK_MARKER + hasAiStackBlock(text). renderGalaxySoul emits the block
  on every regen (durable -- can't be stripped).
- soul-ai-synergy-stamp.mjs now IMPORTS the shared builder+marker (was a private dated
  marker + private blockFor that would DRIFT). Per the per-file scrutiny P1: after the
  renderer emitted a dateless marker, a stamper run on regenerated souls would have
  double-stamped fleet-wide. hasAiStackBlock matches BOTH the canonical dateless marker
  AND the legacy dated `:tango-2026-06-11` form, so neither writer double-stamps.

VALIDATED LIVE (R12): hasAiStackBlock recognizes 34/34 live (dated-marker) souls -> the
stamper SKIPS all of them (no double-stamp). A fresh renderGalaxySoul output contains the
block (regression fixed). Live SOUL.md files left UNTOUCHED (renderer/stamper NOT re-run --
avoids unrelated Identity/timestamp churn; the fix protects FUTURE regens).

TESTS: renderer 17/17 (+5: block regression-pin, galaxy-template no-leak, buildAiStackBlock,
hasAiStackBlock legacy+canonical, renderer-output round-trip) + stamper 6/6 (+1: legacy-dated-
marker skip = the double-stamp regression pin; marker assertions dateless). 2/2 per-file
reviewers ran; arm A caught the double-stamp P1 (this commit's R7 single-source is the fix).
```

## Files touched (5)
- scripts/lib/galaxy-soul-render.mjs      | 38 ++++++++++++++++++++++++++++++++++++++
- scripts/lib/galaxy-soul-render.test.mjs | 65 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- scripts/soul-ai-synergy-stamp.mjs       | 25 +++++++------------------
- scripts/soul-ai-synergy-stamp.test.mjs  | 20 ++++++++++++++++----
- 4 files changed, 125 insertions(+), 23 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c1b4e0a00d8b`
- Milestone envelope: `mcp-server/data/milestones/AGENTIC-SUBSTRATE-BRIDGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._