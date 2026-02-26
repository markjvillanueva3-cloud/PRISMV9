const PRISM_BREP_VALIDATION_EXTENSION = {
  /**
   * Validate solid topology using Euler-Poincaré formula
   * V - E + F = 2 for simple polyhedra
   */
  validateSolid(solid) {
    const result = {
      valid: true,
      eulerValid: true,
      manifold: true,
      closed: true,
      oriented: true,
      selfIntersecting: false,
      errors: [],
      warnings: []
    };
    if (!solid) {
      result.valid = false;
      result.errors.push('Solid is null or undefined');
      return result;
    }
    const V = solid.vertices?.length || 0;
    const E = solid.edges?.length || 0;
    const F = solid.faces?.length || 0;

    // Euler characteristic for closed manifold
    const euler = V - E + F;
    if (euler !== 2) {
      result.eulerValid = false;
      result.errors.push(`Euler characteristic V-E+F = ${euler}, expected 2`);
    }
    // Check edge manifoldness (each edge should have exactly 2 faces)
    if (solid.edges) {
      for (let i = 0; i < solid.edges.length; i++) {
        const edge = solid.edges[i];
        const faceCount = this._countEdgeFaces(solid, i);
        if (faceCount !== 2) {
          result.manifold = false;
          result.errors.push(`Edge ${i} has ${faceCount} faces (should be 2)`);
        }
      }
    }
    // Check face orientation consistency
    if (solid.faces) {
      const orientationCheck = this._checkOrientationConsistency(solid);
      if (!orientationCheck.consistent) {
        result.oriented = false;
        result.warnings.push('Face orientations inconsistent');
      }
    }
    result.valid = result.eulerValid && result.manifold && result.oriented;
    return result;
  },
  _countEdgeFaces(solid, edgeIndex) {
    let count = 0;
    if (solid.faces) {
      solid.faces.forEach(face => {
        if (face.edges && face.edges.includes(edgeIndex)) {
          count++;
        }
      });
    }
    return count;
  },
  _checkOrientationConsistency(solid) {
    // Check that adjacent faces have consistent normal directions
    const visited = new Set();
    const queue = [0];
    const orientations = new Map();
    orientations.set(0, true);

    while (queue.length > 0 && solid.faces) {
      const faceIdx = queue.shift();
      if (visited.has(faceIdx)) continue;
      visited.add(faceIdx);

      const face = solid.faces[faceIdx];
      if (!face || !face.adjacentFaces) continue;

      for (const adjIdx of face.adjacentFaces) {
        if (!visited.has(adjIdx)) {
          queue.push(adjIdx);
          const expectedOrientation = !orientations.get(faceIdx);
          if (orientations.has(adjIdx) && orientations.get(adjIdx) !== expectedOrientation) {
            return { consistent: false };
          }
          orientations.set(adjIdx, expectedOrientation);
        }
      }
    }
    return { consistent: true };
  },
  /**
   * Repair solid topology issues
   */
  repairSolid(solid) {
    const result = {
      repaired: false,
      operations: [],
      originalErrors: 0,
      remainingErrors: 0
    };
    if (!solid) return result;

    // Get initial validation
    const initial = this.validateSolid(solid);
    result.originalErrors = initial.errors.length;

    // Repair operations
    if (!initial.manifold) {
      this._repairNonManifoldEdges(solid);
      result.operations.push('repaired_non_manifold_edges');
    }
    if (!initial.oriented) {
      this._repairOrientation(solid);
      result.operations.push('fixed_orientation');
    }
    // Merge duplicate vertices within tolerance
    this._mergeDuplicateVertices(solid, 1e-6);
    result.operations.push('merged_duplicate_vertices');

    // Re-validate
    const final = this.validateSolid(solid);
    result.remainingErrors = final.errors.length;
    result.repaired = result.remainingErrors < result.originalErrors;

    return result;
  },
  _repairNonManifoldEdges(solid) {
    // Remove or split edges with wrong face count
    if (!solid.edges || !solid.faces) return;

    const edgesToRemove = [];
    for (let i = 0; i < solid.edges.length; i++) {
      const faceCount = this._countEdgeFaces(solid, i);
      if (faceCount === 0) {
        edgesToRemove.push(i);
      }
    }
    // Remove unused edges
    for (let i = edgesToRemove.length - 1; i >= 0; i--) {
      solid.edges.splice(edgesToRemove[i], 1);
    }
  },
  _repairOrientation(solid) {
    // Flip faces to ensure consistent outward normals
    if (!solid.faces) return;

    // Use first face as reference
    const visited = new Set();
    const queue = [{ idx: 0, flip: false }];

    while (queue.length > 0) {
      const { idx, flip } = queue.shift();
      if (visited.has(idx) || !solid.faces[idx]) continue;
      visited.add(idx);

      if (flip && solid.faces[idx].vertices) {
        solid.faces[idx].vertices.reverse();
      }
      const face = solid.faces[idx];
      if (face.adjacentFaces) {
        for (const adjIdx of face.adjacentFaces) {
          if (!visited.has(adjIdx)) {
            queue.push({ idx: adjIdx, flip: !flip });
          }
        }
      }
    }
  },
  _mergeDuplicateVertices(solid, tolerance) {
    if (!solid.vertices) return;

    const merged = new Map();
    const newVertices = [];

    for (let i = 0; i < solid.vertices.length; i++) {
      const v = solid.vertices[i];
      let foundMatch = -1;

      for (let j = 0; j < newVertices.length; j++) {
        const nv = newVertices[j];
        const dist = Math.sqrt(
          Math.pow(v.x - nv.x, 2) +
          Math.pow(v.y - nv.y, 2) +
          Math.pow(v.z - nv.z, 2)
        );
        if (dist < tolerance) {
          foundMatch = j;
          break;
        }
      }
      if (foundMatch >= 0) {
        merged.set(i, foundMatch);
      } else {
        merged.set(i, newVertices.length);
        newVertices.push(v);
      }
    }
    solid.vertices = newVertices;

    // Update edge and face vertex references
    if (solid.edges) {
      solid.edges.forEach(edge => {
        if (edge.startVertex !== undefined) edge.startVertex = merged.get(edge.startVertex);
        if (edge.endVertex !== undefined) edge.endVertex = merged.get(edge.endVertex);
      });
    }
    if (solid.faces) {
      solid.faces.forEach(face => {
        if (face.vertices) {
          face.vertices = face.vertices.map(vi => merged.get(vi));
        }
      });
    }
  },
  /**
   * Calculate mass properties of solid
   */
  calculateMassProperties(solid, density = 1.0) {
    const result = {
      volume: 0,
      mass: 0,
      centroid: { x: 0, y: 0, z: 0 },
      surfaceArea: 0,
      boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } }
    };
    if (!solid || !solid.faces) return result;

    // Calculate bounding box
    if (solid.vertices && solid.vertices.length > 0) {
      result.boundingBox.min = { x: Infinity, y: Infinity, z: Infinity };
      result.boundingBox.max = { x: -Infinity, y: -Infinity, z: -Infinity };

      solid.vertices.forEach(v => {
        result.boundingBox.min.x = Math.min(result.boundingBox.min.x, v.x);
        result.boundingBox.min.y = Math.min(result.boundingBox.min.y, v.y);
        result.boundingBox.min.z = Math.min(result.boundingBox.min.z, v.z);
        result.boundingBox.max.x = Math.max(result.boundingBox.max.x, v.x);
        result.boundingBox.max.y = Math.max(result.boundingBox.max.y, v.y);
        result.boundingBox.max.z = Math.max(result.boundingBox.max.z, v.z);
      });
    }
    // Calculate volume using divergence theorem (sum of signed tetrahedra volumes)
    let totalVolume = 0;
    let weightedCentroid = { x: 0, y: 0, z: 0 };

    solid.faces.forEach(face => {
      if (!face.vertices || face.vertices.length < 3) return;

      // Triangulate face and sum tetrahedra volumes
      for (let i = 1; i < face.vertices.length - 1; i++) {
        const v0 = solid.vertices[face.vertices[0]];
        const v1 = solid.vertices[face.vertices[i]];
        const v2 = solid.vertices[face.vertices[i + 1]];

        if (!v0 || !v1 || !v2) continue;

        // Signed volume of tetrahedron with origin
        const vol = (v0.x * (v1.y * v2.z - v2.y * v1.z) +
                     v1.x * (v2.y * v0.z - v0.y * v2.z) +
                     v2.x * (v0.y * v1.z - v1.y * v0.z)) / 6;

        totalVolume += vol;

        // Weighted centroid contribution
        const tetCentroid = {
          x: (v0.x + v1.x + v2.x) / 4,
          y: (v0.y + v1.y + v2.y) / 4,
          z: (v0.z + v1.z + v2.z) / 4
        };
        weightedCentroid.x += vol * tetCentroid.x;
        weightedCentroid.y += vol * tetCentroid.y;
        weightedCentroid.z += vol * tetCentroid.z;

        // Surface area contribution
        const ax = v1.x - v0.x, ay = v1.y - v0.y, az = v1.z - v0.z;
        const bx = v2.x - v0.x, by = v2.y - v0.y, bz = v2.z - v0.z;
        const crossX = ay * bz - az * by;
        const crossY = az * bx - ax * bz;
        const crossZ = ax * by - ay * bx;
        result.surfaceArea += 0.5 * Math.sqrt(crossX*crossX + crossY*crossY + crossZ*crossZ);
      }
    });

    result.volume = Math.abs(totalVolume);
    result.mass = result.volume * density;

    if (result.volume > 1e-10) {
      result.centroid.x = weightedCentroid.x / totalVolume;
      result.centroid.y = weightedCentroid.y / totalVolume;
      result.centroid.z = weightedCentroid.z / totalVolume;
    }
    return result;
  }
}