#!/usr/bin/env node
/**
 * build-hook-registry.mjs — HOOK-SYNERGY-MS0 / U-H1
 *
 * Scans every `.claude/hooks/*.mjs` source file and cross-references the three
 * Claude Code settings layers to emit a single canonical registry at
 * `state/shared/HOOK_REGISTRY.json`:
 *
 *   {
 *     schemaVersion, generatedAt, generatedBy, repoRoot, settingsLayers,
 *     counts: { hookFiles, wired, orphaned, disabled, byEvent, byType, byLayer },
 *     hooks: [ {
 *       id,                 // filename without extension
 *       file,               // repo-relative path to the .mjs
 *       wired,              // referenced by ≥1 settings layer?
 *       disabled,           // settings entry carries a _disabled* marker, or file is .disabled
 *       events: [ { event, matcher, timeout, type, layer } ],   // every registration
 *       description,        // from the header comment, or inferred from filename
 *       descriptionInferred,
 *       tier,               // from `// tier: T#` / frontmatter if present, else null  (U-H3 backfills these)
 *       sizeBytes, lines,
 *     } ],
 *     skipped: [ { file, reason } ],   // unreadable source files
 *   }
 *
 * Writes a `.previous.json` backup of the prior registry before overwriting
 * (failure-mode: corrupt registry → restore from backup). Atomic write (tmp → rename).
 *
 * Modes:
 *   (none)        regenerate the registry, print a one-line summary.
 *   --json        also dump the full registry to stdout.
 *   --check       do NOT write; exit 1 if the on-disk registry is missing/stale/invalid,
 *                 0 if it matches what would be generated now.   ← cheap CI / pre-commit gate.
 *   --self-test   run internal assertions on the parsing helpers against fixtures; exit 0 iff all pass.
 *
 * Exit: 0 ok · 1 error (no hook files found / write failed / --check mismatch / self-test fail).
 *
 * No subprocess spawns; no network. Pure fs + JSON.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..").split("\\").join("/");

const HOOKS_DIR = path.join(REPO_ROOT, ".claude", "hooks");
const BUNDLES_DIR = path.join(HOOKS_DIR, "bundles"); // *-bundle.mjs wrappers that fan one settings entry into N hooks
const OUT_PATH = path.join(REPO_ROOT, "state", "shared", "HOOK_REGISTRY.json");
const SETTINGS_LAYERS = [
  { layer: "user", file: "H:/.claude/settings.json" },
  { layer: "project", file: "H:/PRISM/.claude/settings.json" },
  { layer: "local", file: "H:/PRISM/.claude/settings.local.json" },
];
const SCHEMA_VERSION = "1.0.0";

function norm(p) { return String(p).split("\\").join("/"); }
function rel(p) { return norm(path.relative(REPO_ROOT, p)); }

// ── header-comment description extractor ────────────────────────────────────
// Looks at the first ~25 lines, finds the JSDoc/`//` banner, returns the first
// substantive line (the "<name> — does X" form, or the first prose line).
function extractDescription(src, filename) {
  const lines = src.split(/\r?\n/).slice(0, 30);
  const base = filename.replace(/\.mjs$/, "");
  // Strip leading shebang
  const cleaned = lines
    .map((l) => l.replace(/^#!.*$/, "").replace(/^\s*\/\*+\s?/, "").replace(/^\s*\*+\/?\s?/, "").replace(/^\s*\/\/+\s?/, "").trim())
    .filter((l) => l.length > 0);
  // 1) a line that starts with "<filename> —" / "<filename>:" / "<filename> -"
  for (const l of cleaned) {
    const m = l.match(new RegExp("^" + base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:\\.mjs)?\\s*[—:\\-–]\\s*(.+)$", "i"));
    if (m && m[1]) return { description: m[1].trim().replace(/\s+/g, " ").slice(0, 240), inferred: false };
  }
  // 2) first prose line that isn't an @tag, a separator, or code-ish
  for (const l of cleaned) {
    if (/^@\w+/.test(l)) continue;
    if (/^[=\-_*~#]{3,}$/.test(l)) continue;
    if (/^(import|export|const|let|var|function|if|for|return)\b/.test(l)) break; // hit code, stop
    if (/^[A-Za-z]/.test(l) && l.length > 12) return { description: l.replace(/\s+/g, " ").slice(0, 240), inferred: false };
  }
  // 3) infer from filename
  return { description: base.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), inferred: true };
}

// ── tier extractor (U-H3 will backfill these; for now best-effort) ──────────
function extractTier(src) {
  const m = src.slice(0, 2000).match(/(?:^|\n)\s*(?:\/\/|\*)\s*tier\s*[:=]\s*["']?(T?\d|tier[-_]?\d|fast|slow|critical)["']?/i);
  return m ? m[1].toUpperCase() : null;
}

// ── settings.json cross-reference: command string → which hook files it runs ─
const SCRIPT_PATH_RE = /[A-Za-z]:[\\/][^\s"'`|;&]+\.mjs|(?:\.{1,2}[\\/]|[A-Za-z0-9_.-]+[\\/])[^\s"'`|;&]+\.mjs/g;
function commandReferencesHookFile(cmd, hookAbsPathSet) {
  if (typeof cmd !== "string") return [];
  const hits = [];
  for (const tok of cmd.match(SCRIPT_PATH_RE) || []) {
    let p = norm(tok);
    if (!/^[A-Za-z]:\//.test(p) && !p.startsWith("/")) p = norm(path.resolve(REPO_ROOT, p));
    // match by basename within .claude/hooks/ to be path-separator/drive-case tolerant
    const lower = p.toLowerCase();
    for (const hp of hookAbsPathSet) {
      if (hp.toLowerCase() === lower || hp.toLowerCase().endsWith("/" + path.basename(lower))) {
        if (path.basename(hp.toLowerCase()) === path.basename(lower)) hits.push(hp);
      }
    }
  }
  return [...new Set(hits)];
}

function readSettings(file) {
  try {
    const raw = fs.readFileSync(file, "utf8");
    return { ok: true, json: JSON.parse(raw) };
  } catch (e) {
    if (e && e.code === "ENOENT") return { ok: true, json: null };
    return { ok: false, error: e.message };
  }
}

// ── main scan ───────────────────────────────────────────────────────────────
function buildRegistry() {
  // 1) enumerate hook source files (.claude/hooks/*.mjs + .claude/hooks/bundles/*.mjs)
  let hookFiles = [];
  try {
    hookFiles = fs.readdirSync(HOOKS_DIR)
      .filter((f) => f.endsWith(".mjs"))
      .map((f) => path.join(HOOKS_DIR, f));
  } catch (e) {
    return { error: `cannot read ${rel(HOOKS_DIR)}: ${e.message}` };
  }
  if (hookFiles.length === 0) return { error: `no .mjs hook files found in ${rel(HOOKS_DIR)}` };
  let bundleFiles = [];
  try {
    bundleFiles = fs.readdirSync(BUNDLES_DIR).filter((f) => f.endsWith(".mjs")).map((f) => path.join(BUNDLES_DIR, f));
  } catch { /* no bundles dir — fine */ }
  hookFiles = hookFiles.concat(bundleFiles);

  const hookAbsSet = hookFiles.map(norm);
  const byBase = new Map(); // basename(lower) -> absnorm
  for (const hp of hookAbsSet) byBase.set(path.basename(hp).toLowerCase(), hp);

  // 2) parse settings layers, build: hookAbs -> [ {event,matcher,timeout,type,layer} ]
  const regByHook = new Map();
  const settingsMeta = [];
  for (const { layer, file } of SETTINGS_LAYERS) {
    const r = readSettings(file);
    if (!r.ok) { settingsMeta.push({ layer, file, error: r.error }); continue; }
    if (!r.json) { settingsMeta.push({ layer, file, present: false }); continue; }
    settingsMeta.push({ layer, file, present: true });
    const hooks = r.json.hooks || {};
    for (const event of Object.keys(hooks)) {
      const blocks = Array.isArray(hooks[event]) ? hooks[event] : [];
      for (const block of blocks) {
        const matcher = block && block.matcher != null ? String(block.matcher) : "*";
        const list = Array.isArray(block && block.hooks) ? block.hooks : [];
        for (const h of list) {
          const cmd = (h && h.command) || "";
          const type = (h && h.type) || "command";
          const timeout = h && typeof h.timeout === "number" ? h.timeout : null;
          const disabledMarker = !!(h && (h._disabled || h._disabled_by || h.disabled));
          for (const hp of commandReferencesHookFile(cmd, hookAbsSet)) {
            if (!regByHook.has(hp)) regByHook.set(hp, []);
            regByHook.get(hp).push({ event, matcher, timeout, type, layer, disabled: disabledMarker });
          }
        }
      }
    }
  }

  // 2b) trace bundles — a `bundles/*-bundle.mjs` registered in settings fans one settings
  // entry into N inner hooks (its `const *_HOOKS = [{ path: `${HOOK_BASE}/foo.mjs`, … }]`
  // array). Propagate the bundle's settings events to each inner hook so a bundle-wrapped
  // hook isn't falsely counted "orphaned". `viaBundle` records which bundle carried it.
  for (const bundleAbs of hookAbsSet) {
    if (!/[\\/]bundles[\\/][^\\/]+\.mjs$/i.test(bundleAbs)) continue;
    const bundleEvents = regByHook.get(bundleAbs);
    if (!bundleEvents || bundleEvents.length === 0) continue; // the bundle itself isn't wired in settings
    let bsrc;
    try { bsrc = fs.readFileSync(bundleAbs, "utf8"); } catch { continue; }
    const bundleId = path.basename(bundleAbs).replace(/\.mjs$/, "");
    const wrapped = new Set();
    for (const tok of bsrc.match(/[A-Za-z0-9._-]+\.mjs/g) || []) {
      const inner = byBase.get(tok.toLowerCase());
      if (inner && inner !== bundleAbs) wrapped.add(inner);
    }
    for (const hp of wrapped) {
      if (!regByHook.has(hp)) regByHook.set(hp, []);
      for (const be of bundleEvents) {
        regByHook.get(hp).push({ event: be.event, matcher: be.matcher, timeout: null, type: be.type, layer: be.layer, disabled: !!be.disabled, viaBundle: bundleId });
      }
    }
  }

  // 3) build per-hook records
  const hooks = [];
  const skipped = [];
  const byEvent = {};
  const byType = {};
  const byLayer = {};
  let wiredCount = 0, disabledCount = 0;
  for (const absRaw of hookFiles) {
    const abs = norm(absRaw);
    const filename = path.basename(abs);
    let src;
    try { src = fs.readFileSync(abs, "utf8"); }
    catch (e) { skipped.push({ file: rel(abs), reason: `read failed: ${e.message}` }); continue; }
    const { description, inferred } = extractDescription(src, filename);
    const tier = extractTier(src);
    const events = (regByHook.get(abs) || []).sort((a, b) => (a.event + a.matcher).localeCompare(b.event + b.matcher));
    const wired = events.length > 0;
    const disabled = wired ? events.every((e) => e.disabled) : /\.disabled\.mjs$/.test(filename) || /^\s*\/\/\s*_?disabled/i.test(src);
    if (wired) wiredCount++;
    if (disabled) disabledCount++;
    for (const e of events) {
      byEvent[e.event] = (byEvent[e.event] || 0) + 1;
      byType[e.type] = (byType[e.type] || 0) + 1;
      byLayer[e.layer] = (byLayer[e.layer] || 0) + 1;
    }
    hooks.push({
      id: filename.replace(/\.mjs$/, ""),
      file: rel(abs),
      wired,
      disabled,
      events,
      description,
      descriptionInferred: inferred,
      tier,
      sizeBytes: Buffer.byteLength(src, "utf8"),
      lines: src.split(/\r?\n/).length,
    });
  }
  hooks.sort((a, b) => a.id.localeCompare(b.id));

  return {
    registry: {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      generatedBy: "scripts/build-hook-registry.mjs",
      repoRoot: REPO_ROOT,
      hooksDir: rel(HOOKS_DIR),
      settingsLayers: settingsMeta,
      counts: {
        hookFiles: hooks.length,
        wired: wiredCount,
        orphaned: hooks.length - wiredCount,
        disabled: disabledCount,
        skipped: skipped.length,
        byEvent,
        byType,
        byLayer,
      },
      hooks,
      skipped,
    },
  };
}

function stableStringify(reg) {
  // exclude generatedAt for the --check comparison so timestamp drift isn't a mismatch
  const { generatedAt, ...rest } = reg;
  return JSON.stringify(rest);
}

function atomicWriteJSON(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + "." + crypto.randomBytes(4).toString("hex") + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + "\n");
  fs.renameSync(tmp, file);
}

// ── self-test ───────────────────────────────────────────────────────────────
function selfTest() {
  const fails = [];
  const a = (n, c, d) => { if (!c) fails.push(`${n}${d ? " — " + d : ""}`); };

  // extractDescription
  let d;
  d = extractDescription("/**\n * foo-bar.mjs — does the thing well\n */\nimport x", "foo-bar.mjs");
  a("desc-banner", d.description === "does the thing well" && d.inferred === false, JSON.stringify(d));
  d = extractDescription("// just a leading comment that is reasonably long\nconst y = 1", "x.mjs");
  a("desc-prose", d.inferred === false && d.description.startsWith("just a leading"), JSON.stringify(d));
  d = extractDescription("import a from 'b';\nconsole.log(1)", "no-header_hook.mjs");
  a("desc-inferred", d.inferred === true && d.description === "No Header Hook", JSON.stringify(d));

  // extractTier
  a("tier-present", extractTier("// tier: T2\nimport x") === "T2");
  a("tier-absent", extractTier("import x\nconst y=1") === null);

  // commandReferencesHookFile — basename match, path-separator tolerant
  const fakeSet = [norm(path.join(REPO_ROOT, ".claude/hooks/alpha.mjs")), norm(path.join(REPO_ROOT, ".claude/hooks/beta.mjs"))];
  let hits = commandReferencesHookFile('"H:/.claude/bin/portable-node" H:/PRISM/.claude/hooks/alpha.mjs --pre', fakeSet);
  a("cmdref-abs", hits.length === 1 && hits[0].endsWith("/alpha.mjs"), JSON.stringify(hits));
  hits = commandReferencesHookFile("node .claude/hooks/beta.mjs", fakeSet);
  a("cmdref-rel", hits.length === 1 && hits[0].endsWith("/beta.mjs"), JSON.stringify(hits));
  hits = commandReferencesHookFile("node H:/prism/scripts/unrelated.mjs", fakeSet);
  a("cmdref-none", hits.length === 0, JSON.stringify(hits));
  hits = commandReferencesHookFile("echo no script here", fakeSet);
  a("cmdref-empty", hits.length === 0);

  // stableStringify drops generatedAt
  a("stable-drops-ts", stableStringify({ generatedAt: "X", a: 1 }) === stableStringify({ generatedAt: "Y", a: 1 }));

  if (fails.length === 0) { process.stdout.write(`build-hook-registry: ✓ self-test passed (${10} checks)\n`); process.exit(0); }
  process.stdout.write(`build-hook-registry: ✗ self-test FAILED (${fails.length})\n`);
  for (const x of fails) process.stderr.write(`  FAIL: ${x}\n`);
  process.exit(1);
}

// ── entry ───────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
if (argv.includes("--self-test")) selfTest();

const built = buildRegistry();
if (built.error) { process.stderr.write(`build-hook-registry: ✗ ${built.error}\n`); process.exit(1); }
const reg = built.registry;

if (argv.includes("--check")) {
  let onDisk = null;
  try { onDisk = JSON.parse(fs.readFileSync(OUT_PATH, "utf8")); } catch { /* missing/corrupt */ }
  const same = onDisk && stableStringify(onDisk) === stableStringify(reg);
  if (same) { process.stdout.write(`build-hook-registry: ✓ ${rel(OUT_PATH)} up to date (${reg.counts.hookFiles} hooks, ${reg.counts.wired} wired)\n`); process.exit(0); }
  process.stdout.write(`build-hook-registry: ⚠ ${rel(OUT_PATH)} ${onDisk ? "stale" : "missing"} — run \`node scripts/build-hook-registry.mjs\` to regenerate\n`);
  process.exit(1);
}

// backup the prior registry, then atomic-write the new one
try {
  if (fs.existsSync(OUT_PATH)) fs.copyFileSync(OUT_PATH, OUT_PATH + ".previous.json");
} catch { /* best-effort backup */ }
try {
  atomicWriteJSON(OUT_PATH, reg);
} catch (e) {
  process.stderr.write(`build-hook-registry: ✗ write failed: ${e.message}\n`);
  process.exit(1);
}

const c = reg.counts;
process.stdout.write(
  `build-hook-registry: ✓ ${rel(OUT_PATH)} — ${c.hookFiles} hook files (${c.wired} wired, ${c.orphaned} orphaned, ${c.disabled} disabled, ${c.skipped} skipped)` +
  ` · events: ${Object.entries(c.byEvent).map(([k, v]) => `${k}:${v}`).join(" ") || "none"}\n`,
);
if (argv.includes("--json")) process.stdout.write(JSON.stringify(reg, null, 2) + "\n");
process.exit(0);
