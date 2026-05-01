/**
 * PRISM_TAYLOR_ADVANCED
 * Extracted from PRISM v8.89.002 monolith
 * References: 5
 * Category: physics_models
 * Lines: 43
 * Session: R2.3.3 Algorithm Gap Extraction
 */

const PRISM_TAYLOR_ADVANCED = {
    name: "Extended Taylor Tool Life with Strain Rate",
    mitSource: "MIT 3.22 - Mechanical Behavior of Materials",

    // Extended Taylor: V * T^n * f^a * d^b = C
    computeToolLife: function(V, f, d, params) {
        const { C, n, a, b } = params;
        // T = (C / (V * f^a * d^b))^(1/n)
        const T = Math.pow(C / (V * Math.pow(f, a) * Math.pow(d, b)), 1/n);
        return Math.max(0, T);
    },
    // Optimal cutting speed for target tool life
    optimizeSpeed: function(targetLife, f, d, params) {
        const { C, n, a, b } = params;
        // V = C / (T^n * f^a * d^b)
        return C / (Math.pow(targetLife, n) * Math.pow(f, a) * Math.pow(d, b));
    },
    // Johnson-Cook flow stress model
    johnsonCook: function(strain, strainRate, temp, params) {
        const { A, B, n, C, m, eps_dot_0, T_melt, T_room } = params;

        // σ = [A + B*ε^n] * [1 + C*ln(ε̇/ε̇₀)] * [1 - T*^m]
        const term1 = A + B * Math.pow(Math.max(strain, 0.001), n);
        const term2 = 1 + C * Math.log(Math.max(strainRate / eps_dot_0, 1));
        const T_star = Math.max(0, Math.min(1, (temp - T_room) / (T_melt - T_room)));
        const term3 = 1 - Math.pow(T_star, m);

        return term1 * term2 * term3;
    },
    // Specific cutting energy (Kc)
    specificCuttingEnergy: function(Kc1_1, h, mc) {
        // Kc = Kc1.1 / h^mc
        return Kc1_1 / Math.pow(Math.max(h, 0.01), mc);
    },
    // Material parameters database
    materials: {
        '1018': { A: 350, B: 275, n: 0.36, C: 0.022, m: 1.0, eps_dot_0: 1.0, T_melt: 1811, T_room: 293 },
        '4340': { A: 792, B: 510, n: 0.26, C: 0.014, m: 1.03, eps_dot_0: 1.0, T_melt: 1793, T_room: 293 },
        'Ti6Al4V': { A: 862, B: 331, n: 0.34, C: 0.012, m: 0.8, eps_dot_0: 1.0, T_melt: 1878, T_room: 293 },
        '2024_T3': { A: 265, B: 426, n: 0.34, C: 0.015, m: 1.0, eps_dot_0: 1.0, T_melt: 775, T_room: 293 },
        'Inconel_718': { A: 1241, B: 622, n: 0.65, C: 0.0134, m: 1.3, eps_dot_0: 1.0, T_melt: 1609, T_room: 293 }
    }
}