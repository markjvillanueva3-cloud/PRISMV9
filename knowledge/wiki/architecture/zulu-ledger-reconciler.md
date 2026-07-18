---
title: ZULU ledger reconciler
aliases: [zulu-ledger-reconciler, reconcile-zulu-ledger, stale-ledger-reconciliation]
tags: [architecture, hermes-zulu, orchestration, awareness, master-brain]
created: 2026-06-11
slot: zulu
---

# ZULU ledger reconciler

**`scripts/reconcile-zulu-ledger.mjs`** -- a re-runnable, deterministic, advisory reconciler that keeps the ZULU master-brain task-queue honest.

## Problem

The `ZULU-MASTER-CONTEXT-LEDGER-*.md` is the orchestrator's curated, ROI-ordered list of open fleet work. But the PRISM fleet ships dozens of commits/hour across 25 work slots, so a hand-curated ledger **goes stale within hours** -- it keeps routing the fleet at items a peer slot has already shipped. Verified 2026-06-11: **5 of 7** "OPEN/blocked" items (including the ledger's own #1 ROI) were already SHIPPED.

## How it works

A `CLAIMS` registry maps each checkable ledger item to a **deterministic probe** (no LLM, ~$0):

| Probe | Verifies |
|-------|----------|
| `checkOllamaGenerate` | `/api/generate` GENERATION endpoint alive (not just the daemon) |
| `checkEdgeTypeInSchema` | a typed cross-substrate edge is in the frozen `EDGE_TYPES` whitelist |
| `checkFileExists` | a named artifact is built |
| `checkSourceImports` | a value is DYNAMIC (e.g. `SLOT_NAMES` imported, not hardcoded) |
| `checkSynthesisFreshness` | the per-galaxy reflection syntheses are current |
| `checkAiSynergyMean` | the AI-synergy audit mean + weak count |

Each yields **SHIPPED / OPEN / COVERED / UNKNOWN** + evidence. A ledger-OPEN item verified SHIPPED is flagged `ledgerStale`. `findNewestLedger()` warns when `CLAIMS.ledgerSays` was synced against an older ledger snapshot than the live one. Atomic JSON sidecar at `state/shared/specs/ZULU-LEDGER-RECONCILE-LATEST.json`.

## Use

```bash
node scripts/reconcile-zulu-ledger.mjs            # human table + sidecar
node scripts/reconcile-zulu-ledger.mjs --json     # machine-readable
node scripts/reconcile-zulu-ledger.mjs --strict   # exit 1 if any ledger-OPEN item is verified SHIPPED (cron)
```

**Run it FIRST at any zulu/bravo context-regain** -- do not trust the ledger's ROI order until reconciled.

**Maintenance:** the `CLAIMS.ledgerSays` values + the `LEDGER_SNAPSHOT` constant are a manual snapshot of one ledger file. When a NEW `ZULU-MASTER-CONTEXT-LEDGER-YYYY-MM-DD.md` is curated, `findNewestLedger()` sets `ledgerSnapshotStale` and the run prints a `[WARN]` -- re-sync `CLAIMS` to the new ledger then bump `LEDGER_SNAPSHOT`. Under `--strict`, a stale snapshot suppresses the exit-1 (warns instead) so a cron never alerts on a known-unsynced registry.

## Doctrine

A hand-curated task ledger is a *snapshot*. On a high-velocity fleet it must be reconciled against deterministic artifact/health probes before its ROI order is load-bearing -- this is the loss-function form of "keep the brain's task-truth current." Tests: `scripts/reconcile-zulu-ledger.test.mjs` (15/15, real-value per-item verdict assertions). Scrutiny caught + fixed a dishonest "COVERED" verdict (R12) where galaxy-LOCAL synthesis injectors were claimed to cover the master-brain read.

Niche (dedup): complements `reconcile-milestones.mjs` / `reconcile-roadmap-drift.mjs` (envelope-vs-git) -- this reconciles the free-form lettered ledger items vs artifact/health probes.

Related: [[reference_zulu_ledger_reconciler_2026_06_11]] · [[reference_zulu_domain_status_2026_06_11]] · [[cross-substrate-synergy-ms0]] · [[psn-octopus-fleet-synergy-ms0]].
