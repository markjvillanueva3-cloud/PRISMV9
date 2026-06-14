---
name: feedback_edit_tool_crlf_flips_lf_files
description: "On this Windows PRISM repo the Edit/Write tools write CRLF, but repo source files are LF (no .gitattributes EOL normalization, autocrlf not converting on commit). Editing an existing LF file then committing flips the WHOLE file to CRLF — a 517/517 whole-file churn that pollutes git blame and masks the real change. After Edit/Write on an existing repo file, check git diff --numstat and normalize CRLF→LF before committing."
type: feedback
source: prism-memory
synced: 2026-06-04T19:53:29.881Z
aliases: feedback_edit_tool_crlf_flips_lf_files
---


# The Edit/Write tools write CRLF; repo files are LF → whole-file EOL flip on commit

> **UPDATE 2026-06-04 — LARGELY FIXED (read this first):** a root `.gitattributes` (`* text=auto eol=lf` + `*.ts/*.tsx/*.js/*.mjs/*.md text eol=lf`) shipped in `9bd4b22abd` (U-FGC-2b). `git add` now normalizes covered text files to LF in the index — so this whole-file-flip-on-commit class is **largely neutralized** for new commits. The "there is no `.gitattributes`" claim below is now STALE. **Do NOT manually `node -e fs.writeFileSync(... replace /\r\n/)` chasing LF** — verify with `git check-attr eol -- <file>` (expect `lf`) and trust `git add`. Residual: old in-index CRLF blobs until a one-time golf `git add --renormalize .`. Canonical current lesson: wiki [[recurring-fleet-write-mistakes]] · [[feedback_recurring_fleet_write_mistakes]].

**Symptom:** you make a ~25-line edit to an existing `.mjs`/`.ts` file and `git commit` reports something like `1 file changed, 517 insertions(+), 491 deletions(-)` — nearly the whole file. That is a **line-ending flip**, not your change. The Edit/Write tools on this Windows host write `CRLF`, the repo stores the file as `LF` (verified: `git show HEAD~1:<file> | file -` = LF; working copy = "with CRLF line terminators"), there is no `.gitattributes` to normalize `.mjs`/`.ts`, and `core.autocrlf` is not converting on commit — so the CRLF working copy gets committed verbatim, flipping every line.

**Why it matters (alpha lane — clean commits / token economy):** a whole-file EOL churn pollutes `git blame` for the entire file, balloons the diff (cost + review noise), and can spuriously collide with a peer's view of the file. It also hides the real change inside 500 lines of noise. Bit me TWICE in one session (session da9aacf5): once reverting a hook from a `.bak` via raw Buffer write (`git diff` showed 350/350 EOL-only — fixed via `git checkout --`), once committing a `build-milestone-progress.mjs` Edit (517/491 — the real change was 28/2).

**How to apply:**
1. **After any Edit/Write to an EXISTING repo file, before committing:** `git diff --numstat -- <file>`. If insertions ≈ deletions ≈ file line-count, it is an EOL flip, not your edit.
2. **Confirm + normalize:** `git diff HEAD --ignore-cr-at-eol --numstat -- <file>` shows the REAL change size. To fix, convert CRLF→LF and (re)commit:
   `node -e "const fs=require('fs'),p='<file>';fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'))"`
3. **For a raw revert from a backup,** prefer `git checkout -- <file>` (restores git's canonical EOL) over a raw `fs` Buffer copy (which preserves whatever EOL the backup had).
4. **Amend vs new commit:** if the flip is in your OWN just-made, unmerged slot commit, `git commit --amend` after normalizing gives clean blame (better than a churn-on-churn "normalize EOL" follow-up). On a shared/merged commit, use a new commit.

**Standing fix idea (queued, not yet built):** add `.mjs`/`.ts`/`.md` → `text eol=lf` to `.gitattributes` so git normalizes on commit regardless of the tool's CRLF — would make this class structurally impossible. The `/encoding-guard` hook+skill exists but does not catch the Edit-tool-CRLF-on-LF-file flip at commit time.

Related: [[feedback_bootstrap_commit_check_peer_wip]] (the other "check git diff before committing" reflex) · [[feedback_verify_actual_contract_not_proxy]] (PS codepage mangles non-ASCII — sibling Windows-EOL/encoding gotcha).


## Related
[[skills/g|/g]] • [[skills/merged|/merged]] • [[skills/encoding-guard|/encoding-guard]] • [[skills/encoding|/encoding]]