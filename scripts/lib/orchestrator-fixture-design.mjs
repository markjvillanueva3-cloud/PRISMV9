// scripts/lib/orchestrator-fixture-design.mjs
//
// U-MMO-FIXTURE-DESIGN-REFACTOR — invert-of-control on fixture selection.
//
// PROBLEM (per Agent M)
// PRISM today has LatheWorkholdingEngine, MillFixtureDesignEngine,
// WEDMFixtureEngine — three separate engines with similar shape. Per
// `feedback_mathematical_exhaustive_completeness` + Agent M's audit, this
// is a cross-domain reuse opportunity: 1 generic engine + 3 thin adapters.
//
// SOLUTION
// Generic designFixture(part, machine, domain, adapter) that handles:
//   - capability matching (workholding type vs part geometry)
//   - clamp-force calculation (delegated to physics)
//   - datum preservation (which faces must remain clean for next op)
//   - operator-skill gating (3-jaw chuck vs soft-jaws etc)
//
// Each domain adapter contributes only what's TRULY domain-specific:
//   - lathe: collet vs chuck vs faceplate, between-centers, steady rest
//   - mill: vise vs soft-jaws vs tombstone vs mag-chuck
//   - wedm: glue-fix vs sub-plate vs starter-hole vs clamp-skim
//
// Composes with U-MMO-SETUP-ORCHESTRATION-ENGINE (Stage 5 hub calls this).

const VALID_DOMAINS = Object.freeze(["lathe", "mill", "wedm"]);

const REQUIRED_ADAPTER_METHODS = Object.freeze([
  "domainTag",          // () → "lathe"|"mill"|"wedm"
  "listFixtureTypes",   // () → string[]
  "isCompatible",       // (fixtureType, partGeometry) → boolean
  "estimateClampForce", // (fixtureType, partGeometry, material) → N
  "preservedFaces",     // (fixtureType, partGeometry) → string[]
]);

export function validateFixtureAdapter(adapter, domain) {
  if (!adapter || typeof adapter !== "object") {
    throw new Error("validateFixtureAdapter: adapter object required");
  }
  if (!VALID_DOMAINS.includes(domain)) {
    throw new Error(`validateFixtureAdapter: invalid domain '${domain}'`);
  }
  for (const m of REQUIRED_ADAPTER_METHODS) {
    if (typeof adapter[m] !== "function") {
      throw new Error(`validateFixtureAdapter[${domain}]: adapter missing method '${m}'`);
    }
  }
  const tag = adapter.domainTag();
  if (tag !== domain) {
    throw new Error(`validateFixtureAdapter: adapter.domainTag()='${tag}' but expected '${domain}'`);
  }
}

/**
 * Design a fixture for a part.
 *
 * @param {object} params
 * @param {object} params.part         - { geometry, features, ... }
 * @param {object} params.material     - from MATERIAL_RESOLVE stage
 * @param {object} params.machine      - target machine envelope
 * @param {string} params.domain       - lathe|mill|wedm
 * @param {object} params.adapter      - domain-specific adapter
 * @param {string} [params.operatorSkill="standard"]  - "standard"|"expert"|"novice"
 * @returns {{fixture_type, clamp_force_n, preserved_faces, confidence, evidence: string[]}}
 */
export function designFixture({ part, material, machine, domain, adapter, operatorSkill = "standard" }) {
  validateFixtureAdapter(adapter, domain);
  if (!part || !part.geometry) {
    throw new Error("designFixture: part with geometry required");
  }
  if (!material || !material.iso_group) {
    throw new Error("designFixture: material with iso_group required");
  }
  if (!machine) {
    throw new Error("designFixture: machine required");
  }

  const candidates = adapter.listFixtureTypes();
  const compatible = candidates.filter((t) => {
    try { return adapter.isCompatible(t, part.geometry); } catch { return false; }
  });
  if (compatible.length === 0) {
    return {
      fixture_type: null,
      clamp_force_n: 0,
      preserved_faces: [],
      confidence: 0,
      evidence: [`no compatible ${domain} fixture for this part geometry`],
    };
  }

  // Score by: clamp force achievable, fewest preserved-face constraints,
  // operator-skill match (expert can use complex jaws; novice gets simple).
  const scored = compatible.map((fixtureType) => {
    let force, preserved;
    try {
      force = adapter.estimateClampForce(fixtureType, part.geometry, material);
      preserved = adapter.preservedFaces(fixtureType, part.geometry);
    } catch (err) {
      return { fixtureType, score: -Infinity, error: err.message };
    }
    const skillPenalty = SKILL_PENALTY(operatorSkill, fixtureType);
    // Prefer: higher force, fewer preserved faces, no skill penalty
    const score = (force || 0) / 1000 - (preserved?.length || 0) * 0.5 - skillPenalty;
    return { fixtureType, force, preserved, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (best.score === -Infinity || best.error) {
    return {
      fixture_type: null,
      clamp_force_n: 0,
      preserved_faces: [],
      confidence: 0,
      evidence: [`adapter error: ${best.error || "unknown"}`],
    };
  }

  return {
    fixture_type: best.fixtureType,
    clamp_force_n: best.force,
    preserved_faces: best.preserved || [],
    confidence: scored.length > 1 ? 0.90 : 0.75,  // confidence higher when alternatives exist
    evidence: [
      `selected ${best.fixtureType}`,
      `clamp force: ${Math.round(best.force || 0)} N`,
      `${best.preserved?.length || 0} preserved face(s)`,
      `alternatives: ${scored.slice(1, 3).map((s) => s.fixtureType).join(", ") || "none"}`,
    ],
  };
}

function SKILL_PENALTY(skill, fixtureType) {
  // Simple heuristic: complex fixtures penalized for novice operators.
  const complex = ["soft-jaws", "tombstone", "starter-hole", "sub-plate"];
  if (skill === "novice" && complex.includes(fixtureType)) return 1.0;
  return 0;
}

// ---------------------------------------------------------------------------
// REFERENCE ADAPTERS (stubs showing the contract; production wires real eng)
// ---------------------------------------------------------------------------

export const latheFixtureAdapter = Object.freeze({
  domainTag: () => "lathe",
  listFixtureTypes: () => ["3-jaw-chuck", "collet", "between-centers", "faceplate", "steady-rest"],
  isCompatible(type, geom) {
    if (type === "collet" && (geom.od_mm || 0) > 50) return false;
    if (type === "between-centers" && !geom.has_centers) return false;
    return true;
  },
  estimateClampForce(type, geom, material) {
    const base = type === "collet" ? 3000 : type === "3-jaw-chuck" ? 8000 : 5000;
    const hb = material.hardness_hb || 200;
    return base * Math.max(0.5, hb / 200);
  },
  preservedFaces(type, geom) {
    if (type === "3-jaw-chuck") return ["+Z_grip"];
    if (type === "between-centers") return ["both_centers"];
    return [];
  },
});

export const millFixtureAdapter = Object.freeze({
  domainTag: () => "mill",
  listFixtureTypes: () => ["vise", "soft-jaws", "tombstone", "mag-chuck", "vacuum-table"],
  isCompatible(type, geom) {
    if (type === "vise" && (geom.width_mm || 0) > 200) return false;
    if (type === "mag-chuck" && !(geom.ferrous === true)) return false;
    if (type === "vacuum-table" && (geom.flat_area_mm2 || 0) < 1000) return false;
    return true;
  },
  estimateClampForce(type, _geom, _material) {
    return type === "vise" ? 12000 : type === "soft-jaws" ? 8000 : 6000;
  },
  preservedFaces(type, _geom) {
    if (type === "vise") return ["-Y_jaw", "+Y_jaw"];
    if (type === "soft-jaws") return ["custom_contour"];
    return [];
  },
});

export const wedmFixtureAdapter = Object.freeze({
  domainTag: () => "wedm",
  listFixtureTypes: () => ["clamp-skim", "starter-hole", "glue-fix", "sub-plate"],
  isCompatible(type, geom) {
    if (type === "starter-hole" && !geom.is_closed_pocket) return false;
    return true;
  },
  estimateClampForce(type, _geom, _material) {
    // WEDM uses MINIMAL clamping (wire force is low); too much distorts thin parts.
    return type === "glue-fix" ? 200 : 500;
  },
  preservedFaces(type, _geom) {
    if (type === "sub-plate") return ["-Z_glue_face"];
    return [];
  },
});

export { VALID_DOMAINS };
