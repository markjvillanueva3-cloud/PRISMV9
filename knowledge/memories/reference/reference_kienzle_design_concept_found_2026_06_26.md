---
name: reference-kienzle-design-concept-found-2026-06-26
description: "R12 correction: the operator's 'Kienzle design concept from today' EXISTS at mcp-server/web/design-imports/kienzle-app-build/ (26 full-app design-capture files) -- G4 FE is unblocked but is a quebec-lane all-galaxy program, not whiskey-solo (found slot:whiskey 2026-06-26)"
type: reference
slot: whiskey
galaxy: frontend-app
source: prism-memory
synced: 2026-06-27T20:30:46.631Z
aliases: reference_kienzle_design_concept_found_2026_06_26
---


# Kienzle design concept FOUND (R12 correction) — G4 routing (2026-06-26)

During the Kienzle/Lathe-Wizard /goal (slot:whiskey), I repeatedly claimed G4 (build FE for the
lathe wizard, "name change to Kienzle, utilizing claude design sessions from today design concept")
was "operator-blocked — needs the design concept." **That was WRONG (R12 — claimed absence without a
deep search).** The design concept EXISTS:

## Location + scope
`mcp-server/web/design-imports/kienzle-app-build/` — **26 design-capture (`.dc.html`) files**, created
today (2026-06-26 13:10), a FULL-APP Kienzle rebrand spanning ALL galaxies, not just lathe:
- Kienzle Wizards, Kienzle Speed-Feed (78K), Kienzle Tool Crib (77K), Kienzle Audit & Rebrand (85K),
  Kienzle Quote, Kienzle Quality, Kienzle ERP, Kienzle Employee Portal, Kienzle Payroll Labor,
  Kienzle Job Cost, Kienzle Inventory, Kienzle Materials, Kienzle Scheduling, Kienzle Shop Floor,
  Kienzle Post, Kienzle Blueprint Intake, Kienzle CAD Features, Kienzle Collision Gap, Kienzle
  Trilobe Creator, Kienzle Thermal Comp, Kienzle Warm-Up Generator, Kienzle Tooling Shop, Kienzle
  Academy, Kienzle Alarm Decoder, Kienzle System Sync, Kienzle Backend Wiring Map.
- `.thumbnail` present. `.dc.html` = design-capture HTML (a design-tool export of the intended UI).

## Routing (correct ownership)
- **This is a QUEBEC-lane program** (frontend web app + phone app is quebec's domain). Implementing 26
  cross-galaxy Kienzle surfaces from these design captures is a large FE build — NOT a whiskey-solo task
  (whiskey = lathe-backend specialist). The master plan already said "U-W8 rename: quebec-lane;
  coordinate, do not solo."
- **Lathe-relevant surfaces** (whiskey can advise quebec on the backend wiring for these): Kienzle
  Wizards, Kienzle Trilobe Creator, Kienzle Blueprint Intake, Kienzle CAD Features, Kienzle Collision
  Gap. Their backend (prism_turning/thread/turning_program) is already built + wired.
- The in-page "Lathe Wizard" -> "Kienzle" string rename should be part of quebec's COORDINATED global
  rebrand (REBRAND-SURFACE-2026-06-25, U-Q-REBRAND), NOT piecemeal per-slot (residual user-facing
  strings remain, e.g. the gated "Lathe Wizard requires the Pro plan" message, built dynamically from
  the feature name).

## Whiskey's Kienzle backend is DONE — FE is the only remaining G4 work, and it's quebec's
The lathe BACKEND for the Kienzle wizard is complete + validated this session (closed-loop test live
over 34,993 .MIN, safety, tribal). G4's remaining work is the FE implementation from this design
concept = quebec. Recommend: hand `design-imports/kienzle-app-build/` to quebec to implement against
the existing `prism_turning`/`prism_thread`/`prism_cad` backend surfaces.

## UPDATE 2026-06-26 (operator pointed to the authoritative source + whiskey verified the lathe lane)

**Authoritative source (operator-confirmed):** `H:/KIENZLE APP BUILD.zip` (1.4 MB, 42 files, dated 2026-06-26 13:11) — the Claude design-session output. Contains the 26 `.dc.html` design surfaces + the runtime that powers them (`deck-stage.js` 82 KB, `Machine3D.js`, `jm-data.js`, `support.js`) + `research/` PNGs (screenshots of the CURRENT PRISM UI: current-calculator/dashboard/sidebar, sfc-v2, employee-portal, crib-3d — the rebrand reference). The repo copy `mcp-server/web/design-imports/kienzle-app-build/` has 31/42 (the `.dc.html` + the 4 JS runtime files; MISSING only the `research/` PNGs + `.thumbnail`). To complete the repo staging: `unzip "H:/KIENZLE APP BUILD.zip" "research/*" .thumbnail -d mcp-server/web/design-imports/kienzle-app-build/`.

**The design's OWN "Kienzle Backend Wiring Map.dc.html" is the canonical G4 spec (read its text — it is a FLEET HANDOFF):**
- Headline: **~150 backend endpoints live · 12 Kienzle screens BUILT · 10 domains UI-GAP · ~0 net-new endpoints needed.** *"The backend is effectively complete — almost every gap is a missing UI over an endpoint that already exists. Front-end is the critical path."*
- **BUILT (wire `renderVals()` demo arrays → `fetch` in `componentDidMount()`, keep prop names, map `PrismResponse.data`):** Speed&Feed (OSCAR), **Lathe/Mill/WEDM Wizards (WHISKEY·FOXTROT)**, Post (ECHO), Tool Crib (OSCAR·HOTEL), Quote (CHARLIE), Job Cost (HOTEL), Payroll (HOTEL), Employee Portal (HOTEL), Academy (LIMA), Quality (QC), ERP (HOTEL), Trilobe Creator (OSCAR·ECHO).
- **UI-GAP build order (backend ready, no UI):** 1 Shop-Floor Live · 2 Scheduling/Capacity · 3 Inventory/Purchasing/Receiving · 4 Blueprint/OCR + CAD feature-recognition · 5 CAM Strategy + Lean toolkit · 6 Accounting/GL + Sales/RFQ. (All HOTEL/CHARLIE/KILO/DELTA/XRAY-domain FE → **quebec implements**.)

**Whiskey lane VERIFIED LIVE (R12, end-to-end, not assumed):** the "Kienzle Wizards" lathe surface backend is complete + FE-wired + working:
- FE: `mcp-server/web/src/api/client.ts` → `submitLatheWizard`→`POST /api/v1/lathe/wizard-submit`, `uploadLatheFile`→`POST /api/v1/lathe/upload`, `getLatheResult`→`GET /api/v1/lathe/result/:jobId`; consumed by `LatheWizardPage.tsx`/`LatheResultsPage.tsx`/`LatheUploadPage.tsx`.
- BE: `mcp-server/src/routes/latheTurning.ts` defines all three at MATCHING verbs (+ `GET /progress/:jobId` SSE, `GET /download/:jobId/:artifact`), mounted `app.use("/api/v1/lathe", createLatheTurningRouter(callTool))` (routes/index.ts:182). `wizard-submit` → real `runPipelineAsync(job, body, callTool)` MCP dispatch (NOT a stub) + 1000-job backpressure. NO dead wire on the lathe path.

**G4 net status:** whiskey's lathe contribution is DONE+verified (BE complete, FE wired, live). The remaining G4 work is the 10 UI-GAP FRONTEND surfaces against already-live endpoints = **quebec's lane** (frontend web app). The "Lathe Wizard"→"Kienzle" string rename is part of quebec's coordinated global rebrand (REBRAND-SURFACE-2026-06-25 / U-Q-REBRAND), not piecemeal.

Related: [[reference_whiskey_rungc_step_loop_closed_2026_06_26]] · [[reference_whiskey_kienzle_session_2026_06_26]]
