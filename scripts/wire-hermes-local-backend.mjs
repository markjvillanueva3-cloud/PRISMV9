#!/usr/bin/env node
// scripts/wire-hermes-local-backend.mjs
//
// Safely point the Hermes desktop agent at a LOCAL Ollama model (the rate-limit-
// free autonomy path from the leopardracer/0xCodez Hermes articles + the
// operator's "local does heavy work, Claude reviews, stay 100% local"
// architecture). U-HERMES-LOCAL-WIRE (slot:bravo, 2026-06-04).
//
// WHY a dedicated script instead of hand-editing config.yaml: an earlier session
// boot-looped Hermes by mis-setting provider/base_url. This script makes the
// change UN-BREAKABLE:
//   1. GUARD — refuses to apply unless the target model is actually pulled
//      (pointing Hermes at an absent model breaks startup).
//   2. BACKUP — copies config.yaml → config.yaml.bak-<ts> before any write.
//   3. TARGETED PATCH — anchored line replace of ONLY model.default / model.provider
//      / model.base_url (the scalars whose shape is known). Everything else stays
//      byte-identical — no YAML reparse/reserialize that could mangle the file.
//   4. BOOT-VERIFY + AUTO-ROLLBACK — after applying, probe the Hermes Web UI; if it
//      doesn't come up within the timeout, the backup is RESTORED automatically so
//      Hermes is never left in a broken state.
//
// DRY-RUN by default. `--apply` actuates. `--rollback` restores the latest backup.
//
// Usage:
//   node scripts/wire-hermes-local-backend.mjs --model qwen3-coder:30b            # dry-run (show patch)
//   node scripts/wire-hermes-local-backend.mjs --model qwen3-coder:30b --apply    # backup+patch+boot-verify+rollback-on-fail
//   node scripts/wire-hermes-local-backend.mjs --rollback                         # restore latest backup
//
// Pure exports: patchModelBlock(yaml, {model, provider, baseUrl}) — the targeted
// transform, fully unit-tested. I/O: backupConfig, modelIsPulled, the CLI.
//
// @module wire-hermes-local-backend

import fs from "node:fs";
import path from "node:path";
import http from "node:http";

const HERMES_DIR = process.env.HERMES_DIR || "C:/Users/wompu/AppData/Local/hermes";
const CONFIG = process.env.HERMES_CONFIG || path.join(HERMES_DIR, "config.yaml");
const OLLAMA_V1 = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1";
const OLLAMA_TAGS = process.env.OLLAMA_TAGS_URL || "http://127.0.0.1:11434/api/tags";
const HERMES_WEBUI = process.env.HERMES_WEBUI || "http://127.0.0.1:9120";
// Ollama's /v1 is OpenAI-protocol-compatible, so Hermes's openai client reaches
// it directly. (If a future Hermes build names the local provider differently,
// the boot-verify+rollback below catches a wrong guess and restores the backup.)
const LOCAL_PROVIDER = process.env.HERMES_LOCAL_PROVIDER || "openai";

/**
 * Targeted patch of the `model:` block scalars. Pure string transform — replaces
 * ONLY the values of model.default / model.provider / model.base_url on their
 * existing lines (2-space-indented under a top-level `model:`), leaving every
 * other byte untouched. Throws if a key line is absent (fail-loud — never write a
 * half-patched config).
 *
 * @param {string} yaml   the full config.yaml text
 * @param {{model:string, provider:string, baseUrl:string}} opts
 * @returns {{text:string, before:Record<string,string>}}
 */
export function patchModelBlock(yaml, { model, provider, baseUrl }) {
  if (typeof yaml !== "string" || yaml.length === 0) throw new Error("patchModelBlock: config text required");
  const want = { default: model, provider, base_url: baseUrl };
  const before = {};
  let text = yaml;
  for (const [key, val] of Object.entries(want)) {
    // Match `  <key>: <value>` (2-space indent, the model block's scalars).
    const re = new RegExp(`(^[ \\t]{2}${key}:[ \\t]*)(['"]?)([^\\n]*?)\\2[ \\t]*$`, "m");
    const m = text.match(re);
    if (!m) throw new Error(`patchModelBlock: could not find '  ${key}:' under the model block (refusing a half-patch)`);
    before[key] = m[3];
    // Always single-quote the written value (safe for ':' in base_url + model tags).
    text = text.replace(re, `$1'${String(val).replace(/'/g, "''")}'`);
  }
  return { text, before };
}

/** Copy config → config.bak-<ts>. Returns the backup path. */
export function backupConfig({ config = CONFIG, _fs = fs, stamp } = {}) {
  if (!_fs.existsSync(config)) throw new Error(`Hermes config not found: ${config}`);
  const ts = stamp || `bak-${Date.now()}`;
  const dest = `${config}.${ts}`;
  _fs.copyFileSync(config, dest);
  return dest;
}

/** Latest config.bak-* path (highest mtime), or null. */
export function latestBackup({ config = CONFIG, _fs = fs } = {}) {
  const dir = path.dirname(config);
  const base = path.basename(config);
  let entries;
  try { entries = _fs.readdirSync(dir); } catch { return null; }
  const baks = entries
    .filter((n) => n.startsWith(base + ".bak-"))
    .map((n) => ({ n, full: path.join(dir, n), mtime: (() => { try { return _fs.statSync(path.join(dir, n)).mtimeMs; } catch { return 0; } })() }))
    .sort((a, b) => b.mtime - a.mtime);
  return baks.length ? baks[0].full : null;
}

/** Resolve whether a model tag is present in `ollama` (via /api/tags). */
function modelIsPulled(tag) {
  return new Promise((resolve) => {
    const req = http.get(OLLAMA_TAGS, { timeout: 4000 }, (res) => {
      let s = "";
      res.on("data", (d) => (s += d));
      res.on("end", () => {
        try {
          const names = (JSON.parse(s).models || []).map((m) => m.name);
          resolve(names.includes(tag) || names.some((n) => n === tag || n.split(":")[0] === tag.split(":")[0] && n === tag));
        } catch { resolve(false); }
      });
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

/** Probe the Hermes Web UI; resolves true if it responds (any HTTP status) within timeout. */
function hermesUp(timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const tick = () => {
      const req = http.get(HERMES_WEBUI, { timeout: 3000 }, (res) => { res.resume(); resolve(true); });
      req.on("error", () => { if (Date.now() > deadline) resolve(false); else setTimeout(tick, 2500); });
      req.on("timeout", () => { req.destroy(); if (Date.now() > deadline) resolve(false); else setTimeout(tick, 2500); });
    };
    tick();
  });
}

function parseArgs(argv) {
  const a = { model: null, apply: false, rollback: false, provider: LOCAL_PROVIDER, baseUrl: OLLAMA_V1 };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--apply") a.apply = true;
    else if (t === "--rollback") a.rollback = true;
    else if (t === "--model") a.model = argv[++i];
    else if (t === "--provider") a.provider = argv[++i];
    else if (t === "--base-url") a.baseUrl = argv[++i];
  }
  return a;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.rollback) {
    const bak = latestBackup();
    if (!bak) { process.stderr.write("no backup to roll back to\n"); process.exit(1); }
    fs.copyFileSync(bak, CONFIG);
    process.stdout.write(`Rolled back: restored ${path.basename(bak)} → config.yaml\n`);
    return;
  }

  if (!opts.model) { process.stderr.write("usage: --model <ollama-tag> [--apply] | --rollback\n"); process.exit(2); }

  const yaml = fs.readFileSync(CONFIG, "utf8");
  const { text, before } = patchModelBlock(yaml, { model: opts.model, provider: opts.provider, baseUrl: opts.baseUrl });

  process.stdout.write([
    `Hermes local-backend wiring:`,
    `  model.default:  ${before.default}  →  ${opts.model}`,
    `  model.provider: ${before.provider}  →  ${opts.provider}`,
    `  model.base_url: ${before.base_url || "(empty)"}  →  ${opts.baseUrl}`,
    "",
  ].join("\n"));

  if (!opts.apply) {
    process.stdout.write("DRY-RUN — re-run with --apply to back up, patch, and boot-verify (auto-rollback on failure).\n");
    return;
  }

  // GUARD: never point Hermes at a model that isn't pulled.
  if (!(await modelIsPulled(opts.model))) {
    process.stderr.write(`refusing to apply: model '${opts.model}' is not pulled (ollama). Pull it first, then re-run --apply.\n`);
    process.exit(1);
  }

  const bak = backupConfig();
  fs.writeFileSync(CONFIG, text, "utf8");
  process.stdout.write(`Patched config.yaml (backup: ${path.basename(bak)}). Verifying Hermes boots…\n`);
  process.stdout.write(`NOTE: restart Hermes now (close + relaunch the app, or its service) so it re-reads config. Probing ${HERMES_WEBUI}…\n`);

  const ok = await hermesUp(60000);
  if (!ok) {
    fs.copyFileSync(bak, CONFIG);
    process.stderr.write(`Hermes did not come up within 60s → AUTO-ROLLED BACK to ${path.basename(bak)}. Config restored; investigate the provider string (try --provider ollama / openai-compatible) or run \`hermes model\` interactively.\n`);
    process.exit(1);
  }
  process.stdout.write(`Hermes Web UI responded — local backend wiring is live (${opts.model} via ${opts.baseUrl}).\n`);
}

const __direct = (() => { try { return (process.argv[1] || "").replace(/\\/g, "/").endsWith("wire-hermes-local-backend.mjs"); } catch { return false; } })();
if (__direct) main().catch((e) => { process.stderr.write(`fatal: ${e.message}\n`); process.exit(1); });
