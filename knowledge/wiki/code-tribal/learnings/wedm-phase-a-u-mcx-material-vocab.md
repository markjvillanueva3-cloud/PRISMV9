# WEDM-PHASE-A/U-MCX-MATERIAL-VOCAB — [MAIN] [WEDM-PHASE-A]/U-MCX-MATERIAL-VOCAB (slot:charlie iter41): material-vocab discovery — 0 hits, real signal is machine-definition references (.wmd-8)

**Commit:** `00c2fb1499a8` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T02:35:35-05:00
**Tags:** wedm-phase-a, u-mcx-material-vocab, auto-distilled

## Subject
[MAIN] [WEDM-PHASE-A]/U-MCX-MATERIAL-VOCAB (slot:charlie iter41): material-vocab discovery — 0 hits, real signal is machine-definition references (.wmd-8)

## Body
```
[MAIN] [WEDM-PHASE-A]/U-MCX-MATERIAL-VOCAB (slot:charlie iter41): material-vocab discovery — 0 hits, real signal is machine-definition references (.wmd-8)

Phase-B iter-39 surfaced material_hints=['GRAPHITE×1'] across 97 manifests. This unit discovers WHY material vocab is so sparse by re-parsing 5 .mcx-8 samples and dumping raw embedded_strings.

Findings:

  - 0/5 files surface any material-vocab pattern (carbide / tool steel / die steel / HSS / hardened / HRC / P20 / S7 / A2 / O1 / stainless / inconel / hastelloy / titanium)

  - Operators don't put material info in Mastercam — material lookup happens upstream in the shop's ERP / job traveler

  - 144 cross-corpus shared strings (appear in 2+ files) — real shared operator vocabulary

REAL signal in shared strings:

  - MPW MITS FA-FX EDM(TECH).wmd-8 (4/5 files) — Mitsubishi FA/FX WEDM machine-definition

  - X WIRE (TECH).wmd-5 (4/5)

  - mcamx5\WIRE\NCI\ (4/5) — Mastercam WIRE NCI subfolder path

  - NUM inch - 2024 (4/5) — unit system + year

  - Mastercam framework noise: Main Viewsheet, MastercamPlanes, Matrix33, Plane, Stream 1-8

Reframe: COMMON_MATERIAL_TOKENS regex doesn't need expansion (material rarely in Mastercam metadata). NEW high-ROI extraction target: MACHINE-DEFINITION vocab (.wmd-8 / .wmd-5 references identify physical machine model). U-MCX-MACHINE-DEFINITION-VOCAB tracked.

R12 fail-loud: U-MCX-MATERIAL-VOCAB as engine-extension is CANCELED. The corpus answer is structural, not regex-tunable.

Files: scripts/wedm-mcx-material-vocab-scan.mjs +180 · state/shared/wedm-mcx-material-vocab-scan.json +new
```

## Files touched (3)
- scripts/wedm-mcx-material-vocab-scan.mjs       |  199 ++++
- state/shared/wedm-mcx-material-vocab-scan.json | 1378 ++++++++++++++++++++++++
- 2 files changed, 1577 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 00c2fb1499a8`
- Milestone envelope: `mcp-server/data/milestones/WEDM-PHASE-A.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._