---
name: feedback_missing_file_copy_back
description: "When a required file/shim/tool is missing from where it belongs, restore it from the canonical source by convention — don't just route around the gap."
aliases: feedback_missing_file_copy_back
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.434Z
---


When a required file is missing from where it should be — a PATH shim, a tool binary, a config — **restore it from the canonical source**, matching the host directory's existing convention. Do not silently route around the gap with a one-off workaround; the next caller hits the same wall.

**Why:** 2026-05-18 — `npm install` failed in the **Bash tool** with `npm: command not found`, while `npm` worked fine in the **PowerShell tool**. Root cause: `H:\.claude\bin` (on the Git Bash PATH) shipped a `node` extensionless shim plus `npm.cmd`/`npx.cmd`, but **no extensionless `npm`/`npx`**. MSYS/Git Bash resolves a bare command only to an extensionless script or `.exe` — never `.cmd` — so PowerShell (which uses `PATHEXT`) worked and Bash did not. The fix was to *copy the missing shims back* (`npm`, `npx`, `portable-npx`), mirroring the existing `node`/`portable-node` pattern — not to keep switching every npm call to PowerShell.

**How to apply:**
- "command not found" / "file not found" for something that *should* exist → find the canonical source (here `H:\Tools\nodejs\`) and restore the missing file into the expected location.
- Restore by *convention*, not literal bulk copy: `.claude/bin` uses thin `<tool>` shims delegating to `portable-<tool>` workers — the fix was 3 small shim files, not a 79 MB `node.exe` copy. Read the neighbouring files first (R8/R11).
- Bash scripts on Windows must be LF-only — write them via a Bash heredoc, then verify `grep -c $'\r'` returns 0; a stray CR breaks the shebang.
- After restoring, verify it actually runs (`<tool> --version`) — file presence ≠ working.
- Record the gap: a missing-file incident is an error to learn from — log it and write the wiki lesson so the recurrence is caught.

Note: `H:\.claude` and `C:\Users\wompu\.claude` share one inode (a junction is active) — writing to one writes to both, despite the CLAUDE.md note saying the junction is inactive.

Related: [[feedback_never_delete_only_disable]] — restoring a missing file is the inverse of disable-don't-delete; both keep the system whole.
