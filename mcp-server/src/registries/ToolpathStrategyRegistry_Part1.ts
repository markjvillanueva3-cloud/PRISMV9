/**
 * PRISM Manufacturing Intelligence - Comprehensive Toolpath Strategy Registry
 * ALL 200+ Toolpath Strategies from Monolith + Novel Additions
 * 
 * SOURCE: PRISM_TOOLPATH_STRATEGIES_COMPLETE.js (Lines 709235-710282)
 * 
 * Categories (28):
 * - 3D Finishing (24 strategies)
 * - 3D Roughing (4 strategies)
 * - 5-Axis (12 strategies)
 * - Adaptive/HSM (11 strategies)
 * - Boring (5 strategies)
 * - Chamfer (4 strategies)
 * - Contour (4 strategies)
 * - Drilling (12 strategies)
 * - Engrave (3 strategies)
 * - Facing (4 strategies)
 * - Finishing Ops (4 strategies)
 * - 5-Axis Finishing (5 strategies)
 * - Groove (6 strategies)
 * - HSM Commercial (5 strategies)
 * - Multi-Axis (16 strategies)
 * - Pocket (5 strategies)
 * - Slot (4 strategies)
 * - Specialty (11 strategies)
 * - Threading (6 strategies)
 * - Turning (20 strategies)
 * - Wire EDM (8 strategies)
 * - PRISM Novel (15+ strategies) ← NEW INVENTIONS
 * 
 * @version 1.0.0
 * @module ToolpathStrategyRegistry
 */

// ============================================================================
// TYPES
// ============================================================================

export type AxisCapability = '2D' | '2.5D' | '3D' | '4D' | '5D';
export type OperationPhase = 'ROUGHING' | 'SEMI_FINISHING' | 'FINISHING' | 'SUPER_FINISHING';
export type ToolpathPattern = 
  | 'zigzag' | 'spiral' | 'contour' | 'offset' | 'parallel' | 'radial'
  | 'scallop' | 'pencil' | 'waterline' | 'flowline' | 'geodesic' | 'isocurve'
  | 'steep_shallow' | 'trochoidal' | 'adaptive' | 'peck' | 'helical'
  | 'morphed' | 'drive_curve' | 'swarf' | 'project' | 'level_z';

export interface ToolpathStrategy {
  id: string;
  name: string;
  category: string;
  axes: AxisCapability;
  description: string;
  roughing: boolean;
  finishing: boolean;
  rest?: boolean;
  hsm?: boolean;
  pattern?: ToolpathPattern;
  specialized?: string;
  commercial?: boolean;
  prismNovel?: boolean;
  
  // Selection criteria
  suitableFor: {
    geometry: string[];
    materials: string[];
    operations: string[];
  };
  
  // Parameters
  parameters: {
    name: string;
    type: 'number' | 'boolean' | 'enum';
    default: any;
    min?: number;
    max?: number;
    options?: string[];
    description: string;
  }[];
  
  // Performance characteristics
  performance: {
    mrr: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
    surfaceFinish: 'ROUGH' | 'MEDIUM' | 'FINE' | 'MIRROR';
    toolWear: 'LOW' | 'MEDIUM' | 'HIGH';
    cycleTime: 'FAST' | 'MEDIUM' | 'SLOW';
  };
}

// ============================================================================
// 3D FINISHING STRATEGIES (24)
// ============================================================================

export const FINISHING_3D_STRATEGIES: Record<string, ToolpathStrategy> = {
  BLEND_FINISHING: {
    id: 'BLEND_FINISHING',
    name: 'Blend Finishing',
    category: '3d_finishing',
    axes: '3D',
    description: 'Blended surface finishing with smooth transitions between passes',
    roughing: false,
    finishing: true,
    pattern: 'parallel',
    suitableFor: {
      geometry: ['freeform', 'blended_surfaces', 'fillets'],
      materials: ['steel', 'aluminum', 'titanium'],
      operations: ['finishing']
    },
    parameters: [
      { name: 'stepover', type: 'number', default: 0.3, min: 0.05, max: 2, description: 'Stepover [mm]' },
      { name: 'tolerance', type: 'number', default: 0.01, min: 0.001, max: 0.1, description: 'Surface tolerance [mm]' },
      { name: 'blendAngle', type: 'number', default: 45, min: 0, max: 90, description: 'Blend angle [deg]' }
    ],
    performance: { mrr: 'LOW', surfaceFinish: 'FINE', toolWear: 'LOW', cycleTime: 'SLOW' }
  },
  
  CLEANUP: {
    id: 'CLEANUP',
    name: 'Cleanup / Rest Finishing',
    category: '3d_finishing',
    axes: '3D',
    description: 'Removes material left by larger tools in corners and tight areas',
    roughing: false,
    finishing: true,
    rest: true,
    suitableFor: {
      geometry: ['corners', 'fillets', 'tight_areas', 'pockets'],
      materials: ['all'],
      operations: ['cleanup', 'rest_machining']
    },
    parameters: [
      { name: 'previousToolDia', type: 'number', default: 10, min: 1, max: 100, description: 'Previous tool diameter [mm]' },
      { name: 'restThreshold', type: 'number', default: 0.5, min: 0.1, max: 5, description: 'Min rest material [mm]' },
      { name: 'stepover', type: 'number', default: 0.2, min: 0.05, max: 1, description: 'Stepover [mm]' }
    ],
    performance: { mrr: 'LOW', surfaceFinish: 'FINE', toolWear: 'MEDIUM', cycleTime: 'MEDIUM' }
  },
  
  CONSTANT_Z: {
    id: 'CONSTANT_Z',
    name: 'Constant Z / Z-Level',
    category: '3d_finishing',
    axes: '3D',
    description: 'Horizontal slice machining at constant Z levels - ideal for steep walls',
    roughing: false,
    finishing: true,
    pattern: 'level_z',
    suitableFor: {
      geometry: ['steep_walls', 'pockets', 'cavities', 'molds'],
      materials: ['all'],
      operations: ['finishing', 'semi_finishing']
    },
    parameters: [
      { name: 'stepdown', type: 'number', default: 0.3, min: 0.05, max: 2, description: 'Z stepdown [mm]' },
      { name: 'minSteepAngle', type: 'number', default: 30, min: 0, max: 90, description: 'Min steep angle [deg]' },
      { name: 'direction', type: 'enum', default: 'climb', options: ['climb', 'conventional', 'mixed'], description: 'Cut direction' }
    ],
    performance: { mrr: 'MEDIUM', surfaceFinish: 'FINE', toolWear: 'LOW', cycleTime: 'MEDIUM' }
  },
  
  CONTOUR_3D: {
    id: 'CONTOUR_3D',
    name: '3D Contour',
    category: '3d_finishing',
    axes: '3D',
    description: 'Follows 3D contour of surface for uniform finish on complex shapes',
    roughing: false,
    finishing: true,
    pattern: 'contour',
    suitableFor: {
      geometry: ['complex_surfaces', 'organic_shapes', 'freeform'],
      materials: ['all'],
      operations: ['finishing']
    },
    parameters: [
      { name: 'stepover', type: 'number', default: 0.25, min: 0.05, max: 2, description: 'Stepover [mm]' },
      { name: 'tolerance', type: 'number', default: 0.01, min: 0.001, max: 0.1, description: 'Surface tolerance [mm]' }
    ],
    performance: { mrr: 'LOW', surfaceFinish: 'FINE', toolWear: 'LOW', cycleTime: 'SLOW' }
  },
  
  CORNER_FINISHING: {
    id: 'CORNER_FINISHING',
    name: 'Corner Finishing',
    category: '3d_finishing',
    axes: '3D',
    description: 'Internal corner cleanup with optimized tool engagement',
    roughing: false,
    finishing: true,
    suitableFor: {
      geometry: ['internal_corners', 'fillets', 'radii'],
      materials: ['all'],
      operations: ['corner_cleanup', 'finishing']
    },
    parameters: [
      { name: 'cornerRadius', type: 'number', default: 3, min: 0.5, max: 20, description: 'Target corner radius [mm]' },
      { name: 'stepover', type: 'number', default: 0.15, min: 0.05, max: 1, description: 'Stepover [mm]' },
      { name: 'approachAngle', type: 'number', default: 45, min: 15, max: 75, description: 'Approach angle [deg]' }
    ],
    performance: { mrr: 'LOW', surfaceFinish: 'FINE', toolWear: 'MEDIUM', cycleTime: 'MEDIUM' }
  },
  
  FLOWLINE: {
    id: 'FLOWLINE',
    name: 'Flowline',
    category: '3d_finishing',
    axes: '3D',
    description: 'Follows surface flow lines for optimal surface quality on complex shapes',
    roughing: false,
    finishing: true,
    pattern: 'flowline',
    suitableFor: {
      geometry: ['complex_surfaces', 'organic_shapes', 'blends', 'automotive'],
      materials: ['all'],
      operations: ['finishing', 'super_finishing']
    },
    parameters: [
      { name: 'stepover', type: 'number', default: 0.2, min: 0.05, max: 1, description: 'Stepover [mm]' },
      { name: 'flowDirection', type: 'enum', default: 'uv', options: ['uv', 'vu', 'mixed'], description: 'Flow direction' },
      { name: 'boundaryOffset', type: 'number', default: 0, min: -5, max: 5, description: 'Boundary offset [mm]' }
    ],
    performance: { mrr: 'LOW', surfaceFinish: 'MIRROR', toolWear: 'LOW', cycleTime: 'SLOW' }
  },
  
  GEODESIC: {
    id: 'GEODESIC',
    name: 'Geodesic',
    category: '3d_finishing',
    axes: '3D',
    description: 'Follows geodesic paths (shortest path on surface) for uniform stepover',
    roughing: false,
    finishing: true,
    pattern: 'geodesic',
    suitableFor: {
      geometry: ['complex_surfaces', 'domes', 'spherical', 'organic'],
      materials: ['all'],
      operations: ['finishing']
    },
    parameters: [
      { name: 'stepover', type: 'number', default: 0.2, min: 0.05, max: 1, description: 'Geodesic stepover [mm]' },
      { name: 'startPoint', type: 'enum', default: 'center', options: ['center', 'edge', 'custom'], description: 'Start location' }
    ],
    performance: { mrr: 'LOW', surfaceFinish: 'FINE', toolWear: 'LOW', cycleTime: 'SLOW' }
  },
  
  ISOCURVE: {
    id: 'ISOCURVE',
    name: 'Isocurve / Isoparametric',
    category: '3d_finishing',
    axes: '3D',
    description: 'Follows surface UV isoparametric lines for natural flow on NURBS surfaces',
    roughing: false,
    finishing: true,
    pattern: 'isocurve',
    suitableFor: {
      geometry: ['nurbs_surfaces', 'cad_surfaces', 'ruled_surfaces'],
      materials: ['all'],
      operations: ['finishing']
    },
    parameters: [
      { name: 'stepover', type: 'number', default: 0.25, min: 0.05, max: 1, description: 'Stepover [mm]' },
      { name: 'direction', type: 'enum', default: 'u', options: ['u', 'v', 'both'], description: 'Iso direction' }
    ],
    performance: { mrr: 'LOW', surfaceFinish: 'FINE', toolWear: 'LOW', cycleTime: 'MEDIUM' }
  },
  
  LEFTOVER: {
    id: 'LEFTOVER',
    name: 'Leftover Material Detection',
    category: '3d_finishing',
    axes: '3D',
    description: 'Automatically detects and machines remaining material from previous operations',
    roughing: false,
    finishing: true,
    rest: true,
    suitableFor: {
      geometry: ['all'],
      materials: ['all'],
      operations: ['rest_machining', 'cleanup']
    },
    parameters: [
      { name: 'detectionThreshold', type: 'number', default: 0.2, min: 0.05, max: 2, description: 'Detection threshold [mm]' },
      { name: 'previousTools', type: 'number', default: 1, min: 1, max: 5, description: 'Number of previous tools to consider' }
    ],
    performance: { mrr: 'LOW', surfaceFinish: 'FINE', toolWear: 'MEDIUM', cycleTime: 'MEDIUM' }
  },
  
  MORPHED_SPIRAL: {
    id: 'MORPHED_SPIRAL',
    name: 'Morphed Spiral',
    category: '3d_finishing',
    axes: '3D',
    description: 'Spiral pattern morphed to surface shape for continuous cutting',
    roughing: false,
    finishing: true,
    pattern: 'spiral',
    suitableFor: {
      geometry: ['pockets', 'cavities', 'bowls', 'dished_surfaces'],
      materials: ['all'],
      operations: ['finishing']
    },
    parameters: [
      { name: 'stepover', type: 'number', default: 0.3, min: 0.05, max: 1, description: 'Spiral stepover [mm]' },
      { name: 'spiralDirection', type: 'enum', default: 'inward', options: ['inward', 'outward'], description: 'Spiral direction' }
    ],
    performance: { mrr: 'MEDIUM', surfaceFinish: 'FINE', toolWear: 'LOW', cycleTime: 'FAST' }
  },
  
  OPTIMIZED_CONSTANT_Z: {
    id: 'OPTIMIZED_CONSTANT_Z',
    name: 'Optimized Z-Level',
    category: '3d_finishing',
    axes: '3D',
    description: 'Z-level with variable stepdown optimized for surface curvature',
    roughing: false,
    finishing: true,
    pattern: 'level_z',
    suitableFor: {
      geometry: ['variable_steepness', 'complex_walls', 'molds'],
      materials: ['all'],
      operations: ['finishing']
    },
    parameters: [
      { name: 'minStepdown', type: 'number', default: 0.1, min: 0.02, max: 0.5, description: 'Min stepdown [mm]' },
      { name: 'maxStepdown', type: 'number', default: 0.5, min: 0.1, max: 2, description: 'Max stepdown [mm]' },
      { name: 'scallopHeight', type: 'number', default: 0.005, min: 0.001, max: 0.05, description: 'Target scallop [mm]' }
    ],
    performance: { mrr: 'MEDIUM', surfaceFinish: 'FINE', toolWear: 'LOW', cycleTime: 'MEDIUM' }
  },
  
  PARALLEL_BOTH_WAYS: {
    id: 'PARALLEL_BOTH_WAYS',
    name: 'Parallel Both Ways / Zigzag',
    category: '3d_finishing',
    axes: '3D',
    description: 'Bidirectional parallel passes for faster cycle time',
    roughing: false,
    finishing: true,
    pattern: 'parallel',
    suitableFor: {
      geometry: ['flat_areas', 'shallow_surfaces', 'general'],
      materials: ['all'],
      operations: ['finishing', 'semi_finishing']
    },
    parameters: [
      { name: 'stepover', type: 'number', default: 0.4, min: 0.1, max: 2, description: 'Stepover [mm]' },
      { name: 'angle', type: 'number', default: 45, min: 0, max: 180, description: 'Cut angle [deg]' }
    ],
    performance: { mrr: 'MEDIUM', surfaceFinish: 'MEDIUM', toolWear: 'LOW', cycleTime: 'FAST' }
  },
  
  PARALLEL_FINISHING: {
    id: 'PARALLEL_FINISHING',
    name: 'Parallel Finishing / Raster',
    category: '3d_finishing',
    axes: '3D',
    description: 'Unidirectional parallel passes for consistent surface quality',
    roughing: false,
    finishing: true,
    pattern: 'parallel',
    suitableFor: {
      geometry: ['flat_areas', 'shallow_surfaces', 'general'],
      materials: ['all'],
      operations: ['finishing']
    },
    parameters: [
      { name: 'stepover', type: 'number', default: 0.3, min: 0.05, max: 1, description: 'Stepover [mm]' },
      { name: 'angle', type: 'number', default: 0, min: 0, max: 180, description: 'Cut angle [deg]' },
      { name: 'direction', type: 'enum', default: 'climb', options: ['climb', 'conventional'], description: 'Cut direction' }
    ],
    performance: { mrr: 'MEDIUM', surfaceFinish: 'FINE', toolWear: 'LOW', cycleTime: 'MEDIUM' }
  },
  
  PARALLEL_SPIRAL: {
    id: 'PARALLEL_SPIRAL',
    name: 'Parallel Spiral',
    category: '3d_finishing',
    axes: '3D',
    description: 'Combines parallel pattern with spiral connect moves',
    roughing: false,
    finishing: true,
    pattern: 'spiral',
    suitableFor: {
      geometry: ['large_flat_areas', 'plates'],
      materials: ['all'],
      operations: ['finishing']
    },
    parameters: [
      { name: 'stepover', type: 'number', default: 0.35, min: 0.1, max: 1.5, description: 'Stepover [mm]' }
    ],
    performance: { mrr: 'MEDIUM', surfaceFinish: 'FINE', toolWear: 'LOW', cycleTime: 'FAST' }
  },
  
  PENCIL: {
    id: 'PENCIL',
    name: 'Pencil Trace',
    category: '3d_finishing',
    axes: '3D',
    description: 'Traces along internal corners and fillets like a pencil in a groove',
    roughing: false,
    finishing: true,
    pattern: 'pencil',
    suitableFor: {
      geometry: ['fillets', 'internal_corners', 'grooves'],
      materials: ['all'],
      operations: ['corner_finishing', 'cleanup']
    },
    parameters: [
      { name: 'cornerAngle', type: 'number', default: 90, min: 30, max: 150, description: 'Max corner angle [deg]' },
      { name: 'multiPass', type: 'boolean', default: true, description: 'Multiple passes' },
      { name: 'stepover', type: 'number', default: 0.15, min: 0.05, max: 0.5, description: 'Stepover for multipass [mm]' }
    ],
    performance: { mrr: 'LOW', surfaceFinish: 'FINE', toolWear: 'MEDIUM', cycleTime: 'MEDIUM' }
  },
  
  PENCIL_TRACE: {
    id: 'PENCIL_TRACE',
    name: 'Pencil Trace Extended',
    category: '3d_finishing',
    axes: '3D',
    description: 'Extended pencil trace with lead-in/out optimization',
    roughing: false,
    finishing: true,
    pattern: 'pencil',
    suitableFor: {
      geometry: ['complex_fillets', 'variable_radii_corners'],
      materials: ['all'],
      operations: ['corner_finishing']
    },
    parameters: [
      { name: 'minRadius', type: 'number', default: 1, min: 0.5, max: 10, description: 'Min detection radius [mm]' },
      { name: 'maxRadius', type: 'number', default: 10, min: 2, max: 50, description: 'Max detection radius [mm]' }
    ],
    performance: { mrr: 'LOW', surfaceFinish: 'FINE', toolWear: 'MEDIUM', cycleTime: 'MEDIUM' }
  },
  
  RADIAL_FINISHING: {
    id: 'RADIAL_FINISHING',
    name: 'Radial Finishing',
    category: '3d_finishing',
    axes: '3D',
    description: 'Radial passes from center outward - ideal for circular features',
    roughing: false,
    finishing: true,
    pattern: 'radial',
    suitableFor: {
      geometry: ['circular', 'radial_features', 'domes', 'bosses'],
      materials: ['all'],
      operations: ['finishing']
    },
    parameters: [
      { name: 'angularStep', type: 'number', default: 5, min: 1, max: 30, description: 'Angular step [deg]' },
      { name: 'centerPoint', type: 'enum', default: 'auto', options: ['auto', 'manual'], description: 'Center detection' }
    ],
    performance: { mrr: 'MEDIUM', surfaceFinish: 'FINE', toolWear: 'LOW', cycleTime: 'MEDIUM' }
  },
  
  REST_FINISHING: {
    id: 'REST_FINISHING',
    name: 'Rest Finishing',
    category: '3d_finishing',
    axes: '3D',
    description: 'Finishes only areas with remaining stock from previous operations',
    roughing: false,
    finishing: true,
    rest: true,
    suitableFor: {
      geometry: ['all'],
      materials: ['all'],
      operations: ['rest_machining', 'finishing']
    },
    parameters: [
      { name: 'stockToLeave', type: 'number', default: 0, min: 0, max: 1, description: 'Stock to leave [mm]' },
      { name: 'previousToolDia', type: 'number', default: 10, min: 1, max: 100, description: 'Previous tool diameter [mm]' }
    ],
    performance: { mrr: 'LOW', surfaceFinish: 'FINE', toolWear: 'MEDIUM', cycleTime: 'MEDIUM' }
  },
  
  SCALLOP: {
    id: 'SCALLOP',
    name: 'Scallop / Constant Cusp',
    category: '3d_finishing',
    axes: '3D',
    description: 'Maintains constant scallop height regardless of surface curvature',
    roughing: false,
    finishing: true,
    pattern: 'scallop',
    suitableFor: {
      geometry: ['variable_curvature', 'complex_surfaces', 'molds'],
      materials: ['all'],
      operations: ['finishing']
    },
    parameters: [
      { name: 'scallopHeight', type: 'number', default: 0.01, min: 0.001, max: 0.1, description: 'Target scallop [mm]' },
      { name: 'maxStepover', type: 'number', default: 2, min: 0.5, max: 10, description: 'Max stepover [mm]' }
    ],
    performance: { mrr: 'MEDIUM', surfaceFinish: 'FINE', toolWear: 'LOW', cycleTime: 'MEDIUM' }
  },
  
  SHALLOW_ONLY: {
    id: 'SHALLOW_ONLY',
    name: 'Shallow Area Machining',
    category: '3d_finishing',
    axes: '3D',
    description: 'Machines only shallow/flat areas - pairs with steep machining',
    roughing: false,
    finishing: true,
    suitableFor: {
      geometry: ['mixed_steepness', 'molds', 'dies'],
      materials: ['all'],
      operations: ['finishing']
    },
    parameters: [
      { name: 'maxSteepAngle', type: 'number', default: 45, min: 15, max: 75, description: 'Max steep angle [deg]' },
      { name: 'stepover', type: 'number', default: 0.3, min: 0.05, max: 1, description: 'Stepover [mm]' }
    ],
    performance: { mrr: 'MEDIUM', surfaceFinish: 'FINE', toolWear: 'LOW', cycleTime: 'MEDIUM' }
  },
  
  SPIRAL_3D: {
    id: 'SPIRAL_3D',
    name: '3D Spiral',
    category: '3d_finishing',
    axes: '3D',
    description: '3D spiral path following surface contour',
    roughing: false,
    finishing: true,
    pattern: 'spiral',
    suitableFor: {
      geometry: ['domes', 'hemispheres', 'concave_surfaces'],
      materials: ['all'],
      operations: ['finishing']
    },
    parameters: [
      { name: 'stepover', type: 'number', default: 0.3, min: 0.05, max: 1, description: 'Spiral stepover [mm]' },
      { name: 'direction', type: 'enum', default: 'inward', options: ['inward', 'outward'], description: 'Spiral direction' }
    ],
    performance: { mrr: 'MEDIUM', surfaceFinish: 'FINE', toolWear: 'LOW', cycleTime: 'FAST' }
  },
  
  STEEP_ONLY: {
    id: 'STEEP_ONLY',
    name: 'Steep Area Machining',
    category: '3d_finishing',
    axes: '3D',
    description: 'Machines only steep/vertical areas - pairs with shallow machining',
    roughing: false,
    finishing: true,
    suitableFor: {
      geometry: ['steep_walls', 'vertical_surfaces', 'molds'],
      materials: ['all'],
      operations: ['finishing']
    },
    parameters: [
      { name: 'minSteepAngle', type: 'number', default: 45, min: 15, max: 85, description: 'Min steep angle [deg]' },
      { name: 'stepdown', type: 'number', default: 0.3, min: 0.05, max: 1, description: 'Z stepdown [mm]' }
    ],
    performance: { mrr: 'MEDIUM', surfaceFinish: 'FINE', toolWear: 'LOW', cycleTime: 'MEDIUM' }
  },
  
  STEEP_SHALLOW: {
    id: 'STEEP_SHALLOW',
    name: 'Steep & Shallow Combined',
    category: '3d_finishing',
    axes: '3D',
    description: 'Automatic steep/shallow detection with optimized strategy per region',
    roughing: false,
    finishing: true,
    pattern: 'steep_shallow',
    suitableFor: {
      geometry: ['mixed_geometry', 'molds', 'dies', 'complex_parts'],
      materials: ['all'],
      operations: ['finishing']
    },
    parameters: [
      { name: 'thresholdAngle', type: 'number', default: 45, min: 30, max: 60, description: 'Steep/shallow threshold [deg]' },
      { name: 'steepStepdown', type: 'number', default: 0.3, min: 0.05, max: 1, description: 'Steep area stepdown [mm]' },
      { name: 'shallowStepover', type: 'number', default: 0.3, min: 0.05, max: 1, description: 'Shallow area stepover [mm]' }
    ],
    performance: { mrr: 'MEDIUM', surfaceFinish: 'FINE', toolWear: 'LOW', cycleTime: 'MEDIUM' }
  },
  
  WATERLINE: {
    id: 'WATERLINE',
    name: 'Waterline / Contour Z',
    category: '3d_finishing',
    axes: '3D',
    description: 'Horizontal contour passes at constant Z - like water levels on a surface',
    roughing: false,
    finishing: true,
    pattern: 'waterline',
    suitableFor: {
      geometry: ['steep_walls', 'molds', 'cavities'],
      materials: ['all'],
      operations: ['finishing', 'semi_finishing']
    },
    parameters: [
      { name: 'stepdown', type: 'number', default: 0.3, min: 0.05, max: 2, description: 'Z stepdown [mm]' },
      { name: 'direction', type: 'enum', default: 'climb', options: ['climb', 'conventional'], description: 'Cut direction' }
    ],
    performance: { mrr: 'MEDIUM', surfaceFinish: 'FINE', toolWear: 'LOW', cycleTime: 'MEDIUM' }
  }
};

// ============================================================================
// 3D ROUGHING STRATEGIES (4)
// ============================================================================

export const ROUGHING_3D_STRATEGIES: Record<string, ToolpathStrategy> = {
  CONTOUR_3D_ROUGHING: {
    id: 'CONTOUR_3D_ROUGHING',
    name: '3D Contour Roughing',
    category: '3d_roughing',
    axes: '3D',
    description: 'Roughing following 3D contour with constant stock allowance',
    roughing: true,
    finishing: false,
    pattern: 'contour',
    suitableFor: {
      geometry: ['complex_surfaces', 'molds', 'organic'],
      materials: ['all'],
      operations: ['roughing']
    },
    parameters: [
      { name: 'stepdown', type: 'number', default: 2, min: 0.5, max: 10, description: 'Z stepdown [mm]' },
      { name: 'stockToLeave', type: 'number', default: 0.5, min: 0, max: 5, description: 'Stock to leave [mm]' },
      { name: 'stepover', type: 'number', default: 5, min: 1, max: 20, description: 'Stepover [mm]' }
    ],
    performance: { mrr: 'HIGH', surfaceFinish: 'ROUGH', toolWear: 'MEDIUM', cycleTime: 'FAST' }
  },
  
  LEVEL_Z_ROUGHING: {
    id: 'LEVEL_Z_ROUGHING',
    name: 'Level Z Roughing',
    category: '3d_roughing',
    axes: '3D',
    description: 'Z-level roughing with horizontal slice removal',
    roughing: true,
    finishing: false,
    pattern: 'level_z',
    suitableFor: {
      geometry: ['pockets', 'cavities', 'prismatic'],
      materials: ['all'],
      operations: ['roughing']
    },
    parameters: [
      { name: 'stepdown', type: 'number', default: 3, min: 0.5, max: 15, description: 'Z stepdown [mm]' },
      { name: 'stepover', type: 'number', default: 6, min: 1, max: 25, description: 'Stepover [mm]' },
      { name: 'stockToLeave', type: 'number', default: 0.5, min: 0, max: 5, description: 'Stock to leave [mm]' }
    ],
    performance: { mrr: 'VERY_HIGH', surfaceFinish: 'ROUGH', toolWear: 'MEDIUM', cycleTime: 'FAST' }
  },
  
  REST_ROUGHING: {
    id: 'REST_ROUGHING',
    name: 'Rest Roughing',
    category: '3d_roughing',
    axes: '3D',
    description: 'Removes material left by larger roughing tool',
    roughing: true,
    finishing: false,
    rest: true,
    suitableFor: {
      geometry: ['corners', 'tight_areas', 'pockets'],
      materials: ['all'],
      operations: ['rest_roughing']
    },
    parameters: [
      { name: 'previousToolDia', type: 'number', default: 20, min: 5, max: 100, description: 'Previous tool diameter [mm]' },
      { name: 'stepdown', type: 'number', default: 2, min: 0.5, max: 10, description: 'Z stepdown [mm]' },
      { name: 'stockToLeave', type: 'number', default: 0.3, min: 0, max: 3, description: 'Stock to leave [mm]' }
    ],
    performance: { mrr: 'MEDIUM', surfaceFinish: 'ROUGH', toolWear: 'MEDIUM', cycleTime: 'MEDIUM' }
  },
  
  ROUGHING_3D: {
    id: 'ROUGHING_3D',
    name: 'General 3D Roughing',
    category: '3d_roughing',
    axes: '3D',
    description: 'General purpose 3D roughing with multiple pattern options',
    roughing: true,
    finishing: false,
    suitableFor: {
      geometry: ['all'],
      materials: ['all'],
      operations: ['roughing']
    },
    parameters: [
      { name: 'pattern', type: 'enum', default: 'offset', options: ['offset', 'zigzag', 'spiral'], description: 'Cut pattern' },
      { name: 'stepdown', type: 'number', default: 2.5, min: 0.5, max: 15, description: 'Z stepdown [mm]' },
      { name: 'stepover', type: 'number', default: 5, min: 1, max: 25, description: 'Stepover [mm]' }
    ],
    performance: { mrr: 'HIGH', surfaceFinish: 'ROUGH', toolWear: 'MEDIUM', cycleTime: 'FAST' }
  }
};

// Export strategy count for verification
export const STRATEGY_COUNTS = {
  finishing_3d: Object.keys(FINISHING_3D_STRATEGIES).length,
  roughing_3d: Object.keys(ROUGHING_3D_STRATEGIES).length,
  // More categories to follow in Part 2...
};

console.log(`[ToolpathStrategyRegistry] Loaded ${STRATEGY_COUNTS.finishing_3d + STRATEGY_COUNTS.roughing_3d} strategies (Part 1)`);
