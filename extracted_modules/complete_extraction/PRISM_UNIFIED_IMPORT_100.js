const PRISM_UNIFIED_IMPORT_100 = {
  version: '3.0.0',
  confidence: 100,

  /**
   * Complete STEP import with all enhancements
   */
  async import(stepText, options = {}) {
    console.log('[100% Import] Starting comprehensive STEP import...');
    const startTime = performance.now();

    const {
      validateTopology = true,
      extractColors = true,
      generateLOD = true,
      meshQuality = 'high',
      computeCurvature = true
    } = options;

    // 1. Parse STEP entities
    console.log('[100% Import] Phase 1: Parsing entities...');
    const parsed = PRISM_STEP_ENTITY_PARSER.parseComplete(stepText);
    const entityMap = parsed.entities;

    // 2. Validate topology if requested
    if (validateTopology) {
      console.log('[100% Import] Phase 2: Validating topology...');
      const validation = PRISM_STEP_PARSER_100.validateBRepTopology(parsed, entityMap);
      validation.forEach(v => {
        if (!v.valid) {
          console.warn(`[Validation] Shell #${v.shellId}: ${v.message}`);
        }
      });
    }
    // 3. Extract assembly structure
    console.log('[100% Import] Phase 3: Extracting assembly...');
    const assembly = PRISM_STEP_PARSER_100.parseAssembly(parsed, entityMap);

    // 4. Extract colors
    let colorInfo = null;
    if (extractColors) {
      console.log('[100% Import] Phase 4: Extracting colors...');
      colorInfo = PRISM_RENDER_100.extractColors(parsed, entityMap);
    }
    // 5. Tessellate B-Rep
    console.log('[100% Import] Phase 5: Tessellating B-Rep...');
    const resolution = meshQuality === 'high' ? 32 : meshQuality === 'medium' ? 20 : 12;
    const mesh = PRISM_BREP_TESSELLATOR.tessellateBrep(parsed, entityMap, { resolution });

    // 6. Compute mesh quality
    console.log('[100% Import] Phase 6: Computing mesh quality...');
    const quality = PRISM_MESH_100.computeMeshQuality(mesh.vertices, mesh.triangles);

    // 7. Optimize mesh if quality is poor
    if (quality.avgQuality < 0.5) {
      console.log('[100% Import] Phase 6b: Optimizing mesh...');
      mesh.vertices = PRISM_MESH_100.laplacianSmooth(mesh.vertices, mesh.triangles, 2, 0.3);
      const optimized = PRISM_MESH_100.edgeFlip(mesh.vertices, mesh.triangles);
      mesh.triangles = optimized.triangles;
    }
    // 8. Extract edges
    console.log('[100% Import] Phase 7: Extracting edges...');
    const edges = PRISM_RENDER_100.extractEdges(mesh.vertices, mesh.triangles, mesh.normals);

    // 9. Generate LOD
    let lod = null;
    if (generateLOD) {
      console.log('[100% Import] Phase 8: Generating LOD...');
      lod = PRISM_RENDER_100.generateLOD(mesh.vertices, mesh.triangles, 4);
    }
    // 10. Compute bounding box and centroid
    const bounds = this.computeBounds(mesh.vertices);

    const totalTime = performance.now() - startTime;
    console.log(`[100% Import] Complete in ${totalTime.toFixed(1)}ms`);

    return {
      // Core mesh data
      mesh: {
        vertices: mesh.vertices,
        normals: mesh.normals,
        triangles: mesh.triangles
      },
      // Enhanced data
      assembly,
      colors: colorInfo,
      edges,
      lod,
      quality,

      // Metadata
      properties: {
        schema: parsed.header.schema,
        entityCount: parsed.statistics.totalEntities,
        faceCount: mesh.statistics.faces,
        triangleCount: mesh.statistics.triangles,
        vertexCount: mesh.statistics.vertices,
        boundingBox: bounds.box,
        centroid: bounds.centroid,
        dimensions: bounds.dimensions,
        parseTime: totalTime
      },
      // Three.js conversion
      toThreeGeometry: () => {
        return PRISM_RENDER_100.toThreeGeometry(
          mesh.vertices,
          mesh.triangles,
          mesh.normals
        ).createGeometry();
      }
    };
  },
  computeBounds(vertices) {
    if (vertices.length === 0) {
      return {
        box: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
        centroid: { x: 0, y: 0, z: 0 },
        dimensions: { x: 0, y: 0, z: 0 }
      };
    }
    const min = { x: Infinity, y: Infinity, z: Infinity };
    const max = { x: -Infinity, y: -Infinity, z: -Infinity };
    let cx = 0, cy = 0, cz = 0;

    vertices.forEach(v => {
      min.x = Math.min(min.x, v.x);
      min.y = Math.min(min.y, v.y);
      min.z = Math.min(min.z, v.z);
      max.x = Math.max(max.x, v.x);
      max.y = Math.max(max.y, v.y);
      max.z = Math.max(max.z, v.z);
      cx += v.x;
      cy += v.y;
      cz += v.z;
    });

    return {
      box: { min, max },
      centroid: {
        x: cx / vertices.length,
        y: cy / vertices.length,
        z: cz / vertices.length
      },
      dimensions: {
        x: max.x - min.x,
        y: max.y - min.y,
        z: max.z - min.z
      }
    };
  }
}