---
name: reference_alpha_embeddings_staleness_gate_2026_05_30
description: rank-21 embeddings-sidecar staleness gate — tryLoadEmbeddingsSidecar now advises when the dense arm lags the corpus; found ~11.6h live drift
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.468Z
aliases: reference_alpha_embeddings_staleness_gate_2026_05_30
---


Brain-upgrade rank 21, built 2026-05-30 (slot alpha) — the 3rd unit off the sweep
([[reference_alpha_brain_refresh_ms0_2026_05_30]], [[reference_alpha_recall_eval_harness_2026_05_30]]
siblings). Closes a silent-rot the sweep flagged: the **embeddings sidecar (dense recall arm) can fall
arbitrarily behind the corpus with zero signal** — recently-added memories are BM25-reachable but
dense-unreachable, and the hybrid fusion silently mixes a current BM25 set with a stale dense set.

**What:** `tryLoadEmbeddingsSidecar` (in `scripts/lib/memory-index-search-lib.mjs`) now mirrors
`tryLoadMemorySidecar`'s graceful-stale check — compares `sc.sourceMtimeMs` (corpus mtime at embed
time) vs the vault's youngest namespace dir mtime (new extracted+tested `youngestNamespaceMtime`); if
behind → stderr advisory, but RETURNS RECORDS ANYWAY (graceful; re-embed via
`build-memory-embeddings-sidecar.mjs --resume`). Back-compat: skips when `sourceMtimeMs` absent.

**Live finding (true positive on first fire):** embeddings sidecar built 04:52, BM25 rebuilt 15:44,
vault youngest = now → **~11.6h of dense-unreachable drift**. The brain-refresh orchestrator (sibling
unit) is what *fixes* this — the two compose: rank-21 detects, brain-refresh refreshes.

**Scrutiny (2 reviewers, both PASS):** Reviewer B (0 P0/P1) verified the comparison semantics are sound
+ consistent with the BM25 gate + the live firing is honest (not a clock artifact — refuted the
"both copy the same sourceMtimeMs" hypothesis with the actual divergent mtimes). Reviewer A found 1
P1: the call site `tryHybridFuse` wasn't threading the gate params (it defaulted) — latent but a real
consistency defect. Fixed + added DISCRIMINATING wiring-guard tests through the real `tryHybridFuse`
seam — directly the "hermetic fakes don't prove wiring" class that the P1 itself was.

**BASIS CORRECTED same session (R12 real-data catch — the most important lesson here):** post-build
verification (ran the remediation, then re-checked) showed the original **vault-DIR-mtime basis is
HYPERSENSITIVE**. After mem-embed successfully re-embedded (both sidecars in sync, same
`sourceMtimeMs`), the advisory STILL fired — because the vault `reference/` dir was touched 47 s later
by ordinary fleet activity (a peer's Obsidian feed), bumping the dir mtime → **cry-wolf** (rank-35's
exact class), and it **over-claimed "older than BM25"** when the two sidecars were actually in sync.
Re-based to compare the **embeddings sidecar FILE mtime vs the BM25 index sidecar FILE mtime** =
"does the dense arm lag the BM25 arm?" (the real failure mode): cheap (2 stats), precise (build
order), never false-fires on unrelated vault writes. Dropped `youngestNamespaceMtime` +
vaultRoot/namespaces; added `bm25SidecarPath`. Real run now correctly SILENT when in sync; 7 node:test
(incl. equal-mtime-no-fire + fail-safe + discriminating wiring guard). Separately noted: emb sidecar
11035 records vs BM25 11024 — a count mismatch worth a follow-up.

**LESSON (durable):** verify a staleness/freshness signal against the LIVE busy system, not just unit
fixtures + a one-shot review. The dir-mtime gate passed 2 reviewers AND unit tests AND a first
real-data run (which fired a TRUE positive at the time) — yet was cry-wolf the moment the corpus was
in-sync-but-touched. The diagnostic that caught it: re-run after remediation + inspect the actual
mtimes/record-counts. Sister to the BRAIN-REFRESH-MS0 entry-point lesson (live smoke > green units).
Wiki: [[embeddings-staleness-gate]].
