/**
 * MonolithStockPositionsDatabaseEngine tests.
 * JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-STOCK-POSITIONS-LOADER.
 */

import { describe, it, expect } from "vitest";
import {
  MonolithStockPositionsDatabaseEngine,
  monolithStockPositionsDatabaseEngine,
} from "../engines/MonolithStockPositionsDatabaseEngine.js";

const engine = monolithStockPositionsDatabaseEngine;

const UNIT_STOCK = { minX: 0, maxX: 100, minY: 0, maxY: 100, minZ: 0, maxZ: 50 };

describe("MonolithStockPositionsDatabaseEngine — data integrity", () => {
  it("exports a singleton matching the class", () => {
    expect(engine).toBeInstanceOf(MonolithStockPositionsDatabaseEngine);
  });

  it("stats() returns 9 top + 9 bottom = 18 total", () => {
    const s = engine.stats();
    expect(s.top).toBe(9);
    expect(s.bottom).toBe(9);
    expect(s.total).toBe(18);
  });

  it("listPositions returns 18 records", () => {
    expect(engine.listPositions()).toHaveLength(18);
  });

  it("listTop returns 9 records all with face='top' and z=1.0", () => {
    const top = engine.listTop();
    expect(top).toHaveLength(9);
    expect(top.every((p) => p.face === "top")).toBe(true);
    expect(top.every((p) => p.z === 1.0)).toBe(true);
  });

  it("listBottom returns 9 records all with face='bottom' and z=0", () => {
    const bot = engine.listBottom();
    expect(bot).toHaveLength(9);
    expect(bot.every((p) => p.face === "bottom")).toBe(true);
    expect(bot.every((p) => p.z === 0)).toBe(true);
  });

  it("TOP_CENTER has normalized (0.5, 0.5, 1.0)", () => {
    const p = engine.getPosition("TOP_CENTER");
    expect(p?.x).toBe(0.5);
    expect(p?.y).toBe(0.5);
    expect(p?.z).toBe(1.0);
  });

  it("BOTTOM_LEFT_FRONT has normalized (0, 0, 0) — origin corner", () => {
    const p = engine.getPosition("BOTTOM_LEFT_FRONT");
    expect(p?.x).toBe(0);
    expect(p?.y).toBe(0);
    expect(p?.z).toBe(0);
  });

  it("TOP_RIGHT_BACK has normalized (1.0, 1.0, 1.0) — far corner", () => {
    const p = engine.getPosition("TOP_RIGHT_BACK");
    expect(p?.x).toBe(1.0);
    expect(p?.y).toBe(1.0);
    expect(p?.z).toBe(1.0);
  });

  it("every top position has a matching bottom (8 corner/face pairs)", () => {
    for (const top of engine.listTop()) {
      const bottomId = top.id.replace(/^TOP_/, "BOTTOM_");
      const bot = engine.getPosition(bottomId);
      expect(bot).not.toBeNull();
      expect(bot?.x).toBe(top.x);
      expect(bot?.y).toBe(top.y);
    }
  });
});

describe("MonolithStockPositionsDatabaseEngine — getPosition()", () => {
  it("getPosition returns top record with face='top'", () => {
    expect(engine.getPosition("TOP_CENTER")?.face).toBe("top");
  });

  it("getPosition returns bottom record with face='bottom'", () => {
    expect(engine.getPosition("BOTTOM_CENTER")?.face).toBe("bottom");
  });

  it("getPosition returns null on unknown name", () => {
    expect(engine.getPosition("ZZZ_UNKNOWN")).toBeNull();
  });

  it("getPosition returns null on empty / non-string", () => {
    expect(engine.getPosition("")).toBeNull();
    expect(engine.getPosition(null as unknown as string)).toBeNull();
    expect(engine.getPosition(123 as unknown as string)).toBeNull();
  });
});

describe("MonolithStockPositionsDatabaseEngine — resolve()", () => {
  it("TOP_CENTER in 100x100x50 stock → (50, 50, 50)", () => {
    const abs = engine.resolve("TOP_CENTER", UNIT_STOCK);
    expect(abs).toEqual({ x: 50, y: 50, z: 50 });
  });

  it("BOTTOM_LEFT_FRONT (origin corner) → (minX, minY, minZ)", () => {
    const abs = engine.resolve("BOTTOM_LEFT_FRONT", UNIT_STOCK);
    expect(abs).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("TOP_RIGHT_BACK (far corner) → (maxX, maxY, maxZ)", () => {
    const abs = engine.resolve("TOP_RIGHT_BACK", UNIT_STOCK);
    expect(abs).toEqual({ x: 100, y: 100, z: 50 });
  });

  it("resolve handles non-origin stock bounds", () => {
    const bounds = { minX: 10, maxX: 30, minY: 5, maxY: 25, minZ: 0, maxZ: 12 };
    const abs = engine.resolve("TOP_CENTER", bounds);
    expect(abs?.x).toBe(20); // 10 + (30-10)*0.5
    expect(abs?.y).toBe(15); // 5 + (25-5)*0.5
    expect(abs?.z).toBe(12); // 0 + 12*1.0
  });

  it("resolve returns null on unknown position", () => {
    expect(engine.resolve("ZZZ", UNIT_STOCK)).toBeNull();
  });

  it("resolve returns null on null bounds", () => {
    expect(engine.resolve("TOP_CENTER", null)).toBeNull();
  });

  it("resolve returns null on missing bounds fields", () => {
    expect(engine.resolve("TOP_CENTER", { minX: 0 } as unknown as Parameters<typeof engine.resolve>[1])).toBeNull();
  });

  it("resolve returns null when a bounds field is NaN (R12 adversarial)", () => {
    const bounds = { minX: 0, maxX: NaN, minY: 0, maxY: 100, minZ: 0, maxZ: 50 };
    expect(engine.resolve("TOP_CENTER", bounds)).toBeNull();
  });

  it("resolve returns null when a bounds field is non-number", () => {
    const bounds = { minX: 0, maxX: "100", minY: 0, maxY: 100, minZ: 0, maxZ: 50 };
    expect(engine.resolve("TOP_CENTER", bounds as unknown as Parameters<typeof engine.resolve>[1])).toBeNull();
  });
});

describe("MonolithStockPositionsDatabaseEngine — descriptions", () => {
  it("TOP_CENTER description is 'Top center'", () => {
    expect(engine.getPosition("TOP_CENTER")?.desc).toBe("Top center");
  });

  it("BOTTOM_LEFT_FRONT description matches monolith", () => {
    expect(engine.getPosition("BOTTOM_LEFT_FRONT")?.desc).toBe("Bottom left front corner");
  });
});
