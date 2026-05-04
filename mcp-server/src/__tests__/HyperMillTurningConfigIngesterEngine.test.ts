/**
 * HyperMillTurningConfigIngesterEngine Test Suite
 * =================================================
 *
 * LATHE-AWARE-HARDEN MS5 U-LAT37
 *
 * @milestone LATHE-AWARE-HARDEN MS5
 * @unit U-LAT37
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { hyperMillTurningConfigIngesterEngine } from "../engines/HyperMillTurningConfigIngesterEngine.js";

const SAMPLE_CYC_TURN = `
; hyperMILL turning cycles
[CYCLE_G71_ROUGHING]
Name=Rough Turning
ID=71
Description=ISO G71 stock removal
P=FirstPass
Q=LastPass
U=XAllowance
W=ZAllowance

[CYCLE_G76_THREAD]
Name=Threading
ID=76
P=CycleMode
Q=FinalDepth
R=DepthRatio
`;

const SAMPLE_STOCK_CSV = `Material Name,ISO Group,Hardness HRC,Density,kc11,Supplier
4140 Steel,P,28,7.85,1800,Precision Metals
Ti-6Al-4V,S,34,4.43,2800,TitanAlloy
Inconel 718,S,36,8.19,2800,HighTemp Co
6061-T6,N,15,2.70,700,Aluminum Inc
`;

describe("HyperMillTurningConfigIngesterEngine", () => {
  // ── parseCycTurnText ──────────────────────────────────────────────────

  describe("parseCycTurnText()", () => {
    it("parses two cycle definitions from sample", () => {
      const r = hyperMillTurningConfigIngesterEngine.parseCycTurnText(SAMPLE_CYC_TURN);
      expect(r.cycles.length).toBe(2);
    });

    it("extracts cycle name + id + description", () => {
      const r = hyperMillTurningConfigIngesterEngine.parseCycTurnText(SAMPLE_CYC_TURN);
      const rough = r.cycles.find((c) => c.id === 71);
      expect(rough).toBeDefined();
      expect(rough!.name).toBe("Rough Turning");
      expect(rough!.description).toContain("G71");
    });

    it("extracts parameters into parameters map", () => {
      const r = hyperMillTurningConfigIngesterEngine.parseCycTurnText(SAMPLE_CYC_TURN);
      const rough = r.cycles.find((c) => c.id === 71);
      expect(rough!.parameters.P).toBe("FirstPass");
      expect(rough!.parameters.U).toBe("XAllowance");
    });

    it("ignores comment lines", () => {
      const r = hyperMillTurningConfigIngesterEngine.parseCycTurnText(SAMPLE_CYC_TURN);
      expect(r.parse_warnings.length).toBe(0);
    });

    it("returns empty cycles for empty input", () => {
      const r = hyperMillTurningConfigIngesterEngine.parseCycTurnText("");
      expect(r.cycles.length).toBe(0);
    });
  });

  // ── parseStocklistText ───────────────────────────────────────────────

  describe("parseStocklistText()", () => {
    it("parses 4 stock entries from CSV", () => {
      const r = hyperMillTurningConfigIngesterEngine.parseStocklistText(SAMPLE_STOCK_CSV);
      expect(r.stock_entries.length).toBe(4);
    });

    it("extracts hardness + kc11 as numbers", () => {
      const r = hyperMillTurningConfigIngesterEngine.parseStocklistText(SAMPLE_STOCK_CSV);
      const ti = r.stock_entries.find((s) => s.name === "Ti-6Al-4V");
      expect(ti?.hardness_hrc).toBe(34);
      expect(ti?.kc11).toBe(2800);
    });

    it("infers material_group from ISO Group column", () => {
      const r = hyperMillTurningConfigIngesterEngine.parseStocklistText(SAMPLE_STOCK_CSV);
      const steel = r.stock_entries.find((s) => s.name === "4140 Steel");
      expect(steel?.material_group).toBe("P");
    });

    it("preserves raw row data", () => {
      const r = hyperMillTurningConfigIngesterEngine.parseStocklistText(SAMPLE_STOCK_CSV);
      expect(r.stock_entries[0]!.raw).toBeDefined();
    });

    it("handles tab-separated input", () => {
      const tsv = `Material Name\tISO Group\tHardness HRC\n4140\tP\t28`;
      const r = hyperMillTurningConfigIngesterEngine.parseStocklistText(tsv);
      expect(r.stock_entries.length).toBe(1);
      expect(r.stock_entries[0]!.material_group).toBe("P");
    });

    it("warns on empty input", () => {
      const r = hyperMillTurningConfigIngesterEngine.parseStocklistText("");
      expect(r.parse_warnings.length).toBeGreaterThan(0);
    });

    it("skips rows with no name", () => {
      const csvBad = `Material Name,ISO Group\n,P\n4140,P\n`;
      const r = hyperMillTurningConfigIngesterEngine.parseStocklistText(csvBad);
      expect(r.stock_entries.length).toBe(1);
    });
  });

  // ── File + directory operations ──────────────────────────────────────

  describe("file + directory operations", () => {
    it("parseCycTurnFile returns empty for missing file", () => {
      const r = hyperMillTurningConfigIngesterEngine.parseCycTurnFile(
        "H:/ghost_cycturn.def"
      );
      expect(r.cycles.length).toBe(0);
      expect(r.parse_warnings.some((w) => /not found/i.test(w))).toBe(true);
    });

    it("parseStocklistFile returns empty for missing file", () => {
      const r = hyperMillTurningConfigIngesterEngine.parseStocklistFile(
        "H:/ghost_stocklist.csv"
      );
      expect(r.stock_entries.length).toBe(0);
    });

    it("ingestDirectory returns warnings for missing dir", () => {
      const r = hyperMillTurningConfigIngesterEngine.ingestDirectory("H:/ghost_dir");
      expect(r.parse_warnings.some((w) => /not found/i.test(w))).toBe(true);
    });
  });

  // ── getStats() ────────────────────────────────────────────────────────

  describe("getStats()", () => {
    it("reports supported file types", () => {
      const stats = hyperMillTurningConfigIngesterEngine.getStats();
      expect(stats.supported_file_types).toContain("cycTurn.def");
      expect(stats.supported_file_types).toContain("Stocklist.csv");
    });

    it("reports inferred stock fields", () => {
      const stats = hyperMillTurningConfigIngesterEngine.getStats();
      expect(stats.stock_fields_inferred).toContain("hardness_hrc");
      expect(stats.stock_fields_inferred).toContain("kc11");
    });
  });

  // ── Dispatcher wiring ────────────────────────────────────────────────
  describe("dispatcher wiring (camDispatcher.ts)", () => {
    const dispatcherPath = path.resolve(
      process.cwd(),
      "src/tools/dispatchers/camDispatcher.ts",
    );

    it("registers all 4 cam_hypermill_turning_config_* enum entries", async () => {
      const src = await fs.readFile(dispatcherPath, "utf-8");
      expect(src).toContain('"cam_hypermill_turning_config_parse_cycturn"');
      expect(src).toContain('"cam_hypermill_turning_config_parse_stocklist"');
      expect(src).toContain('"cam_hypermill_turning_config_ingest_dir"');
      expect(src).toContain('"cam_hypermill_turning_config_stats"');
    });

    it("declares the _hmTurningCfgIngester singleton", async () => {
      const src = await fs.readFile(dispatcherPath, "utf-8");
      expect(src).toMatch(/_hmTurningCfgIngester\s*:\s*any/);
    });

    it("registers a hmTurningCfgIngester case in the lazy getter switch", async () => {
      const src = await fs.readFile(dispatcherPath, "utf-8");
      const re =
        /case\s+"hmTurningCfgIngester"\s*:\s*return\s+_hmTurningCfgIngester\s*\?\?=\s*\(await\s+import\(\s*"\.\.\/\.\.\/engines\/HyperMillTurningConfigIngesterEngine\.js"\s*\)\)\.hyperMillTurningConfigIngesterEngine/;
      expect(re.test(src)).toBe(true);
    });

    it("routes parse_cycturn case to parseCycTurnText with content param", async () => {
      const src = await fs.readFile(dispatcherPath, "utf-8");
      const re = /case\s+"cam_hypermill_turning_config_parse_cycturn"\s*:[\s\S]*?break;/;
      const match = src.match(re);
      expect(match === null).toBe(false);
      const body = match ? match[0] : "";
      expect(body).toContain('getEngine("hmTurningCfgIngester")');
      expect(body).toContain("parseCycTurnText");
      expect(body).toMatch(/params\.content\s*\?\?/);
    });

    it("routes parse_stocklist case to parseStocklistText with content param", async () => {
      const src = await fs.readFile(dispatcherPath, "utf-8");
      const re = /case\s+"cam_hypermill_turning_config_parse_stocklist"\s*:[\s\S]*?break;/;
      const match = src.match(re);
      expect(match === null).toBe(false);
      const body = match ? match[0] : "";
      expect(body).toContain('getEngine("hmTurningCfgIngester")');
      expect(body).toContain("parseStocklistText");
      expect(body).toMatch(/params\.content\s*\?\?/);
    });

    it("routes ingest_dir case to ingestDirectory with snake+camel param normalization", async () => {
      const src = await fs.readFile(dispatcherPath, "utf-8");
      const re = /case\s+"cam_hypermill_turning_config_ingest_dir"\s*:[\s\S]*?break;/;
      const match = src.match(re);
      expect(match === null).toBe(false);
      const body = match ? match[0] : "";
      expect(body).toContain('getEngine("hmTurningCfgIngester")');
      expect(body).toContain("ingestDirectory");
      expect(body).toMatch(/params\.dir_path\s*\?\?\s*params\.dirPath/);
    });

    it("routes stats case to getStats", async () => {
      const src = await fs.readFile(dispatcherPath, "utf-8");
      const re = /case\s+"cam_hypermill_turning_config_stats"\s*:[\s\S]*?break;/;
      const match = src.match(re);
      expect(match === null).toBe(false);
      const body = match ? match[0] : "";
      expect(body).toContain('getEngine("hmTurningCfgIngester")');
      expect(body).toContain("getStats");
    });
  });
});
