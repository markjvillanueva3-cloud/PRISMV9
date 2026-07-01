---
title: Tribal-Graph Course-Content Mining
kind: architecture
milestone: TRIBAL-GRAPH-MS0
unit: U-CONTENT-MINE
status: shipped
commit: 67895484f
updated: 2026-05-16
---

# Tribal-Graph Course-Content Mining (iter 7)

The seventh and final extraction layer of TRIBAL-GRAPH-MS0. Mines the
machine-readable per-resource descriptor metadata of MIT-OpenCourseWare course
zips into a **ranked, advisory review queue** of PRISM-value candidates
(technique vocabulary + formula / algorithm / engine / tip proposals, each
scored for manufacturing relevance).

## Pipeline

```
MIT-OCW zip ──PowerShell──▶ all data.json entries
                                  │
        collectResourceDescriptors │  (dedup, order-independent, MIN_DESCRIPTOR_LEN)
                                  ▼
              aggregateCourseCorpus  (bounded: MAX_DESCRIPTORS, MAX_CORPUS_CHARS)
                                  │
          callOllamaMine (qwen2.5-coder:7b)  ──▶ {techniques, candidate_assets,
                                  │                prism_domains, mfg_relevance}
                 parseMineResponse │  (depth-aware JSON, fail-loud, clamp)
                                  ▼
        scoreCandidate ─▶ passesRelevanceFloor ─▶ toCandidateRecord
                                  │
                                  ▼
   course-content-candidates.jsonl  +  advisoryOnly nodes on /system-viz
```

## Files

| File | Role |
|------|------|
| `scripts/lib/course-content-mine-lib.mjs` | Pure transforms — 19 exports, zero I/O. |
| `scripts/lib/course-content-mine-lib.test.mjs` | 46 `node:test` cases. |
| `scripts/tribal-graph-course-content-mine.mjs` | zip → Ollama → ranked JSONL orchestrator. |

## Why advisory-only

The output is a **human/forge-gated review queue**, never auto-built engines.
PRISM's `comprehensive-build-enforce`, `no-stub`, and `duplication-guard` hooks
block LLM-generated stub engines by design — and auto-building from an LLM
distillation would pollute the codebase. `advisoryOnly:true`,
`mustHumanVerify:true`, and a never-auto-build `caveat` are structurally
hardcoded on every JSONL record and graph node — not model-controllable. Best
candidates become real assets only via the human-gated `/forge` + scrutiny
pipeline.

## Why the descriptor layer (not PDFs)

MIT lecture-note PDFs are scanned images (OCR-gated, out of autonomous scope —
`pymupdf` returns ~200 chars of cover-page boilerplate, zero body). The
machine-readable signal is the per-resource `data.json` `description` field.

## Robustness

- **PowerShell injection** — the zip path is passed via an environment
  variable, never interpolated into the script body (inert data).
- **PS 5.1 codepage bug** — `[Console]::OutputEncoding = UTF-8` is load-bearing:
  without it, non-ASCII course `data.json` is codepage-mangled and `JSON.parse`
  throws. This silently failed 31 courses until diagnosed.
- **Corrupt zips** — a 60 s `spawnSync` timeout + SIGKILL + a 2× hang-cap stop
  a truncated zip from hanging `OpenRead` forever; the run still completes.
- **Idempotency** — checkpoint resume; `--force` keeps records as merge base;
  `--limit` counts only attempted courses; fail-loud `exit 4` when a run mines
  nothing while courses failed.

## Result

226/227 courses processed (the lone holdout, `6.007-spring-2011.zip`, is a
corrupt 699 MB download with a zeroed End-Of-Central-Directory record — handled
gracefully, idempotently recoverable). **65 ranked candidates · 126 asset
proposals · 211 technique tags**, pipeline-consumable for
`prism_knowledge:tribal_search`; 64 advisory candidate nodes on `/system-viz`.

Composes the iter 3-6 course-mapper / extractor / embedder pipeline — no fork.
