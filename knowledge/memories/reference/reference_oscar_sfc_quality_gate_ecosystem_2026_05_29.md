---
name: reference_oscar_sfc_quality_gate_ecosystem_2026_05_29
description: The SFC/lathe domain already has 8 quality gates (constants discipline, CSS-cap, parity, gauntlet). Check /sfc-gates + SFC-AWARENESS gate section + /dedup BEFORE building any new SFC quality tool — the domain is mature; obvious tools dup.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.711Z
aliases: reference_oscar_sfc_quality_gate_ecosystem_2026_05_29
---


# SFC quality-gate ecosystem — check before building (2026-05-29, slot:oscar)

**Lesson (R8 + dedup):** the SFC/lathe domain is **mature** — the "obvious" quality tools already exist. During the 2026-05-29 synergy /loop I nearly shipped TWO duplicates before the pre-write graph hook + a git-grep dedup caught them:
- a physics-constants lint lib/CLI → duplicate of **`NoInlinePhysicsConstantsEngine.ts`** (+ `camDispatcher-NoInlinePhysics.test.ts`).
- a CSS/G50 G-code lint → already covered by **`lathe-master-post-quality-gate.mjs`** + the lathe engines (whiskey domain).

Both were deleted/abandoned before commit. The root cause was **discoverability**: nothing surfaced what already protects the domain.

## The 8 canonical SFC quality gates (do NOT rebuild)
| Gate | Kind | Role |
|---|---|---|
| `NoInlinePhysicsConstantsEngine` | engine | canonical inlined-physics-constant detector (runtime/CI) |
| `kienzle-coeff-check.mjs` | hook | change-control on kienzle-coefficient files (physics-review gate; `PHYSICS_REVIEW_APPROVED=true`) |
| `physics-canonical-constants-guard.mjs` | hook | anti-pollution: blocks ingestion/shop data INTO constants.ts |
| `canonical-constants.mjs` | hook | canonical-constants guard |
| `lathe-master-post-quality-gate.mjs` | hook | lathe master-post output quality incl. G96/G50 CSS-cap (whiskey) |
| `oscar-sfc-constants-guard.mjs` | hook | SFC-engine authoring-time inlined-kc advisory (oscar; complementary, NOT a dup of the 2 hooks above — distinct concern) |
| `/sf-audit-oscar` | skill | one-pass SFC galaxy health audit |
| `sf-tri-vendor-smoke.mjs` | script | tri-vendor (PRISM × baseline × G-Wizard) parity smoke |
Plus the 401-assertion gauntlet (`npx vitest run src/__tests__/*SpeedFeed*.test.ts`, 27 files).

## How to apply
- **Before building any SFC quality tool:** run `/sfc-gates` (the live gate map) → check this table → `/dedup`. Constants discipline → use `NoInlinePhysicsConstantsEngine` + hooks. CSS/G50 → `lathe-master-post-quality-gate` (coordinate with whiskey). Parity → `sf-tri-vendor-smoke`.
- The map is LIVE: `scripts/sfc-awareness-snapshot.mjs` (`KNOWN_SFC_GATES` + `discoverQualityGates`) → `SFC-AWARENESS.md` "## Quality gates protecting this domain". Add a row to `KNOWN_SFC_GATES` when a new SFC gate ships.
- See [[reference_oscar_sfc_awareness_surface_2026_05_28]] · [[feedback_oscar_sfc_physics_discipline]] · [[reference_oscar_sfc_domain_map_2026_05_27]].
