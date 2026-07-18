---
title: "WEDM wire-material catalog + cutting-parameter envelope (research extraction 2026-05-26)"
date: 2026-05-26
slot: mike
type: lesson
domain: wedm
sources:
  - bedra.com / Berkenhoff GmbH catalog (Bercocut, Cobracut, Megacut, Broncocut, AC Cut, Microcut SF)
  - sstconsumables.com — distributor specs
  - lemhunter.com — EDM Brass Wire Guide 2026
  - dmncedm.com — Discharging Conditions, Parameters Explanation of CNC EDM Machine (PDF)
  - practicalmachinist.com thread 247750 — Wire EDM Power Settings
  - irjet.net V5I12245 — Wire-EDM Cutting Parameters (Taguchi DOE)
  - directindustry.com — Berkenhoff MICROCUT SF listing
related:
  - "[[tip-wedm-research-011]]"
  - "[[tip-wedm-research-012]]"
  - "[[tip-wedm-research-013]]"
  - "[[tip-wedm-research-014]]"
  - "[[tip-wedm-research-015]]"
  - "[[tip-wedm-research-016]]"
  - "[[domain-wedm]]"
  - "[[tip-wedm-research-006]]"
---

# WEDM wire-material catalog + cutting-parameter envelope

Extracted from open-internet research on 2026-05-26 (slot mike, per user
directive "do deep research online for resources on wire edm functions,
parameters, know how, material specs for wire"). Six new tribal tips
([[tip-wedm-research-011]] through [[tip-wedm-research-016]]) ship the
detail; this entry is the index + decision tables.

## Wire material catalog (Bedra / Berkenhoff)

| Product line     | Core     | Coating          | Tensile (N/mm²) | Conductivity | Best for                                    | Tip                              |
|------------------|----------|------------------|-----------------|--------------|---------------------------------------------|----------------------------------|
| Bercocut (plain) | CuZn37   | none             | 400 – 900       | ~30% IACS    | general / extreme taper / threading tradeoff| [[tip-wedm-research-011]]        |
| Cobracut         | CuZn36   | treated pure Zn  | 500             | ~22% IACS    | precision + finish on steel                 | [[tip-wedm-research-012]]        |
| Cobracut Type G  | CuZn36   | hard pure Zn     | 900             | ~22% IACS    | roughing + AWT reliability                  | [[tip-wedm-research-012]]        |
| Megacut T        | CuZn36   | treated pure Zn  | 500             | ~22% IACS    | precision + finish on steel                 | [[tip-wedm-research-012]]        |
| Broncocut X      | Cu       | CuZn50           | 520             | ~22% IACS    | Charmilles SWX                              | [[tip-wedm-research-012]]        |
| AC Cut G         | CuZn36   | Zn treated       | 900             | 22% IACS     | AgieCharmilles IPG (+20% speed)             | [[tip-wedm-research-012]]        |
| MICROCUT SF      | CuZn37   | gamma brass      | 1000            | low          | hardened steel / carbide / PCD / micro      | [[tip-wedm-research-013]]        |

**Cu / Zn alloy ratios:** US + EU industry is 63 / 37; Asia is 65 / 35.

**Coating types:** electro-galvanized (2-3 µm pure Zn) for standard
coated wire; diffusion-annealed gamma-phase (18-35 µm Zn diffused into
core) for the higher-performance Microcut SF and equivalents.

## Wire selection decision tree

```
                       Need extreme taper >15°?
                       /                       \
                     YES                       NO
                      |                          |
                Plain brass 400-600 N/mm²        |
                (Bercocut soft)                  |
                      |                          |
                                       Workpiece hardness?
                                       /          \
                                    ≤50 HRC       >60 HRC / carbide / PCD?
                                      |                |
                                      |               YES
                              Zn-coated, hard         |
                              (Cobracut G,            |
                               Megacut, AC Cut G)     |
                              for production          |
                              roughing.              MICROCUT SF (gamma-phase)
                              Cobracut std for       (or equivalent gamma-phase)
                              finishing pass.
```

## Cutting-parameter envelope (Sodick + general)

| Parameter            | Symbol      | Typical range          | Source                              |
|----------------------|-------------|------------------------|-------------------------------------|
| Pulse-on time        | TON / ON    | 0.1 – 150 µs           | DMNC PDF, IRJET V5I12245            |
| Pulse-off time       | TOFF / OFF  | 1 – 200 µs             | DMNC PDF, IRJET V5I12245            |
| Peak current         | IP          | 1 – 63 (Sodick scale)  | DMNC PDF                            |
| Open / servo voltage | V           | 20 – 80 V              | IRJET V5I12245                      |
| Wire feed            | WF          | 5 – 30 m/min           | IRJET V5I12245                      |
| Discharge frequency  | f           | 1 – 500 kHz            | Practical Machinist 247750          |

### Sodick IP cap × generator tier — [[tip-wedm-research-014]]

| Generator | IP max | Typical IA at TON 120 µs / TOFF 50 µs |
|-----------|--------|---------------------------------------|
| NF 25     | 15.15  | ~10.6 A                               |
| NF 40     | 31.5   | ~22 A                                 |
| NF 80     | 63.5   | ~44 A                                 |

Setting IP above the generator cap is silently floored — the operator
display shows the entered value, but only the cap-worth of transistor
circuits switch. This is the #1 root cause of "why does my new
condition-file from machine-X cut slower than the old one on this
machine-Y" confusion.

### Optimal-MRR parameter combos — [[tip-wedm-research-015]]

| Optimize for      | Wire     | WF       | TON   | TOFF | IP    | V    |
|-------------------|----------|----------|-------|------|-------|------|
| MRR               | Zn-coated| 30 m/min | 120 µs| 50 µs| 2 A   | 20 V |
| Kerf width        | Half-hard| 8 m/min  | 110 µs| 60 µs| —     | —    |

**Parameter scaling:** MRR + surface roughness BOTH scale UP with TON
and IP; BOTH scale DOWN with TOFF and servo voltage. The MRR-optimal
combo trades surface finish; the kerf-width-optimal combo trades feed
rate. Wire choice multiplies through the table — switching Bercocut →
Cobracut G typically lifts achievable MRR 20%.

## Performance benchmarks — [[tip-wedm-research-016]]

D2 tool steel (SKD-11 in Asia), 0.010" / 0.25 mm plain brass wire, vintage
mid-1990s Sodick:

| Throughput            | Diagnosis                                        |
|-----------------------|--------------------------------------------------|
| 15 in² / hr (97 cm²)  | healthy — at-spec throughput                     |
| 10 – 15 in² / hr      | aging but normal                                 |
| 5 – 10 in² / hr       | maintenance overdue                              |
| < 5 in² / hr          | real fault — generator / wire-feed / dielectric  |

Diagnostic order when throughput drops:
1. Dielectric conductivity ≤ 5 µS / cm (water-resin filtration loaded?)
2. Flush pressure at top + bottom nozzles
3. Wire tension at the upper guide
4. Power-supply current draw against spec
5. Filter / resin-bed loading

Zn-coated wire shifts these benchmarks **up 20-30 %** — re-baseline if
you swap wire type.

## What's NOT covered yet (gaps for future research)

- Mitsubishi E-PACK condition database (proprietary, dealer-restricted)
- Per-controller WEDM dialect snippets at G-code / M-code level (Sodick
  LN vs Mitsubishi M700 vs Agie vs Charmilles vs Makino EDGE) — partially
  covered by [[tip-wedm-research-014]] for Sodick only
- Workpiece-material-class WEDM machinability index (brass, aluminum,
  titanium, Inconel, beryllium-copper, copper-tungsten, graphite,
  silicon carbide) — only D2 / SKD-11 currently benchmarked
- Wire-break diagnostics tied to specific spark-quality classifier
  patterns — partially covered by [[tip-wedm-research-010]]
- AWT (auto wire threader) recovery sequences per controller
- Surface integrity microstructure (recast layer thickness vs TON, HAZ
  depth vs IP, micro-crack density vs flushing pressure) for tool steel
  and tungsten carbide

These gaps target the next research round.

## Integration into PRISM

- **Tribal tips** — [[tip-wedm-research-011]] through `-016` ship in
  `mcp-server/src/data/wedm-knowledge-tips.ts`; the existing
  `wedm-tip-learner` / `tribalSearch` surface picks them up automatically.
- **Wire wizard** — when [[WEDMAcademyBridgeEngine]] ships its dispatcher
  action ([[reference_academy_bridge_2026_05_26]]), these tips will also
  flow into wizard tooltips through the same channel.
- **LoRA training** — these tips are eligible for the
  `wedm_lora_train.jsonl` corpus via the academy bridge's
  `emitTrainingExamples` path once the tip → instruction-family mapper
  is extended (current mapper handles academy quizzes only — extension
  to free-form tribal tips is a follow-up unit).
