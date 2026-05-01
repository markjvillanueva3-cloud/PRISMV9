// PRISM_CAD_MATH - Lines 749756-749912 (157 lines) - CAD math operations\n\nconst PRISM_CAD_MATH = {
    name: 'PRISM_CAD_MATH',
    version: '1.0.0',
    EPSILON: 1e-10,
    TOLERANCE: 1e-6,

    // 3D Vector operations
    vec3: {
        create: (x = 0, y = 0, z = 0) => ({ x, y, z }),
        clone: (v) => ({ x: v.x, y: v.y, z: v.z }),
        add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
        sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
        scale: (v, s) => ({ x: v.x * s, y: v.y * s, z: v.z * s }),
        dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
        cross: (a, b) => ({
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        }),
        length: (v) => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),
        lengthSq: (v) => v.x * v.x + v.y * v.y + v.z * v.z,
        normalize: function(v) {
            const len = this.length(v);
            if (len < PRISM_CAD_MATH.EPSILON) return { x: 0, y: 0, z: 1 };
            return { x: v.x / len, y: v.y / len, z: v.z / len };
        },
        negate: (v) => ({ x: -v.x, y: -v.y, z: -v.z }),
        lerp: (a, b, t) => ({
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
            z: a.z + (b.z - a.z) * t
        }),
        distance: (a, b) => {
            const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
            return Math.sqrt(dx * dx + dy * dy + dz * dz);
        },
        midpoint: (a, b) => ({
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2,
            z: (a.z + b.z) / 2
        }),
        equal: (a, b, tol) => {
            const t = tol || PRISM_CAD_MATH.TOLERANCE;
            return Math.abs(a.x - b.x) < t && Math.abs(a.y - b.y) < t && Math.abs(a.z - b.z) < t;
        },
        angle: (a, b) => {
            const dot = PRISM_CAD_MATH.vec3.dot(a, b);
            const lenA = PRISM_CAD_MATH.vec3.length(a);
            const lenB = PRISM_CAD_MATH.vec3.length(b);
            if (lenA < PRISM_CAD_MATH.EPSILON || lenB < PRISM_CAD_MATH.EPSILON) return 0;
            return Math.acos(Math.max(-1, Math.min(1, dot / (lenA * lenB))));
        },
        project: (v, onto) => {
            const len2 = PRISM_CAD_MATH.vec3.lengthSq(onto);
            if (len2 < PRISM_CAD_MATH.EPSILON) return { x: 0, y: 0, z: 0 };
            const scale = PRISM_CAD_MATH.vec3.dot(v, onto) / len2;
            return PRISM_CAD_MATH.vec3.scale(onto, scale);
        },
        reflect: (v, normal) => {
            const d = 2 * PRISM_CAD_MATH.vec3.dot(v, normal);
            return PRISM_CAD_MATH.vec3.sub(v, PRISM_CAD_MATH.vec3.scale(normal, d));
        }
    },
    // 4x4 Matrix operations for transforms
    mat4: {
        identity: () => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1],
        multiply: (a, b) => {
            const r = new Array(16);
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    let sum = 0;
                    for (let k = 0; k < 4; k++) sum += a[i * 4 + k] * b[k * 4 + j];
                    r[i * 4 + j] = sum;
                }
            }
            return r;
        },
        transformPoint: (m, p) => ({
            x: m[0] * p.x + m[1] * p.y + m[2] * p.z + m[3],
            y: m[4] * p.x + m[5] * p.y + m[6] * p.z + m[7],
            z: m[8] * p.x + m[9] * p.y + m[10] * p.z + m[11]
        }),
        transformVector: (m, v) => ({
            x: m[0] * v.x + m[1] * v.y + m[2] * v.z,
            y: m[4] * v.x + m[5] * v.y + m[6] * v.z,
            z: m[8] * v.x + m[9] * v.y + m[10] * v.z
        }),
        fromAxisPlacement: function(location, axis, refDir) {
            const z = PRISM_CAD_MATH.vec3.normalize(axis);
            let x = refDir ? PRISM_CAD_MATH.vec3.normalize(refDir) : { x: 1, y: 0, z: 0 };
            const dot = PRISM_CAD_MATH.vec3.dot(x, z);
            x = PRISM_CAD_MATH.vec3.normalize({
                x: x.x - dot * z.x,
                y: x.y - dot * z.y,
                z: x.z - dot * z.z
            });
            const y = PRISM_CAD_MATH.vec3.cross(z, x);
            return [
                x.x, y.x, z.x, location.x,
                x.y, y.y, z.y, location.y,
                x.z, y.z, z.z, location.z,
                0, 0, 0, 1
            ];
        },
        invert: function(m) {
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
            if (Math.abs(det) < PRISM_CAD_MATH.EPSILON) return null;
            det = 1.0 / det;
            for (let i = 0; i < 16; i++) inv[i] *= det;
            return inv;
        }
    },
    // Quaternion operations for rotations
    quat: {
        identity: () => ({ w: 1, x: 0, y: 0, z: 0 }),
        fromAxisAngle: (axis, angle) => {
            const halfAngle = angle / 2;
            const s = Math.sin(halfAngle);
            return {
                w: Math.cos(halfAngle),
                x: axis.x * s,
                y: axis.y * s,
                z: axis.z * s
            };
        },
        multiply: (a, b) => ({
            w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
            x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
            y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
            z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w
        }),
        rotateVector: (q, v) => {
            const qv = { w: 0, x: v.x, y: v.y, z: v.z };
            const qConj = { w: q.w, x: -q.x, y: -q.y, z: -q.z };
            const result = PRISM_CAD_MATH.quat.multiply(PRISM_CAD_MATH.quat.multiply(q, qv), qConj);
            return { x: result.x, y: result.y, z: result.z };
        }
    }
};
