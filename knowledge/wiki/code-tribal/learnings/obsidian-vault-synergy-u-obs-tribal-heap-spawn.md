# OBSIDIAN-VAULT-SYNERGY/U-OBS-TRIBAL-HEAP-SPAWN — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-TRIBAL-HEAP-SPAWN (slot:alpha): heap-safe single-source tribal-rerank spawn — fixes silent PSN leg #5 death on every Edit/Write

**Commit:** `c8ab7d5d0cf6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T05:09:12-05:00
**Tags:** obsidian-vault-synergy, u-obs-tribal-heap-spawn, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-TRIBAL-HEAP-SPAWN (slot:alpha): heap-safe single-source tribal-rerank spawn — fixes silent PSN leg #5 death on every Edit/Write

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-TRIBAL-HEAP-SPAWN (slot:alpha): heap-safe single-source tribal-rerank spawn — fixes silent PSN leg #5 death on every Edit/Write

Discovered via the 4-surface ultracode discovery Workflow (item #1+#2, premise
verified live). The tribal index (state/shared/tribal-embed-index.json) is ~167MB;
the reranker's JSON.parse builds an N x 768-float object graph that OOMs the
default ~2GB node heap. tribal-inject-on-edit.mjs:85 spawned tribal-rerank.mjs
with NO heap flag → OOM/timeout → status!=0 → passthrough() → tribal hits (PSN
leg #5) SILENTLY never injected on any Edit/Write. The sibling
tribal-by-domain-inject.mjs:208 already baked NODE_OPTIONS=--max-old-space-size=8192
(R7 — two divergent spawns of one load-bearing command).

Fix (single-source, R7): new scripts/lib/tribal-rerank-spawn.mjs bakes the
heap-safe env + timeout/stdio/windowsHide policy into ONE chokepoint
(spawnTribalRerank + rerankSpawnEnv). Both injectors now route through it — the
on-edit hook GAINS the heap flag (the fix); the by-domain hook is de-duplicated
onto the same policy so it can't drift (subagent-start-context.mjs:58 is a 3rd
future caller). Both hooks stay fail-open (passthrough on !ok).

Validated: 7/7 helper tests incl a regression oracle asserting the heap flag
REACHES the child (mock execImpl). LIVE: tribal-rerank --max-old-space-size=8192
returns ok:true + 3 real hits on the 167MB index. Both hooks node --check clean.
Discovery queue: reference_obsidian_multisurface_discovery_2026_06_09 (items 1+2).
```

## Files touched (5)
- .claude/hooks/tribal-by-domain-inject.mjs | 29 ++++++++---------------------
- .claude/hooks/tribal-inject-on-edit.mjs   | 10 +++++-----
- scripts/lib/tribal-rerank-spawn.mjs       | 74 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/tribal-rerank-spawn.test.mjs  | 67 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 154 insertions(+), 26 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c8ab7d5d0cf6`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._