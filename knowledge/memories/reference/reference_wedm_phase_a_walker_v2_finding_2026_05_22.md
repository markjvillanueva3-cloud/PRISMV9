---
name: reference-wedm-phase-a-walker-v2-finding-2026-05-22
description: Phase-A walker v2 (cross-tree, stem-only) returns only 1 high-confidence pair out of 1,346 wire programs against 67,958 unique blueprint stems in the JM Die archive. The mismatch is in the *matcher*, not the corpus — orphan programs carry bare part-numbers (`9100928`, `b-18823`, `57-pp-246e-09`) while the blueprint side almost certainly carries job/customer/date prefixes around the same ID. Phase A is gated on a v3 walker that does substring / token / numeric-core matching, not exact-stem.
aliases: reference_wedm_phase_a_walker_v2_finding_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.254Z
---


**2026-05-22 charlie /loop iter 29.** v2 walker (`scripts/wedm-pair-jm-die-blueprints-v2.mjs`) ran clean against `H:\prism\JM DIE`. Output:

```
scanned: { blueprint_files: 169252, program_files: 4044,
           blueprint_stems: 67958, program_stems: 1346 }
pair_count_total: 1
pair_count_high_confidence: 1   (AF102-05 — OMG INC)
orphan_programs_count: 1345
orphan_blueprints_count: 67957
```

The single matched pair:
- 8 blueprints (dxf+stp pairs in 4 different folders for AF102-05.dxf/stp)
- 2 programs (`MCAM X8/OMG/AF102-05.mcx-8`, `OMG/AF102-05.mcx-8`)
- customer-token overlap on `OMG` → confidence `high`

## Why 1 / 1346 = 0.07% is the matcher's fault, not the corpus's

Orphan program sample shows bare part-numbers + heat numbers:
`123, 16-140, 16-60, 33-8208-00, acme_11-10346-0, 4236-sglr_rev_c, a-0388-5, b-18823, b-18992, b-19370, ch70, 9100928, 9101253, 9101254, 9101646, 9101796, 9101969, 9101970, t, 57-pp-246e-09`

These are real Mitsubishi/Sodick job names. The blueprint side has 67,957 unique stems — that's a huge surface to match against. The reason exact stem-match fails:

1. **Blueprint prefixes** — shop drawings are almost always saved with a job/customer/date prefix that the wire program doesn't carry: `OMG_AF102-05_REV3.pdf` vs `AF102-05.mcx-8`.
2. **Number reuse across customers** — `123` and `t` and `ch70` are program-name conventions that won't survive normalization at all (already-too-short).
3. **My normalize is too strict** — it strips `-rev1, _R2, (2), copy, backup, bak, old` but does not extract a core ID, does not handle prefix substrings.

The 67,957-stem blueprint side is the asset; the matcher is the limit.

## v3 walker design (the asset Phase A really needs)

Build `scripts/wedm-pair-jm-die-blueprints-v3.mjs` with **three-tier matching**:

- **Tier 1 (exact stem)** — v2's current path. Yields the 1 high-confidence pair.
- **Tier 2 (substring containment)** — for each program stem (≥4 chars), find blueprint stems where `program_stem` is a substring OR vice versa. Score on length-overlap ratio. Filter by customer-hint overlap to prevent cross-customer false-positives.
- **Tier 3 (numeric-core extraction)** — regex out the longest digit-or-dash-or-letter run (`[A-Za-z0-9-]{4,}`) from each program stem, find blueprints whose stem contains that core. Same customer-hint gate.

Output schema unchanged — just adds `match_tier: "exact" | "substring" | "numeric_core"` to each pair.

Expected yield based on the orphan sample: tier-2 + tier-3 should land 40-70% of the 1,345 orphan programs into pairs (probably 500-900 high+medium-confidence pairs), enough to seed Phase-A training in earnest.

## Phase-A status after this iter

- **Walker v1 (single-tree)**: committed `fd4caa061a` — 0 pairs (architectural mismatch, expected).
- **Walker v2 (cross-tree, exact-stem)**: this iter — 1 pair (matcher too strict, found).
- **Walker v3 (cross-tree, three-tier fuzzy)**: next iter — projected 500-900 pairs (matcher fits corpus).
- **Print parsing (BlueprintVisionOCR + DXFGeometryParserEngine)**: not started; gated on v3 yielding usable pair count.
- **End-to-end demo**: already DELIVERED iter 24 with `wedm_print_to_program` from 3-line spec — see [[reference_wedm_wizard_proof_and_architecture_2026_05_22]].

## The AF102-05 pair is real value right now

Even 1 pair is a starter — it lets me prove the next-step pipeline end-to-end without v3:

```
AF102-05.dxf → DXFGeometryParserEngine → contours[]
                    ↓
wedm_print_to_program({ contours, material: <inferred from OMG INC tooling>, … })
                    ↓
generated G-code
                    ↓
wedm_program_compare(reference: AF102-05.mcx-8 text, generated)
                    ↓
deviation report → first real training datapoint
```

When v3 lands, this same pipeline runs across 500-900 pairs and the corpus is real.

Related: [[reference_wedm_wizard_proof_and_architecture_2026_05_22]] · [[reference_charlie_loop_close_out_2026_05_22]].
