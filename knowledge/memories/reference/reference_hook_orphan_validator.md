---
name: reference-hook-orphan-validator
description: "scripts/validate-hook-orphan-signal.mjs (shipped iter4 2026-05-15 in H:/prism-hva worktree). Sister to validate-unwired-signal.mjs but for hook orphans. Live sweep 50/297 = 2% FP rate — confirms the HVA 312-orphan signal is TRUSTWORTHY for cleanup milestones (98% are truly disconnected, not falsely classified)."
aliases: reference_hook_orphan_validator
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.144Z
---


# scripts/validate-hook-orphan-signal.mjs — companion to engine validator

**Shipped:** 2026-05-15 iter 4 of /loop session `6d0595bf-26fa-4329-b16e-462ca941e240` by claude-6d0595bf (was slot bravo, became slot delta after re-checkin).
**Location:** `H:/prism-hva/scripts/validate-hook-orphan-signal.mjs` (forked to prism-hva worktree to avoid commit-ownership-guard collision on H:/prism shared tree).

## Why it exists

`scripts/high-value-additions-rank.mjs` reports a 65.8% hook orphan rate (312 of 476 source hooks "unwired"). Before relying on that signal for cleanup milestones, you need to know: of the 312, how many are TRULY disconnected vs FALSELY classified (e.g. wired via a mechanism HVA doesn't scan)?

Iter 4 answered that: **only 2% false-positive**. The signal is trustworthy.

## How it works

Same shape as `validate-unwired-signal.mjs` (engine equivalent — see [[reference_hva_validator_collision]]):

| Layer | Detection target |
|-------|------------------|
| `settings_json` | settings.json command field (also scanned by HVA — sanity corroborator) |
| `bundle` | `.claude/hooks/bundles/*.mjs` HOOK_BASE template literals (also HVA) |
| `hook_to_hook` | another hook spawns/imports the target (TRANSITIVE — HVA MISSES) |
| `scheduled_task` | `scripts/system-health/*.ps1` references (HVA MISSES) |
| `script_invocation` | `scripts/*.mjs` invokes via `spawn`/`execFile`/`exec`/`fork` (HVA MISSES) |
| `mcp_registry` | `mcp-server/src/hooks/*.ts` imports the hook by name (HVA MISSES) |

Strong-match-only classification: any of the 6 above → `FALSE-POSITIVE-WIRED`. Otherwise `TRULY-ORPHAN` (or `WEAK-SIGNAL` / `EXEMPT`).

Looser FP-rate threshold than engine validator (15% vs 10%) — hook orphans have more legitimate-but-dormant cases (feature-flag-gated hooks waiting for an experiment to flip on).

## Live sweep result (2026-05-15)

```
sample=50/297 seed=42
truly-orphan:         49
false-positive-wired: 1   → wiki-precheck-inject (wired via scripts/build-wiki-leaf-index.mjs)
weak-signal:          0
exempt:               0
false-positive rate:  2.00% (threshold ≤15%)
verdict:              [PASS]
report:               state/shared/HOOK-ORPHAN-VALIDATION-2026-05-15.json
```

## Operational use

**Before claiming "wire orphan hook X":** run `node scripts/validate-hook-orphan-signal.mjs --sample N --seed 42` to confirm the signal is still trustworthy.

**Before a hook-cleanup milestone:** run `--all` to get the full verified-orphan list at `state/shared/HOOK-ORPHAN-VALIDATION-<date>.json`.

**To find specific wiring path for an apparently-orphan hook:** run `--verbose --source <list-of-just-that-hook>.json`.

## Companion memories

- [[reference_hva_validator_collision]] (engine validator iter1+2 — same pattern, similar shape)
- [[feedback_never_delete_only_disable]] (apply this rule when "wiring" an orphan = sometimes the disable was deliberate)
- [[reference_fleet_reaper_ms1]] (vitest infrastructure workaround — applies to companion test files for this validator too)
