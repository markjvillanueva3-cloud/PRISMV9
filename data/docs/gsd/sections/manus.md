## MANUS 6 LAWS — Context Engineering Principles

### Law 1: KV-Cache Stability
What: Sort JSON keys alphabetically for consistent caching across calls.
Tool: prism_context→kv_sort_json, kv_check_stability
Benefit: Same data = same cache key = better LLM consistency.

### Law 2: Mask Don't Remove
What: Hide irrelevant context rather than deleting it. It may be needed later.
Tool: prism_context→tool_mask_state
Benefit: Masked content can be unmasked. Deleted content is gone forever.

### Law 3: File System as Context
What: Externalize state to disk. Read back when needed. Don't keep everything in context.
Tools: prism_context→memory_externalize/restore, prism_doc→write/read
Benefit: Context window stays clean. Disk is unlimited. State persists across compaction.
Pattern: Save working state to COMPACTION_SURVIVAL.json, WIP files, ACTION_TRACKER.md.

### Law 4: Attention via Recitation
What: Repeat important info periodically to keep it at high attention weight.
Tool: prism_context→todo_update (refreshes every 5 calls via cadence)
Benefit: Goals at END of context = highest attention weight. Prevents drift.
Pattern: todo_update anchors current task, focus, next action at context bottom.

### Law 5: Keep Wrong Stuff
What: Errors are learning data. Don't delete them — store and learn from them.
Tool: prism_context→error_preserve, error_patterns
Benefit: D3 error chain extracts patterns. Known errors detected on first recurrence.
Pattern: autoD3ErrorChain fires on every error — extract→detect→store.

### Law 6: Don't Get Few-Shotted
What: Vary responses to avoid pattern lock-in from repetitive examples.
Tool: prism_context→vary_response (auto-fires @20 calls)
Benefit: Prevents degenerate response loops where same pattern repeats.

## Changelog
- 2026-02-10: v3.0 — Content-optimized. Added tools, benefits, patterns for each law.
- 2026-02-10: v2.0 — File-based. Added descriptions.
