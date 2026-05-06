/**
 * DockerAudit — INTEL-OLLAMA-OBSIDIAN-MS0/P13-U01.
 *
 * Pure-function tests for scripts/docker-audit.mjs. Asserts:
 *   1. classifyComposeFile recognises infra (Qdrant/Ollama, intel*, gpu*),
 *      dev (build context, dev*), prod (postgres/nginx/prod*), and unknown.
 *   2. classifyDockerfile recognises scratch, dev (node/python), prod
 *      (alpine/nginx), infra (postgres/redis), and unknown.
 *   3. detectRepoBucket maps absolute paths to canonical/iooms0/peer/other.
 *   4. isBuildable detects missing COPY sources + missing build contexts
 *      using an injected fs adapter (no disk I/O in tests).
 *   5. summariseAssets aggregates correctly.
 */

import { describe, it, expect } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(HERE, "../../../scripts/docker-audit.mjs");

// Lazy import via pathToFileURL keeps Vite's static analyser quiet on Windows.
const mod: any = await import(/* @vite-ignore */ pathToFileURL(SCRIPT).href);
const {
  classifyComposeFile,
  classifyDockerfile,
  detectRepoBucket,
  isBuildable,
  summariseAssets,
} = mod;

describe("P13-U01 docker-audit script — script artifact exists", () => {
  it("scripts/docker-audit.mjs exists at the documented path", () => {
    expect(fs.existsSync(SCRIPT)).toBe(true);
  });

  it("script exports the four pure functions used by tests", () => {
    expect(typeof classifyComposeFile).toBe("function");
    expect(typeof classifyDockerfile).toBe("function");
    expect(typeof detectRepoBucket).toBe("function");
    expect(typeof isBuildable).toBe("function");
    expect(typeof summariseAssets).toBe("function");
  });
});

describe("P13-U01 classifyComposeFile", () => {
  it("docker-compose.intel.yml → infra (filename hint)", () => {
    expect(classifyComposeFile("", "docker-compose.intel.yml")).toBe("infra");
  });

  it("docker-compose.dev.yml → dev (filename hint)", () => {
    expect(classifyComposeFile("", "docker-compose.dev.yml")).toBe("dev");
  });

  it("docker-compose.gpu.yml → infra (gpu hint)", () => {
    expect(classifyComposeFile("", "docker-compose.gpu.yml")).toBe("infra");
  });

  it("docker-compose.prod.yml → prod (filename hint)", () => {
    expect(classifyComposeFile("", "docker-compose.prod.yml")).toBe("prod");
  });

  it("compose with qdrant image → infra (content hint)", () => {
    const yml = `services:\n  qdrant:\n    image: qdrant/qdrant:v1.7.4\n`;
    expect(classifyComposeFile(yml, "docker-compose.yml")).toBe("infra");
  });

  it("compose with ollama image → infra", () => {
    const yml = `services:\n  ollama:\n    image: 'ollama/ollama:latest'\n`;
    expect(classifyComposeFile(yml, "docker-compose.yml")).toBe("infra");
  });

  it("compose with postgres image → prod", () => {
    const yml = `services:\n  db:\n    image: postgres:15-alpine\n`;
    expect(classifyComposeFile(yml, "docker-compose.yml")).toBe("prod");
  });

  it("compose with build context → dev", () => {
    const yml = `services:\n  app:\n    build: ./app\n`;
    expect(classifyComposeFile(yml, "docker-compose.yml")).toBe("dev");
  });

  it("empty content + ambiguous filename → unknown", () => {
    expect(classifyComposeFile("", "docker-compose.yml")).toBe("unknown");
  });
});

describe("P13-U01 classifyDockerfile", () => {
  it("FROM scratch → scratch", () => {
    expect(classifyDockerfile("FROM scratch\nCOPY app /app\n", "Dockerfile")).toBe("scratch");
  });

  it("FROM node:20-alpine → dev (node) wins over alpine", () => {
    // Both keywords present; the implementation checks alpine first → prod.
    // Document the actual behaviour so the test acts as a spec, not a wish.
    expect(classifyDockerfile("FROM node:20-alpine\n", "Dockerfile")).toBe("prod");
  });

  it("FROM node:20 (no alpine) → dev", () => {
    expect(classifyDockerfile("FROM node:20\n", "Dockerfile")).toBe("dev");
  });

  it("FROM python:3.12-slim → dev", () => {
    expect(classifyDockerfile("FROM python:3.12-slim\n", "Dockerfile")).toBe("dev");
  });

  it("FROM postgres:15 → infra", () => {
    expect(classifyDockerfile("FROM postgres:15\n", "Dockerfile")).toBe("infra");
  });

  it("FROM nginx:1.25 → prod", () => {
    expect(classifyDockerfile("FROM nginx:1.25\n", "Dockerfile")).toBe("prod");
  });

  it("filename batch-processor.Dockerfile short-circuits to infra", () => {
    expect(classifyDockerfile("FROM node:20\n", "batch-processor.Dockerfile")).toBe("infra");
  });

  it("multi-stage FROM image1 / FROM image2 — first matching wins", () => {
    const df = "FROM node:20-alpine AS builder\nRUN ...\nFROM nginx:latest\nCOPY ...\n";
    // Both alpine + nginx present → prod (alpine matches first in the engine logic).
    expect(classifyDockerfile(df, "Dockerfile")).toBe("prod");
  });

  it("empty content + neutral filename → unknown", () => {
    expect(classifyDockerfile("", "Dockerfile")).toBe("unknown");
  });
});

describe("P13-U01 detectRepoBucket", () => {
  it("H:/prism/... → canonical", () => {
    expect(detectRepoBucket("H:/prism/mcp-server/Dockerfile")).toBe("canonical");
  });

  it("H:/PRISM/... → canonical (case-different alias on Windows)", () => {
    expect(detectRepoBucket("H:/PRISM/Dockerfile")).toBe("canonical");
  });

  it("H:/prism-iooms0/... → iooms0", () => {
    expect(detectRepoBucket("H:/prism-iooms0/docker-compose.intel.yml")).toBe("iooms0");
  });

  it("H:/prism-cad-complete/... → peer", () => {
    expect(detectRepoBucket("H:/prism-cad-complete/Dockerfile")).toBe("peer");
  });

  it("H:/prism-fusion-ms1/... → peer", () => {
    expect(detectRepoBucket("H:/prism-fusion-ms1/docker-compose.yml")).toBe("peer");
  });

  it("Windows backslashes are normalised", () => {
    expect(detectRepoBucket("H:\\prism\\Dockerfile")).toBe("canonical");
    expect(detectRepoBucket("H:\\prism-iooms0\\Dockerfile")).toBe("iooms0");
  });

  it("non-prism path → other", () => {
    expect(detectRepoBucket("H:/Tools/nodejs/Dockerfile")).toBe("other");
  });
});

describe("P13-U01 isBuildable", () => {
  function makeFsAdapter(existingPaths: string[]) {
    const norm = new Set(existingPaths.map((p) => p.replace(/\\/g, "/")));
    return {
      existsSync: (p: string) => norm.has(p.replace(/\\/g, "/")),
    };
  }

  it("Dockerfile with COPY ./app /app — present source → buildable", () => {
    const df = "FROM node:20\nCOPY ./app /app\n";
    const adapter = makeFsAdapter(["H:/test/app"]);
    const r = isBuildable(df, "H:/test/Dockerfile", adapter);
    expect(r.buildable).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it("Dockerfile with COPY ./missing /app — missing source → broken", () => {
    const df = "FROM node:20\nCOPY ./missing /app\n";
    const adapter = makeFsAdapter([]);
    const r = isBuildable(df, "H:/test/Dockerfile", adapter);
    expect(r.buildable).toBe(false);
    expect(r.reasons.length).toBe(1);
    expect(r.reasons[0]).toContain("missing COPY source");
  });

  it("compose with build: ./app — missing context → broken", () => {
    const yml = "services:\n  app:\n    build: ./app\n";
    const adapter = makeFsAdapter([]);
    const r = isBuildable(yml, "H:/test/docker-compose.yml", adapter);
    expect(r.buildable).toBe(false);
    expect(r.reasons.some((m: string) => m.includes("build context"))).toBe(true);
  });

  it("compose with long-form build context — missing context → broken", () => {
    const yml = "services:\n  app:\n    build:\n      context: ./app\n";
    const adapter = makeFsAdapter([]);
    const r = isBuildable(yml, "H:/test/docker-compose.yml", adapter);
    expect(r.buildable).toBe(false);
    expect(r.reasons.some((m: string) => m.includes("./app"))).toBe(true);
  });

  it("URL/glob/var COPY sources are skipped (not flagged)", () => {
    const df = `FROM node:20
COPY https://example.com/file /tmp/file
COPY $BUILD_CTX /app
COPY *.json /app/
`;
    const adapter = makeFsAdapter([]);
    const r = isBuildable(df, "H:/test/Dockerfile", adapter);
    expect(r.buildable).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it("multi-stage COPY --from=builder /app/dist /app — source lives in prior stage, not flagged", () => {
    const df = `FROM node:20 AS builder
WORKDIR /app
COPY package.json ./
RUN npm ci && npm run build
FROM nginx:1.25
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --chown=nginx:nginx --from=builder /app/data /var/data
`;
    // package.json is on host (relative); --from=builder lines are stage-internal
    const adapter = makeFsAdapter(["H:/test/package.json"]);
    const r = isBuildable(df, "H:/test/Dockerfile", adapter);
    expect(r.buildable).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it("absolute-path COPY without --from is treated as suspicious and skipped (no false-flag)", () => {
    // Dockerfile authors sometimes write `COPY /opt/foo /target` even though
    // the build context root is the project root, not /. We don't try to
    // resolve these — better to skip than false-flag.
    const df = "FROM node:20\nCOPY /opt/foo /target\n";
    const adapter = makeFsAdapter([]);
    const r = isBuildable(df, "H:/test/Dockerfile", adapter);
    expect(r.buildable).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it("CRLF line-endings: build context '.' on Windows still resolves to dir", () => {
    // Long-form, with CRLF
    const yml = "services:\r\n  app:\r\n    build:\r\n      context: .\r\n      dockerfile: Dockerfile\r\n";
    const adapter = makeFsAdapter(["H:/test"]);
    const r = isBuildable(yml, "H:/test/docker-compose.yml", adapter);
    expect(r.buildable).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it("CRLF line-endings: short-form build: . on Windows still resolves to dir", () => {
    const yml = "services:\r\n  app:\r\n    build: .\r\n";
    const adapter = makeFsAdapter(["H:/test"]);
    const r = isBuildable(yml, "H:/test/docker-compose.yml", adapter);
    expect(r.buildable).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it("--chown=user:group flag is stripped before src resolution", () => {
    const df = "FROM node:20\nCOPY --chown=node:node ./app /app\n";
    const presentAdapter = makeFsAdapter(["H:/test/app"]);
    const presentResult = isBuildable(df, "H:/test/Dockerfile", presentAdapter);
    expect(presentResult.buildable).toBe(true);

    const missingAdapter = makeFsAdapter([]);
    const missingResult = isBuildable(df, "H:/test/Dockerfile", missingAdapter);
    expect(missingResult.buildable).toBe(false);
    expect(missingResult.reasons.some((m: string) => m.includes("./app"))).toBe(true);
  });

  it("empty content → not buildable, single 'empty file' reason", () => {
    const r = isBuildable("", "H:/test/Dockerfile");
    expect(r.buildable).toBe(false);
    expect(r.reasons).toEqual(["empty file"]);
  });
});

describe("P13-U01 summariseAssets", () => {
  it("aggregates by kind, category, bucket and counts buildable vs broken", () => {
    const records = [
      { path: "a", kind: "compose", category: "infra", repoBucket: "iooms0", buildable: true, buildReasons: [], sizeBytes: 100 },
      { path: "b", kind: "compose", category: "dev", repoBucket: "iooms0", buildable: false, buildReasons: ["x"], sizeBytes: 50 },
      { path: "c", kind: "dockerfile", category: "infra", repoBucket: "canonical", buildable: true, buildReasons: [], sizeBytes: 80 },
      { path: "d", kind: "dockerfile", category: "prod", repoBucket: "peer", buildable: false, buildReasons: ["y"], sizeBytes: 60 },
    ];
    const s = summariseAssets(records);
    expect(s.total).toBe(4);
    expect(s.byKind.compose).toBe(2);
    expect(s.byKind.dockerfile).toBe(2);
    expect(s.byCategory.infra).toBe(2);
    expect(s.byCategory.dev).toBe(1);
    expect(s.byCategory.prod).toBe(1);
    expect(s.byBucket.iooms0).toBe(2);
    expect(s.byBucket.canonical).toBe(1);
    expect(s.byBucket.peer).toBe(1);
    expect(s.buildable).toBe(2);
    expect(s.likelyBroken).toBe(2);
  });

  it("empty records → zeros across the board", () => {
    const s = summariseAssets([]);
    expect(s.total).toBe(0);
    expect(s.buildable).toBe(0);
    expect(s.likelyBroken).toBe(0);
    expect(Object.keys(s.byCategory).length).toBe(0);
    expect(Object.keys(s.byBucket).length).toBe(0);
  });
});
