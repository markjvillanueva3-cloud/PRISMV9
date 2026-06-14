---
name: reference_git_crlf_windows_reality_2026_06_02
description: "The shared tree is de-facto MIXED/CRLF (untouched HEAD files are CRLF); Git-for-Windows CRLF-ifies on add/hash-object → LF is NOT stickable from a session. Don't fight it."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.128Z
aliases: reference_git_crlf_windows_reality_2026_06_02
---


> **UPDATE 2026-06-04 — SUPERSEDED BY A FIX (read first):** the "there is no `.gitattributes`" finding below is now STALE. A root `.gitattributes` (`* text=auto eol=lf` + explicit `*.ts/*.mjs/...`) shipped in `9bd4b22abd` (U-FGC-2b); `git check-attr eol -- <file>` now returns `lf` and `git add` normalizes covered text files to LF in the index. The "LF is not stickable" conclusion no longer holds for `git add` of covered types. Residual: old in-index CRLF blobs until a one-time golf `git add --renormalize .`. The "don't burn budget chasing LF" advice still stands — but now because it's HANDLED, not because it's hopeless. Canonical current lesson: wiki [[recurring-fleet-write-mistakes]] · [[feedback_recurring_fleet_write_mistakes]].

**Git CRLF reality on this machine (2026-06-02, slot:bravo — learned the hard way, ~15 tool-calls wasted).** Do NOT burn budget trying to force LF on `mcp-server/src` files from a session. Findings:

1. **The committed HEAD tree is MIXED, mostly CRLF.** Untouched files have CRLF blobs in HEAD: `ChatBusEngine.ts`=446 CR, `sessionDispatcher.ts`=4288, `constants.ts`=289, `atomicWrite.ts`=69. There is **no `.gitattributes`** (root or nested) enforcing EOL. `core.autocrlf` is `true` (system gitconfig `C:/Program Files/Git/etc/gitconfig`) but `false` in `.git/config` (local wins → effective false). So EOL is whatever each committer's tooling produced — a genuine mix across history.

2. **Editing a previously-LF file flips it to CRLF.** The Edit/Write tools (and/or a real-time file watcher on `mcp-server/src`) rewrite the WHOLE file CRLF. A ~15-line edit to `contextDispatcher.ts` produced a 3593-line whole-file EOL diff. The parent blob was LF (0 CR); the commit landed CRLF.

3. **LF is NOT stickable from a session.** Confirmed: `node` writeFileSync(LF) lands LF on disk (read-back 0 CR, stable 1s+), but a subsequent `git add` / `git hash-object -w --stdin` of that LF content produces a **CRLF index blob** anyway — `git update-index --index-info` with a hand-hashed LF blob STILL shows CRLF. Either Git-for-Windows CRLF-ifies stdin/add in text mode, or a watcher re-flips between write and stage. Forced `-c core.autocrlf=false -c core.eol=lf` did not help.

**How to apply:** When your edit produces a giant whole-file EOL diff, DON'T chase LF — it's the repo's ambient CRLF reality, not a regression you introduced relative to the codebase. Verify FUNCTIONAL content (`git show HEAD:<file> | grep <your-symbol>`), confirm tests pass, commit, and move on. A golf hygiene sweep owns repo-wide LF normalization (needs a one-time `.gitattributes` `* text=auto eol=lf` + `git add --renormalize`, run from a context where it sticks). **R12 correction:** my commit `69e8232541` subject says "restore LF on the 4 slot-brief files" — it did NOT (they're still CRLF, consistent with the rest of the tree). Related: the recurring "restore X to LF" commits in `## Recent regressions` are the same issue resurfacing. Sibling lock-contention note: the shared `.git/index` had stale zombie locks every few minutes (dead holder + frozen mtime + blocked-peer pileup) — reap only when age>120s AND mtime frozen AND original holder gone.
