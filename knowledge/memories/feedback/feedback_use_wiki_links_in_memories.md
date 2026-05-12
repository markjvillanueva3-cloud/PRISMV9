---
name: Use wiki-link cross-references inside memory files
description: Vault parses [[X]] notation but C-side memories don't use them. Cross-referencing inside memory files = free token win for navigation.
type: feedback
originSessionId: cee63f1f-130d-4ed3-baf2-1d8812d9acb2
---
Use `[[wiki-link]]` notation inside memory file bodies whenever one memory references another concept, file, engine, or memory.

**Why:** `ObsidianVaultSyncEngine.extractWikiLinks()` already parses `/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g` from every vault file and feeds the link graph back into PRISM. The C-side memory files we author are mirrored verbatim into the vault — so any `[[X]]` we add is a free cross-ref the moment the PostToolUse hook runs. Currently most memory bodies are pure prose with no link markup, so the link graph under-represents what we actually know.

**How to apply:**

- When mentioning another memory by name, write `[[reference_obsidian_vault_subdirs]]` (no extension), not "see reference_obsidian_vault_subdirs.md".
- When mentioning an engine, dispatcher, or wiki entry, link it: `[[ObsidianMemoryRagEngine]]`, `[[prism_memory]]`, `[[KienzleCoefficients]]`.
- For file paths that aren't a vault concept, leave them as plain text — wiki-links are for navigable concepts only.
- Aliases use `[[target|display text]]` — useful when the concept name is ugly.
- Don't go wild: 2–4 links per memory is the sweet spot. Over-linking reduces signal, same as over-tagging.
- This is forward-looking only — don't bulk-edit existing memories to add links unless we're already touching them for content reasons (churn cost > benefit).

Validates against [[Karpathy LLM-Wiki]] pattern (see `[[reference_karpathy_llm_wiki_external_validation]]`).
