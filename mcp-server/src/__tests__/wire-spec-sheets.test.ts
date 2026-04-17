/**
 * wire-spec-sheets.test.ts — MS-P1-100PCT U-P1-01 tests
 *
 * Tests for wire specification data with manufacturer citations.
 * Validates:
 *   - AtomicValue structure for all wire properties
 *   - Citation sources present on all specs
 *   - Lookup functions work correctly
 *   - Values within physically reasonable ranges
 */

import { describe, it, expect } from "vitest";
import {
  WIRE_SPEC_CATALOG,
  getWireSpec,
  getWireSpecById,
  getWireSpecsByMaterial,
  getWireSpecsByDiameter,
  getAvailableWireTypes,
  hasWireSpec,
  type WireSpecification,
  type AtomicValue,
} from "../data/wire-spec-sheets";

// ============================================================================
// Helper to validate AtomicValue structure
// ============================================================================

function isValidAtomicValue(av: AtomicValue): boolean {
  return (
    typeof av.value === "number" &&
    typeof av.unit === "string" &&
    typeof av.uncertainty === "number" &&
    typeof av.confidence === "number" &&
    typeof av.source === "string" &&
    av.confidence >= 0 &&
    av.confidence <= 1 &&
    av.uncertainty >= 0
  );
}

// ============================================================================
// Catalog Completeness
// ============================================================================

describe("Wire Spec Catalog", () => {
  it("should have at least 6 wire specifications", () => {
    expect(WIRE_SPEC_CATALOG.length).toBeGreaterThanOrEqual(6);
  });

  it("should have all required wire types", () => {
    const types = getAvailableWireTypes();
    expect(types).toContain("brass_0.25");
    expect(types).toContain("brass_0.20");
    expect(types).toContain("coated_0.25");
    expect(types).toContain("coated_0.20");
    expect(types).toContain("moly_0.10");
    expect(types).toContain("tungsten_0.05");
  });

  it("should include multiple manufacturers", () => {
    const manufacturers = new Set(WIRE_SPEC_CATALOG.map((w) => w.manufacturer));
    expect(manufacturers.size).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================================
// AtomicValue Structure
// ============================================================================

describe("AtomicValue Structure", () => {
  for (const spec of WIRE_SPEC_CATALOG) {
    describe(`${spec.id}`, () => {
      it("diameter_mm should be valid AtomicValue", () => {
        expect(isValidAtomicValue(spec.diameter_mm)).toBe(true);
        expect(spec.diameter_mm.unit).toBe("mm");
      });

      it("tension_N should be valid AtomicValue", () => {
        expect(isValidAtomicValue(spec.tension_N)).toBe(true);
        expect(spec.tension_N.unit).toBe("N");
      });

      it("max_tension_N should be valid AtomicValue", () => {
        expect(isValidAtomicValue(spec.max_tension_N)).toBe(true);
        expect(spec.max_tension_N.unit).toBe("N");
      });

      it("tensile_strength_MPa should be valid AtomicValue", () => {
        expect(isValidAtomicValue(spec.tensile_strength_MPa)).toBe(true);
        expect(spec.tensile_strength_MPa.unit).toBe("MPa");
      });

      it("conductivity should be valid AtomicValue", () => {
        expect(isValidAtomicValue(spec.conductivity_pct_IACS)).toBe(true);
        expect(spec.conductivity_pct_IACS.unit).toBe("% IACS");
      });

      it("cost_per_m should be valid AtomicValue", () => {
        expect(isValidAtomicValue(spec.cost_per_m_usd)).toBe(true);
        expect(spec.cost_per_m_usd.unit).toBe("USD/m");
      });

      it("max_current_density should be valid AtomicValue", () => {
        expect(isValidAtomicValue(spec.max_current_density_A_mm2)).toBe(true);
        expect(spec.max_current_density_A_mm2.unit).toBe("A/mm²");
      });
    });
  }
});

// ============================================================================
// Citation Sources
// ============================================================================

describe("Citation Sources", () => {
  for (const spec of WIRE_SPEC_CATALOG) {
    describe(`${spec.id}`, () => {
      it("should have manufacturer reference", () => {
        expect(spec.reference).toBeTruthy();
        expect(spec.reference.length).toBeGreaterThan(10);
      });

      it("diameter_mm should cite source", () => {
        expect(spec.diameter_mm.source).toBeTruthy();
        expect(spec.diameter_mm.source.length).toBeGreaterThan(5);
      });

      it("tension_N should cite source", () => {
        expect(spec.tension_N.source).toBeTruthy();
        expect(spec.tension_N.source.length).toBeGreaterThan(5);
      });

      it("max_current_density should cite source", () => {
        expect(spec.max_current_density_A_mm2.source).toBeTruthy();
        expect(spec.max_current_density_A_mm2.source.length).toBeGreaterThan(5);
      });
    });
  }
});

// ============================================================================
// Physically Reasonable Values
// ============================================================================

describe("Physical Value Ranges", () => {
  for (const spec of WIRE_SPEC_CATALOG) {
    describe(`${spec.id}`, () => {
      it("diameter should be between 0.02mm and 0.35mm", () => {
        expect(spec.diameter_mm.value).toBeGreaterThanOrEqual(0.02);
        expect(spec.diameter_mm.value).toBeLessThanOrEqual(0.35);
      });

      it("tension should be positive and less than 30N", () => {
        expect(spec.tension_N.value).toBeGreaterThan(0);
        expect(spec.tension_N.value).toBeLessThanOrEqual(30);
      });

      it("max_tension should be greater than nominal tension", () => {
        expect(spec.max_tension_N.value).toBeGreaterThan(spec.tension_N.value);
      });

      it("tensile strength should be between 500 and 4000 MPa", () => {
        expect(spec.tensile_strength_MPa.value).toBeGreaterThanOrEqual(500);
        expect(spec.tensile_strength_MPa.value).toBeLessThanOrEqual(4000);
      });

      it("conductivity should be between 15% and 50% IACS", () => {
        expect(spec.conductivity_pct_IACS.value).toBeGreaterThanOrEqual(15);
        expect(spec.conductivity_pct_IACS.value).toBeLessThanOrEqual(50);
      });

      it("cost should be between $0.01 and $1.00 per meter", () => {
        expect(spec.cost_per_m_usd.value).toBeGreaterThanOrEqual(0.01);
        expect(spec.cost_per_m_usd.value).toBeLessThanOrEqual(1.0);
      });

      it("max current density should be between 100 and 600 A/mm²", () => {
        expect(spec.max_current_density_A_mm2.value).toBeGreaterThanOrEqual(100);
        expect(spec.max_current_density_A_mm2.value).toBeLessThanOrEqual(600);
      });
    });
  }
});

// ============================================================================
// Lookup Functions
// ============================================================================

describe("getWireSpec", () => {
  it("should return spec for brass_0.25", () => {
    const spec = getWireSpec("brass_0.25");
    expect(spec).not.toBeNull();
    expect(spec?.diameter_mm.value).toBe(0.25);
    expect(spec?.material).toBe("brass_cuzn37");
  });

  it("should return spec for moly_0.10", () => {
    const spec = getWireSpec("moly_0.10");
    expect(spec).not.toBeNull();
    expect(spec?.diameter_mm.value).toBe(0.10);
    expect(spec?.material).toBe("molybdenum");
  });

  it("should return spec for tungsten_0.05", () => {
    const spec = getWireSpec("tungsten_0.05");
    expect(spec).not.toBeNull();
    expect(spec?.diameter_mm.value).toBe(0.05);
    expect(spec?.material).toBe("tungsten");
  });

  it("should return spec for coated wires", () => {
    const spec025 = getWireSpec("coated_0.25");
    const spec020 = getWireSpec("coated_0.20");
    expect(spec025).not.toBeNull();
    expect(spec020).not.toBeNull();
    expect(spec025?.material).toBe("zinc_coated_brass");
    expect(spec020?.material).toBe("zinc_coated_brass");
  });
});

describe("getWireSpecById", () => {
  it("should return spec by ID", () => {
    const spec = getWireSpecById("bedra-cut-e-025");
    expect(spec).not.toBeNull();
    expect(spec?.diameter_mm.value).toBe(0.25);
  });

  it("should return null for unknown ID", () => {
    const spec = getWireSpecById("unknown-wire-xyz");
    expect(spec).toBeNull();
  });
});

describe("getWireSpecsByMaterial", () => {
  it("should return brass wires", () => {
    const specs = getWireSpecsByMaterial("brass_cuzn37");
    expect(specs.length).toBeGreaterThanOrEqual(2);
    for (const spec of specs) {
      expect(spec.material).toBe("brass_cuzn37");
    }
  });

  it("should return coated wires", () => {
    const specs = getWireSpecsByMaterial("zinc_coated_brass");
    expect(specs.length).toBeGreaterThanOrEqual(2);
  });
});

describe("getWireSpecsByDiameter", () => {
  it("should return wires in diameter range", () => {
    const specs = getWireSpecsByDiameter(0.20, 0.25);
    expect(specs.length).toBeGreaterThanOrEqual(4); // brass + coated versions
    for (const spec of specs) {
      expect(spec.diameter_mm.value).toBeGreaterThanOrEqual(0.20);
      expect(spec.diameter_mm.value).toBeLessThanOrEqual(0.25);
    }
  });

  it("should return micro wires", () => {
    const specs = getWireSpecsByDiameter(0.04, 0.12);
    expect(specs.length).toBeGreaterThanOrEqual(2); // moly + tungsten
  });
});

describe("hasWireSpec", () => {
  it("should return true for valid wire types", () => {
    expect(hasWireSpec("brass_0.25")).toBe(true);
    expect(hasWireSpec("moly_0.10")).toBe(true);
    expect(hasWireSpec("tungsten_0.05")).toBe(true);
  });

  it("should return false for invalid wire types", () => {
    expect(hasWireSpec("unknown_wire")).toBe(false);
    expect(hasWireSpec("")).toBe(false);
  });
});

// ============================================================================
// Wire Speed Range
// ============================================================================

describe("Wire Speed Ranges", () => {
  for (const spec of WIRE_SPEC_CATALOG) {
    it(`${spec.id} should have valid wire speed range`, () => {
      expect(spec.wire_speed_m_min.min).toBeGreaterThan(0);
      expect(spec.wire_speed_m_min.max).toBeGreaterThan(spec.wire_speed_m_min.min);
      expect(spec.wire_speed_m_min.source).toBeTruthy();
    });
  }
});

// ============================================================================
// Applications List
// ============================================================================

describe("Applications", () => {
  for (const spec of WIRE_SPEC_CATALOG) {
    it(`${spec.id} should have at least one application`, () => {
      expect(spec.applications.length).toBeGreaterThanOrEqual(1);
    });
  }
});
