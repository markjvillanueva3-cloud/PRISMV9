---
source: gsd_micro
section: Multi-Chat Lane Discipline + Worktree Routing
slug: multi-chat-lane-discipline-worktree-routing
indexed_at: 2026-04-28T02:50:03.678Z
---

## Multi-Chat Lane Discipline + Worktree Routing

3-6 concurrent chats run on PRISM at any time. Each chat
**stays in its own lane** — claims a milestone scope, commits to the
matching branch / worktree, never trespasses on another chat's files.

### Lane assignment
- Per-chat handoff at `state/shared/handoffs/HANDOFF-<id>-<topic>.md`.
- Topic derived in priority order: most-recent commit's `[SCOPE-MS#]`
  → `CURRENT_POSITION.md` milestone → branch slug.
- `enforce-handoff-topic.mjs` (Stop) renames topicless handoffs.

### Worktree routing
- Each active milestone has a `work/<milestone>` worktree under
  `H:/prism/.claude/worktrees/` (or peer paths like
  `H:/prism-tsc-cleanup/`, `H:/prism-cad-complete/`).
- `git worktree list` shows the live mapping.
- `worktree-commit-route.mjs` (PreToolUse Bash) DENIES `git commit`
  on the main tree when the commit subject's `[SCOPE]` token matches
  an active `work/<scope>` worktree. Override: prefix subject with
  `[MAIN]` for genuinely cross-cutting commits.

### Conflict-fork rule
**NEW RULE (2026-04-28):** if `commit-ownership-guard` or
`git-anti-clobber` blocks your commit because another chat owns the
files, do NOT fight for the same tree. **Fork to your own tree:**
1. `git worktree add ../prism-<your-milestone> -b work/<your-milestone>`
2. Move your work there with `git stash push` → `git stash pop` in
   the new worktree, OR `git cherry-pick` the relevant commits.
3. Commit on the new branch.
4. Update your `state/shared/handoffs/HANDOFF-<id>-<topic>.md` to
   point at the new worktree.

This avoids the multi-chat thrash on shared HEAD and keeps milestones
independently mergeable.

### File claims
- `file-claim-guard` (PreToolUse) tags edits with stable session id
  (15-minute lease). Other chats see warnings before editing claimed
  files in the chat-bus auto-injection.
- `commit-ownership-guard` (PreToolUse Bash on `git commit`) verifies
  staged files against ownership ledger; accepts both `claude-XXX`
  payload IDs and `host-${hostname()}` fallback as "ours"
  (HOOK-FIX-5/C).
- 3-strike escape hatch: after 3 successive blocks the guard auto-
  passes with a warning so genuine progress isn't permanently stuck.

### Chat bus
- `state/shared/AGENT_CHAT.md` — broadcast intent before non-trivial
  edits via `prism_context:chat_post`.
- `state/shared/AGENT_WORKBOARD.md` — claim a unit before starting,
  release on completion.
