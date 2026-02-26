---
name: mfg-assist-search
description: Search and browse the PRISM assistance knowledge base
---

# Search Assistance Knowledge Base

## When To Use
- Looking for help topics across the PRISM manufacturing knowledge base
- Browsing available assistance categories before drilling into a specific topic
- Finding related guidance across materials, operations, and tooling domains
- Discovering which PRISM skills and tools are relevant to a manufacturing question

## How To Use
```
prism_intelligence action=assist_search params={
  query: "titanium best practices",
  filters: { domain: "milling", max_results: 10 }
}
```

**Parameters:**
- `query` (required): Natural language search query or keyword(s)
- `filters` (optional): Narrow results by domain, material family, operation type, or skill level
- `max_results` (optional): Limit number of returned topics (default 10)

## What It Returns
- `matched_topics`: Array of results, each containing:
  - `title`: Topic heading
  - `relevance`: Score from 0.0 to 1.0
  - `summary`: Brief description of what the topic covers
  - `skill_ref`: The PRISM skill that handles this topic (e.g., mfg-assist-explain)
  - `domain`: Material, tooling, operation, or safety category
- `related_skills`: Other PRISM skills relevant to the search query
- `suggested_workflows`: Multi-step workflows that combine several skills for the query topic
- `total_matches`: Total number of matches (may exceed max_results)

## Examples
- **Broad Search**: `query: "titanium"` → 12 matched topics covering speed/feed optimization, coolant strategy, tool coating selection, safety precautions, tool life prediction, and work hardening avoidance
- **Specific Search**: `query: "thread milling G-code"` → 3 matched topics: thread mill parameter calculation, G-code generation for thread milling, single-point vs helical thread milling comparison
- **Filtered Search**: `query: "surface finish", filters: { domain: "turning" }` → 5 topics on nose radius effects, feed rate vs Ra, insert wiper geometry, vibration-induced chatter marks, and coating influence on finish
- **Workflow Discovery**: `query: "new job setup checklist"` → suggested workflow combining mfg-assist-mistakes, mfg-assist-safety, and mfg-job-plan into a complete pre-production preparation sequence
