---
name: reference_jm_cam_audit_tool_2026_06_18
description: "Re-runnable JM CAM tool-library gap/error/conflict audit + its verified false-alarm (projection<flute is SAFE, do not \"fix\")"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.625Z
aliases: reference_jm_cam_audit_tool_2026_06_18
---


# JM CAM tool-library audit (the spec-#5 continuous gap-find mechanism)

`mcp-server/scripts/audit-jm-cam-libraries.mjs` (slot:romeo, 2026-06-18) deterministically audits the
Fusion/Mastercam/hyperMILL JM tool libraries under `state/shared/jm-fusion-tools/**` on REAL data.
Run: `node mcp-server/scripts/audit-jm-cam-libraries.mjs` -> writes `CAM-AUDIT-FINDINGS.{json,md}`.
Invariant test (R9, 18/18): `npx vitest run scripts/audit-jm-cam-libraries.test.ts`. Core is the pure
exported `auditToolList(tools, fileLabel)` (testable; the CLI's `auditMcam` just reads + delegates).

Checks: D1 field-completeness, D2 unit-sanity (incl. shank>100mm = gross 25.4x scale = P0), D3 cutting
plausibility (ap<=2.6xD axial, ae<=D radial, NaN), D4 ISO coverage (P/M/K/N/S/H), D5 cross-CAM geometry
(mcam JSON vs independently-generated Fusion CSV -- this is where two fold scripts diverge), D6 duplicates,
D7 library-level uniformity (all-uncoated / single-helix = lost catalog data; ONE finding/lib, never per-tool).
hmt gets a STRUCTURAL count-parity check only -- its dbl_param column semantics are type-dependent
(HyperMillToolExportEngine.ts:25-32), so deep geometry audit runs on the mm-native mcam JSON only.

Live result 2026-06-18: first pass P0=19/P1=20. **Helical FIXED + validated same session**
(`fix-helical-source-geometry.mjs`: 16 null-OAL floored+flagged, 1 gross shank 25374.6mm->dia, 1 EBAI-B3
flute=1270mm/50in marked geometry_suspect+excluded -> all 3 libs regenerated from fixed source -> 0 Helical
P0/P1, cross-CAM matched 2484 tools/0 mismatch). Residual P0=15/P1=3 are ALL JM_CRIB turning tools.

**CRIB ROOT CAUSE = the EXPORTER (verified) -- FIXED + PROVEN 2026-06-18.** Source `TURNING TOOLS.csv`
was CORRECT (`tool_type`=turning grooving/threading/general, flute EMPTY). `MastercamToolExportEngine`
mis-mapped turning -> endmill (no turning case) + `loc = ... ?? d*3` fabricated flute=dia*3=30.48mm > OAL.
FIX SHIPPED: mapToolType recognizes turning|groov|parting -> boring_bar (with `!mill` guard so a milling
groove cutter keeps endmill+flute; threading stays thread_mill); loc no d*3 for non-flute types; HyperMill
buildGeomParams cloned (isTurningClass); audit skips flute checks on no-flute types. **P0 19->2** (56 turning
tools now correctly typed boring_bar/thread_mill, 0 fabricated flutes). Verified: Ollama review flagged a
substring-collision hypothesis -> empirically 0 false positives + added the !mill guard; tests
MastercamExportFromTools 12/12 + audit 21/21. RESIDUAL 2 P0 = the single `SXZCR2020K15` boring bar (6.35in
bar body in the diameter field -- operator-gated cutting geometry). Open design Q (R8, still open): should
LATHE turning tools ship in a MILL .mcam-tools at all, or a separate JM lathe library? Recipe:
`state/shared/jm-fusion-tools/CAM-REMEDIATION-PLAN.md`. ALL work this session is UNCOMMITTED (lane guard).

## VERIFIED FALSE ALARM -- do NOT "fix" (gap-hunt agent got the safety direction backwards)

`holder.projection_mm < flute_length_mm` on ~81% of tools is **NOT a collision defect**. `projection =
max(OAL - gaugeLen, 10)` (MastercamToolExportEngine.ts:430) models a SHORT/conservative stickout -> holder
sits CLOSER to the work -> the CAM collision check errs toward CATCHING collisions (the SAFE direction; the
fold script documents this intent). Flagging it P0 ("holder will strike work") would falsely alarm 81% of
tools in the safe direction. The audit deliberately does NOT check it. Real stickout is set per-job by the
programmer. Lesson: always verify a finding's SAFETY DIRECTION before adding a gate -- a conservative model
is not a defect (R12; adversarial-verify before trusting a sub-agent's framing). See [[feedback_check_units_first]].
