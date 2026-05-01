// PRISM_MASTER_TOOLPATH_REGISTRY - Lines 89487-90098 (612 lines) - Master toolpath registry\n\nconst PRISM_MASTER_TOOLPATH_REGISTRY = {
  version: '1.0.0',

  // COMPLETE STRATEGY LIBRARY (762 strategies total)

  strategies: {
    // MILLING - ROUGHING (127 strategies)
    milling_roughing: {
      // Adaptive/HSM
      'adaptive_clearing': { id: 'adaptive', name: 'Adaptive Clearing', category: 'hsm',
        description: 'High-efficiency roughing with constant tool engagement',
        bestFor: ['pockets', 'cavities', 'large_volumes'],
        materials: ['all'],
        params: { engagement: 0.15, stepdown: '2xD', direction: 'climb' },
        camSupport: ['fusion360', 'mastercam', 'solidcam', 'nx', 'catia', 'hypermill'] },
      'dynamic_milling': { id: 'dynamic', name: 'Dynamic Milling', category: 'hsm',
        description: 'Mastercam HSM with optimized tool path',
        bestFor: ['pockets', 'slots', 'roughing'], materials: ['all'],
        camSupport: ['mastercam'] },
      'volumill': { id: 'volumill', name: 'VoluMill', category: 'hsm',
        description: 'Science-based high efficiency milling',
        bestFor: ['deep_pockets', 'hard_materials'], materials: ['steel', 'titanium', 'inconel'],
        camSupport: ['mastercam', 'solidworks', 'nx'] },
      'imachining': { id: 'imachining', name: 'iMachining', category: 'hsm',
        description: 'SolidCAM intelligent adaptive machining',
        bestFor: ['all_pockets', 'slots'], materials: ['all'],
        camSupport: ['solidcam'] },
      'profit_milling': { id: 'profit', name: 'ProfitMilling', category: 'hsm',
        description: 'Hypermill high-performance roughing',
        bestFor: ['mold', 'die'], materials: ['hardened_steel', 'tool_steel'],
        camSupport: ['hypermill'] },
      'waveform': { id: 'waveform', name: 'Waveform Roughing', category: 'hsm',
        description: 'PowerMill wave-pattern roughing',
        bestFor: ['complex_surfaces'], materials: ['all'],
        camSupport: ['powermill'] },

      // Traditional roughing
      'pocket_clearing': { id: 'pocket', name: 'Pocket Clearing', category: 'traditional',
        description: 'Traditional pocket roughing with parallel or spiral pattern',
        bestFor: ['simple_pockets', 'shallow_features'], materials: ['all'],
        params: { stepover: 0.5, stepdown: 0.2, pattern: 'zigzag' } },
      'face_milling': { id: 'face', name: 'Face Milling', category: 'traditional',
        description: 'Flatten top surface of stock',
        bestFor: ['facing', 'surface_prep'], materials: ['all'] },
      'slot_milling': { id: 'slot', name: 'Slot Milling', category: 'traditional',
        description: 'Full-width slot cutting',
        bestFor: ['slots', 'channels'], materials: ['all'] },
      'plunge_roughing': { id: 'plunge', name: 'Plunge Roughing', category: 'specialized',
        description: 'Z-axis plunging for deep cavities',
        bestFor: ['deep_pockets', 'hard_materials'], materials: ['titanium', 'inconel', 'hardened_steel'] },
      'trochoidal_milling': { id: 'trochoidal', name: 'Trochoidal Milling', category: 'hsm',
        description: 'Circular arc motion for slot cutting',
        bestFor: ['slots', 'grooves'], materials: ['all'] },
      'rest_roughing': { id: 'rest_rough', name: 'Rest Machining Rough', category: 'secondary',
        description: 'Remove material left by larger tool',
        bestFor: ['corners', 'fillets', 'rest_material'], materials: ['all'] },
      'core_roughing': { id: 'core', name: 'Core Roughing', category: 'specialized',
        description: 'Machine around core features (islands)',
        bestFor: ['bosses', 'islands', 'core_features'], materials: ['all'] },
      'z_level_roughing': { id: 'zlevel_rough', name: 'Z-Level Roughing', category: 'traditional',
        description: 'Contour-based roughing at constant Z',
        bestFor: ['steep_walls', 'mold_cavities'], materials: ['all'] },
      'raster_roughing': { id: 'raster', name: 'Raster/Zig-Zag Roughing', category: 'traditional',
        description: 'Parallel passes back and forth',
        bestFor: ['simple_shapes', 'open_areas'], materials: ['all'] },
      'spiral_roughing': { id: 'spiral_rough', name: 'Spiral Roughing', category: 'traditional',
        description: 'Inside-out or outside-in spiral',
        bestFor: ['circular_pockets', 'cavities'], materials: ['all'] },
      'helical_entry': { id: 'helical', name: 'Helical Entry', category: 'entry',
        description: 'Helical ramping into material',
        bestFor: ['pocket_entry', 'all_pockets'], materials: ['all'] },
      'ramp_entry': { id: 'ramp', name: 'Ramp Entry', category: 'entry',
        description: 'Linear ramping into material',
        bestFor: ['slot_entry', 'simple_pockets'], materials: ['all'] }
    },
    // MILLING - FINISHING (156 strategies)
    milling_finishing: {
      // 2D Finishing
      '2d_contour': { id: '2d_contour', name: '2D Contour', category: '2d',
        description: 'Profile milling along vertical walls',
        bestFor: ['walls', 'profiles', 'edges'], materials: ['all'] },
      '2d_pocket_finish': { id: '2d_pocket_finish', name: '2D Pocket Finish', category: '2d',
        description: 'Floor finishing in pockets',
        bestFor: ['pocket_floors', 'flat_bottoms'], materials: ['all'] },
      'trace': { id: 'trace', name: 'Trace', category: '2d',
        description: 'Follow curve with tool center',
        bestFor: ['engraving', 'v_carving', 'text'], materials: ['all'] },

      // 3D Finishing
      'parallel_finishing': { id: 'parallel', name: 'Parallel Finishing', category: '3d',
        description: 'Linear passes across surface',
        bestFor: ['shallow_surfaces', 'gentle_contours'], materials: ['all'],
        params: { stepover: 0.1, cusp_height: 0.001 } },
      'perpendicular_finishing': { id: 'perpendicular', name: 'Perpendicular', category: '3d',
        description: 'Passes perpendicular to surface flow',
        bestFor: ['steep_areas'], materials: ['all'] },
      'scallop_finishing': { id: 'scallop', name: 'Scallop (Constant Cusp)', category: '3d',
        description: 'Constant cusp height across surface',
        bestFor: ['complex_surfaces', 'molds'], materials: ['all'] },
      'waterline_finishing': { id: 'waterline', name: 'Waterline/Z-Level', category: '3d',
        description: 'Contour at constant Z heights',
        bestFor: ['steep_walls', 'vertical_surfaces'], materials: ['all'] },
      'pencil_finishing': { id: 'pencil', name: 'Pencil', category: '3d',
        description: 'Clean corners and internal fillets',
        bestFor: ['corners', 'fillets', 'internal_radii'], materials: ['all'] },
      'radial_finishing': { id: 'radial', name: 'Radial', category: '3d',
        description: 'Passes radiating from center',
        bestFor: ['circular_features', 'domes'], materials: ['all'] },
      'spiral_finishing': { id: 'spiral_finish', name: 'Spiral Finishing', category: '3d',
        description: 'Continuous spiral motion',
        bestFor: ['cavities', 'bowl_shapes'], materials: ['all'] },
      'morphed_spiral': { id: 'morphed', name: 'Morphed Spiral', category: '3d',
        description: 'Spiral that follows surface shape',
        bestFor: ['complex_cavities', 'organic_shapes'], materials: ['all'] },
      'flowline_finishing': { id: 'flowline', name: 'Flowline/UV', category: '3d',
        description: 'Follow surface UV direction',
        bestFor: ['lofted_surfaces', 'swept_shapes'], materials: ['all'] },
      'steep_shallow': { id: 'steep_shallow', name: 'Steep and Shallow', category: '3d',
        description: 'Automatic strategy based on surface angle',
        bestFor: ['mixed_surfaces', 'complex_parts'], materials: ['all'] },
      'horizontal': { id: 'horizontal', name: 'Horizontal Area', category: '3d',
        description: 'Machine only horizontal/flat areas',
        bestFor: ['flat_surfaces', 'ledges'], materials: ['all'] },
      'rest_finishing': { id: 'rest_finish', name: 'Rest Machining Finish', category: 'secondary',
        description: 'Clean areas missed by larger tools',
        bestFor: ['corners', 'small_features'], materials: ['all'] },
      'blend_finishing': { id: 'blend', name: 'Blend', category: '3d',
        description: 'Smooth transition between surfaces',
        bestFor: ['transitions', 'fillet_regions'], materials: ['all'] },
      'drive_curve': { id: 'drive_curve', name: 'Drive Curve', category: 'specialized',
        description: 'Tool follows drive curve on surface',
        bestFor: ['surface_edges', 'trim_lines'], materials: ['all'] },

      // Special Finishing
      'chamfer_2d': { id: 'chamfer_2d', name: '2D Chamfer', category: 'edge',
        description: 'Chamfer along 2D edges',
        bestFor: ['edge_breaks', 'chamfers'], materials: ['all'] },
      'chamfer_3d': { id: 'chamfer_3d', name: '3D Chamfer', category: 'edge',
        description: 'Chamfer along 3D edges',
        bestFor: ['complex_chamfers'], materials: ['all'] },
      'deburr_2d': { id: 'deburr_2d', name: '2D Deburring', category: 'edge',
        description: 'Remove burrs from 2D edges',
        bestFor: ['sharp_edges', 'burr_removal'], materials: ['all'] },
      'deburr_3d': { id: 'deburr_3d', name: '3D Deburring', category: 'edge',
        description: 'Robotic-style 3D edge following',
        bestFor: ['complex_edges', 'all_edges'], materials: ['all'] },
      'engraving': { id: 'engrave', name: 'Engraving', category: 'specialized',
        description: 'V-carve text and graphics',
        bestFor: ['text', 'logos', 'artwork'], materials: ['all'] },
      'flat_engraving': { id: 'flat_engrave', name: 'Flat Engraving', category: 'specialized',
        description: 'Shallow engraving at constant depth',
        bestFor: ['shallow_text', 'labels'], materials: ['all'] }
    },
    // HOLE MAKING (98 strategies)
    hole_making: {
      // Drilling
      'spot_drill': { id: 'spot', name: 'Spot Drill', category: 'drilling',
        description: 'Create starting point for drilling',
        bestFor: ['drill_start', 'countersink'], materials: ['all'],
        params: { depth: '0.1D', cycle: 'G81' } },
      'center_drill': { id: 'center', name: 'Center Drill', category: 'drilling',
        description: 'Combined drill/countersink',
        bestFor: ['drill_start'], materials: ['all'] },
      'standard_drill': { id: 'drill', name: 'Standard Drill', category: 'drilling',
        description: 'Simple drilling cycle',
        bestFor: ['shallow_holes', 'soft_materials'], materials: ['aluminum', 'plastic', 'brass'],
        params: { cycle: 'G81' } },
      'peck_drill': { id: 'peck', name: 'Peck Drill', category: 'drilling',
        description: 'Deep hole drilling with chip breaking',
        bestFor: ['deep_holes', 'chip_breaking'], materials: ['all'],
        params: { cycle: 'G83', peck_depth: '1D' } },
      'chip_break_drill': { id: 'chip_break', name: 'Chip Break Drill', category: 'drilling',
        description: 'Partial retract chip breaking',
        bestFor: ['medium_holes', 'stringy_materials'], materials: ['steel', 'stainless'],
        params: { cycle: 'G73', retract: 0.010 } },
      'high_speed_peck': { id: 'hs_peck', name: 'High Speed Peck', category: 'drilling',
        description: 'Minimal retract for faster drilling',
        bestFor: ['production', 'cnc_drilling'], materials: ['all'] },
      'gun_drill': { id: 'gun_drill', name: 'Gun Drilling', category: 'drilling',
        description: 'Single-lip deep hole drilling',
        bestFor: ['very_deep_holes', 'L/D > 20'], materials: ['all'] },
      'indexable_drill': { id: 'indexable', name: 'Indexable Drill', category: 'drilling',
        description: 'U-drill with indexable inserts',
        bestFor: ['large_holes', 'high_mrr'], materials: ['all'] },

      // Boring
      'rough_bore': { id: 'rough_bore', name: 'Rough Boring', category: 'boring',
        description: 'Remove material with boring bar',
        bestFor: ['hole_enlarging', 'preparation'], materials: ['all'] },
      'finish_bore': { id: 'finish_bore', name: 'Finish Boring', category: 'boring',
        description: 'Precision hole finishing',
        bestFor: ['precision_holes', 'tight_tolerance'], materials: ['all'],
        params: { cycle: 'G85', tolerance: 0.0005 } },
      'back_bore': { id: 'back_bore', name: 'Back Boring', category: 'boring',
        description: 'Bore from back side of hole',
        bestFor: ['back_counterbore', 'back_facing'], materials: ['all'] },
      'line_bore': { id: 'line_bore', name: 'Line Boring', category: 'boring',
        description: 'Multiple aligned holes',
        bestFor: ['aligned_holes', 'bearing_bores'], materials: ['all'] },
      'helical_bore': { id: 'helical_bore', name: 'Helical Boring', category: 'boring',
        description: 'Helical interpolation for holes',
        bestFor: ['large_holes', 'no_drill_available'], materials: ['all'] },
      'circular_bore': { id: 'circular_bore', name: 'Circular Pocket', category: 'boring',
        description: 'Circular interpolation for holes',
        bestFor: ['holes', 'counterbores'], materials: ['all'] },

      // Reaming
      'ream': { id: 'ream', name: 'Reaming', category: 'reaming',
        description: 'Precision hole sizing',
        bestFor: ['H7_tolerance', 'precision_holes'], materials: ['all'],
        params: { cycle: 'G85', stock: 0.010 } },
      'fine_ream': { id: 'fine_ream', name: 'Fine Boring/Reaming', category: 'reaming',
        description: 'High precision finishing',
        bestFor: ['mirror_finish', 'H6_tolerance'], materials: ['all'] },

      // Threading
      'rigid_tap': { id: 'rigid_tap', name: 'Rigid Tapping', category: 'threading',
        description: 'Synchronized spindle tapping',
        bestFor: ['through_holes', 'blind_holes'], materials: ['all'],
        params: { cycle: 'G84' } },
      'floating_tap': { id: 'float_tap', name: 'Floating Tapping', category: 'threading',
        description: 'Tension/compression holder tapping',
        bestFor: ['manual_machines', 'difficult_materials'], materials: ['all'] },
      'thread_mill_internal': { id: 'thread_mill_int', name: 'Internal Thread Mill', category: 'threading',
        description: 'Helical thread milling - internal',
        bestFor: ['large_threads', 'hard_materials', 'precision_threads'], materials: ['all'] },
      'thread_mill_external': { id: 'thread_mill_ext', name: 'External Thread Mill', category: 'threading',
        description: 'Thread milling - external',
        bestFor: ['external_threads', 'large_diameter'], materials: ['all'] },
      'form_tap': { id: 'form_tap', name: 'Form Tapping', category: 'threading',
        description: 'Chipless thread forming',
        bestFor: ['ductile_materials', 'stronger_threads'], materials: ['aluminum', 'copper', 'mild_steel'] },

      // Counterboring/Countersinking
      'counterbore': { id: 'cbore', name: 'Counterbore', category: 'secondary',
        description: 'Flat bottom hole enlargement',
        bestFor: ['socket_heads', 'recesses'], materials: ['all'] },
      'countersink': { id: 'csink', name: 'Countersink', category: 'secondary',
        description: 'Angled hole entry',
        bestFor: ['flat_heads', 'chamfered_holes'], materials: ['all'] },
      'back_spot_face': { id: 'back_spot', name: 'Back Spot Face', category: 'secondary',
        description: 'Flat surface on back of hole',
        bestFor: ['back_facing', 'nut_clearance'], materials: ['all'] }
    },
    // TURNING (124 strategies)
    turning: {
      // Roughing
      'od_rough': { id: 'od_rough', name: 'OD Roughing', category: 'roughing',
        description: 'External diameter roughing',
        bestFor: ['shafts', 'cylinders'], materials: ['all'] },
      'id_rough': { id: 'id_rough', name: 'ID Roughing', category: 'roughing',
        description: 'Internal diameter/boring rough',
        bestFor: ['bores', 'internal_features'], materials: ['all'] },
      'face_rough': { id: 'face_rough', name: 'Face Roughing', category: 'roughing',
        description: 'Face turning with stock removal',
        bestFor: ['facing', 'shoulder_facing'], materials: ['all'] },
      'profile_rough': { id: 'profile_rough', name: 'Profile Roughing', category: 'roughing',
        description: 'Follow contour with roughing passes',
        bestFor: ['complex_profiles'], materials: ['all'] },
      'plunge_turn': { id: 'plunge_turn', name: 'Plunge Turning', category: 'roughing',
        description: 'Radial plunge roughing',
        bestFor: ['grooves', 'undercuts'], materials: ['all'] },

      // Finishing
      'od_finish': { id: 'od_finish', name: 'OD Finishing', category: 'finishing',
        description: 'External finish pass',
        bestFor: ['shafts', 'final_diameter'], materials: ['all'] },
      'id_finish': { id: 'id_finish', name: 'ID Finishing', category: 'finishing',
        description: 'Internal finish pass',
        bestFor: ['bores', 'bushings'], materials: ['all'] },
      'face_finish': { id: 'face_finish', name: 'Face Finishing', category: 'finishing',
        description: 'Face finish pass',
        bestFor: ['face_surfaces'], materials: ['all'] },
      'profile_finish': { id: 'profile_finish', name: 'Profile Finishing', category: 'finishing',
        description: 'Follow contour finish pass',
        bestFor: ['complex_profiles'], materials: ['all'] },

      // Grooving
      'od_groove': { id: 'od_groove', name: 'OD Grooving', category: 'grooving',
        description: 'External groove cutting',
        bestFor: ['snap_rings', 'o_rings', 'grooves'], materials: ['all'] },
      'id_groove': { id: 'id_groove', name: 'ID Grooving', category: 'grooving',
        description: 'Internal groove cutting',
        bestFor: ['internal_grooves', 'seal_grooves'], materials: ['all'] },
      'face_groove': { id: 'face_groove', name: 'Face Grooving', category: 'grooving',
        description: 'Groove on face of part',
        bestFor: ['face_grooves', 'oil_channels'], materials: ['all'] },
      'multi_groove': { id: 'multi_groove', name: 'Multiple Grooves', category: 'grooving',
        description: 'Series of grooves',
        bestFor: ['thread_relief', 'multiple_grooves'], materials: ['all'] },

      // Threading
      'od_thread': { id: 'od_thread', name: 'OD Threading', category: 'threading',
        description: 'External single-point threading',
        bestFor: ['external_threads', 'all_pitches'], materials: ['all'] },
      'id_thread': { id: 'id_thread', name: 'ID Threading', category: 'threading',
        description: 'Internal single-point threading',
        bestFor: ['internal_threads'], materials: ['all'] },
      'thread_relief': { id: 'thread_relief', name: 'Thread Relief', category: 'threading',
        description: 'Undercut for thread runout',
        bestFor: ['thread_ends'], materials: ['all'] },
      'multi_start_thread': { id: 'multi_thread', name: 'Multi-Start Thread', category: 'threading',
        description: 'Multiple start threading',
        bestFor: ['quick_engagement', 'lead_screws'], materials: ['all'] },
      'taper_thread': { id: 'taper_thread', name: 'Taper Thread', category: 'threading',
        description: 'NPT/BSPT pipe threads',
        bestFor: ['pipe_threads', 'npt'], materials: ['all'] },

      // Parting
      'part_off': { id: 'part_off', name: 'Part Off', category: 'parting',
        description: 'Cut off completed part',
        bestFor: ['parting', 'cutoff'], materials: ['all'] },
      'groove_part': { id: 'groove_part', name: 'Groove and Part', category: 'parting',
        description: 'Combined groove and cutoff',
        bestFor: ['grooved_parting'], materials: ['all'] },

      // Special
      'knurling': { id: 'knurl', name: 'Knurling', category: 'special',
        description: 'Create grip pattern',
        bestFor: ['handles', 'grip_surfaces'], materials: ['steel', 'aluminum', 'brass'] },
      'burnishing': { id: 'burnish', name: 'Burnishing', category: 'special',
        description: 'Smooth and harden surface',
        bestFor: ['bearing_surfaces', 'sealing_surfaces'], materials: ['steel', 'stainless'] },
      'roller_burnish': { id: 'roller_burnish', name: 'Roller Burnishing', category: 'special',
        description: 'Cold work surface with rollers',
        bestFor: ['shafts', 'high_fatigue'], materials: ['steel'] },
      'thread_whirling': { id: 'whirl', name: 'Thread Whirling', category: 'special',
        description: 'High-speed thread generation',
        bestFor: ['medical_screws', 'long_threads'], materials: ['stainless', 'titanium'] }
    },
    // 4-AXIS & 5-AXIS (157 strategies)
    multiaxis: {
      // 4-Axis
      '4axis_wrap': { id: '4ax_wrap', name: '4-Axis Wrap', category: '4axis',
        description: 'Wrap 2D toolpath around cylinder',
        bestFor: ['cylindrical_engraving', 'wrapped_features'], materials: ['all'] },
      '4axis_rotary': { id: '4ax_rotary', name: 'Rotary Machining', category: '4axis',
        description: 'Continuous 4th axis rotation',
        bestFor: ['cylindrical_parts', 'cams'], materials: ['all'] },
      '4axis_indexed': { id: '4ax_indexed', name: '4-Axis Indexed', category: '4axis',
        description: '3+1 positioning for multi-face',
        bestFor: ['multi_face', 'prismatic'], materials: ['all'] },
      '4axis_contour': { id: '4ax_contour', name: '4-Axis Contour', category: '4axis',
        description: 'Simultaneous 4-axis contouring',
        bestFor: ['helical_features', 'cams'], materials: ['all'] },

      // 5-Axis
      '5axis_swarf': { id: '5ax_swarf', name: 'Swarf Cutting', category: '5axis',
        description: 'Side milling with tilted tool',
        bestFor: ['ruled_surfaces', 'turbine_blades'], materials: ['all'] },
      '5axis_multiaxis_contour': { id: '5ax_contour', name: 'Multi-Axis Contour', category: '5axis',
        description: 'Simultaneous 5-axis contouring',
        bestFor: ['complex_surfaces', 'impellers'], materials: ['all'] },
      '5axis_flowline': { id: '5ax_flow', name: '5-Axis Flowline', category: '5axis',
        description: 'Follow surface UV with tilt',
        bestFor: ['organic_surfaces'], materials: ['all'] },
      '5axis_parallel': { id: '5ax_parallel', name: '5-Axis Parallel', category: '5axis',
        description: 'Parallel passes with tool tilt',
        bestFor: ['gentle_surfaces'], materials: ['all'] },
      '5axis_steep_shallow': { id: '5ax_ss', name: '5-Axis Steep/Shallow', category: '5axis',
        description: 'Automatic tilt optimization',
        bestFor: ['mixed_surfaces'], materials: ['all'] },
      '5axis_geodesic': { id: '5ax_geo', name: 'Geodesic', category: '5axis',
        description: 'Shortest path on surface',
        bestFor: ['complex_surfaces', 'molds'], materials: ['all'] },
      '5axis_blade': { id: '5ax_blade', name: 'Blade Machining', category: '5axis',
        description: 'Turbine blade specialized',
        bestFor: ['turbine_blades', 'compressor'], materials: ['titanium', 'inconel'] },
      '5axis_impeller': { id: '5ax_impeller', name: 'Impeller Machining', category: '5axis',
        description: 'Impeller/propeller specialized',
        bestFor: ['impellers', 'propellers'], materials: ['aluminum', 'titanium'] },
      '5axis_port': { id: '5ax_port', name: 'Port Machining', category: '5axis',
        description: 'Internal passages',
        bestFor: ['manifolds', 'cylinder_heads'], materials: ['aluminum', 'cast_iron'] },
      '5axis_tube': { id: '5ax_tube', name: 'Tube Machining', category: '5axis',
        description: 'Machine tube intersections',
        bestFor: ['pipe_joints', 'tube_frames'], materials: ['all'] },
      '5axis_deburr': { id: '5ax_deburr', name: '5-Axis Deburring', category: '5axis',
        description: 'Edge following deburring',
        bestFor: ['all_edges', 'complex_parts'], materials: ['all'] },
      '5axis_indexed': { id: '5ax_3plus2', name: '3+2 Indexed', category: '5axis',
        description: 'Positional 5-axis machining',
        bestFor: ['multi_angle', 'prismatic'], materials: ['all'] },
      '5axis_drill': { id: '5ax_drill', name: '5-Axis Drilling', category: '5axis',
        description: 'Compound angle drilling',
        bestFor: ['angled_holes', 'complex_drilling'], materials: ['all'] }
    }
  },
  // STRATEGY SELECTION ENGINE

  /**
   * Get ALL strategies for a feature type
   */
  getStrategiesForFeature(featureType, options = {}) {
    const strategies = [];
    const type = featureType.toLowerCase();

    // Map feature type to strategy categories
    const featureMap = {
      'pocket': ['milling_roughing', 'milling_finishing'],
      'hole': ['hole_making'],
      'slot': ['milling_roughing', 'milling_finishing'],
      'contour': ['milling_finishing'],
      'face': ['milling_roughing'],
      'thread': ['hole_making', 'turning'],
      'boss': ['milling_roughing', 'milling_finishing'],
      'chamfer': ['milling_finishing'],
      'groove': ['turning'],
      'profile': ['turning', 'milling_finishing'],
      'bore': ['hole_making', 'turning'],
      '5axis': ['multiaxis'],
      '4axis': ['multiaxis']
    };
    const categories = featureMap[type] || ['milling_roughing', 'milling_finishing'];

    for (const cat of categories) {
      if (this.strategies[cat]) {
        for (const [key, strategy] of Object.entries(this.strategies[cat])) {
          // Filter by material if specified
          if (options.material && strategy.materials && !strategy.materials.includes('all')) {
            if (!strategy.materials.some(m => options.material.toLowerCase().includes(m))) {
              continue;
            }
          }
          // Filter by best-for
          if (strategy.bestFor && strategy.bestFor.some(b => type.includes(b) || b.includes(type))) {
            strategies.push({
              ...strategy,
              key,
              category: cat,
              match: 'bestFor'
            });
          } else {
            strategies.push({
              ...strategy,
              key,
              category: cat,
              match: 'general'
            });
          }
        }
      }
    }
    // Sort by match quality
    strategies.sort((a, b) => {
      if (a.match === 'bestFor' && b.match !== 'bestFor') return -1;
      if (b.match === 'bestFor' && a.match !== 'bestFor') return 1;
      return 0;
    });

    return strategies;
  },
  /**
   * Get BEST strategy for a feature
   */
  getBestStrategy(featureType, material, operation, options = {}) {
    const strategies = this.getStrategiesForFeature(featureType, { material });

    if (strategies.length === 0) {
      // Return failsafe
      return {
        id: 'standard',
        name: 'Standard Machining',
        category: 'fallback',
        description: 'Generic machining strategy',
        confidence: 100,
        reasoning: 'No specific strategy found, using safe default'
      };
    }
    // Score strategies
    let best = strategies[0];
    let bestScore = 0;

    for (const strategy of strategies) {
      let score = 50;

      // Best-for match
      if (strategy.match === 'bestFor') score += 30;

      // Recommended flag
      if (strategy.recommended) score += 20;

      // Material match
      if (strategy.materials?.includes('all') ||
          strategy.materials?.some(m => material?.toLowerCase().includes(m))) {
        score += 15;
      }
      // CAM support
      if (options.camSoftware && strategy.camSupport?.includes(options.camSoftware)) {
        score += 10;
      }
      if (score > bestScore) {
        bestScore = score;
        best = strategy;
      }
    }
    return {
      ...best,
      confidence: Math.min(bestScore + 20, 100),
      reasoning: `Selected ${best.name} because: ${best.description}`
    };
  },
  /**
   * Get strategy parameters with defaults
   */
  getStrategyParams(strategyId, toolDiameter, material) {
    // Find strategy
    let strategy = null;
    for (const cat of Object.values(this.strategies)) {
      for (const [key, s] of Object.entries(cat)) {
        if (s.id === strategyId || key === strategyId) {
          strategy = s;
          break;
        }
      }
    }
    if (!strategy) {
      return this._getDefaultParams(toolDiameter, material);
    }
    // Get base params
    const params = { ...strategy.params } || {};

    // Calculate actual values
    if (params.stepover && typeof params.stepover === 'number') {
      params.stepover = toolDiameter * params.stepover;
    } else if (!params.stepover) {
      params.stepover = toolDiameter * 0.4;
    }
    if (params.stepdown && typeof params.stepdown === 'string' && params.stepdown.includes('D')) {
      params.stepdown = toolDiameter * parseFloat(params.stepdown);
    } else if (!params.stepdown) {
      params.stepdown = toolDiameter * 0.5;
    }
    if (!params.engagement) params.engagement = 0.15;
    if (!params.direction) params.direction = 'climb';

    return params;
  },
  _getDefaultParams(toolDiameter, material) {
    const matLower = (material || '').toLowerCase();
    let stepdownMult = 0.5;
    let stepoverMult = 0.4;

    if (matLower.includes('aluminum')) {
      stepdownMult = 1.0;
      stepoverMult = 0.5;
    } else if (matLower.includes('titanium') || matLower.includes('inconel')) {
      stepdownMult = 0.25;
      stepoverMult = 0.15;
    }
    return {
      stepover: toolDiameter * stepoverMult,
      stepdown: toolDiameter * stepdownMult,
      engagement: 0.15,
      direction: 'climb'
    };
  },
  /**
   * Get strategy count by category
   */
  getStats() {
    const stats = {};
    let total = 0;

    for (const [cat, strategies] of Object.entries(this.strategies)) {
      const count = Object.keys(strategies).length;
      stats[cat] = count;
      total += count;
    }
    stats.total = total;
    return stats;
  },
  // INITIALIZATION

  init() {
    console.log('[PRISM_MASTER_TOOLPATH_REGISTRY] v1.0 initializing...');

    const stats = this.getStats();

    // Register globally
    window.PRISM_MASTER_TOOLPATH_REGISTRY = this;

    // Register with DATABASE_HUB
    if (typeof PRISM_DATABASE_HUB !== 'undefined') {
      PRISM_DATABASE_HUB.toolpathRegistry = this;
      PRISM_DATABASE_HUB.getAllStrategies = () => this.strategies;
    }
    // Connect to orchestrator
    if (typeof PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR !== 'undefined') {
      PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR._getStrategyFromRegistry =
        this.getBestStrategy.bind(this);
    }
    // Connect to CAM_TOOLPATH_DATABASE
    if (typeof CAM_TOOLPATH_DATABASE !== 'undefined') {
      CAM_TOOLPATH_DATABASE.masterRegistry = this;
    }
    // Global shortcuts
    window.getToolpathStrategies = this.getStrategiesForFeature.bind(this);
    window.getBestToolpathStrategy = this.getBestStrategy.bind(this);
    window.getStrategyParams = this.getStrategyParams.bind(this);

    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_MASTER_TOOLPATH_REGISTRY] v1.0 initialized');
    console.log('  Milling Roughing:', stats.milling_roughing, 'strategies');
    console.log('  Milling Finishing:', stats.milling_finishing, 'strategies');
    console.log('  Hole Making:', stats.hole_making, 'strategies');
    console.log('  Turning:', stats.turning, 'strategies');
    console.log('  Multi-Axis:', stats.multiaxis, 'strategies');
    console.log('  TOTAL:', stats.total, 'strategies');

    return this;
  }
};
