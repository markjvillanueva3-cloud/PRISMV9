/**
 * ResidualStressPredictionEngine — Machining-induced residual stress prediction
 *
 * Models:
 *   1. Hertzian contact mechanical stress (σ_mech)
 *   2. Thermal residual stress from cutting temperature gradients
 *   3. Combined mechanical + thermal depth profile (hook shape)
 *   4. Burnishing / severe plastic deformation from flank wear
 *   5. Phase transformation stress (austenite → martensite)
 *   6. Relaxation / fatigue life impact (Goodman correction)
 *   7. Process parameter sensitivity analysis
 *
 * References:
 *   - Johnson (1985) Contact Mechanics
 *   - Carslaw & Jaeger (1959) Heat Conduction in Solids
 *   - Brinksmeier et al. (1982) Residual Stresses in Machining
 *   - Jacobus et al. (2000) Machining-Induced Residual Stress
 *   - Sasahara (2005) Effect of Residual Stress on Fatigue Life
 *   - Goodman (1899) Mechanics Applied to Engineering
 */
import { log } from "../utils/Logger.js";
// ─── Constants ──────────────────────────────────────────────────────
const PI = Math.PI;
/**
 * Complementary error function (erfc) approximation.
 * Abramowitz & Stegun 7.1.26, max error 1.5e-7.
 */
function erfc(x) {
    if (x < 0)
        return 2 - erfc(-x);
    const t = 1 / (1 + 0.3275911 * x);
    const poly = t *
        (0.254829592 +
            t *
                (-0.284496736 +
                    t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
    return poly * Math.exp(-x * x);
}
/** Built-in material database. */
const MATERIAL_DB = {
    "AISI 4340": {
        name: "AISI 4340",
        E_GPa: 205,
        nu: 0.29,
        alpha: 11.2e-6,
        kappa: 11.9e-6,
        sigma_y_MPa: 860,
        sigma_UTS_MPa: 1080,
        hardness_HV: 350,
        rho: 7850,
        cp: 475,
        phase_transform_applicable: true,
    },
    "Ti-6Al-4V": {
        name: "Ti-6Al-4V",
        E_GPa: 113.8,
        nu: 0.342,
        alpha: 8.6e-6,
        kappa: 2.9e-6,
        sigma_y_MPa: 880,
        sigma_UTS_MPa: 950,
        hardness_HV: 349,
        rho: 4430,
        cp: 526,
        phase_transform_applicable: false,
    },
    IN718: {
        name: "IN718",
        E_GPa: 205,
        nu: 0.3,
        alpha: 13.0e-6,
        kappa: 3.19e-6,
        sigma_y_MPa: 1035,
        sigma_UTS_MPa: 1240,
        hardness_HV: 400,
        rho: 8190,
        cp: 435,
        phase_transform_applicable: false,
    },
    "AISI 316L": {
        name: "AISI 316L",
        E_GPa: 193,
        nu: 0.3,
        alpha: 16.0e-6,
        kappa: 3.95e-6,
        sigma_y_MPa: 290,
        sigma_UTS_MPa: 580,
        hardness_HV: 217,
        rho: 8000,
        cp: 500,
        phase_transform_applicable: false,
    },
    "Al7075-T6": {
        name: "Al7075-T6",
        E_GPa: 71.7,
        nu: 0.33,
        alpha: 23.6e-6,
        kappa: 56.0e-6,
        sigma_y_MPa: 503,
        sigma_UTS_MPa: 572,
        hardness_HV: 175,
        rho: 2810,
        cp: 960,
        phase_transform_applicable: false,
    },
    "AISI 52100": {
        name: "AISI 52100",
        E_GPa: 210,
        nu: 0.3,
        alpha: 11.5e-6,
        kappa: 12.0e-6,
        sigma_y_MPa: 1500,
        sigma_UTS_MPa: 2000,
        hardness_HV: 700,
        rho: 7810,
        cp: 475,
        phase_transform_applicable: true,
    },
};
// ─── Engine ─────────────────────────────────────────────────────────
/**
 * Resolves a material from a key string or a custom material object.
 * @param mat - Material key or custom material
 * @returns Resolved material properties
 */
function resolveMaterial(mat) {
    if (typeof mat === "string") {
        const m = MATERIAL_DB[mat];
        if (!m) {
            throw new Error(`Unknown material: "${mat}". Available: ${Object.keys(MATERIAL_DB).join(", ")}`);
        }
        return m;
    }
    return mat;
}
/**
 * ResidualStressPredictionEngine — predicts machining-induced residual stress
 * depth profiles using Hertzian contact mechanics, thermal diffusion,
 * burnishing, phase transformation, and Goodman fatigue correction.
 */
class ResidualStressPredictionEngine {
    id = "ResidualStressPredictionEngine";
    version = "1.0.0";
    /** Return available material keys. */
    listMaterials() {
        return Object.keys(MATERIAL_DB);
    }
    /** Get material properties by key. */
    getMaterial(key) {
        return resolveMaterial(key);
    }
    // ── 1. Hertzian Mechanical Stress ────────────────────────────────
    /**
     * Compute Hertzia