---
title: "Handoff files must include topic suffix"
name: handoff-files-must-include-topic-suffix
kind: reference
status: promoted
category: lessons
domain: knowledge-vault
promoted_from: knowledge/memories/feedback/feedback_handoff_topic_naming.md
promoted_at: 2026-06-06T04:55:47.032Z
source_refs: 3
---

# Handoff files must include topic suffix

Every per-chat handoff written to `state/shared/handoffs/` must use the form `HANDOFF-<instance>-<topic>.md`. Topicless `HANDOFF-<instance>.md` is forbidden as a final state.

When invoking `per-agent-handoff.mjs write` directly, always pass `--topic <slug>`. When letting `precompact-handoff.mjs` write the handoff on `/compact`, the topic is derived automatically (commit scope → CURRENT_POSITION.md → branch last segment). The `enforce-handoff-topic.mjs` Stop hook (registered in `H:/prism/.claude/settings.json` Stop hooks list, position 6) is the safety net: it renames any topicless file at session end and resolves collisions by mtime.

**Why:** During the 2026-04-26/27 home-PC session, chat `claude-acda4ff6` overwrote settings.json edits made by `claude-bad5f10a` because both wrote handoffs without topic discrimination and there was no way to tell which file was the live one for a given chat lane. RESUME_AT_WORK.md §8 documents the incident. Topic suffixes are the lane markers that prevent recurrence.

**How to apply:** Before any handoff write, ensure the filename will carry a topic. Trust the auto-derivation (commit → position → branch) but never accept a null topic silently — if the writer can't derive one, it's a signal you're on `main` with no scoped commits, in which case manually pass a meaningful topic like the current ad-hoc work area. After Stop, the hook will catch any leak; verify by checking that no `HANDOFF-<your-id>.md` exists in `state/shared/handoffs/` (only `HANDOFF-<your-id>-<topic>.md`).

## Source

Promoted from memory [[feedback_handoff_topic_naming]] (referenced 3x across the vault). The memory remains the editable source of truth.
