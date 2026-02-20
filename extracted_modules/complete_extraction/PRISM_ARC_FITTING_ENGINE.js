const PRISM_ARC_FITTING_ENGINE = {
  name: 'PRISM_ARC_FITTING_ENGINE',
  version: '1.0.0',
  description: 'Convert linear moves to G2/G3 arcs for optimized G-code',

  fitArcs(points, options = {}) {
    const { tolerance = 0.001, minArcPoints = 4, maxArcAngle = Math.PI, minRadius = 0.01, maxRadius = 1000 } = options;
    if (points.length < minArcPoints) return this._linearOutput(points);

    const result = [];
    let i = 0;
    while (i < points.length - 1) {
      const arcFit = this._findBestArc(points, i, { tolerance, minArcPoints, maxArcAngle, minRadius, maxRadius });
      if (arcFit && arcFit.endIndex > i + 1) {
        result.push({
          type: arcFit.clockwise ? 'G3' : 'G2',
          start: points[i], end: points[arcFit.endIndex],
          center: arcFit.center, radius: arcFit.radius,
          I: arcFit.center.x - points[i].x, J: arcFit.center.y - points[i].y
        });
        i = arcFit.endIndex;
      } else {
        result.push({ type: 'G1', start: points[i], end: points[i + 1] });
        i++;
      }
    }
    return result;
  },
  _findBestArc(points, startIdx, options) {
    const { tolerance, minArcPoints, maxArcAngle, minRadius, maxRadius } = options;
    let bestFit = null;
    for (let endIdx = startIdx + minArcPoints - 1; endIdx < points.length; endIdx++) {
      const subset = points.slice(startIdx, endIdx + 1);
      const fit = this._fitCircle(subset);
      if (!fit || fit.radius < minRadius || fit.radius > maxRadius) continue;

      const startAngle = Math.atan2(points[startIdx].y - fit.center.y, points[startIdx].x - fit.center.x);
      const endAngle = Math.atan2(points[endIdx].y - fit.center.y, points[endIdx].x - fit.center.x);
      let arcAngle = Math.abs(endAngle - startAngle);
      if (arcAngle > Math.PI) arcAngle = 2 * Math.PI - arcAngle;
      if (arcAngle > maxArcAngle) break;

      let withinTolerance = true;
      for (let i = startIdx + 1; i < endIdx; i++) {
        const dist = Math.sqrt(Math.pow(points[i].x - fit.center.x, 2) + Math.pow(points[i].y - fit.center.y, 2));
        if (Math.abs(dist - fit.radius) > tolerance) { withinTolerance = false; break; }
      }
      if (withinTolerance) {
        const cross = this._crossProduct2D(
          { x: points[startIdx + 1].x - points[startIdx].x, y: points[startIdx + 1].y - points[startIdx].y },
          { x: fit.center.x - points[startIdx].x, y: fit.center.y - points[startIdx].y }
        );
        bestFit = { center: fit.center, radius: fit.radius, endIndex: endIdx, clockwise: cross < 0 };
      } else break;
    }
    return bestFit;
  },
  _fitCircle(points) {
    if (points.length < 3) return null;
    const n = points.length;
    let sumX = 0, sumY = 0;
    for (const p of points) { sumX += p.x; sumY += p.y; }
    const cx = sumX / n, cy = sumY / n;
    const shifted = points.map(p => ({ x: p.x - cx, y: p.y - cy }));

    let Suu = 0, Suv = 0, Svv = 0, Suuu = 0, Svvv = 0, Suvv = 0, Suuv = 0;
    for (const p of shifted) {
      const u = p.x, v = p.y, uu = u * u, vv = v * v;
      Suu += uu; Suv += u * v; Svv += vv; Suuu += uu * u; Svvv += vv * v; Suvv += u * vv; Suuv += uu * v;
    }
    const det = Suu * Svv - Suv * Suv;
    if (Math.abs(det) < 1e-10) return null;
    const uc = (Svv * (Suuu + Suvv) - Suv * (Svvv + Suuv)) / (2 * det);
    const vc = (Suu * (Svvv + Suuv) - Suv * (Suuu + Suvv)) / (2 * det);

    let sumR = 0;
    for (const p of shifted) sumR += Math.sqrt(Math.pow(p.x - uc, 2) + Math.pow(p.y - vc, 2));
    return { center: { x: uc + cx, y: vc + cy }, radius: sumR / n };
  },
  _crossProduct2D(v1, v2) { return v1.x * v2.y - v1.y * v2.x; },
  _linearOutput(points) {
    const result = [];
    for (let i = 0; i < points.length - 1; i++) result.push({ type: 'G1', start: points[i], end: points[i + 1] });
    return result;
  },
  toGCode(fittedPath, options = {}) {
    const { feedRate = 100, plane = 'G17', absolute = true, precision = 4 } = options;
    const lines = [absolute ? 'G90' : 'G91', plane];
    const fmt = (n) => n.toFixed(precision);
    for (const move of fittedPath) {
      if (move.type === 'G1') {
        lines.push(`G1 X${fmt(move.end.x)} Y${fmt(move.end.y)} Z${fmt(move.end.z || 0)} F${feedRate}`);
      } else {
        lines.push(`${move.type} X${fmt(move.end.x)} Y${fmt(move.end.y)} I${fmt(move.I)} J${fmt(move.J)} F${feedRate}`);
      }
    }
    return lines.join('\n');
  },
  optimizeGCode(gcode) {
    const points = this._parseGCodeToPoints(gcode);
    const fitted = this.fitArcs(points);
    return this.toGCode(fitted);
  },
  _parseGCodeToPoints(gcode) {
    const points = [];
    let currentPos = { x: 0, y: 0, z: 0 };
    for (const line of gcode.split('\n')) {
      const xMatch = line.match(/X([-\d.]+)/), yMatch = line.match(/Y([-\d.]+)/), zMatch = line.match(/Z([-\d.]+)/);
      if (xMatch) currentPos.x = parseFloat(xMatch[1]);
      if (yMatch) currentPos.y = parseFloat(yMatch[1]);
      if (zMatch) currentPos.z = parseFloat(zMatch[1]);
      if (line.match(/G[01]/)) points.push({ ...currentPos });
    }
    return points;
  },
  fitHelix(points, options = {}) {
    const { tolerance = 0.001 } = options;
    if (points.length < 4) return null;
    const xyPoints = points.map(p => ({ x: p.x, y: p.y }));
    const circleFit = this._fitCircle(xyPoints);
    if (!circleFit) return null;

    const zStart = points[0].z, zEnd = points[points.length - 1].z, zDelta = zEnd - zStart;
    let valid = true;
    for (let i = 0; i < points.length; i++) {
      const expectedZ = zStart + (i / (points.length - 1)) * zDelta;
      if (Math.abs(points[i].z - expectedZ) > tolerance) { valid = false; break; }
      const dist = Math.sqrt(Math.pow(points[i].x - circleFit.center.x, 2) + Math.pow(points[i].y - circleFit.center.y, 2));
      if (Math.abs(dist - circleFit.radius) > tolerance) { valid = false; break; }
    }
    if (valid) {
      const arcLength = this._calculateArcLength(points);
      const pitch = zDelta / (arcLength / (2 * Math.PI * circleFit.radius));
      return { center: circleFit.center, radius: circleFit.radius, pitch, startZ: zStart, endZ: zEnd };
    }
    return null;
  },
  _calculateArcLength(points) {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      length += Math.sqrt(Math.pow(points[i].x - points[i-1].x, 2) + Math.pow(points[i].y - points[i-1].y, 2));
    }
    return length;
  }
}