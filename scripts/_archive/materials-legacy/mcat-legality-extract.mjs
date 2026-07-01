import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("H:/PRISM");
const SHARED_STATE_DIR = path.join(ROOT, "state", "shared");
const DEFAULT_DATE = process.argv.includes("--date")
  ? process.argv[process.argv.indexOf("--date") + 1]
  : "2026-04-02";

const MACHINE_CATALOG_PATH = path.join(
  ROOT,
  "data",
  "machines",
  "ENHANCED",
  "json",
  "ALL_MACHINES_ENRICHED.json",
);

const ROADMAP_PATH = path.join(
  SHARED_STATE_DIR,
  "MCAT_MS0_EXHAUSTIVE_VARIABILITY_COVERAGE_ROADMAP_2026-04-02.json",
);

function rel(fullPath) {
  return path.relative(ROOT, fullPath).replace(/\\/g, "/");
}

function asRecord(value) {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

function safeNum(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readText(value, nestedKeys = []) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  const record = asRecord(value);
  if (!record) return "";
  for (const key of nestedKeys) {
    const nested = readText(record[key]);
    if (nested) return nested;
  }
  return "";
}

function writeJson(targetPath, value) {
  fs.writeFileSync(targetPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(targetPath, value) {
  fs.writeFileSync(targetPath, value, "utf8");
}

function slugify(value, fallback = "unknown") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function humanizeToken(value) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeManufacturer(raw) {
  const manufacturer = readText(raw.manufacturer, ["name", "label", "brand"])
    || readText(raw.brand, ["name", "label"])
    || readText(asRecord(raw.controller)?.manufacturer)
    || readText(asRecord(raw.controller)?.brand)
    || "Unknown";
  const normalized = manufacturer === manufacturer.toUpperCase()
    ? humanizeToken(manufacturer.toLowerCase())
    : humanizeToken(manufacturer);
  if (normalized.toLowerCase() === "dmg mori" || normalized.toLowerCase() === "dmg-mori") {
    return "DMG MORI";
  }
  return normalized;
}

function stripLeadingManufacturer(manufacturer, value) {
  const normalized = manufacturer.trim().toLowerCase();
  const trimmed = String(value ?? "").trim();
  if (!normalized || !trimmed) return trimmed;
  return trimmed.replace(new RegExp(`^${normalized}(?:[\\s_-]+|$)`, "i"), "").trim();
}

function normalizeModel(raw, manufacturer) {
  const rawModel = readText(raw.model, ["name", "label"])
    || readText(raw.name, ["name", "label"])
    || readText(raw.series, ["name", "label"])
    || readText(raw.id);
  const withoutManufacturer = stripLeadingManufacturer(manufacturer, rawModel);
  const cleaned = withoutManufacturer
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "Unknown Model";
  return cleaned
    .split(" ")
    .map((token) => {
      if (!/[A-Za-z]/.test(token)) return token;
      if (/^[a-z0-9-]+$/i.test(token) && (/[0-9]/.test(token) || token.length <= 4)) {
        return token.toUpperCase();
      }
      if (token === token.toLowerCase()) {
        return token.charAt(0).toUpperCase() + token.slice(1);
      }
      return token;
    })
    .join(" ")
    .replace(/([A-Z0-9])\s+([345]AX)\b/g, "$1-$2")
    .replace(/\s*-\s*/g, "-")
    .trim();
}

function buildSignature(raw) {
  return [
    raw.type,
    raw.subtype,
    raw.description,
    raw.name,
    raw.model,
    raw.machine_type,
    raw.category,
    raw.series,
    readText(asRecord(raw.controller)?.type),
    readText(asRecord(raw.controller)?.cnc_type),
    readText(asRecord(raw.control)?.manufacturer),
    readText(asRecord(raw.control)?.model),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function normalizeInterfaceId(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized || normalized === "unknown") return "";
  if (/(cat\s*40).*?(big\+|big plus)|(big\+|big plus).*?(cat\s*40)/i.test(normalized)) return "cat40-big-plus";
  if (/cat\s*40/i.test(normalized)) return "cat40";
  if (/cat\s*50/i.test(normalized)) return "cat50";
  if (/bt\s*30/i.test(normalized)) return "bt30";
  if (/bt\s*40/i.test(normalized)) return "bt40";
  if (/bt\s*50/i.test(normalized)) return "bt50";
  if (/hsk[\s_-]*a\s*50/i.test(normalized)) return "hsk-a50";
  if (/hsk[\s_-]*a\s*63/i.test(normalized)) return "hsk-a63";
  if (/hsk[\s_-]*a\s*100/i.test(normalized)) return "hsk-a100";
  if (/hsk[\s_-]*t\s*63/i.test(normalized)) return "hsk-t63";
  if (/hsk[\s_-]*t\s*80/i.test(normalized)) return "hsk-t80";
  if (/hsk[\s_-]*t\s*100/i.test(normalized)) return "hsk-t100";
  if (/capto[\s_-]*c\s*3/i.test(normalized)) return "capto-c3";
  if (/capto[\s_-]*c\s*4/i.test(normalized)) return "capto-c4";
  if (/capto[\s_-]*c\s*5/i.test(normalized)) return "capto-c5";
  if (/capto[\s_-]*c\s*6/i.test(normalized)) return "capto-c6";
  if (/capto[\s_-]*c\s*8/i.test(normalized)) return "capto-c8";
  if (/bmt\s*45/i.test(normalized)) return "bmt45";
  if (/bmt\s*55/i.test(normalized)) return "bmt55";
  if (/bmt\s*65/i.test(normalized)) return "bmt65";
  if (/bmt\s*75/i.test(normalized)) return "bmt75";
  if (/vdi\s*20/i.test(normalized)) return "vdi20";
  if (/vdi\s*25/i.test(normalized)) return "vdi25";
  if (/vdi\s*30/i.test(normalized)) return "vdi30";
  if (/vdi\s*40/i.test(normalized)) return "vdi40";
  if (/vdi\s*50/i.test(normalized)) return "vdi50";
  if (/vdi\s*60/i.test(normalized)) return "vdi60";
  if (/psc\s*32/i.test(normalized)) return "psc32";
  if (/psc\s*40/i.test(normalized)) return "psc40";
  if (/psc\s*50/i.test(normalized)) return "psc50";
  if (/psc\s*63/i.test(normalized)) return "psc63";
  if (/psc\s*80/i.test(normalized)) return "psc80";
  if (/gang/i.test(normalized)) return "gang";
  if (/disc/i.test(normalized)) return "disc";
  if (/drum/i.test(normalized)) return "drum";
  return slugify(normalized, "");
}

function normalizeTurretTypeId(raw) {
  const normalized = normalizeInterfaceId(raw);
  if (normalized === "bmt") return "";
  return normalized;
}

function controllerLabel(raw) {
  const controller = asRecord(raw.controller);
  const control = asRecord(raw.control);
  return readText(controller?.type)
    || [readText(controller?.manufacturer) || readText(controller?.brand), readText(controller?.model) || readText(controller?.cnc_type)].filter(Boolean).join(" ")
    || [readText(control?.manufacturer), readText(control?.model)].filter(Boolean).join(" ")
    || readText(raw.control)
    || "Controller not published";
}

function deriveControllerFeatureIds(raw, partition) {
  const ids = new Set();
  const control = asRecord(raw.control);
  const controller = asRecord(raw.controller);
  const tcpc = asRecord(raw.tcpcRtcp);
  const kinematics = asRecord(raw.kinematics);

  if (raw.high_speed_machining === true) ids.add("high_speed_machining");
  if (raw.rigid_tapping === true) ids.add("rigid_tapping");
  if (raw.probing_ready === true) ids.add("probing_ready");
  if (raw.automation_ready === true) ids.add("automation_ready");
  if (raw.liveTools === true || raw.live_tooling === true) ids.add("live_tooling");
  if (raw.yAxis === true || raw.y_axis === true) ids.add("y_axis");
  if (raw.cAxis === true || raw.c_axis === true) ids.add("c_axis");
  if (raw.bAxis === true || raw.b_axis === true) ids.add("b_axis");
  if (raw.subSpindle === true || raw.sub_spindle) ids.add("sub_spindle");
  if (
    raw.dualTurret === true || raw.second_turret === true || raw.twinTurret === true
    || raw.doubleTurret === true
  ) ids.add("second_turret");
  if (safeNum(raw.simultaneous_axes) >= 5 || partition === "mill_turn") ids.add("simultaneous_5_axis");
  if (kinematics?.tcpcSupported === true) ids.add("tcpc");

  const controlFeatures = Array.isArray(control?.features) ? control.features : [];
  const tcpcModes = Array.isArray(tcpc?.modes) ? tcpc.modes : [];
  for (const value of [...controlFeatures, ...tcpcModes]) {
    const id = slugify(String(value), "");
    if (id) ids.add(id);
  }

  if (controller?.ethernet === true) ids.add("ethernet");
  if (controller?.usb === true) ids.add("usb");

  return [...ids].sort();
}

function deriveCoolantIds(raw, partition) {
  const coolant = asRecord(raw.coolant) ?? {};
  const spindle = asRecord(raw.spindle) ?? {};
  const ids = new Set();
  const coolantType = readText(coolant.type).toLowerCase();

  if (partition === "wire_edm" || partition === "sinker_edm") {
    ids.add("dielectric");
  }

  if (
    coolant.flood === true
    || coolant.flood_coolant === true
    || (safeNum(coolant.pressure_bar) > 0 && !coolantType.includes("mist"))
    || (Object.keys(coolant).length > 0 && !coolantType.includes("mist") && !coolantType.includes("mql") && partition !== "wire_edm" && partition !== "sinker_edm")
  ) {
    ids.add("flood");
  }

  if (
    coolant.tsc === true
    || coolant.through_spindle === true
    || coolant.throughSpindle === true
    || spindle.coolant_through === true
    || safeNum(coolant.tsc_pressure) > 0
    || safeNum(coolant.tscPressure) > 0
    || safeNum(coolant.tsc_pressure_bar) > 0
  ) {
    ids.add("tsc");
  }

  if (coolant.air_blast === true) ids.add("air_blast");
  if (coolant.through_air === true) ids.add("through_air");
  if (coolant.mist === true || coolantType.includes("mist")) ids.add("mist");
  if (coolant.mql_ready === true || coolantType.includes("mql")) ids.add("mql");

  return [...ids].sort();
}

function inferPartition(raw) {
  const signature = buildSignature(raw);
  const turretType = normalizeTurretTypeId(readText(asRecord(raw.turret)?.type));
  if (/wire edm|wire_edm/.test(signature)) return "wire_edm";
  if (/laser/.test(signature)) return "laser";
  if (/waterjet/.test(signature)) return "waterjet";
  if (/sinker|ram edm|sinker_edm|\bedm\b/.test(signature)) return "sinker_edm";
  if (
    /swiss|cincom|guide bushing/.test(signature)
    || turretType === "gang"
    || raw.gangTooling
    || raw.mainGang
    || raw.gang_slide === true
  ) return "swiss";
  if (/vtl|vertical turning|inverted spindle|vertical_turning/.test(signature) || raw.vertical_turning === true) {
    return "vtl";
  }
  if (/mill-turn|mill turn|multi-task|multitask|turn_mill|mill_turn|multus|integrex|ntx|smx/.test(signature) || raw.turn_mill === true) {
    return "mill_turn";
  }
  if (/lathe|turning center|turning_center/.test(signature) || readText(asRecord(raw.turret)?.type)) {
    return "lathe";
  }
  if (/router/.test(signature)) return "router";
  return "mill";
}

function inferAxisTopology(raw, partition) {
  const signature = buildSignature(raw);
  const simultaneousAxes = safeNum(raw.simultaneous_axes);
  const isHorizontal = /horizontal|\bhmc\b|pallet|floor_type_hbm/.test(signature);

  if (partition === "swiss") return "swiss";
  if (partition === "mill_turn") return "mill_turn";
  if (partition === "vtl") return "vtl";
  if (partition === "wire_edm") return "wire_edm";
  if (partition === "sinker_edm") return "sinker_edm";
  if (partition === "laser") return "laser";
  if (partition === "waterjet") return "waterjet";
  if (partition === "router") return "router";

  if (partition === "lathe") {
    if (raw.subSpindle === true || raw.sub_spindle || raw.dualSpindle === true) return "sub_spindle_lathe";
    if (raw.yAxis === true || raw.y_axis === true || raw.liveTools === true || raw.live_tooling === true) return "y_axis_lathe";
    return "2_axis_lathe";
  }

  if (simultaneousAxes >= 5 || /5axis|5-axis|trunnion|a-axis|b-axis/.test(signature)) {
    return isHorizontal ? "5_axis_horizontal" : "5_axis_vertical";
  }
  if (simultaneousAxes === 4 || /4-axis/.test(signature)) {
    return isHorizontal ? "4_axis_horizontal" : "4_axis_vertical";
  }
  return isHorizontal ? "3_axis_horizontal" : "3_axis_vertical";
}

function inferTurretCount(raw) {
  if (
    raw.dualTurret === true || raw.second_turret === true || raw.twinTurret === true
    || raw.doubleTurret === true
  ) {
    return 2;
  }
  return 1;
}

function inferLiveTooling(raw, partition) {
  if (partition === "mill_turn") return true;
  return raw.liveTools === true
    || raw.live_tooling === true
    || raw.yAxis === true
    || raw.y_axis === true
    || /live/.test(buildSignature(raw));
}

function inferHasMillingHead(raw, partition, turretTypeId) {
  if (partition === "mill_turn") return true;
  if (partition === "vtl" && (raw.bAxis === true || raw.b_axis === true)) return true;
  return /^capto|^psc|^hsk-t/.test(turretTypeId);
}

function inferMillSpindleInterfaceId(raw) {
  const spindle = asRecord(raw.spindle) ?? {};
  return normalizeInterfaceId(
    readText(spindle.spindle_nose)
      || readText(spindle.taper)
      || readText(raw.tool_interface)
      || readText(raw.spindle_interface),
  );
}

function inferHolderDomains(machine) {
  const domains = [];
  const notes = [];
  const partition = machine.partition;
  const raw = machine.raw;

  if (["wire_edm", "sinker_edm", "laser", "waterjet"].includes(partition)) {
    notes.push("Holder legality is not applicable for this non-spindle partition.");
    return { domains, notes };
  }

  if (partition === "mill" || partition === "router") {
    const spindleConnectionTypeId = inferMillSpindleInterfaceId(raw);
    if (!spindleConnectionTypeId) {
      notes.push("Mill spindle interface is unpublished, so holder legality cannot be resolved.");
      return { domains, notes };
    }
    domains.push({
      role: "primary_spindle",
      query: {
        mode: "mill",
        layoutKind: "magazine",
        spindleConnectionTypeId,
      },
    });
    return { domains, notes };
  }

  const turretTypeId = normalizeTurretTypeId(readText(asRecord(raw.turret)?.type));
  const turretCount = inferTurretCount(raw);
  const liveTooling = inferLiveTooling(raw, partition);
  const hasMillingHead = inferHasMillingHead(raw, partition, turretTypeId);

  if (partition === "swiss") {
    domains.push({
      role: "primary_gang",
      query: {
        mode: "lathe",
        layoutKind: "gang",
        turretTypeId: turretTypeId || "gang",
        turretCount,
        liveTooling,
        hasMillingHead: false,
      },
    });
    return { domains, notes };
  }

  if (partition === "lathe" || partition === "vtl" || partition === "mill_turn") {
    if (turretTypeId) {
      domains.push({
        role: "primary_turret",
        query: {
          mode: "lathe",
          layoutKind: "turret",
          turretTypeId,
          turretCount,
          liveTooling,
          hasMillingHead,
        },
      });
    } else {
      notes.push("Lathe-style tooling layout is missing a published turret interface.");
    }

    if (partition === "mill_turn") {
      const spindleConnectionTypeId = inferMillSpindleInterfaceId(raw);
      const toolChangerCapacity = Math.max(
        safeNum(asRecord(raw.tool_changer)?.capacity),
        safeNum(asRecord(raw.atc)?.capacity),
        safeNum(raw.tool_changer_capacity),
      );

      if (spindleConnectionTypeId) {
        domains.push({
          role: "milling_spindle",
          query: {
            mode: "mill",
            layoutKind: "magazine",
            spindleConnectionTypeId,
          },
        });
      } else if (toolChangerCapacity > 0) {
        notes.push("Mill-turn machine publishes a magazine/tool changer but no milling spindle interface.");
      }
    }

    return { domains, notes };
  }

  return { domains, notes };
}

function stableKey(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableKey(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableKey(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function fetchHolderSummary(query) {
  const response = await fetch("http://127.0.0.1:3000/api/v1/data/holder/catalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    return {
      ok: false,
      error: `HTTP ${response.status}`,
      holderCount: 0,
      holderStyleCounts: {},
      holderTypeCounts: {},
      brandCounts: {},
      requiresLiveToolingCount: 0,
      requiresMillingHeadCount: 0,
      coolantThroughCount: 0,
      maxRpmCeiling: 0,
      sampleHolderIds: [],
    };
  }

  const payload = await response.json();
  const holders = payload?.result?.holders ?? [];
  const holderStyleCounts = {};
  const holderTypeCounts = {};
  const brandCounts = {};
  let requiresLiveToolingCount = 0;
  let requiresMillingHeadCount = 0;
  let coolantThroughCount = 0;
  let maxRpmCeiling = 0;

  for (const holder of holders) {
    holderStyleCounts[holder.holderStyleId] = (holderStyleCounts[holder.holderStyleId] ?? 0) + 1;
    holderTypeCounts[holder.holderType] = (holderTypeCounts[holder.holderType] ?? 0) + 1;
    brandCounts[holder.brandLabel] = (brandCounts[holder.brandLabel] ?? 0) + 1;
    if (holder.requiresLiveTooling) requiresLiveToolingCount += 1;
    if (holder.requiresMillingHead) requiresMillingHeadCount += 1;
    if (holder.coolantThrough) coolantThroughCount += 1;
    if (safeNum(holder.maxRpm) > maxRpmCeiling) maxRpmCeiling = safeNum(holder.maxRpm);
  }

  return {
    ok: true,
    holderCount: holders.length,
    holderStyleCounts,
    holderTypeCounts,
    brandCounts,
    requiresLiveToolingCount,
    requiresMillingHeadCount,
    coolantThroughCount,
    maxRpmCeiling,
    sampleHolderIds: holders.slice(0, 8).map((holder) => holder.id),
  };
}

function topEntries(record, limit = 10) {
  return Object.entries(record ?? {})
    .sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])))
    .slice(0, limit)
    .map(([id, count]) => ({ id, count }));
}

function summarizeMachinesBy(recordList, keyFn) {
  const counts = {};
  for (const record of recordList) {
    const key = keyFn(record);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([id, count]) => ({ id, count }));
}

function buildGapSummary(machineProfiles) {
  const gapCounts = {};

  for (const machine of machineProfiles) {
    for (const note of machine.legalityNotes) {
      gapCounts[note] = (gapCounts[note] ?? 0) + 1;
    }
    for (const domain of machine.holderDomains) {
      if (!domain.holderCoverage?.ok) {
        gapCounts[`Holder query failed: ${domain.holderCoverage?.error ?? "unknown error"}`] =
          (gapCounts[`Holder query failed: ${domain.holderCoverage?.error ?? "unknown error"}`] ?? 0) + 1;
      } else if (domain.holderCoverage.holderCount === 0) {
        gapCounts[`Zero-holder legality for ${domain.query.layoutKind}:${domain.query.turretTypeId ?? domain.query.spindleConnectionTypeId ?? "untyped"}`] =
          (gapCounts[`Zero-holder legality for ${domain.query.layoutKind}:${domain.query.turretTypeId ?? domain.query.spindleConnectionTypeId ?? "untyped"}`] ?? 0) + 1;
      }
    }
  }

  return Object.entries(gapCounts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([reason, machineCount]) => ({ reason, machineCount }));
}

function buildMarkdownReport(payload) {
  const summary = payload.summary;
  const topGapLines = payload.gapRegistry.slice(0, 12).map((gap) => `- ${gap.reason}: \`${gap.machineCount}\``).join("\n");
  const partitionLines = payload.partitionCounts.map((entry) => `- ${entry.id}: \`${entry.count}\``).join("\n");
  const topologyLines = payload.axisTopologyCounts.slice(0, 12).map((entry) => `- ${entry.id}: \`${entry.count}\``).join("\n");
  const controllerLines = payload.controllerCounts.slice(0, 12).map((entry) => `- ${entry.id}: \`${entry.count}\``).join("\n");
  const holderSignatureLines = payload.holderSignatureFamilies.slice(0, 12).map((entry) =>
    `- \`${entry.signatureId}\`: machines=\`${entry.machineCount}\`, holders=\`${entry.holderCoverage.holderCount}\`, sample=\`${entry.representativeMachines.join(", ")}\``
  ).join("\n");
  const zeroHolderLines = payload.holderSignatureFamilies
    .filter((entry) => entry.holderCoverage.holderCount === 0)
    .slice(0, 12)
    .map((entry) => `- \`${entry.signatureId}\`: machines=\`${entry.machineCount}\``)
    .join("\n");

  return `# MCAT-MS0 Canonical Legality Extract

Date: ${payload.generatedAt.date}  
Parent milestone: \`MCAT-MS0\`  
Lane: \`MCAT-MS0 / P1-U01 support\`  
Roadmap unit: \`U-MVAR04\`

Derived from:

- [${rel(MACHINE_CATALOG_PATH)}](H:/PRISM/${rel(MACHINE_CATALOG_PATH)})
- [mcp-server/src/utils/calculatorToolHolderCatalog.ts](H:/PRISM/mcp-server/src/utils/calculatorToolHolderCatalog.ts)
- [MCAT_MS0_VARIABILITY_CENSUS_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_VARIABILITY_CENSUS_2026-04-02.json)
- [MCAT_MS0_LEGALITY_GRAPH_SPEC_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_LEGALITY_GRAPH_SPEC_2026-04-02.json)
- [MCAT_MS0_COVERAGE_METRIC_CONTRACT_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_COVERAGE_METRIC_CONTRACT_2026-04-02.json)

## Intent

Materialize the first canonical legality extract directly from the merged machine corpus plus the live holder database, so later MCAT coverage runs can enumerate legal machine/controller/spindle/coolant/holder states from backend truth instead of frontend approximation.

## Summary

- Machines processed: \`${summary.machineCount}\`
- Holder-eligible machines: \`${summary.holderEligibleMachineCount}\`
- Holder signatures: \`${summary.holderSignatureCount}\`
- Zero-holder signatures: \`${summary.zeroHolderSignatureCount}\`
- Machines with unpublished controller labels: \`${summary.unpublishedControllerCount}\`
- Machines with unpublished spindle or turret interfaces: \`${summary.unpublishedInterfaceCount}\`
- Machines with empty coolant sets: \`${summary.emptyCoolantCount}\`

## Partition Counts

${partitionLines}

## Axis Topology Counts

${topologyLines}

## Published Controller Counts

${controllerLines}

## Holder Signature Families

${holderSignatureLines}

## Zero-Holder Signatures

${zeroHolderLines || "- none"}

## Dominant Gap Classes

${topGapLines || "- none"}

## Current Read

- The canonical machine corpus is rich enough to infer partitions, controller labels, coolant sets, spindle/turret interfaces, and first-pass capability bundles for all \`${summary.machineCount}\` machines.
- The live holder catalog already resolves strong mill and turret-lathe legality, but the current holder surface still exposes real topology gaps:
  - swiss gang layouts produce zero-holder legality because the holder catalog currently publishes lathe holders as turret-only
  - several mill-turn rows publish a tool changer without a corresponding milling spindle interface
  - disc/drum or generic BMT turret labels remain too ambiguous for strict holder compatibility
- This extract is ready to serve as the denominator source for \`U-MVAR05\` unwired-source recovery and the first mixed-strength legality proof runs.
`;
}

async function main() {
  const rows = JSON.parse(fs.readFileSync(MACHINE_CATALOG_PATH, "utf8"));
  const holderQueryCache = new Map();

  const machineProfiles = rows.map((raw) => {
    const manufacturer = normalizeManufacturer(raw);
    const model = normalizeModel(raw, manufacturer);
    const partition = inferPartition(raw);
    const axisTopology = inferAxisTopology(raw, partition);
    const coolantIds = deriveCoolantIds(raw, partition);
    const controllerFeatureIds = deriveControllerFeatureIds(raw, partition);
    const controller = controllerLabel(raw);
    const spindleInterfaceId = inferMillSpindleInterfaceId(raw);
    const turretTypeId = normalizeTurretTypeId(readText(asRecord(raw.turret)?.type));
    const { domains, notes } = inferHolderDomains({
      raw,
      partition,
    });

    return {
      machineId: String(raw.id ?? ""),
      manufacturer,
      manufacturerId: slugify(manufacturer),
      model,
      partition,
      axisTopology,
      controller: {
        id: slugify(controller, "controller-not-published"),
        label: controller,
        featureIds: controllerFeatureIds,
      },
      spindle: {
        interfaceId: spindleInterfaceId || null,
        label: readText(asRecord(raw.spindle)?.spindle_nose) || readText(asRecord(raw.spindle)?.taper) || null,
        maxRpm: Math.max(
          safeNum(asRecord(raw.spindle)?.max_rpm),
          safeNum(asRecord(raw.spindle)?.rpm),
          safeNum(raw.spindle_max_rpm),
        ),
      },
      turret: {
        interfaceId: turretTypeId || null,
        label: readText(asRecord(raw.turret)?.type) || null,
        turretCount: inferTurretCount(raw),
      },
      coolantIds,
      machineCapabilityIds: controllerFeatureIds,
      holderDomains: domains.map((domain) => ({
        role: domain.role,
        query: domain.query,
        holderCoverage: null,
      })),
      legalityNotes: notes,
      sourceRecordIds: [String(raw.id ?? "")],
      raw,
    };
  });

  for (const machine of machineProfiles) {
    for (const domain of machine.holderDomains) {
      const cacheKey = stableKey(domain.query);
      if (!holderQueryCache.has(cacheKey)) {
        holderQueryCache.set(cacheKey, await fetchHolderSummary(domain.query));
      }
      domain.holderCoverage = holderQueryCache.get(cacheKey);
    }
  }

  const holderSignatureFamilies = [...holderQueryCache.entries()].map(([signatureId, holderCoverage]) => {
    const matchingMachines = machineProfiles.filter((machine) =>
      machine.holderDomains.some((domain) => stableKey(domain.query) === signatureId)
    );
    const firstDomain = matchingMachines.flatMap((machine) => machine.holderDomains).find(
      (domain) => stableKey(domain.query) === signatureId,
    );
    return {
      signatureId,
      query: firstDomain?.query ?? null,
      partitionCounts: summarizeMachinesBy(
        matchingMachines,
        (machine) => machine.partition,
      ),
      axisTopologyCounts: summarizeMachinesBy(
        matchingMachines,
        (machine) => machine.axisTopology,
      ),
      machineCount: matchingMachines.length,
      representativeMachines: matchingMachines.slice(0, 8).map((machine) => machine.machineId),
      holderCoverage,
    };
  }).sort((left, right) => right.machineCount - left.machineCount || left.signatureId.localeCompare(right.signatureId));

  const payload = {
    id: `MCAT-MS0-LEGALITY-EXTRACT-${DEFAULT_DATE}`,
    parentMilestone: "MCAT-MS0",
    lane: "MCAT-MS0/P1-U01-support",
    status: "working",
    generatedAt: {
      date: DEFAULT_DATE,
      iso: new Date().toISOString(),
    },
    derivedFrom: [
      `H:/PRISM/${rel(MACHINE_CATALOG_PATH)}`,
      "H:/PRISM/mcp-server/src/utils/calculatorToolHolderCatalog.ts",
      "H:/PRISM/state/shared/MCAT_MS0_VARIABILITY_CENSUS_2026-04-02.json",
      "H:/PRISM/state/shared/MCAT_MS0_LEGALITY_GRAPH_SPEC_2026-04-02.json",
      "H:/PRISM/state/shared/MCAT_MS0_COVERAGE_METRIC_CONTRACT_2026-04-02.json",
    ],
    summary: {
      machineCount: machineProfiles.length,
      holderEligibleMachineCount: machineProfiles.filter((machine) => machine.holderDomains.length > 0).length,
      holderSignatureCount: holderSignatureFamilies.length,
      zeroHolderSignatureCount: holderSignatureFamilies.filter((entry) => entry.holderCoverage.holderCount === 0).length,
      unpublishedControllerCount: machineProfiles.filter((machine) => machine.controller.label === "Controller not published").length,
      unpublishedInterfaceCount: machineProfiles.filter((machine) =>
        (machine.partition === "mill" || machine.partition === "router") && !machine.spindle.interfaceId
        || ["lathe", "swiss", "mill_turn", "vtl"].includes(machine.partition) && !machine.turret.interfaceId
      ).length,
      emptyCoolantCount: machineProfiles.filter((machine) => machine.coolantIds.length === 0).length,
    },
    partitionCounts: summarizeMachinesBy(machineProfiles, (machine) => machine.partition),
    axisTopologyCounts: summarizeMachinesBy(machineProfiles, (machine) => machine.axisTopology),
    controllerCounts: summarizeMachinesBy(machineProfiles, (machine) => machine.controller.label),
    holderSignatureFamilies,
    gapRegistry: buildGapSummary(machineProfiles),
    machines: machineProfiles.map((machine) => ({
      machineId: machine.machineId,
      manufacturerId: machine.manufacturerId,
      manufacturer: machine.manufacturer,
      model: machine.model,
      partition: machine.partition,
      axisTopology: machine.axisTopology,
      controller: machine.controller,
      spindle: machine.spindle,
      turret: machine.turret,
      coolantIds: machine.coolantIds,
      machineCapabilityIds: machine.machineCapabilityIds,
      holderDomains: machine.holderDomains,
      legalityNotes: machine.legalityNotes,
      sourceRecordIds: machine.sourceRecordIds,
    })),
  };

  const jsonPath = path.join(
    SHARED_STATE_DIR,
    `MCAT_MS0_CANONICAL_LEGALITY_EXTRACT_${DEFAULT_DATE}.json`,
  );
  const mdPath = path.join(
    SHARED_STATE_DIR,
    `MCAT_MS0_CANONICAL_LEGALITY_EXTRACT_${DEFAULT_DATE}.md`,
  );

  writeJson(jsonPath, payload);
  writeText(mdPath, buildMarkdownReport(payload));

  if (fs.existsSync(ROADMAP_PATH)) {
    const roadmap = JSON.parse(fs.readFileSync(ROADMAP_PATH, "utf8"));
    const completedUnits = Array.isArray(roadmap.executionStatus?.completedUnits)
      ? roadmap.executionStatus.completedUnits
      : [];
    const hasMvar04 = completedUnits.some((unit) => unit.id === "U-MVAR04");
    if (!hasMvar04) {
      completedUnits.push({
        id: "U-MVAR04",
        title: "Build legality extractors from backend canonical registries",
        completedAt: new Date().toISOString(),
        artifacts: [
          "H:/PRISM/state/shared/MCAT_MS0_CANONICAL_LEGALITY_EXTRACT_2026-04-02.md",
          "H:/PRISM/state/shared/MCAT_MS0_CANONICAL_LEGALITY_EXTRACT_2026-04-02.json",
        ],
      });
    }
    roadmap.executionStatus = {
      ...(roadmap.executionStatus ?? {}),
      completedUnits,
      currentUnit: "U-MVAR05",
      nextUnit: "U-MVAR06",
      session1Status: roadmap.executionStatus?.session1Status ?? "complete",
    };
    writeJson(ROADMAP_PATH, roadmap);
  }

  console.log(JSON.stringify({
    status: "ok",
    jsonPath: `H:/PRISM/${rel(jsonPath)}`,
    markdownPath: `H:/PRISM/${rel(mdPath)}`,
    machineCount: payload.summary.machineCount,
    holderSignatureCount: payload.summary.holderSignatureCount,
    zeroHolderSignatureCount: payload.summary.zeroHolderSignatureCount,
  }, null, 2));
}

await main();
