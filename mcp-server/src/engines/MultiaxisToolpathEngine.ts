/**
 * PRISM MCP Server -- Multiaxis Toolpath Engine
 *
 * 5-axis toolpath tool axis control:
 * - Lead/lag/tilt angle application (Rodrigues rotation)
 * - SLERP axis interpolation
 * - Gouge detection (tool-surface interference)
 * - Tool axis smoothing (Gaussian window)
 *
 * Based on MIT 2.76, hyperMILL 5-axis strategies.
 * Ported from PRISM_MULTIAXIS_TOOLPATH_ENGINE.js (monolith R2.3.1).
 *
 * @module MultiaxisToolpathEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Vec3 { x: number; y: number; z: number; }

export interface ToolpathPoint {
  position: Vec3;
  normal: Vec3;
  axis?: Vec3;
  feedDir?: Vec3;
}

export interface AxisAngles {
  leadAngle?: number;   // radians
  lagAngle?: number;    // radians
  tiltAngle?: number;   // radians
}

export interface GougeResult {
  gougeDetected: boolean;
  minClearance: number;
  gougePoints: number[];
}

// ============================================================================
// ENGINE
// ============================================================================

class MultiaxisToolpathEngineImpl {

  /** Normalize a 3D vector. */
  normalize(v: Vec3): Vec3 {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len < 1e-12) return { x: 0, y: 0, z: 1 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }

  /** Cross product of two 3D vectors. */
  cross(a: Vec3, b: Vec3): Vec3 {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
  }

  /** Dot product of two 3D vectors. */
  dot(a: Vec3, b: Vec3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  /** Rotate vector around axis by angle (Rodrigues formula). */
  rotateAroundAxis(vec: Vec3, axis: Vec3, angle: number): Vec3 {
    const c = Math.cos(angle), s = Math.sin(angle);
    const k = this.normalize(axis);
    const cr = this.cross(k, vec);
    const d = this.dot(k, vec);
    return {
      x: vec.x * c + cr.x * s + k.x * d * (1 - c),
      y: vec.y * c + cr.y * s + k.y * d * (1 - c),
      z: vec.z * c + cr.z * s + k.z * d * (1 - c),
    };
  }

  /** Calculate tool axis from surface normal with lead/lag/tilt angles. */
  toolAxisFromNormal(normal: Vec3, feedDir: Vec3, angles: AxisAngles = {}): Vec3 {
    const n = this.normalize(normal);
    const f = this.normalize(feedDir);
    const side = this.normalize(this.cross(f, n));

    let axis = { ...n };
    const { leadAngle = 0, lagAngle = 0, tiltAngle = 0 } = angles;

    if (Math.abs(leadAngle) > 1e-6) axis = this.rotateAroundAxis(axis, side, leadAngle);
    if (Math.abs(lagAngle) > 1e-6) axis = this.rotateAroundAxis(axis, side, -lagAngle);
    if (Math.abs(tiltAngle) > 1e-6) axis = this.rotateAroundAxis(axis, f, tiltAngle);

    return this.normalize(axis);
  }

  /** Spherical linear interpolation between two axis vectors. */
  slerp(axis1: Vec3, axis2: Vec3, t: number): Vec3 {
    const a1 = this.normalize(axis1);
    let a2 = this.normalize(axis2);
    let d = this.dot(a1, a2);

    if (Math.abs(d) > 0.9999) {
      return this.normalize({
        x: a1.x + t * (a2.x - a1.x),
        y: a1.y + t * (a2.y - a1.y),
        z: a1.z + t * (a2.z - a1.z),
      });
    }

    if (d < 0) {
      d = -d;
      a2 = { x: -a2.x, y: -a2.y, z: -a2.z };
    }

    const theta = Math.acos(Math.min(1, Math.max(-1, d)));
    const sinTheta = Math.sin(theta);
    if (sinTheta < 1e-10) return a1;

    const s1 = Math.sin((1 - t) * theta) / sinTheta;
    const s2 = Math.sin(t * theta) / sinTheta;

    return this.normalize({
      x: a1.x * s1 + a2.x * s2,
      y: a1.y * s1 + a2.y * s2,
      z: a1.z * s1 + a2.z * s2,
    });
  }

  /** Smooth tool axes along toolpath using Gaussian-weighted moving average. */
  smoothToolAxis(toolpath: ToolpathPoint[], windowSize: number = 5): ToolpathPoint[] {
    if (toolpath.length < 3) return toolpath;
    const half = Math.floor(windowSize / 2);
    const sigma = half / 2;
    const weights: number[] = [];
    for (let i = -half; i <= half; i++) {
      weights.push(Math.exp(-(i * i) / (2 * sigma * sigma)));
    }

    return toolpath.map((pt, idx) => {
      if (!pt.axis) return pt;
      let sx = 0, sy = 0, sz = 0, wSum = 0;
      for (let w = -half; w <= half; w++) {
        const ni = idx + w;
        if (ni < 0 || ni >= toolpath.length || !toolpath[ni].axis) continue;
        const wt = weights[w + half];
        sx += toolpath[ni].axis!.x * wt;
        sy += toolpath[ni].axis!.y * wt;
        sz += toolpath[ni].axis!.z * wt;
        wSum += wt;
      }
      if (wSum < 1e-10) return pt;
      return { ...pt, axis: this.normalize({ x: sx / wSum, y: sy / wSum, z: sz / wSum }) };
    });
  }

  /** Simple gouge detection: check if tool axis deviates too far from surface normal. */
  detectGouge(toolpath: ToolpathPoint[], toolRadius: number, maxAngle: number = Math.PI / 4): GougeResult {
    let minClearance = Infinity;
    const gougePoints: number[] = [];

    for (let i = 0; i < toolpath.length; i++) {
      const pt = toolpath[i];
      if (!pt.axis || !pt.normal) continue;
      const d = this.dot(this.normalize(pt.axis), this.normalize(pt.normal));
      const angle = Math.acos(Math.min(1, Math.max(-1, d)));
      const clearance = toolRadius * Math.cos(angle);
      if (clearance < minClearance) minClearance = clearance;
      if (angle > maxAngle) gougePoints.push(i);
    }

    return {
      gougeDetected: gougePoints.length > 0,
      minClearance,
      gougePoints,
    };
  }
}

export const multiaxisToolpathEngine = new MultiaxisToolpathEngineImpl();
