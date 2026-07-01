# SIERRA-VIZ/U-VIZ-FS-INVENTORY-WALK-FIX — [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-FS-INVENTORY-WALK-FIX (slot:sierra): fix the >120s hang/OOM (74,704 L9 over-iteration) + FAST-add -> 301 fs.box nodes refreshed

**Commit:** `56e461eeee33` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T09:37:21-05:00
**Tags:** sierra-viz, u-viz-fs-inventory-walk-fix, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-FS-INVENTORY-WALK-FIX (slot:sierra): fix the >120s hang/OOM (74,704 L9 over-iteration) + FAST-add -> 301 fs.box nodes refreshed

## Body
```
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-FS-INVENTORY-WALK-FIX (slot:sierra): fix the >120s hang/OOM (74,704 L9 over-iteration) + FAST-add -> 301 fs.box nodes refreshed

ROOT CAUSE (sharper than the iter5 "slow walk" diagnosis): generate() filtered L9 = ALL 74,704
graph.nodes at layer L9 (incl. 22K deep_subtree + 15K deep_orphan with path-like labels) and did a
bounded FS walk for EACH -> the >120s hang + OOM that kept this generator out of FAST[] since 2026-05-09.
Two surgical fixes: (1) filter L9 to the 88 intended fs-dir nodes (subgroup prism|h_root); (2)
pathFromLabel strips the "[N/M]" child-count annotation labels now carry (it broke existsSync on every
parent). Result: 4s at DEFAULT heap (was OOM/>120s), 301 fresh fs.box nodes (was stale May-9).

FAST-added (merge already folds fsInventory ~line 672 -> completes the dual-registration; regen spawns
generators with a 24GB heap). Added a run-as-main guard + exports + a 6-case test (pathFromLabel
annotation-strip + the L9 subgroup filter proven via a temp-dir fixture: noise subgroups excluded).
Auditor now: crashRisks 0, silentDiscards 0, orphans 1 (only vault-atomic, the resolved-redundant one).
```

## Files touched (4)
- scripts/generate-fs-inventory.mjs      | 42 +++++++++++++++++++++++++-----------------
- scripts/generate-fs-inventory.test.mjs | 57 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/regen-viz.mjs                  |  1 +
- 3 files changed, 83 insertions(+), 17 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 56e461eeee33`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._