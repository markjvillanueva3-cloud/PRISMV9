# Post-Processor Generation Coverage Audit (slot:echo, 2026-05-29)

**Question (operator):** does the post-processor galaxy include everything needed for post-processor GENERATION across all machines and controllers in the database?

**Answer: NO — PARTIAL (~40%).** The engines largely EXIST (124 `*Post*.ts`), and machine-CLASS coverage spans mill/lathe/wedm/sinker/swiss/5-axis/laser/waterjet. The bottleneck is **machine-ROUTING**: only ~6 machines have a live `machine_model → engine.generate()` path. 4 real JM machines + one mis-route are **P0**; 824 DB machines vs ~6 live routes is the macro gap.

**Method (3 independent arms, reconciled):**
- **Workflow** `wf_37f4cf5f-0f6` — 4-agent; `engines` + `coverage` arms succeeded (machine-grounded, authoritative here); `machines`/`controllers` arms failed (StructuredOutput under fleet rate-limit).
- **Codex** thread `019e7482…` — returned INCOMPLETE ~35% but anchored to echo's docs only (its sandbox couldn't read the tree: Windows `CryptUnprotectData`); over-stated engine *absence*.
- **echo ground-truth Glob** — 124 `*Post*.ts` engines on disk.

## LIVE coverage (machine_model-routed, real `.generate()`/`.process()`)
| Machine | Path |
|---|---|
| **VMC-01 Hurco VM30i / WinMAX v10** | `master_post_by_machine` Hurco → `HurcoV11MillMasterPostEngine.generateProgram()` + `master_post_hurco_v11` + `.cps` on disk. **Best-covered.** |
| **VMC-02 Okuma M460V-5AX / OSP-P300** | `master_post_by_machine` → `OkumaOSPMillMasterPostEngine.generateProgram()` + `master_post_okuma_osp` + `.cps`. |
| **LTH-01..07 Okuma lathes** | `OkumaB250LatheMasterPostEngine.generateProgram()` + `lathe_masterpost_emit`→`LatheMasterPostAPIEngine`. **Caveat: OkumaB250 hardwired to LB250II-M tribal → non-LB250 controllers (P200LA/P300LA-E/P500/U10L) may emit slightly-off codes.** |
| **WEDM-01 Mitsubishi FA10S** | 5 vendor WEDM engines have **real** `generate()+parse()+tech_table()+dialect()` + `PRISM-Master-*.cps`. (The dispatcher `?.()`-fallback OVER-flags these as "stub" — the methods are real.) **Caveat: machine-route mis-targets dialect, see P0#4.** |
| **Generic fanout** `master_post_process`/`_generate` | haas/okuma/mazak/fanuc/siemens/heidenhain via `MasterPostProcessorEngine.process()` + `UnifiedAGIEngine.generatePost()` — emits real dialected G-code **when the caller hand-supplies controller+segments** (NOT machine-routed). |

## P0 gaps (block a real JM machine)
1. **Haas VF-2 + OM-2 (PRE-NGC)** — `master_post_by_machine` has NO Haas branch → falls to `else` HARD-REJECT ("Unknown machine model"). Worse: the only Haas profile is **NGC** (G187/G234/WIPS); these are **PRE-NGC** legacy → even the generic path emits wrong dialect. **Fix: `HaasNGCMillMasterPostEngine` (mirror Hurco/OkumaOSP) + a PRE-NGC profile.**
2. **Roku-Roku HC 658-II (Fanuc 31i-B5)** — `JM_DIE_CONTROLLER_MAP` row carries `no_post_available`; no engine, no real `.cps`. **Fix: Fanuc mill master-post (Fanuc 31i-B5 profile already in CONTROLLER_PROFILES) + wire.**
3. **Mitsubishi EA12S (FP80S) + EA12D (C30EA-2) sinker EDM** — `PPSinkerEDMPostEngine.generate()` is REAL but NOT machine-routed (only generic `edm_sinker_program`→`edmAsm.assembleSinkerEDM`). **Fix: machine-routed EA-family sinker action.**
4. **WEDM-01 FA10S WRONG-dialect route** — `master_post_by_machine` hard-routes any `MITSUBISHI`/`MV1200` → `MitsubishiMV1200RWireEDMMasterPostEngine` (M700V/M800 dialect), but the JM machine is an **FA10S** (different dialect). **Fix: FA-family branch → `WEDMPostMitsubishiEngine.generate()`.**

## P1 gaps
- **`?.()`-fallback masks real methods** — `LathePostProcessorAIEngine` (getPostProfile real @L874), JMDie + ActiveLearning learning engines wrap calls as `method?.() ?? "not callable"` → degrade defensively even though methods exist. **Fix: direct call + typed error on genuine absence.**
- **824-machine MachineRegistry vs ~6 live machine-routed engines** — DB indexes 824 machines / ~30 mfrs (DMG Mori, Mazak, Makino, Matsuura, Brother, Doosan, Hermle, Grob…). Machine-routing covers ~6. **The macro coverage gap.**
- **Okuma-lathe LB250II hardwiring** (caveat above) — generalize off LB250 or make `LatheMasterPostAPIEngine` primary.

## P2 gaps
- 3 duplicate `master_post_unified_agi_{generate,analyze,kinematics}` stub-tail actions shadow the real `master_post_*` surface (namespace pollution).
- `master_post_agi_orchestrate` + `master_post_genius_generate` — `generateAGIPost?.()`/`generateMasterPost?.()` dark-in-practice (aspirational).
- `gcode_{runtime_predict,reverse_cad_reconstruct,bidirectional_optimize}` — stub-in-practice (downstream-of-emit value-adds, off critical path).

## Engine wiring census (workflow `engines` arm)
Of the ~23 generation-relevant engines: **9-10 LIVE · 14 stub-wired (`?.()` pattern) · 0 truly dark (every one has ≥1 dispatcher case).** Of 124 total `*Post*.ts`, the remainder are AGI/learning/knowledge/telemetry support (not generators). **Galaxy doctrine FIX (this session): PATHS.md stale claim that Genius + AGIOrchestration are "DARK (0 case)" corrected → they are stub-wired (1 case each).**

## Recommendations (build backlog, ROI-ordered)
1. `HaasNGCMillMasterPostEngine` + PRE-NGC profile → closes P0#1 (2 machines).
2. Mitsubishi EA-family sinker post + machine route → P0#3.
3. FA10S WEDM dialect re-route → P0#4 (1-branch fix, cheapest P0).
4. Fanuc mill master-post for Roku-Roku → P0#2.
5. Generalize Okuma-lathe off LB250 hardwire → P1.
6. De-fang `?.()`-fallback pattern fleet-wide (direct call + typed error) → unmasks real lathe methods.
7. Extend `master_post_by_machine` to the 824-DB controller families with existing CONTROLLER_PROFILEs (Siemens 840D, Heidenhain TNC, Mazak Smooth, DMG-Mori Celos).
8. Remove/redirect the 3 duplicate `master_post_unified_agi_*` stub actions.
9. **Per-machine regression harness**: assert `master_post_by_machine(model)` → `success:true` + non-empty gcode + expected dialect, per `JM_DIE_CONTROLLER_MAP` row.

## Provenance
Workflow `wf_37f4cf5f-0f6` (task w5j6xpvmr, 4 agents, 590K subagent-tokens) · Codex `019e7482-35c0-79c3-a81b-27ed85514c1d` · echo Glob (124 engines) · 2026-05-29.

— slot:echo claude-223d9a61, 2026-05-29.
