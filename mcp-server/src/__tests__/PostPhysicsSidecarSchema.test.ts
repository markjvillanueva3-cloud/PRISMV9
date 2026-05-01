/**
 * PostPhysicsSidecarSchema tests — MS0/U-PPGM01.
 *
 * Reference values trace to src/physics/constants.ts (canonical). Tests
 * verify that the schema accepts valid sidecars and rejects malformed/
 * adversarial inputs before they corrupt downstream physics calls.
 *
 * Coverage: happy path + 3 failure modes (missing field, wrong type,
 * out-of-range) + 2 adversarial (NaN, Infinity) + variability across 6 ISO
 * groups + non-throwing safe-parse contract.
 */

import { describe, it, expect } from "vitest";
import { ZodError } from "zod";
import {
  buildCanonicalSidecarPayload,
  parseSidecarStrict,
  parseSidecarSafe,
  POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
} from "../schemas/postPhysicsSidecarSchema.js";
import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  CANONICAL_TOOL_MODULUS,
} from "../physics/constants.js";

// Reference values cited from Sandvik Coromant General Turning (2024) / ISO 3685:1993.
// These are expected literals against canonical source — only inlined here in tests.
const REF_KC1_1_P = 1800;
const REF_KC1_1_M = 2100;
const REF_KC1_1_K = 1100;
const REF_KC1_1_N = 700;
const REF_KC1_1_S = 2800;
const REF_KC1_1_H = 3200;
const REF_TAYLOR_C_P = 350;
const REF_TAYLOR_C_M = 200;
const REF_TAYLOR_C_K = 250;
const REF_TAYLOR_C_N = 600;
const REF_TAYLOR_C_S = 150;
const REF_TAYLOR_C_H = 120;
const REF_TAYLOR_N_S = 0.18;
const REF_CARBIDE_MODULUS_MPA = 600_000;
const REF_HSS_MODULUS_MPA = 210_000;
const REF_DIAMOND_MODULUS_MPA = 1_050_000;
const SHA256_HEX_LENGTH = 64;

const MOCK_SHA = "0".repeat(SHA256_HEX_LENGTH);

function validMeta() {
  return {
    schema_version: POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
    sha256: MOCK_SHA,
    generated_at: "2026-04-29T00:00:00.000Z",
    source_engine_versions: {
      "src/physics/constants.ts": "abcdef1234567890",
      "PostProcessorPipelineEngine": "1.0.0",
    },
    constants_source: "src/physics/constants.ts",
  };
}

function validSidecar() {
  return { meta: validMeta(), ...buildCanonicalSidecarPayload() };
}

// ============================================================================
// HAPPY PATH — schema admits canonical payload + values match constants.ts
// ============================================================================

describe("PostPhysicsSidecarSchema — happy path", () => {
  it("parses canonical payload and meta fields equal supplied values", () => {
    const parsed = parseSidecarStrict(validSidecar());
    expect(parsed.meta.schema_version).toBe(POST_PHYSICS_SIDECAR_SCHEMA_VERSION);
    expect(parsed.meta.sha256).toBe(MOCK_SHA);
    expect(parsed.meta.constants_source).toBe("src/physics/constants.ts");
    expect(parsed.meta.generated_at).toBe("2026-04-29T00:00:00.000Z");
    expect(parsed.meta.source_engine_versions["PostProcessorPipelineEngine"]).toBe("1.0.0");
  });

  it("preserves canonical kc1_1 reference values for all 6 ISO groups", () => {
    const parsed = parseSidecarStrict(validSidecar());
    expect(parsed.kienzle.P.kc1_1).toBe(REF_KC1_1_P);
    expect(parsed.kienzle.M.kc1_1).toBe(REF_KC1_1_M);
    expect(parsed.kienzle.K.kc1_1).toBe(REF_KC1_1_K);
    expect(parsed.kienzle.N.kc1_1).toBe(REF_KC1_1_N);
    expect(parsed.kienzle.S.kc1_1).toBe(REF_KC1_1_S);
    expect(parsed.kienzle.H.kc1_1).toBe(REF_KC1_1_H);
    // Cross-check parsed values match the canonical source object directly
    expect(parsed.kienzle.P.kc1_1).toBe(CANONICAL_KIENZLE.P.kc1_1);
    expect(parsed.kienzle.H.kc1_1).toBe(CANONICAL_KIENZLE.H.kc1_1);
  });

  it("preserves canonical Taylor C reference values for all 6 ISO groups", () => {
    const parsed = parseSidecarStrict(validSidecar());
    expect(parsed.taylor.P.C).toBe(REF_TAYLOR_C_P);
    expect(parsed.taylor.M.C).toBe(REF_TAYLOR_C_M);
    expect(parsed.taylor.K.C).toBe(REF_TAYLOR_C_K);
    expect(parsed.taylor.N.C).toBe(REF_TAYLOR_C_N);
    expect(parsed.taylor.S.C).toBe(REF_TAYLOR_C_S);
    expect(parsed.taylor.H.C).toBe(REF_TAYLOR_C_H);
    expect(parsed.taylor.S.n).toBe(REF_TAYLOR_N_S);
  });

  it("includes extended-Taylor table with physically meaningful exponents (0 < a, b < 1) for all 6 ISO groups", () => {
    const parsed = parseSidecarStrict(validSidecar());
    for (const g of ["P", "M", "K", "N", "S", "H"] as const) {
      expect(parsed.extended_taylor[g].a).toBeGreaterThan(0);
      expect(parsed.extended_taylor[g].a).toBeLessThan(1);
      expect(parsed.extended_taylor[g].b).toBeGreaterThan(0);
      expect(parsed.extended_taylor[g].b).toBeLessThan(1);
    }
  });

  it("includes EDM physics subtree carrying spark_erosion key with non-empty model coefficients", () => {
    const parsed = parseSidecarStrict(validSidecar());
    const sparkErosion = parsed.edm_physics.spark_erosion as Record<string, unknown>;
    expect(typeof sparkErosion).toBe("object");
    expect(Object.keys(sparkErosion).length).toBeGreaterThan(0);
  });

  it("includes tool-modulus table with carbide=600000, hss=210000, diamond=1050000 MPa (Sandvik 2024 / ASM Vol.2)", () => {
    const parsed = parseSidecarStrict(validSidecar());
    expect(parsed.tool_modulus_MPa.carbide).toBe(REF_CARBIDE_MODULUS_MPA);
    expect(parsed.tool_modulus_MPa.hss).toBe(REF_HSS_MODULUS_MPA);
    expect(parsed.tool_modulus_MPa.diamond).toBe(REF_DIAMOND_MODULUS_MPA);
    // Cross-check against canonical source
    expect(parsed.tool_modulus_MPa.carbide).toBe(CANONICAL_TOOL_MODULUS.carbide);
    // Invariants (cross-source sanity)
    expect(parsed.tool_modulus_MPa.diamond).toBeGreaterThan(parsed.tool_modulus_MPa.carbide);
    expect(parsed.tool_modulus_MPa.hss).toBeLessThan(parsed.tool_modulus_MPa.carbide);
  });

  it("buildCanonicalSidecarPayload returns identical kc1_1/Taylor C/tool_modulus values as direct CANONICAL_* exports", () => {
    const payload = buildCanonicalSidecarPayload();
    expect(payload.kienzle.P.kc1_1).toBe(CANONICAL_KIENZLE.P.kc1_1);
    expect(payload.taylor.M.C).toBe(CANONICAL_TAYLOR.M.C);
    expect(payload.tool_modulus_MPa.carbide).toBe(CANONICAL_TOOL_MODULUS.carbide);
    expect(payload.kienzle.H.mc).toBe(CANONICAL_KIENZLE.H.mc);
  });
});

// ============================================================================
// FAILURE MODE 1 — MISSING REQUIRED FIELDS
// ============================================================================

describe("PostPhysicsSidecarSchema — missing-field failures", () => {
  it("rejects sidecar missing meta entirely; issue path includes 'meta'", () => {
    const bad = validSidecar() as Partial<ReturnType<typeof validSidecar>>;
    delete bad.meta;
    const result = parseSidecarSafe(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const metaIssuePresent = result.issues.some((i) => i.path[0] === "meta");
      expect(metaIssuePresent).toBe(true);
    }
  });

  it("rejects sidecar missing kienzle.P entry; issue path includes ['kienzle','P']", () => {
    const bad = validSidecar();
    // @ts-expect-error — deliberately malformed
    delete bad.kienzle.P;
    const result = parseSidecarSafe(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const kienzlePIssuePresent = result.issues.some(
        (i) => i.path.includes("P") && i.path.includes("kienzle"),
      );
      expect(kienzlePIssuePresent).toBe(true);
    }
  });

  it("rejects sidecar missing meta.sha256; issue path includes 'sha256'", () => {
    const bad = validSidecar();
    // @ts-expect-error — deliberately malformed
    delete bad.meta.sha256;
    const result = parseSidecarSafe(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const shaIssuePresent = result.issues.some((i) => i.path.includes("sha256"));
      expect(shaIssuePresent).toBe(true);
    }
  });
});

// ============================================================================
// FAILURE MODE 2 — WRONG TYPE
// ============================================================================

describe("PostPhysicsSidecarSchema — wrong-type rejections", () => {
  it("rejects kc1_1 supplied as string '1800' instead of number 1800", () => {
    const bad = validSidecar();
    // @ts-expect-error — type-mismatch test
    bad.kienzle.P.kc1_1 = "1800";
    const result = parseSidecarSafe(bad);
    expect(result.ok).toBe(false);
  });

  it("rejects sha256 not 64-char lowercase hex (e.g. 'tooshort')", () => {
    const bad = validSidecar();
    bad.meta.sha256 = "tooshort";
    const result = parseSidecarSafe(bad);
    expect(result.ok).toBe(false);
  });

  it("rejects sha256 64-char but with uppercase characters (regex enforces lowercase)", () => {
    const bad = validSidecar();
    bad.meta.sha256 = "A".repeat(SHA256_HEX_LENGTH);
    const result = parseSidecarSafe(bad);
    expect(result.ok).toBe(false);
  });

  it("rejects generated_at not in ISO 8601 format ('yesterday')", () => {
    const bad = validSidecar();
    bad.meta.generated_at = "yesterday";
    const result = parseSidecarSafe(bad);
    expect(result.ok).toBe(false);
  });
});

// ============================================================================
// FAILURE MODE 3 — OUT-OF-RANGE NUMERIC VALUES
// ============================================================================

describe("PostPhysicsSidecarSchema — out-of-range rejections", () => {
  it("rejects negative kc1_1 (cutting force coefficient cannot be negative)", () => {
    const bad = validSidecar();
    bad.kienzle.P.kc1_1 = -REF_KC1_1_P;
    const result = parseSidecarSafe(bad);
    expect(result.ok).toBe(false);
  });

  it("rejects mc exponent equal to 1.0 (chip-thinning would diverge)", () => {
    const bad = validSidecar();
    bad.kienzle.P.mc = 1.0;
    const result = parseSidecarSafe(bad);
    expect(result.ok).toBe(false);
  });

  it("rejects mc exponent of zero (would yield Fc independent of feed)", () => {
    const bad = validSidecar();
    bad.kienzle.M.mc = 0;
    const result = parseSidecarSafe(bad);
    expect(result.ok).toBe(false);
  });

  it("rejects Taylor C of zero (zero cutting speed for 1-min life is meaningless)", () => {
    const bad = validSidecar();
    bad.taylor.P.C = 0;
    const result = parseSidecarSafe(bad);
    expect(result.ok).toBe(false);
  });
});

// ============================================================================
// ADVERSARIAL — NaN AND INFINITY
// ============================================================================

describe("PostPhysicsSidecarSchema — adversarial NaN/Infinity rejection", () => {
  it("rejects NaN kc1_1 (force = NaN would propagate through every Kienzle call)", () => {
    const bad = validSidecar();
    bad.kienzle.P.kc1_1 = Number.NaN;
    const result = parseSidecarSafe(bad);
    expect(result.ok).toBe(false);
  });

  it("rejects Infinity Taylor C (would predict infinite tool life)", () => {
    const bad = validSidecar();
    bad.taylor.P.C = Number.POSITIVE_INFINITY;
    const result = parseSidecarSafe(bad);
    expect(result.ok).toBe(false);
  });

  it("rejects -Infinity tool modulus (negative stiffness has no physical meaning)", () => {
    const bad = validSidecar();
    bad.tool_modulus_MPa.carbide = Number.NEGATIVE_INFINITY;
    const result = parseSidecarSafe(bad);
    expect(result.ok).toBe(false);
  });

  it("rejects NaN extended-Taylor exponent", () => {
    const bad = validSidecar();
    bad.extended_taylor.S.a = Number.NaN;
    const result = parseSidecarSafe(bad);
    expect(result.ok).toBe(false);
  });
});

// ============================================================================
// VARIABILITY — all 6 ISO groups round-trip identically
// ============================================================================

describe("PostPhysicsSidecarSchema — variability across all 6 ISO groups", () => {
  it("retains all 6 ISO groups in kienzle table after round-trip parse (canonical kc1_1, mc per group)", () => {
    const parsed = parseSidecarStrict(validSidecar());
    for (const g of ["P", "M", "K", "N", "S", "H"] as const) {
      expect(parsed.kienzle[g].kc1_1).toBe(CANONICAL_KIENZLE[g].kc1_1);
      expect(parsed.kienzle[g].mc).toBe(CANONICAL_KIENZLE[g].mc);
    }
  });

  it("retains all 6 ISO groups in taylor table after round-trip parse (canonical C, n per group)", () => {
    const parsed = parseSidecarStrict(validSidecar());
    for (const g of ["P", "M", "K", "N", "S", "H"] as const) {
      expect(parsed.taylor[g].C).toBe(CANONICAL_TAYLOR[g].C);
      expect(parsed.taylor[g].n).toBe(CANONICAL_TAYLOR[g].n);
    }
  });

  it("ISO-H (3200) >> ISO-N (700) — hardened steel kc1_1 must dwarf non-ferrous (sanity invariant)", () => {
    const parsed = parseSidecarStrict(validSidecar());
    const ratio = parsed.kienzle.H.kc1_1 / parsed.kienzle.N.kc1_1;
    expect(ratio).toBeGreaterThan(3);
    expect(parsed.kienzle.H.kc1_1).toBe(REF_KC1_1_H);
    expect(parsed.kienzle.N.kc1_1).toBe(REF_KC1_1_N);
  });

  it("ISO-S (superalloy) Taylor C=150 < ISO-N (aluminum) Taylor C=600 — superalloys cut slower", () => {
    const parsed = parseSidecarStrict(validSidecar());
    expect(parsed.taylor.S.C).toBeLessThan(parsed.taylor.N.C);
    expect(parsed.taylor.S.C).toBe(REF_TAYLOR_C_S);
    expect(parsed.taylor.N.C).toBe(REF_TAYLOR_C_N);
  });
});

// ============================================================================
// SAFE-PARSE CONTRACT
// ============================================================================

describe("PostPhysicsSidecarSchema — safe-parse contract", () => {
  it("parseSidecarSafe returns ok=true with sidecar.kienzle.P.kc1_1 equal to REF_KC1_1_P on valid input", () => {
    const result = parseSidecarSafe(validSidecar());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sidecar.kienzle.P.kc1_1).toBe(REF_KC1_1_P);
    }
  });

  it("parseSidecarSafe returns ok=false with non-empty issues array on partial input", () => {
    const result = parseSidecarSafe({ meta: {} });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThan(0);
    }
  });

  it("parseSidecarStrict throws ZodError on invalid input shape", () => {
    let caughtName = "";
    let caughtIssueCount = 0;
    try {
      parseSidecarStrict({ wrong: "shape" });
    } catch (err) {
      const zerr = err as ZodError;
      caughtName = zerr.constructor.name;
      caughtIssueCount = Array.isArray(zerr.issues) ? zerr.issues.length : 0;
    }
    expect(caughtName).toBe("ZodError");
    expect(caughtIssueCount).toBeGreaterThan(0);
  });

  it("parseSidecarStrict on completely empty object throws ZodError listing >=5 missing top-level fields", () => {
    let caughtIssueCount = 0;
    try {
      parseSidecarStrict({});
    } catch (err) {
      const zerr = err as ZodError;
      caughtIssueCount = Array.isArray(zerr.issues) ? zerr.issues.length : 0;
    }
    // Schema has meta + kienzle + taylor + extended_taylor + tool_modulus_MPa + ... = ≥5 required top-level fields
    expect(caughtIssueCount).toBeGreaterThanOrEqual(5);
  });
});
