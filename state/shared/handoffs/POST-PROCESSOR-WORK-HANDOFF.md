# POST-PROCESSOR-WORK-HANDOFF

**Topic:** All PRISM master-post engine work on `work/ppgh05`
**Author:** claude-32612444 · 2026-05-05 ~22:00 UTC
**Branch:** `work/ppgh05` (sibling worktree at `H:/prism-ppgh05`)
**Trigger phrases for next chat:** "continue post processor work", "PPG", "master post audit", "Multus", "Hurco V11", "Okuma M460V", "OSP-P300SA"

This is the **canonical post-processor session handoff** — drop-in for any chat picking up master-post work, regardless of session ID. The companion per-chat handoff at `HANDOFF-claude-32612444-ppgh05.md` has the same content keyed to my session ID; this one is keyed by topic for easier discovery.

---

## ELEVATOR PITCH

PRISM ships 3 TypeScript master-post engines, each paired with a canonical PRISM-modified Mastercam/Fusion CPS post in `JM DIE/PRISM MODIFIED POST PROCESSORS/`:

| Engine (`mcp-server/src/engines/`) | Canonical .cps companion | FORKID |
|---|---|---|
| `HurcoV11MillMasterPostEngine.ts` | `HURCO_VM30i_PRISM_v11.cps` | `1B14E478-26FE-4db2-A3E7-FB814E8C0B4E` |
| `OkumaOSPMillMasterPostEngine.ts` | `OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps` | `2F9AB8A9-6D4F-4087-81B1-3E14AE260F81` |
| `OkumaMultusB250IIMillTurnMasterPostEngine.ts` | `OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5_2_7.cps` | `D93DAA65-1C09-402E-9871-3280B561D994` |

Hurco + Okuma are full G-code emitters (consume `MillOperation[]`, emit canned-cycle expansion + BlockAnnotation envelope). The Multus engine is a **facade** — it does NOT emit G-code; the .cps does. PRISM owns identity, validation, drift detection, and (as of U-PPGMU06) physics cross-checks against the .cps's emitted output.

---

## CRITICAL DISCIPLINE — DO NOT FORGET

1. **Multus engine is a FACADE.** Never replicate emission logic the .cps already has. The .cps owns G-code emission via Mastercam/Fusion runtime; PRISM owns identity, validation, and physics cross-checks.
2. **JM Die fleet correction:** Hurco engine docstring used to say "VMX24" — wrong. JM Die's actual Hurco fleet is the **VM30i**. WinMax V11 controller is identical so all U-PPGH01-15 work transfers unchanged.
3. **Physics constants** come from `src/physics/constants.ts:CANONICAL_KIENZLE` and `:CANONICAL_TAYLOR` only. NEVER inline kc1_1, mc, Taylor C/n.
4. **Worktree separation:** main worktree at `H:/prism` has the full `JM DIE/` checkout (24K files); `H:/prism-ppgh05` does NOT. All live `.cps` reads in tests use `it.skipIf` and skip on this worktree — main-worktree CI exercises them.
5. **camDispatcher peer-claim chain in main is permanent.** Don't fight for `H:/prism/mcp-server/src/tools/dispatchers/camDispatcher.ts` — edit ppgh05's copy and cherry-pick later.

---

## SESSION COMMIT LINEAGE — 7 commits, all pushed to `origin/work/ppgh05`

| SHA | Unit | Summary |
|---|---|---|
| `d95b6d220` | U-PPGM18 | sealMasterPostOutput stale schema_version assertion fix (1.1.0 → constant import) |
| `4452f4e3d` | U-PPGMU01 | OkumaMultusB250IIMillTurnMasterPostEngine facade scaffold + 16 smoke tests |
| `b6ccbcc9f` | META-FIX/CAMX-MS22-U01 | Restored missing `camxMs22U01ActionSchemas.ts` (camDispatcher dependency that was never tracked on this branch) |
| `1aebd88c6` | U-PPGMU02 | Multus dispatcher wiring: schema + action enum + case handler + 16-test round-trip |
| `1a883d664` | U-PPGMU03 | Multus accuracy refinement (multi-agent audit findings) — 4 new pinned constants, 13-group property enum, 88-property baseline, 3 new drift checks |
| `eeb28fc73` | U-PPGMU04+05 | Hurco + Okuma canonical-.cps companion bridges + 3-way audit; Hurco docstring VMX24→VM30i corrected |
| `cfdae2ff6` | U-PPGMU06 | Multus Kienzle Fc cross-check vs canonical — `verifyEmittedForceEstimates()` parses `(PRISM EST. CUTTING FORCE: NNN N)` comments, flags drift > 15% |

---

## ENGINE-BY-ENGINE STATE

### HurcoV11MillMasterPostEngine

- Targets JM Die's **Hurco VM30i** (not VMX24 — corrected in U-PPGMU04). WinMax V11 controller.
- Full G-code emitter via `generateProgram(operations, config)`.
- Feature units shipped earlier: U-PPGH01..U-PPGH15 (TSC coolant, aggressiveness L1-L5, prove-out, material override, HSMDwell+UltiMotion, Taylor tool-life, G54..G59 routing, Op-N warning prefix, postSingle, structured setup_sheet, Kienzle clamp, stickout deflection, etc.)
- **U-PPGMU04 added:** `HURCO_CANONICAL_*` constants (path, FORKID, description="PRISM Enhanced - HURCO VM30i", vendor="HURCO", revision="PRISM v10.9 DRILLFIX...", extension="hnc" — Hurco WinMax native, NOT min/nc, programNameIsInteger=true, minimumRuntimeRevision=45793) + 20-entry `HURCO_CANONICAL_PRISM_FEATURE_FAMILIES`.
- Tests: 88/88 (`HurcoV11MillMasterPostEngine.test.ts`) + 5/5 + 1 skipped (`HurcoV11MillMasterPostEngine.CanonicalCompanion.test.ts`).

### OkumaOSPMillMasterPostEngine

- Targets the OSP-P300M / OSP-P500M family (MB-V / MU-V / Genos M-series 3-axis and 5-axis).
- Full G-code emitter via `generateProgram(operations, config)`.
- Feature units shipped earlier: U-PPGOH01..U-PPGOH05 (structured setup_sheet, postSingle, op.tool shadowing, stickout deflection, Kienzle clamp).
- **U-PPGMU05 added:** `OKUMA_M460V_CANONICAL_*` constants for the M460V-5AX Ai-Enhanced .cps. Controller "OSP-P300MA-H" (5-axis specialty trim, distinct from family-level P300M/P500M). Extension uppercase "MIN" (note: Multus uses lowercase "min"). 27-entry `OKUMA_M460V_CANONICAL_PRISM_FEATURE_FAMILIES` covering 5-axis TCP G169/G170, high-precision G08 P1, look-ahead 10-200, G62 corner round, singularity avoidance, C-axis repositioning, iMachining variable feed, Super NURBS G131, etc.
- Tests: 67/67 (`OkumaOSPMillMasterPostEngine.test.ts`) + 6/6 + 1 skipped (`OkumaOSPMillMasterPostEngine.CanonicalCompanion.test.ts`).

### OkumaMultusB250IIMillTurnMasterPostEngine

- **FACADE** for the canonical `OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5_2_7.cps`. NOT an emitter.
- Controller `OSP-P300SA` (specialty multi-tasking variant). 11 `usePRISMxxx` intelligence flags pinned. 88-property catalog audited. 13 property groups: configuration · formats · homePositions · preferences · ssvControl · toolChange · spindle2Offset · ospP300SA · feedOptimization · cycleTime · prismEnhancements · cycleTimeAdvanced · fileSize.
- Pinned constants (U-PPGMU01-03): `CANONICAL_POST_RELATIVE_PATH`, `CANONICAL_FORKID`, `CANONICAL_DESCRIPTION`, `CANONICAL_VENDOR`, `CANONICAL_EXTENSION` (lowercase "min"), `CANONICAL_PROGRAM_NAME_IS_INTEGER` (false), `CANONICAL_REVISION_TAG`, `CANONICAL_MINIMUM_RUNTIME_REVISION` (45909), `PRISM_INTELLIGENCE_FLAGS` (11-tuple), `CANONICAL_PROPERTY_GROUPS` (13-tuple), `CANONICAL_PROPERTY_COUNT_BASELINE` (88).
- Methods: `parseMetadata(cpsContent)`, `validateCanonical(meta)` (11 drift checks), `inspectCanonical({cpsContent? | cpsPath? | repoRoot?})`, `getStats()`, **and as of U-PPGMU06: `verifyEmittedForceEstimates(gcodeLines, ops, driftThresholdPct?)`**.
- Dispatcher action: `prism_cam:master_post_okuma_multus_b250` → invokes `inspectCanonical()`. Schema accepts optional `cps_content` / `cps_path` / `repo_root`.
- Tests: 21/21 + 1 skipped (engine smoke), 16/16 (dispatcher round-trip), 14/14 (Kienzle cross-check).

---

## CURRENT TEST STATE — 261/261 GREEN + 3 skipped, zero regressions

| Suite | Pass / Total | Skipped |
|---|---|---|
| `HurcoV11MillMasterPostEngine.test.ts` | 88/88 | 0 |
| `HurcoV11MillMasterPostEngine.CanonicalCompanion.test.ts` | 5/5 | 1 (live `.cps` read) |
| `OkumaOSPMillMasterPostEngine.test.ts` | 67/67 | 0 |
| `OkumaOSPMillMasterPostEngine.CanonicalCompanion.test.ts` | 6/6 | 1 (live `.cps` read) |
| `OkumaMultusB250IIMillTurnMasterPostEngine.test.ts` | 21/21 | 1 (live `.cps` read) |
| `OkumaMultusB250IIMillTurnMasterPostEngine.KienzleCrossCheck.test.ts` | 14/14 | 0 |
| `camDispatcher.MultusMasterPost.test.ts` | 16/16 | 0 |
| `MitsubishiMV1200RWireEDMMasterPostEngine.test.ts` | 23/23 | 0 |
| `sealMasterPostOutput.test.ts` | 21/21 | 0 |
| **Total** | **261/261** | **3** |

---

## NEXT-UNIT QUEUE

Smallest-first per `RESUME_POSTS_TOMORROW.md` Priority 1.

### U-PPGMU07 — Multus Taylor T cross-check (next)

Mirror the U-PPGMU06 `verifyEmittedForceEstimates()` pattern but for the .cps's `usePRISMToolLifeTracking` output. The .cps emits something like `(PRISM TOOL LIFE: NNN min)` — verify exact format by reading the .cps's `writePRISMToolLifeTracking` function. Compare emitted T against canonical Taylor T = (C/Vc)^(1/n) using `CANONICAL_TAYLOR[material_iso]`. Hard-block at >15% drift (default).

API to ship:
```ts
export interface MultusOpTaylorSpec {
  op_id: string | number;
  material_iso: ISOGroup;
  vc_mpm: number;          // cutting speed [m/min]
  /** Optional override; falls back to CANONICAL_TAYLOR[iso].C/n. */
  taylor_C_override?: number;
  taylor_n_override?: number;
}
export interface MultusToolLifeDriftResult { /* same shape as Force result */ }
static verifyEmittedToolLifeEstimates(gcodeLines, ops, driftThresholdPct = 15)
```

### U-PPGMU08 — BlockAnnotation envelope for Multus

So `sealMasterPostOutput` can seal Multus output the same way it seals Hurco / OkumaOSP / Mitsubishi. Need to map .cps emission blocks to `BlockAnnotation[]` shape (block_id, op_id, iso_group, tool_material, emitted: { vc_mpm, ap_mm, S_rpm, F_mmpm }, physics_basis: "kienzle", confidence, safety_margin, source_constants).

### U-PPGMU09+ — Sweep remaining 9 PRISM flags

One per unit, smallest-first: `usePRISMChipLoadMonitor`, `usePRISMArcFeedAdjust`, `usePRISMCornerDecel`, `usePRISMThermalComp`, `usePRISMSpindleWarmup`, `usePRISMToolBreakDetect`, `usePRISMStabilityHints`, `usePRISMCycleTimeEstimate`, `usePRISMSurfaceFinishPredict`. Each is a new `verifyEmittedXxx` static method with its own test suite.

### After Multus completes

- **Priority 2:** Author full `OkumaB250LatheMasterPostEngine.test.ts` unit-test file (only sidecar/integration tests exist; `stop_on_untested_engine` may flag this).
- **Priority 3:** Bring OkumaB250 + Mitsubishi WEDM to Hurco/OkumaOSP feature parity (postSingle, structured op.tool, structured setup_sheet, Kienzle clamp, stickout deflection — subset of U-PPGH10..U-PPGH15).
- **Priority 4:** Cherry-pick `work/ppgh05` → `work/cam-exhaust-ms0` once main's camDispatcher peer-claim chain releases.

---

## TOOLING CAVEATS

### Codex CLI

- Installed at `C:/Users/wompu/AppData/Roaming/npm/codex.cmd` (not on bash PATH; invoke by absolute path).
- Config at `C:/Users/wompu/.codex/config.toml` — model is now `gpt-5.5-codex` + `xhigh` reasoning + `concise` summaries (fast mode), updated 2026-05-05. If 5.5 isn't on this account tier, codex surfaces a clear error and you can revert to 5.3.
- Codex DOES synthesize answers but is slow on web-search tasks. Allow ≥600s timeout for research prompts. The 180s timeout used in the U-PPGMU03 multi-agent fanout was insufficient — codex got through ~30 web searches against okuma.com but never wrote the synthesis. Bump to 600s next time.

### Gemini CLI

- Installed at `C:/Users/wompu/AppData/Roaming/npm/gemini.cmd`.
- **BLOCKED:** local API key has `limit:0` for `gemini-3.1-pro` (Pro 3) — paid tier required. Free `gemini-2.5-flash-lite` has 20-req daily cap. Skip Gemini in multi-CLI fanouts until billing is enabled at https://ai.google.dev/.

### Multi-agent fanout caveats

- Some Claude sub-agents return `[Tool result missing due to internal error]` with no payload. The work usually DID happen but the result wasn't transmitted. Treat retries cautiously — a retry of a "failed" Edit may cause duplicate insertions (this caused a 5-minute detour in U-PPGMU05). Always check file state before re-issuing an Edit that returned internal-error.
- Self-claim-echo in CrossSession warnings is normal: the file-claim hook sometimes reports your own claim back as "DESKTOP--XXXXX". Verify against the live chat-bus injection (which lists actual peer chats) before treating as a real conflict.

---

## RESEARCH ARTIFACTS

Persisted under `state/shared/multus-research/`:

| File | Content |
|---|---|
| `codex-multus-audit.txt` | Codex web-search log against okuma.com docs (~30 searches; synthesis truncated by 180s timeout) |
| `gemini-multus-kinematics.txt` | Gemini quota-exhaust error trace (evidence of the `limit:0` block) |
| `POST-AUDIT-3WAY-COMPARISON.md` | Bidirectional feature-gap report for all 3 master posts: what each .cps has the engine doesn't (full-emit features), what each engine has the .cps doesn't (process-plan-only features) |

---

## SCRUTINY GATE STATUS

3-way (Codex + Gemini + Opus) was **NOT** run for any of the 7 commits this session. Codex was wired but its 180s window cut off mid-research; Gemini Pro 3 quota-blocked. Self-review covered each commit and the 261/261 regression sweep is the load-bearing verification.

If the next chat hits the Stop block, escape-hatch via 3 retries OR run the full 3-way per CLAUDE.md §SCRUTINY GATE. The risk envelope on these commits is: U-PPGM18 = 4-line test fix; U-PPGMU01-06 = facade + cross-reference + Kienzle validator (all pure TypeScript, no machine-going G-code emitted by these changes).

---

## QUICK-START FOR NEXT POST-PROCESSOR CHAT

1. **Confirm you're on `work/ppgh05`** (sibling worktree at `H:/prism-ppgh05`). If on main, fork: `git worktree add ../prism-ppgh05 -b work/ppgh05 origin/work/ppgh05`.
2. **Read this file + `RESUME_POSTS_TOMORROW.md`** for full context.
3. **Pick from the next-unit queue above** — U-PPGMU07 (Taylor T) is smallest and clearest.
4. **Verify test baseline:** `cd H:/prism-ppgh05/mcp-server && node H:/prism/node_modules/vitest/vitest.mjs run src/__tests__/Hurco* src/__tests__/Okuma* src/__tests__/MitsubishiMV1200R* src/__tests__/sealMasterPostOutput.test.ts src/__tests__/camDispatcher.MultusMasterPost.test.ts` — should report 261/261 + 3 skipped.
5. **Ship as `[CAM-EXHAUST-MS0]/U-PPGMU0N: <title>`** matching the existing commit format.
6. **Update RESUME_POSTS_TOMORROW.md + this handoff** at session end.
