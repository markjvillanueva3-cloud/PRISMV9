---
name: reference-u-viz-tribal-density-2026-05-21
description: "G5 tribal-density heatmap roost shipped 2026-05-21 sierra — /system-viz augmentation showing where tribal knowledge accumulates (domain density bands). Complements echo's wiki-tribal coverage-gap roost."
aliases: reference_u_viz_tribal_density_2026_05_21
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.027Z
---


**SYSTEM-VIZ-HIGH-ROI-MS0/U-VIZ-TRIBAL-DENSITY (2026-05-21, slot:sierra)**

G5 of the SYSTEM-VIZ-HIGH-ROI audit. The **inverse** of echo's iter-9 `generate-wiki-tribal-features.mjs` (which surfaces wiki entries *lacking* a tribal companion — coverage gaps). G5 surfaces where tribal knowledge *already accumulates* — the heatmap of the manufacturing brain.

## What shipped (commit a73ae9c113 + doc-fix follow-up)
- `scripts/generate-tribal-density-features.mjs` (~283 lines) — scans `knowledge/wiki/code-tribal/**/*.md`, parses frontmatter `domain:` field, buckets tip counts by domain. Pure-core `generate({tipFiles, readTip, existingNodeIds, topN, hotThreshold, warmThreshold})` injectable; CLI wraps with real fs. Emits a `ghost.tribal_density` roost (L8, parent `ghost.planned_features`) + one L9 child per domain bucket, each tagged with a density band:
  - **hot** ≥10 tips (red)
  - **warm** ≥5 (orange)
  - **cold** ≥1 (yellow)
- `scripts/generate-tribal-density-features.test.mjs` — 10 `node:test` cases: 3 failure modes (non-array tipFiles throws, missing readTip throws, malformed frontmatter counted-not-crashed) + 3 adversarial (density-band boundary exactness 4→cold/5→warm/9→warm/10→hot, FNV-disambiguated node ids for slug-identical domains, frontmatter array values skipped not string-coerced).
- `scripts/merge-augmentations.mjs` — 3-site wiring (loadOptional + version-stamp + newNodes splice matching the **stagnantFeatures** convention — `existingIds` dedup + `edgeKey` dedup + `G.meta.tribalDensity`).
- `scripts/regen-viz.mjs` FAST[] entry.

## First live run
829 tip files scanned · **278** with curated frontmatter parsed · 34 domains · 6 hot / 7 warm / 21 cold buckets. The 551 unparsed are raw `canonical/` subdir extraction snippets *without* frontmatter — counted `tipsMalformed` (R12 fail-loud: counted, never silently dropped).

## Output
`state/shared/system-viz/tribal-density-augmentation.json` — `{schemaVersion, generatedAt, source, newNodes, newEdges, stats}`.

## Scrutiny
2-of-2 PASS (no blockers). Arm A: all 7 criteria met, pure-core injectable, parseTipFrontmatter rejects no-fence + skips array values. Arm B: band-boundary test exact (no loose `>=`), FNV-disambiguation hashes the *original* domain string not the slug, topN empty-env footgun handled, R12 fail-loud confirmed. One P2 doc-drift caught (header said "808 tips") — fixed in follow-up commit.

## Clean commit (no peer absorption this time)
Unlike G3 ([[reference_u_viz_ghost_wire_validate_2026_05_21]]), the atomic `git add … && git commit` chain landed all 4 files in one commit (a73ae9c113) — the absorption window only opens when files sit *untracked* between separate `git add` and `git commit` invocations. **Lesson confirmed:** on the shared `H:/prism` tree, always chain `git add && git commit` in ONE Bash call.

## Linked
- Audit spec: `state/shared/specs/SYSTEM-VIZ-HIGH-ROI-AUDIT*.md` G5
- [[reference_u_viz_ghost_wire_validate_2026_05_21]] — sister G3 unit (same pattern: pure generator → augmentation → merge 3-site → FAST[])
- [[reference_u_regen_viz_merge_faillod_2026_05_17]] — merge-augmentations.mjs needs `--max-old-space-size=16384` (4GB default OOMs on the 425MB graph)
