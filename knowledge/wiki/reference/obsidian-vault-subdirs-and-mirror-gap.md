---
title: "Obsidian vault subdirs and mirror gap"
name: obsidian-vault-subdirs-and-mirror-gap
kind: reference
status: promoted
category: reference
domain: knowledge-vault
promoted_from: knowledge/memories/reference/reference_obsidian_vault_subdirs.md
promoted_at: 2026-06-06T04:55:55.491Z
source_refs: 4
---

# Obsidian vault subdirs and mirror gap

The H-drive Obsidian vault at `H:/prism/knowledge/memories/` contains these subdirs (one concept per file, atomic-note style):

- `architecture/`
- `code-tribal/`
- `concepts/`
- `consensus/`
- `decisions/`
- `entities/`
- `lessons/`
- `patterns/`
- `summaries/`
- `trajectories/`
- `ux-design/`

**Mirror coverage gap.** `H:/prism/.claude/hooks/memory-mirror-to-vault.mjs` (PostToolUse) only routes by filename prefix:

```js
const CATEGORY_PREFIXES = {
  feedback_: "feedback",
  project_: "project",
  user_: "user",
  reference_: "reference",
  mistakes_: "mistakes",
  mistake_: "mistakes",
  patterns_: "patterns",
  pattern_: "patterns",
};
```

Filenames not matching → `uncategorized/`. **No prefix maps to `lessons/` or `decisions/`** — so those vault subdirs only fill if Claude or Ollama writes there directly (e.g. via wiki ops or `prismCreativeReasoningEngine`), never from the C-side memory system.

**How to apply:**

- When writing a memory of type "lesson learned" or "architectural decision," prefix is forced into `feedback_` or `project_` to fit the existing routing — don't invent `lesson_*.md` because it'll land in `uncategorized/`.
- If we ever want full vault coverage, add `lesson_: "lessons"` and `decision_: "decisions"` to `CATEGORY_PREFIXES` (one-line patch to memory-mirror-to-vault.mjs).
- Until then: `lessons/` and `decisions/` populate from wiki authoring, not from this auto-memory system.
- Source: `H:/prism/.claude/hooks/memory-mirror-to-vault.mjs` lines 35–53.

## Source

Promoted from memory [[reference_obsidian_vault_subdirs]] (referenced 4x across the vault). The memory remains the editable source of truth.
