---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/tribal_auto_categorization.md
source_filename: tribal_auto_categorization.md
content_hash: f5880de0d232bb9d25f014f2b62a0a190b015b85d012eeedecc7a61a097d1e40
mirror_ts: 2026-05-05T13:00:09.546Z
mirror_engine: ObsidianMemorySyncEngine
---
Tribal knowledge auto-categorization is built into TribalKnowledgeEngine at the code level AND enforced via hooks.

**Why:** User requires all incoming data to be automatically categorized — no manual tagging burden.

**How to apply:**
- `capture()` and `ingest()` auto-enrich every tip via `autoCategorize()` which uses ContentAutoTaggerEngine
- Extracted: material_groups (ISO P/M/K/N/S/H), operation_types, machine_ids, workholding_type, domain, subcategory, auto_tags
- Category inferred from content if "general" or missing
- Domain classified: shop_floor, cam_software, drawing_standards, safety, video_learned, document_learned, etc.
- `tribal_recategorize` action (prism_knowledge dispatcher) recategorizes all existing captured tips
- Stop hook (`tribal-auto-categorize.mjs`) catches any un-categorized tips before session ends
- UserPromptSubmit hook (`tribal-categorize-reminder.mjs`) injects context when tribal knowledge is discussed
- New fields on KnowledgeTip: `domain`, `subcategory`, `auto_categorized`, `auto_tags`
- Stats include `by_domain` and `auto_categorized_count`
