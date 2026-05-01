const PRISM_STEP_ASSEMBLY_PARSER = {
  version: '1.0.0',

  // Component name patterns for collision zone identification
  collisionZonePatterns: {
    static: /static|base|frame|enclosure|guard|door|cover|sheet.*metal/i,
    spindle: /spindle|head|z.*axis.*head|quill/i,
    xAxis: /x.*axis|column|saddle|carriage/i,
    yAxis: /y.*axis|cross.*slide|knee/i,
    zAxis: /z.*axis|ram|slide/i,
    aAxis: /a.*axis|tilt|trunnion/i,
    bAxis: /b.*axis|rotary|index|pallet/i,
    cAxis: /c.*axis|table.*rotate/i,
    table: /table|work.*table|pallet|fixture/i,
    tool: /tool|holder|collet|chuck|arbor/i,
    toolchanger: /atc|tool.*change|magazine|carousel|turret/i,
    coolant: /coolant|nozzle|chip|conveyor/i
  },
  // Collision priority (lower = check first, higher priority for avoidance)
  collisionPriority: {
    spindle: 1,      // Highest priority - never collide
    tool: 2,
    table: 3,
    workpiece: 4,
    fixture: 5,
    xAxis: 6,
    yAxis: 7,
    zAxis: 8,
    aAxis: 9,
    bAxis: 10,
    cAxis: 11,
    toolchanger: 12,
    static: 20,      // Enclosure - low priority but still check
    coolant: 50      // Lowest - usually ignored
  },
  /**
   * Parse STEP file content to extract assembly structure
   */
  parseAssemblyStructure(stepContent) {
    const result = {
      assemblies: [],
      products: [],
      shapes: [],
      kinematicChain: [],
      collisionZones: [],
      boundingBoxes: {}
    };
    // Extract NEXT_ASSEMBLY_USAGE_OCCURRENCE entries
    const assemblyRegex = /NEXT_ASSEMBLY_USAGE_OCCURRENCE\s*\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*#(\d+)\s*,\s*#(\d+)/g;
    let match;
    while ((match = assemblyRegex.exec(stepContent)) !== null) {
      const assembly = {
        id: match[1],
        name: match[2],
        description: match[3],
        parentRef: parseInt(match[4]),
        childRef: parseInt(match[5]),
        collisionZone: this._identifyCollisionZone(match[2]),
        priority: this._getCollisionPriority(match[2])
      };
      result.assemblies.push(assembly);
    }
    // Extract PRODUCT definitions
    const productRegex = /PRODUCT\s*\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'/g;
    while ((match = productRegex.exec(stepContent)) !== null) {
      result.products.push({
        id: match[1],
        name: match[2],
        description: match[3]
      });
    }
    // Extract SHAPE_REPRESENTATION entries
    const shapeRegex = /ADVANCED_BREP_SHAPE_REPRESENTATION\s*\(\s*'([^']*)'\s*,\s*\(([^)]+)\)/g;
    while ((match = shapeRegex.exec(stepContent)) !== null) {
      const refs = match[2].split(',').map(r => parseInt(r.replace('#', '').trim())).filter(n => !isNaN(n));
      result.shapes.push({
        name: match[1],
        entityCount: refs.length,
        refs: refs.slice(0, 20) // First 20 refs
      });
    }
    // Build kinematic chain from assemblies
    result.kinematicChain = this._buildKinematicChain(result.assemblies);

    // Generate collision zones
    result.collisionZones = this._generateCollisionZones(result.assemblies);

    return result;
  },
  /**
   * Identify collision zone from component name
   */
  _identifyCollisionZone(name) {
    for (const [zone, pattern] of Object.entries(this.collisionZonePatterns)) {
      if (pattern.test(name)) {
        return zone;
      }
    }
    return 'unknown';
  },
  /**
   * Get collision priority for a component
   */
  _getCollisionPriority(name) {
    const zone = this._identifyCollisionZone(name);
    return this.collisionPriority[zone] || 100;
  },
  /**
   * Build kinematic chain from assembly structure
   */
  _buildKinematicChain(assemblies) {
    const chain = [];
    const axisOrder = ['static', 'xAxis', 'yAxis', 'zAxis', 'aAxis', 'bAxis', 'cAxis', 'spindle', 'tool'];

    for (const axis of axisOrder) {
      const component = assemblies.find(a => a.collisionZone === axis);
      if (component) {
        chain.push({
          name: component.name,
          type: axis,
          ref: component.childRef,
          parent: component.parentRef
        });
      }
    }
    return chain;
  },
  /**
   * Generate collision zones with constraints
   */
  _generateCollisionZones(assemblies) {
    return assemblies
      .filter(a => a.collisionZone !== 'unknown' && a.collisionZone !== 'coolant')
      .map(a => ({
        name: a.name,
        zone: a.collisionZone,
        priority: a.priority,
        constraints: this._getZoneConstraints(a.collisionZone),
        checkAgainst: this._getCollisionCheckList(a.collisionZone)
      }))
      .sort((a, b) => a.priority - b.priority);
  },
  /**
   * Get constraints for a collision zone
   */
  _getZoneConstraints(zone) {
    const constraints = {
      spindle: { alwaysCheck: true, criticalZone: true, minClearance: 0.5 },
      tool: { alwaysCheck: true, criticalZone: true, minClearance: 0.1 },
      table: { alwaysCheck: true, criticalZone: true, minClearance: 0.25 },
      xAxis: { checkDuringRapid: true, minClearance: 1.0 },
      yAxis: { checkDuringRapid: true, minClearance: 1.0 },
      zAxis: { checkDuringRapid: true, minClearance: 1.0 },
      aAxis: { checkDuringRotation: true, minClearance: 0.5, checkSwingRadius: true },
      bAxis: { checkDuringRotation: true, minClearance: 0.5, checkSwingRadius: true },
      cAxis: { checkDuringRotation: true, minClearance: 0.5, checkSwingRadius: true },
      static: { checkAtSetup: true, minClearance: 2.0 },
      toolchanger: { checkDuringToolChange: true, minClearance: 1.0 }
    };
    return constraints[zone] || { minClearance: 1.0 };
  },
  /**
   * Get list of zones to check collision against
   */
  _getCollisionCheckList(zone) {
    const checkLists = {
      tool: ['table', 'workpiece', 'fixture', 'static', 'aAxis', 'bAxis'],
      spindle: ['table', 'workpiece', 'fixture', 'static', 'toolchanger'],
      table: ['tool', 'spindle', 'static'],
      aAxis: ['tool', 'spindle', 'static'],
      bAxis: ['tool', 'spindle', 'static', 'aAxis'],
      xAxis: ['static'],
      yAxis: ['static'],
      zAxis: ['table', 'static']
    };
    return checkLists[zone] || ['static'];
  }
}