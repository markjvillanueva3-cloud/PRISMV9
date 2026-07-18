import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve("H:/PRISM");
const SHARED_STATE_DIR = path.join(ROOT, "state", "shared");
const DEFAULT_DATE = process.argv.includes("--date")
  ? process.argv[process.argv.indexOf("--date") + 1]
  : "2026-04-02";

function rel(fullPath) {
  return path.relative(ROOT, fullPath).replace(/\\/g, "/");
}

function readJson(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function walkFiles(dirPath, results = []) {
  if (!fs.existsSync(dirPath)) {
    return results;
  }
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, results);
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

function countWrappedRows(data) {
  if (Array.isArray(data)) return data.length;
  if (data && Array.isArray(data.tools)) return data.tools.length;
  if (data && Array.isArray(data.materials)) return data.materials.length;
  return 1;
}

function countIdBearingRows(data) {
  let rows = [];
  if (Array.isArray(data)) rows = data;
  else if (data && Array.isArray(data.tools)) rows = data.tools;
  else rows = [data];
  let count = 0;
  const uniqueIds = new Set();
  for (const row of rows) {
    if (row && row.id != null) {
      count += 1;
      uniqueIds.add(String(row.id));
    }
  }
  return { count, uniqueIds };
}

function extractFirstInt(text, pattern) {
  const match = text.match(pattern);
  if (!match) return null;
  return Number(match[1].replace(/,/g, ""));
}

async function loadCalculatorWorkspace() {
  const moduleUrl = pathToFileURL(
    path.join(ROOT, "mcp-server", "web", "src", "data", "calculatorWorkspace.ts"),
  ).href;
  return await import(moduleUrl);
}

async function fetchJson(url, init) {
  try {
    const response = await fetch(url, init);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

function formatNumber(value) {
  return typeof value === "number" ? value.toLocaleString("en-US") : String(value);
}

function statusEmoji(status) {
  switch (status) {
    case "ok":
      return "OK";
    case "warning":
      return "WARN";
    case "gap":
      return "GAP";
    default:
      return "INFO";
  }
}

async function main() {
  const calculatorWorkspace = await loadCalculatorWorkspace();

  const machineRegistryText = readText("mcp-server/src/registries/MachineRegistry.ts");
  const materialRegistryText = readText("mcp-server/src/registries/MaterialRegistry.ts");
  const toolpathRegistryText = readText("mcp-server/src/registries/ToolpathStrategyRegistry.ts");

  const machineHeaderCount = extractFirstInt(
    machineRegistryText,
    /Complete access to\s+([\d,]+)\s+machines/i,
  );
  const materialHeaderCount = extractFirstInt(
    materialRegistryText,
    /Complete access to\s+([\d,]+)\s+materials/i,
  );
  const toolpathStrategyHeader = (
    toolpathRegistryText.match(/TOTAL:\s*([^\n]+)/i) ?? [null, null]
  )[1];

  const machineSourceDirs = [
    ...new Set(
      [...machineRegistryText.matchAll(/source_dir:\s*"([^"]+)"/g)]
        .map((match) => match[1])
        .filter((value) => value.includes("machines")),
    ),
  ];

  const machineData = readJson("data/machines/ENHANCED/json/ALL_MACHINES_ENRICHED.json");
  const machineSourceFamilies = fs
    .readdirSync(path.join(ROOT, "extracted", "machines"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const toolFiles = fs
    .readdirSync(path.join(ROOT, "data", "tools"), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort();

  const toolFamilies = [];
  let toolRawRowCount = 0;
  let toolIdBearingRowCount = 0;
  const activeToolUniqueIds = new Set();
  for (const fileName of toolFiles) {
    const relativePath = path.join("data", "tools", fileName);
    const data = readJson(relativePath);
    const rowCount = countWrappedRows(data);
    const { count: idBearingCount, uniqueIds } = countIdBearingRows(data);
    toolRawRowCount += rowCount;
    toolIdBearingRowCount += idBearingCount;
    for (const id of uniqueIds) {
      activeToolUniqueIds.add(id);
    }
    toolFamilies.push({
      familyId: path.parse(fileName).name.toLowerCase(),
      label: fileName,
      path: relativePath.replace(/\\/g, "/"),
      rows: rowCount,
      idBearingRows: idBearingCount,
    });
  }

  const extractedToolFiles = fs.existsSync(path.join(ROOT, "extracted", "tools"))
    ? fs.readdirSync(path.join(ROOT, "extracted", "tools")).sort()
    : [];

  const materialsMaster = readJson("data/materials/MATERIALS_MASTER.json");
  const materialFiles = walkFiles(path.join(ROOT, "data", "materials"));
  const materialJsonFiles = materialFiles.filter((file) => file.endsWith(".json"));
  const materialDetailJsonFiles = materialJsonFiles.filter((file) => {
    const lower = path.basename(file).toLowerCase();
    return lower !== "index.json"
      && lower !== "master_index.json"
      && lower !== "materials_master.json";
  });
  const extractedMaterialJsFiles = walkFiles(path.join(ROOT, "extracted", "materials")).filter(
    (file) => file.endsWith(".js"),
  );

  const workholding = readJson("data/workholding/WORKHOLDING.json");
  const workholdingFamilies = Object.entries(workholding)
    .filter(([key]) => !key.startsWith("_"))
    .map(([key, value]) => ({
      familyId: key,
      label: key,
      rows: Array.isArray(value) ? value.length : 0,
      path: "data/workholding/WORKHOLDING.json",
    }));

  const sviSummaryResponse = await fetchJson("http://127.0.0.1:3000/api/v1/dev/svi/summary");
  const sviSummary = sviSummaryResponse?.data?.summary ?? null;
  const sviToolCount = extractFirstInt(sviSummary ?? "", /([\d,]+)\s+tools/i);
  const sviMachineCount = extractFirstInt(sviSummary ?? "", /([\d,]+)\s+machines/i);

  const holderSampleResponse = await fetchJson("http://127.0.0.1:3000/api/v1/data/holder/catalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "mill",
      layoutKind: "magazine",
      spindleConnectionTypeId: "cat40",
    }),
  });
  const holderSampleCount = holderSampleResponse?.result?.holders?.length ?? null;

  const programmingEnvironments = calculatorWorkspace.PROGRAMMING_ENVIRONMENTS ?? [];
  const fallbackToolCatalog = calculatorWorkspace.TOOL_CATALOG ?? [];
  const fallbackMachineCatalog = calculatorWorkspace.MACHINE_CATALOG ?? [];
  const fallbackMaterialCatalog = calculatorWorkspace.MATERIAL_CATALOG ?? [];
  const fallbackWorkholding = calculatorWorkspace.WORKHOLDING_OPTIONS ?? [];
  const calculatorToolpathCount = programmingEnvironments.reduce(
    (sum, environment) => sum + ((environment.toolpaths ?? []).length),
    0,
  );

  const sourceFamilies = [
    {
      domain: "machines",
      familyId: "machine_enriched_json",
      label: "Merged enhanced machine corpus",
      sourcePaths: ["data/machines/ENHANCED/json/ALL_MACHINES_ENRICHED.json"],
      count: machineData.length,
      countMethod: "json.length",
      wiringState: "calculator_live_and_downstream",
      consumers: ["calculator", "program_release", "user_machine_profile"],
      notes: [
        "Primary merged machine truth currently used by the live calculator machine search path.",
      ],
    },
    {
      domain: "machines",
      familyId: "machine_registry_source_dirs",
      label: "MachineRegistry declared machine source directories",
      sourcePaths: ["mcp-server/src/registries/MachineRegistry.ts"],
      count: machineSourceDirs.length,
      countMethod: "unique source_dir matches in MachineRegistry.ts",
      wiringState: "backend_reference",
      consumers: ["machine_registry"],
      notes: [
        "Registry metadata still references 11 unique machine source directories across extracted and enhanced layers.",
      ],
    },
    {
      domain: "machines",
      familyId: "machine_registry_header_claim",
      label: "MachineRegistry stale header claim",
      sourcePaths: ["mcp-server/src/registries/MachineRegistry.ts"],
      count: machineHeaderCount,
      countMethod: "header regex",
      wiringState: "stale_metadata",
      consumers: ["docs_only"],
      notes: [
        "Header still says 824 machines even though merged enhanced JSON currently contains 920.",
      ],
    },
    ...toolFamilies.map((family) => ({
      domain: "tools",
      familyId: family.familyId,
      label: family.label,
      sourcePaths: [family.path],
      count: family.rows,
      countMethod: "wrapped JSON rows",
      wiringState: /toolholders/i.test(family.label)
        ? "calculator_holder_live"
        : /indexable_milling_toolholding|turning_holders_expanded/i.test(family.label)
          ? "backend_live_only"
          : "calculator_live_via_tool_search",
      consumers: /toolholders/i.test(family.label)
        ? ["calculator", "holder_catalog"]
        : ["calculator", "tool_search"],
      notes: /indexable_milling_toolholding|turning_holders_expanded/i.test(family.label)
        ? ["Present in backend roots, but not yet fully surfaced in the calculator holder route."]
        : [],
    })),
    {
      domain: "tools",
      familyId: "tool_registry_active_unique_ids",
      label: "Active unique tool ids across current ToolRegistry data roots",
      sourcePaths: ["data/tools/*.json", "extracted/tools/*"],
      count: activeToolUniqueIds.size,
      countMethod: "deduped row.id across data/tools + extracted/tools dual-path logic",
      wiringState: "backend_live_root",
      consumers: ["calculator", "tool_search", "tool_registry"],
      notes: [
        "Current active live root is far below the intended 95,608-tool historical corpus.",
      ],
    },
    {
      domain: "tools",
      familyId: "tool_registry_raw_rows",
      label: "Current ToolRegistry raw row count",
      sourcePaths: ["data/tools/*.json"],
      count: toolRawRowCount,
      countMethod: "ToolRegistry row wrapping logic",
      wiringState: "backend_live_root",
      consumers: ["tool_registry"],
      notes: [
        "Includes one non-id helper row; id-bearing rows are slightly lower.",
      ],
    },
    {
      domain: "tools",
      familyId: "tool_intended_historical_corpus",
      label: "Intended full PRISM tool corpus",
      sourcePaths: [
        "PRISM-DESKTOP-PROJECT-INSTRUCTIONS.md",
        "CLAUDE.md",
        "CAMX-RESTRUCTURED-ROADMAP-v24.md",
        "api/v1/dev/svi/summary",
      ],
      count: sviToolCount ?? 95608,
      countMethod: "project docs and SVI summary",
      wiringState: "target_not_recovered",
      consumers: ["roadmap_target"],
      notes: [
        "This is the historical/full corpus target, not the currently active live tool root on disk.",
      ],
    },
    {
      domain: "materials",
      familyId: "materials_master_reference",
      label: "Materials master reference catalog",
      sourcePaths: ["data/materials/MATERIALS_MASTER.json"],
      count: Array.isArray(materialsMaster.materials) ? materialsMaster.materials.length : 0,
      countMethod: "materials.length",
      wiringState: "reference_only",
      consumers: ["material_reconciliation"],
      notes: [
        "MaterialRegistry currently loads ISO-group detail JSONs, not MATERIALS_MASTER.json directly.",
      ],
    },
    {
      domain: "materials",
      familyId: "materials_detail_json",
      label: "ISO-group material detail JSON files",
      sourcePaths: ["data/materials/**/*.json"],
      count: materialDetailJsonFiles.length,
      countMethod: "all JSON files excluding index/master surfaces",
      wiringState: "calculator_live_via_material_search",
      consumers: ["calculator", "material_search", "material_registry"],
      notes: [
        "These are the files MaterialRegistry actively loads into the live material search path.",
      ],
    },
    {
      domain: "materials",
      familyId: "materials_extracted_js",
      label: "Extracted material JS families",
      sourcePaths: ["extracted/materials/**/*.js"],
      count: extractedMaterialJsFiles.length,
      countMethod: "recursive .js file count",
      wiringState: "raw_corpus_only",
      consumers: ["future_recovery"],
      notes: [
        "Present on disk, but not part of the current MaterialRegistry live load path.",
      ],
    },
    {
      domain: "materials",
      familyId: "material_registry_header_claim",
      label: "MaterialRegistry stale header claim",
      sourcePaths: ["mcp-server/src/registries/MaterialRegistry.ts"],
      count: materialHeaderCount,
      countMethod: "header regex",
      wiringState: "stale_metadata",
      consumers: ["docs_only"],
      notes: [
        "Registry header still claims 1,047 materials; live master reference currently lists 163 top-level materials and 214 detail JSON files.",
      ],
    },
    ...workholdingFamilies.map((family) => ({
      domain: "workholding",
      familyId: family.familyId,
      label: family.label,
      sourcePaths: [family.path],
      count: family.rows,
      countMethod: "array length",
      wiringState: "backend_reference_fallback_ui",
      consumers: ["calculator_fallback", "future_fixture_engine"],
      notes: [
        "Calculator currently exposes only a small fallback workholding surface rather than the full workholding corpus.",
      ],
    })),
    {
      domain: "cam_toolpaths",
      familyId: "calculator_programming_environments",
      label: "Calculator programming environment catalog",
      sourcePaths: ["mcp-server/web/src/data/calculatorWorkspace.ts"],
      count: programmingEnvironments.length,
      countMethod: "PROGRAMMING_ENVIRONMENTS.length",
      wiringState: "calculator_fallback_only",
      consumers: ["calculator"],
      notes: [
        "Static frontend CAM environment surface; not yet backed by the backend strategy registry.",
      ],
    },
    {
      domain: "cam_toolpaths",
      familyId: "calculator_toolpaths",
      label: "Calculator static toolpath entries",
      sourcePaths: ["mcp-server/web/src/data/calculatorWorkspace.ts"],
      count: calculatorToolpathCount,
      countMethod: "sum(PROGRAMMING_ENVIRONMENTS[].toolpaths.length)",
      wiringState: "calculator_fallback_only",
      consumers: ["calculator"],
      notes: [
        "Frontend toolpath surface is still static even though backend strategy registry is much larger.",
      ],
    },
    {
      domain: "cam_toolpaths",
      familyId: "backend_strategy_registry_header",
      label: "Backend toolpath strategy registry headline count",
      sourcePaths: ["mcp-server/src/registries/ToolpathStrategyRegistry.ts"],
      count: toolpathStrategyHeader,
      countMethod: "registry header string",
      wiringState: "backend_live_only",
      consumers: ["strategy_registry", "future_calculator_binding"],
      notes: [
        "Strategy registry headline remains much larger than the calculator's current static toolpath set.",
      ],
    },
    {
      domain: "calculator_fallback",
      familyId: "calculator_machine_fallback",
      label: "Calculator fallback machine catalog",
      sourcePaths: ["mcp-server/web/src/data/calculatorWorkspace.ts"],
      count: fallbackMachineCatalog.length,
      countMethod: "MACHINE_CATALOG.length",
      wiringState: "calculator_fallback_only",
      consumers: ["calculator"],
      notes: [
        "Used only when live machine search fails or is unavailable.",
      ],
    },
    {
      domain: "calculator_fallback",
      familyId: "calculator_tool_fallback",
      label: "Calculator fallback tool catalog",
      sourcePaths: ["mcp-server/web/src/data/calculatorWorkspace.ts"],
      count: fallbackToolCatalog.length,
      countMethod: "TOOL_CATALOG.length",
      wiringState: "calculator_fallback_only",
      consumers: ["calculator"],
      notes: [
        "Very small compared with the active live tool registry and the intended historical tool corpus.",
      ],
    },
    {
      domain: "calculator_fallback",
      familyId: "calculator_material_fallback",
      label: "Calculator fallback material catalog",
      sourcePaths: ["mcp-server/web/src/data/calculatorWorkspace.ts"],
      count: fallbackMaterialCatalog.length,
      countMethod: "MATERIAL_CATALOG.length",
      wiringState: "calculator_fallback_only",
      consumers: ["calculator"],
      notes: [
        "Fallback only; live material path is backed by MaterialRegistry detail JSONs.",
      ],
    },
    {
      domain: "calculator_fallback",
      familyId: "calculator_workholding_fallback",
      label: "Calculator fallback workholding options",
      sourcePaths: ["mcp-server/web/src/data/calculatorWorkspace.ts"],
      count: fallbackWorkholding.length,
      countMethod: "WORKHOLDING_OPTIONS.length",
      wiringState: "calculator_fallback_only",
      consumers: ["calculator"],
      notes: [
        "Workholding is still mostly static in the calculator UI.",
      ],
    },
  ];

  const reconciliations = [
    {
      id: "machines_header_vs_live_enriched",
      status: machineHeaderCount === machineData.length ? "ok" : "warning",
      left: { source: "MachineRegistry header", count: machineHeaderCount },
      right: { source: "ALL_MACHINES_ENRICHED.json", count: machineData.length },
      note: "MachineRegistry metadata still lags the merged enhanced machine corpus.",
    },
    {
      id: "machines_svi_vs_live_enriched",
      status: sviMachineCount === machineData.length ? "ok" : "warning",
      left: { source: "SVI summary", count: sviMachineCount },
      right: { source: "ALL_MACHINES_ENRICHED.json", count: machineData.length },
      note: "SVI still reports 910 machines while the merged enhanced machine corpus on disk is 920.",
    },
    {
      id: "tools_target_vs_active_unique",
      status: sviToolCount === activeToolUniqueIds.size ? "ok" : "gap",
      left: { source: "Historical/SVI tool corpus", count: sviToolCount },
      right: { source: "Active live unique ids", count: activeToolUniqueIds.size },
      note: "The active live tool roots are far below the intended PRISM tool universe and must be recovered before exhaustive calculator proof can be honest.",
    },
    {
      id: "tools_raw_vs_id_bearing",
      status: toolRawRowCount === toolIdBearingRowCount ? "ok" : "warning",
      left: { source: "ToolRegistry wrapped raw rows", count: toolRawRowCount },
      right: { source: "id-bearing tool rows", count: toolIdBearingRowCount },
      note: "At least one helper row exists in data/tools that does not carry an id and does not become a live tool record.",
    },
    {
      id: "materials_header_vs_detail_json",
      status: materialHeaderCount === materialDetailJsonFiles.length ? "ok" : "warning",
      left: { source: "MaterialRegistry header", count: materialHeaderCount },
      right: { source: "ISO-group detail JSON files", count: materialDetailJsonFiles.length },
      note: "MaterialRegistry header count and actual live detail-file count do not currently reconcile.",
    },
    {
      id: "calculator_toolpaths_vs_backend_strategy_registry",
      status: "warning",
      left: { source: "Calculator static toolpaths", count: calculatorToolpathCount },
      right: { source: "Backend strategy registry headline", count: toolpathStrategyHeader },
      note: "Calculator toolpath surface is still much smaller and static relative to the backend strategy corpus.",
    },
  ];

  const consumerMatrix = [
    {
      consumer: "calculator",
      canonicalTruthStatus: "mixed_live_and_fallback",
      machine: "live /api/v1/data/machine/search + static fallback",
      material: "live /api/v1/data/material/search + static fallback",
      tool: "live /api/v1/data/tool/search + tiny static fallback",
      holder: "live /api/v1/data/holder/catalog from TOOLHOLDERS.json only",
      workholding: "static fallback only",
      camAndToolpath: "static fallback only",
      status: "partial",
    },
    {
      consumer: "user_machine_profile",
      canonicalTruthStatus: "backend_canonical_contract",
      machine: "canonical package + overlay contract exists",
      material: "not primary consumer",
      tool: "planned preference storage only",
      holder: "planned preference storage only",
      workholding: "overlay-ready",
      camAndToolpath: "preference-ready",
      status: "partial",
    },
    {
      consumer: "program_release",
      canonicalTruthStatus: "partially_converged_machine_consumer",
      machine: "shared search/lookup/facets live",
      material: "not primary consumer",
      tool: "not converged",
      holder: "not converged",
      workholding: "not converged",
      camAndToolpath: "not converged",
      status: "partial",
    },
    {
      consumer: "print_to_cnc",
      canonicalTruthStatus: "target",
      machine: "planned parity target",
      material: "planned parity target",
      tool: "planned parity target",
      holder: "planned parity target",
      workholding: "planned parity target",
      camAndToolpath: "planned parity target",
      status: "pending",
    },
  ];

  const output = {
    generatedAt: new Date().toISOString(),
    date: DEFAULT_DATE,
    lane: "MCAT-MS0 / P1-U01 support",
    parentMilestone: "MCAT-MS0",
    collaborationMode: "finish-current-delivery-first",
    gate: "finish-current-backend-and-frontend-work-first",
    liveChecks: {
      sviSummary,
      sviToolCount,
      sviMachineCount,
      holderSampleQuery: {
        mode: "mill",
        layoutKind: "magazine",
        spindleConnectionTypeId: "cat40",
      },
      holderSampleCount,
    },
    machineSummary: {
      mergedEnhancedCount: machineData.length,
      machineRegistryHeaderCount: machineHeaderCount,
      extractedMachineTopLevelFamilies: machineSourceFamilies,
      machineRegistrySourceDirs: machineSourceDirs,
    },
    toolSummary: {
      intendedHistoricalCount: sviToolCount,
      activeRawRows: toolRawRowCount,
      activeIdBearingRows: toolIdBearingRowCount,
      activeUniqueIds: activeToolUniqueIds.size,
      extractedToolJsonFiles: extractedToolFiles.filter((file) => file.endsWith(".json")).length,
      extractedToolJsFiles: extractedToolFiles.filter((file) => file.endsWith(".js")).length,
      extractedToolFiles,
    },
    materialSummary: {
      masterCount: Array.isArray(materialsMaster.materials) ? materialsMaster.materials.length : 0,
      materialJsonFiles: materialJsonFiles.length,
      materialDetailJsonFiles: materialDetailJsonFiles.length,
      extractedMaterialJsFiles: extractedMaterialJsFiles.length,
      materialRegistryHeaderCount: materialHeaderCount,
    },
    workholdingSummary: {
      families: Object.fromEntries(workholdingFamilies.map((family) => [family.familyId, family.rows])),
    },
    calculatorFallbackSummary: {
      machineCount: fallbackMachineCatalog.length,
      toolCount: fallbackToolCatalog.length,
      materialCount: fallbackMaterialCatalog.length,
      workholdingCount: fallbackWorkholding.length,
      programmingEnvironmentCount: programmingEnvironments.length,
      toolpathCount: calculatorToolpathCount,
    },
    backendStrategySummary: {
      toolpathStrategyHeader,
    },
    sourceFamilies,
    reconciliations,
    consumerMatrix,
    immediateNext: [
      "U-MVAR02 - define the legality graph and bundle schema against the discovered source families",
      "Recover the missing tool corpus path so active live tool roots move materially closer to the intended 95,608-tool universe",
      "Promote workholding and backend toolpath registry surfaces out of fallback-only status in the calculator",
    ],
  };

  const jsonPath = path.join(
    SHARED_STATE_DIR,
    `MCAT_MS0_VARIABILITY_CENSUS_${DEFAULT_DATE}.json`,
  );
  const mdPath = path.join(
    SHARED_STATE_DIR,
    `MCAT_MS0_VARIABILITY_CENSUS_${DEFAULT_DATE}.md`,
  );

  const mdLines = [];
  mdLines.push("# MCAT-MS0 Variability Census");
  mdLines.push("");
  mdLines.push(`Date: ${DEFAULT_DATE}`);
  mdLines.push(`Generated: ${output.generatedAt}`);
  mdLines.push("Lane: `MCAT-MS0 / P1-U01 support`");
  mdLines.push("");
  mdLines.push("## Current Gate");
  mdLines.push("");
  mdLines.push(`- Collaboration mode: \`${output.collaborationMode}\``);
  mdLines.push(`- Active gate: \`${output.gate}\``);
  mdLines.push("");
  mdLines.push("## Headline Counts");
  mdLines.push("");
  mdLines.push(`- Machines, merged enhanced corpus: \`${formatNumber(output.machineSummary.mergedEnhancedCount)}\``);
  mdLines.push(`- Machines, stale MachineRegistry header: \`${formatNumber(output.machineSummary.machineRegistryHeaderCount)}\``);
  mdLines.push(`- Machines, SVI summary: \`${formatNumber(output.liveChecks.sviMachineCount)}\``);
  mdLines.push(`- Tools, intended historical corpus: \`${formatNumber(output.toolSummary.intendedHistoricalCount)}\``);
  mdLines.push(`- Tools, active raw rows: \`${formatNumber(output.toolSummary.activeRawRows)}\``);
  mdLines.push(`- Tools, active id-bearing rows: \`${formatNumber(output.toolSummary.activeIdBearingRows)}\``);
  mdLines.push(`- Tools, active unique ids: \`${formatNumber(output.toolSummary.activeUniqueIds)}\``);
  mdLines.push(`- Materials, master reference: \`${formatNumber(output.materialSummary.masterCount)}\``);
  mdLines.push(`- Materials, live detail JSON files: \`${formatNumber(output.materialSummary.materialDetailJsonFiles)}\``);
  mdLines.push(`- Workholding top-level records: \`${formatNumber(workholdingFamilies.reduce((sum, family) => sum + family.rows, 0))}\``);
  mdLines.push(`- Calculator fallback machines/tools/materials/workholding: \`${fallbackMachineCatalog.length}/${fallbackToolCatalog.length}/${fallbackMaterialCatalog.length}/${fallbackWorkholding.length}\``);
  mdLines.push(`- Calculator programming environments/toolpaths: \`${programmingEnvironments.length}/${calculatorToolpathCount}\``);
  mdLines.push(`- Backend strategy registry headline: \`${String(toolpathStrategyHeader)}\``);
  if (holderSampleCount != null) {
    mdLines.push(`- Holder sample count for mill + magazine + CAT40: \`${formatNumber(holderSampleCount)}\``);
  }
  mdLines.push("");
  mdLines.push("## Reconciliation");
  mdLines.push("");
  for (const item of reconciliations) {
    mdLines.push(`- ${statusEmoji(item.status)} \`${item.id}\`: ${item.left.source} = \`${formatNumber(item.left.count)}\`, ${item.right.source} = \`${formatNumber(item.right.count)}\``);
    mdLines.push(`  ${item.note}`);
  }
  mdLines.push("");
  mdLines.push("## Source Families");
  mdLines.push("");
  for (const family of sourceFamilies) {
    mdLines.push(`- [${family.domain}] \`${family.familyId}\` -> \`${formatNumber(family.count)}\` via \`${family.wiringState}\``);
    mdLines.push(`  paths: ${family.sourcePaths.join(", ")}`);
    if (family.notes.length) {
      mdLines.push(`  notes: ${family.notes.join(" ")}`);
    }
  }
  mdLines.push("");
  mdLines.push("## Consumer Matrix");
  mdLines.push("");
  for (const consumer of consumerMatrix) {
    mdLines.push(`- \`${consumer.consumer}\` -> \`${consumer.status}\``);
    mdLines.push(`  truth: ${consumer.canonicalTruthStatus}`);
    mdLines.push(`  machine: ${consumer.machine}`);
    mdLines.push(`  tool: ${consumer.tool}`);
    mdLines.push(`  holder: ${consumer.holder}`);
    mdLines.push(`  workholding: ${consumer.workholding}`);
    mdLines.push(`  cam/toolpath: ${consumer.camAndToolpath}`);
  }
  mdLines.push("");
  mdLines.push("## Immediate Next");
  mdLines.push("");
  for (const next of output.immediateNext) {
    mdLines.push(`- ${next}`);
  }
  mdLines.push("");
  mdLines.push("## Repro");
  mdLines.push("");
  mdLines.push(`- Generator: [mcat-variability-census.mjs](/${rel(path.join(ROOT, "scripts", "mcat-variability-census.mjs"))})`);
  mdLines.push(`- Command: \`node --experimental-strip-types H:/PRISM/scripts/mcat-variability-census.mjs --date ${DEFAULT_DATE}\``);

  fs.writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  fs.writeFileSync(mdPath, `${mdLines.join("\n")}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        ok: true,
        jsonPath: rel(jsonPath),
        mdPath: rel(mdPath),
        headline: {
          machines: output.machineSummary.mergedEnhancedCount,
          toolsTarget: output.toolSummary.intendedHistoricalCount,
          toolsActiveUnique: output.toolSummary.activeUniqueIds,
          materialsDetailJson: output.materialSummary.materialDetailJsonFiles,
          calculatorToolpaths: output.calculatorFallbackSummary.toolpathCount,
        },
      },
      null,
      2,
    ),
  );
}

await main();
