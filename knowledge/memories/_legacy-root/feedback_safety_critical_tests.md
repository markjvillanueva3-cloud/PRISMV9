---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/feedback_safety_critical_tests.md
source_filename: feedback_safety_critical_tests.md
content_hash: 87fb02773f19ae51bbb850b90531c1d87d9670ac36ed049dcb9a8248f525bf72
mirror_ts: 2026-05-05T13:00:09.469Z
mirror_engine: ObsidianMemorySyncEngine
---

Tests at ANY stage must be real tests that prove and validate what was built actually works. This is safety-critical — generating improper tests can kill someone.

**Why:** PRISM generates CNC programs that control machines capable of killing operators. A test that passes with `toBeGreaterThan(0)` proves nothing — the generated offset could be 10x too large, the wire could break, the machine could crash into the workpiece. The user explicitly stated this is a matter of life and death.

**How to apply:**
- NEVER write tests that use loose ranges (±250% tolerance) — use ±5-15% of published values
- NEVER write `expect(value).toBeGreaterThan(0)` or `toBeDefined()` as the only assertion
- ALWAYS validate output against published Klocke/manufacturer data with specific expected values
- ALWAYS include safety limit checks (wire current density, machine axis limits, min radius)
- ALWAYS include failure cases (NaN, zero thickness, impossible targets)
- Physics engines: minimum 5 material×thickness combos validated against published data
- G-code generators: parse output back and verify coordinates match input geometry
- This applies to ALL roadmap tracks, not just Wire EDM — all CNC is inherently dangerous
