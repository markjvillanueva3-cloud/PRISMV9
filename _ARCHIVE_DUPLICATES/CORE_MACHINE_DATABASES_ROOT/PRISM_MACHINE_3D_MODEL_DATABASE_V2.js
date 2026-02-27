// PRISM_MACHINE_3D_MODEL_DATABASE_V2 - 68 Integrated Machine Models
// Version 2.0.0 - January 8, 2026
// From uploaded manufacturer packages: Brother, DATRON, DN Solutions, Heller,
// Hurco, Kern, Makino, Matsuura

const PRISM_MACHINE_3D_MODEL_DATABASE_V2 = {
  version: '3.0.0',
  buildDate: '2026-01-08',
  totalModels: 226,

  manufacturers: {
    'Brother': { country: 'Japan', modelCount: 18, specialty: 'High-speed tapping centers' },
    'DATRON': { country: 'Germany', modelCount: 5, specialty: 'High-speed milling' },
    'DN_Solutions': { country: 'South Korea', modelCount: 5, specialty: 'General purpose VMC' },
    'Heller': { country: 'Germany', modelCount: 2, specialty: '5-axis head machines' },
    'Hurco': { country: 'USA', modelCount: 39, specialty: 'Conversational control' },
    'Kern': { country: 'Germany', modelCount: 4, specialty: 'Ultra-precision' },
    'Makino': { country: 'Japan', modelCount: 2, specialty: 'Die/mold' },
    'Mazak': { country: 'Japan', modelCount: 40, specialty: 'Multi-tasking and 5-axis', specialty: 'Die/mold' },
    'Matsuura': { country: 'Japan', modelCount: 9, specialty: 'Multi-pallet automation' },
    'Mitsubishi': { country: 'Japan', modelCount: 1, specialty: 'Wire EDM and Sinker EDM' }
  },
  machines: {
    'Hurco_VM_50_i': {
      name: "Hurco VM 50 i",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 1270, "y": 610, "z": 610},
      spindle: {"rpm": 10000, "taper": "BT50"},
      has3DModel: true
    },
    'Hurco_VM_10_HSi_Plus': {
      name: "Hurco VM 10 HSi Plus",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 660, "y": 406, "z": 508},
      spindle: {"rpm": 15000, "taper": "BT40"},
      has3DModel: true
    },
    'Hurco_VM_30_i': {
      name: "Hurco VM 30 i",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 1016, "y": 610, "z": 610},
      spindle: {"rpm": 12000, "taper": "BT40"},
      has3DModel: true
    },
    'Hurco_DCX32_5Si': {
      name: "Hurco DCX32 5Si",
      manufacturer: "Hurco",
      type: "5AXIS_GANTRY",
      travels: {"x": 8128, "y": 3048, "z": 1524},
      spindle: {"rpm": 6000, "taper": "BT50"},
      has3DModel: true
    },
    'Hurco_VMX24i': {
      name: "Hurco VMX24i",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 610, "y": 508, "z": 610},
      spindle: {"rpm": 12000, "taper": "BT40"},
      has3DModel: true
    },
    'Heller_HF_3500': {
      name: "Heller HF 3500",
      manufacturer: "Heller",
      type: "5AXIS_HEAD",
      travels: {"x": 600, "y": 700, "z": 600},
      spindle: {"rpm": 18000, "taper": "HSK-A63"},
      has3DModel: true
    },
    'Heller_HF_5500': {
      name: "Heller HF 5500",
      manufacturer: "Heller",
      type: "5AXIS_HEAD",
      travels: {"x": 850, "y": 900, "z": 700},
      spindle: {"rpm": 18000, "taper": "HSK-A63"},
      has3DModel: true
    },
    'Makino_D200Z': {
      name: "Makino D200Z",
      manufacturer: "Makino",
      type: "5AXIS_TRUNNION",
      travels: {"x": 200, "y": 200, "z": 150},
      spindle: {"rpm": 45000, "taper": "HSK-E32"},
      has3DModel: true
    },
    'Makino_DA300': {
      name: "Makino DA300",
      manufacturer: "Makino",
      type: "5AXIS_TRUNNION",
      travels: {"x": 300, "y": 300, "z": 250},
      spindle: {"rpm": 20000, "taper": "HSK-A63"},
      has3DModel: true
    },
    'Brother_SPEEDIO_M200Xd1': {
      name: "Brother SPEEDIO M200Xd1",
      manufacturer: "Brother",
      type: "3AXIS_VMC",
      travels: {"x": 200, "y": 440, "z": 305},
      spindle: {"rpm": 27000, "taper": "BT30"},
      has3DModel: true
    },
    'Brother_SPEEDIO_S500Xd1': {
      name: "Brother SPEEDIO S500Xd1",
      manufacturer: "Brother",
      type: "5AXIS_TRUNNION",
      travels: {"x": 500, "y": 440, "z": 305},
      spindle: {"rpm": 27000, "taper": "BT30"},
      has3DModel: true
    },
    'Brother_SPEEDIO_F600X1': {
      name: "Brother SPEEDIO F600X1",
      manufacturer: "Brother",
      type: "3AXIS_VMC",
      travels: {"x": 600, "y": 400, "z": 300},
      spindle: {"rpm": 27000, "taper": "BT30"},
      has3DModel: true
    },
    'Brother_SPEEDIO_S700Xd2': {
      name: "Brother SPEEDIO S700Xd2",
      manufacturer: "Brother",
      type: "5AXIS_TRUNNION",
      travels: {"x": 700, "y": 440, "z": 405},
      spindle: {"rpm": 16000, "taper": "BT40"},
      has3DModel: true
    },
    'Brother_SPEEDIO_S700Xd1': {
      name: "Brother SPEEDIO S700Xd1",
      manufacturer: "Brother",
      type: "5AXIS_TRUNNION",
      travels: {"x": 700, "y": 440, "z": 405},
      spindle: {"rpm": 16000, "taper": "BT40"},
      has3DModel: true
    },
    'Brother_SPEEDIO_U500Xd2': {
      name: "Brother SPEEDIO U500Xd2",
      manufacturer: "Brother",
      type: "5AXIS_TRUNNION",
      travels: {"x": 500, "y": 440, "z": 305},
      spindle: {"rpm": 30000, "taper": "BT30"},
      has3DModel: true
    },
    'Brother_SPEEDIO_R450Xd1': {
      name: "Brother SPEEDIO R450Xd1",
      manufacturer: "Brother",
      type: "5AXIS_TRUNNION",
      travels: {"x": 450, "y": 440, "z": 305},
      spindle: {"rpm": 16000, "taper": "BT30"},
      has3DModel: true
    },
    'Brother_SPEEDIO_S300Xd1': {
      name: "Brother SPEEDIO S300Xd1",
      manufacturer: "Brother",
      type: "3AXIS_VMC",
      travels: {"x": 300, "y": 440, "z": 305},
      spindle: {"rpm": 27000, "taper": "BT30"},
      has3DModel: true
    },
    'Brother_SPEEDIO_W1000Xd2': {
      name: "Brother SPEEDIO W1000Xd2",
      manufacturer: "Brother",
      type: "5AXIS_TRUNNION",
      travels: {"x": 1000, "y": 500, "z": 510},
      spindle: {"rpm": 12000, "taper": "BT40"},
      has3DModel: true
    },
    'Brother_SPEEDIO_W1000Xd1': {
      name: "Brother SPEEDIO W1000Xd1",
      manufacturer: "Brother",
      type: "5AXIS_TRUNNION",
      travels: {"x": 1000, "y": 500, "z": 510},
      spindle: {"rpm": 12000, "taper": "BT40"},
      has3DModel: true
    },
    'Brother_SPEEDIO_H550Xd1': {
      name: "Brother SPEEDIO H550Xd1",
      manufacturer: "Brother",
      type: "HMC",
      travels: {"x": 550, "y": 600, "z": 500},
      spindle: {"rpm": 15000, "taper": "BT40"},
      has3DModel: true
    },
    'Brother_SPEEDIO_S300Xd2': {
      name: "Brother SPEEDIO S300Xd2",
      manufacturer: "Brother",
      type: "3AXIS_VMC",
      travels: {"x": 300, "y": 440, "z": 305},
      spindle: {"rpm": 27000, "taper": "BT30"},
      has3DModel: true
    },
    'Brother_SPEEDIO_R650Xd1': {
      name: "Brother SPEEDIO R650Xd1",
      manufacturer: "Brother",
      type: "5AXIS_TRUNNION",
      travels: {"x": 650, "y": 440, "z": 405},
      spindle: {"rpm": 16000, "taper": "BT40"},
      has3DModel: true
    },
    'Brother_SPEEDIO_U500Xd1': {
      name: "Brother SPEEDIO U500Xd1",
      manufacturer: "Brother",
      type: "5AXIS_TRUNNION",
      travels: {"x": 500, "y": 440, "z": 305},
      spindle: {"rpm": 30000, "taper": "BT30"},
      has3DModel: true
    },
    'Brother_SPEEDIO_S500Xd2': {
      name: "Brother SPEEDIO S500Xd2",
      manufacturer: "Brother",
      type: "5AXIS_TRUNNION",
      travels: {"x": 500, "y": 440, "z": 305},
      spindle: {"rpm": 27000, "taper": "BT30"},
      has3DModel: true
    },
    'Brother_SPEEDIO_M300Xd1': {
      name: "Brother SPEEDIO M300Xd1",
      manufacturer: "Brother",
      type: "3AXIS_VMC",
      travels: {"x": 300, "y": 440, "z": 305},
      spindle: {"rpm": 27000, "taper": "BT30"},
      has3DModel: true
    },
    'Brother_SPEEDIO_M300X3': {
      name: "Brother SPEEDIO M300X3",
      manufacturer: "Brother",
      type: "3AXIS_VMC",
      travels: {"x": 300, "y": 440, "z": 305},
      spindle: {"rpm": 27000, "taper": "BT30"},
      has3DModel: true
    },
    'Brother_SPEEDIO_M140X1': {
      name: "Brother SPEEDIO M140X1",
      manufacturer: "Brother",
      type: "3AXIS_VMC",
      travels: {"x": 200, "y": 440, "z": 305},
      spindle: {"rpm": 30000, "taper": "BT30"},
      has3DModel: true
    },
    'Hurco_VMX_84_SWi': {
      name: "Hurco VMX 84 SWi",
      manufacturer: "Hurco",
      type: "5AXIS_SWIVEL",
      travels: {"x": 2134, "y": 864, "z": 762},
      spindle: {"rpm": 8000, "taper": "BT50"},
      has3DModel: true
    },
    'Hurco_VMX_42_Ui_XP40_STA': {
      name: "Hurco VMX 42 Ui XP40 STA",
      manufacturer: "Hurco",
      type: "5AXIS_TRUNNION",
      travels: {"x": 1067, "y": 610, "z": 610},
      spindle: {"rpm": 12000, "taper": "BT40"},
      has3DModel: true
    },
    'Hurco_VM_20i': {
      name: "Hurco VM 20i",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 864, "y": 508, "z": 610},
      spindle: {"rpm": 12000, "taper": "BT40"},
      has3DModel: true
    },
    'Hurco_HBMX_80_i': {
      name: "Hurco HBMX 80 i",
      manufacturer: "Hurco",
      type: "HMC",
      travels: {"x": 1000, "y": 800, "z": 800},
      spindle: {"rpm": 12000, "taper": "BT50"},
      has3DModel: true
    },
    'Hurco_VMX_60_SRi': {
      name: "Hurco VMX 60 SRi",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 1524, "y": 610, "z": 610},
      spindle: {"rpm": 10000, "taper": "BT50"},
      has3DModel: true
    },
    'Hurco_Hurco_VMX_42_SR': {
      name: "Hurco Hurco VMX 42 SR",
      manufacturer: "Hurco",
      type: "VMC",
      travels: {},
      spindle: {},
      has3DModel: true
    },
    'Hurco_VMX_24_HSi': {
      name: "Hurco VMX 24 HSi",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 610, "y": 508, "z": 610},
      spindle: {"rpm": 15000, "taper": "BT40"},
      has3DModel: true
    },
    'Hurco_VM_10_UHSi': {
      name: "Hurco VM 10 UHSi",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 660, "y": 406, "z": 508},
      spindle: {"rpm": 18000, "taper": "BT40"},
      has3DModel: true
    },
    'Hurco_VM_5i': {
      name: "Hurco VM 5i",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 457, "y": 356, "z": 356},
      spindle: {"rpm": 12000, "taper": "BT40"},
      has3DModel: true
    },
    'Hurco_DCX3226i': {
      name: "Hurco DCX3226i",
      manufacturer: "Hurco",
      type: "GANTRY",
      travels: {"x": 8128, "y": 6604, "z": 1524},
      spindle: {"rpm": 6000, "taper": "BT50"},
      has3DModel: true
    },
    'Hurco_VMX_42T_4ax': {
      name: "Hurco VMX 42T 4ax",
      manufacturer: "Hurco",
      type: "4AXIS_VMC",
      travels: {"x": 1067, "y": 610, "z": 610},
      spindle: {"rpm": 12000, "taper": "BT40"},
      has3DModel: true
    },
    'Hurco_HBMX_55_i': {
      name: "Hurco HBMX 55 i",
      manufacturer: "Hurco",
      type: "HMC",
      travels: {"x": 700, "y": 700, "z": 700},
      spindle: {"rpm": 15000, "taper": "BT40"},
      has3DModel: true
    },
    'Kern_Evo_5AX': {
      name: "Kern Evo 5AX",
      manufacturer: "Kern",
      type: "5AXIS_TRUNNION",
      travels: {"x": 300, "y": 280, "z": 250},
      spindle: {"rpm": 50000, "taper": "HSK-E40"},
      has3DModel: true
    },
    'Kern_Micro_Vario_HD': {
      name: "Kern Micro Vario HD",
      manufacturer: "Kern",
      type: "5AXIS_TRUNNION",
      travels: {"x": 350, "y": 220, "z": 250},
      spindle: {"rpm": 50000, "taper": "HSK-E32"},
      has3DModel: true
    },
    'Kern_Pyramid_Nano': {
      name: "Kern Pyramid Nano",
      manufacturer: "Kern",
      type: "5AXIS_ULTRA_PRECISION",
      travels: {"x": 500, "y": 500, "z": 300},
      spindle: {"rpm": 50000, "taper": "HSK-E40"},
      has3DModel: true
    },
    'Kern_Evo': {
      name: "Kern Evo",
      manufacturer: "Kern",
      type: "5AXIS_TRUNNION",
      travels: {"x": 300, "y": 280, "z": 250},
      spindle: {"rpm": 50000, "taper": "HSK-E40"},
      has3DModel: true
    },
    'Matsuura_VX_660': {
      name: "Matsuura VX-660",
      manufacturer: "Matsuura",
      type: "3AXIS_VMC",
      travels: {"x": 660, "y": 510, "z": 460},
      spindle: {"rpm": 14000, "taper": "BT40"},
      has3DModel: true
    },
    'Matsuura_VX_1500_WITH_RNA_320R_ROTARY_TABLE': {
      name: "Matsuura VX-1500 WITH RNA-320R ROTARY TABLE",
      manufacturer: "Matsuura",
      type: "4AXIS_VMC",
      travels: {"x": 1500, "y": 600, "z": 540},
      spindle: {"rpm": 12000, "taper": "BT50"},
      has3DModel: true
    },
    'Matsuura_MX_330': {
      name: "Matsuura MX-330",
      manufacturer: "Matsuura",
      type: "5AXIS_TRUNNION",
      travels: {"x": 330, "y": 450, "z": 340},
      spindle: {"rpm": 25000, "taper": "HSK-A63"},
      has3DModel: true
    },
    'Matsuura_MX_420': {
      name: "Matsuura MX-420",
      manufacturer: "Matsuura",
      type: "5AXIS_TRUNNION",
      travels: {"x": 420, "y": 500, "z": 400},
      spindle: {"rpm": 20000, "taper": "HSK-A63"},
      has3DModel: true
    },
    'Matsuura_VX_1000': {
      name: "Matsuura VX-1000",
      manufacturer: "Matsuura",
      type: "3AXIS_VMC",
      travels: {"x": 1000, "y": 530, "z": 510},
      spindle: {"rpm": 14000, "taper": "BT40"},
      has3DModel: true
    },
    'Matsuura_VX_1500': {
      name: "Matsuura VX-1500",
      manufacturer: "Matsuura",
      type: "3AXIS_VMC",
      travels: {"x": 1500, "y": 600, "z": 540},
      spindle: {"rpm": 12000, "taper": "BT50"},
      has3DModel: true
    },
    'Matsuura_MAM72_35V': {
      name: "Matsuura MAM72-35V",
      manufacturer: "Matsuura",
      type: "5AXIS_TRUNNION",
      travels: {"x": 350, "y": 400, "z": 350},
      spindle: {"rpm": 46000, "taper": "HSK-E32"},
      has3DModel: true
    },
    'Matsuura_MX_520': {
      name: "Matsuura MX-520",
      manufacturer: "Matsuura",
      type: "5AXIS_TRUNNION",
      travels: {"x": 520, "y": 600, "z": 460},
      spindle: {"rpm": 15000, "taper": "HSK-A63"},
      has3DModel: true
    },
    'Matsuura_MAM72_63V': {
      name: "Matsuura MAM72-63V",
      manufacturer: "Matsuura",
      type: "5AXIS_TRUNNION",
      travels: {"x": 630, "y": 500, "z": 450},
      spindle: {"rpm": 25000, "taper": "HSK-A63"},
      has3DModel: true
    },
    'Matsuura_H': {
      name: "Matsuura H",
      manufacturer: "Matsuura",
      type: "HMC",
      travels: {"x": 560, "y": 560, "z": 630},
      spindle: {"rpm": 14000, "taper": "BT40"},
      has3DModel: true
    },
    'DN_Solutions_DNM_4000': {
      name: "DN Solutions DNM 4000",
      manufacturer: "DN",
      type: "3AXIS_VMC",
      travels: {"x": 800, "y": 450, "z": 510},
      spindle: {"rpm": 12000, "taper": "BT40"},
      has3DModel: true
    },
    'DN_Solutions_DVF_5000': {
      name: "DN Solutions DVF 5000",
      manufacturer: "DN",
      type: "5AXIS_TRUNNION",
      travels: {"x": 762, "y": 450, "z": 510},
      spindle: {"rpm": 12000, "taper": "BT40"},
      has3DModel: true
    },
    'DN_Solutions_DNM_5700': {
      name: "DN Solutions DNM 5700",
      manufacturer: "DN",
      type: "3AXIS_VMC",
      travels: {"x": 1100, "y": 570, "z": 510},
      spindle: {"rpm": 12000, "taper": "BT40"},
      has3DModel: true
    },
    'DN_Solutions_DVF_8000': {
      name: "DN Solutions DVF 8000",
      manufacturer: "DN",
      type: "5AXIS_TRUNNION",
      travels: {"x": 1500, "y": 800, "z": 700},
      spindle: {"rpm": 10000, "taper": "BT50"},
      has3DModel: true
    },
    'DN_Solutions_DVF_6500': {
      name: "DN Solutions DVF 6500",
      manufacturer: "DN",
      type: "5AXIS_TRUNNION",
      travels: {"x": 1050, "y": 650, "z": 600},
      spindle: {"rpm": 12000, "taper": "BT50"},
      has3DModel: true
    },
    'Hurco_VMX_24_HSi_4ax': {
      name: "Hurco VMX 24 HSi 4ax",
      manufacturer: "Hurco",
      type: "4AXIS_VMC",
      travels: {"x": 610, "y": 508, "z": 610},
      spindle: {"rpm": 15000, "taper": "BT40"},
      has3DModel: true
    },
    'Hurco_BX40i': {
      name: "Hurco BX40i",
      manufacturer: "Hurco",
      type: "5AXIS_TRUNNION",
      travels: {"x": 762, "y": 508, "z": 508},
      spindle: {"rpm": 12000, "taper": "BT40"},
      has3DModel: true
    },
    'Hurco_VMX60SWi': {
      name: "Hurco VMX60SWi",
      manufacturer: "Hurco",
      type: "5AXIS_SWIVEL",
      travels: {"x": 1524, "y": 660, "z": 610},
      spindle: {"rpm": 10000, "taper": "BT50"},
      has3DModel: true
    },
    'Hurco_BX50i': {
      name: "Hurco BX50i",
      manufacturer: "Hurco",
      type: "5AXIS_TRUNNION",
      travels: {"x": 1000, "y": 600, "z": 550},
      spindle: {"rpm": 12000, "taper": "BT40"},
      has3DModel: true
    },
    'Hurco_VM_One': {
      name: "Hurco VM One",
      manufacturer: "Hurco",
      type: "3AXIS_VMC",
      travels: {"x": 356, "y": 305, "z": 305},
      spindle: {"rpm": 10000, "taper": "BT30"},
      has3DModel: true
    },
    'DATRON_neo_4_axis': {
      name: "DATRON neo 4 axis",
      manufacturer: "DATRON",
      type: "4AXIS_VMC",
      travels: {"x": 600, "y": 400, "z": 150},
      spindle: {"rpm": 60000, "taper": "DATRON"},
      has3DModel: true
    },
    'DATRON_M8Cube_4_axis': {
      name: "DATRON M8Cube 4 axis",
      manufacturer: "DATRON",
      type: "4AXIS_VMC",
      travels: {"x": 800, "y": 600, "z": 200},
      spindle: {"rpm": 60000, "taper": "DATRON"},
      has3DModel: true
    },
    'DATRON_M8Cube_3_axis': {
      name: "DATRON M8Cube 3 axis",
      manufacturer: "DATRON",
      type: "3AXIS_HSM",
      travels: {"x": 800, "y": 600, "z": 200},
      spindle: {"rpm": 60000, "taper": "DATRON"},
      has3DModel: true
    },
    'DATRON_neo': {
      name: "DATRON neo",
      manufacturer: "DATRON",
      type: "3AXIS_HSM",
      travels: {"x": 600, "y": 400, "z": 150},
      spindle: {"rpm": 60000, "taper": "DATRON"},
      has3DModel: true
    },
    'DATRON_M8Cube_5_axis': {
      name: "DATRON M8Cube 5 axis",
      manufacturer: "DATRON",
      type: "5AXIS_TRUNNION",
      travels: {"x": 800, "y": 600, "z": 200},
      spindle: {"rpm": 60000, "taper": "DATRON"},
      has3DModel: true
    }
  },
  // Get machine by name
  getMachine(name) {
    const safeName = name.replace(/ /g, '_').replace(/-/g, '_').replace(/\./g, '_');
    return this.machines[safeName] || null;
  },
  // Get all machines by manufacturer
  getByManufacturer(manufacturer) {
    return Object.values(this.machines).filter(m =>
      m.manufacturer.toLowerCase() === manufacturer.toLowerCase()
    );
  },
  // Get all 5-axis machines
  get5AxisMachines() {
    return Object.values(this.machines).filter(m =>
      m.type && (m.type.includes('5AXIS') || m.type.includes('TRUNNION'))
    );
  },
  // Search machines
  search(query) {
    const q = query.toLowerCase();
    return Object.values(this.machines).filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.manufacturer.toLowerCase().includes(q)
    );
  }
};
// Export
if (typeof window !== 'undefined') {
  window.PRISM_MACHINE_3D_MODEL_DATABASE_V2 = PRISM_MACHINE_3D_MODEL_DATABASE_V2;

// PRISM_MACHINE_3D_MODEL_DATABASE_V3 - 108 Integrated Machine Models
// Version: 3.0.0
// Build Date: 2026-01-08
// Total Models: 108
