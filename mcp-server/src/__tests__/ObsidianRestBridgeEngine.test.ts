/**
 * ObsidianRestBridgeEngine.test.ts
 *
 * Verifies the fail-soft + fail-closed contract of the live Obsidian vault client
 * WITHOUT a live vault: every method returns a typed { ok, reason } result and
 * never throws. An injected fake transport exercises live / down / timeout /
 * no-key / non-loopback / unauthenticated / bad-payload paths. The no-key,
 * non-loopback, and traversal short-circuits must open NO socket.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ObsidianRestBridgeEngine,
  readPluginApiKey,
  _resetPluginKeyCache,
  type ObsidianTransport,
  type RawResponse,
} from "../engines/ObsidianRestBridgeEngine.js";

const KEY = "PRISM_OBSIDIAN_API_KEY";
const URLK = "PRISM_OBSIDIAN_URL";
const REMOTE = "PRISM_OBSIDIAN_ALLOW_REMOTE";
const VAULTK = "PRISM_OBSIDIAN_VAULT";

/** A transport that returns a canned response. */
function ok(status: number, text: string): ObsidianTransport {
  return vi.fn(async (): Promise<RawResponse> => ({ status, text }));
}
/** A transport that throws (network error / timeout). */
function throws(message: string): ObsidianTransport {
  return vi.fn(async (): Promise<RawResponse> => {
    throw new Error(message);
  });
}
const AUTHED = '{"status":"OK","authenticated":true}';
const UNAUTHED = '{"status":"OK","authenticated":false}';

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {
    [KEY]: process.env[KEY],
    [URLK]: process.env[URLK],
    [REMOTE]: process.env[REMOTE],
    [VAULTK]: process.env[VAULTK],
  };
  // HERMETICITY: the plugin-config key fallback (U-OBS-KEY-PLUGIN-FALLBACK) would
  // find the REAL vault key on a dev box and turn every "no key" scenario into a
  // live-keyed one. Pin the vault root to a nonexistent dir so the fallback
  // resolves "" and `delete process.env[KEY]` means what these tests intend.
  process.env[VAULTK] = "Z:/__no_such_vault__";
  _resetPluginKeyCache();
  ObsidianRestBridgeEngine._resetHealthCache();
});
afterEach(() => {
  for (const k of [KEY, URLK, REMOTE, VAULTK]) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  _resetPluginKeyCache();
  ObsidianRestBridgeEngine._resetHealthCache();
  vi.restoreAllMocks();
});

describe("ObsidianRestBridgeEngine — no-key short-circuit (no socket)", () => {
  it("status returns no-key WITHOUT calling the transport", async () => {
    delete process.env[KEY];
    const t = ok(200, AUTHED);
    const res = await ObsidianRestBridgeEngine.status(t);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("no-key");
    expect(res.data?.live).toBe(false);
    expect(t).not.toHaveBeenCalled();
  });

  it("isLive returns false WITHOUT calling the transport when no key", async () => {
    delete process.env[KEY];
    const t = ok(200, AUTHED);
    expect(await ObsidianRestBridgeEngine.isLive(t)).toBe(false);
    expect(t).not.toHaveBeenCalled();
  });

  it("read / search / activeNote all short-circuit to no-key", async () => {
    delete process.env[KEY];
    const t = ok(200, "x");
    expect((await ObsidianRestBridgeEngine.read("a.md", t)).reason).toBe("no-key");
    expect((await ObsidianRestBridgeEngine.search("q", t)).reason).toBe("no-key");
    expect((await ObsidianRestBridgeEngine.activeNote(t)).reason).toBe("no-key");
    expect(t).not.toHaveBeenCalled();
  });
});

describe("ObsidianRestBridgeEngine — fail-closed on non-loopback URL", () => {
  beforeEach(() => {
    process.env[KEY] = "test-key";
  });

  it("refuses a non-loopback URL WITHOUT opening a socket (no bearer key sent)", async () => {
    process.env[URLK] = "https://evil.example.com";
    delete process.env[REMOTE];
    const t = ok(200, AUTHED);
    expect((await ObsidianRestBridgeEngine.status(t)).reason).toBe("non-loopback-url");
    expect((await ObsidianRestBridgeEngine.read("a.md", t)).reason).toBe("non-loopback-url");
    expect((await ObsidianRestBridgeEngine.search("q", t)).reason).toBe("non-loopback-url");
    expect(await ObsidianRestBridgeEngine.isLive(t)).toBe(false);
    expect(t).not.toHaveBeenCalled();
  });

  it("permits a non-loopback URL ONLY with the explicit remote opt-in", async () => {
    process.env[URLK] = "https://remote.vault.example";
    process.env[REMOTE] = "1";
    const t = ok(200, AUTHED);
    const res = await ObsidianRestBridgeEngine.status(t);
    expect(res.ok).toBe(true);
    expect(t).toHaveBeenCalled();
  });

  it("does NOT treat a 127.x-prefixed FQDN as loopback (key not sent, no socket)", async () => {
    // 127.0.0.1.evil.com is a publicly-resolvable foreign host, not loopback.
    process.env[URLK] = "https://127.0.0.1.evil.com:27123";
    delete process.env[REMOTE];
    const t = ok(200, AUTHED);
    expect((await ObsidianRestBridgeEngine.status(t)).reason).toBe("non-loopback-url");
    expect(t).not.toHaveBeenCalled();
  });

  it("accepts loopback variants (127.x, localhost, ::1) by default", async () => {
    for (const u of ["https://127.0.0.1:27123", "http://localhost:27124", "https://[::1]:27123"]) {
      process.env[URLK] = u;
      ObsidianRestBridgeEngine._resetHealthCache();
      const res = await ObsidianRestBridgeEngine.status(ok(200, AUTHED));
      expect(res.ok).toBe(true);
    }
  });
});

describe("ObsidianRestBridgeEngine — usable = reachable AND authenticated", () => {
  beforeEach(() => {
    process.env[KEY] = "test-key";
  });

  it("status ok only when 2xx body reports authenticated:true", async () => {
    const res = await ObsidianRestBridgeEngine.status(ok(200, AUTHED));
    expect(res.ok).toBe(true);
    expect(res.data?.live).toBe(true);
    expect(res.data?.authenticated).toBe(true);
  });

  it("status reports 'unauthorized' on a reachable-but-unauthenticated vault (bad key → 200 authenticated:false)", async () => {
    const res = await ObsidianRestBridgeEngine.status(ok(200, UNAUTHED));
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("unauthorized");
    expect(res.data?.live).toBe(true); // server up
    expect(res.data?.authenticated).toBe(false);
  });

  it("isLive true only for authenticated; false for unauthenticated and for 401", async () => {
    expect(await ObsidianRestBridgeEngine.isLive(ok(200, AUTHED))).toBe(true);
    ObsidianRestBridgeEngine._resetHealthCache();
    expect(await ObsidianRestBridgeEngine.isLive(ok(200, UNAUTHED))).toBe(false);
    ObsidianRestBridgeEngine._resetHealthCache();
    expect(await ObsidianRestBridgeEngine.isLive(ok(401, ""))).toBe(false);
  });
});

describe("ObsidianRestBridgeEngine — read / search / activeNote (live)", () => {
  beforeEach(() => {
    process.env[KEY] = "test-key";
  });

  it("read returns note content on 200", async () => {
    const res = await ObsidianRestBridgeEngine.read("memories/x.md", ok(200, "# Note body"));
    expect(res.ok).toBe(true);
    expect(res.data).toBe("# Note body");
  });

  it("read returns ok with empty data for a 200 empty body", async () => {
    const res = await ObsidianRestBridgeEngine.read("empty.md", ok(200, ""));
    expect(res.ok).toBe(true);
    expect(res.data).toBe("");
  });

  it("read maps 404 to not-found", async () => {
    const res = await ObsidianRestBridgeEngine.read("missing.md", ok(404, ""));
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("not-found");
  });

  it("search parses the simple-search array", async () => {
    const body = JSON.stringify([
      { filename: "a.md", score: 9.5 },
      { filename: "b.md" },
      { nofilename: true },
    ]);
    const res = await ObsidianRestBridgeEngine.search("turbo", ok(200, body));
    expect(res.ok).toBe(true);
    expect(res.data?.[0]).toEqual({ filename: "a.md", score: 9.5 });
    expect(res.data?.[1]).toEqual({ filename: "b.md", score: undefined });
    expect(res.data?.[2].filename).toBe("");
  });

  it("activeNote returns the open note", async () => {
    const res = await ObsidianRestBridgeEngine.activeNote(ok(200, "active body"));
    expect(res.ok).toBe(true);
    expect(res.data).toBe("active body");
  });

  it("activeNote maps 404 to no-active-note", async () => {
    const res = await ObsidianRestBridgeEngine.activeNote(ok(404, ""));
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("no-active-note");
  });
});

describe("ObsidianRestBridgeEngine — fail-soft (down / timeout / bad payload)", () => {
  beforeEach(() => {
    process.env[KEY] = "test-key";
  });

  it("status surfaces 'unreachable' on a network error (never throws)", async () => {
    const res = await ObsidianRestBridgeEngine.status(throws("ECONNREFUSED"));
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("unreachable");
    expect(res.data?.live).toBe(false);
  });

  it("surfaces 'timeout' on an AbortTimeout", async () => {
    const res = await ObsidianRestBridgeEngine.read("a.md", throws("AbortTimeout"));
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("timeout");
  });

  it("isLive returns false (no throw) when the transport errors", async () => {
    expect(await ObsidianRestBridgeEngine.isLive(throws("boom"))).toBe(false);
  });

  it("read surfaces non-2xx as http-<status>", async () => {
    const res = await ObsidianRestBridgeEngine.read("a.md", ok(503, "down"));
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("http-503");
  });

  it("search returns bad-json on unparseable body", async () => {
    const res = await ObsidianRestBridgeEngine.search("q", ok(200, "<<not json>>"));
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("bad-json");
  });

  it("search returns empty array for a non-array JSON body", async () => {
    const res = await ObsidianRestBridgeEngine.search("q", ok(200, '{"unexpected":1}'));
    expect(res.ok).toBe(true);
    expect(res.data).toEqual([]);
  });
});

describe("ObsidianRestBridgeEngine — input safety + caps + cache", () => {
  beforeEach(() => {
    process.env[KEY] = "test-key";
  });

  it("read rejects path traversal WITHOUT calling the transport", async () => {
    const t = ok(200, "secret");
    expect((await ObsidianRestBridgeEngine.read("../../etc/passwd", t)).reason).toBe("unsafe-path");
    expect((await ObsidianRestBridgeEngine.read("/abs/path.md", t)).reason).toBe("unsafe-path");
    expect(t).not.toHaveBeenCalled();
  });

  it("read rejects an empty path as invalid", async () => {
    expect((await ObsidianRestBridgeEngine.read("", ok(200, "x"))).reason).toBe("invalid-path");
  });

  it("search rejects an empty query as invalid", async () => {
    expect((await ObsidianRestBridgeEngine.search("", ok(200, "[]"))).reason).toBe("invalid-query");
  });

  it("read caps oversized note bodies with a truncation marker", async () => {
    const big = "x".repeat(20 * 1024);
    const res = await ObsidianRestBridgeEngine.read("big.md", ok(200, big));
    expect(res.ok).toBe(true);
    expect(res.data!.length).toBeLessThan(big.length);
    expect(res.data!.endsWith("[truncated]")).toBe(true);
  });

  it("isLive caches the verdict (transport called once within TTL)", async () => {
    const t = ok(200, AUTHED);
    await ObsidianRestBridgeEngine.isLive(t);
    await ObsidianRestBridgeEngine.isLive(t);
    expect(t).toHaveBeenCalledTimes(1);
  });
});

describe("readPluginApiKey — plugin-config key fallback (U-OBS-KEY-PLUGIN-FALLBACK)", () => {
  const PLUGIN_JSON = '{"port":27123,"apiKey":"abc123def456","enableSecureServer":true}';

  beforeEach(() => _resetPluginKeyCache());

  it("reads the apiKey from the plugin data.json (happy path)", () => {
    const read = vi.fn(() => PLUGIN_JSON);
    expect(readPluginApiKey("V:/vault", read)).toBe("abc123def456");
    expect(read).toHaveBeenCalledTimes(1);
    // join() emits platform separators; normalize before asserting the path shape.
    const calledWith = String(read.mock.calls[0][0]).replace(/\\/g, "/");
    expect(calledWith).toBe("V:/vault/.obsidian/plugins/obsidian-local-rest-api/data.json");
  });

  it("env var WINS over the plugin config (operator override preserved)", async () => {
    process.env[KEY] = "env-key-wins";
    const t = ok(200, AUTHED);
    const res = await ObsidianRestBridgeEngine.status(t);
    expect(res.ok).toBe(true); // engine used env key; vault root is bogus so fallback would yield ""
  });

  it("engine-level wiring: no env key + real plugin file => status authenticates", async () => {
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join: j } = await import("node:path");
    const root = mkdtempSync(j(tmpdir(), "obs-vault-"));
    try {
      const pluginDir = j(root, ".obsidian", "plugins", "obsidian-local-rest-api");
      mkdirSync(pluginDir, { recursive: true });
      writeFileSync(j(pluginDir, "data.json"), PLUGIN_JSON);
      delete process.env[KEY];
      process.env[VAULTK] = root;
      _resetPluginKeyCache();
      const t = ok(200, AUTHED);
      const res = await ObsidianRestBridgeEngine.status(t);
      expect(res.ok).toBe(true); // key came from the plugin file, not env
      expect(t).toHaveBeenCalled();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("failure: missing file (read throws) => '' (no-key path, never throws)", () => {
    const read = vi.fn(() => { throw new Error("ENOENT"); });
    expect(readPluginApiKey("V:/vault", read)).toBe("");
  });

  it("failure: malformed JSON => ''", () => {
    _resetPluginKeyCache();
    expect(readPluginApiKey("V:/vault", () => "<<not json>>")).toBe("");
  });

  it("failure: apiKey missing / non-string / empty-after-trim => ''", () => {
    for (const body of ['{"port":27123}', '{"apiKey":42}', '{"apiKey":"   "}', '{"apiKey":null}']) {
      _resetPluginKeyCache();
      expect(readPluginApiKey("V:/vault", () => body)).toBe("");
    }
  });

  it("adversarial: empty file and JSON array bodies => ''", () => {
    for (const body of ["", "[]", '["apiKey","x"]']) {
      _resetPluginKeyCache();
      expect(readPluginApiKey("V:/vault", () => body)).toBe("");
    }
  });

  it("trims surrounding whitespace from the key", () => {
    expect(readPluginApiKey("V:/vault", () => '{"apiKey":"  padded  "}')).toBe("padded");
  });

  it("caches within TTL (file read once), refreshes after TTL", () => {
    let t = 1_000_000;
    const read = vi.fn(() => PLUGIN_JSON);
    expect(readPluginApiKey("V:/vault", read, () => t)).toBe("abc123def456");
    expect(readPluginApiKey("V:/vault", read, () => t + 1_000)).toBe("abc123def456");
    expect(read).toHaveBeenCalledTimes(1); // second call served from cache
    expect(readPluginApiKey("V:/vault", read, () => t + 61_000)).toBe("abc123def456");
    expect(read).toHaveBeenCalledTimes(2); // TTL expired -> re-read
  });
});
