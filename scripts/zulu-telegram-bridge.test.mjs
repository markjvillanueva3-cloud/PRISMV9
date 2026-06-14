/**
 * zulu-telegram-bridge.test.mjs — ZULU-OBSIDIAN-LIVE-MS0
 *
 * Security-critical tests for the outward-facing Telegram bridge. Run:
 *   node --test scripts/zulu-telegram-bridge.test.mjs
 *
 * Focus: default-deny allowlist, strict verb parse (no injection), output
 * sanitization (no secret/token/path leak), rate limiting, and the handleUpdate
 * control flow (denied / ignored / rate-limited / replied) with all I/O injected.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isLoopbackHost,
  parseAllowlist,
  isAllowedChat,
  parseCommand,
  hashId,
  sanitizeOutput,
  RateLimiter,
  handleUpdate,
  defaultBrainQuery,
  rankFiles,
  searchVaultFiles,
} from "./zulu-telegram-bridge.mjs";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("isLoopbackHost: accepts loopback, rejects FQDN spoof + public IPs", () => {
  for (const h of ["127.0.0.1", "127.5.6.7", "localhost", "::1", "[::1]"]) assert.equal(isLoopbackHost(h), true, h);
  for (const h of ["127.0.0.1.evil.com", "8.8.8.8", "256.0.0.1", "evil.com", "localhost.evil.com"]) {
    assert.equal(isLoopbackHost(h), false, h);
  }
});

test("parseAllowlist: csv → Set; empty → empty (deny-all)", () => {
  assert.deepEqual([...parseAllowlist("1, 2 ,3")], ["1", "2", "3"]);
  assert.equal(parseAllowlist("").size, 0);
  assert.equal(parseAllowlist(undefined).size, 0);
});

test("isAllowedChat: default-deny — empty allowlist accepts no one", () => {
  assert.equal(isAllowedChat(123, parseAllowlist("")), false);
  assert.equal(isAllowedChat(123, parseAllowlist("999")), false);
  assert.equal(isAllowedChat(123, parseAllowlist("123")), true);
  assert.equal(isAllowedChat("123", parseAllowlist("123")), true); // string/number coerced
});

test("parseCommand: only the fixed verb allowlist; rejects injection-y input", () => {
  assert.deepEqual(parseCommand("/status"), { verb: "status", query: "" });
  assert.deepEqual(parseCommand("/search kienzle force"), { verb: "search", query: "kienzle force" });
  assert.deepEqual(parseCommand("/recall@MyPrismBot taylor"), { verb: "recall", query: "taylor" });
  // off-allowlist / injection attempts → null (ignored)
  assert.equal(parseCommand("hello there"), null);
  assert.equal(parseCommand("/delete everything"), null);
  assert.equal(parseCommand("/status; rm -rf /"), null); // no space after verb → no match
  assert.equal(parseCommand("/read ../../etc/passwd"), null); // /read is not allowlisted
  assert.equal(parseCommand("/status\n/search secret"), null); // no /m flag → newline-smuggle rejected
  assert.equal(parseCommand(""), null);
});

test("sanitizeOutput: strips env/bearer/path/hex and caps length", () => {
  assert.match(sanitizeOutput("DB_PASSWORD=hunter2 ok"), /\[redacted-env\]/);
  assert.ok(!sanitizeOutput("DB_PASSWORD=hunter2").includes("hunter2"));
  assert.match(sanitizeOutput("Authorization: Bearer abc.def.ghi"), /Bearer \[redacted\]/);
  assert.match(sanitizeOutput("see C:\\Users\\wompu\\secret.txt"), /\[path\]/);
  assert.match(sanitizeOutput("at /Users/mark/.ssh/id_rsa now"), /\[path\]/);
  assert.match(sanitizeOutput("key " + "a".repeat(40)), /\[redacted-hex\]/);
  const big = sanitizeOutput("x".repeat(9000));
  assert.ok(big.length <= 3600 && big.endsWith("[truncated]"));
});

test("sanitizeOutput: strips a Telegram bot-token shape (crown-jewel secret)", () => {
  // Construct the SHAPE dynamically — a fixture, not a real credential.
  const tok = "123456789:" + "A".repeat(35);
  const out = sanitizeOutput("leak " + tok);
  assert.ok(!out.includes(tok), "raw token must not survive");
  assert.match(out, /\[redacted-tg-token\]/);
});

test("defaultBrainQuery: live-status refuses a non-loopback vault URL (refuse-before-key)", async () => {
  // The opt-in live path (PRISM_OBSIDIAN_LIVE=1) must still fail-closed on a
  // non-loopback URL — no socket, no key sent. (Default status is file-vault.)
  const keys = ["PRISM_OBSIDIAN_URL", "PRISM_OBSIDIAN_API_KEY", "PRISM_OBSIDIAN_ALLOW_REMOTE", "PRISM_OBSIDIAN_LIVE", "PRISM_OBSIDIAN_VAULT_DIR"];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  process.env.PRISM_OBSIDIAN_LIVE = "1"; // exercise the opt-in live path
  process.env.PRISM_OBSIDIAN_URL = "https://8.8.8.8";
  process.env.PRISM_OBSIDIAN_API_KEY = "k"; // must never be sent off-loopback
  process.env.PRISM_OBSIDIAN_VAULT_DIR = join(tmpdir(), "zulu-empty-vault-xyz-7766"); // hermetic: file count = 0
  delete process.env.PRISM_OBSIDIAN_ALLOW_REMOTE;
  try {
    assert.match(await defaultBrainQuery("status"), /non-loopback-url/);
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
});

test("RateLimiter: per-chat burst then deny, refill over time, global ceiling", () => {
  let now = 1000;
  const rl = new RateLimiter({ refillMs: 3000, burst: 5, globalMax: 60, now: () => now });
  for (let i = 0; i < 5; i++) assert.equal(rl.allow("c1"), true, `burst ${i}`);
  assert.equal(rl.allow("c1"), false, "6th denied");
  now += 3000; // one refill
  assert.equal(rl.allow("c1"), true, "after refill");
  // global ceiling
  let nowG = 0;
  const rg = new RateLimiter({ refillMs: 1, burst: 1000, globalMax: 3, now: () => nowG });
  assert.equal(rg.allow("a"), true);
  assert.equal(rg.allow("b"), true);
  assert.equal(rg.allow("c"), true);
  assert.equal(rg.allow("d"), false, "global ceiling hit");
});

function harness(overrides = {}) {
  const sent = [];
  const denied = [];
  return {
    sent,
    denied,
    deps: {
      allowSet: parseAllowlist("123"),
      rateLimiter: new RateLimiter(),
      brainQuery: async (verb, query) => `result:${verb}:${query}`,
      sendMessage: async (chatId, text) => sent.push({ chatId, text }),
      onDenied: (h) => denied.push(h),
      ...overrides,
    },
  };
}

test("handleUpdate: unknown chat → silent drop, no reply, hashed-id counter only", async () => {
  const h = harness();
  const out = await handleUpdate({ message: { chat: { id: 999 }, text: "/status" } }, h.deps);
  assert.equal(out, "denied");
  assert.equal(h.sent.length, 0);
  assert.equal(h.denied.length, 1);
  assert.equal(h.denied[0], hashId(999)); // hashed, not raw id
});

test("handleUpdate: allowed /status → routes to brain, replies sanitized", async () => {
  const h = harness();
  const out = await handleUpdate({ message: { chat: { id: 123 }, text: "/status" } }, h.deps);
  assert.equal(out, "replied");
  assert.equal(h.sent.length, 1);
  assert.equal(h.sent[0].chatId, 123);
  assert.match(h.sent[0].text, /result:status:/);
});

test("handleUpdate: allowed free text → fixed help reply, no brain call", async () => {
  let brainCalls = 0;
  const h = harness({ brainQuery: async () => (brainCalls++, "x") });
  const out = await handleUpdate({ message: { chat: { id: 123 }, text: "just chatting" } }, h.deps);
  assert.equal(out, "ignored");
  assert.equal(brainCalls, 0);
  assert.match(h.sent[0].text, /commands:/);
});

test("handleUpdate: bearer token from brain is redacted before reply", async () => {
  const h = harness({ brainQuery: async () => "leak Bearer sk-supersecret-token-value" });
  await handleUpdate({ message: { chat: { id: 123 }, text: "/search x" } }, h.deps);
  assert.ok(!h.sent[0].text.includes("sk-supersecret-token-value"));
  assert.match(h.sent[0].text, /Bearer \[redacted\]/);
});

test("handleUpdate: rate-limited → no reply", async () => {
  let now = 0;
  const rl = new RateLimiter({ refillMs: 3000, burst: 1, globalMax: 60, now: () => now });
  const h = harness({ rateLimiter: rl });
  await handleUpdate({ message: { chat: { id: 123 }, text: "/status" } }, h.deps); // uses the 1 token
  const out = await handleUpdate({ message: { chat: { id: 123 }, text: "/status" } }, h.deps);
  assert.equal(out, "rate-limited");
  assert.equal(h.sent.length, 1); // only the first replied
});

test("rankFiles: filename match outranks content; empty/no-match → []", () => {
  const entries = [
    { filename: "kienzle-force.md", text: "unrelated body" },
    { filename: "other.md", text: "kienzle appears here in the body text" },
    { filename: "nope.md", text: "nothing relevant" },
  ];
  const r = rankFiles("kienzle", entries);
  assert.equal(r[0].filename, "kienzle-force.md"); // filename x3 beats content x1
  assert.equal(r.length, 2); // nope.md (score 0) excluded
  assert.equal(rankFiles("", entries).length, 0); // empty query
  assert.equal(rankFiles("zzzznomatch", entries).length, 0);
});

test("rankFiles: returns a snippet around the match", () => {
  const r = rankFiles("taylor", [{ filename: "a.md", text: "the taylor tool-life equation is T=(C/Vc)^(1/n)" }]);
  assert.ok(r[0].snippet.toLowerCase().includes("taylor"));
});

test("searchVaultFiles: finds matching .md recursively (always-on, no Obsidian)", () => {
  const dir = mkdtempSync(join(tmpdir(), "zulu-vault-"));
  writeFileSync(join(dir, "merchant-circle.md"), "# Merchant\nthe merchant circle relates shear angle to rake");
  writeFileSync(join(dir, "unrelated.md"), "# Other\nnothing here");
  mkdirSync(join(dir, "sub"));
  writeFileSync(join(dir, "sub", "deep.md"), "merchant again deep");
  const names = searchVaultFiles("merchant", { root: dir }).map((h) => h.filename);
  assert.ok(names.includes("merchant-circle.md"));
  assert.ok(names.includes("deep.md")); // recursive walk
  assert.ok(!names.includes("unrelated.md"));
});

test("searchVaultFiles: missing root → [] (fail-soft, no throw)", () => {
  assert.deepEqual(searchVaultFiles("x", { root: join(tmpdir(), "does-not-exist-zulu-xyz-9988") }), []);
});
