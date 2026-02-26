const PRISM_MACHINE_3D_LEARNING_ENGINE = {
  version: '1.0.0',

  // LEARNED DIMENSION DATABASE
  // Stores manufacturer/model-specific proportions learned from uploaded CAD

  learnedDimensions: {
    // UNIFIED MACHINE CAD LEARNING DATABASE
    // All uploaded machine CAD models in flat structure (not nested by brand)
    // Format: manufacturer_model for easy lookup
    // Priority: 'uploaded_cad' overrides PRISM-generated models

    // --- DN Solutions (formerly Doosan) ---
    'dn_solutions_dnm_4000': {
      manufacturer: 'DN_SOLUTIONS', source: 'DN Solutions DNM 4000.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 4096, points: 560980 },
      specs: { type: '3AXIS_VMC', x: 800, y: 450, z: 510, rpm: 12000, taper: 'BT40' }
    },
    'dn_solutions_dnm_5700': {
      manufacturer: 'DN_SOLUTIONS', source: 'DN Solutions DNM 5700.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 3397, points: 43808 },
      specs: { type: '3AXIS_VMC', x: 1300, y: 670, z: 625, rpm: 10000, taper: 'BT50' }
    },
    'dn_solutions_dvf_5000': {
      manufacturer: 'DN_SOLUTIONS', source: 'DN Solutions DVF 5000.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 4715, points: 84102 },
      specs: { type: '5AXIS_TRUNNION', x: 762, y: 520, z: 510, table: 500, rpm: 12000, taper: 'BT40' }
    },
    'dn_solutions_dvf_6500': {
      manufacturer: 'DN_SOLUTIONS', source: 'DN Solutions DVF 6500.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 3847, points: 71698 },
      specs: { type: '5AXIS_TRUNNION', x: 1050, y: 650, z: 600, table: 650, rpm: 12000, taper: 'BT40' }
    },
    'dn_solutions_dvf_8000': {
      manufacturer: 'DN_SOLUTIONS', source: 'DN Solutions DVF 8000.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 6373, points: 98743 },
      specs: { type: '5AXIS_TRUNNION', x: 1400, y: 850, z: 700, table: 800, rpm: 10000, taper: 'BT50' }
    },
    // --- Heller ---
    'heller_hf_3500': {
      manufacturer: 'HELLER', source: 'Heller HF 3500.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 6152, points: 163565 },
      specs: { type: '4AXIS_HMC', x: 710, y: 710, z: 710, pallet: 500, rpm: 12000, taper: 'HSK-A63' }
    },
    'heller_hf_5500': {
      manufacturer: 'HELLER', source: 'Heller HF 5500.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 5334, points: 111466 },
      specs: { type: '4AXIS_HMC', x: 900, y: 900, z: 900, pallet: 630, rpm: 10000, taper: 'HSK-A100' }
    },
    // --- Makino ---
    'makino_d200z': {
      manufacturer: 'MAKINO', source: 'Makino D200Z.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 762, points: 7866 },
      specs: { type: '5AXIS_TRUNNION', x: 350, y: 300, z: 250, table: 200, rpm: 45000, taper: 'HSK-E40' }
    },
    'makino_da300': {
      manufacturer: 'MAKINO', source: 'Makino DA300.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 813, points: 10015 },
      specs: { type: '5AXIS_TRUNNION', x: 450, y: 500, z: 350, table: 300, rpm: 20000, taper: 'HSK-A63' }
    },
    // --- Kern ---
    'kern_evo': {
      manufacturer: 'KERN', source: 'Kern Evo.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 3181, points: 30837 },
      specs: { type: '3AXIS_VMC', x: 500, y: 430, z: 300, rpm: 50000, taper: 'HSK-E32', precision: 0.0005 }
    },
    'kern_evo_5ax': {
      manufacturer: 'KERN', source: 'Kern Evo 5AX.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 3296, points: 32521 },
      specs: { type: '5AXIS_TRUNNION', x: 500, y: 430, z: 300, table: 200, rpm: 50000, taper: 'HSK-E32', precision: 0.001 }
    },
    'kern_micro_vario_hd': {
      manufacturer: 'KERN', source: 'Kern Micro Vario HD.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 1260, points: 24202 },
      specs: { type: '5AXIS_TRUNNION', x: 300, y: 280, z: 250, table: 170, rpm: 50000, taper: 'HSK-E25', precision: 0.0003 }
    },
    'kern_pyramid_nano': {
      manufacturer: 'KERN', source: 'Kern Pyramid Nano.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 4213, points: 27626 },
      specs: { type: '5AXIS_GANTRY', x: 500, y: 510, z: 300, rpm: 50000, taper: 'HSK-E25', precision: 0.0003 }
    },
    // --- Matsuura ---
    'matsuura_h_plus': {
      manufacturer: 'MATSUURA', source: 'Matsuura H.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 920, points: 6775 },
      specs: { type: '4AXIS_HMC', x: 560, y: 560, z: 625, rpm: 14000, taper: 'HSK-A63' }
    },
    'matsuura_mam72_35v': {
      manufacturer: 'MATSUURA', source: 'Matsuura MAM72-35V.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 1769, points: 11011 },
      specs: { type: '5AXIS_TRUNNION', x: 550, y: 400, z: 300, table: 350, rpm: 20000, taper: 'HSK-A63' }
    },
    'matsuura_mam72_63v': {
      manufacturer: 'MATSUURA', source: 'Matsuura MAM72-63V.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 739, points: 4919 },
      specs: { type: '5AXIS_TRUNNION', x: 735, y: 610, z: 460, table: 630, rpm: 14000, taper: 'HSK-A63' }
    },
    'matsuura_mx_330': {
      manufacturer: 'MATSUURA', source: 'Matsuura MX-330.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 1215, points: 15767 },
      specs: { type: '5AXIS_TRUNNION', x: 400, y: 535, z: 300, table: 330, rpm: 20000, taper: 'HSK-A63' }
    },
    'matsuura_mx_420': {
      manufacturer: 'MATSUURA', source: 'Matsuura MX-420.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 1251, points: 12507 },
      specs: { type: '5AXIS_TRUNNION', x: 500, y: 620, z: 350, table: 420, rpm: 20000, taper: 'HSK-A63' }
    },
    'matsuura_mx_520': {
      manufacturer: 'MATSUURA', source: 'Matsuura MX-520.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 718, points: 4386 },
      specs: { type: '5AXIS_TRUNNION', x: 630, y: 735, z: 400, table: 520, rpm: 14000, taper: 'HSK-A63' }
    },
    'matsuura_vx_660': {
      manufacturer: 'MATSUURA', source: 'Matsuura VX-660.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 1069, points: 7538 },
      specs: { type: '3AXIS_VMC', x: 660, y: 510, z: 460, rpm: 14000, taper: 'CAT40' }
    },
    'matsuura_vx_1000': {
      manufacturer: 'MATSUURA', source: 'Matsuura VX-1000.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 1203, points: 9156 },
      specs: { type: '3AXIS_VMC', x: 1020, y: 530, z: 460, rpm: 14000, taper: 'CAT40' }
    },
    'matsuura_vx_1500': {
      manufacturer: 'MATSUURA', source: 'Matsuura VX-1500.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 318, points: 1826 },
      specs: { type: '3AXIS_VMC', x: 1524, y: 660, z: 560, rpm: 12000, taper: 'CAT40' }
    },
    'matsuura_vx_1500_4ax': {
      manufacturer: 'MATSUURA', source: 'Matsuura VX-1500 WITH RNA-320R ROTARY TABLE.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 1631, points: 22711 },
      specs: { type: '4AXIS_VMC', x: 1524, y: 660, z: 560, table: 320, rpm: 12000, taper: 'CAT40' }
    },
    // --- Hurco ---
    'hurco_vm_one': {
      manufacturer: 'HURCO', source: 'Hurco VM One.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 4804, points: 85250 },
      specs: { type: '3AXIS_VMC', x: 660, y: 356, z: 406, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_vm_5i': {
      manufacturer: 'HURCO', source: 'Hurco VM 5i.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 3490, points: 21858 },
      specs: { type: '3AXIS_VMC', x: 508, y: 406, z: 406, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_vm_10_hsi_plus': {
      manufacturer: 'HURCO', source: 'Hurco VM 10 HSi Plus.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 4353, points: 152652 },
      specs: { type: '3AXIS_VMC', x: 660, y: 406, z: 508, rpm: 15000, taper: 'CAT40' }
    },
    'hurco_vm_10_uhsi': {
      manufacturer: 'HURCO', source: 'Hurco VM 10 UHSi.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 4919, points: 43932 },
      specs: { type: '3AXIS_VMC', x: 660, y: 406, z: 508, rpm: 24000, taper: 'HSK-A63' }
    },
    'hurco_vm_20i': {
      manufacturer: 'HURCO', source: 'Hurco VM 20i.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 3800, points: 25139 },
      specs: { type: '3AXIS_VMC', x: 762, y: 406, z: 508, rpm: 10000, taper: 'CAT40' }
    },
    'hurco_vm_30i': {
      manufacturer: 'HURCO', source: 'Hurco VM 30 i.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 5158, points: 152163 },
      specs: { type: '3AXIS_VMC', x: 1016, y: 508, z: 610, rpm: 10000, taper: 'CAT40' }
    },
    'hurco_vm_50i': {
      manufacturer: 'HURCO', source: 'Hurco VM 50 i.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 5565, points: 151771 },
      specs: { type: '3AXIS_VMC', x: 1270, y: 660, z: 610, rpm: 10000, taper: 'CAT40' }
    },
    'hurco_vmx24i': {
      manufacturer: 'HURCO', source: 'Hurco VMX24i.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 6836, points: 138762 },
      specs: { type: '3AXIS_VMC', x: 610, y: 508, z: 610, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_vmx_24_hsi': {
      manufacturer: 'HURCO', source: 'Hurco VMX 24 HSi.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 6924, points: 42845 },
      specs: { type: '3AXIS_VMC', x: 610, y: 508, z: 610, rpm: 15000, taper: 'CAT40' }
    },
    'hurco_bx40i': {
      manufacturer: 'HURCO', source: 'Hurco BX40i.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 6823, points: 50265 },
      specs: { type: '3AXIS_VMC', x: 1016, y: 610, z: 610, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_bx50i': {
      manufacturer: 'HURCO', source: 'Hurco BX50i.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 5934, points: 91801 },
      specs: { type: '3AXIS_VMC', x: 1270, y: 610, z: 610, rpm: 10000, taper: 'CAT50' }
    },
    'hurco_dcx_3226i': {
      manufacturer: 'HURCO', source: 'Hurco DCX3226i.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 4017, points: 28487 },
      specs: { type: '3AXIS_DOUBLE_COLUMN', x: 3200, y: 2600, z: 762, rpm: 6000, taper: 'CAT50' }
    },
    'hurco_vmx24_hsi_4ax': {
      manufacturer: 'HURCO', source: 'Hurco VMX 24 HSi 4ax.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 7256, points: 44372 },
      specs: { type: '4AXIS_VMC', x: 610, y: 508, z: 610, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_vmx_42t_4ax': {
      manufacturer: 'HURCO', source: 'Hurco VMX 42T 4ax.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 530, points: 5121 },
      specs: { type: '4AXIS_VMC', x: 1067, y: 610, z: 610, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_hbmx_55i': {
      manufacturer: 'HURCO', source: 'Hurco HBMX 55 i.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 332, points: 2548 },
      specs: { type: 'HORIZONTAL_BORING', x: 1400, y: 1100, z: 900, rpm: 3500, taper: 'CAT50' }
    },
    'hurco_hbmx_80i': {
      manufacturer: 'HURCO', source: 'Hurco HBMX 80 i.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 548, points: 6396 },
      specs: { type: 'HORIZONTAL_BORING', x: 2000, y: 1600, z: 1200, rpm: 3000, taper: 'CAT50' }
    },
    'hurco_vmx60swi': {
      manufacturer: 'HURCO', source: 'Hurco VMX60SWi.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 5255, points: 111234 },
      specs: { type: '5AXIS_SWIVEL', x: 1524, y: 660, z: 610, rpm: 10000, taper: 'CAT40' }
    },
    'hurco_vmx84swi': {
      manufacturer: 'HURCO', source: 'Hurco VMX 84 SWi.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 17243, points: 228635 },
      specs: { type: '5AXIS_SWIVEL', x: 2134, y: 864, z: 762, rpm: 8000, taper: 'CAT50' }
    },
    'hurco_vmx42ui': {
      manufacturer: 'HURCO', source: 'Hurco VMX 42 Ui XP40 STA.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 15273, points: 301130 },
      specs: { type: '5AXIS_TRUNNION', x: 1067, y: 610, z: 610, table: 400, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_vmx_42_sr': {
      manufacturer: 'HURCO', source: 'Hurco Hurco VMX 42 SR.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 591, points: 3690 },
      specs: { type: '5AXIS_SWIVEL', x: 1067, y: 610, z: 610, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_vmx_60_sri': {
      manufacturer: 'HURCO', source: 'Hurco VMX 60 SRi.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 3626, points: 29647 },
      specs: { type: '5AXIS_SWIVEL', x: 1524, y: 660, z: 610, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_dcx_32_5si': {
      manufacturer: 'HURCO', source: 'Hurco DCX32 5Si.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 7993, points: 124376 },
      specs: { type: '5AXIS_DOUBLE_COLUMN', x: 3200, y: 2000, z: 762, rpm: 10000, taper: 'HSK-A100' }
    },
    // --- Hurco Batch 3 (January 2026) - 5 models, 44,586 faces, 869,693 points ---
    'hurco_vc600i': {
      manufacturer: 'HURCO', source: 'Hurco VC600i.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 8067, points: 184564 },
      specs: { type: '3AXIS_VMC', x: 660, y: 510, z: 510, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_vmx_42_swi_cad': {
      manufacturer: 'HURCO', source: 'Hurco VMX 42 SWi.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 9079, points: 166130 },
      specs: { type: '5AXIS_SWIVEL', x: 1067, y: 610, z: 610, table: 420, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_vmx42srti': {
      manufacturer: 'HURCO', source: 'Hurco VMX42SRTi.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 9808, points: 171968 },
      specs: { type: '5AXIS_SWIVEL_ROTATE', x: 1067, y: 610, z: 610, table: 420, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_vmx42i_cad': {
      manufacturer: 'HURCO', source: 'Hurco VMX42i.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 9005, points: 163119 },
      specs: { type: '3AXIS_VMC', x: 1067, y: 610, z: 610, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_vmx64ti': {
      manufacturer: 'HURCO', source: 'Hurco VMX64Ti.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 8627, points: 183912 },
      specs: { type: '5AXIS_TRUNNION', x: 1626, y: 660, z: 610, table: 500, rpm: 10000, taper: 'CAT50' }
    },
    // --- Brother SPEEDIO ---
    'brother_s300x1': {
      manufacturer: 'BROTHER', source: 'Brother S300X1.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 3200, points: 24500 },
      specs: { type: '3AXIS_VMC', x: 300, y: 440, z: 305, rpm: 16000, taper: 'BT30' }
    },
    'brother_s500x1': {
      manufacturer: 'BROTHER', source: 'Brother S500X1.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 3500, points: 28000 },
      specs: { type: '3AXIS_VMC', x: 500, y: 400, z: 305, rpm: 16000, taper: 'BT30' }
    },
    'brother_s700x1': {
      manufacturer: 'BROTHER', source: 'Brother S700X1.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 3800, points: 32000 },
      specs: { type: '3AXIS_VMC', x: 700, y: 400, z: 330, rpm: 16000, taper: 'BT30' }
    },
    'brother_s1000x1': {
      manufacturer: 'BROTHER', source: 'Brother S1000X1.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 4200, points: 38000 },
      specs: { type: '3AXIS_VMC', x: 1000, y: 500, z: 300, rpm: 16000, taper: 'BT30' }
    },
    'brother_m140x2': {
      manufacturer: 'BROTHER', source: 'Brother M140X2.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 2800, points: 22000 },
      specs: { type: '5AXIS_TRUNNION', x: 200, y: 440, z: 305, rpm: 16000, taper: 'BT30' }
    },
    'brother_u500xd1': {
      manufacturer: 'BROTHER', source: 'Brother U500Xd1.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 3600, points: 30000 },
      specs: { type: '5AXIS_TRUNNION', x: 500, y: 400, z: 305, rpm: 16000, taper: 'BT30' }
    },
    // --- Datron ---
    'datron_m8cube_3ax': {
      manufacturer: 'DATRON', source: 'Datron M8Cube 3 axis.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 1200, points: 8500 },
      specs: { type: '3AXIS_VMC', x: 800, y: 800, z: 200, rpm: 40000, taper: 'ER16' }
    },
    'datron_m8cube_5ax': {
      manufacturer: 'DATRON', source: 'Datron M8Cube 5 axis.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 2800, points: 18000 },
      specs: { type: '5AXIS_TRUNNION', x: 800, y: 800, z: 200, rpm: 40000, taper: 'ER16' }
    },
    'datron_neo': {
      manufacturer: 'DATRON', source: 'Datron neo.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 4800, points: 42000 },
      specs: { type: '3AXIS_VMC', x: 1020, y: 850, z: 280, rpm: 60000, taper: 'ER11' }
    },
    'datron_neo_4ax': {
      manufacturer: 'DATRON', source: 'Datron neo 4 axis.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 5200, points: 48000 },
      specs: { type: '4AXIS_VMC', x: 1020, y: 850, z: 280, rpm: 60000, taper: 'ER11' }
    },
    // --- DMG MORI (kinematic data) ---
    'dmg_mori_dmu_50': {
      manufacturer: 'DMG_MORI', source: 'dmg_dmu_50.mch', confidence: 0.95, priority: 'uploaded_cad',
      kinematics: {
        type: 'BC_TABLE',
        linearAxes: { x: [-250, 250], y: [-225, 225], z: [-400, 0] },
        bAxisRange: [-5, 110], cAxisRange: [0, 360],
        rapidRate: 60000, tcpSupport: true
      },
      specs: { type: '5AXIS_TRUNNION', x: 500, y: 450, z: 400, rpm: 18000, taper: 'HSK-A63' }
    }
  },
    'okuma': {
      '5-axis_vmc': {
        source: 'okuma_genos_m460v-5ax.step',
        confidence: 0.95,
        sampleCount: 1,
        dimensions: {
          // Ratios relative to X travel
          baseWidthRatio: 2.6,      // 1200mm base for 460mm X travel
          baseDepthRatio: 1.74,     // 800mm depth for 460mm X
          baseHeightRatio: 0.87,    // 400mm base height for 460mm X
          columnWidthRatio: 0.65,   // Column width relative to X
          columnHeightRatio: 6.09,  // 2800mm height for 460mm X
          tableToBaseRatio: 0.87,   // 400mm table for 460mm X
          spindleHeadWidth: 280,    // Absolute mm
          spindleHeadHeight: 450,   // Absolute mm
          trunnionWidth: 350,       // A-axis arm width
          rotaryTableDia: 400,      // C-axis table diameter
        },
        colors: {
          frame: 0x2a4d3a,          // Okuma signature green
          covers: 0x3d3d3d,
          table: 0x505050,
          spindle: 0x888888,
          accent: 0xff6600          // Orange accents
        },
        kinematics: {
          type: 'trunnion',         // A/C on table
          aAxisRange: [-30, 120],
          cAxisRange: [-360, 360],
          spindleOrientation: 'vertical'
        }
      }
    },
    // Placeholder for other manufacturers (will be populated as users upload)
    'haas': {},
    'mazak': {},
    'dmg': {},
    'makino': {},
    'hurco': {},
    'doosan': {},
    'fanuc': {}
  }