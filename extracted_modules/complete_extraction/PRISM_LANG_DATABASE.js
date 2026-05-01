const PRISM_LANG_DATABASE = {

    manufacturer: "LANG Technik GmbH",
    brand: "LANG Technik",
    country: "Germany",
    location: "Holzmaden",
    founded: 1984,
    catalog_source: "Lang Technik Catalogue 2021",
    motto: "simple. gripping. future.",

    // QUICK-POINT® ZERO-POINT CLAMPING SYSTEM
    // Mechanical zero-point system with <0.005mm repeatability

    quickPoint: {
        series_name: "Quick-Point®",
        description: "Mechanical zero-point clamping system",
        repeatability_mm: 0.005,
        height_mm: 27,  // One of the lowest on the market
        holding_force_kg: 6000,
        actuation_torque_Nm: 30,

        gridSizes: {
            "52": {
                spacing_mm: 52,
                description: "Compact grid for smaller vises",
                stud_size: "M8"
            },
            "96": {
                spacing_mm: 96,
                description: "Standard grid for larger applications",
                stud_size: "M12"
            }
        },
        singlePlates: [
            {
                id: "LANG_QP52_104x104",
                item_no: "45600",
                model: "Quick-Point® 52 Single Plate",
                grid: 52,
                dimensions_mm: [104, 104, 27],
                weight_kg: 2.0
            },
            {
                id: "LANG_QP52_156x104",
                item_no: "45601",
                model: "Quick-Point® 52 Single Plate",
                grid: 52,
                dimensions_mm: [156, 104, 27],
                weight_kg: 3.0
            },
            {
                id: "LANG_QP96_192x192",
                item_no: "45700",
                model: "Quick-Point® 96 Single Plate",
                grid: 96,
                dimensions_mm: [192, 192, 27],
                weight_kg: 6.5
            },
            {
                id: "LANG_QP96_288x192",
                item_no: "45701",
                model: "Quick-Point® 96 Single Plate",
                grid: 96,
                dimensions_mm: [288, 192, 27],
                weight_kg: 9.5
            }
        ],

        multiPlates: [
            {
                id: "LANG_QP52_MULTI_2x2",
                model: "Quick-Point® 52 Multi Plate 2x2",
                grid: 52,
                clamping_positions: 4
            },
            {
                id: "LANG_QP52_MULTI_3x2",
                model: "Quick-Point® 52 Multi Plate 3x2",
                grid: 52,
                clamping_positions: 6
            },
            {
                id: "LANG_QP96_MULTI_2x2",
                model: "Quick-Point® 96 Multi Plate 2x2",
                grid: 96,
                clamping_positions: 4
            },
            {
                id: "LANG_QP96_MULTI_3x2",
                model: "Quick-Point® 96 Multi Plate 3x2",
                grid: 96,
                clamping_positions: 6
            }
        ],

        adaptorPlates: [
            {
                id: "LANG_QP_ADAPTOR_96to52",
                model: "Quick-Point® Adaptor 96→52",
                from_grid: 96,
                to_grid: 52,
                description: "Adapts QP96 base to QP52 vises"
            }
        ],

        risers: [
            {
                id: "LANG_QP_RISER_50",
                model: "Quick-Point® Riser 50mm",
                height_mm: 50
            },
            {
                id: "LANG_QP_RISER_100",
                model: "Quick-Point® Riser 100mm",
                height_mm: 100
            },
            {
                id: "LANG_QP_RISER_150",
                model: "Quick-Point® Riser 150mm",
                height_mm: 150
            }
        ],

        clampingTowers: [
            {
                id: "LANG_QP_TOWER_VMC",
                model: "Quick-Point® Clamping Tower VMC",
                description: "For vertical machining centres",
                faces: 4
            },
            {
                id: "LANG_QP_TOWER_HMC",
                model: "Quick-Point® Clamping Tower HMC",
                description: "For horizontal machining centres",
                faces: 4
            }
        ],

        clampingStuds: [
            {
                id: "LANG_QP52_STUD_STD",
                model: "Quick-Point® 52 Clamping Stud Standard",
                grid: 52,
                type: "standard"
            },
            {
                id: "LANG_QP52_STUD_SHORT",
                model: "Quick-Point® 52 Clamping Stud Short",
                grid: 52,
                type: "short"
            },
            {
                id: "LANG_QP96_STUD_STD",
                model: "Quick-Point® 96 Clamping Stud Standard",
                grid: 96,
                type: "standard"
            },
            {
                id: "LANG_QP96_STUD_SHORT",
                model: "Quick-Point® 96 Clamping Stud Short",
                grid: 96,
                type: "short"
            }
        ],

        quickLock: {
            id: "LANG_QP_QUICKLOCK",
            model: "Quick-Lock Device",
            description: "Fast actuation without torque wrench",
            actuation: "lever"
        }
    },
    // MAKRO-GRIP® STAMPING TECHNOLOGY
    // Unique stamping system for raw material clamping

    makroGripStamping: {
        series_name: "Makro-Grip® Stamping",
        description: "Unique stamping technology for secure raw material clamping",
        features: [
            "Stamps into raw material for form-fit clamping",
            "Enables 5-sided machining in one setup",
            "Minimal clamping depth (3mm typical)",
            "Eliminates need for soft jaws"
        ],

        stampingUnits: [
            {
                id: "LANG_MG_STAMP_77",
                model: "Makro-Grip® Stamping Unit 77",
                width_mm: 77,
                stamping_force_kN: 100,
                features: ["replaceable_stamps", "quick_point_compatible"]
            },
            {
                id: "LANG_MG_STAMP_125",
                model: "Makro-Grip® Stamping Unit 125",
                width_mm: 125,
                stamping_force_kN: 150,
                features: ["replaceable_stamps", "quick_point_compatible"]
            },
            {
                id: "LANG_MG_STAMP_PRESS",
                model: "Makro-Grip® Stamping Press",
                description: "Standalone hydraulic stamping press",
                force_kN: 200
            }
        ]
    },
    // MAKRO-GRIP® 5-AXIS VICES
    // Premium 5-axis workholding vises

    makroGrip5Axis: {
        series_name: "Makro-Grip® 5-Axis",
        description: "5-axis vices with stamping technology",
        repeatability_mm: 0.01,

        vises: [
            {
                id: "LANG_MG5_46",
                model: "Makro-Grip® 5-Axis Vice 46",
                jaw_width_mm: 46,
                max_opening_mm: 96,
                clamping_force_kN: 25,
                weight_kg: 3.5,
                quick_point: 52,
                features: ["5_axis", "stamping", "pull_down"]
            },
            {
                id: "LANG_MG5_77",
                model: "Makro-Grip® 5-Axis Vice 77",
                jaw_width_mm: 77,
                max_opening_mm: 165,
                clamping_force_kN: 35,
                weight_kg: 7.5,
                quick_point: 52,
                features: ["5_axis", "stamping", "pull_down"]
            },
            {
                id: "LANG_MG5_125",
                model: "Makro-Grip® 5-Axis Vice 125",
                jaw_width_mm: 125,
                max_opening_mm: 260,
                clamping_force_kN: 50,
                weight_kg: 15,
                quick_point: 96,
                features: ["5_axis", "stamping", "pull_down"]
            },
            {
                id: "LANG_MG5_160",
                model: "Makro-Grip® 5-Axis Vice 160",
                jaw_width_mm: 160,
                max_opening_mm: 350,
                clamping_force_kN: 60,
                weight_kg: 25,
                quick_point: 96,
                features: ["5_axis", "stamping", "pull_down"]
            }
        ],

        accessories: {
            contourJaws: [
                {
                    id: "LANG_MG5_JAW_CONTOUR_46",
                    model: "Contour Jaws 46",
                    for_vice: 46,
                    attachment: "magnetic"
                },
                {
                    id: "LANG_MG5_JAW_CONTOUR_77",
                    model: "Contour Jaws 77",
                    for_vice: 77,
                    attachment: "magnetic"
                },
                {
                    id: "LANG_MG5_JAW_CONTOUR_125",
                    model: "Contour Jaws 125",
                    for_vice: 125,
                    attachment: "magnetic"
                }
            ],

            softJaws: [
                {
                    id: "LANG_MG5_JAW_SOFT_46",
                    model: "Soft Jaws 46",
                    for_vice: 46,
                    material: "aluminum"
                },
                {
                    id: "LANG_MG5_JAW_SOFT_77",
                    model: "Soft Jaws 77",
                    for_vice: 77,
                    material: "aluminum"
                }
            ]
        }
    },
    // MAKRO-GRIP® ULTRA
    // Large part clamping system

    makroGripUltra: {
        series_name: "Makro-Grip® Ultra",
        description: "Modular system for large part clamping up to 810mm+",
        features: [
            "Modular expandable design",
            "Parts up to 810mm and beyond",
            "Flat material clamping",
            "Mould making applications"
        ],

        baseModules: [
            {
                id: "LANG_MGU_BASE_200",
                model: "Makro-Grip® Ultra Base 200",
                width_mm: 200,
                clamping_force_kN: 80
            },
            {
                id: "LANG_MGU_BASE_300",
                model: "Makro-Grip® Ultra Base 300",
                width_mm: 300,
                clamping_force_kN: 100
            }
        ],

        extensionModules: [
            {
                id: "LANG_MGU_EXT_200",
                model: "Makro-Grip® Ultra Extension 200",
                adds_length_mm: 200
            },
            {
                id: "LANG_MGU_EXT_300",
                model: "Makro-Grip® Ultra Extension 300",
                adds_length_mm: 300
            }
        ]
    },
    // CONVENTIONAL WORKHOLDING
    // Standard vises and collet chucks

    conventionalWorkholding: {

        vises: [
            {
                id: "LANG_CONV_VISE_100",
                model: "Conventional Vice 100",
                jaw_width_mm: 100,
                max_opening_mm: 125,
                clamping_force_kN: 25
            },
            {
                id: "LANG_CONV_VISE_125",
                model: "Conventional Vice 125",
                jaw_width_mm: 125,
                max_opening_mm: 160,
                clamping_force_kN: 35
            },
            {
                id: "LANG_CONV_VISE_160",
                model: "Conventional Vice 160",
                jaw_width_mm: 160,
                max_opening_mm: 200,
                clamping_force_kN: 45
            }
        ],

        preciPoint: [
            {
                id: "LANG_PRECIPOINT_ER32",
                model: "Preci-Point ER32",
                collet_type: "ER32",
                clamping_range_mm: [3, 20],
                quick_point: 52,
                description: "Collet chuck for round parts"
            },
            {
                id: "LANG_PRECIPOINT_ER50",
                model: "Preci-Point ER50",
                collet_type: "ER50",
                clamping_range_mm: [8, 34],
                quick_point: 52,
                description: "Collet chuck for round parts"
            }
        ],

        vastoClamp: {
            id: "LANG_VASTO_6JAW",
            model: "Vasto-Clamp 6-Jaw Chuck",
            jaws: 6,
            description: "Flexible 6-jaw chuck for round parts",
            features: ["self_centering", "high_grip"]
        },
        makro4Grip: {
            id: "LANG_MAKRO4GRIP",
            model: "Makro-4Grip",
            description: "Stamping technology for cylindrical parts",
            features: ["pre_stamping", "form_fit", "round_parts"]
        }
    },
    // AUTOMATION SYSTEMS
    // RoboTrex and HAUBEX

    automation: {

        roboTrex: {
            id: "LANG_ROBOTREX",
            series_name: "RoboTrex",
            description: "Robot-based automation system for CNC machines",
            features: [
                "Robot loading/unloading",
                "Compatible with all LANG vises",
                "Pallet storage system",
                "Lights-out manufacturing"
            ],
            models: [
                {
                    id: "LANG_ROBOTREX_52",
                    model: "RoboTrex 52",
                    for_quick_point: 52,
                    pallet_capacity: 20
                },
                {
                    id: "LANG_ROBOTREX_96",
                    model: "RoboTrex 96",
                    for_quick_point: 96,
                    pallet_capacity: 16
                }
            ]
        },
        haubex: {
            id: "LANG_HAUBEX",
            series_name: "HAUBEX",
            description: "Tool magazine automation - uses existing tool changer",
            features: [
                "No robot required",
                "Uses machine tool magazine",
                "Workholding hood carrier system",
                "Vice stored like a tool",
                "Mechanical actuation"
            ],
            compatibility: ["vertical_machining_centres"],
            patented: true
        }
    },
    // ACCESSORIES

    accessories: {
        cleanTec: {
            id: "LANG_CLEANTEC",
            model: "Clean-Tec Chip Fan",
            description: "Chip removal system for automated manufacturing"
        },
        centringStuds: [
            { id: "LANG_CENTRE_52", model: "Centring Stud 52", grid: 52 },
            { id: "LANG_CENTRE_96", model: "Centring Stud 96", grid: 96 }
        ]
    },
    // LOOKUP METHODS

    getById: function(id) {
        const allItems = [
            ...this.quickPoint.singlePlates,
            ...this.quickPoint.multiPlates,
            ...this.quickPoint.risers,
            ...this.makroGripStamping.stampingUnits,
            ...this.makroGrip5Axis.vises,
            ...this.makroGripUltra.baseModules,
            ...this.conventionalWorkholding.vises,
            ...this.conventionalWorkholding.preciPoint
        ];
        return allItems.find(item => item.id === id);
    },
    getQuickPointByGrid: function(grid_mm) {
        return {
            singlePlates: this.quickPoint.singlePlates.filter(p => p.grid === grid_mm),
            multiPlates: this.quickPoint.multiPlates.filter(p => p.grid === grid_mm),
            studs: this.quickPoint.clampingStuds.filter(s => s.grid === grid_mm)
        };
    },
    get5AxisVises: function() {
        return this.makroGrip5Axis.vises;
    },
    getViseByJawWidth: function(width_mm) {
        const allVises = [
            ...this.makroGrip5Axis.vises,
            ...this.conventionalWorkholding.vises
        ];
        return allVises.find(v => v.jaw_width_mm === width_mm);
    },
    getTotalProducts: function() {
        let count = 0;
        count += this.quickPoint.singlePlates.length;
        count += this.quickPoint.multiPlates.length;
        count += this.quickPoint.adaptorPlates.length;
        count += this.quickPoint.risers.length;
        count += this.quickPoint.clampingTowers.length;
        count += this.quickPoint.clampingStuds.length;
        count += this.makroGripStamping.stampingUnits.length;
        count += this.makroGrip5Axis.vises.length;
        count += this.makroGrip5Axis.accessories.contourJaws.length;
        count += this.makroGrip5Axis.accessories.softJaws.length;
        count += this.makroGripUltra.baseModules.length;
        count += this.makroGripUltra.extensionModules.length;
        count += this.conventionalWorkholding.vises.length;
        count += this.conventionalWorkholding.preciPoint.length;
        count += 2; // vastoClamp + makro4Grip
        count += 3; // automation (roboTrex models + haubex)
        return count;
    }
}