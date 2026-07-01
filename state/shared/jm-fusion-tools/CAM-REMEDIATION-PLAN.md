# JM CAM Tool-Library Remediation Plan

> Generated 2026-06-18 (slot:romeo) from `audit-jm-cam-libraries.mjs` (P0=19/P1=20/P2=4) +
> an adversarially-verified gap-hunt. Every row below was confirmed against the REAL data
> (not the audit title) and classified **fabrication-free** (orchestrator may apply) vs
> **operator-gated** (needs a real catalog datum -- must NOT be invented; R12).
>
> Re-run the audit any time: `node mcp-server/scripts/audit-jm-cam-libraries.mjs`
> Invariant test (locks the checks): `npx vitest run scripts/audit-jm-cam-libraries.test.ts` (18/18).

## Defect ledger

| # | Class | Sev | Count | File | Fabrication-free fix? | Needs operator? |
|---|-------|-----|-------|------|-----------------------|-----------------|
| 1 | Helical OAL=null -> per-CAM default divergence (Fusion 50.8mm vs mcam 76.2+) | P0/D5 | 16 src (17 xcam rows) | source + all 3 libs | PARTIAL (consistency yes; true OAL no) | for exact OAL |
| 2 | Helical flute_length > OAL impossible (EBAI-B3 1270mm/50in; 3 ECI-5 in output) | P0 | 1 src / 3 output | source + libs | enforce flute<OAL only | for true LOC |
| 3 | Helical shank 25374.6mm (=999in x 25.4) scale error -- `ECI-5 .25-1.C.06VF3` | P0 | 1 | source + libs | shank=dia fallback (end-mill straight-shank norm) | confirm shank style |
| 4 | Crib turning inserts mis-typed endmill/thread_mill w/ 30.48mm flute default > OAL | P0 | 13 | crib source/generator | reclassify type + drop milling flute | trace crib mapping |
| 5 | Crib `SXZCR2020K15` is a boring BAR/holder w/ bar dims (dia161/flute484/OAL762) in cutting fields | P0 | 1 | crib source/generator | reclassify as holder / exclude | confirm it's a holder |
| 6 | Coating=="uncoated" for ALL 2703 tools -- lost catalog coating data | P2/D7 | 2703 | source upstream | NO (needs catalog import) | yes (Docustrata/juliett) |
| 7 | helix_angle_deg==35 for ALL tools (incl. drills/turning) -- blanket default | P2/D7 | 2703 | source upstream | NO (needs catalog) | yes |

## NOT a defect (verified false alarms -- do NOT "fix")

- **holder.projection_mm < flute_length (~81% of tools).** `projection = max(OAL - gaugeLen, 10)` models a
  SHORT/conservative stickout -> holder sits closer to the work -> CAM collision check errs toward CATCHING
  collisions (the SAFE direction). Flagging it would falsely alarm 81% of tools in the safe direction. The
  audit deliberately does NOT check it (comment in `auditToolList`). Real stickout is set per-job by the programmer.
- **fz 0.004-0.015 mm/tooth clustering.** Plausible-correct for the mostly small-diameter Helical end mills
  (small tools take small chip loads); NOT a blanket defect. Existing FZ bound catches truly-broken values.
- **point_angle_deg missing on end mills.** Correct -- end mills have no point angle.
- **feed/rpm internal consistency.** Verified intact (0 violations / 14,910 rows) -- the physics link holds.

## Fabrication-free fixes the orchestrator can apply (P0 first)

1. **Helical source geometry hygiene** (`unknown-vendor-tools.json`, then regenerate all 3 Helical libs):
   - flute_length_mm > overall_length_mm  -> mark `geometry_suspect:true` (do NOT invent LOC); the generator
     must EXCLUDE suspect tools from the shipped collision libs OR clamp display geometry, never ship flute>OAL.
   - overall_length_mm == null (16)        -> set `overall_length_mm = round(flute_length_mm + STICKOUT_FLOOR)`,
     mark `oal_estimated:true`; ALL three CAM generators read this one value -> cross-CAM consistent.
   - shank_diameter_mm > 100 (1: 25374.6)  -> fall back `shank = cutting_diameter_mm` (straight-shank end-mill
     norm), mark `shank_estimated:true`.
   - Emit `HELICAL-GEOMETRY-ESTIMATED.txt` listing every tool touched (R12 transparency).
2. **Single-source the 3 Helical CAM libs** so OAL/holder come from one derivation (eliminates the D5 cross-CAM
   conflict + the orphan Fusion CSV whose writer is no longer in-repo).

## OPERATOR-GATED (must NOT fabricate -- needs a real catalog datum)

- True LOC for `EBAI-B3 1.-1.5/5.C-7EC` (currently flute 1270mm garbage) -- Helical catalog / Docustrata.
- True OAL for the 16 null-OAL Helical parts (floored estimate ships meanwhile, flagged).
- True shank style/diameter for `ECI-5 .25-1.C.06VF3`.
- Confirm `SXZCR2020K15` is a turning/boring holder (reclassify, not a milling cutter).
- Coating + per-tool helix for the Helical families (lost on import) -- biggest speed/feed-accuracy win.
- The ~650 still-unattributed vendor prefixes (KOR/RPK/MA/numeric) from the prior session.

## STATUS UPDATE 2026-06-18 -- Helical fixed + proven; crib root cause traced to the EXPORTER

**Helical (items 1-3): FIXED + VALIDATED.** `fix-helical-source-geometry.mjs` (16 null OAL floored+flagged,
1 gross shank->dia, 1 flute>OAL marked geometry_suspect+excluded) -> all 3 CAM libs regenerated from the
fixed source -> re-audit: **0 Helical P0/P1, cross-CAM matched 2484 tools / 0 geometry mismatch.** The 16
null-OAL cross-CAM (D5) conflict + every Helical geometry impossibility are gone. Estimated values flagged in
`HELICAL-GEOMETRY-ESTIMATED.json` (true LOC/OAL still want a Docustrata lookup -- operator-gated).
Residual audit P0=15 / P1=3 are ALL in JM_CRIB (below).

**Crib (items 4-5): root cause is the EXPORTER, not the source (verified -- corrects the earlier note).**
- Source `TURNING TOOLS.csv` is CORRECT: `tool_type` = `turning grooving|turning threading|turning general`,
  flute length EMPTY, real OAL. `generate-jm-cam-libraries.ts` preserves this (flute=undefined).
- `MastercamToolExportEngine.mapToolType()` (line ~263) has NO turning case -> `turning grooving/general`
  fall through to `endmill`, `turning threading` -> `thread_mill`. Then line ~347 `loc = ... ?? d * 3`
  FABRICATES flute = diameter x 3 = 30.48mm on the dia-0.4in turning tools (> their <1.2in OAL) -> the P0s.
  `HyperMillToolExportEngine` has the same gap.
- **Surgical fabrication-free fix (next unit, shared-engine -> needs test + review):**
  1. `mapToolType`: recognize `turning|groov|boring` -> `boring_bar` (closest non-milling enum member),
     checked BEFORE the `thread` test so `turning threading` is not mis-read as a milling thread mill.
  2. flute default: `const isTurning = /turning|groov|boring/.test(rawType); loc = phys... ?? (isTurning ? 0 : d*3);`
     -- no fabricated milling flute on turning tools (then OAL<flute never fires).
  3. Clone the same two changes into `HyperMillToolExportEngine`; add a turning-tool round-trip test to each.
- **OPERATOR DESIGN QUESTION (R8):** turning grooving/threading/boring tools are LATHE tools -- should they
  ship in a *mill* `.mcam-tools`/`.hmt` at all, or be split into a separate JM lathe tool library? The
  exporter fix makes them non-broken either way, but the right home is an architecture call.
- `SXZCR2020K15` (dia 161/flute 484/OAL 762mm): a `turning general` boring BAR whose BAR dims sit in the
  cutting-geometry fields -- same exporter path; reclassifying to `boring_bar` + the no-flute-default fix
  resolves the flute P0, but its 161mm "diameter" is the bar body (confirm intended cutting geometry).

Blast radius: `MastercamToolExportEngine` + `HyperMillToolExportEngine` are shared by crib + Helical +
fullcorpus generators -> the exporter fix is its own committed, test-backed unit.
