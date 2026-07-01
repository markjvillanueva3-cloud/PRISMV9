---
name: reference_sierra_vault_link_heal_2026_06_17
description: "Sierra filled the #1 Obsidian 2nd-brain gap (orphans) + inventoried remaining avenues (2026-06-17, commit 6a989c403a). BUILT scripts/vault-link-doctor.mjs -- the broken-wikilink remediation alpha DEFERRED in d579626848. LIVE APPLIED+verified: healed 12,642 links in 12,560 files (all backed up to state/shared/vault-link-heal-backup-2026-06-17T17-54-30-555Z), orphans 16,628->4,245 (-74%, 23.9%->6.1%), resolvedLinks +12,618, re-diagnose HEALABLE=0 (convergent). EXACT slug-equality (NOT edit-distance) so it is IMMUNE to the prior U-VAULT-LINK-HEAL-HARDEN short-token hole -- audited 0/12,629 heals were <=4-char tokens (all >=7, 99.97% >=10). 18 mutation-proof tests; 3-agent scrutiny core-PASS, fixed P0 backup-reversibility (12,499/12,566 healable files git-UNTRACKED) + P2 code-span convergence + TOCTOU. SUPERSEDES fix-broken-wikilinks.mjs (kept)."
type: reference
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.202Z
aliases: reference_sierra_vault_link_heal_2026_06_17
---


# Sierra: vault link-heal (#1 gap filled) + improvement inventory (2026-06-17)

Operator: "fill all gaps and find all avenues of improvements we haven't applied yet."
Continuation of [[reference_sierra_obsidian_2ndbrain_assessment_2026_06_17]].

## #1 GAP FILLED: orphans 16,628 -> 4,245 (-74%) -- commit 6a989c403a
`scripts/vault-link-doctor.mjs` -- the remediation alpha DEFERRED (their d579626848 fixed
the GENERATOR; this heals the backlog). Classifies every broken `[[link]]`: HEALABLE
(unique EXACT slug-equality rematch -> safe SOURCE-rewrite of authored intent, NEVER
invents), DANGLING (no/ambiguous candidate -- 150 ambiguous -- untouched), NON_NOTE
(.base/external -- untouched). Surgical per-occurrence (preserves alias/heading),
code-fence-safe, atomic, sync-lock re-checked per-file, per-run ORIGINAL backup.
LIVE verified: 12,642 links / 12,560 files; orphans 16,628->4,245; resolvedLinks
142,458->155,076; re-diagnose HEALABLE=0 (idempotent). 18 mutation-proof tests.

## CRITICAL: checked + immune to the PRIOR over-confident heal (verify-against-prior-work)
A prior sierra `U-VAULT-LINK-HEAL-HARDEN` (d948b85a74e7, 2026-06-08) DISARMED ~14,100
auto-applies because its EDIT-DISTANCE scorer matched short-token near-collisions as
renames (goal->go, echo->eco, skill->mill, null->mill). Before trusting my apply I AUDITED:
my tool uses EXACT slug-equality (not Levenshtein) so goal/go never match; empirically
0/12,629 heals were <=4-char tokens (all >=7, 99.97% >=10). Deliberately did NOT copy the
prior MIN_LEN=8 guard -- for EXACT matches a short token (`[[wedm]]`->wedm.md) is correct,
not dangerous. Header documents the immunity so no maintainer reintroduces fuzzy matching.

## Scrutiny lessons
- Arm A P0: my "git is the undo" was WRONG -- 12,499/12,566 healable files are git-UNTRACKED-new
  (I extrapolated "tracked" from ONE file). Fix: per-run file-copy backup is the real undo.
- Arm C P2: diagnose didn't strip code spans but rewriteLinks did -> non-convergent count.
  Fix: stripCode in diagnose; re-diagnose now = 0 (proven).
- Arm B HALLUCINATED its review (cited vitest tests that don't exist; 2 tool calls). DISCARDED
  per R12 after verifying its claims against the real file. A reviewer can be wrong.
- DEDUP: missed fix-broken-wikilinks.mjs on first grep (wrong terms) -> caught it via memory-recall
  before shipping; reconciled (mine supersedes for remediation, kept theirs).

## REMAINING AVENUES (ranked, the "find all" deliverable) -- 4 units shipped 2026-06-17
1. [DONE f5b6399112 U-VAULT-AMBIGUOUS-REVIEW] `vault-link-doctor.mjs --ambiguous` surfaced the 169
   ambiguous broken links -> state/shared/vault-ambiguous-links-report.json. CORRECTION (R12, verified
   2026-06-17): my first read that these are "reference<->galaxy FILE duplicates" was an OVER-REACH.
   The candidates resolve via the navigator's slug index, which keys on filename + `name:` + `aliases:`
   frontmatter -- so the ambiguity is largely ALIAS/NAME slug-collision, NOT file duplication. A
   recursive basename walk found 0 duplicate-basename SETS across 19,947 memos (though `ls` confirms a
   FEW individual same-basename pairs exist; the walk-vs-disk contradiction was NOT resolved in bounded
   effort -- drift-cap). => a dedup reconciler is NOT warranted (no systemic file-dup target;
   alias-collision intent is unknowable -> the --ambiguous advisory report IS the right level, no safe
   auto-fix). NEXT clean unit = MECE uncategorized/ (10 files) or /Daily writer. Residual 4,245 orphans
   still need the risky invent-link path. Supersession detector+mark also shipped (b397e08da3+bf3a7c3c58)
   -- see [[reference_sierra_vault_supersession_detector_2026_06_17]].
2. [DONE 6358abaad4 U-VAULT-CONTRADICT-MEMORY] Auto-Dream contradiction-detector = lint-memory-contradictions.mjs
   (extends my wiki NLI engine to doctrine memos; found 1 real contradiction). [[reference_sierra_memory_contradiction_lint_2026_06_17]].
3. MECE: `knowledge/memories/uncategorized/` (10 files) -- recategorize or document.
4. /Daily protocol -- inbox/mistakes/connections dirs EMPTY; a daily writer.
5. Schedule maint scripts (promote-memory-to-wiki + vault-rot-sentinel + vault-link-doctor) --
   GATED by MIGRATION-FREEZE-ACTIVE.flag (present; do NOT arm).
6. wiki/index.md metadata fresh (1283 entries, 2026-06-17) -- already closed.

Backup: `state/shared/vault-link-heal-backup-2026-06-17T17-54-30-555Z`. Sibling:
[[reference_sierra_obsidian_2ndbrain_assessment_2026_06_17]] · [[reference_obsidian_wikilink_dangling_fix_2026_06_09]].
