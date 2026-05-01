---
name: autofire-compact
enabled: true
event: prompt
pattern: (prepare\s+for\s+compact|pre-?compact|context\s+(is\s+)?(getting\s+)?(heavy|full|large|bloated)|running\s+(low\s+on|out\s+of)\s+context|compaction\s+coming|slim\s+down\s+context|context\s+pressure|save\s+context\s+before|trim\s+(the\s+)?context|too\s+much\s+context|token\s+budget|context\s+window\s+(is\s+)?(almost\s+)?(full|limit))
action: warn
---

Use `/compact` for pre-compaction preparation. Invoke with the Skill tool: `skill: "compact"`. This chains handoff + memory trimming + stale state cleanup in one command, maximizing what survives compaction. Quick check: `/compact status`.
