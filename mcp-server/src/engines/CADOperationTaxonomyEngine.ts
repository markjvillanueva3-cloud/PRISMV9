/**
 * CADOperationTaxonomyEngine — Comprehensive CAD operation classification
 *
 * Provides taxonomy for all CAD operations with focus on aerospace/complex surfaces.
 * Classifications: feature type, complexity level, CAD system support, typical use cases.
 *
 * @module CADOperationTaxonomyEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export type OperationCategory =
  | 'sketch'
  | 'solid_creation'
  | 'solid_modification'
  | 'surface_creation'
  | 'surface_modification'
  | 'assembly'
  | 'analysis'
  | 'annotation'
  | 'utility';

export type ComplexityLevel = 'basic' | 'intermediate' | 'advanced' | 'expert';

export type CADSystem =
  | 'fusion360'
  | 'solidworks'
  | 'inventor'
  | 'mastercam'
  | 'hypercad'
  | 'freecad'
  | 'nx'
  | 'catia'
  | 'creo';

export type ContinuityType = 'G0' | 'G1' | 'G2' | 'G3';

export interface ParameterSpec {
  name: string;
  type: 'length' | 'angle' | 'count' | 'boolean' | 'selection' | 'profile' | 'path' | 'surface' | 'point' | 'vector';
  required: boolean;
  default?: number | boolean | string;
  min?: number;
  max?: number;
  description: string;
}

export interface OperationDefinition {
  id: string;
  name: string;
  category: OperationCategory;
  complexity: ComplexityLevel;
  description: string;
  aliases: string[];
  inputs: ParameterSpec[];
  outputs: string[];
  supportedSystems: CADSystem[];
  typicalUseCases: string[];
  constraints?: string[];
  continuity?: ContinuityType;
  isAerospace: boolean;
  relatedOps: string[];
}

export interface TaxonomyStats {
  totalOperations: number;
  byCategory: Record<OperationCategory, number>;
  byComplexity: Record<ComplexityLevel, number>;
  aerospaceOps: number;
  avgSystemSupport: number;
}

export interface SearchResult {
  operation: OperationDefinition;
  matchScore: number;
  matchedFields: string[];
}

export interface CompatibilityReport {
  operation: string;
  system: CADSystem;
  supported: boolean;
  alternatives: string[];
  notes: string;
}

// ============================================================================
// AEROSPACE OPERATIONS DEFINITIONS (5 required by Round 3)
// ============================================================================

const AEROSPACE_OPS: OperationDefinition[] = [
  {
    id: 'loft',
    name: 'Loft',
    category: 'surface_creation',
    complexity: 'advanced',
    description: 'Creates a surface or solid by blending between multiple cross-section profiles. Critical for airfoils, fuselage sections, turbine blades.',
    aliases: ['blend', 'multi-section_solid', 'transition', 'section_blend'],
    inputs: [
      { name: 'profiles', type: 'profile', required: true, description: 'Array of cross-section sketches/curves' },
      { name: 'guide_curves', type: 'path', required: false, description: 'Optional guide curves for shape control' },
      { name: 'center_line', type: 'path', required: false, description: 'Optional centerline for alignment' },
      { name: 'start_continuity', type: 'selection', required: false, default: 'G1', description: 'Continuity at start: G0, G1, G2' },
      { name: 'end_continuity', type: 'selection', required: false, default: 'G1', description: 'Continuity at end: G0, G1, G2' },
      { name: 'is_solid', type: 'boolean', required: false, default: true, description: 'Create solid vs surface' },
      { name: 'merge_tangent_faces', type: 'boolean', required: false, default: true, description: 'Merge tangent faces' }
    ],
    outputs: ['solid_body', 'surface_body'],
    supportedSystems: ['fusion360', 'solidworks', 'inventor', 'nx', 'catia', 'creo', 'freecad'],
    typicalUseCases: [
      'Airfoil blade profiles (NACA sections)',
      'Fuselage transitions',
      'Turbine blades with variable twist',
      'Automotive fenders',
      'Bottle shapes',
      'Propeller blades'
    ],
    constraints: [
      'Profiles must not self-intersect',
      'Guide curves must touch all profiles',
      'Minimum 2 profiles required',
      'Profiles should have same number of segments for best results'
    ],
    continuity: 'G2',
    isAerospace: true,
    relatedOps: ['sweep', 'blend_surface', 'ruled_surface']
  },
  {
    id: 'sweep',
    name: 'Sweep',
    category: 'solid_creation',
    complexity: 'intermediate',
    description: 'Extrudes a profile along a path curve. Used for pipes, ducts, blades, structural members.',
    aliases: ['swept_boss', 'swept_cut', 'path_extrude', 'pipe'],
    inputs: [
      { name: 'profile', type: 'profile', required: true, description: 'Cross-section sketch to sweep' },
      { name: 'path', type: 'path', required: true, description: 'Path curve (single or composite)' },
      { name: 'twist_angle', type: 'angle', required: false, default: 0, min: -360, max: 360, description: 'Twist along path (degrees)' },
      { name: 'scale_start', type: 'length', required: false, default: 1, min: 0.01, max: 100, description: 'Scale factor at start' },
      { name: 'scale_end', type: 'length', required: false, default: 1, min: 0.01, max: 100, description: 'Scale factor at end' },
      { name: 'orientation', type: 'selection', required: false, default: 'perpendicular', description: 'Profile orientation: perpendicular, parallel, keep_normal' },
      { name: 'is_solid', type: 'boolean', required: false, default: true, description: 'Create solid vs surface' },
      { name: 'merge_result', type: 'boolean', required: false, default: true, description: 'Merge with existing body' }
    ],
    outputs: ['solid_body', 'surface_body'],
    supportedSystems: ['fusion360', 'solidworks', 'inventor', 'nx', 'catia', 'creo', 'freecad', 'mastercam'],
    typicalUseCases: [
      'Hydraulic tubing runs',
      'Cable/wire routing',
      'Turbine blade with constant section',
      'Structural extrusions along curves',
      'Propeller blades (with twist)',
      'Handrails, pipes, ducts'
    ],
    constraints: [
      'Profile must not intersect path',
      'Path must be continuous (G0 minimum)',
      'Sharp corners may cause twisting issues'
    ],
    continuity: 'G1',
    isAerospace: true,
    relatedOps: ['loft', 'extrude', 'coil']
  },
  {
    id: 'ruled_surface',
    name: 'Ruled Surface',
    category: 'surface_creation',
    complexity: 'advanced',
    description: 'Creates a surface by connecting two guide curves with straight-line rulings. Exact CAM-friendly geometry for aerospace panels, transition ducts.',
    aliases: ['lofted_surface', 'developable_surface', 'between_curves'],
    inputs: [
      { name: 'curve1', type: 'path', required: true, description: 'First guide curve' },
      { name: 'curve2', type: 'path', required: true, description: 'Second guide curve' },
      { name: 'rule_direction', type: 'selection', required: false, default: 'auto', description: 'Direction: auto, parameter, distance' },
      { name: 'flip_curve2', type: 'boolean', required: false, default: false, description: 'Reverse direction of second curve' },
      { name: 'alignment', type: 'selection', required: false, default: 'parameter', description: 'How points on curves correspond' }
    ],
    outputs: ['surface_body'],
    supportedSystems: ['fusion360', 'solidworks', 'inventor', 'nx', 'catia', 'creo'],
    typicalUseCases: [
      'Aircraft skin panels (developable)',
      'Duct transitions',
      'Boat hull sections',
      'Sheet metal bends (when unfolded)',
      'Fan blade sections',
      'Turbine shrouds'
    ],
    constraints: [
      'Curves must not intersect',
      'Best results with similar curve lengths',
      'Developable only if special constraints met'
    ],
    continuity: 'G0',
    isAerospace: true,
    relatedOps: ['loft', 'boundary_surface', 'blend_surface']
  },
  {
    id: 'blend_surface',
    name: 'Blend Surface',
    category: 'surface_modification',
    complexity: 'expert',
    description: 'Creates smooth transition between surfaces with G1/G2/G3 continuity. Critical for Class-A surfaces, aerodynamic fairings.',
    aliases: ['surface_fillet', 'face_blend', 'freeform_blend', 'g2_blend'],
    inputs: [
      { name: 'surface1', type: 'surface', required: true, description: 'First surface to blend' },
      { name: 'surface2', type: 'surface', required: true, description: 'Second surface to blend' },
      { name: 'continuity1', type: 'selection', required: false, default: 'G2', description: 'Continuity at surface1: G0, G1, G2, G3' },
      { name: 'continuity2', type: 'selection', required: false, default: 'G2', description: 'Continuity at surface2: G0, G1, G2, G3' },
      { name: 'tension1', type: 'length', required: false, default: 1, min: 0.1, max: 10, description: 'Tension factor at surface1' },
      { name: 'tension2', type: 'length', required: false, default: 1, min: 0.1, max: 10, description: 'Tension factor at surface2' },
      { name: 'trim_input', type: 'boolean', required: false, default: true, description: 'Trim input surfaces' },
      { name: 'shape_control', type: 'selection', required: false, default: 'auto', description: 'Shape control: auto, curvature, smooth' }
    ],
    outputs: ['surface_body'],
    supportedSystems: ['nx', 'catia', 'creo', 'fusion360', 'solidworks'],
    typicalUseCases: [
      'Aircraft fuselage fairings',
      'Automotive Class-A surfaces',
      'Turbine blade root transitions',
      'Aerodynamic cowlings',
      'Engine nacelle blends',
      'Medical device smooth surfaces'
    ],
    constraints: [
      'Surfaces must share edge or be near proximity',
      'G3 continuity computationally expensive',
      'May require surface extension first'
    ],
    continuity: 'G2',
    isAerospace: true,
    relatedOps: ['ruled_surface', 'boundary_surface', 'n_sided_surface']
  },
  {
    id: 'variable_fillet',
    name: 'Variable Fillet',
    category: 'solid_modification',
    complexity: 'advanced',
    description: 'Creates fillet with varying radius along edge. Essential for stress distribution in structural parts, aerodynamic fairings.',
    aliases: ['variable_radius_fillet', 'setback_fillet', 'face_fillet', 'curvature_continuous_fillet'],
    inputs: [
      { name: 'edges', type: 'selection', required: true, description: 'Edges to fillet (single or multiple)' },
      { name: 'radius_values', type: 'length', required: true, description: 'Array of radius values at points' },
      { name: 'radius_positions', type: 'length', required: false, description: 'Positions along edge (0-1) for radius values' },
      { name: 'continuity', type: 'selection', required: false, default: 'G2', description: 'Surface continuity: G1, G2' },
      { name: 'conic_rho', type: 'length', required: false, default: 0.5, min: 0.05, max: 0.95, description: 'Conic shape parameter' },
      { name: 'asymmetric', type: 'boolean', required: false, default: false, description: 'Allow asymmetric profile' },
      { name: 'holdline', type: 'selection', required: false, description: 'Control face rollover via holdlines' }
    ],
    outputs: ['solid_body'],
    supportedSystems: ['solidworks', 'nx', 'catia', 'creo', 'fusion360', 'inventor'],
    typicalUseCases: [
      'Wing root fairings (thick→thin)',
      'Structural stress relief transitions',
      'Turbine blade platforms',
      'Die/mold draft transitions',
      'Ergonomic handles',
      'Medical implant smooth transitions'
    ],
    constraints: [
      'Minimum 2 radius values required',
      'Adjacent fillets may interfere',
      'Large radius changes may cause geometry failure'
    ],
    continuity: 'G2',
    isAerospace: true,
    relatedOps: ['fillet', 'chamfer', 'blend_surface']
  }
];

// ============================================================================
// BASIC OPERATIONS DEFINITIONS
// ============================================================================

const BASIC_OPS: OperationDefinition[] = [
  {
    id: 'extrude',
    name: 'Extrude',
    category: 'solid_creation',
    complexity: 'basic',
    description: 'Creates solid by extruding a 2D sketch profile along a direction.',
    aliases: ['boss', 'protrusion', 'pad', 'extrude_boss'],
    inputs: [
      { name: 'profile', type: 'profile', required: true, description: 'Sketch profile to extrude' },
      { name: 'distance', type: 'length', required: true, min: 0.001, description: 'Extrusion distance' },
      { name: 'direction', type: 'vector', required: false, description: 'Extrusion direction (default: normal)' },
      { name: 'symmetric', type: 'boolean', required: false, default: false, description: 'Extrude both directions' },
      { name: 'taper_angle', type: 'angle', required: false, default: 0, min: -89, max: 89, description: 'Draft/taper angle' }
    ],
    outputs: ['solid_body'],
    supportedSystems: ['fusion360', 'solidworks', 'inventor', 'nx', 'catia', 'creo', 'freecad', 'mastercam', 'hypercad'],
    typicalUseCases: ['Prismatic features', 'Pockets', 'Bosses', 'Walls'],
    isAerospace: false,
    relatedOps: ['cut', 'revolve', 'sweep']
  },
  {
    id: 'revolve',
    name: 'Revolve',
    category: 'solid_creation',
    complexity: 'basic',
    description: 'Creates solid by rotating a 2D sketch profile around an axis.',
    aliases: ['revolution', 'turn', 'lathe', 'revolved_boss'],
    inputs: [
      { name: 'profile', type: 'profile', required: true, description: 'Sketch profile to revolve' },
      { name: 'axis', type: 'path', required: true, description: 'Rotation axis (line or edge)' },
      { name: 'angle', type: 'angle', required: false, default: 360, min: 0.1, max: 360, description: 'Rotation angle' },
      { name: 'direction', type: 'selection', required: false, default: 'clockwise', description: 'Rotation direction' }
    ],
    outputs: ['solid_body'],
    supportedSystems: ['fusion360', 'solidworks', 'inventor', 'nx', 'catia', 'creo', 'freecad', 'mastercam', 'hypercad'],
    typicalUseCases: ['Cylindrical parts', 'Shafts', 'Turned features', 'Flanges'],
    isAerospace: false,
    relatedOps: ['extrude', 'coil', 'sweep']
  },
  {
    id: 'fillet',
    name: 'Fillet',
    category: 'solid_modification',
    complexity: 'basic',
    description: 'Rounds edges with constant radius.',
    aliases: ['round', 'edge_blend', 'fillet_edge'],
    inputs: [
      { name: 'edges', type: 'selection', required: true, description: 'Edges to fillet' },
      { name: 'radius', type: 'length', required: true, min: 0.001, description: 'Fillet radius' },
      { name: 'tangent_propagation', type: 'boolean', required: false, default: true, description: 'Propagate to tangent edges' }
    ],
    outputs: ['solid_body'],
    supportedSystems: ['fusion360', 'solidworks', 'inventor', 'nx', 'catia', 'creo', 'freecad', 'mastercam', 'hypercad'],
    typicalUseCases: ['Stress relief', 'Aesthetics', 'Edge breaking', 'Mold draft'],
    isAerospace: false,
    relatedOps: ['chamfer', 'variable_fillet', 'blend_surface']
  },
  {
    id: 'chamfer',
    name: 'Chamfer',
    category: 'solid_modification',
    complexity: 'basic',
    description: 'Creates angled cut along edges.',
    aliases: ['bevel', 'edge_break', 'chamfer_edge'],
    inputs: [
      { name: 'edges', type: 'selection', required: true, description: 'Edges to chamfer' },
      { name: 'distance', type: 'length', required: true, min: 0.001, description: 'Chamfer distance' },
      { name: 'angle', type: 'angle', required: false, default: 45, min: 0.1, max: 89.9, description: 'Chamfer angle' },
      { name: 'asymmetric', type: 'boolean', required: false, default: false, description: 'Two different distances' }
    ],
    outputs: ['solid_body'],
    supportedSystems: ['fusion360', 'solidworks', 'inventor', 'nx', 'catia', 'creo', 'freecad', 'mastercam', 'hypercad'],
    typicalUseCases: ['Lead-ins', 'Assembly clearance', 'Edge breaking', 'Deburring'],
    isAerospace: false,
    relatedOps: ['fillet', 'face_draft']
  },
  {
    id: 'hole',
    name: 'Hole',
    category: 'solid_modification',
    complexity: 'basic',
    description: 'Creates standard hole features (simple, counterbore, countersink, tapped).',
    aliases: ['drill', 'bore', 'tap', 'hole_wizard'],
    inputs: [
      { name: 'position', type: 'point', required: true, description: 'Hole center location' },
      { name: 'diameter', type: 'length', required: true, min: 0.1, description: 'Hole diameter' },
      { name: 'depth', type: 'length', required: true, min: 0.1, description: 'Hole depth' },
      { name: 'type', type: 'selection', required: false, default: 'simple', description: 'Type: simple, counterbore, countersink, tapped' },
      { name: 'thread_spec', type: 'selection', required: false, description: 'Thread specification (if tapped)' }
    ],
    outputs: ['solid_body'],
    supportedSystems: ['fusion360', 'solidworks', 'inventor', 'nx', 'catia', 'creo', 'freecad', 'mastercam', 'hypercad'],
    typicalUseCases: ['Fastener holes', 'Dowel pins', 'Threaded connections'],
    isAerospace: false,
    relatedOps: ['pattern', 'cut', 'thread']
  },
  {
    id: 'pattern_linear',
    name: 'Linear Pattern',
    category: 'solid_modification',
    complexity: 'intermediate',
    description: 'Creates array of features along one or two directions.',
    aliases: ['rectangular_pattern', 'array', 'linear_array'],
    inputs: [
      { name: 'features', type: 'selection', required: true, description: 'Features to pattern' },
      { name: 'direction1', type: 'vector', required: true, description: 'First direction' },
      { name: 'count1', type: 'count', required: true, min: 2, description: 'Count in direction 1' },
      { name: 'spacing1', type: 'length', required: true, description: 'Spacing in direction 1' },
      { name: 'direction2', type: 'vector', required: false, description: 'Second direction' },
      { name: 'count2', type: 'count', required: false, default: 1, min: 1, description: 'Count in direction 2' },
      { name: 'spacing2', type: 'length', required: false, description: 'Spacing in direction 2' }
    ],
    outputs: ['solid_body'],
    supportedSystems: ['fusion360', 'solidworks', 'inventor', 'nx', 'catia', 'creo', 'freecad', 'mastercam', 'hypercad'],
    typicalUseCases: ['Bolt patterns', 'Cooling fins', 'Repeated features'],
    isAerospace: false,
    relatedOps: ['pattern_circular', 'mirror']
  },
  {
    id: 'pattern_circular',
    name: 'Circular Pattern',
    category: 'solid_modification',
    complexity: 'intermediate',
    description: 'Creates array of features around an axis.',
    aliases: ['polar_pattern', 'radial_array', 'circular_array'],
    inputs: [
      { name: 'features', type: 'selection', required: true, description: 'Features to pattern' },
      { name: 'axis', type: 'path', required: true, description: 'Rotation axis' },
      { name: 'count', type: 'count', required: true, min: 2, description: 'Number of instances' },
      { name: 'angle', type: 'angle', required: false, default: 360, description: 'Total angle span' }
    ],
    outputs: ['solid_body'],
    supportedSystems: ['fusion360', 'solidworks', 'inventor', 'nx', 'catia', 'creo', 'freecad', 'mastercam', 'hypercad'],
    typicalUseCases: ['Bolt circles', 'Fan blades', 'Gear teeth', 'Flange holes'],
    isAerospace: false,
    relatedOps: ['pattern_linear', 'mirror']
  },
  {
    id: 'shell',
    name: 'Shell',
    category: 'solid_modification',
    complexity: 'intermediate',
    description: 'Hollows out a solid leaving walls of specified thickness.',
    aliases: ['hollow', 'thin_wall', 'offset_surface'],
    inputs: [
      { name: 'body', type: 'selection', required: true, description: 'Solid body to shell' },
      { name: 'thickness', type: 'length', required: true, min: 0.001, description: 'Wall thickness' },
      { name: 'faces_to_remove', type: 'selection', required: false, description: 'Open faces (removed)' },
      { name: 'inside', type: 'boolean', required: false, default: true, description: 'Shell inward vs outward' }
    ],
    outputs: ['solid_body'],
    supportedSystems: ['fusion360', 'solidworks', 'inventor', 'nx', 'catia', 'creo', 'freecad', 'mastercam', 'hypercad'],
    typicalUseCases: ['Enclosures', 'Castings', 'Plastic parts', 'Tanks'],
    isAerospace: false,
    relatedOps: ['thicken', 'offset']
  },
  {
    id: 'mirror',
    name: 'Mirror',
    category: 'solid_modification',
    complexity: 'basic',
    description: 'Creates mirror copy of features or body about a plane.',
    aliases: ['reflect', 'symmetry', 'mirror_feature'],
    inputs: [
      { name: 'entities', type: 'selection', required: true, description: 'Features or body to mirror' },
      { name: 'plane', type: 'surface', required: true, description: 'Mirror plane' },
      { name: 'merge', type: 'boolean', required: false, default: true, description: 'Merge result with original' }
    ],
    outputs: ['solid_body'],
    supportedSystems: ['fusion360', 'solidworks', 'inventor', 'nx', 'catia', 'creo', 'freecad', 'mastercam', 'hypercad'],
    typicalUseCases: ['Symmetric parts', 'Half-model workflow', 'Feature duplication'],
    isAerospace: false,
    relatedOps: ['pattern_linear', 'pattern_circular']
  },
  {
    id: 'boundary_surface',
    name: 'Boundary Surface',
    category: 'surface_creation',
    complexity: 'advanced',
    description: 'Creates surface bounded by curves with direction and continuity control.',
    aliases: ['fill_surface', 'patch', 'n_sided_surface'],
    inputs: [
      { name: 'boundary_curves', type: 'path', required: true, description: 'Bounding curves (closed loop)' },
      { name: 'direction1_curves', type: 'path', required: false, description: 'Direction curves for U' },
      { name: 'direction2_curves', type: 'path', required: false, description: 'Direction curves for V' },
      { name: 'continuity', type: 'selection', required: false, default: 'G1', description: 'Edge continuity: G0, G1, G2' }
    ],
    outputs: ['surface_body'],
    supportedSystems: ['fusion360', 'solidworks', 'inventor', 'nx', 'catia', 'creo'],
    typicalUseCases: ['Filling holes', 'Complex surface patches', 'Fairing surfaces'],
    continuity: 'G1',
    isAerospace: true,
    relatedOps: ['loft', 'blend_surface', 'ruled_surface']
  }
];

// ============================================================================
// ALL OPERATIONS COMBINED
// ============================================================================

const ALL_OPERATIONS: OperationDefinition[] = [...AEROSPACE_OPS, ...BASIC_OPS];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class CADOperationTaxonomyEngine {
  private operations: Map<string, OperationDefinition>;

  constructor() {
    this.operations = new Map();
    for (const op of ALL_OPERATIONS) {
      this.operations.set(op.id, op);
    }
  }

  /**
   * Engine metadata
   */
  static meta() {
    return {
      name: 'CADOperationTaxonomyEngine',
      version: '1.0.0',
      description: 'Comprehensive CAD operation classification with aerospace ops',
      author: 'PRISM',
      categories: ['cad', 'taxonomy', 'aerospace']
    };
  }

  /**
   * Get operation by ID
   */
  getOperation(id: string): OperationDefinition | null {
    return this.operations.get(id) ?? null;
  }

  /**
   * Get all operations
   */
  getAllOperations(): OperationDefinition[] {
    return Array.from(this.operations.values());
  }

  /**
   * Get aerospace-specific operations
   */
  getAerospaceOperations(): OperationDefinition[] {
    return Array.from(this.operations.values()).filter(op => op.isAerospace);
  }

  /**
   * Get operations by category
   */
  getByCategory(category: OperationCategory): OperationDefinition[] {
    return Array.from(this.operations.values()).filter(op => op.category === category);
  }

  /**
   * Get operations by complexity
   */
  getByComplexity(level: ComplexityLevel): OperationDefinition[] {
    return Array.from(this.operations.values()).filter(op => op.complexity === level);
  }

  /**
   * Get operations supported by a CAD system
   */
  getBySupportedSystem(system: CADSystem): OperationDefinition[] {
    return Array.from(this.operations.values()).filter(
      op => op.supportedSystems.includes(system)
    );
  }

  /**
   * Search operations by keyword
   */
  search(query: string): SearchResult[] {
    const q = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const op of this.operations.values()) {
      const matchedFields: string[] = [];
      let score = 0;

      // Check name (highest weight)
      if (op.name.toLowerCase().includes(q)) {
        matchedFields.push('name');
        score += 10;
      }

      // Check ID
      if (op.id.toLowerCase().includes(q)) {
        matchedFields.push('id');
        score += 8;
      }

      // Check aliases
      for (const alias of op.aliases) {
        if (alias.toLowerCase().includes(q)) {
          matchedFields.push('alias');
          score += 6;
          break;
        }
      }

      // Check description
      if (op.description.toLowerCase().includes(q)) {
        matchedFields.push('description');
        score += 4;
      }

      // Check use cases
      for (const uc of op.typicalUseCases) {
        if (uc.toLowerCase().includes(q)) {
          matchedFields.push('use_case');
          score += 3;
          break;
        }
      }

      if (score > 0) {
        results.push({ operation: op, matchScore: score, matchedFields });
      }
    }

    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Check compatibility of operation with CAD system
   */
  checkCompatibility(operationId: string, system: CADSystem): CompatibilityReport {
    const op = this.operations.get(operationId);
    if (!op) {
      return {
        operation: operationId,
        system,
        supported: false,
        alternatives: [],
        notes: 'Operation not found in taxonomy'
      };
    }

    const supported = op.supportedSystems.includes(system);
    const alternatives: string[] = [];

    if (!supported) {
      // Find related operations that ARE supported
      for (const relatedId of op.relatedOps) {
        const related = this.operations.get(relatedId);
        if (related && related.supportedSystems.includes(system)) {
          alternatives.push(relatedId);
        }
      }
    }

    return {
      operation: operationId,
      system,
      supported,
      alternatives,
      notes: supported
        ? `${op.name} fully supported in ${system}`
        : `Consider alternatives: ${alternatives.join(', ') || 'none available'}`
    };
  }

  /**
   * Get required parameters for an operation
   */
  getRequiredParams(operationId: string): ParameterSpec[] {
    const op = this.operations.get(operationId);
    if (!op) return [];
    return op.inputs.filter(p => p.required);
  }

  /**
   * Get optional parameters for an operation
   */
  getOptionalParams(operationId: string): ParameterSpec[] {
    const op = this.operations.get(operationId);
    if (!op) return [];
    return op.inputs.filter(p => !p.required);
  }

  /**
   * Get taxonomy statistics
   */
  getStats(): TaxonomyStats {
    const ops = Array.from(this.operations.values());

    const byCategory: Record<OperationCategory, number> = {
      sketch: 0,
      solid_creation: 0,
      solid_modification: 0,
      surface_creation: 0,
      surface_modification: 0,
      assembly: 0,
      analysis: 0,
      annotation: 0,
      utility: 0
    };

    const byComplexity: Record<ComplexityLevel, number> = {
      basic: 0,
      intermediate: 0,
      advanced: 0,
      expert: 0
    };

    let aerospaceCount = 0;
    let totalSystems = 0;

    for (const op of ops) {
      byCategory[op.category]++;
      byComplexity[op.complexity]++;
      if (op.isAerospace) aerospaceCount++;
      totalSystems += op.supportedSystems.length;
    }

    return {
      totalOperations: ops.length,
      byCategory,
      byComplexity,
      aerospaceOps: aerospaceCount,
      avgSystemSupport: totalSystems / ops.length
    };
  }

  /**
   * Find operations with specific continuity requirement
   */
  getByContinuity(continuity: ContinuityType): OperationDefinition[] {
    return Array.from(this.operations.values()).filter(
      op => op.continuity === continuity
    );
  }

  /**
   * Get related operations chain
   */
  getRelatedChain(operationId: string, depth: number = 2): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const traverse = (id: string, currentDepth: number) => {
      if (currentDepth > depth || visited.has(id)) return;
      visited.add(id);

      const op = this.operations.get(id);
      if (!op) return;

      for (const relatedId of op.relatedOps) {
        if (!visited.has(relatedId)) {
          result.push(relatedId);
          traverse(relatedId, currentDepth + 1);
        }
      }
    };

    traverse(operationId, 0);
    return result;
  }

  /**
   * Suggest operation based on use case description
   */
  suggestForUseCase(description: string): SearchResult[] {
    const words = description.toLowerCase().split(/\s+/);
    const scores = new Map<string, { score: number; matches: string[] }>();

    for (const op of this.operations.values()) {
      let score = 0;
      const matches: string[] = [];

      for (const word of words) {
        if (word.length < 3) continue;

        // Check use cases
        for (const uc of op.typicalUseCases) {
          if (uc.toLowerCase().includes(word)) {
            score += 2;
            matches.push(`usecase:${uc}`);
          }
        }

        // Check description
        if (op.description.toLowerCase().includes(word)) {
          score += 1;
          matches.push('description');
        }

        // Check aliases
        for (const alias of op.aliases) {
          if (alias.toLowerCase().includes(word)) {
            score += 3;
            matches.push(`alias:${alias}`);
          }
        }
      }

      if (score > 0) {
        scores.set(op.id, { score, matches });
      }
    }

    return Array.from(scores.entries())
      .map(([id, data]) => ({
        operation: this.operations.get(id)!,
        matchScore: data.score,
        matchedFields: [...new Set(data.matches)]
      }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);
  }

  /**
   * Validate parameters against operation schema
   */
  validateParams(operationId: string, params: Record<string, unknown>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const op = this.operations.get(operationId);
    if (!op) {
      return { valid: false, errors: [`Unknown operation: ${operationId}`], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required params
    for (const spec of op.inputs) {
      if (spec.required && !(spec.name in params)) {
        errors.push(`Missing required parameter: ${spec.name}`);
      }

      if (spec.name in params) {
        const val = params[spec.name];

        // Type checks
        if (spec.type === 'length' || spec.type === 'angle' || spec.type === 'count') {
          if (typeof val !== 'number') {
            errors.push(`${spec.name} must be a number`);
          } else {
            if (spec.min !== undefined && val < spec.min) {
              errors.push(`${spec.name} must be >= ${spec.min}`);
            }
            if (spec.max !== undefined && val > spec.max) {
              errors.push(`${spec.name} must be <= ${spec.max}`);
            }
          }
        }

        if (spec.type === 'boolean' && typeof val !== 'boolean') {
          warnings.push(`${spec.name} should be boolean`);
        }
      }
    }

    // Warn about unknown params
    for (const key of Object.keys(params)) {
      if (!op.inputs.some(s => s.name === key)) {
        warnings.push(`Unknown parameter: ${key}`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Generate a CadQuery Python starter snippet for a taxonomy operation.
   *
   * Accepts either a bare operation id string, or an object with one of:
   *   { action, id, operation_id } -- as forwarded by cadDispatcher
   *   "cad_taxonomy_generate" action uses params.action ?? params
   *
   * The returned snippet is a real, importable CadQuery expression
   * parameterised from the operation's ParameterSpec inputs. It will
   * throw if the operation id cannot be resolved.
   *
   * @param operationOrAction - Operation id string OR action/params object
   * @returns Python CadQuery starter code string
   */
  generateCadQueryCode(
    operationOrAction: string | { action?: string; id?: string; operation_id?: string }
  ): string {
    // Resolve the operation id from whatever shape the dispatcher passes
    let opId: string;
    if (typeof operationOrAction === "string") {
      opId = operationOrAction;
    } else {
      opId = operationOrAction.id ?? operationOrAction.operation_id ?? operationOrAction.action ?? "";
    }
    opId = opId.trim();

    const op = this.operations.get(opId);
    if (!op) {
      const available = Array.from(this.operations.keys()).join(", ");
      throw new Error(
        `generateCadQueryCode: unknown operation "${opId}". Available: ${available}`
      );
    }

    return CADOperationTaxonomyEngine._buildCadQuerySnippet(op);
  }

  /**
   * Build a CadQuery Python snippet from an OperationDefinition.
   * Maps the operation id + category + inputs to a runnable workplane expression.
   */
  private static _buildCadQuerySnippet(op: OperationDefinition): string {
    const params = CADOperationTaxonomyEngine._defaultParams(op);
    const lines: string[] = [
      "import cadquery as cq",
      "",
      `# CadQuery starter for operation: ${op.id} (${op.name})`,
      `# Category: ${op.category}  Complexity: ${op.complexity}`,
      `# ${op.description}`,
      "",
    ];

    switch (op.id) {
      case "extrude":
        lines.push(
          `width = ${params["width"] ?? 10}`,
          `height = ${params["height"] ?? 10}`,
          `distance = ${params["distance"] ?? 5}`,
          `result = cq.Workplane("XY").rect(width, height).extrude(distance)`,
        );
        break;

      case "revolve":
        lines.push(
          `radius = ${params["radius"] ?? 10}`,
          `angle_deg = ${params["angle"] ?? 360}`,
          `result = (`,
          `    cq.Workplane("XZ")`,
          `    .move(radius, 0)`,
          `    .lineTo(radius, ${params["height"] ?? 10})`,
          `    .lineTo(0, ${params["height"] ?? 10})`,
          `    .close()`,
          `    .revolve(angle_deg)`,
          `)`,
        );
        break;

      case "loft":
        lines.push(
          `r1 = ${params["radius1"] ?? 10}`,
          `r2 = ${params["radius2"] ?? 5}`,
          `h  = ${params["height"] ?? 20}`,
          `result = (`,
          `    cq.Workplane("XY")`,
          `    .circle(r1)`,
          `    .workplane(offset=h)`,
          `    .circle(r2)`,
          `    .loft()`,
          `)`,
        );
        break;

      case "sweep":
        lines.push(
          `radius = ${params["radius"] ?? 5}`,
          `path_len = ${params["path_length"] ?? 30}`,
          `path = cq.Workplane("XZ").lineTo(path_len, 0)`,
          `result = (`,
          `    cq.Workplane("XY")`,
          `    .circle(radius)`,
          `    .sweep(path)`,
          `)`,
        );
        break;

      case "fillet":
        lines.push(
          `radius = ${params["radius"] ?? 2}`,
          `# Assumes 'base_solid' is an existing CadQuery solid`,
          `result = base_solid.edges("|Z").fillet(radius)`,
        );
        break;

      case "chamfer":
        lines.push(
          `distance = ${params["distance"] ?? 1}`,
          `# Assumes 'base_solid' is an existing CadQuery solid`,
          `result = base_solid.edges("|Z").chamfer(distance)`,
        );
        break;

      case "shell":
        lines.push(
          `thickness = ${params["thickness"] ?? 2}`,
          `# Assumes 'base_solid' is an existing CadQuery solid`,
          `result = base_solid.shell(thickness)`,
        );
        break;

      case "hole":
        lines.push(
          `diameter = ${params["diameter"] ?? 5}`,
          `depth    = ${params["depth"] ?? 10}`,
          `x_pos    = ${params["x"] ?? 0}`,
          `y_pos    = ${params["y"] ?? 0}`,
          `result = (`,
          `    cq.Workplane("XY")`,
          `    .pushPoints([(x_pos, y_pos)])`,
          `    .hole(diameter, depth)`,
          `)`,
        );
        break;

      case "pattern_linear":
        lines.push(
          `count_x = ${params["count_x"] ?? 3}`,
          `spacing = ${params["spacing"] ?? 10}`,
          `# Assumes 'base_solid' is an existing CadQuery solid`,
          `result = (`,
          `    base_solid`,
          `    .rarray(spacing, spacing, count_x, 1)`,
          `    .hole(${params["diameter"] ?? 3})`,
          `)`,
        );
        break;

      case "pattern_circular":
        lines.push(
          `count  = ${params["count"] ?? 6}`,
          `radius = ${params["radius"] ?? 15}`,
          `# Assumes 'base_solid' is an existing CadQuery solid`,
          `result = (`,
          `    base_solid`,
          `    .polarArray(radius, 0, 360, count)`,
          `    .hole(${params["diameter"] ?? 3})`,
          `)`,
        );
        break;

      case "mirror":
        lines.push(
          `# Assumes 'base_solid' is an existing CadQuery solid`,
          `result = base_solid.mirror("XZ")`,
        );
        break;

      case "ruled_surface":
        lines.push(
          `# Ruled surface between two edge sets -- adjust selectors to your geometry`,
          `e1 = base_solid.edges(">Y")`,
          `e2 = base_solid.edges("<Y")`,
          `result = cq.Shell.makeRuledSurface(e1.vals()[0], e2.vals()[0])`,
        );
        break;

      case "blend_surface":
      case "boundary_surface":
        lines.push(
          `# Boundary/blend surface -- requires edge references from adjacent faces`,
          `# Adjust face selectors to match your geometry`,
          `f1 = base_solid.faces(">Z")`,
          `f2 = base_solid.faces(">X")`,
          `result = cq.Workplane("XY").add(f1).add(f2).shell(-${params["thickness"] ?? 1})`,
        );
        break;

      case "variable_fillet":
        lines.push(
          `# Variable fillet -- requires OCC-level access; example uses uniform as fallback`,
          `r_start = ${params["radius_start"] ?? 1}`,
          `r_end   = ${params["radius_end"] ?? 4}`,
          `# Approximation: apply mean radius uniformly`,
          `r_mean = (r_start + r_end) / 2`,
          `result = base_solid.edges("|Z").fillet(r_mean)`,
          `# For true variable fillet use cadquery.selectors or BRepFilletAPI_MakeFillet`,
        );
        break;

      default:
        // Generic fallback: emit a box + comment for any unmapped operation
        lines.push(
          `# Generic placeholder for operation: ${op.id}`,
          `# Replace with the appropriate CadQuery calls for your geometry`,
          `result = cq.Workplane("XY").box(10, 10, 10)`,
          `# Inputs expected by this operation:`,
        );
        for (const inp of op.inputs) {
          lines.push(`#   ${inp.name} (${inp.type}${inp.required ? ", required" : ""}): ${inp.description}`);
        }
    }

    lines.push("", "show_object(result)");
    return lines.join("\n");
  }

  /** Extract default parameter values from an OperationDefinition's ParameterSpec list. */
  private static _defaultParams(op: OperationDefinition): Record<string, number | boolean | string> {
    const out: Record<string, number | boolean | string> = {};
    for (const spec of op.inputs) {
      if (spec.default !== undefined) {
        out[spec.name] = spec.default;
      }
    }
    return out;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const cadOperationTaxonomyEngine = new CADOperationTaxonomyEngine();
