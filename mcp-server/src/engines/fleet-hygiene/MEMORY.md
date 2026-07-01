# GOLF Galaxy Memory — Fleet Hygiene + Reaper + MCP Server

Cross-session memory for the **golf** slot (position 7 of 26 NATO, `alpha..zulu`). Golf is a full work slot that ALSO owns fleet-reaper duty (ownership moved alpha→golf 2026-05-16, [[feedback_golf_owns_reaper]]). Append-only — older entries collapse to `state/shared/MEMORY-RECENT.md` per the central `MEMORY.md` size discipline.

## Master-brain link
> Galaxy brain for domain **fleet-hygiene**. Modeled on the alpha exemplar `engines/token-optimization/MEMORY.md` — the fleet-wide `MASTER-BRAIN-TEMPLATE.md` referenced in the master index is **not present on this branch** (verified 2026-05-29), so the exemplar is the live pattern.
- **UP (pull from master):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="fleet reaper orphan zombie chat-slot hygiene rate-limit" topK=20`
- **DOWN (push to master):** write `reference_golf_<topic>.md` → `C:/Users/wompu/.claude/projects/H--prism/memory/` → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs` every Stop.
- **MASTER-INDEX edge:** master `MEMORY.md` `### Galaxy brain back-pointers` carries the `[galaxy:fleet-hygiene] …` row (added 2026-05-29).
- **Last master-sync:** 2026-05-29


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/fleet-hygiene_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **Ancestry Confirmation:** Processes should only be reaped if they are confirmed orphans; a process whose immediate parent is the node launcher wrapper (`claude.exe`) is considered live and not an orphan [feedback/feedback_golf_ancestry_orphan_reaping].
- **Slot Ownership Transfer:** The chat slotted into `golf` now owns the fleet reaper, unifying fleet-hygiene operations under one slot. This supersedes previous rules where different slots managed different aspects of fleet hygiene [feedback/feedback_golf_owns_reaper].
- **Reaper Consolidation:** Multiple orphan reapers are being merged into a single canonical Fleet Reaper with additional tiers to handle different types of orphans more effectively [reference/reference_fleet_monitor_consolidation_plan_2026_06_04].
- **Path Usage:** Scripts and tools should use absolute paths (`H:/prism`) instead of relative paths to avoid issues related to the current working directory (CWD) [reference/reference_golf_worktree_glob_gotcha].
- **Orphan Process Management:** Multiple references emphasize the importance of correctly identifying and reaping orphan processes. The key is to ensure that only confirmed orphans are reaped, avoiding termination of live chat MCP servers [feedback/feedback_golf_ancestry_orphan_reaping].
- **Slot Ownership & Consolidation:** There is a trend towards consolidating fleet-hygiene operations under a single slot (`golf`). This includes the ownership of the fleet reaper and the consolidation of multiple orphan reapers into one canonical Fleet Reaper [feedback/feedback_golf_owns_reaper], [reference/reference_fleet_monitor_consolidation_plan_2026_06_04].
- **Reaper Enhancements:** The fleet reaper has undergone several enhancements, including memory pressure gates, critical ballast, and service auto-restart mechanisms. These improvements aim to make the reaper more robust and autonomous [reference/reference_fleet_reaper_tier1_2026_05_17], [reference/reference_fleet_reaper_autonomy_robust_2026_05_16].

## Indexed memories
- **Domain corpus (live counts):** 138 curated memory file(s) · 125 wiki entr(y/ies) · 181 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 10 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="fleet-hygiene" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/_legacy-root/feedback_alpha_owns_reaper.md` · `knowledge/memories/_legacy-root/feedback_fleet_design_10_chats.md` · `knowledge/memories/_legacy-root/feedback_golf_owns_reaper.md` · `knowledge/memories/_legacy-root/feedback_hook_process_hygiene.md` · `knowledge/memories/_legacy-root/reference_bash_orphan_cleaner_wired_2026_05_16.md`
- **Sample wiki:** `knowledge/wiki/software-engineering/fleet-coordination-discipline.md` · `knowledge/wiki/software-engineering/slot-worktree-playbook.md` · `knowledge/wiki/reference/reference-fleet-reaper-ms2-2026-05-18.md` · `knowledge/wiki/reference/reference_fleet_reaper_ms3_2026_05_19.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/fleet-debug-playbook.md` · `knowledge/wiki/code-tribal/learnings/autocompact-autonomous-ms0-u-aam03-slot-signature.md` · `knowledge/wiki/code-tribal/learnings/backend-dev-loop-u-reaper-coord-noise.md`

## Cross-galaxy bridges
- **All 26 slots** — golf reaps their orphaned `node`/`bash`/`git` children + names which chat to `/compact`.
- `engines/token-optimization/` (alpha) — golf's rate-limit + injection-bloat findings feed alpha's efficiency hunting; alpha consumes fleet-reaper telemetry for token-waste hotspots.
- `engines/hermes-zulu/` (bravo/zulu) — agent-fleet orchestration; golf detects crashed chats + reaps their subagent processes.
- **sierra (system-viz)** — golf queries the system-graph for orphan/utilization classification (no galaxy dir registered yet).

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **Reaper Guardian False Negatives:** The reaper-guardian banner sometimes emits "not-registered" even when tasks are confirmed as scheduled. This issue needs further investigation and resolution [reference/reference_reaper_guardian_false_negative_2026_05_26].
- **Fleet Task Health Drift:** There is a discrepancy in the fleet-task-health-watch where it misses some registered PRISM scheduled tasks. A multi-stage fix is being implemented to address this issue [reference/reference_fleet_task_health_drift_sync_2026_06_01].
- **MCP Boot Grace Dormant Wiring:** The boot-grace flap-prevention mechanism in the MCP server is built but dormant, requiring activation and proper wiring into the reconnect hook's spawn process [reference/reference_mcp_bootgrace_dormant_wiring_2026_06_04].

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## High-ROI memories
- ⭐ [[reference_golf_inventory_of_record_2026_06_11]] — **the categorized inventory of record** (todo/unfinished/dormant-unwired/articles + ROI queue + 6 india/zulu AI-systems improvements). Read before `/pick`. Handoff-mine appendix: `state/shared/specs/GOLF-CONTEXT-INVENTORY-2026-06-11.md`.
- ✅ [[feedback_reapers_disabled_2026_06_11]] — **RESOLVED 2026-06-11**: both node-reaper paths hardened (cmdline-allowlist via shared `DEFAULT_PRISM_WORKER_PROTECT_REGEX`) so legit idle fleet node.exe is never reaped; knobs cleared to `0`. Commits `de66545dbe`+`1b49790a70` (fleet-reaper-sweep, 44/44) + `8ee957e6ee` (node-orphan-cleaner, 10/10, live 50/53 protected). Reaper RE-ENABLED.
- [[feedback_golf_ancestry_orphan_reaping]] — reap only ancestry-confirmed orphans; the MCP-zombie false-positive
- [[reference_golf_worktree_glob_gotcha]] — CWD=worktree, galaxy/state in main tree; use absolute `H:/prism` paths
- [[reference_golf_schtasks_via_powershell]] — query scheduled tasks via PowerShell, not Bash `/Query`
- [[reference_golf_ollama_coldload_stall]] — `/api/chat` mmap cold-load stall from `H:` (not VRAM)
- [[reference_fleet_rate_limit_diagnosis_2026_05_29]] — effortLevel:xhigh fleet-wide → ultracode fan-out → org rate-limit
- [[reference_golf_galaxy_buildout_2026_05_29]] — this buildout record + deferred items
- [[reference_fleet_memory_monitor_2026_05_16]] · [[reference_fleet_task_health_ms0_2026_05_17]] · [[reference_fleet_reaper_ms2_2026_05_18]] — fleet watchdog history
- [[reference_monitor_persistent_unreliable]] — in-session Monitor tail drops under pressure; the scheduled task is the load-bearing layer

## Domain (golf-canonical, from `H:/CHAT-SLOT-DOMAINS.md`)
> "Fleet reaper (MUST KEEP RUNNING AT ALL TIMES) — zombie/orphan node sweep (bash, git, read, grep, search, taskkill)."

Golf is the 26-chat fleet's **process janitor + GPU/Ollama coordinator + service-health watchdog + fleet-config doctor**. NOT feature work — the job is keeping the fleet alive and lean. Universal gates still bind golf (per-file scrutiny, 3-of-3 Stop, never-delete-only-disable, never-soften-gates).

## Standing focus (golf-canonical)
1. **Fleet reaper** — ✅ **RE-ENABLED + HARDENED 2026-06-11** (knobs `PRISM_FLEET_REAPER_DISABLE`/`PRISM_GOLF_GUARDIAN_DISABLE` = `0`). Both node-reaper paths now gate on the shared `DEFAULT_PRISM_WORKER_PROTECT_REGEX` cmdline-allowlist so a legit idle/detached fleet worker (miner/sidecar/pipeline, RSS~0) is never reaped: `fleet-reaper-sweep.findStaleOrphanedNodes` (`de66545dbe`+`1b49790a70`) + `node-orphan-cleaner.isProtected` (`8ee957e6ee`). `PRISM Fleet Reaper` scheduled task = State:Ready (S4U, 5-min, +210s); the durable task may need elevated `install-fleet-reaper-task.ps1 -RunNow`. Other reaper tasks (Zombie Reaper v2, Orphan Process Reaper PS, Cleanup Orchestrator, bash-orphan-cleaner) NOT yet audited for the same cmdline-allowlist — follow-up.
2. **Memory monitor + critical-pressure compact nudge** — `PRISM Fleet Memory Monitor` task (5-min cadence, +330s phase offset). Names the largest `claude.exe` tree when critical → `critical-memory-compact-nudge.mjs` targets `/compact` at that ONE chat.
3. **Task-health watchdog** — `fleet-task-health-watch.mjs` audits all 8+ `PRISM *` scheduled tasks; advisory-only, NEVER auto-restarts the Docker daemon.
4. **MCP server lifecycle** — daemon at port 3100. If `mcp__prism_*` tool calls fail, restart via `mcp-server/scripts/ollama-docker-launcher.mjs --services=mcp`.

## Owned assets (verified on disk 2026-05-29)
### The reaper — load-bearing layer
- `scripts/fleet-reaper-sweep.mjs` — sweep brain (`--once` / `--monitor-loop` / `--status` / `--json`). PID→slot via **full ancestry walk** + `chat-slots.json`. Reaps only `owned-by-crashed` / `unowned` / `leftover-bash-task` past the 45s age floor AND ≥ `killAfter×interval` (2×300s) confirm window. MS1 added soft-relief (priority demote + working-set trim) + GPU/Ollama coordinator; MS2 added enum cache + cross-PC host filter.
- `.claude/helpers/install-fleet-reaper-task.ps1` — registers durable `PRISM Fleet Reaper` task (5-min, S4U, AtStartup, restart×3). **Needs an ELEVATED shell** — `/checkin-golf` cannot auto-install (UAC).
- `.claude/helpers/process-slot-map.mjs` — PID→slot classifier (+ `leftover-bash-task` class for orphaned Bash-tool monitor loops).
- `.claude/helpers/fleet-reaper-enum-cache.mjs` (+`.test.mjs`) — process-enumeration cache sidecar (MS2).
- `.claude/helpers/fleet-reaper-host-presets.mjs` (+`.test.mjs`) — cross-PC host filter (MS2; this box = `DESKTOP-N7MI1VB`).
- `.claude/helpers/fleet-reaper.test.mjs` · `.claude/helpers/zombie-reaper-daemon.mjs`.
- `.claude/hooks/golf-slot-reaper-guardian.mjs` — SessionStart + UserPromptSubmit backstop. Golf-only (non-golf chats no-op); re-arms if a layer dropped.
- `.claude/hooks/fleet-reaper-stop.mjs` — Stop-hook sweep arm (45s global throttle).
- `.claude/hooks/alpha-slot-reaper-guardian.mjs` — **LEGACY** (pre-2026-05-16). Unwired but preserved per [[feedback_never_delete_only_disable]]; `PRISM_ALPHA_GUARDIAN_DISABLE=1` still honored as a back-compat alias.

### Sibling fleet watchdogs
- `scripts/fleet-memory-monitor.mjs` (+`.test.mjs`) — durable RAM / per-`claude.exe`-tree advisor. [[reference_fleet_memory_monitor_2026_05_16]]
- `scripts/fleet-task-health-watch.mjs` + `.claude/hooks/fleet-task-health-stop.mjs` — watchdog-over-watchdogs (only HRESULT launch-failures count as failing). [[reference_fleet_task_health_ms0_2026_05_17]]
- `.claude/hooks/critical-memory-compact-nudge.mjs` — UserPromptSubmit; ONE `/compact` target per critical episode.
- `scripts/fleet-services-watchdog.mjs` · `scripts/fleet-status.mjs` · `scripts/fleet-doctrine-sweep.mjs`.
- `.claude/helpers/cleanup-orchestrator.mjs` (+ `/reap-zombies`) — GENERIC locks/claims/chat-bus reaper. **Run BOTH** — it covers stale claims/locks the slot-aware reaper does NOT.
- `.claude/helpers/chat-slots.mjs` — slot roster CRUD: `reclaim` / `claim` / `golf-liveness` / `find`.

### Skills + kill switches
- Skills: `/fleet-reaper` (canonical re-arm), `/checkin-golf` (auto-fires reaper), `/reap-zombies`, `node scripts/fleet-status.mjs`.
- `PRISM_FLEET_REAPER_DISABLE=1` — the ONLY true fleet-wide off-switch.
- `PRISM_GOLF_GUARDIAN_DISABLE=1` — golf guardian arm only (legacy alias `PRISM_ALPHA_GUARDIAN_DISABLE=1`).
- `PRISM_FLEET_REAPER_{DRY_RUN,AGE_FLOOR_SEC,KILL_AFTER,INTERVAL_SEC,MEM_PRESSURE_PCT}` — tuning knobs.

## Known regression classes (golf tribal — preserve)
- **PID reuse** — process X dies, new process Y inherits X's PID; reaper killing "X" actually kills Y. Mitigated by confirm-after-N-ticks (`firstSeenAt` timestamp, 2 × 300s default).
- **Wedged harness** — slot crashed but harness PID still alive; resolves to `indeterminate`, NEVER a reap candidate.
- **MCP-zombie false positive** — a `node.exe` whose *immediate* parent is the node launcher wrapper (not `claude.exe`) is classified `non-claude-parent` and the hunter REFUSES to kill it. That refusal is CORRECT: these are live chats' MCP servers, not orphans. Single-level parent checks misclassify — trust the full ancestor walk. (2026-05-29: 22 live chats → ~37 MCP node procs @ ~700MB; bulk-killing them kills live chats.)
- **0-byte stale git lock** — `H:/prism/.git/index.lock` size=0 age>3s = stale, safe to clear.
- **Docker daemon wedge** — Qdrant/Postgres/Prometheus all DOWN → master-index degrades to BM25-only fleet-wide, silently. Detect via `ollama-docker-health.mjs`.
- **`xmalloc` fork-storm** — reaper enumeration goes blind under critical memory pressure. Mitigated by 256MB ballast release on critical sweep (`U-FR-TIER1-MEM-BALLAST`).
- **Ollama `/api/chat` cold-load stall** — `/api/tags` responds but `/api/chat` hangs >150s; the 9.6GB model mmap-loads from `H:` (`OLLAMA_MODELS=H:/Tools/ollama/models`) too slowly, every short-timeout hook call aborts mid-load → load cancels → next call starts cold again. NOT VRAM (GPU idle). Fix: move models to local SSD, or raise hook Ollama timeout. (2026-05-29.)

## Live-state surfaces golf reads
- `H:/prism/state/shared/.fleet-reaper-actions.jsonl` (soft-relief audit) · `.fleet-reaper-kills.jsonl` (hard-kill audit)
- `H:/prism/state/shared/fleet-reaper.log` (sweep JSONL — the in-session Monitor tails this)
- `H:/prism/state/shared/fleet-memory-history.jsonl` (memory-monitor telemetry)
- `H:/prism/state/shared/AGENT_CHAT.jsonl` (cross-slot advisories)
- `H:/prism/state/shared/chat-slots.json` (slot↔terminal binding, heartbeats)

## Hard-won patterns (golf-canonical)
- **The box is rarely the problem.** 128GB RAM / RTX PRO 6000 Blackwell 96GB. When the fleet feels sick, check Anthropic-side rate limits + per-chat config BEFORE blaming RAM (usually <55%).
- Karpathy 5-step ([[feedback_karpathy_discipline]]); R12 fail-loud + R10 checkpoint ([[feedback_r5_thru_r12_doctrine]]); PSN 11 legs ([[feedback_psn_definition]]); never-delete-only-disable ([[feedback_never_delete_only_disable]]); all-slots-free-access ([[feedback_all_slots_free_access]]).

## Live session 3d26f925 (2026-05-29) — fleet rate-limit diagnosis + reaper re-arm + galaxy buildout
Operator hit frequent **"server is temporarily limiting requests"** — ran 26 chats fine before, now ~5 stay productive.
- **ROOT CAUSE:** `settings.json` `effortLevel: "xhigh"` + `alwaysThinkingEnabled: true` (persistent fleet-wide default) put EVERY chat into **ultracode** → each spawns Workflow fan-out subagents per task → "22 chats" = 22 × (parent + N agents) all drawing the **org-wide** rate-limit (ITPM/RPM) bucket. Stacked on today's CLI (v2.1.154) defaulting to **Opus 4.8 + 1M context**.
- **FIX applied:** `effortLevel` xhigh→**high**, `alwaysThinkingEnabled` true→**false**, `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` 95→**90**. Reaped orphans; confirmed Docker healthy; reclaimed crashed slot bravo.
- **Operator action:** must **restart the fleet** for the effort change to bite (running chats keep their session ultracode state).
- **Open levers (operator's call):** pin most slots to Sonnet 4.6; disable 1M context; trim per-turn hook-injection bloat (alpha/sierra domain).
- Detail: [[reference_fleet_rate_limit_diagnosis_2026_05_29]].

## Cross-galaxy bridges (golf touches every slot)
- **All 26 slots** — golf reaps their orphaned `node`/`bash`/`git` children + names which chat to `/compact`.
- `engines/token-optimization/` (alpha) — golf's rate-limit + injection-bloat findings feed alpha's efficiency hunting; alpha consumes fleet-reaper telemetry for token-waste hotspots.
- `engines/hermes-zulu/` (bravo/zulu) — agent-fleet orchestration; golf detects crashed chats + reaps their subagent processes.
- **sierra (system-viz)** — golf queries the system-graph for orphan/utilization classification (no galaxy dir registered yet).

## Wiki cross-refs
- [[architecture/fleet-reaper-ms1]] · [[architecture/fleet-task-health-ms0]] · [[architecture/fleet-memory-monitor]]
- [[feedback_golf_owns_reaper]] · [[feedback_all_slots_free_access]] · [[feedback_never_delete_only_disable]]

— Scaffolded 2026-05-28 by slot:alpha (claude-168624b9). **Completed/owned 2026-05-29 by slot:golf (claude-3d26f925)** — merged verified asset enumeration, kill switches, the 2026-05-29 rate-limit diagnosis, and corrected bridge paths (agent-orchestration → `hermes-zulu`).

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

<!-- AI-CAPABILITIES:BEGIN (auto: scripts/inject-galaxy-ai-capabilities.mjs) -->
## AI capabilities

The `fleet-hygiene` galaxy is wired into PRISM's fleet AI substrate (PSN leg #10 NN/GNN + the Obsidian brain). It has no domain-prefixed AI engine of its own; it reasons via the live-validated generic reasoning bridge.

- **Deep-reasoning** -- reason over THIS galaxy's own context (CLAUDE + synthesis + posture) via the local-Ollama reasoning bridge:
  `node scripts/lib/galaxy-reasoning-bridge.mjs fleet-hygiene "<question>"`
- **NN / GNN** -- the GraphSAGE tier-5 wiring-inference cascade classifies this galaxy's ghost nodes; typed cross-substrate edges (owned-by-slot, documented-by) connect it to the system-viz graph.
- **LoRA** -- this galaxy is fed into the vault->LoRA training dataset (`fleet-hygiene_synthesis.md`).
- **RAG / CAG** -- the fleet's retrieval-augmented + cache-augmented recall (deep-learning retrieval, not keyword grep) covers this galaxy's wiki + tribal entries as they are authored.
- **Embeddings** -- the fleet's 384/768d neural embedding index covers this galaxy's notes as they are embedded, feeding semantic recall + the GNN node-feature bridge.

_Auto-maintained by `scripts/inject-galaxy-ai-capabilities.mjs` (AI-SYNERGY-AUDIT-MS0). Live posture: `state/shared/specs/AI-SYNERGY-AUDIT.md`; per-galaxy detail: this dir's `AWARENESS.md`._
<!-- AI-CAPABILITIES:END -->

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->
