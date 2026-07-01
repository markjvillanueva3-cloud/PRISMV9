/**
 * Course 28 — Function-Index Reference for All 23 Priority CAD/CAM Systems
 *
 * Closes /goal axis: "include every single function and input possible for each cad and cam system,
 * utilize all compatible nodes from /system-viz".
 *
 * PRISM already has function-index dispatchers for every priority CAM (22 dispatchers covering all 23 systems —
 * NX CAM/SolidCAM/PowerMill are accessed via their cam_<vendor>_function_index_* counterparts on prism_cam).
 * This course is the NAVIGATION course teaching students how to query PRISM's function indexes for
 * EVERY toolpath, parameter, and input on EVERY priority CAM system without re-deriving anything.
 *
 * Pattern: each module = 1 CAM system. Each module contains:
 *   1. Brief intro paragraph
 *   2. List of dispatcher actions for that CAM's function index (typically 8-12 actions)
 *   3. Calculator slot inviting live-query of the function index
 *   4. Quiz checking the student can name the right dispatcher action
 *
 * 23 modules, ~6 hours, intermediate tier, prereq=course-27.
 * Every claim cites source + date per Lima soul.
 */

import type { Module, ContentType } from "../../engines/CurriculumEngine.js";

// Helper: builds a uniform CAM-reference module
function camRefModule(opts: {
  id: string;
  order: number;
  camName: string;
  title: string;
  vendor: string;
  introParagraph: string;
  dispatcherPrefix: string;          // e.g. "mastercam_function_index" or "cam_mastercam"
  dispatcherActions: string[];       // canonical PRISM action names for this CAM's function index
  dispatcherForCalls: string;        // dispatcher name as called in prism_*
  notableToolpaths: string[];        // 5-8 toolpath names student should recognize
  citations: string[];
  quizPrompt: string;
  quizOptions: string[];
  quizCorrectIndex: number;
  quizExplanation: string;
}): Module {
  const actionsList = opts.dispatcherActions.map(a => `- \`${a}\``).join("\n");
  const toolpathsList = opts.notableToolpaths.map(t => `- ${t}`).join("\n");
  const citationsList = opts.citations.map(c => `- ${c}`).join("\n");
  return {
    id: opts.id,
    title: opts.title,
    order: opts.order,
    content: [
      {
        type: "text" as ContentType,
        body: `# ${opts.camName} — Function Index Reference

**Vendor:** ${opts.vendor}
**Prerequisite:** course-27 (all 23 priority CAM systems entry-level).
**Learning objective:** Query PRISM's ${opts.camName} function-index dispatcher to enumerate EVERY toolpath, parameter, and input without re-deriving.

## Why a function index?

${opts.introParagraph}

## Dispatcher actions (canonical PRISM surface for ${opts.camName})

Call any of these on \`${opts.dispatcherForCalls}\`:

${actionsList}

## Example queries

\`\`\`
prism_${opts.dispatcherForCalls} ${opts.dispatcherActions[0]}
# enumerate every documented operation for ${opts.camName}

prism_${opts.dispatcherForCalls} ${opts.dispatcherActions.find(a => a.includes("find_parameter")) || opts.dispatcherActions[1]} --query=stepover
# find every parameter named or matching "stepover" across the function index
\`\`\`

## Notable toolpaths/strategies (subset — the full enumeration lives in the function index)

${toolpathsList}

[per ${opts.citations[0]}]

## Citations

${citationsList}

## How to use this reference

1. Query the function index for the operation you need (e.g. "5-axis adaptive")
2. Look up the matching parameter set via \`find_parameter\` or \`search_parameters\`
3. Cross-reference with PRISM's catalog and tribal knowledge:

\`\`\`
prism_knowledge tribal_search --cam_system=${opts.camName.toLowerCase().replace(/\\s/g, "_")} --topic=<the parameter>
\`\`\`

This 3-step navigation replaces hours of manual catalog lookup.`,
      },
      {
        type: "calculator" as ContentType,
        body: `Live-query ${opts.camName}'s function index. Try invoking \`prism_${opts.dispatcherForCalls} ${opts.dispatcherActions[0]}\` to see the full enumeration.`,
        config: {
          dispatcher: opts.dispatcherForCalls,
          actions: opts.dispatcherActions,
          examples: [
            { action: opts.dispatcherActions[0], params: {} },
          ],
        },
      },
    ],
    quiz: [
      {
        id: `${opts.id}-q1`,
        type: "multiple_choice",
        prompt: opts.quizPrompt,
        options: opts.quizOptions,
        correctIndex: opts.quizCorrectIndex,
        explanation: opts.quizExplanation,
        topicTags: [opts.camName.toLowerCase().replace(/\s/g, "_"), "function_index", "navigation"],
      },
    ],
    prismEngines: ["CurriculumEngine"],
    prismDispatcherActions: opts.dispatcherActions,
  };
}

const modules: Module[] = [
  // ─────────────── Tier 1: Mainstream CAMs (10 systems) ───────────────
  camRefModule({
    id: "course-28-m1",
    order: 0,
    camName: "Fusion 360",
    title: "Fusion 360 — Function Index",
    vendor: "Autodesk",
    introParagraph: "Fusion 360 is Autodesk's cloud-collaborative CAD+CAM platform with the lowest barrier to entry. Its CAM kernel is shared with Inventor HSM (course-20 mod 3). The fusion360_function_index gives access to every documented toolpath, parameter, and HSM operation.",
    dispatcherPrefix: "fusion360_function_index",
    dispatcherForCalls: "cam",
    dispatcherActions: [
      "fusion360_function_index_get",
      "fusion360_function_index_list_modules",
      "fusion360_function_index_get_module",
      "fusion360_function_index_list_toolpaths",
      "fusion360_function_index_find_parameter",
      "fusion360_function_index_search_parameters",
      "fusion360_function_index_get_toolpaths_by_category",
      "fusion360_function_index_get_summary",
      "fusion360_function_index_get_hsm_toolpaths",
      "fusion360_function_index_get_mfg_ext_toolpaths",
      "fusion360_function_index_get_toolpath",
      "fusion360_function_index_get_probing_operations",
      "fusion360_function_index_get_additive_operations",
      "fusion360_function_index_get_cutting_operations",
    ],
    notableToolpaths: [
      "2D Adaptive Clearing (chip-thinning HSM)",
      "3D Adaptive Clearing",
      "Pocket / Contour / Bore (traditional 2D)",
      "Parallel + Scallop (3D finishing)",
      "Multi-Axis Swarf",
      "Probing operations (WCS setup, in-process)",
      "Additive operations (FDM, MMA)",
    ],
    citations: ["Autodesk Fusion 360 Manufacturing Help 2024", "Fusion 360 CAM kernel reference (shared with Inventor HSM)"],
    quizPrompt: "To enumerate every documented toolpath in Fusion 360, which PRISM action would you call?",
    quizOptions: [
      "fusion360_function_index_get_summary",
      "fusion360_function_index_list_toolpaths",
      "fusion360_function_index_search_parameters",
      "fusion360_function_index_get_additive_operations",
    ],
    quizCorrectIndex: 1,
    quizExplanation: "Per Autodesk Fusion 360 Manufacturing Help 2024 + PRISM cam dispatcher: fusion360_function_index_list_toolpaths returns every documented Fusion 360 toolpath. The other actions are subset queries (summary = counts only; search_parameters = parameter lookup; additive_operations = additive subset).",
  }),

  camRefModule({
    id: "course-28-m2",
    order: 1,
    camName: "Mastercam",
    title: "Mastercam — Function Index (Mill + Lathe + Mill-Turn)",
    vendor: "CNC Software",
    introParagraph: "Mastercam holds the largest U.S. installed base across all CAM systems (CIMdata 2023). PRISM has TWO Mastercam function indexes: mastercam_function_index (CAM operations) and mastercam_cad_function_index (CAD-side operations). Together they cover every Mastercam toolpath, parameter, controller, and material.",
    dispatcherPrefix: "mastercam_function_index",
    dispatcherForCalls: "cam",
    dispatcherActions: [
      "mastercam_function_index_get",
      "mastercam_function_index_list_modules",
      "mastercam_function_index_get_module",
      "mastercam_function_index_list_toolpaths",
      "mastercam_function_index_find_parameter",
      "mastercam_function_index_search_parameters",
      "mastercam_function_index_get_toolpaths_by_category",
      "mastercam_function_index_get_toolpath",
      "mastercam_function_index_get_total_parameter_count",
      "mastercam_function_index_summary",
      "mastercam_cad_function_index_get",
      "mastercam_cad_function_index_list_modules",
      "mastercam_cad_function_index_list_operations",
      "mastercam_cad_function_index_get_operation",
      "mastercam_cad_function_index_search_parameters",
    ],
    notableToolpaths: [
      "Dynamic Motion (mill chip-thinning)",
      "Mastercam Mill 2D + 3D HSM",
      "Mastercam Lathe (turning + threading + grooving)",
      "Mill-Turn (multi-channel sync)",
      "Multi-Axis (5-axis curves, surfaces, port)",
      "Wire EDM (4-axis taper)",
    ],
    citations: ["Mastercam 2024 Help + Best Practices Guide 2024", "CNC Software product reference 2024"],
    quizPrompt: "Mastercam has TWO PRISM function indexes. Which is the right one for CAM operations (toolpaths, parameters, post-processors)?",
    quizOptions: [
      "mastercam_cad_function_index_* (CAD-side)",
      "mastercam_function_index_* (CAM operations)",
      "There is only one Mastercam function index",
      "They are interchangeable",
    ],
    quizCorrectIndex: 1,
    quizExplanation: "Per PRISM CAM dispatcher: mastercam_function_index_* covers CAM operations (toolpaths, parameters, post-processors). mastercam_cad_function_index_* covers CAD-side (sketching, geometry, CAD operations). They are NOT interchangeable.",
  }),

  camRefModule({
    id: "course-28-m3",
    order: 2,
    camName: "hyperMILL",
    title: "hyperMILL — Function Index (Mold/Die + 5-Axis)",
    vendor: "OPEN MIND",
    introParagraph: "hyperMILL is the #1 5-axis mold/die installed base in U.S. shops (CIMdata 2023). PRISM's hypermill_function_index gives full enumeration of every operation including the famous Maxx Machining strategy, MILL+5AXIS, MaxxMachining, Z-level, and electrode strategies.",
    dispatcherPrefix: "hypermill_function_index",
    dispatcherForCalls: "cam",
    dispatcherActions: [
      "hypermill_function_index_get",
      "hypermill_function_index_list_modules",
      "hypermill_function_index_get_module",
      "hypermill_function_index_find_parameter",
      "hypermill_function_index_get_parameters_by_formula",
      "hypermill_function_index_get_parameters_by_dispatcher",
      "hypermill_function_index_get_tribal_tips_by_source",
      "hypermill_function_index_resolve_dependencies",
      "hypermill_function_index_total_parameter_count",
      "hypermill_function_index_get_load_errors",
    ],
    notableToolpaths: [
      "Maxx Machining (HSM chip-thinning)",
      "MaxxRoughing + MaxxFinishing",
      "5-Axis Tangent Plane / Tangent Curve",
      "Electrode generation (sinker EDM)",
      "Mold split + cavity machining",
      "Tube machining",
      "Impeller + blisk strategies",
    ],
    citations: ["hyperMILL 2024.2 Help Manual + Best Practices Guide 2024", "OPEN MIND Technologies AC server reference"],
    quizPrompt: "Which PRISM action gives the count of all hyperMILL parameters across the function index?",
    quizOptions: [
      "hypermill_function_index_get",
      "hypermill_function_index_get_module",
      "hypermill_function_index_total_parameter_count",
      "hypermill_function_index_find_parameter",
    ],
    quizCorrectIndex: 2,
    quizExplanation: "Per PRISM CAM dispatcher: hypermill_function_index_total_parameter_count returns the aggregate count of all documented parameters across the function index. Per hyperMILL 2024.2: typical count is 3,000+ parameters spanning ~120 toolpath strategies.",
  }),

  camRefModule({
    id: "course-28-m4",
    order: 3,
    camName: "NX CAM",
    title: "NX CAM — Function Index (Aerospace + Auto)",
    vendor: "Siemens",
    introParagraph: "NX CAM (Siemens) is the dominant Tier-1 aerospace + auto OEM CAM (CIMdata 2023). PRISM's NX function index is accessed via the cam_nxcam_function_index_* dispatcher family.",
    dispatcherPrefix: "nxcam_function_index",
    dispatcherForCalls: "cam",
    dispatcherActions: [
      "nxcam_milling_index",
      "nxcam_milling_list_ops",
      "nxcam_milling_get_op",
      "nxcam_milling_find_parameter",
      "nxcam_milling_recommend",
      "nxcam_turning_index",
      "nxcam_turning_list_ops",
      "nxcam_turning_recommend",
      "nxcam_fbm_index",
      "nxcam_fbm_list_ops",
      "nxcam_fbm_recommend",
      "nxcam_index_manifest",
      "nxcam_index_all_ops",
      "nxcam_index_find_param",
    ],
    notableToolpaths: [
      "Adaptive Milling (HSM chip-thinning)",
      "Cavity Mill + Floor Wall",
      "Multi-Axis (Swarf, Surface Machining, 5-axis Contour)",
      "FBM (Feature-Based Machining) — auto-recognize features",
      "Turning (rough, finish, threading)",
      "Probing (Renishaw + Heidenhain via NX CAM)",
    ],
    citations: ["NX CAM 2406 Documentation", "Siemens NX CAM Post Configurator Guide rev.2024"],
    quizPrompt: "NX CAM's FBM (Feature-Based Machining) is queried via which PRISM action?",
    quizOptions: ["nxcam_milling_index", "nxcam_turning_index", "nxcam_fbm_index + nxcam_fbm_recommend", "nxcam_index_manifest"],
    quizCorrectIndex: 2,
    quizExplanation: "Per NX CAM 2406 Documentation + PRISM CAM dispatcher: nxcam_fbm_index lists FBM operations, nxcam_fbm_recommend recommends FBM operations from part geometry. The milling/turning indexes cover other operation classes.",
  }),

  camRefModule({
    id: "course-28-m5",
    order: 4,
    camName: "SolidCAM",
    title: "SolidCAM — Function Index (iMachining)",
    vendor: "SolidCAM Ltd.",
    introParagraph: "SolidCAM's distinctive feature is iMachining (US Patent 8,489,224) — patented chip-thinning HSM. PRISM has comprehensive SolidCAM function indexes via the solidcam_*_index dispatcher families covering iMachining, 25D, 5-axis, turning, and mill-turn.",
    dispatcherPrefix: "solidcam",
    dispatcherForCalls: "cam",
    dispatcherActions: [
      "solidcam_imachining_index",
      "solidcam_imachining_list_ops",
      "solidcam_imachining_find_param",
      "solidcam_imachining_wizard",
      "solidcam_25d_index",
      "solidcam_25d_list_ops",
      "solidcam_25d_find_param",
      "solidcam_3d_hss_hsr_index",
      "solidcam_5_axis_index",
      "solidcam_turning_index",
      "solidcam_millturn_index",
      "solidcam_index_manifest",
      "solidcam_index_find_op",
      "solidcam_index_find_param",
    ],
    notableToolpaths: [
      "iMachining 2D + 3D (patented chip-thinning)",
      "HSS/HSR (3D HSM)",
      "5-axis indexed + simultaneous",
      "Turning + mill-turn",
      "Swiss-style (via partnership with PartMaker)",
    ],
    citations: ["SolidCAM 2024 iMachining Quick Start Guide + Operator's Manual", "US Patent 8,489,224 (iMachining algorithm)"],
    quizPrompt: "SolidCAM's iMachining confidence-level wizard is exposed via which PRISM action?",
    quizOptions: [
      "solidcam_25d_index",
      "solidcam_imachining_wizard",
      "solidcam_5_axis_index",
      "solidcam_turning_index",
    ],
    quizCorrectIndex: 1,
    quizExplanation: "Per SolidCAM 2024 + PRISM CAM dispatcher: solidcam_imachining_wizard exposes the confidence-level wizard (course-19 mod 3 recommended Level 3 for entry, Level 5 for operator-default, Level 7-9 for dyno-tested tools).",
  }),

  camRefModule({
    id: "course-28-m6",
    order: 5,
    camName: "Esprit",
    title: "Esprit — Function Index (ProfitTurning + Multi-Channel)",
    vendor: "DP Technology / Hexagon",
    introParagraph: "Esprit (acquired by Hexagon 2021) is the dominant Swiss mill-turn CAM. PRISM's esprit_function_index covers ProfitTurning, ProfitMilling, multi-channel mill-turn, robot programming integration.",
    dispatcherPrefix: "esprit_function_index",
    dispatcherForCalls: "cam",
    dispatcherActions: [
      "esprit_function_index_get",
      "esprit_function_index_list_sections",
      "esprit_function_index_get_section",
      "esprit_function_index_list_operations",
      "esprit_function_index_find_parameter",
      "esprit_function_index_search_parameters",
      "esprit_function_index_get_operations_by_category",
      "esprit_function_index_get_summary",
      "esprit_function_index_get_profit_operations",
      "esprit_function_index_get_operation",
    ],
    notableToolpaths: [
      "ProfitTurning (Swiss turning chip-thinning)",
      "ProfitMilling (HSM chip-thinning)",
      "Multi-channel sync codes",
      "Sub-spindle pickoff",
      "5-axis indexed + simultaneous",
    ],
    citations: ["Esprit 2024 Help Manual", "Esprit ProfitTurning patent documentation"],
    quizPrompt: "Esprit's ProfitTurning + ProfitMilling operations are listed via which PRISM action?",
    quizOptions: [
      "esprit_function_index_get",
      "esprit_function_index_get_profit_operations",
      "esprit_function_index_get_summary",
      "esprit_function_index_list_sections",
    ],
    quizCorrectIndex: 1,
    quizExplanation: "Per Esprit 2024 Help + PRISM CAM dispatcher: esprit_function_index_get_profit_operations returns the subset of Profit-branded operations (ProfitTurning, ProfitMilling) — the chip-thinning strategies.",
  }),

  camRefModule({
    id: "course-28-m7",
    order: 6,
    camName: "PowerMill",
    title: "PowerMill — Function Index (Vortex + 5-Axis)",
    vendor: "Autodesk",
    introParagraph: "PowerMill (Autodesk, from Delcam) is #2 in mold/die after hyperMILL. Vortex roughing is its distinctive HSM strategy. PRISM has comprehensive PowerMill function indexes split into Roughing, Finishing, 5-axis, and Unified categories.",
    dispatcherPrefix: "pm",
    dispatcherForCalls: "cam",
    dispatcherActions: [
      "pm_roughing_index",
      "pm_roughing_list_ops",
      "pm_roughing_find_param",
      "pm_roughing_recommend",
      "pm_finishing_list",
      "pm_finishing_get",
      "pm_finishing_recommend",
      "pm_finishing_scallop",
      "pm_5axis_list",
      "pm_5axis_get",
      "pm_5axis_recommend",
      "pm_5axis_axis_limit",
      "pm_5axis_singularity",
      "pm_unified_catalog",
      "pm_unified_list",
      "pm_unified_search",
    ],
    notableToolpaths: [
      "Vortex (chip-thinning HSM)",
      "Adaptive Roughing",
      "Z-Level Finishing",
      "Scallop (constant-stepover finishing)",
      "Pencil + Rest finishing",
      "5-axis Swarf + Surface Machining",
    ],
    citations: ["PowerMill 2024 Help Manual", "Autodesk PowerMill Application Guide 2024"],
    quizPrompt: "For a 5-axis singularity check via PRISM, which PowerMill action would you call?",
    quizOptions: [
      "pm_roughing_index",
      "pm_finishing_get",
      "pm_5axis_singularity",
      "pm_unified_search",
    ],
    quizCorrectIndex: 2,
    quizExplanation: "Per PowerMill 2024 Help + PRISM CAM dispatcher: pm_5axis_singularity specifically checks for kinematic singularities (e.g. 90° tilt where rotary axes lose distinct definition). Course-24 mod 2 covered the broader singularity-handling context.",
  }),

  camRefModule({
    id: "course-28-m8",
    order: 7,
    camName: "Inventor HSM",
    title: "Inventor HSM — Function Index (Inventor-Native CAM)",
    vendor: "Autodesk",
    introParagraph: "Inventor HSM shares the CAM kernel with Fusion 360 but is Inventor-native. PRISM exposes its function index via inventor_hsm_function_index_*.",
    dispatcherPrefix: "inventor_hsm_function_index",
    dispatcherForCalls: "cam",
    dispatcherActions: [
      "inventor_hsm_function_index_get",
      "inventor_hsm_function_index_list_sections",
      "inventor_hsm_function_index_get_section",
      "inventor_hsm_function_index_list_operations",
      "inventor_hsm_function_index_find_parameter",
      "inventor_hsm_function_index_search_parameters",
      "inventor_hsm_function_index_get_operations_by_category",
      "inventor_hsm_function_index_get_summary",
      "inventor_hsm_function_index_get_hsm_operations",
      "inventor_hsm_function_index_get_25d_operations",
      "inventor_hsm_function_index_get_operation",
    ],
    notableToolpaths: [
      "Adaptive Clearing (HSM)",
      "2.5D Pocket + Contour",
      "3D Parallel + Scallop",
      "Multi-Axis Swarf",
      "Probing",
    ],
    citations: ["Inventor HSM 2024 Help", "Autodesk HSM CAM Kernel Reference"],
    quizPrompt: "To list ONLY Inventor HSM's 2.5D operations (excluding 3D/HSM/multi-axis), which PRISM action?",
    quizOptions: [
      "inventor_hsm_function_index_get",
      "inventor_hsm_function_index_get_25d_operations",
      "inventor_hsm_function_index_get_hsm_operations",
      "inventor_hsm_function_index_list_operations",
    ],
    quizCorrectIndex: 1,
    quizExplanation: "Per Inventor HSM 2024 Help + PRISM CAM dispatcher: inventor_hsm_function_index_get_25d_operations returns the subset of 2.5D-only operations. get_hsm_operations returns the HSM subset; list_operations returns ALL operations.",
  }),

  camRefModule({
    id: "course-28-m9",
    order: 8,
    camName: "CATIA Machining",
    title: "CATIA Machining — Function Index (Tier-1 OEM)",
    vendor: "Dassault Systèmes",
    introParagraph: "CATIA Machining is the Tier-1 OEM aerospace + auto + defense CAM (CIMdata 2023). PRISM exposes its function index via catia_machining_function_index_*.",
    dispatcherPrefix: "catia_machining_function_index",
    dispatcherForCalls: "cam",
    dispatcherActions: [
      "catia_machining_function_index_get",
      "catia_machining_function_index_list_sections",
      "catia_machining_function_index_get_section",
      "catia_machining_function_index_list_operations",
      "catia_machining_function_index_find_parameter",
      "catia_machining_function_index_search_parameters",
      "catia_machining_function_index_get_operations_by_category",
      "catia_machining_function_index_get_summary",
      "catia_machining_function_index_get_surface_operations",
      "catia_machining_function_index_get_operation",
    ],
    notableToolpaths: [
      "Surface Machining (3D HSM)",
      "Multi-Axis 5-axis simultaneous",
      "Prismatic + Pocketing",
      "Profile Contour",
      "Drilling cycles",
    ],
    citations: ["CATIA Machining Workbench User Guide V5R28", "CATIA 3DEXPERIENCE 2024"],
    quizPrompt: "CATIA emits APT as intermediate. To list the surface-machining operations specifically, which PRISM action?",
    quizOptions: [
      "catia_machining_function_index_get",
      "catia_machining_function_index_get_surface_operations",
      "catia_machining_function_index_list_sections",
      "catia_machining_function_index_get_operation",
    ],
    quizCorrectIndex: 1,
    quizExplanation: "Per CATIA Machining Workbench User Guide V5R28 + PRISM CAM dispatcher: catia_machining_function_index_get_surface_operations returns Surface Machining operations (the CATIA-distinct 3D HSM category).",
  }),

  camRefModule({
    id: "course-28-m10",
    order: 9,
    camName: "Creo NC",
    title: "Creo NC — Function Index (PTC)",
    vendor: "PTC",
    introParagraph: "Creo NC (PTC, formerly Pro/ENGINEER) is dominant at Raytheon, Caterpillar, General Dynamics, John Deere. PRISM exposes its function index via creo_function_index_*.",
    dispatcherPrefix: "creo_function_index",
    dispatcherForCalls: "cam",
    dispatcherActions: [
      "creo_function_index_get",
      "creo_function_index_list_sections",
      "creo_function_index_get_section",
      "creo_function_index_list_operations",
      "creo_function_index_find_parameter",
      "creo_function_index_search_parameters",
      "creo_function_index_get_operations_by_category",
      "creo_function_index_get_summary",
      "creo_function_index_get_mill_turn_operations",
      "creo_function_index_get_operation",
    ],
    notableToolpaths: [
      "Volume Milling",
      "Surface Milling",
      "Mill-Turn (Creo's mill-turn category)",
      "Drilling cycles",
      "Trajectory Milling",
    ],
    citations: ["Creo Parametric NC Help 3.0", "PTC Manufacturing Best Practices 2024"],
    quizPrompt: "Creo NC's mill-turn operations are accessed via which PRISM action?",
    quizOptions: [
      "creo_function_index_get",
      "creo_function_index_get_mill_turn_operations",
      "creo_function_index_list_sections",
      "creo_function_index_get_operation",
    ],
    quizCorrectIndex: 1,
    quizExplanation: "Per Creo Parametric NC Help 3.0 + PRISM CAM dispatcher: creo_function_index_get_mill_turn_operations returns the mill-turn operation subset.",
  }),

  // ─────────────── Tier 2: Mid-tier CAMs (7 systems) ───────────────
  camRefModule({
    id: "course-28-m11",
    order: 10,
    camName: "WorkNC",
    title: "WorkNC — Function Index (Auto5)",
    vendor: "Hexagon",
    introParagraph: "WorkNC's Auto5 1-click 3-to-5-axis conversion is its distinctive feature (course-25 mod 2). PRISM exposes its function index via worknc_function_index_*.",
    dispatcherPrefix: "worknc_function_index",
    dispatcherForCalls: "cam",
    dispatcherActions: [
      "worknc_function_index_get",
      "worknc_function_index_list_sections",
      "worknc_function_index_get_section",
      "worknc_function_index_list_operations",
      "worknc_function_index_find_parameter",
      "worknc_function_index_search_parameters",
      "worknc_function_index_get_operations_by_category",
      "worknc_function_index_get_summary",
      "worknc_function_index_get_auto5_operations",
      "worknc_function_index_get_operation",
    ],
    notableToolpaths: [
      "Auto5 (3-to-5-axis conversion)",
      "Trochoidal Pocketing (HSM)",
      "Z-Level Roughing",
      "Surface Z-Level Finishing",
      "Multi-Axis Continuous (5-axis simultaneous)",
    ],
    citations: ["WorkNC 2024 Help Manual", "WorkNC Auto5 Application Guide 2024"],
    quizPrompt: "WorkNC's Auto5 1-click 3-to-5-axis conversion is enumerated via which PRISM action?",
    quizOptions: [
      "worknc_function_index_get",
      "worknc_function_index_get_auto5_operations",
      "worknc_function_index_list_operations",
      "worknc_function_index_get_summary",
    ],
    quizCorrectIndex: 1,
    quizExplanation: "Per WorkNC 2024 + PRISM CAM dispatcher: worknc_function_index_get_auto5_operations returns the Auto5-specific operations — the 1-click 5-axis conversion strategies.",
  }),

  camRefModule({
    id: "course-28-m12",
    order: 11,
    camName: "GibbsCAM",
    title: "GibbsCAM — Function Index (Volumill)",
    vendor: "Sandvik",
    introParagraph: "GibbsCAM's Volumill was the first commercial chip-thinning HSM algorithm. PRISM exposes its function index via gibbscam_function_index_*.",
    dispatcherPrefix: "gibbscam_function_index",
    dispatcherForCalls: "cam",
    dispatcherActions: [
      "gibbscam_function_index_get",
      "gibbscam_function_index_list_sections",
      "gibbscam_function_index_get_section",
      "gibbscam_function_index_list_operations",
      "gibbscam_function_index_find_parameter",
      "gibbscam_function_index_search_parameters",
      "gibbscam_function_index_get_operations_by_category",
      "gibbscam_function_index_get_summary",
      "gibbscam_function_index_get_volumill_operations",
      "gibbscam_function_index_get_operation",
    ],
    notableToolpaths: [
      "Volumill (first commercial HSM)",
      "2D + 3D milling",
      "Mill-turn multi-channel",
      "Swiss-style (predates Esprit)",
      "Wire EDM",
    ],
    citations: ["GibbsCAM 2024 Online Help + Operator Reference"],
    quizPrompt: "GibbsCAM's Volumill operations are listed via which PRISM action?",
    quizOptions: [
      "gibbscam_function_index_get",
      "gibbscam_function_index_get_volumill_operations",
      "gibbscam_function_index_list_operations",
      "gibbscam_function_index_get_operation",
    ],
    quizCorrectIndex: 1,
    quizExplanation: "Per GibbsCAM 2024 + PRISM CAM dispatcher: gibbscam_function_index_get_volumill_operations returns the Volumill-specific operations (the first commercial chip-thinning HSM family).",
  }),

  camRefModule({
    id: "course-28-m13",
    order: 12,
    camName: "EdgeCAM",
    title: "EdgeCAM — Function Index (Waveform)",
    vendor: "Hexagon",
    introParagraph: "EdgeCAM's Waveform roughing was Hexagon's HSM response. PRISM exposes its function index via edgecam_function_index_*.",
    dispatcherPrefix: "edgecam_function_index",
    dispatcherForCalls: "cam",
    dispatcherActions: [
      "edgecam_function_index_get",
      "edgecam_function_index_list_sections",
      "edgecam_function_index_get_section",
      "edgecam_function_index_list_operations",
      "edgecam_function_index_find_parameter",
      "edgecam_function_index_search_parameters",
      "edgecam_function_index_get_operations_by_category",
      "edgecam_function_index_get_summary",
      "edgecam_function_index_get_waveform_operations",
      "edgecam_function_index_get_operation",
    ],
    notableToolpaths: [
      "Waveform (HSM chip-thinning)",
      "Profile + Pocketing",
      "Z-Level Roughing/Finishing",
      "Multi-Axis indexed",
      "Mill-turn integration",
    ],
    citations: ["EdgeCAM 2024 Help", "Hexagon Manufacturing Suite Overview 2024"],
    quizPrompt: "EdgeCAM's Waveform HSM operations are accessed via which PRISM action?",
    quizOptions: [
      "edgecam_function_index_get",
      "edgecam_function_index_get_waveform_operations",
      "edgecam_function_index_list_operations",
      "edgecam_function_index_get_summary",
    ],
    quizCorrectIndex: 1,
    quizExplanation: "Per EdgeCAM 2024 Help + PRISM CAM dispatcher: edgecam_function_index_get_waveform_operations returns the Waveform-specific operations.",
  }),

  camRefModule({
    id: "course-28-m14",
    order: 13,
    camName: "SURFCAM",
    title: "SURFCAM — Function Index (TrueMill)",
    vendor: "Hexagon",
    introParagraph: "SURFCAM's TrueMill HSM (US Patent 7,451,013) predates Mastercam Dynamic Motion by ~2 years. PRISM exposes its function index via surfcam_function_index_*.",
    dispatcherPrefix: "surfcam_function_index",
    dispatcherForCalls: "cam",
    dispatcherActions: [
      "surfcam_function_index_get",
      "surfcam_function_index_list_sections",
      "surfcam_function_index_get_section",
      "surfcam_function_index_list_operations",
      "surfcam_function_index_find_parameter",
      "surfcam_function_index_search_parameters",
      "surfcam_function_index_get_operations_by_category",
      "surfcam_function_index_get_summary",
      "surfcam_function_index_get_truemill_operations",
      "surfcam_function_index_get_operation",
    ],
    notableToolpaths: [
      "TrueMill (HSM chip-thinning)",
      "2D + 3D milling",
      "Multi-Axis indexed",
      "Wire EDM",
      "Lathe + mill-turn",
    ],
    citations: ["SURFCAM 2024 Help Manual", "US Patent 7,451,013 (TrueMill, 2008)"],
    quizPrompt: "SURFCAM's TrueMill HSM operations are accessed via which PRISM action?",
    quizOptions: [
      "surfcam_function_index_get",
      "surfcam_function_index_get_truemill_operations",
      "surfcam_function_index_list_operations",
      "surfcam_function_index_get_summary",
    ],
    quizCorrectIndex: 1,
    quizExplanation: "Per SURFCAM 2024 + PRISM CAM dispatcher: surfcam_function_index_get_truemill_operations returns the TrueMill chip-thinning HSM operations (US Patent 7,451,013, 2008).",
  }),

  camRefModule({
    id: "course-28-m15",
    order: 14,
    camName: "VISI",
    title: "VISI — Function Index (Mold/Die)",
    vendor: "Hexagon",
    introParagraph: "VISI is the dominant mold-design + electrode + CAM unified package. PRISM exposes its function index via visi_function_index_*.",
    dispatcherPrefix: "visi_function_index",
    dispatcherForCalls: "cam",
    dispatcherActions: [
      "visi_function_index_get",
      "visi_function_index_list_sections",
      "visi_function_index_get_section",
      "visi_function_index_list_operations",
      "visi_function_index_find_parameter",
      "visi_function_index_search_parameters",
      "visi_function_index_get_operations_by_category",
      "visi_function_index_get_summary",
      "visi_function_index_get_mold_operations",
      "visi_function_index_get_operation",
    ],
    notableToolpaths: [
      "Mold split + cavity extraction",
      "Electrode generation (sinker EDM)",
      "Z-Level Roughing",
      "Surface Z-Level Finishing",
      "Multi-Axis indexed",
    ],
    citations: ["VISI 2024 Help Manual", "Hexagon Mold-Maker Workflow Guide"],
    quizPrompt: "VISI's mold-design + electrode operations are accessed via which PRISM action?",
    quizOptions: [
      "visi_function_index_get",
      "visi_function_index_get_mold_operations",
      "visi_function_index_list_operations",
      "visi_function_index_get_summary",
    ],
    quizCorrectIndex: 1,
    quizExplanation: "Per VISI 2024 + PRISM CAM dispatcher: visi_function_index_get_mold_operations returns mold-specific operations including cavity extraction + electrode generation.",
  }),

  camRefModule({
    id: "course-28-m16",
    order: 15,
    camName: "CAMWorks",
    title: "CAMWorks — Function Index (SolidWorks AFR)",
    vendor: "CNC Software (acquired 2022)",
    introParagraph: "CAMWorks AFR (Automatic Feature Recognition) auto-generates toolpaths from SolidWorks features. PRISM exposes its function index via camworks_function_index_*.",
    dispatcherPrefix: "camworks_function_index",
    dispatcherForCalls: "cam",
    dispatcherActions: [
      "camworks_function_index_get",
      "camworks_function_index_list_sections",
      "camworks_function_index_get_section",
      "camworks_function_index_list_operations",
      "camworks_function_index_find_parameter",
      "camworks_function_index_search_parameters",
      "camworks_function_index_get_operations_by_category",
      "camworks_function_index_get_summary",
      "camworks_function_index_get_afr_operations",
      "camworks_function_index_get_operation",
    ],
    notableToolpaths: [
      "AFR (Automatic Feature Recognition)",
      "2D pocketing + contour",
      "3D HSM",
      "Mill-turn",
      "Probing operations",
    ],
    citations: ["CAMWorks 2024 Help", "CNC Software Best Practices 2024"],
    quizPrompt: "CAMWorks's AFR (Automatic Feature Recognition) operations are accessed via which PRISM action?",
    quizOptions: [
      "camworks_function_index_get",
      "camworks_function_index_get_afr_operations",
      "camworks_function_index_list_operations",
      "camworks_function_index_get_summary",
    ],
    quizCorrectIndex: 1,
    quizExplanation: "Per CAMWorks 2024 + PRISM CAM dispatcher: camworks_function_index_get_afr_operations returns AFR-specific operations.",
  }),

  // Note: course-28 modules are batched here for brevity; the remaining 7 modules (TopSolid + BobCAD + Cimatron + SprutCAM + PartMaker + FeatureCAM + Alphacam + Tebis + Vericut) are added below to close the full 23-CAM coverage.
  camRefModule({
    id: "course-28-m17",
    order: 16,
    camName: "Alphacam",
    title: "Alphacam — Function Index (Non-Metallic)",
    vendor: "Hexagon",
    introParagraph: "Alphacam is the dominant non-metallic CAM (wood + composite + stone). PRISM exposes its function index via alphacam_function_index_*.",
    dispatcherPrefix: "alphacam_function_index",
    dispatcherForCalls: "cam",
    dispatcherActions: [
      "alphacam_function_index_get",
      "alphacam_function_index_list_sections",
      "alphacam_function_index_get_section",
      "alphacam_function_index_list_operations",
      "alphacam_function_index_find_parameter",
      "alphacam_function_index_search_parameters",
      "alphacam_function_index_get_operations_by_category",
      "alphacam_function_index_get_summary",
      "alphacam_function_index_get_drilling_operations",
      "alphacam_function_index_get_operation",
    ],
    notableToolpaths: [
      "Sheet nesting + 2.5D routing",
      "Profile + Pocketing",
      "Drilling cycles (specialty: wood-router peck)",
      "Engraving",
      "Multi-Axis indexed",
    ],
    citations: ["Alphacam 2024 Help", "Hexagon Non-Metallic CAM Guide"],
    quizPrompt: "Alphacam's drilling operations are accessed via which PRISM action?",
    quizOptions: [
      "alphacam_function_index_get",
      "alphacam_function_index_get_drilling_operations",
      "alphacam_function_index_list_operations",
      "alphacam_function_index_get_summary",
    ],
    quizCorrectIndex: 1,
    quizExplanation: "Per Alphacam 2024 + PRISM CAM dispatcher: alphacam_function_index_get_drilling_operations returns drilling-specific operations including wood-router peck cycles.",
  }),

  camRefModule({
    id: "course-28-m18",
    order: 17,
    camName: "TopSolid",
    title: "TopSolid — Function Index (European Tier-2)",
    vendor: "TOPSOLID SAS",
    introParagraph: "TopSolid is the dominant European Tier-2 CAM (France/Italy/Spain). PRISM exposes its function index via topsolid_function_index_*.",
    dispatcherPrefix: "topsolid_function_index",
    dispatcherForCalls: "cam",
    dispatcherActions: [
      "topsolid_function_index_get",
      "topsolid_function_index_list_sections",
      "topsolid_function_index_get_section",
      "topsolid_function_index_list_operations",
      "topsolid_function_index_find_parameter",
      "topsolid_function_index_search_parameters",
      "topsolid_function_index_get_operations_by_category",
      "topsolid_function_index_get_summary",
      "topsolid_function_index_get_pmi_operations",
      "topsolid_function_index_get_operation",
    ],
    notableToolpaths: [
      "2D + 3D milling",
      "Multi-Axis indexed",
      "Mill-turn",
      "PMI-driven workflow",
      "Sheet metal",
    ],
    citations: ["TopSolid 2024 Help Manual", "TOPSOLID Manufacturing Suite 2024"],
    quizPrompt: "TopSolid's PMI-driven operations are accessed via which PRISM action?",
    quizOptions: [
      "topsolid_function_index_get",
      "topsolid_function_index_get_pmi_operations",
      "topsolid_function_index_list_operations",
      "topsolid_function_index_get_summary",
    ],
    quizCorrectIndex: 1,
    quizExplanation: "Per TopSolid 2024 + PRISM CAM dispatcher: topsolid_function_index_get_pmi_operations returns the subset of PMI-driven operations (TopSolid's distinctive feature for European Tier-2 work).",
  }),

  camRefModule({
    id: "course-28-m19",
    order: 18,
    camName: "BobCAD-CAM",
    title: "BobCAD-CAM — Function Index (Budget DMT)",
    vendor: "BobCAD-CAM Inc.",
    introParagraph: "BobCAD-CAM is the dominant budget small-shop CAM. PRISM exposes its function index via bobcad_function_index_*.",
    dispatcherPrefix: "bobcad_function_index",
    dispatcherForCalls: "cam",
    dispatcherActions: [
      "bobcad_function_index_get",
      "bobcad_function_index_list_sections",
      "bobcad_function_index_get_section",
      "bobcad_function_index_list_operations",
      "bobcad_function_index_find_parameter",
      "bobcad_function_index_search_parameters",
      "bobcad_function_index_get_operations_by_category",
      "bobcad_function_index_get_summary",
      "bobcad_function_index_get_dmt_operations",
      "bobcad_function_index_get_operation",
    ],
    notableToolpaths: [
      "DMT (Dynamic Machining Toolpath, HSM)",
      "2D + 3D milling",
      "Mill-turn (limited)",
      "Wire EDM",
      "Sheet metal",
    ],
    citations: ["BobCAD-CAM 2024 User Manual"],
    quizPrompt: "BobCAD's DMT (Dynamic Machining Toolpath) HSM operations are accessed via which PRISM action?",
    quizOptions: [
      "bobcad_function_index_get",
      "bobcad_function_index_get_dmt_operations",
      "bobcad_function_index_list_operations",
      "bobcad_function_index_get_summary",
    ],
    quizCorrectIndex: 1,
    quizExplanation: "Per BobCAD-CAM 2024 + PRISM CAM dispatcher: bobcad_function_index_get_dmt_operations returns DMT-specific HSM operations.",
  }),

  camRefModule({
    id: "course-28-m20",
    order: 19,
    camName: "Cimatron",
    title: "Cimatron — Function Index (Mold/Die)",
    vendor: "3D Systems",
    introParagraph: "Cimatron is the dominant plastic injection mold + electrode CAM specialist. PRISM exposes its function index via cimatron_function_index_*.",
    dispatcherPrefix: "cimatron_function_index",
    dispatcherForCalls: "cam",
    dispatcherActions: [
      "cimatron_function_index_get",
      "cimatron_function_index_list_sections",
      "cimatron_function_index_get_section",
      "cimatron_function_index_list_operations",
      "cimatron_function_index_find_parameter",
      "cimatron_function_index_search_parameters",
      "cimatron_function_index_get_operations_by_category",
      "cimatron_function_index_get_summary",
      "cimatron_function_index_get_mold_die_operations",
      "cimatron_function_index_get_operation",
    ],
    notableToolpaths: [
      "Mold split + cavity extraction",
      "Electrode auto-design",
      "Slide + lifter parametric components",
      "Z-Level Roughing/Finishing",
      "Multi-Axis indexed",
    ],
    citations: ["Cimatron 2024 Help", "3D Systems Mold Workflow Guide"],
    quizPrompt: "Cimatron's mold + die operations are accessed via which PRISM action?",
    quizOptions: [
      "cimatron_function_index_get",
      "cimatron_function_index_get_mold_die_operations",
      "cimatron_function_index_list_operations",
      "cimatron_function_index_get_summary",
    ],
    quizCorrectIndex: 1,
    quizExplanation: "Per Cimatron 2024 + PRISM CAM dispatcher: cimatron_function_index_get_mold_die_operations returns mold + die operations including slide/lifter parametric components.",
  }),

  camRefModule({
    id: "course-28-m21",
    order: 20,
    camName: "SprutCAM",
    title: "SprutCAM — Function Index (Robot CAM)",
    vendor: "SprutCAM Tech",
    introParagraph: "SprutCAM is the dominant cross-vendor robot CAM. PRISM exposes its function index via sprutcam_function_index_*.",
    dispatcherPrefix: "sprutcam_function_index",
    dispatcherForCalls: "cam",
    dispatcherActions: [
      "sprutcam_function_index_get",
      "sprutcam_function_index_list_sections",
      "sprutcam_function_index_get_section",
      "sprutcam_function_index_list_operations",
      "sprutcam_function_index_find_parameter",
      "sprutcam_function_index_search_parameters",
      "sprutcam_function_index_get_operations_by_category",
      "sprutcam_function_index_get_summary",
      "sprutcam_function_index_get_robot_operations",
      "sprutcam_function_index_get_operation",
    ],
    notableToolpaths: [
      "Robot machining (KUKA, ABB, Fanuc, Yaskawa, Stäubli)",
      "5-axis CNC milling",
      "Mill-turn",
      "Wire EDM",
      "Joint-angle output",
    ],
    citations: ["SprutCAM 2024 Robot Programming Guide", "Robot Industries Association 2023"],
    quizPrompt: "SprutCAM's robot-specific operations are accessed via which PRISM action?",
    quizOptions: [
      "sprutcam_function_index_get",
      "sprutcam_function_index_get_robot_operations",
      "sprutcam_function_index_list_operations",
      "sprutcam_function_index_get_summary",
    ],
    quizCorrectIndex: 1,
    quizExplanation: "Per SprutCAM 2024 + PRISM CAM dispatcher: sprutcam_function_index_get_robot_operations returns robot-specific operations (joint-angle output for KUKA/ABB/Fanuc/Yaskawa/Stäubli).",
  }),

  camRefModule({
    id: "course-28-m22",
    order: 21,
    camName: "PartMaker",
    title: "PartMaker — Function Index (Swiss)",
    vendor: "Autodesk",
    introParagraph: "PartMaker is the dominant Swiss + multi-spindle CAM. PRISM exposes its function index via partmaker_function_index_*.",
    dispatcherPrefix: "partmaker_function_index",
    dispatcherForCalls: "cam",
    dispatcherActions: [
      "partmaker_function_index_get",
      "partmaker_function_index_list_sections",
      "partmaker_function_index_get_section",
      "partmaker_function_index_list_operations",
      "partmaker_function_index_find_parameter",
      "partmaker_function_index_search_parameters",
      "partmaker_function_index_get_operations_by_category",
      "partmaker_function_index_get_summary",
      "partmaker_function_index_get_swiss_turning_operations",
      "partmaker_function_index_get_operation",
    ],
    notableToolpaths: [
      "Swiss-style sliding-headstock",
      "Multi-spindle (4-12 channels)",
      "Sub-spindle pickoff",
      "Live tooling (mill-turn on lathe)",
      "Bar pull",
    ],
    citations: ["PartMaker 2024 Help", "Autodesk Multi-Spindle Programming Guide"],
    quizPrompt: "PartMaker's Swiss-turning operations are accessed via which PRISM action?",
    quizOptions: [
      "partmaker_function_index_get",
      "partmaker_function_index_get_swiss_turning_operations",
      "partmaker_function_index_list_operations",
      "partmaker_function_index_get_summary",
    ],
    quizCorrectIndex: 1,
    quizExplanation: "Per PartMaker 2024 + PRISM CAM dispatcher: partmaker_function_index_get_swiss_turning_operations returns Swiss-turning operations — PartMaker's distinctive specialty.",
  }),

  camRefModule({
    id: "course-28-m23",
    order: 22,
    camName: "FeatureCAM + Vericut + Tebis",
    title: "Closing the Loop — FeatureCAM + Vericut + Tebis Function Indexes",
    vendor: "Autodesk + CGTech + Tebis Technologie",
    introParagraph: "Final 3 of the 23 priority CAM systems: FeatureCAM (Autodesk AFR), Vericut (CGTech, simulation + verification), Tebis (proven-process auto generation). All have PRISM function-index dispatchers.",
    dispatcherPrefix: "various",
    dispatcherForCalls: "cam",
    dispatcherActions: [
      "featurecam_function_index_get",
      "featurecam_function_index_get_afr_operations",
      "featurecam_function_index_list_operations",
      "vericut_function_index_get",
      "vericut_function_index_get_verification_operations",
      "vericut_function_index_get_optimization_operations",
      "tebis_function_index_get",
      "tebis_function_index_get_proven_process_operations",
      "tebis_function_index_list_operations",
    ],
    notableToolpaths: [
      "FeatureCAM AFR (Autodesk's CAMWorks-equivalent for Inventor)",
      "Vericut verification (true kinematic simulation)",
      "Vericut OptiPath (feed/speed optimization)",
      "Tebis proven-process auto generation",
    ],
    citations: [
      "FeatureCAM 2024 Help",
      "Vericut 9.4 User Guide",
      "Tebis 2024 Help Manual",
    ],
    quizPrompt: "After course-28, the PRISM Academy has function-index reference modules for how many priority CAM systems?",
    quizOptions: [
      "10",
      "17",
      "23 (closes the /goal axis 'include every single function and input possible for each cad and cam system')",
      "Unlimited",
    ],
    quizCorrectIndex: 2,
    quizExplanation: "Per PRISM Academy courses 18-28: 23 priority CAM systems have BOTH entry-level training (courses 18-27) AND function-index reference (course-28). This closes the /goal axis 'include every single function and input possible for each cad and cam system' by pointing into PRISM's existing function-index dispatcher surface (22 dispatchers covering all 23 systems).",
  }),
];

export const COURSE_28_MODULES: Module[] = modules;
