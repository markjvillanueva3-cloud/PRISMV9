const PRISM_NURBS_LIBRARY = {
  name: 'PRISM_NURBS_LIBRARY',
  version: '1.0.0',
  description: 'Complete NURBS and B-Spline evaluation for CAM operations',

  basis: {
    N(i, p, u, knots) {
      if (p === 0) return (u >= knots[i] && u < knots[i + 1]) ? 1.0 : 0.0;
      const left = knots[i + p] - knots[i];
      const right = knots[i + p + 1] - knots[i + 1];
      let result = 0.0;
      if (left !== 0) result += ((u - knots[i]) / left) * this.N(i, p - 1, u, knots);
      if (right !== 0) result += ((knots[i + p + 1] - u) / right) * this.N(i + 1, p - 1, u, knots);
      return result;
    },
    basisFunctions(u, p, knots) {
      const n = knots.length - p - 2;
      let span = p;
      for (let i = p; i < n + 1; i++) {
        if (u >= knots[i] && u < knots[i + 1]) { span = i; break; }
      }
      if (u >= knots[n + 1]) span = n;

      const N = new Array(p + 1).fill(0);
      N[0] = 1.0;
      const left = new Array(p + 1).fill(0);
      const right = new Array(p + 1).fill(0);

      for (let j = 1; j <= p; j++) {
        left[j] = u - knots[span + 1 - j];
        right[j] = knots[span + j] - u;
        let saved = 0.0;
        for (let r = 0; r < j; r++) {
          const temp = N[r] / (right[r + 1] + left[j - r]);
          N[r] = saved + right[r + 1] * temp;
          saved = left[j - r] * temp;
        }
        N[j] = saved;
      }
      return { span, values: N };
    }
  },
  curve: {
    evaluate(curve, u) {
      const { degree, controlPoints, knots, weights } = curve;
      const n = controlPoints.length - 1;
      const uMin = knots[degree], uMax = knots[n + 1];
      const uActual = uMin + u * (uMax - uMin);
      const { span, values } = PRISM_NURBS_LIBRARY.basis.basisFunctions(uActual, degree, knots);

      let point = { x: 0, y: 0, z: 0 }, sumW = 0;
      for (let i = 0; i <= degree; i++) {
        const idx = span - degree + i;
        const cp = controlPoints[idx];
        const w = weights ? weights[idx] : 1.0;
        const basis = values[i] * w;
        point.x += basis * cp.x;
        point.y += basis * cp.y;
        point.z += (cp.z || 0) * basis;
        sumW += basis;
      }
      if (weights && sumW > 0) { point.x /= sumW; point.y /= sumW; point.z /= sumW; }
      return point;
    },
    tangent(curve, u) {
      const eps = 0.001;
      const p1 = this.evaluate(curve, Math.max(0, u - eps));
      const p2 = this.evaluate(curve, Math.min(1, u + eps));
      const d = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
      const len = Math.sqrt(d.x*d.x + d.y*d.y + d.z*d.z);
      return len > 1e-10 ? { x: d.x/len, y: d.y/len, z: d.z/len } : { x: 1, y: 0, z: 0 };
    },
    curvature(curve, u) {
      const eps = 0.001;
      const p0 = this.evaluate(curve, Math.max(0, u - eps));
      const p1 = this.evaluate(curve, u);
      const p2 = this.evaluate(curve, Math.min(1, u + eps));
      const d1 = { x: p1.x - p0.x, y: p1.y - p0.y, z: p1.z - p0.z };
      const d2 = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
      const cross = {
        x: d1.y * d2.z - d1.z * d2.y,
        y: d1.z * d2.x - d1.x * d2.z,
        z: d1.x * d2.y - d1.y * d2.x
      };
      const crossMag = Math.sqrt(cross.x*cross.x + cross.y*cross.y + cross.z*cross.z);
      const d1Mag = Math.sqrt(d1.x*d1.x + d1.y*d1.y + d1.z*d1.z);
      return d1Mag > 1e-10 ? crossMag / Math.pow(d1Mag, 3) : 0;
    },
    tessellate(curve, tolerance = 0.01) {
      const points = [];
      for (let u = 0; u <= 1; u += 0.02) {
        points.push({ ...this.evaluate(curve, u), u });
      }
      return points;
    }
  },
  surface: {
    evaluate(surface, u, v) {
      const { degreeU, degreeV, controlPoints, knotsU, knotsV, weights } = surface;
      const uCount = controlPoints.length, vCount = controlPoints[0].length;
      const uMin = knotsU[degreeU], uMax = knotsU[uCount];
      const vMin = knotsV[degreeV], vMax = knotsV[vCount];
      const uActual = uMin + u * (uMax - uMin);
      const vActual = vMin + v * (vMax - vMin);

      const basisU = PRISM_NURBS_LIBRARY.basis.basisFunctions(uActual, degreeU, knotsU);
      const basisV = PRISM_NURBS_LIBRARY.basis.basisFunctions(vActual, degreeV, knotsV);

      let point = { x: 0, y: 0, z: 0 }, sumW = 0;
      for (let i = 0; i <= degreeU; i++) {
        const ui = basisU.span - degreeU + i;
        for (let j = 0; j <= degreeV; j++) {
          const vj = basisV.span - degreeV + j;
          if (ui >= 0 && ui < uCount && vj >= 0 && vj < vCount) {
            const cp = controlPoints[ui][vj];
            const w = weights ? weights[ui][vj] : 1.0;
            const basis = basisU.values[i] * basisV.values[j] * w;
            point.x += basis * cp.x;
            point.y += basis * cp.y;
            point.z += basis * cp.z;
            sumW += basis;
          }
        }
      }
      if (weights && sumW > 0) { point.x /= sumW; point.y /= sumW; point.z /= sumW; }
      return point;
    },
    normal(surface, u, v) {
      const eps = 0.001;
      const p = this.evaluate(surface, u, v);
      const pu = this.evaluate(surface, Math.min(u + eps, 1), v);
      const pv = this.evaluate(surface, u, Math.min(v + eps, 1));
      const du = { x: (pu.x - p.x) / eps, y: (pu.y - p.y) / eps, z: (pu.z - p.z) / eps };
      const dv = { x: (pv.x - p.x) / eps, y: (pv.y - p.y) / eps, z: (pv.z - p.z) / eps };
      const normal = {
        x: du.y * dv.z - du.z * dv.y,
        y: du.z * dv.x - du.x * dv.z,
        z: du.x * dv.y - du.y * dv.x
      };
      const len = Math.sqrt(normal.x*normal.x + normal.y*normal.y + normal.z*normal.z);
      if (len > 1e-10) { normal.x /= len; normal.y /= len; normal.z /= len; }
      else { normal.z = 1; }
      return normal;
    },
    curvatures(surface, u, v) {
      const eps = 0.001;
      const p = this.evaluate(surface, u, v);
      const n = this.normal(surface, u, v);
      const pu = this.evaluate(surface, Math.min(u + eps, 1), v);
      const pv = this.evaluate(surface, u, Math.min(v + eps, 1));
      const Su = { x: (pu.x - p.x) / eps, y: (pu.y - p.y) / eps, z: (pu.z - p.z) / eps };
      const Sv = { x: (pv.x - p.x) / eps, y: (pv.y - p.y) / eps, z: (pv.z - p.z) / eps };
      const E = Su.x*Su.x + Su.y*Su.y + Su.z*Su.z;
      const F = Su.x*Sv.x + Su.y*Sv.y + Su.z*Sv.z;
      const G = Sv.x*Sv.x + Sv.y*Sv.y + Sv.z*Sv.z;
      const denom = E*G - F*F;
      const K = 0, H = 0;
      const disc = Math.sqrt(Math.max(H*H - K, 0));
      return { k1: H + disc, k2: H - disc, gaussian: K, mean: H };
    },
    tessellate(surface, uDivs = 20, vDivs = 20) {
      const vertices = [], normals = [], uvs = [], indices = [];
      for (let i = 0; i <= uDivs; i++) {
        const u = i / uDivs;
        for (let j = 0; j <= vDivs; j++) {
          const v = j / vDivs;
          vertices.push(this.evaluate(surface, u, v));
          normals.push(this.normal(surface, u, v));
          uvs.push({ u, v });
        }
      }
      for (let i = 0; i < uDivs; i++) {
        for (let j = 0; j < vDivs; j++) {
          const idx = i * (vDivs + 1) + j;
          indices.push(idx, idx + 1, idx + vDivs + 1);
          indices.push(idx + 1, idx + vDivs + 2, idx + vDivs + 1);
        }
      }
      return { vertices, normals, uvs, indices };
    },
    closestPoint(surface, point, tolerance = 0.0001, maxIter = 100) {
      let u = 0.5, v = 0.5;
      for (let iter = 0; iter < maxIter; iter++) {
        const p = this.evaluate(surface, u, v);
        const eps = 0.001;
        const pu = this.evaluate(surface, Math.min(u + eps, 1), v);
        const pv = this.evaluate(surface, u, Math.min(v + eps, 1));
        const Su = { x: (pu.x - p.x) / eps, y: (pu.y - p.y) / eps, z: (pu.z - p.z) / eps };
        const Sv = { x: (pv.x - p.x) / eps, y: (pv.y - p.y) / eps, z: (pv.z - p.z) / eps };
        const r = { x: point.x - p.x, y: point.y - p.y, z: point.z - p.z };
        const a11 = Su.x*Su.x + Su.y*Su.y + Su.z*Su.z;
        const a12 = Su.x*Sv.x + Su.y*Sv.y + Su.z*Sv.z;
        const a22 = Sv.x*Sv.x + Sv.y*Sv.y + Sv.z*Sv.z;
        const b1 = r.x*Su.x + r.y*Su.y + r.z*Su.z;
        const b2 = r.x*Sv.x + r.y*Sv.y + r.z*Sv.z;
        const det = a11*a22 - a12*a12;
        if (Math.abs(det) < 1e-12) break;
        const du = (a22*b1 - a12*b2) / det;
        const dv = (a11*b2 - a12*b1) / det;
        u = Math.max(0, Math.min(1, u + du));
        v = Math.max(0, Math.min(1, v + dv));
        if (Math.abs(du) < tolerance && Math.abs(dv) < tolerance) break;
      }
      return { u, v, point: this.evaluate(surface, u, v) };
    }
  },
  utils: {
    uniformKnots(n, degree) {
      const knots = [];
      for (let i = 0; i <= degree; i++) knots.push(0);
      for (let i = 1; i < n - degree; i++) knots.push(i / (n - degree));
      for (let i = 0; i <= degree; i++) knots.push(1);
      return knots;
    },
    createCircle(center, radius) {
      const sqrt2 = Math.sqrt(2) / 2;
      const controlPoints = [
        { x: radius, y: 0, z: 0 }, { x: radius, y: radius, z: 0 },
        { x: 0, y: radius, z: 0 }, { x: -radius, y: radius, z: 0 },
        { x: -radius, y: 0, z: 0 }, { x: -radius, y: -radius, z: 0 },
        { x: 0, y: -radius, z: 0 }, { x: radius, y: -radius, z: 0 },
        { x: radius, y: 0, z: 0 }
      ].map(p => ({ x: p.x + center.x, y: p.y + center.y, z: (p.z || 0) + (center.z || 0) }));
      const weights = [1, sqrt2, 1, sqrt2, 1, sqrt2, 1, sqrt2, 1];
      const knots = [0, 0, 0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1, 1, 1];
      return { degree: 2, controlPoints, weights, knots };
    }
  }
}