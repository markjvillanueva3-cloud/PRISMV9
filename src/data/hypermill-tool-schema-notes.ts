/**
 * hyperMILL Tool Database Schema Reference
 *
 * Extracted from OPEN MIND hyperMILL v33.0 documentation:
 *   - SQL Tool Database schema (sqlite.sql v1.53, 2009-2023)
 *   - Virtual Tool Manual (VT Editor, tool search procedures)
 *   - TOOL Builder Manual (3D geometry import, collision profiles)
 *   - CAM Manual (tool database sections)
 *
 * Schema source: C:/PRISM/HYPERMILL/Tool Database/33.0/template database/sqlite.sql
 *
 * PURPOSE: Reference mapping between hyperMILL's internal tool DB schema and
 * PRISM's CatalogTool interface. Informs future import/export compatibility.
 *
 * @module hypermill-tool-schema-notes
 */

// ── hyperMILL Tool Database Architecture ──
// The DB has a 3-tier hierarchy:
//   Tools (geometry definition) → NCTools (assembled tool with holder) → DepotItems (magazine slot)
//
// Key entity relationships:
//   NCTool = Tool + Holder + Extensions + Head + FixedHolder + Geometry
//   Tool = GeometryClass + CuttingMaterial + Manufacturer + ToolClass + Couplings
//   Technology = CuttingSpeed + Feedrate + SpindleSpeed + Coolants + Material + CuttingMaterial
//   CuttingProfile = NCTool + Technology (per-assembly overrides with factors/flags)
//
// Geometry is stored as:
//   - polyline (binary profile for 2D collision envelope)
//   - polyeder_file_id (3D mesh for simulation, stored in Files table)
//   - cad_file_id (STEP/IGES CAD data, stored in Files table)
//   - mac_side_cs / wp_side_cs (72-byte coordinate systems for orientation)

// ── GeometryClasses (tool_type_id) ──
// hyperMILL's 29 tool type classifications

export const HYPERMILL_GEOMETRY_CLASSES = {
  // Milling tools (1-21)
  1: 'Ballmill',
  2: 'Endmill',
  3: 'Radiusmill',           // Bull nose / corner radius
  4: 'Drilltool',
  5: 'Lollipop',             // Undercut ball
  6: 'Woodruff',             // T-slot / keyseat
  7: 'GeneralBarrelTool',    // Barrel cutter (MAXX Machining)
  8: 'LensCutter',           // Lens-shape cutter
  9: 'ChamferedCutter',      // Chamfer mill
  10: 'TSlotCutter',
  11: 'Tap',
  12: 'BoringBar',
  13: 'GunDrill',
  15: 'ThreadMill',
  16: 'Reamer',
  17: 'TangentBarrelTool',   // Tangent barrel (MAXX Machining)
  18: 'ConicalBarrelTool',   // Conical barrel (MAXX Machining)
  19: 'IndexableRoundInsertCutter',
  20: 'IndexableHighFeedCutter',
  21: 'BackboringTool',

  // Turning tools (1000-1005)
  1000: 'GeneralTurningTool',
  1001: 'RadialRecessingTool',  // Grooving (radial)
  1002: 'AxialRecessingTool',   // Grooving (axial/face)
  1003: 'ThreadingTool',
  1004: 'PartingTool',
  1005: 'RollTurnTool',         // PrimeTurning-style

  // Special (2000+)
  2000: 'TouchProbe',
  3000: 'GrindingBit',
  4000: 'AdditiveDevice',       // Additive manufacturing head
} as const;

// ── Tool Table Fields ──
// The Tools table stores cutting tool geometry definitions.
// Dimension fields are generic (dbl_param1..17, int_param1..6) with meaning
// varying by tool_type_id (GeometryClass). This is hyperMILL's internal
// parametric approach — field semantics depend on tool type.

export const HYPERMILL_TOOL_FIELDS = {
  // ── Core identification ──
  id: { type: 'int', desc: 'Auto-increment primary key' },
  tool_type_id: { type: 'int', desc: 'FK to GeometryClasses — determines tool shape and dbl_param semantics' },
  tool_class_id: { type: 'int', desc: 'FK to ToolClasses — user-defined grouping with defaults' },
  name: { type: 'string(128)', desc: 'Unique tool name' },
  ordering_code: { type: 'string(128)', desc: 'Manufacturer ordering/catalog number' },
  comment: { type: 'string(128)', desc: 'User notes' },
  obj_guid: { type: 'binary(16)', desc: 'UUID for cross-DB sync' },

  // ── Organization ──
  folder_id: { type: 'int', desc: 'FK to Folders — hierarchical tree organization' },
  manufacturer_id: { type: 'int', desc: 'FK to Manufacturers table' },

  // ── Coupling / Interface ──
  top_coupling_id: { type: 'int', desc: 'FK to Couplings — spindle-side interface (HSK, BT, CAT, etc.)' },
  tool_holder_id: { type: 'int', desc: 'FK to ToolHolders — for turning insert holders' },
  insert_id: { type: 'int', desc: 'FK to Inserts — indexable insert reference' },

  // ── Material ──
  cutting_material_id: { type: 'int', desc: 'FK to CuttingMaterials (carbide, HSS, cermet, CBN, PCD, etc.)' },
  mm_system_id: { type: 'int', desc: '1=Metric, 2=Inch (all dimensions in native unit)' },

  // ── Geometry references (for 3D collision) ──
  free_tip_geom_id: { type: 'int', desc: 'FK to Geometries — 3D mesh of tool tip area' },
  free_shaft_geom_id: { type: 'int', desc: 'FK to Geometries — 3D mesh of shaft/non-cutting body' },
  body_geom_id: { type: 'int', desc: 'FK to Geometries — overall 3D body for collision' },
  cutting_geom_id: { type: 'int', desc: 'FK to Geometries — cutting portion 3D mesh' },

  // ── Core dimension ──
  spindle_direction: { type: 'int', desc: 'CW=0, CCW=1' },
  total_length: { type: 'float', desc: 'Overall tool length (OAL) in mm_system units' },

  // ── Parametric dimensions (meaning varies by tool_type_id) ──
  // For Endmill (type 2): dbl_param1=diameter, dbl_param2=cutting_length,
  //   dbl_param3=shank_diameter, dbl_param4=corner_radius, etc.
  // For Drilltool (type 4): dbl_param1=diameter, dbl_param2=point_angle, etc.
  // For Ballmill (type 1): dbl_param1=ball_diameter, etc.
  dbl_param1: { type: 'float', desc: 'Primary dimension (typically cutting diameter)' },
  dbl_param2: { type: 'float', desc: 'Secondary dimension (cutting length or point angle)' },
  dbl_param3: { type: 'float', desc: 'Tertiary (shank diameter or radius)' },
  dbl_param4: { type: 'float', desc: 'Quaternary (corner radius or taper angle)' },
  dbl_param5_to_17: { type: 'float x13', desc: 'Additional geometry params (neck dia/len, helix, etc.)' },

  // ── Integer parameters ──
  int_param1: { type: 'int', desc: 'Typically flute_count / cutting_edges' },
  int_param2_to_6: { type: 'int x5', desc: 'Tool-type specific flags' },

  // ── Boolean parameters ──
  bool_param1: { type: 'bit', desc: 'Center cutting capability' },
  bool_param2: { type: 'bit', desc: 'Tool-type specific flag' },
  bool_param3: { type: 'bit', desc: 'Tool-type specific flag' },

  // ── String parameters ──
  string_param1: { type: 'string(128)', desc: 'Tool-type specific text (e.g., thread spec)' },
  string_param2: { type: 'string(128)', desc: 'Tool-type specific text' },
} as const;

// ── NCTool Table Fields (Assembled Tool) ──
// NCTool = Tool mounted in Holder with Extensions, ready for machining.
// This is what gets assigned to a magazine slot.

export const HYPERMILL_NCTOOL_FIELDS = {
  id: { type: 'int', desc: 'Auto-increment primary key' },
  nc_number_val: { type: 'int', desc: 'Tool number (T-number for NC program)' },
  nc_number_str: { type: 'string(128)', desc: 'Tool number as string (unique)' },
  nc_name: { type: 'string(128)', desc: 'Tool name for NC output' },
  comment: { type: 'string(128)', desc: 'User notes' },
  obj_guid: { type: 'binary(16)', desc: 'UUID for sync' },

  // ── Assembly references ──
  tool_id: { type: 'int', desc: 'FK to Tools — the cutting tool' },
  holder_id: { type: 'int', desc: 'FK to Holders — collet chuck / shrink fit / etc.' },
  holder_geometry_id: { type: 'int', desc: 'FK to Geometries — selected holder 3D profile' },
  fixed_holder_id: { type: 'int', desc: 'FK to FixedHolders — turret or block holder' },
  head_id: { type: 'int', desc: 'FK to Heads — angle head / speed increaser' },
  head_geometry_id: { type: 'int', desc: 'FK to Geometries — head 3D profile' },
  top_coupling_id: { type: 'int', desc: 'FK to Couplings — spindle interface of assembly' },

  // ── Critical assembly dimensions ──
  tool_length: { type: 'float', desc: 'Tool stickout from holder gauge point' },
  holder_reach: { type: 'float', desc: 'Holder reach / projection from spindle face' },
  compensation_length: { type: 'float', desc: 'Length compensation value for NC' },
  usable_length: { type: 'float', desc: 'Effective cutting depth available' },
  preset_diameter: { type: 'float', desc: 'Diameter at tool tip (for compensation)' },
  clearance_length: { type: 'float', desc: 'Non-cutting clearance above cutting zone' },
  gage_length: { type: 'float', desc: 'Gauge length (spindle face to tool tip)' },
  setting_length_z: { type: 'float', desc: 'Z preset length (turning)' },
  setting_length_x: { type: 'float', desc: 'X preset length (turning)' },
  reference_point: { type: 'int', desc: 'Reference point type for length measurement' },

  // ── Performance limits (from holder/extension chain) ──
  spindle_speed_factor: { type: 'float', desc: 'Multiplier on recommended RPM (0-1)' },
  feedrate_factor: { type: 'float', desc: 'Multiplier on recommended feed (0-1)' },
  infeed_width_factor: { type: 'float', desc: 'ae factor — reduces stepover for long tools' },
  infeed_length_factor: { type: 'float', desc: 'ap factor — reduces depth of cut' },
  max_spindle_speed: { type: 'float', desc: 'Absolute RPM limit for this assembly' },
  max_feedrate: { type: 'float', desc: 'Absolute feed limit for this assembly' },

  // ── Other ──
  coupling_rotation: { type: 'float', desc: 'Angular orientation of coupling (degrees)' },
  breakage_check: { type: 'bit', desc: 'Enable tool breakage detection' },
} as const;

// ── Couplings Table ──
// Defines spindle/holder interface standards. The iso_code field maps to
// DIN/ISO coupling designations.

export const HYPERMILL_COUPLING_FIELDS = {
  coupling_id: { type: 'int', desc: 'Primary key' },
  type: { type: 'int', desc: 'Coupling type enum (HSK, BT, CAT, Capto, KM, etc.)' },
  class: { type: 'string(128)', desc: 'Coupling class name (e.g., "HSK-A63", "BT40")' },
  iso_code: { type: 'string(64)', desc: 'ISO standard code for the coupling' },
  mm_system_id: { type: 'int', desc: '1=Metric, 2=Inch' },
  min_dia: { type: 'float', desc: 'Minimum clamping diameter' },
  max_dia: { type: 'float', desc: 'Maximum clamping diameter' },
  min_len: { type: 'float', desc: 'Minimum clamping length' },
  max_len: { type: 'float', desc: 'Maximum clamping length' },
  min_square_size: { type: 'float', desc: 'Min square shank size (for Weldon/Whistle Notch)' },
  max_square_size: { type: 'float', desc: 'Max square shank size' },
} as const;

// ── Holder Table ──
// Milling holders (collet chucks, shrink fit, hydraulic, etc.)
// Geometry stored via HolderGeometries junction → Geometries table

export const HYPERMILL_HOLDER_FIELDS = {
  id: { type: 'int', desc: 'Primary key' },
  name: { type: 'string(128)', desc: 'Unique holder name' },
  ordering_code: { type: 'string(128)', desc: 'Manufacturer part number' },
  manufacturer_id: { type: 'int', desc: 'FK to Manufacturers' },
  mm_system_id: { type: 'int', desc: '1=Metric, 2=Inch' },
  top_coupling_id: { type: 'int', desc: 'Spindle-side coupling (HSK, BT, etc.)' },
  bottom_coupling_id: { type: 'int', desc: 'Tool-side coupling (ER, shrink, etc.)' },
  spindle_speed_factor: { type: 'float', desc: 'RPM derating factor (0-1)' },
  feedrate_factor: { type: 'float', desc: 'Feed derating factor' },
  infeed_width_factor: { type: 'float', desc: 'ae derating factor' },
  infeed_length_factor: { type: 'float', desc: 'ap derating factor' },
  max_spindle_speed: { type: 'float', desc: 'Absolute RPM limit' },
  max_feedrate: { type: 'float', desc: 'Absolute feed limit' },
  coolant_through: { type: 'int', desc: 'Through-coolant capability (0=no, 1=yes)' },
} as const;

// ── ToolHolders Table (Turning) ──
// Turning tool holders with insert pocket geometry

export const HYPERMILL_TOOL_HOLDER_FIELDS = {
  tool_holder_id: { type: 'int', desc: 'Primary key' },
  type: { type: 'int', desc: 'Holder type enum' },
  name: { type: 'string(128)', desc: 'Unique name' },
  ordering_code: { type: 'string(128)', desc: 'Part number' },
  top_coupling_id: { type: 'int', desc: 'Spindle-side coupling' },
  iso_code: { type: 'string(64)', desc: 'ISO holder code (e.g., PCLNR/L, MWLNR/L)' },
  use_iso_code: { type: 'bit', desc: 'Generate geometry from ISO code' },

  // ── Insert pocket geometry ──
  side_of_insert: { type: 'int', desc: 'Insert mounting side' },
  ins_incl_axis_dist: { type: 'float', desc: 'Insert axis distance from holder axis' },
  ins_incl_shank_dist: { type: 'float', desc: 'Insert shank distance' },
  ins_incl_y_dist: { type: 'float', desc: 'Insert Y offset' },
  ins_orient_ang: { type: 'float', desc: 'Insert orientation angle (deg)' },
  ins_rake_ang: { type: 'float', desc: 'Rake angle (deg) — auto-calculated by TOOL Builder' },
  ins_incl_ang: { type: 'float', desc: 'Inclination angle (deg) — auto-calculated by TOOL Builder' },
  ins_approach_ang: { type: 'float', desc: 'Approach angle / lead angle (deg)' },
  ins_reversed: { type: 'bit', desc: 'Insert mounted reversed' },
  mounting_direction: { type: 'int', desc: 'Insert mounting direction enum' },
  mounting_direction_ang: { type: 'float', desc: 'Mounting direction angle (deg)' },
  cutting_edge_orientation: { type: 'float', desc: 'Cutting edge orientation angle' },
  spindle_direction: { type: 'int', desc: 'CW/CCW' },
  yoffset: { type: 'float', desc: 'Y-axis offset for live tooling' },

  // ── 3D geometry references ──
  full_rev_geom_id: { type: 'int', desc: 'Full revolution geometry (for collision)' },
  half_rev_geom_id: { type: 'int', desc: 'Half revolution geometry' },
  extr_geom_id: { type: 'int', desc: 'Extrusion geometry' },
  extr_thickness: { type: 'float', desc: 'Extrusion thickness' },
  polyeder_geom_id: { type: 'int', desc: '3D mesh geometry for simulation' },
  use_polyeder: { type: 'bit', desc: 'Use 3D mesh for collision instead of profile' },
  insert_support_id: { type: 'int', desc: 'FK to InsertSupports' },
} as const;

// ── Inserts Table ──

export const HYPERMILL_INSERT_FIELDS = {
  insert_id: { type: 'int', desc: 'Primary key' },
  insert_type: { type: 'int', desc: 'Insert shape type enum (C/D/R/S/T/V/W per ISO 1832)' },
  name: { type: 'string(128)', desc: 'Unique name' },
  ordering_code: { type: 'string(128)', desc: 'Manufacturer catalog code' },
  iso_code: { type: 'string(64)', desc: 'ISO 1832 insert designation (e.g., CNMG120408)' },
  use_iso_code: { type: 'bit', desc: 'Auto-generate geometry from ISO code' },
  cutting_material_id: { type: 'int', desc: 'Substrate material (carbide/cermet/CBN/PCD/ceramic)' },
  manufacturer_id: { type: 'int', desc: 'FK to Manufacturers' },
  mounting_type: { type: 'int', desc: 'Clamping type (screw, lever, wedge)' },
  thickness: { type: 'float', desc: 'Insert thickness (mm)' },
  geometry_id: { type: 'int', desc: 'FK to Geometries — 3D insert model' },
  // dbl_param1..9 are insert-type specific (e.g., inscribed circle dia, nose radius, etc.)
  dbl_param1: { type: 'float', desc: 'Primary (inscribed circle diameter / edge length)' },
  dbl_param2: { type: 'float', desc: 'Secondary (nose radius)' },
  dbl_param3_to_9: { type: 'float x7', desc: 'Additional shape params (relief angle, chipbreaker, etc.)' },
} as const;

// ── Materials Table (workpiece materials) ──

export const HYPERMILL_MATERIAL_FIELDS = {
  id: { type: 'int', desc: 'Primary key' },
  type: { type: 'int', desc: 'Material group type (maps to ISO P/M/K/N/S/H)' },
  name: { type: 'string(128)', desc: 'Material name (e.g., "1.4301 / AISI 304")' },
  norm_code: { type: 'string(128)', desc: 'Standard designation (DIN/AISI/JIS)' },
  parent_id: { type: 'int', desc: 'Parent material group for hierarchical tree' },
  chipping_class: { type: 'int', desc: 'ISO chip classification' },
  mat_db_obj_guid: { type: 'binary(16)', desc: 'Link to external material database' },
  // Per-operation speed/feed correction factors
  milling_factor_vc: { type: 'float', desc: 'Vc correction for milling' },
  milling_factor_fz: { type: 'float', desc: 'fz correction for milling' },
  milling_factor_ae: { type: 'float', desc: 'ae correction for milling' },
  milling_factor_ap: { type: 'float', desc: 'ap correction for milling' },
  drilling_factor_vc: { type: 'float', desc: 'Vc correction for drilling' },
  drilling_factor_fz: { type: 'float', desc: 'fz correction for drilling' },
  insert_factor_vc: { type: 'float', desc: 'Vc correction for turning/indexable' },
  insert_factor_fz: { type: 'float', desc: 'fz correction for turning/indexable' },
  insert_factor_ae: { type: 'float', desc: 'ae correction for turning/indexable' },
  insert_factor_ap: { type: 'float', desc: 'ap correction for turning/indexable' },
} as const;

// ── Technology Table (Cutting Data / Speed-Feed) ──

export const HYPERMILL_TECHNOLOGY_FIELDS = {
  technology_id: { type: 'int', desc: 'Primary key' },
  technology_type: { type: 'int', desc: 'Operation type (milling/drilling/turning/etc.)' },
  material_id: { type: 'int', desc: 'FK to Materials — workpiece material' },
  cutting_material_id: { type: 'int', desc: 'FK to CuttingMaterials — tool substrate' },
  purpose_id: { type: 'int', desc: 'FK to TechnologyPurposes (roughing/finishing/etc.)' },
  mm_system_id: { type: 'int', desc: '1=Metric, 2=Inch' },
  spindle_speed: { type: 'float', desc: 'Recommended RPM (or 0 for formula)' },
  feedrate: { type: 'float', desc: 'Recommended feed (mm/tooth or mm/rev)' },
  cutting_speed: { type: 'float', desc: 'Recommended Vc (m/min)' },
  coolants: { type: 'string(32)', desc: 'Coolant configuration string' },
  // dbl_param1..9 = operation-specific (ap, ae, infeed, retract, etc.)
  // formula_id1..10 = FK to Formulas for computed values (Vc=f(D), fz=f(D), etc.)
} as const;

// ── CuttingProfiles Table (NCTool-level overrides) ──
// When an NCTool is assembled, its cutting data can be overridden.
// Flags fields use bitmask to indicate which values are assembly-overridden.

export const HYPERMILL_CUTTING_PROFILE_FIELDS = {
  cutting_profile_id: { type: 'int', desc: 'Primary key' },
  nctool_id: { type: 'int', desc: 'FK to NCTools' },
  technology_id: { type: 'int', desc: 'FK to Technologies (base cutting data)' },
  technology_type: { type: 'int', desc: 'Operation type' },
  spindle_speed: { type: 'float', desc: 'Override RPM' },
  spindle_speed_factor: { type: 'float', desc: 'RPM adjustment factor' },
  spindle_speed_flags: { type: 'int', desc: 'Bitmask: which RPM values are overridden' },
  feedrate: { type: 'float', desc: 'Override feed' },
  feedrate_factor: { type: 'float', desc: 'Feed adjustment factor' },
  feedrate_flags: { type: 'int', desc: 'Bitmask: which feed values are overridden' },
  cutting_speed: { type: 'float', desc: 'Override Vc' },
  cutting_speed_factor: { type: 'float', desc: 'Vc adjustment factor' },
  cutting_speed_flags: { type: 'int', desc: 'Bitmask: which Vc values are overridden' },
  coolants: { type: 'string(32)', desc: 'Override coolant config' },
  coolants_flags: { type: 'int', desc: 'Bitmask: coolant override flags' },
  // dbl_param1..18 = per-assembly cutting parameter overrides
  // int_param1..12 = integer parameter overrides
} as const;

// ── Geometries Table (Collision Envelopes) ──
// Central geometry storage used by tools, holders, extensions, heads

export const HYPERMILL_GEOMETRY_FIELDS = {
  id: { type: 'int', desc: 'Primary key' },
  restrictions: { type: 'int', desc: 'Usage restrictions bitmask' },
  name: { type: 'string(128)', desc: 'Geometry name' },
  active: { type: 'bit', desc: 'Whether geometry is active for collision' },
  polyline: { type: 'binary', desc: '2D profile polyline for revolution-based collision envelope' },
  polyeder_file_id: { type: 'int', desc: 'FK to Files — 3D triangulated mesh (STL-like)' },
  cad_file_id: { type: 'int', desc: 'FK to Files — STEP/IGES CAD model' },
  mac_side_cs: { type: 'binary(72)', desc: 'Machine-side coordinate system (4x4 matrix + origin)' },
  wp_side_cs: { type: 'binary(72)', desc: 'Workpiece-side coordinate system' },
} as const;

// ── Collision Geometry Architecture ──
// hyperMILL uses a multi-level collision model:
//
// 1. ROTATIONAL PROFILE (polyline):
//    - 2D outline revolved around tool axis
//    - Generated by TOOL Builder from 3D STEP/IGES data
//    - Fastest for milling tool collision (symmetric bodies)
//    - Stored as binary polyline in Geometries.polyline
//
// 2. 3D MESH (polyeder):
//    - Triangulated surface mesh
//    - Used for non-symmetric bodies (angle heads, turret holders)
//    - Stored compressed in Files table, linked via polyeder_file_id
//
// 3. CAD MODEL (cad_file):
//    - Full STEP/IGES/HMC parametric model
//    - Used in VIRTUAL Machining Center for exact collision
//    - Stored in Files table, linked via cad_file_id
//
// TOOL Builder workflow:
//    Import STEP → auto-detect body → define axis → set couplings →
//    generate rotational profile → optional simplification → export to DB
//
// Virtual Tool collision:
//    "Use collision check" flag in VT procedure checks NC tool assembly
//    against part geometry during tool search (drilling/boring only —
//    milling would require full toolpath, too expensive for search)

// ── Standards Referenced ──
// - ISO 1832: Indexable insert designation system (insert_type + iso_code)
// - ISO 13399: Cutting tool data representation (partial — hyperMILL predates full adoption)
// - DIN 69871: Steep taper toolholders (BT/CAT) — coupling types
// - DIN 69893: HSK hollow shank taper — coupling types
// - ISO 12164: Modular tooling (Capto, KM, KM4X) — coupling types
// - ISO 26623: Polygon taper (PSC/Capto C-series) — coupling types

// ── Mapping: hyperMILL → PRISM CatalogTool ──

export const HYPERMILL_TO_PRISM_FIELD_MAP = {
  // hyperMILL field → PRISM CatalogTool field
  'Tools.name': 'designation',
  'Tools.ordering_code': 'designation (alt)',
  'Tools.tool_type_id': 'type + subtype (via GeometryClasses lookup)',
  'Tools.total_length': 'physical.overall_length_mm',
  'Tools.dbl_param1': 'physical.cutting_diameter_mm (for milling/drilling)',
  'Tools.dbl_param2': 'physical.flute_length_mm (endmill) / physical.point_angle_deg (drill)',
  'Tools.dbl_param3': 'physical.shank_diameter_mm',
  'Tools.dbl_param4': 'physical.corner_radius_mm (radiusmill)',
  'Tools.int_param1': 'flute_count',
  'Tools.bool_param1': 'center_cutting',
  'Tools.spindle_direction': '(no direct map — inferred from operation)',
  'Tools.cutting_material_id': 'material (via CuttingMaterials lookup)',
  'Manufacturers.name': 'manufacturer',
  'Couplings.class': 'holder_interface',
  'Technologies.cutting_speed': 'cutting_data[iso_group].vc_min/vc_max',
  'Technologies.feedrate': 'cutting_data[iso_group].fz_min/fz_max',
  'Technologies.coolants': 'coolant',
  'NCTools.gage_length': 'collision_envelope.total_reach_mm',
  'NCTools.usable_length': '(no direct map — computed from tool_length)',
  'NCTools.preset_diameter': '(diameter compensation value)',
  'Holders.max_spindle_speed': '(performance constraint)',
  'Holders.max_feedrate': '(performance constraint)',
  'Geometries.polyline': 'collision_envelope.profile (needs binary decode)',
  'Geometries.polyeder_file_id': '(3D mesh — not in PRISM CatalogTool)',
} as const;

// ── GeometryClass → PRISM type mapping ──

export const HYPERMILL_TYPE_TO_PRISM = {
  1: { type: 'ball_mill', subtype: 'ball' },
  2: { type: 'end_mill', subtype: 'square' },
  3: { type: 'bull_mill', subtype: 'corner_radius' },
  4: { type: 'drill', subtype: undefined },
  5: { type: 'end_mill', subtype: 'lollipop' },
  6: { type: 'slot_drill', subtype: 'woodruff' },
  7: { type: 'end_mill', subtype: 'barrel' },
  8: { type: 'end_mill', subtype: 'lens' },
  9: { type: 'chamfer_mill', subtype: undefined },
  10: { type: 'slot_drill', subtype: 't_slot' },
  11: { type: 'tap', subtype: undefined },
  12: { type: 'boring_bar', subtype: undefined },
  13: { type: 'drill', subtype: 'gun_drill' },
  15: { type: 'end_mill', subtype: 'thread_mill' },
  16: { type: 'reamer', subtype: undefined },
  17: { type: 'end_mill', subtype: 'tangent_barrel' },
  18: { type: 'end_mill', subtype: 'conical_barrel' },
  19: { type: 'face_mill', subtype: 'round_insert' },
  20: { type: 'face_mill', subtype: 'high_feed' },
  21: { type: 'boring_bar', subtype: 'back_boring' },
  1000: { type: 'turning_tool', subtype: 'general' },
  1001: { type: 'grooving_tool', subtype: 'radial' },
  1002: { type: 'grooving_tool', subtype: 'axial' },
  1003: { type: 'threading_tool', subtype: undefined },
  1004: { type: 'turning_tool', subtype: 'parting' },
  1005: { type: 'turning_tool', subtype: 'roll_turn' },
  2000: { type: 'insert', subtype: 'probe' },       // Not a cutting tool
  3000: { type: 'end_mill', subtype: 'grinding' },
  4000: { type: 'end_mill', subtype: 'additive' },   // DED nozzle
} as const;

// ── Database Entity Summary ──
// 33 tables total in hyperMILL tool database v1.53:
//
// Core tool definition:
//   Tools, NCTools, ToolClasses, GeometryClasses, Geometries, Files
//
// Holder stack:
//   Holders, Extensions, Heads, ToolHolders, StaticHolders, FixedHolders
//   + junction tables: HolderGeometries, ExtensionGeometries, HeadGeometries
//   + Components (extension chain in NCTool assembly)
//
// Inserts:
//   Inserts, InsertSupports, InsertTechnologies
//
// Cutting data:
//   Technologies, LinkedTechnologies, TechnologyPurposes, TechnologyTemplates
//   CuttingProfiles, CuttingProfileModifiers, ToolTechnologies
//   MatTechs, MatTechItems (diameter-dependent speed/feed tables)
//
// Organization:
//   Folders, Manufacturers, CuttingMaterials, Materials, Coolants, Couplings
//   Depots, DepotItems (magazine management)
//
// Custom data (user-defined fields):
//   CustomDataClasses, CustomDataValues
//   + 7 junction tables: NCTool/Tool/Holder/Extension/ToolHolder/
//     StaticHolder/FixedHolder/Insert/Material CustomData
//
// System:
//   Properties, Connections, Locks, Log, LogEntryTypes, SystemOfMeasurement
//   ReferencePoints (turning tool reference points), TurningSetups, DocObjects

// ── Key Schema Insights for PRISM Enrichment ──
//
// 1. PERFORMANCE DERATING CHAIN: hyperMILL propagates spindle_speed_factor,
//    feedrate_factor, infeed_width_factor, infeed_length_factor through the
//    entire holder chain (Holder → Extension → FixedHolder → NCTool).
//    Each level can constrain the tool below. PRISM could add similar
//    factor fields to ToolAssembly.
//
// 2. COUPLING SYSTEM: Couplings have min/max diameter and length ranges,
//    enabling automatic compatibility checking. PRISM's holder_interface
//    string could be enriched with coupling compatibility data.
//
// 3. FORMULA REFERENCES: Technologies can link to Formulas table for
//    computed Vc=f(D), fz=f(D), ap=f(D). This is more flexible than
//    PRISM's static cutting_data ranges. Consider adding formula support.
//
// 4. TECHNOLOGY TEMPLATES: ToolClasses link to TechnologyTemplates for
//    material-specific cutting data presets. This is the hyperMILL equivalent
//    of PRISM's cutting_data Record<iso_group, {...}> but more granular.
//
// 5. MULTI-GEOMETRY COLLISION: Tools have 4 geometry slots (free_tip,
//    free_shaft, body, cutting) enabling zone-specific collision detail.
//    PRISM's single ToolCollisionEnvelope.profile could be extended.
//
// 6. BARREL TOOLS: hyperMILL has 3 barrel types (General/Tangent/Conical)
//    reflecting MAXX Machining support. PRISM's CatalogTool.type enum
//    doesn't currently distinguish these; subtype field could capture this.
//
// 7. MEASUREMENT SYSTEM: All dimensions stored with mm_system_id (1=Metric,
//    2=Inch). PRISM assumes mm; import code must check and convert.
//
// 8. CUSTOM DATA EXTENSIBILITY: hyperMILL allows user-defined fields via
//    CustomDataClasses/Values. PRISM's CatalogTool could add a
//    custom_fields?: Record<string, string> for imported hyperMILL data.
