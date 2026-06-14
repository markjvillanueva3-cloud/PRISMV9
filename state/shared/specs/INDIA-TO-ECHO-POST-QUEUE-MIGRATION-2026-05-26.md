# India → Echo Post-Processor Queue Migration (RECONCILIATION — 2026-05-26)

**Date:** 2026-05-26
**Origin slot:** india (was the post-processor + master-post domain owner)
**Destination slot:** echo (now owns CAM + post)
**Author:** claude-ea1373b3 (slot:echo)

> ## ⚠ R12 correction — the migration ALREADY HAPPENED
>
> Pre-existing memory makes the prior state explicit:
> - **[[reference_india_queue_complete_2026_05_22]]** — *"india /loop 2026-05-22 — verified the india post-processor + master-post queue is COMPLETE; the 8 remaining priority-queue items are phantoms/dups/non-actionable"*
> - **[[reference_hurco_winmax_proveout_ms0_2026_05_23]]** — *"slot echo absorbed india's post-processor queue per user directive 2026-05-23: 'pick up where india left off…'. Commit `26d270b9c2 [HURCO-WINMAX-PROVEOUT-MS0]/P0-U01 (slot:echo absorbing india)`."*
>
> Today's operator directive ("I moved it to echo") is a **re-confirmation** of the 5/23 migration, not a new transfer. This manifest is therefore a **queue reconciliation** — naming what was previously claimed as india's open queue, marking the phantoms, and listing only the genuinely-pending units echo is actually responsible for.
**Source handoffs scanned:**
- `HANDOFF-claude-3350c663-india-post-wire.md` (2026-05-22)
- `HANDOFF-claude-5c520c2a-india-post-processor.md` (2026-05-21)
- `HANDOFF-claude-bde6fa1d-india-hurco-post-ver.md` (2026-05-23)
- `HANDOFF-claude-bde6fa1d-india-jmdie-posts.md` (2026-05-22)
- `HANDOFF-claude-374fe00e-india-cam-parity-clo.md` (2026-05-17)
- `HANDOFF-claude-9f3a8e4f-india-hurco-vm30i-fu.md` (2026-05-25)
- `HANDOFF-claude-9029a5d7-echo-overnight-summary-2026-05-26.md` (echo's overnight close — context for what's already done)

---

## 1. Active slot-task-claims at migration time
`slot-task-claim list --slot india` → **0 active claims**. No mid-flight build to hand off; migration is pure backlog transfer.

## 2. Operator directive
> "india thought it was originally the post chat but I moved it to echo so check its task queue and move it to echo"

Per **CLAUDE.md §JULIETT-12CHAT-ALLOCATION-MS0**, the domain partition table previously read `india=post-processor+master-post`. As of 2026-05-26 the operator has reassigned post-processor work to **echo** (which already owns CAM per the same partition). India retains its other workstreams (speed-feed wiring per the original allocation row was actually `juliett=speed-feed`; india's post role is what's moving).

## 3. India post-processor units already SHIPPED (no migration needed — for context only)

| Unit | Commit | Notes |
|---|---|---|
| U-MASTERCAM-CTRL-CAT | `1e5a7860bc` | 9 `cam_mastercam_controller_*` actions, 12 tests |
| U-CTRL-CALIB-WIRE | `45307688ad` | 3 `cam_controller_calibration_*` actions, 7 tests |
| iter2 MasterPostFineTuningEngine wire → `prism_cam` | (pre-2026-05-22) | shipped |
| iter3 LatheMasterPostSelfAwarenessEngine wire → `prism_cam` | (pre-2026-05-22) | shipped |
| U-CAMP01 + U-CAMP13 + U-CAMP14 + U-CAMP15 | various | 4/16 CAM-PARITY-AGI-MS0 units; U-CAMP14 fixed `safeWeight → NaN` bug in `calculateTotalConfidence` |
| U-JMDIE-POST-GAPS | `119c432034` | `gapReport()` + `jmdie_post_gaps` action on `prism_knowledge`, 51/51 tests |
| HURCO-VM30I-FULL-PSN-MS0 (V11 engine) | echo overnight (5/25-5/26) | 72/72 tests PASS (was 25/50 on 2026-05-22 per india's verify report — **echo closed the remediation overnight**) |

## 4. Open units transferring to echo

Each row below names the source handoff, the open work, what it depends on, and the priority. Echo owns these as of this manifest.

### 4A. ACP-MS5 controller chains — **PHANTOM, DO NOT BUILD**
**Source:** `HANDOFF-claude-3350c663-india-post-wire.md` §RESUME named ACP-MS5 P0-U01/02/03 as "next india".

**Per [[reference_india_queue_complete_2026_05_22]]** — the capability ACP-MS5 names is **already shipped + wired across `prism_cam`**:
- controller detection → `machine_match`, `machine_fingerprint`, `cps_parse` / `cps_map_dialect`, controller catalogs
- template selection + post generation → PPG surface (`ppg_templates`, `ppg_generate`, `ppg_feature_select`) + `master_post_*`
- verification → `pp_verify`, `ppg_validate`, `ppg_prove_out`, `gcode_validate`, plus `PostVerificationSafetyEngine.verify_full()` wired in camDispatcher

ACP-MS5 has **no envelope file** in `mcp-server/data/roadmap/` and no entry in `atomic-roadmap.json`. It is a prose-roadmap name for work already shipped under other IDs. **Skip.**

### 4B. CAM-PARITY-AGI-MS0 remaining units — **NEEDS VERIFICATION**
**Source:** `HANDOFF-claude-374fe00e-india-cam-parity-clo.md` §RESUME — *"CAM-PARITY-AGI-MS0 = 4/16 units complete (U-CAMP01, U-CAMP13, U-CAMP14, U-CAMP15). Next iteration could … tackle remaining U-CAMP02..12+16"*

Atomic-roadmap envelope state at audit time: `claimed:"active"`, `derived:"no_units"` — envelope-derivation drift (envelope says active but no units are ingested into the roadmap-index). This drift is consistent with the **phantom queue** pattern above: the prose lists 16 units but only 4 ingested + already-shipped exist. The remaining 12 may also be phantoms covered by existing wiring.

**Action:** before echo builds any U-CAMPxx unit, verify it's not phantom — `node H:/prism/.claude/helpers/priority-queue.mjs --pick --slot echo` should not surface it, and the envelope must have a unit-level spec. If neither, treat as phantom and skip.

### 4C. Heidenhain/Mitsubishi enhancement asymmetry (1 unit — P0)
**Source:** `HANDOFF-9029a5d7-echo-overnight-summary-2026-05-26.md` §"What's NOT done" — *"engine reports quality=75 on Heidenhain/Mitsubishi vs 85 on Fanuc/Okuma/Haas. Trace: which enhancement(s) in `MasterPostProcessorUnifiedAGIEngine` don't apply to those dialect codegen paths?"*

Located: `mcp-server/src/engines/MasterPostProcessorUnifiedAGIEngine.ts` lines 1283-1298, 1399-1511. The scorers (`runDeepLearningAnalysis`, `quickQualityScore`, `scoreSafety`, `scoreBestPractices`, `scoreAccuracy`) use **Fanuc-rooted regex** for safe-start (`G28|G30|G53`), work-offset (`G5[4-9]`), and HSM (`G5\.1` literal — won't match Mitsubishi's `G05.1`). Heidenhain uses `M91/M92` + `CYCL DEF 7 DATUM SHIFT` for those operations and is invisible to these regexes — only the dialect's `M120` matches via the HSM regex, capping it at 60+15=75.

**Fix sketch:** add per-dialect `signals` to `ControllerProfile` (safe_start, work_offset, comment-format regex sets) and replace the literal regexes with `signals[controller].safe_start.test(gcode)` etc. Same change touches 6 scorer functions.

| Unit | Description | Priority |
|---|---|---|
| U-MASTERPOST-DIALECT-SYMMETRY | Per-dialect scorer signals; Heidenhain/Mitsubishi reach 85+ parity | **P0** |

### 4D. JMDIE-POST-GAPS rollout (3 units — P2, was scoped-out of india's loop)
**Source:** `HANDOFF-claude-bde6fa1d-india-jmdie-posts.md` §RESUME — *"Out-of-scope for this loop (need their own /loop with operator-approved migration plans, shop_floor S(x)>=0.98 tier):"*

| Unit | Description | Priority |
|---|---|---|
| U-JMDIE-SIDECAR-ROLLOUT | sidecar_json_export rollout to 11 missing posts via .cps patch generator mining PRISM-Master-Hurco-VM30i.cps pattern | P2 |
| U-JMDIE-PHYSICS-OKUMA | prism_physics_integration rollout for okuma family (5/5 missing) | P2 |
| U-JMDIE-GAPS-VIZ-ROOST | /system-viz roost for the jmdie_post_gaps surface | P3 |

### 4E. HurcoV11 prove-out roundtrip (1 unit — P2)
**Source:** `HANDOFF-claude-9f3a8e4f-india-hurco-vm30i-fu.md` §RESUME — *"Next iter U-HURCO-ROUNDTRIP-TSX-SIDECAR will switch to sidecar .ts file + node --import=tsx invocation to bypass the quoting trap"*

Known issue: Windows `child_process` `shell:true` invocation eats the inline `tsx -e` payload, returns exit 255. Engine logic + parser already verified sound separately.

| Unit | Description | Priority |
|---|---|---|
| U-HURCO-ROUNDTRIP-TSX-SIDECAR | Sidecar .ts file + `node --import=tsx` invocation to bypass Windows quoting trap | P2 |

### 4F. RL post-processor re-modularization (1 unit — P2)
**Source:** `HANDOFF-claude-374fe00e-india-cam-parity-clo.md` §RESUME — *"U-GAP-POST-RL-POSTPROCESSOR re-modularize PRISM_RL_POST_PROCESSOR from v8.89 monolith"*

| Unit | Description | Priority |
|---|---|---|
| U-GAP-POST-RL-POSTPROCESSOR | Re-modularize `PRISM_RL_POST_PROCESSOR` from the v8.89 monolith | P2 |

### 4G. Echo's already-known post follow-ups (already echo-owned — for completeness)
From `HANDOFF-9029a5d7-echo-overnight-summary-2026-05-26.md`:

| Unit | Description | Priority |
|---|---|---|
| U7 | Chatter SLD gate before emit (1 day) | P1 |
| U8 | Deflection check emit (½ day) | P1 |
| D4 | S(x) chain after emit for shop_floor tier (½ day) | P1 |
| D6 | NC sim + kinematics replay (1 day) | P1 |
| D11 | Master Post end-mission convergence (was gated on Hurco fleet all-green — Hurco is now green, unblocked) | P1 |
| U1 | CAD → MillOperation[] auto-bind (1 day) | P2 |
| U9 | Surface-finish prediction comments (½ day) | P2 |
| D7 | WinMax driver orchestrated from post (½ day) | P2 |
| (regen) | Re-add `WinMAX V11` controller-id comment in `onOpen` header | P2 |
| (regen) | Document/verify `prismOptimizationMode` semantic equivalence vs legacy `prismAggressivenessLevel` | P2 |

## 5. SKIP list (DO NOT pick up)
- **PostProcessorUnificationEngine** — flagged in `HANDOFF-3350c663` as a `Math.random` stub. Owner of fix is whoever rewrites it from real signals; don't wire the stub.

## 6. Net reconciliation summary (post-phantom-filter)

- ❌ ACP-MS5 (3 units) — **PHANTOM**, skip
- ❌ CAM-PARITY-AGI-MS0 remaining (12 units) — **needs verification before build** (likely phantom — envelope says active but `derived:"no_units"`)
- ❌ U-GAP-POST-RL-POSTPROCESSOR — **likely non-actionable** per the AI-TRAINING-FIRST-MS0 finding (engines embed their KB; no `train()` / `learn()` method to wire)
- ✅ **U-MASTERPOST-DIALECT-SYMMETRY** (P0, §4C) — genuine, isolated, ready to build
- ✅ U-HURCO-ROUNDTRIP-TSX-SIDECAR (P2, §4E) — genuine, needs Windows `child_process` workaround
- ✅ JMDIE rollout 3 units (§4D, P2/P3) — genuine but operator-gated (each needs its own /loop per the original handoff)
- ✅ Echo's overnight P1/P2 (§4G, 10 units) — already echo-owned

**Real echo backlog after reconciliation: ~14 units** (1 P0 + 5 P1 + 8 P2). The 16 "phantom" units the original audit surfaced are explicitly NOT scheduled.

## 7. Reviewer-surfaced follow-up (added iter3, 2026-05-26)

After scrutiny on U-MASTERPOST-DIALECT-SYMMETRY (2-reviewer per-file gate, both PASS):

| Unit | Description | Priority | Source |
|---|---|---|---|
| U-MASTERPOST-DIALECT-HEIDENHAIN-COMMENT-FP | Heidenhain `safe_start` regex matches `END PGM` even inside a `;` comment. A program with `END PGM` in a header comment but no real safe-start logic could inflate quality by +20 (safe-start bonus + best-practices retract bonus). Fix: anchor with `^\s*END\s+PGM` (line-start, multiline flag). | P2 | Reviewer A finding on this commit |
| U-MASTERPOST-DL-COMMENT-REGEX-CONSISTENCY | `runDeepLearningAnalysis` still uses `/\([^)]+\)|;.+/g` for comment counting while `quickQualityScore` was updated to `/\(|^;/gm`. Two parallel scoring surfaces have divergent comment-regex semantics. Unify. | P3 | Reviewer B finding on this commit |

## 8. Recommended next build (echo iter2 of this loop)

**U-MASTERPOST-DIALECT-SYMMETRY** (P0, §4C):
- Concrete, isolated to one engine file
- Unblocks the 120/200 → 200/200 corpus PASS surface from echo's overnight close
- Estimated 1 day, all dialect signals already exist in `CONTROLLER_PROFILES` (lines 317-440)
- Required changes:
  - Extend `ControllerProfile` interface with `signals?: { safe_start: RegExp, work_offset: RegExp, comment: RegExp }`
  - Populate signals per dialect (Fanuc/Haas/Okuma/Siemens/Mazak default-Fanuc; Heidenhain → `/M91|M92|END PGM/i` safe-start + `/CYCL DEF 7|TRANS DATUM/i` work-offset + `/^;/m` comment; Mitsubishi → keep Fanuc-like but use `/G0?5\.1 Q1/i` HSM)
  - Replace literal regexes in `runDeepLearningAnalysis`, `quickQualityScore`, `scoreSafety`, `scoreBestPractices`, `scoreAccuracy`, `scoreControllerOptimization` with signal lookups
  - Test cases: 5 fixtures per dialect (synthetic best-effort gcode for each) → assert quality ≥ 85
  - Re-run `scripts/post-processor-validate-corpus.mjs --batch 001 --tier corpus` → confirm Heidenhain + Mitsubishi go 0% → 100%

After U-MASTERPOST-DIALECT-SYMMETRY, the natural follow-up is ACP-MS5 P0-U01 (controller-detection chain) since the dialect signals just built are foundational to it.

## 8. Provenance
- Original india handoffs remain on disk untouched.
- This manifest is the canonical record of the migration; future audits showing india-tagged units in atomic-roadmap should resolve here.
- Echo will tag commits with the original `[<SCOPE>]/<U-ID>` prefix (e.g. `[CAM-PARITY-AGI-MS0]/U-CAMP02`) and add `(migrated from india)` in the body where helpful for git-archaeology.
