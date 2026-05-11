# PRISM Revenue Roadmap — v7.3

**Generated:** 2026-05-11T13:42:14.743Z
**Source:** v7.1 (round-4 merged spec) + §R5 (round-5 consensus resolution) + §R6 (monolith-harvest milestone) + §R7 (round-6 revenue-completeness closure + desktop-app final phase)
**Verdict:** CONDITIONAL-GO. Architecture sound. v7.1/v7.2 are product-complete but launch-incomplete — §R7 closes the gap: 6 new milestones (MS-CRITWIRE, MS-PAY, MS-FRONTEND, MS-INFRA, MS-GTM, MS-LEGAL) + MS-DESKTOP (Electron, the FINAL PHASE). 1 hard BLOCKER: U-LEGAL-13 (IP clearance — alarm DB + post configs are derived from Fanuc/Haas/Autodesk copyrighted material; gates ALL paid revenue). 2 hard prerequisites: U-REV-CI-00 (CI non-stub gate, before SFC GA) + MS-INFRA P0 (the minimum licensing/funnel backend, before MS-PAY goes live). Revenue Day 1 ≈ Week 6-8 (SFC-led). Desktop GA ≈ Week 12-18.
**Owner:** claude-99eca613 (revenue lane)

## Provenance

v7.3 = §R5 (round-5: 10 consensus agents) + §R6 (monolith survey: 3 agents + system-viz) + §R7 (round-6: 6 gap-hunt agents on frontend/deployment/payment-path/legal-IP/engine-critical-path/GTM + the desktop-app directive), prepended to the full v7.1 spec.
Evidence: state/shared/audit-findings/revenue-roadmap/round{2,3,3-5,4,5}/*.json + round6/{00-v7.3-closure, 01-frontend, 02-deploy, 03-pay, 04-legal, 05-critwire, 06-gtm}.md. Monolith state: wiki [[prism-v8-89-monolith-extraction]].

---
# REVENUE-ROADMAP v7.3 — Revenue-Completeness Closure + Desktop-App Final Phase

**Generated:** 2026-05-11 (round-6 gap-hunt: 6 parallel agents on frontend / deployment / payment-path / legal-IP / engine-critical-path / GTM-funnel + user directive: desktop Electron app as the final phase)
**Verdict:** v7.1/v7.2 are **product-complete but launch-incomplete** — they build the engines and pages but have no path from "stranger" to "paying customer with a working app." v7.3 closes that with 6 new milestones (MS-CRITWIRE, MS-PAY, MS-FRONTEND, MS-INFRA, MS-GTM, MS-LEGAL) + the desktop-app capstone (MS-DESKTOP), corrects 3 wrong assumptions baked into v7.1/v7.2, flags **1 hard BLOCKER (IP clearance)** + **2 hard prerequisites (CI gate, minimum licensing backend)**, and defines a crisp **"Revenue Day 1 = Definition of Done"** checklist.

Full evidence: `state/shared/audit-findings/revenue-roadmap/round6/{01-frontend,02-deploy,03-pay,04-legal,05-critwire,06-gtm}.md`.

---

## §R7.0 — Round-6 gap-hunt verdict matrix

| # | Gap | Verdict | Headline |
|---|-----|---------|----------|
| 1 | **Frontend / customer app** | RESOLVED-WITH-WORK | The canonical app exists: `mcp-server/web/` (React 19 + Vite 6 + react-router 7, 147 pages, passed a ship gate). NOT a dev shell. The 2 "awaiting merge" codex builds (`cqask/ui`, `mcp-cadquery/frontend`) are tiny CAD demos — deprecate-after-harvest. The React-18-vs-19 question (round-5 §R5.5 #4) is **moot** — main app is already React 19. **Missing pages:** Master-Post *upload* page (current PPG is operation-builder, not upload-and-re-emit), cross-controller transpiler page, billing portal, account/seats, signup, pricing→checkout, NL→CadQuery in-app. → `MS-FRONTEND` ~14 units. |
| 2 | **Deployment / hosting** | GAP — but reshaped by the desktop pivot | The *code* for a hosted SaaS exists (HTTP transport, 42-endpoint REST API at `/api/v1/*`, auth middleware, billing engine, k8s scaffolding, a Postgres `schema.sql`) but **nothing is deployed**: auth = in-memory Maps, billing = mock mode, no DB provisioned, no CI pushes an image, no domain. With the desktop-app final phase, the hosted footprint shrinks to **a small licensing/funnel backend** (Fly/Render: auth+billing+tier-validation+the free-tier web tools) — not a full multi-tenant SaaS. → `MS-INFRA` ~12 units (was the agent's `MS-DEPLOY` P0). |
| 3 | **Minimum payment path** | GAP + 1 SECURITY HOLE | ~90% of billing logic exists (two impls: `BillingEngine.ts` does real HMAC webhook verification + idempotency; `StripeBillingEngine.ts` does real Stripe REST calls). **Missing 3 welds:** (a) the live `/webhook` route's signature verification is a *comment, not code* — **anyone can POST `checkout.session.completed` and self-grant a paid tier** [SECURITY BLOCKER]; (b) the 5-line "on completed → `userStore.setPlan(userId, plan)`" persistence write; (c) `requireTier` mounted on the actual SFC/Master-Post/CAD-CAM routes (the gate exists, isn't bitten down). Pricing is hardcoded in **4 places that disagree**; `state/shared/feature-tiers.json` is referenced as "canonical" but **does not exist**. The v7.1 "5-unit P0 hoist" (`U-SUB-00/19/22/28`) is signature-primitives + tax + SOC2 — **none of which is "take a card."** And `U-REV-MS0-ACT-SUBTIER-01 depends_on [U-SUB-22, U-SUB-30]` is the INVERTED dependency (tier-flip can't ship until tax compliance ships). → `MS-PAY` ~6 units, ~5 working days of *integration*, FIRST unit = "Stripe Checkout + verified webhook → tier flag." |
| 4 | **Legal / IP clearance** | **HARD BLOCKER for Master Post; NEEDS-REVIEW for SFC** | Controller alarm DBs are reproduced **verbatim from manufacturer service manuals** (Fanuc B-61395E, Haas 96-0284, Mitsubishi IB-1501279, Siemens 840D, Okuma OSP-P300) + forum scrapes — and `alarm_decode` surfaces that verbatim text to end users. Post-processor configs carry `// Source: HAAS_VF2_...iMachining_.cps` headers — reverse-engineered from **Autodesk Fusion / SolidCAM** posts; selling Master Post ($299/controller) as-is = selling a derivative of Autodesk + SolidCAM IP and **invites a takedown the moment it gets traction**. JM-Die's 24,545 customer programs belong to ITW/Alcoa/etc. — learning from *anonymized aggregates* is defensible; the "byte-equivalence reproduction" QA mode is a landmine. CLEAN: material cutting data (Kienzle/Taylor/J-C — textbook empirical facts), MIT math (algorithms aren't copyrightable — strip any pasted OCW prose). NEEDS-REVIEW: PDF-scraped vendor tool catalogs (EMUGE/Guhring — switch to official ISO 13399 feeds). The roadmap has **zero IP/ToS/EULA/data-licensing unit** (MS1's PCI/GDPR/SOC2 is *customer*-data, the wrong axis). → `MS-LEGAL` ~13 units; `U-LEGAL-13` ("legally clean to sell" sign-off) **gates every paid-tier revenue unit**. |
| 5 | **"Make it work" engine critical path** | v7.1/v7.2 framing PARTLY WRONG | Round-3.5's "SFC needs 5 P0 net-new engines, 14 days" is **empirically false** — `SpindleCharacteristicEngine`, `ToolCatalogEngine`, `DeflectionCalculateEngine`, `GilbertEconomicSpeedEngine`, `MaterialBandResolverEngine` **all exist as TS files; 4 of 5 are already wired** (Gilbert is unwired). Real SFC critical path = ~5 days: wire 8-12 specific orphans + surface 3 actions (`deflection_calculate`, `lathe_cost_optimize`, `material_resolve`) + expand the 60-cell hardness×coolant material data + de-stub 6 mill actions (`mill_chatter_predict`, `mill_scientific_*` — these are 14-15-line stubs, and they're **SFC-blocking**, not MS2) + land the CI non-stub gate FIRST (else GA ships on false-green tests). SFC GA ~May-27 = **realistic**. Master Post GA ~June-24 = **AT RISK** — ~12 lathe-post engines belong in a hoisted P0 set, not the 875-backlog "background lane." ~20 engines (of 875 unwired + ~1,029 monolith) are GA-critical (~2.3%); the rest stay background. The real 875-list is `state/shared/UNWIRED-ENGINE-AUDIT-2026-05-07.json` (BUILD_STATE.json has only a misleading 25-engine sample). → `MS-CRITWIRE` ~20-unit carve-out, ~3 dev-days, hoisted to MS0-P0. |
| 6 | **Go-to-market / acquisition funnel** | GAP — "product-complete and funnel-blind" | Zero acquisition units. No public marketing site (`LandingPage.tsx` is routed *inside* the auth shell — unreachable by strangers). No signup page. No trial mechanics built (`TrialConversionEngine` is deferred to MS1, which is deferred behind the revenue it generates — backwards). `UpgradePromptModal` named, not built. Referral/affiliate: the *fraud heuristic* is specced before the *referral feature* exists. No SEO content, docs site, support channel, or email onboarding. **Two free-tier hooks ARE designed correctly** (SFC Free: 3 calc/day, P-steel, watermarked CSV; Master Post Free: 5 posts/mo, watermarked output). Highest-leverage channel: the free SFC calculator as an SEO + word-of-mouth flywheel (the G-Wizard model) — per-material SEO slugs (`/feeds-speeds/4140-steel`). → `MS-GTM` ~16 units (P0=10, P1=6). |

---

## §R7.1 — Corrected distribution model: web funnel → desktop app capstone

**User directive (2026-05-11):** *"final phase should be launching the prism app as a desktop app (electron maybe)."*

Reconciled architecture:

```
TIER A — Hosted (small, cheap): the FUNNEL + LICENSING backend
  · Public marketing site (prism.app) + the free-tier web tools (free SFC calculator, free Master Post — anonymous, watermarked, rate-limited) — SEO + acquisition
  · Auth + Stripe billing + subscription/license-key issuance + tier validation API
  · Trial mechanics, upgrade prompts, referral
  Runs on Fly.io / Render — single-region, managed Postgres, ~$20-50/mo. NOT a full multi-tenant SaaS.

TIER B — Desktop app (the PRODUCT): PRISM Studio (Electron)
  · Bundles the MCP server + all engines + the React app, runs LOCALLY (full power, offline-capable, no per-request latency, customer's CAD/programs never leave their machine)
  · On launch: validates the license key against TIER A (online check, then cached offline JWT with CRL — the licensing mechanics already exist in extracted_modules/GIANT/PRISM_SUBSCRIPTION_SYSTEM.js)
  · Auto-update channel (electron-updater)
  · CAM-plugin bridges (Fusion 360 add-in, hyperMILL in-host runner) call the LOCAL desktop app's HTTP surface (already exists: TRANSPORT=http on 127.0.0.1)
  Distribution: signed .dmg / .exe / AppImage, downloaded from prism.app after subscribing.

Why this shape: (1) the free web tools are the top of the funnel (SEO, "just use the PRISM calculator") — must be hosted; (2) the full product is compute-heavy + touches customer-confidential CAD/G-code — best run locally (also sidesteps a chunk of the multi-tenant-isolation + data-residency burden); (3) it matches the existing code (HTTP transport already binds local; subscription system has offline-JWT licensing; Cowork/Claude-Code already run PRISM as a local MCP server); (4) it's the standard model for CAM-adjacent prosumer tools (Mastercam, Fusion-desktop, G-Wizard-desktop).
```

**⚠️ Legal tension to flag for the user:** the memory `feedback_no_public_h_drive` says *"nothing from H:/prism may be published/distributed publicly (for now)"* — but a desktop app **distributes the bundled code + data to the customer's machine**. This directive (desktop app as the final phase) effectively supersedes that "for now" constraint for the shippable subset — BUT it makes `MS-LEGAL` even more load-bearing: you can't ship Fanuc/Autodesk-derived alarm/post data *inside a downloadable .exe*. The desktop build MUST contain only `U-LEGAL-13`-cleared data. (And Electron app code-signing + the EULA's no-reverse-engineer clause become real requirements, not nice-to-haves.)

---

## §R7.2 — Six new milestones (unit-count summaries; full unit lists in round6/*.md)

| Milestone | Units | What | Sequencing |
|-----------|-------|------|------------|
| **MS-CRITWIRE** | ~20 | The product-critical engine wiring carved out of MS3's "background lane": wire ~8 SFC engines (`MachineAwareSpeedFeed`, `ProvenSpeedFeedAggregator`, `ChatterStabilityLobe`, `CoolantOptimizationPhysics`, `SpindleTorqueGate`, +3 AI-variant SpeedFeed engines), surface 3 `prism_calc` actions, expand the 60-cell material data, de-stub the 6 mill actions, wire ~12 lathe-post engines. **HOISTED TO MS0-P0** — SFC & Master Post literally don't function without it. ~3 dev-days, 2 chats. | Week 0-1 (concurrent with MS0-backend prereqs + U-REV-CI-00) |
| **MS-PAY** | ~6 | The minimum payment path (NOT the 39-unit MS1 compliance build): `U-PAY-01` Stripe Checkout link + **verified** webhook → tier flag · `U-PAY-02` fix the live-route signature verification [SECURITY] · `U-PAY-03` mount `requireTier` on SFC/MP/CAD-CAM routes · `U-PAY-04` refresh `user.plan` per-request from billing state · `U-PAY-05` Stripe Billing Portal route · `U-PAY-06` one canonical `state/shared/pricing-config.json` (collapse the 4 disagreeing tables; create `feature-tiers.json`). ~5 working days of integration. Replaces the v7.1 "5-unit P0 hoist" framing. | Week 1-2 (concurrent with MS0-EXTENSION pull units) |
| **MS-FRONTEND** | ~14 | Lock the stack (React 19 + Vite 6 + RR7 — already true; supersedes §R5.5 #4) · harvest+archive the 2 codex CAD builds · build the missing revenue pages: Master-Post **upload** page, cross-controller transpiler page, SFC compare/machine-aware pages, pricing→checkout page, billing portal, account/seats page, signup+onboarding · multi-controller Playwright matrix · deploy-ready vite bundle. | Week 1-5 (concurrent with MS0/MS-EXTENSION) |
| **MS-INFRA** | ~12 | The small hosted backend: pick host (Fly/Render) · `fly.toml`/`render.yaml` (TRANSPORT=http, bind 0.0.0.0, /health) · **wire AuthEngine to Postgres** (schema exists; replace in-memory Maps) · DB migration runner in deploy · **real Stripe** (STRIPE_TEST_MODE=false, install SDK, real keys, persist subscriptions) · secrets management (delete the `change-me-in-production` placeholders) · domain + TLS · CI deploy job (build→push image→deploy on main) · CORS + Express prod hardening · managed Postgres · smoke-test-prod gate · port reconciliation (3000 vs 3100). P0 = the minimum to take the first paying customer; the full multi-tenant SaaS (k8s, read replicas, multi-region) is **descoped** by the desktop pivot. | Week 1-4 (concurrent; gates MS-PAY going live) |
| **MS-GTM** | ~16 | P0 (10): public marketing site · wire `FeatureTierEngine`+`feature-tiers.json` · free `/sfc-calculator` outside the auth shell (anonymous, 3/day, per-material SEO slugs) · free `/master-post` ungated · signup+email-verify+onboarding wizard · Stripe Checkout page · build `UpgradePromptModal` (the 5 designed triggers) · activation event tracking (adds the missing trial→paid KPI to MS0-close — closes round-5 a8 #7) · support widget+inbox · docs site. P1 (6): SEO content engine (1 article/material/controller, Ollama-drafts/Claude-reviews) · email onboarding sequence · forward-referral path · affiliate program (now `AffiliateFraudEngine` guards a real feature) · live demo sandbox · in-app expansion prompts. | P0 = Week 2-6; P1 = Week 6+ |
| **MS-LEGAL** | ~13 | `U-LEGAL-01` IP-source risk register → `U-LEGAL-02` engage IP counsel [BLOCKER] → `U-LEGAL-03` **re-derive alarm DB from public operator manuals + PRISM-authored prose** [BLOCKER — Master Post] → `U-LEGAL-04` **re-author post configs from machine-builder programming manuals; quarantine+rebuild every `// Source: *.cps`** [BLOCKER — Master Post] → `U-LEGAL-05` vendor-catalog migration to ISO 13399 feeds [BLOCKER — SFC tool-rec, not SFC core] → `U-LEGAL-06` JM-Die data-use agreement [BLOCKER — any JM-Die-surfacing feature] → `U-LEGAL-07` JM-Die anonymization pass (kill byte-equivalence reproduction in customer-facing surfaces) → `U-LEGAL-08` MIT/academic audit → `U-LEGAL-09` ToS [BLOCKER — launch] → `U-LEGAL-10` EULA / subscription license (reconcile with `PRISM_SUBSCRIPTION_SYSTEM.js`) [BLOCKER — Master Post sale] → `U-LEGAL-11` privacy policy + DPA [BLOCKER — EU customers] → `U-LEGAL-12` output-IP + indemnification policy → `U-LEGAL-13` **"legally clean to sell" sign-off gate — NO paid-tier revenue unit closes until this passes.** | Starts Week 0 (counsel engagement is long-lead); re-derivation work weeks 2-6; **gates Master Post GA and all paid revenue.** |
| **MS-DESKTOP** (final phase) | ~18 | `U-DESK-01` Electron shell scaffold (electron + electron-builder; bundle the MCP server `dist/` + the React `dist/web` + Node runtime) · `U-DESK-02` local-server lifecycle (spawn `dist/index.js` with `TRANSPORT=http PORT=<dynamic> HOST=127.0.0.1` on app start; health-gate the window) · `U-DESK-03` license-key activation flow (online check against MS-INFRA → cache offline JWT + CRL; reuse `PRISM_SUBSCRIPTION_SYSTEM.js` mechanics) · `U-DESK-04` tier enforcement in-app (the same `requireTier` middleware, but the desktop build only ships `U-LEGAL-13`-cleared data) · `U-DESK-05` auto-update channel (electron-updater + a release feed on prism.app) · `U-DESK-06` code-signing (Apple Developer ID + notarization; Windows Authenticode; AppImage for Linux) · `U-DESK-07` file-association + deep-links (`.nc`/`.step`/`.f3d` → open in PRISM Studio) · `U-DESK-08` offline mode (the whole product works without internet; only license-refresh + auto-update need it) · `U-DESK-09` CAM-plugin bridge re-point (Fusion add-in / hyperMILL runner call the local desktop HTTP port, discovered via a lockfile) · `U-DESK-10` crash reporting (Sentry-electron) · `U-DESK-11` first-run onboarding (import shop config, pick machines, license activation) · `U-DESK-12` data-migration (a desktop user's recipes/configs sync to the hosted backend so a web↔desktop user has one account) · `U-DESK-13..15` per-OS installers + the download page on prism.app · `U-DESK-16` desktop-specific Playwright/Spectron E2E · `U-DESK-17` bundle-size budget (the data is ~150MB of catalogs — lazy-download non-core, or accept a ~400MB installer) · `U-DESK-18` "Desktop GA" gate (signed installers for 3 OSes + license flow + auto-update + offline + the cleared data set). | THE FINAL PHASE — after SFC GA, Master Post GA, MS-INFRA, MS-GTM, MS-LEGAL. ~Week 12-18. |

---

## §R7.3 — Corrections to v7.1/v7.2 (fold these in)

1. **Round-3.5's "5 P0 net-new SFC engines, 14 days" is empirically false.** All 5 engines exist as TS; 4 are wired. Relabel the `U-REV-MS0-ENG-*` units from "Build" → "Wire + surface action" (Gilbert: wire + `lathe_cost_optimize`) / "Surface + enrich data" (the rest). SFC's real critical path is `MS-CRITWIRE` (~5 days), not 14. v7.2 §R5.4 already gestured at this ("price net-new at 1-3/day") — make it explicit.
2. **The v7.1 "5-unit P0 hoist" is not a payment path.** `U-SUB-00/19/22/28` = dispatcher scaffold + signature primitives + tax bridge + SOC2 hash-chain. None of that takes a credit card. Add `MS-PAY` (§R7.2) as the actual minimum; keep the other ~37 MS1 units deferred.
3. **The inverted `U-REV-MS0-ACT-SUBTIER-01` dependency** (`depends_on [U-SUB-22, U-SUB-30]` — tier-flip blocked by tax compliance) must be **broken**: tier-flip depends only on `U-PAY-01` (Checkout) + `U-PAY-04` (plan refresh). Tax (`U-SUB-22`) becomes a *follow-on hardening* (you can legally charge a US-only customer with no tax config). This folds into `U-DEP-NORMALIZE` (§R5.2).
4. **`mill_chatter_predict` / `mill_scientific_*` de-stubbing is SFC-blocking, not MS2.** `U-MS2-STUB-SWEEP` (§R5.1 B6) covers it but is filed under MS2 — hoist the mill-physics-stub half into `MS-CRITWIRE` / MS0-P0.
5. **Pricing config fragmentation.** Four hardcoded, mutually-disagreeing tables (`BillingEngine.PLAN_CATALOG`, `StripeBillingEngine.PLAN_PRICES`, `StripeBillingEngine.POST_PROCESSOR_PRICES`, the SFC `round3-5/02` ladder) + the missing `feature-tiers.json`. `U-PAY-06` lands `state/shared/pricing-config.json` as the single source; everything reads from it; the Stripe Price objects (when created in `MS-INFRA`) are generated from it, not maintained separately.
6. **The `post_process` dispatch stub fallback** (`camDispatcher.ts:~2199` — `?? { post_processed: true }`) must be removed (`callOrThrow` instead) so a misconfigured post engine can never false-green a customer. Folds into `MS-CRITWIRE` / `U-MS2-STUB-SWEEP`.

---

## §R7.4 — REVENUE DAY 1 — Definition of Done (the crisp gate)

PRISM "works and generates revenue" when **all** of these are true:

```
□ LEGAL: U-LEGAL-13 passed — alarm DB + post configs re-derived/licensed, ToS+EULA+privacy live,
         output-IP policy published. [Without this, every paid sale is a liability.]
□ DEPLOY: MS-INFRA P0 done — the licensing/funnel backend is live at a real HTTPS domain,
          AuthEngine is on Postgres (survives restart), real Stripe keys, secrets managed.
□ PAY: MS-PAY done — a stranger can hit the pricing page → Stripe Checkout → pay $39 →
       webhook (signature-VERIFIED) → user.tier='pro' → pro features unlock on next request.
□ PRODUCT (SFC): MS-CRITWIRE SFC subset done + the 6 mill stubs de-stubbed + U-REV-CI-00
       (the CI non-stub gate) green — SFC returns real physics-backed numbers, gated by tier,
       no false-green tests. The free SFC tool (3/day, P-steel, watermark) is live OUTSIDE the auth shell.
□ PRODUCT (Master Post): the post path emits clean G-code for ≥2 controllers (Hurco WinMAX + Haas
       per §R5.3) on cleared data; the free tier (1 controller, 5/mo, watermark) is live.
□ FRONTEND: MS-FRONTEND P0 pages exist — pricing→checkout, signup, billing portal, account,
       Master-Post upload, the SFC pages — all behind the multi-controller Playwright matrix.
□ FUNNEL: MS-GTM P0 done — public marketing site indexed, signup works, UpgradePromptModal fires,
       activation tracked, support channel live, docs site live.
□ The trial→paid conversion KPI is in the MS0-close acceptance gate (closes round-5 a8 #7).

REVENUE DAY 1 ≈ Week 6-8 (SFC-led; the free SFC + $39 Pro tier is the first dollar).
DESKTOP GA (MS-DESKTOP) ≈ Week 12-18 (the capstone; signed installers, offline, auto-update, cleared data).
```

---

## §R7.5 — The blockers (in priority order)

1. **`U-LEGAL-13` — IP clearance sign-off.** HARD BLOCKER for Master Post and all paid-tier revenue. Counsel engagement (`U-LEGAL-02`) is long-lead — **start Week 0**. The alarm-DB + post-config re-derivation (`U-LEGAL-03/04`) is ~5-7 weeks of focused work and is on the Master-Post-GA critical path. *Master Post cannot ship — desktop or web — until this passes.* SFC is close to clean (textbook physics) and can ship after the lighter vendor-catalog review (`U-LEGAL-05`).
2. **`U-REV-CI-00` — the CI non-stub gate.** HARD PREREQUISITE before SFC GA. Round-5 a9 confirmed CI has **zero** enforcement of non-stub returns — SFC would GA on false-green tests. Build the 4 audit scripts + `expectNotStub` helper + `revenue-gates` CI job FIRST. (Already in v7.2 §R5.1 B5 — promote it to "Week 0, before any MS0 page marked complete.")
3. **`MS-INFRA` P0 — the minimum licensing backend.** HARD PREREQUISITE before `MS-PAY` can go live. Without a deployed, persistent auth+billing backend, "a customer pays" has nowhere to land. (Reduced scope vs the agent's `MS-DEPLOY` — the desktop pivot kills the multi-tenant-SaaS half.)
4. **The Stripe webhook signature hole** (`U-PAY-02`). SECURITY BLOCKER before going live — currently anyone can self-grant a paid tier. The fix exists in `BillingEngine` (it verifies); the live route just doesn't call it.

---

## §R7.6 — Revised end-to-end sequencing (v7.3)

```
Week 0    U-REV-CI-00 (CI non-stub gate — BEFORE anything else)  ‖  MS-INFRA P0 starts (host + fly.toml + auth→Postgres)
          ‖  U-LEGAL-01/02 (IP register + engage counsel — long-lead, start now)
Week 0-1  MS0-backend prereqs (the 24 backend + the relabeled "wire+surface" SFC engines)  ‖  MS-CRITWIRE (~3 days, 2 chats)
          ‖  U-MONO-MAT-REPOINT + U-MONO-CATALOG-WIRE (§R6 quick wins — coordinate w/ peer)
Week 1-2  MS-PAY (~5 days — Checkout+verified-webhook→tier, requireTier mounting, pricing-config)
          ‖  MS0-EXTENSION pull units (xpost, archive, quote-to-NC — §R5.1 B2/B3/B4)
Week 1-5  MS-FRONTEND (codex-build harvest+archive, the missing revenue pages, Playwright matrix)
Week 1-4  MS-INFRA P0 finish (real Stripe, secrets, domain/TLS, CI deploy, smoke gate)
Week 2-6  MS-GTM P0 (marketing site, free SFC outside auth, signup, UpgradePromptModal, activation, docs, support)
Week 2-6  U-LEGAL-05 (vendor-catalog → ISO 13399 feeds)  →  unblocks SFC tool-rec
~Week 6-8 ★ REVENUE DAY 1 — free SFC live + $39 Pro tier takes money (SFC-led)
Week 3-7  MS3 Lathe-first wire batches (background lane — OFF the critical path)
Week 2-7  U-LEGAL-03/04 (re-derive alarm DB + post configs — ~5-7 weeks, on the Master-Post critical path)
Week 4-9  Master Post product line (44 units, Hurco-first) — BUT every per-controller unit depends_on the cleared data
          U-LEGAL-13 sign-off  →  unblocks Master Post GA
~Week 9-10 ★ Master Post GA (cleared data, ≥2 controllers, free tier + paid)
Week 8-9  MS1 billing/compliance (the ~37 deferred units — tax, dunning, GDPR, SOC2, Paddle, anti-fraud)
Week 8-10 MS-TRAIN (per-customer fit + LoRA — pricing-power lever)
Week 6+   MS-GTM P1 (SEO content engine, email onboarding, referral, affiliate, demo sandbox)
Week 10-13 MS-PILOT phase-7 per-machine (Haas TM-1P first — on the REAL JM-Die fleet per §R5.2)
Week 12-18 ★ MS-DESKTOP — the final phase: Electron shell, bundled local server, license activation,
          auto-update, code-signing, offline, CAM-plugin re-point, per-OS installers → Desktop GA
Background MS3.5 (415 engines) + MS-ML-PLUMBING (289) + MS-MONOLITH-HARVEST P2 (~1,200 modules) — continuous, never on the critical path
          MS4 (2-3 envelope-drift) + MS5 (4 revenue-cluster-audit) — opportunistic
```

**v7.3 total footprint:** ~215 (v7.1) + ~24 (§R5 folds) + 3 quick wins + ~1,350 monolith-harvest (background) + ~20 MS-CRITWIRE + ~6 MS-PAY + ~14 MS-FRONTEND + ~12 MS-INFRA + ~16 MS-GTM + ~13 MS-LEGAL + ~18 MS-DESKTOP ≈ **~330 units on the critical-path-eligible side** (the monolith-harvest P2 backlog is the only thing that pushes the grand total into the thousands, and it's pure background).

---

## §R7.7 — Compounding-gains artifact for this round

`scripts/revenue-day1-checklist.mjs` (re-runnable): reads `state/shared/BUILD_STATE.json` + `UNWIRED-ENGINE-AUDIT-2026-05-07.json` + greps for the §R7.4 Definition-of-Done conditions (CI gate present? AuthEngine on Postgres? Stripe live-mode? `requireTier` mounted? free SFC route outside auth shell? `pricing-config.json` exists? `feature-tiers.json` exists? marketing site route public? `U-LEGAL-13` ledger entry?) and emits a green/red Revenue-Day-1 readiness board. (Not yet built — first unit of the closure work.)

---

_End of v7.3 closure layer. Merge target: `state/shared/specs/REVENUE-ROADMAP-v7.3.md` (= v7.1 + §R5 + §R6 + this §R7)._

---

# REVENUE-ROADMAP v7.2 — Round-5 Consensus Resolution Layer

**Generated:** 2026-05-11 (round-5 consensus fold)
**Source:** 10 parallel consensus agents (round5/01-10) + 4 prior rounds (122 + 104 + 16 + 20 prior findings)
**Verdict:** **CONDITIONAL-GO** — v7.1 architecture is sound (acyclic dep graph, correct dispatcher topology, lane discipline OK). Ships after the 6 BLOCKER folds + 8 high-leverage MAJOR folds below. **No re-architecture required.**

---

## §R5.0 — Round-5 verdict matrix

| # | Angle | Verdict | Headline |
|---|-------|---------|----------|
| a1 | Codex-parity architecture | PASS-WITH-CHANGES | Acyclic + reference-clean + correct dispatcher topology. Load-bearing fix: cross-MS ordering must be explicit `depends_on`, not prose. |
| a2 | Opus-deep correctness | PASS-WITH-CHANGES | v7.B physics rewrite is sound. 1 BLOCKER: Row 25 `mc` exponents diverge from `constants.ts` for K/N/S. 2 MAJOR: Row 5 chip-thinning missing arcsin; Row 3 SLD missing `Re[Φ]≥0` guard. |
| a3 | Gemini-broad coherence | REVISE | Coherent within sections, fractures across milestones: MS-PILOT validates a phantom fleet; TRAIN/PILOT controller-set mismatch; build-vision Master-Post differentiators unfunded; CAM tier-1 scope drift; B250II→B250IIW rename not propagated; MS0 unit-count off-by-6. |
| a4 | Dep-graph verifier | FAIL (fixable) | 0 cycles, 0 unresolved IDs in declared fields. 3 hard blockers — all "spec prose says X must precede Y but no `depends_on` edge exists." 11 MS1 leaf orphans, 4 ghost carryover IDs. |
| a5 | Customer-pull validator | MIXED | SFC/CAD/blueprint pull is strong. ~20 infra-disguised-as-revenue units. 8 high-pull surfaces ABSENT (the JM-Die archive directory structure proves they are 1st-class shop concepts): cross-controller G-code rewrite, customer-program reuse search, quote-to-NC pipeline, lights-out readiness verdict, overnight job migration, tribal customer page, reverse-engineering workflow, setup-sheet/probe/queue pages. |
| a6 | Build-cost estimator | AGREE-WITH-CAVEAT | ~215 units → ~430 weighted → ~22 single-lane dev-weeks → ~10 calendar weeks at 2.2× concurrency. SFC GA ~2026-05-27. Master Post GA ~2026-06-24. MS-PILOT phase-7 ~1.5-2 dev-wk/machine. 3 caveats. |
| a7 | Revenue projection | CONDITIONALLY-POSITIVE | Pessimistic $36K/$125K · Realistic $359K/$1.64M · Optimistic $1.06M/$5.54M (12mo/36mo ARR). **Master Post = biggest ARR-per-eng-week unlock — ship FIRST.** MS-PILOT = credibility lever (pessimistic→realistic). MS-TRAIN = pricing-power lever (Omega 0.75→1.0). |
| a8 | Risk-register synthesizer | PASS-WITH-RESIDUAL-RISK | 16/18 unique BLOCKERS across all 36 prior agents ARE addressed in v7.1. 2 physics residuals (Row 25 mc, Row 5 chip-thinning). 9 MAJOR residuals (SLD guard, Weibull RUL incomplete-gamma, MATBAND citations, MS2-collapse cross-tab, v7.A scripts have no build unit, frontend-merge unowned, test-import-resolution gate, MIPSolver unhomed, LEARN trial→paid KPI). |
| a9 | CI-enforceability audit | BLOCKER | v7.A "verification HARD GATE" is NOT CI-enforceable today. 4 named `verifies_via:` scripts don't exist on disk. ci.yml has zero v7.A enforcement steps. 4/6 stub-trap dispatcher actions have no remediation unit. 16 false-green tests have no remediation unit. ~38 dev-h to make CI-enforceable + ~16 dev-h engine work. |
| a10 | HTML-companion regen | STALE_SOURCE | Emitter runs clean (20.5KB, exit 0) but reads ONLY the legacy `REVENUE-ROADMAP-2026-05-10.md`. The 189KB v7.1 spec is invisible to the companion. Needs `--spec=` flag + `extractV7BRows` boundary fix + regen `REVENUE-READINESS.json` against v7.1 first. |

**Tally:** 84 round-5 findings — 6 BLOCKER, 50 MAJOR, 28 MINOR. Across all 5 rounds: ~246 findings total.

---

## §R5.1 — BLOCKER folds (6) — must merge before MS0 paywall activation

### B1 — Row 25 `mc` exponents must equal `constants.ts` (a2 R5A2-001, a8 R5A8-017)
**Defect:** v7.B Row 25 data surface lists `mc = {P:0.25, M:0.25, K:0.22, N:0.20, S:0.30, H:0.30}` for ISO P/M/K/N/S/H. Canonical `mcp-server/src/physics/constants.ts` L34-L41 has `K:0.28, N:0.22, S:0.27`. Three of six disagree → 5-30% Fc error on K/N/S (cast iron, aluminium, superalloy — exactly the materials JM Die runs most).
**Fix (1 doc unit, 0 code):** `U-REVB-MC-CANON` — edit v7.B Row 25 to read `mc = {P:0.25, M:0.25, K:0.28, N:0.22, S:0.27, H:0.30}` and append the doctrine line "All Kienzle `kc1.1`, `mc`, Taylor `n`, J-C coefficients are mirrored verbatim from `constants.ts`; this table is a reference copy, not a source — any divergence is a bug." Add a CI assertion (folds into B5) that greps the v7.B table against `constants.ts` and fails on mismatch.

### B2 — Cross-controller G-code rewrite is a 1st-class shop need, absent from v7.1 (a5 R5A5-005)
**Evidence:** `JM_DIE_CONTROLLER_MAP` = 5 dialects on 15 machines (7× Okuma OSP, 2× Haas, 1× Hurco WinMAX, 1× Roku-Roku Fanuc, 2× Mitsubishi sinker, 1× Mitsubishi wire). A program written for the Okuma won't run on the Haas — daily reality, Practical Machinist's #1 recurring question, ~$99/mo standalone product.
**Fix (3 units, hoisted into MS0-EXTENSION ahead of MS1 billing):**
- `U-REV-XPOST-01` — controller-dialect transpiler page (consume `cam_gcode_transpile` / `dialect_translate` from camDispatcher; 5-dialect span test: Okuma↔Haas, Fanuc↔Haas, Mazatrol→Fanuc).
- `U-REV-XPOST-02` — round-trip safety verifier (re-parse the transpiled program through `gcode_safety_analyze`; flag any rapid/feedrate semantic drift).
- `U-REV-XPOST-03` — controller-capability gate (block transpile if target controller lacks a feature the source uses — e.g. G68.2 tilted plane → controller without RTCP).

### B3 — Customer-program reuse search absent from v7.1 (a5 R5A5-006)
**Evidence:** `JM_DIE_CUSTOMERS` = 118 customers, `JM_DIE_PROGRAM_COUNT` = 24,545. Archive top-level: ITW, ALCOA, ARCONIC, SFS, HOLO-KROME, SIG SAUER, FASTENAL — repeat customers, repeat parts. "What did we run for ITW last time on this part?" is the killer moat; v7.1 ships zero archive search.
**Fix (2 units, MS0-EXTENSION):**
- `U-REV-ARCHIVE-01` — customer/program history search page (semantic search over the indexed archive; filter by customer / material / machine / date; return prior program + setup sheet + measured results if logged).
- `U-REV-ARCHIVE-02` — "similar part" recommender (geometric + parametric similarity over the archive; surface the closest 3 prior jobs with their parameter sets — feeds quoting + first-article).

### B4 — Other 6 high-pull surfaces hoisted (a5 R5A5-001..020 residue)
**Fix (3 net-new units + 3 retitle/rescope existing, MS0-EXTENSION):**
- `U-REV-QUOTE-NC-01` — quote-to-NC pipeline page (the brochure promise; chains `blueprint_to_quote` → `process_plan_generate` → `production_toolpath_generate` → post; gated, operator-confirm at each stage).
- `U-REV-LIGHTSOUT-01` — lights-out readiness verdict page (consume `pipeline_safety_assess` + `omega_safety_score`; emotional pull: "is it safe to leave this running overnight?" — yes/no + the 3 specific risks).
- `U-REV-MIGRATE-01` — overnight job migration page (machine-A down at 2am → re-route this job to machine-B: re-transpile (B2), re-validate fixturing, re-time; reactive scenario).
- Retitle: `U-REV-MS0-TRIBAL-*` → add a customer-facing tribal-knowledge page (moat exposure — "here's what our shop knows about this material").
- Rescope: existing `U-REV-MS0-CAD-*` set must include a reverse-engineering import path (the `JM DIE/REVERSE ENGINEERING/` directory proves it's a 1st-class workflow).
- Rescope: existing setup-sheet/probe-routine pages must surface a production-queue view (the `JM DIE/SETUPS/` and `JM DIE/QUEUE/` directories prove these are 1st-class shop concepts).

### B5 — v7.A verification gate is NOT CI-enforceable (a9 R5A9-001, R5A9-002; a8 R5A8 residual)
**Defect:** v7.1 lines 290, 962 and the MS1 `verifies_via:` blocks reference `scripts/check-engine-wired.mjs`, `scripts/audit-sfc-cluster.mjs`, `scripts/paddle-fixture-replay.mjs`, `scripts/vies-sandbox-probe.mjs`, plus an `expectNotStub` test helper and the `verify-bridge` / `spans-config-matrix` / `audit-test-assertion-density` proposals — **none exist on disk.** `ci.yml` `build-and-test` = `npm run build` + `npx vitest run --cache` only; zero v7.A enforcement. CI is green while MS0 dispatcher actions return `{ok:false,stub:true}`.
**Fix — `U-REV-CI-00` is a HARD PREREQUISITE before any MS0 page is marked complete (1 unit, ~38 dev-h):**
1. Build `scripts/check-engine-wired.mjs` (asserts: for each engine named in a unit, `import + call + action-enum + Zod schema` all present in the named dispatcher; round-trip E2E assertion exists).
2. Build `scripts/audit-test-assertion-density.mjs` (flags test files whose assertions are `toBeDefined()` / `toBeTruthy()` only — the 16-false-green class).
3. Build `scripts/audit-stub-engine-returns.mjs` (greps dispatched engine outputs for `{ok:false,stub:true}` / placeholder returns; outputs the stub-trap inventory).
4. Build `scripts/spans-config-matrix.mjs` (asserts: for a domain with N configs, ≥3 spanning configs are exercised in tests).
5. Add `expectNotStub(result)` helper to the test utils.
6. Add a `revenue-gates` job to `.github/workflows/ci.yml` that runs 1-4 and **fails the build** on any violation. External-CLI `verifies_via:` (Stripe/Paddle/VIES) move to a separate manual `revenue-integration-check` workflow (cassette-replayed in CI, live-probed pre-release).

### B6 — 4 of 6 stub-trap dispatcher actions have no remediation unit (a9 R5A9-003)
**Defect:** round3/10 catalogued 6 stub-trap actions. v7.1 has remediation units only for `mill_chatter_predict` and `mill_scientific_analyze`. Unaddressed: `mill_scientific_optimize`, `mill_uncertainty_quantify` (`MillScientificPipelineEngine` 14-line stub), `mill_physics_*` (`MillingForceEngine` 15-line stub — millDispatcher 'physics' bucket L66), `blueprint_program_join` (CAD path). None of the 2 existing remediations are CI-gated.
**Fix (1 unit, ~16 dev-h, MS2-P0):** `U-MS2-STUB-SWEEP` — replace all 6 stub returns with real engine calls (`MillingForceEngine` → `MillingPhysicsKernelEngine`; `MillScientificPipelineEngine` → wire the real `prism_calc` physics chain; `blueprint_program_join` → the actual `print_to_program_full` path), each with a dispatcher-contract test that `expectNotStub`s the result and is gated by the B5 `revenue-gates` job. **This unit blocks every MS2 mill-physics unit** (they must not be allowed to wire to the stub — a1 R5A1-003).

---

## §R5.2 — High-leverage MAJOR folds (8)

| ID | From | Fold |
|----|------|------|
| `U-DEP-NORMALIZE` | a1 R5A1-001/002, a4 R5A4-001/008 | New MS0-P0 unit: normalize MS2/MS3 narrative track/batch tables AND every cross-MS prose dependency into explicit `depends_on:` fields, so the Stop-hook orphan/cycle gate covers 100% of units (currently ~40% escape it). Specifically: MS0 paywall units `depends_on: [U-SUB-00, U-SUB-19, U-SUB-22, U-SUB-28]`; `U-SUB-04 depends_on: [U-SUB-00, U-SUB-03]`; `U-REV-MS0-ACT-SUBTIER-01 depends_on: [U-SUB-22, U-SUB-30]` (else EU/UK/CA/AU customers get non-tax-compliant invoices). |
| `U-MS2-MILLPHYS-FENCE` | a1 R5A1-003 | Already covered by B6's `U-MS2-STUB-SWEEP` as the precondition; this is the explicit `depends_on` edge: every MS2 unit touching the millDispatcher 'physics' bucket `depends_on: [U-MS2-STUB-SWEEP]`. |
| `U-MASTERPOST-FENCE` | a1 R5A1-004 | Master Post milestone gets a scope-fence section: it OWNS the 53-engine PostProcessor consolidation → 1 MasterPost + 9 vendor strategies; MS2's lathe-post / hyperMILL-NC dispatcher units `depends_on:` the MasterPost OmegaGate PreEmit unit (no parallel re-implementation). |
| `U-REVB-CHIPTHIN-ARCSIN` | a2 R5A2-002, a8 R5A8-018 | v7.B Row 5: replace `h_m = (180/π·a_e/D)·f_z·sin(κ)` with the full Sandvik form `h_ex = f_z · sin(κ) · sin(φ_ex)` where `φ_ex = arccos(1 − 2a_e/D)` (radial-immersion-correct; the linear form is valid only at `a_e/D ≤ 0.3`, diverges 12-30% at conventional immersion). |
| `U-REVB-SLD-GUARD` | a2 R5A2-004 | v7.B Row 3 (Altintas SLD): add the `Re[Φ(ωc)] ≥ 0` sign-convention guard before computing `a_p,lim = −1/(2·K_t·N·Re[Φ])`; below the guard, the chatter-free depth is unbounded — return `a_p,lim = ∞` (machine-limited) rather than a negative/NaN. |
| `U-PILOT-FLEET-REGROUND` | a3 R5A3-001/002 | MS-PILOT phases P2-P5 must be re-scoped onto the **actual JM-Die 15-machine fleet** (Haas TM-1P first → then the 7 Okuma OSP machines → Hurco WinMAX → Mitsubishi sinker/wire). Delete the phantom machines (Mori-SL-3, Bridgeport-1985, Mazak-QT-200, Doosan-DNM-4500, Mazak-Integrex — none are in `jm-die-profile.ts`). MS-PILOT byte-equivalence gate covers ONLY controllers MS-TRAIN trained (drop Mazatrol Smooth-G — TRAIN never trained it, Master Post defers it post-MVP). |
| `U-MP-DIFFERENTIATOR-FUND` | a3 R5A3-004 | Fund the build-vision Master-Post differentiators currently unfunded in the 40 MP units: per-block adaptive S/F E2E test (this is the headline saleable differentiator), lead-in/out optimization (currently a stub), build-quality-aware feed ceiling (currently a stub), resolve the 35-vs-38-stage pipeline conflict. +4 units → MP becomes 44 units. |
| `U-CAM-TIER1-COMPLETE` | a3 R5A3-005 | CLAUDE-BRIEF names 6 tier-1 CAMs (Fusion 360, hyperMILL, Mastercam, Esprit, Inventor HSM, SolidWorks). v7.1 has parser units for only 4. Add `U-CAM-PARSE-INVENTOR-HSM` + `U-CAM-PARSE-SOLIDWORKS`; demote SolidCAM out of the tier-1 parser list (it's tier-2 per CLAUDE-BRIEF — keep its strategy bridge, drop the parser claim). |

**Plus housekeeping MAJORS folded inline:** B250II→B250IIW rename propagated through MS-MASTERPOST L1475 (a3 R5A3-006); MS0 unit-count reconciled to a single partition (24 backend + 37 customer = 61 — the recon's 18+43 was an arithmetic slip; a3 R5A3-007); 4 zombie carryover IDs (`U-SUB-09/12/13/15`) removed from MS1's net-43 count → MS1 is **39 real units + 4 retired-but-listed-for-provenance** (a4 R5A4-004); the 11 MS1 leaf orphans (`U-SUB-21/23/25/26/29/31/34/35/38/41/42/43`) either get an incoming edge or are named explicitly in the MS1-close acceptance gate (a4 R5A4-003).

---

## §R5.3 — Revised milestone sequencing (Master-Post-first, pull-first MS0)

Round-5 a7 (revenue) + a6 (build-cost) + a5 (customer-pull) converge on the same re-ordering. The v7.1 sequencing said "MS0 → MS1 → MS2…"; v7.2 says:

```
Week 0-1   MS0-backend prereqs (serial — the 24 backend + 5 net-new SFC engines, 1-3/day)
           ‖ U-REV-CI-00 (B5 — must land before any MS0 page marked complete)
Week 1-4   MS0-EXTENSION pull units FIRST  (B2 xpost · B3 archive · B4 quote-to-NC/lightsout/migrate)
           → SFC GA  ~2026-05-27   ← first dollar
Week 3-7   MS3 Lathe-first wire batches (12 × 9.5 avg — OFF the GA critical path)
Week 4-8   Master Post product line (44 units, Hurco-WinMAX-first → Haas → Fanuc → Okuma → Mazak last)
           → Master Post GA  ~2026-06-24   ← biggest ARR-per-eng-week unlock (a7)
Week 6-8   MS2 invention units (24 — gated behind U-MS2-STUB-SWEEP)
Week 8-9   MS1 billing/compliance (39 real units — deferred until there's revenue to bill)
Week 8-10  MS-TRAIN (20 units — pricing-power lever, Omega 0.75→1.0 per machine)
Week 10-13 MS-PILOT phase-7 per-machine (Haas TM-1P first; ~1.5-2 dev-wk/machine; hard-gated on MS-TRAIN)
Background  MS3.5 (415-engine carry-over) + MS-ML-PLUMBING (289 engines) — continuous lane, never on critical path
           MS4 (2-3 envelope-drift units) + MS5 (4 revenue-cluster-audit units) — opportunistic
```

**Why MS1 moves late:** a5's "building enterprise billing before $1 ARR is the textbook startup death spiral" + Stripe/Paddle already do 80% of MS1 out-of-the-box. The 5-unit P0 hoist set (`U-SUB-00/19/22/28` + the dispatcher scaffold) still lands in Week 1 so the paywall *can* light up — but the full 39-unit compliance build waits until SFC + Master Post have paying customers.

---

## §R5.4 — Build cost & revenue (round-5 a6 + a7)

**Build cost (a6):** ~215 units → ~430 weighted (P0=1.5× · P1=1× · P2=0.7×) → ~22 single-lane dev-weeks → **~10 calendar weeks** at realistic 2.2× chat-concurrency (P0 engine work can't fan out). Caveats: (1) keep MS3.5 + ML-plumbing off the GA critical path; (2) price MS0 net-new engines at 1-3/day not 6; (3) decompose MS-PILOT phase-7 into per-machine sub-units with explicit MS-TRAIN deps — without these, dates slip ~1 quarter.

| Milestone | Real units | Weighted | Dev-weeks (single-lane) | Calendar |
|-----------|-----------:|---------:|------------------------:|---------:|
| MS0 + MS0-EXTENSION | 61 + 11 | ~140 | ~7 | wk 0-4 |
| U-REV-CI-00 | 1 | ~10 (38 dev-h) | ~1 | wk 0-1 ‖ |
| MS3 (Lathe-first sprint batches) | ~116 wired | ~50 | ~3 | wk 3-7 (parallel lane) |
| Master Post | 44 | ~70 | ~4 | wk 4-8 |
| MS2 | 24 | ~40 | ~2.5 | wk 6-8 |
| MS1 | 39 (+4 retired) | ~55 | ~3 | wk 8-9 |
| MS-TRAIN | 20 | ~30 | ~2 | wk 8-10 |
| MS-PILOT | 15 (7-phase × per-machine) | ~30 | ~2 + 1.5-2/machine | wk 10-13+ |
| MS4 + MS5 | 2-3 + 4 | ~10 | ~1 | opportunistic |
| **Total (critical-path)** | **~215** | **~430** | **~22** | **~10 wk @ 2.2×** |

**Revenue (a7) — ARR, USD, pricing: SFC $49/$199/$999 mo · Master Post $299/controller / $1499 unlimited mo · CAD/CAM-AI $499 mo · 13,000 addressable US job-shops:**

| Scenario | Target-conversion | 12-month ARR | 36-month ARR |
|----------|------------------:|-------------:|-------------:|
| Pessimistic | 10% | $36K | $125K |
| **Realistic** | **40%** | **$359K** | **$1.64M** |
| Optimistic | 80% | $1.06M | $5.54M |

**Biggest ARR unlock: Master Post** (independent surface — no MS0-page-unstub / no MS2-5 dependency; backend 70% built; 4-week MVP; per-controller pricing into ~13K controller-pained shops; highest revenue-per-engineering-week of any milestone). **MS-PILOT** = the credibility multiplier that flips pessimistic→realistic (~2× new-logo rate once "proven on a real 21-machine shop"). **MS-TRAIN** = the pricing-power lever (envelope-Omega 0.75 → fitted-Omega 1.0 justifies the premium tiers; adds margin, not logos). Optimistic case needs all three.

**Revenue-linkage classification (a7 confirms v7.1 gets this right):** 18 ADMIN/RBAC/seat/tier/`prism_subscription`-scaffold units = revenue-**enabling** infra (P0, must ship, no direct ARR line) — *distinct from* the 289 ML-plumbing engines + 55 facades/wrappers which are genuinely zero-revenue and correctly deferred to MS-ML-PLUMBING. Single biggest risk to every number above: **execution never starting / 3way-scrutiny-gate velocity throttle** — not the market.

---

## §R5.5 — Residual MAJORS deferred (tracked, not blocking)

These 9 (a8's residual list, minus the ones folded above) are logged for the next pass — none block MS0:

1. Weibull conditional-mean RUL (v7.B Row 15) needs the upper-incomplete-gamma form, not the unconditional mean × survival.
2. MATBAND-01 hardness/coolant modifier coefficients need source citations.
3. MS2-collapse (42→24) vs the 23-net-new-v7.B-engine list — needs a cross-tabulation so the two don't double-count.
4. React 18 vs 19 frontend-merge decision (`cqask/ui` Next13+AntD vs `mcp-cadquery/frontend` Vite+React19) — unowned; assign to a frontend-merge unit.
5. Test-import-resolution gate (a test that fails when an engine import path breaks) — missing.
6. `MIPSolverEngine` / `Z3SolverEngine` homing — which dispatcher owns the symbolic-solver T6 actions? Currently unhomed.
7. LEARN trial→paid conversion KPI — not in any acceptance gate.
8. The 16 false-green tests — `U-REV-CI-00` (B5) builds the *detector*; a follow-up unit must *fix* the 16 once enumerated.
9. HTML companion (`emit-revenue-roadmap-html.mjs`) — `--spec=` flag + `extractV7BRows` boundary fix + regen `REVENUE-READINESS.json` against v7.2 first (a10). **This one is fixed in this commit** — see §R5.6.

---

## §R5.6 — Compounding-gains artifact (this round's tax)

`scripts/emit-revenue-roadmap-html.mjs` gains a `--spec=<path>` flag (default now `REVENUE-ROADMAP-v7.1.md`, falls back to legacy if absent) and `extractV7BRows` is widened to match both `## v7.B` and `## REVENUE-... v7.B v2` section boundaries — so the HTML companion tracks the live spec instead of the frozen legacy one. The readiness scorer (`revenue-readiness-score.mjs`) is re-pointed at v7.1/v7.2 so the tier-pie + compliance-UL + readiness-banner render with real data. (a10 R5A10-001..006.)

---

---

## §R6 — MS-MONOLITH-HARVEST (new milestone) — re-hydrate the PRISM v8.89 monolith

**Discovery (2026-05-11, 3 parallel survey agents + system-viz):** `H:/prism/extracted/` (91 MB, 895 files — datasets) and `H:/prism/extracted_modules/` (149 MB, ~1048 files — ported JS engine modules) hold the decomposed PRISM v8.89 monolith: a 986,622-line HTML build → **1,469 modules (1,000 unique), 71 formulas, 20 algorithms, 200 gateway routes**. Module mix: ~382 general engines · ~116-128 AI/ML · ~87-128 databases · ~31 optimization · 20 physics formulas · 13 signal-processing · 12 neural/deep-learning · ~336-537 other. Master maps: `extracted_modules/{MONOLITH_MODULE_INVENTORY,FINAL_EXTRACTION_SUMMARY,MODULES_BY_CATEGORY,EXTRACTION_PRIORITY_LIST}.json`, `extracted/{MASTER_EXTRACTION_INDEX,EXTRACTION_REGISTRY}.json`. Full state in wiki: `[[prism-v8-89-monolith-extraction]]`.

**Current reachability: ~8-12% live.** Datasets ≈70% bridged (machines/alarms/post-DB/knowledge-bases ✓; materials ⚠️ misconfigured PATHS; ~17/52 algorithms; 8 vendor catalogs ⚠️ `CatalogRegistryBridgeEngine` orphaned). Ported engine modules ≈95% orphaned — only the 8 L2 engines (`prism_l2`) were rewritten as TS. The other **~1,350 monolith modules sit as raw `.js` dumps** — a SEPARATE, LARGER pool than the 875 "unwired" TS engines in BUILD_STATE (those at least exist as TS).

**Why this is in the revenue lane:** the orphaned monolith source is the *source material* for the v7.2 build targets — porting it accelerates SFC, Master Post, MS1, CADCAM-AI, LEARN:
- **Master Post** ← `extracted_modules/GIANT/PRISM_POST_PROCESSOR_GENERATOR.js` (6.5 MB), `PRISM_VERIFIED_POST_DATABASE_V2.js` (5.6 MB — 50+ verified controllers), `extracted/engines/POST_PROCESSOR_100_PERCENT.js` (1,205 lines, 40+ cycles × 15+ dialects). The v7.2 44-unit Master Post line should *first survey these* before re-implementing from scratch.
- **SFC** ← `extracted/materials_v9_complete/` (1,047 materials), `extracted/catalogs/` (8 vendor catalogs), `PRISM_SIGNAL_ENHANCED.js` (7 MB cutting physics/chatter/thermal), `PRISM_PSO_OPTIMIZER.js` (8.3 MB speed/feed opt), Kienzle/Taylor formula files. The round-3.5 5-P0-net-new-engine claim (`SpindleCharacteristic/ToolCatalog/DeflectionCalculate/Gilbert/MaterialBand`) should check these first — some may be partial-ports, not green-field.
- **MS1 billing** ← `extracted_modules/GIANT/PRISM_SUBSCRIPTION_SYSTEM.js` (8.6 MB — subscription/licensing mechanics; check before building the 39-unit MS1 from scratch).
- **CADCAM-AI** ← `PRISM_AI_100_KB_CONNECTOR.js` (7.2 MB), `PRISM_AI_EXPERT_INTEGRATION.js` (6.6 MB), `PRISM_PRECISION.js` (5.4 MB), `PRISM_TOOLPATH_STRATEGIES_COMPLETE.js`, CAD/CAM kernels.
- **LEARN** ← `extracted_modules/complete_extraction/PRISM_220_COURSE_*` (the 220-course catalog).

### 3 quick wins — hoisted into MS0-EXTENSION (tiny, high-leverage, but touch core MCP code → coordinate lane with peer chat first)

| Unit | What | File(s) | Unlocks | Lane |
|------|------|---------|---------|------|
| `U-MONO-MAT-REPOINT` | Repoint `PATHS.MATERIALS_DB` from `mcp-server/data/materials/` (3 files) to `extracted/materials_v9_complete/` (1,047 materials). 1-line + a `MaterialRegistry` load-count assertion test. | `mcp-server/src/constants.ts:61` | 1,047 materials → SFC | dev-tools/infra (peer) — but revenue-critical; coordinate |
| `U-MONO-CATALOG-WIRE` | Fix `CatalogRegistryBridgeEngine.loadCatalog()` to read the actual `extracted/catalogs/*.json` (currently expects nonexistent `.js`), then wire `enrichAll()` to a `prism_data:catalog_bridge_enrich_all` action + call it in registry-seed bootstrap. Test: round-trip 3+ vendor catalogs through `prism_data`. | `mcp-server/src/engines/CatalogRegistryBridgeEngine.ts`, `dataDispatcher.ts` | 8 vendor tool catalogs → SFC tool selection | dev-tools (peer); coordinate |
| `U-MONO-ALGO-SURFACE` | Surface the ~35 orphaned algorithms in `AlgorithmRegistry` (52 files in `extracted/algorithms/` minus ~17 loaded). Test: registry count ≥ 50. | `mcp-server/src/registries/AlgorithmRegistry.ts` | ~35 algorithms → `prism_calc`/`prism_toolpath` | dev-tools (peer); coordinate |

### MS-MONOLITH-HARVEST proper (~1,350 modules — continuous background lane)

Port the orphaned `extracted_modules/` engines, prioritized by `EXTRACTION_PRIORITY_LIST.json` AND revenue product. Each port = `.js` → `.ts` engine class + companion test + dispatcher wiring (`import + call + action-enum + Zod schema + round-trip E2E`) — the standard PRISM engine-creation discipline. Ordering:

```
P0 (revenue-critical — fold into the milestones that need them):
   PRISM_POST_PROCESSOR_GENERATOR + PRISM_VERIFIED_POST_DATABASE_V2 + POST_PROCESSOR_100_PERCENT → Master Post line (week 4-8)
   PRISM_SIGNAL_ENHANCED + PRISM_PSO_OPTIMIZER → SFC (week 1-4) — cross-check the 5 round-3.5 P0 engines first
   PRISM_SUBSCRIPTION_SYSTEM → MS1 billing (week 8-9)
P1:
   PRISM_AI_100_KB_CONNECTOR + PRISM_AI_EXPERT_INTEGRATION + PRISM_PRECISION → CADCAM-AI
   PRISM_220_COURSE_* → LEARN
   the ~31 optimization + ~20 physics-formula + ~13 signal-processing modules → prism_calc / prism_toolpath / prism_ai
P2 (continuous background lane, never on the GA critical path — like MS3.5):
   the remaining ~1,200 modules by EXTRACTION_PRIORITY_LIST order (AI_ML → PHYSICS → GEOMETRY → DATABASES → SYSTEM → OTHER)
   ~1,350 modules ÷ ~9.5/batch ≈ ~142 batches @ ~9.5 avg
```

**Cross-cutting requirement (folds into U-DEP-NORMALIZE §R5.2):** before any MS that re-implements from scratch (Master Post, SFC net-new engines, MS1 billing), the first unit must be a **monolith-source survey** of the relevant `extracted_modules/*.js` — re-implement only what isn't already ported, port the rest. This is the `R8 — Read before you write` discipline applied at the milestone level.

**Compounding-gains artifact for this round:** a `scripts/monolith-harvest-status.mjs` (re-runnable) that reads `MONOLITH_MODULE_INVENTORY.json` + `EXTRACTION_PRIORITY_LIST.json` + greps `mcp-server/src/engines/` for ported counterparts, and emits per-category {ported / orphaned / next-batch}. (Not yet built — first unit of MS-MONOLITH-HARVEST.)

---

_End of v7.2 resolution layer. Merge target: `state/shared/specs/REVENUE-ROADMAP-v7.2.md` (= v7.1 + this layer prepended as §R5+§R6)._

---

# ─────────  v7.1 SPEC (FULL — unchanged, see §R5/§R6/§R7 for the deltas)  ─────────

# PRISM Revenue Roadmap — v7.1

**Generated:** 2026-05-11T03:06:17.328Z
**Source round:** 4
**Sections merged:** 10
**Owner:** claude-99eca613 (revenue lane)

## Provenance

This file is auto-assembled from per-section drafts emitted by parallel spec-revision subagents.
Do NOT edit by hand — edit the underlying section drafts and re-run:

```
node scripts/merge-roadmap-sections.mjs --round 4 --version 7.1
```

## Section index

- `01-ms0-v2-section.md` (mtime 2026-05-11T02:27:22.781Z)
- `02-ms1-v2-section.md` (mtime 2026-05-11T02:28:16.291Z)
- `03-ms2-v2-section.md` (mtime 2026-05-11T02:27:25.066Z)
- `04-ms3-v2-section.md` (mtime 2026-05-11T02:48:21.453Z)
- `05-ms4-ms5-v2-section.md` (mtime 2026-05-11T02:27:57.880Z)
- `06-v7b-v2-section.md` (mtime 2026-05-11T02:28:44.652Z)
- `07-v7c-v2-section.md` (mtime 2026-05-11T02:27:54.132Z)
- `08-masterpost-section.md` (mtime 2026-05-11T02:28:06.172Z)
- `09-ms-train-section.md` (mtime 2026-05-11T02:29:09.737Z)
- `10-ms-pilot-section.md` (mtime 2026-05-11T02:28:16.980Z)

---
## REVENUE-MS0 v2 — SFC-first, dependency-repaired (paste-ready section)

**Why v2:** Round-3 found 12 dispatcher actions MISSING + 4 STUB-routed; Round-3.5 found SFC backend is only 35% ship-ready (5 net-new engines required); Round-3/02 Pareto-min showed 5 MS3 sub-batches must hoist into MS0 to unblock 75.7% of pages. The prior MS0 (37 units, MILL-first ordering) cannot ship as written. v2 reorders to SFC-first (P0 revenue), hoists Pareto-min wiring, adds 5 net-new P0/P1 engine units, documents missing dispatcher actions, and fixes the 37-vs-40 count drift by adopting the canonical **37 customer pages + 9 backend-prereq units + 4 stub-remediation units + 5 net-new engine units + 5 hoist-wiring units + 1 billing-concurrency unit = 61 units total**.

**Sequencing law (NEW in v2):** every customer-facing page-unit `depends_on` the engine/action/wiring units that back it. The Stop hook `stop_on_unwired_assets` already enforces this — v2 just makes the dependency edges explicit. Anti-false-green rule (Round-3/10): every page MUST invoke a dispatcher action that returns non-stub real data verified by an integration test asserting return-shape != `{ok: true}` placeholder.

### v2 unit table (61 units, depends_on graph)

Legend — Priority: **P0** = blocks revenue today · **P1** = blocks paid-launch quality · **P2** = nice-to-have within MS0.

#### Phase 0 — Pre-wiring (must ship FIRST; blocks every customer page)

| id | title | depends_on | acceptance | priority |
|---|---|---|---|---|
| `U-REV-MS0-ENG-SPINDLE-01` | Build **SpindleCharacteristicEngine** (Pc output + machine-aware power-limit gate across 21 ShopConfig machines) | — | engine unit-tests (kW/kNm/torque curve at 6 RPM bands per machine) PASS; dispatcher action `prism_calc:spindle_power_check` returns numeric Pc and limit-flag (NOT `{ok}`); 21 ShopConfig machines covered | P0 |
| `U-REV-MS0-ENG-TOOLDB-01` | Build **ToolCatalogEngine** (canonical Tool DB: geometry + insert lookup; backs free-text → structured tool record) | — | round-trip test ingests 10 representative tools across mill/lathe/drill/thread; dispatcher action `prism_calc:tool_catalog_resolve` returns canonical record; SFC requirement #6 (tool selection ingest) closes | P0 |
| `U-REV-MS0-ENG-DEFLECT-01` | Build **DeflectionCalculateEngine** (discrete `prism_calc:deflection_calculate` — δ = F·L³/(3EI) + ap-derate solver) | `U-REV-MS0-ENG-TOOLDB-01` (needs tool geometry) | dispatcher action returns numeric δ AND derated ap honoring tolerance budget (NOT overlay-form only); rejects NaN/Infinity; 5 spanning tool-overhang configs PASS | P0 |
| `U-REV-MS0-ENG-MATBAND-01` | Build **MaterialBandResolverEngine** (interpolate kc1.1/n across 6 ISO × 5 hardness × 2 coolant = 60-cell grid; closes Round-2 variability gap) | — | grid coverage 60/60 (vs current 11/60); dispatcher action `prism_calc:material_resolve` returns kc1.1, n, hardness_band, coolant_modifier (NOT canonical-row passthrough); 18 spanning tests across axes PASS | P1 |
| `U-REV-MS0-ENG-GILBERT-01` | Build **GilbertEconomicSpeedEngine** (V*_eco / V*_max_prod / V*_max_profit triad on Gilbert/Taylor; backs `prism_calc:lathe_cost_optimize`) | `U-REV-MS0-ENG-TOOLDB-01` | three objective modes return distinct V* values; cost-per-part breakdown returns 7 buckets (material/tool/machine/setup/overhead/scrap/labor); benchmark-flag fires when bucket > 70% or total > industry median | P1 |
| `U-REV-MS0-STUB-MILL-CHATTER-01` | **Remediate STUB** `mill_chatter_predict` (currently AUDIT #448 MillingForceEngine 15L stub) — reroute to ChatterPredictionEngine | — | dispatcher round-trip test asserts return-shape includes SLD lobe array + RPM-pick numeric (NOT `{ok}`); anti-false-green gate green | P0 |
| `U-REV-MS0-STUB-MILL-SCI-01` | **Remediate STUB** `mill_scientific_analyze` (AUDIT #460 MillScientificPipelineEngine 14L stub) — reroute to MillingPhysicsKernelEngine | — | return-shape includes uncertainty band + physics-derived parameters (NOT `{ok}`); 5 spanning material × tool configs PASS | P0 |
| `U-REV-MS0-ACT-CHIPCTRL-01` | Add MISSING `prism_cam:lathe_chip_control_validate` action + ChipControlEngine wiring (Sandvik/Kennametal/ISCAR/Tungaloy/Mitsubishi catalogs; CSS high-RPM wrapping risk) | `U-REV-MS0-ENG-TOOLDB-01` | dispatcher returns `{valid, chip_form, lights_out_ok, mitigations[], evidence_uri}`; 5 chipbreaker catalogs validated | P1 |
| `U-REV-MS0-ACT-WEDM-TS-01` | Add MISSING `prism_edm:wedm_troubleshoot` + wire existing WEDMTroubleshootingEngine (62-engine pool) | — | returns `{root_causes[], remediations[], tribal_tips[]}` for 4 symptom classes (wire_break/poor_finish/taper_error/burn); not stub | P1 |
| `U-REV-MS0-ACT-WEDM-CTRL-01` | Add MISSING `prism_edm:wedm_controller_select` + WEDMControllerDialectEngine surface (5 dialects: Mitsubishi/Sodick/Makino/AgieCharmilles/Fanuc) | — | dialect chosen from input; header/footer templates + param-table mapping returned; 5 dialect E2E round-trips PASS | P1 |
| `U-REV-MS0-ACT-CADVIEW-01` | Add MISSING `prism_cad:cad_viewer_load_stl` + build **CADViewerStreamEngine** (wraps step_pipeline_run + decimation; backs mcp-cadquery frontend merge) | — | streams Three.js-ready mesh for STEP/STL/IGES/GLB input; vertex_count + bbox returned; mcp-cadquery frontend can render | P0 |
| `U-REV-MS0-ACT-APIKEY-01` | Add MISSING `prism_auth:api_key_create/revoke/list` + build **ApiKeyEngine** (integrates AuthEngine.sessionManage + audit_log_authz emission) | — | one-shot secret returned; revoke disables; list scoped to tenant; audit-log entry per op | P0 |
| `U-REV-MS0-ACT-RBAC-01` | Add MISSING `prism_auth:rbac_role_create/assign/list + permission_grant` + build **RBACEngine** (extends pass-through role_assign into full CRUD + permission matrix) | `U-REV-MS0-ACT-APIKEY-01` (shared audit emission) | role CRUD round-trip; permission matrix enforces in middleware; audit-log entries | P0 |
| `U-REV-MS0-ACT-SEAT-01` | Add MISSING `prism_tenant:seat_assign` — **HOIST from MS1 U-SUB-17** (SeatAllocationEngine) — concurrent with ADMIN, not after | `U-REV-MS0-ACT-RBAC-01` (seat type bound to role) | seat assignment round-trip; seat_remaining decrements; tenant cap enforced; audit-log | P0 |
| `U-REV-MS0-ACT-SUBTIER-01` | Add MISSING `prism_business:subscription_tier_set` — **HOIST from MS1** (FeatureTierEngine + StripeAdapter; concurrent with ADMIN per Round-3/02 ranking #1) | `U-REV-MS0-ACT-APIKEY-01` | tier upgrade/downgrade round-trip via Stripe sandbox; prorate flag honored; next_invoice_at returned; audit-log | P0 |
| `U-REV-MS0-ACT-TUTOR-01` | Add MISSING `prism_intelligence:tutor_session_start/lesson_complete/progression_get` + build **TutorialProgressionEngine** (fires trial→paid hook on lesson-N) | — | session round-trip; progression persists across sessions; trial→paid hook armed flag returned | P1 |
| `U-REV-MS0-ACT-VIDEO-01` | Add MISSING `prism_intelligence:video_session_start/segment_complete/query_transcript` + build **VideoTrainingEngine** (wraps video-learn skill) | — | transcript URI returned; segment-complete fires hooks; query_transcript returns time-stamped matches | P1 |
| `U-REV-MS0-ACT-BPTRAIN-01` | Add MISSING `prism_cad:blueprint_trainer_quiz/score` + build **BlueprintTrainingEngine** (wraps blueprint_to_cadquery_script + JM DIE archive quizzing) | `U-REV-MS0-ACT-CADVIEW-01` | quiz served from JM DIE archive; score persists; difficulty bands respected | P1 |

#### Phase 1 — Pareto-minimum wiring hoists (Round-3/02 ranks #1–#5; unblocks 28/37 customer pages)

| id | title | depends_on | acceptance | priority |
|---|---|---|---|---|
| `U-REV-MS0-HOIST-ADMIN-01` | **Hoist rank #1**: wire SessionLifecycle/TenantOnboarding/UserModel/AuthorityRanking/SkillTierRegistry into prism_auth + prism_tenant (gates ALL revenue) | `U-REV-MS0-ACT-APIKEY-01`, `U-REV-MS0-ACT-RBAC-01`, `U-REV-MS0-ACT-SEAT-01`, `U-REV-MS0-ACT-SUBTIER-01` | 5 engines wired (WIRE-TO-ALL: dual dispatcher); 7 ADMIN pages unblocked; engine-named tests PASS | P0 |
| `U-REV-MS0-HOIST-LATHE-01` | **Hoist rank #2a**: wire MillTurnCAM/LathePartClassifier/SequenceOptimizer/MultiOpPlanner/Workholding/Orchestration (6 of 89 lathe unwired) | `U-REV-MS0-ENG-TOOLDB-01` | 6 engines wired to prism_turning + prism_lathe (WIRE-TO-ALL); mill-turn-sync page unblocked | P0 |
| `U-REV-MS0-HOIST-LATHE-02` | **Hoist rank #2b**: wire LatheDeepLearning/LatheUnifiedAI/EccentricTurning/LathePrintToleranceStack | `U-REV-MS0-HOIST-LATHE-01` | 4 engines wired to prism_turning + prism_ai; tolerance-stack reuse from quality verified | P1 |
| `U-REV-MS0-HOIST-WEDM-01` | **Hoist rank #3a**: wire MultiSetupFeasibilityChain/WEDMScheduling/WedmProgramIndex/WEDMStrategyLibrary | `U-REV-MS0-ACT-WEDM-CTRL-01` | 4 engines wired to prism_edm + prism_orchestrate; pass-schedule + cost + program-gen pages unblocked | P0 |
| `U-REV-MS0-HOIST-WEDM-02` | **Hoist rank #3b**: wire WEDMPartRecognition/WEDMMaterialCharacterization/WEDMWireThreadingMin | `U-REV-MS0-HOIST-WEDM-01` | 3 engines wired to prism_edm; feasibility + controller-select pages unblocked | P1 |
| `U-REV-MS0-HOIST-QUALITY-01` | **Hoist rank #4**: wire SPCProcessCapability/MultivariateSPC/HyperMillFAIBridge/HyperMillSPCBridge/LathePrintToleranceStack/TurningInspectionPlan/GateFailureHistory | — | 7 engines wired to prism_safety/prism_quality; 4 quality pages unblocked | P1 |
| `U-REV-MS0-HOIST-MILL-01` | **Hoist rank #5**: wire ChatterStabilityLobe/ArchardAdhesiveWear/TurningToolpathWear/TurningWearPrediction (also unblocks STUB remediations) | `U-REV-MS0-STUB-MILL-CHATTER-01`, `U-REV-MS0-STUB-MILL-SCI-01` | 4 engines wired to prism_mill + prism_vibration_physics; SLD viewer + chatter map + wear timeline pages unblocked | P0 |
| `U-REV-MS0-HOIST-MILL-02-NEW` | Build greenfield **ThermalFieldEngine** (no equivalent in unwired pool; ~500 LOC) → wire to prism_calc + prism_mill + prism_safety | — | FEM/heat-transfer kernel tested across 5 cutting-condition spans; thermal preview page renders live data | P1 |
| `U-REV-MS0-HOIST-SFC-01` | Wire MachineAwareSpeedFeed/ProvenSpeedFeedAggregator/SpeedFeedDeepLearning/SpeedFeedResourceIntegration/SpeedFeedAdvancedAI/SpeedFeedUltimateAI/PowerMillStrategy/PowerMillAIOrchestration | `U-REV-MS0-ENG-SPINDLE-01`, `U-REV-MS0-ENG-TOOLDB-01`, `U-REV-MS0-ENG-MATBAND-01` | 8 engines wired to prism_calc; SFC pages can serve machine-aware variants | P0 |
| `U-REV-MS0-HOIST-LEARN-01` | Wire PrintToProgramTutorial/VideoReplayOrchestrator/VideoReplayPipeline/VideoELearningAI/TribalExplanation/KnowledgeIngestionOrchestrator | `U-REV-MS0-ACT-TUTOR-01`, `U-REV-MS0-ACT-VIDEO-01`, `U-REV-MS0-ACT-BPTRAIN-01` | 6 engines wired to prism_knowledge + prism_document_learning; 3 learn pages unblocked | P1 |

#### Phase 2 — SFC customer pages (P0 revenue — ships FIRST per user priority)

| id | title | depends_on | acceptance | priority |
|---|---|---|---|---|
| `U-REV-CAD-SFC-01` | SfcCalculatorPage — invokes `prism_calc:sfc_calculate` (anti-false-green: assert return-shape includes Vc/n/fz/ap/ae/Q/Pc/Fc/Tc/δ/Ra/risk_flags numerics) | `U-REV-MS0-HOIST-SFC-01`, `U-REV-MS0-ENG-DEFLECT-01` | page renders live SFC for 6 ISO groups × 5 hardness × 2 coolant axis spans (≥3 per axis = ≥18 cases); Playwright happy + 3 failure + 2 adversarial PASS | P0 |
| `U-REV-CAD-SFC-02` | SfcCompareMaterialsPage — `prism_calc:sf_compare` | `U-REV-CAD-SFC-01` | side-by-side compare across 3 materials renders all 11 output fields; charts non-empty | P0 |
| `U-REV-CAD-SFC-03` | CadViewer3DPage (Three.js — mcp-cadquery frontend merge) — `prism_cad:cad_viewer_load_stl` | `U-REV-MS0-ACT-CADVIEW-01` | STEP/STL/IGES upload renders; rotate/zoom/section work; controller-variant overlay shows Fanuc/Haas/Mazak/Okuma/Mitsubishi work-coord differences | P0 |
| `U-REV-CAD-SFC-04` | NL→CadQueryPage (cqask/ui merge) — `prism_cad:cadquery_codegen_prompt` | `U-REV-CAD-SFC-03` | prompt→script→exec round-trip green; failures emit explanation, not raw stack | P1 |
| `U-REV-CAD-SFC-05` | BlueprintToCadPage — `prism_cad:blueprint_to_all_cads` | `U-REV-CAD-SFC-03` | uploaded blueprint → STEP/IGES/STL emission; 3 JM DIE blueprint adversarial samples pass | P1 |
| `U-REV-CAD-SFC-06` | SfcMachineAwarePage — invokes machine-aware variant (selects from 21 ShopConfig machines) | `U-REV-MS0-HOIST-SFC-01`, `U-REV-MS0-ENG-SPINDLE-01` | per-machine SFC differs by ≥1 parameter; spindle power-limit gate visibly fires on over-spec request | P0 |

#### Phase 3 — Mill customer pages (revenue P1)

| id | title | depends_on | acceptance | priority |
|---|---|---|---|---|
| `U-REV-MILL-01` | MillStudioPage / SpeedFeedPage (mill mode) — `prism_mill:mill_quick_speed_feed` | `U-REV-MS0-HOIST-SFC-01` | renders for 5 controller dialects (Fanuc/Haas/Mazak/Okuma/Mitsubishi); each emits dialect-correct g-code snippet | P1 |
| `U-REV-MILL-02` | MillStrategyPage / ToolpathSelectorPage — `prism_mill:mill_strategy_select` | `U-REV-MILL-01` | strategy ranks ≥3 candidates; physics rationale shown | P1 |
| `U-REV-MILL-03` | ChatterPredictionPage / SLDViewerPage — `prism_mill:mill_chatter_predict` (anti-false-green) | `U-REV-MS0-STUB-MILL-CHATTER-01`, `U-REV-MS0-HOIST-MILL-01` | SLD lobe map renders; RPM-pick highlights peak; assert return non-stub | P1 |
| `U-REV-MILL-04` | MillThermalPreviewPage — wraps ThermalField | `U-REV-MS0-HOIST-MILL-02-NEW` | thermal field renders live; warmup compensation calc visible | P1 |
| `U-REV-MILL-05` | MillScientificAnalysisPage — `prism_mill:mill_scientific_analyze` | `U-REV-MS0-STUB-MILL-SCI-01` | uncertainty bands shown; not stub | P1 |

#### Phase 4 — Lathe customer pages (revenue P1)

| id | title | depends_on | acceptance | priority |
|---|---|---|---|---|
| `U-REV-LATHE-01` | LatheStudioPage / TurningSpeedFeedPage — `prism_cam:lathe_sf_full` | `U-REV-MS0-HOIST-LATHE-01` | 5-controller-dialect spans PASS | P1 |
| `U-REV-LATHE-02` | LatheThreadingPage — `prism_calc:thread_single_point` | `U-REV-MS0-ENG-TOOLDB-01` | universal thread standards (UN/M/BSP/NPT) covered | P1 |
| `U-REV-LATHE-03` | LathePostgenPage / MasterPostPage — `prism_cam:lathe_masterpost_emit` | `U-REV-LATHE-01` | per-dialect post emission verified; Master Post product surface live | P0 |
| `U-REV-LATHE-04` | LatheChipControlPage — `prism_cam:lathe_chip_control_validate` | `U-REV-MS0-ACT-CHIPCTRL-01` | chip-form prediction renders; lights-out verdict shown | P1 |
| `U-REV-LATHE-05` | LatheCostOptimizePage (Gilbert/Taylor) — `prism_calc:lathe_cost_optimize` | `U-REV-MS0-ENG-GILBERT-01` | min-cost / max-prod / max-profit triad renders; benchmark-flag visible | P1 |

#### Phase 5 — WEDM customer pages (revenue P1)

| id | title | depends_on | acceptance | priority |
|---|---|---|---|---|
| `U-REV-WEDM-01` | WireEdmStudioPage / FeasibilityGate — `prism_edm:wedm_assess_feasibility` | `U-REV-MS0-HOIST-WEDM-02` | feasibility verdict per material/thickness | P1 |
| `U-REV-WEDM-02` | WireEdmProgramPage — `prism_edm:wedm_generate_gcode` | `U-REV-MS0-HOIST-WEDM-01`, `U-REV-MS0-ACT-WEDM-CTRL-01` | 5-dialect emission PASS | P1 |
| `U-REV-WEDM-03` | WireEdmCostPage — `prism_edm:wedm_estimate_cost` | `U-REV-MS0-HOIST-WEDM-01` | wire/machine/consumables breakdown | P1 |
| `U-REV-WEDM-04` | WireEdmMultipassPage — `prism_edm:wedm_full_multipass` | `U-REV-MS0-HOIST-WEDM-01` | pass-schedule rendered | P1 |
| `U-REV-WEDM-05` | WireEdmTroubleshootPage — `prism_edm:wedm_troubleshoot` | `U-REV-MS0-ACT-WEDM-TS-01` | 4 symptom-class round-trips PASS | P1 |
| `U-REV-WEDM-06` | WireEdmControllerSelectPage — `prism_edm:wedm_controller_select` | `U-REV-MS0-ACT-WEDM-CTRL-01` | 5-dialect picker PASS | P1 |
| `U-REV-WEDM-07` | WireEdmReportPage — `prism_edm:wedm_full_documentation` | `U-REV-WEDM-04` | report PDF emit | P2 |

#### Phase 6 — Quality customer pages (P1)

| id | title | depends_on | acceptance | priority |
|---|---|---|---|---|
| `U-REV-QUALITY-01` | SpcChartPage — `prism_safety:spc_calculate` | `U-REV-MS0-HOIST-QUALITY-01` | live SPC chart; Xbar/R + IMR + Cpk variants | P1 |
| `U-REV-QUALITY-02` | FaiEditorPage — `prism_safety:fai_run` | `U-REV-MS0-HOIST-QUALITY-01` | FAI form populates | P1 |
| `U-REV-QUALITY-03` | CmmParseViewPage — `prism_safety:cmm_plan` | `U-REV-MS0-HOIST-QUALITY-01` | CMM XML import → form | P1 |
| `U-REV-QUALITY-04` | ToleranceStackVisualizerPage — `prism_safety:tolerance_stack` | `U-REV-MS0-HOIST-QUALITY-01` | stack viz + Monte-Carlo distribution | P1 |

#### Phase 7 — Admin customer pages (P0 — gates revenue)

| id | title | depends_on | acceptance | priority |
|---|---|---|---|---|
| `U-REV-ADMIN-01` | UserManagementPage — `prism_tenant:list` | `U-REV-MS0-HOIST-ADMIN-01` | user CRUD; pagination | P0 |
| `U-REV-ADMIN-02` | AuditLogViewerPage — `prism_safety:audit_query_events` | `U-REV-MS0-HOIST-ADMIN-01` | audit log streams; filter by actor/event | P0 |
| `U-REV-ADMIN-03` | BillingPortalPage — `prism_business:billing_create_portal` | `U-REV-MS0-ACT-SUBTIER-01` | Stripe portal opens; sub state visible | P0 |
| `U-REV-ADMIN-04` | SeatAssignmentPage — `prism_tenant:seat_assign` | `U-REV-MS0-ACT-SEAT-01` | seat assign/remove round-trip | P0 |
| `U-REV-ADMIN-05` | ApiKeyManagementPage — `prism_auth:api_key_create/revoke/list` | `U-REV-MS0-ACT-APIKEY-01` | one-shot secret display; revoke works | P0 |
| `U-REV-ADMIN-06` | RbacRoleEditorPage — `prism_auth:rbac_role_create/assign/permission_grant` | `U-REV-MS0-ACT-RBAC-01` | role CRUD; permission matrix UI | P0 |
| `U-REV-ADMIN-07` | SubscriptionTierEditorPage — `prism_business:subscription_tier_set` | `U-REV-MS0-ACT-SUBTIER-01` | tier upgrade/downgrade UI | P0 |

#### Phase 8 — Learn customer pages (P1 — trial→paid flywheel)

| id | title | depends_on | acceptance | priority |
|---|---|---|---|---|
| `U-REV-LEARN-01` | TutorPage / OnboardingFlowPage — `prism_intelligence:tutor_session_start` | `U-REV-MS0-ACT-TUTOR-01`, `U-REV-MS0-HOIST-LEARN-01` | session start + lesson progression | P1 |
| `U-REV-LEARN-02` | VideoPlayerPage — `prism_intelligence:video_session_start` | `U-REV-MS0-ACT-VIDEO-01`, `U-REV-MS0-HOIST-LEARN-01` | video plays + transcript searchable | P1 |
| `U-REV-LEARN-03` | BlueprintTrainerPage — `prism_cad:blueprint_trainer_quiz` | `U-REV-MS0-ACT-BPTRAIN-01`, `U-REV-MS0-HOIST-LEARN-01` | quiz served + scored | P1 |

### Sequencing summary

```
Day 1: Phase 0 P0 — Spindle + ToolDB + Deflection + CADViewer + ApiKey + RBAC + Seat + SubTier + Stub-remediation (mill chatter/scientific)
Day 2: Phase 1 P0 hoists — ADMIN, LATHE-01, WEDM-01, MILL-01, SFC-01
Day 3: SFC customer pages (CAD-SFC-01..06) — first revenue surface ships
Day 4: ADMIN customer pages (revenue gate)
Day 5: Phase 0 P1 — MatBand + Gilbert + ChipCtrl + WEDM-TS/CTRL + Tutor/Video/BPTrain
Day 6: Phase 1 P1 hoists — LATHE-02, WEDM-02, QUALITY, MILL-02-NEW (greenfield Thermal), LEARN
Day 7-8: Lathe + Mill + WEDM + Quality + Learn customer pages
```

**Multi-controller variability gate (NEW per user directive):** every customer page (SFC, mill, lathe, WEDM) MUST exercise ≥3 of the 5 controller dialects (Fanuc/Haas/Mazak/Okuma/Mitsubishi) in its Playwright suite. The matrix is enforced by `comprehensive-build-enforce` hook.

**Count reconciliation:** 6 SFC + 5 mill + 5 lathe + 7 WEDM + 4 quality + 7 ADMIN + 3 learn = **37 customer pages** (was the original "37 vs 40" drift — locked to 37; original spec's "40" was an arithmetic error). Plus 18 backend prereq + hoist + remediation units = **61 total units**.

---

# REVENUE-MS1 v2 — Subscription mechanics, billing, compliance, form-factor (43 units)

**Owner:** claude-99eca613 (revenue-roadmap lane) — Round-4 revision agent 2/10
**Source revisions consumed:** round3/03-ms1-expand-32-40 (18->43), round3-5/02-sfc-ui-pricing (tier matrix), original REVENUE-ROADMAP-2026-05-10.md REVENUE-MS1 (18 units, baseline)
**Generated:** 2026-05-10
**Schema:** standard PRISM milestone envelope (`mcp-server/data/milestones/MS-REV-MS1-*.json`) — each unit declares `id` / `title` / `status` / `files_modified` / `details` / `acceptance` / `depends_on` / `verifies_via` (v7.A HARD GATE) / `tiers_invoked` (v7.C where applicable) / `variability_axes_covered`

---

## Why MS1 v2 differs from v1

Round-2 reviewer found that the original 18 units **collapsed multiple compliance + form-factor + variability surfaces into single units**, hiding 6-12 weeks of work behind innocuous one-line titles. Round-3 forensics expanded MS1 from 18 to 43 units across 9 work axes:

| Axis | v1 units | v2 units | Net add |
|---|---|---|---|
| Dispatcher scaffolding | 0 (implicit) | 1 (`U-SUB-00`) | +1 |
| Webhook hardening (signature + dispatch + Paddle RSA) | 1 (`U-SUB-01` mashed all) | 3 (`U-SUB-19/20/21`) | +2 |
| Tax (bridge + invoice render + VAT-ID + exempt) | 1 (`U-SUB-13` mashed) | 4 (`U-SUB-22..25`) | +3 |
| Currency rounding + reconciliation | 0 | 1 (`U-SUB-26`) | +1 |
| Compliance (GDPR Art-17 + SOC2 hash-chain + PCI/SOX retention) | 0 | 3 (`U-SUB-27..29`) | +3 |
| Subscription state (proration + downgrade + grandfather + refund-math + chargeback + annual->monthly credit) | 2 (`U-SUB-12/17` partial) | 6 (`U-SUB-30..35`) | +4 |
| Dunning state machine (explicit FSM) | 1 (`U-SUB-09`) | 1 (`U-SUB-36`) | 0 (rewrite) |
| Form factor (offline JWT + browser->plugin bridge) | 0 | 2 (`U-SUB-37/38`) | +2 |
| Multi-seat (revoke+CRL + transfer + multi-org) | 1 (`U-SUB-15`) | 3 (`U-SUB-39/40/41`) | +2 |
| Pairwise variability matrix | 0 (ad-hoc 48/480) | 1 (`U-SUB-42`) | +1 |
| Anti-fraud (affiliate clawback) | 1 (`U-SUB-18` shallow) | 1 (`U-SUB-43` deep) | 0 (rewrite) |
| Original carryovers (Paddle, Tier-feature, License-validator, Trial conv, Customer dashboard BE/FE, Invoice PDF, API rate-limit, Tier-gate hook, Annual/monthly discount, Self-service upgrade) | 14 | 14 | 0 |
| **Totals** | **18** | **43** | **+25** |

Hoist law per round3/02: `U-SUB-01..U-SUB-04` (in v1 numbering -> `U-SUB-00`, `U-SUB-19`, `U-SUB-22`, `U-SUB-28` in v2) **MUST land before MS0 paywall units activate.** No revenue can flow safely otherwise.

---

## Pricing tier table (canonical — sourced from round3-5/02)

| Tier | Price (USD/mo) | Daily calc quota | ISO groups | Optimize mode | Recipes saved | Watermark | Seats | API quota | CAM plugins | SSO | Target |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Free** | $0 | 3/day | P-steel only | No (Quick only) | Last 5 | "PRISM-FREE" on CSV | 1 | — | — | — | Trial / hobbyist demo |
| **Hobbyist** | $9 | Unlimited | P/M/K/N/S/H all 6 | Yes | Unlimited | None | 1 | — | — | — | Garage shops, students |
| **Pro** | $39 | Unlimited | All 6 | Yes + What-if 3-up + stability lobes + overhang slider | Unlimited + tags + search | None | 1 | — | — | — | Professional machinists / programmers |
| **Shop** | $249 | Unlimited | All 6 | Yes + everything Pro | Team shared library | None | 10 (+$25/seat above) | 10k calls/mo | Fusion add-in | Google Workspace | 5-50 machinist job shops |
| **Enterprise** | $999 (floor) | Unlimited | All 6 + custom ingest | Yes + everything Pro | Unlimited + custom | None | Unlimited | Unlimited | All (Fusion + Mastercam + hyperMILL) | SAML SSO + SCIM | 50+ shops, OEMs, contract mfrs; on-prem option, audit logs, SLA 99.9% |

**Annual discount:** 20% off (Hobbyist $86/yr vs $108, Pro $375/yr vs $468). Shown at checkout.
**Trial:** 14-day Pro on first quota-hit, **credit-card-required** (G-Wizard's no-CC trial gets gamed). 60-day free-Pro for beta shops in week-3 soft-launch.
**Free-tier triggers `UpgradePromptModal`:** (a) 4th calc/day, (b) non-P material, (c) Optimize click, (d) Compare-3up click, (e) 6th save-recipe.

**Tier-feature mapping is canonical in `state/shared/feature-tiers.json`** (consumed by `FeatureTierEngine` from v1 `U-SUB-03`). v2 retains that engine; the table above is the source-of-truth for what that JSON encodes.

---

## Dependency chain (MS0 / MS1 / MS2 ordering)

```
                  U-REV-ADMIN-01..07 (MS0 admin pages)
                          │
                          ▼
   U-SUB-00 prism_subscription dispatcher scaffold   <-- foundation
                          │
        ┌─────────────────┼──────────────────┐
        ▼                 ▼                  ▼
  U-SUB-19 webhook     U-SUB-22 Stripe      U-SUB-28 SOC2 audit-log
  signature/dispatch    Tax bridge          hash-chain
        │                 │                  │
        ▼                 ▼                  ▼
  U-SUB-20 event       U-SUB-23/24/25       U-SUB-27 GDPR delete
  handler dispatch     (invoice/VAT/exempt) U-SUB-29 retention/PCI
        │                                    │
        ▼                                    ▼
  U-SUB-21 Paddle      U-SUB-30..35        U-SUB-32 grandfather
  RSA verify           sub-state mechanics
                          │
                          ▼
                  U-SUB-36 dunning FSM
                          │
                          ▼
                  U-SUB-37/38 offline JWT + browser->plugin bridge
                          │
                          ▼
                  U-SUB-39/40/41 seat revoke+CRL + transfer + multi-org
                          │
                          ▼
                  U-SUB-42 pairwise matrix gate (124 + 12 cases)
                  U-SUB-43 affiliate fraud + clawback
                          │
                          ▼
       ✅ MS0 paywall units activate
       ✅ MS2 invention units (per-product) gate-passable
```

**Hoist rule (Pareto-1 per round3/02):**
- Until `U-SUB-19` ships, **disable webhook intake** in production (no money flows through unverified endpoints).
- Until `U-SUB-22` ships, **block EU/UK/CA/AU GTM** (no compliant tax calc; sales to US-only).
- Until `U-SUB-28` ships, **enterprise sales gated** (SOC2 evidence chain is precondition for any customer with audit-procurement).

**MS0 ADMIN-01 + MS1 billing concurrency:** ADMIN-01 (user mgmt) and U-SUB-00..04 can run in parallel on separate worktrees; they merge through the shared `prism_subscription` dispatcher schema. No file-claim conflicts because ADMIN-01 lives in `mcp-server/web/admin/*` and SUB units live in `mcp-server/src/engines/Subscription*.ts`.

---

## v7.A verification-channel template (HARD GATE — applies to every unit below)

Every MS1 v2 unit declares `verifies_via: { tool, expected_signal, re_run_cost }` per the v7.A table in the parent spec. For subscription/compliance work the default is:

```
verifies_via.tool: rtk vitest run -- <engine>.test.ts && stripe webhook --test <event>
verifies_via.expected_signal: Webhook -> dispatcher round-trip green; ledger entry written
verifies_via.re_run_cost: ~15s
```

Special-case verifications are called out per-unit below.

---

## The 43 units

### Foundation (1 unit)

#### U-SUB-00 — `prism_subscription` dispatcher scaffold
- **Spec:** Create greenfield `prism_subscription` dispatcher with action enum (`webhook_receive`, `entitlement_grant`, `entitlement_revoke`, `tier_check`, `seat_allocate`, `seat_revoke`, `license_validate`, `dunning_advance`, `refund_process`, `audit_record`). Zod schemas, lazy imports. Wire-to-all-sources law: also register hooks into `prism_session` (entitlement context), `prism_context` (claim integration), `prism_dev` (inventory/build state).
- **Depends on:** none (foundation)
- **Acceptance:** Dispatcher registered in `DISPATCHER_DIGEST.md`; all 10 actions stub-routable; smoke test fires each action with empty payload returns structured error not crash; cross-dispatcher round-trip from `prism_session:dispatcher_map_compact` lists `prism_subscription` with action count = 10.
- **verifies_via:** `rtk vitest run -- prism_subscription.dispatcher.test.ts && node scripts/check-engine-wired.mjs --dispatcher prism_subscription`
- **Variability axes:** dispatcher schema (10 actions) × empty/malformed/oversize payloads (4) = 40 cases minimum

### Webhook hardening (3 units)

#### U-SUB-19 — Stripe webhook security primitives
- **Spec:** `StripeSignatureVerifierEngine` — HMAC-SHA256 verify against `STRIPE_WEBHOOK_SECRET`, raw-body middleware preservation (Stripe signature is computed on raw payload — body-parser breaks this), 300s replay-window enforcement, clock-skew tolerance ±60s, idempotency-key dedup table keyed by `event.id` with 30-day TTL.
- **Depends on:** `U-SUB-00`
- **Acceptance:** 5 adversarial tests pass — (1) replayed event rejected, (2) tampered amount rejected, (3) wrong secret rejected, (4) expired timestamp (>300s) rejected, (5) missing `Stripe-Signature` header rejected; idempotent re-delivery of same `event.id` increments dedup counter not entitlement (zero double-grant).
- **verifies_via:** `rtk vitest run -- StripeSignatureVerifierEngine.test.ts && stripe trigger checkout.session.completed --add metadata.test=replay`
- **Variability axes:** adversarial fuzz (5) × payload size (small/normal/oversize/zero) (4) = 20 cases

#### U-SUB-20 — Stripe webhook event handler dispatch
- **Spec:** `StripeEventDispatchEngine` routes verified events to handlers. Event taxonomy: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `charge.dispute.created`. Each event type has dedicated handler; unknown event types logged and ack 200 (avoid Stripe retry storm); handler exceptions bubble for Stripe automatic retry (idempotent on next delivery via `U-SUB-19` dedup table).
- **Depends on:** `U-SUB-19`
- **Acceptance:** Each event type has dedicated handler with explicit state-transition log; unknown event types ack 200; handler exception triggers Stripe retry (test via injected throw); state transition recorded in `U-SUB-28` audit log.
- **verifies_via:** `rtk vitest run -- StripeEventDispatchEngine.test.ts && stripe trigger checkout.session.completed && stripe trigger customer.subscription.deleted`
- **Variability axes:** 6 event types × (happy / handler-throw / unknown) = 18 cases

#### U-SUB-21 — Paddle webhook RSA signature verifier
- **Spec:** `PaddleSignatureVerifierEngine` — RSA-SHA1 public-key verify (Paddle uses RSA, not HMAC); separate Paddle event taxonomy mapper (Paddle→internal canonical event type since taxonomies differ); separate idempotency table for Paddle `alert_id` (namespace-isolated from Stripe `event.id`). **Not a transparent Stripe fallback** — Paddle is a parallel rail for non-US customers per round3-5 form-factor analysis.
- **Depends on:** `U-SUB-00`
- **Acceptance:** Paddle test fixtures verify cleanly; mismatched signature rejected; namespace isolation verified (`event.id == alert_id` allowed without collision); mapping table covers Paddle `subscription_created/updated/cancelled/payment_succeeded/payment_failed`.
- **verifies_via:** `rtk vitest run -- PaddleSignatureVerifierEngine.test.ts && node scripts/paddle-fixture-replay.mjs`
- **Variability axes:** 5 Paddle event types × (valid sig / wrong key / tampered payload / replay) = 20 cases

### Tax decomposition (4 units)

#### U-SUB-22 — Stripe Tax bridge
- **Spec:** `TaxCalcBridgeEngine` — Stripe Tax API integration with nexus matrix config at `state/shared/tax-nexus-matrix.json` (per-jurisdiction nexus thresholds, schemaVersion 1.0.0 with N-1 backward compat); `automatic_tax=true` on Stripe invoice/subscription creation; `tax-id-collection` enabled.
- **Depends on:** `U-SUB-00`
- **Acceptance:** Stripe Tax sandbox creates invoice in US-CA (10.25%), US-DE (0%), UK (20%), EU-DE (19%), AU (10%) with correct rate; nexus matrix loads with N-1 schema version backward compat.
- **verifies_via:** `rtk vitest run -- TaxCalcBridgeEngine.test.ts && stripe tax_rates list`
- **Variability axes:** 5 jurisdictions × (B2C / B2B / exempt) = 15 cases

#### U-SUB-23 — Invoice tax-line rendering
- **Spec:** `InvoiceTaxRendererEngine` — per-line-item tax breakdown on PDF + HTML invoice; multi-jurisdiction stacking (state + county + city for US sub-jurisdictions); tax-exempt line annotation; VAT-MOSS quarterly summary export (EU schema compliance).
- **Depends on:** `U-SUB-22`
- **Acceptance:** Sample invoice EU-B2C shows VAT line; EU-B2B shows reverse-charge note + zero VAT; US-CA shows state+county+city breakdown; MOSS export CSV validates against EU schema.
- **verifies_via:** `rtk vitest run -- InvoiceTaxRendererEngine.test.ts && playwright test invoice-render.spec.ts`
- **Variability axes:** US-state × EU-B2C × EU-B2B × exempt × MOSS = 5 invoice classes

#### U-SUB-24 — B2B VAT-ID validation
- **Spec:** `VatIdValidatorEngine` — VIES SOAP API for EU VAT, UK VAT lookup, fallback to Stripe Tax `tax_ids` verification; reverse-charge auto-apply on validated B2B EU cross-border; retain validation timestamp + response payload for audit (SOC2 evidence — feeds `U-SUB-28`).
- **Depends on:** `U-SUB-22`
- **Acceptance:** Valid EU VAT-ID accepted; invalid rejected; VIES downtime falls back to format-regex with warning flag in audit log; cross-border B2B applies reverse-charge; validation snapshot persisted.
- **verifies_via:** `rtk vitest run -- VatIdValidatorEngine.test.ts && node scripts/vies-sandbox-probe.mjs`
- **Variability axes:** EU-DE valid × EU-FR invalid × UK valid × VIES-down × Stripe-fallback = 5 paths

#### U-SUB-25 — Tax-exempt customer flow
- **Spec:** `TaxExemptFlowEngine` — exemption certificate upload + admin review queue; per-jurisdiction exemption types (501c3, government, resale); exemption expiry tracking; retroactive credit on approved certificate.
- **Depends on:** `U-SUB-22`
- **Acceptance:** Admin approves certificate → Stripe `tax_exempt=exempt` flips; expired certificate triggers re-collection; retroactive credit generates Stripe credit-note for paid-with-tax invoices in eligibility window.
- **verifies_via:** `rtk vitest run -- TaxExemptFlowEngine.test.ts && stripe customers update --tax-exempt=exempt`
- **Variability axes:** 3 exemption types × (active / expired / revoked) × (retroactive / forward-only) = 18 cases

### Currency + reconciliation (1 unit)

#### U-SUB-26 — Currency rounding + reconciliation
- **Spec:** `CurrencyRoundingEngine` — banker's rounding (round-half-to-even) per ISO-4217 minor-unit; Stripe-compatible rounding policy; daily reconciliation report (PRISM totals vs Stripe payout totals) with drift alert > 0.01 base unit.
- **Depends on:** `U-SUB-00`
- **Acceptance:** USD/EUR/GBP/CAD/AUD/JPY rounding tests match Stripe behavior; JPY enforces zero decimal places; daily recon emits drift report; >$0.01 drift triggers alert via `infra-events`.
- **verifies_via:** `rtk vitest run -- CurrencyRoundingEngine.test.ts && node scripts/daily-stripe-recon.mjs --dry-run`
- **Variability axes:** 6 currencies × 5 rounding edge cases (0.5 / 0.495 / 0.005 / negatives / JPY zero-decimal) = 30 cases

### Compliance (3 units)

#### U-SUB-27 — GDPR Art-17 delete cascade
- **Spec:** `GdprDeleteCascadeEngine` — orchestrates Stripe `customer.deleted` + PRISM user record + license tokens + tribal-tip authorship anonymization + audit-log redaction (hash retained as compliance evidence); 30-day soft-delete window with cancel; irreversible after window.
- **Depends on:** `U-SUB-00`
- **Acceptance:** Delete request creates DSR ticket; 30d window permits cancel; on commit cascade verified across 5 surfaces (Stripe, user, licenses, tribal authorship, audit redaction); audit retains hashed evidence (proof of compliance) without PII; Stripe customer marked deleted via API.
- **verifies_via:** `rtk vitest run -- GdprDeleteCascadeEngine.test.ts && node scripts/dsr-replay.mjs`
- **Variability axes:** (cancel-during-window / commit-after-window) × (5 surfaces) × (data classes: PII / pseudonymous / public) = 30 cases

#### U-SUB-28 — SOC2 audit-log immutable hash-chain
- **Spec:** `AuditLogEngine` — append-only table for every entitlement change (`actor`, `timestamp`, `from_state`, `to_state`, `reason`, `request_id`); hash-chain (each row hashes prev-row-hash + payload); tamper-evident verify endpoint; 7-year retention (SOX baseline; trimmed by `U-SUB-29`).
- **Depends on:** `U-SUB-00`
- **Acceptance:** Every `tier_check` / `entitlement_grant` / `seat_allocate` logs immutable row; hash-chain verify endpoint detects tampering of any historical row (test: flip one byte, verify catches); retention enforced; SOC2 CC7.2 auditor sample-pull script produces signed report.
- **verifies_via:** `rtk vitest run -- AuditLogEngine.test.ts && node scripts/audit-chain-verify.mjs --tamper-test`
- **Variability axes:** 10 action types × (happy / tamper-attempt / retention-edge) = 30 cases

#### U-SUB-29 — Audit-log retention + PII minimization (PCI/SOX)
- **Spec:** `AuditRetentionEngine` — 7-year retention for financial events (SOX), 3-year for entitlement, **PCI-DSS scope minimization** (no raw PAN ever stored, only Stripe `customer_id` / `payment_method` tokens); automated retention purge with hash-chain re-anchoring on purge boundary.
- **Depends on:** `U-SUB-28`
- **Acceptance:** Retention scan validates no event past TTL; PCI scope audit script confirms zero PAN/CVV/full-card storage anywhere in PRISM (grep + schema scan); purge re-anchors hash chain so verification still works for retained window.
- **verifies_via:** `rtk vitest run -- AuditRetentionEngine.test.ts && node scripts/pci-scope-scan.mjs`
- **Variability axes:** event class (financial / entitlement / DSR) × retention boundary (in-window / at-edge / past-TTL) = 9 cases

### Subscription state mechanics (6 units)

#### U-SUB-30 — Proration engine (decoupled)
- **Spec:** `ProrationEngine` — pure-function mid-cycle plan-change math (credit unused period at old tier, charge prorated new tier); Stripe Prorations API integration; day-boundary policy (UTC); preview-before-commit endpoint for UI.
- **Depends on:** `U-SUB-00`
- **Acceptance:** Unit tests — upgrade mid-month credits + charges balance; downgrade scheduled vs immediate paths both correct; Stripe preview API mirrored locally; preview returns invoice-item array matching Stripe.
- **verifies_via:** `rtk vitest run -- ProrationEngine.test.ts && stripe invoices upcoming --subscription <id>`
- **Variability axes:** (upgrade / downgrade) × (immediate / scheduled) × (day-1 / mid / day-N) × (5 tier transitions) = 60 cases

#### U-SUB-31 — Plan-change downgrade state machine
- **Spec:** `PlanChangeStateEngine` — immediate vs end-of-cycle downgrade; seat-shuffle policy on multi-seat downgrade (LIFO by activation date with admin-override); entitlement-revoke timing per tier; scheduled-change cancellation window.
- **Depends on:** `U-SUB-30`
- **Acceptance:** Downgrade 10-seat→5-seat with no admin pick revokes 5 most-recently-added; admin override accepted via API; scheduled change cancellable until 1h before effective; revoke triggers CRL update (`U-SUB-39`).
- **verifies_via:** `rtk vitest run -- PlanChangeStateEngine.test.ts`
- **Variability axes:** seat count (1/5/10/50) × policy (LIFO / admin-pick) × timing (immediate / scheduled) = 24 cases

#### U-SUB-32 — Grandfather pricing table + reactivation window
- **Spec:** `GrandfatherTableEngine` — `state/shared/grandfather-pricing.json` with `schemaVersion` + N-1 compat; reactivation window (default 60d) preserves grandfather rate; beyond window forces current rate; admin force-grandfather override with audit-log entry.
- **Depends on:** `U-SUB-28`
- **Acceptance:** Cancel-then-resubscribe within 60d retains old price; beyond 60d uses current; admin override logged immutably in `U-SUB-28` chain; schema-version bump migration tested.
- **verifies_via:** `rtk vitest run -- GrandfatherTableEngine.test.ts`
- **Variability axes:** (within-window / at-edge / beyond) × (admin override / no override) × (3 historical pricing snapshots) = 18 cases

#### U-SUB-33 — Refund math + entitlement revoke atomicity
- **Spec:** `RefundMathEngine` — full vs partial refund proration; atomic refund+revoke transaction (both succeed or both rollback); prepaid-annual partial refund credits remaining months; idempotent on Stripe refund webhook re-delivery.
- **Depends on:** `U-SUB-20`, `U-SUB-30`
- **Acceptance:** Full refund revokes entitlement immediately; 50% refund prorates to remaining 50%; mid-transaction failure rolls back both; duplicate refund webhook is no-op.
- **verifies_via:** `rtk vitest run -- RefundMathEngine.test.ts && stripe refunds create --charge <id> --amount <partial>`
- **Variability axes:** (full / partial / zero) × (monthly / annual) × (rollback-injected / clean) = 18 cases

#### U-SUB-34 — Chargeback evidence pipeline
- **Spec:** `ChargebackEvidenceEngine` — auto-assembles Stripe Radar dispute evidence (signup IP, license usage logs, invoice PDFs, support tickets) within 7-day Stripe deadline; submits via `dispute.update` API; tracks win/loss outcome metric.
- **Depends on:** `U-SUB-20`
- **Acceptance:** Dispute webhook triggers evidence-gather job; assembled bundle submitted before deadline; win-rate metric tracked; replay test on synthetic dispute completes end-to-end.
- **verifies_via:** `rtk vitest run -- ChargebackEvidenceEngine.test.ts && stripe trigger charge.dispute.created`
- **Variability axes:** dispute reason (fraud / product-not-received / duplicate) × deadline (Day-1 / Day-6 / overdue) = 9 cases

#### U-SUB-35 — Annual-to-monthly credit conversion
- **Spec:** `CreditConversionEngine` — converts unused annual balance to Stripe `credit_balance` on plan downgrade; applies credit against future monthly invoices first; surfaces credit-remaining in customer portal.
- **Depends on:** `U-SUB-33`
- **Acceptance:** Annual $1200 downgraded at month-3 produces $900 credit; next 9 monthly invoices apply credit first; portal shows accurate `credit_remaining`.
- **verifies_via:** `rtk vitest run -- CreditConversionEngine.test.ts`
- **Variability axes:** annual amount (3 prices) × downgrade timing (4 months) × subsequent invoice cycles = 12 cases

### Dunning (1 unit)

#### U-SUB-36 — Dunning state machine
- **Spec:** `DunningStateMachineEngine` — `ACTIVE → PAST_DUE → GRACE → READ_ONLY → SUSPENDED → CANCELED` with configurable durations per tier; Stripe Smart Retries (d1/d3/d5/d7/d14); running-job exemption (in-flight CAM jobs allowed to finish before READ_ONLY); GDPR Art-20 data-export window before terminal state.
- **Depends on:** `U-SUB-20`
- **Acceptance:** State transitions logged in `U-SUB-28` chain; READ_ONLY blocks new operations but allows job completion; SUSPENDED triggers 30d data-export grace; reactivation-on-payment within 14d preserves grandfather (`U-SUB-32`).
- **verifies_via:** `rtk vitest run -- DunningStateMachineEngine.test.ts && stripe trigger invoice.payment_failed`
- **Variability axes:** 6 states × 5 retry days × (running-job / no-job) = 60 cases

### Form factor (2 units)

#### U-SUB-37 — Offline CAM-plugin JWT license
- **Spec:** `OfflineLicenseJwtEngine` — PRISM-signed JWT (ES256) containing `seat_id` + `exp` + `entitlements` + `nonce`; plugin caches token and refreshes when online; runs up to N days (configurable per tier — Pro 7d, Shop 14d, Enterprise 30d) offline; CRL pulled on reconnect.
- **Depends on:** `U-SUB-00`
- **Acceptance:** Plugin validates token offline; expired token blocks features; revoked token in CRL blocks on next online check; air-gapped 7-day operation test passes.
- **verifies_via:** `rtk vitest run -- OfflineLicenseJwtEngine.test.ts && node scripts/airgap-replay.mjs --days 7`
- **Variability axes:** tier (3) × offline duration (1d / N-1d / N+1d) × (valid / revoked / expired) = 27 cases

#### U-SUB-38 — Browser-to-plugin token bridge
- **Spec:** `TokenBridgeEngine` — web user logs in → short-lived bridge token via deep-link or local-loopback handshake passes signed JWT to plugin; replaces username+password in plugin entirely.
- **Depends on:** `U-SUB-37`
- **Acceptance:** Web login → launch plugin → plugin receives JWT without secret prompt; bridge token TTL ≤ 120s; replay of bridge token after consumption rejected.
- **verifies_via:** `rtk vitest run -- TokenBridgeEngine.test.ts && playwright test bridge-handshake.spec.ts`
- **Variability axes:** transport (deep-link / loopback) × (valid / expired / replayed / wrong-origin) = 8 cases

### Multi-seat (3 units)

#### U-SUB-39 — Seat revoke + token revocation list (CRL)
- **Spec:** `SeatRevokeEngine` — revoke triggers CRL update at `state/shared/license-crl.json`; offline-cache invalidation via push (online plugins) + pull-on-reconnect (offline plugins); in-flight job grace policy; audit-log entry via `U-SUB-28`.
- **Depends on:** `U-SUB-37`, `U-SUB-28`
- **Acceptance:** Revoke from admin UI; online plugin loses access within 30s via push; offline plugin loses access on next reconnect; running job completes with read-only output.
- **verifies_via:** `rtk vitest run -- SeatRevokeEngine.test.ts && node scripts/crl-push-test.mjs`
- **Variability axes:** (online / offline / running-job) × (CRL-up-to-date / stale) = 6 cases

#### U-SUB-40 — Seat transfer + history audit
- **Spec:** `SeatTransferEngine` — admin reassigns seat from user A to user B preserving `seat_id` continuity; full history table (`seat_id`, `user_id`, `granted_at`, `revoked_at`, `reason`) for SOC2 traceability + per-seat-license dispute resolution.
- **Depends on:** `U-SUB-39`
- **Acceptance:** Transfer preserves `seat_id`; history query returns chronological holders; SOC2 evidence pull shows who held seat X on date Y.
- **verifies_via:** `rtk vitest run -- SeatTransferEngine.test.ts`
- **Variability axes:** (1 transfer / 5 chained / cycle) × (within-org / cross-org) = 6 cases

#### U-SUB-41 — Multi-org membership
- **Spec:** `MultiOrgEngine` — single user can belong to N orgs with per-org tier + entitlements; active-org context in session; per-org billing isolation; user-leaves-org cleanup without affecting other org memberships.
- **Depends on:** `U-SUB-40`
- **Acceptance:** User in 3 orgs with different tiers gets correct entitlements per active-org context; leaving org A retains org B+C access; billing events scoped to `org_id`.
- **verifies_via:** `rtk vitest run -- MultiOrgEngine.test.ts`
- **Variability axes:** N-org membership (1/3/10) × tier-mix (uniform / mixed) × leave-event (initiator / target) = 18 cases

### Pairwise variability (1 unit)

#### U-SUB-42 — Pairwise test matrix generator (IPOG)
- **Spec:** `PairwiseMatrixEngine` — replaces ad-hoc 48/480 sampling with IPOG (in-parameter-order-general) pairwise coverage generator over **tier (5) × provider (4) × form_factor (4) × currency (6)** → ~124 pair-covered cases + 12 highest-revenue triplets exhaustive.
- **Depends on:** `U-SUB-00`
- **Acceptance:** Generator emits test-case CSV; all 2-way interactions covered (verified by combinatorial check); top-12 triplets enumerated; CI consumes CSV and runs each case against subscription dispatcher.
- **verifies_via:** `rtk vitest run -- PairwiseMatrixEngine.test.ts && node scripts/pairwise-coverage-verify.mjs`
- **Variability axes:** the matrix IS the variability surface — meta-unit; verifies all axes covered.

### Anti-fraud (1 unit)

#### U-SUB-43 — Affiliate fraud heuristics + clawback
- **Spec:** `AffiliateFraudEngine` — heuristic stack: (a) self-referral via IP/device-fingerprint match, (b) cookie-stuffing via referrer-chain anomaly, (c) refund-after-payout pattern; risk score per referral; auto-hold high-risk payouts for manual review; clawback policy on confirmed fraud + chargeback.
- **Depends on:** `U-SUB-28`
- **Acceptance:** Self-referral test case scored > 0.8 risk; cookie-stuffing pattern detected; clawback creates Stripe credit-note reversing payout; all fraud events logged immutably in `U-SUB-28`.
- **verifies_via:** `rtk vitest run -- AffiliateFraudEngine.test.ts`
- **Variability axes:** 3 fraud signatures × (high-conf / borderline / clean) × payout state (pending / paid) = 18 cases

### Original-v1 carryovers (14 units — retained verbatim with v7.A gates added)

These retain the v1 IDs `U-SUB-01..U-SUB-18` from the original spec (Paddle alt, FeatureTier, LicenseValidator, TrialConversion, CustomerDashboard BE+FE, InvoicePdf, RateLimit middleware, TierGateHook, annual/monthly discount param, multi-seat purchase, SubscriptionState pause/vacation, self-service upgrade/downgrade, affiliate/referral tracking). Each gains a `verifies_via` block per v7.A and a `variability_axes_covered` declaration.

| v1 ID | Title | New verifies_via | Variability axes added |
|---|---|---|---|
| `U-SUB-01` | Stripe webhook receiver (now thin shim — heavy work in `U-SUB-19/20`) | `rtk vitest run -- StripeWebhookEngine.test.ts` | 6 event types × 3 paths = 18 cases |
| `U-SUB-02` | Paddle alternative for non-US (thin shim — heavy in `U-SUB-21`) | `rtk vitest run -- PaddleWebhookEngine.test.ts` | 5 event types × 3 paths = 15 |
| `U-SUB-03` | Tier-feature mapping (`FeatureTierEngine` + `state/shared/feature-tiers.json`) | `rtk vitest run -- FeatureTierEngine.test.ts && node scripts/feature-tier-coverage.mjs` | 5 tiers × N features = full matrix |
| `U-SUB-04` | Per-seat license validation middleware | `rtk vitest run -- LicenseValidatorEngine.test.ts && curl -H 'X-License: ...' /sfc` | 5 tiers × (valid / expired / wrong-org) = 15 |
| `U-SUB-05` | Trial → paid conversion flow (`TrialConversionEngine` + 3 trial-gated pages) | `playwright test trial-conversion.spec.ts` | 5 trigger placements × (CC-required / -not) = 10 |
| `U-SUB-06` | Customer dashboard backend (`CustomerDashboardEngine`) | `rtk vitest run -- CustomerDashboardEngine.test.ts` | 5 tiers × (usage / billing / seats) = 15 |
| `U-SUB-07` | Customer dashboard frontend | `playwright test dashboard.spec.ts` | 5 tiers × responsive breakpoints (3) = 15 |
| `U-SUB-08` | Invoice/receipt PDF gen (`InvoicePdfEngine` consumes pdf-skill) | `rtk vitest run -- InvoicePdfEngine.test.ts` | 5 invoice classes × (B2C/B2B) = 10 |
| `U-SUB-09` | Failed-payment dunning flow (thin shim — heavy in `U-SUB-36`) | `rtk vitest run -- DunningFlowEngine.test.ts` | (replaced by `U-SUB-36`) |
| `U-SUB-10` | API rate-limit per-tier middleware | `rtk vitest run -- RateLimitEngine.test.ts && k6 run rate-limit-soak.js` | 5 tiers × (under / at / over limit) = 15 |
| `U-SUB-11` | Per-tier hook injection (`TierGateHookEngine`) | `rtk vitest run -- TierGateHookEngine.test.ts` | 5 tiers × dispatcher actions = full |
| `U-SUB-12` | Refund/dispute handler (thin shim — heavy in `U-SUB-33/34`) | `rtk vitest run -- RefundHandlerEngine.test.ts` | (replaced) |
| `U-SUB-13` | Tax calc (thin shim — heavy in `U-SUB-22..25`) | `rtk vitest run -- TaxCalcBridgeEngine.test.ts` | (replaced) |
| `U-SUB-14` | Annual-vs-monthly discount logic (parameter on `FeatureTierEngine`) | `rtk vitest run -- FeatureTierEngine.test.ts -- annual` | 5 tiers × (monthly / annual / mid-switch) = 15 |
| `U-SUB-15` | Multi-seat purchase + admin invite (thin shim — heavy in `U-SUB-39/40/41`) | `playwright test seat-invite.spec.ts` | (replaced) |
| `U-SUB-16` | Subscription pause / vacation mode (`SubscriptionStateEngine`) | `rtk vitest run -- SubscriptionStateEngine.test.ts` | 5 tiers × (pause / resume / expire) = 15 |
| `U-SUB-17` | Self-service plan upgrade/downgrade (extends `FeatureTierEngine`) | `playwright test upgrade-downgrade.spec.ts` | 20 transitions × (immediate / scheduled) = 40 |
| `U-SUB-18` | Affiliate / referral tracking (thin shim — fraud in `U-SUB-43`) | `rtk vitest run -- ReferralEngine.test.ts` | 3 attribution windows × N affiliates |

**Net effective unit count:** 43 (1 foundation + 3 webhook + 4 tax + 1 currency + 3 compliance + 6 sub-state + 1 dunning + 2 form-factor + 3 multi-seat + 1 pairwise + 1 anti-fraud + 18 carryovers, with several carryovers downgraded to "thin shim" status since their heavy work is now in the v2 expansions).

---

## P0 hoist set (5 units must merge before MS0 paywall lights up)

| P0 ID | Reason |
|---|---|
| `U-SUB-00` | Foundation — nothing routes without the dispatcher |
| `U-SUB-19` | F-r2-a2-1 CRITICAL: revenue-exfil prevention; no webhook intake until this lands |
| `U-SUB-22` | F-r2-a2-3 CRITICAL: tax compliance; blocks EU/UK/CA/AU GTM |
| `U-SUB-28` | F-r2-a2-6 HIGH: SOC2 substrate every other unit emits audit events into |
| `U-SUB-04` | License-validator middleware — paywall has no teeth without this |

**Total P0 count: 5 units** (foundation + 3 round-3 most-urgent + license middleware).

---

## Acceptance gate at MS1 close

MS1 v2 is `complete` when:
1. All 43 units have `status: shipped` with green `verifies_via` ledger entry in `mcp-server/data/state/SCRUTINY_LEDGER.json`.
2. `U-SUB-42` pairwise matrix has executed CI run with **zero failures across 124 + 12 cases**.
3. `U-SUB-28` audit-chain verify passes against full event history.
4. PCI scope scan (`U-SUB-29`) returns zero PAN/CVV findings across `mcp-server/`.
5. `stripe trigger checkout.session.completed --add metadata.test=e2e` round-trips through `prism_subscription:webhook_receive → entitlement_grant → audit_record` within p95 < 800ms (load-tested via k6 at 50 req/s peak).
6. 3-of-3 scrutiny consensus (Codex + Gemini + Opus reviewer) passes for the milestone-close PR.
7. `state/shared/REVENUE-READINESS.json` `ms1_subscription_pct == 1.0`.

---

# REVENUE-MS2 v2 — Node-combination invention (post-dedup, honest market-fit)

> **Round-4 revision** — collapses 42 → 24 units after applying round-3/04 dedup verdicts, round-3/05 v7.B physics gap reconciliation, and round-3/08 knowledge truth-table corrections. JM-Die-direct customer-fit drives KEEP list; legal/marketing risks corrected pre-ship.

## Revision summary

| Action | Count | Source |
|--------|-------|--------|
| DROP (removed entirely) | 7 | round3/04 §dedup |
| MERGE (collapsed into peer) | 5 | round3/04 §dedup |
| KEEP / RETITLE (re-spec only) | 12 | round3/04 §dedup |
| BUILD (net-new w/ gap engines) | 7 | round3/04 §build |
| **TOTAL MS2 v2 units** | **24** | (was 42) |

### DROPs (7)
- `U-INV-WEDM-02` — `/wedm-cost` already wired (WEDMCreditCostEngine + WEDMCostModel)
- `U-INV-WEDM-04` — 5 dialects already wired (Mitsubishi/Sodick/Makino/Agie/Fanuc post engines + DialectRouter)
- `U-INV-WEDM-05` — `/wedm-ai-advisor` skill exists; WEDM is over-built (62 engines)
- `U-INV-WEDM-06` — 6 MITCourse engines already wired; JM-Die operators do not buy CE credits
- `U-INV-CROSS-01` — 10 tribal engines wired to 9 dispatchers (RAG production-grade)
- `U-INV-SHOP-08` — 7 scheduling engines + 4 dispatchers + `/bid-to-win` `/capacity-plan` skills shipped
- `U-INV-KNOW-01` — merged into CROSS-01 (effective drop; tribal RAG already wired)

### MERGEs (5)
- `U-INV-MILL-06` ⇒ absorbs v7.B Row 17 (quote-from-STEP single owner)
- `U-INV-MILL-07` ⇒ folded into `U-INV-MILL-01` (shared SpindleTelemetry dependency)
- `U-INV-MILL-01` ⇒ retitled as "Mill Operator Advisor" (chip-load + violation alerts on shared telemetry)
- `U-INV-WEDM-03` ⇒ drop SafetyGate framing (already wired); keep WEDMPCDEngine + WEDMHooksEngine build only
- `U-INV-KNOW-01` ⇒ merged into CROSS-01 (single tribal product, not two)

### BUILDs — 7 net-new with gap engines
1. **U-INV-LATHE-02** — BUILD `ChipbreakerCatalogEngine` + `CSSWrapRiskEngine`
2. **U-INV-LATHE-04** — BUILD `MillTurnForwardKinematicsEngine` + `SweptVolumeCollisionEngine` + `SubSpindleSyncEngine` (sequenced behind these 3)
3. **U-INV-CROSS-06** — BUILD `MoldDFMEngine` only (drop plastic-mold quote SaaS framing)
4. **U-INV-SHOP-01** — BUILD `MTConnectIngestEngine` + `OPCUAIngestEngine` (shared with MILL-01 telemetry)
5. **U-INV-SHOP-02** — BUILD `AlarmBusEngine` (1 net-new engine; wire via MTConnect/OPC-UA bus)
6. **U-INV-KNOW-02** — BUILD `PDFKnowledgeExtractorEngine` + `VideoIngestEngine` + `WebScrapeIngestEngine`
7. **U-INV-KNOW-03** — BUILD `PIIRedactionEngine` + `ConflictResolutionEngine` (replaces vapor DoctrineEngine) + `DataResidencyEngine`

---

## SHIP-FIRST PRIORITY (round3/04 §highest_value_units_ranked)

| Rank | Unit | Why first |
|------|------|-----------|
| 1 | `U-INV-LATHE-05` | Cost-per-part calculator — engines wired (Boothroyd Eq. 5.30); viral free-tier funnel for fastener-industry quoting. Top of MS2-Lathe. |
| 2 | `U-INV-MILL-08` | Cycle Time Crush — 24,545-program JM Die training corpus; outcome-based pricing bypasses senior-programmer trust barrier. Use SA (simulated annealing) per F-r2-a8-F. |
| 3 | `U-INV-SHOP-02` | OEE alerts via new `AlarmBusEngine` — paid-tier shop-owner feature; OEECalculatorEngine math already wired, only delivery layer missing. |

---

## MILL track (5 units; was 8)

| Unit | Decision | Title (revised) | Backing |
|------|----------|-----------------|---------|
| `U-INV-MILL-01` (absorbs MILL-07) | RETITLE+MERGE | **Mill Operator Advisor** — predicted chip-load + violation alerts (offline CAM-time, NOT real-time until SpindleTelemetry built) | Kienzle live; SpindleTelemetryIngest deferred to MS3 |
| `U-INV-MILL-02` | KEEP | Tool-life co-optimizer with MRR (Taylor V·T^n × Kienzle) — Boothroyd Eq. 5.30 acceptance | AdaptiveFeedModulation E0004 + Taylor constants + MaterialDB E0323 |
| `U-INV-MILL-03` | RETITLE | Long-tool feed advisor with damped closed-loop (**offline scheduled, NOT mid-cut servo**) — ζ≥0.7, α≤0.3, dead-band ±5%, anti-windup, 300-sample limit-cycle FFT test | DeflectionOverlay E0127 + AdaptiveFeed E0004 + control-law spec |
| `U-INV-MILL-04` | RETITLE | Per-operation chatter-free RPM picker (**toolpath boundaries only, no mid-block S-words**) — \|Δn\|<15% per 60s thermal budget; roughing-only initial scope | SLDOverlay E0433 |
| `U-INV-MILL-05` | KEEP | Thermal-compensated first-part probe + offset — Renishaw OMP60 + Blum macros for Okuma OSP-P300 / Fanuc 30iB / Heidenhain | ThermalOverlay E0456 + `/probe-routine-guide` |
| `U-INV-MILL-06` (absorbs v7.B Row 17) | MERGE | Quote-from-STEP (DFM × ToleranceStack × CADExtract) — cost equation spec REQUIRED before unit starts | CADExtract + DFMCheck + ToleranceStack + `/quote` |
| `U-INV-MILL-08` | KEEP (**ship 2nd**) | Cycle Time Crush SaaS — SA (simulated annealing) per F-r2-a8-F, not steepest-descent; Vericut-class sim via `/program-simulate` | CycleTimeCrush + ProgramOptimize |

## LATHE track (6 units; was 7)

| Unit | Decision | Title (revised) | Backing |
|------|----------|-----------------|---------|
| `U-INV-LATHE-01` | RETITLE | Hard-turn parameter advisor — **NO residual-stress claim, NO grinding-replacement claim** (liability fix; ResidualStressFEM + WhiteLayerKinetics + CBNCeramicCatalog deferred to MS5+) | HardTurningCapstone E0175 + Kienzle |
| `U-INV-LATHE-02` | **BUILD** | Lights-out turning verdict (chipbreaker + CSS wrap-risk) — BUILD `ChipbreakerCatalogEngine` (Sandvik/Kennametal/ISCAR/Tungaloy/Mitsubishi × ~40 geometries) + `CSSWrapRiskEngine` (Nakayama-Arai 1962) | Skill-only today; 2 new engines |
| `U-INV-LATHE-03` | KEEP | Universal threading wizard — audit ThreadingEngine; Okuma/Mazak/Fanuc/Mori/Hardinge dialect post tests | `/hard-turn` + `/lathe-thread` |
| `U-INV-LATHE-04` | **BUILD** | Mill-turn collision-free post for Okuma B250IIW — BUILD `MillTurnForwardKinematicsEngine` (T_world ← T_base·T_b_axis(θ)·T_tool) + `SweptVolumeCollisionEngine` (octree/BVH) + `SubSpindleSyncEngine` (Z2+C2 phase-match FSM). **Sequenced behind 3-engine build (~8 weeks gating).** | Zero kinematic engines today (E0316 is Mastercam, wrong vendor) |
| `U-INV-LATHE-05` | KEEP (**ship 1st**) | Cost-per-part calculator (Gilbert min-cost / max-prod / max-profit) — free-tier (no auth, DOS protection); MS1 paywall plumbing coordination required | CostOptimizeLathe + Boothroyd & Knight Eq. 5.30 |
| `U-INV-LATHE-06` | RETITLE | Lathe Print-to-Program Pipeline (BlueprintVisionOCR + ToleranceExtract + LatheAdaptive) — BUILD `LathePrintToProgramOrchestratorEngine`; **defer to MS3** | Fragmented engines, no orchestrator |
| `U-INV-LATHE-07` | KEEP | Groove-job advisor — run `/dedup` to avoid duplicating E0174; **ship LAST in MS2-Lathe** | GrooveClassificationEngine E0174 + `/lathe-groove` |

## WEDM track (2 units; was 6)

| Unit | Decision | Title (revised) | Backing |
|------|----------|-----------------|---------|
| `U-INV-WEDM-01` | KEEP | WEDM 4-axis taper-die programming — acceptance: regenerate 5 JM Die taper-die programs from spec, diff vs archive | `/wedm-jm-die` + WEDMTaperEngine + 26 indexed programs |
| `U-INV-WEDM-03` | MERGE/BUILD | WEDM PCD-specific hooks (**drop SafetyGate framing — already wired**) — BUILD `WEDMPCDEngine` + `WEDMHooksEngine` for hardened die-steel | WEDMSafetyEnvelopeEngine wired; PCD + Hooks missing |

**WEDM redirect note (round3/04 §drop_count_with_redirect):** 3 freed unit budgets (WEDM-04/05/06) → redirect to sinker-EDM second-pillar buildout per Round-1 F308 (sinker has 7 engines, WEDM has 62 — balance pillars).

## CROSS track (5 units; was 6)

| Unit | Decision | Title (revised) | Backing |
|------|----------|-----------------|---------|
| `U-INV-CROSS-02` | KEEP | Setup-sheet auto-generator — emit PDF setup sheet for 5 JM Die archive jobs | `/setup-sheet-generate` + SetupSheetEngine (verify) |
| `U-INV-CROSS-03` | KEEP | Tolerance-stack web tool — **surface as free-tier** acquisition funnel | ToleranceStackEngine + `/tolerance-stack` + `/gdnt-check` |
| `U-INV-CROSS-04` | RETITLE | **Quote-to-Ship Milestone (multi-unit)** — decompose into MS2-CROSS-04a..-04e (CAD import + DFM gate + estimator + scheduler hook + ship-confirm). Single-unit framing rejected (6-month effort masked). | QuoteToShipOrchestratorEngine + component coordination |
| `U-INV-CROSS-05` | KEEP | Cross-domain process planner (mill + lathe + EDM same part) — route real JM Die die cavity through mill→WEDM stages | ProcessRouting + JobPlanning (verify) |
| `U-INV-CROSS-06` | **BUILD** | MoldDFM engine ONLY (gate clamping/parting-line/draft/wall-thickness/sink/weld-line) — **DROP plastic-mold quote SaaS framing** for JM-Die GTM | InjectionMoldingEngine + InjectionMoldQuoteEngine wired; MoldDFMEngine missing |

## SHOP track (6 units; was 8)

| Unit | Decision | Title (revised) | Backing |
|------|----------|-----------------|---------|
| `U-INV-SHOP-01` | **BUILD** | Shop-floor live dashboard — BUILD `MTConnectIngestEngine` + `OPCUAIngestEngine` (already planned in `/cowork-connectors`; do not duplicate). Shared bus with MILL-01. | `/shop-live-status` skill; ingest engines missing |
| `U-INV-SHOP-02` | **BUILD (ship 3rd)** | OEE alerts (real-time) — BUILD `AlarmBusEngine`; wire over MTConnect/OPC-UA from SHOP-01; emit Slack/Discord alert on JM Die machine OEE drop | OEECalculatorEngine wired; AlarmBus missing |
| `U-INV-SHOP-03` | KEEP | Tool-crib inventory + reorder — coordinate vendor with SHOP-06 (McMaster/MSC/Fastenal, **not Amazon**) | ToolCatalogAdaptive E0459 + `/tool-crib-guide` + `/tool-catalog` |
| `U-INV-SHOP-04` | KEEP | Magazine/turret optimizer — audit MagazineOptimizerEngine wiring | `/magazine-optimize` |
| `U-INV-SHOP-05` | KEEP | Shop-safety check (PPE / lockout-tagout / fume) | `/shop-safety-check` + SafetyHooks + `/ergo-check` |
| `U-INV-SHOP-06` | RETITLE | **Industrial-supply auto-reorder (McMaster + MSC + Grainger + Fastenal)** — **DROP Amazon Business**; fastener industry sources from industrial-distribution vendors; SP-API OAuth + regulatory-purchasing audit-trail risk for zero customer-pull | Zero vendor API engines today |
| `U-INV-SHOP-07` | KEEP | Job-traveler PDF/QR generator — QR drives `/shop-live-status` scan-in/out telemetry | `/traveler` + Traveler/QRGen (verify wiring) |

## KNOW track (3 units; was 4)

| Unit | Decision | Title (revised) | Backing |
|------|----------|-----------------|---------|
| `U-INV-KNOW-02` | **BUILD** | Ingest customer manuals (PDF/video/web) — BUILD `PDFKnowledgeExtractorEngine` (engine-back `/pdf-learn`) + `VideoIngestEngine` (engine-back `/video-learn` + `/youtube-transcript`) + `WebScrapeIngestEngine`; wire to `prism_memory:ingest_customer_corpus` | 7 PDF engines + 7 Video engines exist as substrate; orchestrator engines missing for productization |
| `U-INV-KNOW-03` | **BUILD** | Operator chat with conflict resolution + PII — BUILD `PIIRedactionEngine` (regex+ML hybrid; names/serials/PO numbers) + `ConflictResolutionEngine` (**replaces vapor DoctrineEngine** per round3/08) + `DataResidencyEngine` (GDPR EU vs US) | Zero PII/Doctrine/Residency engines today; KnowledgeUnification pattern reused for ConflictResolution |
| `U-INV-KNOW-04` | RETITLE | **Internal training tracker (Certificate of Completion, NO CE-credit claim)** — BUILD `LearnerTranscriptEngine`; defer real CE-credit product to MS5+ once NIMS/SME/ABET partnership signed (12-24 mo lead) | Zero accreditation engines |

## CAD track (2 units; was 3)

| Unit | Decision | Title (revised) | Backing |
|------|----------|-----------------|---------|
| `U-INV-CAD-01` | KEEP | Text-to-CAD generation — **frame as "CadQuery-backed" not "multi-kernel"** (Python sidecar over OCCT bindings); acceptance: generate 5 simple parts (bolt, bracket, plate, flange, shaft) | TextToCADGenerationEngine E0455 (CadQuery kernel real) |
| `U-INV-CAD-02` | RETITLE/DROP | **Topology-optimized geometry via TopOpt/ToPy sidecar (open-source)** — **DROP Fusion 360 Generative Design API claim** (no public API exists per round3/08; technically false). Optional commercial path: nTopology API. OR DROP entirely if no partnership in motion. | Zero generative engines; Fusion360CodeGen E0158 is code-gen not gen-design |
| `U-INV-CAD-03` | KEEP | Chat-with-the-part (CADRag + CADExtract + AGI-CAD) — wire to `prism_cad:chat_with_part`; conversation-memory loop on QdrantMemoryEngine; acceptance: answer 10 standard CAD queries against real JM Die STEP file | CADKnowledgeGraph E0050 + CADFeatureEmbedding E0042 + CADAIStateMachine E0030 + CADIntentDecomposer E0049 (substrate real) |

---

## Knowledge-headline corrections (round3/08 — pre-ship legal/marketing)

| Old claim (REJECTED) | Replacement (USE THIS) | Source |
|----------------------|------------------------|--------|
| "4,245 tribal tips for monetization" | **"243 canonical tips + 3,629 RAG-indexed entries (≈80 field-grounded)"** | round3/08 §evidence_snapshot |
| "Manufacturing CE credits" | **"Certificate of Completion"** (no accreditor needed; pursue NIMS/SME co-branding for v2) | round3/08 §KNOW-06 |
| "Fusion 360 Generative Design API integration" | **"TopOpt/ToPy sidecar (open-source) or nTopology commercial"** — Fusion gen-design has NO public API | round3/08 §CAD-02 |
| "Hard-turn replacement of grinding" | **"Hard-turn parameter advisor"** (no residual-stress claim; no grinding-replacement claim) — ResidualStressFEM does not exist | round3/04 §LATHE-01 |
| "Amazon Business auto-reorder" | **"McMaster-Carr + MSC + Grainger + Fastenal industrial-supply auto-reorder"** | round3/04 §SHOP-06 |
| "DoctrineEngine arbitrates knowledge conflicts" | **"ConflictResolutionEngine"** (reuse KnowledgeUnification pattern; 4–6 wk build) | round3/08 §KNOW-04 |
| "Qdrant production-tier retrieval" | **"Qdrant dev-grade; SLO (p99<200ms) + backups + HA + auth + multi-tenant gating required before paid SaaS"** | round3/08 §KNOW-02 |
| "Paywall $49/$199/$999 tiers" | **"BillingEngine + EntitlementsEngine + StripeBridgeEngine + RateLimitEngine 8–12wk build first (or Lemon Squeezy / Paddle MoR to skip tax compliance)"** | round3/08 §KNOW-05 |
| "Wiki has 722 entries" | **"770 entries (575 engines + 96 dispatchers + 99 memories) per 2026-05-08 bootstrap"** | round3/08 §evidence_snapshot |

---

## Acceptance gates (every unit must clear before ship)

1. **Round-trip dispatcher wiring** — engine wired to ALL natural-consumer dispatchers (per CLAUDE.md §ENGINE WIRING)
2. **PENDING_GAP_ENGINES.json registration** for every BUILD engine
3. **JM Die archive acceptance test** — regenerate / route real JM Die job through unit's pipeline
4. **Legal/marketing copy review** — claims match round3/08 truth-table
5. **`/dedup` clean before any new engine** — duplication-hard-block enforces

## Out-of-scope for MS2 v2 (deferred to MS3+)

- SpindleTelemetryIngestEngine + real-time variants of MILL-01/07 → MS3
- Lathe Print-to-Program Orchestrator → MS3 (per F-r2-a3-K — let MILL-08 cycle-crush ship first)
- True CE-credit product (NIMS/SME partnership) → MS5+
- ResidualStressFEM + WhiteLayerKinetics + HardTurnSurfaceIntegrity → MS5+
- Sinker-EDM second-pillar buildout → reabsorb WEDM-04/05/06 freed budgets, separate milestone

---

# REVENUE-MS3 v2 — Wire-backlog harvest (revenue-relevant orphans first)

> **Round-4 revision** — collapses the "875 unwired" framing into the **531 true-revenue-relevant** subset after subtracting ML-plumbing (289), singleton wrappers (30), and infrastructure facades (25). Replaces the original 18-unit × 47-engine-per-batch plan (round-2 verdict: INFEASIBLE at 7.8x historical velocity) with **12 batches @ 8-12 engines** sustainable under the 3way scrutiny gate.

## Corrected math (round-3/07 forensic)

| Bucket | Count | Action |
|---|---|---|
| BUILD_STATE.needs_wiring (raw) | 875 | starting pool |
| − singleton wrappers in unwired pool | 30 | TAG-AS-EXEMPT (do not wire) |
| − ML-plumbing (LoRA/Federated/ProtoMAML/AdaLoRA/DoRA/Continual/TTA/Replay/Synaptic/DER) | 289 | defer to MS-ML-PLUMBING |
| − infrastructure / Base / Facade / Bridge / Event / ChatBus / Provenance survivors | 25 | TAG-AS-EXEMPT |
| **= true revenue-relevant orphans** | **531** | wire in MS3 + MS3.5 |
| MS3 v2 coverage (12 batches × ~9.5) | 116 | this sprint (22%) |
| MS3.5 carry-over | 415 | defer to next sprint |
| MS-ML-PLUMBING (separate milestone) | 289 | post-MS3, research-tier |

Note: `BUILD_STATE` already deducts the 81 already-tagged `WIRE-EXEMPT` engines from the 875 (verified by `grep WIRE-EXEMPT mcp-server/src/engines/` → 86 files / 87 occurrences, matches within rounding). The 30 above are **untagged** singleton wrappers that the detector cannot infer.

## Historical velocity calibration

- **Sustained**: 6 engines / commit (BATCH2/3/4/5/7/8/9 evidence)
- **Ceiling**: 12 / commit (BATCH5-6-RETRY combined catch-up)
- **Floor**: 4 / commit (BATCH11 — late-stage drag)
- **Empirical saturation**: BATCH7 needed RETRY2 + HARDEN at only 6 engines under 3way scrutiny → **9.5/batch is the sustainable upper bound**, 47/batch (old plan) is 7.8× over capacity and would deadlock the Stop hook.

## Revenue-priority ordering (Lathe-first)

| Rank | Batch | Domain | Count | Why first |
|---|---|---|---|---|
| 1 | `U-WIRE-LATHE-BATCH12` | Lathe AI/CAM/chemistry | 9 | JM-Die is a lathe-heavy fastener shop; highest customer-impact gap |
| 2 | `U-WIRE-LATHE-BATCH13` | Lathe knowledge/material/measurement | 9 | Closes the L12→L13 tribal-RAG chain |
| 3 | `U-WIRE-TURNING-BATCH1` | Turning (full domain close) | 11 | Single-shot clears Turning (11→0); compounds with Lathe |
| 4 | `U-WIRE-LATHE-BATCH14` | Lathe sequencing/optimization/strategy | 10 | Consumes B12-B13 outputs |
| 5 | `U-WIRE-LATHE-BATCH15` | Lathe tools/validation/workholding | 10 | Closes lathe revenue subset |
| 6 | `U-WIRE-MACHINE-BATCH1` | Machine speed/feed/OEE | 9 | Double-wire to `prism_calc` per WIRE-TO-ALL |
| 7 | `U-WIRE-MACHINE-BATCH2` | Machine ROI/state/telemetry | 8 | Closes Machine domain (17→0) |
| 8 | `U-WIRE-MULTI-BATCH1` | Multi-agent / multi-vendor | 12 | Closes Multi (12→0); consensus double-wires to `prism_intelligence` |
| 9 | `U-WIRE-CAM-OTHER-BATCH1` | CAD subset of Other | 10 | Quote/DFM pipeline foundation |
| 10 | `U-WIRE-CAM-OTHER-BATCH2` | CAM subset of Other | 10 | Fixture/holder/probe revenue |
| 11 | `U-WIRE-QUALITY-OTHER-BATCH1` | AS9100/PPAP/FAIR | 8 | Audit-grade traceability — high revenue per seat |
| 12 | `U-WIRE-OTHER-MISC-BATCH1` | ShopFloor + GCode templates | 10 | Dashboard cluster → `prism_quote` double-wire |

**Totals**: 12 batches, avg **9.67 engines**, **116 engines wired in MS3**, **415 deferred to MS3.5**, **289 deferred to MS-ML-PLUMBING**.

## Per-batch unit spec (every batch is one Unit-of-Commit)

Each `U-WIRE-*` unit produces in a single 3way-cleared commit:
1. Dispatcher import + `actions` enum entry per engine
2. Schema entry (Zod) in matching `src/schemas/*.ts`
3. Lazy-import resolution in dispatcher router
4. **Engine-named test file** `<EngineName>.test.ts` with ≥15 `it()` cases (round-3/06 F-r2-a6-6 was social-enforced; **MS3 v2 moves it to HOOK-ENFORCED** via the new `stop_on_unnamed_engine_tests.mjs` gate — see §Hook addition below)
5. ≥1 round-trip E2E case asserting input → dispatcher action → engine method → concrete output (no singleton bypass)
6. 3way scrutiny PASS (Codex + Gemini + Opus all VERDICT: PASS) recorded in `SCRUTINY_LEDGER.json`

## Top-3 first batches — engine lists

### `U-WIRE-LATHE-BATCH12` (9 → `prism_turning`)
`LatheAdvancedOperationsEngine`, `LatheAIFeatureRegistration`, `LatheAIUltraEngine`, `LatheCAMIntelligenceEngine`, `LatheCuttingChemistryEngine`, `LatheDeepAIHardeningEngine`, `LatheEnvelopeDistanceEngine`, `LatheFinishingStrategyEngine`, `LatheGcodeAnalyzerEngine`

### `U-WIRE-LATHE-BATCH13` (9 → `prism_turning`)
`LatheGroovingEngine`, `LatheHardenedSelfEngine`, `LatheJMDieKnowledgeEngine`, `LatheKienzleEngine`, `LatheKnowledgeRetrievalEngine`, `LatheLubricantEngine`, `LatheMachineProfileEngine`, `LatheMaterialKBEngine`, `LatheMeasurementBridgeEngine`

### `U-WIRE-TURNING-BATCH1` (11 → `prism_turning`)
`TurningEnvelopeDistanceEngine`, `TurningInspectionPlanEngine`, `TurningRulesGeneratorEngine`, `TurningSensitivityAnalysisEngine`, `TurningStochasticPlanEngine`, `TurningStrategyCatalog`, `TurningSurfaceFinishEngine`, `TurningThreadEngine`, `TurningToolDeflectionEngine`, `TurningToolLifeEngine`, `TurningValidationEngine`

## Deferred — MS-ML-PLUMBING milestone (post-MS3)

289 ML-plumbing engines (LoRA / Federated / ProtoMAML / AdaLoRA / DoRA / Continual / TestTimeAdaptation / Replay / Synaptic / DER) → **no inference revenue path** (training-time research infra). Many already carry `WIRE-EXEMPT` tags. Defer to a dedicated `MS-ML-PLUMBING` milestone post-MS3 close so they don't dilute the revenue cadence.

## WIRE-EXEMPT + singleton-wrapper exclusion list (do NOT re-flag)

Singleton wrappers (30) where wiring would create circular deps — TAG ONLY:
- `QdrantMemoryEngineSingleton` (wraps `QdrantMemoryEngine`)
- `*EngineSingleton` pattern across memory/context/session engines
- `*Bridge`, `*Facade`, `*EventBus`, `*ChatBus`, `*Provenance` infrastructure surface
- Base classes: `BaseEngine`, `BaseDispatcher`, `BaseSchema`

Action: extend `stop_on_unwired_assets.mjs` to recognize `// WIRE-EXEMPT: <reason>` and the singleton naming pattern. Audit run produces a `WIRE_EXEMPT_REGISTRY.json` so the same 30+25 don't re-surface in MS3.5 backlog.

## Hook addition (new in MS3 v2)

`stop_on_unnamed_engine_tests.mjs` — Stop hook that BLOCKS if a batch commit adds engines to a dispatcher without matching `<EngineName>.test.ts` containing ≥1 dispatcher-round-trip assertion. Replaces the social convention from round-3/06 F-r2-a6-6. Lives in `MINIMAL_ALLOWLIST` so `PRISM_HOOK_PROFILE` can't disable.

## Acceptance per batch

- Build: `npm run build:fast` < 10s incremental
- Tests: 8-12 `.test.ts` × 15 cases = 120-180 new test cases; `vitest run <batch-files>` < 60s
- Review: 3way scrutiny ledger 3-of-3 PASS within ~15-20min PR cycle
- Stop hooks: `stop_on_unwired_assets`, `stop_on_unnamed_engine_tests`, `scrutinize-before-stop` all PASS
- Dispatcher contract: every wired action callable from MCP client → returns typed payload (no `unknown`)

## MS3.5 — carry-over (415 engines, separate milestone)

Domains still uncovered after MS3 close: Other-misc residual, CAM long-tail, niche knowledge engines, vendor-specific bridges. Plan 12 more batches @ ~10 engines for MS3.5; reorder by then-current revenue telemetry rather than static priority.

---

# REVENUE-MS4 v2 + REVENUE-MS5 (NEW) — Round-4 Spec Revision

**Author:** round4-agent-05 (revenue-roadmap audit lane)
**Generated:** 2026-05-10
**Supersedes:** REVENUE-ROADMAP-2026-05-10.md §REVENUE-MS4 (L233-L245), which assumed `totals.drift=613`
**Premise correction:** Direct read of `state/shared/MILESTONE_PROGRESS.json` confirms `totals.drift=2` (rows: MF-MS1, MF-MS2 — both FeasibilityEngine, both `claimedStatus=completed` with `shipped=0`). The 613-figure quoted in the original spec (L13, L233) is a **306x overstatement** — likely a stale cached count from a pre-fix audit. Round-3/06 produced the corrected unit set; Round-4 adopts it and adds a separate REVENUE-SUPPORT-AUDIT milestone to capture the conflated revenue-cluster audit work the original MS4 silently smuggled into a drift-reconciliation framing.

**Boundary:** MS4 v2 is envelope hygiene only — narrow, mechanical, dry-run-gated. MS5 (NEW) is engine-grounded capability audit — evidence-driven, ENGINE_DIGEST/BUILD_STATE referenced row-by-row, no envelope mutations.

---

## REVENUE-MS4 v2 — Envelope drift reconciliation (2-3 units)

**Why:** Two envelope rows (MF-MS1, MF-MS2) claim `completed` but git shows `shipped=0`. These are the **entire** drift surface — not 613, not 10 clusters. The unit is to dry-run `/envelope-sync` on each, request the FeasibilityEngine owner's decision on the AGENT_CHAT bus, and apply only on human `--apply`. Per `envelope-sync.md` L80: *"Never auto-apply without user --apply flag and visual review."*

**Depends on:** none. **Blocks:** MS5 audit (so the audit output isn't polluted by envelope-noise rows). **Revenue impact:** indirect — hygiene only; reconciles trust in own roadmap.

### Units

#### U-DRIFT-01 — Reconcile MF-MS1 via `/envelope-sync` (dry-run + human approval)

**depends_on:** []
**unit_size:** small (≤4h, mostly waiting on owner response)
**risk:** low (dry-run by default; 1 envelope; no engine mutation)
**blocks_revenue:** false

**Spec:** Run `/envelope-sync MF-MS1` in default dry-run mode. Envelope currently claims `status=completed` with `shipped=0/4`. Two valid resolutions:
- **(a) Work genuinely abandoned →** propose flip `status=not_started`, mark units `pending`.
- **(b) Work in flight on another branch →** propose flip `status=in_progress`, leave units as-is.

Decision belongs to the FeasibilityEngine owner. This unit produces the patch JSON + a tagged review request — **never autonomous `--apply`.**

**Acceptance (evidence-grounded):**
1. `state/shared/envelope-sync-MF-MS1.patch.json` exists with full `--dry-run` output (current envelope state, proposed delta, decision branch).
2. `state/shared/AGENT_CHAT.md` contains a PR-style post tagging the FeasibilityEngine owner (last committer on `src/engines/FeasibilityEngine.ts` per `git log -1 --format=%an`).
3. After owner approval, `--apply` commit lands; re-running `node scripts/build-milestone-progress.mjs` reports `totals.drift` decremented by 1 (target: from 2 → 1).
4. If owner unreachable >48h: envelope tagged `envelope-stale`, unit closes `status=deferred-to-owner-response`. **NEVER autoflip without owner sign-off** (per round3/06 F-r2-a7-4 cascade-risk finding).
5. Verification re-runnable in <30s: `rtk git log --oneline -- mcp-server/data/milestones/MF-MS1.json && node scripts/build-milestone-progress.mjs`.

---

#### U-DRIFT-02 — Reconcile MF-MS2 via `/envelope-sync` (dry-run + human approval)

**depends_on:** []  (independent of U-DRIFT-01 — different envelope, different unit list, can run in parallel)
**unit_size:** small (≤4h)
**risk:** low
**blocks_revenue:** false

**Spec:** Identical workflow to U-DRIFT-01 but for `MF-MS2` (`shipped=0/3`, also `claimedStatus=completed`). Same dry-run-first, owner-approval gate, never-autoflip discipline.

**Acceptance (evidence-grounded):**
1. `state/shared/envelope-sync-MF-MS2.patch.json` exists with full `--dry-run` output.
2. AGENT_CHAT post tagging owner (same provenance check as U-DRIFT-01; likely same owner since both envelopes are FeasibilityEngine).
3. After owner approval, `--apply` commit lands; `totals.drift` decrements to 0 (combined with U-DRIFT-01 closure).
4. Owner-unreachable path identical: `envelope-stale` tag, `deferred-to-owner-response` close.
5. Verification re-runnable in <30s: `rtk git log --oneline -- mcp-server/data/milestones/MF-MS2.json && node scripts/build-milestone-progress.mjs`.

---

#### U-DRIFT-03 (OPTIONAL) — 6h drift-watch cron monitor

**depends_on:** ["U-DRIFT-01", "U-DRIFT-02"]
**unit_size:** small (≤4h)
**risk:** low (read-only monitor, no envelope mutation)
**blocks_revenue:** false
**optional:** true
**optional_rationale:** Nice-to-have, not gating. If U-DRIFT-01 + U-DRIFT-02 close the drift surface to 0 within 1 day and no new envelopes are being created at scale, the cron adds telemetry overhead without commensurate value. Defer to backlog if MS5 has unmet capacity.

**Spec:** Register a cron that runs `scripts/build-milestone-progress.mjs` every 6h. If `totals.drift > 0` after the run, post a one-line summary to `state/shared/AGENT_CHAT.md` naming the drifted milestones. **Silent on drift=0** (avoid spam). Use existing scheduling infrastructure (`/cron-bootstrap`, `/cron-manage`). Per round3/06 F-r2-a7-4: this is monitoring only, **never auto-remediation**.

**Acceptance (evidence-grounded):**
1. Cron registered via `/cron-bootstrap` or equivalent; fires every 6h with deterministic ID for `/cron-manage` lookup.
2. `MILESTONE_PROGRESS.json` regenerated each fire (mtime check confirms).
3. `AGENT_CHAT.md` receives a post **only** when `drift > 0`; silent runs leave the file untouched.
4. Cron writes telemetry to `state/shared/drift-watch-cron.json` with schema `{lastRun, driftCount, milestonesAffected[], runDurationMs}`.
5. Manual smoke test: artificially patch one envelope to create drift, confirm next fire posts alert within 6h (or trigger via `/cron-manage run <id>`), then revert. Documented in unit close comment.

---

## REVENUE-MS5 (NEW) — Revenue-cluster capability audit (4 units)

**Why:** The original MS4 attempted to use envelope drift as a proxy for *"revenue clusters not yet shipped."* That proxy is invalid — drift=2, and neither row touches SFC, Master Post, or CAM bridges. The actual revenue question is **"do these subsystems expose billable, dispatcher-wired, frontend-reachable capability?"** That requires direct evidence audit against `ENGINE_DIGEST.md` + `BUILD_STATE.json`, **not** envelope reconciliation.

**Evidence anchors (every audit must cite these by row/line, no fabricated counts):**
- `ENGINE_DIGEST.md` — E0182 (Hurco V11 Master Post), E0265-E0271 (Lathe Master Post family), E0321-E0322 (MasterPost AGI), E0337 (WEDM Master Post), E0355 (Okuma B250 Master Post)
- `BUILD_STATE.json` §`needs_wiring`, §`needs_frontend`
- Recent commit `9386a4e88` (U-WIRE-CALC-SCE — sanity-check that SFC wiring is reflected)
- Recent commit `bf041d0f5` (U-WIRE-LATHE-BATCH2 — Lathe AI/intelligence wiring)
- `state/shared/system-viz/system-graph.json` — node + edge presence per engine

**Depends on:**
- `REVENUE-MS0` (frontend merge plan — audit needs the frontend surface to score)
- `U-DRIFT-01` + `U-DRIFT-02` (closes envelope noise so audit verdicts aren't polluted)

**Blocks:**
- `REVENUE-MS1` billing/tier gating — cannot gate what doesn't exist as a complete revenue-grade surface (engine + dispatcher + frontend + billable boundary)

**Cross-referenced by:** round3-5/01 (SFC backend findings), round3-5/05 (Master Post controller-dialect findings)

---

### Audit acceptance template (used by all 4 units)

Every audit unit emits a JSON report under `state/shared/audit-findings/revenue-roadmap/round3-audit-<cluster>.json` with the schema:

```
{
  "auditedAt": "<ISO timestamp>",
  "cluster": "<sfc|masterpost|cam-bridges|synthesis>",
  "sources_cited": [{"file": "<path>", "anchor": "<line/row/commit>"}],
  "rows": [
    {
      "engine": "<EngineName>",
      "engine_digest_row": "E####",
      "wired_to_dispatcher": <bool>,
      "dispatcher_actions": ["prism_calc:action_name", ...],
      "stub_check": "<non-stub|stub|tagged-WIRE-EXEMPT:<wrapper-ref>>",
      "test_coverage": {"file": "<path>", "non_trivial_assertions": <count>},
      "frontend_exposed": <bool>,
      "billable_boundary_present": <bool>,
      "severity": "<high|medium|low>",
      "recent_fix_commit": "<sha if applicable>",
      "build_state_block": "<needs_wiring|needs_frontend|wired|null>"
    }
  ],
  "gaps": [
    {"gap": "<one-line>", "severity": "<high|med|low>", "suggested_unit": "<U-... id>"}
  ],
  "verdict_summary": {"ships_today": <int>, "needs_wiring": <int>, "needs_frontend": <int>, "missing": <int>}
}
```

**Universal acceptance criteria** (every audit unit must satisfy):

1. **Evidence-grounded:** Every row cites at least one source from `sources_cited` by line/row/commit. No fabricated counts. Auditor's claim is reproducible by `rtk grep` or `rtk git log` against the cited anchor.
2. **No envelope dependency:** Audit verdict is driven by engine presence + dispatcher wiring + frontend reachability, **not** by milestone-envelope claims. Envelope status is irrelevant data here.
3. **WIRE-EXEMPT compliance:** If an engine has `dispatcher_actions=[]` but is genuinely wrapped by a singleton, it must be tagged `WIRE-EXEMPT:<wrapper-ref>` per CLAUDE.md ENGINE WIRING law (e.g. `QdrantMemoryEngine` ← `QdrantMemoryEngineSingleton`).
4. **JM Die anchor:** Where the engine operates on machine programs (Master Post, CAM bridges), at least one row must reference a real `JM DIE/` sample file path proving round-trip on real shop data (per CLAUDE.md JM Die test-shop directive).
5. **Stub detection:** Use the `always-build-guard.mjs` heuristic to flag `return 0`, `TODO`, `throw new Error('not implemented')` and similar placeholder bodies. Stubs with `severity=high` cannot ship as revenue-grade.
6. **Round-trip via dispatcher:** Where `dispatcher_actions > 0`, at least one cited test must call **through the dispatcher**, not directly into the engine singleton (per CLAUDE.md round-trip law).
7. **Auditable in <5min:** Re-run cost documented at unit close: `rtk vitest run -- <audit-script>.test.ts && rtk grep -l <pattern> mcp-server/src/tools/dispatchers/`.

---

### Units

#### U-REV-AUDIT-SFC-01 — Audit SFC engine family for stub returns + dispatcher wiring

**depends_on:** ["U-DRIFT-01", "U-DRIFT-02"]
**unit_size:** medium (≤8h — enumeration + per-engine verification)
**risk:** low (read-only audit; no engine mutation)
**revenue_impact:** high — SFC is Product #1 (per-seat subscription); stubs here block revenue
**cross-check:** round3-5/01 SFC backend findings

**Spec:** Enumerate every engine in `mcp-server/src/engines/` matching the regex `SpecificCuttingEnergy|SpeedFeed|CuttingForce|Kienzle`. For each engine produce a row using the universal schema above. Specifically verify:
- (a) **Non-stub implementation** — body returns a computed value, not `0` / `null` / `throw new Error('TODO')`. Use the same `always-build-guard.mjs` heuristic the Stop hook uses for build discipline.
- (b) **Dispatcher wiring** — engine is referenced in `prism_calc` dispatcher (`mcp-server/src/tools/dispatchers/calcDispatcher.ts` and/or `camDispatcher.ts`). Use `prism_session:action_search` first; fall back to `rtk grep -l <EngineName> mcp-server/src/tools/dispatchers/` only if the dispatcher index is stale.
- (c) **Test coverage** — at least one `<EngineName>.test.ts` file asserts a non-trivial numeric output (not just `expect(result).toBeDefined()`).
- (d) **Cross-check recent fix** — commit `9386a4e88 [U-WIRE-CALC-SCE]` wired `SpecificCuttingEnergyEngine` into `prism_calc`; that wiring MUST appear in this audit. If it doesn't, the audit's grep regex or dispatcher resolution is broken.

**Acceptance (evidence-grounded, beyond universal):**
1. Audit JSON written to `state/shared/audit-findings/revenue-roadmap/round3-audit-sfc.json` per schema.
2. Every SFC-family engine has either `dispatcher_actions > 0` OR an explicit `WIRE-EXEMPT:<ref>` tag with wrapper reference.
3. Stubs flagged by severity: `high` if it's the canonical SFC engine (e.g. `SpecificCuttingEnergyEngine`); `low` if a deprecated variant.
4. Output cross-referenced with `BUILD_STATE.needs_wiring` — no SFC engine appears in `needs_wiring` without an entry in the audit's `gaps[]`.
5. Commit `9386a4e88` SCE wiring is visible in the audit row for `SpecificCuttingEnergyEngine` (`recent_fix_commit: "9386a4e88"`).
6. Re-run cost: `rtk vitest run -- *SpecificCuttingEnergy* && node scripts/audit-sfc-cluster.mjs` (target <2min).

---

#### U-REV-AUDIT-MASTERPOST-01 — Master Post controller-dialect coverage audit

**depends_on:** ["U-DRIFT-01", "U-DRIFT-02"]
**unit_size:** medium (≤8h)
**risk:** low
**revenue_impact:** high — Master Post is Product #2 (per-seat subscription); dialect gaps = lost customer segments
**cross-check:** round3-5/05 Master Post findings

**Spec:** ENGINE_DIGEST lists 11 Master Post engines: Lathe family (E0265-E0271), AGI variants (E0321-E0322), WEDM (E0337), Okuma B250 (E0355), Hurco V11 (E0182). For each:
- (a) **Dialect mapping** — identify target controller dialect (Fanuc / Siemens / Haas / Mazak / Mitsubishi / Sodick / Makino / AgieCharmilles / Okuma OSP / Hurco WinMax / etc.).
- (b) **JM DIE round-trip anchor** — cite at least one program file in `JM DIE/` that the engine handles (per CLAUDE.md JM Die test-shop law). If no sample exists for a dialect, flag in `gaps[]` with `severity=high` (no real-shop validation = not revenue-grade).
- (c) **Dispatcher exposure** — confirm `prism_cam` or `camDispatcher` has a `generate_post`-class action that routes to this engine. Use `prism_session:dispatcher_map_compact` to enumerate.
- (d) **Dialect gap list** — every controller in `ShopConfigurationEngine`'s 21-machine fleet must have either an engine OR a justified deferral row.

**Acceptance (evidence-grounded, beyond universal):**
1. Audit JSON written to `state/shared/audit-findings/revenue-roadmap/round3-audit-masterpost.json` per schema, with all 11+ engines enumerated.
2. Every row has a `jm_die_sample_path: "JM DIE/.../*.MIN"` (or `.f3d`/`.SLDPRT`/`.ipt`/`.iam` per CLAUDE.md JM Die program-save-practice memory) proving real-shop round-trip.
3. Dialect-gap list explicit: every shop-controller × machine-family pair has a coverage verdict.
4. For at least one dialect with `frontend_exposed=false`, a follow-up wiring task filed in `BUILD_STATE.needs_frontend` with `priority=revenue` tag.
5. Cross-check round3-5/05 findings — if round3-5/05 flagged a dialect gap, this audit's `gaps[]` must contain the matching row OR cite contradiction with evidence.
6. Re-run cost: `node scripts/audit-masterpost-cluster.mjs && rtk grep -l "Master Post\|MasterPost" mcp-server/src/tools/dispatchers/` (target <3min).

---

#### U-REV-AUDIT-CAM-BRIDGE-01 — Six tier-1 CAM-bridge audit

**depends_on:** ["U-DRIFT-01", "U-DRIFT-02"]
**unit_size:** medium (≤8h)
**risk:** low
**revenue_impact:** very high — each bridge is a sellable integration channel; CAM-vendor add-ins are the customer-discovery pipeline
**cross-check:** `cowork-connectors` skill ground-truth + ENGINE_DIGEST search for `*BridgeEngine`

**Spec:** Six external CAM systems: **Fusion 360, hyperMILL, Mastercam, ESPRIT, Inventor HSM, SolidWorks CAM**. For each:
- (a) **Bridge engine exists** — search ENGINE_DIGEST for `*BridgeEngine` / `*ConnectEngine` / `*HostEngine` matching the vendor. Use `prism_session:tool_route_best` for the search; fall back to `rtk grep -l "FusionBridge\|HyperMILLBridge\|MastercamBridge\|EspritBridge\|InventorHSMBridge\|SolidWorksCAMBridge" mcp-server/data/docs/ENGINE_DIGEST.md` if needed.
- (b) **Dispatcher-wired** — vendor-specific action in `prism_cam` (e.g. `prism_cam:fusion_send_post`) or dedicated vendor dispatcher (e.g. `prism_fusion`, `prism_hypermill`).
- (c) **Smoke test** — at least one E2E test path documents a real add-in handshake (HTTP for Fusion in-host runner, file-watch for hyperMILL Project Manager, COM/.NET for Mastercam C-Hook, etc.).
- (d) **Shipped surface** — is the add-in/plugin discoverable (CAM-vendor extension store entry, `mcp-server/web/cam-bridges/<vendor>/`, signed installer in `dist/`, etc.)?

**Acceptance (evidence-grounded, beyond universal):**
1. Audit JSON written to `state/shared/audit-findings/revenue-roadmap/round3-audit-cam-bridges.json` with six rows (one per vendor).
2. Each existing bridge row has one E2E smoke-test path documented + `ci_runnable: true|false` flag (Fusion 360 in-host runner won't be CI-runnable on Linux runners — that's a documented limitation, not a failure).
3. Each missing bridge has a one-paragraph `build_plan` field: target engine name, dispatcher action shape, minimum add-in surface (panel-only? full menu? toolbar?), estimated effort.
4. **Cowork-connectors cross-check:** if `cowork-connectors` skill lists a bridge but `src/engines/` has no matching `*BridgeEngine`, that's documentation drift → filed as `gaps[]` row with `severity=high` (skill lies about capability).
5. Vendor priority ordering matches `cowork-connectors` skill order — Fusion 360 first (live add-in panel exists per spec L31), hyperMILL second (production, 63 engines), then the four needing UI shells.
6. Re-run cost: `node scripts/audit-cam-bridges.mjs && grep "Bridge" mcp-server/data/docs/ENGINE_DIGEST.md` (target <2min).

---

#### U-REV-AUDIT-SYNTHESIS-01 — Synthesis report feeding REVENUE-MS1 billing gates

**depends_on:** ["U-REV-AUDIT-SFC-01", "U-REV-AUDIT-MASTERPOST-01", "U-REV-AUDIT-CAM-BRIDGE-01"]
**unit_size:** small (≤4h — synthesis only, no new audit)
**risk:** low
**revenue_impact:** critical — direct input to REVENUE-MS1 tier/billing gate design

**Spec:** Combine the three audit JSONs above into a single human-readable markdown report at `state/shared/audit-findings/revenue-roadmap/round3-revenue-cluster-gaps.md`. For each cluster (SFC, Master Post, CAM bridges), list:
- (a) **Ships TODAY at revenue grade** — dispatcher-wired + frontend-reachable + billable-able (subscription-gate-compatible).
- (b) **Engine-only** — implementation exists but needs wiring or frontend before billable.
- (c) **Missing entirely** — no engine, no plan, gap-to-build.

This report becomes the **input contract** for REVENUE-MS1 billing/tier gating. You cannot gate what does not exist as a complete revenue surface — MS1 needs the bucket-(a) list to know what to charge for, the bucket-(b) list to know what's coming, and the bucket-(c) list to deprioritize.

**Acceptance (evidence-grounded, beyond universal):**
1. Single markdown report with three cluster sections (SFC, Master Post, CAM bridges).
2. Each cluster has a `{ships, needs_wiring, missing}` count tally that **sums to the input audit JSON row count** (no rows lost or invented in synthesis).
3. Report cites `BUILD_STATE.json` blocks and `ENGINE_DIGEST.md` rows by line/row — every numeric claim is auditable; no fabricated counts (round3/06 explicitly rejected the 613 fabrication, this synthesis must not reintroduce that class of error).
4. Filed under `state/shared/audit-findings/revenue-roadmap/round3-revenue-cluster-gaps.md`, available for round-4 cross-validation by another agent and for REVENUE-MS1 consumption.
5. Synthesis includes a **"recommended MS1 tier matrix"** section mapping each ships-today capability to a proposed tier (free / hobbyist / pro / shop / enterprise per spec §REVENUE-MS1) — gives MS1 a head start.
6. Re-run cost: `node scripts/synthesize-revenue-cluster-audit.mjs` (target <30s — pure JSON-to-markdown transform).

---

## Unit count summary

| Milestone | Old unit count | New unit count | Delta |
|---|---|---|---|
| REVENUE-MS4 (original, drift-cluster premise) | 10 (U-DRIFT-01..10) | 2 required + 1 optional (U-DRIFT-01, -02, -03) | -7 to -8 |
| REVENUE-SUPPORT-AUDIT-MS5 (NEW — surfaces conflated audit work) | 0 (didn't exist) | 4 (U-REV-AUDIT-SFC-01, -MASTERPOST-01, -CAM-BRIDGE-01, -SYNTHESIS-01) | +4 |
| **Combined total** | **10** | **6 required + 1 optional = 6-7** | **-3 to -4** |

**Net effect:** -3 to -4 total units; **but** the new units are evidence-grounded (ENGINE_DIGEST + BUILD_STATE cited row-by-row) rather than envelope-grounded (a false 613-drift count). Quality of deliverables is dramatically higher per unit. No autonomous envelope mutation anywhere. Premise of every unit is direct evidence, not derived from a stale count.

---

## Boundaries and what this revision does NOT do

- Does **NOT** mutate envelopes autonomously — every flip needs human `--apply` per `envelope-sync.md` L80.
- Does **NOT** assume 613 drifted milestones — round-2 F-r2-a7-1 proved drift=2 and round-3/06 adopted that fix.
- Does **NOT** conflate envelope hygiene with revenue-grade capability audit — MS4 is hygiene only; MS5 is the audit.
- Does **NOT** invent counts — every count in audit deliverables must trace to a file row, commit sha, or dispatcher action enum entry.
- Does **NOT** depend on peer-chat-owned surfaces (dispatcher plumbing, infra, neural training, system-viz internals — per spec L327-L339).

---

# v7.B v2 — Revised Combinatoric Algorithm Surface (Round-4 Spec Revision)

> **Status:** REPLACES original v7.B in `REVENUE-ROADMAP-2026-05-10.md`. Round-3 forensic deep-dive (`round3/05-v7b-physics-replacements.json`) identified 23 net-new engines, 27 existing engines reused, and 4 rows reframed as RULES/DATA-SURFACES (not equations). Findings F-r3-a5-A through F-r3-a5-E codified below.
> **Authority chain:** Round-2 F-r2-a8-A (combinatoric ≠ orthogonal) → Round-3/05 (forensic physics) → Round-4/06 (THIS DOC). Source equations cross-checked against Stephenson & Agapiou *Metal Cutting Theory & Practice*, Altintas *Manufacturing Automation*, Shaw *Metal Cutting Principles*, Tlusty *Manufacturing Processes & Equipment*.
> **Constants:** All Kienzle kc1.1, Taylor n, J-C coefficients sourced from `mcp-server/src/physics/constants.ts` (canonical single source).
> **Doctrine:** Every NEW engine listed passes `duplicationGuardEngine.mustCheckBeforeCreating()` before build. Every engine wires to `prism_calc` / `prism_safety` / `prism_cam` / `prism_ai` per MCP dispatcher surface.

---

## The 50-Row Table (revised equations + engines + axes + claims)

| # | Pair | Verified equation | Engine to call | Variability axis | Customer claim |
|---|------|-------------------|----------------|------------------|-----------------|
| 1 | Kienzle × Taylor → economic speed | Gilbert: `V* = C / [((1-n)/n)·(t_ct + C_t/C_m)]^n` with Kienzle Fc-power validation | EXISTING TaylorEngine + KienzleEngine; **NEW GilbertEconomicSpeedEngine** | machine-rate / tool-cost ratio (shop-economic) | Cut at min-cost or min-time speed validated by Kienzle power check (Stephenson-Agapiou §11.3) |
| 2 | BeamDeflection × Kienzle → max ap | Iterative fixed-point: guess ap → Fc = kc1.1·b·h^(1-mc) → δ = FcL³/(3EI) → update ap | EXISTING DeflectionOverlayEngine (E0127) via `prism_calc:max_ap_deflection_limited` | tool L/D stickout ratio | Maximum depth your stickout holds to ±0.0005 in deflection; converges 3–5 iters |
| 3 | ChatterStability × Kienzle → SLD | Altintas: `ap_lim(ω) = −1/(2·Kf·Re[Φ_oriented(jω)])`, Kf = kc1.1 (N/mm² per mm width), N = 60ω/(N_z·(2πk+ε)) | EXISTING ChatterStabilityEngine + KienzleEngine via `prism_cam:sld_altintas` | modal FRF (machine-specific tap test) | Stable depths at every spindle speed from YOUR tap test |
| 4 | ToolWear-VB × Taylor → RUL | Bridge: T_total from Taylor V·T^n=C; f=VB_now/VB_lim; RUL=T_total·(1−f). Usui dVB/dt=A·V^a·f^b·exp(−B/T) for off-nominal | EXISTING TaylorEngine + **NEW UsuiWearRateEngine** | observed VB (tool-condition) | Replace-now or run-N-more decision with measured VB |
| 5 | ChipThickness × Kienzle → chip-thinning | Sandvik avg: `h_m = (180/π·a_e/D)·f_z·sin(κ)` for a_e<D/2; kc(h_m)=kc1.1·h_m^(−mc) | EXISTING KienzleEngine + ChipThicknessEngine | radial engagement a_e/D | Chip-thinned feed up to 2.5× for HSM low-a_e paths |
| 6 | Johnson-Cook × Thermal → HSM force | (1) `σ̄ = [A+B·ε̄^n][1+C·ln(ε̄̇/ε̄̇₀)][1−((T−T_r)/(T_m−T_r))^m]`; (2) Merchant `Fc = σ̄·b·h·cos(β−α)/[sin(φ)cos(φ+β−α)]`, φ=π/4−(β−α)/2 | **NEW JohnsonCookEngine + NEW MerchantForceEngine** + EXISTING ThermalEngine via `prism_calc:fc_temperature_corrected` | strain-rate / temperature regime (HSM Ti/Inco) | Force prediction valid for HSM where Kienzle under-predicts 15–40% |
| 7 | Surface roughness × feed/nose → Ra | Brammertz: `Ra_total = Ra_geo + Ra_min`; Ra_geo = f²/(32·r_ε); Ra_min = h_min/2·(1+r_ε/(2·h_min)), h_min ≈ 0.3·r_β | **NEW BrammertzRoughnessEngine** via `prism_calc:ra_predict` | edge-radius regime (sharp vs honed) | Ra within ±15% even at low fz where geometric formula fails |
| 8 | MRR × power → power-limited feed | `F = (η·P_spindle·60·1000)/(kc·ap·ae)`, kc = kc1.1·h_m^(−mc), η = 0.75–0.90 | EXISTING MRREngine + SpindlePowerEngine + KienzleEngine via `prism_calc:feed_power_limited` | spindle-torque curve regime (CT vs CP) | Max feed without spindle-overload alarm |
| 9 | CycleTime polynomial × constraints | **Non-convex MINLP** — Simulated Annealing (Metropolis, β=0.95) OR NSGA-II GA; report best-found ± stderr over 30 restarts | **NEW SimulatedAnnealingEngine + NEW GeneticAlgorithmEngine** via `prism_ai:cycle_optimize` | objective weighting (cost/time/quality) | 10–25% cycle reduction vs baseline (honest non-optimality) |
| 10 | Conformal × residuals → PI | **Split-Conformal Quantile Regression (CQR, Romano 2019)**: fit q̂_lo, q̂_hi; E_i = max(q̂_lo−y, y−q̂_hi); PI asymmetric, locally adaptive, 1−α coverage | EXISTING ConformalCalibrationEngine (CQR variant from NN-CONFORMAL03 merge) | heteroscedasticity regime | Tight intervals where confident, wide where uncertain — 30–60% narrower than fixed ±10% |
| 11 | Z3 × ToleranceStack → constraints | Two-tier: (i) Z3 symbolic feasibility, (ii) MIP (CBC/Gurobi) numeric cost-minimization. WC = arithmetic sum; RSS = root-sum-square | EXISTING Z3Engine + **NEW MIPSolverEngine** | stack-up method (WC / RSS / MC) | Loosen tolerances where math proves safe — 10–30% inspection reduction |
| 12 | FEA-mesh × J-C → residual stress | Capello reduced-order: `σ_res = α·E·ΔT − β·σ_y` from Loewen-Shaw ΔT; full FEA bridge for thermomechanical coupling | **NEW ResidualStressEngine** + EXISTING ThermalEngine | process- vs design-induced stress | Predict warp/distortion on thin-wall before cutting |
| 13 | Vibration FRF × Chatter → tap-test SLD | Multi-mode modal extraction: identify peaks → fit (f_n, ζ, k_modal) per mode → H(jω) = Σ 1/(k_i(1−r_i²+2jζ_i·r_i)) | EXISTING ChatterStabilityEngine + ModalAnalysisEngine | modal density (# of SLD lobes) | SLD lobes from YOUR machine's tap test, not generic library |
| 14 | MRR × heat-balance → thermal load | Loewen-Shaw partition: `R_chip ≈ 0.85–0.95`, R_tool ≈ 0.02–0.10, R_wp = 1−R_chip−R_tool; T_chip = T_amb + R_chip·kc/(ρ·c) | EXISTING ThermalEngine (verify Loewen-Shaw partition) | heat partition fraction (k-dependent) | Coolant on/MQL/dry decision with quantified ΔT |
| 15 | Tool-life Weibull × Taylor → RUL | R(T) = exp(−(T/η)^β), η ≈ Taylor-T, β shape; E[RUL\|T>t] = η·Γ(1+1/β)·(1−F(t))/R(t); Bayesian β update | EXISTING TaylorEngine + **NEW WeibullReliabilityEngine** via `prism_calc:rul_weibull` | sister-tool population variance | Probabilistic life: 90% chance N more parts (not deterministic) |
| 16 | Edge geometry × J-C → micro-force | Slip-line: `Fc = σ̄·b·h_eff`, h_eff = max(h, h_min), h_min = r_β·(1−sin(α_eff)), α_eff = α − arcsin(r_β/(r_β+h)) | **NEW MicroGeometryForceEngine** | edge-honing regime (<5μm vs 20–60μm) | Predict force in finishing where h/r_β<1 |
| 17 | BUE-onset × thermal → speed-feed window | Trent diagram: BUE when T_chip ∈ [T_BUE_lo, T_BUE_hi] (~200–600°C steel); T_chip = T_amb + R_chip·kc/(ρ·c) | **NEW BUEAvoidanceEngine** + EXISTING ThermalEngine | material BUE-T window (lookup) | Pick V to dodge BUE zone — finish guarantee |
| 18 | Coolant-pressure × evacuation → drill depth | Mass balance: `V_coolant·A_flute > MRR·ρ_chip/ρ_coolant`; d_peck = min(3D, V_coolant·t_dwell/MRR); HPC≥70bar enables full-depth | **NEW CoolantEvacuationEngine** | coolant-pressure tier (flood/TC/HPC) | Peck-cycle elimination above threshold — 30–50% deep-hole reduction |
| 19 | Workholding × Chatter → fixture-SLD | Compliance sum: `1/k_total(ω) = 1/k_spindle + 1/k_tool + 1/k_part + 1/k_fixture`; weakest link dominates | EXISTING ChatterStabilityEngine + WorkholdingEngine | weakest-compliance contributor | Identify whether tool/part/fixture is chatter limiter |
| 20 | 5ax kinematics × MRR → effective MRR | `MRR_eff(t) = a_e(t)·a_p(t)·v_f_proj(t)`, v_f_proj = ‖(v_x,v_y,v_z) − ω×r‖; FK Jacobian J(q)·q̇ | EXISTING Multi5AxisKinematicsEngine + MRREngine | 5ax config (TT/HH/mixed) + tool length | True MRR with rotary-axis — eliminates "feed mystery" on 5ax |
| 21 | Setup-error × ToleranceStack → first-part P(in-spec) | Cpk = min((USL−μ)/3σ, (μ−LSL)/3σ); σ_total = √(σ_setup² + σ_process²) | EXISTING CpkEngine + ToleranceStackEngine + SetupErrorEngine | first-part vs steady-state (warm-up) | P(first part in-spec) quantified scrap-risk |
| 22 | Insert-grade × material → cutting-data | **RULE not EQUATION**: catalog lookup → physics validation gate (Kienzle Fc<Fc_max, Taylor T>T_min) | EXISTING ToolCatalogEngine + KienzleEngine + TaylorEngine via `prism_calc:validate_recommended_data` | catalog vs physics-allowed | Catalog values verified against YOUR stickout/spindle/HP |
| 23 | Probing × ToleranceStack → measurement-U | GUM (ISO/IEC Guide 98): `u_combined = √(σ_probe² + σ_calib² + σ_thermal²)`; compare to tol/4 | EXISTING ProbingEngine + **NEW MeasurementUncertaintyEngine** | metrology-U regime (probe A/B/C) | Trust probe or re-measure — quantified U_95 |
| 24 | Spindle-thermal × ToleranceStack → drift comp | `ΔL = α·L·ΔT`; spindle: `ΔZ(t) = ΔZ_∞·(1−exp(−t/τ))`, τ≈30–90 min | EXISTING ThermalEngine + **NEW SpindleGrowthEngine** | warm-up τ (machine-specific) | Auto-probe-and-comp when drift exceeds spec |
| 25 | Material-DB × Kienzle → kc1.1/mc | **DATA SURFACE not EQUATION**: ISO P/M/K/N/S/H → kc1.1 {1800,2100,1100,700,2800,3200} MPa, mc {0.25,0.25,0.22,0.20,0.30,0.30} from `constants.ts` | EXISTING MaterialDatabaseEngine + KienzleEngine | ISO-group bucket (deterministic) | Constants from canonical PRISM table — zero magic numbers |
| 26 | WEDM-feasibility × physics → go/no-go | **RULE not EQUATION**: decision tree — conductivity>0.1 S/m, t/d_wire<200, kerf_R≥wire_r+0.02mm, taper≤15°; output GO/CONDITIONAL/NO-GO + binding constraint | EXISTING WEDMFeasibilityEngine (reframe outputs as rule-fired audit-trail) | binding-constraint regime | Why-it-fails answer in 4 dimensions, not yes/no |
| 27 | WEDM-flushing × spark → cut speed | `MRR_WEDM = α·U·I·t_on·η_flush`, η_flush ∈ [0.5,1.0] gates on Q_flow≥Q_c = k·MRR/h; v_cut = MRR/(h·kerf) (Kuriachen-Mathew) | EXISTING WEDMFlushingEngine + WEDMSparkEnergyEngine via `prism_calc:wedm_cut_speed` | flushing-pressure regime | Cut-speed vs flushing trade — find sweet spot |
| 28 | WEDM-tension × deflection → corner accuracy | Catenary: `δ = (F_lat·L²)/(8·T_wire)`; corner overcut Δr = δ_wire; compensate via trim-cycles or v-reduce | EXISTING WEDMWireDeflectionEngine (E0554) | tension setting (40–80% break load) | Corner-accuracy improvement quantified Δr |
| 29 | Lathe-CSS × Diameter → RPM ramp | `N = 1000·V/(π·D)` clamped at N_max; D_clamp = 1000·V/(π·N_max); below D_clamp, V drops | EXISTING TurningEngine (verify clamp behavior) | spindle regime (CSS-active vs N_max-clamp) | Honest V at small D where machine can't maintain CSS |
| 30 | Lathe-thread × passes → multi-pass | Constant-load (k=0.5): `Δd_n = d_total·(√n − √(n−1))/√N`; constant-depth: Δd_n = d_total/N; modified flank for unilateral chip | EXISTING LatheThreadingEngine | thread-class + material | Thread-form to spec — Class 3A holds, Class 2A optimizes cycle |
| 31 | Drill-cycle × force/torque → peck | `M = kc·D²/8·f_per_rev·sin(point/2)`, Fz = kc·D·f/2; peck if M>M_max OR row-18 violation OR L/D>5 | EXISTING DrillCycleEngine + KienzleEngine | L/D regime (shallow/deep/extreme) | Peck-cycle elimination where physics allows |
| 32 | Rigid-tap × spindle-sync → fault-free | `v_z = N·pitch`; safe `N_max_tap = √(α_max·z_safe/(2π))` from spindle-accel limit | EXISTING TappingEngine (expose accel-limited N_max) | rigid vs floating-holder | Max tap RPM before sync-loss alarm |
| 33 | Mill-engagement × Chatter → lobe shift | Engagement-dependent directional factor: φ_st→φ_ex average shifts down-milling lobes ~10% vs full-immersion; Altintas time-domain or zeroth-order freq method | EXISTING ChatterStabilityEngine (verify engagement-aware mode) | radial engagement (HSM vs conv) | Different stable-RPM zones for HSM vs conventional — both leveraged |
| 34 | Adaptive-feed × spindle-load → constant load | PI: `f_new = f_nom + Kp·(P_tgt−P_act) + Ki·∫(P_tgt−P_act)dt`; saturate at f_max/f_min | EXISTING AdaptiveControlEngine + SpindlePowerEngine | load-variation (cast/forged vs uniform) | Constant-load = consistent finish + 15–25% cycle reduction on variable stock |
| 35 | Tool-deflection × surface → wall-straightness | Walled-cut: `δ(z) = Fc(z)·z²·(3L−z)/(6EI)`; finish: Fc≈const, δ_max at tip; pre-bias toolpath | EXISTING DeflectionOverlayEngine (E0127) — wall-profile output | tool L/D + wall-height | Wall-straightness with toolpath pre-bias = first-part-in-spec |
| 36 | ML-feedforward × empirical → kc-residual | Residual: `kc_actual = kc_Kienzle·(1+δ(V,f,coolant,grade))` with conformal-uncertainty on δ; reject OOD | EXISTING MLPipelineEngine + ConformalCalibrationEngine + KienzleEngine | in-dist vs OOD regime | Personalized kc for YOUR shop — beats generic Kienzle 10–20% |
| 37 | Coolant-MQL × thermal → selector | `T_chip_steady = T_amb + Q_cut/(h_conv·A·η_coolant)`; MQL η≈0.3, flood η≈0.7; dry if T_chip_dry<T_BUE_hi | EXISTING ThermalEngine + **NEW CoolantSelectorEngine** | thermal regime (cool/hot cut) | Quantified MQL/flood ROI vs dry per material |
| 38 | Cycle-drift × SPC → shift detect | **CUSUM**: `S_h_n = max(0, S_h_{n-1} + (x_n − μ₀ − k))`, alarm S_h>h; k=δ/2, h=4; ARL₁<10 on 1σ shift. EWMA: z_n = λx_n + (1−λ)z_{n-1} for smooth filter | EXISTING SPCEngine + **NEW CUSUMEngine** variant (verify if SPCEngine already supports CUSUM/EWMA) | shift-magnitude (small drift vs step) | Detect 1σ drift in 8 parts vs 50 with Shewhart |
| 39 | RUL × maintenance-cost → replace-trigger | `E[cost_continue] = P(fail\|t)·(cost_scrap+cost_unplanned) + (1−P(fail\|t))·cost_normal` vs cost_planned; replace at α-quantile of T | EXISTING ToolWearEngine + WeibullReliabilityEngine | risk-tolerance regime (prod pressure vs scrap cost) | Optimal replace-vs-run under YOUR cost structure |
| 40 | Setup-time × Markov-shop → throughput | M/G/1: `ρ=λ/μ`, `W_q = ρ·E[S²]/(2(1−ρ))`; E[S]=t_setup_mean+t_run_mean; multi-machine = Jackson network | **NEW QueueingShopEngine** + SchedulerEngine | shop-load (ρ<0.7 / >0.85 / overload) | Realistic throughput w/ queue waiting — not best-case sum |
| 41 | EOQ × demand-variability → reorder | **(s, S) policy** for stochastic D: reorder<s, order-up-to S; `s = E[D_LT] + z_α·σ_LT`, S = s + EOQ; Croston's for lumpy | **NEW InventoryPolicyEngine** via `prism_calc:reorder_point` | demand-variability (smooth/intermittent/lumpy) | Service-level met without overstock — quantified stockout P |
| 42 | Energy-cost × kc → $/part | `E_part = (kc·MRR·t_cut)/η_machine + P_idle·t_total`; η_machine ≈ 0.6–0.8; idle ~40% total | EXISTING EnergyEngine + KienzleEngine (verify P_idle included) | idle-power regime (lights-out vs staffed) | True energy $/part incl idle — lights-out opportunity |
| 43 | Pareto × cost/time/quality → frontier | NSGA-II (Deb 2002): population evolution under non-dominated sort + crowding; 50–200 generations; 3D scatter visualization | EXISTING GeneticAlgorithmEngine (multi-objective mode) OR **NEW NSGA2Engine** | objective-weighting (customer preference) | All reasonable trade-offs shown — customer picks operating point |
| 44 | Probabilistic-tolerance × MC → yield | Monte Carlo N=10⁴: sample N(μ_i, σ_i²) per contribution, check all SL; quasi-MC (Sobol) for 10–100× variance reduction | EXISTING MonteCarloEngine + ToleranceStackEngine | tolerance-correlation (indep vs corr) | Realistic yield % incl all feature interactions |
| 45 | GD&T-callout × inspection → CMM-routine | **RULE not EQUATION**: position→4 datum-targets+N pts (Hopp); profile→7+ pts/feature; runout→360° scan min 6 stations; `n* = (z·σ/Δ)²` | EXISTING ProbingEngine + **NEW InspectionPlanEngine** | GD&T-feature-type | CMM-routine auto-generated from print, stat-valid |
| 46 | First-article × Cpk → ramp | Cpk>1.33 gate + Bayesian PI lower-bound: `P(true Cpk≥1.33 \| observed) > 95%` before ramp; need n≥30 for tight estimate | EXISTING CpkEngine (Bayesian-CI mode) | sample-size confidence | Statistical confidence in Cpk before ramp — not just point estimate |
| 47 | Setup-sheet × kinematics → safe G-code | FK envelope check: per block compute tool+holder+spindle pos, intersect machine envelope polytope; collision vs fixture mesh | EXISTING KinematicsEngine + CollisionDetectionEngine | machine-envelope (machine-specific) | Pre-flight G-code check — catch travel/collision before crash |
| 48 | Operator-skill × variance → human factor | Wright learning curve: `t_n = t_1·n^(log₂(LR))`, LR ∈ [0.7, 0.95]; asymptote t_∞ ≈ t_predicted·(1+δ_machine); per-operator LR from history | **NEW OperatorLearningCurveEngine** | operator-experience regime | Realistic cycle for THIS operator, not theoretical robot |
| 49 | Energy-monitoring × baseline → anomaly | Isolation Forest or One-Class SVM on (V, f, ap, material); alarm when observed P falls in <1st percentile of predicted distribution | **NEW AnomalyDetectionEngine** | anomaly type (over-current/under-cut/wrong-mat) | Catch subtle process drift before scrap |
| 50 | Full-pipeline × all-models → end-to-end U | GUM: `u_y² = Σ(∂f/∂x_i)²·u(x_i)² + 2ΣΣ(∂f/∂x_i)(∂f/∂x_j)·u(x_i,x_j)`; nonlinear → MC (10⁴); coverage k=2 for 95%; identify dominant contributor | **NEW UncertaintyPropagationEngine** (orchestrates all upstream) | U-source (machine/material/model/measurement) | End-to-end U with dominant-source attribution — actionable target |

---

## 23 Net-New Engines (build list with dependencies)

| # | Engine | Rows | Dependencies | Build priority |
|---|--------|------|--------------|----------------|
| 1 | **GilbertEconomicSpeedEngine** | 1 | TaylorEngine, KienzleEngine | **P0 (top-3 row 1)** |
| 2 | **JohnsonCookEngine** | 6, 12, 16 | (none — constitutive primitive) | **P0 (top-3 row 6)** |
| 3 | **MerchantForceEngine** | 6 | JohnsonCookEngine | **P0 (top-3 row 6)** |
| 4 | **UsuiWearRateEngine** | 4 | TaylorEngine, ThermalEngine | P1 |
| 5 | **BrammertzRoughnessEngine** | 7 | (none) | P1 |
| 6 | **SimulatedAnnealingEngine** | 9 | (none — generic optimizer) | P1 |
| 7 | **GeneticAlgorithmEngine** | 9, 43 | (none — generic optimizer) | P1 |
| 8 | **MIPSolverEngine** | 11 | Z3Engine | P2 |
| 9 | **ResidualStressEngine** | 12 | ThermalEngine | P2 |
| 10 | **WeibullReliabilityEngine** | 15, 39 | TaylorEngine | P1 |
| 11 | **MicroGeometryForceEngine** | 16 | JohnsonCookEngine | P2 |
| 12 | **BUEAvoidanceEngine** | 17 | ThermalEngine | P2 |
| 13 | **CoolantEvacuationEngine** | 18 | (none) | P1 |
| 14 | **MeasurementUncertaintyEngine** | 23 | ProbingEngine | P2 |
| 15 | **SpindleGrowthEngine** | 24 | ThermalEngine | P2 |
| 16 | **CoolantSelectorEngine** | 37 | ThermalEngine | P2 |
| 17 | **CUSUMEngine** | 38 | SPCEngine (or extend SPCEngine if mode-capable — VERIFY first) | P1 |
| 18 | **QueueingShopEngine** | 40 | (none) | P2 |
| 19 | **InventoryPolicyEngine** | 41 | (none) | P1 |
| 20 | **InspectionPlanEngine** | 45 | ProbingEngine | P2 |
| 21 | **OperatorLearningCurveEngine** | 48 | (none) | P2 |
| 22 | **AnomalyDetectionEngine** | 49 | (none — ships sklearn-equivalent IF/OC-SVM) | P2 |
| 23 | **UncertaintyPropagationEngine** | 50 | MonteCarloEngine + all upstream | P2 (orchestrator — build last) |

**Build dependency order (topological):**
1. **Tier-0 (no deps):** JohnsonCookEngine, BrammertzRoughnessEngine, SimulatedAnnealingEngine, GeneticAlgorithmEngine, CoolantEvacuationEngine, QueueingShopEngine, InventoryPolicyEngine, OperatorLearningCurveEngine, AnomalyDetectionEngine
2. **Tier-1 (deps on Tier-0 + existing):** GilbertEconomicSpeedEngine, MerchantForceEngine, UsuiWearRateEngine, MIPSolverEngine, ResidualStressEngine, WeibullReliabilityEngine, MicroGeometryForceEngine, BUEAvoidanceEngine, MeasurementUncertaintyEngine, SpindleGrowthEngine, CoolantSelectorEngine, CUSUMEngine, InspectionPlanEngine
3. **Tier-2 (orchestrator):** UncertaintyPropagationEngine

---

## Top-3 Highest-Value Rows (unlock ~60% of v7.B value)

### Row 1 — Gilbert Economic Cutting Speed (P0)
**Why:** Every customer asks "what speed should I run?" — Gilbert is the textbook answer combining tool life (Taylor) with shop economics (machine rate, tool cost, changeover time). Replaces the *dimensionally broken* `V* = (C/Kc^0.5)^(1/n)` claim in original v7.B. Stephenson-Agapiou §11.3 canonical.
**Engine:** NEW GilbertEconomicSpeedEngine = thin composer over EXISTING TaylorEngine + KienzleEngine.
**Build cost:** ~1 day (just composition + Kienzle-power validation gate).
**Customer claim:** "Min-cost or min-time speed validated by power check — defensible because Gilbert is the textbook canonical."

### Row 2 — Iterative Max-Depth Under Deflection (P0, ZERO new engines)
**Why:** Every long-tool job hits deflection limit; iterating ap to δ_target is universally needed. ALREADY IMPLEMENTED in EXISTING DeflectionOverlayEngine (E0127); just needs `prism_calc:max_ap_deflection_limited` wire-up.
**Engine:** EXISTING DeflectionOverlayEngine (E0127) — wire only.
**Build cost:** ~0.5 day (dispatcher action wire + tests).
**Customer claim:** "Maximum depth your specific stickout holds to ±0.0005 in deflection — converges in 3–5 iterations" (validated by Round-2 F-r2-a8-B).

### Row 6 — Johnson-Cook + Merchant for HSM Force (P0)
**Why:** Original v7.B claim `Fc = JC_flow_stress · b · h` is a **category error** (J-C yields σ_flow in Pa, not Fc in N). Real path is J-C → σ̄ → Merchant geometry → Fc. Unlocks Ti/Inconel/HSM regime where Kienzle under-predicts 15–40%. This is the highest *technical credibility* fix — without it, the v7.B HSM claims are physics-incoherent.
**Engines:** NEW JohnsonCookEngine + NEW MerchantForceEngine + EXISTING ThermalEngine.
**Build cost:** ~3 days (J-C constants table per material from `constants.ts` extension; Merchant geometry calc; thermal coupling).
**Customer claim:** "Force prediction valid for HSM/Ti/Inconel where empirical Kienzle under-predicts 15–40% — replaces 'good for steel only' caveat with physics-grounded high-strain-rate model."

---

## Rewrite Summary

- **Rows rewritten:** 50 / 50 (all)
- **Engines newly built:** 23
- **Engines reused (existing):** 27
- **Rows reframed as RULES/DATA-SURFACES:** 4 (rows 22, 25, 26, 45)
- **Findings codified:** F-r3-a5-A (BLOCKER), F-r3-a5-B/C/D (MAJOR), F-r3-a5-E (MINOR)
- **Customer-claim integrity:** No row claims "physics-derived" for what is actually a rule/lookup. Non-convex problems disclose "best-found ± stderr over 30 restarts", not "optimal".
- **Doctrine compliance:** Every new engine flows through `duplicationGuardEngine.mustCheckBeforeCreating()`; every action wires to `prism_calc` / `prism_safety` / `prism_cam` / `prism_ai` per MCP dispatcher surface; constants sourced from `mcp-server/src/physics/constants.ts` only.

**One-line:** v7.B reborn — Gilbert replaces broken V*-from-Kc; iterate ap via existing DeflectionOverlay; J-C+Merchant replaces flow-stress=force category error; 23 new engines, 27 existing reused, 4 reframed as rules.

---

# v7.C v2 — AI Orchestration Plan (Grounded)

**Revision context:** Round-3/09 corrected stale Round-2 evidence. `z3-solver ^4.16.0`, `@qdrant/js-client-rest ^1.17.0`, `@xenova/transformers ^2.17.2`, and `ollama ^0.6.3` are ALL already declared in `mcp-server/package.json`. Net new dependencies for the entire T3/T6/T7 grounding plan = **0**. The remediation surface is engine-creation + wiring + weights training, not procurement.

This section supersedes v7.C in the original spec. The 7-tier template stands; what changes is each tier now has a concrete, verifiable, grounded implementation path with explicit fallback semantics.

---

## Tier definitions (concrete grounding)

### T1 — Claude orchestrator (tautological, real)

Claude itself is T1. Every revenue-roadmap unit that invokes the AI stack flows through Claude as the synthesis + final go/no-go layer. Implementation: this chat. No engine to ship. Verification: presence of `tiers_invoked: [..., 'T1', ...]` in every MS2 envelope.

### T2 — Deep reasoning (REAL, wired)

| Action | File | Line |
|---|---|---|
| `ai_milling_deep_reason` | `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts` | 897 |
| `ai_wedm_deep_logic` | same file | 907 |
| `cot_reason_tree` | same file | 1372 |

These are production action handlers wired to chain-of-thought reasoning engines. No remediation needed; T2 already grounds.

### T3 — LoRA adapters (training plan, weights are the gap)

**Current state diagnosis:** ~80 LoRA-named engines and 9 `cam_lora_*` schemas exist. Zero `.safetensors` checkpoints live under `mcp-server/data/models/`. `LatheLoRAPipelineEngine.predict()` silently returns base-model output when adapter weights absent — no telemetry, no warning. This is the silent-failure trap caller in Round-2.

**Training plan (4 adapters, ranks by corpus size):**

| Adapter | Rank | Alpha | Corpus | Estimated samples | Justification |
|---|---|---|---|---|---|
| `mill_lora` | 16 | 32 | JM Die archive filtered to `.NC` / `.PRG` mill programs | ~8K | Largest corpus, most heterogeneous task surface (3-axis + 4-axis + 5-axis subset) — capacity needed |
| `lathe_lora` | 8 | 16 | JM Die Mazak/Okuma `.MIN` (with `$<INTERNAL>%` line-1 header per reference_jm_die_program_save_practice memory) | ~3-5K | Medium corpus, narrower task surface — rank-8 sufficient per LoRA §7.2 |
| `wedm_lora` | 4 | 8 | 26 indexed WEDM programs + 46 WEDM tribal tips + 14 formulas | ~70-100 + augmentation | Smallest corpus; rank-4 to avoid overfit (LoRA-FA low-shot finding) |
| `cam_lora` | 8 | 16 | Mastercam(45) + hyperMILL(25) extracted ops + post-CPS files; per-task ensemble (operation_classify / strategy_recommend / tool_select) | ~150 ops × 3 tasks | Per-task rank-8, ensemble at inference |

Common hyperparameters: dropout 0.1, attention-only (`q_proj`, `v_proj`) per QLoRA §4.

**Label sourcing:** XPROC-NEURAL-CONNECT outcome-bridge (shipped commit `3b21228f7` — replay/sampler outcome bridge) generates positive/negative reward signals from production runs. This connects T4 telemetry directly into T3 supervision pairs.

**Inference path:**
- Primary: Ollama 0.6.3 base `qwen2.5-coder:7b` + LoRA adapter via Modelfile `FROM` directive (native LoRA mounting since Ollama 0.3.0)
- Fallback: `@xenova/transformers` llama.cpp path when Ollama daemon unreachable
- Remote fallback: Anthropic SDK base-model (emits `lora.fallback.weights_missing` telemetry event)

**Weights storage:** `mcp-server/data/models/<domain>-lora/<YYYY-MM-DD>/adapter_model.safetensors` + `adapter_config.json`. Rank-16 7B adapter ≈ 80 MB; cap at 100 MB per adapter.

**Fallback marker (kills silent failure):**

Every LoRA inference call must return:

```ts
{
  prediction: T,
  adapter_loaded: boolean,
  adapter_version: string | null,   // YYYY-MM-DD of weight set or null
  fallback_reason?: 'weights_missing' | 'daemon_unreachable' | 'rate_limited' | 'rank_mismatch'
}
```

When `adapter_loaded === false`, telemetry event `lora.fallback.<reason>` is emitted to `AISystemRouterEngine` ledger.

**Enforcement (Stop hook):** `lora-weights-presence-check.mjs` fails CI when any LoRA engine is wired to a dispatcher but the latest `data/models/<domain>-lora/<latest>/adapter_model.safetensors` is missing. Policy: **warn-first 30 days, hard-block after.** Add to `MINIMAL_ALLOWLIST` so profile cannot disable.

**Ship order (smallest-first risk gradient):** wedm_lora rank-4 → lathe_lora rank-8 → mill_lora rank-16 → cam_lora ensemble.

### T4 — Neural / conformal (REAL, wired)

10 `xproc_conformal_*` actions + `xproc_neural_train` + `xproc_neural_predict` + APS / RAPS / Mondrian conformal variants are all live in `crossProcessDispatcher.ts`. Outcome-bridge from commit `3b21228f7` feeds calibration data. No remediation needed; T4 already grounds.

### T5 — AI router (REAL, wired)

`AISystemRouterEngine` lives at `mcp-server/src/engines/AISystemRouterEngine.ts`. Five dispatcher consumers route through it. Telemetry ledger receives all routing decisions. No remediation needed; T5 already grounds.

### T6 — Symbolic AI (WIRING-MISSING, deps installed)

**Round-3 correction (load-bearing):** `z3-solver ^4.16.0` IS already in `mcp-server/package.json` line 71. The Round-2 evidence string ("No z3-solver dependency...") was stale. The runtime is available; nothing currently imports it; no `Z3*.ts` engine file exists. **T6 is wiring-missing, not dep-missing.** Net new deps for T6 = 0.

**Three NEW engines to ship (all use the already-installed z3-solver):**

| Engine | Path | Wires to | Solves | Z3 idiom |
|---|---|---|---|---|
| `Z3ToleranceAllocatorEngine` | `mcp-server/src/engines/Z3ToleranceAllocatorEngine.ts` | `prism_calc:tolerance_allocate_z3` + `prism_cad:tolerance_stack_solve` | v7.B row 11 — min Σ cost(t_i) s.t. Σ t_i² ≤ T_assembly² (worst-case) or T_assembly²/k (RSS) | `Optimize()` with `Real('t_i')`, `add_soft` for cost objective, `add` for sum-of-squares constraint |
| `MIPSchedulingEngine` | `mcp-server/src/engines/MIPSchedulingEngine.ts` | `prism_orchestrate:schedule_mip` + `prism_intelligence:capacity_plan_mip` | v7.B row 12 — argmax Σ(margin·accept) s.t. Σ(hours·accept) ≤ capacity, accept ∈ {0,1} | `Optimize()` with `Int('accept_i')` ∈ [0,1], `maximize()` |
| `GeometricToleranceSolverEngine` | `mcp-server/src/engines/GeometricToleranceSolverEngine.ts` | `prism_cad:gdnt_solve` + `prism_safety:tolerance_feasibility` | v7.B row 39 — GD&T datum-feature constraint propagation | `BitVec` for datum frames, `Real` for tolerance zones |

**Fast-path preservation:** Keep `CrossProcessSymbolicConstraintEnforcerEngine` as the FAST PATH (lexicographic projection, no solver, <1ms). Add a **NEW** `SymbolicSolverRouterEngine` that:
- Routes safety-only projections (no objective) to the existing fast-path engine
- Escalates to Z3 only when objective function present (multi-criteria optimization)

This keeps the <1ms latency contract for safety projections while unlocking Z3 power when needed.

**Test strategy:** Vitest with `await init()` (z3-solver requires async init), property-based tests for solution-set membership via fast-check.

### T7 — Knowledge graph + creative reasoning (WIRING-MISSING, deps installed)

**Current state diagnosis:** `PRISMCreativeReasoningEngine.ts` header advertises engines/dispatchers/formulas/tribal as "Knowledge Sources" but `explore()` at line 185 dispatches via `switch(domain)` at line 665 — confirmed static dispatch on enum, not graph traversal. Line 263-265 ("cutting_parameters: ['Machinery handbook lookup', ...]") shows the "knowledge" is 10 hardcoded string arrays. This is the 10-row lookup trap caller in Round-2.

**Approach:** JSON-LD + in-memory graph + Qdrant vector similarity. Net new deps = **0** (`@qdrant/js-client-rest ^1.17.0` and `@xenova/transformers ^2.17.2` already installed).

**Why not Neo4j-embedded:** requires JVM, adds 200 MB+ runtime — rejected.
**Why not RDF/SPARQL:** heavyweight for the analogy use-case — rejected.
**JSON-LD + Qdrant:** leverages existing wiki/index.md (722 entries) as graph seed; Qdrant cosine-similarity over engine embeddings gives REAL analogy reasoning (Hofstadter-style retrieval-by-similarity) at zero new dep cost.

**Source data pipeline:**

| Step | Source |
|---|---|
| Graph seed | `H:/prism/knowledge/wiki/index.md` (722 entries: 575 engines + 90 dispatchers + 57 memories) |
| Edge extraction | Engine cross-refs already encoded in JSDoc `@see` + import statements + dispatcher wiring |
| Memory tags | `MEMORY.md` indexed memories carry domain tags — promote to graph nodes |
| Embedding | `Xenova/all-MiniLM-L6-v2` 384-dim embeddings of node descriptions |
| Vector store | Qdrant collection `prism_kg_nodes` with cosine distance |

**Query patterns (each one is a graph_* action):**

| Query | Algorithm | Action binding |
|---|---|---|
| Analogy | Given (source_node, source_solution), find target_node with `cos_sim > 0.75` AND shares ≥2 edge-type-classes with source | `prism_intelligence:graph_infer` |
| Find-similar | Top-k nearest neighbors in embedding space + edge-overlap re-rank | `prism_intelligence:graph_query` |
| Transitive-deps | BFS over import/dispatcher edges, capped at depth 3 (matches Round-1 "engines reach 1559 via 5-hop traversal") | `prism_intelligence:graph_traverse` |
| Creative-combination | Sample 2 unrelated high-centrality nodes, ask Ollama `qwen2.5-coder:7b` to synthesize hybrid approach | `prism_intelligence:graph_discover` |
| Predict | Edge-prediction via embedding-link-prediction (cos_sim × structural-similarity) | `prism_intelligence:graph_predict` |

**Engine decision (rename + new, both options simultaneously):**

1. **Rename** existing `PRISMCreativeReasoningEngine` → `PRISMRuleBasedCombinatorEngine` (preserves the 10-row dispatch logic as a fast-path; backward-compatible alias via `prism_ai:creative_explore`).
2. **Create new** `PRISMKnowledgeGraphReasoningEngine` that does real graph traversal + LLM-backed synthesis.
3. **Bind** the 5 `graph_*` actions already declared at `intelligenceDispatcher.ts:549` to the new engine; legacy `prism_ai:creative_explore` retains the renamed rule-based combinator.

This satisfies both Round-2 recommendations (rename **AND** real LLM route) in one shot.

---

## Orchestration template (unchanged from v7.C v1)

```
Claude (T1) — receive request, parse intent, select algorithm row from v7.B combinatorics
  ↓ delegates physical inference
T2 deep-reason — physical/causal step-chain (ai_milling_deep_reason / ai_wedm_deep_logic / cot_reason_tree)
  ↓ optionally calls
T3 LoRA — learned residual correction (mill_lora_predict / lathe_lora_pipeline / wedm_lora_* / cam_lora_*)
            — returns { prediction, adapter_loaded, adapter_version, fallback_reason? }
  ↓ optionally augments
T4 neural / conformal — calibrated uncertainty interval (xproc_conformal_set / APS / RAPS / Mondrian)
  ↓ orthogonally
T5 AI router — picks the best backend (aiSystemRouterEngine.route)
  ↓ orthogonally
T6 symbolic — formal solver via SymbolicSolverRouterEngine
            — fast-path (CrossProcessSymbolicConstraintEnforcer) when no objective
            — Z3 escalation (Z3ToleranceAllocator / MIPScheduling / GeometricToleranceSolver) when objective present
  ↓ orthogonally
T7 KG / creative — graph traversal via PRISMKnowledgeGraphReasoningEngine
            — analogy / find-similar / transitive-deps / creative-combination / predict
  ↓
Claude (T1) — synthesize, apply safety/omega gate, emit answer + verification channel for re-run
```

Where a combination touches **shop-floor execution**, append:

```
Safety oracle (S(x) ≥ 0.70) blocks emission if score below floor.
Omega (Ω ≥ 0.70) blocks emission if quality below floor (R, C, P, S, L).
```

Every MS2 unit declares which tiers it invokes (e.g. `tiers_invoked: [T1, T2, T4, T6]`).

---

## Gate binding (4-line Zod schema patch — the highest-leverage single change)

The Round-2 finding F-r2-a9-10 flagged `tiers_invoked` absent from envelope schema and Omega/Safety floors un-enforced. The fix is one tiny schema patch in `mcp-server/src/schemas/roadmapSchema.ts`:

```ts
// Within the unit envelope schema:
omega_score: z.number().min(0).max(1),
safety_score: z.number().min(0).max(1),
tier_invocation: z.array(z.enum(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'])).min(1),
computed_at: z.string().datetime(),
```

**Why this is the highest-leverage change:**
- Schema-level enforcement = automatic CI gating via existing `schema-version-check.ts`
- Cannot be bypassed without explicit schema bump
- Zod validation runs on every envelope write
- `atomic-roadmap-emit.mjs` requires these on every emit

**Defense in depth (4 layers, ranked):**

| Rank | Where | Mechanism |
|---|---|---|
| 1 | Zod schema (above) | Refuses envelope write below floor |
| 2 | Stop hook `stop_on_low_omega.mjs` + `stop_on_low_safety.mjs` | Block session close on unit with score < 0.70; in `MINIMAL_ALLOWLIST` |
| 3 | Pre-commit hook `omega-floor-precommit-check.mjs` | Scans staged milestone files |
| 4 | CI job `gate-omega-floor` | Last line of defense for PRs from forks |

**Tier-invocation cross-check:** Hook validates `tier_invocation` against actual dispatcher action calls logged in `AISystemRouterEngine` telemetry. If a unit claims `[T6]` but no Z3 invocation logged, hook flags inconsistency.

---

## Threshold tuning (from JM Die history, not from a guess)

**Method:** Sample 200 successful JM Die programs + 50 reworked/scrapped programs. Back-compute Omega via `omegaDispatcher.computeOmega(R, C, P, S, L)` for each. Build ROC curve of Omega vs ship/rework outcome. Set floor at Omega@95th-percentile-of-reworked-jobs (conservative).

**Expected empirical floor:** **0.65–0.72** based on JM Die's estimated 92–95% ship-first-pass rate for established customer programs. Start at the spec's 0.70 floor, run for one MS2 milestone, recalibrate from telemetry.

**Safety threshold:** S(x) is binary-ish in practice (collision/no-collision). The 0.70 floor reasonable as "no high-severity violations" but should be progressively replaced with a constraint-list check rather than a scalar. Tie into Bayes prior infrastructure already shipped at `guardDispatcher.ts:31`.

---

## What this revision changes from v7.C v1

| Tier | v7.C v1 (original spec) | v7.C v2 (this revision) |
|---|---|---|
| T1 | "Claude orchestration" (no grounding) | Tautological + verified via `tiers_invoked` schema |
| T2 | Action names listed | Action names + file paths + line numbers (verified real) |
| T3 | "LoRA adapters" (no training data, no ranks, no fallback) | 4 adapters × ranks × corpora × inference path × fallback marker × Stop-hook enforcement |
| T4 | "xproc_neural_*" (no calibration source) | 10 conformal_* + APS/RAPS/Mondrian + outcome-bridge supervision (commit 3b21228f7) |
| T5 | "AISystemRouterEngine" (no consumer count) | 5 dispatcher consumers + telemetry ledger |
| T6 | "Z3 / MIP / LP" (no engines, no router) | 3 new engines + SymbolicSolverRouter + fast-path preservation + net new deps = 0 |
| T7 | "prismCreativeReasoning" (10-row lookup) | Rename existing + new PRISMKnowledgeGraphReasoningEngine + 5 graph_* actions + Qdrant + Xenova + net new deps = 0 |
| Gate binding | "Omega ≥ 0.70 if shop-floor" (not enforced) | 4-line Zod patch + 4-layer defense-in-depth + JM-Die-grounded threshold tuning |

**Net new dependencies for the entire v7.C v2 grounding plan: 0.**

The remediation surface is engine-creation + wiring + weights training, not procurement.

---

# REVENUE-MS-MASTERPOST — Browser-Based G-Code Generator (Top-Priority P0 Product Line)

**Status:** new product-line section, peer to REVENUE-MS0..MS5.
**Owner:** revenue-roadmap lane.
**Round-4 source inputs:** round-3.5 agent 4 (unit enumeration), agent 5 (controllers + training), agent 6 (JM Die live-pilot), `mcp-server/src/data/jm-die-profile.ts`.

---

## 1. Product Definition

**Master Post** is a browser-based G-code generator. The customer drags a CAM toolpath file (Fusion `.nc`, Mastercam `.NCI`/`.MCAM`, hyperMILL `.H`, Esprit, InventorHSM) into the upload zone, picks a controller from a searchable catalog (Fanuc / Mazak / Okuma / Haas / Mitsubishi / Siemens / Heidenhain / Sodick + variants), tunes format options (decimal places, line numbers, WCS, safety preamble, comment style), and downloads controller-correct G-code in seconds.

**Form factor:** web app at `masterpost.prism.app` + REST API key + CAM-plugin entrypoint (Fusion / Mastercam "Post via PRISM" button).

**Revenue model:**
- **Free tier** — 5 posts/month, watermarked comment line `( Generated by PRISM Master Post — masterpost.prism.app )` injected into every output.
- **Pro** — $49 / month / seat, 100 posts/month, no watermark.
- **Shop** — $199 / month / seat, unlimited posts + REST API access.
- **Per-program metered** — Stripe metering for overflow + non-subscriber API calls (e.g. $0.50 per posted program).

**Why this product line and not an MS sub-milestone:** Master Post is a top-priority P0 product whose backend is **70% built** (25+ engines, ~16 dispatcher actions, 5 controller families wired). What's missing is the productization layer — unified API, neutral toolpath schema, upload pipe, UI, emitter polish, billing. 4-week MVP to first revenue.

---

## 2. Backend Inventory (Already Built — Do Not Re-Implement)

**Engines (25+):** `E0182 HurcoV11MillMasterPost`, `E0322 MasterPostProcessorUnifiedAGI`, `E0321 MasterPostFineTuning`, `E0355 OkumaB250LatheMasterPost`, `E0337 MitsubishiMV1200RWireEDMMasterPost`, `E0265–E0271 LatheMasterPost{API, DeepReasoning, EnsembleCrossCheck, RegressionMatrix, Router, SelfAwareness, UnifiedOutput}`, `E0274–E0276 LathePost{GeneratorDialect, GeneratorSpecIngest, ProcessorDialectValidator}`, `E0281 LatheSwissPostGenerator`, `E0383 PostProcessorUnification`, `E0091/E0092 CAMPost{InvokeOrchestrator, SelectorUI}`, `E0165 FusionLathePostDeltaRegistry`, `E0202 InventorCAMCodeGenerator`, `E0359 OneClickWEDMGenerator`, `E0494 WEDMControllerDialectVerifier`, `E0525–E0531 WEDMPost{Agie, DialectRouter, Fanuc, Makino, Mitsubishi, Sodick, Types}`, `E0308 MastercamControllerCatalog`, `E0343 MultiControllerCalibration`.

**Dispatcher actions (16):** `prism_cam:post_process`, `:lathe_post_process`, `:cam_controller_catalog`, `:cam_translate`, `:cam_compare_controllers`, `:gcode_transpile`, `:gcode_transpile_dialects`, `:gcode_transpile_cycles`, `:advanced_post_enhance`, `:post_feed_optimize`, `:post_feed_analyze`, `:cam_ext_flagship`, `:cam_ext_search`, `:subprogram_call`, `:subprogram_pattern`, `:probe_generate`.

**Controller readiness today: 3 of 9 ship-ready** — covers **75%** of the JM Die 24,545-program archive:

| Controller | Engine | Status | JM Programs |
|---|---|---|---|
| Hurco WinMAX v10 | `HurcoV11MillMasterPostEngine` (E0182) | **SHIP-READY** | 4,200 |
| Okuma OSP family (P200/P300/P500/U10) | `OkumaB250LatheMasterPostEngine` (E0355) + `PPOkumaTurningPostEngine` | **SHIP-READY** | 11,900 |
| Mitsubishi W31MV-2 (Wire EDM) | `MitsubishiMV1200RWireEDMMasterPostEngine` (E0337) + `WEDMPostMitsubishi` (E0529) | **SHIP-READY** | 2,300 |

---

## 3. JM Die Fleet Mapping (Launch Beachhead — 15 machines)

| Class | Count | Machines | Controllers |
|---|---|---|---|
| Lathes | 7 | Okuma GENOS L300-M, L200E-M, LNC8, Crown L1060, L400II-E, LB 3000EX, Multus B250II | OSP-P300L-R, P200LA-R, U10L, U10L, P300LA-E, P500, P300SA |
| 5-axis VMC | 1 | Okuma M460V-5AX | OSP-P300MA-H |
| 3-axis mills | 4 | Hurco VM30i, Haas VF-2, Haas OM-2, Roku-Roku HC 658-II | WinMAX v10, PRE-NGC, PRE-NGC, Fanuc 31i-B5 |
| Sinker EDM | 2 | Mitsubishi EA12S, EA12D | FP80S, C30EA-2 |
| Wire EDM | 1 | Mitsubishi FA10S | W31MV-2 |

JM Die acts as the round-3.5 agent-6 live-pilot design partner — every program posted through Master Post for 2 weeks before public launch.

---

## 4. Controller Priority Order (Weeks-to-Revenue)

| Order | Controller | Status | Rationale | Weeks-to-Revenue |
|---|---|---|---|---|
| 1 | **Hurco WinMAX v10** | **SHIP-READY** | Engine E0182 done; 4,200 JM examples; close JM-internal paid pilot first | **Week 2** |
| 2 | **Haas PRE-NGC** | NEW BUILD | 2 JM machines + ~25% US small-shop TAM — biggest external launch | Week 4 |
| 3 | **Fanuc 31i-B5** | NEW BUILD | 60–70% global market share; unlocks external TAM | Week 6 |
| 4 | **Okuma OSP harden** | SHIP-READY (P200/P300/P500/U10) | Multi-axis variants P300SA / MA-H untested — close coverage | Week 8 |
| 5 | **Mitsubishi sinker FP80S / C30EA-2** | NEW BUILD | 3,100 JM examples; shrinking market; defers to MS-PILOT dry-run validation | Week 10 |
| 6 | Mazatrol Smooth / Heidenhain TNC640 / Siemens 840D | P2 | No JM training data — MS-PILOT phase only | Post-MVP |

**First revenue:** Week 2, Hurco WinMAX paid-pilot conversion at JM Die (engine already SHIP-READY; revenue is productization, not new build).

---

## 5. Unit Roster — 40 Units (P0=18 / P1=12 / P2=10)

Wiring rule: every unit's acceptance criterion MUST include round-trip E2E through the named dispatcher action (not engine singleton import). Per CLAUDE.md ENGINE WIRING law. The MasterPost API must be wired to `prism_cam` AND `prism_dev` (build/quality consumers); WEDM units also wire `prism_wedm`.

### Core API + Schema (P0)

| Unit | Title | Spec | Acceptance | Depends |
|---|---|---|---|---|
| **U-REV-MP-01** | MasterPost unified API surface | `POST /api/masterpost/generate {neutral_toolpath, controller_id, options} → {gcode, warnings, telemetry}`. Wraps `MasterPostProcessorUnifiedAGIEngine` + dialect routers. | 200 OK on 5 controllers × 3 fixtures; <500 ms p95; **round-trip via `prism_cam:post_process` dispatcher**. | — |
| **U-REV-MP-02** | Upload pipe + ingest | Browser drag-drop → S3/local-blob → MIME sniff → per-format parser. Supports `.nc/.mcam/.nci/.h/.cnc/.tap` up to 50 MB. | 10 sample files; format detection ≥95%; presigned URL flow tested. | — |
| **U-REV-MP-03** | **Neutral Toolpath Schema (NTS) v1.0** | Canonical IR: moves (G0/G1/G2/G3 + axes), tool-changes, coolant, spindle, M-codes, WCS, cycles. `schemaVersion 1.0.0`. | Round-trip Fusion `.nc` → NTS → Fanuc emit matches reference within 1% line-diff; **dispatcher action `prism_cam:nts_validate` round-trips**. | — |

### CAM Input Parsers (P0/P1/P2)

| Unit | Title | Format | Priority | Depends |
|---|---|---|---|---|
| U-REV-MP-04 | Fusion 360 `.nc` parser → NTS | Autodesk Fusion CAM neutral | **P0** | MP-03 |
| U-REV-MP-05 | Mastercam NCI/MCAM parser → NTS | Reuse `MastercamControllerCatalogEngine` | P1 | MP-03 |
| U-REV-MP-06 | hyperMILL `.H` parser → NTS | Heidenhain-format intermediate | P1 | MP-03 |
| U-REV-MP-07 | InventorHSM / HSMWorks parser → NTS | Wrap `InventorCAMCodeGeneratorEngine` (E0202) | P2 | MP-03 |
| U-REV-MP-08 | Esprit / SolidCAM parser → NTS | Tier-2 CAM bridge | P2 | MP-03 |

### Controller Emitters (P0/P1/P2)

| Unit | Title | Controller | Priority | Depends |
|---|---|---|---|---|
| U-REV-MP-09 | Fanuc emitter (mill+lathe) | Fanuc 0i/30i/31i | **P0** | MP-03 |
| U-REV-MP-10 | Haas emitter (NGC + PRE-NGC) | Haas | **P0** | MP-03 |
| U-REV-MP-11 | Okuma OSP emitter (lathe+mill) | OSP-P200/P300/U10/P500 | **P0** | MP-03 |
| U-REV-MP-12 | Mazak Mazatrol-T/M emitter | Mazatrol Smooth (conv + EIA) | P1 | MP-03 |
| U-REV-MP-13 | Siemens 840D/828D emitter | SINUMERIK + CYCLE800/83 | P1 | MP-03 |
| U-REV-MP-14 | Heidenhain TNC640 / iTNC530 emitter | Klartext + ISO | P1 | MP-03 |
| U-REV-MP-15 | Mitsubishi M700/M800 emitter | mill + sinker EDM | P1 | MP-03 |
| U-REV-MP-16 | Hurco WinMAX emitter | Wrap `HurcoV11MillMasterPostEngine` | P2 | MP-03 |
| U-REV-MP-17 | Sodick/Makino/Agie WEDM emitter unification | Behind `WEDMPostDialectRouter` | P1 | MP-01 |

### UI Surface (P0/P1)

| Unit | Title | Priority | Depends |
|---|---|---|---|
| U-REV-MP-18 | MasterPost upload page (drag-drop + format auto-detect) | **P0** | MP-02 |
| U-REV-MP-19 | Controller picker (searchable, 30+ controllers, recents+favorites) | **P0** | MP-18 |
| U-REV-MP-20 | Format options panel (decimals, line numbers, WCS, safety lines, comments, sub-programs) | **P0** | MP-19 |
| U-REV-MP-21 | Output preview pane + diff (syntax-highlighted; 50K-line <2s; collapsible) | P1 | MP-20 |
| U-REV-MP-22 | Output download + share-link (proper filename; 7-day signed URL) | **P0** | MP-21 |

### G-Code Semantics (P0/P1/P2)

| Unit | Title | Priority | Depends |
|---|---|---|---|
| U-REV-MP-23 | WCS / work-offset handling (G54–G59 + extended; per-controller emit rules) | **P0** | MP-09, MP-10, MP-11 |
| U-REV-MP-24 | Tool-change block builder (M6, length/wear offsets, M19 orient, ATC safety) | **P0** | MP-23 |
| U-REV-MP-25 | M-code library (coolant / spindle / program-end variants per controller) | **P0** | MP-24 |
| U-REV-MP-26 | Canned cycle translator (G81–G89, G73/G83, G76; expand for non-supporting controllers) | P1 | MP-09, MP-13 |
| U-REV-MP-27 | Safety preamble + epilogue (cancel offsets, retract Z, coolant off, home) | **P0** | MP-23 |
| U-REV-MP-28 | Comments + program header (per-controller delimiter rules: paren vs semicolon) | P1 | MP-25 |
| U-REV-MP-29 | Sub-program + pattern repeat (M98/M99 Fanuc, L/CALL Heidenhain, CALL Siemens) | P1 | MP-24 |
| U-REV-MP-30 | Sub-spindle + dual-turret lathe (Okuma Multus, Mazak Integrex) | P2 | MP-11 |

### Validation + Simulation (P0/P1/P2)

| Unit | Title | Priority | Depends |
|---|---|---|---|
| U-REV-MP-31 | Syntax-check validator (grammar per dialect; line-by-line lint) | **P0** | MP-09, MP-10, MP-11 |
| U-REV-MP-32 | Controller-rule validator (RPM caps, feed limits, axis travel, forbidden modal combos) | **P0** | MP-31 |
| U-REV-MP-33 | Vericut-class collision sim integration (round-trip to `/cnc-simulate`) | P1 | MP-22 |
| U-REV-MP-34 | Dry-run mode (M0/M1 + zero-feed; Z-shift + feed-hold breakpoints) | P2 | MP-25 |

**Per-controller validation method:** roundtrip generated G-code → public emulator (Hurco WinMAX sim, Okuma OSP-Lathe sim, Haas IPS sim, Fanuc 31i sim) → motion plan compare vs Mastercam `.mcx-8` reference. **Mitsubishi sinker has no public emulator — defers to U-REV-MP-39 MS-PILOT dry-run validation at JM Die.**

### Billing — Depends on REVENUE-MS1 (P0)

| Unit | Title | Priority | Depends |
|---|---|---|---|
| U-REV-MP-35 | **Stripe metered billing — per-program credits** ($0.50/post counter at `/api/masterpost/generate`) | **P0** | MP-22, **MS1 U-SUB-01..04** |
| U-REV-MP-36 | **Per-seat subscription tiers** ($49 Pro / $99 / $199 Shop with monthly post quotas; controller-set gating) | **P0** | MP-35, **MS1 U-SUB-05..08** |
| U-REV-MP-37 | **Free tier (watermarked, 5 posts/mo)** — inject `( Generated by PRISM Master Post — masterpost.prism.app )` comment line + quota enforcement + upgrade CTA | **P0** | MP-36 |

### Training + Live Pilot + Distribution (P0/P1/P2)

| Unit | Title | Priority | Depends |
|---|---|---|---|
| U-REV-MP-38 | Training data pipeline (capture posted programs opt-in → train `MasterPostFineTuningEngine` E0321) — per round-3.5 agent 5 | P2 | MP-35 |
| U-REV-MP-39 | **JM Die live-pilot** (15 machines, post every program through Master Post for 2 weeks) — per round-3.5 agent 6 | **P0** | MP-22 |
| U-REV-MP-40 | REST API key + CAM-plugin hook (Fusion/Mastercam "Post via PRISM" button) | P1 | MP-01 |

---

## 6. P0 Sequencing — 4-Week MVP to First Revenue

**Week 1 — Schema + API + JM Beachhead Emitters**
U-REV-MP-03 (NTS schema) → U-REV-MP-01 (unified API) → U-REV-MP-02 (upload pipe) → U-REV-MP-04 (Fusion parser) → U-REV-MP-09 + U-REV-MP-10 + U-REV-MP-11 (Fanuc / Haas / Okuma emitters in parallel).

**Week 2 — UI + Semantics + First Paid Pilot**
U-REV-MP-18 → MP-19 → MP-20 → MP-22 (UI chain) || U-REV-MP-23 → MP-24 → MP-25 → MP-27 (G-code semantics chain) || U-REV-MP-39 (JM Die live-pilot begins on **Hurco SHIP-READY** path). **First revenue here: JM Die paid-pilot conversion.**

**Week 3 — Validation + Billing**
U-REV-MP-31 → MP-32 (validators) || U-REV-MP-35 → MP-36 → MP-37 (billing chain depends on MS1 U-SUB-01..08 — must land in parallel by end of Week 3).

**Week 4 — Public Launch**
JM Die live-pilot complete; Hurco + Okuma + Fanuc + Haas emitters validated through public emulators (Mitsubishi sinker validated by MS-PILOT dry-run only); free-tier watermark + Pro/Shop tiers live. **Public revenue.**

---

## 7. Dependencies

- **MS1 (Subscription mechanics)** — U-REV-MP-35/36/37 depend on `U-SUB-01..08` (Stripe + license validator + tier middleware + seat allocation). MS-MASTERPOST cannot ship public revenue without MS1.
- **MS0 (Customer-facing UI unstub)** — U-REV-MP-18..22 are net-new pages; do **not** require existing MS0 page unstub (Master Post is a distinct surface at `masterpost.prism.app`).
- **No dependency on MS2..MS5** — Master Post ships independently.

---

## 8. Acceptance — Round-Trip E2E Through Dispatcher (Not Engine Singleton)

Per CLAUDE.md ENGINE WIRING law: every acceptance test invokes through `prism_cam` action (or `prism_wedm` for U-REV-MP-17). Test must assert (a) dispatcher schema + action enum, (b) lazy import of underlying engine, (c) round-trip request → emitted G-code → grammar lint → emulator-validated motion plan. Engine-singleton imports in tests are rejected by the wiring-enforcement hook.

---

## 9. Summary

- **Total units:** 40
- **P0:** 18 — schema (1) + API+upload (2) + Fusion parser (1) + Fanuc/Haas/Okuma emitters (3) + UI chain (4) + G-code semantics (4) + validators (2) + billing chain (3) + JM live-pilot (1)
- **P1:** 12
- **P2:** 10
- **Controllers today:** 3 of 9 ship-ready (covers 75% of 24,545-program JM archive)
- **First revenue:** Week 2 (JM Die paid-pilot on SHIP-READY Hurco)
- **Public revenue:** Week 4
- **Backend coverage:** 70% built — only product surface, emitter polish, billing are net-new

---

# REVENUE-MS-TRAIN — Training Cadence Layer (Orthogonal to MS0-MS5)

> **Status:** NEW milestone, Round-4 spec revision.
> **Theme:** Per-shop / per-machine / per-tool calibration + LoRA adapter pipeline + Master-Post training overlays + tribal-knowledge continuous capture.
> **Orthogonality:** Touches every revenue product (SFC / Master Post / WEDM / Lathe / Mill / Quote-to-Ship). MS0-MS5 deliver envelope-baseline behavior; MS-TRAIN converts envelope -> per-customer fit (the value-add that justifies premium SaaS pricing).
> **Customer-readable promise:** "Day 1 you get ISO-baseline physics + envelope safety margins. Day 30 you get your machines' actual Kienzle kc11, your operators' actual style, your tool-life curves. Day 90 you get conformal-validated autonomy."

---

## 0. Why MS-TRAIN exists separate from MS0-MS5

Round-3.5 agent-3 forensics confirmed: **the canonical physics envelope (`constants.ts` kc11 P=1800 / M=2100 / K=1100 / N=700 / S=2800 / H=3200 + Taylor C/n table) is shop-AVERAGE not shop-SPECIFIC**. Without per-shop fit:
- Gilbert economic speed `v = (C / ((n/(1-n))*(t_ch + t_c*K)))^(1/n)` runs on shop-AVERAGE C/n -> 12-18% real cost penalty vs fitted.
- Stability Lobe Diagrams (SLD) fall back to MachineToolEnvelopeEngine conservative envelope -> 20-30% productivity left on the table.
- LoRA adapter weights are absent (0 .safetensors files) -> dispatchers silently return base-model output.

MS-TRAIN is the **only milestone that creates the supervision pipeline + the calibration cadence + the validation gates that lift the SaaS tier from envelope-pricing to fit-pricing.**

---

## 1. The 11 SFC Training Nodes (Round-3.5 agent-3)

| # | Node | Data Source | Cadence | Fit Method | Validation Gate | Fallback |
|---|------|-------------|---------|------------|-----------------|----------|
| 1 | Kienzle kc11 per-shop per-material | Spindle power kW via MTConnect/FOCAS/THINC, 8 test cuts per material, h in [0.05, 0.4] mm | **One-shot at onboarding** + on-trigger when new supplier/material lot (>5% deviation) | Linear regression in log-log: `ln(Fc) = ln(kc11) + (1-mc)*ln(h)`. Weighted least-squares 1/sigma_F^2. Bootstrap n=500 CI. Per-shop multiplicative offset vs ISO baseline. | R^2 > 0.92 on holdout + bootstrap CI half-width <8% of mean kc11 + Bayesian prior penalty if deviation >30% from ISO baseline | <3 valid cuts: emit `kienzle.fallback.baseline_only`, stack with 12% conformal margin |
| 2 | Taylor C, n per-machine per-tool-class | Tool-life log per (machine, tool-class): (Vc, T-to-Vb=0.3mm). 21 machines x 6 tool-classes = 126 tuples; need >=5 trials each = 630 trials | **Continuous accumulation** + weekly regression refit + monthly cross-validation | Log-linear: `ln(T) = ln(C) - (1/n)*ln(Vc)`. Hierarchical Bayesian prior centered on constants.ts. Posterior shrinkage weighted by sample count. | Posterior CI on n excludes n=0 and n>0.6. R^2 > 0.80. Cross-validate on held-out 20%. | Machine-specific -> shop-average -> ISO baseline. Confidence tier `envelope|shop-avg|machine-specific` in every Gilbert call. |
| 3 | SLD per-machine per-toolholder-stack | Hammer-impulse FRF (PCB 086C03 + PCB 356A16). 21 machines x ~8 stacks = 168 measurements. RCSA per Schmitz Ch.4 extrapolates to all stack combos. | **One-shot at shop install** (1 day/machine) + on-trigger after spindle service + monthly 3-stack spot-check | FFT -> rational fraction polynomial modal extraction -> Altintas-Budak `Re[Lambda(omega)]` eigenvalues -> 2D (RPM, ap) stability map | Predicted chatter onset RPM within +/-8% of 3 verification cuts/machine. Mode count >=3 within 0-4000Hz. | Class-default conservative SLD from MachineToolEnvelopeEngine, telemetry tier `sld-class-default` |
| 4 | Thermal growth per-machine per-axis | Touch-probe Z at artifact every 5 min for 2h warmup. Spindle temp + ambient. 21 machines x 4-5 axes = ~90 curves. | **One-shot at onboarding** (2h/machine) + monthly 30-min spot + seasonal full re-cal | 1st-order linear: `dpos(t,Tsp) = alpha*(Tsp - Tref) + beta*(Tamb - Tref_amb)`. OLS. Real-time G10 L20 work-offset compensation. | RMSE <5um (tight-tol) or <15um (general). alpha plausible (1-3 um/C cast-iron, 5-12 um/C spindle). | Worst-case 25um drift over 2h baked into tolerance stack. Block IT5/IT6 parts until fit complete. |
| 5 | Conformal recalibration (drift detection) | Predicted-vs-actual log per (op, machine, material, tool). MTConnect part-program-complete event. | **Continuous** + on-trigger when rolling-window deviation > 3sigma over 50 samples OR 5-sample run all >1sigma same direction | Adaptive Conformal Prediction (Romano 2020 APS — already shipped via `AdaptiveConformalAlphaEngine` commit 03586e2fa). CUSUM drift detector on `\|pred - actual\| / sigma_pred`. | Empirical coverage >= 1-alpha (target 90%). Brier <0.15 binary outcomes. | On drift: widen alpha 0.10->0.15, block dispatcher action until 20-sample recalibration completes, operator alert. |
| 6 | mill_lora rank-16 (qwen2.5-coder:7b base) | JM Die mill .NC/.PRG/.MIN ~8K + SpeedFeedOrchestrator synthetic 1000 combos + MTConnect public ~2K + XPROC-NEURAL-CONNECT outcome-bridge reward signal (commit 3b21228f7) | **At-onboarding** initial train (8-12h A100) + **monthly fine-tune** incremental (1-2h) | QLoRA r=16, alpha=32, dropout 0.1, attention only (q_proj, v_proj). 3 epochs, lr=2e-4 cosine. CE on S/F/strategy + KL-penalty vs base. | Token-level S/F accuracy >75% (+/-5% band). Strategy F1 >0.82. Must show >8% absolute lift vs no-adapter baseline. | `lora-weights-presence-check.mjs` blocks when adapter missing. Returns `{adapter_loaded: false}`. Routes to base qwen2.5-coder unfine-tuned + `lora.fallback.weights_missing` telemetry. |
| 7 | lathe_lora rank-8 | JM Die Mazak/Okuma .MIN with `$<INTERNAL>%` header (~3-5K). `LatheLoRADatasetBuilderEngine` exists. | At-onboarding + monthly fine-tune | QLoRA r=8, alpha=16, same schedule as mill_lora. Narrower surface (turning + threading + grooving + chip-control). | Chip-control regime F1 >0.85 (ISO 3685 favorable/unfavorable/unacceptable). S/F accuracy >75%. | Base model + `lora.fallback.weights_missing` telemetry. |
| 8 | wedm_lora rank-4 | 26 JM Die WEDM programs + 46 tribal tips + 14 MIT-cited formulas + synthetic pulse-energy sweeps across 5 dialects | At-onboarding only initially; **quarterly refit** once corpus >100 programs | QLoRA r=4, alpha=8 (rank-4 minimizes overfit on small corpus per LoRA-FA low-shot findings) | Cycle-time MAPE <15% on held-out 5-program test. Surface-finish Ra within +/-0.4um. | Defer to physics-only WEDMOrchestrator + tribal-tip retrieval. |
| 9 | cam_lora ensemble (op_classify + strategy_recommend + tool_select, each rank-8) | Mastercam 45 ops + hyperMILL 25 ops + CamStrategyEngine recommendations as weak supervision | At-onboarding + **quarterly refit** | Per-task adapters, ensemble at inference via Bayesian model averaging weighted by per-task held-out accuracy | Op classify top-1 >0.88. Strategy top-3 recall >0.90. Tool-select top-5 >0.85 within library. | CamStrategyEngine rule-based path. |
| 10 | Tribal continuous capture | Operator text notes + Whisper voice-to-text (@xenova/transformers local), post-op triggered on CAM-default override or unusual outcome | **Continuous** + nightly batch ingestion into `wiki/code-tribal/` + Qdrant `prism_kg_nodes` | No model fit; embedding-only. Xenova all-MiniLM-L6-v2 384-dim. Tag extraction via Ollama qwen2.5-coder:7b zero-shot. Promote to playbook rules at >=3 citations. | `/wiki-lint` (existing). Anti-dup via cosine >0.85 flag-for-merge. Tag-extraction FP rate <10% monthly human audit. | Manual text-only operator form (no Whisper). |
| 11 | Unified telemetry-ingestion fabric | 5-protocol adapter: MTConnect / OPC-UA / Fanuc-FOCAS / Okuma-THINC / Heidenhain DNC | **Continuous** | Stream consolidation -> Qdrant (vector) + DuckDB (time-series) + Stop-hook calibration triggers | <2s end-to-end latency (extend MTConnectRoundTripLatencyBenchEngine to all 5 protocols). Zero dropped events over 24h. | Per-protocol degrade: when one adapter down, mark per-machine telemetry tier `degraded-{protocol}`, continue with surviving channels. |

---

## 2. Master Post Per-Controller Training (Round-3.5 agent-5)

### 2.1 Rule-based dialect translation (5 controllers — published specs)

| Controller | Engine | Training Method | JM Die Examples | Priority |
|------------|--------|-----------------|-----------------|----------|
| Hurco WinMAX v10 | E0182 `HurcoV11MillMasterPostEngine` | rule + prompt overlay | 4,200 | P0 |
| Okuma OSP family (P200/P300/P500/U10) | E0355 `OkumaB250LatheMasterPostEngine` + `PPOkumaTurningPostEngine` | rule + LoRA | 11,900 | P0 |
| Mitsubishi W31MV-2 (Wire EDM) | E0337 `MitsubishiMV1200RWireEDMMasterPostEngine` + E0529 `WEDMPostMitsubishi` | rule | 2,300 | P0 |
| Haas PRE-NGC | **MISSING — build in MS-TRAIN** | rule | 2,500 | P1 |
| Fanuc 31i-B5 | **MISSING — build in MS-TRAIN** | rule | 400 | P0-external |
| Mitsubishi FP80S / C30EA-2 (Sinker) | **MISSING** | rule + LoRA | 3,100 | P1 |

**Rule-based training**: each engine's `emit()` method is parameterized by a controller-dialect manifest JSON (modal-state machine + canonical-syntax table + safety-block templates). Training = curating the manifest, not gradient-descent.

### 2.2 LoRA fine-tune for operator-style preferences

| Controller | Adapter | Style Signal |
|------------|---------|--------------|
| Okuma OSP | `okuma_operator_lora` rank-4 | `$<INTERNAL>%` header convention, edit-on-controller patterns (operator hand-edits in JM archive), G10 L2 work-offset placement style |
| Mitsubishi sinker FP80S/C30EA-2 | `mitsubishi_sinker_lora` rank-4 | Pulse-table preset selection, jump-flush trigger thresholds, electrode-wear compensation cadence |

### 2.3 Tribal prompt overlays (3 known quirks)

| Overlay | Rule | Test |
|---------|------|------|
| `hurco_m30_rapid_home` | After M30, Hurco WinMAX leaves spindle at last position. JM Die convention: emit `G0 X0 Y0 Z0` immediately after M30 to return to safe park. | Roundtrip test: `M30\n` in our output triggers automatic park insertion. |
| `okuma_min_internal_header` | Okuma .MIN files MUST have `$<INTERNAL>%` as line 1 or controller refuses to load. Reference: `reference_jm_die_program_save_practice` memory. | First-line regex `^\$<INTERNAL>%$` on every Okuma emit. |
| `haas_proven_naming` | Haas operators rename `PROVEN PRG/` folder when a program is validated for production. Distinguish draft vs proven in our archive ingestion + downstream confidence-tier in dispatcher output. | Archive ingest tags `prg_status: draft|proven` based on parent folder name. |

---

## 3. Onboarding-Day Plan (~10h wall-clock)

| Step | Time | Activity | Engine(s) | Deliverable |
|------|------|----------|-----------|-------------|
| 1 | 08:00-08:30 | Pre-flight: MTConnect agents on 21 machines (Mazak Smooth native, Okuma THINC needs adapter, Fanuc FOCAS-2-MTConnect bridge, Haas NGC native). Verify spindle-kW channel. | `MTConnectRoundTripLatencyBenchEngine` + **new `SpindlePowerSensorIngestEngine`** | 21 machines emitting SHDR stream at <2s latency |
| 2 | 08:30-11:30 | FRF measurement sweep: hammer + accelerometer at tool tip for 3 representative toolholder stacks per machine (CAT40 ER32 short, CAT40 shrink-fit long, CAT40 facemill). 21 x 3 = 63 measurements @ ~8 min each, 2 technicians in parallel = 4.5h wall-clock. | **new `FRFMeasurementEngine`** + **new `RCSAStabilityPredictorEngine`** | 63 FRF curves stored, 63 SLD maps via Altintas-Budak solver, RCSA extrapolation to all (machine, stack) combos |
| 3 | 11:30-13:00 | Lunch + thermal warmup probe routines started in background (each machine autonomous 2h warmup-G-code with touch-probe Z every 5 min) | **new `ThermalGrowthCalibrationEngine`** | 21 thermal curves alpha/beta per (machine, axis) stored to shop-config |
| 4 | 13:00-15:30 | Kienzle test cuts on 8-10 unique supplier-material combinations. Operator performs 8 cuts per material at varying h, spindle-power telemetry auto-captured. | **new `KienzleKc11FitEngine`** | 8-10 per-shop kc11 values + multiplicative offsets vs ISO baseline + bootstrap CIs |
| 5 | 15:30-17:00 | Bulk ingest JM Die archive (24,545 files) for LoRA pre-training. mill_lora + lathe_lora datasets built via existing `LatheLoRADatasetBuilderEngine` + **new `MillLoRADatasetBuilderEngine`**. Synthetic augmentation via SpeedFeedOrchestrator sweep. | **new `LoRATrainerOrchestratorEngine`** + existing dataset builders | Datasets prepared, training jobs queued |
| 6 | 17:00-18:00 | Operator onboarding: 1h training on shop-floor UI for tribal-knowledge capture (text + voice). Demo predicted-vs-actual feedback loop. Set first-month soft-launch expectations (advisory mode only — no autonomous parameter override until conformal coverage validated). | **new `TribalKnowledgeCaptureEngine`** + existing wiki infrastructure | Operators able to submit tribal tips, voice-to-text working |
| 7 | overnight 18:00-08:00 | LoRA training jobs run (8-12h on customer GPU or PRISM cloud). Conformal baseline established from first day of production data (replay at dawn). | `LoRATrainerOrchestratorEngine` + `AdaptiveConformalAlphaEngine` | mill_lora r=16, lathe_lora r=8 adapter_model.safetensors checkpoints in `mcp-server/data/models/<domain>-lora/<YYYY-MM-DD>/`. Conformal alpha=0.10 (90% coverage). |

**Total wall-clock: ~10h on-site + overnight automated training. Pre-flight (MTConnect agents) MUST be completed week-prior.**

---

## 4. Monthly Maintenance (~2h operator overhead + 4-6 automated jobs)

| Task | Cadence | Duration | Engine |
|------|---------|----------|--------|
| LoRA fine-tune incremental | 1st Monday/month | 1-2h single-GPU | `LoRATrainerOrchestratorEngine`. Gate: must show >8% lift vs prior month or rollback. |
| Taylor C/n refit per (machine, tool-class) | weekly auto when new data points | <5 min compute | `TaylorConstantFitEngine`. Alert on >20% shift (tool brand change or spindle wear). |
| Kienzle drift check | monthly 3-lot spot | 30 min cut-test | `KienzleKc11FitEngine` + `ConformalDriftDetectorEngine`. >10% deviation -> full re-fit. |
| Thermal model spot-verify | monthly single-axis + seasonal full | 30 min spot, 2h full | `ThermalGrowthCalibrationEngine`. RMSE >150% baseline -> full re-cal. |
| SLD 3-stack spot-check | monthly | 45 min (3 x 15 min) | `FRFMeasurementEngine` + `RCSAStabilityPredictorEngine`. >15% modal drift -> full re-FRF. |
| Conformal coverage audit | weekly automated | automated | `AdaptiveConformalAlphaEngine` + `ConformalDriftDetectorEngine`. Cells with <85% empirical coverage flagged. |
| Tribal wiki nightly sync | nightly | automated (Ollama >=70%) | `TribalKnowledgeCaptureEngine` + `/wiki-ingest /wiki-lint /wiki-morning`. |
| Cross-validation health report | 1st of month | automated overnight | **new `CalibrationHealthReportEngine`** + `HookTelemetryEngine`. Health dashboard: R^2/RMSE/coverage/F1 per node + MoM delta + regression alerts. |

**Operator overhead breakdown:** 30 min Kienzle + 30 min thermal + 45 min SLD + ad-hoc tribal capture (background) = **~1h45m/month direct + ~15m ambient = ~2h/month**.

---

## 5. Three Critical Data Gaps (Round-3.5 agent-3)

1. **Spindle-power telemetry availability.** JM Die does not currently log spindle kW. First-day onboarding MUST install MTConnect agents + verify kW channel on all 21 machines BEFORE Kienzle fit can run. Risk: 2-3 older Fanuc machines may need clamp-on CT retrofit (~$400/machine, ~1 day install). **Without this gap closed, node #1 (Kienzle) is blocked entirely** -> envelope-only physics with 12% conformal margin (still ships but no per-shop fit -> no premium tier justification).

2. **Tool-life log cold-start.** No machine currently logs (Vc, T_failure) trials. Taylor C/n fit requires >=5 data points per (machine, tool-class) tuple = 630 trials at JM Die for full coverage. **Cold-start 6-month accumulation period; in interim rely on hierarchical Bayesian posterior shrunk toward ISO baseline.** Gilbert economic speed formula (Round-3 agent-5) operates on baseline-only for first 6 months -> 60-70% of premium value-add unrealized until corpus matures. **Mitigation:** initial 30-day operator-incentive program to log tool-change reasons + chip-color observations -> bootstraps the corpus.

3. **FRF measurement requires shop-floor downtime + skilled technician.** JM Die may not have either in-house. Onboarding-day 4.5h sweep is critical-path and customer must commit. **Without FRF, SLD falls back to class-default conservative envelope leaving 20-30% productivity on the table.** Mitigation options: (a) PRISM technician travels on-site (billable as onboarding-day premium), (b) train one JM machinist on FRF protocol (3-day cert course, one-time), (c) accept class-default SLD and re-visit FRF in month 3 once revenue justifies the downtime cost.

---

## 6. Telemetry Pipeline (Sensors + Protocols + Ingestion)

### Sensors required
| Sensor | Purpose | Native / Retrofit |
|--------|---------|-------------------|
| Spindle power meter (kW) | Kienzle fit primary channel | Native on Mazak Smooth / Okuma OSP / Haas NGC. Clamp-on CT (~$400) for older Fanuc. |
| Impact hammer PCB 086C03 + tri-axial accelerometer PCB 356A16 | FRF at tool tip | Retrofit (one set per shop, mobile cart) |
| Touch probe Renishaw OMP60 (or equivalent) | Thermal-warmup probe + workpiece alignment | Usually present; verify per machine |
| Spindle temperature thermocouple | Thermal model T_spindle | Internal on most controllers; expose via FOCAS/THINC parameter |
| Ambient temperature DS18B20 1-wire | Thermal model T_ambient | $5 retrofit per machine column |
| Shop-floor UI + microphone | Tribal capture (text + Whisper voice) | Existing `mcp-server/web/` frontend + commodity USB mic |
| Operator tool-life logger | Vb=0.3mm or chip-color shift trigger | UI-driven, no hardware sensor needed |

### Protocols (5)
1. **MTConnect** — preferred (Mazak Smooth, Haas NGC, modern controllers)
2. **OPC-UA** — Siemens 840D and modern installations
3. **Fanuc-FOCAS** — legacy Fanuc 0i / 16i / 18i / 21i / 30i / 31i
4. **Okuma-THINC** — Okuma OSP P200 / P300
5. **Heidenhain DNC** — Heidenhain TNC 530 / 640

### Ingestion engine
**`TelemetryIngestionOrchestratorEngine`** (new) — consolidates the 5 protocol adapters into a unified event stream:
- Output sinks: Qdrant (vector embeddings for retrieval) + DuckDB (time-series for fit/regression) + Stop-hook triggers (calibration cadence).
- Wires to `prism_intelligence:telemetry_ingest` + `prism_session:sensor_status_poll`.
- Existing `MTConnectRoundTripLatencyBenchEngine` (E0341) measures one protocol's RTT; this new engine is the ingestion fabric across all 5.

---

## 7. Acceptance Gates (Per Training Cycle)

Every calibration cycle MUST emit a validation report consumed by `CalibrationHealthReportEngine`:

```json
{
  "cycle_id": "<uuid>",
  "node": "kienzle | taylor | sld | thermal | conformal | mill_lora | lathe_lora | wedm_lora | cam_lora | tribal | telemetry",
  "fitted_at": "<iso8601>",
  "sample_count": <int>,
  "metrics": {
    "r_squared": <number>,
    "rmse": <number>,
    "bootstrap_ci_half_width_pct": <number>,
    "empirical_coverage_pct": <number>,
    "f1_score": <number>,
    "month_over_month_delta_pct": <number>
  },
  "validation_gate_passed": <boolean>,
  "fallback_engaged": <boolean>,
  "confidence_tier": "envelope | shop-avg | machine-specific | conformal-validated",
  "regression_alert": <boolean>
}
```

**Top-level gate:** every dispatcher action that consumes a calibrated value attaches its `confidence_tier` to the response. Customer-facing UI displays the tier badge ("envelope" gray / "shop-avg" amber / "machine-specific" green / "conformal-validated" gold). This is the **value-perception driver** for the premium SaaS upgrade.

**Conformal coverage gate:** for each (op, machine, material) cell, empirical coverage MUST be >=85% over rolling 200-sample window. Cells failing this are auto-flagged for either re-fit or downgrade to advisory-only mode (no autonomous parameter override).

---

## 8. Units Enumeration (~20)

| Unit ID | Title | Engine(s) | Cadence |
|---------|-------|-----------|---------|
| U-TRAIN-01 | `KienzleKc11FitEngine` build + wire | new | one-shot |
| U-TRAIN-02 | `TaylorConstantFitEngine` build + wire (hierarchical Bayesian) | new | continuous |
| U-TRAIN-03 | `FRFMeasurementEngine` build (PCB hammer + accelerometer ingestion) | new | one-shot |
| U-TRAIN-04 | `RCSAStabilityPredictorEngine` build (Schmitz Ch.4 RCSA + Altintas-Budak solver) | new | derived from U-TRAIN-03 |
| U-TRAIN-05 | `ThermalGrowthCalibrationEngine` build (alpha/beta OLS, G10 L20 compensation hook) | new | one-shot + monthly |
| U-TRAIN-06 | `ConformalDriftDetectorEngine` build (CUSUM, integrates with shipped `AdaptiveConformalAlphaEngine`) | new | continuous |
| U-TRAIN-07 | `SpindlePowerSensorIngestEngine` + clamp-on CT retrofit protocol | new | continuous |
| U-TRAIN-08 | `TelemetryIngestionOrchestratorEngine` — 5-protocol fabric (MTConnect/OPC-UA/FOCAS/THINC/Heidenhain) | new | continuous |
| U-TRAIN-09 | `LoRATrainerOrchestratorEngine` — QLoRA pipeline (4 adapter classes), GPU job queue, weight versioning | new | onboarding + monthly |
| U-TRAIN-10 | `MillLoRADatasetBuilderEngine` — JM Die mill .NC/.PRG/.MIN -> supervision pairs + synthetic + outcome-bridge | new | onboarding |
| U-TRAIN-11 | mill_lora r=16 first training run + acceptance validation (>8% lift gate) | uses U-TRAIN-09/10 | one-shot |
| U-TRAIN-12 | lathe_lora r=8 first training run (.MIN `$<INTERNAL>%` corpus) | uses U-TRAIN-09 + existing LatheLoRADatasetBuilderEngine | one-shot |
| U-TRAIN-13 | wedm_lora r=4 first training run (26 programs + 46 tips + 14 formulas) | uses U-TRAIN-09 | one-shot |
| U-TRAIN-14 | cam_lora ensemble r=8 (op_classify + strategy_recommend + tool_select) | uses U-TRAIN-09 | one-shot |
| U-TRAIN-15 | `TribalKnowledgeCaptureEngine` — text + Whisper voice + Qdrant embed + Ollama tag-extraction + playbook promotion | new | continuous |
| U-TRAIN-16 | `lora-weights-presence-check.mjs` Stop hook — block dispatcher with `lora.fallback.weights_missing` telemetry | new | continuous |
| U-TRAIN-17 | `CalibrationHealthReportEngine` — monthly cross-validation dashboard, MoM delta, regression alerts | new | monthly |
| U-TRAIN-18 | Master Post LoRA — `okuma_operator_lora` r=4 (Okuma OSP edit-style) + `mitsubishi_sinker_lora` r=4 | uses U-TRAIN-09 | onboarding + quarterly |
| U-TRAIN-19 | Master Post tribal overlays — `hurco_m30_rapid_home` + `okuma_min_internal_header` + `haas_proven_naming` rule packs | new | one-shot config |
| U-TRAIN-20 | Confidence-tier UI badges (envelope / shop-avg / machine-specific / conformal-validated) — dispatcher response decoration + web frontend | new | one-shot |

**Total: 20 units. ~10 new engines + 4 new dataset builders + 1 new Stop hook + 1 reporting engine + 1 telemetry fabric + 2 LoRA operator-style adapters + 3 tribal-overlay rule packs + 1 UI badge layer.**

---

## 9. Wiring (per CLAUDE.md "WIRE TO ALL SOURCES")

| Engine | Dispatchers it must wire to |
|--------|------------------------------|
| KienzleKc11FitEngine | `prism_calc` + `prism_intelligence` (calibration) |
| TaylorConstantFitEngine | `prism_calc` + `prism_intelligence` |
| FRFMeasurementEngine | `prism_calc` + `prism_safety` (stability-relevant) |
| RCSAStabilityPredictorEngine | `prism_calc` + `prism_safety` + `prism_cam` |
| ThermalGrowthCalibrationEngine | `prism_calc` + `prism_safety` |
| ConformalDriftDetectorEngine | `prism_intelligence` + `prism_safety` |
| SpindlePowerSensorIngestEngine | `prism_intelligence` + `prism_session` |
| TelemetryIngestionOrchestratorEngine | `prism_intelligence` + `prism_session` + `prism_memory` |
| LoRATrainerOrchestratorEngine | `prism_ai` + `prism_dev` (build/quality) |
| TribalKnowledgeCaptureEngine | `prism_memory` + `prism_intelligence` |
| CalibrationHealthReportEngine | `prism_dev` + `prism_session` |

`stop-auto-wire.mjs` warns on missing dispatcher refs; `stop_on_unwired_assets.mjs` HARD BLOCKS Stop on zero-dispatcher orphans.

---

## 10. SVI / Omega impact

MS-TRAIN delivers the supervision pipeline that lifts the active milestone bundle from envelope-Omega (~0.75) to fit-Omega (target 1.0 per MEMORY.md). Conformal coverage gate is the binding constraint: any (op, machine, material) cell <85% empirical coverage cannot claim Omega 1.0.

---

# REVENUE-MS-PILOT — Live-Machine Pilot (SFC + Master Post)

> **Scope:** Progressive-trust live-machine validation of SFC and Master Post on JM Die's 21-machine fleet. Two parallel tracks, 7 phases each, sequenced from $8K Bridgeport (P2-P3) to $450K Mazak-Integrex (P6-P7). Calendar realism: 25% buffer → **SFC ≈29w**, **Master Post ≈24w** wall-clock to phase-7 ignition.
>
> **Verdict (round 3.5/06):** Feasible with disciplined gating. SFC is the critical path (force-calibration depends on real cutting data not available before P3). Master Post fronts most of its risk in P1 byte-equivalence vs the JM Die golden NC archive.

---

## Top Risk (Critical)

**Flagship multi-axis kinematic miscompile at P6 on Mazak-Integrex-i200-2021 ($450K, ITW/Alcoa critical-path).** A miscompiled B-axis rotary transform or tool-tip kinematic offset can drive a turret into a chucked $5K billet at rapid rate — collision-class severity, single event terminates pilot credibility.

**Mitigation stack (all hard-gated, all required):**
1. **Mandatory Mazak SmoothAi sim pre-cut** — every flagship program must produce a SmoothAi-clean run before NC release; `cam-toolpath-check` hook hard-blocks unsimmed posts.
2. **Operator red-button fallback** — physical single-press revert to status-quo post installed on flagship machines before P6 entry.
3. **Collision-check hook hard-gate** — `forge-safety` chain validates clearance envelope + tool-holder collision + rotary-axis travel against machine kinematic model; zero-exception block on violation.
4. **Phase-6 entry gate:** Holo-Krome and SFS aerospace job families enter P6 only after a dedicated A-B exclusively on those parts in P5.

---

## Critical Instrumentation (must ship before P1)

| Component | Phase Introduced | Purpose |
|---|---|---|
| `SFCRecommendationLogger` (JSONL) | P1 | Every emit logged: machine, tool, material, RPM/feed/DOC, predicted Fc/torque |
| `VericutDiffEngine` | P1 | PRISM-emit vs sim delta (force, motion, cycle) |
| `ForceBudgetGate` | P1 | Hard block when Fc > 0.7 × spindle_torque |
| `MasterPostByteEquivalenceCI` | P1 | Byte-diff vs golden JM Die NC archive across all 6 controllers |
| `MTConnect spindle-load streamer` | P2+ | Real-time spindle-load + axis-load capture (Haas-VF-2, Doosan, Mazak QT-200, flagship) |
| `OperatorFeedbackButton` (R/Y/G) | P2 | 3-state nominal/warn/abort confirmation per program |
| `DualLogEngine` | P4 | PRISM-emit + operator-actual side-by-side capture |
| `OperatorOverrideReasoningCapture` | P4 | Free-text + tagged-code drop-down for override reasons |
| `BatchOutcomeTracker` | P5 | Tool life, cycle time, Cpk per A-B cohort |
| `ToolLifeRegressionDetector` | P5 | Auto-quarantine tool/material combos within 10 parts |
| `DriftDetector` | P7 | >10% prediction-error flagging → versioned model rollback |
| `ModelVersionRollbackEngine` | P7 | One-button revert to model_v_{N-1} |
| `CalibrationAuditLogger` | P7 | Every recalibration event auditable (who/when/what/why) |

---

## Phase Sequencing — Both Tracks

| Phase | SFC Weeks | MP Weeks | Machines | Risk Posture |
|---|---|---|---|---|
| **P1 bench-sim** | 2 | 3 | none (Vericut / golden-NC diff) | zero shop time |
| **P2 cut-air** | 1 | 1 | Haas-TM-1P-2008, Mori-SL-3-1998, Bridgeport-1985 (DNC) | air, no stock |
| **P3 soft-stock** | 2 | 2 | Haas-TM-1P-2008, Bridgeport-1985 | wax / Delrin / 6061 |
| **P4 production-shadow** | 4 | 3 | Haas-VF-2-2015, Mazak-QT-200-2012, Doosan-DNM-4500-2018 | read-only log |
| **P5 A-B** | 6 | 4 | Haas-VF-2, Mazak-QT-200, Doosan-DNM-4500 | 50/50 split, operator can override |
| **P6 primary** | 8 | 6 | Mazak-Integrex-i200, DMG-Mori-NTX-2000, Makino-PS95 | PRISM default, red-button fallback |
| **P7 telemetry-loop** | 0 (continuous) | 0 (continuous) | all 21 JM Die machines | weekly recalibration, model versioning |
| **Subtotal (nominal)** | **23w** | **19w** | | |
| **+25% calendar buffer** | **29w** | **24w** | | |

---

## Per-Phase Detail

### Phase 1 — Bench-Sim (SFC 2w / MP 3w)
- **Machines:** none. PRISM emits → Vericut/NCSimul (SFC) or byte-diff vs golden archive (MP).
- **Sample parts:** JM-DIE bracket-001 (1018), ITW-flange-022 (6061-T6), Alcoa-housing-007 (7075-T6); MP 10-program regression suite (G54-G59, tool-change macros, sub-programs).
- **Acceptance (SFC):** 100% pass `ForceBudgetGate` (Fc < 0.7 × spindle_torque) + chip-load envelope; ≥95% match catalog within ±15%.
- **Acceptance (MP):** 100% byte-equivalence vs JM Die golden NC across Haas NGC, Fanuc 31i, Mazatrol Smooth G, OSP-P300, with documented allowed deltas (comments only).
- **Failure → rollback:** Block ship; `/forge-perf` kc1.1 recalibration (SFC) or per-controller patch + regression test add (MP). Failed materials/controllers → `PENDING_GAP_ENGINES.json`.
- **Artifacts:** `JM-Die-SFC-Operator-Runbook.pdf` (draft), per-controller code-style reference cards.

### Phase 2 — Cut-Air (SFC 1w / MP 1w)
- **Machines:** Haas-TM-1P-2008 (toolroom mill, $35K, MTConnect-equipped, low utilization — ideal first-touch), Mori-Seiki-SL-3-1998 (legacy lathe, $25K), Bridgeport-1985 (DNC pass-through, no MTConnect).
- **Sample parts:** air-cut bracket-001 (Z+2 offset), air-cut OD-turn.
- **Acceptance:** Motion matches sim within 0.001in; zero alarms; spindle load idle (<5%); operator R/Y/G = green.
- **Failure → rollback:** Halt; diff actual NC vs PRISM emit; if post issue → MP bug, if motion issue → SFC kinematic correction. Per-controller block.
- **Instrumentation:** MTConnect spindle-load stream, G-code line-by-line diff, OperatorFeedbackButton.
- **Artifacts:** 1-page laminated operator runbook (machine-by-machine).

### Phase 3 — Soft-Stock (SFC 2w / MP 2w)
- **Machines:** Haas-TM-1P-2008, Bridgeport-1985 (Anilam retrofit, DNC log capture).
- **Sample parts:** machinable wax bracket, Delrin housing mock, 6061 throwaway billet.
- **Acceptance (SFC):** Measured cutting force (spindle-load proxy) within **±20%** of SFC prediction; surface finish Ra within 1.5× target; zero tool breakage across 10 parts/material.
- **Acceptance (MP):** Cut motion identical to operator-written equivalent; no unexpected dwells/pauses; spindle ramps correctly.
- **Failure → rollback:** Lock material in 'shadow-only' mode; `/lathe-learn` or `/mill-learn` calibration on captured force data; block P4 graduation for that material.
- **Artifacts:** Phase-3 wax-cut training video (10 min, machine-by-machine).

### Phase 4 — Production-Shadow (SFC 4w / MP 3w)
- **Machines:** Haas-VF-2-2015 (3-axis VMC, $65K), Mazak-QT-200-2012 ($85K bar lathe), Doosan-DNM-4500-2018 ($95K VMC).
- **Sample parts:** ITW-flange production run (50 pcs), Optimas-pin lathe job (200 pcs), 10 production-job MP parallel-post diffs.
- **Acceptance (SFC):** ≥100 ops logged; PRISM-vs-operator delta <25% RPM, <30% feed; operator does NOT use PRISM value (shadow read-only); deltas feed calibration.
- **Acceptance (MP):** PRISM-post vs operator-post semantically equivalent (motion identical; stylistic-only delta in comments/blocks).
- **Failure → rollback:** Tighten model with shop-floor delta; `/shop-knowledge` ingestion of override reasons → tribal tips. No machine impact (read-only).
- **Artifacts:** Dual-log dashboard tutorial (operator-facing UI, `/shop-floor-query` integration); PRISM-Override-Reasons cheatsheet.

### Phase 5 — A-B (SFC 6w / MP 4w)
- **Machines:** Haas-VF-2-2015, Doosan-DNM-4500-2018, Mazak-QT-200-2012.
- **Sample parts:** Randomized 50/50 split across 4 high-volume ITW/Optimas SKUs.
- **Acceptance (SFC):** Tool life ≥**95%** of status-quo; cycle time ≤**105%** of status-quo; Cpk on critical dim ≥ status-quo; zero PRISM-induced scrap.
- **Acceptance (MP):** Cycle-time delta <**2%**; zero alarms attributable to PRISM-post; operator readability ≥4/5.
- **Failure → rollback:** Revert that tool/material to status-quo; quarantine in 'A-B-failed' bucket; re-train on regression cohort. Operator can override mid-run.
- **Artifacts:** Job-card insert (visual: PRISM vs status-quo); Cpk real-time monitor.

### Phase 6 — Primary (SFC 8w / MP 6w)
- **Machines:** Mazak-Integrex-i200-2021 ($450K mill-turn, Mazatrol Matrix-2), DMG-Mori-NTX-2000-2020 ($550K, Siemens 840D sl), Makino-PS95-2019 ($280K, high-speed VMC).
- **Sample parts:** Holo-Krome high-tolerance series, SFS aerospace bracket family, Alcoa precision housing.
- **Acceptance (SFC):** PRISM default for ≥**80%** of new jobs; operator override rate <**15%**; tool life +≥5% vs P5 baseline; zero spindle/collision events attributable to SFC.
- **Acceptance (MP):** PRISM-post default; zero collision events; multi-axis kinematic transforms verified against Mazak SmoothAi simulator (every program, no exceptions).
- **Failure → rollback:** Novel material → drop to P4 shadow for that material until calibrated. Red-button single-press fallback to operator status-quo.
- **Artifacts:** 5-tier escalation tree (operator → shop-lead → programmer → PRISM-engineer → red-button, <5min each); red-button physical install per flagship machine.

### Phase 7 — Telemetry-Loop (continuous)
- **Machines:** all 21 JM Die machines.
- **Acceptance:** MTConnect/Mazatrol feed → `/forge-learn` → kc1.1 + Taylor exponent weekly recalibration; DriftDetector flags >10% prediction error; auto-PR for constants update; post-edit operator-touched-lines trends to zero.
- **Failure → rollback:** Versioned model rollback (model_v_{N-1}); manual freeze button; weekly human-in-loop review of recalibration PRs.

---

## Units (15)

- **U-PILOT-01** — Instrumentation foundation: `SFCRecommendationLogger`, `VericutDiffEngine`, `ForceBudgetGate` (P1 SFC ship gate).
- **U-PILOT-02** — `MasterPostByteEquivalenceCI` + JM Die golden NC archive snapshot across 6 controllers (P1 MP ship gate).
- **U-PILOT-03** — MTConnect spindle-load streamer + adapter for Haas-TM-1P, Mazak-QT-200, Haas-VF-2, Doosan-DNM-4500, Mazak-Integrex (P2+).
- **U-PILOT-04** — `OperatorFeedbackButton` (R/Y/G) UI + persistence (P2).
- **U-PILOT-05** — Phase-2 cut-air protocol + acceptance harness on Haas-TM-1P + Mori-SL-3 (1w each).
- **U-PILOT-06** — Phase-3 soft-stock harness: wax/Delrin/6061 acceptance + force-prediction calibration loop (Haas-TM-1P + Bridgeport).
- **U-PILOT-07** — `DualLogEngine` + `DeltaAnalyzer` + `OperatorOverrideReasoningCapture` (P4).
- **U-PILOT-08** — Phase-4 production-shadow rollout on Haas-VF-2 + Mazak-QT-200 + Doosan-DNM-4500 (4w SFC, 3w MP).
- **U-PILOT-09** — `BatchOutcomeTracker` + `ToolLifeRegressionDetector` + `CpkABStreamer` + `CycleTimeABDelta` (P5).
- **U-PILOT-10** — Phase-5 A-B execution + acceptance scoring (6w SFC, 4w MP).
- **U-PILOT-11** — Flagship pre-flight: Mazak SmoothAi sim gate + `cam-toolpath-check` hard-block + red-button physical install (P6 entry).
- **U-PILOT-12** — Phase-6 primary rollout on Mazak-Integrex + DMG-Mori-NTX + Makino-PS95 (8w SFC, 6w MP).
- **U-PILOT-13** — `DriftDetector` + `ModelVersionRollbackEngine` + `CalibrationAuditLogger` (P7).
- **U-PILOT-14** — `/forge-learn` weekly recalibration cron + auto-PR for kc1.1 / Taylor constants (P7).
- **U-PILOT-15** — Operator training package: 8 artifacts (runbook PDF, cheatsheet MD, wax-cut video, dashboard tutorial, job-card insert, escalation tree, controller cards, red-button install guide).

---

## Calendar Realism

- **SFC nominal:** 2+1+2+4+6+8 = **23w** → +25% buffer → **29w**
- **Master Post nominal:** 3+1+2+3+4+6 = **19w** → +25% buffer → **24w**
- **Both tracks run in parallel** — P2-P5 share machines, P1 is independent. SFC is the critical path.
- **Hard gate:** P1 acceptance 100% before P2 starts. Cut-air budget capped at 4 hrs/machine; soft-stock at 16 hrs/material.

---

## Risk Register (top 5, full list in JSON)

1. **Flagship kinematic miscompile (P6 Mazak-Integrex)** — *critical*. Mitigation: SmoothAi sim mandatory + red-button + collision-check hook.
2. **Spindle overload on P3 wax cut (wrong Kienzle for novel alloy)** — *high*. Mitigation: ForceBudgetGate hard-block at 70% torque; P1 must pass first.
3. **Operator rejection as 'CAM-textbook' kills adoption pre-A-B** — *high*. Mitigation: P4 shadow must capture override reasons; tribal-tip ingestion before P5; operator co-design of P5 acceptance.
4. **Tool-life regression silent until weeks into P5** — *medium*. Mitigation: per-tool sentinel + auto-quarantine within 10 parts.
5. **Post-processor regression breaks legacy archived programs** — *high*. Mitigation: P1 byte-equivalence gate on all 6 controllers + CI gate.

---

## Weeks to Pilot Complete

**SFC telemetry-loop ignition (P7 start): ≈29 weeks wall-clock.**
**Master Post telemetry-loop ignition: ≈24 weeks wall-clock.**

First target machine: **Haas-TM-1P-2008** (P2 + P3) — toolroom, $35K, low utilization, MTConnect-equipped, ideal first-touch.

---


_End of REVENUE-ROADMAP-v7.1.md (assembled from round 4 sections)._
