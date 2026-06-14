# QUEBEC Galaxy Memory — Frontend Web App + Phone App

Append-only cross-session memory for the quebec slot.

## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="frontend app" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:frontend-app]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/frontend-app_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **Operator directive on issues**: Known failures and conflicts must be fixed in-session rather than just recorded. [feedback/feedback_bravo_golf_papa_quebec_fix_known_failures]
- **Document population**: Every PRISM app feature should be populated with all JM Die documents to ensure accountability and context. [reference/reference_jm_doc_population_ms0_2026_06_02]
- **Ground-truth extraction**: Use ground-truth extractors for Mastercam .MIN files to ensure accurate data representation. [reference/reference_mike_lathe_ground_truth_2026_05_24]
- **Lathe finishing practice**: Turned ODs that require press-fitting or tight roundness are left oversized for post-turn grinding, while bores receiving press-fit carbide sleeves are undersized. [reference/reference_jm_lathe_finishing_allowances_carbide_pressfit_2026_06_01]
- **Localization**: PRISM surfaces must support localization for Polish and Spanish-speaking operators. [project/project_jm_die_shop_floor_languages]
- **End-to-end testing**: The JM-Die shop page is thoroughly end-to-end tested with 30/30 passes across various tabs, REST endpoints, and panels. [reference/reference_jm_die_shop_page_e2e_verified_2026_05_24]
- **Custom portals**: Development of phone-first portals to address gaps not covered by existing systems, such as the employee mobile portal. [reference/reference_employee_mobile_portal_2026_05_23]

## Indexed memories
- **Domain corpus (live counts):** 10 curated memory file(s) · 707 wiki entr(y/ies) · 24 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 9 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="frontend-app" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/_legacy-root/feedback_backend_before_frontend.md` · `knowledge/memories/_legacy-root/feedback_frontend_codex.md` · `knowledge/memories/_legacy-root/feedback_ppg_frontend.md` · `knowledge/memories/reference/reference_academy_frontend_gap_2026_05_25.md` · `knowledge/memories/reference/reference_quebec_frontend_galaxy_2026_05_28.md`
- **Sample wiki:** `knowledge/wiki/os/commands/frontend-merge-plan.md` · `knowledge/wiki/lessons/backend-perfection-before-frontend.md` · `knowledge/wiki/lessons/frontend-development---codex-page-protection.md` · `knowledge/wiki/architecture/frontend-app-galaxy.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/ui-ux-ai-mutations-flag-gated.md` · `knowledge/wiki/code-tribal/youtube-rXyzn77gfUI.md` · `knowledge/wiki/code-tribal/learnings/echo-winmax-u-winmax-ui-click.md`

## Cross-galaxy bridges
- `engines/business/` (hotel) — quote views, time-clock, scheduling UI
- `engines/mill/lathe/wedm/cam/cad` — output viewers (G-code preview, toolpath 3D, blueprint OCR result)
- `engines/post-processor/` (echo) — embedded G-code preview
- `engines/token-optimization/` (alpha) — bundle-size + cache-control audits
- `engines/database-expansion/` (juliett) — quebec consumes Qdrant similarity search for "similar parts"

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **Statusline.mjs crash**: The `statusline.mjs` script crashed due to a TDZ ReferenceError; this needs resolution to ensure the fleet-wide status line functions correctly. [reference/reference_statusline_tdz_regression_2026_05_29]
- **PrintToProgramPipelineEngine issue**: The PrintToProgramPipelineEngine is wired but only ships one of four required components, indicating a partial implementation that needs completion. [reference/reference_kilo_queue_revisit_2026_05_23]

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Standing focus (quebec-canonical)

1. **Operator localization (Polish + Spanish) is P0** — JM Die shop floor is majority Polish/Spanish primary (per [[project_jm_die_shop_floor_languages]]). Safety-critical strings (alarm decode, G-code preview warnings, machine-load alerts) translate FIRST, not last.
2. **Offline-tolerance for mobile** — shop-floor WiFi is unreliable; every action that mutates state must work offline + sync on reconnect (idempotency-keyed POST).
3. **Cold-cache boot under 3 s** — the cached PRISM cold-tier (`CLAUDE.md` + `MEMORY.md` + `ENGINE_DIGEST.md` etc, ~2 MB total) frames the cold boot budget; frontend bundle + first-paint must fit a similar timing budget on a tablet.
4. **Schema-derived types** — never hand-write dispatcher response types; codegen from Zod schemas (papa-coordinated).

## Known regression classes

- **English-only UI shipped to operators** — repeated regression; safety strings (alarm, e-stop, fault) MUST be in operator's primary language, every release.
- **Frontend silently treating dispatcher error as zero** — a `200 OK` with `{result: null, error: "..."}` rendered as "0 jobs" instead of "Cannot reach server, retrying..." (the silent-zero class).
- **Re-render storm on real-time telemetry** — spindle-load WebSocket at 10 Hz × 5 machines × 12 chart components = 600 re-renders/sec without debounce; virtualize.
- **`useEffect` dispatcher-fetch race on tab-switch** — two tabs both fire their effect on mount; second cancels first; user sees stale data. Use AbortController + request key.
- **Polish character mis-encoding** — UTF-8 round-trip discipline: every storage layer + every frontend boundary explicitly UTF-8 (Latin-1 silent corruption class).

## Cross-galaxy bridges

- `engines/business/` (hotel) — quote views, time-clock, scheduling UI
- `engines/mill/lathe/wedm/cam/cad` — output viewers (G-code preview, toolpath 3D, blueprint OCR result)
- `engines/post-processor/` (echo) — embedded G-code preview
- `engines/token-optimization/` (alpha) — bundle-size + cache-control audits
- `engines/database-expansion/` (juliett) — quebec consumes Qdrant similarity search for "similar parts"

## Wiki cross-refs

- [[project_jm_die_shop_floor_languages]] (operator localization mandate)
- [[architecture/prism-frontends-overview]] · [[architecture/operator-kiosk-mode]]
- [[architecture/customer-portal-tokens]] · [[architecture/offline-mobile-sync]]
- [[feedback_no_public_h_drive]]

— Established 2026-05-28 by slot:alpha claude-168624b9 (quebec-pending).

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Domain anchors (papa 2026-06-09, GALAXY-ENRICH infra lane)
Next.js 15 App Router / React 19 web app; pure consumer of prism_* dispatchers via HTTP bridge.
**Internal corpus (primary):** cross-cutting methodology `state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md` + this galaxy's engines `mcp-server/src/engines/frontend-app/` + the operator article-set themes (loops / harness / LoRA / CAG / RAG / obsidian-vault).
**Authoritative free external sources (VERIFIED, papa AI/software domain):**
- [Next.js documentation](https://nextjs.org/docs)
- [React documentation](https://react.dev/)
R12: nameable free authoritative references for an AI/software domain (papa's expertise) -- VERIFIED + integrated live, not owner-gated. Regen: `scripts/integrate-infra-domain-anchors.mjs`.

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->
