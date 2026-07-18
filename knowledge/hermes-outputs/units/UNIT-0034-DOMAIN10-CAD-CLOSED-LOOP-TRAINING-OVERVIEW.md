# UNIT-0034 — Domain 10: CAD Modeling & Engineering — Closed-Loop Training Overview

**Unit ID**: 0034
**Domain**: CAD Modeling & Engineering (Domain 10)
**Title**: Closed-Loop Training Overview and H-Drive Asset Map
**Status**: Not Started
**Priority**: P0
**Estimated Effort**: 2-3 hours (organizing + map)

## Description

Domain 10 applies the same structured-unit logic as Domains 1-8 to the CAD modeling & engineering domain, with a single terminal goal: **complete closed-loop training on ALL prints, CAD models, and CNC programs in the H drive**. This overview unit enumerates the real corpus (grounded, not assumed), maps each asset class to its training-lane status (existing vs missing), and sequences the sub-units in dependency order.

## H-Drive Asset Census (grounded — `state/shared/cad-closed-loop-night/canonical-counts.json`, 2026-07-02)

| Asset class | Count | Goal bucket | Training lane |
|---|---|---|---|
| pdf | 344,688 | prints | PARTIAL — part-decipher lane exists; 26,973 ambiguous unclassified |
| vec2d | 9,527 | prints | MISSING — no 2D-vector training lane |
| tif | 124 | prints | MISSING — raster-print lane |
| brep (STEP) | 3,359 | CAD models | PARTIAL — harvest walks 2,378 STEP-only; +.igs/.x_t/.x_b uncovered |
| mcad (ipt/iam/sldprt) | 12,572 | CAD models | MISSING — no native-MCAD feature lane |
| f3d | 1,739 | CAD models | MISSING — no Fusion-native lane |
| cnc | 367,522 | CNC programs | MISSING — no back-inference lane |
| mcam | 2,763 | CNC programs | MISSING — no Mastercam-native lane |
| deltaGeneratedBrep | 100,077 | (synthetic) | training source, already in loop |

## Acceptance Criteria

- [ ] Census table above reconciled against a fresh `canonical-counts.json` regen (numbers may drift)
- [ ] Each asset class has a named sub-unit (0035-0039) with a training-lane verdict
- [ ] Dependency graph documented (which lanes feed which; convergence audit last)
- [ ] MASTER-UNIT-PLAN.md Domain 10 section added with these units listed
- [ ] No fabricated counts — every number cites canonical-counts.json or a fresh enumeration

## Dependencies

- `state/shared/cad-closed-loop-night/canonical-counts.json` (asset census source of truth)
- `state/shared/DELTA-CONTEXT-LEDGER.md` §6b (open-thread reconciliation)
- Existing night-chain: `PRISM CAD Closed Loop Night` scheduled task

## Deliverables

- This overview unit (census + lane map + dependency order)
- Domain 10 section appended to MASTER-UNIT-PLAN.md
- Sub-unit specs UNIT-0035..0039

## Autonomous Execution Notes

Organizing unit — no engine build. Downstream units (0035-0039) are the buildable work. Each gets a gap analysis (via delta-cad agent, matching the UNIT-000X-gap.md harness pattern) before any build, to distinguish genuine gaps from already-wired coverage (R8/R12: existence ≠ coverage).
