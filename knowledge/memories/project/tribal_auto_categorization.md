---
name: Tribal Knowledge Auto-Categorization System
description: All tribal knowledge tips are auto-categorized on capture/ingest via ContentAutoTaggerEngine. Stop hook ensures no un-categorized tips persist. UserPromptSubmit hook injects context when tribal knowledge is discussed.
type: project
originSessionId: 8091cec3-cc47-4c85-a178-f7abaaea8614
source: prism-memory
synced: 2026-04-27T00:20:43.190Z
aliases: tribal_auto_categorization
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


## Related
[[engines/TribalKnowledgeEngine|TribalKnowledgeEngine]] • [[engines/ContentAutoTaggerEngine|ContentAutoTaggerEngine]] • [[dispatchers/prism_knowledge|prism_knowledge]]