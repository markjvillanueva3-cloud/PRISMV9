const PRISM_TOOL_HOLDER_3D_GENERATOR = {
  version: '1.0.0',

  /**
   * Initialize the 3D holder system
   */
  init() {
    console.log('[HOLDER_3D] Initializing Tool Holder 3D System...');
    console.log('[HOLDER_3D] Loaded', Object.keys(PRISM_TOOL_HOLDER_3D_DATABASE.holders).length, 'holder models');

    // Connect to existing systems
    this.connectToHolderDatabase();
    this.connectToCollisionSystem();
    this.connectToVisualization();

    window.PRISM_TOOL_HOLDER_3D_GENERATOR = this;
    window.generateHolder3D = this.generateHolder3D.bind(this);
    window.getHolderGeometry = this.getHolderGeometry.bind(this);

    return this;
  },
  // 3D GEOMETRY GENERATION

  /**
   * Generate 3D mesh for a tool holder
   * @param {string} holderId - ID of the holder
   * @param {Object} options - Generation options
   * @returns {Object} Three.js compatible geometry data
   */
  generateHolder3D(holderId, options = {}) {
    const holder = this.findHolder(holderId);
    if (!holder) {
      console.warn('[HOLDER_3D] Holder not found:', holderId);
      return this.generateGenericHolder(options);
    }
    const holderType = PRISM_TOOL_HOLDER_3D_DATABASE.holderTypes[holder.type];
    const taperSpec = PRISM_TOOL_HOLDER_3D_DATABASE.taperSpecs[holder.taper];

    if (!holderType) {
      return this.generateGenericHolder({ ...options, ...holder });
    }
    // Generate based on type
    switch (holder.type) {
      case 'collet_chuck':
        return this.generateColletChuck(holder, holderType, taperSpec, options);
      case 'shrink_fit':
        return this.generateShrinkFit(holder, holderType, taperSpec, options);
      case 'hydraulic_chuck':
        return this.generateHydraulicChuck(holder, holderType, taperSpec, options);
      case 'milling_chuck':
        return this.generateMillingChuck(holder, holderType, taperSpec, options);
      case 'shell_mill_arbor':
        return this.generateShellMillArbor(holder, holderType, taperSpec, options);
      case 'face_mill_arbor':
        return this.generateFaceMillArbor(holder, holderType, taperSpec, options);
      case 'boring_head':
        return this.generateBoringHead(holder, holderType, taperSpec, options);
      default:
        return this.generateGenericHolder({ ...options, ...holder });
    }
  },
  /**
   * Generate collet chuck geometry (revolved profile)
   */
  generateColletChuck(holder, holderType, taperSpec, options = {}) {
    const dims = holder.dimensions || {};
    const segments = options.segments || 32;

    // Build profile points for revolution
    const profile = [];
    let z = 0;

    // Taper section
    const taperLength = dims.overallLength * 0.35;
    const taperStartR = (taperSpec?.flangeOD || 44) / 2;
    const taperEndR = taperStartR * 0.6;
    profile.push({ z: z, r: 0, ri: 0 }); // Center axis start
    profile.push({ z: z, r: taperEndR, ri: 0 });
    z += taperLength;
    profile.push({ z: z, r: taperStartR, ri: 0 });

    // Flange
    const flangeLength = dims.overallLength * 0.10;
    const flangeR = taperSpec?.flangeOD / 2 || 22;
    profile.push({ z: z, r: flangeR, ri: 0 });
    z += flangeLength;
    profile.push({ z: z, r: flangeR, ri: 0 });

    // Body
    const bodyLength = dims.overallLength * 0.35;
    const bodyR = (dims.bodyOD || 40) / 2;
    profile.push({ z: z, r: bodyR, ri: 0 });
    z += bodyLength;
    profile.push({ z: z, r: bodyR, ri: 0 });

    // Nose
    const noseLength = dims.overallLength * 0.15;
    const noseR = (dims.noseOD || 35) / 2;
    profile.push({ z: z, r: noseR, ri: 0 });
    z += noseLength;
    profile.push({ z: z, r: noseR, ri: 0 });

    // Collet taper end
    const colletBore = this.getColletBore(holder.colletSize);
    profile.push({ z: z, r: colletBore / 2 + 2, ri: colletBore / 2 });
    profile.push({ z: dims.overallLength, r: colletBore / 2 + 2, ri: colletBore / 2 });

    return {
      type: 'lathe_geometry',
      profile: profile,
      segments: segments,
      holder: holder,
      boundingBox: {
        minX: -flangeR, maxX: flangeR,
        minY: -flangeR, maxY: flangeR,
        minZ: 0, maxZ: dims.overallLength
      },
      collisionEnvelope: {
        type: 'cylinder',
        radius: flangeR + 5,
        length: dims.overallLength + 10
      }
    };
  },
  /**
   * Generate shrink fit holder geometry
   */
  generateShrinkFit(holder, holderType, taperSpec, options = {}) {
    const dims = holder.dimensions || {};
    const segments = options.segments || 32;

    const profile = [];
    let z = 0;

    // Taper
    const taperLength = dims.overallLength * 0.30;
    const flangeR = (taperSpec?.flangeOD || 44) / 2;
    profile.push({ z: z, r: flangeR * 0.5, ri: 0 });
    z += taperLength;
    profile.push({ z: z, r: flangeR, ri: 0 });

    // Flange
    z += dims.overallLength * 0.08;
    profile.push({ z: z, r: flangeR, ri: 0 });

    // Body (slender)
    const bodyR = (dims.bodyOD || 25) / 2;
    profile.push({ z: z, r: bodyR, ri: 0 });
    z += dims.overallLength * 0.40;
    profile.push({ z: z, r: bodyR, ri: 0 });

    // Grip section (even slimmer)
    const gripR = (dims.gripOD || holder.bore + 6) / 2;
    const boreR = holder.bore / 2;
    profile.push({ z: z, r: gripR, ri: boreR });
    z = dims.overallLength;
    profile.push({ z: z, r: gripR, ri: boreR });

    return {
      type: 'lathe_geometry',
      profile: profile,
      segments: segments,
      holder: holder,
      boundingBox: {
        minX: -flangeR, maxX: flangeR,
        minY: -flangeR, maxY: flangeR,
        minZ: 0, maxZ: dims.overallLength
      },
      collisionEnvelope: {
        type: 'stepped_cylinder',
        sections: [
          { radius: flangeR + 3, length: taperLength + dims.overallLength * 0.08 },
          { radius: bodyR + 3, length: dims.overallLength * 0.40 },
          { radius: gripR + 3, length: dims.overallLength * 0.22 }
        ]
      }
    };
  },
  /**
   * Generate hydraulic chuck geometry
   */
  generateHydraulicChuck(holder, holderType, taperSpec, options = {}) {
    const dims = holder.dimensions || {};
    const segments = options.segments || 32;

    const profile = [];
    let z = 0;

    // Taper
    const flangeR = (taperSpec?.flangeOD || 44) / 2;
    const taperLength = dims.overallLength * 0.28;
    profile.push({ z: z, r: flangeR * 0.5, ri: 0 });
    z += taperLength;
    profile.push({ z: z, r: flangeR, ri: 0 });

    // Flange
    z += dims.overallLength * 0.10;
    profile.push({ z: z, r: flangeR, ri: 0 });

    // Hydraulic body (thicker for mechanism)
    const bodyR = (dims.bodyOD || holder.bore * 3 + 15) / 2;
    profile.push({ z: z, r: bodyR, ri: 0 });
    z += dims.overallLength * 0.42;
    profile.push({ z: z, r: bodyR, ri: 0 });

    // Clamping zone
    const clampR = (dims.clampingOD || holder.bore + 8) / 2;
    const boreR = holder.bore / 2;
    profile.push({ z: z, r: clampR, ri: boreR });
    z = dims.overallLength;
    profile.push({ z: z, r: clampR, ri: boreR });

    return {
      type: 'lathe_geometry',
      profile: profile,
      segments: segments,
      holder: holder,
      features: [
        { type: 'set_screw', position: { z: dims.overallLength * 0.5, angle: 0 }, hexSize: 4 }
      ],
      boundingBox: {
        minX: -bodyR, maxX: bodyR,
        minY: -bodyR, maxY: bodyR,
        minZ: 0, maxZ: dims.overallLength
      },
      collisionEnvelope: {
        type: 'cylinder',
        radius: bodyR + 5,
        length: dims.overallLength + 5
      }
    };
  },
  /**
   * Generate milling chuck (Weldon) geometry
   */
  generateMillingChuck(holder, holderType, taperSpec, options = {}) {
    const dims = holder.dimensions || {};
    const segments = options.segments || 32;
    const bore = holder.boreUnit === 'inch' ? holder.bore * 25.4 : holder.bore;
    const projection = holder.boreUnit === 'inch' ? holder.projection * 25.4 : holder.projection;

    const profile = [];
    let z = 0;

    const flangeR = (taperSpec?.flangeOD || 44) / 2;
    const bodyR = (dims.bodyOD || bore * 2.2 + 12) / 2;

    // Taper
    profile.push({ z: z, r: flangeR * 0.5, ri: 0 });
    z += dims.overallLength * 0.32;
    profile.push({ z: z, r: flangeR, ri: 0 });

    // Flange
    z += dims.overallLength * 0.12;
    profile.push({ z: z, r: flangeR, ri: 0 });

    // Body
    profile.push({ z: z, r: bodyR, ri: 0 });
    z += dims.overallLength * 0.36;
    profile.push({ z: z, r: bodyR, ri: bore / 2 });

    // Bore section
    const boreR = bore / 2 + 3;
    profile.push({ z: z, r: boreR, ri: bore / 2 });
    z = dims.overallLength;
    profile.push({ z: z, r: boreR, ri: bore / 2 });

    return {
      type: 'lathe_geometry',
      profile: profile,
      segments: segments,
      holder: holder,
      features: [
        { type: 'set_screw', position: { z: dims.overallLength * 0.6, angle: 0 }, hexSize: 5 },
        { type: 'set_screw', position: { z: dims.overallLength * 0.75, angle: 0 }, hexSize: 5 }
      ],
      boundingBox: {
        minX: -flangeR, maxX: flangeR,
        minY: -flangeR, maxY: flangeR,
        minZ: 0, maxZ: dims.overallLength
      }
    };
  },
  /**
   * Generate shell mill arbor geometry
   */
  generateShellMillArbor(holder, holderType, taperSpec, options = {}) {
    const dims = holder.dimensions || {};
    const segments = options.segments || 32;

    const profile = [];
    let z = 0;

    const flangeR = (taperSpec?.flangeOD || 44) / 2;
    const pilotR = holder.pilotDia / 2;

    // Taper
    profile.push({ z: z, r: flangeR * 0.5, ri: 0 });
    z += dims.overallLength * 0.35;
    profile.push({ z: z, r: flangeR, ri: 0 });

    // Flange
    z += dims.overallLength * 0.15;
    profile.push({ z: z, r: flangeR, ri: 0 });

    // Spacer
    const spacerR = pilotR * 1.5;
    profile.push({ z: z, r: spacerR, ri: 0 });
    z += dims.overallLength * 0.10;
    profile.push({ z: z, r: spacerR, ri: 0 });

    // Pilot
    profile.push({ z: z, r: pilotR, ri: 0 });
    z += dims.pilotLength || 25;
    profile.push({ z: z, r: pilotR, ri: 0 });

    // Thread end
    const threadR = pilotR * 0.6;
    profile.push({ z: z, r: threadR, ri: 0 });
    z = dims.overallLength;
    profile.push({ z: z, r: threadR, ri: 0 });

    return {
      type: 'lathe_geometry',
      profile: profile,
      segments: segments,
      holder: holder,
      features: [
        { type: 'drive_slots', count: 2, position: { z: dims.overallLength * 0.55 } }
      ],
      boundingBox: {
        minX: -flangeR, maxX: flangeR,
        minY: -flangeR, maxY: flangeR,
        minZ: 0, maxZ: dims.overallLength
      }
    };
  },
  /**
   * Generate face mill arbor geometry
   */
  generateFaceMillArbor(holder, holderType, taperSpec, options = {}) {
    const dims = holder.dimensions || {};
    const segments = options.segments || 32;

    const profile = [];
    let z = 0;

    const flangeR = (taperSpec?.flangeOD || 44) / 2;
    const pilotR = holder.pilotDia / 2;

    // Taper
    profile.push({ z: z, r: flangeR * 0.5, ri: 0 });
    z += dims.overallLength * 0.45;
    profile.push({ z: z, r: flangeR, ri: 0 });

    // Flange (wider)
    z += dims.overallLength * 0.20;
    profile.push({ z: z, r: flangeR, ri: 0 });

    // Pilot
    profile.push({ z: z, r: pilotR, ri: 0 });
    z += dims.pilotLength || 20;
    profile.push({ z: z, r: pilotR, ri: 0 });

    // Bolt boss
    const bossR = pilotR * 0.5;
    profile.push({ z: z, r: bossR, ri: 0 });
    z = dims.overallLength;
    profile.push({ z: z, r: bossR, ri: 0 });

    return {
      type: 'lathe_geometry',
      profile: profile,
      segments: segments,
      holder: holder,
      features: [
        { type: 'drive_keys', count: 2, position: { z: dims.overallLength * 0.65 } }
      ],
      boundingBox: {
        minX: -flangeR, maxX: flangeR,
        minY: -flangeR, maxY: flangeR,
        minZ: 0, maxZ: dims.overallLength
      }
    };
  },
  /**
   * Generate boring head geometry
   */
  generateBoringHead(holder, holderType, taperSpec, options = {}) {
    const dims = holder.dimensions || {};
    const flangeR = (taperSpec?.flangeOD || 44) / 2;
    const headR = flangeR * 1.3;

    return {
      type: 'complex_geometry',
      sections: [
        { type: 'taper', length: 50, startR: flangeR * 0.5, endR: flangeR },
        { type: 'flange', length: 15, radius: flangeR },
        { type: 'head_body', length: 40, radius: headR }
      ],
      features: [
        { type: 'dovetail_slot', width: 12, depth: 8, location: 'head' },
        { type: 'adjustment_dial', diameter: headR * 0.6 },
        { type: 'tool_slot', size: holder.toolSlotSize || 12 }
      ],
      holder: holder,
      boundingBox: {
        minX: -headR, maxX: headR,
        minY: -headR, maxY: headR,
        minZ: 0, maxZ: 105
      }
    };
  },
  /**
   * Generate generic holder when specific type not found
   */
  generateGenericHolder(options = {}) {
    const length = options.projection || options.overallLength || 100;
    const bodyOD = options.bodyOD || 40;
    const flangeOD = options.flangeOD || 45;

    return {
      type: 'generic_holder',
      profile: [
        { z: 0, r: flangeOD * 0.4 },
        { z: length * 0.35, r: flangeOD * 0.5 },
        { z: length * 0.45, r: flangeOD * 0.5 },
        { z: length * 0.45, r: bodyOD * 0.5 },
        { z: length, r: bodyOD * 0.4 }
      ],
      boundingBox: {
        minX: -flangeOD / 2, maxX: flangeOD / 2,
        minY: -flangeOD / 2, maxY: flangeOD / 2,
        minZ: 0, maxZ: length
      }
    };
  },
  // HELPER METHODS

  findHolder(holderId) {
    // Direct lookup
    if (PRISM_TOOL_HOLDER_3D_DATABASE.holders[holderId]) {
      return PRISM_TOOL_HOLDER_3D_DATABASE.holders[holderId];
    }
    // Fuzzy match
    const normalizedId = holderId.toLowerCase().replace(/[^a-z0-9]/g, '_');
    for (const [id, holder] of Object.entries(PRISM_TOOL_HOLDER_3D_DATABASE.holders)) {
      if (id.toLowerCase().includes(normalizedId) || normalizedId.includes(id.toLowerCase())) {
        return holder;
      }
    }
    return null;
  },
  getColletBore(colletSize) {
    const sizes = PRISM_TOOL_HOLDER_3D_DATABASE.holderTypes?.collet_chuck?.colletSizes || {};
    const spec = sizes[colletSize];
    return spec ? (spec.boreRange[0] + spec.boreRange[1]) / 2 : 10;
  },
  getHolderGeometry(holderId) {
    const holder = this.findHolder(holderId);
    if (!holder) return null;

    return {
      holder: holder,
      taperSpec: PRISM_TOOL_HOLDER_3D_DATABASE.taperSpecs[holder.taper],
      typeSpec: PRISM_TOOL_HOLDER_3D_DATABASE.holderTypes[holder.type]
    };
  },
  // INTEGRATION WITH EXISTING SYSTEMS

  connectToHolderDatabase() {
    if (typeof HOLDER_DATABASE !== 'undefined') {
      // Add 3D generation method to HOLDER_DATABASE
      HOLDER_DATABASE.generate3D = (holderId, options) => {
        return this.generateHolder3D(holderId, options);
      };
      HOLDER_DATABASE.getGeometry = (holderId) => {
        return this.getHolderGeometry(holderId);
      };
      // Enrich existing holders with 3D data reference
      if (HOLDER_DATABASE.holders) {
        // For inch holders
        if (Array.isArray(HOLDER_DATABASE.holders.inch)) {
          HOLDER_DATABASE.holders.inch.forEach(h => {
            h.has3DModel = !!this.findHolder(h.id);
            h.generate3D = () => this.generateHolder3D(h.id);
          });
        }
        // For metric holders
        if (Array.isArray(HOLDER_DATABASE.holders.metric)) {
          HOLDER_DATABASE.holders.metric.forEach(h => {
            h.has3DModel = !!this.findHolder(h.id);
            h.generate3D = () => this.generateHolder3D(h.id);
          });
        }
      }
      console.log('[HOLDER_3D] ✓ Connected to HOLDER_DATABASE');
    }
  },
  connectToCollisionSystem() {
    if (typeof COLLISION_AVOIDANCE_SYSTEM !== 'undefined') {
      COLLISION_AVOIDANCE_SYSTEM.getHolderEnvelope = (holderId) => {
        const geom = this.generateHolder3D(holderId);
        return geom?.collisionEnvelope || null;
      };
      console.log('[HOLDER_3D] ✓ Connected to COLLISION_AVOIDANCE_SYSTEM');
    }
    if (typeof PRISM_COLLISION_DETECTION !== 'undefined') {
      PRISM_COLLISION_DETECTION.holderGeometry = this;
      console.log('[HOLDER_3D] ✓ Connected to PRISM_COLLISION_DETECTION');
    }
  },
  connectToVisualization() {
    // Connect to machine visualization
    if (typeof MACHINE_VISUALIZATION !== 'undefined') {
      MACHINE_VISUALIZATION.holderGenerator = this;
      console.log('[HOLDER_3D] ✓ Connected to MACHINE_VISUALIZATION');
    }
    // Connect to 3D tool generator
    if (typeof PRISM_TOOL_3D_GENERATOR !== 'undefined') {
      PRISM_TOOL_3D_GENERATOR.holderModels = this;
      PRISM_TOOL_3D_GENERATOR.getHolderMesh = (holderId, options) => {
        return this.generateHolder3D(holderId, options);
      };
      console.log('[HOLDER_3D] ✓ Connected to PRISM_TOOL_3D_GENERATOR');
    }
    // Connect to setup visualization
    if (typeof PRISM_SETUP_VISUALIZER !== 'undefined') {
      PRISM_SETUP_VISUALIZER.holderGenerator = this;
      console.log('[HOLDER_3D] ✓ Connected to PRISM_SETUP_VISUALIZER');
    }
  },
  // STATISTICS

  getStats() {
    const holders = PRISM_TOOL_HOLDER_3D_DATABASE.holders;
    const types = {};
    const tapers = {};

    for (const holder of Object.values(holders)) {
      types[holder.type] = (types[holder.type] || 0) + 1;
      tapers[holder.taper] = (tapers[holder.taper] || 0) + 1;
    }
    return {
      totalHolders: Object.keys(holders).length,
      holderTypes: types,
      taperTypes: tapers,
      taperSpecs: Object.keys(PRISM_TOOL_HOLDER_3D_DATABASE.taperSpecs).length
    };
  }
}