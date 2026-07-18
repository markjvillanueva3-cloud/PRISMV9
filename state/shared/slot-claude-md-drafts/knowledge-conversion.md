# knowledge-conversion Galaxy — fleet-managed (no dedicated slot)
> Universal rails (R1-R15, scrutiny 3-of-3, handoff, commit [SCOPE]/U-ID, units-first,
> no-stub, no-inline-constants, duplication guard, RTK, Ollama->Sonnet->Opus ladder, wiki protocol):
> -> H:/prism/CLAUDE.md. THIS file = knowledge-conversion domain doctrine ONLY.

---
## S1 — Domain scope

Owns: MIT-OCW + monolith -> PRISM via 3-lane router.
- Lane A: direct-wire 259 tribal tips (course -> TribalKnowledgeEngine)
- Lane B: port-verify for formulas/algorithms (physics-reviewer required)
- Lane C: 6-node-type forge-queue — human-in-loop for engines/skills/pipelines

Owns the 7 ported algorithms (numerical primitives; caller owns physics):
OperatorSplittingMethod, ODEIntegrator, LinearStateSpaceModel, FiniteDifferenceMethod,
FiniteElementMethod1D, GradientDescent, LagrangianMechanics — 148/148 tests.
Also owns: SafeExpressionEvaluator (60 tests — the Lane-C expression sandbox).

EXCLUDES: physics constant definitions (-> src/physics/constants.ts);
tribal-tip storage (-> tribal-knowledge galaxy); ML model training (-> ai-training/india);
academy course delivery (-> academy/lima); PDF extraction (-> pdf-corpus).

Slot: fleet-managed — no dedicated work slot. Any slot works here; claim via /pick-unit +
heartbeat. Golf owns hygiene for this galaxy CLAUDE.md drift.

## S2 — Verified engines and scripts

No local .ts engines under mcp-server/src/engines/knowledge-conversion/ — the dir is empty.
The galaxy code lives in algorithms + a top-level engine + scripts.

| Role | Verified path |
|------|---------------|
| KIP keystone engine | mcp-server/src/engines/KnowledgeInjectionPipelineEngine.ts |
| KIP test | mcp-server/src/engines/KnowledgeInjectionPipelineEngine.test.ts |
| KIP CLI | mcp-server/scripts/knowledge-injection-pipeline.ts |
| Lane-C router lib | scripts/lib/course-data-router-lib.mjs (14 exports, 30 tests) |
| Lane-C router CLI | scripts/course-data-router.mjs |
| Lane-A course emitter | scripts/course-to-tribal-tips.mjs |
| Lane-A monolith emitter | scripts/monolith-to-tribal-tips.mjs |
| Audit/ledger | scripts/audit-monolith-port-state.mjs |
| Round-trip E2E test | mcp-server/src/__tests__/knowledge-conversion-roundtrip.test.ts |

7 ported algorithms (all verified in mcp-server/src/algorithms/, each with .test.ts):
OperatorSplittingMethod, ODEIntegrator, LinearStateSpaceModel, FiniteDifferenceMethod,
FiniteElementMethod1D, GradientDescent, LagrangianMechanics + SafeExpressionEvaluator (Lane-C sandbox)

## S3 — Dispatcher quick-ref

| Dispatcher | Key actions for this galaxy |
|---|---|
| prism_knowledge (knowledgeDispatcher.ts:173) | tribal_capture, tribal_search, tribal_suggest, tribal_stats |
| prism_dev (devDispatcher.ts) | mcfi_* (MIT curriculum index), mcdl_* (MIT course download/list) |
| prism_calc | downstream when Lane-C algorithms need physics validation |

RULE: MIT-OCW actions (mcfi_*, mcdl_*) live in prism_dev — NOT prism_ai.
Source: reference_lima_mcdl_mcfi_in_prism_dev.

Full action list: grep knowledgeDispatcher.ts ACTIONS array; full prism_dev map: DISPATCHER_DIGEST.md.

MCP-down fallback:
  node scripts/course-data-router.mjs --help
  node scripts/lib/course-data-router-lib.mjs

## S4 — Canonical constants + data paths

- NEVER inline physics constants — import from mcp-server/src/physics/constants.ts only.
  The 7 algorithms are numerical primitives; any physics-constant use flows through Lane B + physics-reviewer.
- NEVER full-read COURSE-DATA-ROUTING-LEDGER.json — query via prism_data:database_search
  or: node scripts/db-toolbelt.mjs --status

| Asset | Path |
|---|---|
| Master plan | state/shared/specs/KNOWLEDGE-CONVERSION-PLAN.md |
| Router ledger | state/shared/specs/COURSE-DATA-ROUTING-LEDGER.json |
| Formula audit | state/shared/specs/U-KC-C1-FORMULA-PORT-VERIFICATION.md |
| Wiki canonical | knowledge/wiki/architecture/knowledge-conversion-ms0.md |
| Galaxy reasoning | node scripts/lib/galaxy-reasoning-bridge.mjs knowledge-conversion "<q>" |

## S5 — Domain gotchas / safety rails

1. Lane B is mandatory for formulas/algorithms — no bypass. A formula without physics-reviewer
   sign-off is a scrap-part risk (units mismatch, NaN generalized acceleration).
2. SafeExpressionEvaluator is the ONLY safe eval path — never use raw eval() or new Function()
   for expression construction. 60-test gate enforces this.
3. advisoryOnly:true on all router ledger entries — router output is NEVER auto-emitted to engines.
   mustHumanVerify:true on every generated ledger entry.
4. PATHS.md keyword-match list is advisory noise — it flagged 126 "knowledge-conversion" engines
   including CAD routers and SFC engines. Never copy it as a verified engine list.
5. Singular Lagrangian -> NaN generalized acceleration — LagrangianMechanics.ts requires valid
   multi-DOF input. Guard: flag DISCARD with audit-trail rationale, never silent-drop.
6. 1 real-data E2E test per pipeline — hermetic-only tests hide schema-seam bugs (RGS-TOOL-MS1
   lesson). Gate: knowledge-conversion-roundtrip.test.ts.

## S6 — What NOT to do

- NEVER bypass Lane B for formulas/algorithms; NEVER use raw eval() — SafeExpressionEvaluator only.
- NEVER route mcfi_*/mcdl_* through prism_ai — they are in prism_dev.
- NEVER trust PATHS.md engine list (keyword-match noise; 12 CAD/SFC false positives dropped from prior file).
- NEVER inject unvalidated tribal wisdom into physics models.
- NEVER fork course-data-router-lib.mjs — extend its exports only.
- NEVER emit engine source directly from the router — advisory ledger only (advisoryOnly:true).
- NEVER cite reference_oscar_sfc_knowledge_index_2026_05_29 — SFC/oscar domain, not this galaxy.
- DO NOT full-read 548MB system graph — use: node scripts/system-viz-query.mjs node-card knowledge-conversion

## S7 — Domain workflow / pipeline contract

SCAN (MIT-OCW / monolith)
  -> CLASSIFY (Lane A / B / C via course-data-router-lib.mjs)
     -> Lane A: TRIBAL-SHIP  (-> prism_knowledge:tribal_capture)
     -> Lane B: PORT-VERIFY  (physics-reviewer sign-off -> algorithm DB)
     -> Lane C: FORGE-QUEUE  (human-in-loop -> KIP engine -> engine/skill/pipeline)
        -> VALIDATE (roundtrip test + real-data E2E)
           -> SERVE (prism_knowledge / prism_dev consumers)

Router ledger states: TRIBAL-SHIPPED / FORGE-QUEUE / DUPLICATE / DISCARD
Regenerate: node scripts/course-data-router.mjs

## S8 — Tribal + corpus pointers

| Corpus | Path | Access rule |
|---|---|---|
| MIT OCW source | H:/PRISM/resources/MIT COURSES | Glob top-level only; never recurse full tree |
| Algorithm corpus | H:/PRISM/resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS | query index first |
| JM Die tribal | H:/PRISM/JM DIE/ | prismSelfAwarenessEngine.getJMDieCustomerPath() — NEVER Glob 24K-file tree |
| Wiki canonical | knowledge/wiki/architecture/knowledge-conversion-ms0.md | query before re-deriving |

Tribal write rule: prism_knowledge:tribal_capture slot=<nato> — NEVER write
knowledge/tribal/*.md directly (auto-overwritten by the engine).

## S9 — Cross-galaxy edges (PSN)

| Direction | Galaxy | Bridge |
|---|---|---|
| <- source | mit-curriculum | raw OCW course leaves |
| <- source | pdf-corpus | raw PDFs for Lane-A extraction |
| -> consumer | academy | consumes course leaves post-conversion |
| -> consumer | tribal-knowledge | Lane-A tribal tip target (tribal_capture) |
| -> consumer | ai-training (india) | ported algorithms/formulas feed training substrate |
| <- peer | corpus-aggregation (kilo) | shares SCAN stage; kilo owns aggregation |

## S10 — Closed-loop integration (india)

On each successful Lane-C unit ship:
  prism_dev:xproc_outcome_publish {slot:'<nato>', domain:'knowledge-conversion'} // UNVERIFIED — grep devDispatcher.ts before use

Spec: state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md
Tribal-capture rule: every new lesson -> prism_knowledge:tribal_capture slot=<nato> within same session.

## S11 — Test commands

  cd mcp-server && rtk npx vitest run -t "knowledge|KIP|OperatorSplitting|ODEIntegrator|LinearState|FiniteDiff|FiniteElement|GradientDescent|Lagrangian|SafeExpression"
  cd mcp-server && rtk npx vitest run src/__tests__/knowledge-conversion-roundtrip.test.ts
  node scripts/lib/course-data-router-lib.test.mjs   # pure node, no port 3100 needed
  node scripts/audit-monolith-port-state.mjs          # ledger state audit

## S12 — Known bugs / open threads

- 0 formula ports: U-KC-C1-FORMULA-PORT-VERIFICATION.md lists 12 formulas, 0 ported (Lane-B active debt).
- KnowledgeInjectionPipelineEngine unregistered in AI-dispatcher surface (open wiring task).
- Thread ledger: state/shared/specs/KNOWLEDGE-CONVERSION-PLAN.md

## S13 — AI / reasoning surface

  node scripts/lib/galaxy-reasoning-bridge.mjs knowledge-conversion "<q>"  # $0, local Ollama
  # Routing: lecture/monolith->tip: gpt-oss:20b | engine/test lint: qwen2.5-coder:32b
  #          Lane-B physics review: gpt-oss:120b | embeddings: nomic-embed-text
