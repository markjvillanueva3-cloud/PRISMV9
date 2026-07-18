# PROMPT-ROUTE-HISTORY Directive — Bounded Plan (2026-06-16, slot:alpha)

**Operator directive (verbatim intent):** read ALL sessions/chats/prompts/commands ever made →
update the graph so every prompt maps to a direct OPTIMAL route (order-of-operations) for
completing future work using every tool/system/feature effectively → future prompts auto-trigger a
graph consult for the order-of-ops to do it right the first time, OR use harnessed loops/crons to
keep looping until done → plans for ALL slash commands (the X-article list + all custom ones):
what/when/how → apply 3 X-article techniques → multi-round loop self-evaluation each time.

**Owner: alpha** (token-optimization owns prompt-routing, the `operator-prompt-route-map`, and
`prompt-route-inject.mjs`). This is genuinely alpha's lane — NOT india's AI-systems /goal.

**This is a PLAN, not the build.** It converts unbounded prose → bounded units with loss functions
(per goal-discipline). It is NOT started: see Prerequisites — the heavy mining is unsafe now.

---

## Build on EXISTING substrate (enrich, do NOT rebuild — R8/dedup)
| Existing asset | Role it already plays |
|---|---|
| `.claude/hooks/prompt-route-inject.mjs` | Already auto-injects "ROUTE -- task class: X" on every UserPromptSubmit. **The auto-trigger surface the directive wants — enhance it.** |
| `scripts/lib/feature-routing-graph.mjs` | `classifyRoutingClass` (12 task classes) + `TASK_CLASS_POLICY` (per-class substrate ladder + commands + model tier). The route brain. |
| `operator-prompt-route-map` (consumed by prompt-route-inject) | The prompt-pattern→route table. **The artifact to enrich from full history.** |
| `scripts/mine-galaxy-transcripts.mjs` + `lib/galaxy-mining-registry.mjs` | Registry-driven Ollama transcript miner. **The mining engine for "read ALL prompts" — fan out via Workflow.** |
| `system-graph.json` (110K nodes) + cross-substrate ADD-only edge spine (sierra) | Where prompt-class→tool/command route EDGES get materialized. |
| `skill-auto-trigger.mjs` + `PRISM-COMMANDS-MANIFEST.md` (~440 skills) | Already auto-suggests skills; the slash-command-plan surface. |
| `/loop` + `prism_atcs` + `CronCreate` | The loop/cron escalation lanes. |

## Decomposition (each unit has a deterministic loss function)
1. **U-PROMPT-MINE** — mine every operator prompt+command across ALL transcripts (CLAUDE.md cites
   912+ transcripts) → JSONL of `{prompt, intentClass, toolsUsed, command, outcome}`.
   *Loss:* `minedCount == transcriptPromptCount` (enumerate first, R/ all-means-all); JSONL exists + sample-validated. *Lane:* Ollama miners fanned out via Workflow (NOT Claude — $0).
2. **U-ROUTE-MAP-ENRICH** — aggregate mined prompts → extend `operator-prompt-route-map` so every
   observed prompt-class has an OPTIMAL order-of-ops (substrate ladder + commands + model tier +
   loop/cron escalation). *Loss:* every mined class has a route entry; `prompt-route-inject` test green.
3. **U-GRAPH-ROUTE-EDGES** — add typed `routes-to` edges (prompt-class → tool/command/engine nodes)
   to system-graph via the ADD-only edge spine. *Loss:* edges materialized + queryable (`system-viz find` / `node-card`).
4. **U-AUTO-TRIGGER** — enhance `prompt-route-inject.mjs` to consult the enriched map+graph and
   inject the order-of-ops + slash-command plan + loop/cron recommendation for THIS prompt.
   *Loss:* representative prompts inject the correct route; regression test pins it.
5. **U-SLASH-PLANS** — per-command decision table for all ~440 skills + custom commands:
   trigger / when-to-use / when-NOT / composes-with. *Loss:* every command has a plan entry; surfaced via skill-auto-trigger.
6. **U-LOOP-CRON-POLICY** — map prompt-classes → /loop + ATCS + cron policies (loop loss-function,
   escalate-to-cron condition). *Loss:* policy table + auto-recommendation wired.
7. **U-SELF-EVAL-LOOP** — multi-round self-eval gate after each unit ("are we using the full stack
   for high-quality + efficient work?"). *Loss:* each unit passes its eval-gate before the next.

## Prerequisites (honest blockers — why not started now)
- **Box headroom:** commit charge was 96.9% (critical). U-PROMPT-MINE reads hundreds of transcripts
  + loads Ollama = heavy → would re-trigger the crash cascade the pressure gate blocks. NEED
  `commit < 90%` + `C: free > 20G`. (See [[reference_fleet_commit_disk_cascade_2026_06_16]].)
- **Claude agent budget:** subagent/Workflow fan-out was rate-limited (resets 11:30pm CT). The
  mining fan-out needs it (or run miners serially via Ollama if agents stay capped).
- **X-article content:** the 3 X.com links (onchainmilady/2063255854573396256,
  zeuuss_01/2064446533295395032, charliejhills/2066173786567983233) — x.com is auth-walled to
  WebFetch. **Operator: paste the key technique from each**, or confirm a fetch path. Links 1-2 =
  graph/routing technique; link 3 = the slash-command list to plan against.
- **Ollama up:** the mining lane needs the local daemon (autostart currently disabled).

## Deterministic done-signal for the WHOLE directive
All 7 units' loss functions green + `prompt-route-inject` live-injects an optimal order-of-ops for a
held-out set of real past prompts (eval: N/N routed correctly), validated with numbers. Until the
prerequisites clear, this is QUEUED — alpha drives it post-recovery + agent-reset.
