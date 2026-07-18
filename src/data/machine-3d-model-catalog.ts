/**
 * Machine 3D Model Catalog -- STEP file references and CAD metadata
 *
 * Source: PRISM_MACHINE_3D_MODEL_DATABASE_V3.js (225 models, 12 manufacturers)
 *         PRISM_OKUMA_MACHINE_CAD_DATABASE.js (35 Okuma models with assemblies)
 * Generated: 2026-03-07
 */

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

/** Machine type classification for 3D models */
export type Machine3DModelType =
  | '3AXIS_VMC'
  | '4AXIS_HMC'
  | '4AXIS_VMC'
  | '5AXIS_ADDITIVE'
  | '5AXIS_COMPACT'
  | '5AXIS_DIRECT'
  | '5AXIS_GANTRY'
  | '5AXIS_MILL_TURN'
  | '5AXIS_SWIVEL'
  | '5AXIS_SWIVEL_ROTARY'
  | '5AXIS_TABLE'
  | '5AXIS_TRUNNION'
  | '5AXIS_UNIVERSAL'
  | 'DOUBLE_COLUMN'
  | 'DRILL_TAP'
  | 'DUAL_COLUMN'
  | 'GANTRY_MILL'
  | 'HMC'
  | 'MULTITASK_VERTICAL'
  | 'VTL_MILL_TURN';

/** Entry for a machine with a 3D STEP model reference */
export interface Machine3DModelEntry {
  /** Unique identifier */
  id: string;
  /** Machine manufacturer */
  manufacturer: string;
  /** Machine model name */
  model: string;
  /** Machine type classification */
  type: Machine3DModelType;
  /** STEP file name */
  stepFile: string;
  /** Whether a 3D model file exists */
  has3DModel: boolean;
  /** Model complexity (face count estimate from STEP parser) */
  complexity?: number;
  /** Assembly component names (from STEP assembly tree) */
  assemblies?: string[];
  /** Collision zone detection status */
  collisionZones?: string;
  /** File geometry metadata */
  geometry?: { fileSize: number; facesEstimate: number };
  /** Data source identifier */
  source?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// V3 DATABASE — 225 machines across 12 manufacturers
// ════════════════════════════════════════════════════════════════════════════

export const MACHINE_3D_MODEL_CATALOG: Machine3DModelEntry[] = [
  { id: 'brother_speedio_f600x1', manufacturer: 'Brother', model: 'Brother SPEEDIO F600X1', type: '3AXIS_VMC', stepFile: 'Brother SPEEDIO F600X1.step', has3DModel: true, complexity: 3380 },
  { id: 'brother_speedio_h550xd1', manufacturer: 'Brother', model: 'Brother SPEEDIO H550Xd1', type: 'HMC', stepFile: 'Brother SPEEDIO H550Xd1.step', has3DModel: true, complexity: 2714 },
  { id: 'brother_speedio_m140x1', manufacturer: 'Brother', model: 'Brother SPEEDIO M140X1', type: '3AXIS_VMC', stepFile: 'Brother SPEEDIO M140X1.step', has3DModel: true, complexity: 3469 },
  { id: 'brother_speedio_m200xd1', manufacturer: 'Brother', model: 'Brother SPEEDIO M200Xd1', type: '3AXIS_VMC', stepFile: 'Brother SPEEDIO M200Xd1.step', has3DModel: true, complexity: 4315 },
  { id: 'brother_speedio_m300x3', manufacturer: 'Brother', model: 'Brother SPEEDIO M300X3', type: '3AXIS_VMC', stepFile: 'Brother SPEEDIO M300X3.step', has3DModel: true, complexity: 4087 },
  { id: 'brother_speedio_m300xd1', manufacturer: 'Brother', model: 'Brother SPEEDIO M300Xd1', type: '3AXIS_VMC', stepFile: 'Brother SPEEDIO M300Xd1.step', has3DModel: true, complexity: 3655 },
  { id: 'brother_speedio_r450xd1', manufacturer: 'Brother', model: 'Brother SPEEDIO R450Xd1', type: '3AXIS_VMC', stepFile: 'Brother SPEEDIO R450Xd1.step', has3DModel: true, complexity: 3460 },
  { id: 'brother_speedio_r650xd1', manufacturer: 'Brother', model: 'Brother SPEEDIO R650Xd1', type: '3AXIS_VMC', stepFile: 'Brother SPEEDIO R650Xd1.step', has3DModel: true, complexity: 2616 },
  { id: 'brother_speedio_s300xd1', manufacturer: 'Brother', model: 'Brother SPEEDIO S300Xd1', type: '3AXIS_VMC', stepFile: 'Brother SPEEDIO S300Xd1.step', has3DModel: true, complexity: 2463 },
  { id: 'brother_speedio_s300xd2', manufacturer: 'Brother', model: 'Brother SPEEDIO S300Xd2', type: '3AXIS_VMC', stepFile: 'Brother SPEEDIO S300Xd2.step', has3DModel: true, complexity: 2540 },
  { id: 'brother_speedio_s500xd1', manufacturer: 'Brother', model: 'Brother SPEEDIO S500Xd1', type: '3AXIS_VMC', stepFile: 'Brother SPEEDIO S500Xd1.step', has3DModel: true, complexity: 1975 },
  { id: 'brother_speedio_s500xd2', manufacturer: 'Brother', model: 'Brother SPEEDIO S500Xd2', type: '3AXIS_VMC', stepFile: 'Brother SPEEDIO S500Xd2.step', has3DModel: true, complexity: 2719 },
  { id: 'brother_speedio_s700xd1', manufacturer: 'Brother', model: 'Brother SPEEDIO S700Xd1', type: '3AXIS_VMC', stepFile: 'Brother SPEEDIO S700Xd1.step', has3DModel: true, complexity: 2649 },
  { id: 'brother_speedio_s700xd2', manufacturer: 'Brother', model: 'Brother SPEEDIO S700Xd2', type: '3AXIS_VMC', stepFile: 'Brother SPEEDIO S700Xd2.step', has3DModel: true, complexity: 2732 },
  { id: 'brother_speedio_u500xd1', manufacturer: 'Brother', model: 'Brother SPEEDIO U500Xd1', type: '3AXIS_VMC', stepFile: 'Brother SPEEDIO U500Xd1.step', has3DModel: true, complexity: 2592 },
  { id: 'brother_speedio_u500xd2', manufacturer: 'Brother', model: 'Brother SPEEDIO U500Xd2', type: '3AXIS_VMC', stepFile: 'Brother SPEEDIO U500Xd2.step', has3DModel: true, complexity: 3060 },
  { id: 'brother_speedio_w1000xd1', manufacturer: 'Brother', model: 'Brother SPEEDIO W1000Xd1', type: '3AXIS_VMC', stepFile: 'Brother SPEEDIO W1000Xd1.step', has3DModel: true, complexity: 1816 },
  { id: 'brother_speedio_w1000xd2', manufacturer: 'Brother', model: 'Brother SPEEDIO W1000Xd2', type: '3AXIS_VMC', stepFile: 'Brother SPEEDIO W1000Xd2.step', has3DModel: true, complexity: 2071 },
  { id: 'datron_m8cube_3_axis', manufacturer: 'DATRON', model: 'DATRON M8Cube 3 axis', type: '5AXIS_TRUNNION', stepFile: 'DATRON M8Cube 3 axis.step', has3DModel: true, complexity: 542 },
  { id: 'datron_m8cube_4_axis', manufacturer: 'DATRON', model: 'DATRON M8Cube 4 axis', type: '5AXIS_TRUNNION', stepFile: 'DATRON M8Cube 4 axis.step', has3DModel: true, complexity: 1896 },
  { id: 'datron_m8cube_5_axis', manufacturer: 'DATRON', model: 'DATRON M8Cube 5 axis', type: '5AXIS_TRUNNION', stepFile: 'DATRON M8Cube 5 axis.step', has3DModel: true, complexity: 905 },
  { id: 'datron_neo', manufacturer: 'DATRON', model: 'DATRON neo', type: '5AXIS_TRUNNION', stepFile: 'DATRON neo.step', has3DModel: true, complexity: 7329 },
  { id: 'datron_neo_4_axis', manufacturer: 'DATRON', model: 'DATRON neo 4 axis', type: '5AXIS_TRUNNION', stepFile: 'DATRON neo 4 axis.step', has3DModel: true, complexity: 7329 },
  { id: 'dn_solutions_dnm_4000', manufacturer: 'DN Solutions', model: 'DN Solutions DNM 4000', type: '3AXIS_VMC', stepFile: 'DN Solutions DNM 4000.step', has3DModel: true, complexity: 4096 },
  { id: 'dn_solutions_dnm_5700', manufacturer: 'DN Solutions', model: 'DN Solutions DNM 5700', type: '3AXIS_VMC', stepFile: 'DN Solutions DNM 5700.step', has3DModel: true, complexity: 3397 },
  { id: 'dn_solutions_dvf_5000', manufacturer: 'DN Solutions', model: 'DN Solutions DVF 5000', type: '3AXIS_VMC', stepFile: 'DN Solutions DVF 5000.step', has3DModel: true, complexity: 4715 },
  { id: 'dn_solutions_dvf_6500', manufacturer: 'DN Solutions', model: 'DN Solutions DVF 6500', type: '3AXIS_VMC', stepFile: 'DN Solutions DVF 6500.step', has3DModel: true, complexity: 3847 },
  { id: 'dn_solutions_dvf_8000', manufacturer: 'DN Solutions', model: 'DN Solutions DVF 8000', type: '3AXIS_VMC', stepFile: 'DN Solutions DVF 8000.step', has3DModel: true, complexity: 6373 },
  { id: 'haas_cm_1', manufacturer: 'Haas', model: 'HAAS CM-1', type: '3AXIS_VMC', stepFile: 'HAAS CM-1.step', has3DModel: true, complexity: 643 },
  { id: 'haas_ec_1600', manufacturer: 'Haas', model: 'HAAS EC-1600', type: 'HMC', stepFile: 'HAAS EC-1600.step', has3DModel: true, complexity: 896 },
  { id: 'haas_ec_1600zt', manufacturer: 'Haas', model: 'HAAS EC-1600ZT', type: 'HMC', stepFile: 'HAAS EC-1600ZT.step', has3DModel: true, complexity: 3372 },
  { id: 'haas_ec_500', manufacturer: 'Haas', model: 'HAAS EC-500', type: 'HMC', stepFile: 'HAAS EC-500.step', has3DModel: true, complexity: 5954 },
  { id: 'haas_ec_500_50', manufacturer: 'Haas', model: 'HAAS EC-500-50', type: 'HMC', stepFile: 'HAAS EC-500-50.step', has3DModel: true, complexity: 7256 },
  { id: 'haas_ec_630', manufacturer: 'Haas', model: 'HAAS EC-630', type: 'HMC', stepFile: 'HAAS EC-630.step', has3DModel: true, complexity: 6082 },
  { id: 'haas_mini_mill', manufacturer: 'Haas', model: 'HAAS Mini Mill', type: '3AXIS_VMC', stepFile: 'HAAS Mini Mill.step', has3DModel: true, complexity: 547 },
  { id: 'haas_mini_mill_2', manufacturer: 'Haas', model: 'HAAS Mini Mill 2', type: '3AXIS_VMC', stepFile: 'HAAS Mini Mill 2.step', has3DModel: true, complexity: 2200 },
  { id: 'haas_mini_mill_edu', manufacturer: 'Haas', model: 'HAAS Mini Mill-EDU', type: '3AXIS_VMC', stepFile: 'HAAS Mini Mill-EDU.step', has3DModel: true, complexity: 2758 },
  { id: 'haas_mini_mill_edu_with_hrt160_trunnion_table', manufacturer: 'Haas', model: 'HAAS Mini Mill-EDU WITH HRT160 TRUNNION TABLE', type: '3AXIS_VMC', stepFile: 'HAAS Mini Mill-EDU WITH HRT160 TRUNNION TABLE.step', has3DModel: true, complexity: 2822 },
  { id: 'haas_tm_1', manufacturer: 'Haas', model: 'HAAS TM-1', type: '3AXIS_VMC', stepFile: 'HAAS TM-1.step', has3DModel: true, complexity: 290 },
  { id: 'haas_tm_1p', manufacturer: 'Haas', model: 'HAAS TM-1P', type: '3AXIS_VMC', stepFile: 'HAAS TM-1P.step', has3DModel: true, complexity: 304 },
  { id: 'haas_tm_2', manufacturer: 'Haas', model: 'HAAS TM-2', type: '3AXIS_VMC', stepFile: 'HAAS TM-2.step', has3DModel: true, complexity: 1260 },
  { id: 'haas_tm_2p', manufacturer: 'Haas', model: 'HAAS TM-2P', type: '3AXIS_VMC', stepFile: 'HAAS TM-2P.step', has3DModel: true, complexity: 1276 },
  { id: 'haas_tm_3p', manufacturer: 'Haas', model: 'HAAS TM-3P', type: '3AXIS_VMC', stepFile: 'HAAS TM-3P.step', has3DModel: true, complexity: 1134 },
  { id: 'haas_umc_750', manufacturer: 'Haas', model: 'HAAS UMC-750', type: '5AXIS_TRUNNION', stepFile: 'HAAS UMC-750.step', has3DModel: true, complexity: 1343 },
  { id: 'haas_umc_750ss', manufacturer: 'Haas', model: 'HAAS UMC-750SS', type: '5AXIS_TRUNNION', stepFile: 'HAAS UMC-750SS.step', has3DModel: true, complexity: 8346 },
  { id: 'haas_umc_750_new_design', manufacturer: 'Haas', model: 'HAAS UMC-750 NEW DESIGN', type: '5AXIS_TRUNNION', stepFile: 'HAAS UMC-750 NEW DESIGN.step', has3DModel: true, complexity: 8054 },
  { id: 'haas_vc_400', manufacturer: 'Haas', model: 'HAAS VC-400', type: '3AXIS_VMC', stepFile: 'HAAS VC-400.step', has3DModel: true, complexity: 6388 },
  { id: 'haas_vf_1', manufacturer: 'Haas', model: 'HAAS VF-1', type: '3AXIS_VMC', stepFile: 'HAAS VF-1.step', has3DModel: true, complexity: 471 },
  { id: 'haas_vf_10_50', manufacturer: 'Haas', model: 'HAAS VF-10-50', type: '3AXIS_VMC', stepFile: 'HAAS VF-10-50.step', has3DModel: true, complexity: 1501 },
  { id: 'haas_vf_11_50', manufacturer: 'Haas', model: 'HAAS VF-11-50', type: '3AXIS_VMC', stepFile: 'HAAS VF-11-50.step', has3DModel: true, complexity: 1329 },
  { id: 'haas_vf_12_40', manufacturer: 'Haas', model: 'HAAS VF-12-40', type: '3AXIS_VMC', stepFile: 'HAAS VF-12-40.step', has3DModel: true, complexity: 1572 },
  { id: 'haas_vf_14_40', manufacturer: 'Haas', model: 'HAAS VF-14-40', type: '3AXIS_VMC', stepFile: 'HAAS VF-14-40.step', has3DModel: true, complexity: 6730 },
  { id: 'haas_vf_14_50', manufacturer: 'Haas', model: 'HAAS VF-14-50', type: '3AXIS_VMC', stepFile: 'HAAS VF-14-50.step', has3DModel: true, complexity: 6648 },
  { id: 'haas_vf_2', manufacturer: 'Haas', model: 'HAAS VF-2', type: '3AXIS_VMC', stepFile: 'HAAS VF-2.step', has3DModel: true, complexity: 591 },
  { id: 'haas_vf_2_tr', manufacturer: 'Haas', model: 'HAAS VF-2 TR', type: '5AXIS_TRUNNION', stepFile: 'HAAS VF-2 TR.step', has3DModel: true, complexity: 728 },
  { id: 'haas_vf_2_with_trt100_tilting_rotary_rable', manufacturer: 'Haas', model: 'HAAS VF-2 WITH TRT100 TILTING ROTARY RABLE', type: '3AXIS_VMC', stepFile: 'HAAS VF-2 WITH TRT100 TILTING ROTARY RABLE.step', has3DModel: true, complexity: 1486 },
  { id: 'haas_vf_3', manufacturer: 'Haas', model: 'HAAS VF-3', type: '3AXIS_VMC', stepFile: 'HAAS VF-3.step', has3DModel: true, complexity: 661 },
  { id: 'haas_vf_3yt', manufacturer: 'Haas', model: 'HAAS VF-3YT', type: '3AXIS_VMC', stepFile: 'HAAS VF-3YT.step', has3DModel: true, complexity: 1348 },
  { id: 'haas_vf_3_with_tr160_trunnion_rotary_table', manufacturer: 'Haas', model: 'HAAS VF-3 WITH TR160 TRUNNION ROTARY TABLE', type: '3AXIS_VMC', stepFile: 'HAAS VF-3 WITH TR160 TRUNNION ROTARY TABLE.step', has3DModel: true, complexity: 1395 },
  { id: 'haas_vf_4', manufacturer: 'Haas', model: 'HAAS VF-4', type: '3AXIS_VMC', stepFile: 'HAAS VF-4.step', has3DModel: true, complexity: 732 },
  { id: 'haas_vf_5_40', manufacturer: 'Haas', model: 'HAAS VF-5-40', type: '3AXIS_VMC', stepFile: 'HAAS VF-5-40.step', has3DModel: true, complexity: 2468 },
  { id: 'haas_vf_6_40', manufacturer: 'Haas', model: 'HAAS VF-6-40', type: '3AXIS_VMC', stepFile: 'HAAS VF-6-40.step', has3DModel: true, complexity: 807 },
  { id: 'haas_vf_7_40', manufacturer: 'Haas', model: 'HAAS VF-7-40', type: '3AXIS_VMC', stepFile: 'HAAS VF-7-40.step', has3DModel: true, complexity: 2403 },
  { id: 'haas_vf_8_40', manufacturer: 'Haas', model: 'HAAS VF-8-40', type: '3AXIS_VMC', stepFile: 'HAAS VF-8-40.step', has3DModel: true, complexity: 1029 },
  { id: 'haas_vm_3', manufacturer: 'Haas', model: 'HAAS VM-3', type: '3AXIS_VMC', stepFile: 'HAAS VM-3.step', has3DModel: true, complexity: 2570 },
  { id: 'haas_vm_6', manufacturer: 'Haas', model: 'HAAS VM-6', type: '3AXIS_VMC', stepFile: 'HAAS VM-6.step', has3DModel: true, complexity: 3591 },
  { id: 'heller_hf_3500', manufacturer: 'Heller', model: 'Heller HF 3500', type: '3AXIS_VMC', stepFile: 'Heller HF 3500.step', has3DModel: true, complexity: 6152 },
  { id: 'heller_hf_5500', manufacturer: 'Heller', model: 'Heller HF 5500', type: '3AXIS_VMC', stepFile: 'Heller HF 5500.step', has3DModel: true, complexity: 5334 },
  { id: 'hurco_bx40i', manufacturer: 'Hurco', model: 'Hurco BX40i', type: '3AXIS_VMC', stepFile: 'Hurco BX40i.step', has3DModel: true, complexity: 6823 },
  { id: 'hurco_bx50i', manufacturer: 'Hurco', model: 'Hurco BX50i', type: '3AXIS_VMC', stepFile: 'Hurco BX50i.step', has3DModel: true, complexity: 5934 },
  { id: 'hurco_dcx3226i', manufacturer: 'Hurco', model: 'Hurco DCX3226i', type: '3AXIS_VMC', stepFile: 'Hurco DCX3226i.step', has3DModel: true, complexity: 4017 },
  { id: 'hurco_dcx32_5si', manufacturer: 'Hurco', model: 'Hurco DCX32 5Si', type: '3AXIS_VMC', stepFile: 'Hurco DCX32 5Si.step', has3DModel: true, complexity: 7993 },
  { id: 'hurco_hbmx_55_i', manufacturer: 'Hurco', model: 'Hurco HBMX 55 i', type: '3AXIS_VMC', stepFile: 'Hurco HBMX 55 i.step', has3DModel: true, complexity: 332 },
  { id: 'hurco_hbmx_80_i', manufacturer: 'Hurco', model: 'Hurco HBMX 80 i', type: '3AXIS_VMC', stepFile: 'Hurco HBMX 80 i.step', has3DModel: true, complexity: 548 },
  { id: 'hurco_hurco_vmx_42_sr', manufacturer: 'Hurco', model: 'Hurco Hurco VMX 42 SR', type: '3AXIS_VMC', stepFile: 'Hurco Hurco VMX 42 SR.step', has3DModel: true, complexity: 591 },
  { id: 'hurco_vmx24i', manufacturer: 'Hurco', model: 'Hurco VMX24i', type: '3AXIS_VMC', stepFile: 'Hurco VMX24i.step', has3DModel: true, complexity: 6836 },
  { id: 'hurco_vmx60swi', manufacturer: 'Hurco', model: 'Hurco VMX60SWi', type: '3AXIS_VMC', stepFile: 'Hurco VMX60SWi.step', has3DModel: true, complexity: 5255 },
  { id: 'hurco_vmx_24_hsi', manufacturer: 'Hurco', model: 'Hurco VMX 24 HSi', type: '3AXIS_VMC', stepFile: 'Hurco VMX 24 HSi.step', has3DModel: true, complexity: 6924 },
  { id: 'hurco_vmx_24_hsi_4ax', manufacturer: 'Hurco', model: 'Hurco VMX 24 HSi 4ax', type: '4AXIS_VMC', stepFile: 'Hurco VMX 24 HSi 4ax.step', has3DModel: true, complexity: 7256 },
  { id: 'hurco_vmx_42t_4ax', manufacturer: 'Hurco', model: 'Hurco VMX 42T 4ax', type: '4AXIS_VMC', stepFile: 'Hurco VMX 42T 4ax.step', has3DModel: true, complexity: 530 },
  { id: 'hurco_vmx_42_ui_xp40_sta', manufacturer: 'Hurco', model: 'Hurco VMX 42 Ui XP40 STA', type: '3AXIS_VMC', stepFile: 'Hurco VMX 42 Ui XP40 STA.step', has3DModel: true, complexity: 15273 },
  { id: 'hurco_vmx_60_sri', manufacturer: 'Hurco', model: 'Hurco VMX 60 SRi', type: '3AXIS_VMC', stepFile: 'Hurco VMX 60 SRi.step', has3DModel: true, complexity: 3626 },
  { id: 'hurco_vmx_84_swi', manufacturer: 'Hurco', model: 'Hurco VMX 84 SWi', type: '3AXIS_VMC', stepFile: 'Hurco VMX 84 SWi.step', has3DModel: true, complexity: 17243 },
  { id: 'hurco_vm_10_hsi_plus', manufacturer: 'Hurco', model: 'Hurco VM 10 HSi Plus', type: '3AXIS_VMC', stepFile: 'Hurco VM 10 HSi Plus.step', has3DModel: true, complexity: 4353 },
  { id: 'hurco_vm_10_uhsi', manufacturer: 'Hurco', model: 'Hurco VM 10 UHSi', type: '3AXIS_VMC', stepFile: 'Hurco VM 10 UHSi.step', has3DModel: true, complexity: 4919 },
  { id: 'hurco_vm_20i', manufacturer: 'Hurco', model: 'Hurco VM 20i', type: '3AXIS_VMC', stepFile: 'Hurco VM 20i.step', has3DModel: true, complexity: 3800 },
  { id: 'hurco_vm_30_i', manufacturer: 'Hurco', model: 'Hurco VM 30 i', type: '3AXIS_VMC', stepFile: 'Hurco VM 30 i.step', has3DModel: true, complexity: 5158 },
  { id: 'hurco_vm_50_i', manufacturer: 'Hurco', model: 'Hurco VM 50 i', type: '3AXIS_VMC', stepFile: 'Hurco VM 50 i.step', has3DModel: true, complexity: 5565 },
  { id: 'hurco_vm_5i', manufacturer: 'Hurco', model: 'Hurco VM 5i', type: '3AXIS_VMC', stepFile: 'Hurco VM 5i.step', has3DModel: true, complexity: 3490 },
  { id: 'hurco_vm_one', manufacturer: 'Hurco', model: 'Hurco VM One', type: '3AXIS_VMC', stepFile: 'Hurco VM One.step', has3DModel: true, complexity: 4804 },
  { id: 'kern_evo', manufacturer: 'Kern', model: 'Kern Evo', type: '3AXIS_VMC', stepFile: 'Kern Evo.step', has3DModel: true, complexity: 3181 },
  { id: 'kern_evo_5ax', manufacturer: 'Kern', model: 'Kern Evo 5AX', type: '5AXIS_TRUNNION', stepFile: 'Kern Evo 5AX.step', has3DModel: true, complexity: 3296 },
  { id: 'kern_micro_vario_hd', manufacturer: 'Kern', model: 'Kern Micro Vario HD', type: '3AXIS_VMC', stepFile: 'Kern Micro Vario HD.step', has3DModel: true, complexity: 1260 },
  { id: 'kern_pyramid_nano', manufacturer: 'Kern', model: 'Kern Pyramid Nano', type: '3AXIS_VMC', stepFile: 'Kern Pyramid Nano.step', has3DModel: true, complexity: 4213 },
  { id: 'makino_d200z', manufacturer: 'Makino', model: 'Makino D200Z', type: '3AXIS_VMC', stepFile: 'Makino D200Z.step', has3DModel: true, complexity: 762 },
  { id: 'makino_da300', manufacturer: 'Makino', model: 'Makino DA300', type: '3AXIS_VMC', stepFile: 'Makino DA300.step', has3DModel: true, complexity: 813 },
  { id: 'matsuura_h', manufacturer: 'Matsuura', model: 'Matsuura H', type: '3AXIS_VMC', stepFile: 'Matsuura H.step', has3DModel: true, complexity: 920 },
  { id: 'matsuura_mam72_35v', manufacturer: 'Matsuura', model: 'Matsuura MAM72-35V', type: '3AXIS_VMC', stepFile: 'Matsuura MAM72-35V.step', has3DModel: true, complexity: 1769 },
  { id: 'matsuura_mam72_63v', manufacturer: 'Matsuura', model: 'Matsuura MAM72-63V', type: '3AXIS_VMC', stepFile: 'Matsuura MAM72-63V.step', has3DModel: true, complexity: 739 },
  { id: 'matsuura_mx_330', manufacturer: 'Matsuura', model: 'Matsuura MX-330', type: '3AXIS_VMC', stepFile: 'Matsuura MX-330.step', has3DModel: true, complexity: 1215 },
  { id: 'matsuura_mx_420', manufacturer: 'Matsuura', model: 'Matsuura MX-420', type: '3AXIS_VMC', stepFile: 'Matsuura MX-420.step', has3DModel: true, complexity: 1251 },
  { id: 'matsuura_mx_520', manufacturer: 'Matsuura', model: 'Matsuura MX-520', type: '3AXIS_VMC', stepFile: 'Matsuura MX-520.step', has3DModel: true, complexity: 718 },
  { id: 'matsuura_vx_1000', manufacturer: 'Matsuura', model: 'Matsuura VX-1000', type: '3AXIS_VMC', stepFile: 'Matsuura VX-1000.step', has3DModel: true, complexity: 1203 },
  { id: 'matsuura_vx_1500', manufacturer: 'Matsuura', model: 'Matsuura VX-1500', type: '3AXIS_VMC', stepFile: 'Matsuura VX-1500.step', has3DModel: true, complexity: 318 },
  { id: 'matsuura_vx_1500_with_rna_320r_rotary_table', manufacturer: 'Matsuura', model: 'Matsuura VX-1500 WITH RNA-320R ROTARY TABLE', type: '3AXIS_VMC', stepFile: 'Matsuura VX-1500 WITH RNA-320R ROTARY TABLE.step', has3DModel: true, complexity: 1631 },
  { id: 'matsuura_vx_660', manufacturer: 'Matsuura', model: 'Matsuura VX-660', type: '3AXIS_VMC', stepFile: 'Matsuura VX-660.step', has3DModel: true, complexity: 1069 },
  { id: 'okuma_mb_5000hii', manufacturer: 'Okuma', model: 'OKUMA_MB-5000HII', type: '3AXIS_VMC', stepFile: 'OKUMA_MB-5000HII.step', has3DModel: true, complexity: 14333 },
  { id: 'okuma_genos_m460v_5ax', manufacturer: 'Okuma', model: 'okuma_genos_m460v-5ax', type: '5AXIS_TRUNNION', stepFile: 'okuma_genos_m460v-5ax.step', has3DModel: true, complexity: 2381 },
  { id: 'haas_umc_1500ss_duo', manufacturer: 'Haas', model: 'HAAS UMC-1500SS-DUO', type: '5AXIS_TRUNNION', stepFile: 'HAAS UMC-1500SS-DUO.step', has3DModel: true },
  { id: 'haas_umc_1500_duo', manufacturer: 'Haas', model: 'HAAS UMC-1500-DUO', type: '5AXIS_TRUNNION', stepFile: 'HAAS UMC-1500-DUO.step', has3DModel: true },
  { id: 'haas_umc_1000', manufacturer: 'Haas', model: 'HAAS UMC-1000', type: '5AXIS_TRUNNION', stepFile: 'HAAS UMC-1000.step', has3DModel: true },
  { id: 'haas_umc_1000ss', manufacturer: 'Haas', model: 'HAAS UMC-1000SS', type: '5AXIS_TRUNNION', stepFile: 'HAAS UMC-1000SS.step', has3DModel: true },
  { id: 'haas_umc_1000_p', manufacturer: 'Haas', model: 'HAAS UMC-1000-P', type: '5AXIS_TRUNNION', stepFile: 'HAAS UMC-1000-P.step', has3DModel: true },
  { id: 'haas_umc_400', manufacturer: 'Haas', model: 'HAAS UMC-400', type: '5AXIS_TRUNNION', stepFile: 'HAAS UMC-400.step', has3DModel: true },
  { id: 'haas_umc_350hd_edu', manufacturer: 'Haas', model: 'HAAS UMC 350HD-EDU', type: '5AXIS_TRUNNION', stepFile: 'HAAS UMC 350HD-EDU.step', has3DModel: true },
  { id: 'haas_dm_1', manufacturer: 'Haas', model: 'HAAS DM-1', type: 'DRILL_TAP', stepFile: 'HAAS DM-1.step', has3DModel: true },
  { id: 'haas_dm_2', manufacturer: 'Haas', model: 'HAAS DM-2', type: 'DRILL_TAP', stepFile: 'HAAS DM-2.step', has3DModel: true },
  { id: 'haas_gm_2', manufacturer: 'Haas', model: 'HAAS GM-2', type: 'GANTRY_MILL', stepFile: 'HAAS GM-2.step', has3DModel: true },
  { id: 'haas_desktop_mill', manufacturer: 'Haas', model: 'HAAS Desktop Mill', type: '3AXIS_VMC', stepFile: 'HAAS Desktop Mill.step', has3DModel: true },
  { id: 'haas_super_mini_mill', manufacturer: 'Haas', model: 'HAAS Super Mini Mill', type: '3AXIS_VMC', stepFile: 'HAAS Super Mini Mill.step', has3DModel: true },
  { id: 'haas_vf_2yt', manufacturer: 'Haas', model: 'HAAS VF-2YT', type: '3AXIS_VMC', stepFile: 'HAAS VF-2YT.step', has3DModel: true },
  { id: 'haas_vf_2ssyt', manufacturer: 'Haas', model: 'HAAS VF-2SSYT', type: '3AXIS_VMC', stepFile: 'HAAS VF-2SSYT.step', has3DModel: true },
  { id: 'haas_vf_3yt_50', manufacturer: 'Haas', model: 'HAAS VF-3YT-50', type: '3AXIS_VMC', stepFile: 'HAAS VF-3YT-50.step', has3DModel: true },
  { id: 'haas_vf_10', manufacturer: 'Haas', model: 'HAAS VF-10', type: '3AXIS_VMC', stepFile: 'HAAS VF-10.step', has3DModel: true },
  { id: 'haas_vf_11_40', manufacturer: 'Haas', model: 'HAAS VF-11-40', type: '3AXIS_VMC', stepFile: 'HAAS VF-11-40.step', has3DModel: true },
  { id: 'haas_vf_12_50', manufacturer: 'Haas', model: 'HAAS VF-12-50', type: '3AXIS_VMC', stepFile: 'HAAS VF-12-50.step', has3DModel: true },
  { id: 'haas_ec_400', manufacturer: 'Haas', model: 'HAAS EC-400', type: 'HMC', stepFile: 'HAAS EC-400.step', has3DModel: true },
  { id: 'haas_umc_500ss', manufacturer: 'Haas', model: 'HAAS UMC-500SS', type: '5AXIS_TRUNNION', stepFile: 'HAAS UMC-500SS.step', has3DModel: true },
  { id: 'haas_umc_1250', manufacturer: 'Haas', model: 'HAAS UMC-1250', type: '5AXIS_TRUNNION', stepFile: 'HAAS UMC-1250.step', has3DModel: true },
  { id: 'haas_gm_2_5ax', manufacturer: 'Haas', model: 'HAAS GM-2-5AX', type: '5AXIS_GANTRY', stepFile: 'HAAS GM-2-5AX.step', has3DModel: true },
  { id: 'haas_vf_4ss_with_trt210_trunnion', manufacturer: 'Haas', model: 'HAAS VF-4SS with TRT210 Trunnion', type: '5AXIS_TABLE', stepFile: 'HAAS VF-4SS WITH TRT210 TRUNNION ROTARY TABLE.step', has3DModel: true },
  { id: 'hurco_hm1700ri', manufacturer: 'Hurco', model: 'Hurco HM1700Ri', type: 'HMC', stepFile: 'Hurco HM1700Ri.step', has3DModel: true },
  { id: 'hurco_vmx42swi', manufacturer: 'Hurco', model: 'Hurco VMX42SWi', type: '5AXIS_SWIVEL', stepFile: 'Hurco VMX42SWi.step', has3DModel: true },
  { id: 'hurco_vmx6030i', manufacturer: 'Hurco', model: 'Hurco VMX6030i', type: '3AXIS_VMC', stepFile: 'Hurco VMX6030i.step', has3DModel: true },
  { id: 'hurco_vmx60ui', manufacturer: 'Hurco', model: 'Hurco VMX60Ui', type: '5AXIS_UNIVERSAL', stepFile: 'Hurco VMX60Ui.step', has3DModel: true },
  { id: 'hurco_vc500i', manufacturer: 'Hurco', model: 'Hurco VC500i', type: '3AXIS_VMC', stepFile: 'Hurco VC500i.step', has3DModel: true },
  { id: 'hurco_vmx30ui', manufacturer: 'Hurco', model: 'Hurco VMX30Ui', type: '5AXIS_UNIVERSAL', stepFile: 'Hurco VMX30Ui.step', has3DModel: true },
  { id: 'hurco_bx_40_ui', manufacturer: 'Hurco', model: 'Hurco BX 40 Ui', type: '5AXIS_UNIVERSAL', stepFile: 'Hurco BX 40 Ui.step', has3DModel: true },
  { id: 'hurco_vmx_30_udi', manufacturer: 'Hurco', model: 'Hurco VMX 30 UDi', type: '5AXIS_DIRECT', stepFile: 'Hurco VMX 30 UDi.step', has3DModel: true },
  { id: 'hurco_vcx600i_xp', manufacturer: 'Hurco', model: 'Hurco VCX600i XP', type: '5AXIS_TRUNNION', stepFile: 'Hurco VCX600i XP.step', has3DModel: true },
  { id: 'hurco_vmx60srti', manufacturer: 'Hurco', model: 'Hurco VMX60SRTi', type: '5AXIS_SWIVEL_ROTARY', stepFile: 'Hurco VMX60SRTi.step', has3DModel: true },
  { id: 'hurco_vm10ui', manufacturer: 'Hurco', model: 'Hurco VM10Ui', type: '5AXIS_COMPACT', stepFile: 'Hurco VM10Ui.step', has3DModel: true },
  { id: 'hurco_vmx_84_i', manufacturer: 'Hurco', model: 'Hurco VMX 84 i', type: '3AXIS_VMC', stepFile: 'Hurco VMX 84 i.step', has3DModel: true },
  { id: 'hurco_vmx42di', manufacturer: 'Hurco', model: 'Hurco VMX42Di', type: '5AXIS_DIRECT', stepFile: 'Hurco VMX42Di.step', has3DModel: true },
  { id: 'hurco_vmx30i', manufacturer: 'Hurco', model: 'Hurco VMX30i', type: '3AXIS_VMC', stepFile: 'Hurco VMX30i.step', has3DModel: true },
  { id: 'hurco_vm_60_i', manufacturer: 'Hurco', model: 'Hurco VM 60 i', type: '3AXIS_VMC', stepFile: 'Hurco VM 60 i.step', has3DModel: true },
  { id: 'hurco_dcx_22_i', manufacturer: 'Hurco', model: 'Hurco DCX 22 i', type: 'DUAL_COLUMN', stepFile: 'Hurco DCX 22 i.step', has3DModel: true },
  { id: 'mazak_fjv_35_60', manufacturer: 'Mazak', model: 'Mazak FJV-35/60', type: '3AXIS_VMC', stepFile: 'Mazak FJV-35-60.step', has3DModel: true },
  { id: 'mazak_fjv_35_120', manufacturer: 'Mazak', model: 'Mazak FJV-35/120', type: '3AXIS_VMC', stepFile: 'Mazak FJV-35-120.step', has3DModel: true },
  { id: 'mazak_fjv_60_160', manufacturer: 'Mazak', model: 'Mazak FJV-60/160', type: '3AXIS_VMC', stepFile: 'Mazak FJV-60-160.step', has3DModel: true },
  { id: 'mazak_variaxis_i_800_neo', manufacturer: 'Mazak', model: 'Mazak VARIAXIS i-800 NEO', type: '5AXIS_TRUNNION', stepFile: 'Mazak VARIAXIS i-800 NEO.step', has3DModel: true },
  { id: 'mazak_cv5_500', manufacturer: 'Mazak', model: 'Mazak CV5-500', type: '5AXIS_TRUNNION', stepFile: 'Mazak CV5-500.step', has3DModel: true },
  { id: 'mazak_vtc_300c', manufacturer: 'Mazak', model: 'Mazak VTC-300C', type: '3AXIS_VMC', stepFile: 'Mazak VTC 300C.step', has3DModel: true },
  { id: 'mazak_hcn_10800', manufacturer: 'Mazak', model: 'Mazak HCN-10800', type: 'HMC', stepFile: 'Mazak HCN-1080.step', has3DModel: true },
  { id: 'mazak_hcn_4000', manufacturer: 'Mazak', model: 'Mazak HCN-4000', type: 'HMC', stepFile: 'Mazak HCN-4000.step', has3DModel: true },
  { id: 'mazak_hcn_5000s', manufacturer: 'Mazak', model: 'Mazak HCN-5000S', type: 'HMC', stepFile: 'Mazak HCN-5000S.step', has3DModel: true },
  { id: 'mazak_hcn_6800', manufacturer: 'Mazak', model: 'Mazak HCN-6800', type: 'HMC', stepFile: 'Mazak HCN-6800.step', has3DModel: true },
  { id: 'mazak_hcn_6800_neo', manufacturer: 'Mazak', model: 'Mazak HCN-6800 NEO', type: 'HMC', stepFile: 'Mazak HCN-6800 NEO.step', has3DModel: true },
  { id: 'mazak_hcn_8800', manufacturer: 'Mazak', model: 'Mazak HCN-8800', type: 'HMC', stepFile: 'Mazak HCN-8800.step', has3DModel: true },
  { id: 'mazak_hcn_12800', manufacturer: 'Mazak', model: 'Mazak HCN-12800', type: 'HMC', stepFile: 'Mazak HCN-12800.step', has3DModel: true },
  { id: 'mazak_integrex_e_1060v_6_ii', manufacturer: 'Mazak', model: 'Mazak INTEGREX e-1060V/6 II', type: 'MULTITASK_VERTICAL', stepFile: 'Mazak INTEGREX e-1060V-6 II.step', has3DModel: true },
  { id: 'mazak_integrex_e_1600v_10s', manufacturer: 'Mazak', model: 'Mazak INTEGREX e-1600V/10S', type: 'MULTITASK_VERTICAL', stepFile: 'Mazak INTEGREX e-1600V-10S.step', has3DModel: true },
  { id: 'mazak_variaxis_i_500', manufacturer: 'Mazak', model: 'Mazak VARIAXIS i-500', type: '5AXIS_TRUNNION', stepFile: 'Mazak VARIAXIS i-500.step', has3DModel: true },
  { id: 'mazak_variaxis_i_600', manufacturer: 'Mazak', model: 'Mazak VARIAXIS i-600', type: '5AXIS_TRUNNION', stepFile: 'Mazak VARIAXIS i-600.step', has3DModel: true },
  { id: 'mazak_variaxis_i_700', manufacturer: 'Mazak', model: 'Mazak VARIAXIS i-700', type: '5AXIS_TRUNNION', stepFile: 'Mazak VARIAXIS i-700.step', has3DModel: true },
  { id: 'mazak_variaxis_i_800', manufacturer: 'Mazak', model: 'Mazak VARIAXIS i-800', type: '5AXIS_TRUNNION', stepFile: 'Mazak VARIAXIS i-800.step', has3DModel: true },
  { id: 'mazak_variaxis_i_1050', manufacturer: 'Mazak', model: 'Mazak VARIAXIS i-1050', type: '5AXIS_TRUNNION', stepFile: 'Mazak VARIAXIS i-1050.step', has3DModel: true },
  { id: 'mazak_variaxis_630_5x_ii_t', manufacturer: 'Mazak', model: 'Mazak VARIAXIS 630-5X II T', type: '5AXIS_TRUNNION', stepFile: 'Mazak VARIAXIS 630-5X II T.step', has3DModel: true },
  { id: 'mazak_variaxis_j_500', manufacturer: 'Mazak', model: 'Mazak Variaxis J-500', type: '5AXIS_TRUNNION', stepFile: 'Mazak Variaxis J-500.step', has3DModel: true },
  { id: 'mazak_variaxis_j_600', manufacturer: 'Mazak', model: 'Mazak VARIAXIS j-600', type: '5AXIS_TRUNNION', stepFile: 'Mazak VARIAXIS j-600.step', has3DModel: true },
  { id: 'mazak_variaxis_c_600', manufacturer: 'Mazak', model: 'Mazak Variaxis C-600', type: '5AXIS_TRUNNION', stepFile: 'Mazak Variaxis C-600.step', has3DModel: true },
  { id: 'mazak_variaxis_i_300_awc', manufacturer: 'Mazak', model: 'Mazak Variaxis i-300 AWC', type: '5AXIS_TRUNNION', stepFile: 'Mazak Variaxis i-300 AWC.step', has3DModel: true },
  { id: 'mazak_variaxis_i_700t', manufacturer: 'Mazak', model: 'Mazak Variaxis i-700T', type: '5AXIS_MILL_TURN', stepFile: 'Mazak Variaxis i-700T.step', has3DModel: true },
  { id: 'mazak_vc_ez_16', manufacturer: 'Mazak', model: 'Mazak VC-Ez 16', type: '3AXIS_VMC', stepFile: 'Mazak VC-Ez 16.step', has3DModel: true },
  { id: 'mazak_vc_ez_20', manufacturer: 'Mazak', model: 'Mazak VC-Ez 20', type: '3AXIS_VMC', stepFile: 'Mazak VC-Ez 20.step', has3DModel: true },
  { id: 'mazak_vc_ez_20_15000_rpm', manufacturer: 'Mazak', model: 'Mazak VC-Ez 20 15000 RPM', type: '3AXIS_VMC', stepFile: 'Mazak VC-Ez 20 15000 RPM SPINDLE.step', has3DModel: true },
  { id: 'mazak_vc_ez_26', manufacturer: 'Mazak', model: 'Mazak VC-Ez 26', type: '3AXIS_VMC', stepFile: 'Mazak VC-Ez 26.step', has3DModel: true },
  { id: 'mazak_vc_ez_26_with_mr250_rotary', manufacturer: 'Mazak', model: 'Mazak VC-Ez 26 with MR250 Rotary', type: '4AXIS_VMC', stepFile: 'Mazak VC-Ez 26 with MR250 Rotary.step', has3DModel: true },
  { id: 'mazak_vcn_510c_ii', manufacturer: 'Mazak', model: 'Mazak VCN 510C-II', type: '3AXIS_VMC', stepFile: 'Mazak VCN 510C-II.step', has3DModel: true },
  { id: 'mazak_vcn_530c', manufacturer: 'Mazak', model: 'Mazak VCN 530C', type: '3AXIS_VMC', stepFile: 'Mazak VCN 530C.step', has3DModel: true },
  { id: 'mazak_vcn_570', manufacturer: 'Mazak', model: 'Mazak VCN-570', type: '3AXIS_VMC', stepFile: 'Mazak VCN-570.step', has3DModel: true },
  { id: 'mazak_vcn_570c', manufacturer: 'Mazak', model: 'Mazak VCN-570C', type: '3AXIS_VMC', stepFile: 'Mazak VCN-570C.step', has3DModel: true },
  { id: 'mazak_vtc_530c', manufacturer: 'Mazak', model: 'Mazak VTC-530C', type: '3AXIS_VMC', stepFile: 'Mazak VTC-530C.step', has3DModel: true },
  { id: 'mazak_vtc_800_30sr', manufacturer: 'Mazak', model: 'Mazak VTC-800/30SR', type: '5AXIS_SWIVEL_ROTARY', stepFile: 'Mazak VTC-800-30SR.step', has3DModel: true },
  { id: 'mazak_vtc_800_30sdr', manufacturer: 'Mazak', model: 'Mazak VTC-800/30SDR', type: '5AXIS_SWIVEL_ROTARY', stepFile: 'Mazak VTC-800-30SDR.step', has3DModel: true },
  { id: 'mazak_vc_500_am', manufacturer: 'Mazak', model: 'Mazak VC-500 AM', type: '5AXIS_ADDITIVE', stepFile: 'Mazak VC-500 AM.step', has3DModel: true },
  { id: 'mazak_vcu_500a_5x', manufacturer: 'Mazak', model: 'Mazak VCU-500A 5X', type: '5AXIS_TRUNNION', stepFile: 'Mazak VCU-500A 5X.step', has3DModel: true },
  { id: 'okuma_genos_m460_ve_e', manufacturer: 'Okuma', model: 'OKUMA GENOS M460-VE-e', type: '3AXIS_VMC', stepFile: 'OKUMA GENOS M460-VE-e.step', has3DModel: true },
  { id: 'okuma_genos_m560_v_e', manufacturer: 'Okuma', model: 'OKUMA GENOS M560-V-e', type: '3AXIS_VMC', stepFile: 'OKUMA GENOS M560-V-e.step', has3DModel: true },
  { id: 'okuma_genos_m560_va_hc', manufacturer: 'Okuma', model: 'OKUMA GENOS M560-VA-HC', type: '3AXIS_VMC', stepFile: 'OKUMA GENOS M560-VA-HC.step', has3DModel: true },
  { id: 'okuma_genos_m660_va', manufacturer: 'Okuma', model: 'OKUMA GENOS M660-VA', type: '3AXIS_VMC', stepFile: 'OKUMA GENOS M660-VA.step', has3DModel: true },
  { id: 'okuma_genos_m660_vb', manufacturer: 'Okuma', model: 'OKUMA GENOS M660-VB', type: '3AXIS_VMC', stepFile: 'OKUMA GENOS M660-VB.step', has3DModel: true },
  { id: 'okuma_ma_500hii', manufacturer: 'Okuma', model: 'OKUMA MA-500HII', type: 'HMC', stepFile: 'OKUMA MA-500HII.step', has3DModel: true },
  { id: 'okuma_ma_550vb', manufacturer: 'Okuma', model: 'OKUMA MA-550VB', type: '3AXIS_VMC', stepFile: 'OKUMA MA-550VB.step', has3DModel: true },
  { id: 'okuma_ma_600h', manufacturer: 'Okuma', model: 'OKUMA MA-600H', type: 'HMC', stepFile: 'OKUMA MA-600H.step', has3DModel: true },
  { id: 'okuma_ma_600hii', manufacturer: 'Okuma', model: 'OKUMA MA-600HII', type: 'HMC', stepFile: 'OKUMA MA-600HII.step', has3DModel: true },
  { id: 'okuma_ma_650vb', manufacturer: 'Okuma', model: 'OKUMA MA-650VB', type: '3AXIS_VMC', stepFile: 'OKUMA MA-650VB.step', has3DModel: true },
  { id: 'okuma_mb_4000h', manufacturer: 'Okuma', model: 'OKUMA MB-4000H', type: 'HMC', stepFile: 'OKUMA MB-4000H.step', has3DModel: true },
  { id: 'okuma_mb_46vae', manufacturer: 'Okuma', model: 'OKUMA MB-46VAE', type: '3AXIS_VMC', stepFile: 'OKUMA MB-46VAE.step', has3DModel: true },
  { id: 'okuma_mb_5000h', manufacturer: 'Okuma', model: 'OKUMA MB-5000H', type: 'HMC', stepFile: 'OKUMA MB-5000H.step', has3DModel: true },
  { id: 'okuma_mb_56va', manufacturer: 'Okuma', model: 'OKUMA MB-56VA', type: '3AXIS_VMC', stepFile: 'OKUMA MB-56VA.step', has3DModel: true },
  { id: 'okuma_mb_66va', manufacturer: 'Okuma', model: 'OKUMA MB-66VA', type: '3AXIS_VMC', stepFile: 'OKUMA MB-66VA.step', has3DModel: true },
  { id: 'okuma_mb_8000h', manufacturer: 'Okuma', model: 'OKUMA MB-8000H', type: 'HMC', stepFile: 'OKUMA MB-8000H.step', has3DModel: true },
  { id: 'okuma_mcr_a5cii_25x40', manufacturer: 'Okuma', model: 'OKUMA MCR-A5CII 25x40', type: 'DOUBLE_COLUMN', stepFile: 'OKUMA MCR-A5CII 25x40.step', has3DModel: true },
  { id: 'okuma_mcr_biii_25e_25x40', manufacturer: 'Okuma', model: 'OKUMA MCR-BIII 25E 25x40', type: 'DOUBLE_COLUMN', stepFile: 'OKUMA MCR-BIII 25E 25x40.step', has3DModel: true },
  { id: 'okuma_mcr_biii_25e_25x50', manufacturer: 'Okuma', model: 'OKUMA MCR-BIII 25E 25x50', type: 'DOUBLE_COLUMN', stepFile: 'OKUMA MCR-BIII 25E 25x50.step', has3DModel: true },
  { id: 'okuma_mcr_biii_35e_35x65', manufacturer: 'Okuma', model: 'OKUMA MCR-BIII 35E 35x65', type: 'DOUBLE_COLUMN', stepFile: 'OKUMA MCR-BIII 35E 35x65.step', has3DModel: true },
  { id: 'okuma_millac_33t', manufacturer: 'Okuma', model: 'OKUMA MILLAC 33T', type: '5AXIS_TRUNNION', stepFile: 'OKUMA MILLAC 33T.step', has3DModel: true },
  { id: 'okuma_millac_761vii', manufacturer: 'Okuma', model: 'OKUMA MILLAC 761VII', type: '3AXIS_VMC', stepFile: 'OKUMA MILLAC 761VII.step', has3DModel: true },
  { id: 'okuma_millac_800vh', manufacturer: 'Okuma', model: 'OKUMA MILLAC 800VH', type: '3AXIS_VMC', stepFile: 'OKUMA MILLAC 800VH.step', has3DModel: true },
  { id: 'okuma_millac_852vii', manufacturer: 'Okuma', model: 'OKUMA MILLAC 852VII', type: '3AXIS_VMC', stepFile: 'OKUMA MILLAC 852VII.step', has3DModel: true },
  { id: 'okuma_millac_1052vii', manufacturer: 'Okuma', model: 'OKUMA MILLAC 1052VII', type: '3AXIS_VMC', stepFile: 'OKUMA MILLAC 1052VII.step', has3DModel: true },
  { id: 'okuma_mu_400va', manufacturer: 'Okuma', model: 'OKUMA MU-400VA', type: '5AXIS_TRUNNION', stepFile: 'OKUMA MU-400VA.step', has3DModel: true },
  { id: 'okuma_mu_500va', manufacturer: 'Okuma', model: 'OKUMA MU-500VA', type: '5AXIS_TRUNNION', stepFile: 'OKUMA MU-500VA.step', has3DModel: true },
  { id: 'okuma_mu_500val', manufacturer: 'Okuma', model: 'OKUMA MU-500VAL', type: '5AXIS_TRUNNION', stepFile: 'OKUMA MU-500VAL.step', has3DModel: true },
  { id: 'okuma_mu_4000v', manufacturer: 'Okuma', model: 'OKUMA MU-4000V', type: '5AXIS_TRUNNION', stepFile: 'OKUMA MU-4000V.step', has3DModel: true },
  { id: 'okuma_mu_5000v', manufacturer: 'Okuma', model: 'OKUMA MU-5000V', type: '5AXIS_TRUNNION', stepFile: 'OKUMA MU-5000V.step', has3DModel: true },
  { id: 'okuma_mu_6300v', manufacturer: 'Okuma', model: 'OKUMA MU-6300V', type: '5AXIS_TRUNNION', stepFile: 'OKUMA MU-6300V.step', has3DModel: true },
  { id: 'okuma_mu_8000v', manufacturer: 'Okuma', model: 'OKUMA MU-8000V', type: '5AXIS_TRUNNION', stepFile: 'OKUMA MU-8000V.step', has3DModel: true },
  { id: 'okuma_vtm_80yb', manufacturer: 'Okuma', model: 'OKUMA VTM-80YB', type: 'MULTITASK_VERTICAL', stepFile: 'OKUMA VTM-80YB.step', has3DModel: true },
  { id: 'okuma_vtm_1200yb', manufacturer: 'Okuma', model: 'OKUMA VTM-1200YB', type: 'MULTITASK_VERTICAL', stepFile: 'OKUMA VTM-1200YB.step', has3DModel: true },
  { id: 'okuma_vtm_2000yb', manufacturer: 'Okuma', model: 'OKUMA VTM-2000YB', type: 'MULTITASK_VERTICAL', stepFile: 'OKUMA VTM-2000YB.step', has3DModel: true },
  { id: 'dmg_mori_dmu_70_evolution', manufacturer: 'DMG MORI', model: 'DMG MORI DMU 70 eVolution', type: '5AXIS_TRUNNION', stepFile: 'DMU_70_eVolution_-__max_eley_-_2022.step', has3DModel: true },
  { id: 'dmg_mori_dmu_65_fd_monoblock', manufacturer: 'DMG MORI', model: 'DMG MORI DMU 65 FD monoBLOCK', type: '5AXIS_MILL_TURN', stepFile: 'DMU_65_FD.stp', has3DModel: true },
  { id: 'dmg_mori_dmu_75_monoblock', manufacturer: 'DMG MORI', model: 'DMG MORI DMU 75 monoBLOCK', type: '5AXIS_TRUNNION', stepFile: 'DMU75monoBLOK.stp', has3DModel: true },
];

// ════════════════════════════════════════════════════════════════════════════
// OKUMA CAD DATABASE — 35 models with assembly structures + collision zones
// ════════════════════════════════════════════════════════════════════════════

export const OKUMA_CAD_CATALOG: Machine3DModelEntry[] = [
  { id: 'okuma_genos_m460_ve_e', manufacturer: 'Okuma', model: 'OKUMA GENOS M460-VE-e', type: '3AXIS_VMC', stepFile: 'OKUMA GENOS M460-VE-e.step', has3DModel: true, assemblies: ['static:1', 'z axis head:1', 'y axis table:1', 'x axis head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 3953600, facesEstimate: 8 }, source: 'uploaded_cad' },
  { id: 'okuma_genos_m560_v_e', manufacturer: 'Okuma', model: 'OKUMA GENOS M560-V-e', type: '3AXIS_VMC', stepFile: 'OKUMA GENOS M560-V-e.step', has3DModel: true, assemblies: ['static:1', 'z axis head (1):1', 'y axis table:1', 'x axis head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 3490664, facesEstimate: 4 }, source: 'uploaded_cad' },
  { id: 'okuma_genos_m560_va_hc', manufacturer: 'Okuma', model: 'OKUMA GENOS M560-VA-HC', type: '3AXIS_VMC', stepFile: 'OKUMA GENOS M560-VA-HC.step', has3DModel: true, assemblies: ['Base:1', 'Enclosure:1', 'X-Axis:1', 'Y-Axis:1', 'Z-Axis:1'], collisionZones: 'auto_detected', geometry: { fileSize: 6736475, facesEstimate: 3 }, source: 'uploaded_cad' },
  { id: 'okuma_genos_m660_va', manufacturer: 'Okuma', model: 'OKUMA GENOS M660-VA', type: '3AXIS_VMC', stepFile: 'OKUMA GENOS M660-VA.step', has3DModel: true, assemblies: ['static:1', 'y_axis_table:1', 'x_axis_head:1', 'z_axis_head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 4352805, facesEstimate: 0 }, source: 'uploaded_cad' },
  { id: 'okuma_genos_m660_vb', manufacturer: 'Okuma', model: 'OKUMA GENOS M660-VB', type: '3AXIS_VMC', stepFile: 'OKUMA GENOS M660-VB.step', has3DModel: true, assemblies: ['static:1', 'y_axis_table:1', 'x_axis_head:1', 'z_axis_head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 4321652, facesEstimate: 0 }, source: 'uploaded_cad' },
  { id: 'okuma_ma_500hii', manufacturer: 'Okuma', model: 'OKUMA MA-500HII', type: '4AXIS_HMC', stepFile: 'OKUMA MA-500HII.step', has3DModel: true, assemblies: ['static:1', 'b axis table:1', 'x axis head:1', 'y axis head:1', 'z axis table:1'], collisionZones: 'auto_detected', geometry: { fileSize: 1202994, facesEstimate: 0 }, source: 'uploaded_cad' },
  { id: 'okuma_ma_550vb', manufacturer: 'Okuma', model: 'OKUMA MA-550VB', type: '3AXIS_VMC', stepFile: 'OKUMA MA-550VB.step', has3DModel: true, assemblies: ['static:1', 'x axis table:1', 'y axis head:1', 'z axis head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 1474783, facesEstimate: 0 }, source: 'uploaded_cad' },
  { id: 'okuma_ma_600h', manufacturer: 'Okuma', model: 'OKUMA MA-600H', type: '4AXIS_HMC', stepFile: 'OKUMA MA-600H.step', has3DModel: true, assemblies: ['static:1', 'z axis table:1', 'b axis table:1', 'x axis head:1', 'y axis head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 1440815, facesEstimate: 0 }, source: 'uploaded_cad' },
  { id: 'okuma_ma_600hii', manufacturer: 'Okuma', model: 'OKUMA MA-600HII', type: '4AXIS_HMC', stepFile: 'OKUMA MA-600HII.step', has3DModel: true, assemblies: ['static:1', 'z axis table:1', 'b axis table:1', 'x axis head:1', 'y axis head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 1991944, facesEstimate: 0 }, source: 'uploaded_cad' },
  { id: 'okuma_ma_650vb', manufacturer: 'Okuma', model: 'OKUMA MA-650VB', type: '3AXIS_VMC', stepFile: 'OKUMA MA-650VB.step', has3DModel: true, assemblies: ['static:1', 'x axis table:1', 'z axis head:1', 'y axis head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 1544962, facesEstimate: 0 }, source: 'uploaded_cad' },
  { id: 'okuma_mb_4000h', manufacturer: 'Okuma', model: 'OKUMA MB-4000H', type: '4AXIS_HMC', stepFile: 'OKUMA MB-4000H.step', has3DModel: true, assemblies: ['static:1', 'x axis head:1', 'y axis head:1', 'z axis table:1', 'b axis table:1'], collisionZones: 'auto_detected', geometry: { fileSize: 1615051, facesEstimate: 14 }, source: 'uploaded_cad' },
  { id: 'okuma_mb_46vae', manufacturer: 'Okuma', model: 'OKUMA MB-46VAE', type: '3AXIS_VMC', stepFile: 'OKUMA MB-46VAE.step', has3DModel: true, assemblies: ['static:1', 'y axis table:1', 'z axis head:1', 'x axis head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 2421514, facesEstimate: 6 }, source: 'uploaded_cad' },
  { id: 'okuma_mb_5000h', manufacturer: 'Okuma', model: 'OKUMA MB-5000H', type: '4AXIS_HMC', stepFile: 'OKUMA MB-5000H.step', has3DModel: true, assemblies: ['static:1', 'y axis head:1', 'x axis head:1', 'z axis table:1', 'b axis table:1'], collisionZones: 'auto_detected', geometry: { fileSize: 1645688, facesEstimate: 14 }, source: 'uploaded_cad' },
  { id: 'okuma_mb_56va', manufacturer: 'Okuma', model: 'OKUMA MB-56VA', type: '3AXIS_VMC', stepFile: 'OKUMA MB-56VA.step', has3DModel: true, assemblies: ['y axis table:1', 'static:1', 'z axis head:1', 'x axis head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 865762, facesEstimate: 6 }, source: 'uploaded_cad' },
  { id: 'okuma_mb_66va', manufacturer: 'Okuma', model: 'OKUMA MB-66VA', type: '3AXIS_VMC', stepFile: 'OKUMA MB-66VA.step', has3DModel: true, assemblies: ['static:1', 'y axis table:1', 'x axis table:1', 'z axis head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 1311818, facesEstimate: 6 }, source: 'uploaded_cad' },
  { id: 'okuma_mb_8000h', manufacturer: 'Okuma', model: 'OKUMA MB-8000H', type: '4AXIS_HMC', stepFile: 'OKUMA MB-8000H.step', has3DModel: true, assemblies: ['static:1', 'z axis table:1', 'b axis table:1', 'x axis head:1', 'y axis head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 2222609, facesEstimate: 2 }, source: 'uploaded_cad' },
  { id: 'okuma_mcr_a5cii_25x40', manufacturer: 'Okuma', model: 'OKUMA MCR-A5CII 25x40', type: 'DOUBLE_COLUMN', stepFile: 'OKUMA MCR-A5CII 25x40.step', has3DModel: true, assemblies: ['static:1', 'x_axis_table:1', 'y_axis_head:1', 'z_axis_head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 709658, facesEstimate: 33 }, source: 'uploaded_cad' },
  { id: 'okuma_mcr_biii_25e_25x40', manufacturer: 'Okuma', model: 'OKUMA MCR-BIII 25E 25x40', type: 'DOUBLE_COLUMN', stepFile: 'OKUMA MCR-BIII 25E 25x40.step', has3DModel: true, assemblies: ['static:1', 'x_axis_table:1', 'y_axis_head:1', 'z_axis_head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 1278590, facesEstimate: 33 }, source: 'uploaded_cad' },
  { id: 'okuma_mcr_biii_25e_25x50', manufacturer: 'Okuma', model: 'OKUMA MCR-BIII 25E 25x50', type: 'DOUBLE_COLUMN', stepFile: 'OKUMA MCR-BIII 25E 25x50.step', has3DModel: true, assemblies: ['static:1', 'x_axis_head:1', 'y_axis_head:1', 'z_axis_head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 1353469, facesEstimate: 33 }, source: 'uploaded_cad' },
  { id: 'okuma_mcr_biii_35e_35x65', manufacturer: 'Okuma', model: 'OKUMA MCR-BIII 35E 35x65', type: 'DOUBLE_COLUMN', stepFile: 'OKUMA MCR-BIII 35E 35x65.step', has3DModel: true, assemblies: ['static:1', 'x_axis_table:1', 'y_axis_head:1', 'z_axis_head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 1495191, facesEstimate: 32 }, source: 'uploaded_cad' },
  { id: 'okuma_millac_1052vii', manufacturer: 'Okuma', model: 'OKUMA MILLAC 1052VII', type: '3AXIS_VMC', stepFile: 'OKUMA MILLAC 1052VII.step', has3DModel: true, assemblies: ['static:1', 'z axis head:1', 'x axis table:1', 'y axis table:1'], collisionZones: 'auto_detected', geometry: { fileSize: 1128685, facesEstimate: 0 }, source: 'uploaded_cad' },
  { id: 'okuma_millac_33t', manufacturer: 'Okuma', model: 'OKUMA MILLAC 33T', type: '5AXIS_TRUNNION', stepFile: 'OKUMA MILLAC 33T.step', has3DModel: true, assemblies: ['static:1', 'y axis head:1', 'x axis head:1', 'z axis head:1', 'c axis table:1'], collisionZones: 'auto_detected', geometry: { fileSize: 963103, facesEstimate: 0 }, source: 'uploaded_cad' },
  { id: 'okuma_millac_761vii', manufacturer: 'Okuma', model: 'OKUMA MILLAC 761VII', type: '3AXIS_VMC', stepFile: 'OKUMA MILLAC 761VII.step', has3DModel: true, assemblies: ['static:1', 'z axis head:1', 'x axis table:1', 'y axis table:1'], collisionZones: 'auto_detected', geometry: { fileSize: 1734668, facesEstimate: 8 }, source: 'uploaded_cad' },
  { id: 'okuma_millac_800vh', manufacturer: 'Okuma', model: 'OKUMA MILLAC 800VH', type: '3AXIS_VMC', stepFile: 'OKUMA MILLAC 800VH.step', has3DModel: true, assemblies: ['static:1', 'c_axis_table:1', 'y_axis_table:1', 'x_axis_head:1', 'z_axis_head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 1813208, facesEstimate: 0 }, source: 'uploaded_cad' },
  { id: 'okuma_millac_852vii', manufacturer: 'Okuma', model: 'OKUMA MILLAC 852VII', type: '3AXIS_VMC', stepFile: 'OKUMA MILLAC 852VII.step', has3DModel: true, assemblies: ['static:1', 'y axis table:1', 'x axis table:1', 'z axis head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 1247917, facesEstimate: 0 }, source: 'uploaded_cad' },
  { id: 'okuma_mu_4000v', manufacturer: 'Okuma', model: 'OKUMA MU-4000V', type: '5AXIS_TRUNNION', stepFile: 'OKUMA MU-4000V.step', has3DModel: true, assemblies: ['static:1', 'b_axis_table:1', 'c_axis_table:1', 'x_axis_head:1', 'y_axis_head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 4831784, facesEstimate: 12 }, source: 'uploaded_cad' },
  { id: 'okuma_mu_400va', manufacturer: 'Okuma', model: 'OKUMA MU-400VA', type: '5AXIS_TRUNNION', stepFile: 'OKUMA MU-400VA.step', has3DModel: true, assemblies: ['static:1', 'a axis table:1', 'c axis table:1', 'y axis table:1', 'x axis head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 3472840, facesEstimate: 8 }, source: 'uploaded_cad' },
  { id: 'okuma_mu_5000v', manufacturer: 'Okuma', model: 'OKUMA MU-5000V', type: '5AXIS_TRUNNION', stepFile: 'OKUMA MU-5000V.step', has3DModel: true, assemblies: ['static:1', 'x_axis_table:1', 'a_axis_table:1', 'c_axis_table:1', 'y_axis_head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 8056755, facesEstimate: 5 }, source: 'uploaded_cad' },
  { id: 'okuma_mu_500va', manufacturer: 'Okuma', model: 'OKUMA MU-500VA', type: '5AXIS_TRUNNION', stepFile: 'OKUMA MU-500VA.step', has3DModel: true, assemblies: ['static:1', 'y axis table:1', 'c axis table:1', 'a axis table:1', 'x axis head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 4547921, facesEstimate: 0 }, source: 'uploaded_cad' },
  { id: 'okuma_mu_500val', manufacturer: 'Okuma', model: 'OKUMA MU-500VAL', type: '5AXIS_TRUNNION', stepFile: 'OKUMA MU-500VAL.step', has3DModel: true, assemblies: ['static:1', 'y axis table:1', 'a axis table:1', 'c axis table:1', 'x axis head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 1926397, facesEstimate: 0 }, source: 'uploaded_cad' },
  { id: 'okuma_mu_6300v', manufacturer: 'Okuma', model: 'OKUMA MU-6300V', type: '5AXIS_TRUNNION', stepFile: 'OKUMA MU-6300V.step', has3DModel: true, assemblies: ['static:1', 'x_axis_table:1', 'a_axis_table:1', 'c_axis_table:1', 'z_axis_head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 7035407, facesEstimate: 8 }, source: 'uploaded_cad' },
  { id: 'okuma_mu_8000v', manufacturer: 'Okuma', model: 'OKUMA MU-8000V', type: '5AXIS_TRUNNION', stepFile: 'OKUMA MU-8000V.step', has3DModel: true, assemblies: ['static:1', 'x axis table:1', 'a axis table:1', 'c axis table:1', 'y axis head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 5904083, facesEstimate: 2 }, source: 'uploaded_cad' },
  { id: 'okuma_vtm_1200yb', manufacturer: 'Okuma', model: 'OKUMA VTM-1200YB', type: 'VTL_MILL_TURN', stepFile: 'OKUMA VTM-1200YB.step', has3DModel: true, assemblies: ['table1250 v1:1', 'static:1', 'c axis table:1', 'x axis head:1', 'z axis head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 1778198, facesEstimate: 0 }, source: 'uploaded_cad' },
  { id: 'okuma_vtm_2000yb', manufacturer: 'Okuma', model: 'OKUMA VTM-2000YB', type: 'VTL_MILL_TURN', stepFile: 'OKUMA VTM-2000YB.step', has3DModel: true, assemblies: ['static:1', 'c_axis_table:1', 'x_axis_head:1', 'z_axis_head:1', 'y_axis_head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 8808466, facesEstimate: 0 }, source: 'uploaded_cad' },
  { id: 'okuma_vtm_80yb', manufacturer: 'Okuma', model: 'OKUMA VTM-80YB', type: 'VTL_MILL_TURN', stepFile: 'OKUMA VTM-80YB.step', has3DModel: true, assemblies: ['static:1', 'x axis head:1', 'z axis head:1', 'y axis head:1', 'b axis head:1'], collisionZones: 'auto_detected', geometry: { fileSize: 1223120, facesEstimate: 0 }, source: 'uploaded_cad' },
];

// ════════════════════════════════════════════════════════════════════════════
// COMBINED CATALOG — deduplicated by manufacturer + model
// ════════════════════════════════════════════════════════════════════════════

/** Merged catalog preferring Okuma CAD entries (richer data) over V3 duplicates */
export const ALL_3D_MODELS: Machine3DModelEntry[] = (() => {
  const seen = new Set<string>();
  const result: Machine3DModelEntry[] = [];

  // Okuma CAD entries first (higher priority — have assemblies + collision zones)
  for (const entry of OKUMA_CAD_CATALOG) {
    const key = `${entry.manufacturer.toLowerCase()}|${entry.model.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(entry);
    }
  }

  // Then V3 entries (skip duplicates)
  for (const entry of MACHINE_3D_MODEL_CATALOG) {
    const key = `${entry.manufacturer.toLowerCase()}|${entry.model.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(entry);
    }
  }

  return result;
})();
