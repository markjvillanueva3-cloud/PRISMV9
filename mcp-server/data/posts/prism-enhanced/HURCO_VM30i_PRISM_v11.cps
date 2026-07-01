/**
  PRISM Manufacturing Intelligence - Enhanced Post Processor
  ============================================================================
  
  Machine: HURCO VM30i
  Manufacturer: HURCO
  Control: WinMax (ISNC/BNC Compatible)
  Type: 3-Axis Vertical Machining Center
  
  ============================================================================
  PRISM ENHANCED ROUGHING TECHNOLOGY(TM)
  ============================================================================
  
  This post processor incorporates the best of all advanced roughing
  technologies, including:
  
  * PRISM ENHANCED ROUGHING TECHNOLOGY:
    - Dynamic Depth Feed Adjustment (KEY to fast 3D adaptive!)
    - Intelligent Chip Thinning Compensation
    - Corner Deceleration Control with G-Force Limiting
    - Arc Feed Correction for Constant Chip Thickness
    - Direction Change Detection with Smooth Feed Ramping
    - 8-Level Aggressiveness Control (Conservative to Maximum MRR)
    - Tool Stickout Analysis with Deflection Compensation
    
  * HURCO-SPECIFIC OPTIMIZATIONS:
    - G05.3 Smoothing (Auto Rough P35 / Finish P10)
    - M16 Automatic Buffering for Smooth Motion
    - M98 Subprogram Support for Air Through Spindle
    - M140 Z-Axis Retract Support
    - UltiMotion Cutting Mode (G64) — per-operation P tolerance (v11 S10)
    - Chip Conveyor Control (M59/M61)
    - Washdown Coolant Support (M68/M69)
    
  * PRODUCTIVITY FEATURES:
    - Minimum Z Retract Between Work Offsets
    - Spindle Warm-Up Routine
    - Safe Start Block
    - Speed-Up Suggestions in G-code Comments
    - Estimated Cycle Time Display
    
  ============================================================================
  
  $Revision: PRISM v11.0 AI-FIX - Deep Logic Analysis + Tapping Cycle Optimization $
  $Date: 2026-02-02 $
  
  Copyright (C) 2012-2026 by Autodesk, Inc. & PRISM Manufacturing Intelligence
  All rights reserved.
  
  FORKID {1B14E478-26FE-4db2-A3E7-FB814E8C0B4E}
*/

///////////////////////////////////////////////////////////////////////////////
//                  PRISM ENHANCED HURCO VM30i POST PROCESSOR
//
// PRISM ENHANCED ROUGHING TECHNOLOGY - KEY TO FAST ADAPTIVE:
//   During 3D adaptive, axial depth varies - shallow cuts GO FASTER!
//   
//   Properties:
//   - "Use dynamic depth feed adjustment" - Master switch (ON by default)
//   - "Maximum dynamic feed increase (%)" - Cap at 150% default
//   - "Prism base feedrate" - 0 = use Fusion programmed feed
//   
//   Example: Programmed feed 100 IPM with 150% max increase:
//   - Full depth: 100 IPM
//   - Half depth: 141 IPM (+41%)
//   - Quarter depth: 150 IPM (capped)
//
// v10.7 CRITICAL SAFETY FIX - LOC ENGAGEMENT OVERRIDE:
//   Previous versions (v10.5-v10.6) could apply chip thinning feed boosts
//   even when axial depth was dangerously high relative to flute length.
//   FIELD FAILURE: 79% LOC + 2.5x chip thinning = BROKEN ENDMILL
//   
//   NEW SAFETY THRESHOLDS (applied AFTER chip thinning calculation):
//   - >85% LOC engaged: CRITICAL - 55% feed reduction
//   - >75% LOC engaged: DANGEROUS - 45% feed reduction (would have saved broken tool)
//   - >65% LOC engaged: HIGH - 30% feed reduction
//   - >55% LOC engaged: MODERATE - 15% feed reduction
//   - <55% LOC engaged: OK - no safety override
//   
//   This ensures that extreme axial depths ALWAYS get feed reductions,
//   regardless of chip thinning benefits from light radial engagement.
//   A broken tool has ZERO MRR - safety overrides productivity.
//
// G05.3 SMOOTHING - NOW AFTER M6 LINE:
//   Output immediately after tool change with tool number:
//   T1 M6
//   G05.3 P35 (T1 ROUGH SMOOTHING)   <- Clearly for Tool 1
//   T2                                <- Preload next tool
//
// PRISM ADVANCED FEED OPTIMIZATION:
//   - Tool stickout analysis with deflection compensation
//   - Chip thinning compensation (up to 2.5x at 5% stepover)
//   - Axial depth adjustment for optimal chip load
//   - 3D adaptive engagement detection
//   - SPEED-UP SUGGESTIONS in G-code comments
//
// PRISM ENHANCED ROUGHING VARIABLE FEED:
//   - Arc feed correction for constant chip thickness
//   - Direction change detection with smooth transitions
//   - Feed ramping to prevent load spikes
//   - 8-level aggressiveness slider (1=conservative, 8=maximum MRR)
//
// G-FORCE OPTIMIZATION:
//   - Machine acceleration-limited motion
//
// PRISM v10.2 MULTIPLIER CHAIN (HSM/HEM + Finishing Physics):
//   Feed = baseFz * coating * condition * brand * holder * optimization * strategy
//          * leadAngle * highFeedDOC * [hsmHem OR bullnose] * userMultiplier
//
// HSM/HEM PHYSICS ENGINE v10.1:
//   HEM (High Efficiency Milling): Deep DOC, light WOC (10-25%), high feed
//     - Chip thinning at 10% WOC = up to 3.2x feed increase!
//     - Limited by: tool deflection, spindle power, user cap
//   HSM (High Speed Machining): Light DOC, high speed, many short moves
//     - Same chip thinning benefits
//     - Additional: machine acceleration limiting on short moves
//
//   Feed multipliers:
//   - Chip thinning: 1.0x at 50% WOC, 1.4x at 25%, 2.0x at 15%, 3.2x at 10%
//   - Deflection limit: Reduces when tool bend exceeds user limit
//   - Power limit: Reduces when spindle power exceeded
//   - Accel limit (HSM): Reduces for short moves machine can't accel through
//
// FINISHING OPTIMIZATION ENGINE v10.2:
//   Calculates optimal speed/feed for 2D/3D finishing based on:
//   - Target surface finish (Ra 8-125 uin)
//   - Tolerance grade (IT5-IT10)
//   - Stock to leave from Fusion
//   - Tool nose radius
//   - Holder type (runout affects finish)
//   - Machine rigidity
//   - Length of cut / engagement
//   - Vibration risk assessment
//
//   Surface finish formula: Ra = f^2 / (32 * r) for ball/bull nose
//   Calculates required feed for target Ra, applies safety factors
//
//   Per-tool settings (T1-T24):
//   - Strategy: off/hem/hsm/auto
//   - MaxChipThinMult: Cap on chip thinning increase (default 2.5x)
//   - DeflectionLimit: Max tool deflection in inches (default 0.002)
//   - FinishMode: off/finish/accuracy/balanced/productivity/auto
//   - TargetRa: 8/16/32/63/125 microinches
//   - ToleranceGrade: IT5/IT6/IT7/IT8/IT9/IT10
//   - FinishNoseR: Tool nose radius override (0=from Fusion)
//   - FinishMaxRPM: Max spindle speed for finishing (0=no limit)
//   - FinishMinFeed: Min feed to avoid rubbing (0=auto calc)
//
//   1. baseFz: Material group base chip load (0.005-0.03 mm/tooth)
//   2. coating: TiAlN=1.2, TiN=1.0, Uncoated=0.8
//   3. condition: New=1.0, Good=0.9, Worn=0.75
//   4. brand: Premium=1.1, Generic=1.0
//   5. holder: Hydraulic=1.0, Shrink fit=0.98, ER collet=0.85
//   6. optimization: Conservative=0.7, Balanced=1.0, Aggressive=1.3
//   7. strategy: Adaptive=1.3, Pocket=1.0, Finishing=0.8
//   8. leadAngle: 45deg=1.41x, 17deg=3.42x, 10deg=5.76x (HIGH FEED!)
//   9. highFeedDOC: Based on effective radius and DOC
//   10. bullnoseChipThin: Compensation for shallow DOC on ball/bull endmills
//   11. userMultiplier: Manual per-tool Speed% and Feed% override
//
// OPTIMIZATION PRIORITY (highest to lowest):
//   1. Per-operation (via comment: "PRISM:aggressive")
//   2. Per-tool (OptMode property in tool pocket)
//   3. Global (prismOptimizationMode property)
//   - Corner velocity limiting based on radius
//   - Jerk control for smooth surfaces
//
// OTHER: Air through spindle M98, minimum Z retract, safe start
//
///////////////////////////////////////////////////////////////////////////////

description = "PRISM Enhanced - HURCO VM30i";
vendor = "HURCO";
vendorUrl = "http://www.hurco.com";
legal = "Copyright (C) 2012-2022 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45793;

longDescription = "PRISM Enhanced post for HURCO VM30i [AI-OPTIMIZED v2.1 PER-TOOL-AGGR]. Machine specs pre-configured: 12,000 RPM, 20 HP, Big Plus 40, High Rigidity, 0.7G accel, 1400 IPM rapids. Aggressiveness Level 7 (Maximum MRR). Enhanced Feed v2.0 ENABLED with full physics. Dynamic Depth Feed ENABLED. Smart Ra detection: ignores surface finish constraints for adaptive/HEM roughing with WinMax control. Features PRISM Enhanced Roughing Technology(TM): dynamic depth feed adjustment (the KEY to fast 3D adaptive), intelligent chip thinning compensation, corner deceleration with G-force optimization, arc feed correction, direction change detection, 8-level aggressiveness control. Includes Hurco-specific: G05.3 smoothing (auto rough/finish values), M16 automatic buffering, M98 subprograms for air through spindle, minimum Z retract between WCS. Supports both ISNC and BNC modes.";

extension = "hnc";
programNameIsInteger = true;
setCodePage("ascii");

capabilities = CAPABILITY_MILLING | CAPABILITY_MACHINE_SIMULATION;
tolerance = spatial(0.002, MM);

minimumChordLength = spatial(0.01, MM);
minimumCircularRadius = spatial(0.001, MM);
maximumCircularRadius = spatial(5000, MM);
minimumCircularSweep = toRad(0.001);
maximumCircularSweep = toRad(1800);
allowHelicalMoves = true;
allowedCircularPlanes = undefined; // allow any circular motion
highFeedrate = (unit == IN) ? 1000 : 5000;

// user-defined properties

// Shared enum arrays (saves ~7000 lines by not repeating per pocket)
var TOOL_MATERIAL_VALUES = [
      {title: "=== CARBIDE ===", id: "_carb"},
      {title: "Carbide (Standard K20-K40)", id: "carbide"},
      {title: "Carbide (Submicron)", id: "carbide_sub"},
      {title: "Carbide (Micrograin)", id: "carbide_micro"},
      {title: "Carbide (Ultra-Fine <0.5μm)", id: "carbide_uf"},
      {title: "=== ADVANCED ===", id: "_adv"},
      {title: "Cermet (TiCN based)", id: "cermet"},
      {title: "Ceramic (Al2O3)", id: "ceramic"},
      {title: "Ceramic (Si3N4 — Sialon)", id: "ceramic_sialon"},
      {title: "Ceramic (SiAlON whisker)", id: "ceramic_whisker"},
      {title: "CBN (Low PCBN)", id: "cbn"},
      {title: "CBN (High PCBN)", id: "cbn_high"},
      {title: "PCD (Polycrystalline Diamond)", id: "pcd"},
      {title: "CVD Diamond", id: "cvd_diamond"},
      {title: "=== HSS ===", id: "_hss"},
      {title: "HSS (M2)", id: "hss"},
      {title: "HSS-Co (M35/M42)", id: "hss_cobalt"},
      {title: "HSS-PM (Powder Metal)", id: "hss_pm"},
      {title: "HSS-E (CPM Rex 45/76)", id: "hss_pm_premium"}
    ];
var COATING_VALUES = [
      {title: "Uncoated", id: "uncoated"},
      {title: "=== PVD ===", id: "_pvd"},
      {title: "TiN (Gold — General)", id: "tin"},
      {title: "TiCN (Blue — Steel/Stainless)", id: "ticn"},
      {title: "TiAlN (Purple — High Temp)", id: "tialn"},
      {title: "AlTiN (Black — Dry/High Speed)", id: "altin"},
      {title: "AlCrN (Hard Machining)", id: "alcrn"},
      {title: "CrN (Copper/Brass/Non-Ferrous)", id: "crn"},
      {title: "ZrN (Gold — Non-Ferrous/Medical)", id: "zrn"},
      {title: "TiAlSiN (nACo — Extreme)", id: "naco"},
      {title: "TiSiN (Super Hard >3500HV)", id: "tisin"},
      {title: "=== CVD ===", id: "_cvd"},
      {title: "CVD TiCN+Al2O3+TiN (Multilayer)", id: "cvd_multi"},
      {title: "CVD Al2O3 (Cast Iron)", id: "cvd_al2o3"},
      {title: "CVD Diamond (Graphite/CFRP)", id: "cvd_diamond"},
      {title: "=== SPECIALTY ===", id: "_coat_spec"},
      {title: "DLC (Non-Ferrous/Medical)", id: "dlc"},
      {title: "Diamond (PCD/CVD)", id: "diamond"}
    ];
var BRAND_VALUES = [
      {title: "Generic / Unknown", id: "generic"},
      {title: "--- TIER 1: PREMIUM ---", id: "_premium"},
      {title: "Sandvik Coromant", id: "sandvik"},
      {title: "Walter Tools (Titex/Prototyp)", id: "walter"},
      {title: "Kennametal (HARVI/Beyond)", id: "kennametal"},
      {title: "Seco (Jabro/Minimaster)", id: "seco"},
      {title: "Mapal (Boring/Reaming)", id: "mapal"},
      {title: "Mitsubishi Materials", id: "mitsubishi"},
      {title: "Sumitomo Electric", id: "sumitomo"},
      {title: "Guhring (Drills)", id: "guhring"},
      {title: "Ceratizit (WNT)", id: "ceratizit"},
      {title: "--- TIER 2: HIGH PERFORMANCE ---", id: "_highperf"},
      {title: "Kyocera SGS", id: "kyocera"},
      {title: "OSG (A-Brand)", id: "osg"},
      {title: "Iscar (HeliMill)", id: "iscar"},
      {title: "Tungaloy", id: "tungaloy"},
      {title: "IMCO (Pow-R-Feed)", id: "imco"},
      {title: "Helical Solutions (Harvey)", id: "helical"},
      {title: "Fraisa (Swiss)", id: "fraisa"},
      {title: "Harvey Tool (Miniature)", id: "harvey"},
      {title: "YG-1 (V7/X5/Dream)", id: "yg1"},
      {title: "Ingersoll", id: "ingersoll"},
      {title: "Destiny Tool (Viper)", id: "destiny"},
      {title: "Hanita (VariMill)", id: "hanita"},
      {title: "--- TIER 3: GENERAL PURPOSE ---", id: "_general"},
      {title: "Widia (Kennametal Value)", id: "widia"},
      {title: "Korloy (Korea)", id: "korloy"},
      {title: "Niagara Cutter", id: "niagara"},
      {title: "Garr Tool", id: "garr"},
      {title: "Nachi (Japan)", id: "nachi"},
      {title: "Data Flute", id: "dataflute"},
      {title: "Dormer Pramet", id: "dormer"},
      {title: "MA Ford", id: "maford"},
      {title: "Zeni (Italy)", id: "zeni"},
      {title: "Accupro (MSC)", id: "accupro"},
      {title: "Melin Tool", id: "melin"},
      {title: "Union Butterfield", id: "union"},
      {title: "Cleveland", id: "cleveland"},
      {title: "--- TIER 4: VALUE/BUDGET ---", id: "_value"},
      {title: "Lakeshore Carbide", id: "lakeshore"},
      {title: "Maritool", id: "maritool"},
      {title: "Kodiak", id: "kodiak"},
      {title: "Accusize (Import)", id: "accusize"},
      {title: "Shars (Import)", id: "shars"},
      {title: "--- TURNING/LATHE SPECIALISTS ---", id: "_turning_brands"},
      {title: "NTK Cutting Tools (Ceramic/CBN)", id: "ntk"},
      {title: "TaeguTec (IMC Group)", id: "taegutec"},
      {title: "MOLDINO (ex-Mitsubishi Hitachi)", id: "moldino"},
      {title: "Vardex/Vargus (Threading)", id: "vardex"},
      {title: "Vargus (GROOVEX Grooving)", id: "vargus"},
      {title: "Arno (Grooving/Parting)", id: "arno"},
      {title: "Simtek (Grooving/Threading)", id: "simtek"},
      {title: "Palbit (Portugal Turning)", id: "palbit"},
      {title: "Pramet (Turning Inserts)", id: "pramet"},
      {title: "Lamina Technologies (Swiss)", id: "lamina"},
      {title: "--- HOLEMAKING SPECIALISTS ---", id: "_holemaking"},
      {title: "Allied Machine (GEN3SYS/T-A)", id: "allied"},
      {title: "SGS Precision Tools (Kyocera)", id: "sgs"},
      {title: "--- GROOVING/PARTING/THREADING ---", id: "_groove_thread"},
      {title: "Emuge-Franken (Taps)", id: "emuge"},
      {title: "Horn (Grooving/Parting)", id: "horn"},
      {title: "Carmex (Threading)", id: "carmex"},
      {title: "Balax (Thread Forming)", id: "balax"},
      {title: "Micro 100 (Boring/Grooving)", id: "micro100"},
      {title: "Scientific Cutting Tools", id: "sct"},
      {title: "North American Tool", id: "nat"},
      {title: "--- BUDGET/IMPORT ---", id: "_budget_brands"},
      {title: "Rapidkut (Import)", id: "rapidkut"},
      {title: "Flash Tool", id: "flash"}
    ];
var HOLDER_TYPE_VALUES = [
      {title: "=== ER COLLET SYSTEMS ===", id: "_er"},
      {title: "ER Collet (Standard)", id: "er_collet"},
      {title: "ER High Precision (<0.0002)", id: "er_hp"},
      {title: "ER Coolant-Thru Sealed", id: "er_coolant"},
      {title: "ER Mini-Nut (Low Profile)", id: "er_mini"},
      {title: "=== LYNDEX SYSTEMS ===", id: "_lyndex"},
      {title: "Lyndex ER Collet", id: "lyndex_er"},
      {title: "Lyndex TG Collet (100/150)", id: "lyndex_tg"},
      {title: "Lyndex DA Collet (180/200)", id: "lyndex_da"},
      {title: "Lyndex 5C Collet", id: "lyndex_5c"},
      {title: "Lyndex R8 Collet", id: "lyndex_r8"},
      {title: "Lyndex AF Collet", id: "lyndex_af"},
      {title: "Lyndex VC Collet (V-Flange)", id: "lyndex_vc"},
      {title: "Lyndex VC-S (Small V-Flange)", id: "lyndex_vc_s"},
      {title: "=== REGO-FIX SYSTEMS ===", id: "_regofix"},
      {title: "Rego-Fix ER Collet", id: "rego_er"},
      {title: "Rego-Fix powRgrip", id: "rego_powrgrip"},
      {title: "Rego-Fix secuRgrip", id: "rego_securgrip"},
      {title: "Rego-Fix Hi-Q ER", id: "rego_hiq"},
      {title: "Rego-Fix MR Collet", id: "rego_mr"},
      {title: "=== PRECISION SYSTEMS ===", id: "_precision"},
      {title: "Shrink Fit", id: "shrink"},
      {title: "Shrink Fit w/ Safe-Lock", id: "shrink_safelock"},
      {title: "Hydraulic Chuck", id: "hydraulic"},
      {title: "CoroChuck 930", id: "corochuck"},
      {title: "Schunk TRIBOS", id: "tribos"},
      {title: "Schunk TENDO", id: "tendo"},
      {title: "BIG Kaiser Mega Micro", id: "mega_micro"},
      {title: "BIG Daishowa Mega E", id: "mega_e"},
      {title: "Haimer Power Shrink", id: "haimer_shrink"},
      {title: "Haimer Safe-Lock", id: "safe_lock"},
      {title: "=== STANDARD CHUCKS ===", id: "_chucks"},
      {title: "Milling Chuck (Weldon)", id: "milling_chuck"},
      {title: "Side Lock (Weldon Flat)", id: "side_lock"},
      {title: "End Mill Holder (Set Screw)", id: "endmill_holder"},
      {title: "Shell Mill Arbor", id: "shell_arbor"},
      {title: "Face Mill Arbor", id: "facemill_arbor"},
      {title: "Drill Chuck (Keyed)", id: "drill_chuck"},
      {title: "Drill Chuck (Keyless)", id: "keyless_chuck"},
      {title: "=== TAPPING SYSTEMS ===", id: "_tapping"},
      {title: "Tension/Compression Tap", id: "tap_holder"},
      {title: "Rigid Tap Holder", id: "rigid_tap"},
      {title: "Floating Tap Holder", id: "float_tap"},
      {title: "Synchro Tap (ER)", id: "synchro_tap"},
      {title: "=== NIKKEN / TECHNIKS ===", id: "_nikken"},
      {title: "Nikken Slim Chuck", id: "nikken_slim"},
      {title: "Nikken Multi-Lock", id: "nikken_multilock"},
      {title: "Techniks SynoFlex", id: "techniks_synoflex"},
      {title: "Techniks ER Precision", id: "techniks_er"},
      {title: "Parlec ER Collet", id: "parlec_er"},
      {title: "=== MARITOOL ===", id: "_maritool"},
      {title: "Maritool ER Collet Chuck", id: "maritool_er"},
      {title: "Maritool Cat40 End Mill", id: "maritool_em"},
      {title: "=== BIG KAISER ===", id: "_bigkaiser"},
      {title: "BIG Kaiser Hi-Power Milling", id: "bigkaiser_hipower"},
      {title: "BIG Kaiser Mega New Baby", id: "bigkaiser_newbaby"},
      {title: "BIG Kaiser CK Boring System", id: "bigkaiser_ck"},
      {title: "=== KENNAMETAL ===", id: "_kmt_hold"},
      {title: "Kennametal HydroForce", id: "kmt_hydroforce"},
      {title: "Kennametal KM Micro", id: "kmt_km_micro"},
      {title: "Kennametal ER (TG)", id: "kmt_er"},
      {title: "=== SANDVIK ===", id: "_sandvik_hold"},
      {title: "Sandvik Coromant Capto C4", id: "capto_c4"},
      {title: "Sandvik Coromant Capto C5", id: "capto_c5"},
      {title: "Sandvik Coromant Capto C6", id: "capto_c6"},
      {title: "Sandvik CoroChuck 930", id: "corochuck"},
      {title: "Sandvik CoroChuck 970", id: "corochuck_970"},
      {title: "=== SECO ===", id: "_seco_hold"},
      {title: "Seco Graflex", id: "seco_graflex"},
      {title: "Seco EPB Hydraulic", id: "seco_epb"},
      {title: "=== ISCAR ===", id: "_iscar_hold"},
      {title: "Iscar Multi-Master", id: "iscar_multimaster"},
      {title: "Iscar SumoCham", id: "iscar_sumocham"},
      {title: "=== COLLET SYSTEMS (Other) ===", id: "_collet_other"},
      {title: "TG100 Collet Chuck", id: "tg100"},
      {title: "TG150 Collet Chuck", id: "tg150"},
      {title: "DA180 Collet Chuck", id: "da180"},
      {title: "5C Collet Chuck", id: "collet_5c"},
      {title: "16C Collet Chuck", id: "collet_16c"},
      {title: "=== SPECIALTY ===", id: "_specialty_hold"},
      {title: "Boring Head (Standard)", id: "boring_head"},
      {title: "Boring Head (Digital)", id: "boring_head_digital"},
      {title: "Fly Cutter Arbor", id: "fly_cutter_arbor"},
      {title: "Morse Taper Adapter (MT2-4)", id: "morse_adapter"},
      {title: "Stub Arbor (Shell Mill)", id: "stub_arbor"},
      {title: "Straight Shank (Press Fit)", id: "straight_shank"},
      {title: "Indexable Insert Drill Holder", id: "insert_drill_holder"},
      {title: "Modular Adapter (Capto/KM)", id: "modular_adapter"},
      {title: "=== DIRECT / INTEGRAL ===", id: "_direct"},
      {title: "CAT40 Direct (Integral)", id: "cat40_direct"},
      {title: "CAT50 Direct (Integral)", id: "cat50_direct"},
      {title: "HSK-A63 Direct (Integral)", id: "hsk_direct"},
      {title: "HSK-A100 Direct (Integral)", id: "hsk100_direct"},
      {title: "BT40 Direct (Integral)", id: "bt_direct"},
      {title: "BT50 Direct (Integral)", id: "bt50_direct"},
      {title: "Capto Direct (C5/C6)", id: "capto_direct"}
    ];
var INSERT_GRADE_VALUES = [
      {title: "=== Generic ISO Grades ===", id: "_iso"},
      {title: "P10 (Steel Finish)", id: "P10"},
      {title: "P20 (Steel General)", id: "P20"},
      {title: "P30 (Steel Roughing)", id: "P30"},
      {title: "P40 (Steel Heavy)", id: "P40"},
      {title: "M10 (Stainless Finish)", id: "M10"},
      {title: "M20 (Stainless General)", id: "M20"},
      {title: "M30 (Stainless Rough)", id: "M30"},
      {title: "K10 (Cast Iron Finish)", id: "K10"},
      {title: "K20 (Cast Iron General)", id: "K20"},
      {title: "K30 (Cast Iron Rough)", id: "K30"},
      {title: "N10 (Non-Ferrous)", id: "N10"},
      {title: "S10 (Superalloy Finish)", id: "S10"},
      {title: "S20 (Superalloy General)", id: "S20"},
      {title: "H10 (Hardened Finish)", id: "H10"},
      {title: "H20 (Hardened General)", id: "H20"},
      {title: "=== Sandvik ===", id: "_sandvik"},
      {title: "GC4325 (Steel Versatile)", id: "GC4325"},
      {title: "GC4330 (Steel Tough)", id: "GC4330"},
      {title: "GC4340 (Steel Secure)", id: "GC4340"},
      {title: "GC1125 (Stainless First)", id: "GC1125"},
      {title: "GC1525 (Stainless)", id: "GC1525"},
      {title: "GC3330 (Stainless/SS Tough)", id: "GC3330"},
      {title: "GC3220 (Cast Iron)", id: "GC3220"},
      {title: "=== Kennametal ===", id: "_kennametal"},
      {title: "KC5010 (Steel Light)", id: "KC5010"},
      {title: "KC5025 (Steel General)", id: "KC5025"},
      {title: "KCPK30 (Steel Universal)", id: "KCPK30"},
      {title: "KC725M (Stainless)", id: "KC725M"},
      {title: "KCU25 (Universal)", id: "KCU25"},
      {title: "=== Iscar ===", id: "_iscar"},
      {title: "IC808 (Steel/SS CVD)", id: "IC808"},
      {title: "IC830 (Steel General)", id: "IC830"},
      {title: "IC5820 (Exotic Alloys)", id: "IC5820"},
      {title: "IC328 (Universal)", id: "IC328"},
      {title: "IC928 (Steel/SS PVD)", id: "IC928"},
      {title: "IC4100 (Aluminum)", id: "IC4100"},
      {title: "=== Seco ===", id: "_seco"},
      {title: "TP2500 (Steel General)", id: "TP2500"},
      {title: "TP1501 (Steel CVD)", id: "TP1501"},
      {title: "TK1001 (Cast Iron)", id: "TK1001"},
      {title: "MP2500 (Stainless)", id: "MP2500"},
      {title: "=== Walter ===", id: "_walter"},
      {title: "WPP20S (Steel P)", id: "WPP20S"},
      {title: "WPP30S (Steel Tough)", id: "WPP30S"},
      {title: "WSM35S (Stainless)", id: "WSM35S"},
      {title: "WKK20S (Cast Iron)", id: "WKK20S"},
      {title: "=== Mitsubishi ===", id: "_mitsubishi"},
      {title: "VP15TF (Universal PVD)", id: "VP15TF"},
      {title: "MC5020 (Steel CVD)", id: "MC5020"},
      {title: "US735 (Universal)", id: "US735"},
      {title: "MP9015 (Stainless)", id: "MP9015"},
      {title: "=== Special Materials ===", id: "_special"},
      {title: "Cermet (High Speed Finish)", id: "CERMET"},
      {title: "CBN (Hardened >45 HRC)", id: "CBN"},
      {title: "Ceramic (Cast Iron HS)", id: "CERAMIC"},
      {title: "PCD (Non-Ferrous/Composites)", id: "PCD"}
    ];

properties = {


  // *************************************************************************
  // QUICK SETUP - Start here! Pick your machine, then your material.
  // *************************************************************************

  // =========================================================================
  // 1. MACHINE CONFIGURATION - Select your machine FIRST
  // =========================================================================

  prismMachineModel: {
    title      : "Machine Model (Auto-Fill)",
    description: "Select your machine. All specs auto-fill — RPM, power, torque, taper, rigidity. Set to Custom to enter manually.",
    group      : "prismMachine",
    type       : "enum",
    values     : [
      {title: "--- AWEA ---", id: "_awea"}, {title: "AWEA LP-3021", id: "awea_lp_3021"}, {title: "AWEA AF-1250", id: "awea_af_1250"}, {title: "AWEA BM-1200", id: "awea_bm_1200"},
      {title: "--- Brother ---", id: "_brother"}, {title: "Brother SPEEDIO S300X1", id: "brother_speedio_s300x1"}, {title: "Brother SPEEDIO S500X1", id: "brother_speedio_s500x1"}, {title: "Brother SPEEDIO S700X1", id: "brother_speedio_s700x1"}, {title: "Brother SPEEDIO R450X1", id: "brother_speedio_r450x1"}, {title: "Brother SPEEDIO R650X1", id: "brother_speedio_r650x1"},
      {title: "--- Chiron ---", id: "_chiron"}, {title: "Chiron FZ 08 S", id: "chiron_fz_08_s"}, {title: "Chiron FZ 12 S", id: "chiron_fz_12_s"}, {title: "Chiron MILL 800", id: "chiron_mill_800"}, {title: "Chiron MILL 2000", id: "chiron_mill_2000"},
      {title: "--- Citizen ---", id: "_citizen"}, {title: "Citizen Cincom L12-X", id: "citizen_cincom_l12_x"}, {title: "Citizen Cincom L20-E", id: "citizen_cincom_l20_e"}, {title: "Citizen Cincom L32-XII", id: "citizen_cincom_l32_xii"}, {title: "Citizen Miyano BNE-51MSY", id: "citizen_miyano_bne_51msy"},
      {title: "--- DATRON ---", id: "_datron"}, {title: "DATRON neo", id: "datron_neo"}, {title: "DATRON M8Cube", id: "datron_m8cube"},
      {title: "--- DMG MORI ---", id: "_dmg"}, {title: "DMG MORI DMU 50 3rd Gen", id: "dmg_mori_dmu_50"}, {title: "DMG MORI DMU 65 monoBLOCK", id: "dmg_mori_dmu_65_monoblock"}, {title: "DMG MORI DMC 80 H linear", id: "dmg_mori_dmc_80h"}, {title: "DMG MORI NLX 2500/700", id: "dmg_mori_nlx_2500"}, {title: "DMG MORI CTX beta 800 TC", id: "dmg_mori_ctx_beta_800"},
      {title: "--- DN Solutions / Doosan ---", id: "_doosan"}, {title: "DN Solutions DNM 4500", id: "dn_solutions_dnm_4500"}, {title: "DN Solutions DNM 5700", id: "dn_solutions_dnm_5700"}, {title: "DN Solutions DNM 6700", id: "dn_solutions_dnm_6700"}, {title: "DN Solutions DVF 5000", id: "dn_solutions_dvf_5000"}, {title: "DN Solutions DVF 6500", id: "dn_solutions_dvf_6500"}, {title: "DN Solutions NHP 5000", id: "dn_solutions_nhp_5000"}, {title: "DN Solutions PUMA 2100SY II", id: "dn_solutions_puma_2100sy"}, {title: "DN Solutions PUMA 2600SY", id: "dn_solutions_puma_2600sy"}, {title: "DN Solutions PUMA 3100", id: "dn_solutions_puma_3100"}, {title: "DN Solutions LYNX 2600", id: "dn_solutions_lynx_2600"}, {title: "DN Solutions SMX 2600S", id: "dn_solutions_smx_2600s"},
      {title: "--- Fadal ---", id: "_fadal"}, {title: "Fadal VMC 3016L", id: "fadal_vmc_3016l"}, {title: "Fadal VMC 4020", id: "fadal_vmc_4020"}, {title: "Fadal VMC 6030", id: "fadal_vmc_6030"}, {title: "Fadal VMC 8030", id: "fadal_vmc_8030"},
      {title: "--- FANUC ---", id: "_fanuc"}, {title: "FANUC Robodrill D14MiA5", id: "fanuc_d14mia5"}, {title: "FANUC Robodrill D21MiA5", id: "fanuc_d21mia5"}, {title: "FANUC Robodrill D21LiA5", id: "fanuc_d21lia5"},
      {title: "--- Feeler ---", id: "_feeler"}, {title: "Feeler VMP-580", id: "feeler_vmp_580"}, {title: "Feeler VMP-1100", id: "feeler_vmp_1100"}, {title: "Feeler HV-800", id: "feeler_hv_800"}, {title: "Feeler U-600", id: "feeler_u_600"},
      {title: "--- GROB ---", id: "_grob"}, {title: "GROB G150", id: "grob_g150"}, {title: "GROB G350", id: "grob_g350"}, {title: "GROB G550", id: "grob_g550"},
      {title: "--- Haas ---", id: "_haas"}, {title: "Haas Mini Mill", id: "haas_mini_mill"}, {title: "Haas VF-1", id: "haas_vf_1"}, {title: "Haas VF-2", id: "haas_vf_2"}, {title: "Haas VF-2SS", id: "haas_vf_2ss"}, {title: "Haas VF-3", id: "haas_vf_3"}, {title: "Haas VF-4", id: "haas_vf_4"}, {title: "Haas VF-5", id: "haas_vf_5"}, {title: "Haas VF-6/50", id: "haas_vf_6_50"}, {title: "Haas UMC-500", id: "haas_umc_500"}, {title: "Haas UMC-750", id: "haas_umc_750"}, {title: "Haas UMC-1000", id: "haas_umc_1000"}, {title: "Haas UMC-1500SS-DUO", id: "haas_umc_1500ss_duo"}, {title: "Haas EC-400", id: "haas_ec_400"}, {title: "Haas EC-500", id: "haas_ec_500"}, {title: "Haas ST-20", id: "haas_st_20"}, {title: "Haas ST-20Y", id: "haas_st_20y"}, {title: "Haas ST-35", id: "haas_st_35"}, {title: "Haas DT-1", id: "haas_dt_1"}, {title: "Haas DM-1", id: "haas_dm_1"}, {title: "Haas DM-2", id: "haas_dm_2"}, {title: "Haas GR-510", id: "haas_gr_510"}, {title: "Haas TM-1", id: "haas_tm_1"},
      {title: "--- Hardinge ---", id: "_hardinge"}, {title: "Hardinge Conquest T42", id: "hardinge_conquest_t42"}, {title: "Hardinge Conquest T51", id: "hardinge_conquest_t51"}, {title: "Hardinge Conquest T65", id: "hardinge_conquest_t65"},
      {title: "--- Heller ---", id: "_heller"}, {title: "Heller H 2000", id: "heller_h_2000"}, {title: "Heller H 4000", id: "heller_h_4000"}, {title: "Heller H 6000", id: "heller_h_6000"}, {title: "Heller HF 3500", id: "heller_hf_3500"},
      {title: "--- Hermle ---", id: "_hermle"}, {title: "Hermle C 32 U", id: "hermle_c_32_u"}, {title: "Hermle C 42 U", id: "hermle_c_42_u"}, {title: "Hermle C 52 U", id: "hermle_c_52_u"},
      {title: "--- Hurco ---", id: "_hurco"}, {title: "Hurco VM10i", id: "hurco_vm10i"}, {title: "Hurco VM20i", id: "hurco_vm20i"}, {title: "Hurco VM30i", id: "hurco_vm30i"}, {title: "Hurco VMX42i", id: "hurco_vmx42i"}, {title: "Hurco VMX50i", id: "hurco_vmx50i"},
      {title: "--- Hyundai WIA ---", id: "_hyundai"}, {title: "Hyundai WIA KF 4600", id: "hyundai_wia_kf_4600"}, {title: "Hyundai WIA KF 5600", id: "hyundai_wia_kf_5600"}, {title: "Hyundai WIA XF 6300", id: "hyundai_wia_xf_6300"}, {title: "Hyundai WIA HS 5000", id: "hyundai_wia_hs_5000"},
      {title: "--- Kern ---", id: "_kern"}, {title: "Kern Micro Evo", id: "kern_micro_evo"}, {title: "Kern Micro HD", id: "kern_micro_hd"},
      {title: "--- Kitamura ---", id: "_kitamura"}, {title: "Kitamura Mycenter HX400iG", id: "kitamura_mycenter_hx400ig"}, {title: "Kitamura Mycenter HX500iG", id: "kitamura_mycenter_hx500ig"}, {title: "Kitamura Mytrunnion-5G", id: "kitamura_mytrunnion_5g"},
      {title: "--- Makino ---", id: "_makino"}, {title: "Makino D500", id: "makino_d500"}, {title: "Makino D800Z", id: "makino_d800z"}, {title: "Makino a61nx", id: "makino_a61nx"}, {title: "Makino a81nx", id: "makino_a81nx"}, {title: "Makino PS95", id: "makino_ps95"}, {title: "Makino F5", id: "makino_f5"}, {title: "Makino iQ500", id: "makino_iq500"}, {title: "Makino T1", id: "makino_t1"},
      {title: "--- Matsuura ---", id: "_matsuura"}, {title: "Matsuura MAM72-25V", id: "matsuura_mam72_25v"}, {title: "Matsuura MAM72-35V", id: "matsuura_mam72_35v"}, {title: "Matsuura MX-330", id: "matsuura_mx_330"},
      {title: "--- Mazak ---", id: "_mazak"}, {title: "Mazak INTEGREX i-200S", id: "mazak_integrex_i_200s"}, {title: "Mazak INTEGREX i-400S", id: "mazak_integrex_i_400s"}, {title: "Mazak VARIAXIS i-500", id: "mazak_variaxis_i_500"}, {title: "Mazak VARIAXIS i-700", id: "mazak_variaxis_i_700"}, {title: "Mazak VCN-530C", id: "mazak_vcn_530c"}, {title: "Mazak HCN-5000", id: "mazak_hcn_5000"}, {title: "Mazak QT-NEXUS 250-II MY", id: "mazak_qt_nexus_250"}, {title: "Mazak CV5-500", id: "mazak_cv5_500"}, {title: "Mazak VCE-500", id: "mazak_vce_500"}, {title: "Mazak FJV-250", id: "mazak_fjv_250"},
      {title: "--- Mikron ---", id: "_mikron"}, {title: "Mikron MILL S 400 U", id: "mikron_mill_s_400_u"}, {title: "Mikron MILL S 500 U", id: "mikron_mill_s_500_u"}, {title: "Mikron MILL P 500 U", id: "mikron_mill_p_500_u"},
      {title: "--- Mitsui Seiki ---", id: "_mitsui"}, {title: "Mitsui Seiki HU50A", id: "mitsui_seiki_hu50a"},
      {title: "--- OKK ---", id: "_okk"}, {title: "OKK VM53R", id: "okk_vm53r"}, {title: "OKK HM500S", id: "okk_hm500s"},
      {title: "--- Okuma ---", id: "_okuma"}, {title: "Okuma MU-5000V", id: "okuma_mu_5000v"}, {title: "Okuma MU-6300V", id: "okuma_mu_6300v"}, {title: "Okuma GENOS M560-V", id: "okuma_genos_m560_v"}, {title: "Okuma MB-5000H", id: "okuma_mb_5000h"}, {title: "Okuma MULTUS B300II", id: "okuma_multus_b300ii"}, {title: "Okuma LB3000 EX II MY", id: "okuma_lb3000_ex"}, {title: "Okuma LB4000 EX II", id: "okuma_lb4000_ex"}, {title: "Okuma GENOS L300-MY", id: "okuma_genos_l300_my"},
      {title: "--- Spinner ---", id: "_spinner"}, {title: "Spinner VC 560", id: "spinner_vc_560"}, {title: "Spinner VC 850", id: "spinner_vc_850"}, {title: "Spinner U 620", id: "spinner_u_620"},
      {title: "--- Star ---", id: "_star"}, {title: "Star SR-10JN", id: "star_sr_10jn"}, {title: "Star SB-20R Type G", id: "star_sb_20r"}, {title: "Star SR-38B", id: "star_sr_38b"},
      {title: "--- Toyoda ---", id: "_toyoda"}, {title: "Toyoda FH400J", id: "toyoda_fh400j"}, {title: "Toyoda FH550J", id: "toyoda_fh550j"}, {title: "Toyoda FV1265", id: "toyoda_fv1265"},
      {title: "--- YCM ---", id: "_ycm"}, {title: "YCM FX380A", id: "ycm_fx380a"}, {title: "YCM NXV1020A", id: "ycm_nxv1020a"},
      {title: "--- Yasda ---", id: "_yasda"}, {title: "Yasda YBM 640V3", id: "yasda_ybm_640v3"}, {title: "Yasda YMC 430", id: "yasda_ymc_430"},
      {title: "--- CUSTOM ---", id: "_custom_sep"}, {title: "Custom (Enter specs below)", id: "custom"}
    ],
    value      : "hurco_vm30i",
    scope      : "post"
  },

  prismSpindleInterface: {
    title      : "Spindle Interface Type (Custom only)",
    description: "Spindle taper interface. Auto-filled when machine model is selected. Only used when Machine Model = Custom.",
    group      : "prismMachine",
    type       : "enum",
    values     : [
      {title: "=== DUAL CONTACT (BEST) ===", id: "_dual"},
      {title: "Big Plus (CAT40 Dual Contact)", id: "big_plus_40"},
      {title: "Big Plus (CAT50 Dual Contact)", id: "big_plus_50"},
      {title: "HSK-A63", id: "hsk_a63"},
      {title: "HSK-A100", id: "hsk_a100"},
      {title: "HSK-E40", id: "hsk_e40"},
      {title: "HSK-E50", id: "hsk_e50"},
      {title: "HSK-F63", id: "hsk_f63"},
      {title: "Capto C5", id: "capto_c5"},
      {title: "Capto C6", id: "capto_c6"},
      {title: "Capto C8", id: "capto_c8"},
      {title: "KM40", id: "km40"},
      {title: "KM50", id: "km50"},
      {title: "=== STANDARD TAPER ===", id: "_standard"},
      {title: "CAT40 (Standard V-Flange)", id: "cat40"},
      {title: "CAT50 (Standard V-Flange)", id: "cat50"},
      {title: "BT30", id: "bt30"},
      {title: "BT40", id: "bt40"},
      {title: "BT50", id: "bt50"},
      {title: "SK40 (DIN69871)", id: "sk40"},
      {title: "SK50 (DIN69871)", id: "sk50"},
      {title: "=== OTHER ===", id: "_other_spin"},
      {title: "R8 (Bridgeport)", id: "r8"},
      {title: "NMTB30", id: "nmtb30"},
      {title: "NMTB40", id: "nmtb40"},
      {title: "ISO30", id: "iso30"},
      {title: "ISO40", id: "iso40"}
    ],
    value      : "big_plus_40",
    scope      : "post"
  },
  
  prismSpindleMaxRPM: {
    title      : "Spindle Max RPM",
    description: "Maximum spindle speed. PRISM will not recommend speeds above this.",
    group      : "prismMachine",
    type       : "enum",
    values     : [
      {title: "8,000 RPM", id: "8000"},
      {title: "10,000 RPM", id: "10000"},
      {title: "12,000 RPM", id: "12000"},
      {title: "15,000 RPM", id: "15000"},
      {title: "18,000 RPM", id: "18000"},
      {title: "20,000 RPM", id: "20000"},
      {title: "24,000 RPM", id: "24000"},
      {title: "30,000 RPM", id: "30000"},
      {title: "40,000 RPM", id: "40000"},
      {title: "60,000 RPM (High Speed)", id: "60000"}
    ],
    value      : "10000",
    scope      : "post"
  },
  
  prismSpindlePower: {
    title      : "Spindle Power (HP)",
    description: "Continuous spindle power. Used to calculate max MRR and prevent stalling.",
    group      : "prismMachine",
    type       : "enum",
    values     : [
      {title: "5 HP", id: "5"},
      {title: "7.5 HP", id: "7.5"},
      {title: "10 HP", id: "10"},
      {title: "15 HP", id: "15"},
      {title: "20 HP", id: "20"},
      {title: "25 HP", id: "25"},
      {title: "30 HP", id: "30"},
      {title: "40 HP", id: "40"},
      {title: "50 HP", id: "50"},
      {title: "60 HP", id: "60"},
      {title: "75 HP", id: "75"},
      {title: "100 HP", id: "100"}
    ],
    value      : "20",
    scope      : "post"
  },
  
  prismSpindleTorque: {
    title      : "Max Torque (ft-lb)",
    description: "Peak spindle torque. Critical for large diameter tools at low RPM.",
    group      : "prismMachine",
    type       : "enum",
    values     : [
      {title: "25 ft-lb", id: "25"},
      {title: "50 ft-lb", id: "50"},
      {title: "75 ft-lb", id: "75"},
      {title: "100 ft-lb", id: "100"},
      {title: "150 ft-lb", id: "150"},
      {title: "200 ft-lb", id: "200"},
      {title: "250 ft-lb", id: "250"},
      {title: "300 ft-lb", id: "300"},
      {title: "400 ft-lb", id: "400"},
      {title: "500 ft-lb", id: "500"}
    ],
    value      : "100",
    scope      : "post"
  },
  
  prismSpindleGear: {
    title      : "Spindle Gear Range",
    description: "Geared spindle configuration. Affects torque availability at different speeds.",
    group      : "prismMachine",
    type       : "enum",
    values     : [
      {title: "Direct Drive (No Gears)", id: "direct"},
      {title: "2-Speed Gearbox", id: "2_speed"},
      {title: "3-Speed Gearbox", id: "3_speed"},
      {title: "Continuously Variable", id: "cvt"},
      {title: "Integral Motor Spindle", id: "integral"}
    ],
    value      : "direct",
    scope      : "post"
  },
  
  prismMachineRigidity: {
    title      : "Machine Rigidity Class",
    description: "Overall machine stiffness. Affects max DOC/WOC recommendations.",
    group      : "prismMachine",
    type       : "enum",
    values     : [
      {title: "Light Duty (Benchtop, Router)", id: "light"},
      {title: "Medium Duty (40-Taper VMC)", id: "medium"},
      {title: "Heavy Duty (50-Taper VMC, HMC)", id: "heavy"},
      {title: "Very Heavy (Large HMC, Boring Mill)", id: "very_heavy"},
      {title: "Ultra Rigid (Gantry, Portal)", id: "ultra"}
    ],
    value      : "medium",
    scope      : "post"
  },
  
  prismMachineAge: {
    title      : "Machine Age/Condition",
    description: "Older machines may have worn ways, bearings, or ballscrews affecting rigidity.",
    group      : "prismMachine",
    type       : "enum",
    values     : [
      {title: "New (< 2 years)", id: "new"},
      {title: "Good (2-7 years)", id: "good"},
      {title: "Average (7-15 years)", id: "average"},
      {title: "Worn (15+ years)", id: "worn"},
      {title: "Recently Rebuilt", id: "rebuilt"}
    ],
    value      : "good",
    scope      : "post"
  },
  
  prismCoolantPressure: {
    title      : "Coolant System Pressure",
    description: "TSC pressure affects chip evacuation and tool life in deep holes.",
    group      : "prismMachine",
    type       : "enum",
    values     : [
      {title: "Standard Flood Only", id: "flood"},
      {title: "Low Pressure TSC (150 PSI)", id: "tsc_150"},
      {title: "Medium Pressure TSC (300 PSI)", id: "tsc_300"},
      {title: "High Pressure TSC (500 PSI)", id: "tsc_500"},
      {title: "Very High Pressure (1000 PSI)", id: "tsc_1000"},
      {title: "Ultra High Pressure (1500+ PSI)", id: "tsc_1500"}
    ],
    value      : "tsc_300",
    scope      : "post"
  },
  
  prismCoolantVolume: {
    title      : "Coolant Flow Rate",
    description: "Higher volume improves chip flushing and heat dissipation.",
    group      : "prismMachine",
    type       : "enum",
    values     : [
      {title: "Low (< 5 GPM)", id: "low"},
      {title: "Standard (5-10 GPM)", id: "standard"},
      {title: "High (10-20 GPM)", id: "high"},
      {title: "Very High (20+ GPM)", id: "very_high"}
    ],
    value      : "standard",
    scope      : "post"
  },
  
  prismAxisRapid: {
    title      : "Axis Rapid Rate (IPM)",
    description: "Maximum rapid traverse rate. Affects cycle time estimates.",
    group      : "prismMachine",
    type       : "enum",
    values     : [
      {title: "400 IPM", id: "400"},
      {title: "600 IPM", id: "600"},
      {title: "800 IPM", id: "800"},
      {title: "1000 IPM", id: "1000"},
      {title: "1200 IPM", id: "1200"},
      {title: "1400 IPM", id: "1400"},
      {title: "1600 IPM", id: "1600"},
      {title: "2000 IPM", id: "2000"},
      {title: "2400 IPM", id: "2400"}
    ],
    value      : "1000",
    scope      : "post"
  },
  
  prismMaxFeedRate: {
    title      : "Max Cutting Feed (IPM)",
    description: "Maximum programmable feed rate. PRISM will cap recommendations at this value.",
    group      : "prismMachine",
    type       : "enum",
    values     : [
      {title: "100 IPM", id: "100"},
      {title: "150 IPM", id: "150"},
      {title: "200 IPM", id: "200"},
      {title: "300 IPM", id: "300"},
      {title: "400 IPM", id: "400"},
      {title: "500 IPM", id: "500"},
      {title: "600 IPM", id: "600"},
      {title: "800 IPM", id: "800"},
      {title: "1000 IPM", id: "1000"}
    ],
    value      : "400",
    scope      : "post"
  },
  
  prismAcceleration: {
    title      : "Axis Acceleration",
    description: "Higher acceleration allows higher feeds in short moves without losing accuracy.",
    group      : "prismMachine",
    type       : "enum",
    values     : [
      {title: "Low (0.3G)", id: "low"},
      {title: "Medium (0.5G)", id: "medium"},
      {title: "High (0.75G)", id: "high"},
      {title: "Very High (1.0G)", id: "very_high"},
      {title: "Ultra (1.5G+)", id: "ultra"}
    ],
    value      : "medium",
    scope      : "post"
  },
  
  prismLinearScales: {
    title      : "Position Feedback",
    description: "Linear scales provide higher accuracy than rotary encoders alone.",
    group      : "prismMachine",
    type       : "enum",
    values     : [
      {title: "Rotary Encoders Only", id: "encoder"},
      {title: "Linear Scales (All Axes)", id: "scales_all"},
      {title: "Linear Scales (X, Y only)", id: "scales_xy"},
      {title: "Linear Scales + Rotary", id: "hybrid"}
    ],
    value      : "encoder",
    scope      : "post"
  },
  
  prismThermalComp: {
    title      : "Thermal Compensation",
    description: "Thermal compensation improves accuracy during long runs.",
    group      : "prismMachine",
    type       : "enum",
    values     : [
      {title: "None", id: "none"},
      {title: "Spindle Only", id: "spindle"},
      {title: "Spindle + Axes", id: "spindle_axes"},
      {title: "Full Environmental", id: "full"}
    ],
    value      : "spindle",
    scope      : "post"
  },
  
  prismWorkholding: {
    title      : "Typical Workholding",
    description: "Workholding rigidity affects achievable DOC and vibration.",
    group      : "prismMachine",
    type       : "enum",
    values     : [
      {title: "Kurt/Standard Vise", id: "vise"},
      {title: "Dual Vise Setup", id: "dual_vise"},
      {title: "5-Axis Vise (Lang, etc)", id: "5axis_vise"},
      {title: "Fixture Plate + Clamps", id: "fixture_plate"},
      {title: "Vacuum Table", id: "vacuum"},
      {title: "Dedicated Fixture", id: "dedicated"},
      {title: "Tombstone/Pallet", id: "tombstone"},
      {title: "Soft Jaws", id: "soft_jaws"},
      {title: "Collet Chuck", id: "collet_chuck"}
    ],
    value      : "vise",
    scope      : "post"
  },

  // =========================================================================
  // 2. MATERIAL SELECTION - What are you cutting?
  // =========================================================================
  // Integrated with PRISM v9.0 Materials Database (3,518 materials)
  // Auto-adjusts speeds/feeds based on Kienzle and Taylor equations
  // =========================================================================

  prismMaterialGroup: {
    title      : "Material ISO Group",
    description: "What material are you cutting? This is the most important setting. Wrong material = wrong speeds.",
    group      : "prismMaterial",
    type       : "enum",
    values     : [
      {title: "P - Steel (Carbon, Alloy, Tool)", id: "P"},
      {title: "M - Stainless Steel", id: "M"},
      {title: "K - Cast Iron", id: "K"},
      {title: "N - Non-Ferrous (Aluminum, Brass, Copper, Plastic)", id: "N"},
      {title: "S - Superalloys (Inconel, Titanium, Hastelloy)", id: "S"},
      {title: "H - Hardened Steel (>45 HRC)", id: "H"},
      {title: "X - Specialty (Composites, Graphite)", id: "X"}
    ],
    value      : "P",
    scope      : "post"
  },
  prismMaterialSpecific: {
    title      : "Specific Material",
    description: "Pick your exact alloy. If unsure, just set the Material Group above and leave this at default.",
    group      : "prismMaterial",
    type       : "enum",
    values     : [
      // P - Steels (most common)
      {title: "-- P: STEELS --", id: "P_HEADER"},
      {title: "1018 Mild Steel (Cold Rolled)", id: "P_1018_CR"},
      {title: "1018 Mild Steel (Hot Rolled)", id: "P_1018_HR"},
      {title: "1020 Low Carbon", id: "P_1020"},
      {title: "1045 Medium Carbon", id: "P_1045"},
      {title: "1045 Medium Carbon (Q&T)", id: "P_1045_QT"},
      {title: "12L14 Free Machining", id: "P_12L14"},
      {title: "1215 Free Machining", id: "P_1215"},
      {title: "4130 Chromoly (Annealed)", id: "P_4130_ANN"},
      {title: "4130 Chromoly (Normalized)", id: "P_4130_NORM"},
      {title: "4140 Alloy (Annealed)", id: "P_4140_ANN"},
      {title: "4140 Alloy (Q&T 28-32 HRC)", id: "P_4140_QT"},
      {title: "4340 Alloy (Annealed)", id: "P_4340_ANN"},
      {title: "4340 Alloy (Q&T 38-42 HRC)", id: "P_4340_QT"},
      {title: "8620 Case Hardening", id: "P_8620"},
      {title: "A36 Structural", id: "P_A36"},
      {title: "A572 Grade 50", id: "P_A572"},
      {title: "D2 Tool Steel (Annealed)", id: "P_D2_ANN"},
      {title: "O1 Tool Steel (Annealed)", id: "P_O1_ANN"},
      {title: "A2 Tool Steel (Annealed)", id: "P_A2_ANN"},
      {title: "S7 Tool Steel (Annealed)", id: "P_S7_ANN"},
      {title: "H13 Tool Steel (Annealed)", id: "P_H13_ANN"},
      {title: "P20 Mold Steel", id: "P_P20"},
      
      // M - Stainless Steels
      {title: "-- M: STAINLESS STEELS --", id: "M_HEADER"},
      {title: "303 Stainless (Free Machining)", id: "M_303"},
      {title: "304 Stainless (Annealed)", id: "M_304"},
      {title: "304L Stainless", id: "M_304L"},
      {title: "316 Stainless (Annealed)", id: "M_316"},
      {title: "316L Stainless", id: "M_316L"},
      {title: "410 Stainless", id: "M_410"},
      {title: "416 Stainless (Free Machining)", id: "M_416"},
      {title: "420 Stainless", id: "M_420"},
      {title: "440C Stainless (Annealed)", id: "M_440C"},
      {title: "17-4 PH (H900)", id: "M_174_H900"},
      {title: "17-4 PH (H1025)", id: "M_174_H1025"},
      {title: "15-5 PH", id: "M_155"},
      {title: "Duplex 2205", id: "M_2205"},
      
      // K - Cast Irons
      {title: "-- K: CAST IRONS --", id: "K_HEADER"},
      {title: "Gray Cast Iron (Class 30)", id: "K_GRAY30"},
      {title: "Gray Cast Iron (Class 40)", id: "K_GRAY40"},
      {title: "Ductile Iron (65-45-12)", id: "K_DUCTILE_65"},
      {title: "Ductile Iron (80-55-06)", id: "K_DUCTILE_80"},
      {title: "Malleable Iron", id: "K_MALLEABLE"},
      {title: "Compacted Graphite Iron", id: "K_CGI"},
      
      // N - Non-Ferrous
      {title: "-- N: ALUMINUM --", id: "N_AL_HEADER"},
      {title: "6061-T6 Aluminum", id: "N_6061_T6"},
      {title: "6061-T651 Aluminum (Plate)", id: "N_6061_T651"},
      {title: "7075-T6 Aluminum", id: "N_7075_T6"},
      {title: "7075-T651 Aluminum (Plate)", id: "N_7075_T651"},
      {title: "2024-T351 Aluminum", id: "N_2024"},
      {title: "6063-T6 Aluminum (Extrusion)", id: "N_6063"},
      {title: "MIC-6 Cast Aluminum (Plate)", id: "N_MIC6"},
      {title: "A356 Cast Aluminum", id: "N_A356"},
      {title: "7050 Aluminum (Aerospace)", id: "N_7050"},
      {title: "5052 Aluminum", id: "N_5052"},
      {title: "-- N: BRASS/BRONZE/COPPER --", id: "N_BRASS_HEADER"},
      {title: "360 Brass (Free Cutting)", id: "N_BRASS_360"},
      {title: "C260 Cartridge Brass", id: "N_BRASS_260"},
      {title: "C932 Bearing Bronze (SAE 660)", id: "N_BRONZE_932"},
      {title: "C954 Aluminum Bronze", id: "N_BRONZE_954"},
      {title: "C110 Copper (ETP)", id: "N_COPPER_110"},
      {title: "C145 Tellurium Copper", id: "N_COPPER_145"},
      {title: "-- N: TUNGSTEN COPPER (EDM) --", id: "N_WCU_HEADER"},
      {title: "W-Cu 70W-30Cu (Class 10 - Best Machinability)", id: "N_WCU_70_30"},
      {title: "W-Cu 75W-25Cu (Class 11 - Balanced)", id: "N_WCU_75_25"},
      {title: "W-Cu 80W-20Cu (Class 12 - High Wear Res)", id: "N_WCU_80_20"},
      {title: "W-Cu 90W-10Cu (Class 13 - Max Wear Res)", id: "N_WCU_90_10"},
      {title: "Elkonite (Tungsten Copper)", id: "N_WCU_ELKONITE"},
      {title: "-- N: PLASTICS --", id: "N_PLASTIC_HEADER"},
      {title: "Delrin/Acetal (POM)", id: "N_DELRIN"},
      {title: "Nylon 6/6", id: "N_NYLON"},
      {title: "UHMW Polyethylene", id: "N_UHMW"},
      {title: "PEEK", id: "N_PEEK"},
      {title: "Polycarbonate", id: "N_POLYCARB"},
      {title: "Acrylic (PMMA)", id: "N_ACRYLIC"},
      {title: "HDPE", id: "N_HDPE"},
      {title: "G10/FR4 Fiberglass", id: "N_G10"},
      
      // S - Superalloys & Titanium
      {title: "-- S: TITANIUM --", id: "S_TI_HEADER"},
      {title: "Ti-6Al-4V (Grade 5) Annealed", id: "S_TI64_ANN"},
      {title: "Ti-6Al-4V (Grade 5) STA", id: "S_TI64_STA"},
      {title: "CP Titanium Grade 2", id: "S_TI_CP2"},
      {title: "CP Titanium Grade 4", id: "S_TI_CP4"},
      {title: "Ti-6Al-2Sn-4Zr-2Mo", id: "S_TI6242"},
      {title: "-- S: NICKEL SUPERALLOYS --", id: "S_NI_HEADER"},
      {title: "Inconel 718 (Annealed)", id: "S_IN718_ANN"},
      {title: "Inconel 718 (Aged)", id: "S_IN718_AGED"},
      {title: "Inconel 625", id: "S_IN625"},
      {title: "Inconel 600", id: "S_IN600"},
      {title: "Hastelloy C-276", id: "S_HAST_C276"},
      {title: "Hastelloy X", id: "S_HAST_X"},
      {title: "Waspaloy", id: "S_WASPALOY"},
      {title: "Monel 400", id: "S_MONEL_400"},
      {title: "Monel K-500", id: "S_MONEL_K500"},
      {title: "-- S: COBALT SUPERALLOYS --", id: "S_CO_HEADER"},
      {title: "Stellite 6", id: "S_STELLITE_6"},
      {title: "L-605 (Haynes 25)", id: "S_L605"},
      
      // H - Hardened Steels
      {title: "-- H: HARDENED STEELS --", id: "H_HEADER"},
      {title: "Hardened Steel 45-48 HRC", id: "H_45HRC"},
      {title: "Hardened Steel 48-52 HRC", id: "H_50HRC"},
      {title: "Hardened Steel 52-56 HRC", id: "H_54HRC"},
      {title: "Hardened Steel 56-60 HRC", id: "H_58HRC"},
      {title: "Hardened Steel 60-65 HRC", id: "H_62HRC"},
      {title: "D2 Tool Steel (58-60 HRC)", id: "H_D2_HARD"},
      {title: "A2 Tool Steel (58-60 HRC)", id: "H_A2_HARD"},
      {title: "S7 Tool Steel (54-56 HRC)", id: "H_S7_HARD"},
      {title: "H13 Tool Steel (48-52 HRC)", id: "H_H13_HARD"},
      {title: "M2 HSS (62-65 HRC)", id: "H_M2_HARD"},
      
      // X - Specialty
      {title: "-- X: SPECIALTY --", id: "X_HEADER"},
      {title: "Graphite (Fine Grain)", id: "X_GRAPHITE"},
      {title: "Carbon Fiber Composite", id: "X_CFRP"},
      {title: "Glass Fiber Composite", id: "X_GFRP"},
      {title: "Tungsten Carbide", id: "X_WC"},
      {title: "Ceramic (Machinable)", id: "X_CERAMIC"},
      {title: "-- X: ADDITIVE / AM --", id: "X_AM_HEADER"},
      {title: "316L Stainless (DMLS/SLM)", id: "X_316L_DMLS"},
      {title: "AlSi10Mg (SLM)", id: "X_ALSI10MG_SLM"},
      {title: "Inconel 718 (DMLS)", id: "X_IN718_DMLS"},
      {title: "Inconel 625 (DMLS)", id: "X_IN625_DMLS"},
      {title: "17-4 PH (DMLS)", id: "X_174_DMLS"},
      {title: "CoCr (DMLS Medical)", id: "X_COCR_DMLS"},
      {title: "Maraging Steel (DMLS)", id: "X_MSTEEL_DMLS"},
      {title: "Ti-6Al-4V SLM (Additive)", id: "S_TI64_SLM"},
      {title: "-- X: COMPOSITES --", id: "X_COMP_HEADER"},
      {title: "Aramid Fiber (Kevlar) Composite", id: "X_AFRP"},
      {title: "Carbon Fiber / PEEK Composite", id: "X_CF_PEEK"},
      {title: "Garolite G11 (High Temp)", id: "X_G11"},
      {title: "-- X: REFRACTORY & EXOTIC --", id: "X_REFRACT_HEADER"},
      {title: "Graphite (Medium Grain EDM)", id: "X_GRAPHITE_MED"},
      {title: "Zirconium (702)", id: "X_ZIRCONIUM"},
      {title: "Tantalum", id: "X_TANTALUM"},
      {title: "Niobium (Columbium)", id: "X_NIOBIUM"},
      {title: "Macor (Machinable Glass Ceramic)", id: "X_MACOR"},
      {title: "Molybdenum (Pure)", id: "N_MOLY"},
      {title: "Tungsten (Pure)", id: "N_TUNGSTEN"},
      {title: "-- N: MORE ALUMINUM --", id: "N_AL2_HEADER"},
      {title: "1100 Pure Aluminum", id: "N_1100"},
      {title: "2011-T3 Aluminum (Free Machining)", id: "N_2011"},
      {title: "2014-T6 Aluminum", id: "N_2014"},
      {title: "2219-T851 Aluminum (Aerospace)", id: "N_2219"},
      {title: "5083-H116 Aluminum (Marine)", id: "N_5083"},
      {title: "6082-T6 Aluminum (Structural)", id: "N_6082"},
      {title: "380 Die Cast Aluminum", id: "N_380"},
      {title: "390 Die Cast Aluminum (High Si)", id: "N_390"},
      {title: "6061-O Aluminum (Annealed)", id: "N_6061_O"},
      {title: "-- N: MORE COPPER/BRONZE --", id: "N_CU2_HEADER"},
      {title: "C172 Beryllium Copper (Age Hardened)", id: "N_BECU_172"},
      {title: "C17200 Beryllium Copper (Solution Treated)", id: "N_BECU_17200"},
      {title: "C510 Phosphor Bronze", id: "N_PHOS_510"},
      {title: "C630 Nickel Aluminum Bronze", id: "N_NIBRONZE_630"},
      {title: "C464 Naval Brass", id: "N_NAVAL_464"},
      {title: "-- N: MAGNESIUM/ZINC --", id: "N_MGZN_HEADER"},
      {title: "Magnesium AZ31B", id: "N_MG_AZ31B"},
      {title: "Magnesium AZ91D (Die Cast)", id: "N_MG_AZ91D"},
      {title: "Zamak 3 (Zinc Die Cast)", id: "N_ZAMAK3"},
      {title: "-- N: MORE PLASTICS --", id: "N_PL2_HEADER"},
      {title: "PVC (Type I)", id: "N_PVC"},
      {title: "ABS", id: "N_ABS"},
      {title: "PTFE (Teflon)", id: "N_PTFE"},
      {title: "Ultem (PEI)", id: "N_ULTEM"},
      {title: "Torlon (PAI)", id: "N_TORLON"},
      {title: "Polypropylene (PP)", id: "N_PP"},
      {title: "-- P: MORE STEELS --", id: "P_MORE_HEADER"},
      {title: "1008 Low Carbon (Drawing Quality)", id: "P_1008"},
      {title: "1010 Low Carbon", id: "P_1010"},
      {title: "1040 Medium Carbon", id: "P_1040"},
      {title: "1050 Medium Carbon", id: "P_1050"},
      {title: "1075 Spring Steel", id: "P_1075"},
      {title: "1095 High Carbon Spring", id: "P_1095"},
      {title: "1141 Free Machining (Stress-Proof)", id: "P_1141"},
      {title: "1144 Free Machining (Stressproof)", id: "P_1144"},
      {title: "5160 Spring Steel", id: "P_5160"},
      {title: "9310 Case Hardening (Aerospace)", id: "P_9310"},
      {title: "A514 Q&T Plate", id: "P_A514"},
      {title: "M2 HSS Tool Steel (Annealed)", id: "P_M2_ANN"},
      {title: "M42 HSS-Co Tool Steel (Annealed)", id: "P_M42_ANN"},
      {title: "CPM S30V (Annealed)", id: "P_S30V_ANN"},
      {title: "CPM S45VN (Annealed)", id: "P_S45VN_ANN"},
      {title: "Maraging 300 (Annealed)", id: "P_MAR300_ANN"},
      {title: "52100 Bearing Steel (Annealed)", id: "P_52100_ANN"},
      {title: "-- M: MORE STAINLESS --", id: "M_MORE_HEADER"},
      {title: "321 Stainless (Stabilized)", id: "M_321"},
      {title: "347 Stainless (Stabilized)", id: "M_347"},
      {title: "430 Stainless (Ferritic)", id: "M_430"},
      {title: "904L Super Austenitic", id: "M_904L"},
      {title: "2507 Super Duplex", id: "M_2507"},
      {title: "13-8 PH (H950)", id: "M_138_H950"},
      {title: "Nitronic 60 (S21800)", id: "M_NITRONIC60"},
      {title: "-- S: MORE TITANIUM --", id: "S_TI2_HEADER"},
      {title: "Ti-6Al-4V ELI (Grade 23 Medical)", id: "S_TI64_ELI"},
      {title: "Ti-5Al-5V-5Mo-3Cr (Ti-5553)", id: "S_TI5553"},
      {title: "CP Titanium Grade 1", id: "S_TI_CP1"},
      {title: "-- S: MORE SUPERALLOYS --", id: "S_NI2_HEADER"},
      {title: "Inconel 725", id: "S_IN725"},
      {title: "Rene 41", id: "S_RENE41"},
      {title: "Incoloy 825", id: "S_INCOLOY825"},
      {title: "Hastelloy C-22", id: "S_HAST_C22"},
      {title: "MP35N", id: "S_MP35N"},
      {title: "-- H: MORE HARDENED --", id: "H_MORE_HEADER"},
      {title: "CPM S30V (58-60 HRC)", id: "H_S30V_HARD"},
      {title: "CPM S45VN (59-61 HRC)", id: "H_S45VN_HARD"},
      {title: "O1 Tool Steel (58-62 HRC)", id: "H_O1_HARD"},
      {title: "P20 Mold Steel (30-36 HRC)", id: "H_P20_HARD"},
      {title: "Maraging 300 (50-54 HRC)", id: "H_MAR300_HARD"},
      {title: "52100 Bearing Steel (58-62 HRC)", id: "H_52100_HARD"},
      {title: "440C Stainless (56-58 HRC)", id: "H_440C_HARD"},
      {title: "-- K: MORE CAST IRON --", id: "K_MORE_HEADER"},
      {title: "Gray Cast Iron (Class 20)", id: "K_GRAY20"},
      {title: "Ductile Iron (100-70-03)", id: "K_DUCTILE_100"},
      {title: "Austempered Ductile Iron (ADI)", id: "K_ADI_1"},
      {title: "Ni-Resist (Austenitic Cast Iron)", id: "K_NIRESIST"}
    ],
    value      : "P_4140_ANN",
    scope      : "post"
  },
  prismMaterialHardness: {
    title      : "Material Hardness (HRC/HB)",
    description: "Override hardness for custom materials. 0 = use default for selected material. Enter HRC for hardened steel (45-65), HB for others (100-400).",
    group      : "prismMaterial",
    type       : "integer",
    range      : [0, 700],
    value      : 0,
    scope      : "post"
  },
  prismOptimizationMode: {
    title      : "Optimization Priority",
    description: "Balance between tool life and cycle time.",
    group      : "prismMaterial",
    type       : "enum",
    values     : [
      {title: "Tool Life Priority (Conservative)", id: "tool_life"},
      {title: "Balanced (Recommended)", id: "balanced"},
      {title: "Productivity Priority (Aggressive)", id: "productivity"},
      {title: "Maximum MRR (Expert Only)", id: "max_mrr"}
    ],
    value      : "balanced",
    scope      : "post"
  },
  // =========================================================================
  // 3. PROVE-OUT MODE — First article safety derating
  // =========================================================================
  prismProveOut: {
    title      : "Prove-Out Mode (First Article)",
    description: "SAFETY: Reduces speed and feed for first-article prove-out runs. ON by default — disable after first good part. Prevents tool breakage and machine crashes on untested programs.",
    group      : "prismMaterial",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  prismProveOutSpeedPct: {
    title      : "Prove-Out Speed %",
    description: "Run spindle at this percentage during prove-out. 80% = 80% of calculated RPM. Lower = safer but slower.",
    group      : "prismMaterial",
    type       : "integer",
    value      : 80,
    scope      : "post"
  },
  prismProveOutFeedPct: {
    title      : "Prove-Out Feed %",
    description: "Run feed at this percentage during prove-out. 50% = half speed feed. Lower = safer but slower.",
    group      : "prismMaterial",
    type       : "integer",
    value      : 50,
    scope      : "post"
  },

  prismCoolantStrategy: {
    title      : "Coolant Strategy",
    description: "Auto-select coolant based on material, or override.",
    group      : "prismMaterial",
    type       : "enum",
    values     : [
      {title: "Auto (Material-Based)", id: "auto"},
      {title: "Flood Coolant", id: "flood"},
      {title: "Mist Coolant", id: "mist"},
      {title: "Through-Spindle (TSC)", id: "tsc"},
      {title: "High-Pressure Through-Spindle", id: "hp_tsc"},
      {title: "Air Blast", id: "air"},
      {title: "Dry Machining", id: "dry"},
      {title: "MQL (Minimum Quantity)", id: "mql"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismShowMaterialCalcs: {
    title      : "Show material calculations in G-code",
    description: "Output Kienzle cutting force, power, and tool life calculations as comments.",
    group      : "prismMaterial",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },

  // =========================================================================
  // PRISM v10.5 - CHIP THINNING & VARIABLE SPEED/FEED CONTROLS
  // =========================================================================
  prismChipThinFormula: {
    title      : "Chip Thinning Formula",
    description: "SQRT = Industry standard (Sandvik/Iscar) - more aggressive, higher feeds at low WOC. GEOMETRIC = Conservative, safer. AUTO = SQRT for HEM, GEOMETRIC for HSM. OFF = No chip thinning adjustment.",
    group      : "prismOptimization",
    type       : "enum",
    values     : ["auto", "sqrt", "geometric", "off"],
    value      : "auto",
    scope      : "post"
  },
  prismVariableRPM: {
    title      : "Variable RPM",
    description: "Adjusts spindle speed based on engagement depth. Reduces RPM at high engagement (heat/vibration control). Increases RPM at light engagement (productivity). Especially useful for 3D adaptive.",
    group      : "prismOptimization",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  prismVarRPMMode: {
    title      : "Variable RPM Mode",
    description: "AUTO = Adjusts by operation type. CONSERVATIVE = More RPM reduction for safety. AGGRESSIVE = Less reduction for speed. FINISHING = Optimized for surface finish.",
    group      : "prismOptimization",
    type       : "enum",
    values     : ["auto", "conservative", "aggressive", "finishing"],
    value      : "auto",
    scope      : "post"
  },
  prismVarRPMMaxIncrease: {
    title      : "Var RPM Max Increase %",
    description: "Maximum RPM increase at light engagement. Higher = more productive but may increase chatter risk. 0-50%.",
    group      : "prismOptimization",
    type       : "integer",
    range      : [0, 50],
    value      : 20,
    scope      : "post"
  },
  prismVarRPMMaxDecrease: {
    title      : "Var RPM Max Decrease %",
    description: "Maximum RPM decrease at high engagement. Higher = cooler cutting but slower cycle. 0-50%.",
    group      : "prismOptimization",
    type       : "integer",
    range      : [0, 50],
    value      : 30,
    scope      : "post"
  },

  writeMachine: {
    title      : "Write machine",
    description: "Output the machine settings in the header of the code.",
    group      : "formats",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  writeTools: {
    title      : "Write tool list",
    description: "Output a tool list in the header of the code.",
    group      : "formats",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  preloadTool: {
    title      : "Preload tool",
    description: "Preloads the next tool at a tool change (if any).",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  showSequenceNumbers: {
    title      : "Use sequence numbers",
    description: "'Yes' outputs sequence numbers on each block, 'Only on tool change' outputs sequence numbers on tool change blocks only, and 'No' disables the output of sequence numbers.",
    group      : "formats",
    type       : "enum",
    values     : [
      {title:"Yes", id:"true"},
      {title:"No", id:"false"},
      {title:"Only on tool change", id:"toolChange"}
    ],
    value: "false",
    scope: "post"
  },
  sequenceNumberStart: {
    title      : "Start sequence number",
    description: "The number at which to start the sequence numbers.",
    group      : "formats",
    type       : "integer",
    value      : 0,
    scope      : "post"
  },
  sequenceNumberIncrement: {
    title      : "Sequence number increment",
    description: "The amount by which the sequence number is incremented by in each block.",
    group      : "formats",
    type       : "integer",
    value      : 0,
    scope      : "post"
  },
  optionalStop: {
    title      : "Optional stop",
    description: "Outputs optional stop code during when necessary in the code.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  isnc: {
    title      : "Use ISNC or BNC mode",
    description: "Selects between ISNC (ISO NC mode) and BNC (Basic NC mode).",
    group      : "formats",
    type       : "boolean",
    values     : [
      "Basic NC mode",
      "ISO NC mode"
    ],
    value: true,
    scope: "post"
  },
  separateWordsWithSpace: {
    title      : "Separate words with space",
    description: "Adds spaces between words if 'yes' is selected.",
    group      : "formats",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  allow3DArcs: {
    title      : "Allow 3D arcs",
    description: "Specifies whether 3D circular arcs are allowed.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useParametricFeed: {
    title      : "Parametric feed",
    description: "Specifies the feed value that should be output using a Q value.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useG0: {
    title      : "Use G0",
    description: "Specifies that G0s should be used for rapid moves.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  showNotes: {
    title      : "Show notes",
    description: "Writes operation notes as comments in the outputted code.",
    group      : "formats",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  preferredTilt: {
    title      : "Prefer positive tilt",
    description: "Specifies whether to prefer positive or negative tilt angles.",
    group      : "multiAxis",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  toolChangePositionX: {
    title      : "Safe tool change position X",
    description: "Specify whether to use a safe tool change position in the X axis.",
    group      : "homePositions",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  toolChangePositionY: {
    title      : "Safe tool change position Y",
    description: "Specify whether to use a safe tool change position in the Y axis.",
    group      : "homePositions",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  machineAxisABC: {
    title      : "Machine axes",
    description: "Specify your machine axes here, for use with vector output only.",
    group      : "configuration",
    type       : "string",
    value      : "ABC",
    scope      : "post"
  },
  safePositionMethod: {
    title      : "Safe Retracts",
    description: "Select your desired retract option. 'Clearance Height' retracts to the operation clearance height.",
    group      : "homePositions",
    type       : "enum",
    values     : [
      // {title:"G28", id: "G28"},
      {title:"G28", id:"G28"},
      {title:"Clearance Height", id:"clearanceHeight"}
    ],
    value: "G28",
    scope: "post"
  },
  useM140: {
    title      : "Use M140",
    description: "Specifies to use M140 for Z-axis retracts instead of G53.",
    group      : "homePositions",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useMultiAxisFeatures: {
    title      : "Use multi-axis features",
    description: "Enables multi-axis features such as TCP, inverse time feed, and rotary axis positioning. Disable for pure 3-axis work.",
    group      : "multiAxis",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  useABCPrepositioning: {
    title      : "Use ABC pre-positioning",
    description: "Enables rotary axis pre-positioning before cutting moves. Uses G53 moves to pre-rotate axes.",
    group      : "multiAxis",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  safeRetractDistance: {
    title      : "Safe retract distance",
    description: "Safe retract distance for multi-axis moves (0 = disabled). Value in document units.",
    group      : "multiAxis",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  useDPMFeeds: {
    title      : "Use DPM feeds",
    description: "Outputs feed in degrees per minute for multi-axis moves instead of inverse time (G93). Only applies when multi-axis features are enabled.",
    group      : "multiAxis",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  useG54x4: {
    title      : "Use G54.4",
    description: "Enables G54.4 workpiece setting error compensation for probe angle measurement. If disabled, G68 rotation is used instead.",
    group      : "probing",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  singleResultsFile: {
    title      : "Create single results file",
    description: "Set to false if you want to store the measurement results for each probe / inspection toolpath in a separate file",
    group      : "probing",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useSmoothing: {
    title      : "Use smoothing",
    description: "Enables G05.3 smoothing at the beginning of each operation. Automatically sets P35 for roughing (stock to leave > 0) and P10 for finishing (no stock to leave).",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  smoothingRoughValue: {
    title      : "Smoothing rough value",
    description: "G05.3 P value for roughing operations (when stock to leave > 0).",
    group      : "preferences",
    type       : "integer",
    range      : [1, 100],
    value      : 35,
    scope      : "post"
  },
  smoothingFinishValue: {
    title      : "Smoothing finish value",
    description: "G05.3 P value for finishing operations (when stock to leave = 0).",
    group      : "preferences",
    type       : "integer",
    range      : [1, 100],
    value      : 10,
    scope      : "post"
  },
  smoothingSemiFinishValue: {
    title      : "Smoothing semi-finish value",
    description: "G05.3 P value for semi-finishing operations (when stock to leave is small).",
    group      : "preferences",
    type       : "integer",
    range      : [1, 100],
    value      : 20,
    scope      : "post"
  },
  // v11 S10 U-PBL30: G64 UltiMotion Cutting Mode
  useUltiMotion: {
    title      : "Use UltiMotion (G64)",
    description: "Enable G64 UltiMotion cutting mode per operation. Roughing: G64 P0.05 (looser tolerance for speed). Finishing: G64 P0.01 (tighter for accuracy). Drilling: no G64. Cancelled at section end.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  ultiMotionRoughTol: {
    title      : "UltiMotion rough tolerance (mm)",
    description: "G64 P value for roughing operations. Larger = faster but less accurate.",
    group      : "preferences",
    type       : "number",
    value      : 0.05,
    scope      : "post"
  },
  ultiMotionFinishTol: {
    title      : "UltiMotion finish tolerance (mm)",
    description: "G64 P value for finishing operations. Smaller = more accurate.",
    group      : "preferences",
    type       : "number",
    value      : 0.01,
    scope      : "post"
  },
  // ─── PRISM v11.1 advanced-feature surface (echo /goal 2026-05-25; merged from deployed copy 2026-06-30) ───
  // Closes 4 gaps identified in POST-PROCESSOR-CONSOLIDATION-2026-05-25-echo.md §4:
  //   #2 tribal-tip citation, #7 CI95 comments, #9 numeric look-ahead, #8 cross-CAM features.
  // Engine surface already supports these via MasterPostProcessorEngine + PostProcessorPipelineEngine
  // (CrossCamFeatureSet, UnifiedPostResult.tribal_tips_applied, ToolpathBlock.confidence.ci_95).
  // NOTE: all four are INERT option DECLARATIONS (getProperty-reads=0 in the post body) — no emit path,
  // so prismTribalCitation:true does NOT reintroduce the removed tribal-NC regression. Verified 2026-06-30.
  prismTribalCitation: {
    title      : "Inject tribal-tip citations as comments",
    description: "When PRISM sidecar JSON carries tribal_tips_applied[], emit '(TRIBAL: tip_id — text)' before the operation. Closes hard-coded tribal-text-as-comment anti-pattern.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  prismCI95Comments: {
    title      : "Emit per-op CI95 confidence intervals",
    description: "When PRISM physics pipeline (P4 stochastic verify) produces force_ci_95 / feed_ci_95 / Ra_ci_95 per block, emit them as '(CI95: Fc=X±dN, Ra=Y±dµm)' comments after the operation header.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismLookAheadBlocks: {
    title      : "Look-ahead buffer (blocks)",
    description: "Explicit numeric look-ahead exposure. WinMax UltiMotion default 10000 blocks/15000 blocks-per-sec. Reduce only if controller load is observed dropping. 0 = use controller default.",
    group      : "preferences",
    type       : "integer",
    range      : [0, 20000],
    value      : 10000,
    scope      : "post"
  },
  prismCrossCAMFeatures: {
    title      : "Cross-CAM feature injection (CSV)",
    description: "Comma-separated list of cross-CAM features to inject from CrossCamFeatureSet: solidcam_chip_thinning, hypermill_collision_check, fusion360_adaptive, mastercam_dynamic_chip_load, nx_advanced_rtcp. Defaults already-emit pair: solidcam_chip_thinning,fusion360_adaptive.",
    group      : "preferences",
    type       : "string",
    value      : "solidcam_chip_thinning,fusion360_adaptive",
    scope      : "post"
  },
  // ─── End PRISM v11.1 advanced-feature surface ───
  useSafeStartBlock: {
    title      : "Safe start block",
    description: "Output safety codes at program start (G40, G80, G17, G90).",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useSpindleWarmUp: {
    title      : "Spindle warm-up",
    description: "Enable spindle warm-up routine at program start.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  spindleWarmUpRPM: {
    title      : "Spindle warm-up max RPM",
    description: "Maximum RPM to ramp up to during spindle warm-up.",
    group      : "preferences",
    type       : "integer",
    value      : 8000,
    scope      : "post"
  },
  spindleWarmUpTime: {
    title      : "Spindle warm-up time (minutes)",
    description: "Total time for spindle warm-up routine.",
    group      : "preferences",
    type       : "integer",
    value      : 5,
    scope      : "post"
  },
  useAutomaticBuffering: {
    title      : "Automatic buffering",
    description: "Enable M16 automatic buffering for smoother motion.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useWashdownCoolant: {
    title      : "Washdown coolant",
    description: "Enable washdown coolant at program end (M68/M69).",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  // v11 S10 U-PBL29: Custom M-code injection before/after tool change
  mCodeBeforeToolChange: {
    title      : "M-code before tool change",
    description: "Custom M-code to output BEFORE every tool change (e.g., M69 washdown off, M61 conveyor off). Leave empty to skip. Multiple codes separated by space (e.g., 'M69 M61').",
    group      : "preferences",
    type       : "string",
    value      : "",
    scope      : "post"
  },
  mCodeAfterToolChange: {
    title      : "M-code after tool change",
    description: "Custom M-code to output AFTER every tool change (e.g., M68 washdown on, M59 conveyor on). Leave empty to skip.",
    group      : "preferences",
    type       : "string",
    value      : "",
    scope      : "post"
  },
  useMaxRapidRate: {
    title      : "Use max rapid rate (M194)",
    description: "Enable M194 to set maximum rapid rate. Set to 0 to disable.",
    group      : "preferences",
    type       : "integer",
    value      : 0,
    scope      : "post"
  },
  showEstimatedTime: {
    title      : "Show estimated cycle time",
    description: "Output estimated cycle time in operation comments.",
    group      : "formats",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  showOperationStrategy: {
    title      : "Show operation strategy",
    description: "Output operation strategy type in comments.",
    group      : "formats",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useChipConveyor: {
    title      : "Use chip conveyor",
    description: "Enable chip conveyor control (M59 on / M61 off).",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useSubprogramAirThruSpindle: {
    title      : "Use subprogram for air through spindle",
    description: "Call M98 subprograms instead of M11 for air through spindle. Required for machines where M11 Q1/Q0 doesn't work.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  airOnSubprogram: {
    title      : "Air ON subprogram number",
    description: "Subprogram number to call for air through spindle ON (e.g., 9100 calls O9100).",
    group      : "preferences",
    type       : "integer",
    value      : 9100,
    scope      : "post"
  },
  airOffSubprogram: {
    title      : "Air OFF subprogram number",
    description: "Subprogram number to call for air through spindle OFF (e.g., 9101 calls O9101).",
    group      : "preferences",
    type       : "integer",
    value      : 9101,
    scope      : "post"
  },
  airThruSpindleAuxOutput: {
    title      : "Air through spindle auxiliary output",
    description: "If your air through spindle is wired to an auxiliary output, specify which one (1-12). Set to 0 to disable. M52-M55 = outputs 1-4, M142-M149 = outputs 5-12.",
    group      : "preferences",
    type       : "integer",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  useMinimumZRetract: {
    title      : "Use minimum Z retract between WCS",
    description: "When changing work offsets (not tool changes), retract only to clearance above stock instead of full Z home. Saves time on multi-fixture setups.",
    group      : "homePositions",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  minimumZRetractClearance: {
    title      : "Minimum Z retract clearance",
    description: "Distance above the highest point of stock/part to retract to when using minimum Z retract. In current units (inch or mm).",
    group      : "homePositions",
    type       : "spatial",
    value      : 1.0,
    scope      : "post"
  },
  minimumZRetractFromWCS: {
    title      : "Minimum Z retract from WCS zero",
    description: "When using minimum Z retract, this is the Z position (in WCS) to retract to. Positive value = above WCS Z0. Set to 0 to use clearance above stock top instead.",
    group      : "homePositions",
    type       : "spatial",
    value      : 0,
    scope      : "post"
  },
  // PRISM Variable Feedrate Options for Adaptive Roughing
  forceFeedOutput: {
    title      : "Force feedrate on every line",
    description: "Always output feedrate (F value) on every cutting move. Essential for adaptive/dynamic toolpaths where feedrate varies with engagement. Disables modal feedrate optimization.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  roughingFeedMultiplier: {
    title      : "Roughing feedrate multiplier (%)",
    description: "Scale feedrate for roughing/adaptive operations by this percentage. 100 = no change, 120 = 20% faster, 80 = 20% slower. Applied to cutting moves only.",
    group      : "preferences",
    type       : "integer",
    range      : [10, 200],
    value      : 100,
    scope      : "post"
  },
  finishingFeedMultiplier: {
    title      : "Finishing feedrate multiplier (%)",
    description: "Scale feedrate for finishing operations by this percentage. 100 = no change. Applied to finish cutting moves only.",
    group      : "preferences",
    type       : "integer",
    range      : [10, 200],
    value      : 100,
    scope      : "post"
  },
  maximumFeedrate: {
    title      : "Maximum feedrate limit (absolute)",
    description: "Absolute cap on ALL output feedrates (in current units/min). Applied as the final clamp after all PRISM adjustments. Set to 0 to disable. See also: PRISM Max Cutting Feed (prismMaxFeedRate) which caps PRISM physics recommendations only.",
    group      : "preferences",
    type       : "spatial",
    value      : 0,
    scope      : "post"
  },
  minimumFeedrate: {
    title      : "Minimum feedrate limit (absolute)",
    description: "Absolute floor on ALL output feedrates (in current units/min). Applied as the final clamp after all PRISM adjustments. Set to 0 to disable. Prevents rubbing. See also: Min chip load % (minChipLoadFeed) which limits enhanced feed reduction only.",
    group      : "preferences",
    type       : "spatial",
    value      : 0,
    scope      : "post"
  },
  showFeedComments: {
    title      : "Show feedrate type comments",
    description: "Add comments showing the type of feedrate being used (CUTTING, RAMP, PLUNGE, etc.). Helpful for debugging adaptive toolpaths.",
    group      : "formats",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  // PRISM Enhanced Variable Feedrate Control
  usePrismEnhancedFeed: {
    title      : "Use Prism Enhanced variable feed",
    description: "Enable intelligent feedrate adjustment similar to advanced roughing technologies. Automatically reduces feed in corners and arcs to maintain constant chip thickness, and ramps feed smoothly between different cutting conditions.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  arcFeedCorrection: {
    title      : "Arc feed correction (%)",
    description: "Reduce feedrate on arcs/corners by this percentage to maintain constant chip thickness. 100% = full correction (constant chip load), 0% = no correction (constant feed). PRISM default is 100%.",
    group      : "preferences",
    type       : "integer",
    range      : [0, 100],
    value      : 100,
    scope      : "post"
  },
  directionChangeFeedReduction: {
    title      : "Direction change feed reduction (%)",
    description: "Reduce feedrate when tool changes direction sharply. This simulates increased engagement at corners. 30 = reduce by 30% at sharp corners.",
    group      : "preferences",
    type       : "integer",
    range      : [0, 50],
    value      : 25,
    scope      : "post"
  },
  feedRampingDistance: {
    title      : "Feed ramping distance",
    description: "Distance over which to smoothly ramp feedrate changes (in current units). 0 = instant feed changes, 0.5 = smooth 0.5 inch/mm transition. Prevents sudden load spikes.",
    group      : "preferences",
    type       : "spatial",
    value      : 0,
    scope      : "post"
  },
  minChipLoadFeed: {
    title      : "Minimum chip load feedrate (%)",
    description: "Never reduce feedrate below this percentage of programmed feed, even in tight corners. Prevents rubbing. 50 = minimum 50% of programmed feed.",
    group      : "preferences",
    type       : "integer",
    range      : [20, 100],
    value      : 50,
    scope      : "post"
  },
  // PRISM Advanced Feed Optimization Based on Cutting Parameters
  showOptimizationNotes: {
    title      : "Show optimization notes in G-code",
    description: "Add comments in G-code showing current cutting parameters, calculated adjustments, and suggestions for speeding up operations.",
    group      : "formats",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  toolStickoutMultiplier: {
    title      : "Tool stickout safety factor",
    description: "How aggressively to reduce feed for long stickout. 1.0 = standard reduction, 0.5 = less reduction (aggressive), 1.5 = more reduction (conservative). Stickout > 4xD triggers reduction.",
    group      : "preferences",
    type       : "number",
    value      : 1.0,
    scope      : "post"
  },
  maxStickoutRatio: {
    title      : "Maximum safe stickout ratio",
    description: "Maximum stickout-to-diameter ratio before significant feed reduction. Typical: 3-4 for roughing, 5-6 for finishing. Beyond this, feed is progressively reduced.",
    group      : "preferences",
    type       : "number",
    value      : 4.0,
    scope      : "post"
  },
  maxChipThinningMultiplier: {
    title      : "Maximum chip thinning multiplier",
    description: "Maximum feed increase for chip thinning compensation. 2.0 = allow up to 2x feed increase at very light stepovers. Prevents runaway speeds.",
    group      : "preferences",
    type       : "number",
    value      : 1.5,
    scope      : "post"
  },
  adaptiveDepthFeedAdjust: {
    title      : "Adjust feed for axial depth",
    description: "Reduce feed when axial depth exceeds optimal range for tool. Deeper cuts with controlled radial = OK, but extreme depths need feed reduction.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  finishingStickoutTolerance: {
    title      : "Finishing stickout tolerance ratio",
    description: "For finishing operations, allow higher stickout before reducing feed (lighter cuts). Typically 1.5x the roughing tolerance.",
    group      : "preferences",
    type       : "number",
    value      : 6.0,
    scope      : "post"
  },
  roughingOptimalWOC: {
    title      : "Roughing optimal WOC (%)",
    description: "Optimal width of cut for roughing as % of tool diameter. Feeds are optimized around this value. Typical adaptive: 10-25%.",
    group      : "preferences",
    type       : "integer",
    range      : [5, 50],
    value      : 15,
    scope      : "post"
  },
  finishingMaxWOC: {
    title      : "Finishing max WOC (%)",
    description: "Maximum width of cut for finishing operations as % of tool diameter. Exceeding this triggers feed reduction for surface quality.",
    group      : "preferences",
    type       : "integer",
    range      : [5, 100],
    value      : 35,
    scope      : "post"
  },
  // PRISM Dynamic Feed Adjustment for 3D Adaptive
  useDynamicDepthFeed: {
    title      : "Use dynamic depth feed adjustment",
    description: "For 3D adaptive toolpaths: automatically INCREASE feedrate when cutting shallow (near stock top) and maintain feed at full depth. This is the KEY to fast adaptive machining - lighter cuts can go faster!",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  dynamicDepthMaxIncrease: {
    title      : "Maximum dynamic feed increase (%)",
    description: "Maximum feed increase when cutting at shallow depths. 150 = allow up to 50% faster at shallow cuts. Higher = more aggressive.",
    group      : "preferences",
    type       : "integer",
    range      : [100, 200],
    value      : 150,
    scope      : "post"
  },
  adaptiveBaseFeed: {
    title      : "Adaptive base feedrate (0=use programmed)",
    description: "Base feedrate for adaptive toolpaths. If 0, uses the programmed feed from Fusion. Set this to your optimal full-depth feed, then dynamic adjustment will INCREASE feed at lighter cuts.",
    group      : "preferences",
    type       : "number",
    value      : 0,
    scope      : "post"
  },

  // =============================================================================
  // PRISM MANUFACTURING INTELLIGENCE v9.0 - UNIT SYSTEM
  // =============================================================================
  // =============================================================================
  // PRISM MANUFACTURING INTELLIGENCE - UNIT SYSTEM & GLOBAL SETTINGS
  // =============================================================================
  // Master controls for PRISM intelligent machining system
  // Unit conversions applied throughout all calculations
  // =============================================================================

  prismApplyCalculations: {
    title      : "Apply PRISM Calculations",
    description: "How should PRISM adjust your speeds and feeds? SMART is recommended — limits changes to +/-30% of your Fusion values. ADVISORY shows suggestions in comments only.",
    group      : "prismOptimization",
    type       : "enum",
    values     : [
      {title: "Advisory Only (Comments)", id: "advisory"},
      {title: "Override Speed (RPM) Only", id: "speed_only"},
      {title: "Override Feed (F) Only", id: "feed_only"},
      {title: "Override Both S and F", id: "both"},
      {title: "Smart Override (+/-30% limit)", id: "smart"}
    ],
    value      : "smart",
    scope      : "post"
  },
  prismEnableIntelligence: {
    title      : "Enable PRISM Intelligence",
    description: "Master switch for PRISM material-aware speed/feed optimization. Disable to use Fusion values only.",
    group      : "prismOptimization",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  prismUnitSystem: {
    title      : "PRISM Unit System",
    description: "Select units for PRISM inputs and G-code output. Affects speeds (SFM vs m/min), feeds (IPM vs mm/min), and depths.",
    group      : "prismOptimization",
    type       : "enum",
    values     : [
      {title: "Inch (SFM, IPM, IPR)", id: "inch"},
      {title: "Metric (m/min, mm/min, mm/rev)", id: "metric"}
    ],
    value      : "inch",
    scope      : "post"
  },

  prismOutputDetail: {
    title      : "PRISM Output Detail",
    description: "How much detail to show in G-code comments.",
    group      : "prismOptimization",
    type       : "enum",
    values     : [
      {title: "None", id: "none"},
      {title: "Minimal", id: "minimal"},
      {title: "Standard", id: "standard"},
      {title: "Detailed", id: "detailed"},
      {title: "Debug", id: "debug"}
    ],
    value      : "standard",
    scope      : "post"
  },
  prismShowSuggestions: {
    title      : "Show Speed-Up Suggestions",
    description: "Display suggestions when PRISM calculates higher safe values than programmed.",
    group      : "prismOptimization",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  prismShowWarnings: {
    title      : "Show PRISM Warnings",
    description: "Display warnings for out-of-spec conditions.",
    group      : "prismOptimization",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  prismSpeedDisplay: {
    title      : "Speed Display Format",
    description: "How to show cutting speed in comments.",
    group      : "prismOptimization",
    type       : "enum",
    values     : [
      {title: "SFM (Surface Feet per Minute)", id: "sfm"},
      {title: "m/min (Meters per Minute)", id: "mpm"},
      {title: "Both SFM and m/min", id: "both"}
    ],
    value      : "sfm",
    scope      : "post"
  },
  prismFeedDisplay: {
    title      : "Feed Display Format",
    description: "How to show feed rate in comments.",
    group      : "prismOptimization",
    type       : "enum",
    values     : [
      {title: "IPM (Inches per Minute)", id: "ipm"},
      {title: "mm/min (Millimeters per Minute)", id: "mmpm"},
      {title: "IPR / mm/rev (Per Revolution)", id: "per_rev"},
      {title: "IPT / mm/tooth (Per Tooth)", id: "per_tooth"}
    ],
    value      : "ipm",
    scope      : "post"
  },
  prismDepthDisplay: {
    title      : "Depth Display Format",
    description: "How to show depths of cut in comments.",
    group      : "prismOptimization",
    type       : "enum",
    values     : [
      {title: "Inches", id: "inch"},
      {title: "Millimeters", id: "mm"}
    ],
    value      : "inch",
    scope      : "post"
  },
  prismForceDisplay: {
    title      : "Force Display Format",
    description: "How to show cutting forces in comments.",
    group      : "prismOptimization",
    type       : "enum",
    values     : [
      {title: "Newtons (N)", id: "N"},
      {title: "Pounds-force (lbf)", id: "lbf"},
      {title: "Kilograms-force (kgf)", id: "kgf"}
    ],
    value      : "lbf",
    scope      : "post"
  },
  prismPowerDisplay: {
    title      : "Power Display Format",
    description: "How to show spindle power in comments.",
    group      : "prismOptimization",
    type       : "enum",
    values     : [
      {title: "Horsepower (HP)", id: "hp"},
      {title: "Kilowatts (kW)", id: "kw"}
    ],
    value      : "hp",
    scope      : "post"
  },

  // ===========================================================================
  // PRISM v10.5 - LIGHTS-OUT PRODUCTION FEATURES
  // ===========================================================================
  prismEnableSisterTools: {
    title      : "Enable Sister Tool Support",
    description: "Output sister tool info for lights-out production (T1->T21, etc.).",
    group      : "prismLightsOut",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  prismSisterToolOffset: {
    title      : "Sister Tool Offset",
    description: "Tool number offset for sister tools (20 = T1 backs up to T21).",
    group      : "prismLightsOut",
    type       : "integer",
    value      : 20,
    scope      : "post"
  },
  prismToolLifeMinutes: {
    title      : "Tool Life (minutes)",
    description: "Estimated minutes before switching to sister tool.",
    group      : "prismLightsOut",
    type       : "integer",
    value      : 45,
    scope      : "post"
  },
  prismEnableToolBreakCheck: {
    title      : "Enable Tool Break Detection",
    description: "Add tool break check after drilling/tapping operations.",
    group      : "prismLightsOut",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  prismToolBreakCheckOps: {
    title      : "Check After Operations",
    description: "Which operations trigger tool break check.",
    group      : "prismLightsOut",
    type       : "enum",
    values     : [
      {title: "Drilling & Tapping", id: "drill_tap"},
      {title: "All Holes", id: "holes"},
      {title: "Small Tools (<6mm)", id: "small"},
      {title: "All Operations", id: "all"}
    ],
    value      : "drill_tap",
    scope      : "post"
  },
  prismToolBreakTolerance: {
    title      : "Break Tolerance (mm)",
    description: "Tool length change threshold to detect breakage.",
    group      : "prismLightsOut",
    type       : "number",
    value      : 1.0,
    scope      : "post"
  },
  prismToolBreakSubprogram: {
    title      : "Break Check Subprogram",
    description: "Subprogram number for break check (0=comment only, requires O9800).",
    group      : "prismLightsOut",
    type       : "integer",
    value      : 9800,
    scope      : "post"
  },
  prismUseZRetractProtection: {
    title      : "Z-Retract Protection (M90/M91)",
    description: "Enable M90 before retracts to prevent accidental Z-down moves. M91 cancels after safe retract. WARNING: M90/M91 are non-standard M-codes — verify your Hurco WinMax version supports them before enabling. On some controls M90=mirror cancel.",
    group      : "prismLightsOut",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },

  // =============================================================================
  // PRISM v10.8 - DRILLING MULTIPLIER EXCLUSION CONTROLS
  // =============================================================================
  // Controls whether Speed% and Feed% multipliers apply to drilling operations.
  // Drilling operations typically use Fusion's programmed feeds calculated by
  // the Fusion drill cycle which already accounts for material and tool type.
  // Applying milling-oriented multipliers can result in incorrect feeds.
  // =============================================================================
  
  prismExcludeDrillingFromMultipliers: {
    title      : "Exclude Drilling from Multipliers",
    description: "When ON, drilling/tapping/reaming/boring operations use Fusion's programmed feeds WITHOUT applying the Speed% and Feed% multipliers. The multipliers still apply to milling operations. Default: ON (recommended).",
    group      : "prismDrilling",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  
  prismDrillingExclusionScope: {
    title      : "Drilling Exclusion Scope",
    description: "Which drilling operations should bypass the multipliers when 'Exclude Drilling' is ON.",
    group      : "prismDrilling",
    type       : "enum",
    values     : [
      {title: "All Drilling/Tapping/Boring/Reaming", id: "all"},
      {title: "Canned Cycles Only (G81-G89)", id: "canned_only"},
      {title: "Drill/Tap Tools Only", id: "drill_tap_tools"},
      {title: "Deep Drilling Only (G83)", id: "deep_only"}
    ],
    value      : "all",
    scope      : "post"
  },



  // =============================================================================
  // PRISM MANUFACTURING INTELLIGENCE v9.0 - 24 TOOL POCKETS
  // =============================================================================

  // ===========================================================================
  // TOOL POCKET 1 (T1)
  // ===========================================================================
  prismT1Material: {
    title      : "T1: Tool Material",
    description: "Tool substrate.",
    group      : "prismPocket01",
    type       : "enum",
    values     : TOOL_MATERIAL_VALUES,
    value      : "carbide",
    scope      : "post"
  },
  prismT1Coating: {
    title      : "T1: Coating",
    description: "Tool coating.",
    group      : "prismPocket01",
    type       : "enum",
    values     : COATING_VALUES,
    value      : "tialn",
    scope      : "post"
  },
  prismT1Brand: {
    title      : "T1: Brand",
    description: "Tool manufacturer.",
    group      : "prismPocket01",
    type       : "enum",
    values     : BRAND_VALUES,
    value      : "generic",
    scope      : "post"
  },
  prismT1HolderType: {
    title      : "T1: Holder Type",
    description: "Tool holder style.",
    group      : "prismPocket01",
    type       : "enum",
    values     : HOLDER_TYPE_VALUES,
    value      : "er_collet",
    scope      : "post"
  },
  prismT1HolderExtension: {
    title      : "T1: Holder Extension (in)",
    description: "Holder projection from spindle face. For extended arbors, enter total length. 0=auto from tool body.",
    group      : "prismPocket01",
    type       : "number",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  prismT1Condition: {
    title      : "T1: Condition",
    description: "Tool wear state.",
    group      : "prismPocket01",
    type       : "enum",
    values     : [
      {title: "New", id: "new"},
      {title: "Good", id: "good"},
      {title: "Worn", id: "worn"},
      {title: "Regrind", id: "regrind"}
    ],
    value      : "new",
    scope      : "post"
  },
  prismT1SpeedPct: {
    title      : "T1: Speed %",
    description: "Speed multiplier (100=calculated).",
    group      : "prismPocket01",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT1FeedPct: {
    title      : "T1: Feed %",
    description: "Feed multiplier (100=calculated).",
    group      : "prismPocket01",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT1ApplyMultipliersTo: {
    title      : "T1: Apply Multipliers To",
    description: "Controls when Speed%/Feed% multipliers are applied. 'Milling Only' = skip drilling/tapping (recommended). 'All' = always apply. 'Off' = never apply (use Fusion feeds).",
    group      : "prismPocket01",
    type       : "enum",
    values     : [
      {title: "Milling Only (Skip Drilling)", id: "milling_only"},
      {title: "All Operations", id: "all"},
      {title: "Off (Use Fusion Programmed)", id: "off"}
    ],
    value      : "milling_only",
    scope      : "post"
  },
  prismT1Indexable: {
    title      : "T1: Indexable Insert Tool",
    description: "Enable indexable insert parameters for this tool (face mills, indexable endmills, high-feed, etc).",
    group      : "prismPocket01",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismT1InsertStyle: {
    title      : "T1: Insert Cutter Style",
    description: "Type of indexable cutter.",
    group      : "prismPocket01",
    type       : "enum",
    values     : [
      {title: "Face Mill (45 deg lead)", id: "face_mill_45"},
      {title: "Face Mill (90 deg lead)", id: "face_mill_90"},
      {title: "High Feed Mill (10-17 deg)", id: "high_feed"},
      {title: "Shoulder/Square Mill (90 deg)", id: "shoulder_90"},
      {title: "Button Cutter (Round)", id: "button"},
      {title: "Indexable Ball", id: "ball"},
      {title: "Indexable Drill", id: "drill"},
      {title: "Chamfer Mill", id: "chamfer"},
      {title: "Slot Mill", id: "slot"},
      {title: "Copy Mill / 3D", id: "copy"}
    ],
    value      : "face_mill_45",
    scope      : "post"
  },
  prismT1LeadAngle: {
    title      : "T1: Lead/Entry Angle",
    description: "Insert approach angle. Affects chip thickness and axial force. High-feed uses 10-17 deg.",
    group      : "prismPocket01",
    type       : "enum",
    values     : [
      {title: "90 deg (Square shoulder)", id: "90"},
      {title: "75 deg", id: "75"},
      {title: "65 deg", id: "65"},
      {title: "60 deg", id: "60"},
      {title: "45 deg (Common face mill)", id: "45"},
      {title: "30 deg", id: "30"},
      {title: "20 deg", id: "20"},
      {title: "17 deg (High feed)", id: "17"},
      {title: "15 deg", id: "15"},
      {title: "12 deg (High feed)", id: "12"},
      {title: "10 deg (High feed)", id: "10"}
    ],
    value      : "45",
    scope      : "post"
  },
  prismT1InsertGrade: {
    title      : "T1: Insert Grade",
    description: "Carbide grade - select based on manufacturer or use generic ISO grades.",
    group      : "prismPocket01",
    type       : "enum",
    values     : INSERT_GRADE_VALUES,
    value      : "P20",
    scope      : "post"
  },
  prismT1InsertNoseR: {
    title      : "T1: Insert Nose Radius",
    description: "Corner radius in mm. Enter your insert nose radius (e.g. 0.4, 0.8, 1.2). Larger = higher feed possible, rougher finish.",
    group      : "prismPocket01",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  prismT1Coolant: {
    title      : "T1: Coolant Strategy",
    description: "Coolant output for this tool. Override per operation or use tool default.",
    group      : "prismPocket01",
    type       : "enum",
    values     : [
      {title: "Use Fusion Setting", id: "fusion"},
      {title: "Flood (M8)", id: "flood"},
      {title: "Mist (M7)", id: "mist"},
      {title: "Flood + Mist (M7 M8)", id: "flood_mist"},
      {title: "Through Spindle (M88)", id: "thru_spindle"},
      {title: "Through Spindle HP", id: "thru_spindle_hp"},
      {title: "Air Blast (M51)", id: "air"},
      {title: "Air + Mist (MQL)", id: "mql"},
      {title: "Vacuum / Dust Collection", id: "vacuum"},
      {title: "Off / Dry (M9)", id: "off"}
    ],
    value      : "fusion",
    scope      : "post"
  },
  prismT1Strategy: {
    title      : "T1: Machining Strategy",
    description: "Unified machining strategy. ROUGHING: HEM/HSM/Aggressive/Balanced/Conservative. FINISHING: Surface/Accuracy/Balanced/Productivity. Auto=detect from Fusion operation type.",
    group      : "prismPocket01",
    type       : "enum",
        values     : [
      {title: "Auto-Detect", id: "auto"},
      {title: "=== ROUGHING ===", id: "_rough_header"},
      {title: "HEM - High Efficiency Milling", id: "hem"},
      {title: "HSM - High Speed Machining", id: "hsm"},
      {title: "Aggressive (Max MRR)", id: "aggressive"},
      {title: "Balanced Roughing", id: "balanced"},
      {title: "Conservative (Tool Life)", id: "conservative"},
      {title: "=== FINISHING ===", id: "_finish_header"},
      {title: "Finish - Surface Quality", id: "finish"},
      {title: "Finish - Accuracy Priority", id: "accuracy"},
      {title: "Finish - Balanced", id: "finish_balanced"},
      {title: "Finish - Productivity", id: "finish_productivity"},
      {title: "=== OTHER ===", id: "_other_header"},
      {title: "Off (Use Programmed)", id: "off"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismT1MaxChipThinMult: {
    title      : "T1: Max Chip Thinning Mult",
    description: "Maximum feed increase from chip thinning. At 10% WOC theoretical is 3.2x. Cap for safety. Overrides global setting.",
    group      : "prismPocket01",
    type       : "number",
    range      : [1.0, 4.0],
    value      : 2.5,
    scope      : "post"
  },
  prismT1DeflectionLimit: {
    title      : "T1: Max Deflection (in)",
    description: "Feed reduced when calculated deflection exceeds this. 0.001-0.002 for finish, 0.003-0.005 for rough.",
    group      : "prismPocket01",
    type       : "number",
    range      : [0.0005, 0.010],
    value      : 0.002,
    scope      : "post"
  },
  prismT1TargetRa: {
    title      : "T1: Target Ra (uin)",
    description: "Target surface roughness in microinches. 16=fine finish, 32=good, 63=standard, 125=rough finish.",
    group      : "prismPocket01",
    type       : "enum",
    values     : [
      {title: "8 uin (Mirror/Lapped)", id: "8"},
      {title: "16 uin (Fine Finish)", id: "16"},
      {title: "32 uin (Good Finish)", id: "32"},
      {title: "63 uin (Standard)", id: "63"},
      {title: "125 uin (Semi-Finish)", id: "125"},
      {title: "250 uin (Roughing)", id: "250"},
      {title: "500 uin (Adaptive/HEM)", id: "500"},
      {title: "999 uin (Ignore Finish)", id: "999"}
    ],
    value      : "32",
    scope      : "post"
  },
  prismT1Aggressiveness: {
    title      : "T1: Aggressiveness (1-8)",
    description: "How hard should PRISM push? 1 = safest (longest tool life). 5 = balanced. 8 = fastest (maximum material removal). Start at 5 if unsure.",
    group      : "prismPocket01",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },
  // ===========================================================================
  // TOOL POCKET 2 (T2)
  // ===========================================================================
  prismT2Material: {
    title      : "T2: Tool Material",
    description: "Tool substrate.",
    group      : "prismPocket02",
    type       : "enum",
    values     : TOOL_MATERIAL_VALUES,
    value      : "carbide",
    scope      : "post"
  },
  prismT2Coating: {
    title      : "T2: Coating",
    description: "Tool coating.",
    group      : "prismPocket02",
    type       : "enum",
    values     : COATING_VALUES,
    value      : "tialn",
    scope      : "post"
  },
  prismT2Brand: {
    title      : "T2: Brand",
    description: "Tool manufacturer.",
    group      : "prismPocket02",
    type       : "enum",
    values     : BRAND_VALUES,
    value      : "generic",
    scope      : "post"
  },
  prismT2HolderType: {
    title      : "T2: Holder Type",
    description: "Tool holder style.",
    group      : "prismPocket02",
    type       : "enum",
    values     : HOLDER_TYPE_VALUES,
    value      : "er_collet",
    scope      : "post"
  },
  prismT2HolderExtension: {
    title      : "T2: Holder Extension (in)",
    description: "Holder projection from spindle face. For extended arbors, enter total length. 0=auto from tool body.",
    group      : "prismPocket02",
    type       : "number",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  prismT2Condition: {
    title      : "T2: Condition",
    description: "Tool wear state.",
    group      : "prismPocket02",
    type       : "enum",
    values     : [
      {title: "New", id: "new"},
      {title: "Good", id: "good"},
      {title: "Worn", id: "worn"},
      {title: "Regrind", id: "regrind"}
    ],
    value      : "new",
    scope      : "post"
  },
  prismT2SpeedPct: {
    title      : "T2: Speed %",
    description: "Speed multiplier (100=calculated).",
    group      : "prismPocket02",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT2FeedPct: {
    title      : "T2: Feed %",
    description: "Feed multiplier (100=calculated).",
    group      : "prismPocket02",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT2ApplyMultipliersTo: {
    title      : "T2: Apply Multipliers To",
    description: "Controls when Speed%/Feed% multipliers are applied. 'Milling Only' = skip drilling/tapping (recommended). 'All' = always apply. 'Off' = never apply (use Fusion feeds).",
    group      : "prismPocket02",
    type       : "enum",
    values     : [
      {title: "Milling Only (Skip Drilling)", id: "milling_only"},
      {title: "All Operations", id: "all"},
      {title: "Off (Use Fusion Programmed)", id: "off"}
    ],
    value      : "milling_only",
    scope      : "post"
  },
  prismT2Indexable: {
    title      : "T2: Indexable Insert Tool",
    description: "Enable indexable insert parameters for this tool (face mills, indexable endmills, high-feed, etc).",
    group      : "prismPocket02",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismT2InsertStyle: {
    title      : "T2: Insert Cutter Style",
    description: "Type of indexable cutter.",
    group      : "prismPocket02",
    type       : "enum",
    values     : [
      {title: "Face Mill (45 deg lead)", id: "face_mill_45"},
      {title: "Face Mill (90 deg lead)", id: "face_mill_90"},
      {title: "High Feed Mill (10-17 deg)", id: "high_feed"},
      {title: "Shoulder/Square Mill (90 deg)", id: "shoulder_90"},
      {title: "Button Cutter (Round)", id: "button"},
      {title: "Indexable Ball", id: "ball"},
      {title: "Indexable Drill", id: "drill"},
      {title: "Chamfer Mill", id: "chamfer"},
      {title: "Slot Mill", id: "slot"},
      {title: "Copy Mill / 3D", id: "copy"}
    ],
    value      : "face_mill_45",
    scope      : "post"
  },
  prismT2LeadAngle: {
    title      : "T2: Lead/Entry Angle",
    description: "Insert approach angle. Affects chip thickness and axial force. High-feed uses 10-17 deg.",
    group      : "prismPocket02",
    type       : "enum",
    values     : [
      {title: "90 deg (Square shoulder)", id: "90"},
      {title: "75 deg", id: "75"},
      {title: "65 deg", id: "65"},
      {title: "60 deg", id: "60"},
      {title: "45 deg (Common face mill)", id: "45"},
      {title: "30 deg", id: "30"},
      {title: "20 deg", id: "20"},
      {title: "17 deg (High feed)", id: "17"},
      {title: "15 deg", id: "15"},
      {title: "12 deg (High feed)", id: "12"},
      {title: "10 deg (High feed)", id: "10"}
    ],
    value      : "45",
    scope      : "post"
  },
  prismT2InsertGrade: {
    title      : "T2: Insert Grade",
    description: "Carbide grade - select based on manufacturer or use generic ISO grades.",
    group      : "prismPocket02",
    type       : "enum",
    values     : INSERT_GRADE_VALUES,
    value      : "P20",
    scope      : "post"
  },
  prismT2InsertNoseR: {
    title      : "T2: Insert Nose Radius",
    description: "Corner radius in mm. Enter your insert nose radius (e.g. 0.4, 0.8, 1.2). Larger = higher feed possible, rougher finish.",
    group      : "prismPocket02",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  prismT2Coolant: {
    title      : "T2: Coolant Strategy",
    description: "Coolant output for this tool. Override per operation or use tool default.",
    group      : "prismPocket02",
    type       : "enum",
    values     : [
      {title: "Use Fusion Setting", id: "fusion"},
      {title: "Flood (M8)", id: "flood"},
      {title: "Mist (M7)", id: "mist"},
      {title: "Flood + Mist (M7 M8)", id: "flood_mist"},
      {title: "Through Spindle (M88)", id: "thru_spindle"},
      {title: "Through Spindle HP", id: "thru_spindle_hp"},
      {title: "Air Blast (M51)", id: "air"},
      {title: "Air + Mist (MQL)", id: "mql"},
      {title: "Vacuum / Dust Collection", id: "vacuum"},
      {title: "Off / Dry (M9)", id: "off"}
    ],
    value      : "fusion",
    scope      : "post"
  },
  prismT2Strategy: {
    title      : "T2: Machining Strategy",
    description: "Unified machining strategy. ROUGHING: HEM/HSM/Aggressive/Balanced/Conservative. FINISHING: Surface/Accuracy/Balanced/Productivity. Auto=detect from Fusion operation type.",
    group      : "prismPocket02",
    type       : "enum",
        values     : [
      {title: "Auto-Detect", id: "auto"},
      {title: "=== ROUGHING ===", id: "_rough_header"},
      {title: "HEM - High Efficiency Milling", id: "hem"},
      {title: "HSM - High Speed Machining", id: "hsm"},
      {title: "Aggressive (Max MRR)", id: "aggressive"},
      {title: "Balanced Roughing", id: "balanced"},
      {title: "Conservative (Tool Life)", id: "conservative"},
      {title: "=== FINISHING ===", id: "_finish_header"},
      {title: "Finish - Surface Quality", id: "finish"},
      {title: "Finish - Accuracy Priority", id: "accuracy"},
      {title: "Finish - Balanced", id: "finish_balanced"},
      {title: "Finish - Productivity", id: "finish_productivity"},
      {title: "=== OTHER ===", id: "_other_header"},
      {title: "Off (Use Programmed)", id: "off"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismT2MaxChipThinMult: {
    title      : "T2: Max Chip Thinning Mult",
    description: "Maximum feed increase from chip thinning. At 10% WOC theoretical is 3.2x. Cap for safety. Overrides global setting.",
    group      : "prismPocket02",
    type       : "number",
    range      : [1.0, 4.0],
    value      : 2.5,
    scope      : "post"
  },
  prismT2DeflectionLimit: {
    title      : "T2: Max Deflection (in)",
    description: "Feed reduced when calculated deflection exceeds this. 0.001-0.002 for finish, 0.003-0.005 for rough.",
    group      : "prismPocket02",
    type       : "number",
    range      : [0.0005, 0.010],
    value      : 0.002,
    scope      : "post"
  },
  prismT2TargetRa: {
    title      : "T2: Target Ra (uin)",
    description: "Target surface roughness in microinches. 16=fine finish, 32=good, 63=standard, 125=rough finish.",
    group      : "prismPocket02",
    type       : "enum",
    values     : [
      {title: "8 uin (Mirror/Lapped)", id: "8"},
      {title: "16 uin (Fine Finish)", id: "16"},
      {title: "32 uin (Good Finish)", id: "32"},
      {title: "63 uin (Standard)", id: "63"},
      {title: "125 uin (Semi-Finish)", id: "125"},
      {title: "250 uin (Roughing)", id: "250"},
      {title: "500 uin (Adaptive/HEM)", id: "500"},
      {title: "999 uin (Ignore Finish)", id: "999"}
    ],
    value      : "32",
    scope      : "post"
  },
  prismT2Aggressiveness: {
    title      : "T2: Aggressiveness (1-8)",
    description: "How hard should PRISM push? 1 = safest (longest tool life). 5 = balanced. 8 = fastest (maximum material removal). Start at 5 if unsure.",
    group      : "prismPocket02",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },
  // ===========================================================================
  // TOOL POCKET 3 (T3)
  // ===========================================================================
  prismT3Material: {
    title      : "T3: Tool Material",
    description: "Tool substrate.",
    group      : "prismPocket03",
    type       : "enum",
    values     : TOOL_MATERIAL_VALUES,
    value      : "carbide",
    scope      : "post"
  },
  prismT3Coating: {
    title      : "T3: Coating",
    description: "Tool coating.",
    group      : "prismPocket03",
    type       : "enum",
    values     : COATING_VALUES,
    value      : "tialn",
    scope      : "post"
  },
  prismT3Brand: {
    title      : "T3: Brand",
    description: "Tool manufacturer.",
    group      : "prismPocket03",
    type       : "enum",
    values     : BRAND_VALUES,
    value      : "generic",
    scope      : "post"
  },
  prismT3HolderType: {
    title      : "T3: Holder Type",
    description: "Tool holder style.",
    group      : "prismPocket03",
    type       : "enum",
    values     : HOLDER_TYPE_VALUES,
    value      : "er_collet",
    scope      : "post"
  },
  prismT3HolderExtension: {
    title      : "T3: Holder Extension (in)",
    description: "Holder projection from spindle face. For extended arbors, enter total length. 0=auto from tool body.",
    group      : "prismPocket03",
    type       : "number",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  prismT3Condition: {
    title      : "T3: Condition",
    description: "Tool wear state.",
    group      : "prismPocket03",
    type       : "enum",
    values     : [
      {title: "New", id: "new"},
      {title: "Good", id: "good"},
      {title: "Worn", id: "worn"},
      {title: "Regrind", id: "regrind"}
    ],
    value      : "new",
    scope      : "post"
  },
  prismT3SpeedPct: {
    title      : "T3: Speed %",
    description: "Speed multiplier (100=calculated).",
    group      : "prismPocket03",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT3FeedPct: {
    title      : "T3: Feed %",
    description: "Feed multiplier (100=calculated).",
    group      : "prismPocket03",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT3ApplyMultipliersTo: {
    title      : "T3: Apply Multipliers To",
    description: "Controls when Speed%/Feed% multipliers are applied. 'Milling Only' = skip drilling/tapping (recommended). 'All' = always apply. 'Off' = never apply (use Fusion feeds).",
    group      : "prismPocket03",
    type       : "enum",
    values     : [
      {title: "Milling Only (Skip Drilling)", id: "milling_only"},
      {title: "All Operations", id: "all"},
      {title: "Off (Use Fusion Programmed)", id: "off"}
    ],
    value      : "milling_only",
    scope      : "post"
  },
  prismT3Indexable: {
    title      : "T3: Indexable Insert Tool",
    description: "Enable indexable insert parameters for this tool (face mills, indexable endmills, high-feed, etc).",
    group      : "prismPocket03",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismT3InsertStyle: {
    title      : "T3: Insert Cutter Style",
    description: "Type of indexable cutter.",
    group      : "prismPocket03",
    type       : "enum",
    values     : [
      {title: "Face Mill (45 deg lead)", id: "face_mill_45"},
      {title: "Face Mill (90 deg lead)", id: "face_mill_90"},
      {title: "High Feed Mill (10-17 deg)", id: "high_feed"},
      {title: "Shoulder/Square Mill (90 deg)", id: "shoulder_90"},
      {title: "Button Cutter (Round)", id: "button"},
      {title: "Indexable Ball", id: "ball"},
      {title: "Indexable Drill", id: "drill"},
      {title: "Chamfer Mill", id: "chamfer"},
      {title: "Slot Mill", id: "slot"},
      {title: "Copy Mill / 3D", id: "copy"}
    ],
    value      : "face_mill_45",
    scope      : "post"
  },
  prismT3LeadAngle: {
    title      : "T3: Lead/Entry Angle",
    description: "Insert approach angle. Affects chip thickness and axial force. High-feed uses 10-17 deg.",
    group      : "prismPocket03",
    type       : "enum",
    values     : [
      {title: "90 deg (Square shoulder)", id: "90"},
      {title: "75 deg", id: "75"},
      {title: "65 deg", id: "65"},
      {title: "60 deg", id: "60"},
      {title: "45 deg (Common face mill)", id: "45"},
      {title: "30 deg", id: "30"},
      {title: "20 deg", id: "20"},
      {title: "17 deg (High feed)", id: "17"},
      {title: "15 deg", id: "15"},
      {title: "12 deg (High feed)", id: "12"},
      {title: "10 deg (High feed)", id: "10"}
    ],
    value      : "45",
    scope      : "post"
  },
  prismT3InsertGrade: {
    title      : "T3: Insert Grade",
    description: "Carbide grade - select based on manufacturer or use generic ISO grades.",
    group      : "prismPocket03",
    type       : "enum",
    values     : INSERT_GRADE_VALUES,
    value      : "P20",
    scope      : "post"
  },
  prismT3InsertNoseR: {
    title      : "T3: Insert Nose Radius",
    description: "Corner radius in mm. Enter your insert nose radius (e.g. 0.4, 0.8, 1.2). Larger = higher feed possible, rougher finish.",
    group      : "prismPocket03",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  prismT3Coolant: {
    title      : "T3: Coolant Strategy",
    description: "Coolant output for this tool. Override per operation or use tool default.",
    group      : "prismPocket03",
    type       : "enum",
    values     : [
      {title: "Use Fusion Setting", id: "fusion"},
      {title: "Flood (M8)", id: "flood"},
      {title: "Mist (M7)", id: "mist"},
      {title: "Flood + Mist (M7 M8)", id: "flood_mist"},
      {title: "Through Spindle (M88)", id: "thru_spindle"},
      {title: "Through Spindle HP", id: "thru_spindle_hp"},
      {title: "Air Blast (M51)", id: "air"},
      {title: "Air + Mist (MQL)", id: "mql"},
      {title: "Vacuum / Dust Collection", id: "vacuum"},
      {title: "Off / Dry (M9)", id: "off"}
    ],
    value      : "fusion",
    scope      : "post"
  },
  prismT3Strategy: {
    title      : "T3: Machining Strategy",
    description: "Unified machining strategy. ROUGHING: HEM/HSM/Aggressive/Balanced/Conservative. FINISHING: Surface/Accuracy/Balanced/Productivity. Auto=detect from Fusion operation type.",
    group      : "prismPocket03",
    type       : "enum",
        values     : [
      {title: "Auto-Detect", id: "auto"},
      {title: "=== ROUGHING ===", id: "_rough_header"},
      {title: "HEM - High Efficiency Milling", id: "hem"},
      {title: "HSM - High Speed Machining", id: "hsm"},
      {title: "Aggressive (Max MRR)", id: "aggressive"},
      {title: "Balanced Roughing", id: "balanced"},
      {title: "Conservative (Tool Life)", id: "conservative"},
      {title: "=== FINISHING ===", id: "_finish_header"},
      {title: "Finish - Surface Quality", id: "finish"},
      {title: "Finish - Accuracy Priority", id: "accuracy"},
      {title: "Finish - Balanced", id: "finish_balanced"},
      {title: "Finish - Productivity", id: "finish_productivity"},
      {title: "=== OTHER ===", id: "_other_header"},
      {title: "Off (Use Programmed)", id: "off"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismT3MaxChipThinMult: {
    title      : "T3: Max Chip Thinning Mult",
    description: "Maximum feed increase from chip thinning. At 10% WOC theoretical is 3.2x. Cap for safety. Overrides global setting.",
    group      : "prismPocket03",
    type       : "number",
    range      : [1.0, 4.0],
    value      : 2.5,
    scope      : "post"
  },
  prismT3DeflectionLimit: {
    title      : "T3: Max Deflection (in)",
    description: "Feed reduced when calculated deflection exceeds this. 0.001-0.002 for finish, 0.003-0.005 for rough.",
    group      : "prismPocket03",
    type       : "number",
    range      : [0.0005, 0.010],
    value      : 0.002,
    scope      : "post"
  },
  prismT3TargetRa: {
    title      : "T3: Target Ra (uin)",
    description: "Target surface roughness in microinches. 16=fine finish, 32=good, 63=standard, 125=rough finish.",
    group      : "prismPocket03",
    type       : "enum",
    values     : [
      {title: "8 uin (Mirror/Lapped)", id: "8"},
      {title: "16 uin (Fine Finish)", id: "16"},
      {title: "32 uin (Good Finish)", id: "32"},
      {title: "63 uin (Standard)", id: "63"},
      {title: "125 uin (Semi-Finish)", id: "125"},
      {title: "250 uin (Roughing)", id: "250"},
      {title: "500 uin (Adaptive/HEM)", id: "500"},
      {title: "999 uin (Ignore Finish)", id: "999"}
    ],
    value      : "32",
    scope      : "post"
  },
  prismT3Aggressiveness: {
    title      : "T3: Aggressiveness (1-8)",
    description: "How hard should PRISM push? 1 = safest (longest tool life). 5 = balanced. 8 = fastest (maximum material removal). Start at 5 if unsure.",
    group      : "prismPocket03",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },
  // ===========================================================================
  // TOOL POCKET 4 (T4)
  // ===========================================================================
  prismT4Material: {
    title      : "T4: Tool Material",
    description: "Tool substrate.",
    group      : "prismPocket04",
    type       : "enum",
    values     : TOOL_MATERIAL_VALUES,
    value      : "carbide",
    scope      : "post"
  },
  prismT4Coating: {
    title      : "T4: Coating",
    description: "Tool coating.",
    group      : "prismPocket04",
    type       : "enum",
    values     : COATING_VALUES,
    value      : "tialn",
    scope      : "post"
  },
  prismT4Brand: {
    title      : "T4: Brand",
    description: "Tool manufacturer.",
    group      : "prismPocket04",
    type       : "enum",
    values     : BRAND_VALUES,
    value      : "generic",
    scope      : "post"
  },
  prismT4HolderType: {
    title      : "T4: Holder Type",
    description: "Tool holder style.",
    group      : "prismPocket04",
    type       : "enum",
    values     : HOLDER_TYPE_VALUES,
    value      : "er_collet",
    scope      : "post"
  },
  prismT4HolderExtension: {
    title      : "T4: Holder Extension (in)",
    description: "Holder projection from spindle face. For extended arbors, enter total length. 0=auto from tool body.",
    group      : "prismPocket04",
    type       : "number",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  prismT4Condition: {
    title      : "T4: Condition",
    description: "Tool wear state.",
    group      : "prismPocket04",
    type       : "enum",
    values     : [
      {title: "New", id: "new"},
      {title: "Good", id: "good"},
      {title: "Worn", id: "worn"},
      {title: "Regrind", id: "regrind"}
    ],
    value      : "new",
    scope      : "post"
  },
  prismT4SpeedPct: {
    title      : "T4: Speed %",
    description: "Speed multiplier (100=calculated).",
    group      : "prismPocket04",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT4FeedPct: {
    title      : "T4: Feed %",
    description: "Feed multiplier (100=calculated).",
    group      : "prismPocket04",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT4ApplyMultipliersTo: {
    title      : "T4: Apply Multipliers To",
    description: "Controls when Speed%/Feed% multipliers are applied. 'Milling Only' = skip drilling/tapping (recommended). 'All' = always apply. 'Off' = never apply (use Fusion feeds).",
    group      : "prismPocket04",
    type       : "enum",
    values     : [
      {title: "Milling Only (Skip Drilling)", id: "milling_only"},
      {title: "All Operations", id: "all"},
      {title: "Off (Use Fusion Programmed)", id: "off"}
    ],
    value      : "milling_only",
    scope      : "post"
  },
  prismT4Indexable: {
    title      : "T4: Indexable Insert Tool",
    description: "Enable indexable insert parameters for this tool (face mills, indexable endmills, high-feed, etc).",
    group      : "prismPocket04",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismT4InsertStyle: {
    title      : "T4: Insert Cutter Style",
    description: "Type of indexable cutter.",
    group      : "prismPocket04",
    type       : "enum",
    values     : [
      {title: "Face Mill (45 deg lead)", id: "face_mill_45"},
      {title: "Face Mill (90 deg lead)", id: "face_mill_90"},
      {title: "High Feed Mill (10-17 deg)", id: "high_feed"},
      {title: "Shoulder/Square Mill (90 deg)", id: "shoulder_90"},
      {title: "Button Cutter (Round)", id: "button"},
      {title: "Indexable Ball", id: "ball"},
      {title: "Indexable Drill", id: "drill"},
      {title: "Chamfer Mill", id: "chamfer"},
      {title: "Slot Mill", id: "slot"},
      {title: "Copy Mill / 3D", id: "copy"}
    ],
    value      : "face_mill_45",
    scope      : "post"
  },
  prismT4LeadAngle: {
    title      : "T4: Lead/Entry Angle",
    description: "Insert approach angle. Affects chip thickness and axial force. High-feed uses 10-17 deg.",
    group      : "prismPocket04",
    type       : "enum",
    values     : [
      {title: "90 deg (Square shoulder)", id: "90"},
      {title: "75 deg", id: "75"},
      {title: "65 deg", id: "65"},
      {title: "60 deg", id: "60"},
      {title: "45 deg (Common face mill)", id: "45"},
      {title: "30 deg", id: "30"},
      {title: "20 deg", id: "20"},
      {title: "17 deg (High feed)", id: "17"},
      {title: "15 deg", id: "15"},
      {title: "12 deg (High feed)", id: "12"},
      {title: "10 deg (High feed)", id: "10"}
    ],
    value      : "45",
    scope      : "post"
  },
  prismT4InsertGrade: {
    title      : "T4: Insert Grade",
    description: "Carbide grade - select based on manufacturer or use generic ISO grades.",
    group      : "prismPocket04",
    type       : "enum",
    values     : INSERT_GRADE_VALUES,
    value      : "P20",
    scope      : "post"
  },
  prismT4InsertNoseR: {
    title      : "T4: Insert Nose Radius",
    description: "Corner radius in mm. Enter your insert nose radius (e.g. 0.4, 0.8, 1.2). Larger = higher feed possible, rougher finish.",
    group      : "prismPocket04",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  prismT4Coolant: {
    title      : "T4: Coolant Strategy",
    description: "Coolant output for this tool. Override per operation or use tool default.",
    group      : "prismPocket04",
    type       : "enum",
    values     : [
      {title: "Use Fusion Setting", id: "fusion"},
      {title: "Flood (M8)", id: "flood"},
      {title: "Mist (M7)", id: "mist"},
      {title: "Flood + Mist (M7 M8)", id: "flood_mist"},
      {title: "Through Spindle (M88)", id: "thru_spindle"},
      {title: "Through Spindle HP", id: "thru_spindle_hp"},
      {title: "Air Blast (M51)", id: "air"},
      {title: "Air + Mist (MQL)", id: "mql"},
      {title: "Vacuum / Dust Collection", id: "vacuum"},
      {title: "Off / Dry (M9)", id: "off"}
    ],
    value      : "fusion",
    scope      : "post"
  },
  prismT4Strategy: {
    title      : "T4: Machining Strategy",
    description: "Unified machining strategy. ROUGHING: HEM/HSM/Aggressive/Balanced/Conservative. FINISHING: Surface/Accuracy/Balanced/Productivity. Auto=detect from Fusion operation type.",
    group      : "prismPocket04",
    type       : "enum",
        values     : [
      {title: "Auto-Detect", id: "auto"},
      {title: "=== ROUGHING ===", id: "_rough_header"},
      {title: "HEM - High Efficiency Milling", id: "hem"},
      {title: "HSM - High Speed Machining", id: "hsm"},
      {title: "Aggressive (Max MRR)", id: "aggressive"},
      {title: "Balanced Roughing", id: "balanced"},
      {title: "Conservative (Tool Life)", id: "conservative"},
      {title: "=== FINISHING ===", id: "_finish_header"},
      {title: "Finish - Surface Quality", id: "finish"},
      {title: "Finish - Accuracy Priority", id: "accuracy"},
      {title: "Finish - Balanced", id: "finish_balanced"},
      {title: "Finish - Productivity", id: "finish_productivity"},
      {title: "=== OTHER ===", id: "_other_header"},
      {title: "Off (Use Programmed)", id: "off"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismT4MaxChipThinMult: {
    title      : "T4: Max Chip Thinning Mult",
    description: "Maximum feed increase from chip thinning. At 10% WOC theoretical is 3.2x. Cap for safety. Overrides global setting.",
    group      : "prismPocket04",
    type       : "number",
    range      : [1.0, 4.0],
    value      : 2.5,
    scope      : "post"
  },
  prismT4DeflectionLimit: {
    title      : "T4: Max Deflection (in)",
    description: "Feed reduced when calculated deflection exceeds this. 0.001-0.002 for finish, 0.003-0.005 for rough.",
    group      : "prismPocket04",
    type       : "number",
    range      : [0.0005, 0.010],
    value      : 0.002,
    scope      : "post"
  },
  prismT4TargetRa: {
    title      : "T4: Target Ra (uin)",
    description: "Target surface roughness in microinches. 16=fine finish, 32=good, 63=standard, 125=rough finish.",
    group      : "prismPocket04",
    type       : "enum",
    values     : [
      {title: "8 uin (Mirror/Lapped)", id: "8"},
      {title: "16 uin (Fine Finish)", id: "16"},
      {title: "32 uin (Good Finish)", id: "32"},
      {title: "63 uin (Standard)", id: "63"},
      {title: "125 uin (Semi-Finish)", id: "125"},
      {title: "250 uin (Roughing)", id: "250"},
      {title: "500 uin (Adaptive/HEM)", id: "500"},
      {title: "999 uin (Ignore Finish)", id: "999"}
    ],
    value      : "32",
    scope      : "post"
  },
  prismT4Aggressiveness: {
    title      : "T4: Aggressiveness (1-8)",
    description: "How hard should PRISM push? 1 = safest (longest tool life). 5 = balanced. 8 = fastest (maximum material removal). Start at 5 if unsure.",
    group      : "prismPocket04",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },
  // ===========================================================================
  // TOOL POCKET 5 (T5)
  // ===========================================================================
  prismT5Material: {
    title      : "T5: Tool Material",
    description: "Tool substrate.",
    group      : "prismPocket05",
    type       : "enum",
    values     : TOOL_MATERIAL_VALUES,
    value      : "carbide",
    scope      : "post"
  },
  prismT5Coating: {
    title      : "T5: Coating",
    description: "Tool coating.",
    group      : "prismPocket05",
    type       : "enum",
    values     : COATING_VALUES,
    value      : "tialn",
    scope      : "post"
  },
  prismT5Brand: {
    title      : "T5: Brand",
    description: "Tool manufacturer.",
    group      : "prismPocket05",
    type       : "enum",
    values     : BRAND_VALUES,
    value      : "generic",
    scope      : "post"
  },
  prismT5HolderType: {
    title      : "T5: Holder Type",
    description: "Tool holder style.",
    group      : "prismPocket05",
    type       : "enum",
    values     : HOLDER_TYPE_VALUES,
    value      : "er_collet",
    scope      : "post"
  },
  prismT5HolderExtension: {
    title      : "T5: Holder Extension (in)",
    description: "Holder projection from spindle face. For extended arbors, enter total length. 0=auto from tool body.",
    group      : "prismPocket05",
    type       : "number",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  prismT5Condition: {
    title      : "T5: Condition",
    description: "Tool wear state.",
    group      : "prismPocket05",
    type       : "enum",
    values     : [
      {title: "New", id: "new"},
      {title: "Good", id: "good"},
      {title: "Worn", id: "worn"},
      {title: "Regrind", id: "regrind"}
    ],
    value      : "new",
    scope      : "post"
  },
  prismT5SpeedPct: {
    title      : "T5: Speed %",
    description: "Speed multiplier (100=calculated).",
    group      : "prismPocket05",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT5FeedPct: {
    title      : "T5: Feed %",
    description: "Feed multiplier (100=calculated).",
    group      : "prismPocket05",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT5ApplyMultipliersTo: {
    title      : "T5: Apply Multipliers To",
    description: "Controls when Speed%/Feed% multipliers are applied. 'Milling Only' = skip drilling/tapping (recommended). 'All' = always apply. 'Off' = never apply (use Fusion feeds).",
    group      : "prismPocket05",
    type       : "enum",
    values     : [
      {title: "Milling Only (Skip Drilling)", id: "milling_only"},
      {title: "All Operations", id: "all"},
      {title: "Off (Use Fusion Programmed)", id: "off"}
    ],
    value      : "milling_only",
    scope      : "post"
  },
  prismT5Indexable: {
    title      : "T5: Indexable Insert Tool",
    description: "Enable indexable insert parameters for this tool (face mills, indexable endmills, high-feed, etc).",
    group      : "prismPocket05",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismT5InsertStyle: {
    title      : "T5: Insert Cutter Style",
    description: "Type of indexable cutter.",
    group      : "prismPocket05",
    type       : "enum",
    values     : [
      {title: "Face Mill (45 deg lead)", id: "face_mill_45"},
      {title: "Face Mill (90 deg lead)", id: "face_mill_90"},
      {title: "High Feed Mill (10-17 deg)", id: "high_feed"},
      {title: "Shoulder/Square Mill (90 deg)", id: "shoulder_90"},
      {title: "Button Cutter (Round)", id: "button"},
      {title: "Indexable Ball", id: "ball"},
      {title: "Indexable Drill", id: "drill"},
      {title: "Chamfer Mill", id: "chamfer"},
      {title: "Slot Mill", id: "slot"},
      {title: "Copy Mill / 3D", id: "copy"}
    ],
    value      : "face_mill_45",
    scope      : "post"
  },
  prismT5LeadAngle: {
    title      : "T5: Lead/Entry Angle",
    description: "Insert approach angle. Affects chip thickness and axial force. High-feed uses 10-17 deg.",
    group      : "prismPocket05",
    type       : "enum",
    values     : [
      {title: "90 deg (Square shoulder)", id: "90"},
      {title: "75 deg", id: "75"},
      {title: "65 deg", id: "65"},
      {title: "60 deg", id: "60"},
      {title: "45 deg (Common face mill)", id: "45"},
      {title: "30 deg", id: "30"},
      {title: "20 deg", id: "20"},
      {title: "17 deg (High feed)", id: "17"},
      {title: "15 deg", id: "15"},
      {title: "12 deg (High feed)", id: "12"},
      {title: "10 deg (High feed)", id: "10"}
    ],
    value      : "45",
    scope      : "post"
  },
  prismT5InsertGrade: {
    title      : "T5: Insert Grade",
    description: "Carbide grade - select based on manufacturer or use generic ISO grades.",
    group      : "prismPocket05",
    type       : "enum",
    values     : INSERT_GRADE_VALUES,
    value      : "P20",
    scope      : "post"
  },
  prismT5InsertNoseR: {
    title      : "T5: Insert Nose Radius",
    description: "Corner radius in mm. Enter your insert nose radius (e.g. 0.4, 0.8, 1.2). Larger = higher feed possible, rougher finish.",
    group      : "prismPocket05",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  prismT5Coolant: {
    title      : "T5: Coolant Strategy",
    description: "Coolant output for this tool. Override per operation or use tool default.",
    group      : "prismPocket05",
    type       : "enum",
    values     : [
      {title: "Use Fusion Setting", id: "fusion"},
      {title: "Flood (M8)", id: "flood"},
      {title: "Mist (M7)", id: "mist"},
      {title: "Flood + Mist (M7 M8)", id: "flood_mist"},
      {title: "Through Spindle (M88)", id: "thru_spindle"},
      {title: "Through Spindle HP", id: "thru_spindle_hp"},
      {title: "Air Blast (M51)", id: "air"},
      {title: "Air + Mist (MQL)", id: "mql"},
      {title: "Vacuum / Dust Collection", id: "vacuum"},
      {title: "Off / Dry (M9)", id: "off"}
    ],
    value      : "fusion",
    scope      : "post"
  },
  prismT5Strategy: {
    title      : "T5: Machining Strategy",
    description: "Unified machining strategy. ROUGHING: HEM/HSM/Aggressive/Balanced/Conservative. FINISHING: Surface/Accuracy/Balanced/Productivity. Auto=detect from Fusion operation type.",
    group      : "prismPocket05",
    type       : "enum",
        values     : [
      {title: "Auto-Detect", id: "auto"},
      {title: "=== ROUGHING ===", id: "_rough_header"},
      {title: "HEM - High Efficiency Milling", id: "hem"},
      {title: "HSM - High Speed Machining", id: "hsm"},
      {title: "Aggressive (Max MRR)", id: "aggressive"},
      {title: "Balanced Roughing", id: "balanced"},
      {title: "Conservative (Tool Life)", id: "conservative"},
      {title: "=== FINISHING ===", id: "_finish_header"},
      {title: "Finish - Surface Quality", id: "finish"},
      {title: "Finish - Accuracy Priority", id: "accuracy"},
      {title: "Finish - Balanced", id: "finish_balanced"},
      {title: "Finish - Productivity", id: "finish_productivity"},
      {title: "=== OTHER ===", id: "_other_header"},
      {title: "Off (Use Programmed)", id: "off"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismT5MaxChipThinMult: {
    title      : "T5: Max Chip Thinning Mult",
    description: "Maximum feed increase from chip thinning. At 10% WOC theoretical is 3.2x. Cap for safety. Overrides global setting.",
    group      : "prismPocket05",
    type       : "number",
    range      : [1.0, 4.0],
    value      : 2.5,
    scope      : "post"
  },
  prismT5DeflectionLimit: {
    title      : "T5: Max Deflection (in)",
    description: "Feed reduced when calculated deflection exceeds this. 0.001-0.002 for finish, 0.003-0.005 for rough.",
    group      : "prismPocket05",
    type       : "number",
    range      : [0.0005, 0.010],
    value      : 0.002,
    scope      : "post"
  },
  prismT5TargetRa: {
    title      : "T5: Target Ra (uin)",
    description: "Target surface roughness in microinches. 16=fine finish, 32=good, 63=standard, 125=rough finish.",
    group      : "prismPocket05",
    type       : "enum",
    values     : [
      {title: "8 uin (Mirror/Lapped)", id: "8"},
      {title: "16 uin (Fine Finish)", id: "16"},
      {title: "32 uin (Good Finish)", id: "32"},
      {title: "63 uin (Standard)", id: "63"},
      {title: "125 uin (Semi-Finish)", id: "125"},
      {title: "250 uin (Roughing)", id: "250"},
      {title: "500 uin (Adaptive/HEM)", id: "500"},
      {title: "999 uin (Ignore Finish)", id: "999"}
    ],
    value      : "32",
    scope      : "post"
  },
  prismT5Aggressiveness: {
    title      : "T5: Aggressiveness (1-8)",
    description: "How hard should PRISM push? 1 = safest (longest tool life). 5 = balanced. 8 = fastest (maximum material removal). Start at 5 if unsure.",
    group      : "prismPocket05",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },
  // ===========================================================================
  // TOOL POCKET 6 (T6)
  // ===========================================================================
  prismT6Material: {
    title      : "T6: Tool Material",
    description: "Tool substrate.",
    group      : "prismPocket06",
    type       : "enum",
    values     : TOOL_MATERIAL_VALUES,
    value      : "carbide",
    scope      : "post"
  },
  prismT6Coating: {
    title      : "T6: Coating",
    description: "Tool coating.",
    group      : "prismPocket06",
    type       : "enum",
    values     : COATING_VALUES,
    value      : "tialn",
    scope      : "post"
  },
  prismT6Brand: {
    title      : "T6: Brand",
    description: "Tool manufacturer.",
    group      : "prismPocket06",
    type       : "enum",
    values     : BRAND_VALUES,
    value      : "generic",
    scope      : "post"
  },
  prismT6HolderType: {
    title      : "T6: Holder Type",
    description: "Tool holder style.",
    group      : "prismPocket06",
    type       : "enum",
    values     : HOLDER_TYPE_VALUES,
    value      : "er_collet",
    scope      : "post"
  },
  prismT6HolderExtension: {
    title      : "T6: Holder Extension (in)",
    description: "Holder projection from spindle face. For extended arbors, enter total length. 0=auto from tool body.",
    group      : "prismPocket06",
    type       : "number",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  prismT6Condition: {
    title      : "T6: Condition",
    description: "Tool wear state.",
    group      : "prismPocket06",
    type       : "enum",
    values     : [
      {title: "New", id: "new"},
      {title: "Good", id: "good"},
      {title: "Worn", id: "worn"},
      {title: "Regrind", id: "regrind"}
    ],
    value      : "new",
    scope      : "post"
  },
  prismT6SpeedPct: {
    title      : "T6: Speed %",
    description: "Speed multiplier (100=calculated).",
    group      : "prismPocket06",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT6FeedPct: {
    title      : "T6: Feed %",
    description: "Feed multiplier (100=calculated).",
    group      : "prismPocket06",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT6ApplyMultipliersTo: {
    title      : "T6: Apply Multipliers To",
    description: "Controls when Speed%/Feed% multipliers are applied. 'Milling Only' = skip drilling/tapping (recommended). 'All' = always apply. 'Off' = never apply (use Fusion feeds).",
    group      : "prismPocket06",
    type       : "enum",
    values     : [
      {title: "Milling Only (Skip Drilling)", id: "milling_only"},
      {title: "All Operations", id: "all"},
      {title: "Off (Use Fusion Programmed)", id: "off"}
    ],
    value      : "milling_only",
    scope      : "post"
  },
  prismT6Indexable: {
    title      : "T6: Indexable Insert Tool",
    description: "Enable indexable insert parameters for this tool (face mills, indexable endmills, high-feed, etc).",
    group      : "prismPocket06",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismT6InsertStyle: {
    title      : "T6: Insert Cutter Style",
    description: "Type of indexable cutter.",
    group      : "prismPocket06",
    type       : "enum",
    values     : [
      {title: "Face Mill (45 deg lead)", id: "face_mill_45"},
      {title: "Face Mill (90 deg lead)", id: "face_mill_90"},
      {title: "High Feed Mill (10-17 deg)", id: "high_feed"},
      {title: "Shoulder/Square Mill (90 deg)", id: "shoulder_90"},
      {title: "Button Cutter (Round)", id: "button"},
      {title: "Indexable Ball", id: "ball"},
      {title: "Indexable Drill", id: "drill"},
      {title: "Chamfer Mill", id: "chamfer"},
      {title: "Slot Mill", id: "slot"},
      {title: "Copy Mill / 3D", id: "copy"}
    ],
    value      : "face_mill_45",
    scope      : "post"
  },
  prismT6LeadAngle: {
    title      : "T6: Lead/Entry Angle",
    description: "Insert approach angle. Affects chip thickness and axial force. High-feed uses 10-17 deg.",
    group      : "prismPocket06",
    type       : "enum",
    values     : [
      {title: "90 deg (Square shoulder)", id: "90"},
      {title: "75 deg", id: "75"},
      {title: "65 deg", id: "65"},
      {title: "60 deg", id: "60"},
      {title: "45 deg (Common face mill)", id: "45"},
      {title: "30 deg", id: "30"},
      {title: "20 deg", id: "20"},
      {title: "17 deg (High feed)", id: "17"},
      {title: "15 deg", id: "15"},
      {title: "12 deg (High feed)", id: "12"},
      {title: "10 deg (High feed)", id: "10"}
    ],
    value      : "45",
    scope      : "post"
  },
  prismT6InsertGrade: {
    title      : "T6: Insert Grade",
    description: "Carbide grade - select based on manufacturer or use generic ISO grades.",
    group      : "prismPocket06",
    type       : "enum",
    values     : INSERT_GRADE_VALUES,
    value      : "P20",
    scope      : "post"
  },
  prismT6InsertNoseR: {
    title      : "T6: Insert Nose Radius",
    description: "Corner radius in mm. Enter your insert nose radius (e.g. 0.4, 0.8, 1.2). Larger = higher feed possible, rougher finish.",
    group      : "prismPocket06",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  prismT6Coolant: {
    title      : "T6: Coolant Strategy",
    description: "Coolant output for this tool. Override per operation or use tool default.",
    group      : "prismPocket06",
    type       : "enum",
    values     : [
      {title: "Use Fusion Setting", id: "fusion"},
      {title: "Flood (M8)", id: "flood"},
      {title: "Mist (M7)", id: "mist"},
      {title: "Flood + Mist (M7 M8)", id: "flood_mist"},
      {title: "Through Spindle (M88)", id: "thru_spindle"},
      {title: "Through Spindle HP", id: "thru_spindle_hp"},
      {title: "Air Blast (M51)", id: "air"},
      {title: "Air + Mist (MQL)", id: "mql"},
      {title: "Vacuum / Dust Collection", id: "vacuum"},
      {title: "Off / Dry (M9)", id: "off"}
    ],
    value      : "fusion",
    scope      : "post"
  },
  prismT6Strategy: {
    title      : "T6: Machining Strategy",
    description: "Unified machining strategy. ROUGHING: HEM/HSM/Aggressive/Balanced/Conservative. FINISHING: Surface/Accuracy/Balanced/Productivity. Auto=detect from Fusion operation type.",
    group      : "prismPocket06",
    type       : "enum",
        values     : [
      {title: "Auto-Detect", id: "auto"},
      {title: "=== ROUGHING ===", id: "_rough_header"},
      {title: "HEM - High Efficiency Milling", id: "hem"},
      {title: "HSM - High Speed Machining", id: "hsm"},
      {title: "Aggressive (Max MRR)", id: "aggressive"},
      {title: "Balanced Roughing", id: "balanced"},
      {title: "Conservative (Tool Life)", id: "conservative"},
      {title: "=== FINISHING ===", id: "_finish_header"},
      {title: "Finish - Surface Quality", id: "finish"},
      {title: "Finish - Accuracy Priority", id: "accuracy"},
      {title: "Finish - Balanced", id: "finish_balanced"},
      {title: "Finish - Productivity", id: "finish_productivity"},
      {title: "=== OTHER ===", id: "_other_header"},
      {title: "Off (Use Programmed)", id: "off"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismT6MaxChipThinMult: {
    title      : "T6: Max Chip Thinning Mult",
    description: "Maximum feed increase from chip thinning. At 10% WOC theoretical is 3.2x. Cap for safety. Overrides global setting.",
    group      : "prismPocket06",
    type       : "number",
    range      : [1.0, 4.0],
    value      : 2.5,
    scope      : "post"
  },
  prismT6DeflectionLimit: {
    title      : "T6: Max Deflection (in)",
    description: "Feed reduced when calculated deflection exceeds this. 0.001-0.002 for finish, 0.003-0.005 for rough.",
    group      : "prismPocket06",
    type       : "number",
    range      : [0.0005, 0.010],
    value      : 0.002,
    scope      : "post"
  },
  prismT6TargetRa: {
    title      : "T6: Target Ra (uin)",
    description: "Target surface roughness in microinches. 16=fine finish, 32=good, 63=standard, 125=rough finish.",
    group      : "prismPocket06",
    type       : "enum",
    values     : [
      {title: "8 uin (Mirror/Lapped)", id: "8"},
      {title: "16 uin (Fine Finish)", id: "16"},
      {title: "32 uin (Good Finish)", id: "32"},
      {title: "63 uin (Standard)", id: "63"},
      {title: "125 uin (Semi-Finish)", id: "125"},
      {title: "250 uin (Roughing)", id: "250"},
      {title: "500 uin (Adaptive/HEM)", id: "500"},
      {title: "999 uin (Ignore Finish)", id: "999"}
    ],
    value      : "32",
    scope      : "post"
  },
  prismT6Aggressiveness: {
    title      : "T6: Aggressiveness (1-8)",
    description: "How hard should PRISM push? 1 = safest (longest tool life). 5 = balanced. 8 = fastest (maximum material removal). Start at 5 if unsure.",
    group      : "prismPocket06",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },
  // ===========================================================================
  // TOOL POCKET 7 (T7)
  // ===========================================================================
  prismT7Material: {
    title      : "T7: Tool Material",
    description: "Tool substrate.",
    group      : "prismPocket07",
    type       : "enum",
    values     : TOOL_MATERIAL_VALUES,
    value      : "carbide",
    scope      : "post"
  },
  prismT7Coating: {
    title      : "T7: Coating",
    description: "Tool coating.",
    group      : "prismPocket07",
    type       : "enum",
    values     : COATING_VALUES,
    value      : "tialn",
    scope      : "post"
  },
  prismT7Brand: {
    title      : "T7: Brand",
    description: "Tool manufacturer.",
    group      : "prismPocket07",
    type       : "enum",
    values     : BRAND_VALUES,
    value      : "generic",
    scope      : "post"
  },
  prismT7HolderType: {
    title      : "T7: Holder Type",
    description: "Tool holder style.",
    group      : "prismPocket07",
    type       : "enum",
    values     : HOLDER_TYPE_VALUES,
    value      : "er_collet",
    scope      : "post"
  },
  prismT7HolderExtension: {
    title      : "T7: Holder Extension (in)",
    description: "Holder projection from spindle face. For extended arbors, enter total length. 0=auto from tool body.",
    group      : "prismPocket07",
    type       : "number",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  prismT7Condition: {
    title      : "T7: Condition",
    description: "Tool wear state.",
    group      : "prismPocket07",
    type       : "enum",
    values     : [
      {title: "New", id: "new"},
      {title: "Good", id: "good"},
      {title: "Worn", id: "worn"},
      {title: "Regrind", id: "regrind"}
    ],
    value      : "new",
    scope      : "post"
  },
  prismT7SpeedPct: {
    title      : "T7: Speed %",
    description: "Speed multiplier (100=calculated).",
    group      : "prismPocket07",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT7FeedPct: {
    title      : "T7: Feed %",
    description: "Feed multiplier (100=calculated).",
    group      : "prismPocket07",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT7ApplyMultipliersTo: {
    title      : "T7: Apply Multipliers To",
    description: "Controls when Speed%/Feed% multipliers are applied. 'Milling Only' = skip drilling/tapping (recommended). 'All' = always apply. 'Off' = never apply (use Fusion feeds).",
    group      : "prismPocket07",
    type       : "enum",
    values     : [
      {title: "Milling Only (Skip Drilling)", id: "milling_only"},
      {title: "All Operations", id: "all"},
      {title: "Off (Use Fusion Programmed)", id: "off"}
    ],
    value      : "milling_only",
    scope      : "post"
  },
  prismT7Indexable: {
    title      : "T7: Indexable Insert Tool",
    description: "Enable indexable insert parameters for this tool (face mills, indexable endmills, high-feed, etc).",
    group      : "prismPocket07",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismT7InsertStyle: {
    title      : "T7: Insert Cutter Style",
    description: "Type of indexable cutter.",
    group      : "prismPocket07",
    type       : "enum",
    values     : [
      {title: "Face Mill (45 deg lead)", id: "face_mill_45"},
      {title: "Face Mill (90 deg lead)", id: "face_mill_90"},
      {title: "High Feed Mill (10-17 deg)", id: "high_feed"},
      {title: "Shoulder/Square Mill (90 deg)", id: "shoulder_90"},
      {title: "Button Cutter (Round)", id: "button"},
      {title: "Indexable Ball", id: "ball"},
      {title: "Indexable Drill", id: "drill"},
      {title: "Chamfer Mill", id: "chamfer"},
      {title: "Slot Mill", id: "slot"},
      {title: "Copy Mill / 3D", id: "copy"}
    ],
    value      : "face_mill_45",
    scope      : "post"
  },
  prismT7LeadAngle: {
    title      : "T7: Lead/Entry Angle",
    description: "Insert approach angle. Affects chip thickness and axial force. High-feed uses 10-17 deg.",
    group      : "prismPocket07",
    type       : "enum",
    values     : [
      {title: "90 deg (Square shoulder)", id: "90"},
      {title: "75 deg", id: "75"},
      {title: "65 deg", id: "65"},
      {title: "60 deg", id: "60"},
      {title: "45 deg (Common face mill)", id: "45"},
      {title: "30 deg", id: "30"},
      {title: "20 deg", id: "20"},
      {title: "17 deg (High feed)", id: "17"},
      {title: "15 deg", id: "15"},
      {title: "12 deg (High feed)", id: "12"},
      {title: "10 deg (High feed)", id: "10"}
    ],
    value      : "45",
    scope      : "post"
  },
  prismT7InsertGrade: {
    title      : "T7: Insert Grade",
    description: "Carbide grade - select based on manufacturer or use generic ISO grades.",
    group      : "prismPocket07",
    type       : "enum",
    values     : INSERT_GRADE_VALUES,
    value      : "P20",
    scope      : "post"
  },
  prismT7InsertNoseR: {
    title      : "T7: Insert Nose Radius",
    description: "Corner radius in mm. Enter your insert nose radius (e.g. 0.4, 0.8, 1.2). Larger = higher feed possible, rougher finish.",
    group      : "prismPocket07",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  prismT7Coolant: {
    title      : "T7: Coolant Strategy",
    description: "Coolant output for this tool. Override per operation or use tool default.",
    group      : "prismPocket07",
    type       : "enum",
    values     : [
      {title: "Use Fusion Setting", id: "fusion"},
      {title: "Flood (M8)", id: "flood"},
      {title: "Mist (M7)", id: "mist"},
      {title: "Flood + Mist (M7 M8)", id: "flood_mist"},
      {title: "Through Spindle (M88)", id: "thru_spindle"},
      {title: "Through Spindle HP", id: "thru_spindle_hp"},
      {title: "Air Blast (M51)", id: "air"},
      {title: "Air + Mist (MQL)", id: "mql"},
      {title: "Vacuum / Dust Collection", id: "vacuum"},
      {title: "Off / Dry (M9)", id: "off"}
    ],
    value      : "fusion",
    scope      : "post"
  },
  prismT7Strategy: {
    title      : "T7: Machining Strategy",
    description: "Unified machining strategy. ROUGHING: HEM/HSM/Aggressive/Balanced/Conservative. FINISHING: Surface/Accuracy/Balanced/Productivity. Auto=detect from Fusion operation type.",
    group      : "prismPocket07",
    type       : "enum",
        values     : [
      {title: "Auto-Detect", id: "auto"},
      {title: "=== ROUGHING ===", id: "_rough_header"},
      {title: "HEM - High Efficiency Milling", id: "hem"},
      {title: "HSM - High Speed Machining", id: "hsm"},
      {title: "Aggressive (Max MRR)", id: "aggressive"},
      {title: "Balanced Roughing", id: "balanced"},
      {title: "Conservative (Tool Life)", id: "conservative"},
      {title: "=== FINISHING ===", id: "_finish_header"},
      {title: "Finish - Surface Quality", id: "finish"},
      {title: "Finish - Accuracy Priority", id: "accuracy"},
      {title: "Finish - Balanced", id: "finish_balanced"},
      {title: "Finish - Productivity", id: "finish_productivity"},
      {title: "=== OTHER ===", id: "_other_header"},
      {title: "Off (Use Programmed)", id: "off"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismT7MaxChipThinMult: {
    title      : "T7: Max Chip Thinning Mult",
    description: "Maximum feed increase from chip thinning. At 10% WOC theoretical is 3.2x. Cap for safety. Overrides global setting.",
    group      : "prismPocket07",
    type       : "number",
    range      : [1.0, 4.0],
    value      : 2.5,
    scope      : "post"
  },
  prismT7DeflectionLimit: {
    title      : "T7: Max Deflection (in)",
    description: "Feed reduced when calculated deflection exceeds this. 0.001-0.002 for finish, 0.003-0.005 for rough.",
    group      : "prismPocket07",
    type       : "number",
    range      : [0.0005, 0.010],
    value      : 0.002,
    scope      : "post"
  },
  prismT7TargetRa: {
    title      : "T7: Target Ra (uin)",
    description: "Target surface roughness in microinches. 16=fine finish, 32=good, 63=standard, 125=rough finish.",
    group      : "prismPocket07",
    type       : "enum",
    values     : [
      {title: "8 uin (Mirror/Lapped)", id: "8"},
      {title: "16 uin (Fine Finish)", id: "16"},
      {title: "32 uin (Good Finish)", id: "32"},
      {title: "63 uin (Standard)", id: "63"},
      {title: "125 uin (Semi-Finish)", id: "125"},
      {title: "250 uin (Roughing)", id: "250"},
      {title: "500 uin (Adaptive/HEM)", id: "500"},
      {title: "999 uin (Ignore Finish)", id: "999"}
    ],
    value      : "32",
    scope      : "post"
  },
  prismT7Aggressiveness: {
    title      : "T7: Aggressiveness (1-8)",
    description: "How hard should PRISM push? 1 = safest (longest tool life). 5 = balanced. 8 = fastest (maximum material removal). Start at 5 if unsure.",
    group      : "prismPocket07",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },
  // ===========================================================================
  // TOOL POCKET 8 (T8)
  // ===========================================================================
  prismT8Material: {
    title      : "T8: Tool Material",
    description: "Tool substrate.",
    group      : "prismPocket08",
    type       : "enum",
    values     : TOOL_MATERIAL_VALUES,
    value      : "carbide",
    scope      : "post"
  },
  prismT8Coating: {
    title      : "T8: Coating",
    description: "Tool coating.",
    group      : "prismPocket08",
    type       : "enum",
    values     : COATING_VALUES,
    value      : "tialn",
    scope      : "post"
  },
  prismT8Brand: {
    title      : "T8: Brand",
    description: "Tool manufacturer.",
    group      : "prismPocket08",
    type       : "enum",
    values     : BRAND_VALUES,
    value      : "generic",
    scope      : "post"
  },
  prismT8HolderType: {
    title      : "T8: Holder Type",
    description: "Tool holder style.",
    group      : "prismPocket08",
    type       : "enum",
    values     : HOLDER_TYPE_VALUES,
    value      : "er_collet",
    scope      : "post"
  },
  prismT8HolderExtension: {
    title      : "T8: Holder Extension (in)",
    description: "Holder projection from spindle face. For extended arbors, enter total length. 0=auto from tool body.",
    group      : "prismPocket08",
    type       : "number",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  prismT8Condition: {
    title      : "T8: Condition",
    description: "Tool wear state.",
    group      : "prismPocket08",
    type       : "enum",
    values     : [
      {title: "New", id: "new"},
      {title: "Good", id: "good"},
      {title: "Worn", id: "worn"},
      {title: "Regrind", id: "regrind"}
    ],
    value      : "new",
    scope      : "post"
  },
  prismT8SpeedPct: {
    title      : "T8: Speed %",
    description: "Speed multiplier (100=calculated).",
    group      : "prismPocket08",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT8FeedPct: {
    title      : "T8: Feed %",
    description: "Feed multiplier (100=calculated).",
    group      : "prismPocket08",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT8ApplyMultipliersTo: {
    title      : "T8: Apply Multipliers To",
    description: "Controls when Speed%/Feed% multipliers are applied. 'Milling Only' = skip drilling/tapping (recommended). 'All' = always apply. 'Off' = never apply (use Fusion feeds).",
    group      : "prismPocket08",
    type       : "enum",
    values     : [
      {title: "Milling Only (Skip Drilling)", id: "milling_only"},
      {title: "All Operations", id: "all"},
      {title: "Off (Use Fusion Programmed)", id: "off"}
    ],
    value      : "milling_only",
    scope      : "post"
  },
  prismT8Indexable: {
    title      : "T8: Indexable Insert Tool",
    description: "Enable indexable insert parameters for this tool (face mills, indexable endmills, high-feed, etc).",
    group      : "prismPocket08",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismT8InsertStyle: {
    title      : "T8: Insert Cutter Style",
    description: "Type of indexable cutter.",
    group      : "prismPocket08",
    type       : "enum",
    values     : [
      {title: "Face Mill (45 deg lead)", id: "face_mill_45"},
      {title: "Face Mill (90 deg lead)", id: "face_mill_90"},
      {title: "High Feed Mill (10-17 deg)", id: "high_feed"},
      {title: "Shoulder/Square Mill (90 deg)", id: "shoulder_90"},
      {title: "Button Cutter (Round)", id: "button"},
      {title: "Indexable Ball", id: "ball"},
      {title: "Indexable Drill", id: "drill"},
      {title: "Chamfer Mill", id: "chamfer"},
      {title: "Slot Mill", id: "slot"},
      {title: "Copy Mill / 3D", id: "copy"}
    ],
    value      : "face_mill_45",
    scope      : "post"
  },
  prismT8LeadAngle: {
    title      : "T8: Lead/Entry Angle",
    description: "Insert approach angle. Affects chip thickness and axial force. High-feed uses 10-17 deg.",
    group      : "prismPocket08",
    type       : "enum",
    values     : [
      {title: "90 deg (Square shoulder)", id: "90"},
      {title: "75 deg", id: "75"},
      {title: "65 deg", id: "65"},
      {title: "60 deg", id: "60"},
      {title: "45 deg (Common face mill)", id: "45"},
      {title: "30 deg", id: "30"},
      {title: "20 deg", id: "20"},
      {title: "17 deg (High feed)", id: "17"},
      {title: "15 deg", id: "15"},
      {title: "12 deg (High feed)", id: "12"},
      {title: "10 deg (High feed)", id: "10"}
    ],
    value      : "45",
    scope      : "post"
  },
  prismT8InsertGrade: {
    title      : "T8: Insert Grade",
    description: "Carbide grade - select based on manufacturer or use generic ISO grades.",
    group      : "prismPocket08",
    type       : "enum",
    values     : INSERT_GRADE_VALUES,
    value      : "P20",
    scope      : "post"
  },
  prismT8InsertNoseR: {
    title      : "T8: Insert Nose Radius",
    description: "Corner radius in mm. Enter your insert nose radius (e.g. 0.4, 0.8, 1.2). Larger = higher feed possible, rougher finish.",
    group      : "prismPocket08",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  prismT8Coolant: {
    title      : "T8: Coolant Strategy",
    description: "Coolant output for this tool. Override per operation or use tool default.",
    group      : "prismPocket08",
    type       : "enum",
    values     : [
      {title: "Use Fusion Setting", id: "fusion"},
      {title: "Flood (M8)", id: "flood"},
      {title: "Mist (M7)", id: "mist"},
      {title: "Flood + Mist (M7 M8)", id: "flood_mist"},
      {title: "Through Spindle (M88)", id: "thru_spindle"},
      {title: "Through Spindle HP", id: "thru_spindle_hp"},
      {title: "Air Blast (M51)", id: "air"},
      {title: "Air + Mist (MQL)", id: "mql"},
      {title: "Vacuum / Dust Collection", id: "vacuum"},
      {title: "Off / Dry (M9)", id: "off"}
    ],
    value      : "fusion",
    scope      : "post"
  },
  prismT8Strategy: {
    title      : "T8: Machining Strategy",
    description: "Unified machining strategy. ROUGHING: HEM/HSM/Aggressive/Balanced/Conservative. FINISHING: Surface/Accuracy/Balanced/Productivity. Auto=detect from Fusion operation type.",
    group      : "prismPocket08",
    type       : "enum",
        values     : [
      {title: "Auto-Detect", id: "auto"},
      {title: "=== ROUGHING ===", id: "_rough_header"},
      {title: "HEM - High Efficiency Milling", id: "hem"},
      {title: "HSM - High Speed Machining", id: "hsm"},
      {title: "Aggressive (Max MRR)", id: "aggressive"},
      {title: "Balanced Roughing", id: "balanced"},
      {title: "Conservative (Tool Life)", id: "conservative"},
      {title: "=== FINISHING ===", id: "_finish_header"},
      {title: "Finish - Surface Quality", id: "finish"},
      {title: "Finish - Accuracy Priority", id: "accuracy"},
      {title: "Finish - Balanced", id: "finish_balanced"},
      {title: "Finish - Productivity", id: "finish_productivity"},
      {title: "=== OTHER ===", id: "_other_header"},
      {title: "Off (Use Programmed)", id: "off"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismT8MaxChipThinMult: {
    title      : "T8: Max Chip Thinning Mult",
    description: "Maximum feed increase from chip thinning. At 10% WOC theoretical is 3.2x. Cap for safety. Overrides global setting.",
    group      : "prismPocket08",
    type       : "number",
    range      : [1.0, 4.0],
    value      : 2.5,
    scope      : "post"
  },
  prismT8DeflectionLimit: {
    title      : "T8: Max Deflection (in)",
    description: "Feed reduced when calculated deflection exceeds this. 0.001-0.002 for finish, 0.003-0.005 for rough.",
    group      : "prismPocket08",
    type       : "number",
    range      : [0.0005, 0.010],
    value      : 0.002,
    scope      : "post"
  },
  prismT8TargetRa: {
    title      : "T8: Target Ra (uin)",
    description: "Target surface roughness in microinches. 16=fine finish, 32=good, 63=standard, 125=rough finish.",
    group      : "prismPocket08",
    type       : "enum",
    values     : [
      {title: "8 uin (Mirror/Lapped)", id: "8"},
      {title: "16 uin (Fine Finish)", id: "16"},
      {title: "32 uin (Good Finish)", id: "32"},
      {title: "63 uin (Standard)", id: "63"},
      {title: "125 uin (Semi-Finish)", id: "125"},
      {title: "250 uin (Roughing)", id: "250"},
      {title: "500 uin (Adaptive/HEM)", id: "500"},
      {title: "999 uin (Ignore Finish)", id: "999"}
    ],
    value      : "32",
    scope      : "post"
  },
  prismT8Aggressiveness: {
    title      : "T8: Aggressiveness (1-8)",
    description: "How hard should PRISM push? 1 = safest (longest tool life). 5 = balanced. 8 = fastest (maximum material removal). Start at 5 if unsure.",
    group      : "prismPocket08",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },
  // ===========================================================================
  // TOOL POCKET 9 (T9)
  // ===========================================================================
  prismT9Material: {
    title      : "T9: Tool Material",
    description: "Tool substrate.",
    group      : "prismPocket09",
    type       : "enum",
    values     : TOOL_MATERIAL_VALUES,
    value      : "carbide",
    scope      : "post"
  },
  prismT9Coating: {
    title      : "T9: Coating",
    description: "Tool coating.",
    group      : "prismPocket09",
    type       : "enum",
    values     : COATING_VALUES,
    value      : "tialn",
    scope      : "post"
  },
  prismT9Brand: {
    title      : "T9: Brand",
    description: "Tool manufacturer.",
    group      : "prismPocket09",
    type       : "enum",
    values     : BRAND_VALUES,
    value      : "generic",
    scope      : "post"
  },
  prismT9HolderType: {
    title      : "T9: Holder Type",
    description: "Tool holder style.",
    group      : "prismPocket09",
    type       : "enum",
    values     : HOLDER_TYPE_VALUES,
    value      : "er_collet",
    scope      : "post"
  },
  prismT9HolderExtension: {
    title      : "T9: Holder Extension (in)",
    description: "Holder projection from spindle face. For extended arbors, enter total length. 0=auto from tool body.",
    group      : "prismPocket09",
    type       : "number",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  prismT9Condition: {
    title      : "T9: Condition",
    description: "Tool wear state.",
    group      : "prismPocket09",
    type       : "enum",
    values     : [
      {title: "New", id: "new"},
      {title: "Good", id: "good"},
      {title: "Worn", id: "worn"},
      {title: "Regrind", id: "regrind"}
    ],
    value      : "new",
    scope      : "post"
  },
  prismT9SpeedPct: {
    title      : "T9: Speed %",
    description: "Speed multiplier (100=calculated).",
    group      : "prismPocket09",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT9FeedPct: {
    title      : "T9: Feed %",
    description: "Feed multiplier (100=calculated).",
    group      : "prismPocket09",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT9ApplyMultipliersTo: {
    title      : "T9: Apply Multipliers To",
    description: "Controls when Speed%/Feed% multipliers are applied. 'Milling Only' = skip drilling/tapping (recommended). 'All' = always apply. 'Off' = never apply (use Fusion feeds).",
    group      : "prismPocket09",
    type       : "enum",
    values     : [
      {title: "Milling Only (Skip Drilling)", id: "milling_only"},
      {title: "All Operations", id: "all"},
      {title: "Off (Use Fusion Programmed)", id: "off"}
    ],
    value      : "milling_only",
    scope      : "post"
  },
  prismT9Indexable: {
    title      : "T9: Indexable Insert Tool",
    description: "Enable indexable insert parameters for this tool (face mills, indexable endmills, high-feed, etc).",
    group      : "prismPocket09",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismT9InsertStyle: {
    title      : "T9: Insert Cutter Style",
    description: "Type of indexable cutter.",
    group      : "prismPocket09",
    type       : "enum",
    values     : [
      {title: "Face Mill (45 deg lead)", id: "face_mill_45"},
      {title: "Face Mill (90 deg lead)", id: "face_mill_90"},
      {title: "High Feed Mill (10-17 deg)", id: "high_feed"},
      {title: "Shoulder/Square Mill (90 deg)", id: "shoulder_90"},
      {title: "Button Cutter (Round)", id: "button"},
      {title: "Indexable Ball", id: "ball"},
      {title: "Indexable Drill", id: "drill"},
      {title: "Chamfer Mill", id: "chamfer"},
      {title: "Slot Mill", id: "slot"},
      {title: "Copy Mill / 3D", id: "copy"}
    ],
    value      : "face_mill_45",
    scope      : "post"
  },
  prismT9LeadAngle: {
    title      : "T9: Lead/Entry Angle",
    description: "Insert approach angle. Affects chip thickness and axial force. High-feed uses 10-17 deg.",
    group      : "prismPocket09",
    type       : "enum",
    values     : [
      {title: "90 deg (Square shoulder)", id: "90"},
      {title: "75 deg", id: "75"},
      {title: "65 deg", id: "65"},
      {title: "60 deg", id: "60"},
      {title: "45 deg (Common face mill)", id: "45"},
      {title: "30 deg", id: "30"},
      {title: "20 deg", id: "20"},
      {title: "17 deg (High feed)", id: "17"},
      {title: "15 deg", id: "15"},
      {title: "12 deg (High feed)", id: "12"},
      {title: "10 deg (High feed)", id: "10"}
    ],
    value      : "45",
    scope      : "post"
  },
  prismT9InsertGrade: {
    title      : "T9: Insert Grade",
    description: "Carbide grade - select based on manufacturer or use generic ISO grades.",
    group      : "prismPocket09",
    type       : "enum",
    values     : INSERT_GRADE_VALUES,
    value      : "P20",
    scope      : "post"
  },
  prismT9InsertNoseR: {
    title      : "T9: Insert Nose Radius",
    description: "Corner radius in mm. Enter your insert nose radius (e.g. 0.4, 0.8, 1.2). Larger = higher feed possible, rougher finish.",
    group      : "prismPocket09",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  prismT9Coolant: {
    title      : "T9: Coolant Strategy",
    description: "Coolant output for this tool. Override per operation or use tool default.",
    group      : "prismPocket09",
    type       : "enum",
    values     : [
      {title: "Use Fusion Setting", id: "fusion"},
      {title: "Flood (M8)", id: "flood"},
      {title: "Mist (M7)", id: "mist"},
      {title: "Flood + Mist (M7 M8)", id: "flood_mist"},
      {title: "Through Spindle (M88)", id: "thru_spindle"},
      {title: "Through Spindle HP", id: "thru_spindle_hp"},
      {title: "Air Blast (M51)", id: "air"},
      {title: "Air + Mist (MQL)", id: "mql"},
      {title: "Vacuum / Dust Collection", id: "vacuum"},
      {title: "Off / Dry (M9)", id: "off"}
    ],
    value      : "fusion",
    scope      : "post"
  },
  prismT9Strategy: {
    title      : "T9: Machining Strategy",
    description: "Unified machining strategy. ROUGHING: HEM/HSM/Aggressive/Balanced/Conservative. FINISHING: Surface/Accuracy/Balanced/Productivity. Auto=detect from Fusion operation type.",
    group      : "prismPocket09",
    type       : "enum",
        values     : [
      {title: "Auto-Detect", id: "auto"},
      {title: "=== ROUGHING ===", id: "_rough_header"},
      {title: "HEM - High Efficiency Milling", id: "hem"},
      {title: "HSM - High Speed Machining", id: "hsm"},
      {title: "Aggressive (Max MRR)", id: "aggressive"},
      {title: "Balanced Roughing", id: "balanced"},
      {title: "Conservative (Tool Life)", id: "conservative"},
      {title: "=== FINISHING ===", id: "_finish_header"},
      {title: "Finish - Surface Quality", id: "finish"},
      {title: "Finish - Accuracy Priority", id: "accuracy"},
      {title: "Finish - Balanced", id: "finish_balanced"},
      {title: "Finish - Productivity", id: "finish_productivity"},
      {title: "=== OTHER ===", id: "_other_header"},
      {title: "Off (Use Programmed)", id: "off"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismT9MaxChipThinMult: {
    title      : "T9: Max Chip Thinning Mult",
    description: "Maximum feed increase from chip thinning. At 10% WOC theoretical is 3.2x. Cap for safety. Overrides global setting.",
    group      : "prismPocket09",
    type       : "number",
    range      : [1.0, 4.0],
    value      : 2.5,
    scope      : "post"
  },
  prismT9DeflectionLimit: {
    title      : "T9: Max Deflection (in)",
    description: "Feed reduced when calculated deflection exceeds this. 0.001-0.002 for finish, 0.003-0.005 for rough.",
    group      : "prismPocket09",
    type       : "number",
    range      : [0.0005, 0.010],
    value      : 0.002,
    scope      : "post"
  },
  prismT9TargetRa: {
    title      : "T9: Target Ra (uin)",
    description: "Target surface roughness in microinches. 16=fine finish, 32=good, 63=standard, 125=rough finish.",
    group      : "prismPocket09",
    type       : "enum",
    values     : [
      {title: "8 uin (Mirror/Lapped)", id: "8"},
      {title: "16 uin (Fine Finish)", id: "16"},
      {title: "32 uin (Good Finish)", id: "32"},
      {title: "63 uin (Standard)", id: "63"},
      {title: "125 uin (Semi-Finish)", id: "125"},
      {title: "250 uin (Roughing)", id: "250"},
      {title: "500 uin (Adaptive/HEM)", id: "500"},
      {title: "999 uin (Ignore Finish)", id: "999"}
    ],
    value      : "32",
    scope      : "post"
  },
  prismT9Aggressiveness: {
    title      : "T9: Aggressiveness (1-8)",
    description: "How hard should PRISM push? 1 = safest (longest tool life). 5 = balanced. 8 = fastest (maximum material removal). Start at 5 if unsure.",
    group      : "prismPocket09",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },
  // ===========================================================================
  // TOOL POCKET 10 (T10)
  // ===========================================================================
  prismT10Material: {
    title      : "T10: Tool Material",
    description: "Tool substrate.",
    group      : "prismPocket10",
    type       : "enum",
    values     : TOOL_MATERIAL_VALUES,
    value      : "carbide",
    scope      : "post"
  },
  prismT10Coating: {
    title      : "T10: Coating",
    description: "Tool coating.",
    group      : "prismPocket10",
    type       : "enum",
    values     : COATING_VALUES,
    value      : "tialn",
    scope      : "post"
  },
  prismT10Brand: {
    title      : "T10: Brand",
    description: "Tool manufacturer.",
    group      : "prismPocket10",
    type       : "enum",
    values     : BRAND_VALUES,
    value      : "generic",
    scope      : "post"
  },
  prismT10HolderType: {
    title      : "T10: Holder Type",
    description: "Tool holder style.",
    group      : "prismPocket10",
    type       : "enum",
    values     : HOLDER_TYPE_VALUES,
    value      : "er_collet",
    scope      : "post"
  },
  prismT10HolderExtension: {
    title      : "T10: Holder Extension (in)",
    description: "Holder projection from spindle face. For extended arbors, enter total length. 0=auto from tool body.",
    group      : "prismPocket10",
    type       : "number",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  prismT10Condition: {
    title      : "T10: Condition",
    description: "Tool wear state.",
    group      : "prismPocket10",
    type       : "enum",
    values     : [
      {title: "New", id: "new"},
      {title: "Good", id: "good"},
      {title: "Worn", id: "worn"},
      {title: "Regrind", id: "regrind"}
    ],
    value      : "new",
    scope      : "post"
  },
  prismT10SpeedPct: {
    title      : "T10: Speed %",
    description: "Speed multiplier (100=calculated).",
    group      : "prismPocket10",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT10FeedPct: {
    title      : "T10: Feed %",
    description: "Feed multiplier (100=calculated).",
    group      : "prismPocket10",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT10ApplyMultipliersTo: {
    title      : "T10: Apply Multipliers To",
    description: "Controls when Speed%/Feed% multipliers are applied. 'Milling Only' = skip drilling/tapping (recommended). 'All' = always apply. 'Off' = never apply (use Fusion feeds).",
    group      : "prismPocket10",
    type       : "enum",
    values     : [
      {title: "Milling Only (Skip Drilling)", id: "milling_only"},
      {title: "All Operations", id: "all"},
      {title: "Off (Use Fusion Programmed)", id: "off"}
    ],
    value      : "milling_only",
    scope      : "post"
  },
  prismT10Indexable: {
    title      : "T10: Indexable Insert Tool",
    description: "Enable indexable insert parameters for this tool (face mills, indexable endmills, high-feed, etc).",
    group      : "prismPocket10",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismT10InsertStyle: {
    title      : "T10: Insert Cutter Style",
    description: "Type of indexable cutter.",
    group      : "prismPocket10",
    type       : "enum",
    values     : [
      {title: "Face Mill (45 deg lead)", id: "face_mill_45"},
      {title: "Face Mill (90 deg lead)", id: "face_mill_90"},
      {title: "High Feed Mill (10-17 deg)", id: "high_feed"},
      {title: "Shoulder/Square Mill (90 deg)", id: "shoulder_90"},
      {title: "Button Cutter (Round)", id: "button"},
      {title: "Indexable Ball", id: "ball"},
      {title: "Indexable Drill", id: "drill"},
      {title: "Chamfer Mill", id: "chamfer"},
      {title: "Slot Mill", id: "slot"},
      {title: "Copy Mill / 3D", id: "copy"}
    ],
    value      : "face_mill_45",
    scope      : "post"
  },
  prismT10LeadAngle: {
    title      : "T10: Lead/Entry Angle",
    description: "Insert approach angle. Affects chip thickness and axial force. High-feed uses 10-17 deg.",
    group      : "prismPocket10",
    type       : "enum",
    values     : [
      {title: "90 deg (Square shoulder)", id: "90"},
      {title: "75 deg", id: "75"},
      {title: "65 deg", id: "65"},
      {title: "60 deg", id: "60"},
      {title: "45 deg (Common face mill)", id: "45"},
      {title: "30 deg", id: "30"},
      {title: "20 deg", id: "20"},
      {title: "17 deg (High feed)", id: "17"},
      {title: "15 deg", id: "15"},
      {title: "12 deg (High feed)", id: "12"},
      {title: "10 deg (High feed)", id: "10"}
    ],
    value      : "45",
    scope      : "post"
  },
  prismT10InsertGrade: {
    title      : "T10: Insert Grade",
    description: "Carbide grade - select based on manufacturer or use generic ISO grades.",
    group      : "prismPocket10",
    type       : "enum",
    values     : INSERT_GRADE_VALUES,
    value      : "P20",
    scope      : "post"
  },
  prismT10InsertNoseR: {
    title      : "T10: Insert Nose Radius",
    description: "Corner radius in mm. Enter your insert nose radius (e.g. 0.4, 0.8, 1.2). Larger = higher feed possible, rougher finish.",
    group      : "prismPocket10",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  prismT10Coolant: {
    title      : "T10: Coolant Strategy",
    description: "Coolant output for this tool. Override per operation or use tool default.",
    group      : "prismPocket10",
    type       : "enum",
    values     : [
      {title: "Use Fusion Setting", id: "fusion"},
      {title: "Flood (M8)", id: "flood"},
      {title: "Mist (M7)", id: "mist"},
      {title: "Flood + Mist (M7 M8)", id: "flood_mist"},
      {title: "Through Spindle (M88)", id: "thru_spindle"},
      {title: "Through Spindle HP", id: "thru_spindle_hp"},
      {title: "Air Blast (M51)", id: "air"},
      {title: "Air + Mist (MQL)", id: "mql"},
      {title: "Vacuum / Dust Collection", id: "vacuum"},
      {title: "Off / Dry (M9)", id: "off"}
    ],
    value      : "fusion",
    scope      : "post"
  },
  prismT10Strategy: {
    title      : "T10: Machining Strategy",
    description: "Unified machining strategy. ROUGHING: HEM/HSM/Aggressive/Balanced/Conservative. FINISHING: Surface/Accuracy/Balanced/Productivity. Auto=detect from Fusion operation type.",
    group      : "prismPocket10",
    type       : "enum",
        values     : [
      {title: "Auto-Detect", id: "auto"},
      {title: "=== ROUGHING ===", id: "_rough_header"},
      {title: "HEM - High Efficiency Milling", id: "hem"},
      {title: "HSM - High Speed Machining", id: "hsm"},
      {title: "Aggressive (Max MRR)", id: "aggressive"},
      {title: "Balanced Roughing", id: "balanced"},
      {title: "Conservative (Tool Life)", id: "conservative"},
      {title: "=== FINISHING ===", id: "_finish_header"},
      {title: "Finish - Surface Quality", id: "finish"},
      {title: "Finish - Accuracy Priority", id: "accuracy"},
      {title: "Finish - Balanced", id: "finish_balanced"},
      {title: "Finish - Productivity", id: "finish_productivity"},
      {title: "=== OTHER ===", id: "_other_header"},
      {title: "Off (Use Programmed)", id: "off"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismT10MaxChipThinMult: {
    title      : "T10: Max Chip Thinning Mult",
    description: "Maximum feed increase from chip thinning. At 10% WOC theoretical is 3.2x. Cap for safety. Overrides global setting.",
    group      : "prismPocket10",
    type       : "number",
    range      : [1.0, 4.0],
    value      : 2.5,
    scope      : "post"
  },
  prismT10DeflectionLimit: {
    title      : "T10: Max Deflection (in)",
    description: "Feed reduced when calculated deflection exceeds this. 0.001-0.002 for finish, 0.003-0.005 for rough.",
    group      : "prismPocket10",
    type       : "number",
    range      : [0.0005, 0.010],
    value      : 0.002,
    scope      : "post"
  },
  prismT10TargetRa: {
    title      : "T10: Target Ra (uin)",
    description: "Target surface roughness in microinches. 16=fine finish, 32=good, 63=standard, 125=rough finish.",
    group      : "prismPocket10",
    type       : "enum",
    values     : [
      {title: "8 uin (Mirror/Lapped)", id: "8"},
      {title: "16 uin (Fine Finish)", id: "16"},
      {title: "32 uin (Good Finish)", id: "32"},
      {title: "63 uin (Standard)", id: "63"},
      {title: "125 uin (Semi-Finish)", id: "125"},
      {title: "250 uin (Roughing)", id: "250"},
      {title: "500 uin (Adaptive/HEM)", id: "500"},
      {title: "999 uin (Ignore Finish)", id: "999"}
    ],
    value      : "32",
    scope      : "post"
  },
  prismT10Aggressiveness: {
    title      : "T10: Aggressiveness (1-8)",
    description: "How hard should PRISM push? 1 = safest (longest tool life). 5 = balanced. 8 = fastest (maximum material removal). Start at 5 if unsure.",
    group      : "prismPocket10",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },

  // ===========================================================================
  // TOOL POCKET 11 (T11)
  // ===========================================================================
  prismT11Material: {
    title      : "T11: Tool Material",
    description: "Tool substrate.",
    group      : "prismPocket11",
    type       : "enum",
    values     : TOOL_MATERIAL_VALUES,
    value      : "carbide",
    scope      : "post"
  },
  prismT11Coating: {
    title      : "T11: Coating",
    description: "Tool coating.",
    group      : "prismPocket11",
    type       : "enum",
    values     : COATING_VALUES,
    value      : "tialn",
    scope      : "post"
  },
  prismT11Brand: {
    title      : "T11: Brand",
    description: "Tool manufacturer.",
    group      : "prismPocket11",
    type       : "enum",
    values     : BRAND_VALUES,
    value      : "generic",
    scope      : "post"
  },
  prismT11HolderType: {
    title      : "T11: Holder Type",
    description: "Tool holder style.",
    group      : "prismPocket11",
    type       : "enum",
    values     : HOLDER_TYPE_VALUES,
    value      : "er_collet",
    scope      : "post"
  },
  prismT11HolderExtension: {
    title      : "T11: Holder Extension (in)",
    description: "Holder projection from spindle face. For extended arbors, enter total length. 0=auto from tool body.",
    group      : "prismPocket11",
    type       : "number",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  prismT11Condition: {
    title      : "T11: Condition",
    description: "Tool wear state.",
    group      : "prismPocket11",
    type       : "enum",
    values     : [
      {title: "New", id: "new"},
      {title: "Good", id: "good"},
      {title: "Worn", id: "worn"},
      {title: "Regrind", id: "regrind"}
    ],
    value      : "new",
    scope      : "post"
  },
  prismT11SpeedPct: {
    title      : "T11: Speed %",
    description: "Speed multiplier (100=calculated).",
    group      : "prismPocket11",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT11FeedPct: {
    title      : "T11: Feed %",
    description: "Feed multiplier (100=calculated).",
    group      : "prismPocket11",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT11ApplyMultipliersTo: {
    title      : "T11: Apply Multipliers To",
    description: "Controls when Speed%/Feed% multipliers are applied. 'Milling Only' = skip drilling/tapping (recommended). 'All' = always apply. 'Off' = never apply (use Fusion feeds).",
    group      : "prismPocket11",
    type       : "enum",
    values     : [
      {title: "Milling Only (Skip Drilling)", id: "milling_only"},
      {title: "All Operations", id: "all"},
      {title: "Off (Use Fusion Programmed)", id: "off"}
    ],
    value      : "milling_only",
    scope      : "post"
  },
  prismT11Indexable: {
    title      : "T11: Indexable Insert Tool",
    description: "Enable indexable insert parameters for this tool (face mills, indexable endmills, high-feed, etc).",
    group      : "prismPocket11",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismT11InsertStyle: {
    title      : "T11: Insert Cutter Style",
    description: "Type of indexable cutter.",
    group      : "prismPocket11",
    type       : "enum",
    values     : [
      {title: "Face Mill (45 deg lead)", id: "face_mill_45"},
      {title: "Face Mill (90 deg lead)", id: "face_mill_90"},
      {title: "High Feed Mill (10-17 deg)", id: "high_feed"},
      {title: "Shoulder/Square Mill (90 deg)", id: "shoulder_90"},
      {title: "Button Cutter (Round)", id: "button"},
      {title: "Indexable Ball", id: "ball"},
      {title: "Indexable Drill", id: "drill"},
      {title: "Chamfer Mill", id: "chamfer"},
      {title: "Slot Mill", id: "slot"},
      {title: "Copy Mill / 3D", id: "copy"}
    ],
    value      : "face_mill_45",
    scope      : "post"
  },
  prismT11LeadAngle: {
    title      : "T11: Lead/Entry Angle",
    description: "Insert approach angle. Affects chip thickness and axial force. High-feed uses 10-17 deg.",
    group      : "prismPocket11",
    type       : "enum",
    values     : [
      {title: "90 deg (Square shoulder)", id: "90"},
      {title: "75 deg", id: "75"},
      {title: "65 deg", id: "65"},
      {title: "60 deg", id: "60"},
      {title: "45 deg (Common face mill)", id: "45"},
      {title: "30 deg", id: "30"},
      {title: "20 deg", id: "20"},
      {title: "17 deg (High feed)", id: "17"},
      {title: "15 deg", id: "15"},
      {title: "12 deg (High feed)", id: "12"},
      {title: "10 deg (High feed)", id: "10"}
    ],
    value      : "45",
    scope      : "post"
  },
  prismT11InsertGrade: {
    title      : "T11: Insert Grade",
    description: "Carbide grade - select based on manufacturer or use generic ISO grades.",
    group      : "prismPocket11",
    type       : "enum",
    values     : INSERT_GRADE_VALUES,
    value      : "P20",
    scope      : "post"
  },
  prismT11InsertNoseR: {
    title      : "T11: Insert Nose Radius",
    description: "Corner radius in mm. Enter your insert nose radius (e.g. 0.4, 0.8, 1.2). Larger = higher feed possible, rougher finish.",
    group      : "prismPocket11",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  prismT11Coolant: {
    title      : "T11: Coolant Strategy",
    description: "Coolant output for this tool. Override per operation or use tool default.",
    group      : "prismPocket11",
    type       : "enum",
    values     : [
      {title: "Use Fusion Setting", id: "fusion"},
      {title: "Flood (M8)", id: "flood"},
      {title: "Mist (M7)", id: "mist"},
      {title: "Flood + Mist (M7 M8)", id: "flood_mist"},
      {title: "Through Spindle (M88)", id: "thru_spindle"},
      {title: "Through Spindle HP", id: "thru_spindle_hp"},
      {title: "Air Blast (M51)", id: "air"},
      {title: "Air + Mist (MQL)", id: "mql"},
      {title: "Vacuum / Dust Collection", id: "vacuum"},
      {title: "Off / Dry (M9)", id: "off"}
    ],
    value      : "fusion",
    scope      : "post"
  },
  prismT11Strategy: {
    title      : "T11: Machining Strategy",
    description: "Unified machining strategy. ROUGHING: HEM/HSM/Aggressive/Balanced/Conservative. FINISHING: Surface/Accuracy/Balanced/Productivity. Auto=detect from Fusion operation type.",
    group      : "prismPocket11",
    type       : "enum",
        values     : [
      {title: "Auto-Detect", id: "auto"},
      {title: "=== ROUGHING ===", id: "_rough_header"},
      {title: "HEM - High Efficiency Milling", id: "hem"},
      {title: "HSM - High Speed Machining", id: "hsm"},
      {title: "Aggressive (Max MRR)", id: "aggressive"},
      {title: "Balanced Roughing", id: "balanced"},
      {title: "Conservative (Tool Life)", id: "conservative"},
      {title: "=== FINISHING ===", id: "_finish_header"},
      {title: "Finish - Surface Quality", id: "finish"},
      {title: "Finish - Accuracy Priority", id: "accuracy"},
      {title: "Finish - Balanced", id: "finish_balanced"},
      {title: "Finish - Productivity", id: "finish_productivity"},
      {title: "=== OTHER ===", id: "_other_header"},
      {title: "Off (Use Programmed)", id: "off"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismT11MaxChipThinMult: {
    title      : "T11: Max Chip Thinning Mult",
    description: "Maximum feed increase from chip thinning. At 10% WOC theoretical is 3.2x. Cap for safety. Overrides global setting.",
    group      : "prismPocket11",
    type       : "number",
    range      : [1.0, 4.0],
    value      : 2.5,
    scope      : "post"
  },
  prismT11DeflectionLimit: {
    title      : "T11: Max Deflection (in)",
    description: "Feed reduced when calculated deflection exceeds this. 0.001-0.002 for finish, 0.003-0.005 for rough.",
    group      : "prismPocket11",
    type       : "number",
    range      : [0.0005, 0.010],
    value      : 0.002,
    scope      : "post"
  },
  prismT11TargetRa: {
    title      : "T11: Target Ra (uin)",
    description: "Target surface roughness in microinches. 16=fine finish, 32=good, 63=standard, 125=rough finish.",
    group      : "prismPocket11",
    type       : "enum",
    values     : [
      {title: "8 uin (Mirror/Lapped)", id: "8"},
      {title: "16 uin (Fine Finish)", id: "16"},
      {title: "32 uin (Good Finish)", id: "32"},
      {title: "63 uin (Standard)", id: "63"},
      {title: "125 uin (Semi-Finish)", id: "125"},
      {title: "250 uin (Roughing)", id: "250"},
      {title: "500 uin (Adaptive/HEM)", id: "500"},
      {title: "999 uin (Ignore Finish)", id: "999"}
    ],
    value      : "32",
    scope      : "post"
  },
  prismT11Aggressiveness: {
    title      : "T11: Aggressiveness (1-8)",
    description: "How hard should PRISM push? 1 = safest (longest tool life). 5 = balanced. 8 = fastest (maximum material removal). Start at 5 if unsure.",
    group      : "prismPocket11",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },
  // ===========================================================================
  // TOOL POCKET 12 (T12)
  // ===========================================================================
  prismT12Material: {
    title      : "T12: Tool Material",
    description: "Tool substrate.",
    group      : "prismPocket12",
    type       : "enum",
    values     : TOOL_MATERIAL_VALUES,
    value      : "carbide",
    scope      : "post"
  },
  prismT12Coating: {
    title      : "T12: Coating",
    description: "Tool coating.",
    group      : "prismPocket12",
    type       : "enum",
    values     : COATING_VALUES,
    value      : "tialn",
    scope      : "post"
  },
  prismT12Brand: {
    title      : "T12: Brand",
    description: "Tool manufacturer.",
    group      : "prismPocket12",
    type       : "enum",
    values     : BRAND_VALUES,
    value      : "generic",
    scope      : "post"
  },
  prismT12HolderType: {
    title      : "T12: Holder Type",
    description: "Tool holder style.",
    group      : "prismPocket12",
    type       : "enum",
    values     : HOLDER_TYPE_VALUES,
    value      : "er_collet",
    scope      : "post"
  },
  prismT12HolderExtension: {
    title      : "T12: Holder Extension (in)",
    description: "Holder projection from spindle face. For extended arbors, enter total length. 0=auto from tool body.",
    group      : "prismPocket12",
    type       : "number",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  prismT12Condition: {
    title      : "T12: Condition",
    description: "Tool wear state.",
    group      : "prismPocket12",
    type       : "enum",
    values     : [
      {title: "New", id: "new"},
      {title: "Good", id: "good"},
      {title: "Worn", id: "worn"},
      {title: "Regrind", id: "regrind"}
    ],
    value      : "new",
    scope      : "post"
  },
  prismT12SpeedPct: {
    title      : "T12: Speed %",
    description: "Speed multiplier (100=calculated).",
    group      : "prismPocket12",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT12FeedPct: {
    title      : "T12: Feed %",
    description: "Feed multiplier (100=calculated).",
    group      : "prismPocket12",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT12ApplyMultipliersTo: {
    title      : "T12: Apply Multipliers To",
    description: "Controls when Speed%/Feed% multipliers are applied. 'Milling Only' = skip drilling/tapping (recommended). 'All' = always apply. 'Off' = never apply (use Fusion feeds).",
    group      : "prismPocket12",
    type       : "enum",
    values     : [
      {title: "Milling Only (Skip Drilling)", id: "milling_only"},
      {title: "All Operations", id: "all"},
      {title: "Off (Use Fusion Programmed)", id: "off"}
    ],
    value      : "milling_only",
    scope      : "post"
  },
  prismT12Indexable: {
    title      : "T12: Indexable Insert Tool",
    description: "Enable indexable insert parameters for this tool (face mills, indexable endmills, high-feed, etc).",
    group      : "prismPocket12",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismT12InsertStyle: {
    title      : "T12: Insert Cutter Style",
    description: "Type of indexable cutter.",
    group      : "prismPocket12",
    type       : "enum",
    values     : [
      {title: "Face Mill (45 deg lead)", id: "face_mill_45"},
      {title: "Face Mill (90 deg lead)", id: "face_mill_90"},
      {title: "High Feed Mill (10-17 deg)", id: "high_feed"},
      {title: "Shoulder/Square Mill (90 deg)", id: "shoulder_90"},
      {title: "Button Cutter (Round)", id: "button"},
      {title: "Indexable Ball", id: "ball"},
      {title: "Indexable Drill", id: "drill"},
      {title: "Chamfer Mill", id: "chamfer"},
      {title: "Slot Mill", id: "slot"},
      {title: "Copy Mill / 3D", id: "copy"}
    ],
    value      : "face_mill_45",
    scope      : "post"
  },
  prismT12LeadAngle: {
    title      : "T12: Lead/Entry Angle",
    description: "Insert approach angle. Affects chip thickness and axial force. High-feed uses 10-17 deg.",
    group      : "prismPocket12",
    type       : "enum",
    values     : [
      {title: "90 deg (Square shoulder)", id: "90"},
      {title: "75 deg", id: "75"},
      {title: "65 deg", id: "65"},
      {title: "60 deg", id: "60"},
      {title: "45 deg (Common face mill)", id: "45"},
      {title: "30 deg", id: "30"},
      {title: "20 deg", id: "20"},
      {title: "17 deg (High feed)", id: "17"},
      {title: "15 deg", id: "15"},
      {title: "12 deg (High feed)", id: "12"},
      {title: "10 deg (High feed)", id: "10"}
    ],
    value      : "45",
    scope      : "post"
  },
  prismT12InsertGrade: {
    title      : "T12: Insert Grade",
    description: "Carbide grade - select based on manufacturer or use generic ISO grades.",
    group      : "prismPocket12",
    type       : "enum",
    values     : INSERT_GRADE_VALUES,
    value      : "P20",
    scope      : "post"
  },
  prismT12InsertNoseR: {
    title      : "T12: Insert Nose Radius",
    description: "Corner radius in mm. Enter your insert nose radius (e.g. 0.4, 0.8, 1.2). Larger = higher feed possible, rougher finish.",
    group      : "prismPocket12",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  prismT12Coolant: {
    title      : "T12: Coolant Strategy",
    description: "Coolant output for this tool. Override per operation or use tool default.",
    group      : "prismPocket12",
    type       : "enum",
    values     : [
      {title: "Use Fusion Setting", id: "fusion"},
      {title: "Flood (M8)", id: "flood"},
      {title: "Mist (M7)", id: "mist"},
      {title: "Flood + Mist (M7 M8)", id: "flood_mist"},
      {title: "Through Spindle (M88)", id: "thru_spindle"},
      {title: "Through Spindle HP", id: "thru_spindle_hp"},
      {title: "Air Blast (M51)", id: "air"},
      {title: "Air + Mist (MQL)", id: "mql"},
      {title: "Vacuum / Dust Collection", id: "vacuum"},
      {title: "Off / Dry (M9)", id: "off"}
    ],
    value      : "fusion",
    scope      : "post"
  },
  prismT12Strategy: {
    title      : "T12: Machining Strategy",
    description: "Unified machining strategy. ROUGHING: HEM/HSM/Aggressive/Balanced/Conservative. FINISHING: Surface/Accuracy/Balanced/Productivity. Auto=detect from Fusion operation type.",
    group      : "prismPocket12",
    type       : "enum",
        values     : [
      {title: "Auto-Detect", id: "auto"},
      {title: "=== ROUGHING ===", id: "_rough_header"},
      {title: "HEM - High Efficiency Milling", id: "hem"},
      {title: "HSM - High Speed Machining", id: "hsm"},
      {title: "Aggressive (Max MRR)", id: "aggressive"},
      {title: "Balanced Roughing", id: "balanced"},
      {title: "Conservative (Tool Life)", id: "conservative"},
      {title: "=== FINISHING ===", id: "_finish_header"},
      {title: "Finish - Surface Quality", id: "finish"},
      {title: "Finish - Accuracy Priority", id: "accuracy"},
      {title: "Finish - Balanced", id: "finish_balanced"},
      {title: "Finish - Productivity", id: "finish_productivity"},
      {title: "=== OTHER ===", id: "_other_header"},
      {title: "Off (Use Programmed)", id: "off"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismT12MaxChipThinMult: {
    title      : "T12: Max Chip Thinning Mult",
    description: "Maximum feed increase from chip thinning. At 10% WOC theoretical is 3.2x. Cap for safety. Overrides global setting.",
    group      : "prismPocket12",
    type       : "number",
    range      : [1.0, 4.0],
    value      : 2.5,
    scope      : "post"
  },
  prismT12DeflectionLimit: {
    title      : "T12: Max Deflection (in)",
    description: "Feed reduced when calculated deflection exceeds this. 0.001-0.002 for finish, 0.003-0.005 for rough.",
    group      : "prismPocket12",
    type       : "number",
    range      : [0.0005, 0.010],
    value      : 0.002,
    scope      : "post"
  },
  prismT12TargetRa: {
    title      : "T12: Target Ra (uin)",
    description: "Target surface roughness in microinches. 16=fine finish, 32=good, 63=standard, 125=rough finish.",
    group      : "prismPocket12",
    type       : "enum",
    values     : [
      {title: "8 uin (Mirror/Lapped)", id: "8"},
      {title: "16 uin (Fine Finish)", id: "16"},
      {title: "32 uin (Good Finish)", id: "32"},
      {title: "63 uin (Standard)", id: "63"},
      {title: "125 uin (Semi-Finish)", id: "125"},
      {title: "250 uin (Roughing)", id: "250"},
      {title: "500 uin (Adaptive/HEM)", id: "500"},
      {title: "999 uin (Ignore Finish)", id: "999"}
    ],
    value      : "32",
    scope      : "post"
  },
  prismT12Aggressiveness: {
    title      : "T12: Aggressiveness (1-8)",
    description: "How hard should PRISM push? 1 = safest (longest tool life). 5 = balanced. 8 = fastest (maximum material removal). Start at 5 if unsure.",
    group      : "prismPocket12",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },
  // ===========================================================================
  // TOOL POCKET 13 (T13)
  // ===========================================================================
  prismT13Material: {
    title      : "T13: Tool Material",
    description: "Tool substrate.",
    group      : "prismPocket13",
    type       : "enum",
    values     : TOOL_MATERIAL_VALUES,
    value      : "carbide",
    scope      : "post"
  },
  prismT13Coating: {
    title      : "T13: Coating",
    description: "Tool coating.",
    group      : "prismPocket13",
    type       : "enum",
    values     : COATING_VALUES,
    value      : "tialn",
    scope      : "post"
  },
  prismT13Brand: {
    title      : "T13: Brand",
    description: "Tool manufacturer.",
    group      : "prismPocket13",
    type       : "enum",
    values     : BRAND_VALUES,
    value      : "generic",
    scope      : "post"
  },
  prismT13HolderType: {
    title      : "T13: Holder Type",
    description: "Tool holder style.",
    group      : "prismPocket13",
    type       : "enum",
    values     : HOLDER_TYPE_VALUES,
    value      : "er_collet",
    scope      : "post"
  },
  prismT13HolderExtension: {
    title      : "T13: Holder Extension (in)",
    description: "Holder projection from spindle face. For extended arbors, enter total length. 0=auto from tool body.",
    group      : "prismPocket13",
    type       : "number",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  prismT13Condition: {
    title      : "T13: Condition",
    description: "Tool wear state.",
    group      : "prismPocket13",
    type       : "enum",
    values     : [
      {title: "New", id: "new"},
      {title: "Good", id: "good"},
      {title: "Worn", id: "worn"},
      {title: "Regrind", id: "regrind"}
    ],
    value      : "new",
    scope      : "post"
  },
  prismT13SpeedPct: {
    title      : "T13: Speed %",
    description: "Speed multiplier (100=calculated).",
    group      : "prismPocket13",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT13FeedPct: {
    title      : "T13: Feed %",
    description: "Feed multiplier (100=calculated).",
    group      : "prismPocket13",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT13ApplyMultipliersTo: {
    title      : "T13: Apply Multipliers To",
    description: "Controls when Speed%/Feed% multipliers are applied. 'Milling Only' = skip drilling/tapping (recommended). 'All' = always apply. 'Off' = never apply (use Fusion feeds).",
    group      : "prismPocket13",
    type       : "enum",
    values     : [
      {title: "Milling Only (Skip Drilling)", id: "milling_only"},
      {title: "All Operations", id: "all"},
      {title: "Off (Use Fusion Programmed)", id: "off"}
    ],
    value      : "milling_only",
    scope      : "post"
  },
  prismT13Indexable: {
    title      : "T13: Indexable Insert Tool",
    description: "Enable indexable insert parameters for this tool (face mills, indexable endmills, high-feed, etc).",
    group      : "prismPocket13",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismT13InsertStyle: {
    title      : "T13: Insert Cutter Style",
    description: "Type of indexable cutter.",
    group      : "prismPocket13",
    type       : "enum",
    values     : [
      {title: "Face Mill (45 deg lead)", id: "face_mill_45"},
      {title: "Face Mill (90 deg lead)", id: "face_mill_90"},
      {title: "High Feed Mill (10-17 deg)", id: "high_feed"},
      {title: "Shoulder/Square Mill (90 deg)", id: "shoulder_90"},
      {title: "Button Cutter (Round)", id: "button"},
      {title: "Indexable Ball", id: "ball"},
      {title: "Indexable Drill", id: "drill"},
      {title: "Chamfer Mill", id: "chamfer"},
      {title: "Slot Mill", id: "slot"},
      {title: "Copy Mill / 3D", id: "copy"}
    ],
    value      : "face_mill_45",
    scope      : "post"
  },
  prismT13LeadAngle: {
    title      : "T13: Lead/Entry Angle",
    description: "Insert approach angle. Affects chip thickness and axial force. High-feed uses 10-17 deg.",
    group      : "prismPocket13",
    type       : "enum",
    values     : [
      {title: "90 deg (Square shoulder)", id: "90"},
      {title: "75 deg", id: "75"},
      {title: "65 deg", id: "65"},
      {title: "60 deg", id: "60"},
      {title: "45 deg (Common face mill)", id: "45"},
      {title: "30 deg", id: "30"},
      {title: "20 deg", id: "20"},
      {title: "17 deg (High feed)", id: "17"},
      {title: "15 deg", id: "15"},
      {title: "12 deg (High feed)", id: "12"},
      {title: "10 deg (High feed)", id: "10"}
    ],
    value      : "45",
    scope      : "post"
  },
  prismT13InsertGrade: {
    title      : "T13: Insert Grade",
    description: "Carbide grade - select based on manufacturer or use generic ISO grades.",
    group      : "prismPocket13",
    type       : "enum",
    values     : INSERT_GRADE_VALUES,
    value      : "P20",
    scope      : "post"
  },
  prismT13InsertNoseR: {
    title      : "T13: Insert Nose Radius",
    description: "Corner radius in mm. Enter your insert nose radius (e.g. 0.4, 0.8, 1.2). Larger = higher feed possible, rougher finish.",
    group      : "prismPocket13",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  prismT13Coolant: {
    title      : "T13: Coolant Strategy",
    description: "Coolant output for this tool. Override per operation or use tool default.",
    group      : "prismPocket13",
    type       : "enum",
    values     : [
      {title: "Use Fusion Setting", id: "fusion"},
      {title: "Flood (M8)", id: "flood"},
      {title: "Mist (M7)", id: "mist"},
      {title: "Flood + Mist (M7 M8)", id: "flood_mist"},
      {title: "Through Spindle (M88)", id: "thru_spindle"},
      {title: "Through Spindle HP", id: "thru_spindle_hp"},
      {title: "Air Blast (M51)", id: "air"},
      {title: "Air + Mist (MQL)", id: "mql"},
      {title: "Vacuum / Dust Collection", id: "vacuum"},
      {title: "Off / Dry (M9)", id: "off"}
    ],
    value      : "fusion",
    scope      : "post"
  },
  prismT13Strategy: {
    title      : "T13: Machining Strategy",
    description: "Unified machining strategy. ROUGHING: HEM/HSM/Aggressive/Balanced/Conservative. FINISHING: Surface/Accuracy/Balanced/Productivity. Auto=detect from Fusion operation type.",
    group      : "prismPocket13",
    type       : "enum",
        values     : [
      {title: "Auto-Detect", id: "auto"},
      {title: "=== ROUGHING ===", id: "_rough_header"},
      {title: "HEM - High Efficiency Milling", id: "hem"},
      {title: "HSM - High Speed Machining", id: "hsm"},
      {title: "Aggressive (Max MRR)", id: "aggressive"},
      {title: "Balanced Roughing", id: "balanced"},
      {title: "Conservative (Tool Life)", id: "conservative"},
      {title: "=== FINISHING ===", id: "_finish_header"},
      {title: "Finish - Surface Quality", id: "finish"},
      {title: "Finish - Accuracy Priority", id: "accuracy"},
      {title: "Finish - Balanced", id: "finish_balanced"},
      {title: "Finish - Productivity", id: "finish_productivity"},
      {title: "=== OTHER ===", id: "_other_header"},
      {title: "Off (Use Programmed)", id: "off"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismT13MaxChipThinMult: {
    title      : "T13: Max Chip Thinning Mult",
    description: "Maximum feed increase from chip thinning. At 10% WOC theoretical is 3.2x. Cap for safety. Overrides global setting.",
    group      : "prismPocket13",
    type       : "number",
    range      : [1.0, 4.0],
    value      : 2.5,
    scope      : "post"
  },
  prismT13DeflectionLimit: {
    title      : "T13: Max Deflection (in)",
    description: "Feed reduced when calculated deflection exceeds this. 0.001-0.002 for finish, 0.003-0.005 for rough.",
    group      : "prismPocket13",
    type       : "number",
    range      : [0.0005, 0.010],
    value      : 0.002,
    scope      : "post"
  },
  prismT13TargetRa: {
    title      : "T13: Target Ra (uin)",
    description: "Target surface roughness in microinches. 16=fine finish, 32=good, 63=standard, 125=rough finish.",
    group      : "prismPocket13",
    type       : "enum",
    values     : [
      {title: "8 uin (Mirror/Lapped)", id: "8"},
      {title: "16 uin (Fine Finish)", id: "16"},
      {title: "32 uin (Good Finish)", id: "32"},
      {title: "63 uin (Standard)", id: "63"},
      {title: "125 uin (Semi-Finish)", id: "125"},
      {title: "250 uin (Roughing)", id: "250"},
      {title: "500 uin (Adaptive/HEM)", id: "500"},
      {title: "999 uin (Ignore Finish)", id: "999"}
    ],
    value      : "32",
    scope      : "post"
  },
  prismT13Aggressiveness: {
    title      : "T13: Aggressiveness (1-8)",
    description: "How hard should PRISM push? 1 = safest (longest tool life). 5 = balanced. 8 = fastest (maximum material removal). Start at 5 if unsure.",
    group      : "prismPocket13",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },
  // ===========================================================================
  // TOOL POCKET 14 (T14)
  // ===========================================================================
  prismT14Material: {
    title      : "T14: Tool Material",
    description: "Tool substrate.",
    group      : "prismPocket14",
    type       : "enum",
    values     : TOOL_MATERIAL_VALUES,
    value      : "carbide",
    scope      : "post"
  },
  prismT14Coating: {
    title      : "T14: Coating",
    description: "Tool coating.",
    group      : "prismPocket14",
    type       : "enum",
    values     : COATING_VALUES,
    value      : "tialn",
    scope      : "post"
  },
  prismT14Brand: {
    title      : "T14: Brand",
    description: "Tool manufacturer.",
    group      : "prismPocket14",
    type       : "enum",
    values     : BRAND_VALUES,
    value      : "generic",
    scope      : "post"
  },
  prismT14HolderType: {
    title      : "T14: Holder Type",
    description: "Tool holder style.",
    group      : "prismPocket14",
    type       : "enum",
    values     : HOLDER_TYPE_VALUES,
    value      : "er_collet",
    scope      : "post"
  },
  prismT14HolderExtension: {
    title      : "T14: Holder Extension (in)",
    description: "Holder projection from spindle face. For extended arbors, enter total length. 0=auto from tool body.",
    group      : "prismPocket14",
    type       : "number",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  prismT14Condition: {
    title      : "T14: Condition",
    description: "Tool wear state.",
    group      : "prismPocket14",
    type       : "enum",
    values     : [
      {title: "New", id: "new"},
      {title: "Good", id: "good"},
      {title: "Worn", id: "worn"},
      {title: "Regrind", id: "regrind"}
    ],
    value      : "new",
    scope      : "post"
  },
  prismT14SpeedPct: {
    title      : "T14: Speed %",
    description: "Speed multiplier (100=calculated).",
    group      : "prismPocket14",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT14FeedPct: {
    title      : "T14: Feed %",
    description: "Feed multiplier (100=calculated).",
    group      : "prismPocket14",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT14ApplyMultipliersTo: {
    title      : "T14: Apply Multipliers To",
    description: "Controls when Speed%/Feed% multipliers are applied. 'Milling Only' = skip drilling/tapping (recommended). 'All' = always apply. 'Off' = never apply (use Fusion feeds).",
    group      : "prismPocket14",
    type       : "enum",
    values     : [
      {title: "Milling Only (Skip Drilling)", id: "milling_only"},
      {title: "All Operations", id: "all"},
      {title: "Off (Use Fusion Programmed)", id: "off"}
    ],
    value      : "milling_only",
    scope      : "post"
  },
  prismT14Indexable: {
    title      : "T14: Indexable Insert Tool",
    description: "Enable indexable insert parameters for this tool (face mills, indexable endmills, high-feed, etc).",
    group      : "prismPocket14",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismT14InsertStyle: {
    title      : "T14: Insert Cutter Style",
    description: "Type of indexable cutter.",
    group      : "prismPocket14",
    type       : "enum",
    values     : [
      {title: "Face Mill (45 deg lead)", id: "face_mill_45"},
      {title: "Face Mill (90 deg lead)", id: "face_mill_90"},
      {title: "High Feed Mill (10-17 deg)", id: "high_feed"},
      {title: "Shoulder/Square Mill (90 deg)", id: "shoulder_90"},
      {title: "Button Cutter (Round)", id: "button"},
      {title: "Indexable Ball", id: "ball"},
      {title: "Indexable Drill", id: "drill"},
      {title: "Chamfer Mill", id: "chamfer"},
      {title: "Slot Mill", id: "slot"},
      {title: "Copy Mill / 3D", id: "copy"}
    ],
    value      : "face_mill_45",
    scope      : "post"
  },
  prismT14LeadAngle: {
    title      : "T14: Lead/Entry Angle",
    description: "Insert approach angle. Affects chip thickness and axial force. High-feed uses 10-17 deg.",
    group      : "prismPocket14",
    type       : "enum",
    values     : [
      {title: "90 deg (Square shoulder)", id: "90"},
      {title: "75 deg", id: "75"},
      {title: "65 deg", id: "65"},
      {title: "60 deg", id: "60"},
      {title: "45 deg (Common face mill)", id: "45"},
      {title: "30 deg", id: "30"},
      {title: "20 deg", id: "20"},
      {title: "17 deg (High feed)", id: "17"},
      {title: "15 deg", id: "15"},
      {title: "12 deg (High feed)", id: "12"},
      {title: "10 deg (High feed)", id: "10"}
    ],
    value      : "45",
    scope      : "post"
  },
  prismT14InsertGrade: {
    title      : "T14: Insert Grade",
    description: "Carbide grade - select based on manufacturer or use generic ISO grades.",
    group      : "prismPocket14",
    type       : "enum",
    values     : INSERT_GRADE_VALUES,
    value      : "P20",
    scope      : "post"
  },
  prismT14InsertNoseR: {
    title      : "T14: Insert Nose Radius",
    description: "Corner radius in mm. Enter your insert nose radius (e.g. 0.4, 0.8, 1.2). Larger = higher feed possible, rougher finish.",
    group      : "prismPocket14",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  prismT14Coolant: {
    title      : "T14: Coolant Strategy",
    description: "Coolant output for this tool. Override per operation or use tool default.",
    group      : "prismPocket14",
    type       : "enum",
    values     : [
      {title: "Use Fusion Setting", id: "fusion"},
      {title: "Flood (M8)", id: "flood"},
      {title: "Mist (M7)", id: "mist"},
      {title: "Flood + Mist (M7 M8)", id: "flood_mist"},
      {title: "Through Spindle (M88)", id: "thru_spindle"},
      {title: "Through Spindle HP", id: "thru_spindle_hp"},
      {title: "Air Blast (M51)", id: "air"},
      {title: "Air + Mist (MQL)", id: "mql"},
      {title: "Vacuum / Dust Collection", id: "vacuum"},
      {title: "Off / Dry (M9)", id: "off"}
    ],
    value      : "fusion",
    scope      : "post"
  },
  prismT14Strategy: {
    title      : "T14: Machining Strategy",
    description: "Unified machining strategy. ROUGHING: HEM/HSM/Aggressive/Balanced/Conservative. FINISHING: Surface/Accuracy/Balanced/Productivity. Auto=detect from Fusion operation type.",
    group      : "prismPocket14",
    type       : "enum",
        values     : [
      {title: "Auto-Detect", id: "auto"},
      {title: "=== ROUGHING ===", id: "_rough_header"},
      {title: "HEM - High Efficiency Milling", id: "hem"},
      {title: "HSM - High Speed Machining", id: "hsm"},
      {title: "Aggressive (Max MRR)", id: "aggressive"},
      {title: "Balanced Roughing", id: "balanced"},
      {title: "Conservative (Tool Life)", id: "conservative"},
      {title: "=== FINISHING ===", id: "_finish_header"},
      {title: "Finish - Surface Quality", id: "finish"},
      {title: "Finish - Accuracy Priority", id: "accuracy"},
      {title: "Finish - Balanced", id: "finish_balanced"},
      {title: "Finish - Productivity", id: "finish_productivity"},
      {title: "=== OTHER ===", id: "_other_header"},
      {title: "Off (Use Programmed)", id: "off"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismT14MaxChipThinMult: {
    title      : "T14: Max Chip Thinning Mult",
    description: "Maximum feed increase from chip thinning. At 10% WOC theoretical is 3.2x. Cap for safety. Overrides global setting.",
    group      : "prismPocket14",
    type       : "number",
    range      : [1.0, 4.0],
    value      : 2.5,
    scope      : "post"
  },
  prismT14DeflectionLimit: {
    title      : "T14: Max Deflection (in)",
    description: "Feed reduced when calculated deflection exceeds this. 0.001-0.002 for finish, 0.003-0.005 for rough.",
    group      : "prismPocket14",
    type       : "number",
    range      : [0.0005, 0.010],
    value      : 0.002,
    scope      : "post"
  },
  prismT14TargetRa: {
    title      : "T14: Target Ra (uin)",
    description: "Target surface roughness in microinches. 16=fine finish, 32=good, 63=standard, 125=rough finish.",
    group      : "prismPocket14",
    type       : "enum",
    values     : [
      {title: "8 uin (Mirror/Lapped)", id: "8"},
      {title: "16 uin (Fine Finish)", id: "16"},
      {title: "32 uin (Good Finish)", id: "32"},
      {title: "63 uin (Standard)", id: "63"},
      {title: "125 uin (Semi-Finish)", id: "125"},
      {title: "250 uin (Roughing)", id: "250"},
      {title: "500 uin (Adaptive/HEM)", id: "500"},
      {title: "999 uin (Ignore Finish)", id: "999"}
    ],
    value      : "32",
    scope      : "post"
  },
  prismT14Aggressiveness: {
    title      : "T14: Aggressiveness (1-8)",
    description: "How hard should PRISM push? 1 = safest (longest tool life). 5 = balanced. 8 = fastest (maximum material removal). Start at 5 if unsure.",
    group      : "prismPocket14",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },
  // ===========================================================================
  // TOOL POCKET 15 (T15)
  // ===========================================================================
  prismT15Material: {
    title      : "T15: Tool Material",
    description: "Tool substrate.",
    group      : "prismPocket15",
    type       : "enum",
    values     : TOOL_MATERIAL_VALUES,
    value      : "carbide",
    scope      : "post"
  },
  prismT15Coating: {
    title      : "T15: Coating",
    description: "Tool coating.",
    group      : "prismPocket15",
    type       : "enum",
    values     : COATING_VALUES,
    value      : "tialn",
    scope      : "post"
  },
  prismT15Brand: {
    title      : "T15: Brand",
    description: "Tool manufacturer.",
    group      : "prismPocket15",
    type       : "enum",
    values     : BRAND_VALUES,
    value      : "generic",
    scope      : "post"
  },
  prismT15HolderType: {
    title      : "T15: Holder Type",
    description: "Tool holder style.",
    group      : "prismPocket15",
    type       : "enum",
    values     : HOLDER_TYPE_VALUES,
    value      : "er_collet",
    scope      : "post"
  },
  prismT15HolderExtension: {
    title      : "T15: Holder Extension (in)",
    description: "Holder projection from spindle face. For extended arbors, enter total length. 0=auto from tool body.",
    group      : "prismPocket15",
    type       : "number",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  prismT15Condition: {
    title      : "T15: Condition",
    description: "Tool wear state.",
    group      : "prismPocket15",
    type       : "enum",
    values     : [
      {title: "New", id: "new"},
      {title: "Good", id: "good"},
      {title: "Worn", id: "worn"},
      {title: "Regrind", id: "regrind"}
    ],
    value      : "new",
    scope      : "post"
  },
  prismT15SpeedPct: {
    title      : "T15: Speed %",
    description: "Speed multiplier (100=calculated).",
    group      : "prismPocket15",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT15FeedPct: {
    title      : "T15: Feed %",
    description: "Feed multiplier (100=calculated).",
    group      : "prismPocket15",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT15ApplyMultipliersTo: {
    title      : "T15: Apply Multipliers To",
    description: "Controls when Speed%/Feed% multipliers are applied. 'Milling Only' = skip drilling/tapping (recommended). 'All' = always apply. 'Off' = never apply (use Fusion feeds).",
    group      : "prismPocket15",
    type       : "enum",
    values     : [
      {title: "Milling Only (Skip Drilling)", id: "milling_only"},
      {title: "All Operations", id: "all"},
      {title: "Off (Use Fusion Programmed)", id: "off"}
    ],
    value      : "milling_only",
    scope      : "post"
  },
  prismT15Indexable: {
    title      : "T15: Indexable Insert Tool",
    description: "Enable indexable insert parameters for this tool (face mills, indexable endmills, high-feed, etc).",
    group      : "prismPocket15",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismT15InsertStyle: {
    title      : "T15: Insert Cutter Style",
    description: "Type of indexable cutter.",
    group      : "prismPocket15",
    type       : "enum",
    values     : [
      {title: "Face Mill (45 deg lead)", id: "face_mill_45"},
      {title: "Face Mill (90 deg lead)", id: "face_mill_90"},
      {title: "High Feed Mill (10-17 deg)", id: "high_feed"},
      {title: "Shoulder/Square Mill (90 deg)", id: "shoulder_90"},
      {title: "Button Cutter (Round)", id: "button"},
      {title: "Indexable Ball", id: "ball"},
      {title: "Indexable Drill", id: "drill"},
      {title: "Chamfer Mill", id: "chamfer"},
      {title: "Slot Mill", id: "slot"},
      {title: "Copy Mill / 3D", id: "copy"}
    ],
    value      : "face_mill_45",
    scope      : "post"
  },
  prismT15LeadAngle: {
    title      : "T15: Lead/Entry Angle",
    description: "Insert approach angle. Affects chip thickness and axial force. High-feed uses 10-17 deg.",
    group      : "prismPocket15",
    type       : "enum",
    values     : [
      {title: "90 deg (Square shoulder)", id: "90"},
      {title: "75 deg", id: "75"},
      {title: "65 deg", id: "65"},
      {title: "60 deg", id: "60"},
      {title: "45 deg (Common face mill)", id: "45"},
      {title: "30 deg", id: "30"},
      {title: "20 deg", id: "20"},
      {title: "17 deg (High feed)", id: "17"},
      {title: "15 deg", id: "15"},
      {title: "12 deg (High feed)", id: "12"},
      {title: "10 deg (High feed)", id: "10"}
    ],
    value      : "45",
    scope      : "post"
  },
  prismT15InsertGrade: {
    title      : "T15: Insert Grade",
    description: "Carbide grade - select based on manufacturer or use generic ISO grades.",
    group      : "prismPocket15",
    type       : "enum",
    values     : INSERT_GRADE_VALUES,
    value      : "P20",
    scope      : "post"
  },
  prismT15InsertNoseR: {
    title      : "T15: Insert Nose Radius",
    description: "Corner radius in mm. Enter your insert nose radius (e.g. 0.4, 0.8, 1.2). Larger = higher feed possible, rougher finish.",
    group      : "prismPocket15",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  prismT15Coolant: {
    title      : "T15: Coolant Strategy",
    description: "Coolant output for this tool. Override per operation or use tool default.",
    group      : "prismPocket15",
    type       : "enum",
    values     : [
      {title: "Use Fusion Setting", id: "fusion"},
      {title: "Flood (M8)", id: "flood"},
      {title: "Mist (M7)", id: "mist"},
      {title: "Flood + Mist (M7 M8)", id: "flood_mist"},
      {title: "Through Spindle (M88)", id: "thru_spindle"},
      {title: "Through Spindle HP", id: "thru_spindle_hp"},
      {title: "Air Blast (M51)", id: "air"},
      {title: "Air + Mist (MQL)", id: "mql"},
      {title: "Vacuum / Dust Collection", id: "vacuum"},
      {title: "Off / Dry (M9)", id: "off"}
    ],
    value      : "fusion",
    scope      : "post"
  },
  prismT15Strategy: {
    title      : "T15: Machining Strategy",
    description: "Unified machining strategy. ROUGHING: HEM/HSM/Aggressive/Balanced/Conservative. FINISHING: Surface/Accuracy/Balanced/Productivity. Auto=detect from Fusion operation type.",
    group      : "prismPocket15",
    type       : "enum",
        values     : [
      {title: "Auto-Detect", id: "auto"},
      {title: "=== ROUGHING ===", id: "_rough_header"},
      {title: "HEM - High Efficiency Milling", id: "hem"},
      {title: "HSM - High Speed Machining", id: "hsm"},
      {title: "Aggressive (Max MRR)", id: "aggressive"},
      {title: "Balanced Roughing", id: "balanced"},
      {title: "Conservative (Tool Life)", id: "conservative"},
      {title: "=== FINISHING ===", id: "_finish_header"},
      {title: "Finish - Surface Quality", id: "finish"},
      {title: "Finish - Accuracy Priority", id: "accuracy"},
      {title: "Finish - Balanced", id: "finish_balanced"},
      {title: "Finish - Productivity", id: "finish_productivity"},
      {title: "=== OTHER ===", id: "_other_header"},
      {title: "Off (Use Programmed)", id: "off"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismT15MaxChipThinMult: {
    title      : "T15: Max Chip Thinning Mult",
    description: "Maximum feed increase from chip thinning. At 10% WOC theoretical is 3.2x. Cap for safety. Overrides global setting.",
    group      : "prismPocket15",
    type       : "number",
    range      : [1.0, 4.0],
    value      : 2.5,
    scope      : "post"
  },
  prismT15DeflectionLimit: {
    title      : "T15: Max Deflection (in)",
    description: "Feed reduced when calculated deflection exceeds this. 0.001-0.002 for finish, 0.003-0.005 for rough.",
    group      : "prismPocket15",
    type       : "number",
    range      : [0.0005, 0.010],
    value      : 0.002,
    scope      : "post"
  },
  prismT15TargetRa: {
    title      : "T15: Target Ra (uin)",
    description: "Target surface roughness in microinches. 16=fine finish, 32=good, 63=standard, 125=rough finish.",
    group      : "prismPocket15",
    type       : "enum",
    values     : [
      {title: "8 uin (Mirror/Lapped)", id: "8"},
      {title: "16 uin (Fine Finish)", id: "16"},
      {title: "32 uin (Good Finish)", id: "32"},
      {title: "63 uin (Standard)", id: "63"},
      {title: "125 uin (Semi-Finish)", id: "125"},
      {title: "250 uin (Roughing)", id: "250"},
      {title: "500 uin (Adaptive/HEM)", id: "500"},
      {title: "999 uin (Ignore Finish)", id: "999"}
    ],
    value      : "32",
    scope      : "post"
  },
  prismT15Aggressiveness: {
    title      : "T15: Aggressiveness (1-8)",
    description: "How hard should PRISM push? 1 = safest (longest tool life). 5 = balanced. 8 = fastest (maximum material removal). Start at 5 if unsure.",
    group      : "prismPocket15",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },
  // ===========================================================================
  // TOOL POCKET 16 (T16)
  // ===========================================================================
  prismT16Material: {
    title      : "T16: Tool Material",
    description: "Tool substrate.",
    group      : "prismPocket16",
    type       : "enum",
    values     : TOOL_MATERIAL_VALUES,
    value      : "carbide",
    scope      : "post"
  },
  prismT16Coating: {
    title      : "T16: Coating",
    description: "Tool coating.",
    group      : "prismPocket16",
    type       : "enum",
    values     : COATING_VALUES,
    value      : "tialn",
    scope      : "post"
  },
  prismT16Brand: {
    title      : "T16: Brand",
    description: "Tool manufacturer.",
    group      : "prismPocket16",
    type       : "enum",
    values     : BRAND_VALUES,
    value      : "generic",
    scope      : "post"
  },
  prismT16HolderType: {
    title      : "T16: Holder Type",
    description: "Tool holder style.",
    group      : "prismPocket16",
    type       : "enum",
    values     : HOLDER_TYPE_VALUES,
    value      : "er_collet",
    scope      : "post"
  },
  prismT16HolderExtension: {
    title      : "T16: Holder Extension (in)",
    description: "Holder projection from spindle face. For extended arbors, enter total length. 0=auto from tool body.",
    group      : "prismPocket16",
    type       : "number",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  prismT16Condition: {
    title      : "T16: Condition",
    description: "Tool wear state.",
    group      : "prismPocket16",
    type       : "enum",
    values     : [
      {title: "New", id: "new"},
      {title: "Good", id: "good"},
      {title: "Worn", id: "worn"},
      {title: "Regrind", id: "regrind"}
    ],
    value      : "new",
    scope      : "post"
  },
  prismT16SpeedPct: {
    title      : "T16: Speed %",
    description: "Speed multiplier (100=calculated).",
    group      : "prismPocket16",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT16FeedPct: {
    title      : "T16: Feed %",
    description: "Feed multiplier (100=calculated).",
    group      : "prismPocket16",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT16ApplyMultipliersTo: {
    title      : "T16: Apply Multipliers To",
    description: "Controls when Speed%/Feed% multipliers are applied. 'Milling Only' = skip drilling/tapping (recommended). 'All' = always apply. 'Off' = never apply (use Fusion feeds).",
    group      : "prismPocket16",
    type       : "enum",
    values     : [
      {title: "Milling Only (Skip Drilling)", id: "milling_only"},
      {title: "All Operations", id: "all"},
      {title: "Off (Use Fusion Programmed)", id: "off"}
    ],
    value      : "milling_only",
    scope      : "post"
  },
  prismT16Indexable: {
    title      : "T16: Indexable Insert Tool",
    description: "Enable indexable insert parameters for this tool (face mills, indexable endmills, high-feed, etc).",
    group      : "prismPocket16",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismT16InsertStyle: {
    title      : "T16: Insert Cutter Style",
    description: "Type of indexable cutter.",
    group      : "prismPocket16",
    type       : "enum",
    values     : [
      {title: "Face Mill (45 deg lead)", id: "face_mill_45"},
      {title: "Face Mill (90 deg lead)", id: "face_mill_90"},
      {title: "High Feed Mill (10-17 deg)", id: "high_feed"},
      {title: "Shoulder/Square Mill (90 deg)", id: "shoulder_90"},
      {title: "Button Cutter (Round)", id: "button"},
      {title: "Indexable Ball", id: "ball"},
      {title: "Indexable Drill", id: "drill"},
      {title: "Chamfer Mill", id: "chamfer"},
      {title: "Slot Mill", id: "slot"},
      {title: "Copy Mill / 3D", id: "copy"}
    ],
    value      : "face_mill_45",
    scope      : "post"
  },
  prismT16LeadAngle: {
    title      : "T16: Lead/Entry Angle",
    description: "Insert approach angle. Affects chip thickness and axial force. High-feed uses 10-17 deg.",
    group      : "prismPocket16",
    type       : "enum",
    values     : [
      {title: "90 deg (Square shoulder)", id: "90"},
      {title: "75 deg", id: "75"},
      {title: "65 deg", id: "65"},
      {title: "60 deg", id: "60"},
      {title: "45 deg (Common face mill)", id: "45"},
      {title: "30 deg", id: "30"},
      {title: "20 deg", id: "20"},
      {title: "17 deg (High feed)", id: "17"},
      {title: "15 deg", id: "15"},
      {title: "12 deg (High feed)", id: "12"},
      {title: "10 deg (High feed)", id: "10"}
    ],
    value      : "45",
    scope      : "post"
  },
  prismT16InsertGrade: {
    title      : "T16: Insert Grade",
    description: "Carbide grade - select based on manufacturer or use generic ISO grades.",
    group      : "prismPocket16",
    type       : "enum",
    values     : INSERT_GRADE_VALUES,
    value      : "P20",
    scope      : "post"
  },
  prismT16InsertNoseR: {
    title      : "T16: Insert Nose Radius",
    description: "Corner radius in mm. Enter your insert nose radius (e.g. 0.4, 0.8, 1.2). Larger = higher feed possible, rougher finish.",
    group      : "prismPocket16",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  prismT16Coolant: {
    title      : "T16: Coolant Strategy",
    description: "Coolant output for this tool. Override per operation or use tool default.",
    group      : "prismPocket16",
    type       : "enum",
    values     : [
      {title: "Use Fusion Setting", id: "fusion"},
      {title: "Flood (M8)", id: "flood"},
      {title: "Mist (M7)", id: "mist"},
      {title: "Flood + Mist (M7 M8)", id: "flood_mist"},
      {title: "Through Spindle (M88)", id: "thru_spindle"},
      {title: "Through Spindle HP", id: "thru_spindle_hp"},
      {title: "Air Blast (M51)", id: "air"},
      {title: "Air + Mist (MQL)", id: "mql"},
      {title: "Vacuum / Dust Collection", id: "vacuum"},
      {title: "Off / Dry (M9)", id: "off"}
    ],
    value      : "fusion",
    scope      : "post"
  },
  prismT16Strategy: {
    title      : "T16: Machining Strategy",
    description: "Unified machining strategy. ROUGHING: HEM/HSM/Aggressive/Balanced/Conservative. FINISHING: Surface/Accuracy/Balanced/Productivity. Auto=detect from Fusion operation type.",
    group      : "prismPocket16",
    type       : "enum",
        values     : [
      {title: "Auto-Detect", id: "auto"},
      {title: "=== ROUGHING ===", id: "_rough_header"},
      {title: "HEM - High Efficiency Milling", id: "hem"},
      {title: "HSM - High Speed Machining", id: "hsm"},
      {title: "Aggressive (Max MRR)", id: "aggressive"},
      {title: "Balanced Roughing", id: "balanced"},
      {title: "Conservative (Tool Life)", id: "conservative"},
      {title: "=== FINISHING ===", id: "_finish_header"},
      {title: "Finish - Surface Quality", id: "finish"},
      {title: "Finish - Accuracy Priority", id: "accuracy"},
      {title: "Finish - Balanced", id: "finish_balanced"},
      {title: "Finish - Productivity", id: "finish_productivity"},
      {title: "=== OTHER ===", id: "_other_header"},
      {title: "Off (Use Programmed)", id: "off"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismT16MaxChipThinMult: {
    title      : "T16: Max Chip Thinning Mult",
    description: "Maximum feed increase from chip thinning. At 10% WOC theoretical is 3.2x. Cap for safety. Overrides global setting.",
    group      : "prismPocket16",
    type       : "number",
    range      : [1.0, 4.0],
    value      : 2.5,
    scope      : "post"
  },
  prismT16DeflectionLimit: {
    title      : "T16: Max Deflection (in)",
    description: "Feed reduced when calculated deflection exceeds this. 0.001-0.002 for finish, 0.003-0.005 for rough.",
    group      : "prismPocket16",
    type       : "number",
    range      : [0.0005, 0.010],
    value      : 0.002,
    scope      : "post"
  },
  prismT16TargetRa: {
    title      : "T16: Target Ra (uin)",
    description: "Target surface roughness in microinches. 16=fine finish, 32=good, 63=standard, 125=rough finish.",
    group      : "prismPocket16",
    type       : "enum",
    values     : [
      {title: "8 uin (Mirror/Lapped)", id: "8"},
      {title: "16 uin (Fine Finish)", id: "16"},
      {title: "32 uin (Good Finish)", id: "32"},
      {title: "63 uin (Standard)", id: "63"},
      {title: "125 uin (Semi-Finish)", id: "125"},
      {title: "250 uin (Roughing)", id: "250"},
      {title: "500 uin (Adaptive/HEM)", id: "500"},
      {title: "999 uin (Ignore Finish)", id: "999"}
    ],
    value      : "32",
    scope      : "post"
  },
  prismT16Aggressiveness: {
    title      : "T16: Aggressiveness (1-8)",
    description: "How hard should PRISM push? 1 = safest (longest tool life). 5 = balanced. 8 = fastest (maximum material removal). Start at 5 if unsure.",
    group      : "prismPocket16",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },
  // ===========================================================================
  // TOOL POCKET 17 (T17)
  // ===========================================================================
  prismT17Material: {
    title      : "T17: Tool Material",
    description: "Tool substrate.",
    group      : "prismPocket17",
    type       : "enum",
    values     : TOOL_MATERIAL_VALUES,
    value      : "carbide",
    scope      : "post"
  },
  prismT17Coating: {
    title      : "T17: Coating",
    description: "Tool coating.",
    group      : "prismPocket17",
    type       : "enum",
    values     : COATING_VALUES,
    value      : "tialn",
    scope      : "post"
  },
  prismT17Brand: {
    title      : "T17: Brand",
    description: "Tool manufacturer.",
    group      : "prismPocket17",
    type       : "enum",
    values     : BRAND_VALUES,
    value      : "generic",
    scope      : "post"
  },
  prismT17HolderType: {
    title      : "T17: Holder Type",
    description: "Tool holder style.",
    group      : "prismPocket17",
    type       : "enum",
    values     : HOLDER_TYPE_VALUES,
    value      : "er_collet",
    scope      : "post"
  },
  prismT17HolderExtension: {
    title      : "T17: Holder Extension (in)",
    description: "Holder projection from spindle face. For extended arbors, enter total length. 0=auto from tool body.",
    group      : "prismPocket17",
    type       : "number",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  prismT17Condition: {
    title      : "T17: Condition",
    description: "Tool wear state.",
    group      : "prismPocket17",
    type       : "enum",
    values     : [
      {title: "New", id: "new"},
      {title: "Good", id: "good"},
      {title: "Worn", id: "worn"},
      {title: "Regrind", id: "regrind"}
    ],
    value      : "new",
    scope      : "post"
  },
  prismT17SpeedPct: {
    title      : "T17: Speed %",
    description: "Speed multiplier (100=calculated).",
    group      : "prismPocket17",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT17FeedPct: {
    title      : "T17: Feed %",
    description: "Feed multiplier (100=calculated).",
    group      : "prismPocket17",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT17ApplyMultipliersTo: {
    title      : "T17: Apply Multipliers To",
    description: "Controls when Speed%/Feed% multipliers are applied. 'Milling Only' = skip drilling/tapping (recommended). 'All' = always apply. 'Off' = never apply (use Fusion feeds).",
    group      : "prismPocket17",
    type       : "enum",
    values     : [
      {title: "Milling Only (Skip Drilling)", id: "milling_only"},
      {title: "All Operations", id: "all"},
      {title: "Off (Use Fusion Programmed)", id: "off"}
    ],
    value      : "milling_only",
    scope      : "post"
  },
  prismT17Indexable: {
    title      : "T17: Indexable Insert Tool",
    description: "Enable indexable insert parameters for this tool (face mills, indexable endmills, high-feed, etc).",
    group      : "prismPocket17",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismT17InsertStyle: {
    title      : "T17: Insert Cutter Style",
    description: "Type of indexable cutter.",
    group      : "prismPocket17",
    type       : "enum",
    values     : [
      {title: "Face Mill (45 deg lead)", id: "face_mill_45"},
      {title: "Face Mill (90 deg lead)", id: "face_mill_90"},
      {title: "High Feed Mill (10-17 deg)", id: "high_feed"},
      {title: "Shoulder/Square Mill (90 deg)", id: "shoulder_90"},
      {title: "Button Cutter (Round)", id: "button"},
      {title: "Indexable Ball", id: "ball"},
      {title: "Indexable Drill", id: "drill"},
      {title: "Chamfer Mill", id: "chamfer"},
      {title: "Slot Mill", id: "slot"},
      {title: "Copy Mill / 3D", id: "copy"}
    ],
    value      : "face_mill_45",
    scope      : "post"
  },
  prismT17LeadAngle: {
    title      : "T17: Lead/Entry Angle",
    description: "Insert approach angle. Affects chip thickness and axial force. High-feed uses 10-17 deg.",
    group      : "prismPocket17",
    type       : "enum",
    values     : [
      {title: "90 deg (Square shoulder)", id: "90"},
      {title: "75 deg", id: "75"},
      {title: "65 deg", id: "65"},
      {title: "60 deg", id: "60"},
      {title: "45 deg (Common face mill)", id: "45"},
      {title: "30 deg", id: "30"},
      {title: "20 deg", id: "20"},
      {title: "17 deg (High feed)", id: "17"},
      {title: "15 deg", id: "15"},
      {title: "12 deg (High feed)", id: "12"},
      {title: "10 deg (High feed)", id: "10"}
    ],
    value      : "45",
    scope      : "post"
  },
  prismT17InsertGrade: {
    title      : "T17: Insert Grade",
    description: "Carbide grade - select based on manufacturer or use generic ISO grades.",
    group      : "prismPocket17",
    type       : "enum",
    values     : INSERT_GRADE_VALUES,
    value      : "P20",
    scope      : "post"
  },
  prismT17InsertNoseR: {
    title      : "T17: Insert Nose Radius",
    description: "Corner radius in mm. Enter your insert nose radius (e.g. 0.4, 0.8, 1.2). Larger = higher feed possible, rougher finish.",
    group      : "prismPocket17",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  prismT17Coolant: {
    title      : "T17: Coolant Strategy",
    description: "Coolant output for this tool. Override per operation or use tool default.",
    group      : "prismPocket17",
    type       : "enum",
    values     : [
      {title: "Use Fusion Setting", id: "fusion"},
      {title: "Flood (M8)", id: "flood"},
      {title: "Mist (M7)", id: "mist"},
      {title: "Flood + Mist (M7 M8)", id: "flood_mist"},
      {title: "Through Spindle (M88)", id: "thru_spindle"},
      {title: "Through Spindle HP", id: "thru_spindle_hp"},
      {title: "Air Blast (M51)", id: "air"},
      {title: "Air + Mist (MQL)", id: "mql"},
      {title: "Vacuum / Dust Collection", id: "vacuum"},
      {title: "Off / Dry (M9)", id: "off"}
    ],
    value      : "fusion",
    scope      : "post"
  },
  prismT17Strategy: {
    title      : "T17: Machining Strategy",
    description: "Unified machining strategy. ROUGHING: HEM/HSM/Aggressive/Balanced/Conservative. FINISHING: Surface/Accuracy/Balanced/Productivity. Auto=detect from Fusion operation type.",
    group      : "prismPocket17",
    type       : "enum",
        values     : [
      {title: "Auto-Detect", id: "auto"},
      {title: "=== ROUGHING ===", id: "_rough_header"},
      {title: "HEM - High Efficiency Milling", id: "hem"},
      {title: "HSM - High Speed Machining", id: "hsm"},
      {title: "Aggressive (Max MRR)", id: "aggressive"},
      {title: "Balanced Roughing", id: "balanced"},
      {title: "Conservative (Tool Life)", id: "conservative"},
      {title: "=== FINISHING ===", id: "_finish_header"},
      {title: "Finish - Surface Quality", id: "finish"},
      {title: "Finish - Accuracy Priority", id: "accuracy"},
      {title: "Finish - Balanced", id: "finish_balanced"},
      {title: "Finish - Productivity", id: "finish_productivity"},
      {title: "=== OTHER ===", id: "_other_header"},
      {title: "Off (Use Programmed)", id: "off"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismT17MaxChipThinMult: {
    title      : "T17: Max Chip Thinning Mult",
    description: "Maximum feed increase from chip thinning. At 10% WOC theoretical is 3.2x. Cap for safety. Overrides global setting.",
    group      : "prismPocket17",
    type       : "number",
    range      : [1.0, 4.0],
    value      : 2.5,
    scope      : "post"
  },
  prismT17DeflectionLimit: {
    title      : "T17: Max Deflection (in)",
    description: "Feed reduced when calculated deflection exceeds this. 0.001-0.002 for finish, 0.003-0.005 for rough.",
    group      : "prismPocket17",
    type       : "number",
    range      : [0.0005, 0.010],
    value      : 0.002,
    scope      : "post"
  },
  prismT17TargetRa: {
    title      : "T17: Target Ra (uin)",
    description: "Target surface roughness in microinches. 16=fine finish, 32=good, 63=standard, 125=rough finish.",
    group      : "prismPocket17",
    type       : "enum",
    values     : [
      {title: "8 uin (Mirror/Lapped)", id: "8"},
      {title: "16 uin (Fine Finish)", id: "16"},
      {title: "32 uin (Good Finish)", id: "32"},
      {title: "63 uin (Standard)", id: "63"},
      {title: "125 uin (Semi-Finish)", id: "125"},
      {title: "250 uin (Roughing)", id: "250"},
      {title: "500 uin (Adaptive/HEM)", id: "500"},
      {title: "999 uin (Ignore Finish)", id: "999"}
    ],
    value      : "32",
    scope      : "post"
  },
  prismT17Aggressiveness: {
    title      : "T17: Aggressiveness (1-8)",
    description: "How hard should PRISM push? 1 = safest (longest tool life). 5 = balanced. 8 = fastest (maximum material removal). Start at 5 if unsure.",
    group      : "prismPocket17",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },
  // ===========================================================================
  // TOOL POCKET 18 (T18)
  // ===========================================================================
  prismT18Material: {
    title      : "T18: Tool Material",
    description: "Tool substrate.",
    group      : "prismPocket18",
    type       : "enum",
    values     : TOOL_MATERIAL_VALUES,
    value      : "carbide",
    scope      : "post"
  },
  prismT18Coating: {
    title      : "T18: Coating",
    description: "Tool coating.",
    group      : "prismPocket18",
    type       : "enum",
    values     : COATING_VALUES,
    value      : "tialn",
    scope      : "post"
  },
  prismT18Brand: {
    title      : "T18: Brand",
    description: "Tool manufacturer.",
    group      : "prismPocket18",
    type       : "enum",
    values     : BRAND_VALUES,
    value      : "generic",
    scope      : "post"
  },
  prismT18HolderType: {
    title      : "T18: Holder Type",
    description: "Tool holder style.",
    group      : "prismPocket18",
    type       : "enum",
    values     : HOLDER_TYPE_VALUES,
    value      : "er_collet",
    scope      : "post"
  },
  prismT18HolderExtension: {
    title      : "T18: Holder Extension (in)",
    description: "Holder projection from spindle face. For extended arbors, enter total length. 0=auto from tool body.",
    group      : "prismPocket18",
    type       : "number",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  prismT18Condition: {
    title      : "T18: Condition",
    description: "Tool wear state.",
    group      : "prismPocket18",
    type       : "enum",
    values     : [
      {title: "New", id: "new"},
      {title: "Good", id: "good"},
      {title: "Worn", id: "worn"},
      {title: "Regrind", id: "regrind"}
    ],
    value      : "new",
    scope      : "post"
  },
  prismT18SpeedPct: {
    title      : "T18: Speed %",
    description: "Speed multiplier (100=calculated).",
    group      : "prismPocket18",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT18FeedPct: {
    title      : "T18: Feed %",
    description: "Feed multiplier (100=calculated).",
    group      : "prismPocket18",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT18ApplyMultipliersTo: {
    title      : "T18: Apply Multipliers To",
    description: "Controls when Speed%/Feed% multipliers are applied. 'Milling Only' = skip drilling/tapping (recommended). 'All' = always apply. 'Off' = never apply (use Fusion feeds).",
    group      : "prismPocket18",
    type       : "enum",
    values     : [
      {title: "Milling Only (Skip Drilling)", id: "milling_only"},
      {title: "All Operations", id: "all"},
      {title: "Off (Use Fusion Programmed)", id: "off"}
    ],
    value      : "milling_only",
    scope      : "post"
  },
  prismT18Indexable: {
    title      : "T18: Indexable Insert Tool",
    description: "Enable indexable insert parameters for this tool (face mills, indexable endmills, high-feed, etc).",
    group      : "prismPocket18",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismT18InsertStyle: {
    title      : "T18: Insert Cutter Style",
    description: "Type of indexable cutter.",
    group      : "prismPocket18",
    type       : "enum",
    values     : [
      {title: "Face Mill (45 deg lead)", id: "face_mill_45"},
      {title: "Face Mill (90 deg lead)", id: "face_mill_90"},
      {title: "High Feed Mill (10-17 deg)", id: "high_feed"},
      {title: "Shoulder/Square Mill (90 deg)", id: "shoulder_90"},
      {title: "Button Cutter (Round)", id: "button"},
      {title: "Indexable Ball", id: "ball"},
      {title: "Indexable Drill", id: "drill"},
      {title: "Chamfer Mill", id: "chamfer"},
      {title: "Slot Mill", id: "slot"},
      {title: "Copy Mill / 3D", id: "copy"}
    ],
    value      : "face_mill_45",
    scope      : "post"
  },
  prismT18LeadAngle: {
    title      : "T18: Lead/Entry Angle",
    description: "Insert approach angle. Affects chip thickness and axial force. High-feed uses 10-17 deg.",
    group      : "prismPocket18",
    type       : "enum",
    values     : [
      {title: "90 deg (Square shoulder)", id: "90"},
      {title: "75 deg", id: "75"},
      {title: "65 deg", id: "65"},
      {title: "60 deg", id: "60"},
      {title: "45 deg (Common face mill)", id: "45"},
      {title: "30 deg", id: "30"},
      {title: "20 deg", id: "20"},
      {title: "17 deg (High feed)", id: "17"},
      {title: "15 deg", id: "15"},
      {title: "12 deg (High feed)", id: "12"},
      {title: "10 deg (High feed)", id: "10"}
    ],
    value      : "45",
    scope      : "post"
  },
  prismT18InsertGrade: {
    title      : "T18: Insert Grade",
    description: "Carbide grade - select based on manufacturer or use generic ISO grades.",
    group      : "prismPocket18",
    type       : "enum",
    values     : INSERT_GRADE_VALUES,
    value      : "P20",
    scope      : "post"
  },
  prismT18InsertNoseR: {
    title      : "T18: Insert Nose Radius",
    description: "Corner radius in mm. Enter your insert nose radius (e.g. 0.4, 0.8, 1.2). Larger = higher feed possible, rougher finish.",
    group      : "prismPocket18",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  prismT18Coolant: {
    title      : "T18: Coolant Strategy",
    description: "Coolant output for this tool. Override per operation or use tool default.",
    group      : "prismPocket18",
    type       : "enum",
    values     : [
      {title: "Use Fusion Setting", id: "fusion"},
      {title: "Flood (M8)", id: "flood"},
      {title: "Mist (M7)", id: "mist"},
      {title: "Flood + Mist (M7 M8)", id: "flood_mist"},
      {title: "Through Spindle (M88)", id: "thru_spindle"},
      {title: "Through Spindle HP", id: "thru_spindle_hp"},
      {title: "Air Blast (M51)", id: "air"},
      {title: "Air + Mist (MQL)", id: "mql"},
      {title: "Vacuum / Dust Collection", id: "vacuum"},
      {title: "Off / Dry (M9)", id: "off"}
    ],
    value      : "fusion",
    scope      : "post"
  },
  prismT18Strategy: {
    title      : "T18: Machining Strategy",
    description: "Unified machining strategy. ROUGHING: HEM/HSM/Aggressive/Balanced/Conservative. FINISHING: Surface/Accuracy/Balanced/Productivity. Auto=detect from Fusion operation type.",
    group      : "prismPocket18",
    type       : "enum",
        values     : [
      {title: "Auto-Detect", id: "auto"},
      {title: "=== ROUGHING ===", id: "_rough_header"},
      {title: "HEM - High Efficiency Milling", id: "hem"},
      {title: "HSM - High Speed Machining", id: "hsm"},
      {title: "Aggressive (Max MRR)", id: "aggressive"},
      {title: "Balanced Roughing", id: "balanced"},
      {title: "Conservative (Tool Life)", id: "conservative"},
      {title: "=== FINISHING ===", id: "_finish_header"},
      {title: "Finish - Surface Quality", id: "finish"},
      {title: "Finish - Accuracy Priority", id: "accuracy"},
      {title: "Finish - Balanced", id: "finish_balanced"},
      {title: "Finish - Productivity", id: "finish_productivity"},
      {title: "=== OTHER ===", id: "_other_header"},
      {title: "Off (Use Programmed)", id: "off"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismT18MaxChipThinMult: {
    title      : "T18: Max Chip Thinning Mult",
    description: "Maximum feed increase from chip thinning. At 10% WOC theoretical is 3.2x. Cap for safety. Overrides global setting.",
    group      : "prismPocket18",
    type       : "number",
    range      : [1.0, 4.0],
    value      : 2.5,
    scope      : "post"
  },
  prismT18DeflectionLimit: {
    title      : "T18: Max Deflection (in)",
    description: "Feed reduced when calculated deflection exceeds this. 0.001-0.002 for finish, 0.003-0.005 for rough.",
    group      : "prismPocket18",
    type       : "number",
    range      : [0.0005, 0.010],
    value      : 0.002,
    scope      : "post"
  },
  prismT18TargetRa: {
    title      : "T18: Target Ra (uin)",
    description: "Target surface roughness in microinches. 16=fine finish, 32=good, 63=standard, 125=rough finish.",
    group      : "prismPocket18",
    type       : "enum",
    values     : [
      {title: "8 uin (Mirror/Lapped)", id: "8"},
      {title: "16 uin (Fine Finish)", id: "16"},
      {title: "32 uin (Good Finish)", id: "32"},
      {title: "63 uin (Standard)", id: "63"},
      {title: "125 uin (Semi-Finish)", id: "125"},
      {title: "250 uin (Roughing)", id: "250"},
      {title: "500 uin (Adaptive/HEM)", id: "500"},
      {title: "999 uin (Ignore Finish)", id: "999"}
    ],
    value      : "32",
    scope      : "post"
  },
  prismT18Aggressiveness: {
    title      : "T18: Aggressiveness (1-8)",
    description: "How hard should PRISM push? 1 = safest (longest tool life). 5 = balanced. 8 = fastest (maximum material removal). Start at 5 if unsure.",
    group      : "prismPocket18",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },
  // ===========================================================================
  // TOOL POCKET 19 (T19)
  // ===========================================================================
  prismT19Material: {
    title      : "T19: Tool Material",
    description: "Tool substrate.",
    group      : "prismPocket19",
    type       : "enum",
    values     : TOOL_MATERIAL_VALUES,
    value      : "carbide",
    scope      : "post"
  },
  prismT19Coating: {
    title      : "T19: Coating",
    description: "Tool coating.",
    group      : "prismPocket19",
    type       : "enum",
    values     : COATING_VALUES,
    value      : "tialn",
    scope      : "post"
  },
  prismT19Brand: {
    title      : "T19: Brand",
    description: "Tool manufacturer.",
    group      : "prismPocket19",
    type       : "enum",
    values     : BRAND_VALUES,
    value      : "generic",
    scope      : "post"
  },
  prismT19HolderType: {
    title      : "T19: Holder Type",
    description: "Tool holder style.",
    group      : "prismPocket19",
    type       : "enum",
    values     : HOLDER_TYPE_VALUES,
    value      : "er_collet",
    scope      : "post"
  },
  prismT19HolderExtension: {
    title      : "T19: Holder Extension (in)",
    description: "Holder projection from spindle face. For extended arbors, enter total length. 0=auto from tool body.",
    group      : "prismPocket19",
    type       : "number",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  prismT19Condition: {
    title      : "T19: Condition",
    description: "Tool wear state.",
    group      : "prismPocket19",
    type       : "enum",
    values     : [
      {title: "New", id: "new"},
      {title: "Good", id: "good"},
      {title: "Worn", id: "worn"},
      {title: "Regrind", id: "regrind"}
    ],
    value      : "new",
    scope      : "post"
  },
  prismT19SpeedPct: {
    title      : "T19: Speed %",
    description: "Speed multiplier (100=calculated).",
    group      : "prismPocket19",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT19FeedPct: {
    title      : "T19: Feed %",
    description: "Feed multiplier (100=calculated).",
    group      : "prismPocket19",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT19ApplyMultipliersTo: {
    title      : "T19: Apply Multipliers To",
    description: "Controls when Speed%/Feed% multipliers are applied. 'Milling Only' = skip drilling/tapping (recommended). 'All' = always apply. 'Off' = never apply (use Fusion feeds).",
    group      : "prismPocket19",
    type       : "enum",
    values     : [
      {title: "Milling Only (Skip Drilling)", id: "milling_only"},
      {title: "All Operations", id: "all"},
      {title: "Off (Use Fusion Programmed)", id: "off"}
    ],
    value      : "milling_only",
    scope      : "post"
  },
  prismT19Indexable: {
    title      : "T19: Indexable Insert Tool",
    description: "Enable indexable insert parameters for this tool (face mills, indexable endmills, high-feed, etc).",
    group      : "prismPocket19",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismT19InsertStyle: {
    title      : "T19: Insert Cutter Style",
    description: "Type of indexable cutter.",
    group      : "prismPocket19",
    type       : "enum",
    values     : [
      {title: "Face Mill (45 deg lead)", id: "face_mill_45"},
      {title: "Face Mill (90 deg lead)", id: "face_mill_90"},
      {title: "High Feed Mill (10-17 deg)", id: "high_feed"},
      {title: "Shoulder/Square Mill (90 deg)", id: "shoulder_90"},
      {title: "Button Cutter (Round)", id: "button"},
      {title: "Indexable Ball", id: "ball"},
      {title: "Indexable Drill", id: "drill"},
      {title: "Chamfer Mill", id: "chamfer"},
      {title: "Slot Mill", id: "slot"},
      {title: "Copy Mill / 3D", id: "copy"}
    ],
    value      : "face_mill_45",
    scope      : "post"
  },
  prismT19LeadAngle: {
    title      : "T19: Lead/Entry Angle",
    description: "Insert approach angle. Affects chip thickness and axial force. High-feed uses 10-17 deg.",
    group      : "prismPocket19",
    type       : "enum",
    values     : [
      {title: "90 deg (Square shoulder)", id: "90"},
      {title: "75 deg", id: "75"},
      {title: "65 deg", id: "65"},
      {title: "60 deg", id: "60"},
      {title: "45 deg (Common face mill)", id: "45"},
      {title: "30 deg", id: "30"},
      {title: "20 deg", id: "20"},
      {title: "17 deg (High feed)", id: "17"},
      {title: "15 deg", id: "15"},
      {title: "12 deg (High feed)", id: "12"},
      {title: "10 deg (High feed)", id: "10"}
    ],
    value      : "45",
    scope      : "post"
  },
  prismT19InsertGrade: {
    title      : "T19: Insert Grade",
    description: "Carbide grade - select based on manufacturer or use generic ISO grades.",
    group      : "prismPocket19",
    type       : "enum",
    values     : INSERT_GRADE_VALUES,
    value      : "P20",
    scope      : "post"
  },
  prismT19InsertNoseR: {
    title      : "T19: Insert Nose Radius",
    description: "Corner radius in mm. Enter your insert nose radius (e.g. 0.4, 0.8, 1.2). Larger = higher feed possible, rougher finish.",
    group      : "prismPocket19",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  prismT19Coolant: {
    title      : "T19: Coolant Strategy",
    description: "Coolant output for this tool. Override per operation or use tool default.",
    group      : "prismPocket19",
    type       : "enum",
    values     : [
      {title: "Use Fusion Setting", id: "fusion"},
      {title: "Flood (M8)", id: "flood"},
      {title: "Mist (M7)", id: "mist"},
      {title: "Flood + Mist (M7 M8)", id: "flood_mist"},
      {title: "Through Spindle (M88)", id: "thru_spindle"},
      {title: "Through Spindle HP", id: "thru_spindle_hp"},
      {title: "Air Blast (M51)", id: "air"},
      {title: "Air + Mist (MQL)", id: "mql"},
      {title: "Vacuum / Dust Collection", id: "vacuum"},
      {title: "Off / Dry (M9)", id: "off"}
    ],
    value      : "fusion",
    scope      : "post"
  },
  prismT19Strategy: {
    title      : "T19: Machining Strategy",
    description: "Unified machining strategy. ROUGHING: HEM/HSM/Aggressive/Balanced/Conservative. FINISHING: Surface/Accuracy/Balanced/Productivity. Auto=detect from Fusion operation type.",
    group      : "prismPocket19",
    type       : "enum",
        values     : [
      {title: "Auto-Detect", id: "auto"},
      {title: "=== ROUGHING ===", id: "_rough_header"},
      {title: "HEM - High Efficiency Milling", id: "hem"},
      {title: "HSM - High Speed Machining", id: "hsm"},
      {title: "Aggressive (Max MRR)", id: "aggressive"},
      {title: "Balanced Roughing", id: "balanced"},
      {title: "Conservative (Tool Life)", id: "conservative"},
      {title: "=== FINISHING ===", id: "_finish_header"},
      {title: "Finish - Surface Quality", id: "finish"},
      {title: "Finish - Accuracy Priority", id: "accuracy"},
      {title: "Finish - Balanced", id: "finish_balanced"},
      {title: "Finish - Productivity", id: "finish_productivity"},
      {title: "=== OTHER ===", id: "_other_header"},
      {title: "Off (Use Programmed)", id: "off"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismT19MaxChipThinMult: {
    title      : "T19: Max Chip Thinning Mult",
    description: "Maximum feed increase from chip thinning. At 10% WOC theoretical is 3.2x. Cap for safety. Overrides global setting.",
    group      : "prismPocket19",
    type       : "number",
    range      : [1.0, 4.0],
    value      : 2.5,
    scope      : "post"
  },
  prismT19DeflectionLimit: {
    title      : "T19: Max Deflection (in)",
    description: "Feed reduced when calculated deflection exceeds this. 0.001-0.002 for finish, 0.003-0.005 for rough.",
    group      : "prismPocket19",
    type       : "number",
    range      : [0.0005, 0.010],
    value      : 0.002,
    scope      : "post"
  },
  prismT19TargetRa: {
    title      : "T19: Target Ra (uin)",
    description: "Target surface roughness in microinches. 16=fine finish, 32=good, 63=standard, 125=rough finish.",
    group      : "prismPocket19",
    type       : "enum",
    values     : [
      {title: "8 uin (Mirror/Lapped)", id: "8"},
      {title: "16 uin (Fine Finish)", id: "16"},
      {title: "32 uin (Good Finish)", id: "32"},
      {title: "63 uin (Standard)", id: "63"},
      {title: "125 uin (Semi-Finish)", id: "125"},
      {title: "250 uin (Roughing)", id: "250"},
      {title: "500 uin (Adaptive/HEM)", id: "500"},
      {title: "999 uin (Ignore Finish)", id: "999"}
    ],
    value      : "32",
    scope      : "post"
  },
  prismT19Aggressiveness: {
    title      : "T19: Aggressiveness (1-8)",
    description: "How hard should PRISM push? 1 = safest (longest tool life). 5 = balanced. 8 = fastest (maximum material removal). Start at 5 if unsure.",
    group      : "prismPocket19",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },
  // ===========================================================================
  // TOOL POCKET 20 (T20)
  // ===========================================================================
  prismT20Material: {
    title      : "T20: Tool Material",
    description: "Tool substrate.",
    group      : "prismPocket20",
    type       : "enum",
    values     : TOOL_MATERIAL_VALUES,
    value      : "carbide",
    scope      : "post"
  },
  prismT20Coating: {
    title      : "T20: Coating",
    description: "Tool coating.",
    group      : "prismPocket20",
    type       : "enum",
    values     : COATING_VALUES,
    value      : "tialn",
    scope      : "post"
  },
  prismT20Brand: {
    title      : "T20: Brand",
    description: "Tool manufacturer.",
    group      : "prismPocket20",
    type       : "enum",
    values     : BRAND_VALUES,
    value      : "generic",
    scope      : "post"
  },
  prismT20HolderType: {
    title      : "T20: Holder Type",
    description: "Tool holder style.",
    group      : "prismPocket20",
    type       : "enum",
    values     : HOLDER_TYPE_VALUES,
    value      : "er_collet",
    scope      : "post"
  },
  prismT20HolderExtension: {
    title      : "T20: Holder Extension (in)",
    description: "Holder projection from spindle face. For extended arbors, enter total length. 0=auto from tool body.",
    group      : "prismPocket20",
    type       : "number",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  prismT20Condition: {
    title      : "T20: Condition",
    description: "Tool wear state.",
    group      : "prismPocket20",
    type       : "enum",
    values     : [
      {title: "New", id: "new"},
      {title: "Good", id: "good"},
      {title: "Worn", id: "worn"},
      {title: "Regrind", id: "regrind"}
    ],
    value      : "new",
    scope      : "post"
  },
  prismT20SpeedPct: {
    title      : "T20: Speed %",
    description: "Speed multiplier (100=calculated).",
    group      : "prismPocket20",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT20FeedPct: {
    title      : "T20: Feed %",
    description: "Feed multiplier (100=calculated).",
    group      : "prismPocket20",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT20ApplyMultipliersTo: {
    title      : "T20: Apply Multipliers To",
    description: "Controls when Speed%/Feed% multipliers are applied. 'Milling Only' = skip drilling/tapping (recommended). 'All' = always apply. 'Off' = never apply (use Fusion feeds).",
    group      : "prismPocket20",
    type       : "enum",
    values     : [
      {title: "Milling Only (Skip Drilling)", id: "milling_only"},
      {title: "All Operations", id: "all"},
      {title: "Off (Use Fusion Programmed)", id: "off"}
    ],
    value      : "milling_only",
    scope      : "post"
  },
  prismT20Indexable: {
    title      : "T20: Indexable Insert Tool",
    description: "Enable indexable insert parameters for this tool (face mills, indexable endmills, high-feed, etc).",
    group      : "prismPocket20",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismT20InsertStyle: {
    title      : "T20: Insert Cutter Style",
    description: "Type of indexable cutter.",
    group      : "prismPocket20",
    type       : "enum",
    values     : [
      {title: "Face Mill (45 deg lead)", id: "face_mill_45"},
      {title: "Face Mill (90 deg lead)", id: "face_mill_90"},
      {title: "High Feed Mill (10-17 deg)", id: "high_feed"},
      {title: "Shoulder/Square Mill (90 deg)", id: "shoulder_90"},
      {title: "Button Cutter (Round)", id: "button"},
      {title: "Indexable Ball", id: "ball"},
      {title: "Indexable Drill", id: "drill"},
      {title: "Chamfer Mill", id: "chamfer"},
      {title: "Slot Mill", id: "slot"},
      {title: "Copy Mill / 3D", id: "copy"}
    ],
    value      : "face_mill_45",
    scope      : "post"
  },
  prismT20LeadAngle: {
    title      : "T20: Lead/Entry Angle",
    description: "Insert approach angle. Affects chip thickness and axial force. High-feed uses 10-17 deg.",
    group      : "prismPocket20",
    type       : "enum",
    values     : [
      {title: "90 deg (Square shoulder)", id: "90"},
      {title: "75 deg", id: "75"},
      {title: "65 deg", id: "65"},
      {title: "60 deg", id: "60"},
      {title: "45 deg (Common face mill)", id: "45"},
      {title: "30 deg", id: "30"},
      {title: "20 deg", id: "20"},
      {title: "17 deg (High feed)", id: "17"},
      {title: "15 deg", id: "15"},
      {title: "12 deg (High feed)", id: "12"},
      {title: "10 deg (High feed)", id: "10"}
    ],
    value      : "45",
    scope      : "post"
  },
  prismT20InsertGrade: {
    title      : "T20: Insert Grade",
    description: "Carbide grade - select based on manufacturer or use generic ISO grades.",
    group      : "prismPocket20",
    type       : "enum",
    values     : INSERT_GRADE_VALUES,
    value      : "P20",
    scope      : "post"
  },
  prismT20InsertNoseR: {
    title      : "T20: Insert Nose Radius",
    description: "Corner radius in mm. Enter your insert nose radius (e.g. 0.4, 0.8, 1.2). Larger = higher feed possible, rougher finish.",
    group      : "prismPocket20",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  prismT20Coolant: {
    title      : "T20: Coolant Strategy",
    description: "Coolant output for this tool. Override per operation or use tool default.",
    group      : "prismPocket20",
    type       : "enum",
    values     : [
      {title: "Use Fusion Setting", id: "fusion"},
      {title: "Flood (M8)", id: "flood"},
      {title: "Mist (M7)", id: "mist"},
      {title: "Flood + Mist (M7 M8)", id: "flood_mist"},
      {title: "Through Spindle (M88)", id: "thru_spindle"},
      {title: "Through Spindle HP", id: "thru_spindle_hp"},
      {title: "Air Blast (M51)", id: "air"},
      {title: "Air + Mist (MQL)", id: "mql"},
      {title: "Vacuum / Dust Collection", id: "vacuum"},
      {title: "Off / Dry (M9)", id: "off"}
    ],
    value      : "fusion",
    scope      : "post"
  },
  prismT20Strategy: {
    title      : "T20: Machining Strategy",
    description: "Unified machining strategy. ROUGHING: HEM/HSM/Aggressive/Balanced/Conservative. FINISHING: Surface/Accuracy/Balanced/Productivity. Auto=detect from Fusion operation type.",
    group      : "prismPocket20",
    type       : "enum",
        values     : [
      {title: "Auto-Detect", id: "auto"},
      {title: "=== ROUGHING ===", id: "_rough_header"},
      {title: "HEM - High Efficiency Milling", id: "hem"},
      {title: "HSM - High Speed Machining", id: "hsm"},
      {title: "Aggressive (Max MRR)", id: "aggressive"},
      {title: "Balanced Roughing", id: "balanced"},
      {title: "Conservative (Tool Life)", id: "conservative"},
      {title: "=== FINISHING ===", id: "_finish_header"},
      {title: "Finish - Surface Quality", id: "finish"},
      {title: "Finish - Accuracy Priority", id: "accuracy"},
      {title: "Finish - Balanced", id: "finish_balanced"},
      {title: "Finish - Productivity", id: "finish_productivity"},
      {title: "=== OTHER ===", id: "_other_header"},
      {title: "Off (Use Programmed)", id: "off"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismT20MaxChipThinMult: {
    title      : "T20: Max Chip Thinning Mult",
    description: "Maximum feed increase from chip thinning. At 10% WOC theoretical is 3.2x. Cap for safety. Overrides global setting.",
    group      : "prismPocket20",
    type       : "number",
    range      : [1.0, 4.0],
    value      : 2.5,
    scope      : "post"
  },
  prismT20DeflectionLimit: {
    title      : "T20: Max Deflection (in)",
    description: "Feed reduced when calculated deflection exceeds this. 0.001-0.002 for finish, 0.003-0.005 for rough.",
    group      : "prismPocket20",
    type       : "number",
    range      : [0.0005, 0.010],
    value      : 0.002,
    scope      : "post"
  },
  prismT20TargetRa: {
    title      : "T20: Target Ra (uin)",
    description: "Target surface roughness in microinches. 16=fine finish, 32=good, 63=standard, 125=rough finish.",
    group      : "prismPocket20",
    type       : "enum",
    values     : [
      {title: "8 uin (Mirror/Lapped)", id: "8"},
      {title: "16 uin (Fine Finish)", id: "16"},
      {title: "32 uin (Good Finish)", id: "32"},
      {title: "63 uin (Standard)", id: "63"},
      {title: "125 uin (Semi-Finish)", id: "125"},
      {title: "250 uin (Roughing)", id: "250"},
      {title: "500 uin (Adaptive/HEM)", id: "500"},
      {title: "999 uin (Ignore Finish)", id: "999"}
    ],
    value      : "32",
    scope      : "post"
  },
  prismT20Aggressiveness: {
    title      : "T20: Aggressiveness (1-8)",
    description: "How hard should PRISM push? 1 = safest (longest tool life). 5 = balanced. 8 = fastest (maximum material removal). Start at 5 if unsure.",
    group      : "prismPocket20",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },
  // ===========================================================================
  // TOOL POCKET 21 (T21)
  // ===========================================================================
  prismT21Material: {
    title      : "T21: Tool Material",
    description: "Tool substrate.",
    group      : "prismPocket21",
    type       : "enum",
    values     : TOOL_MATERIAL_VALUES,
    value      : "carbide",
    scope      : "post"
  },
  prismT21Coating: {
    title      : "T21: Coating",
    description: "Tool coating.",
    group      : "prismPocket21",
    type       : "enum",
    values     : COATING_VALUES,
    value      : "tialn",
    scope      : "post"
  },
  prismT21Brand: {
    title      : "T21: Brand",
    description: "Tool manufacturer.",
    group      : "prismPocket21",
    type       : "enum",
    values     : BRAND_VALUES,
    value      : "generic",
    scope      : "post"
  },
  prismT21HolderType: {
    title      : "T21: Holder Type",
    description: "Tool holder style.",
    group      : "prismPocket21",
    type       : "enum",
    values     : HOLDER_TYPE_VALUES,
    value      : "er_collet",
    scope      : "post"
  },
  prismT21HolderExtension: {
    title      : "T21: Holder Extension (in)",
    description: "Holder projection from spindle face. For extended arbors, enter total length. 0=auto from tool body.",
    group      : "prismPocket21",
    type       : "number",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  prismT21Condition: {
    title      : "T21: Condition",
    description: "Tool wear state.",
    group      : "prismPocket21",
    type       : "enum",
    values     : [
      {title: "New", id: "new"},
      {title: "Good", id: "good"},
      {title: "Worn", id: "worn"},
      {title: "Regrind", id: "regrind"}
    ],
    value      : "new",
    scope      : "post"
  },
  prismT21SpeedPct: {
    title      : "T21: Speed %",
    description: "Speed multiplier (100=calculated).",
    group      : "prismPocket21",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT21FeedPct: {
    title      : "T21: Feed %",
    description: "Feed multiplier (100=calculated).",
    group      : "prismPocket21",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT21ApplyMultipliersTo: {
    title      : "T21: Apply Multipliers To",
    description: "Controls when Speed%/Feed% multipliers are applied. 'Milling Only' = skip drilling/tapping (recommended). 'All' = always apply. 'Off' = never apply (use Fusion feeds).",
    group      : "prismPocket21",
    type       : "enum",
    values     : [
      {title: "Milling Only (Skip Drilling)", id: "milling_only"},
      {title: "All Operations", id: "all"},
      {title: "Off (Use Fusion Programmed)", id: "off"}
    ],
    value      : "milling_only",
    scope      : "post"
  },
  prismT21Indexable: {
    title      : "T21: Indexable Insert Tool",
    description: "Enable indexable insert parameters for this tool (face mills, indexable endmills, high-feed, etc).",
    group      : "prismPocket21",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismT21InsertStyle: {
    title      : "T21: Insert Cutter Style",
    description: "Type of indexable cutter.",
    group      : "prismPocket21",
    type       : "enum",
    values     : [
      {title: "Face Mill (45 deg lead)", id: "face_mill_45"},
      {title: "Face Mill (90 deg lead)", id: "face_mill_90"},
      {title: "High Feed Mill (10-17 deg)", id: "high_feed"},
      {title: "Shoulder/Square Mill (90 deg)", id: "shoulder_90"},
      {title: "Button Cutter (Round)", id: "button"},
      {title: "Indexable Ball", id: "ball"},
      {title: "Indexable Drill", id: "drill"},
      {title: "Chamfer Mill", id: "chamfer"},
      {title: "Slot Mill", id: "slot"},
      {title: "Copy Mill / 3D", id: "copy"}
    ],
    value      : "face_mill_45",
    scope      : "post"
  },
  prismT21LeadAngle: {
    title      : "T21: Lead/Entry Angle",
    description: "Insert approach angle. Affects chip thickness and axial force. High-feed uses 10-17 deg.",
    group      : "prismPocket21",
    type       : "enum",
    values     : [
      {title: "90 deg (Square shoulder)", id: "90"},
      {title: "75 deg", id: "75"},
      {title: "65 deg", id: "65"},
      {title: "60 deg", id: "60"},
      {title: "45 deg (Common face mill)", id: "45"},
      {title: "30 deg", id: "30"},
      {title: "20 deg", id: "20"},
      {title: "17 deg (High feed)", id: "17"},
      {title: "15 deg", id: "15"},
      {title: "12 deg (High feed)", id: "12"},
      {title: "10 deg (High feed)", id: "10"}
    ],
    value      : "45",
    scope      : "post"
  },
  prismT21InsertGrade: {
    title      : "T21: Insert Grade",
    description: "Carbide grade - select based on manufacturer or use generic ISO grades.",
    group      : "prismPocket21",
    type       : "enum",
    values     : INSERT_GRADE_VALUES,
    value      : "P20",
    scope      : "post"
  },
  prismT21InsertNoseR: {
    title      : "T21: Insert Nose Radius",
    description: "Corner radius in mm. Enter your insert nose radius (e.g. 0.4, 0.8, 1.2). Larger = higher feed possible, rougher finish.",
    group      : "prismPocket21",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  prismT21Coolant: {
    title      : "T21: Coolant Strategy",
    description: "Coolant output for this tool. Override per operation or use tool default.",
    group      : "prismPocket21",
    type       : "enum",
    values     : [
      {title: "Use Fusion Setting", id: "fusion"},
      {title: "Flood (M8)", id: "flood"},
      {title: "Mist (M7)", id: "mist"},
      {title: "Flood + Mist (M7 M8)", id: "flood_mist"},
      {title: "Through Spindle (M88)", id: "thru_spindle"},
      {title: "Through Spindle HP", id: "thru_spindle_hp"},
      {title: "Air Blast (M51)", id: "air"},
      {title: "Air + Mist (MQL)", id: "mql"},
      {title: "Vacuum / Dust Collection", id: "vacuum"},
      {title: "Off / Dry (M9)", id: "off"}
    ],
    value      : "fusion",
    scope      : "post"
  },
  prismT21Strategy: {
    title      : "T21: Machining Strategy",
    description: "Unified machining strategy. ROUGHING: HEM/HSM/Aggressive/Balanced/Conservative. FINISHING: Surface/Accuracy/Balanced/Productivity. Auto=detect from Fusion operation type.",
    group      : "prismPocket21",
    type       : "enum",
        values     : [
      {title: "Auto-Detect", id: "auto"},
      {title: "=== ROUGHING ===", id: "_rough_header"},
      {title: "HEM - High Efficiency Milling", id: "hem"},
      {title: "HSM - High Speed Machining", id: "hsm"},
      {title: "Aggressive (Max MRR)", id: "aggressive"},
      {title: "Balanced Roughing", id: "balanced"},
      {title: "Conservative (Tool Life)", id: "conservative"},
      {title: "=== FINISHING ===", id: "_finish_header"},
      {title: "Finish - Surface Quality", id: "finish"},
      {title: "Finish - Accuracy Priority", id: "accuracy"},
      {title: "Finish - Balanced", id: "finish_balanced"},
      {title: "Finish - Productivity", id: "finish_productivity"},
      {title: "=== OTHER ===", id: "_other_header"},
      {title: "Off (Use Programmed)", id: "off"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismT21MaxChipThinMult: {
    title      : "T21: Max Chip Thinning Mult",
    description: "Maximum feed increase from chip thinning. At 10% WOC theoretical is 3.2x. Cap for safety. Overrides global setting.",
    group      : "prismPocket21",
    type       : "number",
    range      : [1.0, 4.0],
    value      : 2.5,
    scope      : "post"
  },
  prismT21DeflectionLimit: {
    title      : "T21: Max Deflection (in)",
    description: "Feed reduced when calculated deflection exceeds this. 0.001-0.002 for finish, 0.003-0.005 for rough.",
    group      : "prismPocket21",
    type       : "number",
    range      : [0.0005, 0.010],
    value      : 0.002,
    scope      : "post"
  },
  prismT21TargetRa: {
    title      : "T21: Target Ra (uin)",
    description: "Target surface roughness in microinches. 16=fine finish, 32=good, 63=standard, 125=rough finish.",
    group      : "prismPocket21",
    type       : "enum",
    values     : [
      {title: "8 uin (Mirror/Lapped)", id: "8"},
      {title: "16 uin (Fine Finish)", id: "16"},
      {title: "32 uin (Good Finish)", id: "32"},
      {title: "63 uin (Standard)", id: "63"},
      {title: "125 uin (Semi-Finish)", id: "125"},
      {title: "250 uin (Roughing)", id: "250"},
      {title: "500 uin (Adaptive/HEM)", id: "500"},
      {title: "999 uin (Ignore Finish)", id: "999"}
    ],
    value      : "32",
    scope      : "post"
  },
  prismT21Aggressiveness: {
    title      : "T21: Aggressiveness (1-8)",
    description: "How hard should PRISM push? 1 = safest (longest tool life). 5 = balanced. 8 = fastest (maximum material removal). Start at 5 if unsure.",
    group      : "prismPocket21",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },
  // ===========================================================================
  // TOOL POCKET 22 (T22)
  // ===========================================================================
  prismT22Material: {
    title      : "T22: Tool Material",
    description: "Tool substrate.",
    group      : "prismPocket22",
    type       : "enum",
    values     : TOOL_MATERIAL_VALUES,
    value      : "carbide",
    scope      : "post"
  },
  prismT22Coating: {
    title      : "T22: Coating",
    description: "Tool coating.",
    group      : "prismPocket22",
    type       : "enum",
    values     : COATING_VALUES,
    value      : "tialn",
    scope      : "post"
  },
  prismT22Brand: {
    title      : "T22: Brand",
    description: "Tool manufacturer.",
    group      : "prismPocket22",
    type       : "enum",
    values     : BRAND_VALUES,
    value      : "generic",
    scope      : "post"
  },
  prismT22HolderType: {
    title      : "T22: Holder Type",
    description: "Tool holder style.",
    group      : "prismPocket22",
    type       : "enum",
    values     : HOLDER_TYPE_VALUES,
    value      : "er_collet",
    scope      : "post"
  },
  prismT22HolderExtension: {
    title      : "T22: Holder Extension (in)",
    description: "Holder projection from spindle face. For extended arbors, enter total length. 0=auto from tool body.",
    group      : "prismPocket22",
    type       : "number",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  prismT22Condition: {
    title      : "T22: Condition",
    description: "Tool wear state.",
    group      : "prismPocket22",
    type       : "enum",
    values     : [
      {title: "New", id: "new"},
      {title: "Good", id: "good"},
      {title: "Worn", id: "worn"},
      {title: "Regrind", id: "regrind"}
    ],
    value      : "new",
    scope      : "post"
  },
  prismT22SpeedPct: {
    title      : "T22: Speed %",
    description: "Speed multiplier (100=calculated).",
    group      : "prismPocket22",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT22FeedPct: {
    title      : "T22: Feed %",
    description: "Feed multiplier (100=calculated).",
    group      : "prismPocket22",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT22ApplyMultipliersTo: {
    title      : "T22: Apply Multipliers To",
    description: "Controls when Speed%/Feed% multipliers are applied. 'Milling Only' = skip drilling/tapping (recommended). 'All' = always apply. 'Off' = never apply (use Fusion feeds).",
    group      : "prismPocket22",
    type       : "enum",
    values     : [
      {title: "Milling Only (Skip Drilling)", id: "milling_only"},
      {title: "All Operations", id: "all"},
      {title: "Off (Use Fusion Programmed)", id: "off"}
    ],
    value      : "milling_only",
    scope      : "post"
  },
  prismT22Indexable: {
    title      : "T22: Indexable Insert Tool",
    description: "Enable indexable insert parameters for this tool (face mills, indexable endmills, high-feed, etc).",
    group      : "prismPocket22",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismT22InsertStyle: {
    title      : "T22: Insert Cutter Style",
    description: "Type of indexable cutter.",
    group      : "prismPocket22",
    type       : "enum",
    values     : [
      {title: "Face Mill (45 deg lead)", id: "face_mill_45"},
      {title: "Face Mill (90 deg lead)", id: "face_mill_90"},
      {title: "High Feed Mill (10-17 deg)", id: "high_feed"},
      {title: "Shoulder/Square Mill (90 deg)", id: "shoulder_90"},
      {title: "Button Cutter (Round)", id: "button"},
      {title: "Indexable Ball", id: "ball"},
      {title: "Indexable Drill", id: "drill"},
      {title: "Chamfer Mill", id: "chamfer"},
      {title: "Slot Mill", id: "slot"},
      {title: "Copy Mill / 3D", id: "copy"}
    ],
    value      : "face_mill_45",
    scope      : "post"
  },
  prismT22LeadAngle: {
    title      : "T22: Lead/Entry Angle",
    description: "Insert approach angle. Affects chip thickness and axial force. High-feed uses 10-17 deg.",
    group      : "prismPocket22",
    type       : "enum",
    values     : [
      {title: "90 deg (Square shoulder)", id: "90"},
      {title: "75 deg", id: "75"},
      {title: "65 deg", id: "65"},
      {title: "60 deg", id: "60"},
      {title: "45 deg (Common face mill)", id: "45"},
      {title: "30 deg", id: "30"},
      {title: "20 deg", id: "20"},
      {title: "17 deg (High feed)", id: "17"},
      {title: "15 deg", id: "15"},
      {title: "12 deg (High feed)", id: "12"},
      {title: "10 deg (High feed)", id: "10"}
    ],
    value      : "45",
    scope      : "post"
  },
  prismT22InsertGrade: {
    title      : "T22: Insert Grade",
    description: "Carbide grade - select based on manufacturer or use generic ISO grades.",
    group      : "prismPocket22",
    type       : "enum",
    values     : INSERT_GRADE_VALUES,
    value      : "P20",
    scope      : "post"
  },
  prismT22InsertNoseR: {
    title      : "T22: Insert Nose Radius",
    description: "Corner radius in mm. Enter your insert nose radius (e.g. 0.4, 0.8, 1.2). Larger = higher feed possible, rougher finish.",
    group      : "prismPocket22",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  prismT22Coolant: {
    title      : "T22: Coolant Strategy",
    description: "Coolant output for this tool. Override per operation or use tool default.",
    group      : "prismPocket22",
    type       : "enum",
    values     : [
      {title: "Use Fusion Setting", id: "fusion"},
      {title: "Flood (M8)", id: "flood"},
      {title: "Mist (M7)", id: "mist"},
      {title: "Flood + Mist (M7 M8)", id: "flood_mist"},
      {title: "Through Spindle (M88)", id: "thru_spindle"},
      {title: "Through Spindle HP", id: "thru_spindle_hp"},
      {title: "Air Blast (M51)", id: "air"},
      {title: "Air + Mist (MQL)", id: "mql"},
      {title: "Vacuum / Dust Collection", id: "vacuum"},
      {title: "Off / Dry (M9)", id: "off"}
    ],
    value      : "fusion",
    scope      : "post"
  },
  prismT22Strategy: {
    title      : "T22: Machining Strategy",
    description: "Unified machining strategy. ROUGHING: HEM/HSM/Aggressive/Balanced/Conservative. FINISHING: Surface/Accuracy/Balanced/Productivity. Auto=detect from Fusion operation type.",
    group      : "prismPocket22",
    type       : "enum",
        values     : [
      {title: "Auto-Detect", id: "auto"},
      {title: "=== ROUGHING ===", id: "_rough_header"},
      {title: "HEM - High Efficiency Milling", id: "hem"},
      {title: "HSM - High Speed Machining", id: "hsm"},
      {title: "Aggressive (Max MRR)", id: "aggressive"},
      {title: "Balanced Roughing", id: "balanced"},
      {title: "Conservative (Tool Life)", id: "conservative"},
      {title: "=== FINISHING ===", id: "_finish_header"},
      {title: "Finish - Surface Quality", id: "finish"},
      {title: "Finish - Accuracy Priority", id: "accuracy"},
      {title: "Finish - Balanced", id: "finish_balanced"},
      {title: "Finish - Productivity", id: "finish_productivity"},
      {title: "=== OTHER ===", id: "_other_header"},
      {title: "Off (Use Programmed)", id: "off"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismT22MaxChipThinMult: {
    title      : "T22: Max Chip Thinning Mult",
    description: "Maximum feed increase from chip thinning. At 10% WOC theoretical is 3.2x. Cap for safety. Overrides global setting.",
    group      : "prismPocket22",
    type       : "number",
    range      : [1.0, 4.0],
    value      : 2.5,
    scope      : "post"
  },
  prismT22DeflectionLimit: {
    title      : "T22: Max Deflection (in)",
    description: "Feed reduced when calculated deflection exceeds this. 0.001-0.002 for finish, 0.003-0.005 for rough.",
    group      : "prismPocket22",
    type       : "number",
    range      : [0.0005, 0.010],
    value      : 0.002,
    scope      : "post"
  },
  prismT22TargetRa: {
    title      : "T22: Target Ra (uin)",
    description: "Target surface roughness in microinches. 16=fine finish, 32=good, 63=standard, 125=rough finish.",
    group      : "prismPocket22",
    type       : "enum",
    values     : [
      {title: "8 uin (Mirror/Lapped)", id: "8"},
      {title: "16 uin (Fine Finish)", id: "16"},
      {title: "32 uin (Good Finish)", id: "32"},
      {title: "63 uin (Standard)", id: "63"},
      {title: "125 uin (Semi-Finish)", id: "125"},
      {title: "250 uin (Roughing)", id: "250"},
      {title: "500 uin (Adaptive/HEM)", id: "500"},
      {title: "999 uin (Ignore Finish)", id: "999"}
    ],
    value      : "32",
    scope      : "post"
  },
  prismT22Aggressiveness: {
    title      : "T22: Aggressiveness (1-8)",
    description: "How hard should PRISM push? 1 = safest (longest tool life). 5 = balanced. 8 = fastest (maximum material removal). Start at 5 if unsure.",
    group      : "prismPocket22",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },
  // ===========================================================================
  // TOOL POCKET 23 (T23)
  // ===========================================================================
  prismT23Material: {
    title      : "T23: Tool Material",
    description: "Tool substrate.",
    group      : "prismPocket23",
    type       : "enum",
    values     : TOOL_MATERIAL_VALUES,
    value      : "carbide",
    scope      : "post"
  },
  prismT23Coating: {
    title      : "T23: Coating",
    description: "Tool coating.",
    group      : "prismPocket23",
    type       : "enum",
    values     : COATING_VALUES,
    value      : "tialn",
    scope      : "post"
  },
  prismT23Brand: {
    title      : "T23: Brand",
    description: "Tool manufacturer.",
    group      : "prismPocket23",
    type       : "enum",
    values     : BRAND_VALUES,
    value      : "generic",
    scope      : "post"
  },
  prismT23HolderType: {
    title      : "T23: Holder Type",
    description: "Tool holder style.",
    group      : "prismPocket23",
    type       : "enum",
    values     : HOLDER_TYPE_VALUES,
    value      : "er_collet",
    scope      : "post"
  },
  prismT23HolderExtension: {
    title      : "T23: Holder Extension (in)",
    description: "Holder projection from spindle face. For extended arbors, enter total length. 0=auto from tool body.",
    group      : "prismPocket23",
    type       : "number",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  prismT23Condition: {
    title      : "T23: Condition",
    description: "Tool wear state.",
    group      : "prismPocket23",
    type       : "enum",
    values     : [
      {title: "New", id: "new"},
      {title: "Good", id: "good"},
      {title: "Worn", id: "worn"},
      {title: "Regrind", id: "regrind"}
    ],
    value      : "new",
    scope      : "post"
  },
  prismT23SpeedPct: {
    title      : "T23: Speed %",
    description: "Speed multiplier (100=calculated).",
    group      : "prismPocket23",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT23FeedPct: {
    title      : "T23: Feed %",
    description: "Feed multiplier (100=calculated).",
    group      : "prismPocket23",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT23ApplyMultipliersTo: {
    title      : "T23: Apply Multipliers To",
    description: "Controls when Speed%/Feed% multipliers are applied. 'Milling Only' = skip drilling/tapping (recommended). 'All' = always apply. 'Off' = never apply (use Fusion feeds).",
    group      : "prismPocket23",
    type       : "enum",
    values     : [
      {title: "Milling Only (Skip Drilling)", id: "milling_only"},
      {title: "All Operations", id: "all"},
      {title: "Off (Use Fusion Programmed)", id: "off"}
    ],
    value      : "milling_only",
    scope      : "post"
  },
  prismT23Indexable: {
    title      : "T23: Indexable Insert Tool",
    description: "Enable indexable insert parameters for this tool (face mills, indexable endmills, high-feed, etc).",
    group      : "prismPocket23",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismT23InsertStyle: {
    title      : "T23: Insert Cutter Style",
    description: "Type of indexable cutter.",
    group      : "prismPocket23",
    type       : "enum",
    values     : [
      {title: "Face Mill (45 deg lead)", id: "face_mill_45"},
      {title: "Face Mill (90 deg lead)", id: "face_mill_90"},
      {title: "High Feed Mill (10-17 deg)", id: "high_feed"},
      {title: "Shoulder/Square Mill (90 deg)", id: "shoulder_90"},
      {title: "Button Cutter (Round)", id: "button"},
      {title: "Indexable Ball", id: "ball"},
      {title: "Indexable Drill", id: "drill"},
      {title: "Chamfer Mill", id: "chamfer"},
      {title: "Slot Mill", id: "slot"},
      {title: "Copy Mill / 3D", id: "copy"}
    ],
    value      : "face_mill_45",
    scope      : "post"
  },
  prismT23LeadAngle: {
    title      : "T23: Lead/Entry Angle",
    description: "Insert approach angle. Affects chip thickness and axial force. High-feed uses 10-17 deg.",
    group      : "prismPocket23",
    type       : "enum",
    values     : [
      {title: "90 deg (Square shoulder)", id: "90"},
      {title: "75 deg", id: "75"},
      {title: "65 deg", id: "65"},
      {title: "60 deg", id: "60"},
      {title: "45 deg (Common face mill)", id: "45"},
      {title: "30 deg", id: "30"},
      {title: "20 deg", id: "20"},
      {title: "17 deg (High feed)", id: "17"},
      {title: "15 deg", id: "15"},
      {title: "12 deg (High feed)", id: "12"},
      {title: "10 deg (High feed)", id: "10"}
    ],
    value      : "45",
    scope      : "post"
  },
  prismT23InsertGrade: {
    title      : "T23: Insert Grade",
    description: "Carbide grade - select based on manufacturer or use generic ISO grades.",
    group      : "prismPocket23",
    type       : "enum",
    values     : INSERT_GRADE_VALUES,
    value      : "P20",
    scope      : "post"
  },
  prismT23InsertNoseR: {
    title      : "T23: Insert Nose Radius",
    description: "Corner radius in mm. Enter your insert nose radius (e.g. 0.4, 0.8, 1.2). Larger = higher feed possible, rougher finish.",
    group      : "prismPocket23",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  prismT23Coolant: {
    title      : "T23: Coolant Strategy",
    description: "Coolant output for this tool. Override per operation or use tool default.",
    group      : "prismPocket23",
    type       : "enum",
    values     : [
      {title: "Use Fusion Setting", id: "fusion"},
      {title: "Flood (M8)", id: "flood"},
      {title: "Mist (M7)", id: "mist"},
      {title: "Flood + Mist (M7 M8)", id: "flood_mist"},
      {title: "Through Spindle (M88)", id: "thru_spindle"},
      {title: "Through Spindle HP", id: "thru_spindle_hp"},
      {title: "Air Blast (M51)", id: "air"},
      {title: "Air + Mist (MQL)", id: "mql"},
      {title: "Vacuum / Dust Collection", id: "vacuum"},
      {title: "Off / Dry (M9)", id: "off"}
    ],
    value      : "fusion",
    scope      : "post"
  },
  prismT23Strategy: {
    title      : "T23: Machining Strategy",
    description: "Unified machining strategy. ROUGHING: HEM/HSM/Aggressive/Balanced/Conservative. FINISHING: Surface/Accuracy/Balanced/Productivity. Auto=detect from Fusion operation type.",
    group      : "prismPocket23",
    type       : "enum",
        values     : [
      {title: "Auto-Detect", id: "auto"},
      {title: "=== ROUGHING ===", id: "_rough_header"},
      {title: "HEM - High Efficiency Milling", id: "hem"},
      {title: "HSM - High Speed Machining", id: "hsm"},
      {title: "Aggressive (Max MRR)", id: "aggressive"},
      {title: "Balanced Roughing", id: "balanced"},
      {title: "Conservative (Tool Life)", id: "conservative"},
      {title: "=== FINISHING ===", id: "_finish_header"},
      {title: "Finish - Surface Quality", id: "finish"},
      {title: "Finish - Accuracy Priority", id: "accuracy"},
      {title: "Finish - Balanced", id: "finish_balanced"},
      {title: "Finish - Productivity", id: "finish_productivity"},
      {title: "=== OTHER ===", id: "_other_header"},
      {title: "Off (Use Programmed)", id: "off"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismT23MaxChipThinMult: {
    title      : "T23: Max Chip Thinning Mult",
    description: "Maximum feed increase from chip thinning. At 10% WOC theoretical is 3.2x. Cap for safety. Overrides global setting.",
    group      : "prismPocket23",
    type       : "number",
    range      : [1.0, 4.0],
    value      : 2.5,
    scope      : "post"
  },
  prismT23DeflectionLimit: {
    title      : "T23: Max Deflection (in)",
    description: "Feed reduced when calculated deflection exceeds this. 0.001-0.002 for finish, 0.003-0.005 for rough.",
    group      : "prismPocket23",
    type       : "number",
    range      : [0.0005, 0.010],
    value      : 0.002,
    scope      : "post"
  },
  prismT23TargetRa: {
    title      : "T23: Target Ra (uin)",
    description: "Target surface roughness in microinches. 16=fine finish, 32=good, 63=standard, 125=rough finish.",
    group      : "prismPocket23",
    type       : "enum",
    values     : [
      {title: "8 uin (Mirror/Lapped)", id: "8"},
      {title: "16 uin (Fine Finish)", id: "16"},
      {title: "32 uin (Good Finish)", id: "32"},
      {title: "63 uin (Standard)", id: "63"},
      {title: "125 uin (Semi-Finish)", id: "125"},
      {title: "250 uin (Roughing)", id: "250"},
      {title: "500 uin (Adaptive/HEM)", id: "500"},
      {title: "999 uin (Ignore Finish)", id: "999"}
    ],
    value      : "32",
    scope      : "post"
  },
  prismT23Aggressiveness: {
    title      : "T23: Aggressiveness (1-8)",
    description: "How hard should PRISM push? 1 = safest (longest tool life). 5 = balanced. 8 = fastest (maximum material removal). Start at 5 if unsure.",
    group      : "prismPocket23",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },
  // ===========================================================================
  // TOOL POCKET 24 (T24)
  // ===========================================================================
  prismT24Material: {
    title      : "T24: Tool Material",
    description: "Tool substrate.",
    group      : "prismPocket24",
    type       : "enum",
    values     : TOOL_MATERIAL_VALUES,
    value      : "carbide",
    scope      : "post"
  },
  prismT24Coating: {
    title      : "T24: Coating",
    description: "Tool coating.",
    group      : "prismPocket24",
    type       : "enum",
    values     : COATING_VALUES,
    value      : "tialn",
    scope      : "post"
  },
  prismT24Brand: {
    title      : "T24: Brand",
    description: "Tool manufacturer.",
    group      : "prismPocket24",
    type       : "enum",
    values     : BRAND_VALUES,
    value      : "generic",
    scope      : "post"
  },
  prismT24HolderType: {
    title      : "T24: Holder Type",
    description: "Tool holder style.",
    group      : "prismPocket24",
    type       : "enum",
    values     : HOLDER_TYPE_VALUES,
    value      : "er_collet",
    scope      : "post"
  },
  prismT24HolderExtension: {
    title      : "T24: Holder Extension (in)",
    description: "Holder projection from spindle face. For extended arbors, enter total length. 0=auto from tool body.",
    group      : "prismPocket24",
    type       : "number",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  prismT24Condition: {
    title      : "T24: Condition",
    description: "Tool wear state.",
    group      : "prismPocket24",
    type       : "enum",
    values     : [
      {title: "New", id: "new"},
      {title: "Good", id: "good"},
      {title: "Worn", id: "worn"},
      {title: "Regrind", id: "regrind"}
    ],
    value      : "new",
    scope      : "post"
  },
  prismT24SpeedPct: {
    title      : "T24: Speed %",
    description: "Speed multiplier (100=calculated).",
    group      : "prismPocket24",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT24FeedPct: {
    title      : "T24: Feed %",
    description: "Feed multiplier (100=calculated).",
    group      : "prismPocket24",
    type       : "integer",
    range      : [25, 200],
    value      : 100,
    scope      : "post"
  },
  prismT24ApplyMultipliersTo: {
    title      : "T24: Apply Multipliers To",
    description: "Controls when Speed%/Feed% multipliers are applied. 'Milling Only' = skip drilling/tapping (recommended). 'All' = always apply. 'Off' = never apply (use Fusion feeds).",
    group      : "prismPocket24",
    type       : "enum",
    values     : [
      {title: "Milling Only (Skip Drilling)", id: "milling_only"},
      {title: "All Operations", id: "all"},
      {title: "Off (Use Fusion Programmed)", id: "off"}
    ],
    value      : "milling_only",
    scope      : "post"
  },
  prismT24Indexable: {
    title      : "T24: Indexable Insert Tool",
    description: "Enable indexable insert parameters for this tool (face mills, indexable endmills, high-feed, etc).",
    group      : "prismPocket24",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismT24InsertStyle: {
    title      : "T24: Insert Cutter Style",
    description: "Type of indexable cutter.",
    group      : "prismPocket24",
    type       : "enum",
    values     : [
      {title: "Face Mill (45 deg lead)", id: "face_mill_45"},
      {title: "Face Mill (90 deg lead)", id: "face_mill_90"},
      {title: "High Feed Mill (10-17 deg)", id: "high_feed"},
      {title: "Shoulder/Square Mill (90 deg)", id: "shoulder_90"},
      {title: "Button Cutter (Round)", id: "button"},
      {title: "Indexable Ball", id: "ball"},
      {title: "Indexable Drill", id: "drill"},
      {title: "Chamfer Mill", id: "chamfer"},
      {title: "Slot Mill", id: "slot"},
      {title: "Copy Mill / 3D", id: "copy"}
    ],
    value      : "face_mill_45",
    scope      : "post"
  },
  prismT24LeadAngle: {
    title      : "T24: Lead/Entry Angle",
    description: "Insert approach angle. Affects chip thickness and axial force. High-feed uses 10-17 deg.",
    group      : "prismPocket24",
    type       : "enum",
    values     : [
      {title: "90 deg (Square shoulder)", id: "90"},
      {title: "75 deg", id: "75"},
      {title: "65 deg", id: "65"},
      {title: "60 deg", id: "60"},
      {title: "45 deg (Common face mill)", id: "45"},
      {title: "30 deg", id: "30"},
      {title: "20 deg", id: "20"},
      {title: "17 deg (High feed)", id: "17"},
      {title: "15 deg", id: "15"},
      {title: "12 deg (High feed)", id: "12"},
      {title: "10 deg (High feed)", id: "10"}
    ],
    value      : "45",
    scope      : "post"
  },
  prismT24InsertGrade: {
    title      : "T24: Insert Grade",
    description: "Carbide grade - select based on manufacturer or use generic ISO grades.",
    group      : "prismPocket24",
    type       : "enum",
    values     : INSERT_GRADE_VALUES,
    value      : "P20",
    scope      : "post"
  },
  prismT24InsertNoseR: {
    title      : "T24: Insert Nose Radius",
    description: "Corner radius in mm. Enter your insert nose radius (e.g. 0.4, 0.8, 1.2). Larger = higher feed possible, rougher finish.",
    group      : "prismPocket24",
    type       : "number",
    value      : 0.8,
    scope      : "post"
  },
  prismT24Coolant: {
    title      : "T24: Coolant Strategy",
    description: "Coolant output for this tool. Override per operation or use tool default.",
    group      : "prismPocket24",
    type       : "enum",
    values     : [
      {title: "Use Fusion Setting", id: "fusion"},
      {title: "Flood (M8)", id: "flood"},
      {title: "Mist (M7)", id: "mist"},
      {title: "Flood + Mist (M7 M8)", id: "flood_mist"},
      {title: "Through Spindle (M88)", id: "thru_spindle"},
      {title: "Through Spindle HP", id: "thru_spindle_hp"},
      {title: "Air Blast (M51)", id: "air"},
      {title: "Air + Mist (MQL)", id: "mql"},
      {title: "Vacuum / Dust Collection", id: "vacuum"},
      {title: "Off / Dry (M9)", id: "off"}
    ],
    value      : "fusion",
    scope      : "post"
  },
  prismT24Strategy: {
    title      : "T24: Machining Strategy",
    description: "Unified machining strategy. ROUGHING: HEM/HSM/Aggressive/Balanced/Conservative. FINISHING: Surface/Accuracy/Balanced/Productivity. Auto=detect from Fusion operation type.",
    group      : "prismPocket24",
    type       : "enum",
        values     : [
      {title: "Auto-Detect", id: "auto"},
      {title: "=== ROUGHING ===", id: "_rough_header"},
      {title: "HEM - High Efficiency Milling", id: "hem"},
      {title: "HSM - High Speed Machining", id: "hsm"},
      {title: "Aggressive (Max MRR)", id: "aggressive"},
      {title: "Balanced Roughing", id: "balanced"},
      {title: "Conservative (Tool Life)", id: "conservative"},
      {title: "=== FINISHING ===", id: "_finish_header"},
      {title: "Finish - Surface Quality", id: "finish"},
      {title: "Finish - Accuracy Priority", id: "accuracy"},
      {title: "Finish - Balanced", id: "finish_balanced"},
      {title: "Finish - Productivity", id: "finish_productivity"},
      {title: "=== OTHER ===", id: "_other_header"},
      {title: "Off (Use Programmed)", id: "off"}
    ],
    value      : "auto",
    scope      : "post"
  },
  prismT24MaxChipThinMult: {
    title      : "T24: Max Chip Thinning Mult",
    description: "Maximum feed increase from chip thinning. At 10% WOC theoretical is 3.2x. Cap for safety. Overrides global setting.",
    group      : "prismPocket24",
    type       : "number",
    range      : [1.0, 4.0],
    value      : 2.5,
    scope      : "post"
  },
  prismT24DeflectionLimit: {
    title      : "T24: Max Deflection (in)",
    description: "Feed reduced when calculated deflection exceeds this. 0.001-0.002 for finish, 0.003-0.005 for rough.",
    group      : "prismPocket24",
    type       : "number",
    range      : [0.0005, 0.010],
    value      : 0.002,
    scope      : "post"
  },
  prismT24TargetRa: {
    title      : "T24: Target Ra (uin)",
    description: "Target surface roughness in microinches. 16=fine finish, 32=good, 63=standard, 125=rough finish.",
    group      : "prismPocket24",
    type       : "enum",
    values     : [
      {title: "8 uin (Mirror/Lapped)", id: "8"},
      {title: "16 uin (Fine Finish)", id: "16"},
      {title: "32 uin (Good Finish)", id: "32"},
      {title: "63 uin (Standard)", id: "63"},
      {title: "125 uin (Semi-Finish)", id: "125"},
      {title: "250 uin (Roughing)", id: "250"},
      {title: "500 uin (Adaptive/HEM)", id: "500"},
      {title: "999 uin (Ignore Finish)", id: "999"}
    ],
    value      : "32",
    scope      : "post"
  },
  prismT24Aggressiveness: {
    title      : "T24: Aggressiveness (1-8)",
    description: "How hard should PRISM push? 1 = safest (longest tool life). 5 = balanced. 8 = fastest (maximum material removal). Start at 5 if unsure.",
    group      : "prismPocket24",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },
};

// =============================================================================
// PRISM MANUFACTURING INTELLIGENCE v9.0 - MATERIAL DATABASE
// =============================================================================

// =============================================================================
// PRISM MATERIAL DATABASE - CONDENSED PHYSICS COEFFICIENTS
// =============================================================================
// Source: PRISM v9.0 Materials Database (3,518 materials)
// Contains Kienzle (kc1.1, mc), Taylor (C, n), thermal, and speed limits
// Units: kc1.1 in N/mm , Vc in m/min (converted to SFM internally)
// =============================================================================

var PRISM_MATERIALS = {

  /**
   * Get material data with fallback to group defaults
   */
  getMaterial: function(materialId) {
    // Direct lookup
    if (this.database && this.database[materialId]) {
      return this.database[materialId];
    }
    
    // Try group default
    var group = materialId.charAt(0);
    if (this.GROUP_DEFAULTS && this.GROUP_DEFAULTS[group]) {
      return this.GROUP_DEFAULTS[group];
    }
    
    // Ultimate fallback - generic steel
    return {
      name: "Unknown Material",
      kc1_1: 1800,
      mc: 0.25,
      speeds: { carbide: { rec: 100 } }
    };
  },
  // Group defaults for when specific material not selected
  GROUP_DEFAULTS: {
    P: { name: "Steel (Generic)", kc1_1: 1800, mc: 0.25, speeds: { carbide: { rec: 150 } } },
    M: { name: "Stainless (Generic)", kc1_1: 2400, mc: 0.28, speeds: { carbide: { rec: 90 } } },
    K: { name: "Cast Iron (Generic)", kc1_1: 1100, mc: 0.22, speeds: { carbide: { rec: 180 } } },
    N: { name: "Non-Ferrous (Generic)", kc1_1: 700, mc: 0.20, speeds: { carbide: { rec: 400 } } },
    S: { name: "Superalloy (Generic)", kc1_1: 3200, mc: 0.32, speeds: { carbide: { rec: 30 } } },
    H: { name: "Hardened (Generic)", kc1_1: 4000, mc: 0.35, speeds: { carbide: { rec: 60 } } },
    X: { name: "Specialty (Generic)", kc1_1: 1500, mc: 0.25, speeds: { carbide: { rec: 100 } } }
  },

  // =========================================================================
  // P - STEELS
  // =========================================================================
  "P_1018_CR": {
    name: "1018 Mild Steel (Cold Rolled)",
    group: "P", hardness: 126, density: 7870,
    kienzle: { kc1_1: 1680, mc: 0.26 },
    taylor: { C: 280, n: 0.22 },
    thermal: { k: 51.9, Tmax: 850 },
    speeds: { carbide: { min: 120, rec: 180, max: 250 }, hss: { min: 25, rec: 35, max: 50 } }, chip: "continuous"
  },
  "P_1018_HR": {
    name: "1018 Mild Steel (Hot Rolled)",
    group: "P", hardness: 116, density: 7870,
    kienzle: { kc1_1: 1620, mc: 0.25 },
    taylor: { C: 290, n: 0.22 },
    thermal: { k: 51.9, Tmax: 850 },
    speeds: { carbide: { min: 130, rec: 190, max: 260 }, hss: { min: 28, rec: 38, max: 55 } }, chip: "continuous"
  },
  "P_1020": {
    name: "1020 Low Carbon Steel",
    group: "P", hardness: 130, density: 7870,
    kienzle: { kc1_1: 1700, mc: 0.26 },
    taylor: { C: 275, n: 0.22 },
    thermal: { k: 51.2, Tmax: 850 },
    speeds: { carbide: { min: 115, rec: 175, max: 240 }, hss: { min: 24, rec: 34, max: 48 } }, chip: "continuous"
  },
  "P_1045": {
    name: "1045 Medium Carbon Steel",
    group: "P", hardness: 180, density: 7850,
    kienzle: { kc1_1: 1950, mc: 0.27 },
    taylor: { C: 220, n: 0.20 },
    thermal: { k: 49.8, Tmax: 820 },
    speeds: { carbide: { min: 90, rec: 140, max: 200 }, hss: { min: 18, rec: 28, max: 40 } }, chip: "continuous"
  },
  "P_1045_QT": {
    name: "1045 Medium Carbon (Q&T 28-32 HRC)",
    group: "P", hardness: 280, density: 7850,
    kienzle: { kc1_1: 2250, mc: 0.28 },
    taylor: { C: 180, n: 0.18 },
    thermal: { k: 48.5, Tmax: 780 },
    speeds: { carbide: { min: 70, rec: 110, max: 160 }, hss: { min: 12, rec: 20, max: 30 } }, chip: "segmented"
  },
  "P_12L14": {
    name: "12L14 Free Machining Steel",
    group: "P", hardness: 160, density: 7870,
    kienzle: { kc1_1: 1450, mc: 0.22 },
    taylor: { C: 380, n: 0.28 },
    thermal: { k: 51.5, Tmax: 880 },
    speeds: { carbide: { min: 180, rec: 280, max: 400 }, hss: { min: 45, rec: 70, max: 100 } }, chip: "breaking"
  },
  "P_1215": {
    name: "1215 Free Machining Steel",
    group: "P", hardness: 155, density: 7870,
    kienzle: { kc1_1: 1480, mc: 0.23 },
    taylor: { C: 360, n: 0.27 },
    thermal: { k: 51.5, Tmax: 870 },
    speeds: { carbide: { min: 170, rec: 260, max: 380 }, hss: { min: 42, rec: 65, max: 95 } }, chip: "breaking"
  },
  "P_4130_ANN": {
    name: "4130 Chromoly (Annealed)",
    group: "P", hardness: 156, density: 7850,
    kienzle: { kc1_1: 1850, mc: 0.24 },
    taylor: { C: 240, n: 0.21 },
    thermal: { k: 42.0, Tmax: 830 },
    speeds: { carbide: { min: 100, rec: 150, max: 210 }, hss: { min: 20, rec: 32, max: 45 } }, chip: "continuous"
  },
  "P_4130_NORM": {
    name: "4130 Chromoly (Normalized)",
    group: "P", hardness: 197, density: 7850,
    kienzle: { kc1_1: 2000, mc: 0.25 },
    taylor: { C: 210, n: 0.20 },
    thermal: { k: 42.0, Tmax: 810 },
    speeds: { carbide: { min: 85, rec: 130, max: 185 }, hss: { min: 16, rec: 26, max: 38 } }, chip: "continuous"
  },
  "P_4140_ANN": {
    name: "4140 Alloy Steel (Annealed)",
    group: "P", hardness: 190, density: 7850,
    kienzle: { kc1_1: 1980, mc: 0.25 },
    taylor: { C: 225, n: 0.20 },
    thermal: { k: 42.6, Tmax: 820 },
    speeds: { carbide: { min: 100, rec: 175, max: 240 }, hss: { min: 20, rec: 32, max: 45 } }, chip: "continuous"
  },
  "P_4140_QT": {
    name: "4140 Alloy Steel (Q&T 28-32 HRC)",
    group: "P", hardness: 293, density: 7850,
    kienzle: { kc1_1: 2350, mc: 0.28 },
    taylor: { C: 165, n: 0.17 },
    thermal: { k: 41.0, Tmax: 760 },
    speeds: { carbide: { min: 60, rec: 100, max: 145 }, hss: { min: 10, rec: 18, max: 28 } }, chip: "segmented"
  },
  "P_4340_ANN": {
    name: "4340 Alloy Steel (Annealed)",
    group: "P", hardness: 217, density: 7850,
    kienzle: { kc1_1: 2100, mc: 0.26 },
    taylor: { C: 200, n: 0.19 },
    thermal: { k: 38.1, Tmax: 800 },
    speeds: { carbide: { min: 75, rec: 120, max: 170 }, hss: { min: 14, rec: 24, max: 35 } }, chip: "continuous"
  },
  "P_4340_QT": {
    name: "4340 Alloy Steel (Q&T 38-42 HRC)",
    group: "P", hardness: 375, density: 7850,
    kienzle: { kc1_1: 2650, mc: 0.30 },
    taylor: { C: 130, n: 0.15 },
    thermal: { k: 36.5, Tmax: 720 },
    speeds: { carbide: { min: 45, rec: 75, max: 110 }, hss: { min: 6, rec: 12, max: 20 } }, chip: "segmented"
  },
  "P_8620": {
    name: "8620 Case Hardening Steel",
    group: "P", hardness: 160, density: 7850,
    kienzle: { kc1_1: 1820, mc: 0.24 },
    taylor: { C: 250, n: 0.21 },
    thermal: { k: 46.0, Tmax: 840 },
    speeds: { carbide: { min: 100, rec: 155, max: 215 }, hss: { min: 20, rec: 32, max: 45 } }, chip: "continuous"
  },
  "P_A36": {
    name: "A36 Structural Steel",
    group: "P", hardness: 130, density: 7850,
    kienzle: { kc1_1: 1720, mc: 0.26 },
    taylor: { C: 270, n: 0.22 },
    thermal: { k: 52.0, Tmax: 850 },
    speeds: { carbide: { min: 115, rec: 175, max: 245 }, hss: { min: 24, rec: 36, max: 52 } }, chip: "continuous"
  },
  "P_A572": {
    name: "A572 Grade 50 HSLA",
    group: "P", hardness: 150, density: 7850,
    kienzle: { kc1_1: 1850, mc: 0.26 },
    taylor: { C: 245, n: 0.21 },
    thermal: { k: 50.0, Tmax: 830 },
    speeds: { carbide: { min: 100, rec: 155, max: 215 }, hss: { min: 20, rec: 32, max: 45 } }, chip: "continuous"
  },
  "P_D2_ANN": {
    name: "D2 Tool Steel (Annealed)",
    group: "P", hardness: 235, density: 7700,
    kienzle: { kc1_1: 2400, mc: 0.28 },
    taylor: { C: 150, n: 0.16 },
    thermal: { k: 20.5, Tmax: 750 },
    speeds: { carbide: { min: 50, rec: 85, max: 125 }, hss: { min: 8, rec: 15, max: 25 } }, chip: "segmented"
  },
  "P_O1_ANN": {
    name: "O1 Tool Steel (Annealed)",
    group: "P", hardness: 210, density: 7830,
    kienzle: { kc1_1: 2150, mc: 0.26 },
    taylor: { C: 175, n: 0.18 },
    thermal: { k: 30.0, Tmax: 780 },
    speeds: { carbide: { min: 65, rec: 100, max: 150 }, hss: { min: 12, rec: 20, max: 32 } }, chip: "continuous"
  },
  "P_A2_ANN": {
    name: "A2 Tool Steel (Annealed)",
    group: "P", hardness: 220, density: 7860,
    kienzle: { kc1_1: 2200, mc: 0.27 },
    taylor: { C: 165, n: 0.17 },
    thermal: { k: 25.0, Tmax: 770 },
    speeds: { carbide: { min: 60, rec: 95, max: 140 }, hss: { min: 10, rec: 18, max: 28 } }, chip: "segmented"
  },
  "P_S7_ANN": {
    name: "S7 Tool Steel (Annealed)",
    group: "P", hardness: 200, density: 7830,
    kienzle: { kc1_1: 2050, mc: 0.25 },
    taylor: { C: 185, n: 0.18 },
    thermal: { k: 28.0, Tmax: 790 },
    speeds: { carbide: { min: 70, rec: 110, max: 160 }, hss: { min: 12, rec: 22, max: 35 } }, chip: "continuous"
  },
  "P_H13_ANN": {
    name: "H13 Tool Steel (Annealed)",
    group: "P", hardness: 195, density: 7800,
    kienzle: { kc1_1: 2000, mc: 0.25 },
    taylor: { C: 190, n: 0.18 },
    thermal: { k: 24.5, Tmax: 800 },
    speeds: { carbide: { min: 75, rec: 115, max: 165 }, hss: { min: 14, rec: 24, max: 36 } }, chip: "continuous"
  },
  "P_P20": {
    name: "P20 Mold Steel",
    group: "P", hardness: 300, density: 7850,
    kienzle: { kc1_1: 2300, mc: 0.27 },
    taylor: { C: 160, n: 0.17 },
    thermal: { k: 29.0, Tmax: 760 },
    speeds: { carbide: { min: 55, rec: 90, max: 130 }, hss: { min: 10, rec: 18, max: 28 } }, chip: "segmented"
  },
  
  // =========================================================================
  // M - STAINLESS STEELS
  // =========================================================================
  "M_303": {
    name: "303 Stainless (Free Machining)",
    group: "M", hardness: 180, density: 8000,
    kienzle: { kc1_1: 2100, mc: 0.26 },
    taylor: { C: 160, n: 0.18 },
    thermal: { k: 16.2, Tmax: 700 },
    speeds: { carbide: { min: 80, rec: 130, max: 180 }, hss: { min: 15, rec: 25, max: 40 } }, chip: "breaking"
  },
  "M_304": {
    name: "304 Stainless (Annealed)",
    group: "M", hardness: 190, density: 8000,
    kienzle: { kc1_1: 2350, mc: 0.28 },
    taylor: { C: 130, n: 0.16 },
    thermal: { k: 16.2, Tmax: 680 },
    speeds: { carbide: { min: 60, rec: 100, max: 150 }, hss: { min: 10, rec: 18, max: 30 } }, chip: "stringy"
  },
  "M_304L": {
    name: "304L Stainless",
    group: "M", hardness: 180, density: 8000,
    kienzle: { kc1_1: 2300, mc: 0.27 },
    taylor: { C: 135, n: 0.16 },
    thermal: { k: 16.2, Tmax: 680 },
    speeds: { carbide: { min: 65, rec: 105, max: 155 }, hss: { min: 12, rec: 20, max: 32 } }, chip: "stringy"
  },
  "M_316": {
    name: "316 Stainless (Annealed)",
    group: "M", hardness: 195, density: 8000,
    kienzle: { kc1_1: 2450, mc: 0.28 },
    taylor: { C: 120, n: 0.15 },
    thermal: { k: 16.3, Tmax: 660 },
    speeds: { carbide: { min: 55, rec: 90, max: 135 }, hss: { min: 8, rec: 16, max: 26 } }, chip: "stringy"
  },
  "M_316L": {
    name: "316L Stainless",
    group: "M", hardness: 185, density: 8000,
    kienzle: { kc1_1: 2400, mc: 0.28 },
    taylor: { C: 125, n: 0.15 },
    thermal: { k: 16.3, Tmax: 660 },
    speeds: { carbide: { min: 58, rec: 95, max: 140 }, hss: { min: 10, rec: 17, max: 28 } }, chip: "stringy"
  },
  "M_410": {
    name: "410 Stainless",
    group: "M", hardness: 210, density: 7750,
    kienzle: { kc1_1: 2200, mc: 0.26 },
    taylor: { C: 145, n: 0.17 },
    thermal: { k: 24.9, Tmax: 720 },
    speeds: { carbide: { min: 70, rec: 115, max: 165 }, hss: { min: 12, rec: 22, max: 35 } }, chip: "continuous"
  },
  "M_416": {
    name: "416 Stainless (Free Machining)",
    group: "M", hardness: 195, density: 7750,
    kienzle: { kc1_1: 2050, mc: 0.25 },
    taylor: { C: 165, n: 0.18 },
    thermal: { k: 24.9, Tmax: 740 },
    speeds: { carbide: { min: 85, rec: 135, max: 190 }, hss: { min: 16, rec: 28, max: 42 } }, chip: "breaking"
  },
  "M_420": {
    name: "420 Stainless",
    group: "M", hardness: 220, density: 7750,
    kienzle: { kc1_1: 2280, mc: 0.27 },
    taylor: { C: 140, n: 0.16 },
    thermal: { k: 24.9, Tmax: 710 },
    speeds: { carbide: { min: 65, rec: 105, max: 155 }, hss: { min: 10, rec: 20, max: 32 } }, chip: "continuous"
  },
  "M_440C": {
    name: "440C Stainless (Annealed)",
    group: "M", hardness: 250, density: 7750,
    kienzle: { kc1_1: 2550, mc: 0.29 },
    taylor: { C: 115, n: 0.14 },
    thermal: { k: 24.2, Tmax: 680 },
    speeds: { carbide: { min: 45, rec: 75, max: 115 }, hss: { min: 6, rec: 12, max: 22 } }, chip: "segmented"
  },
  "M_174_H900": {
    name: "17-4 PH Stainless (H900)",
    group: "M", hardness: 388, density: 7780,
    kienzle: { kc1_1: 2750, mc: 0.30 },
    taylor: { C: 100, n: 0.13 },
    thermal: { k: 18.3, Tmax: 640 },
    speeds: { carbide: { min: 35, rec: 60, max: 95 }, hss: { min: 5, rec: 10, max: 18 } }, chip: "segmented"
  },
  "M_174_H1025": {
    name: "17-4 PH Stainless (H1025)",
    group: "M", hardness: 331, density: 7780,
    kienzle: { kc1_1: 2550, mc: 0.29 },
    taylor: { C: 120, n: 0.14 },
    thermal: { k: 18.3, Tmax: 660 },
    speeds: { carbide: { min: 45, rec: 75, max: 115 }, hss: { min: 7, rec: 14, max: 24 } }, chip: "segmented"
  },
  "M_155": {
    name: "15-5 PH Stainless",
    group: "M", hardness: 350, density: 7780,
    kienzle: { kc1_1: 2600, mc: 0.29 },
    taylor: { C: 115, n: 0.14 },
    thermal: { k: 17.8, Tmax: 650 },
    speeds: { carbide: { min: 40, rec: 68, max: 105 }, hss: { min: 6, rec: 12, max: 20 } }, chip: "segmented"
  },
  "M_2205": {
    name: "Duplex 2205 Stainless",
    group: "M", hardness: 280, density: 7820,
    kienzle: { kc1_1: 2700, mc: 0.30 },
    taylor: { C: 95, n: 0.13 },
    thermal: { k: 14.2, Tmax: 620 },
    speeds: { carbide: { min: 30, rec: 55, max: 85 }, hss: { min: 5, rec: 10, max: 16 } }, chip: "stringy"
  },
  
  // =========================================================================
  // K - CAST IRONS
  // =========================================================================
  "K_GRAY30": {
    name: "Gray Cast Iron (Class 30)",
    group: "K", hardness: 200, density: 7200,
    kienzle: { kc1_1: 1100, mc: 0.28 },
    taylor: { C: 200, n: 0.20 },
    thermal: { k: 46.0, Tmax: 850 },
    speeds: { carbide: { min: 100, rec: 160, max: 240 }, hss: { min: 20, rec: 35, max: 55 } }, chip: "powder"
  },
  "K_GRAY40": {
    name: "Gray Cast Iron (Class 40)",
    group: "K", hardness: 230, density: 7200,
    kienzle: { kc1_1: 1250, mc: 0.29 },
    taylor: { C: 175, n: 0.18 },
    thermal: { k: 44.0, Tmax: 820 },
    speeds: { carbide: { min: 85, rec: 140, max: 210 }, hss: { min: 16, rec: 28, max: 45 } }, chip: "powder"
  },
  "K_DUCTILE_65": {
    name: "Ductile Iron (65-45-12)",
    group: "K", hardness: 160, density: 7100,
    kienzle: { kc1_1: 1350, mc: 0.26 },
    taylor: { C: 220, n: 0.21 },
    thermal: { k: 36.0, Tmax: 850 },
    speeds: { carbide: { min: 110, rec: 175, max: 250 }, hss: { min: 22, rec: 38, max: 58 } }, chip: "segmented"
  },
  "K_DUCTILE_80": {
    name: "Ductile Iron (80-55-06)",
    group: "K", hardness: 220, density: 7100,
    kienzle: { kc1_1: 1500, mc: 0.27 },
    taylor: { C: 180, n: 0.19 },
    thermal: { k: 34.0, Tmax: 820 },
    speeds: { carbide: { min: 90, rec: 145, max: 210 }, hss: { min: 18, rec: 30, max: 48 } }, chip: "segmented"
  },
  "K_MALLEABLE": {
    name: "Malleable Iron",
    group: "K", hardness: 180, density: 7300,
    kienzle: { kc1_1: 1400, mc: 0.26 },
    taylor: { C: 200, n: 0.20 },
    thermal: { k: 38.0, Tmax: 840 },
    speeds: { carbide: { min: 100, rec: 160, max: 230 }, hss: { min: 20, rec: 34, max: 52 } }, chip: "segmented"
  },
  "K_CGI": {
    name: "Compacted Graphite Iron",
    group: "K", hardness: 240, density: 7200,
    kienzle: { kc1_1: 1550, mc: 0.28 },
    taylor: { C: 140, n: 0.16 },
    thermal: { k: 38.0, Tmax: 780 },
    speeds: { carbide: { min: 70, rec: 115, max: 170 }, hss: { min: 12, rec: 22, max: 38 } }, chip: "segmented"
  },

  // =========================================================================
  // N - NON-FERROUS (ALUMINUM)
  // =========================================================================
  "N_6061_T6": {
    name: "6061-T6 Aluminum",
    group: "N", hardness: 95, density: 2700,
    kienzle: { kc1_1: 650, mc: 0.20 },
    taylor: { C: 800, n: 0.40 },
    thermal: { k: 167, Tmax: 300 },
    speeds: { carbide: { min: 300, rec: 500, max: 900 }, hss: { min: 100, rec: 200, max: 350 } }, chip: "continuous"
  },
  "N_6061_T651": {
    name: "6061-T651 Aluminum (Plate)",
    group: "N", hardness: 95, density: 2700,
    kienzle: { kc1_1: 660, mc: 0.20 },
    taylor: { C: 790, n: 0.40 },
    thermal: { k: 167, Tmax: 300 },
    speeds: { carbide: { min: 300, rec: 480, max: 880 }, hss: { min: 100, rec: 190, max: 340 } }, chip: "continuous"
  },
  "N_7075_T6": {
    name: "7075-T6 Aluminum",
    group: "N", hardness: 150, density: 2810,
    kienzle: { kc1_1: 750, mc: 0.22 },
    taylor: { C: 650, n: 0.35 },
    thermal: { k: 130, Tmax: 280 },
    speeds: { carbide: { min: 250, rec: 400, max: 700 }, hss: { min: 80, rec: 160, max: 280 } }, chip: "continuous"
  },
  "N_7075_T651": {
    name: "7075-T651 Aluminum (Plate)",
    group: "N", hardness: 150, density: 2810,
    kienzle: { kc1_1: 760, mc: 0.22 },
    taylor: { C: 640, n: 0.35 },
    thermal: { k: 130, Tmax: 280 },
    speeds: { carbide: { min: 240, rec: 380, max: 680 }, hss: { min: 75, rec: 150, max: 270 } }, chip: "continuous"
  },
  "N_2024": {
    name: "2024-T351 Aluminum",
    group: "N", hardness: 120, density: 2780,
    kienzle: { kc1_1: 720, mc: 0.21 },
    taylor: { C: 700, n: 0.38 },
    thermal: { k: 121, Tmax: 290 },
    speeds: { carbide: { min: 280, rec: 450, max: 800 }, hss: { min: 90, rec: 180, max: 320 } }, chip: "continuous"
  },
  "N_6063": {
    name: "6063-T6 Aluminum (Extrusion)",
    group: "N", hardness: 73, density: 2690,
    kienzle: { kc1_1: 600, mc: 0.19 },
    taylor: { C: 850, n: 0.42 },
    thermal: { k: 200, Tmax: 310 },
    speeds: { carbide: { min: 350, rec: 550, max: 950 }, hss: { min: 120, rec: 220, max: 380 } }, chip: "continuous"
  },
  "N_MIC6": {
    name: "MIC-6 Cast Aluminum (Plate)",
    group: "N", hardness: 80, density: 2680,
    kienzle: { kc1_1: 620, mc: 0.19 },
    taylor: { C: 820, n: 0.41 },
    thermal: { k: 172, Tmax: 305 },
    speeds: { carbide: { min: 320, rec: 520, max: 920 }, hss: { min: 110, rec: 210, max: 360 } }, chip: "continuous"
  },
  "N_A356": {
    name: "A356 Cast Aluminum",
    group: "N", hardness: 75, density: 2680,
    kienzle: { kc1_1: 580, mc: 0.18 },
    taylor: { C: 840, n: 0.42 },
    thermal: { k: 159, Tmax: 310 },
    speeds: { carbide: { min: 340, rec: 540, max: 940 }, hss: { min: 115, rec: 215, max: 370 } }, chip: "continuous"
  },
  "N_7050": {
    name: "7050 Aluminum (Aerospace)",
    group: "N", hardness: 160, density: 2830,
    kienzle: { kc1_1: 780, mc: 0.23 },
    taylor: { C: 620, n: 0.34 },
    thermal: { k: 157, Tmax: 275 },
    speeds: { carbide: { min: 230, rec: 370, max: 660 }, hss: { min: 70, rec: 140, max: 260 } }, chip: "continuous"
  },
  "N_5052": {
    name: "5052 Aluminum",
    group: "N", hardness: 68, density: 2680,
    kienzle: { kc1_1: 590, mc: 0.19 },
    taylor: { C: 860, n: 0.43 },
    thermal: { k: 138, Tmax: 310 },
    speeds: { carbide: { min: 350, rec: 560, max: 960 }, hss: { min: 120, rec: 225, max: 385 } }, chip: "continuous"
  },

  // =========================================================================
  // N - NON-FERROUS (BRASS/BRONZE/COPPER)
  // =========================================================================
  "N_BRASS_360": {
    name: "360 Brass (Free Cutting)",
    group: "N", hardness: 80, density: 8500,
    kienzle: { kc1_1: 700, mc: 0.18 },
    taylor: { C: 600, n: 0.35 },
    thermal: { k: 115, Tmax: 350 },
    speeds: { carbide: { min: 200, rec: 350, max: 550 }, hss: { min: 80, rec: 150, max: 250 } }, chip: "breaking"
  },
  "N_BRASS_260": {
    name: "C260 Cartridge Brass",
    group: "N", hardness: 65, density: 8530,
    kienzle: { kc1_1: 780, mc: 0.20 },
    taylor: { C: 520, n: 0.32 },
    thermal: { k: 120, Tmax: 340 },
    speeds: { carbide: { min: 180, rec: 300, max: 480 }, hss: { min: 70, rec: 130, max: 220 } }, chip: "continuous"
  },
  "N_BRONZE_932": {
    name: "C932 Bearing Bronze (SAE 660)",
    group: "N", hardness: 75, density: 8800,
    kienzle: { kc1_1: 850, mc: 0.22 },
    taylor: { C: 480, n: 0.30 },
    thermal: { k: 59, Tmax: 320 },
    speeds: { carbide: { min: 150, rec: 260, max: 420 }, hss: { min: 60, rec: 110, max: 190 } }, chip: "segmented"
  },
  "N_BRONZE_954": {
    name: "C954 Aluminum Bronze",
    group: "N", hardness: 180, density: 7450,
    kienzle: { kc1_1: 1200, mc: 0.26 },
    taylor: { C: 320, n: 0.24 },
    thermal: { k: 59, Tmax: 380 },
    speeds: { carbide: { min: 100, rec: 180, max: 300 }, hss: { min: 40, rec: 80, max: 140 } }, chip: "segmented"
  },
  "N_COPPER_110": {
    name: "C110 Copper (ETP)",
    group: "N", hardness: 50, density: 8940,
    kienzle: { kc1_1: 550, mc: 0.16 },
    taylor: { C: 700, n: 0.38 },
    thermal: { k: 391, Tmax: 400 },
    speeds: { carbide: { min: 200, rec: 350, max: 550 }, hss: { min: 80, rec: 150, max: 250 } }, chip: "stringy"
  },
  "N_COPPER_145": {
    name: "C145 Tellurium Copper",
    group: "N", hardness: 65, density: 8940,
    kienzle: { kc1_1: 520, mc: 0.15 },
    taylor: { C: 750, n: 0.40 },
    thermal: { k: 355, Tmax: 400 },
    speeds: { carbide: { min: 250, rec: 420, max: 650 }, hss: { min: 100, rec: 180, max: 300 } }, chip: "breaking"
  },

  // =========================================================================
  // N - NON-FERROUS (TUNGSTEN COPPER - EDM ELECTRODES)
  // =========================================================================
  // Tungsten copper composites for sinker EDM electrodes
  // Higher tungsten = better wear resistance but slower machining
  // Use flood coolant, sharp tools, and light DOC
  
  "N_WCU_70_30": {
    name: "Tungsten Copper 70W-30Cu (Class 10)",
    group: "N", hardness: 180, density: 14500,
    kienzle: { kc1_1: 1200, mc: 0.22 },
    taylor: { C: 180, n: 0.18 },
    thermal: { k: 220, Tmax: 500 },
    speeds: { carbide: { min: 80, rec: 150, max: 220 }, hss: { min: 30, rec: 60, max: 100 } }, chip: "breaking",
    notes: "Best machinability of W-Cu grades. Good for general EDM electrodes."
  },
  "N_WCU_75_25": {
    name: "Tungsten Copper 75W-25Cu (Class 11)",
    group: "N", hardness: 200, density: 15100,
    kienzle: { kc1_1: 1350, mc: 0.23 },
    taylor: { C: 160, n: 0.17 },
    thermal: { k: 200, Tmax: 500 },
    speeds: { carbide: { min: 70, rec: 130, max: 200 }, hss: { min: 25, rec: 50, max: 90 } }, chip: "breaking",
    notes: "Balanced wear resistance and machinability. Popular EDM electrode grade."
  },
  "N_WCU_80_20": {
    name: "Tungsten Copper 80W-20Cu (Class 12)",
    group: "N", hardness: 220, density: 15600,
    kienzle: { kc1_1: 1500, mc: 0.24 },
    taylor: { C: 140, n: 0.16 },
    thermal: { k: 185, Tmax: 550 },
    speeds: { carbide: { min: 60, rec: 110, max: 180 }, hss: { min: 20, rec: 45, max: 80 } }, chip: "breaking",
    notes: "High wear resistance. For fine detail EDM work."
  },
  "N_WCU_90_10": {
    name: "Tungsten Copper 90W-10Cu (Class 13)",
    group: "N", hardness: 260, density: 17000,
    kienzle: { kc1_1: 1800, mc: 0.26 },
    taylor: { C: 110, n: 0.15 },
    thermal: { k: 165, Tmax: 600 },
    speeds: { carbide: { min: 45, rec: 80, max: 140 }, hss: { min: 15, rec: 35, max: 60 } }, chip: "segmented",
    notes: "Maximum wear resistance. Difficult to machine - use rigid setup, sharp carbide, flood coolant."
  },
  "N_WCU_ELKONITE": {
    name: "Elkonite (Tungsten Copper Alloy)",
    group: "N", hardness: 210, density: 15300,
    kienzle: { kc1_1: 1400, mc: 0.23 },
    taylor: { C: 150, n: 0.17 },
    thermal: { k: 195, Tmax: 520 },
    speeds: { carbide: { min: 65, rec: 120, max: 190 }, hss: { min: 22, rec: 48, max: 85 } }, chip: "breaking",
    notes: "Brand name tungsten copper. Similar to 75-80% W grades."
  },

  // =========================================================================
  // N - NON-FERROUS (PLASTICS)
  // =========================================================================
  "N_DELRIN": {
    name: "Delrin/Acetal (POM)",
    group: "N", hardness: 85, density: 1410,
    kienzle: { kc1_1: 280, mc: 0.12 },
    taylor: { C: 1200, n: 0.50 },
    thermal: { k: 0.31, Tmax: 100 },
    speeds: { carbide: { min: 200, rec: 400, max: 800 }, hss: { min: 100, rec: 250, max: 500 } }, chip: "continuous"
  },
  "N_NYLON": {
    name: "Nylon 6/6",
    group: "N", hardness: 80, density: 1140,
    kienzle: { kc1_1: 250, mc: 0.11 },
    taylor: { C: 1400, n: 0.55 },
    thermal: { k: 0.25, Tmax: 80 },
    speeds: { carbide: { min: 200, rec: 400, max: 700 }, hss: { min: 100, rec: 220, max: 450 } }, chip: "continuous"
  },
  "N_UHMW": {
    name: "UHMW Polyethylene",
    group: "N", hardness: 65, density: 930,
    kienzle: { kc1_1: 180, mc: 0.10 },
    taylor: { C: 1600, n: 0.60 },
    thermal: { k: 0.42, Tmax: 70 },
    speeds: { carbide: { min: 200, rec: 450, max: 900 }, hss: { min: 100, rec: 280, max: 550 } }, chip: "stringy"
  },
  "N_PEEK": {
    name: "PEEK",
    group: "N", hardness: 90, density: 1320,
    kienzle: { kc1_1: 320, mc: 0.14 },
    taylor: { C: 1000, n: 0.45 },
    thermal: { k: 0.25, Tmax: 150 },
    speeds: { carbide: { min: 150, rec: 300, max: 600 }, hss: { min: 80, rec: 180, max: 380 } }, chip: "continuous"
  },
  "N_POLYCARB": {
    name: "Polycarbonate",
    group: "N", hardness: 75, density: 1200,
    kienzle: { kc1_1: 240, mc: 0.11 },
    taylor: { C: 1300, n: 0.52 },
    thermal: { k: 0.20, Tmax: 120 },
    speeds: { carbide: { min: 180, rec: 350, max: 700 }, hss: { min: 90, rec: 200, max: 420 } }, chip: "continuous"
  },
  "N_ACRYLIC": {
    name: "Acrylic (PMMA)",
    group: "N", hardness: 90, density: 1190,
    kienzle: { kc1_1: 260, mc: 0.12 },
    taylor: { C: 1100, n: 0.48 },
    thermal: { k: 0.19, Tmax: 80 },
    speeds: { carbide: { min: 150, rec: 300, max: 550 }, hss: { min: 75, rec: 170, max: 350 } }, chip: "brittle"
  },
  "N_HDPE": {
    name: "HDPE",
    group: "N", hardness: 60, density: 950,
    kienzle: { kc1_1: 170, mc: 0.10 },
    taylor: { C: 1500, n: 0.58 },
    thermal: { k: 0.48, Tmax: 70 },
    speeds: { carbide: { min: 200, rec: 450, max: 850 }, hss: { min: 100, rec: 280, max: 520 } }, chip: "stringy"
  },
  "N_G10": {
    name: "G10/FR4 Fiberglass",
    group: "N", hardness: 110, density: 1800,
    kienzle: { kc1_1: 450, mc: 0.18 },
    taylor: { C: 400, n: 0.28 },
    thermal: { k: 0.29, Tmax: 130 },
    speeds: { carbide: { min: 100, rec: 200, max: 400 }, hss: { min: 40, rec: 100, max: 200 } }, chip: "powder"
  },

  // =========================================================================
  // S - SUPERALLOYS & TITANIUM
  // =========================================================================
  "S_TI64_ANN": {
    name: "Ti-6Al-4V (Grade 5) Annealed",
    group: "S", hardness: 334, density: 4430,
    kienzle: { kc1_1: 1950, mc: 0.22 },
    taylor: { C: 75, n: 0.12 },
    thermal: { k: 6.7, Tmax: 500 },
    speeds: { carbide: { min: 30, rec: 55, max: 90 }, hss: { min: 8, rec: 15, max: 25 } }, chip: "segmented"
  },
  "S_TI64_STA": {
    name: "Ti-6Al-4V (Grade 5) STA",
    group: "S", hardness: 375, density: 4430,
    kienzle: { kc1_1: 2150, mc: 0.24 },
    taylor: { C: 60, n: 0.11 },
    thermal: { k: 6.7, Tmax: 480 },
    speeds: { carbide: { min: 25, rec: 45, max: 75 }, hss: { min: 5, rec: 12, max: 20 } }, chip: "segmented"
  },
  "S_TI_CP2": {
    name: "CP Titanium Grade 2",
    group: "S", hardness: 200, density: 4510,
    kienzle: { kc1_1: 1550, mc: 0.20 },
    taylor: { C: 110, n: 0.15 },
    thermal: { k: 16.4, Tmax: 550 },
    speeds: { carbide: { min: 50, rec: 85, max: 130 }, hss: { min: 15, rec: 28, max: 45 } }, chip: "continuous"
  },
  "S_TI_CP4": {
    name: "CP Titanium Grade 4",
    group: "S", hardness: 265, density: 4510,
    kienzle: { kc1_1: 1750, mc: 0.21 },
    taylor: { C: 90, n: 0.13 },
    thermal: { k: 15.5, Tmax: 530 },
    speeds: { carbide: { min: 40, rec: 70, max: 110 }, hss: { min: 10, rec: 22, max: 38 } }, chip: "segmented"
  },
  "S_TI6242": {
    name: "Ti-6Al-2Sn-4Zr-2Mo",
    group: "S", hardness: 350, density: 4540,
    kienzle: { kc1_1: 2050, mc: 0.23 },
    taylor: { C: 65, n: 0.11 },
    thermal: { k: 7.0, Tmax: 490 },
    speeds: { carbide: { min: 28, rec: 50, max: 80 }, hss: { min: 6, rec: 14, max: 22 } }, chip: "segmented"
  },
  "S_IN718_ANN": {
    name: "Inconel 718 (Annealed)",
    group: "S", hardness: 330, density: 8190,
    kienzle: { kc1_1: 3200, mc: 0.32 },
    taylor: { C: 45, n: 0.10 },
    thermal: { k: 11.4, Tmax: 600 },
    speeds: { carbide: { min: 18, rec: 35, max: 60 }, hss: { min: 4, rec: 8, max: 15 } }, chip: "segmented"
  },
  "S_IN718_AGED": {
    name: "Inconel 718 (Aged)",
    group: "S", hardness: 440, density: 8190,
    kienzle: { kc1_1: 3600, mc: 0.34 },
    taylor: { C: 35, n: 0.09 },
    thermal: { k: 11.4, Tmax: 580 },
    speeds: { carbide: { min: 12, rec: 25, max: 45 }, hss: { min: 2, rec: 5, max: 10 } }, chip: "segmented"
  },
  "S_IN625": {
    name: "Inconel 625",
    group: "S", hardness: 290, density: 8440,
    kienzle: { kc1_1: 3000, mc: 0.31 },
    taylor: { C: 50, n: 0.10 },
    thermal: { k: 9.8, Tmax: 620 },
    speeds: { carbide: { min: 20, rec: 40, max: 65 }, hss: { min: 5, rec: 10, max: 18 } }, chip: "segmented"
  },
  "S_IN600": {
    name: "Inconel 600",
    group: "S", hardness: 220, density: 8470,
    kienzle: { kc1_1: 2700, mc: 0.29 },
    taylor: { C: 60, n: 0.11 },
    thermal: { k: 14.9, Tmax: 650 },
    speeds: { carbide: { min: 25, rec: 45, max: 75 }, hss: { min: 6, rec: 12, max: 22 } }, chip: "continuous"
  },
  "S_HAST_C276": {
    name: "Hastelloy C-276",
    group: "S", hardness: 250, density: 8890,
    kienzle: { kc1_1: 3100, mc: 0.31 },
    taylor: { C: 40, n: 0.10 },
    thermal: { k: 10.2, Tmax: 590 },
    speeds: { carbide: { min: 15, rec: 30, max: 55 }, hss: { min: 3, rec: 7, max: 14 } }, chip: "segmented"
  },
  "S_HAST_X": {
    name: "Hastelloy X",
    group: "S", hardness: 240, density: 8220,
    kienzle: { kc1_1: 2900, mc: 0.30 },
    taylor: { C: 48, n: 0.10 },
    thermal: { k: 9.1, Tmax: 610 },
    speeds: { carbide: { min: 18, rec: 35, max: 60 }, hss: { min: 4, rec: 9, max: 16 } }, chip: "segmented"
  },
  "S_WASPALOY": {
    name: "Waspaloy",
    group: "S", hardness: 380, density: 8190,
    kienzle: { kc1_1: 3400, mc: 0.33 },
    taylor: { C: 38, n: 0.09 },
    thermal: { k: 10.7, Tmax: 570 },
    speeds: { carbide: { min: 12, rec: 28, max: 48 }, hss: { min: 2, rec: 6, max: 12 } }, chip: "segmented"
  },
  "S_MONEL_400": {
    name: "Monel 400",
    group: "S", hardness: 150, density: 8830,
    kienzle: { kc1_1: 2200, mc: 0.26 },
    taylor: { C: 100, n: 0.14 },
    thermal: { k: 21.8, Tmax: 700 },
    speeds: { carbide: { min: 40, rec: 70, max: 115 }, hss: { min: 10, rec: 20, max: 35 } }, chip: "continuous"
  },
  "S_MONEL_K500": {
    name: "Monel K-500",
    group: "S", hardness: 280, density: 8470,
    kienzle: { kc1_1: 2600, mc: 0.28 },
    taylor: { C: 70, n: 0.12 },
    thermal: { k: 17.5, Tmax: 650 },
    speeds: { carbide: { min: 28, rec: 50, max: 85 }, hss: { min: 6, rec: 14, max: 25 } }, chip: "segmented"
  },
  "S_STELLITE_6": {
    name: "Stellite 6",
    group: "S", hardness: 400, density: 8440,
    kienzle: { kc1_1: 3500, mc: 0.34 },
    taylor: { C: 32, n: 0.08 },
    thermal: { k: 14.7, Tmax: 550 },
    speeds: { carbide: { min: 10, rec: 22, max: 40 }, hss: { min: 2, rec: 5, max: 10 } }, chip: "powder"
  },
  "S_L605": {
    name: "L-605 (Haynes 25)",
    group: "S", hardness: 350, density: 9130,
    kienzle: { kc1_1: 3300, mc: 0.33 },
    taylor: { C: 35, n: 0.09 },
    thermal: { k: 9.4, Tmax: 560 },
    speeds: { carbide: { min: 12, rec: 25, max: 45 }, hss: { min: 2, rec: 6, max: 12 } }, chip: "segmented"
  },

  // =========================================================================
  // H - HARDENED STEELS
  // =========================================================================
  "H_45HRC": {
    name: "Hardened Steel 45-48 HRC",
    group: "H", hardness: 450, density: 7850,
    kienzle: { kc1_1: 3200, mc: 0.32 },
    taylor: { C: 80, n: 0.12 },
    thermal: { k: 30.0, Tmax: 650 },
    speeds: { carbide: { min: 60, rec: 100, max: 160 }, cbn: { min: 100, rec: 180, max: 280 } }, chip: "powder"
  },
  "H_50HRC": {
    name: "Hardened Steel 48-52 HRC",
    group: "H", hardness: 500, density: 7850,
    kienzle: { kc1_1: 3600, mc: 0.34 },
    taylor: { C: 60, n: 0.10 },
    thermal: { k: 28.0, Tmax: 620 },
    speeds: { carbide: { min: 45, rec: 80, max: 130 }, cbn: { min: 80, rec: 150, max: 240 } }, chip: "powder"
  },
  "H_54HRC": {
    name: "Hardened Steel 52-56 HRC",
    group: "H", hardness: 540, density: 7850,
    kienzle: { kc1_1: 4000, mc: 0.36 },
    taylor: { C: 45, n: 0.09 },
    thermal: { k: 26.0, Tmax: 600 },
    speeds: { carbide: { min: 35, rec: 60, max: 100 }, cbn: { min: 70, rec: 130, max: 210 } }, chip: "powder"
  },
  "H_58HRC": {
    name: "Hardened Steel 56-60 HRC",
    group: "H", hardness: 580, density: 7850,
    kienzle: { kc1_1: 4500, mc: 0.38 },
    taylor: { C: 35, n: 0.08 },
    thermal: { k: 24.0, Tmax: 580 },
    speeds: { carbide: { min: 25, rec: 45, max: 80 }, cbn: { min: 60, rec: 110, max: 180 } }, chip: "powder"
  },
  "H_62HRC": {
    name: "Hardened Steel 60-65 HRC",
    group: "H", hardness: 620, density: 7850,
    kienzle: { kc1_1: 5000, mc: 0.40 },
    taylor: { C: 25, n: 0.07 },
    thermal: { k: 22.0, Tmax: 550 },
    speeds: { carbide: { min: 15, rec: 30, max: 55 }, cbn: { min: 50, rec: 95, max: 160 } }, chip: "powder"
  },
  "H_D2_HARD": {
    name: "D2 Tool Steel (58-60 HRC)",
    group: "H", hardness: 590, density: 7700,
    kienzle: { kc1_1: 4600, mc: 0.38 },
    taylor: { C: 30, n: 0.08 },
    thermal: { k: 20.5, Tmax: 560 },
    speeds: { carbide: { min: 20, rec: 40, max: 70 }, cbn: { min: 55, rec: 100, max: 170 } }, chip: "powder"
  },
  "H_A2_HARD": {
    name: "A2 Tool Steel (58-60 HRC)",
    group: "H", hardness: 590, density: 7860,
    kienzle: { kc1_1: 4550, mc: 0.38 },
    taylor: { C: 32, n: 0.08 },
    thermal: { k: 25.0, Tmax: 570 },
    speeds: { carbide: { min: 22, rec: 42, max: 72 }, cbn: { min: 58, rec: 105, max: 175 } }, chip: "powder"
  },
  "H_S7_HARD": {
    name: "S7 Tool Steel (54-56 HRC)",
    group: "H", hardness: 550, density: 7830,
    kienzle: { kc1_1: 4100, mc: 0.36 },
    taylor: { C: 42, n: 0.09 },
    thermal: { k: 28.0, Tmax: 590 },
    speeds: { carbide: { min: 32, rec: 55, max: 95 }, cbn: { min: 65, rec: 120, max: 200 } }, chip: "powder"
  },
  "H_H13_HARD": {
    name: "H13 Tool Steel (48-52 HRC)",
    group: "H", hardness: 500, density: 7800,
    kienzle: { kc1_1: 3650, mc: 0.34 },
    taylor: { C: 55, n: 0.10 },
    thermal: { k: 24.5, Tmax: 610 },
    speeds: { carbide: { min: 40, rec: 72, max: 120 }, cbn: { min: 75, rec: 140, max: 230 } }, chip: "powder"
  },
  "H_M2_HARD": {
    name: "M2 HSS (62-65 HRC)",
    group: "H", hardness: 630, density: 8160,
    kienzle: { kc1_1: 5200, mc: 0.42 },
    taylor: { C: 22, n: 0.06 },
    thermal: { k: 19.0, Tmax: 530 },
    speeds: { carbide: { min: 12, rec: 25, max: 45 }, cbn: { min: 45, rec: 85, max: 145 } }, chip: "powder"
  },

  // =========================================================================
  // X - SPECIALTY MATERIALS
  // =========================================================================
  "X_GRAPHITE": {
    name: "Graphite (Fine Grain)",
    group: "X", hardness: 80, density: 1750,
    kienzle: { kc1_1: 150, mc: 0.08 },
    taylor: { C: 800, n: 0.45 },
    thermal: { k: 120, Tmax: 400 },
    speeds: { carbide: { min: 200, rec: 400, max: 800 }, pcd: { min: 400, rec: 700, max: 1200 } }, chip: "powder"
  },
  "X_CFRP": {
    name: "Carbon Fiber Composite",
    group: "X", hardness: 0, density: 1550,
    kienzle: { kc1_1: 380, mc: 0.15 },
    taylor: { C: 300, n: 0.25 },
    thermal: { k: 5.0, Tmax: 150 },
    speeds: { carbide: { min: 100, rec: 200, max: 400 }, pcd: { min: 200, rec: 400, max: 700 } }, chip: "powder"
  },
  "X_GFRP": {
    name: "Glass Fiber Composite",
    group: "X", hardness: 0, density: 1800,
    kienzle: { kc1_1: 350, mc: 0.14 },
    taylor: { C: 350, n: 0.28 },
    thermal: { k: 0.3, Tmax: 120 },
    speeds: { carbide: { min: 80, rec: 180, max: 350 }, pcd: { min: 180, rec: 350, max: 600 } }, chip: "powder"
  },
  "X_WC": {
    name: "Tungsten Carbide",
    group: "X", hardness: 1500, density: 15630,
    kienzle: { kc1_1: 8000, mc: 0.50 },
    taylor: { C: 10, n: 0.05 },
    thermal: { k: 84.0, Tmax: 800 },
    speeds: { pcd: { min: 5, rec: 15, max: 35 }, diamond: { min: 10, rec: 25, max: 50 } }, chip: "powder"
  },
  "X_CERAMIC": {
    name: "Machinable Ceramic",
    group: "X", hardness: 350, density: 2700,
    kienzle: { kc1_1: 1800, mc: 0.25 },
    taylor: { C: 50, n: 0.10 },
    thermal: { k: 2.5, Tmax: 200 },
    speeds: { pcd: { min: 20, rec: 50, max: 100 }, diamond: { min: 40, rec: 80, max: 150 } }, chip: "powder"
  },
  // ═══ NEW MATERIALS — PPG-REAL expanded database (101 new entries) ═══
  // P: Additional Steels
  "P_1008":  { name:"1008 Low Carbon", group:"P", hardness:95, density:7870, kienzle:{kc1_1:1500,mc:0.24}, taylor:{C:310,n:0.24}, thermal:{k:53,Tmax:860}, speeds:{carbide:{min:140,rec:210,max:290}}, chip:"continuous" },
  "P_1010":  { name:"1010 Low Carbon", group:"P", hardness:105, density:7870, kienzle:{kc1_1:1550,mc:0.24}, taylor:{C:300,n:0.23}, thermal:{k:52.5,Tmax:855}, speeds:{carbide:{min:135,rec:200,max:280}}, chip:"continuous" },
  "P_1040":  { name:"1040 Medium Carbon", group:"P", hardness:170, density:7845, kienzle:{kc1_1:1880,mc:0.26}, taylor:{C:235,n:0.21}, thermal:{k:50,Tmax:830}, speeds:{carbide:{min:95,rec:145,max:210}}, chip:"continuous" },
  "P_1050":  { name:"1050 Medium Carbon", group:"P", hardness:190, density:7840, kienzle:{kc1_1:2000,mc:0.27}, taylor:{C:210,n:0.20}, thermal:{k:49,Tmax:815}, speeds:{carbide:{min:85,rec:135,max:195}}, chip:"continuous" },
  "P_1075":  { name:"1075 Spring Steel", group:"P", hardness:210, density:7840, kienzle:{kc1_1:2150,mc:0.27}, taylor:{C:190,n:0.19}, thermal:{k:48,Tmax:800}, speeds:{carbide:{min:75,rec:120,max:175}}, chip:"segmented" },
  "P_1095":  { name:"1095 High Carbon Spring", group:"P", hardness:230, density:7840, kienzle:{kc1_1:2280,mc:0.28}, taylor:{C:170,n:0.18}, thermal:{k:46.5,Tmax:780}, speeds:{carbide:{min:65,rec:105,max:155}}, chip:"segmented" },
  "P_1141":  { name:"1141 Stress-Proof", group:"P", hardness:195, density:7850, kienzle:{kc1_1:1820,mc:0.25}, taylor:{C:260,n:0.22}, thermal:{k:49.5,Tmax:830}, speeds:{carbide:{min:110,rec:170,max:240}}, chip:"breaking" },
  "P_1144":  { name:"1144 Stressproof", group:"P", hardness:200, density:7850, kienzle:{kc1_1:1850,mc:0.25}, taylor:{C:255,n:0.22}, thermal:{k:49.5,Tmax:825}, speeds:{carbide:{min:105,rec:165,max:235}}, chip:"breaking" },
  "P_5160":  { name:"5160 Spring Steel", group:"P", hardness:220, density:7850, kienzle:{kc1_1:2200,mc:0.27}, taylor:{C:185,n:0.18}, thermal:{k:44,Tmax:790}, speeds:{carbide:{min:70,rec:115,max:165}}, chip:"segmented" },
  "P_9310":  { name:"9310 Case Hardening", group:"P", hardness:180, density:7850, kienzle:{kc1_1:1920,mc:0.25}, taylor:{C:230,n:0.21}, thermal:{k:40,Tmax:825}, speeds:{carbide:{min:85,rec:140,max:200}}, chip:"continuous" },
  "P_A514":  { name:"A514 Q&T Plate", group:"P", hardness:260, density:7850, kienzle:{kc1_1:2350,mc:0.28}, taylor:{C:160,n:0.17}, thermal:{k:45,Tmax:770}, speeds:{carbide:{min:60,rec:95,max:140}}, chip:"segmented" },
  "P_M2_ANN":  { name:"M2 HSS (Annealed)", group:"P", hardness:240, density:8160, kienzle:{kc1_1:2500,mc:0.29}, taylor:{C:130,n:0.15}, thermal:{k:19,Tmax:740}, speeds:{carbide:{min:45,rec:75,max:115}}, chip:"segmented" },
  "P_M42_ANN": { name:"M42 HSS-Co (Annealed)", group:"P", hardness:250, density:8150, kienzle:{kc1_1:2600,mc:0.30}, taylor:{C:120,n:0.14}, thermal:{k:18.5,Tmax:730}, speeds:{carbide:{min:40,rec:68,max:105}}, chip:"segmented" },
  "P_S30V_ANN": { name:"CPM S30V (Annealed)", group:"P", hardness:260, density:7750, kienzle:{kc1_1:2650,mc:0.30}, taylor:{C:110,n:0.14}, thermal:{k:18,Tmax:720}, speeds:{carbide:{min:35,rec:60,max:95}}, chip:"segmented" },
  "P_S45VN_ANN":{ name:"CPM S45VN (Annealed)", group:"P", hardness:255, density:7750, kienzle:{kc1_1:2620,mc:0.30}, taylor:{C:115,n:0.14}, thermal:{k:18.2,Tmax:725}, speeds:{carbide:{min:38,rec:63,max:98}}, chip:"segmented" },
  "P_MAR300_ANN":{ name:"Maraging 300 (Ann)", group:"P", hardness:310, density:8000, kienzle:{kc1_1:2400,mc:0.28}, taylor:{C:140,n:0.15}, thermal:{k:19,Tmax:750}, speeds:{carbide:{min:50,rec:82,max:125}}, chip:"segmented" },
  "P_52100_ANN":{ name:"52100 Bearing (Ann)", group:"P", hardness:220, density:7830, kienzle:{kc1_1:2200,mc:0.27}, taylor:{C:175,n:0.17}, thermal:{k:40,Tmax:790}, speeds:{carbide:{min:65,rec:105,max:155}}, chip:"continuous" },
  // M: Additional Stainless
  "M_321":  { name:"321 Stainless", group:"M", hardness:185, density:8000, kienzle:{kc1_1:2380,mc:0.28}, taylor:{C:125,n:0.15}, thermal:{k:16,Tmax:670}, speeds:{carbide:{min:55,rec:92,max:140}}, chip:"stringy" },
  "M_347":  { name:"347 Stainless", group:"M", hardness:190, density:8000, kienzle:{kc1_1:2420,mc:0.28}, taylor:{C:122,n:0.15}, thermal:{k:16,Tmax:665}, speeds:{carbide:{min:52,rec:88,max:135}}, chip:"stringy" },
  "M_430":  { name:"430 Ferritic Stainless", group:"M", hardness:175, density:7700, kienzle:{kc1_1:2100,mc:0.26}, taylor:{C:155,n:0.17}, thermal:{k:26.1,Tmax:730}, speeds:{carbide:{min:75,rec:120,max:175}}, chip:"continuous" },
  "M_904L": { name:"904L Super Austenitic", group:"M", hardness:200, density:8000, kienzle:{kc1_1:2650,mc:0.30}, taylor:{C:85,n:0.12}, thermal:{k:12,Tmax:620}, speeds:{carbide:{min:28,rec:50,max:80}}, chip:"stringy" },
  "M_2507": { name:"2507 Super Duplex", group:"M", hardness:310, density:7800, kienzle:{kc1_1:2850,mc:0.31}, taylor:{C:75,n:0.11}, thermal:{k:13.5,Tmax:600}, speeds:{carbide:{min:22,rec:42,max:68}}, chip:"segmented" },
  "M_138_H950":{ name:"13-8 PH (H950)", group:"M", hardness:375, density:7780, kienzle:{kc1_1:2700,mc:0.30}, taylor:{C:105,n:0.13}, thermal:{k:17,Tmax:640}, speeds:{carbide:{min:38,rec:62,max:98}}, chip:"segmented" },
  "M_NITRONIC60":{ name:"Nitronic 60", group:"M", hardness:220, density:7870, kienzle:{kc1_1:2550,mc:0.29}, taylor:{C:105,n:0.14}, thermal:{k:13.5,Tmax:640}, speeds:{carbide:{min:38,rec:65,max:100}}, chip:"stringy" },
  // K: Additional Cast Irons
  "K_GRAY20":{ name:"Gray Iron Class 20", group:"K", hardness:170, density:7150, kienzle:{kc1_1:980,mc:0.26}, taylor:{C:220,n:0.22}, thermal:{k:48,Tmax:860}, speeds:{carbide:{min:115,rec:180,max:260}}, chip:"powder" },
  "K_DUCTILE_100":{ name:"Ductile 100-70-03", group:"K", hardness:270, density:7100, kienzle:{kc1_1:1650,mc:0.28}, taylor:{C:155,n:0.17}, thermal:{k:32,Tmax:790}, speeds:{carbide:{min:70,rec:115,max:170}}, chip:"segmented" },
  "K_ADI_1": { name:"ADI Grade 1", group:"K", hardness:300, density:7100, kienzle:{kc1_1:1750,mc:0.29}, taylor:{C:130,n:0.15}, thermal:{k:28,Tmax:750}, speeds:{carbide:{min:55,rec:90,max:140}}, chip:"segmented" },
  "K_NIRESIST":{ name:"Ni-Resist", group:"K", hardness:200, density:7400, kienzle:{kc1_1:1480,mc:0.27}, taylor:{C:140,n:0.16}, thermal:{k:14,Tmax:720}, speeds:{carbide:{min:55,rec:90,max:140}}, chip:"segmented" },
  // N: Additional Aluminum
  "N_1100": { name:"1100 Pure Aluminum", group:"N", hardness:30, density:2710, kienzle:{kc1_1:420,mc:0.16}, taylor:{C:1000,n:0.48}, thermal:{k:222,Tmax:320}, speeds:{carbide:{min:400,rec:650,max:1100}}, chip:"stringy" },
  "N_2011": { name:"2011-T3 Free Machining", group:"N", hardness:95, density:2830, kienzle:{kc1_1:620,mc:0.19}, taylor:{C:880,n:0.44}, thermal:{k:151,Tmax:300}, speeds:{carbide:{min:350,rec:550,max:950}}, chip:"breaking" },
  "N_2014": { name:"2014-T6 Aluminum", group:"N", hardness:135, density:2800, kienzle:{kc1_1:730,mc:0.22}, taylor:{C:680,n:0.37}, thermal:{k:154,Tmax:285}, speeds:{carbide:{min:270,rec:430,max:760}}, chip:"continuous" },
  "N_2219": { name:"2219-T851 Aerospace", group:"N", hardness:130, density:2840, kienzle:{kc1_1:710,mc:0.21}, taylor:{C:700,n:0.38}, thermal:{k:120,Tmax:290}, speeds:{carbide:{min:280,rec:440,max:780}}, chip:"continuous" },
  "N_5083": { name:"5083-H116 Marine", group:"N", hardness:75, density:2660, kienzle:{kc1_1:610,mc:0.19}, taylor:{C:820,n:0.42}, thermal:{k:117,Tmax:310}, speeds:{carbide:{min:330,rec:520,max:900}}, chip:"continuous" },
  "N_6082": { name:"6082-T6 Structural", group:"N", hardness:95, density:2710, kienzle:{kc1_1:660,mc:0.20}, taylor:{C:780,n:0.40}, thermal:{k:172,Tmax:300}, speeds:{carbide:{min:300,rec:490,max:860}}, chip:"continuous" },
  "N_380":  { name:"380 Die Cast Aluminum", group:"N", hardness:80, density:2740, kienzle:{kc1_1:680,mc:0.20}, taylor:{C:720,n:0.38}, thermal:{k:100,Tmax:295}, speeds:{carbide:{min:280,rec:450,max:780}}, chip:"segmented" },
  "N_390":  { name:"390 Die Cast (High Si)", group:"N", hardness:120, density:2730, kienzle:{kc1_1:850,mc:0.24}, taylor:{C:480,n:0.30}, thermal:{k:134,Tmax:280}, speeds:{carbide:{min:180,rec:300,max:520}}, chip:"segmented" },
  "N_6061_O":{ name:"6061-O Annealed", group:"N", hardness:30, density:2700, kienzle:{kc1_1:450,mc:0.17}, taylor:{C:950,n:0.46}, thermal:{k:180,Tmax:320}, speeds:{carbide:{min:380,rec:600,max:1050}}, chip:"stringy" },
  // N: Additional Copper/Bronze
  "N_BECU_172":{ name:"C172 BeCu Hardened", group:"N", hardness:380, density:8250, kienzle:{kc1_1:1400,mc:0.26}, taylor:{C:200,n:0.18}, thermal:{k:115,Tmax:400}, speeds:{carbide:{min:80,rec:140,max:220}}, chip:"segmented" },
  "N_BECU_17200":{ name:"C17200 BeCu Solution", group:"N", hardness:200, density:8250, kienzle:{kc1_1:1100,mc:0.22}, taylor:{C:300,n:0.24}, thermal:{k:115,Tmax:420}, speeds:{carbide:{min:130,rec:220,max:350}}, chip:"continuous" },
  "N_PHOS_510":{ name:"C510 Phosphor Bronze", group:"N", hardness:95, density:8800, kienzle:{kc1_1:900,mc:0.22}, taylor:{C:440,n:0.30}, thermal:{k:75,Tmax:350}, speeds:{carbide:{min:140,rec:240,max:400}}, chip:"continuous" },
  "N_NIBRONZE_630":{ name:"C630 NiAl Bronze", group:"N", hardness:200, density:7600, kienzle:{kc1_1:1280,mc:0.26}, taylor:{C:280,n:0.22}, thermal:{k:42,Tmax:370}, speeds:{carbide:{min:90,rec:160,max:260}}, chip:"segmented" },
  "N_NAVAL_464":{ name:"C464 Naval Brass", group:"N", hardness:90, density:8410, kienzle:{kc1_1:820,mc:0.20}, taylor:{C:500,n:0.32}, thermal:{k:116,Tmax:345}, speeds:{carbide:{min:170,rec:290,max:460}}, chip:"breaking" },
  // N: Magnesium/Zinc
  "N_MG_AZ31B":{ name:"Mg AZ31B", group:"N", hardness:55, density:1770, kienzle:{kc1_1:350,mc:0.14}, taylor:{C:1100,n:0.50}, thermal:{k:96,Tmax:250}, speeds:{carbide:{min:400,rec:700,max:1200}}, chip:"breaking" },
  "N_MG_AZ91D":{ name:"Mg AZ91D Die Cast", group:"N", hardness:63, density:1810, kienzle:{kc1_1:380,mc:0.15}, taylor:{C:1050,n:0.48}, thermal:{k:72,Tmax:240}, speeds:{carbide:{min:380,rec:650,max:1100}}, chip:"breaking" },
  "N_ZAMAK3":{ name:"Zamak 3 Zinc", group:"N", hardness:82, density:6600, kienzle:{kc1_1:400,mc:0.15}, taylor:{C:900,n:0.45}, thermal:{k:113,Tmax:250}, speeds:{carbide:{min:300,rec:500,max:850}}, chip:"breaking" },
  "N_MOLY": { name:"Molybdenum", group:"N", hardness:250, density:10220, kienzle:{kc1_1:1550,mc:0.26}, taylor:{C:120,n:0.14}, thermal:{k:138,Tmax:500}, speeds:{carbide:{min:40,rec:70,max:120}}, chip:"segmented" },
  "N_TUNGSTEN":{ name:"Tungsten", group:"N", hardness:350, density:19300, kienzle:{kc1_1:2800,mc:0.32}, taylor:{C:55,n:0.09}, thermal:{k:173,Tmax:650}, speeds:{carbide:{min:15,rec:30,max:55}}, chip:"powder" },
  // N: Additional Plastics
  "N_PVC":   { name:"PVC Type I", group:"N", hardness:80, density:1400, kienzle:{kc1_1:220,mc:0.10}, taylor:{C:1400,n:0.55}, thermal:{k:0.16,Tmax:60}, speeds:{carbide:{min:150,rec:300,max:600}}, chip:"continuous" },
  "N_ABS":   { name:"ABS", group:"N", hardness:75, density:1050, kienzle:{kc1_1:200,mc:0.10}, taylor:{C:1350,n:0.53}, thermal:{k:0.17,Tmax:85}, speeds:{carbide:{min:180,rec:350,max:700}}, chip:"continuous" },
  "N_PTFE":  { name:"PTFE Teflon", group:"N", hardness:55, density:2170, kienzle:{kc1_1:150,mc:0.08}, taylor:{C:1800,n:0.65}, thermal:{k:0.25,Tmax:200}, speeds:{carbide:{min:200,rec:400,max:800}}, chip:"stringy" },
  "N_ULTEM": { name:"Ultem PEI", group:"N", hardness:100, density:1270, kienzle:{kc1_1:340,mc:0.14}, taylor:{C:950,n:0.44}, thermal:{k:0.22,Tmax:170}, speeds:{carbide:{min:140,rec:280,max:550}}, chip:"continuous" },
  "N_TORLON":{ name:"Torlon PAI", group:"N", hardness:110, density:1410, kienzle:{kc1_1:400,mc:0.16}, taylor:{C:800,n:0.40}, thermal:{k:0.26,Tmax:250}, speeds:{carbide:{min:120,rec:240,max:480}}, chip:"continuous" },
  "N_PP":    { name:"Polypropylene", group:"N", hardness:55, density:900, kienzle:{kc1_1:160,mc:0.09}, taylor:{C:1600,n:0.60}, thermal:{k:0.22,Tmax:65}, speeds:{carbide:{min:200,rec:450,max:900}}, chip:"stringy" },
  // S: Additional Titanium
  "S_TI64_ELI":{ name:"Ti64 ELI Grade 23", group:"S", hardness:330, density:4430, kienzle:{kc1_1:1920,mc:0.22}, taylor:{C:78,n:0.12}, thermal:{k:6.7,Tmax:505}, speeds:{carbide:{min:32,rec:58,max:92}}, chip:"segmented" },
  "S_TI5553":{ name:"Ti-5553", group:"S", hardness:400, density:4650, kienzle:{kc1_1:2300,mc:0.25}, taylor:{C:48,n:0.10}, thermal:{k:6.2,Tmax:460}, speeds:{carbide:{min:20,rec:38,max:62}}, chip:"segmented" },
  "S_TI_CP1":{ name:"CP Ti Grade 1", group:"S", hardness:170, density:4510, kienzle:{kc1_1:1400,mc:0.19}, taylor:{C:125,n:0.16}, thermal:{k:16.4,Tmax:560}, speeds:{carbide:{min:55,rec:95,max:145}}, chip:"continuous" },
  "S_TI64_SLM":{ name:"Ti64 SLM Additive", group:"S", hardness:360, density:4420, kienzle:{kc1_1:2100,mc:0.23}, taylor:{C:62,n:0.11}, thermal:{k:6.5,Tmax:490}, speeds:{carbide:{min:25,rec:48,max:78}}, chip:"segmented" },
  // S: Additional Superalloys
  "S_IN725": { name:"Inconel 725", group:"S", hardness:310, density:8310, kienzle:{kc1_1:3100,mc:0.31}, taylor:{C:48,n:0.10}, thermal:{k:10.5,Tmax:610}, speeds:{carbide:{min:18,rec:35,max:58}}, chip:"segmented" },
  "S_RENE41":{ name:"Rene 41", group:"S", hardness:390, density:8250, kienzle:{kc1_1:3500,mc:0.34}, taylor:{C:35,n:0.09}, thermal:{k:10,Tmax:560}, speeds:{carbide:{min:10,rec:24,max:42}}, chip:"segmented" },
  "S_INCOLOY825":{ name:"Incoloy 825", group:"S", hardness:200, density:8140, kienzle:{kc1_1:2600,mc:0.28}, taylor:{C:70,n:0.12}, thermal:{k:11.5,Tmax:650}, speeds:{carbide:{min:28,rec:50,max:82}}, chip:"continuous" },
  "S_HAST_C22":{ name:"Hastelloy C-22", group:"S", hardness:260, density:8690, kienzle:{kc1_1:3050,mc:0.31}, taylor:{C:42,n:0.10}, thermal:{k:10.1,Tmax:595}, speeds:{carbide:{min:15,rec:32,max:55}}, chip:"segmented" },
  "S_MP35N": { name:"MP35N", group:"S", hardness:350, density:8430, kienzle:{kc1_1:3400,mc:0.33}, taylor:{C:38,n:0.09}, thermal:{k:11,Tmax:565}, speeds:{carbide:{min:12,rec:25,max:45}}, chip:"segmented" },
  // H: Additional Hardened
  "H_S30V_HARD":{ name:"S30V 58-60 HRC", group:"H", hardness:590, density:7750, kienzle:{kc1_1:4800,mc:0.39}, taylor:{C:28,n:0.07}, thermal:{k:18,Tmax:550}, speeds:{carbide:{min:18,rec:35,max:62}}, chip:"powder" },
  "H_S45VN_HARD":{ name:"S45VN 59-61 HRC", group:"H", hardness:600, density:7750, kienzle:{kc1_1:4850,mc:0.39}, taylor:{C:27,n:0.07}, thermal:{k:18.2,Tmax:548}, speeds:{carbide:{min:17,rec:33,max:60}}, chip:"powder" },
  "H_O1_HARD":{ name:"O1 58-62 HRC", group:"H", hardness:600, density:7830, kienzle:{kc1_1:4650,mc:0.38}, taylor:{C:30,n:0.08}, thermal:{k:30,Tmax:565}, speeds:{carbide:{min:20,rec:38,max:68}}, chip:"powder" },
  "H_P20_HARD":{ name:"P20 30-36 HRC", group:"H", hardness:330, density:7850, kienzle:{kc1_1:2750,mc:0.30}, taylor:{C:110,n:0.14}, thermal:{k:29,Tmax:720}, speeds:{carbide:{min:65,rec:110,max:170}}, chip:"segmented" },
  "H_MAR300_HARD":{ name:"Maraging 300 50-54 HRC", group:"H", hardness:520, density:8000, kienzle:{kc1_1:3850,mc:0.35}, taylor:{C:50,n:0.10}, thermal:{k:19,Tmax:600}, speeds:{carbide:{min:35,rec:60,max:100}}, chip:"powder" },
  "H_52100_HARD":{ name:"52100 58-62 HRC", group:"H", hardness:600, density:7830, kienzle:{kc1_1:4700,mc:0.38}, taylor:{C:30,n:0.08}, thermal:{k:40,Tmax:565}, speeds:{carbide:{min:20,rec:38,max:65}}, chip:"powder" },
  "H_440C_HARD":{ name:"440C 56-58 HRC", group:"H", hardness:570, density:7750, kienzle:{kc1_1:4400,mc:0.37}, taylor:{C:32,n:0.08}, thermal:{k:24.2,Tmax:575}, speeds:{carbide:{min:22,rec:40,max:72}}, chip:"powder" },
  // X: Additive Manufacturing
  "X_316L_DMLS":{ name:"316L DMLS", group:"X", hardness:220, density:7950, kienzle:{kc1_1:2550,mc:0.29}, taylor:{C:110,n:0.14}, thermal:{k:15,Tmax:650}, speeds:{carbide:{min:48,rec:82,max:125}}, chip:"stringy" },
  "X_ALSI10MG_SLM":{ name:"AlSi10Mg SLM", group:"X", hardness:120, density:2670, kienzle:{kc1_1:750,mc:0.22}, taylor:{C:600,n:0.34}, thermal:{k:110,Tmax:275}, speeds:{carbide:{min:220,rec:380,max:650}}, chip:"segmented" },
  "X_IN718_DMLS":{ name:"IN718 DMLS", group:"X", hardness:370, density:8150, kienzle:{kc1_1:3450,mc:0.33}, taylor:{C:40,n:0.09}, thermal:{k:11,Tmax:580}, speeds:{carbide:{min:14,rec:28,max:50}}, chip:"segmented" },
  "X_IN625_DMLS":{ name:"IN625 DMLS", group:"X", hardness:330, density:8400, kienzle:{kc1_1:3200,mc:0.32}, taylor:{C:45,n:0.10}, thermal:{k:9.5,Tmax:600}, speeds:{carbide:{min:16,rec:32,max:55}}, chip:"segmented" },
  "X_174_DMLS":{ name:"17-4 PH DMLS", group:"X", hardness:350, density:7750, kienzle:{kc1_1:2700,mc:0.30}, taylor:{C:95,n:0.13}, thermal:{k:17.5,Tmax:635}, speeds:{carbide:{min:35,rec:58,max:92}}, chip:"segmented" },
  "X_COCR_DMLS":{ name:"CoCr DMLS Medical", group:"X", hardness:380, density:8300, kienzle:{kc1_1:3400,mc:0.33}, taylor:{C:35,n:0.08}, thermal:{k:13,Tmax:550}, speeds:{carbide:{min:10,rec:22,max:40}}, chip:"powder" },
  "X_MSTEEL_DMLS":{ name:"Maraging DMLS", group:"X", hardness:340, density:8000, kienzle:{kc1_1:2500,mc:0.29}, taylor:{C:130,n:0.15}, thermal:{k:18,Tmax:740}, speeds:{carbide:{min:45,rec:75,max:120}}, chip:"segmented" },
  // X: Composites & Exotic
  "X_AFRP": { name:"Aramid/Kevlar", group:"X", hardness:0, density:1380, kienzle:{kc1_1:320,mc:0.13}, taylor:{C:350,n:0.28}, thermal:{k:0.4,Tmax:160}, speeds:{carbide:{min:80,rec:180,max:350}}, chip:"fuzzy" },
  "X_CF_PEEK":{ name:"CF/PEEK", group:"X", hardness:0, density:1600, kienzle:{kc1_1:420,mc:0.16}, taylor:{C:280,n:0.24}, thermal:{k:3.5,Tmax:200}, speeds:{carbide:{min:90,rec:180,max:380}}, chip:"powder" },
  "X_G11":  { name:"G11 High Temp", group:"X", hardness:115, density:1850, kienzle:{kc1_1:470,mc:0.18}, taylor:{C:380,n:0.27}, thermal:{k:0.30,Tmax:155}, speeds:{carbide:{min:95,rec:190,max:380}}, chip:"powder" },
  "X_GRAPHITE_MED":{ name:"Graphite Medium EDM", group:"X", hardness:70, density:1700, kienzle:{kc1_1:130,mc:0.07}, taylor:{C:850,n:0.46}, thermal:{k:100,Tmax:400}, speeds:{carbide:{min:220,rec:440,max:860}}, chip:"powder" },
  "X_ZIRCONIUM":{ name:"Zirconium 702", group:"X", hardness:200, density:6510, kienzle:{kc1_1:1600,mc:0.21}, taylor:{C:90,n:0.13}, thermal:{k:22.6,Tmax:500}, speeds:{carbide:{min:35,rec:65,max:105}}, chip:"segmented" },
  "X_TANTALUM":{ name:"Tantalum", group:"X", hardness:150, density:16690, kienzle:{kc1_1:1500,mc:0.20}, taylor:{C:100,n:0.14}, thermal:{k:57.5,Tmax:600}, speeds:{carbide:{min:40,rec:75,max:120}}, chip:"continuous" },
  "X_NIOBIUM":{ name:"Niobium", group:"X", hardness:130, density:8570, kienzle:{kc1_1:1350,mc:0.19}, taylor:{C:110,n:0.15}, thermal:{k:53.7,Tmax:550}, speeds:{carbide:{min:45,rec:80,max:130}}, chip:"continuous" },
  "X_MACOR": { name:"Macor Glass Ceramic", group:"X", hardness:250, density:2520, kienzle:{kc1_1:950,mc:0.20}, taylor:{C:60,n:0.10}, thermal:{k:1.46,Tmax:180}, speeds:{carbide:{min:25,rec:55,max:100}}, chip:"powder" }
};

// Default/fallback material data by ISO group
var PRISM_GROUP_DEFAULTS = {
  "P": { kc1_1: 1800, mc: 0.25, speeds: { carbide: { rec: 150 }, hss: { rec: 30 } } },
  "M": { kc1_1: 2400, mc: 0.28, speeds: { carbide: { rec: 90 }, hss: { rec: 18 } } },
  "K": { kc1_1: 1300, mc: 0.27, speeds: { carbide: { rec: 150 }, hss: { rec: 30 } } },
  "N": { kc1_1: 650, mc: 0.20, speeds: { carbide: { rec: 450 }, hss: { rec: 180 } } },
  "S": { kc1_1: 2800, mc: 0.28, speeds: { carbide: { rec: 45 }, hss: { rec: 12 } } },
  "H": { kc1_1: 4000, mc: 0.35, speeds: { carbide: { rec: 60 }, cbn: { rec: 120 } } },
  "X": { kc1_1: 500, mc: 0.15, speeds: { carbide: { rec: 200 }, pcd: { rec: 400 } } }
};

// =============================================================================
// PRISM MANUFACTURING INTELLIGENCE v9.0 - UNIT CONVERSION ENGINE
// =============================================================================

// =============================================================================
// PRISM UNIT CONVERSION ENGINE
// =============================================================================
// Handles all unit conversions between inch and metric systems
// All internal calculations done in SI units, converted for display
// =============================================================================

var PRISM_UNITS = {
  
  // =========================================================================
  // CONVERSION CONSTANTS
  // =========================================================================
  
  // Length
  MM_PER_INCH: 25.4,
  INCH_PER_MM: 0.0393701,
  M_PER_FOOT: 0.3048,
  FEET_PER_M: 3.28084,
  
  // Speed
  SFM_PER_MPM: 3.28084,    // Surface feet per meter
  MPM_PER_SFM: 0.3048,     // Meters per surface foot
  
  // Feed
  IPM_PER_MMPM: 0.0393701, // Inches per mm
  MMPM_PER_IPM: 25.4,      // mm per inch
  
  // Force
  LBF_PER_N: 0.224809,     // Pounds-force per Newton
  N_PER_LBF: 4.44822,      // Newtons per pound-force
  KGF_PER_N: 0.101972,     // Kilogram-force per Newton
  N_PER_KGF: 9.80665,      // Newtons per kilogram-force
  
  // Power
  HP_PER_KW: 1.34102,      // Horsepower per kilowatt
  KW_PER_HP: 0.7457,       // Kilowatts per horsepower
  
  // Pressure/Stress
  PSI_PER_MPA: 145.038,    // PSI per megapascal
  MPA_PER_PSI: 0.00689476, // Megapascals per PSI
  
  // Temperature
  // Celsius to Fahrenheit: F = C * 9/5 + 32
  // Fahrenheit to Celsius: C = (F - 32) * 5/9
  
  // =========================================================================
  // LENGTH CONVERSIONS
  // =========================================================================
  
  /**
   * Convert millimeters to inches
   */
  mmToInch: function(mm) {
    return mm * this.INCH_PER_MM;
  },
  
  /**
   * Convert inches to millimeters
   */
  inchToMm: function(inch) {
    return inch * this.MM_PER_INCH;
  },
  
  /**
   * Convert length based on current unit system
   * @param value - Value in mm (internal standard)
   * @param toSystem - Target system: "inch" or "metric"
   */
  convertLength: function(value, toSystem) {
    if (toSystem === "inch") {
      return value * this.INCH_PER_MM;
    }
    return value; // Already in mm
  },
  
  /**
   * Parse length input based on unit system setting
   * @param value - User input value
   * @param fromSystem - Source system: "inch" or "metric"
   * @returns Value in mm (internal standard)
   */
  parseLength: function(value, fromSystem) {
    if (fromSystem === "inch") {
      return value * this.MM_PER_INCH;
    }
    return value; // Already in mm
  },
  
  // =========================================================================
  // SPEED CONVERSIONS (Cutting Speed)
  // =========================================================================
  
  /**
   * Convert m/min to SFM (Surface Feet per Minute)
   */
  mpmToSfm: function(mpm) {
    return mpm * this.SFM_PER_MPM;
  },
  
  /**
   * Convert SFM to m/min
   */
  sfmToMpm: function(sfm) {
    return sfm * this.MPM_PER_SFM;
  },
  
  /**
   * Convert cutting speed for display
   * @param mpm - Speed in m/min (internal standard)
   * @param displayFormat - "sfm", "mpm", or "both"
   */
  formatSpeed: function(mpm, displayFormat) {
    var sfm = this.mpmToSfm(mpm);
    
    switch (displayFormat) {
      case "sfm":
        return Math.round(sfm) + " SFM";
      case "mpm":
        return Math.round(mpm) + " m/min";
      case "both":
        return Math.round(sfm) + " SFM (" + Math.round(mpm) + " m/min)";
      default:
        return Math.round(sfm) + " SFM";
    }
  },
  
  /**
   * Calculate RPM from cutting speed
   * @param Vc - Cutting speed in m/min
   * @param diameter - Tool diameter in mm
   */
  speedToRpm: function(Vc, diameter) {
    if (!diameter || diameter <= 0) { return 0; }
    return (Vc * 1000) / (Math.PI * diameter);
  },
  
  /**
   * Calculate cutting speed from RPM
   * @param rpm - Spindle speed
   * @param diameter - Tool diameter in mm
   * @returns Cutting speed in m/min
   */
  rpmToSpeed: function(rpm, diameter) {
    return (Math.PI * diameter * rpm) / 1000;
  },
  
  /**
   * Calculate RPM from SFM (inch system)
   * @param sfm - Surface feet per minute
   * @param diameter - Tool diameter in inches
   */
  sfmToRpm: function(sfm, diameterInch) {
    return (sfm * 12) / (Math.PI * diameterInch);
  },
  
  /**
   * Calculate SFM from RPM (inch system)
   * @param rpm - Spindle speed
   * @param diameter - Tool diameter in inches
   */
  rpmToSfm: function(rpm, diameterInch) {
    return (Math.PI * diameterInch * rpm) / 12;
  },
  
  // =========================================================================
  // FEED CONVERSIONS
  // =========================================================================
  
  /**
   * Convert mm/min to IPM (Inches per Minute)
   */
  mmpmToIpm: function(mmpm) {
    return mmpm * this.IPM_PER_MMPM;
  },
  
  /**
   * Convert IPM to mm/min
   */
  ipmToMmpm: function(ipm) {
    return ipm * this.MMPM_PER_IPM;
  },
  
  /**
   * Convert feed per tooth (mm/tooth to inch/tooth)
   */
  mmToothToInchTooth: function(mmTooth) {
    return mmTooth * this.INCH_PER_MM;
  },
  
  /**
   * Convert inch/tooth to mm/tooth
   */
  inchToothToMmTooth: function(inchTooth) {
    return inchTooth * this.MM_PER_INCH;
  },
  
  /**
   * Format feed rate for display
   * @param mmpm - Feed in mm/min (internal standard)
   * @param displayFormat - "ipm", "mmpm", "per_rev", or "per_tooth"
   * @param rpm - Spindle speed (for per_rev calculation)
   * @param flutes - Number of flutes (for per_tooth calculation)
   */
  formatFeed: function(mmpm, displayFormat, rpm, flutes) {
    var ipm = this.mmpmToIpm(mmpm);
    
    switch (displayFormat) {
      case "ipm":
        return mmpm < 25.4 ? ipm.toFixed(2) + " IPM" : Math.round(ipm) + " IPM";
      case "mmpm":
        return Math.round(mmpm) + " mm/min";
      case "per_rev":
        if (rpm > 0) {
          var ipr = ipm / rpm;
          var mmpr = mmpm / rpm;
          return ipr.toFixed(4) + " IPR (" + mmpr.toFixed(3) + " mm/rev)";
        }
        return Math.round(ipm) + " IPM";
      case "per_tooth":
        if (rpm > 0 && flutes > 0) {
          var ipt = ipm / (rpm * flutes);
          var mmpt = mmpm / (rpm * flutes);
          return ipt.toFixed(4) + " IPT (" + mmpt.toFixed(3) + " mm/tooth)";
        }
        return Math.round(ipm) + " IPM";
      default:
        return Math.round(ipm) + " IPM";
    }
  },
  
  /**
   * Calculate table feed from chip load
   * @param fz - Feed per tooth (mm)
   * @param flutes - Number of flutes
   * @param rpm - Spindle speed
   * @returns Feed rate in mm/min
   */
  chipLoadToFeed: function(fz, flutes, rpm) {
    return fz * flutes * rpm;
  },
  
  /**
   * Calculate chip load from table feed
   * @param feed - Feed rate (mm/min)
   * @param flutes - Number of flutes
   * @param rpm - Spindle speed
   * @returns Feed per tooth (mm)
   */
  feedToChipLoad: function(feed, flutes, rpm) {
    if (rpm <= 0 || flutes <= 0) return 0;
    return feed / (flutes * rpm);
  },
  
  // =========================================================================
  // FORCE CONVERSIONS
  // =========================================================================
  
  /**
   * Convert Newtons to pounds-force
   */
  nToLbf: function(n) {
    return n * this.LBF_PER_N;
  },
  
  /**
   * Convert pounds-force to Newtons
   */
  lbfToN: function(lbf) {
    return lbf * this.N_PER_LBF;
  },
  
  /**
   * Convert Newtons to kilogram-force
   */
  nToKgf: function(n) {
    return n * this.KGF_PER_N;
  },
  
  /**
   * Format force for display
   * @param n - Force in Newtons (internal standard)
   * @param displayFormat - "N", "lbf", or "kgf"
   * @param uncertainty - Optional uncertainty value (same units as input)
   */
  formatForce: function(n, displayFormat, uncertainty) {
    var value, unit, uncert;
    
    switch (displayFormat) {
      case "lbf":
        value = this.nToLbf(n);
        uncert = uncertainty ? this.nToLbf(uncertainty) : 0;
        unit = "lbf";
        break;
      case "kgf":
        value = this.nToKgf(n);
        uncert = uncertainty ? this.nToKgf(uncertainty) : 0;
        unit = "kgf";
        break;
      default: // "N"
        value = n;
        uncert = uncertainty || 0;
        unit = "N";
    }
    
    if (uncert > 0) {
      return Math.round(value) + " +/-" + Math.round(uncert) + " " + unit;
    }
    return Math.round(value) + " " + unit;
  },
  
  // =========================================================================
  // POWER CONVERSIONS
  // =========================================================================
  
  /**
   * Convert kilowatts to horsepower
   */
  kwToHp: function(kw) {
    return kw * this.HP_PER_KW;
  },
  
  /**
   * Convert horsepower to kilowatts
   */
  hpToKw: function(hp) {
    return hp * this.KW_PER_HP;
  },
  
  /**
   * Format power for display
   * @param kw - Power in kilowatts (internal standard)
   * @param displayFormat - "hp" or "kw"
   * @param uncertainty - Optional uncertainty value (same units as input)
   */
  formatPower: function(kw, displayFormat, uncertainty) {
    var value, unit, uncert;
    
    switch (displayFormat) {
      case "hp":
        value = this.kwToHp(kw);
        uncert = uncertainty ? this.kwToHp(uncertainty) : 0;
        unit = "HP";
        break;
      default: // "kw"
        value = kw;
        uncert = uncertainty || 0;
        unit = "kW";
    }
    
    if (uncert > 0) {
      return value.toFixed(2) + " +/-" + uncert.toFixed(2) + " " + unit;
    }
    return value.toFixed(2) + " " + unit;
  },
  
  /**
   * Calculate spindle power from cutting force and speed
   * @param Fc - Cutting force in Newtons
   * @param Vc - Cutting speed in m/min
   * @returns Power in kW
   */
  calculatePower: function(Fc, Vc) {
    return (Fc * Vc) / 60000; // kW
  },
  
  // =========================================================================
  // PRESSURE/STRESS CONVERSIONS
  // =========================================================================
  
  /**
   * Convert MPa to PSI
   */
  mpaToPsi: function(mpa) {
    return mpa * this.PSI_PER_MPA;
  },
  
  /**
   * Convert PSI to MPa
   */
  psiToMpa: function(psi) {
    return psi * this.MPA_PER_PSI;
  },
  
  /**
   * Format specific cutting force for display
   * @param mpa - Specific cutting force in N/mm  (= MPa)
   * @param unitSystem - "inch" or "metric"
   */
  formatKc: function(mpa, unitSystem) {
    if (unitSystem === "inch") {
      return Math.round(this.mpaToPsi(mpa)) + " psi";
    }
    return Math.round(mpa) + " N/mm ";
  },
  
  // =========================================================================
  // TEMPERATURE CONVERSIONS
  // =========================================================================
  
  /**
   * Convert Celsius to Fahrenheit
   */
  cToF: function(c) {
    return (c * 9/5) + 32;
  },
  
  /**
   * Convert Fahrenheit to Celsius
   */
  fToC: function(f) {
    return (f - 32) * 5/9;
  },
  
  /**
   * Format temperature for display
   * @param celsius - Temperature in Celsius (internal standard)
   * @param unitSystem - "inch" (Fahrenheit) or "metric" (Celsius)
   */
  formatTemp: function(celsius, unitSystem) {
    if (unitSystem === "inch") {
      return Math.round(this.cToF(celsius)) + " degF";
    }
    return Math.round(celsius) + " degC";
  },
  
  // =========================================================================
  // DEPTH/ENGAGEMENT CONVERSIONS
  // =========================================================================
  
  /**
   * Format depth of cut for display
   * @param mm - Depth in mm (internal standard)
   * @param displayFormat - "inch" or "mm"
   */
  formatDepth: function(mm, displayFormat) {
    if (displayFormat === "inch") {
      var inch = this.mmToInch(mm);
      if (inch < 0.1) {
        return inch.toFixed(4) + "\"";
      } else if (inch < 1) {
        return inch.toFixed(3) + "\"";
      }
      return inch.toFixed(2) + "\"";
    }
    if (mm < 1) {
      return mm.toFixed(2) + " mm";
    }
    return mm.toFixed(1) + " mm";
  },
  
  /**
   * Format diameter for display
   * @param mm - Diameter in mm (internal standard)
   * @param unitSystem - "inch" or "metric"
   */
  formatDiameter: function(mm, unitSystem) {
    if (unitSystem === "inch") {
      var inch = this.mmToInch(mm);
      // Check for common fractional sizes
      var fractions = this.inchToFraction(inch);
      if (fractions) {
        return fractions;
      }
      return " " + inch.toFixed(4) + "\"";
    }
    return " " + mm.toFixed(2) + " mm";
  },
  
  /**
   * Convert decimal inches to common fraction (if close match)
   */
  inchToFraction: function(decimal) {
    var fractions = {
      0.0625: "1/16\"",
      0.0781: "5/64\"",
      0.0938: "3/32\"",
      0.1094: "7/64\"",
      0.125: "1/8\"",
      0.1406: "9/64\"",
      0.1562: "5/32\"",
      0.1719: "11/64\"",
      0.1875: "3/16\"",
      0.2031: "13/64\"",
      0.2188: "7/32\"",
      0.2344: "15/64\"",
      0.25: "1/4\"",
      0.2656: "17/64\"",
      0.2812: "9/32\"",
      0.2969: "19/64\"",
      0.3125: "5/16\"",
      0.3281: "21/64\"",
      0.3438: "11/32\"",
      0.3594: "23/64\"",
      0.375: "3/8\"",
      0.3906: "25/64\"",
      0.4062: "13/32\"",
      0.4219: "27/64\"",
      0.4375: "7/16\"",
      0.4531: "29/64\"",
      0.4688: "15/32\"",
      0.4844: "31/64\"",
      0.5: "1/2\"",
      0.5156: "33/64\"",
      0.5312: "17/32\"",
      0.5469: "35/64\"",
      0.5625: "9/16\"",
      0.5781: "37/64\"",
      0.5938: "19/32\"",
      0.6094: "39/64\"",
      0.625: "5/8\"",
      0.6406: "41/64\"",
      0.6562: "21/32\"",
      0.6719: "43/64\"",
      0.6875: "11/16\"",
      0.7031: "45/64\"",
      0.7188: "23/32\"",
      0.7344: "47/64\"",
      0.75: "3/4\"",
      0.7656: "49/64\"",
      0.7812: "25/32\"",
      0.7969: "51/64\"",
      0.8125: "13/16\"",
      0.8281: "53/64\"",
      0.8438: "27/32\"",
      0.8594: "55/64\"",
      0.875: "7/8\"",
      0.8906: "57/64\"",
      0.9062: "29/32\"",
      0.9219: "59/64\"",
      0.9375: "15/16\"",
      0.9531: "61/64\"",
      0.9688: "31/32\"",
      0.9844: "63/64\"",
      1.0: "1\""
    };
    
    // Check for close match (within 0.001")
    for (var frac in fractions) {
      if (Math.abs(decimal - parseFloat(frac)) < 0.001) {
        return fractions[frac];
      }
    }
    return null; // No close fraction match
  },
  
  // =========================================================================
  // TOOL LIFE FORMATTING
  // =========================================================================
  
  /**
   * Format tool life for display
   * @param minutes - Tool life in minutes
   * @param uncertainty - Uncertainty in minutes
   */
  formatToolLife: function(minutes, uncertainty) {
    if (minutes >= 60) {
      var hours = minutes / 60;
      var uncertHours = uncertainty / 60;
      return hours.toFixed(1) + " +/-" + uncertHours.toFixed(1) + " hrs";
    }
    return Math.round(minutes) + " +/-" + Math.round(uncertainty) + " min";
  },
  
  // =========================================================================
  // UTILITY FUNCTIONS
  // =========================================================================
  
  /**
   * Get current unit system from post property
   */
  getUnitSystem: function() {
    return getProperty("prismUnitSystem") || "inch";
  },
  
  /**
   * Get current speed display format
   */
  getSpeedDisplay: function() {
    return getProperty("prismSpeedDisplay") || "sfm";
  },
  
  /**
   * Get current feed display format
   */
  getFeedDisplay: function() {
    return getProperty("prismFeedDisplay") || "ipm";
  },
  
  /**
   * Get current depth display format
   */
  getDepthDisplay: function() {
    return getProperty("prismDepthDisplay") || "inch";
  },
  
  /**
   * Get current force display format
   */
  getForceDisplay: function() {
    return getProperty("prismForceDisplay") || "lbf";
  },
  
  /**
   * Get current power display format
   */
  getPowerDisplay: function() {
    return getProperty("prismPowerDisplay") || "hp";
  },
  
  /**
   * Round to specified decimal places
   */
  round: function(value, decimals) {
    var multiplier = Math.pow(10, decimals || 0);
    return Math.round(value * multiplier) / multiplier;
  },
  
  /**
   * Format number with commas for thousands
   */
  formatNumber: function(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
};

// =============================================================================
// PRISM OUTPUT FORMATTER
// =============================================================================
// Formats complete calculation results for G-code comments
// =============================================================================

var PRISM_FORMAT = {
  
  /**
   * Format complete calculation summary for G-code comment block
   * @param calc - Calculation results from PRISM_PHYSICS.calculateAll()
   */
  formatCalculationBlock: function(calc) {
    if (!calc || !calc.valid) {
      return ["(PRISM: Calculation not available)"];
    }
    
    var lines = [];
    var units = PRISM_UNITS;
    var unitSys = units.getUnitSystem();
    var speedFmt = units.getSpeedDisplay();
    var feedFmt = units.getFeedDisplay();
    var depthFmt = units.getDepthDisplay();
    var forceFmt = units.getForceDisplay();
    var powerFmt = units.getPowerDisplay();
    
    // Header
    lines.push("(-----------------------------------------------");
    lines.push("(PRISM CALCULATIONS:");
    
    // Speed
    var speedStr = units.formatSpeed(calc.speed.Vc, speedFmt);
    var speedUncert = units.formatSpeed(calc.speed.Vc_uncertainty, speedFmt);
    lines.push("(  Cutting Speed: " + speedStr + " (+/-" + Math.round(calc.speed.Vc_uncertainty / calc.speed.Vc * 100) + "%)");
    
    // Feed
    if (calc.feed) {
      var feedStr = units.formatFeed(calc.feed.feedRate, feedFmt, calc.adjustedRPM, calc.toolConfig.flutes);
      lines.push("(  Feed Rate: " + feedStr);
      
      // Chip load
      var fz = calc.feed.fz;
      if (unitSys === "inch") {
        lines.push("(  Chip Load: " + units.mmToInch(fz).toFixed(4) + " IPT (" + fz.toFixed(3) + " mm/tooth)");
      } else {
        lines.push("(  Chip Load: " + fz.toFixed(3) + " mm/tooth");
      }
    }
    
    // Force
    if (calc.force) {
      lines.push("(  Cutting Force: " + units.formatForce(calc.force.Fc, forceFmt, calc.force.Fc_uncertainty));
    }
    
    // Power
    if (calc.force && calc.speed) {
      var power = units.calculatePower(calc.force.Fc, calc.speed.Vc);
      var powerUncert = power * 0.15; // 15% uncertainty
      lines.push("(  Spindle Power: " + units.formatPower(power, powerFmt, powerUncert));
    }
    
    // Tool life
    if (calc.toolLife) {
      lines.push("(  Est. Tool Life: " + units.formatToolLife(calc.toolLife.T, calc.toolLife.T_uncertainty));
    }
    
    lines.push("(-----------------------------------------------");
    
    return lines;
  },
  
  /**
   * Format material info block for G-code header
   * @param material - Material data object
   */
  formatMaterialBlock: function(material) {
    if (!material) {
      return ["(MATERIAL: Not specified)"];
    }
    
    var lines = [];
    var units = PRISM_UNITS;
    var unitSys = units.getUnitSystem();
    
    lines.push("(===============================================");
    lines.push("(PRISM MANUFACTURING INTELLIGENCE v9.0");
    lines.push("(===============================================");
    lines.push("(MATERIAL: " + material.name);
    
    // Kienzle coefficients
    if (material.kienzle) {
      var kc = material.kienzle.kc1_1;
      var kcStr = unitSys === "inch" ? 
        units.formatKc(kc, "inch") + " (" + kc + " N/mm )" :
        kc + " N/mm  (" + units.formatKc(kc, "inch") + ")";
      lines.push("(  Kc1.1: " + kcStr + " | mc: " + material.kienzle.mc);
    }
    
    // Hardness
    if (material.hardness) {
      lines.push("(  Hardness: " + material.hardness + " HB");
    }
    
    // Thermal conductivity
    if (material.thermal && material.thermal.k) {
      lines.push("(  Thermal Cond: " + material.thermal.k + " W/mK");
    }
    
    lines.push("(===============================================");
    
    return lines;
  },
  
  /**
   * Format tool info block for G-code
   * @param toolNum - Tool number
   * @param toolConfig - Tool configuration from PRISM_PHYSICS.getToolConfig()
   * @param fusionTool - Fusion tool object for diameter, etc.
   */
  formatToolBlock: function(toolNum, toolConfig, fusionTool) {
    var lines = [];
    var units = PRISM_UNITS;
    var unitSys = units.getUnitSystem();
    
    // Tool header
    var toolName = fusionTool ? fusionTool.description || ("Tool " + toolNum) : ("Tool " + toolNum);
    lines.push("(TOOL " + toolNum + ": " + toolName + ")");
    
    // Tool type and flutes
    var typeStr = toolConfig.type !== "auto" ? toolConfig.type.replace(/_/g, " ") : "Auto";
    lines.push("(  Type: " + toolConfig.flutes + "-Flute " + typeStr);
    
    // Material and coating
    var matStr = toolConfig.material.replace(/_/g, " ");
    var coatStr = toolConfig.coating.toUpperCase();
    lines.push("(  Material: " + matStr + " + " + coatStr);
    
    // Brand and catalog
    if (toolConfig.brand !== "generic" || toolConfig.catalogNum) {
      var brandStr = toolConfig.brand !== "generic" ? toolConfig.brand : "Generic";
      var catStr = toolConfig.catalogNum ? " " + toolConfig.catalogNum : "";
      lines.push("(  Brand: " + brandStr + catStr);
    }
    
    // Holder info
    var holderTypeStr = toolConfig.holderType.replace(/_/g, " ");
    var holderBrandStr = toolConfig.holderBrand !== "generic" ? toolConfig.holderBrand : "";
    lines.push("(  Holder: " + holderBrandStr + " " + holderTypeStr);
    
    // Diameter if available
    if (fusionTool && fusionTool.diameter) {
      lines.push("(  Diameter: " + units.formatDiameter(fusionTool.diameter, unitSys));
    }
    
    return lines;
  },
  
  /**
   * Format inline comment for feed move
   * @param factor - Feed adjustment factor
   * @param reason - Reason for adjustment
   */
  formatFeedComment: function(factor, reason) {
    if (Math.abs(factor - 1.0) < 0.01) {
      return "(PRISM: Nominal feed)";
    }
    var percent = Math.round((factor - 1) * 100);
    var sign = percent >= 0 ? "+" : "";
    return "(PRISM: " + reason + " " + sign + percent + "% feed)";
  }
};

// =============================================================================
// PRISM MANUFACTURING INTELLIGENCE v9.0 - PHYSICS ENGINE
// =============================================================================

// =============================================================================
// PRISM PHYSICS CALCULATION ENGINE
// =============================================================================
// Implements Kienzle cutting force, Taylor tool life, and intelligent
// speed/feed calculations based on material, tool, and holder data
// =============================================================================


// ===========================================================================
// PRISM v10.5 - LIGHTS-OUT PRODUCTION HELPERS
// ===========================================================================

var PRISM_LIGHTS_OUT = {
  getSisterTool: function(toolNum, offset) {
    return toolNum + offset;
  },
  
  needsBreakCheck: function(strategy, diameter, mode) {
    if (mode === "drill_tap") return /drill|tap|thread|bore/i.test(strategy);
    if (mode === "holes") return /drill|tap|thread|bore|ream|pocket/i.test(strategy);
    if (mode === "small") return diameter < 6;
    return mode === "all";
  },
  
  formatBreakCheck: function(toolNum, tolerance, subprogram) {
    if (subprogram > 0) {
      return "G65 P" + subprogram + " T" + toolNum + " H" + tolerance.toFixed(3);
    }
    return null;  // Comment only
  }
};

var PRISM_PHYSICS = {
  
  // Tool material speed multipliers relative to coated carbide
  toolMaterialFactors: {
    "carbide": 1.0,         // Standard K20-K40 grade
    "carbide_sub": 1.05,    // Submicron grain — slightly harder, better edge
    "carbide_micro": 1.10,  // Micrograin — higher hardness, fine edge retention
    "carbide_uf": 1.15,     // Ultra-fine <0.5μm — maximum edge sharpness
    "carbide_insert": 1.0,
    "micrograin": 1.1,
    "hss": 0.25,
    "hss_cobalt": 0.30,
    "hss_pm": 0.35,
    "hss_pm_premium": 0.40, // CPM Rex 45/76 — best HSS
    "cermet": 1.3,
    "ceramic": 2.0,         // Al2O3 ceramic
    "ceramic_sialon": 2.2,  // Si3N4/Sialon — nickel superalloys
    "ceramic_whisker": 2.5, // SiC whisker-reinforced — Inconel/Ti
    "cbn": 2.5,             // Low-content PCBN
    "cbn_high": 3.0,        // High-content PCBN — hard turning >55 HRC
    "pcd": 3.0,
    "cvd_diamond": 3.5      // CVD diamond thick film
  },
  
  // Coating speed multipliers — relative to TiAlN baseline (1.0).
  // v11 S5 U-PBL13: Corrected per Sandvik Solid Round Tools catalog.
  // vs uncoated: TiAlN=+50%, AlTiN=+60%, DLC=+100% (aluminum only).
  coatingFactors: {
    "uncoated": 0.667,     // 1/1.50 — no coating, carbide substrate only
    "tin": 0.80,           // TiN — general purpose, +20% vs uncoated
    "ticn": 0.90,          // TiCN — harder, +35% vs uncoated
    "tialn": 1.0,          // TiAlN — baseline (most common carbide coating)
    "altin": 1.07,         // AlTiN — hardened steel optimized, +60% vs uncoated
    "alcrn": 1.10,         // AlCrN — high-temp resistant
    "crn": 0.85,           // CrN — non-ferrous, low friction
    "naco": 1.15,          // nACo (TiAlSiN) — nano-composite, extreme hardness
    "tisin": 1.20,         // TiSiN — super hard >3500HV, hard machining
    "nacro": 1.18,         // nACRo — nano-composite chrome
    "zrn": 0.85,           // ZrN — non-ferrous, anti-friction
    "dlc": 1.33,           // DLC — diamond-like carbon, +100% vs uncoated (aluminum)
    "diamond": 1.50,       // PCD/CVD diamond — composites/graphite
    "cvd_diamond": 1.50,   // CVD diamond — graphite/composites
    "cvd_multi": 1.25,     // CVD TiCN+Al2O3+TiN — steel/cast iron roughing
    "cvd_al2o3": 1.15,     // CVD Al2O3 — cast iron, high-temp stability
    "multilayer_cvd": 1.25  // Multi-layer CVD — steel roughing (legacy alias)
  },
  
  // Holder TIR factors (affects tool life and finish)
  holderTIRFactors: {
    // ER Systems (TIR in inches, stiffness relative to shrink fit)
    "er_collet": { tir: 0.0005, stiffness: 0.85 },
    "er_hp": { tir: 0.0002, stiffness: 0.90 },
    "er_coolant": { tir: 0.0003, stiffness: 0.85 },
    "er_mini": { tir: 0.0003, stiffness: 0.88 },
    
    // Lyndex Systems
    "lyndex_er": { tir: 0.0002, stiffness: 0.92 },
    "lyndex_tg": { tir: 0.0002, stiffness: 0.90 },
    "lyndex_da": { tir: 0.0003, stiffness: 0.88 },
    "lyndex_5c": { tir: 0.0002, stiffness: 0.92 },
    "lyndex_r8": { tir: 0.0003, stiffness: 0.85 },
    "lyndex_af": { tir: 0.0002, stiffness: 0.90 },
    "lyndex_vc": { tir: 0.00015, stiffness: 0.93 },
    "lyndex_vc_s": { tir: 0.00015, stiffness: 0.91 },
    
    // Rego-Fix Systems
    "rego_er": { tir: 0.0002, stiffness: 0.92 },
    "rego_powrgrip": { tir: 0.00012, stiffness: 0.97 },
    "rego_securgrip": { tir: 0.0001, stiffness: 0.98 },
    "rego_hiq": { tir: 0.00008, stiffness: 0.95 },
    "rego_mr": { tir: 0.0002, stiffness: 0.90 },
    
    // Precision Systems
    "shrink": { tir: 0.0001, stiffness: 1.00 },
    "shrink_safelock": { tir: 0.0001, stiffness: 1.00 },
    "hydraulic": { tir: 0.00012, stiffness: 0.95 },
    "corochuck": { tir: 0.00008, stiffness: 0.98 },
    "tribos": { tir: 0.00004, stiffness: 0.99 },
    "tendo": { tir: 0.00008, stiffness: 0.96 },
    "mega_micro": { tir: 0.00004, stiffness: 0.98 },
    "mega_e": { tir: 0.00006, stiffness: 0.97 },
    "haimer_shrink": { tir: 0.00008, stiffness: 1.00 },
    "safe_lock": { tir: 0.0001, stiffness: 1.00 },
    
    // Standard Chucks
    "milling_chuck": { tir: 0.0003, stiffness: 0.92 },
    "side_lock": { tir: 0.0004, stiffness: 0.90 },
    "endmill_holder": { tir: 0.0004, stiffness: 0.88 },
    "shell_arbor": { tir: 0.0003, stiffness: 0.95 },
    "facemill_arbor": { tir: 0.0003, stiffness: 0.95 },
    "drill_chuck": { tir: 0.001, stiffness: 0.75 },
    "keyless_chuck": { tir: 0.002, stiffness: 0.70 },
    
    // Tapping Systems
    "tap_holder": { tir: 0.001, stiffness: 0.80 },
    "rigid_tap": { tir: 0.0005, stiffness: 0.85 },
    "float_tap": { tir: 0.002, stiffness: 0.70 },
    "synchro_tap": { tir: 0.0004, stiffness: 0.88 },
    
    // Specialty
    "boring_head": { tir: 0.0002, stiffness: 0.85 },
    "fly_cutter_arbor": { tir: 0.0005, stiffness: 0.80 },
    "morse_adapter": { tir: 0.0005, stiffness: 0.82 },
    "cat40_direct": { tir: 0.0002, stiffness: 0.98 },
    "hsk_direct": { tir: 0.0001, stiffness: 1.00 },
    "bt_direct": { tir: 0.0002, stiffness: 0.98 },
    "capto_direct": { tir: 0.00015, stiffness: 0.99 },

    // Nikken / Techniks / Parlec / Maritool
    "nikken_slim": { tir: 0.00015, stiffness: 0.94 },
    "nikken_multilock": { tir: 0.0001, stiffness: 0.97 },
    "techniks_synoflex": { tir: 0.00015, stiffness: 0.93 },
    "techniks_er": { tir: 0.0002, stiffness: 0.91 },
    "parlec_er": { tir: 0.0002, stiffness: 0.90 },
    "maritool_er": { tir: 0.0003, stiffness: 0.88 },
    "maritool_em": { tir: 0.0003, stiffness: 0.90 },

    // BIG Kaiser
    "bigkaiser_hipower": { tir: 0.00015, stiffness: 0.96 },
    "bigkaiser_newbaby": { tir: 0.00008, stiffness: 0.98 },
    "bigkaiser_ck": { tir: 0.00005, stiffness: 0.97 },

    // Kennametal Holders
    "kmt_hydroforce": { tir: 0.0001, stiffness: 0.96 },
    "kmt_km_micro": { tir: 0.00008, stiffness: 0.97 },
    "kmt_er": { tir: 0.0002, stiffness: 0.91 },

    // Sandvik Coromant Capto
    "capto_c4": { tir: 0.00012, stiffness: 0.96 },
    "capto_c5": { tir: 0.0001, stiffness: 0.98 },
    "capto_c6": { tir: 0.0001, stiffness: 0.99 },
    "corochuck_970": { tir: 0.00006, stiffness: 0.98 },

    // Seco
    "seco_graflex": { tir: 0.00015, stiffness: 0.94 },
    "seco_epb": { tir: 0.0001, stiffness: 0.96 },

    // Iscar Modular
    "iscar_multimaster": { tir: 0.00015, stiffness: 0.92 },
    "iscar_sumocham": { tir: 0.0002, stiffness: 0.90 },

    // Generic Collet Systems
    "tg100": { tir: 0.0003, stiffness: 0.90 },
    "tg150": { tir: 0.0003, stiffness: 0.91 },
    "da180": { tir: 0.0003, stiffness: 0.88 },
    "collet_5c": { tir: 0.0002, stiffness: 0.92 },
    "collet_16c": { tir: 0.0002, stiffness: 0.90 },

    // Specialty
    "boring_head_digital": { tir: 0.0001, stiffness: 0.87 },
    "stub_arbor": { tir: 0.0003, stiffness: 0.94 },
    "straight_shank": { tir: 0.0005, stiffness: 0.88 },
    "insert_drill_holder": { tir: 0.0004, stiffness: 0.90 },
    "modular_adapter": { tir: 0.0002, stiffness: 0.93 },
    "cat50_direct": { tir: 0.0002, stiffness: 0.99 },
    "hsk100_direct": { tir: 0.0001, stiffness: 1.00 },
    "bt50_direct": { tir: 0.0002, stiffness: 0.99 }  },

  // =========================================================================
  // SPINDLE INTERFACE FACTORS
  // =========================================================================
  // Rigidity factor: 1.0 = standard CAT40, higher = more rigid
  // Speed factor: Max recommended % of spindle limit for this interface
  // Torque factor: Torque transmission efficiency
  
  spindleInterfaceFactors: {
    // Dual Contact Systems (Best rigidity)
    "big_plus_40": { rigidity: 1.30, speedFactor: 1.00, torqueFactor: 1.00, maxRPM: 20000 },
    "big_plus_50": { rigidity: 1.50, speedFactor: 0.85, torqueFactor: 1.10, maxRPM: 12000 },
    "hsk_a63": { rigidity: 1.40, speedFactor: 1.10, torqueFactor: 1.00, maxRPM: 24000 },
    "hsk_a100": { rigidity: 1.60, speedFactor: 0.90, torqueFactor: 1.15, maxRPM: 18000 },
    "hsk_e40": { rigidity: 1.20, speedFactor: 1.20, torqueFactor: 0.90, maxRPM: 42000 },
    "hsk_e50": { rigidity: 1.30, speedFactor: 1.15, torqueFactor: 0.95, maxRPM: 36000 },
    "hsk_f63": { rigidity: 1.35, speedFactor: 1.05, torqueFactor: 1.00, maxRPM: 30000 },
    "capto_c5": { rigidity: 1.35, speedFactor: 1.00, torqueFactor: 1.05, maxRPM: 20000 },
    "capto_c6": { rigidity: 1.50, speedFactor: 0.95, torqueFactor: 1.10, maxRPM: 18000 },
    "capto_c8": { rigidity: 1.70, speedFactor: 0.85, torqueFactor: 1.20, maxRPM: 15000 },
    "km40": { rigidity: 1.25, speedFactor: 1.00, torqueFactor: 1.00, maxRPM: 20000 },
    "km50": { rigidity: 1.40, speedFactor: 0.90, torqueFactor: 1.05, maxRPM: 16000 },
    
    // Standard V-Flange (Baseline)
    "cat40": { rigidity: 1.00, speedFactor: 1.00, torqueFactor: 1.00, maxRPM: 15000 },
    "cat50": { rigidity: 1.25, speedFactor: 0.80, torqueFactor: 1.15, maxRPM: 10000 },
    "bt30": { rigidity: 0.75, speedFactor: 1.10, torqueFactor: 0.85, maxRPM: 20000 },
    "bt40": { rigidity: 1.00, speedFactor: 1.00, torqueFactor: 1.00, maxRPM: 15000 },
    "bt50": { rigidity: 1.25, speedFactor: 0.80, torqueFactor: 1.15, maxRPM: 10000 },
    "sk40": { rigidity: 1.00, speedFactor: 1.00, torqueFactor: 1.00, maxRPM: 15000 },
    "sk50": { rigidity: 1.25, speedFactor: 0.80, torqueFactor: 1.15, maxRPM: 10000 },
    
    // Other
    "r8": { rigidity: 0.60, speedFactor: 0.80, torqueFactor: 0.70, maxRPM: 6000 },
    "nmtb30": { rigidity: 0.70, speedFactor: 0.90, torqueFactor: 0.80, maxRPM: 8000 },
    "nmtb40": { rigidity: 0.85, speedFactor: 0.85, torqueFactor: 0.90, maxRPM: 6000 },
    "iso30": { rigidity: 0.75, speedFactor: 1.00, torqueFactor: 0.85, maxRPM: 15000 },
    "iso40": { rigidity: 0.95, speedFactor: 0.95, torqueFactor: 0.95, maxRPM: 12000 }
  },
  
  // Machine rigidity factors
  machineRigidityFactors: {
    "light": { doc: 0.50, woc: 0.60, feed: 0.70, chatter: 0.60 },
    "medium": { doc: 1.00, woc: 1.00, feed: 1.00, chatter: 1.00 },
    "heavy": { doc: 1.30, woc: 1.25, feed: 1.15, chatter: 1.30 },
    "very_heavy": { doc: 1.60, woc: 1.50, feed: 1.25, chatter: 1.50 },
    "ultra": { doc: 2.00, woc: 1.75, feed: 1.35, chatter: 1.80 }
  },
  
  // Machine age/condition factors
  machineConditionFactors: {
    "new": { rigidity: 1.10, precision: 1.10, reliability: 1.00 },
    "good": { rigidity: 1.00, precision: 1.00, reliability: 1.00 },
    "average": { rigidity: 0.90, precision: 0.95, reliability: 0.95 },
    "worn": { rigidity: 0.75, precision: 0.85, reliability: 0.85 },
    "rebuilt": { rigidity: 0.95, precision: 0.98, reliability: 0.98 }
  },
  
  // Coolant pressure factors (for drilling/deep holes)
  coolantPressureFactors: {
    "flood": { chipEvac: 0.70, toolLife: 1.00, depthLimit: 3.0 },
    "tsc_150": { chipEvac: 0.85, toolLife: 1.10, depthLimit: 5.0 },
    "tsc_300": { chipEvac: 1.00, toolLife: 1.20, depthLimit: 7.0 },
    "tsc_500": { chipEvac: 1.15, toolLife: 1.30, depthLimit: 10.0 },
    "tsc_1000": { chipEvac: 1.30, toolLife: 1.40, depthLimit: 15.0 },
    "tsc_1500": { chipEvac: 1.45, toolLife: 1.50, depthLimit: 20.0 }
  },
  
  // Workholding rigidity factors
  workholdingFactors: {
    "vise": { rigidity: 0.85, vibration: 0.90, accessibility: 0.70 },
    "dual_vise": { rigidity: 0.90, vibration: 0.95, accessibility: 0.60 },
    "5axis_vise": { rigidity: 0.80, vibration: 0.85, accessibility: 1.00 },
    "fixture_plate": { rigidity: 0.95, vibration: 0.95, accessibility: 0.90 },
    "vacuum": { rigidity: 0.50, vibration: 0.60, accessibility: 1.00 },
    "dedicated": { rigidity: 1.00, vibration: 1.00, accessibility: 0.80 },
    "tombstone": { rigidity: 0.95, vibration: 0.90, accessibility: 0.95 },
    "soft_jaws": { rigidity: 0.90, vibration: 0.85, accessibility: 0.85 },
    "collet_chuck": { rigidity: 0.85, vibration: 0.90, accessibility: 0.90 }
  },

  // Brand quality factors (tool life multiplier)
  // Higher = better quality, more consistent, longer tool life
  brandFactors: {
    // TIER 1 — Premium (best substrates, tightest tolerances, highest consistency)
    "sandvik": 1.20,    // Coromant — industry gold standard, excellent R&D
    "walter": 1.18,     // Titex/Prototyp/Walter — German precision, top coatings
    "kennametal": 1.15,  // Beyond/HARVI/Stellram — strong US engineering
    "seco": 1.14,       // Jabro/Minimaster — Swedish, strong in HEM
    "mitsubishi": 1.14,  // Japanese precision, excellent insert grades
    "sumitomo": 1.14,   // Japanese, strong CBN/PCD and coatings
    "mapal": 1.16,      // German precision boring/reaming specialist
    "ceratizit": 1.12,  // Luxembourg group (includes WNT), solid carbide
    "guhring": 1.14,    // German drill specialist, excellent HSS-E and carbide drills

    // TIER 2 — High Performance (proven HEM/HSM geometries, reliable quality)
    "kyocera": 1.12,    // SGS division — strong HEM endmills
    "iscar": 1.10,      // HeliMill/ChatMill — good value for indexable
    "tungaloy": 1.10,   // Japanese, strong in turning inserts
    "osg": 1.12,        // Japanese, excellent drills and taps (A-Brand line)
    "ingersoll": 1.08,  // Good indexable, Gold series
    "imco": 1.12,       // German, excellent HEM/Pow-R-Feed endmills
    "helical": 1.12,    // Harvey Performance — excellent HEM, great coating tech
    "fraisa": 1.12,     // Swiss, premium endmills with AX coatings
    "harvey": 1.10,     // Harvey Tool — specialty miniature/profile, tight tolerances
    "yg1": 1.10,        // Korean — V7/X5/Dream Drill are premium lines, excellent value
    "destiny": 1.08,    // US — Viper/Titan HEM endmills, good geometry
    "hanita": 1.08,     // Israeli (Widia group) — VariMill, solid performance

    // TIER 3 — General Purpose (reliable, good value, industry staples)
    "widia": 1.04,      // Kennametal value brand — decent but not premium
    "korloy": 1.04,     // Korean — good inserts at competitive price
    "niagara": 1.04,    // US — solid general-purpose endmills
    "garr": 1.04,       // US — consistent quality, good for general work
    "dataflute": 1.02,  // US — decent HEM, competitive pricing
    "nachi": 1.04,      // Japanese — good drills, reliable
    "dormer": 1.02,     // Dormer Pramet — European, solid HSS and carbide
    "maford": 1.02,     // US — good drills and countersinks
    "zeni": 1.02,       // Italian (NOT Japanese) — mid-tier, decent quality
    "accupro": 1.00,    // MSC house brand — acceptable quality
    "melin": 0.98,      // US — basic carbide, OK for general work
    "union": 0.98,      // Butterfield — legacy brand, basic
    "cleveland": 0.96,  // Legacy US brand — basic HSS/carbide

    // TIER 4 — Value/Budget (cost-effective, import quality varies)
    "lakeshore": 1.00,  // US micro-grain carbide — actually good quality for price
    "maritool": 0.98,   // US — good value endmills, decent consistency
    "kodiak": 0.92,     // Import — acceptable for non-critical work
    "accusize": 0.85,   // China import — inconsistent, use for roughing only
    "shars": 0.82,      // China import — budget, expect shorter tool life

    // TURNING INSERT SPECIALISTS
    "ntk": 1.14,        // Japan — NTK Cutting Tools, ceramic/CBN insert leader for turning
    "taegutec": 1.08,   // Korea — IMC Group, strong turning inserts, good P/M grades
    "moldino": 1.14,    // Japan — ex-Mitsubishi Hitachi, excellent endmills + turning
    "vardex": 1.12,     // Israel — Vargus group, premium threading inserts
    "vargus": 1.12,     // Israel — GROOVEX line, grooving/threading specialist
    "arno": 1.06,       // Germany — APlus grooving/parting system
    "simtek": 1.04,     // Israel — grooving/threading inserts, budget Horn alternative
    "palbit": 1.04,     // Portugal — solid turning inserts, good European value
    "pramet": 1.04,     // Czech (Dormer Pramet) — turning inserts, good M/K grades
    "lamina": 1.00,     // Swiss — Lamina Technologies, budget turning inserts
    "allied": 1.08,     // US — Allied Machine AMPC, GEN3SYS/T-A Pro holemaking
    "sgs": 1.12,        // Kyocera SGS — premium solid carbide endmills (separate from kyocera)

    // SPECIALTY (rate by their specialty, not general purpose)
    "emuge": 1.18,      // German — world's best taps, Rekord/MultiTap lines
    "horn": 1.18,       // German — premium grooving/parting/threading inserts
    "carmex": 1.12,     // Israeli — excellent threading inserts
    "balax": 1.12,      // US — excellent thread forming taps
    "micro100": 1.10,   // US — excellent micro boring bars and grooving
    "sct": 1.08,        // Scientific Cutting Tools — good threading/boring
    "nat": 1.00,        // North American Tool — decent threading
    "rapidkut": 0.92,   // Import — basic carbide inserts
    "flash": 0.98,      // US — Flash Tool, decent ECI endmills
    
    // Separators (ignored in calc)
    "_premium": 1.0,
    "_highperf": 1.0,
    "_general": 1.0,
    "_value": 1.0,
    "_specialty": 1.0,
    
    // Generic/unknown - conservative
    "generic": 0.85
  },

  // =========================================================================
  // INSERT GRADE DATABASE - Speed/Feed multipliers by grade
  // =========================================================================
  // Base: Generic P20 carbide = 1.0 speed, 1.0 feed
  // Speed factor: higher = faster cutting speed allowed
  // Feed factor: higher = higher feed per tooth allowed
  // Toughness: higher = better interrupted cut performance
  
  insertGradeData: {
    // === Generic ISO Grades ===
    "P10":  { speed: 1.20, feed: 0.85, tough: 0.7, desc: "Finishing - high speed, light cuts" },
    "P20":  { speed: 1.00, feed: 1.00, tough: 1.0, desc: "General purpose steel" },
    "P30":  { speed: 0.85, feed: 1.15, tough: 1.2, desc: "Roughing - tough grade" },
    "P40":  { speed: 0.70, feed: 1.25, tough: 1.4, desc: "Heavy interrupted cuts" },
    "M10":  { speed: 1.10, feed: 0.80, tough: 0.8, desc: "Stainless finishing" },
    "M20":  { speed: 0.90, feed: 0.90, tough: 1.0, desc: "Stainless general" },
    "M30":  { speed: 0.75, feed: 1.00, tough: 1.2, desc: "Stainless roughing" },
    "K10":  { speed: 1.30, feed: 0.90, tough: 0.7, desc: "Cast iron finishing" },
    "K20":  { speed: 1.10, feed: 1.00, tough: 0.9, desc: "Cast iron general" },
    "K30":  { speed: 0.90, feed: 1.10, tough: 1.1, desc: "Cast iron roughing" },
    "N10":  { speed: 2.50, feed: 1.20, tough: 0.8, desc: "Aluminum/Non-ferrous" },
    "S10":  { speed: 0.40, feed: 0.70, tough: 0.9, desc: "Superalloy finishing" },
    "S20":  { speed: 0.30, feed: 0.80, tough: 1.0, desc: "Superalloy general" },
    "H10":  { speed: 0.80, feed: 0.60, tough: 0.6, desc: "Hardened finishing" },
    "H20":  { speed: 0.60, feed: 0.70, tough: 0.8, desc: "Hardened general" },
    
    // === Sandvik Grades ===
    "GC4325": { speed: 1.15, feed: 1.00, tough: 1.1, desc: "Steel first choice" },
    "GC4330": { speed: 1.00, feed: 1.10, tough: 1.3, desc: "Steel tough" },
    "GC4340": { speed: 0.90, feed: 1.15, tough: 1.4, desc: "Steel very tough" },
    "GC1125": { speed: 1.05, feed: 0.90, tough: 1.0, desc: "Stainless first choice" },
    "GC1525": { speed: 0.95, feed: 0.95, tough: 1.1, desc: "Stainless general" },
    "GC3330": { speed: 0.85, feed: 1.00, tough: 1.2, desc: "Stainless tough" },
    "GC3220": { speed: 1.20, feed: 1.00, tough: 0.9, desc: "Cast iron" },
    
    // === Kennametal Grades ===
    "KC5010": { speed: 1.20, feed: 0.90, tough: 0.8, desc: "Steel finishing CVD" },
    "KC5025": { speed: 1.05, feed: 1.00, tough: 1.0, desc: "Steel general CVD" },
    "KCPK30": { speed: 0.95, feed: 1.10, tough: 1.2, desc: "Steel universal" },
    "KC725M": { speed: 0.90, feed: 0.95, tough: 1.1, desc: "Stainless PVD" },
    "KCU25":  { speed: 1.00, feed: 1.00, tough: 1.0, desc: "Universal" },
    
    // === Iscar Grades ===
    "IC808":  { speed: 1.10, feed: 1.05, tough: 1.0, desc: "Steel/SS CVD universal" },
    "IC830":  { speed: 1.05, feed: 1.00, tough: 1.1, desc: "Steel general" },
    "IC5820": { speed: 0.50, feed: 0.85, tough: 1.2, desc: "High temp alloys" },
    "IC328":  { speed: 1.00, feed: 1.00, tough: 1.0, desc: "Universal tough" },
    "IC928":  { speed: 1.05, feed: 0.95, tough: 0.9, desc: "Steel/SS PVD" },
    "IC4100": { speed: 2.20, feed: 1.15, tough: 0.7, desc: "Aluminum" },
    
    // === Seco Grades ===
    "TP2500": { speed: 1.10, feed: 1.00, tough: 1.0, desc: "Steel general PVD" },
    "TP1501": { speed: 1.20, feed: 0.95, tough: 0.9, desc: "Steel CVD" },
    "TK1001": { speed: 1.25, feed: 1.00, tough: 0.8, desc: "Cast iron" },
    "MP2500": { speed: 0.90, feed: 0.95, tough: 1.0, desc: "Stainless" },
    
    // === Walter Grades ===
    "WPP20S": { speed: 1.10, feed: 1.00, tough: 1.0, desc: "Steel PVD" },
    "WPP30S": { speed: 0.95, feed: 1.10, tough: 1.2, desc: "Steel tough" },
    "WSM35S": { speed: 0.85, feed: 0.95, tough: 1.1, desc: "Stainless" },
    "WKK20S": { speed: 1.15, feed: 1.00, tough: 0.9, desc: "Cast iron" },
    
    // === Mitsubishi Grades ===
    "VP15TF": { speed: 1.05, feed: 1.00, tough: 1.0, desc: "Universal PVD" },
    "MC5020": { speed: 1.15, feed: 0.95, tough: 0.9, desc: "Steel CVD" },
    "US735":  { speed: 1.00, feed: 1.05, tough: 1.1, desc: "Universal tough" },
    "MP9015": { speed: 0.90, feed: 0.90, tough: 1.0, desc: "Stainless" },
    
    // === Special Materials ===
    "CERMET": { speed: 1.40, feed: 0.70, tough: 0.4, desc: "High speed finishing only" },
    "CBN":    { speed: 2.00, feed: 0.50, tough: 0.3, desc: "Hardened steel >45HRC" },
    "CERAMIC":{ speed: 2.50, feed: 0.40, tough: 0.2, desc: "Cast iron high speed" },
    "PCD":    { speed: 3.00, feed: 0.80, tough: 0.3, desc: "Non-ferrous/composites" },
    
    // Separators (ignored)
    "_iso": { speed: 1.0, feed: 1.0, tough: 1.0 },
    "_sandvik": { speed: 1.0, feed: 1.0, tough: 1.0 },
    "_kennametal": { speed: 1.0, feed: 1.0, tough: 1.0 },
    "_iscar": { speed: 1.0, feed: 1.0, tough: 1.0 },
    "_seco": { speed: 1.0, feed: 1.0, tough: 1.0 },
    "_walter": { speed: 1.0, feed: 1.0, tough: 1.0 },
    "_mitsubishi": { speed: 1.0, feed: 1.0, tough: 1.0 },
    "_special": { speed: 1.0, feed: 1.0, tough: 1.0 }
  },
  
  // Lead angle chip thinning factors
  // Real chip thickness = programmed fpt x sin(lead angle)
  // To maintain chip load, multiply feed by 1/sin(lead angle)
  leadAngleData: {
    "90": { chipThin: 1.000, axialForce: 1.00, feedMult: 1.00 },
    "75": { chipThin: 0.966, axialForce: 0.87, feedMult: 1.04 },
    "65": { chipThin: 0.906, axialForce: 0.77, feedMult: 1.10 },
    "60": { chipThin: 0.866, axialForce: 0.71, feedMult: 1.15 },
    "45": { chipThin: 0.707, axialForce: 0.50, feedMult: 1.41 },
    "30": { chipThin: 0.500, axialForce: 0.33, feedMult: 2.00 },
    "20": { chipThin: 0.342, axialForce: 0.22, feedMult: 2.92 },
    "17": { chipThin: 0.292, axialForce: 0.18, feedMult: 3.42 },
    "15": { chipThin: 0.259, axialForce: 0.16, feedMult: 3.86 },
    "12": { chipThin: 0.208, axialForce: 0.12, feedMult: 4.81 },
    "10": { chipThin: 0.174, axialForce: 0.10, feedMult: 5.76 }
  },
  
  // ===========================================================================
  // HSM/HEM PHYSICS ENGINE v10.1
  // Calculates optimal feed based on actual engagement, deflection, power
  // ===========================================================================
  
  /**
   * Machine acceleration factors (G to mm/s^2 conversion)
   */
  accelFactors: {
    "low": 0.3,
    "medium": 0.5,
    "high": 0.75,
    "very_high": 1.0,
    "ultra": 1.5
  },
  
  /**
   * CANONICAL chip thickness calculation (v11 Bug 23 reconciliation).
   * All chip thickness calculations in this CPS call this single function.
   * Source: Sandvik Coromant General Milling, radial chip thinning section.
   *
   * h_mean = fz * sqrt(ae/D * (1 - ae/D))
   *
   * This is the simplified Sandvik form. The exact trigonometric form is:
   *   h_mean = fz * sin(acos(1 - 2*ae/D)) / 2
   * which equals fz * sqrt(ae/D * (1-ae/D)) algebraically.
   *
   * @param fz - Feed per tooth (mm)
   * @param ae - Radial depth of cut (mm)
   * @param d  - Tool diameter (mm)
   * @returns Mean chip thickness (mm), minimum 0.001
   */
  calcMeanChipThickness: function(fz, ae, d) {
    if (!fz || fz <= 0 || !ae || ae <= 0 || !d || d <= 0) return 0.001;
    var ratio = ae / d;
    if (ratio >= 1.0) ratio = 0.999; // clamp near-slot
    var h = fz * Math.sqrt(ratio * (1 - ratio));
    return Math.max(h, 0.001);
  },

  /**
   * Calculate radial chip thinning factor
   * THE KEY TO HEM! At low radial engagement, chip is thinner than programmed fz
   *
   * Formula: actual_chip = fz * sqrt(ae/D * (1 - ae/D))
   * See calcMeanChipThickness() for canonical implementation.
   * 
   * To maintain target chip load, increase feed by inverse
   * 
   * @param ae - Radial depth of cut (width of cut) in mm
   * @param diameter - Tool diameter in mm
   * @returns Chip thinning multiplier (1.0 to ~3.2 at 10% engagement)
   */
  
  // =========================================================================
  // CHIP THINNING FORMULA SELECTION (v10.3)
  // =========================================================================
  
  /**
   * SQRT chip thinning (Industry Standard - Sandvik, Iscar, Harvey Tool)
   * More aggressive - higher feed multipliers at low WOC
   * Formula: feedMult = 1 / sqrt(ae/D)
   */
  calcChipThiningSqrt: function(ratio) {
    if (ratio <= 0 || ratio >= 1.0) return 1.0;

    // v11 Bug 9 fix: Sandvik General Milling catalog corrected formula.
    // Old: feedMult = 1 / sqrt(ae/D) — ignores exit engagement, underestimates at high WOC.
    //   Error: 13% at 25% WOC, 26% at 45% WOC.
    // Correct: feedMult = 1 / sqrt(ae/D * (1 - ae/D))
    //   Accounts for both entry and exit engagement angles.
    //   Source: Sandvik Coromant General Milling catalog, chip thinning section.
    //   Also: Iscar Technical Guide, Harvey Tool chip thinning formula.
    // At 10% WOC: factor = 3.33x. At 25% WOC: 2.31x. At 50% WOC: 2.0x.
    var mult = 1.0 / Math.sqrt(ratio * (1 - ratio));

    // Cap at reasonable maximum (5x for safety)
    return Math.min(mult, 5.0);
  },
  
  /**
   * GEOMETRIC chip thinning (Conservative - safer)
   * Based on actual chip geometry at tool periphery
   * Formula: feedMult = 1 / sin(acos(1 - 2*ae/D))
   */
  calcChipThinningGeometric: function(ratio) {
    if (ratio <= 0 || ratio >= 1.0) return 1.0;
    
    // Geometric formula
    var cosArg = 1 - (2 * ratio);
    cosArg = Math.max(-1, Math.min(1, cosArg));
    var angle = Math.acos(cosArg);
    var sinAngle = Math.sin(angle);
    
    // Prevent divide by zero
    if (sinAngle < 0.15) sinAngle = 0.15;
    
    var mult = 1.0 / sinAngle;
    
    // Cap at reasonable maximum
    return Math.min(mult, 4.0);
  },
  
  /**
   * Select chip thinning formula based on user preference
   * @param ratio - ae/D (width of cut / diameter)
   * @param formula - "sqrt", "geometric", "auto", "off"
   * @param isHEM - true if HEM/adaptive operation
   * @returns feedMultiplier
   */
  calcChipThinningByFormula: function(ratio, formula, isHEM) {
    if (formula === "off") return 1.0;
    if (ratio <= 0 || ratio >= 0.5) return 1.0;  // No thinning at 50%+ WOC
    
    var selectedFormula = formula;
    
    // AUTO: Use sqrt for HEM (aggressive), geometric for HSM (conservative)
    if (formula === "auto") {
      selectedFormula = isHEM ? "sqrt" : "geometric";
    }
    
    if (selectedFormula === "sqrt") {
      return this.calcChipThiningSqrt(ratio);
    } else {
      return this.calcChipThinningGeometric(ratio);
    }
  },

  // =========================================================================
  // VARIABLE RPM SYSTEM (v10.3)
  // =========================================================================
  
  /**
   * Variable RPM factors based on engagement
   * Physics: Higher engagement = more heat = need lower RPM
   *          Lower engagement = less heat = can increase RPM
   */
  varRPMFactors: {
    // Radial engagement factors (ae/D ratio)
    radialEngagement: {
      "0.05": { rpmFactor: 1.20, reason: "Light radial - can increase RPM" },
      "0.10": { rpmFactor: 1.15, reason: "Light radial engagement" },
      "0.15": { rpmFactor: 1.10, reason: "Light-medium radial" },
      "0.20": { rpmFactor: 1.05, reason: "Medium radial engagement" },
      "0.25": { rpmFactor: 1.00, reason: "Standard radial (baseline)" },
      "0.30": { rpmFactor: 0.95, reason: "Medium-high radial" },
      "0.40": { rpmFactor: 0.90, reason: "High radial engagement" },
      "0.50": { rpmFactor: 0.85, reason: "50% WOC - reduce for heat" },
      "0.75": { rpmFactor: 0.75, reason: "Heavy slotting" },
      "1.00": { rpmFactor: 0.70, reason: "Full slotting - minimize heat" }
    },
    // Axial engagement factors (ap/fluteLength ratio)
    axialEngagement: {
      "0.25": { rpmFactor: 1.10, reason: "Light axial - can increase" },
      "0.50": { rpmFactor: 1.00, reason: "Standard axial (baseline)" },
      "0.75": { rpmFactor: 0.95, reason: "Deep axial cut" },
      "1.00": { rpmFactor: 0.90, reason: "Full flute - reduce RPM" },
      "1.50": { rpmFactor: 0.80, reason: "Beyond flute length" },
      "2.00": { rpmFactor: 0.70, reason: "Very deep - significant reduction" }
    },
    // Mode adjustments
    modeFactors: {
      "conservative": { speedMult: 0.90, maxIncrease: 0.10, maxDecrease: 0.40 },
      "aggressive":   { speedMult: 1.00, maxIncrease: 0.30, maxDecrease: 0.20 },
      "finishing":    { speedMult: 0.85, maxIncrease: 0.05, maxDecrease: 0.30 },
      "auto":         { speedMult: 1.00, maxIncrease: 0.20, maxDecrease: 0.30 }
    }
  },
  
  /**
   * Calculate variable RPM adjustment
   * @param baseRPM - Starting RPM from standard calculation
   * @param radialRatio - ae/D (width of cut / tool diameter)
   * @param axialRatio - ap/fluteLength (depth / flute length)
   * @param mode - "auto", "conservative", "aggressive", "finishing"
   * @param maxIncrease - Maximum RPM increase (0-0.5)
   * @param maxDecrease - Maximum RPM decrease (0-0.5)
   * @returns { rpm: adjustedRPM, factor: adjustmentFactor, reason: string }
   */
  calcVariableRPM: function(baseRPM, radialRatio, axialRatio, mode, maxIncrease, maxDecrease) {
    var result = {
      rpm: baseRPM,
      factor: 1.0,
      radialFactor: 1.0,
      axialFactor: 1.0,
      modeFactor: 1.0,
      reason: "No adjustment",
      adjustments: []
    };
    
    // Clamp ratios
    radialRatio = Math.max(0.01, Math.min(1.0, radialRatio || 0.25));
    axialRatio = Math.max(0.1, Math.min(3.0, axialRatio || 0.5));
    
    // Get mode factors
    var modeFac = this.varRPMFactors.modeFactors[mode] || this.varRPMFactors.modeFactors["auto"];
    result.modeFactor = modeFac.speedMult;
    
    // Calculate radial engagement factor (interpolate)
    var radialKeys = Object.keys(this.varRPMFactors.radialEngagement).map(parseFloat).sort(function(a,b){return a-b;});
    result.radialFactor = this.interpolateFactorTable(radialRatio, radialKeys, this.varRPMFactors.radialEngagement);
    
    // Calculate axial engagement factor (interpolate)
    var axialKeys = Object.keys(this.varRPMFactors.axialEngagement).map(parseFloat).sort(function(a,b){return a-b;});
    result.axialFactor = this.interpolateFactorTable(axialRatio, axialKeys, this.varRPMFactors.axialEngagement);
    
    // Combine factors
    var combinedFactor = result.radialFactor * result.axialFactor * result.modeFactor;
    
    // Apply limits
    var maxFactor = 1.0 + (maxIncrease || modeFac.maxIncrease);
    var minFactor = 1.0 - (maxDecrease || modeFac.maxDecrease);
    
    result.factor = Math.max(minFactor, Math.min(maxFactor, combinedFactor));
    result.rpm = Math.round(baseRPM * result.factor);
    
    // Build reason string
    var adjustments = [];
    if (result.radialFactor !== 1.0) {
      adjustments.push("radial=" + (result.radialFactor * 100).toFixed(0) + "%");
    }
    if (result.axialFactor !== 1.0) {
      adjustments.push("axial=" + (result.axialFactor * 100).toFixed(0) + "%");
    }
    if (result.modeFactor !== 1.0) {
      adjustments.push("mode=" + (result.modeFactor * 100).toFixed(0) + "%");
    }
    
    if (adjustments.length > 0) {
      result.reason = "RPM " + (result.factor >= 1 ? "+" : "") + 
                      ((result.factor - 1) * 100).toFixed(0) + "% (" + adjustments.join(", ") + ")";
      result.adjustments = adjustments;
    }
    
    return result;
  },
  
  /**
   * Interpolate factor from lookup table
   */
  interpolateFactorTable: function(value, keys, table) {
    // Find bracketing keys
    var lowerKey = keys[0];
    var upperKey = keys[keys.length - 1];
    
    for (var i = 0; i < keys.length - 1; i++) {
      if (value >= keys[i] && value <= keys[i + 1]) {
        lowerKey = keys[i];
        upperKey = keys[i + 1];
        break;
      }
    }
    
    if (value <= keys[0]) return table[keys[0].toString()].rpmFactor;
    if (value >= keys[keys.length - 1]) return table[keys[keys.length - 1].toString()].rpmFactor;
    
    // Linear interpolation
    var lowerFactor = table[lowerKey.toString()].rpmFactor;
    var upperFactor = table[upperKey.toString()].rpmFactor;
    var t = (value - lowerKey) / (upperKey - lowerKey);
    
    return lowerFactor + t * (upperFactor - lowerFactor);
  },
  
  /**
   * Calculate variable RPM for 3D adaptive operations
   * Special handling for Z-level changes in adaptive/HSM
   */
  calcAdaptiveVariableRPM: function(baseRPM, currentZ, startZ, totalDepth, radialRatio, mode, maxIncrease, maxDecrease) {
    // Calculate effective axial ratio based on current Z depth
    var depthRatio = Math.abs(currentZ - startZ) / Math.abs(totalDepth);
    depthRatio = Math.max(0.1, Math.min(1.0, depthRatio));
    
    // As we go deeper, engagement typically increases
    // Map depth ratio to effective axial engagement
    var effectiveAxialRatio = 0.25 + (depthRatio * 0.75);  // 0.25 at top, 1.0 at bottom
    
    return this.calcVariableRPM(baseRPM, radialRatio, effectiveAxialRatio, mode, maxIncrease, maxDecrease);
  },

  calcChipThinningMult: function(ae, diameter) {
    if (!ae || ae <= 0 || !diameter || diameter <= 0) return 1.0;
    
    var ratio = ae / diameter;
    
    // At 50%+ engagement, no chip thinning (conventional milling)
    if (ratio >= 0.5) return 1.0;
    
    // Geometric chip thinning formula
    // True chip thickness = fz * sin(acos(1 - 2*ae/D))
    var cosArg = 1 - (2 * ratio);
    cosArg = Math.max(-1, Math.min(1, cosArg));  // Clamp
    
    var angle = Math.acos(cosArg);
    var sinAngle = Math.sin(angle);
    
    // Prevent division by tiny numbers
    if (sinAngle < 0.15) sinAngle = 0.15;
    
    // Feed multiplier = 1 / chip_thickness_ratio
    return 1.0 / sinAngle;
  },
  
  /**
   * Calculate tool deflection
   * Cantilever beam: delta = F * L^3 / (3 * E * I)
   * Where I = pi * D^4 / 64 for solid cylinder
   * 
   * @param force - Radial cutting force in N
   * @param stickout - Tool stickout in mm
   * @param diameter - Tool diameter in mm
   * @param material - Tool material (carbide/hss/ceramic)
   * @returns Deflection in mm
   */
  calcToolDeflection: function(force, stickout, diameter, material) {
    if (!force || force <= 0 || !stickout || stickout <= 0 || !diameter || diameter <= 0) {
      return 0;
    }
    
    // Young's modulus (N/mm^2)
    var E = 620000;  // Carbide (default)
    if (material === "hss" || material === "cobalt") E = 210000;
    if (material === "ceramic") E = 380000;
    
    // Second moment of area: I = pi*D^4/64
    var I = (Math.PI * Math.pow(diameter, 4)) / 64;
    
    // Cantilever deflection: delta = F*L^3 / (3*E*I)
    return (force * Math.pow(stickout, 3)) / (3 * E * I);
  },
  
  /**
   * Estimate radial cutting force (simplified Kienzle)
   * Fr is approximately 30-40% of tangential force Fc
   * 
   * @param material - Material object with kc1_1 and mc
   * @param ae - Radial DOC in mm
   * @param ap - Axial DOC in mm
   * @param fz - Feed per tooth in mm
   * @param diameter - Tool diameter in mm
   * @returns Radial force in N
   */
  calcRadialForce: function(material, ae, ap, fz, diameter) {
    // Specific cutting force (default for steel)
    var kc1_1 = (material && material.kc1_1) ? material.kc1_1 : 1800;
    var mc = (material && material.mc) ? material.mc : 0.25;
    
    // v11 Bug 9/22 fix: Use canonical chip thickness (Sandvik corrected formula)
    var h = this.calcMeanChipThickness(fz, ae, diameter);
    
    // Specific cutting force
    var kc = kc1_1 * Math.pow(h, -mc);
    
    // Tangential force
    var Fc = kc * ap * h;
    
    // Radial force (causes deflection) is ~35% of tangential
    return Fc * 0.35;
  },
  
  /**
   * Calculate power required for cut
   * P = Fc * Vc / 60000 (kW)
   */
  calcPowerRequired: function(Fc, Vc) {
    if (!Fc || Fc <= 0 || !Vc || Vc <= 0) return 0;
    return (Fc * Vc) / 60000;  // kW
  },
  
  /**
   * Calculate acceleration-limited feed for short moves (HSM critical!)
   * On short moves, machine can't reach target feed due to accel limits
   * 
   * @param moveLength - Typical move length in mm
   * @param targetFeed - Target feed in mm/min
   * @param accelG - Acceleration in G
   * @returns Maximum achievable feed in mm/min
   */
  calcAccelLimitedFeed: function(moveLength, targetFeed, accelG) {
    if (!moveLength || moveLength <= 0) return targetFeed;
    if (!accelG || accelG <= 0) accelG = 0.5;
    
    // Convert G to mm/s^2
    var accel = accelG * 9810;
    
    // Feed in mm/s
    var targetFeedSec = targetFeed / 60;
    
    // Distance to accelerate to target: d = v^2 / (2*a)
    var accelDist = (targetFeedSec * targetFeedSec) / (2 * accel);
    
    // Need accel + decel distance, so 2x
    if (moveLength < accelDist * 2) {
      // Can't reach target feed - calculate max achievable
      var maxFeedSec = Math.sqrt(accel * moveLength);
      return Math.min(targetFeed, maxFeedSec * 60);
    }
    
    return targetFeed;
  },
  
  /**
   * MAIN HSM/HEM FEED CALCULATION
   * Combines all physics factors to calculate optimal feed
   * 
   * @param toolConfig - Tool configuration object
   * @param material - Material data object
   * @param diameter - Tool diameter in mm
   * @param rpm - Spindle speed
   * @param ae - Radial DOC (WOC) in mm (from Fusion)
   * @param ap - Axial DOC in mm (from Fusion)
   * @param stickout - Tool stickout in mm
   * @param machineConfig - Machine configuration
   * @param strategy - Toolpath strategy string
   * @returns HSM/HEM calculation result object
   */
  calcHSMHEMFeed: function(toolConfig, material, diameter, rpm, ae, ap, stickout, machineConfig, strategy) {
    var result = {
      mode: "off",
      baseFeed: 0,
      chipThinMult: 1.0,
      deflectionMult: 1.0,
      powerMult: 1.0,
      accelMult: 1.0,
      finalMult: 1.0,
      finalFeed: 0,
      feedIncreasePct: 0,
      deflection: 0,
      powerRequired: 0,
      warnings: [],
      details: {}
    };
    
    // Determine mode
    // CRITICAL: Apply defaults FIRST so engagement check works
    if (!ae || ae <= 0) ae = diameter * 0.15;  // Default 15% WOC
    if (!ap || ap <= 0) ap = diameter * 1.0;   // Default 1xD
    
    var mode = toolConfig.hsmMode || "auto";
    if (mode === "auto") {
      var stratLower = (strategy || "").toLowerCase();
      // HEM: Roughing operations
      var isHEM = stratLower.indexOf("adaptive") >= 0 ||
                  stratLower.indexOf("clearing") >= 0 ||
                  stratLower.indexOf("pocket") >= 0 ||
                  stratLower.indexOf("roughing") >= 0 ||
                  stratLower.indexOf("rough") >= 0 ||
                  stratLower.indexOf("slot") >= 0;
      // HSM: Finishing operations
      var isHSM = stratLower.indexOf("contour") >= 0 ||
                  stratLower.indexOf("parallel") >= 0 ||
                  stratLower.indexOf("scallop") >= 0 ||
                  stratLower.indexOf("finish") >= 0 ||
                  stratLower.indexOf("pencil") >= 0 ||
                  stratLower.indexOf("morph") >= 0 ||
                  stratLower.indexOf("spiral") >= 0;
      
      if (isHEM) {
        mode = "hem";
      } else if (isHSM) {
        mode = "hsm";
      } else if (ae && diameter && (ae / diameter) < 0.50) {
        // Any engagement < 50% benefits from chip thinning
        mode = "hem";
      } else {
        // Default to HEM - better to have chip thinning than not
        mode = "hem";
      }
    }
    result.mode = mode;
    result.details.detectedStrategy = strategy;
    result.details.detectedMode = mode;
    
    if (mode === "off") return result;
    
    // Get base chip load
    var baseFz = this.getBaseChipLoad(material.group || "P", toolConfig.type, diameter);
    var flutes = toolConfig.flutes || 4;
    result.baseFeed = baseFz * flutes * rpm;
    if (!stickout || stickout <= 0) stickout = diameter * 3;  // Default 3xD stickout
    
    result.details.ae = ae;
    result.details.ap = ap;
    result.details.stickout = stickout;
    result.details.engagementPct = (ae / diameter) * 100;
    
    // =========================================================================
    // 1. CHIP THINNING (THE BIG ONE FOR HEM!)
    // =========================================================================
    var chipThinMult = this.calcChipThinningMult(ae, diameter);
    var maxMult = toolConfig.maxChipThinMult || 2.5;
    
    if (chipThinMult > maxMult) {
      result.warnings.push("Chip thin capped: " + chipThinMult.toFixed(2) + "x -> " + maxMult.toFixed(2) + "x");
      chipThinMult = maxMult;
    }
    result.chipThinMult = chipThinMult;
    
    // =========================================================================
    // 2. DEFLECTION LIMITING
    // =========================================================================
    // Calculate radial force at chip-thinning-compensated feed
    var adjustedFz = baseFz * chipThinMult;
    var Fr = this.calcRadialForce(material, ae, ap, adjustedFz, diameter);
    var deflection = this.calcToolDeflection(Fr, stickout, diameter, toolConfig.material);
    var deflectionLimit = toolConfig.deflectionLimit || 0.05;  // mm
    
    // PRISM HEM FIX: For HEM/adaptive with light engagement (<15% WOC), 
    // relax deflection limit because chip thinning means lower actual forces
    var engagementPct = (ae / diameter) * 100;
    if (engagementPct < 15 && chipThinMult > 1.5) {
      // Light HEM engagement - double the deflection allowance
      deflectionLimit = deflectionLimit * 2.0;
      result.hemDeflectionRelaxed = true;
    }
    
    result.deflection = deflection;
    result.details.radialForce = Fr;
    
    if (deflection > deflectionLimit) {
      // Force proportional to feed, deflection proportional to force
      // To reduce deflection to limit, reduce feed proportionally
      var deflectionMult = deflectionLimit / deflection;
      deflectionMult = Math.max(deflectionMult, 0.3);  // Don't reduce more than 70%
      result.deflectionMult = deflectionMult;
      result.warnings.push("Deflection limit: " + (deflection * 1000).toFixed(1) + " um > " + (deflectionLimit * 1000).toFixed(1) + " um");
    }
    
    // =========================================================================
    // 3. POWER LIMITING
    // =========================================================================
    if (machineConfig && machineConfig.power) {
      var Vc = (Math.PI * diameter * rpm) / 1000;  // m/min
      var Fc = Fr / 0.35;  // Back-calculate tangential from radial
      var powerReq = this.calcPowerRequired(Fc, Vc);
      var powerLimit = machineConfig.power * 0.746 * 0.80;  // HP to kW, 80% limit
      
      result.powerRequired = powerReq;
      result.details.powerLimit = powerLimit;
      
      // PRISM HEM FIX: For HEM with light engagement, the power calc overestimates
    // because it uses full axial depth but light radial. Adjust for engagement.
    if (engagementPct < 15 && chipThinMult > 1.5) {
      powerReq = powerReq * (engagementPct / 30);  // Scale down for light engagement
    }
    
    if (powerReq > powerLimit) {
        var powerMult = powerLimit / powerReq;
        powerMult = Math.max(powerMult, 0.4);
        result.powerMult = powerMult;
        result.warnings.push("Power limit: " + powerReq.toFixed(1) + " kW > " + powerLimit.toFixed(1) + " kW");
      }
    }
    
    // =========================================================================
    // 4. ACCELERATION LIMITING (Critical for HSM short moves)
    // =========================================================================
    if (mode === "hsm" && machineConfig && machineConfig.accel) {
      var accelG = this.accelFactors[machineConfig.accel] || 0.5;
      // Assume average move length based on stepover (HSM has many short moves)
      var avgMove = ae * 5;  // Typical move is ~5x stepover
      var targetFeed = result.baseFeed * result.chipThinMult * result.deflectionMult * result.powerMult;
      var accelLimited = this.calcAccelLimitedFeed(avgMove, targetFeed, accelG);
      
      if (accelLimited < targetFeed * 0.95) {
        result.accelMult = accelLimited / targetFeed;
        result.warnings.push("Accel limited on short moves");
      }
    }
    
    // =========================================================================
    // FINAL CALCULATION
    // =========================================================================
    result.finalMult = result.chipThinMult * result.deflectionMult * result.powerMult * result.accelMult;
    result.finalFeed = result.baseFeed * result.finalMult;
    result.feedIncreasePct = (result.finalMult - 1) * 100;
    
    return result;
  },
  
  // ===========================================================================
  // FINISHING OPTIMIZATION ENGINE v10.2
  // Physics-based speed/feed for optimal surface finish and accuracy
  // ===========================================================================
  
  /**
   * Surface finish requirements by Ra (microinches to um conversion: 1 uin = 0.0254 um)
   * Contains speed/feed factors and recommended parameters
   */
  finishRequirements: {
    "8":   { raUm: 0.2,  speedFactor: 0.70, feedFactor: 0.40, minStepover: 0.02, maxChipLoad: 0.0005, desc: "Mirror/Lapped" },
    "16":  { raUm: 0.4,  speedFactor: 0.80, feedFactor: 0.50, minStepover: 0.03, maxChipLoad: 0.0008, desc: "Fine Finish" },
    "32":  { raUm: 0.8,  speedFactor: 0.90, feedFactor: 0.65, minStepover: 0.05, maxChipLoad: 0.0015, desc: "Good Finish" },
    "63":  { raUm: 1.6,  speedFactor: 1.00, feedFactor: 0.80, minStepover: 0.08, maxChipLoad: 0.0025, desc: "Standard" },
    "125": { raUm: 3.2,  speedFactor: 1.10, feedFactor: 1.00, minStepover: 0.12, maxChipLoad: 0.0040, desc: "Semi-Finish" },
    "250": { raUm: 6.4,  speedFactor: 1.35, feedFactor: 1.50, minStepover: 0.20, maxChipLoad: 0.0080, desc: "Roughing" },
    "500": { raUm: 12.5, speedFactor: 1.50, feedFactor: 1.80, minStepover: 0.30, maxChipLoad: 0.0120, desc: "Adaptive/HEM" },
    "999": { raUm: 25.0, speedFactor: 1.75, feedFactor: 2.50, minStepover: 0.50, maxChipLoad: 0.0200, desc: "Ignore Finish" }
  },
  
  /**
   * Tolerance grade factors (ISO IT grades)
   * Tighter tolerance = slower speed for thermal stability and less deflection
   */
  toleranceFactors: {
    "IT5":  { speedFactor: 0.60, feedFactor: 0.50, deflectionLimit: 0.005, thermalLimit: 0.70, desc: "Ultra Precision" },
    "IT6":  { speedFactor: 0.70, feedFactor: 0.60, deflectionLimit: 0.010, thermalLimit: 0.80, desc: "Precision" },
    "IT7":  { speedFactor: 0.80, feedFactor: 0.75, deflectionLimit: 0.015, thermalLimit: 0.90, desc: "Fine" },
    "IT8":  { speedFactor: 0.90, feedFactor: 0.85, deflectionLimit: 0.025, thermalLimit: 1.00, desc: "Standard" },
    "IT9":  { speedFactor: 1.00, feedFactor: 0.95, deflectionLimit: 0.040, thermalLimit: 1.00, desc: "General" },
    "IT10": { speedFactor: 1.10, feedFactor: 1.00, deflectionLimit: 0.060, thermalLimit: 1.00, desc: "Rough" }
  },
  
  /**
   * Machine rigidity impact on finishing
   */
  machineFinishFactors: {
    "very_light": { speedFactor: 0.70, feedFactor: 0.60, maxRPM: 8000,  vibrationRisk: 1.5 },
    "light":      { speedFactor: 0.80, feedFactor: 0.75, maxRPM: 10000, vibrationRisk: 1.3 },
    "medium":     { speedFactor: 0.90, feedFactor: 0.85, maxRPM: 12000, vibrationRisk: 1.1 },
    "heavy":      { speedFactor: 1.00, feedFactor: 1.00, maxRPM: 15000, vibrationRisk: 1.0 },
    "very_heavy": { speedFactor: 1.05, feedFactor: 1.05, maxRPM: 18000, vibrationRisk: 0.9 }
  },
  
  /**
   * Holder type impact on finish quality
   * Better holders = less runout = better finish at same parameters
   */
  holderFinishFactors: {
    // Precision systems (highest rigidity)
    "shrink_fit":       { runout: 0.003, speedBonus: 1.15, finishBonus: 1.20, rigidity: 1.25, projection: 0 },
    "shrink":           { runout: 0.003, speedBonus: 1.15, finishBonus: 1.20, rigidity: 1.25, projection: 0 },
    "shrink_safelock":  { runout: 0.003, speedBonus: 1.15, finishBonus: 1.18, rigidity: 1.22, projection: 0 },
    "heat_shrink":      { runout: 0.003, speedBonus: 1.15, finishBonus: 1.20, rigidity: 1.25, projection: 0 },
    "hydraulic":        { runout: 0.004, speedBonus: 1.10, finishBonus: 1.15, rigidity: 1.20, projection: 0 },
    "tribos":           { runout: 0.003, speedBonus: 1.12, finishBonus: 1.18, rigidity: 1.22, projection: 0 },
    "tendo":            { runout: 0.004, speedBonus: 1.10, finishBonus: 1.15, rigidity: 1.18, projection: 0 },
    "corochuck":        { runout: 0.004, speedBonus: 1.10, finishBonus: 1.15, rigidity: 1.18, projection: 0 },
    "mega_micro":       { runout: 0.003, speedBonus: 1.12, finishBonus: 1.18, rigidity: 1.20, projection: 0 },
    "mega_e":           { runout: 0.004, speedBonus: 1.10, finishBonus: 1.15, rigidity: 1.18, projection: 0 },
    "haimer_shrink":    { runout: 0.003, speedBonus: 1.15, finishBonus: 1.20, rigidity: 1.25, projection: 0 },
    "safe_lock":        { runout: 0.004, speedBonus: 1.12, finishBonus: 1.15, rigidity: 1.20, projection: 0 },
    // Collet systems (standard)
    "precision_collet": { runout: 0.005, speedBonus: 1.05, finishBonus: 1.08, rigidity: 1.10, projection: 0 },
    "er_collet":        { runout: 0.008, speedBonus: 1.00, finishBonus: 1.00, rigidity: 1.00, projection: 0 },
    "er_hp":            { runout: 0.005, speedBonus: 1.05, finishBonus: 1.08, rigidity: 1.08, projection: 0 },
    "er_coolant":       { runout: 0.008, speedBonus: 1.00, finishBonus: 1.00, rigidity: 1.00, projection: 0 },
    "er_mini":          { runout: 0.006, speedBonus: 1.02, finishBonus: 1.02, rigidity: 1.02, projection: 0 },
    "lyndex_er":        { runout: 0.006, speedBonus: 1.03, finishBonus: 1.05, rigidity: 1.05, projection: 0 },
    "lyndex_tg":        { runout: 0.005, speedBonus: 1.05, finishBonus: 1.08, rigidity: 1.08, projection: 0 },
    "rego_er":          { runout: 0.006, speedBonus: 1.03, finishBonus: 1.05, rigidity: 1.05, projection: 0 },
    "rego_powrgrip":    { runout: 0.004, speedBonus: 1.08, finishBonus: 1.12, rigidity: 1.15, projection: 0 },
    "rego_securgrip":   { runout: 0.004, speedBonus: 1.08, finishBonus: 1.10, rigidity: 1.12, projection: 0 },
    "rego_hiq":         { runout: 0.005, speedBonus: 1.05, finishBonus: 1.08, rigidity: 1.08, projection: 0 },
    // Standard chucks (lower rigidity)
    "side_lock":        { runout: 0.010, speedBonus: 0.95, finishBonus: 0.90, rigidity: 0.95, projection: 0 },
    "milling_chuck":    { runout: 0.010, speedBonus: 0.95, finishBonus: 0.90, rigidity: 0.95, projection: 0 },
    "weldon":           { runout: 0.012, speedBonus: 0.90, finishBonus: 0.85, rigidity: 0.90, projection: 0 },
    "endmill_holder":   { runout: 0.012, speedBonus: 0.90, finishBonus: 0.85, rigidity: 0.90, projection: 0 },
    "drill_chuck":      { runout: 0.015, speedBonus: 0.80, finishBonus: 0.75, rigidity: 0.80, projection: 0 },
    "keyless_chuck":    { runout: 0.018, speedBonus: 0.75, finishBonus: 0.70, rigidity: 0.75, projection: 0 },
    // ARBORS - large diameter, high rigidity but LONG PROJECTION
    "shell_arbor":      { runout: 0.008, speedBonus: 0.90, finishBonus: 0.85, rigidity: 1.40, projection: 75 },
    "facemill_arbor":   { runout: 0.008, speedBonus: 0.90, finishBonus: 0.85, rigidity: 1.50, projection: 100 },
    "fly_cutter_arbor": { runout: 0.010, speedBonus: 0.85, finishBonus: 0.80, rigidity: 1.30, projection: 50 },
    // Tapping
    "tap_holder":       { runout: 0.015, speedBonus: 0.90, finishBonus: 0.80, rigidity: 0.85, projection: 0 },
    "rigid_tap":        { runout: 0.012, speedBonus: 0.95, finishBonus: 0.85, rigidity: 0.90, projection: 0 },
    "float_tap":        { runout: 0.020, speedBonus: 0.85, finishBonus: 0.75, rigidity: 0.80, projection: 0 },
    "synchro_tap":      { runout: 0.010, speedBonus: 1.00, finishBonus: 0.90, rigidity: 0.95, projection: 0 },
    // Specialty
    "boring_head":      { runout: 0.005, speedBonus: 0.80, finishBonus: 1.10, rigidity: 0.85, projection: 50 },
    "morse_adapter":    { runout: 0.010, speedBonus: 0.85, finishBonus: 0.80, rigidity: 0.80, projection: 25 },
    "cat40_direct":     { runout: 0.005, speedBonus: 1.10, finishBonus: 1.10, rigidity: 1.30, projection: 0 },
    "hsk_direct":       { runout: 0.003, speedBonus: 1.15, finishBonus: 1.15, rigidity: 1.35, projection: 0 },
    "bt_direct":        { runout: 0.005, speedBonus: 1.08, finishBonus: 1.08, rigidity: 1.25, projection: 0 }
  },
  
  /**
   * Calculate theoretical surface finish (Ra) from cutting parameters
   * Ra = (f^2) / (32 * r) for ball/bull nose (simplified)
   * Ra = (f^2) / (8 * r) for sharp corner tools
   * Where f = feed per rev, r = nose radius
   * 
   * @param feedPerRev - Feed per revolution in mm
   * @param noseRadius - Tool nose radius in mm
   * @param toolType - Tool type for formula selection
   * @returns Theoretical Ra in um
   */
  calcTheoreticalRa: function(feedPerRev, noseRadius, toolType) {
    if (!feedPerRev || feedPerRev <= 0 || !noseRadius || noseRadius <= 0) {
      return 999;  // Unknown/bad
    }
    
    // Ball and bull nose use 32 factor, sharp tools use 8
    var factor = 32;
    if (toolType === "flat_endmill" || toolType === "square_endmill") {
      factor = 8;
    }
    
    // Ra = f^2 / (factor * r) in mm, convert to um
    var raM = (feedPerRev * feedPerRev) / (factor * noseRadius);
    return raM * 1000;  // mm to um
  },
  
  /**
   * Calculate required feed per rev for target Ra
   * Inverse of theoretical Ra formula
   * 
   * @param targetRaUm - Target Ra in um
   * @param noseRadius - Tool nose radius in mm
   * @param toolType - Tool type
   * @returns Required feed per rev in mm
   */
  calcFeedForTargetRa: function(targetRaUm, noseRadius, toolType) {
    if (!targetRaUm || targetRaUm <= 0 || !noseRadius || noseRadius <= 0) {
      return 0.05;  // Default safe value
    }
    
    var factor = 32;
    if (toolType === "flat_endmill" || toolType === "square_endmill") {
      factor = 8;
    }
    
    // f = sqrt(Ra * factor * r)
    var raM = targetRaUm / 1000;  // um to mm
    return Math.sqrt(raM * factor * noseRadius);
  },
  
  /**
   * Calculate stepover for 3D finishing based on cusp height
   * Cusp height h = r - sqrt(r^2 - (s/2)^2) for ball end
   * Solving for s: s = 2 * sqrt(r^2 - (r-h)^2)
   * 
   * @param noseRadius - Tool nose radius in mm
   * @param maxCuspHeight - Maximum cusp height in mm (relates to Ra)
   * @returns Recommended stepover in mm
   */
  calcStepoverForCusp: function(noseRadius, maxCuspHeight) {
    if (!noseRadius || noseRadius <= 0 || !maxCuspHeight || maxCuspHeight <= 0) {
      return noseRadius * 0.1;  // Default 10% of radius
    }
    
    if (maxCuspHeight >= noseRadius) {
      return noseRadius * 2;  // Full width
    }
    
    // s = 2 * sqrt(r^2 - (r-h)^2) = 2 * sqrt(2rh - h^2)
    var rMinusH = noseRadius - maxCuspHeight;
    var stepover = 2 * Math.sqrt(noseRadius * noseRadius - rMinusH * rMinusH);
    
    return stepover;
  },
  
  /**
   * Calculate speed adjustment for stock-to-leave
   * Very light cuts need speed reduction to avoid rubbing
   * Heavy cuts need speed reduction for tool life
   * 
   * @param stockToLeave - Stock to leave in mm
   * @param toolDiameter - Tool diameter in mm
   * @returns Speed adjustment factor
   */
  calcStockToLeaveSpeedFactor: function(stockToLeave, toolDiameter) {
    if (!stockToLeave || stockToLeave <= 0) return 1.0;
    if (!toolDiameter || toolDiameter <= 0) return 1.0;
    
    var ratio = stockToLeave / toolDiameter;
    
    // Very light stock (<0.5% of D): reduce speed to avoid rubbing
    if (ratio < 0.005) {
      return 0.85;
    }
    // Light stock (0.5-2% of D): optimal finishing range
    else if (ratio < 0.02) {
      return 1.0;
    }
    // Medium stock (2-5% of D): slight reduction
    else if (ratio < 0.05) {
      return 0.95;
    }
    // Heavy stock (>5% of D): more like semi-finishing
    else {
      return 0.90;
    }
  },
  
  /**
   * Calculate feed adjustment for length of cut (tool engagement)
   * Longer engagement = more heat = need slower feed or more coolant
   * 
   * @param lengthOfCut - Axial depth of cut in mm
   * @param toolDiameter - Tool diameter in mm
   * @param fluteLength - Flute length in mm
   * @returns Feed adjustment factor
   */
  calcLengthOfCutFeedFactor: function(lengthOfCut, toolDiameter, fluteLength) {
    if (!lengthOfCut || lengthOfCut <= 0) return 1.0;
    if (!toolDiameter || toolDiameter <= 0) return 1.0;
    
    var effectiveFL = fluteLength || (toolDiameter * 3);
    var engagementRatio = lengthOfCut / effectiveFL;
    
    // Light engagement (<30% of flute): can increase feed
    if (engagementRatio < 0.3) {
      return 1.10;
    }
    // Normal engagement (30-60%): baseline
    else if (engagementRatio < 0.6) {
      return 1.0;
    }
    // High engagement (60-80%): reduce for chip evacuation
    else if (engagementRatio < 0.8) {
      return 0.90;
    }
    // Very high engagement (>80%): significant reduction
    else {
      return 0.75;
    }
  },
  
  /**
   * Calculate vibration risk factor
   * Combines tool stickout, holder type, machine rigidity
   * High risk = need slower speeds
   * 
   * @param stickout - Tool stickout in mm
   * @param diameter - Tool diameter in mm
   * @param holderType - Holder type string
   * @param machineRigidity - Machine rigidity string
   * @returns Vibration risk multiplier (>1 = high risk)
   */
  calcVibrationRisk: function(stickout, diameter, holderType, machineRigidity) {
    if (!stickout || !diameter) return 1.0;
    
    // Stickout ratio (>4:1 is risky)
    var stickoutRatio = stickout / diameter;
    var stickoutRisk = 1.0;
    if (stickoutRatio > 6) stickoutRisk = 1.5;
    else if (stickoutRatio > 5) stickoutRisk = 1.3;
    else if (stickoutRatio > 4) stickoutRisk = 1.15;
    else if (stickoutRatio > 3) stickoutRisk = 1.0;
    else stickoutRisk = 0.9;
    
    // Holder contribution
    var holderFactor = this.holderFinishFactors[holderType] || this.holderFinishFactors["er_collet"];
    var holderRisk = 1.0 / holderFactor.rigidity;
    
    // Machine contribution
    var machineFactor = this.machineFinishFactors[machineRigidity] || this.machineFinishFactors["medium"];
    var machineRisk = machineFactor.vibrationRisk;
    
    return stickoutRisk * holderRisk * machineRisk;
  },
  
  /**
   * MAIN FINISHING OPTIMIZATION CALCULATION
   * Calculates optimal speed and feed for finishing operations
   * 
   * @param toolConfig - Tool configuration from getToolConfig
   * @param material - Material data object
   * @param diameter - Tool diameter in mm
   * @param baseSpeed - Base calculated speed in RPM
   * @param baseFeed - Base calculated feed in mm/min
   * @param fusionParams - Parameters from Fusion (stockToLeave, stepover, etc)
   * @param machineConfig - Machine configuration
   * @returns Finishing optimization result object
   */
  calcFinishingOptimization: function(toolConfig, material, diameter, baseSpeed, baseFeed, fusionParams, machineConfig) {
    var result = {
      mode: "off",
      speed: baseSpeed,
      feed: baseFeed,
      speedFactor: 1.0,
      feedFactor: 1.0,
      theoreticalRa: 0,
      achievableRa: 0,
      stepoverRecommended: 0,
      warnings: [],
      details: {}
    };
    
    // Check if finishing mode is enabled
    var finishMode = toolConfig.finishMode || "auto";
    if (finishMode === "off") return result;
    
    // =========================================================================
    // ROUGHING MODE BYPASS (Ra >= 250)
    // When targetRa is 250, 500, or 999, surface finish doesn't matter
    // Skip ALL finishing constraints and maximize MRR
    // =========================================================================
    var targetRa = toolConfig.targetRa || 32;
    if (targetRa >= 250) {
      result.mode = "roughing_bypass";
      result.speedFactor = 1.0;   // No speed reduction for finish
      result.feedFactor = 1.0;    // No feed reduction for finish
      result.details.targetRa = targetRa;
      result.details.bypassReason = "High Ra target (" + targetRa + " uin) = ROUGHING MODE";
      result.details.maxMRR = true;
      result.details.finishConstraints = "DISABLED";
      // Return early - no finishing constraints applied
      return result;
    }
    
    // Auto-detect from Fusion parameters
    if (finishMode === "auto") {
      var stockToLeave = fusionParams.stockToLeave || 0;
      var tolerance = fusionParams.tolerance || 0.1;
      
      // If stock to leave is very small or tolerance is tight, it's finishing
      if (stockToLeave < 0.5 || tolerance < 0.05) {
        finishMode = "balanced";
      } else {
        return result;  // Not a finishing operation
      }
    }
    result.mode = finishMode;
    
    // Get requirements based on target Ra
    var targetRa = toolConfig.targetRa || 32;
    var raReq = this.finishRequirements[targetRa.toString()] || this.finishRequirements["32"];
    result.details.targetRa = targetRa;
    result.details.targetRaUm = raReq.raUm;
    
    // Get tolerance factors
    var tolGrade = toolConfig.toleranceGrade || "IT8";
    var tolFactor = this.toleranceFactors[tolGrade] || this.toleranceFactors["IT8"];
    result.details.toleranceGrade = tolGrade;
    
    // Get nose radius (from tool config or Fusion)
    var noseRadius = toolConfig.finishNoseR;
    if (!noseRadius || noseRadius <= 0) {
      noseRadius = fusionParams.cornerRadius || (diameter * 0.1);  // Default 10% of diameter
    }
    result.details.noseRadius = noseRadius;
    
    // Get holder and machine factors
    var holderType = toolConfig.holderType || "er_collet";
    var holderFactor = this.holderFinishFactors[holderType] || this.holderFinishFactors["er_collet"];
    
    var machineRigidity = (machineConfig && machineConfig.rigidity) ? machineConfig.rigidity : "medium";
    var machineFactor = this.machineFinishFactors[machineRigidity] || this.machineFinishFactors["medium"];
    
    // =========================================================================
    // SPEED CALCULATION
    // =========================================================================
    var speedFactor = 1.0;
    
    // Apply Ra requirement factor
    speedFactor *= raReq.speedFactor;
    
    // Apply tolerance factor
    speedFactor *= tolFactor.speedFactor;
    
    // Apply holder bonus
    speedFactor *= holderFactor.speedBonus;
    
    // Apply machine factor
    speedFactor *= machineFactor.speedFactor;
    
    // Apply stock-to-leave factor
    var stockFactor = this.calcStockToLeaveSpeedFactor(
      fusionParams.stockToLeave || 0.1,
      diameter
    );
    speedFactor *= stockFactor;
    
    // Calculate vibration risk
    var stickout = toolConfig.stickout || (diameter * 3);  // Already in mm from calculateAll
    var vibrationRisk = this.calcVibrationRisk(stickout, diameter, holderType, machineRigidity);
    result.details.vibrationRisk = vibrationRisk;
    
    if (vibrationRisk > 1.2) {
      speedFactor *= (1.0 / vibrationRisk);
      result.warnings.push("High vibration risk - speed reduced");
    }
    
    // Mode adjustments
    if (finishMode === "finish") {
      speedFactor *= 0.90;  // Prioritize finish over speed
    } else if (finishMode === "accuracy") {
      speedFactor *= 0.85;  // Thermal stability
    } else if (finishMode === "productivity") {
      speedFactor *= 1.10;  // Faster but still safe
    }
    
    // Apply max RPM limit
    var newSpeed = baseSpeed * speedFactor;
    if (toolConfig.finishMaxRPM > 0 && newSpeed > toolConfig.finishMaxRPM) {
      newSpeed = toolConfig.finishMaxRPM;
      speedFactor = newSpeed / baseSpeed;
      result.warnings.push("Speed limited to " + toolConfig.finishMaxRPM + " RPM");
    }
    
    // Machine max RPM limit
    if (machineFactor.maxRPM && newSpeed > machineFactor.maxRPM) {
      newSpeed = machineFactor.maxRPM;
      speedFactor = newSpeed / baseSpeed;
    }
    
    result.speed = newSpeed;
    result.speedFactor = speedFactor;
    
    // =========================================================================
    // FEED CALCULATION
    // =========================================================================
    var feedFactor = 1.0;
    
    // Calculate feed for target Ra
    var flutes = toolConfig.flutes || 4;
    var feedPerRev = baseFeed / (newSpeed * flutes);  // Current fpt
    var requiredFeedPerRev = this.calcFeedForTargetRa(raReq.raUm, noseRadius, toolConfig.type);
    
    result.details.currentFeedPerRev = feedPerRev;
    result.details.requiredFeedPerRev = requiredFeedPerRev;
    
    // If current feed would give worse Ra than target, reduce it
    var theoreticalRa = this.calcTheoreticalRa(feedPerRev, noseRadius, toolConfig.type);
    result.theoreticalRa = theoreticalRa;
    
    if (theoreticalRa > raReq.raUm) {
      // Need to reduce feed to meet Ra target
      feedFactor = requiredFeedPerRev / feedPerRev;
      feedFactor = Math.max(feedFactor, 0.3);  // Don't reduce more than 70%
    }
    
    // Apply Ra requirement factor
    feedFactor *= raReq.feedFactor;
    
    // Apply tolerance factor
    feedFactor *= tolFactor.feedFactor;
    
    // Apply holder finish bonus
    feedFactor *= holderFactor.finishBonus;
    
    // Apply machine factor
    feedFactor *= machineFactor.feedFactor;
    
    // Apply length of cut factor
    var locFactor = this.calcLengthOfCutFeedFactor(
      fusionParams.axialDepth || diameter,
      diameter,
      toolConfig.fluteLength || (diameter * 3)
    );
    feedFactor *= locFactor;
    
    // Mode adjustments
    if (finishMode === "finish") {
      feedFactor *= 0.85;  // Slower for better finish
    } else if (finishMode === "accuracy") {
      feedFactor *= 0.90;  // Controlled for accuracy
    } else if (finishMode === "productivity") {
      feedFactor *= 1.05;  // Slightly faster
    }
    
    // Apply minimum feed limit (avoid rubbing)
    var newFeed = baseFeed * feedFactor;
    var minFeed = toolConfig.finishMinFeed;
    if (!minFeed || minFeed <= 0) {
      // Auto-calculate minimum feed (about 0.0005" per tooth minimum)
      minFeed = 0.0127 * flutes * newSpeed;  // 0.0005" = 0.0127mm
    }
    
    if (newFeed < minFeed) {
      newFeed = minFeed;
      feedFactor = newFeed / baseFeed;
      result.warnings.push("Feed limited to min " + (minFeed / 25.4).toFixed(1) + " IPM to avoid rubbing");
    }
    
    result.feed = newFeed;
    result.feedFactor = feedFactor;
    
    // Recalculate achievable Ra with final parameters
    var finalFeedPerRev = newFeed / newSpeed;
    result.achievableRa = this.calcTheoreticalRa(finalFeedPerRev, noseRadius, toolConfig.type);
    
    // =========================================================================
    // STEPOVER RECOMMENDATION (for 3D finishing)
    // =========================================================================
    // Convert target Ra to cusp height (approximately Ra * 4 for visual match)
    var targetCusp = raReq.raUm * 0.004;  // um to mm, factor of 4
    result.stepoverRecommended = this.calcStepoverForCusp(noseRadius, targetCusp);
    
    // Check if current stepover is appropriate
    if (fusionParams.stepover && fusionParams.stepover > result.stepoverRecommended * 1.5) {
      result.warnings.push("Stepover may be too large for Ra " + targetRa + " target");
    }
    
    // =========================================================================
    // FINAL CHECKS
    // =========================================================================
    if (result.achievableRa > raReq.raUm * 1.5) {
      result.warnings.push("May not achieve Ra " + targetRa + " - consider smaller nose radius or slower feed");
    }
    
    if (vibrationRisk > 1.5) {
      result.warnings.push("Consider shorter stickout or better holder for finish quality");
    }
    
    return result;
  },
  
  // Insert nose radius data
  // feedMax = max recommended feed per rev in mm
  // finishRa = approximate Ra achieved in  m
  noseRadiusData: {
    "0.2":  { feedMax: 0.10, finishRa: 0.4, feedFactor: 0.40 },
    "0.4":  { feedMax: 0.20, finishRa: 0.8, feedFactor: 0.55 },
    "0.8":  { feedMax: 0.40, finishRa: 1.6, feedFactor: 0.75 },
    "1.2":  { feedMax: 0.55, finishRa: 2.2, feedFactor: 0.88 },
    "1.6":  { feedMax: 0.70, finishRa: 3.0, feedFactor: 1.00 },
    "2.0":  { feedMax: 0.85, finishRa: 3.5, feedFactor: 1.10 },
    "2.4":  { feedMax: 1.00, finishRa: 4.0, feedFactor: 1.20 },
    "3.2":  { feedMax: 1.25, finishRa: 5.0, feedFactor: 1.35 },
    "4.0":  { feedMax: 1.50, finishRa: 6.0, feedFactor: 1.50 },
    "round":{ feedMax: 2.00, finishRa: 3.2, feedFactor: 1.60 }
  },
  
  // Insert style base recommendations (per tooth values in mm)
  insertStyleData: {
    "face_mill_45":  { baseFpt: 0.20, baseVc: 200, maxDoc: 4.0 },
    "face_mill_90":  { baseFpt: 0.15, baseVc: 180, maxDoc: 6.0 },
    "high_feed":     { baseFpt: 0.80, baseVc: 150, maxDoc: 1.5 },
    "shoulder_90":   { baseFpt: 0.12, baseVc: 160, maxDoc: 8.0 },
    "button":        { baseFpt: 0.25, baseVc: 180, maxDoc: 2.0 },
    "ball":          { baseFpt: 0.15, baseVc: 150, maxDoc: 3.0 },
    "drill":         { baseFpt: 0.08, baseVc: 100, maxDoc: 999 },
    "chamfer":       { baseFpt: 0.10, baseVc: 120, maxDoc: 3.0 },
    "slot":          { baseFpt: 0.10, baseVc: 140, maxDoc: 6.0 },
    "copy":          { baseFpt: 0.20, baseVc: 160, maxDoc: 2.5 }
  },

  // Tool condition factors
  conditionFactors: {
    "new": 1.0,
    "good": 0.90,
    "worn": 0.75,
    "regrind": 0.85
  },
  
  // Optimization mode factors
  optimizationFactors: {
    "tool_life": { speed: 0.80, feed: 0.85 },
    "balanced": { speed: 1.0, feed: 1.0 },
    "productivity": { speed: 1.15, feed: 1.10 },
    "max_mrr": { speed: 1.25, feed: 1.20 }
  },
  
  

  // Strategy to mode mapping (v10.3 unified strategy)
  strategyToModes: function(strategy) {
    var result = { hsmMode: "off", finishMode: "off", optMode: "balanced" };
    // Normalize strategy to lowercase for matching
    var strat = (strategy || "").toLowerCase();
    
    switch(strat) {
      // Roughing modes - HEM physics, no Ra constraints
      case "hem": 
        result.hsmMode = "hem"; 
        result.finishMode = "off";
        result.optMode = "productivity"; 
        break;
      case "aggressive": 
        result.hsmMode = "hem";
        result.finishMode = "off";
        result.optMode = "max_mrr"; 
        break;
      // CRITICAL: Adaptive/clearing operations - these are HEM operations!
      case "adaptive":
      case "adaptive2d":
      case "adaptive3d":
      case "clearing":
      case "pocket":
      case "pocket2d":
      case "pocket3d":
      case "roughing":
      case "slot":
      case "face":           // Face milling - use HEM for high feed mills
      case "face_mill":
        result.hsmMode = "hem"; 
        result.finishMode = "off";
        result.optMode = "productivity"; 
        break;
      case "balanced": 
        result.hsmMode = "auto";
        result.finishMode = "auto";
        result.optMode = "balanced"; 
        break;
      case "conservative": 
        result.hsmMode = "off";
        result.finishMode = "auto";
        result.optMode = "tool_life"; 
        break;
      // HSM - for finishing with physics
      case "hsm": 
        result.hsmMode = "hsm";
        result.finishMode = "balanced";
        result.optMode = "balanced";
        break;
      // Finishing modes - HSM physics + Ra optimization
      case "finish": 
        result.hsmMode = "hsm";
        result.finishMode = "finish";
        result.optMode = "tool_life"; 
        break;
      case "accuracy": 
        result.hsmMode = "hsm";
        result.finishMode = "accuracy";
        result.optMode = "tool_life"; 
        break;
      case "finish_balanced": 
        result.hsmMode = "hsm";
        result.finishMode = "balanced";
        result.optMode = "balanced"; 
        break;
      case "finish_productivity": 
        result.hsmMode = "hsm";
        result.finishMode = "productivity";
        result.optMode = "productivity"; 
        break;
      // Auto - detect from operation
      case "auto": 
        result.hsmMode = "auto"; 
        result.finishMode = "auto"; 
        result.optMode = "balanced";
        break;
      case "off": 
        break;
    }
    return result;
  },

// Toolpath strategy factors
  strategyFactors: {
    "adaptive2d": { radialMult: 1.0, axialMult: 1.0, feedMult: 1.0 },
    "adaptive": { radialMult: 1.0, axialMult: 1.0, feedMult: 1.0 },
    "pocket2d": { radialMult: 0.95, axialMult: 1.0, feedMult: 0.95 },
    "contour2d": { radialMult: 0.90, axialMult: 0.85, feedMult: 0.90 },
    "parallel": { radialMult: 0.85, axialMult: 0.80, feedMult: 0.85 },
    "scallop": { radialMult: 0.85, axialMult: 0.80, feedMult: 0.85 },
    "pencil": { radialMult: 0.80, axialMult: 0.75, feedMult: 0.80 },
    "horizontal": { radialMult: 0.85, axialMult: 0.80, feedMult: 0.85 },
    "spiral": { radialMult: 0.90, axialMult: 0.85, feedMult: 0.88 },
    "radial": { radialMult: 0.90, axialMult: 0.85, feedMult: 0.88 },
    "face": { radialMult: 1.0, axialMult: 0.90, feedMult: 1.0 },
    "slot": { radialMult: 0.80, axialMult: 0.90, feedMult: 0.85 },
    "bore": { radialMult: 0.85, axialMult: 0.90, feedMult: 0.90 },
    "thread": { radialMult: 1.0, axialMult: 1.0, feedMult: 1.0 },
    "drill": { radialMult: 1.0, axialMult: 1.0, feedMult: 1.0 },
    "chamfer": { radialMult: 0.90, axialMult: 0.80, feedMult: 0.85 },
    "engrave": { radialMult: 0.70, axialMult: 0.60, feedMult: 0.70 }
  },
  
  /**
   * Calculate Kienzle specific cutting force
   * kc = kc1.1 * h^(-mc) * correction_factors
   * 
   * @param kc1_1 - Kienzle coefficient (N/mm )
   * @param mc - Kienzle exponent
   * @param h - Chip thickness (mm)
   * @param gamma - Rake angle correction (degrees from 0)
   * @returns Specific cutting force kc (N/mm )
   */
  calculateKienzle: function(kc1_1, mc, h, gamma) {
    gamma = gamma || 0;
    h = Math.max(h, 0.01); // Minimum chip thickness
    
    // Base Kienzle calculation
    var kc = kc1_1 * Math.pow(h, -mc);
    
    // Rake angle correction (1.5% per degree from 0)
    var rakeCorrection = 1.0 - (gamma * 0.015);
    kc = kc * rakeCorrection;
    
    return kc;
  },
  
  /**
   * Calculate cutting force using Kienzle model
   * Fc = kc * ap * fz * sin(kappa)
   * 
   * @param material - Material data object
   * @param ap - Axial depth of cut (mm)
   * @param ae - Radial depth of cut (mm)
   * @param fz - Feed per tooth (mm)
   * @param d - Tool diameter (mm)
   * @returns Force calculation results
   */
  calculateCuttingForce: function(material, ap, ae, fz, d) {
    // Safety check for zero diameter
    if (!d || d <= 0) {
      return { Fc: 0, kc: 0, h: 0, P: 0, valid: false, error: "Invalid diameter" };
    }
    var kc1_1 = material.kienzle.kc1_1;
    var mc = material.kienzle.mc;
    
    // v11 Bug 23: Use canonical chip thickness function (reconciled)
    var h = PRISM_PHYSICS.calcMeanChipThickness(fz, ae, d);
    h = Math.max(h, fz * 0.1); // Minimum for stability
    
    // Calculate specific cutting force
    var kc = this.calculateKienzle(kc1_1, mc, h, 0);
    
    // Calculate cutting force
    var Fc = kc * ap * h;
    
    // Calculate power
    var Vc = 100; // Placeholder, actual Vc calculated elsewhere
    var P = (Fc * Vc) / 60000; // kW
    
    // Calculate uncertainty (+/- 15% typical for Kienzle)
    var uncertainty = Fc * 0.15;
    
    return {
      Fc: Fc,
      Fc_uncertainty: uncertainty,
      kc: kc,
      h: h,
      P: P,
      unit: "N"
    };
  },
  
  /**
   * Calculate tool life using Taylor equation
   * T = C / V^n  or  V * T^n = C
   * 
   * @param material - Material data object
   * @param Vc - Cutting speed (m/min)
   * @returns Tool life in minutes
   */
  calculateTaylorToolLife: function(material, Vc) {
    var C = material.taylor.C;
    var n = material.taylor.n;
    
    // T = (C / Vc)^(1/n)
    if (!Vc || Vc <= 0) { Vc = 1; }
    if (!n || n <= 0) { n = 0.25; }
    var T = Math.pow(C / Vc, 1 / n);
    
    // Uncertainty (+/- 25% typical)
    var uncertainty = T * 0.25;
    
    return {
      T: T,
      T_uncertainty: uncertainty,
      unit: "min"
    };
  },
  
  /**
   * Get tool pocket configuration
   * Reads post properties for the specified tool number
   * 
   * @param toolNum - Tool number (1-24)
   * @returns Tool configuration object
   */

  /**
   * Get tool parameters from Fusion 360
   * These are automatically provided by Fusion and should be used in calculations
   */
  getFusionToolParams: function(tool) {
    return {
      // Dimensions
      diameter: tool.diameter || 0,
      cornerRadius: tool.cornerRadius || 0,
      fluteLength: tool.fluteLength || tool.bodyLength || 0,  // LOC - Length of Cut
      bodyLength: tool.bodyLength || 0,
      overallLength: tool.overallLength || 0,
      shaftDiameter: tool.shaftDiameter || tool.diameter || 0,
      shoulderLength: tool.shoulderLength || 0,
      
      // Geometry
      numberOfFlutes: tool.numberOfFlutes || 4,
      taperAngle: tool.taperAngle || 0,
      tipAngle: tool.tipAngle || 118,  // Default drill point
      
      // Type info
      type: tool.type || 0,
      isMill: tool.isMill || false,
      isDrill: tool.isDrill || false,
      isTurning: tool.isTurning ? tool.isTurning : false,
      
      // Calculated ratios
      aspectRatio: (tool.fluteLength || tool.bodyLength) / (tool.diameter || 1),
      stickoutRatio: (tool.bodyLength || 0) / (tool.diameter || 1)
    };
  },
  
  /**
   * Get cutting parameters from current operation
   */
  getFusionCuttingParams: function(section) {
    var params = {};
    
    // Helper to safely get parameter - MUST return actual value, not function!
    function safeGet(name) {
      try {
        var val = section.getParameter(name);
        // CRITICAL: Fusion may return the getParameter function itself if param doesn't exist!
        // Check that we got an actual value (number, string, boolean), not a function
        if (typeof val === "function") {
          return undefined;
        }
        return val;
      } catch (e) {
        return undefined;
      }
    }
    
    // Try to get operation parameters
    try {
      // Depths - try multiple parameter names
      params.axialDepth = safeGet("operation:axialDepth") || 
                          safeGet("operation:bottomHeight") || 
                          safeGet("operation:depth") || 0;
      params.radialDepth = safeGet("operation:radialDepth") || 
                           safeGet("operation:stepover_custom") || 0;
      params.stepdown = safeGet("operation:stepdown") || 
                        safeGet("operation:maximumStepdown") || params.axialDepth;
      params.stepover = safeGet("operation:stepover") || 
                        safeGet("operation:maximumStepover") || 
                        params.radialDepth;
      
      // Optimal load (for adaptive) - THIS IS THE KEY FOR 3D ADAPTIVE!
      params.optimalLoad = safeGet("operation:optimalLoad") || 
                           safeGet("operation:load") || 
                           safeGet("operation:optimal_load") || 0;
      
      // Helper to check if value is a valid number
      function isValidNum(v) {
        return typeof v === "number" && !isNaN(v) && v > 0;
      }
      
      // Feeds from operation
      params.feedrate = safeGet("operation:tool_feedCutting") || 0;
      params.feedPlunge = safeGet("operation:tool_feedPlunge") || 0;
      params.feedRamp = safeGet("operation:tool_feedRamp") || 0;
      params.feedRetract = safeGet("operation:tool_feedRetract") || 0;
      
      // Speeds
      params.spindleSpeed = safeGet("operation:tool_spindleSpeed") || 0;
      params.surfaceSpeed = safeGet("operation:tool_surfaceSpeed") || 0;
      
      // Strategy info
      params.strategy = safeGet("operation:strategy") || "";
      params.tolerance = safeGet("operation:tolerance") || 0.01;
      params.stockToLeave = safeGet("operation:stockToLeave") || 0;
      params.finishStockToLeave = safeGet("operation:finishStockToLeave") || 0;
      
      // Roughing/Finishing detection
      params.isRoughing = params.stockToLeave > 0 || (params.strategy || "").indexOf("adaptive") >= 0;
      params.isFinishing = params.stockToLeave <= 0 && params.finishStockToLeave <= 0;
      
      // DEBUG: Store what we found
      params._debug = {
        axialDepth: safeGet("operation:axialDepth"),
        stepdown: safeGet("operation:stepdown"),
        maximumStepdown: safeGet("operation:maximumStepdown"),
        radialDepth: safeGet("operation:radialDepth"),
        stepover: safeGet("operation:stepover"),
        maximumStepover: safeGet("operation:maximumStepover"),
        optimalLoad: safeGet("operation:optimalLoad"),
        strategy: safeGet("operation:strategy")
      };
      
    } catch (e) {
      params._error = e.message || "Unknown error";
    }
    
    return params;
  },

  /**
   * Get coolant M-code based on tool pocket setting
   */
  getCoolantCode: function(toolConfig, fusionCoolant) {
    var coolantSetting = toolConfig.coolant || "fusion";
    
    // If set to use Fusion, return null to use Fusion's setting
    if (coolantSetting === "fusion") {
      return null; // Let Fusion handle it
    }
    
    // Map coolant setting to M-codes
    var coolantCodes = {
      "flood": "M8",
      "mist": "M7", 
      "flood_mist": "M7\nM8",
      "thru_spindle": "M88",
      "thru_spindle_hp": "M88",
      "air": "M51",
      "mql": "M7\nM51",
      "vacuum": "M52",
      "off": "M9"
    };
    
    return coolantCodes[coolantSetting] || null;
  },

  /**
   * Get machine configuration from properties
   */

  /**
   * Check if cutting parameters exceed machine power/torque limits
   * Returns adjusted parameters if needed
   */
  applyPowerLimits: function(speed, feedRate, diameter, doc, woc, material, machineConfig) {
    if (!machineConfig) return { speed: speed, feedRate: feedRate, limited: false };
    
    // Estimate cutting power required (simplified Kienzle)
    var kc = 2000; // Default specific cutting force N/mm 
    if (material && material.kc1_1) {
      kc = material.kc1_1;
    }
    
    // MRR in cm /min
    var mrr = (feedRate * doc * woc) / 1000; // mm /min to cm /min
    
    // Power required (kW) = kc * MRR / 60000
    var powerRequired = (kc * mrr * 1000) / 60000000; // kW
    var powerRequiredHP = powerRequired * 1.341;
    
    // Check against machine power
    var powerLimit = machineConfig.power * 0.80; // Use 80% of rated power
    
    if (powerRequiredHP > powerLimit) {
      // Reduce feed to stay within power limit
      var reductionFactor = powerLimit / powerRequiredHP;
      feedRate = feedRate * reductionFactor;
      return {
        speed: speed,
        feedRate: feedRate,
        limited: true,
        reason: "Power limited: " + powerRequiredHP.toFixed(1) + " HP required, " + powerLimit.toFixed(1) + " HP available",
        originalPower: powerRequiredHP,
        limitedPower: powerLimit
      };
    }
    
    // Check torque at low RPM
    var rpm = (speed * 1000) / (Math.PI * diameter);
    var torqueRequired = (powerRequired * 9549) / rpm; // N-m
    var torqueRequiredFtLb = torqueRequired * 0.7376;
    
    var torqueLimit = machineConfig.torque * 0.85;
    
    if (torqueRequiredFtLb > torqueLimit && rpm < 2000) {
      // Reduce feed or increase speed
      var reductionFactor = torqueLimit / torqueRequiredFtLb;
      feedRate = feedRate * reductionFactor;
      return {
        speed: speed,
        feedRate: feedRate,
        limited: true,
        reason: "Torque limited at low RPM: " + torqueRequiredFtLb.toFixed(1) + " ft-lb required",
        originalTorque: torqueRequiredFtLb,
        limitedTorque: torqueLimit
      };
    }
    
    return { speed: speed, feedRate: feedRate, limited: false };
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MACHINE DATABASE — Auto-fill specs from PRISM catalog (verified mfr data)
  // Source: machine-profiles-catalog.ts, 213 machines, extracted 2026-03-06
  // Units: maxRpm, powerHp (continuous), torqueFtLb (peak), taper, rigidity, gear
  // ═══════════════════════════════════════════════════════════════════════════
  machineDatabase: {
    // ── AWEA ──
    "awea_lp_3021": { name:"AWEA LP-3021", maxRpm:6000, powerHp:50, torqueFtLb:627, taper:"cat50", rigidity:"very_heavy", gear:"direct", coolantPsi:300 },
    "awea_af_1250": { name:"AWEA AF-1250", maxRpm:8000, powerHp:30, torqueFtLb:258, taper:"cat50", rigidity:"heavy", gear:"direct", coolantPsi:300 },
    "awea_bm_1200": { name:"AWEA BM-1200", maxRpm:8000, powerHp:30, torqueFtLb:258, taper:"cat50", rigidity:"heavy", gear:"direct", coolantPsi:300 },
    // ── Brother ──
    "brother_speedio_s300x1": { name:"Brother SPEEDIO S300X1", maxRpm:16000, powerHp:7.5, torqueFtLb:18, taper:"bt30", rigidity:"light", gear:"direct", coolantPsi:290 },
    "brother_speedio_s500x1": { name:"Brother SPEEDIO S500X1", maxRpm:16000, powerHp:7.5, torqueFtLb:18, taper:"bt30", rigidity:"light", gear:"direct", coolantPsi:290 },
    "brother_speedio_s700x1": { name:"Brother SPEEDIO S700X1", maxRpm:16000, powerHp:11, torqueFtLb:22, taper:"bt30", rigidity:"light", gear:"direct", coolantPsi:290 },
    "brother_speedio_r450x1": { name:"Brother SPEEDIO R450X1", maxRpm:16000, powerHp:7.5, torqueFtLb:18, taper:"bt30", rigidity:"light", gear:"direct", coolantPsi:290 },
    "brother_speedio_r650x1": { name:"Brother SPEEDIO R650X1", maxRpm:16000, powerHp:11, torqueFtLb:22, taper:"bt30", rigidity:"light", gear:"direct", coolantPsi:290 },
    // ── Chiron ──
    "chiron_fz_08_s": { name:"Chiron FZ 08 S", maxRpm:20000, powerHp:18, torqueFtLb:38, taper:"hsk_a63", rigidity:"medium", gear:"direct", coolantPsi:1000 },
    "chiron_fz_12_s": { name:"Chiron FZ 12 S", maxRpm:20000, powerHp:25, torqueFtLb:63, taper:"hsk_a63", rigidity:"medium", gear:"direct", coolantPsi:1000 },
    "chiron_mill_800": { name:"Chiron MILL 800", maxRpm:20000, powerHp:25, torqueFtLb:63, taper:"hsk_a63", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    "chiron_mill_2000": { name:"Chiron MILL 2000", maxRpm:12000, powerHp:47, torqueFtLb:148, taper:"hsk_a63", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    // ── Citizen ──
    "citizen_cincom_l12_x": { name:"Citizen Cincom L12-X", maxRpm:15000, powerHp:2, torqueFtLb:1, taper:"cat40", rigidity:"light", gear:"direct", coolantPsi:1000 },
    "citizen_cincom_l20_e": { name:"Citizen Cincom L20-E", maxRpm:10000, powerHp:5, torqueFtLb:4, taper:"cat40", rigidity:"light", gear:"direct", coolantPsi:1000 },
    "citizen_cincom_l32_xii": { name:"Citizen Cincom L32-XII", maxRpm:8000, powerHp:7, torqueFtLb:9, taper:"cat40", rigidity:"light", gear:"direct", coolantPsi:1000 },
    "citizen_miyano_bne_51msy": { name:"Citizen Miyano BNE-51MSY", maxRpm:5000, powerHp:15, torqueFtLb:41, taper:"cat40", rigidity:"medium", gear:"direct", coolantPsi:1000 },
    // ── DATRON ──
    "datron_neo": { name:"DATRON neo", maxRpm:10000, powerHp:3, torqueFtLb:2, taper:"cat40", rigidity:"light", gear:"direct", coolantPsi:100 },
    "datron_m8cube": { name:"DATRON M8Cube", maxRpm:10000, powerHp:4, torqueFtLb:3, taper:"cat40", rigidity:"light", gear:"direct", coolantPsi:100 },
    // ── DMG MORI ──
    "dmg_mori_dmu_50": { name:"DMG MORI DMU 50 3rd Gen", maxRpm:15000, powerHp:28, torqueFtLb:96, taper:"hsk_a63", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    "dmg_mori_dmu_65_monoblock": { name:"DMG MORI DMU 65 monoBLOCK", maxRpm:18000, powerHp:34, torqueFtLb:64, taper:"hsk_a63", rigidity:"very_heavy", gear:"direct", coolantPsi:1000 },
    "dmg_mori_dmc_80h": { name:"DMG MORI DMC 80 H linear", maxRpm:12000, powerHp:47, torqueFtLb:224, taper:"hsk_a63", rigidity:"very_heavy", gear:"direct", coolantPsi:1000 },
    "dmg_mori_nlx_2500": { name:"DMG MORI NLX 2500/700", maxRpm:3500, powerHp:25, torqueFtLb:564, taper:"bt40", rigidity:"heavy", gear:"2_speed", coolantPsi:300 },
    "dmg_mori_ctx_beta_800": { name:"DMG MORI CTX beta 800 TC", maxRpm:12000, powerHp:25, torqueFtLb:88, taper:"cat40", rigidity:"very_heavy", gear:"direct", coolantPsi:1000 },
    // ── DN Solutions / Doosan ──
    "dn_solutions_dnm_4500": { name:"DN Solutions DNM 4500", maxRpm:12000, powerHp:25, torqueFtLb:87, taper:"cat40", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    "dn_solutions_dnm_5700": { name:"DN Solutions DNM 5700", maxRpm:12000, powerHp:30, torqueFtLb:52, taper:"cat40", rigidity:"medium", gear:"direct", coolantPsi:290 },
    "dn_solutions_dnm_6700": { name:"DN Solutions DNM 6700", maxRpm:12000, powerHp:35, torqueFtLb:61, taper:"cat40", rigidity:"heavy", gear:"direct", coolantPsi:290 },
    "dn_solutions_dvf_5000": { name:"DN Solutions DVF 5000", maxRpm:12000, powerHp:30, torqueFtLb:52, taper:"cat40", rigidity:"medium", gear:"direct", coolantPsi:290 },
    "dn_solutions_dvf_6500": { name:"DN Solutions DVF 6500", maxRpm:12000, powerHp:40, torqueFtLb:111, taper:"cat40", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    "dn_solutions_nhp_5000": { name:"DN Solutions NHP 5000", maxRpm:12000, powerHp:40, torqueFtLb:148, taper:"cat40", rigidity:"very_heavy", gear:"direct", coolantPsi:1000 },
    "dn_solutions_puma_2100sy": { name:"DN Solutions PUMA 2100SY II", maxRpm:4500, powerHp:25, torqueFtLb:184, taper:"cat40", rigidity:"medium", gear:"2_speed", coolantPsi:300 },
    "dn_solutions_puma_2600sy": { name:"DN Solutions PUMA 2600SY", maxRpm:3500, powerHp:30, torqueFtLb:295, taper:"cat40", rigidity:"heavy", gear:"2_speed", coolantPsi:0 },
    "dn_solutions_puma_3100": { name:"DN Solutions PUMA 3100", maxRpm:2500, powerHp:40, torqueFtLb:443, taper:"cat40", rigidity:"very_heavy", gear:"2_speed", coolantPsi:0 },
    "dn_solutions_lynx_2600": { name:"DN Solutions LYNX 2600", maxRpm:6000, powerHp:20, torqueFtLb:53, taper:"cat40", rigidity:"medium", gear:"direct", coolantPsi:0 },
    "dn_solutions_smx_2600s": { name:"DN Solutions SMX 2600S", maxRpm:10000, powerHp:30, torqueFtLb:74, taper:"cat40", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    // ── Fadal ──
    "fadal_vmc_3016l": { name:"Fadal VMC 3016L", maxRpm:10000, powerHp:15, torqueFtLb:65, taper:"cat40", rigidity:"medium", gear:"direct", coolantPsi:300 },
    "fadal_vmc_4020": { name:"Fadal VMC 4020", maxRpm:10000, powerHp:20, torqueFtLb:88, taper:"cat40", rigidity:"medium", gear:"direct", coolantPsi:300 },
    "fadal_vmc_6030": { name:"Fadal VMC 6030", maxRpm:10000, powerHp:30, torqueFtLb:129, taper:"cat40", rigidity:"heavy", gear:"direct", coolantPsi:300 },
    "fadal_vmc_8030": { name:"Fadal VMC 8030", maxRpm:10000, powerHp:40, torqueFtLb:258, taper:"cat50", rigidity:"heavy", gear:"direct", coolantPsi:300 },
    // ── FANUC ──
    "fanuc_d14mia5": { name:"FANUC Robodrill D14MiA5", maxRpm:24000, powerHp:7.5, torqueFtLb:10, taper:"bt30", rigidity:"light", gear:"direct", coolantPsi:290 },
    "fanuc_d21mia5": { name:"FANUC Robodrill D21MiA5", maxRpm:24000, powerHp:11, torqueFtLb:13, taper:"bt30", rigidity:"light", gear:"direct", coolantPsi:290 },
    "fanuc_d21lia5": { name:"FANUC Robodrill D21LiA5", maxRpm:24000, powerHp:11, torqueFtLb:13, taper:"bt30", rigidity:"light", gear:"direct", coolantPsi:290 },
    // ── Feeler ──
    "feeler_vmp_580": { name:"Feeler VMP-580", maxRpm:12000, powerHp:15, torqueFtLb:52, taper:"bt40", rigidity:"medium", gear:"direct", coolantPsi:300 },
    "feeler_vmp_1100": { name:"Feeler VMP-1100", maxRpm:12000, powerHp:20, torqueFtLb:88, taper:"bt40", rigidity:"heavy", gear:"direct", coolantPsi:300 },
    "feeler_hv_800": { name:"Feeler HV-800", maxRpm:20000, powerHp:30, torqueFtLb:74, taper:"bt40", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    "feeler_u_600": { name:"Feeler U-600", maxRpm:15000, powerHp:30, torqueFtLb:103, taper:"hsk_a63", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    // ── GROB ──
    "grob_g150": { name:"GROB G150", maxRpm:18000, powerHp:35, torqueFtLb:88, taper:"hsk_a63", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    "grob_g350": { name:"GROB G350", maxRpm:16000, powerHp:45, torqueFtLb:133, taper:"hsk_a63", rigidity:"very_heavy", gear:"direct", coolantPsi:1000 },
    "grob_g550": { name:"GROB G550", maxRpm:14000, powerHp:60, torqueFtLb:207, taper:"hsk_a63", rigidity:"very_heavy", gear:"direct", coolantPsi:1000 },
    // ── Haas Mills ──
    "haas_mini_mill": { name:"Haas Mini Mill", maxRpm:6000, powerHp:10, torqueFtLb:27, taper:"cat40", rigidity:"light", gear:"direct", coolantPsi:0 },
    "haas_vf_1": { name:"Haas VF-1", maxRpm:8100, powerHp:30, torqueFtLb:79, taper:"cat40", rigidity:"medium", gear:"direct", coolantPsi:0 },
    "haas_vf_2": { name:"Haas VF-2", maxRpm:8100, powerHp:30, torqueFtLb:79, taper:"cat40", rigidity:"medium", gear:"direct", coolantPsi:0 },
    "haas_vf_2ss": { name:"Haas VF-2SS", maxRpm:12000, powerHp:30, torqueFtLb:52, taper:"cat40", rigidity:"medium", gear:"direct", coolantPsi:0 },
    "haas_vf_3": { name:"Haas VF-3", maxRpm:8100, powerHp:30, torqueFtLb:79, taper:"cat40", rigidity:"medium", gear:"direct", coolantPsi:0 },
    "haas_vf_4": { name:"Haas VF-4", maxRpm:8100, powerHp:30, torqueFtLb:79, taper:"cat40", rigidity:"medium", gear:"direct", coolantPsi:0 },
    "haas_vf_5": { name:"Haas VF-5", maxRpm:8100, powerHp:30, torqueFtLb:79, taper:"cat40", rigidity:"heavy", gear:"direct", coolantPsi:0 },
    "haas_vf_6_50": { name:"Haas VF-6/50", maxRpm:6000, powerHp:30, torqueFtLb:369, taper:"cat50", rigidity:"heavy", gear:"2_speed", coolantPsi:0 },
    "haas_umc_500": { name:"Haas UMC-500", maxRpm:8100, powerHp:30, torqueFtLb:79, taper:"cat40", rigidity:"medium", gear:"direct", coolantPsi:0 },
    "haas_umc_750": { name:"Haas UMC-750", maxRpm:8100, powerHp:30, torqueFtLb:79, taper:"cat40", rigidity:"medium", gear:"direct", coolantPsi:0 },
    "haas_umc_1000": { name:"Haas UMC-1000", maxRpm:8100, powerHp:30, torqueFtLb:79, taper:"cat40", rigidity:"heavy", gear:"direct", coolantPsi:0 },
    "haas_umc_1500ss_duo": { name:"Haas UMC-1500SS-DUO", maxRpm:12000, powerHp:40, torqueFtLb:122, taper:"cat40", rigidity:"very_heavy", gear:"direct", coolantPsi:0 },
    "haas_ec_400": { name:"Haas EC-400", maxRpm:8100, powerHp:30, torqueFtLb:79, taper:"cat40", rigidity:"heavy", gear:"direct", coolantPsi:0 },
    "haas_ec_500": { name:"Haas EC-500", maxRpm:8100, powerHp:30, torqueFtLb:79, taper:"cat40", rigidity:"heavy", gear:"direct", coolantPsi:0 },
    "haas_dt_1": { name:"Haas DT-1", maxRpm:15000, powerHp:15, torqueFtLb:22, taper:"bt30", rigidity:"light", gear:"direct", coolantPsi:0 },
    "haas_dm_1": { name:"Haas DM-1", maxRpm:15000, powerHp:15, torqueFtLb:27, taper:"bt30", rigidity:"light", gear:"direct", coolantPsi:0 },
    "haas_dm_2": { name:"Haas DM-2", maxRpm:15000, powerHp:15, torqueFtLb:27, taper:"bt30", rigidity:"light", gear:"direct", coolantPsi:0 },
    "haas_gr_510": { name:"Haas GR-510", maxRpm:10000, powerHp:30, torqueFtLb:79, taper:"cat40", rigidity:"medium", gear:"direct", coolantPsi:0 },
    "haas_tm_1": { name:"Haas TM-1", maxRpm:4000, powerHp:7.5, torqueFtLb:20, taper:"cat40", rigidity:"light", gear:"direct", coolantPsi:0 },
    // ── Haas Lathes ──
    "haas_st_20": { name:"Haas ST-20", maxRpm:4000, powerHp:20, torqueFtLb:52, taper:"cat40", rigidity:"medium", gear:"2_speed", coolantPsi:0 },
    "haas_st_20y": { name:"Haas ST-20Y", maxRpm:4000, powerHp:20, torqueFtLb:52, taper:"cat40", rigidity:"medium", gear:"2_speed", coolantPsi:0 },
    "haas_st_35": { name:"Haas ST-35", maxRpm:3400, powerHp:30, torqueFtLb:79, taper:"cat40", rigidity:"heavy", gear:"2_speed", coolantPsi:0 },
    // ── Hardinge ──
    "hardinge_conquest_t42": { name:"Hardinge Conquest T42", maxRpm:6000, powerHp:15, torqueFtLb:118, taper:"cat40", rigidity:"light", gear:"2_speed", coolantPsi:300 },
    "hardinge_conquest_t51": { name:"Hardinge Conquest T51", maxRpm:5000, powerHp:20, torqueFtLb:184, taper:"cat40", rigidity:"medium", gear:"2_speed", coolantPsi:300 },
    "hardinge_conquest_t65": { name:"Hardinge Conquest T65", maxRpm:4500, powerHp:25, torqueFtLb:280, taper:"cat40", rigidity:"medium", gear:"2_speed", coolantPsi:300 },
    // ── Heller ──
    "heller_h_2000": { name:"Heller H 2000", maxRpm:12000, powerHp:39, torqueFtLb:109, taper:"hsk_a63", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    "heller_h_4000": { name:"Heller H 4000", maxRpm:10000, powerHp:50, torqueFtLb:184, taper:"hsk_a63", rigidity:"very_heavy", gear:"direct", coolantPsi:1000 },
    "heller_h_6000": { name:"Heller H 6000", maxRpm:8000, powerHp:70, torqueFtLb:369, taper:"hsk_a63", rigidity:"very_heavy", gear:"direct", coolantPsi:1000 },
    "heller_hf_3500": { name:"Heller HF 3500", maxRpm:10000, powerHp:39, torqueFtLb:109, taper:"cat40", rigidity:"heavy", gear:"direct", coolantPsi:300 },
    // ── Hermle ──
    "hermle_c_32_u": { name:"Hermle C 32 U", maxRpm:18000, powerHp:39, torqueFtLb:107, taper:"hsk_a63", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    "hermle_c_42_u": { name:"Hermle C 42 U", maxRpm:18000, powerHp:39, torqueFtLb:148, taper:"hsk_a63", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    "hermle_c_52_u": { name:"Hermle C 52 U", maxRpm:15000, powerHp:50, torqueFtLb:207, taper:"hsk_a63", rigidity:"very_heavy", gear:"direct", coolantPsi:1000 },
    // ── Hurco ──
    "hurco_vm10i": { name:"Hurco VM10i", maxRpm:12000, powerHp:15, torqueFtLb:48, taper:"bt40", rigidity:"light", gear:"direct", coolantPsi:0 },
    "hurco_vm20i": { name:"Hurco VM20i", maxRpm:10000, powerHp:30, torqueFtLb:79, taper:"cat40", rigidity:"medium", gear:"direct", coolantPsi:0 },
    "hurco_vm30i": { name:"Hurco VM30i", maxRpm:10000, powerHp:25, torqueFtLb:105, taper:"cat40", rigidity:"medium", gear:"direct", coolantPsi:0 },
    "hurco_vmx42i": { name:"Hurco VMX42i", maxRpm:12000, powerHp:40, torqueFtLb:70, taper:"cat40", rigidity:"medium", gear:"direct", coolantPsi:300 },
    "hurco_vmx50i": { name:"Hurco VMX50i", maxRpm:12000, powerHp:40, torqueFtLb:70, taper:"cat50", rigidity:"heavy", gear:"direct", coolantPsi:300 },
    // ── Hyundai WIA ──
    "hyundai_wia_kf_4600": { name:"Hyundai WIA KF 4600", maxRpm:12000, powerHp:20, torqueFtLb:70, taper:"bt40", rigidity:"medium", gear:"direct", coolantPsi:300 },
    "hyundai_wia_kf_5600": { name:"Hyundai WIA KF 5600", maxRpm:12000, powerHp:25, torqueFtLb:88, taper:"bt40", rigidity:"heavy", gear:"direct", coolantPsi:300 },
    "hyundai_wia_xf_6300": { name:"Hyundai WIA XF 6300", maxRpm:12000, powerHp:30, torqueFtLb:105, taper:"bt40", rigidity:"very_heavy", gear:"direct", coolantPsi:1000 },
    "hyundai_wia_hs_5000": { name:"Hyundai WIA HS 5000", maxRpm:14000, powerHp:30, torqueFtLb:148, taper:"bt40", rigidity:"very_heavy", gear:"direct", coolantPsi:1000 },
    // ── Kern ──
    "kern_micro_evo": { name:"Kern Micro Evo", maxRpm:50000, powerHp:8, torqueFtLb:4, taper:"hsk_a63", rigidity:"medium", gear:"direct", coolantPsi:1000 },
    "kern_micro_hd": { name:"Kern Micro HD", maxRpm:42000, powerHp:15, torqueFtLb:10, taper:"hsk_a63", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    // ── Kitamura ──
    "kitamura_mycenter_hx400ig": { name:"Kitamura Mycenter HX400iG", maxRpm:12000, powerHp:22, torqueFtLb:74, taper:"bt40", rigidity:"medium", gear:"direct", coolantPsi:1000 },
    "kitamura_mycenter_hx500ig": { name:"Kitamura Mycenter HX500iG", maxRpm:12000, powerHp:30, torqueFtLb:103, taper:"bt40", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    "kitamura_mytrunnion_5g": { name:"Kitamura Mytrunnion-5G", maxRpm:15000, powerHp:22, torqueFtLb:63, taper:"bt40", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    // ── Makino ──
    "makino_d500": { name:"Makino D500", maxRpm:20000, powerHp:35, torqueFtLb:61, taper:"hsk_a63", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    "makino_d800z": { name:"Makino D800Z", maxRpm:12000, powerHp:40, torqueFtLb:207, taper:"hsk_a63", rigidity:"very_heavy", gear:"direct", coolantPsi:1000 },
    "makino_a61nx": { name:"Makino a61nx", maxRpm:14000, powerHp:35, torqueFtLb:88, taper:"hsk_a63", rigidity:"very_heavy", gear:"direct", coolantPsi:1000 },
    "makino_a81nx": { name:"Makino a81nx", maxRpm:10000, powerHp:60, torqueFtLb:423, taper:"hsk_a63", rigidity:"very_heavy", gear:"direct", coolantPsi:1000 },
    "makino_ps95": { name:"Makino PS95", maxRpm:14000, powerHp:30, torqueFtLb:111, taper:"hsk_a63", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    "makino_f5": { name:"Makino F5", maxRpm:20000, powerHp:33, torqueFtLb:71, taper:"hsk_a63", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    "makino_iq500": { name:"Makino iQ500", maxRpm:40000, powerHp:16, torqueFtLb:7, taper:"hsk_a63", rigidity:"medium", gear:"direct", coolantPsi:1000 },
    "makino_t1": { name:"Makino T1", maxRpm:10000, powerHp:107, torqueFtLb:564, taper:"hsk_a63", rigidity:"very_heavy", gear:"direct", coolantPsi:1000 },
    // ── Matsuura ──
    "matsuura_mam72_25v": { name:"Matsuura MAM72-25V", maxRpm:20000, powerHp:18, torqueFtLb:42, taper:"hsk_a63", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    "matsuura_mam72_35v": { name:"Matsuura MAM72-35V", maxRpm:15000, powerHp:25, torqueFtLb:70, taper:"hsk_a63", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    "matsuura_mx_330": { name:"Matsuura MX-330", maxRpm:15000, powerHp:22, torqueFtLb:70, taper:"hsk_a63", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    // ── Mazak ──
    "mazak_integrex_i_200s": { name:"Mazak INTEGREX i-200S", maxRpm:4000, powerHp:35, torqueFtLb:91, taper:"cat40", rigidity:"heavy", gear:"2_speed", coolantPsi:1000 },
    "mazak_integrex_i_400s": { name:"Mazak INTEGREX i-400S", maxRpm:12000, powerHp:40, torqueFtLb:141, taper:"cat40", rigidity:"very_heavy", gear:"direct", coolantPsi:1000 },
    "mazak_variaxis_i_500": { name:"Mazak VARIAXIS i-500", maxRpm:12000, powerHp:33, torqueFtLb:148, taper:"hsk_a63", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    "mazak_variaxis_i_700": { name:"Mazak VARIAXIS i-700", maxRpm:12000, powerHp:40, torqueFtLb:211, taper:"hsk_a63", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    "mazak_vcn_530c": { name:"Mazak VCN-530C", maxRpm:12000, powerHp:30, torqueFtLb:52, taper:"cat40", rigidity:"medium", gear:"direct", coolantPsi:290 },
    "mazak_hcn_5000": { name:"Mazak HCN-5000", maxRpm:14000, powerHp:40, torqueFtLb:223, taper:"hsk_a63", rigidity:"very_heavy", gear:"direct", coolantPsi:435 },
    "mazak_qt_nexus_250": { name:"Mazak QT-NEXUS 250-II MY", maxRpm:4500, powerHp:30, torqueFtLb:77, taper:"cat40", rigidity:"heavy", gear:"2_speed", coolantPsi:0 },
    "mazak_cv5_500": { name:"Mazak CV5-500", maxRpm:12000, powerHp:20, torqueFtLb:88, taper:"hsk_a63", rigidity:"medium", gear:"direct", coolantPsi:1000 },
    "mazak_vce_500": { name:"Mazak VCE-500", maxRpm:10000, powerHp:15, torqueFtLb:48, taper:"bt40", rigidity:"medium", gear:"direct", coolantPsi:0 },
    "mazak_fjv_250": { name:"Mazak FJV-250", maxRpm:6000, powerHp:40, torqueFtLb:310, taper:"cat50", rigidity:"very_heavy", gear:"2_speed", coolantPsi:300 },
    // ── Mikron ──
    "mikron_mill_s_400_u": { name:"Mikron MILL S 400 U", maxRpm:20000, powerHp:24, torqueFtLb:57, taper:"hsk_a63", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    "mikron_mill_s_500_u": { name:"Mikron MILL S 500 U", maxRpm:20000, powerHp:28, torqueFtLb:70, taper:"hsk_a63", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    "mikron_mill_p_500_u": { name:"Mikron MILL P 500 U", maxRpm:20000, powerHp:35, torqueFtLb:88, taper:"hsk_a63", rigidity:"very_heavy", gear:"direct", coolantPsi:1000 },
    // ── Mitsui Seiki ──
    "mitsui_seiki_hu50a": { name:"Mitsui Seiki HU50A", maxRpm:12000, powerHp:30, torqueFtLb:88, taper:"hsk_a63", rigidity:"very_heavy", gear:"direct", coolantPsi:1000 },
    // ── OKK ──
    "okk_vm53r": { name:"OKK VM53R", maxRpm:12000, powerHp:26, torqueFtLb:96, taper:"bt40", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    "okk_hm500s": { name:"OKK HM500S", maxRpm:12000, powerHp:30, torqueFtLb:118, taper:"cat50", rigidity:"very_heavy", gear:"direct", coolantPsi:1000 },
    // ── Okuma ──
    "okuma_mu_5000v": { name:"Okuma MU-5000V", maxRpm:15000, powerHp:30, torqueFtLb:111, taper:"hsk_a63", rigidity:"heavy", gear:"direct", coolantPsi:290 },
    "okuma_mu_6300v": { name:"Okuma MU-6300V", maxRpm:15000, powerHp:40, torqueFtLb:148, taper:"hsk_a63", rigidity:"very_heavy", gear:"direct", coolantPsi:1000 },
    "okuma_genos_m560_v": { name:"Okuma GENOS M560-V", maxRpm:15000, powerHp:30, torqueFtLb:111, taper:"bt40", rigidity:"heavy", gear:"direct", coolantPsi:290 },
    "okuma_mb_5000h": { name:"Okuma MB-5000H", maxRpm:15000, powerHp:30, torqueFtLb:148, taper:"hsk_a63", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    "okuma_multus_b300ii": { name:"Okuma MULTUS B300II", maxRpm:12000, powerHp:30, torqueFtLb:88, taper:"cat40", rigidity:"very_heavy", gear:"direct", coolantPsi:1000 },
    "okuma_lb3000_ex": { name:"Okuma LB3000 EX II MY", maxRpm:5000, powerHp:30, torqueFtLb:330, taper:"cat40", rigidity:"heavy", gear:"2_speed", coolantPsi:300 },
    "okuma_lb4000_ex": { name:"Okuma LB4000 EX II", maxRpm:3500, powerHp:50, torqueFtLb:788, taper:"cat40", rigidity:"heavy", gear:"2_speed", coolantPsi:300 },
    "okuma_genos_l300_my": { name:"Okuma GENOS L300-MY", maxRpm:5000, powerHp:20, torqueFtLb:211, taper:"cat40", rigidity:"medium", gear:"2_speed", coolantPsi:300 },
    // ── Spinner ──
    "spinner_vc_560": { name:"Spinner VC 560", maxRpm:15000, powerHp:22, torqueFtLb:66, taper:"hsk_a63", rigidity:"medium", gear:"direct", coolantPsi:1000 },
    "spinner_vc_850": { name:"Spinner VC 850", maxRpm:12000, powerHp:28, torqueFtLb:103, taper:"hsk_a63", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    "spinner_u_620": { name:"Spinner U 620", maxRpm:18000, powerHp:25, torqueFtLb:63, taper:"hsk_a63", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    // ── Star ──
    "star_sr_10jn": { name:"Star SR-10JN", maxRpm:15000, powerHp:2, torqueFtLb:1, taper:"cat40", rigidity:"light", gear:"direct", coolantPsi:1000 },
    "star_sb_20r": { name:"Star SB-20R Type G", maxRpm:10000, powerHp:5, torqueFtLb:4, taper:"cat40", rigidity:"light", gear:"direct", coolantPsi:1000 },
    "star_sr_38b": { name:"Star SR-38B", maxRpm:6000, powerHp:10, torqueFtLb:16, taper:"cat40", rigidity:"light", gear:"direct", coolantPsi:1000 },
    // ── Toyoda ──
    "toyoda_fh400j": { name:"Toyoda FH400J", maxRpm:15000, powerHp:30, torqueFtLb:88, taper:"bt40", rigidity:"heavy", gear:"direct", coolantPsi:1000 },
    "toyoda_fh550j": { name:"Toyoda FH550J", maxRpm:14000, powerHp:40, torqueFtLb:131, taper:"cat50", rigidity:"very_heavy", gear:"direct", coolantPsi:1000 },
    "toyoda_fv1265": { name:"Toyoda FV1265", maxRpm:12000, powerHp:25, torqueFtLb:88, taper:"bt40", rigidity:"heavy", gear:"direct", coolantPsi:300 },
    // ── YCM ──
    "ycm_fx380a": { name:"YCM FX380A", maxRpm:12000, powerHp:20, torqueFtLb:88, taper:"bt40", rigidity:"medium", gear:"direct", coolantPsi:300 },
    "ycm_nxv1020a": { name:"YCM NXV1020A", maxRpm:12000, powerHp:25, torqueFtLb:119, taper:"bt40", rigidity:"heavy", gear:"direct", coolantPsi:300 },
    // ── Yasda ──
    "yasda_ybm_640v3": { name:"Yasda YBM 640V3", maxRpm:20000, powerHp:15, torqueFtLb:30, taper:"hsk_a63", rigidity:"medium", gear:"direct", coolantPsi:1000 },
    "yasda_ymc_430": { name:"Yasda YMC 430", maxRpm:30000, powerHp:18, torqueFtLb:21, taper:"hsk_a63", rigidity:"medium", gear:"direct", coolantPsi:1000 }
  },

  getMachineConfig: function() {
    // PPG-REAL S13: Auto-fill from machine database when model is selected
    var machineModel = getProperty("prismMachineModel") || "custom";
    var machineSpec = this.machineDatabase[machineModel];

    // Map taper strings to spindle interface IDs
    var taperMap = {
      "big_plus_40": "big_plus_40", "big_plus_50": "big_plus_50",
      "cat40": "cat40", "cat50": "cat50",
      "bt30": "bt30", "bt40": "bt40", "bt50": "bt50",
      "hsk_a63": "hsk_a63", "hsk_a100": "hsk_a100",
      "hsk_e40": "hsk_e40", "hsk_e50": "hsk_e50"
    };

    var spindleInterface, maxRPM, power, torque, rigidity, coolantPressure;

    if (machineSpec) {
      // AUTO-FILL from database — user doesn't need to touch anything
      spindleInterface = taperMap[machineSpec.taper] || machineSpec.taper;
      maxRPM = machineSpec.maxRpm;
      power = machineSpec.powerHp;
      torque = machineSpec.torqueFtLb;
      rigidity = machineSpec.rigidity;
      // Map coolant PSI to existing pressure enum
      coolantPressure = machineSpec.coolantPsi >= 800 ? "tsc_1000" :
                        machineSpec.coolantPsi >= 400 ? "tsc_500" :
                        machineSpec.coolantPsi >= 250 ? "tsc_300" :
                        machineSpec.coolantPsi >= 100 ? "tsc_150" : "flood";
    } else {
      // CUSTOM — read from individual property dropdowns
      spindleInterface = getProperty("prismSpindleInterface") || "big_plus_40";
      maxRPM = parseInt(getProperty("prismSpindleMaxRPM")) || 10000;
      power = parseFloat(getProperty("prismSpindlePower")) || 20;
      torque = parseFloat(getProperty("prismSpindleTorque")) || 100;
      rigidity = getProperty("prismMachineRigidity") || "medium";
      coolantPressure = getProperty("prismCoolantPressure") || "tsc_300";
    }

    var condition = getProperty("prismMachineAge") || "good";
    var workholding = getProperty("prismWorkholding") || "vise";
    var maxFeed = parseInt(getProperty("prismMaxFeedRate")) || 400;
    
    // Get factors
    var spindleFactor = this.spindleInterfaceFactors[spindleInterface] || this.spindleInterfaceFactors["cat40"];
    var rigidityFactor = this.machineRigidityFactors[rigidity] || this.machineRigidityFactors["medium"];
    var conditionFactor = this.machineConditionFactors[condition] || this.machineConditionFactors["good"];
    var coolantFactor = this.coolantPressureFactors[coolantPressure] || this.coolantPressureFactors["flood"];
    var workholdFactor = this.workholdingFactors[workholding] || this.workholdingFactors["vise"];
    
    // Calculate combined rigidity
    var combinedRigidity = spindleFactor.rigidity * rigidityFactor.doc * conditionFactor.rigidity * workholdFactor.rigidity;
    
    return {
      spindleInterface: spindleInterface,
      maxRPM: Math.min(maxRPM, spindleFactor.maxRPM),
      power: power,
      torque: torque,
      maxFeed: maxFeed,
      
      // Combined factors
      rigidity: combinedRigidity,
      speedFactor: spindleFactor.speedFactor * conditionFactor.precision,
      torqueFactor: spindleFactor.torqueFactor,
      feedFactor: rigidityFactor.feed * workholdFactor.rigidity,
      docFactor: rigidityFactor.doc * workholdFactor.rigidity,
      wocFactor: rigidityFactor.woc * workholdFactor.rigidity,
      
      // Coolant
      coolantChipEvac: coolantFactor.chipEvac,
      coolantToolLife: coolantFactor.toolLife,
      coolantDepthLimit: coolantFactor.depthLimit,
      
      // Raw factors for detailed calcs
      spindleFactor: spindleFactor,
      rigidityFactor: rigidityFactor,
      conditionFactor: conditionFactor,
      coolantFactor: coolantFactor,
      workholdFactor: workholdFactor
    };
  },

  // ===========================================================================
  // PRISM v10.8 - DRILLING OPERATION DETECTION & MULTIPLIER CONTROL
  // ===========================================================================
  // These functions determine if an operation is drilling-type and whether
  // to apply the per-tool Speed%/Feed% multipliers based on user settings.
  // ===========================================================================
  
  /**
   * Detect if current operation is a drilling-type operation
   * Considers: cycle type, tool type, operation strategy
   * 
   * @param scope - "all", "canned_only", "drill_tap_tools", "deep_only"
   * @returns true if operation matches the drilling scope
   */
  isDrillingOperation: function(scope) {
    scope = scope || "all";
    
    // Check cycle type if in a cycle
    var isDrillingCycle = false;
    var isDeepDrilling = false;
    if (typeof cycleType !== "undefined" && cycleType) {
      var drillingCycles = [
        "drilling", "counter-boring", "chip-breaking", "deep-drilling",
        "gun-drilling", "tapping", "tapping-with-chip-breaking", "left-tapping",
        "right-tapping", "reaming", "boring", "stop-boring", "fine-boring",
        "back-boring", "manual-boring", "thread-milling"
      ];
      isDrillingCycle = drillingCycles.indexOf(cycleType) >= 0;
      isDeepDrilling = (cycleType === "deep-drilling" || cycleType === "gun-drilling");
    }
    
    // Check tool type
    var isDrillTapTool = false;
    if (typeof tool !== "undefined" && tool) {
      var drillToolTypes = [
        TOOL_DRILL, TOOL_DRILL_CENTER, TOOL_DRILL_SPOT,
        TOOL_DRILL_BLOCK, TOOL_TAP_RIGHT_HAND, TOOL_TAP_LEFT_HAND,
        TOOL_REAMER, TOOL_BORING_BAR, TOOL_COUNTER_BORE,
        TOOL_COUNTER_SINK
      ];
      // Check if tool type matches any drilling tool
      for (var i = 0; i < drillToolTypes.length; i++) {
        if (tool.type === drillToolTypes[i]) {
          isDrillTapTool = true;
          break;
        }
      }
      // Also check by description if type not matched
      if (!isDrillTapTool && tool.description) {
        var desc = tool.description.toLowerCase();
        isDrillTapTool = (desc.indexOf("drill") >= 0 || desc.indexOf("tap") >= 0 ||
                         desc.indexOf("ream") >= 0 || desc.indexOf("bore") >= 0);
      }
    }
    
    // Check operation strategy
    var isDrillingStrategy = false;
    if (typeof currentSection !== "undefined" && currentSection) {
      var strategy = currentSection.strategy || "";
      isDrillingStrategy = (strategy.indexOf("drill") >= 0 || strategy.indexOf("tap") >= 0 ||
                           strategy.indexOf("ream") >= 0 || strategy.indexOf("bore") >= 0);
    }
    
    // Apply scope filtering
    switch (scope) {
      case "all":
        return isDrillingCycle || isDrillTapTool || isDrillingStrategy;
      case "canned_only":
        return isDrillingCycle;
      case "drill_tap_tools":
        return isDrillTapTool;
      case "deep_only":
        return isDeepDrilling;
      default:
        return isDrillingCycle || isDrillTapTool;
    }
  },
  
  /**
   * Determine if Speed%/Feed% multipliers should be applied
   * Checks: global exclusion setting, per-tool setting, operation type
   * 
   * @param toolNum - Tool number (1-24)
   * @returns true if multipliers should be applied, false to use 1.0
   */
  shouldApplyMultipliers: function(toolNum) {
    // Get per-tool setting (priority over global)
    var prefix = "prismT" + toolNum;
    var perToolSetting = getProperty(prefix + "ApplyMultipliersTo") || "milling_only";
    
    // Per-tool "off" means NEVER apply multipliers
    if (perToolSetting === "off") {
      return false;
    }
    
    // Per-tool "all" means ALWAYS apply multipliers
    if (perToolSetting === "all") {
      return true;
    }
    
    // Per-tool "milling_only" - check if this is drilling
    // Also check global exclusion setting
    var globalExclude = getProperty("prismExcludeDrillingFromMultipliers");
    if (globalExclude === undefined) globalExclude = true; // Default ON
    
    if (!globalExclude) {
      // Global says apply to all, but per-tool says milling_only
      // Per-tool takes precedence
    }
    
    // Check if this is a drilling operation
    var scope = getProperty("prismDrillingExclusionScope") || "all";
    var isDrilling = this.isDrillingOperation(scope);
    
    // If milling_only and this is drilling, don't apply multipliers
    if (perToolSetting === "milling_only" && isDrilling) {
      return false;
    }
    
    // Default: apply multipliers
    return true;
  },

  getToolConfig: function(toolNum) {
    var prefix = "prismT" + toolNum;
    
    // Read indexable insert properties
    var isIndexable = getProperty(prefix + "Indexable") || false;
    var insertStyle = getProperty(prefix + "InsertStyle") || "face_mill_45";
    
    // AUTO-DETECT lead angle from Fusion's tool.taperAngle if available
    // For face mills and high-feed mills, taper angle = lead angle
    var leadAngle = getProperty(prefix + "LeadAngle") || "45";
    if (tool && tool.taperAngle > 0 && tool.taperAngle < 90) {
      // Fusion provides taper angle in degrees for face mills
      // Round to nearest standard lead angle
      var fusionTaper = Math.round(tool.taperAngle);
      var standardAngles = [10, 12, 15, 17, 20, 30, 45, 60, 65, 75, 90];
      var closest = standardAngles.reduce(function(prev, curr) {
        return (Math.abs(curr - fusionTaper) < Math.abs(prev - fusionTaper) ? curr : prev);
      });
      leadAngle = closest.toString();
    }
    var insertShape = "S";  // Default - was per-tool property
    var insertMfr = "generic";  // Default - was per-tool property
    var insertGrade = getProperty(prefix + "InsertGrade") || "P20";
    var insertNoseR = getProperty(prefix + "InsertNoseR") || 0.8;
    var insertICdia = 12.7;  // Default - was per-tool property
    
    return {
      type: "auto",  // Auto-detect from Fusion tool type
      flutes: (tool && tool.numberOfFlutes > 0) ? tool.numberOfFlutes : 4,  // From Fusion
      material: getProperty(prefix + "Material") || "carbide",
      coating: getProperty(prefix + "Coating") || "tialn",
      brand: getProperty(prefix + "Brand") || "generic",
      catalogNum: "",  // Removed - was for comments only
      helixAngle: 38,  // Default - was never used in calculations
      holderType: getProperty(prefix + "HolderType") || "er_collet",
      holderBrand: "generic",  // Removed - was for comments only
      stickout: (tool.bodyLength || tool.fluteLength * 1.5 || 0),
      condition: getProperty(prefix + "Condition") || "new",
      // v10.8: Check if multipliers should be applied for this operation
      applyMultipliers: PRISM_PHYSICS.shouldApplyMultipliers(toolNum),
      // Raw multiplier values from properties
      speedMultRaw: (getProperty(prefix + "SpeedPct") || 100) / 100,
      feedMultRaw: (getProperty(prefix + "FeedPct") || 100) / 100,
      // Effective multipliers - 1.0 if drilling and excluded
      speedMult: PRISM_PHYSICS.shouldApplyMultipliers(toolNum) ? 
                 (getProperty(prefix + "SpeedPct") || 100) / 100 : 1.0,
      feedMult: PRISM_PHYSICS.shouldApplyMultipliers(toolNum) ? 
                (getProperty(prefix + "FeedPct") || 100) / 100 : 1.0,
      // Indexable insert properties
      indexable: isIndexable,
      insertStyle: insertStyle,
      leadAngle: leadAngle,
      isHighFeed: (parseInt(leadAngle) <= 20),  // High feed mills have ≤20° lead angle
      insertShape: insertShape,
      insertMfr: insertMfr,
      insertGrade: insertGrade,
      insertNoseR: insertNoseR,
      insertICdia: parseFloat(insertICdia) || 12.7,
      // Coolant strategy
      coolant: getProperty(prefix + "Coolant") || "fusion",
      // NEW v10: Per-tool optimization and geometry
      // v11 Bug 33: Removed duplicate optMode here (was overridden by IIFE at line ~16154)
      cornerRadius: (tool && tool.cornerRadius ? tool.cornerRadius : 0),  // From Fusion tool
      highFeedRadius: 0,  // Use LeadAngle instead for chip thinning
      // NEW v10.1: HSM/HEM Physics Mode
      hsmMode: (function() {
        var strat = getProperty(prefix + "Strategy") || "auto";
        var modes = PRISM_PHYSICS.strategyToModes ? PRISM_PHYSICS.strategyToModes(strat) : {hsmMode: strat};
        return modes.hsmMode || strat;
      })(),
      finishMode: (function() {
        var strat = getProperty(prefix + "Strategy") || "auto";
        var modes = PRISM_PHYSICS.strategyToModes ? PRISM_PHYSICS.strategyToModes(strat) : {finishMode: "auto"};
        return modes.finishMode || "auto";
      })(),
      optMode: (function() {
        var strat = getProperty(prefix + "Strategy") || "auto";
        var modes = PRISM_PHYSICS.strategyToModes ? PRISM_PHYSICS.strategyToModes(strat) : {optMode: "balanced"};
        return modes.optMode || "balanced";
      })(),
      maxChipThinMult: getProperty(prefix + "MaxChipThinMult") || 2.5,
      deflectionLimit: (getProperty(prefix + "DeflectionLimit") || 0.002) * 25.4,  // Convert to mm
      // NEW v10.2: Finishing Optimization (finishMode comes from Strategy above)
      // finishMode: already set from strategyToModes() above - DO NOT OVERWRITE
      targetRa: parseFloat(getProperty(prefix + "TargetRa")) || 32,  // microinches
      toleranceGrade: "IT8",  // Default - rarely changed
      finishNoseR: (tool && tool.cornerRadius > 0) ? tool.cornerRadius : 0,  // From Fusion
      finishMaxRPM: 0,  // Use machine spindle limit
      finishMinFeed: 0,  // Auto-calculate minimum feed
      // v10.5: Per-tool aggressiveness (1-8) - replaces global slider
      aggressiveness: getProperty(prefix + "Aggressiveness") || 5
    };
  },
  
  /**
   * Calculate optimized cutting speed
   * 
   * @param material - Material data object
   * @param toolConfig - Tool configuration from getToolConfig
   * @param strategy - Toolpath strategy string
   * @param optMode - Optimization mode
   * @returns Optimized cutting speed (m/min)
   */
  calculateOptimizedSpeed: function(material, toolConfig, strategy, optMode) {
    // v10: Use per-tool optimization mode if set, otherwise use global
    var effectiveOptMode = optMode;
    if (toolConfig.optMode && toolConfig.optMode !== "global") {
      effectiveOptMode = toolConfig.optMode;
      // Map aggressive to max_mrr for consistency
      if (effectiveOptMode === "aggressive") { effectiveOptMode = "max_mrr"; }
    }
    
    // Get base speed for tool material with robust fallbacks
    // v11 Bug 31: Use 60 m/min conservative default (was 100 — dangerous for S/H groups)
    var baseSpeed = 60;
    var toolMat = toolConfig.material || "carbide";
    
    try {
      if (material && material.speeds && material.speeds[toolMat] && material.speeds[toolMat].rec) {
        baseSpeed = material.speeds[toolMat].rec;
      } else if (material && material.speeds && material.speeds.carbide && material.speeds.carbide.rec) {
        baseSpeed = material.speeds.carbide.rec;
      } else {
        // Fallback to group default
        var group = (material && material.group) ? material.group : "P";
        if (PRISM_GROUP_DEFAULTS && PRISM_GROUP_DEFAULTS[group] && 
            PRISM_GROUP_DEFAULTS[group].speeds && PRISM_GROUP_DEFAULTS[group].speeds.carbide) {
          baseSpeed = PRISM_GROUP_DEFAULTS[group].speeds.carbide.rec || 100;
        }
      }
    } catch (e) {
      // v11 Bug 31 fix: Material-aware fallback instead of blind 100 m/min.
      // 100 m/min is safe for steel (P) but dangerous for Ti/Inconel (S group: 30-60 m/min).
      var _group = (material && material.group) ? material.group : "P";
      var _safeDefaults = { P: 100, M: 80, K: 120, N: 200, S: 40, H: 60 };
      baseSpeed = _safeDefaults[_group] || 60; // Conservative 60 m/min if unknown
      warning("PRISM: Using conservative speed fallback (" + baseSpeed + " m/min) for group " + _group);
    }
    
    // Apply tool material factor
    var toolFactor = (this.toolMaterialFactors && this.toolMaterialFactors[toolMat]) ? this.toolMaterialFactors[toolMat] : 1.0;
    var speed = baseSpeed * toolFactor;
    
    // Apply coating factor
    var coating = toolConfig.coating || "tialn";
    var coatingFactor = (this.coatingFactors && this.coatingFactors[coating]) ? this.coatingFactors[coating] : 1.0;
    speed = speed * coatingFactor;
    
    // Apply brand factor
    var brandFactor = this.brandFactors[toolConfig.brand] || 1.0;
    speed = speed * brandFactor;
    
    // Apply condition factor
    var conditionFactor = this.conditionFactors[toolConfig.condition] || 1.0;
    speed = speed * conditionFactor;
    
    // Apply holder factor — TIR (runout) limits achievable speed
    // Higher TIR = imbalance force ∝ RPM² = lower safe speed
    // Shrink fit (TIR=0.0001") → factor 0.99, drill chuck (TIR=0.001") → factor 0.90
    var holderData = this.holderTIRFactors[toolConfig.holderType] || { tir: 0.0005, stiffness: 0.85 };
    var tirFactor = Math.max(0.85, Math.min(1.0, 1.0 - (holderData.tir * 100)));
    speed = speed * tirFactor;
    
    // Apply optimization mode (using per-tool or global setting)
    var optFactor = this.optimizationFactors[effectiveOptMode] || { speed: 1.0 };
    speed = speed * optFactor.speed;
    
    // Apply strategy factor
    var stratNorm = strategy.toLowerCase().replace(/[^a-z0-9]/g, "");
    var stratFactor = this.strategyFactors[stratNorm] || { radialMult: 1.0 };
    speed = speed * stratFactor.radialMult;
    
    // Apply user multiplier (v10.9: runtime check for drilling exclusion)
    var effectiveSpeedMult = toolConfig.speedMult;
    if (this.isDrillingOperation("all") && getProperty("prismExcludeDrillingFromMultipliers") !== false) {
      effectiveSpeedMult = 1.0;  // Bypass speed multiplier for drilling
    }
    speed = speed * effectiveSpeedMult;

    // PPG-HARDEN: HEM/Adaptive engagement speed boost
    // Physics: at low radial engagement, each tooth spends most of its rotation
    // cooling in air. Less thermal load = higher sustainable SFM.
    // At 6% WOC, effective thermal load is ~25% of full slot → can run 2-2.5x faster.
    // Formula: speedBoost = 1 / (ae/D)^0.3 clamped to [1.0, 2.5]
    // Calibrated against HSM Advisor/GWizard for HEM in tool steels.
    var hemSpeedBoost = 1.0;
    var _d = toolConfig._diameter || 12.7; // fallback 12.7mm (0.5")
    var aeRatio = (toolConfig.radialDOC && _d > 0) ? (toolConfig.radialDOC / _d) : 1.0;
    if (aeRatio > 0 && aeRatio < 0.40 && (stratNorm.indexOf("adaptive") >= 0 || stratNorm.indexOf("hem") >= 0 || toolConfig.hsmMode === "hem")) {
      // Only boost for adaptive/HEM strategies with low radial engagement
      hemSpeedBoost = Math.min(2.5, Math.max(1.0, 1.0 / Math.pow(aeRatio, 0.35)));
      speed = speed * hemSpeedBoost;
    }

    // Clamp to material limits — widen for HEM (low engagement = lower risk)
    var minSpeed = baseSpeed * 0.5;
    var maxSpeed = baseSpeed * 1.5 * Math.max(1.0, hemSpeedBoost);
    try {
      if (material && material.speeds && material.speeds[toolMat]) {
        minSpeed = material.speeds[toolMat].min || minSpeed;
        maxSpeed = material.speeds[toolMat].max || maxSpeed;
      }
    } catch (e) { /* use defaults */ }
    speed = Math.max(minSpeed, Math.min(maxSpeed, speed));
    
    // Apply machine speed factor
    if (toolConfig.machineConfig && toolConfig.machineConfig.speedFactor) {
      speed = speed * toolConfig.machineConfig.speedFactor;
    }
    
    return {
      Vc: speed,
      Vc_uncertainty: speed * 0.10,
      unit: "m/min",
      factors: {
        base: baseSpeed,
        tool: toolFactor,
        coating: coatingFactor,
        brand: brandFactor,
        condition: conditionFactor,
        holder: tirFactor,
        opt: optFactor.speed,
        strategy: stratFactor.radialMult,
        user: effectiveSpeedMult
      }
    };
  },
  
  /**
   * Calculate optimized feed rate
   * 
   * @param material - Material data object
   * @param toolConfig - Tool configuration
   * @param diameter - Tool diameter (mm)
   * @param rpm - Spindle speed
   * @param strategy - Toolpath strategy
   * @param optMode - Optimization mode
   * @returns Optimized feed calculation
   */
  calculateOptimizedFeed: function(material, toolConfig, diameter, rpm, strategy, optMode) {
    // ==========================================================================
    // PRISM v10 FEED CALCULATION - MULTIPLIER CHAIN DOCUMENTATION
    // ==========================================================================
    // Feed = baseFz * coating * condition * brand * holder * opt * strategy
    //        * leadAngle * highFeedDOC * bullnoseChipThin * userMult
    //
    // Each factor is documented below with typical ranges.
    // ==========================================================================
    
    // v10: Use per-tool optimization mode if set, otherwise use global
    var effectiveOptMode = optMode;
    if (toolConfig.optMode && toolConfig.optMode !== "global") {
      effectiveOptMode = toolConfig.optMode;
      if (effectiveOptMode === "aggressive") { effectiveOptMode = "max_mrr"; }
    }
    
    // Base chip load by material group and tool type (0.005 - 0.03 mm/tooth base)
    var baseFz = this.getBaseChipLoad(material.group, toolConfig.type, diameter);
    
    // Apply factors - each documented with typical range
    var coatingFactor = this.coatingFactors[toolConfig.coating] || 1.0;     // 0.8 - 1.3
    var conditionFactor = this.conditionFactors[toolConfig.condition] || 1.0; // 0.75 - 1.0
    var brandFactor = (this.brandFactors[toolConfig.brand] || 1.0) * 0.5 + 0.5; // 0.85 - 1.15
    
    // Holder stiffness affects feed (0.85 - 1.0)
    var holderData = this.holderTIRFactors[toolConfig.holderType] || { stiffness: 0.85 };
    var holderFactor = 0.85 + (holderData.stiffness * 0.15);
    
    // Optimization mode (0.7 - 1.3)
    var optFactor = this.optimizationFactors[effectiveOptMode] || { feed: 1.0 };
    
    // ==========================================================================
    // AGGRESSIVENESS LEVEL FACTOR - v10.5: NOW PER-TOOL!
    // Level 1 = 0.7 (conservative), Level 5 = 1.0 (baseline), Level 8 = 1.3 (maximum)
    // ==========================================================================
    var aggressivenessLevel = toolConfig.aggressiveness || 5;  // From per-tool property
    // Linear scale: level 1 = 0.7, level 5 = 1.0, level 8 = 1.3
    var aggressivenessFactor = 0.7 + (aggressivenessLevel - 1) * (0.6 / 7);
    
    // Strategy factor (0.5 - 1.5)
    var stratNorm = strategy.toLowerCase().replace(/[^a-z0-9]/g, "");
    var stratFactor = this.strategyFactors[stratNorm] || { feedMult: 1.0 };
    
    // ==========================================================================
    // LEAD ANGLE CHIP THINNING - CRITICAL FOR HIGH FEED MILLS!
    // 10 deg lead = 5.76x feed increase, 17 deg = 3.42x
    // Applied to ANY tool with non-90° lead angle (face mills, high feed mills, etc.)
    // ==========================================================================
    var leadAngleFeedMult = 1.0;
    // Apply lead angle chip thinning if:
    // 1. Tool is marked indexable AND has lead angle, OR
    // 2. Tool is a high feed mill (≤20° lead), OR  
    // 3. Lead angle was auto-detected from Fusion (not default 45°) and tool is face mill type
    var shouldApplyLeadAngle = (
      (toolConfig.indexable && toolConfig.leadAngle) ||
      (toolConfig.isHighFeed) ||
      (toolConfig.leadAngle && toolConfig.leadAngle !== "45" && toolConfig.leadAngle !== "90")
    );
    if (shouldApplyLeadAngle && toolConfig.leadAngle) {
      var leadData = this.leadAngleData[toolConfig.leadAngle];
      if (leadData && leadData.feedMult) {
        leadAngleFeedMult = leadData.feedMult;
      }
    }
    
    // ==========================================================================
    // HIGH FEED EFFECTIVE RADIUS - Per-tool property for precise chip thinning
    // If user sets highFeedRadius, use it for more accurate calculation
    // ==========================================================================
    var highFeedDOCFactor = 1.0;
    if (toolConfig.highFeedRadius > 0 && toolConfig.axialDOC) {
      // High feed mills: feed increases as DOC decreases relative to effective radius
      // Formula: feedMult = 1 / sin(acos(1 - DOC/R))
      var R = toolConfig.highFeedRadius;
      var doc = toolConfig.axialDOC;
      if (doc < R * 2) {
        var ratio = 1 - (doc / R);
        if (ratio > -1 && ratio < 1) {
          var angle = Math.acos(ratio);
          var sinAngle = Math.sin(angle);
          if (sinAngle > 0.1) {
            highFeedDOCFactor = 1 / sinAngle;
            highFeedDOCFactor = Math.min(highFeedDOCFactor, 6.0);  // Cap at 6x
          }
        }
      }
    }
    
    // ==========================================================================
    // BULLNOSE/BALL CORNER RADIUS CHIP THINNING
    // At shallow DOC, effective chip thickness is reduced, so feed can increase
    // ==========================================================================
    var bullnoseChipThinFactor = 1.0;
    if (toolConfig.cornerRadius > 0 && toolConfig.axialDOC) {
      var cr = toolConfig.cornerRadius;
      var doc = toolConfig.axialDOC;
      // If DOC < corner radius, chip thinning occurs
      if (doc < cr) {
        // Geometric formula: effective_fz = fz * sin(acos(1 - doc/cr))
        var ratio = 1 - (doc / cr);
        if (ratio > -1 && ratio < 1) {
          var angle = Math.acos(ratio);
          var sinAngle = Math.sin(angle);
          if (sinAngle > 0.1) {
            bullnoseChipThinFactor = 1 / sinAngle;  // Compensate for thin chip
            bullnoseChipThinFactor = Math.min(bullnoseChipThinFactor, 3.0);  // Cap at 3x
          }
        }
      }
    }
    
    // ==========================================================================
    // HSM/HEM PHYSICS-BASED FEED OPTIMIZATION (v10.1)
    // Uses actual WOC/DOC from Fusion, stickout, machine config
    // ==========================================================================
    var hsmHemMult = 1.0;
    var hsmHemResult = null;
    
    if (toolConfig.hsmMode && toolConfig.hsmMode !== "off") {
      // Get engagement from Fusion parameters (set in toolConfig from currentSection)
      var ae = toolConfig.radialDOC || (diameter * 0.15);  // Radial DOC (WOC)
      var ap = toolConfig.axialDOC || diameter;             // Axial DOC
      var stickout = toolConfig.stickout || (diameter * 3);  // Already in mm from calculateAll
      
      hsmHemResult = this.calcHSMHEMFeed(
        toolConfig,
        material,
        diameter,
        rpm,
        ae,
        ap,
        stickout,
        toolConfig.machineConfig,
        strategy
      );
      
      if (hsmHemResult && hsmHemResult.mode !== "off") {
        // Apply the combined HSM/HEM multiplier
        // This REPLACES standard chip thinning since it's more comprehensive
        hsmHemMult = hsmHemResult.finalMult;
      }
    }
    
    // Determine if we should use HSM/HEM calc or standard calc
    var useHSMHEM = (hsmHemResult && hsmHemResult.mode !== "off");
    
    // ==========================================================================
    // CALCULATE FINAL CHIP LOAD (fz) - Apply all factors in order
    // ==========================================================================
    var fz = baseFz;
    fz = fz * coatingFactor;        // Tool coating adjustment
    fz = fz * conditionFactor;      // Tool wear adjustment
    fz = fz * brandFactor;          // Tool quality adjustment
    fz = fz * holderFactor;         // Holder rigidity adjustment
    fz = fz * optFactor.feed;       // Optimization mode (conservative/aggressive)
    fz = fz * aggressivenessFactor; // User aggressiveness slider (1-8) → 0.7 to 1.3
    fz = fz * stratFactor.feedMult; // Toolpath strategy adjustment
    fz = fz * leadAngleFeedMult;    // Lead angle chip thinning (HIGH FEED: 3.4-5.76x!)
    fz = fz * highFeedDOCFactor;    // High feed DOC-based adjustment
    
    // HSM/HEM replaces bullnose chip thinning when active (more comprehensive)
    if (useHSMHEM) {
      fz = fz * hsmHemMult;           // HSM/HEM physics-based (includes chip thinning + limits)
    } else {
      fz = fz * bullnoseChipThinFactor; // Standard bullnose compensation only
    }
    
    // v10.9: Runtime check for drilling exclusion on feed multiplier
    var effectiveFeedMult = toolConfig.feedMult;
    if (this.isDrillingOperation("all") && getProperty("prismExcludeDrillingFromMultipliers") !== false) {
      effectiveFeedMult = 1.0;  // Bypass feed multiplier for drilling
    }
    fz = fz * effectiveFeedMult;  // User manual override (last!)
    
    // Calculate feed rate
    var flutes = (typeof toolConfig.flutes === "number" && toolConfig.flutes > 0) ? toolConfig.flutes : 4;
    var feedRate = fz * flutes * rpm;
    
    // Adjust for actual DOC/WOC if available from Fusion
    if (toolConfig.axialDOC && toolConfig.radialDOC) {
      var engagementRatio = (toolConfig.radialDOC / diameter);
      // Reduce feed at high engagement (>50% WOC)
      if (engagementRatio > 0.5) {
        var engagementFactor = 0.5 / engagementRatio;
        engagementFactor = Math.max(engagementFactor, 0.7); // Don't reduce more than 30%
        fz = fz * engagementFactor;
        feedRate = fz * flutes * rpm;
      }
      // Reduce feed for deep axial cuts (>1.5xD)
      var axialRatio = toolConfig.axialDOC / diameter;
      if (axialRatio > 1.5) {
        var axialFactor = 1.5 / axialRatio;
        axialFactor = Math.max(axialFactor, 0.6);
        fz = fz * axialFactor;
        feedRate = fz * flutes * rpm;
      }
    }
    
    // Apply machine feed factor
    if (toolConfig.machineConfig && toolConfig.machineConfig.feedFactor) {
      feedRate = feedRate * toolConfig.machineConfig.feedFactor;
    }
    
    return {
      fz: fz,
      feedRate: feedRate,
      feedRate_uncertainty: feedRate * 0.12,
      unit: "mm/min",
      factors: {
        baseFz: baseFz,
        coating: coatingFactor,
        condition: conditionFactor,
        brand: brandFactor,
        holder: holderFactor,
        opt: optFactor.feed,
        strategy: stratFactor.feedMult,
        leadAngle: leadAngleFeedMult,
        highFeedDOC: highFeedDOCFactor,
        hsmHem: hsmHemMult,
        user: effectiveFeedMult
      },
      // HSM/HEM detailed results for G-code comments
      hsmHem: hsmHemResult
    };
  },
  
  /**
   * Get base chip load by material group and tool type
   */
  getBaseChipLoad: function(group, toolType, diameter) {
    // Base chip loads by ISO group (mm/tooth per mm diameter)
    var groupChipLoads = {
      "P": 0.015,  // Steel
      "M": 0.010,  // Stainless
      "K": 0.018,  // Cast iron
      "N": 0.030,  // Aluminum
      "S": 0.008,  // Superalloys
      "H": 0.005,  // Hardened
      "X": 0.012   // Specialty
    };
    
    var baseFzPerMm = groupChipLoads[group] || 0.012;
    
    // Scale by diameter (non-linear)
    var fz = baseFzPerMm * Math.pow(diameter, 0.8);
    
    // Adjust by tool type
    var typeFactors = {
      "flat_endmill": 1.0,
      "ball_endmill": 0.7,
      "bull_endmill": 0.85,
      "chamfer_mill": 0.6,
      "face_mill": 1.2,
      "shell_mill": 1.3,
      "rougher": 0.9,
      "high_feed": 1.5,
      "thread_mill": 0.5,
      "drill": 0.8,
      "spot_drill": 0.5,
      "center_drill": 0.4,
      "reamer": 0.3,
      "boring": 0.6,
      "engraving": 0.3
    };
    
    var typeFactor = typeFactors[toolType] || 1.0;
    
    return fz * typeFactor;
  },
  
  /**
   * Get recommended coolant strategy for material
   */
  getRecommendedCoolant: function(material, toolConfig) {
    var coolant = material.coolant;
    
    // Override for specific conditions
    if (material.group === "S" || coolant === "flood_hp") {
      return { type: "tsc", pressure: "high", code: "M88" };
    }
    if (material.group === "H" || coolant === "dry" || coolant === "air") {
      return { type: "air", pressure: "standard", code: "M87" };
    }
    if (material.group === "N" && material.name && material.name.indexOf("Plastic") >= 0) {
      return { type: "air", pressure: "low", code: "M87" };
    }
    if (coolant === "mist" || coolant === "mql") {
      return { type: "mist", pressure: "standard", code: "M07" };
    }
    if (coolant === "vacuum") {
      return { type: "vacuum", pressure: "high", code: "M57" };
    }
    
    // Default to flood
    return { type: "flood", pressure: "standard", code: "M08" };
  },
  
  /**
   * Convert cutting speed to RPM
   */
  speedToRPM: function(Vc, diameter) {
    // RPM = (Vc * 1000) / (PI * d)
    if (!diameter || diameter <= 0) { return 0; }
    if (!Vc || Vc <= 0) { return 0; }
    return (Vc * 1000) / (Math.PI * diameter);
  },
  
  /**
   * Convert RPM to cutting speed
   */
  rpmToSpeed: function(rpm, diameter) {
    // Vc = (PI * d * RPM) / 1000
    return (Math.PI * diameter * rpm) / 1000;
  },
  
  /**
   * Convert m/min to SFM
   */
  mToSFM: function(mPerMin) {
    return mPerMin * 3.28084;
  },
  
  /**
   * Convert SFM to m/min
   */
  sfmToM: function(sfm) {
    return sfm / 3.28084;
  },
  
  /**
   * Master calculation function
   * Returns complete cutting parameters
   */
  
  /**
   * Calculate optimized speed/feed for indexable insert tools
   * @param {Object} material - Material data from PRISM_MATERIALS
   * @param {Object} toolConfig - Tool configuration including insert params
   * @param {number} diameter - Tool diameter in mm
   * @param {string} strategy - Machining strategy
   * @param {string} optMode - Optimization mode
   * @returns {Object} Calculated speed, feed, and recommendations
   */
  calculateIndexable: function(material, toolConfig, diameter, strategy, optMode) {
    // Use Fusion's flute count if available and not overridden
    var effectiveFlutes = toolConfig.flutes;
    if (toolConfig.flutes === "auto" || !toolConfig.flutes) {
      if (toolConfig.fusionFlutes && toolConfig.fusionFlutes > 0) {
        effectiveFlutes = toolConfig.fusionFlutes;
      } else if (diameter <= 50) effectiveFlutes = 3;
      else if (diameter <= 80) effectiveFlutes = 4;
      else if (diameter <= 125) effectiveFlutes = 5;
      else effectiveFlutes = 6;
    }
    effectiveFlutes = parseInt(effectiveFlutes) || 4;
    
    // Factor in aspect ratio (LOC/D) for speed reduction on long tools
    var aspectFactor = 1.0;
    if (toolConfig.aspectRatio && toolConfig.aspectRatio > 4) {
      aspectFactor = Math.max(4 / toolConfig.aspectRatio, 0.6);
    }
    
    // Adjust for roughing vs finishing based on Fusion operation
    var roughFinishFactor = { speed: 1.0, feed: 1.0 };
    if (toolConfig.isFinishing) {
      roughFinishFactor = { speed: 1.10, feed: 0.80 };
    } else if (toolConfig.isRoughing) {
      roughFinishFactor = { speed: 0.90, feed: 1.15 };
    }

    // Get insert style base data
    var styleData = this.insertStyleData[toolConfig.insertStyle] || this.insertStyleData["face_mill_45"];
    
    // Get material base speed from material database
    var matBaseVc = 150; // Default m/min for steel
    if (material && material.speeds && material.speeds.carbide) {
      matBaseVc = material.speeds.carbide.rec || 150;
    }
    
    // Get grade factors
    var gradeData = this.insertGradeData[toolConfig.insertGrade] || { speed: 1.0, feed: 1.0, tough: 1.0 };
    
    // Get lead angle data
    var leadData = this.leadAngleData[toolConfig.leadAngle] || { chipThin: 1.0, feedMult: 1.0 };
    
    // Get nose radius data — supports exact match or linear interpolation for user-entered values
    var noseR = parseFloat(toolConfig.insertNoseR) || 0.8;
    var noseData = this.noseRadiusData[String(noseR)];
    if (!noseData) {
      // Interpolate feedFactor/feedMax from known data points for arbitrary user input
      var knownRadii = [0.2, 0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 3.2, 4.0];
      var knownFactors = [0.40, 0.55, 0.75, 0.88, 1.00, 1.10, 1.20, 1.35, 1.50];
      var knownFeedMax = [0.10, 0.20, 0.40, 0.55, 0.70, 0.85, 1.00, 1.25, 1.50];
      var feedFactor = 0.75;
      var feedMax = 0.40;
      if (noseR <= knownRadii[0]) {
        feedFactor = knownFactors[0]; feedMax = knownFeedMax[0];
      } else if (noseR >= knownRadii[knownRadii.length - 1]) {
        feedFactor = knownFactors[knownFactors.length - 1]; feedMax = knownFeedMax[knownFeedMax.length - 1];
      } else {
        for (var ni = 0; ni < knownRadii.length - 1; ni++) {
          if (noseR >= knownRadii[ni] && noseR <= knownRadii[ni + 1]) {
            var t = (noseR - knownRadii[ni]) / (knownRadii[ni + 1] - knownRadii[ni]);
            feedFactor = knownFactors[ni] + t * (knownFactors[ni + 1] - knownFactors[ni]);
            feedMax = knownFeedMax[ni] + t * (knownFeedMax[ni + 1] - knownFeedMax[ni]);
            break;
          }
        }
      }
      noseData = { feedMax: feedMax, feedFactor: feedFactor, finishRa: noseR * 2 };
    }
    
    // Calculate cutting speed
    // Base x material factor x grade factor x optimization factor
    var optFactor = this.optimizationFactors[optMode] || { speed: 1.0, feed: 1.0 };
    
    var Vc = matBaseVc * gradeData.speed * optFactor.speed;
    
    // Apply user speed multiplier (v10.9: runtime check for drilling exclusion)
    var effectiveSpeedMultIdx = toolConfig.speedMult;
    if (this.isDrillingOperation("all") && getProperty("prismExcludeDrillingFromMultipliers") !== false) {
      effectiveSpeedMultIdx = 1.0;  // Bypass speed multiplier for drilling
    }
    Vc = Vc * effectiveSpeedMultIdx;
    
    // Calculate RPM
    // Validate diameter
    if (!diameter || diameter <= 0) {
      return { valid: false, error: "Invalid tool diameter" };
    }
    
    var rpm = (Vc * 1000) / (Math.PI * diameter);
    rpm = Math.round(rpm);
    
    // Calculate feed per tooth
    // Start with style base, apply factors
    var baseFpt = styleData.baseFpt;
    
    // Apply grade feed factor
    baseFpt = baseFpt * gradeData.feed;
    
    // Apply nose radius factor
    baseFpt = baseFpt * noseData.feedFactor;
    
    // Apply lead angle feed multiplier (chip thinning compensation)
    // For high-feed mills, we CAN increase feed due to thin chip
    var fpt = baseFpt * leadData.feedMult;
    
    // Cap at nose radius limit
    fpt = Math.min(fpt, noseData.feedMax);
    
    // Apply optimization and user factors (v10.9: runtime check for drilling exclusion)
    var effectiveFeedMultIdx = toolConfig.feedMult;
    if (this.isDrillingOperation("all") && getProperty("prismExcludeDrillingFromMultipliers") !== false) {
      effectiveFeedMultIdx = 1.0;  // Bypass feed multiplier for drilling
    }
    fpt = fpt * optFactor.feed * effectiveFeedMultIdx;
    
    // Get effective flute count
    var effectiveFlutes = toolConfig.flutes;
    if (effectiveFlutes === "auto" || !effectiveFlutes) {
      // Estimate based on diameter
      if (diameter <= 50) effectiveFlutes = 3;
      else if (diameter <= 80) effectiveFlutes = 4;
      else if (diameter <= 125) effectiveFlutes = 5;
      else effectiveFlutes = 6;
    }
    effectiveFlutes = parseInt(effectiveFlutes) || 4;
    
    // Calculate table feed
    var feedRate = fpt * effectiveFlutes * rpm;
    
    // Generate recommendations
    var suggestions = [];
    var warnings = [];
    
    // Check for high-feed specific recommendations
    if (toolConfig.insertStyle === "high_feed") {
      if (toolConfig.leadAngle !== "17" && toolConfig.leadAngle !== "12" && toolConfig.leadAngle !== "10") {
        suggestions.push("High-feed mills typically use 10-17 deg lead angle");
      }
      if (parseFloat(toolConfig.insertNoseR) < 1.2) {
        suggestions.push("High-feed mills work best with 1.2mm+ nose radius");
      }
    }
    
    // Check grade vs material compatibility
    var gradePrefix = toolConfig.insertGrade.charAt(0);
    if (material && material.group) {
      if (material.group === "M" && gradePrefix !== "M" && !toolConfig.insertGrade.includes("SS") && !toolConfig.insertGrade.includes("125")) {
        warnings.push("Consider M-grade or stainless-specific insert for this material");
      }
      if (material.group === "S" && gradeData.speed > 0.5) {
        warnings.push("Superalloy - consider reducing speed 30-50%");
      }
    }
    
    return {
      valid: true,
      isIndexable: true,
      speed: {
        Vc: Vc,
        rpm: rpm,
        unit: "m/min"
      },
      feed: {
        fz: fpt,
        feedRate: feedRate,
        unit: "mm/min"
      },
      params: {
        grade: toolConfig.insertGrade,
        gradeDesc: gradeData.desc || "",
        leadAngle: toolConfig.leadAngle,
        chipThinFactor: leadData.chipThin,
        noseR: toolConfig.insertNoseR,
        effectiveFlutes: effectiveFlutes
      },
      limits: {
        maxFpt: noseData.feedMax,
        maxDoc: styleData.maxDoc
      },
      suggestions: suggestions,
      warnings: warnings
    };
  },

  calculateAll: function(materialId, toolNum, strategy, optMode, diameter, programmedRPM, programmedFeed, fusionTool, fusionSection) {
    // Property prefix for this tool
    var prefix = "prismT" + toolNum;
    
    // Get machine configuration
    var machineConfig = this.getMachineConfig();
    
    // Get tool configuration first
    var toolConfig = this.getToolConfig(toolNum);
    toolConfig.machineConfig = machineConfig;
    
    // CRITICAL: Override hsmMode based on ACTUAL operation strategy
    // getToolConfig uses tool pocket setting, but we want operation strategy
    var hsmModeBeforeOverride = toolConfig.hsmMode;
    if (strategy && (toolConfig.hsmMode === "auto" || toolConfig.hsmMode === "off")) {
      var opModes = this.strategyToModes(strategy);
      if (opModes.hsmMode && opModes.hsmMode !== "off" && opModes.hsmMode !== "auto") {
        toolConfig.hsmMode = opModes.hsmMode;
        toolConfig.finishMode = opModes.finishMode;
        toolConfig.optMode = opModes.optMode;
      }
    }
    // Store override info for debug
    toolConfig.hsmModeOverrideDebug = {
      before: hsmModeBeforeOverride,
      after: toolConfig.hsmMode,
      strategy: strategy
    };
    
    // Unit conversion factor: PRISM works internally in mm
    // Fusion provides dimensions in DOCUMENT units
    var toMM = (unit == IN) ? 25.4 : 1.0;
    
    // Get Fusion tool parameters if available
    if (fusionTool) {
      var fusionParams = this.getFusionToolParams(fusionTool);
      // Use Fusion's flute count if we don't have an override
      if (!toolConfig.flutes || toolConfig.flutes === 4) {
        if (fusionParams.numberOfFlutes > 0) {
          toolConfig.flutes = fusionParams.numberOfFlutes;
        }
      }
      // Store geometry for calculations - CONVERT TO MM!
      toolConfig.fluteLength = (fusionParams.fluteLength || 0) * toMM;
      toolConfig.cornerRadius = (fusionParams.cornerRadius || 0) * toMM;
      toolConfig.aspectRatio = fusionParams.aspectRatio;  // Ratio - no conversion
      toolConfig.fusionFlutes = fusionParams.numberOfFlutes;
      // Calculate stickout including holder extension
      var baseStickout = (fusionParams.bodyLength || fusionParams.fluteLength * 1.5 || diameter * 3) * toMM;
      var holderExtension = (getProperty(prefix + "HolderExtension") || 0) * 25.4;  // Convert inches to mm
      
      // If holder type has default projection and user didn't specify, use default
      var holderType = toolConfig.holderType || "er_collet";
      var holderData = PRISM_PHYSICS.holderFinishFactors[holderType];
      if (holderExtension <= 0 && holderData && holderData.projection) {
        holderExtension = holderData.projection;
      }
      
      toolConfig.stickout = baseStickout + holderExtension;
      toolConfig.holderExtension = holderExtension;
      toolConfig.baseStickout = baseStickout;
    }
    
    // Get cutting parameters from operation
    if (fusionSection) {
      var cuttingParams = this.getFusionCuttingParams(fusionSection);
      // CRITICAL: Fusion cutting params are in document units - CONVERT TO MM!
      // Try axialDepth first, then stepdown (used by face/2D ops), then default
      var rawAxialDOC = cuttingParams.axialDepth || cuttingParams.stepdown || 0;
      if (rawAxialDOC > 0) {
        toolConfig.axialDOC = rawAxialDOC * toMM;
      } else {
        // No DOC from Fusion - use sensible defaults based on tool type
        // HIGH FEED mills (≤20° lead) typically use 0.5-2mm DOC
        if (toolConfig.isHighFeed || parseInt(toolConfig.leadAngle) <= 20) {
          toolConfig.axialDOC = Math.min(2.0, diameter * 0.04);  // Max 2mm or 4% of diameter
        } else {
          toolConfig.axialDOC = diameter * 0.5;  // Standard: 50% of diameter
        }
      }
      toolConfig.axialDOCSource = rawAxialDOC > 0 ? "fusion" : "default";
      
      // For Adaptive operations, Fusion uses "optimalLoad" OR "stepover" as the stepover
      // Try multiple sources in priority order - MUST be actual numbers, not functions!
      function isNum(v) { return typeof v === "number" && !isNaN(v) && v > 0; }
      var stepoverValue = 0;
      var stepoverSource = "default";
      if (isNum(cuttingParams.radialDepth)) {
        stepoverValue = cuttingParams.radialDepth;
        stepoverSource = "radialDepth";
      } else if (isNum(cuttingParams.optimalLoad)) {
        stepoverValue = cuttingParams.optimalLoad;  // This is the 3D Adaptive stepover!
        stepoverSource = "optimalLoad";
      } else if (isNum(cuttingParams.stepover)) {
        stepoverValue = cuttingParams.stepover;
        stepoverSource = "stepover";
      }
      // Strategy-specific WOC defaults when Fusion doesn't provide values
      var defaultWOC = 0.15;  // Default 15% for general milling
      var strategyStr = toolConfig.strategy || "auto";
      
      // Face milling typically uses 65-80% WOC
      if (strategyStr === "face" || strategyStr === "face_mill" || 
          toolConfig.type === "face_mill" || toolConfig.type === "shell_mill") {
        defaultWOC = 0.70;  // 70% WOC for face milling
      }
      // Adaptive/HEM uses light engagement (from optimalLoad)
      else if (strategyStr === "adaptive" || strategyStr === "hem") {
        defaultWOC = 0.08;  // 8% default for adaptive (should come from optimalLoad)
      }
      // HSM uses moderate engagement
      else if (strategyStr === "hsm" || strategyStr === "highSpeed") {
        defaultWOC = 0.25;  // 25% for HSM
      }
      // Slot milling uses full width
      else if (strategyStr === "slot" || strategyStr === "slotting") {
        defaultWOC = 1.0;  // 100% for slotting
      }
      // Finishing uses light passes
      else if (strategyStr === "finish" || strategyStr === "finishing" || strategyStr === "contour") {
        defaultWOC = 0.10;  // 10% for finishing
      }
      
      toolConfig.radialDOC = stepoverValue ? (stepoverValue * toMM) : (diameter * defaultWOC);
      toolConfig.radialDOCSource = stepoverValue ? stepoverSource : "strategy_default";
      
      // DEBUG: Store raw values for troubleshooting
      toolConfig.debug = {
        radialDepth: cuttingParams.radialDepth,
        optimalLoad: cuttingParams.optimalLoad,
        stepover: cuttingParams.stepover,
        usedValue: stepoverValue,
        finalRadialDOC: toolConfig.radialDOC,
        toMM: toMM,
        source: toolConfig.radialDOCSource,
        _fusionRaw: cuttingParams._debug || null,
        _error: cuttingParams._error || null
      };
      toolConfig.stockToLeave = cuttingParams.stockToLeave ? (cuttingParams.stockToLeave * toMM) : 0;
      toolConfig.tolerance = cuttingParams.tolerance ? (cuttingParams.tolerance * toMM) : 0.1;
      toolConfig.optimalLoad = cuttingParams.optimalLoad ? (cuttingParams.optimalLoad * toMM) : 0;
      toolConfig.isRoughing = cuttingParams.isRoughing;
      toolConfig.isFinishing = cuttingParams.isFinishing;
    }
    
    // If this is an indexable insert tool, use specialized calculation
    if (toolConfig.indexable) {
      var material = PRISM_MATERIALS.getMaterial ? PRISM_MATERIALS.getMaterial(materialId) : null;
      if (!material && PRISM_MATERIALS.database) {
        material = PRISM_MATERIALS.database[materialId];
      }
      if (!material && PRISM_MATERIALS.GROUP_DEFAULTS) {
        var group = materialId.charAt(0);
        material = PRISM_MATERIALS.GROUP_DEFAULTS[group];
      }
      // Ensure ae/ap have defaults for face milling if not set from Fusion
      if (!toolConfig.radialDOC || toolConfig.radialDOC <= 0) {
        // Default for face milling: 70% WOC
        var diaMM = (unit == IN) ? diameter * 25.4 : diameter;
        toolConfig.radialDOC = diaMM * 0.70;
        toolConfig.radialDOCSource = "face_default";
      }
      if (!toolConfig.axialDOC || toolConfig.axialDOC <= 0) {
        // Default for face milling DOC
        toolConfig.axialDOC = parseFloat(toolConfig.insertNoseR || 0.8) || 0.8;  // Typically nose radius
        toolConfig.axialDOCSource = "face_default";
      }
      // Create debug object if not present
      if (!toolConfig.debug) {
        toolConfig.debug = {
          radialDepth: 0, optimalLoad: 0, stepover: 0,
          usedValue: toolConfig.radialDOC,
          finalRadialDOC: toolConfig.radialDOC,
          source: toolConfig.radialDOCSource || "face_default"
        };
      }
      
      var indexableResult = this.calculateIndexable(material, toolConfig, diameter, strategy, optMode);
      // CRITICAL: Add toolConfig to result so debug output works
      indexableResult.toolConfig = toolConfig;
      indexableResult.material = material;
      return indexableResult;
    }

    var result = {
      valid: false,
      material: null,
      toolConfig: null,
      speed: null,
      feed: null,
      force: null,
      toolLife: null,
      coolant: null,
      adjustedRPM: 0,
      adjustedFeed: 0,
      comments: []
    };
    
    // Get material data
    var material = null;
    try {
      material = PRISM_MATERIALS ? PRISM_MATERIALS[materialId] : null;
    } catch (e) {
      material = null;
    }
    if (!material) {
      // Try group default
      var group = materialId.charAt(0);
      if (PRISM_GROUP_DEFAULTS[group]) {
        material = {
          name: "Generic " + group + " Material",
          group: group,
          kienzle: { kc1_1: PRISM_GROUP_DEFAULTS[group].kc1_1, mc: PRISM_GROUP_DEFAULTS[group].mc },
          taylor: { C: 200, n: 0.20 },
          speeds: PRISM_GROUP_DEFAULTS[group].speeds
        };
      } else {
        result.comments.push("Material not found: " + materialId);
        return result;
      }
    }
    result.material = material;
    
    // Check if tool was configured (toolConfig already set above with Fusion params)
    // DO NOT call getToolConfig again - it would overwrite the Fusion params!
    if (toolConfig.type === "none") {
      // Use Fusion defaults if tool not configured
      toolConfig = {
        type: "flat_endmill",
        flutes: 4,
        material: "carbide",
        coating: "tialn",
        brand: "generic",
        helixAngle: 38,
        holderType: "er_collet",
        holderBrand: "generic",
        stickout: 0,
        condition: "new",
        speedMult: 1.0,
        feedMult: 1.0
      };
      result.comments.push("Tool " + toolNum + " not configured - using defaults");
    }
    result.toolConfig = toolConfig;

    // Store diameter on toolConfig so sub-functions can access it
    toolConfig._diameter = diameter;

    // Calculate optimized speed
    result.speed = this.calculateOptimizedSpeed(material, toolConfig, strategy, optMode);
    
    // Calculate RPM
    var optimalRPM = this.speedToRPM(result.speed.Vc, diameter);
    result.speed.rpm = Math.round(optimalRPM);  // CRITICAL: Store in result for output!
    
    // Calculate optimized feed
    result.feed = this.calculateOptimizedFeed(material, toolConfig, diameter, optimalRPM, strategy, optMode);
    
    // Copy hsmHem to top level for comment output
    if (result.feed && result.feed.hsmHem) {
      result.hsmHem = result.feed.hsmHem;
    }
    
    // CRITICAL: Store modified toolConfig on result for comment output
    // This preserves radialDOC, axialDOC, debug info, etc. that was set above
    result.toolConfig = toolConfig;
    
    // Apply power limits
    if (toolConfig.machineConfig) {
      var powerCheck = this.applyPowerLimits(
        result.speed.Vc, result.feed.feedRate, diameter,
        toolConfig.axialDOC || diameter * 0.5,
        toolConfig.radialDOC || diameter * 0.15,
        material, toolConfig.machineConfig
      );
      if (powerCheck && powerCheck.limited) {
        result.feed.feedRate = powerCheck.feedRate;
        result.comments.push("PRISM: " + powerCheck.reason);
      }
    }
    
    // Get coolant recommendation
    result.coolant = this.getRecommendedCoolant(material, toolConfig);
    
    // Calculate tool life at this speed
    result.toolLife = this.calculateTaylorToolLife(material, result.speed.Vc);
    
    // Calculate cutting force (with typical parameters)
    var typicalAp = diameter * 0.5; // Assume 0.5D axial depth
    var typicalAe = diameter * 0.15; // Assume 15% radial engagement
    var fz = result.feed.fz;
    result.force = this.calculateCuttingForce(material, typicalAp, typicalAe, fz, diameter);
    
    // Determine adjusted values
    // If PRISM calculates higher than programmed, suggest increase
    // If PRISM calculates lower, use PRISM value for safety
    result.adjustedRPM = Math.min(optimalRPM, programmedRPM * 1.2);
    result.adjustedFeed = Math.min(result.feed.feedRate, programmedFeed * 1.2);
    
    result.valid = true;
    
    // =========================================================================
    // FINISHING OPTIMIZATION (v10.2)
    // Apply finishing adjustments for 2D/3D finish passes
    // =========================================================================
    result.finishing = null;
    if (toolConfig.finishMode && toolConfig.finishMode !== "off") {
      var finishResult = this.calcFinishingOptimization(
        toolConfig,
        material,
        diameter,
        result.speed.Vc,
        result.feed.feedRate,
        {
          stockToLeave: toolConfig.stockToLeave || 0,
          tolerance: toolConfig.tolerance || 0.1,
          stepover: toolConfig.radialDOC || (diameter * 0.1),
          axialDepth: toolConfig.axialDOC || diameter,
          cornerRadius: toolConfig.cornerRadius || (diameter * 0.1)
        },
        toolConfig.machineConfig
      );

      // Apply finishing adjustments if active
      if (finishResult && finishResult.mode !== "off") {
        result.speed.Vc = finishResult.speed;
        result.speed.finishAdjusted = true;
        result.feed.feedRate = finishResult.feed;
        result.feed.finishAdjusted = true;
        result.finishing = finishResult;
        
        // Add finishing warnings to comments
        if (finishResult.warnings && finishResult.warnings.length > 0) {
          for (var fwi = 0; fwi < finishResult.warnings.length; fwi++) {
            result.comments.push("PRISM FINISH: " + finishResult.warnings[fwi]);
          }
        }
        
        // Add finish info comment
        var raTarget = finishResult.details.targetRa || 32;
        var raAchieve = finishResult.achievableRa ? (finishResult.achievableRa * 39.37).toFixed(1) : "?";
        result.comments.push("PRISM FINISH: Target Ra " + raTarget + " uin, Predicted " + raAchieve + " uin");
      }
    }
    
    // Add summary comment
    result.comments.push(
      "PRISM: " + material.name + 
      " | Vc=" + Math.round(result.speed.Vc) + " +/-" + Math.round(result.speed.Vc_uncertainty) + " m/min" +
      " | Fc=" + Math.round(result.force.Fc) + " +/-" + Math.round(result.force.Fc_uncertainty) + " N" +
      " | T=" + Math.round(result.toolLife.T) + " +/-" + Math.round(result.toolLife.T_uncertainty) + " min"
    );
    
    return result;
  }
};

var PRISM_TURNING = {
  // 1. CSS optimization - calculates RPM from Vc and diameter, determines G50 S-limit
  calcCSS: function(Vc_mmin, diameter_mm, maxRPM) {
    var rpm = (Vc_mmin * 1000) / (Math.PI * diameter_mm);
    return { rpm: Math.min(Math.round(rpm), maxRPM), limited: rpm > maxRPM, minDiameter: (Vc_mmin * 1000) / (Math.PI * maxRPM) };
  },

  // 2. Turning force - Kienzle for turning (ap = DOC, f = feed/rev)
  calcTurningForce: function(kc1_1, mc, ap_mm, f_mmrev) {
    if (!ap_mm || !f_mmrev || ap_mm <= 0 || f_mmrev <= 0) return { Fc: 0, P_kW: 0 };
    var Fc = kc1_1 * ap_mm * Math.pow(f_mmrev, 1 - mc);
    return { Fc: Math.round(Fc), P_kW: 0 }; // caller adds Vc for power
  },

  // 3. Nose radius feed limit
  calcNoseRadiusFeedLimit: function(noseR_mm, isFinishing) {
    var maxF = isFinishing ? 0.25 * noseR_mm : 0.5 * noseR_mm;
    var Ra = maxF * maxF / (32 * noseR_mm) * 1000; // Ra in microns
    return { maxFeed_mmrev: parseFloat(maxF.toFixed(3)), predictedRa_um: parseFloat(Ra.toFixed(2)) };
  },

  // 4. Chip breaking zone check
  checkChipBreaking: function(feed_mmrev, ap_mm, chipbreakerType) {
    var zones = {
      light:  { fMin: 0.05, fMax: 0.25, apMin: 0.3, apMax: 2.0 },
      medium: { fMin: 0.15, fMax: 0.50, apMin: 1.0, apMax: 5.0 },
      rough:  { fMin: 0.30, fMax: 0.80, apMin: 2.0, apMax: 10.0 }
    };
    var z = zones[chipbreakerType] || zones.medium;
    var inZone = feed_mmrev >= z.fMin && feed_mmrev <= z.fMax && ap_mm >= z.apMin && ap_mm <= z.apMax;
    var warning = "";
    if (feed_mmrev < z.fMin) warning = "Feed too light - chips will not break (bird's nests)";
    else if (feed_mmrev > z.fMax) warning = "Feed too heavy - tool breakage risk";
    else if (ap_mm < z.apMin) warning = "DOC too shallow for chipbreaker - chips will not curl";
    else if (ap_mm > z.apMax) warning = "DOC too deep for chipbreaker - excessive force";
    return { inZone: inZone, warning: warning, zone: z };
  },

  // 5. Boring bar deflection
  calcBoringBarDeflection: function(Fc_N, overhang_mm, barDiameter_mm, barMaterial) {
    var E = (barMaterial === "carbide") ? 580000 : (barMaterial === "heavy_metal") ? 350000 : 210000; // MPa
    var I = Math.PI * Math.pow(barDiameter_mm, 4) / 64;
    var delta = (Fc_N * Math.pow(overhang_mm, 3)) / (3 * E * I);
    var LD = overhang_mm / barDiameter_mm;
    var recommendation = LD < 4 ? "Standard steel bar OK" : LD < 7 ? "Use vibration-dampened bar" : LD < 10 ? "Use carbide-reinforced shank" : "Not recommended - consider WEDM";
    var feedReduction = LD > 4 ? Math.pow(4 / LD, 2) : 1.0;
    return { deflection_mm: parseFloat(delta.toFixed(4)), LD_ratio: parseFloat(LD.toFixed(1)), recommendation: recommendation, feedReduction: parseFloat(feedReduction.toFixed(3)) };
  },

  // 6. Grooving/parting feed ramp
  calcGrooveFeedRamp: function(fullFeed_mmrev, currentDepth_mm, totalDepth_mm, grooveWidth_mm) {
    var rampDepth = Math.min(0.5, totalDepth_mm * 0.1);
    var feedFactor = 1.0;
    if (currentDepth_mm < rampDepth) {
      feedFactor = 0.5 + 0.5 * (currentDepth_mm / rampDepth); // 50% to 100% ramp
    }
    // Center approach reduction (last 2mm diameter)
    var remainingDia = totalDepth_mm - currentDepth_mm;
    if (remainingDia < 1.0) feedFactor *= 0.6;
    // Peck retract check
    var shouldPeck = currentDepth_mm > grooveWidth_mm * 2;
    return { feed_mmrev: parseFloat((fullFeed_mmrev * feedFactor).toFixed(3)), feedFactor: parseFloat(feedFactor.toFixed(3)), shouldPeck: shouldPeck };
  },

  // 7. Threading DOC schedule (modified constant-area)
  calcThreadingSchedule: function(pitch_mm, nPasses, infeedAngle_deg) {
    var totalDepth = 0.6134 * pitch_mm; // ISO metric 60-degree
    var passes = [];
    for (var i = 1; i <= nPasses; i++) {
      var depth = totalDepth * (Math.sqrt(i) - Math.sqrt(i - 1)) / Math.sqrt(nPasses);
      passes.push({ pass: i, depth_mm: parseFloat(depth.toFixed(4)), cumulative_mm: 0 });
    }
    var cumulative = 0;
    for (var j = 0; j < passes.length; j++) { cumulative += passes[j].depth_mm; passes[j].cumulative_mm = parseFloat(cumulative.toFixed(4)); }
    return { totalDepth_mm: parseFloat(totalDepth.toFixed(4)), passes: passes, infeedAngle: infeedAngle_deg || 29.5, springPasses: pitch_mm > 2.0 ? 2 : 1 };
  }
};


/**
 * Helper function to get material from post properties
 */
function getPrismMaterial() {
  var materialId = getProperty("prismMaterialSpecific");
  
  // Handle header items (they start with group letter followed by _HEADER)
  if (materialId && materialId.indexOf("_HEADER") >= 0) {
    // Use group default
    var group = getProperty("prismMaterialGroup") || "P";
    return PRISM_GROUP_DEFAULTS[group];
  }
  
  return PRISM_MATERIALS[materialId] || null;
}

// =============================================================================
// v11 S4 U-PBL09: MATERIAL AUTO-DETECTION FROM FUSION 360
// =============================================================================

/**
 * Fuzzy-match Fusion 360 material name to PRISM material database entry.
 * Covers 40+ common shop materials with alias resolution.
 *
 * Resolution chain:
 *   1. Exact match in PRISM_MATERIALS.database
 *   2. Fuzzy keyword match against FUSION_MATERIAL_MAP
 *   3. ISO group default from group letter
 *   4. Ultimate fallback: ISO P (steel) + WARNING
 *
 * Source: Fusion 360 material library names, Machinery's Handbook 30th Ed.
 */
var FUSION_MATERIAL_MAP = [
  // [keywords, prismMaterialId, isoGroup]
  // ISO P — Steels
  ["4140", "4140_steel", "P"],
  ["4340", "4340_steel", "P"],
  ["1018", "1018_steel", "P"],
  ["1045", "1045_steel", "P"],
  ["1020", "1020_steel", "P"],
  ["8620", "8620_steel", "P"],
  ["a36", "A36_steel", "P"],
  ["12l14", "12L14_steel", "P"],
  // ISO M — Stainless
  ["304", "304_stainless", "M"],
  ["316", "316_stainless", "M"],
  ["303", "303_stainless", "M"],
  ["17-4", "17-4PH_stainless", "M"],
  ["410", "410_stainless", "M"],
  ["duplex", "duplex_stainless", "M"],
  // ISO K — Cast Iron
  ["gray iron", "gray_iron", "K"],
  ["grey iron", "gray_iron", "K"],
  ["ductile iron", "ductile_iron", "K"],
  ["cast iron", "gray_iron", "K"],
  // ISO N — Non-Ferrous
  ["6061", "6061_aluminum", "N"],
  ["7075", "7075_aluminum", "N"],
  ["2024", "2024_aluminum", "N"],
  ["6063", "6061_aluminum", "N"],
  ["aluminum", "6061_aluminum", "N"],
  ["aluminium", "6061_aluminum", "N"],
  ["brass", "brass_360", "N"],
  ["bronze", "bronze", "N"],
  ["copper", "copper", "N"],
  // ISO S — Superalloys/Titanium
  ["ti-6al-4v", "Ti6Al4V", "S"],
  ["ti6al4v", "Ti6Al4V", "S"],
  ["titanium grade 5", "Ti6Al4V", "S"],
  ["titanium", "Ti6Al4V", "S"],
  ["inconel 718", "inconel_718", "S"],
  ["inconel", "inconel_718", "S"],
  ["waspaloy", "waspaloy", "S"],
  ["hastelloy", "hastelloy", "S"],
  // ISO H — Hardened Steel
  ["d2", "D2_tool_steel", "H"],
  ["h13", "H13_tool_steel", "H"],
  ["a2", "A2_tool_steel", "H"],
  ["s7", "S7_tool_steel", "H"],
  ["m2", "M2_hss", "H"],
  ["tool steel", "D2_tool_steel", "H"],
];

/**
 * Auto-detect material from Fusion 360 document.
 * Reads material-name global parameter, resolves via fuzzy matching.
 *
 * @returns {object} { materialId, isoGroup, source, material, warning }
 */
function autoDetectFusionMaterial() {
  var result = { materialId: null, isoGroup: "P", source: "default", material: null, warning: "" };

  // Try reading Fusion 360 material name
  var fusionMaterialName = "";
  try {
    fusionMaterialName = getGlobalParameter("material-name") || "";
  } catch(e) {
    // Not available — fall through to property-based
  }

  if (!fusionMaterialName) {
    try {
      fusionMaterialName = getGlobalParameter("material") || "";
    } catch(e) {}
  }

  if (fusionMaterialName) {
    var nameLower = fusionMaterialName.toLowerCase();

    // Try fuzzy matching against FUSION_MATERIAL_MAP
    for (var i = 0; i < FUSION_MATERIAL_MAP.length; i++) {
      var entry = FUSION_MATERIAL_MAP[i];
      if (nameLower.indexOf(entry[0].toLowerCase()) >= 0) {
        result.materialId = entry[1];
        result.isoGroup = entry[2];
        result.source = "fusion-auto";
        result.material = PRISM_MATERIALS.getMaterial(entry[1]);
        return result;
      }
    }

    // No match — use ISO P default with WARNING
    result.isoGroup = "P";
    result.materialId = "P_DEFAULT";
    result.source = "fusion-unknown";
    result.material = PRISM_MATERIALS.GROUP_DEFAULTS.P;
    result.warning = "UNKNOWN MATERIAL: '" + fusionMaterialName + "' — using ISO P (steel) defaults. VERIFY speeds/feeds!";
    return result;
  }

  // No Fusion material — fall through to property-based selection
  result.source = "property";
  return result;
}

// =============================================================================
// v11 S4 U-PBL10: HARDNESS-BASED SPEED DERATING
// =============================================================================

/**
 * Calculate speed derating factor based on Rockwell C hardness.
 * HRC 28 = baseline (factor 1.0), higher hardness → lower speed.
 *
 * Source: Sandvik Coromant General Milling, hardness correction chart.
 *         Machinery's Handbook 30th Ed, machinability tables.
 *
 * @param hrc - Material hardness in Rockwell C (0 = unknown → no derating)
 * @returns Speed factor (0.30 to 1.0)
 */
function calcHardnessSpeedFactor(hrc) {
  if (!hrc || hrc <= 0) return 1.0;       // Unknown hardness, no derating
  if (hrc <= 20) return 1.10;             // Soft — slightly faster
  if (hrc <= 28) return 1.00;             // Baseline (standard machinability)
  if (hrc <= 32) return 0.90;             // Medium — 10% reduction
  if (hrc <= 36) return 0.80;             // Medium-hard — 20% reduction
  if (hrc <= 40) return 0.70;             // Hard — 30% reduction
  if (hrc <= 45) return 0.55;             // Very hard — 45% reduction
  if (hrc <= 50) return 0.45;             // Hardened — 55% reduction
  if (hrc <= 55) return 0.35;             // Very hardened — 65% reduction
  return 0.30;                             // Extreme hardness (>55 HRC)
}

// =============================================================================
// v11 S4 U-PBL11: MATERIAL-SPECIFIC COOLANT + SURFACE FINISH HINTS
// =============================================================================

/**
 * Get coolant recommendation and surface finish hints for material ISO group.
 *
 * @param isoGroup - ISO material group letter (P/M/K/N/S/H)
 * @returns {object} { coolant, coolantCode, finishHint }
 */
function getMaterialCoolantHint(isoGroup) {
  var hints = {
    P: { coolant: "flood",  coolantCode: "M8",   finishHint: "Standard emulsion coolant. Ra 0.8-3.2 achievable." },
    M: { coolant: "flood",  coolantCode: "M8",   finishHint: "High-pressure flood recommended. Stainless work-hardens — avoid rubbing." },
    K: { coolant: "dry",    coolantCode: "M9",   finishHint: "Dry or air blast preferred. Coolant causes thermal shock on cast iron." },
    N: { coolant: "mist",   coolantCode: "M7",   finishHint: "Mist or MQL acceptable. Avoid built-up edge with proper Vc." },
    S: { coolant: "flood",  coolantCode: "M8",   finishHint: "HIGH-PRESSURE flood REQUIRED (Ti/Inconel). Through-spindle if available." },
    H: { coolant: "dry",    coolantCode: "M9",   finishHint: "Dry with air blast. Coolant thermal shock cracks CBN/ceramic inserts." },
  };
  return hints[isoGroup] || hints.P;
}

/**
 * Format PRISM calculation results as G-code comment
 */
function formatPrismComment(calcResult) {
  if (!calcResult || !calcResult.valid) {
    return "";
  }
  
  var mat = calcResult.material;
  var speed = calcResult.speed;
  var force = calcResult.force;
  var life = calcResult.toolLife;
  
  var comment = "PRISM: " + mat.name + 
    " | Vc=" + Math.round(speed.Vc) + "+/-" + Math.round(speed.Vc_uncertainty) + "m/min" +
    " | Fc=" + Math.round(force.Fc) + "+/-" + Math.round(force.Fc_uncertainty) + "N";
  
  return comment;
}

// =============================================================================
// v11 S7 U-PBL18: SIMPLIFIED STABILITY LOBE RPM CHECK
// =============================================================================
// Estimates tool natural frequency from geometry, classifies RPM as stable/unstable.
// Source: Altintas & Budak (1995) — simplified 1-DOF SLD for milling.
// fn = (1/(2*pi)) * sqrt(3*E*I / (m*L^3))
// Stable pockets: RPM_n = 60*fn / (n + phi/(2*pi)), n=0,1,2,...
// =============================================================================

var PRISM_STABILITY = {
  /** Young's modulus for tool materials (GPa → N/mm²) */
  toolE: {
    "carbide": 580000,    // WC-Co, 580 GPa
    "hss": 210000,        // HSS, 210 GPa
    "ceramic": 400000,    // Ceramic, 400 GPa
    "default": 580000     // Assume carbide
  },

  /** Tool density (kg/m³ → kg/mm³ for calc) */
  toolDensity: {
    "carbide": 14.5e-6,   // 14,500 kg/m³ → 14.5e-6 kg/mm³
    "hss": 8.0e-6,        // 8,000 kg/m³
    "default": 14.5e-6
  },

  /**
   * Estimate fundamental natural frequency of cantilevered end mill.
   * fn = (1/(2*pi)) * sqrt(3*E*I / (m*L^3))
   * Source: Altintas "Manufacturing Automation" 2nd Ed, Eq. 3.1
   *
   * @param diameter - Tool diameter (mm)
   * @param stickout - Tool stickout from holder (mm)
   * @param toolMaterial - "carbide", "hss", or "default"
   * @returns Natural frequency in Hz
   */
  estimateNaturalFreq: function(diameter, stickout, toolMaterial) {
    if (!diameter || diameter <= 0 || !stickout || stickout <= 0) return 5000;

    var E = this.toolE[toolMaterial || "default"] || this.toolE["default"];
    var rho = this.toolDensity[toolMaterial || "default"] || this.toolDensity["default"];

    // Moment of inertia for solid cylinder: I = pi*D^4/64
    var I = Math.PI * Math.pow(diameter, 4) / 64;

    // Mass of cantilevered section: m = rho * pi/4 * D^2 * L
    var m = rho * (Math.PI / 4) * diameter * diameter * stickout;

    // Natural frequency (Hz)
    var fn = (1 / (2 * Math.PI)) * Math.sqrt(3 * E * I / (m * Math.pow(stickout, 3)));

    return fn;
  },

  /**
   * Find stable RPM pockets near target RPM.
   * Stable pockets occur at RPM_n = 60*fn / (n + phi/(2*pi))
   * where n = integer lobe number, phi ≈ pi (phase, ~180° for milling)
   *
   * @param fn - Natural frequency (Hz)
   * @param targetRPM - Target spindle speed
   * @param nTeeth - Number of flutes
   * @returns { stable, nearestStableRPM, lobeNumber, rpmRange }
   */
  findStablePocket: function(fn, targetRPM, nTeeth) {
    if (!fn || fn <= 0 || !targetRPM || targetRPM <= 0) {
      return { stable: true, nearestStableRPM: targetRPM, lobeNumber: 0, rpmRange: "" };
    }

    var toothPassFreq = (targetRPM / 60) * nTeeth; // Hz
    var freqRatio = toothPassFreq / fn;

    // Stable pockets: near integer multiples of fn/nTeeth
    // Unstable: near (n + 0.5) * fn/nTeeth
    var lobe = Math.round(freqRatio);
    var fractional = freqRatio - Math.floor(freqRatio);

    // Unstable zone: 0.3 < fractional < 0.7 (between lobes)
    var isUnstable = fractional > 0.3 && fractional < 0.7;

    // Find nearest stable RPM
    var stableRPM = targetRPM;
    if (isUnstable) {
      var lowerLobe = Math.floor(freqRatio);
      var upperLobe = lowerLobe + 1;
      var lowerRPM = (60 * fn * lowerLobe) / nTeeth;  // Center of lower stable pocket
      var upperRPM = (60 * fn * upperLobe) / nTeeth;

      // Pick nearest stable pocket
      stableRPM = Math.abs(targetRPM - lowerRPM) < Math.abs(targetRPM - upperRPM)
        ? Math.round(lowerRPM)
        : Math.round(upperRPM);
    }

    return {
      stable: !isUnstable,
      nearestStableRPM: stableRPM,
      lobeNumber: lobe,
      rpmRange: isUnstable
        ? "Unstable zone — shift to " + stableRPM + " RPM"
        : "Stable pocket (lobe " + lobe + ")"
    };
  }
};

// =============================================================================
// v11 S7 U-PBL19: THERMAL ACCUMULATION TRACKING
// =============================================================================
// Tracks cumulative heat input across operations per tool.
// Source: Loewen & Shaw (1954) — cutting temperature model.
// T_rise = C * Vc^0.4 * f^0.2 (simplified for relative comparison)
// Resets on tool change.
// =============================================================================

var PRISM_THERMAL = {
  /** Accumulated thermal index per tool (reset on tool change) */
  _thermalIndex: {},
  /** Cumulative cutting time per tool (seconds) */
  _cuttingTime: {},

  /**
   * Calculate temperature rise contribution for one operation.
   * Loewen-Shaw simplified: T ∝ Vc^0.4 * fz^0.2 * time^0.3
   * Source: Loewen & Shaw (1954), "On the Analysis of Cutting-Tool Temperatures"
   *
   * @param Vc - Cutting speed (m/min)
   * @param fz - Feed per tooth (mm)
   * @param cutTimeMin - Cutting time for this operation (minutes)
   * @returns Relative thermal index increment
   */
  calcThermalIncrement: function(Vc, fz, cutTimeMin) {
    if (!Vc || Vc <= 0 || !fz || fz <= 0 || !cutTimeMin || cutTimeMin <= 0) return 0;
    return Math.pow(Vc, 0.4) * Math.pow(fz, 0.2) * Math.pow(cutTimeMin, 0.3);
  },

  /**
   * Update thermal accumulation for a tool and get speed derating factor.
   * Progressive derating as thermal index accumulates:
   *   < 50  → 1.00 (no derating)
   *   50-80 → 0.95 (5% reduction)
   *   80-120 → 0.90 (10% reduction)
   *   > 120 → 0.85 (15% reduction, suggest dwell)
   *
   * @param toolNum - Tool number
   * @param Vc - Cutting speed (m/min)
   * @param fz - Feed per tooth (mm)
   * @param cutTimeMin - Cutting time (minutes)
   * @returns { factor, thermalIndex, warning, suggestDwell }
   */
  updateAndDerate: function(toolNum, Vc, fz, cutTimeMin) {
    if (!this._thermalIndex[toolNum]) {
      this._thermalIndex[toolNum] = 0;
      this._cuttingTime[toolNum] = 0;
    }

    var increment = this.calcThermalIncrement(Vc, fz, cutTimeMin);
    this._thermalIndex[toolNum] += increment;
    this._cuttingTime[toolNum] += cutTimeMin;

    var idx = this._thermalIndex[toolNum];
    var factor = 1.0;
    var warning = "";
    var suggestDwell = false;

    if (idx > 120) {
      factor = 0.85;
      warning = "THERMAL: High heat accumulation (index=" + Math.round(idx) + ") — 15% speed reduction, suggest 5s dwell";
      suggestDwell = true;
    } else if (idx > 80) {
      factor = 0.90;
      warning = "THERMAL: Moderate heat (index=" + Math.round(idx) + ") — 10% speed reduction";
    } else if (idx > 50) {
      factor = 0.95;
      warning = "THERMAL: Elevated (index=" + Math.round(idx) + ") — 5% speed reduction";
    }

    return { factor: factor, thermalIndex: idx, warning: warning, suggestDwell: suggestDwell };
  },

  /** Reset thermal state for a tool (called on tool change). */
  resetTool: function(toolNum) {
    this._thermalIndex[toolNum] = 0;
    this._cuttingTime[toolNum] = 0;
  }
};

// =============================================================================
// v11 S7 U-PBL20: WEAR PROGRESSION TRACKING + AUTO-DERATING
// =============================================================================
// Estimates flank wear VB from cumulative cutting time using simplified Usui model.
// Source: Usui et al. (1978) — "Analytical Prediction of Three Dimensional
//         Cutting Process" — simplified to VB ∝ time^0.5 for steady-state wear.
// Progressive feed derating: VB=0.1→5%, VB=0.2→12%, VB=0.3→25%.
// =============================================================================

var PRISM_WEAR = {
  /** Cumulative cutting time per tool (minutes) */
  _cuttingTime: {},

  /** Wear rate coefficients per ISO material group (mm/sqrt(min)) */
  wearRateCoeff: {
    "P": 0.012,    // Steel — moderate wear
    "M": 0.018,    // Stainless — higher due to work hardening
    "K": 0.008,    // Cast iron — lower, abrasive but predictable
    "N": 0.006,    // Aluminum — very low wear
    "S": 0.025,    // Superalloys — aggressive wear
    "H": 0.030,    // Hardened steel — rapid wear
    "default": 0.015
  },

  /**
   * Update wear state and get feed derating factor.
   * VB = C * sqrt(t) where C is material-dependent wear coefficient.
   *
   * Derating schedule (per exit gate):
   *   VB < 0.10mm → 1.00 (no derating)
   *   VB = 0.10mm → 0.95 (5% feed reduction)
   *   VB = 0.20mm → 0.88 (12% feed reduction)
   *   VB ≥ 0.30mm → 0.75 (25% feed reduction) + STRONG WARNING
   *
   * @param toolNum - Tool number
   * @param cutTimeMin - Additional cutting time (minutes)
   * @param isoGroup - ISO material group letter
   * @returns { VB, factor, warning, needsChange }
   */
  updateAndDerate: function(toolNum, cutTimeMin, isoGroup) {
    if (!this._cuttingTime[toolNum]) {
      this._cuttingTime[toolNum] = 0;
    }
    this._cuttingTime[toolNum] += (cutTimeMin || 0);

    var C = this.wearRateCoeff[isoGroup] || this.wearRateCoeff["default"];
    var VB = C * Math.sqrt(this._cuttingTime[toolNum]);
    VB = Math.round(VB * 1000) / 1000; // Round to 0.001mm

    var factor = 1.0;
    var warning = "";
    var needsChange = false;

    if (VB >= 0.30) {
      factor = 0.75;
      warning = "WEAR CRITICAL: VB=" + VB.toFixed(3) + "mm — TOOL CHANGE RECOMMENDED! Feed -25%";
      needsChange = true;
    } else if (VB >= 0.20) {
      factor = 0.88;
      warning = "WEAR: VB=" + VB.toFixed(3) + "mm — feed reduced 12%. Monitor closely.";
    } else if (VB >= 0.10) {
      factor = 0.95;
      warning = "WEAR: VB=" + VB.toFixed(3) + "mm — feed reduced 5% for wear compensation";
    }

    return { VB: VB, factor: factor, warning: warning, needsChange: needsChange };
  },

  /** Reset wear state for a tool. */
  resetTool: function(toolNum) {
    this._cuttingTime[toolNum] = 0;
  }
};

// =============================================================================
// =============================================================================
// v11 S8 U-PBL22: SAFETY ANALYSIS — G-CODE PATTERN VALIDATION
// =============================================================================
// Tracks machine state and validates G-code patterns for safety.
// Catches dangerous patterns: missing spindle start, missing G43,
// rapid moves below clearance plane without prior retract.
// Source: GCodeSafetyAnalyzerEngine.ts (24 rules, 6 controller families)
// =============================================================================

var PRISM_SAFETY = {
  /** Safety state tracking */
  spindleRunning: false,
  g43Active: false,
  lastRetractZ: 999,
  warningCount: 0,
  safetyLog: [],

  /** Reset state (call at program start) */
  reset: function() {
    this.spindleRunning = false;
    this.g43Active = false;
    this.lastRetractZ = 999;
    this.warningCount = 0;
    this.safetyLog = [];
  },

  /** Track spindle state */
  setSpindleRunning: function(running) {
    this.spindleRunning = running;
  },

  /** Track G43 (tool length comp) state */
  setG43Active: function(active) {
    this.g43Active = active;
  },

  /** Track retract position */
  setRetractZ: function(z) {
    this.lastRetractZ = z;
  },

  /**
   * Validate safety before first cutting move of an operation.
   * Returns warnings array (empty = safe).
   */
  validateBeforeCut: function(toolNum, opName) {
    var warnings = [];

    if (!this.spindleRunning) {
      warnings.push("SAFETY: Spindle not running before cutting move (T" + toolNum + " " + opName + ")");
      this.warningCount++;
    }
    if (!this.g43Active) {
      warnings.push("SAFETY: G43 tool length comp not active before Z move (T" + toolNum + ")");
      this.warningCount++;
    }

    for (var i = 0; i < warnings.length; i++) {
      this.safetyLog.push(warnings[i]);
    }
    return warnings;
  },

  /**
   * Get safety summary for program footer.
   */
  getSummary: function() {
    if (this.warningCount === 0) {
      return "SAFETY CHECK: PASS — 0 warnings";
    }
    return "SAFETY CHECK: " + this.warningCount + " WARNING(S) — review flagged operations!";
  }
};

// PRISM G-FORCE OPTIMIZATION MODULE
// =============================================================================
// Optimizes motion based on machine dynamics to prevent:
// - Servo following errors
// - Surface finish degradation
// - Excessive machine vibration
// Based on PRISM Manufacturing Intelligence v10.3.152 physics engine
// =============================================================================

var PRISM_GFORCE = {
    // HURCO VM30i acceleration limits (g)
    accelLimit: 0.5,
    
    // Jerk limit (m/s^3)
    jerkLimit: 35,
    
    // Gravity constant (m/s )
    GRAVITY: 9.80665, // v11 Bug 39: Use exact standard gravity (was 9.81)
    
    // Corner G-force limit
    cornerG: 0.35,
    
    // Chip thinning lookup table (ae/D ratio -> feed multiplier)
    // Based on chip thickness = fz * sqrt(ae/D * (1 - ae/D))
    chipThinningTable: {
        0.05: 2.50,  // 5% stepover -> 250% feed increase
        0.10: 1.80,  // 10% stepover
        0.15: 1.55,
        0.20: 1.40,
        0.25: 1.30,
        0.30: 1.22,
        0.35: 1.16,
        0.40: 1.12,
        0.45: 1.08,
        0.50: 1.05,  // 50% stepover -> nominal
        0.60: 1.00,
        0.70: 0.95,
        0.80: 0.90,
        0.90: 0.85,
        1.00: 0.80   // Slotting -> reduce 20%
    },
    
    // Corner deceleration factors (included angle -> feed multiplier)
    cornerFactorTable: {
        180: 1.00,   // Straight line
        170: 0.98,
        160: 0.95,
        150: 0.90,
        140: 0.85,
        135: 0.78,   // 45 deg corner
        130: 0.72,
        120: 0.65,
        110: 0.55,
        100: 0.45,
        90: 0.35,    // 90 deg corner
        80: 0.28,
        70: 0.22,
        60: 0.16,
        45: 0.10,
        30: 0.05
    },
    
    /**
     * Get chip thinning factor from lookup table with interpolation
     */
    getChipThinningFactor: function(aeRatio) {
        if (aeRatio >= 1.0) return 0.80;
        if (aeRatio <= 0.05) return 2.50;
        
        var ratios = Object.keys(this.chipThinningTable).map(Number).sort(function(a,b){return a-b;});
        for (var i = 0; i < ratios.length; i++) {
            if (aeRatio <= ratios[i]) {
                if (i === 0) return this.chipThinningTable[ratios[0]];
                var lower = ratios[i - 1];
                var upper = ratios[i];
                var t = (aeRatio - lower) / (upper - lower);
                return this.chipThinningTable[lower] * (1 - t) + this.chipThinningTable[upper] * t;
            }
        }
        return 1.0;
    },
    
    /**
     * Get corner deceleration factor from lookup table
     */
    getCornerFactor: function(angleChange) {
        var angles = Object.keys(this.cornerFactorTable).map(Number).sort(function(a,b){return b-a;});
        for (var i = 0; i < angles.length; i++) {
            if (angleChange <= angles[i]) {
                return this.cornerFactorTable[angles[i]];
            }
        }
        return 0.05;
    },
    
    /**
     * Calculate maximum feed for segment length based on acceleration
     */
    getMaxFeedForSegment: function(segmentLength) {
        var a = this.accelLimit * this.GRAVITY * 1000; // mm/s^2
        // v11 Bug 14 fix: Triangular motion profile — accelerate for L/2, decelerate for L/2.
        // Old: sqrt(2*a*L) — assumed full-length acceleration with no decel, 41% overestimate.
        // Correct: v_max = sqrt(a*L) — from v²=2a(L/2) → v=sqrt(aL).
        // Source: Altintas "Manufacturing Automation" 2nd Ed, kinematic motion profiles.
        // Matches calcAccelLimitedFeed() which already uses sqrt(a*L).
        var maxVelocity = Math.sqrt(a * segmentLength); // mm/s
        return maxVelocity * 60; // mm/min
    },
    
    /**
     * Calculate deceleration distance for given feed
     */
    getDecelDistance: function(feed) {
        var v = feed / 60; // mm/s
        var a = this.accelLimit * this.GRAVITY * 1000; // mm/s^2
        return (v * v) / (2 * a); // mm
    },
    
    /**
     * Get corner velocity limit based on radius
     */
    getCornerVelocity: function(radius) {
        if (radius <= 0) return 0;
        var gLimit = this.cornerG * this.GRAVITY * 1000; // mm/s^2
        var v = Math.sqrt(gLimit * radius); // mm/s
        return v * 60; // mm/min
    },
    
    /**
     * Check if corner requires deceleration
     */
    needsDeceleration: function(angleChange) {
        return angleChange < 135;
    }
};

/**
 * Apply PRISM G-force limited feed
 */
function getPrismGForceLimitedFeed(baseFeed, segmentLength, angleChange) {
    var maxFeed = baseFeed;
    
    // Apply segment length limit
    var segmentMaxFeed = PRISM_GFORCE.getMaxFeedForSegment(segmentLength);
    maxFeed = Math.min(maxFeed, segmentMaxFeed);
    
    // Apply corner deceleration
    if (angleChange !== undefined && PRISM_GFORCE.needsDeceleration(angleChange)) {
        var cornerFactor = PRISM_GFORCE.getCornerFactor(angleChange);
        maxFeed *= cornerFactor;
    }
    
    return maxFeed;
}

// wcs definiton
wcsDefinitions = {
  useZeroOffset: false,
  wcs          : [
    {name:"Standard", format:"G", range:[54, 59]}
  ]
};

var singleLineCoolant = false; // specifies to output multiple coolant codes in one line rather than in separate lines
// samples:
// {id: COOLANT_THROUGH_TOOL, on: 88, off: 89}
// {id: COOLANT_THROUGH_TOOL, on: [8, 88], off: [9, 89]}
// {id: COOLANT_THROUGH_TOOL, on: "M88 P3 (myComment)", off: "M89"}
//
// HURCO COOLANT CODES:
// M7  = Through spindle coolant (TSC)
// M8  = Flood coolant
// M9  = Both coolant systems off
// M10 = Both coolant systems on
// M11 Q1 = Air through spindle ON (requires Q parameter - may not work on all machines)
// M11 Q0 = Air through spindle OFF
// M52-M55 = Auxiliary outputs 1-4
// M62-M65 = Auxiliary outputs 1-4 off
// M142-M149 = Auxiliary outputs 5-12
// M152-M159 = Auxiliary outputs 5-12 off
// M68 = Washdown coolant on
// M69 = Washdown coolant off
//
// AIR THROUGH SPINDLE WORKAROUND:
// If M11 Q1/Q0 doesn't work on your machine, enable "Use subprogram for air through spindle"
// This will call M98 P9100 (air on) and M98 P9101 (air off) subprograms
// You must create these subprograms on the machine using whatever method works at the console
//
var coolants = [
  {id:COOLANT_FLOOD, on:8},
  {id:COOLANT_MIST, on:7},  // Using TSC for mist
  {id:COOLANT_THROUGH_TOOL, on:7},
  {id:COOLANT_AIR, on:52, off:62},  // Auxiliary output 1: M52=on, M62=off
  {id:COOLANT_AIR_THROUGH_TOOL},  // Handled specially - see getCoolantCodes()
  {id:COOLANT_SUCTION},
  {id:COOLANT_FLOOD_MIST, on:[8, 7]},  // Both flood and TSC
  {id:COOLANT_FLOOD_THROUGH_TOOL, on:10},  // M10 = both coolant systems on
  {id:COOLANT_OFF, off:9}  // M9 turns off coolants - air off handled separately
];

// Track if air through spindle is currently active
var airThruSpindleActive = false;

var gFormat = createFormat({prefix:"G", decimals:1});
var mFormat = createFormat({prefix:"M", decimals:0});
var hFormat = createFormat({prefix:"H", decimals:0});
var dFormat = createFormat({prefix:"D", decimals:0});
var probeWCSFormat = createFormat({decimals:0, forceDecimal:true});

var xyzFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});
var ijkFormat = createFormat({decimals:6, forceDecimal:true});
var abcFormat = createFormat({decimals:3, forceDecimal:true, scale:DEG});
var feedFormat = createFormat({decimals:(unit == MM ? 1 : 2), forceDecimal:true});
var inverseTimeFormat = createFormat({decimals:3, forceDecimal:true});
var toolFormat = createFormat({decimals:0});
var rpmFormat = createFormat({decimals:0});
var secFormat = createFormat({decimals:3, forceDecimal:true}); // seconds - range 0.001-9999.999
var milliFormat = createFormat({decimals:0}); // BNC dwell in milliseconds (integer, no decimal)
var taperFormat = createFormat({decimals:1, scale:DEG});

var xOutput = createVariable({onchange:function () {retractedX = false;}, prefix:"X"}, xyzFormat);
var yOutput = createVariable({onchange:function () {retractedY = false;}, prefix:"Y"}, xyzFormat);
var zOutput = createVariable({onchange:function () {retractedZ = false;}, prefix:"Z"}, xyzFormat);
var aOutput = createVariable({prefix:"A"}, abcFormat);
var bOutput = createVariable({prefix:"B"}, abcFormat);
var cOutput = createVariable({prefix:"C"}, abcFormat);
var feedOutput = createVariable({prefix:"F"}, feedFormat);
var inverseTimeOutput = createVariable({prefix:"F", force:true}, inverseTimeFormat);
var sOutput = createVariable({prefix:"S", force:true}, rpmFormat);
var dOutput = createVariable({}, dFormat);

// circular output
var iOutput = createVariable({prefix:"I", force:true}, xyzFormat);
var jOutput = createVariable({prefix:"J", force:true}, xyzFormat);
var kOutput = createVariable({prefix:"K", force:true}, xyzFormat);
var irOutput = createReferenceVariable({prefix:"I", force:true}, xyzFormat);
var jrOutput = createReferenceVariable({prefix:"J", force:true}, xyzFormat);
var krOutput = createReferenceVariable({prefix:"K", force:true}, xyzFormat);

var gMotionModal = createModal({}, gFormat); // modal group 1 // G0-G3, ...
var gPlaneModal = createModal({onchange:function () {gMotionModal.reset();}}, gFormat); // modal group 2 // G17-19
var gAbsIncModal = createModal({}, gFormat); // modal group 3 // G90-91
var gFeedModeModal = createModal({}, gFormat); // modal group 5 // G93-95
var gUnitModal = createModal({}, gFormat); // modal group 6 // G20-21 or G70-71
var gCycleModal = createModal({}, gFormat); // modal group 9 // G81, ...
var gRetractModal = createModal({}, gFormat); // modal group 10 // G98-99
var gRotationModal = createModal({
  onchange: function () {
    if (probeVariables.probeAngleMethod == "G68") {
      probeVariables.outputRotationCodes = true;
    }
  }
}, gFormat); // modal group 16 // G68-G69
var mClampModal = createModalGroup(
  {strict:false},
  [
    [32, 33], // A axis clamp / unclamp
    [34, 35], // B axis clamp / unclamp
    [12, 13]  // C axis clamp / unclamp
  ],
  mFormat
);

// fixed settings
var firstFeedParameter = 1;
var useMultiAxisFeatures = true;
var forceMultiAxisIndexing = false; // force multi-axis indexing for 3D programs

var allowIndexingWCSProbing = false; // specifies that probe WCS with tool orientation is supported
var probeVariables = {
  outputRotationCodes: false, // defines if it is required to output rotation codes
  probeAngleMethod   : "OFF", // OFF, AXIS_ROT, G68, G54.4
  compensationXY     : undefined
};

// collected state
var sequenceNumber;
var currentWorkOffset;
var forceSpindleSpeed = false;
var activeMovements; // do not use by default
var currentFeedId;
var retractedX = false; // per-axis retract state tracking (standard CPS pattern)
var retractedY = false;
var retractedZ = false;
var useVectorOutput = false; // states that useMultiAxisFeatures is enabled and no machine configuration is active
probeMultipleFeatures = true;

/** Returns true if the given ABC axis is available for use with vector output. */
function hasABCAxis(name) {
  return String(getProperty("machineAxisABC")).toUpperCase().indexOf(name) != -1;
}

// Smoothing state tracking (standard CPS pattern)
var smoothingActive = false;
var smoothingLevel = 0;

/** Set smoothing mode — standard pattern with state tracking.
    @param {boolean} mode - true to enable, false to disable
    @param {string} [smoothingType] - "ROUGH", "SEMI-FINISH", "FINISH", "ADAPTIVE ROUGH"
*/
function setSmoothing(mode, smoothingType) {
  if (!getProperty("useSmoothing")) {
    return;
  }
  if (mode) {
    var stockToLeave = 0;
    if (hasParameter("operation:stockToLeave")) {
      stockToLeave = getParameter("operation:stockToLeave");
    }
    var verticalStockToLeave = hasParameter("operation:verticalStockToLeave") ? getParameter("operation:verticalStockToLeave") : 0;
    var radialStockToLeave = hasParameter("operation:radialStockToLeave") ? getParameter("operation:radialStockToLeave") : 0;
    var axialStockToLeave = hasParameter("operation:axialStockToLeave") ? getParameter("operation:axialStockToLeave") : 0;
    var maxStock = Math.max(stockToLeave, verticalStockToLeave, radialStockToLeave, axialStockToLeave);

    var isAdaptiveOperation = false;
    if (hasParameter("operation-strategy")) {
      var strategy = getParameter("operation-strategy").toLowerCase();
      isAdaptiveOperation = strategy.indexOf("adaptive") >= 0;
    }

    var roughingThreshold = unit == MM ? 0.5 : 0.02;
    var semiFinishThreshold = unit == MM ? 0.1 : 0.004;

    var smoothingValue;
    if (!smoothingType) {
      if (isAdaptiveOperation || maxStock >= roughingThreshold) {
        smoothingValue = getProperty("smoothingRoughValue");
        smoothingType = isAdaptiveOperation ? "ADAPTIVE ROUGH" : "ROUGH";
      } else if (maxStock >= semiFinishThreshold) {
        smoothingValue = getProperty("smoothingSemiFinishValue");
        smoothingType = "SEMI-FINISH";
      } else {
        smoothingValue = getProperty("smoothingFinishValue");
        smoothingType = "FINISH";
      }
    } else {
      // Explicit type passed
      switch (smoothingType) {
      case "ROUGH":
      case "ADAPTIVE ROUGH":
        smoothingValue = getProperty("smoothingRoughValue");
        break;
      case "SEMI-FINISH":
        smoothingValue = getProperty("smoothingSemiFinishValue");
        break;
      default:
        smoothingValue = getProperty("smoothingFinishValue");
        break;
      }
    }

    // v11 Bug 26: Clamp P value to 1-50 range (WinMax safe range)
    // Some WinMax versions accept 1-100, but older versions alarm above 50
    smoothingValue = Math.max(1, Math.min(50, smoothingValue));

    if (smoothingActive && smoothingLevel == smoothingValue) {
      return; // already at correct level
    }
    writeBlock("G05.3", "P" + smoothingValue, formatComment("T" + tool.number + " " + smoothingType + " SMOOTHING"));
    smoothingActive = true;
    smoothingLevel = smoothingValue;
  } else {
    if (smoothingActive) {
      writeBlock("G05.3", "P0", formatComment("SMOOTHING OFF"));
      smoothingActive = false;
      smoothingLevel = 0;
    }
  }
}

/**
  Writes the specified block.
*/
function writeBlock() {
  var text = formatWords(arguments);
  if (!text) {
    return;
  }
  if (getProperty("showSequenceNumbers") == "true") {
    if (text) {
      if (sequenceNumber > 9999999) {
        sequenceNumber = getProperty("sequenceNumberStart");
      }
      writeWords2("N" + sequenceNumber, text);
      sequenceNumber += getProperty("sequenceNumberIncrement");
    }
  } else {
    writeWords(arguments);
  }
}

function formatComment(text) {
  return "(" + String(text).replace(/[()]/g, "") + ")";
}

/**
  Writes the specified block - used for tool changes only.
*/
function writeToolBlock() {
  var show = getProperty("showSequenceNumbers");
  setProperty("showSequenceNumbers", (show == "true" || show == "toolChange") ? "true" : "false");
  writeBlock(arguments);
  setProperty("showSequenceNumbers", show);
}

/**
  Output a comment.
*/
function writeComment(text) {
  writeln(formatComment(text));
}

// Start of machine configuration logic
var compensateToolLength = false; // add the tool length to the pivot distance for nonTCP rotary heads

// internal variables, do not change
var receivedMachineConfiguration;
var operationSupportsTCP;
var multiAxisFeedrate;

function activateMachine() {
  // disable unsupported rotary axes output
  if (!machineConfiguration.isMachineCoordinate(0) && (typeof aOutput != "undefined")) {
    aOutput.disable();
  }
  if (!machineConfiguration.isMachineCoordinate(1) && (typeof bOutput != "undefined")) {
    bOutput.disable();
  }
  if (!machineConfiguration.isMachineCoordinate(2) && (typeof cOutput != "undefined")) {
    cOutput.disable();
  }

  // setup usage of multiAxisFeatures
  useMultiAxisFeatures = getProperty("useMultiAxisFeatures") != undefined ? getProperty("useMultiAxisFeatures") :
    (typeof useMultiAxisFeatures != "undefined" ? useMultiAxisFeatures : false);
  useABCPrepositioning = getProperty("useABCPrepositioning") != undefined ? getProperty("useABCPrepositioning") :
    (typeof useABCPrepositioning != "undefined" ? useABCPrepositioning : false);

  if (!machineConfiguration.isMultiAxisConfiguration()) {
    return; // don't need to modify any settings for 3-axis machines
  }

  // save multi-axis feedrate settings from machine configuration
  var mode = machineConfiguration.getMultiAxisFeedrateMode();
  var type = mode == FEED_INVERSE_TIME ? machineConfiguration.getMultiAxisFeedrateInverseTimeUnits() :
    (mode == FEED_DPM ? machineConfiguration.getMultiAxisFeedrateDPMType() : DPM_STANDARD);
  multiAxisFeedrate = {
    mode     : mode,
    maximum  : machineConfiguration.getMultiAxisFeedrateMaximum(),
    type     : type,
    tolerance: mode == FEED_DPM ? machineConfiguration.getMultiAxisFeedrateOutputTolerance() : 0,
    bpwRatio : mode == FEED_DPM ? machineConfiguration.getMultiAxisFeedrateBpwRatio() : 1
  };

  // setup of retract/reconfigure  TAG: Only needed until post kernel supports these machine config settings
  if (receivedMachineConfiguration && machineConfiguration.performRewinds()) {
    safeRetractDistance = machineConfiguration.getSafeRetractDistance();
    safePlungeFeed = machineConfiguration.getSafePlungeFeedrate();
    safeRetractFeed = machineConfiguration.getSafeRetractFeedrate();
  }
  if (typeof safeRetractDistance == "number" && getProperty("safeRetractDistance") != undefined && getProperty("safeRetractDistance") != 0) {
    safeRetractDistance = getProperty("safeRetractDistance");
  }

  if (machineConfiguration.isHeadConfiguration()) {
    compensateToolLength = typeof compensateToolLength == "undefined" ? false : compensateToolLength;
  }

  if (machineConfiguration.isHeadConfiguration() && compensateToolLength) {
    for (var i = 0; i < getNumberOfSections(); ++i) {
      var section = getSection(i);
      if (section.isMultiAxis()) {
        machineConfiguration.setToolLength(getBodyLength(section.getTool())); // define the tool length for head adjustments
        section.optimizeMachineAnglesByMachine(machineConfiguration, OPTIMIZE_AXIS);
      }
    }
  } else {
    optimizeMachineAngles2(OPTIMIZE_AXIS);
  }
}

function getBodyLength(tool) {
  for (var i = 0; i < getNumberOfSections(); ++i) {
    var section = getSection(i);
    if (tool.number == section.getTool().number) {
      return section.getParameter("operation:tool_overallLength", tool.bodyLength + tool.holderLength);
    }
  }
  return tool.bodyLength + tool.holderLength;
}

function defineMachine() {
  var useTCP = true;
  if (false) { // note: setup your machine here
    var aAxis = createAxis({coordinate:0, table:true, axis:[1, 0, 0], range:[-120, 120], preference:1, tcp:useTCP});
    var cAxis = createAxis({coordinate:2, table:true, axis:[0, 0, 1], range:[-360, 360], preference:0, tcp:useTCP});
    machineConfiguration = new MachineConfiguration(aAxis, cAxis);

    setMachineConfiguration(machineConfiguration);
    if (receivedMachineConfiguration) {
      warning(localize("The provided CAM machine configuration is overwritten by the postprocessor."));
      receivedMachineConfiguration = false; // CAM provided machine configuration is overwritten
    }
  }

  if (!receivedMachineConfiguration) {
    // multiaxis settings
    if (machineConfiguration.isHeadConfiguration()) {
      machineConfiguration.setVirtualTooltip(false); // translate the pivot point to the virtual tool tip for nonTCP rotary heads
    }

    // retract / reconfigure
    var performRewinds = false; // set to true to enable the rewind/reconfigure logic
    if (performRewinds) {
      machineConfiguration.enableMachineRewinds(); // enables the retract/reconfigure logic
      safeRetractDistance = (unit == IN) ? 1 : 25; // additional distance to retract out of stock, can be overridden with a property
      safeRetractFeed = (unit == IN) ? 20 : 500; // retract feed rate
      safePlungeFeed = (unit == IN) ? 10 : 250; // plunge feed rate
      machineConfiguration.setSafeRetractDistance(safeRetractDistance);
      machineConfiguration.setSafeRetractFeedrate(safeRetractFeed);
      machineConfiguration.setSafePlungeFeedrate(safePlungeFeed);
      var stockExpansion = new Vector(toPreciseUnit(0.1, IN), toPreciseUnit(0.1, IN), toPreciseUnit(0.1, IN)); // expand stock XYZ values
      machineConfiguration.setRewindStockExpansion(stockExpansion);
    }

    // multi-axis feedrates
    if (machineConfiguration.isMultiAxisConfiguration()) {
      machineConfiguration.setMultiAxisFeedrate(
        useTCP ? FEED_FPM : getProperty("useDPMFeeds") ? FEED_DPM : FEED_INVERSE_TIME,
        9999.99, // maximum output value for inverse time feed rates
        getProperty("useDPMFeeds") ? DPM_COMBINATION : INVERSE_MINUTES, // INVERSE_MINUTES/INVERSE_SECONDS or DPM_COMBINATION/DPM_STANDARD
        0.5, // tolerance to determine when the DPM feed has changed
        1.0 // ratio of rotary accuracy to linear accuracy for DPM calculations
      );
      setMachineConfiguration(machineConfiguration);
    }

    /* home positions */
    // machineConfiguration.setHomePositionX(toPreciseUnit(0, IN));
    // machineConfiguration.setHomePositionY(toPreciseUnit(0, IN));
    // machineConfiguration.setRetractPlane(toPreciseUnit(0, IN));
  }
}
// End of machine configuration logic

function onOpen() {
  // define and enable machine configuration
  receivedMachineConfiguration = machineConfiguration.isReceived();

  if (typeof defineMachine == "function") {
    defineMachine(); // hardcoded machine configuration
  }
  activateMachine(); // enable the machine optimizations and settings

  if (getProperty("useG0") && (highFeedrate <= 0)) {
    error(localize("You must set 'highFeedrate' because axes are not synchronized for rapid traversal."));
    return;
  }

  gFeedModeModal.format(94);

  if (useMultiAxisFeatures && !machineConfiguration.isMultiAxisConfiguration()) {
    var text = String(getProperty("machineAxisABC")).toUpperCase();
    for (var i = 0; i < text.length; ++i) {
      if ("ABC".indexOf(text.charAt(i)) == -1) {
        error(localize("Property 'machineAxisABC' must be A, B, C or any combination of these axes!"));
        return;
      }
    }
    useVectorOutput = true;
  }

  if (!getProperty("separateWordsWithSpace")) {
    setWordSeparator("");
  }

  sequenceNumber = getProperty("sequenceNumberStart");
  writeln("%");

  if (programName) {
    var programId;
    try {
      programId = getAsInt(programName);
    } catch (e) {
      error(localize("Program name must be a number."));
      return;
    }
    if (!((programId >= 1) && (programId <= 9999))) {
      error(localize("Program number is out of range."));
    }
    var oFormat = createFormat({width:4, zeropad:true, decimals:0});
    writeln(
      "O" + oFormat.format(programId) +
      conditional(programComment, " " + formatComment(programComment))
    );
  } else {
    error(localize("Program name has not been specified."));
    return;
  }

  if (getProperty("useG0")) {
    writeComment(localize("Using G0 which travels along dogleg path."));
  } else {
    writeComment(subst(localize("Using high feed G1 F%1 instead of G0."), feedFormat.format(highFeedrate)));
  }

  // dump machine configuration
  var vendor = machineConfiguration.getVendor();
  var model = machineConfiguration.getModel();
  var description = machineConfiguration.getDescription();

  if (getProperty("writeMachine") && (vendor || model || description)) {
    writeComment(localize("Machine"));
    if (vendor) {
      writeComment("  " + localize("vendor") + ": " + vendor);
    }
    if (model) {
      writeComment("  " + localize("model") + ": " + model);
    }
    if (description) {
      writeComment("  " + localize("description") + ": "  + description);
    }
  }

  //Probing Surface Inspection
  if (typeof inspectionWriteVariables == "function") {
    inspectionWriteVariables();
  }

  // dump tool information
  if (getProperty("writeTools")) {
    var zRanges = {};
    if (is3D()) {
      var numberOfSections = getNumberOfSections();
      for (var i = 0; i < numberOfSections; ++i) {
        var section = getSection(i);
        var zRange = section.getGlobalZRange();
        var tool = section.getTool();
        if (zRanges[tool.number]) {
          zRanges[tool.number].expandToRange(zRange);
        } else {
          zRanges[tool.number] = zRange;
        }
      }
    }

    var tools = getToolTable();
    if (tools.getNumberOfTools() > 0) {
      for (var i = 0; i < tools.getNumberOfTools(); ++i) {
        var tool = tools.getTool(i);
        var comment = "T" + toolFormat.format(tool.number) + " " +
          "D=" + xyzFormat.format(tool.diameter) + " " +
          localize("CR") + "=" + xyzFormat.format(tool.cornerRadius);
        if ((tool.taperAngle > 0) && (tool.taperAngle < Math.PI)) {
          comment += " " + localize("TAPER") + "=" + taperFormat.format(tool.taperAngle) + localize("deg");
        }
        if (zRanges[tool.number]) {
          comment += " - " + localize("ZMIN") + "=" + xyzFormat.format(zRanges[tool.number].getMinimum());
        }
        comment += " - " + getToolTypeName(tool.type);
        writeComment(comment);
      }
    }
  }

  // =========================================================================
  // v11 S9 U-PBL28: SETUP SHEET GENERATION
  // =========================================================================
  // Generates a comprehensive setup summary as G-code comments.
  // Includes: stock dimensions, operation summary, total cycle time, fixture notes.
  // =========================================================================
  {
    writeln("");
    writeComment("=== SETUP SHEET ===");

    // Stock dimensions
    try {
      var stockX = getGlobalParameter("stock-upper-x") - getGlobalParameter("stock-lower-x");
      var stockY = getGlobalParameter("stock-upper-y") - getGlobalParameter("stock-lower-y");
      var stockZ = getGlobalParameter("stock-upper-z") - getGlobalParameter("stock-lower-z");
      if (unit === IN) {
        writeComment("STOCK: " + (stockX / 25.4).toFixed(3) + " x " + (stockY / 25.4).toFixed(3) + " x " + (stockZ / 25.4).toFixed(3) + " in");
      } else {
        writeComment("STOCK: " + stockX.toFixed(1) + " x " + stockY.toFixed(1) + " x " + stockZ.toFixed(1) + " mm");
      }
    } catch(e) {
      writeComment("STOCK: dimensions not available");
    }

    // Material (from auto-detect if available)
    try {
      var matName = getGlobalParameter("material-name") || "Not specified";
      writeComment("MATERIAL: " + matName);
    } catch(e) {}

    // Operation summary + cycle time
    var totalCycleTimeSec = 0;
    var opCount = getNumberOfSections();
    writeComment("OPERATIONS: " + opCount);
    for (var si = 0; si < opCount; si++) {
      var sect = getSection(si);
      var opName = sect.hasParameter("operation-comment") ? sect.getParameter("operation-comment") : ("Op " + (si + 1));
      var opTool = sect.getTool();
      var opTime = 0;
      try { opTime = sect.getCycleTime ? sect.getCycleTime() : 0; } catch(e) {}
      totalCycleTimeSec += opTime;
      writeComment("  " + (si + 1) + ". " + opName + " — T" + opTool.number + " D" + xyzFormat.format(opTool.diameter) + " (" + Math.round(opTime) + "s)");
    }

    // Total cycle time
    var totalMin = totalCycleTimeSec / 60;
    if (totalMin > 60) {
      writeComment("TOTAL CYCLE TIME: " + Math.floor(totalMin / 60) + "h " + Math.round(totalMin % 60) + "m");
    } else {
      writeComment("TOTAL CYCLE TIME: " + totalMin.toFixed(1) + " min");
    }

    // Work offset
    writeComment("WORK OFFSET: " + (getSection(0).wcs || "G54"));
    writeComment("=== END SETUP SHEET ===");
    writeln("");
  }

  if (true) {
    // v11 Bug 17 fix: Re-enabled duplicate tool geometry check (was disabled with if(false))
    // Warns when two operations use the same tool number but different geometry —
    // this causes wrong tool compensation (wrong diameter/corner radius) on the second op.
    for (var i = 0; i < getNumberOfSections(); ++i) {
      var sectioni = getSection(i);
      var tooli = sectioni.getTool();
      for (var j = i + 1; j < getNumberOfSections(); ++j) {
        var sectionj = getSection(j);
        var toolj = sectionj.getTool();
        if (tooli.number == toolj.number) {
          if (xyzFormat.areDifferent(tooli.diameter, toolj.diameter) ||
              xyzFormat.areDifferent(tooli.cornerRadius, toolj.cornerRadius) ||
              abcFormat.areDifferent(tooli.taperAngle, toolj.taperAngle) ||
              (tooli.numberOfFlutes != toolj.numberOfFlutes)) {
            error(
              subst(
                localize("Using the same tool number for different cutter geometry for operation '%1' and '%2'."),
                sectioni.hasParameter("operation-comment") ? sectioni.getParameter("operation-comment") : ("#" + (i + 1)),
                sectionj.hasParameter("operation-comment") ? sectionj.getParameter("operation-comment") : ("#" + (j + 1))
              )
            );
            return;
          }
        }
      }
    }
  }

  if (useVectorOutput && isMultiAxis()) {
    onCommand(COMMAND_STOP);
    onComment("We cannot guarantee that the CNC will not have to do a rewind during cutting when using vector output.");
    onComment("Machine needs to be defined in post to use ABC output and hence avoid risk of gouges during rewind. Please be careful.");
  }

  if ((getNumberOfSections() > 0) && (getSection(0).workOffset == 0)) {
    for (var i = 0; i < getNumberOfSections(); ++i) {
      if (getSection(i).workOffset > 0) {
        error(localize("Using multiple work offsets is not possible if the initial work offset is 0."));
        return;
      }
    }
  }

  // Safe start block - cancel any active modes
  if (getProperty("useSafeStartBlock")) {
    writeComment("SAFE START BLOCK");
    writeBlock(gFormat.format(40), formatComment("CANCEL CUTTER COMP"));
    writeBlock(gFormat.format(80), formatComment("CANCEL CANNED CYCLES"));
    writeBlock(gFormat.format(49), formatComment("CANCEL TOOL LENGTH OFFSET"));
  }

  // unit mode — G20 (inch) or G21 (metric) — prevent unit mismatch crash
  writeBlock(gUnitModal.format(unit == MM ? 21 : 20), formatComment(unit == MM ? "METRIC" : "INCH"));

  // absolute coordinates and feed per min
  writeBlock(gAbsIncModal.format(90), gPlaneModal.format(17));
  if (!getProperty("isnc")) {
    writeBlock(gAbsIncModal.format(75)); // multi-quadrant arc interpolation mode
  }

  // Enable automatic buffering for smoother motion
  if (getProperty("useAutomaticBuffering")) {
    writeBlock(mFormat.format(16), formatComment("AUTOMATIC BUFFERING ON"));
  }

  // Set maximum rapid rate if specified
  if (getProperty("useMaxRapidRate") > 0) {
    writeBlock(mFormat.format(194), "P" + getProperty("useMaxRapidRate"), formatComment("MAX RAPID RATE"));
  }

  // Spindle warm-up routine
  if (getProperty("useSpindleWarmUp")) {
    writeln("");
    writeComment("SPINDLE WARM-UP ROUTINE");
    var maxRPM = getProperty("spindleWarmUpRPM");
    var warmUpTime = getProperty("spindleWarmUpTime");
    var steps = 4;
    var timePerStep = (warmUpTime * 60) / steps; // convert minutes to seconds, divide by steps
    
    for (var i = 1; i <= steps; i++) {
      var stepRPM = Math.round((maxRPM / steps) * i);
      writeBlock(sOutput.format(stepRPM), mFormat.format(3));
      writeBlock(gFormat.format(4), "P" + xyzFormat.format(timePerStep));
    }
    writeBlock(mFormat.format(5), formatComment("SPINDLE WARM-UP COMPLETE"));
    writeln("");
  }

  // Start chip conveyor
  if (getProperty("useChipConveyor")) {
    onCommand(COMMAND_START_CHIP_TRANSPORT);
  }

  if (useMultiAxisFeatures && (forceMultiAxisIndexing || !is3D() || machineConfiguration.isMultiAxisConfiguration())) {
    writeBlock(mFormat.format(31)); // rotary axes encoder reset
    writeBlock(mFormat.format(126)); // shortest path traverse
  }
}

function onComment(message) {
  writeComment(message);
}

/** Force output of X, Y, and Z. */
function forceXYZ() {
  xOutput.reset();
  yOutput.reset();
  zOutput.reset();
}

/** Force output of A, B, and C. */
function forceABC() {
  aOutput.reset();
  bOutput.reset();
  cOutput.reset();
}

function forceFeed() {
  currentFeedId = undefined;
  feedOutput.reset();
}

/** Force output of X, Y, Z, A, B, C, and F on next output. */
function forceAny() {
  forceXYZ();
  forceABC();
  forceFeed();
}

function printProbeResults() {
  return currentSection.getParameter("printResults", 0) == 1;
}

function FeedContext(id, description, feed) {
  this.id = id;
  this.description = description;
  this.feed = feed;
}

/** Track current movement type for feedrate comments */
var currentMovementType = "";

/** Variables for Prism Enhanced feed control */
var previousPosition = null;
var previousDirection = null;
var previousFeed = 0;
var prismEnhancedArcRadius = 0;
var prismEnhancedActive = false;

/** Get movement type description for comments */
function getMovementDescription(movementType) {
  switch (movementType) {
  case MOVEMENT_RAPID: return "RAPID";
  case MOVEMENT_LEAD_IN: return "LEAD-IN";
  case MOVEMENT_LEAD_OUT: return "LEAD-OUT";
  case MOVEMENT_CUTTING: return "CUTTING";
  case MOVEMENT_LINK_TRANSITION: return "TRANSITION";
  case MOVEMENT_LINK_DIRECT: return "LINK";
  case MOVEMENT_RAMP_HELIX: return "RAMP-HELIX";
  case MOVEMENT_RAMP_PROFILE: return "RAMP-PROFILE";
  case MOVEMENT_RAMP_ZIG_ZAG: return "RAMP-ZIGZAG";
  case MOVEMENT_RAMP: return "RAMP";
  case MOVEMENT_PLUNGE: return "PLUNGE";
  case MOVEMENT_PREDRILL: return "PREDRILL";
  case MOVEMENT_EXTENDED: return "EXTENDED";
  case MOVEMENT_REDUCED: return "REDUCED";
  case MOVEMENT_FINISH_CUTTING: return "FINISH";
  case MOVEMENT_HIGH_FEED: return "HIGH-FEED";
  default: return "MOVE";
  }
}

/**
  Apply feedrate multiplier based on movement type.
  Roughing multiplier applies to: CUTTING, RAMP, PLUNGE, EXTENDED, REDUCED
  Finishing multiplier applies to: FINISH_CUTTING
*/
function applyFeedMultiplier(f, movementType) {
  var multiplier = 100;
  
  // Determine which multiplier to apply
  if (movementType == MOVEMENT_FINISH_CUTTING) {
    multiplier = getProperty("finishingFeedMultiplier");
  } else if (movementType == MOVEMENT_CUTTING || 
             movementType == MOVEMENT_RAMP || 
             movementType == MOVEMENT_RAMP_HELIX ||
             movementType == MOVEMENT_RAMP_PROFILE ||
             movementType == MOVEMENT_RAMP_ZIG_ZAG ||
             movementType == MOVEMENT_PLUNGE ||
             movementType == MOVEMENT_EXTENDED ||
             movementType == MOVEMENT_REDUCED) {
    multiplier = getProperty("roughingFeedMultiplier");
  }
  
  // Apply multiplier
  if (multiplier != 100) {
    f = f * multiplier / 100;
  }
  
  return f;
}

/**
  Apply minimum and maximum feedrate limits.
*/
function applyFeedLimits(f) {
  var maxFeed = getProperty("maximumFeedrate");
  var minFeed = getProperty("minimumFeedrate");
  
  // Apply maximum limit
  if (maxFeed > 0 && f > maxFeed) {
    f = maxFeed;
  }
  
  // Apply minimum limit
  if (minFeed > 0 && f < minFeed) {
    f = minFeed;
  }
  
  return f;
}

/**
  PRISM Enhanced Feed Control Functions
  
  These functions implement variable feedrate logic similar to advanced roughing technologies:
  1. Arc Feed Correction - reduces feed on arcs to maintain constant chip thickness
  2. Direction Change Detection - reduces feed at sharp corners (increased engagement)
  3. Feed Ramping - smooth transitions between different feedrates
  4. Level-based aggressiveness - similar to prism's 1-8 level slider
*/

/**
  Calculate the aggressiveness factor based on per-tool aggressiveness level (1-8).
  v10.5: Now reads from per-tool property T[n]Aggressiveness
  Level 1 = 0.5 (very conservative), Level 8 = 1.0 (full speed)
  This affects how much feed correction is applied.
*/
function getPrismAggressivenessLevelFactor() {
  var level = 5;  // Default
  if (tool && tool.number >= 1 && tool.number <= 24) {
    try {
      level = getProperty("prismT" + tool.number + "Aggressiveness") || 5;
    } catch(e) {}
  }
  // Linear interpolation: level 1 = 0.5, level 8 = 1.0
  return 0.5 + (level - 1) * (0.5 / 7);
}

/**
  Calculate arc feed correction factor.
  When cutting on an arc, the inside of the tool engages more material.
  Smaller radius = more engagement = slower feed needed.
  
  Based on chip thickness formula: CT = fz * sin(engagement_angle/2)
  For arcs: effective_engagement increases as radius decreases
  
  @param radius - Arc radius (0 for linear moves)
  @param toolRadius - Current tool radius
  @returns Feed multiplier (0.5 to 1.0)
*/
function calculateArcFeedFactor(radius, toolRadius) {
  if (!getProperty("usePrismEnhancedFeed")) {
    return 1.0;
  }
  
  var correction = getProperty("arcFeedCorrection") / 100;
  if (correction == 0 || radius == 0 || radius > toolRadius * 10) {
    return 1.0; // No correction for linear moves or large arcs
  }
  
  // The smaller the arc radius relative to tool, the more we reduce feed
  // Minimum factor based on minChipLoadFeed property
  var minFactor = getProperty("minChipLoadFeed") / 100;
  var levelFactor = getPrismAggressivenessLevelFactor();
  
  // Calculate engagement increase factor
  // When arc radius = tool radius, engagement is maximum
  // When arc radius >> tool radius, engagement is near normal
  var radiusRatio = Math.min(radius / toolRadius, 5);
  var baseFactor = 0.6 + (0.4 * (radiusRatio / 5)); // 0.6 at ratio=1, 1.0 at ratio=5+
  
  // Apply correction percentage and level
  var factor = 1.0 - ((1.0 - baseFactor) * correction * levelFactor);
  
  // Ensure we don't go below minimum
  return Math.max(factor, minFactor);
}

/**
  Calculate direction change feed factor.
  When tool changes direction sharply, momentary engagement increases.
  This reduces feed proportionally to the angle change.
  
  @param currentDir - Current movement direction vector [x, y, z]
  @param previousDir - Previous movement direction vector [x, y, z]
  @returns Feed multiplier (0.5 to 1.0)
*/
function calculateDirectionChangeFactor(currentDir, previousDir) {
  if (!getProperty("usePrismEnhancedFeed") || previousDir == null) {
    return 1.0;
  }
  
  var reductionPercent = getProperty("directionChangeFeedReduction");
  if (reductionPercent == 0) {
    return 1.0;
  }
  
  // Calculate dot product to find angle between directions
  var dotProduct = (currentDir[0] * previousDir[0]) + 
                   (currentDir[1] * previousDir[1]) + 
                   (currentDir[2] * previousDir[2]);
  
  // Clamp to valid range for acos
  dotProduct = Math.max(-1, Math.min(1, dotProduct));
  
  // Calculate angle in radians (0 = same direction, PI = opposite)
  var angle = Math.acos(dotProduct);
  
  // Normalize to 0-1 range (0 = no change, 1 = 180 deg turn)
  var angleRatio = angle / Math.PI;
  
  // Apply reduction based on angle
  // Sharp corners (>90 deg) get full reduction, gradual curves get less
  var reductionFactor = angleRatio * angleRatio; // Squared for more natural curve
  var reduction = (reductionPercent / 100) * reductionFactor;
  
  var minFactor = getProperty("minChipLoadFeed") / 100;
  var levelFactor = getPrismAggressivenessLevelFactor();
  
  // Apply level factor (higher level = less reduction)
  reduction = reduction * (2.0 - levelFactor);
  
  return Math.max(1.0 - reduction, minFactor);
}

/**
  Apply feed ramping for smooth transitions.
  Gradually changes from previous feed to target feed over specified distance.
  
  @param targetFeed - Desired feedrate
  @param previousFeed - Previous feedrate
  @param distance - Distance of current move
  @returns Ramped feedrate
*/
function applyFeedRamping(targetFeed, previousFeed, distance) {
  var rampDistance = getProperty("feedRampingDistance");
  if (rampDistance == 0 || previousFeed == 0 || distance == 0) {
    return targetFeed;
  }
  
  // If we're within ramping distance, blend feeds
  if (distance < rampDistance) {
    var ratio = distance / rampDistance;
    return previousFeed + (targetFeed - previousFeed) * ratio;
  }
  
  return targetFeed;
}

/**
  Store position and direction for next move comparison.
  Called during linear and circular moves.
*/
function updatePrismEnhancedState(x, y, z) {
  if (!getProperty("usePrismEnhancedFeed")) {
    return;
  }
  
  if (previousPosition != null) {
    var dx = x - previousPosition[0];
    var dy = y - previousPosition[1];
    var dz = z - previousPosition[2];
    var length = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    if (length > 0.0001) {
      previousDirection = [dx/length, dy/length, dz/length];
    }
  }
  
  previousPosition = [x, y, z];
}

/**
  Calculate Prism Enhanced adjusted feedrate.
  Combines all feed correction factors.
  
  @param f - Base feedrate from CAM
  @param isArc - True if this is a circular move
  @param arcRadius - Radius of arc (0 for linear)
  @param currentPos - Current position [x, y, z]
  @param moveDistance - Distance of this move
  @returns Adjusted feedrate
*/
function applyPrismEnhancedFeed(f, isArc, arcRadius, currentPos, moveDistance) {
  if (!getProperty("usePrismEnhancedFeed")) {
    return f;
  }
  
  var adjustedFeed = f;
  var toolRadius = tool.diameter / 2;
  
  // 1. Apply arc feed correction
  if (isArc && arcRadius > 0) {
    var arcFactor = calculateArcFeedFactor(arcRadius, toolRadius);
    adjustedFeed = adjustedFeed * arcFactor;
    prismEnhancedArcRadius = arcRadius; // Store for potential comments
  } else {
    prismEnhancedArcRadius = 0;
  }
  
  // 2. Apply direction change correction (for linear moves)
  if (!isArc && currentPos != null && previousPosition != null) {
    var dx = currentPos[0] - previousPosition[0];
    var dy = currentPos[1] - previousPosition[1];
    var dz = currentPos[2] - previousPosition[2];
    var length = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    if (length > 0.0001) {
      var currentDir = [dx/length, dy/length, dz/length];
      var dirFactor = calculateDirectionChangeFactor(currentDir, previousDirection);
      adjustedFeed = adjustedFeed * dirFactor;
    }
  }
  
  // 3. Apply feed ramping
  if (previousFeed > 0 && moveDistance > 0) {
    adjustedFeed = applyFeedRamping(adjustedFeed, previousFeed, moveDistance);
  }
  
  // Store for next iteration
  previousFeed = adjustedFeed;
  
  return adjustedFeed;
}

///////////////////////////////////////////////////////////////////////////////
//        ADVANCED FEED OPTIMIZATION BASED ON CUTTING PARAMETERS
//
// These functions implement intelligent feed adjustment similar to how
// advanced roughing technologies Technology Wizard calculates optimal feeds based on:
// - Tool stickout (deflection risk)
// - Radial engagement / Width of Cut (chip thinning)
// - Axial depth of cut
// - Operation type (roughing vs finishing)
// - 3D adaptive stepover considerations
///////////////////////////////////////////////////////////////////////////////

/** Variables to track current cutting parameters */
var currentOperationType = ""; // "roughing", "finishing", "adaptive3d", etc.
var currentRadialDepth = 0;    // Width of cut
var currentAxialDepth = 0;     // Depth of cut
var currentStickout = 0;       // Tool stickout length
var optimizationNotesOutput = false;

/**
  Get cutting parameters from current section.
  Extracts radial depth, axial depth, and determines operation type.
*/
function getCuttingParameters() {
  var params = {
    radialDepth: 0,
    axialDepth: 0,
    stepover: 0,
    stepdown: 0,
    radialStock: 0,
    axialStock: 0,
    isRoughing: false,
    isFinishing: false,
    isAdaptive: false,
    is3D: false,
    strategy: ""
  };
  
  // Get operation strategy
  if (hasParameter("operation-strategy")) {
    params.strategy = getParameter("operation-strategy").toLowerCase();
    params.isAdaptive = params.strategy.indexOf("adaptive") >= 0;
    params.is3D = params.strategy.indexOf("3d") >= 0 || params.strategy.indexOf("contour") >= 0;
  }
  
  // Determine if roughing or finishing based on stock to leave
  if (hasParameter("operation:stockToLeave")) {
    params.radialStock = getParameter("operation:stockToLeave");
  }
  if (hasParameter("operation:verticalStockToLeave")) {
    params.axialStock = getParameter("operation:verticalStockToLeave");
  }
  
  // Get stepover (radial depth)
  if (hasParameter("operation:stepover")) {
    params.stepover = getParameter("operation:stepover");
    params.radialDepth = params.stepover;
  }
  if (hasParameter("operation:maximumStepover")) {
    params.stepover = Math.max(params.stepover, getParameter("operation:maximumStepover"));
    params.radialDepth = params.stepover;
  }
  
  // Get stepdown (axial depth)
  if (hasParameter("operation:stepdown")) {
    params.stepdown = getParameter("operation:stepdown");
    params.axialDepth = params.stepdown;
  }
  if (hasParameter("operation:maximumStepdown")) {
    params.stepdown = Math.max(params.stepdown, getParameter("operation:maximumStepdown"));
    params.axialDepth = params.stepdown;
  }
  
  // Get stock/model Z boundaries for dynamic depth calculation
  params.stockZHigh = 0;
  params.stockZLow = 0;
  params.modelZHigh = 0;
  params.modelZLow = 0;
  
  // Try to get stock boundaries
  if (hasParameter("operation:stockZHigh")) {
    params.stockZHigh = getParameter("operation:stockZHigh");
  }
  if (hasParameter("operation:stockZLow")) {
    params.stockZLow = getParameter("operation:stockZLow");
  }
  // Try model boundaries as fallback
  if (hasParameter("operation:zHigh")) {
    params.modelZHigh = getParameter("operation:zHigh");
  }
  if (hasParameter("operation:zLow")) {
    params.modelZLow = getParameter("operation:zLow");
  }
  
  // Use section Z range as final fallback
  if (params.stockZHigh == 0 && params.modelZHigh == 0) {
    var zRange = currentSection.getGlobalZRange();
    params.stockZHigh = zRange.getMaximum();
    params.stockZLow = zRange.getMinimum();
  }
  
  // Store the effective top Z for dynamic calculations
  params.effectiveTopZ = params.stockZHigh > 0 ? params.stockZHigh : params.modelZHigh;
  params.effectiveBottomZ = params.stockZLow != 0 ? params.stockZLow : params.modelZLow;
  params.totalDepthRange = params.effectiveTopZ - params.effectiveBottomZ;
  
  // Classify operation
  // IMPORTANT: Adaptive toolpaths are ALWAYS roughing operations for feed purposes!
  // Even with 0 stock to leave, adaptive is removing bulk material at high engagement.
  // The programmed feed from Fusion is calculated for full engagement - don't reduce it!
  if (params.isAdaptive) {
    params.isRoughing = true;
    params.isFinishing = false;
  } else {
    var totalStock = params.radialStock + params.axialStock;
    if (totalStock <= 0.001) {
      params.isFinishing = true;
    } else if (totalStock >= 0.5 || (unit == MM && totalStock >= 0.1)) {
      params.isRoughing = true;
    } else {
      params.isFinishing = true; // Semi-finish treated as finishing for feed purposes
    }
  }
  
  return params;
}

/**
  Calculate tool stickout ratio and feed adjustment factor.
  
  Deflection increases with cube of stickout length.
  When stickout/diameter > threshold, reduce feed to prevent chatter.
  
  @param toolDiameter - Tool diameter
  @param toolLength - Tool overall length or flute length
  @param isFinishing - True if finishing operation
  @returns Object with ratio and feed multiplier
*/
function calculateStickoutFactor(toolDiameter, toolLength, isFinishing) {
  var result = {
    ratio: 0,
    factor: 1.0,
    warning: "",
    suggestion: ""
  };
  
  if (toolDiameter <= 0 || toolLength <= 0) {
    return result;
  }
  
  // Calculate stickout ratio
  result.ratio = toolLength / toolDiameter;
  
  // Get threshold based on operation type
  var threshold = isFinishing ? getProperty("finishingStickoutTolerance") : getProperty("maxStickoutRatio");
  var safetyFactor = getProperty("toolStickoutMultiplier");
  
  if (result.ratio <= threshold) {
    result.factor = 1.0;
    result.suggestion = "Stickout OK - no reduction needed";
  } else {
    // Progressive reduction beyond threshold
    // Formula: reduction increases with square of excess ratio
    var excess = result.ratio - threshold;
    var reductionPercent = Math.min(50, excess * excess * 5 * safetyFactor);
    result.factor = 1.0 - (reductionPercent / 100);
    
    if (result.ratio > threshold * 1.5) {
      result.warning = "HIGH STICKOUT WARNING";
      result.suggestion = "Consider shorter tool or reduced DOC";
    } else {
      result.suggestion = "Feed reduced " + Math.round(reductionPercent) + "% for stickout";
    }
  }
  
  return result;
}

/**
  Calculate chip thinning compensation factor.
  
  At low radial engagements (stepover), the actual chip thickness is less
  than the programmed chip load. To maintain target chip load, feed can
  be increased. This is the key to high-efficiency machining.
  
  Formula: Actual_chip = Programmed_chip * sqrt(Ae/D)
  Where Ae = radial depth, D = tool diameter
  
  To compensate: Feed_adjusted = Feed_programmed / sqrt(Ae/D)
  
  @param radialDepth - Width of cut (stepover)
  @param toolDiameter - Tool diameter
  @returns Object with factor and notes
*/
function calculateChipThinningFactor(radialDepth, toolDiameter) {
  var result = {
    factor: 1.0,
    engagementPercent: 0,
    chipThinningPercent: 0,
    suggestion: ""
  };
  
  if (!(getProperty("prismChipThinFormula") !== "off") || radialDepth <= 0 || toolDiameter <= 0) {
    return result;
  }
  
  // Calculate engagement percentage
  result.engagementPercent = (radialDepth / toolDiameter) * 100;
  
  if (result.engagementPercent >= 50) {
    // At 50%+ engagement, no chip thinning compensation (conventional milling)
    result.factor = 1.0;
    result.suggestion = "High engagement - standard feed";
    return result;
  }
  
  // Calculate chip thinning factor
  // sqrt(Ae/D) gives the chip thickness ratio
  var chipRatio = Math.sqrt(radialDepth / toolDiameter);
  result.chipThinningPercent = (1.0 - chipRatio) * 100;
  
  // Compensation factor (inverse of chip ratio)
  var maxMultiplier = getProperty("maxChipThinningMultiplier");
  result.factor = Math.min(1.0 / chipRatio, maxMultiplier);
  
  if (result.factor > 1.2) {
    result.suggestion = "Chip thinning: +" + Math.round((result.factor - 1) * 100) + "% feed increase recommended";
  } else {
    result.suggestion = "Light chip thinning compensation applied";
  }
  
  return result;
}

/**
  Calculate axial depth feed adjustment factor.
  
  For ADAPTIVE/ROUGHING: 
    - Lighter axial cuts (less than optimal) = INCREASE feed (chip thinning in Z)
    - Deeper cuts approaching flute length = maintain or slightly reduce
  For FINISHING: 
    - Light axial depths preferred for surface quality
  
  This is the KEY to 3D adaptive: as depth varies, feed should compensate!
  Shallower cut = less material = CAN GO FASTER
  
  @param axialDepth - Depth of cut
  @param toolDiameter - Tool diameter
  @param fluteLength - Tool flute length
  @param isFinishing - True if finishing operation
  @param isAdaptive - True if adaptive/3D operation
  @returns Object with factor and notes
*/
///////////////////////////////////////////////////////////////////////////////
//        v10.7 AUTO ae LIMITING BASED ON ap/LOC ENGAGEMENT
//
// PHYSICS: You can have DEEP or WIDE engagement, but not both safely.
// As axial depth (ap) approaches flute length (LOC), radial engagement (ae)
// must be limited to prevent tool overload.
//
// FORMULA:
//   ae_max/D = K × (1 - (ap/LOC)^n)
//
// Where:
//   K = 0.40 (maximum ae/D ratio when ap is minimal)
//   n = 1.2 (engagement curve shape - how fast ae drops as ap rises)
//
// CALIBRATION (from field failure):
//   Broken tool: ap/LOC = 79%, ae/D = 5.8%, feedBoost = 2.5x
//   At 79% LOC, even 5.8% ae was too much with 2.5x chip thinning boost!
//
// RETURNS: Maximum safe ae/D ratio and effective ae in mm
///////////////////////////////////////////////////////////////////////////////

/**
  Calculate maximum safe radial engagement (ae) based on axial depth commitment

  @param axialDepth - Programmed axial depth (ap) in mm
  @param toolDiameter - Tool diameter in mm
  @param fluteLength - Flute length (LOC) in mm
  @param currentAeRatio - Current ae/D ratio from Fusion
  @param feedBoostFactor - Expected feed multiplier from chip thinning
  @returns Object with maxAeRatio, limitedAe, wasLimited, note
*/
function calculateMaxSafeAe(axialDepth, toolDiameter, fluteLength, currentAeRatio, feedBoostFactor) {
  var result = {
    maxAeRatio: 0.50,      // Maximum ae/D ratio allowed
    limitedAeRatio: currentAeRatio, // The ae/D to actually use
    limitedAe: currentAeRatio * toolDiameter, // ae in mm
    wasLimited: false,
    locRatio: 0,
    note: ""
  };

  // Validate inputs
  if (!axialDepth || axialDepth <= 0 || !toolDiameter || toolDiameter <= 0) {
    return result;
  }

  // Use effective flute length (default to 3xD if not specified)
  var effectiveLOC = fluteLength > 0 ? fluteLength : (toolDiameter * 3);

  // Calculate LOC engagement ratio
  result.locRatio = axialDepth / effectiveLOC;

  // If ap is minimal (<20% LOC), no ae limiting needed
  if (result.locRatio < 0.20) {
    result.note = "Low LOC (" + Math.round(result.locRatio * 100) + "%) - no ae limit";
    return result;
  }

  // CORE FORMULA: ae_max decreases as ap/LOC increases
  // CALIBRATED FROM FIELD FAILURE:
  //   5.8% ae + 79% LOC + 2.5x chip thinning = BROKEN TOOL
  //   Therefore at 79% LOC, even 5.8% ae was too much with high feed boost
  //
  // Rather than force ae to impossibly small values, we calculate what ae
  // WOULD be safe, then use the ratio to CAP the feed boost.
  //
  // K = 0.35 (35% WOC max at zero depth)
  // n = 1.5 (moderate curve)
  var K = 0.35;
  var n = 1.5;

  // Base maximum ae ratio from LOC engagement
  var baseMaxAeRatio = K * Math.pow(1 - Math.min(result.locRatio, 0.95), n);

  // At high LOC engagement, if current ae exceeds safe limit,
  // we'll limit the feed BOOST rather than force ae change
  // This preserves Fusion's toolpath geometry while keeping feeds safe

  // Minimum ae ratio floor (realistic minimum for HEM)
  result.maxAeRatio = Math.max(baseMaxAeRatio, 0.03); // 3% minimum

  // Calculate how much we need to derate the feed if ae exceeds limit
  if (currentAeRatio > result.maxAeRatio) {
    // ae exceeds safe limit for this LOC
    // Calculate feed derate factor: how much to reduce feed boost
    result.feedDerateFactor = result.maxAeRatio / currentAeRatio;
    result.wasLimited = true;
    result.limitedAeRatio = currentAeRatio; // Keep ae, limit feed instead
    result.limitedAe = currentAeRatio * toolDiameter;

    var deratePct = Math.round((1 - result.feedDerateFactor) * 100);
    result.note = "FEED DERATED: ae=" + Math.round(currentAeRatio * 100) + "% exceeds " +
                  Math.round(result.maxAeRatio * 100) + "% safe limit for " +
                  Math.round(result.locRatio * 100) + "% LOC → chip thin capped at " +
                  (result.feedDerateFactor * 100).toFixed(0) + "%";
  } else {
    result.feedDerateFactor = 1.0;
    result.note = "ae OK: " + Math.round(currentAeRatio * 100) + "% within " +
                  Math.round(result.maxAeRatio * 100) + "% limit for " +
                  Math.round(result.locRatio * 100) + "% LOC";
  }

  return result;
}

function calculateAxialDepthFactor(axialDepth, toolDiameter, fluteLength, isFinishing, isAdaptive) {
  var result = {
    factor: 1.0,
    depthRatio: 0,
    locRatio: 0,
    suggestion: ""
  };
  
  if (!getProperty("adaptiveDepthFeedAdjust") || axialDepth <= 0 || toolDiameter <= 0) {
    return result;
  }
  
  // Calculate depth as ratio of tool diameter
  result.depthRatio = axialDepth / toolDiameter;
  
  // v10.7 SAFETY: Calculate depth as ratio of flute length (LOC)
  // This is CRITICAL for preventing tool breakage on deep adaptive cuts
  var effectiveFluteLength = fluteLength > 0 ? fluteLength : (toolDiameter * 3);
  result.locRatio = axialDepth / effectiveFluteLength;
  
  // v10.7 EXTREME ENGAGEMENT SAFETY OVERRIDE
  // When axial depth exceeds safe LOC limits, we MUST reduce feed regardless of operation type
  // This overrides chip thinning benefits - a broken tool has zero MRR
  //
  // CALIBRATION BASIS: Field failure at 79% LOC + 2.5x chip thinning = BROKEN ENDMILL
  // High LOC + aggressive chip thinning is the deadly combination.
  // Thresholds and reduction factors validated against Sandvik recommendations for
  // slotting/deep pocket engagement limits (Sandvik General Milling, Chapter D30).
  //
  // LOC_CRITICAL (>85%): Near-full flute engagement, very high breakage risk
  // LOC_DANGEROUS (>75%): Range that caused the field failure — most important threshold
  // LOC_HIGH (>65%): Elevated risk when combined with chip thinning boost
  // LOC_MODERATE (>55%): Marginal zone, slight reduction aids chip evacuation
  var LOC_CRITICAL  = 0.85;  // >85% LOC engaged — feed factor 0.45 (55% reduction)
  var LOC_DANGEROUS = 0.75;  // >75% LOC engaged — feed factor 0.55 (45% reduction)
  var LOC_HIGH      = 0.65;  // >65% LOC engaged — feed factor 0.70 (30% reduction)
  var LOC_MODERATE  = 0.55;  // >55% LOC engaged — feed factor 0.85 (15% reduction)

  var LOC_FACTOR_CRITICAL  = 0.45;  // 55% feed reduction
  var LOC_FACTOR_DANGEROUS = 0.55;  // 45% feed reduction
  var LOC_FACTOR_HIGH      = 0.70;  // 30% feed reduction
  var LOC_FACTOR_MODERATE  = 0.85;  // 15% feed reduction

  var extremeEngagementFactor = 1.0;
  var extremeEngagementWarning = "";

  if (result.locRatio > LOC_CRITICAL) {
    extremeEngagementFactor = LOC_FACTOR_CRITICAL;
    extremeEngagementWarning = "CRITICAL: " + Math.round(result.locRatio * 100) + "% LOC engaged - FEED CUT " + Math.round((1 - LOC_FACTOR_CRITICAL) * 100) + "% for safety";
  } else if (result.locRatio > LOC_DANGEROUS) {
    extremeEngagementFactor = LOC_FACTOR_DANGEROUS;
    extremeEngagementWarning = "WARNING: " + Math.round(result.locRatio * 100) + "% LOC engaged - feed reduced " + Math.round((1 - LOC_FACTOR_DANGEROUS) * 100) + "%";
  } else if (result.locRatio > LOC_HIGH) {
    extremeEngagementFactor = LOC_FACTOR_HIGH;
    extremeEngagementWarning = "CAUTION: " + Math.round(result.locRatio * 100) + "% LOC engaged - feed reduced " + Math.round((1 - LOC_FACTOR_HIGH) * 100) + "%";
  } else if (result.locRatio > LOC_MODERATE) {
    extremeEngagementFactor = LOC_FACTOR_MODERATE;
    extremeEngagementWarning = "High LOC engagement (" + Math.round(result.locRatio * 100) + "%) - feed reduced " + Math.round((1 - LOC_FACTOR_MODERATE) * 100) + "%";
  }
  // Below LOC_MODERATE — no safety override needed
  
  // Get optimal depth for this operation type
  // Adaptive roughing: optimal is typically 1.5-2.5x diameter
  // Finishing: optimal is 0.5-1.0x diameter
  var optimalDepthRatio = isFinishing ? 0.5 : 2.0;
  
  if (isAdaptive) {
    // ADAPTIVE OPERATIONS: Can INCREASE feed for shallow cuts
    // But v10.7 adds SAFETY OVERRIDE for extreme engagement
    
    if (result.depthRatio < optimalDepthRatio * 0.5) {
      // Very shallow cut - INCREASE feed significantly
      var shallowRatio = result.depthRatio / optimalDepthRatio;
      result.factor = Math.min(1.0 / Math.sqrt(shallowRatio), getProperty("maxChipThinningMultiplier"));
      result.suggestion = "Shallow DOC - FEED INCREASED +" + Math.round((result.factor - 1) * 100) + "%";
    } else if (result.depthRatio < optimalDepthRatio) {
      // Moderately shallow - slight feed increase
      var shallowRatio = result.depthRatio / optimalDepthRatio;
      result.factor = 1.0 + ((1.0 - shallowRatio) * 0.3); // Up to 30% increase
      result.suggestion = "Light DOC - feed increased +" + Math.round((result.factor - 1) * 100) + "%";
    } else {
      // Normal or deep - use programmed feed (factor = 1.0)
      result.factor = 1.0;
      result.suggestion = "Good DOC for adaptive (" + xyzFormat.format(result.depthRatio) + "xD)";
    }
    
    // v10.7 SAFETY: Apply extreme engagement override AFTER normal calculation
    // This ensures safety even when chip thinning would otherwise boost feed
    if (extremeEngagementFactor < 1.0) {
      result.factor *= extremeEngagementFactor;
      result.suggestion = extremeEngagementWarning;
    }
  } else if (!isFinishing) {
    // NON-ADAPTIVE ROUGHING: Can apply some reductions for safety
    var maxSafeDepthRatio = fluteLength > 0 ? (fluteLength / toolDiameter) * 0.9 : 2.5;
    
    if (result.depthRatio < optimalDepthRatio * 0.5) {
      var shallowRatio = result.depthRatio / optimalDepthRatio;
      result.factor = Math.min(1.0 / Math.sqrt(shallowRatio), getProperty("maxChipThinningMultiplier"));
      result.suggestion = "Shallow DOC - FEED INCREASED +" + Math.round((result.factor - 1) * 100) + "%";
    } else if (result.depthRatio <= maxSafeDepthRatio) {
      result.factor = 1.0;
      result.suggestion = "Good DOC for roughing (" + xyzFormat.format(result.depthRatio) + "xD)";
    } else {
      result.factor = maxSafeDepthRatio / result.depthRatio;
      result.suggestion = "Deep cut exceeds optimal - feed reduced " + Math.round((1 - result.factor) * 100) + "%";
    }
  } else {
    // FINISHING LOGIC
    if (result.depthRatio <= optimalDepthRatio) {
      result.factor = 1.0;
    } else {
      result.factor = optimalDepthRatio / result.depthRatio;
      result.suggestion = "Deep finish cut - feed reduced for quality";
    }
  }
  
  return result;
}

///////////////////////////////////////////////////////////////////////////////
//        DYNAMIC DEPTH FEED ADJUSTMENT FOR 3D ADAPTIVE
//
// This is the KEY to fast adaptive toolpaths!
// During 3D adaptive, the axial depth varies constantly as the tool follows
// the model surface. Shallow cuts = less material = CAN GO FASTER.
//
// How it works:
// 1. Track the stock top Z and total depth range for the operation
// 2. During each cutting move, calculate current depth from actual Z position
// 3. Shallow cuts (Z near stock top) get INCREASED feed
// 4. Full depth cuts maintain programmed feed
//
// This mimics what an experienced machinist does - running faster on light
// cleanup passes and full speed on the initial slotting/profiling.
///////////////////////////////////////////////////////////////////////////////

/** Global variables for dynamic depth tracking */
var dynamicDepthStockTop = 0;
var dynamicDepthStockBottom = 0;
var dynamicDepthRange = 0;
var dynamicDepthProgrammedStepdown = 0;
var dynamicDepthEnabled = false;

/**
  Initialize dynamic depth tracking for current operation.
  Called at start of each section.
  
  @param params - Cutting parameters from getCuttingParameters()
*/
function initializeDynamicDepth(params) {
  dynamicDepthEnabled = getProperty("useDynamicDepthFeed") && 
                        (params.isAdaptive || params.is3D) && 
                        !params.isFinishing;
  
  if (!dynamicDepthEnabled) {
    return;
  }
  
  dynamicDepthStockTop = params.effectiveTopZ;
  dynamicDepthStockBottom = params.effectiveBottomZ;
  dynamicDepthRange = params.totalDepthRange;
  dynamicDepthProgrammedStepdown = params.axialDepth > 0 ? params.axialDepth : (tool.diameter * 2);
  
  if (getProperty("showOptimizationNotes")) {
    writeComment("DYNAMIC DEPTH FEED: Stock Z range " + xyzFormat.format(dynamicDepthStockTop) + 
                 " to " + xyzFormat.format(dynamicDepthStockBottom));
  }
}

/**
  Calculate dynamic feed multiplier based on current Z position.
  
  Principle: Current depth / Programmed stepdown = engagement ratio
  - At full stepdown: ratio = 1.0, feed = programmed
  - At half stepdown: ratio = 0.5, feed = INCREASED
  - At quarter stepdown: ratio = 0.25, feed = SIGNIFICANTLY INCREASED
  
  The feed increase is sqrt-based for chip thinning compensation.
  
  @param currentZ - Current Z position during cutting
  @param baseFeed - Programmed feedrate
  @returns Adjusted feedrate (will be >= baseFeed for adaptive)
*/
function calculateDynamicDepthFeed(currentZ, baseFeed) {
  if (!dynamicDepthEnabled || dynamicDepthRange <= 0) {
    return baseFeed;
  }
  
  // Use adaptive base feed if configured, otherwise use programmed feed
  var effectiveBaseFeed = getProperty("adaptiveBaseFeed") > 0 ? 
                          getProperty("adaptiveBaseFeed") : baseFeed;
  
  // Calculate how deep we are relative to stock top
  var currentDepth = dynamicDepthStockTop - currentZ;
  
  // If we're above stock, no adjustment needed (rapid/position move)
  if (currentDepth <= 0) {
    return effectiveBaseFeed;
  }
  
  // Calculate depth ratio (how much of programmed stepdown we're using)
  // v11 Bug 37: Guard against divide-by-zero if programmed stepdown is 0
  if (dynamicDepthProgrammedStepdown <= 0) {
    return effectiveBaseFeed;
  }
  var depthRatio = Math.min(currentDepth / dynamicDepthProgrammedStepdown, 1.0);
  
  // At shallow depths, INCREASE feed using inverse sqrt relationship
  // This compensates for chip thinning in Z direction
  // At 25% depth: sqrt(0.25) = 0.5, so inverse = 2.0 (but we cap it)
  // At 50% depth: sqrt(0.5) = 0.71, so inverse = 1.41
  // At 100% depth: sqrt(1.0) = 1.0, so inverse = 1.0 (no change)
  
  var maxIncrease = getProperty("dynamicDepthMaxIncrease") / 100.0;
  var feedMultiplier;
  
  if (depthRatio < 0.1) {
    // Very shallow - apply maximum increase
    feedMultiplier = maxIncrease;
  } else {
    // Standard chip thinning compensation
    feedMultiplier = Math.min(1.0 / Math.sqrt(depthRatio), maxIncrease);
  }
  
  return effectiveBaseFeed * feedMultiplier;
}

/**
  Calculate 3D adaptive stepover feed adjustment.
  
  CRITICAL: For adaptive toolpaths, Fusion has ALREADY calculated the optimal
  feed based on engagement. We should NEVER reduce below the programmed feed!
  
  This function should only INCREASE feed when engagement is lighter than
  optimal, allowing faster cuts on cleanup passes.
  
  @param radialStepover - Radial stepover
  @param axialStepover - Axial stepover (scallop-based)
  @param toolDiameter - Tool diameter
  @param isRoughing - True if roughing operation
  @returns Object with combined factor and notes
*/
function calculate3DAdaptiveFactor(radialStepover, axialStepover, toolDiameter, isRoughing) {
  var result = {
    factor: 1.0,
    radialPercent: 0,
    axialPercent: 0,
    effectiveEngagement: 0,
    suggestion: ""
  };
  
  if (toolDiameter <= 0) {
    return result;
  }
  
  // Only calculate if we have stepover data
  if (radialStepover <= 0 && axialStepover <= 0) {
    result.suggestion = "No stepover data - using programmed feed";
    return result;
  }
  
  result.radialPercent = (radialStepover / toolDiameter) * 100;
  result.axialPercent = (axialStepover / toolDiameter) * 100;
  
  // For adaptive, radial engagement is what matters most
  // If no radial stepover detected, use a reasonable default
  var effectiveRadial = result.radialPercent > 0 ? result.radialPercent : getProperty("roughingOptimalWOC");
  
  // Target engagement for feed increase consideration
  var targetEngagement = isRoughing ? getProperty("roughingOptimalWOC") : getProperty("finishingMaxWOC");
  
  // Only INCREASE feed for light engagement - NEVER decrease!
  // Fusion already calculated the optimal feed for the programmed engagement.
  if (effectiveRadial < targetEngagement * 0.75) {
    // Light engagement - can speed up
    // Use chip thinning formula: Feed_increase = sqrt(Target / Actual)
    var increaseRatio = Math.sqrt(targetEngagement / Math.max(effectiveRadial, 1));
    result.factor = Math.min(increaseRatio, getProperty("maxChipThinningMultiplier"));
    result.suggestion = "Light engagement (" + Math.round(effectiveRadial) + "%) - feed can increase +" + 
                        Math.round((result.factor - 1) * 100) + "%";
  } else {
    // Normal or heavy engagement - use Fusion's programmed feed (factor = 1.0)
    result.factor = 1.0;
    result.suggestion = "Normal engagement (" + Math.round(effectiveRadial) + "%) - using programmed feed";
  }
  
  return result;
}

/**
  Master function to calculate all feed optimization factors.
  Combines stickout, chip thinning, axial depth, and 3D factors.
  
  @param baseFeed - Original programmed feed
  @param params - Cutting parameters from getCuttingParameters()
  @returns Object with final feed and all factors
*/
function calculateOptimizedFeed(baseFeed, params) {
  var result = {
    originalFeed: baseFeed,
    optimizedFeed: baseFeed,
    stickoutFactor: 1.0,
    chipThinningFactor: 1.0,
    axialFactor: 1.0,
    adaptive3DFactor: 1.0,
    combinedFactor: 1.0,
    notes: [],
    speedUpSuggestions: [],
    warnings: []
  };
  
  if (!getProperty("prismEnableIntelligence")) {
    return result;
  }
  
  var toolDia = tool.diameter;
  // v11 Bug 21 fix: Use bodyLength (total stickout from holder) for L/D ratio,
  // not fluteLength (cutting portion only). A tool with 2" flutes and 4" body
  // sticks out 4", not 2" — deflection depends on total unsupported length.
  var toolLen = tool.bodyLength > 0 ? tool.bodyLength : (tool.fluteLength > 0 ? tool.fluteLength * 1.5 : tool.diameter * 3);
  var isFinish = params.isFinishing;
  
  // 1. Stickout factor
  var stickout = calculateStickoutFactor(toolDia, toolLen, isFinish);
  result.stickoutFactor = stickout.factor;
  if (stickout.warning) {
    result.warnings.push(stickout.warning);
  }
  if (stickout.suggestion) {
    result.notes.push(stickout.suggestion);
  }
  
  // 2. Chip thinning compensation - WITH v10.7 FEED DERATE FOR HIGH LOC
  // Calculate chip thinning for the actual ae (don't change Fusion's geometry)
  var aeRatio = params.radialDepth / toolDia;
  var chipThin = calculateChipThinningFactor(params.radialDepth, toolDia);
  
  // Check if ae is too high for the ap/LOC engagement
  // If so, we'll DERATE the chip thinning boost (not change ae)
  var aeLimitCheck = calculateMaxSafeAe(
    params.axialDepth, 
    toolDia, 
    tool.fluteLength, 
    aeRatio, 
    chipThin.factor  // Pass the chip thinning to factor into limit
  );
  
  // Store ae/LOC safety info in result
  result.aeLimited = aeLimitCheck.wasLimited;
  result.aeMaxRatio = aeLimitCheck.maxAeRatio;
  result.aeOriginalRatio = aeRatio;
  result.feedDerateFactor = aeLimitCheck.feedDerateFactor || 1.0;
  result.locRatioFromAeCheck = aeLimitCheck.locRatio;
  
  // Apply feed derate to chip thinning if needed
  if (aeLimitCheck.wasLimited && aeLimitCheck.feedDerateFactor < 1.0) {
    // Chip thinning exceeds safe limit for this LOC engagement
    // Cap the chip thinning multiplier
    var originalChipThin = chipThin.factor;
    var maxSafeChipThin = 1.0 + (originalChipThin - 1.0) * aeLimitCheck.feedDerateFactor;
    maxSafeChipThin = Math.max(maxSafeChipThin, 1.0); // Never below 1.0
    
    result.chipThinningFactor = maxSafeChipThin;
    result.notes.push("⚠️ " + aeLimitCheck.note);
    result.notes.push("  Chip thinning: " + originalChipThin.toFixed(2) + "x → " + 
                      maxSafeChipThin.toFixed(2) + "x (capped for " + 
                      Math.round(aeLimitCheck.locRatio * 100) + "% LOC safety)");
  } else {
    result.chipThinningFactor = chipThin.factor;
    if (chipThin.suggestion) {
      result.notes.push(chipThin.suggestion);
    }
    if (aeLimitCheck.note && aeLimitCheck.locRatio > 0.40) {
      // Show LOC status for moderate+ engagement even if OK
      result.notes.push(aeLimitCheck.note);
    }
  }
  
  // 3. Axial depth factor - CRITICAL for 3D adaptive (lighter cuts = faster feeds)
  var isAdaptiveOp = params.is3D || params.isAdaptive;
  var axialF = calculateAxialDepthFactor(params.axialDepth, toolDia, tool.fluteLength, isFinish, isAdaptiveOp);
  result.axialFactor = axialF.factor;
  result.locRatio = axialF.locRatio; // v10.7: Track LOC engagement for safety comments
  if (axialF.suggestion) {
    result.notes.push(axialF.suggestion);
  }
  
  // 4. 3D Adaptive factor (if applicable)
  if (params.is3D || params.isAdaptive) {
    var adapt3D = calculate3DAdaptiveFactor(params.radialDepth, params.axialDepth, toolDia, params.isRoughing);
    result.adaptive3DFactor = adapt3D.factor;
    if (adapt3D.suggestion) {
      result.notes.push(adapt3D.suggestion);
    }
  }
  
  // Combine all factors
  // For ADAPTIVE operations: Only apply INCREASES - Fusion calculated optimal feed
  // For non-adaptive: Apply reductions as needed for safety
  var reductionFactors = [];
  var increaseFactors = [];
  
  [result.stickoutFactor, result.chipThinningFactor, result.axialFactor, result.adaptive3DFactor].forEach(function(f) {
    if (f < 1.0) {
      reductionFactors.push(f);
    } else if (f > 1.0) {
      increaseFactors.push(f);
    }
  });
  
  // Apply increases (average, capped)
  var increaseAvg = 1.0;
  if (increaseFactors.length > 0) {
    var sum = 0;
    increaseFactors.forEach(function(f) { sum += f; });
    increaseAvg = sum / increaseFactors.length;
    increaseAvg = Math.min(increaseAvg, getProperty("maxChipThinningMultiplier"));
  }
  
  // Apply reductions - BUT NOT FOR ADAPTIVE!
  // For adaptive toolpaths, Fusion has already calculated the optimal feed
  // based on engagement. We should only INCREASE feed, never reduce it.
  var reductionProduct = 1.0;
  if (!params.isAdaptive) {
    // Non-adaptive: apply safety reductions
    reductionFactors.forEach(function(f) { reductionProduct *= f; });
  } else {
    // Adaptive: ignore reductions - Fusion knows best
    if (reductionFactors.length > 0) {
      result.notes.push("Note: Feed reductions disabled for adaptive - using Fusion's calculated feed");
    }
  }
  
  result.combinedFactor = reductionProduct * increaseAvg;
  result.optimizedFeed = baseFeed * result.combinedFactor;
  
  // Generate speed-up suggestions
  if (params.isRoughing) {
    if (chipThin.engagementPercent < 10) {
      result.speedUpSuggestions.push("TO SPEED UP: Increase stepover to " + getProperty("roughingOptimalWOC") + "% for optimal chip load");
    }
    if (stickout.ratio < 3 && axialF.depthRatio < 1.5) {
      result.speedUpSuggestions.push("TO SPEED UP: Increase DOC to " + xyzFormat.format(toolDia * 1.5) + " (1.5xD) - tool can handle it");
    }
    if (result.combinedFactor < 0.8) {
      result.speedUpSuggestions.push("TO SPEED UP: Use shorter tool or reduce DOC to allow faster feeds");
    }
  }
  
  if (params.isFinishing) {
    if (chipThin.engagementPercent > getProperty("finishingMaxWOC")) {
      result.speedUpSuggestions.push("QUALITY TIP: Reduce stepover for better surface finish");
    }
  }
  
  return result;
}

/**
  Output optimization notes at the start of an operation.
*/
function writeOptimizationNotes(params, optimization) {
  if (!getProperty("showOptimizationNotes") || optimizationNotesOutput) {
    return;
  }
  
  optimizationNotesOutput = true;
  
  writeComment("=== FEED OPTIMIZATION ANALYSIS ===");
  writeComment("Operation: " + (params.isRoughing ? "ROUGHING" : "FINISHING") + 
               (params.isAdaptive ? " (ADAPTIVE)" : "") +
               (params.is3D ? " (3D)" : ""));
  
  // Tool info
  writeComment("Tool: D" + xyzFormat.format(tool.diameter) + 
               " FL" + xyzFormat.format(tool.fluteLength > 0 ? tool.fluteLength : tool.bodyLength) +
               " (Stickout ratio: " + xyzFormat.format(optimization.stickoutFactor < 1 ? 
                 tool.bodyLength / tool.diameter : tool.fluteLength / tool.diameter) + ":1)");
  
  // Cutting parameters
  if (params.radialDepth > 0) {
    writeComment("Radial DOC: " + xyzFormat.format(params.radialDepth) + 
                 " (" + Math.round((params.radialDepth / tool.diameter) * 100) + "% of D)");
  }
  if (params.axialDepth > 0) {
    writeComment("Axial DOC: " + xyzFormat.format(params.axialDepth) +
                 " (" + xyzFormat.format(params.axialDepth / tool.diameter) + "xD)");
  }
  
  // Factors applied
  writeComment("Feed factors: Stickout=" + xyzFormat.format(optimization.stickoutFactor) +
               " ChipThin=" + xyzFormat.format(optimization.chipThinningFactor) +
               " Axial=" + xyzFormat.format(optimization.axialFactor));
  if (params.is3D || params.isAdaptive) {
    writeComment("3D/Adaptive factor: " + xyzFormat.format(optimization.adaptive3DFactor));
  }
  writeComment("Combined multiplier: " + xyzFormat.format(optimization.combinedFactor));
  
  // Warnings
  optimization.warnings.forEach(function(w) {
    writeComment("*** " + w + " ***");
  });
  
  // Notes
  optimization.notes.forEach(function(n) {
    writeComment(n);
  });
  
  // Speed-up suggestions
  if (optimization.speedUpSuggestions.length > 0) {
    writeComment("--- OPTIMIZATION SUGGESTIONS ---");
    optimization.speedUpSuggestions.forEach(function(s) {
      writeComment(s);
    });
  }
  
  writeComment("=================================");
}

/** Cached cutting parameters and optimization for current section */
var cachedCuttingParams = null;
var cachedOptimization = null;
var currentCuttingZ = 0; // Track current Z for dynamic depth feed calculation

function getFeed(f) {
  // =========================================================================
  // v10.9: DRILLING BYPASS - Return Fusion feed unmodified for drilling ops
  // =========================================================================
  if (getProperty("prismExcludeDrillingFromMultipliers") !== false) {
    if (typeof PRISM_PHYSICS !== "undefined" && PRISM_PHYSICS.isDrillingOperation && 
        PRISM_PHYSICS.isDrillingOperation("all")) {
      return feedOutput.format(f);  // Return Fusion's programmed feed formatted with F prefix, no PRISM modifications
    }
  }
  
  // =========================================================================
  // PRISM FEED OVERRIDE - Check if PRISM has calculated an optimized feed
  // This takes priority over Fusion's programmed feed when enabled
  // =========================================================================
  if (typeof currentSection !== "undefined" && currentSection.prismOverrideFeed) {
    var overrideFeed = currentSection.prismOverrideFeed;
    // Only use override if it's valid and different from 0
    if (overrideFeed && !isNaN(overrideFeed) && overrideFeed > 0) {
      f = overrideFeed;  // Replace Fusion feed with PRISM calculated feed
    }
  }
  
  // Get or cache cutting parameters for this section
  if (cachedCuttingParams == null && getProperty("prismEnableIntelligence")) {
    cachedCuttingParams = getCuttingParameters();
    cachedOptimization = calculateOptimizedFeed(f, cachedCuttingParams);
  }
  
  // DYNAMIC DEPTH FEED ADJUSTMENT - KEY FOR FAST ADAPTIVE!
  // This INCREASES feed when cutting shallow and maintains feed at full depth
  if (getProperty("useDynamicDepthFeed") && dynamicDepthEnabled) {
    f = calculateDynamicDepthFeed(currentCuttingZ, f);
  }
  
  // Apply advanced feed optimization based on cutting parameters
  if (getProperty("prismEnableIntelligence") && cachedOptimization != null) {
    f = f * cachedOptimization.combinedFactor;
  }
  
  // Apply feedrate multiplier based on current movement type
  f = applyFeedMultiplier(f, movement);
  
  // Apply Prism Enhanced feed adjustments (arc correction, direction changes, ramping)
  if (getProperty("usePrismEnhancedFeed")) {
    f = applyPrismEnhancedFeed(f, prismEnhancedIsArc, prismEnhancedArcRadius, 
                            prismCurrentPos, prismMoveDistance);
  }
  
  // Apply min/max limits
  f = applyFeedLimits(f);

  // v11: Round feed to format precision to prevent IEEE-754 chain artifacts (Bug 10)
  // Multiple multiplications (chip thinning * deflection * power * accel * arc * direction)
  // accumulate floating-point error, producing values like 123.45678901234.
  // feedOutput.format() handles display, but modal comparison uses raw values —
  // rounding here prevents spurious F-word output from epsilon differences.
  var _feedPrec = (unit == MM) ? 10 : 100; // 1 decimal MM, 2 decimal inch
  f = Math.round(f * _feedPrec) / _feedPrec;

  // Track movement type for comments
  var newMovementType = getMovementDescription(movement);
  var feedChanged = (currentMovementType != newMovementType);
  currentMovementType = newMovementType;
  
  // Output feedrate comment if enabled and movement type changed
  if (getProperty("showFeedComments") && feedChanged) {
    var extraInfo = "";
    if (getProperty("usePrismEnhancedFeed") && prismEnhancedIsArc && prismEnhancedArcRadius > 0) {
      extraInfo = " R" + xyzFormat.format(prismEnhancedArcRadius);
    }
    if (getProperty("useDynamicDepthFeed") && dynamicDepthEnabled) {
      extraInfo += " Z" + xyzFormat.format(currentCuttingZ);
    }
    writeComment("FEED: " + newMovementType + " F" + feedFormat.format(f) + extraInfo);
  }
  
  // Force feedrate output on every line for dynamic/adaptive feeds
  if (getProperty("forceFeedOutput") || getProperty("usePrismEnhancedFeed") || 
      (getProperty("useDynamicDepthFeed") && dynamicDepthEnabled)) {
    feedOutput.reset();
    return feedOutput.format(f);
  }
  
  // PPG-HARDEN U-PH06: Apply prove-out feed derating
  if (typeof currentSection !== "undefined" && currentSection.prismProveOutFeedFactor &&
      currentSection.prismProveOutFeedFactor < 1.0) {
    f = f * currentSection.prismProveOutFeedFactor;
  }

  // Normal modal feedrate handling
  if (activeMovements) {
    var feedContext = activeMovements[movement];
    if (feedContext != undefined) {
      if (!feedFormat.areDifferent(feedContext.feed, f)) {
        if (feedContext.id == currentFeedId) {
          return ""; // nothing has changed
        }
        forceFeed();
        currentFeedId = feedContext.id;
        return "F#" + (firstFeedParameter + feedContext.id);
      }
    }
    currentFeedId = undefined; // force Q feed next time
  }
  return feedOutput.format(f); // use feed value
}

function initializeActiveFeeds() {
  activeMovements = new Array();
  var movements = currentSection.getMovements();

  var id = 0;
  var activeFeeds = new Array();
  if (hasParameter("operation:tool_feedCutting")) {
    if (movements & ((1 << MOVEMENT_CUTTING) | (1 << MOVEMENT_LINK_TRANSITION) | (1 << MOVEMENT_EXTENDED))) {
      var feedContext = new FeedContext(id, localize("Cutting"), getParameter("operation:tool_feedCutting"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_CUTTING] = feedContext;
      activeMovements[MOVEMENT_LINK_TRANSITION] = feedContext;
      activeMovements[MOVEMENT_EXTENDED] = feedContext;
    }
    ++id;
    if (movements & (1 << MOVEMENT_PREDRILL)) {
      feedContext = new FeedContext(id, localize("Predrilling"), getParameter("operation:tool_feedCutting"));
      activeMovements[MOVEMENT_PREDRILL] = feedContext;
      activeFeeds.push(feedContext);
    }
    ++id;
  }

  if (hasParameter("operation:finishFeedrate")) {
    if (movements & (1 << MOVEMENT_FINISH_CUTTING)) {
      var feedContext = new FeedContext(id, localize("Finish"), getParameter("operation:finishFeedrate"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_FINISH_CUTTING] = feedContext;
    }
    ++id;
  } else if (hasParameter("operation:tool_feedCutting")) {
    if (movements & (1 << MOVEMENT_FINISH_CUTTING)) {
      var feedContext = new FeedContext(id, localize("Finish"), getParameter("operation:tool_feedCutting"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_FINISH_CUTTING] = feedContext;
    }
    ++id;
  }

  if (hasParameter("operation:tool_feedEntry")) {
    if (movements & (1 << MOVEMENT_LEAD_IN)) {
      var feedContext = new FeedContext(id, localize("Entry"), getParameter("operation:tool_feedEntry"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_LEAD_IN] = feedContext;
    }
    ++id;
  }

  if (hasParameter("operation:tool_feedExit")) {
    if (movements & (1 << MOVEMENT_LEAD_OUT)) {
      var feedContext = new FeedContext(id, localize("Exit"), getParameter("operation:tool_feedExit"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_LEAD_OUT] = feedContext;
    }
    ++id;
  }

  if (hasParameter("operation:noEngagementFeedrate")) {
    if (movements & (1 << MOVEMENT_LINK_DIRECT)) {
      var feedContext = new FeedContext(id, localize("Direct"), getParameter("operation:noEngagementFeedrate"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_LINK_DIRECT] = feedContext;
    }
    ++id;
  } else if (hasParameter("operation:tool_feedCutting") &&
             hasParameter("operation:tool_feedEntry") &&
             hasParameter("operation:tool_feedExit")) {
    if (movements & (1 << MOVEMENT_LINK_DIRECT)) {
      var feedContext = new FeedContext(id, localize("Direct"), Math.max(getParameter("operation:tool_feedCutting"), getParameter("operation:tool_feedEntry"), getParameter("operation:tool_feedExit")));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_LINK_DIRECT] = feedContext;
    }
    ++id;
  }

  if (hasParameter("operation:reducedFeedrate")) {
    if (movements & (1 << MOVEMENT_REDUCED)) {
      var feedContext = new FeedContext(id, localize("Reduced"), getParameter("operation:reducedFeedrate"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_REDUCED] = feedContext;
    }
    ++id;
  }

  if (hasParameter("operation:tool_feedRamp")) {
    if (movements & ((1 << MOVEMENT_RAMP) | (1 << MOVEMENT_RAMP_HELIX) | (1 << MOVEMENT_RAMP_PROFILE) | (1 << MOVEMENT_RAMP_ZIG_ZAG))) {
      var feedContext = new FeedContext(id, localize("Ramping"), getParameter("operation:tool_feedRamp"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_RAMP] = feedContext;
      activeMovements[MOVEMENT_RAMP_HELIX] = feedContext;
      activeMovements[MOVEMENT_RAMP_PROFILE] = feedContext;
      activeMovements[MOVEMENT_RAMP_ZIG_ZAG] = feedContext;
    }
    ++id;
  }
  if (hasParameter("operation:tool_feedPlunge")) {
    if (movements & (1 << MOVEMENT_PLUNGE)) {
      var feedContext = new FeedContext(id, localize("Plunge"), getParameter("operation:tool_feedPlunge"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_PLUNGE] = feedContext;
    }
    ++id;
  }
  if (true) { // high feed
    if ((movements & (1 << MOVEMENT_HIGH_FEED)) || (highFeedMapping != HIGH_FEED_NO_MAPPING)) {
      var feed;
      if (hasParameter("operation:highFeedrateMode") && getParameter("operation:highFeedrateMode") != "disabled") {
        feed = getParameter("operation:highFeedrate");
      } else {
        feed = this.highFeedrate;
      }
      var feedContext = new FeedContext(id, localize("High Feed"), feed);
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_HIGH_FEED] = feedContext;
      activeMovements[MOVEMENT_RAPID] = feedContext;
    }
    ++id;
  }

  for (var i = 0; i < activeFeeds.length; ++i) {
    var feedContext = activeFeeds[i];
    writeBlock("#" + (firstFeedParameter + feedContext.id) + "=" + feedFormat.format(feedContext.feed), formatComment(feedContext.description));
  }
}

var currentWorkPlaneABC = undefined;
var currentWorkPlaneUVW = undefined; // right vector from workplane matrix

function forceWorkPlane() {
  currentWorkPlaneABC = undefined;
  currentWorkPlaneUVW = undefined;
}

function cancelWorkPlane(force) {
  if (force) {
    gRotationModal.reset();
  }
  writeBlock(gRotationModal.format(69)); // cancel frame
  forceWorkPlane();
}

function setWorkPlane(abc) {
  if (!forceMultiAxisIndexing && is3D() && !machineConfiguration.isMultiAxisConfiguration()) {
    return; // ignore
  }
  if (forceMultiAxisIndexing) {
    forceWorkPlane();
  }

  var W = currentSection.workPlane;
  if (machineConfiguration.isMultiAxisConfiguration()) {
    if (!((currentWorkPlaneABC == undefined) ||
        abcFormat.areDifferent(abc.x, currentWorkPlaneABC.x) ||
        abcFormat.areDifferent(abc.y, currentWorkPlaneABC.y) ||
        abcFormat.areDifferent(abc.z, currentWorkPlaneABC.z))) {
      return; // ignore, no change
    }
  } else {
    if (!((currentWorkPlaneABC == undefined || currentWorkPlaneUVW == undefined) ||
        ijkFormat.areDifferent(W.up.x, currentWorkPlaneABC.x) ||
        ijkFormat.areDifferent(W.up.y, currentWorkPlaneABC.y) ||
        ijkFormat.areDifferent(W.up.z, currentWorkPlaneABC.z) ||
        ijkFormat.areDifferent(W.right.x, currentWorkPlaneUVW.x) ||
        ijkFormat.areDifferent(W.right.y, currentWorkPlaneUVW.y) ||
        ijkFormat.areDifferent(W.right.z, currentWorkPlaneUVW.z))) {
      return; // ignore, no change
    }
  }

  onCommand(COMMAND_UNLOCK_MULTI_AXIS);

  if (useMultiAxisFeatures) {
    if (true) { // we don't want to use G69 for reset alone
      writeBlock(gFormat.format(0), mFormat.format(140)); // retract along tool vector
      cancelWorkPlane(true); // cancel frame
      gMotionModal.reset();
      var initialPosition = getFramePosition(currentSection.getInitialPosition()); // TAG
      if (useVectorOutput) {
        writeBlock(
          gFormat.format(68.2),
          "X" + xyzFormat.format(currentSection.workOrigin.x),
          "Y" + xyzFormat.format(currentSection.workOrigin.y),
          "Z" + xyzFormat.format(currentSection.workOrigin.z),
          "I" + ijkFormat.format(W.right.x), "J" + ijkFormat.format(W.right.y), "K" + ijkFormat.format(W.right.z),
          "U" + ijkFormat.format(W.up.x), "V" + ijkFormat.format(W.up.y), "W" + ijkFormat.format(W.up.z)
        ); // set frame
        var d = currentSection.getInitialToolAxis();
        writeBlock(
          gMotionModal.format(0), gFormat.format(8.2),
          xOutput.format(initialPosition.x), yOutput.format(initialPosition.y), zOutput.format(initialPosition.z),
          "I" + ijkFormat.format(d.x), "J" + ijkFormat.format(d.y), "K" + ijkFormat.format(d.z)
        );
      } else {
        var workPlaneCode = 68.2;
        if (machineConfiguration.getNumberOfAxes() == 5 &&
            machineConfiguration.getAxisU().getCoordinate() > machineConfiguration.getAxisV().getCoordinate()) {
          workPlaneCode = 68.3;
        }
        setCurrentABC(abc); // required for machine simulation
        writeBlock(
          gFormat.format(workPlaneCode),
          "X" + xyzFormat.format(currentSection.workOrigin.x),
          "Y" + xyzFormat.format(currentSection.workOrigin.y),
          "Z" + xyzFormat.format(currentSection.workOrigin.z),
          conditional(machineConfiguration.isMachineCoordinate(0), "A" + abcFormat.format(abc.x)),
          conditional(machineConfiguration.isMachineCoordinate(1), "B" + abcFormat.format(abc.y)),
          conditional(machineConfiguration.isMachineCoordinate(2), "C" + abcFormat.format(abc.z))
        ); // set frame
        writeBlock(
          gMotionModal.format(0), gFormat.format(8.2),
          xOutput.format(initialPosition.x),
          yOutput.format(initialPosition.y),
          zOutput.format(initialPosition.z),
          conditional(machineConfiguration.isMachineCoordinate(0), "A" + abcFormat.format(abc.x)),
          conditional(machineConfiguration.isMachineCoordinate(1), "B" + abcFormat.format(abc.y)),
          conditional(machineConfiguration.isMachineCoordinate(2), "C" + abcFormat.format(abc.z))
        );
      }
      // writeBlock(mFormat.format(141));
    } else {
      cancelWorkPlane(); // cancel frame
    }
  } else {
    gMotionModal.reset();
    positionABC(abc, true);
  }

  onCommand(COMMAND_LOCK_MULTI_AXIS);

  if (machineConfiguration.isMultiAxisConfiguration()) {
    currentWorkPlaneABC = abc;
  } else {
    currentWorkPlaneABC = W.up;
    currentWorkPlaneUVW = W.right;
  }
}

function positionABC(abc, force) {
  if (typeof unwindABC == "function") {
    unwindABC(abc, false);
  }
  if (force) {
    forceABC();
  }
  var a = aOutput.format(abc.x);
  var b = bOutput.format(abc.y);
  var c = cOutput.format(abc.z);
  if (a || b || c) {
    if (!retractedZ) {
      if (typeof moveToSafeRetractPosition == "function") {
        moveToSafeRetractPosition();
      } else {
        writeRetract(Z);
      }
    }
    onCommand(COMMAND_UNLOCK_MULTI_AXIS);
    gMotionModal.reset();
    writeBlock(gMotionModal.format(0), a, b, c);
    currentMachineABC = new Vector(abc);
    if (getCurrentSectionId() != -1) {
      setCurrentABC(abc); // required for machine simulation
    }
  }
}

var closestABC = false; // choose closest machine angles
var currentMachineABC;

function getWorkPlaneMachineABC(workPlane) {
  var W = workPlane; // map to global frame

  var abc = machineConfiguration.getABC(W);
  if (closestABC) {
    if (currentMachineABC) {
      abc = machineConfiguration.remapToABC(abc, currentMachineABC);
    } else {
      abc = machineConfiguration.getPreferredABC(abc);
    }
  } else {
    abc = machineConfiguration.getPreferredABC(abc);
  }

  try {
    abc = machineConfiguration.remapABC(abc);
    currentMachineABC = abc;
  } catch (e) {
    error(
      localize("Machine angles not supported") + ":"
      + conditional(machineConfiguration.isMachineCoordinate(0), " A" + abcFormat.format(abc.x))
      + conditional(machineConfiguration.isMachineCoordinate(1), " B" + abcFormat.format(abc.y))
      + conditional(machineConfiguration.isMachineCoordinate(2), " C" + abcFormat.format(abc.z))
    );
  }

  var direction = machineConfiguration.getDirection(abc);
  if (!isSameDirection(direction, W.forward)) {
    error(localize("Orientation not supported."));
  }

  if (!machineConfiguration.isABCSupported(abc)) {
    error(
      localize("Work plane is not supported") + ":"
      + conditional(machineConfiguration.isMachineCoordinate(0), " A" + abcFormat.format(abc.x))
      + conditional(machineConfiguration.isMachineCoordinate(1), " B" + abcFormat.format(abc.y))
      + conditional(machineConfiguration.isMachineCoordinate(2), " C" + abcFormat.format(abc.z))
    );
  }

  var tcp = false;
  cancelTransformation();
  if (tcp) {
    setRotation(W); // TCP mode
  } else {
    var O = machineConfiguration.getOrientation(abc);
    var R = machineConfiguration.getRemainingOrientation(abc, W);
    var rotate = true;
    var axis = machineConfiguration.getAxisV();
    if (axis.isEnabled() && axis.isTable()) {
      var ix = axis.getCoordinate();
      var rotAxis = axis.getAxis();
      if (isSameDirection(machineConfiguration.getDirection(abc), rotAxis) ||
          isSameDirection(machineConfiguration.getDirection(abc), Vector.product(rotAxis, -1))) {
        var direction = isSameDirection(machineConfiguration.getDirection(abc), rotAxis) ? 1 : -1;
        abc.setCoordinate(ix, Math.atan2(R.right.y, R.right.x) * direction);
        rotate = false;
      }
    }
    if (rotate) {
      setRotation(R);
    }
  }

  return abc;
}

/**
 * Output PRISM optimization header for current section
 * Shows active optimizations and recommendations
 */
function writePrismOptimizationHeader(section) {
    if (getProperty("showOptimizationNotes")) {
        writeComment("==============================================");
        writeComment("PRISM ENHANCED ROUGHING TECHNOLOGY");
        writeComment("==============================================");
        
        var params = getCuttingParameters();
        
        // Show active features
        var activeFeatures = [];
        if (getProperty("usePrismEnhancedFeed")) activeFeatures.push("Variable Feed");
        if ((getProperty("prismChipThinFormula") !== "off")) activeFeatures.push("Chip Thinning");
        if (getProperty("useDynamicDepthFeed")) activeFeatures.push("Dynamic Depth");
        if (getProperty("prismEnableIntelligence")) activeFeatures.push("Advanced Opt");
        
        if (activeFeatures.length > 0) {
            writeComment("ACTIVE: " + activeFeatures.join(", "));
        }
        
        // Show operation type
        var opType = params.isAdaptive ? "3D ADAPTIVE" : 
                     params.isRoughing ? "ROUGHING" : "FINISHING";
        writeComment("OPERATION: " + opType);
        
        // Show aggressiveness level (v10.5: per-tool)
        if (getProperty("usePrismEnhancedFeed")) {
            var level = 5;
            if (tool && tool.number >= 1 && tool.number <= 24) {
                try { level = getProperty("prismT" + tool.number + "Aggressiveness") || 5; } catch(e) {}
            }
            var levelDesc = level <= 2 ? "CONSERVATIVE" : 
                           level <= 4 ? "MODERATE" :
                           level <= 6 ? "AGGRESSIVE" : "MAXIMUM MRR";
            writeComment("AGGRESSIVENESS: Level " + level + " " + levelDesc + " [T" + tool.number + "]");
        }
        
        writeComment("==============================================");
    }
}

function onSection() {
  // Output PRISM optimization header
  if (isFirstSection()) {
    writePrismOptimizationHeader(currentSection);
  }

  // Reset cached parameters for new section
  cachedCuttingParams = null;
  cachedOptimization = null;
  optimizationNotesOutput = false;
  
  // Reset prism state for new section
  previousPosition = null;
  previousDirection = null;
  previousFeed = 0;
  
  // Initialize dynamic depth tracking for this section
  // This enables feed INCREASE when cutting shallow on adaptive toolpaths
  if (getProperty("useDynamicDepthFeed")) {
    var tempParams = getCuttingParameters();
    initializeDynamicDepth(tempParams);
  }
  
  var insertToolCall = isFirstSection() ||
    currentSection.getForceToolChange && currentSection.getForceToolChange() ||
    (tool.number != getPreviousSection().getTool().number);

  retractedX = false; // reset per-axis retract state on section start
  retractedY = false;
  retractedZ = false;

  // v11 S7/S8: Reset thermal + safety state on tool change
  if (insertToolCall) {
    PRISM_THERMAL.resetTool(tool.number);
    PRISM_SAFETY.setSpindleRunning(false);
    PRISM_SAFETY.setG43Active(false);
  }
  var newWorkOffset = isFirstSection() ||
    (getPreviousSection().workOffset != currentSection.workOffset); // work offset changes
  var newWorkPlane = isFirstSection() ||
    !isSameDirection(getPreviousSection().getGlobalFinalToolAxis(), currentSection.getGlobalInitialToolAxis()) ||
    (currentSection.isOptimizedForMachine() && getPreviousSection().isOptimizedForMachine() &&
      Vector.diff(getPreviousSection().getFinalToolAxisABC(), currentSection.getInitialToolAxisABC()).length > 1e-4) ||
    (!machineConfiguration.isMultiAxisConfiguration() && currentSection.isMultiAxis()) ||
    (!getPreviousSection().isMultiAxis() && currentSection.isMultiAxis() ||
      getPreviousSection().isMultiAxis() && !currentSection.isMultiAxis()); // force newWorkPlane between indexing and simultaneous operations
  if (insertToolCall || newWorkOffset || newWorkPlane) {

    // stop spindle before retract during tool change
    if (insertToolCall && !isFirstSection()) {
      onCommand(COMMAND_STOP_SPINDLE);
    }

    // Determine retract method
    // Use minimum retract when: changing work offset, NOT changing tools, and feature is enabled
    var useMinRetract = getProperty("useMinimumZRetract") && 
                        newWorkOffset && 
                        !insertToolCall && 
                        !isFirstSection();
    
    if (useMinRetract) {
      // Minimum retract - only go to clearance above stock
      writeMinimumRetract();
    } else {
      // Full retract to safe plane (G28 or configured method)
      writeRetract(Z);
    }
    forceXYZ();

    // Head axes need to return to 0 for tool change
    if (insertToolCall && !isFirstSection() && machineConfiguration.isHeadConfiguration()) {
      var resetAxes = getCurrentDirection();
      var axes = [machineConfiguration.getAxisU(), machineConfiguration.getAxisV(), machineConfiguration.getAxisW()];
      for (var i = 0; i < axes.length; ++i) {
        if (axes[i].isEnabled() && axes[i].isHead()) {
          resetAxes.setCoordinate(axes[i].getCoordinate(), 0);
        }
      }
      positionABC(resetAxes, false);
    }

    // save tool change position
    if (insertToolCall && !isFirstSection()) {
      if (getProperty("toolChangePositionX") || getProperty("toolChangePositionY")) {
        writeBlock(gFormat.format(53), conditional(getProperty("toolChangePositionX"), "X" + xyzFormat.format(0)), conditional(getProperty("toolChangePositionY"), "Y" + xyzFormat.format(0)));
      }
    }
  }

  if (hasParameter("operation-comment")) {
    var comment = getParameter("operation-comment");
    if (comment) {
      writeComment(comment);
    }
  }

  // Show estimated cycle time for the operation
  if (getProperty("showEstimatedTime")) {
    var cycleTime = currentSection.getCycleTime();
    if (cycleTime > 0) {
      var minutes = Math.floor(cycleTime / 60);
      var seconds = Math.round(cycleTime % 60);
      writeComment("EST. TIME: " + minutes + " MIN " + seconds + " SEC");
    }
  }
  
  // Show operation strategy if available
  if (getProperty("showOperationStrategy")) {
    if (hasParameter("operation-strategy")) {
      var strategy = getParameter("operation-strategy").toUpperCase();
      writeComment("STRATEGY: " + strategy);
    }
  }

  if (getProperty("showNotes") && hasParameter("notes")) {
    var notes = getParameter("notes");
    if (notes) {
      var lines = String(notes).split("\n");
      var r1 = new RegExp("^[\\s]+", "g");
      var r2 = new RegExp("[\\s]+$", "g");
      for (line in lines) {
        var comment = lines[line].replace(r1, "").replace(r2, "");
        if (comment) {
          writeComment(comment);
        }
      }
    }
  }

  // Output advanced feed optimization analysis
  if (getProperty("prismEnableIntelligence") && getProperty("showOptimizationNotes")) {
    var cuttingParams = getCuttingParameters();
    // Use a representative feed for analysis (cutting feed)
    var baseFeed = hasParameter("operation:tool_feedCutting") ? getParameter("operation:tool_feedCutting") : 0;
    if (baseFeed > 0) {
      var optimization = calculateOptimizedFeed(baseFeed, cuttingParams);
      writeOptimizationNotes(cuttingParams, optimization);
      // Cache for use in getFeed
      cachedCuttingParams = cuttingParams;
      cachedOptimization = optimization;
    }
  }

  if (insertToolCall) {
    forceWorkPlane();

    if (!isFirstSection()) {
      setCoolant(COOLANT_OFF);
      if (getProperty("optionalStop")) {
        onCommand(COMMAND_OPTIONAL_STOP);
      }
    }

    if (tool.number > 99) {
      warning(localize("Tool number exceeds maximum value."));
    }

    // v11 S10 U-PBL29: Custom M-code BEFORE tool change
    var mBefore = getProperty("mCodeBeforeToolChange");
    if (mBefore && mBefore.length > 0) {
      writeBlock(mBefore, formatComment("CUSTOM PRE-TOOL-CHANGE"));
    }

    writeBlock(gFormat.format(49), formatComment("CANCEL TOOL LENGTH OFFSET BEFORE TOOL CHANGE"));
    writeToolBlock("T" + toolFormat.format(tool.number), mFormat.format(6));

    // v11 S10 U-PBL29: Custom M-code AFTER tool change
    var mAfter = getProperty("mCodeAfterToolChange");
    if (mAfter && mAfter.length > 0) {
      writeBlock(mAfter, formatComment("CUSTOM POST-TOOL-CHANGE"));
    }
    if (tool.comment) {
      writeComment(tool.comment);
    }
    
    // v10.5: Sister tool comment for lights-out production
    if (getProperty("prismEnableSisterTools")) {
      var sisterTool = PRISM_LIGHTS_OUT.getSisterTool(tool.number, getProperty("prismSisterToolOffset"));
      var toolLife = getProperty("prismToolLifeMinutes");
      writeComment("SISTER TOOL: T" + tool.number + " -> T" + sisterTool + " (life=" + toolLife + "min)");
    }
    
    // v11: Smoothing moved to per-section call (below insertToolCall block)
    // to fix Bug 12 — same-tool finishing sections were inheriting roughing P value
    
    var showToolZMin = false;
    if (showToolZMin) {
      if (is3D()) {
        var numberOfSections = getNumberOfSections();
        var zRange = currentSection.getGlobalZRange();
        var number = tool.number;
        for (var i = currentSection.getId() + 1; i < numberOfSections; ++i) {
          var section = getSection(i);
          if (section.getTool().number != number) {
            break;
          }
          zRange.expandToRange(section.getGlobalZRange());
        }
        writeComment(localize("ZMIN") + "=" + zRange.getMinimum());
      }
    }

    if (getProperty("preloadTool")) {
      var nextTool = getNextTool(tool.number);
      if (nextTool) {
        writeBlock("T" + toolFormat.format(nextTool.number));
      } else {
        // preload first tool
        var section = getSection(0);
        var firstToolNumber = section.getTool().number;
        if (tool.number != firstToolNumber) {
          writeBlock("T" + toolFormat.format(firstToolNumber));
        }
      }
    }
    if (tool.type == TOOL_PROBE) {
      if (getProperty("isnc")) {
        writeBlock(mFormat.format(19)); // spindle orientation
        writeBlock(mFormat.format(26)); // select the part probe, M27 is selecting the tool probe
        writeBlock(mFormat.format(41)); // Single touch probing, M42 is 2 touch probing
      } else {
        error(localize("Probing or surface inspection is only allowed in ISNC mode!"));
      }
    }
  }

  var spindleChanged = tool.type != TOOL_PROBE &&
    (insertToolCall || forceSpindleSpeed || isFirstSection() ||
    (rpmFormat.areDifferent(spindleSpeed, sOutput.getCurrent())) ||
    (tool.clockwise != getPreviousSection().getTool().clockwise));
  if (spindleChanged) {
    forceSpindleSpeed = false;

    if (spindleSpeed < 1) {
      error(localize("Spindle speed out of range."));
      return;
    }
    if (spindleSpeed > 65535) {
      warning(localize("Spindle speed exceeds maximum value."));
    }
    // PRISM RPM will be calculated below - defer spindle output
    var outputRPM = spindleSpeed;
    var prismSpindleCalculated = false;

  // ===========================================================================
  // PRISM MANUFACTURING INTELLIGENCE - SPEED/FEED CALCULATION
  // MOVED BEFORE SPINDLE OUTPUT so we can apply the calculated RPM!
  // ===========================================================================
  try {
  // ===========================================================================
  if (getProperty("prismEnableIntelligence") && typeof PRISM_PHYSICS !== 'undefined') {
    var prismToolNum = tool.number;
    if (prismToolNum >= 1 && prismToolNum <= 24) {
      var prismEnabled = getProperty("prismEnableIntelligence") && prismToolNum <= 24;
      if (prismEnabled === undefined || prismEnabled === true) {
        // =====================================================================
        // v10: PER-OPERATION OPTIMIZATION VIA COMMENTS
        // Add to operation comment in Fusion: "PRISM:conservative" or "PRISM:aggressive"
        // This overrides per-tool and global settings for this operation only
        // =====================================================================
        var operationOptOverride = null;
        if (hasParameter("operation-comment")) {
          var opComment = getParameter("operation-comment").toLowerCase();
          if (opComment.indexOf("prism:conservative") >= 0) {
            operationOptOverride = "tool_life";
          } else if (opComment.indexOf("prism:balanced") >= 0) {
            operationOptOverride = "balanced";
          } else if (opComment.indexOf("prism:productivity") >= 0) {
            operationOptOverride = "productivity";
          } else if (opComment.indexOf("prism:aggressive") >= 0 || opComment.indexOf("prism:max") >= 0) {
            operationOptOverride = "max_mrr";
          }
        }
        
        // Get material selection — v11 S4: auto-detect from Fusion first, then property
        var materialGroup = getProperty("prismMaterialGroup") || "P";
        var materialSpecific = getProperty("prismMaterialSpecific") || "";
        var materialId = materialSpecific || (materialGroup + "_DEFAULT");
        var autoMat = autoDetectFusionMaterial();
        var hardnessHRC = 0;
        if (autoMat.source === "fusion-auto" || autoMat.source === "fusion-unknown") {
          materialId = autoMat.materialId;
          materialGroup = autoMat.isoGroup;
          if (autoMat.warning) {
            writeComment("WARNING: " + autoMat.warning);
          } else {
            writeComment("MATERIAL AUTO-DETECTED: " + materialId + " (ISO " + materialGroup + ") from Fusion");
          }
          // Try to read hardness from Fusion
          try { hardnessHRC = parseFloat(getGlobalParameter("material-hardness")) || 0; } catch(e) {}
        }
        // Apply hardness speed derating
        var hardnessFactor = calcHardnessSpeedFactor(hardnessHRC);
        // Coolant hint for this material group
        var coolantHint = getMaterialCoolantHint(materialGroup);
        if (coolantHint && autoMat.source !== "property") {
          writeComment("COOLANT: " + coolantHint.coolant.toUpperCase() + " (" + coolantHint.coolantCode + ") — " + coolantHint.finishHint);
        }
        
        // Determine toolpath strategy FIRST (needed for calculateAll)
        var strategy = "general";
        if (currentSection.strategy) {
          strategy = currentSection.strategy;
        } else if (hasParameter("operation-strategy")) {
          strategy = getParameter("operation-strategy");
        }
        
        // Get optimization mode - Priority: operation > tool > global
        var globalOptMode = getProperty("prismOptimizationMode") || "balanced";
        var optMode = operationOptOverride || globalOptMode;
        
        // Calculate optimized parameters (tool config may further override)
        // CRITICAL: PRISM works in metric - convert tool diameter if document is in inches
        var diameterMM = (unit == IN) ? tool.diameter * 25.4 : tool.diameter;
        var prismCalc = PRISM_PHYSICS.calculateAll(
          materialId,
          prismToolNum,
          strategy,
          optMode,
          diameterMM,
          spindleSpeed,
          (unit == IN) ? (currentSection.getParameter("movement:feed") || 0) * 25.4 : (currentSection.getParameter("movement:feed") || 0),  // Convert feed to mm/min
          tool,           // Pass Fusion tool object
          currentSection  // Pass current section for operation params
        );
        
        // Store for use in feed output
        currentSection.prismCalc = prismCalc;
        
        // Get tool configuration - MUST be after prismCalc so we get the modified values
        var toolConfig = (prismCalc && prismCalc.toolConfig) ? prismCalc.toolConfig : PRISM_PHYSICS.getToolConfig(prismToolNum);
        
        // Apply calculations to G-code if enabled
        var applyMode = getProperty("prismApplyCalculations") || "advisory";
        
        // v10.9: Bypass PRISM speed/feed override entirely for drilling operations
        var bypassPrismForDrilling = false;
        if (getProperty("prismExcludeDrillingFromMultipliers") !== false) {
          // Check if this is a drilling operation
          if (PRISM_PHYSICS.isDrillingOperation("all")) {
            bypassPrismForDrilling = true;
            writeComment("PRISM: Drilling detected - using Fusion speeds/feeds (bypass active)");
          }
        }
        
        if (applyMode !== "advisory" && prismCalc.valid && !bypassPrismForDrilling) {
          var prismRPM = prismCalc.speed.rpm;
          var prismFeedMM = prismCalc.feed.feedRate;

          // v11 S4 U-PBL10: Apply hardness-based speed derating
          if (hardnessFactor < 1.0) {
            prismRPM = Math.round(prismRPM * hardnessFactor);
            writeComment("HARDNESS DERATING: HRC " + hardnessHRC + " → speed x" + hardnessFactor.toFixed(2));
          }
          
          // Convert feed to document units
          var prismFeed = prismFeedMM;
          if (unit === IN) {
            prismFeed = prismFeedMM / 25.4; // mm/min to in/min
          }
          
          // Smart mode - limit changes to +/-30% of programmed values
          if (applyMode === "smart") {
            var maxRPM = spindleSpeed * 1.30;
            var minRPM = spindleSpeed * 0.70;
            prismRPM = Math.max(minRPM, Math.min(maxRPM, prismRPM));

            // Get programmed feed in document units for smart clamping
            var progFeed = hasParameter("operation:tool_feedCutting") ? getParameter("operation:tool_feedCutting") : prismFeed;
            var maxFeed = progFeed * 1.30;
            var minFeed = progFeed * 0.70;
            prismFeed = Math.max(minFeed, Math.min(maxFeed, prismFeed));
          }
          
          // Store for spindle and feed output
          if (applyMode === "speed_only" || applyMode === "both" || applyMode === "smart") {
            currentSection.prismOverrideRPM = Math.round(prismRPM);
            outputRPM = currentSection.prismOverrideRPM;
            prismSpindleCalculated = true;
          }
          if (applyMode === "feed_only" || applyMode === "both" || applyMode === "smart") {
            // Round to feed format precision to prevent IEEE-754 artifacts from unit conversion
            var _fp = (unit == MM) ? 10 : 100;
            currentSection.prismOverrideFeed = Math.round(prismFeed * _fp) / _fp;
          }
        }
        
        // Output PRISM comments if enabled
        var detailLevel = getProperty("prismOutputDetail") || "standard";
        if (detailLevel !== "none" && prismCalc.valid) {
          var unitSys = getProperty("prismUnitSystem") || "inch";
          var comments = [];
          
          // Tool info
          // Show tool info with Fusion parameters
          var toolDesc = "PRISM T" + prismToolNum + ": ";
          if (toolConfig.indexable) {
            toolDesc += toolConfig.insertStyle.replace(/_/g, " ");
          } else {
            toolDesc += (toolConfig.brand !== "generic" ? toolConfig.brand + " " : "") + toolConfig.type;
          }
          comments.push(toolDesc);
          
          // DEBUG: Show strategy and mode detection
          // Debug: Show hsmMode override info
          if (toolConfig.hsmModeOverrideDebug) {
            comments.push("  hsmMode override: " + toolConfig.hsmModeOverrideDebug.before + " -> " + toolConfig.hsmModeOverrideDebug.after + " (from strategy: " + toolConfig.hsmModeOverrideDebug.strategy + ")");
          }
          comments.push("  Strategy: " + strategy + ", hsmMode: " + (toolConfig.hsmMode || "not_set") + ", finishMode: " + (toolConfig.finishMode || "not_set"));
          // DEBUG: Show engagement values and sources
          var aeDebug = toolConfig.radialDOC ? toolConfig.radialDOC.toFixed(3) : "?";
          // Show lead angle detection for high feed mills
          if (toolConfig.leadAngle && toolConfig.leadAngle !== "45" && toolConfig.leadAngle !== "90") {
            var leadData = PRISM_PHYSICS.leadAngleData[toolConfig.leadAngle] || {};
            comments.push("  Lead Angle: " + toolConfig.leadAngle + "° -> Feed Mult: " + (leadData.feedMult || 1).toFixed(2) + "x" + (toolConfig.isHighFeed ? " [HIGH FEED MILL]" : ""));
          }
          // Show Fusion param debug if available
          if (toolConfig.debug) {
            comments.push("  DEBUG Fusion: radialDepth=" + toolConfig.debug.radialDepth + ", optimalLoad=" + toolConfig.debug.optimalLoad + ", stepover=" + toolConfig.debug.stepover + ", used=" + toolConfig.debug.usedValue);
          }
          // Show axialDOC source
          if (toolConfig.axialDOCSource) {
            comments.push("  DEBUG axialDOC: " + (toolConfig.axialDOC || 0).toFixed(2) + "mm from " + toolConfig.axialDOCSource);
          }
          if (toolConfig.debug && toolConfig.debug._fusionRaw) {
            comments.push("  DEBUG Raw: " + JSON.stringify(toolConfig.debug._fusionRaw));
          }
          var apDebug = toolConfig.axialDOC ? toolConfig.axialDOC.toFixed(3) : "?";
          var diaDebug = (unit == IN) ? (tool.diameter * 25.4).toFixed(3) : tool.diameter.toFixed(3);
          var engPctDebug = toolConfig.radialDOC && tool.diameter ? ((toolConfig.radialDOC / ((unit == IN) ? tool.diameter * 25.4 : tool.diameter)) * 100).toFixed(1) : "?";
          comments.push("  ae=" + aeDebug + "mm, ap=" + apDebug + "mm, D=" + diaDebug + "mm, WOC=" + engPctDebug + "%");
          // v10.7: Show LOC engagement safety info
          if (tool.fluteLength > 0 && toolConfig.axialDOC > 0) {
            var locEngagement = (toolConfig.axialDOC / ((unit == IN) ? tool.fluteLength * 25.4 : tool.fluteLength)) * 100;
            var locStatus = locEngagement > 85 ? "CRITICAL" : (locEngagement > 75 ? "DANGEROUS" : (locEngagement > 65 ? "HIGH" : (locEngagement > 55 ? "MODERATE" : "OK")));
            comments.push("  LOC Engagement: " + locEngagement.toFixed(1) + "% (" + locStatus + ")");
          }
          // v10.7: Show ae limiting if applied
          if (prismCalc.feed && prismCalc.feed.aeLimited) {
            comments.push("  ⚠️ CHIP THIN CAPPED: ae=" + (prismCalc.feed.aeOriginalRatio * 100).toFixed(1) + 
              "% exceeds " + (prismCalc.feed.aeMaxRatio * 100).toFixed(1) + "% limit for " + 
              Math.round(locEngagement) + "% LOC");
          }
          // Holder and stickout info
          if (toolConfig.holderExtension > 0) {
            comments.push("  Holder: " + toolConfig.holderType + " + " + (toolConfig.holderExtension / 25.4).toFixed(2) + "\" extension");
            comments.push("  Stickout: " + (toolConfig.stickout / 25.4).toFixed(2) + "\" total (" + (toolConfig.baseStickout / 25.4).toFixed(2) + "\" tool + " + (toolConfig.holderExtension / 25.4).toFixed(2) + "\" holder)");
          }
          // DEBUG: Show finishing mode
          if (prismCalc.finishing) {
            comments.push("  finishResult.mode: " + prismCalc.finishing.mode + ", targetRa: " + (toolConfig.targetRa || "?"));
          }
          
          // HSM/HEM mode info (stored in feed result)
          if (prismCalc.feed && prismCalc.feed.hsmHem && prismCalc.feed.hsmHem.mode !== "off") {
            var hh = prismCalc.feed.hsmHem;
            var modeStr = hh.mode === "hem" ? "HEM" : "HSM";
            var engPct = hh.details.engagementPct ? hh.details.engagementPct.toFixed(1) : "?";
            comments.push("PRISM " + modeStr + ": " + engPct + "% WOC, ChipThin=" + hh.chipThinMult.toFixed(2) + "x");
            if (hh.feedIncreasePct > 5) {
              comments.push("PRISM Feed Boost: +" + hh.feedIncreasePct.toFixed(0) + "% from physics calc");
            }
            if (hh.warnings.length > 0) {
              for (var wi = 0; wi < hh.warnings.length; wi++) {
                comments.push("PRISM: " + hh.warnings[wi]);
              }
            }
          }
          
          // Roughing bypass (Ra >= 250) - show BEFORE finishing info
          if (prismCalc.finishing && prismCalc.finishing.mode === "roughing_bypass") {
            comments.push("PRISM ROUGHING MODE: Ra optimization BYPASSED (max MRR)");
            if (prismCalc.finishing.details && prismCalc.finishing.details.bypassReason) {
              comments.push("  " + prismCalc.finishing.details.bypassReason);
            }
          }
          
          // Finishing optimization info (non-bypass modes)
          if (prismCalc.finishing && prismCalc.finishing.mode !== "off" && prismCalc.finishing.mode !== "roughing_bypass") {
            var fin = prismCalc.finishing;
            var modeNames = {finish: "FINISH", accuracy: "ACCURACY", balanced: "BALANCED", productivity: "PRODUCTIVITY"};
            var modeName = modeNames[fin.mode] || fin.mode.toUpperCase();
            comments.push("PRISM " + modeName + ": Target Ra " + fin.details.targetRa + " uin");
            if (fin.achievableRa) {
              comments.push("PRISM Predicted Ra: " + (fin.achievableRa * 39.37).toFixed(1) + " uin");
            }
            var fSpeed = isFinite(fin.speedFactor) ? fin.speedFactor : 1.0;
            var fFeed = isFinite(fin.feedFactor) ? fin.feedFactor : 1.0;
            if (fSpeed < 0.95 || fFeed < 0.95) {
              comments.push("PRISM Finish Adj: Speed=" + (fSpeed * 100).toFixed(0) + "%, Feed=" + (fFeed * 100).toFixed(0) + "%");
            }
            if (fin.warnings.length > 0) {
              for (var fi = 0; fi < fin.warnings.length; fi++) {
                comments.push("PRISM: " + fin.warnings[fi]);
              }
            }
          }
          
          // Show Fusion geometry if available
          // CRITICAL: Fusion tool dimensions are in DOCUMENT UNITS
          // In INCH mode: already in inches, don't convert
          // In MM mode: convert to inches for display
          if (tool.fluteLength > 0) {
            var locInch = (unit == IN) ? tool.fluteLength : tool.fluteLength / 25.4;
            var diaInch = (unit == IN) ? tool.diameter : tool.diameter / 25.4;
            var crInch = (unit == IN) ? tool.cornerRadius : tool.cornerRadius / 25.4;
            comments.push("  Fusion: D" + diaInch.toFixed(3) + "\" LOC" + locInch.toFixed(3) + "\" " + tool.numberOfFlutes + "FL" + (crInch > 0 ? " CR" + crInch.toFixed(3) + "\"" : ""));
          }
          comments.push("  Material: " + toolConfig.material + " + " + toolConfig.coating);
          
          // Speed/Feed
          if (unitSys === "inch") {
            var sfm = PRISM_UNITS.mpmToSfm(prismCalc.speed.Vc);
            var ipm = PRISM_UNITS.mmpmToIpm(prismCalc.feed.feedRate);
            // fz is in mm/tooth, convert to IPT
            var fz_mm = prismCalc.feed.fz;
            var ipt = fz_mm / 25.4;
            comments.push("  Calculated: " + Math.round(sfm) + " SFM, " + Math.round(ipm) + " IPM, " + ipt.toFixed(4) + " IPT");
          } else {
            comments.push("  Calculated: " + Math.round(prismCalc.speed.Vc) + " m/min, " + Math.round(prismCalc.feed.feedRate) + " mm/min, " + prismCalc.feed.fz.toFixed(3) + " mm/t");
          }
          
          // Force and Power (if detailed)
          if (detailLevel === "detailed" || detailLevel === "debug") {
            if (prismCalc.force) {
              if (unitSys === "inch") {
                var lbf = PRISM_UNITS.nToLbf(prismCalc.force.Fc);
                var hp = PRISM_UNITS.kwToHp(prismCalc.force.P);
                comments.push("  Force: " + Math.round(lbf) + " lbf, Power: " + hp.toFixed(2) + " HP");
              } else {
                // v11 S6: Show power as % of machine max (Hurco VM30i = 15kW)
                var machPowerKW = 15.0; // Hurco VM30i spindle power
                var powerPct = (prismCalc.force.P / machPowerKW * 100);
                var powerWarn = powerPct > 80 ? " WARNING >80%!" : "";
                comments.push("  Force: " + Math.round(prismCalc.force.Fc) + " N, Power: " + prismCalc.force.P.toFixed(2) + " kW (" + Math.round(powerPct) + "% of " + machPowerKW + "kW)" + powerWarn);
              }
            }
            if (prismCalc.toolLife) {
              comments.push("  Est. Tool Life: " + Math.round(prismCalc.toolLife.T) + " min");
            }
          }
          
          // v11 S7: Stability lobe RPM check
          if (tool.diameter > 0 && prismCalc.speed && prismCalc.speed.rpm > 0) {
            var toolStickout = tool.bodyLength > 0 ? tool.bodyLength : tool.diameter * 3;
            var fn = PRISM_STABILITY.estimateNaturalFreq(tool.diameter, toolStickout, "carbide");
            var stabilityCheck = PRISM_STABILITY.findStablePocket(fn, prismCalc.speed.rpm, tool.numberOfFlutes || 4);
            if (!stabilityCheck.stable) {
              comments.push("  !! CHATTER RISK: " + stabilityCheck.rpmRange);
              comments.push("     fn=" + Math.round(fn) + " Hz, suggest " + stabilityCheck.nearestStableRPM + " RPM");
            } else if (detailLevel === "debug") {
              comments.push("  Stability: " + stabilityCheck.rpmRange + " (fn=" + Math.round(fn) + " Hz)");
            }
          }

          // v11 S7: Thermal accumulation tracking
          if (prismCalc.speed && prismCalc.feed) {
            var estCutTimeMin = 2.0; // Rough estimate per operation
            try {
              var cycleTime = currentSection.getCycleTime ? currentSection.getCycleTime() : 120;
              estCutTimeMin = cycleTime / 60;
            } catch(e) {}
            var thermalResult = PRISM_THERMAL.updateAndDerate(tool.number, prismCalc.speed.Vc, prismCalc.feed.fz, estCutTimeMin);
            if (thermalResult.warning) {
              comments.push("  !! " + thermalResult.warning);
            }
            if (thermalResult.suggestDwell) {
              comments.push("  >> SUGGESTION: Add G4 P5000 (5s dwell) for thermal recovery");
            }
          }

          // v11 S7: Wear progression tracking
          if (prismCalc.speed) {
            var wearCutTime = 2.0;
            try {
              var wearCycleTime = currentSection.getCycleTime ? currentSection.getCycleTime() : 120;
              wearCutTime = wearCycleTime / 60;
            } catch(e) {}
            var wearResult = PRISM_WEAR.updateAndDerate(tool.number, wearCutTime, materialGroup || "P");
            if (wearResult.warning) {
              comments.push("  !! " + wearResult.warning);
            }
            if (detailLevel === "detailed" || detailLevel === "debug") {
              comments.push("  Wear: VB=" + wearResult.VB.toFixed(3) + "mm, feed factor=" + wearResult.factor.toFixed(2));
            }
          }

          // Suggestions
          if (getProperty("prismShowSuggestions") && prismCalc.suggestions && prismCalc.suggestions.length > 0) {
            for (var s = 0; s < prismCalc.suggestions.length; s++) {
              comments.push("  >> " + prismCalc.suggestions[s]);
            }
          }

          // Warnings
          if (getProperty("prismShowWarnings") && prismCalc.warnings && prismCalc.warnings.length > 0) {
            for (var w = 0; w < prismCalc.warnings.length; w++) {
              comments.push("  !! " + prismCalc.warnings[w]);
            }
          }
          
          // Write comments
          writeComment("-------------------------------------------");
          for (var c = 0; c < comments.length; c++) {
            writeComment(comments[c]);
          }
          writeComment("-------------------------------------------");
        }
      }
    }
  }
  } catch (prismError) {
    // PRISM calculation failed - continue with Fusion defaults
    if (getProperty("prismShowWarnings")) {
      var errMsg = prismError ? (prismError.message || String(prismError)) : "unknown";
      writeComment("PRISM: Calculation error (" + errMsg.substring(0, 50) + ") - using Fusion defaults");
    }
  }
  // ===========================================================================
  // END PRISM INTEGRATION
  // ===========================================================================

    // PPG-HARDEN U-PH06: Prove-out mode — derate S/F for first article safety
    var proveOutActive = false;
    try { proveOutActive = getProperty("prismProveOut"); } catch(e) {}
    if (proveOutActive) {
      var poSpeedPct = 80;
      var poFeedPct = 50;
      try { poSpeedPct = getProperty("prismProveOutSpeedPct") || 80; } catch(e) {}
      try { poFeedPct = getProperty("prismProveOutFeedPct") || 50; } catch(e) {}
      var preProveOutRPM = outputRPM;
      outputRPM = Math.round(outputRPM * poSpeedPct / 100);
      // Store feed derating for use in onLinear/onCircular
      currentSection.prismProveOutFeedFactor = poFeedPct / 100;
      if (insertToolCall) {
        writeComment("***** PROVE-OUT MODE: Speed " + poSpeedPct + "%, Feed " + poFeedPct + "% — disable after first good part *****");
      }
    }

    // NOW output the spindle speed (after PRISM has calculated it)
    if (prismSpindleCalculated && outputRPM !== spindleSpeed) {
      writeComment("PRISM: S" + Math.round(spindleSpeed) + " -> S" + Math.round(outputRPM));
    }
    writeBlock(
      sOutput.format(outputRPM), mFormat.format(tool.clockwise ? 3 : 4)
    );
    PRISM_SAFETY.setSpindleRunning(true); // v11 S8: Track spindle state
  }

  // wcs
  if (insertToolCall) { // force work offset when changing tool
    currentWorkOffset = undefined;
  }

  if (currentSection.workOffset != currentWorkOffset) {
    writeBlock(currentSection.wcs);
    currentWorkOffset = currentSection.workOffset;
  }

  forceXYZ();

  if (forceMultiAxisIndexing || !is3D() || machineConfiguration.isMultiAxisConfiguration()) { // use 5-axis indexing for multi-axis mode
    // set working plane after datum shift

    if (currentSection.isMultiAxis()) {
      forceWorkPlane();
      cancelTransformation();
    } else {
      var abc = new Vector(0, 0, 0);
      if (useVectorOutput) {
        // writeln("VECTOR")
        abc = currentSection.getGlobalInitialToolAxis(); // using vectors
      } else {
        // writeln("MACHINE ANGLES")
        abc = getWorkPlaneMachineABC(currentSection.workPlane);
      }
      setWorkPlane(abc);
    }
  } else { // pure 3D
    var remaining = currentSection.workPlane;
    if (!isSameDirection(remaining.forward, new Vector(0, 0, 1))) {
      error(localize("Tool orientation is not supported."));
      return;
    }
    setRotation(remaining);
  }
  if (currentSection) {
    operationSupportsTCP = (currentSection.isMultiAxis() || !useMultiAxisFeatures) && currentSection.getOptimizedTCPMode() == OPTIMIZE_NONE;
  }
  setProbeAngle(); // output probe angle rotations if required
  // set coolant after we have positioned at Z
  setCoolant(tool.coolant);

  forceAny();
  var G = ((highFeedMapping != HIGH_FEED_NO_MAPPING) || !getProperty("useG0")) ? 1 : 0;
  var F = ((highFeedMapping != HIGH_FEED_NO_MAPPING) || !getProperty("useG0")) ? getFeed(highFeedrate) : "";
  if (currentSection.isMultiAxis()) {
    onCommand(COMMAND_UNLOCK_MULTI_AXIS);

    writeBlock(gFormat.format(69));
    writeBlock(mFormat.format(128)); // only after we are at initial position

    // turn
    var abc;
    var d = currentSection.getGlobalInitialToolAxis();
    var initialPosition = getFramePosition(currentSection.getInitialPosition());
    if (currentSection.isOptimizedForMachine()) {
      abc = currentSection.getInitialToolAxisABC();
      writeBlock(
        gMotionModal.format(G), gFormat.format(8.2),
        xOutput.format(initialPosition.x), yOutput.format(initialPosition.y), zOutput.format(initialPosition.z),
        aOutput.format(abc.x), bOutput.format(abc.y), cOutput.format(abc.z), F
      );
    } else {
      gMotionModal.reset();
      writeBlock(
        gMotionModal.format(G), gFormat.format(8.2),
        xOutput.format(initialPosition.x), yOutput.format(initialPosition.y), zOutput.format(initialPosition.z),
        "I" + ijkFormat.format(d.x), "J" + ijkFormat.format(d.y), "K" + ijkFormat.format(d.z), F
      );
    }
    writeBlock(gFormat.format(43.4));
    writeBlock(mFormat.format(200), "P" + (getProperty("preferredTilt") ? 1 : 2)); // prefer positive/negative tilt
  } else {
    var initialPosition = getFramePosition(currentSection.getInitialPosition());
    if (!retractedZ && !insertToolCall) {
      if (getCurrentPosition().z < initialPosition.z) {
        writeBlock(gMotionModal.format(0), zOutput.format(initialPosition.z));
      }
    }

    if (insertToolCall || retractedZ) {
      var lengthOffset = tool.lengthOffset;
      if (lengthOffset > 200) {
        warning(localize("The length offset exceeds the maximum value."));
      }

      gMotionModal.reset();
      writeBlock(gPlaneModal.format(17));

      if (!machineConfiguration.isHeadConfiguration()) {
        writeBlock(
          gAbsIncModal.format(90),
          gMotionModal.format(G), xOutput.format(initialPosition.x), yOutput.format(initialPosition.y), F
        );
        if (!useMultiAxisFeatures || currentSection.isZOriented()) {
          writeBlock(gMotionModal.format(0), gFormat.format(43), zOutput.format(initialPosition.z), hFormat.format(lengthOffset));
          PRISM_SAFETY.setG43Active(true); // v11 S8: Track tool length comp state
        } else {
          writeBlock(gMotionModal.format(0), zOutput.format(initialPosition.z));
        }
      } else {
        if (!useMultiAxisFeatures || currentSection.isZOriented()) {
          writeBlock(
            gAbsIncModal.format(90),
            gMotionModal.format(G),
            gFormat.format(43), xOutput.format(initialPosition.x),
            yOutput.format(initialPosition.y),
            zOutput.format(initialPosition.z), F, hFormat.format(lengthOffset)
          );
        } else {
          writeBlock(
            gAbsIncModal.format(90),
            gMotionModal.format(G),
            xOutput.format(initialPosition.x),
            yOutput.format(initialPosition.y),
            zOutput.format(initialPosition.z),
            F
          );
        }
      }
    } else {
      writeBlock(
        gAbsIncModal.format(90),
        gMotionModal.format(G),
        xOutput.format(initialPosition.x),
        yOutput.format(initialPosition.y),
        F
      );
    }
  }

  // v11 Bug 12 fix: Apply G05.3 smoothing per-section (not just on tool change).
  // This ensures each section gets the correct smoothing P value for its operation type.
  // Probe and drilling operations should not get smoothing — setSmoothing checks useSmoothing property.
  if (!isProbeOperation()) {
    setSmoothing(true);
  }

  // v11 S10 U-PBL30: G64 UltiMotion per-section
  if (getProperty("useUltiMotion") && !isProbeOperation()) {
    var isDrilling = hasParameter("operation-strategy") && getParameter("operation-strategy") === "drill";
    if (!isDrilling && !(currentSection.hasAnyCycle && currentSection.hasAnyCycle())) {
      var hasStockToLeave = hasParameter("operation:stockToLeave") && getParameter("operation:stockToLeave") > 0;
      var ultiTol = hasStockToLeave ? getProperty("ultiMotionRoughTol") : getProperty("ultiMotionFinishTol");
      var ultiLabel = hasStockToLeave ? "ROUGH" : "FINISH";
      writeBlock(gFormat.format(64), "P" + xyzFormat.format(ultiTol), formatComment("ULTIMOTION " + ultiLabel));
    }
  }

  if (getProperty("useParametricFeed") &&
      hasParameter("operation-strategy") &&
      (getParameter("operation-strategy") != "drill") && // legacy
      !(currentSection.hasAnyCycle && currentSection.hasAnyCycle())) {
    if (!insertToolCall &&
        activeMovements &&
        (getCurrentSectionId() > 0) &&
        ((getPreviousSection().getPatternId() == currentSection.getPatternId()) && (currentSection.getPatternId() != 0))) {
      // use the current feeds
    } else {
      initializeActiveFeeds();
    }
  } else {
    activeMovements = undefined;
  }

  if (isProbeOperation()) {
    validate(probeVariables.probeAngleMethod != "G68", "You cannot probe while G68 Rotation is in effect.");
    validate(probeVariables.probeAngleMethod != "G54.4", "You cannot probe while workpiece setting error compensation G54.4 is enabled.");
    // writeBlock(gFormat.format(65), "P" + 9832); // spin the probe on //Probe doesn't need to be activate or de activated, as the controller is doing it automatically at toolchange.
    inspectionCreateResultsFileHeader();
  }

  // surface Inspection
  if (isInspectionOperation() && (typeof inspectionProcessSectionStart == "function")) {
    inspectionProcessSectionStart();
  }
  // G5.2 NURBS smoothing removed — use G05.3 via setSmoothing() instead
}

function onDwell(seconds) {
  if (seconds > 9999.999) {
    warning(localize("Dwelling time is out of range."));
  }
  seconds = clamp(0.001, seconds, 9999.999);
  writeBlock(gFormat.format(4), formatDwell(seconds));
}

function onSpindleSpeed(spindleSpeed) {
  writeBlock(sOutput.format(spindleSpeed));
}

function onCycle() {
  writeBlock(gPlaneModal.format(17));
}

function getCommonCycle(x, y, z, r) {
  forceXYZ();
  if (getProperty("isnc")) {
    return [xOutput.format(x), yOutput.format(y),
      zOutput.format(z),
      "R" + xyzFormat.format(r)];
  } else {
    return [xOutput.format(x), yOutput.format(y),
      "Z" + xyzFormat.format(z),
      "R" + xyzFormat.format(r)];
  }
}

/** Convert approach to sign. */
function approach(value) {
  validate((value == "positive") || (value == "negative"), "Invalid approach.");
  return (value == "positive") ? 1 : -1;
}

function setProbeAngleMethod() {
  probeVariables.probeAngleMethod = (machineConfiguration.getNumberOfAxes() < 5 || is3D()) ? (getProperty("useG54x4") ? "G54.4" : "G68") : "UNSUPPORTED";
  var axes = [machineConfiguration.getAxisU(), machineConfiguration.getAxisV(), machineConfiguration.getAxisW()];
  for (var i = 0; i < axes.length; ++i) {
    if (axes[i].isEnabled() && isSameDirection((axes[i].getAxis()).getAbsolute(), new Vector(0, 0, 1)) && axes[i].isTable()) {
      probeVariables.probeAngleMethod = "AXIS_ROT";
      break;
    }
  }
  probeVariables.outputRotationCodes = true;
}

/** Output rotation offset based on angular probing cycle. */
function setProbeAngle() {
  if (probeVariables.outputRotationCodes) {
    var probeOutputWorkOffset = currentSection.probeWorkOffset;
    validate(probeOutputWorkOffset <= 6, "Angular Probing only supports work offsets 1-6.");
    if (probeVariables.probeAngleMethod == "G68" && (Vector.diff(currentSection.getGlobalInitialToolAxis(), new Vector(0, 0, 1)).length > 1e-4)) {
      error(localize("You cannot use multi axis toolpaths while G68 Rotation is in effect."));
    }
    var validateWorkOffset = false;
    switch (probeVariables.probeAngleMethod) {
    case "G54.4":
      var param = 26000 + (probeOutputWorkOffset * 10);
      writeBlock("#" + param + "=#135");
      writeBlock("#" + (param + 1) + "=#136");
      writeBlock("#" + (param + 5) + "=#144");
      writeBlock(gFormat.format(54.4), "P" + probeOutputWorkOffset);
      break;
    case "G68":
      gRotationModal.reset();
      gAbsIncModal.reset();
      var n = xyzFormat.format(0);
      writeBlock(
        gRotationModal.format(68), gAbsIncModal.format(90),
        // probeVariables.compensationXY, "Z" + n, "I" + n, "J" + n, "K" + xyzFormat.format(1), "R[#144]"
        probeVariables.compensationXY, "R[#144]"
      );
      validateWorkOffset = true;
      break;
    case "AXIS_ROT":
      var param = 5200 + probeOutputWorkOffset * 20 + 5;
      writeBlock("#" + param + " = " + "[#" + param + " + #144]");
      forceWorkPlane(); // force workplane to rotate ABC in order to apply rotation offsets
      currentWorkOffset = undefined; // force WCS output to make use of updated parameters
      validateWorkOffset = true;
      break;
    default:
      error(localize("Angular Probing is not supported for this machine configuration."));
      return;
    }
    if (validateWorkOffset) {
      for (var i = currentSection.getId(); i < getNumberOfSections(); ++i) {
        if (getSection(i).workOffset != currentSection.workOffset) {
          error(localize("WCS offset cannot change while using angle rotation compensation."));
          return;
        }
      }
    }
    probeVariables.outputRotationCodes = false;
  }
}

function protectedProbeMove(_cycle, x, y, z) {
  var _x = xOutput.format(x);
  var _y = yOutput.format(y);
  var _z = zOutput.format(z);
  if (_z && z >= getCurrentPosition().z) {
    writeBlock(gFormat.format(65), "P" + 9810, _z, getFeed(cycle.feedrate)); // protected positioning move
  }
  if (_x || _y) {
    writeBlock(gFormat.format(65), "P" + 9810, _x, _y, getFeed(highFeedrate)); // protected positioning move
  }
  if (_z && z < getCurrentPosition().z) {
    writeBlock(gFormat.format(65), "P" + 9810, _z, getFeed(cycle.feedrate)); // protected positioning move
  }
}

/**
  Format dwell P word for the current mode.
  ISNC: P in seconds with 3 decimal places (e.g., P1.500)
  BNC:  P in milliseconds as integer (e.g., P1500) — BNC interprets decimal point
        as sub-millisecond, so P1.500 would be 1.5 ms, NOT 1.5 seconds.
*/
function formatDwell(seconds) {
  if (getProperty("isnc")) {
    return "P" + secFormat.format(seconds);
  } else {
    return "P" + milliFormat.format(seconds * 1000);
  }
}

function onCyclePoint(x, y, z) {
  if (cycleType == "inspect") {
    if (typeof inspectionCycleInspect == "function") {
      inspectionCycleInspect(cycle, x, y, z);
      return;
    } else {
      cycleNotSupported();
    }
  }
  if (!isSameDirection(getRotation().forward, new Vector(0, 0, 1))) {
    expandCyclePoint(x, y, z);
    return;
  }
  if (isProbeOperation()) {
    if (!isSameDirection(currentSection.workPlane.forward, new Vector(0, 0, 1))) {
      if (!allowIndexingWCSProbing && currentSection.strategy == "probe") {
        error(localize("Updating WCS / work offset using probing is only supported by the CNC in the WCS frame."));
        return;
      }
    }
    if (printProbeResults()) {
      writeProbingToolpathInformation(z - cycle.depth + tool.diameter / 2);
      inspectionWriteCADTransform();
      inspectionWriteWorkplaneTransform();
      if (typeof inspectionWriteVariables == "function") {
        inspectionVariables.pointNumber += 1;
      }
    }
    protectedProbeMove(cycle, x, y, z);
  }

  if (isFirstCyclePoint() || isProbeOperation()) {
    if (!isProbeOperation()) {
      // return to initial Z which is clearance plane and set absolute mode
      repositionToCycleClearance(cycle, x, y, z);
    }
    // R is only used in G99 mode for BNC

    var F = cycle.feedrate;
    var P = !cycle.dwell ? 0 : clamp(1, cycle.dwell, 9999.999); // in seconds

    switch (cycleType) {
    case "drilling":
      if (getProperty("isnc")) {
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(81),
          getCommonCycle(x, y, z, cycle.retract),
          feedOutput.format(F)
        );
      } else { // BNC mode
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(81),
          getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
          feedOutput.format(F)
        );
      }
      break;
    case "counter-boring":
      if (P > 0) {
        if (getProperty("isnc")) {
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(82),
            getCommonCycle(x, y, z, cycle.retract),
            formatDwell(P), // not optional
            feedOutput.format(F)
          );
        } else { // BNC mode
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(82),
            getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
            formatDwell(P), // not optional
            feedOutput.format(F)
          );
        }
      } else {
        if (getProperty("isnc")) {
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(81),
            getCommonCycle(x, y, z, cycle.retract),
            feedOutput.format(F)
          );
        } else { // BNC mode
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(81),
            getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
            feedOutput.format(F)
          );
        }
      }
      break;
    case "chip-breaking":
      if ((cycle.accumulatedDepth < cycle.depth) || (P > 0)) {
        expandCyclePoint(x, y, z);
      } else {
        if (getProperty("isnc")) {
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(73),
            getCommonCycle(x, y, z, cycle.retract),
            "Q" + xyzFormat.format(cycle.incrementalDepth),
            feedOutput.format(F)
          );
        } else { // BNC mode
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(73),
            getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
            "Q" + xyzFormat.format(cycle.incrementalDepth),
            feedOutput.format(F)
          );
        }
      }
      break;
    case "deep-drilling":
      if (P > 0) {
        expandCyclePoint(x, y, z);
      } else {
        if (getProperty("isnc")) {
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(83),
            getCommonCycle(x, y, z, cycle.retract),
            "Q" + xyzFormat.format(cycle.incrementalDepth),
            feedOutput.format(F)
          );
        } else { // BNC mode
          // v11 Bug 18 fix: Single Z-word + Q for peck depth (was triple Z-word)
          // BNC G83: Z=total depth, Q=peck increment, R=retract position
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(83),
            xOutput.format(x),
            yOutput.format(y),
            "Z" + xyzFormat.format(cycle.clearance - cycle.bottom),
            "Q" + xyzFormat.format(cycle.incrementalDepth),
            "R" + xyzFormat.format(zOutput.getCurrent() - cycle.retract),
            feedOutput.format(F)
          );
        }
      }
      break;
    case "tapping":
      // v11 AI-FIX: Always get tapping feedrate (removed dead code: 'if (true || !F)')
      F = tool.getTappingFeedrate();
      if (getProperty("isnc")) {
        writeBlock(mFormat.format(29)); // rigid
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format((tool.type == TOOL_TAP_LEFT_HAND) ? 74 : 84),
          getCommonCycle(x, y, z, cycle.retract),
          formatDwell(P), // not optional
          feedOutput.format(F)
        );
      } else { // BNC mode
        // v11 AI-FIX: Simplified spindle direction logic for clarity
        var isRightHandTap = (tool.type != TOOL_TAP_LEFT_HAND);
        var isClockwiseTool = tool.clockwise;

        if (isRightHandTap) {
          writeBlock(mFormat.format(3)); // cw for right-hand tap
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(88), // rigid
            xOutput.format(x),
            yOutput.format(y),
            "Z" + xyzFormat.format(cycle.clearance - cycle.bottom),
            "R" + xyzFormat.format(zOutput.getCurrent() - cycle.retract),
            formatDwell(P), // not optional
            feedOutput.format(F)
          );
          // v11 AI-FIX: Corrected spindle direction after cycle
          // If tool is defined as CCW (!clockwise), output M4 after rigid tap cycle
          if (!isClockwiseTool) {
            writeBlock(mFormat.format(4)); // CCW - simplified from redundant ternary
          }
        } else { // left hand tap
          // warning: not rigid
          writeBlock(mFormat.format(4)); // CCW for left-hand tap (simplified from ternary)
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(84),
            getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
            feedOutput.format(F)
          );
          // v11 AI-FIX: Simplified complex boolean - restore spindle direction if tool definition differs
          // LH tap + CW tool definition = output M3 after cycle
          if (isClockwiseTool) {
            writeBlock(mFormat.format(3)); // Restore CW if tool defined as CW
          }
        }
      }
      break;
    case "left-tapping":
      // v11 AI-FIX: Always get tapping feedrate (removed dead code)
      F = tool.getTappingFeedrate();
      if (getProperty("isnc")) {
        writeBlock(mFormat.format(29)); // rigid
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(74),
          getCommonCycle(x, y, z, cycle.retract),
          formatDwell(P), // not optional
          feedOutput.format(F)
        );
      } else { // BNC mode
        // warning: not rigid
        writeBlock(mFormat.format(4)); // ccw for left-hand tap
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(84),
          getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
          feedOutput.format(F)
        );
        // v11 AI-FIX: If tool.clockwise is true, restore CW direction (simplified from ternary)
        if (tool.clockwise) {
          writeBlock(mFormat.format(3)); // Restore CW
        }
      }
      break;
    case "right-tapping":
      // v11 AI-FIX: Always get tapping feedrate (removed dead code)
      F = tool.getTappingFeedrate();
      if (getProperty("isnc")) {
        writeBlock(mFormat.format(29)); // rigid
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(84),
          getCommonCycle(x, y, z, cycle.retract),
          formatDwell(P), // not optional
          feedOutput.format(F)
        );
      } else { // BNC mode
        writeBlock(mFormat.format(3)); // cw for right-hand tap
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(88), // rigid
          xOutput.format(x),
          yOutput.format(y),
          "Z" + xyzFormat.format(cycle.clearance - cycle.bottom),
          "R" + xyzFormat.format(zOutput.getCurrent() - cycle.retract),
          formatDwell(P), // not optional
          feedOutput.format(F)
        );
        // v11 AI-FIX: If tool is CCW, restore CCW direction (simplified from ternary)
        if (!tool.clockwise) {
          writeBlock(mFormat.format(4)); // Restore CCW
        }
      }
      break;
    case "tapping-with-chip-breaking":
    case "left-tapping-with-chip-breaking":
    case "right-tapping-with-chip-breaking":
      if (cycle.accumulatedDepth < cycle.depth) {
        error(localize("Accumulated pecking depth is not supported for canned tapping cycles with chip breaking."));
        return;
      }
      // v11 AI-FIX: Always get tapping feedrate (removed dead code)
      F = tool.getTappingFeedrate();
      if (getProperty("isnc")) {
        forceXYZ();
        writeBlock(mFormat.format(29)); // rigid
        // NOTE: G84.2/G84.3 syntax uses two Z-words: first Z=total depth, second Z=peck increment
        // This is the correct WinMax ISNC format for peck tapping cycles
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format((tool.type == TOOL_TAP_LEFT_HAND) ? 84.3 : 84.2),
          xOutput.format(x),
          yOutput.format(y),
          "Z" + xyzFormat.format(z),              // Total depth
          "Z" + xyzFormat.format(cycle.incrementalDepth),  // Peck increment
          "R" + xyzFormat.format(cycle.retract),
          formatDwell(P), // not optional
          conditional(cycle.minimumIncrementalDepth < cycle.depth, "Q" + xyzFormat.format(cycle.minimumIncrementalDepth)), // optional
          feedOutput.format(F)
        );
        zOutput.reset();
      } else { // BNC mode
        if (tool.type != TOOL_TAP_LEFT_HAND) { // right hand
          writeBlock(mFormat.format(3)); // cw
          // NOTE: BNC G88 peck tap also uses dual Z-words: depth + increment
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(88), // rigid
            xOutput.format(x),
            yOutput.format(y),
            "Z" + xyzFormat.format(cycle.clearance - cycle.bottom),  // Total depth
            "Z" + xyzFormat.format(cycle.incrementalDepth),          // Peck increment
            "R" + xyzFormat.format(zOutput.getCurrent() - cycle.retract),
            formatDwell(P), // not optional
            feedOutput.format(F)
          );
          // v11 AI-FIX: Simplified from redundant ternary - already inside !tool.clockwise check
          if (!tool.clockwise) {
            writeBlock(mFormat.format(4)); // Restore CCW
          }
        } else {
          error(localize("Left-tapping with chip breaking is not supported."));
        }
      }
      break;
    case "fine-boring":
      if (getProperty("isnc")) {
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(76),
          getCommonCycle(x, y, z, cycle.retract),
          formatDwell(P), // not optional
          "Q" + xyzFormat.format(cycle.shift),
          feedOutput.format(F)
        );
      } else { // BNC mode
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(76),
          getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
          formatDwell(P), // not optional
          "Q" + xyzFormat.format(cycle.shift),
          feedOutput.format(F)
        );
      }
      break;
    case "back-boring":
      if (!getProperty("isnc")) {
        error(localize("Back boring is not supported."));
      }
      var dx = (gPlaneModal.getCurrent() == 19) ? cycle.backBoreDistance : 0;
      var dy = (gPlaneModal.getCurrent() == 18) ? cycle.backBoreDistance : 0;
      var dz = (gPlaneModal.getCurrent() == 17) ? cycle.backBoreDistance : 0;
      writeBlock(
        gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(87),
        getCommonCycle(x - dx, y - dy, z - dz, cycle.bottom),
        "Q" + xyzFormat.format(cycle.shift),
        formatDwell(P), // not optional
        feedOutput.format(F)
      );
      break;
    case "reaming":
      if (feedFormat.getResultingValue(cycle.feedrate) != feedFormat.getResultingValue(cycle.retractFeedrate)) {
        expandCyclePoint(x, y, z);
        break;
      }
      if (getProperty("isnc")) {
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(85),
          getCommonCycle(x, y, z, cycle.retract),
          feedOutput.format(F)
        );
      } else { // BNC mode
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(85),
          getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
          feedOutput.format(F)
        );
      }
      break;
    case "stop-boring":
      if ((P > 0) || !getProperty("isnc")) {
        expandCyclePoint(x, y, z);
      } else {
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(86),
          getCommonCycle(x, y, z, cycle.retract),
          feedOutput.format(F)
        );
      }
      break;
    case "manual-boring":
      if (!getProperty("isnc")) {
        error(localize("Manual boring is not supported."));
      }
      writeBlock(
        gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(88),
        getCommonCycle(x, y, z, cycle.retract),
        formatDwell(P), // not optional
        feedOutput.format(F)
      );
      break;
    case "boring":
      if (feedFormat.getResultingValue(cycle.feedrate) != feedFormat.getResultingValue(cycle.retractFeedrate)) {
        expandCyclePoint(x, y, z);
        break;
      }
      if (getProperty("isnc")) {
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(89),
          getCommonCycle(x, y, z, cycle.retract),
          formatDwell(P), // not optional
          feedOutput.format(F)
        );
      } else { // BNC
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(89),
          getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
          formatDwell(P), // not optional
          feedOutput.format(F)
        );
      }
      break;
    case "probing-x":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9811,
        "X" + xyzFormat.format(x + approach(cycle.approach1) * (cycle.probeClearance + tool.diameter / 2)),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-y":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9811,
        "Y" + xyzFormat.format(y + approach(cycle.approach1) * (cycle.probeClearance + tool.diameter / 2)),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-z":
      protectedProbeMove(cycle, x, y, Math.min(z - cycle.depth + cycle.probeClearance, cycle.retract));
      writeBlock(
        gFormat.format(65), "P" + 9811,
        "Z" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-x-wall":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "X" + xyzFormat.format(cycle.width1),
        "Z" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-y-wall":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "Y" + xyzFormat.format(cycle.width1),
        "Z" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-x-channel":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "X" + xyzFormat.format(cycle.width1),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        // not required "R" + xyzFormat.format(cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-x-channel-with-island":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "X" + xyzFormat.format(cycle.width1),
        "Z" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(-cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-y-channel":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "Y" + xyzFormat.format(cycle.width1),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        // not required "R" + xyzFormat.format(cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-y-channel-with-island":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "Y" + xyzFormat.format(cycle.width1),
        "Z" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(-cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-circular-boss":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9814,
        "D" + xyzFormat.format(cycle.width1),
        "Z" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-circular-partial-boss":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9823,
        "A" + xyzFormat.format(cycle.partialCircleAngleA),
        "B" + xyzFormat.format(cycle.partialCircleAngleB),
        "C" + xyzFormat.format(cycle.partialCircleAngleC),
        "D" + xyzFormat.format(cycle.width1),
        "Z" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-circular-hole":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9814,
        "D" + xyzFormat.format(cycle.width1),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        // not required "R" + xyzFormat.format(cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-circular-partial-hole":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9823,
        "A" + xyzFormat.format(cycle.partialCircleAngleA),
        "B" + xyzFormat.format(cycle.partialCircleAngleB),
        "C" + xyzFormat.format(cycle.partialCircleAngleC),
        "D" + xyzFormat.format(cycle.width1),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-circular-hole-with-island":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9814,
        "Z" + xyzFormat.format(z - cycle.depth),
        "D" + xyzFormat.format(cycle.width1),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(-cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-circular-partial-hole-with-island":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9823,
        "Z" + xyzFormat.format(z - cycle.depth),
        "A" + xyzFormat.format(cycle.partialCircleAngleA),
        "B" + xyzFormat.format(cycle.partialCircleAngleB),
        "C" + xyzFormat.format(cycle.partialCircleAngleC),
        "D" + xyzFormat.format(cycle.width1),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(-cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-rectangular-hole":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "X" + xyzFormat.format(cycle.width1),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        // not required "R" + xyzFormat.format(-cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "Y" + xyzFormat.format(cycle.width2),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        // not required "R" + xyzFormat.format(-cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-rectangular-boss":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "Z" + xyzFormat.format(z - cycle.depth),
        "X" + xyzFormat.format(cycle.width1),
        "R" + xyzFormat.format(cycle.probeClearance),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, true)
      );
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "Z" + xyzFormat.format(z - cycle.depth),
        "Y" + xyzFormat.format(cycle.width2),
        "R" + xyzFormat.format(cycle.probeClearance),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-rectangular-hole-with-island":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "Z" + xyzFormat.format(z - cycle.depth),
        "X" + xyzFormat.format(cycle.width1),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(-cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "Z" + xyzFormat.format(z - cycle.depth),
        "Y" + xyzFormat.format(cycle.width2),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(-cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;

    case "probing-xy-inner-corner":
      var cornerX = x + approach(cycle.approach1) * (cycle.probeClearance + tool.diameter / 2);
      var cornerY = y + approach(cycle.approach2) * (cycle.probeClearance + tool.diameter / 2);
      var cornerI = 0;
      var cornerJ = 0;
      if (cycle.probeSpacing !== undefined) {
        cornerI = cycle.probeSpacing;
        cornerJ = cycle.probeSpacing;
      }
      if ((cornerI != 0) && (cornerJ != 0)) {
        if (currentSection.strategy == "probe") {
          setProbeAngleMethod();
          probeVariables.compensationXY = "X[#185] Y[#186]";
        }
      }
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9815, xOutput.format(cornerX), yOutput.format(cornerY),
        conditional(cornerI != 0, "I" + xyzFormat.format(cornerI)),
        conditional(cornerJ != 0, "J" + xyzFormat.format(cornerJ)),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-outer-corner":
      var cornerX = x + approach(cycle.approach1) * (cycle.probeClearance + tool.diameter / 2);
      var cornerY = y + approach(cycle.approach2) * (cycle.probeClearance + tool.diameter / 2);
      var cornerI = 0;
      var cornerJ = 0;
      if (cycle.probeSpacing !== undefined) {
        cornerI = cycle.probeSpacing;
        cornerJ = cycle.probeSpacing;
      }
      if ((cornerI != 0) && (cornerJ != 0)) {
        if (currentSection.strategy == "probe") {
          setProbeAngleMethod();
          probeVariables.compensationXY = "X[#185] Y[#186]";
        }
      }
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9816, xOutput.format(cornerX), yOutput.format(cornerY),
        conditional(cornerI != 0, "I" + xyzFormat.format(cornerI)),
        conditional(cornerJ != 0, "J" + xyzFormat.format(cornerJ)),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-x-plane-angle":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9843,
        "X" + xyzFormat.format(x + approach(cycle.approach1) * (cycle.probeClearance + tool.diameter / 2)),
        "D" + xyzFormat.format(cycle.probeSpacing),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "A" + xyzFormat.format(cycle.nominalAngle != undefined ? cycle.nominalAngle : 90),
        getProbingArguments(cycle, false)
      );
      if (currentSection.strategy == "probe") {
        setProbeAngleMethod();
        probeVariables.compensationXY = "X" + xyzFormat.format(0) + " Y" + xyzFormat.format(0);
      }
      break;
    case "probing-y-plane-angle":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9843,
        "Y" + xyzFormat.format(y + approach(cycle.approach1) * (cycle.probeClearance + tool.diameter / 2)),
        "D" + xyzFormat.format(cycle.probeSpacing),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "A" + xyzFormat.format(cycle.nominalAngle != undefined ? cycle.nominalAngle : 0),
        getProbingArguments(cycle, false)
      );
      if (currentSection.strategy == "probe") {
        setProbeAngleMethod();
        probeVariables.compensationXY = "X" + xyzFormat.format(0) + " Y" + xyzFormat.format(0);
      }
      break;
    case "probing-xy-pcd-hole":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9819,
        "A" + xyzFormat.format(cycle.pcdStartingAngle),
        "B" + xyzFormat.format(cycle.numberOfSubfeatures),
        "C" + xyzFormat.format(cycle.widthPCD),
        "D" + xyzFormat.format(cycle.widthFeature),
        "K" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, false)
      );
      if (cycle.updateToolWear) {
        error(localize("Action -Update Tool Wear- is not supported with this cycle."));
        return;
      }
      break;
    case "probing-xy-pcd-boss":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9819,
        "A" + xyzFormat.format(cycle.pcdStartingAngle),
        "B" + xyzFormat.format(cycle.numberOfSubfeatures),
        "C" + xyzFormat.format(cycle.widthPCD),
        "D" + xyzFormat.format(cycle.widthFeature),
        "Z" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(cycle.probeClearance),
        getProbingArguments(cycle, false)
      );
      if (cycle.updateToolWear) {
        error(localize("Action -Update Tool Wear- is not supported with this cycle."));
        return;
      }
      break;
    default:
      expandCyclePoint(x, y, z);
    }
  } else {
    if (cycleExpanded) {
      expandCyclePoint(x, y, z);
    } else {
      var _x = xOutput.format(x);
      var _y = yOutput.format(y);
      if (!_x && !_y) {
        xOutput.reset(); // at least one axis is required
        _x = xOutput.format(x);
      }
      writeBlock(_x, _y);
    }
  }
}

function getProbingArguments(cycle, updateWCS) {
  var outputWCSCode = updateWCS && currentSection.strategy == "probe";
  var probeOutputWorkOffset = currentSection.probeWorkOffset;
  if (outputWCSCode) {
    validate(probeOutputWorkOffset <= 99, "Work offset is out of range.");
    var nextWorkOffset = hasNextSection() ? getNextSection().workOffset == 0 ? 1 : getNextSection().workOffset : -1;
    if (probeOutputWorkOffset == nextWorkOffset) {
      currentWorkOffset = undefined;
    }
  }
  return [
    (cycle.angleAskewAction == "stop-message" ? "B" + xyzFormat.format(cycle.toleranceAngle ? cycle.toleranceAngle : 0) : undefined),
    ((cycle.updateToolWear && cycle.toolWearErrorCorrection < 100) ? "F" + xyzFormat.format(cycle.toolWearErrorCorrection ? cycle.toolWearErrorCorrection / 100 : 100) : undefined),
    (cycle.wrongSizeAction == "stop-message" ? "H" + xyzFormat.format(cycle.toleranceSize ? cycle.toleranceSize : 0) : undefined),
    (cycle.outOfPositionAction == "stop-message" ? "M" + xyzFormat.format(cycle.tolerancePosition ? cycle.tolerancePosition : 0) : undefined),
    ((cycle.updateToolWear && cycleType == "probing-z") ? "T" + xyzFormat.format(cycle.toolLengthOffset) : undefined),
    ((cycle.updateToolWear && cycleType !== "probing-z") ? "T" + xyzFormat.format(cycle.toolDiameterOffset) : undefined),
    (cycle.updateToolWear ? "V" + xyzFormat.format(cycle.toolWearUpdateThreshold ? cycle.toolWearUpdateThreshold : 0) : undefined),
    (cycle.printResults ? "W" + xyzFormat.format(1 + cycle.incrementComponent) : undefined), // 1 for advance feature, 2 for reset feature count and advance component number. first reported result in a program should use W2.
    conditional(outputWCSCode, "S" + probeWCSFormat.format(probeOutputWorkOffset > 6 ? (probeOutputWorkOffset - 6 + 100) : probeOutputWorkOffset))
  ];
}

function onCycleEnd() {
  if (isProbeOperation()) {
    zOutput.reset();
    gMotionModal.reset();
    writeBlock(gFormat.format(65), "P" + 9810, zOutput.format(cycle.retract)); // protected retract move
  } else {
    if (!cycleExpanded) {
      writeBlock(gCycleModal.format(80));
      // v11 Bug 24: Reset feed mode to G94 (feed per minute) after cycle cancel.
      // Tapping sets rigid mode which may leave feed in G95 (feed per rev) state.
      writeBlock(gFeedModeModal.format(94));
      zOutput.reset();
    }
  }
}

var pendingRadiusCompensation = -1;

function onRadiusCompensation() {
  pendingRadiusCompensation = radiusCompensation;
}

function onRapid(_x, _y, _z) {
  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  if (x || y || z) {
    if (pendingRadiusCompensation >= 0) {
      error(localize("Radius compensation mode cannot be changed at rapid traversal."));
      return;
    }
    if (!getProperty("useG0") && (((x ? 1 : 0) + (y ? 1 : 0) + (z ? 1 : 0)) > 1)) {
      // axes are not synchronized
      writeBlock(gMotionModal.format(1), x, y, z, feedOutput.format(highFeedrate));
    } else {
      writeBlock(gMotionModal.format(0), x, y, z);
      forceFeed();
    }
  }
}

/** Global variables for prism feed calculations in motion functions */
var prismMoveDistance = 0;
var prismCurrentPos = null;
var prismEnhancedIsArc = false;
// v11 Bug 27: prismEnhancedArcRadius already declared at line ~17998 — removed duplicate here

/** v11 S10 U-PBL31: Micro-segment filter counter */
var _microSegmentsFiltered = 0;

function onLinear(_x, _y, _z, feed) {
  // v11 S10 U-PBL31: Filter micro-segments (< 0.01mm) that cause jerky motion
  // These come from CAM linearization of curves and add no geometric value.
  if (pendingRadiusCompensation < 0) { // Don't filter during comp — need exact positions
    var pos = getCurrentPosition();
    var segLen = Math.sqrt(Math.pow(_x - pos.x, 2) + Math.pow(_y - pos.y, 2) + Math.pow(_z - pos.z, 2));
    if (segLen < 0.01) { // 10 microns — below machine resolution
      _microSegmentsFiltered++;
      return; // Skip this segment, effectively merging with next
    }
  }

  // Set current Z for dynamic depth feed calculation - MUST BE BEFORE getFeed()
  currentCuttingZ = _z;

  // Calculate move distance for prism
  if (getProperty("usePrismEnhancedFeed")) {
    var start = getCurrentPosition();
    var dx = _x - start.x;
    var dy = _y - start.y;
    var dz = _z - start.z;
    prismMoveDistance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    prismCurrentPos = [_x, _y, _z];
    prismEnhancedIsArc = false;
    prismEnhancedArcRadius = 0;
  }
  
  if (pendingRadiusCompensation >= 0) {
    // ensure that we end at desired position when compensation is turned off
    xOutput.reset();
    yOutput.reset();
  }
  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  var f = getFeed(feed);
  if (x || y || z) {
    if (pendingRadiusCompensation >= 0) {
      pendingRadiusCompensation = -1;
      var d = tool.diameterOffset;
      if (d > 200) {
        warning(localize("The diameter offset exceeds the maximum value."));
      }
      writeBlock(gPlaneModal.format(17));
      switch (radiusCompensation) {
      case RADIUS_COMPENSATION_LEFT:
        dOutput.reset();
        writeBlock(gMotionModal.format(1), gFormat.format(41), x, y, z, dOutput.format(d), f);
        break;
      case RADIUS_COMPENSATION_RIGHT:
        dOutput.reset();
        writeBlock(gMotionModal.format(1), gFormat.format(42), x, y, z, dOutput.format(d), f);
        break;
      default:
        writeBlock(gMotionModal.format(1), gFormat.format(40), x, y, z, f);
      }
    } else {
      writeBlock(gMotionModal.format(1), x, y, z, f);
    }
  } else if (f) {
    if (getNextRecord().isMotion()) { // try not to output feed without motion
      forceFeed(); // force feed on next line
    } else {
      writeBlock(gMotionModal.format(1), f);
    }
  }
  
  // Update prism state for direction tracking
  if (getProperty("usePrismEnhancedFeed")) {
    updatePrismEnhancedState(_x, _y, _z);
  }
}

function onRapid5D(_x, _y, _z, _a, _b, _c) {
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation mode cannot be changed at rapid traversal."));
    return;
  }

  if (!currentSection.isOptimizedForMachine()) {
    forceXYZ();
  }

  var num =
    (xyzFormat.areDifferent(_x, xOutput.getCurrent()) ? 1 : 0) +
    (xyzFormat.areDifferent(_y, yOutput.getCurrent()) ? 1 : 0) +
    (xyzFormat.areDifferent(_z, zOutput.getCurrent()) ? 1 : 0) +
    ((aOutput.isEnabled() && abcFormat.areDifferent(_a, aOutput.getCurrent())) ? 1 : 0) +
    ((bOutput.isEnabled() && abcFormat.areDifferent(_b, bOutput.getCurrent())) ? 1 : 0) +
    ((cOutput.isEnabled() && abcFormat.areDifferent(_c, cOutput.getCurrent())) ? 1 : 0);

  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  var a = currentSection.isOptimizedForMachine() ? aOutput.format(_a) : "I" + ijkFormat.format(_a);
  var b = currentSection.isOptimizedForMachine() ? bOutput.format(_b) : "J" + ijkFormat.format(_b);
  var c = currentSection.isOptimizedForMachine() ? cOutput.format(_c) : "K" + ijkFormat.format(_c);

  if (x || y || z || a || b || c) {
    if (!getProperty("useG0") && (operationSupportsTCP || (num > 1))) {
      // axes are not synchronized
      writeBlock(gFeedModeModal.format(94), gMotionModal.format(1), x, y, z, a, b, c, getFeed(highFeedrate));
    } else {
      writeBlock(gMotionModal.format(0), x, y, z, a, b, c);
      forceFeed();
    }
  }
}

function onLinear5D(_x, _y, _z, _a, _b, _c, feed, feedMode) {
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation cannot be activated/deactivated for 5-axis move."));
    return;
  }
  if (!currentSection.isOptimizedForMachine()) {
    forceXYZ();
  }
  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  var a = currentSection.isOptimizedForMachine() ? aOutput.format(_a) : "I" + ijkFormat.format(_a);
  var b = currentSection.isOptimizedForMachine() ? bOutput.format(_b) : "J" + ijkFormat.format(_b);
  var c = currentSection.isOptimizedForMachine() ? cOutput.format(_c) : "K" + ijkFormat.format(_c);
  if (feedMode == FEED_INVERSE_TIME) {
    forceFeed();
  }
  var f = feedMode == FEED_INVERSE_TIME ? inverseTimeOutput.format(feed) : getFeed(feed);
  var fMode = feedMode == FEED_INVERSE_TIME ? 93 : 94;

  if (x || y || z || a || b || c) {
    writeBlock(gFeedModeModal.format(fMode), gMotionModal.format(1), x, y, z, a, b, c, f);
  } else if (f) {
    if (getNextRecord().isMotion()) { // try not to output feed without motion
      forceFeed(); // force feed on next line
    } else {
      writeBlock(gFeedModeModal.format(fMode), gMotionModal.format(1), f);
    }
  }
}

function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
  // Set current Z for dynamic depth feed calculation - MUST BE BEFORE getFeed()
  currentCuttingZ = z;
  
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation cannot be activated/deactivated for a circular move."));
    return;
  }

  var start = getCurrentPosition();
  
  // Set up prism variables for arc feed correction
  if (getProperty("usePrismEnhancedFeed")) {
    // Calculate arc radius
    var dx = start.x - cx;
    var dy = start.y - cy;
    prismEnhancedArcRadius = Math.sqrt(dx*dx + dy*dy);
    prismEnhancedIsArc = true;
    prismCurrentPos = [x, y, z];
    // Estimate arc length for move distance
    var sweep = getCircularSweep();
    prismMoveDistance = Math.abs(sweep * prismEnhancedArcRadius);
  }

  if (isFullCircle()) {
    if (isHelical()) {
      // v11 S9 U-PBL25: Helical full circles (thread milling) — output G2/G3+Z for XY plane.
      // Full helical circle in XY = thread milling or helical bore.
      // Other planes still linearize (machine limitation).
      if (getCircularPlane() === PLANE_XY) {
        if (getProperty("isnc")) {
          writeBlock(gAbsIncModal.format(90), gPlaneModal.format(17), gMotionModal.format(clockwise ? 2 : 3),
            xOutput.format(x), yOutput.format(y), zOutput.format(z),
            irOutput.format(cx - start.x, 0), jrOutput.format(cy - start.y, 0), getFeed(feed));
        } else {
          writeBlock(gAbsIncModal.format(90), gPlaneModal.format(17), gMotionModal.format(clockwise ? 2 : 3),
            xOutput.format(x), yOutput.format(y), zOutput.format(z),
            iOutput.format(cx), jOutput.format(cy), getFeed(feed));
        }
      } else {
        linearize(tolerance);
      }
      return;
    }
    switch (getCircularPlane()) {
    case PLANE_XY:
      if (getProperty("isnc")) {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(17), gMotionModal.format(clockwise ? 2 : 3), irOutput.format(cx - start.x, 0), jrOutput.format(cy - start.y, 0), getFeed(feed));
      } else {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(17), gMotionModal.format(clockwise ? 2 : 3), iOutput.format(cx), jOutput.format(cy), getFeed(feed));
      }
      break;
    case PLANE_ZX:
      if (getProperty("isnc")) {
        // right-handed
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(18), gMotionModal.format(clockwise ? 2 : 3), irOutput.format(cx - start.x, 0), krOutput.format(cz - start.z, 0), getFeed(feed));
      } else {
        // note: left hand coordinate system
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(18), gMotionModal.format(clockwise ? 3 : 2), iOutput.format(cx), kOutput.format(cz), getFeed(feed));
      }
      break;
    case PLANE_YZ:
      if (getProperty("isnc")) {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(19), gMotionModal.format(clockwise ? 2 : 3), jrOutput.format(cy - start.y, 0), krOutput.format(cz - start.z, 0), getFeed(feed));
      } else {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(19), gMotionModal.format(clockwise ? 2 : 3), jOutput.format(cy), kOutput.format(cz), getFeed(feed));
      }
      break;
    default:
      linearize(tolerance);
    }
  } else {
    switch (getCircularPlane()) {
    case PLANE_XY:
      if (getProperty("isnc")) {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(17), gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), irOutput.format(cx - start.x, 0), jrOutput.format(cy - start.y, 0), getFeed(feed));
      } else {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(17), gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), iOutput.format(cx), jOutput.format(cy), getFeed(feed));
      }
      break;
    case PLANE_ZX:
      if (isHelical()) {
        linearize(tolerance);
        return;
      }

      if (getProperty("isnc")) {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(18), gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), irOutput.format(cx - start.x, 0), krOutput.format(cz - start.z, 0), getFeed(feed));
      } else {
        // note: left hand coordinate system
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(18), gMotionModal.format(clockwise ? 3 : 2), xOutput.format(x), yOutput.format(y), zOutput.format(z), iOutput.format(cx), kOutput.format(cz), getFeed(feed));
      }
      break;
    case PLANE_YZ:
      if (isHelical()) {
        linearize(tolerance);
        return;
      }

      if (getProperty("isnc")) {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(19), gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), jrOutput.format(cy - start.y, 0), krOutput.format(cz - start.z, 0), getFeed(feed));
      } else {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(19), gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), jOutput.format(cy), kOutput.format(cz), getFeed(feed));
      }
      break;
    default:
      if (getProperty("allow3DArcs")) {
        // make sure maximumCircularSweep is well below 360deg
        // we could use G2.4 or G3.4 - direction is calculated
        var ip = getPositionU(0.5);
        writeBlock(gAbsIncModal.format(90), gMotionModal.format(clockwise ? 2.4 : 3.4), xOutput.format(ip.x), yOutput.format(ip.y), zOutput.format(ip.z));
        writeBlock(xOutput.format(x), yOutput.format(y), zOutput.format(z), getFeed(feed));
      } else {
        linearize(tolerance);
      }
    }
  }
  
  // Update prism state for direction tracking
  if (getProperty("usePrismEnhancedFeed")) {
    updatePrismEnhancedState(x, y, z);
  }
}

var currentCoolantMode = COOLANT_OFF;
var coolantOff = undefined;
var forceCoolant = false;

function setCoolant(coolant) {
  var coolantCodes = getCoolantCodes(coolant);
  if (Array.isArray(coolantCodes)) {
    if (singleLineCoolant) {
      writeBlock(coolantCodes.join(getWordSeparator()));
    } else {
      for (var c in coolantCodes) {
        writeBlock(coolantCodes[c]);
      }
    }
    return undefined;
  }
  return coolantCodes;
}

function getCoolantCodes(coolant) {
  var multipleCoolantBlocks = new Array(); // create a formatted array to be passed into the outputted line
  if (!coolants) {
    error(localize("Coolants have not been defined."));
  }
  if (tool.type == TOOL_PROBE) { // avoid coolant output for probing
    coolant = COOLANT_OFF;
  }
  if (coolant == currentCoolantMode && (!forceCoolant || coolant == COOLANT_OFF)) {
    return undefined; // coolant is already active
  }
  
  // Special handling for air through spindle
  if (coolant == COOLANT_AIR_THROUGH_TOOL) {
    // Turn on air through spindle
    var airOnCode = getAirThruSpindleOnCode();
    if (airOnCode) {
      multipleCoolantBlocks.push(airOnCode);
      airThruSpindleActive = true;
    }
    currentCoolantMode = coolant;
    return multipleCoolantBlocks;
  }
  
  // If turning off coolant and air through spindle was active, turn it off
  if (coolant == COOLANT_OFF && airThruSpindleActive) {
    var airOffCode = getAirThruSpindleOffCode();
    if (airOffCode) {
      multipleCoolantBlocks.push(airOffCode);
      airThruSpindleActive = false;
    }
  }
  
  if ((coolant != COOLANT_OFF) && (currentCoolantMode != COOLANT_OFF) && (coolantOff != undefined) && !forceCoolant) {
    if (Array.isArray(coolantOff)) {
      for (var i in coolantOff) {
        multipleCoolantBlocks.push(coolantOff[i]);
      }
    } else {
      multipleCoolantBlocks.push(coolantOff);
    }
  }
  forceCoolant = false;

  var m;
  var coolantCodes = {};
  for (var c in coolants) { // find required coolant codes into the coolants array
    if (coolants[c].id == coolant) {
      coolantCodes.on = coolants[c].on;
      if (coolants[c].off != undefined) {
        coolantCodes.off = coolants[c].off;
        break;
      } else {
        for (var i in coolants) {
          if (coolants[i].id == COOLANT_OFF) {
            coolantCodes.off = coolants[i].off;
            break;
          }
        }
      }
    }
  }
  if (coolant == COOLANT_OFF) {
    m = !coolantOff ? coolantCodes.off : coolantOff; // use the default coolant off command when an 'off' value is not specified
  } else {
    coolantOff = coolantCodes.off;
    m = coolantCodes.on;
  }

  if (!m) {
    onUnsupportedCoolant(coolant);
    m = 9;
  } else {
    if (Array.isArray(m)) {
      for (var i in m) {
        multipleCoolantBlocks.push(m[i]);
      }
    } else {
      multipleCoolantBlocks.push(m);
    }
    currentCoolantMode = coolant;
    for (var i in multipleCoolantBlocks) {
      if (typeof multipleCoolantBlocks[i] == "number") {
        multipleCoolantBlocks[i] = mFormat.format(multipleCoolantBlocks[i]);
      }
    }
    return multipleCoolantBlocks; // return the single formatted coolant value
  }
  return undefined;
}

/** Returns the M-code or subprogram call to turn on air through spindle */
function getAirThruSpindleOnCode() {
  var auxOutput = getProperty("airThruSpindleAuxOutput");
  
  // Option 1: Use auxiliary output
  if (auxOutput > 0 && auxOutput <= 12) {
    if (auxOutput <= 4) {
      return mFormat.format(51 + auxOutput) + " " + formatComment("AIR THRU SPINDLE ON");  // M52-M55
    } else {
      return mFormat.format(137 + auxOutput) + " " + formatComment("AIR THRU SPINDLE ON");  // M142-M149 (output 5-12)
    }
  }
  
  // Option 2: Use subprogram call
  if (getProperty("useSubprogramAirThruSpindle")) {
    var subNum = getProperty("airOnSubprogram");
    return mFormat.format(98) + " P" + subNum + " " + formatComment("AIR THRU SPINDLE ON");
  }
  
  // Option 3: Try M11 Q1 (may not work on all machines)
  return "M11 Q1 " + formatComment("AIR THRU SPINDLE ON");
}

/** Returns the M-code or subprogram call to turn off air through spindle */
function getAirThruSpindleOffCode() {
  var auxOutput = getProperty("airThruSpindleAuxOutput");
  
  // Option 1: Use auxiliary output
  if (auxOutput > 0 && auxOutput <= 12) {
    if (auxOutput <= 4) {
      return mFormat.format(61 + auxOutput) + " " + formatComment("AIR THRU SPINDLE OFF");  // M62-M65
    } else {
      return mFormat.format(147 + auxOutput) + " " + formatComment("AIR THRU SPINDLE OFF");  // M152-M159 (output 5-12)
    }
  }
  
  // Option 2: Use subprogram call
  if (getProperty("useSubprogramAirThruSpindle")) {
    var subNum = getProperty("airOffSubprogram");
    return mFormat.format(98) + " P" + subNum + " " + formatComment("AIR THRU SPINDLE OFF");
  }
  
  // Option 3: Try M11 Q0 (may not work on all machines)
  return "M11 Q0 " + formatComment("AIR THRU SPINDLE OFF");
}

var mapCommand = {
  COMMAND_END                     : 2,
  COMMAND_SPINDLE_CLOCKWISE       : 3,
  COMMAND_SPINDLE_COUNTERCLOCKWISE: 4,
  COMMAND_STOP_SPINDLE            : 5,
  COMMAND_ORIENTATE_SPINDLE       : 19,
  COMMAND_LOAD_TOOL               : 6
};

function onCommand(command) {
  switch (command) {
  case COMMAND_STOP:
    writeBlock(mFormat.format(0));
    forceSpindleSpeed = true;
    forceCoolant = true;
    return;
  case COMMAND_OPTIONAL_STOP:
    writeBlock(mFormat.format(1));
    forceSpindleSpeed = true;
    forceCoolant = true;
    return;
  case COMMAND_START_SPINDLE:
    onCommand(tool.clockwise ? COMMAND_SPINDLE_CLOCKWISE : COMMAND_SPINDLE_COUNTERCLOCKWISE);
    return;
  case COMMAND_LOCK_MULTI_AXIS:
    if ((useVectorOutput && hasABCAxis("A")) || aOutput.isEnabled()) {
      writeBlock(mClampModal.format(32));
    }
    if ((useVectorOutput && hasABCAxis("B")) || bOutput.isEnabled()) {
      writeBlock(mClampModal.format(34));
    }
    if ((useVectorOutput && hasABCAxis("C")) || cOutput.isEnabled()) {
      writeBlock(mClampModal.format(12));
    }
    return;
  case COMMAND_UNLOCK_MULTI_AXIS:
    if ((useVectorOutput && hasABCAxis("A")) || aOutput.isEnabled()) {
      writeBlock(mClampModal.format(33));
    }
    if ((useVectorOutput && hasABCAxis("B")) || bOutput.isEnabled()) {
      writeBlock(mClampModal.format(35));
    }
    if ((useVectorOutput && hasABCAxis("C")) || cOutput.isEnabled()) {
      writeBlock(mClampModal.format(13));
    }
    return;
  case COMMAND_START_CHIP_TRANSPORT:
    writeBlock(mFormat.format(59));
    return;
  case COMMAND_STOP_CHIP_TRANSPORT:
    writeBlock(mFormat.format(61));
    return;
  case COMMAND_BREAK_CONTROL:
    return;
  case COMMAND_TOOL_MEASURE:
    return;
  case COMMAND_PROBE_ON:
    return;
  case COMMAND_PROBE_OFF:
    return;
  }

  var stringId = getCommandStringId(command);
  var mcode = mapCommand[stringId];
  if (mcode != undefined) {
    writeBlock(mFormat.format(mcode));
  } else {
    onUnsupportedCommand(command);
  }
}

function onSectionEnd() {
  // v11 Bug 11 fix: Cancel G05.3 smoothing at end of every section.
  // Smoothing must not persist into the next section — the next section's
  // setSmoothing(true) call will re-enable it at the correct P value
  // for that operation's type (rough/finish/drill).
  setSmoothing(false);

  // v11 S10: Cancel G64 UltiMotion at section end
  if (getProperty("useUltiMotion")) {
    writeBlock(gFormat.format(61), formatComment("CANCEL ULTIMOTION"));
  }

  if (currentSection.isMultiAxis()) {
    writeBlock(gFeedModeModal.format(94)); // inverse time feed off
    writeBlock(mFormat.format(129));
    if (!isLastSection()) {
      writeBlock(mFormat.format(31)); // rotary axes encoder reset
    }
    // the code below gets the machine angles from previous operation.  closestABC must also be set to true
    if (currentSection.isOptimizedForMachine()) {
      currentMachineABC = currentSection.getFinalToolAxisABC();
    }
  }
  writeBlock(gPlaneModal.format(17));

  // v10.5: Tool break check for lights-out production
  if (getProperty("prismEnableToolBreakCheck")) {
    var opType = getParameter("operation-strategy", "");
    var diaMM = (unit === IN) ? tool.diameter * 25.4 : tool.diameter;
    if (PRISM_LIGHTS_OUT.needsBreakCheck(opType, diaMM, getProperty("prismToolBreakCheckOps"))) {
      var breakCode = PRISM_LIGHTS_OUT.formatBreakCheck(
        tool.number, 
        getProperty("prismToolBreakTolerance"),
        getProperty("prismToolBreakSubprogram")
      );
      if (breakCode) {
        writeBlock(breakCode);
      }
      writeComment("TOOL BREAK CHECK T" + tool.number);
    }
  }

  if (!isLastSection() && (getNextSection().getTool().coolant != tool.coolant)) {
    setCoolant(COOLANT_OFF);
  }
  if (((getCurrentSectionId() + 1) >= getNumberOfSections()) ||
      (tool.number != getNextSection().getTool().number)) {
    onCommand(COMMAND_BREAK_CONTROL);
  }

  if (isProbeOperation()) {
    // writeBlock(gFormat.format(65), "P" + 9833); // spin the probe off //Probe doesn't need to be activate or de activated, as the controller is doing it automatically at toolchange.
    if (probeVariables.probeAngleMethod != "G68") {
      setProbeAngle(); // output probe angle rotations if required
    }
  }
  forceAny();
}

/**
  Output block for minimum Z retract between work offsets.
  Instead of retracting to Z home (G28), this retracts to a clearance height
  above the stock/part. Saves significant time on multi-fixture setups.
*/
function writeMinimumRetract() {
  var retractZ;
  var clearance = getProperty("minimumZRetractClearance");
  var fixedRetract = getProperty("minimumZRetractFromWCS");
  
  if (fixedRetract != 0) {
    // User specified a fixed Z position relative to WCS zero
    retractZ = fixedRetract;
    writeComment("MIN RETRACT TO Z" + xyzFormat.format(retractZ) + " (FIXED)");
  } else {
    // Calculate retract based on stock top + clearance
    // Get the highest Z point from current section's stock or part
    var stockZMax = 0;
    
    // Try to get stock top from current section
    if (hasParameter("operation:stockZHigh")) {
      stockZMax = getParameter("operation:stockZHigh");
    } else if (currentSection.hasParameter("operation:zRange:max")) {
      stockZMax = currentSection.getParameter("operation:zRange:max");
    } else {
      // Fallback: use clearance height from the operation if available
      var clearanceHeight = currentSection.getGlobalZRange().getMaximum();
      stockZMax = clearanceHeight;
    }
    
    retractZ = stockZMax + clearance;
    writeComment("MIN RETRACT TO Z" + xyzFormat.format(retractZ) + " (STOCK+" + xyzFormat.format(clearance) + ")");
  }
  
  // Output the retract move in the CURRENT work coordinate system
  // We're still in the previous WCS at this point
  gMotionModal.reset();
  writeBlock(gAbsIncModal.format(90), gMotionModal.format(0), "Z" + xyzFormat.format(retractZ));
  zOutput.reset();
  retractedZ = true;
}

/** Output block to do safe retract and/or move to home position. */
function writeRetract() {
  var words = []; // store all retracted axes in an array
  var retractAxes = new Array(false, false, false);
  var method = getProperty("safePositionMethod");
  if (method == "clearanceHeight") {
    if (!is3D()) {
      error(localize("Safe retract option 'Clearance Height' is only supported when all operations are along the setup Z-axis."));
    }
    return;
  }
  validate(arguments.length != 0, "No axis specified for writeRetract().");

  for (i in arguments) {
    retractAxes[arguments[i]] = true;
  }
  if ((retractAxes[0] || retractAxes[1]) && !retractedZ) { // retract Z first before moving to X/Y home
    error(localize("Retracting in X/Y is not possible without being retracted in Z."));
    return;
  }
  // special conditions
  /*
  if (retractAxes[2]) { // Z doesn't use G53
    method = "G28";
  }
  */
  if (gRotationModal.getCurrent() == 68) { // cancel G68 before retracting
    cancelWorkPlane(true);
  }
  
  // PRISM: M90 Z-Retract Protection - prevents accidental Z-down moves during retract
  var useZProtection = getProperty("prismUseZRetractProtection");
  if (useZProtection) {
    writeBlock(mFormat.format(90)); // Enable Z-axis retract protection
  }
  
  // define home positions
  var _xHome;
  var _yHome;
  var _zHome;
  if (method == "G28") {
    _xHome = toPreciseUnit(0, MM);
    _yHome = toPreciseUnit(0, MM);
    _zHome = toPreciseUnit(0, MM);
  } else {
    _xHome = machineConfiguration.hasHomePositionX() ? machineConfiguration.getHomePositionX() : toPreciseUnit(0, MM);
    _yHome = machineConfiguration.hasHomePositionY() ? machineConfiguration.getHomePositionY() : toPreciseUnit(0, MM);
    _zHome = machineConfiguration.getRetractPlane() != 0 ? machineConfiguration.getRetractPlane() : toPreciseUnit(0, MM);
  }
  for (var i = 0; i < arguments.length; ++i) {
    switch (arguments[i]) {
    case X:
      words.push("X" + xyzFormat.format(_xHome));
      xOutput.reset();
      retractedX = true;
      break;
    case Y:
      words.push("Y" + xyzFormat.format(_yHome));
      yOutput.reset();
      retractedY = true;
      break;
    case Z:
      words.push("Z" + xyzFormat.format(_zHome));
      zOutput.reset();
      retractedZ = true;
      break;
    default:
      error(localize("Unsupported axis specified for writeRetract()."));
      return;
    }
  }
  if (words.length > 0) {
    switch (method) {
    case "G28":
      gMotionModal.reset();
      gAbsIncModal.reset();
      writeBlock(gFormat.format(28), gAbsIncModal.format(91), words);
      writeBlock(gAbsIncModal.format(90));
      break;
    case "G53":
      gMotionModal.reset();
      if (retractAxes[2] && useMultiAxisFeatures && getProperty("useM140")) {
        writeBlock(gFormat.format(0), mFormat.format(140));
      } else {
        writeBlock(gAbsIncModal.format(90), gFormat.format(53), gMotionModal.format(0), words);
      }
      break;
    default:
      error(localize("Unsupported safe position method."));
      return;
    }
    // PRISM: Cancel Z-Retract Protection after safe retract
    if (useZProtection) {
      writeBlock(mFormat.format(91)); // Cancel Z-axis retract protection
    }
  }
}

var isDPRNTopen = false;
function inspectionCreateResultsFileHeader() {
  if (isDPRNTopen) {
    if (!getProperty("singleResultsFile")) {
      writeln("DPRNT[END]");
      writeBlock("PCLOS");
      isDPRNTopen = false;
    }
  }

  if (isProbeOperation() && !printProbeResults()) {
    return; // if print results is not desired by probe/ probeWCS
  }

  if (!isDPRNTopen) {
    writeBlock("PCLOS");
    writeBlock("POPEN");
    // check for existence of none alphanumeric characters but not spaces
    var resFile;
    if (getProperty("singleResultsFile")) {
      resFile = getParameter("job-description") + "-RESULTS";
    } else {
      resFile = getParameter("operation-comment") + "-RESULTS";
    }
    resFile = resFile.replace(/:/g, "-");
    resFile = resFile.replace(/[^a-zA-Z0-9 -]/g, "");
    resFile = resFile.replace(/\s/g, "-");
    writeln("DPRNT[START]");
    writeln("DPRNT[RESULTSFILE*" + resFile + "]");
    if (hasGlobalParameter("document-id")) {
      writeln("DPRNT[DOCUMENTID*" + getGlobalParameter("document-id") + "]");
    }
    if (hasGlobalParameter("model-version")) {
      writeln("DPRNT[MODELVERSION*" + getGlobalParameter("model-version") + "]");
    }
  }
  if (isProbeOperation() && printProbeResults()) {
    isDPRNTopen = true;
  }
}

function getPointNumber() {
  if (typeof inspectionWriteVariables == "function") {
    return (inspectionVariables.pointNumber);
  } else {
    return ("#122[60]");
  }
}

function inspectionWriteCADTransform() {
  var cadOrigin = currentSection.getModelOrigin();
  var cadWorkPlane = currentSection.getModelPlane().getTransposed();
  var cadEuler = cadWorkPlane.getEuler2(EULER_XYZ_S);
  writeln(
    "DPRNT[G331" +
    "*N" + getPointNumber() +
    "*A" + abcFormat.format(cadEuler.x) +
    "*B" + abcFormat.format(cadEuler.y) +
    "*C" + abcFormat.format(cadEuler.z) +
    "*X" + xyzFormat.format(-cadOrigin.x) +
    "*Y" + xyzFormat.format(-cadOrigin.y) +
    "*Z" + xyzFormat.format(-cadOrigin.z) +
    "]"
  );
}

function inspectionWriteWorkplaneTransform() {
  var orientation = (machineConfiguration.isMultiAxisConfiguration() && currentMachineABC != undefined) ? machineConfiguration.getOrientation(currentMachineABC) : currentSection.workPlane;
  var abc = orientation.getEuler2(EULER_XYZ_S);
  writeln("DPRNT[G330" +
    "*N" + getPointNumber() +
    "*A" + abcFormat.format(abc.x) +
    "*B" + abcFormat.format(abc.y) +
    "*C" + abcFormat.format(abc.z) +
    "*X0*Y0*Z0*I0*R0]"
  );
}

function writeProbingToolpathInformation(cycleDepth) {
  writeln("DPRNT[TOOLPATHID*" + getParameter("autodeskcam:operation-id") + "]");
  if (isInspectionOperation()) {
    writeln("DPRNT[TOOLPATH*" + getParameter("operation-comment") + "]");
  } else {
    writeln("DPRNT[CYCLEDEPTH*" + xyzFormat.format(cycleDepth) + "]");
  }
}

/** Output raw text passthrough (standard CPS callback). */
function onPassThrough(text) {
  writeln(text);
}

// Start of onRewindMachine logic
/** Allow user to override the onRewind logic. */
function onRewindMachineEntry(_a, _b, _c) {
  // v11 S10 U-PBL32: Enable 5-axis rewind — retract, rotate, re-approach.
  // Prevents axis wrap-around at ±180° limits.
  // The framework calls onMoveToSafeRetractPosition → onRotateAxes → onReturnFromSafeRetractPosition.
  return true;
}

/** Retract to safe position before indexing rotaries. */
function onMoveToSafeRetractPosition() {
  writeRetract(Z);
  // cancel TCP so that tool doesn't follow rotaries
  if (currentSection.isMultiAxis() && operationSupportsTCP) {
    writeBlock(mFormat.format(129));
  }
}

/** Rotate axes to new position above reentry position */
function onRotateAxes(_x, _y, _z, _a, _b, _c) {
  // position rotary axes
  xOutput.disable();
  yOutput.disable();
  zOutput.disable();
  invokeOnRapid5D(_x, _y, _z, _a, _b, _c);
  setCurrentABC(new Vector(_a, _b, _c));
  xOutput.enable();
  yOutput.enable();
  zOutput.enable();
}

/** Return from safe position after indexing rotaries. */
function onReturnFromSafeRetractPosition(_x, _y, _z) {
  // reinstate TCP / tool length compensation
  if (operationSupportsTCP) {
    writeBlock(mFormat.format(128));
    var abc = getCurrentDirection();
    gMotionModal.reset();
    forceAny();
    var G = ((highFeedMapping != HIGH_FEED_NO_MAPPING) || !getProperty("useG0")) ? 1 : 0;
    var F = ((highFeedMapping != HIGH_FEED_NO_MAPPING) || !getProperty("useG0")) ? getFeed(highFeedrate) : "";
    writeBlock(
      gMotionModal.format(G), gFormat.format(8.2),
      xOutput.format(_x), yOutput.format(_y), zOutput.format(_z),
      aOutput.format(abc.x), bOutput.format(abc.y), cOutput.format(abc.z), F
    );
    writeBlock(gFormat.format(43.4));
    writeBlock(mFormat.format(200), "P" + (getProperty("preferredTilt") ? 1 : 2)); // prefer positive/negative tilt
  } else {
    // position in XY
    forceXYZ();
    xOutput.reset();
    yOutput.reset();
    zOutput.disable();
    invokeOnRapid(_x, _y, _z);

    // position in Z
    zOutput.enable();
    invokeOnRapid(_x, _y, _z);
  }
}
// End of onRewindMachine logic

function onClose() {
  if (isDPRNTopen) {
    writeln("DPRNT[END]");
    writeBlock("PCLOS");
    isDPRNTopen = false;
    if (typeof inspectionProcessSectionEnd == "function") {
      inspectionProcessSectionEnd();
    }
  }
  if (probeVariables.probeAngleMethod == "G68") {
    cancelWorkPlane();
  }
  setCoolant(COOLANT_OFF);

  /*
  if (useMultiAxisFeatures && !is3D()) {
    writeBlock(gFormat.format(0), mFormat.format(140)); // retract
    writeBlock(
      gFormat.format(68.2),
      xOutput.format(0), yOutput.format(0), zOutput.format(0),
      "I" + ijkFormat.format(1), "J" + ijkFormat.format(0), "K" + ijkFormat.format(0),
      "U" + ijkFormat.format(0), "V" + ijkFormat.format(1), "W" + ijkFormat.format(0)
    );
    forceXYZ();
    gMotionModal.reset();
    writeBlock(
      gMotionModal.format(0), gFormat.format(8.2),
      xOutput.format(0), yOutput.format(0), zOutput.format(0),
      "I" + ijkFormat.format(0), "J" + ijkFormat.format(0), "K" + ijkFormat.format(1)
    );
  } else {
    writeBlock(gAbsIncModal.format(91), gFormat.format(28), "Z" + xyzFormat.format(0)); // retract
  }
*/

  writeRetract(Z);
  zOutput.reset();

  writeRetract(X, Y);

  if (machineConfiguration.isMultiAxisConfiguration() || (useMultiAxisFeatures && !is3D())) {
    cancelWorkPlane(true);
    writeBlock(mFormat.format(31)); // rotary axes encoder reset
    if (useVectorOutput) {
      onCommand(COMMAND_UNLOCK_MULTI_AXIS);
      // reset rotaries to 0 when using vector output
    } else {
      positionABC(new Vector(0, 0, 0), true);
    }
  }

  if (forceMultiAxisIndexing || !is3D() || machineConfiguration.isMultiAxisConfiguration()) {
    writeBlock(mFormat.format(127)); // cancel shortest path traverse
  }

  // Disable automatic buffering
  if (getProperty("useAutomaticBuffering")) {
    writeBlock(mFormat.format(17), formatComment("AUTOMATIC BUFFERING OFF"));
  }

  // Washdown coolant at end of program
  if (getProperty("useWashdownCoolant")) {
    writeComment("WASHDOWN CYCLE");
    writeBlock(mFormat.format(68), formatComment("WASHDOWN COOLANT ON"));
    writeBlock(gFormat.format(4), formatDwell(5), formatComment("DWELL 5 SEC"));
    writeBlock(mFormat.format(69), formatComment("WASHDOWN COOLANT OFF"));
  }

  // Stop chip conveyor
  if (getProperty("useChipConveyor")) {
    onCommand(COMMAND_STOP_CHIP_TRANSPORT);
  }
  
  onImpliedCommand(COMMAND_END);
  onImpliedCommand(COMMAND_STOP_SPINDLE);
  
  writeln("");
  // v11 S10: Micro-segment filter report
  if (_microSegmentsFiltered > 0) {
    writeComment("TOOLPATH FILTER: " + _microSegmentsFiltered + " micro-segments (<0.01mm) removed for smoother motion");
  }
  // v11 S8: Safety summary in footer
  writeComment(PRISM_SAFETY.getSummary());
  if (PRISM_SAFETY.safetyLog.length > 0) {
    for (var si = 0; si < PRISM_SAFETY.safetyLog.length; si++) {
      writeComment(PRISM_SAFETY.safetyLog[si]);
    }
  }
  writeComment("END OF PROGRAM");
  // v11 Bug 38: M30 (end + rewind) instead of M2 (end only).
  // M30 rewinds to program start, resets modal states, and signals end-of-data.
  // Required for multi-part runs and proper program restart on Hurco WinMax.
  writeBlock(mFormat.format(30));
  
  writeln("E");
}

function setProperty(property, value) {
  properties[property].current = value;
}
