---
name: reference_octopus_utilization_driver_2026_06_24
description: Octopus consensus utilization cron-driver (U-ALPHA-OCTOPUS-DRIVER) — turns the dormant octopus into a continuously-utilized substrate
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.670Z
aliases: reference_octopus_utilization_driver_2026_06_24
---


**U-ALPHA-OCTOPUS-DRIVER** (slot:alpha, 2026-06-24, commit `7acb5253a5`, branch cad-fusion-live-ms0).

The octopus multi-model consensus pipeline was fully built but **DORMANT** — it only fired when a human ran `octopus-first-live-record.mjs` by hand (~60 lifetime ledger runs, most `"x"` smoke tests). No engineered loop/cron drove it. This is the "utilization gap, not capacity gap" pattern.

**Shipped (composes, never forks bravo's producer):**
- `scripts/octopus-utilization-driver.mjs` — cron-drivable loop that IMPORTS `runLive` from `octopus-first-live-record.mjs` and each tick rotates through a curated 10-question cross-galaxy consensus pool (speed-feed, lathe, wedm, cam, cad, quoting, post-processor, mill, business, token-optimization). Deterministic modulo rotation off ledger length (no Math.random — resumable). One tick exercises 5 named substrates at once: **octopus** (driver) + **ollama** (local Blackwell panel qwen2.5-coder:32b + gpt-oss:20b) + **hermes** (opt-in `--with-hermes-grok` free voice) + **obsidian** (outcome write-back via `publishConsensusOutcome`) + **psn** (ledger → WeeklySynthesis → system-viz roost). Zero metered spend (buildLocalOnlyEnv clears XAI/GEMINI/GOOGLE keys + sentinels codex). Cron exit contract: Ollama-down records the transparent blocker → harness ok → exit 0 (never flaps the task); exit non-zero only on a real throw. Kill switch `PRISM_OCTOPUS_UTILIZATION_DISABLE=1`.
- `scripts/octopus-utilization-driver.test.mjs` — 19/19 real-assertion tests (rotation reference values, wrap-around, dry/injected path, per-question throw isolation, harness-ok vs voice-ok exit semantics).
- `.claude/helpers/install-octopus-utilization-task.ps1` — registers `PRISM Octopus Utilization` scheduled task (Daily 1:17, repeating every 4h, off-:00 minute, S4U, local+free-Grok 3-voice). REGISTERED + armed (NextRunTime set).

**Live validation:** real local-only consensus → 2 Ollama voices answered, ledger 62→63, `octopus-outcomes/wedm.jsonl` 1→2. Per-file 2-arm scrutiny PASS (code-analyzer + reviewer), P2-only.

**Manual run:** `node scripts/octopus-utilization-driver.mjs --count 1 --with-hermes-grok --json` · `--list` shows the pool · `--dry` for the no-network harness path · `--prompt "..." --domain <galaxy>` for a one-off.

Builds on [[reference_psn_octopus_fleet_synergy_2026_05_31]]; sibling of bravo's `octopus-first-live-record.mjs` (the one-shot producer this loop drives continuously).
