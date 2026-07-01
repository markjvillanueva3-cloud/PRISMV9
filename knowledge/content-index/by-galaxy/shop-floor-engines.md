---
name: shop-floor-engines
description: Strategic engine digest for the shop-floor galaxy -- live machine status, adaptive feedback, OEE/downtime, MTConnect/OPC-UA ingest, and ERP feed. Doctrine-grounded (CLAUDE.md/PATHS.md/MEMORY.md + verified engine headers).
type: reference
galaxy: shop-floor
node_type: memory
---

# shop-floor galaxy -- engine digest

## Overview

The shop-floor galaxy owns the LIVE running-shop telemetry surface: real-time
machine status streaming, spindle-load / override-percent feedback, alarm intake
+ severity mapping, job-traveler tracking, job-cost-vs-actual rollups, per-machine
adaptive feedback loops, operator check-in, and OEE / downtime calculation
(per `engines/shop-floor/CLAUDE.md` sec 1). It is the telemetry-in / adaptive-out
half of PRISM -- it explicitly EXCLUDES prediction / pre-execution validation
(owned by mill / lathe / wedm), G-code generation (post-processor), payroll / HR
(business), and quote generation (quoting).

Engines live FLAT in `mcp-server/src/engines/*.ts` (there are no `.ts` files in the
`shop-floor/` subdir -- that dir is doctrine-only). This digest is a name-matched +
doctrine-refined view: machine-physics-only engines (spindle torque/harmonics/runout/
bearing-load, cutting-force models) that a keyword match surfaces are pruned as
mill/lathe/wedm property, and dev/model observability telemetry (`HookTelemetry`,
`ModelTelemetry`, `MultiAgentCostTelemetry`, LoRA-monitoring) is excluded -- this
galaxy is the physical shop's live floor, not the AI fleet's instrumentation.

Core data flow (CLAUDE.md sec 7):
`machine event (MTConnect / OPC-UA) -> machineLiveDispatcher (validate + normalize)
-> ShopStateEngine (mutate + emit ShopEvent) -> WebSocket room -> AdaptiveOverride /
AdaptiveSpindleControl feedback -> ShopOutcomeIngestProcessor -> LoRA + GNN ref pool`.

Dispatchers (CLAUDE.md sec 3): `prism_machine_live` (machineLiveDispatcher, 40 actions
per verified header -- MEMORY.md's 74 is stale), `prism_shop` (shopDispatcher),
`prism_shop_practice` (shopPracticeDispatcher), `prism_automation` (OEE / bottleneck /
shift-handoff). DB intake: **AlarmDB** (10,090 entries) + **MachineDB** (1,015).

## Strategic categories

1. **machine-connectivity-ingest** -- protocol adapters that pull raw live telemetry
   off CNC controllers: MTConnect (HTTP/XML, the dominant US standard) and OPC-UA
   (node-opcua, controller-family node-ID profiles). Read-only per sec 5 gotcha #5.
2. **live-status-projection** -- normalize raw telemetry into canonical machine state
   (execution mode, spindle, feed, position, alarms) for the dashboard + WebSocket bus.
3. **adaptive-feedback** -- closed-loop reaction to the live stream: override-percent,
   spindle SSV/chatter suppression, and the master real-time adaptive controller.
4. **anomaly-and-sensor-fusion** -- statistical anomaly detection + EKF multi-sensor
   fusion over the live cutting-state stream (drift / chatter / breakage / overload).
5. **oee-downtime-scheduling** -- OEE (A x P x Q) + six-big-losses, capacity-aware
   scheduling, and shop-layout/config as the machine-envelope source of truth.
6. **shop-state-and-job-tracking** -- the central `ShopStateEngine` mutator plus
   job / traveler / lifecycle / cost / report / check-in surfaces (single-writer bus).
7. **erp-feed** -- E2 Shop System connector + per-machine cost rollup + outcome ingest
   that pushes actuals to business/ERP and outcomes to the ai-training (india) loop.
8. **operator-hmi** -- operator-facing mobile + check-in + note-ingestion surfaces
   (must be Polish/Spanish-aware per sec 5 gotcha #7).

## Key engines (detailed)

### ShopStateEngine.ts
The single authoritative state mutator for the galaxy -- ALL job-lifecycle, traveler,
labor, and quality-approval changes MUST flow through it, or they bypass the WebSocket
event bus and create silent staleness across the whole dashboard (sec 5 gotcha #1).
Delegates persistence to a swappable `ShopRepository` port (in-memory / SQLite / Postgres
/ ERP) and emits typed `ShopEvent`s.
File: `mcp-server/src/engines/ShopStateEngine.ts`. Exports: `class ShopStateEngine`,
singleton `shopStateEngine`.

### MTConnectAdapterEngine.ts
HTTP/XML adapter for MTConnect-enabled controllers (Haas, Mazak, Okuma, Doosan). Six
capabilities: `probe()` device model, `current()` snapshot, `sample()` history range,
`assets()` tool-life counters, `monitor()` polling with alert thresholds, and
`parseAlarm()` classification. This is the primary US-standard live-telemetry ingress.
File: `mcp-server/src/engines/MTConnectAdapterEngine.ts`. Exports: `MTConnectConfig`,
`MTConnectDevice`, `MTConnectSnapshot`, `MTConnectDataItem`.

### MTConnectLiveStatusEngine.ts
Stream parser + live-status projector for the ASME MTC1.4 XML-over-HTTP feed (1-10 Hz).
Accepts already-parsed payloads and extracts canonical state -- execution mode
(active/interrupted/stopped/ready/feed_hold), controller mode, spindle/feed/position.
The projection layer that turns raw MTConnect into dashboard-ready status.
File: `mcp-server/src/engines/MTConnectLiveStatusEngine.ts`. Exports: `MTCExecution`,
`MTCControllerMode`, `MTConnectLiveStatus`, singleton `mtConnectLiveStatusEngine`.

### OpcUaConnectorEngine.ts
Live CNC connectivity via OPC-UA (wraps node-opcua): auto-reconnect + heartbeat, single/
batch reads, subscriptions with monitored items, address-space browsing, and controller-
family node-ID profiles (Fanuc, Siemens, Heidenhain, Haas, Mazak, Okuma) plus alarm-
monitoring subscriptions. The second live-ingress protocol alongside MTConnect.
File: `mcp-server/src/engines/OpcUaConnectorEngine.ts`. Exports: `SecurityMode`,
`OpcUaConnectParams`, `OpcUaReadParams`, `OpcUaReadResult`.

### RealTimeMachineIntelligenceEngine.ts
Unified real-time intelligence that correlates the LIVE sensor stream with PRISM physics
models: spindle-load vs Kienzle prediction, FFT chatter detection with auto feed
reduction, thermal-drift compensation via CTE, Taylor-based tool-life countdown, and
time-series trend storage. Consumes MTConnect/MQTT/OPC-UA (the live-side counterpart to
the pre-execution mill/lathe physics engines).
File: `mcp-server/src/engines/RealTimeMachineIntelligenceEngine.ts`. Exports:
`class RealTimeMachineIntelligenceEngine`, singleton `realTimeMachineIntelligenceEngine`.

### RealTimeAdaptiveControllerEngine.ts
The master adaptive-control orchestrator (Phase 0.26): continuously monitors all sensor
inputs, predicts upcoming conditions via lookahead, computes optimal parameter
adjustments, emits control signals to machine/operator, and learns from outcomes. Sits
above the per-axis adaptive engines as the central decision-maker.
File: `mcp-server/src/engines/RealTimeAdaptiveControllerEngine.ts`. Exports:
`SensorInputs`, `ControlOutput`, `ControlState`, singleton `realTimeAdaptiveControllerEngine`.

### AdaptiveSpindleControlEngine.ts
Closed-loop spindle-speed adaptation for chatter suppression on the live stream: stability-
lobe mapping, FFT chatter detection, and Sinusoidal Spindle Speed Variation (SSV, Al-Regib
2003) to disrupt regenerative chatter. Cites Altintas "Manufacturing Automation" Ch.3-4.
Live-feedback member (distinct from static mill/lathe physics).
File: `mcp-server/src/engines/AdaptiveSpindleControlEngine.ts`. Exports: `SpindleAdaptInput`,
`SpindleAdaptResult`, singleton `adaptiveSpindleControlEngine`.

### AdaptiveOverrideEngine.ts
Override-percent feedback loop (CLAUDE.md sec 1) -- computes live feed/spindle override
adjustments from the running signal, the lightest-weight adaptive actuator on the floor.
File: `mcp-server/src/engines/AdaptiveOverrideEngine.ts`.

### SensorFusionEngine.ts
Multi-sensor data fusion via Extended Kalman Filter for unified cutting-state estimation.
State vector [Fc, dFc/dt, temperature, deflection, wear_state] fused from force
dynamometer, spindle load/power, vibration accel, and thermocouple, with chi-squared
gating and sensor-dropout handling. Turns noisy multi-sensor live input into one estimate.
File: `mcp-server/src/engines/SensorFusionEngine.ts`. Exports: `SensorFusionInput`,
`SensorFusionResult`, singleton `sensorFusionEngine`.

### RealTimeAnomalyDetectionEngine.ts
Real-time cutting-anomaly detection over the live stream via 5 statistical methods
(CUSUM, EWMA, Mahalanobis, FFT, Wavelet) with self-contained Cooley-Tukey FFT + Haar
wavelet. Classifies drift / chatter / breakage / overload / outlier events.
File: `mcp-server/src/engines/RealTimeAnomalyDetectionEngine.ts`. Exports: `DetectionMethod`,
`AnomalyType`, `AnomalyEvent`, `AnomalyDetectionResult`.

### OEECalculatorEngine.ts
Overall Equipment Effectiveness -- OEE = Availability x Performance x Quality, modeling
planned vs unplanned downtime, speed losses, quality losses, and six-big-losses per TPM.
Actions `oee_calc / oee_trend / oee_losses` (surfaced via `prism_automation`). The
canonical downtime/productivity KPI engine.
File: `mcp-server/src/engines/OEECalculatorEngine.ts`. Exports: `OEEInput`, `OEEResult`,
`OEELoss`, singleton `oeeCalculatorEngine`.

### ShopSchedulerEngine.ts
Canonical scheduling engine (consolidates the old ShopScheduler + JobShopSchedulingEngine,
U-CONSOL2): capability-aware multi-machine dispatch with OR algorithms -- LPT (min-
makespan), EDD (min-tardiness), even-spread (max-utilization), or balanced; plus Johnson's
2-machine flow shop and CPM. The capacity/downtime-aware planning brain. Largest engine
in the galaxy (~1258 lines).
File: `mcp-server/src/engines/ShopSchedulerEngine.ts`. Exports: `ShopScheduleInput`,
`OptimizeFor`, `Assignment`, `JobInput`, `MachineInput`.

### ShopConfigurationEngine.ts
Centralized shop-rate + machine-configuration source of truth (21 machines for JM Die) --
replaces hardcoded rates across all costing/quoting engines with one configurable profile.
Per sec 6, this is the canonical machine-count source; NEVER infer machine count from code.
Consumed by ERP/costing/scheduling engines.
File: `mcp-server/src/engines/ShopConfigurationEngine.ts`. Exports: `ShopRates`,
`ShopMachine`, `ShopCompanyProfile`, `ShopMachineControllerRegistryEntry`.

### E2ShopConnectorEngine.ts
Bidirectional REST connector to E2 Shop System (a common small/mid CNC-shop ERP): import
work orders (single/batch), export PRISM-optimized routing back, sync tool-crib inventory,
pull time-tracking + job status. The concrete ERP-feed edge to the business galaxy.
File: `mcp-server/src/engines/E2ShopConnectorEngine.ts`. Exports: `E2Config`, `E2WorkOrder`,
`E2RoutingStep`, `PRISMWorkOrder`.

### ShopOutcomeIngestProcessorEngine.ts
The outcome -> loop-automation bridge that makes self-improvement OPERATIONAL: reads a JSONL
stream of shop outcomes, hands each to `PSNSelfImprovingLoopEngine.ingest()`, and writes
`LoopIngestResult`s to a durable sink ledger -- feeding LoRA training + the GNN reference
pool (ai-training / india). Without it, outcomes never flow into the learning loop.
File: `mcp-server/src/engines/ShopOutcomeIngestProcessorEngine.ts`. Exports:
`parseLedgerLine`, `buildIngestInputFromLedger`, `OutcomeLedgerRecord`.

## Full engine index

| Engine | Category | One-line |
|---|---|---|
| ShopStateEngine.ts | shop-state-and-job-tracking | Central + only state mutator; emits ShopEvents to the WebSocket bus. |
| ShopFloorDashboardEngine.ts | live-status-projection | Real-time shop-floor status dashboard (name-derived). |
| ShopFloorJobEngine.ts | shop-state-and-job-tracking | Job tracking + work-order management (name-derived). |
| ShopFloorCostEngine.ts | erp-feed | Job-cost vs actual rollups; completion-guarded (name-derived). |
| ShopFloorReportEngine.ts | oee-downtime-scheduling | Production reports + analytics (name-derived). |
| ShopFloorScheduleEngine.ts | oee-downtime-scheduling | Production scheduling + capacity (name-derived). |
| ShopFloorCheckInEngine.ts | operator-hmi | Operator check-in surface (name-derived). |
| ShopFloorLayoutEngine.ts | oee-downtime-scheduling | Shop-floor layout management (name-derived). |
| ShopFloorNoteIngestionEngine.ts | operator-hmi | Operator notes -> tribal knowledge (name-derived). |
| ShopDataCompletenessEngine.ts | shop-state-and-job-tracking | Shop-data completeness + gap analysis (name-derived). |
| ShopConfigurationEngine.ts | oee-downtime-scheduling | Centralized shop-rate + 21-machine config source of truth. |
| ShopMachineOverlayEngine.ts | oee-downtime-scheduling | User/shop machine-profile overlays on canonical machine packages. |
| ShopSchedulerEngine.ts | oee-downtime-scheduling | Canonical capacity-aware scheduler (LPT/EDD/util/Johnson/CPM). |
| JobTravelerEngine.ts | shop-state-and-job-tracking | Job-traveler tracking (NOT `TravelerEngine`, which does not exist). |
| JobLifecycleEngine.ts | shop-state-and-job-tracking | Job lifecycle state machine (name-derived). |
| TravelerGenerationOrchestratorEngine.ts | shop-state-and-job-tracking | Orchestrates traveler generation (name-derived). |
| MTConnectAdapterEngine.ts | machine-connectivity-ingest | HTTP/XML MTConnect adapter (probe/current/sample/assets/monitor). |
| MTConnectLiveStatusEngine.ts | live-status-projection | MTConnect XML stream parser + canonical live-status projector. |
| MTConnectToOutcomeBridgeEngine.ts | erp-feed | Bridges MTConnect telemetry into the outcome/learning stream (name-derived). |
| OpcUaConnectorEngine.ts | machine-connectivity-ingest | Live OPC-UA connectivity with controller-family node-ID profiles. |
| RealTimeMachineIntelligenceEngine.ts | live-status-projection | Live sensor stream correlated with Kienzle/Taylor/stability physics. |
| RealTimeAdaptiveControllerEngine.ts | adaptive-feedback | Master adaptive-control orchestrator (monitor->predict->adjust->learn). |
| AdaptiveSpindleControlEngine.ts | adaptive-feedback | Closed-loop spindle SSV / chatter suppression on the live stream. |
| AdaptiveOverrideEngine.ts | adaptive-feedback | Override-percent feedback loop (feed/spindle live adjust). |
| SensorFusionEngine.ts | anomaly-and-sensor-fusion | EKF fusion of force/power/vibration/thermocouple into cutting-state. |
| RealTimeAnomalyDetectionEngine.ts | anomaly-and-sensor-fusion | CUSUM/EWMA/Mahalanobis/FFT/Wavelet live-anomaly detection. |
| RealTimeOptimizationEngine.ts | adaptive-feedback | Real-time parameter optimization over the live stream (name-derived). |
| RealtimeEventBridge.ts | live-status-projection | Real-time event bridge to the WebSocket/event bus (name-derived). |
| SensorDataSchemaEngine.ts | anomaly-and-sensor-fusion | Sensor-data schema/validation for live ingress (name-derived). |
| SpindleLoadMonitorEngine.ts | live-status-projection | Live spindle-load monitoring (name-derived; live-monitor, not physics). |
| OEECalculatorEngine.ts | oee-downtime-scheduling | OEE = A x P x Q, six-big-losses, downtime categorization. |
| E2ShopConnectorEngine.ts | erp-feed | Bidirectional E2 Shop System ERP REST connector. |
| EmployeePerMachineSFAdaptiveEngine.ts | erp-feed | Per-machine cost/adaptive rollup (cross-galaxy with business/HR). |
| EmployeeShopFloorMobileEngine.ts | operator-hmi | Operator-facing mobile shop-floor surface (PL/ES-aware). |
| ShopOutcomeIngestProcessorEngine.ts | erp-feed | Outcome JSONL -> self-improving loop -> LoRA + GNN ref pool. |
| AIAutoUtilizationEngine.ts | oee-downtime-scheduling | Auto-utilization computation for machine/asset use (name-derived). |

## Uncertain / pruned (honest notes)

- **Pruned as machine-PHYSICS (mill/lathe/wedm property, NOT this galaxy):**
  Spindle{TorqueCurve, Harmonics, Runout, BearingLoad, Warmup, PowerCheck, Protection,
  SpeedVariation, TorqueGate}, PP{SpindleSpeedSafety, SpindleStateValidator,
  OkumaSubSpindleSync}, LatheSubSpindleTransferPurge, MultiSpindleAutomatic,
  SubSpindleHandoffVerifier -- pre-execution / post-processor cutting physics per sec 1 EXCLUDES.
- **Pruned as AI-fleet / dev observability (NOT physical shop floor):** HookTelemetry,
  ModelTelemetry, MultiAgentCostTelemetry, PostProcessorTelemetry, OpenTelemetryTracing,
  ZeroTrustTelemetry, {Lathe,Mill}LoRA*Monitor, CAMMLDriftMonitor, EngineUtilizationAuditor,
  SystemUtilizationAudit, MemoryPressureMonitor, ReputableSourceMonitor,
  VendorRealtimePricingClient, EmergentBehaviorMonitor -- fleet/model instrumentation.
- **Borderline INCLUDED (live-stream consumers, not static physics):** SensorFusionEngine,
  AdaptiveSpindleControlEngine, RealTimeAnomalyDetectionEngine, RealTimeMachineIntelligence
  -- these operate ON the live floor stream and are cited in sec 1/sec 7 adaptive-feedback flow.
- `AIAutoUtilizationEngine` / `SpindleLoadMonitorEngine` classification is name-derived
  (header not read this pass) -- utilization/live-monitor placement is the best fit but unverified.
- **TelemetryEngine.ts** (generic) excluded -- header not read; likely fleet-generic, not
  shop-floor-specific. Verify before citing as a shop-floor member.
- Action-count caveat (CLAUDE.md sec 12): `prism_machine_live` = 40 actions (verified header),
  NOT the 74 cited in MEMORY.md; do not quote the stale number.
