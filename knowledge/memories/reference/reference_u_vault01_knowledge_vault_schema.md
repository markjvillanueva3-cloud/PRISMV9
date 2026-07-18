---
name: reference-u-vault01-knowledge-vault-schema
description: "KNOWLEDGE-VAULT-MS0/U-VAULT01 — 5-namespace vault schema (memory + wiki + commands + handoffs + specs). CLAUDE.md is the doctrine pointer index, NOT a 6th namespace. Defines promotion paths (capture→memory→wiki→CLAUDE.md), back-flow paths (regression→CLAUDE.md"
aliases: reference_u_vault01_knowledge_vault_schema
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.245Z
---


# U-VAULT01 — Knowledge Vault Schema

Shipped 2026-05-15 by slot alpha (claude-6eac1b66) as the foundation for KNOWLEDGE-VAULT-MS0 (6-unit milestone).

## The 5 namespaces

| # | Namespace | Path | Lifetime | Who writes |
|---|---|---|---|---|
| 1 | memory | `C:/Users/<user>/.claude/projects/H--PRISM/memory/` | Cross-session | live chat only |
| 2 | wiki | `H:/prism/knowledge/wiki/` | Project-lifetime | live chat + regen |
| 3 | commands | `H:/prism/.claude/commands/` | Project-lifetime | live chat (manual) |
| 4 | handoffs | `H:/prism/state/shared/handoffs/HANDOFF-*.md` | Inter-session | live chat (handoff-writer-ban hook enforces) |
| 5 | specs | `H:/prism/state/shared/specs/*.md` (+ `.html` companion per U-HPS01) | Indefinite | live chat |

## CLAUDE.md's role

NOT a 6th namespace. It is the **doctrine pointer index** — ≤200 lines of dense doctrine + `[[memory-slug]]` / `[[wiki-entry]]` pointers. When a section grows past ~15 lines it gets extracted into a wiki entry and replaced with a 2-line pointer.

## Promotion path (fleeting → memory → wiki → CLAUDE.md)

```
capture           promote          enshrine
fleeting ──→ memory ──→ wiki ──→ CLAUDE.md
  (chat)    (cross-     (project-    (doctrine
            session)    lifetime)    pointer)
```

- **Capture → memory:** chat writes `feedback_<slug>.md` / `reference_<slug>.md` / `project_<slug>.md` / `user_<slug>.md` in the moment.
- **Memory → wiki (U-VAULT02 engine — pending):** memories with ≥3 references and ≥7-day age promote to a wiki entry; original memory keeps `[[wiki-entry]]` cross-link.
- **Wiki → CLAUDE.md (U-VAULT03 hook — pending; partially live as `## Recent regressions` back-flow):** load-bearing rules surface as 2-line pointers.

## Back-flow path (Boris pattern)

```
regression ─→ CLAUDE.md ## Recent regressions ─→ memory or wiki entry
```

Today manual; U-VAULT03 hook will automate from blocked-tool-call patterns.

## Per-namespace invariants

1. Every memory file has frontmatter with `name` / `description` / `metadata.type`.
2. Every wiki entry has frontmatter with `title` / `kind` / `status`.
3. Every command (skill) has frontmatter validated by [[reference_u_ck06_command_frontmatter_schema]] (33/167 baseline).
4. Every handoff has `session` / `topic` / `slot` / `written_at` + `## STATE` + `## RESUME` sections.
5. Every spec has an HTML companion at the same stem (94.4 % coverage today; U-HPS01 enforces).

## Unblocks

- **U-VAULT02** — Memory→wiki promotion engine (now has target schema)
- **U-VAULT03** — CLAUDE.md back-flow hook
- **U-VAULT05** — Domain MOC generator (Nick Milo pattern)
- **U-VAULT06** — Vault-rot sentinel (90-day untouched threshold)
- **WIKI-EVOLVE-MS0/U-WIKI-FLEETING-PROMOTE** — Matuschak evergreen pattern (depends on U-VAULT02)

## Related

- Wiki entry (canonical source): [`knowledge/wiki/architecture/knowledge-vault-schema.md`](../../../../prism/knowledge/wiki/architecture/knowledge-vault-schema.md)
- [[reference_u_ck06_command_frontmatter_schema]] — commands namespace schema
- [[feedback_reflect_all_changes_post_update]] — drives the promotion paths
- [[feedback_always_close_out]] — every milestone touches the 4 namespaces in close-out
- [[reference_session_continuity_stack_2026_05_15]] — first canonical "touch all 4 surfaces" example
