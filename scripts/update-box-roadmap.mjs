import { readFileSync, writeFileSync } from "fs";

const roadmap = JSON.parse(readFileSync("data/milestones/BOX-AUDIT.json", "utf8"));

roadmap._meta.version = "2.0.0";
roadmap._meta.updated = "2026-04-04";
roadmap._meta.description += " EXPANDED: ALL programs (lathe + mill + wire EDM), Fusion 360 cloud JM Die team extraction, Calculator page program upload with interactive tool callout selection and auto speed/feed adjustment.";

roadmap._meta.box_paths.cnc_mill_haas_old = "C:\\Users\\wompu\\Box\\CNC MILL HAAS OLD";
roadmap._meta.box_paths.fusion_cloud = "Autodesk Fusion 360 Teams - JM Die project (APS API or local cache)";
roadmap._meta.box_paths.engraving = "C:\\Users\\wompu\\Box\\ENGRAVING JOBS";
roadmap._meta.box_paths.inventor_cad = "C:\\Users\\wompu\\Box\\AUTODESK INVENTOR CNC FILES";

roadmap._meta.inventory = {
  cnc_lathe_folders: 216,
  cnc_mill_haas_folders: 59,
  cnc_mill_hurco_files: 111,
  roku_roku_files: 113,
  cnc_multus_files: "10+",
  inventor_cad_files: "50+",
  fusion_cloud_projects: "TBD - requires APS API access",
  total_estimated_programs: "2000+",
};

roadmap.milestones.push({
  id: "BOX-MS6",
  title: "Fusion 360 Cloud Extraction - JM Die Team Programs & Setups",
  status: "not_started",
  priority: "high",
  depends_on: ["BOX-MS0"],
  description: "Extract all programs, setups, tool libraries, and CAM configs from Fusion 360 cloud JM Die team. Extremely valuable for 5-axis programming, setup docs, and toolpath strategies.",
  units: [
    { id: "U-BOX53", title: "FusionCloudConnectorEngine - authenticate with APS (OAuth2). List all projects in JM Die team hub. Fallback: Fusion 360 add-in (Python) that exports from inside Fusion.", status: "not_started" },
    { id: "U-BOX54", title: "FusionProjectCrawlerEngine - recursively list all designs in JM Die project. Extract: name, dates, component count, CAM setup count. Build project tree.", status: "not_started" },
    { id: "U-BOX55", title: "FusionCAMExtractorEngine - for each design with CAM: extract setups, operations, tools, toolpaths. Export NC code. Extract 5-axis strategies (swarf, flow, multi-axis contour), tool orientation, tilt limits, lead/lag angles.", status: "not_started" },
    { id: "U-BOX56", title: "FusionToolLibraryExtractorEngine - export complete Fusion tool libraries. Map to PRISM ToolCatalogEngine format.", status: "not_started" },
    { id: "U-BOX57", title: "FusionSetupDocumentEngine - for each CAM setup, generate structured documentation: fixture, datum scheme, stock, operation sequence, tool list, cycle time.", status: "not_started" },
    { id: "U-BOX58", title: "Batch extraction on entire JM Die project. Store in data/fusion-programs/. Generate summary and wire speed/feed data into calibration tables.", status: "not_started" },
    { id: "U-BOX59", title: "Tests: verify extraction produces valid tool library, valid NC, correct machine assignments. Cross-validate speeds/feeds vs PRISM physics.", status: "not_started" },
  ],
});

roadmap.milestones.push({
  id: "BOX-MS7",
  title: "Calculator Page - Program Upload, Tool Callout Selection & Auto Speed/Feed",
  status: "not_started",
  priority: "critical",
  depends_on: ["BOX-MS0", "BOX-MS1", "BOX-MS3"],
  description: "Calculator page program upload feature. User uploads program -> system analyzes -> displays tool callouts as selectable cards -> user picks exact tooling from shop library -> speed/feed auto-adjusts based on machine, material, stock size, workholding, stickout, and selected tooling.",
  units: [
    { id: "U-BOX60", title: "ProgramUploadAnalyzerEngine - accepts any CNC program (.MIN/.nc/.tap/.hnc). Parses with dialect-appropriate parser. Extracts: tool list, operation types, original S/F, cycle structure, material/workholding hints from comments.", status: "not_started" },
    { id: "U-BOX61", title: "ToolCalloutCardEngine - for each tool in program, generate interactive card: station#, operation desc, original insert type/radius, current S/F, suggested optimal S/F, compatibility warnings. Selectable to assign exact tool from shop library.", status: "not_started" },
    { id: "U-BOX62", title: "ShopToolLibraryEngine - persistent shop tool library. Stores tool_id, description, insert_type, nose_radius, holder_style, station_preferences, typical_operations. Grows as user selects tools during analysis. Auto-populates matching callouts in future programs.", status: "not_started" },
    { id: "U-BOX63", title: "AutoSpeedFeedAdjusterEngine - when user selects machine + material + stock + workholding + stickout + tooling per station -> recalculate ALL S/F. Physics: Kienzle force, power check, Taylor life, Ra, chatter, deflection. Accounts for: actual insert radius, actual boring bar size (rigidity), actual drill size (peck/thrust), stock diameter (CSS RPM), stickout (L/D chatter), workholding (grip force = max RPM).", status: "not_started" },
    { id: "U-BOX64", title: "MacroHeaderInjectorEngine - inject parametric macro header. V1=stock_dia, V3=drill_size, V_boring_bar per bore tool, V_insert_radius per turning tool. Auto-calc RPM and feed variables. IF/GOTO for optional features. Matches shop macro convention (V1-V100, V45-V56 speeds/feeds).", status: "not_started" },
    { id: "U-BOX65", title: "Calculator page frontend - upload dropzone, syntax-highlighted G-code preview, tool card grid (selectable per station), machine/material/stock/workholding panel, stickout slider, live S/F preview, download optimized+macro program, save to shop library.", status: "not_started" },
    { id: "U-BOX66", title: "ProgramMemoryEngine - remember tool selections per customer/part#. Auto-populate previous selections on re-upload. Track which assignments produced good results. Build shop standard tool assignments per operation type as default suggestions.", status: "not_started" },
    { id: "U-BOX67", title: "Wire to dispatchers - program_upload_analyze, program_tool_callouts, program_auto_speed_feed, program_inject_macro to productDispatcher. shop_tool_save/search/suggest to dataDispatcher. Wire frontend API routes.", status: "not_started" },
    { id: "U-BOX68", title: "Tests: upload 5 real programs -> verify tool extraction -> select different tools -> verify S/F recalculates -> verify macro header -> verify round-trip. Test: simple OD, boring bar substitution, threading, C-axis, bar feeder program.", status: "not_started" },
  ],
});

roadmap.milestones.push({
  id: "BOX-MS8",
  title: "Wire EDM + Mill Program Parsing & Pattern Extraction",
  status: "not_started",
  priority: "high",
  depends_on: ["BOX-MS0"],
  description: "Extend parsers for ALL Box programs: Haas mill (59 folders), Hurco mill (111 files), Roku-Roku micro-mill (113 files), Okuma Multus mill-turn, Wire EDM, engraving. Mine milling patterns: HSM, adaptive clearing, rest machining, 3D waterline, 5-axis swarf.",
  units: [
    { id: "U-BOX69", title: "HaasMillParserEngine - parse Haas VF2 .nc programs. Handle: O-number, G43 TLC, G41/G42 cutter comp, G187 smoothing, adaptive feed, probing. Extract tool list with diameters, operation types, HSM codes.", status: "not_started" },
    { id: "U-BOX70", title: "HurcoMillParserEngine - parse Hurco VM30i programs. Handle WinMax conversational + G-code mode. Extract part setup, tool library refs, canned cycles, 3D surfacing.", status: "not_started" },
    { id: "U-BOX71", title: "RokuRokuMicroMillParser - parse Roku-Roku (Mitsubishi M70/M80). Handle: micro-tools (0.1-3mm), high RPM (40K+), SSS, AICC-II, G05 P10000 HPCC. Extract micro-milling strategies.", status: "not_started" },
    { id: "U-BOX72", title: "WireEDMProgramParser - parse wire EDM programs. Handle Mitsubishi/Sodick/Fanuc wire dialects. Extract cut sequence, wire offset, flushing, taper angles.", status: "not_started" },
    { id: "U-BOX73", title: "MillPatternMinerEngine - mine milling patterns: pocket strategies, HSM params by material, step-over ratios, plunge strategies, chip loads. Feed into PRISM milling knowledge base.", status: "not_started" },
    { id: "U-BOX74", title: "Tests: parse 3 Haas + 3 Hurco + 3 Roku-Roku + wire EDM. Verify tool extraction, operation detection, S/F extraction per dialect.", status: "not_started" },
  ],
});

roadmap._meta.total_milestones = roadmap.milestones.length;
roadmap._meta.total_units = roadmap.milestones.reduce((sum, ms) => sum + ms.units.length, 0);

writeFileSync("data/milestones/BOX-AUDIT.json", JSON.stringify(roadmap, null, 2));
console.log(`Updated: ${roadmap._meta.total_milestones} milestones, ${roadmap._meta.total_units} units`);
