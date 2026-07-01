---
name: reference_oscar_sfc_closed_loop_cpu_skip_2026_06_18
description: "SFC closed-loop continuous cron made cheap — the two heavy CPU reducer stages (aggregate + per-machine-rollup) are skip-if-fresh"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.696Z
aliases: reference_oscar_sfc_closed_loop_cpu_skip_2026_06_18
---


The `PRISM SFC Closed Loop` task runs CONTINUOUSLY (every ~15 min + AtStartup — see [[reference_oscar_sfc_catalog_divergence_reasoning_2026_06_18]]). Two stages used to re-fold huge UNCHANGED inputs on **every** idle tick: `sfc-aggregate.mjs` re-reduced ~20.3M shard rows (~119s + a 48GB heap spike) and `sfc-per-machine-rollup.mjs` re-folded ~19.6M ledger rows (~51s). The sweep coordinator is resumable, so a tick with no new data re-derived the IDENTICAL moat/rollup — ~170s of pure wasted CPU per idle tick, competing with the live products + india LoRA at launch.

**U-OSC-CLOSED-LOOP-CPU-SKIP** (2026-06-18, slot:oscar, commits `107e48a580` + P2 `12cd818788`) makes those stages **skip-if-fresh** — the file-set twin of catalog-reason's content fingerprint.

- **Shared lib** `mcp-server/scripts/lib/sfc-stage-freshness.mjs` (TS-free, `node --test`-able):
  - `fileSetFingerprint(files, extra)` — sha256 of sorted `basename|size|floor(mtimeMs)` + a param salt. **O(files) stats, never O(rows)**; a 1,152-shard set fingerprints in ms. Any add/remove/regrow/rewrite of a member changes the hash. THROWS on a vanished member OR a duplicate basename (caller treats throw as "can't prove fresh -> run").
  - `stageFreshness({inputFiles, outputFiles, fingerprintFile, fingerprintField, extra, force})` -> `{fresh, fingerprint, reason}`. **FAILS TOWARD WORK**: returns `fresh:false` (RUN) on ANY uncertainty (vanished input, missing output, malformed outputFiles, torn/missing prior JSON, changed input, force). SKIPs ONLY when inputs are provably unchanged AND every output exists. Always returns the computed fingerprint (even on RUN) so the caller stamps it without recomputing.
  - 20/20 tests (happy + 8 failure/adversarial: vanished, dup-basename, missing output, torn prior, non-string field, mtime bump, size change, salt mismatch, empty/undefined outputFiles).
- **Both consumers** stamp `inputFingerprint` into their OWN output JSON and self-skip; `--force` / `PRISM_SFC_AGGREGATE_FORCE` / `PRISM_SFC_ROLLUP_FORCE` override. Aggregate writes the fingerprint-bearing `compare-summary.json` **LAST** (after baseline-params.json + divergence-rows.jsonl) so a crash mid-write can never present a fresh fingerprint over a half-written output set (no sticky stale-skip; restores the self-healing the old per-tick re-fold gave). Rollup writes one output, already atomic.

**LIVE PROOF (R15):** aggregate 119s fold -> 0s skip (fp `b964ef1789b2`); rollup 51s fold -> 0s skip, a touched ledger correctly re-folds with a NEW fp (changed-input detection), `--force` re-folds both; salt change forced one re-fold (137s) then 0s skip. 20/20 lib + 6/6 rollup tests; per-file 2-reviewer PASS + end-of-task 3-of-3 PASS (×2: core + P2 delta).

**Why NOT unified with catalog-reason:** that hashes regime CONTENT (derived values); this hashes a SET OF FILES — different correct domains (R7). The cron's other per-tick stages stay cheap by design (sweep resumes; loop-integrity + catalog-compare are the ~2s validators that MUST run every tick to catch a model regression).

Net: a continuous idle tick now costs ~2s (validators) instead of ~190s — the loop catches a physics-model regression within ~15 min for launch without burning the GPU/CPU on static data. See [[reference_oscar_sfc_cron_oom_fix_2026_06_16]] · [[reference_oscar_sfc_per_machine_core_complete_2026_06_17]].
