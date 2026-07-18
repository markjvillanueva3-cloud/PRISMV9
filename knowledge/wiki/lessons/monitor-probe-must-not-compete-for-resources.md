---
title: A health probe must not compete for the resource it monitors (wedge-guard false-'wedged' harm loop)
type: lesson
tags: [monitoring, false-positive, ollama, wedge-guard, fleet-hygiene, golf, harm-loop]
slot: golf
date: 2026-07-01
related:
  - "[[golf-tick-delegate-to-canonical-tools]]"
  - "[[meta-health-hermes-down-liveprobe-gate]]"
  - "[[reference_ollama_gpu_wedge_guard_insufficient_2026_07_01]]"
---

# A health probe must not compete for the resource it monitors

## The incident (2026-07-01, fixed golf `8e19fb2842`)

`ollama-wedge-guard.mjs` probed `/api/generate` with a hardcoded tiny model
(`qwen2.5-coder:1.5b`). With `OLLAMA_MAX_LOADED_MODELS=2` and both slots pinned by fleet
traffic, the probe's **third** model queued behind an eviction that never happened → probe
hung past its 45s timeout → classified `wedged` → the 10-min `PRISM Ollama Wedge Guard`
scheduled task ran `--recover`, **kill-restarting a perfectly healthy daemon every tick and
evicting ~51GB of hot models**. Measured live: a resident model answered generate in 2.95s
at the same instant the probe's model hung 134s. The monitor WAS the outage. A second
supervisor (`ollama app.exe` tray) racing the serve task after each kill made the churn worse.

## The class

A liveness probe whose request must **acquire the same contended resource** it is checking
(a model-load slot, a connection-pool slot, a GPU context, a lock) measures *contention*,
not *health* — and under load it reads "dead" exactly when the system is busiest. If that
verdict actuates a destructive remediation (restart/kill/failover), you get a
**monitor-driven harm loop**: remediation increases load → probe starves again → repeat.
Sibling of the lifetime-counter false alarm ([[meta-health-hermes-down-liveprobe-gate]]):
both are monitors actuating on a confounded signal without positive evidence at decision time.

## The rule

1. **Probe through the already-hot path.** Test the capability with a resource that is
   already allocated (here: the smallest RESIDENT generate-capable model from `/api/ps`);
   only consume a new resource when the system is idle (nothing resident → cold-load is fair).
2. **Exclude capability-mismatched residents** — an embedding model 400s instantly on
   generate → `probe-error` would mask a REAL wedge (scrutiny arm-A P1); filter them, and
   fall back + re-probe once when a resident pick responds-with-error.
3. **Before any monitor may destructively remediate, demand positive evidence** the failure
   is in the monitored system, not in the probe's own resource acquisition (the guard's own
   probe-error / resource-starved discrimination is this pattern — the probe model just
   wasn't covered by it).
4. Distrust "still broken after restart" when the *verifier is the same starving probe* —
   verify recovery through an independent path (direct curl of a resident model settled it).
