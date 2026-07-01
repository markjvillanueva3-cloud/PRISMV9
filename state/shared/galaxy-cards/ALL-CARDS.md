# Galaxy context-cards (34) — generated 2026-06-27T15:35:25.367Z
> Compact per-galaxy brains for cross-galaxy context. Regenerate: node scripts/galaxy-context-card.mjs build

## academy — per-domain cascade index (P1+P4 hybrid, 2026-05-27)
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="academy" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:academy]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- > Open threads / risk areas distilled from this galaxy's memories (advisory):
- `reference/reference_knowledge_conversion_ms0_2026_05_17.md` — MIT-OCW + monolith → PRISM via 3-lane router with 7 algorithms shipped
- Parent doctrine: [`state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](../../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md)
- Scope-expansion §Q2: [`state/shared/specs/SCOPE-EXPANSION-OPERATOR-7-DIRECTI
…[card truncated]

## agent-orchestration — agent-orchestration .md
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="agent orchestration" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:agent-orchestration]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- `AgentExecutor.ts` — multi-agent orchestration, task queue, and execution coordination
- **golf owns the fleet-reaper** — slot-aware orphan reaper for the fleet; doctrine moved alpha→golf 2026-05-16 (CLAUDE.md §GOLF SLOT, §FLEET-REAPER; `feedback_golf_owns_reaper.md`).
- **Per-task model routing / pre-search** — every spawned subagent gets master-index + tribal pre-search blocks (CLAUDE.md §SESSION CONTINUITY STACK).
- **N
…[card truncated]

## ai-training — Full System Training (AI/NN/GNN/LoRA/RAG/DL/ML)
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="ai training" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:ai-training]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29   ← STALE: master MEMORY.md updated 2026-06-04; this file edited 2026-06-08 (NN-GRAPH/RAG-HYBRID work) without a master re-pull. Re-pull before next india session.
- **#4 GNN active-learning ghost selector — SHIPPED 2026-06-10** (`U-GNN-ACTIVE-POOL-SELECT`, commit `f512700c56` + testfix `b0ae289273`). `scripts/lib/gnn-active-pool-select.mjs`: ranks unlabeled ghosts by acquisition = wU·uncertainty + wB·classRarity (greedy class-diversity re-rank; NO per-node hetero
…[card truncated]

## backend-helper — Backend Helper
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="backend helper" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:backend-helper]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- **Stub-Wired vs. Wired**: A single dispatcher case calling `engine.method?.()` and falling back to `"method not callable"` is considered dark, not wired [feedback/feedback_echo_stub_wired_is_dark].
- `engines/discovery/` (tango) — wiring backlog source (audit-unwired-engines.mjs)
2. **Build-state honesty** — `BUILD_STATE.json` "wired" requires actual dispatcher invocation in a test, not just disk presence. The "82% dispatcher coverage" headline must rec
…[card truncated]

## blueprint-vision — per-domain working brain (XRAY slot)
- **UP (pull from master):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md`
- **MASTER-INDEX edge:** master `MEMORY.md` carries `[galaxy:blueprint-vision]` back-pointer (verify it exists — added 2026-05-29)
- **Last master-sync:** 2026-06-10   ← bump on every PULL reconcile; older than the galaxy dir mtime ⇒ re-pull before work
- **Verify engine names on disk before referencing** — the alpha seed named 21 non-existent engines (corrected 2026-05-29). `Glob`/`Grep` first.
- **Alpha-seed asset hallucination** — 21 engine names in the seed CLAUDE.md did not exist (fixed 2026-05-29). Class: enshrining unverified names. Mitigation: Glob/Grep first.
- 2026-05-29 — claude-e9b75754 — galaxy fully built + asset-verified (no prints extracted; inventory + correction pass).
- 2026-06-10 — claude-d00dc7c4 — context-regain + domain-retention pass: mapped OCR-corpus yield mechanics, found 3rd-model ROI lever, flagg
…[card truncated]

## bug-hunting — UNIFORM slot cross-session learnings
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="bug hunting" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:bug-hunting]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- [[../wiring/MEMORY.md]] — romeo's wirings are uniform's verification target
- [[../backend-helper/MEMORY.md]] — papa's TSC-fix campaign findings often surface regression seeds
- [[../discovery/MEMORY.md]] — tango's orphan-rescue findings are uniform's "did the rescue stick?" targets
- | Wired-silent hook | 2026-05-18 (`e467a4ca0`) | Hook on disk + in settings, zero fires | `hook-fire-rate-audit.mjs` |
- | Dormancy class | 2026-05-19 (MCP/
…[card truncated]

## business — per-domain cascade index (P1+P4 hybrid, 2026-05-27)
- > **Per-domain memory cascade** per SCOPE-EXPANSION-OPERATOR-7-DIRECTIVES-2026-05-26.md §Q2. Auto-loads when Claude edits under `mcp-server/src/engines/business/`. Companion to `./CLAUDE.md` (hotel-targeted refinement queue).
- > **Status: SCAFFOLDED (master-index back-pointer wired 2026-05-29; per-galaxy content migration deferred to U-GALAXY-MS1-C1).**
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="business" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:business]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- **Hotel Slot File Absorption:** Misattribution of hotel-slot files due to shared-t
…[card truncated]

## cad — per-domain cascade index (2026-05-27)
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="cad" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:cad]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- > Open threads / risk areas distilled from this galaxy's memories (advisory):
- **Ollama text→CAD lane (LIVE):** `scripts/cad-text-to-cadquery.mjs` — engine canonical prompt + hard-coded JM doctrine → qwen2.5-coder:32b → gated CadQuery staging (`state/shared/cad-text-gen/`). Wiki [[cad-text-to-cad-landscape]] (open-source landscape: Seek-CAD / Text-to-CadQuery 170K / STEP-LLM + 3-generation live validation set). Buildout queue: `state/shared/specs/DELTA-CAD-G
…[card truncated]

## cad-fusion-live — cad-fusion-live .md
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="cad fusion live" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:cad-fusion-live]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- > Open threads / risk areas distilled from this galaxy's memories (advisory):
- `mcp-server/src/engines/Fusion360LiveBridgeEngine.ts` — PRISM-side client for the Fusion API Server add-in (`http://127.0.0.1:18360`); typed CAD-op methods + ExtractedAction replay; retry backoff `[100,500,2000]`, max 3
…[card truncated]

## cam — per-domain cascade index (2026-05-27)
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="cam" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:cam]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- > Open threads / risk areas distilled from this galaxy's memories (advisory):
- [`./CLAUDE.md`](CLAUDE.md) · `U-GALAXY-MS1-C1` migration · parent: [`../../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](../../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md)
- _Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._
- Pull-fresh-on-demand EX
…[card truncated]

## compliance-safety — compliance-safety .md
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="compliance safety" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:compliance-safety]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01
- **HARD STANDING RULE:** `softening-safety-thresholds` is in every cutting-slot soul's refuse_list. Never weaken a safety threshold without explicit tier-downgrade authorization. Cross-refs: [`./CLAUDE.md`](CLAUDE.md) · root CLAUDE.md §SAFETY · `prism_safety:*` MCP cluster.
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- **post-processor** — `PostEmitSafetyGateEngine.ts` / `PostVerificationSafetyEngine.ts` gate emitted G-code before release.
- **shop-floor** — live alarm + escalat
…[card truncated]

## corpus-aggregation — corpus-aggregation .md
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="corpus aggregation" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:corpus-aggregation]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- > Open threads / risk areas distilled from this galaxy's memories (advisory):
- `CADTrainingCorpusOrchestratorEngine.ts` — "CAD-COMPLETE-MS0/U-CADC17".
- **USE lima's pypdf page-by-page extractor (canonical)** for PDF corpus harvest — `feedback_use_lima_pypdf_page_extractor.md` (76× d
…[card truncated]

## database-expansion — per-domain working brain
- **UP (pull from master):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md`
- — recall: `prism_memory:semantic_search query="database qdrant postgres schema migration atomic-write" topK=20`
- **DOWN (push to master):** write `<type>_juliett_<topic>.md` →
- `C:/Users/wompu/.claude/projects/H--prism/memory/` → fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries `[galaxy:database-expansion] …` back-pointer (verify it exists)
- **Last master-sync:** 2026-05-29   ← bump on every PULL reconcile; older than the galaxy dir mtime ⇒ re-pull before work
- > 2026-05-29 PULL was **keyword-based** (MCP server DOWN this session — `prism_memory:semantic_search` unavailable). Re-run the live recall query next session when MCP is up and reconcile new hits into `## High-ROI memories`.
- `engines/discovery/` (tango) — `cross-session-asset-registry.json` + `extr
…[card truncated]

## discovery — Algorithm, Engine & Pipeline Discovery (per-domain working brain)
- > Clones `state/shared/specs/MASTER-BRAIN-TEMPLATE.md` (alpha-owned canonical). Connection = PULL + PUSH + master-index back-pointer + recall.
- **UP (pull from master):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="discovery duplication-guard master-index orphan audit" topK=20` (MCP-down fallback: `node scripts/system-viz-query.mjs find <term>`)
- **DOWN (push to master):** write `<type>_tango_<topic>.md` → `C:/Users/wompu/.claude/projects/H--prism/memory/` → mirrored to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs` at Stop
- **MASTER-INDEX edge:** master `MEMORY.md` `### Galaxy brain back-pointers` carries the `[galaxy:discovery] …` row (added 2026-05-29 — verify it persists)
- **Last master-sync:** 2026-05-29   ← bump on every PULL reconcile; older than the galaxy dir mtime ⇒ re-pull before work
- <!-- GALAXY-
…[card truncated]

## dormant-data — VICTOR slot cross-session learnings
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="dormant data" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:dormant-data]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- [[../wiring/MEMORY.md]] — every "engine no consumer" routes to romeo; romeo's session log closes the loop
- [[../discovery/MEMORY.md]] — tango's orphan inventory is the OTHER source of unwired-asset findings; deduplicate
- [[../knowledge-conversion/MEMORY.md]] — 3-lane router learnings inform victor's routing decisions
- [[../ai-training/MEMORY.md]] — india's RAG/LoRA corpus needs are downstream of victor's data findings
- **Follow-up
…[card truncated]

## fleet-hygiene — Fleet Hygiene + Reaper + MCP Server
- > Galaxy brain for domain **fleet-hygiene**. Modeled on the alpha exemplar `engines/token-optimization/MEMORY.md` — the fleet-wide `MASTER-BRAIN-TEMPLATE.md` referenced in the master index is **not present on this branch** (verified 2026-05-29), so the exemplar is the live pattern.
- **UP (pull from master):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="fleet reaper orphan zombie chat-slot hygiene rate-limit" topK=20`
- **MASTER-INDEX edge:** master `MEMORY.md` `### Galaxy brain back-pointers` carries the `[galaxy:fleet-hygiene] …` row (added 2026-05-29).
- **Last master-sync:** 2026-05-29
- ⭐ [[reference_golf_inventory_of_record_2026_06_11]] — **the categorized inventory of record** (todo/unfinished/dormant-unwired/articles + ROI queue + 6 india/zulu AI-systems improvements). Read before `/pick`. Handoff-mine appendix: `state/shared/specs/GOLF-CONTEXT-INVENTO
…[card truncated]

## frontend-app — Frontend Web App + Phone App
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="frontend app" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:frontend-app]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- > Open threads / risk areas distilled from this galaxy's memories (advisory):
2. **Offline-tolerance for mobile** — shop-floor WiFi is unreliable; every action that mutates state must work offline + sync on reconnect (idempotency-keyed POST).
4. **Schema-derived types** — never hand-write dispatcher response types; codegen from Zod schemas (papa-coordinated).
- **English-only UI shipped to operators** — repeated regression; safety strings (ala
…[card truncated]

## hermes-zulu — Hermes/Zulu Building + Stub Hunting + Fleet Orchestration
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="hermes zulu" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:hermes-zulu]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-11
- **OPEN-TASKS LEDGER (read this to regain context fast):** `state/shared/specs/BRAVO-HERMES-ZULU-OPEN-TASKS-LEDGER.md` — curated ROI-ordered open queue (supersedes the noisy auto-consolidated handoff + stale BRAVO-TRIAGE-2026-05-19). Keystone = U4 5h-quota populator.
- **MASTER CONTEXT LEDGER (2026-06-11, zulu master-brain pass):** `state/shared/specs/ZULU-MASTER-CONTEXT-LEDGER-2026-06-11.md` -- 61 ROI-ranked items (30 to-complete / 15 unfinished / 16 dorma
…[card truncated]

## knowledge-conversion — knowledge-conversion .md
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="knowledge conversion" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:knowledge-conversion]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- > Open threads / risk areas distilled from this galaxy's memories (advisory):
- **NEVER auto-emit engines** — the router emits an ADVISORY ledger only; it never writes source. `advisoryOnly + mustHumanVerify` on every generated ledger.
- **R8 read-before-write** — pure-core + injected readers (RGS-TOOL-MS1 pattern); content cross-ref against existing PRISM before classifying as missing.
- **1 real-data E2E test per pipeline**
…[card truncated]

## lathe — per-domain cascade index (P1+P4 hybrid, 2026-05-27)
- > **Per-domain memory cascade** per SCOPE-EXPANSION-OPERATOR-7-DIRECTIVES-2026-05-26.md §Q2. Auto-loads when Claude edits under `mcp-server/src/engines/lathe/`. Companion to `./CLAUDE.md` (alpha-authored first-pass, R7-flagged for lathe-soul refinement).
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="lathe" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:lathe]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- > Open threads / risk areas distilled from this galaxy's memories (advisory):
- `ml_dtw` (DynamicTimeWarping) — elastic alignment of turning-pass signatures: rough-vs-finish, boring-bar defle
…[card truncated]

## mill — per-domain cascade index (P1+P4 hybrid, 2026-05-27)
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="mill" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:mill]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- **Safety Checks**: The mill's spindle-power safety check is grounded in physics gate #3 through commit `dee4c4ad68`. [reference/reference_mill_producer_power_headroom_2026_06_02]
- Parent doctrine: [`state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](../../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md)
- _Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md R
…[card truncated]

## mit-curriculum — mit-curriculum .md
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="mit curriculum" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:mit-curriculum]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- **academy** (`engines/academy/`) — CONSUMER: teaches courses/curriculum/lessons sourced from here (master `MEMORY.md` `[galaxy:academy]`; `knowledge-conversion-ms0.md` adjacency).
- **pdf-corpus** (`engines/pdf-corpus/`) — sibling SOURCE corpus (master `MEMORY.md` `[galaxy:pdf-corpus]`; galaxy `CLAUDE.md` cross-galaxy edge `↔ pdf-corpus`).
- > Open threads / risk areas distilled from this galaxy's memories (advisory):
- **Course Title Pending**: M
…[card truncated]

## pdf-corpus — pdf-corpus .md
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="pdf corpus" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:pdf-corpus]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- **Rule (user directive, 2026-05-26):** For all PDF→tribal-knowledge ingestion, use Lima's pypdf page-by-page extractor instead of pdf-parse-extract.mjs [feedback/feedback_use_lima_pypdf_page_extractor].
- **knowledge-conversion** (`engines/knowledge-conversion/`) — produces raw PDFs into the 6-node router; symmetric edge per CLAUDE.md.
- Canonical extractor script (this tree): `scripts/extract-jm-die-corpus-page-by-page.py` — pypdf, ease-first queue order, page-l
…[card truncated]

## pdf-corpus-mill — pdf-corpus-mill .md
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="pdf corpus mill" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:pdf-corpus-mill]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- **pdf-corpus** (`engines/pdf-corpus/`) — PARENT extractor; this galaxy is its mill-filtered subset (`./CLAUDE.md` §Cross-galaxy edges).
- **post-processor** (`engines/post-processor/`, echo) — Haas Mill / Mazak Matrix controller-dialect mining from the same manual corpus (`./CLAUDE.md`).
- > Open threads / risk areas distilled from this galaxy's memories (advisory):
- `scripts/generate-milling-extracted-pdf-bridge.mjs` — mill PDF → extracte
…[card truncated]

## post-processor — Post-Processors (G-code emission · controller dialects · MasterPost · JM .cps fleet)
- > Clone of `state/shared/specs/MASTER-BRAIN-TEMPLATE.md` (alpha owns the template; echo fine-tunes for post-processor — does NOT re-derive brain wiring).
- **UP (pull from master):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="post-processor controller dialect masterpost" topK=20`
- **DOWN (push to master):** write `<type>_echo_<topic>.md` → `C:/Users/wompu/.claude/projects/H--prism/memory/` → fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs` at Stop
- **MASTER-INDEX edge:** master `MEMORY.md` `## Indexed memories` carries `[galaxy:post-processor] …` back-pointer (registered 2026-05-28, STEP 5d)
- **Last master-sync:** 2026-06-10  (bump on every PULL reconcile; older than galaxy-dir mtime => re-pull before work)
- **R12 note (2026-05-28):** qdrant was DOWN at galaxy birth -> live semanti
…[card truncated]

## quality — quality .md
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="quality" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:quality]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- > Open threads / risk areas distilled from this galaxy's memories (advisory):
- **NEVER inline physics/safety constants** — import from `mcp-server/src/physics/constants.ts` (root CLAUDE.md §SAFETY; confirmed present).
- **DB intake (juliett-owned, see `./PATHS.md`)** — `ToleranceDB` (ISO 286, 260 entries) · `FormulaDB` (499) via `prism_data:database_search`.
- _Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §C
…[card truncated]

## quoting — per-domain working brain (slot:charlie)
- > Cloned from `state/shared/specs/MASTER-BRAIN-TEMPLATE.md` (alpha-owned canonical brain pattern) and fine-tuned for the quoting domain — brain WIRING is identical across slots by design; only the domain content below differs. Galaxy-buildout 2026-05-28 (supersedes the 2026-05-27 STUB).
- **UP (pull from master):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md`
- — recall: `prism_memory:semantic_search query="quote pricing margin cost estimation" topK=20`
- **DOWN (push to master):** write `<type>_charlie_<topic>.md` →
- `C:/Users/wompu/.claude/projects/H--prism/memory/` → fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs` (Stop hook)
- **Last master-sync:** 2026-06-11   ← bump on every PULL reconcile; older than the galaxy dir mtime ⇒ re-pull before work
- [[reference_quoting_closed_loop_engine_2026_05_26]] — closed-loop self-improving controller, iter46 commit `b1914ea4cb` (the learnin
…[card truncated]

## shop-floor — shop-floor .md
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="shop floor" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:shop-floor]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- **Sample wiki:** `knowledge/wiki/os/commands/shop-floor-query.md` · `knowledge/wiki/architecture/domain-adaptive.md` · `knowledge/wiki/architecture/lathe-adaptive-pipeline-assessment-2026-05-27.md` · `knowledge/wiki/architecture/shop-floor-galaxy.md`
- **Exclusions** (CLAUDE.md §1): prediction/pre-execution validation and G-code generation are owned by other galaxies, not shop-floor.
- Critical resource roots (generated block in `PATHS.md`): `H:/PRISM/JM DIE/{SETUP
…[card truncated]

## speed-feed — Speed-Feed .md (2026-05-27 STUB)
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="speed feed" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:speed-feed]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- > until LoRA training ships). Full sweep: `state/shared/specs/SFC-ORPHAN-WIRE-QUEUE-2026-06-11.md`. Memories:
- The 3 genuinely-dark SFC learning engines are now wired into `prism_calc` (the calibration loop was OPEN -- predictions in, actuals could never come back):
1. ~~**`SpeedFeedOutcomeFeedbackBridgeEngine.tryBusCapture()` is a hardwired `return true`**~~ -- FIXED 2026-06-22 (`U-SFC-OUTCOME-BUS-REAL`): now calls the real `captureSFC` (sfcOutcomeW
…[card truncated]

## system-viz — System-Viz Upgrades, Integration & Utilization
- > Galaxy brain for domain **system-viz**. Cloned + fine-tuned from `state/shared/specs/MASTER-BRAIN-TEMPLATE.md` (alpha-owned canonical) — brain wiring NOT re-derived.
- **MASTER-INDEX edge:** master `MEMORY.md` `### Galaxy brain back-pointers` carries the `[galaxy:system-viz] …` row (added 2026-05-29).
- **Last master-sync:** 2026-06-15   ← bump on every PULL reconcile; older than the galaxy dir mtime ⇒ re-pull before work.
- [[reference_sierra_split_out_file]] — generate-system-viz → architecture-graph.json (no merged-graph clobber)
- [[reference_sierra_regen_fast_registration_gap_2026_05_29]] — 9 *-features.mjs absent from regen-viz FAST[]; merge loads by output-json name not generator filename (U-VIZ-FAST-REGISTER-9). **UPDATE 2026-06-21 (verified): 5+/9 now wired in FAST[] (quoting-pipeline / run-hotel-domain / milling-tribal-tip-bridge / svi-component / vendor-catalog); the "blocked on merge-OOM" reason
…[card truncated]

## token-optimization — Token Optimization + Efficiency Hunting + Obsidian + Per-Chat Galaxy Buildout
- > First compliant exemplar of `state/shared/specs/MASTER-BRAIN-TEMPLATE.md` (alpha owns the template — owner eats its own dogfood).
- **UP (pull from master):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="token cache budget efficiency" topK=20`
- **DOWN (push to master):** write `<type>_alpha_<topic>.md` → `C:/Users/wompu/.claude/projects/H--prism/memory/` → fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` `## Indexed memories` carries `[galaxy:token-optimization] …` back-pointer
- **Last master-sync:** 2026-05-28
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
5. **Injection budget + compaction integrity** (FLEET-INJECTION-BUDGET-AUDIT, 2026-06-11) — empirical fleet floor ~3.2KB/turn/slot (60 UserPromptSubmit injectors x up to 26 slots). **THE compaction doct
…[card truncated]

## tribal-knowledge — tribal-knowledge .md
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="tribal knowledge" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:tribal-knowledge]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- **knowledge-conversion** — `engines/knowledge-conversion/` consumes Lane-A tribal tips (symmetric edge in CLAUDE.md §Related galaxies)
- **post-processor** — `PostProcessorTribalKnowledgeIntegrationEngine.ts` (cited-tip pipeline output, PP-TRIBAL-INT)
- **database-expansion** — juliett-owned KnowledgeDB intake (PATHS.md registered-db-intake block)
- **Every galaxy emits + consumes.** Per `engines/tribal-knowledge/CLAUDE.md` §Cross-galaxy
…[card truncated]

## wedm — per-domain cascade index (P1+P4 hybrid, 2026-05-27)
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="wedm" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:wedm]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- > Open threads / risk areas distilled from this galaxy's memories (advisory):
- Parent doctrine: [`state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](../../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md)
- _Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._
- Pull-fresh-on-demand EXTERNAL knowledge for wedm (keeps this domain no
…[card truncated]

## wiring — ROMEO slot cross-session learnings
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="wiring" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:wiring]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- [[../discovery/MEMORY.md]] — tango's orphan-rescue history is romeo's lookahead
- [[../bug-hunting/MEMORY.md]] — uniform's silent-failure findings tell romeo which prior wires regressed
- [[../backend-helper/MEMORY.md]] — papa's TSC-fix campaigns inform what NOT to wire mid-fix
- **Table-driven ACTION_MAP is canonical** — `audit-unwired-engines.mjs` reads each dispatcher's action enum directly (fixed 2026-05-18 `9e27d9d42`). Don't reinvent the scanner;
…[card truncated]