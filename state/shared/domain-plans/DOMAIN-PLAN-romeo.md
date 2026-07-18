---
artifact: domain-buildout-plan
slot: romeo
galaxy: wiring
galaxy_dir: mcp-server/src/engines/wiring/
kienzle_pages: ["Kienzle Backend Wiring Map.dc.html"]
backend_dispatchers: [prism_dev, prism_session]
frontend_owner: quebec
status: draft
generated_by: romeo-plan-agent
generated_at: 2026-06-26
---

# DOMAIN BUILDOUT PLAN — ROMEO (wiring)

> Finalized plan to take the **wiring** galaxy to PhD-master depth, then test → simulate →
> validate → fine-tune, then build/flesh out the frontend from the Kienzle Claude-Design build.
> Universal rails (R1–R16 · scrutiny 3-of-3 · units-first · no-stub · no-inline-constants ·
> canonical physics from `src/physics/constants.ts`) bind every step → `H:/prism/CLAUDE.md`.
> Parent: `state/shared/domain-plans/00-MASTER-ORCHESTRATION-PLAN.md`.

## §1 — Domain identity & scope

- **Owns:** Systematic closure of the gap between "engine on disk" and "invokable via MCP
  dispatcher action." Romeo scores unwired engines by impact, proposes and lands dispatcher
  action stubs, writes round-trip tests, and drives the wired-vs-unwired ratio to zero. It
  also owns the wiring-status frontend surface (Backend Coverage & Front-End Map).
- **Excludes:** Engine creation belongs to domain galaxies; dispatcher architecture to papa/
  backend-helper; GNN model training to india/ai-training; orphan data audit to
  victor/dormant-data; system-viz graph refresh to sierra. Romeo WIRES; it does not build
  new engines or retrain models.
- **Slot worktree:** `H:/prism-slot-romeo` · branch `slot/romeo`
- **Galaxy brain:** `mcp-server/src/engines/wiring/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md`

## §2 — Current state (verified, not assumed — R12)

- **Scaffolding:** PARTIAL — galaxy brain files confirmed present (CLAUDE.md, MEMORY.md).
  AI-synergy audit score: `aiEngineCount=0` (consumer galaxy, no dedicated AI engines).
  13-artifact buildout gate: CLAUDE.md + MEMORY.md confirmed; AWARENESS.md absent (not
  created yet — noted, not blocking).
- **Engines / dispatcher actions:** 5 verified wiring-support engines in
  `mcp-server/src/engines/`: `AutoWiringEngine.ts`, `EngineUtilizationAuditorEngine.ts`,
  `DispatcherMapEngine.ts`, `WiringPotentialEngine.ts`, `AssetWiringSummaryEngine.ts`.
  Additional: `AlgorithmWiringEngine.ts`, `ExtractionWiringEngine.ts`,
  `ExtractedKnowledgeWiringEngine.ts`, `FormulaWiringEngine.ts`, `ReasoningWiringEngine.ts`.
  Live backlog (2026-06-13 regen): 3,789 canonical engines; WIRED-DIRECT 3,536; **UNWIRED
  54**; WIRE-EXEMPT 113; WIRED-VIA-ORCH 39. Key dispatcher surface used by romeo:
  `prism_dev:engine_util_audit`, `prism_session:dispatcher_map_compact`,
  `prism_session:master_index_query`.
- **Knowledge legs (PSN 11-leg):**
  - HEALTHY: Engines (wiring engines verified), Memories (56 files), Wiki (7,967 entries
    indexed), System-viz (cross-substrate `owned-by-slot` + `documented-by` edges live)
  - THIN: Tribal (40 tips — low for a cross-cutting methodology domain; target 80+),
    Algorithms (no dedicated algorithm assets), Formulas (none — domain is structural, not
    physics), NN/GNN (consumer-only; 54-node wiring-candidate ghost-roost feeds tier-5),
    PRISM-AI (CAG cold-anchor not yet seeded for wiring doctrine)
  - ABSENT: AWARENESS.md not on disk; LoRA dataset not yet emitted
- **Known landmines (R12):**
  - `stop_on_unwired_assets` bypassed fleet-wide by `PRISM_ALLOW_UNWIRED=1`
    (settings.json:45) — no-orphan guarantee is advisory until flag lifted.
  - `normalizeParams` in turningDispatcher/qualityDispatcher/postProcessorDispatcher is
    SHALLOW (top-level only); nested snake_case objects pass intact — do not expect camel
    mangling of nested keys.
  - Cross-dispatcher action name collision exists: `measure_summary` appears in both
    `integrationDispatcher.ts` AND `intelligenceDispatcher.ts`. Always grep before adding.
  - Dispatcher line-count gate: >5,000 lines → tsc memory pressure → sub-dispatcher required.
  - `outcome-bus-auto-tap.mjs` not found on disk — do not reference; use explicit
    `xproc_outcome_publish` calls.
  - Slot/romeo worktree diverged ~3,000 commits behind `cad-fusion-live-ms0`; romeo's real
    wiring history (JMDB/DocuStrata/db-coverage-gapfill/cimco) lives on cad-fusion-live-ms0.

## §3 — Deepening roadmap → PhD master

**Tribal tips to add:** current 40 → target 80+. Sources: wiring session learnings from
romeo MEMORY.md (ERPImport, SubprogramExtraction, MeasureSummary, BarRemnant patterns),
dispatcher-wiring-discipline wiki tribal nodes, operator article-set (loop/harness/LoRA/CAG
themes). Capture via `prism_knowledge:tribal_capture slot=romeo` after every batch of 5
wires. Priority topics: import-cycle detection patterns, Zod enum collision prevention,
async-without-await triage, sub-dispatcher split triggers, WIRE-EXEMPT tag usage doctrine.

**Wiki entries to write/cross-link:**
- `knowledge/wiki/architecture/wiring-closure-methodology.md` — end-to-end wire discipline
  (classify → technique → edge-cases → test → commit) with worked examples.
- `knowledge/wiki/lessons/dispatcher-action-name-collision-class.md` — the
  `measure_summary` dual-dispatcher bug as a class lesson; grep pattern + prevention rule.
- `knowledge/wiki/architecture/wiring-batch-cap-doctrine.md` — why 5-per-commit (scrutiny
  tractability), how to split, what WIRE-EXEMPT means and the 113-exempt precedent.
- `knowledge/wiki/architecture/unwired-engine-triage-matrix.md` — DEFER-class (infra-dep)
  vs PREFER-class (pure-compute static) decision matrix with live examples.
- Cross-link: `[[architecture/dispatcher-wiring-discipline]]` ·
  `[[architecture/awareness-stack]]` · `[[lessons/orphan-rescue-class]]`.

**Memories to write:**
- `reference_romeo_wiring_session_patterns_2026_06.md` — distilled from the 4 wires already
  landed (ERPImport/SubprogramExtraction/MeasureSummary/BarRemnant): Zod schema placement,
  turningDispatcher shallow-normalize trap, sub-action discriminated-union when needed.
- `feedback_wire_verify_before_commit.md` — "verify engine works BEFORE wiring it"; run or
  write a unit test for the engine first, then wire.
- `reference_unwired_54_triage_2026_06_26.md` — DEFER-class (~20 infra-dep) vs PREFER-class
  (~34 pure-compute); names the next 5 PREFER candidates in priority order.

**RAG corpus:** wiring domain is PRISM-internal; no external PDF trove. Primary corpus:
`state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md` + dispatcher `.ts` files +
wiki `dispatcher-wiring-*.md` leaves + romeo MEMORY.md. Embed via
`scripts/lib/galaxy-reasoning-bridge.mjs wiring` (dense/hybrid RAG arm ON by default as of
`U-FLOR-HYBRID-DEFAULT`). Target: ≥90% of wiring questions answered from the CAG/RAG layer
without hitting Claude context.

**CAG cold-anchor:** cache the canonical wiring workflow (§7 of galaxy CLAUDE.md) + the
triage matrix (DEFER/PREFER/WIRE-EXEMPT rules) via `scripts/lib/cag-router.mjs` so every
romeo session starts with zero-latency doctrine access.

**NN/GNN features:** the 54 UNWIRED ghost-nodes are romeo's direct refpool contribution
to india's GraphSAGE tier-5. As each engine is wired, update the ghost-node's label from
UNKNOWN → WIRED in the system-viz graph (sierra's regen picks it up). This enriches the
GNN training set. Owner: india; romeo is the label-source. Current selective-deploy state:
AUROC 0.808 / τ=0.7 / ~32% coverage — consult GNN FIRST for unknown engines above τ.

**LoRA dataset:** emit `wiring_lora_train.jsonl` + `wiring_lora_test.jsonl` after every
wiring batch. Format: `{instruction: "Wire <EngineName> to a dispatcher", input: "<engine
API surface>", output: "<dispatcher case + Zod schema + test>"}`. India trains on intake.
Target: 34 PREFER-class engines × 2 (train/test split) = ~68 LoRA pairs minimum.

**Engineered loop + cron:** nightly `scripts/audit-unwired-engines.mjs` regen (writes
`state/shared/UNWIRED-ENGINE-AUDIT-*.json` + `AWARENESS-SNAPSHOT.md`) → Ollama
`qwen2.5-coder:32b` classifies each UNKNOWN into DEFER/PREFER/EXEMPT via
`galaxy-reasoning-bridge.mjs wiring` → outputs next-5 PREFER candidates to
`state/shared/wiring-next-batch.json`. Romeo's `/loop [10m]` picks up the file on next
session. Acceptance signal: UNWIRED count decreasing by ≥5/week; WIRE-EXEMPT audit log
shows no spurious exemptions.

**Ollama offload:** route all wiring-diff summarization, engine-API-surface extraction,
dispatcher-action naming suggestions → `qwen2.5-coder:32b` (free, Blackwell 96GB). Reserve
Claude for scrutiny-gate arbitration and multi-engine collision triage.

## §4 — Test plan (real assertions — R9)

**Unit (reference-value / invariant):**
- `AutoWiringEngine.test.ts` — assert that `proposeActions(engineSource)` returns a
  non-empty action list for a known static-method engine; assert the proposed action names
  follow `snake_case` domain prefix convention; assert WIRE-EXEMPT engines are excluded.
- `WiringPotentialEngine.test.ts` — assert score ordering invariant: an engine with more
  callers AND more dispatcher coverage ranks strictly higher than one with fewer on both
  axes; assert score ∈ [0, 1]; assert empty engine list returns empty scores.
- `AssetWiringSummaryEngine.test.ts` — assert `wiredCount + unwiredCount + exemptCount
  === totalEngines`; assert pct calculation = `wiredCount / totalEngines * 100`.
- `EngineUtilizationAuditorEngine.test.ts` — assert fire-count delta detection: if
  `countBefore < countAfter` the audit reports INCREASED; assert 0-fire-count engines
  flagged as dormant.

**Integration (round-trip through dispatcher — NOT the singleton):**
- `mcp-server/src/__tests__/dispatcher-dev-wiring.test.ts` — call
  `prism_dev:engine_util_audit` through the full dispatcher stack; assert response contains
  `wiredCount`, `unwiredCount`, `exemptCount` fields; assert Zod validation passes; assert
  lazy-import path exercised (import cycle would throw here).
- `mcp-server/src/__tests__/dispatcher-session-wiring.test.ts` — call
  `prism_session:dispatcher_map_compact` and `prism_session:master_index_query` with a
  wiring-domain query; assert responses are non-empty and structurally valid.

**E2E (against JM Die data):**
- Run `node scripts/audit-unwired-engines.mjs` against the live codebase; assert
  UNWIRED count ≤ 54 (the 2026-06-13 baseline); assert WIRED-DIRECT ≥ 3,536.
- Wire one PREFER-class engine end-to-end; call its dispatcher action with a JM-Die-shaped
  payload; assert the response matches expected output computed by calling the engine
  directly (parity check: dispatcher result === singleton result).

**Coverage floor:**
- Happy path: engine with valid API surface → dispatcher action → test round-trips.
- Failure mode 1: engine constructor has side-effect (DB call) → `checkBeforeWiring`
  returns DEFER; wire is blocked before it starts.
- Failure mode 2: proposed action name collides with existing case →
  collision-guard test fails loudly naming the duplicate.
- Failure mode 3: dispatcher line count > 5,000 → triage routes to sub-dispatcher;
  test asserts original file line count unchanged.
- Adversarial 1: engine file contains `throw new Error()` as first statement → wiring
  engine test catches that the engine is not wirable (pre-flight fails).
- Adversarial 2: NaN / Infinity in engine output → dispatcher round-trip returns structured
  error object, not unhandled rejection; test asserts `ok: false` shape.
- Spanning config 1: pure-compute static-method engine (`BarRemnantManagementEngine`) →
  `prism_turning`.
- Spanning config 2: NC-parse engine (`SubprogramExtractionEngine`) → `prism_pp`.
- Spanning config 3: metrology engine (`MeasureSummaryEngine`) → `prism_quality`.

**Target test files to add/extend:**
- `src/__tests__/AutoWiringEngine.test.ts` (extend)
- `src/__tests__/WiringPotentialEngine.test.ts` (extend)
- `src/__tests__/AssetWiringSummaryEngine.test.ts` (extend)
- `src/__tests__/dispatcher-dev-wiring.test.ts` (new — round-trip `prism_dev`)
- `src/__tests__/dispatcher-session-wiring.test.ts` (new — round-trip `prism_session`)

**Runner:** `rtk npx vitest run -t "wiring|dispatcher|wire|unwired"` in `mcp-server/`;
CI gate must be green before any wiring commit merges.

## §5 — Simulation plan

**What to simulate:** wiring-closure dry-run — given the live UNWIRED-54 list, simulate
the full wire sequence (classify → propose action → collision-check → add schema → add
case → add test → commit) without writing files, to surface blockers before the real wire.

**Tools:** `node scripts/audit-unwired-engines.mjs` (backlog); `AutoWiringEngine.ts`
(propose actions); `prism_session:dispatcher_map_compact` (route each engine to its
dispatcher); `prism_dev:engine_util_audit` (verify current state post-wire).

**Scenarios:**
1. PREFER-class batch of 5: `TurretLayoutEngine`, `SwissTypeDecisionEngine`,
   `SpindleLoadMonitorEngine`, `CycleTimeEstimatorEngine`, `MaterialHandlingEngine` →
   simulate routing to `prism_turning`/`prism_mill`; check for name collisions; verify
   dispatcher line-count stays <5,000.
2. DEFER-class triage: `SemanticAssetIndexEngine` (needs live Qdrant + embedder) →
   simulate DEFER classification; assert no dispatcher case is generated; assert
   WIRE-EXEMPT tag is proposed.
3. Sub-dispatcher split scenario: if target dispatcher would cross 5,000 lines after
   adding 5 actions → simulate `prism_quality_extended` split; assert original file
   unchanged.
4. Edge: engine with duplicate method names → `AutoWiringEngine` proposes action with
   suffix `_v2`; collision-guard catches it; human review required.
5. Adversarial: engine file is empty (0 bytes) → simulator returns `SKIP: no surface`;
   no dispatcher entry generated.

**Pass criteria:** dry-run completes with 0 import-cycle errors, 0 name collisions on the
PREFER-class batch, all DEFER-class correctly classified; simulation report written to
`state/shared/wiring-simulation-report.json` with per-engine verdict.

## §6 — Validation plan (live data + numbers — R12/R15)

**Live-data validation:** after each batch of ≤5 wires:
- Run `node scripts/audit-unwired-engines.mjs`; assert UNWIRED count decreased by the
  batch size.
- Call each newly wired action via the running MCP server (`:3100`); assert HTTP 200 +
  valid JSON response with expected domain fields.
- Parity probe: call engine singleton directly and via dispatcher; assert
  `JSON.stringify(singletonResult) === JSON.stringify(dispatcherResult.data)` or
  field-level equivalence where the dispatcher adds envelope fields.

**Acceptance gates (numeric):**
- UNWIRED count: ≤10 engines by end of first full romeo session (starting from 54).
- Dispatcher round-trip latency: p95 ≤ 200ms for pure-compute engines (no I/O).
- Parity probe: dispatcher result fields match singleton result on ≥98% of test cases.
- Test coverage: every new action enum entry has ≥1 round-trip test; 0 toBeDefined() stubs.
- Wiki+tribal: wiring tribal tips ≥ 80 by end of buildout.

**Safety gate:** wiring domain has no S(x) physics safety relevance. Exception: if an
engine being wired computes safety-critical outputs (tool-breakage force, S(x) score,
machine limit) → route through `prism_safety:validate_physics` before returning; assert
S(x) ≥ 0.98 for shop-floor safety engines.

**Parity probe:** `AuditManagerPage` (extended to show wiring coverage) must display counts
that match `node scripts/audit-unwired-engines.mjs` output within ±0 (exact match on
integer counts).

## §7 — Fine-tune loop (results → retrain)

**Outcome capture:** after each wiring batch, publish via `xproc_outcome_publish` (grep
`prism_ai` dispatcher for verified action name before calling):
```json
{ "slot": "romeo", "domain": "wiring", "unit": "U-WIRE-<id>",
  "result": "ok|fail", "enginesWired": N, "dispatcher": "prism_<x>",
  "actionsAdded": ["action_a", "action_b"] }
```
Write to the wiring closed-loop outcome ledger per
`state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.

**LoRA:** each completed wire (engine source + dispatcher action + test) → append to
`wiring_lora_train.jsonl`; adversarial / edge-case wires → `wiring_lora_test.jsonl`. India
retrains when `wiring_lora_train.jsonl` reaches ≥50 pairs. Promotion gate: india's LoRA
eval perplexity on wiring-class samples must improve ≥5% vs baseline.

**RAG/CAG:** each new wiki entry (§3) → re-embed via `scripts/embed-wiki-pages.mjs`;
cold-anchor refreshed after every 10 new entries. Cache TTL: 24h.

**NN/GNN:** as PREFER-class engines are wired, their ghost-nodes in the system-viz graph
gain WIRED labels. After each batch, notify india: `xproc_outcome_publish domain='wiring'`
triggers india's scheduled task to ingest updated ghost-roost labels into the GNN refpool.
Promotion gate for GNN: AUROC ≥ 0.78 / macro-F1 ≥ 0.55 / Brier ≤ 0.15 on the wiring-
classification holdout.

**Trigger + cadence:** nightly cron `scripts/audit-unwired-engines.mjs` regen + Ollama
triage → `wiring-next-batch.json`. Romeo's session `/loop [10m]` picks up and executes.
Retrain trigger: LoRA ≥50 pairs OR GNN refpool grows by ≥10 labeled nodes.

## §8 — Frontend build (Kienzle Claude-Design rollout)

**Assigned Kienzle page:** `Kienzle Backend Wiring Map.dc.html`

The design shows: a 4-stat header row (backend endpoints live: ~150, Kienzle screens built:
12, domains still to build: 10, net-new endpoints needed: ~0), a domain-by-domain status
grid (name · galaxy label · API function list · note · status badge [BUILT/UI GAP/ENDPOINT
GAP] · target page), and a priority build-order section listing the 6 remaining gap domains
in sequence with rationale.

**Target React page:** `mcp-server/web/src/pages/AuditManagerPage.tsx` — **EXTEND, not
replace** (Codex Page Protection). The existing page handles quality/compliance audit
schedules and findings via tabs. Add a new `"Wiring Coverage"` tab that renders the Backend
Coverage & Front-End Map panel alongside the existing audit tabs. This reuses all existing
scaffolding (WorkspaceRecoveryScaffold, PanelCard, StatusPill, ActionButton primitives).

**New tab content — WiringCoverageTab component** (co-located in AuditManagerPage.tsx or
extracted to `src/components/wiring/WiringCoverageTab.tsx`):
- Stat row: 4 `PanelCard` tiles showing live counts from `prism_dev:engine_util_audit`
  response fields (`wiredCount`, `unwiredCount`, `exemptCount`, totalEndpoints ~150).
- Domain grid: rows from a `prism_dev:wiring_coverage_map` action (to be wired) or, as
  interim fallback, the static domain list from the .dc.html rendered live via the audit
  JSON. Status badge → `StatusPill` with color mapping: BUILT=emerald, UI GAP=amber,
  ENDPOINT GAP=red.
- Build-order section: ordered list of gap domains from `prism_session:master_index_query`
  filtered to wiring-gap ghost-nodes, or static from the 6-step priority list in the design.
- Wiring pattern note rendered as a monospace code block (JetBrains Mono).

**Backend wiring:**
- Primary dispatcher action: `prism_dev:engine_util_audit` (already exists per CLAUDE.md
  §3 dispatcher quick-ref, wired to `guardDispatcher.ts:34`).
- New action needed: `prism_dev:wiring_coverage_map` — returns per-domain coverage rows
  (domainName, galaxy, apiSurface[], status, targetPage). Wire `AssetWiringSummaryEngine`
  to this action in `guardDispatcher.ts` (check line count first).
- API client: add `wiringCoverageMap()` and `engineUtilAudit()` calls to
  `mcp-server/web/src/api/client.ts` pointing at `POST /api/v1/dev/engine-util-audit` and
  `POST /api/v1/dev/wiring-coverage-map` on `:3100`.
- Verify both Express routes exist in `mcp-server/src/routes/`; add if absent.

**Design language (iOS fleet + Calculator Studio accent):**
- Use `var(--surface-2)` for the stat tiles, `var(--border)` for grid row separators.
- Status pills: `StatusPill` component with `variant="emerald|amber|red"` per status.
- Monospace API function lists: `font-family: ui-monospace, 'JetBrains Mono', monospace`
  with `var(--fg-dim)` color — never inline `#7FB2FF`.
- Tap targets ≥ 44pt; wrap in `<MobileSafeArea>`; stat tiles stack 2×2 at <600px.
- No inline hex/px — all values via `DESIGN.md` tokens from `src/index.css`.
- Critically-damped press spring on status badge hover: `whileTap scale var(--press-scale)`,
  stiffness 500 / damping 34.

**Build/verify loop:** edit → `npm run build:fast` in `mcp-server/` → Playwright screenshot
at 1280×800 (desktop) + iPhone 14 (390×844) + Pixel 7 (412×915) → compare to .dc.html
intent → iterate. Acceptance: all 3 viewports render without overflow; live counts from
`:3100` populate the stat tiles; status badges match the design's color scheme.

**Acceptance:** AuditManagerPage renders the new "Wiring Coverage" tab; live round-trip to
`:3100` populates stat tiles and domain grid; parity with `node scripts/audit-unwired-engines.mjs`
output (integer counts match exactly); 3-viewport screenshots match design intent.

## §9 — Dependencies & sequencing

- **Blocked by:** `npm ci` must complete in `H:/prism-slot-romeo/mcp-server` for
  vitest/tsc to work in-slot (noted as blocker in MEMORY.md). India must be available for
  LoRA intake and GNN refpool updates. Quebec owns UI shell; coordinate via `AGENT_CHAT.md`
  before adding the new tab to AuditManagerPage.
- **Blocks:** victor/dormant-data benefits from romeo's DEFER-class triage output (the
  DEFER list is victor's next orphan-data audit input). Sierra's system-viz graph accuracy
  improves as ghost-nodes gain WIRED labels. India's GNN tier-5 quality improves as the
  wiring refpool grows.
- **Logical order (R13):** (1) deepen tribal/wiki/CAG cold-anchor → (2) run simulation
  dry-run on PREFER-class batch → (3) wire batch of 5 with round-trip tests → (4) validate
  live counts + parity probe → (5) capture outcomes → LoRA/GNN feed → (6) frontend tab
  (never build UI before backend actions are verified live). Repeat steps 2-5 until
  UNWIRED ≤ 10.

## §10 — Done-definition (R15: WIRE → TEST → VALIDATE → APPLY)

- [ ] WIRE: every new dispatcher action (including `prism_dev:wiring_coverage_map`) wired
      in the same commit as its Zod schema + round-trip test; 0 orphaned action enum
      entries; WIRE-EXEMPT engines tagged `// WIRE-EXEMPT: <reason>`.
- [ ] TEST: `dispatcher-dev-wiring.test.ts` + `dispatcher-session-wiring.test.ts` green;
      happy path + ≥3 failure modes + ≥2 adversarial + ≥3 spanning configs all pass;
      0 `toBeDefined()` stubs; `rtk npx vitest run -t "wiring"` exits 0.
- [ ] VALIDATE: live UNWIRED count ≤ 10 (from 54); parity probe dispatcher === singleton
      on ≥98% of cases; AuditManagerPage wiring tab shows counts matching
      `audit-unwired-engines.mjs` output exactly.
- [ ] APPLY: nightly cron live and emitting `wiring-next-batch.json`; LoRA dataset
      ≥50 pairs sent to india; GNN refpool updated with WIRED labels; AuditManagerPage
      Wiring Coverage tab rendering live data at `:3100` on 3 viewports.
- [ ] Per-file 2-arm scrutiny on every code file + 3-of-3 Stop gate on the session.
