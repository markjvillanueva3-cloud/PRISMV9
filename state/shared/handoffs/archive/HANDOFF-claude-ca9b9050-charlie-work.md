---
session: claude-ca9b9050
topic: charlie-work
slot: charlie
written_at: 2026-06-23T16:41:43.374Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-ca9b9050
status: active
---

# HANDOFF: claude-ca9b9050
Updated: 2026-06-23T16:41:43.374Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-ca9b9050

## STATE
## JM-GROUNDED QUOTING BUILD — resume mid-build (slot charlie)

### OPERATOR DIRECTIVE (verbatim intent)
Remove ALL demo placeholders (esp demo company) → real JM Die. Import entire JM Die documents so pricing is relative to our area + current internal structure. Quote must show: (a) how we charge customers NOW [HEADLINE], (b) optimal vs real-world market [advisory], (c) grounded in current business expenses + JM shop rate. Advise where there's room for improvement + how to address it.

### DECISIONS LOCKED (this session)
1. Headline price = CURRENT JM structure; optimal-vs-market + cost-floor = advisory deltas + improvement callouts.
2. Import scope = EVERYTHING incl full OCR run (but OCR = days/weeks background job, NOT same-session — needs U-QP-OCR-WORKER-POOL first; 344k PDFs, ~117d single-worker).
3. Scope = BOTH pricing/JM-grounding AND CAD drop-box+redaction in this push.

### VERIFIED ARCHITECTURE (do not re-derive)
- DEMO DATA lives in web/src/features/operating-system/ fixture layer (22 files ref demo strings). Key: fixtureProvider.ts(361) = fixtureOperatingSystemServices; liveProvider.ts(2284) = real backend impl hitting /api/v1/operating-system + client.ts; liveProvider FALLS BACK to fixtureOperatingSystemServices + reuses FIXTURE_RESULTS (shellFixtures.ts) when backend empty. Demo strings seen live = fixture FALLBACK rendering (backend data not populated + WS Reconnecting).
- THE FIX = make live provider source-of-truth + feed real JM data; ALSO replace fixture FALLBACK contents (shellFixtures/messageFixtures/commerceFixtures/jobDeskFixtures.ts) so even fallback is JM-real not 'Apex Aerospace'.
- Demo strings to kill: Apex Aerospace, Archer Precision, Inconel roughing insert, PO-7789, INV-4408, CUS-104, JOB-4821, QUO-1933, PORT-301, Titanium impeller roughing, Valve body family.
- REDACTION CONTRACT ALREADY EXISTS in frontend: fixtureProvider.ts:298-303 ingestCalculatorToolCribDocument returns redaction:{applied,replacementCount,redactedFields,note}. Backend engine REAL: engines/blueprint-vision/blueprintRedaction.ts(327) redactExtraction (structured-field masking, 9-name deny-list, part-no patterns, RedactionAudit, opt-in aggressive 118-name) + PIIComplianceEngine.ts(802). Header says built FOR app-facing drawing redaction Phase 3 — never wired.

### JM DATA SOURCES (real counts, verified)
- training baseline 47,905 rec / 473 customers: state/shared/quoting/baseline-records-corpus-with-real.json
- AP ledger (EXPENSES) 20,736: state/shared/quoting/jm-vendor-ap-ledger.jsonl
- sold orders (real OUTBOUND) 500 (240 verified): state/shared/quoting/jm-sold-orders.json
- material $/in3 basis 6 grades: state/shared/quoting/jm-material-cost-basis.json
- JM customers 473: state/shared/databases/jm-customers.jsonl (head-20 only, NEVER full-Read)
- JM vendors 12: state/shared/databases/jm-vendors.jsonl
- DocuStrata manifest.json present — INBOUND-ONLY (gotcha #4), route to print-intake NOT pricing.

### SHOP RATE / EXPENSES CANONICAL (NOT jm-die-profile.ts!)
engines/ShopConfigurationEngine.ts: JM defaults overhead_per_hr 30.00, admin_per_hr 15.00, machine hourly_rate 85.00, + overhead_pct, admin_burden_pct, margin_floor_pct. NEVER inline rates — read from here.

### THREE-VIEW ENGINES (all EXIST — wire-existing not build-new)
- current → 47905 baseline + 500 sold + ShopConfigurationEngine rates
- cost-floor → JobProfitabilityWaterfallEngine + AP ledger + material $/in3
- optimal/market → MarketMaterialPricingEngine + AdaptiveShopRateEngine + DynamicShopRateEngine + BidWinCalibratorEngine (win-prob vs margin)
- improvement advisor → margin gap (current vs optimal) via waterfall + bid-win

### R12 CAVEATS (do not paper over)
- Real (quoted,actual) pairs DATA-CEILING-BOUND (~10-25 extractable now; rest = xray OCR backlog). Three-view engine honest but optimal-vs-market CI WIDE until more pairs OCR'd → surface confidence in UI, no false precision.
- DocuStrata INBOUND-only → print-intake, NOT outbound truth.
- material basis = 6 grades live but doctrine said 9 — reconcile.
- charlie soul refuse-list: NEVER soften quote-vs-actual reconciliation thresholds; NEVER re-open T7/T8 provenance gates (correct-by-design).

### TASKS (TaskCreate'd): #14 demo-purge, #15 three-view pricing+advisor, #16 CAD dropbox+redaction, #17 full-OCR worker-pool (background)

### BUILD ORDER (dependency): #14 (verifiable core, all renders on it) → #15 → #16 → #17. Per-file 2-arm scrutiny each file; 3-of-3 at end.

### PREVIEW: server was live on port 28968 (Vite dev, autoPort). launch.json at H:/.claude/launch.json (root cwd, NOT H:/prism/.claude) — was corrupted gzip, fixed to prism-web config. Shared brief: state/shared/quoting-assess-brief.md. Full prior assessment delivered in-chat (live teardown + backend inventory + competitor parity vs Xometry/Fictiv).

## RESUME
/checkin-charlie continue — JM-GROUNDED THREE-VIEW QUOTING BUILD. Full enumeration DONE, decisions LOCKED, ready for FIRST WRITE into liveProvider.ts. Resume at task #14 (demo-fixture purge) → #15 (three-view pricing) → #16 (CAD drop-box+redaction) → #17 (full-OCR worker-pool). Do NOT re-derive — architecture below is verified.

## CONTEXT

