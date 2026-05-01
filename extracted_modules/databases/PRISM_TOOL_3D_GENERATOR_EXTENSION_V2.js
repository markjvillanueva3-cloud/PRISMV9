const PRISM_TOOL_3D_GENERATOR_EXTENSION_V2 = {
  version: '1.0.0',

  /**
   * Generate variable helix endmill
   * Variable helix reduces harmonics and chatter
   */
  generateVariableHelixEndmill(params) {
    const {
      diameter = 12,
      fluteCount = 4,
      loc = diameter * 2,
      oal = diameter * 4,
      helixAngles = [35, 38, 35, 38],  // Alternating helix angles
      cornerRadius = 0,
      coating = 'TiAlN'
    } = params;

    const geometry = { type: 'variable_helix_endmill', faces: [], edges: [] };
    const radius = diameter / 2;

    // Generate flutes with varying helix angles
    for (let f = 0; f < fluteCount; f++) {
      const helixAngle = helixAngles[f % helixAngles.length];
      const helixRad = helixAngle * Math.PI / 180;
      const startAngle = (f / fluteCount) * 2 * Math.PI;

      // Calculate helix lead
      const lead = Math.PI * diameter / Math.tan(helixRad);

      // Generate flute geometry along helix
      const fluteDepth = radius * 0.4;
      const numSegments = Math.ceil(loc / 2);

      for (let seg = 0; seg < numSegments; seg++) {
        const z1 = -seg * (loc / numSegments);
        const z2 = -(seg + 1) * (loc / numSegments);
        const twist1 = startAngle + (z1 / lead) * 2 * Math.PI;
        const twist2 = startAngle + (z2 / lead) * 2 * Math.PI;

        geometry.faces.push({
          type: 'helical_flute_segment',
          flute: f,
          z: [z1, z2],
          angles: [twist1, twist2],
          depth: fluteDepth,
          radius: radius
        });
      }
    }
    // Add shank
    geometry.faces.push({
      type: 'cylinder',
      radius: radius,
      start: -loc,
      end: -(oal - loc),
      section: 'shank'
    });

    // Add corner radius if specified
    if (cornerRadius > 0) {
      geometry.cornerRadius = cornerRadius;
      geometry.faces.push({
        type: 'torus_section',
        majorRadius: radius - cornerRadius,
        minorRadius: cornerRadius,
        section: 'corner'
      });
    }
    geometry.coating = this._getCoatingColor(coating);
    geometry.metadata = {
      variableHelix: true,
      helixAngles,
      chatterReduction: 'High - variable helix breaks up harmonics'
    };
    return geometry;
  },
  /**
   * Generate serrated roughing endmill
   * Serrations break chips and reduce cutting forces
   */
  generateSerratedRougher(params) {
    const {
      diameter = 20,
      fluteCount = 4,
      loc = diameter * 1.5,
      oal = diameter * 3,
      serrationPitch = 2,      // Distance between serrations
      serrationDepth = 0.3,   // Depth of serration
      helixAngle = 30,
      coating = 'TiCN'
    } = params;

    const geometry = { type: 'serrated_rougher', faces: [], edges: [] };
    const radius = diameter / 2;

    // Number of serrations along LOC
    const numSerrations = Math.floor(loc / serrationPitch);

    // Generate serrated flutes
    for (let f = 0; f < fluteCount; f++) {
      const startAngle = (f / fluteCount) * 2 * Math.PI;

      for (let s = 0; s < numSerrations; s++) {
        const zBase = -s * serrationPitch;

        // Serration tooth profile (wave-like)
        geometry.faces.push({
          type: 'serration_tooth',
          flute: f,
          z: zBase,
          pitch: serrationPitch,
          depth: serrationDepth,
          radius: radius,
          angle: startAngle
        });
      }
    }
    // Shank
    geometry.faces.push({
      type: 'cylinder',
      radius: radius,
      start: -loc,
      end: -(oal - loc),
      section: 'shank'
    });

    geometry.coating = this._getCoatingColor(coating);
    geometry.metadata = {
      serrated: true,
      serrationPitch,
      serrationDepth,
      application: 'Heavy roughing - 50% more MRR than standard'
    };
    return geometry;
  },
  /**
   * Generate corncob/porcupine roughing endmill
   * Aggressive roughing with chip breaker rows
   */
  generateCorncobRougher(params) {
    const {
      diameter = 25,
      fluteCount = 6,
      loc = diameter * 1.5,
      oal = diameter * 3,
      chipBreakerRows = 8,
      chipBreakerDepth = 0.5,
      helixAngle = 25,
      coating = 'TiAlN'
    } = params;

    const geometry = { type: 'corncob_rougher', faces: [], edges: [] };
    const radius = diameter / 2;
    const rowSpacing = loc / chipBreakerRows;

    // Generate chip breaker pattern
    for (let f = 0; f < fluteCount; f++) {
      const startAngle = (f / fluteCount) * 2 * Math.PI;

      // Stagger chip breakers between flutes
      const offset = (f % 2) * (rowSpacing / 2);

      for (let r = 0; r < chipBreakerRows; r++) {
        const z = -r * rowSpacing - offset;

        geometry.faces.push({
          type: 'chip_breaker_row',
          flute: f,
          z: z,
          width: rowSpacing * 0.6,
          depth: chipBreakerDepth,
          radius: radius,
          angle: startAngle
        });
      }
    }
    // Shank
    geometry.faces.push({
      type: 'cylinder',
      radius: radius,
      start: -loc,
      end: -(oal - loc),
      section: 'shank'
    });

    geometry.coating = this._getCoatingColor(coating);
    geometry.metadata = {
      corncob: true,
      chipBreakerRows,
      application: 'Extreme roughing - titanium, inconel, large DOC'
    };
    return geometry;
  },
  /**
   * Generate chip splitter endmill
   * Serrations on cutting edge to break chips
   */
  generateChipSplitterEndmill(params) {
    const {
      diameter = 16,
      fluteCount = 4,
      loc = diameter * 2,
      oal = diameter * 3.5,
      splitterCount = 3,    // Number of splitter notches per flute
      splitterWidth = 1.5,  // Width of notch
      helixAngle = 35,
      coating = 'AlTiN'
    } = params;

    const geometry = { type: 'chip_splitter', faces: [], edges: [] };
    const radius = diameter / 2;
    const splitterSpacing = loc / (splitterCount + 1);

    // Generate flutes with splitter notches
    for (let f = 0; f < fluteCount; f++) {
      const startAngle = (f / fluteCount) * 2 * Math.PI;

      // Main flute
      geometry.faces.push({
        type: 'helical_flute',
        flute: f,
        radius: radius,
        loc: loc,
        helixAngle: helixAngle,
        angle: startAngle
      });

      // Splitter notches (staggered)
      for (let s = 0; s < splitterCount; s++) {
        const z = -(s + 1) * splitterSpacing + ((f * splitterSpacing) / fluteCount);

        geometry.faces.push({
          type: 'splitter_notch',
          flute: f,
          z: z,
          width: splitterWidth,
          depth: radius * 0.15,
          angle: startAngle
        });
      }
    }
    // Shank
    geometry.faces.push({
      type: 'cylinder',
      radius: radius,
      start: -loc,
      end: -(oal - loc)
    });

    geometry.coating = this._getCoatingColor(coating);
    geometry.metadata = {
      chipSplitter: true,
      splitterCount,
      application: 'Improved chip control in sticky materials'
    };
    return geometry;
  },
  /**
   * Generate high-feed endmill
   * Large radius design for high feed rates
   */
  generateHighFeedEndmill(params) {
    const {
      diameter = 20,
      fluteCount = 4,
      cornerRadius,        // Usually 75-80% of radius
      loc = diameter * 0.5,  // Short LOC typical
      oal = diameter * 3,
      coating = 'TiAlN'
    } = params;

    const geometry = { type: 'high_feed_endmill', faces: [], edges: [] };
    const radius = diameter / 2;
    const cr = cornerRadius || radius * 0.8;  // Large corner radius

    // Large radius bottom profile
    geometry.faces.push({
      type: 'spherical_bottom',
      radius: cr,
      centerOffset: radius - cr
    });

    // Short fluted section
    for (let f = 0; f < fluteCount; f++) {
      const startAngle = (f / fluteCount) * 2 * Math.PI;

      geometry.faces.push({
        type: 'helical_flute',
        flute: f,
        radius: radius,
        loc: loc,
        helixAngle: 40,  // High helix for chip evacuation
        angle: startAngle
      });
    }
    // Shank
    geometry.faces.push({
      type: 'cylinder',
      radius: radius,
      start: -loc,
      end: -(oal - loc)
    });

    geometry.coating = this._getCoatingColor(coating);
    geometry.metadata = {
      highFeed: true,
      cornerRadius: cr,
      maxDoc: diameter * 0.05,  // Very shallow DOC
      feedMultiplier: 3,  // Can run 3x normal feed
      application: 'High feed roughing - shallow DOC, extreme feed rates'
    };
    return geometry;
  },
  /**
   * Get coating color
   */
  _getCoatingColor(coating) {
    const colors = {
      'TiN': '#FFD700',
      'TiAlN': '#4B0082',
      'AlTiN': '#2E0854',
      'TiCN': '#708090',
      'AlCrN': '#696969',
      'DLC': '#1C1C1C',
      'nACo': '#9370DB',
      'ZrN': '#DAA520',
      'uncoated': '#C0C0C0'
    };
    return colors[coating] || colors['uncoated'];
  }
}