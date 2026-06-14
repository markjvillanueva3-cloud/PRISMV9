# BRAVO + ZULU Galaxy Memory — Hermes/Zulu Building + Stub Hunting + Fleet Orchestration

Append-only cross-session memory for the hermes-zulu galaxy. Bravo owns the build side; zulu owns the runtime/orchestration side. Both share this file.

## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="hermes zulu" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:hermes-zulu]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-11
- **OPEN-TASKS LEDGER (read this to regain context fast):** `state/shared/specs/BRAVO-HERMES-ZULU-OPEN-TASKS-LEDGER.md` — curated ROI-ordered open queue (supersedes the noisy auto-consolidated handoff + stale BRAVO-TRIAGE-2026-05-19). Keystone = U4 5h-quota populator.
- **MASTER CONTEXT LEDGER (2026-06-11, zulu master-brain pass):** `state/shared/specs/ZULU-MASTER-CONTEXT-LEDGER-2026-06-11.md` -- 61 ROI-ranked items (30 to-complete / 15 unfinished / 16 dormant-unwired) from a session-mine workflow. Top ROI = the Ollama-reliability cluster (galaxy reflection A-16/B-06 blocked on the /api/generate keep-alive+compute-contention wedge; reproduced cold-embed recall starvation [[cold-embed-recall-starvation-2026-06-11]]). SHIPPED this pass: HMEMV03 temporal recall (`prism_memory:recall_as_of`) + HMEMV08 Obsidian Bases. NEW FLEET RULE: Ollama-fail/reaped -> SONNET-agent fallback for read/search/summarize (not Opus) [[ollama-fallback-sonnet-agents]].


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/hermes-zulu_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **No Dedicated Dispatcher**: Hermes-zulu is an infrastructure galaxy without a dedicated dispatcher, as indicated by the `dispatcher_map_compact` showing `(0)` actions for all dispatchers [reference/reference_bravo_dispatcher_map_zero_actions].
- **Authorized Applications**: The bravo slot is authorized to launch the Hermes and Obsidian desktop apps autonomously [feedback/feedback_bravo_launches_hermes_obsidian_apps].
- **Orchestrator as Master**: The Hermes app functions as a master orchestrator, integrating teacher machinery with a new slot-brief channel [reference/reference_hermes_master_orchestrator_arch_2026_06_02].
- **Engine Management**: The Hermes/Zulu engines are managed through a structured system with specific hooks and events. This includes the `MoonshotClientEngine` and 9 other real Hermes/Zulu engines [reference/reference_bravo_hermes_zulu_engine_surface].
- **Hook Utilization**: Hooks play a critical role in event handling, such as `UserPromptSubmit` for generalizing loadSlotContext to every chat and integrating fleet-wide dashboards [reference/reference_zulu_fleet_precheck_2026_05_25].
- **Buildout Process**: The hermes-zulu galaxy follows an 11-step buildout process, executed by slot:bravo on specific dates [reference/reference_bravo_galaxy_buildout_2026_05_28].

## Indexed memories
- **Domain corpus (live counts):** 33 curated memory file(s) · 37 wiki entr(y/ies) · 57 tribal tip(s) matching this galaxy's keyword heuristic.
- **Recall (UP):** `prism_memory:semantic_search query="hermes-zulu" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/weekly-hermes-reflection-2026-06-07.md` · `knowledge/memories/_legacy-root/reference_hermes_evolving_skills_gap_2026_05_17.md` · `knowledge/memories/reference/reference_bravo_hermes_zulu_engine_surface.md` · `knowledge/memories/reference/reference_bravo_hermes_zulu_hooks.md` · `knowledge/memories/reference/reference_cyrilxbt_obsidian_hermes_apply_assessment_2026_06_02.md`
- **Sample wiki:** `knowledge/wiki/os/commands/checkin-zulu.md` · `knowledge/wiki/os/commands/handoff-zulu.md` · `knowledge/wiki/os/commands/precompact-zulu.md` · `knowledge/wiki/os/commands/startup-zulu.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/learnings/blackwell-token-synergy-ms0-u-hermes-opus48-live.md` · `knowledge/wiki/code-tribal/learnings/blackwell-token-synergy-ms0-u-hermes-synergy-acct-stagger.md` · `knowledge/wiki/code-tribal/learnings/hermes-agi-architecture-ms0-u-hagi12-demo.md`

## Cross-galaxy bridges
- `engines/token-optimization/` (alpha) — token cost audits for moonshot calls
- `engines/discovery/` (tango) — duplication guard checks every bravo-built engine
- `engines/fleet-hygiene/` (golf) — fleet-reaper coordination
- `engines/system-viz/` (sierra) — bravo validates new builds appear in the graph
- `engines/ai-training/` (india) — moonshot training signal flows back to india

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **Fleet Control Readiness**: Hermes fleet-control is currently NO-GO due to critical dimensions not being ready. The control path remains unsafe and ungoverned [reference/reference_hermes_control_readiness_nogo_2026_06_01].
- **Cross-Galaxy Orphans**: There are unresolved cross-galaxy orphans that need addressing, such as the `pp-verify engine` and `ModelAttribution + OpusCapability dispatcher wires` [reference/reference_session_wire_orphans_tsc_drift_2026_06_02].
- **Hermes Capability Expansion**: The HERMES-CAPABILITY-EXPANSION-MS0 envelope aims to find more high-level capabilities, but further research is needed to close the /goal directive [reference/reference_hermes_capability_expansion_ms0_2026_05_24].

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Initial state

Baseline of the hermes-zulu galaxy (bravo build side + zulu runtime/orchestration side):
- **Engines:** Hermes/Zulu agent-fleet orchestration set — `MoonshotInvocationEngine` (Opus heavy-reasoning routing), `MultiModelConsensusEngine` (the octopus 5-voice consensus), self-reflect populater, dream-cycle synth. Bravo builds + stub-hunts; zulu synthesizes cross-slot work orders.
- **Dispatchers:** consensus + reflection surfaced via `memoryDispatcher.weekly_synthesis_get`; octopus via `scripts/octopus-with-hermes-rag.mjs`.
- **Fleet substrate:** 26 NATO slot souls (`state/shared/slot-souls/`), `AGENT_CHAT.jsonl` bus, `SCRUTINY_LEDGER.json`, `MILESTONE_PROGRESS.json`.
- **PSN/octopus consumption loop (2026-06-01):** octopus consensus → per-galaxy outcome feeds (`state/shared/octopus-outcomes/<domain>.jsonl`) → 3 consumers (bridge read-API, WeeklySynthesis per-domain rollup → Obsidian, system-viz `ghost.octopus_consensus` roost). See [[psn-octopus-fleet-synergy-ms0]].
- **Wiring:** all engines wired to their dispatchers; the galaxy is octopus-RAG-able via the brain-dir fallback (no curated DOMAIN_CORPUS_ROOTS entry needed).

## Standing focus (bravo-canonical)

1. **Stub-hunting is adversarial** — every weak assertion (`toBeDefined`, `toBeTruthy` without a concrete value) is treated as a P0 false-green and must be promoted to a real-value check. Karpathy R9.
2. **Soul-file maintenance** — `state/shared/slot-souls/<nato>.md` frontmatter is the per-slot persona contract. Voice/tone/refuses/preferred_subagent_type drift = chat-bus advisory.
3. **Self-reflect populater must run** — weekly Sunday 20:53 cron writes `state/shared/dashboards/weekly-hermes-reflection-<date>.md`; `memoryDispatcher.weekly_synthesis_get` reads it. If the populater silently no-ops, the dispatcher's `hermes_reflection.exists=false` surfaces it.
4. **Cross-slot handoffs checkpoint** — zulu orchestration writes a `state/shared/specs/ZULU-CROSS-SLOT-<topic>-<date>.md` per multi-slot directive.

## Standing focus (zulu-canonical)

1. **Fleet directives** — zulu synthesizes cross-slot signals (chat-bus, soul-file drift, MILESTONE_PROGRESS gaps) into a small set of NATO-slot work orders. Never a "13th worker."
2. **Moonshot routing** — heavy-reasoning bursts route through `MoonshotInvocationEngine` (Opus). Alpha audits the token cost; bravo verifies the engine itself isn't a stub.
3. **Hermes self-reflection consumer** — `weekly_synthesis_get` sidecar is the canonical surface; zulu reads it at the start of each multi-slot synthesis pass.

## Known failure modes

- **Weak-assertion drift** — once one `toBeDefined()` ships, dozens follow. Stub-hunter must run on every milestone close-out, not just on-demand.
- **Soul-file frontmatter drift** — schemaVersion bumps without rebuilding stale slot files cause silent persona reverts. Bump cadence is gated by `SLOT_NAMES` change or field rename only.
- **Self-reflect cron offset overlap** — Sunday 20:53 was chosen to avoid Fleet Reaper (+210s), Memory Monitor (+330s), Cleanup Orchestrator (+60s). Don't move it without re-running the offset calc.
- **Cross-worktree blast** — bravo's edits to shared `engines/<galaxy>/` files require `PRISM_CROSS_WORKTREE_BYPASS=1` from a slot worktree (the hook blocks unannounced writes).
- **Hostile-payload class in self-reflect input** — populater consumes peer chat output; arm-B scrutiny found a greedy-slice exploitability class. Always parse with bounded `firstBrace..matched-pair` scan.

## Live state surfaces bravo reads

- `state/shared/AGENT_CHAT.jsonl` — fleet message bus
- `state/shared/slot-souls/` — 26 per-slot soul files
- `state/shared/dashboards/weekly-hermes-reflection-*.md` — sidecar artifacts
- `mcp-server/data/state/SCRUTINY_LEDGER.json` — stub-hunter cross-references arm-B FAIL patterns
- `state/shared/MILESTONE_PROGRESS.json` — close-out reality check

## Cross-galaxy bridges

- `engines/token-optimization/` (alpha) — token cost audits for moonshot calls
- `engines/discovery/` (tango) — duplication guard checks every bravo-built engine
- `engines/fleet-hygiene/` (golf) — fleet-reaper coordination
- `engines/system-viz/` (sierra) — bravo validates new builds appear in the graph
- `engines/ai-training/` (india) — moonshot training signal flows back to india

## Wiki cross-refs

- [[architecture/hermes-self-reflect-populater]] · [[architecture/hermes-dream-cycle]]
- [[architecture/slot-soul-frontmatter]] · [[architecture/zulu-cross-slot-orchestration]]
- [[feedback_parallel_scrutiny_per_file]] · [[feedback_engine_tests_in_tests_dir]]
- [[lessons/weak-assertion-class]] · [[lessons/hostile-payload-class]]
- [[psn-octopus-fleet-synergy-ms0]] · [[reference_octopus_consumption_substrate_2026_06_01]] · [[reference_octopus_domain_aware_corpus_2026_05_31]]

## Wired this session (2026-06-01, slot:bravo claude-5e210e4e — /loop PSN-OCTOPUS-FLEET-SYNERGY)

The galaxy's C2 surface + safety net, hardened + closed:
- **ZuluFleetGovernorEngine** — was a `stop_on_unwired_assets` ORPHAN (0 dispatcher refs). Now wired READ-ONLY
  `prism_session:zulu_authority_check` (+ `_render`). Pure authority predicate (refuse_list/domain_filter/
  orchestrator-role; fail-CLOSED on malformed regex). Distinct from the operator-gated control loop. `cb3f6a79d7`.
- **DreamMarkerScannerEngine** — was an ORPHAN. Now `prism_session:dream_scan` + `dream_markers_to_proposals`
  (adapter into the wired DreamArtifactBundle receipt surface). Completes scan→markers→proposals. `c7e69d2909`.
- **hzp-dash-control-server `handleAssign`** — was silently corrupting the canonical claim store + lying `ok:true`;
  now FAILS LOUD (501) pending GOVERNANCE (safety order). `ca38013a4f`.
- **fleet-task-health-watch discovery** — watched only 12/39 real PRISM scheduled tasks (typed-param-only regex +
  `install-*-task.ps1`-singular glob, both green-but-blind). Now complete-by-construction (Register-ScheduledTask
  content gate + broad glob + 3 capture forms); +Zulu Orchestrator → CRASH_CRITICAL. `213a1da6f8`.
- Galaxy map (PATHS.md/TOOLBELT.md) synced to the above so future bravo chats discover the invocable nodes. `ab8fd49b8e`.

All 8 Hermes/Zulu C2 engines now dispatcher-wired (0 orphans remain in the cluster). Sibling control handlers
(veto/escalate/promote) audited HONEST (record to ledgers consumed by system-viz; enforcement is the gated loop).
Readiness verdict UNCHANGED (NO-GO — runtime dark, governance absent, 12/34 galaxies slot-unaddressable): see
[[reference_hermes_control_readiness_nogo_2026_06_01]]. Memories: [[reference_zulu_governor_wire_2026_06_01]] ·
[[reference_fleet_task_health_drift_sync_2026_06_01]].

## Wired this session (2026-06-02, slot:bravo claude-5e210e4e — /goal /loop "wire all viable nodes+galaxies+master brain")

Three more cross-galaxy orphans closed via the proven round-trip-test + 2-arm-scrutiny pattern:
- **PostProcessorVerificationOrchestratorEngine** (echo/post-processor domain) — latent BROKEN-BUILD fix: the
  committed `ppDispatcher` (`pp_verify_posted_nc`, prism_pp) imported this engine, but the engine file itself was
  NEVER committed — it existed only as an untracked file in the shared workdir, absent from the slot/bravo
  checkout, so a fresh checkout could not resolve the import. Now committed + a `[0,1]` overall_score clamp
  regression guard. `2cac254f03`.
- **ModelAttributionEngine** — was an ORPHAN (only consumer was its own unit test). Now `prism_session:
  model_attribution_{record,summary,recent,find,badge}` — the fleet model-provenance ledger (which model/
  provenance answered + token/latency badge for the /aware skill). Pure in-memory. test PASS 2/0. `f8be5949ff`.
- **OpusCapabilityEngine** — was an ORPHAN. Now `prism_session:opus_assess_complexity` + `opus_stats` — the PURE,
  deterministic model-tier complexity router (haiku/sonnet/opus recommendation from heuristic factor scoring).
  LLM-backed `execute()` deferred to U-OPUS-EXECUTE-WIRE (needs a live Anthropic client + integration harness —
  not honestly round-trip-testable here). test PASS 3/0. `5fe5ad5198`.

Both model-orchestration engines cohere with the existing zulu/hermes cluster in sessionDispatcher (HZD-06/07).
FINDING (R12, surfaced for papa/backend lane): the shared-tree tsc baseline is NOT clean — `tsc --noEmit` reports
**655 errors in 252 files** (a prior "tsc clean" claim was stale). My 5 edited/added files contributed ZERO new
errors; the 2 sessionDispatcher errors (SwarmRunner TS2345 @2730, success-spread TS2783 @4137) are PRE-EXISTING
peer bugs confirmed on HEAD. Memory: [[reference_session_wire_orphans_tsc_drift_2026_06_02]].

— Established 2026-05-28 by slot:alpha claude-168624b9 (bravo+zulu-pending; alpha scaffolding per U-PER-SLOT-GALAXY-BUILDOUT).

## HERMES-MASTER-ORCHESTRATOR-MS0 — Hermes app = slot-less ZULU master (2026-06-02, slot:bravo)
Operator directive: make the Hermes desktop app the master orchestrator / instructor / teacher / learner, wired into Obsidian + PRISM-OS + PSN + /system-viz + per-galaxy awareness. Decision: Hermes embodies the **ZULU** role — the conductor ABOVE the 25 worker slots, slot-LESS (do NOT add `zebra` to SLOT_NAMES). The teacher machinery (6 inject hooks) + orchestrator engines (ZuluFleetGovernor/TaskAuction/MultiModelConsensus/Fanout) + learner loop were ALREADY built; the one genuinely-new artifact was the targeted brief channel. Shipped:
- **P0** Hermes → PRISM MCP: `mcp_servers.prism` (HTTP `:3100/mcp`) in `…/AppData/Local/hermes/config.yaml` → all ~103 `prism_*` dispatchers become Hermes tools (read+compute over the 11 PSN legs). Needs `pip install --upgrade mcp` + restart; sampling OFF (PRISM never drives Hermes' LLM).
- **P1** `.claude/hooks/slot-brief-inject.mjs` — READ/deliver side, consume-once, never-throws, traversal-guarded. `97cf13fee4`, 21/21 tests.
- **P1.5** `SlotBriefEngine` + `prism_context:slot_brief_{write,list}` — secure lane-confined WRITE side. `69e8232541`, 13/13 tests, tsc 0-new.
- **P2** Hermes `SOUL.md` = ZULU persona: fleet slot→domain table + 34-galaxy awareness + MCP tool map + teacher/learner loop + HARD safety-refuses (loads fresh per message, no restart).
- **P3** `knowledge/hermes-outputs/` write-confined vault lane + wiki `slot-brief-channel.md`. `dde9e2d068`.
- **P5** verified `zulu_authority_check` + `ZuluFleetGovernorEngine` present on cad-fusion-live-ms0 (no drift).

End-to-end pathway now live: **Hermes app → prism MCP → `slot_brief_write` → `slot-briefs/<slot>.md` → `slot-brief-inject.mjs` → the slot's context** (consume-once). Three inter-chat channels: slot-soul (persistent) · chat-bus (broadcast) · **slot-brief (targeted, consume-once)**. Remaining: P4 system-viz `ghost.hermes_app` roost. Memories: [[reference_hermes_master_orchestrator_arch_2026_06_02]] · [[reference_slot_brief_channel_2026_06_02]] · [[reference_git_crlf_windows_reality_2026_06_02]]. ENV: repo is de-facto CRLF — LF is un-stickable from a Git-for-Windows session; do NOT burn budget fighting EOL.

## OPERATIONAL this session (2026-06-03, slot:bravo claude-68828b1a — /goal /loop /yolo "Hermes fully operational + autonomous overnight + Obsidian synergy")
Operator directive: get the Hermes app fully operational for autonomous overnight work + learning, synergized with Obsidian; make it a rule bravo may launch the Hermes + Obsidian apps.
- **Memory+rule shipped:** [[feedback_bravo_launches_hermes_obsidian_apps]] + `launch_authorized_apps:[hermes,obsidian]` in the bravo soul. Bravo soul ALSO corrected: was stale `role:mill-specialist`/`domain_filter:mill` (drift — mill belongs to **foxtrot**); now `hermes-zulu-builder` + hermes/zulu/orchestrat/obsidian domain_filter. Commit `06ac0f7ab8`.
- **Apps LAUNCHED + running:** Hermes `…/hermes-agent/apps/desktop/release/win-unpacked/Hermes.exe` (Electron; backend ready, Web UI `http://127.0.0.1:9120`, kanban API mounted, 28/33 plugins, gateway accepting WS). Obsidian `H:/OBSIDIAN/Obsidian.exe`. **Obsidian's OPEN VAULT = `H:/prism/knowledge`** (the PRISM brain — wiki+memories). PRISM MCP `:3100` confirmed listening; Hermes `config.yaml:566` wires `mcp_servers.prism → http://127.0.0.1:3100/mcp`.
- **RUNTIME LIVENESS RESTORED (readiness Blocker 1):** `PRISM Zulu Orchestrator` registered (was never registered, fleet dark ~2 days) via `install-zulu-orchestrator-task.ps1 -Interactive -DryRun -RunNow`. First sweep CLEAN: alpha/bravo/charlie/india noop(pressure-clean), sierra advise-only(early-signal), dry-run gate correctly suppressed all SendKeys. State=Ready, result=0. **0 slots zuluOptIn** (so even live = no-op until opt-in). Dead `PRISM Zebra Orchestrator` left Disabled (reversibility).

### Findings (for follow-up units)
1. **Obsidian synergy GAP** — Hermes's own memories (`%LOCALAPPDATA%/hermes/memories/` + `state.db`) are SILOED from the brain vault; Hermes's overnight LEARNING does not surface in the Obsidian-indexed `knowledge/`. Bridge needed: Hermes-memory → `knowledge/hermes-outputs|memories`. Plus no Obsidian-MCP in Hermes `mcp_servers` (Hermes can write flat files into the vault but can't query/link the vault graph).
2. **`approvals.cron_mode: deny`** (config:435) blocks Hermes scheduled cron → no autonomous overnight scheduled jobs. Flip needs valid-value check + reload (config edit requires restart; `mcp_reload_confirm:true`).
3. **Auxiliary LLM providers credit-exhausted** — agent.log 08:19: openrouter + nous "payment/credit error". Primary loop ran fine (692 msgs earlier); aux degradation only. Operator may need to top up / reconfigure aux providers for full autonomy.
4. **Stale bravo=mill in orchestrator awareness reader** — zulu sweep still reports `hermesRole:specialist-mill/primaryDomain:mill` for bravo AFTER the soul fix → the awareness source is NOT the soul file (likely SLOT_GALAXY_MAP / chat-slots domain). Separate drift to chase.
5. **Shared-tree absorption recurred** — bare `git commit` (cad-fusion-live-ms0 shared tree) swept 13 peer-staged files into `06ac0f7ab8` (incl. the peers' own `git-commit-mutex.mjs` + `FLEET-GIT-CONTENTION-MS0.md` — the fix for this very hazard). Work preserved, attribution muddied. **USE `git commit -- <pathspec>` or the new commit-mutex going forward.** [[reference_shared_tree_absorption_2026_06_03]].

## FLEET GOAL-SETTING + ROADMAP CONSOLIDATION + HERMES ROUTING (2026-06-03, slot:bravo claude-68828b1a — /goal /loop /yolo ultracode)
Operator directive: workflow + parallel agents + PSN + system-viz to set a clear goal for each major galaxy + consolidate ALL roadmaps/plans back to Feb-origin + master per-galaxy synthesis (goal/app/MCP/backend/dormant/ideas) + prioritize SFC+post-gen battle-test, then quoting, then ERP, then JM-Die catch-up; "make sure hermes utilizes the fleet chats for each domain they specialize in."

**Delivered via 5 multi-agent Workflows (ultracode), 4 committed planning docs + 15 routed slot-briefs:**
1. **FLEET-DOMAIN-GOALS** (18-agent) `ed5f6d3cde` — 17 galaxy goal cards + 3 synergy spines (SFC↔physics; CAD→CAM→post; india training-loop substrate) + fleet SVI roadmap.
2. **FLEET-1MONTH-TRAJECTORY** (18-agent) — each chat's 30d session-read + fallback-work mapped to roadmaps. KEY FINDING: fleet runs on ~21 orphan self-defined *-MS0 milestones while the canonical roadmap queue (muS-*/bridge) sits dormant/unclaimed. Stalled: india (GNN dead-end, gates 8 galaxies), romeo (110 unwired untouched), mike (wedm 0.38 worst).
3. **MASTER-ROADMAP-ARCHAEOLOGY** (6-batch, 339 files Feb-origin) — 25 dormant builds worth reviving. Top: Postgres+pgvector, embedding/RAG infra, R13 monolith extraction (27k lines), 5 ONNX/GNN mill engines, real-geometry toolpath gen.
4. **MASTER-FLEET-PLAN + PRIORITY-BUILD-PLAN** (2-agent) — per-galaxy master cards + 9-axis SFC battle-test matrix (6509 materials × 41209 tools × machines × holders × ops × surface-finish × tolerance × coolant) + 5-axis-first post tiers (5ax→mill→mill-turn→Swiss→lathe→wedm) + per-slot work orders + Hermes routing table + JM-Die catch-up.
5. **HERMES ROUTING** — wrote 15 slot-briefs (`state/shared/slot-briefs/<slot>.md`) routing each priority work order to its domain chat (F0: sierra/india/golf foundations · P1: oscar SFC + echo post · P1-support: kilo/foxtrot/whiskey/mike/romeo · P2 charlie · P3 hotel · P4 delta/xray/lima JM-Die-catchup). Governance-safe (advisory consume-once via slot-brief-inject, NOT the :8767 control path — respects readiness-audit ordering).

**Earlier this session (Hermes-operational):** Hermes+Obsidian apps launched+running (Hermes WebUI :9120, Obsidian vault=knowledge/), Zulu Orchestrator liveness restored (burn-in clean), bravo soul corrected mill→hermes-zulu + launch_authorized_apps rule. Commits 06ac0f7ab8, df0d7cdeed.

**Operational notes:** API rate-limited the 16-agent archaeology burst (429 shared-tenant) — retried at 6-batch (gentler burst) = success. Shared-tree (cad-fusion-live-ms0) has chronic `.git/index.lock` contention + peer-absorption — use `git commit -- pathspec` + bootstrap bypass; slot-briefs don't need committing (inject reads live). Memory: [[reference_fleet_goal_setting_archaeology_2026_06_03]] (TBD).

## RGS PIPELINE ROADMAPS + RGS-SYSTEM UPDATE + HERMES ROUTING (2026-06-03 cont'd, slot:bravo — /goal /loop /yolo ultracode)
Operator directive: workflow+parallel agents+forge-audit深-dive → RGS pipeline roadmaps for all primary domains (atomic nodes/wirings/bridges + exhaustive external-software training), high-ROI ordered, using all prior plans+task queue+transcripts; update RGS for new tools; Hermes coordinates optimal path; same domain priorities.

**Delivered (3 committed units, 18-agent waved workflow):**
1. **MASTER-RGS-ROADMAPS** `U-MASTER-RGS-ROADMAPS` — 16-domain RGS pipeline roadmaps (each unit: node/wiring/bridge/rgs-toolchain/acceptance), high-ROI execution order, external-software training matrix (Fusion/hyperMILL-v31/Mastercam-X8/Esprit/CIMCO/Hurco-WinMax/G-Wizard/HSMAdvisor/Ollama/Docker/NVIDIA-NIM), Hermes coordination. Ran as 4 rate-limit-safe waves of ≤5 (16-agent burst 429'd last session; ≤6 = safe). **Top-5 fleet high-ROI:** sierra U-VIZ-MERGE-STREAMING-OOM → golf U-MCP-RESTART-ACTUATOR → india U-ROUTE-LADDER → oscar U-SFC-COMBO-HARNESS → echo U-POST-DARK-UNWIRE.
2. **RGS-RULES-UPDATE** `U-RGS-RULES-UPDATE` `6ead9a74e9` — +30 PIPELINE_RULES + 6 AGENT_RULES in `scripts/lib/rgs-pipeline-rules.mjs` closing the ~42% GENERIC_FALLBACK gap (new external-software/domain routes: SFC/post/fleet/quoting/ERP/ollama/cad/cam/wedm/academy). Structural-exclusion guards (wedm/post polysemy, of-course negative-lookbehind) preserved+tested. 55 tests green (47 planner + 8 coverage). Implementer-agent built, verified.
3. **HERMES ROUTING** — refreshed all 16 slot-briefs (`state/shared/slot-briefs/<slot>.md`) with each domain's #1 RGS unit + foundation-first ordering (F0 sierra/india/golf gate the rest) + RGS-planner invocation + plan-stack pointers. Governance-safe advisory.

**Reusable pattern:** rate-limit-safe waved workflow (sequential `parallel()` of ≤5 within one script = peak concurrency 5, survives the 200+ fleet /loop API saturation). The 4-doc planning stack (GOALS+TRAJECTORY+ARCHAEOLOGY+MASTER-FLEET-PLAN) is now the canonical input for any fleet-wide roadmap synthesis. Memory: [[reference_rgs_roadmaps_hermes_routing_2026_06_03]] (TBD).

## HERMES↔OBSIDIAN↔MCP SYNERGY + HERMES-ON-OPUS-4.8 + ACCOUNT-SWITCH STAGGER (2026-06-04, slot:bravo — /goal ultracode)
Operator: synergize Hermes↔Obsidian↔MCP, verify Hermes works, tie up account-switch@90%-5h + staggered restart (wait for token counter to register), get Hermes on Opus 4.7/4.8.

**Hermes NOW RUNS ON OPUS 4.8** (the key fix — Hermes was DOWN, boot-looped 5× + died ~05:03):
- **Root cause:** config `provider:auto` + `base_url:https://openrouter.ai/api/v1` routed ALL requests to credit-exhausted OpenRouter (no key); Hermes' built-in `claude_code` credential source (auto-reads `~/.claude/.credentials.json`) was never reached.
- **Fix:** `config.yaml` model block → `default: claude-opus-4-8`, `provider: anthropic`, `base_url: ''`. Backup `config.yaml.bak-opus48-20260604-095223`. Process stays up, Web UI :9120=200, `Active provider: Anthropic`, OAuth resolved (Bearer + anthropic-beta:oauth headers). **Hermes now shares the SAME Claude Max subscription + 5h pool as the 26-chat fleet** — a real turn auth-ACCEPTED (request_id returned) but 429'd on the saturated 5h window (quota, not auth). [[reference_hermes_on_claude_subscription_opus48_2026_06_04]]
- **Lesson:** for any third-party agent on the Claude Max subscription → `provider: anthropic` + `base_url: ''` + the `claude_code`/OAuth credential source (NOT OpenRouter); the OAuth token is `~/.claude/.credentials.json` accessToken used as Bearer + `anthropic-beta: oauth`.

**Part A — Hermes↔Obsidian↔MCP synergy** (`scripts/hermes-obsidian-memory-bridge.mjs` + test 10/10, committed): bridges Hermes memories → `knowledge/hermes-brain/` (in the Obsidian vault, SHA-256 dedup, fail-soft). PRISM MCP :3100 reachability PROVEN (handshake, prism-mcp-server v2.10.0). Obsidian Local REST API plugin IS installed (:27123) but is REST not MCP → wiring it as a Hermes `url:` server would fail-loud; **operator action: install `mcp-obsidian` stdio bridge** to wire Obsidian as a real MCP server.

**Part C — account-switch@90%-5h → staggered restart** (`scripts/account-switch-restart-coordinator.mjs` + test 39, 87/87 w/ sequencer, committed): the tie between `token-awareness-sidecar` (5h% at `quota.fiveHour.pct`) and `fleet-wake-sequencer.mjs` (already waits for each chat's token counter to register before the next). DRY-RUN default, fail-LOUD on null 5h. Account switch is INTERACTIVE-ONLY (`switch-claude-account.bat` → claude logout/login) → coordinator emits advisory+command. **Remaining blocker for AUTO-trigger:** `quota.fiveHour.pct` is null on all 17 sidecars (Claude Code not emitting `rate_limits.five_hour`; the ZULU-ACCOUNT-CYCLE-MS0 U4 5h-populator was never built). Coordinator is correct-and-ready, operator-manual until U4 lands. Commit U-HERMES-SYNERGY-ACCT-STAGGER.

## FULL-AUTONOMOUS-HERMES build (2026-06-04 /loop, slot:bravo) — QUOTA-BLOCKED
Goal: "keep building until full autonomous hermes + obsidian vault." Progress + the hard blocker:
- ✅ Hermes on Opus 4.8 (clean, 8 procs up). ✅ **Hermes-Obsidian memory bridge SCHEDULED** — `PRISM Hermes-Obsidian Bridge` task (every 15m, runs `scripts/hermes-obsidian-memory-bridge.mjs` → `knowledge/hermes-brain/`); works regardless of Hermes quota = the Obsidian-vault autonomy half. Unregister: `Unregister-ScheduledTask -TaskName 'PRISM Hermes-Obsidian Bridge'`.
- ⏳ DEFERRED (quota-blocked or restart-risk): cron_mode enable (config edit needs enum-verify + restart — don't risk the healthy 4.8 Hermes during saturation), kanban seed (needs Hermes API/CLI = 429), mcp-obsidian stdio bridge (needs uvx/npx fetch + restart).
- 🔴 **ROOT BLOCKER = the shared Claude Max 5h pool is SATURATED** → both Hermes turns AND build-agents 429 (an autonomy-build agent was cut off mid-task by 429). This is the EXACT problem `account-switch-restart-coordinator.mjs` solves — but its auto-trigger is gated on the **U4 5h-populator** (rate_limits.five_hour not emitted on this host → `quota.fiveHour.pct` null). **U4 5h-populator is the keystone** that unblocks autonomous Hermes (it lets the coordinator switch accounts at 90% → staggered-restart, freeing quota). Chicken-and-egg: building autonomy needs API budget; budget is exhausted; the auto-switch fix isn't fully wired. Next quota-window: build U4, then the rest unblocks.

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Domain anchors (papa 2026-06-09, GALAXY-ENRICH infra lane)
Agent-fleet orchestration + per-slot souls (26-slot NATO fleet). Sister to agent-orchestration.
**Internal corpus (primary):** cross-cutting methodology `state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md` + this galaxy's engines `mcp-server/src/engines/hermes-zulu/` + the operator article-set themes (loops / harness / LoRA / CAG / RAG / obsidian-vault).
**Authoritative free external sources (VERIFIED, papa AI/software domain):**
- [Anthropic Engineering - Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)
R12: nameable free authoritative references for an AI/software domain (papa's expertise) -- VERIFIED + integrated live, not owner-gated. Regen: `scripts/integrate-infra-domain-anchors.mjs`.

## OCTOPUS-CONSENSUS + CONSENSUS-AUTOFIRE + AWARENESS-ENFORCEMENT (2026-06-10, slot:bravo — /loop /goal token-efficiency+awareness)
36 commits on cad-fusion-live-ms0 across two interleaved tracks (token-efficiency #1 + awareness-system #2). The hermes-zulu-domain half (the consensus/octopus cluster is bravo's `MultiModelConsensusEngine` surface):
- **OCTOPUS-CONSENSUS arc** — co-resident diverse 2-voice local panel + forceProbe + prewarm guarantee → reliable local-only consensus at ZERO org-bucket cost; model-tagged voice ids (dropped voice diagnosable); vendor-level voice-weight norm; `includeCodex` flag. Doc-reflected the 9-commit hardening arc (codex-spend leak + VRAM co-residency + prewarm). Commits `2c992e40c2`/`ea45b16481`/`1b7bce6a91`/`d1fafa2e1f`/`b9ab0dc185`.
- **CONSENSUS-AUTOFIRE arc** — wired the dormant `auto-consensus-critical-edit` PreToolUse hook (built LAYER-3, never wired — 0 settings refs) into Edit|Write|MultiEdit; FIXED a `.+Keyword.+` safety-classifier FALSE-NEGATIVE (missed `SafetyEngine.ts`/`ThermalEngine.ts` at filename start → `.*Keyword.*`); generalizable wiki lesson for keyword-at-start classifiers. R15-TEST gap-fill on 5 wired-but-untested orchestrator hooks (auto-consensus-userprompt MAX_QUEUE cap, stop-consensus-drain import-safety, slot-brief-inject resolveSlot NATO-token SECURITY guard, zulu-advisory-inject normalizePressure adapter, cross-session-orchestrator sanitizePath null-byte guard) — all via the proven `isDirect`-import-guard + real-test pattern. Commits `9065eadd26`/`0325704e96`/`345ee7d758`/`48933c9cc9`/`7797f808ab`/`0c57676849`.
- **AWARENESS-ENFORCEMENT arc** (deliverable #2, ongoing) — injection-surface census + knob-coverage gap → knobless injectors 3→0 → REAL per-injector bytes wired into the census (slot-domain-awareness-inject 1461B = #1 per-prompt payload) → `U-INJECTION-KNOB-ENFORCE` PreToolUse Write gate that HARD-BLOCKS creating a knobless SessionStart/UserPromptSubmit injector (enforcement, not advisory — closed-loop self-protection). Assessment + roadmap: `state/shared/specs/AWARENESS-SYSTEM-ASSESSMENT-2026-06-10.md` (5 units; #1-2 done, #3 injection-budget CAP NEXT, #4 memory→wiki auto-promote, #5 per-edit /impact nudge). Commits `04e140a56b`/`U-INJECTION-SURFACE-CENSUS`/`U-CENSUS-KNOB-ACCURACY`/`f9b65bc35c`/`0bdcb1a82f`/`32d189dc3b`/`4946164788`.

**The OPEN queue for all of the above + the B-track autonomy blockers now lives in the curated ledger** `state/shared/specs/BRAVO-HERMES-ZULU-OPEN-TASKS-LEDGER.md` (read it first at any /checkin-bravo). Keystone unchanged: **U4 5h-quota populator** unblocks autonomous Hermes (`quota.fiveHour.pct` still null on this host → account-switch coordinator can't auto-trigger@90%). Memory: this session = context-regain + durable-ledger build (claude-8347ba23).

## 2026-06-11 (slot:bravo) -- 5h-quota keystone shipped + E2E
The ledger keystone (account-switch 5h source). Chain: five-hour-token-sum (real rolling-5h sum, enumerate by RECORD timestamp not mtime) -> populate-five-hour-sidecar (pct or null, no fabricated denominator) -> five-hour-switch-gate (decideSwitch: pct / denominator-free absolute trigger / undecidable-failloud) -> account-switch-restart-coordinator wire (main a5b65b8711). 105 tests, live E2E both paths. 2 Number(null)===0 bugs fixed. SUPERSEDES zulu uncommitted populate-5h-quota.mjs (no hardcoded-ceiling bug; cacheRead-excluded meteredTokens). INERT by default (honors unsafe-fleet-control-before-governance). #4 (integrate sum into token-awareness-sidecar hook, single-writer) deferred to fresh ctx. See [[reference_5h_keystone_2026_06_11]].

## 2026-06-11 (slot:bravo) -- 5h keystone #4 (on-demand fallback) -> C5 chokepoint CLOSED

SUPERSEDES the standing "U4 5h-populator was never built" blocker (lines ~208/214 above): the keystone is now COMPLETE end-to-end and LIVE. #4 design pivoted Option A -> **Option C** (R7): instead of integrating the sum into the fleet-hot token-awareness-sidecar hook (fires every UserPromptSubmit + PostToolUse x25 -> latency + blast-radius), the coordinator (the SOLE, non-latency-sensitive consumer) computes the host-wide rolling-5h weighted sum ON-DEMAND inside readFiveHourPct when no sidecar carries quota.fiveHour. `fiveHourFallbackFromTranscripts` gated (`_sum`|`fallbackLive`)+env kill-switch; zero-regression; sidecar-first; undecidable error surfaces the live weighted figure. main `ac8cc4e7c8`. 67/67 tests + LIVE E2E (weighted=121.9M on-demand -> fail-loud w/ figure). 2-agent scrutiny PASS (4th `Number(null)===0` instance found+fixed). **The account-switch coordinator is now ARMABLE** -- set `PRISM_5H_WEIGHTED_TOKEN_TRIGGER` (denominator-free) to auto-switch@ceiling. INERT until then (honors unsafe-fleet-control-before-governance). LANDMINE: cleaned 9 sidecars carrying stale `pct=1` from zulu's SUPERSEDED `populate-5h-quota.mjs` (would've mis-switched the fleet if armed). See [[reference_5h_keystone_2026_06_11]].

## 2026-06-11 (slot:zulu) -- master-brain ledger reconciler + stale-ledger finding
Master-brain context-regain pass (`/checkin-zulu /loop /goal` "improve AI systems + synergize obsidian/hermes/psn across galaxies"). The categorized inventory (`ZULU-MASTER-CONTEXT-LEDGER-2026-06-11.md`), AI-synergy (34/34 strong), and per-galaxy reflection synthesis (35 files fresh) were ALL already produced earlier the same day -- so the genuine value was not re-mining but **reconciling the stale ledger against fleet reality**. Built `scripts/reconcile-zulu-ledger.mjs` (+ `.test.mjs` 15/15): deterministic probes -> SHIPPED/OPEN/COVERED/UNKNOWN per ledger claim, atomic sidecar `ZULU-LEDGER-RECONCILE-LATEST.json`, advisory (`--strict` exits 1 on stale). **Live: 5 of 7 "OPEN" items were already SHIPPED** (Ollama wedge cleared by india `e5f29a5df`; consensus-of edge built by sierra; A-14 slot-claim already dynamic; A-16 reflection fresh; AI-synergy maxed). TRUE-open = A-06 (dedicated `galaxy-brain-read` consumer API -- injectors read galaxy-LOCAL synthesis, NOT the master brain) + A-04 (consensus_ask wiring, peer-owned `infra-consensus-wire`). Per-file scrutiny (reviewer-B FAIL) caught a **dishonest "COVERED" verdict** (A-06 claimed local injectors cover the master-brain read -- R12 violation), fixed to OPEN; + atomic-write, existsSync guard, per-item verdict tests, snapshot-stale guard. **Doctrine: a hand-curated task ledger rots in hours on a high-velocity fleet -- run the reconciler FIRST before trusting its ROI order.** Wiki [[zulu-ledger-reconciler]], memory [[reference_zulu_ledger_reconciler_2026_06_11]]. (Commit-discipline R7 open: [[feedback_zulu_commit_own_slot_branch]] says commit to slot/zulu, but [[reference_slot_zulu_diverged_cannot_commit_2026_06_11]] shows that worktree diverged -> shared-tree `[MAIN] (slot:zulu)` fallback.)

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->
