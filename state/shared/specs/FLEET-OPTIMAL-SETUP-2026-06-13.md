# FLEET OPTIMAL SETUP — per-slot engines, model routing, settings & setup

> **Authored by zulu (master orchestrator) 2026-06-13.** The canonical RECOMMENDED configuration for every
> NATO slot, keyed to its domain galaxy. **ADVISORY** — this is the orchestrator's "ultimate-knowledge" config
> map, NOT auto-applied settings. Each slot/owner applies its row in a clean session. Source of truth for
> slot→galaxy: `state/shared/CHAT-SLOT-DOMAINS.md` + per-slot souls (`state/shared/slot-souls/<slot>.md`).
> Safety tiers: `state/shared/omega-thresholds.json`. Universal rails: root `CLAUDE.md`.

## Routing principle (applies to every slot)
**Fallback ladder (operator 2026-06-11):** Ollama (free, local) → Sonnet subagent (cheap) → Opus/Fable (deep).
- **Ollama** (`ask-ollama.mjs`, qwen2.5-coder:32b / gpt-oss:120b): explain/summarize/classify/lint/docstring/
  diff/triage/graph-search — NEVER safety-critical G-code.
- **Hermes** (`ask-hermes.mjs`, xAI Grok via :8645, outside Claude ctx): per-galaxy PLANNING / deep reasoning
  when you want a stronger non-Claude model without spending Claude tokens (proven 2026-06-13 as the planner).
- **Claude Sonnet**: mechanical read/inventory/wiring/UI subagents.
- **Claude Opus / Fable**: judgment, safety, physics, architecture, synthesis.
- **Safety NEVER local**: any cutting-physics → G-code path stays on Claude + `prism_safety` validation.

## Per-slot configuration matrix

| Slot | Galaxy (`engines/<g>/`) | Key dispatchers/engines | Model tier | Subagent | Safety tier | Commit lane |
|------|------------------------|-------------------------|-----------|----------|-------------|-------------|
| **alpha** | token-optimization + tribal-knowledge | tribal-rerank, CAG router, ollama-offload | Sonnet (token work) / Opus (synthesis) | reviewer | sim/explore | slot/alpha |
| **bravo** | hermes-zulu (builder) | Hermes engines, dream-cycle, stub-hunter | Opus (arch) | code-analyzer | proven-out | slot/bravo |
| **charlie** | quoting | QuoteEstimator, cost/margin engines, DocuStrata pricing | Opus (cost logic) / Sonnet (FE) | reviewer | production | slot/charlie |
| **delta** | cad | cadDispatcher (cad_atomic_ops, cad_creo_ribbon), feature-recognition, STEP AP242 | Opus | code-analyzer | production (geometry) | slot/delta |
| **echo** | post-processor | MasterPost, `.cps` fleet, controller dialects, cam-post-lint | **Opus** (G-code) | reviewer + post-validate | **shop_floor** | slot/echo |
| **foxtrot** | mill | prism_mill (49 actions), SpeedFeedOrchestrator triad | **Opus** + physics | **physics-review-agent** | **shop_floor** Ω≥0.95 | slot/foxtrot |
| **golf** | fleet-hygiene | fleet-reaper, memory-monitor, task-health | Sonnet (sweeps) | code-analyzer | n/a (hygiene) | cad-fusion-live-ms0 (integrator) |
| **hotel** | business | ERP/HR/accounting, QuickBooks, GL/variance | Opus (financial+PII) / Sonnet (routine) | code-analyzer | production (financial) + PII gate | slot/hotel |
| **india** | ai-training | GraphSAGE GNN tier-5, ~95 LoRA, RAG, retrain-lifecycle | **Opus/Fable** (deep) + Blackwell GPU | code-analyzer | proven-out | slot/india |
| **juliett** | database-expansion | Qdrant/AgentDB/SQLite-WAL, jm-die-database | Sonnet (schema) / Opus (migration) | code-analyzer (schema-rigorous) | production | slot/juliett |
| **kilo** | cam | prism_cam triad (strategy→toolpath→collision), hyperMILL family | **Opus** + physics | physics-review-agent | **shop_floor** | slot/kilo |
| **lima** | academy | course/curriculum/lesson engines, MIT-OCW, pypdf corpus | Opus (design) / Ollama (extract) | reviewer | sim | slot/lima |
| **mike** | wedm | Wire Wizard (62 eng), discharge/skim/wire-break | **Opus** + physics | physics-review-agent | **shop_floor** | slot/mike |
| **november** | (U-DEA, sparse) | — | Sonnet | code-analyzer | sim | slot/november |
| **oscar** | speed-feed | UltimateSpeedFeedEngine, 9-axis orchestrator, prism_calc, prism_safety | **Opus** + physics | **physics-review-agent** | **shop_floor** Ω≥0.95 S(x)≥0.98 | slot/oscar |
| **papa** | backend-helper | build/TSC, MCP, infra (full reign, no gates) | Sonnet (mechanical) / Opus (arch) | build-doctor / code-analyzer | proven-out | slot/papa |
| **quebec** | frontend-app | Next.js web + phone, lib/api.ts → prism_* HTTP bridge | Sonnet (UI) / Opus (state arch) | reviewer | sim | slot/quebec |
| **romeo** | wiring | dispatcher-wiring closure, unwired-engine audit | Sonnet (wiring) / Opus (arch) | dispatcher-wirer / wiring-review-agent | proven-out | slot/romeo |
| **sierra** | system-viz | regen-viz (548MB graph), ghost-roosts, node-card | Opus (graph arch) | code-analyzer | proven-out | slot/sierra |
| **tango** | discovery | DuplicationGuard, master-index, capability surfacing | Opus | code-analyzer | proven-out | slot/tango |
| **uniform** | bug-hunting | silent-failure/stub/regression hunt, R12 enforce | **Opus** (subtle reasoning) | regression-hunter | proven-out | slot/uniform |
| **victor** | dormant-data | unused-asset surfacing → routes to romeo | Sonnet | code-analyzer | proven-out | slot/victor |
| **whiskey** | lathe | turningDispatcher (~238 eng), CSS/G50, threading | **Opus** + physics | physics-review-agent | **shop_floor** | slot/whiskey |
| **xray** | blueprint-vision | OCR/VLM ensemble (qwen2.5vl via Ollama), cadDispatcher | Opus (orchestration) + VLM-on-GPU | reviewer | production | slot/xray |
| **yankee** | (spare) | — | Sonnet | — | sim | slot/yankee |
| **zebra** | hermes-zulu (orchestrator alias) | fleet orchestration | Opus/Fable | reviewer | n/a | (orchestrator) |
| **zulu** | hermes-zulu (orchestrator) | routes; self-exempt; ask-hermes planner | **Opus/Fable** | reviewer | n/a (routes, no build) | (orchestrator) |

## Optimal-setup notes by cluster

### Cutting/physics slots — oscar, foxtrot, whiskey, mike, kilo, echo (SAFETY-CRITICAL)
- **Model: Opus** for any feed/speed/G-code/collision reasoning — NEVER route the safety-critical path to
  Ollama/Hermes. Mechanical sub-steps (summarize a manual, lint a log) MAY go local.
- **Mandatory `physics-review-agent`** in the per-file scrutiny pair for any engine touching Kienzle/Taylor/
  force/thermal. **Never inline constants** — import `src/physics/constants.ts`.
- **Safety tier `shop_floor`** (Ω≥0.95, S(x)≥0.98). `prism_safety:validate_physics` gate before emit.
- **UNITS-FIRST** — resolve inch/mm from source before any geometry/tool work (25.4× trap).
- Knobs: per-galaxy awareness inject ON; SFC variability batch tasks (oscar) keep running.

### AI / data slots — india, juliett, sierra, tango
- **india: Opus/Fable + Blackwell GPU** (96GB) — generous heaps (`--max-old-space-size`), GPU-resident models,
  high concurrency. GNN retrain heap-bumped (the lifecycle OOM fix). multi-seed before any AUROC claim.
- **juliett: atomic-write + schemaVersion + migration** discipline; never delete a JSONL ledger (rotate).
- **sierra: heap-heavy** (regen-viz 24GB+); ONE-canonical-writer of the 548MB graph; use node-card cheap reads.
- **tango: DuplicationGuard THROWS** — search-first before any create.

### Business / app slots — charlie, hotel, quebec
- **hotel: PII gate** on untrusted intake; financial-invariant tests; production safety tier.
- **charlie: cost logic = Opus**, frontend = Sonnet; closed-loop quote-vs-actual reconciliation.
- **quebec: pure consumer** of prism_* via HTTP bridge (:3100); Sonnet for most UI work.

### Infra / hygiene slots — papa, romeo, golf, uniform, victor, bravo
- **papa/sierra/bravo/golf/india: full reign** (ownership gate ADVISORY — coordinate, don't defer).
- **golf: keep the reaper running at all times**; commits to the integrator branch by design.
- **uniform: Opus** (silent-failure reasoning needs depth); **romeo/victor: Sonnet** for mechanical wiring.
- **Tier-1 routing harvest:** var-to-const / add-types / simple renames → `hooks_route` Agent-Booster (0ms/$0).

### Orchestrator slots — zulu, zebra
- **Opus/Fable; ROUTE, don't build.** Self-exempt from the sweep. Use `ask-hermes` as the per-galaxy planner.

## Universal settings (every slot)
- **Commit lane:** own `slot/<nato>` worktree (`H:/prism-slot-<nato>`) — NOT shared `H:/prism` (peer-absorption).
  Exceptions: golf (integrator), genuine cross-cutting fleet infra (`[MAIN-FORCE]`).
- **RTK prefix** on bash; **parallel** independent tool calls; **Glob/Grep** over bash find/grep.
- **Per-file 2-arm scrutiny** after each file in a multi-file build; **3-of-3** at Stop.
- **Auto-compact** trusted at threshold (R6); per-chat HANDOFF at session end.
- **Hooks:** universal rails in root `CLAUDE.md`; per-slot galaxy CLAUDE.md (`engines/<g>/CLAUDE.md`) cascades.

## Honest notes (R12)
- **ADVISORY config, not applied.** I did NOT edit 26 live `settings.json`/soul files — that is dangerous
  fleet-wide work, MCP was down, and would exceed safe scope from one high-context session. Each owner applies
  its row in a clean session (verify the exact engine/dispatcher names against `ENGINE_DIGEST.md` /
  `DISPATCHER_DIGEST.md` first — some engine names here are by-role where I could not verify the exact symbol).
- **Verify before applying:** model-tier + subagent recommendations are the orchestrator's judgment; tune per
  measured cost/quality. Souls already encode `preferred_subagent_type` + `domain_filter` per slot — this matrix
  consolidates + adds model/safety/lane guidance.
- Authored at ~2311K context (YELLOW) — treat as a first canonical draft; refine in a fresh session.

_Authored 2026-06-13 slot:zulu (master orchestrator). Companion to FLEET-KNOWLEDGE-MAX-ROADMAP-2026-06-13.md._
