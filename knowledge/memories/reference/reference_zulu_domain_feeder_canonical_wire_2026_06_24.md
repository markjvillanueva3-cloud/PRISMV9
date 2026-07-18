---
name: reference_zulu_domain_feeder_canonical_wire_2026_06_24
description: All-domain knowledge feeder was an R15 orphan — wrote an invented path no consumer read; conformed to the canonical state/shared/<domain>-tribal-corpus.jsonl + clobber guard (slot:zulu 2026-06-24)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.282Z
aliases: reference_zulu_domain_feeder_canonical_wire_2026_06_24
---


**Context:** crossroad-auto-decide pushed me off an idle checkpoint to close the R15 "wire it" half of `a95356c003` (the all-domain knowledge feeders). R8 investigation found my own defect.

**The defect (R8/R11, my own):** `scripts/build-domain-knowledge-feeders.mjs` wrote `state/shared/domain-knowledge/<domain>-knowledge-corpus.jsonl` — an **invented path NO consumer reads** (orphan). I forked a new path instead of conforming to the established convention.

**Canonical convention (verified):** every per-domain tribal corpus lives at `state/shared/<domain>-tribal-corpus.jsonl` — where `cad`/`cam` (`extract-cadcam-tribal-wiki.mjs`), `blueprint-vision` (xray), `database-expansion` (juliett) already write, and which `AIResourceLearningEngine.getCadCamCorpus()` (`AIResourceLearningEngine.ts:1115`) references. My `entryToTribal` record shape already matched that schema.

**Fix (`5d865b0301`, U-ZULU-FEEDER-CANONICAL-WIRE):**
- Output → canonical `state/shared/<domain>-tribal-corpus.jsonl` via `corpusPathFor(domain)`.
- **Ownership guard `weOwnCorpus(outPath)`**: write only if the file is absent or EVERY record's `spawned_by === "build-domain-knowledge-feeders.mjs"`. A corpus with any foreign `spawned_by` (dedicated generator OR a slot's hand-curated tips) is skipped, never clobbered — closes the tribal-brain clobber-regression class. Unreadable → refuse (fail-safe, R12).
- `cad`/`cam` in `DEDICATED_GENERATOR_DOMAINS` (excluded; verified byte-identical 13913/853006 after run — no clobber).
- Empty domains not materialized (no 0-byte files).
- LIVE: tooling 312 / mill 39 / lathe 12 / post-proc 6 / speed-feed 4 on the canonical path. 11/11 tests (3 new: canonical-path, cad/cam-exclude, clobber-guard).

**Routed (NOT zulu's — mcp-server/AI-training):** the CONSUMER-side wiring is still open. The tribal embedder (`.claude/scripts/tribal-embed-index.mjs::walkMd`) only ingests `.md`, NOT `<domain>-tribal-corpus.jsonl`; the only direct jsonl consumer found is cad/cam-specific (`getCadCamCorpus`). A **generic `getDomainCorpus(domain)` on `AIResourceLearningEngine`** (clone of `getCadCamCorpus`) + a per-domain embed/ingest path is the follow-up → **owner: india**. Until then the new corpora are correctly placed but only cad/cam have an engine consumer.

**Lesson:** a knowledge feeder is not "wired" by emitting a file — it must land on the path the consumer ALREADY reads. Conform to the established `<domain>-tribal-corpus.jsonl` convention (R8/R11); never invent a parallel output path. Related: [[reference_cadcam_knowledge_feeder_gigo_fix_2026_06_24]] · [[reference_juliett_tribal_corpus_pattern_2026_05_29]] · [[feedback_wire_test_validate_all_galaxies]].
