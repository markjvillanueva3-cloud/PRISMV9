# ECHO ULTIMATE POST-PROCESSOR ROADMAP v2 -- comprehensive dual-track plan

> Supersedes `ECHO-ULTIMATE-ROADMAP-2026-06-24.md` (commit a53cde69f0). v1 gave the tracks +
> loss functions; v2 adds the **complete 15-machine JM Die dual-track matrix** + precise gap
> enumeration + per-machine units, built from live enumeration (not a sample -- ALL MEANS ALL).
> slot:echo, 2026-06-24, session 48cc713a.

## 0. The deliverable (operator /goal, verbatim intent)
Build/modify **every existing JM Die post processor** in **both**:
- **Track-CPS** -- the Fusion/CAM `.cps` post (machine-ready, the operator's installed-CAM path).
- **Track-PRISM** -- the higher-tier version routed through the PRISM `PostProcessorPipelineEngine`
  7-phase (P1 physics + P5 safety/tribal), i.e. a per-machine `*MasterPostEngine`.
Baselines pinned by the operator: **Mill = Hurco VM30i** (`HURCO_VM30i_PRISM_v11.cps`, "completed
but not tested" = generated, never CIMCO/machine-validated); **Lathe = Okuma LB3000 (LTH-06) +
Multus B250II (LTH-07)** -- CONFIRMED two distinct machines (jm-die-profile.ts:245-246).

## 1. Enumerated reality (live counts, deduped)
- `.cps` in repo: 26,623 raw -> almost all are `.claude/worktrees/agent-*` copies + C:/H: mirror dup
  + the 464-file generic Fusion vendor library (`fusion-cache`). **Canonical JM-relevant set:**
  `mcp-server/data/posts/`: box-basic 180 (historical job outputs) + **prism-enhanced 26** + prism-base 3;
  `JM DIE/` 301 (archive) + `resources/` 281 (archive). The DUAL-TRACK TARGET is the **15 registered
  per-machine posts** in `jm-die-profile.ts` JM_DIE_MACHINES (the authoritative roster), NOT the
  job/archive blobs.
- Higher-tier PRISM `*MasterPostEngine`: 19 total; **6 machine-specific**, ALL with companion tests:
  HurcoV11Mill, OkumaOSPMill, HaasNGCMill, OkumaB250Lathe, MitsubishiMV1200RWireEDM, + generic
  MasterPostProcessor. (Plus a 6-engine Lathe master-post support cluster: Router/UnifiedOutput/
  DeepReasoning/EnsembleCrossCheck/API/RegressionMatrix.)

## 2. THE DUAL-TRACK MATRIX (15 JM machines)

Legend: CPS = registered `.cps` exists / PRISM = machine-specific MasterPost engine / TESTED =
engine has a real R9 companion test / CIMCO = `.cps` byte-equiv validated vs golden NC (closed-loop).

### Lathe (7) -- all Okuma OSP
| machine | model / controller | CPS | PRISM engine | TESTED | CIMCO |
|---|---|---|---|---|---|
| LTH-01 | GENOS L300-M / OSP-P300L-R | OKUMA_GENOS_L300M_..._PRISM.cps | (OkumaB250Lathe covers OSP-P300L family?) | partial | NO |
| LTH-02 | GENOS L200E-M / OSP-P200LA-R | OKUMA_GENOS_L200EM_..._PRISM.cps | gap (P200LA variant) | -- | NO |
| LTH-03 | LNC8 / OSP-U10L | OKUMA_LNC8_PRISM.cps | gap (U10L variant) | -- | NO |
| LTH-04 | Crown L1060 / OSP-U10L | OKUMA_CROWN_L1060_..._PRISM.cps | gap (U10L variant) | -- | NO |
| LTH-05 | GENOS L400II-E / OSP-P300LA-E | OKUMA_GENOS_L400II_...-Ai.cps | gap (P300LA-E variant) | -- | NO |
| **LTH-06** | **LB 3000EX Big Bore / OSP-P500** | OKUMA_LATHE_LB3000-Ai-Enhanced.cps | gap (P500 -- big-bore) | -- | NO | **<- baseline** |
| **LTH-07** | **Multus B250II / OSP-P300SA** | OKUMA_MULTUS_B250IIW-...-Fixed.cps | OkumaB250Lathe (mill-turn) | YES (928+269) | NO | **<- baseline** |

> Lathe note: `OkumaB250LatheMasterPostEngine` declares itself "the CANONICAL lathe post -- all lathe
> logic derives from here", tuned for LB250II/OSP-P300L. OPEN QUESTION (verify, don't assume): does it
> emit correct OSP for the 5 other controller variants (P200LA, U10L, P500 big-bore, P300LA-E, P300SA
> mill-turn), or does each need a per-model adapter? `LatheMasterPostRouterEngine` may already route
> per-model -- AUDIT before forking. Sibling: `LathePostProcessorEngine` (base 6-dialect post, just got
> its first test + G76 P-word fix this session, commit e0b0d93ba5).

### Mill (5)
| machine | model / controller | CPS | PRISM engine | TESTED | CIMCO |
|---|---|---|---|---|---|
| **VMC-01** | **Hurco VM30i / WinMAX v10** | HURCO_VM30i_PRISM_v11.cps | HurcoV11MillMasterPost | YES (AdvancedPipeline) | **NO <- "completed not tested"** |
| VMC-02 | Okuma M460V-5AX / OSP-P300MA-H | OKUMA_M460V-5AX-Ai...(iMachining).cps | OkumaOSPMillMasterPost | YES | NO |
| VMC-03 | Haas VF-2 / **PRE-NGC** | HAAS_VF2_-Ai-Enhanced_(iMachining).cps | HaasNGCMill (**NGC, not PRE-NGC**) | YES (NGC) | NO |
| VMC-04 | Haas OM-2 / **PRE-NGC** | HAAS_OM-2_PRE-NGC_PRISM.cps | HaasNGCMill (**NGC mismatch**) | YES (NGC) | NO |
| VMC-05 | Roku-Roku HC 658-II / Fanuc 31i-B5 | **NONE** | **NONE** | -- | -- |

### EDM (3)
| machine | model / controller | CPS | PRISM engine | TESTED | CIMCO |
|---|---|---|---|---|---|
| EDM-01 | Mitsubishi EA12S (sinker) / FP80S | MITSUBISHI_EA12S_FP80S_PRISM.cps | gap (sinker) | -- | NO |
| EDM-02 | Mitsubishi EA12D (sinker) / C30EA-2 | MITSUBISHI_EA12D_C30EA-2_PRISM.cps | gap (sinker) | -- | NO |
| WEDM-01 | Mitsubishi FA10S (wire) / W31MV-2 | MITSUBISHI_FA10S_W31MV-2_PRISM.cps | **MV1200R = WRONG MODEL** | (MV1200R only) | NO |

## 3. ENUMERATED GAPS (the remaining-work set)

**G1 -- CIMCO byte-equivalence validation (fleet-wide, the #1 "tested" gap).** ZERO of the 14
registered `.cps` are validated vs golden NC. This IS the operator's "completed but not tested".
Per machine: open `CIMCOEdit - H` (the ONLY licensed CIMCO, `H:\CIMCO 2026\CIMCOEdit\CIMCOEdit.exe`,
see reference_cimco_edit_h_launcher_2026_06_24), post a known toolpath, diff vs the machine's golden
NC archive. **14 units** (one per registered `.cps`), baseline-first: VMC-01 Hurco, LTH-06 LB3000,
LTH-07 Multus.

**G2 -- Track-PRISM machine coverage gaps (missing higher-tier engines):**
- **WEDM-01 FA10S**: build `MitsubishiFA10SWireEDMMasterPostEngine` (W31MV-2 dialect) -- the existing
  MV1200R engine is the wrong model. The 3 FA10S `.cps` variants (W21FAS-2/W30FAS-2/W31MV-2) exist.
- **EDM-01/02 sinkers**: build `MitsubishiEASinkerMasterPostEngine` (FP80S + C30EA-2). `.cps` exist.
- **VMC-05 Roku-Roku**: build BOTH tracks -- a `RokuRokuFanuc31iMillMasterPostEngine` AND its `.cps`
  (Fanuc 31i-B5). Currently the only machine with neither track.
- **Lathe per-model**: audit `LatheMasterPostRouterEngine` per-model routing; fork/adapt for the 5
  uncovered OSP variants if the canonical OkumaB250 engine does not emit them correctly.

**G3 -- Haas PRE-NGC vs NGC dialect mismatch:** VMC-03/04 are PRE-NGC but the engine is NGC. Verify
PRE-NGC G-code correctness (G187 smoothing, M-code coolant, decimal format differ) or fork a
`HaasPreNGCMillMasterPostEngine`.

**G4 -- Untested support/AI post engines (Track A from v1):** `LathePostProcessorEngine` DONE this
session (e0b0d93ba5). Remaining: `LathePostProcessorAIEngine` (2102 lines), + the ~33 other untested
`*Post*Engine` (Agent sonnet batches of 4). These back the dual-track but are not per-machine.

**G5 -- Closed-loop + pipeline wiring:** wire `pp_outcome_emit` into pipeline P6; AlarmDB full-2588
coverage; golden-NC CI gate so a post regression fails the build.

**G6 -- MS-MASTERPOST (saleable):** gated on U-LEGAL-13 (public manuals only). Last, after G1-G5.

## 4. DEPENDENCY-ORDERED EXECUTION (tracks)

- **Track A (core engine tests) -- IN PROGRESS.** LathePostProcessorEngine DONE. Next:
  LathePostProcessorAIEngine, then the ~33 untested post engines (sonnet batches). Each: real R9
  reference-value test, round-tripped through the engine; surfaces dialect bugs (2 found so far:
  G0NORM backplot, G76 P-word).
- **Track B (baseline CIMCO validation) -- CRITICAL PATH.** G1 for the 3 baselines first
  (Hurco VM30i, LB3000, Multus B250II) -> byte-equiv vs golden. Operator-interactive (CIMCO GUI).
- **Track C (fleet dual-track completion).** G2 + G3 -- build the missing per-machine PRISM engines
  (FA10S wire, EA sinkers, Roku-Roku, Haas PRE-NGC) + their `.cps`; per-model lathe audit; then G1
  CIMCO-validate the remaining 11 machines.
- **Track D (closed-loop + safety).** G5 -- pp_outcome_emit P6 wiring, AlarmDB, golden-NC CI.
- **Track E (MS-MASTERPOST).** G6 -- saleable product, U-LEGAL-13 gated.

## 5. ACCEPTANCE / LOSS FUNCTIONS
- **Test unit:** PASS iff real R9 (reference-value/invariant, happy + >=3 failure + >=2 adversarial),
  round-tripped through the engine, AND surfaces or rules out a dialect defect.
- **CIMCO unit:** PASS iff posted `.cps` output is byte-equivalent to the machine's golden NC for a
  reference toolpath (or every diff is an explained, intended improvement).
- **Dual-track machine:** DONE iff CPS validated AND PRISM engine tested AND both emit equivalent
  safe NC for the same toolpath (cross-track parity probe).
- **Fleet:** DONE iff all 15 machines are dual-track DONE (14 with both tracks + VMC-05 newly built).

## 6. ORCHESTRATION
- Mechanical mining/scaffold -> Ollama / Agent `model:'sonnet'` batches of 4 (Workflow fanout-gate
  blocks >=4 inherit-model). Judgment/dialect-correctness/safety -> Claude.
- Fan-out: lathe -> whiskey, mill -> foxtrot, post -> echo. Wire/EDM -> mike.
- Per-file 2-arm scrutiny per file; 3-of-3 at Stop. CIMCO units are operator-interactive (GUI).
- Run the foreground VITEST_REPORT refresh when the fleet quiesces (freshness gate is peer-thrash).

## 7. OPERATOR-ONLY FORKS
- CIMCO validation is GUI-interactive (open `CIMCEdit - H` on the target machine's control sim).
- U-LEGAL-13 sign-off before any saleable MS-MASTERPOST publish (public manuals only; nothing from
  H:/prism published).
- RESOLVED this session: LB3000 (LTH-06) and Multus B250II (LTH-07) are two distinct JM lathes.
