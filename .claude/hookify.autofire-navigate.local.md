---
name: autofire-navigate
type: autofire
description: Suggest /navigate or /digest-all when user asks where to find code, files, or components
trigger_pattern: "where is|where do I find|where.s the code for|which directory|which folder|find the file|locate"
action: suggest
message: "Use `/navigate <topic>` for instant zero-IO file location, or `/digest-all` to load the full system map."
enabled: true
---
