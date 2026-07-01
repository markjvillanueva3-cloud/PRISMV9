# JM-BY-MACHINE/U-FLEET-FUSION-IMPORT — [MAIN-FORCE] [JM-BY-MACHINE]/U-FLEET-FUSION-IMPORT (slot:romeo): Fusion-importable 173-col per-machine libraries

**Commit:** `fa9f37969b78` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T10:16:17-05:00
**Tags:** jm-by-machine, u-fleet-fusion-import, auto-distilled

## Subject
[MAIN-FORCE] [JM-BY-MACHINE]/U-FLEET-FUSION-IMPORT (slot:romeo): Fusion-importable 173-col per-machine libraries

## Body
```
[MAIN-FORCE] [JM-BY-MACHINE]/U-FLEET-FUSION-IMPORT (slot:romeo): Fusion-importable 173-col per-machine libraries

Operator follow-on: make the by-machine fleet libraries actually importable into
Fusion per machine. Extends generate-jm-by-machine-libraries.ts to emit, per
machine, a FUSION-IMPORT.csv -- the full 173-column Fusion CSV_TOOLS format
(header byte-identical to JM's source cribs, md5-verified), every preset row,
material-first ordered, ready to import as that machine's tool library.

Each row = the source tool's verbatim geometry/holder/collision columns +
cutting cells (spindle/surface speed, feeds, stepdown/over, CSS) overridden by
the spindle-clamped per-(material x toolpath) preset (buildFusionRow, mirrors
the Fusion generator's condOverride). Correct machine class from the source-crib
filename -- no insert/twist-drill ambiguity (the reason a merged-crib post-
process would mis-file insert drills onto mills).

  - 12 FUSION-IMPORT.csv (one per cutting machine); 31,392 presets, 397 clamped
  - verified: 0 rows exceed haas-vf-2's 8100 cap, 54 pinned at 8100, geometry
    (dia/holder) preserved verbatim, preset_name set
  - --reset now PRESERVES README.md (was wiping the hand-written doc)

tsc 0 (my files); 7/7 clamp tests. Spec source JmDieMachineConfigEngine (OEM).
```

## Files touched (16)
- mcp-server/scripts/generate-jm-by-machine-libraries.ts                      |   72 +-
- state/shared/jm-fusion-tools/by-machine/FLEET-LEDGER.json                   |    2 +-
- state/shared/jm-fusion-tools/by-machine/README.md                           |   13 +-
- state/shared/jm-fusion-tools/by-machine/haas-om-2/FUSION-IMPORT.csv         | 1551 ++++++++++++++++++++++++++++++++++
- state/shared/jm-fusion-tools/by-machine/haas-vf-2/FUSION-IMPORT.csv         | 1551 ++++++++++++++++++++++++++++++++++
- state/shared/jm-fusion-tools/by-machine/hurco-vmx30i/FUSION-IMPORT.csv      | 1551 ++++++++++++++++++++++++++++++++++
- state/shared/jm-fusion-tools/by-machine/okuma-crown/FUSION-IMPORT.csv       | 3157 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/jm-fusion-tools/by-machine/okuma-genos-l200/FUSION-IMPORT.csv  | 3157 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/jm-fusion-tools/by-machine/okuma-genos-l300/FUSION-IMPORT.csv  | 3157 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/jm-fusion-tools/by-machine/okuma-genos-l400/FUSION-IMPORT.csv  | 3157 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
_(+6 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fa9f37969b78`
- Milestone envelope: `mcp-server/data/milestones/JM-BY-MACHINE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._