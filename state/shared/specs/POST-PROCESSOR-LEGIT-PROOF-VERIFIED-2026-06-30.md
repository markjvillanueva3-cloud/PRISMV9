# POST-PROCESSOR — VERIFIED LEGIT-PROOF (echo, 2026-06-30)

> Companion + **live-verified correction** to `POST-PROCESSOR-LEGIT-PROOF-AUDIT-2026-06-30.json`
> (the 9-agent Hermes fan-out audit). That audit swept the whole H+C tree; this file records what
> I **re-verified live this session** and **three claims it got wrong** — plus the build shipped and
> the honest completion status. R12: every number here came from a live run cited inline.

## 0. What the operator asked (verbatim distillation)
Audit H+C for everything post-processor; prove we built what's needed; prove roadmaps/plans complete;
prove all builds wired; merge duplicate iterations; assess customer-value utilization; then test/finetune/
validate/finalize all JM fleet machines, in CIMCO + Hurco WinMax when applicable.

## 1. The audit already exists (the "hermes parallel agents" deliverable)
`POST-PROCESSOR-LEGIT-PROOF-AUDIT-2026-06-30.json` — 8 parallel Sonnet miners (post-engines, cps-fleet-
duplicates, roadmaps-plans, unintegrated-commits, dialect-tribal-pdf, c-drive-post, customer-value,
jm-fleet-validation) → 1 synthesis. Whole-tree sweep, UNVERIFIED marks carried. **Re-running that
fan-out blind would burn ~30 min re-deriving known facts** — so this session VERIFIED its key claims
and EXECUTED its action plan instead.

## 2. THREE audit claims REFUTED by live verification (verify-before-act paid off)
| # | Audit claim | Live finding | Evidence |
|---|-------------|--------------|----------|
| 1 | P0: `PRISM-Master-Hurco-VM30i-v2.1.0.cps` lives ONLY on C:, total-loss risk | **FALSE** — byte-identical to `2. PRISM ENHANCED/mill/PRISM-Master-Hurco-VM30i.cps` in H:. 11 of 12 C: deliverables already byte-identical-preserved in H: | md5 set-diff C: tree vs H: `2. PRISM ENHANCED/` |
| 2 | FA10S WEDM: "rescue C→H" (C is the deliverable) | **BACKWARDS** — H: copy (429L) is AHEAD of C: (421L): it carries the echo+mike 2026-06-29 dead-ternary removal + wire-offset WARNING/FIXME. Blindly rescuing C→H would have **clobbered the fix**. H: is canonical; no write needed | `diff` C vs H-enhanced |
| 3 | CIMCO fleet: `--nc-units inch` clears the 25.4× bind guard | **WRONG FLAG** — the sim `.mcfg` fleet is authored in **mm** (script line 35). `--nc-units mm` → 12/12 bind DRIVE-READY; `inch` → correctly fail-closed (25.4× mismatch). The units-first safety guard works as designed | `cimco-sim-fleet.mjs --mock --nc-units {inch,mm}` |

**Net:** the whole "rescue C-only deliverables" P0 collapses — the deliverables are already in H:. Only real .cps item was FA10S, already resolved correctly in H:'s favor.

## 3. LIVE PROOF — JM fleet validation (the automatable portion, run this session)
| Harness | Result | Command |
|---|---|---|
| Fleet coverage verifier | **ALL 20 CHECKS PERFECT** (0 dialect ERR, struct 100%, incl. 5-axis TCP G169/G170 + A/C) | `npx tsx scripts/verify-jm-fleet-coverage.ts` |
| Hurco WinMax proveout | **14/14 tests pass** — generates operator-loadable `.hnc` via pure-local `ncToDatablocks` | `npx vitest run HurcoV11WinMaxProveOut` |
| CIMCO fleet readiness (mock) | **12/12 mill+lathe bind DRIVE-READY** (units=mm), 3 EDM → discharge-physics | `node scripts/cimco-sim-fleet.mjs --mock --nc-units mm` |

**20 checks:** 7 Okuma lathe posts (LTH-01..05 + LB250II-M + LB3000) · 5 mill posts (Haas VF-2/OM-2,
Hurco V11, Okuma OSP, RokuRoku Fanuc) · 3 C-axis live-tool · rigid-tap G84 (4 mills) · HS smoothing
(Haas G187 / Hurco G05.3 / Okuma G05.1 P500 / RokuRoku G05.1) · 5-axis TCP (M460V G169/G170 + A/C).

**⚠ Real seam flagged:** JM shop convention is INCH, but the CIMCO sim `.mcfg` fleet is authored in MM.
A real inch JM program bound against an mm `.mcfg` (correctly) fails the 25.4× guard. Reconcile before
live sim: author inch `.mcfg` variants OR confirm the sim consumes mm NC. Operator/echo follow-up.

## 4. HONEST completion status (R12 — NOT everything is complete)
"All roadmaps/plans complete" is **FALSE**. Post-processor engines + the JM master-post corpus are
built, wired, and 20/20 green — but the forward roadmaps are largely pending, much of it gated:
| Roadmap/Plan | Total | Shipped | Pending | Verdict |
|---|---|---|---|---|
| POST-PROCESSOR-COVERAGE-MS0 | 1 | 1 | 0 | COMPLETE |
| HURCO-WINMAX-PROVEOUT-MS0 | 1 | 1 | 0 | COMPLETE |
| HURCO-POST-PIPELINE-BRIDGE-MS0 | 19 | 10 | 9 | PARTIAL (~53%) |
| CIMCO-INTEGRATION-MS0 | 7 core +15 op | 7 | 3 core + 15 operator | PARTIAL (live-verdict path not built) |
| HURCO-STATE-OF-THE-ART-PLAN | 24 | ~0 (some overlap shipped under U-PP-HURCO-* ids) | ~24 | NOT-STARTED (overlap UNVERIFIED) |
| POST-BRIDGE-SYNERGY-MS0 | 135 | ~2 | ~133 | NOT-STARTED (envelope only) |
| MS-MASTERPOST | 44 | 0 | 44 | **LEGAL-GATED** (U-LEGAL-13) |

## 5. Wiring / customer-value gaps + what shipped this session
Audit found the pipeline calls 16 sibling engines but leaves high-value features DORMANT (Tribal DB,
ToolpathThermal, CycleTime, CI-95, CoolantDynamics, Energy, ToolSelection) + 1 confirmed orphan
(CrossProcessPostBridge).

**SHIPPED this session — U-PP-TRIBAL-LIVE-WIRE:** wired the dormant tribal-knowledge DB (3,700+ tips)
into `PostProcessorPipelineEngine` Stage 5.3 (`_getEngine("selfAwareness")` →
`searchTribalKnowledgeSync`). **Opt-in** (`stages.tribal_knowledge_live`, default OFF → emitted NC
byte-identical, goldens safe); source-tagged `TK[source]: tip`, deduped, 12-cap, fail-soft. 11 real
tests + 36/36 pipeline regression (no drift) + 20/20 verifier still green. Default-ON flip = a separate
operator-gated golden re-baseline.

## 6. OPERATOR-GATED — cannot be done autonomously (no code path around these)
1. **Live CIMCO Machine-Sim** — cold background launch is DEAD; needs an interactive foreground CIMCO
   Edit session so the ribbon realizes. Then `cimco-fleet-drive.mjs --no-mock` runs navigate→run→report→
   assessLiveRunClearance. (Automatable pipeline logic is proven via `--mock`.)
2. **Live WinMax graphics Verify** — `winmax-autotest.mjs` attach-only against a RUNNING WinMax RT stack.
   (.hnc fixtures already generated + operator-loadable.)
3. **U-LEGAL-13** — public-manuals-only provenance sign-off before any post ships to a live machine /
   before MS-MASTERPOST (44 units).
4. **U-CANONICAL-HURCO-MAJOR** — confirm which Hurco major (v8.9.153 / v10.9-DRILLFIX / v11) is the ONE
   loaded on VMC-01 (three coexist in `2. PRISM ENHANCED/mill/`).
5. **CIMCO units reconciliation** (§3) — inch shop vs mm `.mcfg`.

## 7. Next autonomous units (dependency-ordered; echo-buildable)
- Wire next dormant engines as opt-in advisories (same byte-identical pattern): CI-95 comments,
  CycleTime → post header, ToolpathThermal → burn-risk comments.
- Retire/`// WIRE-EXEMPT` the CrossProcessPostBridge orphan.
- Reconcile HURCO-STATE-OF-THE-ART U-HUR-* ids vs already-shipped U-PP-HURCO-* commits (mark true pending).
- Duplicate-.cps retirement (24 byte-identical) is **operator-gated** (deleting operator deliverables) —
  plan is in the audit §C; do not auto-delete.
