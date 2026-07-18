---
title: "SFC DB-wiring — the coolant `none` safety gap + the fail-soft `source:curated` live-probe lesson"
type: lesson
galaxy: speed-feed
slot: oscar
date: 2026-06-29
commits: [79d132a52a, 05170761c2]
tags: [sfc, db-wiring, fail-soft, live-validation, coolant, safety, slug-enum-map]
related:
  - "[[sfc-db-wiring-ms0]]"
  - "[[sfc-db-wiring-u-osc-sfc-coolant-catalog]]"
  - "[[reference_oscar_sfc_coolant_turning_monolith_2026_06_29]]"
  - "[[reference_oscar_sfc_coolant_route_stale_server_2026_06_29]]"
---

# SFC DB-wiring — two live-validation lessons (slot:oscar, 2026-06-29)

Two reusable lessons surfaced while wiring the last two SFC catalog inputs (coolant-method +
turning-insert `DbBackedSelect`) on `SpeedFeedPage` and then live-validating them. Both are the
kind of defect a green unit-test suite + a healthy HTTP `200` will happily hide.

## Lesson 1 — a slug→enum map that drives a SAFETY input MUST enumerate the live DB id set

The coolant-method select maps a DB method id (`/coolant/catalog`) onto the orchestrator's
`coolant_type` enum via `COOLANT_METHOD_TO_TYPE`. The first cut covered 7 ids but the **live DB
emits 8** — it missed `none` (a no-coolant cut, `effectiveness 0`). The handler guards with
`if (mapped) update(...)`, so an unmapped id **silently no-ops** and the consumed field keeps its
**default** — here `coolant_type` defaults to `"flood"` (70 % cooling). So picking "None" on a
genuinely dry cut silently read as flood → the calc **over-claims cooling** and recommends a
too-aggressive `Vc` (~28 % too fast on P-steel, up to ~82 % on an S-superalloy per
`CoolantVcModifier`) **and** suppresses the dry-cut fire warning for Ti/Inconel. That is the exact
unsafe over-cooling direction the map's "err toward less cooling" doctrine exists to prevent.

**Rule:** for a slug→enum map feeding a safety-relevant input, **enumerate the FULL live DB id set
first** (don't assume the canonical N), and **mirror that id set in the test fixture** so a
missing mapping fails in CI. When the consumed field's DEFAULT is the *least-conservative* member
(flood = most cooling), a silent no-op is unsafe, not merely incomplete. Fix here: `none: "dry"`
+ a load-bearing test asserting a "None" pick lands `coolant_type="dry"`, not the default
`"flood"`. (Caught by per-file scrutiny arm A — the 21 green tests missed it because the fixture
lacked `none`. This is why the per-file 2-arm gate runs even on a "clean clone".)

## Lesson 2 — live-validate the fail-soft `source` field, not just HTTP 200 + non-empty

Every SFC catalog accessor (`calculator*Catalog.ts`) fail-softs to a small **curated fallback**
when its DB is unavailable, reporting `source: "curated"` + `liveCount: 0`. This is silent: the
route still returns `200` with a smaller VALID option set, so **mocked component tests AND a plain
HTTP-200 probe both look healthy** while the live DB richness (and, for coolant, the `none`
method) never reaches the frontend.

Live-probing `:3100` after wiring showed **every** SFC catalog route serving `source=curated,
live=0` (coating/insert/turning-insert/coolant/coolant-product/stock/material) **and**
`tool/search` returning `total=0` — the whole live data layer on fallback. Crucially, a fresh
`npx tsx` run of the same accessor against the same file returned `source=database` (8 ids incl
`none`), and the canonical `dist/index.js` path resolves correctly to the present file. So it was
**not** the catalog code and **not** staleness — three daemon restarts (reap duplicate + kill +
clean respawn) all reproduced it → a **served-daemon runtime data-load / env problem** (the
daemon's CommandLine was un-inspectable without elevation; likely a different launch path or a
`PRISM_MCP_SERVER`/`PRISM_DATA_DIR` override). That is a backend/infra hand-off (papa/golf), not
SFC code.

**Rule:** after wiring a fail-soft DB catalog, **assert the live route's `source` field is
`database` (not `curated`) + `liveCount > 0`**, not just `200` + non-empty. **`source:curated` /
`live=0` ACROSS ALL routes** on a server whose data files exist is a **daemon data-load/env
signal**, not a catalog-code bug — don't chase it in the catalog code, and don't spiral on
restarts (R6); find the actual pid serving the port + its real cwd/env (needs elevation).

## Generalization

Both lessons are the same shape: a **silent degradation to a valid-but-smaller default** —
(1) an unmapped enum key → the field's default; (2) a fail-soft catalog → the curated fallback.
Unit tests + a 200 both pass. The defense is the same: **enumerate/observe the LIVE set and assert
against it** (the live id set; the live `source` field), because the failure mode is "looks fine,
serves less," and for a safety input "serves less cooling-awareness" is "serves more risk."
