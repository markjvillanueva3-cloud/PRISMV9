/**
 * FiniteElementEngine — Lightweight 1D/2D FEM Solver
 *
 * Simple finite element methods for structural/thermal problems:
 * - 1D bar/beam elements (axial force, deflection)
 * - 1D thermal (steady-state heat conduction)
 * - 2D truss analysis
 * - Modal analysis (natural frequencies)
 *
 * Manufacturing use: tool deflection prediction, fixture compliance,
 * thermal distortion estimation, workpiece natural frequency checks.
 *
 * @module FiniteElementEngine
 */

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

export interface FEMConfig {
  elements: BarElement[] | TrussElement[];
  numNodes: number;
  fixedDofs: number[];       // Constrained DOFs
  loads: { dof: number; value: number }[];
}

export interface FEMResult {
  displacements: number[];
  reactions: number[];
  elementStresses: number[];
  elementForces: number[];
  maxDisplacement: number;
  maxStress: number;
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
   */
  solveBar(config: FEMConfig): FEMResult {
    const elements = config.elements as BarElement[];
    const n = config.numNodes;
    const K = this._zeros(n, n);

    // Assemble global stiffness
    for (const el of elements) {
      const [i, j] = el.nodes;
      const ke = (el.E * el.A) / el.L;
      K[i][i] += ke;
      K[i][j] -= ke;
      K[j][i] -= ke;
      K[j][j] += ke;
    }

    // Force vector
    const F = new Array(n).fill(0);
    for (const load of config.loads) {
      F[load.dof] += load.value;
    }

    // Apply boundary conditions (penalty method)
    const penalty = 1e30;
    for (const dof of config.fixedDofs) {
      K[dof][dof] += penalty;
      F[dof] = 0;
    }

    // Solve K*u = F
    const u = this._solveLinear(K, F, n);

    // Compute element stresses and forces
    const stresses: number[] = [];
    const forces: number[] = [];
    for (const el of elements) {
      const [i, j] = el.nodes;
      const strain = (u[j] - u[i]) / el.L;
      const stress = el.E * strain;
      stresses.push(stress);
      forces.push(stress * el.A);
    }

    // Reactions at fixed DOFs
    const reactions = config.fixedDofs.map(dof => {
      let r = -F[dof];
      for (let j = 0; j < n; j++) {
        r += K[dof][j] * u[j];
      }
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
   */
  solveTruss(config: FEMConfig): FEMResult {
    const elements = config.elements as TrussElement[];
    const n = config.numNodes * 2; // 2 DOFs per node
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

      // Local stiffness in global coordinates
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

    // Force vector
    const F = new Array(n).fill(0);
    for (const load of config.loads) {
      F[load.dof] += load.value;
    }

    // BCs
    const penalty = 1e30;
    for (const dof of config.fixedDofs) {
      K[dof][dof] += penalty;
      F[dof] = 0;
    }

    const u = this._solveLinear(K, F, n);

    // Element stresses
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
   * 1D thermal analysis (steady-state conduction).
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
    for (const hs of config.heatSources) {
      F[hs.node] += hs.value;
    }

    // Fixed temperature BCs
    const penalty = 1e30;
    for (const ft of config.fixedTemps) {
      K[ft.node][ft.node] += penalty;
      F[ft.node] = penalty * ft.temp;
    }

    const T = this._solveLinear(K, F, n);

    // Heat fluxes per element
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
   * Simple modal analysis for 1D bar system.
   * Returns approximate natural frequencies.
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

    // Remove fixed DOFs (reduce system)
    const freeDofs = Array.from({ length: n }, (_, i) => i)
      .filter(i => !fixedDofs.includes(i));
    const nf = freeDofs.length;

    const Kr = this._extractSubmatrix(K, freeDofs);
    const Mr = this._extractSubmatrix(M, freeDofs);

    // Inverse iteration for eigenvalues
    const frequencies: number[] = [];
    const modeShapes: number[][] = [];

    for (let mode = 0; mode < Math.min(numModes, nf); mode++) {
      // Power iteration on M^{-1}K (approximate)
      let v = new Array(nf).fill(0);
      v[mode % nf] = 1;

      let eigenvalue = 0;
      for (let iter = 0; iter < 100; iter++) {
        const Kv = this._matVec(Kr, v);
        const w = this._solveLinear(
          Mr.map(r => [...r]), Kv, nf
        );

        const norm = Math.sqrt(w.reduce((s, wi) => s + wi * wi, 0));
        if (norm < 1e-14) break;
        for (let i = 0; i < nf; i++) v[i] = w[i] / norm;

        eigenvalue = w.reduce((s, wi, i) => s + wi * Kv[i], 0) /
                     w.reduce((s, wi) => s + wi * wi, 0);
      }

      const omega = Math.sqrt(Math.abs(eigenvalue));
      frequencies.push(omega / (2 * Math.PI));

      // Expand mode shape to full DOFs
      const fullMode = new Array(n).fill(0);
      freeDofs.forEach((dof, i) => fullMode[dof] = v[i]);
      modeShapes.push(fullMode);
    }

    return { frequencies: frequencies.sort((a, b) => a - b), modeShapes };
  }

  // -------------------------------------------------------------------------
  // Linear algebra helpers
  // -------------------------------------------------------------------------

  private _zeros(m: number, n: number): number[][] {
    return Array.from({ length: m }, () => new Array(n).fill(0));
  }

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
      if (Math.abs(pivot) < 1e-14) continue;

      for (let row = col + 1; row < n; row++) {
        const factor = aug[row][col] / pivot;
        for (let j = col; j <= n; j++) aug[row][j] -= factor * aug[col][j];
      }
    }

    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = aug[i][n];
      for (let j = i + 1; j < n; j++) sum -= aug[i][j] * x[j];
      x[i] = Math.abs(aug[i][i]) > 1e-14 ? sum / aug[i][i] : 0;
    }
    return x;
  }

  private _matVec(M: number[][], v: number[]): number[] {
    return M.map(row => row.reduce((s, mij, j) => s + mij * (v[j] ?? 0), 0));
  }

  private _extractSubmatrix(M: number[][], indices: number[]): number[][] {
    return indices.map(i => indices.map(j => M[i][j]));
  }
}

export const finiteElementEngine = new FiniteElementEngineImpl();
