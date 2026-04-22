# MCAT-MS0 User Machine Profile Convergence

Date: 2026-04-01
Lane: MCAT-MS0
Status: in_progress

## Purpose

The calculator machine-selection module should not be a dead-end picker.
It should produce a canonical user-owned machine profile that can be reused by:

- Calculator defaults and capability filtering
- Calculator PRISM mode auto-selection and recommendation ranking
- Print to CNC program setup
- Program Release machine selection and release gating
- Post-processor selection
- Shop-floor defaults and planning
- Quote / ops intelligence that depends on real machine capability

## Why This Slice Exists

The current convergence work has already started collapsing duplicate machine abstractions into shared machine search, lookup, and facet surfaces. The next missing layer is persistence of the user's actual machine package selection.

Without this layer:

- the calculator can show the right machine options but cannot retain a shop-specific machine package cleanly
- Print to CNC and Program Release have to re-ask for the same machine truth
- controller, spindle, coolant, and software bindings drift between surfaces
- downstream features are tempted to invent unsafe or unsupported option combinations

## Canonical Contract

The new canonical contract lives in:

- `H:/PRISM/mcp-server/src/contracts/userMachineProfile.ts`
- `H:/PRISM/mcp-server/data/contracts/user-machine-profile.schema.json`

The contract models three layers:

1. Canonical machine capability snapshot
2. User-selected overlay
3. Downstream read model

That allows PRISM to keep registry truth separate from shop truth.

## Required Data Stored Per Profile

- canonical machine id
- package id
- manufacturer id and label
- family id and label
- selected controller id
- enabled controller feature ids
- selected spindle package id
- enabled coolant strategy ids
- workholding / probe / automation capability overlays
- software and post-processor bindings
- preferred materials, tooling, and toolpath families
- audit provenance and confidence notes

## Calculator PRISM Mode Extension

The same machine profile should also power a calculator-side `PRISM mode` that:

- auto-selects the best legal category stack for the active machine package
- prefers user-owned inventory before recommending new purchases
- ranks missing-tool and missing-holder acquisition paths by price tier
- explains why a recommendation was chosen using compatibility, cutting-data confidence, ROI, payback, and availability
- reuses the shared purchase recommendation modal instead of inventing a calculator-only commerce flow

The machine profile is the right anchor because it already stores controller, spindle, coolant, software, and preferred-process truth that downstream recommendation engines need.

## Guardrails

- A profile must never expose a controller, spindle, or coolant option that is not available for the selected machine package.
- User overrides are additive only when explicitly marked as `user_override` or `shop_audit`.
- Unsupported option combinations must be blocked rather than guessed.
- Registry truth and user truth must remain distinguishable for auditability.

## Suggested Execution Order

### P1-U03

Add persistence service + repository for `UserMachineProfileOverlay`.

### P2-U01

Bind calculator machine-selection save/load to the canonical profile contract.

### P2-U02

Drive Print to CNC machine bootstrap from the saved machine profile when one exists.

### P2-U03

Drive Program Release machine defaults and gating checks from the saved machine profile.

### P3-U01

Add brand-audit completion tracking so profile creation can warn when machine data confidence is still weak.

### P3-U04

Build calculator `PRISM mode` orchestration that resolves best-fit tooling, holder, coolant, software, and toolpath categories from:

- canonical machine package truth
- saved user machine profile overlays
- user inventory / crib availability
- cutting-data confidence

### P3-U05

Rank `budget`, `standard`, and `premium` acquisition paths for missing setup coverage and expose them through the calculator purchase popup with:

- compatibility evidence
- inventory delta
- cutting-data confidence
- estimated ROI / payback
- available distributors and price signals

## Brand Audit Sequencing

The highest-risk brand waves should be audited first because they commonly carry controller and spindle branching:

1. Okuma
2. Mazak
3. Haas
4. DMG MORI
5. Brother
6. Makino
7. Doosan / DN Solutions
8. Citizen / Star / Tsugami

## Current Blocker

This slice was created while shell helper execution was unavailable in the active Codex thread, so it advances the roadmap with clean standalone contract artifacts but is not yet wired into the existing services.

## Next Recommended Action

When shell execution is healthy again:

1. create `UserMachineProfileService`
2. add repository + tests
3. wire calculator save/load
4. extend the lane with calculator `PRISM mode` orchestration and ranked purchase recommendations
5. wire Program Release and Print to CNC to consume the same saved profile and recommendation evidence
