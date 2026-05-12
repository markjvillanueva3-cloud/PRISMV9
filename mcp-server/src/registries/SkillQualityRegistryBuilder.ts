/**
 * Skill Quality Registry Builder — U-SKU06 (SKILLS-UTILIZATION-MS0).
 *
 * Walks every skill location PRISM uses (user `~/.claude/commands/*.md`, project
 * `<root>/.claude/commands/*.md`, `skills/**​/SKILL.md` trees, plugin skills) and
 * produces `state/shared/registries/SKILL_QUALITY_REGISTRY.json` — one row per
 * skill with the quality-tracking fields from {@link skillQualitySchema}.
 *
 * This is the "master document tracking all your Skills, their status, and their
 * last refinement date" from @eng_khairallah1 Phase-4, made machine-readable so
 * the 3Q gate (U-SKU01), the test runner (U-SKU02), the linter (U-SKU03), the
 * refinement cadence (U-SKU04) and the library audit (U-SKU05) all read one file.
 *
 * Adversarial cases handled (per the atomized spec):
 *   - SKILL.md with no frontmatter (legacy flat command) → row with name=filename, description=""
 *   - description > 1024 chars → truncated for storage, `description_over_limit: true`
 *   - same name across tiers → `shadows`/`shadowed_by` pointers (R7 — surface, don't average)
 *   - symlinked SKILL.md (Windows junction) → resolved via fs.realpath, real path stored
 *   - frontmatter YAML parse failure → `_parse_error` field, row still produced, also logged to
 *     `state/shared/registries/skill-registry-parse-failures.json`
 *
 * Telemetry-sourced `invocation_count_30d` is left `null` here (U-SKU04 fills it).
 *
 * @module SkillQualityRegistryBuilder
 */

import * as path from "path";
import * as os from "os";
import * as fs from "fs/promises";
import { PATHS } from "../constants.js";
import { log } from "../utils/Logger.js";
import {
  SKILL_QUALITY_SCHEMA_VERSION,
  SKILL_DESCRIPTION_MAX_CHARS,
  defaultSkillQuality,
  parseSkillFile,
  extractTriggerPhrases,
  detectOutputExample,
  detectVagueLanguageViolations,
  countBodyLines,
  coerceSkillType,
  type SkillQualityRecord,
  type SkillQualityRegistry,
  type SkillSourceTier,
} from "../schemas/skillQualitySchema.js";

/** PRISM repo root — `state/` lives directly under it. */
const PRISM_ROOT = path.resolve(PATHS.STATE_DIR, "..");
/** Recursion depth cap for `skills/**​/SKILL.md` walks (guards a pathological FS).
 *  Must be ≥6: plugin skills live at `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/skills/<skill>/SKILL.md`
 *  (6 dirs below the `~/.claude/plugins` root), and a plugin may nest a skill one group deeper still. */
const MAX_SKILL_TREE_DEPTH = 8;
/** Segments to ignore entirely when deriving a plugin name from a tree path. */
const PLUGIN_PATH_NOISE = new Set(["cache", "repos", "skills"]);
/** A path segment that looks like a plugin *version* (git short-SHA or semver-ish), not a name. */
function looksLikeVersionSegment(s: string): boolean {
  return /^[0-9a-f]{7,40}$/i.test(s) || /^v?\d+\.\d+(?:\.\d+)?(?:[-+].*)?$/.test(s);
}
/** Output locations. */
const REGISTRY_DIR = path.join(PATHS.STATE_DIR, "shared", "registries");
const REGISTRY_PATH = path.join(REGISTRY_DIR, "SKILL_QUALITY_REGISTRY.json");
const PARSE_FAILURES_PATH = path.join(REGISTRY_DIR, "skill-registry-parse-failures.json");

/** Tier precedence (lower index wins a name collision). */
const TIER_PRECEDENCE: SkillSourceTier[] = ["enterprise", "user", "project", "plugin"];

export interface SkillSourceRoot {
  /** Absolute directory to scan. */
  dir: string;
  /** Tier this root belongs to. */
  tier: SkillSourceTier;
  /** "flat" = `*.md` files directly in `dir` (command skills); "tree" = `**​/SKILL.md`. */
  layout: "flat" | "tree";
  /** Plugin namespace, when tier === "plugin" and known from the path. */
  plugin?: string;
}

/** Options for {@link SkillQualityRegistryBuilder.build}. */
export interface BuildSkillQualityOptions {
  /** Override the set of roots to scan (mainly for tests). */
  roots?: SkillSourceRoot[];
  /** When false, the registry JSON is computed but not written to disk. Default true. */
  write?: boolean;
  /** Override the output path (tests). */
  outPath?: string;
  /** Override the parse-failure log path (tests). */
  parseFailuresPath?: string;
  /** Skip the `~/.claude` (user/plugin) roots — useful in CI / tests for determinism. */
  skipUserRoots?: boolean;
}

/** Result of a build run. */
export interface BuildSkillQualityResult {
  registry: SkillQualityRegistry;
  /** Where the JSON was written, or null when `write: false`. */
  writtenTo: string | null;
  /** Number of rows whose frontmatter failed to parse. */
  parseFailures: number;
  /** Roots that didn't exist on disk (informational). */
  missingRoots: string[];
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** Resolve a symlink/junction to its real path; fall back to the input on error. */
async function realpathSafe(p: string): Promise<string> {
  try {
    return await fs.realpath(p);
  } catch {
    return p;
  }
}

/**
 * Plugin roots discovered from `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/...`.
 *
 * The cache is the ground truth — `installed_plugins.json` is regularly *stale* (its `installPath`
 * fields point at versions that have since been re-fetched into a new `<version>` dir). So we crawl
 * the cache directly, and for each `(marketplace, plugin)` keep only the newest-by-mtime version dir
 * (a `claude plugin update` fetches into a fresh dir, so newest-mtime ≈ active version). Each returned
 * root carries the resolved `plugin` name so {@link nameFromTree} produces a clean `<plugin>:<skill>`
 * that survives version bumps, and the per-plugin dedup means no `shadowed_by` churn from stale dirs.
 * Returns `[]` if there's no cache dir, and the caller falls back to a generic crawl of `plugins/`.
 */
async function pluginCacheRoots(userClaude: string): Promise<SkillSourceRoot[]> {
  const cacheDir = path.join(userClaude, "plugins", "cache");
  const out: SkillSourceRoot[] = [];
  const isDirEntry = async (full: string, e: import("fs").Dirent): Promise<boolean> =>
    e.isDirectory() || (e.isSymbolicLink() && (await fs.stat(full).then((s) => s.isDirectory()).catch(() => false)));
  let markets: import("fs").Dirent[];
  try {
    markets = await fs.readdir(cacheDir, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const mkt of markets) {
    const mktDir = path.join(cacheDir, mkt.name);
    if (!(await isDirEntry(mktDir, mkt))) continue;
    let plugins: import("fs").Dirent[];
    try {
      plugins = await fs.readdir(mktDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const pl of plugins) {
      const plDir = path.join(mktDir, pl.name);
      if (!(await isDirEntry(plDir, pl))) continue;
      let versions: import("fs").Dirent[];
      try {
        versions = await fs.readdir(plDir, { withFileTypes: true });
      } catch {
        continue;
      }
      // Pick the newest sub-directory (a version dir, or — for the rare versionless layout —
      // a `skills/` dir directly). `findSkillMd` recursing from there picks up `skills/**` and
      // figma-style `workflow-skills/**`.
      let best: { dir: string; mtimeMs: number } | null = null;
      for (const v of versions) {
        const vDir = path.join(plDir, v.name);
        if (!(await isDirEntry(vDir, v))) continue;
        const st = await fs.stat(vDir).catch(() => null);
        if (!st) continue;
        if (!best || st.mtimeMs > best.mtimeMs) best = { dir: vDir, mtimeMs: st.mtimeMs };
      }
      if (best) out.push({ dir: best.dir, tier: "plugin", layout: "tree", plugin: pl.name });
    }
  }
  return out;
}

/** Default roots, in precedence order, derived from `os.homedir()` + PRISM_ROOT. */
async function defaultRoots(opts: BuildSkillQualityOptions): Promise<SkillSourceRoot[]> {
  const home = os.homedir();
  const userClaude = path.join(home, ".claude");
  const roots: SkillSourceRoot[] = [];
  if (!opts.skipUserRoots) {
    roots.push({ dir: path.join(userClaude, "commands"), tier: "user", layout: "flat" });
    roots.push({ dir: path.join(userClaude, "skills"), tier: "user", layout: "tree" });
    const pluginRoots = await pluginCacheRoots(userClaude);
    if (pluginRoots.length > 0) {
      roots.push(...pluginRoots);
    } else {
      // no cache dir → best-effort generic crawl of whatever's under plugins/
      roots.push({ dir: path.join(userClaude, "plugins"), tier: "plugin", layout: "tree" });
    }
  }
  roots.push({ dir: path.join(PRISM_ROOT, ".claude", "commands"), tier: "project", layout: "flat" });
  roots.push({ dir: path.join(PRISM_ROOT, ".claude", "skills"), tier: "project", layout: "tree" });
  roots.push({ dir: path.join(PRISM_ROOT, "mcp-server", "skills"), tier: "project", layout: "tree" });
  roots.push({ dir: path.join(PRISM_ROOT, "skills-consolidated"), tier: "project", layout: "tree" });
  return roots;
}

/** List `*.md` files directly in a directory (flat command-skill layout). */
async function listFlatMd(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries: import("fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.isFile() && e.name.toLowerCase().endsWith(".md") && e.name.toLowerCase() !== "readme.md") {
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

/** Recursively find `SKILL.md` files under `dir` up to `MAX_SKILL_TREE_DEPTH`,
 *  returning each as `{ file, segments }` where `segments` are the dirs between
 *  `dir` and the SKILL.md (used to build a namespaced skill name). */
async function findSkillMd(dir: string, depth = 0, segments: string[] = []): Promise<Array<{ file: string; segments: string[] }>> {
  if (depth > MAX_SKILL_TREE_DEPTH) return [];
  const out: Array<{ file: string; segments: string[] }> = [];
  let entries: import("fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isFile() && e.name.toLowerCase() === "skill.md") {
      out.push({ file: full, segments });
    } else if (e.isDirectory() || e.isSymbolicLink()) {
      // node_modules / .git guard
      if (e.name === "node_modules" || e.name === ".git" || e.name === "dist") continue;
      const isDir = e.isDirectory() || (await fs.stat(full).then((s) => s.isDirectory()).catch(() => false));
      if (isDir) out.push(...(await findSkillMd(full, depth + 1, [...segments, e.name])));
    }
  }
  return out;
}

/** Derive a canonical skill name + plugin namespace from a tree-layout SKILL.md path.
 *  Plugin layout in the wild: `cache/<marketplace>/<plugin>/<version>/skills/<skill...>/SKILL.md`
 *  (also `<plugin>/skills/<skill>/SKILL.md` for the synthetic / simpler case). We want the
 *  name `<plugin>:<skill...>` — i.e. the last *meaningful* segment before `skills` (dropping the
 *  `cache`/`repos` prefix, any marketplace dir, and a trailing version-looking segment), then
 *  the skill path under `skills/`. */
function nameFromTree(root: SkillSourceRoot, segments: string[]): { name: string; plugin?: string } {
  if (root.tier === "plugin") {
    // When the root already knows its plugin (manifest-derived), the segments are *relative to
    // the plugin install dir* — e.g. ["skills","figma-use"] or ["workflow-skills","gen-plan"].
    // Drop the conventional `skills`/`cache`/`repos` wrappers and namespace under the known plugin.
    if (root.plugin) {
      const skill = segments.filter((s) => !PLUGIN_PATH_NOISE.has(s)).join(":") || "skill";
      return { name: `${root.plugin}:${skill}`, plugin: root.plugin };
    }
    const skillsIdx = segments.indexOf("skills");
    if (skillsIdx >= 1 && skillsIdx + 1 < segments.length) {
      // segments before "skills": [(cache|repos)?, <marketplace>?, <plugin>, <version>?]
      const pre = segments.slice(0, skillsIdx).filter((s) => !PLUGIN_PATH_NOISE.has(s));
      // peel a trailing version-looking segment so `figma/2.1.30` → plugin "figma", not "figma-2.1.30"
      while (pre.length > 1 && looksLikeVersionSegment(pre[pre.length - 1])) pre.pop();
      const plugin = pre.length ? pre[pre.length - 1] : segments[0];
      const skill = segments.slice(skillsIdx + 1).join(":");
      return { name: `${plugin}:${skill}`, plugin };
    }
    // fallback: <plugin>/<skill...>/SKILL.md  (no explicit `skills/` dir)
    if (segments.length >= 2) return { name: `${segments[0]}:${segments.slice(1).join(":")}`, plugin: segments[0] };
    return { name: segments.join(":") || "unknown-plugin-skill", plugin: segments[0] };
  }
  // user/project tree: skills/<group?>/<skill>/SKILL.md → name "<group>:<skill>" or "<skill>"
  return { name: segments.join(":") || "unknown-skill" };
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function asBool(v: unknown, dflt: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return /^(true|yes|1)$/i.test(v.trim());
  return dflt;
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.join(" ");
  if (v == null) return "";
  return String(v);
}

/**
 * The skill quality registry builder. Stateless beyond the singleton — call
 * {@link build} to (re)generate the registry.
 */
export class SkillQualityRegistryBuilder {
  /** Build (and optionally persist) SKILL_QUALITY_REGISTRY.json. */
  async build(opts: BuildSkillQualityOptions = {}): Promise<BuildSkillQualityResult> {
    const write = opts.write !== false;
    const outPath = opts.outPath ?? REGISTRY_PATH;
    const failPath = opts.parseFailuresPath ?? PARSE_FAILURES_PATH;
    const roots = opts.roots ?? (await defaultRoots(opts));

    const missingRoots: string[] = [];
    // name → list of candidate rows (across tiers); we resolve shadowing after collection
    const byName = new Map<string, SkillQualityRecord[]>();
    const parseFailures: Array<{ name: string; path: string; error: string }> = [];

    for (const root of roots) {
      if (!(await pathExists(root.dir))) {
        missingRoots.push(root.dir);
        continue;
      }
      const files: Array<{ file: string; name: string; plugin?: string }> = [];
      if (root.layout === "flat") {
        for (const f of await listFlatMd(root.dir)) {
          files.push({ file: f, name: path.basename(f, ".md") });
        }
      } else {
        for (const { file, segments } of await findSkillMd(root.dir)) {
          const { name, plugin } = nameFromTree(root, segments);
          files.push({ file, name, plugin });
        }
      }
      for (const { file, name, plugin } of files) {
        try {
          const realPath = await realpathSafe(file);
          const stat = await fs.stat(realPath);
          const content = await fs.readFile(realPath, "utf-8");
          const parsed = parseSkillFile(content);
          const fm = parsed.frontmatter ?? {};
          const rawDesc = asString(fm["description"]);
          const description = rawDesc.length > SKILL_DESCRIPTION_MAX_CHARS ? rawDesc.slice(0, SKILL_DESCRIPTION_MAX_CHARS) : rawDesc;
          const bodyLines = countBodyLines(parsed.body);
          const quality = defaultSkillQuality(toIsoDate(stat.mtime));
          quality.trigger_phrases = (() => {
            // a frontmatter `trigger_phrases:` array, if present, takes priority over the heuristic
            const fmTp = fm["trigger_phrases"] ?? fm["triggers"];
            if (Array.isArray(fmTp) && fmTp.length) return fmTp.map((x) => String(x).trim()).filter(Boolean).slice(0, 24);
            return extractTriggerPhrases(description);
          })();
          quality.has_output_example = detectOutputExample(parsed.body);
          quality.body_line_count = bodyLines.instructionLines;
          quality.vague_language_violations = detectVagueLanguageViolations(parsed.body);
          const record: SkillQualityRecord = {
            name,
            path: realPath,
            tier: root.tier,
            ...(plugin ? { plugin } : {}),
            description,
            description_over_limit: rawDesc.length > SKILL_DESCRIPTION_MAX_CHARS,
            ...(coerceSkillType(fm["skill_type"]) ? { skill_type: coerceSkillType(fm["skill_type"]) } : {}),
            disable_model_invocation: asBool(fm["disable-model-invocation"] ?? fm["disable_model_invocation"], false),
            user_invocable: asBool(fm["user-invocable"] ?? fm["user_invocable"], true),
            ...(parsed.parseError ? { _parse_error: parsed.parseError } : {}),
            quality,
          };
          if (parsed.parseError) parseFailures.push({ name, path: realPath, error: parsed.parseError });
          const list = byName.get(name) ?? [];
          list.push(record);
          byName.set(name, list);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          parseFailures.push({ name, path: file, error: `read/stat failed: ${msg}` });
        }
      }
    }

    // Resolve name shadowing across tiers (R7 — record both with pointers, never silent-overwrite).
    const skills: SkillQualityRecord[] = [];
    for (const [name, candidates] of byName) {
      if (candidates.length === 1) {
        skills.push(candidates[0]);
        continue;
      }
      candidates.sort((a, b) => TIER_PRECEDENCE.indexOf(a.tier) - TIER_PRECEDENCE.indexOf(b.tier));
      const winner = candidates[0];
      const losers = candidates.slice(1);
      winner.shadows = losers.map((l) => `${l.name}@${l.tier}`);
      for (const l of losers) l.shadowed_by = `${winner.name}@${winner.tier}`;
      skills.push(winner, ...losers);
      log.debug(`skill-quality-registry: "${name}" exists in ${candidates.length} tiers — winner=${winner.tier}`);
    }

    // Stable sort: name, then tier precedence (so shadowed copies follow their winner).
    skills.sort((a, b) => (a.name === b.name ? TIER_PRECEDENCE.indexOf(a.tier) - TIER_PRECEDENCE.indexOf(b.tier) : a.name < b.name ? -1 : 1));

    const byTier: Record<string, number> = {};
    for (const s of skills) byTier[s.tier] = (byTier[s.tier] ?? 0) + 1;

    const registry: SkillQualityRegistry = {
      schemaVersion: SKILL_QUALITY_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      total: skills.length,
      byTier,
      parseFailures: parseFailures.length,
      skills,
    };

    let writtenTo: string | null = null;
    if (write) {
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, JSON.stringify(registry, null, 2), "utf-8");
      writtenTo = outPath;
      await fs.mkdir(path.dirname(failPath), { recursive: true });
      await fs.writeFile(
        failPath,
        JSON.stringify({ schemaVersion: SKILL_QUALITY_SCHEMA_VERSION, generatedAt: registry.generatedAt, count: parseFailures.length, failures: parseFailures }, null, 2),
        "utf-8",
      );
      log.info(`SKILL_QUALITY_REGISTRY.json written: ${skills.length} skills (${parseFailures.length} parse failures) → ${outPath}`);
    }

    return { registry, writtenTo, parseFailures: parseFailures.length, missingRoots };
  }

  /** Read the persisted registry, or null if it hasn't been built yet. */
  async read(p: string = REGISTRY_PATH): Promise<SkillQualityRegistry | null> {
    try {
      const raw = await fs.readFile(p, "utf-8");
      return JSON.parse(raw) as SkillQualityRegistry;
    } catch {
      return null;
    }
  }
}

/** Singleton — `import { skillQualityRegistryBuilder } from ".../SkillQualityRegistryBuilder.js"`. */
export const skillQualityRegistryBuilder = new SkillQualityRegistryBuilder();

/** Convenience for the build script + dispatcher: build with defaults and return a summary. */
export async function buildSkillQualityRegistry(opts: BuildSkillQualityOptions = {}): Promise<{
  total: number;
  byTier: Record<string, number>;
  parseFailures: number;
  writtenTo: string | null;
  missingRoots: string[];
}> {
  const r = await skillQualityRegistryBuilder.build(opts);
  return { total: r.registry.total, byTier: r.registry.byTier, parseFailures: r.parseFailures, writtenTo: r.writtenTo, missingRoots: r.missingRoots };
}

/** Exported paths so callers (script, dispatcher, tests) agree on locations. */
export const SKILL_QUALITY_REGISTRY_PATH = REGISTRY_PATH;
export const SKILL_QUALITY_PARSE_FAILURES_PATH = PARSE_FAILURES_PATH;
