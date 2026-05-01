const PRISM_UNIFIED_STEP_IMPORT = {
  version: '1.0.0',

  /**
   * Complete STEP file import with mesh generation
   * @param {File|string} input - STEP file or text content
   * @param {Object} options - Import options
   * @returns {Object} - Complete mesh with metadata
   */
  async import(input, options = {}) {
    console.log('[STEP Import] Starting unified import...');
    const startTime = performance.now();

    // Read file content
    let stepText;
    if (typeof input === 'string') {
      stepText = input;
    } else {
      stepText = await this.readFile(input);
    }
    // Step 1: Parse entities
    console.log('[STEP Import] Parsing entities...');
    const parsed = PRISM_STEP_ENTITY_PARSER.parseComplete(stepText);

    // Step 2: Build entity lookup map
    const entityMap = parsed.entities;

    // Step 3: Tessellate to mesh
    console.log('[STEP Import] Tessellating B-Rep...');
    const mesh = PRISM_BREP_TESSELLATOR.tessellateBrep(parsed, entityMap, options);

    // Step 4: Calculate bounding box
    const boundingBox = this.calculateBoundingBox(mesh.vertices);

    // Step 5: Build result
    const result = {
      success: true,
      format: 'STEP',
      schema: parsed.header.schema,
      fileName: parsed.header.fileName,

      // Mesh data for rendering
      mesh: {
        vertices: mesh.vertices,
        normals: mesh.normals,
        triangles: mesh.triangles,
        faceInfo: mesh.faceInfo
      },
      // Metadata
      metadata: {
        totalEntities: parsed.statistics.totalEntities,
        entityCategories: parsed.statistics.byCategory,
        faces: mesh.statistics.faces,
        triangles: mesh.statistics.triangles,
        vertices: mesh.statistics.vertices
      },
      // Geometry properties
      properties: {
        boundingBox,
        centroid: {
          x: (boundingBox.min.x + boundingBox.max.x) / 2,
          y: (boundingBox.min.y + boundingBox.max.y) / 2,
          z: (boundingBox.min.z + boundingBox.max.z) / 2
        },
        size: {
          x: boundingBox.max.x - boundingBox.min.x,
          y: boundingBox.max.y - boundingBox.min.y,
          z: boundingBox.max.z - boundingBox.min.z
        }
      },
      // Raw parsed data (for advanced use)
      raw: {
        entities: parsed.entities,
        byType: parsed.byType,
        rootEntities: parsed.rootEntities
      },
      processingTime: performance.now() - startTime
    };
    console.log(`[STEP Import] Complete in ${result.processingTime.toFixed(1)}ms`);
    console.log(`[STEP Import] Generated ${mesh.statistics.triangles} triangles from ${mesh.statistics.faces} faces`);

    return result;
  },
  /**
   * Read file as text
   */
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = e => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  },
  /**
   * Calculate bounding box from vertices
   */
  calculateBoundingBox(vertices) {
    if (!vertices || vertices.length === 0) {
      return {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 0, y: 0, z: 0 }
      };
    }
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    vertices.forEach(v => {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      minZ = Math.min(minZ, v.z);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
      maxZ = Math.max(maxZ, v.z);
    });

    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ }
    };
  },
  /**
   * Convert mesh to Three.js geometry
   */
  toThreeGeometry(mesh) {
    if (typeof THREE === 'undefined') {
      console.warn('[STEP Import] Three.js not available');
      return null;
    }
    const geometry = new THREE.BufferGeometry();

    // Flatten vertices
    const positions = new Float32Array(mesh.triangles.length * 3 * 3);
    const normals = new Float32Array(mesh.triangles.length * 3 * 3);

    let idx = 0;
    mesh.triangles.forEach(tri => {
      tri.forEach(vertIdx => {
        const v = mesh.vertices[vertIdx];
        const n = mesh.normals[vertIdx];

        positions[idx] = v.x;
        positions[idx + 1] = v.y;
        positions[idx + 2] = v.z;

        normals[idx] = n.x;
        normals[idx + 1] = n.y;
        normals[idx + 2] = n.z;

        idx += 3;
      });
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

    return geometry;
  }
}