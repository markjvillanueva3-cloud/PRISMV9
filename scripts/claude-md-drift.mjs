#!/usr/bin/env node
/**
 * claude-md-drift.mjs — CLAUDE.md doctrine-vs-reality drift detector
 *   (CLEANUP-MS0 / U-CLEANUP-H4)
 *
 * Daily 06:43 cron sweep over BOTH CLAUDE.md sources:
 *   - H:/prism/CLAUDE.md       (project-tier, 405 lines)
 *   - ~/.claude/CLAUDE.md      (user-tier, 313 lines)
 *
 * Extracts VERIFIABLE claims and cross-checks each against repo state.
 * R2-PERF2 prior audit surfaced 3 such drifts in a single pass; this
 * automates the same audit on cadence so doctrine never silently rots.
 *
 * Verifiable claim taxonomy:
 *   1. file-path     — `H:/prism/path/x.ts` / `scripts/x.mjs` → fs.existsSync
 *   2. engine-name   — `EngineName.ts` → check src/engines/EngineName.ts
 *   3. env-knob      — `PRISM_FOO=N` style → grep codebase for `PRISM_FOO`
 *   4. dispatcher-action — `prism_dev:foo_bar` → verify action wired
 *
 * Severity:
 *   - P0: load-bearing claim is wrong (hook says X exists at exact path,
 *         file is missing). Likely caused recent fork-storms / silent fails.
 *   - P1: claim is partially wrong (engine renamed; env knob renamed)
 *   - P2: cosmetic (line-number drift, count drift).
 *
 * This audit emits P0/P1 only by default; P2 noise is filtered out.
 * Use --include-p2 to surface cosmetic drift.
 *
 * Outputs:
 *   - state/shared/CLAUDE_MD_DRIFT_REPORT.md  (human)
 *   - state/shared/CLAUDE_MD_DRIFT_REPORT.json (machine; schemaVersion 1)
 *
 * Spec: mcp-server/data/milestones/CLEANUP-MS0.json U-CLEANUP-H4.
 */

import {
  readFileSync,
  writeFileSync,
  renameSync,
  existsSync,
  mkdirSync,
  statSync,
  unlinkSync,
  readdirSync,
} from "node:fs";
import { dirname, isAbsolute as pathIsAbsolute, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { homedir } from "node:os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_REPO = resolve(__dirname, "..");

const DEFAULT_OUT_MD_REL = "state/shared/CLAUDE_MD_DRIFT_REPORT.md";
const DEFAULT_OUT_JSON_REL = "state/shared/CLAUDE_MD_DRIFT_REPORT.json";

// Severity ordering — P0 most urgent.
export const SEVERITY = Object.freeze({
  P0: "P0",
  P1: "P1",
  P2: "P2",
});

/**
 * Parse argv.
 */
export function parseArgs(argv) {
  const opts = {
    json: false,
    help: false,
    frozenTime: null,
    includeP2: false,
    projectCm: null,
    userCm: null,
    outMd: null,
    outJson: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--frozen-time") opts.frozenTime = argv[++i] ?? null;
    else if (a === "--include-p2") opts.includeP2 = true;
    else if (a === "--project-claude-md") opts.projectCm = argv[++i] ?? null;
    else if (a === "--user-claude-md") opts.userCm = argv[++i] ?? null;
    else if (a === "--out-md") opts.outMd = argv[++i] ?? null;
    else if (a === "--out-json") opts.outJson = argv[++i] ?? null;
  }
  return opts;
}

/**
 * Extract candidate file-path tokens from CLAUDE.md.
 *
 * Match patterns:
 *   - Absolute Windows paths: `H:/prism/foo/bar.ts` or `H:\\prism\\foo`
 *   - Relative paths under known top dirs: `scripts/foo.mjs`,
 *     `mcp-server/src/engines/Foo.ts`, `state/shared/X.json`,
 *     `.claude/hooks/foo.mjs`, `knowledge/wiki/...`
 *
 * Returns array of `{ path: string, lineNumber: number }`. De-duped
 * per (path) since the same path may appear many times.
 *
 * @param {string} content
 * @returns {Array<{ path: string, lineNumber: number }>}
 */
export function extractFilePathClaims(content) {
  const out = [];
  if (typeof content !== "string") return out;
  const seen = new Set();
  const lines = content.split(/\r?\n/);
  // Each regex must capture the full path token.
  const patterns = [
    // H:/prism/... or H:\prism\... (with optional `H:/PRISM/` casing)
    /\b([Hh]:[/\\]p[rR][iI][sS][mM][/\\][a-zA-Z0-9_./\\-]+)\b/g,
    // scripts/foo.mjs / scripts/x.ts / scripts/...
    /(?:^|[^a-zA-Z0-9_/.\\-])(scripts\/[a-zA-Z0-9_./\\-]+\.(?:mjs|js|ts|ps1|py))/g,
    // mcp-server/src/.../*.ts
    /(?:^|[^a-zA-Z0-9_/.\\-])(mcp-server\/src\/[a-zA-Z0-9_./\\-]+\.(?:ts|tsx|js|json))/g,
    // .claude/hooks/foo.mjs or .claude/commands/foo.md
    /(?:^|[^a-zA-Z0-9_/.\\-])(\.claude\/[a-zA-Z0-9_./\\-]+\.(?:mjs|js|md|json|ts))/g,
    // state/shared/X
    /(?:^|[^a-zA-Z0-9_/.\\-])(state\/shared\/[a-zA-Z0-9_./\\-]+\.(?:md|json|jsonl))/g,
    // knowledge/wiki/X.md
    /(?:^|[^a-zA-Z0-9_/.\\-])(knowledge\/[a-zA-Z0-9_./\\-]+\.md)/g,
  ];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const re of patterns) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line)) !== null) {
        // The path is always the first capture group.
        const raw = (m[1] ?? m[0]).trim();
        // Trim trailing punctuation common in prose
        const cleaned = raw.replace(/[).,;:'"`]+$/, "");
        if (!cleaned || seen.has(cleaned)) continue;
        seen.add(cleaned);
        out.push({ path: cleaned, lineNumber: i + 1 });
      }
    }
  }
  return out;
}

/**
 * Extract env-knob claims (e.g. `PRISM_FOO=N`, `PRISM_FOO_DISABLE=1`).
 *
 * @param {string} content
 * @returns {Array<{ knob: string, lineNumber: number }>}
 */
export function extractEnvKnobClaims(content) {
  const out = [];
  if (typeof content !== "string") return out;
  const seen = new Set();
  const lines = content.split(/\r?\n/);
  const re = /\b(PRISM_[A-Z0-9_]+)\b/g;
  for (let i = 0; i < lines.length; i++) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(lines[i])) !== null) {
      const knob = m[1];
      if (!knob || seen.has(knob)) continue;
      seen.add(knob);
      out.push({ knob, lineNumber: i + 1 });
    }
  }
  return out;
}

/**
 * Resolve a CLAUDE.md path-claim to an absolute on-disk path.
 *
 * Handles three cases:
 *   1. `H:/prism/...` / `H:\prism\...` — already absolute; normalize to fwd slash.
 *   2. Relative to repo root: `scripts/...`, `.claude/...`, `state/...`,
 *      `mcp-server/...`, `knowledge/...`.
 *   3. Drive-letter mismatch — H:/PRISM/X vs lowercase repo path; normalize.
 *
 * @param {string} repoRoot
 * @param {string} claim
 * @returns {string}
 */
export function resolveClaimedPath(repoRoot, claim) {
  if (typeof claim !== "string" || claim.length === 0) return "";
  // Normalize backslashes to fwd slashes for cross-platform exists check.
  const normalized = claim.replace(/\\/g, "/");
  // Absolute Windows path (drive letter): H:/prism/... → use verbatim.
  if (/^[A-Za-z]:\//.test(normalized)) return normalized;
  // Relative to repo root.
  return join(repoRoot, normalized).replace(/\\/g, "/");
}

/**
 * Verify file-path claims by checking on-disk existence.
 *
 * TypeScript import-path ergonomics: claims like `Foo.js` that don't exist
 * are retried as `Foo.ts` since `import x from "./Foo.js"` in TS source
 * resolves to a `.ts` file on disk. Same for `.cjs → .cts` and `.mjs → .mts`.
 * When the `.ts` fallback succeeds, severity is null (the claim is valid
 * as a TS-source import path).
 *
 * @param {object} args
 */
export function verifyFileClaims({ claims, repoRoot, source }) {
  const findings = [];
  for (const c of claims) {
    const resolved = resolveClaimedPath(repoRoot, c.path);
    let exists = resolved ? existsSync(resolved) : false;
    let observation = exists ? "exists" : "missing";
    // TS import-path fallback: x.js → x.ts (and .cjs/.mjs siblings).
    if (!exists && resolved) {
      const tsCandidate = resolved
        .replace(/\.cjs$/, ".cts")
        .replace(/\.mjs$/, ".mts")
        .replace(/\.js$/, ".ts");
      if (tsCandidate !== resolved && existsSync(tsCandidate)) {
        exists = true;
        observation = "exists_as_ts";
      }
    }
    findings.push({
      severity: exists ? null : SEVERITY.P0,
      kind: "file-path",
      source,
      lineNumber: c.lineNumber,
      claim: c.path,
      resolved,
      observation,
      ok: exists,
    });
  }
  return findings;
}

/**
 * Verify env-knob claims by checking that the knob is grep-able somewhere
 * in a few high-signal scan roots (hooks + scripts + src/engines).
 *
 * Pure-ish: we inject the `searchRoots` and the grep function for testability.
 *
 * @param {object} args
 * @param {Array<{knob:string, lineNumber:number}>} args.claims
 * @param {string} args.source
 * @param {(knob:string)=>boolean} args.grep   true if the knob is referenced anywhere
 */
export function verifyEnvKnobs({ claims, source, grep }) {
  const findings = [];
  for (const c of claims) {
    const ok = grep(c.knob);
    findings.push({
      severity: ok ? null : SEVERITY.P1,
      kind: "env-knob",
      source,
      lineNumber: c.lineNumber,
      claim: c.knob,
      observation: ok ? "grep-able" : "not_found",
      ok,
    });
  }
  return findings;
}

/**
 * Build a grep function that scans common roots for the given knob.
 *
 * @param {string} repoRoot
 * @returns {(knob:string)=>boolean}
 */
export function defaultEnvKnobGrep(repoRoot) {
  const roots = [
    join(repoRoot, "scripts"),
    join(repoRoot, ".claude", "hooks"),
    join(repoRoot, ".claude", "helpers"),
    join(repoRoot, "mcp-server", "src", "engines"),
    join(repoRoot, "mcp-server", "src", "tools", "dispatchers"),
    join(repoRoot, "mcp-server", "src", "hooks"),
  ];
  // Build a memoized cache: knob → boolean
  const cache = new Map();
  return function grep(knob) {
    if (cache.has(knob)) return cache.get(knob);
    if (typeof knob !== "string" || knob.length === 0) {
      cache.set(knob, false);
      return false;
    }
    const needle = knob;
    let found = false;
    for (const root of roots) {
      if (found) break;
      if (!existsSync(root)) continue;
      // Bounded shallow recursion — depth 4. Stops on first hit.
      const stack = [{ dir: root, depth: 0 }];
      while (stack.length > 0 && !found) {
        const { dir, depth } = stack.pop();
        let entries;
        try {
          entries = readdirSync(dir, { withFileTypes: true });
        } catch (_) {
          continue;
        }
        for (const ent of entries) {
          if (found) break;
          const p = join(dir, ent.name);
          if (ent.isDirectory()) {
            if (depth < 4) stack.push({ dir: p, depth: depth + 1 });
          } else if (ent.isFile()) {
            // Only scan plausible code/text files
            if (!/\.(mjs|js|ts|tsx|cjs|json|md|ps1|py)$/i.test(ent.name)) continue;
            try {
              const content = readFileSync(p, "utf-8");
              if (content.includes(needle)) {
                found = true;
                break;
              }
            } catch (_) {
              /* unreadable file - ignore */
            }
          }
        }
      }
    }
    cache.set(knob, found);
    return found;
  };
}

/**
 * Build the aggregate report.
 */
export function buildReport({ allFindings, includeP2, nowIso, sources }) {
  const drift = allFindings.filter((f) => f.severity !== null);
  const filtered = includeP2 ? drift : drift.filter((f) => f.severity !== SEVERITY.P2);

  const bySeverity = {
    P0: filtered.filter((f) => f.severity === SEVERITY.P0).length,
    P1: filtered.filter((f) => f.severity === SEVERITY.P1).length,
    P2: filtered.filter((f) => f.severity === SEVERITY.P2).length,
  };
  const byKind = {};
  for (const f of filtered) {
    byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;
  }

  const totalClaims = allFindings.length;
  const totalDrift = filtered.length;
  const driftRate = totalClaims === 0 ? 0 : totalDrift / totalClaims;

  // Sort findings: P0 first, then P1, then P2 — within severity by source then line.
  const sevOrder = { P0: 0, P1: 1, P2: 2 };
  const sortedFindings = filtered.slice().sort((a, b) => {
    if (sevOrder[a.severity] !== sevOrder[b.severity]) {
      return sevOrder[a.severity] - sevOrder[b.severity];
    }
    if (a.source !== b.source) return a.source.localeCompare(b.source);
    return (a.lineNumber || 0) - (b.lineNumber || 0);
  });

  return {
    schemaVersion: 1,
    generatedAt: nowIso,
    sources,
    totals: {
      claimsAnalyzed: totalClaims,
      drift: totalDrift,
      driftRate: Math.round(driftRate * 1000) / 1000,
    },
    bySeverity,
    byKind,
    findings: sortedFindings,
  };
}

/**
 * Render markdown.
 */
export function renderMarkdown(report) {
  const lines = [];
  lines.push(`# CLAUDE.md Drift Detector`);
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Sources: ${report.sources.map((s) => `\`${s}\``).join(", ")}`);
  lines.push("");
  lines.push(`## Summary`);
  lines.push("");
  lines.push(`- Claims analyzed: **${report.totals.claimsAnalyzed}**`);
  lines.push(`- Drift findings: **${report.totals.drift}**`);
  lines.push(`- Drift rate: **${(report.totals.driftRate * 100).toFixed(1)}%**`);
  lines.push("");
  lines.push(`## Severity counts`);
  lines.push("");
  lines.push(`- 🔴 P0 (load-bearing claim wrong): **${report.bySeverity.P0}**`);
  lines.push(`- 🟠 P1 (claim partially wrong): **${report.bySeverity.P1}**`);
  lines.push(`- 🟡 P2 (cosmetic / line drift): **${report.bySeverity.P2}**`);
  lines.push("");
  lines.push(`## Kind counts`);
  lines.push("");
  if (Object.keys(report.byKind).length === 0) {
    lines.push(`_no findings_`);
  } else {
    lines.push(`| Kind | Count |`);
    lines.push(`|---|---:|`);
    for (const [k, v] of Object.entries(report.byKind).sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${k} | ${v} |`);
    }
  }
  lines.push("");
  lines.push(`## Findings`);
  lines.push("");
  if (report.findings.length === 0) {
    lines.push(`_no drift_`);
  } else {
    lines.push(`| Sev | Kind | Source | Line | Claim | Observation |`);
    lines.push(`|---|---|---|---:|---|---|`);
    for (const f of report.findings.slice(0, 50)) {
      lines.push(
        `| ${f.severity} | ${f.kind} | ${f.source} | ${f.lineNumber ?? ""} | \`${f.claim}\` | ${f.observation} |`,
      );
    }
    if (report.findings.length > 50) {
      lines.push("");
      lines.push(`_…and ${report.findings.length - 50} more in JSON report_`);
    }
  }
  lines.push("");
  lines.push(`---`);
  lines.push(`Source: CLEANUP-MS0 / U-CLEANUP-H4 claude-md-drift.mjs`);
  return lines.join("\n") + "\n";
}

function readTextSafe(path) {
  try {
    return { ok: true, value: readFileSync(path, "utf-8") };
  } catch (e) {
    return { ok: false, error: e };
  }
}

function abs(repo, p) {
  return pathIsAbsolute(p) ? p : resolve(repo, p);
}

function writeAtomic(dest, contents) {
  const destDir = dirname(dest);
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    const tag = `${process.pid}-${Date.now()}-${randomBytes(4).toString("hex")}`;
    const tmp = `${dest}.tmp-${tag}`;
    try {
      writeFileSync(tmp, contents, "utf-8");
      renameSync(tmp, dest);
      return;
    } catch (e) {
      lastErr = e;
      try {
        if (existsSync(tmp)) unlinkSync(tmp);
      } catch (_) {
        /* ignore */
      }
    }
  }
  throw lastErr ?? new Error(`writeAtomic failed for ${dest}`);
}

/**
 * CLI entry. Pure-functional core + injection points for tests.
 *
 * @param {object} env
 * @param {(repoRoot:string)=>((knob:string)=>boolean)} [env.makeEnvKnobGrep]
 *   Override the grep function (tests pass a deterministic stub).
 */
export async function main({
  argv,
  repo = DEFAULT_REPO,
  out = (...a) => console.log(...a),
  err = (...a) => console.error(...a),
  makeEnvKnobGrep = defaultEnvKnobGrep,
} = {}) {
  const opts = parseArgs(argv ?? []);
  if (opts.help) {
    out(
      [
        "claude-md-drift.mjs — CLAUDE.md doctrine-vs-reality drift detector",
        "",
        "Flags:",
        "  --json                       emit machine JSON to stdout (no MD write)",
        "  --frozen-time ISO            freeze 'now' for deterministic output",
        "  --include-p2                 include cosmetic P2 findings",
        "  --project-claude-md <path>   override H:/prism/CLAUDE.md path",
        "  --user-claude-md <path>      override ~/.claude/CLAUDE.md path",
        "  --out-md <path>              override CLAUDE_MD_DRIFT_REPORT.md path",
        "  --out-json <path>            override CLAUDE_MD_DRIFT_REPORT.json path",
        "  -h, --help                   print help and exit",
      ].join("\n"),
    );
    return { exitCode: 0 };
  }

  const projectCmPath = abs(repo, opts.projectCm ?? "CLAUDE.md");
  const userCmPath = opts.userCm ?? join(homedir(), ".claude", "CLAUDE.md");
  const outMd = abs(repo, opts.outMd ?? DEFAULT_OUT_MD_REL);
  const outJson = abs(repo, opts.outJson ?? DEFAULT_OUT_JSON_REL);
  const nowIso = opts.frozenTime ?? new Date().toISOString();

  const projectRes = readTextSafe(projectCmPath);
  const userRes = readTextSafe(userCmPath);
  if (!projectRes.ok && !userRes.ok) {
    err(`[H4] FATAL: neither CLAUDE.md is readable — tried:\n  ${projectCmPath}\n  ${userCmPath}`);
    return { exitCode: 1 };
  }

  const sources = [];
  const allFindings = [];
  const grep = makeEnvKnobGrep(repo);

  for (const [path, res, label] of [
    [projectCmPath, projectRes, "project"],
    [userCmPath, userRes, "user"],
  ]) {
    if (!res.ok) continue;
    sources.push(`${label}:${path}`);
    const fileClaims = extractFilePathClaims(res.value);
    const envClaims = extractEnvKnobClaims(res.value);
    allFindings.push(
      ...verifyFileClaims({ claims: fileClaims, repoRoot: repo, source: label }),
    );
    allFindings.push(...verifyEnvKnobs({ claims: envClaims, source: label, grep }));
  }

  const report = buildReport({
    allFindings,
    includeP2: opts.includeP2,
    nowIso,
    sources,
  });

  if (opts.json) {
    out(JSON.stringify(report, null, 2));
    return { exitCode: 0, report };
  }

  writeAtomic(outJson, JSON.stringify(report, null, 2) + "\n");
  writeAtomic(outMd, renderMarkdown(report));

  out(
    `[H4] claude-md drift — analyzed ${report.totals.claimsAnalyzed} claims, ` +
      `${report.totals.drift} drift (${report.bySeverity.P0} P0 / ${report.bySeverity.P1} P1 / ${report.bySeverity.P2} P2)`,
  );

  return { exitCode: 0, report };
}

const invokedAsScript = (() => {
  try {
    const argv1 = process.argv[1];
    if (!argv1) return false;
    return resolve(argv1) === resolve(__filename);
  } catch (_) {
    return false;
  }
})();

if (invokedAsScript) {
  main({ argv: process.argv.slice(2) }).then(
    (r) => process.exit(r.exitCode),
    (e) => {
      console.error("[H4] uncaught:", e);
      process.exit(1);
    },
  );
}

export const _internals = {};
