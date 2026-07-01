---
name: reference_post_ship_cheap-node-access-ms0-u-nodecard-prefetch-hook
description: Auto-distilled learnings from shipping CHEAP-NODE-ACCESS-MS0/U-NODECARD-PREFETCH-HOOK (commit 158d36449). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.804Z
aliases: reference_post_ship_cheap-node-access-ms0-u-nodecard-prefetch-hook
---


# CHEAP-NODE-ACCESS-MS0/U-NODECARD-PREFETCH-HOOK

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CHEAP-NODE-ACCESS-MS0]/U-NODECARD-PREFETCH-HOOK (slot:sierra): zero-tool-call node-card prefetch. UserPromptSubmit hook node-card-prefetch-inject.mjs detects system-viz node ids in a prompt (whitelisted distinctive prefixes — eng/disp/ghost/formula/wiki/skill/memory_*/tribal-tip/ms-envelope, EXCLUDES noisy fs/test/git/core/script) and SEEKS each card via the new hook-safe seekCard() (seek-only, NEVER the 193MB sidecar parse, never throws) — injecting the card + its wiki/memory doc pointers with zero tool call. Cheap-when-irrelevant: regex-only (~0ms) unless a whitelisted candidate is present; offset index verifies every candidate so a false token (fs.readFileSync) injects nothing. Wired settings.json UserPromptSubmit (timeout 3000) after master-index. Live-validated: eng.mill+ghost.galaxy.wedm inject real cards via portable-node; fs.readFileSync stays silent. 35 tests (reader 16 incl 3 seekCard, hook 10 incl budget-invariant + noisy-token-ignore + poison-index). 2-reviewer scrutiny PASS 0 P0/P1 (B P1-B2 R9 gap closed: hook-level no-bulk-parse test; P2 renderCard string-filter + 13->24MB doc). Staged: CAG cold-tier skip, prism_session:node_card action, GPU --near.

**Shipped:** 2026-06-04T13:11:39-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[cheap-node-access-ms0-u-nodecard-prefetch-hook]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._