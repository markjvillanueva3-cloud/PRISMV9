---
name: memory-curation-discipline
category: software-engineering
domain: backend-dev
tags: [memory, wiki, tribal, curation, knowledge-vault, claude-md, prism-development, ai-development]
last_updated: 2026-05-18
---

# Memory Curation Discipline — where does this fact go?

PRISM has 5 namespaces for knowledge. Putting a fact in the wrong one means it won't surface when needed. The decision matrix is load-bearing.

## The 5 namespaces

| Namespace | Path | Lifetime | Scope |
|-----------|------|----------|-------|
| auto-memory | `C:\Users\<u>\.claude\projects\H--PRISM\memory\` | Cross-session | Per-user; auto-curated; flows to Obsidian |
| wiki | `knowledge/wiki/{code-tribal,software-engineering,architecture,lessons,patterns}/` | Project lifetime | All chats; doctrine + how-to |
| commands (skills) | `.claude/commands/*.md` | Project lifetime | Slash-command surface |
| handoffs | `state/shared/handoffs/HANDOFF-*.md` | Inter-session | Per-chat; consumed by next session |
| specs | `state/shared/specs/UNITS/U-*.md` | Project lifetime | Per-unit; the contract for a build |

CLAUDE.md is **NOT a 6th namespace** — it's a doctrine pointer index, ≤200 lines of pointers into the other 5.

## The decision matrix

Ask: **who/what consumes this fact, and when?**

| Consumer | When | Goes in |
|----------|------|---------|
| Future-me (this user) | Across sessions | auto-memory (`user`/`feedback`/`project`/`reference`) |
| Any chat working on PRISM | Any time | wiki (code-tribal / software-engineering) |
| Operator typing a slash command | On invocation | command (`.claude/commands/`) |
| Next session in THIS chat | After /compact | handoff (`HANDOFF-<id>-<topic>.md`) |
| Future build of this unit | When unit is built | spec (`state/shared/specs/UNITS/U-XXX.md`) |
| Every chat, every prompt, the doctrine layer | Always | CLAUDE.md pointer ↓ wiki entry |

## Promotion path

Knowledge flows up the promotion path as it proves load-bearing:

```
fleeting (in-chat) → memory (cross-session) → wiki (project-lifetime) → CLAUDE.md pointer (always-loaded)
```

Going backwards (demotion) is OK when a fact becomes stale: archive the wiki entry to `_archive/`, strip the CLAUDE.md pointer, leave the memory entry as historical record.

## Back-flow: regression → "## Recent regressions"

Every regression fix flows backward into CLAUDE.md's `## Recent regressions` ledger via the `regression-auto-write.mjs` Stop hook. Append-only, line-bounded, indefinite retention. The ledger is the doctrine-against-recurrence rail.

## Rules per namespace

### auto-memory

- ≤ 200 chars in MEMORY.md index pointer
- Detail in the linked .md file (named `<type>_<topic>.md`)
- Frontmatter: `name`, `description`, `metadata.type` (feedback/reference/project/user)
- Body structure for feedback/project: lead with rule/fact, then **Why:** and **How to apply:** lines

### wiki

- Frontmatter: `name`, `category`, `domain`, `tags`, `last_updated`, optionally `sources`
- Title: imperative (`Engine Creation Playbook`) not nominal (`About Engine Creation`)
- Length: 50-150 lines typical; under 200 lines for the wiki-precheck recall to surface as a complete chunk
- Cross-links: `[[wiki-name]]` to related entries; always link to CLAUDE.md sections by path

### specs

- Lives at `state/shared/specs/UNITS/U-<CODE>.md`
- Per-milestone subdir: `state/shared/specs/<MILESTONE>/U-<CODE>.md` when milestone has multiple units
- Sections: goal · file list · invariants · verification command · output format · doctrine refs
- ADVISORY-flag if the spec describes a non-binding rec (e.g., audit deliverable)

### handoffs

- One file per chat per session — never overwrite a peer's
- `--source live-chat` flag required; auto-writer is BANNED
- RESUME directive must be SPECIFIC ("Continue X at file Y line Z"), not generic ("continue working")
- Topic suffix mandatory (enforce-handoff-topic.mjs renames topicless files)

## What NOT to save (the auto-memory exclusions)

- Code patterns, conventions, architecture, file paths — derivable from current project state
- Git history, recent changes, who-changed-what — `git log` / `git blame` are authoritative
- Debugging solutions or fix recipes — the fix is in the code; the commit body has context
- Anything already in CLAUDE.md
- Ephemeral task details: in-progress work, current conversation context

These exclusions apply even when explicitly asked to save. If the user asks to save a PR list or activity summary, ask what was **surprising** or **non-obvious** about it — that's the part worth keeping.

## The "before recommending from memory" check

A memory that names a specific function/file/flag is a claim that the entity existed WHEN THE MEMORY WAS WRITTEN. It may have been renamed, removed, or never merged. Before recommending:
- If memory names a file path: check the file exists
- If memory names a function/flag: grep for it
- If user is about to act on the recommendation: verify first

"The memory says X exists" is not the same as "X exists now."

## When two namespaces conflict

If the same fact lives in both auto-memory and wiki, the wiki wins as the authoritative version (it's project-scoped, peer-visible). The auto-memory entry should become a pointer to the wiki entry.

If CLAUDE.md and wiki disagree, FIX BOTH — usually CLAUDE.md was the rapid-doctrine entry and the wiki page has fuller detail; keep them aligned per the "4-surface doc reflection" rule.

## Related

- [[regression-prevention-doctrine]] — Recent regressions back-flow
- [[obsidian-vault-integration]] — what reaches the vault
- CLAUDE.md "KNOWLEDGE VAULT — 5-namespace schema (U-VAULT01, 2026-05-15)"
- CLAUDE.md "PRISM Wiki Index" + WIKI_SCHEMA.md
- User CLAUDE.md "auto memory" section — canonical
