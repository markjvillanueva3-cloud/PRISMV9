/**
 * LATHE-WIRE-MS0/U-LATHE-ALARM-WIRE — real-behavior tests for the lathe alarm-diagnostics surface.
 *
 * WIRING unit: exposes the EXISTING AlarmDiagnosticsEngine read methods on prism_turning (the lathe
 * fleet had ZERO alarm path). Tests drive the REAL shipped alarm DB (controller-alarm-database.json)
 * — codes are DERIVED from live OKUMA data (no hardcoded code that could rot), so a round-trip
 * lookup is a genuine intent check that fails if the data or the key-building drifts.
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { alarmDiagnosticsEngine as alarms } from "../engines/AlarmDiagnosticsEngine.js";

const ds = (...p: string[]) => path.resolve(__dirname, "..", ...p);

describe("U-LATHE-ALARM-WIRE — alarm DB read surface (real shipped data)", () => {
  it("getSummary reports a non-empty DB including the OKUMA controller (JM fleet)", () => {
    const s = alarms.getSummary();
    expect(s.totalAlarms).toBeGreaterThan(0);
    expect(Object.keys(s.controllers)).toContain("OKUMA");
    expect(s.controllers.OKUMA).toBeGreaterThan(0);
  });

  it("listControllers includes OKUMA with a positive alarm count", () => {
    const list = alarms.listControllers();
    const okuma = list.find((c) => c.controller === "OKUMA");
    expect(okuma?.controller).toBe("OKUMA");
    expect(okuma!.alarmCount).toBeGreaterThan(0);
  });

  it("getAlarmsByController('OKUMA') returns AlarmEntry rows carrying alarm_code + alarm_id", () => {
    const entries = alarms.getAlarmsByController("OKUMA");
    expect(entries.length).toBeGreaterThan(0);
    expect(typeof entries[0]?.alarm_code).toBe("string");
    expect(entries[0]!.alarm_code.length).toBeGreaterThan(0);
    expect(typeof entries[0]?.alarm_id).toBe("string");
  });

  it("lookupAlarm round-trips a real OKUMA code back to its own alarm_id", () => {
    const entry = alarms.getAlarmsByController("OKUMA")[0]!;
    const r = alarms.lookupAlarm("OKUMA", entry.alarm_code);
    expect(r).not.toBeNull();
    expect(r!.alarm.alarm_id).toBe(entry.alarm_id);
    // fix is FixProcedure | null — the field must be present (recovered via fix_procedure_id)
    expect(r!.fix === null || typeof r!.fix.fix_id === "string").toBe(true);
  });

  it("lookupAlarm controller match is case-insensitive ('okuma' === 'OKUMA')", () => {
    const entry = alarms.getAlarmsByController("OKUMA")[0]!;
    const lower = alarms.lookupAlarm("okuma", entry.alarm_code);
    expect(lower?.alarm.alarm_id).toBe(entry.alarm_id);
  });

  it("lookupAlarm returns null for a non-existent code (no fabricated hit)", () => {
    expect(alarms.lookupAlarm("OKUMA", "ZZ_NO_SUCH_CODE_99999")).toBeNull();
  });

  it("searchAlarms returns an array of lookup results, each carrying an alarm with a string alarm_id", () => {
    const hits = alarms.searchAlarms("spindle");
    expect(Array.isArray(hits)).toBe(true);
    for (const h of hits) expect(typeof h.alarm.alarm_id).toBe("string");
  });

  it("getFixProcedure + getDifficulty resolve for a real alarm's fix id", () => {
    const entry = alarms.getAlarmsByController("OKUMA")[0]!;
    const fix = alarms.getFixProcedure(entry.fix_procedure_id);
    expect(fix === null || typeof fix.fix_id === "string").toBe(true);
    // getDifficulty returns null when the alarm has no fix — assert the full contract (null OR valid shape)
    const diff = alarms.getDifficulty(entry.alarm_id);
    expect(
      diff === null ||
        (["OPERATOR", "MAINTENANCE", "SERVICE"].includes(diff.difficulty) && typeof diff.estimated_time_min === "number"),
    ).toBe(true);
  });
});

describe("U-LATHE-ALARM-WIRE — dispatcher + schema wiring", () => {
  it("turningDispatcher has ACTIONS entries + the grouped case for all 7 alarm actions", async () => {
    const src = await fsp.readFile(ds("tools", "dispatchers", "turningDispatcher.ts"), "utf8");
    for (const a of [
      "lathe_alarm_lookup",
      "lathe_alarm_search",
      "lathe_alarm_fix_procedure",
      "lathe_alarm_list_by_controller",
      "lathe_alarm_controllers",
      "lathe_alarm_difficulty",
      "lathe_alarm_summary",
    ]) {
      expect(src.includes(`"${a}",`)).toBe(true);
      expect(src.includes(`case "${a}":`)).toBe(true);
    }
    // controller defaults to OKUMA in the handler
    expect(src.includes('p.controller ?? "OKUMA"')).toBe(true);
  });

  it("schemas enforce required fields + accept the no-param actions", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const m = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;

    expect(m.lathe_alarm_lookup!.safeParse({ code: "1234" }).success).toBe(true); // controller optional
    expect(m.lathe_alarm_lookup!.safeParse({ controller: "OKUMA" }).success).toBe(false); // missing code
    expect(m.lathe_alarm_search!.safeParse({ query: "spindle" }).success).toBe(true);
    expect(m.lathe_alarm_search!.safeParse({}).success).toBe(false); // missing query
    expect(m.lathe_alarm_fix_procedure!.safeParse({ alarmId: "OKUMA-001" }).success).toBe(true);
    expect(m.lathe_alarm_fix_procedure!.safeParse({}).success).toBe(false); // missing alarmId
    expect(m.lathe_alarm_list_by_controller!.safeParse({}).success).toBe(true); // controller optional
    expect(m.lathe_alarm_controllers!.safeParse({}).success).toBe(true); // no params
    expect(m.lathe_alarm_summary!.safeParse({}).success).toBe(true); // no params
    expect(m.lathe_alarm_difficulty!.safeParse({ alarmId: "OKUMA-001" }).success).toBe(true);
    expect(m.lathe_alarm_difficulty!.safeParse(null).success).toBe(false);
  });
});
