---
name: autofire-digest-all
type: autofire
description: Suggest /digest-all when user starts exploring the codebase without loading the digest system first
trigger_pattern: "what files|how many engines|where are the|show me the directory|list all engines|explore the codebase|file structure|directory structure|folder structure"
action: suggest
message: "Use `/digest-all` to load the full system map in ~1100 tokens (DIRECTORY_DIGEST + DSL_COMPACT + PATH_INDEX) before exploring with Glob/Grep."
enabled: true
---
