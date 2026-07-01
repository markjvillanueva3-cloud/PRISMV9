/**
 * PRISM_MACHINES_MASTER_INDEX.js
 * Master Index for All ENHANCED Machine Databases
 * 
 * This file provides a unified interface to all machine databases,
 * organized by manufacturer, country, and machine type.
 * 
 * @version 1.0.0
 * @created 2026-01-20
 * @total_manufacturers 11
 * @total_machines ~86
 */

const PRISM_MACHINES_MASTER_INDEX = {
    
    metadata: {
        version: "1.0.0",
        created: "2026-01-20",
        last_updated: "2026-01-20",
        total_manufacturers: 11,
        total_machines: 86,
        enhancement_level: "LEVEL 4 - Full Kinematics + Collision Ready"
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // MANUFACTURERS BY COUNTRY
    // ═══════════════════════════════════════════════════════════════════════════
    
    by_country: {
        JAPAN: {
            manufacturers: ["Brother", "Mazak", "MHI", "Okuma"],
            files: [
                "PRISM_BROTHER_MACHINE_DATABASE_ENHANCED_v2.js",
                "PRISM_MAZAK_MACHINE_DATABASE_ENHANCED_v2.js",
                "PRISM_MHI_MACHINE_DATABASE_ENHANCED_v2.js",
                "PRISM_OKUMA_MACHINE_DATABASE_ENHANCED_v2.js"
            ],
            machine_count: 38,
            specialties: ["High-speed drill/tap", "Multi-tasking", "Large boring mills", "Lathes & mill-turn"]
        },
        
        GERMANY: {
            manufacturers: ["Chiron", "Hermle"],
            files: [
                "PRISM_CHIRON_MACHINE_DATABASE_ENHANCED_v2.js",
                "PRISM_HERMLE_MACHINE_DATABASE_ENHANCED_v2.js"
            ],
            machine_count: 16,
            specialties: ["High-speed 5-axis", "Precision machining", "Double-spindle"]
        },
        
        USA: {
            manufacturers: ["Cincinnati", "Giddings & Lewis"],
            files: [
                "PRISM_CINCINNATI_MACHINE_DATABASE_ENHANCED_v2.js",
                "PRISM_GIDDINGS_MACHINE_DATABASE_ENHANCED_v2.js"
            ],
            machine_count: 16,
            specialties: ["Large 5-axis profilers", "Horizontal boring mills", "Aerospace"]
        },
        
        TAIWAN: {
            manufacturers: ["AWEA"],
            files: [
                "PRISM_AWEA_MACHINE_DATABASE_ENHANCED_v2.js"
            ],
            machine_count: 10,
            specialties: ["Double-column", "Bridge-type", "Large VMCs"]
        },
        
        ITALY: {
            manufacturers: ["Fidia"],
            files: [
                "PRISM_FIDIA_MACHINE_DATABASE_ENHANCED_v2.js"
            ],
            machine_count: 7,
            specialties: ["High-speed milling", "Aerospace 5-axis", "Die & mold"]
        },
        
        SPAIN: {
            manufacturers: ["Soraluce"],
            files: [
                "PRISM_SORALUCE_MACHINE_DATABASE_ENHANCED_v2.js"
            ],
            machine_count: 7,
            specialties: ["Floor-type boring mills", "Bed-type mills", "Heavy machining"]
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // ALL MANUFACTURERS (Alphabetical)
    // ═══════════════════════════════════════════════════════════════════════════
    
    manufacturers: {
        "AWEA": {
            country: "Taiwan",
            file: "PRISM_AWEA_MACHINE_DATABASE_ENHANCED_v2.js",
            machine_count: 10,
            machine_types: ["double_column", "5_axis_bridge", "vmc", "hmc", "turning", "vtl"],
            specialties: ["Double-column machining centers", "5-axis machines", "Large-format VMCs"]
        },
        "Brother": {
            country: "Japan",
            file: "PRISM_BROTHER_MACHINE_DATABASE_ENHANCED_v2.js",
            machine_count: 11,
            machine_types: ["drill_tap", "vmc", "5_axis_trunnion"],
            specialties: ["High-speed drill/tap centers", "Compact VMCs", "Speed"]
        },
        "Chiron": {
            country: "Germany",
            file: "PRISM_CHIRON_MACHINE_DATABASE_ENHANCED_v2.js",
            machine_count: 9,
            machine_types: ["vmc", "double_spindle", "5_axis_trunnion"],
            specialties: ["High-speed VMCs", "Double-spindle", "5-axis"]
        },
        "Cincinnati": {
            country: "USA",
            file: "PRISM_CINCINNATI_MACHINE_DATABASE_ENHANCED_v2.js",
            machine_count: 8,
            machine_types: ["5_axis_profiler", "large_vmc", "aerospace"],
            specialties: ["Large 5-axis profilers", "Aerospace machining"]
        },
        "Fidia": {
            country: "Italy",
            file: "PRISM_FIDIA_MACHINE_DATABASE_ENHANCED_v2.js",
            machine_count: 7,
            machine_types: ["high_speed_5_axis", "gantry", "die_mold"],
            specialties: ["High-speed milling", "Die & mold", "Aerospace"]
        },
        "Giddings & Lewis": {
            country: "USA",
            file: "PRISM_GIDDINGS_MACHINE_DATABASE_ENHANCED_v2.js",
            machine_count: 8,
            machine_types: ["horizontal_boring", "floor_type", "vtl"],
            specialties: ["Horizontal boring mills", "Floor-type machines", "Heavy machining"]
        },
        "Hermle": {
            country: "Germany",
            file: "PRISM_HERMLE_MACHINE_DATABASE_ENHANCED_v2.js",
            machine_count: 7,
            machine_types: ["5_axis_trunnion", "precision_vmc"],
            specialties: ["Precision 5-axis", "Modified gantry design", "Automation-ready"]
        },
        "Mazak": {
            country: "Japan",
            file: "PRISM_MAZAK_MACHINE_DATABASE_ENHANCED_v2.js",
            machine_count: 12,
            machine_types: ["vmc", "hmc", "5_axis", "multi_tasking", "turning"],
            specialties: ["Full-line manufacturer", "Multi-tasking", "INTEGREX", "VARIAXIS"]
        },
        "MHI": {
            country: "Japan",
            file: "PRISM_MHI_MACHINE_DATABASE_ENHANCED_v2.js",
            machine_count: 10,
            machine_types: ["horizontal_boring", "double_column", "5_axis_gantry"],
            specialties: ["Large horizontal boring mills", "Heavy-duty double-column", "Aerospace"]
        },
        "Okuma": {
            country: "Japan",
            file: "PRISM_OKUMA_MACHINE_DATABASE_ENHANCED_v2.js",
            machine_count: 8,
            machine_types: ["lathe", "vmc", "hmc", "5_axis", "double_column"],
            specialties: ["OSP control", "Thermo-Friendly Concept", "Full-line manufacturer"]
        },
        "Soraluce": {
            country: "Spain",
            file: "PRISM_SORALUCE_MACHINE_DATABASE_ENHANCED_v2.js",
            machine_count: 7,
            machine_types: ["floor_type_boring", "bed_mill", "gantry"],
            specialties: ["Floor-type boring/milling", "Heavy machining", "DAS vibration damping"]
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // MACHINES BY TYPE
    // ═══════════════════════════════════════════════════════════════════════════
    
    by_type: {
        "VMC_3_AXIS": {
            description: "3-Axis Vertical Machining Centers",
            manufacturers: ["Brother", "Chiron", "AWEA", "Mazak", "Okuma"],
            approximate_count: 20
        },
        "VMC_5_AXIS_TRUNNION": {
            description: "5-Axis VMC with Trunnion Table",
            manufacturers: ["Hermle", "Chiron", "Brother", "AWEA", "Mazak"],
            approximate_count: 15
        },
        "HMC": {
            description: "Horizontal Machining Centers",
            manufacturers: ["Mazak", "Okuma", "AWEA"],
            approximate_count: 8
        },
        "HORIZONTAL_BORING": {
            description: "Horizontal Boring Mills",
            manufacturers: ["MHI", "Giddings & Lewis", "Soraluce"],
            approximate_count: 12
        },
        "DOUBLE_COLUMN": {
            description: "Double-Column / Bridge Type",
            manufacturers: ["AWEA", "MHI", "Okuma"],
            approximate_count: 10
        },
        "GANTRY_5_AXIS": {
            description: "Gantry-Type 5-Axis",
            manufacturers: ["Cincinnati", "Fidia", "MHI", "AWEA"],
            approximate_count: 8
        },
        "TURNING": {
            description: "CNC Lathes / Turning Centers",
            manufacturers: ["Okuma", "Mazak", "AWEA"],
            approximate_count: 8
        },
        "MULTI_TASKING": {
            description: "Mill-Turn / Multi-Tasking",
            manufacturers: ["Mazak", "Okuma"],
            approximate_count: 6
        },
        "DOUBLE_SPINDLE": {
            description: "Double-Spindle VMCs",
            manufacturers: ["Chiron"],
            approximate_count: 3
        },
        "HIGH_SPEED_DRILL_TAP": {
            description: "High-Speed Drill/Tap Centers",
            manufacturers: ["Brother"],
            approximate_count: 5
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    getManufacturersByCountry: function(country) {
        const countryData = this.by_country[country.toUpperCase()];
        return countryData ? countryData.manufacturers : [];
    },
    
    getFilesByCountry: function(country) {
        const countryData = this.by_country[country.toUpperCase()];
        return countryData ? countryData.files : [];
    },
    
    getManufacturerInfo: function(name) {
        return this.manufacturers[name] || null;
    },
    
    getManufacturersByType: function(machineType) {
        const typeData = this.by_type[machineType];
        return typeData ? typeData.manufacturers : [];
    },
    
    getAllFiles: function() {
        return Object.values(this.manufacturers).map(m => m.file);
    },
    
    getStatistics: function() {
        return {
            total_manufacturers: Object.keys(this.manufacturers).length,
            total_machines: this.metadata.total_machines,
            countries: Object.keys(this.by_country).length,
            machine_types: Object.keys(this.by_type).length
        };
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PRISM_MACHINES_MASTER_INDEX;
}
if (typeof window !== 'undefined') {
    window.PRISM_MACHINES_MASTER_INDEX = PRISM_MACHINES_MASTER_INDEX;
}

console.log(`[MACHINES_MASTER_INDEX] Loaded: ${PRISM_MACHINES_MASTER_INDEX.metadata.total_manufacturers} manufacturers, ~${PRISM_MACHINES_MASTER_INDEX.metadata.total_machines} machines`);
