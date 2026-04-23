import { existsSync } from "node:fs";

import { toolHolderDatabaseEngine } from "../engines/ToolHolderDatabaseEngine.js";
import { shopToolLibraryEngine } from "../engines/ShopToolLibraryEngine.js";
import { JM_DIE_COMPANY, JM_DIE_SOURCE_ROOTS } from "../data/jm-die-profile.js";

type JMDieCalculatorMachineMode = "mill" | "lathe" | "edm";
type JMDieCalculatorLayoutKind = "magazine" | "turret" | "electrode";

export interface JMDieSelectorCalculatorCompatibility {
  mode: JMDieCalculatorMachineMode;
  brandId: string;
  brandLabel: string;
  holderStyleId: string;
  holderStyleIds?: string[];
  holderType?: string;
  holderSubcategory?: string;
  toolInterface?: string;
  compatibleLayoutKinds?: JMDieCalculatorLayoutKind[];
  compatibleSpindleConnectionTypeIds?: string[];
  compatibleTurretTypeIds?: string[];
  requiresLiveTooling?: boolean;
  requiresMillingHead?: boolean;
  minTurretCount?: number;
  maxTurretCount?: number;
  coolantThrough?: boolean;
  maxRpm?: number;
}

export interface JMDieSelectorToolholderSeed {
  id: string;
  label: string;
  style: string;
  gageLength: string;
  rigidity: string;
  note: string;
  calculator?: JMDieSelectorCalculatorCompatibility;
}

export interface JMDieSelectorToolingPackageSeed {
  id: string;
  label: string;
  coverage: string;
  note: string;
  packageCost: number;
}

export interface JMDieSelectorStockProfileSeed {
  id: string;
  label: string;
  material: string;
  size: string;
  source: string;
  marketPrice: number;
  logisticsCost: number;
  volatility: "low" | "medium" | "high";
}

export interface JMDieSelectorSeedSummary {
  shop_id: string;
  toolholder_count: number;
  tooling_package_count: number;
  stock_profile_count: number;
  live_tool_count: number;
  live_holder_count: number;
  tooling_categories: string[];
  tool_holders_root: string;
  tooling_root: string;
  materials_root: string;
  tool_holders_root_present: boolean;
  tooling_root_present: boolean;
  materials_root_present: boolean;
}

export interface JMDieSelectorCatalog {
  toolholders: JMDieSelectorToolholderSeed[];
  toolingPackages: JMDieSelectorToolingPackageSeed[];
  stockProfiles: JMDieSelectorStockProfileSeed[];
  summary: JMDieSelectorSeedSummary;
}

function getHolderUsageCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const tool of shopToolLibraryEngine.loadAll()) {
    const label = (tool.holderDescription ?? "").trim();
    if (!label || label.toUpperCase() === "UNKNOWN") {
      continue;
    }
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return counts;
}

function describeStandard(standardId: string): string {
  const spec = toolHolderDatabaseEngine.get(standardId);
  if (!spec) {
    return "";
  }

  const parts = [spec.standard];
  if (typeof spec.max_rpm === "number" && Number.isFinite(spec.max_rpm)) {
    parts.push(`${spec.max_rpm.toLocaleString()} max RPM`);
  }
  if (spec.use_case) {
    parts.push(spec.use_case.replace(/_/g, " "));
  }
  return parts.join(", ");
}

function getToolingSummary() {
  return shopToolLibraryEngine.getSummary();
}

function buildToolholders(holderCounts: Map<string, number>): JMDieSelectorToolholderSeed[] {
  const er32Count = holderCounts.get("BIG DAISHOWA ER-32-4NL") ?? 0;
  const captoCount = holderCounts.get("REGO-FIX CAPTO C6 PG25 X 120MM") ?? 0;
  const er16Count = holderCounts.get("BIG DAISHOWA MEGAER16-3NL") ?? 0;

  return [
    {
      id: "th-jmd-big-er32-4nl",
      label: "BIG DAISHOWA ER-32-4NL",
      style: "ER32 collet chuck",
      gageLength: "4NL reach",
      rigidity: "High",
      note: `${er32Count} shop-proven tools reference this holder in the JM Die Fusion exports. ${describeStandard("ER32")}.`,
      calculator: {
        mode: "mill",
        brandId: "big-daishowa",
        brandLabel: "Big Daishowa",
        holderStyleId: "hydraulic",
        holderStyleIds: ["machine-standard", "hydraulic"],
        holderType: "ER_COLLET_CHUCK",
        holderSubcategory: "JM_DIE_ER32_SEED",
        toolInterface: "ER32",
        compatibleLayoutKinds: ["magazine"],
        compatibleSpindleConnectionTypeIds: ["cat40-big-plus"],
        coolantThrough: true,
      },
    },
    {
      id: "th-jmd-regofix-capto-c6-pg25",
      label: "REGO-FIX CAPTO C6 PG25 x 120mm",
      style: "Capto C6 collet chuck",
      gageLength: "120mm",
      rigidity: "High",
      note: `${captoCount} live-tooling assemblies reference this holder today. ${describeStandard("CAPTO-C6")}.`,
      calculator: {
        mode: "lathe",
        brandId: "rego-fix",
        brandLabel: "Rego-Fix",
        holderStyleId: "milling-head",
        holderStyleIds: ["machine-standard", "live-tooling", "milling-head"],
        holderType: "CAPTO_ER",
        holderSubcategory: "JM_DIE_CAPTO_PG25",
        toolInterface: "CAPTO C6",
        compatibleLayoutKinds: ["turret"],
        compatibleTurretTypeIds: ["capto-c6"],
        requiresLiveTooling: true,
        requiresMillingHead: true,
        coolantThrough: true,
      },
    },
    {
      id: "th-jmd-big-er16-3nl",
      label: "BIG DAISHOWA MEGAER16-3NL",
      style: "ER16 collet chuck",
      gageLength: "3NL reach",
      rigidity: "High",
      note: `${er16Count} high-speed tools in the JM Die library use this holder. ${describeStandard("ER16")}.`,
      calculator: {
        mode: "mill",
        brandId: "big-daishowa",
        brandLabel: "Big Daishowa",
        holderStyleId: "shrink-fit",
        holderStyleIds: ["machine-standard", "shrink-fit"],
        holderType: "ER_COLLET_CHUCK",
        holderSubcategory: "JM_DIE_ER16_SEED",
        toolInterface: "ER16",
        compatibleLayoutKinds: ["magazine"],
        compatibleSpindleConnectionTypeIds: ["cat40-big-plus"],
        coolantThrough: true,
      },
    },
    {
      id: "th-jmd-vdi30-turning-baseline",
      label: "VDI30 Turning Baseline",
      style: "VDI turret holder",
      gageLength: "Lathe turret standard",
      rigidity: "High",
      note: `Canonical static-turning baseline for the JM Die Okuma lathe family while folder-backed holder ingest is still pending. ${describeStandard("VDI30")}.`,
      calculator: {
        mode: "lathe",
        brandId: "jm-die",
        brandLabel: "JM Die",
        holderStyleId: "rigid-turning",
        holderStyleIds: ["machine-standard", "rigid-turning"],
        holderType: "OD_TURNING",
        holderSubcategory: "JM_DIE_VDI_BASELINE",
        toolInterface: "VDI30",
        compatibleLayoutKinds: ["turret"],
        compatibleTurretTypeIds: ["vdi30", "vdi40", "vdi50", "vdi60", "vdi80"],
      },
    },
    {
      id: "th-jmd-system3r-er32",
      label: "System 3R ER-32",
      style: "EDM electrode system",
      gageLength: "System 3R preset",
      rigidity: "High",
      note: "Canonical electrode-prep holder for the Roku-Roku to sinker EDM bridge while the dedicated Tool Holders folder is still empty.",
      calculator: {
        mode: "edm",
        brandId: "three-r",
        brandLabel: "System 3R",
        holderStyleId: "three-r",
        holderStyleIds: ["machine-standard", "three-r"],
        holderType: "EDM_ELECTRODE",
        holderSubcategory: "JM_DIE_SYSTEM3R_ER32",
        toolInterface: "System 3R ER-32",
        compatibleLayoutKinds: ["electrode"],
      },
    },
  ];
}

function buildToolingPackages(): JMDieSelectorToolingPackageSeed[] {
  const summary = getToolingSummary();
  const turningCount = summary.byCategory.turning ?? 0;
  const boringCount = (summary.byCategory.boring_finish ?? 0) + (summary.byCategory.boring_rough ?? 0);
  const drillCount =
    (summary.byCategory.insert_drill_130 ?? 0)
    + (summary.byCategory.insert_drill_180 ?? 0)
    + (summary.byCategory.twist_drill ?? 0);
  const endmillCount = summary.byCategory.endmill ?? 0;

  return [
    {
      id: "tp-jmd-lathe-production",
      label: "JM Die Lathe Production Package",
      coverage: "Turning, grooving, threading, and live-tool support",
      note: `Anchored to ${turningCount} shop-proven turning tools plus the seeded VDI and Capto holder stack for the Okuma lathe family.`,
      packageCost: 980,
    },
    {
      id: "tp-jmd-holemaking-boring",
      label: "JM Die Holemaking + Boring Package",
      coverage: "Insert drilling, twist drilling, and rough/finish boring",
      note: `Built from ${boringCount} boring tools and ${drillCount} drill tools already exported from the JM Die Fusion library.`,
      packageCost: 1850,
    },
    {
      id: "tp-jmd-mill-electrode",
      label: "JM Die Mill + Electrode Package",
      coverage: "Small-diameter milling, finishing, and electrode prep",
      note: `Uses ${endmillCount} shop-proven end mills with the ER16/ER32 holder stack that currently drives fine-detail and electrode work.`,
      packageCost: 620,
    },
    {
      id: "tp-jmd-release-baseline",
      label: "JM Die Release Baseline",
      coverage: "Cross-machine release baseline",
      note: `Uses all ${summary.totalTools} shop-proven tools as the seeded release baseline while folder-backed tooling ingest is still being built.`,
      packageCost: 2400,
    },
  ];
}

function buildStockProfiles(): JMDieSelectorStockProfileSeed[] {
  return [
    {
      id: "stk-jmd-a2-plate",
      label: "A2 Tool Steel Plate",
      material: "A2 tool steel",
      size: "1.5 x 4 x 8 in plate",
      source: "JM Die seeded material baseline (Materials folder pending)",
      marketPrice: 118,
      logisticsCost: 18,
      volatility: "medium",
    },
    {
      id: "stk-jmd-m2-round",
      label: "M2 Punch Blank",
      material: "M2 / PM high-speed steel",
      size: "1.25 in round x 12 in",
      source: "JM Die punch program baseline",
      marketPrice: 168,
      logisticsCost: 22,
      volatility: "medium",
    },
    {
      id: "stk-jmd-carbide-blank",
      label: "Carbide Die Blank",
      material: "Tungsten carbide blank",
      size: "1.5 x 1.5 x 3 in",
      source: "JM Die die insert baseline",
      marketPrice: 265,
      logisticsCost: 28,
      volatility: "high",
    },
    {
      id: "stk-jmd-ofhc-copper",
      label: "OFHC Copper Electrode Stock",
      material: "OFHC copper",
      size: "1 x 2 x 6 in block",
      source: "JM Die sinker EDM electrode baseline",
      marketPrice: 96,
      logisticsCost: 14,
      volatility: "medium",
    },
    {
      id: "stk-jmd-graphite-block",
      label: "POCO Graphite Electrode Block",
      material: "EDM graphite",
      size: "2 x 2 x 6 in block",
      source: "JM Die graphite electrode baseline",
      marketPrice: 58,
      logisticsCost: 12,
      volatility: "medium",
    },
  ];
}

export function getJMDieSelectorCatalog(): JMDieSelectorCatalog {
  const holderCounts = getHolderUsageCounts();
  const toolholders = buildToolholders(holderCounts);
  const toolingPackages = buildToolingPackages();
  const stockProfiles = buildStockProfiles();
  const toolingSummary = getToolingSummary();

  return {
    toolholders,
    toolingPackages,
    stockProfiles,
    summary: {
      shop_id: JM_DIE_COMPANY.id,
      toolholder_count: toolholders.length,
      tooling_package_count: toolingPackages.length,
      stock_profile_count: stockProfiles.length,
      live_tool_count: toolingSummary.totalTools,
      live_holder_count: holderCounts.size,
      tooling_categories: toolingSummary.categories,
      tool_holders_root: JM_DIE_SOURCE_ROOTS.tool_holders_root,
      tooling_root: JM_DIE_SOURCE_ROOTS.tooling_root,
      materials_root: JM_DIE_SOURCE_ROOTS.materials_root,
      tool_holders_root_present: existsSync(JM_DIE_SOURCE_ROOTS.tool_holders_root),
      tooling_root_present: existsSync(JM_DIE_SOURCE_ROOTS.tooling_root),
      materials_root_present: existsSync(JM_DIE_SOURCE_ROOTS.materials_root),
    },
  };
}

export function getJMDieSelectorSeedSummary(): JMDieSelectorSeedSummary {
  return getJMDieSelectorCatalog().summary;
}
