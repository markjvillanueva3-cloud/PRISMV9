# shop-floor Galaxy — fleet-managed (no dedicated slot)
> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = shop-floor domain doctrine ONLY; never re-inline universal prose.

---

## §1 — Domain scope + slot identity

**Owns:** real-time machine status streaming, spindle-load / override-percent feedback, alarm intake +
severity mapping, job traveler tracking, job-cost vs actual rollups, operator-day digest,
per-machine adaptive feedback loops, operator check-in surface, OEE calculation, shop practice KB.

**EXCLUDES:** prediction / pre-execution validation (per-domain galaxies: mill/lathe/wedm),
G-code generation (post-processor / echo), payroll / HR accounting (business / hotel),
quote generation (quoting / charlie).

**Slot:** fleet-managed — no dedicated slot. Any slot may work here; claim via `/pick-unit` +
heartbeat before editing. Worktree follows the claiming slot's `H:/prism-slot-<nato>` / `slot/<nato>`.

---

## §2 — Verified engines

No `.ts` files in `mcp-server/src/engines/shop-floor/` — engines live in the flat engines dir.

| Role | Engine file (verified on disk) |
|---|---|
| Central state owner — ALL job/traveler/labor/approval mutations | `ShopStateEngine.ts` |
| Real-time shop floor status dashboard | `ShopFloorDashboardEngine.ts` |
| Job tracking + work order management | `ShopFloorJobEngine.ts` |
| Job-cost vs actual rollups | `ShopFloorCostEngine.ts` |
| Operator check-in surface | `ShopFloorCheckInEngine.ts` |
| Production reports + analytics | `ShopFloorReportEngine.ts` |
| Production scheduling + capacity | `ShopFloorScheduleEngine.ts` |
| Centralized shop rate + machine config (21 machines) | `ShopConfigurationEngine.ts` |
| Shop layout management | `ShopFloorLayoutEngine.ts` |
| Shop data completeness + gap analysis | `ShopDataCompletenessEngine.ts` |
| Job traveler tracking (NOT `TravelerEngine` — does not exist) | `JobTravelerEngine.ts` |
| Job lifecycle state machine | `JobLifecycleEngine.ts` |
| Per-machine adaptive feedback — cross-galaxy with business/HR | `EmployeePerMachineSFAdaptiveEngine.ts` |
| Operator-facing mobile surface | `EmployeeShopFloorMobileEngine.ts` |
| Override-percent feedback loop | `AdaptiveOverrideEngine.ts` |
| Live spindle adaptive control | `AdaptiveSpindleControlEngine.ts` |
| E2 ERP shop connector | `E2ShopConnectorEngine.ts` |
| Outcome ingest — feeds LoRA + GNN ref pool | `ShopOutcomeIngestProcessorEngine.ts` |
| Operator note ingest → tribal knowledge | `ShopFloorNoteIngestionEngine.ts` |

---

## §3 — Dispatcher quick-ref

| Dispatcher file | MCP tool | Actions | Primary use |
|---|---|---|---|
| `machineLiveDispatcher.ts` | `prism_machine_live` | 40 | Machine connectivity, adaptive control, predictive maintenance, Industry 4.0 |
| `shopDispatcher.ts` | `prism_shop` | 46 | Job/traveler/labor/cost/scheduling/dashboard |
| `shopPracticeDispatcher.ts` | `prism_shop_practice` | ~20 | Practice KB ingest/search, trouble trees, material tips, playbook |
| `automationDispatcher.ts` | `prism_automation` | 5 | OEE calc, bottleneck analysis, digital thread, work instructions, shift handoff |

**Most-used action patterns:**
```
prism_machine_live: machine_connect · machine_live_status · machine_all_status
                    adaptive_chipload · adaptive_override · adaptive_status
                    predictive_maintenance_analysis · alert_acknowledge · alert_history
prism_shop:         cost_clock_in · cost_clock_out · completeness_calculate
prism_automation:   oee_calc · bottleneck · shift_handoff
prism_data:         database_search (AlarmDB 10,090 entries · MachineDB 1,015 entries)
```

**MCP-down fallback:** `cd mcp-server && rtk npx vitest run -t "ShopFloor|MachineLive|Traveler"`

---

## §4 — Canonical constants + data paths

**NEVER inline per-machine axis limits** — pull from `mcp-server/src/data/jm-die-profile.ts`
(21 machines × axis limits × rates). Hardcoding produces silent 25.4× unit errors on metric/inch mix.

**Alarm data — verified paths:**
```
mcp-server/src/data/alarm-categorization.ts        ← alarm category definitions (VERIFIED)
mcp-server/src/data/alarm-fix-procedures.json       ← fix procedure library (VERIFIED)
mcp-server/src/data/controller-alarm-database.json  ← per-controller alarm codes (VERIFIED)
mcp-server/data/databases/AlarmDB/                  ← 10,090 entries — query via prism_data:database_search
```
`alarm-registry.ts` does NOT exist — never reference it.

**Schema imports (verified):**
```typescript
import type { ShopEvent } from "../../schemas/shop/shopDomain.js";       // Job/Traveler/Labor types
import type { ... } from "../../schemas/machineLiveActionSchemas.js";     // machine-live action contracts
```
Every live event MUST conform to `ShopEvent` shape before emission.

**DB stores (query via `prism_data:database_search` — never full-read):**
- **AlarmDB** — 10,090 alarm entries (controller × code × severity × fix)
- **MachineDB** — 1,015 machine entries (specs, limits, per-machine envelope)
- **ReportTemplateDB** — 7 report templates
- Registered in `mcp-server/data/databases/DB_MANIFEST.json`

**JM Die ground truth paths:**
```
H:/PRISM/JM DIE/SETUPS/       ← setup sheets per machine/job
H:/PRISM/JM DIE/QUEUE/        ← active job queue
H:/PRISM/JM DIE/CONTROLLERS/  ← controller configs (Haas, Okuma, Hurco, Fanuc, Roku-Roku)
mcp-server/data/jm-die-database/ ← 38,251 indexed files (manifest.json + .index/*.jsonl)
```

---

## §5 — Domain gotchas / safety rails

1. **`ShopStateEngine` is the ONLY state mutator.** ALL job lifecycle, traveler, labor, and approval
   changes MUST flow through it — direct mutations bypass the WebSocket event bus and create silent
   staleness visible across the whole shop-floor dashboard.
2. **Never stream alarm codes without severity mapping.** Raw codes from `controller-alarm-database.json`
   without `alarm-categorization.ts` lookup are unactionable and may silently suppress P0 alarms.
3. **`JobTravelerEngine`, NOT `TravelerEngine`.** `TravelerEngine` does not exist on disk — using that
   name will cause a runtime import failure.
4. **Never publish a cost rollup before job completion.** `ShopFloorCostEngine` has a completion guard;
   bypassing it produces misleading actuals vs quoted values reported to business/ERP.
5. **MTConnect is read-only.** Never attempt to mutate machine state via MTConnect vocabulary — it is
   a telemetry protocol only (ISO 22400 / MTConnect standard).
6. **Machine-live status updates must pass through `machineLiveDispatcher` validation.** Injecting
   status from untrusted sources (web scrape, manual override) bypasses the adaptive-control safety layer.
7. **Operator-facing output: Polish/Spanish-primary.** JM Die shop-floor operators are not English-first
   (memory: `project_jm_die_shop_floor_languages.md`). `EmployeeShopFloorMobileEngine` and
   `ShopFloorCheckInEngine` output must not assume English-only strings.

---

## §6 — What NOT to do (domain refuses)

- **NEVER bypass `JobTravelerEngine` validation** — direct traveler state writes skip quality-gate hooks
  (compliance-safety cross-galaxy edge) and break audit trails.
- **NEVER reference `alarm-registry.ts`** — file does not exist; use `alarm-categorization.ts` +
  `controller-alarm-database.json`.
- **NEVER reference `TravelerEngine`** — class does not exist; the real engine is `JobTravelerEngine.ts`.
- **NEVER inline per-machine axis limits or rates** — always load from `jm-die-profile.ts`.
- **NEVER build prediction / pre-execution logic here** — that is per-domain galaxy territory
  (mill/lathe/wedm). Shop-floor owns LIVE telemetry only.
- **NEVER write to `knowledge/tribal/*.md` directly** — use
  `prism_knowledge:tribal_capture slot=<nato>` (auto-overwritten otherwise).
- **NEVER full-read `shopDispatcher.ts`** (large) — grep the specific case or query `prism_shop`.
- **DO NOT infer machine count from code** — `ShopConfigurationEngine.ts` is the canonical 21-machine
  source; read it, never hardcode.

---

## §7 — Domain workflow / pipeline contract

Live machine telemetry flow:
```
machine event (MTConnect/OPC-UA)
  → machineLiveDispatcher (validate + normalize)
  → ShopStateEngine (state mutation + ShopEvent emit)
  → WebSocket room (prism_machine_live:machine_live_status → dashboard)
  → AdaptiveOverrideEngine / AdaptiveSpindleControlEngine (feedback)
  → ShopOutcomeIngestProcessorEngine (outcome → LoRA + GNN ref pool)
```

Alarm intake flow:
```
raw alarm code
  → alarm-categorization.ts lookup (severity + category)
  → controller-alarm-database.json (fix procedure)
  → prism_automation:bottleneck OR compliance-safety edge (P0 propagation)
```

---

## §8 — Tribal + corpus pointers

**Wiki entries (query first):**
- `knowledge/wiki/shop-floor/` — 6 entries (shop-floor foundations, OEE, MTConnect, Andon/5S)
- `knowledge/wiki/shop-floor/shop-floor-foundations.md` — OEE = Availability × Performance × Quality;
  MTConnect read-only; Six Big Losses; ISO 22400-1/22400-2 KPI framework (VERIFIED 2026-06-09)

**Staging (UNVERIFIED numeric/control specifics — owner-gate before use):**
- `knowledge/wiki/shop-floor/_staging/deep-domain-research-2026-06-09.md`

**Vault recall:** `prism_memory:semantic_search query="shop-floor" topK=20`

**JM Die corpus:** use `prismSelfAwarenessEngine.getJMDieCustomerPath()` — NEVER Glob the 38K-file tree.

**Tribal write:** `prism_knowledge:tribal_capture slot=<nato> domain=shop-floor` — never write
`knowledge/tribal/*.md` directly (auto-overwritten by the tribal-knowledge pipeline).

---

## §9 — Cross-galaxy edges (PSN)

| This galaxy produces | Consumer | Mechanism |
|---|---|---|
| Live spindle/override telemetry | mill · lathe · wedm | `prism_machine_live` → per-domain adaptive engines |
| Alarm events (severity-mapped, P0) | compliance-safety | live alarm propagation edge |
| Per-cut Cpk measurements | quality | `prism_data` + `ShopStateEngine` events |
| Job cost vs actual | business / ERP | `EmployeePerMachineSFAdaptiveEngine` rollup → `prism_shop` |
| Operator notes | tribal-knowledge | `ShopFloorNoteIngestionEngine` → `knowledge/tribal/` |
| Outcome data | ai-training (india) | `ShopOutcomeIngestProcessorEngine` → LoRA + GNN ref pool |

**Consumes from:**
- mill / lathe / wedm — spindle-load reference profiles for adaptive-baseline calibration
- business / hotel — employee + shift schedule (cross-galaxy `EmployeePerMachineSFAdaptiveEngine`)
- compliance-safety — S(x) gate thresholds for alarm escalation rules

---

## §10 — Closed-loop integration (india)

On every shipped outcome: `prism_ai:xproc_outcome_publish { slot: '<claiming-nato>', domain: 'shop-floor' }` // UNVERIFIED action name — grep `xproc` in `intelligenceDispatcher.ts` before use.
Tribal capture on every operator note / alarm fix: `prism_knowledge:tribal_capture slot=<nato>`.
Full spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.

---

## §11 — Test commands

```bash
# Domain-filtered test run
cd mcp-server && rtk npx vitest run -t "ShopFloor|MachineLive|Traveler|shopDispatcher|shopPractice"

# Specific dispatcher tests
rtk npx vitest run src/__tests__/shopDispatcher.test.ts
rtk npx vitest run src/__tests__/shopPracticeDispatcher.test.ts
```

---

## §12 — Known bugs / open threads

- **Action count discrepancy:** MEMORY.md cites `prism_machine_live` as 74 actions; dispatcher header
  states 40 actions (VERIFIED). The 40-action count is authoritative — grep `machineLiveDispatcher.ts`
  before quoting the number.
- **`shopPracticeDispatcher` action count:** header omits total; enumerate from the case list before
  reporting.
- **Open work queue:** `state/shared/AGENT_WORKBOARD.md` + `mcp-server/data/roadmap-index.json`
  (ghost roost `ghost.galaxy.shop-floor` in system-viz).

---

## §13 — AI / reasoning surface

```bash
node scripts/lib/galaxy-reasoning-bridge.mjs shop-floor "<question>"
```

**Ollama routing:**
- Alarm triage / MTConnect status summarize / downtime classify → `gpt-oss:20b`
- Engine/hook/test code → `qwen2.5-coder:32b`
- S(x) safety + adaptive-control decisions → Claude (never local)
- Deep domain reasoning (OEE root cause, cross-machine correlation) → `gpt-oss:120b`

## AI Synergy (PSN leg #10)

This galaxy is an AI-substrate **consumer** (no dedicated AI engines of its own; `aiEngineCount` 0).
It participates in PRISM's AI systems through the shared, fleet-wide substrate:

- **Reasoning bridge** (`scripts/lib/galaxy-reasoning-bridge.mjs`, PSN leg #10): **CAG** + **RAG** hybrid
  reasoning over this galaxy's own doctrine corpus (CLAUDE.md / SOUL.md / MEMORY.md / synthesis) via the
  local Ollama stack -- `node scripts/lib/galaxy-reasoning-bridge.mjs shop-floor "<question>"`.
- **Vault -> LoRA**: this galaxy's Obsidian **synthesis** brain (`knowledge/memories/patterns/shop-floor_synthesis.md`)
  feeds the fleet **LoRA** training dataset (`scripts/vault-to-lora-dataset.mjs`).
- **GNN** (GraphSAGE) tier-5: this galaxy's ghost-wiring candidates are classified by the **neural** wiring-inference
  cascade; **embedding**-based semantic recall surfaces its memories.
- **Cross-substrate edges**: typed `owned-by-slot` + `documented-by` + `embeds` edges connect it into the
  system-viz graph (`scripts/generate-cross-substrate-edges.mjs`).

_Measured by the AI-synergy audit (`scripts/audit-ai-synergy.mjs`, dimension `discoverability`). This section
documents verified-true substrate participation (signals pulled from the audit) -- it is doctrine, not duplication._
