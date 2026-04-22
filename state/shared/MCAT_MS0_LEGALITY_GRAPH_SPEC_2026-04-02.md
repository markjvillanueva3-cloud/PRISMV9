# MCAT-MS0 Legality Graph Spec

Date: 2026-04-02  
Parent milestone: `MCAT-MS0`  
Lane: `MCAT-MS0 / P1-U01 support`  
Predecessor artifact: [MCAT_MS0_VARIABILITY_CENSUS_2026-04-02.md](H:/PRISM/state/shared/MCAT_MS0_VARIABILITY_CENSUS_2026-04-02.md)

## Intent

Turn the machine-catalog census into an explicit legality graph so the calculator, user machine profiles, Program Release, and later Print to CNC all reason over the same compatibility model instead of parallel heuristics.

This graph defines:

- the canonical dimensions of a legal calculator state
- which domains are scalar vs bundle/set-valued
- which edges are source-backed vs inferred vs unresolved
- how user overlays may refine machine truth without inventing impossible options
- what must be rejected as illegal even if the UI could technically render it

## Canonical Precedence

Every machine-aware consumer must resolve truth in this order:

1. backend merged machine package
2. backend machine configuration bundle
3. backend material/tool/holder/workholding/toolpath legality surfaces
4. user machine profile overlay
5. frontend fallback surfaces
6. explicit ambiguity or unavailable state

Hard rule:

- fallback data may keep the UI usable
- fallback data may not silently expand legality

## Graph Partitions

The graph is partitioned first by canonical machine package and machine topology:

- `mill`
- `lathe`
- `swiss`
- `mill_turn`
- `vtl`
- `wire_edm`
- `sinker_edm`
- `laser`
- `waterjet`

No legality edge may cross those partitions unless the edge is explicitly declared as a bridge.

Bridges allowed today:

- `mill_turn` may consume both turning and live-milling tool families
- `swiss` inherits turning legality plus gang/live-tooling constraints
- `vtl` inherits turning legality but must not inherit swiss or mill-turn live-tooling assumptions

Bridges not allowed:

- `mill` may not inherit turret-only holders
- `lathe` may not inherit CAT/BT/HSK-A spindle holders unless a live-milling head or driven-tool package explicitly exposes that interface
- `wire_edm`, `sinker_edm`, `laser`, and `waterjet` may not inherit spindle-holder or insert-tool legality

## Canonical Nodes

### 1. Machine Package

Primary identity node.

Minimum fields:

- `canonicalMachineId`
- `packageId`
- `manufacturerId` / `manufacturerLabel`
- `modelLabel`
- `mode`
- `familyId` / `familyLabel`
- `machineTypeId` / `machineTypeLabel`
- `axisClass`
- `orientation`
- `toolingLayout`
- `packageProvenance`

### 2. Machine Configuration Bundle

A legal machine package is not a flat record. It owns one or more configuration bundles:

- controller options
- spindle options
- coolant option ids
- controller capability options
- source record ids
- confidence

The configuration bundle is the first true legality boundary.

### 3. Controller Package

Represents the chosen controller plus the capability subset exposed by that controller package.

Scalar:

- `controllerId`
- `controllerLabel`

Set-valued:

- `enabledControllerFeatureIds`

### 4. Spindle Package

Represents the chosen spindle/process package.

Scalar:

- `spindlePackageId`
- `maxRpm`
- `interfaceId`
- `taper`
- `power/torque` when known

### 5. Coolant Set

Always modeled as a subset, never a scalar label.

Examples:

- `["flood"]`
- `["flood", "tsc"]`
- `["flood", "through_air", "air_blast"]`
- `["dielectric"]`

Hard rule:

- changing coolant capability may narrow legality
- it may never unlock strategies or tools that require a missing coolant mode

### 6. Machine Capability Bundle

Machine feature toggles that are not purely controller features:

- probing
- pallet systems
- 5-axis package
- high-speed mode
- CAS / collision avoidance
- sub-spindle
- live tooling
- milling head
- second turret

These are set-valued and must survive roundtrip persistence without closure errors.

### 7. Tooling Layout Topology

Primary topology node derived from the machine package:

- `kind`
- `stations`
- `stationOptions`
- `allowCustomStations`
- `interfaceId`
- `spindleConnectionTypeId`
- `turretTypeId`
- `turretCount`
- `hasSubSpindle`
- `hasMillingHead`
- `liveTooling`

This node gates holder legality and multiple downstream UI decisions.

### 8. Holder Bundle

A legal holder bundle is not just a style chip. It includes:

- holder catalog record id
- holder style ids
- holder type / subcategory
- spindle or turret interface compatibility
- layout-kind compatibility
- live-tooling requirement
- milling-head requirement
- turret-count requirement
- tool-interface compatibility

### 9. Tool Bundle

The canonical tool bundle includes:

- tool catalog record id
- mode
- tool family
- operation class
- supported operations
- geometry class
- holder interface or arbor expectation
- insert geometry / edge prep / coating / substrate when available

### 10. CAM Environment

Represents the software family or programming environment.

Fields:

- `environmentId`
- `mode`
- `kind`
- `vendor`
- `licensedToolpaths`

### 11. Toolpath Strategy

Represents the exact strategy family or operation mapping.

Fields:

- `toolpathId`
- `operationId`
- `mode`
- `path family`
- backend canonical registry id when available

### 12. Material State

Material is not a label-only domain. It must include:

- group
- subcategory
- grade or resolved name
- condition or hardness state when available
- provenance

### 13. Fixture / Workholding Bundle

This domain remains under-wired today, but the graph still defines it as:

- fixture family
- clamping posture
- stock shape compatibility
- machine mode compatibility
- optional station or chuck/collet diameter constraints

### 14. User Overlay

The overlay refines machine truth for one user/workspace/shop.

It may include:

- selected controller
- enabled controller features
- selected spindle package
- enabled coolant strategy ids
- tooling station override
- measured performance
- enabled workholding ids
- enabled software bindings
- notes / tags / audit metadata

Hard rule:

- overlay may narrow or evidence-enable
- overlay may not create unsupported combinations without provenance and ambiguity tracking

## Set-Valued Domains

These domains must be modeled as bundles or subsets, not flattened labels:

- `enabledControllerFeatureIds`
- `enabledMachineFeatureIds`
- `enabledCoolantStrategyIds`
- `holderStyleIds`
- `compatibleLayoutKinds`
- `compatibleSpindleConnectionTypeIds`
- `compatibleTurretTypeIds`
- `supportedOperations`
- `licensedToolpaths`
- `enabledWorkholdingIds`
- `enabledSoftwareBindings`

## Core Edge Rules

### Machine -> Configuration Bundle

- each machine package owns one or more configuration bundles
- the UI may only resolve controllers, spindles, coolant ids, and controller features through those bundles

### Configuration Bundle -> Controller Package

- selected controller must be one of the configuration bundle controller options
- enabled controller features must be a subset of the selected controller package features

### Configuration Bundle -> Spindle Package

- selected spindle must be one of the configuration bundle spindle options
- spindle interface must match the machine tooling layout or an explicit driven-tool / milling-head bridge

### Configuration Bundle -> Coolant Set

- enabled coolant ids must be a subset of the selected configuration coolant ids
- user overlay may disable a published coolant option
- user overlay may only add coolant capability when source is `shop_audit` or `dealer_spec` and confidence is carried

### Machine Topology -> Holder Bundle

- `mill` with `magazine` layout accepts spindle-interface holders only
- `lathe` with `turret` layout accepts turret-interface holders only
- `swiss` with `gang` layout accepts gang or swiss-compatible live-tool holders only
- `mill_turn` accepts turret holders and milling-head holders, but only when the machine topology exposes the relevant package
- `wire_edm`, `sinker_edm`, `laser`, `waterjet` do not accept spindle-holder legality

### Holder Bundle -> Tool Bundle

- holder bundle must satisfy the tool’s interface or style expectation
- face mills require arbor/shell-mill style holders
- drills/taps/reamers may use ER/hydraulic/tapping holders depending on mode and topology
- boring bars require boring-compatible holders
- turning inserts require turning holders, not spindle holders
- live-milling on turning platforms requires driven-tool or milling-head compatible holders

### Machine Topology -> Tool Bundle

- tool mode must match machine partition except declared bridges
- mill-turn and swiss are bridges with narrower legality than generic mill or lathe
- tool bundle cannot ignore live-tooling, milling-head, or sub-spindle topology

### CAM Environment -> Toolpath Strategy

- toolpath must belong to the selected CAM environment or be mapped to a backend canonical strategy family
- selecting a controller feature off must never unlock a toolpath that depends on it
- static calculator toolpaths are consumer surfaces only until bound to the backend registry

### Toolpath Strategy -> Tool Bundle

- selected tool must support the exact operation family
- finishing paths must not silently hold onto roughing tools through UI race conditions
- turning, grooving, threading, and live-milling are distinct tool legality families

### Material State -> Tool / Toolpath / Coolant / Finish

- material family and state narrow legal tool families, coatings, and coolant expectations
- material selection may alter finish predictions and legal recommendation surfaces
- material fallback may not widen legality relative to live material detail

### Fixture Bundle -> Machine / Toolpath

- fixture compatibility must respect machine mode, stock shape, and operation family
- fallback workholding may display guidance, but not assert unsupported clamping legality as canonical truth

### User Overlay -> Canonical Package

- overlays may narrow, annotate, or evidence-enable
- overlays must preserve canonical identity
- save/load roundtrip must preserve enabled subsets and tooling station overrides
- overlay data without source/confidence must not be promoted to canonical legality

## Mode Profiles

### Mill

Allowed tooling layouts:

- `magazine`

Typical interface families:

- `cat40`
- `cat40-big-plus`
- `cat50`
- `bt40`
- `bt50`
- `hsk-a63`
- `hsk-a100`
- `sk40`
- `sk50`
- `r8`

### Lathe

Allowed tooling layouts:

- `turret`

Typical interface families:

- `vdi20/25/30/40/50/60`
- `bmt45/55/65/75`
- `capto-c3/c4/c5/c6/c8`
- `psc32/40/50/63/80`
- `hsk-t63/t80/t100`

### Swiss

Allowed tooling layouts:

- `gang`

Required additional constraints:

- guide-bushing or swiss-support posture where relevant
- live tooling is optional, not assumed

### Mill-Turn

Allowed tooling layouts:

- `turret`
- `milling_head` bridge via `hasMillingHead`

Required additional constraints:

- live tooling or milling head must be explicit
- multiple turrets must be modeled numerically, not inferred from family labels

### Wire EDM / Sinker EDM / Laser / Waterjet

These modes do not participate in spindle-holder legality.

They have their own nodes:

- dielectric or process-fluid bundles
- wire/electrode/process-head bundles
- non-spindle fixture families

## Ambiguity Classes

- `stale_metadata`
  header or summary count disagrees with live corpus
- `merge_conflict`
  multiple source rows imply incompatible controller/spindle/coolant packages
- `inferred_option`
  option exists only by inference, not a published or audited source
- `fallback_surface`
  consumer is usable only because the frontend fallback catalog exists
- `corpus_gap`
  intended corpus is known to be larger than the active live load root
- `consumer_drift`
  downstream consumer carries parallel logic that does not match canonical legality
- `numeric_unbounded`
  tooling station or measured performance override lacks legal bounds

## Confidence Tiers

- `published`
  directly source-backed and preferred
- `merged`
  combined from multiple compatible source rows
- `shop_audit`
  evidence-backed local truth from the shop floor
- `dealer_spec`
  source-backed vendor/dealer option not yet merged into canonical row
- `inferred`
  heuristic and must never silently widen legality
- `fallback`
  UI continuity only, never canonical by itself

## Negative Controls

These must always fail:

- CAT/BT/HSK-A spindle holder on a plain turret lathe without a milling-head bridge
- BMT/VDI/CAPTO turret holder on a plain mill magazine machine
- controller feature selection outside the selected controller package
- coolant selection not present in the active machine configuration
- tooling station override outside allowed station options when custom stations are disabled
- saving a machine profile that mixes controller/spindle packages from incompatible configurations
- fallback workholding or CAM/toolpath data silently becoming canonical truth

## Consumer Enforcement

### Calculator

- may render fallback surfaces
- may not convert fallback-only data into canonical legality
- must remain package-driven for controller, spindle, coolant, holder, and tool compatibility

### UserMachineProfile

- is the canonical overlay persistence surface
- must validate all selected subsets against canonical machine truth

### Program Release

- may consume machine identity, family, controller, and spindle truth from the canonical machine graph
- must not maintain a divergent machine selector contract

### Print to CNC

- target downstream consumer
- must bind to the same machine package and overlay surfaces before shipping machine-aware automation

## Immediate Next

1. `U-MVAR03`: publish the metric and risk contract using this graph as the denominator source
2. recover unwired workholding and backend toolpath registry edges before claiming exhaustive calculator legality
3. lift holder-catalog legality beyond `TOOLHOLDERS.json` so indexable milling toolholding and expanded turning holders stop living as backend-only edges
