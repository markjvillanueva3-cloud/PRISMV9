---
name: reference_git_lock_routing_fix_2026_05_26
description: "Removed 4 PRISM_*_DISABLE knobs from user settings.json that were keeping the slot-worktree routing hooks inert; chats on slot/<nato> branches now route to their per-slot worktrees, eliminating main-tree .git/index.lock contention."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.588Z
aliases: reference_git_lock_routing_fix_2026_05_26
---


# Slot-Worktree Routing Re-Armed (2026-05-26, slot:golf /loop iter5)

## Operator directive
"fix whatever is causing git locks. each chat should be committing to their own chat named work tree to avoid conflicts"

## Root cause
PRISM has three default-OFF routing hooks (`worktree-commit-route` PreToolUse:Bash, `git-add-lane-guard` PreToolUse:Bash, `main-tree-write-block` PreToolUse:Edit|Write|MultiEdit) that arm per-chat once the chat's `chat-slots.json[slot].branch` starts with `slot/`. The hooks support env-var arming (`PRISM_*_ENABLE=1`) AND a hard-stop kill switch (`PRISM_*_DISABLE=1`) where the disable knob **always wins**, per the hook docstrings.

`C:/Users/wompu/.claude/settings.json` env block had BOTH knobs set:
```json
"PRISM_WORKTREE_ROUTE_ENABLE": "1",
"PRISM_GIT_ADD_LANE_ENABLE": "1",
"PRISM_MAINTREE_WRITE_BLOCK_ENABLE": "1",
"PRISM_WORKTREE_ROUTE_DISABLE": "1",
"PRISM_GIT_ADD_LANE_DISABLE": "1",
"PRISM_MAINTREE_WRITE_BLOCK_DISABLE": "1",
"PRISM_SLOT_COMMIT_ENFORCE_DISABLE": "1",
```

Disable wins → all four hooks were dormant fleet-wide. Every chat committed against `H:/prism` main tree, contending on `H:/prism/.git/index.lock`. The 5.5 MB stale lock from earlier today (cleared in `reference_duplicate_scheduled_tasks_2026_05_26.md`) was a downstream symptom — partial-index-write under cross-chat contention.

## Why worktree routing actually fixes this

Git worktrees share the main `.git/` object database but **each worktree has its own per-worktree index file at `.git/worktrees/<name>/index`** and its own per-worktree `index.lock`. When chat A commits in `H:/prism-slot-alpha` and chat B commits in `H:/prism-slot-bravo`, they lock DIFFERENT files — zero contention. The only shared lock is the per-ref `refs/heads/slot/<name>.lock`, which is held microseconds during the atomic-ref-update step at the end of commit (effectively never contends).

## Fleet state at fix time

26 NATO slots — 18 currently bound on `slot/<nato>` branches (alpha, bravo, delta, echo, foxtrot, hotel, india, juliett, kilo, lima, mike, november, oscar, papa, quebec, sierra, tango, whiskey), 1 on integrator branch (golf on `cad-fusion-live-ms0`, exempt by name in main-tree-write-block), 7 unbound (charlie, romeo, uniform, victor, xray, yankee, zulu, zulu).

All 26 `H:/prism-slot-<nato>` worktree directories exist on disk — verified via `Get-ChildItem`.

## The change

Removed 4 knobs from `C:/Users/wompu/.claude/settings.json`:
- `PRISM_WORKTREE_ROUTE_DISABLE`
- `PRISM_GIT_ADD_LANE_DISABLE`
- `PRISM_MAINTREE_WRITE_BLOCK_DISABLE`
- `PRISM_SLOT_COMMIT_ENFORCE_DISABLE`

The `c-to-h-mirror` hook auto-replicated to `H:/.claude/settings.json`. Effect propagates to every chat on next UserPromptSubmit (env vars are read per-hook-invocation).

## Expected behavior change

Starting NEXT prompt of each chat:
- **18 chats on slot/* branches**: Edit/Write/MultiEdit into `H:/prism/...` is BLOCKED with a route hint pointing at their `H:/prism-slot-<name>/...` equivalent. `git commit` from `H:/prism` is BLOCKED unless commit subject starts with `[MAIN]`. `git add` into a peer's lane is auto-unstaged.
- **golf (this chat)**: integrator-exempt, continues working in `H:/prism` on `cad-fusion-live-ms0` as before.
- **Unbound slots (charlie, romeo, uniform, victor, xray, yankee, zulu, zulu)**: not affected (no chat-binding → no slot/* branch → hooks no-op for them).

## Operator-visible effects

1. **First-time pain for chats with uncommitted main-tree edits.** A chat that's been working in `H:/prism` will get blocked on its next Edit. The hint message will tell it to `cp` files into its slot worktree, then commit there. This is the doctrine in `feedback_commit_to_slot_worktree`.
2. **Index.lock contention drops to near-zero.** The 5.5 MB partial-index-write class of incident becomes impossible — those happened when two chats committed to main concurrently. Now each chat has its own per-worktree lock.
3. **`git-lock-sweeper.mjs` workload reduces.** It still arms PreToolUse:Bash to clean stale locks, but stale locks now come from a single chat crashing during its own atomic commit (rare), not from cross-chat contention.

## Verification

Operator can verify in any non-golf chat that:
```bash
git -C H:/prism rev-parse --abbrev-ref HEAD   # → slot/<nato>
```
…and the chat-slots binding shows `branch: "slot/<nato>"`. The hooks will arm on next prompt and route from there.

## Related

- [[feedback_commit_to_slot_worktree]] — standing doctrine
- [[feedback_no_git_stash_shared_tree]] — adjacent class of multi-chat git bug
- [[reference_duplicate_scheduled_tasks_2026_05_26]] — sibling [[feedback_golf_owns_reaper|fleet-hygiene]] memo from earlier this session
- `H:/prism/.claude/hooks/worktree-commit-route.mjs` (T0, bash-bundle wired)
- `H:/prism/.claude/hooks/git-add-lane-guard.mjs` (T0, bash-bundle wired)
- `H:/prism/.claude/hooks/main-tree-write-block.mjs` (T0, edit-bundle wired)
- CLAUDE.md §PER-CHAT HANDOFF (slot-worktree-MS0 activation rules)
