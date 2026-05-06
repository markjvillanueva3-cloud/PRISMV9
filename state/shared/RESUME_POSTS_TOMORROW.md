# RESUME — "continue post processor work" (NEXT SESSION'S START)

**Trigger phrase:** `continue post processor work`
**Last updated:** 2026-05-05 ~21:50 UTC by claude-32612444 (prior: ~14:55 by claude-9435742c, ~08:10 by claude-803437e0)
**For:** the next post-processor chat (any session ID)
**Companion:** `RESUME_POSTS.md` (full PPG history) · this file is the focused next-action brief.

---

## 2026-05-05 SESSION (claude-32612444) — U-PPGM18 + U-PPGMU01 + U-PPGMU02 + U-PPGMU03 + U-PPGMU04 + U-PPGMU05 LANDED ON work/ppgh05

### U-PPGMU04 + U-PPGMU05 — 3-way master-post audit & canonical-companion bridges (NEW)

**SHIPPED:**
- `[CAM-EXHAUST-MS0]/U-PPGMU04: HurcoV11 canonical-.cps companion + VM30i correction`
- `[CAM-EXHAUST-MS0]/U-PPGMU05: OkumaOSPMill canonical-.cps companion (M460V-5AX)`

**Driver:** user asked for a 3-way audit of the PRISM-modified .cps posts in `JM DIE/PRISM MODIFIED POST PROCESSORS/` against the corresponding TypeScript master-post engines. Multus was already done (U-PPGMU01-03). This pair handles Hurco V11 + Okuma OSP M460V-5AX.

**Critical fix in U-PPGMU04 (Hurco):** the engine docstring claimed "JM Die's Hurco VMX24" — wrong. JM Die actually runs a **VM30i**. Docstring corrected; the WinMax V11 controller is identical between machines so all U-PPGH01-15 feature work transfers without change.

**Pattern:** both engines stay as full G-code emitters (they consume `MillOperation[]` and emit canned-cycle expansion + BlockAnnotation envelope). The new `HURCO_CANONICAL_*` and `OKUMA_M460V_CANONICAL_*` constants are SUPPLEMENTARY — they document the parallel Mastercam-driven .cps companion so downstream verifiers can detect drift (FORKID swap, revision regression, missing PRISM features).

**Hurco constants (from `HURCO_VM30i_PRISM_v11.cps`):**
- `HURCO_CANONICAL_FORKID = "1B14E478-26FE-4db2-A3E7-FB814E8C0B4E"`
- `HURCO_CANONICAL_DESCRIPTION = "PRISM Enhanced - HURCO VM30i"`
- `HURCO_CANONICAL_REVISION_TAG = "PRISM v10.9 DRILLFIX - Runtime Drilling Multiplier Exclusion (Speed + Feed)"`
- `HURCO_CANONICAL_EXTENSION = "hnc"` (Hurco WinMax native, NOT `min` or `nc`)
- `HURCO_CANONICAL_PROGRAM_NAME_IS_INTEGER = true`
- `HURCO_CANONICAL_MINIMUM_RUNTIME_REVISION = 45793`
- `HURCO_CANONICAL_PRISM_FEATURE_FAMILIES` (20-entry tuple): aggressiveness_8_level, dynamic_depth_feed, chip_thinning, corner_decel, arc_feed_correction, direction_change, stickout_deflection, hsm_hem_physics, finishing_optimization, g053_smoothing, ultimotion, drillfix, sister_tools, tool_break_check, loc_engagement_safety, speed_up_suggestions, min_z_retract, spindle_warmup, safe_start, variable_rpm

**Okuma M460V-5AX constants (from `OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps`):**
- `OKUMA_M460V_CANONICAL_FORKID = "2F9AB8A9-6D4F-4087-81B1-3E14AE260F81"`
- `OKUMA_M460V_CANONICAL_DESCRIPTION = "OKUMA M460V-5AX Ultra Enhanced"`
- `OKUMA_M460V_CANONICAL_CONTROLLER = "OSP-P300MA-H"` (5-axis specialty trim, NOT base P300M)
- `OKUMA_M460V_CANONICAL_EXTENSION = "MIN"` (uppercase — distinct from Multus's lowercase `min`)
- `OKUMA_M460V_CANONICAL_MINIMUM_RUNTIME_REVISION = 45917`
- `OKUMA_M460V_CANONICAL_PRISM_FEATURE_FAMILIES` (27-entry tuple): five_axis_tcp_g169_g170, high_precision_g08_p1, look_ahead_10_to_200, corner_rounding_g62, singularity_avoidance, rotary_feed_limiting, five_axis_smoothing, axis_priority_rapids, c_axis_repositioning, imachining_variable_feed, arc_feed_correction, direction_change, dynamic_depth_feed, stickout_analysis, chip_thinning, minimum_z_retract, super_nurbs_g131, spindle_warmup, safe_start, tool_breakage_detection, auto_door, chip_conveyor, air_blast, coolant_ramp, fixture_offset_oo88, use_clamp_codes, subprogram_files

**Tests** (NEW dedicated test files, 19/19 GREEN + 2 skipped live reads):
- `HurcoV11MillMasterPostEngine.CanonicalCompanion.test.ts` — 5 tests covering path, identity, PRISM features, extension uniqueness (`hnc` not `min`/`nc`), live `.cps` header verification (skipped because `JM DIE/` not checked out)
- `OkumaOSPMillMasterPostEngine.CanonicalCompanion.test.ts` — 6 tests covering path, identity, controller specialty, PRISM features, extension uniqueness (uppercase `MIN`), live `.cps` header verification

**3-way comparison report:** `state/shared/multus-research/POST-AUDIT-3WAY-COMPARISON.md` documents the bidirectional feature gap for each engine — what the .cps has the engine doesn't (full-emit features), what the engine has the .cps doesn't (process-plan-only features). Net: keep both emitters; canonical-companion constants bridge them via cross-reference, not replacement.

**Test state across all 3 master-post engines after U-PPGMU05:**
- HurcoV11 engine 88/88 + canonical-companion 5/5 + 1 skipped = 93/93 + 1 skipped
- OkumaOSP engine 67/67 + canonical-companion 6/6 + 1 skipped = 73/73 + 1 skipped
- Multus engine 21/21 + 1 skipped + dispatcher 16/16 = 37/37 + 1 skipped
- Mitsubishi WEDM 23/23 + sealMasterPostOutput 21/21 = 44/44
- **Total: 247/247 GREEN + 3 skipped live reads, zero regressions**

### U-PPGMU03 — Multi-agent research & accuracy refinement

### U-PPGMU03 — Multi-agent research & accuracy refinement (NEW)

**SHIPPED:** `[CAM-EXHAUST-MS0]/U-PPGMU03: OkumaMultus engine accuracy refinement (multi-agent audit findings)`

**Research methodology:** 10 parallel research agents + Codex CLI (gpt-5.3-codex, web-search-augmented) launched to validate the U-PPGMU01 facade against the canonical .cps post, the OSP-P300SA controller dialect, JM Die's tribal emission patterns, and PRISM's internal documentation. 6/10 Claude agents returned rich content; Gemini Pro 3 failed (free-tier `limit:0` on the API key — billing not enabled); Codex ran ~30 web searches against okuma.com but didn't synthesize within 180s (workable, just incomplete). Findings saved to `state/shared/multus-research/codex-multus-audit.txt`.

**Engine refinements based on findings:**
- 4 new pinned constants exported: `CANONICAL_DESCRIPTION` ("Okuma Multus B250IIW Ultra Enhanced"), `CANONICAL_VENDOR` ("OKUMA"), `CANONICAL_EXTENSION` ("min"), `CANONICAL_PROGRAM_NAME_IS_INTEGER` (false). All four match the actual .cps line 2 / 210 / 224 / 225 declarations.
- `CANONICAL_PROPERTY_GROUPS` (13-entry tuple) + `CANONICAL_PROPERTY_COUNT_BASELINE` (88 properties at v5.2.7) added — operator dashboard / property-surface generation now has a typed group enum sourced from the actual .cps audit.
- `validateCanonical()` extended with 3 new drift checks: description mismatch (catches "swapped to U3000W variant"), extension drift (catches "Mastercam emitting Fanuc .NC"), programNameIsInteger drift (catches Fanuc-style integer-only names). Vendor check now uses the constant instead of inline literal.

**Tests** (`OkumaMultusB250IIMillTurnMasterPostEngine.test.ts`, 21/21 GREEN + 1 skipped — was 15/15 + 1 skipped):
- 4 new pinned-constant assertions (description/vendor/extension/programNameIsInteger)
- 1 new property-groups assertion (13 entries, ordering, key membership)
- 1 new property-count-baseline assertion (88)
- 3 new drift detection tests (description swap, extension swap, programNameIsInteger swap)

Regression sweep: 199/199 GREEN across HurcoV11 + OkumaOSP + Mitsubishi + sealMasterPostOutput. Dispatcher round-trip: 16/16 unchanged.

### What the research told us about emission (queued for U-PPGMU04+)

Agent 2 deep-read the canonical .cps and surfaced 10 emission patterns the next units will need to validate:
- **G140 / G141** for spindle select (main vs sub) — modal via `gSelectSpindleModal`
- **TD=R#** turret position encoding — B0→R1/2, B45→R3/4, B90→R5/6 (main); 7-12 (sub)
- **BA=** for non-standard B-angles + optional `G52` shift for tilted-plane work
- **G20 HP=1** safe retract (v5.2.5 fix) before B-axis change to avoid ALARM-D
- **getPolarFeed scaling** — `scaleFactor = referenceRadius / radius` capped at `polarFeedMaxScale` (default 3.0)
- **G101** for polar interpolation with C-axis active
- **G17/G18/G19** plane select — XY for face mill, ZX for ID/OD turning, YZ for cross drilling
- **M151 / M150** sub-spindle sync on/off + **M249/M250** chuck clamp/unclamp
- **M11 / M10 + G8** C-axis engage / disengage (modal)
- **VOESSION[1]/[3] = 0** at program close to clear Spindle 2 offsets

Agent 4 documented JM Die tribal patterns (8 production programs sampled): `TD=<offset> M323` (NOT `T<n>M06`), G97-before-S-M3 ordering, G97→G96 mid-cycle for finishing, the Mark grab-pull-cutoff sequence (`M41/M151/M249/M84/G1 W-/M248/M84/G1 W+/M150`), `VWKCC[1]` part counter loop pattern.

Agent 8 confirmed v5.2.7 added 67 properties on top of REV A (2024-03-15) — all 11 PRISM intelligence flags are v5.2.7-only; FORKID is unchanged across versions (canonical lineage preserved).

### U-PPGMU02 — Multus dispatcher wiring

### U-PPGMU02 — Multus dispatcher wiring (NEW)

**SHIPPED:** `[CAM-EXHAUST-MS0]/U-PPGMU02: master_post_okuma_multus_b250 dispatcher wiring`

Three layers wired:
1. **Schema** — `ACTION_CAM_SCHEMAS.master_post_okuma_multus_b250` (camActionSchemas.ts) — accepts optional `cps_content` / `cps_path` / `repo_root` (DI-friendly facade params; `min(1)` guards reject empty strings; non-string types rejected by Zod). Inserted before the `master_post_by_machine` entry.
2. **Action enum** — `master_post_okuma_multus_b250` appended to the master_post_* group at camDispatcher.ts line 1149.
3. **Case handler** — lazy-imports `okumaMultusB250IIMillTurnMasterPostEngine` and calls `inspectCanonical({cpsContent, cpsPath, repoRoot})`. Inserted between Mitsubishi and master_post_by_machine cases.

**Tests** (`camDispatcher.MultusMasterPost.test.ts`, 16/16 GREEN):
- 7 schema-layer tests (5 happy-path shapes + 2 Zod rejection guards + 1 schema-vs-enum coherence check)
- 3 action-enum tests (membership, no duplication, all `master_post_*` schemas have enum entries)
- 6 round-trip handler tests (cps_content happy path + drift FORKID + oversize 280 KB padding + cps_path absolute + repo_root resolution + non-existent repo_root surfaces ENOENT)

Mirrors what the dispatcher case does (validate via Zod → call engine.inspectCanonical with same params) without standing up a full MCP server runtime.

**META-FIX prerequisite committed alongside:** `[CAM-EXHAUST-MS0] META-FIX/CAMX-MS22-U01-RECOVERY-PPGH05`. The dispatcher already imported `camxMs22U01ActionSchemas.js` but the file was never tracked on ppgh05 (only its U02 sibling was). Restored verbatim from main worktree (mirrors main's `04aa7da45 META-FIX/CAMX-MS22-U01-AND-U-WIRE12-RECOVERY`).

### U-PPGMU01 — Multus B250II facade scaffold

### U-PPGMU01 — Multus B250II facade scaffold (NEW ENGINE)

**Why this engine is a FACADE not a from-scratch mill-turn engine:** the canonical asset is already the PRISM-Enhanced Mastercam/Fusion CPS post at `JM DIE/PRISM MODIFIED POST PROCESSORS/OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5_2_7.cps` (233 KB, OSP-P300SA controller, FORKID `D93DAA65-1C09-402E-9871-3280B561D994`, 11 `usePRISMxxx` intelligence flags already wired into the .cps's properties block). The .cps does the actual G-code emission — Mastercam/Fusion drives it. PRISM's job is to wrap and validate, not to re-emit. **Never** scaffold a from-scratch mill-turn engine here; the existing post is the source of truth.

**Files:**
- `mcp-server/src/engines/OkumaMultusB250IIMillTurnMasterPostEngine.ts` (NEW, ~310 lines)
- `mcp-server/src/__tests__/OkumaMultusB250IIMillTurnMasterPostEngine.test.ts` (NEW, ~250 lines)

**Surface:**
- 7 pinned constants (`CANONICAL_POST_RELATIVE_PATH`, `CANONICAL_POST_FILENAME`, `CANONICAL_CONTROLLER`, `CANONICAL_FORKID`, `CANONICAL_REVISION_TAG`, `CANONICAL_MINIMUM_RUNTIME_REVISION`, `PRISM_INTELLIGENCE_FLAGS`)
- `parseMetadata(cpsContent)` — pure regex extraction (no eval), returns typed `MultusPostMetadata`
- `validateCanonical(meta)` — drift detection (FORKID swap, revision regression, missing PRISM flags, lost capability)
- `inspectCanonical({cpsContent? | cpsPath? | repoRoot?})` — load + parse + validate, with dependency injection for tests
- `getStats()` — capability census surface

**Tests:** 15/15 pass + 1 skipped (live `.cps` read — skipped here because `JM DIE/` isn't checked out in the ppgh05 worktree; main worktree CI exercises it). Regression sweep on Hurco/OkumaOSP/Mitsubishi/seal: 199/199 GREEN. tsc clean.

**KEY GOTCHA fixed during authoring:** the property-name regex `/^\s{2}(name): \{$/gm` rejected single-line `name: { ... },` PRISM-flag declarations because of the `$` anchor — only the 2 multi-line shop-level properties matched, giving `propertyCount=2`. Drop `$` (the regex docstring above the constant explains why).

### U-PPGM18 — sealMasterPostOutput schema_version assertion fix

**SHIPPED:** `[CAM-EXHAUST-MS0]/U-PPGM18: align stale sealMasterPostOutput schema_version assertion with current 1.2.0 constant`

**WHAT:** `sealMasterPostOutput.test.ts:71` was the lone failure across the seal+sidecar suite — pre-existing 1.1.0 vs 1.2.0 drift documented by claude-803437e0 on 2026-05-05 ~08:00 (caused by PPG-WIRE-MS6/U-PPGM16 bumping the WEDM schema). Fixed by importing the exported `POST_PHYSICS_SIDECAR_SCHEMA_VERSION` constant rather than re-hardcoding "1.2.0", so the next additive bump won't break this assertion the same way.

**STATE:** running `sealMasterPostOutput + sealWEDM + four SidecarIntegration suites + PhysicsSidecarBuilderEngine` = **127/127 GREEN, zero regressions**. tsc clean on touched file under project tsconfig.

**STATE OF Hurco/Okuma engines on this branch:** `HurcoV11MillMasterPostEngine.test.ts` 88/88 · `OkumaOSPMillMasterPostEngine.test.ts` 67/67 · `MitsubishiMV1200RWireEDMMasterPostEngine.test.ts` 23/23. Earlier briefs' "12 fail / 81 total" Hurco snapshot is OBSOLETE — U-PPGH10..U-PPGH15 + U-PPGOH01..U-PPGOH05 all landed since (see git log `work/ppgh05`).

---

## NEXT ACTIONS (priority order, refreshed 2026-05-05 ~18:50)

### Priority 1 — Continue the U-PPGMU0N Multus progression
Facade (U-PPGMU01), dispatcher wiring (U-PPGMU02), audit refinement (U-PPGMU03), Hurco/Okuma canonical companions (U-PPGMU04+05), Kienzle Fc cross-check (U-PPGMU06) shipped. Next units, smallest-first:
- **U-PPGMU07** — Taylor T cross-check: when `usePRISMToolLifeTracking` is on, parse the .cps's emitted tool-life-estimate comments and verify against `CANONICAL_TAYLOR`. Hard-block if drift > 15%. Same shape as U-PPGMU06's `verifyEmittedForceEstimates` but for the Taylor formula.
- **U-PPGMU04** — Taylor T cross-check: when `usePRISMToolLifeTracking` is on, verify the post's emitted tool-life estimate against `CANONICAL_TAYLOR`. Same drift threshold.
- **U-PPGMU05** — BlockAnnotation envelope: parse the .cps output stream, attribute each block to an op, emit `block_annotations[]` so `sealMasterPostOutput` can seal Multus output the same way it seals Hurco/OkumaOSP/Mitsubishi.
- **U-PPGMU06+** — feature parity sweep against the 11 PRISM flags one at a time (warmup, thermal-comp, arc-feed, corner-decel, tool-break, chip-load, stability, cycle-time, surface-finish, force-est, tool-life).

### Priority 2 — `OkumaB250LatheMasterPostEngine.test.ts` does not exist
Only `OkumaB250LatheMasterPostEngine.SidecarIntegration.test.ts` and `integration/MasterPostOkumaB250.integration.test.ts` exist — no full unit-test file. The `stop_on_untested_engine` hook may already flag this. Authoring one would bring the lathe master post to feature parity with Hurco/OkumaOSP coverage.

### Priority 3 — Bring OkumaB250 + Mitsubishi WEDM to Hurco/OkumaOSP feature parity
Hurco/OkumaOSP gained these in U-PPGH10..U-PPGH15 + U-PPGOH01..U-PPGOH05:
- `postSingle` simplified API
- structured `op.tool` shadowing flow
- structured `setup_sheet` payload (machine-flavored)
- Kienzle-bounded feed clamp on sync path
- stickout deflection physics check

OkumaB250 (lathe) and Mitsubishi WEDM most likely lack a subset. Audit each, pick smallest gap, ship one feature per unit (`U-PPGOB01+`, `U-PPGMV01+`).

### Priority 4 — Cherry-pick ppgh05 → cam-exhaust-ms0
`work/ppgh05` is now several units ahead of `work/cam-exhaust-ms0`. When the camDispatcher peer-claim chain in main releases, the ppgh05 lineage should be merged or cherry-picked back. Don't fight for camDispatcher — this is engine + test work only.

### (Stale) Priority — U-PPGM17d camDispatcher verify_tier wiring
Still applicable but blocked: camDispatcher.ts is permanently churned by peer chats on the main worktree. Do NOT take this on without a fresh worktree fork.

---

## 2026-05-05 SESSION (claude-803437e0) — U-PPGH04 LANDED + U-PPGH05 REGRESSION FIX

**REPO HEALTH:** Earlier in this session `H:/prism/.git` had corrupt tree/blob objects (unreadable tree `c91078d8...`, blob `577dffe1...` for CAMAnalyzeEngine.test.ts, unreadable parent commit `fc960eeb...`). `git fetch --refetch origin` (exit 0, ~minutes) repopulated all missing objects; `git status` and commits now work. A stale `.git/index.lock` from 07:37 was also removed manually (user-approved). If a future session sees `unable to read tree` errors again, run `git fetch --refetch origin` first before any other recovery.

**REGRESSION INTRODUCED + FIXED THIS SESSION:** U-PPGH04 (commit `5b0812d10`) was authored against a STALE 1407-line copy of `HurcoV11MillMasterPostEngine.ts` while the canonical version on the branch was 1664 lines (with U-PPGH02 aggressiveness L1-L5 + U-PPGH03 prove-out features). The commit silently dropped 257 lines of feature code. Detected by re-running the unit-test suite — 28 tests still failed because `HURCO_AGGRESSIVENESS_TABLE`, `prove_out`, etc. were absent from the engine. **U-PPGH05** (next commit) restores the engine from `HEAD~3` and re-applies the U-PPGH04 changes (material override + sanity bounds + `(kc1_1=X mc=Y)` suffix) on top. After U-PPGH05: aggressiveness suite GREEN, coolant suite GREEN, sidecar integration GREEN, material override GREEN — net +13 tests vs. broken-U-PPGH04 state.

**U-PPGH04 — code complete, tests green, awaiting repo recovery to commit:**

Files staged (uncommitted):
- `mcp-server/src/engines/HurcoV11MillMasterPostEngine.ts` — added optional `material?: { iso_group?, kc1_1?, mc? }` to `MillOperation` interface; `performPhysicsChecks` now resolves canonical-vs-override Kienzle constants with sanity bounds (`kc1_1 ∈ [100, 5000]`, `mc ∈ [0.10, 0.45]`) and throws on iso_group mismatch; cutting force check string now suffixes `(kc1_1=X mc=Y)` for traceability.
- `mcp-server/src/__tests__/HurcoV11MillMasterPostEngine.test.ts` — added 5 new tests (kc1_1 floor/ceiling, mc range, iso_group mismatch, partial override). Was untracked in git index — `git add` blocked by tree corruption.

Test results (2026-05-05 ~08:00):
- `HurcoV11MillMasterPostEngine.test.ts -t "material constant overrides"` — **7/7 GREEN** (2 originally-failing + 5 new guard tests)
- Full file: 38 pass / 28 fail (was 35/31 before my edit) — **net +3 fixes, zero regressions**
- Sidecar integration suites (`HurcoV11SidecarIntegration`, `PostPhysicsSidecar.integration`, `verifyBlockAnnotations`, `PhysicsSidecarBuilderEngine`, `camDispatcher-PhysicsSidecar`) — **120/121 GREEN**, the 1 fail (`sealMasterPostOutput.test.ts` line 71 expected schema_version `1.1.0` got `1.2.0`) is a **pre-existing stale assertion** from before PPG-WIRE-MS6/U-PPGM16 bumped the WEDM schema; **not caused by U-PPGH04**.
- `tsc --noEmit` clean (exit 0).

Multi-model consensus: 2 specialist reviewers (physics-reviewer + test-review-agent) consulted in parallel; both APPROVE-WITH-CHANGES; their required guards (sanity bounds + iso_group mismatch error) are implemented.

Commit message ready (paste verbatim once repo recovers):
```
[CAM-EXHAUST-MS0]/U-PPGH04: HurcoV11 material override + Kienzle source attribution

- MillOperation gains optional material?:{iso_group?, kc1_1?, mc?} per-op override
- performPhysicsChecks resolves canonical vs override with sanity bounds
  (kc1_1 ∈ [100, 5000], mc ∈ [0.10, 0.45]) — guards against silent disable
  of the Fc<=maxForce safety gate when caller passes underflow value
- Cutting force check string now surfaces (kc1_1=X mc=Y) for traceability
- Throws on iso_group mismatch between op.material_iso and op.material.iso_group
- 5 new test cases (floor/ceiling/range/mismatch/partial override) — 7/7 GREEN
- HurcoV11MillMasterPostEngine.test.ts: 35→38 passing, zero regressions
- 120/121 GREEN across sidecar integration suites; remaining failure is a
  pre-existing schema 1.1.0→1.2.0 drift in sealMasterPostOutput.test.ts
  (separate unit, not U-PPGH04 scope)

Multi-model consensus: physics-reviewer + test-review-agent both APPROVE-WITH-CHANGES
```

**Remaining HurcoV11 sync-path failures still open (28 tests):** `postSingle is not a function`, UltiMotion `G187 P3` default emission, `Op 1 line ... 50000 RPM` warning prefix, `physics_checks` count 4 vs 5 in getStats, structured tool/coating in setup_sheet — all candidates for U-PPGH03..U-PPGH05.

---

---

## DO THIS FIRST (30-second orientation)

```bash
# 1. Confirm work/cam-exhaust-ms0 has the U-PPGM17* trio committed
git -C H:/prism log --oneline | head -10 | grep -E "PPGM17[abc]|PPGM17a"

# 2. Check if peer claim on camDispatcher.ts has released
node H:/prism/.claude/helpers/agent-coordination.mjs read-active-claims | grep camDispatcher

# 3. Verify PPG suite still green
cd H:/prism/mcp-server && node H:/prism/node_modules/vitest/vitest.mjs run \
  src/__tests__/sealWEDMMasterPostOutput.test.ts \
  src/__tests__/postPhysicsSidecarSchema.WEDM.test.ts \
  src/__tests__/PostPhysicsSidecarBlockAnnotations.test.ts \
  src/__tests__/MitsubishiMV1200RWireEDMMasterPostEngine.SidecarIntegration.test.ts \
  src/__tests__/MitsubishiMV1200RWireEDMMasterPostEngine.test.ts \
  src/__tests__/integration/MasterPostMitsubishiMV1200R.integration.test.ts \
  src/__tests__/routes/ppg-master-routes.test.ts \
  src/__tests__/verifyWEDMBlockAnnotations.test.ts
# Expect: 229/229 GREEN.
```

---

## WHAT JUST SHIPPED (2026-05-04 session by claude-04c0e75c)

Three PPG units landed on `work/cam-exhaust-ms0`:

| Commit       | Unit                                              |
|--------------|---------------------------------------------------|
| `018517bb5`  | U-PPGM17a — WEDM seal helper foundation (cherry-picked from `work/wedm-seal` fork; fork retired) |
| `14c4ffb2b`  | U-PPGM17b — `verifyWEDMBlockAnnotations()` tier-aware physics gate (28 tests; PASS_DEFAULTS / E_PACK_TABLE consistency check) |
| `334d9b82c`  | U-PPGM17c — Mitsubishi confidence/safety_margin derivation (3 tests; replaces hardcoded 0.85 / 1.0) |

Test totals: **229/229 GREEN** across 8-file PPG suite. Reviewer agent (subagent_type=reviewer) returned PASS on U-PPGM17b with one cosmetic observation (Object.prototype.toString vs Array.isArray at verifyWEDMBlockAnnotations.ts:238 — non-blocking).

---

## NEXT ACTIONS (priority order)

### Priority 1 — Wire `verify_tier` through camDispatcher.ts (`U-PPGM17d`, was U-PPGM17c in prior brief)

**WHY:** U-PPGM17b ships the `verify_tier` parameter on `sealWEDMMasterPostOutput()` but the dispatcher cases (`master_post_mitsubishi_mv1200r` ~line 5577 and `master_post_by_machine` MITSUBISHI branch ~line 5649) currently DO NOT pass `verify_tier` through. The peer claude-6f69688f had an active edit-claim on `camDispatcher.ts` for U-CAM-HM-MEDMAT-WIRE-01 which blocked the wiring.

**Plan:**
```bash
# 1. Confirm peer claim has released (5min timeout)
node H:/prism/.claude/helpers/agent-coordination.mjs read-active-claims | grep camDispatcher

# 2. If clear: edit camDispatcher.ts to pass verify_tier:
#    - master_post_mitsubishi_mv1200r case (look for `sealWEDM(wedmEngineOutput, {`)
#      Add `verify_tier: p.verify_tier` to the opts object
#    - master_post_by_machine MITSUBISHI branch (look for `sealWEDMRouter(`)
#      Add `verify_tier: (params as any).verify_tier`
#
# 3. Tests in camDispatcher routes test will need to assert the verify
#    field appears on the response when verify_tier is provided. Add
#    ≥2 tests covering pass + hard_block via dispatcher round-trip.
#
# If peer claim still active: fork to H:/prism-ppg-dispatcher-wire on
# work/ppg-dispatcher-wire, do the same edit there, cherry-pick back.
```

### Priority 2 — Tackle pre-existing HurcoV11MillMasterPostEngine sync bugs (`PPG-HARDEN`)

**WHY:** During U-PPGW-AdvancedPost-Wiring (prior session) detected 30/66 pre-existing failures in `HurcoV11MillMasterPostEngine.test.ts`. Symptoms: work-offset, spindle, tool-name emission in the SYNC `generateProgram` path. Async `generateProgramAsync` path is fine.

**Strategy:** triage into ≤5 named sub-failures, fix each with a unit (`U-PPGH01` … `U-PPGH05`), commit independently.

### Priority 3 — Investigate other master post engines for parallel verifier coverage

**WHY:** Now that `verifyWEDMBlockAnnotations()` exists, the same pattern (per-tier physics consistency gate) could apply to:
- Okuma OSP-P*M mill (currently only routes through `sealMasterPostOutput` milling/turning verifier)
- Okuma B250 lathe (same)
- Hurco V11 (same)

Likely lower-priority since the milling/turning verifier already covers their S/F shape — but worth a 30-min sweep to confirm there's no tribal-knowledge-driven emit deviation that the generic verifier misses.

---

## ENVIRONMENT REMINDERS

### vitest path (lives in repo root, not mcp-server)
```bash
cd H:/prism/mcp-server && node H:/prism/node_modules/vitest/vitest.mjs run <file>
```

### tsc path
```bash
cd H:/prism/mcp-server && node H:/prism/node_modules/typescript/bin/tsc --noEmit
```

### Cross-machine git warnings
The H: drive was last used on DESKTOP-N7MI1VB; on MarkV every git command emits:
> warning: safe.directory '%(prefix)\H;C:\Program Files\Git\prism-mill-master' not absolute

This is harmless (a stray `safe.directory` entry from an old config). Don't try to "fix" by editing global gitconfig — pipes still work, status/diff/commit all function.

### Peer-claimed files (refresh on resume)
Sample peer claims observed during 2026-05-04 session:
- `claude-6f69688f` editing `camDispatcher.ts` (U-CAM-HM-MEDMAT-WIRE-01)
- `claude-b93f4e4d` editing `HyperMillJobMonitor.ts` and HyperMill test files
- `claude-9897c938` working on `H:/prism-cad-sw-fidx` worktree (CrossProcessAIBridge / aiReasoningDispatcher)

Re-check `prism_context:read_active_claims` on resume — claims expire after ~5min idle.

---

## KEY FILES (where to look)

| File | Purpose |
|------|---------|
| `mcp-server/src/cps/verifyWEDMBlockAnnotations.ts` | NEW — tier-aware WEDM physics gate |
| `mcp-server/src/cps/verifyBlockAnnotations.ts` | Milling/turning S/F gate (parallel pattern) |
| `mcp-server/src/cps/sealMasterPostOutput.ts` | Both `sealMasterPostOutput()` and `sealWEDMMasterPostOutput()` (now with verify_tier wired for both) |
| `mcp-server/src/engines/MitsubishiMV1200RWireEDMMasterPostEngine.ts` | Now exports PASS_DEFAULTS, E_PACK_TABLE, CONFIDENCE_BY_BASIS, DEFAULT_SAFETY_MARGIN |
| `mcp-server/src/schemas/postPhysicsSidecarSchema.ts` | Schema 1.2.0 — `block_annotations[]` (milling/turning) + `wedm_block_annotations[]` (WEDM) |
| `mcp-server/src/tools/dispatchers/camDispatcher.ts` | master_post_* cases (~5400-5700) — verify_tier wiring DEFERRED to U-PPGM17d |

---

## SUCCESS CRITERIA FOR NEXT SESSION

You're done with one chat-session-worth of post-processor work when:
1. U-PPGM17d (camDispatcher verify_tier wiring) committed with reviewer PASS, OR
2. AT LEAST ONE U-PPGH0* HurcoV11 sync fix committed.
3. RESUME_POSTS_TOMORROW.md refreshed.
4. `/handoff` written for the chat.

That's enough for one session.
