# PRISM Feature-Gap Audit + 12-Chat Domain Allocation — 2026-05-17

> `/forge-audit-v2` run by slot juliett (claude-9f57075a). Advisory, `mustHumanVerify`.
> Scope: read all chat handoffs, plans/specs, orphan/unwired system-viz nodes,
> the v8.89 `extracted/` monolith, `Resources/`, and `JM DIE/` — surface PRISM
> features NOT in the task queue, then break all remaining work into 12 chats
> by domain.

## Scope statement

Audited PRISM's planned-work surfaces — `ROADMAP-CONSOLIDATED.json` (3196 pending
+ 969 prose units, 849 milestones), `slot-task-queues.json`, 729 unwired engines,
693 handoff artifacts, 77 specs, the 895-file v8.89 monolith decomposition
(`extracted/`), and the `Resources/` (164K files) + `JM DIE/` (174K files) asset
archives — for features absent from the task queue. **Verification channel:**
`node scripts/system-viz-query.mjs coverage-by-domain` + grep against
`ROADMAP-CONSOLIDATED.json` + re-run `node scripts/allocate-domains-to-slots.mjs --dry-run`.

## Method

6 parallel enumeration agents: (1) specs, (2) handoffs, (3) orphan/unwired
engines, (4) `extracted/` v8.89 monolith file-by-file, (5) `Resources/`,
(6) `JM DIE/`. Findings classified into 13 domains by keyword.

## The 12-chat domain allocation (APPLIED)

`scripts/allocate-domains-to-slots.mjs` re-keyed `state/shared/slot-task-queues.json`
from priority round-robin to a **domain partition** — each slot owns one PRISM
system domain. 3235 units allocated (3171 from ROADMAP-CONSOLIDATED + 64
audit-discovered feature-gap units leading each queue).

| Slot | Domain | Units (gap) |
|------|--------|-------------|
| alpha | mill | 73 (2) |
| bravo | lathe | 362 (3) |
| charlie | wire (WEDM) | 117 (2) |
| delta | cad | 290 (9) |
| echo | cam | 181 (7) |
| foxtrot | machining-knowhow + tribal | 16 (4) |
| hotel | erp/business + hr | 131 (9) |
| india | post-processor + master post | 366 (4) |
| juliett | speed-feed calculator | 80 (3) |
| kilo | print-to-program pipelines | 14 (3) |
| lima | prism-academy + learning-pipelines | 55 (6) |
| mike | misc features | 1491 (5) |
| golf | database build/maintenance + hygiene | 59 (7) |

Each `/checkin-<slot> /loop` chat now pulls its domain's backlog via
`scripts/slot-queue.mjs --pick --slot <slot>`. Classification is keyword-based
and **advisory** — an operator may re-tag any unit and re-run the allocator.

**Distribution note:** `mike`/misc holds 1491 units — PRISM's roadmap is
infra/devtools-heavy and that work is genuinely domain-agnostic. `foxtrot`
(tribal, 16) and `kilo` (print-to-program, 14) are thin in the *consolidated
roadmap* — their real depth is in the unwired-engine backlog + the
Resources/JM-DIE corpora (see gap inventory below), surfaced as `U-WIRE-BACKLOG-*`
and corpus-ingestion gap units.

## Feature-gap inventory — features NOT in the task queue

### The headline gap — 674 unwired engines, ~595 absent from any roadmap

Built engines with no dispatcher wiring AND no roadmap unit — the clearest
"shipped capability that never entered the task queue" debt:

| Domain | unwired / absent | Examples |
|--------|------------------|----------|
| lathe | 80 / 77 | LatheThermodynamics, LatheUnifiedPhysicsOrchestration, LatheOpusReasoning, LatheMetaLearning |
| wire | 83 / 73 | WEDMNeuralTraining, WireEDMDeepAIHardening, ElectrodeUltimateAI, WEDMProgramOptimizer |
| misc | 370 / 328 | AS9100TraceabilityEngine (P0-CRITICAL), MacroProgramIntelligence, ResourceHarvestingIntelligence |
| cam | 35 / 26 | CimatronCAMBridge, SprutCAMBridge, FiveAxisToolpathSynthesis |
| mill | 20 / 16 | MillingAIUltraIntelligence, FiveAxisAIUltraIntelligence, MillingUltimateAI |
| erp | 18 / 17 | BusinessIntelligence, CustomerKnowledge, BusinessDocumentExtractor |
| database | 17 / 12 | PDFSourceRegistry, PhysicsPluginRegistry, WetRunDeviationRegistry |
| speedfeed | 14 / 12 | SpeedFeedUltimateAI/AdvancedAI/DeepLearning (the SF-AI L1-L3 ladder) |
| tribal | 12 / 12 | PlaybookRulesEngine (133KB — largest single unwired engine) |
| post | 10 / 8 | RealTimeAdaptiveController, GapEscalationController, DNCGenerate |
| academy | 9 / 9 | VideoELearningAI, MITCourseIntegration, ToolDatabaseDeepLearning |
| print2prog | 5 / 3 | PrintToProgramTutorial, CoverageAnalyzer, RegressionHarness |
| cad | 1 / 1 | OkumaMachineStepIngester (cad is well-wired) |

Each domain's `U-WIRE-BACKLOG-<domain>` unit (in the gap-units file) points the
owning slot at this backlog; the slot expands it via `/wire-unwired`.

### v8.89 monolith (`extracted/`) — digest=0 features absent from current PRISM

The 895-file monolith decomposition holds substantial features never
re-modularized. Highest-confidence absent (verified digest=0):

- **cad geometry kernel:** Geodesic-Distance, Mesh-Decimation, Surface-Reconstruction, Spectral-Graph-CAD, BRep-Tessellator, Voronoi, Isosurface, Curvature-Analysis
- **cam toolpath:** Adaptive-Clearing, Clipper2-offsetting, Aircut-Elimination, Rest-Machining, Voxel-Stock, Multiaxis-Toolpath
- **erp/business:** Subscription-System, Lean-Six-Sigma/Kaizen, Quoting, Job-Costing, Job-Shop-Scheduling, Purchasing, Inventory, Financial, Shop-Analytics
- **academy:** 220-Courses-Master curriculum, Course-Gateway-Generator, University-Algorithms, MIT kernels (NumericalMethods/NURBS/ODESolvers/ControlSystems/DigitalControl/DFM)
- **database:** MASTER_ALARM_DATABASE (2500 controller alarms + 68 vendor files), VERIFIED_FIX_PROCEDURES, GCODE_MCODE_DATABASE
- **optimization/data-structures:** Policy-Gradient, Differential-Evolution, MOEA/D, Interval-arithmetic, KDTree, Octree, Bezier, Trust-Region, Interior-Point
- **lathe:** Nose-Radius-Compensation, Live-Tooling
- **post:** RL-Post-Processor, G-code-Backplot

### Resources/ + JM DIE/ — corpus-ingestion gaps

`Resources/` (164K files) and `JM DIE/` (174K files) capability gaps are
**largely covered by the existing `RES-ROADMAP.json` (RES-MS0-27)** prose units
— already in ROADMAP-CONSOLIDATED, classified into the `database` domain. The
net-new corpus signals captured as gap units: JM DIE `_PART LIBRARY/` (76K
blueprint↔program pairs — print-to-program + speed-feed training set), the WEDM
program corpus (4058 files), the macro-program corpus, and the
reverse-engineering job set.

## Gap units injected

64 curated feature-gap units written to
`state/shared/specs/FEATURE-GAP-UNITS-2026-05-17.json` (milestone
`FEATURE-GAP-AUDIT-MS0`), each domain-tagged and merged by the allocator to lead
its slot's queue (`wave: "GAP"`). They are **proposals** — `advisoryOnly`,
`mustHumanVerify`; each still passes `duplicationGuardEngine.mustCheckBeforeCreating()`
before any `/forge-triple`.

## Verification channel

| Claim | Re-measure |
|-------|-----------|
| 13 domain-keyed slot queues, 3235 units | `node scripts/slot-queue.mjs --status --json` |
| allocation reproducible | `node scripts/allocate-domains-to-slots.mjs --dry-run` |
| unwired-engine counts | `node scripts/system-viz-query.mjs coverage-by-domain` |
| gap units present | `jq '.units|length' state/shared/specs/FEATURE-GAP-UNITS-2026-05-17.json` → 64 |

## META artifact (compounding-gains)

`scripts/allocate-domains-to-slots.mjs` — re-runnable: any time the roadmap or
the gap-units file changes, re-run to regenerate the domain-keyed queues. The
allocator + `FEATURE-GAP-UNITS-*.json` are the durable outputs; this audit doc
is the one-time snapshot.

## Caveats

- Keyword classification is approximate — expect some misfiles; operators re-tag.
- Gap units are audit *proposals*, not verified roadmap units — human-verify.
- `mike`/misc at 1491 is correct, not a bug — PRISM's roadmap is devtools-heavy.
- This is a one-time allocation, not a recurring audit — no `/loop` re-run
  registered (the forge-audit-v2 self-schedule rule targets recurring quality
  audits; re-run `allocate-domains-to-slots.mjs` manually when the roadmap shifts).
