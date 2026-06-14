---
name: reference_echo_post_gen_coverage_audit
description: "Authoritative post-processor GENERATION coverage audit (workflow+codex+glob, 2026-05-29). PARTIAL ~40%; 4 P0 machine-routing gaps = echo's build backlog. Live vs stub generation map."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.094Z
aliases: reference_echo_post_gen_coverage_audit
---


slot:echo audited post-processor GENERATION coverage across all DB machines/controllers (operator /goal, workflow `wf_37f4cf5f-0f6` + Codex + Glob; spec `state/shared/specs/POST-GEN-COVERAGE-AUDIT-2026-05-29-echo.md`, commit 8b6c2c5a16).

**Verdict: PARTIAL ~40%.** 124 `*Post*.ts` engines exist (galaxy doc had cataloged ~25); machine-CLASS coverage spans mill/lathe/wedm/sinker/swiss/5-axis/laser/waterjet. Bottleneck = **machine-ROUTING**: only ~6 machines have a live `machine_model → engine.generate()` path. Of ~23 generation engines: **~9 LIVE · 14 stub-wired (`?.()` pattern) · 0 truly dark**.

**LIVE (machine-routed):** Hurco VM30i (`HurcoV11MillMasterPostEngine`, best-covered) · Okuma M460V-5AX (`OkumaOSPMillMasterPostEngine`) · Okuma lathes (`OkumaB250LatheMasterPostEngine` + `lathe_masterpost_emit`; CAVEAT hardwired to LB250II-M) · Mitsubishi FA10S WEDM (5 vendor WEDM engines have REAL generate/parse/tech_table/dialect — dispatcher `?.()` over-flags them as stub) · generic `master_post_process` fanout (caller supplies controller+segments).

**4 P0 machine gaps (echo BUILD BACKLOG):**
1. **Haas VF-2 + OM-2 (PRE-NGC)** — no Haas branch in `master_post_by_machine` → HARD-REJECT; only NGC profile (G187/G234/WIPS) exists → wrong dialect for legacy. FIX: `HaasNGCMillMasterPostEngine` + PRE-NGC profile.
2. **Roku-Roku HC 658-II (Fanuc 31i-B5)** — `no_post_available`; no engine. FIX: Fanuc mill master-post (31i-B5 profile exists) + wire.
3. **Mitsubishi EA12S/EA12D sinker EDM** — `PPSinkerEDMPostEngine.generate()` REAL but NOT machine-routed (only generic `edm_sinker_program`→edmAsm). FIX: machine-routed EA-family action.
4. **WEDM FA10S WRONG-dialect route** — `master_post_by_machine` routes `MITSUBISHI`/`MV1200`→MV1200R engine (M700V/M800 dialect); JM machine is FA10S. FIX: FA-family branch→`WEDMPostMitsubishiEngine.generate()` (cheapest P0, 1 branch).

**P1:** `?.()`-fallback masks real lathe methods (LathePostProcessorAI getPostProfile real @L874) → direct call + typed error; **824-machine MachineRegistry vs ~6 live routes** = macro gap; OkumaB250 LB250-hardwire. **P2:** 3 dup `master_post_unified_agi_*` stub-tail actions; AGI/Genius orchestration dark; 3 GCode post-emit analyzers stub.

**Doctrine fix shipped:** PATHS.md stale claim (Genius+AGIOrchestration "DARK 0-case") corrected → stub-wired 1-case. **Codex caveat:** its INCOMPLETE-35% over-stated engine *absence* (sandbox couldn't read tree); engines exist — routing/validation is the gap. See [[reference_echo_post_data_corpus_paths]] · [[reference_echo_nc_dialect_lint]].
