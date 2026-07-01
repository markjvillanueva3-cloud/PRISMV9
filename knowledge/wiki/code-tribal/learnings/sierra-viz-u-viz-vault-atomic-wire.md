# SIERRA-VIZ/U-VIZ-VAULT-ATOMIC-WIRE — [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-VAULT-ATOMIC-WIRE+DRIFT-HEAP (slot:sierra): wire Obsidian vault-atomic into the graph (dual-reg orphan) + fix fleet-wide drift-gate OOM

**Commit:** `ca31c2818add` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T18:39:33-05:00
**Tags:** sierra-viz, u-viz-vault-atomic-wire, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-VAULT-ATOMIC-WIRE+DRIFT-HEAP (slot:sierra): wire Obsidian vault-atomic into the graph (dual-reg orphan) + fix fleet-wide drift-gate OOM

## Body
```
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-VAULT-ATOMIC-WIRE+DRIFT-HEAP (slot:sierra): wire Obsidian vault-atomic into the graph (dual-reg orphan) + fix fleet-wide drift-gate OOM

TWO coupled fixes (the regen that wired #1 surfaced #2):

1. U-VIZ-VAULT-ATOMIC-WIRE -- the dual-reg auditor flagged generate-vault-atomic.mjs as a P2
   ORPHAN: it emits vault-atomic-augmentation.json (~5099 L8 vault_entry nodes = every knowledge/*
   note excl wiki/memories, under per-namespace rollups) but was in NEITHER regen-viz FAST[] NOR
   merge-augmentations loadOptional -> the Obsidian vault content was never (re)folded into the
   system-viz graph. Wired BOTH sides (both-or-neither invariant): FAST[] entry + a loadOptional +
   fold block cloned byte-for-byte from the proven fsInventory fold (node dedup by id, edge dedup
   by from|to, G.meta.vaultAtomic stats). VERIFIED: dual-reg audit orphanGenerators 1->0 (CLEAN);
   regen ran the generator (aug file fresh) + merge folded it (vaultAtomic meta + vault_entry nodes
   present in the written 862MB graph). Now the vault is queryable in /system-viz.

2. U-VIZ-DRIFT-GATE-HEAP -- the same regen exposed a PRE-EXISTING fleet-wide bug: regen-viz.mjs:65
   spawns detect-system-viz-drift.mjs WITHOUT a heap bump while the FAST/HEAVY generators get 24GB
   (NODE_ARGS, ~line 246). The drift detector loads the full ~862MB merged graph -> at the default
   V8 heap it OOMs ("Ineffective mark-compacts near heap limit") -> the gate reports driftFail=true
   + degrades the find-cache + blocks the success-stamp on EVERY regen once the graph crosses the
   threshold. Inlined --max-old-space-size=24576 on the drift-gate spawn (NOT NODE_ARGS, because
   the --drift-gate-only path calls runDriftGate at module top-level before NODE_ARGS init -> TDZ).
   VERIFIED: node --max-old-space-size=24576 scripts/detect-system-viz-drift.mjs -> exit 0 (was OOM).

Scrutiny: per-file 2-arm (analyst + reviewer) PASS on the vault-atomic wiring (0 P0/P1; 2 P2s are
pre-existing inherited fold-pattern traits, not introduced). Drift fix is a 1-line heap-arg matching
the established NODE_ARGS pattern, verified exit 0. Both files node --check clean. Regen artifacts
(vault-atomic-augmentation.json, system-graph.json) are gitignored.
```

## Files touched (3)
- scripts/merge-augmentations.mjs | 29 +++++++++++++++++++++++++++++
- scripts/regen-viz.mjs           |  9 ++++++++-
- 2 files changed, 37 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ca31c2818add`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._