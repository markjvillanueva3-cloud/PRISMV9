#!/usr/bin/env node
/**
 * verify-hookify.mjs — verify the official `hookify` plugin is installed alongside PRISM's native hooks.
 *
 * U-HKA06 of HOOKS-AUTOMATION-V2-MS0.
 *
 * ── hookify in PRISM: what it is, where it sits, who wins ──────────────────────
 * `hookify` (the official @claude-plugins-official plugin) is a *declarative* hook
 * layer: markdown rule files `.claude/hookify.<type>-<name>.local.md` (also the dashed
 * form `hookify-<type>-<name>.local.md`), where <type> ∈ { block, warn, suggest, autofire }.
 * The plugin loads them and applies block/warn/suggest decisions on matching tool
 * calls without you writing a `.mjs` hook. PRISM ships ~200+ such rules
 * (dangerous-command blocks, token-economy footgun warnings, slash-command auto-fire
 * suggestions). hookify is enabled via `enabledPlugins["hookify@claude-plugins-official"]`
 * in settings.json — it does NOT get a `hooks` entry; the plugin owns its own loading.
 *
 * PRISM ALSO has ~50 native *imperative* hooks wired directly in `.claude/settings.json`
 * (PreToolUse / PostToolUse / Stop / SubagentStop / ...). PRIORITY when the two overlap:
 *   1. Native settings.json HARD BLOCK hooks (`continueOnError:false`) are GROUND TRUTH —
 *      a hookify rule can NEVER weaken or override them (see CLAUDE.md §ENFORCEMENT).
 *   2. Native non-blocking hooks (additionalContext nudges) and hookify warn/suggest
 *      rules both just add context — they stack; no conflict possible.
 *   3. hookify `block` rules add *additional* blocks for cases the native hooks don't
 *      cover; they never relax a native block.
 * Net: native first, hookify complements, HARD BLOCKs are immovable. There is no
 * scenario where a hookify rule makes the system *less* safe than the native stack.
 *
 * Run:  node scripts/verify-hookify.mjs           (human report; exit 0 healthy / 1 problem)
 *       node scripts/verify-hookify.mjs --json    (machine-readable JSON)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const HOOKIFY_PLUGIN_KEY = "hookify@claude-plugins-official";
const RULE_TYPES = new Set(["block", "warn", "suggest", "autofire"]);

// ── pure helpers (exported for tests) ─────────────────────────────────────────

export function isHookifyEnabled(settings) {
  return !!(settings && settings.enabledPlugins && settings.enabledPlugins[HOOKIFY_PLUGIN_KEY] === true);
}

/** From a rule filename → {type, name} or null if it isn't a hookify rule file. */
export function classifyRuleFile(filename) {
  const base = path.basename(String(filename || ""));
  // accepts:  hookify.<type>-<name>.local.md   |   hookify-<type>-<name>.local.md
  const m = /^hookify[.-]([a-z]+)-(.+)\.local\.md$/i.exec(base);
  if (!m) return null;
  const type = m[1].toLowerCase();
  return { type: RULE_TYPES.has(type) ? type : "unknown", name: m[2] };
}

/** Count `.claude/hookify*.local.md` rule files in `dir`, grouped by type. */
export function countLocalRules(dir) {
  const byType = { block: 0, warn: 0, suggest: 0, autofire: 0, unknown: 0 };
  let total = 0;
  const sample = [];
  let entries = [];
  try { entries = fs.readdirSync(dir); } catch { entries = []; }
  for (const f of entries) {
    const c = classifyRuleFile(f);
    if (!c) continue;
    total++;
    byType[c.type] = (byType[c.type] || 0) + 1;
    if (sample.length < 5) sample.push(f);
  }
  return { total, byType, sample };
}

/** Find the hookify plugin directory under a .claude home (top-level or marketplace cache). */
export function findHookifyPluginDir(claudeHome) {
  if (!claudeHome) return null;
  const candidates = [
    path.join(claudeHome, "plugins", "hookify"),
    path.join(claudeHome, "plugins", "marketplaces", "claude-plugins-official", "plugins", "hookify"),
    path.join(claudeHome, "plugins", "cache", "claude-plugins-official", "hookify"),
    path.join(claudeHome, "plugins", "data", "hookify-claude-plugins-official"),
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(c) && fs.statSync(c).isDirectory()) return c; } catch { /* ignore */ }
  }
  // last resort: scan plugins/* and plugins/marketplaces/* one level for a dir literally named "hookify"
  for (const sub of [["plugins"], ["plugins", "marketplaces", "claude-plugins-official", "plugins"]]) {
    const dir = path.join(claudeHome, ...sub);
    try {
      for (const e of fs.readdirSync(dir)) {
        if (e.toLowerCase() === "hookify" && fs.statSync(path.join(dir, e)).isDirectory()) return path.join(dir, e);
      }
    } catch { /* ignore */ }
  }
  return null;
}

function readJson(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }

/**
 * Run all checks.
 * @param {{claudeHome?:string, repoRoot?:string, settingsPaths?:string[]}} p
 * @returns {{ok:boolean, problems:string[], settings:{enabled:boolean, path:string|null}, plugin:{found:boolean, path:string|null}, rules:{total:number, byType:object, sample:string[], dir:string|null}}}
 */
export function verify({ claudeHome = path.join(os.homedir(), ".claude"), repoRoot = process.cwd(), settingsPaths } = {}) {
  const sPaths = settingsPaths || [
    path.join(claudeHome, "settings.json"),
    path.join(repoRoot, ".claude", "settings.json"),
  ];
  let settings = null, settingsPath = null;
  for (const p of sPaths) { const j = readJson(p); if (j) { settings = j; settingsPath = p; break; } }
  const enabled = isHookifyEnabled(settings);

  const pluginDir = findHookifyPluginDir(claudeHome);
  // rules can live in the repo's .claude/ and/or the user's .claude/
  const ruleDirs = [path.join(repoRoot, ".claude"), claudeHome].filter((d, i, a) => d && a.indexOf(d) === i);
  let rulesAgg = { total: 0, byType: { block: 0, warn: 0, suggest: 0, autofire: 0, unknown: 0 }, sample: [], dir: null };
  for (const d of ruleDirs) {
    const r = countLocalRules(d);
    if (r.total > 0) {
      rulesAgg.dir = rulesAgg.dir || d;
      rulesAgg.total += r.total;
      for (const k of Object.keys(r.byType)) rulesAgg.byType[k] += r.byType[k];
      for (const s of r.sample) if (rulesAgg.sample.length < 5) rulesAgg.sample.push(s);
    }
  }

  const problems = [];
  if (!settings) problems.push("could not read any settings.json (" + sPaths.join(" | ") + ")");
  else if (!enabled) problems.push(`hookify is not enabled — add "enabledPlugins": { "${HOOKIFY_PLUGIN_KEY}": true } to settings.json`);
  if (enabled && !pluginDir) problems.push(`hookify is enabled in settings but the plugin directory was not found under ${path.join(claudeHome, "plugins")} — run /plugin install or re-add the marketplace`);

  return {
    ok: problems.length === 0,
    problems,
    settings: { enabled, path: settingsPath },
    plugin: { found: !!pluginDir, path: pluginDir },
    rules: rulesAgg,
  };
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function main() {
  const json = process.argv.includes("--json");
  // PRISM-aware defaults: prefer H:/ on this machine, fall back to os.homedir()
  const candidatesHome = ["H:/.claude", path.join(os.homedir(), ".claude"), "C:/Users/wompu/.claude"];
  const claudeHome = candidatesHome.find((d) => { try { return fs.existsSync(d); } catch { return false; } }) || path.join(os.homedir(), ".claude");
  // repo root: walk up from cwd to a dir containing .claude/settings.json
  let repoRoot = process.cwd();
  for (let i = 0, cur = repoRoot; i < 12; i++) {
    if (fs.existsSync(path.join(cur, ".claude", "settings.json"))) { repoRoot = cur; break; }
    const p = path.dirname(cur); if (p === cur) break; cur = p;
  }

  const r = verify({ claudeHome, repoRoot });
  if (json) { process.stdout.write(JSON.stringify(r, null, 2) + "\n"); process.exit(r.ok ? 0 : 1); }

  const lines = [];
  lines.push(`hookify plugin check  —  ${r.ok ? "✅ OK" : "❌ PROBLEM"}`);
  lines.push(`  settings:  ${r.settings.path || "(none found)"}  —  enabled: ${r.settings.enabled ? "yes" : "NO"}`);
  lines.push(`  plugin:    ${r.plugin.found ? r.plugin.path : "(not found)"}`);
  lines.push(`  rules:     ${r.rules.total} local hookify rule file(s)${r.rules.dir ? ` in ${r.rules.dir}` : ""}`);
  lines.push(`             block=${r.rules.byType.block}  warn=${r.rules.byType.warn}  suggest=${r.rules.byType.suggest}  autofire=${r.rules.byType.autofire}  unknown=${r.rules.byType.unknown}`);
  if (r.rules.sample.length) lines.push(`             e.g. ${r.rules.sample.join(", ")}`);
  if (r.problems.length) { lines.push(`  problems:`); for (const p of r.problems) lines.push(`    - ${p}`); }
  lines.push(``);
  lines.push(`  priority vs native hooks: settings.json HARD BLOCK hooks (continueOnError:false) are`);
  lines.push(`  ground truth and cannot be overridden by any hookify rule; hookify warn/suggest stack`);
  lines.push(`  with native nudges; hookify block adds coverage, never relaxes a native block.`);
  process.stdout.write(lines.join("\n") + "\n");
  process.exit(r.ok ? 0 : 1);
}

const invokedDirectly = (() => {
  try { return path.resolve(process.argv[1] || "").endsWith("verify-hookify.mjs"); }
  catch { return false; }
})();
if (invokedDirectly) main();
