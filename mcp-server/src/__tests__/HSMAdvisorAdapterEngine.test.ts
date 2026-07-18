/**
 * Tests for HSMAdvisorAdapterEngine (U-OSC9-09).
 *
 * Coverage:
 *   - Singleton + shape contract
 *   - Schema validation
 *   - parseXml(): fixture mirroring live operator settings_v2.xml (1018 steel rough cut)
 *     * Settings block extraction (sfm_pc, ipt_pc, limits)
 *     * Tool block extraction (full field map)
 *     * Cut block extraction (sfm/ipt/mrr/rpm/feed — the comparison currency)
 *   - Unit conversion: inch → mm (×25.4) for length-bearing fields only
 *   - Missing-block handling: <Tool> absent / <Cut> absent → null + warning
 *   - Numeric coercion: NaN / empty strings rejected, undefined fields default sensibly
 *   - Self-closing tags (<Cuts />): block-end logic robust
 *   - Boolean coercion (hsm / hss as 0/1 → false/true)
 *   - File I/O: missing-file throws with descriptive error
 *   - Env-var override path resolution
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, statSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  hsmAdvisorAdapterEngine,
  HSMAdvisorAdapterEngine,
  HSMAdvisorReadInputSchema,
} from "../engines/HSMAdvisorAdapterEngine.js";

// ============================================================================
// FIXTURES — mirrors operator's live settings_v2.xml structure (2026-05-26)
// ============================================================================

const FIXTURE_FULL = `<?xml version="1.0" encoding="utf-16"?>
<DataBase xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
\t<Settings>
\t\t<confirm_calculation_delete>0</confirm_calculation_delete>
\t\t<settings_sfm_pc>100</settings_sfm_pc>
\t\t<settings_ipt_pc>100</settings_ipt_pc>
\t\t<settings_CMB_tool_performance>1</settings_CMB_tool_performance>
\t\t<settings_CMB_deflection_limit>70</settings_CMB_deflection_limit>
\t\t<settings_CMB_torque_limit>70</settings_CMB_torque_limit>
\t\t<DarkTheme>1</DarkTheme>
\t</Settings>
\t<Tool>
\t\t<guid>8ca983ce-6590-482f-8ee9-7fa49f9e5f14</guid>
\t\t<library>Lathe</library>
\t\t<comment>T2 Rough Turn for Steel</comment>
\t\t<id>84</id>
\t\t<type>endmill</type>
\t\t<maxdeflection_pc>70</maxdeflection_pc>
\t\t<maxtorque_pc>70</maxtorque_pc>
\t\t<productivity>4</productivity>
\t\t<number>2</number>
\t\t<diameter>0.5</diameter>
\t\t<stickout>1.25</stickout>
\t\t<corner_rad>0</corner_rad>
\t\t<Shank_Dia>0.5</Shank_Dia>
\t\t<Flute_N>2</Flute_N>
\t\t<Flute_Len>1</Flute_Len>
\t\t<Shoulder_Len>1</Shoulder_Len>
\t\t<helix_angle>30</helix_angle>
\t\t<leadangle>90</leadangle>
\t\t<tool_material_id>5</tool_material_id>
\t\t<coating_id>1</coating_id>
\t\t<doc>0.875</doc>
\t\t<woc>0.1513359375</woc>
\t\t<sfm_adj>100</sfm_adj>
\t\t<ipt_adj>100</ipt_adj>
\t\t<Cuts />
\t</Tool>
\t<Cut>
\t\t<id>67</id>
\t\t<guid>38ac9484-732a-4301-a1de-ff29c7053ce6</guid>
\t\t<tool_guid>8ca983ce-6590-482f-8ee9-7fa49f9e5f14</tool_guid>
\t\t<tool_id>84</tool_id>
\t\t<diameter>0.5</diameter>
\t\t<material_id>227</material_id>
\t\t<doc>0.875</doc>
\t\t<woc>0.1513359375</woc>
\t\t<effective_dia>0.5</effective_dia>
\t\t<feed>17.9448</feed>
\t\t<rpm>2971</rpm>
\t\t<sfm>388.703040178571</sfm>
\t\t<ipt>0.00302</ipt>
\t\t<mrr>2.37623148984375</mrr>
\t\t<tool_deflection>0.000411937838544968</tool_deflection>
\t\t<Manufacturer_SFM>0</Manufacturer_SFM>
\t\t<Manufacturer_IPT>0</Manufacturer_IPT>
\t\t<productivity>4</productivity>
\t\t<number>2</number>
\t\t<comment>Rough</comment>
\t\t<operation_type>1</operation_type>
\t\t<surface_finish>0</surface_finish>
\t\t<hsm>0</hsm>
\t\t<hss>0</hss>
\t</Cut>
</DataBase>`;

const FIXTURE_NO_TOOL = `<?xml version="1.0" encoding="utf-16"?>
<DataBase>
\t<Settings>
\t\t<settings_sfm_pc>110</settings_sfm_pc>
\t</Settings>
</DataBase>`;

const FIXTURE_HSM_ENABLED = `<?xml version="1.0" encoding="utf-16"?>
<DataBase>
\t<Settings>
\t\t<settings_sfm_pc>100</settings_sfm_pc>
\t</Settings>
\t<Cut>
\t\t<guid>x</guid>
\t\t<tool_guid>y</tool_guid>
\t\t<sfm>500</sfm>
\t\t<hsm>1</hsm>
\t\t<hss>1</hss>
\t</Cut>
</DataBase>`;

const META = { sourcePath: "fixture.xml", sourceMtimeMs: 1700000000000, convertToMm: false };

// ============================================================================
// TESTS
// ============================================================================

describe("HSMAdvisorAdapterEngine — singleton + shape", () => {
  it("exports a singleton instance of the class", () => {
    expect(hsmAdvisorAdapterEngine).toBeInstanceOf(HSMAdvisorAdapterEngine);
  });

  it("exposes read() and parseXml()", () => {
    expect(typeof hsmAdvisorAdapterEngine.read).toBe("function");
    expect(typeof hsmAdvisorAdapterEngine.parseXml).toBe("function");
  });
});

describe("HSMAdvisorReadInputSchema — Zod validation", () => {
  it("accepts empty input + applies convert_to_mm default false", () => {
    const parsed = HSMAdvisorReadInputSchema.parse({});
    expect(parsed.convert_to_mm).toBe(false);
    expect(parsed.settings_path).toBeUndefined();
  });

  it("accepts settings_path + convert_to_mm overrides", () => {
    const parsed = HSMAdvisorReadInputSchema.parse({
      settings_path: "/tmp/x.xml",
      convert_to_mm: true,
    });
    expect(parsed.settings_path).toBe("/tmp/x.xml");
    expect(parsed.convert_to_mm).toBe(true);
  });

  it("rejects bad convert_to_mm type", () => {
    expect(() =>
      HSMAdvisorReadInputSchema.parse({ convert_to_mm: "yes" as unknown as boolean }),
    ).toThrow();
  });
});

describe("HSMAdvisorAdapterEngine.parseXml() — Settings block", () => {
  it("extracts sfm_pc / ipt_pc / limits", () => {
    const state = hsmAdvisorAdapterEngine.parseXml(FIXTURE_FULL, META);
    expect(state.settings.sfm_pc).toBe(100);
    expect(state.settings.ipt_pc).toBe(100);
    expect(state.settings.deflection_limit_pc).toBe(70);
    expect(state.settings.torque_limit_pc).toBe(70);
    expect(state.settings.tool_performance).toBe(1);
  });

  it("applies defaults when individual settings fields are missing", () => {
    const xml = `<DataBase><Settings><settings_sfm_pc>110</settings_sfm_pc></Settings></DataBase>`;
    const state = hsmAdvisorAdapterEngine.parseXml(xml, META);
    expect(state.settings.sfm_pc).toBe(110);
    expect(state.settings.ipt_pc).toBe(100); // default
    expect(state.settings.deflection_limit_pc).toBe(70); // default
  });

  it("warns + zeros when <Settings> is absent entirely", () => {
    const xml = `<DataBase></DataBase>`;
    const state = hsmAdvisorAdapterEngine.parseXml(xml, META);
    expect(state.settings.sfm_pc).toBe(0);
    expect(state.warnings.some((w) => /<Settings> block missing/.test(w))).toBe(true);
  });
});

describe("HSMAdvisorAdapterEngine.parseXml() — Tool block", () => {
  it("extracts the full tool field map", () => {
    const state = hsmAdvisorAdapterEngine.parseXml(FIXTURE_FULL, META);
    expect(state.tool).not.toBeNull();
    expect(state.tool?.guid).toBe("8ca983ce-6590-482f-8ee9-7fa49f9e5f14");
    expect(state.tool?.library).toBe("Lathe");
    expect(state.tool?.comment).toBe("T2 Rough Turn for Steel");
    expect(state.tool?.id).toBe(84);
    expect(state.tool?.type).toBe("endmill");
    expect(state.tool?.diameter).toBeCloseTo(0.5, 5);
    expect(state.tool?.flutes).toBe(2);
    expect(state.tool?.helix_angle).toBe(30);
    expect(state.tool?.stickout).toBeCloseTo(1.25, 5);
    expect(state.tool?.tool_material_id).toBe(5);
    expect(state.tool?.coating_id).toBe(1);
    expect(state.tool?.productivity).toBe(4);
    expect(state.tool?.maxdeflection_pc).toBe(70);
    expect(state.tool?.maxtorque_pc).toBe(70);
    expect(state.tool?.number).toBe(2);
  });

  it("returns null + warning when <Tool> is absent", () => {
    const state = hsmAdvisorAdapterEngine.parseXml(FIXTURE_NO_TOOL, META);
    expect(state.tool).toBeNull();
    expect(state.warnings.some((w) => /<Tool> block missing/.test(w))).toBe(true);
  });

  it("converts inch length-bearing fields to mm when convert_to_mm=true", () => {
    const state = hsmAdvisorAdapterEngine.parseXml(FIXTURE_FULL, { ...META, convertToMm: true });
    expect(state.tool?.diameter).toBeCloseTo(0.5 * 25.4, 4); // 12.7 mm
    expect(state.tool?.stickout).toBeCloseTo(1.25 * 25.4, 4); // 31.75 mm
    expect(state.tool?.doc).toBeCloseTo(0.875 * 25.4, 4); // 22.225 mm
    // Angular + count + percent fields are unitless — must NOT be scaled.
    expect(state.tool?.helix_angle).toBe(30);
    expect(state.tool?.flutes).toBe(2);
    expect(state.tool?.maxdeflection_pc).toBe(70);
    expect(state.units_mm).toBe(true);
  });
});

describe("HSMAdvisorAdapterEngine.parseXml() — Cut block (comparison currency)", () => {
  it("extracts the canonical comparison fields sfm/ipt/mrr/rpm/feed", () => {
    const state = hsmAdvisorAdapterEngine.parseXml(FIXTURE_FULL, META);
    expect(state.cut).not.toBeNull();
    expect(state.cut?.sfm).toBeCloseTo(388.703040178571, 9);
    expect(state.cut?.ipt).toBeCloseTo(0.00302, 9);
    expect(state.cut?.rpm).toBe(2971);
    expect(state.cut?.feed).toBeCloseTo(17.9448, 9);
    expect(state.cut?.mrr).toBeCloseTo(2.37623148984375, 9);
    expect(state.cut?.tool_deflection).toBeCloseTo(0.000411937838544968, 12);
  });

  it("extracts cross-reference fields linking back to the Tool block", () => {
    const state = hsmAdvisorAdapterEngine.parseXml(FIXTURE_FULL, META);
    expect(state.cut?.tool_guid).toBe("8ca983ce-6590-482f-8ee9-7fa49f9e5f14");
    expect(state.cut?.tool_id).toBe(84);
    expect(state.cut?.material_id).toBe(227);
    expect(state.cut?.comment).toBe("Rough");
    expect(state.cut?.operation_type).toBe(1);
  });

  it("coerces hsm / hss numeric flags to booleans", () => {
    const off = hsmAdvisorAdapterEngine.parseXml(FIXTURE_FULL, META);
    expect(off.cut?.hsm).toBe(false);
    expect(off.cut?.hss).toBe(false);

    const on = hsmAdvisorAdapterEngine.parseXml(FIXTURE_HSM_ENABLED, META);
    expect(on.cut?.hsm).toBe(true);
    expect(on.cut?.hss).toBe(true);
  });

  it("returns null + warning when <Cut> is absent", () => {
    const xml = `<DataBase><Settings></Settings><Tool><guid>x</guid></Tool></DataBase>`;
    const state = hsmAdvisorAdapterEngine.parseXml(xml, META);
    expect(state.cut).toBeNull();
    expect(state.warnings.some((w) => /<Cut> block missing/.test(w))).toBe(true);
  });

  it("converts inch length-bearing Cut fields to mm; preserves sfm/rpm/mrr unit-as-is", () => {
    const state = hsmAdvisorAdapterEngine.parseXml(FIXTURE_FULL, { ...META, convertToMm: true });
    // length fields scaled
    expect(state.cut?.diameter).toBeCloseTo(0.5 * 25.4, 4);
    expect(state.cut?.feed).toBeCloseTo(17.9448 * 25.4, 4); // feed is in/min → mm/min
    expect(state.cut?.ipt).toBeCloseTo(0.00302 * 25.4, 6);
    // unitless / pre-converted fields NOT scaled
    expect(state.cut?.rpm).toBe(2971);
    expect(state.cut?.sfm).toBeCloseTo(388.703040178571, 9); // sfm stays sfm — caller can convert to m/min if needed
    expect(state.cut?.mrr).toBeCloseTo(2.37623148984375, 9); // mrr unit-as-is (operator decides cm³/min vs in³/min)
  });
});

describe("HSMAdvisorAdapterEngine.parseXml() — numeric coercion edge cases", () => {
  it("returns undefined-defaults for non-numeric values", () => {
    const xml = `<DataBase>
\t<Settings><settings_sfm_pc>not_a_number</settings_sfm_pc></Settings>
</DataBase>`;
    const state = hsmAdvisorAdapterEngine.parseXml(xml, META);
    expect(state.settings.sfm_pc).toBe(100); // fell back to default
  });

  it("rejects empty-string numeric fields", () => {
    const xml = `<DataBase><Settings><settings_sfm_pc></settings_sfm_pc></Settings></DataBase>`;
    const state = hsmAdvisorAdapterEngine.parseXml(xml, META);
    expect(state.settings.sfm_pc).toBe(100); // default
  });

  it("does NOT match similarly-named tags (settings_sfm_pc vs settings_sfm_pc_other)", () => {
    const xml = `<DataBase>
\t<Settings>
\t\t<settings_sfm_pc_other>999</settings_sfm_pc_other>
\t\t<settings_sfm_pc>50</settings_sfm_pc>
\t</Settings>
</DataBase>`;
    const state = hsmAdvisorAdapterEngine.parseXml(xml, META);
    expect(state.settings.sfm_pc).toBe(50);
  });
});

describe("HSMAdvisorAdapterEngine.parseXml() — metadata", () => {
  it("preserves source_path + source_mtime_ms + units_mm in result", () => {
    const state = hsmAdvisorAdapterEngine.parseXml(FIXTURE_FULL, {
      sourcePath: "/some/path/settings_v2.xml",
      sourceMtimeMs: 1234567890,
      convertToMm: false,
    });
    expect(state.source_path).toBe("/some/path/settings_v2.xml");
    expect(state.source_mtime_ms).toBe(1234567890);
    expect(state.units_mm).toBe(false);
  });
});

describe("HSMAdvisorAdapterEngine.read() — file I/O", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "hsma-test-"));
    delete process.env["PRISM_HSMADVISOR_SETTINGS_PATH"];
  });

  afterEach(() => {
    delete process.env["PRISM_HSMADVISOR_SETTINGS_PATH"];
    try {
      rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
  });

  it("throws descriptive error when settings file is missing", () => {
    const bogus = join(tmp, "does_not_exist.xml");
    expect(() => hsmAdvisorAdapterEngine.read({ settings_path: bogus })).toThrow(
      /HSMAdvisor settings not found/,
    );
  });

  it("reads + parses a UTF-16-LE file with BOM", () => {
    const file = join(tmp, "settings_v2.xml");
    // Write as UTF-16-LE with BOM (mirrors HSMAdvisor's actual file encoding).
    const bom = Buffer.from([0xff, 0xfe]);
    const body = Buffer.from(FIXTURE_FULL, "utf16le");
    writeFileSync(file, Buffer.concat([bom, body]));

    const state = hsmAdvisorAdapterEngine.read({ settings_path: file });
    expect(state.tool?.guid).toBe("8ca983ce-6590-482f-8ee9-7fa49f9e5f14");
    expect(state.cut?.rpm).toBe(2971);
    expect(state.source_path).toBe(file);
    // mtime is real
    expect(state.source_mtime_ms).toBe(statSync(file).mtimeMs);
  });

  it("reads a UTF-8 file (HSMAdvisor declares utf-16 but stores utf-8 on disk — verified live 2026-05-26)", () => {
    const file = join(tmp, "utf8.xml");
    // UTF-8 bytes, no BOM. Matches the live operator's settings_v2.xml.
    writeFileSync(file, Buffer.from(FIXTURE_FULL, "utf8"));

    const state = hsmAdvisorAdapterEngine.read({ settings_path: file });
    expect(state.tool?.guid).toBe("8ca983ce-6590-482f-8ee9-7fa49f9e5f14");
    expect(state.cut?.rpm).toBe(2971);
    expect(state.cut?.sfm).toBeCloseTo(388.703040178571, 9);
  });

  it("reads a UTF-8 file with BOM (0xEF 0xBB 0xBF)", () => {
    const file = join(tmp, "utf8_bom.xml");
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const body = Buffer.from(FIXTURE_FULL, "utf8");
    writeFileSync(file, Buffer.concat([bom, body]));

    const state = hsmAdvisorAdapterEngine.read({ settings_path: file });
    expect(state.tool?.guid).toBe("8ca983ce-6590-482f-8ee9-7fa49f9e5f14");
  });

  it("reads a UTF-16 BE file (alt encoding some HSMAdvisor builds may emit)", () => {
    const file = join(tmp, "utf16be.xml");
    // Encode as UTF-16 LE then swap → produces UTF-16 BE bytes. Prepend BE BOM 0xFE 0xFF.
    const bom = Buffer.from([0xfe, 0xff]);
    const leBytes = Buffer.from(FIXTURE_FULL, "utf16le");
    const beBytes = Buffer.from(leBytes).swap16();
    writeFileSync(file, Buffer.concat([bom, beBytes]));

    const state = hsmAdvisorAdapterEngine.read({ settings_path: file });
    expect(state.tool?.guid).toBe("8ca983ce-6590-482f-8ee9-7fa49f9e5f14");
  });

  it("honors PRISM_HSMADVISOR_SETTINGS_PATH env override", () => {
    const file = join(tmp, "alt_path.xml");
    const bom = Buffer.from([0xff, 0xfe]);
    const body = Buffer.from(FIXTURE_FULL, "utf16le");
    writeFileSync(file, Buffer.concat([bom, body]));

    process.env["PRISM_HSMADVISOR_SETTINGS_PATH"] = file;
    const state = hsmAdvisorAdapterEngine.read({});
    expect(state.tool?.guid).toBe("8ca983ce-6590-482f-8ee9-7fa49f9e5f14");
  });
});

describe("HSMAdvisorAdapterEngine — unit-conversion contract (P1-B3 Reviewer B)", () => {
  it("documented contract: units_mm=true does NOT scale sfm (ft/min stays ft/min), mrr (in³/min stays in³/min), rpm, counts, percentages", () => {
    // P1 from Reviewer B: encoded as a HARD ASSERTION on the engine's contract,
    // not a deferred ambiguity. Caller of iter3 compare-bridge MUST handle these fields
    // as native-unit regardless of the flag. If a future change silently scales sfm or mrr
    // by 25.4, this test fails immediately — catches the 16.4× MRR-error regression.
    const inch = hsmAdvisorAdapterEngine.parseXml(FIXTURE_FULL, { ...META, convertToMm: false });
    const mm = hsmAdvisorAdapterEngine.parseXml(FIXTURE_FULL, { ...META, convertToMm: true });

    // Fields that MUST remain identical between inch and mm modes:
    expect(mm.cut?.sfm).toBe(inch.cut?.sfm);
    expect(mm.cut?.mrr).toBe(inch.cut?.mrr);
    expect(mm.cut?.rpm).toBe(inch.cut?.rpm);
    expect(mm.cut?.productivity).toBe(inch.cut?.productivity);
    expect(mm.cut?.operation_type).toBe(inch.cut?.operation_type);
    expect(mm.tool?.flutes).toBe(inch.tool?.flutes);
    expect(mm.tool?.helix_angle).toBe(inch.tool?.helix_angle);
    expect(mm.tool?.leadangle).toBe(inch.tool?.leadangle);
    expect(mm.tool?.maxdeflection_pc).toBe(inch.tool?.maxdeflection_pc);
    expect(mm.tool?.maxtorque_pc).toBe(inch.tool?.maxtorque_pc);
    expect(mm.tool?.tool_material_id).toBe(inch.tool?.tool_material_id);
    expect(mm.tool?.coating_id).toBe(inch.tool?.coating_id);

    // Fields that MUST scale by exactly 25.4 between inch and mm modes:
    expect(mm.tool?.diameter).toBeCloseTo((inch.tool?.diameter ?? 0) * 25.4, 5);
    expect(mm.tool?.stickout).toBeCloseTo((inch.tool?.stickout ?? 0) * 25.4, 5);
    expect(mm.cut?.feed).toBeCloseTo((inch.cut?.feed ?? 0) * 25.4, 5);
    expect(mm.cut?.ipt).toBeCloseTo((inch.cut?.ipt ?? 0) * 25.4, 5);
    expect(mm.cut?.tool_deflection).toBeCloseTo((inch.cut?.tool_deflection ?? 0) * 25.4, 10);
  });
});

describe("HSMAdvisorAdapterEngine — real operator file (gated, P1-B1 Reviewer B)", () => {
  // P1 from Reviewer B: anchor against the LIVE operator file when present.
  // Skipped in CI (no HSMAdvisor install there); passes locally when operator has HSMAdvisor.
  it("reads the live HSMAdvisor settings_v2.xml without throwing when present", async () => {
    const { existsSync } = await import("fs");
    const { homedir } = await import("os");
    const { join } = await import("path");
    const appData = process.env["APPDATA"] ?? join(homedir(), "AppData", "Roaming");
    const realPath = join(appData, "HSMAdvisor", "settings_v2.xml");

    if (!existsSync(realPath)) {
      // Operator does not have HSMAdvisor installed on this machine — test is a no-op.
      return;
    }

    const state = hsmAdvisorAdapterEngine.read({ settings_path: realPath });
    // Source meta must be filled.
    expect(state.source_path).toBe(realPath);
    expect(state.source_mtime_ms).toBeGreaterThan(0);
    // At least one of tool / cut should be present in a real operator file.
    const hasContent = state.tool !== null || state.cut !== null;
    expect(hasContent).toBe(true);
    // If tool present, guid must be a non-empty string (HSMAdvisor never writes empty GUIDs).
    if (state.tool) {
      expect(state.tool.guid.length).toBeGreaterThan(0);
    }
    // If cut present, sfm + rpm + mrr must be finite numbers.
    if (state.cut) {
      expect(Number.isFinite(state.cut.sfm)).toBe(true);
      expect(Number.isFinite(state.cut.rpm)).toBe(true);
      expect(Number.isFinite(state.cut.mrr)).toBe(true);
    }
  });
});

describe("HSMAdvisorAdapterEngine — invariants", () => {
  it("source_mtime_ms is forwarded verbatim from meta", () => {
    const state = hsmAdvisorAdapterEngine.parseXml(FIXTURE_FULL, { ...META, sourceMtimeMs: 42 });
    expect(state.source_mtime_ms).toBe(42);
  });

  it("warnings array is always defined (may be empty)", () => {
    const state = hsmAdvisorAdapterEngine.parseXml(FIXTURE_FULL, META);
    expect(Array.isArray(state.warnings)).toBe(true);
    expect(state.warnings.length).toBe(0); // FIXTURE_FULL has every block present
  });

  it("tool + cut cross-reference: cut.tool_guid matches tool.guid", () => {
    const state = hsmAdvisorAdapterEngine.parseXml(FIXTURE_FULL, META);
    expect(state.cut?.tool_guid).toBe(state.tool?.guid);
  });
});
