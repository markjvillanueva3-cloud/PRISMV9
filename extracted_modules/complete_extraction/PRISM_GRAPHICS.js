const PRISM_GRAPHICS = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSFORMATION MATRICES
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Create identity matrix
   */
  identity: function() {
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
  },
  
  /**
   * Create translation matrix
   */
  translate: function(tx, ty, tz) {
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      tx, ty, tz, 1
    ];
  },
  
  /**
   * Create scaling matrix
   */
  scale: function(sx, sy, sz) {
    if (sy === undefined) { sy = sx; sz = sx; }
    return [
      sx, 0, 0, 0,
      0, sy, 0, 0,
      0, 0, sz, 0,
      0, 0, 0, 1
    ];
  },
  
  /**
   * Create rotation matrix around X axis
   */
  rotateX: function(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [
      1, 0, 0, 0,
      0, c, s, 0,
      0, -s, c, 0,
      0, 0, 0, 1
    ];
  },
  
  /**
   * Create rotation matrix around Y axis
   */
  rotateY: function(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [
      c, 0, -s, 0,
      0, 1, 0, 0,
      s, 0, c, 0,
      0, 0, 0, 1
    ];
  },
  
  /**
   * Create rotation matrix around Z axis
   */
  rotateZ: function(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [
      c, s, 0, 0,
      -s, c, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
  },
  
  /**
   * Create rotation matrix around arbitrary axis (Rodrigues)
   */
  rotate: function(angle, ax, ay, az) {
    // Normalize axis
    const len = Math.sqrt(ax*ax + ay*ay + az*az);
    ax /= len; ay /= len; az /= len;
    
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const t = 1 - c;
    
    return [
      t*ax*ax + c,      t*ax*ay + s*az,  t*ax*az - s*ay,  0,
      t*ax*ay - s*az,   t*ay*ay + c,     t*ay*az + s*ax,  0,
      t*ax*az + s*ay,   t*ay*az - s*ax,  t*az*az + c,     0,
      0,                0,               0,               1
    ];
  },
  
  /**
   * Multiply two 4x4 matrices
   */
  multiply: function(a, b) {
    const result = new Array(16).fill(0);
    
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        for (let k = 0; k < 4; k++) {
          result[row * 4 + col] += a[row * 4 + k] * b[k * 4 + col];
        }
      }
    }
    
    return result;
  },
  
  /**
   * Compose multiple transforms
   */
  composeTransforms: function(...matrices) {
    return matrices.reduce((acc, mat) => this.multiply(acc, mat), this.identity());
  },
  
  /**
   * Transform a point by matrix
   */
  transformPoint: function(m, p) {
    const x = p[0], y = p[1], z = p[2];
    const w = m[3]*x + m[7]*y + m[11]*z + m[15] || 1;
    
    return [
      (m[0]*x + m[4]*y + m[8]*z + m[12]) / w,
      (m[1]*x + m[5]*y + m[9]*z + m[13]) / w,
      (m[2]*x + m[6]*y + m[10]*z + m[14]) / w
    ];
  },
  
  /**
   * Transform a direction (ignore translation)
   */
  transformDirection: function(m, d) {
    return [
      m[0]*d[0] + m[4]*d[1] + m[8]*d[2],
      m[1]*d[0] + m[5]*d[1] + m[9]*d[2],
      m[2]*d[0] + m[6]*d[1] + m[10]*d[2]
    ];
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW & PROJECTION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Create look-at view matrix
   */
  lookAt: function(eye, target, up) {
    // Forward vector (camera looks down -Z)
    let fx = eye[0] - target[0];
    let fy = eye[1] - target[1];
    let fz = eye[2] - target[2];
    let flen = Math.sqrt(fx*fx + fy*fy + fz*fz);
    fx /= flen; fy /= flen; fz /= flen;
    
    // Right vector (X axis)
    let rx = up[1]*fz - up[2]*fy;
    let ry = up[2]*fx - up[0]*fz;
    let rz = up[0]*fy - up[1]*fx;
    let rlen = Math.sqrt(rx*rx + ry*ry + rz*rz);
    rx /= rlen; ry /= rlen; rz /= rlen;
    
    // Up vector (Y axis)
    const ux = fy*rz - fz*ry;
    const uy = fz*rx - fx*rz;
    const uz = fx*ry - fy*rx;
    
    return [
      rx, ux, fx, 0,
      ry, uy, fy, 0,
      rz, uz, fz, 0,
      -(rx*eye[0] + ry*eye[1] + rz*eye[2]),
      -(ux*eye[0] + uy*eye[1] + uz*eye[2]),
      -(fx*eye[0] + fy*eye[1] + fz*eye[2]),
      1
    ];
  },
  
  /**
   * Create perspective projection matrix
   */
  perspective: function(fovY, aspect, near, far) {
    const f = 1 / Math.tan(fovY / 2);
    const nf = 1 / (near - far);
    
    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ];
  },
  
  /**
   * Create orthographic projection matrix
   */
  orthographic: function(left, right, bottom, top, near, far) {
    const rl = 1 / (right - left);
    const tb = 1 / (top - bottom);
    const fn = 1 / (far - near);
    
    return [
      2 * rl, 0, 0, 0,
      0, 2 * tb, 0, 0,
      0, 0, -2 * fn, 0,
      -(right + left) * rl, -(top + bottom) * tb, -(far + near) * fn, 1
    ];
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LIGHTING
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Compute Phong lighting
   */
  phongLighting: function(config) {
    const {
      position,      // Surface position
      normal,        // Surface normal
      lightPos,      // Light position
      viewPos,       // Camera position
      ambient = [0.1, 0.1, 0.1],
      diffuseColor = [0.7, 0.7, 0.7],
      specularColor = [1, 1, 1],
      shininess = 32
    } = config;
    
    // Normalize vectors
    const N = this._normalize(normal);
    const L = this._normalize(this._subtract(lightPos, position));
    const V = this._normalize(this._subtract(viewPos, position));
    const R = this._reflect(this._negate(L), N);
    
    // Ambient
    const ambientComponent = ambient;
    
    // Diffuse
    const diff = Math.max(this._dot(N, L), 0);
    const diffuseComponent = diffuseColor.map(c => c * diff);
    
    // Specular
    const spec = Math.pow(Math.max(this._dot(R, V), 0), shininess);
    const specularComponent = specularColor.map(c => c * spec);
    
    // Combine
    return {
      color: [
        Math.min(ambientComponent[0] + diffuseComponent[0] + specularComponent[0], 1),
        Math.min(ambientComponent[1] + diffuseComponent[1] + specularComponent[1], 1),
        Math.min(ambientComponent[2] + diffuseComponent[2] + specularComponent[2], 1)
      ],
      diffuse: diff,
      specular: spec
    };
  },
  
  /**
   * Compute Blinn-Phong lighting (more efficient)
   */
  blinnPhongLighting: function(config) {
    const {
      position, normal, lightPos, viewPos,
      ambient = [0.1, 0.1, 0.1],
      diffuseColor = [0.7, 0.7, 0.7],
      specularColor = [1, 1, 1],
      shininess = 32
    } = config;
    
    const N = this._normalize(normal);
    const L = this._normalize(this._subtract(lightPos, position));
    const V = this._normalize(this._subtract(viewPos, position));
    const H = this._normalize(this._add(L, V)); // Halfway vector
    
    const diff = Math.max(this._dot(N, L), 0);
    const spec = Math.pow(Math.max(this._dot(N, H), 0), shininess);
    
    return {
      color: [
        Math.min(ambient[0] + diffuseColor[0] * diff + specularColor[0] * spec, 1),
        Math.min(ambient[1] + diffuseColor[1] * diff + specularColor[1] * spec, 1),
        Math.min(ambient[2] + diffuseColor[2] * diff + specularColor[2] * spec, 1)
      ],
      diffuse: diff,
      specular: spec
    };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MESH PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Compute face normals for mesh
   */
  computeNormals: function(vertices, indices, smooth = true) {
    const faceNormals = [];
    const vertexNormals = new Array(vertices.length / 3).fill(null).map(() => [0, 0, 0]);
    
    // Compute face normals
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i] * 3;
      const i1 = indices[i + 1] * 3;
      const i2 = indices[i + 2] * 3;
      
      const v0 = [vertices[i0], vertices[i0 + 1], vertices[i0 + 2]];
      const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
      const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];
      
      const edge1 = this._subtract(v1, v0);
      const edge2 = this._subtract(v2, v0);
      const normal = this._normalize(this._cross(edge1, edge2));
      
      faceNormals.push(normal);
      
      if (smooth) {
        // Accumulate to vertex normals
        for (const idx of [indices[i], indices[i + 1], indices[i + 2]]) {
          vertexNormals[idx][0] += normal[0];
          vertexNormals[idx][1] += normal[1];
          vertexNormals[idx][2] += normal[2];
        }
      }
    }
    
    // Normalize vertex normals
    if (smooth) {
      for (let i = 0; i < vertexNormals.length; i++) {
        vertexNormals[i] = this._normalize(vertexNormals[i]);
      }
    }
    
    return {
      faceNormals,
      vertexNormals: smooth ? vertexNormals.flat() : null
    };
  },
  
  /**
   * Compute bounding box
   */
  computeBounds: function(vertices) {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    
    for (let i = 0; i < vertices.length; i += 3) {
      min[0] = Math.min(min[0], vertices[i]);
      min[1] = Math.min(min[1], vertices[i + 1]);
      min[2] = Math.min(min[2], vertices[i + 2]);
      max[0] = Math.max(max[0], vertices[i]);
      max[1] = Math.max(max[1], vertices[i + 1]);
      max[2] = Math.max(max[2], vertices[i + 2]);
    }
    
    const center = [
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2
    ];
    
    const size = [
      max[0] - min[0],
      max[1] - min[1],
      max[2] - min[2]
    ];
    
    const radius = Math.sqrt(size[0]*size[0] + size[1]*size[1] + size[2]*size[2]) / 2;
    
    return { min, max, center, size, radius };
  },
  
  /**
   * Compute mesh center
   */
  computeCenter: function(vertices) {
    let cx = 0, cy = 0, cz = 0;
    const count = vertices.length / 3;
    
    for (let i = 0; i < vertices.length; i += 3) {
      cx += vertices[i];
      cy += vertices[i + 1];
      cz += vertices[i + 2];
    }
    
    return [cx / count, cy / count, cz / count];
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RAY CASTING / PICKING
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Convert screen coordinates to world ray
   */
  screenToRay: function(screenX, screenY, width, height, viewMatrix, projMatrix) {
    // Convert to NDC
    const ndcX = (2 * screenX / width) - 1;
    const ndcY = 1 - (2 * screenY / height);
    
    // Clip space coordinates for near and far planes
    const nearPoint = [ndcX, ndcY, -1, 1];
    const farPoint = [ndcX, ndcY, 1, 1];
    
    // Invert view-projection matrix
    const vpMatrix = this.multiply(projMatrix, viewMatrix);
    const invVP = this._invertMatrix(vpMatrix);
    
    if (!invVP) return null;
    
    // Unproject points
    const nearWorld = this._unproject(nearPoint, invVP);
    const farWorld = this._unproject(farPoint, invVP);
    
    // Ray direction
    const direction = this._normalize(this._subtract(farWorld, nearWorld));
    
    return {
      origin: nearWorld,
      direction
    };
  },
  
  /**
   * Ray-triangle intersection (Möller-Trumbore)
   */
  rayTriangleIntersect: function(rayOrigin, rayDir, v0, v1, v2) {
    const EPSILON = 1e-7;
    
    const edge1 = this._subtract(v1, v0);
    const edge2 = this._subtract(v2, v0);
    
    const h = this._cross(rayDir, edge2);
    const a = this._dot(edge1, h);
    
    if (Math.abs(a) < EPSILON) return null; // Parallel
    
    const f = 1 / a;
    const s = this._subtract(rayOrigin, v0);
    const u = f * this._dot(s, h);
    
    if (u < 0 || u > 1) return null;
    
    const q = this._cross(s, edge1);
    const v = f * this._dot(rayDir, q);
    
    if (v < 0 || u + v > 1) return null;
    
    const t = f * this._dot(edge2, q);
    
    if (t > EPSILON) {
      return {
        t,
        point: [
          rayOrigin[0] + rayDir[0] * t,
          rayOrigin[1] + rayDir[1] * t,
          rayOrigin[2] + rayDir[2] * t
        ],
        u, v,
        barycentrics: [1 - u - v, u, v]
      };
    }
    
    return null;
  },
  
  /**
   * Ray-mesh intersection
   */
  rayMeshIntersect: function(rayOrigin, rayDir, vertices, indices) {
    let closest = null;
    let closestT = Infinity;
    let closestFace = -1;
    
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i] * 3;
      const i1 = indices[i + 1] * 3;
      const i2 = indices[i + 2] * 3;
      
      const v0 = [vertices[i0], vertices[i0 + 1], vertices[i0 + 2]];
      const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
      const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];
      
      const hit = this.rayTriangleIntersect(rayOrigin, rayDir, v0, v1, v2);
      
      if (hit && hit.t < closestT) {
        closestT = hit.t;
        closest = hit;
        closestFace = i / 3;
      }
    }
    
    if (closest) {
      closest.faceIndex = closestFace;
    }
    
    return closest;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COLOR UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * HSV to RGB conversion
   */
  hsvToRgb: function(h, s, v) {
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    
    return [r, g, b];
  },
  
  /**
   * Create color gradient
   */
  colorGradient: function(value, min, max, colors = null) {
    if (!colors) {
      colors = [
        [0, 0, 1],    // Blue (cold)
        [0, 1, 1],    // Cyan
        [0, 1, 0],    // Green
        [1, 1, 0],    // Yellow
        [1, 0, 0]     // Red (hot)
      ];
    }
    
    const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const idx = t * (colors.length - 1);
    const i = Math.floor(idx);
    const f = idx - i;
    
    if (i >= colors.length - 1) return colors[colors.length - 1];
    
    return [
      colors[i][0] + f * (colors[i + 1][0] - colors[i][0]),
      colors[i][1] + f * (colors[i + 1][1] - colors[i][1]),
      colors[i][2] + f * (colors[i + 1][2] - colors[i][2])
    ];
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // VECTOR UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════
  
  _add: function(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  },
  
  _subtract: function(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  },
  
  _negate: function(v) {
    return [-v[0], -v[1], -v[2]];
  },
  
  _scale: function(v, s) {
    return [v[0] * s, v[1] * s, v[2] * s];
  },
  
  _dot: function(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  },
  
  _cross: function(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  },
  
  _length: function(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  },
  
  _normalize: function(v) {
    const len = this._length(v);
    if (len === 0) return [0, 0, 0];
    return [v[0] / len, v[1] / len, v[2] / len];
  },
  
  _reflect: function(v, n) {
    const d = 2 * this._dot(v, n);
    return [v[0] - d * n[0], v[1] - d * n[1], v[2] - d * n[2]];
  },
  
  _unproject: function(point, invMatrix) {
    const x = invMatrix[0]*point[0] + invMatrix[4]*point[1] + invMatrix[8]*point[2] + invMatrix[12]*point[3];
    const y = invMatrix[1]*point[0] + invMatrix[5]*point[1] + invMatrix[9]*point[2] + invMatrix[13]*point[3];
    const z = invMatrix[2]*point[0] + invMatrix[6]*point[1] + invMatrix[10]*point[2] + invMatrix[14]*point[3];
    const w = invMatrix[3]*point[0] + invMatrix[7]*point[1] + invMatrix[11]*point[2] + invMatrix[15]*point[3];
    
    return [x / w, y / w, z / w];
  },
  
  _invertMatrix: function(m) {
    // 4x4 matrix inversion (simplified, assumes well-formed matrix)
    const inv = new Array(16);
    
    inv[0] = m[5]*m[10]*m[15] - m[5]*m[11]*m[14] - m[9]*m[6]*m[15] + m[9]*m[7]*m[14] + m[13]*m[6]*m[11] - m[13]*m[7]*m[10];
    inv[4] = -m[4]*m[10]*m[15] + m[4]*m[11]*m[14] + m[8]*m[6]*m[15] - m[8]*m[7]*m[14] - m[12]*m[6]*m[11] + m[12]*m[7]*m[10];
    inv[8] = m[4]*m[9]*m[15] - m[4]*m[11]*m[13] - m[8]*m[5]*m[15] + m[8]*m[7]*m[13] + m[12]*m[5]*m[11] - m[12]*m[7]*m[9];
    inv[12] = -m[4]*m[9]*m[14] + m[4]*m[10]*m[13] + m[8]*m[5]*m[14] - m[8]*m[6]*m[13] - m[12]*m[5]*m[10] + m[12]*m[6]*m[9];
    inv[1] = -m[1]*m[10]*m[15] + m[1]*m[11]*m[14] + m[9]*m[2]*m[15] - m[9]*m[3]*m[14] - m[13]*m[2]*m[11] + m[13]*m[3]*m[10];
    inv[5] = m[0]*m[10]*m[15] - m[0]*m[11]*m[14] - m[8]*m[2]*m[15] + m[8]*m[3]*m[14] + m[12]*m[2]*m[11] - m[12]*m[3]*m[10];
    inv[9] = -m[0]*m[9]*m[15] + m[0]*m[11]*m[13] + m[8]*m[1]*m[15] - m[8]*m[3]*m[13] - m[12]*m[1]*m[11] + m[12]*m[3]*m[9];
    inv[13] = m[0]*m[9]*m[14] - m[0]*m[10]*m[13] - m[8]*m[1]*m[14] + m[8]*m[2]*m[13] + m[12]*m[1]*m[10] - m[12]*m[2]*m[9];
    inv[2] = m[1]*m[6]*m[15] - m[1]*m[7]*m[14] - m[5]*m[2]*m[15] + m[5]*m[3]*m[14] + m[13]*m[2]*m[7] - m[13]*m[3]*m[6];
    inv[6] = -m[0]*m[6]*m[15] + m[0]*m[7]*m[14] + m[4]*m[2]*m[15] - m[4]*m[3]*m[14] - m[12]*m[2]*m[7] + m[12]*m[3]*m[6];
    inv[10] = m[0]*m[5]*m[15] - m[0]*m[7]*m[13] - m[4]*m[1]*m[15] + m[4]*m[3]*m[13] + m[12]*m[1]*m[7] - m[12]*m[3]*m[5];
    inv[14] = -m[0]*m[5]*m[14] + m[0]*m[6]*m[13] + m[4]*m[1]*m[14] - m[4]*m[2]*m[13] - m[12]*m[1]*m[6] + m[12]*m[2]*m[5];
    inv[3] = -m[1]*m[6]*m[11] + m[1]*m[7]*m[10] + m[5]*m[2]*m[11] - m[5]*m[3]*m[10] - m[9]*m[2]*m[7] + m[9]*m[3]*m[6];
    inv[7] = m[0]*m[6]*m[11] - m[0]*m[7]*m[10] - m[4]*m[2]*m[11] + m[4]*m[3]*m[10] + m[8]*m[2]*m[7] - m[8]*m[3]*m[6];
    inv[11] = -m[0]*m[5]*m[11] + m[0]*m[7]*m[9] + m[4]*m[1]*m[11] - m[4]*m[3]*m[9] - m[8]*m[1]*m[7] + m[8]*m[3]*m[5];
    inv[15] = m[0]*m[5]*m[10] - m[0]*m[6]*m[9] - m[4]*m[1]*m[10] + m[4]*m[2]*m[9] + m[8]*m[1]*m[6] - m[8]*m[2]*m[5];
    
    let det = m[0]*inv[0] + m[1]*inv[4] + m[2]*inv[8] + m[3]*inv[12];
    
    if (Math.abs(det) < 1e-10) return null;
    
    det = 1 / det;
    return inv.map(v => v * det);
  }
}