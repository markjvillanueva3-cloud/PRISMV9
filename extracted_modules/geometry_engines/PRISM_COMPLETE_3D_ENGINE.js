const PRISM_COMPLETE_3D_ENGINE = {
  name: 'PRISM_COMPLETE_3D_ENGINE',
  version: '1.0.0',
  description: 'Production-grade 3D surface machining',

  scallop(surface, options = {}) {
    const { toolDiameter = 0.5, scallop = 0.01, angle = 0, safeZ = 1.0 } = options;
    const toolRadius = toolDiameter / 2;
    const stepover = 2 * Math.sqrt(2 * toolRadius * scallop - scallop * scallop);

    const toolpath = { type: 'scallop_finish', points: [], actualScallop: scallop, stepover, totalLength: 0 };

    if (typeof PRISM_NURBS_LIBRARY !== 'undefined') {
      const mesh = PRISM_NURBS_LIBRARY.surface.tessellate(surface, 50, 50);
      const bounds = this._getMeshBounds(mesh);

      const angleRad = angle * Math.PI / 180;
      const cos = Math.cos(angleRad), sin = Math.sin(angleRad);
      const diag = Math.sqrt(Math.pow(bounds.maxX - bounds.minX, 2) + Math.pow(bounds.maxY - bounds.minY, 2));

      let lineNum = 0, y = -diag / 2;
      while (y <= diag / 2) {
        const linePoints = [];
        let x = -diag / 2;

        while (x <= diag / 2) {
          const px = bounds.minX + (bounds.maxX - bounds.minX) / 2 + x * cos - y * sin;
          const py = bounds.minY + (bounds.maxY - bounds.minY) / 2 + x * sin + y * cos;

          const result = PRISM_NURBS_LIBRARY.surface.closestPoint(surface, { x: px, y: py, z: 0 });
          if (result.point) {
            const normal = PRISM_NURBS_LIBRARY.surface.normal(surface, result.u, result.v);
            linePoints.push({
              x: result.point.x + normal.x * toolRadius,
              y: result.point.y + normal.y * toolRadius,
              z: result.point.z + normal.z * toolRadius,
              type: 'feed'
            });
          }
          x += stepover / 4;
        }
        if (linePoints.length > 0) {
          if (lineNum % 2 === 1) linePoints.reverse();
          toolpath.points.push({ ...linePoints[0], z: safeZ, type: 'rapid' });
          toolpath.points.push(...linePoints);
          toolpath.points.push({ ...linePoints[linePoints.length - 1], z: safeZ, type: 'rapid' });
        }
        y += stepover;
        lineNum++;
      }
    }
    return toolpath;
  },
  spiral(surface, options = {}) {
    const { toolDiameter = 0.5, stepover = 0.3, center = null, safeZ = 1.0 } = options;
    const toolRadius = toolDiameter / 2;
    const toolpath = { type: 'spiral_finish', points: [], totalLength: 0 };

    if (typeof PRISM_NURBS_LIBRARY !== 'undefined') {
      const mesh = PRISM_NURBS_LIBRARY.surface.tessellate(surface, 30, 30);
      const bounds = this._getMeshBounds(mesh);

      const cx = center ? center.x : (bounds.minX + bounds.maxX) / 2;
      const cy = center ? center.y : (bounds.minY + bounds.maxY) / 2;
      const maxRadius = Math.sqrt(
        Math.pow(Math.max(bounds.maxX - cx, cx - bounds.minX), 2) +
        Math.pow(Math.max(bounds.maxY - cy, cy - bounds.minY), 2)
      );

      let radius = stepover * toolDiameter, angle = 0;

      const startResult = PRISM_NURBS_LIBRARY.surface.closestPoint(surface, { x: cx, y: cy, z: 0 });
      if (startResult.point) {
        const normal = PRISM_NURBS_LIBRARY.surface.normal(surface, startResult.u, startResult.v);
        toolpath.points.push({ x: cx + normal.x * toolRadius, y: cy + normal.y * toolRadius, z: safeZ, type: 'rapid' });
        toolpath.points.push({
          x: startResult.point.x + normal.x * toolRadius,
          y: startResult.point.y + normal.y * toolRadius,
          z: startResult.point.z + normal.z * toolRadius, type: 'feed'
        });
      }
      while (radius <= maxRadius) {
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);

        const result = PRISM_NURBS_LIBRARY.surface.closestPoint(surface, { x, y, z: 0 });
        if (result.point) {
          const normal = PRISM_NURBS_LIBRARY.surface.normal(surface, result.u, result.v);
          toolpath.points.push({
            x: result.point.x + normal.x * toolRadius,
            y: result.point.y + normal.y * toolRadius,
            z: result.point.z + normal.z * toolRadius, type: 'feed'
          });
        }
        angle += stepover * toolDiameter / radius;
        radius = stepover * toolDiameter * angle / (2 * Math.PI);
      }
      if (toolpath.points.length > 0) {
        const last = toolpath.points[toolpath.points.length - 1];
        toolpath.points.push({ ...last, z: safeZ, type: 'rapid' });
      }
    }
    return toolpath;
  },
  radial(surface, options = {}) {
    const { toolDiameter = 0.5, angularStep = 5, center = null, safeZ = 1.0 } = options;
    const toolRadius = toolDiameter / 2;
    const toolpath = { type: 'radial_finish', points: [], totalLength: 0 };

    if (typeof PRISM_NURBS_LIBRARY !== 'undefined') {
      const mesh = PRISM_NURBS_LIBRARY.surface.tessellate(surface, 30, 30);
      const bounds = this._getMeshBounds(mesh);

      const cx = center ? center.x : (bounds.minX + bounds.maxX) / 2;
      const cy = center ? center.y : (bounds.minY + bounds.maxY) / 2;
      const maxRadius = Math.sqrt(
        Math.pow(Math.max(bounds.maxX - cx, cx - bounds.minX), 2) +
        Math.pow(Math.max(bounds.maxY - cy, cy - bounds.minY), 2)
      );

      for (let angle = 0; angle < 360; angle += angularStep) {
        const radians = angle * Math.PI / 180;
        const linePoints = [];

        for (let r = 0; r <= maxRadius; r += toolDiameter * 0.25) {
          const x = cx + r * Math.cos(radians);
          const y = cy + r * Math.sin(radians);

          const result = PRISM_NURBS_LIBRARY.surface.closestPoint(surface, { x, y, z: 0 });
          if (result.point) {
            const normal = PRISM_NURBS_LIBRARY.surface.normal(surface, result.u, result.v);
            linePoints.push({
              x: result.point.x + normal.x * toolRadius,
              y: result.point.y + normal.y * toolRadius,
              z: result.point.z + normal.z * toolRadius, type: 'feed'
            });
          }
        }
        if (linePoints.length > 0) {
          if ((angle / angularStep) % 2 === 1) linePoints.reverse();
          toolpath.points.push({ ...linePoints[0], z: safeZ, type: 'rapid' });
          toolpath.points.push(...linePoints);
          toolpath.points.push({ ...linePoints[linePoints.length - 1], z: safeZ, type: 'rapid' });
        }
      }
    }
    return toolpath;
  },
  flowline(surface, options = {}) {
    const { toolDiameter = 0.5, stepover = 0.3, direction = 'U', safeZ = 1.0 } = options;
    const toolRadius = toolDiameter / 2;
    const toolpath = { type: 'flowline_finish', points: [], direction, totalLength: 0 };

    if (typeof PRISM_NURBS_LIBRARY !== 'undefined') {
      const primaryStep = 0.02, secondaryStep = stepover;

      if (direction === 'U') {
        for (let v = 0; v <= 1; v += secondaryStep) {
          const linePoints = [];
          for (let u = 0; u <= 1; u += primaryStep) {
            const point = PRISM_NURBS_LIBRARY.surface.evaluate(surface, u, v);
            const normal = PRISM_NURBS_LIBRARY.surface.normal(surface, u, v);
            linePoints.push({
              x: point.x + normal.x * toolRadius,
              y: point.y + normal.y * toolRadius,
              z: point.z + normal.z * toolRadius, type: 'feed'
            });
          }
          if (linePoints.length > 0) {
            if ((v / secondaryStep) % 2 === 1) linePoints.reverse();
            toolpath.points.push({ ...linePoints[0], z: safeZ, type: 'rapid' });
            toolpath.points.push(...linePoints);
            toolpath.points.push({ ...linePoints[linePoints.length - 1], z: safeZ, type: 'rapid' });
          }
        }
      } else {
        for (let u = 0; u <= 1; u += secondaryStep) {
          const linePoints = [];
          for (let v = 0; v <= 1; v += primaryStep) {
            const point = PRISM_NURBS_LIBRARY.surface.evaluate(surface, u, v);
            const normal = PRISM_NURBS_LIBRARY.surface.normal(surface, u, v);
            linePoints.push({
              x: point.x + normal.x * toolRadius,
              y: point.y + normal.y * toolRadius,
              z: point.z + normal.z * toolRadius, type: 'feed'
            });
          }
          if (linePoints.length > 0) {
            if ((u / secondaryStep) % 2 === 1) linePoints.reverse();
            toolpath.points.push({ ...linePoints[0], z: safeZ, type: 'rapid' });
            toolpath.points.push(...linePoints);
            toolpath.points.push({ ...linePoints[linePoints.length - 1], z: safeZ, type: 'rapid' });
          }
        }
      }
    }
    return toolpath;
  },
  _getMeshBounds(mesh) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const v of mesh.vertices) {
      minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
      minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z);
    }
    return { minX, maxX, minY, maxY, minZ, maxZ };
  }
}