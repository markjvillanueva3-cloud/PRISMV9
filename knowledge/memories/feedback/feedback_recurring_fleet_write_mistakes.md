---
name: feedback_recurring_fleet_write_mistakes
description: "Five mechanics mistakes many chats make in the SAME EXACT WAY across galaxies — CRLF/LF whole-file flip (now mitigated by .gitattributes eol=lf U-FGC-2b — stop chasing LF by hand), multi-line commit -m quoting + `--` pathspec placement (use git commit -F msgfile -- paths, pathspec LAST), shared-tree commit absorption (peer-staged files ride in → explicit pathspec or slot worktree), .git/index.lock dead-orphan contention (poll, age>120s+frozen+holder-gone), and dropping an invisible invariant byte (0x1F delimiter) when swapping a hash/serializer (byte-verify + equivalence test). Fleet-wide doctrine for ALL galaxies."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.441Z
aliases: feedback_recurring_fleet_write_mistakes
---


# Recurring fleet-wide write mistakes — many chats fail in the *same exact way*

Operator directive 2026-06-04: "multiple chats have had the same issue of writing things wrong in the same exact way — make it a memory and wiki for all galaxies to learn from." The git log proves it: ≥6 "restore X to LF" commits, repeated peer-file-absorption commits, repeated commit-message-quoting failures. These are **mechanics, not domain** — every slot owns them. Full lesson + verified root causes + correct patterns: wiki [[recurring-fleet-write-mistakes]].

**The five classes (headline rules):**
1. **CRLF/LF flip** — Edit/Write writes CRLF; repo is LF. **NOW mitigated:** root `.gitattributes` `* text=auto eol=lf` + `*.ts/*.mjs/... text eol=lf` shipped (`9bd4b22abd`/U-FGC-2b) → `git add` normalizes text files to LF. **Stop chasing LF by hand** (the old reflex wasted ~15 tool-calls/session); trust `git check-attr eol -- <file>` = `lf`. Residual: old in-index CRLF blobs until a one-time `git add --renormalize .` (golf).
2. **Commit-message quoting** — multi-line `-m` with backticks/`$`/control-bytes mangles or fails ("pathspec did not match any file(s)"); and `git commit -- <files> -m "msg"` treats the message as pathspecs. **Fix:** `git commit -F /tmp/msg.txt -- <files>` (heredoc message file + `--` pathspec **LAST**).
3. **Shared-tree absorption** — a peer's staged files ride into your bare `git commit`. **Fix:** slot worktree ([[feedback_commit_to_slot_worktree]]) or explicit `-- <only-your-paths>`. Never bare `git add .` on the shared tree.
4. **`.git/index.lock` contention** — poll-then-proceed; dead only when age>120s AND mtime frozen AND holder gone. Hook `git-index-lock-sweep` (U-FGC-5) auto-clears dead orphans.
5. **Invisible invariant byte** — swapping a hash/serializer without preserving an unseen delimiter (this session: `nodeContentHash`'s `\x1F` id/text separator dropped by a refactor → would re-embed 372k nodes; a reviewer "verified equal by eye" and was WRONG — only `od -c` caught it). **Fix:** byte-inspect the original (`od -c`/`cat -A`), preserve the exact format, add an equivalence test (`new(nonGhost) === old(nonGhost)`).

**Why:** identical repeats waste fleet budget (re-discovery + restore commits) and corrupt attribution/blame. **How to apply:** before any shared-tree commit — `git check-attr eol`=lf · commit via `-F msgfile` with `--` pathspec LAST · prefer slot worktree · poll index.lock · byte-verify any serializer/hash swap with an equivalence test.

Siblings (some now partly stale — see wiki for current state): [[feedback_edit_tool_crlf_flips_lf_files]] · [[reference_git_crlf_windows_reality_2026_06_02]] · [[feedback_commit_to_slot_worktree]] · [[feedback_commit_prefix_main_on_shared_tree]].
