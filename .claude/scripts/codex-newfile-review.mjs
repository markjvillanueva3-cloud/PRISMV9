#!/usr/bin/env node
/**
 * codex-newfile-review.mjs — per-new-file syntax hard-gate + advisory Codex
 * line-by-line review + auto system-viz node staging + ghost-wire hunt.
 *
 * User directive (2026-05-19): "make [the Codex reviewer] review every line of
 * code so there are no syntax errors and have it check /system-viz to generate
 * the node ... for the new file it just reviewed and hunt down nodes to ghost
 * wire to (using logic and knowledge of the prism app purpose and backend
 * development system)."
 *
 * Design (user-chosen forks):
 *   - Trigger: session end (the Stop hook codex-newfile-review-stop.mjs
 *     spawns this; this script is a pure REPORTER — it never blocks; the hook
 *     turns `syntaxBlockers` into a Stop block).
 *   - Syntax gate is DETERMINISTIC (node --check / esbuild parse) — that is the
 *     hard signal. A compiler answers "is this valid syntax?" deterministically;
 *     a flaky LLM must not gate it (Karpathy R5). Codex stays ADVISORY exactly
 *     as it is in scrutiny-3way.mjs (its quota/offline flakiness retired it as
 *     a gate arm 2026-05-13 — re-gating would resurrect that failure mode).
 *
 * Reuses (R8 — read before write, do not reinvent):
 *   - scripts/system-viz-add-node.mjs   buildNodeEntry/appendQueue/queuePath  (lock-safe ENQUEUE)
 *   - scripts/seed-ghost-from-unwired.mjs  inferDispatcher/MIN_CONFIDENCE      (keyword→sibling cascade = the "hunt")
 *   - .claude/scripts/scrutiny-3way.mjs    runCodexReview                       (the existing advisory Codex arm)
 *
 * Pure-core + injected-deps: every external (git, syntax checker, codex,
 * add-node, inferDispatcher) is an injectable seam so the test suite is
 * hermetic AND ships a real-subprocess E2E (the recurring CLAUDE.md lesson
 * that hermetic fakes do not prove production wiring).
 *
 * CLI:
 *   node .claude/scripts/codex-newfile-review.mjs [--once] [--json]
 *        [--dry-run] [--session-base <ref>] [--strict]
 *
 * Env knobs:
 *   PRISM_CODEX_NEWFILE_DISABLE=1     whole pipeline no-op (still exit 0)
 *   PRISM_CODEX_NEWFILE_MAX_FILES=N   cap reviewed files (default 50)
 *   PRISM_CODEX_NEWFILE_CODEX_OFF=1   skip the advisory Codex step only
 *   PRISM_CODEX_NEWFILE_TIMEOUT_MS=N  Codex arm timeout (default 360000)
 *   PRISM_SCRUTINY_CODEX=off          (honored by runCodexReview itself)
 *   PRISM_CODEX_NEWFILE_GIT_TIMEOUT_MS=N  git subprocess timeout (default 120000)
 *
 * Exit codes (CLI only — the Stop hook keys off the JSON, not exit code):
 *   0  ran (report emitted) — even with syntax blockers, unless --strict
 *   1  internal error (could not run at all)
 *   2  --strict AND syntaxBlockers present
 *
 * @authored 2026-05-19 (codex-newfile-review pipeline)
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Repo root: .claude/scripts/ -> ../../ */
export const ROOT = path.resolve(__dirname, "..", "..");

/** Code extensions whose every line we syntax-verify. */
export const CODE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

/** Path fragments excluded from review (generated / vendored / non-source). */
export const EXCLUDE_RE = [
  /(^|[/\\])node_modules([/\\]|$)/i,
  /(^|[/\\])dist([/\\]|$)/i,
  /(^|[/\\])build([/\\]|$)/i,
  /(^|[/\\])coverage([/\\]|$)/i,
  /(^|[/\\])\.git([/\\]|$)/i,
  /(^|[/\\])system-viz([/\\]|$)/i,
  /\.d\.ts$/i,
  /\.min\.(js|mjs|cjs)$/i,
];

/** Default cap on files reviewed in one session pass. */
export const DEFAULT_MAX_FILES = 50;
/** Default Codex arm timeout (mirrors scrutiny-3way's 6 min backstop). */
export const DEFAULT_CODEX_TIMEOUT_MS = 360_000;
/** Default git subprocess timeout (the repo has 1000s of dirty files). */
export const DEFAULT_GIT_TIMEOUT_MS = 120_000;

// ─── arg parsing ──────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const out = {
    once: false, json: false, dryRun: false, strict: false, sessionBase: "",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--once") out.once = true;
    else if (a === "--json") out.json = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--strict") out.strict = true;
    else if (a === "--session-base") out.sessionBase = argv[++i] || "";
    else if (a.startsWith("--session-base=")) out.sessionBase = a.slice("--session-base=".length);
    else if (a === "--help" || a === "-h") {
      console.error("usage: codex-newfile-review [--once] [--json] [--dry-run] [--session-base <ref>] [--strict]");
      process.exit(0);
    }
  }
  return out;
}

// ─── pure helpers ─────────────────────────────────────────────────────────

/** A file is "review-eligible" if it has a code extension and is not excluded. */
export function isReviewablePath(relPath) {
  if (typeof relPath !== "string" || !relPath) return false;
  const norm = relPath.replace(/\\/g, "/");
  if (EXCLUDE_RE.some((re) => re.test(norm))) return false;
  return CODE_EXTS.has(path.extname(norm).toLowerCase());
}

/**
 * Engine-class files get a system-viz node + ghost-wire hunt. An engine is a
 * .ts under mcp-server/src/engines/ OR any *Engine.ts source file (the same
 * shape seed-ghost-from-unwired.mjs treats as an engine).
 */
export function isEngineFile(relPath) {
  if (typeof relPath !== "string") return false;
  const norm = relPath.replace(/\\/g, "/");
  if (norm.endsWith(".d.ts") || norm.endsWith(".test.ts")) return false;
  if (/mcp-server\/src\/engines\/[^/]+\.ts$/i.test(norm)) return true;
  if (/[^/]*Engine\.ts$/.test(norm) && norm.endsWith(".ts")) return true;
  return false;
}

/** "mcp-server/src/engines/MillForceEngine.ts" -> "MillForceEngine" */
export function deriveEngineName(relPath) {
  return path.basename(String(relPath)).replace(/\.tsx?$/i, "");
}

/**
 * Parse `git status --porcelain` output into added/untracked code paths.
 * XY codes: "A " / "AM" / "?? " (untracked) / " A" all count as new.
 * Pure — takes the raw stdout string.
 */
export function parseNewFilesFromPorcelain(porcelain) {
  if (typeof porcelain !== "string" || !porcelain.trim()) return [];
  const out = [];
  for (const line of porcelain.split(/\r?\n/)) {
    if (!line || line.length < 4) continue;
    const xy = line.slice(0, 2);
    let p = line.slice(3).trim();
    // rename "old -> new" — take the new path
    const arrow = p.indexOf(" -> ");
    if (arrow !== -1) p = p.slice(arrow + 4).trim();
    if (p.startsWith('"') && p.endsWith('"')) p = p.slice(1, -1);
    const isNew = xy === "??" || xy[0] === "A" || xy[1] === "A";
    if (isNew && p) out.push(p);
  }
  return [...new Set(out)];
}

// ─── injected-dep defaults ────────────────────────────────────────────────

function defaultGitImpl(args) {
  const timeout = Number(process.env.PRISM_CODEX_NEWFILE_GIT_TIMEOUT_MS) || DEFAULT_GIT_TIMEOUT_MS;
  return execFileSync("git", args, {
    cwd: ROOT, encoding: "utf8", timeout, maxBuffer: 64 * 1024 * 1024,
    windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  });
}

/**
 * Deterministic per-file syntax check.
 *   .mjs/.cjs/.js  -> `node --check`        (V8 parser, exact, instant)
 *   .ts/.tsx/.jsx  -> esbuild .transform()  (parser-only, no type-check, fast)
 * Returns { ok, error|null, skipped, reason }. `skipped:true` (checker
 * genuinely unavailable) is a CAVEAT, never a blocker — R12 honest, no
 * false-block on tool absence.
 */
export async function defaultSyntaxCheck(absFile, ext, deps = {}) {
  const e = ext.toLowerCase();
  if (e === ".mjs" || e === ".cjs" || e === ".js") {
    const runNodeCheck = deps.runNodeCheck ?? ((f) =>
      execFileSync(process.execPath, ["--check", f], {
        encoding: "utf8", timeout: 30_000, windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      }));
    try {
      runNodeCheck(absFile);
      return { ok: true, error: null, skipped: false };
    } catch (err) {
      const msg = String(err?.stderr || err?.message || err).trim().slice(0, 1200);
      return { ok: false, error: msg || "node --check failed", skipped: false };
    }
  }
  // TypeScript / JSX — syntax only, via esbuild's parser.
  const loadEsbuild = deps.loadEsbuild ?? (async () => {
    const candidates = [
      "esbuild",
      path.join(ROOT, "mcp-server", "node_modules", "esbuild", "lib", "main.js"),
      path.join(ROOT, "node_modules", "esbuild", "lib", "main.js"),
    ];
    for (const c of candidates) {
      try { return await import(c); } catch { /* try next */ }
    }
    return null;
  });
  let esbuild;
  try { esbuild = await loadEsbuild(); } catch { esbuild = null; }
  if (!esbuild || typeof esbuild.transform !== "function") {
    return { ok: false, error: null, skipped: true, reason: "esbuild unresolvable — could not syntax-verify (NOT a block)" };
  }
  let code;
  try { code = fs.readFileSync(absFile, "utf8"); }
  catch (err) { return { ok: false, error: null, skipped: true, reason: `unreadable: ${String(err?.message || err).slice(0, 200)}` }; }
  const loader = e === ".tsx" ? "tsx" : e === ".jsx" ? "jsx" : "ts";
  try {
    await esbuild.transform(code, { loader, sourcefile: path.basename(absFile) });
    return { ok: true, error: null, skipped: false };
  } catch (err) {
    const errs = Array.isArray(err?.errors) && err.errors.length
      ? err.errors.map((x) => {
          const loc = x.location ? `:${x.location.line}:${x.location.column}` : "";
          return `${path.basename(absFile)}${loc} ${x.text}`;
        }).join("; ")
      : String(err?.message || err);
    return { ok: false, error: errs.slice(0, 1200), skipped: false };
  }
}

// ─── core orchestration (all deps injectable) ─────────────────────────────

/**
 * @param {object} opts
 *   dryRun         — do not append to the system-viz queue
 *   sessionBase    — optional git ref; when set, files added since it are
 *                    included via `git diff --diff-filter=A`
 *   gitImpl        — (args:string[]) => string  (default: git subprocess)
 *   syntaxCheck    — (absFile, ext, deps) => Promise<{ok,error,skipped,reason}>
 *   codexImpl      — () => Promise<{verdict,blockers,notes,skipped}>  (default: runCodexReview('diff'))
 *   inferImpl      — (name, opts) => {dispatcher,confidence,reason}   (default: seed-ghost inferDispatcher)
 *   stageNodeImpl  — (node) => void   (default: appendQueue to add-node queue)
 *   buildNodeImpl  — (args) => node   (default: system-viz-add-node buildNodeEntry)
 *   wiredMap       — optional precomputed engine→dispatcher map for sibling fallback
 *   maxFiles       — cap (default env or 50)
 */
export async function runOrchestration(opts = {}) {
  const result = {
    ok: true,
    disabled: false,
    newFiles: [],
    cappedAt: null,
    syntaxBlockers: [],   // [{ file, error }] — the ONLY thing the hook blocks on
    codex: { verdict: "skipped", notes: "", blockers: "" },
    stagedNodes: [],      // [{ id, label, engine, proposed_wiring, confidence, reason }]
    ghostWires: [],       // [{ from, to, confidence, reason }]
    caveats: [],          // loud, advisory — never block
    ranAt: new Date().toISOString(),
  };

  if (String(process.env.PRISM_CODEX_NEWFILE_DISABLE || "") === "1") {
    result.disabled = true;
    result.caveats.push("pipeline disabled (PRISM_CODEX_NEWFILE_DISABLE=1)");
    return result;
  }

  const gitImpl = opts.gitImpl ?? defaultGitImpl;
  const syntaxCheck = opts.syntaxCheck ?? defaultSyntaxCheck;
  const maxFiles = Number(opts.maxFiles)
    || Number(process.env.PRISM_CODEX_NEWFILE_MAX_FILES)
    || DEFAULT_MAX_FILES;

  // 1) detect session-new code files (fail-OPEN — cannot determine ≠ block)
  let candidates = [];
  try {
    const porcelain = gitImpl(["status", "--porcelain", "--untracked-files=all"]);
    candidates = parseNewFilesFromPorcelain(porcelain);
    if (opts.sessionBase && /^[A-Za-z0-9._/-]+$/.test(opts.sessionBase)) {
      try {
        const added = gitImpl(["diff", "--name-only", "--diff-filter=A", `${opts.sessionBase}`]);
        for (const l of added.split(/\r?\n/)) { const t = l.trim(); if (t) candidates.push(t); }
      } catch (e) {
        result.caveats.push(`session-base diff failed (advisory): ${String(e?.message || e).slice(0, 160)}`);
      }
    }
  } catch (e) {
    result.caveats.push(`could not enumerate new files via git (advisory, NOT a block): ${String(e?.message || e).slice(0, 200)}`);
    return result; // fail-open: unknown ≠ syntax error
  }

  let files = [...new Set(candidates)]
    .filter(isReviewablePath)
    .filter((p) => { try { return fs.existsSync(path.join(ROOT, p)); } catch { return false; } });

  if (files.length > maxFiles) {
    result.cappedAt = maxFiles;
    result.caveats.push(`new code files (${files.length}) exceed cap ${maxFiles}; reviewing first ${maxFiles}`);
    files = files.slice(0, maxFiles);
  }
  result.newFiles = files;
  if (files.length === 0) return result; // fast approve — no Codex spawn

  // 2) Step A — deterministic per-file syntax HARD-GATE.
  // Sequential by design: this host runs near the commit-memory ceiling
  // (CLAUDE.md fleet-memory notes); fanning 50 esbuild.transform() calls in
  // parallel would spike RSS. Each check is fast; total stays well-bounded.
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    const ext = path.extname(rel).toLowerCase();
    let r;
    try { r = await syntaxCheck(abs, ext); }
    catch (e) { r = { ok: false, error: null, skipped: true, reason: `checker threw: ${String(e?.message || e).slice(0, 200)}` }; }
    if (r.skipped) {
      result.caveats.push(`syntax not verified for ${rel}: ${r.reason || "checker unavailable"}`);
    } else if (!r.ok) {
      result.syntaxBlockers.push({ file: rel, error: r.error || "syntax error" });
    }
  }
  result.ok = result.syntaxBlockers.length === 0;

  // 3) Step B — advisory Codex line-by-line arm (ONE pass; never blocks)
  const codexOff = String(process.env.PRISM_CODEX_NEWFILE_CODEX_OFF || "") === "1";
  if (codexOff) {
    result.codex = { verdict: "skipped", notes: "Codex step disabled (PRISM_CODEX_NEWFILE_CODEX_OFF=1)", blockers: "" };
  } else {
    const codexImpl = opts.codexImpl ?? (async () => {
      const mod = await import("./scrutiny-3way.mjs");
      const instructions = [
        "You are a strict line-by-line code reviewer for the PRISM manufacturing-intelligence platform.",
        "Focus on the NEW files added this session (uncommitted). For EACH new file, scan EVERY line for:",
        "  1. syntax / parse errors the build would reject,",
        "  2. obvious logic bugs, off-by-one, swapped args, unhandled rejections,",
        "  3. inlined physics/Kienzle/Taylor constants (must import from src/physics/constants.ts),",
        "  4. stub/placeholder returns, empty catches, TODO/FIXME.",
        "New files this session:",
        ...files.map((f) => `  - ${f}`),
        "Reply with exactly one first line: 'VERDICT: PASS' or 'VERDICT: FAIL' then bullet findings.",
      ].join("\n");
      const timeoutMs = Number(process.env.PRISM_CODEX_NEWFILE_TIMEOUT_MS) || DEFAULT_CODEX_TIMEOUT_MS;
      return mod.runCodexReview("diff", { timeoutMs, instructions });
    });
    try {
      const cx = await codexImpl();
      result.codex = {
        verdict: cx?.verdict || "skipped",
        notes: String(cx?.notes || "").slice(0, 4000),
        blockers: String(cx?.blockers || "").slice(0, 4000),
      };
    } catch (e) {
      // Advisory by construction — a Codex failure is a caveat, never a block.
      result.codex = { verdict: "skipped", notes: `codex arm failed (advisory): ${String(e?.message || e).slice(0, 300)}`, blockers: "" };
      result.caveats.push("Codex advisory arm unavailable this session (skipped, not a block)");
    }
  }

  // 4) + 5) Step C/D — stage system-viz node + ghost-wire hunt (engines only)
  const engineFiles = files.filter(isEngineFile);
  if (engineFiles.length) {
    let buildNodeImpl = opts.buildNodeImpl;
    let stageNodeImpl = opts.stageNodeImpl;
    let inferImpl = opts.inferImpl;
    let minConf = 0.5;
    let wiredMap = opts.wiredMap;
    if (!buildNodeImpl || !stageNodeImpl || !inferImpl) {
      try {
        const sv = await import("../../scripts/system-viz-add-node.mjs");
        const sg = await import("../../scripts/seed-ghost-from-unwired.mjs");
        buildNodeImpl = buildNodeImpl ?? ((a) => sv.buildNodeEntry(a));
        stageNodeImpl = stageNodeImpl ?? ((n) => sv.appendQueue(sv.queuePath(), n));
        inferImpl = inferImpl ?? ((name, o) => sg.inferDispatcher(name, o));
        if (typeof sg.MIN_CONFIDENCE === "number") minConf = sg.MIN_CONFIDENCE;
        // Best-effort sibling-prefix map (closes the keyword UNKNOWN tail).
        if (!wiredMap) {
          try {
            const wm = await import("../../scripts/lib/wired-engine-mapper.mjs");
            if (typeof wm.buildEngineDispatcherMap === "function") {
              wiredMap = wm.buildEngineDispatcherMap(
                path.join(ROOT, "mcp-server", "src", "engines"),
                path.join(ROOT, "mcp-server", "src", "tools", "dispatchers"),
              );
            }
          } catch { /* keyword-only inference is acceptable */ }
        }
      } catch (e) {
        result.caveats.push(`system-viz node staging unavailable (advisory): ${String(e?.message || e).slice(0, 200)}`);
      }
    }
    if (buildNodeImpl && stageNodeImpl && inferImpl) {
      for (const rel of engineFiles) {
        try {
          const name = deriveEngineName(rel);
          const inf = inferImpl(name, wiredMap ? { wiredMap } : {}) || { dispatcher: "UNKNOWN", confidence: 0, reason: "no inference" };
          const wired = inf.dispatcher && inf.dispatcher !== "UNKNOWN" && inf.confidence >= minConf;
          const node = buildNodeImpl({
            label: name,
            layer: "L5",
            engine: true,
            id: `engine.${name.toLowerCase()}`,
            source: "codex-newfile-review",
            info: wired
              ? `New engine reviewed ${result.ranAt} — proposed wiring: ${inf.dispatcher} (conf ${Number(inf.confidence).toFixed(2)}; ${inf.reason})`
              : `New engine reviewed — wiring UNKNOWN (conf ${Number(inf.confidence || 0).toFixed(2)}) — manual review`,
          });
          // Attach ghost-wire metadata (same field set seed-ghost L13 nodes
          // carry; the seed-ghost-from-unwired regen stage materializes the
          // L13 ghost + proposed-wire edge — we do NOT mutate the live graph).
          node.proposed_wiring = inf.dispatcher;
          node.confidence = Number(inf.confidence) || 0;
          node.reason = inf.reason || "";
          node.proposed_by = "codex-newfile-review";
          node.proposed_at = result.ranAt;
          if (!opts.dryRun) stageNodeImpl(node);
          result.stagedNodes.push({
            id: node.id, label: name, file: rel,
            proposed_wiring: inf.dispatcher, confidence: node.confidence, reason: node.reason,
            staged: !opts.dryRun,
          });
          if (wired) {
            result.ghostWires.push({
              from: `ghost.unwired.${name}`,
              to: `dispatcher.${inf.dispatcher}`,
              confidence: node.confidence, reason: inf.reason,
            });
          } else {
            result.caveats.push(`ghost-wire UNKNOWN for new engine ${name} — manual dispatcher review needed`);
          }
        } catch (e) {
          result.caveats.push(`could not stage node for ${rel}: ${String(e?.message || e).slice(0, 200)}`);
        }
      }
    }
  }

  return result;
}

// ─── CLI ──────────────────────────────────────────────────────────────────

function renderHuman(r) {
  const L = [];
  L.push(`codex-newfile-review — ${r.ranAt}`);
  if (r.disabled) { L.push("DISABLED (PRISM_CODEX_NEWFILE_DISABLE=1)"); return L.join("\n"); }
  L.push(`new code files: ${r.newFiles.length}${r.cappedAt ? ` (capped ${r.cappedAt})` : ""}`);
  if (r.syntaxBlockers.length) {
    L.push(`SYNTAX BLOCKERS (${r.syntaxBlockers.length}) — HARD GATE:`);
    for (const b of r.syntaxBlockers) L.push(`  ✗ ${b.file}\n    ${b.error}`);
  } else {
    L.push("syntax: all new files parse clean ✓");
  }
  L.push(`codex (advisory): ${r.codex.verdict}`);
  if (r.stagedNodes.length) {
    L.push(`system-viz nodes staged (${r.stagedNodes.length}):`);
    for (const n of r.stagedNodes) L.push(`  • ${n.id} → ${n.proposed_wiring} (conf ${n.confidence}) ${n.staged ? "" : "[dry-run]"}`);
  }
  if (r.ghostWires.length) {
    L.push(`ghost-wire proposals (${r.ghostWires.length}):`);
    for (const g of r.ghostWires) L.push(`  ⇢ ${g.from} → ${g.to} (conf ${g.confidence})`);
  }
  for (const c of r.caveats) L.push(`  ⚠ ${c}`);
  return L.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let r;
  try {
    r = await runOrchestration({ dryRun: args.dryRun, sessionBase: args.sessionBase });
  } catch (e) {
    const fail = { ok: false, error: String(e?.message || e), syntaxBlockers: [], caveats: ["internal error"] };
    process.stdout.write(args.json ? JSON.stringify(fail) + "\n" : `codex-newfile-review: internal error: ${fail.error}\n`);
    process.exit(1);
  }
  process.stdout.write(args.json ? JSON.stringify(r) + "\n" : renderHuman(r) + "\n");
  if (args.strict && r.syntaxBlockers.length) process.exit(2);
  process.exit(0);
}

// Run only when invoked directly (importable for tests without side effects).
const invokedDirectly = (() => {
  try { return fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || ""); }
  catch { return false; }
})();
if (invokedDirectly) {
  main().catch((e) => {
    process.stderr.write(`codex-newfile-review: fatal: ${String(e?.stack || e)}\n`);
    process.exit(1);
  });
}
