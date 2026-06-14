---
name: reference_bravo_stub_hunter_scripts
description: Verified stub-hunter + wiring script names in H:/prism/scripts/ (the canonical set bravo uses)
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.036Z
aliases: reference_bravo_stub_hunter_scripts
---


Verified 2026-05-28 (`H:/prism/scripts/`). Use these EXACT names — the alpha scaffold cited `audit-stub-assertions.mjs` / `audit-orphan-inventory.mjs` which do NOT exist.

- `stub-class-audit-tobedefined.mjs` — finds `.toBeDefined()`/`toBeTruthy()` weak tests (canonical weak-assertion auditor)
- `stub-hunt-inventory.mjs` — full stub inventory
- `stub-sweep-full.mjs` — full-codebase 5-pattern sweeper
- `audit-unwired-engines.mjs` — engines on disk w/ no dispatcher ref
- `orphan-inventory.mjs` + `audit-orphan-doctrine.mjs` — built+documented+unwired punch list
- `papa-pick-next-unwired.mjs` + `unwired-bridge-rank.mjs` — wire-next selection

Surfaced by `/stub-hunt-bravo`. See [[feedback_bravo_verify_cited_paths_before_enshrining]].
