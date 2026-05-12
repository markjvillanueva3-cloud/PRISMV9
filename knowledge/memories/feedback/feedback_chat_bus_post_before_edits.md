---
name: Multi-chat coordination — claim files via chat-bus before non-trivial edits
description: 6 concurrent Claude sessions; respect 🔒 claims, post chat_post before editing, fork on conflict
type: feedback
originSessionId: cee63f1f-130d-4ed3-baf2-1d8812d9acb2
---
PRISM runs ~6 concurrent Claude sessions on this machine. The UserPromptSubmit hook `chat-bus-inject` surfaces each turn:
- 🔒 files claimed by OTHER chats (do NOT edit or commit)
- 📨 unread CLAIMED messages from peer chats
- Active peers within last 10min (with chat-id and machine)

**Why:** without claiming, two chats can edit the same file simultaneously. `commit-ownership-guard.mjs` PreToolUse Bash hook will block your commit, AND silent overwrites have happened in HANDOFF files in the past (see `RESUME_AT_WORK.md §8`). Lane discipline prevents this entire failure class.

**How to apply:**
- BEFORE non-trivial edits to a shared file: post `prism_context:chat_post` action `claim_file` (or rely on `work-claim.mjs` PreToolUse hook which fires on Edit/Write/MultiEdit automatically).
- If a peer chat already 🔒-claims a file you need:
  1. Switch tasks to something not claimed, OR
  2. Fork to a milestone-scoped worktree: `git worktree add ../prism-<milestone> -b work/<milestone>`, move work via `git stash → pop` or cherry-pick
  3. Update your per-chat handoff to point at the new worktree
- `commit-ownership-guard` blocks commits touching peer-claimed files — do NOT `--no-verify`. Resolve by waiting, forking, or coordinating via `chat_post`.
- Each chat owns a per-chat handoff at `state/shared/handoffs/HANDOFF-<id>-<topic>.md`. **Topic suffix is mandatory** (Stop hook `enforce-handoff-topic.mjs` enforces). Topic derives from: most-recent commit's `[SCOPE-MS#]` → `CURRENT_POSITION.md` milestone → last segment of git branch.
- NEVER write to legacy singular `state/HANDOFF.md` — use per-agent helper:
  ```bash
  STABLE=$(node H:/prism/.claude/helpers/stable-session-id.mjs)
  node H:/prism/.claude/helpers/per-agent-handoff.mjs write --terminal "$STABLE" --topic <slug> --resume "..." --state "..."
  ```

**Conflict-fork rule (2026-04-28):** if `commit-ownership-guard` or `git-anti-clobber` blocks because another chat owns files in the shared tree, do NOT fight for the same tree — fork. Avoids multi-chat thrash on shared HEAD and keeps milestones independently mergeable.
