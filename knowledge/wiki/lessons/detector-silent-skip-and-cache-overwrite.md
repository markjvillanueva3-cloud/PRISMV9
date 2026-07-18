---
title: model-backed detector silent-skip + cache-overwrite regresses the health metric
tags: [lesson, bug, obsidian-brain, vault-health, nli, ollama, karpathy-r12, fail-loud, detector-discipline]
created: 2026-06-28
slot: sierra
chat: claude-ec2d2289
shipped-with: U-SIERRA-NLI-MODEL-PIN
sibling-memory: reference_sierra_vault_improve_2026_06_28
commit: c1d7cc067e
domain: backend-dev
---

# Lesson: a model-backed detector that silently skips — and overwrites its own cache — regresses the metric it reports

## Symptom

`scripts/lint-memory-contradictions.mjs` (the Obsidian 2nd-brain's doctrine-contradiction
detector, vault-health's NLI dimension) reported **"373 doctrine memos — NLI SKIPPED (no
installed models (ollama down?)"** — even though Ollama was UP (`:11434` → 200) with **17
models installed** (incl. `gpt-oss:20b`, the detector's own model). Then, as I re-ran it to
"fix" the gap, `vault-health` flipped **OK → STALE → WARN**: each run rewrote
`state/shared/memory-contradictions.json` with a **0-pairs-checked** report, which vault-health
reads as `NEEDS-SCAN` — strictly worse than the prior cached partial (149/1143 checked).

## Root cause (three coupled defects)

1. **Silent model-resolution skip.** `resolveNliModel`'s auto-enumeration of installed Ollama
   models failed transiently during Ollama's recovery window and the detector SKIPPED instead
   of failing loud — so the entire contradiction dimension was silently dark, masked as an
   info-level "low coverage" row.
2. **Cache-overwrite regresses the metric.** The detector overwrites its report file every run.
   A skipped / 0-checked run therefore **replaces a populated cached report with an empty one**,
   flipping the health rollup backward (OK→STALE). Re-running a failing detector made things
   worse, not better.
3. **Throughput wall.** `gpt-oss:20b` NLI is ~50 s/pair (3-vote majority × ~15 s/call), so a full
   1143-pair sweep is multi-hour — never in-session-feasible regardless of the above.

## Detection

- A model-backed detector must distinguish **"0 contradictions found"** (scanned, clean) from
  **"0 pairs checked"** (didn't scan). vault-health correctly surfaces the latter as `NEEDS-SCAN`
  — that honest signal is what exposed the silent skip (a green there would be a false "we looked").
- The tell that the skip was a resolution bug, not a real model absence: `curl :11434/api/tags`
  listed 17 models while the detector claimed "no installed models."

## Prevention

1. **PIN the model.** Added `PRISM_WIKI_NLI_MODEL=gpt-oss:20b` to `settings.json` env (durable,
   fleet-wide, JSON-validated C:+H:). Don't depend on flaky auto-enumeration during service recovery.
2. **NEVER blind-re-run a cache-overwriting detector.** A skip/partial run REGRESSES the metric —
   a 0-check run is worse than a stale-but-populated cache. Verify it can actually check pairs
   (warm model, sufficient budget) BEFORE letting it overwrite the report.
3. **Foreground, not background, for short bounded scans.** A bg NLI run's node child can be killed
   when you reap orphan subshells (it zeroed a 10-min run this session). Foreground = the subshell
   exits with the run.
4. **Slow model-backed dimensions belong in the night-batch lane** (`PRISM Ollama Night Batch`),
   not forced in-session. With the model now pinned, the nightly batch grinds full coverage.

## Verified follow-ups (2026-06-28, same session)

- **A faster model does NOT help — measured.** `deepseek-r1:14b` (smaller, reasoning-capable)
  checked **0 pairs in 60 s** vs gpt-oss:20b's ~1 pair/50 s — its `<think>` blocks dominate per
  call. **gpt-oss:20b is the verified-optimal NLI model**; the throughput wall is inherent to the
  3-vote-per-pair structure, not the model. Don't chase a model swap.
- **Restore a clobbered report from git, do NOT re-run the detector.** `state/shared/memory-contradictions.json`
  is git-TRACKED and the report is written but never committed mid-session, so the committed copy is
  the last-good scan. `git checkout -- state/shared/memory-contradictions.json` instantly restores
  vault-health OK (no Ollama run). I re-ran the detector 3× trying to "fix" the STALE flip and made it
  worse each time (model eviction → 0-checked) before remembering this — re-running a cache-overwriting
  detector under load is the trap this very lesson warns about.

## Cross-refs

- Memory: [[reference_sierra_vault_improve_2026_06_28]]
- Sibling fix (same session): `vault-link-doctor` `isNonNote()` folder/quoted false-positive guard
  (commit `c1d7cc067e`) — ambiguous broken-link count 11→7 (genuine residual only).
- Sibling residual doctrine: [[reference_vault_ambiguous_links_deliberate_residual_2026_06_19]]
- Doctrine that mandated this file: [[bug-findings-wiki-gate]]
- Sibling bug class (silent-continue / fail-loud): [[regen-viz-merge-faillod]]
