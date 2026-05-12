---
name: Always copy, never move or delete files
description: When relocating, archiving, or consolidating files, ALWAYS copy. Never `mv`, `git mv`, `rm`, or `Move-Item`. A stop hook enforces this.
type: feedback
originSessionId: 13840683-2b5d-48a1-8227-f894464fcd01
---
When relocating, archiving, or consolidating files in PRISM (e.g. moving an orphan engine into the canonical folder), **always copy, never move or delete**. There is a stop hook enforcing this.

**Why:** Mark explicitly stated this rule on 2026-05-07 during the engine-audit forge run. The user has 7000+ uncommitted changes in flight across 6 concurrent chats — moves and deletes silently break peer chats' working trees, blow up `git status`, and are unrecoverable when committed alongside other work. Copies are reversible (delete the copy) and don't perturb the source tree.

**How to apply:**
- Use `cp`, `Copy-Item`, or the `Write` tool to a new path. Never `mv`, `Move-Item`, `rm`, `Remove-Item`, `git mv`.
- After copying an "orphan" into the canonical engine folder, leave the original in place. Tag it later with a deprecation comment if needed, but do NOT delete.
- This applies to ALL file operations, not just engine moves: PDFs, JSON state, docs, scripts, hooks. Copy.
- If consolidation is the goal, copy + add a `// MOVED-TO: <new-path>` comment in the source. Cleanup is a separate, gated operation the user authorizes explicitly.
