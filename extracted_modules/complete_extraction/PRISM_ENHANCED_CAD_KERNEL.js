const PRISM_ENHANCED_CAD_KERNEL = {
  version: '3.0.0',

  // CONSTANTS & TOLERANCES (from OCCT Precision)

  precision: {
    CONFUSION: 1e-7,        // Points considered same
    ANGULAR: 1e-12,         // Parallel/perpendicular test
    PARAMETRIC: 1e-9,       // Parameter space tolerance
    INTERSECTION: 1e-6,     // Intersection tolerance
    APPROXIMATION: 1e-4     // Approximation tolerance
  },
  // ROBUST BOOLEAN OPERATIONS (Based on BOPAlgo approach)

  boolean: {
    /**
     * Main entry point for Boolean operations
     * Based on OCCT BOPAlgo_Builder pattern
     */
    perform(solidA, solidB, operation, options = {}) {
      const result = {
        success: false,
        shape: null,
        errors: [],
        warnings: [],
        statistics: {}
      };
      const startTime = Date.now();

      try {
        // Step 1: Validate inputs
        const validation = this._validateArguments(solidA, solidB, operation);
        if (!validation.valid) {
          result.errors.push(...validation.errors);
          return result;
        }
        // Step 2: Build data structure (like BOPDS_DS)
        const ds = this._buildDataStructure(solidA, solidB);

        // Step 3: Perform intersection (PaveFiller equivalent)
        const intersections = this._performIntersection(ds, options);
        if (intersections.errors.length > 0) {
          result.errors.push(...intersections.errors);
          return result;
        }
        // Step 4: Build splits
        const splits = this._buildSplits(ds, intersections);

        // Step 5: Classify and combine based on operation
        const classified = this._classifyFaces(splits, operation);

        // Step 6: Build result shape
        result.shape = this._buildResult(classified, operation);
        result.success = true;

        result.statistics = {
          processingTime: Date.now() - startTime,
          inputFacesA: solidA.faces?.length || 0,
          inputFacesB: solidB.faces?.length || 0,
          outputFaces: result.shape.faces?.length || 0,
          intersectionCount: intersections.curves.length
        };
      } catch (err) {
        result.errors.push(`Boolean operation failed: ${err.message}`);
        console.error('[ENHANCED_CAD_KERNEL] Boolean error:', err);
      }
      return result;
    },
    /**
     * Boolean Union (FUSE)
     */
    union(solidA, solidB, options = {}) {
      return this.perform(solidA, solidB, 'FUSE', options);
    },
    /**
     * Boolean Subtraction (CUT)
     */
    subtract(solidA, solidB, options = {}) {
      return this.perform(solidA, solidB, 'CUT', options);
    },
    /**
     * Boolean Intersection (COMMON)
     */
    intersect(solidA, solidB, options = {}) {
      return this.perform(solidA, solidB, 'COMMON', options);
    },
    /**
     * Validate arguments (like BOPAlgo_ArgumentAnalyzer)
     */
    _validateArguments(solidA, solidB, operation) {
      const result = { valid: true, errors: [] };

      if (!solidA) {
        result.valid = false;
        result.errors.push('BOPAlgo_AlertNullInputShapes: First argument is null');
      }
      if (!solidB) {
        result.valid = false;
        result.errors.push('BOPAlgo_AlertNullInputShapes: Second argument is null');
      }
      if (!['FUSE', 'CUT', 'COMMON', 'SECTION'].includes(operation)) {
        result.valid = false;
        result.errors.push('BOPAlgo_AlertBOPNotSet: Invalid operation type');
      }
      // Check for self-intersection (simplified)
      if (solidA && this._checkSelfIntersection(solidA)) {
        result.errors.push('BOPAlgo_AlertSelfInterferingShape: Solid A has self-intersection');
      }
      if (solidB && this._checkSelfIntersection(solidB)) {
        result.errors.push('BOPAlgo_AlertSelfInterferingShape: Solid B has self-intersection');
      }
      return result;
    },
    _checkSelfIntersection(solid) {
      // Simplified self-intersection check
      // Full implementation would check face-face overlaps
      return false;
    },
    /**
     * Build data structure (like BOPDS_DS)
     */
    _buildDataStructure(solidA, solidB) {
      const ds = {
        shapes: [solidA, solidB],
        vertices: [],
        edges: [],
        faces: [],
        vertexIndex: new Map(),
        edgeIndex: new Map(),
        faceIndex: new Map()
      };
      // Index all sub-shapes
      [solidA, solidB].forEach((solid, solidIdx) => {
        if (solid.vertices) {
          solid.vertices.forEach((v, i) => {
            const vid = ds.vertices.length;
            ds.vertices.push({ point: v, solidIdx, localIdx: i });
            ds.vertexIndex.set(`${solidIdx}-${i}`, vid);
          });
        }
        if (solid.edges) {
          solid.edges.forEach((e, i) => {
            const eid = ds.edges.length;
            ds.edges.push({ ...e, solidIdx, localIdx: i });
            ds.edgeIndex.set(`${solidIdx}-${i}`, eid);
          });
        }
        if (solid.faces) {
          solid.faces.forEach((f, i) => {
            const fid = ds.faces.length;
            ds.faces.push({ ...f, solidIdx, localIdx: i, splits: [] });
            ds.faceIndex.set(`${solidIdx}-${i}`, fid);
          });
        }
      });

      return ds;
    },
    /**
     * Perform intersection (PaveFiller equivalent)
     */
    _performIntersection(ds, options) {
      const result = {
        curves: [],      // Face-face intersection curves
        points: [],      // Intersection points
        errors: []
      };
      const tol = options.tolerance || PRISM_ENHANCED_CAD_KERNEL.precision.INTERSECTION;

      // Find face-face intersections between the two solids
      const facesA = ds.faces.filter(f => f.solidIdx === 0);
      const facesB = ds.faces.filter(f => f.solidIdx === 1);

      for (const faceA of facesA) {
        for (const faceB of facesB) {
          // Quick bounding box check
          if (!this._boundingBoxOverlap(faceA, faceB)) continue;

          // Perform face-face intersection
          const ffInt = PRISM_ENHANCED_CAD_KERNEL.intersection.faceFace(faceA, faceB, tol);

          if (ffInt.curves.length > 0) {
            result.curves.push({
              faceA: faceA,
              faceB: faceB,
              curves: ffInt.curves
            });
          }
          if (ffInt.points.length > 0) {
            result.points.push(...ffInt.points);
          }
        }
      }
      return result;
    },
    _boundingBoxOverlap(faceA, faceB) {
      const boxA = this._getFaceBoundingBox(faceA);
      const boxB = this._getFaceBoundingBox(faceB);

      if (!boxA || !boxB) return true; // Assume overlap if can't compute

      const tol = PRISM_ENHANCED_CAD_KERNEL.precision.CONFUSION;

      return !(boxA.max.x < boxB.min.x - tol || boxA.min.x > boxB.max.x + tol ||
               boxA.max.y < boxB.min.y - tol || boxA.min.y > boxB.max.y + tol ||
               boxA.max.z < boxB.min.z - tol || boxA.min.z > boxB.max.z + tol);
    },
    _getFaceBoundingBox(face) {
      if (face.boundingBox) return face.boundingBox;

      const verts = face.vertices || face.points || [];
      if (verts.length === 0) return null;

      const box = {
        min: { x: Infinity, y: Infinity, z: Infinity },
        max: { x: -Infinity, y: -Infinity, z: -Infinity }
      };
      verts.forEach(v => {
        box.min.x = Math.min(box.min.x, v.x);
        box.min.y = Math.min(box.min.y, v.y);
        box.min.z = Math.min(box.min.z, v.z);
        box.max.x = Math.max(box.max.x, v.x);
        box.max.y = Math.max(box.max.y, v.y);
        box.max.z = Math.max(box.max.z, v.z);
      });

      face.boundingBox = box;
      return box;
    },
    /**
     * Build face splits from intersections
     */
    _buildSplits(ds, intersections) {
      const splits = {
        facesA: [],
        facesB: []
      };
      // Clone faces from each solid
      ds.faces.filter(f => f.solidIdx === 0).forEach(f => {
        splits.facesA.push({ ...f, splitCurves: [] });
      });
      ds.faces.filter(f => f.solidIdx === 1).forEach(f => {
        splits.facesB.push({ ...f, splitCurves: [] });
      });

      // Add intersection curves to relevant faces
      for (const intData of intersections.curves) {
        // Find face in splits
        const faceAIdx = splits.facesA.findIndex(f =>
          f.localIdx === intData.faceA.localIdx);
        const faceBIdx = splits.facesB.findIndex(f =>
          f.localIdx === intData.faceB.localIdx);

        if (faceAIdx >= 0) {
          splits.facesA[faceAIdx].splitCurves.push(...intData.curves);
        }
        if (faceBIdx >= 0) {
          splits.facesB[faceBIdx].splitCurves.push(...intData.curves);
        }
      }
      // Perform actual face splitting
      splits.facesA = splits.facesA.map(f => this._splitFace(f));
      splits.facesB = splits.facesB.map(f => this._splitFace(f));

      return splits;
    },
    _splitFace(face) {
      if (!face.splitCurves || face.splitCurves.length === 0) {
        return [face]; // No splitting needed
      }
      // Simplified face splitting - in full implementation would use
      // curve-based face partitioning
      // For now, return face as-is (splits handled in classification)
      return [face];
    },
    /**
     * Classify faces based on operation (TopAbs_State)
     */
    _classifyFaces(splits, operation) {
      const result = {
        keep: [],
        discard: []
      };
      // Flatten splits
      const allFacesA = splits.facesA.flat();
      const allFacesB = splits.facesB.flat();

      // Classify based on operation type
      switch (operation) {
        case 'FUSE':
          // Keep faces from A that are OUT of B
          // Keep faces from B that are OUT of A
          allFacesA.forEach(f => {
            const state = this._classifyFaceState(f, splits.facesB, 'B');
            if (state === 'OUT') result.keep.push(f);
          });
          allFacesB.forEach(f => {
            const state = this._classifyFaceState(f, splits.facesA, 'A');
            if (state === 'OUT') result.keep.push(f);
          });
          break;

        case 'CUT':
          // Keep faces from A that are OUT of B
          // Keep faces from B that are IN A (inverted)
          allFacesA.forEach(f => {
            const state = this._classifyFaceState(f, splits.facesB, 'B');
            if (state === 'OUT') result.keep.push(f);
          });
          allFacesB.forEach(f => {
            const state = this._classifyFaceState(f, splits.facesA, 'A');
            if (state === 'IN') {
              // Invert the face normal
              result.keep.push(this._invertFace(f));
            }
          });
          break;

        case 'COMMON':
          // Keep faces from A that are IN B
          // Keep faces from B that are IN A
          allFacesA.forEach(f => {
            const state = this._classifyFaceState(f, splits.facesB, 'B');
            if (state === 'IN') result.keep.push(f);
          });
          allFacesB.forEach(f => {
            const state = this._classifyFaceState(f, splits.facesA, 'A');
            if (state === 'IN') result.keep.push(f);
          });
          break;

        case 'SECTION':
          // Keep only intersection curves (as edges)
          // This is handled separately
          break;
      }
      return result;
    },
    _classifyFaceState(face, otherFaces, otherSolid) {
      // Get face centroid
      const centroid = this._getFaceCentroid(face);
      if (!centroid) return 'UNKNOWN';

      // Cast ray from centroid along face normal
      const normal = face.normal || this._computeFaceNormal(face);
      if (!normal) return 'OUT';

      // Count intersections with other solid's faces
      const rayOrigin = {
        x: centroid.x + normal.x * 0.0001,
        y: centroid.y + normal.y * 0.0001,
        z: centroid.z + normal.z * 0.0001
      };
      let intersectionCount = 0;

      for (const otherFace of otherFaces.flat()) {
        const hit = this._rayFaceIntersect(rayOrigin, normal, otherFace);
        if (hit && hit.t > 0) {
          intersectionCount++;
        }
      }
      // Odd count = inside, even = outside
      return (intersectionCount % 2 === 1) ? 'IN' : 'OUT';
    },
    _getFaceCentroid(face) {
      const verts = face.vertices || face.points || [];
      if (verts.length === 0) return null;

      const sum = verts.reduce((acc, v) => ({
        x: acc.x + v.x,
        y: acc.y + v.y,
        z: acc.z + v.z
      }), { x: 0, y: 0, z: 0 });

      return {
        x: sum.x / verts.length,
        y: sum.y / verts.length,
        z: sum.z / verts.length
      };
    },
    _computeFaceNormal(face) {
      const verts = face.vertices || face.points || [];
      if (verts.length < 3) return null;

      const v0 = verts[0], v1 = verts[1], v2 = verts[2];
      const u = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
      const v = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };

      const n = {
        x: u.y * v.z - u.z * v.y,
        y: u.z * v.x - u.x * v.z,
        z: u.x * v.y - u.y * v.x
      };
      const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
      if (len < 1e-10) return null;

      return { x: n.x / len, y: n.y / len, z: n.z / len };
    },
    _rayFaceIntersect(origin, direction, face) {
      const verts = face.vertices || face.points || [];
      if (verts.length < 3) return null;

      // Möller–Trumbore intersection algorithm for first triangle
      const v0 = verts[0], v1 = verts[1], v2 = verts[2];

      const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
      const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };

      const h = {
        x: direction.y * edge2.z - direction.z * edge2.y,
        y: direction.z * edge2.x - direction.x * edge2.z,
        z: direction.x * edge2.y - direction.y * edge2.x
      };
      const a = edge1.x * h.x + edge1.y * h.y + edge1.z * h.z;
      if (Math.abs(a) < 1e-10) return null;

      const f = 1.0 / a;
      const s = { x: origin.x - v0.x, y: origin.y - v0.y, z: origin.z - v0.z };
      const u = f * (s.x * h.x + s.y * h.y + s.z * h.z);

      if (u < 0 || u > 1) return null;

      const q = {
        x: s.y * edge1.z - s.z * edge1.y,
        y: s.z * edge1.x - s.x * edge1.z,
        z: s.x * edge1.y - s.y * edge1.x
      };
      const v = f * (direction.x * q.x + direction.y * q.y + direction.z * q.z);
      if (v < 0 || u + v > 1) return null;

      const t = f * (edge2.x * q.x + edge2.y * q.y + edge2.z * q.z);

      return { t, u, v };
    },
    _invertFace(face) {
      const inverted = { ...face };

      // Reverse vertex order
      if (inverted.vertices) {
        inverted.vertices = [...inverted.vertices].reverse();
      }
      if (inverted.points) {
        inverted.points = [...inverted.points].reverse();
      }
      // Invert normal
      if (inverted.normal) {
        inverted.normal = {
          x: -inverted.normal.x,
          y: -inverted.normal.y,
          z: -inverted.normal.z
        };
      }
      return inverted;
    },
    /**
     * Build final result shape
     */
    _buildResult(classified, operation) {
      const result = {
        faces: classified.keep,
        vertices: [],
        edges: [],
        type: 'solid'
      };
      // Collect unique vertices from all faces
      const vertexMap = new Map();
      const tolerance = PRISM_ENHANCED_CAD_KERNEL.precision.CONFUSION;

      classified.keep.forEach(face => {
        const verts = face.vertices || face.points || [];
        verts.forEach(v => {
          const key = `${Math.round(v.x / tolerance)}_${Math.round(v.y / tolerance)}_${Math.round(v.z / tolerance)}`;
          if (!vertexMap.has(key)) {
            vertexMap.set(key, v);
          }
        });
      });
      result.vertices = Array.from(vertexMap.values());

      // Build edges from faces (simplified)
      const edgeSet = new Set();
      classified.keep.forEach(face => {
        const verts = face.vertices || face.points || [];
        for (let i = 0; i < verts.length; i++) {
          const v1 = verts[i];
          const v2 = verts[(i + 1) % verts.length];
          const edgeKey = this._makeEdgeKey(v1, v2);
          edgeSet.add(edgeKey);
        }
      });
      result.edges = Array.from(edgeSet).map(key => {
        const [v1Str, v2Str] = key.split('|');
        return {
          start: this._parseVertexFromString(v1Str),
          end: this._parseVertexFromString(v2Str)
        };
      });

      return result;
    },
    _makeEdgeKey(v1, v2) {
      const tol = PRISM_ENHANCED_CAD_KERNEL.precision.CONFUSION;
      const s1 = `${Math.round(v1.x / tol)},${Math.round(v1.y / tol)},${Math.round(v1.z / tol)}`;
      const s2 = `${Math.round(v2.x / tol)},${Math.round(v2.y / tol)},${Math.round(v2.z / tol)}`;
      return s1 < s2 ? `${s1}|${s2}` : `${s2}|${s1}`;
    },
    _parseVertexFromString(str) {
      const [x, y, z] = str.split(',').map(Number);
      const tol = PRISM_ENHANCED_CAD_KERNEL.precision.CONFUSION;
      return { x: x * tol, y: y * tol, z: z * tol };
    }
  },
  // INTERSECTION ALGORITHMS

  intersection: {
    /**
     * Face-Face intersection (IntPatch_Intersection equivalent)
     */
    faceFace(faceA, faceB, tolerance = 1e-6) {
      const result = {
        curves: [],
        points: [],
        success: false
      };
      try {
        // Get surface representations
        const surfaceA = this._getFaceSurface(faceA);
        const surfaceB = this._getFaceSurface(faceB);

        if (!surfaceA || !surfaceB) {
          return result;
        }
        // Perform surface-surface intersection
        const intResult = this._intersectSurfaces(surfaceA, surfaceB, tolerance);
        result.curves = intResult.curves || [];
        result.points = intResult.points || [];
        result.success = intResult.curves.length > 0 || intResult.points.length > 0;
      } catch (err) {
        console.error('[INTERSECTION] Face-Face error:', err);
      }
      return result;
    },
    _getFaceSurface(face) {
      // Extract surface from face
      if (face.surface) return face.surface;

      // For planar faces, create plane representation
      if (face.type === 'plane' || this._isCoplanar(face)) {
        const normal = face.normal || this._computePlaneNormal(face);
        const point = face.vertices?.[0] || face.points?.[0];
        if (normal && point) {
          const d = -(normal.x * point.x + normal.y * point.y + normal.z * point.z);
          return {
            type: 'plane',
            normal,
            d,
            bounds: this._getFaceBounds(face)
          };
        }
      }
      // For curved surfaces, would need more complex handling
      return null;
    },
    _isCoplanar(face) {
      const verts = face.vertices || face.points || [];
      if (verts.length < 4) return true;

      const normal = this._computePlaneNormal(face);
      if (!normal) return false;

      const tolerance = PRISM_ENHANCED_CAD_KERNEL.precision.CONFUSION;
      const d = -(normal.x * verts[0].x + normal.y * verts[0].y + normal.z * verts[0].z);

      for (let i = 1; i < verts.length; i++) {
        const distance = Math.abs(normal.x * verts[i].x + normal.y * verts[i].y + normal.z * verts[i].z + d);
        if (distance > tolerance) return false;
      }
      return true;
    },
    _computePlaneNormal(face) {
      const verts = face.vertices || face.points || [];
      if (verts.length < 3) return null;

      // Use Newell's method for robust normal calculation
      let normal = { x: 0, y: 0, z: 0 };
      for (let i = 0; i < verts.length; i++) {
        const curr = verts[i];
        const next = verts[(i + 1) % verts.length];

        normal.x += (curr.y - next.y) * (curr.z + next.z);
        normal.y += (curr.z - next.z) * (curr.x + next.x);
        normal.z += (curr.x - next.x) * (curr.y + next.y);
      }
      const len = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
      if (len < 1e-10) return null;

      return { x: normal.x / len, y: normal.y / len, z: normal.z / len };
    },
    _getFaceBounds(face) {
      const verts = face.vertices || face.points || [];
      if (verts.length === 0) return null;

      const bounds = {
        min: { x: Infinity, y: Infinity, z: Infinity },
        max: { x: -Infinity, y: -Infinity, z: -Infinity }
      };
      verts.forEach(v => {
        bounds.min.x = Math.min(bounds.min.x, v.x);
        bounds.min.y = Math.min(bounds.min.y, v.y);
        bounds.min.z = Math.min(bounds.min.z, v.z);
        bounds.max.x = Math.max(bounds.max.x, v.x);
        bounds.max.y = Math.max(bounds.max.y, v.y);
        bounds.max.z = Math.max(bounds.max.z, v.z);
      });
      return bounds;
    },
    _intersectSurfaces(surfaceA, surfaceB, tolerance) {
      const result = { curves: [], points: [] };

      if (surfaceA.type === 'plane' && surfaceB.type === 'plane') {
        return this._intersectPlanePlane(surfaceA, surfaceB, tolerance);
      }
      // Other surface combinations would be handled here
      return result;
    },
    _intersectPlanePlane(planeA, planeB, tolerance) {
      const result = { curves: [], points: [] };

      const n1 = planeA.normal;
      const n2 = planeB.normal;
      const d1 = planeA.d;
      const d2 = planeB.d;

      // Check if planes are parallel
      const cross = {
        x: n1.y * n2.z - n1.z * n2.y,
        y: n1.z * n2.x - n1.x * n2.z,
        z: n1.x * n2.y - n1.y * n2.x
      };
      const crossLen = Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);

      if (crossLen < PRISM_ENHANCED_CAD_KERNEL.precision.ANGULAR) {
        // Planes are parallel - check if coincident
        const distance = Math.abs(d1 - d2) / Math.sqrt(n1.x * n1.x + n1.y * n1.y + n1.z * n1.z);
        if (distance < tolerance) {
          // Planes are coincident - intersection is the overlap region
          // This would require more complex polygon clipping
        }
        return result;
      }
      // Planes intersect in a line
      const direction = { x: cross.x / crossLen, y: cross.y / crossLen, z: cross.z / crossLen };

      // Find a point on the intersection line
      let point;
      if (Math.abs(cross.z) > Math.abs(cross.x) && Math.abs(cross.z) > Math.abs(cross.y)) {
        // Solve in x-y plane
        const det = n1.x * n2.y - n1.y * n2.x;
        if (Math.abs(det) > tolerance) {
          point = {
            x: (n2.y * d1 - n1.y * d2) / det,
            y: (n1.x * d2 - n2.x * d1) / det,
            z: 0
          };
        }
      } else if (Math.abs(cross.y) > Math.abs(cross.x)) {
        // Solve in x-z plane
        const det = n1.x * n2.z - n1.z * n2.x;
        if (Math.abs(det) > tolerance) {
          point = {
            x: (n2.z * d1 - n1.z * d2) / det,
            y: 0,
            z: (n1.x * d2 - n2.x * d1) / det
          };
        }
      } else {
        // Solve in y-z plane
        const det = n1.y * n2.z - n1.z * n2.y;
        if (Math.abs(det) > tolerance) {
          point = {
            x: 0,
            y: (n2.z * d1 - n1.z * d2) / det,
            z: (n1.y * d2 - n2.y * d1) / det
          };
        }
      }
      if (point) {
        // Create intersection curve (infinite line, would need to clip to face bounds)
        result.curves.push({
          type: 'line',
          point,
          direction,
          parameter: { min: -Infinity, max: Infinity }
        });
      }
      return result;
    }
  },
  // UTILITY FUNCTIONS

  utils: {
    /**
     * Compute distance between points
     */
    pointDistance(p1, p2) {
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const dz = p1.z - p2.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },
    /**
     * Check if points are within tolerance
     */
    pointsEqual(p1, p2, tolerance = null) {
      tolerance = tolerance || PRISM_ENHANCED_CAD_KERNEL.precision.CONFUSION;
      return this.pointDistance(p1, p2)