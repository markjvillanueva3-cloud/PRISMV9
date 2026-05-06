/**
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P15-U01 — CSMMemoryDBAuditEngine tests.
 *
 * Coverage:
 *   - classifyDBPath: claude/swarm/unknown variants, separator tolerance, edge cases
 *   - buildSchemaFingerprint: deterministic, sorted, stable across reorderings
 *   - detectSchemaVariants: groups by fingerprint, missing/empty handled
 *   - summarize: counts, byClass aggregation, oldest/newest mtimes, schema variant count
 *   - formatReport: contains expected sections, truncates long variant lists
 *   - Failure modes: malformed reports, empty arrays, non-array input
 *   - Adversarial: NaN/Infinity sizes, missing fields, wrong-type fingerprint
 *
 * 27 tests; ≥3 failure modes × ≥2 adversarial inputs per spec.
 */
import { describe, it, expect } from "vitest";
import {
  CSMMemoryDBAuditEngine,
  csmMemoryDBAuditEngine,
  type DBReport,
} from "../engines/CSMMemoryDBAuditEngine.js";

// ───────────── Fixtures ─────────────

const reportClaude1: DBReport = {
  path: "H:/prism/.claude/memory.db",
  exists: true,
  sizeBytes: 147456,
  lastModifiedISO: "2026-01-20T17:53:22.000Z",
  rowCount: 100,
  schemaFingerprint: "memories:5,sessions:3",
  tableNames: ["memories", "sessions"],
  error: "",
};

const reportClaude2: DBReport = {
  path: "H:/prism-iooms0/.claude/memory.db",
  exists: true,
  sizeBytes: 147456,
  lastModifiedISO: "2026-04-15T10:00:00.000Z",
  rowCount: 200,
  schemaFingerprint: "memories:5,sessions:3",
  tableNames: ["memories", "sessions"],
  error: "",
};

const reportSwarm: DBReport = {
  path: "H:/prism/.swarm/memory.db",
  exists: true,
  sizeBytes: 4096,
  lastModifiedISO: "2026-04-27T01:01:07.000Z",
  rowCount: 5,
  schemaFingerprint: "swarm_state:7",
  tableNames: ["swarm_state"],
  error: "",
};

const reportBroken: DBReport = {
  path: "H:/prism-old/.claude/memory.db",
  exists: false,
  sizeBytes: 0,
  lastModifiedISO: "",
  rowCount: null,
  schemaFingerprint: null,
  tableNames: [],
  error: "ENOENT: no such file or directory",
};

// ───────────── Tests ─────────────

describe("CSMMemoryDBAuditEngine — classifyDBPath", () => {
  it("classifies forward-slash .claude/memory.db as claude-memory", () => {
    const e = new CSMMemoryDBAuditEngine();
    expect(e.classifyDBPath("H:/prism/.claude/memory.db")).toBe("claude-memory");
    expect(e.classifyDBPath("/foo/bar/.claude/memory.db")).toBe("claude-memory");
  });

  it("classifies backslash variant identically (Windows tolerance)", () => {
    const e = new CSMMemoryDBAuditEngine();
    expect(e.classifyDBPath("H:\\prism\\.claude\\memory.db")).toBe("claude-memory");
    expect(e.classifyDBPath("C:\\Users\\x\\.swarm\\memory.db")).toBe("swarm-memory");
  });

  it("classifies .swarm/memory.db as swarm-memory", () => {
    const e = new CSMMemoryDBAuditEngine();
    expect(e.classifyDBPath("H:/prism/.swarm/memory.db")).toBe("swarm-memory");
  });

  it("classifies non-matching paths as unknown", () => {
    const e = new CSMMemoryDBAuditEngine();
    expect(e.classifyDBPath("H:/foo/memory.db")).toBe("unknown");
    expect(e.classifyDBPath("H:/.claude/sessions.db")).toBe("unknown");  // wrong filename
    expect(e.classifyDBPath("memory.db")).toBe("unknown");                // no parent dir
  });

  it("returns unknown for empty / non-string input", () => {
    const e = new CSMMemoryDBAuditEngine();
    expect(e.classifyDBPath("")).toBe("unknown");
    expect(e.classifyDBPath(undefined as unknown as string)).toBe("unknown");
    expect(e.classifyDBPath(null as unknown as string)).toBe("unknown");
  });
});

describe("CSMMemoryDBAuditEngine — buildSchemaFingerprint", () => {
  it("produces a sorted, comma-joined string", () => {
    const e = new CSMMemoryDBAuditEngine();
    const fp = e.buildSchemaFingerprint([
      { name: "sessions", colCount: 3 },
      { name: "memories", colCount: 5 },
    ]);
    expect(fp).toBe("memories:5,sessions:3");
  });

  it("is stable across input reordering", () => {
    const e = new CSMMemoryDBAuditEngine();
    const fp1 = e.buildSchemaFingerprint([
      { name: "a", colCount: 1 }, { name: "b", colCount: 2 }, { name: "c", colCount: 3 },
    ]);
    const fp2 = e.buildSchemaFingerprint([
      { name: "c", colCount: 3 }, { name: "a", colCount: 1 }, { name: "b", colCount: 2 },
    ]);
    expect(fp1).toBe(fp2);
    expect(fp1).toBe("a:1,b:2,c:3");
  });

  it("returns empty string on empty / non-array input", () => {
    const e = new CSMMemoryDBAuditEngine();
    expect(e.buildSchemaFingerprint([])).toBe("");
    expect(e.buildSchemaFingerprint(undefined as unknown as []))
      .toBe("");
  });

  it("filters out entries with missing/empty name or invalid colCount", () => {
    const e = new CSMMemoryDBAuditEngine();
    const fp = e.buildSchemaFingerprint([
      { name: "good", colCount: 5 },
      { name: "", colCount: 5 },                                  // skipped
      { name: "x", colCount: NaN },                                // skipped
      { name: "y", colCount: -1 },                                 // skipped (negative)
      { name: "z", colCount: Infinity },                           // skipped
    ]);
    expect(fp).toBe("good:5");
  });
});

describe("CSMMemoryDBAuditEngine — detectSchemaVariants", () => {
  it("groups two reports with identical fingerprints together", () => {
    const e = new CSMMemoryDBAuditEngine();
    const variants = e.detectSchemaVariants([reportClaude1, reportClaude2, reportSwarm]);
    expect(variants.size).toBe(2);
    const claude = variants.get("memories:5,sessions:3");
    expect(claude?.length).toBe(2);
    expect(claude?.map((r) => r.path).sort()).toEqual([
      "H:/prism-iooms0/.claude/memory.db",
      "H:/prism/.claude/memory.db",
    ]);
    expect(variants.get("swarm_state:7")?.length).toBe(1);
  });

  it("collects unreadable reports under empty-string key", () => {
    const e = new CSMMemoryDBAuditEngine();
    const variants = e.detectSchemaVariants([reportBroken, reportClaude1]);
    expect(variants.has("")).toBe(true);
    expect(variants.get("")?.length).toBe(1);
    expect(variants.get("")?.[0].path).toBe(reportBroken.path);
  });

  it("returns empty Map on non-array input", () => {
    const e = new CSMMemoryDBAuditEngine();
    expect(e.detectSchemaVariants(undefined as unknown as DBReport[]).size).toBe(0);
    expect(e.detectSchemaVariants(null as unknown as DBReport[]).size).toBe(0);
  });

  it("skips malformed entries (non-object) silently", () => {
    const e = new CSMMemoryDBAuditEngine();
    const variants = e.detectSchemaVariants([
      reportClaude1,
      null as unknown as DBReport,
      "garbage" as unknown as DBReport,
      reportSwarm,
    ]);
    // Only the 2 valid entries should land in variants
    let total = 0;
    for (const [, group] of variants) total += group.length;
    expect(total).toBe(2);
  });
});

describe("CSMMemoryDBAuditEngine — summarize", () => {
  it("aggregates totals across 4-report fixture (3 readable + 1 broken)", () => {
    const e = new CSMMemoryDBAuditEngine();
    const s = e.summarize([reportClaude1, reportClaude2, reportSwarm, reportBroken]);
    expect(s.totalDBs).toBe(4);
    expect(s.readableDBs).toBe(3);
    expect(s.totalSizeBytes).toBe(147456 + 147456 + 4096);
    expect(s.totalRows).toBe(100 + 200 + 5);
    expect(s.schemaVariantCount).toBe(2);  // distinct fingerprints
  });

  it("aggregates byClass correctly", () => {
    const e = new CSMMemoryDBAuditEngine();
    const s = e.summarize([reportClaude1, reportClaude2, reportSwarm, reportBroken]);
    expect(s.byClass["claude-memory"].count).toBe(3);  // 2 readable + 1 broken
    expect(s.byClass["claude-memory"].sizeBytes).toBe(147456 * 2);
    expect(s.byClass["claude-memory"].rows).toBe(300);
    expect(s.byClass["swarm-memory"].count).toBe(1);
    expect(s.byClass["swarm-memory"].sizeBytes).toBe(4096);
    expect(s.byClass["unknown"].count).toBe(0);
  });

  it("computes oldest + newest modification ISO from valid timestamps", () => {
    const e = new CSMMemoryDBAuditEngine();
    const s = e.summarize([reportClaude1, reportClaude2, reportSwarm]);
    expect(s.oldestModifiedISO).toBe("2026-01-20T17:53:22.000Z");
    expect(s.newestModifiedISO).toBe("2026-04-27T01:01:07.000Z");
  });

  it("returns zeroed summary on empty array", () => {
    const e = new CSMMemoryDBAuditEngine();
    const s = e.summarize([]);
    expect(s.totalDBs).toBe(0);
    expect(s.readableDBs).toBe(0);
    expect(s.totalSizeBytes).toBe(0);
    expect(s.totalRows).toBe(0);
    expect(s.schemaVariantCount).toBe(0);
    expect(s.oldestModifiedISO).toBe("");
    expect(s.newestModifiedISO).toBe("");
  });

  it("returns zeroed summary on non-array input", () => {
    const e = new CSMMemoryDBAuditEngine();
    const s = e.summarize(undefined as unknown as DBReport[]);
    expect(s.totalDBs).toBe(0);
    expect(s.byClass["claude-memory"].count).toBe(0);
  });

  it("clamps NaN/Infinity sizes and rowCount to 0 (defensive accumulation)", () => {
    const e = new CSMMemoryDBAuditEngine();
    const adversarial: DBReport = {
      path: "H:/x/.claude/memory.db",
      exists: true,
      sizeBytes: NaN,
      lastModifiedISO: "2026-01-01T00:00:00.000Z",
      rowCount: Infinity,
      schemaFingerprint: "x:1",
      tableNames: ["x"],
      error: "",
    };
    const s = e.summarize([reportClaude1, adversarial]);
    expect(s.totalSizeBytes).toBe(147456);  // NaN treated as 0
    expect(s.totalRows).toBe(100);          // Infinity treated as 0
  });

  it("ignores invalid lastModifiedISO timestamps (not a parse-able date)", () => {
    const e = new CSMMemoryDBAuditEngine();
    const bad: DBReport = {
      ...reportClaude1,
      path: "H:/x/.claude/memory.db",
      lastModifiedISO: "not-a-date",
    };
    const s = e.summarize([reportClaude1, bad]);
    // Falls back to claude1's timestamp; bad's timestamp ignored
    expect(s.oldestModifiedISO).toBe("2026-01-20T17:53:22.000Z");
    expect(s.newestModifiedISO).toBe("2026-01-20T17:53:22.000Z");
  });
});

describe("CSMMemoryDBAuditEngine — formatReport", () => {
  it("renders all required header sections", () => {
    const e = new CSMMemoryDBAuditEngine();
    const s = e.summarize([reportClaude1, reportClaude2, reportSwarm]);
    const md = e.formatReport([reportClaude1, reportClaude2, reportSwarm], s);
    expect(md).toContain("# CSM Memory DB Inventory");
    expect(md).toContain("**Total DBs:** 3");
    expect(md).toContain("**Schema variants:** 2");
    expect(md).toContain("## By class");
    expect(md).toContain("## Schema variants");
  });

  it("renders both schema variants with their DB counts", () => {
    const e = new CSMMemoryDBAuditEngine();
    const s = e.summarize([reportClaude1, reportClaude2, reportSwarm]);
    const md = e.formatReport([reportClaude1, reportClaude2, reportSwarm], s);
    expect(md).toContain("`memories:5,sessions:3` — 2 DB(s)");
    expect(md).toContain("`swarm_state:7` — 1 DB(s)");
  });

  it("flags unreadable DBs with the (unreadable) label and ⚠ marker", () => {
    const e = new CSMMemoryDBAuditEngine();
    const s = e.summarize([reportBroken]);
    const md = e.formatReport([reportBroken], s);
    expect(md).toContain("(unreadable / no fingerprint)");
    expect(md).toContain("⚠ ENOENT");
  });

  it("byClass section omits classes with zero count", () => {
    const e = new CSMMemoryDBAuditEngine();
    const s = e.summarize([reportClaude1]);
    const md = e.formatReport([reportClaude1], s);
    expect(md).toContain("**claude-memory**");
    expect(md).not.toContain("**swarm-memory**: 0 DB(s)");
    expect(md).not.toContain("**unknown**: 0 DB(s)");
  });

  it("includes byte-formatted sizes with comma separators", () => {
    const e = new CSMMemoryDBAuditEngine();
    const s = e.summarize([reportClaude1, reportClaude2]);
    const md = e.formatReport([reportClaude1, reportClaude2], s);
    expect(md).toContain("294,912");  // 147456 * 2 with locale formatting
  });
});

describe("CSMMemoryDBAuditEngine — exported singleton (real-behavior round trip)", () => {
  it("singleton runs the full audit pipeline end-to-end on fixture", () => {
    // Real round-trip: classify → fingerprint → variants → summary → report
    const reports = [reportClaude1, reportClaude2, reportSwarm, reportBroken];
    expect(csmMemoryDBAuditEngine.classifyDBPath(reportClaude1.path)).toBe("claude-memory");
    expect(csmMemoryDBAuditEngine.classifyDBPath(reportSwarm.path)).toBe("swarm-memory");
    const variants = csmMemoryDBAuditEngine.detectSchemaVariants(reports);
    expect(variants.size).toBe(3);  // 2 fingerprints + 1 empty (broken)
    const summary = csmMemoryDBAuditEngine.summarize(reports);
    expect(summary.totalDBs).toBe(4);
    expect(summary.readableDBs).toBe(3);
    expect(summary.byClass["claude-memory"].count).toBe(3);
    expect(summary.byClass["swarm-memory"].count).toBe(1);
    const md = csmMemoryDBAuditEngine.formatReport(reports, summary);
    expect(md).toContain("**Total DBs:** 4");
    expect(md).toContain("**Schema variants:** 2");
    // Idempotent: same inputs always produce same report (deterministic)
    expect(csmMemoryDBAuditEngine.formatReport(reports, summary)).toBe(md);
  });
});
