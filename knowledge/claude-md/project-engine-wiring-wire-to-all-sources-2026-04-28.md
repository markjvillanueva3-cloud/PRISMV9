---
schema_version: 1.0.0
source: project
section: ENGINE WIRING — WIRE TO ALL SOURCES (2026-04-28)
slug: engine-wiring-wire-to-all-sources-2026-04-28
start_line: 61
end_line: 74
indexed_at: 2026-05-05T13:49:55.467Z
content_hash: db2e4c9a6644121d2536868e73ad48db490fd834f62e2868042fa0affcce6a62
mirror_engine: ClaudeMdChunkerEngine
---
## ENGINE WIRING — WIRE TO ALL SOURCES (2026-04-28)
When generating an engine, do NOT stop at one dispatcher. Wire to **every dispatcher that would naturally consume it**, in the same commit. Examples:
- New memory engine → `prism_memory` AND specialized consumer (e.g. `prism_guard:error_ledger_*`)
- New physics engine → `prism_calc` AND `prism_safety` (if it computes safety-relevant)
- New CAM engine → `prism_cam` AND vendor-specialized (mastercam, hypermill, etc.)
- New reasoning engine → `prism_ai` AND `prism_intelligence`

Verification:
- `stop-auto-wire.mjs` (Stop hook, NOW WIRED) audits new engines/hooks/skills, warns on missing dispatcher refs.
- `stop_on_unwired_assets.mjs` HARD BLOCKS Stop on zero-dispatcher orphans.
- Test acceptance criterion: round-trip E2E assertion through every wired dispatcher (not only the singleton).

If an engine is genuinely wrapped by a singleton (e.g. `QdrantMemoryEngine` ← `QdrantMemoryEngineSingleton`), tag it `// WIRE-EXEMPT: <reason>` naming the wrapper.
