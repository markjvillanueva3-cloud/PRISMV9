---
title: "feedback-obsidian-brain"
name: feedback-obsidian-brain
kind: reference
status: promoted
category: lessons
domain: knowledge-vault
promoted_from: knowledge/memories/feedback/feedback_obsidian_brain.md
promoted_at: 2026-06-06T04:55:49.664Z
source_refs: 15
---

# Obsidian brain — PSN leg #1 (the cross-session persistent memory layer)

**Obsidian brain ≡ the persistent memory namespace at `C:\Users\<u>\.claude\projects\H--prism\memory\*.md` that auto-syncs to `H:/prism/knowledge/memories/{feedback,reference,project,user,patterns,mistakes,inbox}/*.md`.** It's PSN leg #1 ([[feedback_psn_definition]]) — the cross-session brain that survives compaction, terminal close, and machine reboot. Same orphan-pattern fix as PSK: doctrine concept buried in CLAUDE.md §Doc reflection rule + 3 other memories with no dedicated entry.

## What's in it

| Surface | Path | Owner |
|---|---|---|
| Per-session auto-memory | `C:\Users\<u>\.claude\projects\H--prism\memory\*.md` | Claude session (writes) |
| Repo-side mirror | `H:/prism/knowledge/memories/{feedback,reference,project,user,patterns,mistakes,inbox}/*.md` | Stop hook (auto-feed) |
| Memory index | `C:\Users\<u>\.claude\projects\H--prism\memory\MEMORY.md` | hard 24576B cap, soft 22000B |
| Legacy reconcile | `knowledge/memories/_legacy-root/` | Stop hook non-destructive merge |

The 5 frontmatter `type:` values (feedback / reference / project / user / patterns) determine the destination subdirectory. `inbox/` is the fleeting layer for un-categorized notes pending promotion.

## Auto-feed mechanism (Stop hook)

`.claude/hooks/stop-obsidian-memory-feed.mjs` (dedicated, decoupled from the Ollama-gated extract hook):

1. Walks `C:\Users\<u>\.claude\projects\H--prism\memory\*.md`.
2. Routes each file to `H:/prism/knowledge/memories/<frontmatter-type>/` (5 type-slot router).
3. Owns its own 3-min global throttle (knob `PRISM_OBSIDIAN_FEED_INTERVAL_MS`).
4. O_EXCL lock prevents concurrent-write corruption across the 26-chat fleet.
5. Non-destructive: legacy-root entries reconcile, never silently clobber.

Disable: `PRISM_OBSIDIAN_FEED_DISABLE=1`. Wiki: `knowledge/wiki/architecture/obsidian-memory-feed-hook.md`.

## The "virtually no token usage" promise

This is the user's directive — *"the whole point of the obsidian brain, [[feedback_prism_os|prism os]] system was so that you always utilize memories and wikis automatically with virtually no token usage"*. The promise is delivered by **two cooperating UserPromptSubmit injectors**:

- `memory-relevance-inject.mjs` — BM25-lite over the 500+ memory files; surfaces top-K hits per prompt.
- `wiki-precheck-inject.mjs` — top-K wiki entries from the ~28K-entry knowledge wiki.

Plus `master-index-precheck-inject.mjs` covers [[reference_system_viz|system-viz]] nodes, and `tribal-by-domain-inject.mjs` covers tribal tips. **All four fire on every UserPromptSubmit at near-zero token cost** — the cost is the injected top-3-to-5 hit block, not a full search round-trip.

The corollary: **if a doctrine concept doesn't have its own memory file, the auto-injectors can't surface it** — they only retrieve files matching query tokens. This is the orphan-pattern bug that [[feedback_psn_definition]] (and now this entry, plus [[feedback_r5_thru_r12_doctrine]] / [[feedback_karpathy_discipline]] / [[feedback_psk_kernel]]) are closing.

## Distinction from the wiki

- **Memory** = cross-session brain (per-claude transient → durable via Stop-hook feed). Variable lifetime. Examples: feedback, references, project notes, mistake-records.
- **Wiki** = project-lifetime architecture (`knowledge/wiki/`, ~28K entries). Decisions, lessons, architecture maps. See `WIKI_SCHEMA.md` and the [[feedback_psn_definition]] surface-table.
- **Promotion path**: fleeting → memory → wiki → CLAUDE.md doctrine pointer.

## Standing rule

- When you learn something durable, write a memory in `C:` (frontmatter type = feedback/reference/project/user/patterns). The Stop hook auto-syncs.
- When you've burnt 3+ memories on the same pattern, promote to a wiki entry under `knowledge/wiki/`.
- When the wiki entry becomes load-bearing across sessions, add a one-line pointer to CLAUDE.md.
- **Never** write a feedback/reference doctrine concept inside another memory's body — auto-injectors can't surface it; promote it to its own file.

## Cross-refs

- [[feedback_psn_definition]] — the 11-leg PSN; this is leg #1
- [[feedback_auto_memory_feeds_obsidian_stophook]] — the auto-feed mechanism
- [[feedback_reflect_all_changes_post_update]] — doc-reflection rule (4 surfaces: CLAUDE.md + MEMORY.md + wiki + Obsidian)
- [[reference_session_continuity_stack_2026_05_15]] — Stop-hook plumbing
- [[feedback_prism_os]] — sibling PSN leg #2

## Source

Promoted from memory [[feedback_obsidian_brain]] (referenced 15x across the vault). The memory remains the editable source of truth.
