---
name: feedback-wiki-for-how-to-memory-for-pointers
description: "Operator-set convention 2026-05-27 — follow delta's example. Wiki holds procedural how-to + architecture + templates; memory holds facts/pointers/feedback. Procedural docs >100 lines belong in wiki, not memory."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.454Z
aliases: feedback_wiki_for_how_to_memory_for_pointers
---


# Wiki for how-to, memory for pointers (delta's convention)

**Rule (operator directive 2026-05-27):** When generating templates, runbooks, procedural docs, or any extended how-to-do-X content, **write to `H:/prism/knowledge/wiki/`, NOT to the memory dir.** Memory is for facts, pointers, and standing-doctrine feedback only.

**Why:** Delta has established the pattern at scale — see `knowledge/wiki/code-tribal/templates/cad-<vendor>__<feature>.md` (cad-fusion-360__form-conceptual, cad-rhino__animation, cad-rhino__boolean-csg, cad-onshape__sketch-2d, etc.). Memory was designed for ~150-char pointers + standing-doctrine feedback; long procedural docs in memory bloat the always-loaded MEMORY.md index and never end up auto-cross-referenced into the wiki graph.

**How to apply:**

| Content type | Goes to | Example |
|---|---|---|
| Procedural how-to (>50 lines) | `knowledge/wiki/architecture/<topic>.md` or `knowledge/wiki/code-tribal/<topic>.md` | open-source-vision-options-for-blueprint-ocr.md |
| Per-vendor / per-domain template | `knowledge/wiki/code-tribal/templates/<domain>__<feature>.md` | cad-fusion-360__form-conceptual.md |
| Lessons / mistake-learning entry | `knowledge/wiki/lessons/<topic>.md` | bug-findings-wiki-gate.md |
| Architecture decision | `knowledge/wiki/decisions/<topic>.md` or specs | spec-juliett-token-optimization-audit-2026-05-17.md |
| Where-things-are pointer | `C:/Users/wompu/.claude/projects/H--PRISM/memory/reference_*.md` | [[reference_cam_corpus_locations]].md |
| Standing doctrine / behavior rule | `C:/.../memory/feedback_*.md` | [[feedback_use_lima_pypdf_page_extractor]].md |
| Cross-session brain state | `C:/.../memory/project_*.md` (rare) | — |

**The memory→wiki promotion path:** if you find yourself writing the SAME how-to procedure into multiple memories, that's the signal — promote it to a single wiki entry and have each memory carry a `[[wiki-link]]` pointer instead.

**Cross-refs:**
- [[reference_u_vault01_knowledge_vault_schema]] — the 4-namespace doctrine (memory + wiki + commands + handoffs)
- [[feedback_reflect_all_changes_post_update]] — update all 4 surfaces on every change-set, no silent drift

**Audit:** when in doubt, "could a future kilo session understand this by reading just the memory pointer + the linked wiki entry?" If yes → split it. If no → keep it together in wiki.
