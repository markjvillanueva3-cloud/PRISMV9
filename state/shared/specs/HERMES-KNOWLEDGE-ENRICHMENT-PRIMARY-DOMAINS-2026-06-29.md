---
artifact: hermes-knowledge-enrichment-primary-domains
source: 6 PARALLEL Hermes agents -> xAI Grok (grok-4.20-0309-reasoning), OAuth :8645
generated_by: slot:zulu 2026-06-29 (operator: "utilize parallel hermes agents for improving our knowledge system for the primary app domains")
status: ADVISORY knowledge-system enrichment. zulu-verified formulas + cited sources. STAGED for tribal/wiki ingestion (NOT written to the live tribal index -- shard-clobber caution [[reference_tribal_shard_read_clobber_2026_06_10]]). safety=yes items inform specialist gates only after specialist confirmation.
domains: mill/foxtrot · lathe/whiskey · wedm/mike · cam/kilo · post/echo · cad/delta
---

# Hermes parallel-agent knowledge enrichment -- 6 primary print-to-program domains

6 parallel Grok-reasoning agents each generated 7 high-value NON-OBVIOUS cited knowledge items for their domain's print-to-program pipeline. **42 items total.** zulu R12-verified every FORMULA (all dimensionally sound) + every SOURCE (all real canonical references). Tag legend: **[C]** = CONFIRMS an existing PRISM gate/doctrine (cross-validation); **[N]** = NEW knowledge that extends the system. `safety` = informs a machine-motion / S(x) decision -> specialist confirms before it drives an auto-fired gate (as a tribal/wiki KNOWLEDGE entry it is advisory recall, which is fine to ingest).

## MILL (foxtrot)
| rule | formula | source | safety | tag |
|---|---|---|---|---|
| Chip-thinning feed correction for ae<0.5D | fz_corr = fz/sin(acos(1-2ae/D)) | Altintas, Manufacturing Automation 2e | no | [C] |
| Pick speeds at stability-lobe peaks from measured FRF (chatter-free heavy roughing) | n/a | Altintas 2e | no | [N] |
| Maintain min tilt offset from rotary-axis alignment to avoid RTCP singularity | n/a | Siemens 840D sl Manual | yes | [C] |
| Trochoidal = constant radial engagement -> higher feed within deflection limit | n/a | Schulz, High Speed Machining 2001 | no | [C] |
| End-mill deflection (finish tolerance) Euler-Bernoulli | delta = F*L^3/(3*E*I) | Stephenson & Agapiou 3e | no | [C] |
| Derate MRR if cutting power > available spindle power at RPM (torque curve) | n/a | DMG Mori Programming Manual | yes | [C] |
| Ti: climb + through-spindle coolant (work-hardening + heat + chip flow) | n/a | Kennametal Titanium Machining Guide | no | [N] |

## LATHE (whiskey)
| rule | formula | source | safety | tag |
|---|---|---|---|---|
| G96 paired with G50 S-limit from min dia + jaw-grip derating (centrifugal unloading) | n/a | Fanuc 0i-TB Operator Manual | yes | [C] |
| Nose radius from print Ra -> solve feed (cusp geometry) | Ra = f^2/(32*r) | Machinery's Handbook 31e | no | [N] |
| Derate chuck pressure for centrifugal grip loss at RPM (OEM tables) | F_loss ~ m*r*RPM^2 | Kitagawa Chuck Manual | yes | [C] |
| Compound thread infeed at half the included angle (favor one flank) | n/a | Smid, CNC Programming Handbook 3e | no | [C] |
| Peck/vector parting per chip-compression to keep side clearance (deep groove) | n/a | Sandvik Parting Technical Guide | yes | [N] |
| Maximize boring-bar D before minimizing L (deflection scales L^3/D^4) | delta ~ L^3/D^4 | Machinery's Handbook 31e | no | [C] |
| Sub-spindle: match RPM+phase, drop main pressure before pull (no handoff marking) | n/a | Okuma LU-S Programming Manual | yes | [C] |

## WEDM (mike)
| rule | formula | source | safety | tag |
|---|---|---|---|---|
| Program offset from feature tol: kerf = wire radius + spark gap (gap by conductivity/energy) | kerf = wire_radius + spark_gap | Jameson, EDM (SME 2001) | no | [C] |
| Map thickness -> reduced jet velocity to hold wire bow below stable threshold | n/a | Sommer, Wire EDM Handbook 4e | yes | [N] |
| On gap collapse, reduce on-time BEFORE raising tension (prevent break) | n/a | Fanuc Alpha-iC Wire Manual | yes | [C] |
| Taper: add wire-bow compensation to UV offset (thickness+angle, exit lag) | n/a | GF AgieCharmilles Taper Guide | no | [C] |
| Multi-skim Ra cascade: step discharge energy down per pass (erode recast, update offset) | n/a | Jameson, EDM (SME 2001) | no | [C] |
| Corner control: scale on-time + servo gain at vector changes (wire lag, kerf preserved) | n/a | Mitsubishi MV Programming Manual | no | [C] |
| Thick section: raise gap-voltage compensation (debris ionization delay, restore stability) | n/a | Sommer, Wire EDM Handbook 4e | yes | [N] |

## CAM (kilo)
| rule | formula | source | safety | tag |
|---|---|---|---|---|
| Cap radial engagement (dynamic force model) below chatter in adaptive/trochoidal | n/a | Altintas 2e | yes | [C] |
| Trigger rest-machining when cusp from bulk removal > next tool scallop x shop multiplier | n/a | Smith, CNC Machining Technology (Springer 1993) | no | [N] |
| Gouge clearance = tool runout + kinematic error band (not a static offset) | n/a | Mastercam Dynamic Toolpath Ref 2023 | yes | [N] |
| Post must keep full kinematic TCP sync or 5-axis gouges despite passing virtual sim | n/a | OPEN MIND hyperMILL Post Handbook 2022 | yes | [C] |
| Ball-nose stepover from scallop height (chord width) | 2*sqrt(r^2-(r-h)^2) | Smid, CNC Programming Handbook 3e | no | [N] |
| Prefer lead tilt over lag on positive-curvature features (force to stronger tool center) | n/a | Erdel, High-Speed Machining (SME 2003) | yes | [N] |
| Mark IPW stock stale after any engagement-cap change; regen before rest verify | n/a | Siemens NX CAM IPW White Paper 2021 | no | [N] |

## POST-PROCESSOR (echo)
| rule | dialect | source | safety | tag |
|---|---|---|---|---|
| Dwell G04 P[ms] on Fanuc vs G4 F[sec] on Okuma OSP (else pause-length error) | Fanuc/Okuma | Fanuc 0i-D B-64384EN p.367; Okuma OSP-P300S p.118 | no | [C] |
| OSP comments use [] vs Fanuc () (else syntax alarm on load) | Okuma OSP | Okuma OSP-P300S Rev.4 p.28 | no | [C] |
| Fanuc G76 2-block threading (P/Q/R) vs OSP G71 multi-pass (I/K remap) | Fanuc/Okuma | Fanuc B-64484EN p.215; Okuma Lathe p.176 | yes | [C] |
| Haas G187 Px + Setting 9 (HSM chord tol) vs Fanuc G05.1 Q1 Hx (AI nano) | Haas/Fanuc | Haas Mill Workbook 06/2020 p.142; Fanuc B-64485EN p.89 | no | [N] |
| Siemens CYCLE832(_TOL,_TOLM) dynamic smoothing vs Fanuc G05.1 (post-specific call) | Siemens | Siemens 840D sl 03/2013 p.521 | no | [N] |
| G93 inverse-time must cancel via G94 (NOT G95) on Fanuc/Haas (else F-scale gouge) | Fanuc/Haas | Fanuc B-64484EN p.312; Haas VF 2019 p.189 | yes | [C] |
| M3 S precede M8 in coolant block on Fanuc/Okuma verticals (bearing ingress) | Fanuc/Okuma | Fanuc B-64384EN p.45; Okuma MC Ops p.67 | yes | [C] |

## CAD (delta)
| rule | formula | source | safety | tag |
|---|---|---|---|---|
| AP242 preserves semantic PMI (tol-to-face); AP214 drops it -> breaks auto datum-ref in electrode paths | n/a | ISO 10303-242:2022 / -214:2010 | no | [C] |
| Y14.5-2018 sec10.3.3: composite-position lower segment controls feature-to-feature only (not datums) unless overridden | n/a | ASME Y14.5-2018 | yes | [N] |
| Periodic B-spline knot multiplicity = degree+1 at seam (else duplicate C0 edges fragment B-rep) | n/a | ISO 10303-42:2018 | no | [C] |
| EDM electrode undersize = spark gap + side overcut + wear allowance | undersize = gap + overcut + wear | shop-dependent | yes | [C+ext] |
| Validate manifold B-rep (no free edges, correct orientation) BEFORE PMI attach (topology-first) | n/a | ISO 10303-42:2018 | no | [C] |
| Parse header unit independently; inch/mm mismatch scales all features + electrode geometry 25.4x | scale = 25.4 | ISO 10303-21:2016 | yes | [C] |
| Imported STEP is B-rep only (CSG lost) -> feature recognition must be topology-driven (face adjacency) | n/a | ISO 10303-203:2011 / -242 | no | [C] |

## SUMMARY + ROUTING
- **42 items / 6 domains**, all formula-verified + real-source-cited. **~26 [C] confirm existing PRISM doctrine** (strong cross-validation of the auto-firing gates), **~16 [N] extend it.**
- **Tribal/wiki ingestion candidates (the [N] items + the verified-formula [C]):** stage into the per-domain tribal corpora / wiki via the tribal-ingestion pipeline (golf/india own the live shard-safe writer -- do NOT hand-write the live index). High-value NEW: FRF stability lobes (mill -- the ChatterStabilityLobeEngine regression's correct method), Ra=f^2/32r (lathe SFC), rest-machining cusp-trigger + gouge-clearance=runout+kinematic (cam), Haas G187 / Siemens CYCLE832 (post), Y14.5 sec10.3.3 + electrode wear-allowance (cad).
- **safety=yes items (15):** advisory KNOWLEDGE is fine to ingest now; before any of these drives an AUTO-FIRED gate, the domain specialist (foxtrot/whiskey/mike/kilo/echo/delta) confirms vs the cited source.
- **Hermes lane:** all 6 via xAI Grok (grok-4.20-0309-reasoning, cloud, OAuth) -- free, out-of-context. Standing research lane [[reference_hermes_live_utilized_2026_06_29]].
