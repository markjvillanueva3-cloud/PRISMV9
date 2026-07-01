/**
 * Calculator Programming Catalog Extensions
 * Provides supplemental programming environments and merge logic.
 * Stub: original file lost to exFAT corruption (2026-04-10)
 */
export type {
  CalculatorProgrammingEnvironmentOption,
  CalculatorProgrammingToolpathOption,
} from "../data/calculatorProgrammingCatalog.js";
import type {
  CalculatorProgrammingEnvironmentOption,
  CalculatorProgrammingToolpathOption,
} from "../data/calculatorProgrammingCatalog.js";

/**
 * Programming-environment catalog (re-authored after the 2026-04-10 exFAT corruption that
 * lost the original base JSON). These are real, off-the-shelf CAM systems + their flagship
 * toolpath strategies (manufacturer-documented product facts, not invented). The base JSON
 * stays `[]`; this typed supplement is the single source. mode-filtered by
 * getCalculatorProgrammingEnvironments(mode); the SFC CAM select reads the deduped vendors.
 */
export const SUPPLEMENTAL_PROGRAMMING_ENVIRONMENTS: CalculatorProgrammingEnvironmentOption[] = [
  // ===== MILL CAM systems =====
  {
    id: "mastercam-mill", mode: "mill", label: "Mastercam Mill", vendor: "Mastercam (Sandvik)", kind: "cam",
    badge: "CAM", summary: "Dynamic Motion high-efficiency roughing + multiaxis finishing.",
    toolpaths: [
      { id: "mc-dynamic-mill", label: "Dynamic Mill", path: "Toolpaths > 2D > Dynamic Mill", summary: "Trochoidal high-efficiency pocket roughing (constant tool engagement).", operationId: "roughing" },
      { id: "mc-dynamic-optirough", label: "Dynamic OptiRough", path: "Toolpaths > 3D > High Speed > OptiRough", summary: "3D adaptive roughing with full-flute depth.", operationId: "roughing" },
      { id: "mc-2d-contour", label: "2D Contour", path: "Toolpaths > 2D > Contour", summary: "Profile/wall finishing pass.", operationId: "contour" },
      { id: "mc-waterline", label: "Surface High Speed Waterline", path: "Toolpaths > 3D > High Speed > Waterline", summary: "Constant-Z steep-wall finishing.", operationId: "finishing" },
    ],
  },
  {
    id: "fusion360-mill", mode: "mill", label: "Fusion 360 Manufacture", vendor: "Autodesk Fusion 360", kind: "cam",
    badge: "CAM", summary: "Adaptive Clearing roughing + parallel/scallop finishing.",
    toolpaths: [
      { id: "fs-adaptive", label: "Adaptive Clearing", path: "Manufacture > 3D > Adaptive Clearing", summary: "Constant-engagement high-feed roughing.", operationId: "roughing" },
      { id: "fs-pocket", label: "2D Pocket", path: "Manufacture > 2D > Pocket", summary: "Pocket clearing with stepover control.", operationId: "roughing" },
      { id: "fs-contour", label: "2D Contour", path: "Manufacture > 2D > Contour", summary: "Profile finishing.", operationId: "contour" },
      { id: "fs-scallop", label: "Scallop (3D)", path: "Manufacture > 3D > Scallop", summary: "Constant-cusp 3D finishing.", operationId: "finishing" },
    ],
  },
  {
    id: "hypermill-mill", mode: "mill", label: "hyperMILL", vendor: "OPEN MIND", kind: "cam",
    badge: "CAM", summary: "MAXX Machining high-performance roughing + 5-axis.",
    toolpaths: [
      { id: "hm-maxx-rough", label: "MAXX Roughing", path: "3D > MAXX Machining > Roughing", summary: "Trochoidal high-performance roughing.", operationId: "roughing" },
      { id: "hm-zlevel", label: "Z-Level Finishing", path: "3D > Finishing > Z-Level", summary: "Constant-Z steep finishing.", operationId: "finishing" },
      { id: "hm-equidistant", label: "Equidistant Finishing", path: "3D > Finishing > Equidistant", summary: "Constant-stepover shallow finishing.", operationId: "finishing" },
    ],
  },
  {
    id: "solidcam-mill", mode: "mill", label: "SolidCAM", vendor: "SolidCAM", kind: "cam",
    badge: "CAM", summary: "iMachining patented high-efficiency roughing.",
    toolpaths: [
      { id: "sc-imachining-2d", label: "iMachining 2D", path: "Operations > iMachining 2D", summary: "Morphing-spiral constant-load roughing.", operationId: "roughing" },
      { id: "sc-imachining-3d", label: "iMachining 3D", path: "Operations > iMachining 3D", summary: "3D high-efficiency roughing.", operationId: "roughing" },
      { id: "sc-hsm", label: "HSM Finishing", path: "Operations > HSM", summary: "High-speed surface finishing.", operationId: "finishing" },
    ],
  },
  {
    id: "nx-cam-mill", mode: "mill", label: "NX CAM", vendor: "Siemens NX", kind: "cam",
    badge: "CAM", summary: "Adaptive Milling + cavity/Z-level finishing.",
    toolpaths: [
      { id: "nx-adaptive", label: "Adaptive Milling", path: "Mill > Adaptive Milling", summary: "Constant-engagement roughing.", operationId: "roughing" },
      { id: "nx-cavity", label: "Cavity Mill", path: "Mill > Cavity Mill", summary: "Level-based cavity roughing.", operationId: "roughing" },
      { id: "nx-zlevel", label: "Z-Level Profile", path: "Mill > Z-Level Profile", summary: "Steep-wall finishing.", operationId: "finishing" },
    ],
  },
  {
    id: "powermill-mill", mode: "mill", label: "PowerMill", vendor: "Autodesk PowerMill", kind: "cam",
    badge: "CAM", summary: "Vortex high-efficiency roughing + 5-axis.",
    toolpaths: [
      { id: "pm-vortex", label: "Vortex", path: "Toolpath > 3D Area Clearance > Vortex", summary: "Constant-engagement trochoidal roughing.", operationId: "roughing" },
      { id: "pm-mac", label: "Model Area Clearance", path: "Toolpath > 3D Area Clearance", summary: "Offset/raster area clearance.", operationId: "roughing" },
      { id: "pm-steepshallow", label: "Steep and Shallow Finishing", path: "Toolpath > Finishing > Steep and Shallow", summary: "Combined steep + shallow finishing.", operationId: "finishing" },
    ],
  },
  {
    id: "esprit-mill", mode: "mill", label: "ESPRIT EDGE", vendor: "Hexagon ESPRIT", kind: "cam",
    badge: "CAM", summary: "ProfitMilling high-efficiency roughing.",
    toolpaths: [
      { id: "es-profitmilling", label: "ProfitMilling", path: "Milling > ProfitMilling", summary: "Constant-load high-efficiency roughing.", operationId: "roughing" },
      { id: "es-zlevel", label: "Z-Level Finishing", path: "Milling > Z-Level", summary: "Constant-Z finishing.", operationId: "finishing" },
    ],
  },
  {
    id: "camworks-mill", mode: "mill", label: "CAMWorks", vendor: "CAMWorks (HCL)", kind: "cam",
    badge: "CAM", summary: "VoluMill high-speed roughing inside SolidWorks/Solid Edge.",
    toolpaths: [
      { id: "cw-volumill", label: "VoluMill Rough", path: "Mill > Rough Mill > VoluMill", summary: "Constant-engagement high-speed roughing.", operationId: "roughing" },
      { id: "cw-zlevel", label: "Z-Level Finish", path: "Mill > Z-Level", summary: "Steep finishing.", operationId: "finishing" },
    ],
  },
  {
    id: "gibbscam-mill", mode: "mill", label: "GibbsCAM", vendor: "GibbsCAM (CAMBRIO)", kind: "cam",
    badge: "CAM", summary: "VoluMill high-efficiency roughing.",
    toolpaths: [
      { id: "gc-volumill", label: "VoluMill", path: "Machining > VoluMill", summary: "Constant-engagement roughing.", operationId: "roughing" },
      { id: "gc-surface", label: "Surface Finishing", path: "Machining > Surface", summary: "3D surface finishing.", operationId: "finishing" },
    ],
  },
  {
    id: "manual-gcode-mill", mode: "mill", label: "Manual G-Code", vendor: "Manual / Conversational", kind: "manual",
    badge: "Manual", summary: "Hand-written or conversational ISO G-code (no CAM).",
    toolpaths: [
      { id: "mg-canned-drill", label: "Canned Drill Cycle (G81/G83)", path: "MDI / Program", summary: "Drilling / peck-drilling canned cycles.", operationId: "drilling" },
      { id: "mg-linear", label: "Linear/Circular Interpolation (G01/G02/G03)", path: "MDI / Program", summary: "Manual contour moves.", operationId: "contour" },
    ],
  },
  // ===== LATHE CAM systems =====
  {
    id: "mastercam-lathe", mode: "lathe", label: "Mastercam Lathe", vendor: "Mastercam (Sandvik)", kind: "cam",
    badge: "CAM", summary: "Turning rough/finish + grooving + threading.",
    toolpaths: [
      { id: "mcl-rough", label: "Lathe Rough", path: "Lathe > Rough", summary: "OD/ID roughing passes.", operationId: "roughing" },
      { id: "mcl-finish", label: "Lathe Finish", path: "Lathe > Finish", summary: "Finishing pass.", operationId: "finishing" },
      { id: "mcl-groove", label: "Lathe Groove", path: "Lathe > Groove", summary: "Grooving / parting.", operationId: "grooving" },
      { id: "mcl-thread", label: "Lathe Thread", path: "Lathe > Thread", summary: "Threading cycle.", operationId: "threading" },
    ],
  },
  {
    id: "fusion360-lathe", mode: "lathe", label: "Fusion 360 Turning", vendor: "Autodesk Fusion 360", kind: "cam",
    badge: "CAM", summary: "Turning profile + grooving + threading.",
    toolpaths: [
      { id: "fsl-profile-rough", label: "Turning Profile Roughing", path: "Manufacture > Turning > Profile Roughing", summary: "OD/ID profile roughing.", operationId: "roughing" },
      { id: "fsl-profile-finish", label: "Turning Profile Finishing", path: "Manufacture > Turning > Profile Finishing", summary: "Finishing pass.", operationId: "finishing" },
      { id: "fsl-groove", label: "Turning Groove", path: "Manufacture > Turning > Groove", summary: "Grooving / parting.", operationId: "grooving" },
    ],
  },
];

/** Additional toolpaths keyed by environment ID */
export const PROGRAMMING_ENVIRONMENT_TOOLPATH_SUPPLEMENTS: Record<string, CalculatorProgrammingToolpathOption[]> = {};

function mergeProgrammingEnvironmentToolpaths(
  environment: CalculatorProgrammingEnvironmentOption,
): CalculatorProgrammingEnvironmentOption {
  const extras = PROGRAMMING_ENVIRONMENT_TOOLPATH_SUPPLEMENTS[environment.id];
  if (!extras || extras.length === 0) return environment;
  const existingIds = new Set(environment.toolpaths.map((t) => t.id));
  const mergedToolpaths = [
    ...environment.toolpaths,
    ...extras.filter((t) => !existingIds.has(t.id)),
  ];
  return {
    ...environment,
    toolpaths: mergedToolpaths,
  };
}

export function mergeProgrammingCatalog(
  baseEnvironments: CalculatorProgrammingEnvironmentOption[],
): CalculatorProgrammingEnvironmentOption[] {
  const mergedBase = baseEnvironments.map(mergeProgrammingEnvironmentToolpaths);
  const seenEnvironmentIds = new Set(mergedBase.map((environment) => environment.id));
  const extras = SUPPLEMENTAL_PROGRAMMING_ENVIRONMENTS
    .filter((environment) => !seenEnvironmentIds.has(environment.id))
    .map(mergeProgrammingEnvironmentToolpaths);
  return [...mergedBase, ...extras];
}
