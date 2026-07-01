# SIERRA-BACKEND/U-FE-ROUTE-CONTRACT-CI-GATE — [MAIN-FORCE] [SIERRA-BACKEND]/U-FE-ROUTE-CONTRACT-CI-GATE (slot:sierra): lock mounted-P0=0 via vitest gate (rides existing CI)

**Commit:** `bf03864852e2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T14:28:47-05:00
**Tags:** sierra-backend, u-fe-route-contract-ci-gate, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-BACKEND]/U-FE-ROUTE-CONTRACT-CI-GATE (slot:sierra): lock mounted-P0=0 via vitest gate (rides existing CI)

## Body
```
[MAIN-FORCE] [SIERRA-BACKEND]/U-FE-ROUTE-CONTRACT-CI-GATE (slot:sierra): lock mounted-P0=0 via vitest gate (rides existing CI)

Locks the win from the U-FE-* campaign (19 silent 200+{error} footguns -> 0) against
frontend-team regressions. A vitest test in mcp-server/src/__tests__ that runs the
sierra-owned verifier (scripts/lib/fe-route-action-contract.mjs) and asserts:
  1. p0Mounted === 0  (no mounted route calls a non-existent dispatcher action; on
     failure it prints the exact route+tool:action)
  2. unparsableDispatchers === []  (no UNVERIFIABLE blind spot can mask a P0)
  3. resolved > 0.8*literalPairs  (guards the inverse failure -- a parser that
     trivially resolves everything would make p0==0 vacuous)

Rides the EXISTING
 RUN  v4.1.7 H:/PRISM

 ❯ src/__tests__/hypermill-kc-ms0-extraction.test.ts (242 tests | 242 skipped) 11ms
 ❯ src/__tests__/mcp-auth.test.ts (48 tests | 17 failed) 26ms
       × full PKCE flow: generate URL → exchange code → validate token 5ms
       × rejects token with invalid signature 1ms
       × refreshes token and rotates refresh token 1ms
       × revokes access token 0ms
       × revokes all user tokens 0ms
       × rejects reused auth code 1ms
       × rejects wrong PKCE verifier 2ms
       × rejects wrong client ID on code exchange 1ms
       × rejects wrong redirect URI on code exchange 1ms
       × rejects invalid client on authorization 1ms
       × rejects invalid redirect URI on authorization 0ms
       × scope 'read' resolves to viewer role 0ms
       × scope 'read operate program' resolves to programmer 0ms
       × scope cannot elevate beyond user role 0ms
       × returns stats 1ms
       × removes user and revokes their tokens 0ms
       × cleans up expired codes and tokens 0ms
 ❯ src/__tests__/hypermill-kc-ms10-s2-similarity-replicator.test.ts (43 tests | 1 failed) 13ms
       × AC script contains all 5+ operations 4ms
 ❯ src/__tests__/QuoteToShipOrchestratorEngine.test.ts (140 tests | 1 failed) 1130ms
     × 6061-T6 bracket runs all 27 stages without crash 6ms
stdout | src/__tests__/pp-regression-pins.test.ts > PP Regression Pins — Per-Block Engagement Inference
[PIN] 4140 Steel / Haas VF-2: plungeFeed=0, profilingFeed=63, uniqueFeeds=63,137,76, plungeClass=N/A, profilingClass=N/A
[PIN] 7075-T6 Aluminum / Haas VF-2: plungeFeed=0, profilingFeed=539, uniqueFeeds=539,1077,431, plungeClass=N/A, profilingClass=N/A
[PIN] 316L Stainless / Fanuc 31i: plungeFeed=0, profilingFeed=44, uniqueFeeds=44,118,53, plungeClass=N/A, profilingClass=N/A
[PIN] Inconel 718 / Siemens 840D: plungeFeed=0, profilingFeed=12, uniqueFeeds=12,44,14, plungeClass=N/A, profilingClass=N/A

 ❯ src/__tests__/pp-regression-pins.test.ts (37 tests | 13 failed) 6136ms
       × plunge block is detected and has LOWER feed than profiling 4ms
       × plunge block is classified as 'plunge' 2ms
       × profiling block feed pinned within +-20% 0ms
       × plunge block is detected and has LOWER feed than profiling 0ms
       × plunge block is classified as 'plunge' 0ms
       × profiling block feed pinned within +-20% 0ms
       × plunge block is detected and has LOWER feed than profiling 0ms
       × plunge block is classified as 'plunge' 0ms
       × profiling block feed pinned within +-20% 0ms
       × plunge block is detected and has LOWER feed than profiling 0ms
       × plunge block is classified as 'plunge' 0ms
       × profiling block feed pinned within +-20% 0ms
       × all combos detect at least one plunge block 0ms
 ❯ src/__tests__/feasibility-analysis-engine.test.ts (34 tests | 1 failed) 13ms
       × should confirm accessibility for a shallow pocket with adequate tool 6ms
 ❯ src/__tests__/HyperMillMetricCfgExtractor.test.ts (64 tests | 33 failed) 33ms
     × extracts cycleType as HMCAST (filename without extension) 7ms
     × sourceFile is HMCAST.CFG 1ms
     × parameterCount matches parameters array length 1ms
     × extracts exactly 52 parameters from HMCAST.CFG 0ms
     × VERTZUSTEL has defaultValue 2.0 and numeric type 0ms
     × AUFMASS has defaultValue 0.5 0ms
     × SICHEBENE has defaultValue 100.0 0ms
     × FRTYP has defaultValue 3 (radius/bull endmill) 1ms
     × PRECISION has defaultValue 0.05 1ms
     × MACRO_TRAD_F is formula type with T:Rad ref 0ms
     × APPROXRES is formula type with mtol ref (pipe-separated) 0ms
     × extracts cycleType as hmZfin (preserves mixed case) 0ms
     × parameterCount matches parameters array length 0ms
     × extracts exactly 102 parameters from hmZfin.CFG 0ms
     × VERTZUSTEL has value 2.0 0ms
     × FRTYP has value 1 (ball endmill — Z finishing uses ball) 0ms
     × FILLET_RADIUS_F is formula type referencing T:Dia 1ms
     × all formula parameters have at least one formulaRef entry 0ms
     × extracts cycleType as HMFACE 0ms
     × parameterCount matches parameters array length 0ms
     × extracts exactly 24 parameters from HMFACE.CFG 0ms
     × VERTZUSTEL has value 5.0 (different from HMCAST's 2.0) 0ms
     × PRECISION has value 0.01 0ms
     × CNTRES is formula type referencing mtol 0ms
     × FRTYP has value 3 (bull/radius endmill) 0ms
     × AUFMASS_Z has value 0.0 0ms
     × SICHDIST has value 5.0 1ms
     × returns no parse errors when reading all 181 .cfg files 3ms
     × returns exactly 181 cycle schemas (one per .CFG file) 1ms
     × returns at least 6,000 total parameters across all cycle types 0ms
     × HMCAST schema found with 52 parameters in full extraction 0ms
     × hmZfin schema found with 102 parameters in full extraction 1ms
     × HMFACE schema found with 24 parameters in full extraction 0ms
 ❯ src/__tests__/pp-chip-thinning.test.ts (28 tests | 3 failed) 6269ms
       × Stage 2.3 appears in pipeline stage results 6ms
       × profiling blocks have chip_thinning_factor > 1.0 (light engagement = thin chips) 1ms
       × both Stage 2.1 and Stage 2.3 ran successfully 1ms
 ❯ src/__tests__/wedm-gcode-structure-validation.test.ts (23 tests | 1 failed) 15ms
     × line numbers are sequential 4ms
 ❯ src/__tests__/quoting-system.test.ts (37 tests | 1 failed) 542ms
     × handles NRE items with amortization 8ms
 ❯ src/__tests__/video-replay-pipeline-real.test.ts (27 tests | 13 failed) 165ms
     × detects FFmpeg 23ms
     × detects Python 3.12 11ms
     × detects CadQuery 9ms
     × simple box: volume ~37500 2ms
     × box with fillet: valid, face_count > 6 2ms
     × cylinder: volume ~pi*r^2*h 2ms
     × box with chamfer: changes edge geometry 2ms
     × export to STEP file creates file on disk 2ms
     × two-body: box + cylinder 2ms
     × sphere volume matches formula 2ms
     × cone volume matches formula 2ms
     × hollow shell has less volume than solid 2ms
     × vertex count is correct for a box 1ms
 ❯ src/__tests__/box-ms8-mill-wedm.test.ts (0 test)
 ❯ src/__tests__/erp-expansion.test.ts (39 tests | 1 failed) 12ms
     × performs 3-way match 2ms
 ❯ src/__tests__/u-arch3-material-resolution.test.ts (31 tests | 1 failed) 831ms
     × has 13 material entries 4ms
 ❯ src/__tests__/BayesianAdaptiveEngine.test.ts (35 tests | 4 failed) 23ms
       × returns aluminum priors for material="aluminum" 8ms
       × returns titanium priors 1ms
       × returns inconel priors 1ms
       × uses aluminum prior when material_hint="aluminum" 1ms
 ❯ src/__tests__/batch35-final-coverage.test.ts (36 tests | 1 failed) 4859ms
     × quote — generates mold cost and per-part pricing for ABS part 6ms
 ❯ src/__tests__/batch31-engines.test.ts (35 tests | 1 failed) 111ms
     × getDashboard returns dashboard data 9ms
 ❯ src/__tests__/presets-learning-engines.test.ts (36 tests | 2 failed) 30ms
       × shares and unshares a preset 1ms
       × increments use count 0ms
 ❯ src/__tests__/portal-routes.test.ts (0 test)
 ❯ src/__tests__/operating-system-routes.test.ts (0 test)
 ❯ src/__tests__/infra-remaining-phases.test.ts (29 tests | 1 failed) 2239ms
     × should have production stage in Dockerfile 127ms
 ❯ src/__tests__/u-cad1-cadquery-integration.test.ts (24 tests | 2 failed | 9 skipped) 4ms
     × cadquery_execute_script is in the ACTIONS array 1ms
     × cadActionSchemas includes new action schemas 0ms
 ❯ src/__tests__/sys-ms1-sub-dispatchers.test.ts (44 tests | 4 failed) 1661ms
     × has 41 actions in schema 5ms
     × has 42 actions in schema 1ms
     × has 38 actions in schema 1ms
     × total extracted actions = 231 1ms
 ❯ src/__tests__/cwedm-calculator-routes.test.ts (0 test)
 ❯ src/__tests__/traveler-routes.test.ts (0 test)
 ❯ src/__tests__/advanced-chip-engagement.test.ts (50 tests | 1 failed) 11ms
       × returns 1.0 at 50%+ WOC 5ms
 ❯ src/__tests__/lathe-turning-routes.test.ts (0 test)
 ❯ src/__tests__/handbook-consumer-matrix-svi.test.ts (36 tests | 16 failed) 13391ms
     × consumer matrix file exists and parses as valid JSON 5ms
     × defines all 11 handbook section types 1ms
     × documents at least 15 consumers 1ms
     × every consumer has required fields 1ms
     × every consumer file exists on disk 0ms
     × covers all 7 core HBK engines (MS0-MS6) 1ms
     × includes physics pipeline consumers (SpeedFeed, FeedRate, Thermal) 0ms
     × includes business pipeline consumers (QuoteToShip) 0ms
     × includes safety hooks (machineLimitGuard, alarmSeverityEscalation) 1ms
     × includes manufacturing enforcement hooks (handbookLimitGuard, freshnessCheck, coverageGate) 0ms
     × includes machineSetupDispatcher with handbook actions 1ms
     × 100% of consumers have fallback behavior documented 1ms
     × defines at least 5 data flow paths 1ms
     × data flows cover acquisition, capability, alarm, maintenance, controller, safety 0ms
     × SVI watch targets include handbook consumer matrix 2ms
     × consumer matrix coverage_metrics match actual consumer count 1ms
 ❯ src/__tests__/ChainFailureRecoveryEngine.test.ts (0 test)
 ❯ src/__tests__/l8-p1-learning-web.test.ts (67 tests | 7 failed) 375ms
     × has nested learning routes under /learning 3ms
     × LearningPath uses hooks from useLearning 7ms
     × ProgressTracker uses hooks from useLearning 7ms
     × KnowledgeSearch uses hooks from useLearning 3ms
     × MachineWizard uses hooks from useLearning 3ms
     × DigitalTwin uses hooks from useLearning 2ms
     × Layout.tsx includes Learning nav item 8ms
 ❯ src/__tests__/quoting-engines-r2.test.ts (32 tests | 1 failed) 134ms
     × quotes a basic ABS part 4ms
 ❯ src/__tests__/pp-canned-cycles.test.ts (38 tests | 5 failed) 12149ms
     × output contains CYCLE81 or CYCLE83 (Siemens canned cycle syntax) 12ms
     × output contains MCALL prefix before cycle call 1ms
     × Siemens output contains CYCLE84 tap code 22ms
     × Siemens tap cycle uses MCALL prefix 1ms
     × Siemens drill/tap lines use CYCLE format (CYCLE81/CYCLE83/CYCLE84) 1ms
 ❯ src/__tests__/parts-routes.test.ts (0 test)
 ❯ src/__tests__/erp-routes-sync.test.ts (0 test)
 ❯ src/__tests__/u-mat3-mat4-wiring.test.ts (19 tests | 1 failed) 22ms
     × returns all 21 pipeline stages 2ms
 ❯ src/__tests__/feedback-persistence.test.ts (18 tests | 3 failed) 12ms
       × should save ML data to JSON file 4ms
       × should restore previously saved data 1ms
       × should handle missing file gracefully 0ms
 ❯ src/__tests__/presets-learning-routes.test.ts (0 test)
 ❯ src/__tests__/l4-hooks-cadences.test.ts (27 tests | 1 failed) 17ms
     × safetyQualityHooks exports 20 hooks 1ms
 ❯ src/__tests__/pp-ms6-api-fusion.test.ts (19 tests | 2 failed) 210ms
     × has PRISM server URL property 9ms
     × has Phase A (server) and Phase B (offline) logic 5ms
 ❯ src/__tests__/process-capability-prediction.test.ts (26 tests | 1 failed) 22ms
     × sigma level reflects capability 2ms
 ❯ src/__tests__/handbook-skills-hooks-ms10.test.ts (22 tests | 1 failed) 132ms
       × ControllerProgrammingIntelligenceEngine is exported from index.ts 4ms
 ❯ src/__tests__/system-comprehensive.test.ts (0 test)
 ❯ src/__tests__/calculator-machinist-allout-sanity.test.ts (0 test)
 ❯ src/__tests__/learning-routes.test.ts (0 test)
 ❯ src/__tests__/formula-validation-engine.test.ts (36 tests | 1 failed) 15ms
       × should pass all material checks 4ms
 ❯ src/__tests__/MultiProcessCAMBridgeEngine.test.ts (19 tests | 1 failed) 381ms
     × routes multi-axis features through the real multiaxis delegate 85ms
 ❯ src/__tests__/data-routes.test.ts (5 tests | 4 failed) 1380ms
     × returns real material objects from the registry search 35ms
     × returns real machine objects from the registry search 258ms
     × resolves machine and material gets through the registries 6ms
     × returns real tool objects from the registry search 572ms
 ❯ src/__tests__/learning-course-routes.test.ts (0 test)
 ❯ src/__tests__/safety-quality-handbook-integration.test.ts (20 tests | 2 failed) 75ms
       × attempts handbook resolution when machine_id provided but no limits 5ms
       × returns warning when alarm code has no handbook data 2ms
 ❯ src/__tests__/m0-route-mounts.test.ts (0 test)
 ❯ src/__tests__/quotes-mounted-routes.test.ts (0 test)
 ❯ src/__tests__/stochastic-edm.test.ts (20 tests | 1 failed) 27ms
     × increases with pulse duration 1ms
 ❯ src/__tests__/batch8-engines.test.ts (17 tests | 1 failed) 8ms
       × computes IK for table-table configuration 2ms
 ❯ src/__tests__/quote-compat-routes.test.ts (0 test)
 ❯ src/__tests__/auto-fix-pipeline-engine.test.ts (19 tests | 1 failed) 21ms
       × improvement_rate is between 0 and 1 1ms
 ❯ src/__tests__/tool-axis-optimization.test.ts (0 test)
 ❯ src/__tests__/u-arch3-quote-to-ship.test.ts (10 tests | 3 failed) 115ms
     × exports singleton from engines/index.ts 20ms
     × defines all 21 pipeline stages 2ms
     × getStatus returns status for all stages 1ms
 ❯ src/__tests__/SmartToolSelectorEngine.test.ts (11 tests | 3 failed) 499ms
     × selects tool for drilling in aluminum 41ms
     × handles face milling operation 49ms
     × handles ball-end for 3D finishing 36ms
 ❯ src/__tests__/quote-routes.test.ts (0 test)
 ❯ src/__tests__/CAMKernelE2E.test.ts (9 tests | 2 failed) 221ms
     × all CK engines load from index.ts without errors 27ms
     × dispatchCAMAction and listCAMActions export correctly 14ms
 ❯ src/__tests__/svi-engine.test.ts (7 tests | 1 failed) 914ms
     × autoRefreshIfStale: recomputes when watched feature surfaces drift 173ms
 ❯ src/__tests__/realtime-dispatcher.test.ts (11 tests | 11 failed) 218ms
     × registers the prism_realtime tool 209ms
       × broadcasts a notification 0ms
       × defaults to notification type 7ms
       × rejects invalid event type 0ms
       × sends to a room 0ms
       × rejects missing room 0ms
       × sends to a target 0ms
       × accepts client_id alias 0ms
       × accepts user_id alias 0ms
       × rejects missing target 0ms
       × returns connection statistics 0ms
 ❯ src/__tests__/dfm-routes.test.ts (0 test)
 ❯ src/__tests__/realtime-route.test.ts (6 tests | 6 failed) 34ms
     × exports createRealtimeRouter function 33ms
     × creates a router with 3 routes 0ms
       × calls bridge.emit when room is provided 0ms
       × calls bridge.broadcast when no room 0ms
       × rejects invalid event type 0ms
       × returns bridge and websocket stats 0ms
 ❯ src/__tests__/cutting-temperature-engine.test.ts (10 tests | 2 failed) 3ms
     × warns when tool temp exceeds coating limit 1ms
     × thermal damage risk increases with temperature 0ms
 ❯ src/__tests__/turning-edm-routes.test.ts (0 test)
 ❯ src/__tests__/batch87-engines.test.ts (18 tests | 1 failed) 4ms
     × finish mode → lower Ra than rough 1ms
 ❯ src/__tests__/file-access-pattern-engine.test.ts (0 test)
 ❯ src/__tests__/batch95-engines.test.ts (0 test)
 ❯ src/__tests__/optimization-formulas.test.ts (0 test)
 ❯ src/__tests__/batch104-engines.test.ts (0 test)
 ❯ src/__tests__/QualityScoreEngine.test.ts (21 tests | 2 failed) 13111ms
       × engines in index.ts get W credit 288ms
       × handles empty engine filter gracefully 709ms
 ❯ src/__tests__/batch75-engines.test.ts (0 test)
 ❯ src/__tests__/output-budget-engine.test.ts (0 test)
 ❯ src/__tests__/pp-real-inspection.test.ts (6 tests) 7726ms
 ❯ src/__tests__/memoryProfile.test.ts (0 test)
 ❯ src/__tests__/smart-prefetch-engine.test.ts (0 test)
 ❯ src/__tests__/conversation-budget-engine.test.ts (0 test)
 ❯ src/__tests__/database.test.ts (8 tests | 1 failed) 4ms
     × query returns empty result when not connected 1ms
 ❯ src/__tests__/websocket-engine.test.ts (0 test)
 ❯ src/__tests__/read-optimizer-engine.test.ts (10 tests | 2 failed) 6ms
       × recommends grep for known large files with intent 2ms
       × recommends digest for known large files without intent 1ms
 ❯ src/__tests__/surface-integrity-engine.test.ts (10 tests | 1 failed) 2ms
     × Rz ≈ 5 × Ra 1ms
 ❯ src/__tests__/v6-integration.test.ts (8 tests | 2 failed) 11090ms
     × all v6.0 engines export from index 67ms
     × WebSocket engine has correct event types 0ms
 ❯ src/__tests__/ScalableCAMOrchestratorEngine.test.ts (10 tests | 1 failed) 22361ms
     × handles 200+ features in under 10 seconds 12017ms
 ❯ src/__tests__/error-context-engine.test.ts (8 tests | 1 failed) 11593ms
       × provides suggestion for import.meta errors 1458ms
 ❯ src/__tests__/PostProcessorMOAT-MS1.test.ts (20 tests | 1 failed) 51949ms
     × produces 2.0_line_by_line_adaptive stage when gcode input provided 30366ms
 ❯ src/__tests__/context-preloader-engine.test.ts (9 tests | 1 failed) 18511ms
       × includes recent commits 3026ms
 ❯ src/__tests__/session-delta-engine.test.ts (20 tests | 1 failed) 38922ms
       × returns reasonable counts for the PRISM repo 292ms
 ❯ src/__tests__/BooleanKernelEngine.test.ts (2 tests | 1 failed) 20025ms
     × subtracts solids through the real CAD bridge kernel 10017ms
 ❯ src/__tests__/llm-engine.test.ts (9 tests | 1 failed) 32160ms
     × query returns offline response without API key 10841ms
 ❯ src/__tests__/ResourceCensusEngine.test.ts (15 tests | 2 failed) 214015ms
       × scans all locations and returns a report 83896ms
       × warns on unknown type 46763ms

 Test Files  106 failed | 1044 passed | 2 skipped (1153)
      Tests  197 failed | 34083 passed | 296 skipped (34594)
     Errors  230 errors
   Start at  14:24:16
   Duration  270.14s (transform 681.52s, setup 0ms, import 886.06s, tests 1279.74s, environment 102ms) CI step (ci.yml build-and-test) -- no shared-workflow
edit (lowest fleet-coordination risk). Cross-boundary import of the lib follows established
precedent (many mcp-server tests import ../../../scripts/); *.test.ts is build-excluded so
tsc is unaffected; vitest resolves it (3/3 pass live).

R7 note: chose a HARD gate over the handoff's earlier advisory preference. That caution
assumed false-positive risk from the 6 UNVERIFIABLE dispatchers -- eliminated by
U-FE-VERIFIER-OBJECTMAP (unverifiable 6->0, 3-of-3-verified exact parser). A hard gate now
starts green and fires only on a genuine silent-footgun regression, which is correct.
```

## Files touched (2)
- mcp-server/src/__tests__/fe-route-contract-gate.test.ts | 58 +++++++++++++++++++++++++++++++++++++++
- 1 file changed, 58 insertions(+)

## Lessons surfaced in commit body
- wrong PKCE verifier 2ms
- wrong client ID on code exchange 1ms
- wrong redirect URI on code exchange 1ms
- note: chose a HARD gate over the handoff's earlier advisory preference. That caution

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bf03864852e2`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-BACKEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._