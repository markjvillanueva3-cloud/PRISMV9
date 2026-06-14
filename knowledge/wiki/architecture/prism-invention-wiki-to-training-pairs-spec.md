---
schema: ideablock-v1
title: "INVENTION SPEC — wiki-canonical-to-training-pairs: the 57 entries → AI training JSONL"
domain: "PRISM architecture"
category: invention
version_state: Current
confidence: 0.94
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - [[prism-invention-high-roi-engine-ideas]] (idea F3)
  - [[tribal-to-ai-training-bridge]] (the closed-loop AI pipeline)
  - The 56 prior canonical entries of the 2026-05-21 pivot
extracted_via: human-authored
extracted_at: 2026-05-21T18:25:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-INVENTION-TRAINING-PAIRS-SPEC)
---

## Purpose

Phase-B builder-ready spec for invention F3 — `wiki-canonical-to-training-pairs.mjs`. Converts the pivot's canonical wiki entries into a JSONL training set so the 57-entry corpus becomes AI training data, not just operator documentation. The **highest-compounding, lowest-effort** invention — it turns ALL prior pivot work into model capability.

## The problem it solves

Per [[tribal-to-ai-training-bridge]], the closed-loop AI pipeline's stage 3 (training-set assembly) needs labeled data. The 57 canonical wiki entries are the highest-quality data PRISM has: physics-grounded, source-cited, confidence-scored, cross-referenced. But they sit as prose — invisible to the LoRA training pipeline. F3 is the adapter.

## Why the wiki entries are exceptional training data

| Property | Training value |
|---|---|
| Each entry has `## Question` + `## Answer (canonical)` | A native Q→A supervised pair |
| Worked examples with real numbers (Taylor T=2.44min, chip-thinning ×2.83, k=3EI/L³) | Physics-grounded anti-hallucination anchors |
| Anti-patterns sections ("X is wrong because Y") | Negative examples — what NOT to predict |
| `confidence` frontmatter (0.93-0.98) | Per-example calibration weight |
| `sources` frontmatter | Provenance / citation training |
| Cross-reference graph (3-10 `[[links]]` each) | Knowledge-graph relational signal |

## Adapter contract

```
node scripts/wiki-canonical-to-training-pairs.mjs [--in <dir>] [--out <file.jsonl>] [--min-confidence N]

For each .md entry under knowledge/wiki/code-tribal/ + knowledge/wiki/architecture/:
  parse frontmatter (schema:ideablock-v1 only) + the ## sections
  emit:
    1 PRIMARY pair:   { prompt: <Question>, completion: <Answer canonical>, weight: <confidence>, meta: {...} }
    N DERIVED pairs:  one per worked-example  → { prompt: "<example setup>", completion: "<worked result>" }
    M ANTIPATTERN pairs: one per anti-pattern → { prompt: "<the wrong belief>", completion: "<why it's wrong + the right approach>" }
  meta: { source_entry, domain, category, sources[], confidence, sha256 }
```

Estimated yield: 57 entries × (1 primary + ~4 derived + ~5 antipattern) ≈ **570 training examples**, all physics-grounded.

## The algorithm — markdown parsing

1. **Glob** the two wiki dirs for `*.md`; filter to `schema: ideablock-v1` frontmatter (skip non-canonical).
2. **Parse frontmatter** — YAML between the `---` fences. Extract title, domain, category, confidence, sources, canonical_sha256.
3. **Section-split** the body on `## ` headings into a map.
4. **Primary pair** — `## Question` → prompt; `## Answer ...` (the canonical section) → completion.
5. **Derived pairs** — scan the Answer for worked examples (lines with `=` arithmetic, "Worked example:" markers). Each becomes a compute-this-result pair.
6. **Antipattern pairs** — the `### Anti-patterns` section's bullets; each `"belief" → "correction"` becomes a pair.
7. **Dedup** — hash each pair; skip exact duplicates across entries.
8. **Write JSONL** — one object per line; the `weight` field carries the confidence so the trainer can down-weight lower-confidence entries.

## Edge cases (handle from line 1)

| Edge case | Behavior |
|---|---|
| Entry missing `## Question` or `## Answer` | Skip the primary pair; log a warning; still emit derived/antipattern if present |
| Frontmatter malformed / not ideablock-v1 | Skip the file entirely; log; never crash the batch |
| Empty worked-example or anti-pattern section | Emit zero derived/antipattern pairs (not an error) |
| `confidence` absent | Default weight 0.90; log |
| Unicode / math symbols (×, √, ², ≈, μ) in the body | Preserve verbatim — they're meaningful; UTF-8 throughout |
| Two entries with identical worked example | Dedup by content hash |
| The adapter run twice | Idempotent — same input → same JSONL (deterministic ordering: sort by source_entry) |

## Failure modes anticipated

- **Stale corpus** — if entries change after a training run, the JSONL is stale. Emit a manifest (entry → sha256) so the training pipeline can detect drift (same fail-loud lesson as [[skill-ecosystem-bridge]]'s ledger regression).
- **Confidence inflation** — every pivot entry is 0.93-0.98; the weights barely differentiate. That's honest (the entries ARE high quality) but the trainer shouldn't expect a wide weight spread.
- **Domain imbalance** — machining-math + tactical entries outnumber business/shop-floor. Emit per-domain counts so the trainer can stratify or up-sample thin domains.

## Wiring

This is a script, not an engine — it lands in `scripts/`. It feeds the AI pipeline:
- Output JSONL → `prism_ai` LoRA training-set input (stage 3 of [[tribal-to-ai-training-bridge]]).
- Optionally expose `prism_knowledge:learn_course_from_source` to consume it.
- A Stop hook (or cron) re-runs it when `knowledge/wiki/{code-tribal,architecture}/` changes — keeping the training set fresh.

## ROI

~100 LOC. It converts 57 entries × ~10 pairs = ~570 physics-grounded training examples — and every future canonical wiki entry auto-adds ~10 more. It's the bridge that makes the entire wiki+tribal pivot compound into AI capability. Per [[feedback_ai_training_first_before_revenue]], pre-revenue this IS the priority — train the per-domain models on the best corpus available, and the best corpus is the one this pivot just authored.

## Build prerequisites

1. `duplicationGuardEngine` check — `assetType:"script"`, keywords `["wiki","training","jsonl","pairs"]`. Verify no existing wiki-to-training adapter.
2. Confirm the LoRA training-set JSONL schema the `prism_ai` pipeline expects (prompt/completion/weight field names).
3. Confirm the markdown-parsing lib already in `scripts/lib/` (`html-report-render.mjs` has a minimal parser — reuse, don't reinvent).

## Cross-references

- [[prism-invention-high-roi-engine-ideas]] — the invention queue (F3, the #1 pick)
- [[tribal-to-ai-training-bridge]] — the closed-loop AI pipeline this feeds (stage 3)
- [[prism-invention-stability-lobe-advisor-spec]] — sibling Phase-B spec
- [[skill-ecosystem-bridge]] — the fail-loud-manifest lesson
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record (Phase B)
- [[feedback_ai_training_first_before_revenue]] — the standing rule this serves
- [[feedback_do_optional_high_roi_work]] — standing rule

## Provenance

Phase-B builder-ready spec — **58th canonical entry** of the 2026-05-21 pivot, deep-diving invention F3 (the #1-ranked pick) from [[prism-invention-high-roi-engine-ideas]]. Authored 2026-05-21 by slot:hotel under U-WIKI-INVENTION-TRAINING-PAIRS-SPEC. The "wiki that generates a tool" per /goal Phase B — and the tool that makes every other pivot entry compound into AI training capability.

System injection: auto-surfaces on `wiki to training`, `training pairs`, `JSONL training set`, `wiki-canonical-to-training-pairs`, `AI training data`, `LoRA dataset`, `Q&A pairs`, `physics-grounded training` keywords.
