---
name: step-assembly-extract-2026-05-26
description: "STEP-file ISO-10303-21 entity scanner shipped (slot:delta commit 6dd62c1d91) — 234 STEPs from MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION extracted into machine-models-assembly.jsonl (151 assemblies + 83 sub-assemblies, 0 failures); pypdf-method sibling for STEP files"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.956Z
aliases: reference_step_assembly_extract_2026_05_26
---


# STEP assembly extractor — 234/234 zero-failure run (slot:delta 2026-05-26 /loop iter1 /goal /yolo-mode)

User directive: *"use these to train assemblies generation H:\PRISM\JM DIE\MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION"*.

## Outcome — 234 STEPs → 234 tribal entries (zero failures)

| Metric | Value |
|---|---|
| Total files | 234 (151 assemblies + 83 sub-assemblies) |
| Total size | 2.28 GB |
| Total entities | 28.8 M |
| Solids (MANIFOLD_SOLID_BREP) | 7,645 |
| B-spline surfaces | 44,473 |
| NAO assembly-tree edges | 1,705 |
| Schemas | 233 AP214 + 1 UNKNOWN |

Output: `H:/prism/mcp-server/data/tribal/machine-models-assembly.jsonl` (131.5 KB, 234 entries, domain=assembly|cad, confidence=0.6).

## Files shipped (slot/delta commit `6dd62c1d91`)

1. `scripts/lib/step-assembly-extract-lib.mjs` — pure-fn library (9 exports). Counts 27 STEP entities. classifyShape returns assembly|sub-assembly|multi-part-no-tree|part|primitive|empty (NAO≥5/1-4/0+). complexityScore 0..1 via log-scaled drivers.
2. `scripts/lib/step-assembly-extract-lib.test.mjs` — 37/37 tests pass. ≥3 failure modes, ≥2 adversarial, variability across AP203+AP214+AP242 + 4 shape classes.
3. `scripts/extract-machine-assembly-models.mjs` — CLI walker. `--apply / --root / --output / --limit`. Atomic tmp+rename jsonl write. R12 fail-loud on root-missing.

## Architecture relative to lima's pypdf pipeline

| Pipeline | Input | Approach | Confidence |
|---|---|---|---|
| Lima pypdf page-by-page (CANONICAL — [[feedback_use_lima_pypdf_page_extractor]]) | PDF | text + notability scoring + 12 domains | 0.4 |
| **STEP entity scanner (THIS commit)** | STEP / ISO 10303-21 | structured regex on entity declarations | **0.6** (higher — structural ≠ heuristic) |

Both emit tribal entries with `domain` tag for routing through `tribal-by-domain-inject.mjs`.

## INTEGRATION GAP (next unit)

Both `machine-models-assembly.jsonl` (this commit, 131 KB) AND lima's `jm-die-corpus-pages.jsonl` (16.7 MB / 8,752 entries) are sitting on disk but **NOT yet ingested into the tribal-embed-index**. The hook `tribal-by-domain-inject.mjs` reads `state/shared/tribal-embed-index.json` which is populated by 3 embedders:

- `scripts/embed-wiki-into-tribal-index.mjs` ✓
- `scripts/embed-knowledge-store-into-tribal-index.mjs` ✓
- `scripts/embed-engines-into-tribal-index.mjs` ✓
- `scripts/embed-tribal-jsonl-into-index.mjs` ❌ **MISSING** — the jsonl-format ingester

**Next unit (U-EMBED-TRIBAL-JSONL-INTO-INDEX):** build the 4th embedder. Input: any `mcp-server/data/tribal/*.jsonl` with `{schemaVersion, domain, ...}` shape. Output: rows appended to `state/shared/tribal-embed-index.json` keyed by `source:filepath:row-hash` so re-runs are idempotent. Once shipped, both lima's 8,752 PDF-page tips AND these 234 STEP-assembly tips become live in `tribal-by-domain-inject` for any chat-slot whose domain_filter matches `cad`, `assembly`, or `step`.

## Delta soul fidelity (cross-check)

| Refuse rule | This commit's posture |
|---|---|
| `inline-iso286-fit-values` | N/A — no tolerance data in STEP entity counts |
| `silent-feature-recognition-fallback` | 1 UNKNOWN schema **surfaced** in summary, not silenced (R12 fail-loud) |
| `dropping-pmi-data-on-import` | This is a structural-only pass; PMI extraction is a future unit (`U-STEP-PMI-EXTRACT`) — but the soul is honored because we don't pretend PMI was preserved |

## Related

- [[reference_lima_pypdf_extraction_canonical_2026_05_26]] — sibling pipeline (lima, 8,752 PDF entries)
- [[reference_jm_die_tribal_wiki_100pct_complete_2026_05_26]] — full corpus extraction context
- [[feedback_use_lima_pypdf_page_extractor]] — standing rule for the PDF half
- [[reference_cad_deep_domain_research_catalog_2026_05_26]] — external sources for blisks/turbines/molds/assemblies (this corpus is the LOCAL counterpart)
- [[feedback_commit_to_slot_worktree]] — discipline that landed this on slot/delta (not shared)
