---
title: BRAIN-REFRESH-MS0 — one orchestrator for the 5 unwired brain refresh pipelines
type: architecture
status: shipped
shipped: 2026-05-30
slot: alpha
tags: [obsidian-brain, compounding, refresh, orchestrator, fleet, sidecar-safety]
---

# BRAIN-REFRESH-MS0

The 2026-05-30 8-agent brain-upgrade sweep ([`PRISM-BRAIN-UPGRADES-2026-05-30`](../../../state/shared/specs/PRISM-BRAIN-UPGRADES-2026-05-30.md))
found the PRISM brain's **#1 systemic weakness**: five independently-built, tested, working refresh
pipelines all depended on a **human to run them**, so each silently rotted between runs. The sweep's
top recommendation (the "meta-move", consolidating inventory ranks 1/4/5/9/27) is this one
orchestrator instead of five separate Stop-hook wires.

## What it refreshes (the 5 pipelines)

`scripts/brain-refresh.mjs` fans out, **sequentially and in dependency order**, to:

| # | step | script | Ollama | notes |
|---|------|--------|--------|-------|
| 1 | mem-index | `build-memory-index-sidecar.mjs` | none | BM25 recall sidecar |
| 2 | mem-embed | `build-memory-embeddings-sidecar.mjs --resume` | embeddings | depends on (1) — never embed a stale index |
| 3 | galaxy-synth | `galaxy-synthesis-refresh.mjs` | generate | AMP2; self-defends → exit 3 if generate down |
| 4 | wiki-tribal | `embed-all-wiki.mjs --apply` | embeddings | the 31.5%→target coverage climb |
| 5 | regen-viz | `regen-viz.mjs` | none | **heavy** — `--with-viz` only (scheduled-task floor) |

## The safety invariant (load-bearing)

The steps WRITE shared sidecars (memory index/embeddings, tribal index, system-viz graph). **Two
concurrent runs = two concurrent writers = a corrupted sidecar (brain-wide regression).** Defended by
three layers:
1. **throttle stamp** — 30-min cooldown (`.brain-refresh-stamp.json`);
2. **O_EXCL global lock** (`.brain-refresh.lock`) — at most one run fleet-wide. Stale reclaim is
   **atomic rename-aside** (NOT unlink+recreate, which races — two processes could both unlink and
   one clobber the other's fresh lock); only one racer wins the rename, the loser defers;
3. **strictly sequential** step execution (never `Promise.all`).

Ollama health-gating: `realProbeOllama` checks `/api/tags` (daemon) + `/api/embeddings` (nomic stays
up even when `/api/generate` flaps) — it does NOT probe `/api/generate` (it can hang); generate-steps
gate on daemon-up and AMP2's own preflight returns exit 3 when generation is truly down.

`benignExits` map (non-zero exits that are NOT failures): AMP2 `{3:deferred}`; regen-viz
`{4:skipped-locked, 3:deferred}` (exit 4 = another fleet chat holds the graph write-lock — routine).
Exit contract: **0** ran/benign-skip · **1** a step hard-failed · **3** deferred (Ollama down).

## Design + tests

Pure core (`planSteps` / `decideThrottle` / `stepGate` / `statusFromRun` / `classifyOutcome` /
`validateOnly`) + injected-deps `executeRefresh` + `orchestrate` (the main()-seam oracle pinning
lock→probe→run→stamp ordering + releaseLock-on-throw). The lock itself (`acquireLockAt`/`releaseLockAt`/
`pidAlive`) has a **real-fs regression oracle** (tmpdir, real O_EXCL + rename) — added after per-file
scrutiny flagged the untested-real-I/O-seam class (the same class that let an entry-point bug ship,
caught by the live `--dry-run`). 56 node:test, all green.

## Triggers + operate

- **Stop hook** `stop-brain-refresh.mjs` — DETACHED spawn (a ~30-min run must never block a chat's
  Stop), 30-min throttle, light steps only (no `--with-viz`).
- **Scheduled task** `scripts/install-brain-refresh-task.ps1` — every ~2h, `--with-viz` heavy floor,
  S4U + AtStartup. Activate: `powershell -File install-brain-refresh-task.ps1 -RunNow`.
- **CLI:** `node scripts/brain-refresh.mjs [--dry-run | --force | --only id,.. | --with-viz | --json | --verbose]`.

Knobs: `PRISM_BRAIN_REFRESH_{DISABLE,COOLDOWN_MS,LOCK_TTL_MS}` · `_STOP_{DISABLE,THROTTLE_MS}` · `OLLAMA_URL`.

## Known follow-ups (P2, per-file scrutiny)

- mem-embed/wiki-tribal exit **1** (not 3) when Ollama flaps MID-run → mis-classified `failed` (only
  one up-front probe). A fresh re-probe on those exits would defer instead.
- wiki-tribal exits **2** if `tribal-embed-index.json` is absent (a first-run prereq).
- child stderr is captured but discarded on step failure → poorer diagnosability.

Wiring (Stop hook + CLAUDE.md section) shipped as a patch-sibling for golf:
`state/shared/dashboards/patches/BRAIN-REFRESH-MS0-PATCH-2026-05-30.md`. Memory:
[[reference_alpha_brain_refresh_ms0_2026_05_30]].
