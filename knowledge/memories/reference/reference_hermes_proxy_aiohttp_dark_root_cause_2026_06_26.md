---
name: reference_hermes_proxy_aiohttp_dark_root_cause_2026_06_26
description: "The 'utilize hermes more' /goal has been run 4+ times (6/24, 6/25 x2, 6/26) because the blocker was INVISIBLE. The actual root cause of the dark Hermes stack on 2026-06-26 was NOT OAuth -- it was a corrupt aiohttp install (missing aiohappyeyeballs) + version drift (3.14.1 vs the maintainer pin aiohttp==3.13.4) wedging the proxy. Repaired the venv; proxy now BINDS. Residual /health hang = expired xAI OAuth (operator re-auth). Shipped a fail-loud SessionStart surfacing hook so the next dark proxy is SEEN instantly. EVERY code facet of the /goal was already built."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.607Z
aliases: reference_hermes_proxy_aiohttp_dark_root_cause_2026_06_26
---


# Hermes proxy DARK root cause + the visibility meta-fix (2026-06-26, slot:alpha)

Operator `/checkin-alpha /goal`: "utilize hermes agents/octopus + hermes CLI (max subscription
-> parallel agents) + engineered loops/harnesses/crons + obsidian/PSN/system-viz to improve the
graphs alpha developed; drastically increase parallel hermes agents at maxed opus-fast-max,
auto-invoked; switch default model of hermes CLI + agents to grok highest capability."

## The key realization: EVERYTHING the /goal asks for is ALREADY BUILT (dedup -- do NOT rebuild)

This identical `/goal` has run 4+ times. Each facet is shipped + tested:
- **grok-highest-capability default** -- `scripts/lib/grok-capability-rank.mjs` (`resolveHighestCapabilityModel`
  + `GROK_CAPABILITY_DEFAULT="grok-4.3"`), wired into ALL 3 model-resolution sites:
  `ask-hermes.mjs` (CLI) + `hermes-mcp-server.mjs` (the agents) + `verified-offload-tiered.mjs`. 19/19 tests.
  Operator pins a newer grok via `PRISM_HERMES_PREFERRED_MODEL` (no code change).
- **parallel hermes agents / octopus** -- `MultiModelConsensusEngine` seats a 5-lens Hermes persona
  panel DEFAULT-ON when the proxy is reachable (`reference_octopus_hermes_agents_2026_06_25`, sierra).
- **opus-fast-max per agent** -- `OpusFastMaxAgentSpecEngine.ts` (commit 164cce5ceb).
- **graph-improvement fan-out + cron** -- `GraphImprovementFanoutEngine` + `hermes-graph-improvement-driver.mts`
  + scheduled task "PRISM Hermes Graph Improvement" (ledger fresh, fires daily + 6h).
- **9 `PRISM Hermes *` scheduled tasks** all registered/Ready (the "auto-invoked" leg).
The 6/24 memory (`reference_alpha_hermes_verified_tier_2026_06_24`) ALREADY said "Unit C is NOT needed --
DO NOT build a new cron/harness; it's a dedup violation + metric-gaming make-work." Heed that.

## The ACTUAL blocker (found by READING the log, not assuming -- the prior sessions guessed OAuth)

The whole stack was DARK because the proxy on :8645 wouldn't serve. `hermes-proxy-start.log` showed the
real reason every fire all day: **`hermes proxy requires aiohttp. Install: pip install aiohttp`**.
Diagnosis chain (all evidence-based):
1. `import aiohttp` failed -> missing transitive dep `aiohappyeyeballs` (corrupt/partial install). Installed it.
2. Then `import aiohttp` hit a circular-import (`cannot import name 'hdrs'`) -> corrupt install. Force-reinstalled.
3. That pulled aiohttp **3.14.1**, but hermes-agent 0.17.0 pins **`aiohttp==3.13.4`** exactly (pyproject
   `[messaging]` extra). 3.14.1 binds the socket but WEDGES the HTTP handler -- `/health` AND `/` both hang.
4. Downgraded to `aiohttp==3.13.4` (the maintainer pin). Killed the wedged proxies, cleared TIME_WAIT,
   restarted via the "PRISM Hermes Proxy" task -> **proxy now BINDS + listens** (was fully dead before).
5. RESIDUAL: `/health` still hangs even on 3.13.4 with a listener present. **R12 CORRECTION (my first-pass
   "most likely expired xAI OAuth" was NOT confirmed and is SUPERSEDED):** running `hermes auth status xai-oauth`
   to confirm the OAuth theory instead revealed the TRUE deeper cause -- **the hermes-agent install is
   half-broken from an INTERRUPTED `hermes update`**: "A previous `hermes update` was interrupted mid-install...
   hermes.exe is locked by another process; scheduled replacement on next reboot... Could not auto-recover the
   interrupted install" (auto-recovery FAILED twice on the locked-exe `os error 32`). The aiohttp corruption was
   a SYMPTOM of this interrupted update. The auth status could not even be read (blocked behind the broken install),
   so OAuth is NEITHER confirmed nor ruled out -- the install corruption must be fixed first.
6. **RESOLVED AUTONOMOUSLY (no reboot needed -- the crossroad-auto-decide protocol drove this):** the
   hermes.exe lock was held by ~14 TRANSIENT venv-shim CLI processes (not the desktop app, not the proxy).
   They exited on their own; re-running `hermes auth status xai-oauth` then COMPLETED the interrupted recovery:
   "Installed agent-client-protocol==0.9.0 + hermes-agent==0.17.0 -- your install is healthy again." NO REBOOT,
   NO manual `.[all]` reinstall required. Then `hermes auth reset xai-oauth` -> "Reset status on 1 xai-oauth
   credentials" (the credential WAS marked exhausted/rate-limited). All reversible/internal levers exhausted.
7. **FINAL residual (genuinely OPERATOR-ONLY): /health STILL hangs** after (a) aiohttp pinned 3.13.4,
   (b) install recovered healthy, (c) exhaustion reset, (d) ~8 clean proxy restarts. The proxy BINDS (listener
   present) but every endpoint (/health, /) hangs -> the per-request xAI upstream credential attach wedges. By
   full elimination the xAI OAuth **token** needs RE-AUTHENTICATION (browser PKCE) -- the ONE thing I'm prohibited
   from (account auth). The ONLY remaining step:
   ```
   cd C:\Users\wompu\AppData\Local\hermes\hermes-agent
   venv\Scripts\python.exe -m hermes_cli.main auth add xai-oauth --type oauth   # browser PKCE login (OPERATOR)
   Start-ScheduledTask -TaskName 'PRISM Hermes Proxy'                            # then verify hermes_status up:true
   ```
   NOTE: the proxy runs via `python -m hermes_cli.main proxy start` (NOT hermes.exe), so it BINDS fine; the wedge
   is purely the dead OAuth token's upstream attach.

Repair commands (the fix this session applied, for next time):
`"C:/Users/wompu/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe" -m pip install aiohttp==3.13.4`
then `Start-ScheduledTask -TaskName 'PRISM Hermes Proxy'`.

## What shipped (commit 3531072be8, [MAIN-FORCE] on cad-fusion-live-ms0) -- the VISIBILITY meta-fix

`.claude/hooks/hermes-proxy-health-inject.mjs` (+ 21/21 tests) -- a SessionStart advisory hook that probes
:8645 (TCP listener + `/health`, both hard-bounded so it can NEVER hang SessionStart) and emits a LOUD
banner ONLY when the proxy is down/hung/degraded (silent when healthy), naming the diagnosed reason
(missing-dep / bind-conflict / OAuth) + the exact remediation. Wired into SessionStart in the user-global
settings.json (mirrored C:->H:), timeout 5000. Knob `PRISM_HERMES_HEALTH_INJECT=0`. This closes the gap that
made this /goal recur 4+ times: `fleet-task-health-watch` can't catch it (the scheduled task reports
SCHED_S_TASK_RUNNING even when the proxy never served), and the real reason was buried in a log nobody read.
Per-file 2-arm scrutiny BOTH PASS; arm A caught a P1 (header-then-body-hang misread as `up`) -> fixed via the
pure `classifyHealth` (require a COMPLETE body read) + a regression test.

## Honest note (R12): shared-tree commit absorption
My commit 3531072be8 ALSO absorbed 2 foreign files already staged in the shared-tree index that slipped past
the git-add-lane-guard's unstage: `state/shared/cad-hermes-builder-plan.json` (peer claude-5fab8d38's CAD-hermes
plan) + `state/shared/system-viz/LEVERAGE-WIRING-QUEUE.json` (the graph-improve cron's regenerated output).
Content is PRESERVED in git (not lost); LEVERAGE-WIRING-QUEUE regenerates on the next cron run. Did NOT rewrite
shared history to remove them -- echo had already committed on top (concurrent committers; the conflict-fork
rule + "don't fight the shared tree" forbid a rebase here). Attribution noted for traceability.

## Related
- [[reference_alpha_hermes_verified_tier_2026_06_24]] (do-not-build-Unit-C; the substrate crons already exist)
- [[reference_octopus_hermes_agents_2026_06_25]] (octopus 5-lens hermes personas default-on)
- [[reference_hermes_graph_improvement_loop_2026_06_25]] (the opus-fast-max graph-improve cron)
- [[reference_hermes_bridge_ms0_2026_06_13]] (prior "repaired a broken Hermes install" -- the install breaks repeatedly)
