const PRISM_EXTENDED_MATERIAL_CUTTING_DB = {
    version: '3.0.0',

    // Aluminum Alloys - Full cutting data
    aluminum: {
        '1100': { sfm: 1000, ipt: 0.006, doc: 2.0, woc: 0.5, Kc: 350, hardness: 23, group: 'N' },
        '2024-T351': { sfm: 600, ipt: 0.004, doc: 1.5, woc: 0.4, Kc: 750, hardness: 120, group: 'N' },
        '5052': { sfm: 800, ipt: 0.005, doc: 1.8, woc: 0.45, Kc: 500, hardness: 60, group: 'N' },
        '6061-T6': { sfm: 900, ipt: 0.005, doc: 1.5, woc: 0.45, Kc: 700, hardness: 95, group: 'N' },
        '6063-T6': { sfm: 950, ipt: 0.005, doc: 1.6, woc: 0.45, Kc: 650, hardness: 73, group: 'N' },
        '7075-T6': { sfm: 500, ipt: 0.003, doc: 1.0, woc: 0.35, Kc: 850, hardness: 150, group: 'N' },
        '7075-T651': { sfm: 450, ipt: 0.003, doc: 1.0, woc: 0.35, Kc: 900, hardness: 160, group: 'N' },
        'cast_356': { sfm: 700, ipt: 0.004, doc: 1.2, woc: 0.4, Kc: 600, hardness: 75, group: 'N' },
        'cast_A380': { sfm: 600, ipt: 0.004, doc: 1.0, woc: 0.4, Kc: 700, hardness: 80, group: 'N' },
        'MIC6': { sfm: 800, ipt: 0.005, doc: 1.5, woc: 0.45, Kc: 650, hardness: 70, group: 'N' }
    },
    // Stainless Steels
    stainless: {
        '303': { sfm: 350, ipt: 0.003, doc: 0.75, woc: 0.35, Kc: 2600, hardness: 228, group: 'M' },
        '304': { sfm: 300, ipt: 0.003, doc: 0.6, woc: 0.3, Kc: 2800, hardness: 201, group: 'M' },
        '304L': { sfm: 320, ipt: 0.003, doc: 0.65, woc: 0.32, Kc: 2700, hardness: 187, group: 'M' },
        '316': { sfm: 280, ipt: 0.0025, doc: 0.55, woc: 0.28, Kc: 2900, hardness: 217, group: 'M' },
        '316L': { sfm: 290, ipt: 0.0025, doc: 0.55, woc: 0.28, Kc: 2850, hardness: 200, group: 'M' },
        '17-4PH': { sfm: 200, ipt: 0.002, doc: 0.4, woc: 0.25, Kc: 3200, hardness: 352, group: 'M' },
        '15-5PH': { sfm: 220, ipt: 0.002, doc: 0.45, woc: 0.25, Kc: 3100, hardness: 341, group: 'M' },
        '410': { sfm: 380, ipt: 0.003, doc: 0.7, woc: 0.35, Kc: 2400, hardness: 217, group: 'M' },
        '420': { sfm: 300, ipt: 0.0025, doc: 0.5, woc: 0.3, Kc: 2700, hardness: 302, group: 'M' },
        '440C': { sfm: 180, ipt: 0.002, doc: 0.35, woc: 0.22, Kc: 3400, hardness: 580, group: 'M' }
    },
    // Titanium Alloys
    titanium: {
        'CP_Grade2': { sfm: 250, ipt: 0.003, doc: 0.5, woc: 0.25, Kc: 1400, hardness: 160, group: 'S' },
        'CP_Grade4': { sfm: 200, ipt: 0.0025, doc: 0.4, woc: 0.22, Kc: 1500, hardness: 253, group: 'S' },
        '6Al-4V': { sfm: 180, ipt: 0.002, doc: 0.35, woc: 0.2, Kc: 1600, hardness: 334, group: 'S' },
        '6Al-4V_ELI': { sfm: 170, ipt: 0.002, doc: 0.35, woc: 0.2, Kc: 1650, hardness: 311, group: 'S' },
        '6Al-2Sn': { sfm: 150, ipt: 0.002, doc: 0.3, woc: 0.18, Kc: 1700, hardness: 360, group: 'S' },
        'Ti-5553': { sfm: 100, ipt: 0.0015, doc: 0.25, woc: 0.15, Kc: 1900, hardness: 390, group: 'S' },
        'Ti-17': { sfm: 120, ipt: 0.0018, doc: 0.28, woc: 0.18, Kc: 1800, hardness: 375, group: 'S' }
    },
    // Nickel Superalloys
    superalloys: {
        'Inconel_600': { sfm: 80, ipt: 0.0015, doc: 0.2, woc: 0.15, Kc: 2800, hardness: 220, group: 'S' },
        'Inconel_625': { sfm: 70, ipt: 0.0012, doc: 0.18, woc: 0.12, Kc: 2900, hardness: 270, group: 'S' },
        'Inconel_718': { sfm: 65, ipt: 0.001, doc: 0.15, woc: 0.1, Kc: 3000, hardness: 363, group: 'S' },
        'Inconel_X750': { sfm: 60, ipt: 0.001, doc: 0.15, woc: 0.1, Kc: 3100, hardness: 355, group: 'S' },
        'Hastelloy_X': { sfm: 55, ipt: 0.001, doc: 0.12, woc: 0.1, Kc: 3200, hardness: 241, group: 'S' },
        'Hastelloy_C276': { sfm: 50, ipt: 0.0008, doc: 0.1, woc: 0.08, Kc: 3400, hardness: 210, group: 'S' },
        'Waspaloy': { sfm: 60, ipt: 0.001, doc: 0.12, woc: 0.1, Kc: 3100, hardness: 371, group: 'S' },
        'Rene_41': { sfm: 50, ipt: 0.0008, doc: 0.1, woc: 0.08, Kc: 3300, hardness: 395, group: 'S' },
        'MP35N': { sfm: 40, ipt: 0.0006, doc: 0.08, woc: 0.06, Kc: 3600, hardness: 477, group: 'S' }
    },
    // Cast Iron
    cast_iron: {
        'Gray_Class30': { sfm: 400, ipt: 0.005, doc: 1.0, woc: 0.4, Kc: 1100, hardness: 187, group: 'K' },
        'Gray_Class40': { sfm: 350, ipt: 0.004, doc: 0.9, woc: 0.38, Kc: 1200, hardness: 217, group: 'K' },
        'Ductile_60-40-18': { sfm: 400, ipt: 0.004, doc: 0.9, woc: 0.4, Kc: 1300, hardness: 143, group: 'K' },
        'Ductile_80-55-06': { sfm: 320, ipt: 0.0035, doc: 0.7, woc: 0.35, Kc: 1500, hardness: 241, group: 'K' },
        'ADI_Grade1': { sfm: 280, ipt: 0.003, doc: 0.6, woc: 0.3, Kc: 1700, hardness: 269, group: 'K' },
        'CGI': { sfm: 350, ipt: 0.004, doc: 0.8, woc: 0.38, Kc: 1400, hardness: 210, group: 'K' }
    },
    // Copper Alloys
    copper: {
        'C101_ETP': { sfm: 600, ipt: 0.004, doc: 1.2, woc: 0.4, Kc: 900, hardness: 40, group: 'N' },
        'C110_OFC': { sfm: 650, ipt: 0.0045, doc: 1.3, woc: 0.42, Kc: 850, hardness: 35, group: 'N' },
        'Brass_C360': { sfm: 800, ipt: 0.005, doc: 1.5, woc: 0.45, Kc: 750, hardness: 75, group: 'N' },
        'Bronze_C932': { sfm: 400, ipt: 0.003, doc: 0.8, woc: 0.35, Kc: 1100, hardness: 65, group: 'N' },
        'BeCu_C17200': { sfm: 300, ipt: 0.0025, doc: 0.5, woc: 0.3, Kc: 1400, hardness: 380, group: 'N' },
        'Tellurium_C145': { sfm: 700, ipt: 0.005, doc: 1.4, woc: 0.45, Kc: 800, hardness: 45, group: 'N' }
    },
    // Tool Steels
    tool_steel: {
        'A2': { sfm: 200, ipt: 0.002, doc: 0.4, woc: 0.25, Kc: 2400, hardness: 228, group: 'P' },
        'D2': { sfm: 150, ipt: 0.0015, doc: 0.3, woc: 0.2, Kc: 2800, hardness: 255, group: 'P' },
        'H13': { sfm: 250, ipt: 0.0025, doc: 0.5, woc: 0.3, Kc: 2200, hardness: 217, group: 'P' },
        'M2': { sfm: 180, ipt: 0.002, doc: 0.35, woc: 0.22, Kc: 2600, hardness: 269, group: 'P' },
        'O1': { sfm: 220, ipt: 0.002, doc: 0.45, woc: 0.28, Kc: 2300, hardness: 210, group: 'P' },
        'S7': { sfm: 200, ipt: 0.002, doc: 0.4, woc: 0.25, Kc: 2500, hardness: 255, group: 'P' },
        'P20': { sfm: 300, ipt: 0.003, doc: 0.6, woc: 0.35, Kc: 2000, hardness: 321, group: 'P' }
    },
    // Hardened Steels
    hardened: {
        '45HRC': { sfm: 150, ipt: 0.0015, doc: 0.15, woc: 0.15, Kc: 4000, hardness: 450, group: 'H' },
        '50HRC': { sfm: 120, ipt: 0.001, doc: 0.1, woc: 0.12, Kc: 4500, hardness: 500, group: 'H' },
        '55HRC': { sfm: 90, ipt: 0.0008, doc: 0.08, woc: 0.1, Kc: 5000, hardness: 550, group: 'H' },
        '60HRC': { sfm: 70, ipt: 0.0006, doc: 0.05, woc: 0.08, Kc: 5800, hardness: 600, group: 'H' },
        '62HRC': { sfm: 50, ipt: 0.0004, doc: 0.04, woc: 0.06, Kc: 6500, hardness: 620, group: 'H' }
    },
    // Plastics
    plastics: {
        'Delrin': { sfm: 500, ipt: 0.006, doc: 2.0, woc: 0.5, Kc: 200, hardness: 0, group: 'O' },
        'Nylon': { sfm: 450, ipt: 0.005, doc: 1.8, woc: 0.45, Kc: 180, hardness: 0, group: 'O' },
        'PEEK': { sfm: 400, ipt: 0.004, doc: 1.5, woc: 0.4, Kc: 250, hardness: 0, group: 'O' },
        'UHMW': { sfm: 600, ipt: 0.008, doc: 2.5, woc: 0.55, Kc: 120, hardness: 0, group: 'O' },
        'Acetal': { sfm: 500, ipt: 0.006, doc: 2.0, woc: 0.5, Kc: 200, hardness: 0, group: 'O' },
        'Polycarbonate': { sfm: 400, ipt: 0.004, doc: 1.5, woc: 0.4, Kc: 220, hardness: 0, group: 'O' },
        'Acrylic': { sfm: 350, ipt: 0.003, doc: 1.2, woc: 0.35, Kc: 280, hardness: 0, group: 'O' }
    },
    // Carbon Steels Extended (v8.9.181)
    carbon_steel: {
        '1008': { sfm: 500, ipt: 0.006, doc: 1.5, woc: 0.5, Kc: 1600, hardness: 95, group: 'P' },
        '1010': { sfm: 480, ipt: 0.006, doc: 1.5, woc: 0.48, Kc: 1650, hardness: 105, group: 'P' },
        '1018': { sfm: 420, ipt: 0.005, doc: 1.2, woc: 0.45, Kc: 1800, hardness: 126, group: 'P' },
        '1020': { sfm: 420, ipt: 0.005, doc: 1.2, woc: 0.45, Kc: 1850, hardness: 119, group: 'P' },
        '1025': { sfm: 400, ipt: 0.005, doc: 1.1, woc: 0.42, Kc: 1900, hardness: 130, group: 'P' },
        '1035': { sfm: 380, ipt: 0.0045, doc: 1.0, woc: 0.4, Kc: 2000, hardness: 145, group: 'P' },
        '1040': { sfm: 360, ipt: 0.0045, doc: 1.0, woc: 0.4, Kc: 2050, hardness: 158, group: 'P' },
        '1045': { sfm: 350, ipt: 0.004, doc: 0.9, woc: 0.38, Kc: 2100, hardness: 163, group: 'P' },
        '1050': { sfm: 320, ipt: 0.004, doc: 0.8, woc: 0.35, Kc: 2150, hardness: 179, group: 'P' },
        '1117': { sfm: 550, ipt: 0.0065, doc: 1.6, woc: 0.52, Kc: 1700, hardness: 117, group: 'P' },
        '1141': { sfm: 500, ipt: 0.006, doc: 1.5, woc: 0.5, Kc: 1750, hardness: 163, group: 'P' },
        '1144': { sfm: 480, ipt: 0.0058, doc: 1.4, woc: 0.48, Kc: 1800, hardness: 167, group: 'P' },
        '1212': { sfm: 600, ipt: 0.007, doc: 1.8, woc: 0.55, Kc: 1550, hardness: 137, group: 'P' },
        '1213': { sfm: 580, ipt: 0.0068, doc: 1.7, woc: 0.53, Kc: 1600, hardness: 139, group: 'P' },
        '1215': { sfm: 650, ipt: 0.0075, doc: 2.0, woc: 0.58, Kc: 1500, hardness: 163, group: 'P' },
        '12L14': { sfm: 700, ipt: 0.008, doc: 2.2, woc: 0.6, Kc: 1450, hardness: 163, group: 'P' }
    },
    // Alloy Steels Extended (v8.9.181)
    alloy_steel: {
        '4130': { sfm: 300, ipt: 0.004, doc: 0.8, woc: 0.38, Kc: 2200, hardness: 197, group: 'P' },
        '4140': { sfm: 300, ipt: 0.004, doc: 0.8, woc: 0.38, Kc: 2250, hardness: 197, group: 'P' },
        '4150': { sfm: 280, ipt: 0.0038, doc: 0.7, woc: 0.35, Kc: 2350, hardness: 207, group: 'P' },
        '4320': { sfm: 340, ipt: 0.0042, doc: 0.9, woc: 0.4, Kc: 2100, hardness: 163, group: 'P' },
        '4340': { sfm: 250, ipt: 0.0035, doc: 0.65, woc: 0.32, Kc: 2400, hardness: 217, group: 'P' },
        '8620': { sfm: 350, ipt: 0.004, doc: 0.9, woc: 0.4, Kc: 2050, hardness: 149, group: 'P' },
        '8640': { sfm: 300, ipt: 0.004, doc: 0.8, woc: 0.38, Kc: 2200, hardness: 197, group: 'P' },
        '9310': { sfm: 320, ipt: 0.004, doc: 0.85, woc: 0.38, Kc: 2150, hardness: 179, group: 'P' },
        '300M': { sfm: 160, ipt: 0.0025, doc: 0.4, woc: 0.25, Kc: 2800, hardness: 302, group: 'P' }
    },
    // Additional Stainless (v8.9.181)
    stainless_extended: {
        '301': { sfm: 220, ipt: 0.0032, doc: 0.55, woc: 0.28, Kc: 2850, hardness: 217, group: 'M' },
        '302': { sfm: 210, ipt: 0.0031, doc: 0.52, woc: 0.27, Kc: 2900, hardness: 201, group: 'M' },
        '321': { sfm: 190, ipt: 0.0029, doc: 0.5, woc: 0.26, Kc: 2950, hardness: 217, group: 'M' },
        '347': { sfm: 185, ipt: 0.0028, doc: 0.48, woc: 0.25, Kc: 2980, hardness: 201, group: 'M' },
        '416': { sfm: 380, ipt: 0.0045, doc: 0.8, woc: 0.4, Kc: 2200, hardness: 262, group: 'M' },
        '430': { sfm: 280, ipt: 0.0038, doc: 0.7, woc: 0.35, Kc: 2400, hardness: 183, group: 'M' },
        '2507': { sfm: 120, ipt: 0.002, doc: 0.35, woc: 0.2, Kc: 3300, hardness: 310, group: 'M' },
        '904L': { sfm: 140, ipt: 0.0022, doc: 0.4, woc: 0.22, Kc: 3100, hardness: 179, group: 'M' },
        '254SMO': { sfm: 130, ipt: 0.002, doc: 0.38, woc: 0.21, Kc: 3200, hardness: 200, group: 'M' }
    },
    // Additional Titanium (v8.9.181)
    titanium_extended: {
        'CP_Gr1': { sfm: 300, ipt: 0.0035, doc: 0.6, woc: 0.3, Kc: 1300, hardness: 120, group: 'S' },
        'CP_Gr3': { sfm: 220, ipt: 0.0028, doc: 0.45, woc: 0.25, Kc: 1450, hardness: 220, group: 'S' },
        'CP_Gr4': { sfm: 180, ipt: 0.0022, doc: 0.38, woc: 0.22, Kc: 1550, hardness: 280, group: 'S' },
        '6242': { sfm: 100, ipt: 0.0015, doc: 0.25, woc: 0.15, Kc: 1750, hardness: 370, group: 'S' },
        '6246': { sfm: 90, ipt: 0.0012, doc: 0.22, woc: 0.14, Kc: 1850, hardness: 395, group: 'S' },
        '5553': { sfm: 60, ipt: 0.0008, doc: 0.15, woc: 0.1, Kc: 2000, hardness: 430, group: 'S' },
        '10V2Fe3Al': { sfm: 55, ipt: 0.0007, doc: 0.12, woc: 0.08, Kc: 2100, hardness: 440, group: 'S' }
    },
    // Additional Superalloys (v8.9.181)
    superalloys_extended: {
        'Inconel_617': { sfm: 50, ipt: 0.0006, doc: 0.1, woc: 0.08, Kc: 3050, hardness: 245, group: 'S' },
        'Inconel_690': { sfm: 55, ipt: 0.0007, doc: 0.12, woc: 0.09, Kc: 2950, hardness: 220, group: 'S' },
        'Hastelloy_B': { sfm: 38, ipt: 0.0005, doc: 0.08, woc: 0.06, Kc: 3350, hardness: 195, group: 'S' },
        'Hastelloy_C22': { sfm: 40, ipt: 0.0055, doc: 0.09, woc: 0.07, Kc: 3250, hardness: 200, group: 'S' },
        'Hastelloy_X': { sfm: 45, ipt: 0.0006, doc: 0.1, woc: 0.08, Kc: 3100, hardness: 245, group: 'S' },
        'Monel_K500': { sfm: 50, ipt: 0.0008, doc: 0.12, woc: 0.1, Kc: 2800, hardness: 295, group: 'S' },
        'Haynes_25': { sfm: 30, ipt: 0.0004, doc: 0.06, woc: 0.05, Kc: 3550, hardness: 320, group: 'S' },
        'Haynes_188': { sfm: 35, ipt: 0.0045, doc: 0.07, woc: 0.06, Kc: 3400, hardness: 220, group: 'S' },
        'Haynes_230': { sfm: 40, ipt: 0.0005, doc: 0.08, woc: 0.07, Kc: 3200, hardness: 245, group: 'S' }
    },
    // Copper Extended (v8.9.181)
    copper_extended: {
        'C101_OFHC': { sfm: 380, ipt: 0.0055, doc: 1.0, woc: 0.4, Kc: 950, hardness: 45, group: 'N' },
        'C102_OFE': { sfm: 400, ipt: 0.0058, doc: 1.1, woc: 0.42, Kc: 920, hardness: 40, group: 'N' },
        'C330': { sfm: 650, ipt: 0.0068, doc: 1.4, woc: 0.48, Kc: 780, hardness: 55, group: 'N' },
        'C353': { sfm: 750, ipt: 0.0075, doc: 1.6, woc: 0.52, Kc: 720, hardness: 60, group: 'N' },
        'C510': { sfm: 350, ipt: 0.0045, doc: 0.9, woc: 0.38, Kc: 1050, hardness: 80, group: 'N' },
        'C630': { sfm: 220, ipt: 0.0032, doc: 0.6, woc: 0.3, Kc: 1350, hardness: 170, group: 'N' },
        'C954': { sfm: 200, ipt: 0.003, doc: 0.55, woc: 0.28, Kc: 1450, hardness: 190, group: 'N' },
        'CuCrZr': { sfm: 280, ipt: 0.0035, doc: 0.7, woc: 0.35, Kc: 1200, hardness: 150, group: 'N' }
    },
    // Special/Exotic (v8.9.181)
    exotic: {
        'Graphite_EDM': { sfm: 800, ipt: 0.008, doc: 2.0, woc: 0.6, Kc: 100, hardness: 0, group: 'O' },
        'Stellite_6': { sfm: 35, ipt: 0.0005, doc: 0.08, woc: 0.06, Kc: 3600, hardness: 395, group: 'S' },
        'Stellite_21': { sfm: 40, ipt: 0.0006, doc: 0.09, woc: 0.07, Kc: 3400, hardness: 320, group: 'S' },
        'Zamak_3': { sfm: 600, ipt: 0.008, doc: 1.8, woc: 0.55, Kc: 450, hardness: 82, group: 'N' },
        'Zamak_5': { sfm: 580, ipt: 0.0078, doc: 1.7, woc: 0.53, Kc: 480, hardness: 91, group: 'N' },
        'Tantalum': { sfm: 60, ipt: 0.0006, doc: 0.12, woc: 0.1, Kc: 2200, hardness: 200, group: 'S' },
        'Niobium': { sfm: 150, ipt: 0.0015, doc: 0.3, woc: 0.2, Kc: 1400, hardness: 80, group: 'N' },
        'Magnesium_WE43': { sfm: 1200, ipt: 0.009, doc: 2.5, woc: 0.65, Kc: 350, hardness: 85, group: 'N' },
        'Magnesium_ZK60A': { sfm: 1350, ipt: 0.01, doc: 2.8, woc: 0.7, Kc: 320, hardness: 75, group: 'N' }
    },
    // Plastics Extended (v8.9.181)
    plastics_extended: {
        'ABS': { sfm: 500, ipt: 0.01, doc: 2.5, woc: 0.6, Kc: 150, hardness: 0, group: 'O' },
        'PPS': { sfm: 350, ipt: 0.007, doc: 1.8, woc: 0.45, Kc: 220, hardness: 0, group: 'O' },
        'HDPE': { sfm: 650, ipt: 0.012, doc: 3.0, woc: 0.7, Kc: 100, hardness: 0, group: 'O' },
        'PP': { sfm: 600, ipt: 0.011, doc: 2.8, woc: 0.65, Kc: 110, hardness: 0, group: 'O' },
        'Torlon': { sfm: 280, ipt: 0.005, doc: 1.2, woc: 0.35, Kc: 350, hardness: 0, group: 'O' },
        'Vespel': { sfm: 250, ipt: 0.0045, doc: 1.0, woc: 0.32, Kc: 400, hardness: 0, group: 'O' },
        'G10': { sfm: 280, ipt: 0.0055, doc: 1.2, woc: 0.4, Kc: 500, hardness: 0, group: 'O' },
        'FR4': { sfm: 300, ipt: 0.0058, doc: 1.3, woc: 0.42, Kc: 480, hardness: 0, group: 'O' },
        'Kevlar': { sfm: 200, ipt: 0.004, doc: 0.8, woc: 0.3, Kc: 350, hardness: 0, group: 'O' }
    },
    }