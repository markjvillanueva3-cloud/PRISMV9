/**
 * tz-sanity.test.ts — CLEANUP-MS0 / U-CLEANUP-TZ-HELPER
 *
 * Every assertion below tests a concrete observable value or pattern of the
 * tz-sanity helper. No presence-only stubs; no `toBeDefined`-style asserts.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  isUtcIso,
  assertUtcIso,
  classifyTimestamp,
  scanJsonlForNonUtc,
  tzMarker,
  hasTzMarker,
  formatUtcAndLocal,
  parseArgs,
  DEFAULT_TIMESTAMP_FIELDS,
} from "../../../scripts/tz-sanity.mjs";

describe("isUtcIso", () => {
  it("accepts canonical UTC-Z ISO strings (no millis, millis, microsecond)", () => {
    expect(isUtcIso("2026-05-13T22:35:51Z")).toBe(true);
    expect(isUtcIso("2026-05-13T22:35:51.123Z")).toBe(true);
    expect(isUtcIso("2026-05-13T22:35:51.000000Z")).toBe(true);
  });

  it("rejects ISO strings with +/- numeric offsets", () => {
    expect(isUtcIso("2026-05-13T22:35:51+00:00")).toBe(false);
    expect(isUtcIso("2026-05-13T22:35:51-07:00")).toBe(false);
    expect(isUtcIso("2026-05-13T22:35:51.123+0000")).toBe(false);
  });

  it("rejects ISO missing any timezone suffix", () => {
    expect(isUtcIso("2026-05-13T22:35:51")).toBe(false);
  });

  it("rejects non-string inputs with a deterministic false", () => {
    const cases: unknown[] = [undefined, null, 1747173351000, { z: "2026-05-13T22:35:51Z" }, []];
    const results = cases.map((v) => isUtcIso(v));
    expect(results).toEqual([false, false, false, false, false]);
  });

  it("rejects strings that look date-shaped but aren't ISO-Z", () => {
    expect(isUtcIso("2026-05-13")).toBe(false);
    expect(isUtcIso("not a date Z")).toBe(false);
    expect(isUtcIso("")).toBe(false);
  });
});

describe("assertUtcIso", () => {
  it("does not throw on valid UTC-Z", () => {
    let threw = false;
    try { assertUtcIso("2026-05-13T22:35:51Z"); } catch { threw = true; }
    expect(threw).toBe(false);
  });

  it("throws an Error containing the label on offset ISO", () => {
    let caught = "";
    try { assertUtcIso("2026-05-13T22:35:51-07:00", "claimedAt"); }
    catch (e: any) { caught = e.message; }
    expect(caught).toMatch(/claimedAt/);
    expect(caught).toMatch(/not UTC-Z/);
    expect(caught).toContain("2026-05-13T22:35:51-07:00");
  });

  it("throws an Error containing the value on non-string input", () => {
    let caught = "";
    try { assertUtcIso(12345, "ts"); }
    catch (e: any) { caught = e.message; }
    expect(caught).toMatch(/ts/);
    expect(caught).toMatch(/not UTC-Z/);
    expect(caught).toContain("12345");
  });
});

describe("classifyTimestamp", () => {
  it("returns 'ok' for UTC-Z, 'offset' for offset ISO", () => {
    expect(classifyTimestamp("2026-05-13T22:35:51Z")).toBe("ok");
    expect(classifyTimestamp("2026-05-13T22:35:51.123Z")).toBe("ok");
    expect(classifyTimestamp("2026-05-13T22:35:51+00:00")).toBe("offset");
    expect(classifyTimestamp("2026-05-13T22:35:51-0700")).toBe("offset");
  });

  it("returns 'local' for Date.toString()-style strings", () => {
    expect(classifyTimestamp("Tue May 13 2026 14:35:51 GMT-0700 (PDT)")).toBe("local");
  });

  it("returns 'unix' for plausible epoch seconds and millis", () => {
    expect(classifyTimestamp(1747173351)).toBe("unix");
    expect(classifyTimestamp(1747173351000)).toBe("unix");
  });

  it("returns 'non-timestamp' for arbitrary inputs", () => {
    expect(classifyTimestamp("hello world")).toBe("non-timestamp");
    expect(classifyTimestamp(42)).toBe("non-timestamp");
    expect(classifyTimestamp(null)).toBe("non-timestamp");
    expect(classifyTimestamp(1234567)).toBe("non-timestamp");
  });
});

describe("scanJsonlForNonUtc", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "tz-sanity-")); });
  afterEach(() => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* tolerate */ } });

  function writeJsonl(name: string, lines: unknown[]): string {
    const p = join(dir, name);
    writeFileSync(p, lines.map((o) => JSON.stringify(o)).join("\n") + "\n", "utf-8");
    return p;
  }

  it("reports readError='file-missing' for an absent path", async () => {
    const r = await scanJsonlForNonUtc(join(dir, "does-not-exist.jsonl"));
    expect(r.readError).toBe("file-missing");
    expect(r.violations).toHaveLength(0);
    expect(r.linesScanned).toBe(0);
  });

  it("returns null readError + zero lines for an empty file", async () => {
    const p = join(dir, "empty.jsonl");
    writeFileSync(p, "", "utf-8");
    const r = await scanJsonlForNonUtc(p);
    expect(r.readError).toBe(null);
    expect(r.linesScanned).toBe(0);
    expect(r.violations).toHaveLength(0);
  });

  it("counts every line and reports zero violations for an all-UTC-Z file", async () => {
    const p = writeJsonl("clean.jsonl", [
      { ts: "2026-05-13T22:35:51Z", msg: "hello" },
      { ts: "2026-05-13T22:36:51.123Z", recorded_at: "2026-05-13T22:36:51.123Z" },
    ]);
    const r = await scanJsonlForNonUtc(p);
    expect(r.linesScanned).toBe(2);
    expect(r.violations).toHaveLength(0);
    expect(r.readError).toBe(null);
  });

  it("flags offset ISO on both ts and recorded_at fields", async () => {
    const p = writeJsonl("offset.jsonl", [
      { ts: "2026-05-13T22:35:51+00:00", msg: "bad" },
      { ts: "2026-05-13T22:35:51Z", recorded_at: "2026-05-13T22:35:51-0700" },
    ]);
    const r = await scanJsonlForNonUtc(p);
    expect(r.violations).toHaveLength(2);
    expect(r.violations[0].lineNo).toBe(1);
    expect(r.violations[0].field).toBe("ts");
    expect(r.violations[0].kind).toBe("offset");
    expect(r.violations[0].value).toBe("2026-05-13T22:35:51+00:00");
    expect(r.violations[1].lineNo).toBe(2);
    expect(r.violations[1].field).toBe("recorded_at");
    expect(r.violations[1].kind).toBe("offset");
    expect(r.violations[1].value).toBe("2026-05-13T22:35:51-0700");
  });

  it("flags Date.toString()-style strings as 'local'", async () => {
    const p = writeJsonl("local.jsonl", [
      { ts: "Tue May 13 2026 14:35:51 GMT-0700 (PDT)" },
    ]);
    const r = await scanJsonlForNonUtc(p);
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0].kind).toBe("local");
    expect(r.violations[0].value).toBe("Tue May 13 2026 14:35:51 GMT-0700 (PDT)");
    expect(r.violations[0].lineNo).toBe(1);
  });

  it("flags both ms-since-epoch and s-since-epoch numeric values", async () => {
    const p = writeJsonl("unix.jsonl", [
      { ts: 1747173351000 },
      { recorded_at: 1747173351 },
    ]);
    const r = await scanJsonlForNonUtc(p);
    expect(r.violations).toHaveLength(2);
    expect(r.violations[0].kind).toBe("unix");
    expect(r.violations[0].value).toBe(1747173351000);
    expect(r.violations[1].kind).toBe("unix");
    expect(r.violations[1].value).toBe(1747173351);
  });

  it("does NOT flag arbitrary strings landing in a timestamp field (false-positive guard)", async () => {
    const p = writeJsonl("noise.jsonl", [
      { ts: "n/a" },
      { recorded_at: "" },
      { ts: "pending" },
    ]);
    const r = await scanJsonlForNonUtc(p);
    expect(r.linesScanned).toBe(3);
    expect(r.violations).toHaveLength(0);
  });

  it("respects a caller-supplied fields list (ignores default fields outside it)", async () => {
    const p = writeJsonl("custom.jsonl", [
      { whenLocal: "Tue May 13 2026 14:35:51 GMT-0700 (PDT)" },
      { ts: "2026-05-13T22:35:51+00:00" },
    ]);
    const r = await scanJsonlForNonUtc(p, { fields: ["whenLocal"] });
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0].field).toBe("whenLocal");
    expect(r.violations[0].kind).toBe("local");
  });

  it("honors maxViolations and stops at the cap", async () => {
    const lines: any[] = [];
    for (let i = 0; i < 20; i++) lines.push({ ts: "2026-05-13T22:35:51+00:00" });
    const p = writeJsonl("cap.jsonl", lines);
    const r = await scanJsonlForNonUtc(p, { maxViolations: 5 });
    expect(r.violations).toHaveLength(5);
    expect(r.linesScanned).toBeLessThanOrEqual(5);
  });

  it("honors maxLines (no violations beyond the line cap)", async () => {
    const lines: any[] = [];
    for (let i = 0; i < 10; i++) lines.push({ ts: "2026-05-13T22:35:51+00:00" });
    const p = writeJsonl("max-lines.jsonl", lines);
    const r = await scanJsonlForNonUtc(p, { maxLines: 3, maxViolations: 0 });
    expect(r.linesScanned).toBeLessThanOrEqual(3);
    expect(r.violations.length).toBeLessThanOrEqual(3);
  });

  it("skips malformed JSON lines and continues scanning subsequent lines", async () => {
    const p = join(dir, "malformed.jsonl");
    writeFileSync(p,
      '{"ts":"2026-05-13T22:35:51Z"}\n' +
      'NOT JSON\n' +
      '{"ts":"2026-05-13T22:35:51+00:00"}\n',
      "utf-8");
    const r = await scanJsonlForNonUtc(p);
    expect(r.linesScanned).toBe(3);
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0].lineNo).toBe(3);
    expect(r.violations[0].kind).toBe("offset");
  });

  it("tolerates CRLF line endings", async () => {
    const p = join(dir, "crlf.jsonl");
    writeFileSync(p,
      '{"ts":"2026-05-13T22:35:51Z"}\r\n{"ts":"2026-05-13T22:35:51+00:00"}\r\n',
      "utf-8");
    const r = await scanJsonlForNonUtc(p);
    expect(r.linesScanned).toBe(2);
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0].lineNo).toBe(2);
  });

  it("tolerates a BOM on the first line", async () => {
    const p = join(dir, "bom.jsonl");
    writeFileSync(p, "﻿" + '{"ts":"2026-05-13T22:35:51+00:00"}\n', "utf-8");
    const r = await scanJsonlForNonUtc(p);
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0].kind).toBe("offset");
  });

  it("exports a non-empty frozen DEFAULT_TIMESTAMP_FIELDS list covering known schemas", () => {
    expect(Array.isArray(DEFAULT_TIMESTAMP_FIELDS)).toBe(true);
    expect(DEFAULT_TIMESTAMP_FIELDS.length).toBeGreaterThanOrEqual(10);
    expect(Object.isFrozen(DEFAULT_TIMESTAMP_FIELDS)).toBe(true);
    expect(DEFAULT_TIMESTAMP_FIELDS).toContain("ts");
    expect(DEFAULT_TIMESTAMP_FIELDS).toContain("claimed_at");      // H8 coord store
    expect(DEFAULT_TIMESTAMP_FIELDS).toContain("lastHeartbeat");   // chat-slots
    expect(DEFAULT_TIMESTAMP_FIELDS).toContain("generatedAt");     // dashboards
  });
});

describe("tzMarker / hasTzMarker", () => {
  it("emits a comment containing 'timeBasis: UTC' and a Z-suffixed generatedAt", () => {
    const m = tzMarker();
    expect(m).toMatch(/<!--\s*timeBasis:\s*UTC/);
    expect(m).toMatch(/generatedAt: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    expect(m).toMatch(/-->\s*$/);
  });

  it("honors caller-supplied generatedAt when it is UTC-Z", () => {
    const m = tzMarker({ generatedAt: "2026-05-13T22:35:51Z" });
    expect(m).toContain("2026-05-13T22:35:51Z");
    expect(m).toContain("timeBasis: UTC");
  });

  it("rejects a non-UTC generatedAt and falls back to a fresh UTC-Z one", () => {
    const m = tzMarker({ generatedAt: "Tue May 13 2026 14:35:51 GMT-0700 (PDT)" });
    expect(m).not.toContain("PDT");
    expect(m).not.toContain("GMT-0700");
    expect(m).toMatch(/generatedAt: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
  });

  it("hasTzMarker detects the marker (positive case)", () => {
    const md = "# Dashboard\n" + tzMarker({ generatedAt: "2026-05-13T22:35:51Z" }) + "\n\nbody";
    expect(hasTzMarker(md)).toBe(true);
  });

  it("hasTzMarker returns false for plain markdown / empty / null", () => {
    expect(hasTzMarker("# Dashboard\nbody")).toBe(false);
    expect(hasTzMarker("")).toBe(false);
    expect(hasTzMarker(null as any)).toBe(false);
  });

  it("hasTzMarker is case-insensitive on the UTC token", () => {
    expect(hasTzMarker("<!-- timeBasis: utc -->")).toBe(true);
    expect(hasTzMarker("<!-- TIMEBASIS: UTC -->")).toBe(true);
  });
});

describe("formatUtcAndLocal", () => {
  it("renders UTC, local-in-UTC, and a composite display for a UTC-Z input", () => {
    const r = formatUtcAndLocal("2026-05-13T22:35:51Z", { timeZone: "UTC" });
    expect((r as any).utc).toBe("2026-05-13T22:35:51Z");
    const local = (r as any).local as string;
    expect(local).toMatch(/2026/);
    expect(local).toMatch(/22:35:51/);
    expect(local).toMatch(/UTC|GMT|Coordinated/);
    const display = (r as any).display as string;
    expect(display).toContain("2026-05-13T22:35:51Z");
    expect(display).toContain(local);
  });

  it("respects an IANA timeZone (LA PDT in May = UTC-7 → wall-clock 15:35:51)", () => {
    const r = formatUtcAndLocal("2026-05-13T22:35:51Z", { timeZone: "America/Los_Angeles" });
    const local = (r as any).local as string;
    expect(local).toMatch(/15:35:51/);
    expect(local).toMatch(/2026/);
    expect(local).toMatch(/PDT|PST|GMT-/);
  });

  it("returns an error shape on offset-suffixed input (echoes utc verbatim)", () => {
    const r = formatUtcAndLocal("2026-05-13T22:35:51-07:00") as any;
    expect(r.error).toBe("not-utc-iso");
    expect(r.utc).toBe("2026-05-13T22:35:51-07:00");
    expect("local" in r).toBe(false);
    expect("display" in r).toBe(false);
  });

  it("returns an error shape with utc=null on non-string input", () => {
    const r = formatUtcAndLocal(undefined as any) as any;
    expect(r.error).toBe("not-utc-iso");
    expect(r.utc).toBe(null);
  });
});

describe("parseArgs", () => {
  it("returns documented defaults on empty argv", () => {
    const a = parseArgs([]);
    expect(a.targets).toHaveLength(0);
    expect(a.dir).toBe(null);
    expect(a.glob).toBe("*.jsonl");
    expect(a.fields).toBe(null);
    expect(a.maxLines).toBe(0);
    expect(a.maxViolations).toBe(50);
    expect(a.json).toBe(false);
    expect(a.showOk).toBe(false);
  });

  it("parses every flag, comma-splits --fields, captures positional target", () => {
    const a = parseArgs([
      "--dir", "state/shared",
      "--glob", "*.json",
      "--fields", "ts,when,at",
      "--max-lines", "100",
      "--max-violations", "5",
      "--json",
      "--show-ok",
      "/tmp/explicit-target.jsonl",
    ]);
    expect(a.dir).toBe("state/shared");
    expect(a.glob).toBe("*.json");
    expect(a.fields).toEqual(["ts", "when", "at"]);
    expect(a.maxLines).toBe(100);
    expect(a.maxViolations).toBe(5);
    expect(a.json).toBe(true);
    expect(a.showOk).toBe(true);
    expect(a.targets).toEqual(["/tmp/explicit-target.jsonl"]);
  });

  it("falls back to documented defaults on invalid integer args", () => {
    const a = parseArgs(["--max-lines", "nope", "--max-violations", "abc"]);
    expect(a.maxLines).toBe(0);
    expect(a.maxViolations).toBe(50);
  });
});
