import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("H:/PRISM");
const SHARED_STATE_DIR = path.join(ROOT, "state", "shared");
const DEFAULT_DATE = process.argv.includes("--date")
  ? process.argv[process.argv.indexOf("--date") + 1]
  : "2026-04-02";

const CENSUS_PATH = path.join(
  SHARED_STATE_DIR,
  "MCAT_MS0_VARIABILITY_CENSUS_2026-04-02.json",
);

const LEGALITY_PATH = path.join(
  SHARED_STATE_DIR,
  "MCAT_MS0_CANONICAL_LEGALITY_EXTRACT_2026-04-02.json",
);

const ROADMAP_PATH = path.join(
  SHARED_STATE_DIR,
  "MCAT_MS0_EXHAUSTIVE_VARIABILITY_COVERAGE_ROADMAP_2026-04-02.json",
);

function writeJson(targetPath, value) {
  fs.writeFileSync(targetPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(targetPath, value) {
  fs.writeFileSync(targetPath, value, "utf8");
}

function rel(fullPath) {
  return path.relative(ROOT, fullPath).replace(/\\/g, "/");
}

function impactedConsumers(domain) {
  switch (domain) {
    case "machines":
      return ["calculator", "user_machine_profile", "program_release", "print_to_cnc"];
    case "tools":
      return ["calculator", "user_machine_profile", "print_to_cnc"];
    case "materials":
      return ["calculator", "print_to_cnc"];
    case "workholding":
      return ["calculator", "user_machine_profile", "program_release", "print_to_cnc"];
    case "cam_toolpaths":
      return ["calculator", "user_machine_profile", "print_to_cnc"];
    case "calculator_fallback":
      return ["calculator", "program_release", "print_to_cnc"];
    default:
      return ["calculator"];
  }
}

function classifyFamily(family, context) {
  const { legality, census } = context;
  const toolGap = census.reconciliations.find((entry) => entry.id === "tools_target_vs_active_unique");
  const toolpathGap = census.reconciliations.find((entry) => entry.id === "calculator_toolpaths_vs_backend_strategy_registry");
  const holderGapSummary = legality.gapRegistry
    .filter((gap) =>
      gap.reason.includes("turret")
      || gap.reason.includes("gang")
      || gap.reason.includes("Mill-turn")
      || gap.reason.includes("Mill spindle interface")
    )
    .slice(0, 4);

  const result = {
    domain: family.domain,
    familyId: family.familyId,
    label: family.label,
    count: family.count,
    currentWiringState: family.wiringState,
    sourcePaths: family.sourcePaths,
    currentConsumers: family.consumers,
    impactedConsumers: impactedConsumers(family.domain),
    targetWiringState: family.wiringState,
    recoveryAction: "maintain_baseline",
    recoveryWave: "baseline",
    priority: "baseline",
    blockers: [],
    rationale: [],
  };

  switch (family.wiringState) {
    case "target_not_recovered":
      result.targetWiringState = "backend_live_root";
      result.recoveryAction = "recover_missing_corpus";
      result.recoveryWave = "W0-denominator-recovery";
      result.priority = "P0";
      result.blockers.push(
        `${toolGap?.right?.count?.toLocaleString?.("en-US") ?? toolGap?.right?.count} active unique ids are still far below the ${toolGap?.left?.count?.toLocaleString?.("en-US") ?? toolGap?.left?.count} intended tool corpus.`,
      );
      result.rationale.push("Coverage denominators cannot be honest while the intended tool universe is missing from the live roots.");
      break;
    case "backend_live_root":
      result.targetWiringState = "backend_live_root_reconciled";
      result.recoveryAction = "reconcile_live_root_counts";
      result.recoveryWave = "W0-denominator-recovery";
      result.priority = "P0";
      result.blockers.push("Active live root counts still disagree with the intended corpus and SVI headline.");
      result.rationale.push("These roots drive the current backend denominator and must be reconciled before higher-order coverage can mean anything.");
      break;
    case "stale_metadata":
      result.targetWiringState = "metadata_reconciled";
      result.recoveryAction = "reconcile_metadata_claims";
      result.recoveryWave = "W0-denominator-recovery";
      result.priority = "P2";
      result.blockers.push("Published headers still disagree with live data on disk.");
      result.rationale.push("Metadata drift is not a live-surface blocker, but it distorts roadmap and audit truth.");
      break;
    case "backend_live_only":
      result.targetWiringState = "calculator_live_and_downstream";
      result.recoveryAction = "promote_backend_surface";
      result.recoveryWave = "W1-backend-promotion";
      result.priority = "P1";
      if (family.familyId === "indexable_milling_toolholding" || family.familyId === "turning_holders_expanded") {
        for (const gap of holderGapSummary) {
          result.blockers.push(`${gap.reason} (${gap.machineCount} machines)`);
        }
      }
      if (family.familyId === "backend_strategy_registry_header") {
        result.blockers.push(`${toolpathGap?.left?.count} calculator toolpaths are still static versus ${toolpathGap?.right?.count} in the backend registry headline.`);
      }
      result.rationale.push("The corpus is already present in backend truth but is not yet fully promoted into calculator or downstream consumers.");
      break;
    case "calculator_holder_live":
      result.targetWiringState = "calculator_live_and_downstream";
      result.recoveryAction = "extend_holder_surface";
      result.recoveryWave = "W1-backend-promotion";
      result.priority = "P1";
      for (const gap of holderGapSummary) {
        result.blockers.push(`${gap.reason} (${gap.machineCount} machines)`);
      }
      result.rationale.push("Holder routing exists, but the legality extract proves it still misses swiss/gang and ambiguous lathe interfaces.");
      break;
    case "backend_reference_fallback_ui":
      result.targetWiringState = "calculator_live_and_downstream";
      result.recoveryAction = "replace_fallback_with_backend_surface";
      result.recoveryWave = "W2-fallback-retirement";
      result.priority = "P1";
      result.blockers.push("Calculator still renders only a tiny static fallback for this domain.");
      result.rationale.push("These domains are present in backend reference data but not exposed as canonical live calculator surfaces yet.");
      break;
    case "calculator_fallback_only":
      result.targetWiringState = "calculator_live_and_downstream";
      result.recoveryAction = "retire_fallback_surface";
      result.recoveryWave = "W2-fallback-retirement";
      result.priority = family.domain === "cam_toolpaths" ? "P1" : "P2";
      if (family.domain === "cam_toolpaths") {
        result.blockers.push(`${toolpathGap?.left?.count} calculator toolpaths are static while backend strategy registry headline is ${toolpathGap?.right?.count}.`);
      } else {
        result.blockers.push("Live backend parity does not exist yet for this fallback surface.");
      }
      result.rationale.push("Static fallback surfaces hide denominator gaps and prevent downstream consumers from sharing the same truth.");
      break;
    case "raw_corpus_only":
      result.targetWiringState = "classified_for_promotion_or_archive";
      result.recoveryAction = "classify_raw_corpus";
      result.recoveryWave = "W1-backend-promotion";
      result.priority = "P2";
      result.blockers.push("Present on disk but not part of the current live registry load path.");
      result.rationale.push("These families need a keep/promote/archive decision before they can affect legality denominators.");
      break;
    case "reference_only":
      result.targetWiringState = "reference_or_live_decision";
      result.recoveryAction = "decide_reference_role";
      result.recoveryWave = "W2-fallback-retirement";
      result.priority = "P2";
      result.blockers.push("Currently documented or referenced, but not yet committed to a canonical live role.");
      result.rationale.push("Reference-only families should either become canonical or stay explicitly non-live.");
      break;
    case "backend_reference":
      result.targetWiringState = "backend_reference";
      result.recoveryAction = "keep_reference_only";
      result.recoveryWave = "baseline";
      result.priority = "baseline";
      result.rationale.push("Reference catalog only; not a direct calculator denominator family.");
      break;
    default:
      result.rationale.push("Already wired enough to serve as a baseline family for later coverage generators.");
      break;
  }

  return result;
}

function summarizeBy(entries, key) {
  const counts = {};
  for (const entry of entries) {
    const id = typeof key === "function" ? key(entry) : entry[key];
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([id, count]) => ({ id, count }));
}

function buildMarkdownReport(payload) {
  const priorityLines = payload.familiesNeedingRecovery
    .slice(0, 16)
    .map((entry) => `- [${entry.domain}] \`${entry.familyId}\` -> ${entry.recoveryAction} (${entry.priority}, ${entry.recoveryWave})`)
    .join("\n");
  const waveLines = payload.recoveryWaves.map((wave) =>
    `- ${wave.id}: \`${wave.familyCount}\` families, domains=${wave.domains.map((entry) => `${entry.id}:${entry.count}`).join(", ")}`
  ).join("\n");
  const blockerLines = payload.topBlockers.map((entry) => `- ${entry.reason}: \`${entry.familyCount}\` families`).join("\n");

  return `# MCAT-MS0 Unwired Source Recovery Ledger

Date: ${payload.generatedAt.date}  
Parent milestone: \`MCAT-MS0\`  
Lane: \`MCAT-MS0 / P1-U01 support\`  
Roadmap unit: \`U-MVAR05\`

Derived from:

- [MCAT_MS0_VARIABILITY_CENSUS_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_VARIABILITY_CENSUS_2026-04-02.json)
- [MCAT_MS0_CANONICAL_LEGALITY_EXTRACT_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_CANONICAL_LEGALITY_EXTRACT_2026-04-02.json)

## Intent

Turn every discovered source family into an explicit recovery, promotion, fallback-retirement, or metadata-reconciliation action so the remaining MCAT work is dependency-ordered instead of anecdotal.

## Summary

- Source families discovered: \`${payload.summary.sourceFamilyCount}\`
- Families needing recovery or promotion: \`${payload.summary.recoveryFamilyCount}\`
- P0 denominator-recovery families: \`${payload.summary.p0FamilyCount}\`
- P1 promotion/fallback-retirement families: \`${payload.summary.p1FamilyCount}\`
- Baseline/no-action families: \`${payload.summary.baselineFamilyCount}\`

## Recovery Waves

${waveLines}

## Highest-Priority Families

${priorityLines}

## Dominant Blockers

${blockerLines}

## Current Read

- \`W0-denominator-recovery\` is led by the tool corpus gap and metadata drift: the active tool roots still expose only \`${payload.context.toolActiveUniqueIds}\` unique tool ids versus the intended \`${payload.context.toolIntendedCorpus}\`.
- \`W1-backend-promotion\` is led by holder and tooling families already present in backend truth but not fully promoted into calculator legality, especially swiss/gang and ambiguous turret-interface gaps.
- \`W2-fallback-retirement\` is led by workholding plus CAM/toolpath surfaces, where the calculator still uses static fallback data despite richer backend or reference corpora.

## Next

- Start \`U-MVAR06\` thin live proof only after the highest-priority \`W0\` and \`W1\` families are named and assigned to concrete implementation slices.
`;
}

function main() {
  const census = JSON.parse(fs.readFileSync(CENSUS_PATH, "utf8"));
  const legality = JSON.parse(fs.readFileSync(LEGALITY_PATH, "utf8"));
  const families = census.sourceFamilies.map((family) => classifyFamily(family, { census, legality }));
  const familiesNeedingRecovery = families.filter((family) => family.priority !== "baseline");

  const recoveryWaves = summarizeBy(familiesNeedingRecovery, "recoveryWave")
    .map((wave) => ({
      id: wave.id,
      familyCount: wave.count,
      domains: summarizeBy(
        familiesNeedingRecovery.filter((family) => family.recoveryWave === wave.id),
        "domain",
      ),
    }));

  const blockerCounts = {};
  for (const family of familiesNeedingRecovery) {
    for (const blocker of family.blockers) {
      blockerCounts[blocker] = (blockerCounts[blocker] ?? 0) + 1;
    }
  }

  const payload = {
    id: `MCAT-MS0-UNWIRED-RECOVERY-${DEFAULT_DATE}`,
    parentMilestone: "MCAT-MS0",
    lane: "MCAT-MS0/P1-U01-support",
    status: "working",
    generatedAt: {
      date: DEFAULT_DATE,
      iso: new Date().toISOString(),
    },
    derivedFrom: [
      `H:/PRISM/${rel(CENSUS_PATH)}`,
      `H:/PRISM/${rel(LEGALITY_PATH)}`,
    ],
    context: {
      toolIntendedCorpus: census.reconciliations.find((entry) => entry.id === "tools_target_vs_active_unique")?.left?.count ?? null,
      toolActiveUniqueIds: census.reconciliations.find((entry) => entry.id === "tools_target_vs_active_unique")?.right?.count ?? null,
      calculatorToolpaths: census.reconciliations.find((entry) => entry.id === "calculator_toolpaths_vs_backend_strategy_registry")?.left?.count ?? null,
      backendStrategyHeadline: census.reconciliations.find((entry) => entry.id === "calculator_toolpaths_vs_backend_strategy_registry")?.right?.count ?? null,
      zeroHolderSignatures: legality.summary.zeroHolderSignatureCount,
      holderSignatureCount: legality.summary.holderSignatureCount,
    },
    summary: {
      sourceFamilyCount: families.length,
      recoveryFamilyCount: familiesNeedingRecovery.length,
      p0FamilyCount: familiesNeedingRecovery.filter((family) => family.priority === "P0").length,
      p1FamilyCount: familiesNeedingRecovery.filter((family) => family.priority === "P1").length,
      baselineFamilyCount: families.filter((family) => family.priority === "baseline").length,
    },
    recoveryWaves,
    families,
    familiesNeedingRecovery: familiesNeedingRecovery
      .sort((left, right) => {
        const priorityRank = { P0: 0, P1: 1, P2: 2, baseline: 3 };
        return (priorityRank[left.priority] ?? 9) - (priorityRank[right.priority] ?? 9)
          || left.recoveryWave.localeCompare(right.recoveryWave)
          || left.domain.localeCompare(right.domain)
          || left.familyId.localeCompare(right.familyId);
      }),
    topBlockers: Object.entries(blockerCounts)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 16)
      .map(([reason, familyCount]) => ({ reason, familyCount })),
  };

  const jsonPath = path.join(
    SHARED_STATE_DIR,
    `MCAT_MS0_UNWIRED_SOURCE_RECOVERY_${DEFAULT_DATE}.json`,
  );
  const mdPath = path.join(
    SHARED_STATE_DIR,
    `MCAT_MS0_UNWIRED_SOURCE_RECOVERY_${DEFAULT_DATE}.md`,
  );

  writeJson(jsonPath, payload);
  writeText(mdPath, buildMarkdownReport(payload));

  if (fs.existsSync(ROADMAP_PATH)) {
    const roadmap = JSON.parse(fs.readFileSync(ROADMAP_PATH, "utf8"));
    const completedUnits = Array.isArray(roadmap.executionStatus?.completedUnits)
      ? roadmap.executionStatus.completedUnits
      : [];
    const hasUnit = completedUnits.some((unit) => unit.id === "U-MVAR05");
    if (!hasUnit) {
      completedUnits.push({
        id: "U-MVAR05",
        title: "Recover unwired source families",
        completedAt: new Date().toISOString(),
        artifacts: [
          "H:/PRISM/state/shared/MCAT_MS0_UNWIRED_SOURCE_RECOVERY_2026-04-02.md",
          "H:/PRISM/state/shared/MCAT_MS0_UNWIRED_SOURCE_RECOVERY_2026-04-02.json",
        ],
      });
    }
    roadmap.executionStatus = {
      ...(roadmap.executionStatus ?? {}),
      completedUnits,
      currentUnit: "U-MVAR06",
      nextUnit: "U-MVAR07",
      session1Status: roadmap.executionStatus?.session1Status ?? "complete",
    };
    writeJson(ROADMAP_PATH, roadmap);
  }

  console.log(JSON.stringify({
    status: "ok",
    jsonPath: `H:/PRISM/${rel(jsonPath)}`,
    markdownPath: `H:/PRISM/${rel(mdPath)}`,
    recoveryFamilyCount: payload.summary.recoveryFamilyCount,
    p0FamilyCount: payload.summary.p0FamilyCount,
    p1FamilyCount: payload.summary.p1FamilyCount,
  }, null, 2));
}

main();
