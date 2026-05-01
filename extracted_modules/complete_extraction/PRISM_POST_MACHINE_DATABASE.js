const PRISM_POST_MACHINE_DATABASE = {

    // HAAS MILLS
    haas_mills: {
        manufacturer: "Haas",
        type: "mill",
        controller: "haas_ngc",
        dialect: "fanuc",

        machines: {
            // Mini Mills
            mini_mill: { name: "Mini Mill", travels: { x: 406, y: 305, z: 254 }, spindle: { maxRpm: 6000, power: 7.5 }, rapid: 508, toolCapacity: 10, taper: "BT40" },
            mini_mill_2: { name: "Mini Mill 2", travels: { x: 508, y: 406, z: 356 }, spindle: { maxRpm: 6000, power: 7.5 }, rapid: 508, toolCapacity: 10, taper: "BT40" },

            // Office Mills
            om_1: { name: "OM-1", travels: { x: 254, y: 305, z: 305 }, spindle: { maxRpm: 30000, power: 3.7 }, rapid: 762, toolCapacity: 10, taper: "BT30" },
            om_2: { name: "OM-2", travels: { x: 305, y: 254, z: 305 }, spindle: { maxRpm: 15000, power: 5.6 }, rapid: 762, toolCapacity: 14, taper: "BT30" },

            // VF Series - Standard
            vf_1: { name: "VF-1", travels: { x: 508, y: 406, z: 508 }, spindle: { maxRpm: 8100, power: 22.4 }, rapid: 1016, toolCapacity: 20, taper: "CAT40" },
            vf_2: { name: "VF-2", travels: { x: 762, y: 406, z: 508 }, spindle: { maxRpm: 8100, power: 22.4 }, rapid: 1016, toolCapacity: 20, taper: "CAT40" },
            vf_2ss: { name: "VF-2SS", travels: { x: 762, y: 406, z: 508 }, spindle: { maxRpm: 12000, power: 22.4 }, rapid: 1524, toolCapacity: 24, taper: "CAT40", highSpeed: true },
            vf_2yt: { name: "VF-2YT", travels: { x: 762, y: 508, z: 508 }, spindle: { maxRpm: 8100, power: 22.4 }, rapid: 1016, toolCapacity: 20, taper: "CAT40" },
            vf_3: { name: "VF-3", travels: { x: 1016, y: 508, z: 635 }, spindle: { maxRpm: 8100, power: 22.4 }, rapid: 1016, toolCapacity: 20, taper: "CAT40" },
            vf_3ss: { name: "VF-3SS", travels: { x: 1016, y: 508, z: 635 }, spindle: { maxRpm: 12000, power: 22.4 }, rapid: 1524, toolCapacity: 24, taper: "CAT40", highSpeed: true },
            vf_3yt: { name: "VF-3YT", travels: { x: 1016, y: 660, z: 635 }, spindle: { maxRpm: 8100, power: 22.4 }, rapid: 1016, toolCapacity: 20, taper: "CAT40" },
            vf_4: { name: "VF-4", travels: { x: 1270, y: 508, z: 635 }, spindle: { maxRpm: 8100, power: 22.4 }, rapid: 1016, toolCapacity: 20, taper: "CAT40" },
            vf_4ss: { name: "VF-4SS", travels: { x: 1270, y: 508, z: 635 }, spindle: { maxRpm: 12000, power: 22.4 }, rapid: 1524, toolCapacity: 24, taper: "CAT40", highSpeed: true },
            vf_5: { name: "VF-5", travels: { x: 1270, y: 660, z: 635 }, spindle: { maxRpm: 8100, power: 22.4 }, rapid: 1016, toolCapacity: 20, taper: "CAT40" },
            vf_5ss: { name: "VF-5SS", travels: { x: 1270, y: 660, z: 635 }, spindle: { maxRpm: 12000, power: 22.4 }, rapid: 1524, toolCapacity: 24, taper: "CAT40", highSpeed: true },
            vf_6: { name: "VF-6", travels: { x: 1626, y: 813, z: 762 }, spindle: { maxRpm: 8100, power: 22.4 }, rapid: 1016, toolCapacity: 24, taper: "CAT40" },
            vf_6ss: { name: "VF-6SS", travels: { x: 1626, y: 813, z: 762 }, spindle: { maxRpm: 12000, power: 22.4 }, rapid: 1524, toolCapacity: 30, taper: "CAT40", highSpeed: true },
            vf_7: { name: "VF-7", travels: { x: 2134, y: 813, z: 762 }, spindle: { maxRpm: 8100, power: 22.4 }, rapid: 1016, toolCapacity: 24, taper: "CAT40" },
            vf_8: { name: "VF-8", travels: { x: 1626, y: 1016, z: 762 }, spindle: { maxRpm: 8100, power: 22.4 }, rapid: 1016, toolCapacity: 24, taper: "CAT40" },
            vf_9: { name: "VF-9", travels: { x: 2134, y: 1016, z: 762 }, spindle: { maxRpm: 8100, power: 22.4 }, rapid: 1016, toolCapacity: 24, taper: "CAT40" },
            vf_10: { name: "VF-10", travels: { x: 3048, y: 813, z: 762 }, spindle: { maxRpm: 8100, power: 22.4 }, rapid: 1016, toolCapacity: 24, taper: "CAT40" },
            vf_11: { name: "VF-11", travels: { x: 3048, y: 1016, z: 762 }, spindle: { maxRpm: 8100, power: 22.4 }, rapid: 1016, toolCapacity: 24, taper: "CAT40" },
            vf_12: { name: "VF-12", travels: { x: 3810, y: 813, z: 762 }, spindle: { maxRpm: 8100, power: 22.4 }, rapid: 1016, toolCapacity: 24, taper: "CAT40" },

            // VF-50 Taper Series
            vf_5_50: { name: "VF-5/50", travels: { x: 1270, y: 660, z: 635 }, spindle: { maxRpm: 7500, power: 22.4 }, rapid: 1016, toolCapacity: 30, taper: "CAT50" },
            vf_6_50: { name: "VF-6/50", travels: { x: 1626, y: 813, z: 762 }, spindle: { maxRpm: 7500, power: 22.4 }, rapid: 1016, toolCapacity: 30, taper: "CAT50" },

            // VR Series (5-axis)
            vr_8: { name: "VR-8", travels: { x: 1626, y: 1016, z: 762 }, spindle: { maxRpm: 8100, power: 22.4 }, rapid: 1016, toolCapacity: 24, taper: "CAT40", axes: 5, rotary: { a: 240, c: 360 } },
            vr_9: { name: "VR-9", travels: { x: 2134, y: 1016, z: 762 }, spindle: { maxRpm: 8100, power: 22.4 }, rapid: 1016, toolCapacity: 24, taper: "CAT40", axes: 5, rotary: { a: 240, c: 360 } },
            vr_11: { name: "VR-11", travels: { x: 3048, y: 1016, z: 762 }, spindle: { maxRpm: 8100, power: 22.4 }, rapid: 1016, toolCapacity: 24, taper: "CAT40", axes: 5, rotary: { a: 240, c: 360 } },

            // UMC Series (5-axis Universal)
            umc_500: { name: "UMC-500", travels: { x: 508, y: 406, z: 394 }, spindle: { maxRpm: 8100, power: 22.4 }, rapid: 1016, toolCapacity: 40, taper: "CAT40", axes: 5, rotary: { a: 120, c: 360 }, trunnion: true },
            umc_500ss: { name: "UMC-500SS", travels: { x: 508, y: 406, z: 394 }, spindle: { maxRpm: 15000, power: 22.4 }, rapid: 1524, toolCapacity: 40, taper: "CAT40", axes: 5, rotary: { a: 120, c: 360 }, trunnion: true, highSpeed: true },
            umc_750: { name: "UMC-750", travels: { x: 762, y: 508, z: 508 }, spindle: { maxRpm: 8100, power: 22.4 }, rapid: 1016, toolCapacity: 40, taper: "CAT40", axes: 5, rotary: { a: 120, c: 360 }, trunnion: true },
            umc_750ss: { name: "UMC-750SS", travels: { x: 762, y: 508, z: 508 }, spindle: { maxRpm: 15000, power: 22.4 }, rapid: 1524, toolCapacity: 40, taper: "CAT40", axes: 5, rotary: { a: 120, c: 360 }, trunnion: true, highSpeed: true },
            umc_750p: { name: "UMC-750P", travels: { x: 762, y: 508, z: 508 }, spindle: { maxRpm: 8100, power: 22.4 }, rapid: 1016, toolCapacity: 40, taper: "CAT40", axes: 5, rotary: { a: 120, c: 360 }, trunnion: true, pallet: true },
            umc_1000: { name: "UMC-1000", travels: { x: 1016, y: 635, z: 635 }, spindle: { maxRpm: 8100, power: 22.4 }, rapid: 1016, toolCapacity: 40, taper: "CAT40", axes: 5, rotary: { a: 120, c: 360 }, trunnion: true },
            umc_1000ss: { name: "UMC-1000SS", travels: { x: 1016, y: 635, z: 635 }, spindle: { maxRpm: 15000, power: 22.4 }, rapid: 1524, toolCapacity: 40, taper: "CAT40", axes: 5, rotary: { a: 120, c: 360 }, trunnion: true, highSpeed: true },
            umc_1500ss_duo: { name: "UMC-1500SS-DUO", travels: { x: 1524, y: 660, z: 635 }, spindle: { maxRpm: 12000, power: 22.4 }, rapid: 1524, toolCapacity: 50, taper: "CAT40", axes: 5, rotary: { a: 150, c: 360 }, trunnion: true, highSpeed: true, dual: true },

            // DM Series (Drill/Mill)
            dm_1: { name: "DM-1", travels: { x: 508, y: 406, z: 394 }, spindle: { maxRpm: 15000, power: 11.2 }, rapid: 1524, toolCapacity: 18, taper: "BT30" },
            dm_2: { name: "DM-2", travels: { x: 711, y: 406, z: 394 }, spindle: { maxRpm: 15000, power: 11.2 }, rapid: 1524, toolCapacity: 18, taper: "BT30" },

            // TM Series (Toolroom)
            tm_1: { name: "TM-1", travels: { x: 762, y: 305, z: 406 }, spindle: { maxRpm: 4000, power: 5.6 }, rapid: 508, toolCapacity: 10, taper: "CAT40", toolroom: true },
            tm_1p: { name: "TM-1P", travels: { x: 762, y: 305, z: 406 }, spindle: { maxRpm: 6000, power: 5.6 }, rapid: 635, toolCapacity: 10, taper: "CAT40", toolroom: true },
            tm_2: { name: "TM-2", travels: { x: 1016, y: 406, z: 406 }, spindle: { maxRpm: 4000, power: 5.6 }, rapid: 508, toolCapacity: 10, taper: "CAT40", toolroom: true },
            tm_2p: { name: "TM-2P", travels: { x: 1016, y: 406, z: 406 }, spindle: { maxRpm: 6000, power: 5.6 }, rapid: 635, toolCapacity: 10, taper: "CAT40", toolroom: true },
            tm_3: { name: "TM-3", travels: { x: 1016, y: 660, z: 406 }, spindle: { maxRpm: 4000, power: 5.6 }, rapid: 508, toolCapacity: 10, taper: "CAT40", toolroom: true },
            tm_3p: { name: "TM-3P", travels: { x: 1016, y: 660, z: 406 }, spindle: { maxRpm: 6000, power: 5.6 }, rapid: 635, toolCapacity: 10, taper: "CAT40", toolroom: true },

            // GR Series (Gantry Router)
            gr_510: { name: "GR-510", travels: { x: 3073, y: 1549, z: 229 }, spindle: { maxRpm: 30000, power: 22.4 }, rapid: 2032, toolCapacity: 10, taper: "ISO30", router: true },
            gr_712: { name: "GR-712", travels: { x: 3683, y: 2159, z: 279 }, spindle: { maxRpm: 30000, power: 22.4 }, rapid: 2032, toolCapacity: 10, taper: "ISO30", router: true }
        },
        // Haas NGC Controller Features
        features: {
            hsm: { code: "G187", modes: { rough: "P1", medium: "P2", finish: "P3" }, tolerance: "E" },
            tsc: { on: "M88", off: "M89", pressure: "300-1000 PSI" },
            flood: { on: "M8", off: "M9" },
            mist: { on: "M7", off: "M9" },
            airBlast: { on: "M83", off: "M84" },
            thruSpindleAir: { on: "M73", off: "M74" },
            chipConveyor: { fwd: "M31", rev: "M32", off: "M33" },
            rigidTap: { code: "G84", sync: "M29" },
            probing: { type: "wips", probe: "G65 P9832", toolSetter: "G65 P9023" },
            fiveAxis: { tcp: "G234", dwo: "G254", dwoff: "G255", rotaryBrakeA: "M10", rotaryUnclampA: "M11", rotaryBrakeC: "M12", rotaryUnclampC: "M13" },
            ssv: { on: "G10", off: "G11", range: "5-15%" },
            subprograms: { call: "M98", local: "M97", return: "M99" },
            workOffsets: { standard: "G54-G59", extended: "G154 P1-P99", additional: "G110-G129" }
        }
    },
    // HAAS LATHES
    haas_lathes: {
        manufacturer: "Haas",
        type: "lathe",
        controller: "haas_ngc",
        dialect: "fanuc",

        machines: {
            // ST Series - Standard
            st_10: { name: "ST-10", swing: 413, barCap: 44, travels: { x: 203, z: 356 }, spindle: { maxRpm: 6000, power: 11.2 }, turret: 12 },
            st_10y: { name: "ST-10Y", swing: 413, barCap: 44, travels: { x: 203, y: 102, z: 356 }, spindle: { maxRpm: 6000, power: 11.2 }, turret: 12, yAxis: true, liveTool: true },
            st_15: { name: "ST-15", swing: 413, barCap: 51, travels: { x: 203, z: 406 }, spindle: { maxRpm: 4800, power: 14.9 }, turret: 12 },
            st_15y: { name: "ST-15Y", swing: 413, barCap: 51, travels: { x: 203, y: 102, z: 406 }, spindle: { maxRpm: 4800, power: 14.9 }, turret: 12, yAxis: true, liveTool: true },
            st_20: { name: "ST-20", swing: 527, barCap: 51, travels: { x: 210, z: 533 }, spindle: { maxRpm: 4000, power: 14.9 }, turret: 12 },
            st_20y: { name: "ST-20Y", swing: 527, barCap: 51, travels: { x: 210, y: 102, z: 533 }, spindle: { maxRpm: 4000, power: 14.9 }, turret: 12, yAxis: true, liveTool: true },
            st_20ss: { name: "ST-20SS", swing: 527, barCap: 51, travels: { x: 210, z: 533 }, spindle: { maxRpm: 5000, power: 14.9 }, turret: 12, subSpindle: true },
            st_25: { name: "ST-25", swing: 648, barCap: 76, travels: { x: 264, z: 610 }, spindle: { maxRpm: 3400, power: 22.4 }, turret: 12 },
            st_25y: { name: "ST-25Y", swing: 648, barCap: 76, travels: { x: 264, y: 102, z: 610 }, spindle: { maxRpm: 3400, power: 22.4 }, turret: 12, yAxis: true, liveTool: true },
            st_30: { name: "ST-30", swing: 806, barCap: 76, travels: { x: 330, z: 660 }, spindle: { maxRpm: 3400, power: 22.4 }, turret: 12 },
            st_30y: { name: "ST-30Y", swing: 806, barCap: 76, travels: { x: 330, y: 152, z: 660 }, spindle: { maxRpm: 3400, power: 22.4 }, turret: 12, yAxis: true, liveTool: true },
            st_30ss: { name: "ST-30SS", swing: 806, barCap: 76, travels: { x: 330, z: 660 }, spindle: { maxRpm: 3400, power: 22.4 }, turret: 12, subSpindle: true },
            st_35: { name: "ST-35", swing: 806, barCap: 102, travels: { x: 318, z: 889 }, spindle: { maxRpm: 2400, power: 22.4 }, turret: 12 },
            st_35y: { name: "ST-35Y", swing: 806, barCap: 102, travels: { x: 318, y: 152, z: 889 }, spindle: { maxRpm: 2400, power: 22.4 }, turret: 12, yAxis: true, liveTool: true },
            st_40: { name: "ST-40", swing: 648, barCap: 102, travels: { x: 318, z: 1016 }, spindle: { maxRpm: 2400, power: 29.8 }, turret: 12 },
            st_40l: { name: "ST-40L", swing: 648, barCap: 102, travels: { x: 318, z: 1524 }, spindle: { maxRpm: 2400, power: 29.8 }, turret: 12 },
            st_45: { name: "ST-45", swing: 648, barCap: 114, travels: { x: 318, z: 1524 }, spindle: { maxRpm: 1800, power: 29.8 }, turret: 12 },
            st_45l: { name: "ST-45L", swing: 648, barCap: 114, travels: { x: 318, z: 2032 }, spindle: { maxRpm: 1800, power: 29.8 }, turret: 12 },

            // DS Series (Dual Spindle)
            ds_30: { name: "DS-30", swing: 806, barCap: 76, travels: { x: 330, z: 569 }, spindle: { maxRpm: 4000, power: 22.4 }, turret: 12, subSpindle: true, dualTurret: false },
            ds_30y: { name: "DS-30Y", swing: 806, barCap: 76, travels: { x: 330, y: 102, z: 569 }, spindle: { maxRpm: 4000, power: 22.4 }, turret: 12, subSpindle: true, yAxis: true, liveTool: true },
            ds_30ssy: { name: "DS-30SSY", swing: 806, barCap: 76, travels: { x: 330, y: 102, z: 569 }, spindle: { maxRpm: 4000, power: 22.4 }, turret: 24, subSpindle: true, yAxis: true, liveTool: true, dualTurret: true },

            // TL Series (Toolroom Lathe)
            tl_1: { name: "TL-1", swing: 406, barCap: 38, travels: { x: 152, z: 305 }, spindle: { maxRpm: 3000, power: 5.6 }, turret: 8, toolroom: true },
            tl_2: { name: "TL-2", swing: 508, barCap: 76, travels: { x: 203, z: 508 }, spindle: { maxRpm: 2000, power: 7.5 }, turret: 8, toolroom: true },
            tl_3: { name: "TL-3", swing: 610, barCap: 0, travels: { x: 254, z: 762 }, spindle: { maxRpm: 1800, power: 11.2 }, turret: 0, toolroom: true, manualTurret: true }
        },
        features: {
            css: { code: "G96", cancel: "G97" },
            threading: { code: "G76", multiStart: true },
            grooving: { code: "G75" },
            rigidTap: { code: "G84", sync: "M29" },
            partCatcher: { on: "M51", off: "M52" },
            barFeeder: { advance: "M21", clamp: "M22" },
            tailstock: { advance: "M14", retract: "M15" },
            chuckClamp: { clamp: "M10", unclamp: "M11" },
            subSpindle: { forward: "M14", reverse: "M15", sync: "G68" },
            liveTool: { on: "M133", off: "M135", rigid: "M134" },
            ssv: { on: "M38", off: "M39", range: "5-15%" },
            coolant: { flood: { on: "M8", off: "M9" }, tsc: { on: "M88", off: "M89" } }
        }
    },
    // OKUMA MILLS
    okuma_mills: {
        manufacturer: "Okuma",
        type: "mill",
        controller: "okuma_osp",
        dialect: "okuma",

        machines: {
            // GENOS M Series
            genos_m460_v: { name: "GENOS M460-V", travels: { x: 762, y: 460, z: 460 }, spindle: { maxRpm: 15000, power: 22 }, rapid: 1200, toolCapacity: 32, taper: "CAT40" },
            genos_m560_v: { name: "GENOS M560-V", travels: { x: 1050, y: 560, z: 460 }, spindle: { maxRpm: 15000, power: 30 }, rapid: 1200, toolCapacity: 32, taper: "CAT40" },
            genos_m660_v: { name: "GENOS M660-V", travels: { x: 1300, y: 660, z: 540 }, spindle: { maxRpm: 15000, power: 30 }, rapid: 1200, toolCapacity: 32, taper: "CAT40" },
            genos_m560_v_5ax: { name: "GENOS M560-V-5AX", travels: { x: 1050, y: 560, z: 510 }, spindle: { maxRpm: 15000, power: 30 }, rapid: 1200, toolCapacity: 48, taper: "CAT40", axes: 5, rotary: { a: 150, c: 360 } },

            // MB Series (Double Column)
            mb_46vae: { name: "MB-46VAE", travels: { x: 762, y: 460, z: 460 }, spindle: { maxRpm: 8000, power: 18.5 }, rapid: 1000, toolCapacity: 32, taper: "CAT40" },
            mb_56vae: { name: "MB-56VAE", travels: { x: 1050, y: 560, z: 510 }, spindle: { maxRpm: 8000, power: 22 }, rapid: 1000, toolCapacity: 48, taper: "CAT40" },
            mb_66vae: { name: "MB-66VAE", travels: { x: 1300, y: 660, z: 610 }, spindle: { maxRpm: 8000, power: 22 }, rapid: 1000, toolCapacity: 48, taper: "CAT40" },

            // MU-V Series (5-Axis)
            mu_4000v: { name: "MU-4000V", travels: { x: 600, y: 550, z: 500 }, spindle: { maxRpm: 15000, power: 22 }, rapid: 1000, toolCapacity: 32, taper: "CAT40", axes: 5, rotary: { a: 150, c: 360 } },
            mu_5000v: { name: "MU-5000V", travels: { x: 762, y: 610, z: 510 }, spindle: { maxRpm: 20000, power: 26 }, rapid: 1000, toolCapacity: 48, taper: "HSK-A63", axes: 5, rotary: { a: 150, c: 360 } },
            mu_6300v: { name: "MU-6300V", travels: { x: 1050, y: 650, z: 600 }, spindle: { maxRpm: 15000, power: 30 }, rapid: 1000, toolCapacity: 64, taper: "HSK-A63", axes: 5, rotary: { a: 150, c: 360 } },
            mu_8000v: { name: "MU-8000V", travels: { x: 1200, y: 900, z: 700 }, spindle: { maxRpm: 12000, power: 37 }, rapid: 800, toolCapacity: 80, taper: "HSK-A100", axes: 5, rotary: { a: 150, c: 360 } },

            // MA Series (Horizontal)
            ma_400ha: { name: "MA-400HA", travels: { x: 560, y: 560, z: 625 }, spindle: { maxRpm: 12000, power: 22 }, rapid: 1000, toolCapacity: 40, taper: "CAT40", horizontal: true, pallet: 400 },
            ma_500hb: { name: "MA-500HB", travels: { x: 730, y: 650, z: 780 }, spindle: { maxRpm: 10000, power: 26 }, rapid: 1000, toolCapacity: 60, taper: "CAT50", horizontal: true, pallet: 500 },
            ma_600hb: { name: "MA-600HB", travels: { x: 900, y: 800, z: 880 }, spindle: { maxRpm: 8000, power: 30 }, rapid: 800, toolCapacity: 80, taper: "CAT50", horizontal: true, pallet: 630 },

            // MCR Series (Double Column)
            mcr_a5cii: { name: "MCR-A5CII", travels: { x: 3050, y: 1600, z: 1000 }, spindle: { maxRpm: 10000, power: 37 }, rapid: 600, toolCapacity: 60, taper: "CAT50", doubleColumn: true }
        },
        features: {
            hsm: { code: "G131", modes: { quality: "P1-P5" }, superNurbs: true },
            hpcc: { code: "G08 P1", desc: "High Precision Contour Control" },
            tcp: { on: "G169", off: "G170" },
            tiltedPlane: { code: "G68.2" },
            coolant: { flood: { on: "M8", off: "M9" }, tsc: { on: "M51", off: "M59" }, air: { on: "M77", off: "M78" } },
            ssv: { on: "M695", off: "M694", range: "3-20%" },
            probing: { touch: "G65 P9810", toolSet: "G65 P9820" },
            cas: { code: "CAS", desc: "Collision Avoidance System" },
            subprograms: { call: "CALL", return: "RET" },
            workOffsets: { standard: "G54-G59", extended: "G15 H1-H100" }
        }
    },
    // OKUMA LATHES
    okuma_lathes: {
        manufacturer: "Okuma",
        type: "lathe",
        controller: "okuma_osp",
        dialect: "okuma",

        machines: {
            // GENOS L Series
            genos_l200e_m: { name: "GENOS L200E-M", swing: 240, barCap: 51, travels: { x: 155, z: 280 }, spindle: { maxRpm: 5000, power: 11 }, turret: 12 },
            genos_l200e_my: { name: "GENOS L200E-MY", swing: 240, barCap: 51, travels: { x: 155, y: 50, z: 280 }, spindle: { maxRpm: 5000, power: 11 }, turret: 12, yAxis: true, liveTool: true },
            genos_l250e: { name: "GENOS L250E", swing: 290, barCap: 65, travels: { x: 170, z: 400 }, spindle: { maxRpm: 4500, power: 15 }, turret: 12 },
            genos_l300e_m: { name: "GENOS L300E-M", swing: 340, barCap: 80, travels: { x: 195, z: 500 }, spindle: { maxRpm: 4000, power: 18.5 }, turret: 12 },
            genos_l300e_my: { name: "GENOS L300E-MY", swing: 340, barCap: 80, travels: { x: 195, y: 80, z: 500 }, spindle: { maxRpm: 4000, power: 18.5 }, turret: 12, yAxis: true, liveTool: true },
            genos_l400e: { name: "GENOS L400E", swing: 440, barCap: 102, travels: { x: 240, z: 700 }, spindle: { maxRpm: 3000, power: 22 }, turret: 12 },

            // LB-EX II Series
            lb3000_exii: { name: "LB3000 EXII", swing: 380, barCap: 80, travels: { x: 220, z: 500 }, spindle: { maxRpm: 4500, power: 22 }, turret: 12 },
            lb3000_exii_my: { name: "LB3000 EXII MY", swing: 380, barCap: 80, travels: { x: 220, y: 80, z: 500 }, spindle: { maxRpm: 4500, power: 22 }, turret: 12, yAxis: true, liveTool: true },
            lb4000_exii: { name: "LB4000 EXII", swing: 480, barCap: 102, travels: { x: 260, z: 750 }, spindle: { maxRpm: 3500, power: 30 }, turret: 12 },
            lb4000_exii_my: { name: "LB4000 EXII MY", swing: 480, barCap: 102, travels: { x: 260, y: 100, z: 750 }, spindle: { maxRpm: 3500, power: 30 }, turret: 12, yAxis: true, liveTool: true },

            // LU-S Series (High Accuracy)
            lu_s1600: { name: "LU-S1600", swing: 400, barCap: 65, travels: { x: 200, z: 500 }, spindle: { maxRpm: 5000, power: 18.5 }, turret: 12, highAccuracy: true },
            lu_s2000: { name: "LU-S2000", swing: 520, barCap: 80, travels: { x: 250, z: 650 }, spindle: { maxRpm: 4000, power: 22 }, turret: 12, highAccuracy: true },

            // MULTUS Series (Multi-Tasking)
            multus_b200ii: { name: "MULTUS B200II", swing: 260, barCap: 65, travels: { x: 145, y: 160, z: 590, b: 225 }, spindle: { maxRpm: 5000, power: 15 }, turret: 12, yAxis: true, bAxis: true, millTurn: true },
            multus_b300ii: { name: "MULTUS B300II", swing: 380, barCap: 80, travels: { x: 200, y: 200, z: 800, b: 225 }, spindle: { maxRpm: 4000, power: 22 }, turret: 12, yAxis: true, bAxis: true, millTurn: true },
            multus_b400ii: { name: "MULTUS B400II", swing: 540, barCap: 102, travels: { x: 280, y: 280, z: 1000, b: 225 }, spindle: { maxRpm: 3500, power: 30 }, turret: 12, yAxis: true, bAxis: true, millTurn: true },
            multus_u3000: { name: "MULTUS U3000", swing: 380, barCap: 80, travels: { x: 200, y: 200, z: 850 }, spindle: { maxRpm: 4500, power: 26 }, turret: 24, yAxis: true, millTurn: true, upperTurret: true }
        },
        features: {
            css: { code: "G96", cancel: "G97" },
            threading: { code: "G76", multiStart: true },
            ssv: { on: "M695", off: "M694", range: "3-20%" },
            liveTool: { on: "M135", off: "M134" },
            tailstock: { advance: "M14", retract: "M15" },
            subSpindle: { sync: "G68.1" },
            coolant: { flood: { on: "M8", off: "M9" }, tsc: { on: "M51", off: "M59" } }
        }
    },
    // MAZAK MILLS
    mazak_mills: {
        manufacturer: "Mazak",
        type: "mill",
        controller: "mazak_smooth",
        dialect: "mazak",

        machines: {
            // VCN Series
            vcn_430a: { name: "VCN-430A", travels: { x: 560, y: 410, z: 460 }, spindle: { maxRpm: 12000, power: 18.5 }, rapid: 1260, toolCapacity: 30, taper: "CAT40" },
            vcn_510c: { name: "VCN-510C", travels: { x: 760, y: 510, z: 510 }, spindle: { maxRpm: 12000, power: 22 }, rapid: 1260, toolCapacity: 30, taper: "CAT40" },
            vcn_530c: { name: "VCN-530C", travels: { x: 1050, y: 530, z: 510 }, spindle: { maxRpm: 12000, power: 22 }, rapid: 1260, toolCapacity: 30, taper: "CAT40" },
            vcn_700: { name: "VCN-700", travels: { x: 1500, y: 700, z: 650 }, spindle: { maxRpm: 10000, power: 30 }, rapid: 1000, toolCapacity: 48, taper: "CAT50" },

            // VCE Series
            vce_500: { name: "VCE-500", travels: { x: 762, y: 510, z: 460 }, spindle: { maxRpm: 12000, power: 18.5 }, rapid: 1260, toolCapacity: 24, taper: "CAT40" },
            vce_600: { name: "VCE-600", travels: { x: 1050, y: 610, z: 510 }, spindle: { maxRpm: 12000, power: 22 }, rapid: 1260, toolCapacity: 24, taper: "CAT40" },

            // VARIAXIS Series (5-Axis)
            variaxis_i_500: { name: "VARIAXIS i-500", travels: { x: 500, y: 550, z: 510 }, spindle: { maxRpm: 12000, power: 22 }, rapid: 1260, toolCapacity: 30, taper: "CAT40", axes: 5, rotary: { a: 150, c: 360 } },
            variaxis_i_600: { name: "VARIAXIS i-600", travels: { x: 600, y: 650, z: 600 }, spindle: { maxRpm: 15000, power: 26 }, rapid: 1260, toolCapacity: 40, taper: "HSK-A63", axes: 5, rotary: { a: 150, c: 360 } },
            variaxis_i_700: { name: "VARIAXIS i-700", travels: { x: 730, y: 850, z: 560 }, spindle: { maxRpm: 18000, power: 37 }, rapid: 1260, toolCapacity: 60, taper: "HSK-A63", axes: 5, rotary: { a: 150, c: 360 } },
            variaxis_i_800: { name: "VARIAXIS i-800", travels: { x: 850, y: 1050, z: 630 }, spindle: { maxRpm: 15000, power: 37 }, rapid: 1000, toolCapacity: 80, taper: "HSK-A100", axes: 5, rotary: { a: 150, c: 360 } },
            variaxis_c_600: { name: "VARIAXIS C-600", travels: { x: 600, y: 500, z: 500 }, spindle: { maxRpm: 12000, power: 22 }, rapid: 1260, toolCapacity: 40, taper: "CAT40", axes: 5, rotary: { a: 180, c: 360 } },

            // HCN Series (Horizontal)
            hcn_4000: { name: "HCN-4000", travels: { x: 560, y: 560, z: 660 }, spindle: { maxRpm: 12000, power: 22 }, rapid: 1260, toolCapacity: 40, taper: "CAT40", horizontal: true, pallet: 400 },
            hcn_5000: { name: "HCN-5000", travels: { x: 730, y: 650, z: 810 }, spindle: { maxRpm: 10000, power: 26 }, rapid: 1000, toolCapacity: 60, taper: "CAT50", horizontal: true, pallet: 500 },
            hcn_6000: { name: "HCN-6000", travels: { x: 900, y: 800, z: 980 }, spindle: { maxRpm: 8000, power: 30 }, rapid: 800, toolCapacity: 80, taper: "CAT50", horizontal: true, pallet: 630 },
            hcn_6800: { name: "HCN-6800", travels: { x: 1050, y: 920, z: 1020 }, spindle: { maxRpm: 6000, power: 37 }, rapid: 600, toolCapacity: 120, taper: "BT50", horizontal: true, pallet: 800 },

            // FJV Series (Double Column)
            fjv_250: { name: "FJV-250", travels: { x: 2540, y: 1016, z: 762 }, spindle: { maxRpm: 10000, power: 30 }, rapid: 800, toolCapacity: 60, taper: "CAT50", doubleColumn: true },
            fjv_350: { name: "FJV-350", travels: { x: 3556, y: 1270, z: 914 }, spindle: { maxRpm: 8000, power: 37 }, rapid: 600, toolCapacity: 80, taper: "CAT50", doubleColumn: true }
        },
        features: {
            hsm: { code: "G05.1 Q1", smoothAi: true },
            tcp: { code: "G43.4", tiltedPlane: "G68.2" },
            coolant: { flood: { on: "M8", off: "M9" }, tsc: { on: "M50", off: "M51" } },
            chipConveyor: { fwd: "M31", rev: "M32", off: "M33" },
            probing: { touch: "G65 P9810", toolSet: "G65 P9820" },
            ssv: { on: "M38", off: "M39" },
            subprograms: { call: "M98", return: "M99" },
            workOffsets: { standard: "G54-G59", extended: "G54.1 P1-P300" }
        }
    },
    // MAZAK LATHES
    mazak_lathes: {
        manufacturer: "Mazak",
        type: "lathe",
        controller: "mazak_smooth",
        dialect: "mazak",

        machines: {
            // QT Series
            qt_200: { name: "QT-200", swing: 320, barCap: 51, travels: { x: 170, z: 500 }, spindle: { maxRpm: 5000, power: 15 }, turret: 12 },
            qt_200my: { name: "QT-200MY", swing: 320, barCap: 51, travels: { x: 170, y: 50, z: 500 }, spindle: { maxRpm: 5000, power: 15 }, turret: 12, yAxis: true, liveTool: true },
            qt_250: { name: "QT-250", swing: 380, barCap: 65, travels: { x: 200, z: 650 }, spindle: { maxRpm: 4500, power: 22 }, turret: 12 },
            qt_250msy: { name: "QT-250MSY", swing: 380, barCap: 65, travels: { x: 200, y: 80, z: 650 }, spindle: { maxRpm: 4500, power: 22 }, turret: 12, yAxis: true, liveTool: true, subSpindle: true },
            qt_300: { name: "QT-300", swing: 480, barCap: 80, travels: { x: 250, z: 750 }, spindle: { maxRpm: 3500, power: 30 }, turret: 12 },
            qt_300my: { name: "QT-300MY", swing: 480, barCap: 80, travels: { x: 250, y: 100, z: 750 }, spindle: { maxRpm: 3500, power: 30 }, turret: 12, yAxis: true, liveTool: true },
            qt_350: { name: "QT-350", swing: 580, barCap: 102, travels: { x: 300, z: 1000 }, spindle: { maxRpm: 2500, power: 37 }, turret: 12 },
            qt_400: { name: "QT-400", swing: 680, barCap: 127, travels: { x: 350, z: 1250 }, spindle: { maxRpm: 2000, power: 45 }, turret: 12 },
            qt_450: { name: "QT-450", swing: 780, barCap: 165, travels: { x: 400, z: 1500 }, spindle: { maxRpm: 1500, power: 55 }, turret: 12 },

            // Quick Turn Nexus Series
            qtn_100: { name: "QTN-100", swing: 240, barCap: 42, travels: { x: 130, z: 260 }, spindle: { maxRpm: 6000, power: 11 }, turret: 12 },
            qtn_100my: { name: "QTN-100MY", swing: 240, barCap: 42, travels: { x: 130, y: 50, z: 260 }, spindle: { maxRpm: 6000, power: 11 }, turret: 12, yAxis: true, liveTool: true },
            qtn_150: { name: "QTN-150", swing: 320, barCap: 51, travels: { x: 170, z: 500 }, spindle: { maxRpm: 5000, power: 15 }, turret: 12 },
            qtn_200: { name: "QTN-200", swing: 380, barCap: 65, travels: { x: 200, z: 620 }, spindle: { maxRpm: 4500, power: 22 }, turret: 12 },
            qtn_250: { name: "QTN-250", swing: 480, barCap: 80, travels: { x: 250, z: 750 }, spindle: { maxRpm: 3500, power: 30 }, turret: 12 },
            qtn_300: { name: "QTN-300", swing: 580, barCap: 102, travels: { x: 300, z: 1000 }, spindle: { maxRpm: 2500, power: 37 }, turret: 12 },

            // INTEGREX Series (Multi-Tasking)
            integrex_i_100: { name: "INTEGREX i-100", swing: 260, barCap: 65, travels: { x: 150, y: 180, z: 590, b: 225 }, spindle: { maxRpm: 5000, power: 18.5 }, turret: 12, yAxis: true, bAxis: true, millTurn: true },
            integrex_i_200: { name: "INTEGREX i-200", swing: 380, barCap: 80, travels: { x: 200, y: 230, z: 800, b: 240 }, spindle: { maxRpm: 4000, power: 26 }, turret: 12, yAxis: true, bAxis: true, millTurn: true },
            integrex_i_300: { name: "INTEGREX i-300", swing: 540, barCap: 102, travels: { x: 280, y: 280, z: 1000, b: 240 }, spindle: { maxRpm: 3200, power: 37 }, turret: 12, yAxis: true, bAxis: true, millTurn: true },
            integrex_i_400: { name: "INTEGREX i-400", swing: 680, barCap: 127, travels: { x: 350, y: 350, z: 1250, b: 240 }, spindle: { maxRpm: 2500, power: 45 }, turret: 12, yAxis: true, bAxis: true, millTurn: true },
            integrex_e_ramtec: { name: "INTEGREX e-RAMTEC", swing: 1300, barCap: 0, travels: { x: 700, y: 350, z: 3000, b: 360 }, spindle: { maxRpm: 1000, power: 75 }, turret: 20, yAxis: true, bAxis: true, millTurn: true, ramType: true }
        },
        features: {
            css: { code: "G96", cancel: "G97" },
            threading: { code: "G76", multiStart: true },
            ssv: { on: "M38", off: "M39" },
            liveTool: { on: "M133", off: "M135" },
            subSpindle: { sync: "G68" },
            coolant: { flood: { on: "M8", off: "M9" }, tsc: { on: "M50", off: "M51" } },
            smoothAi: { enabled: true, chatterControl: true }
        }
    },
    // DMG MORI MILLS
    dmg_mori_mills: {
        manufacturer: "DMG MORI",
        type: "mill",
        controller: "siemens_840d",
        dialect: "siemens",

        machines: {
            // DMU Series (5-Axis Universal)
            dmu_50: { name: "DMU 50", travels: { x: 500, y: 450, z: 400 }, spindle: { maxRpm: 14000, power: 21 }, rapid: 1500, toolCapacity: 30, taper: "SK40", axes: 5, rotary: { a: 180, c: 360 } },
            dmu_50_3rd: { name: "DMU 50 3rd Gen", travels: { x: 650, y: 520, z: 475 }, spindle: { maxRpm: 15000, power: 25 }, rapid: 1500, toolCapacity: 60, taper: "SK40", axes: 5, rotary: { a: 180, c: 360 } },
            dmu_65: { name: "DMU 65", travels: { x: 650, y: 650, z: 560 }, spindle: { maxRpm: 18000, power: 35 }, rapid: 1200, toolCapacity: 60, taper: "HSK-A63", axes: 5, rotary: { a: 180, c: 360 } },
            dmu_80: { name: "DMU 80", travels: { x: 800, y: 650, z: 600 }, spindle: { maxRpm: 14000, power: 35 }, rapid: 1000, toolCapacity: 60, taper: "HSK-A63", axes: 5, rotary: { a: 180, c: 360 } },
            dmu_100: { name: "DMU 100", travels: { x: 1000, y: 800, z: 650 }, spindle: { maxRpm: 12000, power: 42 }, rapid: 800, toolCapacity: 80, taper: "HSK-A100", axes: 5, rotary: { a: 180, c: 360 } },
            dmu_125: { name: "DMU 125", travels: { x: 1250, y: 1000, z: 750 }, spindle: { maxRpm: 10000, power: 52 }, rapid: 600, toolCapacity: 120, taper: "HSK-A100", axes: 5, rotary: { a: 180, c: 360 } },
            dmu_160: { name: "DMU 160", travels: { x: 1600, y: 1250, z: 900 }, spindle: { maxRpm: 8000, power: 60 }, rapid: 500, toolCapacity: 160, taper: "HSK-A100", axes: 5, rotary: { a: 180, c: 360 } },
            dmu_200: { name: "DMU 200", travels: { x: 2000, y: 1400, z: 1100 }, spindle: { maxRpm: 6000, power: 75 }, rapid: 400, toolCapacity: 180, taper: "HSK-A125", axes: 5, rotary: { a: 180, c: 360 } },

            // DMU eVo Series (Linear Drive)
            dmu_40_evo: { name: "DMU 40 eVo", travels: { x: 400, y: 400, z: 375 }, spindle: { maxRpm: 24000, power: 25 }, rapid: 2000, toolCapacity: 40, taper: "HSK-A63", axes: 5, rotary: { a: 180, c: 360 }, linear: true },
            dmu_60_evo: { name: "DMU 60 eVo", travels: { x: 600, y: 500, z: 500 }, spindle: { maxRpm: 20000, power: 35 }, rapid: 1800, toolCapacity: 60, taper: "HSK-A63", axes: 5, rotary: { a: 180, c: 360 }, linear: true },
            dmu_80_evo: { name: "DMU 80 eVo", travels: { x: 800, y: 650, z: 550 }, spindle: { maxRpm: 18000, power: 42 }, rapid: 1500, toolCapacity: 80, taper: "HSK-A100", axes: 5, rotary: { a: 180, c: 360 }, linear: true },

            // DMC Series (3-Axis)
            dmc_635_v: { name: "DMC 635 V", travels: { x: 635, y: 510, z: 460 }, spindle: { maxRpm: 12000, power: 18 }, rapid: 1200, toolCapacity: 20, taper: "SK40" },
            dmc_850_v: { name: "DMC 850 V", travels: { x: 850, y: 510, z: 510 }, spindle: { maxRpm: 12000, power: 21 }, rapid: 1200, toolCapacity: 30, taper: "SK40" },
            dmc_1035_v: { name: "DMC 1035 V", travels: { x: 1035, y: 560, z: 510 }, spindle: { maxRpm: 12000, power: 25 }, rapid: 1200, toolCapacity: 30, taper: "SK40" },

            // NHX Series (Horizontal)
            nhx_4000: { name: "NHX 4000", travels: { x: 560, y: 560, z: 660 }, spindle: { maxRpm: 12000, power: 26 }, rapid: 1400, toolCapacity: 60, taper: "CAT40", horizontal: true, pallet: 400 },
            nhx_5000: { name: "NHX 5000", travels: { x: 730, y: 730, z: 880 }, spindle: { maxRpm: 10000, power: 35 }, rapid: 1200, toolCapacity: 90, taper: "CAT50", horizontal: true, pallet: 500 },
            nhx_6300: { name: "NHX 6300", travels: { x: 900, y: 900, z: 1000 }, spindle: { maxRpm: 8000, power: 45 }, rapid: 1000, toolCapacity: 120, taper: "CAT50", horizontal: true, pallet: 630 }
        },
        features: {
            hsm: { code: "CYCLE832", tolerance: "TOL", modes: { rough: "0.02", finish: "0.002" } },
            compressor: { on: "COMPCAD", curve: "COMPCURV", off: "COMPOF" },
            tcp: { traori: "TRAORI", off: "TRAFOOF", tcpm: "TCPM" },
            coolant: { flood: { on: "M8", off: "M9" }, tsc: { on: "COOLANT(1000)", off: "COOLANT(0)" } },
            probing: { cycle: "CYCLE977-979" },
            subprograms: { call: "CALL", return: "M17" },
            workOffsets: { standard: "G54-G59", extended: "G500-G599" }
        }
    },
    // DMG MORI LATHES
    dmg_mori_lathes: {
        manufacturer: "DMG MORI",
        type: "lathe",
        controller: "siemens_840d",
        dialect: "siemens",

        machines: {
            // NLX Series
            nlx_1500: { name: "NLX 1500", swing: 260, barCap: 52, travels: { x: 130, z: 410 }, spindle: { maxRpm: 6000, power: 11 }, turret: 10 },
            nlx_2000: { name: "NLX 2000", swing: 340, barCap: 65, travels: { x: 170, z: 500 }, spindle: { maxRpm: 5000, power: 18.5 }, turret: 12 },
            nlx_2500: { name: "NLX 2500", swing: 450, barCap: 80, travels: { x: 225, z: 700 }, spindle: { maxRpm: 4000, power: 26 }, turret: 12 },
            nlx_3000: { name: "NLX 3000", swing: 580, barCap: 102, travels: { x: 290, z: 1000 }, spindle: { maxRpm: 3000, power: 35 }, turret: 12 },
            nlx_2500y: { name: "NLX 2500/700Y", swing: 450, barCap: 80, travels: { x: 225, y: 120, z: 700 }, spindle: { maxRpm: 4000, power: 26 }, turret: 12, yAxis: true, liveTool: true },
            nlx_2500mc: { name: "NLX 2500MC", swing: 450, barCap: 80, travels: { x: 225, y: 120, z: 700 }, spindle: { maxRpm: 4000, power: 26 }, turret: 12, yAxis: true, liveTool: true, subSpindle: true },

            // NTX Series (Multi-Tasking)
            ntx_1000: { name: "NTX 1000", swing: 260, barCap: 65, travels: { x: 120, y: 150, z: 580, b: 230 }, spindle: { maxRpm: 5000, power: 15 }, turret: 10, yAxis: true, bAxis: true, millTurn: true },
            ntx_2000: { name: "NTX 2000", swing: 380, barCap: 80, travels: { x: 170, y: 200, z: 800, b: 240 }, spindle: { maxRpm: 4000, power: 22 }, turret: 12, yAxis: true, bAxis: true, millTurn: true },
            ntx_2500: { name: "NTX 2500", swing: 450, barCap: 102, travels: { x: 225, y: 280, z: 1000, b: 240 }, spindle: { maxRpm: 3000, power: 30 }, turret: 12, yAxis: true, bAxis: true, millTurn: true },
            ntx_3000: { name: "NTX 3000", swing: 580, barCap: 127, travels: { x: 290, y: 350, z: 1200, b: 240 }, spindle: { maxRpm: 2500, power: 37 }, turret: 12, yAxis: true, bAxis: true, millTurn: true },

            // CTX Series
            ctx_310_v1: { name: "CTX 310 ecoline", swing: 220, barCap: 42, travels: { x: 115, z: 250 }, spindle: { maxRpm: 5000, power: 10 }, turret: 8 },
            ctx_450: { name: "CTX 450", swing: 340, barCap: 65, travels: { x: 170, z: 550 }, spindle: { maxRpm: 5000, power: 18.5 }, turret: 12 },
            ctx_510_v1: { name: "CTX 510", swing: 420, barCap: 80, travels: { x: 210, z: 680 }, spindle: { maxRpm: 4000, power: 26 }, turret: 12 },
            ctx_510_y: { name: "CTX 510 Y", swing: 420, barCap: 80, travels: { x: 210, y: 100, z: 680 }, spindle: { maxRpm: 4000, power: 26 }, turret: 12, yAxis: true, liveTool: true },
            ctx_gamma_1250: { name: "CTX gamma 1250 TC", swing: 700, barCap: 0, travels: { x: 400, y: 250, z: 1500, b: 240 }, spindle: { maxRpm: 3000, power: 45 }, turret: 16, yAxis: true, bAxis: true, millTurn: true }
        },
        features: {
            css: { code: "G96", cancel: "G97" },
            threading: { code: "CYCLE97", multiStart: true },
            ssv: { on: "SSV", off: "SSVOFF" },
            liveTool: { on: "M133", off: "M135" },
            coolant: { flood: { on: "M8", off: "M9" }, tsc: { on: "COOLANT(1000)", off: "COOLANT(0)" } }
        }
    },
    // MAKINO MILLS
    makino_mills: {
        manufacturer: "Makino",
        type: "mill",
        controller: "makino_pro",
        dialect: "fanuc",

        machines: {
            // PS Series
            ps65: { name: "PS65", travels: { x: 650, y: 500, z: 450 }, spindle: { maxRpm: 14000, power: 18.5 }, rapid: 1200, toolCapacity: 20, taper: "CAT40" },
            ps95: { name: "PS95", travels: { x: 900, y: 500, z: 450 }, spindle: { maxRpm: 14000, power: 22 }, rapid: 1200, toolCapacity: 30, taper: "CAT40" },
            ps105: { name: "PS105", travels: { x: 1050, y: 600, z: 500 }, spindle: { maxRpm: 14000, power: 26 }, rapid: 1200, toolCapacity: 30, taper: "CAT40" },

            // V Series (High Speed)
            v33i: { name: "V33i", travels: { x: 650, y: 400, z: 350 }, spindle: { maxRpm: 30000, power: 14.8 }, rapid: 1800, toolCapacity: 20, taper: "HSK-E40", highSpeed: true },
            v56i: { name: "V56i", travels: { x: 900, y: 500, z: 450 }, spindle: { maxRpm: 20000, power: 26 }, rapid: 1500, toolCapacity: 30, taper: "HSK-A63", highSpeed: true },
            v80s: { name: "V80S", travels: { x: 1300, y: 600, z: 500 }, spindle: { maxRpm: 14000, power: 35 }, rapid: 1200, toolCapacity: 40, taper: "HSK-A63", highSpeed: true },

            // D Series (5-Axis)
            d200z: { name: "D200Z", travels: { x: 350, y: 300, z: 250 }, spindle: { maxRpm: 45000, power: 11 }, rapid: 2400, toolCapacity: 20, taper: "HSK-E32", axes: 5, rotary: { a: 180, c: 360 }, highSpeed: true },
            d300: { name: "D300", travels: { x: 450, y: 350, z: 300 }, spindle: { maxRpm: 30000, power: 14.8 }, rapid: 2100, toolCapacity: 30, taper: "HSK-E40", axes: 5, rotary: { a: 180, c: 360 } },
            d500: { name: "D500", travels: { x: 550, y: 550, z: 450 }, spindle: { maxRpm: 20000, power: 26 }, rapid: 1800, toolCapacity: 50, taper: "HSK-A63", axes: 5, rotary: { a: 180, c: 360 } },
            d800z: { name: "D800Z", travels: { x: 800, y: 700, z: 500 }, spindle: { maxRpm: 14000, power: 35 }, rapid: 1500, toolCapacity: 80, taper: "HSK-A100", axes: 5, rotary: { a: 180, c: 360 } },

            // a Series (Horizontal)
            a51nx: { name: "a51nx", travels: { x: 560, y: 560, z: 640 }, spindle: { maxRpm: 14000, power: 26 }, rapid: 1400, toolCapacity: 60, taper: "CAT40", horizontal: true, pallet: 400 },
            a61nx: { name: "a61nx", travels: { x: 730, y: 650, z: 800 }, spindle: { maxRpm: 12000, power: 35 }, rapid: 1200, toolCapacity: 80, taper: "CAT50", horizontal: true, pallet: 500 },
            a71nx: { name: "a71nx", travels: { x: 900, y: 900, z: 1000 }, spindle: { maxRpm: 10000, power: 45 }, rapid: 1000, toolCapacity: 120, taper: "CAT50", horizontal: true, pallet: 630 },
            a81nx: { name: "a81nx", travels: { x: 1050, y: 1050, z: 1100 }, spindle: { maxRpm: 8000, power: 55 }, rapid: 800, toolCapacity: 160, taper: "BT50", horizontal: true, pallet: 800 }
        },
        features: {
            hsm: { code: "G05 P2", sgi: true, geoMotion: "G05 P10000" },
            tcp: { code: "G43.4", tiltedPlane: "G68.2" },
            coolant: { flood: { on: "M8", off: "M9" }, tsc: { on: "M51", off: "M59" } },
            probing: { touch: "G65 P9810", toolSet: "G65 P9820" },
            subprograms: { call: "M98", return: "M99" },
            workOffsets: { standard: "G54-G59", extended: "G54.1 P1-P48" }
        }
    },
    // HURCO MILLS
    hurco_mills: {
        manufacturer: "Hurco",
        type: "mill",
        controller: "hurco_winmax",
        dialect: "hurco",

        machines: {
            // VM Series
            vm_5i: { name: "VM5i", travels: { x: 457, y: 356, z: 356 }, spindle: { maxRpm: 10000, power: 11.2 }, rapid: 762, toolCapacity: 16, taper: "CAT40" },
            vm_10ui: { name: "VM10Ui", travels: { x: 660, y: 406, z: 508 }, spindle: { maxRpm: 12000, power: 15 }, rapid: 1016, toolCapacity: 24, taper: "CAT40" },
            vm_20i: { name: "VM20i", travels: { x: 1016, y: 508, z: 508 }, spindle: { maxRpm: 10000, power: 22.4 }, rapid: 1016, toolCapacity: 24, taper: "CAT40" },
            vm_30i: { name: "VM30i", travels: { x: 1270, y: 610, z: 610 }, spindle: { maxRpm: 10000, power: 22.4 }, rapid: 1016, toolCapacity: 30, taper: "CAT40" },
            vm_40i: { name: "VM40i", travels: { x: 1524, y: 660, z: 660 }, spindle: { maxRpm: 10000, power: 29.8 }, rapid: 1016, toolCapacity: 40, taper: "CAT50" },

            // VMX Series (Premium)
            vmx_24i: { name: "VMX24i", travels: { x: 610, y: 508, z: 508 }, spindle: { maxRpm: 12000, power: 22.4 }, rapid: 1524, toolCapacity: 24, taper: "CAT40" },
            vmx_30i: { name: "VMX30i", travels: { x: 762, y: 508, z: 508 }, spindle: { maxRpm: 12000, power: 22.4 }, rapid: 1524, toolCapacity: 24, taper: "CAT40" },
            vmx_42i: { name: "VMX42i", travels: { x: 1067, y: 610, z: 610 }, spindle: { maxRpm: 12000, power: 29.8 }, rapid: 1524, toolCapacity: 40, taper: "CAT40" },
            vmx_50i: { name: "VMX50i", travels: { x: 1270, y: 660, z: 660 }, spindle: { maxRpm: 12000, power: 29.8 }, rapid: 1524, toolCapacity: 40, taper: "CAT50" },
            vmx_60i: { name: "VMX60i", travels: { x: 1524, y: 660, z: 660 }, spindle: { maxRpm: 10000, power: 37.3 }, rapid: 1524, toolCapacity: 50, taper: "CAT50" },

            // VMX 5-Axis
            vmx_30uti: { name: "VMX30Uti", travels: { x: 762, y: 508, z: 508 }, spindle: { maxRpm: 12000, power: 22.4 }, rapid: 1524, toolCapacity: 40, taper: "CAT40", axes: 5, rotary: { a: 120, c: 360 } },
            vmx_42sri: { name: "VMX42SRi", travels: { x: 1067, y: 610, z: 610 }, spindle: { maxRpm: 12000, power: 29.8 }, rapid: 1524, toolCapacity: 40, taper: "CAT40", axes: 5, rotary: { a: 120, c: 360 } }
        },
        features: {
            hsm: { code: "G05.3", ultimotion: true, tolerance: "P5-P50" },
            tcp: { code: "G234" },
            coolant: { flood: { on: "M8", off: "M9" }, tsc: { on: "M98 P9015", off: "M98 P9016" } },
            probing: { touch: "G65 P9810", toolSet: "G65 P9820" },
            subprograms: { call: "M98", return: "M99" },
            workOffsets: { standard: "G54-G59", extended: "G154 P1-P99" }
        }
    },
    // FANUC (GENERIC / OEM BUILDS)
    fanuc_generic: {
        manufacturer: "FANUC",
        type: "mill",
        controller: "fanuc_0i",
        dialect: "fanuc",

        machines: {
            generic_vmc: { name: "Generic VMC (FANUC)", travels: { x: 800, y: 500, z: 500 }, spindle: { maxRpm: 8000, power: 15 }, rapid: 1000, toolCapacity: 20, taper: "CAT40" },
            generic_hmc: { name: "Generic HMC (FANUC)", travels: { x: 800, y: 600, z: 700 }, spindle: { maxRpm: 8000, power: 22 }, rapid: 1000, toolCapacity: 40, taper: "CAT40", horizontal: true },
            fanuc_robodrill: { name: "FANUC Robodrill α-D21", travels: { x: 700, y: 400, z: 330 }, spindle: { maxRpm: 24000, power: 11 }, rapid: 1800, toolCapacity: 21, taper: "BT30", highSpeed: true }
        },
        features: {
            hsm: { code: "G05.1 Q1", aicc: true },
            tcp: { code: "G43.4" },
            coolant: { flood: { on: "M8", off: "M9" }, tsc: { on: "M51", off: "M59" } },
            subprograms: { call: "M98", return: "M99", macro: "G65" },
            workOffsets: { standard: "G54-G59", extended: "G54.1 P1-P48" }
        }
    },
    // BROTHER MILLS
    brother_mills: {
        manufacturer: "Brother",
        type: "mill",
        controller: "brother_cnc",
        dialect: "fanuc",

        machines: {
            speedio_s300x1: { name: "Speedio S300X1", travels: { x: 300, y: 440, z: 305 }, spindle: { maxRpm: 16000, power: 5.5 }, rapid: 1260, toolCapacity: 14, taper: "BT30", highSpeed: true, toolChange: 0.9 },
            speedio_s500x1: { name: "Speedio S500X1", travels: { x: 500, y: 440, z: 305 }, spindle: { maxRpm: 16000, power: 7.5 }, rapid: 1260, toolCapacity: 21, taper: "BT30", highSpeed: true, toolChange: 0.9 },
            speedio_s700x1: { name: "Speedio S700X1", travels: { x: 700, y: 440, z: 305 }, spindle: { maxRpm: 16000, power: 7.5 }, rapid: 1260, toolCapacity: 21, taper: "BT30", highSpeed: true, toolChange: 0.9 },
            speedio_s700x2: { name: "Speedio S700X2", travels: { x: 700, y: 400, z: 305 }, spindle: { maxRpm: 16000, power: 11 }, rapid: 1512, toolCapacity: 21, taper: "BT30", highSpeed: true, toolChange: 0.9 },
            speedio_s1000x1: { name: "Speedio S1000X1", travels: { x: 1000, y: 500, z: 305 }, spindle: { maxRpm: 16000, power: 11 }, rapid: 1260, toolCapacity: 21, taper: "BT30", highSpeed: true, toolChange: 1.2 },
            speedio_m140x2: { name: "Speedio M140X2", travels: { x: 200, y: 440, z: 305 }, spindle: { maxRpm: 16000, power: 7.5 }, rapid: 1260, toolCapacity: 14, taper: "BT30", axes: 5, rotary: { a: 120, c: 360 } },
            speedio_u500xd1: { name: "Speedio U500Xd1", travels: { x: 500, y: 440, z: 330 }, spindle: { maxRpm: 16000, power: 11 }, rapid: 1260, toolCapacity: 22, taper: "BT30", axes: 5, rotary: { a: 120, c: 360 } }
        },
        features: {
            hsm: { code: "G05.1 Q1" },
            tcp: { code: "G43.4" },
            coolant: { flood: { on: "M8", off: "M9" }, tsc: { on: "M51", off: "M59" } },
            subprograms: { call: "M98", return: "M99" }
        }
    },
    // HERMLE MILLS
    hermle_mills: {
        manufacturer: "Hermle",
        type: "mill",
        controller: "heidenhain_tnc640",
        dialect: "heidenhain",

        machines: {
            c_12: { name: "C 12", travels: { x: 350, y: 440, z: 330 }, spindle: { maxRpm: 18000, power: 10 }, rapid: 1400, toolCapacity: 25, taper: "HSK-A40", axes: 5, rotary: { a: 180, c: 360 } },
            c_22: { name: "C 22", travels: { x: 450, y: 600, z: 330 }, spindle: { maxRpm: 18000, power: 15 }, rapid: 1400, toolCapacity: 36, taper: "HSK-A63", axes: 5, rotary: { a: 180, c: 360 } },
            c_32: { name: "C 32", travels: { x: 650, y: 650, z: 500 }, spindle: { maxRpm: 18000, power: 28 }, rapid: 1400, toolCapacity: 42, taper: "HSK-A63", axes: 5, rotary: { a: 240, c: 360 } },
            c_42: { name: "C 42", travels: { x: 800, y: 800, z: 550 }, spindle: { maxRpm: 18000, power: 35 }, rapid: 1400, toolCapacity: 86, taper: "HSK-A63", axes: 5, rotary: { a: 240, c: 360 } },
            c_52: { name: "C 52", travels: { x: 1000, y: 1100, z: 750 }, spindle: { maxRpm: 15000, power: 52 }, rapid: 1200, toolCapacity: 115, taper: "HSK-A100", axes: 5, rotary: { a: 240, c: 360 } },
            c_62: { name: "C 62", travels: { x: 1200, y: 1300, z: 900 }, spindle: { maxRpm: 12000, power: 65 }, rapid: 1000, toolCapacity: 160, taper: "HSK-A100", axes: 5, rotary: { a: 240, c: 360 } }
        },
        features: {
            hsm: { code: "CYCL DEF 32", hscMode: true },
            tcp: { on: "M128", off: "M129", plane: "PLANE SPATIAL" },
            coolant: { flood: { on: "M8", off: "M9" }, tsc: { on: "M51", off: "M59" } },
            probing: { cycle: "TCH PROBE" },
            workOffsets: { code: "CYCL DEF 7.0" }
        }
    },
    // DOOSAN MILLS
    doosan_mills: {
        manufacturer: "Doosan",
        type: "mill",
        controller: "fanuc_0i",
        dialect: "fanuc",

        machines: {
            dnm_4500: { name: "DNM 4500", travels: { x: 800, y: 450, z: 510 }, spindle: { maxRpm: 12000, power: 18.5 }, rapid: 1200, toolCapacity: 30, taper: "CAT40" },
            dnm_5700: { name: "DNM 5700", travels: { x: 1050, y: 570, z: 510 }, spindle: { maxRpm: 12000, power: 22 }, rapid: 1200, toolCapacity: 30, taper: "CAT40" },
            dnm_6700: { name: "DNM 6700", travels: { x: 1270, y: 670, z: 625 }, spindle: { maxRpm: 12000, power: 26 }, rapid: 1200, toolCapacity: 40, taper: "CAT40" },
            dvf_5000: { name: "DVF 5000", travels: { x: 625, y: 530, z: 480 }, spindle: { maxRpm: 12000, power: 22 }, rapid: 1200, toolCapacity: 40, taper: "CAT40", axes: 5, rotary: { a: 120, c: 360 } }
        },
        features: {
            hsm: { code: "G05.1 Q1" },
            tcp: { code: "G43.4" },
            coolant: { flood: { on: "M8", off: "M9" }, tsc: { on: "M51", off: "M59" } },
            subprograms: { call: "M98", return: "M99" }
        }
    },
    // DOOSAN LATHES
    doosan_lathes: {
        manufacturer: "Doosan",
        type: "lathe",
        controller: "fanuc_0i",
        dialect: "fanuc",

        machines: {
            lynx_2100: { name: "Lynx 2100", swing: 320, barCap: 51, travels: { x: 165, z: 310 }, spindle: { maxRpm: 6000, power: 15 }, turret: 12 },
            lynx_2100y: { name: "Lynx 2100Y", swing: 320, barCap: 51, travels: { x: 165, y: 52, z: 310 }, spindle: { maxRpm: 6000, power: 15 }, turret: 12, yAxis: true, liveTool: true },
            lynx_2100lm: { name: "Lynx 2100LM", swing: 320, barCap: 51, travels: { x: 165, z: 510 }, spindle: { maxRpm: 6000, power: 15 }, turret: 12, liveTool: true },
            puma_2100y: { name: "Puma 2100Y", swing: 380, barCap: 65, travels: { x: 200, y: 80, z: 510 }, spindle: { maxRpm: 4500, power: 22 }, turret: 12, yAxis: true, liveTool: true },
            puma_2600y: { name: "Puma 2600Y", swing: 450, barCap: 80, travels: { x: 225, y: 100, z: 610 }, spindle: { maxRpm: 3500, power: 30 }, turret: 12, yAxis: true, liveTool: true },
            puma_3100y: { name: "Puma 3100Y", swing: 550, barCap: 102, travels: { x: 275, y: 120, z: 810 }, spindle: { maxRpm: 2500, power: 37 }, turret: 12, yAxis: true, liveTool: true },
            puma_smx_2600: { name: "Puma SMX 2600", swing: 400, barCap: 76, travels: { x: 200, y: 180, z: 760, b: 225 }, spindle: { maxRpm: 4000, power: 26 }, turret: 12, yAxis: true, bAxis: true, millTurn: true }
        },
        features: {
            css: { code: "G96", cancel: "G97" },
            threading: { code: "G76", multiStart: true },
            liveTool: { on: "M133", off: "M135" },
            coolant: { flood: { on: "M8", off: "M9" }, tsc: { on: "M51", off: "M59" } }
        }
    },
    // HYUNDAI-WIA MILLS
    hyundai_mills: {
        manufacturer: "Hyundai-Wia",
        type: "mill",
        controller: "fanuc_0i",
        dialect: "fanuc",

        machines: {
            f400d: { name: "F400D", travels: { x: 600, y: 400, z: 400 }, spindle: { maxRpm: 10000, power: 15 }, rapid: 1200, toolCapacity: 24, taper: "CAT40" },
            f500d: { name: "F500D", travels: { x: 800, y: 500, z: 480 }, spindle: { maxRpm: 10000, power: 18.5 }, rapid: 1200, toolCapacity: 30, taper: "CAT40" },
            f650d: { name: "F650D", travels: { x: 1050, y: 600, z: 560 }, spindle: { maxRpm: 10000, power: 22 }, rapid: 1200, toolCapacity: 30, taper: "CAT40" },
            xf_6300: { name: "XF 6300", travels: { x: 1050, y: 650, z: 600 }, spindle: { maxRpm: 12000, power: 26 }, rapid: 1400, toolCapacity: 40, taper: "CAT40", axes: 5, rotary: { a: 150, c: 360 } }
        },
        features: {
            hsm: { code: "G05.1 Q1" },
            coolant: { flood: { on: "M8", off: "M9" }, tsc: { on: "M51", off: "M59" } },
            subprograms: { call: "M98", return: "M99" }
        }
    },
    // HYUNDAI-WIA LATHES
    hyundai_lathes: {
        manufacturer: "Hyundai-Wia",
        type: "lathe",
        controller: "fanuc_0i",
        dialect: "fanuc",

        machines: {
            l150a: { name: "L150A", swing: 220, barCap: 42, travels: { x: 115, z: 260 }, spindle: { maxRpm: 6000, power: 11 }, turret: 10 },
            l210a: { name: "L210A", swing: 290, barCap: 52, travels: { x: 145, z: 360 }, spindle: { maxRpm: 5000, power: 15 }, turret: 12 },
            l300a: { name: "L300A", swing: 380, barCap: 65, travels: { x: 190, z: 510 }, spindle: { maxRpm: 4000, power: 18.5 }, turret: 12 },
            l400a: { name: "L400A", swing: 480, barCap: 80, travels: { x: 240, z: 660 }, spindle: { maxRpm: 3000, power: 26 }, turret: 12 },
            lm1800ttsy: { name: "LM1800TTSY", swing: 260, barCap: 51, travels: { x: 130, y: 55, z: 350 }, spindle: { maxRpm: 5000, power: 15 }, turret: 24, yAxis: true, liveTool: true, subSpindle: true }
        },
        features: {
            css: { code: "G96", cancel: "G97" },
            threading: { code: "G76", multiStart: true },
            liveTool: { on: "M133", off: "M135" },
            coolant: { flood: { on: "M8", off: "M9" }, tsc: { on: "M51", off: "M59" } }
        }
    }
}