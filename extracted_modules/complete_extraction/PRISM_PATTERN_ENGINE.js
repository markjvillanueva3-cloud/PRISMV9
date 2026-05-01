const PRISM_PATTERN_ENGINE = {
  version: '1.0.0',
  name: 'Pattern Engine',
  description: 'Complete pattern system - rectangular, circular, path patterns based on Fusion 360',

  // Create rectangular pattern
  rectangularPattern: function(objects, params) {
    const {
      direction1,           // First direction axis
      direction2 = null,    // Second direction (optional, perpendicular)
      count1 = 2,           // Number in first direction
      count2 = 1,           // Number in second direction
      spacing1,             // Spacing in first direction
      spacing2 = null,      // Spacing in second direction
      spacingType = 'extent', // 'extent' (total distance) or 'spacing' (between items)
      suppress = []         // Indices to suppress
    } = params;

    const patternResult = {
      operation: 'rectangular_pattern',
      originalObjects: objects,
      params: params,
      instances: [],
      success: true
    };
    // Calculate actual spacing
    const actualSpacing1 = spacingType === 'extent'
      ? spacing1 / (count1 - 1 || 1)
      : spacing1;
    const actualSpacing2 = spacing2 && spacingType === 'extent'
      ? spacing2 / (count2 - 1 || 1)
      : (spacing2 || 0);

    // Normalize direction vectors
    const dir1 = this._normalizeVector(direction1);
    const dir2 = direction2 ? this._normalizeVector(direction2) :
                 this._getPerpendicularVector(dir1);

    let instanceIndex = 0;

    for (let i = 0; i < count1; i++) {
      for (let j = 0; j < count2; j++) {
        if (i === 0 && j === 0) continue; // Skip original

        instanceIndex++;

        if (suppress.includes(instanceIndex)) continue;

        const offset = {
          x: dir1.x * i * actualSpacing1 + dir2.x * j * actualSpacing2,
          y: dir1.y * i * actualSpacing1 + dir2.y * j * actualSpacing2,
          z: dir1.z * i * actualSpacing1 + dir2.z * j * actualSpacing2
        };
        for (const obj of objects) {
          const instance = this._copyAndTranslate(obj, offset);
          instance.patternIndex = instanceIndex;
          instance.gridPosition = { i, j };
          patternResult.instances.push(instance);
        }
      }
    }
    patternResult.totalInstances = instanceIndex;
    return patternResult;
  },
  // Create circular pattern
  circularPattern: function(objects, params) {
    const {
      axis,                 // Rotation axis
      count = 4,            // Number of instances
      angle = 360,          // Total angle (degrees)
      angularSpacing = 'full', // 'full' (distribute evenly) or 'angle' (use angle value)
      suppress = []         // Indices to suppress
    } = params;

    const patternResult = {
      operation: 'circular_pattern',
      originalObjects: objects,
      params: params,
      instances: [],
      success: true
    };
    // Calculate angular step
    const totalAngle = angularSpacing === 'full' ? 360 : angle;
    const angleStep = totalAngle / count;

    for (let i = 1; i < count; i++) {
      if (suppress.includes(i)) continue;

      const rotationAngle = angleStep * i;

      for (const obj of objects) {
        const instance = this._copyAndRotate(obj, axis, rotationAngle);
        instance.patternIndex = i;
        instance.rotationAngle = rotationAngle;
        patternResult.instances.push(instance);
      }
    }
    patternResult.totalInstances = count - 1;
    return patternResult;
  },
  // Create pattern along path
  patternOnPath: function(objects, params) {
    const {
      path,                 // Curve to pattern along
      count = 3,            // Number of instances
      spacing = 'equal',    // 'equal' or 'distance'
      distance = null,      // Distance between items (if spacing = 'distance')
      orientation = 'path', // 'path' (follow path) or 'identical' (same orientation)
      startDistance = 0,    // Distance from path start
      suppress = []
    } = params;

    const patternResult = {
      operation: 'pattern_on_path',
      originalObjects: objects,
      params: params,
      instances: [],
      success: true
    };
    // Get path length
    const pathLength = this._getCurveLength(path);

    // Calculate positions
    const positions = [];

    if (spacing === 'equal') {
      const step = (pathLength - startDistance) / (count - 1 || 1);
      for (let i = 0; i < count; i++) {
        positions.push(startDistance + i * step);
      }
    } else {
      for (let i = 0; i < count; i++) {
        positions.push(startDistance + i * distance);
        if (positions[positions.length - 1] > pathLength) break;
      }
    }
    // Create instances
    for (let i = 1; i < positions.length; i++) {
      if (suppress.includes(i)) continue;

      const pathDist = positions[i];
      const point = this._evaluateCurveAtDistance(path, pathDist);
      const tangent = this._evaluateCurveTangentAtDistance(path, pathDist);

      for (const obj of objects) {
        let instance;

        if (orientation === 'path') {
          // Rotate to follow path tangent
          instance = this._copyTranslateAndOrient(obj, point, tangent);
        } else {
          // Same orientation as original
          const offset = {
            x: point.x - (obj.center?.x || obj.start?.x || 0),
            y: point.y - (obj.center?.y || obj.start?.y || 0),
            z: point.z - (obj.center?.z || obj.start?.z || 0)
          };
          instance = this._copyAndTranslate(obj, offset);
        }
        instance.patternIndex = i;
        instance.pathDistance = pathDist;
        patternResult.instances.push(instance);
      }
    }
    return patternResult;
  },
  // Mirror objects
  mirror: function(objects, mirrorPlane) {
    const mirrorResult = {
      operation: 'mirror',
      originalObjects: objects,
      mirrorPlane: mirrorPlane,
      mirroredObjects: [],
      success: true
    };
    for (const obj of objects) {
      const mirrored = this._mirrorObject(obj, mirrorPlane);
      mirrored.isMirrorInstance = true;
      mirrorResult.mirroredObjects.push(mirrored);
    }
    return mirrorResult;
  },
  // Helper functions
  _normalizeVector: function(v) {
    const len = Math.sqrt(v.x*v.x + v.y*v.y + (v.z||0)*(v.z||0));
    if (len === 0) return { x: 1, y: 0, z: 0 };
    return { x: v.x/len, y: v.y/len, z: (v.z||0)/len };
  },
  _getPerpendicularVector: function(v) {
    // Find a vector perpendicular to v
    if (Math.abs(v.x) < 0.9) {
      return this._normalizeVector({ x: 0, y: -v.z, z: v.y });
    }
    return this._normalizeVector({ x: -v.y, y: v.x, z: 0 });
  },
  _copyAndTranslate: function(obj, offset) {
    const copy = JSON.parse(JSON.stringify(obj));

    if (copy.center) {
      copy.center.x += offset.x;
      copy.center.y += offset.y;
      copy.center.z = (copy.center.z || 0) + offset.z;
    }
    if (copy.start) {
      copy.start.x += offset.x;
      copy.start.y += offset.y;
      copy.start.z = (copy.start.z || 0) + offset.z;
    }
    if (copy.end) {
      copy.end.x += offset.x;
      copy.end.y += offset.y;
      copy.end.z = (copy.end.z || 0) + offset.z;
    }
    if (copy.vertices) {
      copy.vertices = copy.vertices.map(v => ({
        x: v.x + offset.x,
        y: v.y + offset.y,
        z: (v.z || 0) + offset.z
      }));
    }
    return copy;
  },
  _copyAndRotate: function(obj, axis, angleDeg) {
    const copy = JSON.parse(JSON.stringify(obj));
    const angleRad = angleDeg * Math.PI / 180;

    const rotate = (point) => {
      // Rodrigues' rotation formula
      const p = { x: point.x - axis.point.x, y: point.y - axis.point.y, z: (point.z || 0) - (axis.point.z || 0) };
      const k = this._normalizeVector(axis.direction);

      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);
      const dot = p.x * k.x + p.y * k.y + p.z * k.z;

      const cross = {
        x: k.y * p.z - k.z * p.y,
        y: k.z * p.x - k.x * p.z,
        z: k.x * p.y - k.y * p.x
      };
      return {
        x: axis.point.x + p.x * cos + cross.x * sin + k.x * dot * (1 - cos),
        y: axis.point.y + p.y * cos + cross.y * sin + k.y * dot * (1 - cos),
        z: (axis.point.z || 0) + p.z * cos + cross.z * sin + k.z * dot * (1 - cos)
      };
    };
    if (copy.center) copy.center = rotate(copy.center);
    if (copy.start) copy.start = rotate(copy.start);
    if (copy.end) copy.end = rotate(copy.end);
    if (copy.vertices) copy.vertices = copy.vertices.map(rotate);

    return copy;
  },
  _mirrorObject: function(obj, plane) {
    const copy = JSON.parse(JSON.stringify(obj));

    const mirror = (point) => {
      // Reflect point across plane
      const d = (point.x - plane.origin.x) * plane.normal.x +
                (point.y - plane.origin.y) * plane.normal.y +
                ((point.z || 0) - (plane.origin.z || 0)) * plane.normal.z;

      return {
        x: point.x - 2 * d * plane.normal.x,
        y: point.y - 2 * d * plane.normal.y,
        z: (point.z || 0) - 2 * d * plane.normal.z
      };
    };
    if (copy.center) copy.center = mirror(copy.center);
    if (copy.start) copy.start = mirror(copy.start);
    if (copy.end) copy.end = mirror(copy.end);
    if (copy.vertices) copy.vertices = copy.vertices.map(mirror);

    return copy;
  },
  _getCurveLength: function(curve) {
    if (curve.type === 'line') {
      const dx = curve.end.x - curve.start.x;
      const dy = curve.end.y - curve.start.y;
      const dz = (curve.end.z || 0) - (curve.start.z || 0);
      return Math.sqrt(dx*dx + dy*dy + dz*dz);
    } else if (curve.type === 'arc') {
      const angleSpan = Math.abs(curve.endAngle - curve.startAngle);
      return curve.radius * angleSpan;
    }
    return 0;
  },
  _evaluateCurveAtDistance: function(curve, distance) {
    const length = this._getCurveLength(curve);
    const t = distance / length;

    if (curve.type === 'line') {
      return {
        x: curve.start.x + t * (curve.end.x - curve.start.x),
        y: curve.start.y + t * (curve.end.y - curve.start.y),
        z: (curve.start.z || 0) + t * ((curve.end.z || 0) - (curve.start.z || 0))
      };
    } else if (curve.type === 'arc') {
      const angle = curve.startAngle + t * (curve.endAngle - curve.startAngle);
      return {
        x: curve.center.x + curve.radius * Math.cos(angle),
        y: curve.center.y + curve.radius * Math.sin(angle),
        z: curve.center.z || 0
      };
    }
    return curve.start;
  },
  _evaluateCurveTangentAtDistance: function(curve, distance) {
    const length = this._getCurveLength(curve);
    const t = distance / length;

    if (curve.type === 'line') {
      const dx = curve.end.x - curve.start.x;
      const dy = curve.end.y - curve.start.y;
      const dz = (curve.end.z || 0) - (curve.start.z || 0);
      const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
      return { x: dx/len, y: dy/len, z: dz/len };
    } else if (curve.type === 'arc') {
      const angle = curve.startAngle + t * (curve.endAngle - curve.startAngle);
      return {
        x: -Math.sin(angle),
        y: Math.cos(angle),
        z: 0
      };
    }
    return { x: 1, y: 0, z: 0 };
  },
  _copyTranslateAndOrient: function(obj, point, tangent) {
    const copy = JSON.parse(JSON.stringify(obj));
    // Position at point with tangent as forward direction
    copy.position = point;
    copy.orientation = tangent;
    return copy;
  },
  confidence: {
    overall: 0.88,
    rectangularPattern: 0.92,
    circularPattern: 0.90,
    pathPattern: 0.85,
    mirror: 0.88
  }
}