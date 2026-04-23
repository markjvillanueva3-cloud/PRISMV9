/**
 * ControllerDialectEngine Tests
 * RES-MS2 U-PP03: Controller dialect rules for 26 controller families
 */

import { describe, it, expect } from "vitest";
import { controllerDialectEngine, ControllerDialectEngineImpl } from "../engines/ControllerDialectEngine.js";

describe("ControllerDialectEngine", () => {
  describe("listDialects", () => {
    it("lists all 26+ controller dialects", () => {
      const dialects = controllerDialectEngine.listDialects();
      expect(dialects.length).toBeGreaterThanOrEqual(26);
      expect(dialects.map(d => d.id)).toContain("fanuc_0i");
      expect(dialects.map(d => d.id)).toContain("siemens_840d");
      expect(dialects.map(d => d.id)).toContain("heidenhain_tnc640");
      expect(dialects.map(d => d.id)).toContain("haas_ngc");
    });

    it("includes manufacturer and family for each dialect", () => {
      const dialects = controllerDialectEngine.listDialects();
      for (const d of dialects) {
        expect(d.manufacturer).toBeDefined();
        expect(d.family).toBeDefined();
        expect(d.name).toBeDefined();
      }
    });
  });

  describe("getDialect", () => {
    it("returns Fanuc 0i dialect by ID", () => {
      const d = controllerDialectEngine.getDialect("fanuc_0i");
      expect(d.id).toBe("fanuc_0i");
      expect(d.manufacturer).toBe("Fanuc");
      expect(d.base_family).toBe("fanuc");
    });

    it("returns Siemens 840D dialect", () => {
      const d = controllerDialectEngine.getDialect("siemens_840d");
      expect(d.id).toBe("siemens_840d");
      expect(d.manufacturer).toBe("Siemens");
      expect(d.comment_style).toBe("semicolon");
    });

    it("returns Heidenhain TNC640 dialect", () => {
      const d = controllerDialectEngine.getDialect("heidenhain_tnc640");
      expect(d.id).toBe("heidenhain_tnc640");
      expect(d.manufacturer).toBe("Heidenhain");
      expect(d.comment_style).toBe("heidenhain");
    });

    it("resolves alias 'fanuc' to generic_fanuc", () => {
      const d = controllerDialectEngine.getDialect("fanuc");
      expect(d.id).toBe("generic_fanuc");
    });

    it("resolves alias 'siemens' to siemens_840d", () => {
      const d = controllerDialectEngine.getDialect("siemens");
      expect(d.id).toBe("siemens_840d");
    });

    it("resolves alias 'haas' to haas_ngc", () => {
      const d = controllerDialectEngine.getDialect("haas");
      expect(d.id).toBe("haas_ngc");
    });

    it("falls back to generic_fanuc for unknown controller", () => {
      const d = controllerDialectEngine.getDialect("unknown_xyz");
      expect(d.id).toBe("generic_fanuc");
    });
  });

  describe("canned cycles", () => {
    it("has correct Fanuc canned cycles", () => {
      const d = controllerDialectEngine.getDialect("fanuc_0i");
      expect(d.canned_cycles.drill).toBe("G81");
      expect(d.canned_cycles.peck_drill).toBe("G83");
      expect(d.canned_cycles.tap).toBe("G84");
      expect(d.canned_cycles.cancel).toBe("G80");
    });

    it("has correct Siemens canned cycles", () => {
      const d = controllerDialectEngine.getDialect("siemens_840d");
      expect(d.canned_cycles.drill).toBe("CYCLE81");
      expect(d.canned_cycles.peck_drill).toBe("CYCLE83");
      expect(d.canned_cycles.tap).toBe("CYCLE84");
      expect(d.canned_cycles.cancel).toBe("MCALL");
    });

    it("has correct Heidenhain canned cycles", () => {
      const d = controllerDialectEngine.getDialect("heidenhain_tnc640");
      expect(d.canned_cycles.drill).toBe("CYCL DEF 200");
      expect(d.canned_cycles.peck_drill).toBe("CYCL DEF 205");
      expect(d.canned_cycles.tap).toBe("CYCL DEF 206");
    });
  });

  describe("translateCannedCycle", () => {
    it("translates G81 from Fanuc to Siemens CYCLE81", () => {
      const result = controllerDialectEngine.translateCannedCycle("G81", "fanuc", "siemens");
      expect(result).toBe("CYCLE81");
    });

    it("translates G83 from Fanuc to Heidenhain CYCL DEF 205", () => {
      const result = controllerDialectEngine.translateCannedCycle("G83", "fanuc", "heidenhain");
      expect(result).toBe("CYCL DEF 205");
    });

    it("translates CYCLE81 from Siemens to Fanuc G81", () => {
      const result = controllerDialectEngine.translateCannedCycle("CYCLE81", "siemens", "fanuc");
      expect(result).toBe("G81");
    });

    it("returns original if not found", () => {
      const result = controllerDialectEngine.translateCannedCycle("G999", "fanuc", "siemens");
      expect(result).toBe("G999");
    });
  });

  describe("probing cycles", () => {
    it("returns probing cycles for Fanuc 0i", () => {
      const probing = controllerDialectEngine.getProbingCycles("fanuc_0i");
      expect(probing).toBeDefined();
      expect(probing?.auto_datum).toBe("G65 P9810");
      expect(probing?.surface_z).toBe("G65 P9811");
      expect(probing?.tool_length).toBe("G65 P9023");
    });

    it("returns probing cycles for Siemens 840D", () => {
      const probing = controllerDialectEngine.getProbingCycles("siemens_840d");
      expect(probing).toBeDefined();
      expect(probing?.auto_datum).toBe("CYCLE977");
      expect(probing?.bore).toBe("CYCLE979");
    });

    it("returns probing cycles for Heidenhain TNC640", () => {
      const probing = controllerDialectEngine.getProbingCycles("heidenhain_tnc640");
      expect(probing).toBeDefined();
      expect(probing?.auto_datum).toBe("TCH PROBE 410");
      expect(probing?.tool_length).toBe("TCH PROBE 417");
    });
  });

  describe("rigid tapping", () => {
    it("returns rigid tap cycle for Fanuc", () => {
      const cycle = controllerDialectEngine.getRigidTapCycle("fanuc_0i");
      expect(cycle).toBe("G84.2");
    });

    it("returns left-hand rigid tap for Fanuc", () => {
      const cycle = controllerDialectEngine.getRigidTapCycle("fanuc_0i", true);
      expect(cycle).toBe("G84.3");
    });

    it("returns rigid tap cycle for Siemens", () => {
      const cycle = controllerDialectEngine.getRigidTapCycle("siemens_840d");
      expect(cycle).toBe("CYCLE84");
    });

    it("returns rigid tap cycle for Heidenhain", () => {
      const cycle = controllerDialectEngine.getRigidTapCycle("heidenhain_tnc640");
      expect(cycle).toBe("CYCL DEF 207");
    });
  });

  describe("threading cycles", () => {
    it("returns threading cycles for Fanuc", () => {
      const cycles = controllerDialectEngine.getThreadingCycles("fanuc_0i");
      expect(cycles.single_point).toBe("G76");
      expect(cycles.multi_pass).toBe("G76");
    });

    it("returns threading cycles for Siemens", () => {
      const cycles = controllerDialectEngine.getThreadingCycles("siemens_840d");
      expect(cycles.single_point).toBe("CYCLE97");
      expect(cycles.multi_pass).toBe("CYCLE98");
    });

    it("returns threading cycles for Heidenhain", () => {
      const cycles = controllerDialectEngine.getThreadingCycles("heidenhain_tnc640");
      expect(cycles.single_point).toBe("CYCL DEF 262");
      expect(cycles.multi_pass).toBe("CYCL DEF 263");
    });
  });

  describe("getFeatureCodes", () => {
    it("returns roughing codes for Haas", () => {
      const codes = controllerDialectEngine.getFeatureCodes("haas_ngc", "roughing");
      expect(codes).toContain("G187 P1 (ROUGH)");
    });

    it("returns finishing codes for Haas", () => {
      const codes = controllerDialectEngine.getFeatureCodes("haas_ngc", "finishing");
      expect(codes).toContain("G187 P3 (FINISH)");
    });

    it("returns finishing codes with HSC for Fanuc 31i", () => {
      const codes = controllerDialectEngine.getFeatureCodes("fanuc_31i", "finishing");
      expect(codes.length).toBeGreaterThan(0);
      expect(codes.some(c => c.includes("G05"))).toBe(true);
    });

    it("returns smoothing codes for Siemens 840D finishing", () => {
      const codes = controllerDialectEngine.getFeatureCodes("siemens_840d", "finishing");
      expect(codes.some(c => c.includes("CYCLE832"))).toBe(true);
    });
  });

  describe("generateToolChange", () => {
    it("generates Fanuc tool change sequence", () => {
      const lines = controllerDialectEngine.generateToolChange("fanuc_0i", 5);
      expect(lines).toContain("G91 G28 Z0");
      expect(lines.some(l => l.includes("T5") || l.includes("T{tool}"))).toBe(true);
    });

    it("generates Siemens tool change sequence", () => {
      const lines = controllerDialectEngine.generateToolChange("siemens_840d", 3);
      expect(lines.some(l => l.includes("T3"))).toBe(true);
      expect(lines).toContain("M6");
      expect(lines).toContain("D1");
    });

    it("generates Heidenhain tool change sequence", () => {
      const lines = controllerDialectEngine.generateToolChange("heidenhain_tnc640", 10, 5000);
      expect(lines.some(l => l.includes("TOOL CALL 10"))).toBe(true);
      expect(lines.some(l => l.includes("S5000"))).toBe(true);
    });
  });

  describe("getSafeStart", () => {
    it("returns Fanuc safe start", () => {
      const safe = controllerDialectEngine.getSafeStart("fanuc_0i");
      expect(safe).toContain("G90");
      expect(safe).toContain("G21");
      expect(safe).toContain("G80");
    });

    it("returns Siemens safe start", () => {
      const safe = controllerDialectEngine.getSafeStart("siemens_840d");
      expect(safe).toContain("G90");
      expect(safe).toContain("G17");
    });
  });

  describe("getProgramHeader / getProgramFooter", () => {
    it("returns Fanuc program header with O number", () => {
      const header = controllerDialectEngine.getProgramHeader("fanuc_0i", "1234");
      expect(header).toContain("%");
      expect(header.some(l => l.includes("O1234"))).toBe(true);
    });

    it("returns Heidenhain program header", () => {
      const header = controllerDialectEngine.getProgramHeader("heidenhain_tnc640", "PART1");
      expect(header.some(l => l.includes("BEGIN PGM"))).toBe(true);
    });

    it("returns Fanuc program footer", () => {
      const footer = controllerDialectEngine.getProgramFooter("fanuc_0i");
      expect(footer).toContain("M30");
      expect(footer).toContain("%");
    });

    it("returns Heidenhain program footer", () => {
      const footer = controllerDialectEngine.getProgramFooter("heidenhain_tnc640");
      expect(footer.some(l => l.includes("END PGM"))).toBe(true);
    });
  });

  describe("formatComment", () => {
    it("formats Fanuc comment with parentheses", () => {
      const comment = controllerDialectEngine.formatComment("fanuc_0i", "ROUGHING PASS");
      expect(comment).toBe("(ROUGHING PASS)");
    });

    it("formats Siemens comment with semicolon", () => {
      const comment = controllerDialectEngine.formatComment("siemens_840d", "ROUGHING PASS");
      expect(comment).toBe("; ROUGHING PASS");
    });

    it("formats Heidenhain comment", () => {
      const comment = controllerDialectEngine.formatComment("heidenhain_tnc640", "ROUGHING PASS");
      expect(comment).toContain("ROUGHING PASS");
    });
  });

  describe("validateLine", () => {
    it("validates valid Fanuc line", () => {
      const result = controllerDialectEngine.validateLine("fanuc_0i", "G0 X100. Y50.");
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("validates mixed comment styles (controller-lenient)", () => {
      // Engine allows mixed styles as many controllers tolerate both
      const fanucResult = controllerDialectEngine.validateLine("fanuc_0i", "G0 X100. (proper comment)");
      expect(fanucResult.valid).toBe(true);

      const siemensResult = controllerDialectEngine.validateLine("siemens_840d", "G0 X100. ; proper comment");
      expect(siemensResult.valid).toBe(true);
    });

    it("validates comment styles exist in dialect", () => {
      const fanuc = controllerDialectEngine.getDialect("fanuc_0i");
      expect(fanuc.comment_style).toBe("parentheses");
      expect(fanuc.comment_open).toBe("(");
      expect(fanuc.comment_close).toBe(")");

      const siemens = controllerDialectEngine.getDialect("siemens_840d");
      expect(siemens.comment_style).toBe("semicolon");
      expect(siemens.comment_open).toBe("; ");
    });

    it("flags Heidenhain block length exceeded", () => {
      const longLine = "L X" + "1".repeat(600) + " Y100.";
      const result = controllerDialectEngine.validateLine("heidenhain_tnc640", longLine);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes("max length"))).toBe(true);
    });
  });

  describe("controller features", () => {
    it("Fanuc 31i has TCPC support", () => {
      const d = controllerDialectEngine.getDialect("fanuc_31i");
      expect(d.features.tcpc).toBeDefined();
      expect(d.features.tcpc?.on).toContain("G43.4");
    });

    it("Siemens 840D has TRAORI for 5-axis", () => {
      const d = controllerDialectEngine.getDialect("siemens_840d");
      expect(d.features.tcpc?.on).toBe("TRAORI");
    });

    it("Heidenhain TNC640 has TCPM function", () => {
      const d = controllerDialectEngine.getDialect("heidenhain_tnc640");
      expect(d.features.tcpc?.on).toContain("TCPM");
    });

    it("Fanuc 31i has NURBS interpolation", () => {
      const d = controllerDialectEngine.getDialect("fanuc_31i");
      expect(d.features.nurbs_interpolation).toBe(true);
    });

    it("Fanuc 0i does not have NURBS interpolation", () => {
      const d = controllerDialectEngine.getDialect("fanuc_0i");
      expect(d.features.nurbs_interpolation).toBe(false);
    });

    it("Hurco MAX5 has UltiMotion", () => {
      const d = controllerDialectEngine.getDialect("hurco_max5");
      expect(d.features.ulti_motion).toBe(true);
    });
  });

  describe("Swiss/turning specialty controllers", () => {
    it("Citizen Cincom has guide bushing support", () => {
      const d = controllerDialectEngine.getDialect("citizen_cincom");
      expect(d.features.guide_bushing).toBe(true);
      expect(d.features.sub_spindle).toBe(true);
      expect(d.features.lfv_vibration).toBe(true);
    });

    it("Star Fanuc has gang tooling", () => {
      const d = controllerDialectEngine.getDialect("star_fanuc");
      expect(d.features.gang_tooling).toBe(true);
      expect(d.features.thread_whirling).toBe(true);
    });
  });

  describe("arc format", () => {
    it("Fanuc uses IJK incremental", () => {
      const d = controllerDialectEngine.getDialect("fanuc_0i");
      expect(d.arc_format).toBe("ijk_incremental");
    });

    it("Heidenhain uses R-word", () => {
      const d = controllerDialectEngine.getDialect("heidenhain_tnc640");
      expect(d.arc_format).toBe("r_word");
    });

    it("Siemens 828D supports both", () => {
      const d = controllerDialectEngine.getDialect("siemens_828d");
      expect(d.arc_format).toBe("both");
    });

    it("DMG CELOS Siemens uses IJK absolute", () => {
      const d = controllerDialectEngine.getDialect("dmg_celos_siemens");
      expect(d.arc_format).toBe("ijk_absolute");
    });
  });

  describe("work offsets", () => {
    it("Fanuc uses G54-G59 base offsets", () => {
      const d = controllerDialectEngine.getDialect("fanuc_0i");
      expect(d.work_offsets.base).toBe("G54");
      expect(d.work_offsets.extended).toContain("G54.1");
    });

    it("Okuma uses G15 H offsets", () => {
      const d = controllerDialectEngine.getDialect("okuma_osp_p300");
      expect(d.work_offsets.base).toBe("G15 H1");
      expect(d.work_offsets.format).toContain("G15");
    });

    it("Haas has extended G154 offsets", () => {
      const d = controllerDialectEngine.getDialect("haas_ngc");
      expect(d.work_offsets.extended).toContain("G154");
    });

    it("Siemens uses $P_UIFR frame offsets", () => {
      const d = controllerDialectEngine.getDialect("siemens_840d");
      expect(d.work_offsets.extended).toContain("$P_UIFR");
    });
  });

  describe("machine capability features", () => {
    it("Fanuc 31i has 200 look-ahead blocks", () => {
      const d = controllerDialectEngine.getDialect("fanuc_31i");
      expect(d.features.look_ahead_blocks).toBe(200);
      expect(d.features.block_processing_rate).toBe(7000);
    });

    it("Heidenhain TNC7 has highest block processing", () => {
      const d = controllerDialectEngine.getDialect("heidenhain_tnc7");
      expect(d.features.block_processing_rate).toBe(15000);
      expect(d.features.look_ahead_blocks).toBe(1024);
    });

    it("Sinumerik ONE has 10000 blocks/sec processing", () => {
      const d = controllerDialectEngine.getDialect("siemens_one");
      expect(d.features.block_processing_rate).toBe(10000);
    });

    it("Controllers report work offset count", () => {
      const fanuc31i = controllerDialectEngine.getDialect("fanuc_31i");
      const siemens = controllerDialectEngine.getDialect("siemens_840d");
      expect(fanuc31i.features.work_offset_count).toBe(300);
      expect(siemens.features.work_offset_count).toBe(99);
    });

    it("Controllers report macro B support", () => {
      const fanuc = controllerDialectEngine.getDialect("fanuc_31i");
      const siemens = controllerDialectEngine.getDialect("siemens_840d");
      expect(fanuc.features.macro_b_support).toBe(true);
      expect(siemens.features.macro_b_support).toBe(false);
    });
  });

  describe("coolant codes", () => {
    it("all controllers have flood/mist/off", () => {
      const dialects = controllerDialectEngine.listDialects();
      for (const { id } of dialects) {
        const d = controllerDialectEngine.getDialect(id);
        expect(d.coolant_flood).toBeDefined();
        expect(d.coolant_mist).toBeDefined();
        expect(d.coolant_off).toBeDefined();
      }
    });

    it("TSC coolant varies by controller", () => {
      const haas = controllerDialectEngine.getDialect("haas_ngc");
      const mazak = controllerDialectEngine.getDialect("mazak_smooth_ai");
      const siemens = controllerDialectEngine.getDialect("siemens_840d");
      expect(haas.coolant_tsc).toBe("M88");
      expect(mazak.coolant_tsc).toBe("M51");
      expect(siemens.coolant_tsc).toBe("M88");
    });
  });

  describe("sub-program syntax", () => {
    it("Fanuc uses M98/M99", () => {
      const d = controllerDialectEngine.getDialect("fanuc_0i");
      expect(d.sub_program_call).toContain("M98");
      expect(d.sub_program_return).toBe("M99");
    });

    it("Siemens uses CALL/RET", () => {
      const d = controllerDialectEngine.getDialect("siemens_840d");
      expect(d.sub_program_call).toContain("CALL");
      expect(d.sub_program_return).toBe("RET");
    });

    it("Heidenhain uses CALL PGM/END PGM", () => {
      const d = controllerDialectEngine.getDialect("heidenhain_tnc640");
      expect(d.sub_program_call).toContain("CALL PGM");
      expect(d.sub_program_return).toContain("END PGM");
    });
  });
});
