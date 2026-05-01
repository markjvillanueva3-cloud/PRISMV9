const PRISM_CONTROLLER_DATABASE = {
    version: '1.0.0',
    authority: 'PRISM_CONTROLLER_DATABASE',

    // CONTROLLER PROFILES
    controllers: {
        // FANUC CONTROLLERS
        'fanuc_0i-MF': {
            id: 'fanuc_0i-MF',
            manufacturer: 'Fanuc',
            model: '0i-MF Plus',
            generation: 'Series 0i',

            motion: {
                lookAhead: 200,              // blocks (AI Contour Control I)
                blockProcessingRate: 1000,   // blocks/sec
                interpolationTypes: ['linear', 'circular', 'helical', 'involute', 'exponential'],
                nurbsCapable: true,          // Option
                splineCapable: true,
                highSpeedMode: true,
                smoothingModes: ['G05.1 Q1', 'G08 P1'],  // AICC / Look-Ahead
                cornerRounding: true,
                maxCornerRadius: 0.1,        // mm
                nanoSmoothing: true,         // Option
                servoHrtCapable: true,       // High Response Turret
                fineAccelControl: true
            },
            compensation: {
                toolLengthComp: true,        // G43, G43.4, G43.5
                cutterRadiusComp: true,      // G41, G42
                toolWearComp: true,
                thermalComp: true,           // Option
                rtcpCapable: true,           // G43.4/G43.5 (5-axis option)
                volumetricComp: false,       // Machine-level
                toolCenterPointControl: true,
                tiltedWorkPlane: true        // G68.2
            },
            cycles: {
                drilling: ['G73', 'G74', 'G76', 'G80', 'G81', 'G82', 'G83', 'G84', 'G85', 'G86', 'G87', 'G88', 'G89'],
                tapping: ['G84', 'G74', 'G84.2', 'G84.3'],
                rigidTap: true,
                synchronousTap: true,
                boring: ['G85', 'G86', 'G87', 'G88', 'G89', 'G76'],
                peckDrilling: ['G73', 'G83'],
                customCycles: ['G150', 'G151']  // Pocket cycles (option)
            },
            probing: {
                available: true,             // Option
                toolSetter: true,
                partProbe: true,
                autoOffset: true,
                skipFunction: 'G31',
                multiProbe: true
            },
            programming: {
                macroB: true,
                customMacro: true,
                parametricProgramming: true,
                conversational: false,
                manualGuideI: true           // Option
            },
            limits: {
                maxFeedrate: 100000,         // mm/min
                maxRapid: 48000,             // mm/min typical
                maxProgramSize: 320,         // KB standard
                maxSubprograms: 400
            }
        },
        'fanuc_31i-B5': {
            id: 'fanuc_31i-B5',
            manufacturer: 'Fanuc',
            model: '31i-B5',
            generation: 'Series 30i/31i/32i',

            motion: {
                lookAhead: 1000,             // blocks (AI Contour Control II)
                blockProcessingRate: 3000,   // blocks/sec
                interpolationTypes: ['linear', 'circular', 'helical', 'involute', 'exponential', 'nurbs', 'spline'],
                nurbsCapable: true,
                splineCapable: true,
                highSpeedMode: true,
                smoothingModes: ['G05.1 Q1', 'G05.1 Q2', 'G08 P1', 'G08 P2'],
                cornerRounding: true,
                maxCornerRadius: 0.05,
                nanoSmoothing: true,
                servoHrtCapable: true,
                fineAccelControl: true,
                aiServoTuning: true
            },
            compensation: {
                toolLengthComp: true,
                cutterRadiusComp: true,
                toolWearComp: true,
                thermalComp: true,
                rtcpCapable: true,
                volumetricComp: true,        // 5-axis volumetric
                toolCenterPointControl: true,
                tiltedWorkPlane: true,
                smoothTcpc: true             // Smooth Tool Center Point Control
            },
            cycles: {
                drilling: ['G73', 'G74', 'G76', 'G80', 'G81', 'G82', 'G83', 'G84', 'G85', 'G86', 'G87', 'G88', 'G89'],
                tapping: ['G84', 'G74', 'G84.2', 'G84.3'],
                rigidTap: true,
                synchronousTap: true,
                boring: ['G85', 'G86', 'G87', 'G88', 'G89', 'G76'],
                peckDrilling: ['G73', 'G83'],
                customCycles: ['G150', 'G151', 'G160', 'G161']
            },
            probing: {
                available: true,
                toolSetter: true,
                partProbe: true,
                autoOffset: true,
                skipFunction: 'G31',
                multiProbe: true,
                highSpeedSkip: true
            },
            fiveAxis: {
                tcpc: true,                  // Tool Center Point Control
                tcpm: true,                  // Tool Center Point Management
                rtcp: true,
                dynamicFixtureOffset: true,
                smoothTcpc: true
            },
            limits: {
                maxFeedrate: 240000,
                maxRapid: 100000,
                maxProgramSize: 2048,        // KB
                maxSubprograms: 9999
            }
        },
        // SIEMENS CONTROLLERS
        'siemens_840D_sl': {
            id: 'siemens_840D_sl',
            manufacturer: 'Siemens',
            model: 'Sinumerik 840D sl',
            generation: '840D Solution Line',

            motion: {
                lookAhead: 2000,             // blocks
                blockProcessingRate: 5000,   // blocks/sec
                interpolationTypes: ['linear', 'circular', 'helical', 'spline', 'polynomial', 'nurbs'],
                nurbsCapable: true,
                splineCapable: true,
                highSpeedMode: true,
                smoothingModes: ['CYCLE832', 'SOFT', 'G642', 'COMPCAD'],
                cornerRounding: true,
                maxCornerRadius: 0.01,       // mm with COMPCAD
                topSurface: true,            // Top Surface option
                compCad: true                // Cad reader optimization
            },
            compensation: {
                toolLengthComp: true,
                cutterRadiusComp: true,      // CRC 3D capable
                toolWearComp: true,
                thermalComp: true,
                rtcpCapable: true,           // TRAORI
                volumetricComp: true,        // VCS
                toolCenterPointControl: true,
                tiltedWorkPlane: true,       // CYCLE800
                crc3D: true                  // 3D tool radius compensation
            },
            cycles: {
                drilling: ['CYCLE81', 'CYCLE82', 'CYCLE83', 'CYCLE84', 'CYCLE85', 'CYCLE86', 'CYCLE87', 'CYCLE88', 'CYCLE89'],
                tapping: ['CYCLE84', 'CYCLE840'],
                rigidTap: true,
                synchronousTap: true,
                boring: ['CYCLE85', 'CYCLE86', 'CYCLE87', 'CYCLE88', 'CYCLE89'],
                pocketing: ['POCKET3', 'POCKET4'],
                contour: ['CYCLE62', 'CYCLE63', 'CYCLE64'],
                measuring: ['CYCLE977', 'CYCLE978', 'CYCLE979', 'CYCLE982']
            },
            probing: {
                available: true,
                toolSetter: true,
                partProbe: true,
                autoOffset: true,
                measureCycles: true,
                inProcessMeasuring: true
            },
            fiveAxis: {
                traori: true,                // Transformation orientation
                tcpm: true,
                rtcp: true,
                orientationTransform: true,
                kinematicTransform: true
            },
            programming: {
                shopTurn: true,              // Conversational
                shopMill: true,              // Conversational
                programGuide: true,
                structuredText: true,
                gCode: true
            },
            limits: {
                maxFeedrate: 999999,
                maxRapid: 120000,
                maxProgramSize: 'unlimited', // NCU memory
                maxSubprograms: 'unlimited'
            }
        },
        'siemens_828D': {
            id: 'siemens_828D',
            manufacturer: 'Siemens',
            model: 'Sinumerik 828D',
            generation: '828D',

            motion: {
                lookAhead: 500,
                blockProcessingRate: 2000,
                interpolationTypes: ['linear', 'circular', 'helical', 'spline'],
                nurbsCapable: false,
                splineCapable: true,
                highSpeedMode: true,
                smoothingModes: ['CYCLE832', 'G642'],
                cornerRounding: true,
                maxCornerRadius: 0.05
            },
            compensation: {
                toolLengthComp: true,
                cutterRadiusComp: true,
                toolWearComp: true,
                thermalComp: false,
                rtcpCapable: false,
                volumetricComp: false,
                tiltedWorkPlane: false
            },
            cycles: {
                drilling: ['CYCLE81', 'CYCLE82', 'CYCLE83', 'CYCLE84', 'CYCLE85'],
                tapping: ['CYCLE84'],
                rigidTap: true,
                boring: ['CYCLE85', 'CYCLE86']
            },
            probing: {
                available: true,
                toolSetter: true,
                partProbe: true
            },
            limits: {
                maxFeedrate: 100000,
                maxRapid: 50000,
                maxProgramSize: 512
            }
        },
        // HAAS CONTROLLERS
        'haas_ngc': {
            id: 'haas_ngc',
            manufacturer: 'Haas',
            model: 'Next Generation Control',
            generation: 'NGC',

            motion: {
                lookAhead: 80,               // blocks
                blockProcessingRate: 1000,
                interpolationTypes: ['linear', 'circular', 'helical'],
                nurbsCapable: false,
                splineCapable: false,
                highSpeedMode: true,
                smoothingModes: ['G187 P1', 'G187 P2', 'G187 P3'],  // Smoothness settings
                cornerRounding: true,
                maxCornerRadius: 0.05
            },
            compensation: {
                toolLengthComp: true,        // G43
                cutterRadiusComp: true,      // G41, G42
                toolWearComp: true,
                thermalComp: false,
                rtcpCapable: true,           // TCPC for 5-axis
                volumetricComp: false,
                dynamicWorkOffset: true      // DWO
            },
            cycles: {
                drilling: ['G73', 'G74', 'G80', 'G81', 'G82', 'G83', 'G84', 'G85', 'G86', 'G87', 'G88', 'G89'],
                tapping: ['G84', 'G74'],
                rigidTap: true,
                boring: ['G85', 'G86', 'G87', 'G88', 'G89'],
                pocketing: ['G150', 'G151']  // VQC pocket cycles
            },
            probing: {
                available: true,             // WIPS option
                toolSetter: true,
                partProbe: true,
                autoOffset: true,
                vps: true                    // Visual Programming System
            },
            fiveAxis: {
                tcpc: true,                  // Tool Center Point Control
                dwo: true,                   // Dynamic Work Offset
                g234: true,                  // 5-axis compensation
                udFiveAxis: true             // UMC support
            },
            programming: {
                vps: true,                   // Visual Programming
                customMacro: true,
                wifi: true,
                usb: true
            },
            limits: {
                maxFeedrate: 65000,          // ipm = 1650
                maxRapid: 35000,
                maxProgramSize: 750          // KB
            }
        },
        // MAZAK CONTROLLERS
        'mazak_smoothAi': {
            id: 'mazak_smoothAi',
            manufacturer: 'Mazak',
            model: 'Mazatrol SmoothAi',
            generation: 'Smooth',

            motion: {
                lookAhead: 2000,
                blockProcessingRate: 4500,
                interpolationTypes: ['linear', 'circular', 'helical', 'nurbs', 'spline'],
                nurbsCapable: true,
                splineCapable: true,
                highSpeedMode: true,
                smoothingModes: ['Smooth Machining', 'Fine Surface', 'High Speed'],
                variableAcceleration: true,
                intelligentPocket: true,
                aiChipRemoval: true
            },
            compensation: {
                toolLengthComp: true,
                cutterRadiusComp: true,
                toolWearComp: true,
                thermalComp: true,           // Intelligent Thermal Shield
                rtcpCapable: true,
                volumetricComp: true,
                aiThermalComp: true
            },
            cycles: {
                drilling: true,
                tapping: true,
                rigidTap: true,
                boring: true,
                mazatrolCycles: true         // Conversational
            },
            probing: {
                available: true,
                toolSetter: true,
                partProbe: true,
                autoOffset: true,
                smartProbe: true
            },
            ai: {
                aiThermal: true,
                aiChatter: true,             // Vibration monitoring
                aiMachining: true,
                servoLearning: true
            },
            limits: {
                maxFeedrate: 200000,
                maxRapid: 100000,
                maxProgramSize: 'unlimited'
            }
        },
        // HEIDENHAIN CONTROLLERS
        'heidenhain_tnc640': {
            id: 'heidenhain_tnc640',
            manufacturer: 'Heidenhain',
            model: 'TNC 640',
            generation: 'TNC 6xx',

            motion: {
                lookAhead: 10000,            // Extreme look-ahead
                blockProcessingRate: 10000,
                interpolationTypes: ['linear', 'circular', 'helical', 'spline', 'nurbs'],
                nurbsCapable: true,
                splineCapable: true,
                highSpeedMode: true,
                smoothingModes: ['M120', 'CYCLE32', 'ADP'],
                adaptivePathControl: true,
                afc: true                    // Adaptive Feed Control
            },
            compensation: {
                toolLengthComp: true,
                cutterRadiusComp: true,      // 3D CRC
                toolWearComp: true,
                thermalComp: true,           // KinematicsOpt
                rtcpCapable: true,           // TCPM
                volumetricComp: true,
                tcpm: true,                  // M128
                kinematics_opt: true
            },
            cycles: {
                drilling: ['CYCLE200', 'CYCLE201', 'CYCLE202', 'CYCLE203', 'CYCLE204', 'CYCLE205', 'CYCLE206', 'CYCLE207', 'CYCLE208', 'CYCLE209'],
                pocketing: ['CYCLE110', 'CYCLE111', 'CYCLE112'],
                contour: ['CYCLE20', 'CYCLE21', 'CYCLE22', 'CYCLE25', 'CYCLE27'],
                probing: ['CYCLE420', 'CYCLE421', 'CYCLE422', 'CYCLE430', 'CYCLE444']
            },
            probing: {
                available: true,
                toolSetter: true,
                partProbe: true,
                autoOffset: true,
                kinematicsMeasure: true,
                touchProbe: true
            },
            fiveAxis: {
                tcpm: true,                  // Tool Center Point Management (M128)
                m128: true,
                plane: true,                 // PLANE function
                kinematicsOpt: true          // Kinematic optimization
            },
            programming: {
                conversational: true,
                klar: true,
                din: true,
                isoDialect: true
            },
            limits: {
                maxFeedrate: 999999,
                maxRapid: 200000,
                maxProgramSize: 'unlimited'
            }
        },
        // OKUMA CONTROLLERS
        'okuma_osp-p300': {
            id: 'okuma_osp-p300',
            manufacturer: 'Okuma',
            model: 'OSP-P300',
            generation: 'OSP-P300',

            motion: {
                lookAhead: 1000,
                blockProcessingRate: 3000,
                interpolationTypes: ['linear', 'circular', 'helical', 'nurbs', 'spline'],
                nurbsCapable: true,
                splineCapable: true,
                highSpeedMode: true,
                smoothingModes: ['Super-NURBS', 'HyperSurface'],
                superNurbs: true,
                hyperSurface: true
            },
            compensation: {
                toolLengthComp: true,
                cutterRadiusComp: true,
                toolWearComp: true,
                thermalComp: true,           // Thermo-Friendly Concept
                rtcpCapable: true,
                volumetricComp: true,
                collision_avoidance: true
            },
            cycles: {
                drilling: true,
                tapping: true,
                rigidTap: true,
                boring: true,
                easyCycles: true
            },
            probing: {
                available: true,
                toolSetter: true,
                partProbe: true,
                autoOffset: true
            },
            features: {
                thermoFriendly: true,
                collisionAvoidance: true,    // CAS
                machiningNavi: true,
                easyOperation: true
            },
            limits: {
                maxFeedrate: 150000,
                maxRapid: 80000,
                maxProgramSize: 'unlimited'
            }
        }
    },
    // CONTROLLER LOOKUP METHODS

    getController: function(controllerId) {
        return this.controllers[controllerId] || null;
    },
    getByManufacturer: function(manufacturer) {
        return Object.entries(this.controllers)
            .filter(([id, ctrl]) => ctrl.manufacturer.toLowerCase() === manufacturer.toLowerCase())
            .map(([id, ctrl]) => ({ id, ...ctrl }));
    },
    hasCapability: function(controllerId, capability) {
        const ctrl = this.controllers[controllerId];
        if (!ctrl) return false;

        // Check motion capabilities
        if (ctrl.motion && ctrl.motion[capability] !== undefined) {
            return ctrl.motion[capability];
        }
        // Check compensation capabilities
        if (ctrl.compensation && ctrl.compensation[capability] !== undefined) {
            return ctrl.compensation[capability];
        }
        // Check 5-axis capabilities
        if (ctrl.fiveAxis && ctrl.fiveAxis[capability] !== undefined) {
            return ctrl.fiveAxis[capability];
        }
        return false;
    },
    getSmoothingModes: function(controllerId) {
        const ctrl = this.controllers[controllerId];
        return ctrl?.motion?.smoothingModes || [];
    },
    getLookAhead: function(controllerId) {
        const ctrl = this.controllers[controllerId];
        return ctrl?.motion?.lookAhead || 80;
    }
}