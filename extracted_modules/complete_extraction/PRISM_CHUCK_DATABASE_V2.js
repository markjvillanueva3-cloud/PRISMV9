const PRISM_CHUCK_DATABASE_V2 = {

    // 3-JAW SCROLL CHUCKS
    "3-jaw_scroll": {
        "6-inch_3-jaw": {
            type: "3-jaw_scroll", size: 152.4, maxGripForce: 35000, maxRPM: 6000,
            jawStroke: 6.35, centrifugalForceLoss: 0.002, grippingSurface: "serrated",
            repeatability: 0.025, clampingEfficiency: 0.85, deformationFactor: 0.0001
        },
        "8-inch_3-jaw": {
            type: "3-jaw_scroll", size: 203.2, maxGripForce: 55000, maxRPM: 5000,
            jawStroke: 8.5, centrifugalForceLoss: 0.0025, grippingSurface: "serrated",
            repeatability: 0.030, clampingEfficiency: 0.85, deformationFactor: 0.00008
        },
        "10-inch_3-jaw": {
            type: "3-jaw_scroll", size: 254, maxGripForce: 80000, maxRPM: 4000,
            jawStroke: 10, centrifugalForceLoss: 0.003, grippingSurface: "serrated",
            repeatability: 0.035, clampingEfficiency: 0.85, deformationFactor: 0.00006
        },
        "12-inch_3-jaw": {
            type: "3-jaw_scroll", size: 304.8, maxGripForce: 110000, maxRPM: 3500,
            jawStroke: 12, centrifugalForceLoss: 0.0035, grippingSurface: "serrated",
            repeatability: 0.040, clampingEfficiency: 0.85, deformationFactor: 0.00005
        },
        "15-inch_3-jaw": {
            type: "3-jaw_scroll", size: 381, maxGripForce: 150000, maxRPM: 3000,
            jawStroke: 15, centrifugalForceLoss: 0.004, grippingSurface: "serrated",
            repeatability: 0.050, clampingEfficiency: 0.85, deformationFactor: 0.00004
        }
    },
    // 6-JAW SCROLL CHUCKS (Better for thin-wall)
    "6-jaw_scroll": {
        "8-inch_6-jaw": {
            type: "6-jaw_scroll", size: 203.2, maxGripForce: 45000, maxRPM: 4500,
            jawStroke: 6, centrifugalForceLoss: 0.002, grippingSurface: "serrated",
            repeatability: 0.020, clampingEfficiency: 0.90, deformationFactor: 0.00004,
            thinWallCapable: true
        },
        "10-inch_6-jaw": {
            type: "6-jaw_scroll", size: 254, maxGripForce: 65000, maxRPM: 3800,
            jawStroke: 8, centrifugalForceLoss: 0.0025, grippingSurface: "serrated",
            repeatability: 0.025, clampingEfficiency: 0.90, deformationFactor: 0.00003,
            thinWallCapable: true
        }
    },
    // COLLET CHUCKS
    "collet": {
        "5C_collet": {
            type: "collet", size: 28.6, maxGripForce: 22000, maxRPM: 8000,
            grippingRange: 1.0, centrifugalForceLoss: 0.001, grippingSurface: "smooth",
            repeatability: 0.005, clampingEfficiency: 0.95, deformationFactor: 0.00002,
            concentricity: 0.0025
        },
        "16C_collet": {
            type: "collet", size: 38.1, maxGripForce: 28000, maxRPM: 7000,
            grippingRange: 1.5, centrifugalForceLoss: 0.0012, grippingSurface: "smooth",
            repeatability: 0.008, clampingEfficiency: 0.95, deformationFactor: 0.000025,
            concentricity: 0.003
        },
        "3J_collet": {
            type: "collet", size: 44.5, maxGripForce: 32000, maxRPM: 6500,
            grippingRange: 1.5, centrifugalForceLoss: 0.0015, grippingSurface: "smooth",
            repeatability: 0.008, clampingEfficiency: 0.95, deformationFactor: 0.00003,
            concentricity: 0.003
        }
    },
    // SOFT JAWS
    "soft_jaws": {
        "aluminum_soft_jaws": {
            type: "soft_jaws", material: "6061-T6_aluminum", grippingIncrease: 1.5,
            clampingEfficiency: 0.92, deformationFactor: 0.00008, repeatability: 0.010,
            maxGripPressure: 200, recommendedFor: ["thin_wall", "finished_surfaces", "soft_materials"]
        },
        "steel_soft_jaws": {
            type: "soft_jaws", material: "1018_steel", grippingIncrease: 1.4,
            clampingEfficiency: 0.90, deformationFactor: 0.00005, repeatability: 0.008,
            maxGripPressure: 400, recommendedFor: ["heavy_cuts", "hard_materials"]
        }
    }
}