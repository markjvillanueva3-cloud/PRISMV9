---
name: bash-cwd-and-git-c-pattern
category: code-tribal
domain: backend-dev
tags: [bash, cwd, git, worktree, hook, windows, prism-development, ai-development]
last_updated: 2026-05-18
---

# Bash CWD + `git -C` Pattern — surviving the worktree-routing hooks

PRISM's `worktree-commit-route` PreToolUse hook reads the bash session's reported cwd, not the bash command's chained `cd`. On Windows + Cygwin, a `cd H:/prism-slot-X && git commit ...` invocation can look like "you are on main tree" to the hook even though the `cd` succeeded for that command line. Three patterns make this robust.

## Symptom

You wrote `cd H:/prism-slot-lima && git add ... && git commit -m "[LIMA] ..."`. The commit-route hook blocks with:

```
WORKTREE-ROUTE: wrong tree for this commit.
You are on:           H:/PRISM (cad-fusion-live-ms0)
Commit subject scope: [lima]
```

The hook is reading the bash session's persistent cwd or the chat-slot binding, NOT the cwd you just chained into.

## Pattern 1 — Use `git -C <worktree-path>` explicitly

Bypasses cwd entirely. Every git command targets the worktree by explicit path:

```bash
git -C H:/prism-slot-lima add knowledge/wiki/code-tribal/foo.md
git -C H:/prism-slot-lima commit -m "[LIMA] ..."
git -C H:/prism-slot-lima log --oneline -1
```

This is the robust pattern when scripting across worktrees from a single bash session. The hook still sees "you are on main tree" but the actual git operations target the slot worktree, and the commit lands there.

## Pattern 2 — Migrate the chat fully, then commit normally

The slot-worktree cutover protocol changes the chat's bash session cwd persistently. After cutover:

```bash
cd H:/prism-slot-lima  # bash session now anchored here
git add ...
git commit -m "[LIMA] ..."
```

Works WITHOUT `-C`. But requires the cutover ceremony (chat-slots claim with --branch + activity worktree-cutover).

For ad-hoc commits without full cutover, Pattern 1 is faster.

## Pattern 3 — Bypass with [MAIN] tag

If the commit genuinely belongs in the main tree but the routing hook insists otherwise, prefix the commit subject with `[MAIN]`:

```bash
git commit -m "[MAIN] ..." 
```

This is an OVERRIDE, not a fix. Use only when you've verified the commit really belongs in main tree.

## Why `cd && git` fails the hook (and not git itself)

Bash chains commands left-to-right. `cd A && X` succeeds: cd changes the SHELL process cwd; X runs with that cwd. Git sees the cwd correctly and operates on the right repo.

But the `worktree-commit-route` hook (PreToolUse) fires BEFORE the bash command runs. It reads:
1. The Bash tool's reported cwd (may persist from a prior `cd` in a different command)
2. The chat-slot's `branch` field (chat-slots.json[slot].branch)
3. The committer's `[SCOPE]` subject tag

It mismatches when the chat-slot says `branch: cad-fusion-live-ms0` but the commit subject says `[LIMA]`. The hook can't see the `cd H:/prism-slot-lima` inside the bash command — that's INSIDE the bash command body, not the tool's reported cwd.

## The "Cygwin cwd persistence" gotcha on Windows

Windows + Cygwin sometimes report the prior bash command's cwd even after a new `cd` in a new tool call. The Bash tool's "working directory persists between commands" contract holds for the explicit `cd` line, but on subsequent tool calls the cwd may snap back to the harness default.

Pattern 1 (`git -C`) is immune to this; Pattern 2 requires verifying cwd in each invocation.

## When you actually need to enter the worktree

For multi-step work in a slot worktree (read files, run tests, etc.), do the full cutover via `/checkin-<slot>`. That binds the chat to the slot persistently and the routing hooks arm correctly.

For one-off commits, `git -C <path>` is the lower-ceremony path.

## Hook telemetry

`mcp-server/data/state/hook-fire-counts.jsonl` records every routing-block. Search for `"hook":"worktree-commit-route","decision":"block"` to find which chats are hitting this pattern repeatedly. A chat with > 3 routing-blocks in a session should do a full cutover.

## Related

- [[slot-worktree-playbook]] — the full cutover ceremony
- [[multi-chat-coordination]] — chat-slot binding details
- [[fleet-debug-playbook]] — git lock + routing diagnostics
- CLAUDE.md "ENGINE WIRING" + "PER-CHAT HANDOFF" sections
