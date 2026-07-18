---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/reference_box_programs.md
source_filename: reference_box_programs.md
content_hash: 91fd9ab3e0ebda2aa29522be4e267020866a2e2d1c56a4f2f192ef9a2f7eaa0a
mirror_ts: 2026-05-05T13:00:09.535Z
mirror_engine: ObsidianMemorySyncEngine
---

## Box Cloud CNC Programs

User transferred their shop's existing CNC programs from their **Box cloud account** to the H: drive for use as reference programs.

**Critical context:**
- Programs were written by **complete amateurs** — far from optimized
- These are REAL production programs that make REAL parts (cold heading dies, hex pins, etc.)
- They represent the shop's **current state** — what PRISM needs to improve upon
- They are useful as:
  1. **Reference for what parts they actually make** (part families, features, materials)
  2. **Baseline for optimization** — compare PRISM output vs current programs
  3. **Tribal knowledge extraction** — even amateur programs encode process decisions
  4. **Test fixtures** — run these through the pipeline, verify PRISM produces better output

**How to apply:** When building lathe programs, compare against these reference programs. PRISM should produce programs that are measurably better: faster cycle time, safer, better surface finish, proper speeds/feeds. The gap between these amateur programs and PRISM's physics-optimized output is the value proposition.

**Location:** Should be on H: drive (check H:\PRISM\RESOURCE PDFS\ or H:\prism\reference-programs\ or similar)
