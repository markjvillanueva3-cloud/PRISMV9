# quality — fleet-managed

## Current state

**Size:** 11,305 bytes · 84 lines
**Quality grade:** GOOD

The file was a phantom stub before 2026-06-08; alpha claimed and populated it from real engine behavior. It is accurate for what it covers and explicitly retracts the phantom path citations it replaced. No fabricated engine names or dispatcher actions found in the body (the MEMORY.md cross-reference is even richer with verified names).

**Stale / inaccurate content found:**

1. `§2 Constants reference` — `mcp-server/src/registries/surface-finish.ts` is flagged "(verify)" but **does NOT exist on disk** (confirmed absent). The note must be changed to `// UNVERIFIED — registry not found on disk; do not import until path is confirmed`.
2. `§3 Common engines` — "CMM-parse + cpk-calc + spc + quality-gate + quality-dashboard skills; SurfaceFinishPredictionEngine; QualityOrchestrator family" is a prose sketch, not a verified list. `SurfaceFinishPredictionEngine` and `QualityOrchestratorEngine` are not confirmed on disk by this assessment (PATHS.md does not list them). Mark `// UNVERIFIED` or drop if absent.
3. `§6 Tribal pointers` — `FAIAutoGenerationEngine` is listed; verified present. `CapabilityCensusEngine` and `CapabilityEffectivenessEngine` are listed but not confirmed by this assessment (not in PATHS.md 30-engine list). Mark `// UNVERIFIED`.
4. `HyperMillFAIBridge.ts` and `MastercamFAIBridge.ts` — listed in §6 but not in PATHS.md engine list. Mark `// UNVERIFIED`.
5. Cross-cutting section (§ after §7) is dense fleet-infra boilerplate (Ollama, LoRA, CAG, RAG, loops, Obsidian vault) that is 100% duplicated across all 34 galaxies via the `wire-galaxies-to-operational-context.mjs` auto-injection into TOOLBELT.md. It inflates CLAUDE.md by ~30 lines without adding quality-specific content.
6. `<!-- CRITIC-KEEPWORKING-STANZA -->` block + `<!-- AI-SYSTEMS-STATE -->` block — pure fleet-universal boilerplate that lives in every galaxy CLAUDE.md. Belongs in the universal pointer, not duplicated here.

---

## KEEP

The following sections are accurate, load-bearing, and quality-specific — retain verbatim:

- **§1 Domain scope** — clean boundary definition (quality owns capability study + gates; shop-floor owns live SPC stream). Keep as-is.
- **§2 Constants reference** (rows 1 and 2 only) — `MIN_ACCEPTABLE_CPK = 1.33` and `IDEAL_CPK = 2.0` exported from `CpkPredictionGateEngine.ts` (verified line 24/26); control-chart constants as methods on `SPCProcessCapabilityEngine` (verified in PATHS.md). Fix the surface-finish row (see DROP).
- **§4 Test commands** — `npx vitest run -t "Quality|SPC|Cpk|CMM"` is concrete and domain-correct.
- **§5 Quality/SPC gotchas** — all 6 gotchas are verified domain-expert content authored from real engine behavior. Especially: Cpk≠Cp distinction, conservative-lower-bound gate, subgroup-size-dependent constants, gauge R&R pre-gate. Keep all 6 verbatim.
- **§6 Tribal pointers** — wiki search paths + verified engine list (retract unverified names per DROP). The dispatcher action list is the richest verified list in the file; keep it.
- **§7 Cross-galaxy edges** — all 5 edges are accurate and load-bearing for a fleet-managed galaxy with no dedicated slot. The bidirectional edge map and ownership split (quality owns offline/capability, shop-floor owns live stream) is exactly the kind of content that prevents cross-galaxy duplication bugs.
- **§Related galaxies** — PSN edge table with symmetric markers; keep.

---

## DROP

Remove or replace the following (token waste or inaccurate):

1. **`surface-finish.ts` row in §2** — file does not exist. Replace with: `Surface finish Ra grades: no canonical registry found on disk — search \`prism_quality:finish_target_advise\` dispatcher action; verify \`src/registries/\` before creating a new file.`
2. **`SurfaceFinishPredictionEngine` and `QualityOrchestrator family` in §3** — unverified names. Drop or mark `// UNVERIFIED`.
3. **`CapabilityCensusEngine`, `CapabilityEffectivenessEngine`, `HyperMillFAIBridge.ts`, `MastercamFAIBridge.ts` in §6** — not in PATHS.md verified engine list. Mark `// UNVERIFIED` or confirm via `ls` before next edit.
4. **`§ Cross-cutting methodology` block (lines ~59–69)** — 100% fleet boilerplate auto-injected into TOOLBELT.md. Delete from CLAUDE.md; pointer to TOOLBELT.md suffices.
5. **`<!-- CRITIC-KEEPWORKING-STANZA -->` block** — universal doctrine, already in main CLAUDE.md. Delete; covered by universal-core pointer.
6. **`<!-- AI-SYSTEMS-STATE:BEGIN/END -->` block** — fleet-infra pointer block replicated across all galaxies. Delete; covered by universal-core pointer or TOOLBELT.md injection.
7. **`§Cross-refs` link to `../CLAUDE.md`** — the monolith is being replaced by per-galaxy files; the pointer should target `PRISM/CLAUDE.md §UNIVERSAL-CORE-POINTER` not the ambiguous relative `../CLAUDE.md`.

---

## ADD (domain-specific — the heart of this assessment)

The following are missing and critically needed for a quality chat to operate without the 101KB monolith:

### 1. Verified engine inventory (compact, inline)
The current §3 is a prose sketch. Replace with a verified flat table cross-referencing PATHS.md:

| Role | Engine (verified on disk) |
|------|--------------------------|
| Cpk gate | `CpkPredictionGateEngine.ts` |
| Capability study | `SPCProcessCapabilityEngine.ts`, `ProcessCapabilityPredictionEngine.ts`, `QualityFormulasEngine.ts` (Cp/Cpk/Cpm/non-normal Clements/CI/gage R&R/sampling plans) |
| SPC charts | `SPCChartingEngine.ts`, `NelsonSPCRulesEngine.ts`, `MultivariateSPCEngine.ts`, `EWMAEngine.ts`, `SPCPreControlEngine.ts`, `SPCFeedbackLoopEngine.ts`, `WEDMOffsetSPCEngine.ts` |
| MSA / Gage R&R | `MeasurementSystemAnalysisEngine.ts`, `GageRRMSAEngine.ts` |
| CMM | `CMMImportEngine.ts`, `CMMHistoryEngine.ts`, `CMMPathPlanningEngine.ts` |
| GD&T stack-up | `GDTStackupEngine.ts` |
| FAI / inspection | `FirstArticleInspectionPipelineEngine.ts`, `FAIAutoGenerationEngine.ts`, `InspectionReportEngine.ts`, `TurningInspectionPlanEngine.ts`, `WetRunSampleInspectionPlanEngine.ts` |
| Turning-specific | `TurningCpkSurrogateEngine.ts`, `LatheQualityGateEngine.ts` |
| CAM bridges | `HyperMillSPCBridge.ts`, `MastercamSPCBridge.ts` |
| ERP feed | `ERPQualityEngine.ts` |
| Dashboard / score | `QualityDashboardEngine.ts`, `QualityScoreEngine.ts`, `MachineQualityScoreEngine.ts`, `QualityPredictionEngine.ts` |

(All engine paths: `mcp-server/src/engines/<name>.ts`. Engines NOT on PATHS.md 30-list are marked UNVERIFIED above.)

### 2. Dispatcher action quick-ref (daily use)
A quality chat needs the full verified action list inline — currently it's buried in §6. Promote to its own section:

```
prism_quality actions (qualityDispatcher.ts — verified exists):
  Cpk/capability:  cpk_predict · spc_process_capability_analyze · quality_formulas_calculate
  SPC charts:      spc_calculate · ewma_analyze · multivariate_spc_analyze · western_electric_rules_check
  MSA / Gage R&R:  gage_rr_msa_calculate · gauge_rr · measurement_analyze
  CMM / GD&T:      cmm_plan · gdt_validate · tolerance_stack
  FAI:             fai_run · fai_evaluate_characteristic · fai_generate_forms · fai_disposition
  ERP/data:        data_quality_validate · finish_target_advise · roundness_cylindricity_sampling_plan
  Fleet:           psn_synergy_inspect
```

### 3. Cpk role-floor table (currently only in MEMORY.md)
Per `reference_hotel_cpk_role_floors.md` and `EmployeeMachineDomainAcademyEngine`, the academy promotes role-specific floors:
- Operator: ≥1.0
- Setup: ≥1.33 (= `MIN_ACCEPTABLE_CPK`)
- Programmer: ≥1.67
These are imported from `EmployeeMachineDomainAcademyEngine` — never inline. The current CLAUDE.md §5 only documents the gate floor (1.33); the role-floor table belongs here so a quality chat doesn't re-derive it from memory.

### 4. Database intake quick-ref (currently only in PATHS.md)
A quality chat accessing tolerance or formula data needs:
- `ToleranceDB` — ISO 286, 260 entries — `prism_data:database_search`
- `FormulaDB` — 499 entries — `prism_data:database_search`
- `PrismReferenceDB` — 13,920 entries — `prism_data:database_search`
These are already in PATHS.md but a working quality chat should not need to open PATHS.md for a daily lookup.

### 5. CMM-specific protocol (currently absent entirely)
No CMM workflow doctrine exists in CLAUDE.md. Add:
- CMM probe-cloud workflow: `CMMImportEngine` → parse → `spatial_ransac_fit` (via `prism_algorithm`) for outlier-robust flatness/straightness/parallelism → `GDTStackupEngine` for tolerance stack-up. RANSAC rejects bad probe touches that wreck ordinary LS fit; reports RMS orthogonal residual as the form-error metric.
- Never use OLS directly on CMM clouds without outlier rejection.

### 6. "What NOT to do" list (currently absent)
These are the domain-specific refuses (from SOUL.md + gotchas + operational experience):
- Do NOT report Cp as Cpk (they measure different things; Cp ignores bias).
- Do NOT inline `1.33` or `2.0` — import from `CpkPredictionGateEngine.ts`.
- Do NOT gate on the point-estimate Cpk — gate on the conservative lower-bound from `SPCProcessCapabilityEngine`.
- Do NOT use fixed n=5 control-chart constants for n≠5 subgroups — call `getA2/getD3/getD4(subgroupSize)`.
- Do NOT run a capability study before validating the gauge (%R&R < 30% required).
- Do NOT duplicate SPC chart logic into the shop-floor galaxy — shop-floor owns the live stream; quality owns the offline math.
- Do NOT soften the S(x) safety gate to satisfy a Cpk requirement — Cpk and S(x) co-evaluate independently; S(x) vetoes G-code output unconditionally.
- Do NOT create `src/data/cpk-thresholds.ts` or `src/data/spc-constants.ts` — these paths are confirmed phantom; the data lives in the engine methods.
- Do NOT re-OCR Docustrata — search `manifest.json` + `.index/`.

### 7. JM Die quality ground truth paths (currently absent from CLAUDE.md, only in PATHS.md)
- Setup sheets with actual inspection records: `JM DIE/SETUPS/`
- Closed order docs (dimensional/cert records): `Docustrata/JMD Orders Closed`
- CMM programs: search `mcp-server/data/jm-die-database/` index for `cmm|inspection|fai`

### 8. Key wiki entries for quality (currently absent from CLAUDE.md)
- `knowledge/wiki/quality/quality-foundations.md` — NIST/SEMATECH-verified Cp/Cpk/control-chart formulas
- `knowledge/wiki/code-tribal/quality-first-article-inspection-and-spc-cadence.md`
- `knowledge/wiki/code-tribal/math-statistical-methods-spc-doe-capability.md`
- `knowledge/wiki/code-tribal/math-metrology-measurement-uncertainty.md`
- `knowledge/wiki/architecture/dispatcher-quality.md` — full dispatcher action schema

### 9. RANSAC algorithm pointer (currently only in MEMORY.md §Known assets)
`spatial_ransac_fit` via `prism_algorithm` dispatcher — use for CMM flatness/straightness/parallelism from probe clouds. Detail: `reference_tango_algo_synergy_batch_2026_05_29`.

---

## IDEAL SECTION OUTLINE

```
# quality — Galaxy CLAUDE.md

## 1. Domain scope + ownership
   (what this galaxy owns vs shop-floor; fleet-managed = alpha secondary)

## 2. Dispatcher quick-ref
   (prism_quality full verified action list, grouped by function)

## 3. Engine inventory (verified)
   (compact table: role → engine filename)

## 4. Constants + thresholds
   (MIN_ACCEPTABLE_CPK=1.33, IDEAL_CPK=2.0 from CpkPredictionGateEngine;
    role floors from EmployeeMachineDomainAcademyEngine;
    control-chart consts = methods on SPCProcessCapabilityEngine, not flat data;
    NO surface-finish.ts — use finish_target_advise action)

## 5. SPC/Cpk domain gotchas (keep all 6 from current §5)

## 6. CMM + GD&T workflow
   (CMMImport → RANSAC outlier-reject → GDTStackup; never OLS on raw probe cloud)

## 7. Database intake
   (ToleranceDB 260, FormulaDB 499, PrismReferenceDB 13920 — prism_data:database_search)

## 8. Cross-galaxy edges
   (keep current §7 table; add: quality gates PRE-cut → cam/mill/lathe/wedm)

## 9. What NOT to do
   (9-item refuse list above)

## 10. Knowledge resources
   (wiki entries, tribal tips, JM Die ground truth paths, free-source corpus pointer)

## 11. Test commands
   (npx vitest run -t "Quality|SPC|Cpk|CMM")

## 12. Universal-core pointer
   (pointer to H:/prism/CLAUDE.md for R1-R15, scrutiny gate, handoff, commit format)
```

---

## UNIVERSAL-CORE POINTER

The quality galaxy CLAUDE.md must NOT duplicate any of these — reference main CLAUDE.md once:

- **R1–R15** (Karpathy discipline + agent-era rules): `H:/prism/CLAUDE.md §CLAUDE.md RULES 5–13` + `§EXPERT ROLE`
- **3-of-3 scrutiny gate**: `H:/prism/CLAUDE.md §SCRUTINY GATE`
- **Per-file scrutiny gate**: `H:/prism/CLAUDE.md §PER-FILE SCRUTINY GATE`
- **Per-chat handoff**: `H:/prism/CLAUDE.md §PER-CHAT HANDOFF`
- **Commit format** (`[SCOPE]/U-ID: title`): `H:/prism/CLAUDE.md §SESSION HYGIENE`
- **Units-first rule** (inch vs mm source verification): `H:/prism/CLAUDE.md §SAFETY RAILS`
- **No-stub / no-inline-physics-constants**: `H:/prism/CLAUDE.md §SAFETY`
- **Duplication guard** (`duplicationGuardEngine`): `H:/prism/CLAUDE.md §MANDATORY SELF-AWARENESS`
- **Ollama offload ladder + RTK bash**: `H:/prism/CLAUDE.md §TOKEN ECONOMY` (also in TOOLBELT.md operational-context block — do not duplicate in CLAUDE.md)
- **Fleet-infra (slot worktrees, golf hygiene, fleet-reaper, AI fleet state)**: pointer only → main CLAUDE.md

Suggested pointer block (6 lines, replaces all duplicated boilerplate):
```markdown
## Universal-core pointer
> Safety rails, R1–R15, scrutiny gate (3-of-3), per-chat handoff, commit format, units-first,
> no-stub/no-inline-constants, duplication guard, Ollama offload, RTK bash, fleet-infra:
> **→ `H:/prism/CLAUDE.md`** (read once per session; hooks auto-inject the critical gates).
> Operational context (hardware, Ollama tiers, vault, LoRA/CAG/RAG, loops):
> **→ `./TOOLBELT.md §OPERATIONAL CONTEXT`** (auto-maintained by wire script).
```
