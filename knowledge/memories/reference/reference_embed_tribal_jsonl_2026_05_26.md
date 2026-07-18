---
name: embed-tribal-jsonl-2026-05-26
description: "Fourth embedder shipped (slot:delta commit d2c410a08a, iter2+3) — closes F4-class jsonl-surface gap in tribal-embed-index; 9,265 entries embedded live (8,752 lima PDFs + 234 STEPs + 197 fleet + 82 corpus); tribal-by-domain-inject now has recall over the full lima pypdf corpus"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.566Z
aliases: reference_embed_tribal_jsonl_2026_05_26
---


# embed-tribal-jsonl-into-index — fourth embedder (slot:delta /loop iter2+3 2026-05-26)

Sister of `embed-wiki/knowledge-store/engines-into-tribal-index.mjs`. Fills the jsonl-format gap: every `mcp-server/data/tribal/*.jsonl` was sitting on disk with **0 entries in `state/shared/tribal-embed-index.json`** — `tribal-by-domain-inject` was structurally blind to the entire pypdf + STEP + fleet corpus.

## Outcome — 9,265 entries embedded live (one /loop session)

| Pre-loop | Post-loop | Δ |
|---|---|---|
| 12,557 entries | **21,822 entries** | +9,265 (74% growth) |

Domain breakdown of NEW entries: 3,570 general + 2,675 mill + 1,610 cam + 727 cad (234 STEPs + 493 lima `cad`) + 391 lathe + 260 backend-dev + 32 wedm.

| Source jsonl | Added | Original domain → mapped |
|---|---|---|
| `jm-die-corpus-pages.jsonl` (lima pypdf) | 8,752 | 12 lima domains → 7 tribal-rerank domains |
| `machine-models-assembly.jsonl` (delta STEP scanner) | 234 | assembly → cad |
| `jm-fleet-machines.jsonl` | 197 | mill (default) |
| `jm-die-corpus.jsonl` | 82 | varies |

Total run time: **~55 sec** for 9,031 entries (~6ms per nomic-embed-text call on local Ollama GPU).

## Architecture

```
mcp-server/data/tribal/*.jsonl   (sources)
  │
  ├── readJsonl(filepath)        line-by-line JSON parse; skip blanks; collect malformed lines as `skipped`
  ├── flattenRow(row, basename)  shape-detect: lima-pypdf | step-assembly-scan | generic; emit {text, title}
  ├── mapDomain(row.domain)      14-entry DOMAIN_MAP → tribal-rerank VALID_DOMAINS
  ├── buildEntry()               canonical {id, source:"tribal-jsonl", title, domain, text, path, hash, embedding, meta}
  └── planEmbed() / spliceEntries() / atomicWriteJSON()
                                 R12 all-or-nothing: embed everything BEFORE any write
```

## Domain mapping (lima → tribal-rerank)

| Lima domain | Mapped to | Why |
|---|---|---|
| fundamentals / reference / safety / tooling / unknown | **general** | Span multiple physical domains; safest default |
| mill / five-axis | **mill** | Direct |
| cad / assembly / geometry / brep / step / iges | **cad** | CAD-domain routing |
| lathe | **lathe** | Direct |
| wedm | **wedm** | Direct |
| cnc-programming / cam-training | **cam** | Programming = post/CAM-side |
| software-cs | **backend-dev** | Pure dev tooling |

## Files (slot/delta commit `d2c410a08a`)

- `scripts/embed-tribal-jsonl-into-index.mjs` (~340 L, 16 exports)
- `scripts/embed-tribal-jsonl-into-index.test.mjs` (32 / 32 tests pass; ≥3 failure modes, ≥2 adversarial — empty-jsonl/broken-json, ≥3 row-shape configs)

## Ollama health note

`/api/chat` is DOWN this session (rewriter banner 100% skipped — likely GPU contention from NIM endpoints). `/api/embeddings` is FINE — 9,031 sequential calls completed in 55 sec. The two endpoints route differently inside Ollama; embed-only workflows are not gated on chat-endpoint health.

## R12 fail-loud honored

- Ollama-down mid-batch → 0 writes (caller emits `phase:"embed", error:..., completed:K, planned:N, NOTHING written`).
- Dimension mismatch (vector dim ≠ index dim) → throw.
- Empty row text → entry skipped (NOT silently embedded as zero-vector).

## Delta soul fidelity

- `silent-feature-recognition-fallback` refused: every lima domain has an explicit mapping (no silent miscategorization).
- `dropping-pmi-data-on-import` refused: per-row `meta.originalDomain` + `meta.confidence` preserved for downstream PMI work.

## Now-live in [[reference_tribal_by_domain_inject|tribal-by-domain-inject]]

Any chat-slot whose `domain_filter` matches `cad|geometry|brep|step|iges|...` (e.g. delta itself) gets these 234 STEP-assembly entries on every CAD-keyword UserPromptSubmit. Similarly mill-domain slots get the 2,675 lima mill-domain pages, lathe slots get 391 lathe pages, etc.

## Related

- [[reference_step_assembly_extract_2026_05_26]] — iter 1 (the 234 STEP-extractor that produced the jsonl this embedder ingested)
- [[reference_lima_pypdf_extraction_canonical_2026_05_26]] — the 8,752-entry pypdf source corpus
- [[feedback_use_lima_pypdf_page_extractor]] — canonical PDF extraction rule
- [[reference_tribal_embed_gap_2026_05_18]] — same-class gap on the wiki side that was closed earlier

## Next units (queued for cron iter 4-5)

- **Assembly-archetype recognizer** — per-manufacturer NAO-tree templates (Mazak HCN family, OKUMA MA-* family, Brother SPEEDIO family) from the 234 indexed assembly structures
- **Periodic re-embed** — cron-driven incremental run when new jsonl entries are appended (planEmbed already de-dups by id)
- **U-[[reference_nn_predictor_embed_wire_2026_05_23|NN-PREDICTOR-EMBED-WIRE]]** — NN/GNN AUROC fix (embeddingSource mismatch — these new 9,265 entries may be what the GraphSAGE retrain needed)
