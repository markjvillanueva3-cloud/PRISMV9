const PRISM_ADAPTIVE_MESH = {
  version: '1.0.0',

  /**
   * Refine mesh based on curvature
   */
  refineByCurvature(vertices, indices, normals, threshold = 0.1) {
    const newVertices = [...vertices];
    const newNormals = [...normals];
    const newIndices = [];

    // Process each triangle
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i];
      const i1 = indices[i + 1];
      const i2 = indices[i + 2];

      // Get normals
      const n0 = { x: normals[i0 * 3], y: normals[i0 * 3 + 1], z: normals[i0 * 3 + 2] };
      const n1 = { x: normals[i1 * 3], y: normals[i1 * 3 + 1], z: normals[i1 * 3 + 2] };
      const n2 = { x: normals[i2 * 3], y: normals[i2 * 3 + 1], z: normals[i2 * 3 + 2] };

      // Calculate curvature (normal deviation)
      const d01 = 1 - (n0.x * n1.x + n0.y * n1.y + n0.z * n1.z);
      const d12 = 1 - (n1.x * n2.x + n1.y * n2.y + n1.z * n2.z);
      const d20 = 1 - (n2.x * n0.x + n2.y * n0.y + n2.z * n0.z);

      const maxDeviation = Math.max(d01, d12, d20);

      if (maxDeviation > threshold) {
        // Subdivide triangle
        const v0 = { x: vertices[i0 * 3], y: vertices[i0 * 3 + 1], z: vertices[i0 * 3 + 2] };
        const v1 = { x: vertices[i1 * 3], y: vertices[i1 * 3 + 1], z: vertices[i1 * 3 + 2] };
        const v2 = { x: vertices[i2 * 3], y: vertices[i2 * 3 + 1], z: vertices[i2 * 3 + 2] };

        // Add midpoint
        const midV = {
          x: (v0.x + v1.x + v2.x) / 3,
          y: (v0.y + v1.y + v2.y) / 3,
          z: (v0.z + v1.z + v2.z) / 3
        };
        const midN = {
          x: (n0.x + n1.x + n2.x) / 3,
          y: (n0.y + n1.y + n2.y) / 3,
          z: (n0.z + n1.z + n2.z) / 3
        };
        const len = Math.sqrt(midN.x ** 2 + midN.y ** 2 + midN.z ** 2);
        midN.x /= len; midN.y /= len; midN.z /= len;

        const newIdx = newVertices.length / 3;
        newVertices.push(midV.x, midV.y, midV.z);
        newNormals.push(midN.x, midN.y, midN.z);

        // Create 3 triangles instead of 1
        newIndices.push(i0, i1, newIdx);
        newIndices.push(i1, i2, newIdx);
        newIndices.push(i2, i0, newIdx);
      } else {
        // Keep original triangle
        newIndices.push(i0, i1, i2);
      }
    }
    return {
      vertices: new Float32Array(newVertices),
      normals: new Float32Array(newNormals),
      indices: newIndices
    };
  },
  /**
   * Simplify mesh by edge collapse
   */
  simplify(vertices, indices, targetRatio = 0.5) {
    // Quadric error metric simplification (simplified version)
    const targetCount = Math.floor(indices.length / 3 * targetRatio);

    // For now, just return original if simplification not needed
    if (indices.length / 3 <= targetCount) {
      return { vertices, indices };
    }
    // Simple decimation - skip every other triangle
    const newIndices = [];
    for (let i = 0; i < indices.length; i += 6) {
      if (i + 2 < indices.length) {
        newIndices.push(indices[i], indices[i + 1], indices[i + 2]);
      }
    }
    return {
      vertices,
      indices: newIndices
    };
  }
}