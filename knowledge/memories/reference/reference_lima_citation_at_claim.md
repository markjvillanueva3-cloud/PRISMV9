---
name: reference_lima_citation_at_claim
description: Academy doctrine — cite the source AT the claim, not in a bibliography. A course without citations is propaganda. Conversion (OCW/PDF→lesson) must carry provenance.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.644Z
aliases: reference_lima_citation_at_claim
---


The core pedagogical-rigor rule for slot:lima. Every curriculum claim cites source + date + page/timestamp INLINE at the claim ("per Sandvik Coromant cutting-data handbook 2021 ed. p.847"), not collected in a bibliography at the end.

A bibliography lets a reader assume a claim is sourced without proving it; an at-the-claim citation makes provenance verifiable per-sentence. A course without citations is propaganda — it asserts without grounding.

**How to apply:**
- On MIT-OCW conversion: `prism_dev:mcdl_cite_sources` preserves the lecture attribution through the lesson.
- On PDF-corpus conversion: the pypdf extractor tags each page with source + page number ([[reference_lima_pypdf_extraction_canonical_2026_05_26]]); carry that tag into the lesson.
- Run `scripts/audit-course-dispatcher-citations.mjs` to measure citation coverage (cross-refs each course's claimed dispatcher actions vs the real dispatcher source). Baseline ~70% — surface the aspirational gap, don't hide it.
- Distinguish doctrine (memorize) from technique (derive) from reference (look up) in the lesson framing. Encoded in lima soul behavior #1. See [[feedback_lima_physics_constants_never_inline]].
