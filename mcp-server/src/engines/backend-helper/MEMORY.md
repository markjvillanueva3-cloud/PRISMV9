# PAPA Galaxy Memory — Backend Helper

Append-only cross-session memory for the papa slot.

## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="backend helper" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:backend-helper]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/backend-helper_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **Dispatcher Path Verification**: Engine-green does not imply dispatcher-path-green; verify the wired path with a real round-trip, not just engine unit tests or green inventory/grep searches [feedback/feedback_dispatcher_path_green_not_engine_green].
- **Stub-Wired vs. Wired**: A single dispatcher case calling `engine.method?.()` and falling back to `"method not callable"` is considered dark, not wired [feedback/feedback_echo_stub_wired_is_dark].
- **Build Requests Logging**: Every operator build or feature request must be captured in the persistent cross-session log at `state/shared/USER-BUILD-REQUESTS-LOG.md` [feedback/feedback_user_build_requests_log].
- **Build Process**: Every build follows a strict sequence of WIRE -> TEST -> VALIDATE -> APPLY-TO-ALL-GALAXIES [feedback/feedback_wire_test_validate_all_galaxies].
- **Dispatcher Wiring**: Engines are wired into dispatchers using specific patterns, such as the SkillTierRegistryEngine pattern which includes 5 actions, schema, dispatcher, engine test, and wire test with in-process round-trip [reference/reference_skill_tier_wire_pattern].
- **End-to-End Testing**: In the Hotel/ERP galaxy, every engine's JSON output must be a valid input to the next engine in the chain, verified by one end-to-end HTTP test [feedback/feedback_hotel_e2e_no_paper_bridges].

## Indexed memories
- **Domain corpus (live counts):** 52 curated memory file(s) · 230 wiki entr(y/ies) · 59 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 80 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="backend-helper" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/_legacy-root/feedback_always_build.md` · `knowledge/memories/_legacy-root/feedback_backend_before_frontend.md` · `knowledge/memories/_legacy-root/feedback_esbuild_externals.md` · `knowledge/memories/_legacy-root/feedback_user_build_requests_log.md` · `knowledge/memories/_legacy-root/reference_post_ship_backend-devtools-hva-u-hva-rewire-iter19-fix.md`
- **Sample wiki:** `knowledge/wiki/reference/build_state-auto-injected-memory-surface.md` · `knowledge/wiki/os/commands/build-brief.md` · `knowledge/wiki/os/commands/build-state.md` · `knowledge/wiki/os/commands/pick-build-close.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/build-error-fix-patterns.md` · `knowledge/wiki/code-tribal/learnings/awareness-ms0-u-build-req-log.md` · `knowledge/wiki/code-tribal/learnings/backend-dev-loop-u-bridge-wire-video-lock.md`

## Cross-galaxy bridges
- ALL galaxies — papa is a horizontal assist slot, not vertical specialist
- `engines/discovery/` (tango) — wiring backlog source (audit-unwired-engines.mjs)
- `engines/hermes-zulu/` (bravo) — stub-hunter findings flow to papa for fixes
- `engines/ai-training/` (india) — papa helps wire LoRA/NN engines through prism_ai
- `engines/token-optimization/` (alpha) — papa works with alpha on RTK piping of vitest/tsc output

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **False Positives in Build State**: The MS-CRITWIRE/U-CW-01 engine was incorrectly marked as needing wiring due to a false positive; it has an explicit WIRE-EXEMPT marker and is already consumed by middleware [reference/reference_u_cw_01_false_positive_2026_05_20].
- **Incomplete Wiring in PrintToProgramPipelineEngine**: The PrintToProgramPipelineEngine is wired but only ships 1 of the 4 required components, indicating partial completion [reference/reference_kilo_queue_revisit_2026_05_23].

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Standing focus (papa-canonical)

1. **Wire it as you build it** — every new engine ships with: real tests (algebraic invariants, not stubs), dispatcher wiring (z.enum + schema + action case), round-trip E2E assertion. Per CLAUDE.md §ENGINE WIRING — multiple dispatchers when natural consumers span domains.
2. **Build-state honesty** — `BUILD_STATE.json` "wired" requires actual dispatcher invocation in a test, not just disk presence. The "82% dispatcher coverage" headline must reconcile to live invocability.
3. **TSC bisect** — large TS error counts get attacked file-by-file with per-file 2-reviewer gate; each commit shows error-count delta in the message body (-N).
4. **Mock discipline** — MockMCPServer + harness mocks MUST replicate the production gate stack (schema, enum, lazy import) or the test is a false-green. R9.

## Known regression classes

- **Action-enum forgot a new action** — engine + schema + case shipped but z.enum missed it → production 100% broken with 9/9 tests passing through Mock that skipped the enum gate. Pre-mortem: integration test through `MCPServer.callTool(action, params)` not through `engine.method(params)`.
- **TS2339 cascade** — one schema field rename ripples 30+ files. Bisect with `tsc --noEmit 2>&1 | head -50` then group-by-error-shape; fix the canonical site first.
- **WIRE-EXEMPT abuse** — marking a class-internal-only engine `WIRE-EXEMPT` is fine; using it to dodge a real wiring gap is the silent-orphan class.
- **Lazy import path race** — async dynamic import on a hot path under fleet load can deadlock; cache the module reference at first call.
- **Repeated build-error fragments** — same `[delta]/mcp-server` build failure surfaced repeatedly → tribal-tip-promote candidate; the repeated-failure pattern lives in `error-pattern-memory.json` (currently orphan, see DEV-TOOL-CONFLICT-AUDIT F2).

## Cross-galaxy bridges

- ALL galaxies — papa is a horizontal assist slot, not vertical specialist
- `engines/discovery/` (tango) — wiring backlog source (audit-unwired-engines.mjs)
- `engines/hermes-zulu/` (bravo) — stub-hunter findings flow to papa for fixes
- `engines/ai-training/` (india) — papa helps wire LoRA/NN engines through prism_ai
- `engines/token-optimization/` (alpha) — papa works with alpha on RTK piping of vitest/tsc output

## Wiki cross-refs

- [[architecture/dispatcher-wiring-discipline]]
- [[lessons/u-dispatcher-mock-bypass-class]] · [[lessons/tsc-bisect-pattern]]
- [[feedback_engine_tests_in_tests_dir]] · [[feedback_parallel_scrutiny_per_file]]

— Established 2026-05-28 by slot:alpha claude-168624b9 (papa-pending).

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Domain anchors (papa 2026-06-09, GALAXY-ENRICH infra lane)
Build/TSC assist every slot (papa's home galaxy). Primary corpus is the PRISM build pipeline + tsc (internal).
**Internal corpus (primary):** cross-cutting methodology `state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md` + this galaxy's engines `mcp-server/src/engines/backend-helper/` + the operator article-set themes (loops / harness / LoRA / CAG / RAG / obsidian-vault).
**External free-source corpus:** none applies -- this domain is PRISM-internal (codebase + wiki + operator article-set). The internal anchors above ARE the corpus. Regen: `scripts/integrate-infra-domain-anchors.mjs`.

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->
