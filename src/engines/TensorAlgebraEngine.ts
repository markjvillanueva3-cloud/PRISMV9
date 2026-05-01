/**
 * TensorAlgebraEngine — Stress/Strain Tensors for Solid Mechanics
 *
 * Capabilities:
 *   - Rank-2 tensor operations (3×3 stress/strain)
 *   - Voigt notation: 3×3 ↔ 6-vector (sigma_11, sigma_22, sigma_33, sigma_23, sigma_13, sigma_12)
 *   - Tensor rotation: sigma' = Q * sigma * Q^T
 *   - Stress invariants: I1, I2, I3, J2, von Mises equivalent stress
 *   - Deviatoric/hydrostatic decomposition
 *   - Principal stresses and directions
 *   - Rank-4 elastic stiffness tensor C_ijkl (Voigt 6×6)
 *   - Isotropic and transversely isotropic stiffness
 *
 * Used by: FEM post-processing, cutting force tensor analysis, residual stress
 *   prediction, material constitutive models (J-C, Oxley).
 *
 * References:
 *   - Lai, Rubin & Krempl, "Introduction to Continuum Mechanics" 4th ed.
 *   - Bower, "Applied Mechanics of Solids" (2009)
 *   - Voigt convention: IEEE/ASME standard ordering
 *
 * @engine TensorAlgebraEngine
 * @milestone SCIMATH-MS0
 * @unit P1-U04
 * @courses MIT 2.071, MIT 2.072
 */

// ============================================================================
// TYPES
// ============================================================================

/** 3×3 symmetric tensor in Voigt notation [s11, s22, s33, s23, s13, s12] */
export type Voigt6 = [number, number, number, number, number, number];

/** Stress/strain invariants */
export interface TensorInvariants {
  /** First invariant: I1 = trace(sigma) = sigma_11 + sigma_22 + sigma_33 */
  I1: number;
  /** Second invariant: I2 = (1/2)(I1^2 - trace(sigma^2)) */
  I2: number;
  /** Third invariant: I3 = det(sigma) */
  I3: number;
  /** Second deviatoric invariant: J2 = (1/2) * s_ij * s_ij */
  J2: number;
  /** Von Mises equivalent stress: sigma_eq = sqrt(3*J2) */
  vonMises: number;
  /** Hydrostatic pressure: p = I1/3 */
  hydrostaticPressure: number;
  /** Maximum shear stress: tau_max = (sigma_1 - sigma_3)/2 */
  maxShear: number;
}

/** Principal stress result */
export interface PrincipalStresses {
  /** Principal stresses [sigma_1, sigma_2, sigma_3] in descending order */
  values: [number, number, number];
  /** Principal directions (3×3, columns are eigenvectors) */
  directions: number[][];
}

// ============================================================================
// ENGINE
// ============================================================================

export class TensorAlgebraEngine {

  // ========================================================================
  // VOIGT CONVERSION
  // ========================================================================

  /**
   * Convert 3×3 symmetric tensor to Voigt 6-vector.
   * Convention: [s11, s22, s33, s23, s13, s12] (standard Voigt ordering).
   *
   * For strain tensors, engineering shear: gamma_ij = 2*epsilon_ij for i≠j.
   *
   * @param T 3×3 symmetric matrix
   * @param isStrain If true, multiply off-diagonals by 2 (engineering shear)
   */
  static toVoigt(T: number[][], isStrain: boolean = false): Voigt6 {
    const f = isStrain ? 2 : 1;
    return [
      T[0][0], T[1][1], T[2][2],
      f * T[1][2], f * T[0][2], f * T[0][1],
    ];
  }

  /**
   * Convert Voigt 6-vector back to 3×3 symmetric tensor.
   *
   * @param v Voigt vector [s11, s22, s33, s23, s13, s12]
   * @param isStrain If true, divide off-diagonals by 2
   */
  static fromVoigt(v: Voigt6, isStrain: boolean = false): number[][] {
    const f = isStrain ? 0.5 : 1;
    return [
      [v[0],     f * v[5], f * v[4]],
      [f * v[5], v[1],     f * v[3]],
      [f * v[4], f * v[3], v[2]    ],
    ];
  }

  // ========================================================================
  // TENSOR ROTATION
  // ========================================================================

  /**
   * Rotate a 3×3 tensor: T' = Q * T * Q^T.
   * Q is a 3×3 rotation matrix (orthogonal, det=1).
   *
   * Used for: transforming stress to different coordinate frames,
   *   principal stress computation, coordinate system alignment.
   */
  static rotateTensor(T: number[][], Q: number[][]): number[][] {
    // T' = Q * T * Q^T
    const result = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        for (let p = 0; p < 3; p++)
          for (let q = 0; q < 3; q++)
            result[i][j] += Q[i][p] * T[p][q] * Q[j][q];
    return result;
  }

  /**
   * Build rotation matrix from Euler angles (Z-X-Z convention).
   * @param phi First rotation about Z (radians)
   * @param theta Rotation about new X (radians)
   * @param psi Second rotation about new Z (radians)
   */
  static eulerRotation(phi: number, theta: number, psi: number): number[][] {
    const c1 = Math.cos(phi), s1 = Math.sin(phi);
    const c2 = Math.cos(theta), s2 = Math.sin(theta);
    const c3 = Math.cos(psi), s3 = Math.sin(psi);
    return [
      [c1*c3 - s1*c2*s3, -c1*s3 - s1*c2*c3,  s1*s2],
      [s1*c3 + c1*c2*s3, -s1*s3 + c1*c2*c3, -c1*s2],
      [s2*s3,              s2*c3,              c2    ],
    ];
  }

  // ========================================================================
  // INVARIANTS
  // ========================================================================

  /**
   * Compute all invariants of a 3×3 symmetric stress tensor.
   *
   * I1 = trace(sigma) = sigma_kk
   * I2 = (1/2)(I1^2 - sigma_ij*sigma_ij) = sum of principal 2×2 minors
   * I3 = det(sigma)
   * J2 = (1/2)*s_ij*s_ij where s = sigma - (I1/3)*I (deviatoric)
   * sigma_eq = sqrt(3*J2) (von Mises)
   *
   * @param sigma 3×3 stress tensor (or Voigt6)
   */
  static invariants(sigma: number[][] | Voigt6): TensorInvariants {
    const T = Array.isArray(sigma[0])
      ? sigma as number[][]
      : TensorAlgebraEngine.fromVoigt(sigma as Voigt6);

    const s11 = T[0][0], s22 = T[1][1], s33 = T[2][2];
    const s12 = T[0][1], s13 = T[0][2], s23 = T[1][2];

    // I1 = trace
    const I1 = s11 + s22 + s33;

    // I2 = sum of principal minors
    const I2 = s11*s22 + s22*s33 + s33*s11 - s12*s12 - s23*s23 - s13*s13;

    // I3 = determinant
    const I3 = s11*(s22*s33 - s23*s23)
             - s12*(s12*s33 - s23*s13)
             + s13*(s12*s23 - s22*s13);

    // Deviatoric invariant J2
    // s_ij = sigma_ij - (I1/3)*delta_ij
    const p = I1 / 3; // hydrostatic pressure
    const d11 = s11 - p, d22 = s22 - p, d33 = s33 - p;
    const J2 = 0.5 * (d11*d11 + d22*d22 + d33*d33 + 2*(s12*s12 + s23*s23 + s13*s13));

    const vonMises = Math.sqrt(3 * Math.max(0, J2));

    // Principal stresses for max shear
    const principals = TensorAlgebraEngine.principalStresses(T);
    const maxShear = (principals.values[0] - principals.values[2]) / 2;

    return { I1, I2, I3, J2, vonMises, hydrostaticPressure: p, maxShear };
  }

  // ========================================================================
  // DECOMPOSITION
  // ========================================================================

  /**
   * Decompose stress tensor into hydrostatic + deviatoric parts.
   * sigma = p*I + s where p = trace(sigma)/3 and s is traceless.
   *
   * @param sigma 3×3 stress tensor
   * @returns { hydrostatic, deviatoric } both as 3×3 tensors
   */
  static decompose(sigma: number[][]): { hydrostatic: number[][]; deviatoric: number[][] } {
    const p = (sigma[0][0] + sigma[1][1] + sigma[2][2]) / 3;
    const hydrostatic = [[p, 0, 0], [0, p, 0], [0, 0, p]];
    const deviatoric = sigma.map((row, i) =>
      row.map((v, j) => v - (i === j ? p : 0))
    );
    return { hydrostatic, deviatoric };
  }

  // ========================================================================
  // PRINCIPAL STRESSES
  // ========================================================================

  /**
   * Compute principal stresses and directions (eigendecomposition of symmetric stress tensor).
   * Uses analytical cubic formula for 3×3 symmetric matrices (Cardano's method).
   *
   * Reference: Smith (1961), "Eigenvalues of a symmetric 3×3 matrix"
   *
   * @param sigma 3×3 symmetric stress tensor
   * @returns Principal stresses (descending) and direction matrix
   */
  static principalStresses(sigma: number[][]): PrincipalStresses {
    const { I1, I2, I3 } = TensorAlgebraEngine.basicInvariants(sigma);

    // Characteristic equation: lambda^3 - I1*lambda^2 + I2*lambda - I3 = 0
    // Substitution: lambda = t + I1/3
    // Gives: t^3 + p*t + q = 0 where
    const p = I2 - I1 * I1 / 3;
    // Depressed cubic: t^3 + p*t + q = 0 with lambda = t + I1/3
    const q = (-2 * I1 * I1 * I1 + 9 * I1 * I2 - 27 * I3) / 27;

    let eigenvalues: number[];
    const disc = q * q / 4 + p * p * p / 27;

    if (disc < -1e-30) {
      // Three real roots (typical for stress tensors)
      const r = Math.sqrt(-p * p * p / 27);
      const phi = Math.acos(Math.max(-1, Math.min(1, -q / (2 * r))));
      const cubeRootR = Math.cbrt(r);
      eigenvalues = [
        2 * cubeRootR * Math.cos(phi / 3) + I1 / 3,
        2 * cubeRootR * Math.cos((phi + 2 * Math.PI) / 3) + I1 / 3,
        2 * cubeRootR * Math.cos((phi + 4 * Math.PI) / 3) + I1 / 3,
      ];
    } else {
      // One or two real roots (degenerate cases)
      const sqrtDisc = Math.sqrt(Math.max(0, disc));
      const u = Math.cbrt(-q / 2 + sqrtDisc);
      const v = Math.cbrt(-q / 2 - sqrtDisc);
      const t1 = u + v;
      eigenvalues = [t1 + I1 / 3, -t1 / 2 + I1 / 3, -t1 / 2 + I1 / 3];
    }

    // Sort descending
    eigenvalues.sort((a, b) => b - a);

    // Compute eigenvectors for each eigenvalue
    const directions = eigenvalues.map(lambda => {
      return eigenvector3x3(sigma, lambda);
    });

    // Build direction matrix (columns = eigenvectors)
    const dirMatrix = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let j = 0; j < 3; j++)
      for (let i = 0; i < 3; i++)
        dirMatrix[i][j] = directions[j][i];

    return {
      values: eigenvalues as [number, number, number],
      directions: dirMatrix,
    };
  }

  /** Compute I1, I2, I3 without J2/vonMises (avoids recursion) */
  private static basicInvariants(T: number[][]): { I1: number; I2: number; I3: number } {
    const s11 = T[0][0], s22 = T[1][1], s33 = T[2][2];
    const s12 = T[0][1], s13 = T[0][2], s23 = T[1][2];
    const I1 = s11 + s22 + s33;
    const I2 = s11*s22 + s22*s33 + s33*s11 - s12*s12 - s23*s23 - s13*s13;
    const I3 = s11*(s22*s33 - s23*s23) - s12*(s12*s33 - s23*s13) + s13*(s12*s23 - s22*s13);
    return { I1, I2, I3 };
  }

  // ========================================================================
  // ELASTIC STIFFNESS TENSOR
  // ========================================================================

  /**
   * Isotropic elastic stiffness matrix (Voigt 6×6).
   * C = lambda * (1 ⊗ 1) + 2*mu * I_4
   * where lambda = E*nu/((1+nu)(1-2nu)), mu = E/(2(1+nu))
   *
   * @param E Young's modulus (Pa)
   * @param nu Poisson's ratio (dimensionless, typically 0.2-0.49)
   * @returns 6×6 Voigt stiffness matrix
   */
  static isotropicStiffness(E: number, nu: number): number[][] {
    if (nu >= 0.5 || nu <= -1) throw new Error("Poisson ratio must be in (-1, 0.5)");
    if (E <= 0) throw new Error("Young's modulus must be positive");

    const lambda = E * nu / ((1 + nu) * (1 - 2 * nu));
    const mu = E / (2 * (1 + nu));

    return [
      [lambda + 2*mu, lambda,        lambda,        0,  0,  0 ],
      [lambda,        lambda + 2*mu, lambda,        0,  0,  0 ],
      [lambda,        lambda,        lambda + 2*mu, 0,  0,  0 ],
      [0,             0,             0,             mu, 0,  0 ],
      [0,             0,             0,             0,  mu, 0 ],
      [0,             0,             0,             0,  0,  mu],
    ];
  }

  /**
   * Isotropic compliance matrix S = C^{-1} (Voigt 6×6).
   *
   * @param E Young's modulus
   * @param nu Poisson's ratio
   * @returns 6×6 Voigt compliance matrix
   */
  static isotropicCompliance(E: number, nu: number): number[][] {
    if (E <= 0) throw new Error("Young's modulus must be positive");
    return [
      [1/E,     -nu/E,   -nu/E,   0,             0,             0            ],
      [-nu/E,   1/E,     -nu/E,   0,             0,             0            ],
      [-nu/E,   -nu/E,   1/E,     0,             0,             0            ],
      [0,       0,       0,       2*(1+nu)/E,    0,             0            ],
      [0,       0,       0,       0,             2*(1+nu)/E,    0            ],
      [0,       0,       0,       0,             0,             2*(1+nu)/E   ],
    ];
  }

  /**
   * Stress from strain using stiffness: sigma = C * epsilon (both in Voigt).
   */
  static stressFromStrain(C: number[][], epsilon: Voigt6): Voigt6 {
    const sigma: Voigt6 = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 6; j++)
        sigma[i] += C[i][j] * epsilon[j];
    return sigma;
  }

  /**
   * Strain from stress using compliance: epsilon = S * sigma (both in Voigt).
   */
  static strainFromStress(S: number[][], sigma: Voigt6): Voigt6 {
    const epsilon: Voigt6 = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 6; j++)
        epsilon[i] += S[i][j] * sigma[j];
    return epsilon;
  }
}

// ============================================================================
// HELPER: Eigenvector of 3×3 symmetric matrix for known eigenvalue
// ============================================================================

function eigenvector3x3(A: number[][], lambda: number): number[] {
  // Solve (A - lambda*I)*v = 0 by taking cross product of two rows
  const B = A.map((row, i) => row.map((v, j) => v - (i === j ? lambda : 0)));

  // Find two linearly independent rows and take cross product
  const rows = [B[0], B[1], B[2]];
  let bestCross = [0, 0, 0];
  let bestNorm = 0;

  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      const c = cross(rows[i], rows[j]);
      const n = Math.sqrt(c[0]*c[0] + c[1]*c[1] + c[2]*c[2]);
      if (n > bestNorm) { bestCross = c; bestNorm = n; }
    }
  }

  if (bestNorm > 1e-14) {
    return bestCross.map(v => v / bestNorm);
  }

  // Degenerate: eigenvalue has multiplicity > 1, return arbitrary orthogonal vector
  return [1, 0, 0];
}

function cross(a: number[], b: number[]): number[] {
  return [
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0],
  ];
}

export const tensorAlgebraEngine = new TensorAlgebraEngine();
