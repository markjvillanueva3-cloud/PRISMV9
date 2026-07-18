---
name: reference_sierra_vault_link_derank_2026_06_17
description: "Sierra added a CANONICAL-PREFERENCE DERANK to vault-link-doctor (commit a1892471f4, 2026-06-17, branch cad-fusion-live-ms0) -- cut ambiguous broken wikilinks 169->95 (-74, -44%). classifyBrokenTarget: when a broken slug matches >1 candidate note, drop candidates under known MIRROR/STUB subdirs (galaxies/ = per-galaxy MEMORY Obsidian mirror, triplet-stubs/ = course stub, _legacy-root/ = legacy pre-type-dir mirror) via isMirrorStub()/MIRROR_STUB_SUBDIR_RE; if EXACTLY ONE canonical remains -> HEALABLE to it (flagged deranked); else stay ambiguous but report the canonical-only rival pool (mirror noise removed). Bounded by the SAME slug-equality+uniqueness invariant as the pre-existing unique-slug heal -> no new wrong-heal surface (2-canonical or 0-canonical stay ambiguous). New derankedHeals counter surfaces the 74 honestly. MEASURE-FIRST discipline (after the prior unit's falsified hypothesis): measured the report BEFORE coding -- 74 of 169 are mirror-collisions, 95 remain GENUINE (~80 same-dir wiki formula slug-variants + 15 cross-section). Live verified ambiguous 169->95 exactly matches the measurement; +8 tests (27 total pass); per-file 2-arm scrutiny PASS 0 P0/P1. NEW FINDING surfaced (different owner): ~80 ambiguous are wiki/architecture/formulas/ generator emitting BOTH x-quote.md AND xquote.md (identical after slugify) -- a formula-node generator naming collision."
type: reference
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.202Z
aliases: reference_sierra_vault_link_derank_2026_06_17
---


# Sierra: vault-link-doctor canonical-preference derank (2026-06-17)

Autonomous vault-ops loop, unit 7. Directly continues the prior unit's R12 finding: the 169
ambiguous broken links were NOT caused by the uncategorized dups I'd removed -- they're
mirror/stub slug collisions. This unit acts on that diagnosis.

## Built (commit a1892471f4)
`classifyBrokenTarget` gains a CANONICAL-PREFERENCE DERANK. When a broken wikilink slug matches
>1 candidate note, candidates under known MIRROR/STUB subdirs are dropped:
- `galaxies/<g>/` -- the per-galaxy MEMORY.md Obsidian mirror (canonical = reference/|feedback/|project/)
- `triplet-stubs/` -- a course triplet stub (canonical = the parent course note)
- `_legacy-root/` -- a legacy pre-type-dir mirror of a root memo
If EXACTLY ONE canonical remains -> HEALABLE to it (flagged `deranked:true`). If >1 canonical (or
0) remain -> stay ambiguous-DANGLING, but report the deranked (canonical-only) pool so the
--ambiguous review surfaces the REAL rivals, not mirror noise. `isMirrorStub()` +
`MIRROR_STUB_SUBDIR_RE` (segment-anchored both sides, backslash-normalized). New `derankedHeals`
counter in diagnose() reports the 74 honestly in --json + the CLI HEALABLE line.

## KEY DISCIPLINE: MEASURE FIRST (corrected from the prior unit)
The previous unit (uncat-dedup) shipped on a FALSIFIED ambiguous-reduction hypothesis -- I
predicted a drop and it didn't happen. This time I measured the ambiguous report BEFORE writing
any code:
- 74 of 169 are mirror-collisions (canonical + a by-design mirror sharing a basename slug) -> fixable.
- 95 remain GENUINE: ~80 same-dir wiki formula slug-variants + 15 cross-section dups -> NOT mirror-fixable.
Then built to that number. Live `--json` after the change: ambiguous 169->95, derankedHeals 74 --
EXACTLY the measured prediction (R15 "validate with numbers"). The derank deliberately does NOT
touch the 95 genuine ones.

## Bounded safety (why it can't wrong-heal)
The derank only reclassifies to HEALABLE when `canonical.length === 1` -- the same
slug-equality + single-non-self-candidate invariant the pre-existing unique-slug heal already
uses. Two non-mirror canonicals (e.g. the formula variants) -> stay ambiguous. Zero canonical
(all-mirror) -> stay ambiguous. `--apply` rewrites the 74 to the canonical basename (broken ->
resolves); atomic write + per-file backup + sync-lock TOCTOU all preserved. Both scrutiny arms
(reviewer + code-analyzer) independently traced this and PASSed 0 P0/P1.

## NEW FINDING (surfaced, not mine to fix -- different owner)
~80 of the remaining 95 ambiguous are `wiki/architecture/formulas/` entries where the
formula-node GENERATOR emitted BOTH a hyphenated and a non-hyphenated file for the same formula:
`formula-...-additive-quote.md` AND `formula-...-additivequote.md` -- byte-distinct files that are
IDENTICAL after slugify -> permanent slug collision. The link-doctor correctly keeps flagging
them (it can't pick). FIX belongs to whoever owns wiki formula-node generation (business/quoting
formulas, the `additive-quote`/`casting-quote`/`injection-mold-quote` family) -- dedupe the
generator so it emits ONE canonical filename per formula.

## Siblings
[[reference_sierra_vault_uncat_dedup_2026_06_17]] (the diagnosis this acts on) ·
[[reference_sierra_vault_health_dashboard_2026_06_17]] (the dashboard that counts ambiguous) ·
[[reference_sierra_vault_link_heal_2026_06_17]] (the original heal classifier this extends).
