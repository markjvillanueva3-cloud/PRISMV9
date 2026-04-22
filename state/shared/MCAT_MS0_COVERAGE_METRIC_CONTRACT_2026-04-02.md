# MCAT-MS0 Coverage Metric Contract

Date: 2026-04-02  
Parent milestone: `MCAT-MS0`  
Lane: `MCAT-MS0 / P1-U01 support`  
Derived from:

- [MCAT_MS0_VARIABILITY_CENSUS_2026-04-02.md](H:/PRISM/state/shared/MCAT_MS0_VARIABILITY_CENSUS_2026-04-02.md)
- [MCAT_MS0_LEGALITY_GRAPH_SPEC_2026-04-02.md](H:/PRISM/state/shared/MCAT_MS0_LEGALITY_GRAPH_SPEC_2026-04-02.md)

## Intent

Lock the exact coverage formulas, release floors, risk strata, and evidence rules that all later MCAT variability proof runs must use.

This contract exists so PRISM stops calling something "exhaustive" when it only means "we ran a lot of examples."

## Denominator Rule

All denominator claims must be sourced from one of:

1. enumerated legal values from the legality graph
2. enumerated legal tuples from the legality graph
3. explicit numeric boundary classes
4. explicit bundle classes
5. source-family discovery from the census

Hard rule:

- Cartesian products are upper bounds only
- denominators may not be derived from naive cross-product math once legality constraints exist

## Primary Metrics

### Value Coverage

`Cov_1(d) = tested_values(d) / legal_values(d)`

Applies to:

- machine packages
- controller packages
- spindle packages
- coolant ids
- machine feature ids
- holder families
- tool families
- CAM environments
- toolpath ids
- material states
- workholding families

### Pairwise Coverage

`Cov_2(d_i, d_j) = tested_pairs(i,j) / legal_pairs(i,j)`

Critical pair sets that must hit `1.0`:

- machine package x configuration bundle
- machine package x tooling layout topology
- machine package x holder bundle
- machine package x coolant set
- controller package x controller feature set
- spindle package x holder bundle
- holder bundle x tool bundle
- tool bundle x toolpath strategy
- material state x tool bundle
- material state x coolant set
- workholding bundle x machine partition
- overlay x canonical machine package

### Bundle Coverage

`Cov_bundle(d) = tested_bundle_classes(d) / legal_bundle_classes(d)`

Bundle-class domains:

- coolant subsets
- machine feature subsets
- controller feature subsets
- holder style subsets
- software-binding subsets
- workholding subsets

### Higher-Order Coverage

`Cov_t(stratum) = covered_legal_tuples(stratum) / enumerated_legal_tuples(stratum)`

Strength rules:

- baseline: `t = 3`
- high-risk: `t = 4`
- hotspot: `t = 5`

### Boundary Coverage

`Cov_b = tested_boundaries / defined_boundaries`

Numeric domains:

- spindle RPM
- magazine/turret station count
- tool diameter
- flute or insert count
- holder projection / gauge length
- DOC
- WOC
- feed
- SFM
- finish target

### Numeric Oracle Coverage

`Cov_num = within_tolerance_cases / oracle_scored_cases`

Oracle-scored cases must compare against:

- backend solve outputs where canonical
- explicit deterministic calculators where stable
- bounded expectation bands where neither exact source is currently available

### Metamorphic Invariant Pass Rate

`Met_pass = passed_invariants / executed_invariants`

Required invariants:

- disabling a controller feature may not unlock new toolpaths
- narrowing coolant capability may not widen legal coolant selection
- incompatible holder interface may not remain legal after spindle/turret change
- increasing tooling station capacity may expand fit but not machine identity
- fallback-to-live transitions may not invent unsupported options
- save/load roundtrip preserves canonical machine id and enabled subsets
- overlay bundle closure holds after persistence and reload

### Source Wiring Coverage

`Wire_cov_source = wired_source_families / discovered_source_families`

Wired means the source family is one of:

- calculator live
- backend live and explicitly scheduled for calculator parity
- downstream canonical consumer live

### Consumer Coverage

`Wire_cov_consumer = consumers_using_canonical_truth / target_consumers`

Target consumers in this tranche:

- calculator
- user machine profile
- Program Release
- Print to CNC

### Ambiguity Penalty

`Penalty = unresolved_legality_edges / total_legality_edges`

Penalty classes:

- merge conflict
- inferred widening
- fallback-only surface
- corpus gap
- stale metadata
- consumer drift

## Dashboard Score

`Q_cov = 0.15*Cov_1 + 0.20*Cov_2 + 0.10*Cov_bundle + 0.15*Cov_t + 0.10*Cov_b + 0.15*Cov_num + 0.10*Met_pass + 0.05*Wire_cov_source - Penalty`

Hard rule:

- `Q_cov` is a dashboard score, not the sole release gate

## Hard Release Floors

- `Cov_1 = 1.0`
- critical `Cov_2 = 1.0`
- critical `Cov_bundle = 1.0`
- hotspot `Cov_t >= 0.95`
- `Cov_num >= 0.97`
- `Met_pass = 1.0`
- `Wire_cov_source >= 0.95`
- `Wire_cov_consumer >= 0.90`
- `Penalty <= 0.02` on priority brands
- source-count reconciliation complete for machines, tools, holders, materials, workholding, and toolpaths

## Risk Strata

### t=3 Baseline

- machine x coolant x material
- machine x CAM environment x toolpath
- machine x holder x tool
- machine x workholding x stock shape

### t=4 High-Risk

- machine x spindle x holder x tool
- machine x controller feature bundle x CAM environment x toolpath
- machine x coolant bundle x material state x finish target
- lathe or swiss topology x live-tooling flag x holder interface x tool family
- overlay x machine package x controller package x coolant subset

### t=5 Hotspots

Priority hotspot quintuplets:

- Okuma / Haas / Mazak / Brother / Citizen / DN Solutions / DMG MORI families
- machine x spindle x holder x tool x toolpath
- machine x controller feature bundle x CAM environment x toolpath x material
- machine x coolant bundle x finish target x tool x material

## Evidence Schema

Every future proof run must emit:

- run id
- source-family version/census reference
- legality graph version reference
- metric contract version reference
- counts:
  - values
  - pairs
  - bundle classes
  - t-wise tuples
  - numeric cases
  - invariants
- failed tuples with legality reason
- ambiguity classes touched
- affected consumers
- artifact paths

## Current Gate Outcome

As of this contract:

- Session 1 is considered complete only if the census, legality graph, and this metric contract all exist together
- the current largest blocking gap is still tool-corpus recovery:
  intended `95,608` vs active `13,967` unique live ids
- workholding and backend toolpath registry remain explicit source-wiring deficits for calculator parity

## Immediate Next

1. start Session 2 with legality extractors from backend canonical registries
2. recover or reconcile missing tool-corpus roots before claiming exhaustive tool coverage
3. bind workholding and backend strategy registry surfaces into the calculator legality path
