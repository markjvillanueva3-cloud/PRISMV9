const PRISM_AI_PHYSICS_ENGINE = {

    // CUTTING MECHANICS - Fundamental Physics

    /**
     * Merchant's Circle - Cutting Force Model
     * Source: MIT 2.008 Lecture 5
     */
    merchantCuttingForce: function(params) {
        const {
            Vc,         // Cutting speed (m/min)
            f,          // Feed per tooth (mm)
            ap,         // Depth of cut (mm)
            ae,         // Width of cut (mm)
            Kc1,        // Specific cutting force at 1mm² (N/mm²)
            mc,         // Cutting force exponent (typically 0.25)
            gamma       // Rake angle (radians)
        } = params;

        // Chip thickness
        const h = f * Math.sin(Math.acos(1 - 2 * ae / (2 * 10))); // Simplified

        // Specific cutting force with chip thickness correction
        const Kc = Kc1 * Math.pow(h, -mc);

        // Cutting force
        const Fc = Kc * ap * f;

        // Shear angle from Merchant's theory
        const phi = Math.PI/4 - gamma/2;

        // Thrust force
        const Ft = Fc * Math.tan(phi - gamma);

        // Power
        const Pc = (Fc * Vc) / (60 * 1000); // kW

        return {
            Fc,         // Main cutting force (N)
            Ft,         // Thrust force (N)
            Pc,         // Cutting power (kW)
            Kc,         // Actual specific cutting force
            phi,        // Shear angle (rad)
            shearAngleDeg: phi * 180 / Math.PI
        };
    }