/**
 * GWizardToolCribExportEngine tests — round-trip fidelity against the REAL read adapter.
 *
 * The export is only correct if `gWizardAdapterEngine.parseCsv()` reads back exactly what we
 * wrote, so the core test feeds our CSV straight into the adapter and asserts field-by-field
 * equality. This proves the 60-column contract without depending on G-Wizard being installed.
 *
 * @milestone CATALOG-APP-WIRING / gwizard_export_toolcrib (romeo, 2026-06-08)
 */

import { describe, it, expect } from "vitest";
import {
  gWizardToolCribExportEngine,
  GWizardToolCribExportEngine,
} from "../engines/GWizardToolCribExportEngine.js";
import { gWizardAdapterEngine } from "../engines/GWizardAdapterEngine.js";

/** A realistic mm-native PRISM catalog tool (Sandvik square endmill). */
const SANDVIK_ENDMILL = {
  id: "sandvik-R390-11T308",
  manufacturer: "Sandvik",
  series: "CoroMill 390",
  designation: "R390-11T308M-PM",
  type: "end_mill",
  subtype: "square",
  material: "carbide",
  coating: "TiAlN",
  physical: {
    cutting_diameter_mm: 12.0,
    shank_diameter_mm: 12.0,
    overall_length_mm: 83.0,
    flute_length_mm: 22.0,
    corner_radius_mm: 0.8,
  },
  flute_count: 4,
  helix_angle_deg: 30,
  iso_groups: ["P", "M"],
  operations: ["roughing"],
  holder_interface: "Weldon",
  coolant: "flood",
  source: "sandvik-2022-tool-catalog",
  price_usd: 45.5,
};

/** Parse exported CSV back through the production read adapter. */
function roundTrip(csv: string) {
  return gWizardAdapterEngine.parseCsv(csv, { sourcePath: "test://crib.csv", sourceMtimeMs: 0 });
}

describe("GWizardToolCribExportEngine", () => {
  it("round-trips a catalog tool through the real read adapter with field fidelity", () => {
    const out = gWizardToolCribExportEngine.export({ tools: [SANDVIK_ENDMILL] });
    expect(out.tool_count).toBe(1);

    const state = roundTrip(out.csv);
    expect(state.tools).toHaveLength(1);
    const t = state.tools[0];

    // Geometry (mm-native) survives the round-trip exactly.
    expect(t.diameter).toBe(12.0);
    expect(t.shankSize).toBe(12.0);
    expect(t.overallLength).toBe(83.0);
    expect(t.cutLength).toBe(22.0);
    expect(t.flutes).toBe(4);
    expect(t.noseRad).toBe(0.8); // mapped from corner_radius_mm
    expect(t.helixAngle).toBe(30);

    // Identity / material.
    expect(t.coating).toBe("TiAlN");
    expect(t.toolmaterial).toBe("carbide");
    expect(t.vendor).toBe("Sandvik");
    expect(t.product).toBe("R390-11T308M-PM");
    expect(t.toolFamily).toBe("end_mill");
    expect(t.description).toContain("Sandvik");
    expect(t.description).toContain("R390-11T308M-PM");

    // Holder.
    expect(t.holderType).toBe("Weldon");
    expect(t.holderDesc).toBe("Weldon");
  });

  it("emits units=mm so a 12mm cutter is never misread as 12 inches (25.4x guard)", () => {
    const out = gWizardToolCribExportEngine.export({ tools: [SANDVIK_ENDMILL] });
    expect(out.units).toBe("mm");
    const t = roundTrip(out.csv).tools[0];
    expect(t.units).toBe("mm");
    expect(t.diameter).toBe(12.0); // value is in mm, label says mm — no scale error
  });

  it("leaves SFM/IPT/chipload unset (NaN) for G-Wizard to compute", () => {
    const t = roundTrip(gWizardToolCribExportEngine.export({ tools: [SANDVIK_ENDMILL] }).csv).tools[0];
    // Adapter coerces literal "NaN" -> undefined.
    expect(t.sfm).toBe(undefined);
    expect(t.ipt).toBe(undefined);
    expect(t.chipload).toBe(undefined);
    expect(t.useMfgSFM).toBe(false);
    expect(t.useMfgIPT).toBe(false);
  });

  it("produces deterministic, UUID-shaped, idempotent GUIDs", () => {
    const g1 = gWizardToolCribExportEngine.toolGuid("sandvik-R390-11T308");
    const g2 = gWizardToolCribExportEngine.toolGuid("sandvik-R390-11T308");
    const g3 = gWizardToolCribExportEngine.toolGuid("kennametal-KSEM");
    expect(g1).toBe(g2); // deterministic
    expect(g1).not.toBe(g3); // unique per id
    expect(g1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

    // Re-export yields the SAME guid for the same tool (G-Wizard updates, not duplicates).
    const a = roundTrip(gWizardToolCribExportEngine.export({ tools: [SANDVIK_ENDMILL] }).csv).tools[0];
    const b = roundTrip(gWizardToolCribExportEngine.export({ tools: [SANDVIK_ENDMILL] }).csv).tools[0];
    expect(a.guid).toBe(b.guid);
    expect(a.guid).toBe(g1);
  });

  it("CSV-escapes commas in text fields so they round-trip intact", () => {
    const commaTool = {
      ...SANDVIK_ENDMILL,
      id: "comma-test",
      designation: "R390, 12mm, 4FL",
      manufacturer: "Acme, Inc.",
    };
    const out = gWizardToolCribExportEngine.export({ tools: [commaTool] });
    const t = roundTrip(out.csv).tools[0];
    expect(t.product).toBe("R390, 12mm, 4FL");
    expect(t.vendor).toBe("Acme, Inc.");
  });

  it("escapes embedded double-quotes (RFC 4180) so they round-trip intact", () => {
    const t = { ...SANDVIK_ENDMILL, id: "quote-test", designation: 'R390 "PM" 12mm' };
    const out = gWizardToolCribExportEngine.export({ tools: [t] });
    const parsed = roundTrip(out.csv).tools[0];
    expect(parsed.product).toBe('R390 "PM" 12mm'); // "" un-escaped back to a single quote
  });

  it("flattens newlines in a field so the line-based adapter never splits one tool into two rows", () => {
    // The adapter splits on \r?\n before field-splitting; a raw newline in a value would corrupt
    // the crib. The exporter must collapse CR/LF to a space. This test FAILS against unquoted/raw output.
    const t = { ...SANDVIK_ENDMILL, id: "nl-test", manufacturer: "Acme\nTools", designation: "D\r\n6" };
    const out = gWizardToolCribExportEngine.export({ tools: [t] });
    const parsed = roundTrip(out.csv);
    expect(parsed.tools).toHaveLength(1); // exactly one tool — newline did NOT split into 2 rows
    expect(parsed.tools[0].vendor).toBe("Acme Tools"); // CR/LF collapsed to a single space
    expect(parsed.tools[0].product).toBe("D 6");
  });

  it("handles a tool with NO physical dims — diameters become unset, no throw", () => {
    const bare = { id: "bare-drill", type: "drill", manufacturer: "X", designation: "D6" };
    const out = gWizardToolCribExportEngine.export({ tools: [bare] });
    expect(out.tool_count).toBe(1);
    const t = roundTrip(out.csv).tools[0];
    expect(t.diameter).toBe(undefined);
    expect(t.cutLength).toBe(undefined);
    expect(t.toolFamily).toBe("drill");
  });

  it("warns (does not throw) when a tool has no id, and still emits a guid", () => {
    const out = gWizardToolCribExportEngine.export({
      tools: [{ type: "drill", physical: { cutting_diameter_mm: 6 } }],
    });
    expect(out.tool_count).toBe(1);
    expect(out.warnings.some((w) => /no id/i.test(w))).toBe(true);
    const t = roundTrip(out.csv).tools[0];
    expect(t.diameter).toBe(6);
    expect(t.guid).toMatch(/^[0-9a-f]{8}-/); // guid still present from positional fallback
  });

  it("emits a header-only crib with a warning when nothing matches", () => {
    const out = gWizardToolCribExportEngine.export({ tools: [] });
    expect(out.tool_count).toBe(0);
    expect(out.warnings.some((w) => /no tools/i.test(w))).toBe(true);
    // Header row present, no tool rows.
    const lines = out.csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("guid");
    expect(lines[0]).toContain("diameter");
    expect(lines[0]).toContain("units");
    // Adapter reads zero tools (header-only).
    expect(roundTrip(out.csv).tools).toHaveLength(0);
  });

  it("exports multiple tools with sequential keys and distinct guids", () => {
    const tools = [
      { ...SANDVIK_ENDMILL, id: "a" },
      { ...SANDVIK_ENDMILL, id: "b" },
      { ...SANDVIK_ENDMILL, id: "c" },
    ];
    const out = gWizardToolCribExportEngine.export({ tools });
    expect(out.tool_count).toBe(3);
    const parsed = roundTrip(out.csv).tools;
    expect(parsed).toHaveLength(3);
    const guids = new Set(parsed.map((t) => t.guid));
    expect(guids.size).toBe(3); // all distinct
    expect(parsed.map((t) => t.key)).toEqual([1, 2, 3]); // sequential
  });

  it("falls back to the live catalog and honors max_tools, emitting exactly tool_count+header rows", () => {
    // toolCatalogEngine is a real singleton — this exercises the catalog path. It may return
    // 0 tools in a bare test env; the contract is concrete: never throw, row count must equal
    // tool_count plus the header line, and the cap must be honored.
    const out = gWizardToolCribExportEngine.export({ type: "end_mill", max_tools: 5 });
    const lines = out.csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
    expect(lines[0]).toContain("guid"); // header always first
    expect(out.tool_count).toBeLessThanOrEqual(5); // cap honored
    expect(lines.length).toBe(out.tool_count + 1); // header + one row per tool, exactly
  });

  it("is exported as a singleton and a constructable class", () => {
    expect(gWizardToolCribExportEngine).toBeInstanceOf(GWizardToolCribExportEngine);
    const fresh = new GWizardToolCribExportEngine();
    // Two independent instances derive the SAME deterministic guid — proves statelessness.
    expect(fresh.toolGuid("z")).toBe(gWizardToolCribExportEngine.toolGuid("z"));
  });
});
