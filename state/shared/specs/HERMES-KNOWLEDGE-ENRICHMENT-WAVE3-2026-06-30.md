---
artifact: hermes-knowledge-enrichment-wave3
source: 6 parallel Hermes/deepseek-v4-pro DRAFTS (NVIDIA lane) -> re-verified + grounded by the 6 PRISM DOMAIN-SPECIALIST agents (foxtrot-mill, whiskey-lathe, mike-wedm, kilo-cam, echo-post-processor, delta-cad)
generated_by: slot:india 2026-06-30 (operator: "orchestrate a small fleet of hermes agents" -> then "instead of hermes agents spawn domain specialist agents")
status: ADVISORY knowledge-system enrichment, WAVE 3 (breadth). A general LLM drafted 36 items; each domain SPECIALIST agent then verified against its real corpus, CORRECTED the physics, replaced LLM-asserted citations with real sources (or honest "field-practice (uncited)"), dropped the unusable, and added better items. 40 grounded items result. STAGED for tribal/wiki ingestion via the shard-safe writer (india owns it); the tribal + LoRA consumers auto-pick this up (stage-hermes-knowledge-tips.mjs globs HERMES-KNOWLEDGE-ENRICHMENT-*.md). safety=yes items inform specialist gates ONLY after the specialist confirms the threshold vs the cited source.
domains: mill/foxtrot . lathe/whiskey . wedm/mike . cam/kilo . post/echo . cad/delta
sibling: HERMES-KNOWLEDGE-ENRICHMENT-PRIMARY-DOMAINS-2026-06-29.md (wave 1, 42) . HERMES-KNOWLEDGE-ENRICHMENT-WAVE2-2026-06-29.md (wave 2, 42)
---

# Hermes knowledge enrichment -- WAVE 3 (LLM breadth -> DOMAIN-SPECIALIST grounding)

The operator's steer: draft with a fast general LLM, then let each DOMAIN SPECIALIST verify. This is what
that produced. The specialists did NOT rubber-stamp -- they caught real errors a generic model made:

## SPECIALIST CORRECTIONS (proof the grounding mattered -- R12)
- **WEDM: 100x error caught.** The draft claimed dielectric resistivity 50-150 kOhm.cm; the wedm specialist
  corrected it to the real MEGOHM-cm range (5-15 MOhm.cm finishing, <3 unstable) against PRISM tribal
  wedm-kb-007 + Jameson. Also flagged the Ti "wire-speed controls recast" claim as BACKWARDS (recast is set
  by discharge energy, not wire travel speed) and added a real dielectric fire / water-level safety interlock.
- **LATHE: mechanism corrected.** Hard-turn white-layer is a THERMAL threshold (austenitization onset ~700C
  hardened steel, per `mcp-server/src/physics/constants.ts` WHITE_LAYER_THRESHOLDS / Klocke), NOT the draft's
  Vc>160/VB>=0.2 line. The C-axis rigid-tap formula (dimensionally unsound in the draft) -> feed/rev = pitch.
- **CAM: formula direction fixed.** Internal-arc tool-center feed factor is R/(R - r_tool), not the draft's
  wrong-direction `1 - R/D`. The "collision-safe retract" (draft admitted "placeholder") was dropped.
- **POST: dialect codes corrected against real files.** Haas mirror is Settings 45-48 (NOT "G101"); Renishaw
  G65 P9810 is PROTECTED-POSITIONING (measure macros are P9811/P9814/P9815); Okuma TCP is G169/G170 (verified
  vs JM .cps + okuma-dialect-knowledge.ts). Added the G68.2 tilted-plane (3+2) vs TCP distinction.
- **CAD: fabricated clause numbers replaced.** The draft's specific sub-clauses (6.11.3.1, 7.8.3, 7.2.3) were
  largely invented; the cad specialist re-cited by Y14.5-2018 SECTION (Sec 4/6/5/9) + named the CAx-IF
  recommended practice for AP242 validation properties instead of a fake ISO clause.

Tag legend: **[C]** confirms existing PRISM doctrine . **[N]** new/extends. Sources marked "field-practice
(uncited)" are specialist-vouched but not tied to a citable page -- advisory recall, specialist confirms
before any gate.

## MILL (foxtrot)
| rule | formula/threshold | source | safety | tag |
|---|---|---|---|---|
| Thread-mill cutter dia must sit well below thread minor dia; helical-interpolation profile (arc vs true flank) error grows with D_c/D_thread | D_c <= 0.7 x D_thread (0.6 x for close tol); must clear minor dia | Sandvik Coromant threading guide + field-practice | no | [C] |
| Thin-wall: rough both faces leaving equal thin stock, finish top-down in a staircase with light spring passes, keep support material on the opposite side until last | ~0.1-0.2 mm finish stock/wall; alternate sides; light final | field-practice (uncited) | no | [N] |
| High-feed milling (distinct from chip-thinning): small lead/entry angle steers force axially into the stiffest spindle direction at shallow axial DOC + high feed/tooth | lead angle ~10-17 deg; a_p ~0.5-2 mm; force axial (+Z) | Sandvik / Ingersoll high-feed guides + field-practice | no | [N] |
| Micro-tool runout: TIR must be <= ~3% of dia or one flute carries the whole load and snaps; measure at the cutting edge, not the shank | TIR <= 0.03 x D_c (~3 um for D < 1 mm) | field-practice (uncited) | yes | [N] |
| Internal-corner feed reduction holds the contact-point (edge) velocity constant as the tool-center slows through the corner | f_center = f_prog x (R_i - R_tool)/R_i; floor 30-50% when R_i ~ 1.1-1.3 x R_tool | field-practice (uncited) | no | [C] |
| Stainless/nickel face-mill: positive roll-in (arc) entry, NEVER dwell/rub (ISO-M/S work-harden under a rubbing edge); a large lead thins the chip but is a productivity choice, not the anti-work-harden lever | arc roll-in entry; no dwell; fz above rubbing floor | Sandvik milling guide + field-practice | yes | [C] |
| Cutter-to-slot-width: avoid a cutter near the slot width (0.6-0.8 x re-cuts chips on the trailing edge) and avoid full-slot a_e = D (180 deg wrap) -- prefer peel/trochoidal | prefer D <= 0.7 x slot width + trochoidal | Sandvik pocketing guidance + field-practice | no | [N] |
| Climb (down) milling by default on rigid CNC (chip thick->thin: less edge heat, better finish); conventional only for hard skin/scale or backlash-prone machines | default climb | Machinery's Handbook (climb vs conventional) + Sandvik | no | [C] |

## LATHE (whiskey)
| rule | formula/threshold | source | safety | tag |
|---|---|---|---|---|
| Tailstock quill extension limit -- quill deflection scales ~ extension^3 (cantilever); keep minimal, retract before high RPM | quill extension <= 3 x quill diameter | Machinery's Handbook (tailstock rigidity) + field-practice | yes | [N] |
| Thread run-out/chamfer is set by the Fanuc G76 chamfer parameter (not a helix-angle formula); size the relief groove so the synchronized retract clears the shoulder before spindle-lead desync | G76 chamfer field (0.1L increments, 0-89 deg) | Fanuc Series 0i/0i-TF Operator's Manual, G76 threading cycle | yes | [N] |
| Live-tool / C-axis rigid tapping needs exact spindle-to-feed sync: axial feed per rev must equal the thread pitch; without rigid-tap sync use a tension-compression (floating) tap holder | F[mm/min] = pitch[mm/rev] x S[rpm] (feed/rev = pitch) | Fanuc rigid-tapping (G84/G74) function | yes | [N] |
| Minimum bar remnant must keep full collet/pusher grip + spindle-liner engagement -- a short remnant lets the pusher feed air and crash the turret | remnant >= collet grip length + pad; verify per bar-feeder OEM | field-practice (uncited) | yes | [C] |
| Hard-turn white-layer is THERMAL, not a fixed Vc/VB line: forms when surface temp reaches austenitization onset; rising Vc + flank wear both raise that temp, so worn insert + high Vc are the trigger | threshold_C: hardened 700 / steel 850 / stainless 650 | mcp-server/src/physics/constants.ts WHITE_LAYER_THRESHOLDS (Klocke; Boothroyd 1963) | yes | [N] |
| Boring/ID-groove bar deflection must consume only a fraction of the print tolerance band, especially at overhang L/D > 4 where deflection ~ (L/D)^3 dominates diameter error | budget delta_radial <= ~0.5 x tolerance band | field-practice + Machinery's Handbook cantilever delta = FL^3/3EI | no | [N] |

## WEDM (mike)
| rule | formula/threshold | source | safety | tag |
|---|---|---|---|---|
| Deionized-water dielectric resistivity is in the MEGOHM-cm range (NOT kOhm-cm); finishing wants HIGH resistivity, roughing runs LOWER; below ~3 MOhm.cm discharges go unstable + the deionizer resin is spent | finishing ~5-15 MOhm.cm; regen resin < ~3 MOhm.cm. (a draft "50-150 kOhm.cm" is ~100x too conductive) | PRISM tribal wedm-kb-007 + Jameson, EDM (SME 2001) dielectric-conditioning | no | [C] |
| Thin walls / small unsupported sections: REDUCE flush pressure -- a high jet vibrates the wire and deflects the wall (straightness + Ra loss); aggressive flushing is a roughing/deep-cut tool | skim/thin-section ~3-5 bar vs 8-10 bar roughing | PRISM tribal wedm-kb (reduce flush on skim) + field-practice | no | [C] |
| Wire-guide wear/contamination raises effective wire tension and causes fatigue breaks BEFORE it shows as size error; replace on a running-hours cadence keyed to material abrasiveness | replace guides ~200-400 h (material-dependent); flag tension variation > ~15% | PRISM tribal wedm-kb-006 + Sommer, Complete EDM Handbook (guide maintenance) | no | [C] |
| Wire TRAVEL speed is a break-risk / wire-presentation control, NOT a recast control -- recast/HAZ depth is set by discharge ENERGY (pulse-on, peak current), so cut recast with low-energy skim passes, not by tuning m/min | recast ~ per-spark energy (V x I x t_on), not wire m/min | field-practice + Jameson, EDM (SME 2001) | no | [N] |
| On a wire break, cap auto-rethread retries and let the dielectric stabilize before restart -- blind repeated re-thread into a debris-fouled kerf wastes wire and can bird-nest | ~2-3 auto-rethread attempts then operator halt | field-practice (uncited) | no | [N] |
| Dielectric fire / water-level interlock: the workpiece must stay submerged during sparking -- exposed sparking above the waterline can ignite oil residue/additives or pocket explosive hydrogen; a dropping tank level must auto-pause the cut | maintain > ~25 mm dielectric coverage above the part; tank-level sensor auto-pause | PRISM tribal wedm-kb (safety) + OSHA/NFPA EDM fire-safety guidance | yes | [C] |
| Start (thread) hole must sit off the contour with a straight lead-in and be clearly larger than the wire+guide geometry -- a hole only marginally over wire dia defeats auto-thread after a break, especially inside a tight radius | ~2-3 mm off contour, straight lead-in; hole >> wire dia (a ~0.3 mm-over hole is too tight) | PRISM tribal wedm-kb-020 + Guitrau, The EDM Handbook | no | [C] |

## CAM (kilo)
| rule | formula/threshold | source | safety | tag |
|---|---|---|---|---|
| Pencil/rest-machining tool reachability: the tool radius must be strictly smaller than the smallest concave (internal fillet) radius it must reach, else the pass leaves uncut stock | r_tool < smallest concave fillet radius on the surface | field-practice (uncited) | no | [N] |
| Ball-nose concave-surface gouge guard on finish/flowline passes: the ball radius must be <= the smallest concave surface-curvature radius (a larger ball gouges tight concave regions) | r_ball <= R_min (smallest concave curvature radius) | field-practice (uncited) | yes | [N] |
| Prefer helical/ramp entry over vertical plunge into closed pockets -- avoids axial overload of non-center-cutting end mills and poor chip clearance at the pocket floor | ramp/helix angle ~2-5 deg (shallower for hard/thin-web; steeper acceptable in open slots) | field-practice (uncited) | no | [N] |
| Safe rapid (G0) linking / retract clearance plane above the highest stock + fixture obstacle; use stay-down linking below clearance ONLY when the connecting move is verified obstacle-free, else full retract | clearance plane above highest obstacle + margin | field-practice (uncited) | yes | [C] |
| Rotary-axis wind-up: insert an unwind/rewind before accumulated commanded rotary angle reaches the axis rotary travel limit (protects a cable-carrier axis) -- the limit is machine-specific, NOT a universal 720 deg | unwind before |accumulated C/A| reaches machine rotary travel limit | field-practice (uncited) | yes | [C] |
| Internal (concave) arc tool-center feed compensation to hold the tool-tip/surface feed constant: factor R/(R - r_tool); external/convex arc factor R/(R + r_tool) < 1. (a draft "1 - arc_r/tool_dia" is wrong-direction) | f_center factor = R/(R - r_tool) internal; R/(R + r_tool) external | Smid, CNC Programming Handbook (arc feedrate compensation under cutter comp) | no | [C] |

## POST-PROCESSOR (echo) -- codes verified vs real .cps + okuma-dialect-knowledge.ts
| rule | dialect | source | safety | tag |
|---|---|---|---|---|
| Polar-coordinate interpolation differs by control -- Fanuc mill G16 (on)/G15 (cancel); lathe/mill-turn C-axis face/OD is G12.1 (on)/G13.1 (off); Siemens TRANSMIT/TRACYL (cancel TRAFOOF, NOT a G-code); Heidenhain CC (pole)+LP/CP. TRAP: G16 != G12.1 -- never emit G16 on a mill-turn face-C job | Fanuc G16/G15 vs G12.1/G13.1 vs Siemens TRANSMIT/TRACYL | Smid, CNC Programming Handbook 3e + Siemens 840D sl Cycles/Transformations | yes | [N] |
| Mirror/scale differ by control -- Fanuc G51.1/G50.1 (scale G51/G50); Siemens MIRROR/AMIRROR + SCALE/ASCALE; Heidenhain CYCL DEF 8 (mirror)/11 (scale); Haas mirror = Settings 45-48 (NOT a G-code -- "G101" is wrong) | Fanuc G51.1/G50.1 vs Siemens MIRROR vs Haas Settings 45-48 | Fanuc 30i/31i Operator's Manual B-64484EN + Heidenhain iTNC 530 Cycle 8/11 | yes | [N] |
| 5-axis TCP (tool center point) differs by control -- Fanuc G43.4/G49; Haas G234/G49; Siemens TRAORI/TRAFOOF; Heidenhain M128/M129; Okuma OSP G169 (on)/G170 (off, NOT G168). Non-cancel of TCP = crash on the next positioning move | Fanuc G43.4 . Haas G234 . Siemens TRAORI . Heidenhain M128 . Okuma G169/G170 | Haas Mill Manual (G234 TCPC) + Fanuc B-64484EN + Okuma OSP 5-axis (verified vs JM .cps) | yes | [C] |
| 3+2 indexed tilted-plane is DISTINCT from simultaneous TCP -- Fanuc G68.2 (Euler)+G53.1/G69; Siemens CYCLE800; Heidenhain PLANE SPATIAL/RESET; Haas G268/G269. TRAP: G68.2 (5-axis WCS tilt) != G54.4 (workpiece-error comp) != G68 (2D rotation) | Fanuc G68.2+G53.1 vs Siemens CYCLE800 vs Haas G268 | Fanuc 30i B-64484EN (Tilted Working Plane) + Siemens 840D sl CYCLE800 | yes | [N] |
| Probing macro + result storage differ -- Renishaw Inspection Plus G65 P9810 is PROTECTED-POSITIONING (a guarded rapid, NOT a measure); measure macros are P9811 (surface)/P9814 (bore-boss)/P9815; results land in commons #100-#144 (#138 position, #144 size dev); Haas tool-set G65 P9023. Wrong P-number = probe crashes at rapid | Fanuc/Haas/Okuma G65 P98xx (Renishaw); Siemens CYCLE977/978/982; Heidenhain TCH PROBE 4xx | Renishaw Inspection Plus Programming Manual H-2000-6222 | yes | [N] |
| Feed-per-rev vs feed-per-min + encoder dependency -- G95 (per rev) REQUIRES a spindle encoder; G94 (per min) does not; lathe G95 is the turning default, mill G95 is valid ONLY with a synchronized spindle (live-tool/threadmill/tap). Wrong mode = ~100x crawl (G95 num read as G94) or gross overfeed/crash (reverse) | G95 (ipr, needs encoder) vs G94 (ipm) | Smid, CNC Programming Handbook (Feedrate Function) + Okuma OSP-P300L | yes | [N] |

## CAD (delta) -- clauses re-cited by SECTION (draft sub-clauses were largely fabricated)
| rule | clause | source | safety | tag |
|---|---|---|---|---|
| A thread designated as a datum feature establishes its axis from the PITCH cylinder by default; MAJOR DIA or MINOR DIA must be stated explicitly to override | ASME Y14.5-2018 Sec 4 (screw threads/gears/splines as datum features) | ASME Y14.5-2018 | no | [N] |
| Tangent-plane modifier (circle-T) makes the tolerance zone control the contacting (tangent) high-point plane, not the surface -- local peaks may lie outside the zone if the tangent plane conforms | ASME Y14.5-2018 Sec 6 Orientation (modifier defined Sec 3 Symbology) | ASME Y14.5-2018 | no | [N] |
| Free-state modifier (circle-F) applies a tolerance to a non-rigid part in its unrestrained state; unless invoked, non-rigid parts are inspected RESTRAINED per an explicit restraint note on the drawing | ASME Y14.5-2018 Sec 5 (Non-Rigid Parts / free state), restraint note | ASME Y14.5-2018 | no | [N] |
| ISO surface-texture lay symbol (=, perp, X, M, C, R, P) sets the dominant machining-pattern (lay) direction relative to the view projection plane -- orientation-carrying, not amplitude | ISO 1302 lay-direction symbols (ASME Y14.36 equivalent) | ISO 1302 | no | [N] |
| Total runout is a composite surface control (form+orientation+location) -- full-indicator-movement over the ENTIRE surface (all circular + longitudinal elements); circular runout is per-cross-section only | ASME Y14.5-2018 Sec 9 Runout (total vs circular) | ASME Y14.5-2018 | no | [N] |
| Runout referenced to a single cylindrical datum feature too short to stabilize the axis should reference TWO coaxial datum features as one datum axis (A-B) to constrain wobble | ASME Y14.5-2018 Sec 9 Runout with co-datum axis | ASME Y14.5-2018 | no | [N] |
| STEP AP242 geometric validation properties (solid volume, surface area, centroid) are round-trip checksums written into the file so a translator/receiver can verify translated geometry matches the source -- compared by software, not a machine gate | STEP geometric_validation_property (CAx-IF recommended practice; ISO 10303-242 with -59 data-quality principles) | ISO 10303-242 / CAx-IF Validation Properties recommended practice | no | [N] |

## SUMMARY + ROUTING
- **40 specialist-grounded items / 6 domains** (124 across all three waves). Each was drafted by a general LLM, then VERIFIED + corrected by the domain specialist -- the value of the operator's "domain specialists instead of hermes agents" steer is proven by the 5 real errors the specialists caught (WEDM 100x resistivity, WEDM/Ti recast direction, LATHE thermal white-layer, CAM internal-arc feed direction, POST Haas mirror + Renishaw P9810).
- **Ingestion (india owns the shard-safe writer):** the tribal embedder (`hermes-knowledge` source) + LoRA converter auto-pick this up because `stage-hermes-knowledge-tips.mjs` globs `HERMES-KNOWLEDGE-ENRICHMENT-*.md`.
- **safety=yes items:** advisory recall now; the domain specialist confirms the threshold vs the real source before it fires a gate. "field-practice (uncited)" = specialist-vouched but no citable page -- advisory recall only.
