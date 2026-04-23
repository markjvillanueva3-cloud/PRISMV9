/**
 * FiniteElementEngine — Lightweight 1D/2D FEM Solver
 *
 * Capabilities:
 *   - 1D bar/rod (axial), 1D thermal (conduction)
 *   - 2D truss, 2D quad4 (plane stress/strain, 2×2 Gauss quadrature)
 *   - Modal analysis via EigensolverEngine (generalized eigenvalue K*x = λ*M*x)
 *   - Automatic sparse solver for large systems via IterativeSolverEngine.cg
 *
 * Manufacturing use: tool deflection, fixture compliance, thermal distortion,
 *   workpiece natural frequency checks, toolholder modal analysis.
 *
 * Upgrade: SCIMATH-MS0 P3-U03 — replaced ad-hoc eigenvalue iteration with
 *   EigensolverEngine.generalizedEigen; added CG fallback for n > 100;
 *   added 2D quad4 plane stress element.
 *
 * References:
 *   - Bathe, "Finite Element Procedures" 2nd ed. (2014)
 *   - Cook, Malkus, Plesha, Witt, "Concepts and Applications of FEA" 4th ed. (2002)
 *   - Hughes, "The Finite Element Method" (2000)
 *
 * @engine FiniteElementEngine
 * @milestone SCIMATH-MS0
 * @unit P3-U03
 */

import { IterativeSolverEngine } from "./IterativeSolverEngine.js";
import { EigensolverEngine } from "./EigensolverEngine.js";
import { EPS_MACHINE } from "../physics/constants.js";

// ── Threshold: above this DOF count, use iterative CG instead of dense GE ──
const SPARSE_THRESHOLD = 100;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BarElement {
  nodes: [number, number];
  E: number;        // Young's modulus (Pa)
  A: number;        // Cross-sectional area (m²)
  L: number;        // Length (m)
}

export interface TrussElement {
  nodes: [number, number];
  E: number;
  A: number;
  coords: [[number, number], [number, number]]; // [x,y] of each node
}

export interface Quad4Element {
  nodes: [number, number, number, number]; // 4 node indices (CCW ordering)
  coords: [[number, number], [number, number], [number, number], [number, number]];
  E: number;        // Young's modulus (Pa)
  nu: number;       // Poisson's ratio
  t: number;        // Thickness (m)
}

export interface FEMConfig {
  elements: BarElement[] | TrussElement[];
  numNodes: number;
  fixedDofs: number[];       // Constrained DOFs
  loads: { dof: number; value: number }[];
}

export interface Quad4Config {
  elements: Quad4Element[];
  numNodes: number;
  fixedDofs: number[];
  loads: { dof: number; value: number }[];
  planeStress?: boolean;     // default true
}

export interface FEMResult {
  displacements: number[];
  reactions: number[];
  elementStresses: number[];
  elementForces: number[];
  maxDisplacement: number;
  maxStress: number;
}

export interface Quad4Result {
  displacements: number[];
  reactions: number[];
  elementStresses: { sigmaX: number; sigmaY: number; tauXY: number; vonMises: number }[];
  maxDisplacement: number;
  maxVonMises: number;
}

export interface ThermalConfig {
  elements: { nodes: [number, number]; k: number; A: number; L: number }[];
  numNodes: number;
  fixedTemps: { node: number; temp: number }[];
  heatSources: { node: number; value: number }[];
}

export interface ThermalResult {
  temperatures: number[];
  heatFluxes: number[];
  maxTemp: number;
}

export interface ModalResult {
  frequencies: number[];  // Hz
  modeShapes: number[][];
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class FiniteElementEngineImpl {

  /**
   * 1D bar/rod analysis (axial only).
   * @param config Bar elements, BCs, loads
   * @returns Displacements, stresses, forces, reactions
   */
  solveBar(config: FEMConfig): FEMResult {
    const elements = config.elements as BarElement[];
    const n = config.numNodes;
    const K = this._zeros(n, n);

    for (const el of elements) {
      const [i, j] = el.nodes;
      const ke = (el.E * el.A) / el.L;
      K[i][i] += ke;
      K[i][j] -= ke;
      K[j][i] -= ke;
      K[j][j] += ke;
    }

    const F = new Array(n).fill(0);
    for (const load of config.loads) {
      F[load.dof] += load.value;
    }

    const penalty = 1e30;
    for (const dof of config.fixedDofs) {
      K[dof][dof] += penalty;
      F[dof] = 0;
    }

    const u = this._solve(K, F, n);

    const stresses: number[] = [];
    const forces: number[] = [];
    for (const el of elements) {
      const [i, j] = el.nodes;
      const strain = (u[j] - u[i]) / el.L;
      const stress = el.E * strain;
      stresses.push(stress);
      forces.push(stress * el.A);
    }

    const reactions = config.fixedDofs.map(dof => {
      let r = -F[dof];
      for (let j = 0; j < n; j++) r += K[dof][j] * u[j];
      return r;
    });

    return {
      displacements: u,
      reactions,
      elementStresses: stresses,
      elementForces: forces,
      maxDisplacement: Math.max(...u.map(Math.abs)),
      maxStress: Math.max(...stresses.map(Math.abs)),
    };
  }

  /**
   * 2D truss analysis.
   * @param config Truss elements with node coordinates, BCs, loads
   * @returns Displacements, stresses, forces, reactions
   */
  solveTruss(config: FEMConfig): FEMResult {
    const elements = config.elements as TrussElement[];
    const n = config.numNodes * 2;
    const K = this._zeros(n, n);

    for (const el of elements) {
      const [n1, n2] = el.nodes;
      const [[x1, y1], [x2, y2]] = el.coords;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const L = Math.sqrt(dx * dx + dy * dy);
      const c = dx / L;
      const s = dy / L;
      const ke = (el.E * el.A) / L;

      const cc = c * c, ss = s * s, cs = c * s;
      const dofs = [2 * n1, 2 * n1 + 1, 2 * n2, 2 * n2 + 1];
      const kLocal = [
        [cc, cs, -cc, -cs],
        [cs, ss, -cs, -ss],
        [-cc, -cs, cc, cs],
        [-cs, -ss, cs, ss],
      ];

      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          K[dofs[i]][dofs[j]] += ke * kLocal[i][j];
        }
      }
    }

    const F = new Array(n).fill(0);
    for (const load of config.loads) F[load.dof] += load.value;

    const penalty = 1e30;
    for (const dof of config.fixedDofs) {
      K[dof][dof] += penalty;
      F[dof] = 0;
    }

    const u = this._solve(K, F, n);

    const stresses: number[] = [];
    const forces: number[] = [];
    for (const el of elements) {
      const [n1, n2] = el.nodes;
      const [[x1, y1], [x2, y2]] = el.coords;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const L = Math.sqrt(dx * dx + dy * dy);
      const c = dx / L;
      const s = dy / L;

      const du = u[2 * n2] - u[2 * n1];
      const dv = u[2 * n2 + 1] - u[2 * n1 + 1];
      const strain = (c * du + s * dv) / L;
      const stress = el.E * strain;
      stresses.push(stress);
      forces.push(stress * el.A);
    }

    const reactions = config.fixedDofs.map(dof => {
      let r = 0;
      for (let j = 0; j < n; j++) r += K[dof][j] * u[j];
      return r - F[dof];
    });

    return {
      displacements: u,
      reactions,
      elementStresses: stresses,
      elementForces: forces,
      maxDisplacement: Math.max(...u.map(Math.abs)),
      maxStress: Math.max(...stresses.map(Math.abs)),
    };
  }

  /**
   * 2D quad4 plane stress/strain analysis.
   * Uses 4-node bilinear quadrilateral with 2×2 Gauss quadrature.
   *
   * Reference: Cook et al. "Concepts and Applications of FEA" 4th ed., Chapter 6
   *
   * @param config Quad4 elements, BCs, loads
   * @returns Displacements, element stresses (σx, σy, τxy, von Mises)
   */
  solveQuad4(config: Quad4Config): Quad4Result {
    const { elements, numNodes, fixedDofs, loads, planeStress = true } = config;
    const n = numNodes * 2; // 2 DOFs per node
    const K = this._zeros(n, n);

    // 2×2 Gauss points: ±1/√3
    const gp = 1 / Math.sqrt(3);
    const gaussPts: [number, number][] = [[-gp, -gp], [gp, -gp], [gp, gp], [-gp, gp]];

    for (const el of elements) {
      const dofs = [
        2 * el.nodes[0], 2 * el.nodes[0] + 1,
        2 * el.nodes[1], 2 * el.nodes[1] + 1,
        2 * el.nodes[2], 2 * el.nodes[2] + 1,
        2 * el.nodes[3], 2 * el.nodes[3] + 1,
      ];

      // D matrix (constitutive)
      const D = planeStress
        ? this._planeStressD(el.E, el.nu)
        : this._planeStrainD(el.E, el.nu);

      // Element stiffness via 2×2 Gauss quadrature
      const ke = this._zeros(8, 8);
      for (const [xi, eta] of gaussPts) {
        const { B, detJ } = this._quad4BMatrix(xi, eta, el.coords);
        // ke += B^T * D * B * detJ * t * weight(=1)
        const BtD = this._matMul(this._transpose(B), D);
        const BtDB = this._matMul(BtD, B);
        const scale = detJ * el.t;
        for (let i = 0; i < 8; i++)
          for (let j = 0; j < 8; j++)
            ke[i][j] += BtDB[i][j] * scale;
      }

      // Assemble into global K
      for (let i = 0; i < 8; i++)
        for (let j = 0; j < 8; j++)
          K[dofs[i]][dofs[j]] += ke[i][j];
    }

    // Load vector
    const F = new Array(n).fill(0);
    for (const load of loads) F[load.dof] += load.value;

    // Penalty BCs
    const penalty = 1e30;
    for (const dof of fixedDofs) {
      K[dof][dof] += penalty;
      F[dof] = 0;
    }

    const u = this._solve(K, F, n);

    // Element stress recovery at centroid (ξ=0, η=0)
    const elementStresses = elements.map(el => {
      const dofs = [
        2 * el.nodes[0], 2 * el.nodes[0] + 1,
        2 * el.nodes[1], 2 * el.nodes[1] + 1,
        2 * el.nodes[2], 2 * el.nodes[2] + 1,
        2 * el.nodes[3], 2 * el.nodes[3] + 1,
      ];
      const uEl = dofs.map(d => u[d]);
      const D = planeStress
        ? this._planeStressD(el.E, el.nu)
        : this._planeStrainD(el.E, el.nu);
      const { B } = this._quad4BMatrix(0, 0, el.coords);

      // strain = B * u_e, stress = D * strain
      const strain = B.map(row => row.reduce((s, bij, j) => s + bij * uEl[j], 0));
      const stress = D.map(row => row.reduce((s, dij, j) => s + dij * strain[j], 0));
      const [sx, sy, txy] = stress;
      const vonMises = Math.sqrt(sx * sx + sy * sy - sx * sy + 3 * txy * txy);
      return { sigmaX: sx, sigmaY: sy, tauXY: txy, vonMises };
    });

    const maxVM = Math.max(...elementStresses.map(s => s.vonMises));

    return {
      displacements: u,
      reactions: fixedDofs.map(dof => {
        let r = 0;
        for (let j = 0; j < n; j++) r += K[dof][j] * u[j];
        return r - F[dof];
      }),
      elementStresses,
      maxDisplacement: Math.max(...u.map(Math.abs)),
      maxVonMises: maxVM,
    };
  }

  /**
   * 1D thermal analysis (steady-state conduction).
   * @param config Thermal elements, fixed temperatures, heat sources
   * @returns Temperatures, heat fluxes
   */
  solveThermal(config: ThermalConfig): ThermalResult {
    const n = config.numNodes;
    const K = this._zeros(n, n);

    for (const el of config.elements) {
      const [i, j] = el.nodes;
      const ke = (el.k * el.A) / el.L;
      K[i][i] += ke;
      K[i][j] -= ke;
      K[j][i] -= ke;
      K[j][j] += ke;
    }

    const F = new Array(n).fill(0);
    for (const hs of config.heatSources) F[hs.node] += hs.value;

    const penalty = 1e30;
    for (const ft of config.fixedTemps) {
      K[ft.node][ft.node] += penalty;
      F[ft.node] = penalty * ft.temp;
    }

    const T = this._solve(K, F, n);

    const fluxes = config.elements.map(el => {
      const [i, j] = el.nodes;
      return -el.k * (T[j] - T[i]) / el.L;
    });

    return {
      temperatures: T,
      heatFluxes: fluxes,
      maxTemp: Math.max(...T),
    };
  }

  /**
   * Modal analysis for 1D bar system.
   * Uses EigensolverEngine.generalizedEigen (K*x = λ*M*x) for accurate
   * natural frequency computation.
   *
   * Reference: Bathe, "Finite Element Procedures" Chapter 12 (2014)
   *
   * @param elements Bar elements with density
   * @param numNodes Number of nodes
   * @param fixedDofs Fixed boundary conditions
   * @param numModes Number of modes to compute (default 3)
   * @returns Natural frequencies (Hz) and mode shapes
   */
  modalAnalysis(
    elements: { nodes: [number, number]; E: number; A: number; L: number; rho: number }[],
    numNodes: number,
    fixedDofs: number[],
    numModes: number = 3
  ): ModalResult {
    const n = numNodes;
    const K = this._zeros(n, n);
    const M = this._zeros(n, n);

    for (const el of elements) {
      const [i, j] = el.nodes;
      const ke = (el.E * el.A) / el.L;
      const me = (el.rho * el.A * el.L) / 6;

      K[i][i] += ke; K[i][j] -= ke;
      K[j][i] -= ke; K[j][j] += ke;

      M[i][i] += 2 * me; M[i][j] += me;
      M[j][i] += me; M[j][j] += 2 * me;
    }

    // Remove fixed DOFs
    const freeDofs = Array.from({ length: n }, (_, i) => i)
      .filter(i => !fixedDofs.includes(i));
    const nf = freeDofs.length;

    const Kr = this._extractSubmatrix(K, freeDofs);
    const Mr = this._extractSubmatrix(M, freeDofs);

    // Generalized eigenvalue: K*x = λ*M*x via EigensolverEngine
    const eigen = EigensolverEngine.generalizedEigen(Kr, Mr, {
      maxIterations: 300,
      tolerance: 1e-10,
    });

    // Eigenvalues are ω², convert to frequency: f = ω / (2π)
    const freqPairs: { freq: number; shape: number[] }[] = [];
    for (let i = 0; i < eigen.eigenvalues.length; i++) {
      const lam = eigen.eigenvalues[i];
      if (lam > 1e-10) {
        const omega = Math.sqrt(lam);
        const freq = omega / (2 * Math.PI);
        // Expand mode shape to full DOFs
        const fullMode = new Array(n).fill(0);
        freeDofs.forEach((dof, idx) => {
          fullMode[dof] = eigen.eigenvectors[idx]?.[i] ?? 0;
        });
        freqPairs.push({ freq, shape: fullMode });
      }
    }

    // Sort by frequency ascending, take numModes
    freqPairs.sort((a, b) => a.freq - b.freq);
    const selected = freqPairs.slice(0, numModes);

    return {
      frequencies: selected.map(fp => fp.freq),
      modeShapes: selected.map(fp => fp.shape),
    };
  }

  // -------------------------------------------------------------------------
  // Internal linear algebra
  // -------------------------------------------------------------------------

  /**
   * Dispatches to dense GE for small systems, CG for large SPD systems.
   */
  private _solve(K: number[][], F: number[], n: number): number[] {
    if (n <= SPARSE_THRESHOLD) {
      return this._solveLinear(K, F, n);
    }
    // Large system: use Conjugate Gradient (K is SPD after penalty BCs)
    const result = IterativeSolverEngine.cg(K, F, {
      tolerance: 1e-12,
      maxIterations: n * 3,
    });
    if (!result.converged) {
      console.warn(`FEM CG solver did not converge after ${result.iterations} iterations (residual=${result.relativeResidual.toExponential(2)}). Solution may be inaccurate.`);
    }
    return result.x;
  }

  /** Dense Gaussian elimination with partial pivoting */
  private _solveLinear(A: number[][], b: number[], n: number): number[] {
    const aug = A.map((row, i) => [...row, b[i]]);

    for (let col = 0; col < n; col++) {
      let maxVal = Math.abs(aug[col][col]);
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > maxVal) {
          maxVal = Math.abs(aug[row][col]);
          maxRow = row;
        }
      }
      if (maxRow !== col) [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

      const pivot = aug[col][col];
      if (Math.abs(pivot) < EPS_MACHINE) continue;

      for (let row = col + 1; row < n; row++) {
        const factor = aug[row][col] / pivot;
        for (let j = col; j <= n; j++) aug[row][j] -= factor * aug[col][j];
      }
    }

    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = aug[i][n];
      for (let j = i + 1; j < n; j++) sum -= aug[i][j] * x[j];
      x[i] = Math.abs(aug[i][i]) > EPS_MACHINE ? sum / aug[i][i] : 0;
    }
    return x;
  }

  private _zeros(m: number, n: number): number[][] {
    return Array.from({ length: m }, () => new Array(n).fill(0));
  }

  private _matVec(M: number[][], v: number[]): number[] {
    return M.map(row => row.reduce((s, mij, j) => s + mij * (v[j] ?? 0), 0));
  }

  private _extractSubmatrix(M: number[][], indices: number[]): number[][] {
    return indices.map(i => indices.map(j => M[i][j]));
  }

  // -------------------------------------------------------------------------
  // Quad4 helpers
  // -------------------------------------------------------------------------

  /** Plane stress D matrix: D = (E/(1-ν²)) * [[1,ν,0],[ν,1,0],[0,0,(1-ν)/2]] */
  private _planeStressD(E: number, nu: number): number[][] {
    const c = E / (1 - nu * nu);
    return [
      [c, c * nu, 0],
      [c * nu, c, 0],
      [0, 0, c * (1 - nu) / 2],
    ];
  }

  /** Plane strain D matrix: D = (E/((1+ν)(1-2ν))) * [[1-ν,ν,0],[ν,1-ν,0],[0,0,(1-2ν)/2]] */
  private _planeStrainD(E: number, nu: number): number[][] {
    if (nu >= 0.5) throw new Error(`Plane strain requires ν < 0.5 (got ${nu}). Use plane stress for incompressible materials.`);
    const c = E / ((1 + nu) * (1 - 2 * nu));
    return [
      [c * (1 - nu), c * nu, 0],
      [c * nu, c * (1 - nu), 0],
      [0, 0, c * (1 - 2 * nu) / 2],
    ];
  }

  /**
   * Compute B matrix (3×8) and Jacobian determinant for quad4 at (ξ, η).
   *
   * Shape functions: N_i = (1/4)(1 + ξ_i*ξ)(1 + η_i*η)
   * Node ordering: 1(-1,-1), 2(1,-1), 3(1,1), 4(-1,1)
   */
  private _quad4BMatrix(
    xi: number,
    eta: number,
    coords: [[number, number], [number, number], [number, number], [number, number]]
  ): { B: number[][]; detJ: number } {
    // Natural coordinate signs for each node
    const xiN  = [-1, 1, 1, -1];
    const etaN = [-1, -1, 1, 1];

    // Shape function derivatives w.r.t. natural coordinates
    const dNdxi  = xiN.map((xn, i) => xn * (1 + etaN[i] * eta) / 4);
    const dNdeta = etaN.map((en, i) => en * (1 + xiN[i] * xi) / 4);

    // Jacobian J = [[∂x/∂ξ, ∂y/∂ξ], [∂x/∂η, ∂y/∂η]]
    let J11 = 0, J12 = 0, J21 = 0, J22 = 0;
    for (let i = 0; i < 4; i++) {
      J11 += dNdxi[i] * coords[i][0];
      J12 += dNdxi[i] * coords[i][1];
      J21 += dNdeta[i] * coords[i][0];
      J22 += dNdeta[i] * coords[i][1];
    }
    const detJ = J11 * J22 - J12 * J21;
    if (Math.abs(detJ) < EPS_MACHINE) throw new Error(`Degenerate quad4 element: detJ=${detJ.toExponential(3)} (collapsed or inverted nodes)`);

    // Inverse Jacobian
    const invDetJ = 1 / detJ;
    const Ji11 = J22 * invDetJ, Ji12 = -J12 * invDetJ;
    const Ji21 = -J21 * invDetJ, Ji22 = J11 * invDetJ;

    // dN/dx, dN/dy = J^{-1} * [dN/dξ, dN/dη]^T
    const dNdx: number[] = [];
    const dNdy: number[] = [];
    for (let i = 0; i < 4; i++) {
      dNdx.push(Ji11 * dNdxi[i] + Ji12 * dNdeta[i]);
      dNdy.push(Ji21 * dNdxi[i] + Ji22 * dNdeta[i]);
    }

    // B matrix (3 × 8):
    // [dN1/dx, 0,     dN2/dx, 0,     dN3/dx, 0,     dN4/dx, 0    ]
    // [0,     dN1/dy, 0,     dN2/dy, 0,     dN3/dy, 0,     dN4/dy]
    // [dN1/dy,dN1/dx, dN2/dy,dN2/dx, dN3/dy,dN3/dx, dN4/dy,dN4/dx]
    const B: number[][] = [
      [dNdx[0], 0, dNdx[1], 0, dNdx[2], 0, dNdx[3], 0],
      [0, dNdy[0], 0, dNdy[1], 0, dNdy[2], 0, dNdy[3]],
      [dNdy[0], dNdx[0], dNdy[1], dNdx[1], dNdy[2], dNdx[2], dNdy[3], dNdx[3]],
    ];

    return { B, detJ };
  }

  /** Dense matrix multiply C = A * B */
  private _matMul(A: number[][], B: number[][]): number[][] {
    const m = A.length, p = B[0].length, n = B.length;
    const C = this._zeros(m, p);
    for (let i = 0; i < m; i++)
      for (let j = 0; j < p; j++)
        for (let k = 0; k < n; k++)
          C[i][j] += A[i][k] * B[k][j];
    return C;
  }

  /** Dense matrix transpose */
  private _transpose(A: number[][]): number[][] {
    const m = A.length, n = A[0].length;
    return Array.from({ length: n }, (_, j) =>
      Array.from({ length: m }, (_, i) => A[i][j])
    );
  }
}

export const finiteElementEngine = new FiniteElementEngineImpl();
