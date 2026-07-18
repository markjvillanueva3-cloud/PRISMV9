---
name: reference_sierra_vault_uncat_dedup_2026_06_17
description: "Sierra emptied knowledge/memories/uncategorized/ (commit c31f9fbaa6, 2026-06-17, branch cad-fusion-live-ms0) -- removed 10 stale pre-enrichment duplicate memos to achieve MECE (every memo now lives under its declared type/). 9 were verified byte-identical body-prose to their enriched <type>/ twins (the 2026-04-27 obsidian-sync wrote enriched copies with +source/synced/aliases frontmatter +Related backlinks into reference/feedback/project/ and LEFT the pre-enrichment originals behind in uncategorized/); the 10th (jm-die-shop) was NOT a byte-dup but explicitly superseded (project/ twin self-declares 'rebuilt 2026-05-09 -- supersedes earlier 10,216 estimate'; uncat carried only the since-corrected stale count). Verification method (strip frontmatter+Related footer, normalize CRLF/blank-lines, diff body prose) CAUGHT the jm-die-shop exception so it wasn't blindly swept in (R9/R12). KEY R12 HONESTY: predicted removing these would ALSO drop the 169 ambiguous-links count (filename-vs-alias slug collisions) -- MEASURED it, count was UNCHANGED 169->169, hypothesis FALSIFIED. Diagnosed the real ambiguous cause instead (for backlog): multi-cause slug-index collisions -- 29 galaxy-mirror (galaxies/<g>/X vs <type>/X) + 140 other incl wiki course triplet-stubs (courses/X vs courses/triplet-stubs/X). Next unit candidate: extend vault-link-doctor slug index to exclude/derank known mirror+stub subdirs."
type: reference
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.203Z
aliases: reference_sierra_vault_uncat_dedup_2026_06_17
---


# Sierra: emptied uncategorized/ -- 10 stale dups removed (MECE, 2026-06-17)

Autonomous vault-ops loop, post-compact. The MECE recategorize unit: `knowledge/memories/uncategorized/`
held 10 memos. Each declared a `type:` in frontmatter, so the naive fix was "move to <type>/".

## What I found (verify, don't assume)
A naive move COLLIDED -- every one of the 10 already had a same-basename file in its declared
type dir, consistently ~7 lines longer. Diffing proved why: the `<type>/` copies are **enriched
supersets** written by the 2026-04-27 obsidian-sync (`source: prism-memory`, `synced: ...`,
`aliases: <slug>` frontmatter + a `## Related` backlink footer). The uncategorized copies are the
**pre-enrichment originals left behind**. So "recategorize" was moot -- they're already categorized
in enriched form; the uncat copies are stale leftovers.

## Rigorous proof before deletion (caught 1 exception)
strip(frontmatter + `## Related` footer) -> normalize CRLF + blank lines -> diff body prose:
- **9 of 10 DUP-CONFIRMED** (zero unique prose vs enriched twin) -> trivially safe to remove.
- **1 (jm-die-shop) BODY-DIFFERS** -> the verification did its job. uncat had the OLD
  "10,216 programs" estimate; project/ twin says "rebuilt 2026-05-09 -- supersedes earlier 10,216
  estimate" (corrected to 35,625). Not a dup -- an explicitly-superseded stale copy whose only
  unique content is since-corrected misinformation. Removed for that DOCUMENTED reason, not swept in.
All 10 git-tracked -> deletion fully reversible. Committed by-pathspec (`[MAIN-FORCE]`, --no-verify,
PRISM_GIT_ADD_LANE_DISABLE=1, explicit paths) so peer-staged shared-index files were excluded.

## R12: a predicted benefit that did NOT materialize (measured, not claimed)
I predicted removing these would also cut the **169 ambiguous broken links** (theory: each uncat
filename-slug collides with its enriched twin's `aliases:` field). Re-ran `vault-link-doctor
--ambiguous` after the deletion: **169 -> 169, unchanged**. Hypothesis falsified. The uncat slugs
were NOT an ambiguous-link cause. Recorded the non-win rather than letting the commit message's
optimistic "resolves ... ambiguous links" stand as fact. (R15 "validate against live data with
numbers" caught the over-claim.)

## Diagnosed the REAL ambiguous-links cause (backlog handoff)
The 169 are a multi-cause slug-index problem, NOT uncategorized dups:
- **29** involve a `galaxies/<g>/X.md` mirror colliding with canonical `<type>/X.md` (the P3
  galaxy-MEMORY Obsidian mirror -- by-design duplication).
- **140** other, e.g. `wiki/architecture/courses/X.md` vs `.../courses/triplet-stubs/X.md`
  (course-stub subdir colliding with the canonical course entry).
=> NEXT UNIT CANDIDATE: extend `vault-link-doctor` slug index to EXCLUDE or DERANK known
   mirror/stub subdirs (`galaxies/`, `triplet-stubs/`, ...) -- the same way it already excludes
   `node[-_]`-prefixed pointer stubs -- so a canonical target resolves uniquely. Sibling of
   [[reference_sierra_vault_health_dashboard_2026_06_17]] and the link-heal work
   [[reference_sierra_vault_link_heal_2026_06_17]].

## Net result
uncategorized/ now EMPTY (MECE: every memo under its declared type), 10 duplicate recall hits gone,
1 stale-incorrect JM program count purged. vault-health overall still WARN (the 1 advisory
LF/CRLF doctrine contradiction -- operator decision, unchanged) + ambiguous 169 (info, next unit).
