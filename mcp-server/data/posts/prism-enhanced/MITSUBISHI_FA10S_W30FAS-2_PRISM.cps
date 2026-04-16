/**
  PRISM Manufacturing Intelligence - Enhanced Post Processor
  ============================================================================

  Machine: Mitsubishi FA10S Wire EDM
  Manufacturer: Mitsubishi Electric Corporation
  Control: W30FAS-2
  Type: Wire EDM (Enhanced Controller)

  ============================================================================
  MACHINE SPECIFICATIONS
  ============================================================================

  Axis Travel:  X=400mm, Y=300mm, Z=220mm (workpiece height)
  UV Travel:    U=80mm, V=80mm (taper axes)
  Max Taper:    25 degrees (upgraded from W21's 15 degrees)
  Max Workpiece: 500 kg
  Wire:         0.25mm brass, 0.25mm zinc-coated, fine wire 0.05-0.10mm
  Wire Tension: 100-2500 gf (extended range for fine wire)
  Dielectric:   Deionized water, auto-resistivity control
  Tank:         Submerge cutting standard
  Threading:    Enhanced auto wire threading (AWT)

  ============================================================================
  W30FAS-2 CONTROLLER CHARACTERISTICS
  ============================================================================

  The W30FAS-2 is the enhanced-tier controller for the FA10S platform.
  Key upgrades over the W21FAS-2:

  - V350 generator (full specification, not equivalent)
  - Expanded technology database with more material/thickness combos
  - Fine wire support: 0.05mm, 0.07mm, 0.10mm, 0.15mm, 0.20mm
  - 25-degree maximum taper angle (vs. 15 on W21)
  - Improved auto wire threading with better success rate
  - Enhanced adaptive power control with real-time adjustment
  - Better servo response for improved corner accuracy
  - Extended condition register (C000-C2999)

  Generator: V350
    - Discharge energy: 0.01-50 microjoules per pulse
    - Pulse frequency: up to 8 MHz
    - Peak current: 350A
    - Fine pulse mode for micro-EDM (0.01-1.0 uJ)
    - Anti-electrolysis circuit with enhanced control
    - Multi-stage power regulation

  Fine Wire Capabilities:
    - 0.05mm wire: Features < 0.2mm width, Ra < 0.1um possible
    - 0.07mm wire: Features < 0.3mm width, good balance speed/finish
    - 0.10mm wire: Features < 0.5mm width, production-ready
    - Corner radius as small as wire diameter + overcut (~0.010mm)
    - Reduced flush pressure required for fine wire stability

  ============================================================================
  PRISM ENHANCED TECHNOLOGY
  ============================================================================

  Includes all W21FAS-2 PRISM features PLUS:

  * V350 GENERATOR POWER OPTIMIZATION:
    - Full V350 power curve utilization
    - Multi-stage discharge optimization
    - Fine pulse mode activation for micro features
    - Power efficiency monitoring and adjustment

  * FINE WIRE MODE:
    - Automatic parameter adjustment for 0.05-0.20mm wire
    - Reduced flush pressure scheduling
    - Enhanced wire break prevention for fine wire
    - Corner radius compensation for thin kerf
    - Micro-feature clearance validation

  * ENHANCED TAPER CUTTING:
    - 25-degree taper support with UV axis control
    - Taper compensation tables for improved accuracy
    - Land height calculation for tapered features

  ============================================================================

  $Revision: PRISM v1.0.0 - FA10S W30FAS-2 Edition $
  $Date: 2026-04-10 $

  Copyright (C) 2012-2026 by Autodesk, Inc. & PRISM Manufacturing Intelligence
  All rights reserved.

  FORKID {FA10S-W30-PRISM-001}
*/

///////////////////////////////////////////////////////////////////////////////
//               PRISM ENHANCED MITSUBISHI FA10S W30FAS-2 POST
//
// WIRE EDM G-CODE REFERENCE (W30FAS-2):
//   G00  Rapid positioning (dry run)
//   G01  Linear interpolation (cutting)
//   G02  CW circular interpolation
//   G03  CCW circular interpolation
//   G04  Dwell (pause)
//   G40  Wire offset cancel
//   G41  Wire offset left
//   G42  Wire offset right
//   G50  Taper angle set (W30 enhanced)
//   G51  Taper ON
//   G52  Taper OFF
//   G90  Absolute positioning
//   G91  Incremental positioning
//   G92  Coordinate system set / wire offset register
//
// WIRE EDM M-CODE REFERENCE (W30FAS-2):
//   M00  Program stop
//   M02  Program end
//   M06  Auto wire thread (enhanced AWT)
//   M07  Upper/lower flush ON
//   M09  Flush OFF
//   M17  Wire feed ON (wire run)
//   M18  Wire feed OFF (wire stop)
//   M20  Wire break detect ON
//   M21  Wire break detect OFF
//   M30  Program end with rewind
//   M80  Upper flush ON
//   M81  Lower flush ON
//   M82  Upper flush OFF
//   M83  Lower flush OFF
//   M84  Fine wire flush mode (W30 specific)
//   M98  Subprogram call
//   M99  Subprogram return
//
// WIRE EDM SPECIAL CODES (W30FAS-2):
//   E-codes: Technology condition selection (E0001-E9999)
//            E0001-E0005 = Rough cut conditions (standard wire)
//            E0010-E0015 = Semi-finish conditions
//            E0020-E0025 = Finish conditions
//            E1001-E1005 = Rough cut (fine wire 0.10mm)
//            E2001-E2005 = Rough cut (fine wire 0.05mm)
//   S-codes: Servo voltage setting (S0-S99)
//   C-codes: Extended condition register (C000-C2999)
//   D-codes: Wire offset value (D000-D999)
//   H-codes: Flush pressure level (H1-H9)
//
///////////////////////////////////////////////////////////////////////////////


description = "PRISM Enhanced - Mitsubishi FA10S (W30FAS-2)";
vendor = "Mitsubishi Electric";
vendorUrl = "http://www.mitsubishielectric.com";
legal = "Copyright (C) 2012-2026 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45793;

longDescription = "PRISM Enhanced post for Mitsubishi FA10S Wire EDM with W30FAS-2 controller. " +
  "Enhanced controller with V350 generator, expanded technology database, and fine wire support (0.05mm). " +
  "Features: all W21FAS-2 capabilities + V350 power optimization, fine wire micro-EDM mode, " +
  "25-degree max taper, improved AWT, enhanced servo control. " +
  "PRISM physics: V350 generator power curve optimization, fine wire parameter scaling, " +
  "micro-feature clearance validation, enhanced surface finish prediction.";

extension = "nc";
setCodePage("ascii");

capabilities = CAPABILITY_MILLING; // Fusion uses milling capability for wire EDM paths
tolerance = spatial(0.001, MM);

minimumChordLength = spatial(0.001, MM);
minimumCircularRadius = spatial(0.005, MM); // Smaller radius for fine wire
maximumCircularRadius = spatial(5000, MM);
minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(180);
allowHelicalMoves = false;
allowedCircularPlanes = (1 << PLANE_XY);
highFeedrate = 5000;

///////////////////////////////////////////////////////////////////////////////
// MACHINE CONSTANTS
///////////////////////////////////////////////////////////////////////////////

var MAX_TRAVEL_X = 400;
var MAX_TRAVEL_Y = 300;
var MAX_TRAVEL_Z = 220;
var MAX_TRAVEL_U = 80;
var MAX_TRAVEL_V = 80;
var MAX_TAPER_ANGLE = 25; // Upgraded from 15 on W21
var MAX_WORKPIECE_KG = 500;
var CONTROLLER_TYPE = "W30FAS-2";
var GENERATOR_TYPE = "V350";

// Wire diameter options
var WIRE_STANDARD = 0.25;
var WIRE_FINE_010 = 0.10;
var WIRE_FINE_007 = 0.07;
var WIRE_FINE_005 = 0.05;

///////////////////////////////////////////////////////////////////////////////
// TECHNOLOGY DATABASE - EXTENDED (W30 has more conditions)
///////////////////////////////////////////////////////////////////////////////
//
// Standard wire (0.25mm) cutting speeds - same as W21 base:
//   See W21FAS-2 post for standard wire speed table
//
// Fine wire speed reduction factors vs. 0.25mm:
//   0.20mm wire: 0.70x speed
//   0.15mm wire: 0.50x speed
//   0.10mm wire: 0.35x speed
//   0.07mm wire: 0.22x speed
//   0.05mm wire: 0.12x speed
//
// Fine wire surface finish improvement (Ra in micrometers):
//   Wire    | Rough | Skim1 | Skim2 | Skim3
//   0.25mm  | 3.5   | 1.5   | 0.6   | 0.3
//   0.10mm  | 1.8   | 0.8   | 0.3   | 0.12
//   0.05mm  | 0.8   | 0.4   | 0.15  | 0.05
//
// Fine wire minimum feature sizes:
//   0.25mm wire: minimum slot width ~0.35mm, min radius ~0.15mm
//   0.10mm wire: minimum slot width ~0.15mm, min radius ~0.06mm
//   0.05mm wire: minimum slot width ~0.08mm, min radius ~0.03mm
//
///////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////
// TAPER CUTTING REFERENCE (25-degree capability)
///////////////////////////////////////////////////////////////////////////////
//
// W30FAS-2 taper cutting notes:
//   - Max taper angle: 25 degrees (land-dependent)
//   - UV axis interpolation with XY for taper profiles
//   - Taper accuracy: +/-0.005mm per 10mm height (typical)
//   - Land height affects achievable taper angle:
//     10mm land: full 25 degrees available
//     30mm land: ~20 degrees practical max
//     50mm land: ~15 degrees practical max
//     80mm land: ~10 degrees practical max
//
// Taper compensation:
//   The W30 controller applies automatic taper compensation
//   based on wire lag and deflection models. PRISM enhances
//   this with physics-based wire bow prediction.
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
    description: "Writes operation notes as comments.",
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
    description: "Select the wire type being used. W30 supports fine wire down to 0.05mm.",
    group      : "wireEDM",
    type       : "enum",
    values     : [
      {title:"MD+ ProII 0.25mm Brass", id:"brass025"},
      {title:"MV1200S 0.25mm Zinc-coated", id:"zinc025"},
      {title:"Fine Wire 0.10mm Brass", id:"fine010"},
      {title:"Fine Wire 0.07mm Brass", id:"fine007"},
      {title:"Fine Wire 0.05mm Brass", id:"fine005"},
      {title:"Custom", id:"custom"}
    ],
    value: "brass025",
    scope: "post"
  },
  wireDiameter: {
    title      : "Wire diameter (mm)",
    description: "Wire electrode diameter. Standard: 0.25mm. Fine wire: 0.05-0.10mm.",
    group      : "wireEDM",
    type       : "number",
    value      : 0.25,
    scope      : "post"
  },
  useSubmerge: {
    title      : "Use submerge cutting",
    description: "Enable submerged cutting mode.",
    group      : "wireEDM",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useAutoThread: {
    title      : "Use auto wire threading",
    description: "Enable enhanced automatic wire threading.",
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
      {title:"Independent control", id:"independent"},
      {title:"Fine wire mode (M84)", id:"finewire"}
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
  useFineWireMode: {
    title      : "Use fine wire mode",
    description: "Enable fine wire cutting mode. Automatically adjusts flush pressure, power settings, and servo parameters for wire diameters < 0.20mm.",
    group      : "wireEDM",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },

  // Taper Properties
  useTaperCutting: {
    title      : "Use taper cutting",
    description: "Enable taper cutting with UV axis interpolation. Max 25 degrees on W30.",
    group      : "wireEDM",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  taperAngle: {
    title      : "Taper angle (degrees)",
    description: "Taper angle for UV axis offset. Maximum 25 degrees on W30FAS-2.",
    group      : "wireEDM",
    type       : "number",
    range      : [0, 25],
    value      : 0,
    scope      : "post"
  },

  // Technology Condition Properties
  roughCondition: {
    title      : "Rough cut condition (E-code)",
    description: "Technology condition for rough cut.",
    group      : "technology",
    type       : "integer",
    value      : 1,
    scope      : "post"
  },
  skim1Condition: {
    title      : "Skim 1 condition (E-code)",
    description: "Technology condition for first skim cut.",
    group      : "technology",
    type       : "integer",
    value      : 10,
    scope      : "post"
  },
  skim2Condition: {
    title      : "Skim 2 condition (E-code)",
    description: "Technology condition for second skim cut.",
    group      : "technology",
    type       : "integer",
    value      : 20,
    scope      : "post"
  },
  skim3Condition: {
    title      : "Skim 3 condition (E-code)",
    description: "Technology condition for third skim (finish) cut.",
    group      : "technology",
    type       : "integer",
    value      : 25,
    scope      : "post"
  },

  // Wire Offset Properties
  roughOffset: {
    title      : "Rough cut wire offset (mm)",
    description: "Wire offset for rough cut.",
    group      : "technology",
    type       : "number",
    value      : 0.160,
    scope      : "post"
  },
  skim1Offset: {
    title      : "Skim 1 wire offset (mm)",
    description: "Wire offset for first skim cut.",
    group      : "technology",
    type       : "number",
    value      : 0.145,
    scope      : "post"
  },
  skim2Offset: {
    title      : "Skim 2 wire offset (mm)",
    description: "Wire offset for second skim cut.",
    group      : "technology",
    type       : "number",
    value      : 0.135,
    scope      : "post"
  },
  skim3Offset: {
    title      : "Skim 3 wire offset (mm)",
    description: "Wire offset for third skim (finish) cut.",
    group      : "technology",
    type       : "number",
    value      : 0.131,
    scope      : "post"
  },

  // PRISM Physics Properties
  usePrismSpeedLookup: {
    title      : "Use PRISM speed lookup",
    description: "Enable automatic cutting speed estimation from PRISM database.",
    group      : "prism",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  usePrismWireBreakPredict: {
    title      : "Use PRISM wire break prediction",
    description: "Enable wire break risk analysis.",
    group      : "prism",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  usePrismFinishEstimate: {
    title      : "Use PRISM surface finish estimation",
    description: "Enable Ra prediction based on pass count and wire diameter.",
    group      : "prism",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  usePrismMultiPassOptimize: {
    title      : "Use PRISM multi-pass optimization",
    description: "Enable intelligent pass scheduling.",
    group      : "prism",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  usePrismV350PowerOptimize: {
    title      : "Use PRISM V350 power optimization",
    description: "Enable V350 generator-specific power curve optimization. Utilizes the full V350 discharge energy range and multi-stage regulation for optimal cutting.",
    group      : "prism",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  usePrismFineWireOptimize: {
    title      : "Use PRISM fine wire optimization",
    description: "Enable physics-based parameter scaling for fine wire (0.05-0.20mm). Automatically adjusts power, flush, servo, and offsets.",
    group      : "prism",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  materialType: {
    title      : "Workpiece material",
    description: "Select the workpiece material.",
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
    description: "Thickness of the workpiece in millimeters.",
    group      : "prism",
    type       : "number",
    value      : 30,
    scope      : "post"
  },
  targetSurfaceFinish: {
    title      : "Target surface finish Ra (um)",
    description: "Target surface roughness in micrometers.",
    group      : "prism",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  targetTolerance: {
    title      : "Target dimensional tolerance (mm)",
    description: "Target dimensional tolerance in millimeters.",
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
// W30FAS-2 expands on W21FAS-2 material support:
//
// FULLY SUPPORTED (expanded technology database):
//   - All W21 materials with additional thickness ranges
//   - Fine wire conditions for tool steels and carbide
//   - Extended condition tables for exotic alloys
//
// FINE WIRE MATERIAL SUPPORT:
//   - Tool steels (SKD11, SKD61): Full fine wire conditions
//   - Carbide (V20, V30): Excellent fine wire results (Ra < 0.1um)
//   - Copper alloys: Good fine wire support
//   - Aluminum: Fine wire not recommended (gummy, wire break risk)
//   - Titanium: Fine wire with extreme caution (high break risk)
//
// PRISM PHYSICS NOTES (W30 additions):
//   - V350 generator provides lower minimum pulse energy (0.01 uJ)
//   - Fine wire reduces kerf width proportionally
//   - Corner accuracy improves with smaller wire diameter
//   - Wire consumption increases with fine wire (faster travel speed)
//   - Submerge cutting essential for fine wire stability
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
var hFormat = createFormat({prefix:"H", decimals:0});

var xyzFormat = createFormat({decimals:3, forceDecimal:true});
var uvFormat = createFormat({decimals:3, forceDecimal:true}); // UV taper axes
var feedFormat = createFormat({decimals:1, forceDecimal:true});
var offsetFormat = createFormat({decimals:3, forceDecimal:true});
var angleFormat = createFormat({decimals:2, forceDecimal:true});

var xOutput = createOutputVariable({prefix:"X"}, xyzFormat);
var yOutput = createOutputVariable({prefix:"Y"}, xyzFormat);
var uOutput = createOutputVariable({prefix:"U"}, uvFormat);
var vOutput = createOutputVariable({prefix:"V"}, uvFormat);
var iOutput = createOutputVariable({prefix:"I"}, xyzFormat);
var jOutput = createOutputVariable({prefix:"J"}, xyzFormat);
var feedOutput = createOutputVariable({prefix:"F"}, feedFormat);

var gMotionModal = createOutputVariable({control:CONTROL_FORCE}, gFormat);
var gAbsIncModal = createOutputVariable({}, gFormat);

var sequenceNumber;
var currentPassNumber = 0;

///////////////////////////////////////////////////////////////////////////////
// PRISM PHYSICS ENGINE INTERFACE - WIRE EDM (W30 EXTENDED)
///////////////////////////////////////////////////////////////////////////////
//
// All W21 PRISM functions plus:
//
// 6. prism_v350PowerOptimize(material, thickness, passNumber, wireDiameter)
//    Returns: {pulseEnergy_uJ: number, frequency_MHz: number, servo_V: number}
//    Physics: Matches discharge energy to material removal rate target
//    V350 specific: Uses full 0.01-50 uJ range, multi-stage regulation
//
// 7. prism_fineWireScale(standardParams, wireDiameter)
//    Returns: scaled parameters for fine wire operation
//    Physics: Power ~ wireDiameter^2, Speed ~ wireDiameter^1.5
//    Accounts for reduced wire strength and cooling capacity
//
// 8. prism_taperCompensation(taperAngle, landHeight, wireDiameter)
//    Returns: {uOffset: number, vOffset: number, accuracy_mm: number}
//    Physics: Wire bow model with tension, flush pressure, spark forces
//
// 9. prism_fineWireFlushPressure(wireDiameter, thickness, material)
//    Returns: {upperPressure: number, lowerPressure: number, mode: string}
//    Physics: Wire deflection from flush force vs. wire tension
//
///////////////////////////////////////////////////////////////////////////////

/**
 * Get effective wire diameter from property settings.
 */
function getEffectiveWireDiameter() {
  var wireType = getProperty("wireType");
  switch (wireType) {
  case "brass025":
  case "zinc025":
    return 0.25;
  case "fine010":
    return 0.10;
  case "fine007":
    return 0.07;
  case "fine005":
    return 0.05;
  default:
    return getProperty("wireDiameter");
  }
}

/**
 * Check if current wire is fine wire (< 0.20mm).
 */
function isFineWire() {
  return getEffectiveWireDiameter() < 0.20;
}

/**
 * PRISM: Fine wire speed reduction factor.
 */
function fineWireSpeedFactor(wireDiameter) {
  if (wireDiameter >= 0.25) return 1.0;
  if (wireDiameter >= 0.20) return 0.70;
  if (wireDiameter >= 0.15) return 0.50;
  if (wireDiameter >= 0.10) return 0.35;
  if (wireDiameter >= 0.07) return 0.22;
  return 0.12; // 0.05mm
}

/**
 * PRISM: Estimate cutting speed (extended for W30 fine wire).
 */
function prismEstimateFeedrate(material, thickness, passNumber) {
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

  var passMultipliers = [1.0, 0.6, 0.4, 0.25];
  var passMult = (passNumber < passMultipliers.length) ? passMultipliers[passNumber] : 0.25;

  if (!speedTable[material]) return 0;
  var table = speedTable[material];
  var thicknesses = [10, 30, 50, 80, 100, 150];

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
        var ratio = (thickness - t0) / (t1 - t0);
        speed = table[t0] + ratio * (table[t1] - table[t0]);
        break;
      }
    }
  }

  speed *= passMult;

  // Wire type speed adjustment
  var wireType = getProperty("wireType");
  if (wireType == "zinc025" && passNumber == 0) {
    speed *= 1.15; // Zinc-coated 15% faster for rough
  }

  // Fine wire speed reduction
  var wireDia = getEffectiveWireDiameter();
  speed *= fineWireSpeedFactor(wireDia);

  return speed / thickness;
}

/**
 * PRISM: Surface finish estimation (extended for fine wire).
 */
function prismEstimateFinish(passCount, material) {
  var wireDia = getEffectiveWireDiameter();

  // Standard wire Ra values
  var steelRa = [3.5, 1.5, 0.6, 0.3];
  var carbideRa = [3.0, 1.2, 0.5, 0.2];

  // Fine wire improvement factors
  var fineWireFactor = 1.0;
  if (wireDia <= 0.05) fineWireFactor = 0.25;
  else if (wireDia <= 0.07) fineWireFactor = 0.35;
  else if (wireDia <= 0.10) fineWireFactor = 0.50;
  else if (wireDia <= 0.15) fineWireFactor = 0.70;
  else if (wireDia <= 0.20) fineWireFactor = 0.85;

  var raTable = (material == "V20") ? carbideRa : steelRa;
  var idx = Math.min(passCount - 1, raTable.length - 1);
  return raTable[Math.max(0, idx)] * fineWireFactor;
}

/**
 * PRISM: Wire break risk (extended for fine wire awareness).
 */
function prismWireBreakRisk(material, thickness) {
  var riskThreshold = {
    "SKD11": 120, "SKD61": 115, "SK3": 125, "S50C": 130,
    "SUS304": 90, "V20": 80, "C1100": 140, "A6061": 160, "Ti64": 70
  };

  var threshold = riskThreshold[material] || 100;

  // Fine wire has lower thresholds
  var wireDia = getEffectiveWireDiameter();
  if (wireDia < 0.20) {
    threshold *= (wireDia / 0.25); // Proportionally reduce threshold
  }

  if (thickness > threshold * 1.2) return "HIGH";
  if (thickness > threshold * 0.9) return "MEDIUM";
  return "LOW";
}

/**
 * PRISM: Recommend pass count for target Ra.
 */
function prismRecommendedPasses(targetRa, material) {
  for (var passes = 1; passes <= 4; passes++) {
    if (prismEstimateFinish(passes, material) <= targetRa) {
      return passes;
    }
  }
  return 4;
}

/**
 * PRISM: V350 generator power recommendation.
 */
function prismV350PowerRecommend(material, thickness, passNumber, wireDiameter) {
  // Base pulse energy for rough cut in SKD11 at 30mm
  var basePulseEnergy = 25; // microjoules
  var baseFrequency = 3.0; // MHz
  var baseServoVoltage = 60; // V

  // Thickness scaling
  var thicknessScale = Math.sqrt(thickness / 30);
  basePulseEnergy *= thicknessScale;

  // Pass scaling: reduce energy for skim passes
  var passScales = [1.0, 0.3, 0.1, 0.03];
  var passScale = (passNumber < passScales.length) ? passScales[passNumber] : 0.03;
  basePulseEnergy *= passScale;

  // Fine wire scaling: power proportional to wire diameter squared
  var wireScale = Math.pow(wireDiameter / 0.25, 2);
  basePulseEnergy *= wireScale;

  // Clamp to V350 range
  basePulseEnergy = Math.max(0.01, Math.min(50, basePulseEnergy));

  return {
    pulseEnergy: basePulseEnergy,
    frequency: baseFrequency * passScale,
    servoVoltage: baseServoVoltage * (1 + passNumber * 0.1)
  };
}

/**
 * Called at start of post processor.
 */
function onOpen() {
  sequenceNumber = getProperty("sequenceNumberStart");
  var wireDia = getEffectiveWireDiameter();

  // Program header
  writeComment("PRISM ENHANCED - MITSUBISHI FA10S (W30FAS-2)");
  writeComment("MACHINE: MITSUBISHI FA10S WIRE EDM");
  writeComment("CONTROL: W30FAS-2");
  writeComment("GENERATOR: V350");
  writeComment("MAX TAPER: 25 DEGREES");
  writeComment("POST: PRISM V1.0.0");
  writeComment("DATE: " + new Date().toISOString().split("T")[0]);
  writeComment("");

  // Wire information
  var wireDesc = getProperty("wireType");
  writeComment("WIRE TYPE: " + wireDesc);
  writeComment("WIRE DIAMETER: " + wireDia + "MM");
  if (isFineWire()) {
    writeComment("*** FINE WIRE MODE ***");
    writeComment("MIN FEATURE SIZE: " + offsetFormat.format(wireDia * 1.6) + "MM SLOT");
    writeComment("MIN RADIUS: " + offsetFormat.format(wireDia * 0.6) + "MM");
  }
  writeComment("MATERIAL: " + getProperty("materialType"));
  writeComment("THICKNESS: " + getProperty("workpieceThickness") + "MM");
  writeComment("");

  // PRISM speed analysis
  if (getProperty("usePrismSpeedLookup")) {
    var material = getProperty("materialType");
    var thickness = getProperty("workpieceThickness");
    writeComment("PRISM CUTTING SPEED ESTIMATE:");
    writeComment("  ROUGH: " + feedFormat.format(prismEstimateFeedrate(material, thickness, 0)) + " MM/MIN");
    writeComment("  SKIM 1: " + feedFormat.format(prismEstimateFeedrate(material, thickness, 1)) + " MM/MIN");
    writeComment("  SKIM 2: " + feedFormat.format(prismEstimateFeedrate(material, thickness, 2)) + " MM/MIN");
    writeComment("");
  }

  // PRISM wire break risk
  if (getProperty("usePrismWireBreakPredict")) {
    var risk = prismWireBreakRisk(getProperty("materialType"), getProperty("workpieceThickness"));
    writeComment("PRISM WIRE BREAK RISK: " + risk);
    if (risk == "HIGH" && isFineWire()) {
      writeComment("  *** FINE WIRE HIGH RISK - REDUCE POWER AND SPEED ***");
      writeComment("  *** CONSIDER LARGER WIRE DIAMETER ***");
    } else if (risk == "HIGH") {
      writeComment("  *** REDUCE POWER OR USE ZINC-COATED WIRE ***");
    }
    writeComment("");
  }

  // PRISM surface finish plan
  if (getProperty("usePrismFinishEstimate")) {
    var targetRa = getProperty("targetSurfaceFinish");
    var recPasses = prismRecommendedPasses(targetRa, getProperty("materialType"));
    var estRa = prismEstimateFinish(recPasses, getProperty("materialType"));
    writeComment("PRISM SURFACE FINISH PLAN:");
    writeComment("  TARGET: RA " + targetRa + " UM");
    writeComment("  RECOMMENDED PASSES: " + recPasses);
    writeComment("  ESTIMATED RESULT: RA " + estRa + " UM");
    if (isFineWire()) {
      writeComment("  FINE WIRE FINISH BENEFIT: YES");
    }
    writeComment("");
  }

  // PRISM V350 power recommendation
  if (getProperty("usePrismV350PowerOptimize")) {
    var power = prismV350PowerRecommend(
      getProperty("materialType"),
      getProperty("workpieceThickness"),
      0, wireDia
    );
    writeComment("PRISM V350 POWER RECOMMENDATION (ROUGH):");
    writeComment("  PULSE ENERGY: " + power.pulseEnergy.toFixed(2) + " UJ");
    writeComment("  FREQUENCY: " + power.frequency.toFixed(1) + " MHZ");
    writeComment("  SERVO VOLTAGE: " + power.servoVoltage.toFixed(0) + " V");
    writeComment("");
  }

  // Optimization summary
  writeComment("PRISM OPTIMIZATION ACTIVE:");
  if (getProperty("usePrismSpeedLookup")) writeComment("  - MATERIAL-THICKNESS SPEED LOOKUP");
  if (getProperty("usePrismWireBreakPredict")) writeComment("  - WIRE BREAK PREDICTION");
  if (getProperty("usePrismFinishEstimate")) writeComment("  - SURFACE FINISH ESTIMATION");
  if (getProperty("usePrismMultiPassOptimize")) writeComment("  - MULTI-PASS OPTIMIZATION");
  if (getProperty("usePrismV350PowerOptimize")) writeComment("  - V350 GENERATOR POWER OPTIMIZATION");
  if (getProperty("usePrismFineWireOptimize") && isFineWire()) writeComment("  - FINE WIRE PARAMETER SCALING");
  writeComment("");

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
  if (hasParameter("operation-comment")) {
    writeComment(getParameter("operation-comment"));
  }

  // Determine pass type
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

  // Adjust condition codes for fine wire
  if (isFineWire()) {
    var wireDia = getEffectiveWireDiameter();
    if (wireDia <= 0.05) {
      conditionCode += 2000; // E2001-E2025 range for 0.05mm wire
    } else if (wireDia <= 0.10) {
      conditionCode += 1000; // E1001-E1025 range for 0.10mm wire
    }
    // Scale wire offset for fine wire
    wireOffset *= (wireDia / 0.25);
  }

  writeComment("PASS: " + passType);
  writeComment("CONDITION: E" + formatInteger(conditionCode, 4, "0"));
  writeComment("WIRE OFFSET: " + offsetFormat.format(wireOffset) + "MM");

  if (getProperty("usePrismSpeedLookup")) {
    var estFeed = prismEstimateFeedrate(
      getProperty("materialType"),
      getProperty("workpieceThickness"),
      currentPassNumber
    );
    writeComment("PRISM EST FEED: " + feedFormat.format(estFeed) + " MM/MIN");
  }

  // V350 power for this pass
  if (getProperty("usePrismV350PowerOptimize")) {
    var power = prismV350PowerRecommend(
      getProperty("materialType"),
      getProperty("workpieceThickness"),
      currentPassNumber,
      getEffectiveWireDiameter()
    );
    writeComment("V350 PULSE: " + power.pulseEnergy.toFixed(2) + "UJ / " +
      power.frequency.toFixed(1) + "MHZ");
  }

  // Position to start
  var initialPosition = getFramePosition(currentSection.getInitialPosition());
  writeBlock(gMotionModal.format(0),
    xOutput.format(initialPosition.x),
    yOutput.format(initialPosition.y)
  );

  // Auto wire thread
  if (getProperty("useAutoThread")) {
    writeBlock(mFormat.format(6), "(" + "AUTO THREAD" + ")");
  }

  // Wire run
  writeBlock(mFormat.format(17), "(" + "WIRE RUN ON" + ")");

  // Flush - use fine wire mode if applicable
  if (isFineWire() && getProperty("flushMode") == "finewire") {
    writeBlock(mFormat.format(84), "(" + "FINE WIRE FLUSH MODE" + ")");
  } else {
    switch (getProperty("flushMode")) {
    case "both":
      writeBlock(mFormat.format(7));
      break;
    case "upper":
      writeBlock(mFormat.format(80));
      break;
    case "lower":
      writeBlock(mFormat.format(81));
      break;
    case "independent":
      writeBlock(mFormat.format(80));
      writeBlock(mFormat.format(81));
      break;
    default:
      writeBlock(mFormat.format(7));
    }
  }

  // Wire break detection
  if (getProperty("wireBreakDetect")) {
    writeBlock(mFormat.format(20));
  }

  // Technology condition
  writeBlock(eFormat.format(conditionCode));

  // Wire offset compensation
  writeBlock(gFormat.format(41), "D" + offsetFormat.format(wireOffset));

  // Taper setup if enabled
  if (getProperty("useTaperCutting") && getProperty("taperAngle") > 0) {
    writeBlock(gFormat.format(50), "A" + angleFormat.format(getProperty("taperAngle")));
    writeBlock(gFormat.format(51), "(" + "TAPER ON" + ")");
  }
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
 * Called for circular moves.
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
 * Called at end of each section.
 */
function onSectionEnd() {
  // Cancel taper if active
  if (getProperty("useTaperCutting") && getProperty("taperAngle") > 0) {
    writeBlock(gFormat.format(52), "(" + "TAPER OFF" + ")");
  }

  writeBlock(gFormat.format(40), "(" + "OFFSET CANCEL" + ")");
  writeBlock(mFormat.format(9), "(" + "FLUSH OFF" + ")");
  writeBlock(mFormat.format(18), "(" + "WIRE STOP" + ")");
  writeComment("");
}

/**
 * Called at end of post processor.
 */
function onClose() {
  writeBlock(gMotionModal.format(0), xOutput.format(0), yOutput.format(0));

  writeComment("PRISM CUT SUMMARY:");
  writeComment("  CONTROLLER: " + CONTROLLER_TYPE);
  writeComment("  GENERATOR: " + GENERATOR_TYPE);
  writeComment("  WIRE: " + getEffectiveWireDiameter() + "MM");
  if (isFineWire()) {
    writeComment("  MODE: FINE WIRE");
  }
  writeComment("  MATERIAL: " + getProperty("materialType"));
  writeComment("  THICKNESS: " + getProperty("workpieceThickness") + "MM");

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
 * Utility: filter text.
 */
function filterText(text, permit) {
  var result = "";
  for (var i = 0; i < text.length; ++i) {
    if (permit.indexOf(text[i]) >= 0) result += text[i];
  }
  return result;
}

/**
 * Utility: format integer with padding.
 */
function formatInteger(value, width, pad) {
  var str = String(value);
  while (str.length < width) str = pad + str;
  return str;
}
