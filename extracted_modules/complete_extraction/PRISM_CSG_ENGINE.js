const PRISM_CSG_ENGINE = {
  name: 'PRISM_CSG_ENGINE',
  version: '1.0.0',
  description: 'Constructive Solid Geometry for rest machining calculations',

  polygon: {
    clip(subject, clip) {
      let output = [...subject];
      const clipCount = clip.length;
      for (let i = 0; i < clipCount; i++) {
        if (output.length === 0) return [];
        const input = output;
        output = [];
        const edgeStart = clip[i];
        const edgeEnd = clip[(i + 1) % clipCount];
        for (let j = 0; j < input.length; j++) {
          const current = input[j];
          const next = input[(j + 1) % input.length];
          const currentInside = this._isLeft(edgeStart, edgeEnd, current);
          const nextInside = this._isLeft(edgeStart, edgeEnd, next);
          if (currentInside) {
            output.push(current);
            if (!nextInside) output.push(this._lineIntersect(edgeStart, edgeEnd, current, next));
          } else if (nextInside) {
            output.push(this._lineIntersect(edgeStart, edgeEnd, current, next));
          }
        }
      }
      return output;
    },
    union(poly1, poly2) { return this._weilerAtherton(poly1, poly2, 'union'); },
    difference(poly1, poly2) { return this._weilerAtherton(poly1, poly2, 'difference'); },
    intersection(poly1, poly2) { return this._weilerAtherton(poly1, poly2, 'intersection'); },

    _isLeft(a, b, p) { return ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) >= 0; },

    _lineIntersect(p1, p2, p3, p4) {
      const d1 = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
      if (Math.abs(d1) < 1e-10) return null;
      const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d1;
      return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
    },
    _weilerAtherton(subject, clip, operation) {
      const intersections = [];
      for (let i = 0; i < subject.length; i++) {
        const s1 = subject[i], s2 = subject[(i + 1) % subject.length];
        for (let j = 0; j < clip.length; j++) {
          const c1 = clip[j], c2 = clip[(j + 1) % clip.length];
          const int = this._segmentIntersect(s1, s2, c1, c2);
          if (int) intersections.push({ point: int, subjectEdge: i, clipEdge: j });
        }
      }
      if (intersections.length === 0) {
        if (this._pointInPolygon(subject[0], clip)) {
          return operation === 'intersection' ? [subject] : operation === 'difference' ? [] : [clip];
        }
        if (this._pointInPolygon(clip[0], subject)) {
          return operation === 'intersection' ? [clip] : operation === 'difference' ? [subject] : [subject];
        }
        return operation === 'union' ? [subject, clip] : [];
      }
      if (operation === 'intersection') return [this.clip(subject, clip)];
      if (operation === 'difference') return [subject];
      return [subject, clip];
    },
    _segmentIntersect(p1, p2, p3, p4) {
      const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
      const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
      const denom = d1x * d2y - d1y * d2x;
      if (Math.abs(denom) < 1e-10) return null;
      const t1 = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
      const t2 = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom;
      if (t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1) {
        return { x: p1.x + t1 * d1x, y: p1.y + t1 * d1y, t1, t2 };
      }
      return null;
    },
    _pointInPolygon(point, polygon) {
      let inside = false;
      const n = polygon.length;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const pi = polygon[i], pj = polygon[j];
        if ((pi.y > point.y) !== (pj.y > point.y) &&
            point.x < (pj.x - pi.x) * (point.y - pi.y) / (pj.y - pi.y) + pi.x) {
          inside = !inside;
        }
      }
      return inside;
    }
  },
  mesh: {
    union(meshA, meshB) { return this._booleanOp(meshA, meshB, 'union'); },
    difference(meshA, meshB) { return this._booleanOp(meshA, meshB, 'difference'); },
    intersection(meshA, meshB) { return this._booleanOp(meshA, meshB, 'intersection'); },

    _booleanOp(meshA, meshB, operation) {
      const bspA = this._buildBSP(meshA);
      const bspB = this._buildBSP(meshB);
      let result;
      switch (operation) {
        case 'union':
          const aClipped = this._clipTo(bspA, bspB);
          const bClipped = this._clipTo(this._invert(bspB), bspA);
          result = this._merge(aClipped, this._invert(bClipped));
          break;
        case 'difference':
          const aInv = this._invert(this._clipTo(bspA, bspB));
          result = this._invert(this._clipTo(aInv, this._invert(bspB)));
          break;
        case 'intersection':
          const a1 = this._invert(bspA);
          const a2 = this._clipTo(a1, bspB);
          result = this._clipTo(this._invert(a2), this._invert(bspB));
          result = this._invert(result);
          break;
      }
      return this._bspToMesh(result);
    },
    _buildBSP(mesh) {
      const triangles = [];
      const { vertices, indices } = mesh;
      for (let i = 0; i < indices.length; i += 3) {
        triangles.push({ v0: vertices[indices[i]], v1: vertices[indices[i + 1]], v2: vertices[indices[i + 2]] });
      }
      return this._buildNode(triangles);
    },
    _buildNode(triangles) {
      if (triangles.length === 0) return null;
      const plane = this._trianglePlane(triangles[0]);
      const front = [], back = [], coplanar = [];
      for (const tri of triangles) this._splitTriangle(tri, plane, coplanar, coplanar, front, back);
      return {
        plane, triangles: coplanar,
        front: front.length > 0 ? this._buildNode(front) : null,
        back: back.length > 0 ? this._buildNode(back) : null
      };
    },
    _trianglePlane(tri) {
      const v0 = tri.v0, v1 = tri.v1, v2 = tri.v2;
      const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
      const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
      const normal = { x: e1.y * e2.z - e1.z * e2.y, y: e1.z * e2.x - e1.x * e2.z, z: e1.x * e2.y - e1.y * e2.x };
      const len = Math.sqrt(normal.x*normal.x + normal.y*normal.y + normal.z*normal.z);
      normal.x /= len; normal.y /= len; normal.z /= len;
      const d = -(normal.x * v0.x + normal.y * v0.y + normal.z * v0.z);
      return { normal, d };
    },
    _splitTriangle(tri, plane, coplanarFront, coplanarBack, front, back) {
      const EPSILON = 1e-6;
      const classify = (v) => {
        const d = plane.normal.x * v.x + plane.normal.y * v.y + plane.normal.z * v.z + plane.d;
        return d > EPSILON ? 1 : d < -EPSILON ? -1 : 0;
      };
      const c0 = classify(tri.v0), c1 = classify(tri.v1), c2 = classify(tri.v2);
      const type = c0 + c1 + c2;
      if (c0 >= 0 && c1 >= 0 && c2 >= 0) { (type === 0 ? coplanarFront : front).push(tri); }
      else if (c0 <= 0 && c1 <= 0 && c2 <= 0) { (type === 0 ? coplanarBack : back).push(tri); }
      else { front.push(tri); back.push(tri); }
    },
    _invert(node) {
      if (!node) return null;
      node.plane.normal.x *= -1; node.plane.normal.y *= -1; node.plane.normal.z *= -1; node.plane.d *= -1;
      for (const tri of node.triangles) { const temp = tri.v0; tri.v0 = tri.v2; tri.v2 = temp; }
      const temp = node.front;
      node.front = this._invert(node.back);
      node.back = this._invert(temp);
      return node;
    },
    _clipTo(nodeA, nodeB) {
      if (!nodeA) return null;
      nodeA.triangles = this._clipPolygons(nodeB, nodeA.triangles);
      nodeA.front = this._clipTo(nodeA.front, nodeB);
      nodeA.back = this._clipTo(nodeA.back, nodeB);
      return nodeA;
    },
    _clipPolygons(node, triangles) {
      if (!node) return triangles;
      let front = [], back = [];
      for (const tri of triangles) this._splitTriangle(tri, node.plane, front, back, front, back);
      front = this._clipPolygons(node.front, front);
      back = node.back ? this._clipPolygons(node.back, back) : [];
      return front.concat(back);
    },
    _merge(nodeA, nodeB) {
      if (!nodeA) return nodeB;
      if (!nodeB) return nodeA;
      const allTris = this._collectTriangles(nodeA).concat(this._collectTriangles(nodeB));
      return this._buildNode(allTris);
    },
    _collectTriangles(node) {
      if (!node) return [];
      return node.triangles.concat(this._collectTriangles(node.front)).concat(this._collectTriangles(node.back));
    },
    _bspToMesh(node) {
      const triangles = this._collectTriangles(node);
      const vertices = [], indices = [];
      for (const tri of triangles) {
        const idx = vertices.length;
        vertices.push(tri.v0, tri.v1, tri.v2);
        indices.push(idx, idx + 1, idx + 2);
      }
      return { vertices, indices };
    }
  },
  restMachining: {
    calculateRest(stockMesh, previousToolpath) {
      const { toolDiameter, cornerRadius = 0, points } = previousToolpath;
      const sweptVolume = this._generateSweptVolume(points, toolDiameter, cornerRadius);
      return PRISM_CSG_ENGINE.mesh.difference(stockMesh, sweptVolume);
    },
    findRestRegions(restMesh, newToolDiameter) {
      const regions = [];
      const { vertices, indices } = restMesh;
      const visited = new Set();
      for (let i = 0; i < indices.length; i += 3) {
        if (visited.has(i)) continue;
        const region = { triangles: [], boundingBox: {
          min: { x: Infinity, y: Infinity, z: Infinity },
          max: { x: -Infinity, y: -Infinity, z: -Infinity }
        }};
        const stack = [i];
        while (stack.length > 0) {
          const idx = stack.pop();
          if (visited.has(idx)) continue;
          visited.add(idx);
          const v0 = vertices[indices[idx]], v1 = vertices[indices[idx + 1]], v2 = vertices[indices[idx + 2]];
          region.triangles.push({ v0, v1, v2 });
          for (const v of [v0, v1, v2]) {
            region.boundingBox.min.x = Math.min(region.boundingBox.min.x, v.x);
            region.boundingBox.min.y = Math.min(region.boundingBox.min.y, v.y);
            region.boundingBox.min.z = Math.min(region.boundingBox.min.z, v.z);
            region.boundingBox.max.x = Math.max(region.boundingBox.max.x, v.x);
            region.boundingBox.max.y = Math.max(region.boundingBox.max.y, v.y);
            region.boundingBox.max.z = Math.max(region.boundingBox.max.z, v.z);
          }
        }
        const regionWidth = Math.min(
          region.boundingBox.max.x - region.boundingBox.min.x,
          region.boundingBox.max.y - region.boundingBox.min.y
        );
        if (regionWidth >= newToolDiameter * 0.5) regions.push(region);
      }
      return regions;
    },
    generateRestToolpath(restRegions, options = {}) {
      const { toolDiameter = 0.25, stepover = 0.4, stepdown = 0.1, safeZ = 1.0 } = options;
      const toolpath = { type: 'rest_machining', regions: [], totalLength: 0 };
      for (const region of restRegions) {
        const regionPath = { points: [], boundingBox: region.boundingBox };
        const zLevels = [];
        for (let z = region.boundingBox.max.z - stepdown; z >= region.boundingBox.min.z; z -= stepdown) {
          zLevels.push(z);
        }
        for (const z of zLevels) {
          regionPath.points.push({
            x: (region.boundingBox.min.x + region.boundingBox.max.x) / 2,
            y: (region.boundingBox.min.y + region.boundingBox.max.y) / 2,
            z: safeZ, type: 'rapid'
          });
          regionPath.points.push({
            x: (region.boundingBox.min.x + region.boundingBox.max.x) / 2,
            y: (region.boundingBox.min.y + region.boundingBox.max.y) / 2,
            z, type: 'feed'
          });
        }
        toolpath.regions.push(regionPath);
      }
      return toolpath;
    },
    _generateSweptVolume(points, toolDiameter, cornerRadius) {
      const vertices = [], indices = [];
      const toolRadius = toolDiameter / 2, segments = 16;
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i], p2 = points[i + 1];
        const dx = p2.x - p1.x, dy = p2.y - p1.y, dz = p2.z - p1.z;
        const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (len < 0.0001) continue;
        const baseIdx = vertices.length;
        for (let j = 0; j < segments; j++) {
          const angle = (j / segments) * Math.PI * 2;
          vertices.push({ x: p1.x + toolRadius * Math.cos(angle), y: p1.y + toolRadius * Math.sin(angle), z: p1.z });
          vertices.push({ x: p2.x + toolRadius * Math.cos(angle), y: p2.y + toolRadius * Math.sin(angle), z: p2.z });
        }
        for (let j = 0; j < segments; j++) {
          const j2 = (j + 1) % segments;
          const i1 = baseIdx + j * 2, i2 = baseIdx + j * 2 + 1;
          const i3 = baseIdx + j2 * 2, i4 = baseIdx + j2 * 2 + 1;
          indices.push(i1, i2, i3, i2, i4, i3);
        }
      }
      return { vertices, indices };
    }
  }
}