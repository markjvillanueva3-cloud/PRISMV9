# FUSION360-FULL-CAPABILITIES-ROADMAP — 5-Role Specialist Review

## ROLE 6: PHYSICS RIGOR REVIEWER — Score: 78/100

### CRITICAL Findings

1. **Kienzle formula notation inconsistency (line 470):** The roadmap writes `Fc = kc1.1 * h^(1-mc) * b` which matches the canonical form in constants.ts (`kienzleForce` at line 213-233). However, the canonical code actually computes `kc = kc1_1 * h^(-mc)` then `Fc = kc * ap * h` which expands to `Fc = kc1_1 * h^(1-mc) * b`. The roadmap formula is correct BUT uses mixed notation: `kc1.1` (dot notation) instead of `kc1_1` (underscore). While this is a roadmap document (not code), it creates ambiguity about whether the implementer should use the literal string "kc1.1" or import `kc1_1` from constants.ts. **Must clarify: "import from CANONICAL_KIENZLE, never inline."**

2. **No Taylor formula stated explicitly anywhere in the roadmap.** The roadmap references "Taylor hours remaining" (line 358), "Taylor at per-block conditions" (line 557), and formula ID "F-TAYLOR-001" (line 452), but never states the canonical form `T = (C / Vc)^(1/n)`. For a physics-critical document, the actual equation should appear at least once, especially in MS6 where per-block tool life is computed. The canonical form IS in constants.ts (line 236-258), but the roadmap should reference it explicitly.

3. **Deflection formula never stated.** The roadmap mentions "deflection < tolerance/3" (line 561) and "beam model per block" (line 555) but never states `delta = F * L^3 / (3 * E * I)`. The canonical form exists in constants.ts (line 262-278). The tolerance/3 safety factor is mentioned but the deflection formula itself is absent.

### HIGH Findings

4. **Safety factor for force is specified (0.8) but safety factor for deflection uses "tolerance/3" (line 561).** The constants.ts file does NOT codify these safety factors -- they are ad-hoc in the roadmap. Should specify WHERE these safety factors are defined and whether they belong in constants.ts as canonical values.

5. **Chatter SLD reference is correct but incomplete.** The roadmap correctly references SLD stability lobe diagrams (lines 360, 491-494) and the ChatterStabilityLobeEngine (707 LOC). However, no chatter formula is stated. The regenerative chatter model (`a_lim = -1 / (2 * Ks * Re[G])`) is not mentioned. The roadmap only says "check against SLD" and "shift to nearest stable valley" without specifying the underlying physics.

6. **ISO group coverage gap:** The test matrix (line 656) specifies "5 ISO groups" but there are 6 canonical ISO groups (P, M, K, N, S, H). The free-tier validation (line 135) correctly mentions "6 ISO groups." This inconsistency means the test matrix may miss hardened steel (H) or another group entirely.

### MEDIUM Findings

7. **No mention of edge preparation correction factor** which exists in constants.ts `kienzleForce()` (line 223). The per-block physics (U-FBLK02) should account for this since tool edge condition affects force by 5-25%.

8. **Thermal compensation rules (line 502-504) use hardcoded percentages** (30% reduction for thin walls, 15% for deep pockets, 50% for corners) rather than physics-derived values. These should reference CuttingTemperatureEngine or ThermalWearCouplingEngine outputs.

9. **Surface finish formula (Brammertz Ra = fz^2 / (32 * r_e) * 1000) from constants.ts (line 291) is not referenced.** The roadmap mentions "predicted Ra" but doesn't cite the formula or confirm it will be used from the canonical source.

---

## ROLE 7: FEATURE CASCADE REVIEWER — Score: 72/100

### CRITICAL Findings

1. **SESSION_ARTIFACTS.json mentioned only in the header (line 18) under enforcement hooks, but never defined per-session.** Each session should explicitly state what artifacts it produces that downstream sessions consume. For example, S1 (License) produces the tier system that S2-S5 depend on, but there is no SESSION_ARTIFACTS.json block specifying: `{tier_enum: "free|pro|ultimate", feature_map: {...}, jwt_validator: "LicenseTierGateEngine.canAccess"}`.

2. **No Feature Cascade block exists in ANY milestone.** The header says "POST-COMPACT: Feature Cascade (SESSION_ARTIFACTS.json)" but no milestone contains a "Feature Cascade" section documenting what new capabilities are unlocked. This is a structural omission across all 8 milestones.

### HIGH Findings

3. **FORGE-TRIPLE outputs are well-documented** (8 hooks, 8 actions, 8 skills) across all milestones. This is a strength. However, there is no cross-reference showing which downstream milestones CONSUME these hooks/actions/skills.

4. **Self-update mechanism absent.** There is no mention of how downstream milestones auto-update when upstream capabilities change. For example, if MS1's tier system adds a new feature flag, how do MS3-MS7 discover it? No cascading update protocol is defined.

5. **New hooks are documented per milestone but no hook registry update step.** The roadmap creates 8 new hooks but never mentions updating the hook registry or `hooks/index.ts`. This means hooks may exist in code but not be discoverable.

### MEDIUM Findings

6. **Skills documented per milestone but no skill file creation step.** Each FORGE-TRIPLE lists a new skill (e.g., `/fusion-license`) but doesn't specify creating the corresponding `.claude/commands/fusion-license.md` file.

7. **Actions listed but dispatcher wiring not specified.** Each FORGE-TRIPLE lists a new action (e.g., `prism_cam:license_validate`) but doesn't specify which dispatcher file to add it to or the Zod schema required.

---

## ROLE 8: DEPENDENCY GRAPH REVIEWER — Score: 88/100

### CRITICAL Findings

None -- the DAG is acyclic and well-structured.

### HIGH Findings

1. **MS8 dependency specification is imprecise.** Line 644 says "Dependencies: F360-FULL-MS1 through MS7" but the ASCII graph (line 717-724) only shows MS8 receiving arrows from the main chain. This is correct (MS8 tests everything) but the graph visually only shows one arrow, not 7 incoming edges. The graph should show all 7 dependencies explicitly.

2. **MS2 (Free Panel) has no downstream dependents.** It depends on MS1 but nothing depends on MS2. This means MS2 could be deferred or done in parallel with MS3-MS4 without blocking anything. This is actually fine architecturally but worth noting -- the free tier panel is isolated from the pro/ultimate feature chain.

3. **U-FSIL04 (User Preference Detection, line 390) depends on U-FCAM06** which is in MS3, but U-FSIL04 is in MS5. The MS5 dependency on MS3 is declared (line 330: "Dependencies: F360-FULL-MS3, F360-FULL-MS4"), so this cross-milestone unit dependency IS satisfied. Correct.

### MEDIUM Findings

4. **Compaction checkpoints at lines 175, 202, 285, 367, 398, 478, 567, 602, 675 break sessions into readable chunks.** This is good practice. However, the compaction checkpoint at line 175 falls BETWEEN S3 and S4 within the same milestone (MS3), which means a compaction mid-milestone could lose context about S3's outputs needed by S4. The SESSION_ARTIFACTS.json mechanism is supposed to handle this, but it's not defined (see Role 7, Critical #1).

5. **No explicit ordering constraint between MS2, MS3, MS4.** All three depend only on MS1 and can run in parallel. This is architecturally sound but should be called out as an optimization opportunity.

---

## ROLE 9: MCP UTILIZATION REVIEWER — Score: 65/100

### CRITICAL Findings

1. **No session start/during/end MCP protocol referenced.** The V24 execution protocol (from CLAUDE.md) mandates: read session block, create tasks, read knowledge sources BEFORE coding. The roadmap defines SMART CONFIG, KNOWLEDGE, INTENT, WORK, and EXIT GATE per session -- which aligns with the protocol structure -- but never explicitly references `prism_session` actions like `prism_session:start`, `prism_session:checkpoint`, or `prism_session:complete`.

2. **"1,307 existing engines properly leveraged" claim cannot be verified.** The roadmap references ~20 existing engines by name across all milestones. The system has 1,292-1,304 engines (per different counts in CLAUDE.md). The roadmap creates ~10 new engines and modifies ~5 existing ones. The vast majority of the engine catalog is not referenced. Specifically:
   - Quality engines (SPC, FAI, Metrology) -- not mentioned despite MS8 being about validation
   - Business engines (Quote, Cost, OEE) -- not mentioned despite the 3-tier commercial model
   - Memory engines (MemoryGraph, ContextSnapshot) -- not mentioned despite learning features in MS5

### HIGH Findings

3. **Plugin utilization (Vitest MCP, ESLint MCP) not mentioned.** The roadmap specifies test counts per milestone but never mentions running tests via Vitest MCP or linting via ESLint MCP. These are referenced in the V24 protocol.

4. **Dispatcher actions referenced inconsistently.** FORGE-TRIPLEs define new actions (`prism_cam:license_validate`, `prism_cam:fusion_inject_params`, etc.) but the roadmap doesn't reference EXISTING dispatcher actions. For example, the `camDispatcher` already has actions that MS3's parameter mapping should wire to, not duplicate.

5. **Existing engines are mostly USED correctly but some are recreated:**
   - The roadmap creates `FusionSetupAnalysisEngine` (line 363) but `WorkholdingVerificationEngine` and `WorkholdingForceEngine` already exist and handle setup analysis. The new engine should orchestrate them, which it appears to do (they're listed in KNOWLEDGE), but this should be explicit.
   - `ToolpathComparisonEngine` (line 549) vs existing `StrategyComparisonEngine` (625 LOC) and `StrategyBenchmarkEngine` -- potential overlap.

### MEDIUM Findings

6. **SKILLS listed in session blocks** (`/forge-engines`, `/test`, `/action-search`) are appropriate but incomplete. Sessions doing physics work should also list `/physics-verify` and `/prism-review`.

7. **No mention of atomicWrite utility** for state persistence during learning (MS5), despite it being the canonical write pattern for state files.

---

## ROLE 10: CROSS-ROADMAP COHERENCE REVIEWER — Score: 82/100

### CRITICAL Findings

1. **Cannot verify non-conflict with F360-AP-MS0 through MS5.** The roadmap declares "DEPENDENCIES: F360-AP-MS0 through MS5 (COMPLETE)" (line 12) but no F360-AP roadmap file exists in the roadmap directory (Glob search returned no results). The handoff files in `state/shared/handoffs/` reference `HANDOFF-f360-ms5-*` which suggests F360-AP-MS5 work was done, but without the original roadmap document, we cannot verify:
   - No overlapping unit names
   - No duplicate work
   - Status consistency

### HIGH Findings

2. **No conflict with v24 canonical roadmap sessions.** The v24 roadmap contains `0-D-FUSION-1`, `0-D-FUSION-2`, `0-D-FUSION-3` sessions dealing with Physics Fusion types, convergence engine, and orchestrator/plugins. The F360-FULL roadmap does NOT recreate these -- it builds ON TOP of them (MS5 references PhysicsFusionOrchestratorEngine at line 29). No overlapping work detected.

3. **Unit name namespace is clean.** All 36 units use the `U-FLIC`, `U-FLIT`, `U-FCAM`, `U-FTCL`, `U-FSIL`, `U-FBLK`, `U-FITG`, `U-FINT` prefixes. Grep confirmed these names appear ONLY in this roadmap file. No collisions with existing unit names in any other roadmap.

4. **Track authority is clear.** The roadmap declares `Track ID: F360-FULL` (line 2), which is distinct from `F360-AP` (add-in pipeline). However, both tracks modify the same files:
   - `scripts/fusion360-addin/fusion360_api_server.py` -- modified by 9 units across MS2-MS8
   - `src/engines/Fusion360LiveBridgeEngine.ts` -- modified by 4 units

   If F360-AP work is ongoing, these shared files create merge conflict risk. The roadmap should specify that F360-AP-MS5 is COMPLETE and no further modifications are expected from that track.

### MEDIUM Findings

5. **No mention of other roadmaps in the same directory.** The roadmap directory contains PP-MAXIMIZATION-ROADMAP.md, ULTIMATE-SHOP-OS-roadmap.md, MACHINE-HANDBOOK-INTELLIGENCE-ROADMAP.md. The F360-FULL roadmap doesn't reference or conflict with these, but a coherence statement would be valuable (e.g., "This roadmap is independent of PP-MAX and SHOP-OS tracks").

6. **The 3-tier model (Free/Pro/Ultimate) is new to this roadmap** and not mentioned in the v24 canonical roadmap. This is a significant product decision that should be cross-referenced with business-level planning. The roadmap assumes the tier model is approved but doesn't cite authorization.

---

## SUMMARY SCORECARD

| Role | Score | Critical | High | Medium |
|------|-------|----------|------|--------|
| R6: Physics Rigor | 78 | 3 | 3 | 3 |
| R7: Feature Cascade | 72 | 2 | 3 | 2 |
| R8: Dependency Graph | 88 | 0 | 3 | 2 |
| R9: MCP Utilization | 65 | 2 | 3 | 2 |
| R10: Cross-Roadmap Coherence | 82 | 1 | 2 | 2 |
| **OVERALL** | **77** | **8** | **14** | **11** |

## TOP 5 MUST-FIX ITEMS

1. **Add SESSION_ARTIFACTS.json blocks to every session** defining what each session produces for downstream consumption (R7-Critical-1, R7-Critical-2)
2. **Add explicit MCP session protocol references** (`prism_session:start/checkpoint/complete`) to each session block (R9-Critical-1)
3. **State all three core physics formulas explicitly** in MS6 where per-block computation happens: Kienzle (`Fc = kc1_1 * h^(1-mc) * b`), Taylor (`T = (C/Vc)^(1/n)`), Deflection (`delta = F*L^3 / (3*E*I)`) with the mandate to import from constants.ts (R6-Critical-2, R6-Critical-3)
4. **Fix test matrix ISO group count** from 5 to 6 to cover all canonical groups P/M/K/N/S/H (R6-High-6)
5. **Locate or regenerate the F360-AP roadmap** to verify non-overlap with F360-FULL track (R10-Critical-1)
