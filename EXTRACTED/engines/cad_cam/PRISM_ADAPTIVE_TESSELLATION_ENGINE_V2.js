/**
 * PRISM_ADAPTIVE_TESSELLATION_ENGINE_V2
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 212
 * Session: R2.3.1 Engine Gap Extraction Round 3
 */

const PRISM_ADAPTIVE_TESSELLATION_ENGINE_V2 = {
  version: '3.0.0',

  // Tessellation quality presets
  presets: {
    draft: {
      minSegments: 6,
      maxSegments: 24,
      chordTolerance: 0.1,
      angleTolerance: 30
    },
    standard: {
      minSegments: 12,
      maxSegments: 48,
      chordTolerance: 0.02,
      angleTolerance: 15
    },
    high: {
      minSegments: 24,
      maxSegments: 72,
      chordTolerance: 0.005,
      angleTolerance: 8
    },
    ultra: {
      minSegments: 48,
      maxSegments: 144,
      chordTolerance: 0.001,
      angleTolerance: 4
    },
    step_equivalent: {
      minSegments: 36,
      maxSegments: 96,
      chordTolerance: 0.002,
      angleTolerance: 5,
      preserveSharpEdges: true,
      smoothShading: true
    }
  },
  /**
   * Calculate optimal segment count based on curvature
   */
  calculateSegments(radius, arcLength, options = {}) {
    const {
      minSegments = 8,
      maxSegments = 72,
      chordTolerance = 0.02
    } = options;

    if (radius <= 0 || arcLength <= 0) {
      return minSegments;
    }
    // Calculate from chord tolerance: n = arcLength / (2 * sqrt(2 * r * tol))
    const fromChord = Math.ceil(arcLength / (2 * Math.sqrt(2 * radius * chordTolerance)));

    // Calculate from arc coverage
    const angle = arcLength / radius;
    const fromAngle = Math.ceil(angle / (options.angleTolerance * Math.PI / 180));

    return Math.max(minSegments, Math.min(maxSegments, Math.max(fromChord, fromAngle)));
  },
  /**
   * Generate high-quality mesh from B-Rep solid
   */
  tessellate(brep, preset = 'step_equivalent') {
    const options = typeof preset === 'string' ?
      this.presets[preset] :
      { ...this.presets.standard, ...preset };

    return PRISM_BREP_CAD_GENERATOR_V2.tessellation.tessellate(brep, options);
  },
  /**
   * Refine existing mesh to target quality
   */
  refine(mesh, targetQuality = 'high') {
    const options = this.presets[targetQuality];

    // Get current mesh stats
    const currentTriangles = mesh.indices?.length / 3 || 0;
    const targetTriangles = this._estimateTargetTriangles(mesh, options);

    if (currentTriangles >= targetTriangles * 0.9) {
      return mesh; // Already good enough
    }
    // Subdivide mesh
    return this._subdivide(mesh, Math.ceil(targetTriangles / currentTriangles));
  },
  /**
   * Estimate target triangle count for quality level
   */
  _estimateTargetTriangles(mesh, options) {
    // Estimate surface area from bounding box
    let surfaceArea = 1000; // Default 1000 mm²

    if (mesh.boundingBox) {
      const bb = mesh.boundingBox;
      const dx = bb.dx || (bb.max?.x - bb.min?.x) || 100;
      const dy = bb.dy || (bb.max?.y - bb.min?.y) || 100;
      const dz = bb.dz || (bb.max?.z - bb.min?.z) || 100;

      // Approximate surface area as 2*(xy + xz + yz)
      surfaceArea = 2 * (dx*dy + dx*dz + dy*dz);
    }
    // Target triangles based on tolerance
    // Smaller tolerance = more triangles
    const trianglesPerMM2 = 0.1 / options.chordTolerance;

    return Math.ceil(surfaceArea * trianglesPerMM2);
  },
  /**
   * Subdivide mesh to increase resolution
   */
  _subdivide(mesh, factor) {
    if (factor <= 1) return mesh;

    const oldVerts = mesh.vertices;
    const oldNorms = mesh.normals;
    const oldIdx = mesh.indices;

    const newVerts = [];
    const newNorms = [];
    const newIdx = [];

    // Process each triangle
    for (let i = 0; i < oldIdx.length; i += 3) {
      const i0 = oldIdx[i];
      const i1 = oldIdx[i + 1];
      const i2 = oldIdx[i + 2];

      // Get vertices
      const v0 = { x: oldVerts[i0*3], y: oldVerts[i0*3+1], z: oldVerts[i0*3+2] };
      const v1 = { x: oldVerts[i1*3], y: oldVerts[i1*3+1], z: oldVerts[i1*3+2] };
      const v2 = { x: oldVerts[i2*3], y: oldVerts[i2*3+1], z: oldVerts[i2*3+2] };

      // Get normals
      const n0 = { x: oldNorms[i0*3], y: oldNorms[i0*3+1], z: oldNorms[i0*3+2] };
      const n1 = { x: oldNorms[i1*3], y: oldNorms[i1*3+1], z: oldNorms[i1*3+2] };
      const n2 = { x: oldNorms[i2*3], y: oldNorms[i2*3+1], z: oldNorms[i2*3+2] };

      // Calculate midpoints
      const m01 = {
        x: (v0.x + v1.x) / 2, y: (v0.y + v1.y) / 2, z: (v0.z + v1.z) / 2
      };
      const m12 = {
        x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2, z: (v1.z + v2.z) / 2
      };
      const m20 = {
        x: (v2.x + v0.x) / 2, y: (v2.y + v0.y) / 2, z: (v2.z + v0.z) / 2
      };
      // Interpolate normals
      const nm01 = this._normalizeVec({
        x: (n0.x + n1.x) / 2, y: (n0.y + n1.y) / 2, z: (n0.z + n1.z) / 2
      });
      const nm12 = this._normalizeVec({
        x: (n1.x + n2.x) / 2, y: (n1.y + n2.y) / 2, z: (n1.z + n2.z) / 2
      });
      const nm20 = this._normalizeVec({
        x: (n2.x + n0.x) / 2, y: (n2.y + n0.y) / 2, z: (n2.z + n0.z) / 2
      });

      // Add vertices
      const baseIdx = newVerts.length / 3;

      newVerts.push(v0.x, v0.y, v0.z);
      newVerts.push(v1.x, v1.y, v1.z);
      newVerts.push(v2.x, v2.y, v2.z);
      newVerts.push(m01.x, m01.y, m01.z);
      newVerts.push(m12.x, m12.y, m12.z);
      newVerts.push(m20.x, m20.y, m20.z);

      newNorms.push(n0.x, n0.y, n0.z);
      newNorms.push(n1.x, n1.y, n1.z);
      newNorms.push(n2.x, n2.y, n2.z);
      newNorms.push(nm01.x, nm01.y, nm01.z);
      newNorms.push(nm12.x, nm12.y, nm12.z);
      newNorms.push(nm20.x, nm20.y, nm20.z);

      // Create 4 triangles from 1
      newIdx.push(baseIdx + 0, baseIdx + 3, baseIdx + 5);  // v0, m01, m20
      newIdx.push(baseIdx + 3, baseIdx + 1, baseIdx + 4);  // m01, v1, m12
      newIdx.push(baseIdx + 5, baseIdx + 4, baseIdx + 2);  // m20, m12, v2
      newIdx.push(baseIdx + 3, baseIdx + 4, baseIdx + 5);  // m01, m12, m20 (center)
    }
    return {
      vertices: new Float32Array(newVerts),
      normals: new Float32Array(newNorms),
      indices: newIdx,
      statistics: {
        vertexCount: newVerts.length / 3,
        triangleCount: newIdx.length / 3
      }
    };
  },
  _normalizeVec(v) {
    const len = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
    if (len < 1e-10) return { x: 0, y: 0, z: 1 };
    return { x: v.x/len, y: v.y/len, z: v.z/len };
  },
  init() {
    console.log('[PRISM_ADAPTIVE_TESSELLATION_ENGINE_V2] Initialized v' + this.version);
    console.log('  ✓ Curvature-adaptive subdivision');
    console.log('  ✓ Quality presets: draft, standard, high, ultra, step_equivalent');
    console.log('  ✓ Mesh refinement');
    window.PRISM_ADAPTIVE_TESSELLATION_ENGINE_V2 = this;

    // Extend existing tessellation systems
    if (typeof PRISM_ADAPTIVE_MESH !== 'undefined') {
      PRISM_ADAPTIVE_MESH.v2 = this;
      console.log('  ✓ Extended PRISM_ADAPTIVE_MESH');
    }
    return this;
  }
}