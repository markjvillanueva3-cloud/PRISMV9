# AI-SYSTEMS-GNN/U-GNN-CODEBASE-WIRED-REFPOOL — [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-CODEBASE-WIRED-REFPOOL (slot:india): 3rd GNN ref-pool feeder -- codebase engine->dispatcher wirings (the 20x pool-growth lever)

**Commit:** `859554a148b6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T14:58:22-05:00
**Tags:** ai-systems-gnn, u-gnn-codebase-wired-refpool, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-CODEBASE-WIRED-REFPOOL (slot:india): 3rd GNN ref-pool feeder -- codebase engine->dispatcher wirings (the 20x pool-growth lever)

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-CODEBASE-WIRED-REFPOOL (slot:india): 3rd GNN ref-pool feeder -- codebase engine->dispatcher wirings (the 20x pool-growth lever)

PSN leg #10's reference pool drew positives from only the outcome ledger (139)
+ vault feedback (16). The live codebase has thousands of confirmed engine->
dispatcher wirings (every engine a dispatcher .ts imports IS wired to it) -- the
STRONGEST ground truth, untapped. Dry-run extracts 3206 single-dispatcher engines
(confidence 1.0) across 13+ dispatchers; 409 multi-dispatcher engines EXCLUDED as
ambiguous (R12; HookExecutor wired to 34 dispatchers correctly dropped). ~20x the
current 155-ref pool -- the model-quality lever the doctrine names.

Faithful CLONE of ghost-wire-outcomes-to-refpool.mjs (R15): same node/edge shape,
shared mergeGhostsIntoGraph (content-idempotent), heap-reexec, --revert. Only the
SOURCE differs -- buildEngineDispatcherMap (existing tested wired-engine-mapper.mjs).
Distinct id namespace ghost.codebase-wired.* (no collision); eval buildHoldout
selects it namespace-agnostically + dedups by engine label (no double-count).

DELIBERATELY dry-run-safe + NOT --applied + NOT wired as lifecycle stage 1c this
session: a 20x ghost-node injection into the shared 542MB graph (25 peer chats
consume it) needs blast-radius verification (system-viz roosts / orphan-inventory
/ production classifier) + measure-before-deploy first -- the gated NEXT unit.
Tests 7/7; 2-arm scrutiny PASS, methodology validated, 0 P0/P1.
```

## Files touched (3)
- scripts/wired-engines-to-refpool.mjs      | 216 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/wired-engines-to-refpool.test.mjs |  92 ++++++++++++++++++++++++++++++++++++++
- 2 files changed, 308 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 859554a148b6`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-GNN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._