// PRISM_TOOL_TYPES_COMPLETE - Lines 712601-712957 (357 lines) - Tool types complete\n\nconst PRISM_TOOL_TYPES_COMPLETE = {
  "ENDMILL_FLAT": {
    "category": "endmill",
    "geometry": "flat",
    "flutes": [
      2,
      3,
      4,
      5,
      6
    ],
    "helix": [
      30,
      35,
      40,
      45
    ]
  },
  "ENDMILL_BALL": {
    "category": "endmill",
    "geometry": "ball",
    "flutes": [
      2,
      3,
      4
    ],
    "helix": [
      30,
      35
    ]
  },
  "ENDMILL_BULLNOSE": {
    "category": "endmill",
    "geometry": "corner_radius",
    "flutes": [
      2,
      3,
      4,
      5
    ],
    "helix": [
      30,
      35,
      40
    ]
  },
  "ENDMILL_CHAMFER": {
    "category": "endmill",
    "geometry": "chamfer",
    "angles": [
      30,
      45,
      60,
      90
    ]
  },
  "ENDMILL_ROUGHER": {
    "category": "endmill",
    "geometry": "chipbreaker",
    "flutes": [
      3,
      4,
      5,
      6
    ]
  },
  "ENDMILL_FINISHER": {
    "category": "endmill",
    "geometry": "fine_pitch",
    "flutes": [
      6,
      8,
      10,
      12
    ]
  },
  "ENDMILL_HIGHFEED": {
    "category": "endmill",
    "geometry": "high_feed",
    "flutes": [
      3,
      4,
      5
    ]
  },
  "ENDMILL_VARIABLE_HELIX": {
    "category": "endmill",
    "geometry": "variable",
    "helix": [
      35,
      37,
      40,
      42
    ]
  },
  "ENDMILL_TAPERED": {
    "category": "endmill",
    "geometry": "tapered",
    "taper_per_side": [
      0.5,
      1,
      2,
      3,
      5
    ]
  },
  "ENDMILL_LOLLIPOP": {
    "category": "endmill",
    "geometry": "lollipop",
    "flutes": [
      2,
      3
    ]
  },
  "FACEMILL_45": {
    "category": "facemill",
    "lead_angle": 45,
    "indexable": true
  },
  "FACEMILL_75": {
    "category": "facemill",
    "lead_angle": 75,
    "indexable": true
  },
  "FACEMILL_90": {
    "category": "facemill",
    "lead_angle": 90,
    "indexable": true
  },
  "FACEMILL_ROUND": {
    "category": "facemill",
    "lead_angle": 0,
    "insert": "round"
  },
  "FACEMILL_HIGH_FEED": {
    "category": "facemill",
    "high_feed": true
  },
  "SHELLMILL": {
    "category": "shellmill",
    "indexable": true,
    "arbor_mount": true
  },
  "DRILL_TWIST": {
    "category": "drill",
    "type": "twist",
    "point_angles": [
      118,
      130,
      135,
      140
    ]
  },
  "DRILL_STUB": {
    "category": "drill",
    "type": "stub",
    "l_d_ratio": 3
  },
  "DRILL_JOBBER": {
    "category": "drill",
    "type": "jobber",
    "l_d_ratio": 8
  },
  "DRILL_TAPER_LENGTH": {
    "category": "drill",
    "type": "taper_length",
    "l_d_ratio": 12
  },
  "DRILL_EXTRA_LONG": {
    "category": "drill",
    "type": "extra_long",
    "l_d_ratio": 20
  },
  "DRILL_SPADE": {
    "category": "drill",
    "type": "spade",
    "replaceable": true
  },
  "DRILL_INDEXABLE": {
    "category": "drill",
    "type": "indexable",
    "inserts": true
  },
  "DRILL_MODULAR": {
    "category": "drill",
    "type": "modular",
    "replaceable_head": true
  },
  "DRILL_GUN": {
    "category": "drill",
    "type": "gun",
    "l_d_ratio": 40
  },
  "DRILL_BTA": {
    "category": "drill",
    "type": "bta",
    "l_d_ratio": 100
  },
  "DRILL_CENTER": {
    "category": "drill",
    "type": "center",
    "combined": true
  },
  "DRILL_SPOT": {
    "category": "drill",
    "type": "spot",
    "angles": [
      60,
      82,
      90,
      120,
      142
    ]
  },
  "DRILL_COUNTERSINK": {
    "category": "drill",
    "type": "countersink",
    "angles": [
      60,
      82,
      90,
      100,
      120
    ]
  },
  "DRILL_COUNTERBORE": {
    "category": "drill",
    "type": "counterbore",
    "pilot": true
  },
  "DRILL_STEP": {
    "category": "drill",
    "type": "step",
    "multiple_diameters": true
  },
  "REAMER_CHUCKING": {
    "category": "reamer",
    "type": "chucking",
    "straight_shank": true
  },
  "REAMER_SHELL": {
    "category": "reamer",
    "type": "shell",
    "arbor_mount": true
  },
  "REAMER_ADJUSTABLE": {
    "category": "reamer",
    "type": "adjustable"
  },
  "REAMER_TAPER": {
    "category": "reamer",
    "type": "taper",
    "tapers": [
      "morse",
      "brown_sharpe"
    ]
  },
  "BORING_BAR": {
    "category": "boring",
    "type": "standard"
  },
  "BORING_BAR_FINE": {
    "category": "boring",
    "type": "fine_boring",
    "micrometer_adjust": true
  },
  "BORING_BAR_BACK": {
    "category": "boring",
    "type": "back_boring"
  },
  "BORING_HEAD": {
    "category": "boring",
    "type": "head",
    "adjustable": true
  },
  "THREADMILL_SOLID": {
    "category": "threadmill",
    "type": "solid"
  },
  "THREADMILL_INDEXABLE": {
    "category": "threadmill",
    "type": "indexable"
  },
  "THREADMILL_SINGLE_POINT": {
    "category": "threadmill",
    "type": "single_point"
  },
  "THREADMILL_MULTI_FORM": {
    "category": "threadmill",
    "type": "multi_form"
  },
  "TAP_SPIRAL_POINT": {
    "category": "tap",
    "type": "spiral_point",
    "through_hole": true
  },
  "TAP_SPIRAL_FLUTE": {
    "category": "tap",
    "type": "spiral_flute",
    "blind_hole": true
  },
  "TAP_STRAIGHT_FLUTE": {
    "category": "tap",
    "type": "straight_flute"
  },
  "TAP_FORM": {
    "category": "tap",
    "type": "form",
    "chipless": true
  },
  "TAP_THREAD_FORMING": {
    "category": "tap",
    "type": "thread_forming",
    "cold_forming": true
  },
  "SLOT_DRILL": {
    "category": "specialty",
    "type": "slot",
    "center_cutting": true
  },
  "T_SLOT_CUTTER": {
    "category": "specialty",
    "type": "t_slot"
  },
  "DOVETAIL_CUTTER": {
    "category": "specialty",
    "type": "dovetail",
    "angles": [
      45,
      55,
      60
    ]
  },
  "WOODRUFF_CUTTER": {
    "category": "specialty",
    "type": "woodruff"
  },
  "KEYSEAT_CUTTER": {
    "category": "specialty",
    "type": "keyseat"
  },
  "ENGRAVER": {
    "category": "engrave",
    "type": "v_cutter",
    "angles": [
      30,
      60,
      90,
      120
    ]
  },
  "FLY_CUTTER": {
    "category": "specialty",
    "type": "fly_cutter",
    "single_point": true
  }
};
