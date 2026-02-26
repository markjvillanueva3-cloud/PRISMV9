// PRISM_TOOLPATH_STRATEGIES_COMPLETE - Lines 709235-710282 (1048 lines) - Toolpath strategies\n\nconst PRISM_TOOLPATH_STRATEGIES_COMPLETE = {
  "BLEND_FINISHING": {
    "axes": "3D",
    "category": "3d_finishing",
    "description": "Blended surface finishing",
    "finishing": true,
    "roughing": false
  },
  "CLEANUP": {
    "axes": "3D",
    "category": "3d_finishing",
    "finishing": true,
    "rest": true
  },
  "CONSTANT_Z": {
    "axes": "3D",
    "category": "3d_finishing",
    "finishing": true,
    "pattern": "constant_z"
  },
  "CONTOUR_3D": {
    "axes": "3D",
    "category": "3d_finishing",
    "finishing": true
  },
  "CORNER_FINISHING": {
    "axes": "3D",
    "category": "3d_finishing",
    "description": "Internal corner cleanup",
    "finishing": true,
    "roughing": false
  },
  "FLOWLINE": {
    "axes": "3D",
    "category": "3d_finishing",
    "finishing": true,
    "pattern": "flowline"
  },
  "GEODESIC": {
    "axes": "3D",
    "category": "3d_finishing",
    "finishing": true,
    "pattern": "geodesic"
  },
  "ISOCURVE": {
    "axes": "3D",
    "category": "3d_finishing",
    "finishing": true,
    "pattern": "isocurve"
  },
  "LEFTOVER": {
    "axes": "3D",
    "category": "3d_finishing",
    "description": "Leftover material detection",
    "finishing": true,
    "rest": true,
    "roughing": false
  },
  "MORPHED_SPIRAL": {
    "axes": "3D",
    "category": "3d_finishing",
    "description": "Morphed spiral pattern",
    "finishing": true,
    "roughing": false
  },
  "OPTIMIZED_CONSTANT_Z": {
    "axes": "3D",
    "category": "3d_finishing",
    "description": "Optimized Z-level finishing",
    "finishing": true,
    "roughing": false
  },
  "PARALLEL_BOTH_WAYS": {
    "axes": "3D",
    "category": "3d_finishing",
    "finishing": true,
    "pattern": "parallel"
  },
  "PARALLEL_FINISHING": {
    "axes": "3D",
    "category": "3d_finishing",
    "finishing": true,
    "pattern": "parallel"
  },
  "PARALLEL_SPIRAL": {
    "axes": "3D",
    "category": "3d_finishing",
    "finishing": true,
    "pattern": "spiral"
  },
  "PENCIL": {
    "axes": "3D",
    "category": "3d_finishing",
    "finishing": true,
    "pattern": "pencil"
  },
  "PENCIL_TRACE": {
    "axes": "3D",
    "category": "3d_finishing",
    "finishing": true
  },
  "RADIAL_FINISHING": {
    "axes": "3D",
    "category": "3d_finishing",
    "finishing": true,
    "pattern": "radial"
  },
  "REST_FINISHING": {
    "axes": "3D",
    "category": "3d_finishing",
    "finishing": true,
    "rest": true
  },
  "SCALLOP": {
    "axes": "3D",
    "category": "3d_finishing",
    "finishing": true,
    "pattern": "scallop"
  },
  "SHALLOW_ONLY": {
    "axes": "3D",
    "category": "3d_finishing",
    "description": "Shallow area only machining",
    "finishing": true,
    "roughing": false
  },
  "SPIRAL_3D": {
    "axes": "3D",
    "category": "3d_finishing",
    "description": "3D spiral surface finishing",
    "finishing": true,
    "roughing": false
  },
  "STEEP_ONLY": {
    "axes": "3D",
    "category": "3d_finishing",
    "description": "Steep area only machining",
    "finishing": true,
    "roughing": false
  },
  "STEEP_SHALLOW": {
    "axes": "3D",
    "category": "3d_finishing",
    "finishing": true,
    "pattern": "steep_shallow"
  },
  "WATERLINE": {
    "axes": "3D",
    "category": "3d_finishing",
    "finishing": true,
    "pattern": "waterline"
  },
  "CONTOUR_3D_ROUGHING": {
    "axes": "3D",
    "category": "3d_roughing",
    "roughing": true
  },
  "LEVEL_Z_ROUGHING": {
    "axes": "3D",
    "category": "3d_roughing",
    "pattern": "level_z",
    "roughing": true
  },
  "REST_ROUGHING": {
    "axes": "3D",
    "category": "3d_roughing",
    "rest": true,
    "roughing": true
  },
  "ROUGHING_3D": {
    "axes": "3D",
    "category": "3d_roughing",
    "roughing": true
  },
  "5AXIS_BLADE": {
    "axes": "5D",
    "category": "5axis",
    "specialized": "blade"
  },
  "5AXIS_BLISK": {
    "axes": "5D",
    "category": "5axis",
    "specialized": "blisk"
  },
  "5AXIS_CONTOUR": {
    "axes": "5D",
    "category": "5axis",
    "finishing": true
  },
  "5AXIS_DRIVE_CURVE": {
    "axes": "5D",
    "category": "5axis",
    "pattern": "drive_curve"
  },
  "5AXIS_FLOWLINE": {
    "axes": "5D",
    "category": "5axis",
    "pattern": "flowline"
  },
  "5AXIS_GEODESIC": {
    "axes": "5D",
    "category": "5axis",
    "pattern": "geodesic"
  },
  "5AXIS_IMPELLER": {
    "axes": "5D",
    "category": "5axis",
    "specialized": "impeller"
  },
  "5AXIS_MORPH": {
    "axes": "5D",
    "category": "5axis",
    "pattern": "morph"
  },
  "5AXIS_PARALLEL": {
    "axes": "5D",
    "category": "5axis",
    "pattern": "parallel"
  },
  "5AXIS_PORT": {
    "axes": "5D",
    "category": "5axis",
    "specialized": "port"
  },
  "5AXIS_PROJECT": {
    "axes": "5D",
    "category": "5axis",
    "pattern": "project"
  },
  "5AXIS_SWARF": {
    "axes": "5D",
    "category": "5axis",
    "pattern": "swarf"
  },
  "ADAPTIVE_2D": {
    "axes": "2.5D",
    "category": "adaptive",
    "hsm": true,
    "roughing": true
  },
  "ADAPTIVE_3D": {
    "axes": "3D",
    "category": "adaptive",
    "hsm": true,
    "roughing": true
  },
  "ADAPTIVE_CLEARING": {
    "axes": "3D",
    "category": "adaptive",
    "engagement": "constant",
    "hsm": true,
    "roughing": true
  },
  "DYNAMIC_MILLING": {
    "axes": "3D",
    "category": "adaptive",
    "hsm": true,
    "roughing": true
  },
  "HSM_ROUGHING": {
    "axes": "3D",
    "category": "adaptive",
    "hsm": true,
    "roughing": true
  },
  "IMACHINING": {
    "axes": "3D",
    "category": "adaptive",
    "commercial": true,
    "hsm": true,
    "roughing": true
  },
  "PROFITMILL": {
    "axes": "3D",
    "category": "adaptive",
    "commercial": true,
    "hsm": true,
    "roughing": true
  },
  "TROCHOIDAL": {
    "axes": "2.5D",
    "category": "adaptive",
    "hsm": true,
    "pattern": "trochoidal",
    "roughing": true
  },
  "TROCHOIDAL_SLOT": {
    "axes": "2.5D",
    "category": "adaptive",
    "pattern": "trochoidal",
    "roughing": true
  },
  "VOLUMILL": {
    "axes": "3D",
    "category": "adaptive",
    "commercial": true,
    "hsm": true,
    "roughing": true
  },
  "WAVEFORM": {
    "axes": "2.5D",
    "category": "adaptive",
    "hsm": true,
    "roughing": true
  },
  "BALANCED": {
    "balance_g": 2.5,
    "category": "balanced",
    "gripping_force": "medium",
    "max_rpm": 50000,
    "runout_um": 3
  },
  "BORE_BACK": {
    "category": "boring",
    "operation": "back_bore"
  },
  "BORE_FINE": {
    "category": "boring",
    "precision": true
  },
  "BORE_FINISH": {
    "category": "boring",
    "finishing": true
  },
  "BORE_ROUGH": {
    "category": "boring",
    "roughing": true
  },
  "REAM": {
    "category": "boring",
    "operation": "ream"
  },
  "CHAMFER_2D": {
    "axes": "2.5D",
    "category": "chamfer"
  },
  "CHAMFER_3D": {
    "axes": "3D",
    "category": "chamfer"
  },
  "CHAMFER_CONTOUR": {
    "category": "chamfer",
    "pattern": "contour"
  },
  "DEBURR": {
    "category": "chamfer",
    "operation": "deburr"
  },
  "CONTOUR_2D": {
    "axes": "2.5D",
    "category": "contour",
    "finishing": true
  },
  "CONTOUR_2D_CLIMB": {
    "axes": "2.5D",
    "category": "contour",
    "direction": "climb",
    "finishing": true
  },
  "CONTOUR_2D_CONVENTIONAL": {
    "axes": "2.5D",
    "category": "contour",
    "direction": "conventional",
    "finishing": true
  },
  "PROFILE_2D": {
    "axes": "2.5D",
    "category": "contour",
    "finishing": true
  },
  "DRILL_CENTER": {
    "category": "drill",
    "combined": true,
    "type": "center"
  },
  "DRILL_COUNTERBORE": {
    "category": "drill",
    "pilot": true,
    "type": "counterbore"
  },
  "DRILL_COUNTERSINK": {
    "category": "drill",
    "type": "countersink"
  },
  "DRILL_SPOT": {
    "category": "drill",
    "type": "spot"
  },
  "DRILL_STEP": {
    "category": "drill",
    "multiple_diameters": true,
    "type": "step"
  },
  "BACK_BORE": {
    "category": "drilling",
    "operation": "back_bore"
  },
  "COUNTERBORE": {
    "category": "drilling",
    "operation": "counterbore"
  },
  "COUNTERSINK": {
    "category": "drilling",
    "operation": "countersink"
  },
  "DRILL": {
    "category": "drilling",
    "operation": "drill"
  },
  "DRILL_CHIP_BREAK": {
    "category": "drilling",
    "operation": "chip_break"
  },
  "DRILL_DEEP_PECK": {
    "category": "drilling",
    "operation": "deep_peck"
  },
  "DRILL_PECK": {
    "category": "drilling",
    "operation": "peck"
  },
  "ENGRAVE": {
    "category": "engrave"
  },
  "ENGRAVE_LOGO": {
    "category": "engrave",
    "type": "logo"
  },
  "ENGRAVE_TEXT": {
    "category": "engrave",
    "type": "text"
  },
  "FACE_MILLING": {
    "axes": "2D",
    "category": "facing",
    "finishing": true,
    "roughing": true
  },
  "FACE_ONE_WAY": {
    "axes": "2D",
    "category": "facing",
    "pattern": "one_way"
  },
  "FACE_SPIRAL": {
    "axes": "2D",
    "category": "facing",
    "pattern": "spiral"
  },
  "FACE_ZIGZAG": {
    "axes": "2D",
    "category": "facing",
    "pattern": "zigzag"
  },
  "BARREL_FINISHING": {
    "axes": "5D",
    "category": "finishing",
    "description": "Barrel cutter tangent finishing",
    "finishing": true
  },
  "CHAMFER_5X": {
    "axes": "5D",
    "category": "finishing",
    "description": "5-axis chamfering",
    "finishing": true
  },
  "DEBURRING_5X": {
    "axes": "5D",
    "category": "finishing",
    "description": "5-axis edge deburring",
    "finishing": true
  },
  "FLOWLINE_5X": {
    "axes": "5D",
    "category": "finishing",
    "description": "5-axis flowline machining",
    "finishing": true
  },
  "GEODESIC_MACHINING": {
    "axes": "5D",
    "category": "finishing",
    "description": "Geodesic paths on complex surfaces",
    "finishing": true
  },
  "BURNISH": {
    "category": "finishing_op",
    "operation": "burnish"
  },
  "HONE": {
    "category": "finishing_op",
    "operation": "hone"
  },
  "LAP": {
    "category": "finishing_op",
    "operation": "lap"
  },
  "POLISH": {
    "category": "finishing_op",
    "operation": "polish"
  },
  "GROOVE_2D": {
    "axes": "2.5D",
    "category": "groove"
  },
  "GROOVE_CIRCULAR": {
    "category": "groove",
    "pattern": "circular"
  },
  "GROOVE_DOVETAIL": {
    "category": "groove",
    "type": "dovetail"
  },
  "GROOVE_KEYWAY": {
    "category": "groove",
    "type": "keyway"
  },
  "GROOVE_T_SLOT": {
    "category": "groove",
    "type": "t_slot"
  },
  "GROOVE_WOODRUFF": {
    "category": "groove",
    "type": "woodruff"
  },
  "MAXX_FINISHING": {
    "axes": "5-axis",
    "category": "hsm",
    "description": "Barrel tool high-speed finishing",
    "finishing": true,
    "hsm": true,
    "roughing": false
  },
  "MAXX_ROUGHING": {
    "axes": "3D",
    "category": "hsm",
    "description": "HyperMill MAXX trochoidal roughing",
    "finishing": false,
    "hsm": true,
    "roughing": true
  },
  "OPTIROUGH": {
    "axes": "3D",
    "category": "hsm",
    "description": "Dynamic optimized roughing",
    "finishing": false,
    "hsm": true,
    "roughing": true
  },
  "TURBO_HSR": {
    "axes": "3D",
    "category": "hsm",
    "description": "SolidCAM turbo high-speed rough",
    "finishing": false,
    "hsm": true,
    "roughing": true
  },
  "VORTEX": {
    "axes": "3D",
    "category": "hsm",
    "description": "PowerMill high-efficiency roughing",
    "finishing": false,
    "hsm": true,
    "roughing": true
  },
  "5AXIS_AUTO_TILT": {
    "axes": "5-axis",
    "category": "multi_axis",
    "description": "Automatic tool axis tilting",
    "finishing": true,
    "roughing": true
  },
  "5AXIS_BARREL": {
    "axes": "5-axis",
    "category": "multi_axis",
    "description": "Barrel/lens tool finishing",
    "finishing": true,
    "hsm": true,
    "roughing": false
  },
  "5AXIS_CONVERT": {
    "axes": "5-axis",
    "category": "multi_axis",
    "description": "3-axis to 5-axis conversion",
    "finishing": true,
    "roughing": true
  },
  "5AXIS_EDGE_BREAK": {
    "axes": "5-axis",
    "category": "multi_axis",
    "description": "5-axis edge breaking/chamfer",
    "finishing": true,
    "roughing": false
  },
  "5AXIS_MULTI_BLADE": {
    "axes": "5-axis",
    "category": "multi_axis",
    "description": "Bladed disk machining",
    "finishing": true,
    "roughing": true
  },
  "5AXIS_MULTI_SURFACE": {
    "axes": "5-axis",
    "category": "multi_axis",
    "description": "Multiple surface finishing",
    "finishing": true,
    "roughing": false
  },
  "5AXIS_ROTARY": {
    "axes": "5-axis",
    "category": "multi_axis",
    "description": "Rotary wrapping toolpath",
    "finishing": true,
    "roughing": true
  },
  "5AXIS_ROTARY_ADVANCED": {
    "axes": "5-axis",
    "category": "multi_axis",
    "description": "Advanced rotary with tilt control",
    "finishing": true,
    "roughing": true
  },
  "5AXIS_TRIANGULAR_MESH": {
    "axes": "5-axis",
    "category": "multi_axis",
    "description": "STL/mesh surface milling",
    "finishing": true,
    "roughing": true
  },
  "5AXIS_TUBE": {
    "axes": "5-axis",
    "category": "multi_axis",
    "description": "Hollow/narrow tube milling",
    "finishing": true,
    "roughing": true
  },
  "BLADE_FINISHING": {
    "axes": "5D",
    "category": "multi_axis",
    "description": "Turbine blade finishing",
    "finishing": true
  },
  "BLADE_ROUGHING": {
    "axes": "5D",
    "category": "multi_axis",
    "description": "Turbine blade roughing",
    "roughing": true
  },
  "IMPELLER_FINISHING": {
    "axes": "5D",
    "category": "multi_axis",
    "description": "Impeller finishing",
    "finishing": true
  },
  "IMPELLER_ROUGHING": {
    "axes": "5D",
    "category": "multi_axis",
    "description": "Impeller roughing",
    "roughing": true
  },
  "PORT_MACHINING": {
    "axes": "5D",
    "category": "multi_axis",
    "description": "Engine port machining",
    "finishing": true,
    "roughing": true
  },
  "SWARF_RULED": {
    "axes": "5D",
    "category": "multi_axis",
    "description": "Swarf on ruled surfaces",
    "finishing": true
  },
  "POCKET_2D": {
    "axes": "2.5D",
    "category": "pocket",
    "finishing": false,
    "roughing": true
  },
  "POCKET_2D_OFFSET": {
    "axes": "2.5D",
    "category": "pocket",
    "pattern": "offset",
    "roughing": true
  },
  "POCKET_2D_REST": {
    "axes": "2.5D",
    "category": "pocket",
    "rest": true,
    "roughing": true
  },
  "POCKET_2D_SPIRAL": {
    "axes": "2.5D",
    "category": "pocket",
    "pattern": "spiral",
    "roughing": true
  },
  "POCKET_2D_ZIGZAG": {
    "axes": "2.5D",
    "category": "pocket",
    "pattern": "zigzag",
    "roughing": true
  },
  "PLUNGE_ROUGHING_5X": {
    "axes": "5D",
    "category": "roughing",
    "description": "5-axis plunge roughing",
    "roughing": true
  },
  "SLOT_2D": {
    "axes": "2.5D",
    "category": "slot"
  },
  "SLOT_HELICAL": {
    "category": "slot",
    "entry": "helical"
  },
  "SLOT_PLUNGE": {
    "category": "slot",
    "entry": "plunge"
  },
  "SLOT_RAMP": {
    "category": "slot",
    "entry": "ramp"
  },
  "CIRCULAR_POCKET": {
    "category": "specialty",
    "operation": "circular_pocket"
  },
  "HELICAL_BORE": {
    "category": "specialty",
    "operation": "helical_bore"
  },
  "HORIZONTAL_AREA": {
    "category": "specialty",
    "operation": "horizontal"
  },
  "LASER_CUT_2D": {
    "axes": "2-axis",
    "category": "specialty",
    "description": "2D flat laser cutting",
    "finishing": true,
    "roughing": true
  },
  "LASER_CUT_3D": {
    "axes": "5-axis",
    "category": "specialty",
    "description": "5-axis laser cutting",
    "finishing": true,
    "roughing": true
  },
  "PLUNGE_ROUGH": {
    "category": "specialty",
    "operation": "plunge_rough"
  },
  "SINKER_EDM_ORBIT": {
    "axes": "3-axis",
    "category": "specialty",
    "description": "Orbital sinker EDM movement",
    "finishing": true,
    "roughing": true
  },
  "SINKER_EDM_VECTOR": {
    "axes": "3-axis",
    "category": "specialty",
    "description": "Vector sinker EDM movement",
    "finishing": true,
    "roughing": true
  },
  "UNDERCUT": {
    "category": "specialty",
    "operation": "undercut"
  },
  "WATERJET_2D": {
    "axes": "2-axis",
    "category": "specialty",
    "description": "2D waterjet cutting",
    "finishing": true,
    "roughing": true
  },
  "WATERJET_TAPER": {
    "axes": "5-axis",
    "category": "specialty",
    "description": "Taper-compensated waterjet",
    "finishing": true,
    "roughing": true
  },
  "TAP_FORM": {
    "category": "tap",
    "chipless": true,
    "type": "form"
  },
  "TAP": {
    "category": "threading",
    "operation": "tap"
  },
  "TAP_RIGID": {
    "category": "threading",
    "operation": "rigid_tap"
  },
  "THREAD_MILL": {
    "category": "threading",
    "operation": "thread_mill"
  },
  "THREAD_MILL_HELICAL": {
    "category": "threading",
    "operation": "helical"
  },
  "THREAD_MILL_SINGLE": {
    "category": "threading",
    "operation": "single_point"
  },
  "PRIME_TURNING": {
    "axes": "2-axis",
    "category": "turning",
    "description": "Sandvik all-directional turning",
    "finishing": true,
    "hsm": true,
    "roughing": true
  },
  "TURN_CHAMFER": {
    "axes": "2-axis",
    "category": "turning",
    "description": "Edge breaking on lathe",
    "finishing": true,
    "roughing": false
  },
  "TURN_CONTOUR": {
    "axes": "2-axis",
    "category": "turning",
    "description": "Profile/contour turning",
    "finishing": true,
    "roughing": true
  },
  "TURN_DRILL": {
    "axes": "2-axis",
    "category": "turning",
    "description": "Axial drilling on lathe",
    "finishing": false,
    "roughing": true
  },
  "TURN_FACE_FINISH": {
    "axes": "2-axis",
    "category": "turning",
    "description": "Face finishing cycle",
    "finishing": true,
    "roughing": false
  },
  "TURN_FACE_ROUGH": {
    "axes": "2-axis",
    "category": "turning",
    "description": "Face roughing cycle",
    "finishing": false,
    "roughing": true
  },
  "TURN_GROOVE_FACE": {
    "axes": "2-axis",
    "category": "turning",
    "description": "Face grooving",
    "finishing": true,
    "roughing": true
  },
  "TURN_GROOVE_ID": {
    "axes": "2-axis",
    "category": "turning",
    "description": "Internal grooving",
    "finishing": true,
    "roughing": true
  },
  "TURN_GROOVE_OD": {
    "axes": "2-axis",
    "category": "turning",
    "description": "External grooving",
    "finishing": true,
    "roughing": true
  },
  "TURN_ID_FINISH": {
    "axes": "2-axis",
    "category": "turning",
    "description": "Inside diameter finishing",
    "finishing": true,
    "roughing": false
  },
  "TURN_ID_ROUGH": {
    "axes": "2-axis",
    "category": "turning",
    "description": "Inside diameter roughing (boring)",
    "finishing": false,
    "roughing": true
  },
  "TURN_KNURLING": {
    "axes": "2-axis",
    "category": "turning",
    "description": "Surface texturing",
    "finishing": true,
    "roughing": false
  },
  "TURN_NECKING": {
    "axes": "2-axis",
    "category": "turning",
    "description": "Undercut/relief groove",
    "finishing": true,
    "roughing": true
  },
  "TURN_OD_FINISH": {
    "axes": "2-axis",
    "category": "turning",
    "description": "Outside diameter finishing cycle",
    "finishing": true,
    "roughing": false
  },
  "TURN_OD_ROUGH": {
    "axes": "2-axis",
    "category": "turning",
    "description": "Outside diameter roughing cycle",
    "finishing": false,
    "roughing": true
  },
  "TURN_PARTING": {
    "axes": "2-axis",
    "category": "turning",
    "description": "Part separation/cut-off",
    "finishing": true,
    "roughing": false
  },
  "TURN_PATTERN": {
    "axes": "2-axis",
    "category": "turning",
    "description": "Pattern/form turning",
    "finishing": true,
    "roughing": true
  },
  "TURN_TAPER": {
    "axes": "2-axis",
    "category": "turning",
    "description": "Taper turning operation",
    "finishing": true,
    "roughing": true
  },
  "TURN_THREAD_ID": {
    "axes": "2-axis",
    "category": "turning",
    "description": "Internal thread cutting",
    "finishing": true,
    "roughing": false
  },
  "TURN_THREAD_OD": {
    "axes": "2-axis",
    "category": "turning",
    "description": "External thread cutting",
    "finishing": true,
    "roughing": false
  },
  "WEDM_2AXIS_CONTOUR": {
    "axes": "2-axis",
    "category": "wire_edm",
    "description": "2-axis wire contouring",
    "finishing": true,
    "roughing": true
  },
  "WEDM_4AXIS_CONTOUR": {
    "axes": "4-axis",
    "category": "wire_edm",
    "description": "4-axis tapered wire cutting",
    "finishing": true,
    "roughing": true
  },
  "WEDM_LAND_RELIEF": {
    "axes": "4-axis",
    "category": "wire_edm",
    "description": "Land and relief profile cutting",
    "finishing": true,
    "roughing": true
  },
  "WEDM_NO_CORE": {
    "axes": "4-axis",
    "category": "wire_edm",
    "description": "Slugless wire pocketing",
    "finishing": false,
    "roughing": true
  },
  "WEDM_ROTARY": {
    "axes": "5-axis",
    "category": "wire_edm",
    "description": "Turn-and-burn rotary operations",
    "finishing": true,
    "roughing": true
  },
  "WEDM_ROUGHING": {
    "axes": "2-axis",
    "category": "wire_edm",
    "description": "First cut with tab retention",
    "finishing": false,
    "roughing": true
  },
  "WEDM_SKIM": {
    "axes": "2-axis",
    "category": "wire_edm",
    "description": "Multi-pass skim finishing",
    "finishing": true,
    "roughing": false
  },
  "WEDM_TAPER": {
    "axes": "4-axis",
    "category": "wire_edm",
    "description": "Constant taper wire EDM",
    "finishing": true,
    "roughing": true
  }
  ,
  // METADATA
  totalStrategies: 200,
  version: "2.1.0",
  lastUpdated: "2026-01-14",
  categories: {
    "3d_finishing": 24,
    "3d_roughing": 4,
    "5axis": 12,
    "adaptive": 11,
    "balanced": 1,
    "boring": 5,
    "chamfer": 4,
    "contour": 4,
    "drill": 5,
    "drilling": 7,
    "engrave": 3,
    "facing": 4,
    "finishing": 5,
    "finishing_op": 4,
    "groove": 6,
    "hsm": 5,
    "multi_axis": 16,
    "pocket": 5,
    "roughing": 1,
    "slot": 4,
    "specialty": 11,
    "tap": 1,
    "threading": 5,
    "turning": 20,
    "wire_edm": 8,
    "algorithm_roughing": 3,
    "algorithm_finishing": 4,
    "algorithm_optimization": 5,
    "algorithm_dynamics": 5,
    "algorithm_5axis": 3,
    "algorithm_control": 1,
    "algorithm_ml": 5,
    "algorithm_hybrid": 5
  }
};
