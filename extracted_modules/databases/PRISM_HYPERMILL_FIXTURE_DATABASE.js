const PRISM_HYPERMILL_FIXTURE_DATABASE = {
    version: "1.0.0",
    manufacturer: "OPEN MIND",
    vices: {
        centricVises: {
            "Centric_6-200": { type: "Centric Vise", jawWidth: 120, minY: 0, maxY: 200, baseHeight: 50 },
            "Centric_6-300": { type: "Centric Vise", jawWidth: 120, minY: 200, maxY: 300, baseHeight: 50 },
            "Centric_6-500": { type: "Centric Vise", jawWidth: 120, minY: 300, maxY: 500, baseHeight: 50 }
        },
        standardVises: {
            "Standard_4-100": { type: "Standard Vise", jawWidth: 100, maxOpening: 100, baseHeight: 40 },
            "Standard_6-150": { type: "Standard Vise", jawWidth: 150, maxOpening: 150, baseHeight: 50 },
            "Standard_8-200": { type: "Standard Vise", jawWidth: 200, maxOpening: 200, baseHeight: 60 }
        }
    },
    chucks: {
        threeJaw: {
            "3_Jaw_Chuck_20-150": { type: "3-Jaw Chuck", minDia: 20, maxDia: 150, jawStroke: 10 },
            "3_Jaw_Chuck_20-400": { type: "3-Jaw Chuck", minDia: 20, maxDia: 400, jawStroke: 15 },
            "3_Jaw_Chuck_20-600": { type: "3-Jaw Chuck", minDia: 20, maxDia: 600, jawStroke: 20 }
        },
        fourJaw: {
            "4_Jaw_Chuck_10-130": { type: "4-Jaw Independent", minDia: 10, maxDia: 130, jawStroke: 8 }
        },
        colletChucks: {
            "5C_Collet": { type: "5C Collet Chuck", minDia: 1, maxDia: 26.5, colletType: "5C" },
            "16C_Collet": { type: "16C Collet Chuck", minDia: 6, maxDia: 43, colletType: "16C" },
            "3J_Collet": { type: "3J Collet Chuck", minDia: 1, maxDia: 50, colletType: "3J" }
        }
    },
    clamps: {
        stepClamps: {
            sizes: ["080-020", "080-040", "080-080", "120-025", "120-050", "120-080", "120-120"],
            projections: ["06-48", "06-147", "70-112", "120-267"],
            material: "Hardened Steel",
            finish: "Black Oxide"
        },
        simpleClamps: {
            sizes: ["080-020", "080-040", "080-080", "120-025", "120-050", "120-080", "120-120"],
            projections: ["06-48", "70-112"],
            material: "Steel",
            finish: "Zinc Plated"
        },
        toeClamps: {
            sizes: ["Small", "Medium", "Large"],
            application: "Low-profile clamping"
        }
    },
    fixtureSelection: {
        autoSelect: function(partDims) {
            // Returns recommended fixture based on part dimensions
            return {
                primary: this.selectVice(partDims),
                alternative: this.selectChuck(partDims),
                clamps: this.selectClamps(partDims)
            };
        },
        selectVice: function(dims) {
            const maxDim = Math.max(dims.y, dims.x);
            if (maxDim <= 200) return "Centric_6-200";
            if (maxDim <= 300) return "Centric_6-300";
            return "Centric_6-500";
        },
        selectChuck: function(dims) {
            const dia = Math.max(dims.x, dims.y);
            if (dia <= 150) return "3_Jaw_Chuck_20-150";
            if (dia <= 400) return "3_Jaw_Chuck_20-400";
            return "3_Jaw_Chuck_20-600";
        },
        selectClamps: function(dims) {
            const height = dims.z;
            if (height <= 48) return { size: "080-020", projection: "06-48" };
            if (height <= 112) return { size: "080-040", projection: "70-112" };
            return { size: "120-050", projection: "120-267" };
        }
    }
}