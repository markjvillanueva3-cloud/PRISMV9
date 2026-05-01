const PRISM_TOOL_HOLDER_INTERFACES_COMPLETE = {
  "CAT30": {
    "type": "v_flange",
    "taper": "30",
    "standard": "ANSI B5.50",
    "spindle_bore": 31.75,
    "flange_dia": 44.45,
    "pull_stud": "std",
    "max_rpm": 20000,
    "use_case": "small_machines"
  },
  "CAT40": {
    "type": "v_flange",
    "taper": "40",
    "standard": "ANSI B5.50",
    "spindle_bore": 44.45,
    "flange_dia": 63.55,
    "pull_stud": "std",
    "max_rpm": 15000,
    "use_case": "general_purpose"
  },
  "CAT45": {
    "type": "v_flange",
    "taper": "45",
    "standard": "ANSI B5.50",
    "spindle_bore": 57.15,
    "flange_dia": 82.55,
    "pull_stud": "std",
    "max_rpm": 10000,
    "use_case": "heavy_duty"
  },
  "CAT50": {
    "type": "v_flange",
    "taper": "50",
    "standard": "ANSI B5.50",
    "spindle_bore": 69.85,
    "flange_dia": 101.6,
    "pull_stud": "std",
    "max_rpm": 8000,
    "use_case": "large_machines"
  },
  "CAT60": {
    "type": "v_flange",
    "taper": "60",
    "standard": "ANSI B5.50",
    "spindle_bore": 107.95,
    "flange_dia": 152.4,
    "pull_stud": "std",
    "max_rpm": 4000,
    "use_case": "very_large"
  },
  "BT30": {
    "type": "bt_taper",
    "taper": "30",
    "standard": "JIS B6339",
    "spindle_bore": 31.75,
    "flange_dia": 46.0,
    "pull_stud": "MAS403",
    "max_rpm": 24000,
    "use_case": "high_speed"
  },
  "BT35": {
    "type": "bt_taper",
    "taper": "35",
    "standard": "JIS B6339",
    "spindle_bore": 38.1,
    "flange_dia": 52.0,
    "pull_stud": "MAS403",
    "max_rpm": 18000,
    "use_case": "medium"
  },
  "BT40": {
    "type": "bt_taper",
    "taper": "40",
    "standard": "JIS B6339",
    "spindle_bore": 44.45,
    "flange_dia": 63.0,
    "pull_stud": "MAS403",
    "max_rpm": 15000,
    "use_case": "general_purpose"
  },
  "BT45": {
    "type": "bt_taper",
    "taper": "45",
    "standard": "JIS B6339",
    "spindle_bore": 57.15,
    "flange_dia": 82.0,
    "pull_stud": "MAS403",
    "max_rpm": 10000,
    "use_case": "heavy_duty"
  },
  "BT50": {
    "type": "bt_taper",
    "taper": "50",
    "standard": "JIS B6339",
    "spindle_bore": 69.85,
    "flange_dia": 101.0,
    "pull_stud": "MAS403",
    "max_rpm": 8000,
    "use_case": "large_machines"
  },
  "HSK-A25": {
    "type": "hsk",
    "form": "A",
    "size": 25,
    "standard": "DIN 69893",
    "taper_ratio": "1:10",
    "flange_dia": 26.0,
    "max_rpm": 50000,
    "use_case": "ultra_high_speed"
  },
  "HSK-A32": {
    "type": "hsk",
    "form": "A",
    "size": 32,
    "standard": "DIN 69893",
    "taper_ratio": "1:10",
    "flange_dia": 33.0,
    "max_rpm": 42000,
    "use_case": "very_high_speed"
  },
  "HSK-A40": {
    "type": "hsk",
    "form": "A",
    "size": 40,
    "standard": "DIN 69893",
    "taper_ratio": "1:10",
    "flange_dia": 42.0,
    "max_rpm": 35000,
    "use_case": "high_speed"
  },
  "HSK-A50": {
    "type": "hsk",
    "form": "A",
    "size": 50,
    "standard": "DIN 69893",
    "taper_ratio": "1:10",
    "flange_dia": 52.0,
    "max_rpm": 28000,
    "use_case": "high_speed"
  },
  "HSK-A63": {
    "type": "hsk",
    "form": "A",
    "size": 63,
    "standard": "DIN 69893",
    "taper_ratio": "1:10",
    "flange_dia": 65.0,
    "max_rpm": 24000,
    "use_case": "general_purpose"
  },
  "HSK-A80": {
    "type": "hsk",
    "form": "A",
    "size": 80,
    "standard": "DIN 69893",
    "taper_ratio": "1:10",
    "flange_dia": 82.0,
    "max_rpm": 18000,
    "use_case": "heavy_duty"
  },
  "HSK-A100": {
    "type": "hsk",
    "form": "A",
    "size": 100,
    "standard": "DIN 69893",
    "taper_ratio": "1:10",
    "flange_dia": 102.0,
    "max_rpm": 14000,
    "use_case": "large"
  },
  "HSK-A125": {
    "type": "hsk",
    "form": "A",
    "size": 125,
    "standard": "DIN 69893",
    "taper_ratio": "1:10",
    "flange_dia": 127.0,
    "max_rpm": 10000,
    "use_case": "very_large"
  },
  "HSK-E25": {
    "type": "hsk",
    "form": "E",
    "size": 25,
    "standard": "DIN 69893",
    "taper_ratio": "1:10",
    "symmetric": true,
    "max_rpm": 60000,
    "use_case": "micro_high_speed"
  },
  "HSK-E32": {
    "type": "hsk",
    "form": "E",
    "size": 32,
    "standard": "DIN 69893",
    "taper_ratio": "1:10",
    "symmetric": true,
    "max_rpm": 50000,
    "use_case": "small_high_speed"
  },
  "HSK-E40": {
    "type": "hsk",
    "form": "E",
    "size": 40,
    "standard": "DIN 69893",
    "taper_ratio": "1:10",
    "symmetric": true,
    "max_rpm": 42000,
    "use_case": "high_speed"
  },
  "HSK-E50": {
    "type": "hsk",
    "form": "E",
    "size": 50,
    "standard": "DIN 69893",
    "taper_ratio": "1:10",
    "symmetric": true,
    "max_rpm": 35000,
    "use_case": "high_speed"
  },
  "HSK-E63": {
    "type": "hsk",
    "form": "E",
    "size": 63,
    "standard": "DIN 69893",
    "taper_ratio": "1:10",
    "symmetric": true,
    "max_rpm": 28000,
    "use_case": "general_hs"
  },
  "HSK-B50": {
    "type": "hsk",
    "form": "B",
    "size": 50,
    "standard": "DIN 69893",
    "taper_ratio": "1:10",
    "manual": true,
    "max_rpm": 15000,
    "use_case": "manual_change"
  },
  "HSK-B63": {
    "type": "hsk",
    "form": "B",
    "size": 63,
    "standard": "DIN 69893",
    "taper_ratio": "1:10",
    "manual": true,
    "max_rpm": 12000,
    "use_case": "manual_change"
  },
  "HSK-B80": {
    "type": "hsk",
    "form": "B",
    "size": 80,
    "standard": "DIN 69893",
    "taper_ratio": "1:10",
    "manual": true,
    "max_rpm": 10000,
    "use_case": "manual_heavy"
  },
  "HSK-B100": {
    "type": "hsk",
    "form": "B",
    "size": 100,
    "standard": "DIN 69893",
    "taper_ratio": "1:10",
    "manual": true,
    "max_rpm": 8000,
    "use_case": "manual_large"
  },
  "HSK-F63": {
    "type": "hsk",
    "form": "F",
    "size": 63,
    "standard": "DIN 69893",
    "application": "grinding",
    "max_rpm": 20000,
    "use_case": "grinding"
  },
  "HSK-T63": {
    "type": "hsk",
    "form": "T",
    "size": 63,
    "standard": "DIN 69893",
    "application": "turning",
    "driven_tool": true,
    "use_case": "lathe_driven"
  },
  "HSK-T80": {
    "type": "hsk",
    "form": "T",
    "size": 80,
    "standard": "DIN 69893",
    "application": "turning",
    "driven_tool": true,
    "use_case": "lathe_driven"
  },
  "HSK-T100": {
    "type": "hsk",
    "form": "T",
    "size": 100,
    "standard": "DIN 69893",
    "application": "turning",
    "driven_tool": true,
    "use_case": "lathe_heavy"
  },
  "CAPTO-C3": {
    "type": "capto",
    "size": "C3",
    "standard": "ISO 26623",
    "coupling_dia": 32.0,
    "torque": 65,
    "max_rpm": 28000,
    "use_case": "small_turning"
  },
  "CAPTO-C4": {
    "type": "capto",
    "size": "C4",
    "standard": "ISO 26623",
    "coupling_dia": 40.0,
    "torque": 150,
    "max_rpm": 22000,
    "use_case": "general_turning"
  },
  "CAPTO-C5": {
    "type": "capto",
    "size": "C5",
    "standard": "ISO 26623",
    "coupling_dia": 50.0,
    "torque": 340,
    "max_rpm": 18000,
    "use_case": "medium_turning"
  },
  "CAPTO-C6": {
    "type": "capto",
    "size": "C6",
    "standard": "ISO 26623",
    "coupling_dia": 63.0,
    "torque": 700,
    "max_rpm": 14000,
    "use_case": "heavy_turning"
  },
  "CAPTO-C8": {
    "type": "capto",
    "size": "C8",
    "standard": "ISO 26623",
    "coupling_dia": 80.0,
    "torque": 1500,
    "max_rpm": 10000,
    "use_case": "very_heavy"
  },
  "CAPTO-C10": {
    "type": "capto",
    "size": "C10",
    "standard": "ISO 26623",
    "coupling_dia": 100.0,
    "torque": 3000,
    "max_rpm": 6000,
    "use_case": "extreme_heavy"
  },
  "KM32": {
    "type": "km",
    "size": 32,
    "standard": "Kennametal",
    "coupling_dia": 32.0,
    "torque": 50,
    "max_rpm": 25000,
    "use_case": "small"
  },
  "KM40": {
    "type": "km",
    "size": 40,
    "standard": "Kennametal",
    "coupling_dia": 40.0,
    "torque": 110,
    "max_rpm": 20000,
    "use_case": "general"
  },
  "KM50": {
    "type": "km",
    "size": 50,
    "standard": "Kennametal",
    "coupling_dia": 50.0,
    "torque": 250,
    "max_rpm": 16000,
    "use_case": "medium"
  },
  "KM63": {
    "type": "km",
    "size": 63,
    "standard": "Kennametal",
    "coupling_dia": 63.0,
    "torque": 550,
    "max_rpm": 12000,
    "use_case": "heavy"
  },
  "KM80": {
    "type": "km",
    "size": 80,
    "standard": "Kennametal",
    "coupling_dia": 80.0,
    "torque": 1100,
    "max_rpm": 8000,
    "use_case": "very_heavy"
  },
  "PSC32": {
    "type": "psc",
    "size": 32,
    "standard": "ISO 26623-2",
    "polygon_sides": 3,
    "use_case": "turning"
  },
  "PSC40": {
    "type": "psc",
    "size": 40,
    "standard": "ISO 26623-2",
    "polygon_sides": 3,
    "use_case": "turning"
  },
  "PSC50": {
    "type": "psc",
    "size": 50,
    "standard": "ISO 26623-2",
    "polygon_sides": 3,
    "use_case": "turning"
  },
  "PSC63": {
    "type": "psc",
    "size": 63,
    "standard": "ISO 26623-2",
    "polygon_sides": 3,
    "use_case": "turning"
  },
  "VDI20": {
    "type": "vdi",
    "size": 20,
    "standard": "DIN 69880",
    "shank_dia": 20.0,
    "use_case": "small_lathe"
  },
  "VDI25": {
    "type": "vdi",
    "size": 25,
    "standard": "DIN 69880",
    "shank_dia": 25.0,
    "use_case": "small_lathe"
  },
  "VDI30": {
    "type": "vdi",
    "size": 30,
    "standard": "DIN 69880",
    "shank_dia": 30.0,
    "use_case": "general_lathe"
  },
  "VDI40": {
    "type": "vdi",
    "size": 40,
    "standard": "DIN 69880",
    "shank_dia": 40.0,
    "use_case": "general_lathe"
  },
  "VDI50": {
    "type": "vdi",
    "size": 50,
    "standard": "DIN 69880",
    "shank_dia": 50.0,
    "use_case": "large_lathe"
  },
  "VDI60": {
    "type": "vdi",
    "size": 60,
    "standard": "DIN 69880",
    "shank_dia": 60.0,
    "use_case": "large_lathe"
  },
  "BMT45": {
    "type": "bmt",
    "size": 45,
    "standard": "BMT",
    "turret_mount": true,
    "use_case": "mill_turn"
    "max_rpm": 6000,
    "torque_nm": 40,
  },
  "BMT55": {
    "type": "bmt",
    "size": 55,
    "standard": "BMT",
    "turret_mount": true,
    "use_case": "mill_turn",
    "max_rpm": 5000,
    "torque_nm": 60
  },
  "BMT65": {
    "type": "bmt",
    "size": 65,
    "standard": "BMT",
    "turret_mount": true,
    "use_case": "mill_turn_heavy",
    "max_rpm": 4000,
    "torque_nm": 90
  },
  "BMT75": {
    "type": "bmt",
    "size": 75,
    "standard": "BMT",
    "turret_mount": true,
    "use_case": "mill_turn_heavy",
    "max_rpm": 3500,
    "torque_nm": 120
  },
  "SK30": {
    "type": "sk",
    "taper": "30",
    "standard": "DIN 2080",
    "spindle_bore": 31.75,
    "use_case": "european_small"
  },
  "SK40": {
    "type": "sk",
    "taper": "40",
    "standard": "DIN 2080",
    "spindle_bore": 44.45,
    "use_case": "european_general"
  },
  "SK50": {
    "type": "sk",
    "taper": "50",
    "standard": "DIN 2080",
    "spindle_bore": 69.85,
    "use_case": "european_large"
  },
  "MT1": {
    "type": "morse",
    "number": 1,
    "standard": "DIN 228-1",
    "taper_per_foot": 0.5986,
    "use_case": "legacy",
    "max_rpm": 2500
  },
  "MT2": {
    "type": "morse",
    "number": 2,
    "standard": "DIN 228-1",
    "taper_per_foot": 0.5994,
    "use_case": "drill_press",
    "max_rpm": 2000
  },
  "MT3": {
    "type": "morse",
    "number": 3,
    "standard": "DIN 228-1",
    "taper_per_foot": 0.6024,
    "use_case": "manual_lathe",
    "max_rpm": 1800
  },
  "MT4": {
    "type": "morse",
    "number": 4,
    "standard": "DIN 228-1",
    "taper_per_foot": 0.6233,
    "use_case": "heavy_lathe",
    "max_rpm": 1500
  },
  "MT5": {
    "type": "morse",
    "number": 5,
    "standard": "DIN 228-1",
    "taper_per_foot": 0.6315,
    "use_case": "large_lathe",
    "max_rpm": 1200
  },
  "R8": {
    "type": "r8",
    "standard": "Bridgeport",
    "shank_dia": 0.95,
    "draw_bar": true,
    "max_rpm": 6000,
    "use_case": "manual_mill"
  },
  "ER8": {
    "type": "er_collet",
    "size": 8,
    "standard": "DIN 6499",
    "capacity_range": [
      0.5,
      5.0
    ],
    "use_case": "micro",
    "max_rpm": 40000,
    "balance_grade": "G2.5"
  },
  "ER11": {
    "type": "er_collet",
    "size": 11,
    "standard": "DIN 6499",
    "capacity_range": [
      0.5,
      7.0
    ],
    "use_case": "small",
    "max_rpm": 35000,
    "balance_grade": "G2.5"
  },
  "ER16": {
    "type": "er_collet",
    "size": 16,
    "standard": "DIN 6499",
    "capacity_range": [
      1.0,
      10.0
    ],
    "use_case": "general",
    "max_rpm": 30000,
    "balance_grade": "G2.5"
  },
  "ER20": {
    "type": "er_collet",
    "size": 20,
    "standard": "DIN 6499",
    "capacity_range": [
      1.0,
      13.0
    ],
    "use_case": "general",
    "max_rpm": 25000,
    "balance_grade": "G2.5"
  },
  "ER25": {
    "type": "er_collet",
    "size": 25,
    "standard": "DIN 6499",
    "capacity_range": [
      1.0,
      16.0
    ],
    "use_case": "general",
    "max_rpm": 20000,
    "balance_grade": "G2.5"
  },
  "ER32": {
    "type": "er_collet",
    "size": 32,
    "standard": "DIN 6499",
    "capacity_range": [
      2.0,
      20.0
    ],
    "use_case": "general_heavy",
    "max_rpm": 18000,
    "balance_grade": "G6.3"
  },
  "ER40": {
    "type": "er_collet",
    "size": 40,
    "standard": "DIN 6499",
    "capacity_range": [
      3.0,
      26.0
    ],
    "use_case": "heavy",
    "max_rpm": 12000,
    "balance_grade": "G6.3"
  },
  "ER50": {
    "type": "er_collet",
    "size": 50,
    "standard": "DIN 6499",
    "capacity_range": [
      6.0,
      34.0
    ],
    "use_case": "very_heavy",
    "max_rpm": 8000,
    "balance_grade": "G6.3"
  },
  "HSK_A63": {
    "type": "hsk_a",
    "taper": "63",
    "standard": "DIN 69893-1",
    "spindle_bore": 63.0,
    "flange_dia": 88.0,
    "clamping": "internal_hollow",
    "max_rpm": 24000,
    "use_case": "high_speed_general"
  },
  "HSK_A100": {
    "type": "hsk_a",
    "taper": "100",
    "standard": "DIN 69893-1",
    "spindle_bore": 100.0,
    "flange_dia": 140.0,
    "clamping": "internal_hollow",
    "max_rpm": 12000,
    "use_case": "heavy_duty_milling"
  },
  "HSK_E32": {
    "type": "hsk_e",
    "taper": "32",
    "standard": "DIN 69893-5",
    "spindle_bore": 32.0,
    "flange_dia": 40.0,
    "clamping": "internal_hollow",
    "max_rpm": 60000,
    "use_case": "ultra_high_speed"
  },
  "HSK_E40": {
    "type": "hsk_e",
    "taper": "40",
    "standard": "DIN 69893-5",
    "spindle_bore": 40.0,
    "flange_dia": 50.0,
    "clamping": "internal_hollow",
    "max_rpm": 50000,
    "use_case": "high_speed_finishing"
  },
  "HSK_T25": {
    "type": "hsk_turning",
    "taper": "25",
    "standard": "ISO 12164-2",
    "spindle_bore": 25.0,
    "flange_dia": 31.25,
    "clamping": "internal",
    "max_rpm": 40000,
    "use_case": "turning_small"
  },
  "HSK_T32": {
    "type": "hsk_turning",
    "taper": "32",
    "standard": "ISO 12164-2",
    "spindle_bore": 32.0,
    "flange_dia": 40.0,
    "clamping": "internal",
    "max_rpm": 35000,
    "use_case": "turning_general"
  },
  "HSK_T40": {
    "type": "hsk_turning",
    "taper": "40",
    "standard": "ISO 12164-2",
    "spindle_bore": 40.0,
    "flange_dia": 50.0,
    "clamping": "internal",
    "max_rpm": 30000,
    "use_case": "turning_general"
  },
  "HSK_T50": {
    "type": "hsk_turning",
    "taper": "50",
    "standard": "ISO 12164-2",
    "spindle_bore": 50.0,
    "flange_dia": 62.5,
    "clamping": "internal",
    "max_rpm": 25000,
    "use_case": "turning_heavy"
  },
  "HSK_B32": {
    "type": "hsk_manual",
    "taper": "32",
    "standard": "DIN 69893-2",
    "spindle_bore": 32.0,
    "flange_dia": 45.0,
    "clamping": "external",
    "max_rpm": 20000,
    "use_case": "manual_change"
  },
  "HSK_B40": {
    "type": "hsk_manual",
    "taper": "40",
    "standard": "DIN 69893-2",
    "spindle_bore": 40.0,
    "flange_dia": 56.0,
    "clamping": "external",
    "max_rpm": 18000,
    "use_case": "manual_change"
  },
  "HSK_B50": {
    "type": "hsk_manual",
    "taper": "50",
    "standard": "DIN 69893-2",
    "spindle_bore": 50.0,
    "flange_dia": 70.0,
    "clamping": "external",
    "max_rpm": 15000,
    "use_case": "manual_heavy"
  },
  "HSK_B63": {
    "type": "hsk_manual",
    "taper": "63",
    "standard": "DIN 69893-2",
    "spindle_bore": 63.0,
    "flange_dia": 88.0,
    "clamping": "external",
    "max_rpm": 12000,
    "use_case": "manual_heavy"
  },
  "MT0": {
    "type": "morse_taper",
    "taper": "0",
    "standard": "ANSI B5.10",
    "bore_small": 6.401,
    "bore_large": 9.045,
    "length": 49.8,
    "taper_angle": 2.9852,
    "max_rpm": 15000,
    "use_case": "small_drilling",
    "max_rpm": 3000
  },
  "MT6": {
    "type": "morse_taper",
    "taper": "6",
    "standard": "ANSI B5.10",
    "bore_small": 63.348,
    "bore_large": 76.213,
    "length": 218.4,
    "taper_angle": 2.9708,
    "max_rpm": 3000,
    "use_case": "very_heavy_drilling",
    "max_rpm": 1000
  },
  "CAPTO_C3": {
    "type": "capto",
    "size": "C3",
    "standard": "ISO 26623",
    "polygon_size": 28.0,
    "flange_dia": 35.0,
    "torque_nm": 40,
    "max_rpm": 35000,
    "use_case": "small_precision"
  },
  "CAPTO_C4": {
    "type": "capto",
    "size": "C4",
    "standard": "ISO 26623",
    "polygon_size": 35.0,
    "flange_dia": 45.0,
    "torque_nm": 100,
    "max_rpm": 30000,
    "use_case": "general_purpose"
  },
  "CAPTO_C5": {
    "type": "capto",
    "size": "C5",
    "standard": "ISO 26623",
    "polygon_size": 45.0,
    "flange_dia": 56.0,
    "torque_nm": 200,
    "max_rpm": 25000,
    "use_case": "general_heavy"
  },
  "CAPTO_C6": {
    "type": "capto",
    "size": "C6",
    "standard": "ISO 26623",
    "polygon_size": 56.0,
    "flange_dia": 70.0,
    "torque_nm": 400,
    "max_rpm": 18000,
    "use_case": "multi_axis"
  },
  "CAPTO_C8": {
    "type": "capto",
    "size": "C8",
    "standard": "ISO 26623",
    "polygon_size": 70.0,
    "flange_dia": 88.0,
    "torque_nm": 800,
    "max_rpm": 12000,
    "use_case": "heavy_turning"
  },
  "CAPTO_C10": {
    "type": "capto",
    "size": "C10",
    "standard": "ISO 26623",
    "polygon_size": 90.0,
    "flange_dia": 112.0,
    "torque_nm": 1600,
    "max_rpm": 8000,
    "use_case": "very_heavy"
  },
  "KM16": {
    "type": "kennametal_km",
    "size": "16",
    "standard": "Proprietary",
    "face_width": 16.0,
    "torque_nm": 25,
    "max_rpm": 40000,
    "use_case": "micro_machining"
  },
  "KM25": {
    "type": "kennametal_km",
    "size": "25",
    "standard": "Proprietary",
    "face_width": 25.0,
    "torque_nm": 60,
    "max_rpm": 35000,
    "use_case": "small_precision"
  },
  "KM100": {
    "type": "kennametal_km",
    "size": "100",
    "standard": "Proprietary",
    "face_width": 100.0,
    "torque_nm": 2000,
    "max_rpm": 6000,
    "use_case": "very_heavy"
  },
  "PSC25": {
    "type": "psc",
    "size": "25",
    "standard": "ISO 26623",
    "polygon_size": 25.0,
    "torque_nm": 30,
    "max_rpm": 40000,
    "use_case": "high_speed_small"
  },
  "PSC80": {
    "type": "psc",
    "size": "80",
    "standard": "ISO 26623",
    "polygon_size": 80.0,
    "torque_nm": 1200,
    "max_rpm": 10000,
    "use_case": "heavy_duty"
  },
  "VDI30_AXIAL": {
    "type": "vdi_axial",
    "size": "30",
    "standard": "DIN 69880",
    "shank_dia": 30.0,
    "collar_dia": 42.0,
    "orientation": "axial",
    "max_rpm": 6000,
    "use_case": "axial_drilling"
  },
  "VDI30_RADIAL": {
    "type": "vdi_radial",
    "size": "30",
    "standard": "DIN 69880",
    "shank_dia": 30.0,
    "collar_dia": 42.0,
    "orientation": "radial",
    "max_rpm": 6000,
    "use_case": "radial_milling"
  }
}