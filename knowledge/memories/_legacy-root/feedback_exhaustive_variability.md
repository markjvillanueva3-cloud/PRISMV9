---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/feedback_exhaustive_variability.md
source_filename: feedback_exhaustive_variability.md
content_hash: bd59eaaa174b2feb6052eed388378760ae005b17e1bb457cafc6d789b9e148ad
mirror_ts: 2026-05-05T13:00:09.437Z
mirror_engine: ObsidianMemorySyncEngine
---
When implementing a PRISM roadmap unit, treat the stated requirements as a floor, not a ceiling.

**Exhaustive coverage**: enumerate the full domain space the unit touches (every op kind, every failure mode, every controller/workbench, every unit, every locale, every edge). Cover them all in the engine. When in doubt, add more — the user prefers over-coverage over gaps.

**Max variability in tests**:
- Minimum 10 is a floor — aim for 20-40 per engine.
- Vary inputs across boundary conditions (zero, negative, extreme, NaN, empty, oversized).
- Vary units (mm / cm / in / deg / rad) when the surface accepts them.
- Vary shapes (valid, invalid, partially-invalid, adversarial).
- Separate positive paths, negative paths, edge paths.
- Test each failure mode of a taxonomy individually, not just one representative.
- Include at least one timing / throttle / retry path where the engine has temporal behavior.

**Why**: The user's directive goal tracker explicitly says "exhaustively and always do your best to max out variability." Past sessions that shipped minimum-viable versions had to be reworked. Over-building is cheaper than under-building.

**How to apply**:
- On any new engine build: declare the full capability matrix first, then implement every declared op.
- On any test suite: enumerate every category (happy / error / edge / limit / retry / throttle / locale / unit-conversion) and write cases for each.
- When writing the commit message, list categories covered — the user reviews these to confirm exhaustiveness.
- Never stop at "≥10 tests" — that's the contract floor, not the goal.
