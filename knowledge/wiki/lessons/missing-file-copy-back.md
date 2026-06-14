---
title: Missing required file — copy it back, don't route around it
category: lessons
last_verified: 2026-05-18
author: claude-317fb800
confidence: 0.9
source: npm-not-found-in-bash-tool incident, 2026-05-18
domain: backend-dev
---

# Missing Required File — Copy It Back, Don't Route Around It

## Doctrine

When a file that *should* exist is missing from its expected location — a PATH
shim, a tool binary, a config — **restore it from the canonical source**,
matching the host directory's existing convention. A one-off workaround
(switching tools, hard-coding an absolute path at the call site) leaves the gap
in place for the next caller and turns a five-minute fix into a recurring tax.

## The incident (2026-05-18)

`npm install -g <pkg>` run through the **Bash tool** failed:

```
/usr/bin/bash: line 1: npm: command not found
```

Yet `npm` worked fine in the **PowerShell tool** — it resolved
`H:\.claude\bin\npm.cmd`, v10.9.0.

### Root cause

The Bash tool is MSYS / Git Bash (`MINGW64_NT`). `H:\.claude\bin` is on its
PATH and is the harness shim directory. It shipped:

- `node` — extensionless bash shim → `portable-node`
- `node.cmd`, `npm.cmd`, `npx.cmd` — cmd.exe shims
- `portable-node`, `portable-npm` — bash workers

…but **no extensionless `npm` / `npx`**. MSYS / Git Bash resolves a bare
command only to an extensionless script or a `.exe` — it never resolves
`.cmd`. PowerShell resolves `.cmd` via `PATHEXT`. So the same PATH directory
served PowerShell but not Bash. `node` worked in Bash only because its
extensionless shim happened to exist; `npm`/`npx` had no such shim.

### Fix

Copied the missing shims back into `H:\.claude\bin`, mirroring the existing
`node` → `portable-node` convention:

- `npm` — extensionless bash shim → `portable-npm`
- `npx` — extensionless bash shim → `portable-npx`
- `portable-npx` — bash worker (mirror of `portable-npm`, pointed at `npx-cli.js`)

Verified: `node` / `npm` / `npx` all resolve and run in the Bash tool
(v22.12.0 / 10.9.0 / 10.9.0).

## Rules of restoration

1. **Restore, don't route around.** Fixing the call site (use PowerShell,
   hard-code a path) hides the gap; the next script or hook hits it again.
2. **Restore by convention, not bulk copy.** `.claude/bin` uses thin `<tool>`
   shims delegating to `portable-<tool>` workers — so the fix is 3 small shims,
   not a 79 MB `node.exe` duplicate. Read the neighbouring files first (R8/R11).
3. **Bash scripts on Windows are LF-only.** Write them via a Bash heredoc, or
   confirm `grep -c $'\r'` returns 0 — a stray CR breaks the shebang.
4. **Verify it runs.** `<tool> --version` after restoring — file presence is
   not the same as working.
5. **Record the gap.** A missing-file incident is an error to learn from: log
   it (error ledger) and write the lesson so the recurrence is caught.

## Side note — the C:/H: junction

`H:\.claude` and `C:\Users\wompu\.claude` resolve to the **same inode** — a
junction (or equivalent link) *is* active, contrary to the CLAUDE.md note that
says it is not. Writing to one writes to both. CLAUDE.md is stale on this
point; not corrected here because that file is peer-locked.

## Related

- `feedback_missing_file_copy_back` — the memory form of this lesson.
- `feedback_never_delete_only_disable` — restoring a missing file is the
  inverse of disable-don't-delete; both keep the system whole.
