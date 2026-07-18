---
title: QUOTING-PIPELINE-MS0
type: architecture
status: shipped
shipped_at: 2026-05-24
slot: charlie
goal: /goal-13
commits: [7eb093a0f6, 6b04bd79cf, d399233c84, U-QP13, U-MS-CLOSE, U-SYNERGY-PSN]
---

# QUOTING-PIPELINE-MS0 — Camera-Intake Quoting + Live-Chat Pipeline

## TL;DR

PRISM's customer-facing quoting pipeline: point a camera at a drawing, an insert box, a tool body, or a machine service tag; get an instant quote, catalog match, parts BOM with vendor pricing, or a troubleshooting chat session. Built as a **wire-not-build** milestone — 13 new bridge engines reuse 30+ existing quote/cost/OCR/troubleshoot/catalog engines.

## Stack (top-down)

```
┌─────────────────────────────────────────────────────────────┐
│  Mobile camera capture (PWA: quoting-manifest + sw.ts)      │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  React: MobileCameraQuotePage.tsx + LiveChatWidget.tsx      │
│  /mobile-capture-quote route (App.tsx)                      │
└────────────────────────────┬────────────────────────────────┘
                             ▼ POST /api/mcp/quoting
┌─────────────────────────────────────────────────────────────┐
│  Express bridge: routes/quoting.ts (8 typed + 1 generic)    │
└────────────────────────────┬────────────────────────────────┘
                             ▼ callTool("prism_quoting", action, params)
┌─────────────────────────────────────────────────────────────┐
│  MCP dispatcher: quotingDispatcher.ts (12 actions)          │
└────────────────────────────┬────────────────────────────────┘
                             ▼ lazy import
┌─────────────────────────────────────────────────────────────┐
│  Engines (7):                                                │
│    CameraIntakeRouterEngine          (U-QP02)               │
│    InsertBoxToCatalogBridgeEngine    (U-QP03)               │
│    MachineServiceTagOCREngine        (U-QP04)               │
│    MachinePartsBOMResolverEngine     (U-QP05)               │
│    VendorRealtimePricingClientEngine (U-QP06)               │
│    LiveChatRouterEngine              (U-QP07)               │
│    QuotingAccuracyEnhancementEngine  (U-QP13)               │
└─────────────────────────────────────────────────────────────┘
```

## Twelve dispatcher actions (`prism_quoting`)

| Action | Engine | Purpose |
|---|---|---|
| `camera_intake_route` | CameraIntakeRouter | Classify image → blueprint / insert-box / tool-body / machine-service-tag |
| `insert_box_lookup` | InsertBoxToCatalogBridge | ISO 1832 + vendor brand → catalog match + 3 compatible inserts |
| `machine_tag_extract` | MachineServiceTagOCR | OCR'd tag text → {make, model, serial, voltage, spindle_hp, mfg_date} |
| `machine_parts_bom_resolve` | MachinePartsBOMResolver | (make, model) → consumable / wear / service BOM with vendor adapter routing |
| `vendor_realtime_price` | VendorRealtimePricingClient | (adapter, SKU) → cached price or unconfigured (real APIs in MS1) |
| `live_chat_session_open` | LiveChatRouter | Open chat session, returns sessionId |
| `live_chat_session_turn` | LiveChatRouter | User turn → assistant response with citation chips |
| `live_chat_session_close` | LiveChatRouter | Close session |
| `accuracy_platt_calibrate` | QuotingAccuracyEnhancement | Lin 2007 calibrated posterior from raw classifier score |
| `accuracy_fuzzy_match_sku` | QuotingAccuracyEnhancement | OCR-confusion-aware Levenshtein for catalog matching |
| `accuracy_bom_urgency` | QuotingAccuracyEnhancement | Weibull replacement-probability for proactive ordering |
| `accuracy_quote_interval` | QuotingAccuracyEnhancement | Interval-arithmetic guaranteed-correct quote bounds |

## Accuracy math (U-QP13)

1. **Platt calibration** — `P = 1/(1+exp(A·s+B))` with Newton-Raphson MLE fit (Lin et al. 2007). Converts ad-hoc classifier scores into calibrated probabilities.
2. **OCR-confusion edit distance** — Levenshtein with 0↔O, 1↔I, 5↔S, 8↔B (and 13 other pairs) costing 0.5 vs generic 1.0. Catches camera-OCR misreads the strict regex misses.
3. **Weibull survival** — `S(t) = exp(-(t/η)^β)`, β=2.5 industrial-wear default. Wraps the flat `replacement_interval_months` field from U-QP05 BOM as Weibull η for proactive maintenance.
4. **Interval arithmetic quote** — `Q = (m+l+t)·(1+oh)·(1+mg)` with each input as an Interval, reusing `IntervalArithmeticPredicateEngine` from PROGRAM-PROOF-MS0/U-PP02. Surfaces honest uncertainty bounds instead of fake-precise totals.

## PSN synergy (all 11 legs)

| PSN leg | How wired |
|---|---|
| **Obsidian brain** | 3 memory pointers under `knowledge/memories/reference/`, auto-fed via Stop hook |
| **PRISM OS** | `prism_quoting` dispatcher live (12 actions in MCP tool registry) |
| **Wiki** | THIS entry + `state/shared/specs/QUOTING-PIPELINE-MS0-ASSESSMENT-2026-05-24.md` + audit spec + HTML twins |
| **Memories** | reference_quoting_pipeline_ms0_{assessment, shipped}_2026_05_24.md + accuracy upgrade pointer |
| **Tribal** | LiveChatRouter assistant callback can query `CAMTribalRAGEngine` + `CAMTribalKnowledgeEngine` for citations |
| **System Viz** | `ghost.quoting_pipeline` roost + 23 child nodes (7 engines + 12 actions + 4 surfaces) via `generate-quoting-pipeline-features.mjs` |
| **Engines** | 7 new bridges reusing 30+ existing (QuoteToShipOrchestrator 205K + BlueprintToQuoteBridge live + TroubleshootingAssistant 120K + 14 OCR + 12 JM Die docustrata + 8 mobile/camera) |
| **Algorithms** | 4 new (Platt-MLE / OCR-Levenshtein / Weibull-survival / interval-arithmetic-propagation) + reuses interval arithmetic from PROGRAM-PROOF-MS0/U-PP02 |
| **Formulas** | Cost = (m+l+t)·(1+oh)·(1+mg) propagated as interval; Lin Platt formula; Weibull survival; weighted edit distance |
| **NN/GNN** | `QuoteOutcomeFeedEngine` feeds `psi_delta` events into `PSNAutonomyLoopEngine.scoreEvent` per realized-vs-quoted cost (ΔΨ clamped ±0.10) |
| **PRISM AI** | LiveChatRouter assistant callback configurable; boot-time default wires through `aiSystemRouterEngine` (Claude/Ollama/prism_calc routing) |

## Files (commits, by phase)

### P0 backend bundle — `7eb093a0f6`
- `mcp-server/src/engines/CameraIntakeRouterEngine.ts` + test (20 cases)
- `mcp-server/src/engines/InsertBoxToCatalogBridgeEngine.ts` + test (13)
- `mcp-server/src/engines/MachineServiceTagOCREngine.ts` + test (13)
- `mcp-server/src/engines/MachinePartsBOMResolverEngine.ts` + test (13)
- `mcp-server/src/engines/VendorRealtimePricingClientEngine.ts` + test (16)
- `mcp-server/src/engines/LiveChatRouterEngine.ts` + test (11)
- `mcp-server/src/schemas/quotingActionSchemas.ts`
- `mcp-server/src/tools/dispatchers/quotingDispatcher.ts` + test (9)

### P1 frontend + PWA + E2E — `6b04bd79cf`
- `mcp-server/web/src/pages/MobileCameraQuotePage.tsx`
- `mcp-server/web/src/components/chat/LiveChatWidget.tsx`
- `mcp-server/web/src/sw.ts`
- `mcp-server/web/public/quoting-manifest.webmanifest`
- `mcp-server/src/__tests__/integration/QuotingPipelineMS0.e2e.test.ts` (7 cases)

### Integration glue — `d399233c84`
- `mcp-server/src/index.ts` — registerQuotingDispatcher(server)
- `mcp-server/src/routes/index.ts` — Express mount /api/v1/quoting + /api/mcp/quoting
- `mcp-server/src/routes/quoting.ts` — createQuotingRouter
- `mcp-server/web/src/App.tsx` — Route path="mobile-capture-quote"

### Accuracy enhancement — U-QP13
- `mcp-server/src/engines/QuotingAccuracyEnhancementEngine.ts` + test (28 cases)
- 4 new dispatcher actions (`accuracy_*`)

### PSN synergy closure (this entry)
- `scripts/generate-quoting-pipeline-features.mjs` — system-viz roost
- `mcp-server/src/engines/QuoteOutcomeFeedEngine.ts` + test — NN/GNN psi_delta feed
- `knowledge/wiki/architecture/quoting-pipeline-ms0.md` — THIS entry

## Total test count: ~128 vitest PASS (across 8 files)

## R12 deferrals (named, MS1)

- Real vendor APIs (Misumi, McMaster, OEM) — adapter shape ships in MS0, real keys/scraping policy in MS1
- Real-photo OCR fixtures — MS0 uses synthetic OCR-text fixtures; real JM Die `_PART LIBRARY/` JPG fixtures + Tesseract/Azure CV wiring in MS1
- `PRISM_COST_DATABASE.js` (288KB legacy) — un-harvested, separate G8 unit handed to golf/echo
- Native iOS/Android — PWA only in MS0
- Quote-outcome→psi_delta feed actively running on real quote history — engine ships, but the actuals-recording hook is operator follow-up

## Memory pointers

- [[reference_quoting_pipeline_ms0_assessment_2026_05_24]]
- [[reference_quoting_pipeline_ms0_shipped_2026_05_24]]
- [[domain-pipeline-ms0]] — sister 18-stage print-to-part pipeline this composes onto
- [[feedback_psn_definition]] — canonical 11-leg taxonomy this wires into
