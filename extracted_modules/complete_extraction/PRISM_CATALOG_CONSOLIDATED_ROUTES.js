const PRISM_CATALOG_CONSOLIDATED_ROUTES = {
    routes: {
        // Tool Holders
        'catalog.holder.get': 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.utils.getToolHolder',
        'catalog.holder.guhring': 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.toolHolders.guhring',
        'catalog.holder.bigdaishowa': 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.toolHolders.bigDaishowa',
        'catalog.holder.regofix': 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.toolHolders.regofix',
        'catalog.holder.haimer': 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.toolHolders.haimer',
        
        // Workholding
        'catalog.workholding.orangevise': 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.workholding.orangeVise',
        
        // Lathe Tooling
        'catalog.lathe.globalcnc': 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.latheTooling.globalCnc',
        'catalog.lathe.bmt': 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.latheTooling.globalCnc.bmtToolholders',
        'catalog.lathe.vdi': 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.latheTooling.globalCnc.vdiToolholders',
        
        // Cutting Parameters
        'catalog.cutting.get': 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.utils.getCuttingParams',
        'catalog.cutting.osg': 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.cuttingParameters.osg',
        'catalog.cutting.sgs': 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.cuttingParameters.sgs',
        'catalog.cutting.ceratizit': 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.cuttingParameters.ceratizit',
        
        // Insert Grades
        'catalog.grades.kennametal': 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.insertGrades.kennametal',
        'catalog.grades.equivalent': 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.utils.getEquivalentGrade',
        'catalog.grades.crossref': 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.insertGrades.crossReference',
        
        // Spindle Interfaces
        'catalog.spindle.cat': 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.spindleInterfaces.cat',
        'catalog.spindle.bt': 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.spindleInterfaces.bt',
        'catalog.spindle.hsk': 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.spindleInterfaces.hsk',
        
        // ISO Materials
        'catalog.iso.materials': 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.isoMaterials',
        'catalog.iso.classify': 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.utils.getISOClass',
        
        // Collision Utilities
        'catalog.collision.assembly': 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.utils.generateAssemblyEnvelope',
        'catalog.collision.check': 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.utils.pointInEnvelope',
        
        // Statistics
        'catalog.stats': 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.utils.getStats'
    },
    
    registerAll: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            for (const [route, target] of Object.entries(this.routes)) {
                PRISM_GATEWAY.register(route, target);
            }
            console.log(`[CATALOG_CONSOLIDATED] Registered ${Object.keys(this.routes).length} gateway routes`);
        }
    }
}