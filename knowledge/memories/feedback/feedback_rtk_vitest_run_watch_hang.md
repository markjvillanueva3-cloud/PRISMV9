---
name: feedback_rtk_vitest_run_watch_hang
description: "RTK can rewrite `npx vitest run` → `rtk vitest` (dropping `run`) → vitest enters WATCH mode and hangs forever. Always pass `--watch=false`."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.442Z
aliases: feedback_rtk_vitest_run_watch_hang
---


The RTK bash hook intermittently rewrites `npx vitest run <file>` into `rtk vitest <file>` — **dropping the `run` subcommand**. `vitest` without `run` defaults to **watch mode**, which never exits, so the Bash tool backgrounds it and it hangs indefinitely (observed eating 100s+ before a manual TaskStop). Symptom: a tiny test "runs" far longer than its real ~1s, the output file stays empty, and orphaned `vitest`/`rg` processes then degrade repo-wide search (ripgrep/Glob start timing out).

Observed 2026-05-30 (slot india): `npx vitest run src/__tests__/X.test.ts --reporter=basic` was rewritten to `rtk vitest src/__tests__/X.test.ts --reporter=basic` (confirmed via the stopped-task command echo). It is INTERMITTENT — some `npx vitest run` calls survived intact and completed normally — so it's a flaky passthrough, not a deterministic rewrite.

**Why:** the RTK vitest filter maps `vitest run` to its own handler but its arg passthrough can drop the `run` token, leaving bare `vitest` = watch.

**How to apply:**
- Always run vitest as `npx vitest run --watch=false <files> --reporter=basic`. The explicit `--watch=false` forces non-watch even if `run` is stripped.
- If a vitest invocation runs >~30s for a small suite, assume watch-mode hang: `TaskStop` it, re-run with `--watch=false`.
- After a hang, repo-wide Grep/Glob (ripgrep) may time out from orphaned processes — single-file Grep still works; reap via the [[reference_fleet_reaper|fleet-reaper]] / node-process-janitor (golf's domain) or just proceed with single-file greps.

Related: [[feedback_verify_actual_contract_not_proxy]] (verify the real command that ran, not what you typed). Cross-cutting — affects every slot that runs vitest through the rtk hook, not just india.
