---
type: tribal-consolidation
topic: machining
iso_week: 2026-24
cluster_size: 34
cluster_size_synthesized: 10
aggregate_confidence: 89.5
tags: ["wire-edm", "material:P", "material:Steel", "jm-die", "operation:roughing", "operation:edm", "material:N", "material:brass"]
materials: ["N", "H", "P", "K"]
operations: ["wire_edm"]
_consolidatedAt: 2026-06-09T06:33:51.702Z
epistemic_only: true
consumed_by_machining: false
milestone: OBSIDIAN-COMPOUND-MS1/S6/U-TRIBAL-CONSOLIDATE
---
# Tribal: machining — 2026-24

_34 tips clustered on 'machining' with mean confidence 89.5/100. The vault is supposed to talk back; this is what it heard from the shop floor this week._

## Top Tips (10)

### 1. Makino SP43/SP64: 0.004" wire enables min inside radius of ~0.003" — use for intricate die profiles

- **id:** `wedm-sp-001` · **confidence:** 95/100 · **usage:** 0
- **source:** mastercam:makino_sp43_sp64_tech_file_mgw_s
- **tags:** wire-edm, makino, sp43, sp64, mgw-s, 0.004-wire

The Makino SP43 and SP64 use 0.004" (0.10mm) brass wire as the standard library wire — half the diameter of the 0.008" (0.20mm) wire used on most Makino DUO and Mitsubishi FA-10S machines. This enables a minimum programmed inside corner rad…

### 2. JM Die E12xx standard 4-pass sequence for punch profiles — E1221-E1222-E1223-E1224

- **id:** `jm-die-002` · **confidence:** 94/100 · **usage:** 0
- **source:** jm_die_production_analysis
- **tags:** wire-edm, jm-die, e12xx, 4-pass, e1221, e1222

For standard punch and die profiles in tool steel (D2, A2, S7) at 0.5-2.0" thickness, JM Die uses the E12xx standard 4-pass sequence: E1221 (rough, ~0.004" overcut), E1222 (first skim, ~0.002" stock), E1223 (second skim, ~0.0015" stock), E1…

### 3. JM Die ITW SHAKEPROOF pattern — standard 4-pass for fastener tooling

- **id:** `jm-die-017` · **confidence:** 94/100 · **usage:** 0
- **source:** jm_die_production_analysis:ITW_SHAKEPROOF
- **tags:** wire-edm, jm-die, itw-shakeproof, fastener, punch, 4-pass

ITW SHAKEPROOF is a high-volume JM Die customer producing fastener heading tooling. Standard program pattern: 4-pass E1221-E1224, H175 master offset at 0.0089", H1-H4 cascade (0.0085/0.0068/0.0059/0.0054), M90 adaptive on rough/first skim. …

### 4. Glue stop M01 between closed contours: JM Die slug control practice

- **id:** `wedm-jmd-004` · **confidence:** 94/100 · **usage:** 0
- **source:** jm_die_programs
- **tags:** wire-edm, m01, glue-stop, slug, closed-contour, workholding

When a program contains multiple closed contour cutouts (e.g., a die insert with two punch holes), JM Die inserts an M01 (Optional Stop / Glue Stop) block after the rough pass of each contour closes but BEFORE the skim passes begin. The typ…

### 5. Both Away Precision beats High Speed for die work: 2~2.5µm Ra in 5 passes on Makino DUO

- **id:** `wedm-mcam-004` · **confidence:** 94/100 · **usage:** 0
- **source:** mastercam:makino_duo_ver6_metric_tech_file
- **tags:** wire-edm, makino, duo, both-away-precision, high-speed, surface-finish

Makino DUO tech tables define six cutting methods per wire/material combo. For die and tooling work requiring Ra < 3µm: always choose Both Away Precision. This method approaches the final dimension from both sides (rough cut leaves +offset,…

### 6. JM Die D2 tool steel parameters — optimal for cold heading die cavities

- **id:** `jm-die-007` · **confidence:** 93/100 · **usage:** 0
- **source:** jm_die_production_analysis
- **tags:** wire-edm, jm-die, d2, tool-steel, cold-heading, die

D2 tool steel (1.55%C, 12%Cr, 0.85%Mo) is JM Die's primary material for cold heading die cavities. Wire EDM characteristics: high hardness at 58-62 HRC, excellent wear resistance, but tendency to micro-crack if heat-affected zone (HAZ) is e…

### 7. JM Die program optimization target — maximize productivity while maintaining Ra and tolerance

- **id:** `jm-die-020` · **confidence:** 93/100 · **usage:** 0
- **source:** jm_die_production_analysis
- **tags:** wire-edm, jm-die, optimization, productivity, feed-rate, ra

The ultimate goal of JM Die WEDM program optimization: maximize cutting area per hour (in²/hr) while achieving the specified Ra and tolerance. Optimization hierarchy: (1) Never sacrifice tolerance — ±0.0005" is sacred for die work. (2) Neve…

### 8. Mitsubishi FA-S ACU 7-pass: use only when Ra < 0.18µm (7 µin) is required

- **id:** `wedm-mcam-005` · **confidence:** 93/100 · **usage:** 0
- **source:** mastercam:mitsubishi_fa_s_tech_file_acu_method
- **tags:** wire-edm, mitsubishi, fa-s, acu, accuracy-priority, 7-pass

The Mastercam X8 Mitsubishi FA-S tech file defines an Accuracy Priority (ACU) 7-pass method for 0.010" brass wire on steel. This uses E-code families 952/5601-5607 (thin stock, 0.5") or 5611-5617 (1.00" thick). 7 passes achieves Ra 7 µin (0…

### 9. JM Die E12xx heavy 5-pass for thick stock and cannelure dies — E1281-E1282-E1283-E1284-E1285

- **id:** `jm-die-003` · **confidence:** 92/100 · **usage:** 0
- **source:** jm_die_production_analysis:FIOCCHI
- **tags:** wire-edm, jm-die, e12xx, 5-pass, e1281, e1282

For thicker tool steel (>2" up to 6") and cannelure (thread roll) dies that require superior surface finish, JM Die uses the E12xx heavy 5-pass sequence: E1281-E1285. The E128x family has higher power settings than E122x for roughing but ad…

### 10. JM Die tungsten carbide — zinc-coated wire mandatory, E952+E56xx ACU sequence

- **id:** `jm-die-012` · **confidence:** 92/100 · **usage:** 0
- **source:** jm_die_production_analysis
- **tags:** wire-edm, jm-die, tungsten-carbide, wc, wc-co, zinc-coated

Tungsten carbide (WC-Co, 6-15% cobalt) is used at JM Die for wear-critical die inserts and forming tools. Wire EDM of WC on the FA-20S requires: (1) zinc-coated brass wire (not plain brass) — the zinc coating prevents wire breakage in the h…

## Common Threads

Top tags across the cluster: `wire-edm`, `material:P`, `material:Steel`, `jm-die`, `operation:roughing`, `operation:edm`, `material:N`, `material:brass`.

## Sources Cited

- jm_die_production_analysis (4)
- mastercam:makino_sp43_sp64_tech_file_mgw_s (1)
- jm_die_production_analysis:ITW_SHAKEPROOF (1)
- jm_die_programs (1)
- mastercam:makino_duo_ver6_metric_tech_file (1)

## Citations

- [[wedm-sp-001]]
- [[jm-die-002]]
- [[jm-die-017]]
- [[wedm-jmd-004]]
- [[wedm-mcam-004]]
- [[jm-die-007]]
- [[jm-die-020]]
- [[wedm-mcam-005]]
- [[jm-die-003]]
- [[jm-die-012]]

