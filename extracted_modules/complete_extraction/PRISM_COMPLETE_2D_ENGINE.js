const PRISM_COMPLETE_2D_ENGINE = {
  name: 'PRISM_COMPLETE_2D_ENGINE',
  version: '1.0.0',
  description: 'Production-grade 2.5D toolpath generation',

  adaptiveClearing(boundary, options = {}) {
    const { toolDiameter = 0.5, maxEngagement = 40, stepdown = 0.1, tolerance = 0.001, safeZ = 1.0 } = options;
    const toolRadius = toolDiameter / 2;
    const maxStepover = toolRadius * (1 - Math.cos(maxEngagement * Math.PI / 180));

    const toolpath = { type: 'adaptive_clearing', levels: [], totalLength: 0 };
    const bounds = this._getBounds(boundary);
    let z = bounds.maxZ - stepdown;

    while (z >= bounds.minZ) {
      const level = this._generateAdaptiveLevel(boundary, z, toolRadius, maxStepover, tolerance);
      if (level.points.length > 0) toolpath.levels.push(level);
      z -= stepdown;
    }
    return toolpath;
  },
  hsmPocket(boundary, options = {}) {
    const { toolDiameter = 0.5, stepover = 0.4, cornerRadius = null, smoothTransitions = true, safeZ = 1.0 } = options;
    const toolRadius = toolDiameter / 2;
    const actualCornerRadius = cornerRadius || toolRadius;

    let currentBoundary = this._offsetPolygon(boundary, -toolRadius);
    const toolpath = { type: 'hsm_pocket', points: [], totalLength: 0 };

    const entry = this._helicalEntry(currentBoundary, toolRadius, options);
    toolpath.points.push(...entry);

    while (currentBoundary.length >= 3 && this._polygonArea(currentBoundary) > toolRadius * toolRadius) {
      if (smoothTransitions) currentBoundary = this._roundCorners(currentBoundary, actualCornerRadius);
      for (const point of currentBoundary) toolpath.points.push({ ...point, type: 'feed' });
      toolpath.points.push({ ...currentBoundary[0], type: 'feed' });
      currentBoundary = this._offsetPolygon(currentBoundary, -toolDiameter * stepover);
    }
    return toolpath;
  },
  threadMill(holeCenter, options = {}) {
    const { pitch = 1.0, diameter = 10, depth = 20, toolDiameter = 6, passes = 1, rightHand = true, safeZ = 5 } = options;
    const toolRadius = toolDiameter / 2, threadRadius = diameter / 2, helixRadius = threadRadius - toolRadius;

    const toolpath = { type: 'thread_mill', points: [], threadInfo: { pitch, diameter, depth, rightHand } };
    toolpath.points.push({ x: holeCenter.x + helixRadius, y: holeCenter.y, z: safeZ, type: 'rapid' });

    const startZ = -depth + pitch;
    toolpath.points.push({ x: holeCenter.x + helixRadius, y: holeCenter.y, z: startZ, type: 'feed' });

    const revolutions = (depth / pitch) + 1, segments = 36, direction = rightHand ? 1 : -1;
    for (let pass = 0; pass < passes; pass++) {
      for (let i = 0; i <= revolutions * segments; i++) {
        const angle = direction * (i / segments) * 2 * Math.PI;
        const z = startZ + (i / segments) * pitch;
        if (z > 0) break;
        toolpath.points.push({
          x: holeCenter.x + helixRadius * Math.cos(angle),
          y: holeCenter.y + helixRadius * Math.sin(angle),
          z, type: 'feed'
        });
      }
    }
    const last = toolpath.points[toolpath.points.length - 1];
    toolpath.points.push({ ...last, z: safeZ, type: 'rapid' });
    return toolpath;
  },
  chamferMill(contour, options = {}) {
    const { chamferAngle = 45, chamferWidth = 0.5, toolDiameter = 6, safeZ = 5 } = options;
    const chamferDepth = chamferWidth / Math.tan(chamferAngle * Math.PI / 180);
    const effectiveRadius = toolDiameter / 2 - chamferWidth;

    const offsetContour = this._offsetPolygon(contour, effectiveRadius);
    const toolpath = { type: 'chamfer', points: [], chamferInfo: { angle: chamferAngle, width: chamferWidth, depth: chamferDepth } };

    toolpath.points.push({ ...offsetContour[0], z: safeZ, type: 'rapid' });
    const leadIn = this._calculateLeadIn(offsetContour[0], offsetContour[1], effectiveRadius);
    toolpath.points.push({ ...leadIn, z: -chamferDepth, type: 'feed' });

    for (const point of offsetContour) toolpath.points.push({ ...point, z: -chamferDepth, type: 'feed' });
    toolpath.points.push({ ...offsetContour[0], z: -chamferDepth, type: 'feed' });
    toolpath.points.push({ ...offsetContour[0], z: safeZ, type: 'rapid' });
    return toolpath;
  },
  engrave(paths, options = {}) {
    const { depth = 0.1, safeZ = 1, feedRate = 500 } = options;
    const toolpath = { type: 'engrave', points: [], totalLength: 0 };

    for (const path of paths) {
      if (path.length < 2) continue;
      toolpath.points.push({ x: path[0].x, y: path[0].y, z: safeZ, type: 'rapid' });
      toolpath.points.push({ x: path[0].x, y: path[0].y, z: -depth, type: 'feed' });
      for (let i = 1; i < path.length; i++) toolpath.points.push({ x: path[i].x, y: path[i].y, z: -depth, type: 'feed' });
      const last = path[path.length - 1];
      toolpath.points.push({ x: last.x, y: last.y, z: safeZ, type: 'rapid' });
    }
    return toolpath;
  },
  _generateAdaptiveLevel(boundary, z, toolRadius, maxStepover, tolerance) {
    const level = { z, points: [] };
    let currentBoundary = this._offsetPolygon(boundary, -toolRadius);

    let cx = 0, cy = 0;
    for (const p of currentBoundary) { cx += p.x; cy += p.y; }
    cx /= currentBoundary.length; cy /= currentBoundary.length;

    level.points.push({ x: cx, y: cy, z, type: 'plunge' });

    let angle = 0, radius = maxStepover;
    const maxRadius = Math.max(
      this._getBounds(currentBoundary).maxX - cx,
      this._getBounds(currentBoundary).maxY - cy,
      cx - this._getBounds(currentBoundary).minX,
      cy - this._getBounds(currentBoundary).minY
    );

    while (radius < maxRadius) {
      for (let a = 0; a < 360; a += 10) {
        const rad = (angle + a) * Math.PI / 180;
        const px = cx + radius * Math.cos(rad);
        const py = cy + radius * Math.sin(rad);
        if (this._pointInPolygon({ x: px, y: py }, currentBoundary)) {
          level.points.push({ x: px, y: py, z, type: 'feed' });
        }
      }
      radius += maxStepover;
      angle += 15;
    }
    return level;
  },
  _helicalEntry(boundary, toolRadius, options = {}) {
    const { helixAngle = 3 } = options;
    const points = [];

    let cx = 0, cy = 0;
    for (const p of boundary) { cx += p.x; cy += p.y; }
    cx /= boundary.length; cy /= boundary.length;

    const radius = toolRadius * 0.8;
    const pitchPerRev = 2 * Math.PI * radius * Math.tan(helixAngle * Math.PI / 180);
    const targetZ = options.startZ || 0;
    let z = options.safeZ || 1, angle = 0;

    while (z > targetZ) {
      points.push({
        x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle), z,
        type: z === options.safeZ ? 'rapid' : 'feed'
      });
      angle += Math.PI / 18;
      z -= pitchPerRev / 36;
    }
    return points;
  },
  _roundCorners(polygon, radius) {
    const result = [];
    const n = polygon.length;

    for (let i = 0; i < n; i++) {
      const prev = polygon[(i - 1 + n) % n], curr = polygon[i], next = polygon[(i + 1) % n];
      const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
      const v2 = { x: next.x - curr.x, y: next.y - curr.y };

      const len1 = Math.sqrt(v1.x*v1.x + v1.y*v1.y);
      const len2 = Math.sqrt(v2.x*v2.x + v2.y*v2.y);
      if (len1 < 0.001 || len2 < 0.001) { result.push(curr); continue; }

      v1.x /= len1; v1.y /= len1; v2.x /= len2; v2.y /= len2;
      const dot = v1.x * v2.x + v1.y * v2.y;
      const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

      if (angle > Math.PI * 0.9) { result.push(curr); continue; }

      const halfAngle = (Math.PI - angle) / 2;
      const arcDist = radius / Math.tan(halfAngle);
      if (arcDist > len1 * 0.4 || arcDist > len2 * 0.4) { result.push(curr); continue; }

      result.push({ x: curr.x + v1.x * arcDist, y: curr.y + v1.y * arcDist });
      result.push({ x: curr.x + v2.x * arcDist, y: curr.y + v2.y * arcDist });
    }
    return result;
  },
  _offsetPolygon(polygon, offset) {
    const result = [];
    const n = polygon.length;

    for (let i = 0; i < n; i++) {
      const prev = polygon[(i - 1 + n) % n], curr = polygon[i], next = polygon[(i + 1) % n];
      const v1x = curr.x - prev.x, v1y = curr.y - prev.y;
      const v2x = next.x - curr.x, v2y = next.y - curr.y;

      const len1 = Math.sqrt(v1x*v1x + v1y*v1y);
      const len2 = Math.sqrt(v2x*v2x + v2y*v2y);
      if (len1 < 0.0001 || len2 < 0.0001) continue;

      const n1x = -v1y / len1, n1y = v1x / len1;
      const n2x = -v2y / len2, n2y = v2x / len2;

      let nx = (n1x + n2x) / 2, ny = (n1y + n2y) / 2;
      const nLen = Math.sqrt(nx*nx + ny*ny);

      if (nLen > 0.001) {
        nx /= nLen; ny /= nLen;
        const dot = n1x * nx + n1y * ny;
        const actualOffset = dot > 0.001 ? offset / dot : offset;
        result.push({ x: curr.x + nx * actualOffset, y: curr.y + ny * actualOffset });
      }
    }
    return result;
  },
  _getBounds(polygon) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = 0, maxZ = 0;
    for (const p of polygon) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      if (p.z !== undefined) { minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
    }
    return { minX, maxX, minY, maxY, minZ, maxZ };
  },
  _polygonArea(polygon) {
    let area = 0;
    const n = polygon.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
    }
    return Math.abs(area / 2);
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
  },
  _calculateLeadIn(p1, p2, radius) {
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len = Math.sqrt(dx*dx + dy*dy);
    return { x: p1.x + (-dy / len) * radius, y: p1.y + (dx / len) * radius };
  }
}