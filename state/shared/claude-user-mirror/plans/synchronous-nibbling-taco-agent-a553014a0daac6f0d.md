# FUSION360-FULL-CAPABILITIES-ROADMAP Review: Roles 16-20

---

## ROLE 16: LEARNING SYSTEM REVIEWER
**Score: 68/100**

### CRITICAL Findings

1. **No cold-start strategy for Bayesian priors.** U-FSIL05 (lines 410-422) says "Wire to SelfLearningCAMEngine Bayesian prior updating" but never specifies what the initial priors are. If priors are uninformative (flat), the first few overrides will swing recommendations wildly. If priors are set to PRISM's physics defaults, they need explicit definition. The roadmap is silent on initialization, which is a fatal gap for a Bayesian system.

2. **Override key `{material}_{operation_type}_{tool_type}_{machine}` is too coarse AND too fine simultaneously.** (Line 418) Too coarse: it ignores workholding rigidity, stickout length, and part geometry -- a user's preference for stepdown on a thin-wall pocket is completely different from a solid block pocket with the same material/op/tool/machine. Too fine: with 2,957 materials x 7 op types x ~20 tool types x 910 machines, the key space is ~376M combinations. Most keys will have zero or one data point, making Bayesian updating meaningless. No mention of hierarchical priors or key generalization.

### HIGH Findings

3. **"Why did you change?" dialog has no skip/dismiss specification.** (Lines 415-416) The roadmap says PRISM "asks user" but the abort criteria (line 421) only cover technical failures, not UX failures. If this dialog fires on every override, machinists will hate it within the first hour. There is no mention of: frequency limiting (ask at most once per session?), dismissal behavior (permanently stop asking for this key?), or batch mode (collect overrides silently, ask at end of session). The phrase "politely asks" (line 406) is aspirational, not a spec.

4. **Decay weighting (recent=2x, >30 days=0.5x) is a step function, not a curve.** (Line 418) What about overrides at 29 days vs 31 days? A sudden 4x relative weight change at the 30-day boundary creates instability. Industry practice uses exponential decay (e.g., half-life model) or sliding windows, not binary thresholds.

5. **No mechanism to distinguish "user was wrong" from "user knows better."** If a user overrides PRISM's recommendation and then gets a tool crash, that override should NOT be learned as a preference. There is no feedback loop from quality outcomes (tool life, scrap, surface finish) back into the learning system.

### MEDIUM Findings

6. **Shop-wide vs per-user distinction not addressed.** (Lines 406, 419) The roadmap mentions "Knowledge propagates across the shop" and feeding into tribal knowledge, but never specifies: who can see whose overrides? Does a junior operator's override propagate to the master machinist? Is there role-based filtering? Fleet learning is mentioned in the tier description (line 10) but never architecturally specified.

7. **Privacy not considered for fleet learning.** If shop A's override data flows to shop B (cloud CAM indexing, U-FITG06 line 622), competitive information about speeds/feeds/strategies could leak between competing shops. No data isolation or anonymization is specified.

8. **SelfLearningCAMEngine integration is stated but not detailed.** (Line 417) The existing engine is 1,740 LOC with its own learning model. How does FusionUserPreferenceLearningEngine's Bayesian updating interact with SelfLearningCAMEngine's existing learning? Are they parallel systems? Does one feed the other? Conflict resolution is unspecified.

---

## ROLE 17: COLLISION DETECTION REVIEWER
**Score: 72/100**

### CRITICAL Findings

1. **SAT (Separating Axis Theorem) is inadequate for 5-axis swept volumes.** (Line 311) SAT works well for convex polytopes but 5-axis tool motion produces non-convex swept volumes (the tool rotates through the workpiece space). The roadmap references "SweptVolumeCollision (SAT)" at the architecture level but the actual collision pre-check endpoint (U-FTCL04, lines 307-317) only mentions "CollisionEngine (SAT + swept volume)" without specifying how non-convex swept volumes are decomposed for SAT. For 3-axis this works; for 5-axis simultaneous motion, convex decomposition can miss thin concavities.

2. **False negative risk insufficiently addressed.** The abort criteria (line 316) say "false negative (missed collision)" is a trigger, but the roadmap specifies no methodology to DETECT false negatives. How do you test that a collision was missed? The test plan (U-FINT01, line 656) uses a 180-case matrix but never mentions collision-specific test cases with known collision geometries. Without a collision test corpus, false negatives are undetectable.

### HIGH Findings

3. **Fixture body modeling gap acknowledged only implicitly.** (Lines 310, 344) The collision pre-check takes "fixture geometry" as input, but fixture bodies in Fusion 360 are optional and frequently not modeled. U-FSIL01 (line 346) reads "fixture type" from setup, but many shops use fixture bodies only as keep-out volumes, not fully dimensioned models. If fixture data is incomplete or absent, the collision check gives false confidence. No fallback strategy (conservative bounding box, warn-and-proceed) is specified.

4. **Fusion's native collision vs PRISM's collision -- potential conflict.** Fusion 360 has its own collision detection in simulation. When PRISM does pre-CAM collision checking AND Fusion does post-CAM simulation collision checking, disagreements are inevitable (different mesh resolutions, different holder models). The roadmap never addresses: what happens when PRISM says "clear" but Fusion simulation says "collision"? Or vice versa? The user will lose trust in one system.

5. **HARD BLOCK mechanism (line 313) may be too aggressive.** "If collision detected, refuse to generate toolpath" is appropriate for safety, but without a confidence level or override path, this could block legitimate operations where the collision check is a false positive (e.g., near-miss reported as collision due to mesh tolerance). No mention of clearance threshold configuration or user override with acknowledgment.

### MEDIUM Findings

6. **Tool+holder+shaft assembly model may be incomplete for shrink-fit and hydraulic holders.** (Lines 272-283) The holder geometry export covers bore range, runout, and balance grade, but shrink-fit holders have a temperature-dependent bore diameter. The model uses static geometry only. This is acceptable for collision checking but worth noting.

7. **Pre-check latency target of <5s (line 316) may be insufficient for complex 5-axis parts.** Swept volume computation for 5-axis with full holder assembly on complex stock can take 10-30s. The 5s target may force approximations that increase false negative risk.

---

## ROLE 18: POST-PROCESSOR REVIEWER
**Score: 78/100**

### CRITICAL Findings

1. **Per-block S/F injection via post-processing assumes one-op-per-block is NOT the model, but the actual G-code structure is ambiguous.** (Lines 380-386, 467-476) The Pro tier does "operation-level S/F optimization (constant per operation)" while Ultimate does per-block. But the roadmap never explicitly addresses how per-block S/F overrides interact with canned cycles (G73, G83 peck drilling), where the controller internally generates multiple blocks from a single command. Injecting S-word overrides into canned cycle blocks is controller-dependent and potentially dangerous (some controllers ignore mid-cycle S changes, others crash).

### HIGH Findings

2. **Controller dialect selection needs more specificity.** (Line 670) The golden comparison validates 5 dialects (Fanuc, Haas, Siemens, Mazak, Okuma), but PostProcessorPipelineEngine supports 20 dialects. That leaves 15 dialects without integration-level validation. The roadmap should specify at minimum which dialects are "supported" vs "validated" and what the test coverage expectation is for the remaining 15.

3. **Safe move preservation during optimization is stated but not mechanized.** (Line 382) "Safe move validation" is listed as a post-processing step, but what constitutes a "safe move"? G28/G30 returns? Clearance plane rapids? The criteria for identifying and preserving safe moves are not specified, and post-optimization could turn a safe G0 Z100.0 into an optimized G0 Z5.0 if the algorithm only looks at cutting efficiency.

4. **Arc optimization preserving tolerances is not quantified.** (Line 382) "Arc optimization" is listed but no tolerance is specified. G2/G3 arc fitting of linear segments can introduce chord error. What is the maximum allowable chord error? How does it relate to the part tolerance? The abort criteria mention "syntax error" but not geometric deviation.

### MEDIUM Findings

5. **Side-by-side output (original + optimized) is useful but creates file management burden.** (Line 383) Two NC files per operation means the operator must know which to load. The roadmap does not specify naming convention, folder structure, or how the Fusion 360 panel presents the choice. Risk: operator loads the wrong file.

6. **G-code syntax validation after modification is implied but not architecturally specified.** The 38-stage pipeline presumably includes validation stages, but the roadmap does not confirm that a final syntax validation pass occurs AFTER all modifications. If the pipeline applies 37 stages and the 38th stage introduced an error, there is no catch.

---

## ROLE 19: BUSINESS MODEL REVIEWER
**Score: 74/100**

### CRITICAL Findings

1. **No pricing specified.** The 3-tier model is described (lines 7-10) but zero price points, pricing methodology, or revenue projections are given. A business model without prices is a feature list, not a business model. For machine shop software, the competitive range is significant -- CloudNC CamAssist is reportedly free (VC-funded), while Machining Cloud is free for tool data. If PRISM's free tier competes with free competitors and the Pro tier is priced above what shops will pay, the entire model fails.

### HIGH Findings

2. **Free tier may be too generous OR too limited depending on perspective.** (Line 8) "Basic S/F calculator (limited engines)" -- limited how? The free panel (MS2) includes physics-backed S/F from SpeedFeedOrchestratorEngine at Tier 1 with Kienzle and chip thinning (line 113). If this is good enough for 80% of use cases, there is no upgrade motivation. If it is too limited (no convergence, no material-specific tuning), users will dismiss PRISM entirely. The conversion funnel from free to pro is not analyzed.

3. **Competitor analysis absent.** (Line 649 references HSMAdvisor and GWizard as validation baselines, not as competitors.) The roadmap never addresses: Why would a shop choose PRISM over HSMAdvisor ($50 perpetual)? Over GWizard ($50/year)? Over CloudNC CamAssist (free, integrated with Fusion)? The value proposition must be articulated against these specific alternatives.

4. **Feature gating at the per-block S/F level (Ultimate only) may alienate Pro users.** (Lines 9-10) The single biggest value proposition of PRISM -- per-block variable S/F -- is locked behind the highest tier. Pro users who see "operation-level S/F" may feel they are getting a half-measure. The upgrade cliff from Pro to Ultimate is steep: Pro gets post-processing but with constant S/F per operation; Ultimate gets per-block. This is a large capability jump with no intermediate step.

### MEDIUM Findings

5. **No mention of annual vs perpetual licensing, seat vs machine licensing, or shop-size pricing.** Machine shops range from 1-person to 500+. A flat per-seat price that works for a 5-person shop will be unaffordable at 50 seats, and vice versa.

6. **Revenue model sustainability unclear.** With cloud CAM indexing (Ultimate tier, line 10), there are ongoing server costs. How are these funded? Per-seat subscription? Usage-based? The PostgreSQL backend (mentioned in U-FITG06) implies hosted infrastructure but no cost model is attached.

---

## ROLE 20: SCALABILITY & MAINTENANCE REVIEWER
**Score: 65/100**

### CRITICAL Findings

1. **95K tools x 910 machines x 2,957 materials = 255 billion parameter combinations.** The roadmap never addresses how the system scales when users query parameters across this full combinatorial space. The FusionCAMParameterInjectionEngine (U-FCAM05, line 213) maps 762 strategies to Fusion parameter payloads, but strategy selection depends on material+machine+tool combinations. Cache strategy is mentioned only for parameter discovery (U-FCAM01, line 159: "Cache discovered params in fusion360-cam-params.ts") but not for the much larger computed result space. In-memory caching of computed S/F results will exhaust available RAM quickly.

2. **Parameter discovery cache invalidation when Fusion updates is acknowledged but not solved.** (Line 162) "stale cache not detected" is an abort criterion for U-FCAM01, but the mechanism for detecting staleness is never specified. Fusion 360 updates approximately every 2 weeks and can change parameter names, add new parameters, or deprecate old ones. The cached param file (fusion360-cam-params.ts) is a TypeScript file, meaning it requires a rebuild when cache changes. There is no runtime invalidation strategy.

3. **Python add-in maintainability at scale is a serious risk.** The add-in starts at ~2,578 LOC and the roadmap adds ~2,800 LOC Python (line 729), bringing it to ~5,400 LOC in a single file (fusion360_api_server.py). The roadmap never mentions refactoring this file into modules. A 5,400 LOC single-file Python server with 30+ endpoints, decorators, and tier checking will be extremely difficult to maintain, test, and debug. Every session modifies the same file.

### HIGH Findings

4. **Test matrix (180 cases) is good but may not be maintainable.** (Line 656) The matrix is 3 tiers x 5 ISO groups x 4 strategy types x 3 machine types = 180 cases. Each case requires: create Fusion setup, inject params, generate toolpath, post-process, validate. If each test takes 30 seconds (conservative for Fusion API calls), the full matrix takes 90 minutes. Running this in CI is impractical. Running it manually is unsustainable. No mention of test parallelization, mock strategies, or tiered test execution (smoke vs full matrix).

5. **TypeScript bridge growth not quantified.** (Line 731) The roadmap modifies 5 existing engines and creates ~6,300 LOC of new TypeScript. The existing system is 1,304 engines across the MCP server. Adding 15+ new engines without a maintenance strategy (ownership, documentation debt, deprecation plan) risks the same sprawl problem. ENGINE_DIGEST.md will grow but who updates it?

6. **Database schema for cloud CAM indexing (U-FITG06, lines 622-630) is vaguely specified.** "Store in PostgreSQL (existing infra) keyed by feature_hash + material + machine" -- but what is the feature_hash algorithm? How large do the rows get (toolpath coordinates can be megabytes)? What is the retention policy? The existing PostgreSQL connection pool is 20 connections -- is this sufficient when multiple Fusion users are simultaneously indexing?

### MEDIUM Findings

7. **License validation offline-first design is specified (U-FLIC01 line 43: "offline verification with HMAC-SHA256") but the online refresh cycle is unspecified.** How often does the license need to phone home? What happens during multi-day network outages (common in secure manufacturing facilities)? Grace period? The JWT has an "expiry" field but the refresh interval is not defined.

8. **Build size impact not assessed.** The current build is 5.1MB (from MEMORY.md). Adding 6,300 LOC TypeScript + associated imports will increase this. The esbuild bundle at 61MB (from CLAUDE.md) will also grow. No bundle size budget is specified.

9. **No monitoring or telemetry plan for production.** Once deployed in shops, how will PRISM detect: slow queries, license failures, cache staleness, learning system drift, collision check timeouts? The roadmap is entirely development-focused with no operational observability plan.

---

## SUMMARY TABLE

| Role | Score | Critical | High | Medium |
|------|-------|----------|------|--------|
| 16 - Learning System | 68 | 2 | 3 | 3 |
| 17 - Collision Detection | 72 | 2 | 3 | 2 |
| 18 - Post-Processor | 78 | 1 | 3 | 2 |
| 19 - Business Model | 74 | 1 | 3 | 2 |
| 20 - Scalability & Maintenance | 65 | 3 | 3 | 3 |

**Aggregate: 71.4 / 100**

**Top 5 Must-Fix Items (across all roles):**
1. Learning system cold-start priors + override key space explosion (Role 16, Critical #1 and #2)
2. SAT inadequacy for 5-axis swept volumes and false negative detection gap (Role 17, Critical #1 and #2)
3. Python add-in single-file maintainability at 5,400 LOC (Role 20, Critical #3)
4. No pricing or competitor analysis in business model (Role 19, Critical #1)
5. Parameter cache invalidation strategy missing (Role 20, Critical #2)
