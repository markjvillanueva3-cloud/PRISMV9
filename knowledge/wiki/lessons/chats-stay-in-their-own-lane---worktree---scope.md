---
title: "Chats stay in their own lane / worktree / scope"
name: chats-stay-in-their-own-lane---worktree---scope
kind: reference
status: promoted
category: lessons
domain: knowledge-vault
promoted_from: knowledge/memories/feedback/feedback_chat_lane_discipline.md
promoted_at: 2026-06-06T04:55:45.503Z
source_refs: 4
---

# Chats stay in their own lane / worktree / scope

User explicitly stated (2026-04-27): "chats staying in their own lane, chats commiting to their own work trees (must commit to relevant tree name or make a new one), no commiting other chat work, utilization of the internal agent chat system to avoid chats working on the same thing"

**Why:** 6 concurrent chats on the same H:/PRISM working tree caused multiple silent corruption incidents (settings.json revert, topicless handoff overwrite, race-polluted commits where commit message says U-CADC09 but diff is WEDM, see HANDOFF-claude-4e04e0ab and HANDOFF-claude-90bcd434). The chat bus exists but is consumed reactively, not used proactively.

**How to apply:**

1. **Each chat owns a worktree** (one of the `work/*` branches). Determine yours at SessionStart by reading the current branch. If you're on `main` or a branch shared by another active chat, **create a new worktree** before any non-trivial edit:
   ```
   git worktree add ../prism-<topic> -b work/<topic>
   ```
   The branch name must reflect the work topic (e.g., `work/cam-exhaust-ms0`, `meta/claudemd-enforcement`). No "miscellaneous" or unscoped branches.

2. **Commit ONLY to your own worktree's branch.** Before `git commit`:
   - `git rev-parse --abbrev-ref HEAD` — confirm it matches your owned branch
   - `git diff --cached --stat` — confirm staged paths fall within your scope
   - Commit subject MUST start with `[<SCOPE>]/U-<ID>:` where SCOPE matches the branch's scope (or `[MAIN]` only when explicitly approved by the user)

3. **Never stage / commit files claimed by another chat.** Read `H:/PRISM/state/shared/chat-bus/claims/*.json` (or the chat-bus injection that fires every prompt). If a staged path is claimed by a peer chat, ABORT and `git reset HEAD -- <path>` to unstage.

4. **Use the chat bus PROACTIVELY before starting non-trivial work:**
   ```
   prism_context action=claim_file path=<file> mode=<edit|write> ttl_min=15
   prism_context action=chat_post message="starting <unit>: <files>"
   ```
   Doing this BEFORE the first Edit/Write prevents two chats from racing on the same engine.

5. **On Stop / handoff, post work summary to the bus** so other chats see what you finished:
   ```
   prism_context action=chat_post message="completed <unit>: shipped <files>"
   ```

6. **Ownership reads:**
   - Chat ID: from session-id-pin.mjs (e.g., `claude-9c056864`)
   - Active branch: `git rev-parse --abbrev-ref HEAD`
   - Active claims by this chat: filter `chat-bus/claims/*.json` by chat ID
   - Active claims by peers: same files, filter OUT this chat's ID

**Anti-patterns to block:**
- Committing on `main` directly when other chats are active
- Committing files claimed by another chat
- Editing a file claimed by another chat
- Starting a non-trivial edit without first posting `claim_file` to the bus
- Commit subject scope mismatching the branch scope (e.g., `[WEDM]/...` on `work/cam-exhaust-ms0`)
- Two chats on the same branch (caught by branch-claim mechanism)

**Existing infrastructure to leverage:**
- `chat-bus-inject.mjs` (already firing — consumes claims)
- `file-claim-guard.mjs` (PreToolUse:Edit/Write — blocks if peer claimed)
- `file-claim-commit-guard.mjs` (PreToolUse:Bash git commit — blocks if peer claimed)
- `chat-state-isolator.mjs` (per-chat state)
- `prism_context` MCP action `claim_file` / `chat_post` / `chat_read`
- `enforce-handoff-topic.mjs` (Stop hook — topic-suffixed handoffs)

**Gaps that need new hooks:** branch-ownership-guard, commit-scope-validator, proactive-claim-prompt, chat-bus-broadcast-on-stop. See enforcement plan in main session.

## Source

Promoted from memory [[feedback_chat_lane_discipline]] (referenced 4x across the vault). The memory remains the editable source of truth.
