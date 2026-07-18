---
name: reference_blackwell_db_gen_concurrency_2026_06_04
description: BLACKWELL-DB-GEN-MS0/U-CGP-CONCURRENCY — the real Blackwell DB-gen win (concurrent vision-OCR catalog extraction) + the OLLAMA_NUM_PARALLEL honesty lesson
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.477Z
aliases: reference_blackwell_db_gen_concurrency_2026_06_04
---


**BLACKWELL-DB-GEN-MS0 / U-CGP-CONCURRENCY (slot:romeo, 2026-06-04, commit `c0ce903f35`).** The actual Blackwell efficiency lever for romeo's catalog/database generation that feeds Fusion/hyperMILL/Mastercam/SFC/HSMAdvisor/G-Wizard tool catalogs.

**What:** `scripts/batch-ollama-vision-extract.mjs` ran catalog/blueprint vision-OCR strictly **serially** (blocking `spawnSync`, one print at a time). Romeo's earlier `catalog-gpu-profile.mjs` (U-CGP-PROFILE) *recommended* `concurrency:3` on the 96GB Blackwell but **nothing consumed it** — a fabricated speedup (R12 gap). U-CGP-CONCURRENCY converts the serial loop into a **bounded async worker pool** (`runExtractionPool`) driven by `detectGpuTier().concurrency`. concurrency=1 is behaviorally identical to the old loop (16GB host). Claim is atomic (no `await` in `claimNext`); SHA-checkpoint/resume, `--limit`, time-budget, dry-run all preserved.

**The honesty lesson (2-arm scrutiny P0 — both reviewers, R12):** worker concurrency ≠ inference parallelism. Ollama serializes concurrent `/api/generate` against one loaded model beyond `OLLAMA_NUM_PARALLEL` slots (a server-START env the client cannot raise mid-run). The first cut advertised "×3 inference overlaps regardless" — a lie on any `OLLAMA_NUM_PARALLEL=1` host. Fix: `resolveOllamaParallel(env)` reads the live value (null when unset = unverified, never assume a default); the realized speedup is bounded to `min(workers, slots)`, reported honestly in 3 cases (true ×N / serializes-to-×slots / UNVERIFIED). `estimateExtractionPlan.concurrencySpeedup` now == `effectiveWorkers`, never `workers`. **Live `OLLAMA_NUM_PARALLEL` on DESKTOP-N7MI1VB is 2 (User scope), not 4** — so the blackwell tier (concurrency 3) honestly reports ×2 effective. Raise the server's slots to 3+ for true ×3. (docker-compose sets 4 for the *containerized* fleet; the `05-soft-config-tweaks.ps1` `=1` is the small-host default.)

**Other scrutiny fixes:** contention gate (CPU-spilled / non-resident VL model → force serial, reuses the existing `claimGpu` `/api/ps` residency probe, no new I/O); structural fail-soft (`worker()` try/catch so a rejecting `runImpl` can't abort the pool). 41 batch + 29 profile tests; injectable `spawnImpl`/`spawnTimeoutMs`/readers for hermetic tests (timeout SIGKILL path covered). Per-file gate: FAIL→fix→re-dispatch→PASS/PASS.

**DB-gen efficiency arc COMPLETE (3 units, 2026-06-04 loop):**
- **U-CGP-CONCURRENCY** (`c0ce903f35`) — the async worker pool above.
- **U-CGP-MEASURE** (`8fd4193762`) — real-data E2E: measured **0.189 pages/min/worker** from the existing 280-print checkpoint (no GPU eviction — R7), projected via estimateExtractionPlan. `measure-catalog-extraction-rate.mjs` (parseCheckpointRecords/measureSerialRate/projectFromCheckpoint, 16 tests). Artifact `state/shared/blackwell-db-gen-rate-projection.json`.
- **U-CGP-NUMPARALLEL-RECO** (`ca4395947b`) — `recommendOllamaNumParallel(profile)` SSOT (blackwell 4/highend 2/else 1) + actionable lever in the measure tool: "live OLLAMA_NUM_PARALLEL=2 below recommended 4 → run `scripts/system-health/05-soft-config-tweaks.ps1` + restart → unlock ×3". Cross-file PARITY test pins JS↔PS (R9 anti-drift). Verified golf's PS config script is ALREADY host-aware (sets 4 on Blackwell) — R8 read-first avoided duplicating it.

**Verified:** all extraction consumers (`run-ocr-batch-overnight.ps1`) auto-inherit concurrency from the profile — no per-caller flag needed.

**The only remaining DB-gen action is OPERATOR/idle-window:** run the golf config script + let Ollama restart to go 2×→3× (restart evicts peer models, so not done in-session).

**NEXT (off the DB-gen thread):** ZULU romeo P1 = `U-WIRE-SPEED-6` (6 Speed* engines → oscar SFC) + 110 unwired engines + CIMCO/Fusion/hyperMILL export. Coordinate with slot:xray (`BLACKWELL-OCR-ENSEMBLE-MS0`) — xray = extraction quality, romeo = throughput (complementary). See [[reference_blackwell_catalog_gpu_profile_2026_06_03]].
