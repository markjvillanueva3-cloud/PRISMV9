---
name: reference_sierra_vault_link_sepvariant_2026_06_18
description: "Sierra shipped U-VAULT-LINK-SEPVARIANT (commit 2b0ab02127, 2026-06-18, branch cad-fusion-live-ms0) -- a 2nd canonical derank in vault-link-doctor's classifyBrokenTarget (after the mirror/stub one) that resolved 80 generator-dup ambiguous broken links: vault-health ambiguous broken links dropped 95 -> 15. ROOT: a wiki-generator dup-emit where the SAME logical formula/engine note exists in the SAME dir under a kebab basename (formula-x-quote.md) AND a concatenated one (formula-xquote.md) -- both slugify identically, so a [[formula-x-quote]] link matched BOTH and stayed ambiguous (never auto-healed). preferKebabVariant(cands) returns the unique most-separated candidate IFF all candidates share dir AND separator-stripped basename (the same logical note differing only by separator placement); else null -- so cross-dir/category dups, genuine different-note rivalries, and max-separator ties stay ambiguous (never guesses). Selection KEYS on separator count (= kebab-case wiki slug convention), NOT file size. Investigation triaged ALL 95 ambiguous links first (measure-first, R8): 80 = this same-dir separator dup, 11 = category-dir dups (engines/calc vs engines/other -- no kebab tell, untouched), ~6 tests-candidate (untouched). Heals reversible via applyHeals backup-before-mutate. +3 tests (29 green, incl R9 fixture flip DANGLING->HEALABLE). 2-arm scrutiny PASS 0 P0/P1; arm B caught + I fixed an R12 docstring OVERCLAIM in-commit ('the larger file in all 80 pairs' was false for the broader population -- live the fn collapses 278 pairs and in 27 the kebab is SMALLER; behavior is still safe because all 40 REACHABLE heals are correct + selection is by separator count not size). The investigation found real high-ROI work where a 'thin backlog' was assumed -- measure-first paid off."
type: reference
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.202Z
aliases: reference_sierra_vault_link_sepvariant_2026_06_18
---


# Sierra: vault-link-doctor separator-variant collapse (2026-06-18)

Autonomous vault-ops tick. The contradiction-honesty arc was complete + the backlog looked
"thin", but the re-block storm + "never idle" pushed me to INVESTIGATE the one remaining non-OK
signal (ambiguous broken links INFO 95) instead of idle-stopping. Measure-first found real work.

## Investigation (measure-first, all 95 -- R8 / ALL-MEANS-ALL)
Categorized every one of the 95 ambiguous links before touching code:
- **80** = same-dir SEPARATOR dup (`formula-...-additive-quote.md` vs `...-additivequote.md`):
  the wiki formula-node generator emits BOTH a kebab and a concatenated basename; both slugify
  identically so the link matches both. Verified all 80: both files exist, kebab is larger/canonical.
- **11** = category-dir dup (same basename in `engines/calc/` vs `engines/other/`) -- no safe
  canonical tell, left ambiguous.
- **~6** = a `tests/` candidate alongside a real one -- left ambiguous (separate pattern).

## The fix (commit 2b0ab02127)
`preferKebabVariant(cands)` in vault-link-doctor.mjs: unique most-separated candidate IFF all
candidates share dir AND separator-stripped basename; else null. Wired into `classifyBrokenTarget`
AFTER the mirror/stub derank, only when >1 canonical remains. The OLD docstring said these were
"deliberately NOT touched (no canonical-vs-mirror distinction to exploit)" -- updated, since the
kebab-case form IS the distinction. Live: ambiguous 95 -> 15.

## The R12 catch (why the 2-arm gate earns its keep)
Arm B re-ran the analysis on the LIVE vault and found my docstring's "the larger file in all 80
pairs" was an OVERCLAIM: the fn actually collapses 278 same-dir sep-variant pairs and in 27 the
kebab form is the SMALLER file. Behavior is still correct (all 40 REACHABLE heals pick the right
file; selection is by separator COUNT, not size -- size only corroborates). Fixed the docstring
in-commit to say "separator count is the key, size only corroborates in reachable heals" + dropped
the frozen "80"/"all" quantifier. Two more P2 clarity comments added (root-level fail-closed; the
sepNorm-vs-sepCount space asymmetry). Lesson: don't freeze a sampled count ("80") into a universal
"all" claim -- the live population is larger + the invariant is corroborating, not load-bearing.

## Residual + ownership
15 ambiguous remain: 11 category-dir dups + ~4. Root cause of BOTH the 80 (sep) and 11 (category)
is the upstream wiki engine/formula-node GENERATOR emitting duplicate basenames -- the proper fix
is generator-side (business/quoting owns the formula nodes). The link-doctor derank is the correct
link-RESOLUTION mitigation (resolve to canonical), not the dup-file fix.

## Siblings
[[reference_sierra_vault_link_derank_2026_06_17]] (the mirror/stub derank this extends) ·
the contradiction-honesty arc [[reference_sierra_nli_vote_stabilization_2026_06_18]] ·
[[reference_sierra_nli_budget_2026_06_18]] · [[reference_sierra_vault_health_covdisplay_2026_06_18]].
