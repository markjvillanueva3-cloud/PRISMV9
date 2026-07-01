# SIX-DOMAIN auto-firing coverage -- live VALIDATE

> generated 2026-07-01T00:49:03.144Z
> Proves the per-domain approach-knowledge auto-firing layer (the "pull automatically"
> mechanism) fires for every goal domain. Read-only audit. Source of truth:
> scripts/lib/<d>-approach-knowledge.mjs + .claude/hooks/bundles/ups-domain-bundle.mjs.

| domain | slot | ops | gates (verified/total) | verify-backlog | fires | bundle-wired |
|--------|------|-----|------------------------|----------------|-------|--------------|
| mill | foxtrot | 15 | 7/7 | 8 | yes (50g/15op) | yes |
| post | echo | 11 | 12/12 | 8 | yes (5g/11op) | yes |
| cad | delta | 7 | 6/6 | 8 | yes (14g/7op) | yes |
| cam | kilo | 7 | 16/16 | 5 | yes (29g/7op) | yes |
| wedm | mike | 8 | 17/17 | 3 | yes (55g/8op) | yes |
| lathe | whiskey | 14 | 12/12 | 8 | yes (65g/14op) | yes |

## Rollup
- domains audited: **6**
- all six fire live: **yes**
- all six bundle-wired: **yes**
- verified gates fleet-wide: **70/70**
- specialist verify-backlog (tracked unverified gaps): **40**

## Verify-backlog worklist (owner confirms each vs the cited source before it can drive a gate)
### mill (foxtrot) -- 8 unverified gap(s)
- [ ] Altintas-Budak ZOA stability-lobe a_lim + tooth-passing spindle-speed numbers UNVERIFIED -- do not quote stability-pocket numbers until the Altintas PDFs are read (reference_mill_vault_enrichment_2026_06_29 gap#1/tip12; wiki/mill/_staging/deep-domain-research-2026-06-09.md)
- [ ] 5-axis TCP/RTCP + C/B-axis sync has no RTCP-math / tilted-plane-transform gate -- kinematics page exists but C/B sync are open threads (reference_mill_vault_enrichment_2026_06_29 gap#2)
- [ ] Trochoidal/adaptive radial-engagement math (MRR-invariant feed + ramp logic) not bound to a gate -- HSM shipped in synthesis, no dedicated page (reference_mill_vault_enrichment_2026_06_29 gap#3)
- [ ] Harvey end-mill deflection L^3/d^4: structure verified but numeric core-diameter constants owner-gated + no worked example -- the L/d limit is not a quantified gate (reference_mill_vault_enrichment_2026_06_29 gap#4/tip10; knowledge/wiki/mill/mill-foundations.md)
- [ ] SFC material-name normalization mismatch between the speed-feed engine and the dispatcher -- normalize the material key before trusting a returned regime; root cause unconfirmed (reference_mill_vault_enrichment_2026_06_29 gap#5/tip13; mill_synthesis.md open threads)
- [ ] Sandvik entering-angle rule governs cutting-force DIRECTION but numeric constants owner-gated -- entering-angle -> radial/axial force split is not a quantified gate (reference_mill_vault_enrichment_2026_06_29 tip9; knowledge/wiki/mill/mill-foundations.md)
- [ ] 5 mill algorithm-primitive mappings (DTW force-signature align, Viterbi/BeamSearch wear-state decode, Savitzky-Golay load smoothing, GMM/KNN regime cluster, RANSAC probe-plane fit) wired but NOT exercised -- no worked example (reference_mill_vault_enrichment_2026_06_29 tips4-8)
- [ ] Climb-vs-conventional: climb is the cited default but the conventional-milling exception list is not enumerated in source (reference_mill_vault_enrichment_2026_06_29 tip15; mill_synthesis.md)

### post (echo) -- 8 unverified gap(s)
- [ ] 5-axis TCP/RTCP per-vendor mechanics (G68.2/RTCP) only on M460V-5AX; general 5-axis TCP + C-axis lathe engine open (reference_post-processor_vault_enrichment_2026_06_29 gap#2; Fanuc G68.2 + Heidenhain PLANE + Okuma OSP-P300 5-axis manuals)
- [ ] Canned-cycle cross-controller equivalence matrix (G81-G89/G98/G99 vs Heidenhain CYCLE DEF vs Okuma OSP) NOT synthesized (reference_post-processor_vault_enrichment_2026_06_29 gap#3; ISO 6983 + Smid CNC Programming Handbook)
- [ ] Golden-NC byte-equivalence CI stated as policy but tooling NOT confirmed complete for all 15 controllers (reference_post-processor_vault_enrichment_2026_06_29 gap#4; feedback_echo_cps_byte_equivalence)
- [ ] Wire-EDM post dialect: 5 WEDMPost* engines stub-wired/collision-locked; mike(physics)->echo(emit) cut-condition->NC boundary protocol underspecified (reference_post-processor_vault_enrichment_2026_06_29 gap#5/tip15)
- [ ] Stage 5.1b alarm-check reachability: whether all 2,588 controller-alarm-database.json entries are reachable vs only MASTER_ALARM_DATABASE.json is UNMEASURED -- do not claim full alarm coverage (reference_post-processor_vault_enrichment_2026_06_29 gap+tip9)
- [ ] Post-coverage ~40% P0 machine: 4 named gaps Haas PRE-NGC, Roku-Roku, EA sinker EDM, FA10S mis-route (reference_post-processor_vault_enrichment_2026_06_29 gap#8; CLAUDE.md sec8)
- [ ] deep-domain-research-2026-06-09.md dialect research (Haas G187/Settings 191/22/85, Fanuc G05.1 Q1 look-ahead, Siemens CYCLE8x) all UNVERIFIED -- verify vs public manuals before any emit relies on them (reference_post-processor_vault_enrichment_2026_06_29 tip10)
- [ ] Numeric G/M constants from autodesk-2014-gcode-language.md are METHOD/STRUCTURE-confirmed only; every promoted numeric remains UNVERIFIED-in-staging (reference_post-processor_vault_enrichment_2026_06_29 tip12)

### cad (delta) -- 8 unverified gap(s)
- [ ] Tolerance stack-up closed-form (MMC bonus-tolerance math, DOF-per-datum, worst-case/statistical formulas) absent from confirmed surfaces (reference_cad_vault_enrichment_2026_06_29 gap#2; cad-foundations.md sec7) -- source ASME Y14.5-2018 normative text
- [ ] Electrode design geometry (overburn/spark-gap offset, corner radius, taper, graphite-vs-copper) on NO confirmed surface -- electrode nominal != cavity nominal (reference_cad_vault_enrichment_2026_06_29 gap#3/tip14; EDM vendor docs + JM DIE)
- [ ] Trilobe / non-round lobe geometry + form-tolerance measurement + gauging: ZERO confirmed coverage -- any trilobe form rule cited today is fabrication risk (reference_cad_vault_enrichment_2026_06_29 gap#4/tip15; JM DIE die programs + form-gauging standards)
- [ ] Feature-recognition -> DFM concrete rule tables (min wall, undercut, EDM accessibility) absent; DFMAwareGenerationEngine is a concept node only (reference_cad_vault_enrichment_2026_06_29 gap#9; Boothroyd-Knight DFMA + BRepGAT)
- [ ] CATIA/Creo/AutoCAD add-in bridges exist (CATIACAAV5/CreoToolkit/AutoCADDotNet) but NO confirmed integration test results (reference_cad_vault_enrichment_2026_06_29 gap#10)
- [ ] AP242 numeric specifics (AIM/Domain-Model schema, ISO GPS vs ASME zone values) structurally confirmed but numerically owner-gated (reference_cad_vault_enrichment_2026_06_29 gap#1; _staging/deep-domain-research-2026-06-09.md; ISO 10303-242)
- [ ] Live closed-loop CAD corrections are NOT persisted to training data -- the loop does not 'learn' until the persistence thread closes (reference_cad_vault_enrichment_2026_06_29 gap#5/tip12; cad_synthesis.md)
- [ ] cad artifact gate flips PENDING->SHIPPED on file EXISTENCE not validation (R12) (reference_cad_vault_enrichment_2026_06_29 gap#7/tip11; cad_synthesis.md)

### cam (kilo) -- 5 unverified gap(s)
- [ ] rest_machining scallop/cusp-height TRIGGER threshold (formulas exist in RestMachiningEngine.ts:19-20; the MIN scallop-mm that triggers rest is not in code)
- [ ] 5-axis singularity ANGLE threshold (cam/CLAUDE.md:115 says defer to cam_multiaxis_recommend; the numeric tilt/lean limit was not located)
- [ ] cross-vendor holder-clearance minimum (mm) after Mastercam->hyperMILL transfer (CLAUDE.md:124 says re-validate; no quantified gate)
- [ ] Fusion 360 rest-machining explicit stock-source rule (CLAUDE.md:131 references knowledge/wiki/cam/cam-foundations.md; rule not read)
- [ ] hyperMILL blade-roughing tilt-angle optimization (CLAUDE.md:118-120 defers to cam_hypermill_strategy_kb_for_geometry; no numeric gate)

### wedm (mike) -- 3 unverified gap(s)
- [ ] taper wire-deflection compensation ALGORITHM (constant wire_bow_per_deg_taper_um exists; full correction algo not located -- verify WEDMTaperErrorBudgetEngine source + FA-10S UV telemetry)
- [ ] no-core cut SEQUENCING (skims must return to rough entry/exit; out-of-sequence leaves micro-tabs -- WEDMNoCoreCutSequencerEngine not found by glob)
- [ ] working gap-voltage != open-circuit-voltage correction formula (WEDMGapVoltageControlEngine not read -- verify model + FA-10S param map)

### lathe (whiskey) -- 8 unverified gap(s)
- [ ] Material-specific quantitative infeed/heat/chatter thresholds beyond the <=16 TPI rule not bound (reference_lathe_vault_enrichment_2026_06_29 G1; lathe_synthesis.md open threads) -- drain Sandvik/Kennametal/Iscar turning catalogs for per-ISO infeed/Vc/feed tables
- [ ] Cost-optimal Vc optimizer not physics-backed; 220 vs 209 m/min Gilbert-target discrepancy unconfirmed (reference_lathe_vault_enrichment_2026_06_29 G2; GilbertEconomicSpeedEngine)
- [ ] Okuma real collision geometry (turret/chuck/swing) for LTH-01..07 is PLACEHOLDER; U-W-COLLISION-GEOM open (reference_lathe_vault_enrichment_2026_06_29 G3; JM DIE/CNC OKUMA MULTUS running programs)
- [ ] G76 threading validator misses specific defects (reference_lathe_vault_enrichment_2026_06_29 G4; node_formula g76_thread_validator_design) -- source Haas/Fanuc threading manuals + JM ACME/THREAD .MIN ground truth
- [ ] LatheSurfaceFinishEngine cited but existence UNCONFIRMED (reference_lathe_vault_enrichment_2026_06_29 G8; CLAUDE.md S12) -- duplication-guard + ENGINE_DIGEST before any build
- [ ] S5 lathe gotchas are alpha-authored hypotheses, NOT whiskey-refined; no canonical lathe-soul; U-GALAXY-MS1-D3 open (reference_lathe_vault_enrichment_2026_06_29 G11)
- [ ] Per-op cost attribution A/B: accurate cycle_time_sec did NOT move the uneconomical count -- attribution alone is not the lever (reference_lathe_vault_enrichment_2026_06_29 tip5; _SYNTHESIS.md)
- [ ] Algorithm-to-turning primitive map (SavGol/DTW/Viterbi/GMM-KNN/RANSAC) wired-vs-proposed unconfirmed (reference_lathe_vault_enrichment_2026_06_29 tip15; MEMORY.md algo-primitives)
