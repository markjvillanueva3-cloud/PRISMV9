---
name: reference-wiki-watchdog-stop-iter11-2026-05-18
description: "BACKEND-DEV-LOOP iter11 wired iter10's wiki-propagation-watchdog into a Stop hook so it actually runs"
aliases: reference_wiki_watchdog_stop_iter11_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.265Z
---


2026-05-18 BACKEND-DEV-LOOP iter11 (slot lima, claude-cdfb103c) — wired iter10's `scripts/wiki-propagation-watchdog.mjs` into a Stop hook. The watchdog itself was shipped in commit `dc8965beac` but sat unwired; per the user directive "make sure everything you're building is automated or it will sit stagnant", a watchdog with no caller is the orphaned-writer class.

**What shipped:**
- `.claude/hooks/wiki-propagation-watchdog-stop.mjs` — T3 Stop hook (mirrors [[fleet-task-health-stop]] pattern exactly: always `{continue:true}`, stamp-throttle, detached spawn, pure `repoPaths`/`throttleDecision`/`buildAdvisory` for tests).
- `.claude/hooks/wiki-propagation-watchdog-stop.test.mjs` — 22 cases via `node --test`, all green.
- `H:/.claude/settings.json` Stop[0].hooks[43] — wired after `fleet-task-health-stop`. Auto-mirrored to C:.

**Knobs:** `PRISM_WIKI_WATCHDOG_DISABLE=1` · `PRISM_WIKI_WATCHDOG_STOP_DRY=1` · `PRISM_WIKI_WATCHDOG_THROTTLE_MS=N` (default 15min).

**Honest scope (R12):** this hook makes the watchdog FIRE. It does NOT fix the 3 propagation gaps the watchdog surfaces (system-viz 4.3h stale, embeddings 89.3h stale, obsidian-feed never fired). Those are iter12+ work — either hook the refresh commands to the same Stop chain, or investigate why `stop-obsidian-memory-feed.mjs` never wrote its stamp.

**Lesson:** building a watchdog without wiring its caller is the same class of debt as building an engine without a dispatcher — both are inert writers. Iter10 + iter11 are properly seen as ONE unit; splitting them was a velocity choice, not an architectural one. Future iters that ship a watchdog/audit/detector should include the Stop-hook or cron wiring in the same commit.

Sister: [[reference_fleet_task_health_ms0_2026_05_17]] · [[reference_token_efficiency_playbook_2026_05_18]] (writer-without-reader doctrine).
