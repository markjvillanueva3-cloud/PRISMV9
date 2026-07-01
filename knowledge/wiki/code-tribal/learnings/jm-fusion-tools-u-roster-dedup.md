# JM-FUSION-TOOLS/U-ROSTER-DEDUP — [MAIN-FORCE] [JM-FUSION-TOOLS]/U-ROSTER-DEDUP (slot:romeo): remove 12 stale old-name by-machine library dirs superseded by VMC-01..05/LTH-01..07

**Commit:** `3394472825b3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T13:50:29-05:00
**Tags:** jm-fusion-tools, u-roster-dedup, auto-distilled

## Subject
[MAIN-FORCE] [JM-FUSION-TOOLS]/U-ROSTER-DEDUP (slot:romeo): remove 12 stale old-name by-machine library dirs superseded by VMC-01..05/LTH-01..07

## Body
```
[MAIN-FORCE] [JM-FUSION-TOOLS]/U-ROSTER-DEDUP (slot:romeo): remove 12 stale old-name by-machine library dirs superseded by VMC-01..05/LTH-01..07

The by-machine tool libraries carried TWO rosters: the canonical slot-id set
(VMC-01..05 + LTH-01..07, the JM_FLEET in generate-jm-by-machine-libraries.ts:46-60,
freshly regenerated with the 1xD-LOC axial) AND a stale prior-roster set keyed by
raw machine name (haas-om-2, haas-vf-2, hurco-vmx30i, okuma-crown, okuma-genos-l200/
l300/l400, okuma-lb3000, okuma-lnc8, okuma-mb-56va, okuma-multus-b250, roku-roku-rmx5).
The old set was left behind when the generator stopped using JmDieMachineConfigEngine's
roster (its mill specs were wrong) and switched to the corrected in-file JM_FLEET. The
stale dirs carry pre-1xD-LOC cutting data -> a cross-CAM/cross-roster conflict (same
physical machine, two libraries, divergent stepdown).

Verified safe before removal (R8): grep confirms NO code reads the by-machine/<old-name>/
LIBRARY paths; the 4 post-processor engines (JmDieMachineConfigEngine, PPMachineSpecific
PostEngine, PPScenarioTemplateLibraryEngine, PostProcessorMachineKinematicsEngine)
reference machine *identities* by name, NOT these tool-library dirs. The name->slot map
is JM_FLEET (e.g. hurco-vmx30i=VMC-01, haas-vf-2=VMC-03, okuma-crown=LTH-04). 78 stale
files removed; git history retains them. Machine->material categorization is now a single
clean roster (12 machines x P/M/K/N/S/H + FUSION-IMPORT + FLEET-LEDGER).
```

## Files touched (79)
- state/shared/jm-fusion-tools/by-machine/haas-om-2/FUSION-IMPORT.csv         | 1551 ------------------
- state/shared/jm-fusion-tools/by-machine/haas-om-2/H.csv                     |   65 -
- state/shared/jm-fusion-tools/by-machine/haas-om-2/K.csv                     |  285 ----
- state/shared/jm-fusion-tools/by-machine/haas-om-2/M.csv                     |  427 -----
- state/shared/jm-fusion-tools/by-machine/haas-om-2/N.csv                     |  223 ---
- state/shared/jm-fusion-tools/by-machine/haas-om-2/P.csv                     |  427 -----
- state/shared/jm-fusion-tools/by-machine/haas-om-2/S.csv                     |  129 --
- state/shared/jm-fusion-tools/by-machine/haas-vf-2/FUSION-IMPORT.csv         | 1551 ------------------
- state/shared/jm-fusion-tools/by-machine/haas-vf-2/H.csv                     |   65 -
- state/shared/jm-fusion-tools/by-machine/haas-vf-2/K.csv                     |  285 ----
_(+69 more)_

## Lessons surfaced in commit body
- wrong) and switched to the corrected in-file JM_FLEET. The

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3394472825b3`
- Milestone envelope: `mcp-server/data/milestones/JM-FUSION-TOOLS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._