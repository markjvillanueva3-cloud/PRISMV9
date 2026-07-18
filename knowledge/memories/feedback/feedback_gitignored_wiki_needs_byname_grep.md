---
name: feedback-gitignored-wiki-needs-byname-grep
description: knowledge/wiki/ is .gitignore'd, so Grep/ripgrep SILENTLY SKIP it. Cross-surface string eradication (falsehood/refactor sweeps) must grep wiki files BY NAME or use rg --no-ignore, else a defect survives the sweep.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.427Z
aliases: feedback_gitignored_wiki_needs_byname_grep
---


`knowledge/wiki/` is `.gitignore`-honored (the wiki is force-added selectively). **The Grep tool + `rg` silently SKIP gitignored dirs by default** — so a repo-wide content sweep NEVER searches the wiki files.

**Why:** During the whiskey FIX sweep (2026-05-29, commit `0643c0ba2f`), a P1 R12 falsehood (`lathe_spindle_torque_check`) survived the first eradication pass in **2 wiki files** because the tree-wide ripgrep skipped `knowledge/wiki/`. It was only caught by 3-of-3 arm C + an exhaustive by-name grep. A safety-relevant falsehood survived one full review cycle because of this trap.

**How to apply:** when eradicating/refactoring a string across ALL surfaces, do NOT trust a single tree-wide `Grep`/`rg`. Either (a) point Grep/Read at each wiki file BY NAME (explicit paths are always searched, even if gitignored), or (b) use `git grep` (searches tracked files incl. force-added wiki), or (c) `rg --no-ignore <pattern> knowledge/wiki/`. The canonical cross-surface verification covers: wiki ×N + soul + hook + skill + galaxy `.md` + C: memories. Fleet-wide lesson (not domain-specific). Related: [[feedback_reflect_all_changes_post_update]] · [[reference_whiskey_lathe_lint_tooling_2026_05_29]].
