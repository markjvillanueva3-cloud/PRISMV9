---
name: xsub-galaxy-coverage-gap-2026-06-13
description: CORRECTED 2026-06-13 — there is NO owned-by-slot coverage gap. The galaxy-roost pass already covers ALL 34 galaxies; the apparent pass-1 "skips" are redundant secondary anchors, not missing coverage. Do NOT chase this as a gap.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.279Z
aliases: reference_xsub_galaxy_coverage_gap_2026_06_13
---


## CORRECTION 2026-06-13 (slot:bravo) — the "4 fixable galaxies" claim below was STALE/WRONG (R12)
Verified live by running `generate-cross-substrate-edges.mjs` + reading `resolveGalaxyNode` (lines 154-312): owned-by-slot coverage is **34/34 — already complete** via the galaxy-roost pass (34 galaxy-roost@1.0 edges, self-emits the anchor node so NO galaxy is skipped for lack of an anchor). The generator reports "30 skipped (galaxy domain node id not confirmed)" but those are **pass-1 `eng.<galaxy>` secondary anchors** that don't match the exact naming convention — adding them would create edges REDUNDANT with the roost edges (same galaxy→slot relationship, different anchor node), NOT new coverage. **There is no real gap to fix here; manufacturing those 30 edges would be fabrication-adjacent churn with zero synergy gain.** owned-by-slot total = 79 (8 eng-canon@1.0 + 37 domain-infer@0.85 + 34 galaxy-roost@1.0). The AI-SYNERGY-AUDIT scores `crossSubstrate=1` for all 34 galaxies (gaps=0) — confirming the coverage is complete. Superseded; kept as a record of the verification. → [[reference_xsub_embeds_docby_oracle_2026_06_10]]

---

## ORIGINAL (stale — see correction above)

2026-06-13 (slot:bravo) — `generate-cross-substrate-edges.mjs` emits `owned-by-slot` synergy edges only for galaxies whose domain node `resolveGalaxyNode()` can confirm in `galaxy-constituents-augmentation.json` (it tries `eng.<galaxy>` / no-dash / underscore variants). **9 galaxies are skipped** — verified split:

**Correct skip (5) — no domain node exists to anchor (R12: do NOT fabricate a dangling edge):** compliance-safety, knowledge-conversion, corpus-aggregation, mit-curriculum, pdf-corpus-mill, cad-fusion-live. These are engine-light/doc-only galaxies with NO `eng.<g>` constituent node. Leaving them edge-less is correct.

**Fixable (4) — constituents exist under SCATTERED prefixes, not `eng.<galaxy>` (sierra unit):**
- golf → `core.scripts::golf-*`, `core.hooks_cl::golf-*`, `core.skills::*-golf` (17 constituents)
- shop-floor → `eng.shop::shopfloor*` (10)
- pdf-corpus → `eng.speed::speedfeedpdfcorpusbridge`, `core.scripts::generate-post-pdf-corpus-features`
- tribal-knowledge → `eng.tribal::*` (11)
These have a confirmable footprint but no SINGLE domain node. Fix = `resolveGalaxyNode` synthesizes/selects a representative domain node per galaxy (or the generator emits a synthetic `galaxy.<g>` anchor) → +4 `owned-by-slot` edges, raising owned-by-slot coverage 79→83 across all 34. **Owner: sierra (system-viz).** Bounded; no 548MB load (offset-oracle path).

Context: surfaced during the AI-systems-synergy /goal. The cross-substrate synergy edge set is otherwise live at 56,566 (embeds 56,098 + documented-by 388 + owned-by-slot 79 + consensus-of 1) staged in `cross-substrate-edges-augmentation.json`, folding on next scheduled `regen-viz` (merge-augmentations is 24GB-heap/reapable — do NOT run manually). → [[reference_cross_substrate_synergy_ms0_2026_06_03]] · [[reference_xsub_embeds_docby_oracle_2026_06_10]]
