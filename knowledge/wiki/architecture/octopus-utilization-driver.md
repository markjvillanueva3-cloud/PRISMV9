---
title: Octopus Utilization Driver (U-ALPHA-OCTOPUS-DRIVER)
type: architecture
created: 2026-06-24
slot: alpha
status: built
tags: [octopus, consensus, ollama, hermes, cron, utilization, psn]
---

# Octopus Utilization Driver

Engineered cron loop that turns the **dormant** octopus multi-model consensus
substrate into a **continuously-utilized** one. PSN-OCTOPUS-FLEET-SYNERGY-MS0 /
U-ALPHA-OCTOPUS-DRIVER (slot:alpha, 2026-06-24, commit `7acb5253a5`).

## Problem

The octopus consensus pipeline (producer + coordinator + libs) was fully built
and proven end-to-end by `octopus-first-live-record.mjs`, but it only ever fired
when a human ran that one-shot proof **by hand** — a fixed question, once. There
was no engineered loop or cron driving it, so the consensus ledger sat at ~60
lifetime runs (most of them `"x"` smoke tests) and every downstream consumer
(WeeklySynthesis, the system-viz consensus roost, the planned `consensus-of`
cross-substrate edge) starved on a feed that only grew on manual pokes. Classic
**utilization gap, not capacity gap**.

## Design

`scripts/octopus-utilization-driver.mjs` **composes** the proven `runLive()` from
`octopus-first-live-record.mjs` — it re-implements no dispatch/record/publish and
edits nothing in the producer (R8). It adds exactly three things:

1. **A curated cross-galaxy question pool** (`QUESTION_POOL`, 10 frozen entries)
   spanning speed-feed, lathe, wedm, cam, cad, quoting, post-processor, mill,
   business, token-optimization. Each is a real manufacturing/cross-substrate
   consensus question (not a smoke test), tagged to a valid galaxy `domain` so
   the recorded outcome routes to the right `octopus-outcomes/<domain>.jsonl`.
2. **Deterministic rotation** — `rotationIndex(ledgerCount, poolLen)` = ledger
   length mod pool length (no `Math.random`; resumable + testable). Each recorded
   run grows the ledger by one, so successive ticks advance to a fresh question.
3. **A cron entry point** with an honest exit contract.

One tick therefore exercises **five** of the substrates the operator named at
once: octopus (the driver), ollama (the local Blackwell panel), hermes (the
opt-in free-managed Grok voice), obsidian (outcome write-back via
`publishConsensusOutcome`), and the PSN (ledger → WeeklySynthesis → system-viz).

## Safety — zero metered spend by construction

`runLive` unconditionally applies `buildLocalOnlyEnv()`, which clears
`XAI_API_KEY` / `GEMINI_API_KEY` / `GOOGLE_API_KEY` and points `PRISM_CODEX_BIN`
at a non-existent sentinel — so no external metered provider can fire.
`--with-hermes-grok` adds the Grok voice **only** via its free CLI / local Hermes
OAuth proxy (`:8645`) backend; the metered HTTP path stays dead.

## Cron exit contract

`ok` reflects **harness health** (did every selected question produce a recorded
`runLive` result?), not voice success. When Ollama is momentarily down, `runLive`
still **records** the transparent `dispatch-unavailable` blocker and returns
`ok:false`; the harness counts that as a completed attempt and exits 0 — so a
brief local-stack outage never flaps the scheduled task red. Exit is non-zero
**only** on a genuine harness throw.

## Surfaces

| Surface | Path |
|---|---|
| Driver | `scripts/octopus-utilization-driver.mjs` |
| Tests (19/19) | `scripts/octopus-utilization-driver.test.mjs` |
| Cron installer | `.claude/helpers/install-octopus-utilization-task.ps1` |
| Scheduled task | `PRISM Octopus Utilization` (Daily 1:17, every 4h, S4U) |
| Kill switch | `PRISM_OCTOPUS_UTILIZATION_DISABLE=1` |

## Usage

```bash
node scripts/octopus-utilization-driver.mjs --list                 # show the pool
node scripts/octopus-utilization-driver.mjs --dry --json           # no-network harness path
node scripts/octopus-utilization-driver.mjs --count 1 --with-hermes-grok --json   # one real tick
node scripts/octopus-utilization-driver.mjs --prompt "Consensus check: ..." --domain mill   # one-off
```

## Validation (live)

Real local-only consensus → 2 Ollama voices answered (qwen2.5-coder:32b +
gpt-oss:20b), ledger 62 → 63, `octopus-outcomes/wedm.jsonl` 1 → 2. Cron registered
+ armed (NextRunTime set). Per-file 2-arm scrutiny (code-analyzer + reviewer) PASS,
P2-only.

## Related

- `octopus-first-live-record.mjs` — the one-shot producer this loop drives.
- [[psn-octopus-fleet-synergy-ms0]] — the synergy milestone this completes a leg of.
- [[fleet-reaper]] / `install-sfc-remine-task.ps1` — the canonical cron-install convention matched.
