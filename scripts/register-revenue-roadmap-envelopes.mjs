#!/usr/bin/env node
/**
 * register-revenue-roadmap-envelopes.mjs — one-shot tool.
 *
 * Materializes the v7.6 REVENUE-ROADMAP §R-layers (prose) into structured
 * milestone-envelope JSONs in mcp-server/data/milestones/ + entries in
 * mcp-server/data/roadmap-index.json, so atomic-roadmap-emit.mjs / /rgs6 can
 * atomize / chat-split / conflict-predict / viz-bind them.
 *
 * Bakes in the v7.6 corrections (the "noted corrections" scattered in the late
 * §R-layers): the §R8.3 join v4→v5 + categorical-confidence fix, the
 * U-TRAIN-P2P-06 clean-corpus fix, the §R8.2 "~95 pages → all 146" fix, the
 * U-INV-LATHE-06 rescope, the "215 units → pre-§R7 core" relabel, the
 * MS-INFRA scaling-floor decision. Uses ONLY real graph namespaces for
 * viz_node_id (ghost.ms.<id> / eng.<domain>.<name> / fe.page.<name> /
 * D.<dispatcher>.<action>) so the peer's audit-roadmap-viz-bindings.mjs binds
 * cleanly (no invented namespaces).
 *
 * Idempotent: re-running overwrites the revenue envelopes + re-syncs the index
 * entries (matched by id), never duplicates.
 */
import fs from "node:fs";
import path from "node:path";
import { atomicWriteJson } from "./lib/atomic-json.mjs";

const PRISM = "H:/prism";
const ENV_DIR = path.join(PRISM, "mcp-server/data/milestones");
const INDEX_PATH = path.join(PRISM, "mcp-server/data/roadmap-index.json");
const NOW = new Date().toISOString();
const STD_EXIT = [
  "Implementation complete per description",
  "Tests pass: npx vitest run",
  "Typecheck clean: npx tsc --noEmit",
  "Dispatcher wiring verified: import + call + action-enum + Zod schema all match (test invokes through the dispatcher, not only the engine singleton)",
];
const slug = (id) => id.toLowerCase();

// ----------------------------------------------------------------------------
// MILESTONE TABLE — v7.6 revenue roadmap.
// tier: 0 = GA-critical (Revenue Day 1 window) · 1 = post-ship near-term · 2 = background lane · 3 = capstone/long-tail
// dep = blockedBy (must complete first) · blk = blocks (downstream)
// units: either an array of {id,title} or a number N (→ N placeholder units U-<ID>-01..0N)
// ----------------------------------------------------------------------------
const M = [
  // ── Week-0 CI-gate cluster (the self-bootstrapping lead) ────────────────────
  { id: "MS-CI-GATES", title: "Revenue CI-gate cluster — non-stub / wiring / page-wiring / doc-backflow gates",
    tier: 0, dep: [], blk: ["MS-CRITWIRE","MS-PAY","MS-FRONTEND","MS-WIRE-BACKEND","MS-WIRE-FRONTEND","MS0-EXTENSION","MS-DOCFLOW"],
    brief: "The Week-0 cluster that gates every later milestone. Builds the CI scripts that enforce 'no stub, no false-green, every engine wired, every page renders real data'. Self-bootstrapping — the revenue roadmap's first execution work is the tooling the rest of it needs. NOTE: touches scripts/*.mjs + .github/workflows/ci.yml = peer dev-tools/infra lane — coordinate on the chat bus before building; fallback is an MS0-EXTENSION pull page.",
    notes: "§R5.1 B5 / §R7.5 blocker #2 / §R8.1 U-WIRE-BE-P0-01 / §R8.2 U-WF-CI-00 / §R8.5 U-DOCFLOW audit-doc-backflow.mjs",
    units: [
      { id: "U-REV-CI-00a", title: "scripts/check-engine-wired.mjs — assert import+call+action-enum+Zod+round-trip-E2E exist per engine named in a unit; --ci mode" },
      { id: "U-REV-CI-00b", title: "scripts/audit-test-assertion-density.mjs — flag toBeDefined()-only test files (the 16-false-green class)" },
      { id: "U-REV-CI-00c", title: "scripts/audit-stub-engine-returns.mjs — grep dispatched engine outputs for {ok:false,stub:true} / placeholder returns" },
      { id: "U-REV-CI-00d", title: "scripts/spans-config-matrix.mjs — assert ≥3 spanning configs exercised per N-config domain (materials/dialects/machines/CAMs)" },
      { id: "U-REV-CI-00e", title: "expectNotStub(result) test helper" },
      { id: "U-REV-CI-00f", title: "revenue-gates job in .github/workflows/ci.yml running 00a-00d, fails the build on violation" },
      { id: "U-WF-CI-00", title: "scripts/audit-page-wiring.mjs — AST: every page imports ≥1 hook/client + E2E renders non-empty data; produce the explicit ~146-row FRONTEND_WIRING_MATRIX.json (NOT just the AST check — 'every page' must be a checklist not a clause)" },
      { id: "U-DOCFLOW-AUDIT", title: "scripts/audit-doc-backflow.mjs — assert CLAUDE.md/skills/GSD/Obsidian/system-viz/memories updated when the code surface they describe changed" },
      { id: "U-WIRE-BE-P0-01", title: "scripts/wiring-batch.mjs — engine→dispatcher wiring batch tool (drives the ~756-engine MS-WIRE-BACKEND) + audit-script upgrade" },
    ] },

  // ── MS0 extension (the pull-forward units) ──────────────────────────────────
  { id: "MS0-EXTENSION", title: "MS0-EXTENSION — pull-forward customer-facing pages (xpost / archive / quote-to-NC / lights-out / migrate)",
    tier: 0, dep: ["MS-CI-GATES"], blk: ["MS-FRONTEND"],
    brief: "High-pull MS0 pages hoisted forward per §R5.1 B2/B3/B4 — cross-controller G-code transpiler, customer/program-history search, quote→NC, lights-out readiness, migration. Each = one page + the api-client + a ≥3-controller/≥3-config span test.",
    notes: "§R5.1 B2 (cross-controller rewrite), B3 (customer-program reuse search), B4 (6 high-pull surfaces)",
    units: [
      { id: "U-REV-XPOST-01", title: "CrossControllerTranspilerPage + api/gcode.ts → /gcode/transpile{,/verify,/capability-gate} (5-dialect span test through cam_gcode_transpile / dialect_translate)" },
      { id: "U-REV-XPOST-02", title: "routes/gcode.ts backend — /gcode/transpile, /gcode/transpile/verify, /gcode/transpile/capability-gate" },
      { id: "U-REV-XPOST-03", title: "Capability-gate matrix — per-controller feature support, surfaced in the transpiler UI" },
      { id: "U-REV-ARCHIVE-01", title: "ArchiveSearchPage + api/archive.ts → /archive/{search,similar-part} (customer/program-history search over the 38,251-file JM-Die index)" },
      { id: "U-REV-ARCHIVE-02", title: "routes/archive.ts backend — /archive/search, /archive/similar-part" },
      { id: "U-REV-QUOTE-NC-01", title: "QuoteToNcPage + routes/quote-to-nc.ts — quote → process plan → NC draft" },
      { id: "U-REV-LIGHTSOUT-01", title: "LightsOutReadinessPage + routes/lights-out.ts — lights-out feasibility verdict" },
      { id: "U-REV-MIGRATE-01", title: "routes/migrate.ts + a migration wizard page — import-from-competitor flow" },
    ] },

  // ── MS-CRITWIRE — the SFC critical path ─────────────────────────────────────
  { id: "MS-CRITWIRE", title: "MS-CRITWIRE — wire the SFC critical path (8 engines + 3 actions, de-stub 6 mill actions, post_process callOrThrow)",
    tier: 0, dep: ["MS-CI-GATES"], blk: ["MS-SFC-CALIBRATE","MS-PRINT-PROGRAM-LOOP"],
    brief: "The real SFC critical path (round-3.5's '5 net-new engines / 14 days' was empirically false — all 5 exist, 4 wired). Wire the 8 SFC engines to prism_calc/prism_safety, surface 3 actions, de-stub the 6 mill actions (MillingForceEngine/MillScientificPipelineEngine = 14-15-line stubs; real engine = MillingPhysicsKernelEngine 1,924ln), make post_process a callOrThrow not '?? {post_processed:true}'. Real unwired list = state/shared/UNWIRED-ENGINE-AUDIT-2026-05-07.json (NOT BUILD_STATE's 25-sample).",
    notes: "§R7.2 / round6/05-critwire.md",
    units: [
      { id: "U-CW-01", title: "Wire MachineAwareSpeedFeedEngine → prism_calc + prism_safety" },
      { id: "U-CW-02", title: "Wire ProvenSpeedFeedAggregatorEngine → prism_calc + prism_safety" },
      { id: "U-CW-03", title: "Wire ChatterStabilityLobeEngine → prism_calc + prism_safety (Altintas SLD with Re[Φ(ωc)]≥0 guard)" },
      { id: "U-CW-04", title: "Wire CoolantOptimizationPhysicsEngine → prism_calc + prism_safety" },
      { id: "U-CW-05", title: "Wire SpindleTorqueGateEngine → prism_calc + prism_safety" },
      { id: "U-CW-06", title: "Wire the 3 AI-variant SFC engines (per UNWIRED-ENGINE-AUDIT) → prism_calc + prism_intelligence" },
      { id: "U-CW-07", title: "Wire GilbertEconomicSpeedEngine (254ln, unwired) → prism_calc (lathe_cost_optimize)" },
      { id: "U-CW-08", title: "Surface action deflection_calculate (Timoshenko deflection) on prism_calc" },
      { id: "U-CW-09", title: "Surface action lathe_cost_optimize (7-bucket cost-per-part + Gilbert economic speed) on prism_calc" },
      { id: "U-CW-10", title: "Surface action material_resolve (AISI/DIN/JIS → ISO group + Kienzle/Taylor) on prism_calc" },
      { id: "U-CW-11", title: "De-stub mill_chatter_predict — MillingForceEngine.ts stub → route to MillingPhysicsKernelEngine" },
      { id: "U-CW-12", title: "De-stub mill_scientific_analyze — MillScientificPipelineEngine.ts stub → prism_calc Merchant/Oxley/Zorev chain" },
      { id: "U-CW-13", title: "De-stub the other 4 mill_scientific_* stub actions" },
      { id: "U-CW-14", title: "camDispatcher.ts post_process — replace '?? {post_processed:true}' fallback with callOrThrow" },
      { id: "U-CW-15", title: "U-MONO-MAT-REPOINT — fix mcp-server/src/constants.ts:61 PATHS.MATERIALS_DB → extracted/materials_v9_complete/ (1,047 materials, not the 3-file data/materials/)" },
      { id: "U-CW-16", title: "E2E: SFC recommendation round-trips through all wired SFC actions for ≥3 spanning (material × machine × tool-coating × engagement-regime) cells" },
    ] },

  // ── MS-PAY — the payment path ───────────────────────────────────────────────
  { id: "MS-PAY", title: "MS-PAY — Stripe Checkout + verified webhook + tier gate (the security fix)",
    tier: 0, dep: ["MS-INFRA"], blk: ["MS-MASTERPOST","MS-CAM-MASTERY","MS-PRINT-PROGRAM-LOOP","MS1"],
    brief: "~70% exists. The live Stripe /webhook route's signature verification is a COMMENT not code (anyone can self-grant a paid tier); the verifying impl exists in BillingEngine.handleWebhook (real HMAC-SHA256 + 5-min replay + idempotency) — just wire the route to it. state/shared/feature-tiers.json is referenced as canonical but DOESN'T EXIST; pricing hardcoded in 4 disagreeing places.",
    notes: "§R7.2 / round6/03-pay.md — U-PAY-02 is a SECURITY blocker",
    units: [
      { id: "U-PAY-01", title: "Stripe Checkout flow + verified webhook → tier flag (wire routes/billing.ts /webhook → BillingEngine.handleWebhook → userStore.setPlan; flip STRIPE_TEST_MODE=false)" },
      { id: "U-PAY-02", title: "[SECURITY] Fix the live-route webhook signature verification — it's a comment, not code; StripeBillingEngine.handleWebhookEvent's constructEvent is a no-op in live mode" },
      { id: "U-PAY-03", title: "Mount requireTier middleware on SFC / Master-Post / CAD-CAM / lathe-direct routes" },
      { id: "U-PAY-04", title: "Refresh user.plan per-request (not cached at login)" },
      { id: "U-PAY-05", title: "Billing Portal route + BillingPortalPage (Stripe customer portal)" },
      { id: "U-PAY-06", title: "One state/shared/pricing-config.json + create state/shared/feature-tiers.json (consolidate the 4 disagreeing tables)" },
    ] },

  // ── MS-FRONTEND — the missing pages + RBAC ──────────────────────────────────
  { id: "MS-FRONTEND", title: "MS-FRONTEND — the 5 missing pages + RBAC routes + billing/account UI",
    tier: 0, dep: ["MS-CI-GATES","MS0-EXTENSION"], blk: [],
    brief: "MasterPostUploadPage, PricingPage→Stripe checkout, BillingPortalPage, AccountPage, SignupPage + RBAC route guards. P0 = the 5 pages; P1 = the thin-page enrichment (folds into MS-WIRE-FRONTEND).",
    notes: "§R7.2 / round6/01-frontend.md",
    units: [
      { id: "U-FE-01", title: "MasterPostUploadPage + api/masterpost.ts → /api/v1/masterpost/{generate,upload,result/:id,transpile}" },
      { id: "U-FE-02", title: "MasterPostResultPage" },
      { id: "U-FE-03", title: "routes/masterpost.ts backend" },
      { id: "U-FE-04", title: "PricingPage → Stripe checkout (consumes pricing-config.json)" },
      { id: "U-FE-05", title: "AccountPage + routes/account.ts" },
      { id: "U-FE-06", title: "SignupPage + routes/auth.ts:/signup" },
      { id: "U-FE-07", title: "RBAC route guards — gate admin/HR/payroll/maintenance routes by role" },
      { id: "U-FE-08", title: "BlueprintQuotePage wiring → api/dfm.ts + api/quote.ts (the unwrapped 30-endpoint quote router)" },
      { id: "U-FE-09", title: "QuoteBuilder + the 4 quote-variant pages wired" },
      { id: "U-FE-10", title: "ViewerPage CAD-import wiring → api/cad.ts → /api/v1/cad/{import,features,analyze} (STEP/STL upload) + fold mcp-cadquery script-editor + NL→CadQuery" },
      { id: "U-FE-11", title: "PpgPage / PostProcessorPage / SetupSheetPage wired (fix usePpg.ts — 0 exported hooks today)" },
      { id: "U-FE-12", title: "sfc/free anonymous lead-magnet page + POST /api/v1/sfc/free (no-auth, rate-limited)" },
      { id: "U-FE-13", title: "SfcCalculatorPage / SpeedFeedPage enrichment — wire all 7-8 sfc/speedfeed endpoints (currently 1-of-7 / 2-of-8)" },
      { id: "U-FE-14", title: "E2E: each P0 page renders real non-empty data; revenue pages run the ≥3-controller span" },
    ] },

  // ── MS-INFRA — the licensing backend + Postgres + scaling floor ─────────────
  { id: "MS-INFRA", title: "MS-INFRA — hosted licensing/funnel backend + AuthEngine→Postgres + v1 scaling-floor decision",
    tier: 0, dep: [], blk: ["MS-PAY","MS-DESKTOP"],
    brief: "Tier A = small hosted licensing/funnel backend (Fly/Render: auth + Stripe billing + tier validation + free-tier web tools). AuthEngine is in-memory Maps today; mcp-server/src/db/schema.sql has the unused PG schema. LOCK (§R9.8): job queue + event bus = in-process for v1 (prism_infra:job_enqueue/event_publish/prism_realtime — no broker); Redis(tr.cache)/CDN(tr.cdn)/Object-Store(tr.s3) DEFERRED INDEFINITELY (aspirational v8.89-cloud-scale; must NOT appear on any GA critical path). DNC transfer covered by prism_integration:dnc_* + MS-PILOT.",
    notes: "§R7.2 / round6/02-deploy.md + §R9.8 scaling-floor lock",
    units: [
      { id: "U-INFRA-01", title: "Hosted licensing/funnel backend skeleton (Fly/Render) — auth + tier-validation endpoints" },
      { id: "U-INFRA-02", title: "AuthEngine → Postgres (use mcp-server/src/db/schema.sql; replace in-memory Maps)" },
      { id: "U-INFRA-03", title: "Real Stripe keys + STRIPE_TEST_MODE=false wiring (pairs with MS-PAY)" },
      { id: "U-INFRA-04", title: "License-key issuance + validation (online check → cached offline JWT + CRL; reuse PRISM_SUBSCRIPTION_SYSTEM.js)" },
      { id: "U-INFRA-05", title: "Free-tier web tools served from the hosted backend (SFC-free, etc.) — SEO/acquisition surface" },
      { id: "U-INFRA-06", title: "[LOCK] v1 scaling-floor decision documented — in-process queue/bus; Redis/CDN/S3 deferred indefinitely; revisit only if multi-tenant SaaS at scale" },
      { id: "U-INFRA-07", title: "Telemetry / metrics endpoint (Prometheus scrape) on the hosted backend" },
      { id: "U-INFRA-08", title: "Rate limiter on the public endpoints" },
      { id: "U-INFRA-09", title: "Health-check + uptime monitoring" },
      { id: "U-INFRA-10", title: "Backup + restore for the licensing DB" },
      { id: "U-INFRA-11", title: "Deploy pipeline (CI → Fly/Render)" },
      { id: "U-INFRA-12", title: "E2E: a license key issued by the backend validates from the desktop client (online + cached-offline path)" },
    ] },

  // ── MS-GTM — go-to-market ───────────────────────────────────────────────────
  { id: "MS-GTM", title: "MS-GTM — go-to-market (landing, SEO, free-tier funnel, trial→paid KPI)",
    tier: 0, dep: ["MS-FRONTEND"], blk: [],
    brief: "P0 = the acquisition funnel: landing page, the free SFC web tool as a lead magnet, pricing page, trial→paid conversion instrumentation. The trial→paid KPI is part of MS0-close.",
    notes: "§R7.2 / round6/06-gtm.md",
    units: 16 },

  // ── MS-LEGAL — IP clearance (the hard blocker) ──────────────────────────────
  { id: "MS-LEGAL", title: "MS-LEGAL — IP clearance (alarm DBs + post configs re-derived from public manuals) — U-LEGAL-13 gates ALL paid revenue",
    tier: 0, dep: [], blk: ["MS-MASTERPOST","MS-DESKTOP"],
    brief: "HARD BLOCKER. Alarm DBs reproduced verbatim from manufacturer service manuals (Fanuc B-61395E, Haas 96-0284, Mitsubishi IB-1501279, Siemens 840D, Okuma OSP-P300); post configs carry '// Source: HAAS_VF2_...iMachining_.cps' (derived from Autodesk Fusion/HSMWorks + SolidCAM). Master Post + the bridge 'Post via PRISM' + the desktop build CANNOT SHIP until U-LEGAL-03/04 re-derive from public manuals. SFC is close to clean (Kienzle/Taylor = textbook empirical facts). U-LEGAL-13 ('legally clean to sell') gates ALL paid-tier revenue. Engage IP counsel Week 0 — long-lead. TENSION: the desktop app distributes code+data — conflicts with feedback_no_public_h_drive 'for now' rule; flagged for the user.",
    notes: "§R7.2 / round6/04-legal.md — engage counsel Week 0",
    units: 13 },

  // ── MS-MASTERPOST — the Master Post product line ────────────────────────────
  { id: "MS-MASTERPOST", title: "MS-MASTERPOST — Master Post product line (44 units, Hurco-WinMAX-first controller priority)",
    tier: 1, dep: ["MS-PAY","MS-LEGAL"], blk: ["MS-CAM-MASTERY"],
    brief: "Biggest ARR-per-eng-week unlock — ship first (independent surface, backend ~70% built, 4-week MVP). Controller priority: Hurco WinMAX → Haas → Fanuc → Siemens 840D → Mazatrol → Okuma OSP. GATED on U-LEGAL-13 (the posts must be re-derived from public manuals). PRISM_POST_PROCESSOR_GENERATOR.js (6.5MB) + PRISM_VERIFIED_POST_DATABASE_V2.js (5.6MB) in the monolith are the seed.",
    notes: "§R5.3 / §R7.6 — Hurco-WinMAX-first; gated on MS-LEGAL",
    units: 44 },

  // ── MS1 — subscription billing (deferred) ───────────────────────────────────
  { id: "MS1", title: "MS1 — subscription billing internals (39 units, deferred till there's revenue to bill)",
    tier: 1, dep: ["MS-PAY"], blk: [],
    brief: "The 39 real billing-internal units (invoicing, proration, dunning, usage metering, etc.). Deferred behind MS-PAY because there's no revenue to bill until the Checkout+webhook+tier-gate path is live.",
    notes: "§R5.3",
    units: 39 },

  // ── MS2 — node-combination inventions ───────────────────────────────────────
  { id: "MS2", title: "MS2 — node-combination inventions (gated behind U-MS2-STUB-SWEEP)",
    tier: 2, dep: ["MS-CRITWIRE"], blk: [],
    brief: "The combinatoric 'invent new features from node combinations' track. U-INV-LATHE-06 (combinatoric #24, 'print-to-program SaaS — upload print PDF, get NC, per-program fee', tiers T3+T7) RESCOPES to reference MS-PRINT-PROGRAM-LOOP as its implementation, not duplicate it. Gated behind U-MS2-STUB-SWEEP (the 6 stub-trap actions). Off the GA critical path.",
    notes: "§R5.1 B6 (U-MS2-STUB-SWEEP) + §R10.4 (U-INV-LATHE-06 rescope)",
    units: 30 },

  // ── MS4 — drift ─────────────────────────────────────────────────────────────
  { id: "MS4", title: "MS4 — envelope/code drift reconciliation (continuous background lane)",
    tier: 2, dep: [], blk: [],
    brief: "Reconcile drifted milestone envelopes with git reality (audit-roadmap-drift.mjs + reconcile-roadmap-drift.mjs). 2 known drift cases today (MF-MS1, MF-MS2 claim 'completed', git says 'not_started'). Continuous — never on a critical path.",
    notes: "§R8.7 + the BUILD_STATE drift surface",
    units: 8 },

  // ── MS-WIRE-BACKEND ─────────────────────────────────────────────────────────
  { id: "MS-WIRE-BACKEND", title: "MS-WIRE-BACKEND — wire the ~756 unwired engines + disposition ~932 monolith modules (28-category rule matrix)",
    tier: 1, dep: ["MS-CI-GATES"], blk: [],
    brief: "Real list = state/shared/UNWIRED-ENGINE-AUDIT-2026-05-07.json (with suggestedDispatcher), NOT BUILD_STATE's 25-sample. × ~2.05 logical targets ⇒ ~1,550-1,800 new dispatcher action surfaces. 28-category wiring rule matrix (physics→prism_calc+prism_safety; memory→prism_memory+specialized-consumer; lathe→prism_turning+prism_cam+prism_calc; etc.). Driven by scripts/wiring-batch.mjs; gated by check-engine-wired.mjs --ci. ~66 fg batches + ~50 bg. Subsumes the old MS3 (wire-backlog, Lathe-first) + MS3.5 (415-engine backlog) + MS-ML-PLUMBING (289-engine backlog). Also dispositions the ~1,350 orphaned .js modules from the v8.89 monolith (a SEPARATE pool — port backlog).",
    notes: "§R8.1 — Lathe-first, then Other(142)/Machine(17)/Multi(12)/Turning(11)/...",
    units: 60 },

  // ── MS-WIRE-FRONTEND ────────────────────────────────────────────────────────
  { id: "MS-WIRE-FRONTEND", title: "MS-WIRE-FRONTEND — wire all ~146 pages (P0 ~20 + P1 ~45 + P2 ~25) + ~8 route modules + ~12 api-clients",
    tier: 1, dep: ["MS-CI-GATES","MS-FRONTEND"], blk: [],
    brief: "146 pages, 48 hooks, 90 api-clients; backend mounts ~73 route modules but ~32 lack a client. P0 (~20u, gates SFC GA + Master-Post GA): SFC/speed-feed enrichment + Master-Post + xpost/archive/quote-to-NC/lights-out + CAD-viewer/blueprint-quote + billing/account. P1 (~45u, thin-page enrichment batched ~1u/≤4pages): ERP core + lean-ops + shop-floor + process-domain + CAM/CAD + quality/learn/admin + HR/payroll/maintenance. P2 (~25u, the long tail): EVERY remaining page gets ≥1 real backend call + render assertion — this clause must be MATERIALIZED into the explicit 146-row FRONTEND_WIRING_MATRIX.json, not left as a claim. Verification: audit-page-wiring.mjs (static AST + Playwright runtime).",
    notes: "§R8.2 + §R9.8 lock (the P2 'every page' clause must be a materialized checklist)",
    units: 90 },

  // ── MS-TRAIN-DEEP ───────────────────────────────────────────────────────────
  { id: "MS-TRAIN-DEEP", title: "MS-TRAIN-DEEP — 3 model-training fronts (print→CNC-program · print→CAD/CAM · SFC-accuracy calibration loop), 26 units",
    tier: 1, dep: ["MS-CRITWIRE","MS-DOCU-INGEST","MS-RES-NC-MINE"], blk: [],
    brief: "Extends the existing 20-unit MS-TRAIN. The plumbing is wired, NOTHING is trained — ~80 LoRA engines, every checkpoint status:'not_trained' samples:0, base = mistral-7B-v0.1. Front 1 (print→CNC-program, 8u): ~1,330 print↔g-code PNs (the v5 join's exact+loose tiers — categorical confidence, NOT a numeric ≥0.85 threshold) + the 55 verified triples (38 exact >0.95) + the RE-OPTIMIZED 16,558-program lathe corpus (NOT the raw one — the raw archive is a noisy teacher, 38K mistakes); functional-equivalence via cnc_simulate_physics is the GATING metric, edit-distance-to-archive is a SOFT flag. Front 2 (print→CAD/CAM, 7u): ~1,500-2,500 print↔CAD pairs; geometric-similarity + feature-F1 validation. Front 3 (SFC-accuracy calibration loop, 6u): Bayesian calibration of Kienzle/Taylor per (ISO-group × machine × tool-class) cell — see MS-SFC-CALIBRATE. Cross-cutting (5u): the detached-GPU runner needs a real HF/peft backend (the one stub all fronts share — one CUDA GPU ≥16GB, mistral-7B QLoRA overnight; CPU-only inference after 4-bit quant).",
    notes: "§R8.3 — corrections baked in: v4→v5 join, categorical confidence, clean lathe corpus for U-TRAIN-P2P-06, drop MinerU",
    units: 26 },

  // ── MS-SFC-CALIBRATE ────────────────────────────────────────────────────────
  { id: "MS-SFC-CALIBRATE", title: "MS-SFC-CALIBRATE — Stacked Bayesian Model Averaging over a regime-routed ensemble with a physics-prior backbone, 24 units",
    tier: 0, dep: ["MS-CRITWIRE","MS-RES-NC-MINE","MS-RES-TOOLDB-IMPORT"], blk: ["MS-CAM-MASTERY"],
    brief: "SFC recommendation = combined output of every force/tool-life/chatter/chip/thermal/deflection model (~120 prism_calc actions across ~80 engines: Kienzle/Merchant/Oxley/Zorev/Piispanen, Taylor/Gilbert/Usui, chip-thinning h_ex=fz·sin(κ)·sin(φ_ex) with φ_ex=arccos(1−2ae/D), Timoshenko deflection, Loewen-Shaw thermal, Altintas SLD with Re[Φ(ωc)]≥0 guard, Brammertz finish) calibrated against {HSMAdvisor (0.79% RPM / 4.49% feed delta — the 2,676-scenario UIA-scrape sweep at H:/prism/output/hsmadvisor-live-*; NO install on H:), G-Wizard, FSWizard, Harvey/Helical 'Machining Advisor Pro', Sandvik CoroPlus (the Kienzle anchor <2%), Kennametal NOVO, Walter, ISCAR/Seco/Tungaloy, the 1,047-material vendor cutting DBs + the IM_Tool_DB 5,893 cutting profiles, the 24,545 JM-Die proven programs (ground truth, after re-optimization), ~3,700 tribal tips, ISO 3685/Machinery's Handbook}. Synthesis = Stacked Bayesian Model Averaging over a regime-routed ensemble with a physics-prior backbone (never a black box; each clamp is a hard physical constraint). Sampling = Tier-0 (~300 cells JM Die actually runs) → Taguchi OA → LHS fill → adversarial (~600-700 cells, NOT the ~400K full Cartesian). Each (op × machine × material × tool-coating × engagement-regime) cell must hit ≥85% empirical conformal coverage before claiming Omega 1.0. Target ≥90% of predictions within ±15% measured Fc / ±20% measured tool-life per calibrated cell (envelope baseline ≈±30%).",
    notes: "§R8.4 — the Omega-0.75→1.0 pricing lever",
    units: 24 },

  // ── MS-VIZ-ROADMAP-BIND (SHARED with peer) ──────────────────────────────────
  { id: "MS-VIZ-ROADMAP-BIND", title: "MS-VIZ-ROADMAP-BIND — bind the roadmap to system-viz ghost-nodes (SHARED LANE — converge with the peer's audit-roadmap-viz-bindings.mjs)",
    tier: 1, dep: ["MS-CI-GATES"], blk: [],
    brief: "Each roadmap unit becomes a viz node; unbuilt = ghost; closing it lights up the corresponding engine/dispatcher node. SHARED with the peer chat (they're building scripts/audit-roadmap-viz-bindings.mjs — currently EXIT-FAILS=103 on the backend-devtools roadmap because its units invent viz namespaces). Co-design ONE canonical viz_node_id resolver using ONLY real graph namespaces (eng.<domain>.<name>, fe.page.<name>, D.<dispatcher>.<action>, ghost.ms.<milestone>.<unit>). Build scripts/roadmap-to-viz-nodes.mjs + ghost-node schema + scripts/reconcile-roadmap-vs-viz.mjs + a doc_propagation field on each unit. Coordinate before building — this chat will only add viz_node_id + doc_propagation to the revenue-roadmap envelopes; the peer owns the binding script.",
    notes: "§R8.6 — SHARED; peer is partway in (commit 21a128ccb, work/rgs6-audit-v2)",
    units: 10 },

  // ── MS-DOCFLOW (the doc-backflow cross-cutting rule) ────────────────────────
  { id: "MS-DOCFLOW", title: "MS-DOCFLOW — doc-backflow rule + audit (update CLAUDE.md/skills/GSD/Obsidian/system-viz/memories as you build)",
    tier: 0, dep: ["MS-CI-GATES"], blk: [],
    brief: "Cross-cutting rule: every code-surface change re-propagates to its docs. The audit-doc-backflow.mjs gate (built in MS-CI-GATES) enforces it; this milestone is the rule + the per-domain doc-update playbooks (the §R9 CAM-mastery entries EXTEND knowledge/wiki/architecture/_leaf-index.jsonl per the viz-obsidian-brain directive — don't fork a parallel surface).",
    notes: "§R8.5 — U-DOCFLOW",
    units: 4 },

  // ── MS-CAM-MASTERY ──────────────────────────────────────────────────────────
  { id: "MS-CAM-MASTERY", title: "MS-CAM-MASTERY — PRISM as expert CAD/CAM operator + bridge add-ins (Fusion > hyperCAD/hyperMILL > Mastercam > Inventor > SolidWorks > Esprit)",
    tier: 1, dep: ["MS-MASTERPOST","MS-PAY","MS-SFC-CALIBRATE","MS-RES-CADCAM-DOCS"], blk: [],
    brief: "Per system, 5 pillars: A 'how to CAD' (every sketch/feature/assembly/PMI/drawing tool at click level — *CADFunctionIndexEngine exhaustive + vendor docs + JM-Die CAD corpus); B 'how to use CAM' (every 2D/3D-rough/3D-finish/5-axis/turning/mill-turn/probing strategy + every dialog input + every button — *FunctionIndexEngine + *DeepLearningEngine + strategy catalogs); C function-index completeness + per-system LoRA (CAMLoRAAdapterTrainerEngine); D the PRISM bridge add-in (CAMAddInFrameworkEngine + BatchCAMAddInGenerators + cam-bridge skill): 'Speed&Feed via PRISM' / 'Auto-program via PRISM' / 'Post via PRISM' (subscription post), gated by requireTier; E the Claude orchestration glue over the AI substrate. Only the Fusion P0 cluster (~12-15u — A/B/D for Fusion) is GA-critical (ships at Revenue Day 1); P1 hyperMILL, P2 Mastercam, P3 Inventor, P4 SolidWorks (SolidWorks-CAM function-index may need building), P5 Esprit (gated on U-RES-DOC-08 acquiring source material) are post-ship. The other ~14 CAD/CAM systems stay registered+wired but un-trained until post-ship. AI backbone (tribal/DL/deep-reasoning/algorithms/formulas/SFC/mech-eng/neural/AI-systems/Claude-orch/knowledge+memory) is the SUBSTRATE — all exists; §R9 wires the CAM function-indexes into it.",
    notes: "§R9 — Fusion-first; P0-FUSION is tier-0, P1-P5 tier-1/2",
    units: [
      // P0 — Fusion (GA-critical)
      { id: "U-CAMM-FUS-A", title: "P0 Fusion pillar A — 'how to CAD in Fusion' at click level (Fusion360CADFunctionIndexEngine exhaustive + the deep CAD tutorial pass from U-RES-DOC-01 + the JM-Die Fusion CAD corpus → wiki entity pages)" },
      { id: "U-CAMM-FUS-B", title: "P0 Fusion pillar B — 'how to use Fusion CAM/HSM' (Fusion360FunctionIndexEngine + FusionDeepLearningEngine + every 2D/3D/5-ax/turn/mill-turn/probe strategy + every dialog input → wiki entity pages)" },
      { id: "U-CAMM-FUS-C", title: "P0 Fusion pillar C — function-index completeness audit + the Fusion per-system LoRA adapter (CAMLoRAAdapterTrainerEngine, fusion-tuned)" },
      { id: "U-CAMM-FUS-D1", title: "P0 Fusion pillar D — 'Speed&Feed via PRISM' add-in button (CAMAddInFrameworkEngine → calibrated SFC; requireTier gated) — ships Revenue Day 1" },
      { id: "U-CAMM-FUS-D2", title: "P0 Fusion pillar D — 'Auto-program via PRISM' add-in button (→ the auto-programming chain; requireTier gated) — ships Revenue Day 1" },
      { id: "U-CAMM-FUS-D3", title: "P1 Fusion pillar D — 'Post via PRISM' add-in button (→ the subscription post-processors; requireTier gated) — ships at Master Post GA" },
      { id: "U-CAMM-FUS-E", title: "P0 Fusion pillar E — the Claude orchestration glue (the add-in talks to the local desktop port; Claude orchestrates SFC + auto-program + post + operator-in-the-loop)" },
      // P1 — hyperMILL
      { id: "U-CAMM-HM-A", title: "P1 hyperMILL pillar A — 'how to hyperCAD-S' (HyperCADCADFunctionIndexEngine + the 780-pg manual + OPEN MIND CAD docs + U-RES-DOC-07 curriculum)" },
      { id: "U-CAMM-HM-B", title: "P1 hyperMILL pillar B — 'how to use hyperMILL' (HyperMillFunctionIndexEngine + the 4-vol manual + the hyperMILL strategy catalog + U-RES-DOC-07)" },
      { id: "U-CAMM-HM-C", title: "P1 hyperMILL pillar C — function-index audit + hyperMILL LoRA adapter" },
      { id: "U-CAMM-HM-D", title: "P1 hyperMILL pillar D — the 3-button bridge add-in (hypermill_addin_generate) + the hyperMILL SDK arm from MS-RES-HYPERMILL-SDK" },
      { id: "U-CAMM-HM-E", title: "P1 hyperMILL pillar E — orchestration glue" },
      // P2 — Mastercam
      { id: "U-CAMM-MC-A", title: "P2 Mastercam pillar A — 'how to Mastercam Solids/Design' (MastercamCADFunctionIndexEngine + Getting Started with Mastercam Solids)" },
      { id: "U-CAMM-MC-B", title: "P2 Mastercam pillar B — 'how to use Mastercam' (MastercamFunctionIndexEngine + MastercamDeepLearningEngine + Dynamic Motion/OptiRough/Profit Turning + the BroCam strategy book from U-RES-DOC-03)" },
      { id: "U-CAMM-MC-C", title: "P2 Mastercam pillar C — function-index audit + Mastercam LoRA adapter" },
      { id: "U-CAMM-MC-D", title: "P2 Mastercam pillar D — the 3-button bridge add-in (mastercam_addin_generate)" },
      { id: "U-CAMM-MC-E", title: "P2 Mastercam pillar E — orchestration glue" },
      // P3 — Inventor
      { id: "U-CAMM-INV-A", title: "P3 Inventor pillar A — 'how to Inventor CAD + iLogic' (InventorCADFunctionIndexEngine + U-RES-DOC-06)" },
      { id: "U-CAMM-INV-B", title: "P3 Inventor pillar B — 'how to use Inventor HSM / InventorCAM' (InventorHSMFunctionIndexEngine + InventorCAMFunctionIndexEngine + the 21 InventorCAM PDFs)" },
      { id: "U-CAMM-INV-C", title: "P3 Inventor pillar C — function-index audit + Inventor LoRA adapter" },
      { id: "U-CAMM-INV-D", title: "P3 Inventor pillar D — the 3-button bridge add-in (inventor_hsm add-in)" },
      { id: "U-CAMM-INV-E", title: "P3 Inventor pillar E — orchestration glue" },
      // P4 — SolidWorks
      { id: "U-CAMM-SW-A", title: "P4 SolidWorks pillar A — 'how to SolidWorks CAD' (build SolidWorks-CAD function-index if missing + the ~800-pg Planchard book from U-RES-DOC-02)" },
      { id: "U-CAMM-SW-B", title: "P4 SolidWorks pillar B — 'how to use SolidWorks-CAM / SolidCAM' (BUILD the SolidWorks-CAM *FunctionIndexEngine if it doesn't exist — §R9.0 flag; + the SolidCAM 2.5D training + iMachining)" },
      { id: "U-CAMM-SW-C", title: "P4 SolidWorks pillar C — function-index audit + SolidWorks LoRA adapter" },
      { id: "U-CAMM-SW-D", title: "P4 SolidWorks pillar D — the 3-button bridge add-in (solidcam_addin_generate)" },
      { id: "U-CAMM-SW-E", title: "P4 SolidWorks pillar E — orchestration glue" },
      // P5 — Esprit (gated on source acquisition)
      { id: "U-CAMM-ESP-A", title: "P5 Esprit pillar A — 'how to Esprit CAD' (EspritFunctionIndexEngine — REQUIRES U-RES-DOC-08 to acquire Esprit tutorial source first; lowest priority)" },
      { id: "U-CAMM-ESP-B", title: "P5 Esprit pillar B — 'how to use Esprit CAM' (REQUIRES U-RES-DOC-08)" },
      { id: "U-CAMM-ESP-C", title: "P5 Esprit pillar C — function-index audit + Esprit LoRA adapter" },
      { id: "U-CAMM-ESP-D", title: "P5 Esprit pillar D — the 3-button bridge add-in (esprit add-in)" },
      { id: "U-CAMM-ESP-E", title: "P5 Esprit pillar E — orchestration glue" },
      // Shared
      { id: "U-CAMM-BRIDGE-FRAMEWORK", title: "Shared — CAMAddInFrameworkEngine + BatchCAMAddInGenerators hardening + the cam-bridge skill (HTTP client + UI panel + post integration for any CAM system)" },
      { id: "U-CAMM-FUNCINDEX-CI", title: "Shared — function-index completeness CI gate (per priority system: every *FunctionIndexEngine + *CADFunctionIndexEngine reaches prism_cad AND prism_cam; *_function_index_* actions are queryable)" },
    ] },

  // ── MS-PILOT ────────────────────────────────────────────────────────────────
  { id: "MS-PILOT", title: "MS-PILOT — per-machine pilot on the real JM-Die 15-machine fleet (Haas TM-1P first)",
    tier: 1, dep: ["MS-SFC-CALIBRATE"], blk: [],
    brief: "MUST use the REAL JM-Die fleet (7× Okuma OSP, 2× Haas, 1× Hurco WinMAX, 1× Roku-Roku Fanuc, 2× Mitsubishi sinker, 1× Mitsubishi wire — per jm-die-profile.ts; the v7.1 draft's phantom machines were deleted in §R5.2 U-PILOT-FLEET-REGROUND). Per-machine commissioning (~10h onboarding + overnight GPU): MTConnect/OPC-UA tap → bayesian_predict_force residuals → calibration cells; tool-life cold-start from Taylor C/n + tribal mining; defer FRF chatter calibration to one-time commissioning. Fleet order: Haas TM-1P → 7 Okuma OSP → Hurco WinMAX → Mitsubishi sinker/wire. MS-PILOT = the credibility lever (flips pessimistic→realistic revenue).",
    notes: "§R5.2 (U-PILOT-FLEET-REGROUND) + §R8.4 — Haas TM-1P first",
    units: 20 },

  // ── MS-DESKTOP — the Electron capstone ──────────────────────────────────────
  { id: "MS-DESKTOP", title: "MS-DESKTOP — PRISM Studio (Electron) — the final phase",
    tier: 2, dep: ["MS-INFRA","MS-LEGAL","MS-PAY","MS-CAM-MASTERY"], blk: [],
    brief: "Tier B = PRISM Studio (Electron): bundles the MCP server + React app + Node runtime, runs locally (127.0.0.1 HTTP), validates a license key (online check → cached offline JWT + CRL, reusing PRISM_SUBSCRIPTION_SYSTEM.js), auto-updates, code-signed. The CAM-plugin bridges call the local desktop port. GATED on MS-LEGAL (the desktop build distributes code+data — can't ship until the IP is cleared) + MS-INFRA (the licensing backend) + MS-PAY + MS-CAM-MASTERY (the bridge add-ins). Desktop GA ≈ Week 12-18. TENSION with feedback_no_public_h_drive — flagged for the user.",
    notes: "§R7.1/§R7.2 — the capstone; Week 12-18",
    units: 18 },

  // ── MS-MONOLITH-HARVEST ─────────────────────────────────────────────────────
  { id: "MS-MONOLITH-HARVEST", title: "MS-MONOLITH-HARVEST — 3 quick wins + the ~1,350-module port backlog from the v8.89 monolith",
    tier: 0, dep: [], blk: ["MS-CRITWIRE"],
    brief: "extracted/ (91MB, 895 files, datasets, ~70% bridged) + extracted_modules/ (149MB, ~1048 files, ported JS engine modules, ~95% orphaned) = a 986,622-line HTML build → 1,469 modules / 71 formulas / 20 algorithms / 200 gateway routes; only ~8-12% reachable as live MCP. The ~1,350 orphaned .js modules are a SEPARATE pool from the 875 unwired TS engines. 3 quick wins (tier 0): U-MONO-MAT-REPOINT (1-line PATHS.MATERIALS_DB fix — also in MS-CRITWIRE U-CW-15), U-MONO-CATALOG-WIRE (CatalogRegistryBridgeEngine.enrichAll()), U-MONO-ALGO-SURFACE (surface the 20 monolith algos). The port backlog (tier 2): PRISM_POST_PROCESSOR_GENERATOR.js (6.5MB), PRISM_VERIFIED_POST_DATABASE_V2.js (5.6MB), PRISM_SUBSCRIPTION_SYSTEM.js (8.6MB), PRISM_SIGNAL_ENHANCED.js (7MB), PRISM_PSO_OPTIMIZER.js (8.3MB), PRISM_AI_100_KB_CONNECTOR.js (7.2MB), the PRISM_220_COURSE_* set.",
    notes: "§R6 — the 3 quick wins are tier 0; the port backlog is tier 2",
    units: [
      { id: "U-MONO-MAT-REPOINT", title: "Fix mcp-server/src/constants.ts:61 PATHS.MATERIALS_DB → extracted/materials_v9_complete/ (1,047 materials, not the 3-file data/materials/) — gives SFC the vendor material DB [tier 0; also tracked as MS-CRITWIRE U-CW-15]" },
      { id: "U-MONO-CATALOG-WIRE", title: "CatalogRegistryBridgeEngine.enrichAll() — wire the extracted/ catalogs into the live registries [tier 0]" },
      { id: "U-MONO-ALGO-SURFACE", title: "Surface the 20 monolith algorithms as prism_calc / prism_ai actions [tier 0]" },
      { id: "U-MONO-PORT-POSTGEN", title: "Port PRISM_POST_PROCESSOR_GENERATOR.js (6.5MB) → the Master Post engine (seed for MS-MASTERPOST) [tier 2]" },
      { id: "U-MONO-PORT-POSTDB", title: "Port PRISM_VERIFIED_POST_DATABASE_V2.js (5.6MB) → the verified-post DB [tier 2]" },
      { id: "U-MONO-PORT-SUBSCRIPTION", title: "Port PRISM_SUBSCRIPTION_SYSTEM.js (8.6MB) → the license-key validation engine (reused by MS-INFRA + MS-DESKTOP) [tier 2]" },
      { id: "U-MONO-PORT-SIGNAL", title: "Port PRISM_SIGNAL_ENHANCED.js (7MB) → the signal-processing engine [tier 2]" },
      { id: "U-MONO-PORT-PSO", title: "Port PRISM_PSO_OPTIMIZER.js (8.3MB) → the PSO optimizer engine [tier 2]" },
      { id: "U-MONO-PORT-KB-CONNECTOR", title: "Port PRISM_AI_100_KB_CONNECTOR.js (7.2MB) → the knowledge-base connector [tier 2]" },
      { id: "U-MONO-PORT-220-COURSE", title: "Port the PRISM_220_COURSE_* set → the curriculum (note: algorithm-provenance metadata, NOT a training corpus) [tier 2]" },
      { id: "U-MONO-PORT-BACKLOG", title: "The remaining ~1,340 orphaned .js modules — triage + port the reachable ones (continuous background lane) [tier 2]" },
    ] },

  // ── §R10 — MS-RES-* (the bridged RES-ROADMAP milestones) ────────────────────
  { id: "MS-RES-NC-MINE", title: "MS-RES-NC-MINE (= RES-MS11) — mine the 16,558 production .MIN for shop-proven S/F → SFC calibration layer",
    tier: 0, dep: [], blk: ["MS-SFC-CALIBRATE","MS-TRAIN-DEEP","MS-PRINT-PROGRAM-LOOP"],
    brief: "Path-aware .MIN parser (headers carry zero metadata — material from customer relationship + filename heuristics) → cutting-condition corpus (G85/G87 boring/drilling-dominant; 30,581 hole-making ops) → the 'shop-proven' layer of the §R8.4 calibration cascade. The originals teach 'what RPM did they run', physics CORRECTS it (not 'copy the amateur value'). On the SFC-calibration critical path.",
    notes: "§R10.4 Track C U-PPL-C5b + §R10.1 (= RES-MS11, the April audit's highest-ROI item)",
    units: 4 },

  { id: "MS-RES-TOOLDB-IMPORT", title: "MS-RES-TOOLDB-IMPORT (= RES-MS14) — import IM_Tool_DB.db (5,893 cutting profiles, 58 tables) + 133 Mastercam .tooldb + the Fusion CSV S/F tables → ToolCatalog + FormulaRegistry + calibration data",
    tier: 0, dep: [], blk: ["MS-SFC-CALIBRATE","MS-CAM-MASTERY"],
    brief: "287 .tooldb/.db files: IM_Tool_DB.db 131MB/58 tables (Tools=282, NCTools=1,371, Technologies=1,211, Couplings=396, Formulas=14, CuttingProfiles=5,893, Materials=3) + IM_Macro_DB.db (12 tables) + Automation_Center_Standard_*.db + Training Tools.db 3.5MB + 133 Mastercam .tooldb (ISCAR/Sandvik/Kennametal/Valenite) + 7 Fusion CSV tool libs (225 rows × 26 S/F columns) → ToolCatalog enrichment (~95K→120K+) + FormulaRegistry (+14) + cutting-data calibration. Needs a dedup strategy vs the existing ToolCatalog. The 26-column S/F tables feed the bridge's 'Speed&Feed via PRISM' button. On the SFC-calibration critical path.",
    notes: "§R10.1 (= RES-MS14)",
    units: 4 },

  { id: "MS-RES-CADCAM-DOCS", title: "MS-RES-CADCAM-DOCS (= RES-MS5/6 + the CHM gap + the generic-CNC gap) — extract the CAD/CAM tutorials feeding §R9 pillars A+B (8 units)",
    tier: 1, dep: [], blk: ["MS-CAM-MASTERY"],
    brief: "Per system: hyperMILL best-documented (780-pg manual + OPEN MIND docs ✅); 21 InventorCAM PDFs ✅; Mastercam basics ✅; Fusion CAD-PDF ✅ but no deep mastery layer. GAPS: Esprit has NO source material on disk (U-RES-DOC-08 acquires it — #6 priority, gates nothing); HSMWorks CHM unprocessed; ~800-pg Planchard SolidWorks book unextracted; the deep Fusion CAD/CAM pass not done; the 3 Basic-Training-Day folders uncurated; the ~25 G-code PDFs + CNC-fundamentals books unextracted. U-RES-DOC-01 (deep Fusion) is GA-critical (gates §R9 U-CAMM-FUS-A/B). All entries EXTEND knowledge/wiki/architecture/_leaf-index.jsonl's per-*FunctionIndexEngine entries — don't fork.",
    notes: "§R10.2",
    units: [
      { id: "U-RES-DOC-01", title: "[GA-CRITICAL] Deep Fusion 360 CAD-modeling + CAM-strategy extraction — FUSION CAD.pdf deep-pass + the Fusion CAM training PDFs + the extracted-knowledge/fusion360-cam JSON → per-tool/per-strategy 'how to' entries on the Fusion360CADFunctionIndexEngine/Fusion360FunctionIndexEngine wiki entries. Gates §R9 U-CAMM-FUS-A/B." },
      { id: "U-RES-DOC-02", title: "SolidWorks CAD-modeling extraction — David Planchard 'Engineering Graphics with SOLIDWORKS 2021' (~800 pg) → SolidWorks pillar-A wiki entries" },
      { id: "U-RES-DOC-03", title: "Mastercam BroCam strategy book (~500 pg) + the lathe-specific tutorials → Mastercam pillar-B wiki entries" },
      { id: "U-RES-DOC-04", title: "HSMWorks CHM extraction (HSMWorks.en.chm + HSMWorksParameters.en.chm + post.chm — decompile CHM → HTML → ingest) → a Fusion-HSM CAM-function-index source" },
      { id: "U-RES-DOC-05", title: "Generic CNC fundamentals + ~25 G-code reference PDFs + Haas/Okuma/Mazak/Siemens controller manuals + 2019 MILL INTRO CLASS.pptx → the cadcam-learning-start curriculum + the controller-knowledge layer" },
      { id: "U-RES-DOC-06", title: "Inventor CAD-side + iLogic (Inventor_iLogic_Beyond_Basics.pdf + the Inventor 2027 SDK docs) → Inventor pillar-A wiki entries" },
      { id: "U-RES-DOC-07", title: "hyperMILL Basic-Training-Day curriculum (curate the 1-/2-/3- Basic Training Day folders) + hyperMILL_2D_3D.pdf → hyperMILL pillar-A/B wiki entries + the hypermill-* skill family" },
      { id: "U-RES-DOC-08", title: "[lowest priority] Esprit tutorial acquisition — Esprit has NO source material on disk; acquire (or flag as unavailable) Esprit's CAD/CAM tutorial PDFs. Gates §R9 U-CAMM-ESP-A/B (which carry a 'requires' precondition until this lands). Esprit is #6 — gates nothing critical." },
    ] },

  { id: "MS-RES-XLSM-ENGINE", title: "MS-RES-XLSM-ENGINE (= RES-MS16 core) — decode the Automated Program.xlsm VBA + build the parametric-die-program engine",
    tier: 1, dep: ["MS-PRINT-PROGRAM-LOOP"], blk: [],
    brief: "olevba-decode Automated Program_Corrected 5-25.xlsm's 152KB vbaProject.bin → reverse the 34-dim→geometry math per the 11 die templates (MailBox, MailBox (Square), Altracs, Altracs Orbit, Squares, Heading Die, Single Taptite, 3 Taptites, TD, Template); register the 5+ mill die families as PRISM parametric templates. The existing operator already programs by typing 34 numbers into a sheet → SolidWorks → Mastercam — PRISM wraps that loop and adds print-reading + S/F. WRAP & EXTEND, don't replace. The .idw drawing templates (RES-MS24) pair with these.",
    notes: "§R10.4 Track A U-PPL-A3 + §R10.1 (= RES-MS16 core)",
    units: 5 },

  { id: "MS-RES-MATERIAL-ENRICH", title: "MS-RES-MATERIAL-ENRICH (= RES-MS22) — parse the SolidWorks .sldmat files → MaterialRegistry physical-property enrichment",
    tier: 1, dep: [], blk: [],
    brief: "3 SolidWorks .sldmat files (UTF-16 XML, ~300-500 materials w/ density/elastic-modulus/thermal-conductivity/yield/Poisson/stress-strain) → enrich MaterialRegistry. Fills the audit's 'no tool-steel property tables' gap (M2/D2/S7/A2/H13/carbide/graphite physical props). Feeds prism_mechanical (fixture/tool-stickout deflection) + Kienzle/Taylor calibration for the JM-Die tool-steel families.",
    notes: "§R10.1 (= RES-MS22)",
    units: 3 },

  { id: "MS-RES-FIXTURE-CATALOGS", title: "MS-RES-FIXTURE-CATALOGS (= RES-MS3/19) — parse the 12 workholding vendor catalogs + 116 manufacturer catalogs → WorkholdingRegistry + ToolCatalog/HolderRegistry",
    tier: 2, dep: [], blk: [],
    brief: "12 workholding vendor catalogs (872MB — Kurt/Bison/Schunk/Kitagawa/Jergens/Lang/Mate/Royal/System 3R/5th Axis) + 116 manufacturer catalogs (5.7GB) via /pdf-learn → WorkholdingRegistry + ToolCatalog/HolderRegistry. Feeds cam-fixture/fixture-design-guide accuracy, cam-workholding, the JM-Die fixture-CAD library.",
    notes: "§R10.1 (= RES-MS3 + RES-MS19)",
    units: 4 },

  { id: "MS-RES-POST-CYCLE-LIB", title: "MS-RES-POST-CYCLE-LIB (= RES-MS2/20/25) — index the 2,877 .cyc cycle defs + 280 CPS + OPEN MIND NcGenerator/ReportGenerator → CycleLibrary + PostProcessorRegistry + SetupSheet templates",
    tier: 1, dep: [], blk: ["MS-MASTERPOST"],
    brief: "2,877 .cyc cycle definitions + 280 CPS + ~1,948 CFG (POSTS AND MACHINES/) + OPEN MIND NcGenerator (9 controller configs) + Report Generator (15 lang × 9 XSLT) + HSMWorks setup-sheet template → CycleLibrary + PostProcessorRegistry + SetupSheet templates. IP NOTE: these are vendor .cps/.cyc files — they inform PRISM's UNDERSTANDING of post output but the shipped Master Post must be RE-DERIVED from public manuals (the U-LEGAL-13 blocker). Reference only, not shippable.",
    notes: "§R10.1 (= RES-MS2 + RES-MS20 + RES-MS25) — reference only, IP-blocked from shipping",
    units: 5 },

  { id: "MS-RES-HYPERMILL-SDK", title: "MS-RES-HYPERMILL-SDK (= RES-MS7/15/23) — map the 2,110 hyperMILL SDK Python scripts + IM_Macro_DB → the hyperMILL automation engine + the bridge add-in's hyperMILL arm",
    tier: 1, dep: [], blk: ["MS-CAM-MASTERY"],
    brief: "2,110 hyperMILL SDK Python scripts (OPEN MIND/Shared/.../python/ — om.cad.core/om.cam.core: boolean ops, curve tools, electrode design, stock calc, job renumber, 40+ .sub automation subroutines, hmAutoColor API, TDM-Systems integration) + IM_Macro_DB.db (12 tables: Macro/Feature/Job/Machine/Material) + Automation_Center_Standard_*.db + CamPlanTech.zip → hyperMILL automation engine + the bridge add-in's hyperMILL arm. NOTE: sequence_control.xlsx referenced in the April handoff was NOT found on disk — appears to be the IM_Macro_DB Job/Feature tables; verify. Feeds §R9 hyperMILL pillars C/D/E (post-ship). RES-MS27's SDK patterns are the source for the web 3D-generator (folds into MS-WIRE-FRONTEND's CAD-viewer page).",
    notes: "§R10.1 (= RES-MS7 + RES-MS15 + RES-MS23; RES-MS27 SDK patterns)",
    units: 4 },

  { id: "MS-RES-FORMULA-ALGO", title: "MS-RES-FORMULA-ALGO (= RES-MS1/9) — parse the 3 PRISM_*.js formula files + the MIT-course algorithms → FormulaRegistry + AlgorithmRegistry",
    tier: 2, dep: [], blk: [],
    brief: "3 MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS/PRISM_*.js files (315KB: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js 156KB, PRISM_UNIVERSITY_COURSE_REFERENCE_v1.js 126KB, PRISM_ADVANCED_CROSS_DOMAIN_v1.js 33KB) → FormulaRegistry 109→509. MIT COURSES/ (9.5GB, 1,106 files, 50+ course ZIPs) + ALGORITHM_REGISTRY.json + MIT_COURSE_INDEX.json → AlgorithmRegistry (target 79). Background lane (feeds §R8.4 calibration coverage + prism_calc breadth).",
    notes: "§R10.1 (= RES-MS1 + RES-MS9)",
    units: 4 },

  { id: "MS-RES-MACHINE-MODELS", title: "MS-RES-MACHINE-MODELS (= RES-MS4) — ingest the 306 OEM machine STEP models → MachineRegistry / digital-twin",
    tier: 2, dep: [], blk: ["MS-PILOT"],
    brief: "306 OEM machine STEP models (GENERIC MACHINE MODELS/, MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION/) → MachineRegistry + the digital-twin/simulation surface (cnc_simulate). Background lane; feeds MS-PILOT's per-machine commissioning.",
    notes: "§R10.1 (= RES-MS4)",
    units: 4 },

  // ── §R10 — Docustrata ───────────────────────────────────────────────────────
  { id: "MS-DOCU-FINISH", title: "MS-DOCU-FINISH — finish the live Docustrata phase-15 extraction + full phase-8 classifier pass + the v5 rejoin",
    tier: 0, dep: [], blk: ["MS-DOCU-INGEST","MS-TRAIN-DEEP"],
    brief: "Phase 15 deep-OCR is RUNNING NOW (~47% done as of 2026-05-11, ETA ~8 hrs — no work, just wait). U-DOCU-01 = wait + emit the final corpus snapshot; the 673 huge-container PDFs get the chunked driver. U-DOCU-02 = run the phase-8-tiered classifier (image heuristic → Tesseract title-block → vision LLM) over the full 120K candidate pages → title-block extraction for the ~13K+ drawing-likely pages (~4,500 net-new usable prints; note phase-5e vision-validate found ~5.4% real-PRINT precision in the candidate pool so ~13K 'drawing-likely' ≈ ~1,200-1,500 true drawings). U-DOCU-03 = join v5 — rejoin against the phase-15 deep-OCR PN list + the full 38,251-file JM-Die index (v3/v4 only joined the phase-8/cleaned 466 PNs; v5 likely rescues thousands from the 3,142 'miss'). DROP MinerU (phase 10) — it crashed (torch abort), 0 PNs.",
    notes: "§R10.3 — U-DOCU-01 ≈ the existing §R8.3 U-TRAIN-P2P-01 (mark IN PROGRESS, not net-new)",
    units: [
      { id: "U-DOCU-01", title: "Complete phase-15 deep-OCR (~21,063-doc / ~120K-page queue, already running) + emit final phase15-summary.md + run the chunked driver on the 673 huge-container PDFs" },
      { id: "U-DOCU-02", title: "Phase-8-tiered classifier over the full 120K candidate pages → title-block extraction for the ~13K+ drawing-likely pages → prints-corpus-full.jsonl (~4,500 net-new usable prints)" },
      { id: "U-DOCU-03", title: "Join v5 — rejoin against the phase-15 deep-OCR PN list + the full 38,251-file JM-Die index → blueprint-program-join-full-v5.jsonl with final exact/loose/ambiguous counts" },
    ] },

  { id: "MS-DOCU-INGEST", title: "MS-DOCU-INGEST — persist the join + the 55 verified triples into a queryable engine; back-annotate the JM-Die archive",
    tier: 1, dep: ["MS-DOCU-FINISH"], blk: ["MS-TRAIN-DEEP","MS-PRINT-PROGRAM-LOOP"],
    brief: "U-DOCU-04 = persist blueprint-program-join-full-v5.jsonl + training-triples-v4.jsonl (the 55 verified, 38 exact >0.95) into PairedPrintProgramBundleEngine (currently a STUB: annotations:['Pipeline pending — bundle stub retained']) + add a prism_dev/prism_cam lookup action (print_for_program(path) / program_for_print(pn)) + auto-ingest on SessionStart or via cron. U-DOCU-05 = back-annotate the JM-Die archive (= MS-PRINT-PROGRAM-LOOP Track D U-PPL-D1's first step) — for every program path in the v5 join with exact/loose confidence, write a sidecar/prism_parts entry pointing at its print doc_id + Docustrata path (~5K-7K reachable today). FAIL LOUD (R12): flag the ~16K g-code + ~15K CAM-project programs WITHOUT a print pointer as a known gap — full coverage isn't reachable from Docustrata alone.",
    notes: "§R10.3 — U-DOCU-04 de-stubs PairedPrintProgramBundleEngine; U-DOCU-05 overlaps Track D U-PPL-D1",
    units: [
      { id: "U-DOCU-04", title: "Persist the v5 join + the 55 verified triples into PairedPrintProgramBundleEngine (de-stub it) + lookup actions + auto-ingest" },
      { id: "U-DOCU-05", title: "Back-annotate the JM-Die archive with print pointers (the ~5K-7K reachable; flag the ~31K without as a known gap) — overlaps MS-PRINT-PROGRAM-LOOP Track D" },
    ] },

  // ── §R10 — MS-PRINT-PROGRAM-LOOP (the 4-track closed loop) ─────────────────
  { id: "MS-PRINT-PROGRAM-LOOP", title: "MS-PRINT-PROGRAM-LOOP — the 4-track print→program closed loop (templates / re-optimize / lathe-knowledge-direct / back-annotate), ~22 units",
    tier: 1, dep: ["MS-PAY","MS-CRITWIRE","MS-DOCU-INGEST","MS-RES-NC-MINE"], blk: ["MS-RES-XLSM-ENGINE","MS-TRAIN-DEEP"],
    brief: "All 4 capabilities built on EXISTING engines + one orchestrator per track. ANTI-DUP (extend/compose, NEVER fork): ProvenPartRecipeEngine, GCodeIntelligencePipelineEngine, TurningProgramAssemblerEngine, BlueprintProgramJoinEngine, ProgramMemoryEngine, PartLibraryEngine, LatheProgramOptimizerEngine, MillProgramOptimizerEngine, LathePartClassifierEngine — run duplicationGuardEngine.checkBeforeCreating() on every new engine. U-INV-LATHE-06 (the MS2 combinatoric print-to-program-SaaS unit) RESCOPES to reference this milestone. Track C (lathe-knowledge-direct) is Revenue-Day-1-eligible per the §R10.5 lock (turned parts bypass CAD/CAM — the dominant class, 16,558 .MIN → ~8-14 archetypes). U-PPL-D5 (the .mcx-8 binary parser) is the highest-leverage unit — unlocks all the mill arms (the .mcx-8 are unreadable binaries today; MILL_AI_TRAINING_REPORT cold at 27 programs because of it).",
    notes: "§R10.4 — Track C is tier-0-eligible; Tracks A/B/D + U-PPL-D5 are tier 1-2",
    units: [
      // Track A — templates
      { id: "U-PPL-A1", title: "[Track A] U-MIN-FINGERPRINT (= RES-MS26) — structural-fingerprint the 16,558 turning .MIN → cluster into the 8-14 macro families (seed: ProgramMacroConverterEngine + LATHE_AI_TRAINING_REPORT's 14 patterns + the 7 hand-built .MIN templates in Resources/MACRO PROGRAMS/)" },
      { id: "U-PPL-A2", title: "[Track A] U-FAMILY-PARAM-EXTRACT — per family, extract the 8-15 driving parameters (ODs/lengths/bore-dia/thread-spec/chamfers) — the turning analogue of the .xlsm's 34 dims" },
      { id: "U-PPL-A3", title: "[Track A] MS-RES-XLSM-ENGINE core — olevba-decode the .xlsm's vbaProject.bin → reverse the 34-dim→geometry math per the 11 die templates; register the mill die families as PRISM parametric templates (wrap & extend) — see MS-RES-XLSM-ENGINE" },
      { id: "U-PPL-A4", title: "[Track A] MachineDomainTemplateLibraryEngine (NEW) — registry of parametric program skeletons keyed by (partFamily, machineDomain, controller); each refs a ProvenRecipe + a GCodeTemplate parametrization; wire to prism_proven_pipeline (template_register/get/list/instantiate) + prism_cam" },
      { id: "U-PPL-A5", title: "[Track A] MillPartClassifierEngine (NEW — mill counterpart of LathePartClassifierEngine) — prismatic/2.5D-pocket/3D-mold/thin-wall families with default workholding/strategy/op-sequence templates; wire to prism_mill + prism_cad. DEPENDS on U-PPL-D5 (the .mcx parser, for mill family fingerprinting)" },
      { id: "U-PPL-A6", title: "[Track A] Wire proven_generate_pipeline → final G-code; add proven_generate_program — bridge adapted-recipe → TurningProgramAssemblerEngine (turning) / MillingPrintToProgramEngine (mill) → emit. New action prism_proven_pipeline:proven_generate_program" },
      { id: "U-PPL-A7", title: "[Track A] DieCavityBatchProgramEngine (NEW) — parts CSV → per-row parametric template instantiation → batch .MIN emit; wire to prism_cam + prism_business (models the DrawByCSV.dvb loop)" },
      // Track B — re-optimization
      { id: "U-PPL-B1", title: "[Track B] ProgramReoptimizationOrchestratorEngine (NEW — the front door) — detect process → route to LatheProgramOptimizerEngine / MillProgramOptimizerEngine → GCodeSafetyAnalyzerEngine fix-pass (add M30, add G50 cap on every G96, fix rapid-to-stock) → ProgramPhysicsOptimizerEngine per-block S/F → emit unified diff + cycle-time-delta + safety-score-delta; wire to prism_cam (program_reoptimize) + prism_turning (lathe_program_reoptimize) + prism_mill (mill_program_reoptimize) + prism_dev (program_audit). Compose GCodeIntelligencePipelineEngine, don't fork" },
      { id: "U-PPL-B2", title: "[Track B] Wire the optimizer engines to all logical dispatchers — MillProgramOptimizerEngine is skill-only → add prism_cam:program_optimize + prism_mill:mill_program_optimize; LatheProgramOptimizerEngine is prism_turning-only → add prism_cam:program_optimize" },
      { id: "U-PPL-B3", title: "[Track B] ArchiveReoptimizationBatchEngine (NEW — extends ProductionBatchOptimizationEngine) — run the orchestrator over the JM-Die archive (16,558 .MIN first; ~9K .mcx after U-PPL-D5), infer material from the customer→material map, aggregate $-savings/cycle-time/safety-fixes, per-customer before/after report, output to a parallel 'optimized' tree. Replace prism_data:box_batch_optimize's heuristic backend. Target lathe median 80→~95+. DEPENDS on U-PPL-C5 (calibrated S/F) + U-PPL-D5 (for the .mcx arm)" },
      { id: "U-PPL-B4", title: "[Track B] U-CLEAN-TRAINING-SET + re-optimization review loop — designate the re-optimized programs as the LATHE/MILL LoRA CLEAN training corpus (lathe-engine-registry.json, lathe_lora_dataset_build); keep originals only as the mistake-exemplar pool; re-train the LATHE LoRA cluster on the clean set; physics-reviewer + safety-reviewer agents spot-check a stratified sample — regressions flow back to U-PPL-B3; FAIL LOUD (never ship a re-optimized program the safety gate rejects). Feeds MS-TRAIN-DEEP U-TRAIN-P2P-06 (which now consumes the CLEAN corpus)" },
      // Track C — lathe-knowledge-direct
      { id: "U-PPL-C1", title: "[Track C] U-LATHE-MIN-DIALECT-POST — a dedicated post for JM-Die's Okuma OSP .MIN dialect ($<name>.MIN% header, M1/NSTRT/NBAR/DEF WORK//CALL OBAR bar-pull, T010101 triple-tool blocks, G50 cap, G85/G87 rough/finish pair NOT G71/G70, G74 peck, M30, the part-counter common-variable macro, grab-pull-cutoff on the Multus sub-spindle); seed from JM DIE/CNC OKUMA MULTUS/USE AS TEMPLATE.min + MARK'S COMMON VARIABLES PART COUNTER.min etc.; extends lathe-postgen/lathe-master-post" },
      { id: "U-PPL-C2", title: "[Track C] U-CUSTOMER-MATERIAL-MAP (= RES-MS21 core) — learned customer→material map (.MIN headers are blank; material from the customer relationship + filename heuristics like '4140 ROLLER', 'M5', 'HRC-52-54'); source: LATHE_AI_TRAINING_REPORT's customersAnalyzed + filename parsing + the back-annotated prints (material 57% of the time). Feeds Track B U-PPL-B3" },
      { id: "U-PPL-C3", title: "[Track C] Wire prism_machining_kb knowledge into TurningProgramAssemblerEngine — replace its inline material DB with kb_lookup_kienzle/kb_lookup_speed/kb_lookup_chip_load; pull turret/cycle/controller-block knowledge from kb_get_turret_layout/kb_get_css_g97_logic/kb_get_controller_blocks/kb_get_grooving_parting_rules/kb_optimize_hole_sequence" },
      { id: "U-PPL-C4", title: "[Track C] LatheKnowledgeDirectProgrammerEngine (NEW — the front door) — plain-text part description → (via the lathe-tuned NL parser U-PPL-C5a) → structured TurningInput → TurningProgramAssemblerEngine (now KB-backed per C3) → prism_calc:speed_feed (material-aware, calibrated per C5b) → kb_get_css_g97_logic → turning_process_plan → prism_turning:turning_assemble_program → U-LATHE-MIN-DIALECT-POST → validated .MIN. NO CAD STEP. Optional 'snap to nearest proven part/family' via MachineDomainTemplateLibraryEngine. Wire to prism_turning (turning_knowledge_direct_program) + a /lathe-direct skill. [Revenue-Day-1-eligible per §R10.5]" },
      { id: "U-PPL-C5", title: "[Track C] LatheNLPartParserEngine (a) + U-NC-MINING-CALIBRATE (b, = RES-MS11 = MS-RES-NC-MINE) — (a) a lathe-tuned NL parser (extend nlp_cam_parse): 'turn down to X for Y', 'single-point N-pitch thread', 'part off at Z', 'OD groove W wide', stock-form/material/finish extraction, ISO-2768 defaults; wire to prism_cam:nlp_cam_parse_lathe. (b) see MS-RES-NC-MINE — mine the 16,558 .MIN for shop-proven S/F → calibrate prism_calc:speed_feed to JM-Die's machines" },
      { id: "U-PPL-C6", title: "[Track C] LatheMachineDomainKnowledgeProfileEngine (NEW) — per-JM-Die-machine knowledge profile (turret config, preferred roughing cycle G85 vs G87, shop-standard header/footer, controller dialect, bar-feeder presence) that pre-configures U-PPL-C4's emission; wire to prism_turning. Compose LatheMachineIntelligenceEngine + ShopConfigurationEngine + LathePrintProgramEmitterEngine, don't fork" },
      { id: "U-PPL-C7", title: "[Track C] U-LATHE-DIRECT-SAFETY-GATE — every emitted .MIN runs the LATHE-HARDENED safety pipeline (envelope + spindle-torque + stock-boundary + safety-predicate gates) + the mistake-detector from LATHE_AI_TRAINING_REPORT (must NOT reproduce the 92.5% missing-M30, 56% missing-G50 patterns); operator-in-the-loop before it touches a machine" },
      // Track D — back-annotation
      { id: "U-PPL-D1", title: "[Track D] ProgramPrintLinkIndexEngine (NEW — extends BlueprintProgramJoinEngine with a persist+index mode) — run the join over the full phase-8/15 corpus + persist as blueprint-program-join-full-v5.jsonl + build the index (lookup_print_for_program(path), lookup_programs_for_print(pn), coverage_report()); add a robust JM-Die PN normalizer (handles T8047D3 ITW vs C2500-2497 SCREWS vs 9082526 AGRATI vs BU-1365-0000-002 TFI; strips -R/-L/OP10/SIDE-A/setup/customer-prefix suffixes); seed the join from the PROGRAM side too (every .MIN/.mcx/.ipt filename → look for a matching print); wire to prism_dev (program_print_link_lookup, program_print_link_coverage) + prism_data" },
      { id: "U-PPL-D2", title: "[Track D] Add print-pointer fields (linkedBlueprintPath/linkedBlueprintConfidence/linkedBlueprintPage) to ProgramMemoryEngine's ProgramRecord + LatheProgramCatalogEngine's entries; auto-populate from ProgramPrintLinkIndexEngine on box_program_memory_save / catalog ingest; new action prism_data:box_program_memory_link_print" },
      { id: "U-PPL-D3", title: "[Track D] ArchiveToPartsCatalogIngesterEngine (NEW) — walk the JM-Die archive (38,251 files), for each program create/update a prism_parts Part (keyed by normalized PN), attach the program file AND (via the link index) the print PDF, record the confidence; wire to prism_parts (part_ingest_from_archive) + prism_dev. Makes the parts catalog the join hub" },
      { id: "U-PPL-D4", title: "[Track D] Rebuild cad-file-index/master-index.json from the CAD half of the archive (.ipt/.iam/.f3d/.SLDPRT/.MIN — treat CAD files as program-equivalent for mill jobs) so the CAD-program join stops missing (currently only 38 print→CAM-project hits); extend CADRegistryEngine / the CAD-index scanner. May overlap MS-RES-MACHINE-MODELS / RES-MS10 — check cad_registry_scan first" },
      { id: "U-PPL-D5", title: "[Track D] U-MCX-BINARY-PARSER (the highest-leverage unit) — Mastercam .mcx-8/.mcx/.mcx-6 reader (Mastercam-API automation OR reverse-engineered binary format) so the ~9,000 mill/EDM toolpath files get PN + tools + S/F + op-sequence extracted. Unlocks: mill back-annotation (D1's mill seed), a real MILL_AI_TRAINING_REPORT (cold at 27 today ONLY because of this), mill archive re-opt (B3's mill arm), mill family fingerprinting (A5). High effort, high payoff. DEPENDS on a Mastercam install + automation API, OR a reverse-engineering effort" },
    ] },
];

// ----------------------------------------------------------------------------
// Emit envelopes + sync the index.
// ----------------------------------------------------------------------------
function mkUnits(spec, msId) {
  if (Array.isArray(spec)) {
    return spec.map((u, i) => ({
      id: u.id || `U-${msId}-${String(i + 1).padStart(2, "0")}`,
      title: u.title,
      effort: u.effort || 90,
      dependencies: u.dependencies || [],
      exit_conditions: STD_EXIT,
      description: u.title + " — follow the 4-LOOP (BUILD → SCRUTINIZE → GAP FILL → TIE UP); run duplicationGuardEngine.checkBeforeCreating() before any new asset; wire to ALL logical dispatchers; doc-backflow per MS-DOCFLOW.",
      four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      viz_node_id: `ghost.ms.${slug(msId)}.${(u.id || `u${i + 1}`).toLowerCase().replace(/^u-?/, "u")}`,
      doc_propagation: ["wiki", "skill", "digest", "system-viz"],
    }));
  }
  // numeric count → placeholder units
  const n = spec;
  return Array.from({ length: n }, (_, i) => ({
    id: `U-${msId}-${String(i + 1).padStart(2, "0")}`,
    title: `${msId} unit ${i + 1} of ${n} (placeholder — enumerate from the §R-layer prose during execution)`,
    effort: 90,
    dependencies: [],
    exit_conditions: STD_EXIT,
    description: `${msId} unit ${i + 1} — follow the 4-LOOP; consult the §R-layer prose in REVENUE-ROADMAP-v7.6.md for the concrete deliverable; run duplicationGuardEngine.checkBeforeCreating() before any new asset.`,
    four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
    viz_node_id: `ghost.ms.${slug(msId)}.u${String(i + 1).padStart(2, "0")}`,
    doc_propagation: ["wiki", "skill", "digest", "system-viz"],
  }));
}

let written = 0;
const indexAdds = [];
for (const ms of M) {
  const units = mkUnits(ms.units, ms.id);
  const envelope = {
    id: ms.id,
    version: "7.6.0",
    title: ms.title,
    brief: ms.brief,
    created_at: NOW,
    created_by: "claude-99eca613 (register-revenue-roadmap-envelopes.mjs, v7.6 §R10)",
    track: "revenue",
    track_name: "REVENUE-ROADMAP v7.6",
    // roadmap_priority: lower sorts FIRST. devtools/everything-else = 0 (default
    // when absent); revenue = 1 — so backend-dev work leads. The emit's sort key
    // should be (tier, roadmap_priority, aiPriority, leverage) [option a — revenue
    // tier-0 still beats devtools tier-1] OR (roadmap_priority, tier, ...) [option b
    // — entire devtools roadmap before any revenue]; that placement is the emit's
    // call (peer-lane). The field is here so it's ready the moment that lands.
    roadmap_priority: 1,
    tier: ms.tier,
    status: ms.status || "not_started",
    source: ms.notes,
    viz_node_id: `ghost.ms.${slug(ms.id)}`,
    doc_propagation: ["claude.md", "gsd", "wiki", "system-viz"],
    dependencies: ms.dep,        // blockedBy
    blocks: ms.blk,
    phases: [
      {
        id: "P0",
        title: ms.title,
        sessions: String(Math.max(1, Math.ceil(units.length / 4))),
        units,
      },
    ],
    total_units: units.length,
    completed_units: 0,
  };
  fs.writeFileSync(path.join(ENV_DIR, `${ms.id}.json`), JSON.stringify(envelope, null, 2));
  written++;
  indexAdds.push({
    id: ms.id, title: ms.title, track: "revenue", status: envelope.status,
    tier: ms.tier, roadmap_priority: 1, total_units: units.length, completed_units: 0,
    dependencies: ms.dep, blocks: ms.blk,
    envelope_path: `milestones/${ms.id}.json`,
    priority: ms.tier === 0 ? "CRITICAL" : ms.tier === 1 ? "HIGH" : "MEDIUM",
    sessions_p50: Math.max(2, Math.ceil(units.length / 4)),
    sessions_p90: Math.max(3, Math.ceil(units.length / 3)),
    viz_node_id: `ghost.ms.${slug(ms.id)}`,
    description: ms.brief.slice(0, 280),
    source: ms.notes,
  });
}

// ── sync roadmap-index.json ────────────────────────────────────────────────
const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
const ms = index.milestones;
// build id → key map
const byId = {};
for (const [k, v] of Object.entries(ms)) if (v && v.id) byId[v.id] = k;
let nextKey = Math.max(...Object.keys(ms).filter(k => /^\d+$/.test(k)).map(Number)) + 1;
let added = 0, updated = 0;
for (const entry of indexAdds) {
  if (byId[entry.id] != null) { ms[byId[entry.id]] = { ...ms[byId[entry.id]], ...entry }; updated++; }
  else { ms[String(nextKey)] = entry; byId[entry.id] = String(nextKey); nextKey++; added++; }
}
index.total_milestones = Object.keys(ms).length;
index.updated_at = NOW;
index._last_revenue_register = { at: NOW, by: "claude-99eca613", added, updated, version: "7.6.0" };
// U-ROADMAP-INDEX-WRITER-CONSOLIDATE: atomic write via the shared helper
// (scripts/lib/atomic-json.mjs) — per-PID temp removes the concurrent-writer
// tmp collision the inline fixed-".tmp" copy shared with peers.
atomicWriteJson(INDEX_PATH, index);

// ── acyclicity / dep-consistency check ─────────────────────────────────────
const allIds = new Set(M.map(m => m.id));
const adj = {};                                    // blockedBy edges (m ← dep)
for (const m of M) adj[m.id] = m.dep.filter(d => allIds.has(d));
// also fold in `blocks` as reverse edges to catch contradictions
for (const m of M) for (const b of m.blk) if (allIds.has(b)) { adj[b] = adj[b] || []; if (!adj[b].includes(m.id)) {} }
const WHITE = 0, GRAY = 1, BLACK = 2;
const color = {}; for (const id of allIds) color[id] = WHITE;
const cycles = [];
function dfs(u, stack) {
  color[u] = GRAY; stack.push(u);
  for (const v of (adj[u] || [])) {
    if (color[v] === GRAY) cycles.push([...stack.slice(stack.indexOf(v)), v]);
    else if (color[v] === WHITE) dfs(v, stack);
  }
  color[u] = BLACK; stack.pop();
}
for (const id of allIds) if (color[id] === WHITE) dfs(id, []);
// contradiction check: A blocks B AND B blocks A
const contradictions = [];
const blkMap = {}; for (const m of M) blkMap[m.id] = new Set(m.blk);
const depMap = {}; for (const m of M) depMap[m.id] = new Set(m.dep);
for (const m of M) {
  for (const b of m.blk) {
    if (blkMap[b] && blkMap[b].has(m.id)) contradictions.push(`${m.id} ↔ ${b} (mutual blocks)`);
    if (depMap[m.id] && depMap[m.id].has(b)) contradictions.push(`${m.id} both blocks and is-blocked-by ${b}`);
  }
}
// tier-consistency: a tier-0 milestone must not depend on a tier-1+ milestone (would push it off the GA path)
const tierMap = {}; for (const m of M) tierMap[m.id] = m.tier;
const tierViolations = [];
for (const m of M) if (m.tier === 0) for (const d of m.dep) if (allIds.has(d) && tierMap[d] > 0) tierViolations.push(`${m.id} (tier 0) depends on ${d} (tier ${tierMap[d]})`);

console.log(`\n✅ Wrote ${written} milestone envelopes to ${ENV_DIR}`);
console.log(`✅ roadmap-index.json: ${added} added, ${updated} updated → ${index.total_milestones} total milestones`);
console.log(`\n── dep-graph check ──`);
console.log(cycles.length ? `❌ ${cycles.length} CYCLE(S): ${cycles.map(c => c.join("→")).join(" | ")}` : `✓ acyclic (over the revenue-milestone subgraph)`);
console.log(contradictions.length ? `❌ contradictions: ${contradictions.join(" | ")}` : `✓ no mutual-blocks / block-and-blocked-by contradictions`);
console.log(tierViolations.length ? `⚠️  tier violations (tier-0 depends on tier-1+): ${tierViolations.join(" | ")}` : `✓ no tier violations (tier-0 milestones depend only on tier-0)`);
console.log(`\n── tier histogram ──`);
const th = {}; for (const m of M) th[m.tier] = (th[m.tier] || 0) + 1;
console.log(Object.entries(th).sort().map(([t, n]) => `tier ${t}: ${n} milestones`).join(" · "));
const totalUnits = M.reduce((s, m) => s + (Array.isArray(m.units) ? m.units.length : m.units), 0);
console.log(`\ntotal units across the ${M.length} revenue milestones: ${totalUnits}`);
