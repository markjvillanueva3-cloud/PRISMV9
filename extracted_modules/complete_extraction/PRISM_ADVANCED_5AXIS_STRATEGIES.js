const PRISM_ADVANCED_5AXIS_STRATEGIES = {
  version: '1.0.0',
  lastUpdated: '2026-01-06',

  // SWARF CUTTING STRATEGIES
  swarf: {
    basicSwarf: {
      name: 'Basic Swarf Milling',
      type: '5axis_simultaneous',
      description: 'Side cutting with tool axis following ruled surface',
      parameters: {
        leadAngle: { default: 0, range: [-15, 15], unit: 'deg' },
        tiltAngle: { default: 0, range: [-10, 10], unit: 'deg' },
        stepover: { default: 0.5, range: [0.1, 0.9], unit: 'xD' }
      },
      suitableFor: ['ruled_surfaces', 'draft_walls', 'extruded_features'],
      toolTypes: ['endmill', 'bullnose'],
      tcpRequired: true,
      collisionRisk: 'medium',
      generateParams: function(surface, tool, options = {}) {
        return {
          strategy: 'swarf',
          toolAxis: 'follow_surface_normal',
          leadAngle: options.leadAngle || 0,
          tiltAngle: options.tiltAngle || 0,
          stepover: (options.stepover || 0.5) * tool.diameter,
          direction: options.direction || 'climb',
          smoothing: options.smoothing !== false
        };
      }
    },
    multiSurfaceSwarf: {
      name: 'Multi-Surface Swarf',
      type: '5axis_simultaneous',
      description: 'Swarf cutting across multiple connected ruled surfaces',
      parameters: {
        surfaceBlending: { default: true },
        transitionSmoothing: { default: 0.5, range: [0, 1] },
        maintainContact: { default: true }
      },
      suitableFor: ['complex_walls', 'multi_face_pockets', 'blade_roots'],
      tcpRequired: true,
      generateParams: function(surfaces, tool, options = {}) {
        return {
          strategy: 'multi_surface_swarf',
          surfaces: surfaces,
          blending: options.surfaceBlending !== false,
          transitionSmoothing: options.transitionSmoothing || 0.5,
          maintainContact: options.maintainContact !== false
        };
      }
    }
  },
  // FLOWLINE/MORPH STRATEGIES
  flowline: {
    uvFlowline: {
      name: 'UV Flowline',
      type: '5axis_simultaneous',
      description: 'Follow surface UV parameters for organic shapes',
      parameters: {
        direction: { default: 'u', options: ['u', 'v', 'uv'] },
        stepover: { default: 0.2, range: [0.05, 0.5], unit: 'xD' },
        toolAxisMode: { default: 'surface_normal', options: ['surface_normal', 'lead_lag', 'fixed'] }
      },
      suitableFor: ['organic_surfaces', 'mold_cavities', 'freeform_shapes'],
      toolTypes: ['ball', 'bullnose'],
      generateParams: function(surface, tool, options = {}) {
        return {
          strategy: 'uv_flowline',
          direction: options.direction || 'u',
          stepover: (options.stepover || 0.2) * tool.diameter,
          toolAxisMode: options.toolAxisMode || 'surface_normal'
        };
      }
    },
    morphBetweenCurves: {
      name: 'Morph Between Curves',
      type: '5axis_simultaneous',
      description: 'Generate toolpaths morphing between boundary curves',
      parameters: {
        curveStart: { required: true },
        curveEnd: { required: true },
        passes: { default: 20, range: [5, 100] },
        morphMethod: { default: 'linear', options: ['linear', 'smooth', 'arc'] }
      },
      suitableFor: ['lofted_surfaces', 'transitions', 'blends'],
      generateParams: function(startCurve, endCurve, tool, options = {}) {
        return {
          strategy: 'morph_between',
          startCurve: startCurve,
          endCurve: endCurve,
          passes: options.passes || 20,
          morphMethod: options.morphMethod || 'linear',
          stepover: (options.stepover || 0.15) * tool.diameter
        };
      }
    }
  },
  // IMPELLER/BLISK STRATEGIES
  impeller: {
    bladeRoughing: {
      name: 'Impeller Blade Roughing',
      type: '5axis_simultaneous',
      description: 'Aggressive roughing between impeller blades',
      parameters: {
        radialDepth: { default: 0.1, range: [0.05, 0.2], unit: 'xD' },
        axialDepth: { default: 1.0, range: [0.5, 2.0], unit: 'xLOC' },
        approach: { default: 'hub_to_shroud' }
      },
      suitableFor: ['impellers', 'blisks', 'turbine_rotors'],
      toolTypes: ['tapered_ball', 'tapered_endmill'],
      machinability: 'difficult',
      generateParams: function(impeller, tool, options = {}) {
        return {
          strategy: 'impeller_roughing',
          bladeCount: impeller.bladeCount,
          hubDiameter: impeller.hubDiameter,
          shroudDiameter: impeller.shroudDiameter,
          radialDepth: (options.radialDepth || 0.1) * tool.diameter,
          axialDepth: (options.axialDepth || 1.0) * tool.loc,
          approach: options.approach || 'hub_to_shroud',
          retractHeight: options.retractHeight || 5
        };
      }
    },
    bladeFinishing: {
      name: 'Impeller Blade Finishing',
      type: '5axis_simultaneous',
      description: 'High-precision finishing of blade surfaces',
      parameters: {
        scallop: { default: 0.005, range: [0.001, 0.02], unit: 'mm' },
        leadAngle: { default: 5, range: [0, 15], unit: 'deg' },
        tiltAngle: { default: 0, range: [-10, 10], unit: 'deg' }
      },
      suitableFor: ['impeller_blades', 'turbine_blades'],
      toolTypes: ['ball', 'tapered_ball'],
      surfaceQuality: 'mirror',
      generateParams: function(blade, tool, options = {}) {
        return {
          strategy: 'blade_finishing',
          scallop: options.scallop || 0.005,
          leadAngle: options.leadAngle || 5,
          tiltAngle: options.tiltAngle || 0,
          toolContactPoint: 'ball_center',
          smoothing: true
        };
      }
    },
    hubFinishing: {
      name: 'Hub Surface Finishing',
      type: '5axis_simultaneous',
      description: 'Finish machining of hub between blades',
      parameters: {
        pattern: { default: 'radial', options: ['radial', 'circular', 'spiral'] }
      },
      suitableFor: ['impeller_hubs', 'blisk_hubs'],
      generateParams: function(hub, tool, options = {}) {
        return {
          strategy: 'hub_finishing',
          pattern: options.pattern || 'radial',
          stepover: (options.stepover || 0.15) * tool.diameter
        };
      }
    },
    splitterMachining: {
      name: 'Splitter Blade Machining',
      type: '5axis_simultaneous',
      description: 'Machine splitter blades between main blades',
      parameters: {
        splitterHeight: { required: true },
        blendRadius: { default: 0.5, range: [0.1, 2.0], unit: 'mm' }
      },
      suitableFor: ['impellers_with_splitters', 'mixed_flow_impellers'],
      generateParams: function(splitter, tool, options = {}) {
        return {
          strategy: 'splitter_machining',
          height: splitter.height,
          blendRadius: options.blendRadius || 0.5
        };
      }
    }
  },
  // TURBINE BLADE STRATEGIES
  turbine: {
    airfoilRoughing: {
      name: 'Airfoil Roughing',
      type: '5axis_simultaneous',
      description: 'Rough machining of turbine blade airfoil sections',
      parameters: {
        stockAllowance: { default: 0.5, range: [0.2, 1.0], unit: 'mm' },
        approach: { default: 'radial', options: ['radial', 'tangential'] }
      },
      suitableFor: ['turbine_blades', 'fan_blades', 'compressor_blades'],
      materialNote: 'Typically titanium or nickel alloys',
      generateParams: function(airfoil, tool, options = {}) {
        return {
          strategy: 'airfoil_roughing',
          stockAllowance: options.stockAllowance || 0.5,
          approach: options.approach || 'radial',
          radialDepth: (options.radialDepth || 0.08) * tool.diameter
        };
      }
    },
    airfoilFinishing: {
      name: 'Airfoil Finishing',
      type: '5axis_simultaneous',
      description: 'Precision finishing of airfoil profile',
      parameters: {
        scallop: { default: 0.003, range: [0.001, 0.01], unit: 'mm' },
        passes: { default: 'spanwise', options: ['spanwise', 'chordwise'] }
      },
      suitableFor: ['turbine_blades'],
      surfaceQuality: 'aerospace',
      generateParams: function(airfoil, tool, options = {}) {
        return {
          strategy: 'airfoil_finishing',
          scallop: options.scallop || 0.003,
          passDirection: options.passes || 'spanwise'
        };
      }
    },
    filletMachining: {
      name: 'Blade Root Fillet',
      type: '5axis_simultaneous',
      description: 'Machine fillet radius at blade root',
      parameters: {
        filletRadius: { required: true },
        blendSmoothing: { default: true }
      },
      suitableFor: ['blade_roots', 'platform_fillets'],
      generateParams: function(fillet, tool, options = {}) {
        return {
          strategy: 'fillet_machining',
          radius: fillet.radius,
          blendSmoothing: options.blendSmoothing !== false
        };
      }
    },
    platformMachining: {
      name: 'Platform Machining',
      type: '5axis_simultaneous',
      description: 'Machine blade platform surfaces',
      suitableFor: ['blade_platforms', 'shroud_platforms'],
      generateParams: function(platform, tool, options = {}) {
        return {
          strategy: 'platform_machining',
          stockAllowance: options.stockAllowance || 0.3
        };
      }
    }
  },
  // PORT/MANIFOLD STRATEGIES
  port: {
    portRoughing: {
      name: 'Port Roughing',
      type: '5axis_simultaneous',
      description: 'Rough internal port passages',
      parameters: {
        approachAngle: { default: 15, range: [0, 45], unit: 'deg' },
        stepdown: { default: 0.75, range: [0.3, 1.0], unit: 'xLOC' }
      },
      suitableFor: ['intake_ports', 'exhaust_ports', 'manifolds'],
      toolTypes: ['ball', 'tapered_ball'],
      generateParams: function(port, tool, options = {}) {
        return {
          strategy: 'port_roughing',
          approachAngle: options.approachAngle || 15,
          stepdown: (options.stepdown || 0.75) * tool.loc
        };
      }
    },
    portFinishing: {
      name: 'Port Finishing',
      type: '5axis_simultaneous',
      description: 'Smooth finish internal port surfaces',
      suitableFor: ['intake_ports', 'exhaust_ports'],
      surfaceQuality: 'flow_optimized',
      generateParams: function(port, tool, options = {}) {
        return {
          strategy: 'port_finishing',
          scallop: options.scallop || 0.01
        };
      }
    },
    portBlending: {
      name: 'Port Blend',
      type: '5axis_simultaneous',
      description: 'Blend transitions between port sections',
      suitableFor: ['port_transitions', 'runner_blends'],
      generateParams: function(blend, tool, options = {}) {
        return {
          strategy: 'port_blending',
          transitionLength: options.transitionLength || 10
        };
      }
    }
  },
  // GEODESIC/VARIABLE AXIS STRATEGIES
  advanced: {
    geodesicFinishing: {
      name: 'Geodesic Finishing',
      type: '5axis_simultaneous',
      description: 'Follow geodesic curves on complex surfaces',
      parameters: {
        direction: { default: 'shortest', options: ['shortest', 'u_iso', 'v_iso'] }
      },
      suitableFor: ['complex_surfaces', 'compound_curves'],
      generateParams: function(surface, tool, options = {}) {
        return {
          strategy: 'geodesic_finishing',
          direction: options.direction || 'shortest',
          stepover: (options.stepover || 0.1) * tool.diameter
        };
      }
    },
    variableAxisContouring: {
      name: 'Variable Axis Contouring',
      type: '5axis_simultaneous',
      description: 'Continuous tool axis variation for complex profiles',
      parameters: {
        axisLimits: { a: { min: -30, max: 30 }, c: { min: 0, max: 360 } },
        smoothingLevel: { default: 'high', options: ['low', 'medium', 'high'] }
      },
      suitableFor: ['complex_contours', 'undercutting'],
      generateParams: function(profile, tool, options = {}) {
        return {
          strategy: 'variable_axis_contouring',
          axisLimits: options.axisLimits || { a: { min: -30, max: 30 }, c: { min: 0, max: 360 } },
          smoothingLevel: options.smoothingLevel || 'high'
        };
      }
    },
    driveSurfaceMilling: {
      name: 'Drive Surface Milling',
      type: '5axis_simultaneous',
      description: 'Tool follows drive surface with controlled projection',
      parameters: {
        driveSurface: { required: true },
        checkSurfaces: { required: true },
        projectionType: { default: 'normal', options: ['normal', 'fixed', 'toward_point'] }
      },
      suitableFor: ['sculptured_surfaces', 'die_surfaces'],
      generateParams: function(driveSurf, checkSurfs, tool, options = {}) {
        return {
          strategy: 'drive_surface',
          driveSurface: driveSurf,
          checkSurfaces: checkSurfs,
          projectionType: options.projectionType || 'normal'
        };
      }
    },
    tiltedPlane5Axis: {
      name: 'Tilted Plane (3+2)',
      type: '5axis_positioned',
      description: '3-axis machining on tilted work plane',
      parameters: {
        tiltA: { default: 0, range: [-90, 90], unit: 'deg' },
        tiltC: { default: 0, range: [0, 360], unit: 'deg' }
      },
      suitableFor: ['angled_features', 'indexed_faces'],
      generateParams: function(feature, tool, options = {}) {
        return {
          strategy: '3_plus_2',
          tiltA: options.tiltA || 0,
          tiltC: options.tiltC || 0,
          useWorkPlane: true
        };
      }
    }
  },
  // STRATEGY SELECTION HELPER

  /**
   * Get recommended strategy for feature type
   */
  getRecommendedStrategy(featureType, options = {}) {
    const recommendations = {
      'ruled_surface': ['swarf.basicSwarf', 'flowline.uvFlowline'],
      'freeform_surface': ['flowline.uvFlowline', 'advanced.geodesicFinishing'],
      'impeller': ['impeller.bladeRoughing', 'impeller.bladeFinishing', 'impeller.hubFinishing'],
      'turbine_blade': ['turbine.airfoilRoughing', 'turbine.airfoilFinishing'],
      'port': ['port.portRoughing', 'port.portFinishing'],
      'angled_feature': ['advanced.tiltedPlane5Axis'],
      'complex_contour': ['advanced.variableAxisContouring']
    };
    return recommendations[featureType] || ['flowline.uvFlowline'];
  },
  /**
   * Get strategy by path
   */
  getStrategy(path) {
    const parts = path.split('.');
    if (parts.length !== 2) return null;

    const category = this[parts[0]];
    if (!category) return null;

    return category[parts[1]] || null;
  }
}