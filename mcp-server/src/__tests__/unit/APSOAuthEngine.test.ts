/**
 * PRISM MCP Server — APSOAuthEngine Unit Tests
 *
 * All "credential-shaped" values used in this file are generated at runtime
 * via randomBytes — they never appear as string literals in source code.
 * They are fixture data: their only purpose is to verify that the engine
 * routes opaque-string values through token-exchange and disk-cache
 * round-trips correctly.
 *
 * Coverage:
 *   - Config loading from env (missing/present)
 *   - getStatus reports correctly for: no-config / 2LO-only / 3LO-only / expired
 *   - begin2LO happy + error paths (401, malformed-JSON)
 *   - 3LO refresh (rotation + non-rotation + missing-refresh-token)
 *   - getAccessToken: 2LO happy, 2LO expired throws, 3LO happy, 3LO near-expiry auto-refresh
 *   - Cache load: missing-file → empty, corrupt JSON → delete+clean, schema-mismatch → clean
 *   - clearCache removes disk file
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { APSOAuthEngine, APSAuthError, type APSConfig } from "../../engines/APSOAuthEngine.js";

// ─────────────────────────────────────────────────────────────────────────────
// Fixture builders — opaque random strings, never literal credentials in source
// ─────────────────────────────────────────────────────────────────────────────

/** Build a fixture opaque-string with a recognizable test-only prefix. */
function fixture(prefix: string): string {
  return `${prefix}-fixture-${randomBytes(8).toString("hex")}`;
}

const TEST_PORT = 8765;
const TOKEN_TTL_SEC = 3600;
const ONE_HOUR_MS = 3600 * 1000;
const TWO_MIN_MS = 2 * 60 * 1000;
const TEN_MIN_MS = 10 * 60 * 1000;

// Per-suite fixture pool (rebuilt each beforeEach)
type Fixtures = {
  clientId: string;
  clientCred: string;
  access2LO: string;
  access3LO: string;
  refreshInitial: string;
  refreshRotated: string;
};

function makeFixtures(): Fixtures {
  return {
    clientId: fixture("client-id"),
    clientCred: fixture("client-cred"),
    access2LO: fixture("at-2lo"),
    access3LO: fixture("at-3lo"),
    refreshInitial: fixture("rt-initial"),
    refreshRotated: fixture("rt-rotated"),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function tmpCachePath(suffix: string): string {
  return join(tmpdir(), `prism-aps-tokens-test-${suffix}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
}

function makeConfig(cachePath: string, fx: Fixtures): APSConfig {
  return {
    clientId: fx.clientId,
    clientSecret: fx.clientCred,
    callbackPort: TEST_PORT,
    callbackPath: "/callback",
    tokenCachePath: cachePath,
  };
}

function mockFetchOnce(body: unknown, init: { status?: number } = {}): void {
  const status = init.status ?? 200;
  const response = {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  } as Response;
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response);
}

async function cleanup(path: string): Promise<void> {
  try { await fs.unlink(path); } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Config loading
// ─────────────────────────────────────────────────────────────────────────────

describe("APSOAuthEngine — config", () => {
  it("throws APSAuthError when APS_CLIENT_ID missing from env", () => {
    const engine = new APSOAuthEngine();
    const savedId = process.env.APS_CLIENT_ID;
    delete process.env.APS_CLIENT_ID;
    try {
      expect(() => engine.ensureConfig()).toThrow(APSAuthError);
      expect(() => engine.ensureConfig()).toThrow(/APS_CLIENT_ID/);
    } finally {
      if (savedId !== undefined) process.env.APS_CLIENT_ID = savedId;
    }
  });

  it("getStatus reports configured:false when env missing", async () => {
    const engine = new APSOAuthEngine();
    const saved = { id: process.env.APS_CLIENT_ID, secret: process.env.APS_CLIENT_SECRET };
    delete process.env.APS_CLIENT_ID;
    delete process.env.APS_CLIENT_SECRET;
    try {
      const status = await engine.getStatus();
      expect(status.configured).toBe(false);
      expect(status.authenticated2LO).toBe(false);
      expect(status.authenticated3LO).toBe(false);
    } finally {
      if (saved.id !== undefined) process.env.APS_CLIENT_ID = saved.id;
      if (saved.secret !== undefined) process.env.APS_CLIENT_SECRET = saved.secret;
    }
  });

  it("setConfig injects config explicitly, bypassing env", async () => {
    const engine = new APSOAuthEngine();
    const cachePath = tmpCachePath("setconfig");
    const fx = makeFixtures();
    engine.setConfig(makeConfig(cachePath, fx));
    const status = await engine.getStatus();
    expect(status.configured).toBe(true);
    expect(status.redirectUri).toBe(`http://127.0.0.1:${TEST_PORT}/callback`);
    await cleanup(cachePath);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Token cache
// ─────────────────────────────────────────────────────────────────────────────

describe("APSOAuthEngine — token cache", () => {
  let engine: APSOAuthEngine;
  let cachePath: string;
  let fx: Fixtures;

  beforeEach(() => {
    engine = new APSOAuthEngine();
    cachePath = tmpCachePath("cache");
    fx = makeFixtures();
    engine.setConfig(makeConfig(cachePath, fx));
  });

  afterEach(async () => {
    await cleanup(cachePath);
  });

  it("loadCache returns empty state when file missing (ENOENT)", async () => {
    await engine.loadCache();
    const status = await engine.getStatus();
    expect(status.authenticated2LO).toBe(false);
    expect(status.authenticated3LO).toBe(false);
  });

  it("loadCache wipes and starts clean on corrupt JSON", async () => {
    await fs.writeFile(cachePath, "{this is not valid json}", "utf8");
    await engine.loadCache();
    const status = await engine.getStatus();
    expect(status.authenticated2LO).toBe(false);
    await expect(fs.access(cachePath)).rejects.toThrow();
  });

  it("loadCache starts clean on schema-version mismatch", async () => {
    const ignoredToken = fixture("should-be-ignored");
    await fs.writeFile(
      cachePath,
      JSON.stringify({
        schemaVersion: "0.99.0-old",
        twoLegged: { access_token: ignoredToken, expires_at: Date.now() + ONE_HOUR_MS, scope: "data:read" },
      }),
      "utf8",
    );
    await engine.loadCache();
    const status = await engine.getStatus();
    expect(status.authenticated2LO).toBe(false);
  });

  it("loadCache restores valid 2LO token from disk", async () => {
    const expiresAt = Date.now() + ONE_HOUR_MS;
    await fs.writeFile(
      cachePath,
      JSON.stringify({
        schemaVersion: "1.0.0",
        twoLegged: { access_token: fx.access2LO, expires_at: expiresAt, scope: "data:read" },
      }),
      "utf8",
    );
    await engine.loadCache();
    const token = await engine.getAccessToken("2LO");
    expect(token).toBe(fx.access2LO);
  });

  it("clearCache removes the disk file and resets state", async () => {
    await fs.writeFile(
      cachePath,
      JSON.stringify({
        schemaVersion: "1.0.0",
        twoLegged: { access_token: fx.access2LO, expires_at: Date.now() + ONE_HOUR_MS, scope: "" },
      }),
      "utf8",
    );
    await engine.loadCache();
    await engine.clearCache();
    await expect(fs.access(cachePath)).rejects.toThrow();
    const status = await engine.getStatus();
    expect(status.authenticated2LO).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// begin2LO
// ─────────────────────────────────────────────────────────────────────────────

describe("APSOAuthEngine — begin2LO", () => {
  let engine: APSOAuthEngine;
  let cachePath: string;
  let fx: Fixtures;

  beforeEach(() => {
    engine = new APSOAuthEngine();
    cachePath = tmpCachePath("2lo");
    fx = makeFixtures();
    engine.setConfig(makeConfig(cachePath, fx));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanup(cachePath);
  });

  it("fetches and caches a 2LO token on happy path", async () => {
    mockFetchOnce({
      access_token: fx.access2LO,
      expires_in: TOKEN_TTL_SEC,
      scope: "data:read viewables:read",
      token_type: "Bearer",
    });
    await engine.begin2LO();
    const status = await engine.getStatus();
    expect(status.authenticated2LO).toBe(true);
    expect(status.expiresIn2LO).toBeGreaterThan(TOKEN_TTL_SEC - 60);
    expect(status.expiresIn2LO).toBeLessThanOrEqual(TOKEN_TTL_SEC);
    const token = await engine.getAccessToken("2LO");
    expect(token).toBe(fx.access2LO);
  });

  it("persists 2LO token to disk", async () => {
    mockFetchOnce({
      access_token: fx.access2LO,
      expires_in: TOKEN_TTL_SEC,
      scope: "data:read",
      token_type: "Bearer",
    });
    await engine.begin2LO();
    const onDisk = JSON.parse(await fs.readFile(cachePath, "utf8")) as {
      schemaVersion: string;
      twoLegged: { access_token: string };
    };
    expect(onDisk.schemaVersion).toBe("1.0.0");
    expect(onDisk.twoLegged.access_token).toBe(fx.access2LO);
  });

  it("throws APSAuthError when APS returns 401 invalid_client", async () => {
    mockFetchOnce(
      { error: "invalid_client", errorMessage: "client_id or client credentials are invalid" },
      { status: 401 },
    );
    try {
      await engine.begin2LO();
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(APSAuthError);
      expect((e as APSAuthError).code).toBe("token-request-failed");
      expect((e as Error).message).toContain("invalid_client");
    }
  });

  it("throws APSAuthError when APS returns malformed (non-JSON) response", async () => {
    mockFetchOnce("<html>maintenance window</html>");
    await expect(engine.begin2LO()).rejects.toThrow(/non-JSON|non-json/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getAccessToken — expiry handling
// ─────────────────────────────────────────────────────────────────────────────

describe("APSOAuthEngine — getAccessToken expiry", () => {
  let engine: APSOAuthEngine;
  let cachePath: string;
  let fx: Fixtures;

  beforeEach(() => {
    engine = new APSOAuthEngine();
    cachePath = tmpCachePath("expiry");
    fx = makeFixtures();
    engine.setConfig(makeConfig(cachePath, fx));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanup(cachePath);
  });

  it("throws token-expired when 2LO access_token past expiry", async () => {
    await fs.writeFile(
      cachePath,
      JSON.stringify({
        schemaVersion: "1.0.0",
        twoLegged: { access_token: fx.access2LO, expires_at: Date.now() - 1000, scope: "data:read" },
      }),
      "utf8",
    );
    await engine.loadCache();
    await expect(engine.getAccessToken("2LO")).rejects.toThrow(APSAuthError);
    await expect(engine.getAccessToken("2LO")).rejects.toThrow(/expired/);
  });

  it("throws not-authenticated when no 2LO token cached", async () => {
    await engine.loadCache();
    await expect(engine.getAccessToken("2LO")).rejects.toThrow(/not-authenticated|begin2LO/);
  });

  it("auto-refreshes 3LO when access_token within 5min of expiry", async () => {
    const oldAccess = fixture("at-3lo-old");
    await fs.writeFile(
      cachePath,
      JSON.stringify({
        schemaVersion: "1.0.0",
        threeLegged: {
          access_token: oldAccess,
          refresh_token: fx.refreshInitial,
          expires_at: Date.now() + TWO_MIN_MS,
          scope: "data:read offline_access",
          obtained_at: Date.now() - TEN_MIN_MS,
        },
      }),
      "utf8",
    );
    await engine.loadCache();
    mockFetchOnce({
      access_token: fx.access3LO,
      refresh_token: fx.refreshRotated,
      expires_in: TOKEN_TTL_SEC,
      scope: "data:read offline_access",
      token_type: "Bearer",
    });
    const token = await engine.getAccessToken("3LO");
    expect(token).toBe(fx.access3LO);
    const onDisk = JSON.parse(await fs.readFile(cachePath, "utf8")) as {
      threeLegged: { refresh_token: string };
    };
    expect(onDisk.threeLegged.refresh_token).toBe(fx.refreshRotated);
  });

  it("preserves obtained_at across refresh (refresh is not a new grant)", async () => {
    const originalObtainedAt = Date.now() - TEN_MIN_MS;
    const oldAccess = fixture("at-3lo-stale");
    await fs.writeFile(
      cachePath,
      JSON.stringify({
        schemaVersion: "1.0.0",
        threeLegged: {
          access_token: oldAccess,
          refresh_token: fx.refreshInitial,
          expires_at: Date.now() + TWO_MIN_MS,
          scope: "data:read",
          obtained_at: originalObtainedAt,
        },
      }),
      "utf8",
    );
    await engine.loadCache();
    mockFetchOnce({ access_token: fx.access3LO, expires_in: TOKEN_TTL_SEC, token_type: "Bearer" });
    await engine.getAccessToken("3LO");
    const onDisk = JSON.parse(await fs.readFile(cachePath, "utf8")) as {
      threeLegged: { obtained_at: number };
    };
    expect(onDisk.threeLegged.obtained_at).toBe(originalObtainedAt);
  });

  it("uses cached 3LO token without refresh when far from expiry", async () => {
    await fs.writeFile(
      cachePath,
      JSON.stringify({
        schemaVersion: "1.0.0",
        threeLegged: {
          access_token: fx.access3LO,
          refresh_token: fx.refreshInitial,
          expires_at: Date.now() + ONE_HOUR_MS,
          scope: "data:read",
          obtained_at: Date.now(),
        },
      }),
      "utf8",
    );
    await engine.loadCache();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const token = await engine.getAccessToken("3LO");
    expect(token).toBe(fx.access3LO);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// refresh3LO
// ─────────────────────────────────────────────────────────────────────────────

describe("APSOAuthEngine — refresh3LO", () => {
  let engine: APSOAuthEngine;
  let cachePath: string;
  let fx: Fixtures;

  beforeEach(() => {
    engine = new APSOAuthEngine();
    cachePath = tmpCachePath("refresh");
    fx = makeFixtures();
    engine.setConfig(makeConfig(cachePath, fx));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanup(cachePath);
  });

  it("throws no-refresh-token when called without a cached refresh_token", async () => {
    await engine.loadCache();
    await expect(engine.refresh3LO()).rejects.toThrow(APSAuthError);
    await expect(engine.refresh3LO()).rejects.toThrow(/no refresh_token/);
  });

  it("falls back to cached refresh_token when APS does not rotate it", async () => {
    const oldAccess = fixture("at-3lo-old");
    await fs.writeFile(
      cachePath,
      JSON.stringify({
        schemaVersion: "1.0.0",
        threeLegged: {
          access_token: oldAccess,
          refresh_token: fx.refreshInitial,
          expires_at: Date.now() + TWO_MIN_MS,
          scope: "data:read",
          obtained_at: Date.now(),
        },
      }),
      "utf8",
    );
    await engine.loadCache();
    mockFetchOnce({ access_token: fx.access3LO, expires_in: TOKEN_TTL_SEC, token_type: "Bearer" });
    await engine.refresh3LO();
    const onDisk = JSON.parse(await fs.readFile(cachePath, "utf8")) as {
      threeLegged: { refresh_token: string };
    };
    expect(onDisk.threeLegged.refresh_token).toBe(fx.refreshInitial);
  });
});
