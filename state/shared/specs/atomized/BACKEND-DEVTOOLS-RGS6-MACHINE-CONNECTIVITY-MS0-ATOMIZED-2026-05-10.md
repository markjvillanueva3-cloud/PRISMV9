---
milestone: MACHINE-CONNECTIVITY-MS0
parent_roadmap: BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md
inherits_protocol: BACKEND-DEVTOOLS-RGS6-AUTONOMOUS-EXECUTION-PROTOCOL.md (§7 implicit)
assigned_lane: lane-F-misc-build
commit_prefix: "[lane-F-misc-build][MACHINE-CONNECTIVITY-MS0]"
total_units: 6
critical_path_role: machine-floor exposure (OPC-UA + MTConnect + MQTT); extends existing OpcUaConnectorEngine; closes the loop from shop-floor data → PRISM intelligence
loop_registrations: 1 (connector-health 10min)
date: 2026-05-10
---

# MACHINE-CONNECTIVITY-MS0 — atomized (6 units)

> Machine-floor connectivity. Three protocols: OPC-UA (PLC/HMI standard), MTConnect (CNC-specific), MQTT (IoT pub-sub). Extend the existing `OpcUaConnectorEngine` rather than re-implementing; build siblings for MTConnect + MQTT; one schema registry; one safety validator (every connector must declare which writes are allowed); one wiring unit. Lane-F continues here.

---

## U-OPCUA-CONNECTOR-EXTEND — Extend `OpcUaConnectorEngine` (NOT new-build per audit §4 reclassification)

- pillar: machine
- tier: T1
- ai_priority_score: 75
- leverage_score: 12
- why: `OpcUaConnectorEngine` exists with browse/subscribe/read; what's missing is write-back gate, subscription-group management, and reconnect-with-backoff for production runs >24h
- depends_on: []
- blocks: [U-CONNECTOR-SAFETY-VALIDATOR (needs all 3 connectors to validate), U-WIRE-MACHINE-CONNECTIVITY]
- parallel_with: [U-MTCONNECT-ADAPTER, U-MQTT-EVENT-BUS, U-MACHINE-SCHEMA-REGISTRY]
- viz_node_id: `core.engine.opcuaconnector` (existing — extend, do not re-create)
- closes_synergy_edge: OPC-UA × production-runtime

verifies_via:
  channel: test
  tool: `npx vitest run src/__tests__/OpcUaConnectorEngine.extend.test.ts`
  expected_signal: 5/5 cases pass — 24h soak with simulated reconnects holds subscription state without leaks
  re_run_cost: ~6s with simulator
  baseline: engine ships read-only with no production-runtime hardening

micro_steps:
  - step-1:
      tool: Read
      path: `mcp-server/src/engines/OpcUaConnectorEngine.ts`
      action: confirm current public methods + identify extension surface
      verify: methods captured
  - step-2:
      tool: Edit
      path: `mcp-server/src/engines/OpcUaConnectorEngine.ts`
      action: add `writeIfAllowed(nodeId, value)` (gates via U-CONNECTOR-SAFETY-VALIDATOR), `manageSubscriptionGroup(groupName, nodes)`, `reconnectWithBackoff()`
      verify: tsc clean
  - step-3:
      tool: Write
      path: `mcp-server/src/__tests__/OpcUaConnectorEngine.extend.test.ts`
      action: 5 cases (happy write, write-blocked-by-validator, subscription-group lifecycle, reconnect-after-disconnect, 24h soak via simulator)
      verify: 5/5 pass
  - step-4:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/machineDispatcher.ts` (or wherever opcua is wired)
      action: ensure `opcua_write_if_allowed` action exposed
      verify: round-trip MCP

adversarial_cases:
  - simulated endpoint disappears mid-subscription → reconnect-with-backoff (1s, 2s, 4s, 8s, 30s cap)
  - write attempted on read-only node → validator rejects with clear code
  - subscription group has duplicate nodes → de-dup, warn
  - clock skew between PLC and PRISM → record in telemetry, use server timestamps

variability_axis:
  - 0 / 100 / 10000 subscribed nodes
  - 1 / 5 / 50 subscription groups

failure_modes:
  - endpoint unreachable indefinitely → log `ENDPOINT_PERMANENTLY_DOWN` after 24h, surface alarm
  - subscription state corrupted → reset group, log `SUBSCRIPTION_RESET`
  - write race → validator file-claim on safe-write log

---

## U-MTCONNECT-ADAPTER — Build `MTConnectAdapterEngine`

- pillar: machine
- tier: T1
- ai_priority_score: 68
- leverage_score: 11
- why: MTConnect is the CNC-specific standard (XML-over-HTTP from CNC controller); OPC-UA is general; both must be available because not every machine speaks both
- depends_on: []
- blocks: [U-CONNECTOR-SAFETY-VALIDATOR, U-WIRE-MACHINE-CONNECTIVITY]
- parallel_with: [U-OPCUA-CONNECTOR-EXTEND, U-MQTT-EVENT-BUS, U-MACHINE-SCHEMA-REGISTRY]
- viz_node_id: `core.engine.mtconnectadapter` (TBD-create)
- closes_synergy_edge: MTConnect × CNC-data

verifies_via:
  channel: test
  tool: `npx vitest run src/__tests__/MTConnectAdapterEngine.test.ts`
  expected_signal: 5/5 cases pass; against simulator probes return parsed JSON-of-XML
  re_run_cost: 5s with simulator
  baseline: no MTConnect path; CNC controllers reachable only via OPC-UA where available

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/src/engines/MTConnectAdapterEngine.ts`
      action: implement `probe(agentUrl)` (GET /probe), `current(agentUrl)` (GET /current), `sample(agentUrl, from, count)`; XML→JSON via fast-xml-parser; emit normalized event stream
      verify: tsc clean
  - step-2:
      tool: Write
      path: `mcp-server/src/__tests__/MTConnectAdapterEngine.test.ts`
      action: 5 cases (happy probe, agent down, XML malformed, schema drift between versions 1.4/1.7/2.0, large sample paginated)
      verify: 5/5 pass against fixture XML
  - step-3:
      tool: Write
      path: `test-data/mtconnect/sample-probe.xml`
      action: minimal fixture from an MTConnect v1.7 reference
      verify: file readable
  - step-4:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/machineDispatcher.ts`
      action: register `mtconnect_probe`, `mtconnect_current`, `mtconnect_sample` actions
      verify: round-trip MCP

adversarial_cases:
  - HTTP 5xx from agent → exponential backoff
  - XML 100MB+ → stream-parse, never buffer-whole
  - schema v1.4 vs v2.0 element renames → version-detect at probe, dispatch parser
  - duplicate sequence numbers (rare bug) → de-dup by sequence
  - agent uses non-standard XML namespace → tolerate

variability_axis:
  - 1 / 10 / 1000 sample events per second
  - schema versions 1.4 / 1.7 / 2.0

failure_modes:
  - agent URL invalid → return `INVALID_AGENT_URL`
  - XML parser OOM → stream-parse caps in place
  - HTTP timeout → 5s default, configurable

---

## U-MQTT-EVENT-BUS — Build `MQTTEventBusEngine`

- pillar: machine
- tier: T1
- ai_priority_score: 65
- leverage_score: 10
- why: MQTT is the pub-sub fabric for IoT — sensors, custom-PLC bolt-ons, fleet telemetry; OPC-UA + MTConnect cover the standardized industrial side, MQTT covers the long tail
- depends_on: []
- blocks: [U-CONNECTOR-SAFETY-VALIDATOR, U-WIRE-MACHINE-CONNECTIVITY]
- parallel_with: [U-OPCUA-CONNECTOR-EXTEND, U-MTCONNECT-ADAPTER, U-MACHINE-SCHEMA-REGISTRY]
- viz_node_id: `core.engine.mqtteventbus` (TBD-create)
- closes_synergy_edge: MQTT × pub-sub

verifies_via:
  channel: test
  tool: `npx vitest run src/__tests__/MQTTEventBusEngine.test.ts`
  expected_signal: 5/5 cases pass against in-process broker fixture
  re_run_cost: 7s
  baseline: no MQTT path

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/src/engines/MQTTEventBusEngine.ts`
      action: implement `connect(brokerUrl, creds)`, `subscribe(topic, handler)`, `publishIfAllowed(topic, payload)` (gated by safety validator), `disconnect`; QoS 0/1/2 support
      verify: tsc clean
  - step-2:
      tool: Write
      path: `mcp-server/src/__tests__/MQTTEventBusEngine.test.ts`
      action: 5 cases (happy connect+subscribe+publish, broker down, malformed payload, topic-wildcard, QoS-2 redelivery)
      verify: 5/5 pass
  - step-3:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/machineDispatcher.ts`
      action: register `mqtt_subscribe`, `mqtt_publish_if_allowed`, `mqtt_status` actions
      verify: round-trip MCP

adversarial_cases:
  - broker connection drops mid-stream → auto-reconnect with backoff
  - high-volume topic (10k msg/s) → bounded handler queue + drop-policy (oldest)
  - payload exceeds 256MB MQTT spec ceiling → reject at publish
  - wildcard subscription matches more than expected → enforce subscriber-side filter

variability_axis:
  - 0 / 100 / 10000 msg/s
  - 1 / 10 / 1000 active subscriptions

failure_modes:
  - broker unreachable → log + retry, do not crash
  - handler throws → catch, log, continue (no broker disconnect)
  - publish blocked by validator → return clean envelope

---

## U-MACHINE-SCHEMA-REGISTRY — Build `MachineSchemaRegistryEngine`

- pillar: machine
- tier: T1
- ai_priority_score: 60
- leverage_score: 10
- why: every machine speaks slightly different data (different units, different node naming, vendor-specific extensions); a schema registry maps vendor → canonical, so downstream consumers always see canonical names + units
- depends_on: []
- blocks: [U-WIRE-MACHINE-CONNECTIVITY]
- parallel_with: [U-OPCUA-CONNECTOR-EXTEND, U-MTCONNECT-ADAPTER, U-MQTT-EVENT-BUS]
- viz_node_id: `core.engine.machineschemaregistry` (TBD-create)
- closes_synergy_edge: machine × canonical-data

verifies_via:
  channel: test
  tool: `npx vitest run src/__tests__/MachineSchemaRegistryEngine.test.ts`
  expected_signal: 5/5 cases pass; vendor-X event mapped to canonical schema with units converted
  re_run_cost: 4s
  baseline: each consumer parses raw vendor data — fragile + non-portable

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/data/registries/machine-schemas/canonical.json`
      action: define canonical event types: `Position`, `FeedRate`, `SpindleSpeed`, `ToolNumber`, `LoadAxis`, `Status`, `AlarmCode`
      verify: valid JSON
  - step-2:
      tool: Write
      path: `mcp-server/data/registries/machine-schemas/vendors/fanuc.json`
      action: example vendor mapping (Fanuc → canonical with unit conversions)
      verify: valid JSON
  - step-3:
      tool: Write
      path: `mcp-server/src/engines/MachineSchemaRegistryEngine.ts`
      action: implement `register(vendor, mapping)`, `normalize(vendor, event) → canonicalEvent`, `listVendors()`, `validate(vendor, event)`
      verify: tsc clean
  - step-4:
      tool: Write
      path: `mcp-server/src/__tests__/MachineSchemaRegistryEngine.test.ts`
      action: 5 cases (happy normalize, unit-conversion mm↔in, unknown vendor falls back to identity, malformed mapping rejected, extension fields preserved)
      verify: 5/5 pass
  - step-5:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/machineDispatcher.ts`
      action: register `machine_schema_register` + `machine_schema_normalize` actions
      verify: round-trip MCP

adversarial_cases:
  - circular mapping (A → B → A) → reject at registration
  - lossy unit conversion (precision drop) → emit warning in normalize
  - vendor adds new field not in canonical → preserve in `extensions` block
  - identical canonical name from two vendors → must reconcile or namespace

variability_axis:
  - 1 / 10 / 100 registered vendors
  - well-formed / lossy / extension-heavy mappings

failure_modes:
  - canonical schema missing → return `CANONICAL_SCHEMA_MISSING`, fail closed
  - mapping write race → file-claim
  - precision loss → flag in result, do not silently drop

---

## U-CONNECTOR-SAFETY-VALIDATOR — Build `ConnectorSafetyValidatorEngine`

- pillar: machine
- tier: T1
- ai_priority_score: 80
- leverage_score: 13
- why: writes to machine state can cause physical damage; the validator is the unconditional gate — every write (`opcua_write_if_allowed`, `mqtt_publish_if_allowed`) must pass an allow-list policy + range check + operator-confirmation if flagged unsafe
- depends_on: [U-OPCUA-CONNECTOR-EXTEND, U-MTCONNECT-ADAPTER, U-MQTT-EVENT-BUS]
- blocks: [U-WIRE-MACHINE-CONNECTIVITY]
- parallel_with: []
- viz_node_id: `core.engine.connectorsafetyvalidator` (TBD-create)
- closes_synergy_edge: machine-writes × safety-gate

verifies_via:
  channel: test
  tool: `npx vitest run src/__tests__/ConnectorSafetyValidatorEngine.test.ts`
  expected_signal: 5/5 cases pass; out-of-range write blocked; allow-list write permitted
  re_run_cost: 3s
  baseline: connectors write unconditionally — operator-in-the-loop unenforced

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/data/state/connector-safety-policy.json`
      action: define allow-list of writable nodes/topics per machine, range bounds per field, escalation policy (auto-approve / require-confirm / never)
      verify: valid JSON
  - step-2:
      tool: Write
      path: `mcp-server/src/engines/ConnectorSafetyValidatorEngine.ts`
      action: implement `validate({connectorKind, target, value, sessionContext})` → returns `{allowed: bool, reason, requiredConfirmation?}`
      verify: tsc clean
  - step-3:
      tool: Write
      path: `mcp-server/src/__tests__/ConnectorSafetyValidatorEngine.test.ts`
      action: 5 cases (happy allow-list, out-of-range deny, escalate-confirm, policy-missing, operator-confirmation-stale)
      verify: 5/5 pass
  - step-4:
      tool: Edit
      path: `mcp-server/src/engines/OpcUaConnectorEngine.ts`
      action: wire `writeIfAllowed` through validator
      verify: smoke shows blocked write rejected
  - step-5:
      tool: Edit
      path: `mcp-server/src/engines/MQTTEventBusEngine.ts`
      action: wire `publishIfAllowed` through validator
      verify: smoke shows blocked publish rejected
  - step-6:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/safetyDispatcher.ts`
      action: register `validate_machine_write` action
      verify: round-trip MCP

adversarial_cases:
  - policy file deleted at runtime → fail CLOSED (deny all writes) with `POLICY_MISSING_FAIL_CLOSED`
  - operator-confirmation token expired → re-prompt
  - bypass attempt (call engine method directly w/o validator) → defense in depth: connectors must invoke validator, but final-line safety is `prism_safety:validate_physics` separately
  - allow-list says "any" → require explicit policy bump, never default to wildcard

variability_axis:
  - 0 / 10 / 1000 allowed nodes per machine
  - tight / loose policy

failure_modes:
  - validator throws → fail CLOSED (deny)
  - policy schema drift → schema-validate at load, refuse start if invalid
  - confirmation queue overflow → cap queue, oldest dropped with audit

---

## U-WIRE-MACHINE-CONNECTIVITY — Wire 3 connectors + registry + validator into dispatchers

- pillar: machine
- tier: T1
- ai_priority_score: 60
- leverage_score: 10
- why: per CLAUDE.md engine-wiring law: every engine wires to all natural consumers. Machine connectivity touches `machineDispatcher` (data) + `safetyDispatcher` (validator) + `intelligenceDispatcher` (consumes normalized events)
- depends_on: [U-OPCUA-CONNECTOR-EXTEND, U-MTCONNECT-ADAPTER, U-MQTT-EVENT-BUS, U-MACHINE-SCHEMA-REGISTRY, U-CONNECTOR-SAFETY-VALIDATOR]
- blocks: []
- parallel_with: []
- viz_node_id: `wire.dispatcher.machine` (TBD-create)
- closes_synergy_edge: connectors × dispatchers

verifies_via:
  channel: e2e
  tool: round-trip MCP each of: `machine:opcua_browse`, `machine:mtconnect_current`, `machine:mqtt_subscribe`, `machine:schema_normalize`, `safety:validate_machine_write`
  expected_signal: each returns valid envelope; one end-to-end flow (OPC-UA read → schema normalize → consumer) demonstrates pipeline
  re_run_cost: 5s
  baseline: engines accessible only via direct import

micro_steps:
  - step-1:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/machineDispatcher.ts`
      action: ensure all 7 actions registered (opcua_browse, opcua_write_if_allowed, mtconnect_probe, mtconnect_current, mqtt_subscribe, mqtt_publish_if_allowed, schema_normalize); add `action` enum entries + schemas
      verify: dispatcher_map_compact shows all 7
  - step-2:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/safetyDispatcher.ts`
      action: register `validate_machine_write` already-built handler
      verify: dispatcher_map_compact shows action
  - step-3:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/intelligenceDispatcher.ts`
      action: register `consume_machine_event` (normalized event → intelligence pipeline)
      verify: round-trip MCP demonstrates pipeline
  - step-4:
      tool: Write
      path: `mcp-server/src/__tests__/machine-connectivity-wiring.e2e.test.ts`
      action: 3 cases (happy round-trip, validator blocks write, normalize-then-consume)
      verify: 3/3 pass

adversarial_cases:
  - dispatcher action enum collision → tsc catches
  - lazy import cycle → use established lazy-import pattern
  - schema declared in dispatcher diverges from engine signature → schema-validate at boundary

variability_axis:
  - 0 / 5 / 50 simultaneous machine sessions

failure_modes:
  - engine import throws → dispatcher reports `ENGINE_IMPORT_FAILED` cleanly
  - downstream consumer slow → dispatcher times out at 30s, surfaces partial result
  - validator declines → dispatcher returns clean refuse envelope

---

## Milestone-level autonomous-execution hooks (inherited from AUTONOMOUS-EXECUTION-PROTOCOL.md §7)

- pre-unit: `prism_session:claim_milestone MACHINE-CONNECTIVITY-MS0`
- per-unit-pre: `file-claim-guard` + `duplication-hard-block` (especially U-OPCUA-CONNECTOR-EXTEND — must extend, not rebuild)
- per-unit-post: `comprehensive-build-enforce` + `stop_on_unwired_assets` + `safety-physics` invoked (machine-touching code)
- per-3-units: auto-compact threshold check
- per-milestone-end: `/handoff` writes `HANDOFF-<id>-MACHINE-CONNECTIVITY-MS0.md`

## Variability-axis summary

zero-state / single-machine / fleet covered. Schema-versions 1.4/1.7/2.0 for MTConnect; QoS 0/1/2 for MQTT; allow-list scopes from tight to loose for validator. No happy-path-only verify.

## Failure-mode summary

Machine-domain failure modes are operator-safety-sensitive — defaults are different from the other milestones:
- Validator: **fail CLOSED** (deny on doubt) — opposite of token-budget guard (fail open)
- Connector: reconnect-with-backoff (do not crash on transient outage; do alarm on permanent)
- Schema registry: identity mapping if vendor unknown (better partial data than no data)
- Wiring: clean error envelopes; dispatcher never crashes on engine throw

## Lane ownership + commit format

- Lane: lane-F-misc-build
- Commit format: `[lane-F-misc-build][MACHINE-CONNECTIVITY-MS0]/<U-id>: <title>`
- Worktree (if forked): `H:/prism-machine-connectivity/` (branch `work/machine-connectivity-ms0`)
- Safety: `safety-physics` agent dispatched on every PR touching connectors or validator

## Next milestone in lane

lane-F terminates here; remaining work flows to lane-A foundation completion or lane-C cost work depending on chat capacity.
