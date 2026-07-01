# ALPHA Galaxy Memory — Token Optimization + Efficiency Hunting + Obsidian + Per-Chat Galaxy Buildout

Cross-session memory for the alpha slot. Append-only — older entries collapse to `state/shared/MEMORY-RECENT.md` per the central MEMORY.md size discipline.

## Master-brain link
> First compliant exemplar of `state/shared/specs/MASTER-BRAIN-TEMPLATE.md` (alpha owns the template — owner eats its own dogfood).
- **UP (pull from master):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="token cache budget efficiency" topK=20`
- **DOWN (push to master):** write `<type>_alpha_<topic>.md` → `C:/Users/wompu/.claude/projects/H--prism/memory/` → fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` `## Indexed memories` carries `[galaxy:token-optimization] …` back-pointer
- **Last master-sync:** 2026-05-28


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/token-optimization_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **Prefer Local Ollama/Qwen**: Always prefer using local Ollama/Qwen for tasks that do not require Claude-class reasoning to save tokens [feedback/feedback_ollama_token_routing].
- **Token Budget Management**: Implement and maintain token budget allocation engines (`TokenBudgetAllocatorEngine`) to ensure efficient use of tokens across different sessions and slots [reference/reference_alpha_token_engines_inventory].
- **Automated Savings Detectors**: Utilize PSN token-savings detectors to aggregate savings data and identify areas for improvement. The system includes 6 PSN token-savings detectors that track cumulative savings [reference/reference_alpha_psn_savings_detectors].
- **Continuous Audits and Fixes**: Regular audits are conducted to measure and improve token savings and context extension. For example, the third PRISM token-savings audit identified critical NOT-BUILT items and a 12-item punch list for fixes [reference/reference_forge_audit_token_context_2026_05_26].
- **Token Savings and Routing**: Multiple references highlight efforts to reroute tasks from Claude API tokens to local Ollama/Qwen tokens for efficiency. This includes routing tool calls, hook injections, and routine LLM tasks [feedback/feedback_ollama_token_routing].
- **Automated Hooks and Telemetry**: PRISM uses 11 auto-fire hooks for token efficiency, including search routing, read guards, and spend tracking. These hooks are registered via `portable-user-settings` and use fd 0 stdin fallback for Windows ESM compatibility [project/token_saving_infrastructure]. Additionally, JSONL telemetry layers have been added to track token budget usage by slot [reference/reference_token_budget_telemetry].
- **Token Awareness and Budget Allocation**: Engines like `TokenAwarenessEngine` and `TokenBudgetAllocatorEngine` play crucial roles in managing token budgets and awareness. The system includes a custom domain awareness surface (`token-awareness-snapshot.mjs`) to ensure future sessions have the necessary context [reference/reference_alpha_token_awareness_surface].

## Indexed memories
- **Domain corpus (live counts):** 46 curated memory file(s) · 271 wiki entr(y/ies) · 95 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 59 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="token-optimization" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/_legacy-root/feedback_ollama_token_routing.md` · `knowledge/memories/_legacy-root/reference_audit_token_context_memory_2026_05_16.md` · `knowledge/memories/_legacy-root/reference_audit_token_savings_2026_05_17.md` · `knowledge/memories/_legacy-root/reference_post_ship_system-viz-brain-ms0-u-p4-rtk-auto-wrap.md` · `knowledge/memories/_legacy-root/reference_token_budget_telemetry.md`
- **Sample wiki:** `knowledge/wiki/software-engineering/token-budget-management.md` · `knowledge/wiki/reference/ollama-offload-token-savings-baseline.md` · `knowledge/wiki/os/commands/context-audit.md` · `knowledge/wiki/lessons/context-economy-injector-knobs.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/tribal-precontext-architecture.md` · `knowledge/wiki/code-tribal/learnings/blackwell-token-synergy-ms0-u-bw-auto-route-allowlist.md` · `knowledge/wiki/code-tribal/learnings/blackwell-token-synergy-ms0-u-bw-best-model-ceiling.md`

## Cross-galaxy bridges
- `engines/cad-fusion-live/` — long-running session pattern alpha references for compaction strategy
- `engines/agent-orchestration/` — multi-chat coordination + handoff discipline
- `engines/system-viz/` — sierra's galaxy; alpha reads system-viz output to find token waste hotspots
- `engines/post-processor/` — echo's galaxy; alpha audits gcode template emissions for redundant blocks

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **Route-Suggest Take-Rate**: The route-suggest take-rate is low (0.8%) due to adoption issues rather than capability limitations. Further investigation and fixes are needed in the alpha-lane [reference/reference_sierra_to_alpha_route_suggest_findings_2026_06_02].
- **High-ROI Token Savings**: Continuous discovery and implementation of high-ROI token savings strategies are ongoing, with a focus on empirical rules learned from iterative processes [feedback/feedback_token_savings_discoveries_2026_05_23].
- **Token Awareness Milestones**: The TOKEN-AWARENESS-MS0 milestone aims to close the loop where models are blind to their own budgets. Further enhancements and testing are required to ensure full functionality [reference/reference_token_awareness_ms0_2026_05_20].

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Standing focus (alpha-canonical)

1. **Token economy** — gate expensive operations on `TokenAwarenessEngine` zone (GREEN/YELLOW/RED). At YELLOW prefer `rtk <cmd>`, batched tool calls, Ollama offload. At RED stop new exploratory work + write handoff.
2. **Efficiency hunting** — surface route alternatives (MCP dispatcher action vs reimplementation, `Grep` vs broad `Agent`, `Read offset:limit` vs full-file).
3. **Obsidian + memory governance** — keep `MEMORY.md` ≤ 200 lines pointer-only; archive overflow to `MEMORY-ARCHIVE.md` discoverable + read-on-demand.
4. **Per-chat-slot galaxy buildout** — each NATO slot's canonical assignment from `H:/CHAT-SLOT-DOMAINS.md` should have its own `engines/<galaxy>/CLAUDE.md` + `MEMORY.md`.
5. **Injection budget + compaction integrity** (FLEET-INJECTION-BUDGET-AUDIT, 2026-06-11) — empirical fleet floor ~3.2KB/turn/slot (60 UserPromptSubmit injectors x up to 26 slots). **THE compaction doctrine:** a transcript-byte estimate ABOVE the context cap (1M) is *bloat, not pressure* — the JSONL redundantly logs every turn's full injection + tool outputs, so `postCompactBytes/3.5` over-reports. `chat-token-watch` now flags it `suspect` + downgrades a false `critical`→`warn` (no /compact nudge); only the authoritative per-turn `usage`/sidecar drives a REAL compaction decision. [[reference_compact_phantom_byte_estimate_fix_2026_06_11]] (7b8dbde2dd). **BIGGEST UNREALIZED LEVER** (infra, golf/papa lane): the context-bundle daemon is DOWN ~32 days → the fleet runs all 60 legacy injectors instead of the 1 compact bundle that daemon produces. **Process lesson:** a multi-agent audit's MAP + empirical measure are trustworthy, but its per-hook *claims* need deterministic verification before acting (3 of 4 "quick wins" were false positives; one would have broken auto-resume). [[reference_fleet_injection_budget_audit_2026_06_11]]

## Known patterns (referenced often)

- **Karpathy 5-step pre-coding** ([[feedback_karpathy_discipline]]) — CLASSIFY → TECHNIQUE → EDGE CASES → FAILURE MODES → THEN WRITE
- **R12 fail-loud** — surface failures explicitly, never silently downgrade ([[feedback_r5_thru_r12_doctrine]])
- **R10 checkpoint** — restate done/verified/left at each step
- **PSN 11 legs** ([[feedback_psn_definition]]) — Obsidian brain + PRISM OS + Wiki + Memories + Tribal + System Viz + Engines + Algorithms + Formulas + NN/GNN + PRISM AI

## Live session 168624b9 (2026-05-28)

This session built the alpha galaxy itself (this file) as part of U-PER-SLOT-GALAXY-BUILDOUT. Prior alpha sessions (e.g. 625e0262) acted under the stale slot-soul "mill-specialist" designation; the canonical correction landed via the SLOT_GALAXY_MAP fix in this same session.

## Cross-galaxy bridges (alpha touches)

- `engines/cad-fusion-live/` — long-running session pattern alpha references for compaction strategy
- `engines/agent-orchestration/` — multi-chat coordination + handoff discipline
- `engines/system-viz/` — sierra's galaxy; alpha reads system-viz output to find token waste hotspots
- `engines/post-processor/` — echo's galaxy; alpha audits gcode template emissions for redundant blocks

— Established 2026-05-28 by slot:alpha claude-168624b9.

## Owned milestone — COMMAND-KERNEL-MS0 (brain/OS substrate, assigned to alpha 2026-05-28)
The PSK — PRISM Syscall Kernel (`.claude/kernel/psk.mjs`, 62.6K, wired `prism_session:psk`) — is the syscall layer the Obsidian brain feed + PRISM-OS dispatcher compose through (`/startup /checkin /handoff /pick`). Operator assigned it to alpha as part of Obsidian-brain ownership. Status: **28 of 29 units complete**; ONLY **U-CK11** open ("Per-category scrutiny pass over the migrated corpus"). Milestone stuck `in_progress` since 2026-05-17 purely on U-CK11 = close-out debt. Alpha's queue (APPEND, does not preempt current work): resolve U-CK11 → close-out COMMAND-KERNEL-MS0. See [[project-alpha-owns-obsidian-brain]].

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Domain anchors (papa 2026-06-09, GALAXY-ENRICH infra lane)
Token economy + context efficiency. Domain = CAG/RAG/prompt-caching/context-engineering (the operator's CAG/RAG articles land here).
**Internal corpus (primary):** cross-cutting methodology `state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md` + this galaxy's engines `mcp-server/src/engines/token-optimization/` + the operator article-set themes (loops / harness / LoRA / CAG / RAG / obsidian-vault).
**Authoritative free external sources (VERIFIED, papa AI/software domain):**
- [Anthropic Docs - Prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [Anthropic Engineering - Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
R12: nameable free authoritative references for an AI/software domain (papa's expertise) -- VERIFIED + integrated live, not owner-gated. Regen: `scripts/integrate-infra-domain-anchors.mjs`.

## Recent increments (2026-06-11, slot:alpha session 99297b90) -- context refresh
Source: transcript-mine `state/shared/galaxy-transcript-mining/token-optimization/_SYNTHESIS.md` (gpt-oss:120b) + live session.
- **U-CBF01 + U-CBF02** (compaction-boundary fix): Claude Code changed its transcript compact marker `"isCompactSummary":true` -> `{type:"system",subtype:"compact_boundary"}`, silently breaking EVERY byte ctx estimator (precompact-auto-trigger + transcript-token-counter + sidecar + statusline + chat-token-watch) -> whole-transcript byte count -> false >=HARD -> alpha constant-/compact loop. Fixed all 5 estimators + drift guard (49/49). Wiki [[compact-boundary-format-change-constant-compaction]].
- **U-DENSE-POOL-BACKFILL** (`3f0a9aef11`): the fleet CAG+RAG+hybrid reasoning-bridge dense arm was blind to lexical-miss chunks (dense pool built from lexical hits only -> a score==0 chunk was filtered BEFORE the embedder). `buildCandidatePool` backfills score==0 chunks up to candidateM (embed budget unchanged). Fleet-wide all 34 galaxies, +2829 chunks dense-reachable, 64/64. Builds ON TOP of charlie's U-RAG-PARTIAL-DENSE.
- DEDUP note: broad "improve AI systems (NN/GNN/LoRA/CAG+RAG)" already shipped by charlie -- [[reference_ai_systems_6unit_complete_2026_06_11]] (6 units, only india GPU runs remain). Do NOT rebuild.
- **U-ALPHA-MINE-DURABLE**: `install-galaxy-mine-task.ps1` -- general (`-Galaxy <key>`, all 34 galaxies) reaper-IMMUNE scheduled-task installer for the transcript mine. A chat-spawned background mine orphan-reaps on /compact (fleet-reaper kills long node children of dead claude.exe -- the mine died at ~8/96 that way); a Task-Scheduler child is spared (parent svchost, not claude.exe). Current-user default principal (registers w/o elevation), resumable. Validated register/run/uninstall round-trip.
- **U-ALPHA-SONNET-MINE** (operator: "use sonnet agents to read+summarize previous sessions, not ollama"): `build-session-evidence-packs.mjs` streams 1276MB raw -> 1.2MB bounded packs (1000x, 107MB no-OOM, 6/6 tests) + `consolidate-evidence-digest.mjs` deduped digest. **Sonnet-subagent fan-out BLOCKED** -- PRISM injects >200K SessionStart cold-cache anchors into every subagent -> "Prompt is too long" before it reads anything (2.6M tokens / 0 results). Read+synthesis done by main Opus chat over the distilled evidence -> `state/shared/galaxy-transcript-mining/token-optimization/_OPUS-SYNTHESIS-2026-06-11.md`. 69 un-mined alpha sessions (2026-05-12..27) now categorized.

## ARTICLES FED (ingestion catalog, from the 69-session mine 2026-06-11 -- operator's "articles I've fed you")
**Hermes trilogy (DIRECTLY the current goal: hermes agent / souls.md / agentic):** Akshay Pachaar Hermes Masterclass (SOUL/MEMORY/USER/Curator/GEPA) · Shann Holmberg · Simback "Hermes Agent Memory Guidebook" -- read via Playwright, partially applied (per-galaxy SOUL/MEMORY exist).
**Applied:** Bilgin Ibryam "Adapt CC to Large Codebases" (8/13 -> DOMAIN-GALAXY-DOCTRINE-MS0/MS1) · Ahmad Osman "LLM Engineering Projects" (34-unit envelope).
**Read, not fully built:** Vox "12 Layers" · Kirill "Kimi Agent Swarm 300-agent" · 0xCodez · dunik_7 (4-Layer memory).
**6 article-asks NEVER BUILT (concrete backlog):** semantic-cache · targeted-compact · agent-team-cap · lazy-skill-body · cache-breakpoint-sweeper (U-CACHE-BREAKPOINT-SWEEPER P0-3, scoping started) · CLAUDE.md <=200 lines (Mnilax; now ~163KB, far over).

## Open task queue (ROI-ordered, 2026-06-11 -- refreshed from the 69-session mine)
**HIGH (alpha-owned):**
1. **Slim the subagent context bundle** -- gate SessionStart cold-cache anchors OFF for workflow/Task subagents so the Sonnet-agent fan-out works (currently every subagent overflows >200K before reading). **NEW, unblocks all multi-agent work from this galaxy.** [S/M]
2. **U-CK11** -- close COMMAND-KERNEL-MS0 (28/29; per-category scrutiny over migrated corpus). Pure close-out debt since 2026-05-17. [[project-alpha-owns-obsidian-brain]].
3. **Ollama offload 8.9% -> 30%** -- widen `OFFLOADABLE_PATTERNS`. Headline metric, chronically below floor.
4. **semantic-cache + targeted-compact + lazy-skill-body** -- the 3 highest-ROI unbuilt article-asks (direct token savings = galaxy core mandate).
5. **MCP :3100 restart / maxConnections=512** + CONN-5 recall verify (daemon was ECONNREFUSED this session).
**MEDIUM:** DISPATCHER_DIGEST.md auto-generator (kills manual drift) · M####/W#### memory+wiki shortcodes (~70% recall savings) · MEMORY.md index compress (22KB ceiling) · embedder empty-text guard (~84% chunk-fail) · Qdrant tribal re-embed (~29k lost, shard >512MiB).
**COORDINATE (india-owned):** 0.78 AUROC gate (ref-pool GROWTH); GNN edge-pred production integration.

> Persistence: this in-repo galaxy brain is the durable record; C: memory files auto-feed Obsidian on Stop (`stop-obsidian-memory-feed.mjs`). 69 un-mined alpha sessions now categorized in `_OPUS-SYNTHESIS-2026-06-11.md`; future mines run reaper-immune via `install-galaxy-mine-task.ps1 -Galaxy token-optimization` (resumable). Re-mine source: `_evidence/` packs.

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->
