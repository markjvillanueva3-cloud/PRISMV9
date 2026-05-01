const PRISM_STEP_ENTITY_PARSER = {
  version: '1.0.0',
  courseBasis: 'MIT 6.006 - Data Structures & Graphs',

  // Entity type categories for proper handling
  entityCategories: {
    // Geometric entities
    geometry: [
      'CARTESIAN_POINT', 'DIRECTION', 'VECTOR', 'LINE', 'CIRCLE', 'ELLIPSE',
      'HYPERBOLA', 'PARABOLA', 'PCURVE', 'SURFACE_CURVE', 'COMPOSITE_CURVE',
      'TRIMMED_CURVE', 'B_SPLINE_CURVE', 'B_SPLINE_CURVE_WITH_KNOTS',
      'RATIONAL_B_SPLINE_CURVE', 'BEZIER_CURVE'
    ],

    // Surface entities
    surfaces: [
      'PLANE', 'CYLINDRICAL_SURFACE', 'CONICAL_SURFACE', 'SPHERICAL_SURFACE',
      'TOROIDAL_SURFACE', 'DEGENERATE_TOROIDAL_SURFACE', 'SURFACE_OF_REVOLUTION',
      'SURFACE_OF_LINEAR_EXTRUSION', 'B_SPLINE_SURFACE', 'B_SPLINE_SURFACE_WITH_KNOTS',
      'RATIONAL_B_SPLINE_SURFACE', 'BEZIER_SURFACE', 'RECTANGULAR_TRIMMED_SURFACE',
      'CURVE_BOUNDED_SURFACE', 'BOUNDED_SURFACE', 'OFFSET_SURFACE'
    ],

    // Topological entities
    topology: [
      'VERTEX_POINT', 'VERTEX_LOOP', 'EDGE_CURVE', 'ORIENTED_EDGE',
      'EDGE_LOOP', 'FACE_BOUND', 'FACE_OUTER_BOUND', 'ADVANCED_FACE',
      'FACE_SURFACE', 'CLOSED_SHELL', 'OPEN_SHELL', 'ORIENTED_CLOSED_SHELL',
      'CONNECTED_FACE_SET', 'MANIFOLD_SOLID_BREP', 'BREP_WITH_VOIDS',
      'FACETED_BREP', 'SHELL_BASED_SURFACE_MODEL', 'MANIFOLD_SURFACE_SHAPE_REPRESENTATION'
    ],

    // Placement entities
    placements: [
      'AXIS1_PLACEMENT', 'AXIS2_PLACEMENT_2D', 'AXIS2_PLACEMENT_3D',
      'CARTESIAN_TRANSFORMATION_OPERATOR', 'CARTESIAN_TRANSFORMATION_OPERATOR_3D'
    ],

    // Product entities
    product: [
      'PRODUCT', 'PRODUCT_DEFINITION', 'PRODUCT_DEFINITION_FORMATION',
      'PRODUCT_DEFINITION_SHAPE', 'SHAPE_DEFINITION_REPRESENTATION',
      'SHAPE_REPRESENTATION', 'ADVANCED_BREP_SHAPE_REPRESENTATION',
      'MANIFOLD_SURFACE_SHAPE_REPRESENTATION', 'GEOMETRICALLY_BOUNDED_SURFACE_SHAPE_REPRESENTATION'
    ]
  },
  /**
   * Parse complete STEP file into structured entity graph
   * Uses adjacency list representation (MIT 6.006)
   */
  parseComplete(stepText) {
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[STEP Parser] Starting complete parse...');
    const startTime = performance.now();

    const result = {
      header: this.parseHeader(stepText),
      entities: new Map(),        // id -> entity
      entityGraph: new Map(),     // id -> [referenced ids]
      reverseGraph: new Map(),    // id -> [entities that reference this]
      byType: new Map(),          // type -> [entities]
      rootEntities: [],           // Top-level shape representations
      statistics: {
        totalEntities: 0,
        byCategory: {}
      }
    };
    // Parse DATA section
    const dataMatch = stepText.match(/DATA;([\s\S]*?)ENDSEC;/i);
    if (!dataMatch) {
      throw new Error('Invalid STEP file: DATA section not found');
    }
    const dataSection = dataMatch[1];

    // Parse all entities with regex (handles multi-line entities)
    const entityPattern = /#(\d+)\s*=\s*([A-Z][A-Z0-9_]*)\s*\(([\s\S]*?)\)\s*;/g;
    let match;

    while ((match = entityPattern.exec(dataSection)) !== null) {
      const id = parseInt(match[1]);
      const type = match[2];
      const argsRaw = match[3];

      // Parse arguments recursively
      const args = this.parseArguments(argsRaw);

      // Extract references
      const refs = this.extractReferences(args);

      const entity = {
        id,
        type,
        args,
        refs,
        category: this.getCategory(type),
        processed: false
      };
      // Store in maps
      result.entities.set(id, entity);
      result.entityGraph.set(id, refs);

      // Build reverse graph
      refs.forEach(refId => {
        if (!result.reverseGraph.has(refId)) {
          result.reverseGraph.set(refId, []);
        }
        result.reverseGraph.get(refId).push(id);
      });

      // Group by type
      if (!result.byType.has(type)) {
        result.byType.set(type, []);
      }
      result.byType.get(type).push(entity);

      result.statistics.totalEntities++;
      result.statistics.byCategory[entity.category] =
        (result.statistics.byCategory[entity.category] || 0) + 1;
    }
    // Find root entities (shape representations)
    const shapeRepTypes = [
      'ADVANCED_BREP_SHAPE_REPRESENTATION',
      'MANIFOLD_SURFACE_SHAPE_REPRESENTATION',
      'SHAPE_REPRESENTATION',
      'GEOMETRICALLY_BOUNDED_SURFACE_SHAPE_REPRESENTATION'
    ];

    shapeRepTypes.forEach(type => {
      if (result.byType.has(type)) {
        result.rootEntities.push(...result.byType.get(type));
      }
    });

    const parseTime = performance.now() - startTime;
    console.log(`[STEP Parser] Parsed ${result.statistics.totalEntities} entities in ${parseTime.toFixed(1)}ms`);
    console.log('[STEP Parser] Categories:', result.statistics.byCategory);

    return result;
  },
  /**
   * Parse STEP file header
   */
  parseHeader(stepText) {
    const header = {
      schema: 'UNKNOWN',
      description: '',
      implementationLevel: '',
      fileName: '',
      timestamp: '',
      author: '',
      organization: '',
      preprocessor: '',
      originator: '',
      authorization: ''
    };
    // Schema
    const schemaMatch = stepText.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i);
    if (schemaMatch) {
      const schema = schemaMatch[1];
      if (schema.includes('AP203')) header.schema = 'AP203';
      else if (schema.includes('AP214')) header.schema = 'AP214';
      else if (schema.includes('AP242')) header.schema = 'AP242';
      else header.schema = schema;
    }
    // File description
    const descMatch = stepText.match(/FILE_DESCRIPTION\s*\(\s*\(\s*'([^']*)'/i);
    if (descMatch) header.description = descMatch[1];

    // File name
    const nameMatch = stepText.match(/FILE_NAME\s*\(\s*'([^']*)'\s*,\s*'([^']*)'/i);
    if (nameMatch) {
      header.fileName = nameMatch[1];
      header.timestamp = nameMatch[2];
    }
    return header;
  },
  /**
   * Parse STEP arguments recursively
   * Handles nested lists, strings, references, numbers, enums
   */
  parseArguments(argsStr) {
    const args = [];
    let current = '';
    let depth = 0;
    let inString = false;

    for (let i = 0; i < argsStr.length; i++) {
      const ch = argsStr[i];

      if (ch === "'" && argsStr[i - 1] !== '\\') {
        inString = !inString;
        current += ch;
      } else if (inString) {
        current += ch;
      } else if (ch === '(') {
        if (depth === 0 && current.trim()) {
          // Function-like value starting
          current += ch;
        } else {
          depth++;
          current += ch;
        }
      } else if (ch === ')') {
        depth--;
        current += ch;
        if (depth < 0) depth = 0;
      } else if (ch === ',' && depth === 0) {
        args.push(this.parseValue(current.trim()));
        current = '';
      } else if (!/\s/.test(ch) || depth > 0 || inString) {
        current += ch;
      }
    }
    if (current.trim()) {
      args.push(this.parseValue(current.trim()));
    }
    return args;
  },
  /**
   * Parse a single STEP value
   */
  parseValue(val) {
    if (!val || val === '') return null;
    if (val === '$') return null;  // Undefined
    if (val === '*') return '*';   // Derived
    if (val === '.T.') return true;
    if (val === '.F.') return false;
    if (val === '.U.') return undefined; // Unknown

    // Reference
    if (val.startsWith('#')) {
      return { ref: parseInt(val.slice(1)) };
    }
    // String
    if (val.startsWith("'") && val.endsWith("'")) {
      return val.slice(1, -1);
    }
    // Enum
    if (val.startsWith('.') && val.endsWith('.')) {
      return { enum: val.slice(1, -1) };
    }
    // List
    if (val.startsWith('(') && val.endsWith(')')) {
      return this.parseArguments(val.slice(1, -1));
    }
    // Number
    const num = parseFloat(val);
    if (!isNaN(num)) return num;

    // Type-qualified value (e.g., IFCREAL(1.0))
    const typeMatch = val.match(/^([A-Z_]+)\s*\((.*)\)$/);
    if (typeMatch) {
      return {
        type: typeMatch[1],
        value: this.parseValue(typeMatch[2])
      };
    }
    return val;
  },
  /**
   * Extract all entity references from parsed arguments
   */
  extractReferences(args, refs = []) {
    if (!args) return refs;

    if (Array.isArray(args)) {
      args.forEach(arg => this.extractReferences(arg, refs));
    } else if (typeof args === 'object') {
      if (args.ref !== undefined) {
        refs.push(args.ref);
      } else {
        Object.values(args).forEach(v => this.extractReferences(v, refs));
      }
    }
    return refs;
  },
  /**
   * Get category for entity type
   */
  getCategory(type) {
    for (const [cat, types] of Object.entries(this.entityCategories)) {
      if (types.includes(type)) return cat;
    }
    return 'other';
  }
}