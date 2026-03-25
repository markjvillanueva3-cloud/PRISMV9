---
name: prism-oil-gas-machining
description: 'Oil and gas machining guide. Use when the user machines downhole components, valves, or fittings requiring NACE MR0175, API standards, or sour service compliance.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  tier: PASS2
  scrutiny_id: M106
  industry: oil-gas
---

# Oil & Gas Machining

## When to Use
- Machining components for sour service (NACE MR0175/ISO 15156)
- API 6A, 6D, or 5CT compliance for wellhead/valve/tubing
- Inconel 718/625, Monel, Duplex/Super Duplex stainless machining
- High-pressure seal surfaces and threaded connections

## How It Works
1. Verify material compliance per NACE MR0175 (hardness ≤ HRC 22 for carbon steel)
2. Configure machining to avoid surface hardening above NACE limits
3. Set parameters for corrosion-resistant alloy (CRA) machining
4. Validate thread form via `prism_calc→thread_check` (API connections)
5. Generate material test reports (MTR) per API requirements

## Returns
- NACE compliance verification (material + hardness + heat treat)
- CRA machining parameters (low cutting force to minimize work hardening)
- API thread inspection data (pitch diameter, lead, taper, standoff)
- Pressure test certification documentation

## Example
**Input:** "Machine API 6A flange in F22 (4130 mod), sour service, 10000 PSI WP"
**Output:** Material: AISI 4130 mod per NACE MR0175, max HRC 22 (verify post-machining). Ring groove: API 6A BX-156, finish 63 Ra max, no tool marks across seal. Bolt holes: +0.000/-0.8mm per API 6A. Machining: carbide, Vc=120m/min, light DOC to avoid work hardening. Post-machine: hardness survey (6 points on seal face). Hydro test: 15,000 PSI (1.5× WP) per API 6A. MTR: chemistry, mechanical, hardness, impact (Charpy -20°F).
