/**
 * HyperMillACConnectionManager — strict-legitimacy vitest
 *
 * Coverage shape:
 *   class shape + happy + ≥3 failure modes + ≥2 adversarial
 *
 * The engine has two modes:
 *   1. mock (PRISM_CAD_MOCK=1 or opts.mockMode=true) — deterministic, no network.
 *   2. real — TCP probe via node:net.
 * Both modes are exercised. For real mode we spin up an ephemeral net.Server
 * inside the test so it is a true round-trip, not a mock.
 */
import { describe, it, expect, afterEach } from "vitest";
import * as net from "node:net";
import { HyperMillACConnectionManager } from "../engines/HyperMillACConnectionManager.js";

// ── Named constants ─────────────────────────────────────────────────────────
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 18365;
const SHORT_TIMEOUT_MS = 100;
// 198.51.100.0/24 is RFC 5737 TEST-NET-2 — guaranteed unroutable on the public
// internet. Combined with a short timeout this gives a deterministic timeout case.
const UNROUTABLE_HOST = "198.51.100.1";
const UNUSED_PORT = 1; // Reserved port; bind not allowed without root → ECONNREFUSED on connect
const SESSION_PREFIX_MOCK = "mock-";
const SESSION_PREFIX_REAL = "ac-";

let activeServers: net.Server[] = [];

const startEphemeralServer = (): Promise<{ port: number; server: net.Server }> =>
  new Promise((resolvePromise, rejectPromise) => {
    const server = net.createServer((socket) => socket.end());
    server.unref();
    server.once("error", rejectPromise);
    server.listen(0, DEFAULT_HOST, () => {
      const addr = server.address();
      if (typeof addr === "object" && addr !== null) {
        activeServers.push(server);
        resolvePromise({ port: addr.port, server });
      } else {
        rejectPromise(new Error("could not allocate ephemeral port"));
      }
    });
  });

afterEach(() => {
  for (const s of activeServers) {
    try { s.close(); } catch { /* ignore */ }
  }
  activeServers = [];
});

describe("HyperMillACConnectionManager", () => {
  // ── Class shape ────────────────────────────────────────────────────────────
  describe("class shape", () => {
    it("constructor with no options uses defaults (host=127.0.0.1, port=18365)", async () => {
      const cm = new HyperMillACConnectionManager({ mockMode: true });
      const r = await cm.connect();
      expect(r.host).toBe(DEFAULT_HOST);
      expect(r.port).toBe(DEFAULT_PORT);
    });

    it("exposes connect/disconnect/isActive/getSessionId/healthCheck", () => {
      const cm = new HyperMillACConnectionManager({ mockMode: true });
      expect(typeof cm.connect).toBe("function");
      expect(typeof cm.disconnect).toBe("function");
      expect(typeof cm.isActive).toBe("function");
      expect(typeof cm.getSessionId).toBe("function");
      expect(typeof cm.healthCheck).toBe("function");
    });
  });

  // ── Mock-mode happy paths ──────────────────────────────────────────────────
  describe("mock mode", () => {
    it("connect → connected=true, sessionId starts with 'mock-'", async () => {
      const cm = new HyperMillACConnectionManager({ mockMode: true });
      const r = await cm.connect();
      expect(r.connected).toBe(true);
      expect(typeof r.sessionId).toBe("string");
      expect(r.sessionId!.startsWith(SESSION_PREFIX_MOCK)).toBe(true);
    });

    it("isActive flips false → true after connect", async () => {
      const cm = new HyperMillACConnectionManager({ mockMode: true });
      expect(cm.isActive()).toBe(false);
      await cm.connect();
      expect(cm.isActive()).toBe(true);
    });

    it("getSessionId is null before connect, non-null after", async () => {
      const cm = new HyperMillACConnectionManager({ mockMode: true });
      expect(cm.getSessionId()).toBe(null);
      await cm.connect();
      const sid = cm.getSessionId();
      expect(sid !== null).toBe(true);
      expect(sid!.startsWith(SESSION_PREFIX_MOCK)).toBe(true);
    });

    it("disconnect clears session and isActive returns false", async () => {
      const cm = new HyperMillACConnectionManager({ mockMode: true });
      await cm.connect();
      const r = cm.disconnect();
      expect(r.disconnected).toBe(true);
      expect(cm.isActive()).toBe(false);
      expect(cm.getSessionId()).toBe(null);
    });

    it("disconnect without prior connect returns disconnected=true with explanatory message", () => {
      const cm = new HyperMillACConnectionManager({ mockMode: true });
      const r = cm.disconnect();
      expect(r.disconnected).toBe(true);
      expect(r.message).toBe("no active session");
    });

    it("healthCheck always reports healthy in mock mode", async () => {
      const cm = new HyperMillACConnectionManager({ mockMode: true });
      const r = await cm.healthCheck();
      expect(r.healthy).toBe(true);
    });

    it("custom host/port options propagate through connect result", async () => {
      const CUSTOM_HOST = "10.0.0.5";
      const CUSTOM_PORT = 65000;
      const cm = new HyperMillACConnectionManager({
        mockMode: true,
        host: CUSTOM_HOST,
        port: CUSTOM_PORT,
      });
      const r = await cm.connect();
      expect(r.host).toBe(CUSTOM_HOST);
      expect(r.port).toBe(CUSTOM_PORT);
    });
  });

  // ── Real-mode happy path (ephemeral local server) ──────────────────────────
  describe("real-mode TCP probe (ephemeral local server)", () => {
    it("connect to live server → connected=true, sessionId starts with 'ac-'", async () => {
      const { port } = await startEphemeralServer();
      const cm = new HyperMillACConnectionManager({
        mockMode: false,
        host: DEFAULT_HOST,
        port,
        timeout_ms: SHORT_TIMEOUT_MS * 5,
      });
      const r = await cm.connect();
      expect(r.connected).toBe(true);
      expect(r.sessionId !== undefined).toBe(true);
      expect(r.sessionId!.startsWith(SESSION_PREFIX_REAL)).toBe(true);
      expect(r.host).toBe(DEFAULT_HOST);
      expect(r.port).toBe(port);
    });

    it("healthCheck after live connect → healthy=true", async () => {
      const { port } = await startEphemeralServer();
      const cm = new HyperMillACConnectionManager({
        mockMode: false,
        host: DEFAULT_HOST,
        port,
        timeout_ms: SHORT_TIMEOUT_MS * 5,
      });
      await cm.connect();
      const r = await cm.healthCheck();
      expect(r.healthy).toBe(true);
    });

    it("healthCheck without session reports unhealthy with 'no session' message", async () => {
      const cm = new HyperMillACConnectionManager({
        mockMode: false,
        host: DEFAULT_HOST,
        port: UNUSED_PORT,
      });
      const r = await cm.healthCheck();
      expect(r.healthy).toBe(false);
      expect(r.message).toBe("no session");
    });
  });

  // ── Real-mode failure modes ────────────────────────────────────────────────
  describe("real-mode failure modes", () => {
    it("connect to closed port → connected=false, error message captured", async () => {
      // Bind ephemeral, capture port, close server immediately so probe gets ECONNREFUSED.
      const { port, server } = await startEphemeralServer();
      await new Promise<void>((res) => server.close(() => res()));
      const cm = new HyperMillACConnectionManager({
        mockMode: false,
        host: DEFAULT_HOST,
        port,
        timeout_ms: SHORT_TIMEOUT_MS * 10,
      });
      const r = await cm.connect();
      expect(r.connected).toBe(false);
      expect(typeof r.message).toBe("string");
      expect(r.message!.length > 0).toBe(true);
      expect(cm.isActive()).toBe(false);
    });

    it("connect to unroutable host with short timeout → connected=false, timeout in message", async () => {
      const cm = new HyperMillACConnectionManager({
        mockMode: false,
        host: UNROUTABLE_HOST,
        port: DEFAULT_PORT,
        timeout_ms: SHORT_TIMEOUT_MS,
      });
      const r = await cm.connect();
      expect(r.connected).toBe(false);
      // Either the timeout fires first ("timed out") or the OS returns
      // ENETUNREACH/EHOSTUNREACH — both are valid failure messages.
      const msg = r.message ?? "";
      const looksLikeFailure =
        msg.includes("timed out") ||
        msg.toLowerCase().includes("unreachable") ||
        msg.toLowerCase().includes("network") ||
        msg.toLowerCase().includes("host");
      expect(looksLikeFailure).toBe(true);
    });

    it("healthCheck after failed connect (no session opened) → healthy=false 'no session'", async () => {
      const cm = new HyperMillACConnectionManager({
        mockMode: false,
        host: UNROUTABLE_HOST,
        port: DEFAULT_PORT,
        timeout_ms: SHORT_TIMEOUT_MS,
      });
      await cm.connect(); // expected to fail and NOT set session
      const r = await cm.healthCheck();
      expect(r.healthy).toBe(false);
      expect(r.message).toBe("no session");
    });
  });

  // ── Adversarial / lifecycle re-entry ───────────────────────────────────────
  describe("adversarial inputs", () => {
    it("connect twice in mock mode produces a fresh sessionId both times", async () => {
      const cm = new HyperMillACConnectionManager({ mockMode: true });
      const r1 = await cm.connect();
      // 1ms delay so Date.now() changes; deterministic for reasonable clocks
      await new Promise<void>((res) => setTimeout(res, 2));
      const r2 = await cm.connect();
      expect(r1.sessionId !== r2.sessionId).toBe(true);
    });

    it("disconnect then reconnect succeeds", async () => {
      const cm = new HyperMillACConnectionManager({ mockMode: true });
      await cm.connect();
      cm.disconnect();
      expect(cm.isActive()).toBe(false);
      const r = await cm.connect();
      expect(r.connected).toBe(true);
      expect(cm.isActive()).toBe(true);
    });

    it("disconnect twice in a row is safe (second call → 'no active session')", async () => {
      const cm = new HyperMillACConnectionManager({ mockMode: true });
      await cm.connect();
      const r1 = cm.disconnect();
      const r2 = cm.disconnect();
      expect(r1.disconnected).toBe(true);
      expect(r2.disconnected).toBe(true);
      expect(r2.message).toBe("no active session");
    });
  });
});
