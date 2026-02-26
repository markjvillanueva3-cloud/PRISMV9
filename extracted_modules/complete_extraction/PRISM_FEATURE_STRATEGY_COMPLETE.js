const PRISM_FEATURE_STRATEGY_COMPLETE = {
    version: '3.0.0',
    totalFeatures: 95,

    features: {
    "pocket_open": {
        "roughing": [
            "adaptive_clearing",
            "dynamic_area",
            "trochoidal",
            "pocket_2d"
        ],
        "semi_finish": [
            "waterline",
            "rest_roughing",
            "contour_2d"
        ],
        "finishing": [
            "contour_2d",
            "parallel",
            "spiral"
        ],
        "preferred_tools": [
            "endmill_roughing",
            "endmill_flat",
            "endmill_high_helix"
        ]
    },
    "pocket_closed": {
        "roughing": [
            "adaptive_clearing",
            "dynamic_area",
            "pocket_2d",
            "trochoidal"
        ],
        "semi_finish": [
            "waterline",
            "rest_roughing"
        ],
        "finishing": [
            "contour_2d",
            "spiral",
            "parallel"
        ],
        "preferred_tools": [
            "endmill_roughing",
            "endmill_flat"
        ]
    },
    "pocket_circular": {
        "roughing": [
            "helical_bore",
            "adaptive_clearing",
            "dynamic_area"
        ],
        "semi_finish": [
            "rest_roughing",
            "contour_2d"
        ],
        "finishing": [
            "contour_2d",
            "spiral"
        ],
        "preferred_tools": [
            "endmill_flat",
            "endmill_finishing"
        ]
    },
    "pocket_irregular": {
        "roughing": [
            "adaptive_clearing",
            "dynamic_area",
            "rest_roughing"
        ],
        "semi_finish": [
            "rest_roughing",
            "waterline"
        ],
        "finishing": [
            "contour_2d",
            "pencil",
            "parallel"
        ],
        "preferred_tools": [
            "endmill_roughing",
            "endmill_ballnose"
        ]
    },
    "pocket_with_islands": {
        "roughing": [
            "adaptive_clearing",
            "dynamic_area",
            "pocket_2d"
        ],
        "semi_finish": [
            "rest_roughing",
            "waterline"
        ],
        "finishing": [
            "contour_2d",
            "pencil"
        ],
        "preferred_tools": [
            "endmill_roughing",
            "endmill_flat"
        ]
    },
    "pocket_deep": {
        "roughing": [
            "adaptive_clearing",
            "waterline",
            "dynamic_area"
        ],
        "semi_finish": [
            "rest_roughing",
            "waterline"
        ],
        "finishing": [
            "waterline",
            "pencil",
            "contour_2d"
        ],
        "preferred_tools": [
            "endmill_roughing",
            "endmill_high_helix"
        ]
    },
    "pocket_shallow": {
        "roughing": [
            "face_mill",
            "pocket_2d",
            "adaptive_clearing"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "contour_2d",
            "parallel"
        ],
        "preferred_tools": [
            "facemill_inserted",
            "endmill_flat"
        ]
    },
    "pocket_tapered": {
        "roughing": [
            "adaptive_clearing",
            "waterline"
        ],
        "semi_finish": [
            "rest_roughing",
            "scallop"
        ],
        "finishing": [
            "scallop",
            "parallel",
            "contour_2d"
        ],
        "preferred_tools": [
            "endmill_tapered",
            "endmill_ballnose"
        ]
    },
    "pocket_multi_level": {
        "roughing": [
            "adaptive_clearing",
            "pocket_2d"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "contour_2d"
        ],
        "preferred_tools": [
            "endmill_roughing",
            "endmill_flat"
        ]
    },
    "pocket_undercut": {
        "roughing": [
            "adaptive_clearing"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "undercut",
            "contour_2d"
        ],
        "preferred_tools": [
            "endmill_lollipop",
            "t_slot_cutter"
        ]
    },
    "pocket_corner_relief": {
        "roughing": [
            "adaptive_clearing"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "pencil",
            "contour_2d"
        ],
        "preferred_tools": [
            "endmill_flat",
            "endmill_ballnose"
        ]
    },
    "pocket_freeform": {
        "roughing": [
            "adaptive_clearing",
            "waterline"
        ],
        "semi_finish": [
            "rest_roughing",
            "scallop"
        ],
        "finishing": [
            "scallop",
            "morph_spiral",
            "flowline"
        ],
        "preferred_tools": [
            "endmill_roughing",
            "endmill_ballnose"
        ]
    },
    "slot_straight": {
        "roughing": [
            "trochoidal",
            "slot_mill",
            "adaptive_clearing"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "contour_2d"
        ],
        "preferred_tools": [
            "slot_drill",
            "endmill_flat",
            "endmill_high_helix"
        ]
    },
    "slot_curved": {
        "roughing": [
            "trochoidal",
            "adaptive_clearing"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "contour_2d",
            "parallel"
        ],
        "preferred_tools": [
            "endmill_flat",
            "endmill_high_helix"
        ]
    },
    "slot_tapered": {
        "roughing": [
            "adaptive_clearing"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "scallop",
            "contour_2d"
        ],
        "preferred_tools": [
            "endmill_tapered",
            "endmill_ballnose"
        ]
    },
    "slot_t": {
        "roughing": [
            "slot_mill"
        ],
        "semi_finish": [],
        "finishing": [
            "t_slot"
        ],
        "preferred_tools": [
            "t_slot_cutter"
        ]
    },
    "slot_dovetail": {
        "roughing": [
            "slot_mill"
        ],
        "semi_finish": [],
        "finishing": [
            "dovetail"
        ],
        "preferred_tools": [
            "dovetail_cutter"
        ]
    },
    "slot_keyway": {
        "roughing": [
            "slot_mill"
        ],
        "semi_finish": [],
        "finishing": [
            "keyway"
        ],
        "preferred_tools": [
            "keyseat_cutter",
            "slot_drill"
        ]
    },
    "slot_woodruff": {
        "roughing": [],
        "semi_finish": [],
        "finishing": [
            "woodruff"
        ],
        "preferred_tools": [
            "woodruff_cutter"
        ]
    },
    "slot_o_ring": {
        "roughing": [
            "slot_mill"
        ],
        "semi_finish": [],
        "finishing": [
            "contour_2d"
        ],
        "preferred_tools": [
            "form_cutter",
            "endmill_flat"
        ]
    },
    "slot_blind": {
        "roughing": [
            "trochoidal",
            "adaptive_clearing"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "contour_2d"
        ],
        "preferred_tools": [
            "slot_drill",
            "endmill_flat"
        ]
    },
    "slot_through": {
        "roughing": [
            "trochoidal",
            "slot_mill"
        ],
        "semi_finish": [],
        "finishing": [
            "contour_2d"
        ],
        "preferred_tools": [
            "slot_drill",
            "endmill_flat"
        ]
    },
    "hole_through_simple": {
        "roughing": [
            "drill_std",
            "peck_drill"
        ],
        "semi_finish": [],
        "finishing": [
            "ream"
        ],
        "preferred_tools": [
            "drill_twist",
            "drill_carbide",
            "reamer_machine"
        ]
    },
    "hole_blind_simple": {
        "roughing": [
            "drill_std",
            "peck_drill"
        ],
        "semi_finish": [],
        "finishing": [
            "ream",
            "bore_finish"
        ],
        "preferred_tools": [
            "drill_twist",
            "drill_carbide",
            "reamer_machine"
        ]
    },
    "hole_deep": {
        "roughing": [
            "peck_drill",
            "gun_drill",
            "chip_break"
        ],
        "semi_finish": [],
        "finishing": [
            "ream",
            "bore_finish"
        ],
        "preferred_tools": [
            "drill_carbide",
            "drill_gun",
            "drill_bta"
        ]
    },
    "hole_precision": {
        "roughing": [
            "drill_std"
        ],
        "semi_finish": [
            "bore_rough"
        ],
        "finishing": [
            "bore_finish",
            "ream"
        ],
        "preferred_tools": [
            "drill_carbide",
            "boring_bar",
            "reamer_machine"
        ]
    },
    "hole_interpolated": {
        "roughing": [
            "helical_bore"
        ],
        "semi_finish": [],
        "finishing": [
            "helical_bore",
            "contour_2d"
        ],
        "preferred_tools": [
            "endmill_flat"
        ]
    },
    "hole_counterbore": {
        "roughing": [
            "drill_std"
        ],
        "semi_finish": [],
        "finishing": [
            "counterbore_op"
        ],
        "preferred_tools": [
            "drill_twist",
            "counterbore",
            "endmill_flat"
        ]
    },
    "hole_countersink": {
        "roughing": [
            "drill_std"
        ],
        "semi_finish": [],
        "finishing": [
            "countersink_op"
        ],
        "preferred_tools": [
            "drill_twist",
            "countersink",
            "chamfer_mill"
        ]
    },
    "hole_spotface": {
        "roughing": [
            "drill_std"
        ],
        "semi_finish": [],
        "finishing": [
            "counterbore_op"
        ],
        "preferred_tools": [
            "drill_twist",
            "endmill_flat"
        ]
    },
    "hole_tapped_through": {
        "roughing": [
            "drill_std"
        ],
        "semi_finish": [],
        "finishing": [
            "tap",
            "thread_mill_internal"
        ],
        "preferred_tools": [
            "drill_twist",
            "tap_spiral_point",
            "thread_mill_single"
        ]
    },
    "hole_tapped_blind": {
        "roughing": [
            "drill_std"
        ],
        "semi_finish": [],
        "finishing": [
            "tap",
            "thread_mill_internal"
        ],
        "preferred_tools": [
            "drill_twist",
            "tap_spiral_flute",
            "thread_mill_single"
        ]
    },
    "hole_roll_tapped": {
        "roughing": [
            "drill_std"
        ],
        "semi_finish": [],
        "finishing": [
            "tap"
        ],
        "preferred_tools": [
            "drill_twist",
            "tap_forming"
        ]
    },
    "hole_pipe_thread": {
        "roughing": [
            "drill_std"
        ],
        "semi_finish": [],
        "finishing": [
            "tap"
        ],
        "preferred_tools": [
            "drill_twist",
            "tap_pipe"
        ]
    },
    "hole_reamed": {
        "roughing": [
            "drill_std"
        ],
        "semi_finish": [],
        "finishing": [
            "ream"
        ],
        "preferred_tools": [
            "drill_carbide",
            "reamer_machine"
        ]
    },
    "hole_bored": {
        "roughing": [
            "drill_std"
        ],
        "semi_finish": [
            "bore_rough"
        ],
        "finishing": [
            "bore_finish"
        ],
        "preferred_tools": [
            "drill_carbide",
            "boring_bar",
            "boring_head"
        ]
    },
    "hole_back_bored": {
        "roughing": [
            "drill_std",
            "bore_rough"
        ],
        "semi_finish": [],
        "finishing": [
            "back_bore_op"
        ],
        "preferred_tools": [
            "drill_carbide",
            "back_counterbore"
        ]
    },
    "hole_stepped": {
        "roughing": [
            "drill_std",
            "peck_drill"
        ],
        "semi_finish": [
            "bore_rough"
        ],
        "finishing": [
            "bore_finish",
            "counterbore_op"
        ],
        "preferred_tools": [
            "drill_step",
            "boring_bar"
        ]
    },
    "hole_center": {
        "roughing": [],
        "semi_finish": [],
        "finishing": [
            "spot_drill"
        ],
        "preferred_tools": [
            "drill_center"
        ]
    },
    "hole_spot": {
        "roughing": [],
        "semi_finish": [],
        "finishing": [
            "spot_drill"
        ],
        "preferred_tools": [
            "drill_spot"
        ]
    },
    "face_flat": {
        "roughing": [
            "face_mill"
        ],
        "semi_finish": [],
        "finishing": [
            "face_mill"
        ],
        "preferred_tools": [
            "facemill_inserted",
            "facemill_shell",
            "facemill_fly_cutter"
        ]
    },
    "face_stepped": {
        "roughing": [
            "face_mill",
            "adaptive_clearing"
        ],
        "semi_finish": [],
        "finishing": [
            "face_mill",
            "contour_2d"
        ],
        "preferred_tools": [
            "facemill_inserted",
            "endmill_flat"
        ]
    },
    "face_angled": {
        "roughing": [
            "face_mill"
        ],
        "semi_finish": [],
        "finishing": [
            "swarf_5axis",
            "parallel"
        ],
        "preferred_tools": [
            "facemill_inserted",
            "endmill_flat"
        ]
    },
    "face_boss": {
        "roughing": [
            "adaptive_clearing"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "contour_2d"
        ],
        "preferred_tools": [
            "endmill_flat",
            "endmill_roughing"
        ]
    },
    "face_peripheral": {
        "roughing": [
            "contour_2d"
        ],
        "semi_finish": [],
        "finishing": [
            "contour_2d"
        ],
        "preferred_tools": [
            "endmill_flat"
        ]
    },
    "face_chamfered": {
        "roughing": [
            "face_mill"
        ],
        "semi_finish": [],
        "finishing": [
            "chamfer_op"
        ],
        "preferred_tools": [
            "facemill_inserted",
            "chamfer_mill"
        ]
    },
    "face_high_feed": {
        "roughing": [
            "face_mill"
        ],
        "semi_finish": [],
        "finishing": [
            "face_mill"
        ],
        "preferred_tools": [
            "facemill_high_feed"
        ]
    },
    "profile_external": {
        "roughing": [
            "contour_2d",
            "adaptive_clearing"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "contour_2d"
        ],
        "preferred_tools": [
            "endmill_flat",
            "endmill_roughing"
        ]
    },
    "profile_internal": {
        "roughing": [
            "adaptive_clearing",
            "helical_bore"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "contour_2d",
            "bore_finish"
        ],
        "preferred_tools": [
            "endmill_flat",
            "boring_bar"
        ]
    },
    "profile_partial": {
        "roughing": [
            "contour_2d"
        ],
        "semi_finish": [],
        "finishing": [
            "contour_2d"
        ],
        "preferred_tools": [
            "endmill_flat"
        ]
    },
    "profile_ramped": {
        "roughing": [
            "adaptive_clearing"
        ],
        "semi_finish": [],
        "finishing": [
            "contour_2d"
        ],
        "preferred_tools": [
            "endmill_flat",
            "endmill_roughing"
        ]
    },
    "profile_helical": {
        "roughing": [
            "helical_bore"
        ],
        "semi_finish": [],
        "finishing": [
            "contour_2d"
        ],
        "preferred_tools": [
            "endmill_flat"
        ]
    },
    "profile_stepped": {
        "roughing": [
            "adaptive_clearing",
            "contour_2d"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "contour_2d"
        ],
        "preferred_tools": [
            "endmill_flat",
            "endmill_roughing"
        ]
    },
    "profile_chamfered": {
        "roughing": [
            "contour_2d"
        ],
        "semi_finish": [],
        "finishing": [
            "chamfer_op"
        ],
        "preferred_tools": [
            "endmill_flat",
            "chamfer_mill"
        ]
    },
    "profile_filleted": {
        "roughing": [
            "contour_2d"
        ],
        "semi_finish": [],
        "finishing": [
            "corner_round"
        ],
        "preferred_tools": [
            "endmill_flat",
            "corner_round_cutter"
        ]
    },
    "boss_circular": {
        "roughing": [
            "adaptive_clearing"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "contour_2d",
            "scallop"
        ],
        "preferred_tools": [
            "endmill_roughing",
            "endmill_flat",
            "endmill_ballnose"
        ]
    },
    "boss_rectangular": {
        "roughing": [
            "adaptive_clearing"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "contour_2d",
            "parallel"
        ],
        "preferred_tools": [
            "endmill_roughing",
            "endmill_flat"
        ]
    },
    "boss_complex": {
        "roughing": [
            "adaptive_clearing",
            "waterline"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "scallop",
            "morph_spiral"
        ],
        "preferred_tools": [
            "endmill_roughing",
            "endmill_ballnose"
        ]
    },
    "boss_tapered": {
        "roughing": [
            "adaptive_clearing"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "scallop",
            "parallel"
        ],
        "preferred_tools": [
            "endmill_tapered",
            "endmill_ballnose"
        ]
    },
    "boss_filleted": {
        "roughing": [
            "adaptive_clearing"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "pencil",
            "scallop"
        ],
        "preferred_tools": [
            "endmill_roughing",
            "endmill_ballnose"
        ]
    },
    "surface_flat": {
        "roughing": [
            "face_mill",
            "parallel"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "parallel",
            "scallop"
        ],
        "preferred_tools": [
            "facemill_inserted",
            "endmill_ballnose"
        ]
    },
    "surface_planar_angled": {
        "roughing": [
            "parallel",
            "swarf_5axis"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "parallel",
            "scallop",
            "swarf_5axis"
        ],
        "preferred_tools": [
            "endmill_flat",
            "endmill_ballnose"
        ]
    },
    "surface_curved_convex": {
        "roughing": [
            "waterline",
            "parallel"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "scallop",
            "morph_spiral",
            "parallel"
        ],
        "preferred_tools": [
            "endmill_roughing",
            "endmill_ballnose"
        ]
    },
    "surface_curved_concave": {
        "roughing": [
            "waterline",
            "parallel"
        ],
        "semi_finish": [
            "rest_roughing",
            "pencil"
        ],
        "finishing": [
            "scallop",
            "morph_spiral",
            "pencil"
        ],
        "preferred_tools": [
            "endmill_roughing",
            "endmill_ballnose"
        ]
    },
    "surface_ruled": {
        "roughing": [
            "swarf_5axis",
            "parallel"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "swarf_5axis",
            "flowline"
        ],
        "preferred_tools": [
            "endmill_flat",
            "endmill_ballnose"
        ]
    },
    "surface_freeform": {
        "roughing": [
            "waterline",
            "parallel"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "scallop",
            "morph_spiral",
            "geodesic"
        ],
        "preferred_tools": [
            "endmill_roughing",
            "endmill_ballnose"
        ]
    },
    "surface_blend": {
        "roughing": [
            "waterline"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "scallop",
            "flowline",
            "isocurve"
        ],
        "preferred_tools": [
            "endmill_ballnose",
            "endmill_bullnose"
        ]
    },
    "surface_draft": {
        "roughing": [
            "waterline"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "parallel",
            "scallop"
        ],
        "preferred_tools": [
            "endmill_tapered",
            "endmill_ballnose"
        ]
    },
    "surface_filleted": {
        "roughing": [
            "waterline"
        ],
        "semi_finish": [
            "pencil",
            "rest_roughing"
        ],
        "finishing": [
            "pencil",
            "scallop"
        ],
        "preferred_tools": [
            "endmill_ballnose"
        ]
    },
    "surface_lofted": {
        "roughing": [
            "waterline",
            "parallel"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "flowline",
            "morph_spiral",
            "scallop"
        ],
        "preferred_tools": [
            "endmill_roughing",
            "endmill_ballnose"
        ]
    },
    "surface_swept": {
        "roughing": [
            "waterline"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "flowline",
            "scallop"
        ],
        "preferred_tools": [
            "endmill_ballnose"
        ]
    },
    "blade": {
        "roughing": [
            "blade_roughing",
            "waterline"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "blade_finishing",
            "swarf_5axis"
        ],
        "preferred_tools": [
            "endmill_tapered",
            "endmill_ballnose"
        ]
    },
    "impeller": {
        "roughing": [
            "impeller",
            "waterline"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "impeller",
            "flowline"
        ],
        "preferred_tools": [
            "endmill_tapered",
            "endmill_ballnose"
        ]
    },
    "blisk": {
        "roughing": [
            "blade_roughing",
            "waterline"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "blade_finishing",
            "flowline"
        ],
        "preferred_tools": [
            "endmill_tapered",
            "endmill_ballnose"
        ]
    },
    "turbine_blade": {
        "roughing": [
            "blade_roughing"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "blade_finishing",
            "swarf_5axis"
        ],
        "preferred_tools": [
            "endmill_tapered",
            "endmill_ballnose"
        ]
    },
    "port": {
        "roughing": [
            "port_machining",
            "waterline"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "port_machining",
            "scallop"
        ],
        "preferred_tools": [
            "endmill_ballnose",
            "endmill_lollipop"
        ]
    },
    "tube": {
        "roughing": [
            "tube_machining",
            "waterline"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "tube_machining"
        ],
        "preferred_tools": [
            "endmill_ballnose"
        ]
    },
    "trim_edge": {
        "roughing": [],
        "semi_finish": [],
        "finishing": [
            "trimming",
            "multiaxis_contour"
        ],
        "preferred_tools": [
            "endmill_flat",
            "endmill_ballnose"
        ]
    },
    "undercut_5axis": {
        "roughing": [
            "multiaxis_contour"
        ],
        "semi_finish": [
            "rest_roughing"
        ],
        "finishing": [
            "multiaxis_contour"
        ],
        "preferred_tools": [
            "endmill_lollipop",
            "endmill_ballnose"
        ]
    },
    "thread_internal_coarse": {
        "roughing": [
            "drill_std"
        ],
        "semi_finish": [],
        "finishing": [
            "tap",
            "thread_mill_internal"
        ],
        "preferred_tools": [
            "drill_twist",
            "tap_spiral_point",
            "thread_mill_single"
        ]
    },
    "thread_internal_fine": {
        "roughing": [
            "drill_std"
        ],
        "semi_finish": [],
        "finishing": [
            "tap",
            "thread_mill_internal"
        ],
        "preferred_tools": [
            "drill_twist",
            "tap_spiral_point",
            "thread_mill_single"
        ]
    },
    "thread_external": {
        "roughing": [],
        "semi_finish": [],
        "finishing": [
            "thread_mill_external"
        ],
        "preferred_tools": [
            "thread_mill"
        ]
    },
    "thread_pipe": {
        "roughing": [
            "drill_std"
        ],
        "semi_finish": [],
        "finishing": [
            "tap"
        ],
        "preferred_tools": [
            "drill_twist",
            "tap_pipe"
        ]
    },
    "thread_acme": {
        "roughing": [],
        "semi_finish": [],
        "finishing": [
            "thread_mill_internal"
        ],
        "preferred_tools": [
            "thread_mill_single"
        ]
    },
    "chamfer_edge": {
        "roughing": [],
        "semi_finish": [],
        "finishing": [
            "chamfer_op"
        ],
        "preferred_tools": [
            "chamfer_mill"
        ]
    },
    "chamfer_hole": {
        "roughing": [],
        "semi_finish": [],
        "finishing": [
            "countersink_op",
            "chamfer_op"
        ],
        "preferred_tools": [
            "countersink",
            "chamfer_mill"
        ]
    },
    "fillet_edge": {
        "roughing": [],
        "semi_finish": [],
        "finishing": [
            "corner_round"
        ],
        "preferred_tools": [
            "corner_round_cutter",
            "endmill_ballnose"
        ]
    },
    "deburr_edge": {
        "roughing": [],
        "semi_finish": [],
        "finishing": [
            "deburr"
        ],
        "preferred_tools": [
            "deburr_tool",
            "chamfer_mill"
        ]
    },
    "deburr_hole": {
        "roughing": [],
        "semi_finish": [],
        "finishing": [
            "deburr"
        ],
        "preferred_tools": [
            "deburr_tool"
        ]
    },
    "engrave_text": {
        "roughing": [],
        "semi_finish": [],
        "finishing": [
            "engrave"
        ],
        "preferred_tools": [
            "endmill_ballnose",
            "endmill_tapered"
        ]
    },
    "engrave_logo": {
        "roughing": [],
        "semi_finish": [],
        "finishing": [
            "engrave"
        ],
        "preferred_tools": [
            "endmill_ballnose",
            "endmill_tapered"
        ]
    },
    "gear_teeth": {
        "roughing": [
            "form_mill"
        ],
        "semi_finish": [],
        "finishing": [
            "form_mill"
        ],
        "preferred_tools": [
            "form_cutter"
        ]
    },
    "spline": {
        "roughing": [
            "form_mill"
        ],
        "semi_finish": [],
        "finishing": [
            "form_mill"
        ],
        "preferred_tools": [
            "form_cutter"
        ]
    },
    "rack": {
        "roughing": [
            "form_mill",
            "slot_mill"
        ],
        "semi_finish": [],
        "finishing": [
            "form_mill"
        ],
        "preferred_tools": [
            "form_cutter",
            "endmill_flat"
        ]
    },
    "worm": {
        "roughing": [],
        "semi_finish": [],
        "finishing": [
            "thread_mill_external"
        ],
        "preferred_tools": [
            "thread_mill"
        ]
    }
},
    // Get strategies for feature
    getStrategies: function(featureType, operation = 'all') {
        const feature = this.features[featureType];
        if (!feature) return null;

        if (operation === 'all') {
            return {
                roughing: feature.roughing || [],
                semi_finish: feature.semi_finish || [],
                finishing: feature.finishing || [],
                preferred_tools: feature.preferred_tools || []
            };
        }
        return feature[operation] || [];
    },
    // Get all feature types
    getAllFeatureTypes: function() {
        return Object.keys(this.features);
    },
    // Find features by strategy
    findFeaturesByStrategy: function(strategy) {
        const results = [];
        for (const [feature, data] of Object.entries(this.features)) {
            const allStrategies = [
                ...(data.roughing || []),
                ...(data.semi_finish || []),
                ...(data.finishing || [])
            ];
            if (allStrategies.includes(strategy)) {
                results.push(feature);
            }
        }
        return results;
    },
    // Get recommended tools for feature
    getRecommendedTools: function(featureType) {
        return this.features[featureType]?.preferred_tools || [];
    }
}