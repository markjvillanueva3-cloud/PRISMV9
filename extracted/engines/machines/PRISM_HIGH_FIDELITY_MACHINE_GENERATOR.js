/**
 * PRISM_HIGH_FIDELITY_MACHINE_GENERATOR
 * Extracted from PRISM v8.89.002 monolith
 * References: 13
 * Lines: 395
 * Session: R2.3.1 Wave 2 Engine Gap Extraction
 */

const PRISM_HIGH_FIDELITY_MACHINE_GENERATOR = {
  version: '1.0.0',

  // Machine component templates with accurate dimensions
  componentTemplates: {
    vmc_base: {
      type: 'composite',
      components: [
        { name: 'main_casting', primitive: 'box', relPosition: [0, 0, 0] },
        { name: 'leveling_pads', primitive: 'cylinder', count: 4 },
        { name: 'chip_pan', primitive: 'box', relPosition: [0, -50, 0] }
      ]
    },
    vmc_column: {
      type: 'composite',
      components: [
        { name: 'column_body', primitive: 'box' },
        { name: 'way_cover_left', primitive: 'box' },
        { name: 'way_cover_right', primitive: 'box' }
      ]
    },
    spindle_head: {
      type: 'composite',
      components: [
        { name: 'head_casting', primitive: 'box' },
        { name: 'spindle_motor', primitive: 'cylinder' },
        { name: 'spindle_nose', primitive: 'cylinder' },
        { name: 'tool_holder', primitive: 'cone' }
      ]
    },
    trunnion_table: {
      type: 'composite',
      components: [
        { name: 'a_axis_cradle', primitive: 'box' },
        { name: 'a_axis_bearing_left', primitive: 'cylinder' },
        { name: 'a_axis_bearing_right', primitive: 'cylinder' },
        { name: 'c_axis_table', primitive: 'cylinder' },
        { name: 'c_axis_motor', primitive: 'cylinder' }
      ]
    }
  },
  // Manufacturer-specific styling
  manufacturerStyles: {
    'OKUMA': {
      primaryColor: 0x2B5F2B,     // Okuma green
      secondaryColor: 0xEEEEEE,
      accentColor: 0x4B7F4B,
      logoPosition: 'column_front'
    },
    'HAAS': {
      primaryColor: 0x333333,
      secondaryColor: 0xCC0000,
      accentColor: 0x666666,
      logoPosition: 'column_front'
    },
    'DMG_MORI': {
      primaryColor: 0x1A1A1A,
      secondaryColor: 0x00529B,
      accentColor: 0x404040,
      logoPosition: 'column_front'
    },
    'MAZAK': {
      primaryColor: 0x004B87,
      secondaryColor: 0xFFFFFF,
      accentColor: 0x336699,
      logoPosition: 'column_front'
    }
  },
  /**
   * Generate high-fidelity machine model
   * Matches STEP import quality
   */
  generateMachine(machineSpec, options = {}) {
    const {
      quality = 'high',        // 'low', 'medium', 'high', 'ultra'
      includeDetails = true,
      includeBolts = quality === 'ultra',
      includeLogos = true,
      includeWayCovers = true,
      includeChipPan = true,
      colorize = true
    } = options;

    const brep = PRISM_BREP_CAD_GENERATOR_V2;
    brep.topology.reset();

    const assembly = {
      name: machineSpec.name || 'Machine',
      manufacturer: machineSpec.manufacturer || 'Generic',
      model: machineSpec.model || 'Unknown',
      type: machineSpec.type || 'vmc',
      components: [],
      kinematics: {},
      boundingBox: null,
      statistics: {
        totalFaces: 0,
        totalEdges: 0,
        totalVertices: 0
      }
    };
    const style = this.manufacturerStyles[machineSpec.manufacturer] || {
      primaryColor: 0x555555,
      secondaryColor: 0x888888,
      accentColor: 0x666666
    };
    // Get dimensions from spec or calculate from envelope
    const envelope = machineSpec.workEnvelope || machineSpec.envelope || {
      x: [0, 500], y: [0, 400], z: [0, 400]
    };
    const xRange = envelope.x[1] - envelope.x[0];
    const yRange = envelope.y[1] - envelope.y[0];
    const zRange = envelope.z[1] - envelope.z[0];

    // Quality-based segments
    const segments = {
      low: 12,
      medium: 24,
      high: 36,
      ultra: 72
    }[quality] || 36;

    // 1. Generate Base
    const baseWidth = xRange * 1.4;
    const baseDepth = yRange * 1.3;
    const baseHeight = 350;

    const base = brep.primitives.createBox(
      -baseWidth/2, -baseDepth/2, -baseHeight,
      baseWidth, baseDepth, baseHeight
    );
    base.name = 'Base';
    base.color = style.primaryColor;
    assembly.components.push(base);

    // 2. Generate Column
    const columnWidth = 350;
    const columnDepth = 450;
    const columnHeight = zRange + 600;

    const column = brep.primitives.createBox(
      xRange/2, -columnDepth/2, 0,
      columnWidth, columnDepth, columnHeight
    );
    column.name = 'Column';
    column.color = style.primaryColor;
    assembly.components.push(column);

    // 3. Generate Spindle Head
    const headWidth = 320;
    const headDepth = 380;
    const headHeight = 450;

    const spindleHead = brep.primitives.createBox(
      xRange/2 - headWidth/2, -headDepth/2, columnHeight - headHeight - 100,
      headWidth, headDepth, headHeight
    );
    spindleHead.name = 'SpindleHead';
    spindleHead.color = style.secondaryColor;
    spindleHead.kinematic = { axis: 'Z', range: [0, zRange] };
    assembly.components.push(spindleHead);

    // 4. Generate Spindle
    const spindleRadius = 80;
    const spindleLength = 200;

    const spindle = brep.primitives.createCylinder(
      xRange/2, 0, columnHeight - headHeight - 100 - spindleLength,
      spindleRadius, spindleLength, segments
    );
    spindle.name = 'Spindle';
    spindle.color = style.accentColor;
    assembly.components.push(spindle);

    // 5. Generate Table
    const tableWidth = xRange * 0.9;
    const tableDepth = yRange * 0.85;
    const tableHeight = 60;

    const table = brep.primitives.createBox(
      -tableWidth/2 + xRange/2, -tableDepth/2, 0,
      tableWidth, tableDepth, tableHeight
    );
    table.name = 'Table';
    table.color = 0x555577;
    table.kinematic = { axis: 'Y', range: envelope.y };
    assembly.components.push(table);

    // 6. Generate Saddle
    const saddleWidth = tableWidth * 0.8;
    const saddleDepth = yRange + 150;
    const saddleHeight = 100;

    const saddle = brep.primitives.createBox(
      -saddleWidth/2 + xRange/2, -saddleDepth/2, tableHeight,
      saddleWidth, saddleDepth, saddleHeight
    );
    saddle.name = 'Saddle';
    saddle.color = style.primaryColor;
    saddle.kinematic = { axis: 'X', range: envelope.x };
    assembly.components.push(saddle);

    // 7. Add 5-axis components if applicable
    if (machineSpec.type === 'vmc_5axis' || machineSpec.axes === 5) {
      // A-axis trunnion
      const trunnionWidth = 380;
      const trunnionHeight = 180;
      const trunnionDepth = 420;

      const trunnion = brep.primitives.createBox(
        -trunnionWidth/2 + xRange/2, -trunnionDepth/2, tableHeight + saddleHeight,
        trunnionWidth, trunnionDepth, trunnionHeight
      );
      trunnion.name = 'ATrunnion';
      trunnion.color = 0x556688;
      trunnion.kinematic = {
        axis: 'A',
        range: machineSpec.aAxisRange || [-30, 120],
        type: 'rotary'
      };
      assembly.components.push(trunnion);

      // C-axis table (rotary)
      const cTableRadius = 200;
      const cTableHeight = 50;

      const cTable = brep.primitives.createCylinder(
        xRange/2, 0, tableHeight + saddleHeight + trunnionHeight,
        cTableRadius, cTableHeight, segments
      );
      cTable.name = 'CTable';
      cTable.color = 0x667799;
      cTable.kinematic = {
        axis: 'C',
        range: [0, 360],
        type: 'rotary',
        continuous: true
      };
      assembly.components.push(cTable);

      assembly.kinematics = {
        type: 'vmc_5axis_trunnion',
        config: 'AC',
        axes: {
          X: { type: 'linear', range: envelope.x, component: 'Saddle' },
          Y: { type: 'linear', range: envelope.y, component: 'Table' },
          Z: { type: 'linear', range: envelope.z, component: 'SpindleHead' },
          A: { type: 'rotary', range: machineSpec.aAxisRange || [-30, 120], component: 'ATrunnion' },
          C: { type: 'rotary', range: [0, 360], component: 'CTable' }
        }
      };
    } else {
      assembly.kinematics = {
        type: 'vmc_3axis',
        axes: {
          X: { type: 'linear', range: envelope.x, component: 'Saddle' },
          Y: { type: 'linear', range: envelope.y, component: 'Table' },
          Z: { type: 'linear', range: envelope.z, component: 'SpindleHead' }
        }
      };
    }
    // Calculate bounding box
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const comp of assembly.components) {
      if (comp.boundingBox) {
        const bb = comp.boundingBox;
        minX = Math.min(minX, bb.x);
        minY = Math.min(minY, bb.y);
        minZ = Math.min(minZ, bb.z);
        maxX = Math.max(maxX, bb.x + bb.dx);
        maxY = Math.max(maxY, bb.y + bb.dy);
        maxZ = Math.max(maxZ, bb.z + bb.dz);
      }
    }
    assembly.boundingBox = {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
      size: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ }
    };
    // Calculate statistics
    for (const comp of assembly.components) {
      assembly.statistics.totalFaces += comp.faces?.length || 0;
      assembly.statistics.totalEdges += comp.edges?.length || 0;
      assembly.statistics.totalVertices += comp.vertices?.length || 0;
    }
    return assembly;
  },
  /**
   * Convert assembly to Three.js group
   */
  toThreeJS(assembly) {
    if (typeof THREE === 'undefined') {
      console.error('[HIGH_FIDELITY_MACHINE] Three.js not available');
      return null;
    }
    const group = new THREE.Group();
    group.name = assembly.name;

    for (const component of assembly.components) {
      // Tessellate the B-Rep to mesh
      const tessResult = PRISM_BREP_CAD_GENERATOR_V2.tessellation.tessellate(component);

      if (tessResult.vertices.length === 0) {
        // Use simple box geometry as fallback
        if (component.boundingBox) {
          const bb = component.boundingBox;
          const geometry = new THREE.BoxGeometry(bb.dx, bb.dy, bb.dz);
          const material = new THREE.MeshPhongMaterial({
            color: component.color || 0x555555,
            flatShading: false
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(bb.x + bb.dx/2, bb.y + bb.dy/2, bb.z + bb.dz/2);
          mesh.name = component.name;
          group.add(mesh);
        }
        continue;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(tessResult.vertices, 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(tessResult.normals, 3));
      geometry.setIndex(tessResult.indices);

      const material = new THREE.MeshPhongMaterial({
        color: component.color || 0x555555,
        flatShading: false,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = component.name;
      mesh.userData = {
        kinematic: component.kinematic,
        boundingBox: component.boundingBox
      };
      group.add(mesh);
    }
    return group;
  },
  /**
   * Export assembly to STEP format
   */
  exportSTEP(assembly, options = {}) {
    const entities = PRISM_BREP_CAD_GENERATOR_V2.topology.exportAll();

    let step = '';
    step += 'ISO-10303-21;\n';
    step += 'HEADER;\n';
    step += 'FILE_DESCRIPTION((\'PRISM Generated Machine Model\'),\'2;1\');\n';
    step += `FILE_NAME(\'${assembly.name}.step\',\'${new Date().toISOString()}\',(\'PRISM\'),(\'\'),\'PRISM v8.87.001\',\'PRISM_HIGH_FIDELITY_MACHINE_GENERATOR\',\'\');\n`;
    step += 'FILE_SCHEMA((\'AUTOMOTIVE_DESIGN { 1 0 10303 214 1 1 1 1 }\'));\n';
    step += 'ENDSEC;\n';
    step += 'DATA;\n';

    // Write entities
    for (const entity of entities) {
      step += `#${entity.id} = ${entity.type}(`;
      // Serialize entity data
      step += this._serializeEntity(entity);
      step += ');\n';
    }
    step += 'ENDSEC;\n';
    step += 'END-ISO-10303-21;\n';

    return step;
  },
  _serializeEntity(entity) {
    // Simplified serialization
    switch (entity.type) {
      case 'CARTESIAN_POINT':
        return `\'${entity.id}\', (${entity.x}, ${entity.y}, ${entity.z})`;
      case 'DIRECTION':
        return `\'${entity.id}\', (${entity.x}, ${entity.y}, ${entity.z})`;
      default:
        return '\'\', ()';
    }
  },
  init() {
    console.log('[PRISM_HIGH_FIDELITY_MACHINE_GENERATOR] Initialized v' + this.version);
    console.log('  ✓ Full B-Rep machine component generation');
    console.log('  ✓ Manufacturer-specific styling');
    console.log('  ✓ Kinematic chain definition');
    console.log('  ✓ STEP export capability');
    window.PRISM_HIGH_FIDELITY_MACHINE_GENERATOR = this;

    // Extend MACHINE_MODEL_GENERATOR if available
    if (typeof MACHINE_MODEL_GENERATOR !== 'undefined') {
      MACHINE_MODEL_GENERATOR.generateHighFidelity = this.generateMachine.bind(this);
      MACHINE_MODEL_GENERATOR.toThreeJS = this.toThreeJS.bind(this);
      console.log('  ✓ Extended MACHINE_MODEL_GENERATOR with high-fidelity generation');
    }
    return this;
  }
}