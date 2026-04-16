/**
 * WEDM E-Pack Table Import Tests — U-W100-12
 *
 * Validates EPackTableImportEngine:
 *   1. JSON import format
 *   2. CSV import format
 *   3. Key-value (INI) import format
 *   4. Physics bounds validation
 *   5. Lookup and fallback chain
 *   6. Auto-detect format
 *   7. Edge cases (malformed input, missing fields)
 *
 * @module wedm-epack-import.test
 */
import { describe, it, expect, beforeEach } from "vitest";

const { EPackTableImportEngine } = await import("../engines/EPackTableImportEngine.js");

// ── Sample Data ───────────────────────────────────────
// Based on ITW SHAKEPROOF real program parameters

const SAMPLE_JSON = JSON.stringify({
  machine_model: "Mitsubishi MV1200S",
  entries: [
    { e_pack_code: "E1221", t_on_us: 4.0, t_off_us: 16.0, peak_current_A: 20, servo_voltage_V: 48, wire_speed_m_min: 8, wire_tension_N: 12, expected_feed_mm_min: 3.05 },
    { e_pack_code: "E1222", t_on_us: 2.0, t_off_us: 12.0, peak_current_A: 10, servo_voltage_V: 42, wire_speed_m_min: 10, wire_tension_N: 12, expected_feed_mm_min: 6.10 },
    { e_pack_code: "E1223", t_on_us: 1.0, t_off_us: 10.0, peak_current_A: 5, servo_voltage_V: 38, wire_speed_m_min: 10, wire_tension_N: 10, expected_feed_mm_min: 5.33 },
    { e_pack_code: "E1224", t_on_us: 0.5, t_off_us: 8.0, peak_current_A: 3, servo_voltage_V: 35, wire_speed_m_min: 8, wire_tension_N: 10, expected_feed_mm_min: 5.08 },
  ],
});

const SAMPLE_CSV = `e_pack_code,t_on_us,t_off_us,peak_current_A,servo_voltage_V,wire_speed_m_min,expected_feed_mm_min
E1221,4.0,16.0,20,48,8,3.05
E1222,2.0,12.0,10,42,10,6.10
E1223,1.0,10.0,5,38,10,5.33
E1224,0.5,8.0,3,35,8,5.08`;

const SAMPLE_TSV = `e_pack_code\tt_on_us\tt_off_us\tpeak_current_A
E1221\t4.0\t16.0\t20
E1222\t2.0\t12.0\t10`;

const SAMPLE_KV = `
# Mitsubishi MV1200S Technology Table
# Transcribed from machine screen 2026-04-01

[MACHINE]
MODEL=Mitsubishi MV1200S

[E1221]
ON=4.0
OFF=16.0
IP=20
SV=48
WF=8
WT=12
F=3.05

[E1222]
ON=2.0
OFF=12.0
IP=10
SV=42
WF=10
WT=12
F=6.10

[E1223]
ON=1.0
OFF=10.0
IP=5
SV=38
WF=10
WT=10

[E1224]
ON=0.5
OFF=8.0
IP=3
SV=35
WF=8
WT=10
`;

let engine: InstanceType<typeof EPackTableImportEngine>;

beforeEach(() => {
  engine = new EPackTableImportEngine();
});

// ============================================================================
// SUITE 1: JSON Import
// ============================================================================
describe("JSON import", () => {

  it("imports 4 entries from ITW SHAKEPROOF data", () => {
    const result = engine.importJSON(SAMPLE_JSON);
    expect(result.success).toBe(true);
    expect(result.valid_count).toBe(4);
    expect(result.invalid_count).toBe(0);
    expect(result.entries.length).toBe(4);
  });

  it("detects machine model from JSON", () => {
    const result = engine.importJSON(SAMPLE_JSON);
    expect(result.machine_model).toBe("Mitsubishi MV1200S");
    expect(engine.machineModel).toBe("Mitsubishi MV1200S");
  });

  it("parses E1221 pulse parameters correctly", () => {
    engine.importJSON(SAMPLE_JSON);
    const lookup = engine.lookup("E1221");
    expect(lookup.found).toBe(true);
    expect(lookup.entry!.t_on_us).toBe(4.0);
    expect(lookup.entry!.t_off_us).toBe(16.0);
    expect(lookup.entry!.peak_current_A).toBe(20);
    expect(lookup.entry!.servo_voltage_V).toBe(48);
    expect(lookup.entry!.wire_speed_m_min).toBe(8);
    expect(lookup.entry!.expected_feed_mm_min).toBe(3.05);
  });

  it("accepts bare array format (no wrapper object)", () => {
    const bareArray = JSON.stringify([
      { e_pack_code: "E1221", t_on_us: 4.0, t_off_us: 16.0, peak_current_A: 20 },
    ]);
    const result = engine.importJSON(bareArray);
    expect(result.success).toBe(true);
    expect(result.valid_count).toBe(1);
  });

  it("rejects invalid JSON", () => {
    const result = engine.importJSON("not json{{{");
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects JSON without entries array", () => {
    const result = engine.importJSON(JSON.stringify({ foo: "bar" }));
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// SUITE 2: CSV Import
// ============================================================================
describe("CSV import", () => {

  it("imports 4 entries from comma-separated data", () => {
    const result = engine.importCSV(SAMPLE_CSV);
    expect(result.success).toBe(true);
    expect(result.valid_count).toBe(4);
  });

  it("imports from tab-separated data", () => {
    const result = engine.importCSV(SAMPLE_TSV);
    expect(result.success).toBe(true);
    expect(result.valid_count).toBe(2);
  });

  it("skips comment lines starting with #", () => {
    const csvWithComments = `# This is a comment
e_pack_code,t_on_us,t_off_us,peak_current_A
E1221,4.0,16.0,20`;
    const result = engine.importCSV(csvWithComments);
    expect(result.success).toBe(true);
    expect(result.valid_count).toBe(1);
  });

  it("rejects CSV with insufficient rows", () => {
    const result = engine.importCSV("e_pack_code,t_on_us,t_off_us,peak_current_A");
    expect(result.success).toBe(false);
  });

  it("parsed values match expected numerics", () => {
    engine.importCSV(SAMPLE_CSV);
    const entry = engine.lookup("E1222");
    expect(entry.found).toBe(true);
    expect(entry.entry!.t_on_us).toBe(2.0);
    expect(entry.entry!.peak_current_A).toBe(10);
  });
});

// ============================================================================
// SUITE 3: Key-Value (INI) Import
// ============================================================================
describe("Key-value import", () => {

  it("imports 4 entries from INI-style blocks", () => {
    const result = engine.importKeyValue(SAMPLE_KV);
    expect(result.success).toBe(true);
    expect(result.valid_count).toBe(4);
  });

  it("detects machine model from [MACHINE] block", () => {
    const result = engine.importKeyValue(SAMPLE_KV);
    expect(result.machine_model).toBe("Mitsubishi MV1200S");
  });

  it("maps ON/OFF/IP keys to standard fields", () => {
    engine.importKeyValue(SAMPLE_KV);
    const entry = engine.lookup("E1221");
    expect(entry.found).toBe(true);
    expect(entry.entry!.t_on_us).toBe(4.0);
    expect(entry.entry!.t_off_us).toBe(16.0);
    expect(entry.entry!.peak_current_A).toBe(20);
  });

  it("maps Sodick-style keys (TON/TOFF/IAP)", () => {
    const sodickKV = `[E1221]
TON=4.0
TOFF=16.0
IAP=20
VSR=48`;
    engine.importKeyValue(sodickKV);
    const entry = engine.lookup("E1221");
    expect(entry.found).toBe(true);
    expect(entry.entry!.t_on_us).toBe(4.0);
    expect(entry.entry!.servo_voltage_V).toBe(48);
  });

  it("skips comment lines (# and ;)", () => {
    const kvWithComments = `; Machine params
# More comments
[E1221]
ON=4.0
OFF=16.0
IP=20`;
    const result = engine.importKeyValue(kvWithComments);
    expect(result.success).toBe(true);
    expect(result.valid_count).toBe(1);
  });
});

// ============================================================================
// SUITE 4: Physics Bounds Validation
// ============================================================================
describe("Physics bounds validation", () => {

  it("rejects t_on_us outside [0.1, 50] µs", () => {
    const result = engine.importJSON(JSON.stringify([
      { e_pack_code: "E1221", t_on_us: 100, t_off_us: 16, peak_current_A: 20 },
    ]));
    expect(result.valid_count).toBe(0);
    expect(result.errors.length).toBe(1);
  });

  it("rejects peak_current_A outside [0.5, 60] A", () => {
    const result = engine.importJSON(JSON.stringify([
      { e_pack_code: "E1221", t_on_us: 4, t_off_us: 16, peak_current_A: 100 },
    ]));
    expect(result.valid_count).toBe(0);
  });

  it("rejects t_off_us outside [1, 100] µs", () => {
    const result = engine.importJSON(JSON.stringify([
      { e_pack_code: "E1221", t_on_us: 4, t_off_us: 200, peak_current_A: 20 },
    ]));
    expect(result.valid_count).toBe(0);
  });

  it("accepts values at physics boundaries", () => {
    const result = engine.importJSON(JSON.stringify([
      { e_pack_code: "E1221", t_on_us: 0.1, t_off_us: 1, peak_current_A: 0.5 },
      { e_pack_code: "E1222", t_on_us: 50, t_off_us: 100, peak_current_A: 60 },
    ]));
    expect(result.valid_count).toBe(2);
  });

  it("rejects invalid E-pack code format", () => {
    const result = engine.importJSON(JSON.stringify([
      { e_pack_code: "X9999", t_on_us: 4, t_off_us: 16, peak_current_A: 20 },
    ]));
    expect(result.valid_count).toBe(0);
    expect(result.errors[0]).toContain("Invalid E-pack format");
  });

  it("rejects missing required fields", () => {
    const result = engine.importJSON(JSON.stringify([
      { e_pack_code: "E1221", t_on_us: 4 }, // missing t_off and current
    ]));
    expect(result.valid_count).toBe(0);
    expect(result.errors[0]).toContain("Missing required");
  });
});

// ============================================================================
// SUITE 5: Lookup and Fallback
// ============================================================================
describe("Lookup and fallback chain", () => {

  it("returns found=true for imported entry", () => {
    engine.importJSON(SAMPLE_JSON);
    const result = engine.lookup("E1221");
    expect(result.found).toBe(true);
    expect(result.source).toBe("imported");
  });

  it("returns found=false for non-imported code", () => {
    engine.importJSON(SAMPLE_JSON);
    const result = engine.lookup("E9999");
    expect(result.found).toBe(false);
    expect(result.source).toBe("not_found");
  });

  it("getAll returns all imported entries", () => {
    engine.importJSON(SAMPLE_JSON);
    expect(engine.getAll().length).toBe(4);
  });

  it("count property tracks imported entries", () => {
    expect(engine.count).toBe(0);
    engine.importJSON(SAMPLE_JSON);
    expect(engine.count).toBe(4);
  });

  it("clear removes all imported data", () => {
    engine.importJSON(SAMPLE_JSON);
    expect(engine.count).toBe(4);
    engine.clear();
    expect(engine.count).toBe(0);
    expect(engine.machineModel).toBeUndefined();
  });

  it("subsequent imports merge entries", () => {
    engine.importJSON(JSON.stringify([
      { e_pack_code: "E1221", t_on_us: 4, t_off_us: 16, peak_current_A: 20 },
    ]));
    expect(engine.count).toBe(1);

    engine.importJSON(JSON.stringify([
      { e_pack_code: "E1222", t_on_us: 2, t_off_us: 12, peak_current_A: 10 },
    ]));
    expect(engine.count).toBe(2);
  });

  it("duplicate E-pack code overwrites previous entry", () => {
    engine.importJSON(JSON.stringify([
      { e_pack_code: "E1221", t_on_us: 4, t_off_us: 16, peak_current_A: 20 },
    ]));
    engine.importJSON(JSON.stringify([
      { e_pack_code: "E1221", t_on_us: 3.5, t_off_us: 14, peak_current_A: 18 },
    ]));
    expect(engine.count).toBe(1);
    expect(engine.lookup("E1221").entry!.t_on_us).toBe(3.5);
  });
});

// ============================================================================
// SUITE 6: Auto-Detect Format
// ============================================================================
describe("Auto-detect format", () => {

  it("detects JSON by content", () => {
    const result = engine.importAuto(SAMPLE_JSON);
    expect(result.success).toBe(true);
    expect(result.valid_count).toBe(4);
  });

  it("detects JSON by filename", () => {
    const result = engine.importAuto(SAMPLE_JSON, "tech_table.json");
    expect(result.success).toBe(true);
  });

  it("detects CSV by filename", () => {
    const result = engine.importAuto(SAMPLE_CSV, "conditions.csv");
    expect(result.success).toBe(true);
    expect(result.valid_count).toBe(4);
  });

  it("detects key-value by [E content", () => {
    const result = engine.importAuto(SAMPLE_KV);
    expect(result.success).toBe(true);
    expect(result.valid_count).toBe(4);
  });

  it("detects CSV by header keywords", () => {
    const result = engine.importAuto(SAMPLE_CSV);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// SUITE 7: Edge Cases
// ============================================================================
describe("Edge cases", () => {

  it("handles empty string input gracefully", () => {
    const result = engine.importJSON("");
    expect(result.success).toBe(false);
  });

  it("handles entries with extra unknown fields", () => {
    const result = engine.importJSON(JSON.stringify([
      { e_pack_code: "E1221", t_on_us: 4, t_off_us: 16, peak_current_A: 20, unknown_field: 999 },
    ]));
    expect(result.success).toBe(true);
    expect(result.valid_count).toBe(1);
  });

  it("optional fields are undefined when not provided", () => {
    engine.importJSON(JSON.stringify([
      { e_pack_code: "E1221", t_on_us: 4, t_off_us: 16, peak_current_A: 20 },
    ]));
    const entry = engine.lookup("E1221").entry!;
    expect(entry.servo_voltage_V).toBeUndefined();
    expect(entry.wire_speed_m_min).toBeUndefined();
    expect(entry.capacitance_nF).toBeUndefined();
  });

  it("mixed valid and invalid entries reports both counts", () => {
    const result = engine.importJSON(JSON.stringify([
      { e_pack_code: "E1221", t_on_us: 4, t_off_us: 16, peak_current_A: 20 },   // valid
      { e_pack_code: "E1222", t_on_us: 999, t_off_us: 16, peak_current_A: 20 },  // invalid t_on
      { e_pack_code: "E1223", t_on_us: 1, t_off_us: 10, peak_current_A: 5 },     // valid
    ]));
    expect(result.valid_count).toBe(2);
    expect(result.invalid_count).toBe(1);
    expect(result.success).toBe(false); // has errors
  });

  it("semicolon-delimited CSV works", () => {
    const semiCSV = `e_pack_code;t_on_us;t_off_us;peak_current_A
E1221;4.0;16.0;20`;
    const result = engine.importCSV(semiCSV);
    expect(result.success).toBe(true);
    expect(result.valid_count).toBe(1);
  });
});
