const PRISM_CATALOG_BATCH8_ROUTES = {
    routes: {
        // Accupro
        'catalog.accupro.formtaps': 'PRISM_CATALOG_BATCH8.ACCUPRO.threadFormingTaps',
        'catalog.accupro.threadmills': 'PRISM_CATALOG_BATCH8.ACCUPRO.threadMills',
        
        // Tungaloy
        'catalog.tungaloy.drills': 'PRISM_CATALOG_BATCH8.TUNGALOY.tungDrill',
        
        // Ceratizit
        'catalog.ceratizit.7flute': 'PRISM_CATALOG_BATCH8.CERATIZIT.IPT7_IPC7',
        'catalog.ceratizit.cuttingdata': 'PRISM_CATALOG_BATCH8.CERATIZIT.IPT7_IPC7.cuttingData',
        
        // Reference data
        'catalog.iso.materials': 'PRISM_CATALOG_BATCH8.ISO_MATERIALS',
        'catalog.grades.crossref': 'PRISM_CATALOG_BATCH8.GRADE_CROSS_REFERENCE',
        
        // Utilities
        'catalog.batch8.equivalent': 'PRISM_CATALOG_BATCH8.utilities.getEquivalentGrade',
        'catalog.batch8.7flute': 'PRISM_CATALOG_BATCH8.utilities.get7FluteCuttingData',
        'catalog.batch8.iso': 'PRISM_CATALOG_BATCH8.utilities.getISOClassification'
    },

    registerAll: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            for (const [route, target] of Object.entries(this.routes)) {
                PRISM_GATEWAY.register(route, target);
            }
            console.log(`[CATALOG v8] Registered ${Object.keys(this.routes).length} gateway routes`);
        }
    }
}