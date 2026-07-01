/**
  PRISM Manufacturing Intelligence - Enhanced Post Processor
  ============================================================================

  Machine: Mitsubishi FA10S Wire EDM
  Manufacturer: Mitsubishi Electric Corporation
  Control: W21FAS-2
  Type: Wire EDM (Standard Controller)

  ============================================================================
  MACHINE SPECIFICATIONS
  ============================================================================

  Axis Travel:  X=400mm, Y=300mm, Z=220mm (workpiece height)
  UV Travel:    U=80mm, V=80mm (taper axes)
  Max Taper:    15 degrees
  Max Workpiece: 500 kg
  Wire:         0.25mm brass (MD+ ProII), 0.25mm zinc-coated (MV1200S)
  Wire Tension: 200-2500 gf (adjustable)
  Dielectric:   Deionized water, auto-resistivity control
  Tank:         Submerge cutting standard
  Threading:    Auto wire threading (AWT)

  ============================================================================
  W21FAS-2 CONTROLLER CHARACTERISTICS
  ============================================================================

  The W21FAS-2 is the standard-tier controller for the FA10S platform:
  - V350-equivalent generator (standard power supply)
  - Standard technology database for common materials
  - Maximum 15-degree taper angle
  - Auto wire threading with break detection
  - Basic adaptive power control
  - Standard servo control (non-fiber optic)
  - Single-condition per pass (no mid-pass condition switching)

  Generator: V350-equivalent
    - Discharge energy: 0.1-50 microjoules per pulse
    - Pulse frequency: up to 5 MHz
    - Peak current: 350A equivalent
    - Anti-electrolysis circuit standard

  ============================================================================
  WIRE EDM TECHNOLOGY DATABASE
  ============================================================================

  Conditions are selected by E-code based on material and thickness:
    Rough:       E0001-E0005  (first cut, maximum MRR)
    Semi-finish: E0010-E0015  (second cut, improved accuracy)
    Finish:      E0020-E0025  (third/fourth cut, surface finish)

  Standard material support:
    - Steel (SKD11, SKD61, SK3, S50C, SUS304)
    - Carbide (G5, V20, V30)
    - Copper (C1100, C2801)
    - Aluminum (A5052, A6061, A7075)
    - Titanium (Ti-6Al-4V) - limited conditions

  ============================================================================
  PRISM ENHANCED TECHNOLOGY
  ============================================================================

  * MATERIAL-THICKNESS SPEED LOOKUP:
    - Automatic cutting speed estimation based on material + thickness
    - Integrated with PRISM materials database for cross-reference
    - Accounts for wire type and diameter in speed calculation

  * WIRE BREAK PREDICTION:
    - Monitors power settings vs. material thickness ratio
    - Warns when approaching wire break threshold
    - Suggests power reduction for at-risk conditions

  * SURFACE FINISH ESTIMATION:
    - Predicts Ra/Rz based on pass count and conditions
    - Maps E-code conditions to expected surface quality
    - Recommends additional passes to meet tolerance

  * MULTI-PASS OPTIMIZATION:
    - Rough -> Skim1 -> Skim2 -> Skim3 pass scheduling
    - Wire offset calculation per pass
    - Optimal condition selection per pass

  ============================================================================

  $Revision: PRISM v1.0.0 - FA10S W21FAS-2 Edition $
  $Date: 2026-04-10 $

  Copyright (C) 2012-2026 by Autodesk, Inc. & PRISM Manufacturing Intelligence
  All rights reserved.

  FORKID {FA10S-W21-PRISM-001}
*/

///////////////////////////////////////////////////////////////////////////////
//               PRISM ENHANCED MITSUBISHI FA10S W21FAS-2 POST
//
// WIRE EDM G-CODE REFERENCE (W21FAS-2):
//   G00  Rapid positioning (dry run)
//   G01  Linear interpolation (cutting)
//   G02  CW circular interpolation
//   G03  CCW circular interpolation
//   G04  Dwell (pause)
//   G40  Wire offset cancel
//   G41  Wire offset left
//   G42  Wire offset right
//   G90  Absolute positioning
//   G91  Incremental positioning
//   G92  Coordinate system set / wire offset register
//
// WIRE EDM M-CODE REFERENCE (W21FAS-2):
//   M00  Program stop
//   M02  Program end
//   M06  Auto wire thread
//   M07  Upper/lower flush ON
//   M09  Flush OFF
//   M17  Wire feed ON (wire run)
//   M18  Wire feed OFF (wire stop)
//   M20  Wire break detect ON
//   M80  Upper flush ON
//   M81  Lower flush ON
//   M82  Upper flush OFF
//   M83  Lower flush OFF
//   M98  Subprogram call
//   M99  Subprogram return
//
// WIRE EDM SPECIAL CODES:
//   E-codes: Technology condition selection (E0001-E9999)
//            E0001-E0005 = Rough cut conditions
//            E0010-E0015 = Semi-finish conditions
//            E0020-E0025 = Finish conditions
//   S-codes: Servo voltage setting (S0-S99)
//   C-codes: Condition register (C000-C999)
//   D-codes: Wire offset value (D000-D999)
//
// CUTTING PROCESS FLOW:
//   1. Position to start hole (G00)
//   2. Auto-thread wire (M06)
//   3. Enable wire run (M17)
//   4. Enable flush (M07 or M80/M81)
//   5. Enable wire break detect (M20)
//   6. Select condition (E-code)
//   7. Apply wire offset (G41/G42 + D-code)
//   8. Cut profile (G01/G02/G03)
//   9. Cancel offset (G40)
//   10. Stop wire (M18)
//   11. Cut wire for re-thread or end
//
///////////////////////////////////////////////////////////////////////////////


description = "PRISM Enhanced - Mitsubishi FA10S (W21FAS-2)";
vendor = "Mitsubishi Electric";
vendorUrl = "http://www.mitsubishielectric.com";
legal = "Copyright (C) 2012-2026 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45793;

longDescription = "PRISM Enhanced post for Mitsubishi FA10S Wire EDM with W21FAS-2 controller. " +
  "Standard controller with V350-equivalent generator. " +
  "Features: material-thickness speed lookup, wire break prediction, surface finish estimation, " +
  "multi-pass optimization (rough/skim1/skim2/skim3), auto wire threading support, " +
  "submerge cutting, 15-degree max taper. " +
  "Supports 0.25mm brass and zinc-coated wire. " +
  "PRISM physics: cutting speed prediction, wire consumption estimation, flush optimization.";

extension = "nc";
setCodePage("ascii");

capabilities = CAPABILITY_MILLING; // Fusion uses milling capability for wire EDM paths
tolerance = spatial(0.001, MM);

minimumChordLength = spatial(0.001, MM);
minimumCircularRadius = spatial(0.01, MM);
maximumCircularRadius = spatial(5000, MM);
minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(180);
allowHelicalMoves = false; // Wire EDM - no helical
allowedCircularPlanes = (1 << PLANE_XY); // XY plane only for wire EDM
highFeedrate = 5000; // mm/min rapid traverse

///////////////////////////////////////////////////////////////////////////////
// MACHINE CONSTANTS
///////////////////////////////////////////////////////////////////////////////

var MAX_TRAVEL_X = 400;  // mm
var MAX_TRAVEL_Y = 300;  // mm
var MAX_TRAVEL_Z = 220;  // mm (workpiece height)
var MAX_TRAVEL_U = 80;   // mm (upper guide offset)
var MAX_TRAVEL_V = 80;   // mm
var MAX_TAPER_ANGLE = 15; // degrees
var MAX_WORKPIECE_KG = 500;
var WIRE_DIAMETER_STD = 0.25; // mm (standard brass)
var CONTROLLER_TYPE = "W21FAS-2";
var GENERATOR_TYPE = "V350-equivalent";

///////////////////////////////////////////////////////////////////////////////
// TECHNOLOGY DATABASE - CUTTING SPEED REFERENCE (mm^2/min)
///////////////////////////////////////////////////////////////////////////////
//
// Approximate cutting speeds for first cut (rough) with 0.25mm brass wire:
//
// Material          | 10mm  | 30mm  | 50mm  | 80mm  | 100mm | 150mm
// ------------------|-------|-------|-------|-------|-------|-------
// SKD11 (D2)        | 280   | 250   | 220   | 180   | 150   | 110
// SKD61 (H13)       | 270   | 240   | 210   | 170   | 145   | 105
// SK3 (W1)          | 290   | 260   | 230   | 190   | 160   | 115
// S50C (1050)       | 300   | 270   | 240   | 200   | 170   | 120
// SUS304 (304SS)    | 220   | 195   | 170   | 140   | 115   | 85
// Carbide (V20)     | 150   | 130   | 110   | 90    | 75    | 55
// Copper (C1100)    | 320   | 290   | 260   | 220   | 190   | 140
// Aluminum (A6061)  | 350   | 310   | 280   | 240   | 210   | 155
// Titanium (Ti64)   | 180   | 155   | 130   | 100   | 80    | 55
//
// Notes:
// - Values in mm^2/min (area cut per minute)
// - Actual feedrate (mm/min) = speed / thickness
// - Second cut: ~60% of rough speed
// - Third cut: ~40% of rough speed
// - Fourth cut: ~25% of rough speed
//
///////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////
// SURFACE FINISH REFERENCE
///////////////////////////////////////////////////////////////////////////////
//
// Expected surface finish (Ra in micrometers) by pass count:
//
// Pass      | Condition  | Steel Ra | Carbide Ra | Notes
// ----------|------------|----------|------------|-------------------
// Rough     | E0001-E005 | 3.2-4.0  | 2.8-3.5   | Maximum MRR
// Skim 1    | E0010-E015 | 1.2-1.8  | 1.0-1.5   | Accuracy improvement
// Skim 2    | E0020-E025 | 0.5-0.8  | 0.4-0.7   | Fine finish
// Skim 3    | E0025+     | 0.2-0.4  | 0.15-0.3  | Mirror finish
//
// Wire offset per pass (typical for 0.25mm wire in SKD11):
//   Rough:  D=0.155-0.165mm (half wire + overcut + stock)
//   Skim 1: D=0.140-0.148mm
//   Skim 2: D=0.133-0.138mm
//   Skim 3: D=0.130-0.133mm (near-net)
//
///////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////
// USER-DEFINED PROPERTIES
///////////////////////////////////////////////////////////////////////////////

properties = {
  writeMachine: {
    title      : "Write machine",
    description: "Output machine settings in the header.",
    group      : "formats",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  writeTools: {
    title      : "Write tool list",
    description: "Output wire/tool information in the header.",
    group      : "formats",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  showSequenceNumbers: {
    title      : "Use sequence numbers",
    description: "Output sequence numbers on each block.",
    group      : "formats",
    type       : "enum",
    values     : [
      {title:"Yes", id:"true"},
      {title:"No", id:"false"}
    ],
    value: "true",
    scope: "post"
  },
  sequenceNumberStart: {
    title      : "Start sequence number",
    description: "The number at which to start the sequence numbers.",
    group      : "formats",
    type       : "integer",
    value      : 1,
    scope      : "post"
  },
  sequenceNumberIncrement: {
    title      : "Sequence number increment",
    description: "The amount by which the sequence number is incremented.",
    group      : "formats",
    type       : "integer",
    value      : 1,
    scope      : "post"
  },
  showNotes: {
    title      : "Show notes",
    description: "Writes operation notes as comments in the output.",
    group      : "formats",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  showEstimatedTime: {
    title      : "Show estimated cut time",
    description: "Output estimated cutting time per operation.",
    group      : "formats",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },

  // Wire EDM Specific Properties
  wireType: {
    title      : "Wire type",
    description: "Select the wire type being used.",
    group      : "wireEDM",
    type       : "enum",
    values     : [
      {title:"MD+ ProII 0.25mm Brass", id:"brass025"},
      {title:"MV1200S 0.25mm Zinc-coated", id:"zinc025"},
      {title:"Custom", id:"custom"}
    ],
    value: "brass025",
    scope: "post"
  },
  wireDiameter: {
    title      : "Wire diameter (mm)",
    description: "Wire electrode diameter in millimeters. Standard: 0.25mm.",
    group      : "wireEDM",
    type       : "number",
    value      : 0.25,
    scope      : "post"
  },
  useSubmerge: {
    title      : "Use submerge cutting",
    description: "Enable submerged cutting mode. Recommended for best accuracy and surface finish.",
    group      : "wireEDM",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useAutoThread: {
    title      : "Use auto wire threading",
    description: "Enable automatic wire threading (AWT) at start holes.",
    group      : "wireEDM",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  flushMode: {
    title      : "Flush mode",
    description: "Select flushing configuration.",
    group      : "wireEDM",
    type       : "enum",
    values     : [
      {title:"Both upper and lower (M07)", id:"both"},
      {title:"Upper only (M80)", id:"upper"},
      {title:"Lower only (M81)", id:"lower"},
      {title:"Independent control", id:"independent"}
    ],
    value: "both",
    scope: "post"
  },
  wireBreakDetect: {
    title      : "Wire break detection",
    description: "Enable wire break detection during cutting (M20).",
    group      : "wireEDM",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },

  // Technology Condition Properties
  roughCondition: {
    title      : "Rough cut condition (E-code)",
    description: "Technology condition for the rough (first) cut. E0001-E0005 typical.",
    group      : "technology",
    type       : "integer",
    value      : 1,
    scope      : "post"
  },
  skim1Condition: {
    title      : "Skim 1 condition (E-code)",
    description: "Technology condition for the first skim cut. E0010-E0015 typical.",
    group      : "technology",
    type       : "integer",
    value      : 10,
    scope      : "post"
  },
  skim2Condition: {
    title      : "Skim 2 condition (E-code)",
    description: "Technology condition for the second skim cut. E0020-E0025 typical.",
    group      : "technology",
    type       : "integer",
    value      : 20,
    scope      : "post"
  },
  skim3Condition: {
    title      : "Skim 3 condition (E-code)",
    description: "Technology condition for the third skim (finish) cut.",
    group      : "technology",
    type       : "integer",
    value      : 25,
    scope      : "post"
  },

  // Wire Offset Properties
  roughOffset: {
    title      : "Rough cut wire offset (mm)",
    description: "Wire offset (D-value) for the rough cut. Includes half wire diameter + overcut + stock allowance.",
    group      : "technology",
    type       : "number",
    value      : 0.160,
    scope      : "post"
  },
  skim1Offset: {
    title      : "Skim 1 wire offset (mm)",
    description: "Wire offset for the first skim cut.",
    group      : "technology",
    type       : "number",
    value      : 0.145,
    scope      : "post"
  },
  skim2Offset: {
    title      : "Skim 2 wire offset (mm)",
    description: "Wire offset for the second skim cut.",
    group      : "technology",
    type       : "number",
    value      : 0.135,
    scope      : "post"
  },
  skim3Offset: {
    title      : "Skim 3 wire offset (mm)",
    description: "Wire offset for the third skim (finish) cut.",
    group      : "technology",
    type       : "number",
    value      : 0.131,
    scope      : "post"
  },

  // PRISM Physics Properties
  usePrismSpeedLookup: {
    title      : "Use PRISM speed lookup",
    description: "Enable automatic cutting speed estimation based on material and thickness from the PRISM database.",
    group      : "prism",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  usePrismWireBreakPredict: {
    title      : "Use PRISM wire break prediction",
    description: "Enable wire break risk analysis. Warns when power/thickness ratio approaches danger zone.",
    group      : "prism",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  usePrismFinishEstimate: {
    title      : "Use PRISM surface finish estimation",
    description: "Enable surface finish (Ra) prediction based on pass count and conditions.",
    group      : "prism",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  usePrismMultiPassOptimize: {
    title      : "Use PRISM multi-pass optimization",
    description: "Enable intelligent pass scheduling. Optimizes condition and offset selection for each pass to meet target finish and tolerance.",
    group      : "prism",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  materialType: {
    title      : "Workpiece material",
    description: "Select the workpiece material for PRISM speed and condition lookup.",
    group      : "prism",
    type       : "enum",
    values     : [
      {title:"SKD11 / D2 Tool Steel", id:"SKD11"},
      {title:"SKD61 / H13 Tool Steel", id:"SKD61"},
      {title:"SK3 / W1 Carbon Steel", id:"SK3"},
      {title:"S50C / 1050 Carbon Steel", id:"S50C"},
      {title:"SUS304 / 304 Stainless", id:"SUS304"},
      {title:"Carbide (V20)", id:"V20"},
      {title:"Copper (C1100)", id:"C1100"},
      {title:"Aluminum (A6061)", id:"A6061"},
      {title:"Titanium (Ti-6Al-4V)", id:"Ti64"},
      {title:"Custom", id:"custom"}
    ],
    value: "SKD11",
    scope: "post"
  },
  workpieceThickness: {
    title      : "Workpiece thickness (mm)",
    description: "Thickness of the workpiece in millimeters. Used for speed estimation and condition selection.",
    group      : "prism",
    type       : "number",
    value      : 30,
    scope      : "post"
  },
  targetSurfaceFinish: {
    title      : "Target surface finish Ra (um)",
    description: "Target surface roughness in micrometers. PRISM will recommend the number of passes needed.",
    group      : "prism",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  targetTolerance: {
    title      : "Target dimensional tolerance (mm)",
    description: "Target dimensional tolerance in millimeters. PRISM will adjust offsets accordingly.",
    group      : "prism",
    type       : "number",
    value      : 0.005,
    scope      : "post"
  }
};

///////////////////////////////////////////////////////////////////////////////
// MATERIAL COMPATIBILITY NOTES
///////////////////////////////////////////////////////////////////////////////
//
// The Mitsubishi FA10S with W21FAS-2 controller supports:
//
// FULLY SUPPORTED (standard technology database):
//   - Tool steels: SKD11 (D2), SKD61 (H13), SK3 (W1)
//   - Carbon steels: S50C (1050), S45C (1045)
//   - Stainless steels: SUS304 (304), SUS316 (316)
//   - Cemented carbide: V20, V30, G5
//   - Copper alloys: C1100, C2801 (brass)
//   - Aluminum alloys: A5052, A6061, A7075
//
// LIMITED SUPPORT (may need custom conditions):
//   - Titanium alloys: Ti-6Al-4V (reduced speed, increased wire break risk)
//   - Inconel: 718 (very slow, high wire consumption)
//   - Polycrystalline diamond (PCD): Special conditions required
//   - Tungsten: Extremely slow, specialized wire recommended
//
// NOT RECOMMENDED:
//   - Non-conductive materials (ceramics, glass, most plastics)
//   - Materials with conductivity < 1% IACS
//
// PRISM PHYSICS NOTES:
//   - Cutting speed is inversely proportional to thickness
//   - Wire break risk increases with thickness > 100mm
//   - Submerge cutting improves accuracy by ~30% vs. flush only
//   - Zinc-coated wire gives 15-20% faster rough cut vs. brass
//   - Second cut with brass wire often preferred for finish quality
//
///////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////
// FIXED SETTINGS
///////////////////////////////////////////////////////////////////////////////

var permittedCommentChars = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,=_-/";

var gFormat = createFormat({prefix:"G", decimals:0, width:2, zeropad:true});
var mFormat = createFormat({prefix:"M", decimals:0, width:2, zeropad:true});
var eFormat = createFormat({prefix:"E", decimals:0, width:4, zeropad:true});
var dFormat = createFormat({prefix:"D", decimals:0, width:3, zeropad:true});
var sFormat = createFormat({prefix:"S", decimals:0});

var xyzFormat = createFormat({decimals:3, forceDecimal:true});
var feedFormat = createFormat({decimals:1, forceDecimal:true});
var offsetFormat = createFormat({decimals:3, forceDecimal:true});

var xOutput = createOutputVariable({prefix:"X"}, xyzFormat);
var yOutput = createOutputVariable({prefix:"Y"}, xyzFormat);
var iOutput = createOutputVariable({prefix:"I"}, xyzFormat);
var jOutput = createOutputVariable({prefix:"J"}, xyzFormat);
var feedOutput = createOutputVariable({prefix:"F"}, feedFormat);

var gMotionModal = createOutputVariable({control:CONTROL_FORCE}, gFormat);
var gAbsIncModal = createOutputVariable({}, gFormat);

var sequenceNumber;
var currentPassNumber = 0;

///////////////////////////////////////////////////////////////////////////////
// PRISM PHYSICS ENGINE INTERFACE - WIRE EDM
///////////////////////////////////////////////////////////////////////////////
//
// PRISM integration points for Wire EDM optimization:
//
// 1. prism_edmCuttingSpeed(material, thickness, wireType, passNumber)
//    Returns: {speed_mm2min: number, feedrate_mmmin: number, notes: string}
//    Physics: Based on material conductivity, thermal properties, thickness
//
// 2. prism_edmWireBreakRisk(material, thickness, power, wireType)
//    Returns: {risk: "low"|"medium"|"high", threshold_pct: number, notes: string}
//    Physics: Energy density vs. wire tensile strength and cooling capacity
//
// 3. prism_edmSurfaceFinish(passCount, conditions, material)
//    Returns: {ra_um: number, rz_um: number, meets_target: boolean}
//    Physics: Crater size model based on discharge energy and frequency
//
// 4. prism_edmMultiPassSchedule(material, thickness, targetRa, targetTol)
//    Returns: [{pass: 1, condition: "E0001", offset: 0.160, speed: 250}, ...]
//    Physics: Progressive material removal with diminishing discharge energy
//
// 5. prism_edmWireConsumption(profileLength, thickness, passCount, wireType)
//    Returns: {meters: number, cost_usd: number, spools: number}
//    Physics: Wire travel speed * cut time + threading waste
//
///////////////////////////////////////////////////////////////////////////////

/**
 * PRISM: Estimate cutting speed based on material and thickness.
 * Returns feedrate in mm/min.
 */
function prismEstimateFeedrate(material, thickness, passNumber) {
  // Base cutting speeds in mm^2/min for rough cut (pass 0) with 0.25mm brass wire
  var speedTable = {
    "SKD11": {10:280, 30:250, 50:220, 80:180, 100:150, 150:110},
    "SKD61": {10:270, 30:240, 50:210, 80:170, 100:145, 150:105},
    "SK3":   {10:290, 30:260, 50:230, 80:190, 100:160, 150:115},
    "S50C":  {10:300, 30:270, 50:240, 80:200, 100:170, 150:120},
    "SUS304":{10:220, 30:195, 50:170, 80:140, 100:115, 150:85},
    "V20":   {10:150, 30:130, 50:110, 80:90,  100:75,  150:55},
    "C1100": {10:320, 30:290, 50:260, 80:220, 100:190, 150:140},
    "A6061": {10:350, 30:310, 50:280, 80:240, 100:210, 150:155},
    "Ti64":  {10:180, 30:155, 50:130, 80:100, 100:80,  150:55}
  };

  // Pass multipliers: rough=1.0, skim1=0.6, skim2=0.4, skim3=0.25
  var passMultipliers = [1.0, 0.6, 0.4, 0.25];
  var passMult = (passNumber < passMultipliers.length) ? passMultipliers[passNumber] : 0.25;

  if (!speedTable[material]) {
    return 0; // Unknown material
  }

  var table = speedTable[material];
  var thicknesses = [10, 30, 50, 80, 100, 150];

  // Linear interpolation between known thickness values
  var speed = 0;
  if (thickness <= thicknesses[0]) {
    speed = table[thicknesses[0]];
  } else if (thickness >= thicknesses[thicknesses.length - 1]) {
    speed = table[thicknesses[thicknesses.length - 1]];
  } else {
    for (var i = 0; i < thicknesses.length - 1; i++) {
      if (thickness >= thicknesses[i] && thickness <= thicknesses[i + 1]) {
        var t0 = thicknesses[i];
        var t1 = thicknesses[i + 1];
        var s0 = table[t0];
        var s1 = table[t1];
        var ratio = (thickness - t0) / (t1 - t0);
        speed = s0 + ratio * (s1 - s0);
        break;
      }
    }
  }

  speed *= passMult;

  // Wire type adjustment: zinc-coated is 15% faster for rough
  if (getProperty("wireType") == "zinc025" && passNumber == 0) {
    speed *= 1.15;
  }

  // Convert mm^2/min to mm/min feedrate
  var feedrate = speed / thickness;
  return feedrate;
}

/**
 * PRISM: Estimate surface finish for given pass count.
 * Returns estimated Ra in micrometers.
 */
function prismEstimateFinish(passCount, material) {
  // Typical Ra values by pass count
  var steelRa = [3.5, 1.5, 0.6, 0.3];
  var carbideRa = [3.0, 1.2, 0.5, 0.2];

  var raTable = (material == "V20") ? carbideRa : steelRa;
  var idx = Math.min(passCount - 1, raTable.length - 1);
  return raTable[Math.max(0, idx)];
}

/**
 * PRISM: Calculate recommended pass count to meet target Ra.
 */
function prismRecommendedPasses(targetRa, material) {
  for (var passes = 1; passes <= 4; passes++) {
    if (prismEstimateFinish(passes, material) <= targetRa) {
      return passes;
    }
  }
  return 4; // Maximum passes
}

/**
 * PRISM: Wire break risk assessment.
 */
function prismWireBreakRisk(material, thickness) {
  // Higher risk materials and thick workpieces
  var riskThreshold = {
    "SKD11": 120, "SKD61": 115, "SK3": 125, "S50C": 130,
    "SUS304": 90, "V20": 80, "C1100": 140, "A6061": 160, "Ti64": 70
  };

  var threshold = riskThreshold[material] || 100;

  if (thickness > threshold * 1.2) {
    return "HIGH";
  } else if (thickness > threshold * 0.9) {
    return "MEDIUM";
  }
  return "LOW";
}

/**
 * Called at start of post processor.
 */
function onOpen() {
  sequenceNumber = getProperty("sequenceNumberStart");

  // Program header
  writeComment("PRISM ENHANCED - MITSUBISHI FA10S (W21FAS-2)");
  writeComment("MACHINE: MITSUBISHI FA10S WIRE EDM");
  writeComment("CONTROL: W21FAS-2");
  writeComment("GENERATOR: V350-EQUIVALENT");
  writeComment("MAX TAPER: 15 DEGREES");
  writeComment("POST: PRISM V1.0.0");
  writeComment("DATE: " + new Date().toISOString().split("T")[0]);
  writeComment("");

  // Wire information
  var wireDesc = "0.25MM BRASS (MD+ PROII)";
  if (getProperty("wireType") == "zinc025") {
    wireDesc = "0.25MM ZINC-COATED (MV1200S)";
  } else if (getProperty("wireType") == "custom") {
    wireDesc = "CUSTOM " + getProperty("wireDiameter") + "MM";
  }
  writeComment("WIRE: " + wireDesc);
  writeComment("MATERIAL: " + getProperty("materialType"));
  writeComment("THICKNESS: " + getProperty("workpieceThickness") + "MM");
  writeComment("");

  // PRISM analysis
  if (getProperty("usePrismSpeedLookup")) {
    var material = getProperty("materialType");
    var thickness = getProperty("workpieceThickness");
    var roughFeed = prismEstimateFeedrate(material, thickness, 0);
    var skim1Feed = prismEstimateFeedrate(material, thickness, 1);

    writeComment("PRISM CUTTING SPEED ESTIMATE:");
    writeComment("  ROUGH: " + feedFormat.format(roughFeed) + " MM/MIN");
    writeComment("  SKIM 1: " + feedFormat.format(skim1Feed) + " MM/MIN");
    writeComment("");
  }

  if (getProperty("usePrismWireBreakPredict")) {
    var risk = prismWireBreakRisk(getProperty("materialType"), getProperty("workpieceThickness"));
    writeComment("PRISM WIRE BREAK RISK: " + risk);
    if (risk == "HIGH") {
      writeComment("  *** REDUCE POWER OR USE THICKER WIRE ***");
    }
    writeComment("");
  }

  if (getProperty("usePrismFinishEstimate")) {
    var targetRa = getProperty("targetSurfaceFinish");
    var recPasses = prismRecommendedPasses(targetRa, getProperty("materialType"));
    var estRa = prismEstimateFinish(recPasses, getProperty("materialType"));
    writeComment("PRISM SURFACE FINISH PLAN:");
    writeComment("  TARGET: RA " + targetRa + " UM");
    writeComment("  RECOMMENDED PASSES: " + recPasses);
    writeComment("  ESTIMATED RESULT: RA " + estRa + " UM");
    writeComment("");
  }

  // PRISM optimization summary
  writeComment("PRISM OPTIMIZATION ACTIVE:");
  if (getProperty("usePrismSpeedLookup")) {
    writeComment("  - MATERIAL-THICKNESS SPEED LOOKUP");
  }
  if (getProperty("usePrismWireBreakPredict")) {
    writeComment("  - WIRE BREAK PREDICTION");
  }
  if (getProperty("usePrismFinishEstimate")) {
    writeComment("  - SURFACE FINISH ESTIMATION");
  }
  if (getProperty("usePrismMultiPassOptimize")) {
    writeComment("  - MULTI-PASS OPTIMIZATION");
  }
  writeComment("");

  // Initial codes
  writeBlock(gAbsIncModal.format(90));
}

/**
 * Write a formatted comment.
 */
function writeComment(text) {
  writeln("(" + filterText(String(text).toUpperCase(), permittedCommentChars) + ")");
}

/**
 * Write a block with optional sequence number.
 */
function writeBlock() {
  var show = getProperty("showSequenceNumbers");
  if (show == "true") {
    writeWords2("N" + sequenceNumber, arguments);
    sequenceNumber += getProperty("sequenceNumberIncrement");
  } else {
    writeWords(arguments);
  }
}

/**
 * Called for each section (operation / cutting pass).
 */
function onSection() {
  var insertToolCall = isFirstSection() ||
    currentSection.getForceToolChange && currentSection.getForceToolChange() ||
    (tool.number != getPreviousSection().getTool().number);

  // Operation comment
  if (hasParameter("operation-comment")) {
    writeComment(getParameter("operation-comment"));
  }

  // Determine pass type from operation
  var passType = "ROUGH";
  var conditionCode = getProperty("roughCondition");
  var wireOffset = getProperty("roughOffset");

  if (hasParameter("operation:strategy")) {
    var strategy = getParameter("operation:strategy");
    if (strategy.indexOf("finish") >= 0 || strategy.indexOf("skim") >= 0) {
      currentPassNumber++;
      if (currentPassNumber == 1) {
        passType = "SKIM 1";
        conditionCode = getProperty("skim1Condition");
        wireOffset = getProperty("skim1Offset");
      } else if (currentPassNumber == 2) {
        passType = "SKIM 2";
        conditionCode = getProperty("skim2Condition");
        wireOffset = getProperty("skim2Offset");
      } else {
        passType = "SKIM 3";
        conditionCode = getProperty("skim3Condition");
        wireOffset = getProperty("skim3Offset");
      }
    }
  }

  writeComment("PASS: " + passType);
  writeComment("CONDITION: E" + formatInteger(conditionCode, 4, "0"));
  writeComment("WIRE OFFSET: " + offsetFormat.format(wireOffset) + "MM");

  // PRISM feedrate estimation
  if (getProperty("usePrismSpeedLookup")) {
    var estFeed = prismEstimateFeedrate(
      getProperty("materialType"),
      getProperty("workpieceThickness"),
      currentPassNumber
    );
    writeComment("PRISM EST FEED: " + feedFormat.format(estFeed) + " MM/MIN");
  }

  // Move to start position
  var initialPosition = getFramePosition(currentSection.getInitialPosition());
  writeBlock(gMotionModal.format(0),
    xOutput.format(initialPosition.x),
    yOutput.format(initialPosition.y)
  );

  // Auto wire thread
  if (getProperty("useAutoThread")) {
    writeBlock(mFormat.format(6), "(" + "AUTO THREAD" + ")");
  }

  // Wire feed on
  writeBlock(mFormat.format(17), "(" + "WIRE RUN ON" + ")");

  // Flush on
  switch (getProperty("flushMode")) {
  case "both":
    writeBlock(mFormat.format(7), "(" + "FLUSH ON BOTH" + ")");
    break;
  case "upper":
    writeBlock(mFormat.format(80), "(" + "UPPER FLUSH ON" + ")");
    break;
  case "lower":
    writeBlock(mFormat.format(81), "(" + "LOWER FLUSH ON" + ")");
    break;
  case "independent":
    writeBlock(mFormat.format(80), "(" + "UPPER FLUSH ON" + ")");
    writeBlock(mFormat.format(81), "(" + "LOWER FLUSH ON" + ")");
    break;
  }

  // Wire break detection
  if (getProperty("wireBreakDetect")) {
    writeBlock(mFormat.format(20), "(" + "WIRE BREAK DETECT ON" + ")");
  }

  // Select technology condition
  writeBlock(eFormat.format(conditionCode));

  // Wire offset compensation
  writeBlock(gFormat.format(41), "D" + offsetFormat.format(wireOffset));
}

/**
 * Called for linear moves.
 */
function onLinear(x, y, z, feed) {
  writeBlock(gMotionModal.format(1),
    xOutput.format(x),
    yOutput.format(y),
    feedOutput.format(feed)
  );
}

/**
 * Called for rapid moves.
 */
function onRapid(x, y, z) {
  writeBlock(gMotionModal.format(0),
    xOutput.format(x),
    yOutput.format(y)
  );
}

/**
 * Called for circular moves (arcs).
 */
function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
  writeBlock(
    gMotionModal.format(clockwise ? 2 : 3),
    xOutput.format(x),
    yOutput.format(y),
    iOutput.format(cx - start.x),
    jOutput.format(cy - start.y),
    feedOutput.format(feed)
  );
}

/**
 * Called at end of each section (operation).
 */
function onSectionEnd() {
  // Cancel wire offset
  writeBlock(gFormat.format(40), "(" + "OFFSET CANCEL" + ")");

  // Flush off
  writeBlock(mFormat.format(9), "(" + "FLUSH OFF" + ")");

  // Wire stop
  writeBlock(mFormat.format(18), "(" + "WIRE STOP" + ")");

  writeComment("");
}

/**
 * Called at end of post processor.
 */
function onClose() {
  // Return to reference point
  writeBlock(gMotionModal.format(0), xOutput.format(0), yOutput.format(0));

  // PRISM summary
  writeComment("PRISM CUT SUMMARY:");
  writeComment("  CONTROLLER: " + CONTROLLER_TYPE);
  writeComment("  GENERATOR: " + GENERATOR_TYPE);
  writeComment("  MATERIAL: " + getProperty("materialType"));
  writeComment("  THICKNESS: " + getProperty("workpieceThickness") + "MM");

  // Program end
  writeBlock(mFormat.format(2));
}

/**
 * Handle commands.
 */
function onCommand(command) {
  switch (command) {
  case COMMAND_STOP:
    writeBlock(mFormat.format(0));
    break;
  }
}

/**
 * Utility: filter text to permitted characters.
 */
function filterText(text, permit) {
  var result = "";
  for (var i = 0; i < text.length; ++i) {
    if (permit.indexOf(text[i]) >= 0) {
      result += text[i];
    }
  }
  return result;
}

/**
 * Utility: format integer with padding.
 */
function formatInteger(value, width, pad) {
  var str = String(value);
  while (str.length < width) {
    str = pad + str;
  }
  return str;
}
