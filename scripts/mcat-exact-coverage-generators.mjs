import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve("H:/PRISM");
const SHARED_STATE_DIR = path.join(ROOT, "state", "shared");
const DEFAULT_DATE = process.argv.includes("--date")
  ? process.argv[process.argv.indexOf("--date") + 1]
  : "2026-04-02";

const LEGALITY_PATH = path.join(
  SHARED_STATE_DIR,
  "MCAT_MS0_CANONICAL_LEGALITY_EXTRACT_2026-04-02.json",
);
const RECOVERY_PATH = path.join(
  SHARED_STATE_DIR,
  "MCAT_MS0_UNWIRED_SOURCE_RECOVERY_2026-04-02.json",
);
const COVERAGE_CONTRACT_PATH = path.join(
  SHARED_STATE_DIR,
  "MCAT_MS0_COVERAGE_METRIC_CONTRACT_2026-04-02.json",
);

function rel(fullPath) {
  return path.relative(ROOT, fullPath).replace(/\\/g, "/");
}

function readJson(fullPath) {
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function writeJson(targetPath, value) {
  fs.writeFileSync(targetPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(targetPath, value) {
  fs.writeFileSync(targetPath, value, "utf8");
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))].sort((left, right) =>
    left.localeCompare(right, "en-US"),
  );
}

function signatureFromList(values, empty = "__none__") {
  const normalized = uniqueSorted(values);
  return normalized.length > 0 ? normalized.join("|") : empty;
}

function countBy(values) {
  const counts = new Map();
  for (const value of values) {
    const key = String(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((left, right) => right.count - left.count || left.id.localeCompare(right.id, "en-US"));
}

function sample(values, limit = 8) {
  return values.slice(0, limit);
}

async function loadCalculatorWorkspace() {
  const moduleUrl = pathToFileURL(
    path.join(ROOT, "mcp-server", "web", "src", "data", "calculatorWorkspace.ts"),
  ).href;
  return await import(moduleUrl);
}

function extractRecoveryContext(recovery) {
  const familyById = new Map(recovery.families.map((entry) => [entry.familyId, entry]));
  return {
    toolIntendedCorpus: recovery.context.toolIntendedCorpus,
    toolActiveUniqueIds: recovery.context.toolActiveUniqueIds,
    calculatorToolpaths: recovery.context.calculatorToolpaths,
    backendStrategyHeadline: recovery.context.backendStrategyHeadline,
    toolholders: familyById.get("toolholders"),
    indexableMillingToolholding: familyById.get("indexable_milling_toolholding"),
    turningHoldersExpanded: familyById.get("turning_holders_expanded"),
    calculatorToolpathsFamily: familyById.get("calculator_toolpaths"),
    programmingEnvironmentsFamily: familyById.get("calculator_programming_environments"),
    workholdingFamilies: recovery.families.filter((entry) => entry.domain === "workholding"),
  };
}

function buildValueDomains({ legality, calculatorWorkspace, recoveryContext }) {
  const programmingEnvironments = calculatorWorkspace.PROGRAMMING_ENVIRONMENTS ?? [];
  const toolCatalog = calculatorWorkspace.TOOL_CATALOG ?? [];
  const materialCatalog = calculatorWorkspace.MATERIAL_CATALOG ?? [];
  const workholdingOptions = calculatorWorkspace.WORKHOLDING_OPTIONS ?? [];
  const toolpaths = programmingEnvironments.flatMap((environment) =>
    (environment.toolpaths ?? []).map((toolpath) => ({
      environmentId: environment.id,
      toolpathId: toolpath.id,
      label: toolpath.label,
    }))
  );

  const valueDomains = [
    {
      id: "machine_packages",
      label: "Canonical machine packages",
      source: "canonical_legality_extract",
      coverageScope: "exact_current",
      valueCount: legality.machines.length,
      values: legality.machines.map((machine) => machine.machineId).sort((left, right) => left.localeCompare(right, "en-US")),
    },
    {
      id: "machine_partitions",
      label: "Machine partitions",
      source: "canonical_legality_extract",
      coverageScope: "exact_current",
      valueCount: legality.partitionCounts.length,
      values: legality.partitionCounts.map((entry) => entry.id),
    },
    {
      id: "axis_topologies",
      label: "Axis / topology classes",
      source: "canonical_legality_extract",
      coverageScope: "exact_current",
      valueCount: legality.axisTopologyCounts.length,
      values: legality.axisTopologyCounts.map((entry) => entry.id),
    },
    {
      id: "controller_packages",
      label: "Controller packages",
      source: "canonical_legality_extract",
      coverageScope: "exact_current",
      valueCount: uniqueSorted(legality.machines.map((machine) => machine.controller?.id)).length,
      values: uniqueSorted(legality.machines.map((machine) => machine.controller?.id)),
    },
    {
      id: "spindle_interfaces",
      label: "Published spindle interfaces",
      source: "canonical_legality_extract",
      coverageScope: "exact_current",
      valueCount: uniqueSorted(legality.machines.map((machine) => machine.spindle?.interfaceId)).length,
      values: uniqueSorted(legality.machines.map((machine) => machine.spindle?.interfaceId)),
    },
    {
      id: "turret_interfaces",
      label: "Published turret interfaces",
      source: "canonical_legality_extract",
      coverageScope: "exact_current",
      valueCount: uniqueSorted(legality.machines.map((machine) => machine.turret?.interfaceId)).length,
      values: uniqueSorted(legality.machines.map((machine) => machine.turret?.interfaceId)),
    },
    {
      id: "coolant_ids",
      label: "Published coolant ids",
      source: "canonical_legality_extract",
      coverageScope: "exact_current",
      valueCount: uniqueSorted(legality.machines.flatMap((machine) => machine.coolantIds ?? [])).length,
      values: uniqueSorted(legality.machines.flatMap((machine) => machine.coolantIds ?? [])),
    },
    {
      id: "machine_capability_ids",
      label: "Machine capability ids",
      source: "canonical_legality_extract",
      coverageScope: "exact_current",
      valueCount: uniqueSorted(legality.machines.flatMap((machine) => machine.machineCapabilityIds ?? [])).length,
      values: uniqueSorted(legality.machines.flatMap((machine) => machine.machineCapabilityIds ?? [])),
    },
    {
      id: "holder_signatures",
      label: "Canonical holder signatures",
      source: "canonical_legality_extract",
      coverageScope: "exact_current",
      valueCount: legality.holderSignatureFamilies.length,
      values: legality.holderSignatureFamilies.map((entry) => entry.signatureId),
    },
    {
      id: "holder_styles",
      label: "Holder styles present in live holder signatures",
      source: "canonical_legality_extract",
      coverageScope: "exact_current",
      valueCount: uniqueSorted(
        legality.holderSignatureFamilies.flatMap((entry) => Object.keys(entry.holderCoverage?.holderStyleCounts ?? {})),
      ).length,
      values: uniqueSorted(
        legality.holderSignatureFamilies.flatMap((entry) => Object.keys(entry.holderCoverage?.holderStyleCounts ?? {})),
      ),
    },
    {
      id: "programming_environments",
      label: "Calculator programming environments",
      source: "calculator_workspace",
      coverageScope: "exact_current",
      valueCount: programmingEnvironments.length,
      values: programmingEnvironments.map((environment) => environment.id),
    },
    {
      id: "toolpath_ids",
      label: "Calculator toolpath ids",
      source: "calculator_workspace",
      coverageScope: "exact_current",
      valueCount: toolpaths.length,
      values: toolpaths.map((toolpath) => toolpath.toolpathId),
    },
    {
      id: "calculator_tool_bundles",
      label: "Calculator tool bundles",
      source: "calculator_workspace",
      coverageScope: "exact_current_with_known_gap",
      valueCount: toolCatalog.length,
      values: toolCatalog.map((tool) => tool.id),
      denominatorGap: {
        intendedCorpus: recoveryContext.toolIntendedCorpus,
        activeUniqueLiveIds: recoveryContext.toolActiveUniqueIds,
      },
    },
    {
      id: "calculator_material_states",
      label: "Calculator material states",
      source: "calculator_workspace",
      coverageScope: "exact_current_with_known_gap",
      valueCount: materialCatalog.length,
      values: materialCatalog.map((material) => material.id),
    },
    {
      id: "calculator_workholding_bundles",
      label: "Calculator workholding bundles",
      source: "calculator_workspace",
      coverageScope: "exact_current_with_known_gap",
      valueCount: workholdingOptions.length,
      values: workholdingOptions.map((workholding) => workholding.id),
    },
  ];

  return valueDomains.map((domain) => ({
    ...domain,
    sampleValues: sample(domain.values),
  }));
}

function buildPairDomains({ legality, calculatorWorkspace, recoveryContext }) {
  const programmingEnvironments = calculatorWorkspace.PROGRAMMING_ENVIRONMENTS ?? [];
  const toolCatalog = calculatorWorkspace.TOOL_CATALOG ?? [];
  const materialCatalog = calculatorWorkspace.MATERIAL_CATALOG ?? [];

  const configurationPairs = legality.machines.map((machine) => ({
    left: machine.machineId,
    right: signatureFromList([
      machine.partition,
      machine.axisTopology,
      machine.controller?.id,
      machine.spindle?.interfaceId,
      machine.turret?.interfaceId,
      signatureFromList(machine.coolantIds ?? []),
      signatureFromList(machine.machineCapabilityIds ?? []),
    ]),
  }));

  const holderPairs = legality.machines.flatMap((machine) =>
    (machine.holderDomains ?? []).map((domain) => ({
      left: machine.machineId,
      right: JSON.stringify(domain.query),
    }))
  );

  const coolantPairs = legality.machines.map((machine) => ({
    left: machine.machineId,
    right: signatureFromList(machine.coolantIds ?? []),
  }));

  const controllerFeaturePairs = legality.machines.map((machine) => ({
    left: machine.controller?.id ?? "unknown",
    right: signatureFromList(machine.controller?.featureIds ?? []),
  }));

  const spindleHolderPairs = legality.machines.flatMap((machine) =>
    (machine.holderDomains ?? []).map((domain) => ({
      left: machine.spindle?.interfaceId || machine.turret?.interfaceId || "unpublished",
      right: JSON.stringify(domain.query),
    }))
  );

  const environmentToolpathPairs = programmingEnvironments.flatMap((environment) =>
    (environment.toolpaths ?? []).map((toolpath) => ({
      left: environment.id,
      right: toolpath.id,
    }))
  );

  const pairDomains = [
    {
      id: "machine_x_configuration_bundle",
      label: "Machine package x configuration bundle",
      coverageScope: "exact_current",
      status: "ready",
      pairCount: uniqueSorted(configurationPairs.map((pair) => `${pair.left}::${pair.right}`)).length,
      samplePairs: sample(uniqueSorted(configurationPairs.map((pair) => `${pair.left}::${pair.right}`))),
    },
    {
      id: "machine_x_tooling_layout_topology",
      label: "Machine package x tooling layout topology",
      coverageScope: "exact_current",
      status: "ready",
      pairCount: legality.machines.length,
      samplePairs: sample(legality.machines.map((machine) => `${machine.machineId}::${machine.axisTopology}`)),
    },
    {
      id: "machine_x_holder_bundle",
      label: "Machine package x holder bundle",
      coverageScope: "exact_current",
      status: "ready",
      pairCount: uniqueSorted(holderPairs.map((pair) => `${pair.left}::${pair.right}`)).length,
      samplePairs: sample(uniqueSorted(holderPairs.map((pair) => `${pair.left}::${pair.right}`))),
    },
    {
      id: "machine_x_coolant_set",
      label: "Machine package x coolant set",
      coverageScope: "exact_current",
      status: "ready",
      pairCount: uniqueSorted(coolantPairs.map((pair) => `${pair.left}::${pair.right}`)).length,
      samplePairs: sample(uniqueSorted(coolantPairs.map((pair) => `${pair.left}::${pair.right}`))),
    },
    {
      id: "controller_package_x_feature_set",
      label: "Controller package x controller feature set",
      coverageScope: "exact_current",
      status: "ready",
      pairCount: uniqueSorted(controllerFeaturePairs.map((pair) => `${pair.left}::${pair.right}`)).length,
      samplePairs: sample(uniqueSorted(controllerFeaturePairs.map((pair) => `${pair.left}::${pair.right}`))),
    },
    {
      id: "spindle_package_x_holder_bundle",
      label: "Spindle package x holder bundle",
      coverageScope: "exact_current",
      status: "ready",
      pairCount: uniqueSorted(spindleHolderPairs.map((pair) => `${pair.left}::${pair.right}`)).length,
      samplePairs: sample(uniqueSorted(spindleHolderPairs.map((pair) => `${pair.left}::${pair.right}`))),
    },
    {
      id: "cam_environment_x_toolpath",
      label: "CAM environment x toolpath",
      coverageScope: "exact_current",
      status: "ready",
      pairCount: uniqueSorted(environmentToolpathPairs.map((pair) => `${pair.left}::${pair.right}`)).length,
      samplePairs: sample(uniqueSorted(environmentToolpathPairs.map((pair) => `${pair.left}::${pair.right}`))),
    },
    {
      id: "holder_bundle_x_tool_bundle",
      label: "Holder bundle x tool bundle",
      coverageScope: "deferred",
      status: "blocked",
      blocker: `Tool corpus gap remains ${recoveryContext.toolActiveUniqueIds.toLocaleString("en-US")} active unique ids vs ${recoveryContext.toolIntendedCorpus.toLocaleString("en-US")} intended, and there is not yet a canonical holder-to-tool compatibility matrix.`,
      currentObservedCounts: {
        holderBundles: legality.holderSignatureFamilies.length,
        calculatorToolBundles: toolCatalog.length,
      },
    },
    {
      id: "material_state_x_tool_bundle",
      label: "Material state x tool bundle",
      coverageScope: "deferred",
      status: "blocked",
      blocker: "Material-to-tool legality is still limited by the reduced calculator tool bundle surface and unrecovered live tool corpus.",
      currentObservedCounts: {
        calculatorMaterialStates: materialCatalog.length,
        calculatorToolBundles: toolCatalog.length,
      },
    },
    {
      id: "material_state_x_coolant_set",
      label: "Material state x coolant set",
      coverageScope: "deferred",
      status: "blocked",
      blocker: "Material coolant posture exists as recommendation data, but not yet as canonical legality edges over the full material master.",
      currentObservedCounts: {
        calculatorMaterialStates: materialCatalog.length,
        coolantSets: uniqueSorted(legality.machines.map((machine) => signatureFromList(machine.coolantIds ?? []))).length,
      },
    },
    {
      id: "workholding_bundle_x_machine_partition",
      label: "Workholding bundle x machine partition",
      coverageScope: "deferred",
      status: "blocked",
      blocker: "Workholding remains fallback-first and has not yet been promoted into explicit legality edges by machine partition.",
      currentObservedCounts: {
        calculatorWorkholdingBundles: (calculatorWorkspace.WORKHOLDING_OPTIONS ?? []).length,
        machinePartitions: legality.partitionCounts.length,
      },
    },
    {
      id: "overlay_x_canonical_machine_package",
      label: "Overlay x canonical machine package",
      coverageScope: "deferred",
      status: "blocked",
      blocker: "Persistence contract exists, but exact overlay corpus enumeration is deferred until more saved profiles are intentionally generated for coverage purposes.",
    },
  ];

  return pairDomains;
}

function buildBundleDomains({ legality, calculatorWorkspace }) {
  const programmingEnvironments = calculatorWorkspace.PROGRAMMING_ENVIRONMENTS ?? [];
  const workholdingOptions = calculatorWorkspace.WORKHOLDING_OPTIONS ?? [];

  const coolantBundles = legality.machines.map((machine) => signatureFromList(machine.coolantIds ?? []));
  const machineFeatureBundles = legality.machines.map((machine) => signatureFromList(machine.machineCapabilityIds ?? []));
  const controllerFeatureBundles = legality.machines.map((machine) => signatureFromList(machine.controller?.featureIds ?? []));
  const holderStyleBundles = legality.holderSignatureFamilies.map((entry) =>
    signatureFromList(Object.keys(entry.holderCoverage?.holderStyleCounts ?? {}))
  );
  const softwareBindingBundles = programmingEnvironments.map((environment) =>
    signatureFromList((environment.toolpaths ?? []).map((toolpath) => toolpath.id))
  );
  const workholdingBundles = workholdingOptions.map((workholding) => signatureFromList([workholding.id]));

  return [
    {
      id: "coolant_subsets",
      label: "Coolant subset bundle classes",
      coverageScope: "exact_current",
      bundleClassCount: uniqueSorted(coolantBundles).length,
      bundleClasses: sample(uniqueSorted(coolantBundles), 10),
    },
    {
      id: "machine_feature_subsets",
      label: "Machine feature subset bundle classes",
      coverageScope: "exact_current",
      bundleClassCount: uniqueSorted(machineFeatureBundles).length,
      bundleClasses: sample(uniqueSorted(machineFeatureBundles), 10),
    },
    {
      id: "controller_feature_subsets",
      label: "Controller feature subset bundle classes",
      coverageScope: "exact_current",
      bundleClassCount: uniqueSorted(controllerFeatureBundles).length,
      bundleClasses: sample(uniqueSorted(controllerFeatureBundles), 10),
    },
    {
      id: "holder_style_subsets",
      label: "Holder style subset bundle classes",
      coverageScope: "exact_current",
      bundleClassCount: uniqueSorted(holderStyleBundles).length,
      bundleClasses: sample(uniqueSorted(holderStyleBundles), 10),
    },
    {
      id: "software_binding_subsets",
      label: "Software-binding subset bundle classes",
      coverageScope: "exact_current",
      bundleClassCount: uniqueSorted(softwareBindingBundles).length,
      bundleClasses: sample(uniqueSorted(softwareBindingBundles), 10),
    },
    {
      id: "workholding_subsets",
      label: "Workholding subset bundle classes",
      coverageScope: "exact_current_with_known_gap",
      bundleClassCount: uniqueSorted(workholdingBundles).length,
      bundleClasses: sample(uniqueSorted(workholdingBundles), 10),
      note: "Current calculator workholding bundles are singleton fallback classes only.",
    },
  ];
}

function buildMarkdownReport(payload) {
  const valueLines = payload.valueDomains
    .map((domain) => `- \`${domain.id}\`: \`${domain.valueCount}\` values (${domain.coverageScope})`)
    .join("\n");
  const readyPairLines = payload.pairDomains
    .filter((domain) => domain.status === "ready")
    .map((domain) => `- \`${domain.id}\`: \`${domain.pairCount}\` legal pairs`)
    .join("\n");
  const blockedPairLines = payload.pairDomains
    .filter((domain) => domain.status === "blocked")
    .map((domain) => `- \`${domain.id}\`: ${domain.blocker}`)
    .join("\n");
  const bundleLines = payload.bundleDomains
    .map((domain) => `- \`${domain.id}\`: \`${domain.bundleClassCount}\` bundle classes (${domain.coverageScope})`)
    .join("\n");
  const blockerLines = payload.blockers.map((blocker) => `- ${blocker}`).join("\n");

  return `# MCAT-MS0 Exact Coverage Generators

Date: ${payload.generatedAt.date}  
Parent milestone: \`MCAT-MS0\`  
Lane: \`MCAT-MS0 / P1-U01 support\`  
Roadmap unit: \`U-MVAR07\`

Derived from:

- [MCAT_MS0_CANONICAL_LEGALITY_EXTRACT_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_CANONICAL_LEGALITY_EXTRACT_2026-04-02.json)
- [MCAT_MS0_UNWIRED_SOURCE_RECOVERY_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_UNWIRED_SOURCE_RECOVERY_2026-04-02.json)
- [MCAT_MS0_COVERAGE_METRIC_CONTRACT_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_COVERAGE_METRIC_CONTRACT_2026-04-02.json)

## Intent

Turn the exact-denominator portion of MCAT coverage into machine-readable generators. This unit does not claim exhaustive proof by itself; it publishes the exact value domains, pair domains, and bundle classes that later sessions will score against.

## Summary

- Exact value domains generated: \`${payload.summary.exactValueDomainCount}\`
- Exact pair generators ready: \`${payload.summary.readyPairDomainCount}\`
- Deferred pair generators called out honestly: \`${payload.summary.blockedPairDomainCount}\`
- Exact bundle generators ready: \`${payload.summary.bundleDomainCount}\`

## Value Domains

${valueLines}

## Ready Pair Generators

${readyPairLines}

## Deferred Pair Generators

${blockedPairLines}

## Bundle Generators

${bundleLines}

## Current Blockers

${blockerLines}

## Output Posture

- exact generators are now reproducible through [mcat-exact-coverage-generators.mjs](H:/PRISM/scripts/mcat-exact-coverage-generators.mjs)
- later MCAT units can consume these exact denominators instead of rebuilding them ad hoc
- pair domains that still depend on unrecovered tool/workholding/material legality stay explicitly blocked instead of being guessed

## Next

- advance to \`U-MVAR08\`
- build weighted legality-aware \`t=3/4/5\` generators on top of these exact denominator sets
- keep promotion work focused on the blocked pair domains: tool corpus, workholding legality, and material-tool compatibility
`;
}

async function main() {
  const legality = readJson(LEGALITY_PATH);
  const recovery = readJson(RECOVERY_PATH);
  const coverageContract = readJson(COVERAGE_CONTRACT_PATH);
  const calculatorWorkspace = await loadCalculatorWorkspace();
  const recoveryContext = extractRecoveryContext(recovery);

  const valueDomains = buildValueDomains({ legality, calculatorWorkspace, recoveryContext });
  const pairDomains = buildPairDomains({ legality, calculatorWorkspace, recoveryContext });
  const bundleDomains = buildBundleDomains({ legality, calculatorWorkspace });

  const blockers = uniqueSorted([
    `Tool corpus gap remains ${recoveryContext.toolActiveUniqueIds.toLocaleString("en-US")} active unique ids vs ${recoveryContext.toolIntendedCorpus.toLocaleString("en-US")} intended.`,
    "Workholding legality is still fallback-first rather than canonical machine-partition truth.",
    "Material-to-tool legality and material-to-coolant legality remain blocked by reduced live tool coverage.",
    "Overlay coverage is contract-ready but not yet population-ready for exact denominator claims.",
  ]);

  const payload = {
    id: `MCAT-MS0-EXACT-COVERAGE-GENERATORS-${DEFAULT_DATE}`,
    parentMilestone: "MCAT-MS0",
    lane: "MCAT-MS0/P1-U01-support",
    unit: "U-MVAR07",
    status: "complete",
    generatedAt: {
      date: DEFAULT_DATE,
      iso: new Date().toISOString(),
    },
    derivedFrom: [
      `H:/PRISM/${rel(LEGALITY_PATH)}`,
      `H:/PRISM/${rel(RECOVERY_PATH)}`,
      `H:/PRISM/${rel(COVERAGE_CONTRACT_PATH)}`,
      "H:/PRISM/mcp-server/web/src/data/calculatorWorkspace.ts",
    ],
    summary: {
      exactValueDomainCount: valueDomains.length,
      readyPairDomainCount: pairDomains.filter((domain) => domain.status === "ready").length,
      blockedPairDomainCount: pairDomains.filter((domain) => domain.status === "blocked").length,
      bundleDomainCount: bundleDomains.length,
      exactValueCount: valueDomains.reduce((sum, domain) => sum + domain.valueCount, 0),
      readyPairCount: pairDomains.filter((domain) => domain.status === "ready").reduce((sum, domain) => sum + domain.pairCount, 0),
      bundleClassCount: bundleDomains.reduce((sum, domain) => sum + domain.bundleClassCount, 0),
    },
    currentCorpusContext: {
      machinePackages: legality.summary.machineCount,
      holderSignatures: legality.summary.holderSignatureCount,
      zeroHolderSignatures: legality.summary.zeroHolderSignatureCount,
      intendedToolCorpus: recoveryContext.toolIntendedCorpus,
      activeToolUniqueIds: recoveryContext.toolActiveUniqueIds,
      calculatorToolpaths: recoveryContext.calculatorToolpaths,
      backendStrategyHeadline: recoveryContext.backendStrategyHeadline,
      releaseFloors: coverageContract.releaseFloors ?? null,
    },
    valueDomains,
    pairDomains,
    bundleDomains,
    blockers,
  };

  const jsonPath = path.join(
    SHARED_STATE_DIR,
    `MCAT_MS0_EXACT_COVERAGE_GENERATORS_${DEFAULT_DATE}.json`,
  );
  const mdPath = path.join(
    SHARED_STATE_DIR,
    `MCAT_MS0_EXACT_COVERAGE_GENERATORS_${DEFAULT_DATE}.md`,
  );

  writeJson(jsonPath, payload);
  writeText(mdPath, buildMarkdownReport(payload));

  console.log(
    JSON.stringify(
      {
        ok: true,
        unit: "U-MVAR07",
        valueDomainCount: payload.summary.exactValueDomainCount,
        readyPairDomainCount: payload.summary.readyPairDomainCount,
        blockedPairDomainCount: payload.summary.blockedPairDomainCount,
        bundleDomainCount: payload.summary.bundleDomainCount,
        jsonPath: `H:/PRISM/${rel(jsonPath)}`,
        mdPath: `H:/PRISM/${rel(mdPath)}`,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
