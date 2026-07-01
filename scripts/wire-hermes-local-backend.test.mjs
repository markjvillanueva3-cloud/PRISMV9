// scripts/wire-hermes-local-backend.test.mjs — tests for the pure config patch +
// backup/rollback logic. node:test. Never touches the real Hermes config (the
// transform is a pure string op; backup/latestBackup use injected fs).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { patchModelBlock, backupConfig, latestBackup } from "./wire-hermes-local-backend.mjs";

const SAMPLE = [
  "model:",
  "  default: claude-opus-4-8",
  "  provider: anthropic",
  "  base_url: ''",
  "providers: {}",
  "fallback_providers: []",
  "agent:",
  "  max_turns: 60",
  "",
].join("\n");

// ── patchModelBlock (pure) ───────────────────────────────────────────────────
test("patchModelBlock: replaces only the 3 model scalars, byte-stable elsewhere", () => {
  const { text, before } = patchModelBlock(SAMPLE, { model: "qwen3-coder:30b", provider: "openai", baseUrl: "http://127.0.0.1:11434/v1" });
  assert.equal(before.default, "claude-opus-4-8");
  assert.equal(before.provider, "anthropic");
  assert.match(text, /^ {2}default: 'qwen3-coder:30b'$/m);
  assert.match(text, /^ {2}provider: 'openai'$/m);
  assert.match(text, /^ {2}base_url: 'http:\/\/127\.0\.0\.1:11434\/v1'$/m);
  // untouched lines remain byte-identical
  assert.match(text, /^providers: \{\}$/m);
  assert.match(text, /^fallback_providers: \[\]$/m);
  assert.match(text, /^ {2}max_turns: 60$/m);
});
test("patchModelBlock: captures the previous base_url even when empty-quoted", () => {
  const { before } = patchModelBlock(SAMPLE, { model: "m", provider: "openai", baseUrl: "u" });
  assert.equal(before.base_url, "", "empty '' base_url captured as empty string");
});
test("patchModelBlock: round-trip is idempotent in shape (re-patch yields same scalars)", () => {
  const once = patchModelBlock(SAMPLE, { model: "qwen3-coder:30b", provider: "openai", baseUrl: "http://x/v1" }).text;
  const twice = patchModelBlock(once, { model: "qwen3-coder:30b", provider: "openai", baseUrl: "http://x/v1" }).text;
  assert.equal(once, twice);
});
test("patchModelBlock: single-quotes are escaped (no YAML break)", () => {
  const { text } = patchModelBlock(SAMPLE, { model: "a'b", provider: "openai", baseUrl: "u" });
  assert.match(text, /default: 'a''b'/);
});
test("patchModelBlock: throws (no half-patch) when a key line is missing", () => {
  const noProvider = SAMPLE.replace("  provider: anthropic\n", "");
  assert.throws(() => patchModelBlock(noProvider, { model: "m", provider: "openai", baseUrl: "u" }), /could not find '  provider:'/);
});
test("patchModelBlock: throws on empty input", () => {
  assert.throws(() => patchModelBlock("", { model: "m", provider: "p", baseUrl: "u" }), /config text required/);
});
test("patchModelBlock: does NOT touch a same-named key at a different indent", () => {
  // a nested 'provider:' under agent must NOT be rewritten (only 2-space model block).
  const nested = SAMPLE.replace("  max_turns: 60", "  sub:\n    provider: deep");
  const { text } = patchModelBlock(nested, { model: "m", provider: "openai", baseUrl: "u" });
  assert.match(text, /^ {4}provider: deep$/m, "4-space nested provider untouched");
  assert.match(text, /^ {2}provider: 'openai'$/m, "2-space model provider patched");
});

// ── backupConfig + latestBackup (injected real temp fs) ──────────────────────
test("backupConfig copies the file; latestBackup finds the newest", () => {
  const dir = mkdtempSync(join(tmpdir(), "hermes-wire-"));
  const cfg = join(dir, "config.yaml");
  try {
    writeFileSync(cfg, SAMPLE);
    const b1 = backupConfig({ config: cfg, stamp: "bak-1000" });
    const b2 = backupConfig({ config: cfg, stamp: "bak-2000" });
    assert.ok(existsSync(b1) && existsSync(b2));
    assert.equal(readFileSync(b1, "utf8"), SAMPLE, "backup is a faithful copy");
    // latestBackup picks the newest by mtime (bak-2000 written last)
    const latest = latestBackup({ config: cfg });
    assert.ok(latest.endsWith("bak-2000") || statSync(latest).mtimeMs >= statSync(b1).mtimeMs);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test("backupConfig throws when config is missing (fail-loud)", () => {
  assert.throws(() => backupConfig({ config: join(tmpdir(), "no-such-hermes-config.yaml") }), /not found/);
});
test("latestBackup returns null when there are no backups", () => {
  const dir = mkdtempSync(join(tmpdir(), "hermes-wire2-"));
  try {
    writeFileSync(join(dir, "config.yaml"), SAMPLE);
    assert.equal(latestBackup({ config: join(dir, "config.yaml") }), null);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
