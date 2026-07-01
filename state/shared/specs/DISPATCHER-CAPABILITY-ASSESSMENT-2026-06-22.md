# PRISM Dispatcher Capability Assessment (2026-06-22, slot:bravo)

> Full assessment of the MCP dispatcher layer — **111 dispatcher files · 14,257 advertised actions**.
> Produced by a 6-dimension parallel Workflow (inventory/integrity/schema/test/reachability/bloat) + sonnet synthesis,
> then **bravo independently verified the P0 claims against source** (verified-vs-estimated marked below).
> Question answered: *"do we need to ENHANCE existing dispatchers or BUILD more?"*

## Verdict: ~85% ENHANCE/HARDEN, ~15% BUILD-NEW

The dispatcher ARCHITECTURE is sound (registration loop `bindDispatchers()` in `mcp-server/src/index.ts`, Zod middleware, dedup guard, per-request server — all work; all major manufacturing domains present). The debt is concentrated INTEGRITY + HYGIENE on existing capability, not missing capability. Surgical fixes, not an architectural rebuild. **Do not expand the surface; harden it.**

## VERIFIED findings (bravo confirmed against source — high confidence)

| Finding | Evidence |
|---|---|
| 61 reachable-but-throw method-mismatches across 10 dispatchers | `state/shared/DISPATCHER-ENGINE-METHOD-AUDIT.md` (own detector, 3-of-3 PASS) |
| `cadAutomationDispatcher` (367 actions) defined but **never registered** in the boot hub — frontend calls it → **live 404** | `registerCadAutomationDispatcher` 0× in `src/index.ts`; `mcp-server/web/src/api/cadAIStateMachine.ts:57` fetches `/dispatch/prism_cad_automation`; not served by any other dispatcher |
| `securityDispatcher` (~227 actions: tenant isolation/encryption/access-control) defined but **never registered** | `registerSecurityDispatcher` defined `securityDispatcher.ts:1567`, called 0× in hub, not superseded |
| `machineDispatcher` (~69 actions, baseline machine registry) **never registered** (machineLive/machineSetup ARE) | `registerMachineDispatcher` 0× in hub |
| `cplDispatcher` (54 actions) has **no register function at all** | no `registerCplDispatcher` export anywhere |
| Hub makes **100** `registerXxxDispatcher()` calls for 111 files → ~11 unregistered | `grep -cE "register[A-Za-z]+Dispatcher\(" src/index.ts` = 100 |
| `aiDispatcher` (3 actions) **intentionally** unwired (prism_ai name-collision) — NOT a bug | documented comment `src/index.ts:104,593` |
| `camDispatcher` = 20,804 lines / 2,488 actions (17% of the fleet, one file) | own prior read |

**RECONCILIATION (R8/R12 — corrects the workflow's over-claim):** the unregistered dispatchers are NOT a new discovery and NOT accidental orphans. Tango already found them 2026-06-15 (`ee2368d77b` + `e1f7d3700c`) and built a **standing tool** `scripts/dispatcher-registration-coverage.mjs` (8/8 tests) that tracks + **classifies** them. Live today: **101/106 register-exports wired (95%), 5 dormant, ALL classified with a reason, ZERO blind-register candidates:**
- `prism_ai` — **intentionally-skipped** (prism_ai is owned by aiReasoningDispatcher; registering aiDispatcher crashed boot under the strict SDK — documented `index.ts:104`). Leave.
- `prism_cad_automation` — **cross-lane → delta's call.** (The frontend 404 below is the real loose end.)
- `prism_cam_function` — **cross-lane → kilo's call.**
- `prism_machine` + `prism_security` — **safety-sensitive: exposing machine-control / security as an MCP tool has safety implications → needs OPERATOR intent-confirmation before registration. Do NOT blind-register** (tango soul rule; conservative bias: a false "skip" is safe, a false "register" can crash boot or expose unsafe control).

So the ~660 actions in these are **deliberately dormant + owner/operator-gated**, not rot. The genuine runtime-integrity defect is the **61 method-mismatches** (reachable-but-throw). The one real loose end among the dormant set is the cadAutomation frontend-404.

## ESTIMATED findings (sonnet-agent, NOT independently verified — treat as signal)
- **Schema:** `validateActionParams` in 96/111, but middleware pass-through default (`dispatcherMiddleware.ts:83`) treats schema-less actions as valid → ~40% of calc actions unvalidated; ~2,334 `params as any` casts. calc routes Kienzle/tool-life/deflection physics — unvalidated bad input is safety-relevant.
- **Tests:** 58/111 dispatchers (52%) have ZERO test files; round-trip coverage ~1.7%. Root cause of the 61 mismatches slipping through.
- **Structure:** `sfc_*` registered 3× (calc/product/intelligence — MCP last-wins silently drops two); `businessDispatcher` houses foreign `lathe_agi_*` (→turning) + academy actions.

## Health scorecard (agent-rated)
integrity 7/10 · schema 5/10 · test 3/10 · reachability 8/10 · coverage 7/10 · structure 4/10.

## P0 — must-fix integrity
1. **Fix the 61 method-mismatches** (the genuine runtime bug) — reachable-but-throw; triaged + owner-routed in `DISPATCHER-ENGINE-METHOD-AUDIT.md` (kilo cam/20, oscar cncOps/8, mike edm/7, delta cad/5, xray quality/4, echo pp/3, juliett resource/3, sierra mill/2, tango feasibility/1).
2. **cadAutomation frontend-404** (the one real loose end among the dormant set): `web/src/api/cadAIStateMachine.ts:57` calls `/dispatch/prism_cad_automation` which is dormant → 404. Either delta wires `cadAutomationDispatcher` (after a safety/completeness check) OR the frontend stops calling it until then. Owner: delta.
3. **`cplDispatcher`** (54 actions, no register fn): wire or archive — don't leave it ghosting the digest. Owner: golf.

## OPERATOR DECISION (not a blind-fix — surfaced, classified, gated)
- **Activate `prism_machine` (~69) and/or `prism_security` (~227)?** Both are fully-coded but deliberately dormant because exposing machine-control / security as live MCP tools has **safety implications** (tango classified them safety-sensitive; do-not-blind-register). This is your call: do you want these surfaces live? If yes, they need a safety/auth review before registration. Standing tracker: `scripts/dispatcher-registration-coverage.mjs`.

## P1 — enhance
1. Invert schema pass-through (`dispatcherMiddleware.ts:83`) to fail-loud/warn; fill calc (~612 missing) + cam schemas. Owner: oscar/kilo.
2. Thread `validation.data` to engine calls (stop `params as any` after validating). Owner: oscar/kilo.
3. Close the 58-dispatcher zero-test gap — one round-trip wire test each (MockMCPServer + registerXxx + handler-capture pattern). Promote the 25 UnwiredBatch singleton tests to wire-harness. Owner: all domain slots, one each.
4. Resolve `sfc_*` 3-way dup (designate `productDispatcher` canonical). Owner: oscar.
5. Split `camDispatcher` into vendor sub-dispatchers (hypermill/mastercam/solidcam/fusion/turning/powermill/core) behind a `prism_cam` facade. Owner: kilo.
6. Fix `scripts/generate-dispatcher-digest.mjs` regex (13 false "(no server.tool found)"). Owner: golf.
7. Relocate `businessDispatcher` foreign actions (lathe_agi→turning, academy→intelligence). Owner: hotel/whiskey.

## P2 — build-new (only 4; 2 blocked)
1. `prism_probing` (xray) — on-machine probe/CMM routine gen; engines exist, no dispatcher.
2. `prism_erp_live` (hotel) — transactional ERP write-back (distinct auth/rollback/idempotency from read-path).
3. `prism_gnn` (india) — mostly = wiring the dormant `mlDispatcher` (129 actions, tango-dormant) + a clean GNN split; gated on ref-pool AUROC.
4. `prism_fleet` (golf) — wrap fleet scripts (chat-slots/reaper/task-health) as MCP.
- **NOT ready:** `prism_swiss`, `prism_laser` — engines don't exist yet; do not build shells ahead of engines (R13).

## Source
Workflow run `wf_bfbc1792-5ff` (7 agents, ~16min). Detectors: `audit-dispatcher-engine-methods.mjs`, `audit-dispatcher-ghost-actions.mjs`, `dispatcher-import-liveness.mjs`. Memory: [[reference_dispatcher_capability_assessment_2026_06_22]].
