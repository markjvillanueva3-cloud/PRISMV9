---
name: reference_india_ms1_u6_blueprint_corpus_harvest_2026_05_29
description: india shipped MS1-U6 BlueprintCorpusHarvestEngine (corpus fingerprint + freshness) on slot/india; main↔slot have UNRELATED histories
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.619Z
aliases: reference_india_ms1_u6_blueprint_corpus_harvest_2026_05_29
---


**MS1-U6 (BLUEPRINT-OCR-TRAINING-MS1) shipped — slot:india, 2026-05-29, commit `f25fe76fb2`.**

`BlueprintCorpusHarvestEngine` (`mcp-server/src/engines/`) catalogs the blueprint/PDF corpus into a fingerprinted manifest and detects drift (source-fingerprint invalidation) so the downstream RAG/OCR cache re-indexes ONLY when the corpus actually changed. Closes india closed-loop surface #4 (RAG corpus health). Two fingerprint modes: `cheap` (stat-derived `hash(relpath|size|mtimeMs)`, no content read — safe on 24K-file corpus) and `deep` (sha256 content). Corpus fingerprint is **time-independent** (excludes generatedAt) — else every harvest reads stale.

- Pure core (testable): `cheapFingerprint`, `corpusFingerprint`, `buildManifest`, `diffManifests`. IO: `harvest`/`freshnessCheck` (injectable `lister` for hermetic tests), atomic `writeManifest` (temp+rename), fail-soft `loadManifest` (corrupt → null, never throws).
- CLI: `scripts/blueprint-corpus-harvest.mjs` (`--freshness-check` exits 3 on stale → cron/Stop-hook friendly). Vendors the pure core w/ KEEP-IN-SYNC marker; engine + 23 vitest cases are canonical.
- Wired: `devDispatcher` actions `blueprint_corpus_harvest` + `blueprint_corpus_freshness` (bounded output, capped 25-item samples + counts — survives slimResponse empty-array stripping [[reference_slim_response_strips_empty_arrays_2026_05_26]]).
- 23 tests pass; `tsc --noEmit` clean.

**Why it had to ship LOCALLY on slot/india (not main):** slot/india ↔ main have **UNRELATED git histories** (no merge-base — the 2026-05-12 history-strip severed them). `git rev-list`: **1662 commits unique to slot/india, 874 unique to main, 11,387 files would add/add-conflict** under `--allow-unrelated-histories`. A full sync = ~11k manual conflict resolutions = golf's fleet-merge domain, NOT in-session. Routed to golf via AGENT_CHAT.jsonl (`chat-1780075273372`). Backup ref `slot/india-premerge-backup` created.

**How to apply:** india's domain engines (NN-GRAPH state, OutcomeFeedbackBus, HierarchicalNeuralOrchestrator) live ONLY in main — ABSENT from this worktree. Until golf reconciles, india can only safely ship **new-file** units against code present on slot/india (AI-T8 — verify vs main tree). `BlueprintExtractionRAGEngine` (MS1-U7 centerpiece) is main-only; correctly NOT touched. See [[feedback_india_galaxy_superset_in_worktree]].
