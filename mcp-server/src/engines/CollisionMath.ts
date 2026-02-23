/**
 * PRISM Manufacturing Intelligence - 3D Math Utilities
 * Vector, Matrix, and Quaternion classes for collision calculations
 *
 * Extracted from CollisionEngine.ts for reusability
 *
 * @version 1.0.0
 * @module CollisionMath
 */

// ============================================================================
// VECTOR AND MATRIX MATH UTILITIES
// ============================================================================

/**
 * 3D Vector class for collision calculations
 */
export class Vector3 {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0
  ) {}

  /** Create from array */
  static fromArray(arr: number[]): Vector3 {
    return new Vector3(arr[0] || 0, arr[1] || 0, arr[2] || 0);
  }

  /** Clone this vector */
  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  /** Add another vector */
  add(v: Vector3): Vector3 {
    return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  /** Subtract another vector */
  subtract(v: Vector3): Vector3 {
    return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  /** Multiply by scalar */
  multiply(s: number): Vector3 {
    return new Vector3(this.x * s, this.y * s, this.z * s);
  }

  /** Divide by scalar */
  divide(s: number): Vector3 {
    if (s === 0) throw new Error('Division by zero');
    return new Vector3(this.x / s, this.y / s, this.z / s);
  }

  /** Dot product */
  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  /** Cross product */
  cross(v: Vector3): Vector3 {
    return new Vector3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  /** Vector length/magnitude */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  /** Squared length (faster than length) */
  lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  /** Normalize to unit vector */
  normalize(): Vector3 {
    const len = this.length();
    if (len === 0) return new Vector3(0, 0, 0);
    return this.divide(len);
  }

  /** Distance to another vector */
  distanceTo(v: Vector3): number {
    return this.subtract(v).length();
  }

  /** Linear interpolation */
  lerp(v: Vector3, t: number): Vector3 {
    return this.add(v.subtract(this).multiply(t));
  }

  /** Component-wise minimum */
  min(v: Vector3): Vector3 {
    return new Vector3(
      Math.min(this.x, v.x),
      Math.min(this.y, v.y),
      Math.min(this.z, v.z)
    );
  }

  /** Component-wise maximum */
  max(v: Vector3): Vector3 {
    return new Vector3(
      Math.max(this.x, v.x),
      Math.max(this.y, v.y),
      Math.max(this.z, v.z)
    );
  }

  /** To array */
  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  /** Equals check with tolerance */
  equals(v: Vector3, tolerance: number = 1e-10): boolean {
    return (
      Math.abs(this.x - v.x) < tolerance &&
      Math.abs(this.y - v.y) < tolerance &&
      Math.abs(this.z - v.z) < tolerance
    );
  }
}

/**
 * 4x4 Matrix for transformations
 */
export class Matrix4 {
  public elements: number[];

  constructor() {
    // Identity matrix
    this.elements = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
  }

  /** Set to identity */
  identity(): Matrix4 {
    this.elements = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
    return this;
  }

  /** Create translation matrix */
  static translation(x: number, y: number, z: number): Matrix4 {
    const m = new Matrix4();
    m.elements[12] = x;
    m.elements[13] = y;
    m.elements[14] = z;
    return m;
  }

  /** Create rotation matrix around X axis */
  static rotationX(angle: number): Matrix4 {
    const m = new Matrix4();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    m.elements[5] = c;
    m.elements[6] = s;
    m.elements[9] = -s;
    m.elements[10] = c;
    return m;
  }

  /** Create rotation matrix around Y axis */
  static rotationY(angle: number): Matrix4 {
    const m = new Matrix4();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    m.elements[0] = c;
    m.elements[2] = -s;
    m.elements[8] = s;
    m.elements[10] = c;
    return m;
  }

  /** Create rotation matrix around Z axis */
  static rotationZ(angle: number): Matrix4 {
    const m = new Matrix4();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    m.elements[0] = c;
    m.elements[1] = s;
    m.elements[4] = -s;
    m.elements[5] = c;
    return m;
  }

  /** Create scale matrix */
  static scale(x: number, y: number, z: number): Matrix4 {
    const m = new Matrix4();
    m.elements[0] = x;
    m.elements[5] = y;
    m.elements[10] = z;
    return m;
  }

  /** Multiply with another matrix */
  multiply(other: Matrix4): Matrix4 {
    const result = new Matrix4();
    const a = this.elements;
    const b = other.elements;
    const r = result.elements;

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        r[row * 4 + col] =
          a[row * 4 + 0] * b[0 * 4 + col] +
          a[row * 4 + 1] * b[1 * 4 + col] +
          a[row * 4 + 2] * b[2 * 4 + col] +
          a[row * 4 + 3] * b[3 * 4 + col];
      }
    }
    return result;
  }

  /** Transform a point */
  transformPoint(v: Vector3): Vector3 {
    const e = this.elements;
    const w = e[3] * v.x + e[7] * v.y + e[11] * v.z + e[15];
    return new Vector3(
      (e[0] * v.x + e[4] * v.y + e[8] * v.z + e[12]) / w,
      (e[1] * v.x + e[5] * v.y + e[9] * v.z + e[13]) / w,
      (e[2] * v.x + e[6] * v.y + e[10] * v.z + e[14]) / w
    );
  }

  /** Transform a direction (ignores translation) */
  transformDirection(v: Vector3): Vector3 {
    const e = this.elements;
    return new Vector3(
      e[0] * v.x + e[4] * v.y + e[8] * v.z,
      e[1] * v.x + e[5] * v.y + e[9] * v.z,
      e[2] * v.x + e[6] * v.y + e[10] * v.z
    ).normalize();
  }
}

/**
 * Quaternion for rotation representation
 */
export class Quaternion {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0,
    public w: number = 1
  ) {}

  /** Create from axis-angle */
  static fromAxisAngle(axis: Vector3, angle: number): Quaternion {
    const halfAngle = angle / 2;
    const s = Math.sin(halfAngle);
    const normalizedAxis = axis.normalize();
    return new Quaternion(
      normalizedAxis.x * s,
      normalizedAxis.y * s,
      normalizedAxis.z * s,
      Math.cos(halfAngle)
    );
  }

  /** Create from Euler angles (XYZ order) */
  static fromEuler(x: number, y: number, z: number): Quaternion {
    const cx = Math.cos(x / 2);
    const sx = Math.sin(x / 2);
    const cy = Math.cos(y / 2);
    const sy = Math.sin(y / 2);
    const cz = Math.cos(z / 2);
    const sz = Math.sin(z / 2);

    return new Quaternion(
      sx * cy * cz + cx * sy * sz,
      cx * sy * cz - sx * cy * sz,
      cx * cy * sz + sx * sy * cz,
      cx * cy * cz - sx * sy * sz
    );
  }

  /** Multiply quaternions */
  multiply(q: Quaternion): Quaternion {
    return new Quaternion(
      this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y,
      this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x,
      this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w,
      this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z
    );
  }

  /** Rotate a vector by this quaternion */
  rotate(v: Vector3): Vector3 {
    const qv = new Quaternion(v.x, v.y, v.z, 0);
    const conjugate = new Quaternion(-this.x, -this.y, -this.z, this.w);
    const result = this.multiply(qv).multiply(conjugate);
    return new Vector3(result.x, result.y, result.z);
  }

  /** Convert to rotation matrix */
  toMatrix(): Matrix4 {
    const m = new Matrix4();
    const e = m.elements;
    const x2 = this.x + this.x;
    const y2 = this.y + this.y;
    const z2 = this.z + this.z;
    const xx = this.x * x2;
    const xy = this.x * y2;
    const xz = this.x * z2;
    const yy = this.y * y2;
    const yz = this.y * z2;
    const zz = this.z * z2;
    const wx = this.w * x2;
    const wy = this.w * y2;
    const wz = this.w * z2;

    e[0] = 1 - (yy + zz);
    e[1] = xy + wz;
    e[2] = xz - wy;
    e[4] = xy - wz;
    e[5] = 1 - (xx + zz);
    e[6] = yz + wx;
    e[8] = xz + wy;
    e[9] = yz - wx;
    e[10] = 1 - (xx + yy);

    return m;
  }

  /** Spherical linear interpolation */
  slerp(q: Quaternion, t: number): Quaternion {
    let cosHalfTheta = this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w;

    let qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    if (cosHalfTheta < 0) {
      cosHalfTheta = -cosHalfTheta;
      qx = -qx; qy = -qy; qz = -qz; qw = -qw;
    }

    if (cosHalfTheta >= 1.0) {
      return new Quaternion(this.x, this.y, this.z, this.w);
    }

    const halfTheta = Math.acos(cosHalfTheta);
    const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

    if (Math.abs(sinHalfTheta) < 0.001) {
      return new Quaternion(
        this.x * 0.5 + qx * 0.5,
        this.y * 0.5 + qy * 0.5,
        this.z * 0.5 + qz * 0.5,
        this.w * 0.5 + qw * 0.5
      );
    }

    const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

    return new Quaternion(
      this.x * ratioA + qx * ratioB,
      this.y * ratioA + qy * ratioB,
      this.z * ratioA + qz * ratioB,
      this.w * ratioA + qw * ratioB
    );
  }
}
