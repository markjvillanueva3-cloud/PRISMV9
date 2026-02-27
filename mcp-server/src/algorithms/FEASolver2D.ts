/**
 * FEA Solver 2D — Simple Finite Element Analysis
 *
 * 2D plane stress/strain FEA using triangular (CST) elements.
 * Assembles global stiffness matrix and solves for nodal displacements
 * and element stresses.
 *
 * Manufacturing uses: fixture deflection analysis, workpiece clamping stress,
 * thermal stress in thin plates, tool holder stress analysis.
 *
 * References:
 * - Logan, D.L. (2011). "A First Course in the Finite Element Method"
 * - Cook, R.D. et al. (2001). "Concepts and Applications of FEA"
 *
 * @module algorithms/FEASolver2D
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export interface FEANode {
  id: number;
  x: number;
  y: number;
}

export interface FEAElement {
  id: number;
  /** Node IDs (3 for triangle). */
  nodes: [number, number, number];
}

export interface FEABoundaryCondition {
  node_id: number;
  dof: "x" | "y" | "xy";
  value?: number;
}

export interface FEALoad {
  node_id: number;
  fx: number;
  fy: number;
}

export interface FEASolver2DInput {
  nodes: FEANode[];
  elements: FEAElement[];
  /** Boundary conditions (fixed DOFs). */
  boundary_conditions: FEABoundaryCondition[];
  /** Applied loads. */
  loads: FEALoad[];
  /** Young's modulus [MPa]. Default 200000 (steel). */
  E?: number;
  /** Poisson's ratio. Default 0.3. */
  nu?: number;
  /** Thickness [mm]. Default 1. */
  thickness?: number;
  /** Analysis type. Default "plane_stress". */
  analysis_type?: "plane_stress" | "plane_strain";
}

export interface ElementResult {
  element_id: number;
  stress_xx: number;
  stress_yy: number;
  stress_xy: number;
  von_mises: number;
  strain_xx: number;
  strain_yy: number;
  strain_xy: number;
}

export interface FEASolver2DOutput extends WithWarnings {
  displacements: Array<{ node_id: number; dx: number; dy: number }>;
  element_results: ElementResult[];
  max_displacement: number;
  max_von_mises: number;
  reaction_forces: Array<{ node_id: number; fx: number; fy: number }>;
  n_dofs: number;
  n_equations: number;
  calculation_method: string;
}

export class FEASolver2D implements Algorithm<FEASolver2DInput, FEASolver2DOutput> {

  validate(input: FEASolver2DInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.nodes?.length || input.nodes.length < 3) issues.push({ field: "nodes", message: "At least 3 nodes required", severity: "error" });
    if (!input.elements?.length) issues.push({ field: "elements", message: "At least 1 element required", severity: "error" });
    if (!input.boundary_conditions?.length) issues.push({ field: "boundary_conditions", message: "At least 1 BC required", severity: "error" });
    if (!input.loads?.length) issues.push({ field: "loads", message: "At least 1 load required", severity: "error" });
    if ((input.E ?? 200000) <= 0) issues.push({ field: "E", message: "Must be > 0", severity: "error" });
    if (input.nodes?.length > 200) issues.push({ field: "nodes", message: "Max 200 nodes for this solver", severity: "warning" });
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: FEASolver2DInput): FEASolver2DOutput {
    const warnings: string[] = [];
    const { nodes, elements, boundary_conditions, loads } = input;
    const E = input.E ?? 200000;
    const nu = input.nu ?? 0.3;
    const t = input.thickness ?? 1;
    const type = input.analysis_type ?? "plane_stress";

    const nNodes = nodes.length;
    const nDofs = nNodes * 2;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const nodeIndex = new Map(nodes.map((n, i) => [n.id, i]));

    // Constitutive matrix D
    let D: number[][];
    if (type === "plane_stress") {
      const c = E / (1 - nu * nu);
      D = [[c, c * nu, 0], [c * nu, c, 0], [0, 0, c * (1 - nu) / 2]];
    } else {
      const c = E * (1 - nu) / ((1 + nu) * (1 - 2 * nu));
      const r = nu / (1 - nu);
      D = [[c, c * r, 0], [c * r, c, 0], [0, 0, c * (1 - 2 * nu) / (2 * (1 - nu))]];
    }

    // Global stiffness matrix (dense — adequate for <200 nodes)
    const K = Array.from({ length: nDofs }, () => new Array(nDofs).fill(0));
    const F = new Array(nDofs).fill(0);

    // Element B matrices for stress recovery
    const elementBs: Map<number, { B: number[][]; area: number }> = new Map();

    for (const elem of elements) {
      const [n1, n2, n3] = elem.nodes.map(id => nodeMap.get(id)!);
      const idx = elem.nodes.map(id => nodeIndex.get(id)!);

      // Area
      const area = 0.5 * Math.abs(
        (n2.x - n1.x) * (n3.y - n1.y) - (n3.x - n1.x) * (n2.y - n1.y));

      if (area < 1e-10) { warnings.push(`Element ${elem.id}: near-zero area`); continue; }

      // B matrix (strain-displacement)
      const b = [n2.y - n3.y, n3.y - n1.y, n1.y - n2.y];
      const c_ = [n3.x - n2.x, n1.x - n3.x, n2.x - n1.x];
      const invA2 = 1 / (2 * area);

      const B: number[][] = [
        [b[0] * invA2, 0, b[1] * invA2, 0, b[2] * invA2, 0],
        [0, c_[0] * invA2, 0, c_[1] * invA2, 0, c_[2] * invA2],
        [c_[0] * invA2, b[0] * invA2, c_[1] * invA2, b[1] * invA2, c_[2] * invA2, b[2] * invA2],
      ];
      elementBs.set(elem.id, { B, area });

      // ke = B'×D×B × area × thickness
      const DB: number[][] = Array.from({ length: 3 }, (_, i) =>
        Array.from({ length: 6 }, (_, j) => D[i].reduce((s, d, k) => s + d * B[k][j], 0)));

      const ke: number[][] = Array.from({ length: 6 }, (_, i) =>
        Array.from({ length: 6 }, (_, j) => {
          let sum = 0;
          for (let k = 0; k < 3; k++) sum += B[k][i] * DB[k][j];
          return sum * area * t;
        }));

      // Assemble into global K
      const dofs = idx.flatMap(i => [2 * i, 2 * i + 1]);
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
          K[dofs[i]][dofs[j]] += ke[i][j];
        }
      }
    }

    // Apply loads
    for (const load of loads) {
      const idx = nodeIndex.get(load.node_id);
      if (idx === undefined) continue;
      F[2 * idx] += load.fx;
      F[2 * idx + 1] += load.fy;
    }

    // Apply boundary conditions (penalty method)
    const penalty = 1e20;
    const fixedDofs = new Set<number>();
    for (const bc of boundary_conditions) {
      const idx = nodeIndex.get(bc.node_id);
      if (idx === undefined) continue;
      const val = bc.value ?? 0;
      if (bc.dof === "x" || bc.dof === "xy") {
        K[2 * idx][2 * idx] += penalty;
        F[2 * idx] += penalty * val;
        fixedDofs.add(2 * idx);
      }
      if (bc.dof === "y" || bc.dof === "xy") {
        K[2 * idx + 1][2 * idx + 1] += penalty;
        F[2 * idx + 1] += penalty * val;
        fixedDofs.add(2 * idx + 1);
      }
    }

    // Solve K×u = F via Gauss elimination
    const aug = K.map((row, i) => [...row, F[i]]);
    for (let col = 0; col < nDofs; col++) {
      let maxRow = col;
      for (let row = col + 1; row < nDofs; row++) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
      }
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
      const pivot = aug[col][col];
      if (Math.abs(pivot) < 1e-20) continue;
      for (let j = col; j <= nDofs; j++) aug[col][j] /= pivot;
      for (let row = 0; row < nDofs; row++) {
        if (row === col) continue;
        const f = aug[row][col];
        for (let j = col; j <= nDofs; j++) aug[row][j] -= f * aug[col][j];
      }
    }
    const u = aug.map(row => row[nDofs]);

    // Extract displacements
    const displacements = nodes.map(n => {
      const i = nodeIndex.get(n.id)!;
      return { node_id: n.id, dx: u[2 * i], dy: u[2 * i + 1] };
    });

    // Element stresses
    const elementResults: ElementResult[] = [];
    for (const elem of elements) {
      const bd = elementBs.get(elem.id);
      if (!bd) continue;
      const { B } = bd;
      const idx = elem.nodes.map(id => nodeIndex.get(id)!);
      const ue = idx.flatMap(i => [u[2 * i], u[2 * i + 1]]);

      // strain = B × u_e
      const strain = [0, 1, 2].map(i => B[i].reduce((s, b, j) => s + b * ue[j], 0));
      // stress = D × strain
      const stress = [0, 1, 2].map(i => D[i].reduce((s, d, k) => s + d * strain[k], 0));
      const vm = Math.sqrt(stress[0] ** 2 - stress[0] * stress[1] + stress[1] ** 2 + 3 * stress[2] ** 2);

      elementResults.push({
        element_id: elem.id,
        stress_xx: stress[0], stress_yy: stress[1], stress_xy: stress[2],
        von_mises: vm,
        strain_xx: strain[0], strain_yy: strain[1], strain_xy: strain[2],
      });
    }

    // Reaction forces
    const reactions = [...fixedDofs].map(dof => {
      const nodeIdx = Math.floor(dof / 2);
      const n = nodes[nodeIdx];
      const isX = dof % 2 === 0;
      const force = K[dof].reduce((s, k, j) => s + k * u[j], 0) - F[dof];
      return { node_id: n.id, fx: isX ? force : 0, fy: isX ? 0 : force };
    });

    return {
      displacements,
      element_results: elementResults,
      max_displacement: Math.max(...displacements.map(d => Math.sqrt(d.dx ** 2 + d.dy ** 2))),
      max_von_mises: Math.max(...elementResults.map(e => e.von_mises), 0),
      reaction_forces: reactions,
      n_dofs: nDofs,
      n_equations: nDofs - fixedDofs.size,
      warnings,
      calculation_method: `2D FEA (${type}, CST elements, n=${nNodes} nodes, e=${elements.length} elements)`,
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "fea-solver-2d",
      name: "2D FEA Solver (CST)",
      description: "Plane stress/strain finite element analysis with triangular elements",
      formula: "K×u = F; σ = D×B×u; σ_vm = √(σ_xx² - σ_xx×σ_yy + σ_yy² + 3×σ_xy²)",
      reference: "Logan (2011); Cook et al. (2001)",
      safety_class: "critical",
      domain: "numerical",
      inputs: { nodes: "Mesh nodes", elements: "Triangular elements", loads: "Applied forces" },
      outputs: { displacements: "Nodal displacements", max_von_mises: "Peak stress [MPa]", element_results: "Per-element stresses" },
    };
  }
}
