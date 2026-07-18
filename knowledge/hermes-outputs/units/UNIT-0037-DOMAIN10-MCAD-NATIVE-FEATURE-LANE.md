# UNIT-0037 — MCAD Native Feature Extraction Lane

**Unit ID**: 0037
**Domain**: CAD Modeling & Engineering (Domain 10)
**Title**: MCAD Native Feature Extraction Lane (ipt/iam/sldprt + f3d)
**Status**: Not Started
**Priority**: P1
**Estimated Effort**: 6-10 hours

## Description

**12,572 native MCAD files** (Inventor ipt/iam, SolidWorks sldprt) + **1,739 f3d** (Fusion native) currently have NO training lane — they are richer than STEP because they carry the **authoring feature tree** (extrude/revolve/pattern/fillet history), which STEP discards. This is the highest-value modality for the P6 "BREP→authoring-feature tree" crux: MCAD files ARE the ground-truth feature trees. This unit extracts them into (model → feature-tree) training pairs.

## Acceptance Criteria

- [ ] Reader extracts feature-tree metadata from at least ipt + sldprt (via available parser/converter — verify what's installed: Inventor/SolidWorks seats, or a headless lib)
- [ ] f3d handled via the delta Fusion bridge (:18362) OR the f3d archive format — proven on a real file
- [ ] Emits (model → ordered feature list with parameters) training pairs
- [ ] Real-data validation: extract feature trees from ≥20 real MCAD files; spot-check ≥5 against the actual model in-seat
- [ ] Units resolved per file; Fusion API unit trap (cm, 2.54×) guarded [[reference_delta_cad_ui_seat_knowledge]]
- [ ] Wired to `prism_cad` feature-tree action; pairs into fleet corpus
- [ ] 3-of-3 scrutiny; no stubs; fail-loud + count on any format the reader can't open

## Dependencies

- UNIT-0034 (census)
- **BLOCKER to resolve first**: what can read ipt/sldprt headlessly? (Inventor/SW seats present? a converter? STEP-export fallback?) — gap-analyze before committing to a build path
- Existing: `CADFeatureRecognitionEngine` (trunk shell), delta Fusion bridge :18362

## Deliverables

- MCAD feature-tree reader (or seat-automation / converter path)
- (model → feature-tree) training-pair emitter
- Validation report (in-seat spot-check)

## Autonomous Execution Notes

Gap-analyze FIRST — the READ path is the risk (native MCAD is proprietary binary). If no headless reader exists, the honest scoped path is: convert-to-STEP in-seat → but that LOSES the feature tree, defeating the point. Surface this blocker loudly; f3d via Fusion bridge may be the only feature-tree-preserving path today. Do NOT claim coverage if only the STEP-export fallback works.
