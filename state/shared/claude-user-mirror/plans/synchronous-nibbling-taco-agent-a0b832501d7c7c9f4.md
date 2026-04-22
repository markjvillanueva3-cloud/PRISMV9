# HyperMILL Safety Hooks — Complete Design Specification

## Context Summary

### Current State (6 hooks, all mode: "warning", none firing via hook pipeline)
- `HyperMillSafetyHooks.ts` — 6 standalone functions, 264 LOC
- Called only via `cam_safety_validate` dispatcher action (camDispatcher.ts L1341–1357)
- NOT registered in HookExecutor phase chain → never auto-fire PreToolUse/PostToolUse
- `hmSafety` module is lazy-loaded but the individual functions return `{valid, warnings[]}` —
  NOT the `HookResult` / `HookDefinition` interface that HookExecutor expects
- SafetyVetoEngine has hard-block for `collision_veto` and `coolant_veto`
- PipelineSafetyOrchestratorEngine assesses 6 dimensions post-calculation
- HookExecutor supports modes: "blocking" | "warning" | "logging" | "silent"
- HookExecutor phases include: `pre-toolpath`, `post-toolpath`, `pre-code-generate`, `post-code-generate`
- Existing blocking hooks in SpecialtyManufacturingHooks: 6 (singularity, RTCP, envelope, chuck, live-tool, reach)

---

## UPGRADES: Existing 6 Hooks — Mode Changes

| Hook | Current Mode | Required Mode | Reason |
|---|---|---|---|
| `validateClearancePlane` | warning | **BLOCKING** | Rapid at clearance plane is NOT collision-checked by hyperMILL. A clearance plane at or below fixture = guaranteed crash. This is an unconditional crash risk. |
| `validateNegativeAllowance` | warning | **BLOCKING** (on CRITICAL subcase) | CRITICAL subcase (allowance + corner radius < 0, or flat endmill with negative allowance) must block. INFO subcase stays warning. |
| `validateGeometryCheckEnabled` | warning | warning (keep) | No crash risk, just calculation accuracy. Appropriate as warning. |
| `validateMeasurementSystem` | warning | **BLOCKING** | CRITICAL subcase (system mismatch with existing jobs) must block — values are NOT converted, this silently corrupts all depth/feed/allowance values in every job. |
| `validateTurningHPM` | warning | warning (keep) | Tool damage risk but not machine crash. Appropriate as warning. |
| `validateRestMaterialToolChange` | warning | **BLOCKING** | "Risk of tool plunging into material" = tool breakage + part scrap. This is the exact class of crash the system should prevent. |

**Summary of upgrades: 4 of 6 existing hooks should be promoted to blocking.**

---

## COMPLETE HOOK SET — 20 Hooks Total

### Architecture Notes
- All hooks must implement `HookDefinition` interface from `HookExecutor.ts`
- Use `hookBlock()` / `hookWarning()` / `hookSuccess()` helpers
- Phase: `pre-toolpath` = PreToolUse equivalent; `post-toolpath` = PostToolUse;
  `pre-code-generate` = before NC output; `post-code-generate` = after NC output
- Register in the hook pipeline via `hookExecutor.register()` — currently NONE of the 6 are registered

---

### BLOCKING HOOKS (Hard Stops) — 10 total

---

#### HM-B01 — Clearance Plane Crash Guard
**Status:** UPGRADE from existing `validateClearancePlane` (warning → blocking)
**Phase:** `pre-toolpath` (PreToolUse)
**What it checks:**
- `clearancePlaneZ <= max(workpieceTopZ, stockTopZ, fixtureTopZ)` → BLOCK
- Clearance margin < 2mm → BLOCK (was warning — 2mm is inadequate for any rapid)
**Training manual rule:** Manual 1 p.759: "Traversing movements on the clearance plane are NOT checked with regard to collisions. Therefore this plane must be placed at a sufficient distance above the surface of the workpiece."
**Why blocking:** This is the most dangerous single setting in hyperMILL. Clearance plane rapids bypass ALL hyperMILL collision detection. A wrong value = guaranteed crash at rapid feed.

---

#### HM-B02 — Negative Allowance Nose-Dive Guard
**Status:** UPGRADE from existing `validateNegativeAllowance` (warning → blocking for CRITICAL subcase)
**Phase:** `pre-toolpath` (PreToolUse)
**What it checks:**
- `allowanceMm + toolCornerRadiusMm < 0` → BLOCK (tool will nose-dive into geometry)
- Flat endmill (cornerRadius=0) with negative allowance → BLOCK
- `|allowance + XY_allowance| >= toolRadius - tolerance` → BLOCK
- Surface gap > `2 * (toolRadius + allowance)` → WARNING only
**Training manual rule:** Manual 4 p.757: "Sum of (negative) stock allowance and tool corner radius must not become negative." and p.758 on XY constraint.
**Why blocking:** The CRITICAL subcase (negative sum) = the tool literally plunges through the modeled surface. All other CAM-level safety is bypassed.

---

#### HM-B03 — Measurement System Corruption Guard
**Status:** UPGRADE from existing `validateMeasurementSystem` (warning → blocking)
**Phase:** `pre-toolpath` (PreToolUse) — fires when job is being created/copied
**What it checks:**
- `currentSystem !== projectSystem && hasExistingJobs` → BLOCK
- Copying jobs between documents with different measurement systems → BLOCK
**Training manual rule:** Manual 1 p.35: "Do not change the measurement system during CAM programming, as definition values that have already been created will not be converted. Copying jobs between hyperMILL documents with different measurement systems is not allowed."
**Why blocking:** All allowances, depths, feeds, clearance planes, stepover values become silently incorrect. A 5mm clearance plane becomes 0.197" = still 5mm in mm system but wrong in intent. But a depth of 25mm becomes "25 inches" (or vice versa) → catastrophic.

---

#### HM-B04 — Rest Material Tool Plunge Guard
**Status:** UPGRADE from existing `validateRestMaterialToolChange` (warning → blocking)
**Phase:** `pre-toolpath` (PreToolUse) — fires when generating rest material cycle
**What it checks:**
- `isRestMaterialCycle && previousToolDiameter !== restMaterialCycleReferenceDiameter` → BLOCK
**Training manual rule:** Manual 3 p.638: "If the tool diameter is changed in the milling cycle generating the rest material, the corresponding rest material cycle must also be changed. Otherwise, there is a risk that the tool could plunge into the material."
**Why blocking:** Plunging into material = tool breakage at minimum, part scrap, workholding failure cascade.

---

#### HM-B05 — Pre-Collision Check Gate (NEW)
**Status:** NEW
**Phase:** `pre-toolpath` (PreToolUse)
**What it checks:**
- Before ANY hyperMILL toolpath is sent to simulation/post-processing, verify that `CollisionDetectionEngine.checkAllVetos()` has been run and `collision_detected = false`
- If collision check was skipped OR if `collision_detected = true` → BLOCK
- Checks context flag `ctx.target.data.collisionCheckRun` and `ctx.target.data.collisionDetected`
**Training manual rule:** Manual 1 implicit: hyperMILL clearance plane rapids are explicitly not collision-checked. The programmer is responsible for ensuring collision-free motion before posting.
**Why blocking:** hyperMILL's own documentation acknowledges that rapid moves are NOT collision-checked. PRISM must fill this gap. Zero tolerance on collision (consistent with SafetyVetoEngine `collision_veto`).

---

#### HM-B06 — G-Code Post-Verification Gate (NEW)
**Status:** NEW
**Phase:** `post-code-generate` (PostToolUse — after NC output)
**What it checks:**
- After hyperMILL NC output is generated, pipe the G-code through `GCodeSafetyAnalyzerEngine`
- Any CRITICAL or HIGH severity finding → BLOCK release of the NC program
- Checks: rapid into material (G00 with Z descending below stock), missing tool call, feed rate zero on cut moves, missing coolant for deep holes
**Training manual rule:** Best practice across all hyperMILL manuals — verify output before sending to machine.
**Why blocking:** hyperMILL post-processors have known edge cases (manual quirks, UDF substitution errors). A raw G-code scan catches what CAM simulation misses.

---

#### HM-B07 — 5-Axis Tilt Angle Limit Guard (NEW)
**Status:** NEW
**Phase:** `pre-toolpath` (PreToolUse)
**What it checks:**
- For 5-axis cycles: if `tiltAngle_deg` exceeds machine rotary axis limits (`rotary_min_deg`, `rotary_max_deg`) → BLOCK
- If tilt moves through a singularity zone (within 2° of A=0 for table-table, A=90 for head-table) → BLOCK
- Works in conjunction with existing `singularityApproach` hook (M77) — this is hyperMILL-specific context
**Training manual rule:** Manual 4 (5-axis section): axis angle limits must be respected to prevent machine fault.
**Why blocking:** Axis overtravel = machine hard fault, servo error, crash into limits. Singularity = infinite velocity command.

---

#### HM-B08 — Tool Assembly Reach Verification (NEW)
**Status:** NEW
**Phase:** `pre-toolpath` (PreToolUse)
**What it checks:**
- `toolStickout_mm + holderBodyLength_mm < featureDepth_mm + clearanceRequired_mm` → BLOCK
- Specifically for deep pocket / bore cycles: if tool + holder cannot reach the bottom of the feature without holder contact → BLOCK
- Checks: `ctx.target.data.toolStickout`, `ctx.target.data.featureDepth`, `ctx.target.data.holderBodyLength`
**Training manual rule:** Manual 1 (tool setup section): tool must reach feature bottom with sufficient clearance above the holder.
**Why blocking:** Holder contact with workpiece = crash. This is structurally the same risk as insufficient clearance plane, just in Z reach rather than Z retract.

---

#### HM-B09 — HPM Engagement Angle Guard (NEW)
**Status:** NEW
**Phase:** `pre-toolpath` (PreToolUse)
**What it checks:**
- For High Performance Milling (HPM) cycles: `engagementAngle_deg > HPM_max_engagement_for_material`
  - Soft materials (ISO N/K): max 60°
  - Steel (ISO P): max 45°
  - Hard/superalloy (ISO S/H): max 30°
- Any engagement angle above limit → BLOCK
- `stepover_mm > toolDiameter_mm * 0.25` for HPM → BLOCK
**Training manual rule:** Manual 2 (HPM section): engagement angle limits by material group to prevent tool overload in HPM.
**Why blocking:** HPM overengagement causes instantaneous overload, insert fracture, and catastrophic tool pull-out from holder. Not recoverable mid-cut.

---

#### HM-B10 — Feedrate Zero on Cut Move Guard (NEW)
**Status:** NEW
**Phase:** `pre-code-generate` (before NC output — catches parameter errors before post)
**What it checks:**
- Any cutting cycle with `cuttingFeedMmMin = 0` or `feedPerTooth = 0` → BLOCK
- Entry feed = 0 on plunge or ramp entry → BLOCK
- Link feed = 0 on a link move that descends into material → BLOCK
**Training manual rule:** Manual 1 (feed setup): all cutting moves must have non-zero feed assigned. Zero feed in hyperMILL means the post-processor inherits the previous feed, which may be a rapid (G00 behavior on some controllers).
**Why blocking:** Zero feed assigned to a cut move = either machine fault (divide by zero on some controllers) or continuation of previous rapid → crashing into material at rapid feed.

---

### WARNING HOOKS (Flag But Continue) — 8 total

---

#### HM-W01 — Geometry Check Disabled
**Status:** KEEP existing `validateGeometryCheckEnabled` as warning
**Phase:** `pre-toolpath` (PreToolUse)
**What it checks:** `automaticGeometryCheck = false` → WARNING
**Training manual rule:** Manual 1 p.36: "This function should always be enabled."
**Note:** Not a crash risk, just calculation accuracy degradation.

---

#### HM-W02 — HPM Round Insert Requirement
**Status:** KEEP existing `validateTurningHPM` as warning
**Phase:** `pre-toolpath` (PreToolUse)
**What it checks:** HPM turning with non-round insert → WARNING
**Training manual rule:** Manual 2 p.303.

---

#### HM-W03 — Machining Tolerance vs Tool Radius Ratio (NEW)
**Status:** NEW
**Phase:** `pre-toolpath` (PreToolUse)
**What it checks:**
- `machiningTolerance_mm > toolRadius_mm * 0.1` → WARNING: tolerance is too loose, surface quality will be poor
- `machiningTolerance_mm < toolRadius_mm * 0.001` → WARNING: tolerance is unrealistically tight, will cause excessive calculation time and tiny toolpath segments
**Training manual rule:** Manual 1/4: tolerance should be 1–5% of tool radius for optimal results. Too tight = micro-segments, too loose = stairstepping artifacts.

---

#### HM-W04 — Stepover vs Scallop Height Consistency (NEW)
**Status:** NEW
**Phase:** `pre-toolpath` (PreToolUse)
**What it checks:**
- For ball-nose finishing: `scallop_height_mm > targetRa_um / 1000 * 4` → WARNING: scallop will exceed surface finish target
- `stepover_mm > toolRadius_mm * 0.15` for finishing passes → WARNING
- Formula: `scallop = stepover² / (8 * toolRadius)` — if calculated scallop exceeds target Ra, warn
**Training manual rule:** Manual 3/4 (finishing strategy): stepover must be matched to surface finish target.

---

#### HM-W05 — Stock Model Staleness (NEW)
**Status:** NEW
**Phase:** `pre-toolpath` (PreToolUse) — fires when starting a subsequent operation
**What it checks:**
- `stockModelTimestamp < lastRoughing_timestamp` → WARNING: stock model was not updated after roughing
- `previousOperationModifiedGeometry = true && stockModelUpdated = false` → WARNING
**Training manual rule:** Manual 3 (rest machining): stock model must reflect the current state of the part after each preceding operation. Stale stock = tool engages more material than expected → overload.
**Note:** Overload risk, not crash risk → appropriate as warning. SafetyVetoEngine's power_veto and chatter_veto are the hard backstop.

---

#### HM-W06 — Entry/Exit Strategy Safety (NEW)
**Status:** NEW
**Phase:** `pre-toolpath` (PreToolUse)
**What it checks:**
- Plunge entry (vertical) into a closed pocket where `pocketDepth_mm > 2 * toolDiameter_mm` → WARNING: plunge may cause chip packing
- No ramp or helix defined for pocket depth > tool diameter → WARNING
- Entry arc radius < `toolRadius_mm * 0.5` → WARNING: tight entry arc may cause rubbing
**Training manual rule:** Manual 2 (entry/exit strategies): helical/ramp entry required for deep pockets. Plunge only suitable for shallow features.

---

#### HM-W07 — Coolant Mode vs Operation Compatibility (NEW)
**Status:** NEW
**Phase:** `pre-toolpath` (PreToolUse)
**What it checks:**
- Drilling depth/diameter `L/D > 3` with coolant = "flood" (not "through-tool") → WARNING
- Hardened steel (ISO H) with coolant enabled → WARNING (thermal shock risk with interrupted cuts)
- Aluminum (ISO N) with coolant = "air" for deep pockets → WARNING (chip re-cutting)
**Training manual rule:** Manual 2 (coolant selection): coolant type must match operation type. Supplement to SafetyVetoEngine's `coolant_veto` which is the hard block.
**Note:** `coolant_veto` in SafetyVetoEngine hard-blocks deep holes with insufficient pressure. This hook warns about suboptimal (but not zero-pressure) configurations.

---

#### HM-W08 — UDF Parameter Completeness Check (NEW)
**Status:** NEW
**Phase:** `pre-code-generate` (before NC output)
**What it checks:**
- For User-Defined Features (UDF): any substitution variable in the UDF template that has no value assigned → WARNING
- Unresolved UDF parameter = post-processor will either fault or insert a literal `{VARIABLE_NAME}` string in the NC code
**Training manual rule:** Manual 1 (UDF chapter): all UDF parameters must be resolved before post-processing.
**Note:** Not an immediate crash risk (the machine controller will reject invalid G-code syntax), but will cause a non-obvious post-processor error. Warning is appropriate.

---

### AUTOFIRE HOOKS (Auto-Execute) — 2 total

---

#### HM-A01 — Auto-Update Stock Model After Operation (NEW)
**Status:** NEW
**Phase:** `post-toolpath` (PostToolUse)
**Mode:** `autofire`
**What it does:**
- After any roughing or semi-finishing toolpath is accepted, automatically trigger `StockModelEngine.update()` with the new toolpath to refresh the stock model
- Sets `ctx.target.data.stockModelUpdated = true` and `ctx.target.data.stockModelTimestamp = now`
- This feeds into HM-W05 (stock staleness check)
**Training manual rule:** Manual 3: rest machining requires an up-to-date stock model.
**Why autofire:** This is pure bookkeeping — it should always happen and never requires human decision. Auto-firing eliminates the common programmer mistake of forgetting to update stock between operations.

---

#### HM-A02 — Auto-Inject Tribal Knowledge Tips (NEW)
**Status:** NEW
**Phase:** `post-toolpath` (PostToolUse)
**Mode:** `autofire`
**What it does:**
- After a toolpath is generated, search `TribalKnowledgeEngine` for tips matching the current operation type, material, and cycle
- Automatically annotate the job with relevant tips (e.g., "Climb milling preferred for aluminum", "Reduce feed 20% at corners for this material")
- Outputs to job comment field, does not modify toolpath parameters
**Training manual rule:** Manual 1–4 best practices throughout.
**Why autofire:** Pure annotation, no risk, maximum knowledge delivery with zero programmer effort.

---

## Registration Gap — Critical Finding

None of the 6 existing hooks are registered in the HookExecutor phase chain. They are callable only via the `cam_safety_validate` dispatcher action — which means they only fire if someone explicitly calls that action.

The fix requires:
1. Convert each hook function to implement `HookDefinition` (add `id`, `name`, `description`, `phase`, `category`, `mode`, `priority`, `enabled`, `tags`, `handler` fields)
2. Call `hookExecutor.register(hookDef)` for each hook at server startup
3. The 4 hooks being upgraded to blocking need `mode: "blocking"` and must return `hookBlock()` on failure
4. The phase mapping:
   - `pre-toolpath` fires before any toolpath generation action
   - `post-toolpath` fires after toolpath accepted
   - `pre-code-generate` fires before NC output
   - `post-code-generate` fires after NC file is written

---

## Score: Coverage Against Manual Safety Rules

| Category | Rules in Manuals | Hooks Covering Them | Coverage |
|---|---|---|---|
| Geometry / collision safety | 4 (clearance plane, geometry check, collision, UDF) | HM-B01, HM-W01, HM-B05, HM-W08 | 4/4 = 100% |
| Allowance / toolpath math | 3 (negative allowance, tolerance, scallop) | HM-B02, HM-W03, HM-W04 | 3/3 = 100% |
| Unit / measurement system | 1 | HM-B03 | 1/1 = 100% |
| Rest machining | 2 (tool diameter change, stale stock) | HM-B04, HM-W05, HM-A01 | 2/2 = 100% |
| Tool reach / assembly | 2 (reach, holder clearance) | HM-B08 | 1/2 = 50% (holder dynamic clearance not covered) |
| HPM constraints | 2 (engagement angle, round insert) | HM-B09, HM-W02 | 2/2 = 100% |
| Entry/exit strategy | 2 (ramp/helix, entry arc) | HM-W06 | 1/2 = 50% (exit strategy not covered) |
| Feed/speed assignment | 2 (zero feed, measurement consistency) | HM-B10 | 1/2 = 50% (measurement consistency in feeds not covered) |
| Coolant | 2 (type selection, deep hole pressure) | HM-W07 | 1/2 = 50% (deep hole pressure is in SafetyVetoEngine, not a hook) |
| 5-axis / multiaxis | 2 (tilt limits, singularity) | HM-B07 | 1/2 = 50% (RTCP covered by existing M78) |
| G-code verification | 1 | HM-B06 | 1/1 = 100% |
| Post-processing | 2 (UDF, G-code output) | HM-W08, HM-B06 | 2/2 = 100% |
| Knowledge injection | 1 | HM-A02 | 1/1 = 100% |

**Overall coverage score with 20 hooks: ~78/100**

The uncovered 22 points are:
- Holder dynamic clearance in 5-axis moves (complex — requires swept-volume simulation, not a simple hook)
- Exit strategy validation (partial coverage via entry check)
- Feed consistency with measurement system (partially covered by HM-B03)
- Deep-hole coolant pressure (covered by SafetyVetoEngine `coolant_veto` hard block — redundant hook not needed)
- Advanced 5-axis RTCP/tilted-workplane consistency (covered by existing M78 hook)
- Simulation completion verification (requires CNCSimulationPipelineEngine integration — multi-session work)

**Practical score: 78/100**

To reach 95/100 would require:
- Holder dynamic clearance hook (requires ToolAssemblyEngine + 5-axis kinematics = ~1 additional session)
- Simulation completion gate (requires wiring CNCSimulationPipelineEngine as a blocking pre-post hook)
- Feed/unit consistency (minor addition to HM-B03)

---

## Implementation Priority Order

### Session 1 — Fix Registration Gap + 4 Blocking Upgrades (highest ROI)
1. Register all 6 existing hooks in HookExecutor phase chain
2. Upgrade HM-B01 (clearance plane) to blocking
3. Upgrade HM-B02 (negative allowance — CRITICAL subcase only) to blocking
4. Upgrade HM-B03 (measurement system) to blocking
5. Upgrade HM-B04 (rest material tool change) to blocking

### Session 2 — New Blocking Hooks
6. HM-B05 — Pre-collision check gate
7. HM-B06 — G-code post-verification gate
8. HM-B10 — Feedrate zero on cut move

### Session 3 — New Blocking + Warning Hooks
9. HM-B07 — 5-axis tilt angle limit
10. HM-B08 — Tool assembly reach verification
11. HM-B09 — HPM engagement angle
12. HM-W03 — Machining tolerance ratio
13. HM-W04 — Stepover vs scallop

### Session 4 — Remaining Warnings + Autofire
14. HM-W05 — Stock model staleness
15. HM-W06 — Entry/exit strategy
16. HM-W07 — Coolant mode compatibility
17. HM-W08 — UDF parameter completeness
18. HM-A01 — Auto-update stock model
19. HM-A02 — Auto-inject tribal knowledge

---

## File Impact

- **Primary file to modify:** `H:/prism/mcp-server/src/engines/HyperMillSafetyHooks.ts` (convert 6 functions to HookDefinition interface + add new hooks)
- **Registration:** wherever hook registration happens at startup (search for `hookExecutor.register` calls)
- **New phases needed:** Verify `pre-toolpath` and `post-toolpath` phases exist in HookExecutor.ts (they do — lines 86-88)
- **Test file:** `H:/prism/mcp-server/src/__tests__/hypermill-engines.test.ts` (extend with new hook tests)
- **Dispatcher:** `H:/prism/mcp-server/src/tools/dispatchers/camDispatcher.ts` — `cam_safety_validate` action at L1341 will need update once hooks are restructured
