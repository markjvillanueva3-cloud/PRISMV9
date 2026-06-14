---
name: reference_cad_topology_iter23_30_2026_05_25
description: CAD-PIPELINE-WIRE-MS0 iter+23..+30 on slot:delta 2026-05-25 — long-tail discovery + machine routing + count-based detector + landing + test suite. Pipeline matured from coverage-tuning to domain-aware. Corpus 1.24GB → 95MB after routing. 22 tests guard regression per R12.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.043Z
aliases: reference_cad_topology_iter23_30_2026_05_25
---


# CAD topology pipeline — iter+23..+30 arc (architectural maturity)

8 commits on slot:delta. Closes the 30-iter arc.

## Iter-by-iter

| iter | commit | headline |
|---|---|---|
| iter+23 | 4a47199be5 | doc reflection iter+14..+17 + desktop refresh |
| iter+24 | 454a802566 | dry-run lists cap-bound slugs → 177/558 are MACHINE catalogs |
| iter+25 | 0822a82735 | machine-catalog pattern detector + lighter caps routing |
| iter+26 | a681cc9ec1 | expand patterns 24→46 (kern/heller/brother/st/etc) |
| iter+27 | 53d5f8f0c3 | **count-based isComplexAssembly pivot** (pattern-independent) |
| iter+28 | b037c15f0d | LANDING: corpus 1.24GB→95MB (13×), dry-run 99.93% accurate |
| iter+29 | ed1aebd984 | 13-case detector test suite |
| iter+30 | 29d9b999e6 | 2 integration tests over iter+28 corpus (impeller multi-body + machine lightweight) |

## The discovery → pivot → landing arc

iter+24's dry-run extension revealed that **177/558 (31.7%) of cap-bound slugs were whole-machine catalog STEPs** (haas-, datron-, dn-solutions-, etc), not impeller-class manufactured parts. iter+25 acted on this with pattern-based routing → lighter caps for machines. iter+26 expanded patterns when the dry-run re-discovered more (kern-, heller-, brother-, mate-precision-tooling-). iter+27 pivoted architecturally to count-based detection (any geom with >200 cyls OR >400 planes OR >600 total primitives routes to lighter caps regardless of name) — pattern-INDEPENDENT, future-proof. iter+28 LANDED the routing via corpus re-emit: 1241 MB → 95 MB (13× reduction). iter+29+30 protected the routing with 22-case test suite encoding real corpus invariants.

## Final corpus state

- 558 slugs emitted
- 127,368 ADVANCED_FACE total
- 95.03 MB disk
- avg 228 faces/slug
- 200-slug normalized fidelity median: 65.2%

Per-surface-type composition (after machine routing):
- cyl: 3,044 regen / 22,347 source = 13.6%
- plane: 30,404 regen (normalized 5,067 unique) / 68,663 source = 7.4%
- cone: 1,170 / 5,522 = 21.2%
- spline: 1,718 / 20,208 = 8.5%

Numbers LOOK lower than iter+22 (which counted full machine catalogs at full caps), but represent HONEST manufactured-part-focused coverage. The actual impeller-turbine emit unchanged at 678+ faces.

## Test suite (22 cases protecting against regression)

- 9 validator cases (5 schema versions × edge cases + 2 real-corpus integration)
- 13 detector cases (machine prefix variants + thresholds + corpus invariants)
- All pass in 128ms via `node --test`

## Cross-refs

- [[reference_cad_topology_emitter_2026_05_25]] — iter+1 base
- [[reference_cad_topology_iter5_7_2026_05_25]] — slab emitters
- [[reference_cad_topology_iter8_13_2026_05_25]] — B-spline + reporting
- [[reference_cad_topology_iter14_17_2026_05_25]] — tooling + bulk dry-run
- [[reference_cad_topology_iter18_22_2026_05_25]] — cap-raise loop
- Scripts: `cad-emit-impeller-fusion-step.mjs`, `cad-dry-run-corpus.mjs`, `cad-corpus-topology-emit-all.mjs`, `cad-corpus-fidelity-ratio.mjs`, `cad-fidelity-html-report.mjs`, `cad-to-desktop.mjs`
- Tests: `cad-emit-impeller-fusion-step.test.mjs`, `cad-step-topology-validate.test.mjs`
- Wiki: [`knowledge/wiki/architecture/cad-pipeline-closed-loop.md`] — full 30-iter table

## Methodology generalization (the durable value)

The 30-iter arc proved a methodology that generalizes to any PRISM pipeline with knob-tunable behavior:

1. **Build the diagnostic first** — a bulk-dry-run tool that predicts outcomes from configuration
2. **Let data reveal limits** — extend the diagnostic to surface where the current approach fails
3. **Evolve the approach** — when patterns won't scale, pivot to count-based or other invariants
4. **Land via real run** — the diagnostic predictions must be empirically validated
5. **Protect with tests** — encode the discovered invariants in regression tests

Per iter+28: dry-run predictor was 99.93% accurate. The methodology IS the contract.
