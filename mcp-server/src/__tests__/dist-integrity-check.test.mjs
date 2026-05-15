/**
 * dist-integrity-check.mjs — tests
 *
 * Pure-function tests for checkDistIntegrity + formatDegradedContext. Real fs
 * round-trip via mkdtempSync — no mocks. Covers:
 *   - happy path (all four artifacts present + fresh)
 *   - 4 failure modes (dist missing, index missing, chunks empty, esbuild missing)
 *   - 2 adversarial inputs (zero-byte index.js, age past threshold)
 *   - format function emits actionable markdown
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  utimesSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  checkDistIntegrity,
  formatDegradedContext,
} from "../../../.claude/hooks/dist-integrity-check.mjs";

function makeTempDir() {
  return mkdtempSync(path.join(os.tmpdir(), "prism-dist-int-"));
}

function rmDir(dir) {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // best-effort
  }
}

function seedHealthyTree(root, { chunkCount = 3 } = {}) {
  const distDir = path.join(root, "dist");
  const distChunks = path.join(distDir, "chunks");
  const distIndex = path.join(distDir, "index.js");
  const nodeModulesEsbuild = path.join(root, "node_modules", "esbuild");
  mkdirSync(distChunks, { recursive: true });
  mkdirSync(nodeModulesEsbuild, { recursive: true });
  writeFileSync(distIndex, "// stub bundled output\nconsole.log('hi');\n");
  for (let i = 0; i < chunkCount; i++) {
    writeFileSync(path.join(distChunks, `chunk-${i}.js`), `// chunk ${i}\n`);
  }
  // Write a marker file under esbuild so it's not just an empty dir
  writeFileSync(path.join(nodeModulesEsbuild, "package.json"), '{"name":"esbuild"}');
  return { distDir, distIndex, distChunks, nodeModulesEsbuild };
}

describe("checkDistIntegrity — happy path", () => {
  let root;
  let paths;

  beforeEach(() => {
    root = makeTempDir();
    paths = seedHealthyTree(root);
  });

  afterEach(() => {
    rmDir(root);
  });

  it("reports healthy when all four artifacts are present and fresh", () => {
    const report = checkDistIntegrity(paths);
    expect(report.healthy).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.recommendations).toHaveLength(0);
    expect(report.details.distDir).toBe("exists");
    expect(report.details.esbuild).toBe("exists");
    expect(report.details.distChunks).toEqual({ fileCount: 3 });
    expect(typeof report.details.distIndex).toBe("object");
    expect((report.details.distIndex).size).toBeGreaterThan(0);
  });
});

describe("checkDistIntegrity — failure modes", () => {
  let root;

  beforeEach(() => {
    root = makeTempDir();
  });

  afterEach(() => {
    rmDir(root);
  });

  it("flags missing dist/ directory entirely (the 2026-05-15 wipe case)", () => {
    const paths = {
      distDir: path.join(root, "dist"),
      distIndex: path.join(root, "dist", "index.js"),
      distChunks: path.join(root, "dist", "chunks"),
      nodeModulesEsbuild: path.join(root, "node_modules", "esbuild"),
    };
    const report = checkDistIntegrity(paths);
    expect(report.healthy).toBe(false);
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0]).toBe("dist/ directory missing entirely");
    expect(report.recommendations).toContain("cd mcp-server && npm run build:fast");
    expect(report.details.distDir).toBe("MISSING");
  });

  it("flags missing dist/index.js when dist/ exists", () => {
    const distDir = path.join(root, "dist");
    const distChunks = path.join(distDir, "chunks");
    const nodeModulesEsbuild = path.join(root, "node_modules", "esbuild");
    mkdirSync(distChunks, { recursive: true });
    mkdirSync(nodeModulesEsbuild, { recursive: true });
    writeFileSync(path.join(distChunks, "chunk-0.js"), "// chunk\n");
    writeFileSync(path.join(nodeModulesEsbuild, "package.json"), "{}");

    const report = checkDistIntegrity({
      distDir,
      distIndex: path.join(distDir, "index.js"),
      distChunks,
      nodeModulesEsbuild,
    });
    expect(report.healthy).toBe(false);
    expect(report.issues.some((i) => i.includes("dist/index.js missing"))).toBe(true);
    expect(report.details.distIndex).toBe("MISSING");
  });

  it("flags empty dist/chunks/ (the dynamic-import-broken case)", () => {
    const paths = seedHealthyTree(root, { chunkCount: 0 });
    const report = checkDistIntegrity(paths);
    expect(report.healthy).toBe(false);
    expect(report.issues.some((i) => i.includes("dist/chunks/ is empty"))).toBe(true);
    expect(report.details.distChunks).toEqual({ fileCount: 0 });
  });

  it("flags missing node_modules/esbuild (the npm-ci-needed case)", () => {
    const distDir = path.join(root, "dist");
    const distChunks = path.join(distDir, "chunks");
    mkdirSync(distChunks, { recursive: true });
    writeFileSync(path.join(distDir, "index.js"), "// stub\n");
    writeFileSync(path.join(distChunks, "chunk-0.js"), "// chunk\n");

    const report = checkDistIntegrity({
      distDir,
      distIndex: path.join(distDir, "index.js"),
      distChunks,
      nodeModulesEsbuild: path.join(root, "node_modules", "esbuild"),
    });
    expect(report.healthy).toBe(false);
    expect(report.issues.some((i) => i.includes("node_modules/esbuild missing"))).toBe(true);
    expect(report.recommendations).toContain("cd mcp-server && npm ci --prefer-offline");
    expect(report.details.esbuild).toBe("MISSING");
  });
});

describe("checkDistIntegrity — adversarial inputs", () => {
  let root;

  beforeEach(() => {
    root = makeTempDir();
  });

  afterEach(() => {
    rmDir(root);
  });

  it("flags zero-byte dist/index.js as degraded", () => {
    const paths = seedHealthyTree(root);
    writeFileSync(paths.distIndex, ""); // overwrite with empty
    const report = checkDistIntegrity(paths);
    expect(report.healthy).toBe(false);
    expect(report.issues.some((i) => i.includes("zero bytes"))).toBe(true);
  });

  it("flags dist/index.js older than the maxAgeHrs threshold", () => {
    const paths = seedHealthyTree(root);
    // Set mtime 100 hours in the past
    const past = new Date(Date.now() - 100 * 3600 * 1000);
    utimesSync(paths.distIndex, past, past);

    // Threshold = 50 hours → 100h-old file should warn
    const report = checkDistIntegrity(paths, 50);
    expect(report.healthy).toBe(false);
    expect(report.issues.some((i) => i.includes("h old"))).toBe(true);
    expect(report.issues.some((i) => i.includes("threshold 50h"))).toBe(true);
  });

  it("does NOT flag a recent dist/index.js with a generous threshold", () => {
    const paths = seedHealthyTree(root);
    const report = checkDistIntegrity(paths, 8760); // 1 year
    expect(report.healthy).toBe(true);
  });
});

describe("formatDegradedContext", () => {
  it("renders issues + recommendations as markdown that names the rot class", () => {
    const report = {
      healthy: false,
      issues: [
        "dist/ directory missing entirely",
        "node_modules/esbuild missing — rebuild will fail until npm ci runs",
      ],
      recommendations: [
        "cd mcp-server && npm run build:fast",
        "cd mcp-server && npm ci --prefer-offline",
      ],
      details: {},
    };
    const out = formatDegradedContext(report);
    // Header named explicitly so a log search lands on it
    expect(out).toContain("DIST INTEGRITY DEGRADED");
    // Each issue surfaced as a bullet
    expect(out).toContain("dist/ directory missing entirely");
    expect(out).toContain("node_modules/esbuild missing");
    // Each recommendation surfaced as a $ command (operator can copy-paste)
    expect(out).toContain("$ cd mcp-server && npm run build:fast");
    expect(out).toContain("$ cd mcp-server && npm ci --prefer-offline");
    // Cross-link to the memory entry the operator can read for full history
    expect(out).toContain("reference_pillar_telemetry_recovery_ms0.md");
    // Disable knob is surfaced
    expect(out).toContain("PRISM_DIST_INTEGRITY_DISABLE=1");
  });

  it("dedups identical recommendations (the common case: same fix surfaces 3x)", () => {
    const report = {
      healthy: false,
      issues: ["x", "y", "z"],
      recommendations: [
        "cd mcp-server && npm run build:fast",
        "cd mcp-server && npm run build:fast",
        "cd mcp-server && npm run build:fast",
      ],
      details: {},
    };
    const out = formatDegradedContext(report);
    const buildCmdMatches = (out.match(/npm run build:fast/g) || []).length;
    // Once in the dedup'd Recommended fix block — no triplicate spam
    expect(buildCmdMatches).toBe(1);
  });
});
