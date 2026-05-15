---
title: PRISM Knowledge Vault — Schema
kind: architecture
status: shipped
date: 2026-05-15
unit: U-VAULT01
milestone: KNOWLEDGE-VAULT-MS0
author: claude-6eac1b66 (slot alpha)
---

# PRISM Knowledge Vault — 5-Namespace Schema

Karpathy 3-layer pattern + Boris back-flow + Matuschak evergreen + Nick Milo MOCs applied to PRISM's existing substrate. This doc defines WHAT lives WHERE so the rest of KNOWLEDGE-VAULT-MS0 (memory→wiki promotion, MOC builder, vault-rot sentinel) has a stable target schema to compile against.

## The 5 namespaces

| # | Namespace | Path | Lifetime | Permanence | Who writes |
|---|---|---|---|---|---|
| 1 | **memory** | `C:/Users/<user>/.claude/projects/H--PRISM/memory/` | Cross-session | Permanent (auto-pruned via memory-prune skill) | live chat only (via `feedback_*` / `reference_*` / `project_*` / `user_*` slugs) |
| 2 | **wiki** | `H:/prism/knowledge/wiki/` | Project-lifetime | Permanent (auto-regenerated 21-stage pipeline) | live chat + regen scripts (mirrored from graph) |
| 3 | **commands** | `H:/prism/.claude/commands/` | Project-lifetime | Permanent | live chat (manually authored skills) |
| 4 | **handoffs** | `H:/prism/state/shared/handoffs/HANDOFF-*.md` | Inter-session | Ephemeral (each session writes a fresh one) | live chat only (handoff-writer-ban hook) |
| 5 | **specs** | `H:/prism/state/shared/specs/*.md` (+ `.html` companions per U-HPS01) | Indefinite | Permanent | live chat (audit / plan / design output) |

## What CLAUDE.md is (and isn't)

`CLAUDE.md` is **not** a 6th namespace. It is the **doctrine pointer index** that lives at the project + global level:

- **What CLAUDE.md contains:** rules (must always be true), pointers (`[[memory-slug]]`, `[[wiki-entry]]`), counts that operators need to check before re-deriving (and links to the auto-updated source), one-line headlines per shipped milestone with a wiki cross-link for the detail.
- **What CLAUDE.md must NOT contain:** the full implementation of a feature (lives in wiki); recipe-for-fix detail (lives in `_orphans-rescue.md` or a wiki entry); historical narrative (lives in memory).
- **Discipline:** ≤200 lines of dense doctrine. When a section grows past ~15 lines it should be extracted into a wiki entry and replaced with a 2-line pointer.

CLAUDE.md is the GLUE — it lets a fresh chat orient in <30 seconds and know where to drill for any deeper detail.

## Schema invariants (the things the rest of MS0 will enforce)

1. **Every memory file has** frontmatter with `name` (slug), `description` (one line), `metadata.type` (`feedback` | `reference` | `project` | `user`). Cross-links to other memories via `[[slug]]`. Mirror to vault is automatic via the `memory-mirror` PostToolUse hook.
2. **Every wiki entry has** frontmatter with `title`, `kind` (`architecture` | `engine` | `dispatcher` | `action` | `skill` | `hook` | `formula` | `algorithm` | `milestone` | `audit` | `pattern` | `lesson` | `decision` | `concept` | `entity` | `code-tribal`), `status` (`shipped` | `wip` | `planned` | `deprecated`). The 21-stage regen pipeline keeps the count + cross-links fresh.
3. **Every command (skill) has** frontmatter validated by [`.claude/schemas/command-frontmatter.schema.json`](../../.claude/schemas/command-frontmatter.schema.json) (U-CK06). Baseline today: 33/167 valid; the rest get the `tier` / `consumes` / `produces` / `composes_with` / `pipeline_integrations` fields populated by U-CK07 codemod + U-CK08 corpus migration.
4. **Every handoff has** `session`, `topic`, `slot`, `written_at` frontmatter + `## STATE` and `## RESUME` sections. Auto-resume hook ([[reference_session_continuity_stack_2026_05_15]]) reads RESUME on post-/compact.
5. **Every spec has** an HTML companion at the same stem (`SPEC-NAME.md` + `SPEC-NAME.html`) once U-HPS01 ships. Today's coverage is 94.4 % per the high-value-additions baseline.

## Promotion paths (the rituals the rest of MS0 will automate)

```
   capture           promote          enshrine
fleeting ──→ memory ──→ wiki ──→ CLAUDE.md
  (chat)    (cross-     (project-    (doctrine
            session)    lifetime)    pointer)
```

- **Capture → memory** — chat writes `feedback_<slug>.md` or `reference_<slug>.md` when learning something durable. NEVER batch: capture in the moment.
- **Memory → wiki (U-VAULT02 engine — pending)** — repeated memory references (≥3 hits, ≥7-day age) get promoted to a wiki entry. The original memory keeps its `[[wiki-entry]]` cross-link.
- **Wiki → CLAUDE.md (U-VAULT03 hook — pending; partially implemented as `## Recent regressions` back-flow)** — wiki entries that record load-bearing rules get a 2-line pointer in CLAUDE.md.

## Back-flow paths (Boris pattern)

```
regression ─→ CLAUDE.md ## Recent regressions ─→ memory or wiki entry
  (any chat encounters a known bug — captures the fix recipe)
```

Today the back-flow is manual ("user spotted the regression, I added an entry"). U-VAULT03 will make this automatic — a hook fires on every blocked-tool-call or failed-test pattern and appends to `## Recent regressions` with a 7-day retention window.

## MOC layer (Nick Milo pattern — U-VAULT05 pending)

Maps-of-Content live at `knowledge/wiki/architecture/_moc-<domain>.md` and surface "all wiki entries about X" in a curated order. Auto-built by walking the graph + filtering by frontmatter `kind` + domain tags.

Existing example: `knowledge/wiki/architecture/_orphans-rescue.md` is the MOC for "wiki entries that have no inbound links yet" — pulled into the regen pipeline.

## Vault-rot sentinel (U-VAULT06 pending)

Wiki entries / memory files that haven't been touched OR cross-linked from in ≥90 days are candidates for archival. Sentinel surfaces them in `state/shared/dashboards/vault-rot.md` for operator review.

## Companion files

- Schema for commands: `.claude/schemas/command-frontmatter.schema.json` (U-CK06, this session)
- Validator: `scripts/validate-command-frontmatter.mjs` (this session)
- Memory mirror hook: `.claude/hooks/memory-mirror.mjs` (existing)
- Wiki regen orchestrator: `scripts/regen-wiki-from-viz.mjs` (existing, 21-stage)
- Memory prune skill: `memory-prune` (existing)

## Related

- [[reference_session_continuity_stack_2026_05_15]] — the first canonical example of "touch all 4 surfaces per change" applied to this vault.
- [[feedback_reflect_all_changes_post_update]] — standing rule that drives the promotion paths.
- [[feedback_always_close_out]] — every milestone touches the 4 vault namespaces in close-out.
- COMMAND-KERNEL-MS0/U-CK04 — `knowledge/wiki/os/` namespace will extend this schema with entity frontmatter (planned).
- WIKI-EVOLVE-MS0/U-WIKI-FLEETING-PROMOTE — Matuschak evergreen pattern (depends on U-VAULT02).
