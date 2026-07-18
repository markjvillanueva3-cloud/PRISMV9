# Kienzle FE-suite delta reconciliation: Jul 1 -> Jul 5 (slot:quebec, 2026-07-05)

> Delta pass over the counted baseline `KIENZLE-ALL-CHAT-APP-GAP-AUDIT-2026-07-01.md` (program task #138).
> Population enumerated FIRST (ALL-means-ALL): **314 commits** since 2026-07-01 · **341/840 handoffs** touched ·
> **246 hermes-outputs files** · 18KB AGENT_CHAT. Commit classification offloaded to Ollama
> (~16.7K tok local); gap keywords then grepped exactly. Minimum-Context list: 8/10 read directly
> (both codex gap-audit handoffs, merge spec, launch status, 2 kienzle memories, App.tsx, delta greps);
> BUILD_STATE + MILESTONE_PROGRESS consumed via their standing SessionStart injections.

## Audit gaps CLOSED during Jul 1-5 (verified by commit, do NOT rebuild)

| Audit gap | Closed by | Evidence |
|---|---|---|
| Employee phone portal hard-404 (since 05-24) | quebec | 23a1ff4a60 route+FE, 079316c5db shell desk (3rd wall), 7698ea113a harness 11/11, browser-proven Scan In -> running task |
| ErpDashboard dead /erp/* quick links | quebec | c479b1902f (6 links -> real routes + Link) |
| Autofeed harness silent 184s timeout (audit Phase-1.1) | india | af86c9d42d -- ROOT CAUSE: pipeline completes ~5s, lingering EventBus handles kept node alive; now stage-timeboxed + verbose, wall=9s |
| SFC Kienzle design port (partial) | hotel | cd1abe46f4 dark-studio transplant + 4588878a32 black/orange |
| Lathe wizard accuracy (audit: smoke-only) | whiskey+oscar | accuracy oracle 0 violations/1M cells (16dbdd4bb0) + material-resolution fixes (c68446f98d) + property-invariant tests |
| SLD dormant engine | india | b022801486 + 503b1ee1c9 mill_stable_rpm_select wired |
| Envelope dead-panel class | fleet | 12 more envelope commits Jul 1-5 |

## Audit gaps STILL OPEN (prioritized queue input)

1. **WEDM wizard**: calls unmounted `/wedm-live` + NOT_IMPLEMENTED helpers -- **0 delta commits touched it** (grep empty). Highest-value untouched FE gap.
2. **Kienzle token port**: still ~12/163 pages (quote/ERP/portal domain ~5); only SFC advanced Jul 1-5. Canonical design: `web/design-imports/kienzle-app-build/` (26 .dc.html full-app captures, H:/KIENZLE APP BUILD.zip).
3. **Milling Wizard string-ID vs material?.id mismatch** -- no delta commit evidence; needs verify-then-fix.
4. **Shell claims are fixtures** (NEW, found by quebec browser verify 07-05): employee shell shows "Avery Stone" fixture identity regardless of real logged-in user; task #143 U-SHELL-CLAIMS-BIND.
5. **Rebrand residue** (legacy H:/PRISM/web, appIds tools.prism.app, one visible "Prism Engine" label) -- unchanged.
6. **Mobile/Electron release blockers** (VITE_API_BASE_URL, signing, appId; MCP bridge launcher) -- operator-gated.
7. Sensitive-op browser passes need a lead+ account -- operator-gated (harness user is basic by design).

## JM-Die simulation STAGE 0 (task #142) -- Docustrata official counts (from manifest.json summary, export 2026-05-08)

- **total_documents 111,745** · downloaded 111,500 · skipped 245 · **folders 20** · **tags 2,826**
- Root categories (10): JMD {Acct RecPay, AltracsTaptite, Laser Sheets, Orders Closed, Packing Slips, Quotes, Sales Orders, Scans, TaxesIRS, UPS} · `.index/` = 165 files · manifest 69.4MB
- Tags are die/insert/wire/machine-station descriptors -> ready-made retrieval vocabulary for the backfill DB features. NEVER re-OCR (manifest + .index only).

## Ops facts (Jul 5)

:3100 in-memory auth wipes on every restart (PID churn 45916->45684 observed mid-session); harness users re-register idempotently. Browser-verify pattern proven via chrome-devtools MCP (in-page login -> localStorage prism-auth-token -> navigate).
