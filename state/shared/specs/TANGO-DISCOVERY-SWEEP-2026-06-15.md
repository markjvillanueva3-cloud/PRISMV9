# TANGO Discovery Sweep — dormant high-ROI builds + inefficiencies (2026-06-15)

**Slot:** tango (discovery) · **Session:** claude-610a823b · **For:** romeo (wiring), + fleet
**Method:** 6-class parallel discovery-sweep workflow (`wf_471937e7-027`) — 58 agents,
944 tool-uses, adversarial verify-on-disk per finding. **52 findings: 32 confirmed,
16 partial, 4 correctly refuted.** Every wiring item below was then **re-verified by
tango against the CURRENT `cad-fusion-live-ms0` tree** (the sweep agents ran in the
slot-tango worktree, ~1900 commits behind — their line numbers are stale; tango's
current-tree verification supersedes them).

> **Lane:** tango DISCOVERS + surfaces with a build/wire/archive decision.
> WIRING is **romeo's** lane. This report is the handoff.

---

## ALREADY SHIPPED by tango this session (the meta-tool layer — fixed inline)

The discovery pipeline itself was broken; tango fixed the meta-tools so the signal
below is trustworthy (9 commits on `cad-fusion-live-ms0`):

| commit | fix |
|---|---|
| `6fcd9222d7` | unwired-bridge-rank: resolve vendored `rg` + git-grep fallback (ranker was silently empty) |
| `0e07be67ec` | unwired-bridge-rank: true consumer fan-in (dormant/leaf/maybe-wired buckets) |
| `c2ac00200c` | quarantine 5 orphan `.ts-N` backups (652KB) out of the engines search hot-path |
| `f004aa153d` | **audit-unwired-engines: date-stamp OUTPUT** (was frozen 2026-05-07 → 180s wasted regen on EVERY SessionStart in every worktree lacking the untracked file) + fail-loud on unreadable consumer |
| `529e5d65eb` | build-state-snapshot: fail-loud on unwired-audit refresh failure (was `catch{}` "no problem") |
| `81f47be059` | node-staleness-rank: no false "fresh" when no settings parse + no `undefined` history fields |
| `50d65c4c93` | reconcile-roadmap-drift: fail-loud on corrupt-but-present envelope (was silent close-out debt) |
| `502b811ecf` | unwired-audit (mcp-server): derive REPO_ROOT from script location (was hardcoded H:/prism → wrong repo from any worktree) + date-stamp |

**Fresh audit regenerated** → `UNWIRED-ENGINE-AUDIT-2026-06-15.json`: **45 UNWIRED**
(down from the stale 50 — 5 wired in the 39-day gap the stale audit hid).

---

## A. DORMANT DISPATCHERS — highest ROI (romeo: wire into `index.ts` + build-verify)

**Verified in the CURRENT `cad-fusion-live-ms0` tree** (`mcp-server/src/index.ts`):

| dispatcher | file | index.ts | verdict |
|---|---|---|---|
| **mlDispatcher** (`prism_ml`, ~100 ML/LoRA/RAG actions) | PRESENT | **0 refs** | **WIRE** — never registered |
| **localDispatcher** (`prism_local`, local-LLM offload) | PRESENT | **0 refs** | **WIRE** — never registered |
| **resourceExtractionDispatcher** (`prism_resource_extraction`, 14 OCR/doc actions) | PRESENT | **0 refs** | **WIRE** — never registered |
| agentDispatcher (`prism_agent`) | PRESENT | commented `// NOT ON THIS BRANCH` | **VERIFY** — comment is STALE (file now exists); confirm export + wire |
| resourceHarvestingDispatcher (`prism_resource_harvesting`, 8 actions) | PRESENT | commented `// NOT ON THIS BRANCH` | **VERIFY** — same stale comment; the sweep flagged a *possible* schema-import issue (refuted by one verifier — re-check) |
| ppDispatcher (`prism_pp`, 807 actions) | PRESENT | **registered** (line 237/780) | already wired — sweep's "commented out" finding was a stale-branch artifact (DROP) |

**Pattern to follow:** other dispatchers register via `register<Name>Dispatcher(server)`
in the registration block (`index.ts` ~line 750-790) with a matching import ~line 140-240.
**REQUIRED:** `npm run build` after each (index.ts is the MCP entry — high blast radius)
+ a round-trip action test through the dispatcher (R15). **R8:** confirm WHY each was
left unregistered before re-enabling (the 3 clean ones appear to be simple omissions).

## B. DORMANT ENGINES — confirmed wire candidates (romeo: route into a dispatcher)

Substantial, real engines with ZERO consumers (sweep read full file content + line counts):

| severity | engine | size | wire target (sweep's note) |
|---|---|---|---|
| P0 | **DesignToFloorPipelineEngine** | 1335 L | closed-loop sim+CMM+SPC — highest-ROI single wire |
| P0 | **IntelligentSequencingAdapter** | 566 L | 9 cross-domain dispatcher improvements; consumers currently bypass it (→ §C) |
| P0 | **EntryExitStrategyAdapter** | 473 L | eliminates hardcoded helix/ramp in PrintToProgram/MultiAxis/Laser/Waterjet (→ §C) |
| P1 | NXOpenAssemblyDrawingEngine | 1221 L | NX Open parity in `prism_cad` (matches FreeCAD/Inventor) |
| P1 | OnshapeAPIBridgeEngine | 460 L | Onshape cloud-CAD round-trip |
| P1 | RhinoCommonBridgeEngine | 413 L | Rhino.Compute + Grasshopper round-trip |
| P1 | reactiveChainBootstrap | 632 L | activates 9 automated mfg+ERP event chains at boot |
| P1 | cycleSchedulingBridge | 457 L | quote→capacity→schedule propagation (EventBus) |
| P1 | TPEHyperparameterSearchEngine | 374 L | 10-30% fewer BO iters/LoRA run → india/oscar pipelines |
| P1 | BayesianAcquisitionRefiner | 141 L | L-BFGS-B polish on every BO call → speed-feed + LoRA |
| P1 | WetRunChangeFreezeEngine / WetRunRetentionPolicyEngine | — | WetRunPilotOrchestrator JSDoc names them but never imports (2 compliance sub-checks) |

**build-out (not wire):** `MillPrintToProgramEngine` is a 14-line WIRE-EXEMPT stub with a
reserved dispatcher slot — the mill print-to-program capability is unbuilt (foxtrot/kilo lane).

**audit false-positive (DROP):** `XProcNeuralAutoFireEngine` is genuinely wired
(`aiReasoningDispatcher` xproc_autofire routes) — the now-fixed date-stamped audit + the
ranker's `maybe-wired` bucket already flag it; no action.

## C. DEDUP — Engine-vs-Adapter pairs (romeo: wire the Adapter, THEN retire the Engine path)

The sweep's verifiers corrected most of these from "dedup/archive" to **"wire the unwired
Adapter first"** — the Adapters are the CAMX-MS0.3 canonical replacements with zero
production consumers; the legacy Engines are live but produce unlogged decisions:

- **EventBus.ts (real) vs EventBusEngine.ts (stub)** — migrate `infraDispatcher` cases
  `event_publish/event_recent/event_stats` to the `eventBus` singleton, then archive the stub.
  (Risk: new code importing the stub gets silent no-op event delivery.)
- **CoolantStrategyAdapter** (unwired) vs CoolantStrategyEngine (live) — wire the Adapter.
- **EntryExitStrategyAdapter** (unwired, §B) vs EntryExitStrategyEngine (live, 5 pipelines).
- **IntelligentSequencingAdapter** (unwired, §B) vs IntelligentSequencingEngine — route the
  9 pipeline call sites through the Adapter (restores thermal-gap + tool-change reporting).
- **CoatingSelectionAdapter** vs CoatingSelectionEngine + ToolCoatingSelectionEngine (3-way).
- AdvancedCuttingPhysicsEngine vs …ExtEngine — **NOT a dup** (complementary 6+4 models;
  verifier corrected to "build-out: merge into one model-registry to prevent re-impl").

## D. LOWER-PRIORITY (tango/golf follow-up, not romeo)

- **Stale audits still feeding consumers** (regenerate; their generators may also need the
  date-stamp/path fix tango applied in §shipped): `CLOSE-OUT-CANDIDATES.json` (P1, hard-fail
  gate in auto-close-shipped-envelopes), `SKILL-LIBRARY-AUDIT-2026-05-12` (P1),
  `ENGINE_WIRING_INDEX.json` (P1, narrow scope), `HOOK_WIRING_AUDIT` (P2, `harness-wiring-audit.mjs`
  hardcoded path lines 54-55), `COGNITIVE-STACK-AUDIT` (P2, no regenerator — build one),
  `orphan-sweep-2026-05-09` (archive — superseded).
- **Remaining silent-fail meta-tools** (lower impact than the 5 tango fixed):
  `produce-automation-gap-map.mjs:189-197` (P2 readdirSync under-count),
  `high-value-additions-rank.mjs:55-68` (P2 hardcoded H:/.claude path).
- **Orphan/backup files** — mostly already in `.claude/commands-archive/` (effectively archived;
  the real action is git-untrack, not move). One live: `asset-deletion-block.mjs.bak-20260427`
  in the active hooks dir (archive).

---

## Recommended romeo execution order

1. **§A 3 clean dispatchers** (ml/local/resourceExtraction) — biggest action-count unlock,
   simplest (import + register + build). One `DISPATCHER-WIRE-MS` milestone, build-verify each.
2. **§B P0 engines** (DesignToFloorPipeline, the two Adapters) — route into the natural dispatcher.
3. **§C dedup** — wire-Adapter-then-retire-Engine, per pair, with the decision-log gain as the test.
4. **§A verify** agent/resourceHarvesting stale comments.

Full verified evidence per finding: workflow output
`…/tasks/wrq0rnet6.output` (`$.result.byClass`). Ranker re-run any time:
`node scripts/unwired-bridge-rank.mjs` → `wireCandidates`/`leafEngines`/`maybeWired`.
