---
name: synergy-regression-watch-2026-05-16
description: "scripts/synergy-regression-watch.mjs — week-over-week synergy ratio watcher with seeded history; closes the silent-regression class observed when synergy dropped 22.2%→21.1% in 7d with zero alerts. /forge-audit-v2 META artifact, all reviewer P1s addressed."
source: prism-memory
synced: 2026-05-18T01:02:09.963Z
aliases: reference_synergy_regression_watch_2026_05_16
---


# synergy-regression-watch.mjs — `/forge-audit-v2` META artifact

Shipped 2026-05-16 by claude-32a39c0c slot foxtrot during `/forge-audit-v2 /system-viz continue finding more enhancements and improvements to development tools and pipelines`. NOT committed (per standing "never commit unless asked" rule). Lives at [`scripts/synergy-regression-watch.mjs`](../../../../prism/scripts/synergy-regression-watch.mjs).

## What it does

Wraps `scripts/system-synergy-map.mjs` with a persistent week-over-week diff. Three modes:
- **normal** — measure now + append to `state/shared/synergy-history.jsonl` + compare to ≥7d-old baseline + alert if regression beyond threshold.
- `--json` — same logic, machine-readable JSON output for cron/CI.
- `--history` — dump the JSONL without measuring.

Cron-friendly exit codes: `0`=clean / `1`=regression / `2`=measurement-error or corrupt-history.

## Why

`system-synergy-map.mjs` existed for measurement but had no automated diff. On 2026-05-16 the audit caught a 7-day silent regression (22.20% → 21.11% = -1.09pp) — the script was the only signal. Without a watcher, the same regression class repeats indefinitely.

## Key technical decisions

- **Retroactive history seed**: when shipped, the JSONL was seeded with the 2026-05-09 datapoint (22.2% from `SYSTEM-SYNERGY-AUDIT-2026-05-09.md` line 343). Without this seed the watcher's first run would baseline against itself and silently emit "no baseline yet" while the real regression sits unflagged. The seed converts a one-shot manual cite into an independently-reproducible measurement.
- **Atomic-rename append**: writes to `synergy-history.jsonl.tmp.<pid>.<now>` then `renameSync` to target. Atomic on NTFS/ext4/APFS. Prevents torn writes on concurrent `/loop` invocations.
- **Corrupt-history fail-loud**: `loadHistory()` returns `{ok, history, corrupt, totalLines}`; `ok:false` when >25% of lines are unparseable AND <2 valid entries remain. Caller exits 2 with stderr message instead of silently degrading to "no baseline" (the P1 the reviewer caught).
- **2× threshold = p0 severity**: regressions ≥2× the configured threshold (default 0.5pp) escalate from p1 to p0. The 2026-05-09→2026-05-16 drop of -1.09pp triggers p0.

## Verification channel (canonical)

```bash
# Independent regression reproduction
node scripts/synergy-regression-watch.mjs --json | jq -r .alert.severity   # → "p0"
node scripts/synergy-regression-watch.mjs --history                         # → ≥1 record, oldest 2026-05-09

# Cron / Windows-task pattern
node scripts/synergy-regression-watch.mjs                                   # exits 0/1/2
```

## Boris doctrine compliance

- **Verification feedback loop**: HARD GATE — every regression has a re-runnable measurement.
- **Peer-review feedback applied**: 3 finding-defects (F1 seed missing, F4 unsupported threshold, F5 wrong count) + 3 META P1s (corrupt-history silent degrade, persist-before-alert race, missing /loop binding) all addressed in second pass.
- **Compounding-gains tax**: the artifact IS the audit's reusable measurement, not just a one-off doc.
- **Regressions flowed to CLAUDE.md**: appended to `## Recent regressions` per back-flow pattern.

## What's NOT included (deferred next batch)

Five sibling META artifacts named in F3 still missing on disk: `hook-overhead-profiler.mjs`, `unwired-engine-leverage-rank.mjs`, `stale-milestone-rank.mjs`, `cold-script-rank.mjs`, `dev-tool-leverage-rank.mjs`. Each is ~100-200 LOC and would compound the audit toolkit further. Recommended next-up: `helper-orphan-rank.mjs` (F6 — 85% of helpers are unreferenced by hooks).

## Durable scheduled task + the `cmd /c` quote-strip trap (2026-05-16, "do it" x2)

User directed the durable path: `.claude/helpers/install-synergy-watch-task.ps1` (~150 LOC, mirrors `install-fleet-reaper-task.ps1`). Registers a Windows Scheduled Task **"PRISM Synergy Regression Watch"**, daily 08:13 local, runs `node synergy-regression-watch.mjs --json --threshold 0.005`, teed to `state/shared/synergy-watch.log`. Survives reboots + session death (the in-session CronCreate `040081ef` is session-only / 7-day-max).

**Regression caught during operational verification (the `cmd /c` quote-strip trap):**
First registration used `New-ScheduledTaskAction -Execute cmd.exe -Argument "/c $innerCmd"` where `$innerCmd` starts with `"node.exe" "script" ... >> "log"`. **`cmd.exe` strips the first AND last double-quote** when the `/c` argument both starts and ends with `"` and contains more quotes — corrupting the `>>` redirect. Net: the task ran, `cmd` returned exit 1 from the mangled command line, the watcher **never executed** (0 history append, 0 log bytes), and `LastTaskResult=1` was a **FALSE regression signal** that masked the no-op. Verified false by checking `synergy-history.jsonl` line count (stayed 6, no new append) — NOT by trusting the exit code. Per [[feedback_verify_actual_contract_not_proxy]]: the exit code was a proxy; the history-append was the actual contract.

**Fix:** wrap the whole command in an EXTRA outer quote pair — `-Argument ('/c "' + $innerCmd + '"')`. After cmd strips the outer pair the inner command survives intact. Re-verified: history 6→7 (real append at 21:36:17Z), log 594 bytes with the JSON alert, `LastTaskResult=1` now a TRUE signal. The fleet-reaper installer never hit this because it calls `node.exe` directly (no redirect, no cmd wrapper).

**CLAUDE.md back-flow DEFERRED:** the `cmd /c` quote-strip regression belongs in `H:/prism/CLAUDE.md § Recent regressions` per the Boris pattern, but CLAUDE.md was peer-claimed by claude-339c8ff7 at the time (lane discipline — not edited). Backflow text staged here; a later chat owning CLAUDE.md should append: *"2026-05-16 | Windows scheduled-task `cmd /c "<cmd starting+ending with quote>"` silently no-ops via cmd quote-strip; LastTaskResult=1 is a false signal — verify via the task's actual side-effect (file append), not exit code. fix: wrap in extra outer quote pair. observed-by: claude-32a39c0c slot foxtrot /forge-audit-v2."*

ASCII-only `.ps1`: PS 5.1's active codepage mis-parses non-ASCII em-dashes/smart-quotes in source (per [[feedback_verify_actual_contract_not_proxy]]). First draft used `—`/`'`; parser threw 6 errors. Rewrote ASCII-clean (`--`, straight quotes) → 0 parse errors.

## Cross-refs

- Audit doc: `state/shared/specs/AUDIT-DEV-TOOLS-PIPELINES-2026-05-16.md` + `.html` (28952 bytes).
- Prior audit: `state/shared/specs/SYSTEM-SYNERGY-AUDIT-2026-05-09.md` (22.2% baseline source).
- Doctrine: `state/shared/specs/BORIS-LOOP-AGENT-DOCTRINE.md`.
- Related memory: [[reference_system_viz]] (the underlying measurement surface).


## Related
[[skills/forge-audit-v|/forge-audit-v]] • [[skills/system-viz|/system-viz]] • [[skills/synergy-regression-watch|/synergy-regression-watch]] • [[skills/prism|/prism]] • [[skills/scripts|/scripts]] • [[skills/system-synergy-map|/system-synergy-map]] • [[skills/shared|/shared]] • [[skills/synergy-history|/synergy-history]] • [[skills/ext|/ext]] • [[skills/loop|/loop]]