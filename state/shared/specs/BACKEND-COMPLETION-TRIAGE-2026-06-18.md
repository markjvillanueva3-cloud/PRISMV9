# Backend-completion triage — toward "complete all backend so we can focus on frontend" (2026-06-18, slot:zulu)

> Operator /goal: "complete all back end tasks so we can focus on front end, web app/phone app."
> This is a TOTALITY directive (ALL MEANS ALL) on a **fleet-scale** backlog. One orchestrator chat cannot
> close it solo (R12); this triages it into accurate, owner-routed buckets so the fleet burns it down and
> the frontend (quebec) gets a clean, complete dispatcher surface to build on. Zulu = routes, does not
> build domain end-product (soul). Enumerated counts are the live signal, not a sample.

## Enumerated backlog (live, 2026-06-18)
Source: `state/shared/BUILD_STATE.json` headline + `UNWIRED-ENGINE-AUDIT-2026-06-18.json`.
- **built_engines: 3787** · built_with_wiki: 1293
- **needs_building_active_units: 3890** ← the bulk; the roadmap backlog, owned by DOMAIN slots
- **needs_wiring: 18** (BUILD_STATE) / **UNWIRED: 14** (engine audit) — see triage below
- **needs_frontend_merge_count: 2** — the only items literally tagged frontend-blocking
- pending_milestones_with_activity: 52 · drift_milestones: 23

**Honest read:** the backend is ~3787 engines BUILT. "Complete all backend" = burn down the **3890 needs-building roadmap units** (domain-slot work, not solo-zulu) + close the small wiring/frontend-merge tail. The frontend is NOT blocked on a large backend hole — only **2** items are frontend-merge-tagged.

## The "14 UNWIRED engines" — triaged (the audit over-counts; most are NOT dispatcher-wiring targets)
Verified by reading each + grepping runtime imports. The audit flags any engine-file with no dispatcher
reference as "UNWIRED," but several are **EventBus bridges** (register subscriptions at module-load — correct
remedy is a bootstrap side-effect import, NOT a dispatcher action) or **module-load bootstraps**.

| Engine | Real nature | Correct remedy | Owner |
|---|---|---|---|
| `reactiveChainBootstrap` | module-load bootstrap (registers 9 EventBus chains). The audit's OWN output marks it "Skipped (3)" yet still counts it in the 14 → **double-count bug** | NOT a dispatcher action. Confirm it's side-effect-imported at server boot (it appears NOT to be — only a comment in aiReasoningDispatcher) → if dormant, import at boot | bravo (integration) + sierra (audit) |
| `cycleSchedulingBridge` | EventBus bridge (INTEG-MS3: CycleTime→Capacity→Scheduling). **Zero runtime imports** (only its test) → subscriptions never register → integration **genuinely dormant** | side-effect import at server boot, NOT a dispatcher action | bravo/business |
| `CreoToolkitBridgeEngine`, `CreoIntegrationTestSuiteEngine` | CAD bridge / test harness | delta to wire or tag `// WIRE-EXEMPT: external-CAD bridge` | delta (CAD) |
| `CATIACAAV5BridgeEngine`, `RhinoCommonBridgeEngine`, `OnshapeAPIBridgeEngine`, `OnshapeLiveCollabAdapter`, `NXOpenAssemblyDrawingEngine` | external-CAD API bridges | delta to wire or WIRE-EXEMPT | delta (CAD) |
| `MastercamHeadlessIntegrationTestEngine`, `HyperMillACBridgeEngine` | CAM bridge / integration test | kilo/echo to wire or WIRE-EXEMPT | kilo (CAM) / echo |
| `WEDMLoRADatasetBuilderEngine` | WEDM ML dataset builder | mike/india | mike / india |
| `BlueprintOCRAdapter` | OCR adapter | xray | xray |
| `SemanticAssetIndexEngine` | discovery/index infra | tango | tango |

**Net:** of 14, ~0 are clean "add a dispatcher action" jobs. 12 are domain-CAD/CAM/WEDM/OCR engines (route to delta/kilo/echo/mike/xray — wire OR tag WIRE-EXEMPT), 2 are EventBus bridges (bootstrap-import, bravo), and reactiveChainBootstrap is a double-count artifact (sierra-audit fix). The audit's "UNWIRED" framing creates **false backend-completion targets** — same class as the 2026-06-11 `stop_on_unwired_array_dispatch_fix` + `audit_wired_via_engine` regressions.

## Routed actions (orchestrator)
1. **sierra (audit owner):** `audit-unwired-engines.mjs` should (a) not count a "Skipped" engine in the UNWIRED total (reactiveChainBootstrap double-count); (b) recognize EventBus-subscription bridges + module-load bootstraps as a distinct class (`DORMANT-BRIDGE` w/ remedy "import at boot", vs `UNWIRED` w/ remedy "add dispatcher action") so the count is an accurate backend-completion signal.
2. **bravo (integration):** confirm whether the EventBus-bridge subsystem (reactiveChainBootstrap + cycleSchedulingBridge) is side-effect-imported at server boot. If NOT, these integrations are silently dormant in prod — a real R12 gap (built+tested, never runs). High value: INTEG-MS3 CycleTime→Scheduling.
3. **delta / kilo / echo / mike / xray / tango:** triage your listed engine — wire to your dispatcher OR tag `// WIRE-EXEMPT: <reason>` so it stops showing as a false backend gap.
4. **Domain slots (all):** the 3890 needs-building units are the real "complete the backend" work — burn down per your roadmap; that is what ultimately unblocks frontend.

## Honest scope (R12)
Solo-zulu did NOT close the 3890-unit backlog this session (impossible for one chat). I enumerated it, proved the "wiring lever" is mostly false-targets, corrected the framing, and routed every bucket to its owner. The frontend is only literally blocked on **2** frontend-merge items — surfacing that so the operator can weigh "is the backend already complete enough to pivot to frontend now?" (likely yes for most surfaces).

## UPDATE 2026-06-18 (slot:zulu) -- boot site BUILT (gated default-OFF), activation routed to bravo
`U-REACTIVE-CHAINS-BOOT` shipped: `mcp-server/src/engines/reactive-chains-boot.ts` + a gated call wired into
`index.ts` (after EventBus init, once-only post-bind tail) + `reactive-chains-boot.test.ts` (7 tests). The
missing-boot-site gap is CLOSED (the mechanism now exists); the subsystem stays a strict no-op until
`PRISM_REACTIVE_CHAINS_ENABLE=1`. 3-of-3 + per-file 2-arm scrutiny PASS.

**bravo/operator -- BEFORE flipping the flag on, resolve these 2 activation-blockers (scrutiny-surfaced, pre-existing):**
1. **Consequential auto-fire:** enabling registers `job_to_invoice` (job.completed -> invoice.created) +
   shipment/GL chains fleet-wide. Confirm that is intended before enabling (this is WHY it is default-off).
2. **Action-name collision:** both modules register an action named `reoptimize_schedule`
   (`reactiveChainBootstrap.ts:458` vs `cycleSchedulingBridge.ts:316`); `EventBus.registerAction` is
   last-writer-wins (no warning), so cycleSchedulingBridge silently shadows reactiveChainBootstrap once both
   boot. Rename one or confirm the intended handler.
3. **Ordering (latent):** the boot runs AFTER the `SYSTEM_STARTUP` publish; no current chain is
   SYSTEM_STARTUP-keyed, but if one is ever added, move the boot before the publish.
