# HERMES-FLEET-MAXOUT -- drastically increase Hermes-agent utilization fleet-wide (2026-06-30, slot:alpha)

> Operator: "drastically increase hermes agent utilization since it's FREE for all tasks the fleet
> does, so they cover more ground and build more comprehensively -- parallel Hermes agents running
> engineered loops + harnesses + crons until a goal/plan/unit/roadmap/task/user-request is complete to
> the max possible iteration, factoring all variables upstream + downstream of the codebase."
> Spec written at YELLOW 0.81 for a fresh-session build (MS0-scale). ALL-MEANS-ALL: "all tasks" = every
> fleet task class, not a sample.

## Foundation already in place (this session -- do NOT rebuild; BUILD ON)
- **Hermes lane is now NVIDIA cloud + FREE-ish** (NGC quota), repointed off dead xAI: `ask-hermes.mjs`,
  `hermes-mcp-server.mjs` (mcp__hermes__), `GrokClientEngine` octopus voices, meta-health probe -- all
  read `PRISM_HERMES_PROXY_URL=https://integrate.api.nvidia.com/v1` + bearer `NVIDIA_API_KEY` +
  `PRISM_HERMES_MODEL=meta/llama-3.3-70b-instruct`. Commits e2579970a6 / 5a015ac1d6 / 15e4f8e2f7 /
  U-SCRUTINY-HERMES-SOULS. Memory [[reference_hermes_grok_via_proxy_deadtoken_2026_06_29]].
- **Octopus** already seats 5 Hermes persona voices (NVIDIA) -- consensus diversity. **Scrutiny gate**
  already has a 5-soul Hermes advisory arm. These are the PATTERN to generalize fleet-wide.

## CRITICAL constraints (design MUST honor -- from memory, or it storms + rate-limits out)
- [[reference_parallel_hermes_ratelimit_pattern_2026_06_29]] -- parallel Hermes agents hit a provider
  rate ceiling. NVIDIA NGC has its OWN quota (different from the retired Grok limit) -- the harness MUST
  be quota-aware: a concurrency cap + backoff on 429, NOT an unbounded blast.
- [[feedback_agent_fanout_gate_on_fleet_load]] -- gate fanout WIDTH on live fleet load (N /loops already
  running -> shrink the Hermes fan width). Reuse `agent-fanout-pressure-gate` / the fanout gate.
- [[feedback_ollama_fallback_sonnet_agents]] -- on Hermes failure, fall back Ollama -> Sonnet, never silently to Opus.
- Prior art to extend, not duplicate: `HERMES-PARALLEL-MS0-2026-05-24.md`, `HERMES-EFFICIENCY-ROUTER-PLAN-2026-06-04.md`,
  `scripts/hermes-autonomous-drive.mts`, the `prism_atcs` state machine, the Workflow tool.

## What to build (MS0 units, logical order)
1. **U-HARNESS -- a Hermes-agent task-completion harness** (`scripts/hermes-fleet-harness.mjs`):
   given {task, acceptance-criteria, max-iter}, fan out K parallel Hermes agents (NVIDIA) across
   sub-roles (research / generate / verify / adversarial) and LOOP until acceptance OR max-iter OR
   budget. Each iter: agents produce, a verify-agent grades vs criteria + blast-radius, the loop
   decides continue/done. Quota-aware K (cap + 429 backoff); reuses ask-hermes lane + the souls/lenses
   pattern. Pure planner + thin shell; real tests + a LIVE run.
2. **U-BLASTRADIUS -- upstream/downstream factoring**: each harness task pulls its blast radius
   (`master_index_query` / `/impact` / the system-graph) so agents account for upstream callers +
   downstream consumers, not just the edited file. Feed it into the agents' context.
3. **U-LOOP-WIRE -- wire the harness into the fleet's autonomous loops**: `/loop`, `/checkin` Step 12,
   ATCS, the autonomous-loop sentinel -- route eligible mechanical/research/gen/verify sub-tasks to the
   Hermes harness (FREE) instead of burning Claude, per the existing Ollama->Sonnet->Opus ladder
   (insert Hermes-NVIDIA ABOVE Ollama for capable cloud work). Claude stays for deep reasoning + safety.
4. **U-CRON -- recurring Hermes fleet sweeps**: a durable cron that, per galaxy, runs the harness on the
   next open roadmap/gap/enrich unit -- "cover more ground" while slots are idle. Quota-budgeted; logs to
   the offload dashboard (ask-hermes byHook already tracks).
5. **U-DASH -- utilization visibility**: extend `ollama-offload-dashboard` / the meta-health to report
   Hermes-agent utilization (calls, tokens-saved, iterations-to-complete) so "drastically increased" is
   PROVEN with numbers, not asserted.

## Acceptance criteria (R15)
- A real fleet task (e.g. a roadmap unit) driven to completion by the harness using >=K parallel Hermes
  agents over N iterations, with a LIVE transcript + the offload dashboard showing the Hermes calls +
  Claude-tokens-saved. Quota-aware (no 429 storm). Falls back Ollama->Sonnet on Hermes down.
- Wired into >=1 real fleet loop surface (not an orphan). Tests: harness planner pure-tested + a live E2E.
- Apply-to-all-galaxies: the harness is galaxy-agnostic (clone-don't-fork the cron per galaxy).

## Files (anticipated)
- `scripts/hermes-fleet-harness.mjs` (+ `scripts/lib/hermes-harness-plan.mjs` pure planner) + tests
- loop wiring: `.claude/helpers/loop-state.mjs` / `loop-iteration-inject.mjs` / ATCS / autonomous-loop
- cron: `.claude/helpers/install-hermes-fleet-sweep-task.ps1` + the sweep script
- dashboard: extend `scripts/ollama-offload-dashboard.mjs` (Hermes section)
- Reuse: `scripts/ask-hermes.mjs`, `scripts/lib/scrutiny-souls.mjs` (soul pattern), the fanout gate.

## Reversal / safety
- Hermes-harness routing behind a knob (`PRISM_HERMES_HARNESS=on|off`), default conservative until the
  quota ceiling is characterized live. Never routes safety-critical (G-code/physics) off Claude.

## BUILT 2026-06-30 (slot:alpha) -- reconciliation with prior art + ship log
**R8/dedup correction:** the spec under-credited prior art (drafted at YELLOW 0.81). U-HARNESS
**already existed** -- `scripts/hermes-work-loop-driver.mts` (HERMES-WORK-LOOP-MS0/U4) IS the
parallel-Hermes harness: reads 4 work sources -> `HermesWorkSourceFeederEngine.toSubtasks()` ->
`HermesAutonomousDriveRunnerEngine.drive()` with an injected ask-hermes executor (NVIDIA lane +
Obsidian vault `--with-context`) -> ledger; gated by `PRISM_HERMES_AUTONOMOUS_DRIVE`/`--gate`.
`scripts/lib/hermes-workflow-planner.mjs` is the 6-pattern planner. The `/hermes-work-loop` skill
is the on-demand companion. So this session COMPOSED that proven harness rather than rebuilding it.

**Foundation proven live (R13):** the driver fired a real agent on the repointed NVIDIA lane
(`meta/llama-3.3-70b-instruct`, ledger `ok:true`) -- the fleet's Hermes agents now work (the xAI
errors are gone).

**Shipped this session:**
- **U-CRON** (commit `4e6e70337c`) -- `scripts/hermes-fleet-sweep.mjs` + pure planner
  `scripts/lib/hermes-fleet-sweep-plan.mjs` (per-UTC-day budget + min-interval + idle-scaled width,
  17 tests) + S4U installer `install-hermes-fleet-sweep-task.ps1` (default-OFF; arm via `-GateEnv`
  -> `PRISM_HERMES_FLEET_SWEEP=1`). Live: un-armed plan on real chat-slots (idle 19 -> maxUnits 5);
  armed nested run fired real agents, budget folded. *(The commit also rescued 4 untracked prior-art
  files a crashed peer left staged: the driver + FeederEngine + their tests.)*
- **U-DASH** (commit `ee704c6116`) -- `ollama-offload-dashboard.mjs` Hermes section (pure
  `summarizeHermesWorkLoop`, 5 tests). Live: 5 agents (60% ok), ~3399 off-Claude tokens, 3 sweeps.
- **U-LOOP-WIRE** -- `loop-iteration-inject.mjs` HERMES_HARNESS_NUDGE on every `/loop` tick
  (knob `PRISM_LOOP_HERMES_NUDGE_DISABLE`). Live: fires on /loop, knob suppresses, non-loop silent.
  *(Code landed in HEAD but was ABSORBED into peer commit `57c888c646` (zulu) by shared-tree git-lock
  contention -- attribution lost, code live. Sibling of [[feedback_commit_to_slot_worktree]].)*

**Not built (queued):** U-BLASTRADIUS (the harness already pulls a static MCP digest per subtask;
true upstream/downstream `master_index_query`/`/impact` enrichment of agent context remains open).
An iterate-to-acceptance LOOP mode on the driver (it is single-wave today) is the other open gap.

**U-BLASTRADIUS probe finding (2026-06-30, slot:alpha -- crossroad auto-decide proceeded, hit a blocker):**
the cheap blast-radius surface is NOT ready for these nodes. `node scripts/system-viz-query.mjs find
"hermes work loop"` returns 0 nodes (the system graph has not indexed this session's new files), and
`blast-radius <id>` needs an exact indexed id. Regenerating the 644MB graph is heavy -- defer to a fresh
context. **Two paths for the next session:** (a) regen the graph (or wait for the nightly), then wire a
fail-soft `loadBlastRadius(unitId)` into the driver's `mcpDigestFor`/`assembleContext`; OR (b) graph-
independent: a Grep-based importer/consumer finder (downstream = files importing the unit's files;
upstream = the unit's own imports) -- more robust for fresh files but needs a unit-id -> files mapping
first. Recommendation: (b) -- it does not depend on graph freshness and is self-contained/testable.
