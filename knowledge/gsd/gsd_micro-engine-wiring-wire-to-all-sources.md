---
source: gsd_micro
section: Engine Wiring — Wire to All Sources
slug: engine-wiring-wire-to-all-sources
indexed_at: 2026-04-28T02:50:03.677Z
---

## Engine Wiring — Wire to All Sources

NEW RULE (2026-04-28): when generating an engine, do NOT stop at one
dispatcher. Wire to **every dispatcher that would naturally consume
it** in a single commit. Examples:

- A new memory engine → wire into `prism_memory` AND any specialized
  consumer (e.g. `prism_guard:error_ledger_*` for error ledgers).
- A new physics engine → wire into `prism_calc` AND `prism_safety`
  validation actions if it computes safety-relevant quantities.
- A new CAM engine → wire into `prism_cam` AND any
  vendor-specialized dispatcher (mastercam, hypermill, etc.) that
  consumes its output.
- A new reasoning engine → wire into `prism_ai` AND
  `prism_intelligence` if both routing surfaces apply.

Verification:
- `stop-auto-wire.mjs` (Stop hook, NOW WIRED) audits new engine /
  hook / skill files, warns on missing dispatcher references.
- `stop_on_unwired_assets.mjs` HARD BLOCKS Stop when an engine has
  zero dispatcher imports.
- New acceptance criterion in tests: a round-trip E2E assertion that
  invokes the engine **through every wired dispatcher**, not only
  the singleton.

If you genuinely intend an engine to be wrapped by a singleton (e.g.
`QdrantMemoryEngine` ← `QdrantMemoryEngineSingleton`), tag it with a
`// WIRE-EXEMPT: <reason>` comment that names the wrapper.
