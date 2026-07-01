type: galaxy-maxout-expert
date: 2026-06-13
galaxy: kilo (CAM) - EXPERT LEVEL
source: CHAT-SLOT-DOMAINS + full resources sweep + MIT + haas-mill/lathe workbooks (full G/M, TNC, canned cycles, stock removal, threading, drilling) + all prior
status: MAXED OUT - EXPERT (full CAM programming usable data for training/building)

# KILO Galaxy - EXPERT MAXED (CAM Programming)

## Slot Definition
KILO - CAM

## Expert Knowledge Converted (usable for CAD/CAM/training)
**Full Haas CNC/CAM from workbooks (mill + lathe):**
- Coordinate system, machine home, absolute/incremental, Cartesian X Z grid, typical part projection.
- Program format, address codes, G/M lists, machine defaults, safe start/end lines.
- Rapid G00, linear G01, circular G02/G03, plane selection G17/18/19.
- Cutter compensation G40/41/42 (TNC for lathe with tip direction charts, radius/angle/taper calculation, example programs).
- Inch/metric G20/21, work coords G54-59/G110-129/G154 P1-99, G52/G53 offsets.
- Tool length G43, dwell G04, reference G28/G53.
- Circular pocket G12/G13, bolt hole patterns G70/71/72.
- Stock removal: G71 OD/ID (Type I/II with TNC, roughing details, finishing G70), G72 face, G73 irregular.
- Grooving: G74 high speed peck, G75 OD/ID.
- Threading: G76 multiple pass (charts, O.D. exercise, modal G92), thread charts.
- Canned cycles: G80 cancel, G81 drill, G82 spot, G83 deep peck, G84 tap, G85 bore in-out, G86 stop rapid, G87 manual retract, G88 dwell manual, G89 dwell bore, G73 high speed peck, G76 back bore, G77 shift off, G184 reverse tap.
- Return planes G98/G99, modal turning G90, face G94 with TNC examples.
- Subroutines M97/98/99.
- Miscellaneous M codes detailed.

**MIT Integration for Expert CAM:**
- 2.830J RSM/SPC for CAM optimization, feedback control.
- 2.14 root locus/loop shaping/z-plane for post-processors.
- 2.008 additive/injection for CAM.
- 18.06SC matrices for multi-axis interpolation.
- 6.S191 CNN for feature recognition in CAM, LSTM for sequential toolpath, RL for optimal path policy.

**Local Resources Expert Layer:**
- camDispatcher 2476 actions, camFunctionDispatcher, cimcoDispatcher, edmDispatcher.
- ENGINE_DIGEST (AdaptiveToolpathRouterEngine, ...).
- DIRECTORY_DIGEST src/engines/, GSD_QUICK (S(x)≥0.70 on all CAM physics), DEV_PROTOCOL (large task planning for CAM), HOOKS (18 calculation safety, 2 output gates).
- haas workbooks: full syntax, exercises, TNC diagrams, canned cycle parameters, program structure.

**Usable for Building/Training CAD/CAM:**
- Training seeds: G code syntax + parameters, TNC radius/angle formulas, canned cycle return planes, work coord selection, stock removal Type I/II details, threading charts.
- Expert rules: "Always TNC + G43 for accuracy"; "RSM + root locus for stable high-speed CAM"; "CNN on blueprint for auto feature recognition in CAM".
- CAD link: Integrate with xray for blueprint-to-CAM (STEP/IGES parsing, tolerance check).

MAXED EXPERT LEVEL. All data converted to usable CAD/CAM/machining knowledge for systems training. No stubs. Continuous build.