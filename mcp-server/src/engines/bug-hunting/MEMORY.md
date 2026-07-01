# Bug-Hunting Galaxy MEMORY — UNIFORM slot cross-session learnings

> Append-only. Pointer-style. ≤200 lines · ≤140 chars/entry. Older entries archive to MEMORY-ARCHIVE.md.

## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="bug hunting" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:bug-hunting]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/bug-hunting_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **Avoid PowerShell for Editing Repo Files**: Never use PowerShell `[IO.File]::WriteAllText` or similar tools to edit repository/source files as they strip the UTF-8 BOM, breaking Windows PowerShell 5.1 `-File` parsing [feedback/feedback_edit_tool_not_powershell_for_repo_files].
- **Serialize Agent Calls Under High Memory Pressure**: When commit-memory pressure exceeds 90%, do not dispatch parallel `Agent()` calls or run heavy bash audits and fresh node processes concurrently to avoid fork storms [feedback/feedback_no_parallel_agents_high_pressure].
- **Wiki Documentation**: Every bug finding must have a corresponding wiki entry under `knowledge/wiki/lessons/` or `knowledge/wiki/code-tribal/` [feedback/feedback_always_update_wiki_on_bug_finding].
- **Exact Reproduction**: When reproducing a failure, replicate the full downstream contract rather than using proxy signals like exit codes. The standalone reproduction must exercise the exact same success condition as the real caller depends on [feedback/feedback_verify_actual_contract_not_proxy].
- **Optimistic Locking**: Implementing optimistic locking with a version field to manage concurrent access in systems like `AtomicClaimBrokerEngine` [reference/reference_u_coord02_optimistic_locking_2026_05_16].

## Indexed memories
- **Domain corpus (live counts):** 35 curated memory file(s) · 175 wiki entr(y/ies) · 8 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 66 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="bug-hunting" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/_legacy-root/feedback_always_update_wiki_on_bug_finding.md` · `knowledge/memories/_legacy-root/feedback_file_claim_namespace_bug.md` · `knowledge/memories/_legacy-root/reference_synergy_regression_watch_2026_05_16.md` · `knowledge/memories/_legacy-root/reference_tribal_enrichment_engine_bug.md` · `knowledge/memories/reference/reference_acu_7pass_families_regression_2026_06_02.md`
- **Sample wiki:** `knowledge/wiki/software-engineering/fail-loud-r12-patterns.md` · `knowledge/wiki/software-engineering/regression-prevention-doctrine.md` · `knowledge/wiki/os/commands/regression-audit.md` · `knowledge/wiki/lessons/bug-findings-wiki-gate.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/fleet-debug-playbook.md` · `knowledge/wiki/code-tribal/learnings/bug-fix-u-viz-streaming-io-consumers.md` · `knowledge/wiki/code-tribal/learnings/bug-fix-u-viz-streaming-io.md`

## Cross-galaxy bridges
- [[../wiring/MEMORY.md]] — romeo's wirings are uniform's verification target
- [[../backend-helper/MEMORY.md]] — papa's TSC-fix campaign findings often surface regression seeds
- [[../discovery/MEMORY.md]] — tango's orphan-rescue findings are uniform's "did the rescue stick?" targets
- [[../dormant-data/MEMORY.md]] — victor's excavation finds bugs uniform's bug-class catalog should capture

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **Stop Hook Detection Bug**: The stop hook reports certain actions as UNHANDLED in `camDispatcher.ts` despite existing case handlers, indicating a detection bug [reference/reference_stop_unwired_assets_false_positive_2026_05_23].
- **Pillar Telemetry Recovery**: Follow-ups remain open for the HookTelemetryEngine persistence mechanism, which currently returns `{total:0}` regardless of session activity [reference/reference_pillar_telemetry_recovery_ms0].

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Standing patterns (load-bearing across all bug-hunt sessions)

- **Repro must check actual contract, not proxy** — per [[feedback_verify_actual_contract_not_proxy]]. `JSON.parse` not byte-length; PowerShell 5.1 codepage mangles non-ASCII stdout.
- **Mutation discipline closes a bug** — fix → mutate code to break fix → verify test goes red. A test that doesn't go red under a deliberate break is not a test.
- **Every found bug-class gets promoted to a wiki lesson** — bug-finding-wiki-gate Stop hook enforces. Single-instance is anecdote; class is doctrine.
- **CLAUDE.md `## Recent regressions` is the rolling memory** — Boris back-flow. Uniform writes here for every found bug.
- **Hostile-payload class needs adversarial test fixtures, not random fuzzing** — random rarely hits the exploit; adversarial generation does.

## Known bug-class catalog (uniform's living taxonomy)

| Class | First documented | Symptom | Canonical repro |
|-------|------------------|---------|-----------------|
| Silent success on broken wire | (pre-2026-05) | Test passes, dispatcher action no-ops | Call action via wire, assert non-trivial return shape |
| R12 fail-loud violation | 2026-05-12 (Mnilax R12 doctrine adopt) | Engine returns `{ok:true, fallback:...}` on real failure | Inject failing dep, assert `ok=false` or throw |
| Weak assertion class | (pre-2026-05) | `toBeDefined()` instead of value check | Mutation test the function body |
| Hostile-payload class | 2026-05 (scrutiny arm B) | Greedy `slice(firstBrace,lastBrace+1)` JSON | Embed `}{` inside payload string |
| Schema-drift class | 2026-05 (multi) | Old consumer reads new-schema state | Bump schemaVersion, run old consumer |
| Inlined-constant drift | (canonical PRISM violation) | Engine kc value disagrees with canonical | Grep for `kc1.1 =` outside `physics/constants.ts` |
| Silent clobber | 2026-05-23 (viz streaming IO) | Two writers to same path, partial JSON read | Write-while-read race repro |
| Stub-engine class | (multiple) | Engine renamed, body returns placeholder | `comprehensive-build-enforce` Stop hook surfaces |
| Wired-silent hook | 2026-05-18 (`e467a4ca0`) | Hook on disk + in settings, zero fires | `hook-fire-rate-audit.mjs` |
| Dormancy class | 2026-05-19 (MCP/settings) | Declared but not configured (or vice versa) | `declared-vs-actual.mjs` |

## Bug-hunt sessions

> Append new entries here. Each session: `## YYYY-MM-DD — claude-<id> — <bugs found / new classes>`

(No sessions yet — uniform galaxy just scaffolded.)

## Open watchlist (regressions to monitor)

> Empty until first uniform session enumerates. Suggested seed scans:
> - All engines under `engines/*/` for inlined kc1.1 / Taylor C/n constants
> - All dispatchers for action enum entries with no `case` in the switch
> - All tests under `__tests__/` for `toBeDefined()` / `toBeTruthy()` without value follow-up

## Cross-galaxy memory bridges

- [[../wiring/MEMORY.md]] — romeo's wirings are uniform's verification target
- [[../backend-helper/MEMORY.md]] — papa's TSC-fix campaign findings often surface regression seeds
- [[../discovery/MEMORY.md]] — tango's orphan-rescue findings are uniform's "did the rescue stick?" targets
- [[../dormant-data/MEMORY.md]] — victor's excavation finds bugs uniform's bug-class catalog should capture

— Established 2026-05-28 by slot:alpha. First entry will land when a uniform session reports findings.

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Domain anchors (papa 2026-06-09, GALAXY-ENRICH infra lane)
Silent-no-op + route-verify hunting. Primary corpus is the regressions ledger + R12 doctrine (internal).
**Internal corpus (primary):** cross-cutting methodology `state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md` + this galaxy's engines `mcp-server/src/engines/bug-hunting/` + the operator article-set themes (loops / harness / LoRA / CAG / RAG / obsidian-vault).
**External free-source corpus:** none applies -- this domain is PRISM-internal (codebase + wiki + operator article-set). The internal anchors above ARE the corpus. Regen: `scripts/integrate-infra-domain-anchors.mjs`.

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->
