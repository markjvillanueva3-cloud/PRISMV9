---
name: feedback_slot_commit_use_git_dash_c
description: "Slot commits: a bare `git commit` from the slot worktree now works -- slot-commit-worktree-enforce honors PreToolUse input.cwd as of 2026-06-15 (commit 887b7096ad). `git -C H:/prism-slot-<name> commit` stays the explicit/robust form (and the only option when input.cwd is absent). golf is exempt; prefix [MAIN-FORCE] for genuine shared-tree fleet infra."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.445Z
aliases: feedback_slot_commit_use_git_dash_c
---


# Slot commits: use `git -C H:/prism-slot-<name> commit`, not bare `git commit`

**UPDATE 2026-06-15 (slot:oscar, commit `887b7096ad`):** the hook now ALSO honors the PreToolUse
`input.cwd` (the tool's real bash working dir), so a **bare `git commit` from a slot worktree now
resolves correctly and is no longer false-blocked.** `git -C` / leading `cd` stay the explicit,
robust form (and the only option when `input.cwd` is absent, e.g. some detached/background contexts).
Read the rule below as "explicit is still best," NOT "bare is broken."

**Why (current resolution order):** `.claude/hooks/slot-commit-worktree-enforce.mjs` is a
**PreToolUse:Bash** hook. Its `resolveGitCwd(cmd, input)` resolves the git cwd in order:
1. `git -C <dir> commit`  -> uses `<dir>`
2. a LEADING `cd <dir> &&` / `cd <dir>;`  -> uses `<dir>`
3. the tool's real bash cwd (`input.cwd`)  -> uses it   (<- added 2026-06-15; fixes the false-block)
4. none of the above -> **fallback `H:/prism`** (shared main tree) -- fail-soft only

It then runs `git -C <resolvedCwd> rev-parse --abbrev-ref HEAD`; if that != `slot/<name>` it
**denies the whole Bash call at PreToolUse** (exit 2) -- so a chained `git add ... && git commit`
NEVER runs the `git add` either. Pre-fix, steps 1-2 absent meant a bare commit fell straight to
step 4 and read the wrong branch -- the phantom "commit cwd: H:/prism" block (hit ~8x historically,
6x more this oscar session before the root-cause fix).

**How to apply:**
- Bare `git add ... && git commit ...` from the slot worktree NOW works (step 3 resolves cwd).
- STILL ROBUST / explicit: `git -C H:/prism-slot-<name> add <files> && git -C H:/prism-slot-<name> commit -F <msgfile>`.
- Use Windows-style `H:/prism-slot-<name>` (the hook spawns `git -C` from node, not git-bash).
- For long messages, write a temp file and `git commit -F <file>` (the PowerShell `@'...'@`
  heredoc is a PARSE ERROR in the Bash tool / POSIX sh).
- golf slot is exempt (integrator). Genuine fleet-infra on the shared tree: prefix subject `[MAIN-FORCE]`.

Knob: PRISM_SLOT_COMMIT_ENFORCE_DISABLE=1 (don't -- the bare commit works now; fix the command/cwd
instead). Related: [[feedback_delta_commit_to_slot_branch]] · [[reference_slot_commit_worktree_enforce_2026_05_24]].
