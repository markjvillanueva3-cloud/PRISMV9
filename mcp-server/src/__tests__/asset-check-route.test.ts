/**
 * Tests for createAssetCheckRouter (PP-INFRA-ASSET-CHECK-ROUTE)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createAssetCheckRouter } from "../routes/asset-check.js";

// ---------------------------------------------------------------------------
// Fixture: tmp mcpRoot with src/engines containing known assets

function buildFakeMcpRoot(engines: readonly string[]): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "prism-asset-check-"));
  const engineDir = path.join(root, "src/engines");
  fs.mkdirSync(engineDir, { recursive: true });
  for (const e of engines) {
    fs.writeFileSync(path.join(engineDir, `${e}.ts`), `// stub for ${e}`);
  }
  return root;
}

function startServer(root: string): { url: string; close: () => Promise<void> } {
  const app = express();
  app.use(express.json());
  const router = createAssetCheckRouter(async () => ({}), { mcpRoot: root });
  app.use("/check", router);
  return new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}/check`,
        close: () =>
          new Promise<void>((r) => {
            server.close(() => r());
          }),
      });
    });
  }) as unknown as { url: string; close: () => Promise<void> };
}

async function post(url: string, body: unknown): Promise<{ status: number; body: unknown }> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json() };
}

async function get(url: string): Promise<{ status: number; body: unknown }> {
  const r = await fetch(url);
  return { status: r.status, body: await r.json() };
}

// ---------------------------------------------------------------------------

describe("createAssetCheckRouter — /name-check", () => {
  let root: string;
  let server: { url: string; close: () => Promise<void> };

  beforeEach(async () => {
    root = buildFakeMcpRoot(["KienzleForceModelEngine", "TaylorToolLifeEngine", "SafetyEngine"]);
    server = await startServer(root);
  });

  afterEach(async () => {
    await server.close();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("returns 400 on missing proposedName", async () => {
    const r = await post(`${server.url}/name-check`, { type: "engine", description: "x" });
    expect(r.status).toBe(400);
    expect((r.body as { error: string }).error).toBe("VALIDATION_ERROR");
  });

  it("returns 400 on invalid type", async () => {
    const r = await post(`${server.url}/name-check`, {
      type: "widget",
      proposedName: "Foo",
      description: "x",
    });
    expect(r.status).toBe(400);
  });

  it("blocks on exact name collision", async () => {
    const r = await post(`${server.url}/name-check`, {
      type: "engine",
      proposedName: "KienzleForceModelEngine",
      description: "re-implementing",
    });
    expect(r.status).toBe(200);
    const body = r.body as { decision: string; reason: string };
    expect(body.decision).toBe("block");
    expect(body.reason).toMatch(/exact/);
  });

  it("warns on fuzzy name collision", async () => {
    const r = await post(`${server.url}/name-check`, {
      type: "engine",
      proposedName: "KienzleForceModel",
      description: "similar",
    });
    expect(r.status).toBe(200);
    const body = r.body as { decision: string; nameLayer: { match: string } };
    expect(["warn", "block"]).toContain(body.decision);
    expect(["fuzzy", "exact"]).toContain(body.nameLayer.match);
  });

  it("proceeds when name is entirely new", async () => {
    const r = await post(`${server.url}/name-check`, {
      type: "engine",
      proposedName: "TotallyNovelSchedulerEngine",
      description: "new concept",
    });
    expect(r.status).toBe(200);
    const body = r.body as { decision: string };
    expect(body.decision).toBe("proceed");
  });

  it("respects custom threshold", async () => {
    const loose = await post(`${server.url}/name-check`, {
      type: "engine",
      proposedName: "KienzleVariant",
      description: "x",
      threshold: 0.5,
    });
    const strict = await post(`${server.url}/name-check`, {
      type: "engine",
      proposedName: "KienzleVariant",
      description: "x",
      threshold: 0.99,
    });
    const looseDecision = (loose.body as { decision: string }).decision;
    const strictDecision = (strict.body as { decision: string }).decision;
    // Looser threshold catches more fuzzy matches, so its decision is at least
    // as strict (warn / block) as the strict one.
    const rank: Record<string, number> = { proceed: 0, warn: 1, block: 2 };
    expect(rank[looseDecision]).toBeGreaterThanOrEqual(rank[strictDecision]);
  });

  it("returns proceed when the asset directory is empty", async () => {
    const emptyRoot = buildFakeMcpRoot([]);
    const s = await startServer(emptyRoot);
    try {
      const r = await post(`${s.url}/name-check`, {
        type: "engine",
        proposedName: "AnythingEngine",
        description: "x",
      });
      const body = r.body as { decision: string };
      expect(body.decision).toBe("proceed");
    } finally {
      await s.close();
      fs.rmSync(emptyRoot, { recursive: true, force: true });
    }
  });
});

describe("createAssetCheckRouter — /layered-check", () => {
  let root: string;
  let server: { url: string; close: () => Promise<void> };

  beforeEach(async () => {
    root = buildFakeMcpRoot(["KienzleForceModelEngine"]);
    server = await startServer(root);
  });

  afterEach(async () => {
    await server.close();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("rejects yellowAt ≥ redAt", async () => {
    const r = await post(`${server.url}/layered-check`, {
      type: "engine",
      proposedName: "NewEngine",
      description: "x",
      yellowAt: 0.9,
      redAt: 0.5,
    });
    expect(r.status).toBe(400);
  });

  it("defaults band=yellow when no vectors supplied", async () => {
    const r = await post(`${server.url}/layered-check`, {
      type: "engine",
      proposedName: "TotallyNovelEngine",
      description: "x",
    });
    expect(r.status).toBe(200);
    const body = r.body as { decision: string; semanticLayer: { band: string } | null };
    expect(body.semanticLayer?.band).toBe("yellow");
    expect(body.decision).toBe("warn");
  });

  it("red band when candidate vector is near-identical to a reference", async () => {
    const r = await post(`${server.url}/layered-check`, {
      type: "engine",
      proposedName: "TotallyNovelEngine",
      description: "x",
      candidateVector: [1, 0, 0, 0],
      references: [{ id: "ref1", name: "Kienzle", vector: [1, 0, 0, 0] }],
    });
    const body = r.body as { decision: string; semanticLayer: { band: string; topMatchName: string } };
    expect(body.semanticLayer.band).toBe("red");
    expect(body.semanticLayer.topMatchName).toBe("Kienzle");
    expect(body.decision).toBe("block");
  });

  it("green band for orthogonal vectors", async () => {
    const r = await post(`${server.url}/layered-check`, {
      type: "engine",
      proposedName: "TotallyNovelEngine",
      description: "x",
      candidateVector: [1, 0, 0, 0],
      references: [{ id: "ref1", name: "Unrelated", vector: [0, 1, 0, 0] }],
    });
    const body = r.body as { decision: string; semanticLayer: { band: string } };
    expect(body.semanticLayer.band).toBe("green");
    expect(body.decision).toBe("proceed");
  });

  it("ignores references whose vector length differs", async () => {
    const r = await post(`${server.url}/layered-check`, {
      type: "engine",
      proposedName: "TotallyNovelEngine",
      description: "x",
      candidateVector: [1, 0, 0, 0],
      references: [{ id: "ref1", name: "WrongDim", vector: [1, 0] }],
    });
    const body = r.body as { semanticLayer: { band: string; rationale: string } };
    expect(body.semanticLayer.band).toBe("yellow");
    expect(body.semanticLayer.rationale).toMatch(/dimension/);
  });

  it("blocks on exact name + ignores band on short-circuit", async () => {
    const r = await post(`${server.url}/layered-check`, {
      type: "engine",
      proposedName: "KienzleForceModelEngine",
      description: "x",
      candidateVector: [1, 0],
      references: [{ id: "ref1", name: "Unrelated", vector: [0, 1] }],
    });
    const body = r.body as { decision: string; semanticLayer: null };
    expect(body.decision).toBe("block");
    expect(body.semanticLayer).toBeNull();
  });

  it("returns 400 on mismatched vector / reference schema", async () => {
    const r = await post(`${server.url}/layered-check`, {
      type: "engine",
      proposedName: "X",
      description: "x",
      candidateVector: [],
    });
    expect(r.status).toBe(400);
  });
});

describe("createAssetCheckRouter — /health", () => {
  let root: string;
  let server: { url: string; close: () => Promise<void> };

  beforeEach(async () => {
    root = buildFakeMcpRoot([]);
    server = await startServer(root);
  });

  afterEach(async () => {
    await server.close();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("reports status=ok and lists endpoints", async () => {
    const r = await get(`${server.url}/health`);
    const body = r.body as { status: string; endpoints: string[] };
    expect(body.status).toBe("ok");
    expect(body.endpoints.length).toBeGreaterThanOrEqual(3);
  });
});
