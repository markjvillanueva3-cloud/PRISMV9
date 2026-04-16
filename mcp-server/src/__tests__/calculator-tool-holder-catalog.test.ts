import { describe, expect, it } from "vitest";
import {
  buildCalculatorToolHolderCatalog,
  getCalculatorToolHolderCatalog,
  type CalculatorToolHolderCatalogQuery,
} from "../utils/calculatorToolHolderCatalog.js";

type RawHolderRow = Record<string, unknown>;

const SAMPLE_ROWS: RawHolderRow[] = [
  {
    id: "TH-CAT40-ER32-001",
    name: "CAT40 ER32 Collet Chuck L=100mm",
    spindle_interface: "CAT40",
    tool_interface: "ER32",
    type: "ER_COLLET_CHUCK",
    subcategory: "COLLET_CHUCK",
    vendor: "Big Daishowa",
    max_rpm: 15000,
    coolant_through: true,
    gauge_length_mm: 100,
  },
  {
    id: "TH-HSK63-SHRINK-001",
    name: "HSK-A63 Shrink Fit Holder L=120mm",
    spindle_interface: "HSK-A63",
    tool_interface: "HSK-A63",
    type: "SHRINK_FIT",
    subcategory: "HIGH_SPEED",
    vendor: "Haimer",
    max_rpm: 24000,
    coolant_through: true,
    gauge_length_mm: 120,
  },
  {
    id: "TH-CAT40-FACE-001",
    name: "CAT40 Face Mill Arbor 2.5in",
    spindle_interface: "CAT40",
    tool_interface: "",
    type: "FACE_MILL_ARBOR",
    subcategory: "FACE_MILL",
    vendor: "Sandvik",
    max_rpm: 12000,
    coolant_through: false,
  },
  {
    id: "TH-VDI30-OD-001",
    name: "VDI30 OD Turning Holder",
    spindle_interface: "VDI30",
    tool_interface: "",
    type: "OD_TURNING",
    subcategory: "VDI_STATIC",
    vendor: "Dorian",
    max_rpm: 6000,
    coolant_through: false,
  },
  {
    id: "TH-VDI30-AXIAL-001",
    name: "VDI30 Axial Drilling/Milling Ø16",
    spindle_interface: "VDI30",
    tool_interface: "",
    type: "AXIAL_DRILL",
    subcategory: "VDI_AXIAL",
    vendor: "Eppinger",
    max_rpm: 6000,
    coolant_through: true,
  },
  {
    id: "TH-CAPTOC6-LIVE-001",
    name: "Capto-C6 Live Angular Milling Head",
    spindle_interface: "Capto-C6",
    tool_interface: "",
    type: "LIVE_ANGULAR",
    subcategory: "CAPTO_LIVE",
    vendor: "Sandvik",
    max_rpm: 12000,
    coolant_through: true,
  },
  {
    id: "TH-BMT45-BORING-001",
    name: "BMT45 Boring Bar Ø16",
    spindle_interface: "BMT45",
    tool_interface: "",
    type: "BMT_BORING",
    subcategory: "BMT_BORING",
    vendor: "Okuma",
    max_rpm: 5000,
    coolant_through: false,
  },
  {
    id: "TH-BMT45-LIVE-001",
    name: "BMT45 Live Axial ER Ø20",
    spindle_interface: "BMT45",
    tool_interface: "",
    type: "BMT_LIVE_AXIAL",
    subcategory: "BMT_LIVE_AX",
    vendor: "Okuma",
    max_rpm: 6000,
    coolant_through: true,
  },
];

function query(overrides: Partial<CalculatorToolHolderCatalogQuery>): CalculatorToolHolderCatalogQuery {
  return {
    mode: "mill",
    ...overrides,
  };
}

describe("calculator tool holder catalog", () => {
  it("treats CAT40 holders as valid for CAT40 Big Plus machines and honors endmill tool filtering", () => {
    const result = buildCalculatorToolHolderCatalog(
      SAMPLE_ROWS,
      query({
        mode: "mill",
        layoutKind: "magazine",
        spindleConnectionTypeId: "cat40-big-plus",
        toolId: "finisher",
        toolGeometryClass: "square-endmill",
        toolOperation: "finishing",
      }),
    );

    expect(result.map((item) => item.id)).toContain("TH-CAT40-ER32-001");
    expect(result.map((item) => item.id)).not.toContain("TH-HSK63-SHRINK-001");
    expect(result.every((item) => item.compatibleLayoutKinds?.includes("magazine"))).toBe(true);
    expect(result[0]?.brandLabel).toBeDefined();
  });

  it("keeps twin-turret VDI lathes on VDI-compatible turning and live-tool holders", () => {
    const result = buildCalculatorToolHolderCatalog(
      SAMPLE_ROWS,
      query({
        mode: "lathe",
        layoutKind: "turret",
        turretTypeId: "vdi30",
        turretCount: 2,
        liveTooling: true,
        toolId: "turn-drill",
        toolGeometryClass: "drill",
        toolOperation: "boring",
      }),
    );

    expect(result.map((item) => item.id)).toContain("TH-VDI30-AXIAL-001");
    expect(result.map((item) => item.id)).not.toContain("TH-CAPTOC6-LIVE-001");
    expect(result[0]?.holderStyleIds).toEqual(expect.arrayContaining(["machine-standard", "live-tooling", "twin-turret"]));
  });

  it("accepts hyphenated VDI aliases from normalized machine packages", () => {
    const result = buildCalculatorToolHolderCatalog(
      SAMPLE_ROWS,
      query({
        mode: "lathe",
        layoutKind: "turret",
        turretTypeId: "vdi-30",
        turretCount: 1,
        liveTooling: false,
        toolId: "turn-finish",
        toolGeometryClass: "finishing-insert",
        toolOperation: "turning_finish",
      }),
    );

    expect(result.map((item) => item.id)).toContain("TH-VDI30-OD-001");
  });

  it("surfaces CAPTO mill-turn milling-head holders only for milling-head-capable machines", () => {
    const result = buildCalculatorToolHolderCatalog(
      SAMPLE_ROWS,
      query({
        mode: "lathe",
        layoutKind: "turret",
        turretTypeId: "capto-c6",
        turretCount: 1,
        liveTooling: true,
        hasMillingHead: true,
        toolId: "live-mill",
        toolGeometryClass: "live-tool-endmill",
        toolOperation: "boring",
      }),
    );

    expect(result.map((item) => item.id)).toContain("TH-CAPTOC6-LIVE-001");
    const capto = result.find((item) => item.id === "TH-CAPTOC6-LIVE-001");
    expect(capto?.holderStyleIds).toEqual(expect.arrayContaining(["machine-standard", "live-tooling", "milling-head"]));
    expect(capto?.requiresMillingHead).toBe(true);
  });

  it("normalizes BMT45 aliases and keeps BMT boring plus live holders discoverable", () => {
    const boringResult = buildCalculatorToolHolderCatalog(
      SAMPLE_ROWS,
      query({
        mode: "lathe",
        layoutKind: "turret",
        turretTypeId: "bmt-45",
        turretCount: 1,
        liveTooling: true,
        toolId: "turn-bore",
        toolGeometryClass: "boring-bar",
        toolOperation: "boring",
      }),
    );

    expect(boringResult.map((item) => item.id)).toContain("TH-BMT45-BORING-001");

    const liveResult = buildCalculatorToolHolderCatalog(
      SAMPLE_ROWS,
      query({
        mode: "lathe",
        layoutKind: "turret",
        turretTypeId: "bmt-45",
        turretCount: 1,
        liveTooling: true,
        toolId: "live-mill",
        toolGeometryClass: "live-tool-endmill",
        toolOperation: "drilling",
      }),
    );

    expect(liveResult.map((item) => item.id)).toContain("TH-BMT45-LIVE-001");
  });

  it("projects the canonical JM Die VDI baseline into compatible lathe slices", () => {
    const result = buildCalculatorToolHolderCatalog(
      SAMPLE_ROWS,
      query({
        mode: "lathe",
        layoutKind: "turret",
        turretTypeId: "vdi40",
        turretCount: 1,
        liveTooling: false,
        toolId: "turn-finish",
        toolGeometryClass: "finishing-insert",
        toolOperation: "turning_finish",
      }),
    );

    const jmDieVdiBaseline = result.find((item) => item.id === "th-jmd-vdi30-turning-baseline");
    expect(jmDieVdiBaseline).toBeDefined();
    expect(jmDieVdiBaseline?.holderStyleIds).toEqual(expect.arrayContaining(["machine-standard", "rigid-turning"]));
  });

  it("keeps the canonical JM Die CAPTO live-tool seed behind milling-head-capable machines", () => {
    const blocked = buildCalculatorToolHolderCatalog(
      SAMPLE_ROWS,
      query({
        mode: "lathe",
        layoutKind: "turret",
        turretTypeId: "capto-c6",
        turretCount: 1,
        liveTooling: true,
        toolId: "live-mill",
        toolGeometryClass: "live-tool-endmill",
        toolOperation: "drilling",
      }),
    );
    const allowed = buildCalculatorToolHolderCatalog(
      SAMPLE_ROWS,
      query({
        mode: "lathe",
        layoutKind: "turret",
        turretTypeId: "capto-c6",
        turretCount: 1,
        liveTooling: true,
        hasMillingHead: true,
        toolId: "live-mill",
        toolGeometryClass: "live-tool-endmill",
        toolOperation: "drilling",
      }),
    );

    expect(blocked.some((item) => item.id === "th-jmd-regofix-capto-c6-pg25")).toBe(false);
    expect(allowed.some((item) => item.id === "th-jmd-regofix-capto-c6-pg25")).toBe(true);
  });

  it("projects the canonical JM Die System 3R ER-32 seed into sinker EDM slices", () => {
    const result = buildCalculatorToolHolderCatalog(
      SAMPLE_ROWS,
      query({
        mode: "edm",
        layoutKind: "electrode",
      }),
    );

    expect(result.some((item) => item.id === "th-jmd-system3r-er32")).toBe(true);
  });

  it("surfaces real mill holder breadth across CAT40, BT50, and HSK-A63 machine slices", () => {
    const queries = [
      {
        mode: "mill",
        layoutKind: "magazine",
        spindleConnectionTypeId: "cat40",
        toolId: "face-mill",
        toolGeometryClass: "face-mill",
        toolOperation: "roughing",
      },
      {
        mode: "mill",
        layoutKind: "magazine",
        spindleConnectionTypeId: "cat40",
        toolId: "adaptive-endmill",
        toolGeometryClass: "square-endmill",
        toolOperation: "roughing",
      },
      {
        mode: "mill",
        layoutKind: "magazine",
        spindleConnectionTypeId: "bt50",
        toolId: "drill",
        toolGeometryClass: "drill",
        toolOperation: "drilling",
      },
      {
        mode: "mill",
        layoutKind: "magazine",
        spindleConnectionTypeId: "hsk-a63",
        toolId: "finisher",
        toolGeometryClass: "square-endmill",
        toolOperation: "finishing",
      },
    ] satisfies CalculatorToolHolderCatalogQuery[];

    const holders = queries.flatMap((entry) => getCalculatorToolHolderCatalog(entry));
    const brands = new Set(holders.map((item) => item.brandLabel));
    const holderTypes = new Set(holders.map((item) => item.holderType));
    const holderStyles = new Set(holders.flatMap((item) => item.holderStyleIds ?? []));

    expect(holders.length).toBeGreaterThan(1000);
    ["Big Daishowa", "Haimer", "Kennametal", "Rego-Fix", "Sandvik", "Schunk", "Techniks"].forEach((brand) => {
      expect(brands.has(brand)).toBe(true);
    });
    [
      "ANTI_VIBRATION_SLIM",
      "ER_COLLET_CHUCK",
      "FACE_MILL_ARBOR",
      "HYDRAULIC_CHUCK",
      "SHRINK_FIT",
      "SHELL_MILL_ARBOR",
      "WELDON_SIDE_LOCK",
    ].forEach((holderType) => {
      expect(holderTypes.has(holderType)).toBe(true);
    });
    expect(holderStyles.has("machine-standard")).toBe(true);
    expect(holderStyles.has("hydraulic")).toBe(true);
    expect(holderStyles.has("shrink-fit")).toBe(true);
  });

  it("surfaces real lathe holder breadth across VDI, BMT, and CAPTO C6 slices", () => {
    const queries = [
      {
        mode: "lathe",
        layoutKind: "turret",
        turretTypeId: "vdi40",
        turretCount: 1,
        liveTooling: false,
        toolId: "turn-finish",
        toolGeometryClass: "finishing-insert",
        toolOperation: "turning_finish",
      },
      {
        mode: "lathe",
        layoutKind: "turret",
        turretTypeId: "vdi40",
        turretCount: 1,
        liveTooling: false,
        toolId: "turn-bore",
        toolGeometryClass: "boring-bar",
        toolOperation: "boring",
      },
      {
        mode: "lathe",
        layoutKind: "turret",
        turretTypeId: "bmt65",
        turretCount: 1,
        liveTooling: true,
        toolId: "live-mill",
        toolGeometryClass: "live-tool-endmill",
        toolOperation: "drilling",
      },
      {
        mode: "lathe",
        layoutKind: "turret",
        turretTypeId: "capto-c6",
        turretCount: 1,
        liveTooling: true,
        toolId: "turn-finish",
        toolGeometryClass: "finishing-insert",
        toolOperation: "turning_finish",
      },
      {
        mode: "lathe",
        layoutKind: "turret",
        turretTypeId: "capto-c6",
        turretCount: 1,
        liveTooling: true,
        hasMillingHead: true,
        toolId: "live-mill",
        toolGeometryClass: "live-tool-endmill",
        toolOperation: "drilling",
      },
    ] satisfies CalculatorToolHolderCatalogQuery[];

    const holders = queries.flatMap((entry) => getCalculatorToolHolderCatalog(entry));
    const brands = new Set(holders.map((item) => item.brandLabel));
    const holderTypes = new Set(holders.map((item) => item.holderType));
    const holderStyles = new Set(holders.flatMap((item) => item.holderStyleIds ?? []));

    expect(holders.length).toBeGreaterThan(80);
    ["Algra", "Baruffaldi", "Benz", "Dorian", "Eppinger", "Heimatec", "Kennametal", "Sandvik", "Sauter", "Seco"].forEach((brand) => {
      expect(brands.has(brand)).toBe(true);
    });
    [
      "OD_TURNING",
      "BORING_BAR",
      "BMT_LIVE_AXIAL",
      "BMT_LIVE_RADIAL",
      "CAPTO_BORING",
      "CAPTO_ER",
      "CAPTO_HYDRO",
      "CAPTO_TURN",
    ].forEach((holderType) => {
      expect(holderTypes.has(holderType)).toBe(true);
    });
    expect(holderStyles.has("rigid-turning")).toBe(true);
    expect(holderStyles.has("live-tooling")).toBe(true);
    expect(holderStyles.has("milling-head")).toBe(true);
    expect(holderStyles.has("twin-turret")).toBe(true);
  });

  it("does not force CAPTO turning holders to masquerade as milling-head-only holders", () => {
    const turning = getCalculatorToolHolderCatalog({
      mode: "lathe",
      layoutKind: "turret",
      turretTypeId: "capto-c6",
      turretCount: 1,
      liveTooling: true,
      toolId: "turn-finish",
      toolGeometryClass: "finishing-insert",
      toolOperation: "turning_finish",
    });
    const captoTurning = turning.filter((item) => item.holderType === "CAPTO_TURN" || item.holderType === "CAPTO_BORING");

    expect(captoTurning.length).toBeGreaterThan(0);
    expect(captoTurning.some((item) => item.requiresMillingHead)).toBe(false);
    expect(captoTurning.some((item) => item.holderStyleIds?.includes("rigid-turning"))).toBe(true);
  });

  it("keeps CAPTO live milling holders gated behind a milling head", () => {
    const blocked = getCalculatorToolHolderCatalog({
      mode: "lathe",
      layoutKind: "turret",
      turretTypeId: "capto-c6",
      turretCount: 1,
      liveTooling: true,
      toolId: "live-mill",
      toolGeometryClass: "live-tool-endmill",
      toolOperation: "drilling",
    });
    const allowed = getCalculatorToolHolderCatalog({
      mode: "lathe",
      layoutKind: "turret",
      turretTypeId: "capto-c6",
      turretCount: 1,
      liveTooling: true,
      hasMillingHead: true,
      toolId: "live-mill",
      toolGeometryClass: "live-tool-endmill",
      toolOperation: "drilling",
    });

    expect(blocked).toHaveLength(0);
    expect(allowed.some((item) => item.holderType === "CAPTO_ER")).toBe(true);
    expect(allowed.some((item) => item.holderType === "CAPTO_HYDRO")).toBe(true);
    expect(allowed.every((item) => item.requiresMillingHead)).toBe(true);
  });
});
