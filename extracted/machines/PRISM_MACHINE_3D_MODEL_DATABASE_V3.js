// PRISM_MACHINE_3D_MODEL_DATABASE_V3 - Lines 54613-56907 (2295 lines) - 3D machine models\n\nconst PRISM_MACHINE_3D_MODEL_DATABASE_V3 = {
  version: '3.0.0',
  buildDate: '2026-01-08',
  totalModels: 226,

  manufacturers: {
    'Brother': { country: 'Japan', modelCount: 18, specialty: 'High-speed tapping centers' },
    'DATRON': { country: 'Germany', modelCount: 5, specialty: 'High-speed HSM milling' },
    'DN_Solutions': { country: 'South Korea', modelCount: 5, specialty: 'Korean precision machining' },
    'Haas': { country: 'USA', modelCount: 61, specialty: 'American workhorse VMCs and HMCs' },
    'Heller': { country: 'Germany', modelCount: 2, specialty: '5-axis head machines' },
    'Hurco': { country: 'USA', modelCount: 22, specialty: 'Conversational control' },
    'Kern': { country: 'Germany', modelCount: 4, specialty: 'Ultra-precision micro machining' },
    'Makino': { country: 'Japan', modelCount: 2, specialty: 'Die/mold' },
    'Mazak': { country: 'Japan', modelCount: 40, specialty: 'Multi-tasking and 5-axis', specialty: 'Die/mold and graphite' },
    'Matsuura': { country: 'Japan', modelCount: 10, specialty: 'Multi-pallet automation' },
    'Okuma': { country: 'Japan', modelCount: 35, specialty: 'OSP control integration' },
  },
  machines: {
    'Brother_SPEEDIO_F600X1': {
      name: "Brother SPEEDIO F600X1",
      manufacturer: "Brother",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Brother SPEEDIO F600X1.step",
      complexity: 3380
    },
    'Brother_SPEEDIO_H550Xd1': {
      name: "Brother SPEEDIO H550Xd1",
      manufacturer: "Brother",
      type: "HMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Brother SPEEDIO H550Xd1.step",
      complexity: 2714
    },
    'Brother_SPEEDIO_M140X1': {
      name: "Brother SPEEDIO M140X1",
      manufacturer: "Brother",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Brother SPEEDIO M140X1.step",
      complexity: 3469
    },
    'Brother_SPEEDIO_M200Xd1': {
      name: "Brother SPEEDIO M200Xd1",
      manufacturer: "Brother",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Brother SPEEDIO M200Xd1.step",
      complexity: 4315
    },
    'Brother_SPEEDIO_M300X3': {
      name: "Brother SPEEDIO M300X3",
      manufacturer: "Brother",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Brother SPEEDIO M300X3.step",
      complexity: 4087
    },
    'Brother_SPEEDIO_M300Xd1': {
      name: "Brother SPEEDIO M300Xd1",
      manufacturer: "Brother",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Brother SPEEDIO M300Xd1.step",
      complexity: 3655
    },
    'Brother_SPEEDIO_R450Xd1': {
      name: "Brother SPEEDIO R450Xd1",
      manufacturer: "Brother",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Brother SPEEDIO R450Xd1.step",
      complexity: 3460
    },
    'Brother_SPEEDIO_R650Xd1': {
      name: "Brother SPEEDIO R650Xd1",
      manufacturer: "Brother",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Brother SPEEDIO R650Xd1.step",
      complexity: 2616
    },
    'Brother_SPEEDIO_S300Xd1': {
      name: "Brother SPEEDIO S300Xd1",
      manufacturer: "Brother",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Brother SPEEDIO S300Xd1.step",
      complexity: 2463
    },
    'Brother_SPEEDIO_S300Xd2': {
      name: "Brother SPEEDIO S300Xd2",
      manufacturer: "Brother",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Brother SPEEDIO S300Xd2.step",
      complexity: 2540
    },
    'Brother_SPEEDIO_S500Xd1': {
      name: "Brother SPEEDIO S500Xd1",
      manufacturer: "Brother",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Brother SPEEDIO S500Xd1.step",
      complexity: 1975
    },
    'Brother_SPEEDIO_S500Xd2': {
      name: "Brother SPEEDIO S500Xd2",
      manufacturer: "Brother",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Brother SPEEDIO S500Xd2.step",
      complexity: 2719
    },
    'Brother_SPEEDIO_S700Xd1': {
      name: "Brother SPEEDIO S700Xd1",
      manufacturer: "Brother",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Brother SPEEDIO S700Xd1.step",
      complexity: 2649
    },
    'Brother_SPEEDIO_S700Xd2': {
      name: "Brother SPEEDIO S700Xd2",
      manufacturer: "Brother",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Brother SPEEDIO S700Xd2.step",
      complexity: 2732
    },
    'Brother_SPEEDIO_U500Xd1': {
      name: "Brother SPEEDIO U500Xd1",
      manufacturer: "Brother",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Brother SPEEDIO U500Xd1.step",
      complexity: 2592
    },
    'Brother_SPEEDIO_U500Xd2': {
      name: "Brother SPEEDIO U500Xd2",
      manufacturer: "Brother",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Brother SPEEDIO U500Xd2.step",
      complexity: 3060
    },
    'Brother_SPEEDIO_W1000Xd1': {
      name: "Brother SPEEDIO W1000Xd1",
      manufacturer: "Brother",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Brother SPEEDIO W1000Xd1.step",
      complexity: 1816
    },
    'Brother_SPEEDIO_W1000Xd2': {
      name: "Brother SPEEDIO W1000Xd2",
      manufacturer: "Brother",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Brother SPEEDIO W1000Xd2.step",
      complexity: 2071
    },
    'DATRON_M8Cube_3_axis': {
      name: "DATRON M8Cube 3 axis",
      manufacturer: "DATRON",
      type: "5AXIS_TRUNNION",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "DATRON M8Cube 3 axis.step",
      complexity: 542
    },
    'DATRON_M8Cube_4_axis': {
      name: "DATRON M8Cube 4 axis",
      manufacturer: "DATRON",
      type: "5AXIS_TRUNNION",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "DATRON M8Cube 4 axis.step",
      complexity: 1896
    },
    'DATRON_M8Cube_5_axis': {
      name: "DATRON M8Cube 5 axis",
      manufacturer: "DATRON",
      type: "5AXIS_TRUNNION",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "DATRON M8Cube 5 axis.step",
      complexity: 905
    },
    'DATRON_neo': {
      name: "DATRON neo",
      manufacturer: "DATRON",
      type: "5AXIS_TRUNNION",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "DATRON neo.step",
      complexity: 7329
    },
    'DATRON_neo_4_axis': {
      name: "DATRON neo 4 axis",
      manufacturer: "DATRON",
      type: "5AXIS_TRUNNION",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "DATRON neo 4 axis.step",
      complexity: 7329
    },
    'DN_Solutions_DNM_4000': {
      name: "DN Solutions DNM 4000",
      manufacturer: "DN_Solutions",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "DN Solutions DNM 4000.step",
      complexity: 4096
    },
    'DN_Solutions_DNM_5700': {
      name: "DN Solutions DNM 5700",
      manufacturer: "DN_Solutions",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "DN Solutions DNM 5700.step",
      complexity: 3397
    },
    'DN_Solutions_DVF_5000': {
      name: "DN Solutions DVF 5000",
      manufacturer: "DN_Solutions",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "DN Solutions DVF 5000.step",
      complexity: 4715
    },
    'DN_Solutions_DVF_6500': {
      name: "DN Solutions DVF 6500",
      manufacturer: "DN_Solutions",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "DN Solutions DVF 6500.step",
      complexity: 3847
    },
    'DN_Solutions_DVF_8000': {
      name: "DN Solutions DVF 8000",
      manufacturer: "DN_Solutions",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "DN Solutions DVF 8000.step",
      complexity: 6373
    },
    'HAAS_CM_1': {
      name: "HAAS CM-1",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 406, "y": 406, "z": 406},
      spindle: {"rpm": 4000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS CM-1.step",
      complexity: 643
    },
    'HAAS_EC_1600': {
      name: "HAAS EC-1600",
      manufacturer: "Haas",
      type: "HMC",
      travels: {"x": 1626, "y": 1270, "z": 1016},
      spindle: {"rpm": 6000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "HAAS EC-1600.step",
      complexity: 896
    },
    'HAAS_EC_1600ZT': {
      name: "HAAS EC-1600ZT",
      manufacturer: "Haas",
      type: "HMC",
      travels: {"x": 1626, "y": 1270, "z": 1524},
      spindle: {"rpm": 6000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "HAAS EC-1600ZT.step",
      complexity: 3372
    },
    'HAAS_EC_500': {
      name: "HAAS EC-500",
      manufacturer: "Haas",
      type: "HMC",
      travels: {"x": 635, "y": 508, "z": 635},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS EC-500.step",
      complexity: 5954
    },
    'HAAS_EC_500_50': {
      name: "HAAS EC-500-50",
      manufacturer: "Haas",
      type: "HMC",
      travels: {"x": 635, "y": 508, "z": 635},
      spindle: {"rpm": 7500, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "HAAS EC-500-50.step",
      complexity: 7256
    },
    'HAAS_EC_630': {
      name: "HAAS EC-630",
      manufacturer: "Haas",
      type: "HMC",
      travels: {"x": 813, "y": 559, "z": 559},
      spindle: {"rpm": 7500, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "HAAS EC-630.step",
      complexity: 6082
    },
    'HAAS_Mini_Mill': {
      name: "HAAS Mini Mill",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 406, "y": 305, "z": 254},
      spindle: {"rpm": 6000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS Mini Mill.step",
      complexity: 547
    },
    'HAAS_Mini_Mill_2': {
      name: "HAAS Mini Mill 2",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 457, "y": 305, "z": 318},
      spindle: {"rpm": 6000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS Mini Mill 2.step",
      complexity: 2200
    },
    'HAAS_Mini_Mill_EDU': {
      name: "HAAS Mini Mill-EDU",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 406, "y": 305, "z": 254},
      spindle: {"rpm": 6000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS Mini Mill-EDU.step",
      complexity: 2758
    },
    'HAAS_Mini_Mill_EDU_WITH_HRT160_TRUNNION_TABLE': {
      name: "HAAS Mini Mill-EDU WITH HRT160 TRUNNION TABLE",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 406, "y": 305, "z": 254},
      spindle: {"rpm": 6000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS Mini Mill-EDU WITH HRT160 TRUNNION TABLE.step",
      complexity: 2822
    },
    'HAAS_TM_1': {
      name: "HAAS TM-1",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 305, "z": 406},
      spindle: {"rpm": 4000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS TM-1.step",
      complexity: 290
    },
    'HAAS_TM_1P': {
      name: "HAAS TM-1P",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 305, "z": 406},
      spindle: {"rpm": 4000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS TM-1P.step",
      complexity: 304
    },
    'HAAS_TM_2': {
      name: "HAAS TM-2",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 1016, "y": 406, "z": 406},
      spindle: {"rpm": 4000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS TM-2.step",
      complexity: 1260
    },
    'HAAS_TM_2P': {
      name: "HAAS TM-2P",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 1016, "y": 406, "z": 406},
      spindle: {"rpm": 4000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS TM-2P.step",
      complexity: 1276
    },
    'HAAS_TM_3P': {
      name: "HAAS TM-3P",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 1016, "y": 406, "z": 406},
      spindle: {"rpm": 4000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS TM-3P.step",
      complexity: 1134
    },
    'HAAS_UMC_750': {
      name: "HAAS UMC-750",
      manufacturer: "Haas",
      type: "5AXIS_TRUNNION",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS UMC-750.step",
      complexity: 1343
    },
    'HAAS_UMC_750SS': {
      name: "HAAS UMC-750SS",
      manufacturer: "Haas",
      type: "5AXIS_TRUNNION",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 15000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS UMC-750SS.step",
      complexity: 8346
    },
    'HAAS_UMC_750_NEW_DESIGN': {
      name: "HAAS UMC-750 NEW DESIGN",
      manufacturer: "Haas",
      type: "5AXIS_TRUNNION",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS UMC-750 NEW DESIGN.step",
      complexity: 8054
    },
    'HAAS_VC_400': {
      name: "HAAS VC-400",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 508, "y": 406, "z": 508},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS VC-400.step",
      complexity: 6388
    },
    'HAAS_VF_1': {
      name: "HAAS VF-1",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 508, "y": 406, "z": 508},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS VF-1.step",
      complexity: 471
    },
    'HAAS_VF_10_50': {
      name: "HAAS VF-10-50",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 3048, "y": 813, "z": 762},
      spindle: {"rpm": 7500, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "HAAS VF-10-50.step",
      complexity: 1501
    },
    'HAAS_VF_11_50': {
      name: "HAAS VF-11-50",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 3048, "y": 1016, "z": 762},
      spindle: {"rpm": 7500, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "HAAS VF-11-50.step",
      complexity: 1329
    },
    'HAAS_VF_12_40': {
      name: "HAAS VF-12-40",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 3810, "y": 813, "z": 762},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS VF-12-40.step",
      complexity: 1572
    },
    'HAAS_VF_14_40': {
      name: "HAAS VF-14-40",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 5690, "y": 813, "z": 762},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS VF-14-40.step",
      complexity: 6730
    },
    'HAAS_VF_14_50': {
      name: "HAAS VF-14-50",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 5690, "y": 813, "z": 762},
      spindle: {"rpm": 7500, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "HAAS VF-14-50.step",
      complexity: 6648
    },
    'HAAS_VF_2': {
      name: "HAAS VF-2",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 406, "z": 508},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS VF-2.step",
      complexity: 591
    },
    'HAAS_VF_2_TR': {
      name: "HAAS VF-2 TR",
      manufacturer: "Haas",
      type: "5AXIS_TRUNNION",
      travels: {"x": 762, "y": 406, "z": 508},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS VF-2 TR.step",
      complexity: 728
    },
    'HAAS_VF_2_WITH_TRT100_TILTING_ROTARY_RABLE': {
      name: "HAAS VF-2 WITH TRT100 TILTING ROTARY RABLE",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 406, "z": 508},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS VF-2 WITH TRT100 TILTING ROTARY RABLE.step",
      complexity: 1486
    },
    'HAAS_VF_3': {
      name: "HAAS VF-3",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 1016, "y": 508, "z": 635},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS VF-3.step",
      complexity: 661
    },
    'HAAS_VF_3YT': {
      name: "HAAS VF-3YT",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 1016, "y": 660, "z": 635},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS VF-3YT.step",
      complexity: 1348
    },
    'HAAS_VF_3_WITH_TR160_TRUNNION_ROTARY_TABLE': {
      name: "HAAS VF-3 WITH TR160 TRUNNION ROTARY TABLE",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 1016, "y": 508, "z": 635},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS VF-3 WITH TR160 TRUNNION ROTARY TABLE.step",
      complexity: 1395
    },
    'HAAS_VF_4': {
      name: "HAAS VF-4",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 1270, "y": 508, "z": 635},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS VF-4.step",
      complexity: 732
    },
    'HAAS_VF_5_40': {
      name: "HAAS VF-5-40",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 1270, "y": 660, "z": 635},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS VF-5-40.step",
      complexity: 2468
    },
    'HAAS_VF_6_40': {
      name: "HAAS VF-6-40",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 1626, "y": 813, "z": 762},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS VF-6-40.step",
      complexity: 807
    },
    'HAAS_VF_7_40': {
      name: "HAAS VF-7-40",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 2134, "y": 813, "z": 762},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS VF-7-40.step",
      complexity: 2403
    },
    'HAAS_VF_8_40': {
      name: "HAAS VF-8-40",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 1626, "y": 1016, "z": 762},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS VF-8-40.step",
      complexity: 1029
    },
    'HAAS_VM_3': {
      name: "HAAS VM-3",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 1016, "y": 660, "z": 635},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS VM-3.step",
      complexity: 2570
    },
    'HAAS_VM_6': {
      name: "HAAS VM-6",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 1626, "y": 813, "z": 762},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS VM-6.step",
      complexity: 3591
    },
    'Heller_HF_3500': {
      name: "Heller HF 3500",
      manufacturer: "Heller",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Heller HF 3500.step",
      complexity: 6152
    },
    'Heller_HF_5500': {
      name: "Heller HF 5500",
      manufacturer: "Heller",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Heller HF 5500.step",
      complexity: 5334
    },
    'Hurco_BX40i': {
      name: "Hurco BX40i",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco BX40i.step",
      complexity: 6823
    },
    'Hurco_BX50i': {
      name: "Hurco BX50i",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco BX50i.step",
      complexity: 5934
    },
    'Hurco_DCX3226i': {
      name: "Hurco DCX3226i",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco DCX3226i.step",
      complexity: 4017
    },
    'Hurco_DCX32_5Si': {
      name: "Hurco DCX32 5Si",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco DCX32 5Si.step",
      complexity: 7993
    },
    'Hurco_HBMX_55_i': {
      name: "Hurco HBMX 55 i",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco HBMX 55 i.step",
      complexity: 332
    },
    'Hurco_HBMX_80_i': {
      name: "Hurco HBMX 80 i",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco HBMX 80 i.step",
      complexity: 548
    },
    'Hurco_Hurco_VMX_42_SR': {
      name: "Hurco Hurco VMX 42 SR",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco Hurco VMX 42 SR.step",
      complexity: 591
    },
    'Hurco_VMX24i': {
      name: "Hurco VMX24i",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco VMX24i.step",
      complexity: 6836
    },
    'Hurco_VMX60SWi': {
      name: "Hurco VMX60SWi",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco VMX60SWi.step",
      complexity: 5255
    },
    'Hurco_VMX_24_HSi': {
      name: "Hurco VMX 24 HSi",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco VMX 24 HSi.step",
      complexity: 6924
    },
    'Hurco_VMX_24_HSi_4ax': {
      name: "Hurco VMX 24 HSi 4ax",
      manufacturer: "Hurco",
      type: "4AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco VMX 24 HSi 4ax.step",
      complexity: 7256
    },
    'Hurco_VMX_42T_4ax': {
      name: "Hurco VMX 42T 4ax",
      manufacturer: "Hurco",
      type: "4AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco VMX 42T 4ax.step",
      complexity: 530
    },
    'Hurco_VMX_42_Ui_XP40_STA': {
      name: "Hurco VMX 42 Ui XP40 STA",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco VMX 42 Ui XP40 STA.step",
      complexity: 15273
    },
    'Hurco_VMX_60_SRi': {
      name: "Hurco VMX 60 SRi",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco VMX 60 SRi.step",
      complexity: 3626
    },
    'Hurco_VMX_84_SWi': {
      name: "Hurco VMX 84 SWi",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco VMX 84 SWi.step",
      complexity: 17243
    },
    'Hurco_VM_10_HSi_Plus': {
      name: "Hurco VM 10 HSi Plus",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco VM 10 HSi Plus.step",
      complexity: 4353
    },
    'Hurco_VM_10_UHSi': {
      name: "Hurco VM 10 UHSi",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco VM 10 UHSi.step",
      complexity: 4919
    },
    'Hurco_VM_20i': {
      name: "Hurco VM 20i",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco VM 20i.step",
      complexity: 3800
    },
    'Hurco_VM_30_i': {
      name: "Hurco VM 30 i",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco VM 30 i.step",
      complexity: 5158
    },
    'Hurco_VM_50_i': {
      name: "Hurco VM 50 i",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco VM 50 i.step",
      complexity: 5565
    },
    'Hurco_VM_5i': {
      name: "Hurco VM 5i",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco VM 5i.step",
      complexity: 3490
    },
    'Hurco_VM_One': {
      name: "Hurco VM One",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco VM One.step",
      complexity: 4804
    },
    'Kern_Evo': {
      name: "Kern Evo",
      manufacturer: "Kern",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Kern Evo.step",
      complexity: 3181
    },
    'Kern_Evo_5AX': {
      name: "Kern Evo 5AX",
      manufacturer: "Kern",
      type: "5AXIS_TRUNNION",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Kern Evo 5AX.step",
      complexity: 3296
    },
    'Kern_Micro_Vario_HD': {
      name: "Kern Micro Vario HD",
      manufacturer: "Kern",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Kern Micro Vario HD.step",
      complexity: 1260
    },
    'Kern_Pyramid_Nano': {
      name: "Kern Pyramid Nano",
      manufacturer: "Kern",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Kern Pyramid Nano.step",
      complexity: 4213
    },
    'Makino_D200Z': {
      name: "Makino D200Z",
      manufacturer: "Makino",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Makino D200Z.step",
      complexity: 762
    },
    'Makino_DA300': {
      name: "Makino DA300",
      manufacturer: "Makino",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Makino DA300.step",
      complexity: 813
    },
    'Matsuura_H': {
      name: "Matsuura H",
      manufacturer: "Matsuura",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Matsuura H.step",
      complexity: 920
    },
    'Matsuura_MAM72_35V': {
      name: "Matsuura MAM72-35V",
      manufacturer: "Matsuura",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Matsuura MAM72-35V.step",
      complexity: 1769
    },
    'Matsuura_MAM72_63V': {
      name: "Matsuura MAM72-63V",
      manufacturer: "Matsuura",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Matsuura MAM72-63V.step",
      complexity: 739
    },
    'Matsuura_MX_330': {
      name: "Matsuura MX-330",
      manufacturer: "Matsuura",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Matsuura MX-330.step",
      complexity: 1215
    },
    'Matsuura_MX_420': {
      name: "Matsuura MX-420",
      manufacturer: "Matsuura",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Matsuura MX-420.step",
      complexity: 1251
    },
    'Matsuura_MX_520': {
      name: "Matsuura MX-520",
      manufacturer: "Matsuura",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Matsuura MX-520.step",
      complexity: 718
    },
    'Matsuura_VX_1000': {
      name: "Matsuura VX-1000",
      manufacturer: "Matsuura",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Matsuura VX-1000.step",
      complexity: 1203
    },
    'Matsuura_VX_1500': {
      name: "Matsuura VX-1500",
      manufacturer: "Matsuura",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Matsuura VX-1500.step",
      complexity: 318
    },
    'Matsuura_VX_1500_WITH_RNA_320R_ROTARY_TABLE': {
      name: "Matsuura VX-1500 WITH RNA-320R ROTARY TABLE",
      manufacturer: "Matsuura",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Matsuura VX-1500 WITH RNA-320R ROTARY TABLE.step",
      complexity: 1631
    },
    'Matsuura_VX_660': {
      name: "Matsuura VX-660",
      manufacturer: "Matsuura",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Matsuura VX-660.step",
      complexity: 1069
    },
    'OKUMA_MB_5000HII': {
      name: "OKUMA_MB-5000HII",
      manufacturer: "Okuma",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "OKUMA_MB-5000HII.step",
      complexity: 14333
    },
    'okuma_genos_m460v_5ax': {
      name: "okuma_genos_m460v-5ax",
      manufacturer: "Okuma",
      type: "5AXIS_TRUNNION",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "okuma_genos_m460v-5ax.step",
      complexity: 2381
    },
    'HAAS_UMC_1500SS_DUO': {
      name: "HAAS UMC-1500SS-DUO",
      manufacturer: "Haas",
      type: "5AXIS_TRUNNION",
      travels: {"x": 1524, "y": 660, "z": 635},
      spindle: {"rpm": 15000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS UMC-1500SS-DUO.step",
      complexity: 0
    },
    'HAAS_UMC_1500_DUO': {
      name: "HAAS UMC-1500-DUO",
      manufacturer: "Haas",
      type: "5AXIS_TRUNNION",
      travels: {"x": 1524, "y": 660, "z": 635},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS UMC-1500-DUO.step",
      complexity: 0
    },
    'HAAS_UMC_1000': {
      name: "HAAS UMC-1000",
      manufacturer: "Haas",
      type: "5AXIS_TRUNNION",
      travels: {"x": 1016, "y": 635, "z": 635},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS UMC-1000.step",
      complexity: 0
    },
    'HAAS_UMC_1000SS': {
      name: "HAAS UMC-1000SS",
      manufacturer: "Haas",
      type: "5AXIS_TRUNNION",
      travels: {"x": 1016, "y": 635, "z": 635},
      spindle: {"rpm": 15000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS UMC-1000SS.step",
      complexity: 0
    },
    'HAAS_UMC_1000_P': {
      name: "HAAS UMC-1000-P",
      manufacturer: "Haas",
      type: "5AXIS_TRUNNION",
      travels: {"x": 1016, "y": 635, "z": 635},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS UMC-1000-P.step",
      complexity: 0
    },
    'HAAS_UMC_400': {
      name: "HAAS UMC-400",
      manufacturer: "Haas",
      type: "5AXIS_TRUNNION",
      travels: {"x": 406, "y": 406, "z": 356},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS UMC-400.step",
      complexity: 0
    },
    'HAAS_UMC_350HD_EDU': {
      name: "HAAS UMC 350HD-EDU",
      manufacturer: "Haas",
      type: "5AXIS_TRUNNION",
      travels: {"x": 350, "y": 254, "z": 305},
      spindle: {"rpm": 15000, "taper": "BT30"},
      has3DModel: true,
      stepFile: "HAAS UMC 350HD-EDU.step",
      complexity: 0
    },
    'HAAS_DM_1': {
      name: "HAAS DM-1",
      manufacturer: "Haas",
      type: "DRILL_TAP",
      travels: {"x": 508, "y": 406, "z": 394},
      spindle: {"rpm": 15000, "taper": "BT30"},
      has3DModel: true,
      stepFile: "HAAS DM-1.step",
      complexity: 0
    },
    'HAAS_DM_2': {
      name: "HAAS DM-2",
      manufacturer: "Haas",
      type: "DRILL_TAP",
      travels: {"x": 711, "y": 406, "z": 394},
      spindle: {"rpm": 15000, "taper": "BT30"},
      has3DModel: true,
      stepFile: "HAAS DM-2.step",
      complexity: 0
    },
    'HAAS_GM_2': {
      name: "HAAS GM-2",
      manufacturer: "Haas",
      type: "GANTRY_MILL",
      travels: {"x": 1524, "y": 762, "z": 457},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS GM-2.step",
      complexity: 0
    },
    'HAAS_Desktop_Mill': {
      name: "HAAS Desktop Mill",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 305, "y": 254, "z": 305},
      spindle: {"rpm": 6000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS Desktop Mill.step",
      complexity: 0
    },
    'HAAS_Super_Mini_Mill': {
      name: "HAAS Super Mini Mill",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 406, "y": 305, "z": 254},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS Super Mini Mill.step",
      complexity: 0
    },
    'HAAS_VF_2YT': {
      name: "HAAS VF-2YT",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS VF-2YT.step",
      complexity: 0
    },
    'HAAS_VF_2SSYT': {
      name: "HAAS VF-2SSYT",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS VF-2SSYT.step",
      complexity: 0
    },
    'HAAS_VF_3YT_50': {
      name: "HAAS VF-3YT-50",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 1016, "y": 660, "z": 635},
      spindle: {"rpm": 7500, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "HAAS VF-3YT-50.step",
      complexity: 0
    },
    'HAAS_VF_10': {
      name: "HAAS VF-10",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 3048, "y": 813, "z": 762},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS VF-10.step",
      complexity: 0
    },
    'HAAS_VF_11_40': {
      name: "HAAS VF-11-40",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 3048, "y": 1016, "z": 762},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS VF-11-40.step",
      complexity: 0
    },
    'HAAS_VF_12_50': {
      name: "HAAS VF-12-50",
      manufacturer: "Haas",
      type: "3AXIS_VMC",
      travels: {"x": 3810, "y": 813, "z": 762},
      spindle: {"rpm": 7500, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "HAAS VF-12-50.step",
      complexity: 0
    },
    'HAAS_EC_400': {
      name: "HAAS EC-400",
      manufacturer: "Haas",
      type: "HMC",
      travels: {"x": 508, "y": 508, "z": 508},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS EC-400.step",
      complexity: 0
    },
    'HAAS_UMC_500SS': {
      name: "HAAS UMC-500SS",
      manufacturer: "Haas",
      type: "5AXIS_TRUNNION",
      travels: {"x": 508, "y": 406, "z": 394},
      spindle: {"rpm": 15000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS UMC-500SS.step",
      complexity: 0
    },
    'HAAS_UMC_1250': {
      name: "HAAS UMC-1250",
      manufacturer: "Haas",
      type: "5AXIS_TRUNNION",
      travels: {"x": 1270, "y": 508, "z": 508},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS UMC-1250.step",
      complexity: 0
    },
    'HAAS_GM_2_5AX': {
      name: "HAAS GM-2-5AX",
      manufacturer: "Haas",
      type: "5AXIS_GANTRY",
      travels: {"x": 1524, "y": 762, "z": 457},
      spindle: {"rpm": 8100, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS GM-2-5AX.step",
      complexity: 0
    },
    'HAAS_VF_4SS_TRT210': {
      name: "HAAS VF-4SS with TRT210 Trunnion",
      manufacturer: "Haas",
      type: "5AXIS_TABLE",
      travels: {"x": 1270, "y": 457, "z": 508},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "HAAS VF-4SS WITH TRT210 TRUNNION ROTARY TABLE.step",
      complexity: 0
    },
    'Hurco_HM1700Ri': {
      name: "Hurco HM1700Ri",
      manufacturer: "Hurco",
      type: "HMC",
      travels: {"x": 1700, "y": 850, "z": 850},
      spindle: {"rpm": 10000, "taper": "BT50"},
      has3DModel: true,
      stepFile: "Hurco HM1700Ri.step",
      complexity: 0
    },
    'Hurco_VMX42SWi': {
      name: "Hurco VMX42SWi",
      manufacturer: "Hurco",
      type: "5AXIS_SWIVEL",
      travels: {"x": 1067, "y": 610, "z": 610},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco VMX42SWi.step",
      complexity: 0
    },
    'Hurco_VMX6030i': {
      name: "Hurco VMX6030i",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 1524, "y": 660, "z": 762},
      spindle: {"rpm": 10000, "taper": "BT50"},
      has3DModel: true,
      stepFile: "Hurco VMX6030i.step",
      complexity: 0
    },
    'Hurco_VMX60Ui': {
      name: "Hurco VMX60Ui",
      manufacturer: "Hurco",
      type: "5AXIS_UNIVERSAL",
      travels: {"x": 1524, "y": 660, "z": 610},
      spindle: {"rpm": 10000, "taper": "BT50"},
      has3DModel: true,
      stepFile: "Hurco VMX60Ui.step",
      complexity: 0
    },
    'Hurco_VC500i': {
      name: "Hurco VC500i",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 508, "y": 406, "z": 406},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco VC500i.step",
      complexity: 0
    },
    'Hurco_VMX30Ui': {
      name: "Hurco VMX30Ui",
      manufacturer: "Hurco",
      type: "5AXIS_UNIVERSAL",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco VMX30Ui.step",
      complexity: 0
    },
    'Hurco_BX_40_Ui': {
      name: "Hurco BX 40 Ui",
      manufacturer: "Hurco",
      type: "5AXIS_UNIVERSAL",
      travels: {"x": 1016, "y": 610, "z": 508},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco BX 40 Ui.step",
      complexity: 0
    },
    'Hurco_VMX_30_UDi': {
      name: "Hurco VMX 30 UDi",
      manufacturer: "Hurco",
      type: "5AXIS_DIRECT",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 15000, "taper": "HSK-A63"},
      has3DModel: true,
      stepFile: "Hurco VMX 30 UDi.step",
      complexity: 0
    },
    'Hurco_VCX600i_XP': {
      name: "Hurco VCX600i XP",
      manufacturer: "Hurco",
      type: "5AXIS_TRUNNION",
      travels: {"x": 660, "y": 508, "z": 508},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco VCX600i XP.step",
      complexity: 0
    },
    'Hurco_VMX60SRTi': {
      name: "Hurco VMX60SRTi",
      manufacturer: "Hurco",
      type: "5AXIS_SWIVEL_ROTARY",
      travels: {"x": 1524, "y": 660, "z": 610},
      spindle: {"rpm": 10000, "taper": "BT50"},
      has3DModel: true,
      stepFile: "Hurco VMX60SRTi.step",
      complexity: 0
    },
    'Hurco_VM10Ui': {
      name: "Hurco VM10Ui",
      manufacturer: "Hurco",
      type: "5AXIS_COMPACT",
      travels: {"x": 660, "y": 406, "z": 406},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco VM10Ui.step",
      complexity: 0
    },
    'Hurco_VMX_84_i': {
      name: "Hurco VMX 84 i",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 2134, "y": 660, "z": 610},
      spindle: {"rpm": 10000, "taper": "BT50"},
      has3DModel: true,
      stepFile: "Hurco VMX 84 i.step",
      complexity: 0
    },
    'Hurco_VMX42Di': {
      name: "Hurco VMX42Di",
      manufacturer: "Hurco",
      type: "5AXIS_DIRECT",
      travels: {"x": 1067, "y": 610, "z": 610},
      spindle: {"rpm": 15000, "taper": "HSK-A63"},
      has3DModel: true,
      stepFile: "Hurco VMX42Di.step",
      complexity: 0
    },
    'Hurco_VMX30i': {
      name: "Hurco VMX30i",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Hurco VMX30i.step",
      complexity: 0
    },
    'Hurco_VM_60_i': {
      name: "Hurco VM 60 i",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 1524, "y": 508, "z": 508},
      spindle: {"rpm": 10000, "taper": "BT50"},
      has3DModel: true,
      stepFile: "Hurco VM 60 i.step",
      complexity: 0
    },
    'Hurco_DCX_22_i': {
      name: "Hurco DCX 22 i",
      manufacturer: "Hurco",
      type: "DUAL_COLUMN",
      travels: {"x": 2200, "y": 1270, "z": 762},
      spindle: {"rpm": 8000, "taper": "BT50"},
      has3DModel: true,
      stepFile: "Hurco DCX 22 i.step",
      complexity: 0
    },
    'Mazak_FJV_35_60': {
      name: "Mazak FJV-35/60",
      manufacturer: "Mazak",
      type: "3AXIS_VMC",
      travels: {"x": 1500, "y": 900, "z": 600},
      spindle: {"rpm": 10000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "Mazak FJV-35-60.step",
      complexity: 0
    },
    'Mazak_FJV_35_120': {
      name: "Mazak FJV-35/120",
      manufacturer: "Mazak",
      type: "3AXIS_VMC",
      travels: {"x": 3000, "y": 900, "z": 600},
      spindle: {"rpm": 10000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "Mazak FJV-35-120.step",
      complexity: 0
    },
    'Mazak_FJV_60_160': {
      name: "Mazak FJV-60/160",
      manufacturer: "Mazak",
      type: "3AXIS_VMC",
      travels: {"x": 4000, "y": 1500, "z": 800},
      spindle: {"rpm": 8000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "Mazak FJV-60-160.step",
      complexity: 0
    },
    'Mazak_VARIAXIS_i_800_NEO': {
      name: "Mazak VARIAXIS i-800 NEO",
      manufacturer: "Mazak",
      type: "5AXIS_TRUNNION",
      travels: {"x": 800, "y": 1050, "z": 590},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak VARIAXIS i-800 NEO.step",
      complexity: 0
    },
    'Mazak_CV5_500': {
      name: "Mazak CV5-500",
      manufacturer: "Mazak",
      type: "5AXIS_TRUNNION",
      travels: {"x": 550, "y": 500, "z": 510},
      spindle: {"rpm": 12000, "taper": "HSK-A63"},
      has3DModel: true,
      stepFile: "Mazak CV5-500.step",
      complexity: 0
    },
    'Mazak_VTC_300C': {
      name: "Mazak VTC-300C",
      manufacturer: "Mazak",
      type: "3AXIS_VMC",
      travels: {"x": 2000, "y": 760, "z": 660},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak VTC 300C.step",
      complexity: 0
    },
    'Mazak_HCN_1080': {
      name: "Mazak HCN-10800",
      manufacturer: "Mazak",
      type: "HMC",
      travels: {"x": 1600, "y": 1200, "z": 1200},
      spindle: {"rpm": 6000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "Mazak HCN-1080.step",
      complexity: 0
    },
    'Mazak_HCN_4000': {
      name: "Mazak HCN-4000",
      manufacturer: "Mazak",
      type: "HMC",
      travels: {"x": 560, "y": 560, "z": 625},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak HCN-4000.step",
      complexity: 0
    },
    'Mazak_HCN_5000S': {
      name: "Mazak HCN-5000S",
      manufacturer: "Mazak",
      type: "HMC",
      travels: {"x": 730, "y": 730, "z": 680},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak HCN-5000S.step",
      complexity: 0
    },
    'Mazak_HCN_6800': {
      name: "Mazak HCN-6800",
      manufacturer: "Mazak",
      type: "HMC",
      travels: {"x": 1050, "y": 900, "z": 980},
      spindle: {"rpm": 8000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "Mazak HCN-6800.step",
      complexity: 0
    },
    'Mazak_HCN_6800_NEO': {
      name: "Mazak HCN-6800 NEO",
      manufacturer: "Mazak",
      type: "HMC",
      travels: {"x": 1050, "y": 900, "z": 980},
      spindle: {"rpm": 10000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "Mazak HCN-6800 NEO.step",
      complexity: 0
    },
    'Mazak_HCN_8800': {
      name: "Mazak HCN-8800",
      manufacturer: "Mazak",
      type: "HMC",
      travels: {"x": 1400, "y": 1100, "z": 1220},
      spindle: {"rpm": 6000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "Mazak HCN-8800.step",
      complexity: 0
    },
    'Mazak_HCN_12800': {
      name: "Mazak HCN-12800",
      manufacturer: "Mazak",
      type: "HMC",
      travels: {"x": 1800, "y": 1400, "z": 1450},
      spindle: {"rpm": 5000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "Mazak HCN-12800.step",
      complexity: 0
    },
    'Mazak_INTEGREX_e_1060V_6_II': {
      name: "Mazak INTEGREX e-1060V/6 II",
      manufacturer: "Mazak",
      type: "MULTITASK_VERTICAL",
      travels: {"x": 1050, "y": 1100, "z": 1425},
      spindle: {"rpm": 10000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "Mazak INTEGREX e-1060V-6 II.step",
      complexity: 0
    },
    'Mazak_INTEGREX_e_1600V_10S': {
      name: "Mazak INTEGREX e-1600V/10S",
      manufacturer: "Mazak",
      type: "MULTITASK_VERTICAL",
      travels: {"x": 1700, "y": 1400, "z": 1600},
      spindle: {"rpm": 8000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "Mazak INTEGREX e-1600V-10S.step",
      complexity: 0
    },
    'Mazak_VARIAXIS_i_500': {
      name: "Mazak VARIAXIS i-500",
      manufacturer: "Mazak",
      type: "5AXIS_TRUNNION",
      travels: {"x": 500, "y": 550, "z": 510},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak VARIAXIS i-500.step",
      complexity: 0
    },
    'Mazak_VARIAXIS_i_600': {
      name: "Mazak VARIAXIS i-600",
      manufacturer: "Mazak",
      type: "5AXIS_TRUNNION",
      travels: {"x": 600, "y": 650, "z": 510},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak VARIAXIS i-600.step",
      complexity: 0
    },
    'Mazak_VARIAXIS_i_700': {
      name: "Mazak VARIAXIS i-700",
      manufacturer: "Mazak",
      type: "5AXIS_TRUNNION",
      travels: {"x": 730, "y": 850, "z": 560},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak VARIAXIS i-700.step",
      complexity: 0
    },
    'Mazak_VARIAXIS_i_800': {
      name: "Mazak VARIAXIS i-800",
      manufacturer: "Mazak",
      type: "5AXIS_TRUNNION",
      travels: {"x": 800, "y": 1050, "z": 590},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak VARIAXIS i-800.step",
      complexity: 0
    },
    'Mazak_VARIAXIS_i_1050': {
      name: "Mazak VARIAXIS i-1050",
      manufacturer: "Mazak",
      type: "5AXIS_TRUNNION",
      travels: {"x": 1050, "y": 1200, "z": 700},
      spindle: {"rpm": 10000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "Mazak VARIAXIS i-1050.step",
      complexity: 0
    },
    'Mazak_VARIAXIS_630_5X_II_T': {
      name: "Mazak VARIAXIS 630-5X II T",
      manufacturer: "Mazak",
      type: "5AXIS_TRUNNION",
      travels: {"x": 630, "y": 900, "z": 580},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak VARIAXIS 630-5X II T.step",
      complexity: 0
    },
    'Mazak_Variaxis_J_500': {
      name: "Mazak Variaxis J-500",
      manufacturer: "Mazak",
      type: "5AXIS_TRUNNION",
      travels: {"x": 500, "y": 400, "z": 460},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak Variaxis J-500.step",
      complexity: 0
    },
    'Mazak_VARIAXIS_j_600': {
      name: "Mazak VARIAXIS j-600",
      manufacturer: "Mazak",
      type: "5AXIS_TRUNNION",
      travels: {"x": 600, "y": 500, "z": 500},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak VARIAXIS j-600.step",
      complexity: 0
    },
    'Mazak_Variaxis_C_600': {
      name: "Mazak Variaxis C-600",
      manufacturer: "Mazak",
      type: "5AXIS_TRUNNION",
      travels: {"x": 600, "y": 550, "z": 510},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak Variaxis C-600.step",
      complexity: 0
    },
    'Mazak_Variaxis_i_300_AWC': {
      name: "Mazak Variaxis i-300 AWC",
      manufacturer: "Mazak",
      type: "5AXIS_TRUNNION",
      travels: {"x": 350, "y": 400, "z": 360},
      spindle: {"rpm": 15000, "taper": "HSK-A63"},
      has3DModel: true,
      stepFile: "Mazak Variaxis i-300 AWC.step",
      complexity: 0
    },
    'Mazak_Variaxis_i_700T': {
      name: "Mazak Variaxis i-700T",
      manufacturer: "Mazak",
      type: "5AXIS_MILL_TURN",
      travels: {"x": 730, "y": 850, "z": 560},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak Variaxis i-700T.step",
      complexity: 0
    },
    'Mazak_VC_Ez_16': {
      name: "Mazak VC-Ez 16",
      manufacturer: "Mazak",
      type: "3AXIS_VMC",
      travels: {"x": 410, "y": 305, "z": 460},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak VC-Ez 16.step",
      complexity: 0
    },
    'Mazak_VC_Ez_20': {
      name: "Mazak VC-Ez 20",
      manufacturer: "Mazak",
      type: "3AXIS_VMC",
      travels: {"x": 510, "y": 405, "z": 460},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak VC-Ez 20.step",
      complexity: 0
    },
    'Mazak_VC_Ez_20_15000_RPM_SPINDLE': {
      name: "Mazak VC-Ez 20 15000 RPM",
      manufacturer: "Mazak",
      type: "3AXIS_VMC",
      travels: {"x": 510, "y": 405, "z": 460},
      spindle: {"rpm": 15000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak VC-Ez 20 15000 RPM SPINDLE.step",
      complexity: 0
    },
    'Mazak_VC_Ez_26': {
      name: "Mazak VC-Ez 26",
      manufacturer: "Mazak",
      type: "3AXIS_VMC",
      travels: {"x": 660, "y": 505, "z": 510},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak VC-Ez 26.step",
      complexity: 0
    },
    'Mazak_VC_Ez_26_with_MR250_Rotary': {
      name: "Mazak VC-Ez 26 with MR250 Rotary",
      manufacturer: "Mazak",
      type: "4AXIS_VMC",
      travels: {"x": 660, "y": 505, "z": 510},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak VC-Ez 26 with MR250 Rotary.step",
      complexity: 0
    },
    'Mazak_VCN_510C_II': {
      name: "Mazak VCN 510C-II",
      manufacturer: "Mazak",
      type: "3AXIS_VMC",
      travels: {"x": 560, "y": 410, "z": 460},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak VCN 510C-II.step",
      complexity: 0
    },
    'Mazak_VCN_530C': {
      name: "Mazak VCN 530C",
      manufacturer: "Mazak",
      type: "3AXIS_VMC",
      travels: {"x": 560, "y": 410, "z": 510},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak VCN 530C.step",
      complexity: 0
    },
    'Mazak_VCN_570': {
      name: "Mazak VCN-570",
      manufacturer: "Mazak",
      type: "3AXIS_VMC",
      travels: {"x": 760, "y": 510, "z": 560},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak VCN-570.step",
      complexity: 0
    },
    'Mazak_VCN_570C': {
      name: "Mazak VCN-570C",
      manufacturer: "Mazak",
      type: "3AXIS_VMC",
      travels: {"x": 760, "y": 510, "z": 560},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak VCN-570C.step",
      complexity: 0
    },
    'Mazak_VTC_530C': {
      name: "Mazak VTC-530C",
      manufacturer: "Mazak",
      type: "3AXIS_VMC",
      travels: {"x": 1300, "y": 530, "z": 510},
      spindle: {"rpm": 10000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak VTC-530C.step",
      complexity: 0
    },
    'Mazak_VTC_800_30SR': {
      name: "Mazak VTC-800/30SR",
      manufacturer: "Mazak",
      type: "5AXIS_SWIVEL_ROTARY",
      travels: {"x": 2500, "y": 820, "z": 720},
      spindle: {"rpm": 10000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "Mazak VTC-800-30SR.step",
      complexity: 0
    },
    'Mazak_VTC_800_30SDR': {
      name: "Mazak VTC-800/30SDR",
      manufacturer: "Mazak",
      type: "5AXIS_SWIVEL_ROTARY",
      travels: {"x": 2500, "y": 820, "z": 720},
      spindle: {"rpm": 10000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "Mazak VTC-800-30SDR.step",
      complexity: 0
    },
    'Mazak_VC_500_AM': {
      name: "Mazak VC-500 AM",
      manufacturer: "Mazak",
      type: "5AXIS_ADDITIVE",
      travels: {"x": 500, "y": 500, "z": 510},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak VC-500 AM.step",
      complexity: 0
    },
    'Mazak_VCU_500A_5X': {
      name: "Mazak VCU-500A 5X",
      manufacturer: "Mazak",
      type: "5AXIS_TRUNNION",
      travels: {"x": 500, "y": 500, "z": 510},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "Mazak VCU-500A 5X.step",
      complexity: 0
    },
    'OKUMA_GENOS_M460_VE_e': {
      name: "OKUMA GENOS M460-VE-e",
      manufacturer: "Okuma",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 460, "z": 460},
      spindle: {"rpm": 15000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "OKUMA GENOS M460-VE-e.step",
      complexity: 0
    },
    'OKUMA_GENOS_M560_V_e': {
      name: "OKUMA GENOS M560-V-e",
      manufacturer: "Okuma",
      type: "3AXIS_VMC",
      travels: {"x": 1050, "y": 560, "z": 460},
      spindle: {"rpm": 15000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "OKUMA GENOS M560-V-e.step",
      complexity: 0
    },
    'OKUMA_GENOS_M560_VA_HC': {
      name: "OKUMA GENOS M560-VA-HC",
      manufacturer: "Okuma",
      type: "3AXIS_VMC",
      travels: {"x": 1050, "y": 560, "z": 460},
      spindle: {"rpm": 15000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "OKUMA GENOS M560-VA-HC.step",
      complexity: 0
    },
    'OKUMA_GENOS_M660_VA': {
      name: "OKUMA GENOS M660-VA",
      manufacturer: "Okuma",
      type: "3AXIS_VMC",
      travels: {"x": 1300, "y": 660, "z": 540},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "OKUMA GENOS M660-VA.step",
      complexity: 0
    },
    'OKUMA_GENOS_M660_VB': {
      name: "OKUMA GENOS M660-VB",
      manufacturer: "Okuma",
      type: "3AXIS_VMC",
      travels: {"x": 1300, "y": 660, "z": 540},
      spindle: {"rpm": 12000, "taper": "BT50"},
      has3DModel: true,
      stepFile: "OKUMA GENOS M660-VB.step",
      complexity: 0
    },
    'OKUMA_MA_500HII': {
      name: "OKUMA MA-500HII",
      manufacturer: "Okuma",
      type: "HMC",
      travels: {"x": 730, "y": 730, "z": 800},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "OKUMA MA-500HII.step",
      complexity: 0
    },
    'OKUMA_MA_550VB': {
      name: "OKUMA MA-550VB",
      manufacturer: "Okuma",
      type: "3AXIS_VMC",
      travels: {"x": 900, "y": 550, "z": 500},
      spindle: {"rpm": 8000, "taper": "BT50"},
      has3DModel: true,
      stepFile: "OKUMA MA-550VB.step",
      complexity: 0
    },
    'OKUMA_MA_600H': {
      name: "OKUMA MA-600H",
      manufacturer: "Okuma",
      type: "HMC",
      travels: {"x": 900, "y": 800, "z": 900},
      spindle: {"rpm": 10000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "OKUMA MA-600H.step",
      complexity: 0
    },
    'OKUMA_MA_600HII': {
      name: "OKUMA MA-600HII",
      manufacturer: "Okuma",
      type: "HMC",
      travels: {"x": 900, "y": 800, "z": 900},
      spindle: {"rpm": 12000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "OKUMA MA-600HII.step",
      complexity: 0
    },
    'OKUMA_MA_650VB': {
      name: "OKUMA MA-650VB",
      manufacturer: "Okuma",
      type: "3AXIS_VMC",
      travels: {"x": 1050, "y": 650, "z": 550},
      spindle: {"rpm": 8000, "taper": "BT50"},
      has3DModel: true,
      stepFile: "OKUMA MA-650VB.step",
      complexity: 0
    },
    'OKUMA_MB_4000H': {
      name: "OKUMA MB-4000H",
      manufacturer: "Okuma",
      type: "HMC",
      travels: {"x": 560, "y": 560, "z": 625},
      spindle: {"rpm": 15000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "OKUMA MB-4000H.step",
      complexity: 0
    },
    'OKUMA_MB_46VAE': {
      name: "OKUMA MB-46VAE",
      manufacturer: "Okuma",
      type: "3AXIS_VMC",
      travels: {"x": 762, "y": 460, "z": 460},
      spindle: {"rpm": 15000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "OKUMA MB-46VAE.step",
      complexity: 0
    },
    'OKUMA_MB_5000H': {
      name: "OKUMA MB-5000H",
      manufacturer: "Okuma",
      type: "HMC",
      travels: {"x": 730, "y": 730, "z": 800},
      spindle: {"rpm": 15000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "OKUMA MB-5000H.step",
      complexity: 0
    },
    'OKUMA_MB_56VA': {
      name: "OKUMA MB-56VA",
      manufacturer: "Okuma",
      type: "3AXIS_VMC",
      travels: {"x": 1050, "y": 560, "z": 460},
      spindle: {"rpm": 15000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "OKUMA MB-56VA.step",
      complexity: 0
    },
    'OKUMA_MB_66VA': {
      name: "OKUMA MB-66VA",
      manufacturer: "Okuma",
      type: "3AXIS_VMC",
      travels: {"x": 1300, "y": 660, "z": 540},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "OKUMA MB-66VA.step",
      complexity: 0
    },
    'OKUMA_MB_8000H': {
      name: "OKUMA MB-8000H",
      manufacturer: "Okuma",
      type: "HMC",
      travels: {"x": 1100, "y": 900, "z": 980},
      spindle: {"rpm": 10000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "OKUMA MB-8000H.step",
      complexity: 0
    },
    'OKUMA_MCR_A5CII_25x40': {
      name: "OKUMA MCR-A5CII 25x40",
      manufacturer: "Okuma",
      type: "DOUBLE_COLUMN",
      travels: {"x": 2500, "y": 4000, "z": 500},
      spindle: {"rpm": 10000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "OKUMA MCR-A5CII 25x40.step",
      complexity: 0
    },
    'OKUMA_MCR_BIII_25E_25x40': {
      name: "OKUMA MCR-BIII 25E 25x40",
      manufacturer: "Okuma",
      type: "DOUBLE_COLUMN",
      travels: {"x": 2500, "y": 4000, "z": 500},
      spindle: {"rpm": 6000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "OKUMA MCR-BIII 25E 25x40.step",
      complexity: 0
    },
    'OKUMA_MCR_BIII_25E_25x50': {
      name: "OKUMA MCR-BIII 25E 25x50",
      manufacturer: "Okuma",
      type: "DOUBLE_COLUMN",
      travels: {"x": 2500, "y": 5000, "z": 500},
      spindle: {"rpm": 6000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "OKUMA MCR-BIII 25E 25x50.step",
      complexity: 0
    },
    'OKUMA_MCR_BIII_35E_35x65': {
      name: "OKUMA MCR-BIII 35E 35x65",
      manufacturer: "Okuma",
      type: "DOUBLE_COLUMN",
      travels: {"x": 3500, "y": 6500, "z": 600},
      spindle: {"rpm": 6000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "OKUMA MCR-BIII 35E 35x65.step",
      complexity: 0
    },
    'OKUMA_MILLAC_33T': {
      name: "OKUMA MILLAC 33T",
      manufacturer: "Okuma",
      type: "5AXIS_TRUNNION",
      travels: {"x": 500, "y": 330, "z": 350},
      spindle: {"rpm": 20000, "taper": "HSK-A63"},
      has3DModel: true,
      stepFile: "OKUMA MILLAC 33T.step",
      complexity: 0
    },
    'OKUMA_MILLAC_761VII': {
      name: "OKUMA MILLAC 761VII",
      manufacturer: "Okuma",
      type: "3AXIS_VMC",
      travels: {"x": 1900, "y": 610, "z": 560},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "OKUMA MILLAC 761VII.step",
      complexity: 0
    },
    'OKUMA_MILLAC_800VH': {
      name: "OKUMA MILLAC 800VH",
      manufacturer: "Okuma",
      type: "3AXIS_VMC",
      travels: {"x": 1600, "y": 800, "z": 700},
      spindle: {"rpm": 10000, "taper": "BT50"},
      has3DModel: true,
      stepFile: "OKUMA MILLAC 800VH.step",
      complexity: 0
    },
    'OKUMA_MILLAC_852VII': {
      name: "OKUMA MILLAC 852VII",
      manufacturer: "Okuma",
      type: "3AXIS_VMC",
      travels: {"x": 2500, "y": 850, "z": 640},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "OKUMA MILLAC 852VII.step",
      complexity: 0
    },
    'OKUMA_MILLAC_1052VII': {
      name: "OKUMA MILLAC 1052VII",
      manufacturer: "Okuma",
      type: "3AXIS_VMC",
      travels: {"x": 2500, "y": 1050, "z": 640},
      spindle: {"rpm": 12000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "OKUMA MILLAC 1052VII.step",
      complexity: 0
    },
    'OKUMA_MU_400VA': {
      name: "OKUMA MU-400VA",
      manufacturer: "Okuma",
      type: "5AXIS_TRUNNION",
      travels: {"x": 600, "y": 550, "z": 500},
      spindle: {"rpm": 15000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "OKUMA MU-400VA.step",
      complexity: 0
    },
    'OKUMA_MU_500VA': {
      name: "OKUMA MU-500VA",
      manufacturer: "Okuma",
      type: "5AXIS_TRUNNION",
      travels: {"x": 760, "y": 600, "z": 550},
      spindle: {"rpm": 15000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "OKUMA MU-500VA.step",
      complexity: 0
    },
    'OKUMA_MU_500VAL': {
      name: "OKUMA MU-500VAL",
      manufacturer: "Okuma",
      type: "5AXIS_TRUNNION",
      travels: {"x": 1050, "y": 600, "z": 600},
      spindle: {"rpm": 15000, "taper": "CAT40"},
      has3DModel: true,
      stepFile: "OKUMA MU-500VAL.step",
      complexity: 0
    },
    'OKUMA_MU_4000V': {
      name: "OKUMA MU-4000V",
      manufacturer: "Okuma",
      type: "5AXIS_TRUNNION",
      travels: {"x": 900, "y": 760, "z": 680},
      spindle: {"rpm": 12000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "OKUMA MU-4000V.step",
      complexity: 0
    },
    'OKUMA_MU_5000V': {
      name: "OKUMA MU-5000V",
      manufacturer: "Okuma",
      type: "5AXIS_TRUNNION",
      travels: {"x": 1050, "y": 870, "z": 750},
      spindle: {"rpm": 12000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "OKUMA MU-5000V.step",
      complexity: 0
    },
    'OKUMA_MU_6300V': {
      name: "OKUMA MU-6300V",
      manufacturer: "Okuma",
      type: "5AXIS_TRUNNION",
      travels: {"x": 1250, "y": 1000, "z": 850},
      spindle: {"rpm": 10000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "OKUMA MU-6300V.step",
      complexity: 0
    },
    'OKUMA_MU_8000V': {
      name: "OKUMA MU-8000V",
      manufacturer: "Okuma",
      type: "5AXIS_TRUNNION",
      travels: {"x": 1450, "y": 1100, "z": 950},
      spindle: {"rpm": 10000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "OKUMA MU-8000V.step",
      complexity: 0
    },
    'OKUMA_VTM_80YB': {
      name: "OKUMA VTM-80YB",
      manufacturer: "Okuma",
      type: "MULTITASK_VERTICAL",
      travels: {"x": 900, "y": 500, "z": 700},
      spindle: {"rpm": 6000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "OKUMA VTM-80YB.step",
      complexity: 0
    },
    'OKUMA_VTM_1200YB': {
      name: "OKUMA VTM-1200YB",
      manufacturer: "Okuma",
      type: "MULTITASK_VERTICAL",
      travels: {"x": 1350, "y": 700, "z": 1050},
      spindle: {"rpm": 6000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "OKUMA VTM-1200YB.step",
      complexity: 0
    },
    'OKUMA_VTM_2000YB': {
      name: "OKUMA VTM-2000YB",
      manufacturer: "Okuma",
      type: "MULTITASK_VERTICAL",
      travels: {"x": 2250, "y": 1000, "z": 1400},
      spindle: {"rpm": 6000, "taper": "CAT50"},
      has3DModel: true,
      stepFile: "OKUMA VTM-2000YB.step",
      complexity: 0
    },
    'DMG_DMU_70_eVolution': {
      name: "DMG MORI DMU 70 eVolution",
      manufacturer: "DMG_MORI",
      type: "5AXIS_TRUNNION",
      travels: {"x": 700, "y": 700, "z": 550},
      spindle: {"rpm": 18000, "taper": "HSK-A63"},
      has3DModel: true,
      stepFile: "DMU_70_eVolution_-__max_eley_-_2022.step",
      complexity: 0
    },
    'DMG_DMU_65_FD': {
      name: "DMG MORI DMU 65 FD monoBLOCK",
      manufacturer: "DMG_MORI",
      type: "5AXIS_MILL_TURN",
      travels: {"x": 735, "y": 650, "z": 560},
      spindle: {"rpm": 12000, "taper": "HSK-A63"},
      has3DModel: true,
      stepFile: "DMU_65_FD.stp",
      complexity: 0
    },
    'Mitsubishi_MD_PRO_II',
    // DMG MORI machines from v8.9.253
    'DMG_DMU_75_monoBLOCK': {
      name: "DMG MORI DMU 75 monoBLOCK",
      manufacturer: "DMG_MORI",
      type: "5AXIS_TRUNNION",
      travels: {"x": 750, "y": 650, "z": 560},
      spindle: {"rpm": 15000, "taper": "HSK-A63"},
      has3DModel: true,
      stepFile: "DMU75monoBLOK.stp",
      complexity: 0
    },
  },
  // Machine lookup by manufacturer
  getByManufacturer(mfr) {
    return Object.entries(this.machines)
      .filter(([id, m]) => m.manufacturer === mfr)
      .map(([id, m]) => ({id, ...m}));
  },
  // Machine lookup by type
  getByType(type) {
    return Object.entries(this.machines)
      .filter(([id, m]) => m.type === type)
      .map(([id, m]) => ({id, ...m}));
  },
  // Get machine by ID
  getMachine(id) {
    const normalized = id.toLowerCase().replace(/[-\s]+/g, '_').replace(/[^a-z0-9_]/g, '');
    return this.machines[normalized] || this.machines[id] || null;
  },
  // Check if model has 3D CAD available
  has3DModel(id) {
    const machine = this.getMachine(id);
    return machine?.has3DModel || false;
  }
};
