const PRISM_UNIVERSAL_POST_GENERATOR_V2 = {
    version: '3.0.0',
    aiVersion: 'v4.50',

    // CONFIGURATION
    config: {
        enableLearning: true,          // Learn from generated posts
        validateQuality: true,          // Validate output quality
        usePhysicsEngine: true,         // Use PRISM_PHYSICS_ENGINE
        useKnowledgeBase: true,         // Use PRISM_KNOWLEDGE_BASE
        useGForceEngine: true,          // Use G_FORCE_ENGINE
        useKinematicReference: true,    // Use MACHINE_KINEMATIC_REFERENCE
        minQualityScore: 85,            // Minimum output quality
        outputFormat: 'fusion360'       // Default output format
    },
    // LAYER 1: PRISM UNIVERSAL ENHANCEMENTS
    PRISM_ENHANCEMENTS: {
        version: '3.0.0',

        // Dynamic Depth Feed Adjustment
        dynamicDepthFeed: {
            enabled: true,
            maxIncreasePercent: 150,
            formula: 'feedMultiplier = 1 + (1 - currentDepth/fullDepth) * (maxIncrease - 1)'
        },
        // Chip Thinning from PRISM_KNOWLEDGE_BASE
        chipThinning: {
            enabled: true,
            formula: 'CTF = sqrt(d / (2 * ae)) when ae < d/2',
            maxMultiplier: 2.0
        },
        // G-Force from G_FORCE_ENGINE
        gForceCorner: {
            enabled: true,
            maxG: 0.5,
            formula: 'maxVelocity = sqrt(maxG * 9810 * radius)'
        },
        // Arc Feed Correction
        arcFeed: {
            enabled: true,
            formula: 'correctedFeed = linearFeed * (arcRadius / (arcRadius ± toolRadius))'
        },
        // Direction Change Detection
        directionChange: {
            enabled: true,
            angleThreshold: 45,
            decelerationFactor: 0.7
        },
        // Tool Deflection from PRISM_PHYSICS_ENGINE
        toolDeflection: {
            enabled: true,
            warnThreshold: 0.0005,  // 0.5 mils
            criticalThreshold: 0.001 // 1 mil
        },
        // 8-Level Aggressiveness System
        aggressiveness: {
            levels: {
                1: { name: 'Ultra Conservative', feed: 0.50, speed: 0.70, corner: 0.40 },
                2: { name: 'Very Conservative', feed: 0.60, speed: 0.80, corner: 0.50 },
                3: { name: 'Conservative', feed: 0.70, speed: 0.85, corner: 0.60 },
                4: { name: 'Moderate', feed: 0.80, speed: 0.90, corner: 0.70 },
                5: { name: 'Standard', feed: 1.00, speed: 1.00, corner: 0.80 },
                6: { name: 'Productive', feed: 1.15, speed: 1.05, corner: 0.85 },
                7: { name: 'Aggressive', feed: 1.30, speed: 1.10, corner: 0.90 },
                8: { name: 'Maximum', feed: 1.50, speed: 1.15, corner: 0.95 }
            },
            default: 5
        }
    },
    // DATABASE QUERIES

    /**
     * Get machine data from COMPLETE_MACHINE_DATABASE
     */
    _getMachineData(machineId) {
        // Try all machine categories
        const categories = ['machines_3axis', 'machines_5axis', 'lathe_2axis',
                          'lathe_live', 'mill_turn', 'swiss'];

        if (typeof COMPLETE_MACHINE_DATABASE !== 'undefined') {
            for (const cat of categories) {
                if (COMPLETE_MACHINE_DATABASE[cat]?.[machineId]) {
                    return {
                        ...COMPLETE_MACHINE_DATABASE[cat][machineId],
                        category: cat,
                        source: 'COMPLETE_MACHINE_DATABASE'
                    };
                }
            }
        }
        // Fallback to UNIFIED_MACHINES
        if (typeof window.UNIFIED_MACHINES !== 'undefined' && UNIFIED_MACHINES[machineId]) {
            return { ...UNIFIED_MACHINES[machineId], source: 'UNIFIED_MACHINES' };
        }
        return this._getGenericMachine(machineId);
    },
    /**
     * Get controller data from VERIFIED_POST_DATABASE
     */
    _getControllerData(controllerId) {
        const id = controllerId.toLowerCase().replace(/[-\s]/g, '_');

        // Check VERIFIED_POST_DATABASE first (most comprehensive)
        if (typeof VERIFIED_POST_DATABASE !== 'undefined' &&
            VERIFIED_POST_DATABASE.CONTROLLERS?.[id]) {
            return {
                ...VERIFIED_POST_DATABASE.CONTROLLERS[id],
                source: 'VERIFIED_POST_DATABASE',
                verified: true
            };
        }
        // Check V2 database
        if (typeof PRISM_VERIFIED_POST_DATABASE_V2 !== 'undefined' &&
            PRISM_VERIFIED_POST_DATABASE_V2.CONTROLLERS?.[id]) {
            return {
                ...PRISM_VERIFIED_POST_DATABASE_V2.CONTROLLERS[id],
                source: 'PRISM_VERIFIED_POST_DATABASE_V2',
                verified: true
            };
        }
        // Check learned patterns from POST_LEARNING_ENGINE
        if (this.config.enableLearning && typeof POST_LEARNING_ENGINE !== 'undefined') {
            const learned = POST_LEARNING_ENGINE.getRecommendations(null, id);
            if (learned.fromLearned) {
                return {
                    ...learned.fromLearned,
                    source: 'POST_LEARNING_ENGINE',
                    verified: false,
                    confidence: learned.confidence
                };
            }
        }
        return this._getGenericController(controllerId);
    },
    /**
     * Get physics calculations from PRISM_PHYSICS_ENGINE
     */
    _getPhysicsEngine() {
        if (typeof PRISM_PHYSICS_ENGINE !== 'undefined') {
            return PRISM_PHYSICS_ENGINE;
        }
        return this._getLocalPhysics();
    },
    /**
     * Get knowledge base data
     */
    _getKnowledgeBase() {
        if (typeof PRISM_KNOWLEDGE_BASE !== 'undefined') {
            return PRISM_KNOWLEDGE_BASE;
        }
        return null;
    },
    /**
     * Get G-Force engine
     */
    _getGForceEngine() {
        if (typeof G_FORCE_ENGINE !== 'undefined') {
            return G_FORCE_ENGINE;
        }
        return null;
    },
    /**
     * Get kinematic reference for 5-axis
     */
    _getKinematicReference(machineId) {
        if (typeof MACHINE_KINEMATIC_REFERENCE !== 'undefined') {
            return MACHINE_KINEMATIC_REFERENCE[machineId] || null;
        }
        return null;
    },
    // FALLBACK DATA (When databases not available)

    _getGenericMachine(machineId) {
        return {
            id: machineId,
            name: machineId,
            manufacturer: 'Generic',
            type: '3AXIS_VMC',
            travels: { x: 500, y: 400, z: 400 },
            spindle: { maxRpm: 10000, taper: 'CAT40' },
            source: 'GENERIC_FALLBACK'
        };
    },
    _getGenericController(controllerId) {
        return {
            id: controllerId,
            name: controllerId,
            dialect: 'fanuc',
            coolant: { flood: { on: 'M8', off: 'M9' } },
            spindle: { cw: 'M3', ccw: 'M4', stop: 'M5' },
            cannedCycles: { drill: 'G81', peck: 'G83', tap: 'G84' },
            source: 'GENERIC_FALLBACK',
            verified: false
        };
    },
    _getLocalPhysics() {
        return {
            calculateChipThinning: (ae, d) => {
                if (ae >= d / 2) return 1.0;
                return Math.min(2.0, Math.sqrt(d / (2 * ae)));
            },
            calculateDeflection: (force, length, diameter, E) => {
                const I = Math.PI * Math.pow(diameter / 2, 4) / 4;
                return (force * Math.pow(length, 3)) / (3 * E * I);
            },
            calculateGForce: (velocity, radius) => {
                return (velocity * velocity) / (radius * 9810);
            }
        };
    },
    // MAIN GENERATION

    /**
     * Generate a complete post processor
     * @param {Object} options - Generation options
     * @returns {Object} Generated post with metadata
     */
    generate(options = {}) {
        const {
            machineId,
            controllerId,
            camSystem = 'fusion360',
            aggressiveness = 5,
            customSettings = {}
        } = options;

        try {
            // Step 1: Query all databases
            const machine = this._getMachineData(machineId);
            const controller = this._getControllerData(controllerId);
            const physics = this._getPhysicsEngine();
            const knowledge = this._getKnowledgeBase();
            const gforce = this._getGForceEngine();
            const kinematics = this._getKinematicReference(machineId);

            // Step 2: Build configuration
            const config = this._buildConfiguration({
                machine, controller, physics, knowledge, gforce, kinematics,
                aggressiveness, customSettings
            });

            // Step 3: Generate post content
            const postContent = this._generatePostContent(config, camSystem);

            // Step 4: Validate quality
            let qualityReport = null;
            if (this.config.validateQuality) {
                qualityReport = this._validateOutput(postContent, config);
                if (qualityReport.score < this.config.minQualityScore) {
                    console.warn(`[POST_GENERATOR] Quality below threshold: ${qualityReport.score}`);
                }
            }
            // Step 5: Record learning if enabled
            if (this.config.enableLearning && typeof POST_LEARNING_ENGINE !== 'undefined') {
                POST_LEARNING_ENGINE.learnFromPost(postContent, {
                    source: 'PRISM_UNIVERSAL_POST_GENERATOR',
                    version: this.version,
                    machine: machineId,
                    controller: controllerId,
                    year: new Date().getFullYear()
                });
            }
            // Step 6: Return result
            return {
                success: true,
                post: postContent,
                filename: `${machine.manufacturer}_${machine.name}_PRISM_v${this.version}.cps`,
                metadata: {
                    version: this.version,
                    aiVersion: this.aiVersion,
                    machine: machine,
                    controller: controller,
                    camSystem: camSystem,
                    aggressiveness: aggressiveness,
                    dataSources: {
                        machine: machine.source,
                        controller: controller.source,
                        verified: controller.verified
                    }
                },
                quality: qualityReport
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                stack: error.stack
            };
        }
    },
    // CONFIGURATION BUILDER

    _buildConfiguration(data) {
        const { machine, controller, physics, knowledge, gforce, kinematics,
                aggressiveness, customSettings } = data;

        const aggSettings = this.PRISM_ENHANCEMENTS.aggressiveness.levels[aggressiveness];

        return {
            machine: {
                id: machine.id,
                name: machine.name,
                manufacturer: machine.manufacturer,
                type: machine.type,
                travels: machine.travels,
                spindle: machine.spindle,
                is5Axis: machine.category?.includes('5axis') || machine.type?.includes('5AXIS'),
                isLathe: machine.category?.includes('lathe') || machine.type?.includes('LATHE'),
                isMillTurn: machine.category?.includes('mill_turn'),
                kinematics: kinematics
            },
            controller: {
                id: controller.id,
                name: controller.name,
                dialect: controller.dialect,
                verified: controller.verified,
                coolant: controller.coolant,
                spindle: controller.spindle,
                smoothing: controller.smoothing,
                cannedCycles: controller.cannedCycles,
                auxiliary: controller.auxiliary,
                multiAxis: controller.multiAxis,
                probing: controller.probing,
                formats: controller.formats
            },
            physics: {
                engine: physics,
                chipThinning: this.PRISM_ENHANCEMENTS.chipThinning,
                gForce: this.PRISM_ENHANCEMENTS.gForceCorner,
                deflection: this.PRISM_ENHANCEMENTS.toolDeflection
            },
            knowledge: knowledge,
            aggressiveness: {
                level: aggressiveness,
                ...aggSettings
            },
            custom: customSettings
        };
    },
    // POST CONTENT GENERATION

    _generatePostContent(config, camSystem) {
        const sections = [];

        // Header
        sections.push(this._generateHeader(config));

        // User properties
        sections.push(this._generateUserProperties(config));

        // Format definitions
        sections.push(this._generateFormats(config));

        // Physics functions
        sections.push(this._generatePhysicsFunctions(config));

        // Aggressiveness system
        sections.push(this._generateAggressivenessSystem(config));

        // Helper functions
        sections.push(this._generateHelperFunctions(config));

        // CAM callbacks
        sections.push(this._generateCAMCallbacks(config));

        // Motion functions
        sections.push(this._generateMotionFunctions(config));

        // Canned cycles
        sections.push(this._generateCannedCycles(config));

        // Footer
        sections.push(this._generateFooter(config));

        return sections.join('\n\n');
    },
    _generateHeader(config) {
        return `/**
  PRISM Manufacturing Intelligence - Enhanced Post Processor v${this.version}
  ==================================================

  Machine: ${config.machine.name}
  Manufacturer: ${config.machine.manufacturer}
  Control: ${config.controller.name}
  Type: ${config.machine.type}

  ==================================================
  PRISM ENHANCED ROUGHING TECHNOLOGY™
  ==================================================

  This post processor incorporates:

  ★ PRISM ENHANCED ROUGHING TECHNOLOGY:
    - Dynamic Depth Feed Adjustment
    - Intelligent Chip Thinning Compensation
    - Corner Deceleration Control with G-Force Limiting
    - Arc Feed Correction for Constant Chip Thickness
    - Direction Change Detection
    - 8-Level Aggressiveness Control
    - Tool Deflection Analysis

  ★ ${config.controller.name.toUpperCase()}-SPECIFIC OPTIMIZATIONS:
    - Verified codes from VERIFIED_POST_DATABASE
    - ${config.controller.verified ? 'Production-verified configuration' : 'Generic configuration'}
    ${config.controller.smoothing ? '- HSM/Smoothing mode support' : ''}
    ${config.controller.multiAxis ? '- Multi-axis support (TCPC/DWO)' : ''}
    ${config.controller.probing ? '- Probing cycle support' : ''}

  Data Sources:
    - Machine: ${config.machine.manufacturer} (${config.machine.travels?.x}x${config.machine.travels?.y}x${config.machine.travels?.z})
    - Controller: ${config.controller.id} (${config.controller.verified ? 'VERIFIED' : 'GENERIC'})
    - Physics: PRISM_PHYSICS_ENGINE
    - Knowledge: PRISM_KNOWLEDGE_BASE

  ==================================================

  Generated: ${new Date().toISOString()}
  PRISM AI Version: ${this.aiVersion}

  Copyright (C) 2026 PRISM Manufacturing Intelligence
*/

description = "PRISM Enhanced ${config.machine.name} (${config.controller.name})";
vendor = "PRISM Manufacturing Intelligence";
vendorUrl = "https://prism-mfg.ai";
legal = "Copyright (C) 2026 PRISM Manufacturing Intelligence";
certificationLevel = 2;
minimumRevision = 45892;

longDescription = "PRISM-enhanced post for ${config.machine.manufacturer} ${config.machine.name} with ${config.controller.name} control. " +
  "Includes 8-level aggressiveness, chip thinning compensation, G-force corner deceleration, and physics-based optimization.";

extension = "${config.controller.extension || 'nc'}";
setCodePage("ascii");

capabilities = CAPABILITY_MILLING${config.machine.isLathe ? ' | CAPABILITY_TURNING' : ''};
tolerance = spatial(0.002, MM);

minimumChordLength = spatial(0.25, MM);
minimumCircularRadius = spatial(0.01, MM);
maximumCircularRadius = spatial(1000, MM);
minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(180);
allowHelicalMoves = true;
allowedCircularPlanes = undefined;
`;
    },
    _generateUserProperties(config) {
        const aggLevel = config.aggressiveness.level;
        return `
///////////////////////////////////////////////////////////////////////////////
//                          USER PROPERTIES
///////////////////////////////////////////////////////////////////////////////

properties = {
  // Aggressiveness Level (1-8)
  aggressivenessLevel: {
    title: "Aggressiveness Level",
    description: "1=Ultra Conservative, 5=Standard, 8=Maximum MRR. Current: ${aggLevel}",
    group: "prism",
    type: "integer",
    value: ${aggLevel},
    range: [1, 8]
  },
  // Dynamic Depth Feed
  useDynamicDepthFeed: {
    title: "Dynamic Depth Feed",
    description: "Increase feed when cutting shallow (KEY to fast 3D adaptive)",
    group: "prism",
    type: "boolean",
    value: true
  },
  // Chip Thinning
  useChipThinning: {
    title: "Chip Thinning Compensation",
    description: "Increase feed at low radial engagement",
    group: "prism",
    type: "boolean",
    value: true
  },
  // G-Force Limiting
  useGForceLimiting: {
    title: "G-Force Corner Limiting",
    description: "Decelerate at corners based on machine acceleration limits",
    group: "prism",
    type: "boolean",
    value: true
  },
  maxGForce: {
    title: "Max G-Force",
    description: "Maximum allowed G-force at corners (0.5G typical)",
    group: "prism",
    type: "number",
    value: 0.5
  },
  // Arc Feed Correction
  useArcFeedCorrection: {
    title: "Arc Feed Correction",
    description: "Adjust feed on arcs for constant chip load",
    group: "prism",
    type: "boolean",
    value: true
  },
  // Tool Deflection Warning
  warnToolDeflection: {
    title: "Warn Tool Deflection",
    description: "Show warning when tool deflection exceeds threshold",
    group: "prism",
    type: "boolean",
    value: true
  },
  // Smoothing Mode${config.controller.smoothing ? `
  smoothingMode: {
    title: "Smoothing Mode",
    description: "rough, medium, or finish",
    group: "controller",
    type: "enum",
    values: ["off", "rough", "medium", "finish"],
    value: "finish"
  },` : ''}

  // Coolant
  coolantMode: {
    title: "Default Coolant",
    description: "Default coolant mode",
    group: "general",
    type: "enum",
    values: ["off", "flood", "mist"${config.controller.coolant?.tsc ? ', "tsc"' : ''}${config.controller.coolant?.air ? ', "air"' : ''}],
    value: "flood"
  },
  // Safe start
  useSafeStart: {
    title: "Safe Start Block",
    description: "Include safe startup block",
    group: "general",
    type: "boolean",
    value: true
  }
};
`;
    },
    _generateFormats(config) {
        const formats = config.controller.formats || {};
        return `
///////////////////////////////////////////////////////////////////////////////
//                          FORMAT DEFINITIONS
///////////////////////////////////////////////////////////////////////////////

var gFormat = createFormat({prefix: "G", decimals: ${formats.g?.decimals || 0}});
var mFormat = createFormat({prefix: "M", decimals: 0});
var hFormat = createFormat({prefix: "H", decimals: 0});
var dFormat = createFormat({prefix: "D", decimals: 0});

var xyzFormat = createFormat({decimals: ${formats.xyz?.decimals || 4}, forceDecimal: ${formats.xyz?.forceDecimal || true}});
var feedFormat = createFormat({decimals: ${formats.feed?.decimals || 3}, forceDecimal: true});
var rpmFormat = createFormat({decimals: 0});
var toolFormat = createFormat({decimals: 0});
var taperFormat = createFormat({decimals: 1, scale: DEG});

var xOutput = createVariable({prefix: "X"}, xyzFormat);
var yOutput = createVariable({prefix: "Y"}, xyzFormat);
var zOutput = createVariable({prefix: "Z"}, xyzFormat);
var aOutput = createVariable({prefix: "A"}, xyzFormat);
var bOutput = createVariable({prefix: "B"}, xyzFormat);
var cOutput = createVariable({prefix: "C"}, xyzFormat);
var feedOutput = createVariable({prefix: "F"}, feedFormat);
var sOutput = createVariable({prefix: "S", force: true}, rpmFormat);
`;
    },
    _generatePhysicsFunctions(config) {
        return `
///////////////////////////////////////////////////////////////////////////////
//                    PRISM PHYSICS FUNCTIONS
///////////////////////////////////////////////////////////////////////////////

// Global state for PRISM optimizations
var prism = {
  lastX: 0,
  lastY: 0,
  lastZ: 0,
  lastDirection: {x: 0, y: 0, z: 0},
  currentTool: null,
  currentDepth: 0,
  fullDepth: 0,
  radialEngagement: 1.0
};
/**
 * Calculate chip thinning factor
 * Formula: CTF = sqrt(d / (2 * ae)) when ae < d/2
 */
function calculateChipThinningFactor(ae, d) {
  if (!getProperty("useChipThinning")) return 1.0;
  if (ae >= d / 2) return 1.0;
  var ctf = Math.sqrt(d / (2 * ae));
  return Math.min(${config.physics.chipThinning.maxMultiplier}, ctf);
}
/**
 * Calculate G-force deceleration for corners
 * Formula: maxVelocity = sqrt(maxG * 9810 * radius)
 */
function calculateGForceDeceleration(velocity, radius) {
  if (!getProperty("useGForceLimiting")) return 1.0;
  var maxG = getProperty("maxGForce");
  var gForce = (velocity * velocity) / (radius * 9810);
  if (gForce > maxG) {
    var maxVelocity = Math.sqrt(maxG * 9810 * radius);
    return maxVelocity / velocity;
  }
  return 1.0;
}
/**
 * Calculate arc feed correction
 * Inside arcs: increase feed, Outside arcs: decrease feed
 */
function calculateArcFeedCorrection(arcRadius, toolRadius, isInside) {
  if (!getProperty("useArcFeedCorrection")) return 1.0;
  if (isInside) {
    return arcRadius / (arcRadius - toolRadius);
  }
  return arcRadius / (arcRadius + toolRadius);
}
/**
 * Calculate dynamic depth feed adjustment
 * KEY to fast 3D adaptive machining!
 */
function calculateDynamicDepthFeed(currentDepth, fullDepth, baseFeed) {
  if (!getProperty("useDynamicDepthFeed")) return baseFeed;
  if (fullDepth <= 0) return baseFeed;

  var depthRatio = currentDepth / fullDepth;
  var maxIncrease = 1.5; // 50% increase at surface
  var multiplier = 1 + (1 - depthRatio) * (maxIncrease - 1);

  return baseFeed * multiplier;
}
/**
 * Detect direction change and apply deceleration
 */
function calculateDirectionChangeDecel(newDir, lastDir, aggressiveness) {
  var dot = newDir.x * lastDir.x + newDir.y * lastDir.y + newDir.z * lastDir.z;
  var angle = Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;

  if (angle > 45) {
    var factor = aggressiveness.corner;
    return Math.max(0.3, factor * (1 - angle / 180));
  }
  return 1.0;
}
/**
 * Estimate tool deflection
 * Formula: δ = (F × L³) / (3 × E × I)
 */
function estimateToolDeflection(force, stickout, diameter) {
  var E = 580000; // Carbide modulus (N/mm²)
  var I = Math.PI * Math.pow(diameter / 2, 4) / 4;
  var deflection = (force * Math.pow(stickout, 3)) / (3 * E * I);

  if (getProperty("warnToolDeflection")) {
    if (deflection > ${config.physics.deflection.criticalThreshold}) {
      warning("CRITICAL: Tool deflection " + (deflection * 1000).toFixed(3) + " mils exceeds limit!");
    } else if (deflection > ${config.physics.deflection.warnThreshold}) {
      warning("Tool deflection " + (deflection * 1000).toFixed(3) + " mils - consider reducing DOC or stickout");
    }
  }
  return deflection;
}
`;
    },
    _generateAggressivenessSystem(config) {
        const levels = JSON.stringify(this.PRISM_ENHANCEMENTS.aggressiveness.levels, null, 2);
        return `
///////////////////////////////////////////////////////////////////////////////
//                    AGGRESSIVENESS SYSTEM (8 LEVELS)
///////////////////////////////////////////////////////////////////////////////

var AGGRESSIVENESS_LEVELS = ${levels};

function getAggressivenessSettings() {
  var level = getProperty("aggressivenessLevel");
  return AGGRESSIVENESS_LEVELS[level] || AGGRESSIVENESS_LEVELS[5];
}
function applyAggressiveness(baseFeed, baseSpeed) {
  var settings = getAggressivenessSettings();
  return {
    feed: baseFeed * settings.feed,
    speed: baseSpeed * settings.speed,
    cornerFactor: settings.corner
  };
}
/**
 * Main feed optimization - applies all PRISM enhancements
 */
function optimizeFeed(baseFeed, context) {
  var feed = baseFeed;
  var settings = getAggressivenessSettings();

  // 1. Apply aggressiveness
  feed *= settings.feed;

  // 2. Apply chip thinning if applicable
  if (context.radialEngagement && context.toolDiameter) {
    var ctf = calculateChipThinningFactor(context.radialEngagement, context.toolDiameter);
    feed *= ctf;
  }
  // 3. Apply dynamic depth feed
  if (context.currentDepth !== undefined && context.fullDepth) {
    feed = calculateDynamicDepthFeed(context.currentDepth, context.fullDepth, feed);
  }
  // 4. Apply G-force limiting for corners
  if (context.cornerRadius) {
    var feedPerMin = feed; // Assuming feed is in mm/min
    var gFactor = calculateGForceDeceleration(feedPerMin / 60, context.cornerRadius);
    feed *= gFactor;
  }
  // 5. Apply direction change deceleration
  if (context.newDirection && prism.lastDirection) {
    var dirFactor = calculateDirectionChangeDecel(context.newDirection, prism.lastDirection, settings);
    feed *= dirFactor;
  }
  return feed;
}
`;
    },
    _generateHelperFunctions(config) {
        const ctrl = config.controller;
        return `
///////////////////////////////////////////////////////////////////////////////
//                        HELPER FUNCTIONS
///////////////////////////////////////////////////////////////////////////////

/**
 * Set coolant based on controller-specific codes
 */
function setCoolant(mode) {${ctrl.coolant ? `
  var codes = {
    "flood": "${ctrl.coolant.flood?.on || 'M8'}",
    "mist": "${ctrl.coolant.mist?.on || 'M7'}",
    "off": "${ctrl.coolant.flood?.off || 'M9'}"${ctrl.coolant.tsc ? `,
    "tsc": "${ctrl.coolant.tsc.on}"` : ''}${ctrl.coolant.air ? `,
    "air": "${ctrl.coolant.air.on}"` : ''}
  };
  var code = codes[mode] || codes["off"];
  if (Array.isArray(code)) {
    code.forEach(function(c) { writeBlock(c); });
  } else {
    writeBlock(code);
  }` : `
  if (mode === "flood") writeBlock(mFormat.format(8));
  else if (mode === "mist") writeBlock(mFormat.format(7));
  else writeBlock(mFormat.format(9));`}
}
/**
 * Set smoothing/HSM mode (controller-specific)
 */
function setSmoothing(mode) {${ctrl.smoothing ? `
  var codes = {
    "rough": "${ctrl.smoothing.rough}",
    "medium": "${ctrl.smoothing.medium}",
    "finish": "${ctrl.smoothing.finish}",
    "off": "${ctrl.smoothing.off}"
  };
  writeBlock(codes[mode] || codes["off"]);` : `
  // Smoothing not supported on this controller`}
}
/**
 * Write safe start block
 */
function writeSafeStart() {
  if (!getProperty("useSafeStart")) return;
  ${ctrl.safeStart ? ctrl.safeStart.map(line => `writeBlock("${line}");`).join('\n  ') :
  `writeBlock(gFormat.format(28), "G91", "Z0.");
  writeBlock(gFormat.format(28), "Y0.");
  writeBlock(gFormat.format(90), gFormat.format(17), gFormat.format(40), gFormat.format(49), gFormat.format(80));`}
}
`;
    },
    _generateCAMCallbacks(config) {
        const ctrl = config.controller;
        return `
///////////////////////////////////////////////////////////////////////////////
//                         CAM CALLBACKS
///////////////////////////////////////////////////////////////////////////////

function onOpen() {
  // Write program header
  ${ctrl.programStart ? ctrl.programStart.map((line, i) => {
    if (line.includes('{number}')) return `writeln(programName ? "${line.replace('{number}', '" + programName + "').replace('{name}', '" + programComment + "')}" : "%");`;
    return `writeln("${line}");`;
  }).join('\n  ') : `writeln("%");
  if (programName) {
    writeln("O" + programName + " (" + programComment + ")");
  }
  writeln("(PRISM AI ENHANCED POST)");
  writeln("(DATE: " + (new Date().toISOString().split('T')[0]) + ")");`}

  // Safe start
  writeSafeStart();

  // Set smoothing
  var smoothing = getProperty("smoothingMode");
  if (smoothing && smoothing !== "off") {
    setSmoothing(smoothing);
  }
}
function onSection() {
  // Tool change
  var tool = currentSection.getTool();
  prism.currentTool = tool;

  ${ctrl.toolChange ? `writeBlock("${ctrl.toolChange.format}".replace("{tool}", toolFormat.format(tool.number)));
  writeBlock("${ctrl.toolChange.lengthComp}".replace("{tool}", hFormat.format(tool.lengthOffset)));` :
  `writeBlock("T" + toolFormat.format(tool.number), mFormat.format(6));
  writeBlock(gFormat.format(43), hFormat.format(tool.lengthOffset));`}

  // Spindle
  var rpm = spindleSpeed;
  if (rpm > 0) {
    var adjusted = applyAggressiveness(rpm, rpm);
    writeBlock(sOutput.format(Math.round(adjusted.speed)), mFormat.format(tool.clockwise ? 3 : 4));
  }
  // Coolant
  setCoolant(getProperty("coolantMode"));

  // Work offset
  if (currentSection.workOffset) {
    writeBlock(gFormat.format(53 + currentSection.workOffset));
  }
}
function onSectionEnd() {
  // Coolant off at section end
  setCoolant("off");
}
function onClose() {
  // Program end
  ${ctrl.programEnd ? ctrl.programEnd.map(line => `writeBlock("${line}");`).join('\n  ') :
  `writeBlock(gFormat.format(28), "G91", "Z0.");
  writeBlock(gFormat.format(28), "Y0.");
  writeBlock(mFormat.format(5));
  writeBlock(mFormat.format(9));
  writeBlock(mFormat.format(30));
  writeln("%");`}
}
`;
    },
    _generateMotionFunctions(config) {
        return `
///////////////////////////////////////////////////////////////////////////////
//                        MOTION FUNCTIONS
///////////////////////////////////////////////////////////////////////////////

function onRapid(_x, _y, _z) {
  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  if (x || y || z) {
    writeBlock(gFormat.format(0), x, y, z);
  }
  prism.lastX = _x;
  prism.lastY = _y;
  prism.lastZ = _z;
}
function onLinear(_x, _y, _z, feed) {
  // Calculate direction for change detection
  var newDir = {
    x: _x - prism.lastX,
    y: _y - prism.lastY,
    z: _z - prism.lastZ
  };
  var len = Math.sqrt(newDir.x*newDir.x + newDir.y*newDir.y + newDir.z*newDir.z);
  if (len > 0.0001) {
    newDir.x /= len;
    newDir.y /= len;
    newDir.z /= len;
  }
  // Optimize feed with all PRISM enhancements
  var optimizedFeed = optimizeFeed(feed, {
    newDirection: newDir,
    currentDepth: prism.currentDepth,
    fullDepth: prism.fullDepth,
    radialEngagement: prism.radialEngagement,
    toolDiameter: prism.currentTool ? prism.currentTool.diameter : 10
  });

  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  var f = feedOutput.format(optimizedFeed);

  if (x || y || z) {
    writeBlock(gFormat.format(1), x, y, z, f);
  }
  prism.lastX = _x;
  prism.lastY = _y;
  prism.lastZ = _z;
  prism.lastDirection = newDir;
}
function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
  // Calculate arc radius for G-force and feed correction
  var dx = prism.lastX - cx;
  var dy = prism.lastY - cy;
  var arcRadius = Math.sqrt(dx*dx + dy*dy);
  var toolRadius = prism.currentTool ? prism.currentTool.diameter / 2 : 5;

  // Determine if inside or outside arc (simplified)
  var isInside = !clockwise; // Approximation

  // Apply arc feed correction
  var arcCorrection = calculateArcFeedCorrection(arcRadius, toolRadius, isInside);

  // Apply G-force limiting
  var gForceFactor = calculateGForceDeceleration(feed / 60, arcRadius);

  var optimizedFeed = feed * arcCorrection * gForceFactor;
  optimizedFeed = optimizeFeed(optimizedFeed, {
    currentDepth: prism.currentDepth,
    fullDepth: prism.fullDepth
  });

  var g = clockwise ? 2 : 3;

  if (isFullCircle()) {
    // Full circle
    switch (getCircularPlane()) {
      case PLANE_XY:
        writeBlock(gFormat.format(17), gFormat.format(g), xOutput.format(x), yOutput.format(y),
                   "I" + xyzFormat.format(cx - prism.lastX), "J" + xyzFormat.format(cy - prism.lastY),
                   feedOutput.format(optimizedFeed));
        break;
    }
  } else {
    // Arc
    switch (getCircularPlane()) {
      case PLANE_XY:
        writeBlock(gFormat.format(17), gFormat.format(g), xOutput.format(x), yOutput.format(y), zOutput.format(z),
                   "I" + xyzFormat.format(cx - prism.lastX), "J" + xyzFormat.format(cy - prism.lastY),
                   feedOutput.format(optimizedFeed));
        break;
      case PLANE_ZX:
        writeBlock(gFormat.format(18), gFormat.format(g), xOutput.format(x), yOutput.format(y), zOutput.format(z),
                   "I" + xyzFormat.format(cx - prism.lastX), "K" + xyzFormat.format(cz - prism.lastZ),
                   feedOutput.format(optimizedFeed));
        break;
      case PLANE_YZ:
        writeBlock(gFormat.format(19), gFormat.format(g), xOutput.format(x), yOutput.format(y), zOutput.format(z),
                   "J" + xyzFormat.format(cy - prism.lastY), "K" + xyzFormat.format(cz - prism.lastZ),
                   feedOutput.format(optimizedFeed));
        break;
    }
  }
  prism.lastX = x;
  prism.lastY = y;
  prism.lastZ = z;
}
`;
    },
    _generateCannedCycles(config) {
        const cycles = config.controller.cannedCycles || {};
        return `
///////////////////////////////////////////////////////////////////////////////
//                        CANNED CYCLES
///////////////////////////////////////////////////////////////////////////////

function onDrilling(cycle) {
  writeBlock(
    gFormat.format(${cycles.returnInitial ? '98' : '99'}),
    gFormat.format(${parseInt((cycles.drill || 'G81').replace('G', '')) || 81}),
    xOutput.format(x), yOutput.format(y),
    "Z" + xyzFormat.format(cycle.bottom),
    "R" + xyzFormat.format(cycle.retract),
    feedOutput.format(cycle.feedrate)
  );
}
function onPeckDrilling(cycle) {
  writeBlock(
    gFormat.format(${cycles.returnInitial ? '98' : '99'}),
    gFormat.format(${parseInt((cycles.peck || 'G83').replace('G', '')) || 83}),
    xOutput.format(x), yOutput.format(y),
    "Z" + xyzFormat.format(cycle.bottom),
    "R" + xyzFormat.format(cycle.retract),
    "Q" + xyzFormat.format(cycle.incrementalDepth),
    feedOutput.format(cycle.feedrate)
  );
}
function onTapping(cycle) {
  var feedrate = cycle.feedrate;
  if (feedrate === 0) {
    feedrate = spindleSpeed * cycle.pitch;
  }
  writeBlock(
    gFormat.format(${cycles.returnInitial ? '98' : '99'}),
    gFormat.format(${parseInt((cycles.tap || 'G84').replace('G', '')) || 84}),
    xOutput.format(x), yOutput.format(y),
    "Z" + xyzFormat.format(cycle.bottom),
    "R" + xyzFormat.format(cycle.retract),
    feedOutput.format(feedrate)
  );
}
function onCycleEnd() {
  writeBlock(gFormat.format(${parseInt((cycles.cancel || 'G80').replace('G', '')) || 80}));
}
`;
    },
    _generateFooter(config) {
        return `
///////////////////////////////////////////////////////////////////////////////
//                           END OF POST
///////////////////////////////////////////////////////////////////////////////

/**
 * PRISM Statistics
 * This post was generated by PRISM Universal Post Generator v${this.version}
 *
 * Configuration:
 *   Machine: ${config.machine.name} (${config.machine.manufacturer})
 *   Controller: ${config.controller.name} (${config.controller.verified ? 'VERIFIED' : 'Generic'})
 *   Aggressiveness: Level ${config.aggressiveness.level} (${config.aggressiveness.name})
 *   Physics Engine: Integrated
 *   Knowledge Base: ${config.knowledge ? 'Integrated' : 'Not available'}
 */
`;
    },
    // QUALITY VALIDATION

    _validateOutput(postContent, config) {
        const report = {
            score: 100,
            issues: [],
            warnings: [],
            passed: true
        };
        // Check for required elements
        if (!postContent.includes('onOpen')) {
            report.issues.push('Missing onOpen function');
            report.score -= 20;
        }
        if (!postContent.includes('onLinear')) {
            report.issues.push('Missing onLinear function');
            report.score -= 20;
        }
        if (!postContent.includes('onClose')) {
            report.issues.push('Missing onClose function');
            report.score -= 10;
        }
        // Check for PRISM enhancements
        if (!postContent.includes('optimizeFeed')) {
            report.warnings.push('Missing optimizeFeed function');
            report.score -= 5;
        }
        if (!postContent.includes('calculateChipThinningFactor')) {
            report.warnings.push('Missing chip thinning function');
            report.score -= 5;
        }
        // Check for controller-specific codes
        if (config.controller.verified && !postContent.includes(config.controller.name)) {
            report.warnings.push('Controller name not in output');
            report.score -= 2;
        }
        report.passed = report.score >= this.config.minQualityScore;

        return report;
    },
    // API METHODS

    listMachines() {
        if (typeof COMPLETE_MACHINE_DATABASE === 'undefined') {
            return { error: 'COMPLETE_MACHINE_DATABASE not available' };
        }
        const machines = [];
        const categories = ['machines_3axis', 'machines_5axis', 'lathe_2axis', 'lathe_live', 'mill_turn', 'swiss'];

        for (const cat of categories) {
            if (COMPLETE_MACHINE_DATABASE[cat]) {
                for (const id of Object.keys(COMPLETE_MACHINE_DATABASE[cat])) {
                    machines.push({
                        id: id,
                        ...COMPLETE_MACHINE_DATABASE[cat][id],
                        category: cat
                    });
                }
            }
        }
        return machines;
    },
    listControllers() {
        const controllers = [];

        if (typeof VERIFIED_POST_DATABASE !== 'undefined' && VERIFIED_POST_DATABASE.CONTROLLERS) {
            for (const id of Object.keys(VERIFIED_POST_DATABASE.CONTROLLERS)) {
                controllers.push({
                    id: id,
                    ...VERIFIED_POST_DATABASE.CONTROLLERS[id],
                    source: 'VERIFIED_POST_DATABASE'
                });
            }
        }
        return controllers;
    },
    getStatistics() {
        return {
            version: this.version,
            aiVersion: this.aiVersion,
            machinesAvailable: this.listMachines().length || 'N/A',
            controllersAvailable: this.listControllers().length || 'N/A',
            learningEnabled: this.config.enableLearning,
            physicsEnabled: this.config.usePhysicsEngine,
            qualityValidation: this.config.validateQuality
        };
    },
    // Initialize
    init() {
        console.log('[PRISM_UNIVERSAL_POST_GENERATOR_V2] Initializing...');
        console.log(`  Version: ${this.version}`);
        console.log(`  AI Version: ${this.aiVersion}`);
        console.log(`  Learning: ${this.config.enableLearning ? 'Enabled' : 'Disabled'}`);
        console.log(`  Quality Validation: ${this.config.validateQuality ? 'Enabled' : 'Disabled'}`);

        if (typeof window !== 'undefined') {
            window.PRISM_UNIVERSAL_POST_GENERATOR = this;
        }
        return this;
    }
}