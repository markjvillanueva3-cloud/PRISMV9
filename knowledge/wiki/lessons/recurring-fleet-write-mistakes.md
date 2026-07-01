---
title: Recurring fleet-wide file/commit write mistakes (CRLF · commit-message quoting · pathspec · shared-tree absorption · invisible-byte invariants)
category: lessons
last_verified: 2026-06-04
author: claude-501bd704 (slot:india)
confidence: 0.9
source: BLACKWELL-AI-MS0/U-GNN-* session + git-log archaeology (juliett U-DB-B1-LF-RESTORE, bravo U-SLOT-BRIEF-WRITE-EOL, fleet U-REAPER-INSTALL-LF, alpha U-FGC-2b/2c)
domain: all-galaxies
tags: [git, crlf, eol, commit, pathspec, shared-tree, windows, fleet-discipline, hygiene]
---

# Recurring fleet-wide write mistakes — the ones many chats make in the *same exact way*

> **Why this exists (operator directive 2026-06-04):** "multiple chats have had the same issue of writing things wrong in the same exact way — make it a memory and wiki for all galaxies to remember and learn from." The git log is a graveyard of *identical* repeats: ≥6 "restore X to LF" commits, multiple absorbed-peer-files commits, repeated commit-message-quoting failures. These are not domain bugs — they are **mechanics mistakes every slot can make**, so this lesson is fleet-wide (`domain: all-galaxies`).

Five distinct classes. Each has a verified root cause and a one-line correct pattern.

---

## 1. CRLF/LF whole-file flip (Windows Edit/Write → repo is LF)

**Symptom:** a ~20-line edit commits as `1 file changed, 517 insertions(+), 491 deletions(-)` — nearly the whole file. That churn is a **line-ending flip**, not your change. It pollutes `git blame`, balloons the diff, and gets absorbed across chats.

**Root cause:** the Edit/Write tools on this Windows host write CRLF; `core.autocrlf` is effectively `false`.

**STATUS — LARGELY FIXED 2026-06-04 (`9bd4b22abd` / U-FGC-2b):** the repo now has a root `.gitattributes` with `* text=auto eol=lf` + explicit `*.ts/*.tsx/*.js/*.mjs/*.md text eol=lf`. **`git add` now normalizes text files to LF in the index**, so new commits of covered types are LF regardless of the tool's CRLF. Verify any path: `git check-attr text eol -- <file>` → expect `text: set`, `eol: lf`.
- **Residual:** (a) already-CRLF-in-index blobs stay CRLF until the one-time `git add --renormalize .` runs (a separate golf-integrator commit — do NOT bundle it); (b) file types not covered by an attribute.
- **STALE KNOWLEDGE WARNING:** memories `feedback_edit_tool_crlf_flips_lf_files` and `reference_git_crlf_windows_reality_2026_06_02` predate the fix and say "no .gitattributes / LF is not stickable." That is **no longer true** — do NOT burn tool-calls (the reference memory cost "~15 tool-calls wasted") manually `node -e fs.writeFileSync(... replace /\r\n/g)` chasing LF. Trust `git check-attr`; if it says `eol: lf`, `git add` handles it.

**Correct pattern:** after Edit/Write, if `git diff --numstat -- <file>` shows insertions≈deletions≈filesize, it's EOL noise; `git diff --ignore-cr-at-eol --numstat` shows the REAL change. With the attribute active, just `git add` + commit — the index blob is LF.

---

## 2. Commit-message quoting footguns (multi-line `-m` + special chars)

**Symptom:** `git commit -m "<long message with backticks/$()/control-chars>"` either mangles the message (shell expands `` `…` `` / `$…`) or fails outright. The signature failure: **`error: pathspec '…' did not match any file(s) known to git`** — your message text got parsed as filenames.

**Two distinct root causes (both bit this session):**
1. **`--` pathspec placement.** `git commit -- <files> -m "msg"` treats EVERYTHING after `--` as pathspec → `-m` and the message become "files" → "did not match any file(s)." The `--` pathspec must be the **last** tokens, after `-m`: `git commit -m "msg" -- <files>`.
2. **Special chars in `-m`.** Backticks, `$`, and literal control bytes (e.g. a `\x1F`) in a double-quoted `-m` get shell-expanded/mangled. Single quotes help but break on apostrophes.

**Correct pattern — use a message file, pathspec last:**
```bash
cat > /tmp/msg.txt << 'EOF'
[SCOPE]/U-ID: subject line
<body — any chars safe inside the quoted heredoc delimiter 'EOF'>
EOF
git commit -F /tmp/msg.txt -- path/to/file1 path/to/file2
```
`-F` sidesteps ALL shell quoting; explicit pathspec scopes the commit (see #3).

---

## 3. Shared-tree commit absorption (peer-staged files ride into YOUR commit)

**Symptom:** your commit contains files you never touched (e.g. a peer's CRLF→LF churn of `dataDispatcher.ts`). On the 26-chat shared `H:/prism` tree, a peer's `git add` leaves files staged in the **shared index**; your bare `git commit` (no pathspec) commits *everything staged* — including theirs. Attribution is lost; the diff is polluted.

**Correct patterns (in order of preference):**
1. **Slot worktree** — commit in `H:/prism-slot-<nato>` on `slot/<nato>` ([[feedback_commit_to_slot_worktree]]). No shared index, no absorption.
2. **Explicit pathspec** on the shared tree — `git commit -F msg.txt -- <only-your-files>` commits ONLY your paths even if peers have other files staged.
3. **Never** `git commit` with a bare `git add .` on the shared tree.

Related: [[feedback_commit_to_slot_worktree]], [[feedback_commit_prefix_main_on_shared_tree]] ([MAIN] prefix + re-`git add` after a blocked commit).

---

## 4. `.git/index.lock` contention (shared tree, dead-orphan locks)

**Symptom:** `fatal: Unable to create '.git/index.lock': File exists` — a peer's crashed/reaped git PID left a stale lock, freezing every index-touching command.

**Correct pattern:** poll-then-proceed; only treat as dead when **age > ~120s AND mtime frozen AND original holder gone** (a live `git add` of a 600MB file legitimately holds the lock):
```bash
for i in $(seq 1 30); do [ ! -e .git/index.lock ] && break; sleep 2; done
```
A PreToolUse hook (`git-index-lock-sweep`, FLEET-GIT-CONTENTION-MS0/U-FGC-5) auto-clears a *dead frozen orphan* before index-touching git commands. Related: [[auto-tool-error-git-lock-contention]], [[windows-harness-fileops-process-persistence-git-contention]].

---

## 5. Dropping an invisible invariant byte when swapping a serializer/hash

**Symptom:** you replace a hashing/serialization function with an "equivalent" one and silently invalidate a cache (or change a key) because the original carried an **invisible delimiter/format byte** you didn't replicate. This session: `nodeContentHash` hashed `id + \x1F + text` (a `0x1F` Unit-Separator delimiter, collision-safe); a refactor swapped it for `id + text` (no `\x1F`), so `hashFor(node) ≠ nodeContentHash(node)` → the full-graph resume cache would re-embed all ~372k nodes. A reviewer **verified them "equal" by eye** and was wrong — only `od -c` / byte-inspection caught it.

**Correct pattern:** when replacing any serializer/hash/key function, (a) inspect the BYTES of the original (`sed -n 'Np' file | od -c` or `cat -A`), not just the rendered text; (b) preserve the exact format (delimiters, separators, ordering, trailing newline); (c) add an **equivalence regression test** that the new == old on the unchanged path (e.g. `embedResumeHash(nonGhost) === nodeContentHash(nonGhost)`). The test is the real proof; "looks the same" is not.

---

## Fleet rule (all galaxies)

Before any commit on the shared tree: **(1)** `git check-attr eol` is `lf` (or `git diff --ignore-cr-at-eol` to confirm the real change), **(2)** commit via `-F msgfile` with an **explicit `--` pathspec last**, **(3)** prefer a slot worktree, **(4)** poll `index.lock`, **(5)** when swapping any serializer/hash, byte-verify + add an equivalence test. These five are mechanics, not domain — every slot owns them.

Memories: [[feedback_recurring_fleet_write_mistakes]] (pointer) · [[feedback_edit_tool_crlf_flips_lf_files]] (CRLF detail, pre-`.gitattributes`) · [[reference_git_crlf_windows_reality_2026_06_02]] (CRLF, pre-fix) · [[feedback_commit_to_slot_worktree]] · [[feedback_commit_prefix_main_on_shared_tree]].
