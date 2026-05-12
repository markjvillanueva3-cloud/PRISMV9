/**
 * HookManifestEngine — HOOK-MANIFEST-DAG-MS26 / P0-U01
 *
 * Scans the Claude Code hook surface and emits a static {@link HookManifest}:
 *   - hook *files* on disk: `.claude/hooks/*.mjs` (harness hooks) and
 *     `mcp-server/src/hooks/*.ts` (MCP-server safety hooks);
 *   - hook *wirings* declared in the `hooks` block of the active `settings.json`
 *     files (user-level `<drive>/.claude/settings.json`, `~/.claude/settings.json`,
 *     and the project-level `.claude/settings.json` / `.claude/settings.local.json`);
 *   - the join of the two: which file fires on which event/matcher, with timeout
 *     and hard-block flags, plus orphaned files (on disk, never wired) and
 *     dangling refs (wired, but the file is missing).
 *
 * This is the input contract for HookDAGValidatorEngine (P0-U02, cycle
 * detection + deterministic order) and for hook-coverage tooling.
 *
 * Duplication check (manual — DuplicationGuardEngine's dynamic import chokes on
 * Windows `h:` paths from .mjs context): closest existing assets are
 *   - `orchestration/HookEngine` — tracks *registered MCP-server* hooks at
 *     runtime; knows nothing about the `.mjs` Claude Code hook files. Different
 *     surface, complementary.
 *   - `.claude/scripts/verify-hook-refs.mjs` — *validates* that settings refs
 *     resolve; emits no manifest. This engine subsumes that check
 *     (`danglingRefs`) and adds the catalog.
 *   - `scripts/generate-hook-{bridges,wiki,atomic}.mjs` — generate docs/bridges,
 *     not a structured manifest.
 * No existing `HookManifest*` engine. Proceed.
 *
 * I/O note: like CADFileIndexerEngine / CADRegressionTestOrchestratorEngine,
 * this is an *infrastructure* engine — it reads the filesystem. The "engines are
 * pure calculation" rule applies to physics engines. The `fs` dependency is
 * injectable for unit tests (`fsImpl`).
 *
 * Complexity: O(F + S·W) — F hook files (one read each for line/byte/export
 * parse), S settings files, W wirings per settings file.
 *
 * @module engines/HookManifestEngine
 */

import * as nodeFs from "node:fs";
import * as nodePath from "node:path";
import * as nodeOs from "node:os";
import { BaseEngine, type EngineCapability } from "./BaseEngine.js";
import { atomicWrite } from "../utils/atomicWrite.js";
import {
  HOOK_MANIFEST_SCHEMA_VERSION,
  HookManifestSchema,
  KNOWN_HOOK_EVENTS,
  type HookManifest,
  type HookEntry,
  type HookWiring,
  type HookKind,
  type DanglingRef,
  type HookManifestStats,
} from "../schemas/hookManifestSchema.js";

// ── Constants ────────────────────────────────────────────────────────────────

/** Hops to climb from cwd looking for the repo root (a dir with `.claude` + `mcp-server`). */
const MAX_REPO_ROOT_WALKUP = 8;
/** File extensions we treat as runnable hook scripts. */
const SCRIPT_EXTS = new Set([".mjs", ".cjs", ".js", ".ts"]);
/** Files in a hook dir we never treat as hooks. */
const SKIP_FILE = /(\.test\.|\.spec\.|\.d\.ts$|\.map$|^\.)/i;
/** Trim a doc/comment line to this many chars. */
const DOC_LINE_MAX = 240;

// ── Injectable FS surface ────────────────────────────────────────────────────

/** The slice of `node:fs` this engine needs (`node:fs` itself satisfies it). */
export type ManifestFS = Pick<typeof nodeFs, "existsSync" | "statSync" | "readdirSync" | "readFileSync">;

// ── Options ──────────────────────────────────────────────────────────────────

export interface HookManifestOptions {
  /**
   * Repo root the relative paths are anchored to. Default: walk up from
   * `process.cwd()` (≤ {@link MAX_REPO_ROOT_WALKUP} levels) to the first dir
   * containing both `.claude` and `mcp-server`; if none, `process.cwd()`.
   */
  repoRoot?: string;
  /**
   * Hook directories to scan, as `{ dir, kind }` pairs. Paths may be absolute or
   * relative-to-`repoRoot`. Default:
   *   - `<repoRoot>/.claude/hooks`         → kind "claude-mjs"
   *   - `<repoRoot>/mcp-server/src/hooks`  → kind "mcp-ts"
   */
  hookDirs?: Array<{ dir: string; kind: HookKind }>;
  /**
   * settings.json files to parse for wirings. Paths may be absolute or
   * relative-to-`repoRoot`. Only existing files are read; duplicate normalized
   * paths are read once; identical wirings across files are deduped. Default:
   *   - `<repoRoot-drive>/.claude/settings.json`   (the documented hook SoT)
   *   - `<homedir>/.claude/settings.json`
   *   - `<repoRoot>/.claude/settings.json`
   *   - `<repoRoot>/.claude/settings.local.json`
   */
  settingsFiles?: string[];
  /** Injectable filesystem (for tests). Defaults to `node:fs`. */
  fsImpl?: ManifestFS;
}

// ── Path helpers ─────────────────────────────────────────────────────────────

/** Forward-slash a path. */
function fwd(p: string): string {
  return p.replace(/\\/g, "/");
}

/** Make `abs` relative to `root`, forward-slashed; keeps `../` if outside; `.` if equal. */
function relTo(root: string, abs: string): string {
  return fwd(nodePath.relative(root, abs)) || ".";
}

/** True if `p` looks absolute (POSIX `/…` or Windows `C:\…` / `C:/…`). */
function isAbsLike(p: string): boolean {
  return nodePath.isAbsolute(p) || /^[A-Za-z]:[\\/]/.test(p);
}

// ── Source parsing helpers ───────────────────────────────────────────────────

/** Best-effort: extract the first JSDoc/comment line of a source file. */
function firstDocLine(src: string): string {
  const jsdoc = src.match(/\/\*\*([\s\S]*?)\*\//);
  if (jsdoc) {
    for (const raw of jsdoc[1].split("\n")) {
      const line = raw.replace(/^\s*\*?\s?/, "").trim();
      if (line && !line.startsWith("@")) return line.slice(0, DOC_LINE_MAX);
    }
  }
  const slash = src.match(/^\s*\/\/\s?(.+)$/m);
  if (slash) return slash[1].trim().slice(0, DOC_LINE_MAX);
  const block = src.match(/\/\*\s*([^*][\s\S]*?)\*\//);
  if (block) {
    const line = block[1].split("\n")[0].replace(/^\s*\*?\s?/, "").trim();
    if (line) return line.slice(0, DOC_LINE_MAX);
  }
  return "";
}

/** Best-effort: list exported symbol names from a source file ("default" for a default export). */
function exportNames(src: string): string[] {
  const out = new Set<string>();
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  let m: RegExpExecArray | null;
  const named = /export\s+(?:async\s+)?(?:function\*?|const|let|var|class|enum|interface|type)\s+([A-Za-z_$][\w$]*)/g;
  while ((m = named.exec(stripped))) out.add(m[1]);
  const braced = /export\s*\{([^}]*)\}/g;
  while ((m = braced.exec(stripped))) {
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/i).pop()?.trim();
      if (name && /^[A-Za-z_$][\w$]*$/.test(name)) out.add(name);
    }
  }
  if (/export\s+default\b/.test(stripped)) out.add("default");
  return [...out].sort();
}

/**
 * Pull the script path (+ trailing args) out of a settings hook `command` string.
 * Commands look like `"<runner>" <scriptPath> [args…]` or `node <scriptPath>`.
 * Returns null if no script-looking token is present (e.g. a pure shell command).
 */
function parseCommand(command: unknown): { script: string; args: string } | null {
  if (typeof command !== "string" || !command.trim()) return null;
  const m = command.match(/["']?([^"'\s]+\.(?:mjs|cjs|js|ts))["']?(?:\s+([^]*))?$/);
  if (!m) return null;
  return { script: fwd(m[1]), args: (m[2] ?? "").trim() };
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class HookManifestEngine extends BaseEngine {
  constructor() {
    super({
      name: "HookManifestEngine",
      version: "1.0.0",
      domain: "infrastructure/hooks",
      description:
        "Scans .claude/hooks + mcp-server/src/hooks and joins them with settings.json wirings to emit a static hook manifest (catalog + DAG-validator input).",
    });
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "generate", description: "Scan hook dirs + settings files, return the HookManifest object." },
      {
        name: "generateAndWrite",
        description:
          "generate(), then atomically write to mcp-server/data/state/hook-manifest.json (or a given path). Returns { manifest, path }.",
      },
      { name: "loadManifest", description: "Read + Zod-validate a previously written manifest JSON." },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null) return null; // generate() takes optional opts
    if (typeof input !== "object") return "expected an options object";
    const o = input as HookManifestOptions;
    if (o.repoRoot != null && typeof o.repoRoot !== "string") return "repoRoot must be a string";
    if (o.hookDirs != null && !Array.isArray(o.hookDirs)) return "hookDirs must be an array";
    if (o.settingsFiles != null && !Array.isArray(o.settingsFiles)) return "settingsFiles must be an array";
    return null;
  }

  protected async executeImpl(input: unknown): Promise<HookManifest> {
    return this.generate((input as HookManifestOptions) ?? undefined);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Default repo-root resolution: walk up from `startDir` — and, if that fails,
   * from this module's own directory — to the first dir holding both `.claude`
   * and `mcp-server`. The module-dir fallback covers a vitest worker (or any
   * caller) whose `process.cwd()` isn't inside the repo. Falls back to a
   * normalized `startDir` if no marker dir is found.
   *
   * Note: paths are normalized, never `nodePath.resolve()`d, when they already
   * look absolute — on Windows `resolve("/repo")` would prepend the cwd drive
   * letter (`H:/repo`), which breaks injected-FS callers that use POSIX roots.
   */
  resolveRepoRoot(startDir: string = process.cwd(), fs: ManifestFS = nodeFs): string {
    const norm = (s: string): string => fwd(isAbsLike(s) ? nodePath.normalize(s) : nodePath.resolve(s));
    const walkUp = (from: string): string | null => {
      let dir = norm(from);
      for (let i = 0; i < MAX_REPO_ROOT_WALKUP; i++) {
        // Markers: the harness hooks dir (`.claude/hooks`) + the `mcp-server` package dir.
        // `.claude` alone is too weak — `mcp-server/.claude/` exists too — and a stray nested
        // `mcp-server/mcp-server/` would otherwise let `mcp-server/` itself pass as the root.
        if (fs.existsSync(nodePath.join(dir, ".claude", "hooks")) && fs.existsSync(nodePath.join(dir, "mcp-server"))) return dir;
        const parent = fwd(nodePath.dirname(dir));
        if (parent === dir) break;
        dir = parent;
      }
      return null;
    };
    const fromStart = walkUp(startDir);
    if (fromStart) return fromStart;
    try {
      // file:///H:/… (win) or file:///home/… (posix) → strip the leading "/" before a drive letter.
      const self = new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/i, "$1");
      const fromSelf = walkUp(nodePath.dirname(self));
      if (fromSelf) return fromSelf;
    } catch {
      /* import.meta unavailable (non-ESM context) — fall through to the start-dir default */
    }
    return norm(startDir);
  }

  /** Scan + join. Pure read-only. Throws only on its own malformed output (a bug). */
  generate(opts: HookManifestOptions = {}): HookManifest {
    const fs: ManifestFS = opts.fsImpl ?? nodeFs;
    // `resolveRepoRoot` already returns a normalized fwd-slashed path; only an
    // explicit caller-supplied root needs normalizing here. Never `resolve()` it
    // (would prepend the cwd drive on Windows for a POSIX root like "/repo").
    const repoRoot = opts.repoRoot
      ? fwd(isAbsLike(opts.repoRoot) ? nodePath.normalize(opts.repoRoot) : nodePath.resolve(opts.repoRoot))
      : this.resolveRepoRoot(process.cwd(), fs);
    const drive = nodePath.parse(repoRoot).root || nodePath.sep;

    const hookDirSpecs: Array<{ dir: string; kind: HookKind }> =
      opts.hookDirs ?? [
        { dir: ".claude/hooks", kind: "claude-mjs" },
        { dir: "mcp-server/src/hooks", kind: "mcp-ts" },
      ];

    const settingsCandidates: string[] =
      opts.settingsFiles ?? [
        nodePath.join(drive, ".claude", "settings.json"),
        nodePath.join(nodeOs.homedir(), ".claude", "settings.json"),
        nodePath.join(repoRoot, ".claude", "settings.json"),
        nodePath.join(repoRoot, ".claude", "settings.local.json"),
      ];

    // 1) Scan hook files → entries keyed by relative path.
    const entries = new Map<string, HookEntry>();
    const hookDirsAbs: string[] = [];
    for (const spec of hookDirSpecs) {
      // `join` (not `resolve`): a drive-less `repoRoot` ("/repo") must stay drive-less,
      // not get re-anchored to the cwd drive.
      const dirAbs = fwd(isAbsLike(spec.dir) ? nodePath.normalize(spec.dir) : nodePath.join(repoRoot, spec.dir));
      if (!fs.existsSync(dirAbs)) continue;
      try {
        if (!fs.statSync(dirAbs).isDirectory()) continue;
      } catch {
        continue;
      }
      hookDirsAbs.push(dirAbs);
      let names: string[] = [];
      try {
        names = fs.readdirSync(dirAbs);
      } catch {
        names = [];
      }
      for (const name of [...names].sort()) {
        const ext = nodePath.extname(name).toLowerCase();
        if (!SCRIPT_EXTS.has(ext)) continue;
        if (SKIP_FILE.test(name)) continue;
        const abs = fwd(nodePath.join(dirAbs, name));
        let st: nodeFs.Stats;
        try {
          st = fs.statSync(abs);
        } catch {
          continue;
        }
        if (!st.isFile()) continue;
        let src = "";
        try {
          src = fs.readFileSync(abs, "utf-8");
        } catch {
          src = "";
        }
        const rel = relTo(repoRoot, abs);
        if (entries.has(rel)) continue; // two specs pointing at the same dir
        entries.set(rel, {
          id: nodePath.basename(name, ext),
          file: rel,
          kind: spec.kind,
          sizeBytes: typeof st.size === "number" ? st.size : Buffer.byteLength(src, "utf-8"),
          lineCount: src ? src.split("\n").length : 0,
          description: firstDocLine(src),
          exports: exportNames(src),
          wired: false,
          hardBlock: false,
          events: [],
          wirings: [],
        });
      }
    }

    // 2) Parse settings files → wirings; attach to entries; collect dangling refs.
    const settingsFilesAbs: string[] = [];
    const seenSettings = new Set<string>();
    const danglingSeen = new Set<string>();
    const danglingRefs: DanglingRef[] = [];
    const eventOrder = new Map<string, string[]>(); // event → ordered relative file paths (first source wins ordering)
    const eventTypes = new Set<string>();
    const seenWiring = new Set<string>(); // dedupe identical wirings across settings files

    for (const cand of settingsCandidates) {
      const abs = fwd(isAbsLike(cand) ? nodePath.normalize(cand) : nodePath.join(repoRoot, cand));
      if (seenSettings.has(abs.toLowerCase())) continue;
      seenSettings.add(abs.toLowerCase());
      if (!fs.existsSync(abs)) continue;
      let json: { hooks?: Record<string, unknown> };
      try {
        json = JSON.parse(fs.readFileSync(abs, "utf-8"));
      } catch {
        continue;
      }
      settingsFilesAbs.push(abs);
      const hooksBlock = json?.hooks;
      if (!hooksBlock || typeof hooksBlock !== "object") continue;
      for (const event of Object.keys(hooksBlock)) {
        eventTypes.add(event);
        const groups = Array.isArray((hooksBlock as Record<string, unknown>)[event])
          ? ((hooksBlock as Record<string, unknown>)[event] as unknown[])
          : [];
        let order = 0;
        for (const group of groups) {
          const g = (group ?? {}) as { matcher?: unknown; hooks?: unknown };
          const matcher = typeof g.matcher === "string" ? g.matcher : "";
          const hookList = Array.isArray(g.hooks) ? (g.hooks as unknown[]) : [];
          for (const hRaw of hookList) {
            const h = (hRaw ?? {}) as { command?: unknown; timeout?: unknown; continueOnError?: unknown };
            const parsed = parseCommand(h.command);
            if (!parsed) {
              order++;
              continue;
            }
            const scriptAbs = fwd(isAbsLike(parsed.script) ? nodePath.normalize(parsed.script) : nodePath.join(repoRoot, parsed.script));
            const rel = relTo(repoRoot, scriptAbs);
            const wiring: HookWiring = {
              event,
              matcher,
              timeoutMs: typeof h.timeout === "number" ? h.timeout : undefined,
              continueOnError: typeof h.continueOnError === "boolean" ? h.continueOnError : undefined,
              args: parsed.args || undefined,
              source: abs,
              order: order++,
            };
            const entry = entries.get(rel);
            if (!entry) {
              const dkey = `${rel}|${event}|${matcher}|${abs}`;
              if (!danglingSeen.has(dkey)) {
                danglingSeen.add(dkey);
                danglingRefs.push({ ref: rel, event, matcher, source: abs });
              }
              continue;
            }
            const wiringKey = `${rel}|${event}|${matcher}|${wiring.args ?? ""}|${wiring.timeoutMs ?? ""}|${wiring.continueOnError ?? ""}|${abs}`;
            if (!seenWiring.has(wiringKey)) {
              seenWiring.add(wiringKey);
              entry.wirings.push(wiring);
              entry.wired = true;
              if (wiring.continueOnError === false) entry.hardBlock = true;
              if (!entry.events.includes(event)) entry.events.push(event);
            }
            if (!eventOrder.has(event)) eventOrder.set(event, []);
            const lst = eventOrder.get(event)!;
            if (!lst.includes(rel)) lst.push(rel);
          }
        }
      }
    }

    // 3) Finalize entries (sort wirings + events) and build the sorted list.
    const hooks: HookEntry[] = [...entries.values()]
      .map((e) => ({
        ...e,
        events: [...e.events].sort(),
        wirings: [...e.wirings].sort(
          (a, b) =>
            a.source.localeCompare(b.source) ||
            a.event.localeCompare(b.event) ||
            a.order - b.order ||
            a.matcher.localeCompare(b.matcher),
        ),
      }))
      .sort((a, b) => a.file.localeCompare(b.file));

    // 4) Stats.
    const byKind: Record<string, number> = {};
    const byEvent: Record<string, number> = {};
    let wiredCount = 0;
    let hardBlockCount = 0;
    let totalLines = 0;
    for (const h of hooks) {
      byKind[h.kind] = (byKind[h.kind] ?? 0) + 1;
      totalLines += h.lineCount;
      if (h.wired) wiredCount++;
      if (h.hardBlock) hardBlockCount++;
      for (const ev of h.events) byEvent[ev] = (byEvent[ev] ?? 0) + 1;
    }
    const stats: HookManifestStats = {
      totalHooks: hooks.length,
      byKind,
      byEvent,
      wired: wiredCount,
      orphaned: hooks.length - wiredCount,
      hardBlock: hardBlockCount,
      danglingRefs: danglingRefs.length,
      totalLines,
      eventTypes: [...eventTypes].sort(),
    };

    // 5) events map — known events first (canonical order), then any extras alphabetically.
    const events: Record<string, string[]> = {};
    const knownSet: ReadonlySet<string> = new Set(KNOWN_HOOK_EVENTS as readonly string[]);
    const orderedEventKeys = [
      ...KNOWN_HOOK_EVENTS.filter((e) => eventOrder.has(e)),
      ...[...eventOrder.keys()].filter((e) => !knownSet.has(e)).sort(),
    ];
    for (const e of orderedEventKeys) events[e] = eventOrder.get(e) ?? [];

    const manifest: HookManifest = {
      schemaVersion: HOOK_MANIFEST_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      repoRoot,
      hookDirs: hookDirsAbs,
      settingsFiles: settingsFilesAbs,
      hooks,
      events,
      danglingRefs: danglingRefs.sort(
        (a, b) => a.ref.localeCompare(b.ref) || a.event.localeCompare(b.event) || a.source.localeCompare(b.source),
      ),
      stats,
    };
    return HookManifestSchema.parse(manifest); // self-check: schema must accept our own output
  }

  /** Default output path for the committed manifest. */
  defaultManifestPath(repoRoot: string = this.resolveRepoRoot()): string {
    return fwd(nodePath.join(repoRoot, "mcp-server", "data", "state", "hook-manifest.json"));
  }

  /** generate() then atomically write the manifest JSON. Returns the manifest + the path written. */
  async generateAndWrite(opts: HookManifestOptions & { outPath?: string } = {}): Promise<{ manifest: HookManifest; path: string }> {
    const manifest = this.generate(opts);
    const outPath = opts.outPath
      ? fwd(isAbsLike(opts.outPath) ? nodePath.normalize(opts.outPath) : nodePath.join(manifest.repoRoot, opts.outPath))
      : this.defaultManifestPath(manifest.repoRoot);
    await atomicWrite(outPath, JSON.stringify(manifest, null, 2) + "\n"); // atomicWrite mkdir -p's the dir
    return { manifest, path: outPath };
  }

  /** Read + validate a previously written manifest. Throws on a malformed/old-schema file. */
  loadManifest(path?: string, fs: ManifestFS = nodeFs): HookManifest {
    const p = fwd(path ?? this.defaultManifestPath());
    return HookManifestSchema.parse(JSON.parse(fs.readFileSync(p, "utf-8")));
  }
}

/** Singleton for dispatcher use. */
export const hookManifestEngine = new HookManifestEngine();
