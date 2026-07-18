---
title: .gitignore anchoring gaps — a recurring large-artifact bloat source (verify per-file, never bulk-untrack)
type: lesson
tags: [git-hygiene, gitignore, bloat, big-blob, fleet-hygiene, golf, push-break]
slot: golf
date: 2026-07-01
related:
  - "[[fleet-hygiene-u-git-catchup-3]]"
  - "[[reference_git_corruption_missing_tree_2026_06_30]]"
  - "[[golf-tick-delegate-to-canonical-tools]]"
---

# .gitignore anchoring gaps — a recurring large-artifact bloat source

## The class

Large artifacts (VM disks, atomic-write temps, build bundles) get **tracked in git
despite a `.gitignore` rule that "should" cover them**, because the rule has an
**anchoring/pattern gap**. Since `.gitignore` is **not retroactive**, once a file is
tracked, the ignore rule is silently bypassed for it forever. These accumulate into
repo bloat and — when any single file exceeds 100 MB — **hard-block GitHub pushes**.
A single golf big-blob hunt (2026-07-01) found **three distinct variants**, each a
real tracked >30 MB artifact:

1. **Dir ignored, files not untracked.** `.gitignore` added `/docker/DockerDesktopWSL/`
   but the 4 VHDX VM disks (~114 GB) were already tracked → stayed tracked.
   Fix: `git rm --cached` the specific files. (`[[fleet-hygiene-u-git-catchup-3]]`)
2. **Delimiter-variant mismatch.** The atomic-write temp rule was `*.tmp.[0-9]*`
   (DOT-before-pid) but PRISM writers ALSO emit `*.tmp-[0-9]*` (DASH). The dash variant
   slipped past → a 114 MB `node-embeddings-768d.jsonl.tmp-35816` got committed
   (push-blocker). Fix: add the dash rule alongside the dot rule.
3. **Root-anchored rule misses a nested path.** `.gitignore` had `c/tmp/` (anchored to
   repo root) but a script wrote to `mcp-server/c/tmp/` (a leaked `C:\tmp` path) → the
   32 MB orphaned esbuild bundle there was not matched. Fix: add the explicit nested
   path `mcp-server/c/tmp/`.

## Detection (the big-blob hunt)

- Large tracked files: `git ls-tree -r --long HEAD | awk '$4 > 52428800'` (>50 MB) — the
  push-break candidates; `> 104857600` (>100 MB) are the GitHub HARD-rejects.
- The whole slipped-in class: `git ls-files -c -i --exclude-standard` lists **every**
  tracked file that matches an ignore rule.
- Confirm a fix: `git check-ignore -v <file>` (uses the index → tracked files read
  "not ignored"; add `--no-index` to test the *rule* itself post-untrack).

## ⚠ The critical safety rule: VERIFY PER-FILE, never bulk-untrack

`git ls-files -c -i` returned **1575** tracked-but-ignored files in PRISM — but they are
**overwhelmingly INTENTIONAL force-adds**, NOT bloat: source data committed in
gitignored dirs (`mcp-server/src/data/*-extracted.json` tool catalogs), the whole
`knowledge/wiki/` + `knowledge/memories/` vault, `state/**` data files. **A blanket
"untrack everything gitignored" is catastrophic data loss** — the dangerous direction.
So: untrack ONLY files you have individually verified are genuinely ephemeral /
orphaned / regenerable (a VM disk, a `.tmp-<pid>`, an esbuild bundle in a temp dir).
The big-blob hunt targets by SIZE + per-file nature, never by the bulk ignore-match.

## Follow-through

- Untracking (`git rm --cached`) is the **safe, reversible** half (files stay on disk,
  no history rewrite). Stripping the old blobs from history is a **separate,
  operator-gated `filter-repo` pass** — and it must target the verified strip-list by
  explicit path, never a bulk gitignored sweep (see the STRIP-vs-PRESERVE map in
  `[[reference_git_corruption_missing_tree_2026_06_30]]`).
- When you fix an anchoring gap, add the rule for BOTH the specific slipped file AND the
  general pattern (dash+dot, nested+root) so the class can't recur.
