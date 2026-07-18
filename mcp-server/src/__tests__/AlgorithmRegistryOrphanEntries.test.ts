/**
 * AlgorithmRegistry orphaned-algo capability entries (slot:bravo 2026-06-19, ENGINE-AUDIT).
 *
 * The audit wired 3 orphaned MIT-OCW algorithm ports into prism_algorithm (control_statespace,
 * ml_tsne, num_fem_1d). They are now EXECUTABLE, but were absent from the AlgorithmRegistry
 * capability catalog -- so the AlgorithmGatewayEngine's recommend/selection layer could never
 * surface them. This pins the catalog entries so they are both discoverable AND executable.
 *
 * NOTE: the registry loads ASYNC (`await load()`, guarded by `this.loaded`); its public `all()`
 * returns the raw AlgorithmEntry shape (top-level id/name/type/consumers).
 */
import { beforeAll, describe, it, expect } from "vitest";

import { algorithmRegistry } from "../registries/AlgorithmRegistry.js";

let entries: any[] = [];
const byId = (id: string) => entries.find((e) => e?.id === id);

beforeAll(async () => {
  await algorithmRegistry.load();
  entries = Array.from(algorithmRegistry.all() as Iterable<any>);
});

describe("AlgorithmRegistry: orphaned-algo capability entries", () => {
  it("registers Linear State-Space Model with control type + dispatcher consumer", () => {
    const e = byId("ALG-CONTROL-STATESPACE-001");
    expect(e?.name).toBe("Linear State-Space Model");
    expect(e?.type).toBe("control");
    expect(e?.source_file).toBe("LinearStateSpaceModel.ts");
    expect(e?.consumers).toContain("prism_algorithm:control_statespace");
  });

  it("registers t-SNE with ml type + dispatcher consumer", () => {
    const e = byId("ALG-ML-TSNE-001");
    expect(e?.name).toBe("t-SNE Dimensionality Reduction");
    expect(e?.type).toBe("ml");
    expect(e?.source_file).toBe("TSNEAlgorithm.ts");
    expect(e?.consumers).toContain("prism_algorithm:ml_tsne");
  });

  it("registers 1D FEM with numerical type + dispatcher consumer", () => {
    const e = byId("ALG-NUMERICAL-FEM1D-001");
    expect(e?.name).toBe("1D Finite Element Method (BVP)");
    expect(e?.type).toBe("numerical");
    expect(e?.source_file).toBe("FiniteElementMethod1D.ts");
    expect(e?.consumers).toContain("prism_algorithm:num_fem_1d");
  });

  it("all 3 carry a non-empty functions[] list (capability metadata for the gateway)", () => {
    for (const id of ["ALG-CONTROL-STATESPACE-001", "ALG-ML-TSNE-001", "ALG-NUMERICAL-FEM1D-001"]) {
      const e = byId(id);
      expect(Array.isArray(e?.functions)).toBe(true);
      expect(e!.functions.length).toBeGreaterThan(0);
      expect(typeof e!.functions[0].name).toBe("string");
    }
  });

  it("entry ids are unique within the catalog (no duplicate registration)", () => {
    for (const id of ["ALG-CONTROL-STATESPACE-001", "ALG-ML-TSNE-001", "ALG-NUMERICAL-FEM1D-001"]) {
      expect(entries.filter((e) => e?.id === id).length).toBe(1);
    }
  });
});
