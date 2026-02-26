const PRISM_UNIFIED_MANUFACTURER_DATABASE = {
    version: "1.0",

    // Machine Tool Manufacturers
    machineTools: {
        dmgMori: {
            name: "DMG MORI",
            country: "Germany/Japan",
            products: ["Vertical Mills", "Horizontal Mills", "Lathes", "5-Axis", "Mill-Turn"],
            controllers: ["CELOS", "MAPPS IV", "Fanuc", "Siemens"],
            website: "https://www.dmgmori.com"
        },
        mazak: {
            name: "Yamazaki Mazak",
            country: "Japan",
            products: ["Vertical Mills", "Horizontal Mills", "Lathes", "5-Axis", "Mill-Turn", "Laser"],
            controllers: ["Mazatrol", "Mazatrol SmoothX", "Mazatrol SmoothAi"],
            website: "https://www.mazak.com"
        },
        haas: {
            name: "Haas Automation",
            country: "USA",
            products: ["Vertical Mills", "Horizontal Mills", "Lathes", "5-Axis", "Rotaries"],
            controllers: ["Haas NGC"],
            website: "https://www.haascnc.com"
        },
        okuma: {
            name: "Okuma",
            country: "Japan",
            products: ["Vertical Mills", "Horizontal Mills", "Lathes", "5-Axis", "Grinders"],
            controllers: ["OSP-P500", "OSP-P300", "OSP Suite"],
            website: "https://www.okuma.com"
        },
        makino: {
            name: "Makino",
            country: "Japan",
            products: ["Vertical Mills", "Horizontal Mills", "5-Axis", "EDM", "Graphite"],
            controllers: ["Pro5", "Pro6", "Hyper i"],
            website: "https://www.makino.com"
        },
        brother: {
            name: "Brother Industries",
            country: "Japan",
            products: ["Compact Machining Centers", "Tapping Centers"],
            controllers: ["CNC-C00"],
            website: "https://www.brother.com"
        },
        hurco: {
            name: "Hurco",
            country: "USA",
            products: ["Vertical Mills", "5-Axis", "Lathes"],
            controllers: ["WinMax", "MAX5"],
            website: "https://www.hurco.com"
        },
        hermle: {
            name: "Hermle",
            country: "Germany",
            products: ["5-Axis Mills", "High-Speed Mills"],
            controllers: ["Heidenhain TNC640", "Siemens 840D"],
            website: "https://www.hermle.de"
        },
        matsuura: {
            name: "Matsuura",
            country: "Japan",
            products: ["5-Axis Mills", "Multi-Pallet Systems"],
            controllers: ["Fanuc", "G-Tech"],
            website: "https://www.matsuura.co.jp"
        },
        hardinge: {
            name: "Hardinge",
            country: "USA",
            products: ["Lathes", "Grinding", "Workholding"],
            controllers: ["Fanuc", "Siemens"],
            website: "https://www.hardinge.com"
        }
    },
    // Cutting Tool Manufacturers (Extended from MANUFACTURER_CUTTING_DATA)
    cuttingTools: {
        sandvik: {
            name: "Sandvik Coromant",
            country: "Sweden",
            products: ["Milling", "Turning", "Drilling", "Boring", "Threading"],
            specialties: ["Carbide Inserts", "Solid Carbide", "PCD", "CBN"],
            website: "https://www.sandvik.coromant.com"
        },
        kennametal: {
            name: "Kennametal",
            country: "USA",
            products: ["Milling", "Turning", "Drilling", "Tooling Systems"],
            specialties: ["Carbide", "Ceramics", "PCD"],
            website: "https://www.kennametal.com"
        },
        iscar: {
            name: "ISCAR",
            country: "Israel",
            products: ["Milling", "Turning", "Drilling", "Grooving"],
            specialties: ["Carbide Inserts", "Solid Carbide"],
            website: "https://www.iscar.com"
        },
        walter: {
            name: "Walter Tools",
            country: "Germany",
            products: ["Milling", "Turning", "Drilling", "Threading"],
            specialties: ["Solid Carbide", "Indexable"],
            website: "https://www.walter-tools.com"
        },
        seco: {
            name: "Seco Tools",
            country: "Sweden",
            products: ["Milling", "Turning", "Drilling", "Threading"],
            specialties: ["Carbide", "Ceramics"],
            website: "https://www.secotools.com"
        },
        mitsubishi: {
            name: "Mitsubishi Materials",
            country: "Japan",
            products: ["Milling", "Turning", "Drilling"],
            specialties: ["Carbide", "CBN", "PCD"],
            website: "https://www.mitsubishicarbide.com"
        },
        kyocera: {
            name: "Kyocera",
            country: "Japan",
            products: ["Turning Inserts", "Milling", "Drilling"],
            specialties: ["Ceramics", "Cermet", "Carbide"],
            website: "https://www.kyocera.com"
        },
        tungaloy: {
            name: "Tungaloy",
            country: "Japan",
            products: ["Turning", "Milling", "Drilling", "Grooving"],
            specialties: ["Carbide", "CBN", "PCD"],
            website: "https://www.tungaloy.com"
        },
        osg: {
            name: "OSG Corporation",
            country: "Japan",
            products: ["Taps", "End Mills", "Drills", "Dies"],
            specialties: ["HSS", "Solid Carbide", "Thread Milling"],
            website: "https://www.osgcorp.com"
        },
        guhring: {
            name: "Gühring",
            country: "Germany",
            products: ["Drills", "Reamers", "Thread Milling", "Milling"],
            specialties: ["Solid Carbide Drills", "Deep Hole"],
            website: "https://www.guehring.com"
        },
        harvey: {
            name: "Harvey Tool",
            country: "USA",
            products: ["Specialty End Mills", "Miniature Tools"],
            specialties: ["Micro Tools", "Specialty Profiles"],
            website: "https://www.harveytool.com"
        },
        helical: {
            name: "Helical Solutions",
            country: "USA",
            products: ["End Mills", "High Performance"],
            specialties: ["Solid Carbide", "Variable Helix"],
            website: "https://www.helicalsolutions.com"
        },
        yg1: {
            name: "YG-1",
            country: "South Korea",
            products: ["End Mills", "Drills", "Taps"],
            specialties: ["Solid Carbide", "HSS-E"],
            website: "https://www.yg1.kr"
        },
        emuge: {
            name: "Emuge-Franken",
            country: "Germany",
            products: ["Taps", "Thread Mills", "Clamping"],
            specialties: ["Threading", "HSS", "Carbide"],
            website: "https://www.emuge.com"
        },
        dormer: {
            name: "Dormer Pramet",
            country: "UK/Czech Republic",
            products: ["Drills", "Taps", "End Mills", "Inserts"],
            specialties: ["Round Tools", "Indexable"],
            website: "https://www.dormerpramet.com"
        }
    },
    // CAD/CAM Software
    software: {
        hypermill: {
            name: "hyperMILL",
            company: "OPEN MIND Technologies",
            country: "Germany",
            type: "CAM",
            specialties: ["5-Axis", "Mill-Turn", "Electrode"],
            website: "https://www.openmind-tech.com"
        },
        mastercam: {
            name: "Mastercam",
            company: "CNC Software, Inc.",
            country: "USA",
            type: "CAD/CAM",
            specialties: ["Mill", "Lathe", "Wire EDM", "Router"],
            website: "https://www.mastercam.com"
        },
        fusion360: {
            name: "Fusion 360",
            company: "Autodesk",
            country: "USA",
            type: "CAD/CAM/CAE",
            specialties: ["Integrated CAD/CAM", "Cloud-based"],
            website: "https://www.autodesk.com/products/fusion-360"
        },
        solidworks: {
            name: "SOLIDWORKS CAM",
            company: "Dassault Systèmes",
            country: "France",
            type: "CAD/CAM",
            specialties: ["Knowledge-based Machining"],
            website: "https://www.solidworks.com"
        },
        nx: {
            name: "NX CAM",
            company: "Siemens",
            country: "Germany",
            type: "CAD/CAM/CAE",
            specialties: ["Advanced Manufacturing", "Aerospace"],
            website: "https://www.plm.automation.siemens.com"
        },
        catia: {
            name: "CATIA",
            company: "Dassault Systèmes",
            country: "France",
            type: "CAD/CAM/CAE",
            specialties: ["Aerospace", "Automotive", "Complex Surfaces"],
            website: "https://www.3ds.com/products-services/catia"
        },
        esprit: {
            name: "ESPRIT",
            company: "Hexagon",
            country: "USA/Sweden",
            type: "CAM",
            specialties: ["Multi-Axis", "Mill-Turn", "Wire EDM"],
            website: "https://www.espritcam.com"
        },
        gibbscam: {
            name: "GibbsCAM",
            company: "3D Systems",
            country: "USA",
            type: "CAM",
            specialties: ["Production Machining", "Mill-Turn"],
            website: "https://www.gibbscam.com"
        }
    },
    // Workholding
    workholding: {
        schunk: {
            name: "SCHUNK",
            country: "Germany",
            products: ["Chucks", "Vises", "Clamping", "Grippers"],
            website: "https://www.schunk.com"
        },
        lang: {
            name: "Lang Technik",
            country: "Germany",
            products: ["Workholding", "5-Axis Vises", "Quick-Point"],
            website: "https://www.lang-technik.de"
        },
        erowa: {
            name: "EROWA",
            country: "Switzerland",
            products: ["Palletization", "Automation", "EDM Tooling"],
            website: "https://www.erowa.com"
        },
        system3r: {
            name: "System 3R",
            country: "Switzerland",
            products: ["Palletization", "Reference Systems"],
            website: "https://www.system3r.com"
        },
        jergens: {
            name: "Jergens",
            country: "USA",
            products: ["Workholding", "Ball Lock", "Quick Change"],
            website: "https://www.jergensinc.com"
        },
        kurt: {
            name: "Kurt Manufacturing",
            country: "USA",
            products: ["Vises", "Workholding"],
            website: "https://www.kurtworkholding.com"
        }
    },
    // Query function
    getManufacturer: function(name) {
        const nameLower = name.toLowerCase();
        for (const category of Object.values(this)) {
            if (typeof category !== 'object') continue;
            for (const [key, mfr] of Object.entries(category)) {
                if (key === nameLower || (mfr.name && mfr.name.toLowerCase().includes(nameLower))) {
                    return mfr;
                }
            }
        }
        return null;
    }
}