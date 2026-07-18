# UNIT-0008 — Minimum Chip Thickness and Size Effect

**Unit ID**: 0008
**Domain**: Physics & Material Science
**Title**: Minimum Chip Thickness and Size Effect
**Status**: Not Started
**Priority**: P0
**Estimated Effort**: 4 hours

## Description

Models for minimum chip thickness (ploughing vs shearing transition) and size effect in micro-machining. Critical for precision and micro features at JM Die.

## Acceptance Criteria

- [ ] Minimum chip thickness formula per material/tool
- [ ] Size effect scaling laws
- [ ] Validation on JM Die micro-features with <6% error
- [ ] Wired to prism_calc:min_chip_*
- [ ] Full scrutiny

## Dependencies

- UNIT-0002–0005

## Deliverables

- MinChipThicknessEngine + SizeEffectModel
- Validation on real micro jobs

## Autonomous Execution Notes

Core → live validation on JM Die micro parts.