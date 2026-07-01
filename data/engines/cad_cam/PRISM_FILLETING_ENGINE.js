/**
 * PRISM_FILLETING_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 402
 * Session: R2.3.1 Engine Gap Extraction Round 3
 */

const PRISM_FILLETING_ENGINE = {
  version: '1.0.0',

  /**
   * Apply constant radius fillet to edges
   */
  filletEdges(solid, edgeIndices, radius) {
    const result = {
      success: false,
      solid: null,
      filletedEdges: [],
      errors: []
    };
    if (!solid || !edgeIndices || edgeIndices.length === 0) {
      result.errors.push('Invalid input: solid or edges missing');
      return result;
    }
    if (radius <= 0) {
      result.errors.push('Radius must be positive');
      return result;
    }
    try {
      // Clone solid
      result.solid = JSON.parse(JSON.stringify(solid));

      // Process each edge
      for (const edgeIdx of edgeIndices) {
        const filletResult = this._filletSingleEdge(result.solid, edgeIdx, radius);
        if (filletResult.success) {
          result.filletedEdges.push(edgeIdx);
        } else {
          result.errors.push(`Failed to fillet edge ${edgeIdx}: ${filletResult.error}`);
        }
      }
      result.success = result.filletedEdges.length > 0;

    } catch (err) {
      result.errors.push(`Filleting failed: ${err.message}`);
    }
    return result;
  },
  _filletSingleEdge(solid, edgeIdx, radius) {
    const result = { success: false, error: null };

    const edge = solid.edges?.[edgeIdx];
    if (!edge) {
      result.error = 'Edge not found';
      return result;
    }
    // Get adjacent faces
    const adjacentFaces = this._getAdjacentFaces(solid, edgeIdx);
    if (adjacentFaces.length !== 2) {
      result.error = `Edge has ${adjacentFaces.length} faces, need exactly 2`;
      return result;
    }
    // Check max radius
    const maxRadius = this._calculateMaxRadius(solid, edge, adjacentFaces);
    if (radius > maxRadius) {
      result.error = `Radius ${radius} exceeds maximum ${maxRadius.toFixed(3)}`;
      return result;
    }
    // Generate fillet geometry using rolling ball method
    const filletGeom = this._generateRollingBallFillet(solid, edge, adjacentFaces, radius);
    if (!filletGeom) {
      result.error = 'Failed to generate fillet geometry';
      return result;
    }
    // Insert fillet faces and update topology
    this._insertFilletGeometry(solid, edgeIdx, adjacentFaces, filletGeom);

    result.success = true;
    return result;
  },
  _getAdjacentFaces(solid, edgeIdx) {
    const faces = [];
    if (solid.faces) {
      solid.faces.forEach((face, faceIdx) => {
        if (face.edges && face.edges.includes(edgeIdx)) {
          faces.push({ faceIdx, face });
        }
      });
    }
    return faces;
  },
  _calculateMaxRadius(solid, edge, adjacentFaces) {
    // Max radius based on edge length and face geometry
    let minDist = Infinity;

    // Edge length limit
    const startV = solid.vertices[edge.startVertex];
    const endV = solid.vertices[edge.endVertex];
    if (startV && endV) {
      const edgeLen = Math.sqrt(
        Math.pow(endV.x - startV.x, 2) +
        Math.pow(endV.y - startV.y, 2) +
        Math.pow(endV.z - startV.z, 2)
      );
      minDist = Math.min(minDist, edgeLen / 2);
    }
    // Face width limit (simplified)
    adjacentFaces.forEach(({ face }) => {
      if (face.width) minDist = Math.min(minDist, face.width / 2);
    });

    return minDist * 0.9; // 90% safety factor
  },
  _generateRollingBallFillet(solid, edge, adjacentFaces, radius) {
    // Generate fillet surface using rolling ball algorithm
    const segments = 8; // Segments per quadrant
    const vertices = [];
    const faces = [];

    const startV = solid.vertices[edge.startVertex];
    const endV = solid.vertices[edge.endVertex];
    if (!startV || !endV) return null;

    // Edge direction
    const edgeDir = {
      x: endV.x - startV.x,
      y: endV.y - startV.y,
      z: endV.z - startV.z
    };
    const edgeLen = Math.sqrt(edgeDir.x*edgeDir.x + edgeDir.y*edgeDir.y + edgeDir.z*edgeDir.z);
    edgeDir.x /= edgeLen;
    edgeDir.y /= edgeLen;
    edgeDir.z /= edgeLen;

    // Generate arc profile along edge
    const numEdgeSteps = Math.max(3, Math.floor(edgeLen / radius) + 1);

    for (let i = 0; i <= numEdgeSteps; i++) {
      const t = i / numEdgeSteps;
      const basePoint = {
        x: startV.x + t * (endV.x - startV.x),
        y: startV.y + t * (endV.y - startV.y),
        z: startV.z + t * (endV.z - startV.z)
      };
      // Generate arc cross-section
      for (let j = 0; j <= segments; j++) {
        const angle = (j / segments) * Math.PI / 2; // Quarter arc
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Offset from edge (simplified - assumes planar)
        vertices.push({
          x: basePoint.x + radius * (cos - 1),
          y: basePoint.y,
          z: basePoint.z + radius * (sin - 1)
        });
      }
    }
    // Generate faces
    const stride = segments + 1;
    for (let i = 0; i < numEdgeSteps; i++) {
      for (let j = 0; j < segments; j++) {
        const v0 = i * stride + j;
        const v1 = i * stride + j + 1;
        const v2 = (i + 1) * stride + j + 1;
        const v3 = (i + 1) * stride + j;

        faces.push({ vertices: [v0, v1, v2] });
        faces.push({ vertices: [v0, v2, v3] });
      }
    }
    return { vertices, faces, radius };
  },
  _insertFilletGeometry(solid, edgeIdx, adjacentFaces, filletGeom) {
    // Add fillet vertices
    const vertexOffset = solid.vertices.length;
    solid.vertices.push(...filletGeom.vertices);

    // Add fillet faces with adjusted vertex indices
    filletGeom.faces.forEach(face => {
      solid.faces.push({
        type: 'fillet',
        radius: filletGeom.radius,
        vertices: face.vertices.map(v => v + vertexOffset)
      });
    });

    // Mark original edge as filleted
    if (solid.edges[edgeIdx]) {
      solid.edges[edgeIdx].filleted = true;
      solid.edges[edgeIdx].filletRadius = filletGeom.radius;
    }
  },
  /**
   * Apply variable radius fillet
   */
  variableRadiusFillet(solid, edgeIdx, radiusStart, radiusEnd) {
    // Similar to constant radius but interpolate radius along edge
    const result = {
      success: false,
      solid: null,
      error: null
    };
    if (!solid || edgeIdx === undefined) {
      result.error = 'Invalid input';
      return result;
    }
    try {
      result.solid = JSON.parse(JSON.stringify(solid));

      const edge = result.solid.edges?.[edgeIdx];
      if (!edge) {
        result.error = 'Edge not found';
        return result;
      }
      const adjacentFaces = this._getAdjacentFaces(result.solid, edgeIdx);
      if (adjacentFaces.length !== 2) {
        result.error = 'Edge must have exactly 2 adjacent faces';
        return result;
      }
      // Generate variable fillet with interpolated radius
      const filletGeom = this._generateVariableRadiusFillet(
        result.solid, edge, adjacentFaces, radiusStart, radiusEnd
      );

      if (filletGeom) {
        this._insertFilletGeometry(result.solid, edgeIdx, adjacentFaces, filletGeom);
        result.success = true;
      } else {
        result.error = 'Failed to generate variable radius fillet';
      }
    } catch (err) {
      result.error = err.message;
    }
    return result;
  },
  _generateVariableRadiusFillet(solid, edge, adjacentFaces, radiusStart, radiusEnd) {
    // Similar to rolling ball but with interpolated radius
    const segments = 8;
    const vertices = [];
    const faces = [];

    const startV = solid.vertices[edge.startVertex];
    const endV = solid.vertices[edge.endVertex];
    if (!startV || !endV) return null;

    const edgeLen = Math.sqrt(
      Math.pow(endV.x - startV.x, 2) +
      Math.pow(endV.y - startV.y, 2) +
      Math.pow(endV.z - startV.z, 2)
    );

    const numEdgeSteps = Math.max(5, Math.floor(edgeLen / Math.min(radiusStart, radiusEnd)) + 1);

    for (let i = 0; i <= numEdgeSteps; i++) {
      const t = i / numEdgeSteps;
      const radius = radiusStart + t * (radiusEnd - radiusStart);

      const basePoint = {
        x: startV.x + t * (endV.x - startV.x),
        y: startV.y + t * (endV.y - startV.y),
        z: startV.z + t * (endV.z - startV.z)
      };
      for (let j = 0; j <= segments; j++) {
        const angle = (j / segments) * Math.PI / 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        vertices.push({
          x: basePoint.x + radius * (cos - 1),
          y: basePoint.y,
          z: basePoint.z + radius * (sin - 1)
        });
      }
    }
    // Generate faces
    const stride = segments + 1;
    for (let i = 0; i < numEdgeSteps; i++) {
      for (let j = 0; j < segments; j++) {
        const v0 = i * stride + j;
        const v1 = i * stride + j + 1;
        const v2 = (i + 1) * stride + j + 1;
        const v3 = (i + 1) * stride + j;

        faces.push({ vertices: [v0, v1, v2] });
        faces.push({ vertices: [v0, v2, v3] });
      }
    }
    return { vertices, faces, radius: (radiusStart + radiusEnd) / 2 };
  },
  /**
   * Apply chamfer to edges
   */
  chamferEdges(solid, edgeIndices, distance1, distance2 = null) {
    const d2 = distance2 || distance1;

    const result = {
      success: false,
      solid: null,
      chamferedEdges: [],
      errors: []
    };
    if (!solid || !edgeIndices) {
      result.errors.push('Invalid input');
      return result;
    }
    try {
      result.solid = JSON.parse(JSON.stringify(solid));

      for (const edgeIdx of edgeIndices) {
        const edge = result.solid.edges?.[edgeIdx];
        if (!edge) continue;

        const adjacentFaces = this._getAdjacentFaces(result.solid, edgeIdx);
        if (adjacentFaces.length !== 2) continue;

        // Generate flat chamfer surface
        const chamferGeom = this._generateChamfer(result.solid, edge, adjacentFaces, distance1, d2);
        if (chamferGeom) {
          this._insertChamferGeometry(result.solid, edgeIdx, adjacentFaces, chamferGeom);
          result.chamferedEdges.push(edgeIdx);
        }
      }
      result.success = result.chamferedEdges.length > 0;

    } catch (err) {
      result.errors.push(err.message);
    }
    return result;
  },
  _generateChamfer(solid, edge, adjacentFaces, d1, d2) {
    const vertices = [];
    const faces = [];

    const startV = solid.vertices[edge.startVertex];
    const endV = solid.vertices[edge.endVertex];
    if (!startV || !endV) return null;

    // Create chamfer plane vertices (simplified planar chamfer)
    vertices.push(
      { x: startV.x - d1, y: startV.y, z: startV.z },
      { x: startV.x, y: startV.y, z: startV.z - d2 },
      { x: endV.x - d1, y: endV.y, z: endV.z },
      { x: endV.x, y: endV.y, z: endV.z - d2 }
    );

    faces.push(
      { vertices: [0, 1, 3] },
      { vertices: [0, 3, 2] }
    );

    return { vertices, faces, distances: [d1, d2] };
  },
  _insertChamferGeometry(solid, edgeIdx, adjacentFaces, chamferGeom) {
    const vertexOffset = solid.vertices.length;
    solid.vertices.push(...chamferGeom.vertices);

    chamferGeom.faces.forEach(face => {
      solid.faces.push({
        type: 'chamfer',
        distances: chamferGeom.distances,
        vertices: face.vertices.map(v => v + vertexOffset)
      });
    });

    if (solid.edges[edgeIdx]) {
      solid.edges[edgeIdx].chamfered = true;
      solid.edges[edgeIdx].chamferDistances = chamferGeom.distances;
    }
  },
  /**
   * Preview fillet without modifying solid
   */
  previewFillet(solid, edgeIndices, radius) {
    const preview = {
      curves: [],
      surfaces: [],
      valid: true
    };
    for (const edgeIdx of edgeIndices) {
      const edge = solid.edges?.[edgeIdx];
      if (!edge) continue;

      const maxRadius = this._calculateMaxRadius(solid, edge,
        this._getAdjacentFaces(solid, edgeIdx));

      if (radius > maxRadius) {
        preview.valid = false;
        preview.curves.push({
          edgeIdx,
          error: `Radius exceeds maximum ${maxRadius.toFixed(3)}`
        });
        continue;
      }
      // Generate preview curve at edge
      const startV = solid.vertices[edge.startVertex];
      const endV = solid.vertices[edge.endVertex];
      if (startV && endV) {
        preview.curves.push({
          edgeIdx,
          radius,
          start: { ...startV },
          end: { ...endV }
        });
      }
    }
    return preview;
  }
}