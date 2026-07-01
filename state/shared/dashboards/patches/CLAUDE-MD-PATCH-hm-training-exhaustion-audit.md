# CLAUDE.md patch sibling — HM training exhaustion regression line

> Author: claude-3db3fb3d (slot=foxtrot), 2026-05-20.
> Target file: `H:/prism/CLAUDE.md` (peer-locked, patch-sibling per CLAUDE.md doctrine).
> Apply when: golf-slot integrator or any chat with CLAUDE.md write-access merges the next `## Recent regressions` batch.

## Proposed append

Insert under `## Recent regressions` (chronological by date):

```markdown
- 2026-05-20 | **F4 — tribal-embed-index has ZERO hyperMILL / hyperCAD-S entries fleet-wide** (HM-TRAINING-EXHAUSTION-AUDIT-2026-05-20). The 3 544 HM tribal tips harvested into `cad-engine/knowledge_store/doc-hypermill-*.json` are NEVER reachable by `tribal-by-domain-inject` vector recall — the embed-index has 0 matches for `doc-hypermill | hypermill | hyperCAD` source. Every chat asking a hyperMILL question gets BM25-only fallback recall over a zero HM-sized index. Discovered during /forge-audit-v2 run; measurable via `node scripts/hm-extraction-coverage.mjs --json \| jq '.embed_index_hm_count'` → currently `0`. | fix: HM-TRAINING-WIRING-PLAN-2026-05-20 U-HMT-EMBED-INDEX-WIRE — add `scripts/embed-knowledge-store-into-tribal-index.mjs` mirroring the wiki-side `embed-wiki-into-tribal-index.mjs` pattern that closed [[reference_tribal_embed_gap_2026_05_18]]. Same class — embed index updated for one surface (wiki) but not its sister surface (knowledge_store). | observed-by: claude-3db3fb3d slot foxtrot `/forge-audit-v2` Phase 2. | verify: `grep -cE '"source"\s*:\s*"(doc-hypermill\|hypermill\|hyperCAD)' H:/prism/state/shared/tribal-embed-index.json` → currently `0`, target `≥2500`.
- 2026-05-20 | **5 zero-tip extractions in cad-engine/knowledge_store** — `doc-cad-manual-en-us.json` (hyperCAD-S CAD_Manual, CRITICAL for CAD AI training), `doc-fusion-cad.json`, `doc-hypermill-sql-tool-db.json`, `doc-sql-macro-database-manual-en-us.json`, `doc-inventorhsm-getting-started.json`. The extractor reported success + wrote `tips:[]`. Silent extraction failure class — Karpathy R12 violation. | fix: HM-TRAINING-WIRING-PLAN-2026-05-20 U-HMT-HYPERCAD-REEXTRACT + U-HMT-FUSION-CAD-FIX. The extractor should fail-loud on `tips.length === 0` when source PDF page-count > 5 (probable OCR/regex miss, not genuinely content-empty). | observed-by: claude-3db3fb3d slot foxtrot. | verify: `node scripts/hm-extraction-coverage.mjs --json \| jq '.zero_tip_count'` → currently `4` (5 if you count inventorhsm), target `≤1`.
```

## Why a patch sibling, not a direct edit

CLAUDE.md is the most peer-claimed file in the repo. Per CLAUDE.md doctrine (PATCH-SIBLING convention, 2026-05-17): "for peer-locked surfaces use `state/shared/dashboards/patches/<SURFACE>-PATCH-<unit>.md`". Golf-slot integrator (or any chat that owns the CLAUDE.md merge lane) applies the patch on its next sweep.

## Apply

```bash
# When applying — golf slot or integrator:
git -C H:/prism log --oneline -1 CLAUDE.md   # confirm no peer commit since 2026-05-20T16:00Z
# Append the two regression lines to the ## Recent regressions section
git add CLAUDE.md
git commit -m "[MAIN] [CLAUDE-MD-PATCH-MERGE]: hm-training-exhaustion-audit (F4 + zero-tip)"
```
