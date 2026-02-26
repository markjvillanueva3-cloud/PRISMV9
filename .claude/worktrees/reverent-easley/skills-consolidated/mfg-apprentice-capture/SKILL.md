---
name: mfg-apprentice-capture
description: Capture and preserve experienced machinist knowledge
---

# Tribal Knowledge Capture

## When To Use
- An experienced machinist shares a tip or trick that should be preserved
- Documenting shop-floor wisdom before a senior operator retires
- Recording material-specific insights learned from production runs
- Building a searchable knowledge base of hard-won manufacturing experience

## How To Use
```
prism_intelligence action=apprentice_capture params={knowledge: "When machining Inconel 718, reduce speed 15% after first pass due to work hardening", source: "J. Smith, 30yr machinist", tags: ["inconel", "speed", "work-hardening"]}
prism_intelligence action=apprentice_knowledge params={query: "inconel tips", limit: 10}
```

## What It Returns
- `capture_id` — unique identifier for the captured knowledge entry
- `knowledge_entries` — list of matching tribal knowledge records
- `source` — attribution to the machinist or operator who contributed
- `tags` — categorization tags for retrieval and cross-referencing
- `confidence` — reliability rating based on source experience and corroboration

## Examples
- Capture a speed tip: `apprentice_capture params={knowledge: "For 17-4PH in H900 condition, use 40% lower feed than datasheet suggests to avoid chipping", source: "Mike R., lead machinist"}` — stores entry with auto-generated tags
- Search for titanium knowledge: `apprentice_knowledge params={query: "titanium Ti-6Al-4V tips"}` — returns 6 entries covering coolant pressure, tool life, and chatter avoidance
- Capture setup trick: `apprentice_capture params={knowledge: "Use 0.002in shim under vise jaw for thin-wall parts to prevent distortion", tags: ["setup", "thin-wall", "workholding"]}` — records with workholding category
