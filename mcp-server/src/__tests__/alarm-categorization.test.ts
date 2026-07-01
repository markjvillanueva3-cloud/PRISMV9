// npx vitest run src/__tests__/alarm-categorization.test.ts
// Real-value assertions on the AlarmDB categorization axis + the shared controller-family axis.
// Values anchored to the live corpus (MASTER_ALARM_DATABASE_v3.json): 12 real families incl.
// DOOSAN/DMG_MORI, 1210/2511 controller_family="undefined" recoverable via the `family` field,
// 52 categories folded to a closed canonical set.
import { describe, it, expect } from "vitest";
import {
  CONTROLLER_FAMILY, ControllerFamilySchema, normalizeControllerFamily,
} from "../data/controller-family.js";
import {
  ALARM_CATEGORY, ALARM_SEVERITY, MACHINE_STOPPAGE,
  AlarmCategorySchema, normalizeAlarmCategory, normalizeSeverity, normalizeMachineStoppage,
  resolveControllerFamilyRaw, categorizeAlarm,
} from "../data/alarm-categorization.js";

describe("controller-family taxonomy — superset of schema + live data", () => {
  it("contains the 12 families present in the corpus PLUS NUM/CENTROID/MACH/OTHER", () => {
    const fams: readonly string[] = CONTROLLER_FAMILY;
    for (const f of ["FANUC", "SIEMENS", "HAAS", "HEIDENHAIN", "OKUMA", "MAZAK", "MITSUBISHI", "BROTHER", "HURCO", "FAGOR", "DMG_MORI", "DOOSAN"]) {
      expect(fams.includes(f)).toBe(true);
    }
    expect(CONTROLLER_FAMILY.length).toBe(16);
    // DOOSAN + DMG_MORI were the two the ALARM_SCHEMA.json enum omitted but the data carries
    expect(fams.includes("DOOSAN")).toBe(true);
    expect(fams.includes("DMG_MORI")).toBe(true);
  });
});

describe("normalizeControllerFamily — folds free-text / spaced / model-suffixed brands", () => {
  it("exact canonical (any case) round-trips", () => {
    expect(normalizeControllerFamily("FANUC")).toBe("FANUC");
    expect(normalizeControllerFamily("fanuc")).toBe("FANUC");
    expect(normalizeControllerFamily("Okuma")).toBe("OKUMA");
  });
  it("spaced / punctuated DMG MORI variants → DMG_MORI", () => {
    expect(normalizeControllerFamily("DMG MORI")).toBe("DMG_MORI");
    expect(normalizeControllerFamily("dmg-mori")).toBe("DMG_MORI");
    expect(normalizeControllerFamily("DMGMORI")).toBe("DMG_MORI");
    expect(normalizeControllerFamily("CELOS")).toBe("DMG_MORI");
  });
  it("model-suffixed names fold to the brand", () => {
    expect(normalizeControllerFamily("Fanuc 30i")).toBe("FANUC");
    expect(normalizeControllerFamily("fanuc0i-MF")).toBe("FANUC");
    expect(normalizeControllerFamily("Sinumerik 840D")).toBe("SIEMENS");
    expect(normalizeControllerFamily("OSP-P300")).toBe("OKUMA");
    expect(normalizeControllerFamily("Mazatrol SmoothX")).toBe("MAZAK");
    expect(normalizeControllerFamily("TNC 640")).toBe("HEIDENHAIN");
    expect(normalizeControllerFamily("Haas NGC")).toBe("HAAS");
    expect(normalizeControllerFamily("WinMax")).toBe("HURCO");
    expect(normalizeControllerFamily("Meldas")).toBe("MITSUBISHI");
  });
  it("3-letter alarm_id abbreviations fold to the brand (exact-keyed, no prefix collisions)", () => {
    expect(normalizeControllerFamily("FAN")).toBe("FANUC");
    expect(normalizeControllerFamily("OKU")).toBe("OKUMA");
    expect(normalizeControllerFamily("MAZ")).toBe("MAZAK");
    expect(normalizeControllerFamily("BRO")).toBe("BROTHER");
    expect(normalizeControllerFamily("HEI")).toBe("HEIDENHAIN");
    // the abbreviation must NOT break the full name (exact-key "bro" doesn't shadow "brother")
    expect(normalizeControllerFamily("Brother")).toBe("BROTHER");
    expect(normalizeControllerFamily("FAGOR")).toBe("FAGOR"); // "fag" exact-key doesn't swallow "fagor"
  });
  it("the literal corpus garbage value 'undefined' and empties → null (NOT coerced to OTHER)", () => {
    expect(normalizeControllerFamily("undefined")).toBe(null);
    expect(normalizeControllerFamily("")).toBe(null);
    expect(normalizeControllerFamily(null)).toBe(null);
    expect(normalizeControllerFamily(42)).toBe(null);
    expect(normalizeControllerFamily("ACME-9000")).toBe(null); // genuinely unknown brand
  });
  it("does NOT auto-bucket unknown brands to OTHER (fail-loud — caller decides)", () => {
    expect(normalizeControllerFamily("ACME-9000")).not.toBe("OTHER");
  });
});

describe("normalizeAlarmCategory — folds the 52 corpus strays into the closed canonical set", () => {
  it("exact canonical round-trips", () => {
    expect(normalizeAlarmCategory("SERVO")).toBe("SERVO");
    expect(normalizeAlarmCategory("spindle")).toBe("SPINDLE");
    expect(normalizeAlarmCategory("ATC")).toBe("ATC");
  });
  it("documented folds map to their canonical parent", () => {
    expect(normalizeAlarmCategory("OVERHEAT")).toBe("THERMAL");
    expect(normalizeAlarmCategory("PMC")).toBe("PLC");
    expect(normalizeAlarmCategory("AMPLIFIER")).toBe("DRIVE");
    expect(normalizeAlarmCategory("PROBING")).toBe("PROBE");
    expect(normalizeAlarmCategory("NETWORK")).toBe("COMMUNICATION");
    expect(normalizeAlarmCategory("LATHE")).toBe("MACHINE");
    expect(normalizeAlarmCategory("MILLTURN")).toBe("MACHINE");
    expect(normalizeAlarmCategory("CYCLE")).toBe("PROGRAM");
    expect(normalizeAlarmCategory("CONFIGURATION")).toBe("PARAMETER");
    expect(normalizeAlarmCategory("ELECTRICAL")).toBe("POWER");
  });
  it("an unrecognized stray → null (surfaced, not silently bucketed)", () => {
    expect(normalizeAlarmCategory("CHIP")).toBe(null);
    expect(normalizeAlarmCategory("UNDEFINED")).toBe(null);
    expect(normalizeAlarmCategory("")).toBe(null);
    expect(normalizeAlarmCategory(123)).toBe(null);
  });
});

describe("normalizeSeverity / normalizeMachineStoppage — ordinals", () => {
  it("severity exact + aliases", () => {
    expect(normalizeSeverity("CRITICAL")).toBe("CRITICAL");
    expect(normalizeSeverity("high")).toBe("HIGH");
    expect(normalizeSeverity("FATAL")).toBe("CRITICAL");
    expect(normalizeSeverity("warning")).toBe("MEDIUM");
    expect(normalizeSeverity("information")).toBe("INFO");
    expect(normalizeSeverity("bogus")).toBe(null);
  });
  it("machine-stoppage with separator tolerance", () => {
    expect(normalizeMachineStoppage("IMMEDIATE")).toBe("IMMEDIATE");
    expect(normalizeMachineStoppage("warning only")).toBe("WARNING_ONLY");
    expect(normalizeMachineStoppage("controlled")).toBe("CONTROLLED");
    expect(normalizeMachineStoppage("explode")).toBe(null);
  });
  it("the ordinal lists match the schema exactly", () => {
    expect([...ALARM_SEVERITY]).toEqual(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]);
    expect([...MACHINE_STOPPAGE]).toEqual(["IMMEDIATE", "CONTROLLED", "WARNING_ONLY", "NONE"]);
  });
});

describe("resolveControllerFamilyRaw — recovers the 1210 'undefined' via family / alarm_id", () => {
  it("prefers controller_family when present", () => {
    expect(resolveControllerFamilyRaw({ controller_family: "MAZAK", family: "FANUC" })).toBe("MAZAK");
  });
  it("falls back to `family` when controller_family is the literal 'undefined' string", () => {
    expect(resolveControllerFamilyRaw({ controller_family: "undefined", family: "DOOSAN" })).toBe("DOOSAN");
  });
  it("last-resort: extracts brand token from alarm_id — full names AND 3-letter abbreviations", () => {
    expect(resolveControllerFamilyRaw({ alarm_id: "ALM-FANUC-0000" })).toBe("FANUC");
    expect(resolveControllerFamilyRaw({ controller_family: "undefined", alarm_id: "ALM-DMG_MORI-12" })).toBe("DMG_MORI");
    // the abbreviated corpus format ALM-FAN-000 / ALM-OKU-186 (token then normalized by the family alias)
    expect(resolveControllerFamilyRaw({ controller_family: "undefined", alarm_id: "ALM-FAN-000" })).toBe("FAN");
    expect(normalizeControllerFamily(resolveControllerFamilyRaw({ alarm_id: "ALM-OKU-186" }))).toBe("OKUMA");
  });
  it("nothing recoverable → undefined", () => {
    expect(resolveControllerFamilyRaw({ controller_family: "undefined" })).toBe(undefined);
    expect(resolveControllerFamilyRaw({})).toBe(undefined);
  });
});

describe("categorizeAlarm — end-to-end record categorization", () => {
  it("a fully-populated record → high confidence, all axes canonical", () => {
    expect(categorizeAlarm({ controller_family: "FANUC", category: "SERVO", severity: "CRITICAL" })).toMatchObject({
      controllerFamily: "FANUC", category: "SERVO", severity: "CRITICAL", confidence: "high",
    });
  });
  it("recovers family from `family` field when controller_family is 'undefined' (the 48% case)", () => {
    expect(categorizeAlarm({ controller_family: "undefined", family: "DMG MORI", category: "ATC", severity: "HIGH" })).toMatchObject({
      controllerFamily: "DMG_MORI", category: "ATC", severity: "HIGH", confidence: "high",
    });
  });
  it("recovers family from an abbreviated alarm_id when controller_family AND family are absent", () => {
    expect(categorizeAlarm({ controller_family: "undefined", alarm_id: "ALM-OKU-186", category: "SERVO", severity: "HIGH" })).toMatchObject({
      controllerFamily: "OKUMA", category: "SERVO", severity: "HIGH", confidence: "high",
    });
  });
  it("folds an off-schema category on the way through (OVERHEAT → THERMAL)", () => {
    expect(categorizeAlarm({ controller_family: "OKUMA", category: "OVERHEAT", severity: "MEDIUM" }).category).toBe("THERMAL");
  });
  it("unrecoverable family → controllerFamily null, confidence reflects partial resolution (NOT high)", () => {
    const r = categorizeAlarm({ controller_family: "undefined", category: "SPINDLE", severity: "LOW" });
    expect(r.controllerFamily).toBe(null);
    expect(r.category).toBe("SPINDLE");
    expect(r.confidence).toBe("medium"); // category+severity resolved, family did not → not high, not low
  });
  it("nothing resolves → all null, confidence low (fail-loud, never throws)", () => {
    expect(categorizeAlarm({ controller_family: "undefined", category: "CHIP", severity: "bogus" })).toMatchObject({
      controllerFamily: null, category: null, severity: null, confidence: "low",
    });
  });
  it("string input is treated as the controller family", () => {
    expect(categorizeAlarm("Mazatrol").controllerFamily).toBe("MAZAK");
  });
  it("machine_stoppage is read when present and omitted otherwise", () => {
    expect(categorizeAlarm({ controller_family: "HAAS", machine_stoppage: "warning only" }).machineStoppage).toBe("WARNING_ONLY");
    expect(categorizeAlarm({ controller_family: "HAAS" }).machineStoppage).toBe(undefined);
  });
  it("every result validates against the schema (round-trip integrity)", () => {
    for (const rec of [
      { controller_family: "FANUC", category: "SERVO", severity: "CRITICAL" },
      { controller_family: "undefined", family: "DOOSAN", category: "OVERHEAT", severity: "warning" },
      { controller_family: "ZZZ", category: "CHIP", severity: "bogus" },
    ]) {
      expect(() => AlarmCategorySchema.parse(categorizeAlarm(rec))).not.toThrow();
    }
  });
  it("enum constants stable + schema accepts a categorize() result verbatim", () => {
    expect((ALARM_CATEGORY as readonly string[]).includes("THERMAL")).toBe(true);
    expect(ControllerFamilySchema.parse("DMG_MORI")).toBe("DMG_MORI");
    expect(AlarmCategorySchema.parse(categorizeAlarm({ controller_family: "FANUC", category: "SERVO", severity: "HIGH" })).controllerFamily).toBe("FANUC");
  });
});
