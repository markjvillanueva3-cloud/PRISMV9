/**
 * DailyPersonalBriefEngine.materialize-integration.test.ts
 *
 * OBSIDIAN-CONTENT-MS2 integration test:
 * proves that DailyPersonalBriefEngine.synthesize({ materializeConnections: true })
 * routes its top-N connections through ConnectionMaterializerEngine and writes
 * one persistent note per connection.
 *
 * 7 it() cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dailyPersonalBriefEngine } from "../engines/DailyPersonalBriefEngine.js";

let tmpVault: string;
let tmpWiki: string;
let tmpConnections: string;
const NOW = Date.UTC(2026, 4, 8, 12, 0, 0);

function writeNote(relPath: string, body: string, ageMs = 0): string {
  const full = join(tmpVault, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, body, "utf8");
  const mt = new Date(NOW - ageMs);
  utimesSync(full, mt, mt);
  return full;
}

beforeEach(() => {
  tmpVault = mkdtempSync(join(tmpdir(), "dpb-int-vault-"));
  tmpWiki = mkdtempSync(join(tmpdir(), "dpb-int-wiki-"));
  tmpConnections = mkdtempSync(join(tmpdir(), "dpb-int-conn-"));
});

afterEach(() => {
  rmSync(tmpVault, { recursive: true, force: true });
  rmSync(tmpWiki, { recursive: true, force: true });
  rmSync(tmpConnections, { recursive: true, force: true });
});

describe("DailyPersonalBriefEngine ↔ ConnectionMaterializerEngine integration", () => {
  // -------------------- HAPPY PATHS --------------------

  it("default behavior unchanged when materializeConnections is omitted (backward compat)", () => {
    for (let i = 0; i < 5; i++) {
      writeNote(`n-${i}.md`,
        `# Note ${i}\nThin-wall aluminum milling feedrate adaptive deflection thin-wall aluminum.`);
    }
    const result = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
    });
    expect(result.connections.length).toBeGreaterThan(0);
    expect(result.materialized).toBe(undefined);
  });

  it("materializeConnections:true writes one file per connection in connectionsDir", () => {
    for (let i = 0; i < 5; i++) {
      writeNote(`n-${i}.md`,
        `# Note ${i}\nThin-wall aluminum milling feedrate adaptive deflection thin-wall aluminum.`);
    }
    const result = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
      materializeConnections: true,
      connectionsDir: tmpConnections,
    });
    expect(result.connections.length).toBeGreaterThan(0);
    expect(result.materialized).not.toBe(undefined);
    expect(result.materialized!.apply).toBe(true);
    expect(result.materialized!.wrote).toBe(result.connections.length);
    expect(result.materialized!.errored).toBe(0);
    const files = readdirSync(tmpConnections).filter((n) => n.startsWith("connection-"));
    expect(files.length).toBe(result.connections.length);
  });

  it("connectionsApply:false → dry-run materialization (counters populated, no files)", () => {
    for (let i = 0; i < 5; i++) {
      writeNote(`n-${i}.md`,
        `# Note ${i}\nThin-wall aluminum milling feedrate adaptive deflection thin-wall aluminum.`);
    }
    const result = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
      materializeConnections: true,
      connectionsDir: tmpConnections,
      connectionsApply: false,
    });
    expect(result.materialized!.apply).toBe(false);
    expect(result.materialized!.wrote).toBe(result.connections.length);
    expect(readdirSync(tmpConnections).length).toBe(0);
  });

  it("idempotent across daily runs: 2nd run on same vault → skipped_exists, not re-wrote", () => {
    for (let i = 0; i < 5; i++) {
      writeNote(`n-${i}.md`,
        `# Note ${i}\nThin-wall aluminum milling feedrate adaptive deflection thin-wall aluminum.`);
    }
    const r1 = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
      materializeConnections: true, connectionsDir: tmpConnections,
    });
    const r2 = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
      materializeConnections: true, connectionsDir: tmpConnections,
    });
    expect(r1.materialized!.wrote).toBe(r1.connections.length);
    expect(r2.materialized!.wrote).toBe(0);
    expect(r2.materialized!.skipped_exists).toBe(r1.connections.length);
  });

  // -------------------- EDGE CASES --------------------

  it("empty vault → connections empty → materialized field absent (no work to do)", () => {
    const result = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
      materializeConnections: true, connectionsDir: tmpConnections,
    });
    expect(result.connections).toEqual([]);
    expect(result.materialized).toBe(undefined);
    expect(readdirSync(tmpConnections).length).toBe(0);
  });

  it("materialized connection markdown contains expected source-note links + similarity signal", () => {
    for (let i = 0; i < 3; i++) {
      writeNote(`themed-${i}.md`,
        `# Note ${i}\nKienzle force prediction carbide endmill cycle. Kienzle force carbide.`);
    }
    const result = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
      materializeConnections: true, connectionsDir: tmpConnections,
    });
    expect(result.materialized!.wrote).toBeGreaterThan(0);
    const firstFile = result.materialized!.paths[0];
    const md = readFileSync(firstFile, "utf8");
    expect(md).toContain("type: connection");
    expect(md).toContain("similarity:");
    expect(md).toContain("combined:");
    expect(md).toContain("[[themed-");
  });

  it("materialize counters reflect connections list size (one-to-one)", () => {
    for (let i = 0; i < 4; i++) {
      writeNote(`q-${i}.md`,
        `# Note ${i}\nAdaptive feedrate deflection thin-wall aluminum pocket strategy.`);
    }
    const result = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
      materializeConnections: true, connectionsDir: tmpConnections,
      maxConnections: 3,
    });
    expect(result.connections.length).toBe(3);
    expect(result.materialized!.wrote + result.materialized!.skipped_exists + result.materialized!.errored).toBe(3);
  });
});
