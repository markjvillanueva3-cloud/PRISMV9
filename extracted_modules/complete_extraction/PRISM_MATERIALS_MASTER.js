const PRISM_MATERIALS_MASTER = {
    name: 'PRISM Materials Master Database v3.0 - Merged',
    version: '3.0.0', totalMaterials: 0,
    sources: ['MIT 3.22', 'MIT 3.016', 'VDI 3323', 'Callister', 'MachiningDoctor'],
    GROUP_P_STEEL: { name: 'Steel (ISO P)', color: 'Blue', grades: {} },
    GROUP_M_STAINLESS: { name: 'Stainless Steel (ISO M)', color: 'Yellow', grades: {} },
    GROUP_K_CAST_IRON: { name: 'Cast Iron (ISO K)', color: 'Red', grades: {} },
    GROUP_N_NONFERROUS: { name: 'Non-Ferrous (ISO N)', color: 'Green', grades: {} },
    GROUP_S_SUPERALLOYS: { name: 'Superalloys (ISO S)', color: 'Orange', grades: {} },
    GROUP_H_HARDENED: { name: 'Hardened Steel (ISO H)', color: 'Gray', grades: {} }
    ,
    // Flat lookup for fast ID-based access
    byId: {}
}