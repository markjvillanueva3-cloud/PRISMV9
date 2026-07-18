---
title: Orphan-Rescue Class — every built-but-unwired asset needs a decision
category: lessons
date: 2026-05-29
last_verified: 2026-05-29
author: claude-2c3adfc7
slot: tango
confidence: 0.9
tags: [discovery, orphan, unwired, coverage, build-wire-archive, R12]
boost_keywords: [orphan, unwired engine, built but unwired, wiring potential, impact find orphans, orphan inventory, coverage gap]
links:
  - "[[architecture/duplication-guard-discipline]]"
  - "[[architecture/_orphans-rescue]]"
  - "[[feedback_tango_orphan_needs_decision]]"
  - "[[reference_tango_audit_surfaces_2026_05_29]]"
---

# Orphan-Rescue Class

An **orphan** is an asset that is built (on disk) and often documented, but never wired to a dispatcher — so it is not invokable. Discovery's job (slot:tango) is to find every orphan; the value only materializes when each one gets a decision.

> Live baseline (2026-05-29 awareness snapshot): ~593 engines built but UNWIRED (82% dispatcher coverage). The generated hub `knowledge/wiki/architecture/_orphans-rescue.md` (~250KB) enumerates them.

## The three verdicts (R12 — never silently leave a stub)

Every finding gets exactly one:

1. **BUILD** — it's a stub/incomplete; file or queue a unit to finish it.
2. **WIRE** — it's complete but unwired; hand to romeo (wiring galaxy) / `dispatcher-wirer`. Tango's `audit-unwired-engines.mjs` output IS romeo's input queue.
3. **ARCHIVE** — it's superseded/intentional-internal; mark `// WIRE-EXEMPT: <reason>` (naming the wrapper) or move to `_archive/`.

If it can't be resolved this session → file a `CLOSE-OUT-DEFERRED` entry with the reason. Defer with a reason; never silently ignore — a punch list nobody decides on rots and the fleet learns to ignore the audit.

## Detection surfaces

- `scripts/audit-unwired-engines.mjs` — engines on disk + no dispatcher ref.
- `/orphan-inventory` + `prism_dev:impact_find_orphans` — grouped by suggested dispatcher + layer → `ORPHAN-INVENTORY.md`.
- `prism_dev:wiring_potential {mode:batch_unwired}` — orphan batch + suggested dispatcher target.
- Stop gate `stop_on_unwired_assets.mjs` blocks session end on new dispatcher-orphan engines.

## Why this is a *class*, not a one-off

Orphans regenerate continuously: every new engine that ships without same-commit wiring is a fresh orphan. The rescue must be a standing audit cadence (diff each run against the last), not a single sweep. Sister rule: [[feedback_tango_orphan_needs_decision]] · [[feedback_never_delete_only_disable]].
