---
title: Monitoring-tool drift — the golf hygiene tick must DELEGATE to canonical tools, not hand-roll
type: lesson
tags: [fleet-hygiene, golf, reaper, ollama, monitoring, tool-drift, false-positive]
slot: golf
date: 2026-07-01
related:
  - "[[fleet-reaper-harden-u-node-orphan-cleaner-protect]]"
  - "[[fleet-hygiene-u-unwired-gate-string-strip]]"
  - "[[reference_golf_zombie_reap_10min_monitor_2026_06_30]]"
  - "[[reference_ollama_gpu_wedge_guard_insufficient_2026_07_01]]"
---

# Monitoring-tool drift — the golf tick must DELEGATE to canonical tools, not hand-roll

## The pattern (reusable)

When a monitor (here: the golf 10-min fleet-hygiene tick, driven by a cron **prompt**)
**re-implements** a capability that a canonical, hardened tool already provides, the
re-implementation **drifts** from the canonical tool's accumulated protections. Every
safety fix landed on the canonical tool over months is *silently absent* from the ad-hoc
copy. The ad-hoc copy then commits the exact class of error the canonical tool was
hardened against. **Delegate to the canonical tool; do not hand-roll a parallel one.**

Two live instances hit on 2026-07-01 (slot:golf), both in the tick's inline PowerShell:

## Instance 1 — over-reaping (the tick hand-rolled a node reaper)

- The tick reaped `node = parent-dead AND age>5min` in inline PowerShell.
- That is the **discredited 2026-06-11 anti-pattern**: detached PRISM workers (galaxy
  miners, `*-sidecar` embedders, vault/blueprint pipelines) and daemons are **parent-dead
  BY DESIGN**, and long-lived ones **age past 5 min** — so the rule false-kills them. It
  once got the whole reaper hard-disabled ([[fleet-reaper-harden-u-node-orphan-cleaner-protect]]).
- Live damage: the tick false-killed the **:3101 warm master-index search daemon** (serves
  all 26 chats' graph-inject + subagent search).
- The canonical `scripts/fleet-reaper-sweep.mjs` **already protects** it via the
  command-line discriminator `DEFAULT_PRISM_WORKER_PROTECT_REGEX`
  (`scripts/lib/fleet-reaper-mcp-zombie-hunter.mjs:194`). Validated: 7 candidates → **0
  reaped**, daemon survived.
- **Fix:** the tick delegates reaping to `node scripts/fleet-reaper-sweep.mjs --once`
  (the canonical protected reaper) and keeps only the tick-specific extras it does NOT
  cover (empty-terminal sweep, status line). The tick was the **third** un-hardened node
  reaper of this class — the R15 apply-to-all reached the two `.mjs` reapers but missed
  the tick because it lives in a cron **prompt**, not a `.mjs` importing the shared regex.

## Instance 2 — tags-only false-UP (the tick hand-rolled the Ollama probe)

- The tick probed `:11434/api/tags` only and reported `ollama=UP`.
- A **wedged** Ollama daemon answers `/api/tags` 200 while `/api/generate` **hangs** — so
  a tags-only probe is a **false-UP** that masked a real generate-wedge for hours.
- The canonical `scripts/ollama-wedge-guard.mjs --status` probes tags **AND** generate and
  classifies `healthy | probe-error | resource-starved | wedged | down`.
- **Fix:** the tick uses `ollama-wedge-guard --status`; reports `ollama=WEDGED` on a
  generate-hang (note softly — self-clears; do NOT thrash `--recover`, the GPU-level wedge
  re-wedges a fresh runner: [[reference_ollama_gpu_wedge_guard_insufficient_2026_07_01]]).

## Takeaways

1. **A monitor that hand-rolls a canonical capability inherits none of its hardening.**
   Prefer `delegate-to-canonical` over re-implement, even for "simple" checks.
2. **Parent-death alone is not an orphan signal** — detached daemons/workers are
   parent-dead by design; discriminate by **command line / listening-port**, not parent/age.
3. **A liveness probe that checks only the cheap surface (tags/port) can be a false-UP** —
   probe the actual work path (generate).
4. **Durable config carries the bug forward.** The tick's prompt lived in the durable cron
   store, so the bug recurred every fire until the **stored prompt** was corrected
   (operator-approved 2026-07-01). Fix the durable artifact, not just the live session.
