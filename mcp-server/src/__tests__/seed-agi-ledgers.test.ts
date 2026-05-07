import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { seedAgiLedgers } from "../../scripts/seed-agi-ledgers.js";

describe("seed-agi-ledgers (PP-0.18-LEDGERS)", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "prism-seed-agi-"));
    // Mirror the expected repo layout that `repoRoot()` looks for.
    fs.mkdirSync(path.join(tmp, ".git"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "mcp-server", "data", "state"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("creates all 5 ledger files with schemaVersion 1 on a clean tree", () => {
    const results = seedAgiLedgers(tmp);
    expect(results.length).toBe(5);
    expect(results.every((r) => r.action === "created")).toBe(true);

    const jsonl = [
      "ARCH_EVOLUTION_LEDGER.jsonl",
      "EMERGENCE_LEDGER.jsonl",
      "META_LEARNING_LEDGER.jsonl",
      "TEMPORAL_STATE_LEDGER.jsonl",
    ];
    for (const name of jsonl) {
      const full = path.join(tmp, "mcp-server", "data", "state", name);
      expect(fs.existsSync(full)).toBe(true);
      const first = fs.readFileSync(full, "utf8").split("\n")[0];
      const header = JSON.parse(first);
      expect(header.schemaVersion).toBe(1);
      expect(header.type).toBe("header");
      expect(typeof header.owner).toBe("string");
      expect(header.owner.length).toBeGreaterThan(0);
    }

    const hier = JSON.parse(
      fs.readFileSync(path.join(tmp, "mcp-server", "data", "state", "ABSTRACTION_HIERARCHY.json"), "utf8"),
    );
    expect(hier.schemaVersion).toBe(1);
    expect(hier.owner).toBe("AbstractionHierarchyEngine");
    expect(hier.nodes).toEqual([]);
    expect(hier.levels).toEqual({ 0: "tip", 1: "rule", 2: "principle", 3: "law" });
  });

  it("is idempotent — re-running preserves existing files", () => {
    seedAgiLedgers(tmp);
    const results = seedAgiLedgers(tmp);
    expect(results.every((r) => r.action === "preserved")).toBe(true);
  });

  it("preserves entries below the header on re-run (does not truncate)", () => {
    seedAgiLedgers(tmp);
    const target = path.join(tmp, "mcp-server", "data", "state", "META_LEARNING_LEDGER.jsonl");
    const extra = '{"scenario":"t","strategy":"s","success":true,"durationMs":12,"recordedAt":"2026-04-19T12:00:00Z","sessionId":null}';
    fs.appendFileSync(target, extra + "\n", "utf8");

    seedAgiLedgers(tmp);
    const after = fs.readFileSync(target, "utf8");
    expect(after).toContain(extra);
    const lines = after.split("\n").filter((l) => l.trim().length > 0);
    expect(lines.length).toBe(2); // header + 1 entry
    const header = JSON.parse(lines[0]);
    expect(header.type).toBe("header");
  });

  it("repairs a file missing a valid header by prepending one", () => {
    const target = path.join(tmp, "mcp-server", "data", "state", "EMERGENCE_LEDGER.jsonl");
    const orphan = '{"eventId":"e1","kind":"perf-anomaly","signal":"p95 latency","magnitude":1.4,"components":["x"],"firstSeen":"2026-04-19T12:00:00Z","lastSeen":"2026-04-19T12:01:00Z","occurrences":3}';
    fs.writeFileSync(target, orphan + "\n", "utf8");

    const results = seedAgiLedgers(tmp);
    const emergence = results.find((r) => r.file.endsWith("EMERGENCE_LEDGER.jsonl"))!;
    expect(emergence.action).toBe("headered");

    const lines = fs.readFileSync(target, "utf8").split("\n").filter((l) => l.trim().length > 0);
    expect(lines.length).toBe(2);
    const header = JSON.parse(lines[0]);
    expect(header.type).toBe("header");
    expect(lines[1]).toBe(orphan); // original entry preserved
  });
});
