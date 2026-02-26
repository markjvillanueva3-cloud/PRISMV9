const PRISM_SESSION5_GATEWAY_ROUTES = {
    // NURBS
    'cad.nurbs.insertKnot': 'PRISM_NURBS_ENHANCED.insertKnot',
    'cad.nurbs.removeKnot': 'PRISM_NURBS_ENHANCED.removeKnot',
    'cad.nurbs.elevateDegree': 'PRISM_NURBS_ENHANCED.elevateDegree',
    'cad.nurbs.fitCurve': 'PRISM_NURBS_ENHANCED.fitCurve',
    'cad.nurbs.fitSurface': 'PRISM_NURBS_ENHANCED.fitSurface',
    
    // Computational Geometry
    'cad.geometry.voronoi': 'PRISM_COMPUTATIONAL_GEOMETRY.fortuneVoronoi',
    'cad.geometry.delaunay': 'PRISM_COMPUTATIONAL_GEOMETRY.bowyerWatsonDelaunay',
    'cad.geometry.convexHull': 'PRISM_COMPUTATIONAL_GEOMETRY.quickhull',
    'cad.geometry.pointInPolygon': 'PRISM_COMPUTATIONAL_GEOMETRY.pointInPolygon',
    'cad.geometry.offsetPolygon': 'PRISM_COMPUTATIONAL_GEOMETRY.offsetPolygon',
    
    // Mesh Operations
    'cad.mesh.loopSubdivision': 'PRISM_MESH_OPERATIONS.loopSubdivision',
    'cad.mesh.catmullClark': 'PRISM_MESH_OPERATIONS.catmullClarkSubdivision',
    'cad.mesh.laplacianSmooth': 'PRISM_MESH_OPERATIONS.laplacianSmoothing',
    'cad.mesh.qemDecimate': 'PRISM_MESH_OPERATIONS.qemDecimation',
    
    // Feature Recognition
    'cad.feature.detectCylindrical': 'PRISM_FEATURE_RECOGNITION_ENHANCED.detectCylindricalFeatures',
    'cad.feature.detectPockets': 'PRISM_FEATURE_RECOGNITION_ENHANCED.detectPockets',
    'cad.feature.detectSlots': 'PRISM_FEATURE_RECOGNITION_ENHANCED.detectSlots',
    'cad.feature.analyzeAll': 'PRISM_FEATURE_RECOGNITION_ENHANCED.analyzeFeatures',
    
    // CSG Boolean
    'cad.csg.union': 'PRISM_CSG_OPERATIONS.union',
    'cad.csg.intersection': 'PRISM_CSG_OPERATIONS.intersection',
    'cad.csg.subtraction': 'PRISM_CSG_OPERATIONS.subtraction'
}