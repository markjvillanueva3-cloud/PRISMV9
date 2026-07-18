# JM-FUSION-TOOLS/U-1XD-LOC-AXIAL — [MAIN-FORCE] [JM-FUSION-TOOLS]/U-1XD-LOC-AXIAL (slot:romeo): diameter-relative axial-depth (1xD LOC) baseline clamped to SFC ceiling, all 3 CAMs

**Commit:** `b9996fc2e54d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T13:41:56-05:00
**Tags:** jm-fusion-tools, u-1xd-loc-axial, auto-distilled

## Subject
[MAIN-FORCE] [JM-FUSION-TOOLS]/U-1XD-LOC-AXIAL (slot:romeo): diameter-relative axial-depth (1xD LOC) baseline clamped to SFC ceiling, all 3 CAMs

## Body
```
[MAIN-FORCE] [JM-FUSION-TOOLS]/U-1XD-LOC-AXIAL (slot:romeo): diameter-relative axial-depth (1xD LOC) baseline clamped to SFC ceiling, all 3 CAMs

Milling axial DOC (ap / CAM stepdown) is now a DIAMETER-RELATIVE baseline per
toolpath, CLAMPED to the existing SFC material/op/strategy physics ceiling:
  apEff = min(STRATEGY_FACTORS[strategy].axialDx * dMm, lk.ap * sm.ap)
axialDx: conventional 1.0 (1xD rough), adaptive/HEM 2.0, trochoidal 2.5,
hsm 0.15, plunge 1.0, slot 0.5. min() => small tools get a snap-safe diameter-
scaled axial (0.25in endmill HEM 0.6299in->0.5in; 0.007in endmill 16mm->0.014in);
large tools + stainless/hardened (S/H lower ceiling) + finishing stay physics-
clamped. Radial WOC + feeds/speeds unchanged. turning/drilling/tapping/reaming
unchanged (milling-only).

Synced both forked ap paths byte-identical (R7/R8 -- they were drifting):
- mcp-server/scripts/lib/jm-tool-condition-matrix.ts (canonical _computeConditionUncached)
- mcp-server/scripts/generate-jm-fusion-tool-libraries.ts (forked condOverride + STRATEGY_FACTORS; TODO tracks collapsing the fork)

Regenerated all derived artifacts so all 3 CAMs agree:
- Fusion material-group libraries (JM-CRIB-ALL-families.csv + per-family)
- by-machine FUSION-IMPORT + per-ISO + FLEET-LEDGER (VMC-01..05, LTH-07)
- Mastercam JM_CRIB.mcam-tools
- corpus-cutting-data by-group-sample (P/M/K/N/S/H) -- was STALE (0.007in
  micro-endmill carried 16mm/90xD axial); now diameter-bound.

VERIFIED 32/32 tests green (6 behavior + 2 diameter-bound oracle rows #133 +
corpus freshness guard) + safety-physics PASS S(x)=1.00 + 3-of-3 scrutiny PASS.
NOTE: the 2 test files (jm-tool-condition-matrix.test.ts, generate-corpus-cutting-
corpus.test.ts) are untracked (git-add-lane-guard) and land in the next commit.
```

## Files touched (43)
- mcp-server/scripts/generate-jm-fusion-tool-libraries.ts                                 |  27 ++--
- mcp-server/scripts/lib/jm-tool-condition-matrix.ts                                      |  28 ++--
- state/shared/corpus-cutting-data/by-group-sample/CORPUS-H.sample.csv                    | 280 ++++++++++++++++++------------------
- state/shared/corpus-cutting-data/by-group-sample/CORPUS-K.sample.csv                    | 320 +++++++++++++++++++++---------------------
- state/shared/corpus-cutting-data/by-group-sample/CORPUS-M.sample.csv                    | 304 +++++++++++++++++++--------------------
- state/shared/corpus-cutting-data/by-group-sample/CORPUS-N.sample.csv                    | 304 +++++++++++++++++++--------------------
- state/shared/corpus-cutting-data/by-group-sample/CORPUS-P.sample.csv                    | 304 +++++++++++++++++++--------------------
- state/shared/corpus-cutting-data/by-group-sample/CORPUS-S.sample.csv                    | 320 +++++++++++++++++++++---------------------
- state/shared/jm-fusion-tools/by-machine/FLEET-LEDGER.json                               | 238 ++++++++++++++++---------------
- state/shared/jm-fusion-tools/by-machine/LTH-07/FUSION-IMPORT.csv                        |  86 ++++++------
_(+33 more)_

## Lessons surfaced in commit body
- NOTE: the 2 test files (jm-tool-condition-matrix.test.ts, generate-corpus-cutting-

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b9996fc2e54d`
- Milestone envelope: `mcp-server/data/milestones/JM-FUSION-TOOLS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._