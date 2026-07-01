---
name: reference-ab-locator-over-pairing-human-revisions-2026-05-27
description: Empirical iter256 finding — the AB-locator pairs `-A`/`-B` filename-sibling human-revision pairs in the same scored-summary buckets as PRISM_UPGRADED v2.0.0 upgrade pairs. The pairing is technically correct (iter165 A_PATTERNS designed to handle ACME's `-A`/`-B` source-folder convention) but downstream `--score` consumers conflate two semantically distinct categories. Candidate fix: add `--upgraded-only` flag OR emit `pair_type: "prism_upgraded" | "human_revision"` field.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.459Z
aliases: reference_ab_locator_over_pairing_human_revisions_2026_05_27
---


# AB-locator over-pairing: human-revisions vs v2.0.0 upgrades

## The behavior

The iter165 A_PATTERNS added support for ACME's `-A` / `-B` filename-suffix convention (where a human operator saves revisions side-by-side: `A-11-10591-0-A-CADET.MIN` + `A-11-10591-0-B-CADET.MIN`). The locator correctly pairs these as `(a=..._A-CADET, b=..._B-CADET, customer=ACME, part_num=A-11-10591-0-CADET)`.

The iter200 PRISM_UPGRADED pattern added support for B-versions inside `PRISM_UPGRADED/<Machine_Model>/...` subdirectories. The locator pairs these as `(a=<rootfile>.MIN, b=PRISM_UPGRADED/.../partname.nc, customer=ACME, part_num=...)`.

Both pairings are individually correct. But downstream `--score` consumers (e.g. `scan-jm-die-ab-pairs.mjs --score`) bucket them together in the JSONL output, and analyzing the resulting avg_delta_lines mixes two semantically distinct categories:

| Pair type | Source | What "delta" means |
|-----------|--------|-------------------|
| PRISM_UPGRADED | AI-generated v2.0.0 pipeline | Pipeline behavior signal (header count, body rewrite rate) |
| Human `-A`/`-B` revision | Human operator (CAM programmer) | Operator-edit signal (manual cycle improvements, NOT v2.0.0) |

## Empirical evidence (iter249 → iter254)

iter249 ACME scan reported `avg_delta_lines = +76`. iter254 investigation found:
- 14 of 20 scored pairs were PRISM_UPGRADED (uniform delta = +112)
- 6 of 20 scored pairs were `-A`/`-B` human revisions (variable delta including negative: -77, -21, -20, -6, +9, +60)

The combined arithmetic mean (~+76) is a meaningless statistic because it averages across two categorically different processes (AI pipeline emission vs human program revision).

After filtering for `b_path.includes('PRISM_UPGRADED')`, ACME's true v2.0.0 pattern is uniform delta = +112 (n=14), matching the multi-machine header-stacking behavior also seen in AGRATI (19/19 at +112).

## Proposed fix

### Option A — Scanner flag (minimal change)

Add `--upgraded-only` flag to `scan-jm-die-ab-pairs.mjs` that filters paired output to PRISM_UPGRADED B-paths during write:

```js
const UPGRADED_ONLY = FLAGS.has("--upgraded-only");
// ...inside pair loop...
if (UPGRADED_ONLY && !pair.b.full_path.includes("PRISM_UPGRADED")) continue;
```

### Option B — Pair-type field (semantically richer)

Emit `pair_type` field per record (no filtering, but downstream consumers can discriminate):

```js
record.pair_type = pair.b.full_path.includes("PRISM_UPGRADED")
  ? "prism_upgraded"
  : pair.a.full_path.match(/-A[-_./]/i) ? "human_revision" : "unknown";
```

Option B is preferred for forward extensibility (downstream wizard training would want to learn from BOTH pair types but score them separately).

## Impact on existing memos

- `[[reference_jm_die_v2_upgrade_pattern_2026_05_27]]` — ACME row's `+76 avg_delta_lines` should be corrected to `+112 (PRISM_UPGRADED only, n=14)` in a follow-up edit. Same correction needed for AGRATI's `+105` (likely also contaminated by `-A`/`-B` revisions).
- `[[reference_jm_die_v2_upgrade_camcar_passthrough_2026_05_27]]` — already documents the corrected ACME finding (iter254 update).

## Pre-iter implementation note

Not shipping the code fix this iter (context-budget management per [[feedback_yolo_mode_nonterminal_goal_pattern]] context-wall discipline). Recording as candidate unit `U-AB-LOCATOR-PAIR-TYPE-DISCRIMINATION` for next-session pickup.

The fix is small (~5 lines for Option B, ~3 for Option A) but requires:
1. Edit `scripts/scan-jm-die-ab-pairs.mjs`
2. Re-run full-archive scan to regenerate `jm-die-ab-pairs-2026-05-27.jsonl` with pair_type fields
3. Update test fixtures in `scripts/lib/lathe-ab-version-locator.test.mjs` if pair_type is added to the pure-helper output

## Iter269 update — empty-A-source degenerate-pair class

iter269 verified that the ITW outlier flagged by iter260 (`A.MIN`, originally described as "4-line stub") is actually an EMPTY file: 4 blank lines, no content. The v2.0.0 pipeline processed this empty source and emitted 116 lines of stacked annotation headers + zero body.

This is a third class of locator output beyond `prism_upgraded` and `human_revision`:
- `empty_source` — A-file has <10 non-blank lines of actual code; pipeline output is degenerate-metadata-only.

These pairs should be filtered from any training-signal aggregation because:
1. The A-source has no machining content to learn from.
2. The B-side contains pure metadata, not a real upgrade target.
3. They skew avg_delta_lines metrics (iter260 saw ITW's "+17 avg" largely driven by this single empty-source outlier; without it ITW would be uniform +12).

Candidate-unit extension: `U-AB-LOCATOR-PAIR-TYPE-DISCRIMINATION` should add a 3rd `pair_type` value: `empty_source`. Heuristic: A-file's non-blank, non-comment line count < 10. Fix size: ~5 additional lines in scan-jm-die-ab-pairs.mjs alongside the existing iter257 `pair_type` logic.

## Related

- `[[reference_jm_die_v2_upgrade_camcar_passthrough_2026_05_27]]` — iter253/254/255 cross-customer pattern findings
- `[[reference_jm_die_v2_upgrade_pattern_2026_05_27]]` — original iter218 pattern memo (RETRACTED via iter261, metrics corrected)
- `[[reference_iter218_alcoa_outlier_retraction_2026_05_27]]` — iter261 R12 retraction
- `[[reference_whiskey_iter250_cron_re_establishment_2026_05_27]]` — iter250-268 work trace + iter218 closure chain
- `[[reference_whiskey_session_final_iter228_2026_05_27]]` — predecessor session memo
- `scripts/scan-jm-die-ab-pairs.mjs` — scanner where iter257 flag landed; empty-source filter pending
- `scripts/lib/lathe-ab-version-locator.mjs` — pure helpers; iter165 A_PATTERNS + iter200 PRISM_UPGRADED both live here
