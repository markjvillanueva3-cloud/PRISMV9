const PRISM_CATALOG_BATCH7_ROUTES = {
    routes: {
        // Kennametal
        'catalog.kennametal.drills.deep': 'PRISM_CATALOG_BATCH7.KENNAMETAL_ROTATING.deepHoleDrills',
        'catalog.kennametal.drills.kentip': 'PRISM_CATALOG_BATCH7.KENNAMETAL_ROTATING.kenTipFS',
        'catalog.kennametal.endmills.harvi': 'PRISM_CATALOG_BATCH7.KENNAMETAL_ROTATING.harviEndMills',
        'catalog.kennametal.taps': 'PRISM_CATALOG_BATCH7.KENNAMETAL_ROTATING.taps',
        
        // EMUGE
        'catalog.emuge.taps': 'PRISM_CATALOG_BATCH7.EMUGE.machineTaps',
        'catalog.emuge.technology': 'PRISM_CATALOG_BATCH7.EMUGE.technologies',
        
        // SGS
        'catalog.sgs.zcarb': 'PRISM_CATALOG_BATCH7.SGS.zCarb',
        'catalog.sgs.vcarb': 'PRISM_CATALOG_BATCH7.SGS.vCarb',
        'catalog.sgs.tcarb': 'PRISM_CATALOG_BATCH7.SGS.tCarb',
        'catalog.sgs.multicarb': 'PRISM_CATALOG_BATCH7.SGS.multiCarb',
        'catalog.sgs.coatings': 'PRISM_CATALOG_BATCH7.SGS.coatings',
        
        // MA Ford
        'catalog.maford.tuffcut': 'PRISM_CATALOG_BATCH7.MA_FORD.tuffCut',
        'catalog.maford.xfo': 'PRISM_CATALOG_BATCH7.MA_FORD.tuffCut.xfoSeries',
        
        // Guhring
        'catalog.guhring.microdrills': 'PRISM_CATALOG_BATCH7.GUHRING.microDrills',
        
        // Haimer
        'catalog.haimer.endmills': 'PRISM_CATALOG_BATCH7.HAIMER.millAluSeries',
        'catalog.haimer.safelock': 'PRISM_CATALOG_BATCH7.HAIMER.safeLock',
        
        // Korloy
        'catalog.korloy.chipbreakers': 'PRISM_CATALOG_BATCH7.KORLOY.chipBreakers',
        'catalog.korloy.grades': 'PRISM_CATALOG_BATCH7.KORLOY.grades',
        'catalog.korloy.inserts': 'PRISM_CATALOG_BATCH7.KORLOY.insertGeometry',
        
        // Ingersoll
        'catalog.ingersoll.endmills': 'PRISM_CATALOG_BATCH7.INGERSOLL.series15J1E',
        'catalog.ingersoll.router': 'PRISM_CATALOG_BATCH7.INGERSOLL.series15X1W',
        'catalog.ingersoll.inserts': 'PRISM_CATALOG_BATCH7.INGERSOLL.inserts',
        
        // Utilities
        'catalog.batch7.find': 'PRISM_CATALOG_BATCH7.utilities.findToolsByDiameter',
        'catalog.batch7.params': 'PRISM_CATALOG_BATCH7.utilities.getCuttingParams',
        'catalog.batch7.grade': 'PRISM_CATALOG_BATCH7.utilities.getInsertGrade'
    },

    registerAll: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            for (const [route, target] of Object.entries(this.routes)) {
                PRISM_GATEWAY.register(route, target);
            }
            console.log(`[CATALOG v7] Registered ${Object.keys(this.routes).length} gateway routes`);
        }
    }
}