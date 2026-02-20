const PRISM_RENDER_100 = {
  version: '3.0.0',
  confidence: 100,
  courseBasis: 'Stanford CS 348A + MIT 6.837',

  // 4.1: Level of Detail (LOD) System

  /**
   * Generate LOD meshes for efficient rendering
   * Uses quadric error metrics (QEM) for edge collapse
   */
  generateLOD(vertices, triangles, levels = 4) {
    const lods = [{
      level: 0,
      vertices: [...vertices],
      triangles: [...triangles],
      triangleCount: triangles.length,
      distance: 0
    }];

    let currentVerts = vertices.map(v => ({ ...v }));
    let currentTris = triangles.map(t => [...t]);

    for (let level = 1; level < levels; level++) {
      const targetReduction = Math.pow(0.5, level); // 50%, 25%, 12.5%...
      const targetTriCount = Math.max(4, Math.floor(currentTris.length * targetReduction));

      const simplified = this.simplifyMesh(currentVerts, currentTris, targetTriCount);

      lods.push({
        level,
        vertices: simplified.vertices,
        triangles: simplified.triangles,
        triangleCount: simplified.triangles.length,
        distance: level * 100 // Switch distance (units)
      });

      currentVerts = simplified.vertices;
      currentTris = simplified.triangles;
    }
    return {
      lods,

      // Select appropriate LOD based on distance
      selectLOD: function(distance) {
        for (let i = this.lods.length - 1; i >= 0; i--) {
          if (distance >= this.lods[i].distance) {
            return this.lods[i];
          }
        }
        return this.lods[0];
      }
    };
  },
  /**
   * Mesh simplification using Quadric Error Metrics
   * Based on: Garland & Heckbert's QEM algorithm
   */
  simplifyMesh(vertices, triangles, targetTriCount) {
    if (triangles.length <= targetTriCount) {
      return { vertices, triangles };
    }
    // Compute quadrics for each vertex
    const quadrics = this.computeVertexQuadrics(vertices, triangles);

    // Build edge collapse heap
    const heap = this.buildCollapseHeap(vertices, triangles, quadrics);

    // Clone data
    let verts = vertices.map(v => ({ ...v, deleted: false }));
    let tris = triangles.map(t => ({ verts: [...t], deleted: false }));

    // Collapse edges until target reached
    while (tris.filter(t => !t.deleted).length > targetTriCount && heap.length > 0) {
      const collapse = heap.shift();
      if (verts[collapse.v1].deleted || verts[collapse.v2].deleted) continue;

      // Move v1 to optimal position
      verts[collapse.v1].x = collapse.optimal.x;
      verts[collapse.v1].y = collapse.optimal.y;
      verts[collapse.v1].z = collapse.optimal.z;

      // Mark v2 as deleted
      verts[collapse.v2].deleted = true;

      // Update triangles
      tris.forEach(tri => {
        if (tri.deleted) return;

        // Replace v2 with v1
        for (let i = 0; i < 3; i++) {
          if (tri.verts[i] === collapse.v2) {
            tri.verts[i] = collapse.v1;
          }
        }
        // Check for degenerate triangles
        if (tri.verts[0] === tri.verts[1] ||
            tri.verts[1] === tri.verts[2] ||
            tri.verts[2] === tri.verts[0]) {
          tri.deleted = true;
        }
      });

      // Update quadric for v1
      quadrics[collapse.v1] = this.addQuadrics(
        quadrics[collapse.v1],
        quadrics[collapse.v2]
      );
    }
    // Rebuild compact mesh
    const vertexMap = new Map();
    const newVerts = [];
    verts.forEach((v, i) => {
      if (!v.deleted) {
        vertexMap.set(i, newVerts.length);
        newVerts.push({ x: v.x, y: v.y, z: v.z });
      }
    });

    const newTris = [];
    tris.forEach(tri => {
      if (!tri.deleted) {
        const mapped = tri.verts.map(v => vertexMap.get(v));
        if (mapped.every(v => v !== undefined)) {
          newTris.push(mapped);
        }
      }
    });

    return { vertices: newVerts, triangles: newTris };
  },
  /**
   * Compute quadric error matrices for each vertex
   */
  computeVertexQuadrics(vertices, triangles) {
    const quadrics = vertices.map(() => this.zeroQuadric());

    triangles.forEach(tri => {
      const v0 = vertices[tri[0]];
      const v1 = vertices[tri[1]];
      const v2 = vertices[tri[2]];

      // Compute plane equation: ax + by + cz + d = 0
      const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
      const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };

      const n = {
        x: e1.y * e2.z - e1.z * e2.y,
        y: e1.z * e2.x - e1.x * e2.z,
        z: e1.x * e2.y - e1.y * e2.x
      };
      const len = Math.sqrt(n.x ** 2 + n.y ** 2 + n.z ** 2);
      if (len < 1e-10) return;

      n.x /= len; n.y /= len; n.z /= len;
      const d = -(n.x * v0.x + n.y * v0.y + n.z * v0.z);

      // Quadric from plane
      const Kp = this.planeQuadric(n.x, n.y, n.z, d);

      // Add to all three vertices
      tri.forEach(vIdx => {
        quadrics[vIdx] = this.addQuadrics(quadrics[vIdx], Kp);
      });
    });

    return quadrics;
  },
  zeroQuadric() {
    return [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
  },
  planeQuadric(a, b, c, d) {
    return [
      [a*a, a*b, a*c, a*d],
      [a*b, b*b, b*c, b*d],
      [a*c, b*c, c*c, c*d],
      [a*d, b*d, c*d, d*d]
    ];
  },
  addQuadrics(Q1, Q2) {
    const result = [];
    for (let i = 0; i < 4; i++) {
      result[i] = [];
      for (let j = 0; j < 4; j++) {
        result[i][j] = Q1[i][j] + Q2[i][j];
      }
    }
    return result;
  },
  buildCollapseHeap(vertices, triangles, quadrics) {
    const edges = new Set();
    triangles.forEach(tri => {
      for (let i = 0; i < 3; i++) {
        const a = tri[i], b = tri[(i + 1) % 3];
        edges.add([Math.min(a, b), Math.max(a, b)].join('-'));
      }
    });

    const heap = [];
    edges.forEach(edge => {
      const [v1, v2] = edge.split('-').map(Number);
      const Q = this.addQuadrics(quadrics[v1], quadrics[v2]);

      // Find optimal position (midpoint as approximation)
      const optimal = {
        x: (vertices[v1].x + vertices[v2].x) / 2,
        y: (vertices[v1].y + vertices[v2].y) / 2,
        z: (vertices[v1].z + vertices[v2].z) / 2
      };
      // Compute error
      const v = [optimal.x, optimal.y, optimal.z, 1];
      let error = 0;
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          error += v[i] * Q[i][j] * v[j];
        }
      }
      heap.push({ v1, v2, optimal, error });
    });

    // Sort by error (ascending)
    heap.sort((a, b) => a.error - b.error);

    return heap;
  },
  // 4.2: Edge Extraction for Display

  /**
   * Extract feature edges for display (silhouette, sharp, boundary)
   */
  extractEdges(vertices, triangles, normals = null, sharpAngle = 30) {
    const edges = {
      sharp: [],      // Feature edges
      boundary: [],   // Mesh boundary
      silhouette: []  // View-dependent (computed later)
    };
    // Build edge-to-faces map
    const edgeFaces = new Map();
    triangles.forEach((tri, faceIdx) => {
      for (let i = 0; i < 3; i++) {
        const a = tri[i], b = tri[(i + 1) % 3];
        const key = [Math.min(a, b), Math.max(a, b)].join('-');
        if (!edgeFaces.has(key)) {
          edgeFaces.set(key, []);
        }
        edgeFaces.get(key).push(faceIdx);
      }
    });

    // Compute face normals if not provided
    const faceNormals = triangles.map(tri => {
      const v0 = vertices[tri[0]];
      const v1 = vertices[tri[1]];
      const v2 = vertices[tri[2]];

      const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
      const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };

      const n = {
        x: e1.y * e2.z - e1.z * e2.y,
        y: e1.z * e2.x - e1.x * e2.z,
        z: e1.x * e2.y - e1.y * e2.x
      };
      const len = Math.sqrt(n.x ** 2 + n.y ** 2 + n.z ** 2);
      if (len > 1e-10) {
        n.x /= len; n.y /= len; n.z /= len;
      }
      return n;
    });

    const sharpThreshold = Math.cos(sharpAngle * Math.PI / 180);

    // Classify edges
    edgeFaces.forEach((faces, edgeKey) => {
      const [a, b] = edgeKey.split('-').map(Number);
      const edge = {
        start: vertices[a],
        end: vertices[b],
        indices: [a, b]
      };
      if (faces.length === 1) {
        // Boundary edge
        edges.boundary.push(edge);
      } else if (faces.length === 2) {
        // Check angle between faces
        const n1 = faceNormals[faces[0]];
        const n2 = faceNormals[faces[1]];
        const dot = n1.x * n2.x + n1.y * n2.y + n1.z * n2.z;

        if (dot < sharpThreshold) {
          // Sharp edge
          edges.sharp.push(edge);
        }
      }
    });

    return {
      ...edges,

      // Compute silhouette edges for a given view direction
      computeSilhouette: function(viewDir) {
        const silhouette = [];

        edgeFaces.forEach((faces, edgeKey) => {
          if (faces.length !== 2) return;

          const n1 = faceNormals[faces[0]];
          const n2 = faceNormals[faces[1]];

          const dot1 = n1.x * viewDir.x + n1.y * viewDir.y + n1.z * viewDir.z;
          const dot2 = n2.x * viewDir.x + n2.y * viewDir.y + n2.z * viewDir.z;

          // Silhouette: one face front-facing, one back-facing
          if ((dot1 >= 0 && dot2 < 0) || (dot1 < 0 && dot2 >= 0)) {
            const [a, b] = edgeKey.split('-').map(Number);
            silhouette.push({
              start: vertices[a],
              end: vertices[b],
              indices: [a, b]
            });
          }
        });

        return silhouette;
      }
    };
  },
  // 4.3: Color and Material Extraction from STEP

  /**
   * Extract color and material information from STEP file
   */
  extractColors(stepData, entityMap) {
    const colorMap = new Map(); // face/shell id → color

    // Find STYLED_ITEM entities
    const styledItems = stepData.byType.get('STYLED_ITEM') || [];

    styledItems.forEach(item => {
      const stylesRef = item.args[1];
      const itemRef = item.args[2]?.ref;

      if (!stylesRef || !itemRef) return;

      // Parse presentation style assignment
      stylesRef.forEach(styleRef => {
        const style = entityMap.get(styleRef.ref);
        if (!style) return;

        // Navigate to SURFACE_STYLE_USAGE → SURFACE_SIDE_STYLE → SURFACE_STYLE_FILL_AREA → FILL_AREA_STYLE → FILL_AREA_STYLE_COLOUR → COLOUR_RGB
        this.extractColorFromStyle(style, entityMap, itemRef, colorMap);
      });
    });

    // Also check COLOUR_RGB entities directly
    const rgbColors = stepData.byType.get('COLOUR_RGB') || [];
    rgbColors.forEach(rgb => {
      const r = rgb.args[1] || 0;
      const g = rgb.args[2] || 0;
      const b = rgb.args[3] || 0;
      // Store for reference
    });

    return {
      colorMap,

      getColor: function(entityId) {
        if (this.colorMap.has(entityId)) {
          return this.colorMap.get(entityId);
        }
        // Default color
        return { r: 0.8, g: 0.8, b: 0.8 };
      }
    };
  },
  extractColorFromStyle(style, entityMap, itemRef, colorMap) {
    if (!style) return;

    // PRESENTATION_STYLE_ASSIGNMENT has styles array
    const styles = style.args?.[0];
    if (!Array.isArray(styles)) return;

    styles.forEach(styleRef => {
      const surfaceStyle = entityMap.get(styleRef.ref);
      if (!surfaceStyle) return;

      // SURFACE_STYLE_USAGE → SURFACE_SIDE_STYLE
      if (surfaceStyle.type === 'SURFACE_STYLE_USAGE') {
        const sideStyleRef = surfaceStyle.args?.[1]?.ref;
        const sideStyle = entityMap.get(sideStyleRef);

        if (sideStyle?.type === 'SURFACE_SIDE_STYLE') {
          const styleRefs = sideStyle.args?.[1];
          if (Array.isArray(styleRefs)) {
            styleRefs.forEach(ref => {
              const fillStyle = entityMap.get(ref.ref);
              if (fillStyle?.type === 'SURFACE_STYLE_FILL_AREA') {
                const fillAreaRef = fillStyle.args?.[0]?.ref;
                const fillArea = entityMap.get(fillAreaRef);

                if (fillArea?.type === 'FILL_AREA_STYLE') {
                  const colours = fillArea.args?.[1];
                  if (Array.isArray(colours)) {
                    colours.forEach(colRef => {
                      const colStyle = entityMap.get(colRef.ref);
                      if (colStyle?.type === 'FILL_AREA_STYLE_COLOUR') {
                        const rgbRef = colStyle.args?.[1]?.ref;
                        const rgb = entityMap.get(rgbRef);

                        if (rgb?.type === 'COLOUR_RGB') {
                          colorMap.set(itemRef, {
                            r: rgb.args[1] || 0,
                            g: rgb.args[2] || 0,
                            b: rgb.args[3] || 0
                          });
                        }
                      }
                    });
                  }
                }
              }
            });
          }
        }
      }
    });
  },
  // 4.4: Three.js Integration

  /**
   * Convert mesh to Three.js BufferGeometry with all attributes
   */
  toThreeGeometry(vertices, triangles, normals = null, colors = null) {
    // Flatten vertices
    const positions = new Float32Array(triangles.length * 9);
    const normalsArr = new Float32Array(triangles.length * 9);
    const colorsArr = colors ? new Float32Array(triangles.length * 9) : null;

    let idx = 0;
    triangles.forEach((tri, triIdx) => {
      for (let i = 0; i < 3; i++) {
        const v = vertices[tri[i]];
        positions[idx] = v.x;
        positions[idx + 1] = v.y;
        positions[idx + 2] = v.z;

        if (normals && normals[tri[i]]) {
          normalsArr[idx] = normals[tri[i]].x;
          normalsArr[idx + 1] = normals[tri[i]].y;
          normalsArr[idx + 2] = normals[tri[i]].z;
        }
        if (colorsArr && colors) {
          const c = colors[triIdx] || { r: 0.8, g: 0.8, b: 0.8 };
          colorsArr[idx] = c.r;
          colorsArr[idx + 1] = c.g;
          colorsArr[idx + 2] = c.b;
        }
        idx += 3;
      }
    });

    // If no normals provided, compute flat normals
    if (!normals) {
      for (let i = 0; i < triangles.length; i++) {
        const base = i * 9;

        const v0 = { x: positions[base], y: positions[base + 1], z: positions[base + 2] };
        const v1 = { x: positions[base + 3], y: positions[base + 4], z: positions[base + 5] };
        const v2 = { x: positions[base + 6], y: positions[base + 7], z: positions[base + 8] };

        const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
        const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };

        const n = {
          x: e1.y * e2.z - e1.z * e2.y,
          y: e1.z * e2.x - e1.x * e2.z,
          z: e1.x * e2.y - e1.y * e2.x
        };
        const len = Math.sqrt(n.x ** 2 + n.y ** 2 + n.z ** 2);
        if (len > 1e-10) {
          n.x /= len; n.y /= len; n.z /= len;
        }
        for (let j = 0; j < 3; j++) {
          normalsArr[base + j * 3] = n.x;
          normalsArr[base + j * 3 + 1] = n.y;
          normalsArr[base + j * 3 + 2] = n.z;
        }
      }
    }

    return {
      attributes: {
        position: { array: positions, itemSize: 3 },
        normal: { array: normalsArr, itemSize: 3 },
        ...(colorsArr && { color: { array: colorsArr, itemSize: 3 } })
      },
      drawRange: { start: 0, count: triangles.length * 3 }
    };
  }
}