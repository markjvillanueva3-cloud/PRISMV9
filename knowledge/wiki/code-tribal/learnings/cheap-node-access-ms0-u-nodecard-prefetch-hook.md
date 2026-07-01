# CHEAP-NODE-ACCESS-MS0/U-NODECARD-PREFETCH-HOOK — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CHEAP-NODE-ACCESS-MS0]/U-NODECARD-PREFETCH-HOOK (slot:sierra): zero-tool-call node-card prefetch. UserPromptSubmit hook node-card-prefetch-inject.mjs detects system-viz node ids in a prompt (whitelisted distinctive prefixes — eng/disp/ghost/formula/wiki/skill/memory_*/tribal-tip/ms-envelope, EXCLUDES noisy fs/test/git/core/script) and SEEKS each card via the new hook-safe seekCard() (seek-only, NEVER the 193MB sidecar parse, never throws) — injecting the card + its wiki/memory doc pointers with zero tool call. Cheap-when-irrelevant: regex-only (~0ms) unless a whitelisted candidate is present; offset index verifies every candidate so a false token (fs.readFileSync) injects nothing. Wired settings.json UserPromptSubmit (timeout 3000) after master-index. Live-validated: eng.mill+ghost.galaxy.wedm inject real cards via portable-node; fs.readFileSync stays silent. 35 tests (reader 16 incl 3 seekCard, hook 10 incl budget-invariant + noisy-token-ignore + poison-index). 2-reviewer scrutiny PASS 0 P0/P1 (B P1-B2 R9 gap closed: hook-level no-bulk-parse test; P2 renderCard string-filter + 13->24MB doc). Staged: CAG cold-tier skip, prism_session:node_card action, GPU --near.

**Commit:** `158d364493c1` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T13:11:39-05:00
**Tags:** cheap-node-access-ms0, u-nodecard-prefetch-hook, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CHEAP-NODE-ACCESS-MS0]/U-NODECARD-PREFETCH-HOOK (slot:sierra): zero-tool-call node-card prefetch. UserPromptSubmit hook node-card-prefetch-inject.mjs detects system-viz node ids in a prompt (whitelisted distinctive prefixes — eng/disp/ghost/formula/wiki/skill/memory_*/tribal-tip/ms-envelope, EXCLUDES noisy fs/test/git/core/script) and SEEKS each card via the new hook-safe seekCard() (seek-only, NEVER the 193MB sidecar parse, never throws) — injecting the card + its wiki/memory doc pointers with zero tool call. Cheap-when-irrelevant: regex-only (~0ms) unless a whitelisted candidate is present; offset index verifies every candidate so a false token (fs.readFileSync) injects nothing. Wired settings.json UserPromptSubmit (timeout 3000) after master-index. Live-validated: eng.mill+ghost.galaxy.wedm inject real cards via portable-node; fs.readFileSync stays silent. 35 tests (reader 16 incl 3 seekCard, hook 10 incl budget-invariant + noisy-token-ignore + poison-index). 2-reviewer scrutiny PASS 0 P0/P1 (B P1-B2 R9 gap closed: hook-level no-bulk-parse test; P2 renderCard string-filter + 13->24MB doc). Staged: CAG cold-tier skip, prism_session:node_card action, GPU --near.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CHEAP-NODE-ACCESS-MS0]/U-NODECARD-PREFETCH-HOOK (slot:sierra): zero-tool-call node-card prefetch. UserPromptSubmit hook node-card-prefetch-inject.mjs detects system-viz node ids in a prompt (whitelisted distinctive prefixes — eng/disp/ghost/formula/wiki/skill/memory_*/tribal-tip/ms-envelope, EXCLUDES noisy fs/test/git/core/script) and SEEKS each card via the new hook-safe seekCard() (seek-only, NEVER the 193MB sidecar parse, never throws) — injecting the card + its wiki/memory doc pointers with zero tool call. Cheap-when-irrelevant: regex-only (~0ms) unless a whitelisted candidate is present; offset index verifies every candidate so a false token (fs.readFileSync) injects nothing. Wired settings.json UserPromptSubmit (timeout 3000) after master-index. Live-validated: eng.mill+ghost.galaxy.wedm inject real cards via portable-node; fs.readFileSync stays silent. 35 tests (reader 16 incl 3 seekCard, hook 10 incl budget-invariant + noisy-token-ignore + poison-index). 2-reviewer scrutiny PASS 0 P0/P1 (B P1-B2 R9 gap closed: hook-level no-bulk-parse test; P2 renderCard string-filter + 13->24MB doc). Staged: CAG cold-tier skip, prism_session:node_card action, GPU --near.
```

## Files touched (5)
- .claude/hooks/node-card-prefetch-inject.mjs      | 163 +++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/node-card-prefetch-inject.test.mjs | 155 ++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/node-card-read.mjs                   |  26 +++++++-
- scripts/lib/node-card-read.test.mjs              |  39 ++++++++++-
- 4 files changed, 380 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 158d364493c1`
- Milestone envelope: `mcp-server/data/milestones/CHEAP-NODE-ACCESS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._