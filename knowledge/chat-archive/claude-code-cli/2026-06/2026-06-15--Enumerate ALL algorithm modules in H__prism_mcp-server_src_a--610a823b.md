---
type: "chat-session"
source: "claude-code-cli"
session_id: "610a823b-dfea-4855-b749-16661916b5fa"
title: "Enumerate ALL algorithm modules in H:/prism/mcp-server/src/algorithms/ (the inte"
date: "2026-06-15"
first_ts: "2026-06-15T23:17:47.039Z"
last_ts: "2026-06-15T23:20:16.394Z"
cwd: "H:\\prism-slot-tango"
messages: 23
user_msgs: 10
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism-slot-tango/610a823b-dfea-4855-b749-16661916b5fa/subagents/workflows/wf_b2fa7dc8-877/agent-abe6fbf5c10eb66f2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:12"
---

# Enumerate ALL algorithm modules in H:/prism/mcp-server/src/algorithms/ (the inte

> **claude-code-cli** | 2026-06-15 | 23 msgs (10 user / 13 assistant) | cwd: H:\prism-slot-tango
> Raw: `H:/.claude/projects/H--prism-slot-tango/610a823b-dfea-4855-b749-16661916b5fa/subagents/workflows/wf_b2fa7dc8-877/agent-abe6fbf5c10eb66f2.jsonl`

## Transcript

### User | 2026-06-15T23:17:47.039Z

Enumerate ALL algorithm modules in H:/prism/mcp-server/src/algorithms/ (the integration tree).
Run: ls H:/prism/mcp-server/src/algorithms/*.ts, EXCLUDE *.test.ts files.
For each module file, read its top ~40 lines and extract the PRIMARY export name (the exported class or const that other code imports -- e.g. "export class BayesianOptimizer" -> BayesianOptimizer; "export const fooEngine" -> fooEngine). If both a class and a lowercase singleton are exported, prefer the class name.
Return total (the count of non-test modules) and modules[] = {file (basename, e.g. "BayesianOptimizer.ts"), exportName}. Be exhaustive -- every module.

### Assistant | 2026-06-15T23:17:54.780Z

I'll enumerate all algorithm modules systematically.

### Assistant | 2026-06-15T23:17:55.459Z

[tool_use: Bash]

### User | 2026-06-15T23:18:02.569Z

[tool_result] H:/prism/mcp-server/src/algorithms/ABCClassificationFormula.ts
H:/prism/mcp-server/src/algorithms/ActivationFunctionsAlgorithm.ts
H:/prism/mcp-server/src/algorithms/AdaptiveControllerModel.ts
H:/prism/mcp-server/src/algorithms/AmortizationScheduleFormula.ts
H:/prism/mcp-server/src/algorithms/AnomalyDetector.ts
H:/prism/mcp-server/src/algorithms/AntColonyTSP.ts
H:/prism/mcp-server/src/algorithms/Ba
... [+6684 chars truncated]

### Assistant | 2026-06-15T23:18:05.240Z

Now I'll read the top ~40 lines of each file to extract primary export names. I'll do this in parallel batches.

### Assistant | 2026-06-15T23:18:10.223Z

[tool_use: Bash]

### User | 2026-06-15T23:18:18.048Z

[tool_result] === ABCClassificationFormula ===
export function classifyABC(
=== ActivationFunctionsAlgorithm ===
export class ActivationFunctionsAlgorithm {
=== AdaptiveControllerModel ===
export class AdaptiveControllerModel implements Algorithm<AdaptiveControllerInput, AdaptiveControllerOutput> {
=== AmortizationScheduleFormula ===
export function fixedPayment(principal: number, rate_periodic: number, n_perio
... [+1769 chars truncated]

### Assistant | 2026-06-15T23:18:24.684Z

[tool_use: Bash]

### User | 2026-06-15T23:18:37.336Z

[tool_result] === CoolantFlowModel ===
export class CoolantFlowModel implements Algorithm<CoolantFlowInput, CoolantFlowOutput> {
=== CoolantSequenceGenerator ===
export function generateSequence(input: CoolantSequenceInput): CoolantSequenceResult {
=== CoolantVcModifier ===
export function getMultipliers(input: CoolantVcInput): CoolantVcResult {
=== CriticalPathSchedulingFormula ===
export function scheduleCrit
... [+1749 chars truncated]

### Assistant | 2026-06-15T23:18:43.834Z

[tool_use: Bash]

### User | 2026-06-15T23:18:46.013Z

[tool_result] === FirstContactEmailTemplateFormula ===
export function generateFirstContactEmail(prospect: ProspectiveCustomer): ComposedEmail {
=== FiveAxisTiltLeadOptimizer ===
export function optimize(input: TiltLeadInput): TiltLeadResult {
=== FlushStrategyPicker ===
export function pickFlush(input: FlushInput): FlushResult {
=== FRFStabilityLobe ===
export class FRFStabilityLobe implements Algorithm<FRFSta
... [+1684 chars truncated]

### Assistant | 2026-06-15T23:18:51.848Z

[tool_use: Bash]

### User | 2026-06-15T23:18:55.580Z

[tool_result] === JaegerTempField ===
export class JaegerTempField implements Algorithm<JaegerTempFieldInput, JaegerTempFieldOutput> {
=== JobCostBomRollup ===
export function rollupCost(input: BomRollupInput): BomRollupResult {
=== JohnsonCookModel ===
export const JohnsonCookModel = new JohnsonCookModelImpl();
=== JointSpeedFeedOptimizer ===
export function computePower_W(args: {
=== KalmanFilter ===
export c
... [+1531 chars truncated]

### Assistant | 2026-06-15T23:19:02.879Z

[tool_use: Bash]

### User | 2026-06-15T23:19:07.813Z

[tool_result] === OperatorSplittingMethod ===
export const OperatorSplittingMethod = new OperatorSplittingMethodImpl();
=== ParticleSwarm ===
export class ParticleSwarm implements Algorithm<ParticleSwarmInput, ParticleSwarmOutput> {
=== PersonalizedPageRank ===
export const PersonalizedPageRank: Algorithm<PPRInput, PPROutput> = {
=== PIDController ===
export class PIDController implements Algorithm<PIDControlle
... [+1695 chars truncated]

### Assistant | 2026-06-15T23:19:18.319Z

[tool_use: Bash]

### User | 2026-06-15T23:19:22.336Z

[tool_result] === StabilityLobeDiagram ===
export const StabilityLobeDiagram = new StabilityLobeDiagramImpl();
=== StepIgesRoundTripDiff ===
export function diff(input: RoundTripDiffInput): RoundTripDiffResult {
=== STFTChatter ===
export class STFTChatterDetection implements Algorithm<STFTChatterInput, STFTChatterOutput> {
=== SubprogramCaller ===
export function generateCall(input: SubprogramCallInput): Subpr
... [+1876 chars truncated]

### Assistant | 2026-06-15T23:19:26.942Z

Now I need to handle the special cases: `HaversineDistanceAlgorithm` (first export was a const, not the class), `ABCClassificationFormula`, `BillOfMaterialsRollupFormula`, and check `index.ts` and `types.ts` (which are infrastructure files, not algorithm modules). Let me verify the Haversine file and confirm the naming convention for function-only files.

### Assistant | 2026-06-15T23:19:29.359Z

[tool_use: Bash]

### User | 2026-06-15T23:19:33.694Z

[tool_result] 32:export const EARTH_RADIUS_KM = 6371.0088;
34:export const EARTH_RADIUS_MI = 3958.7613;
36:export const KM_PER_MILE = 1.609344;
106:export function haversineDistance(a: GeoPoint, b: GeoPoint, unit: DistanceUnit = "km"): HaversineResult {
133:export function distanceKm(a: GeoPoint, b: GeoPoint): number {
140:export function distanceMi(a: GeoPoint, b: GeoPoint): number {
153:export const SAMPLE_ZI
... [+664 chars truncated]

### Assistant | 2026-06-15T23:19:39.872Z

Now I have all the data needed. Let me compile the final results, excluding `index.ts` and `types.ts` (infrastructure, not algorithm modules), and resolving the best export name for each file.

For `HaversineDistanceAlgorithm.ts`, the primary export is the function `haversineDistance` (the const exports are just numeric constants). For `JointSpeedFeedOptimizer.ts`, there is a named const `JointSpeedFeedOptimizer` at line 416. For `ChipVolumeRate.ts`, the class is `ChipVolumeRatePredictor`. For `STFTChatter.ts`, the class is `STFTChatterDetection`. For `WaveletBreakage.ts`, the class is `WaveletToolBreakage`.

### Assistant | 2026-06-15T23:20:15.824Z

[tool_use: StructuredOutput]

### User | 2026-06-15T23:20:16.394Z

[tool_result] Structured output provided successfully
