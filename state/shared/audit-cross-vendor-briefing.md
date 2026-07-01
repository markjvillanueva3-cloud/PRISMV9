# PRISM Audit — Cross-Vendor Review Brief

You are reviewing the conclusions of a 10-agent audit pass against the PRISM platform (`H:\PRISM`).
Goal: identify where the audit is accurate, overstated, understated, or missing key concerns.
Be strict. If you cannot verify a claim from the cited evidence, say INSUFFICIENT-EVIDENCE.

## Findings to review

### 1. Studio page status (Codex's three calculator studios)
- **MillStudioPage.tsx** (672 LOC): scored 15/100. Audit claims: 6-step wizard renders, demo G-code is hardcoded, all export buttons (Download NC, Send to Machine, Setup Sheet, Auto-Optimize) have ZERO `onClick` handlers, page never imports `fetch`/`axios`, never calls any `mill_*` dispatcher action. Page is also NOT registered in `App.tsx` route table.
- **LatheStudioPage.tsx** (520 LOC): scored 8/100. Audit claims: 6-step wizard, ZERO of the 12 wired `lathe_p2p_*` dispatcher actions are invoked from the page, none of the 8 specialty calculator panels (LatheChatterPanel, LatheCostPanel, LatheGroovingPanel, LatheHardTurningPanel, LatheInsertSelectorPanel, LatheThreadingPanel, LatheToolLifePanel, LatheWorkholdingPanel) are imported, demo G-code hardcoded, NOT routed in App.tsx (`/lathe-studio` path absent).
- **WireEdmStudioPage.tsx** (147 LOC) + 6-step wizard (1,761 LOC in WireEdmWizardPage): scored 62/100. Audit claims: 20 real `/api/v1/edm/*` backend calls all wire to actual dispatcher actions (parse-geometry, classify-features, plan-passes, generate-toolpath, multipass, optimize, predict-wire-break, generate-gcode, etc.). Multi-pass plan + cost breakdown render REAL data. Routing is ambiguous (`/wire-edm-studio` path may be present, `/edm` mapping unclear).

### 2. Critical wiring bug
- `createMillingRouter` is NOT imported or registered in `mcp-server/src/routes/index.ts`. Lathe (`createLatheTurningRouter` at `/api/v1/lathe`) and EDM (`createEdmRouter` at `/api/v1/edm`) ARE registered. Result: 85 `mill_*` dispatcher actions are 100% HTTP-orphan; frontend calls to `/api/v1/milling/*` return 404. Fix is 3 lines (1 import + 1 `app.use(...)` + Route registrations in App.tsx for the 2 unrouted mill pages).

### 3. Time-to-ship matrix
| Product | Live-Beta | Paid-Ship |
|---|---|---|
| WEDM Studio + P2P | 7-14 days | 6-8 weeks |
| Mill P2P (Hurco-only) | 5 days | 9 days |
| Lathe P2P min-viable | 7 days | 16 weeks |
| SFC standalone SaaS | 8-9 days | 12-14 days |
| PPG subscription | 6 days | same |
| PPG per-post sales | 5 days | same |
| PPG marketplace | n/a | 25 days |
| Quoting SaaS | 2-3 weeks | same |
| Shop Floor app | 6-8 weeks | same |
| CAD/CAM autonomous | 12-20 weeks | 20-32 weeks |
| HR + Payroll | n/a alone | 4-6 weeks |
| Full ERP | n/a | 24-30 months (NOT 12-18) |

### 4. Critical billing infrastructure gaps
- **Stripe webhook → DB sync UNWIRED**: webhook handler returns 200 OK but never writes to `subscriptions` table. No `subscriptions` schema exists (17 migrations, none for billing). Customer pays $79/mo, plan reverts to FREE on next request.
- **Free-tier usage limit "10 calcs/day" is UI-only** — no server-side counter. UsageBar component exists; backend gate doesn't.
- **Per-post entitlements missing for PPG**: `user_post_entitlements` table doesn't exist. Per-post Stripe checkout works; no DRM or signed download URL after payment.
- Pricing UI live (5 tiers: Free/Starter/Pro/Shop/Enterprise), Stripe checkout works, AuthContext + ProtectedRoute in place.

### 5. ERP reality
- 107 frontend pages, 155+ business actions, 60+ business engines.
- Module coverage from UI scout: Reporting 100%, Settings 86%, Quote-to-Cash 67%, HR/Payroll 63%, Specialty quoting 56%, Scheduling 50%, Inventory 50%, Quality 50%, CRM 43%, Customer Portal 20%, **GL only 12%**.
- ~0.5% test coverage of business domain (financial operations critically under-tested — invoicing, payroll, GL postings, 3-way match all have ZERO unit tests).
- No data migration tooling (1 migration file, no JobBOSS/E2/ProShop importers).
- No QuickBooks export wiring beyond a stub action.
- All 7 specialty quoting engines (sheet metal, additive, injection mold, casting, weld, multi-process, WEDM) have REAL cost models.

### 6. CAD/CAM autonomous generation (research-stage assessment)
- 4 flagship engines: NeuralCADGenerationEngine (741 LOC), TextToCADGenerationEngine (643 LOC), BlueprintToCADGenerationEngine (674 LOC), CAMReasoningChainEngine.
- Token vocabulary exists (500+ tokens). **Actual STEP/IGES training corpus NOT on disk** (cad-corpus-manifest.json found in state, raw files likely cloud-backed or absent).
- CAM bridges: 4 systems have code generators that emit text strings (CadQuery Python). **NO compiled plugins on disk** (no Mastercam .dll, no hyperMILL .pyd, no Fusion 360 Add-In source). Bridge architecture exists; deployable add-ins do not.
- DFMPipelineEngine is real (orchestrates 4 sub-engines: feedback, rules, accessibility, knowledge). Tests not yet found.

### 7. Studio safety/UX gaps
- WEDM has 10 backend safety gates (head clearance, current density, power density, pulse limit, recast, wire-break Weibull, thermal release, flush adequacy, wire-path collision, thin-wire derate). Only ~2 visualized in UI; no operator-language explanations when a gate vetoes a parameter set; no unified S(x) ≥0.90 verdict badge.
- No EULA / license / liability disclaimer anywhere in the codebase. Selling generated G-code to industrial customers running >$200K machines without this is a commercial liability.

## Required output

Respond in this exact format:

```
VERDICT: AGREE | DISAGREE-OVERSTATED | DISAGREE-UNDERSTATED | INSUFFICIENT-EVIDENCE

KEY-CONCERNS:
1. <concern with concrete file/line evidence or specific reasoning>
2. <concern>
3. <concern>

MISSING-FROM-AUDIT:
1. <thing the audit failed to catch>
2. <thing>

SHIP-MATRIX-DELTAS:
- <product>: <your estimate vs audit estimate, with reason>

REVISED-COMPOSITE-SCORE: <your number 0-100 for overall ship-readiness>
```

Be specific. Cite file paths or claim categories. Do NOT just paraphrase the audit back.
