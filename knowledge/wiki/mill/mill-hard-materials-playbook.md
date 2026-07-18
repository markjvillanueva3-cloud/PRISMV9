---
title: Mill Hard-Materials Playbook — titanium, superalloys, hardened steel (synthesis)
type: reference
domain: mill
tags: [mill, titanium, inconel, superalloy, hardened-steel, ISO-S, ISO-H, HEM, CBN, hard-milling, playbook]
status: living
created: 2026-06-12
author: slot:bravo
related: [mill-thermal-heat-management, mill-cutting-forces, mill-insert-grade-coating-selection, mill-chip-thinning, mill-toolholder-connection-style-reference, mill-data-contents-inventory]
---

# Mill Hard-Materials Playbook

> Operator goal 2026-06-12: handle the worst materials. This is the **synthesis** page — Ti-6Al-4V, Inconel/superalloys (ISO-S) and hardened tool steel ≥45 HRC (ISO-H) are where every margin disappears at once, so the tactics scattered across the physics pages are pulled into one actionable reference. Each row links the page that grounds it. (Not new physics — the *one page you reach for on a hard job*.)

## Why these materials are hard (the numbers, cited `constants.ts`)
| | k (W/m·K) | kc1.1 (N/mm²) | Taylor C | The problem |
|---|-----------|---------------|----------|-------------|
| **Ti-6Al-4V (S)** | **6.7** | 2800 | 150 | heat stays at the edge ([[mill-thermal-heat-management]]); low modulus → springs/chatters |
| **Inconel 718 (S)** | 11.4 | 2800 | 150 | work-hardens; abrasive; heat at edge; gummy |
| **Hardened steel ≥45 HRC (H)** | 20.5 (D2) | **3200** | 120 | hardest to cut (highest kc1.1 + lowest life); brittle finish |

The pattern (cite `constants.ts:34-40,126-147`): **low k + high kc1.1 + low Taylor C all at once** — heat can't escape, force is high, life is short. That's why these need their own playbook.

## §1 — Titanium (Ti-6Al-4V, ISO-S)
- **Low SFM + flood, always** — SFM 50-250 (cite `milling-pdf-cited-tips.ts:1114`); the heat must be carried away by coolant because the part won't conduct it (k=6.7). Never dry.
- **HEM / low radial engagement (5-15% ae), full axial DOC** — keeps each tooth in the cut briefly so heat leaves with the chip ([[mill-chip-thinning]] + thermal §3); 2-3× faster + longer life than conventional.
- **Rigidity is survival** — Ti's low modulus + high force → deflection + chatter; short slim shrink holder ([[mill-toolholder-connection-style-reference]]), rigid setup, sharp positive geometry (lower force/heat, cite `:551`).
- **Never dwell** — a stationary tool in Ti work-hardens the spot instantly; keep moving, arc entries, no full stops.

## §2 — Superalloys (Inconel/Waspaloy, ISO-S)
- All of Ti's rules **plus** notch wear at the DOC line (work-hardened prior layer) — **vary the DOC** so the wear notch doesn't dig a groove ([[mill-surface-finish-tool-wear]] wear table).
- Ceramic/SiAlON inserts can run *hot and fast* on nickel alloys (a different regime than carbide) — but only with rigidity + no interruptions *(eng.)*.
- Through-spindle coolant / high-pressure to lift the gummy chips (TSC >1000 PSI, cite `:3075`).

## §3 — Hardened steel ≥45 HRC (hard milling, ISO-H)
- **CBN inserts** — "second-hardest material," the grade family for hardened steel (cite mitsubishi `BC8100`/`MB8100` "Hardened steel", [[mill-insert-grade-coating-selection]]); carbide burns on >~50 HRC.
- **Light DOC, high rigidity, balanced high-RPM** — hard milling is small chips, fast, rigid; AlTiN/AlCrN coatings for the heat ([[mill-insert-grade-coating-selection]] + canonical coating table).
- **Hard milling can replace grinding** for many die/mold features — but a flatness/finish callout tighter than the hard-mill scallop still needs grind/scrape ([[mill-print-to-operation-plan]] §2).
- **No interruptions if avoidable** — CBN chips on a vibrating/interrupted cut; tougher grade or steady engagement.

## §4 — Common thread (all three)
1. **Heat management is the master variable** — low-k means the edge cooks → flood/TSC + chip-as-heat-sink (HEM) + sharp edge ([[mill-thermal-heat-management]]).
2. **Rigidity everywhere** — slim shrink holder + rigid fixture + short tool + box-way machine if available ([[mill-toolholder-connection-style-reference]], [[mill-machine-stack-reference]]).
3. **Lower SFM, manage the chip** — accept the low Taylor C; recover MRR with engagement/feed (chip-thinning), not speed.
4. **Honor the power gate** — high kc1.1 → high force → verify `Pc ≤ HP − 20%` ([[mill-cutting-forces]] §3, [[feedback_foxtrot_spindle_power_headroom]]).

## §5 — Feeds the calculations
A solver that treats Ti/Inconel/hardened like steel is **dangerously wrong** — it over-speeds (burns the edge), under-feeds (rubs/work-hardens), and over-powers (snaps). The right calc reads the ISO-S/H `kc1.1`, `k`, and Taylor `C/n` from `constants.ts` and applies: low SFM ceiling, flood-mandatory flag, HEM-engagement, rigidity-required, CBN/ceramic grade. This playbook is the human-readable form of those material-conditional rules the engine should encode.

## Shop-floor tips (tribal)
- Ti/Inconel: **flood + low SFM + keep moving** — heat at the edge (k=6.7) is the killer, not force. (src: `:1114` + `constants.ts:133`)
- Inconel: vary the DOC so the work-hardened-layer notch doesn't dig a groove at one line. (wear table)
- Hardened steel: **CBN, light DOC, rigid, balanced fast** — carbide burns >50 HRC. (src: mitsubishi CBN grades)
- Recover MRR on hard materials with engagement (HEM), never with speed — the Taylor C is low for a reason. (eng. + chip-thinning)

## Source data (cite)
`constants.ts:34-40` (kc1.1 S=2800/H=3200), `:126-147` (Ti k=6.7, Taylor C). Cited tips `milling-pdf-cited-tips.ts:1114` (Ti SFM/flood), `:1264` (HREM thermal), `:3075` (TSC), `:551` (sharp positive). Synthesizes: [[mill-thermal-heat-management]] · [[mill-cutting-forces]] · [[mill-insert-grade-coating-selection]] · [[mill-chip-thinning]] · [[mill-surface-finish-tool-wear]]. Full surface: [[mill-data-contents-inventory]].
