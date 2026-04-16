# MCAT-MS0 Canonical Legality Extract

Date: 2026-04-02  
Parent milestone: `MCAT-MS0`  
Lane: `MCAT-MS0 / P1-U01 support`  
Roadmap unit: `U-MVAR04`

Derived from:

- [data/machines/ENHANCED/json/ALL_MACHINES_ENRICHED.json](H:/PRISM/data/machines/ENHANCED/json/ALL_MACHINES_ENRICHED.json)
- [mcp-server/src/utils/calculatorToolHolderCatalog.ts](H:/PRISM/mcp-server/src/utils/calculatorToolHolderCatalog.ts)
- [MCAT_MS0_VARIABILITY_CENSUS_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_VARIABILITY_CENSUS_2026-04-02.json)
- [MCAT_MS0_LEGALITY_GRAPH_SPEC_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_LEGALITY_GRAPH_SPEC_2026-04-02.json)
- [MCAT_MS0_COVERAGE_METRIC_CONTRACT_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_COVERAGE_METRIC_CONTRACT_2026-04-02.json)

## Intent

Materialize the first canonical legality extract directly from the merged machine corpus plus the live holder database, so later MCAT coverage runs can enumerate legal machine/controller/spindle/coolant/holder states from backend truth instead of frontend approximation.

## Summary

- Machines processed: `920`
- Holder-eligible machines: `871`
- Holder signatures: `51`
- Zero-holder signatures: `25`
- Machines with unpublished controller labels: `0`
- Machines with unpublished spindle or turret interfaces: `71`
- Machines with empty coolant sets: `180`

## Partition Counts

- mill: `654`
- lathe: `134`
- mill_turn: `67`
- swiss: `37`
- vtl: `13`
- laser: `8`
- wire_edm: `4`
- sinker_edm: `2`
- router: `1`

## Axis Topology Counts

- 3_axis_vertical: `346`
- 5_axis_vertical: `205`
- 3_axis_horizontal: `77`
- mill_turn: `67`
- 2_axis_lathe: `65`
- swiss: `37`
- y_axis_lathe: `36`
- sub_spindle_lathe: `33`
- 5_axis_horizontal: `14`
- vtl: `13`
- 4_axis_horizontal: `12`
- laser: `8`

## Published Controller Counts

- unknown unknown: `174`
- Siemens SINUMERIK 840D sl: `111`
- Fanuc 31i-B5: `79`
- Haas NGC: `74`
- MAZATROL SmoothG: `68`
- Haas Next Generation Control: `57`
- Hurco WinMax: `38`
- Okuma OSP-P300MA: `33`
- Fanuc 0i-MF: `25`
- MAZATROL SmoothX: `25`
- Fanuc 31i-B: `22`
- FANUC 31i-B5: `20`

## Holder Signature Families

- `{"layoutKind":"magazine","mode":"mill","spindleConnectionTypeId":"cat40"}`: machines=`157`, holders=`909`, sample=`cincinnati_maxim_500, MAZAK_VC_Ez_15, FADAL_VMC_4020, FADAL_VMC_6030, FADAL_VMC_3016L, Brother_SPEEDIO_F600X1, Brother_SPEEDIO_H550Xd1, Brother_SPEEDIO_M140X1`
- `{"layoutKind":"magazine","mode":"mill","spindleConnectionTypeId":"bt40"}`: machines=`153`, holders=`951`, sample=`brother_s1000x1, brother_m140x1, brother_m200x3, brother_w1000xd1, doosan_dnm4500, doosan_dnm5700, doosan_dvf5000, doosan_dvf6500`
- `{"layoutKind":"magazine","mode":"mill","spindleConnectionTypeId":"hsk-a63"}`: machines=`122`, holders=`918`, sample=`chiron_fz12s, chiron_mill800, cincinnati_u5_400, cincinnati_u5_600, cincinnati_gammtech, DMG_DMU_50_3RD_GEN, DMG_DMU_65_MONOBLOCK, DMG_DMC_80H`
- `{"layoutKind":"magazine","mode":"mill","spindleConnectionTypeId":"cat50"}`: machines=`72`, holders=`906`, sample=`mhi_mvr_cx50, mhi_mvr_40, MAZAK_VTC_800_30SD, MAZAK_HCN_10800_II, MAZAK_MEGA_6800, MAZAK_MEGA_10800, YCM_NXV_1260A, YCM_NH630A`
- `{"layoutKind":"magazine","mode":"mill","spindleConnectionTypeId":"hsk-a100"}`: machines=`51`, holders=`841`, sample=`cincinnati_lancer_v5, cincinnati_lancer_1250_5x, cincinnati_mag5x, cincinnati_v5_3000, fidia_gtr_4500, fidia_gtf_3014, grob_g550, grob_g750`
- `{"layoutKind":"magazine","mode":"mill","spindleConnectionTypeId":"bt50"}`: machines=`42`, holders=`922`, sample=`AWEA_LP_3021, doosan_dnm6700, doosan_nhp5000, doosan_nhp6300, FEELER_FMH_500, FEELER_FDC_2114, HAAS_VF6, HAAS_VF3YT_50`
- `{"hasMillingHead":false,"layoutKind":"turret","liveTooling":false,"mode":"lathe","turretCount":1,"turretTypeId":"vdi40"}`: machines=`37`, holders=`32`, sample=`DMG_NLX_2500, DMG_CTV_250, FEELER_FTC_20, FEELER_FVL_1250, HAAS_ST_20, HAAS_ST_35, hardinge_conquestt42, hardinge_conquestt51`
- `{"hasMillingHead":false,"layoutKind":"gang","liveTooling":false,"mode":"lathe","turretCount":1,"turretTypeId":"gang"}`: machines=`34`, holders=`0`, sample=`TRAUB_TNL12_7B, CITIZEN_L12_X, CITIZEN_M16_V, CITIZEN_K16_VII, STAR_SR_10JN, STAR_SB_16RIII, TSUGAMI_SS20_V, TSUGAMI_S205_V`
- `{"hasMillingHead":false,"layoutKind":"turret","liveTooling":true,"mode":"lathe","turretCount":1,"turretTypeId":"vdi40"}`: machines=`30`, holders=`129`, sample=`HAAS_ST_20Y, MAZAK_QT_COMPACT_300MSY, MAZAK_QTN_200MY_L, OKUMA_LB3000EX_II_MY, OKUMA_LB3000EX_II_MYS, DN_PUMA_2100SY_II, DN_PUMA_GT_2600M, INDEX_R200`
- `{"layoutKind":"magazine","mode":"mill","spindleConnectionTypeId":"bt30"}`: machines=`25`, holders=`0`, sample=`brother_s300x1, brother_s500x1, brother_s500z1, brother_s700x1, brother_r450x1, brother_r650x1, fanuc_robodrill_d14mia5, fanuc_robodrill_d21mia5`
- `{"hasMillingHead":false,"layoutKind":"turret","liveTooling":true,"mode":"lathe","turretCount":1,"turretTypeId":"vdi50"}`: machines=`16`, holders=`129`, sample=`OKUMA_LB4000EX_II, OKUMA_LB4000EX_II_MY, DN_PUMA_3100Y, HARDINGE_GS_300MSY, TRAUB_TNA400, SPINNER_TTS_65_SMC, MAZAK_QTN_300MSY, MAZAK_QTN_450M`
- `{"layoutKind":"magazine","mode":"mill","spindleConnectionTypeId":"hsk-e40"}`: machines=`12`, holders=`96`, sample=`fidia_k199, HERMLE_C_12_U, kern_microhd, MAKINO_IQ500, ROKU_GENOS_M460_VE, sodick_hs430l, TAKUMI_H10, yasda_ymc430`

## Zero-Holder Signatures

- `{"hasMillingHead":false,"layoutKind":"gang","liveTooling":false,"mode":"lathe","turretCount":1,"turretTypeId":"gang"}`: machines=`34`
- `{"layoutKind":"magazine","mode":"mill","spindleConnectionTypeId":"bt30"}`: machines=`25`
- `{"layoutKind":"magazine","mode":"mill","spindleConnectionTypeId":"a2-8"}`: machines=`10`
- `{"layoutKind":"magazine","mode":"mill","spindleConnectionTypeId":"a2-11"}`: machines=`8`
- `{"layoutKind":"magazine","mode":"mill","spindleConnectionTypeId":"hsk-e50"}`: machines=`8`
- `{"hasMillingHead":false,"layoutKind":"turret","liveTooling":false,"mode":"lathe","turretCount":1,"turretTypeId":"disc"}`: machines=`7`
- `{"layoutKind":"magazine","mode":"mill","spindleConnectionTypeId":"hsk-e25"}`: machines=`4`
- `{"layoutKind":"magazine","mode":"mill","spindleConnectionTypeId":"iso50"}`: machines=`4`
- `{"hasMillingHead":false,"layoutKind":"gang","liveTooling":false,"mode":"lathe","turretCount":1,"turretTypeId":"vdi40"}`: machines=`3`
- `{"layoutKind":"magazine","mode":"mill","spindleConnectionTypeId":"a2-6"}`: machines=`3`
- `{"hasMillingHead":false,"layoutKind":"turret","liveTooling":true,"mode":"lathe","turretCount":2,"turretTypeId":"dual-bmt"}`: machines=`2`
- `{"hasMillingHead":true,"layoutKind":"turret","liveTooling":true,"mode":"lathe","turretCount":1,"turretTypeId":"drum"}`: machines=`2`

## Dominant Gap Classes

- Lathe-style tooling layout is missing a published turret interface.: `63`
- Zero-holder legality for gang:gang: `34`
- Zero-holder legality for magazine:bt30: `25`
- Holder legality is not applicable for this non-spindle partition.: `14`
- Zero-holder legality for magazine:a2-8: `10`
- Mill spindle interface is unpublished, so holder legality cannot be resolved.: `8`
- Zero-holder legality for magazine:a2-11: `8`
- Zero-holder legality for magazine:hsk-e50: `8`
- Zero-holder legality for turret:disc: `7`
- Mill-turn machine publishes a magazine/tool changer but no milling spindle interface.: `6`
- Zero-holder legality for magazine:hsk-e25: `4`
- Zero-holder legality for magazine:iso50: `4`

## Current Read

- The canonical machine corpus is rich enough to infer partitions, controller labels, coolant sets, spindle/turret interfaces, and first-pass capability bundles for all `920` machines.
- The live holder catalog already resolves strong mill and turret-lathe legality, but the current holder surface still exposes real topology gaps:
  - swiss gang layouts produce zero-holder legality because the holder catalog currently publishes lathe holders as turret-only
  - several mill-turn rows publish a tool changer without a corresponding milling spindle interface
  - disc/drum or generic BMT turret labels remain too ambiguous for strict holder compatibility
- This extract is ready to serve as the denominator source for `U-MVAR05` unwired-source recovery and the first mixed-strength legality proof runs.
