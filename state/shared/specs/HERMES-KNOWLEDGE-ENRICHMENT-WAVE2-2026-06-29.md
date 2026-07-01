---
artifact: hermes-knowledge-enrichment-wave2
source: 6 PARALLEL Hermes agents -> xAI Grok (grok-4.20-0309-reasoning), OAuth :8645 (re-authed, authenticated:true)
generated_by: slot:zulu 2026-06-29 (operator: "hermes cli and hermes app is finally up and running on local and cloud llm models. utilize parallel hermes agents for improving our knowledge system for the primary app domains")
status: ADVISORY knowledge-system enrichment, WAVE 2 (deepening). Each agent was given wave-1's 7 titles and told to DIVERGE. zulu R12-reconciled every formula (dimensional + arithmetic). STAGED for tribal/wiki ingestion (NOT hand-written to the live tribal index -- shard-clobber caution [[reference_tribal_shard_read_clobber_2026_06_10]]). safety=yes items inform specialist gates ONLY after the specialist confirms the threshold vs the cited page.
domains: mill/foxtrot . lathe/whiskey . wedm/mike . cam/kilo . post/echo . cad/delta
sibling: HERMES-KNOWLEDGE-ENRICHMENT-PRIMARY-DOMAINS-2026-06-29.md (wave 1, 42 items)
---

# Hermes parallel-agent knowledge enrichment -- WAVE 2 (deepening the 6 print-to-program domains)

Wave 1 produced 42 high-level cited rules. Wave 2 asked each of 6 parallel Grok-reasoning agents for the NEXT 7 NON-DUPLICATIVE items at HIGHER resolution: concrete numeric thresholds + a worked micro-example + exact page cite -- the form a specialist can verify and ingest directly. **42 more items (84 total).**

## R12 VERIFICATION BOUNDARY (read before ingesting)
Grok is an LLM. zulu independently reconciled every formula for dimensional soundness AND arithmetic. Findings:
- **Rules + formula STRUCTURES: sound and directionally correct**, every source is a REAL canonical reference.
- **Thresholds: cited CONVENTIONS** -- the domain specialist MUST confirm the number vs the named page before it drives an auto-fired gate. Advisory KNOWLEDGE recall is fine to ingest now.
- **WORKED-NUMBER ARITHMETIC: ~6 items have an LLM arithmetic slip in the example** (formula OK, example number does not reconcile). Flagged inline as `[ARITH?]` with zulu's recomputation. Do NOT ingest the flagged worked number as fact -- ingest the rule + formula, recompute the example.

Tag legend: **[C]** confirms existing PRISM doctrine . **[N]** new/extends . `[ARITH?]` worked-number mismatch (zulu recompute shown).

## MILL (foxtrot)
| # | rule | formula / threshold | source | safety | zulu-check |
|---|---|---|---|---|---|
| 1 | Helical ramp plunge angle by tool/material | max 2.0deg carbide in Ti/Inconel, 4.5deg SS, 7deg Al; pitch=pi*D*tan(a) | Sandvik Milling App Guide C-2900:4 p.68 | yes | [ARITH?] D=12.7,a=1.8deg -> pitch=pi*12.7*tan1.8=1.25mm/rev, NOT the stated 0.40; formula sound, recompute |
| 2 | Entry/exit arc-lead radius caps chip-thickness spike | R_lead=1.25*ae (ae<=0.3D), 0.75*ae (ae>0.4D) | Boothroyd-Knight 3e p.167 sec 6.2 | yes | [N] dimensionally fine; threshold convention |
| 3 | Min fz floor stops rubbing/work-hardening in austenitics | fz>=0.075 mm/t 300-SS, >=0.102 mm/t Inconel 718 | Kennametal H-2000 p.14 sec 3.1 | yes | [C] consistent w/ PRISM rubbing floor; confirm |
| 4 | Through-spindle coolant pressure scaled to pocket depth | P_bar>=55*(depth/D), floor 70 bar | Stephenson-Agapiou 3e p.481 sec 10.4 | yes | [N] internally consistent (4.75->261 bar matches) |
| 5 | Surface speed derate vs flank wear, constant-life | Vc_corr=Vc*(1-0.22*(VB/VB_max)), VB_max=0.3 finish | Altintas 2e p.289 sec 7.5 | no | [ARITH?] 180*(1-0.22*0.6)=156 m/min, NOT stated 140; recompute |
| 6 | ap:ae ratio for tool-life HSM vs conventional | 3.5:1 HSM (ae<0.1D); 1:2 below 180 m/min | Machinery's Handbook 31e p.1089 | no | [N] convention; confirm |
| 7 | Spindle thermal-growth Z comp on long programs | dZ=+0.009*(t_hr-0.5) mm, CAT50 >30 min | Heidenhain iTNC 530 p.312 sec 12.4 | yes | [N] internally consistent (3.5h->+0.027) |

## LATHE (whiskey)
| # | rule | formula / threshold | source | safety | zulu-check |
|---|---|---|---|---|---|
| 1 | Min DOC > nose radius for chip control (no ploughing) | DOC_min=0.75*r_nose (>0.3mm for 0.4mm radius) | Kalpakjian 8e p.579 sec 20.3 | no | [N] dimensionally fine; confirm |
| 2 | Lead angle transfers force axially, unloads slender parts | radial drop ~ 1-cos(lead); 30deg | Shaw 2e p.91 sec 4.4 | no | [ARITH?] 1-cos30=0.134 (13%), but example claims 25%; force model approximate -- specialist set exact factor |
| 3 | Spring passes at zero infeed hit thread class fit | 3 passes class 6, 5 passes class 3 | Smid 3e p.405 sec 13.6 | no | [N] convention; confirm |
| 4 | Peck depth decreases with L/D to fracture chips | peck_max=15*D/(L/D) mm, floor 0.5*D | Machinery's Handbook 31e p.1062 | yes | [C] consistent (D8,L/D7->17mm); confirm |
| 5 | Plunge-feed derate by groove width/depth | f_plunge=0.15*(w/d) mm/rev (w/d<2.5) | Sandvik Turning Guide 2020 p.84 | no | [N] minor example slip (0.064 vs stated 0.052); structure ok |
| 6 | Drop RPM near centerline on parting (bending spike) | RPM_floor=0.4*RPM_init when stock<6mm | Kennametal Grooving/Parting p.37 sec 5.2 | yes | [C] consistent w/ PRISM part-off; confirm |
| 7 | Limit nose radius on interrupted cuts (impact ~ r^1.3) | max r=0.4mm for >6 impacts/rev | Shaw 2e p.214 sec 8.5 | yes | [N] (0.8/0.4)^1.3=2.46 vs stated 2.1x; directionally ok |

## WEDM (mike)
| # | rule | formula / threshold | source | safety | zulu-check |
|---|---|---|---|---|---|
| 1 | Wire tension by dia+material (~55% UTS) | 0.25mm brass=1.35kg(13.2N); 0.15mm Mo-coat=0.55kg max | Sommer Wire EDM Handbook 4e p.89-91 | yes | [N] kgf->N consistent (1.35*9.81=13.2); confirm |
| 2 | Taper flushing: bottom 45-55% of top when angle>0.8deg | top 18 bar / bottom 8.5 bar @1.2deg, 80mm, 0.25 wire | Guitrau EDM Handbook p.198-200 | no | [C] extends taper-comp doctrine; confirm |
| 3 | Recast/HAZ depth per skim on-time | final skim <0.5us -> recast<5um, HAZ<18um (tool steel) | Jameson EDM SME 2001 sec 5.3 p.98-101 | yes | [C] feeds skim Ra cascade; confirm |
| 4 | Auto-thread reliability vs start-hole dia | hole>=1.75*wire dia for >50mm thick (>95% first-try) | Mitsubishi FA Series Threading p.52 | no | [ARITH?] 1.75*0.25=0.44mm, but example states min 0.55 (=2.2x); reconcile the multiplier |
| 5 | Tab land width resists wire pull (no part drop) | land=thickness*0.022, min 3 tabs (14N pull) | Benedict Nontraditional Mfg p.171 | yes | [N] consistent (60mm->1.32~1.4mm); confirm |
| 6 | Min corner radius vs wire dia (servo dither) | program R >= wire_dia*1.35 | El-Hofy Advanced Machining p.238-239 | yes | [N] consistent (0.20*1.35=0.27); confirm |
| 7 | Stress-relief sequence for hardened die steel | rough -> 510-560C x1h/25mm -> slow cool -> skim | Guitrau EDM Handbook sec 6.5 p.265-267 | yes | [N] heat-treat convention; confirm |

## CAM (kilo)
| # | rule | formula / threshold | source | safety | zulu-check |
|---|---|---|---|---|---|
| 1 | Tilt ball-nose lead/lean >=7deg, keep SFM>30 m/min | SFM=rpm*pi*(dia*sin(tilt))/1000 | Altintas 2e p.185 sec 5.4 | yes | [ARITH?] 8mm,2500rpm,7deg -> 7.7 m/min by this formula, NOT stated 34; effective-dia model or number wrong -- kilo verify |
| 2 | Adaptive stepover as material % of tool dia | Al 18%, 4140 9%, Ti 5.5% of dia | Mastercam Adaptive Clearing p.28 | yes | [N] consistent (16mm Ti->0.88); confirm |
| 3 | Stage stock-to-leave rough/semi/finish | 0.75 / 0.15 / 0.025 mm (steel) | Smid 3e p.442 sec 11.6 | yes | [N] convention; confirm |
| 4 | 3D contour stepdown by wall slope, constant cusp | stepdown=0.45*D*cos(slope), cap 0.2D >65deg | Siemens NX CAM Z-Level p.76 | no | [N] CONSISTENT (35deg->3.7, 70deg->1.5); strong |
| 5 | Feed reduction in concave corners by radius ratio | factor=corner_r/(corner_r+0.5*tool_r), apply <2.5 | Altintas 2e p.259 sec 7.3 | yes | [ARITH?] 18/(18+3)=0.857, NOT stated 0.75; recompute |
| 6 | Entry by pocket aspect: helical>2.8:1, ramp<1.8:1, plunge<1.5:1 | helical pitch=0.02*D steel, max 1.8deg | Zeid Mastering CAD/CAM p.589 sec 14.7 | yes | [N] convention; confirm |
| 7 | Smooth 5-axis tool vectors, limit rotary jerk | <800 deg/s^2; 0.35deg change per 10mm | OPEN MIND hyperMILL 5-Axis p.134 | yes | [C] supports TCP/post doctrine; confirm |

## POST-PROCESSOR (echo) -- dialect codes, echo verifies vs the cited manual before firing
| # | rule | dialect difference | source | safety | zulu-check |
|---|---|---|---|---|---|
| 1 | Tool-length comp: emit H with G43 Fanuc/Haas; NO H Okuma (auto from T) | Fanuc G43 Z5. H12 / Okuma T12;G56 Z5. | Smid 3e p.392; Fanuc B-64484EN p.148; Okuma OSP-P300S p.52 | yes | [N] matches known Okuma no-H; echo confirm |
| 2 | Extended work offsets vary by control | Fanuc G54.1 Pn / Siemens G505+ / Okuma G15 Hn | Fanuc B-64384EN p.189; Siemens 840Dsl p.112 | yes | [C] G54.1 Pn correct; Siemens G526 + Okuma G15 echo-verify |
| 3 | Canned-cycle return plane: Fanuc G98/G99; Okuma none (modal Z clear) | Fanuc G98 G81... / Okuma G81... no G98/G99 | Fanuc B-64484EN p.217; Okuma OSP-P300S p.118 | yes | [C] G98/G99 correct; Okuma behavior echo-verify |
| 4 | Subprogram call: Fanuc M98 P / Okuma CALL O / Siemens by name | M98 P1234 L2 / CALL O1234 / SUB call | Smid 3e p.315; Siemens 840Dsl p.78; Fanuc B-64484EN p.301 | no | [N] M98/CALL correct; Siemens "SUB" syntax echo-verify |
| 5 | Modal reset on M06 differs: Haas resets grp01+G20/21; Fanuc keeps | Haas force G1 after M06; Fanuc no force | Haas Mill Workbook p.45; Fanuc B-64384EN p.67 | yes | [N] PARAM-DEPENDENT -- echo verify per machine setting |
| 6 | Rotary rollover/shortest-path param-gated | Fanuc #1008 bit / Haas P2020 / Siemens ORIAXES | Fanuc B-64484EN p.512; Siemens 840Dsl p.245 | yes | [C] supports rotary doctrine; echo confirm param ids |
| 7 | Spindle orient M19 variants | Fanuc M19 Sdeg / Haas M19 Pn (no decimal) / Okuma needs M110/111 | Fanuc B-64484EN p.267; Haas Lathe p.112; Okuma p.89 | yes | [N] echo-verify Haas P vs Fanuc S |

## CAD (delta) -- most solid (GD&T/geometry facts; several exactly correct)
| # | rule | clause / value | source | safety | zulu-check |
|---|---|---|---|---|---|
| 1 | MMC bonus tolerance = feature departure from MMC | bonus=|D_actual-D_MMC| (Y14.5 7.4.1) | ASME Y14.5-2018 cl7.4.1 p.120; Krulikowski 3e p.168 | yes | [C] CORRECT (12.07,MMC12.00,tol0.2->eff0.27) |
| 2 | Datum precedence 3-2-1 locks 6 DOF in sequence | primary 3 / secondary 2 / tertiary 1 DOF | ASME Y14.5-2018 cl6.3.2 p.79 | yes | [C] CORRECT geometry fact |
| 3 | Projected tolerance zone on threaded holes (fastener tilt) | P symbol + height (~2x thickness or 25mm) | ASME Y14.5-2018 cl7.6.2 p.142 | yes | [N] CORRECT; ingest |
| 4 | Profile unilateral U directs whole zone one side | 0.5 U 0.3 = 0.3 out / 0.2 in (Fig 11-23) | ASME Y14.5-2018 cl11.3.2 p.200 | no | [N] CORRECT (U = unequally disposed) |
| 5 | NURBS rational weights non-unity for exact conics | quarter-circle weights [1, 0.7071, 1] exact | ISO 10303-42 cl4.4.2.3 p.37; Zeid p.248 | no | [C] CORRECT (cos45=0.7071 std conic weight) |
| 6 | Tessellation chord tol << downstream CAM tol (no gouge) | chord<=tol/10 (0.01mm chord for 0.1mm profile) | ASME Y14.41-2019 Annex B; ISO 10303-242 cl8.3.2 | yes | [N] convention; ingest |
| 7 | Recognize pocket faces BEFORE fillet/round edges | tag const-radius adjacent if r<0.25*depth | ISO 10303-42 cl4.5.1 p.52; Zeid p.352 | no | [C] supports topology-first feature recog |

## SUMMARY + ROUTING
- **42 wave-2 items / 6 domains** (84 total with wave 1), all real-source cited. ~14 [C] cross-validate existing gates, ~28 [N] extend.
- **6 [ARITH?] worked-number slips flagged with zulu recompute** -- ingest the rule+formula, NOT the bad example number: mill#1 (helical pitch 1.25 not 0.40), mill#5 (Vc 156 not 140), lathe#2 (force factor 13% not 25%), wedm#4 (start-hole multiplier 1.75x vs 2.2x example), cam#1 (ball SFM 7.7 not 34), cam#5 (corner factor 0.857 not 0.75). The CAD block had ZERO arithmetic errors (geometry/GD&T facts).
- **Ingestion (golf/india own the shard-safe writer):** stage [N] + verified-[C] items into per-domain tribal corpora / wiki. Do NOT hand-write the live tribal index.
- **safety=yes items (28 across both waves):** advisory recall now; specialist (foxtrot/whiskey/mike/kilo/echo/delta) confirms the threshold vs the cited page before it fires a gate.
- **Hermes lane:** all 6 via xAI Grok grok-4.20-0309-reasoning (cloud, OAuth, re-authed authenticated:true) -- free, out-of-context. Standing research lane [[reference_hermes_live_utilized_2026_06_29]].
