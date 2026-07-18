#!/usr/bin/env node
/**
 * docker-scout.mjs -- read-only Docker Scout wrapper (DOCKER-BUSINESS-MS0/U-DOCKER-SCOUT-WIRE,
 * slot:alpha 2026-06-15).
 *
 * Operator directive (2026-06-15): "utilize the Docker Business subscription further". Docker Scout
 * (included in Business) does SBOM + CVE + policy analysis of images, but PRISM has it INSTALLED yet
 * UN-ENROLLED (verified: `docker scout config` -> "Configuration empty"; not logged in). This wires
 * Scout so the moment the operator enrolls (`docker login` + `docker scout config organization <org>`),
 * supply-chain scanning of the PRISM compose-stack images goes live -- a ready-on-enroll lever, the
 * same fail-loud/inert-until-credentialed pattern as the OpenRouter cloud tier.
 *
 * READ-ONLY by construction: shells out only to NON-mutating `docker scout` subcommands
 * (config[show] / cves / quickview / recommendations / policy). NEVER `enroll` / `config organization`
 * / `config --unset` -- enrollment is an operator action, intentionally out of scope (mirrors
 * docker-mcp.mjs's read-only discipline; [[feedback_never_delete_only_disable]]).
 *
 * Modes:
 *   config              show the current Scout org config (runnable now; reports enrolled y/n)
 *   images              list the scannable PRISM stack images (from running containers)
 *   quickview <image>   compact CVE overview of one image
 *   cves <image>        full CVE list of one image
 *   recommendations <image>   base-image / remediation suggestions
 *   scan-all            quickview every running PRISM image -> JSONL report under state/shared/scout-reports/
 *   policy              org policy list
 *
 * Flags: --json · --timeout <ms> (default 120000) · --severity <c,h,m,l> (cves/quickview)
 *
 * Exit codes: 0 ok · 2 usage · 3 infra (docker/scout unavailable, or NOT enrolled -> actionable hint)
 *
 * FAIL-LOUD (R12): every failure path prints an explicit reason; not-enrolled prints the exact 2
 * commands to enroll. CVE-output PARSING is best-effort (Scout's table/json format varies by version,
 * and this was authored pre-enrollment so the live format is unverified) -- the RAW output is always
 * captured so nothing is silently lost.
 *
 * Design: pure functions (exported, unit-tested) + a thin impure shell (exec injected). ASCII-only.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { resolve, join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

const execFileAsync = promisify(execFile);
const HERE = fileURLToPath(import.meta.url);

export const READ_ONLY_MODES = new Set(["config", "images", "quickview", "cves", "recommendations", "scan-all", "policy"]);
export const IMAGE_MODES = new Set(["quickview", "cves", "recommendations"]);
export const DEFAULT_TIMEOUT_MS = 120000;
export const MIN_TIMEOUT_MS = 1000;
/** Scout subcommands this wrapper will run -- a hard allowlist (read-only; no mutation possible). */
export const ALLOWED_SUBCOMMANDS = Object.freeze(["config", "cves", "quickview", "recommendations", "policy"]);

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit tests)
// ---------------------------------------------------------------------------

/** Parse argv (slice after `node docker-scout.mjs`). { mode, image, flags } | { error }. */
export function parseArgs(argv) {
  const flags = { json: false, timeout: DEFAULT_TIMEOUT_MS, severity: "" };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") flags.json = true;
    else if (a === "--severity") {
      const v = argv[++i];
      if (v === undefined) return { error: "--severity needs a value (e.g. critical,high)" };
      flags.severity = v;
    } else if (a === "--timeout") {
      const n = Number.parseInt(argv[++i], 10);
      if (!Number.isFinite(n) || n < MIN_TIMEOUT_MS) return { error: `--timeout needs an integer >= ${MIN_TIMEOUT_MS} (ms)` };
      flags.timeout = n;
    } else if (a.startsWith("--")) {
      return { error: `unknown flag: ${a}` };
    } else positional.push(a);
  }
  const mode = positional.shift();
  if (!mode) return { error: "no mode given" };
  if (!READ_ONLY_MODES.has(mode)) return { error: `unknown mode: ${mode}` };
  const image = positional.join(" ").trim();
  if (IMAGE_MODES.has(mode) && !image) return { error: `mode '${mode}' needs an image (e.g. prism-server:local)` };
  return { mode, image, flags };
}

/**
 * Pure: is Scout enrolled to an org? `docker scout config` prints "Configuration empty" when not
 * configured, or an `organization: <slug>` line when it is. Returns false on empty/missing/blank.
 */
export function isScoutConfigured(configOutput) {
  const s = String(configOutput == null ? "" : configOutput);
  if (!s.trim()) return false;
  if (/configuration empty/i.test(s)) return false;
  return /organization/i.test(s);
}

/** Pure: the exact operator commands to enroll Scout (the ready-on-enroll gate message). */
export function enrollHint() {
  return [
    "Docker Scout is not enrolled -- the scan is inert until you enroll (one-time, ~2 min):",
    "  docker login -u <user>                          # Business PAT from hub.docker.com -> Settings -> Security",
    "  docker scout config organization <your-org>     # your Docker Business org slug",
    "then re-run. Scout is included in Docker Business (no extra spend).",
  ].join("\n");
}

/**
 * Pure: build the argv for a read-only `docker scout` invocation. Throws on a non-allowlisted
 * subcommand (defense-in-depth: this wrapper can NEVER shell a mutating scout command).
 */
export function buildScoutArgs(subcommand, { image = "", severity = "", json = false } = {}) {
  if (!ALLOWED_SUBCOMMANDS.includes(subcommand)) {
    throw new Error(`refusing non-allowlisted scout subcommand: ${subcommand}`);
  }
  const args = ["scout", subcommand];
  if (severity && (subcommand === "cves" || subcommand === "quickview")) args.push("--only-severity", severity);
  if (json && (subcommand === "cves" || subcommand === "quickview")) args.push("--format", "sarif");
  if (image) args.push(image);
  return args;
}

/** Pure: deduped, non-empty running image names from `docker ps --format {{.Image}}` output. */
export function parseRunningImages(psOutput) {
  const seen = new Set();
  for (const line of String(psOutput == null ? "" : psOutput).split(/\r?\n/)) {
    const img = line.trim();
    if (img && !img.startsWith("REPOSITORY")) seen.add(img);
  }
  return [...seen];
}

/**
 * Pure (best-effort): extract per-severity CVE counts from a `docker scout quickview` text table.
 * Scout prints lines like "    0C     2H     5M     1L" or "Critical 0  High 2 ...". Returns
 * { critical, high, medium, low } with any unparsed severity 0. The RAW text is the source of
 * truth (this is a convenience summary; format varies by Scout version -- R12).
 */
export function parseQuickviewSeverities(text) {
  const s = String(text == null ? "" : text);
  const out = { critical: 0, high: 0, medium: 0, low: 0 };
  // Pattern A: explicit words ("Critical 3", "High: 2")
  const word = (label) => {
    const m = s.match(new RegExp(`${label}\\s*:?\\s*(\\d+)`, "i"));
    return m ? Number(m[1]) : null;
  };
  out.critical = word("critical") ?? out.critical;
  out.high = word("high") ?? out.high;
  out.medium = word("medium") ?? out.medium;
  out.low = word("low") ?? out.low;
  // Pattern B: compact "<n>C <n>H <n>M <n>L" (only fills a severity Pattern A missed)
  const compact = (suffix, key) => {
    if (word(key === "critical" ? "critical" : key === "high" ? "high" : key === "medium" ? "medium" : "low") != null) return;
    const m = s.match(new RegExp(`(\\d+)\\s*${suffix}\\b`));
    if (m) out[key] = Number(m[1]);
  };
  compact("C", "critical"); compact("H", "high"); compact("M", "medium"); compact("L", "low");
  return out;
}

// ---------------------------------------------------------------------------
// Impure shell (exec injected so the pure path stays unit-testable)
// ---------------------------------------------------------------------------

/**
 * Run a read-only `docker scout` subcommand. Returns { ok, text } | { ok:false, error }. NEVER
 * throws. A non-zero exit with output (Scout exits non-zero when CVEs are found) is still ok:true --
 * the caller decides; only a true exec failure (docker/scout missing) is ok:false.
 */
export async function runScout(args, { execImpl = execFileAsync, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  try {
    const { stdout } = await execImpl("docker", args, { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 });
    return { ok: true, text: String(stdout || "") };
  } catch (e) {
    // Scout exits non-zero when policy/CVE thresholds are exceeded but still prints a useful report.
    // Carry stderr + exit code so a caller can DISTINGUISH "CVEs found" from a real failure that
    // happened to write to stdout (scrutiny P2 defense-in-depth -- the raw text alone is ambiguous).
    if (e && typeof e.stdout === "string" && e.stdout.trim()) {
      return { ok: true, text: e.stdout, exitNonZero: true, code: e.code ?? null, stderr: String(e.stderr || "").slice(0, 500) };
    }
    const why = e && (e.code === "ENOENT")
      ? "docker not found on PATH (is Docker Desktop running?)"
      : `docker scout failed: ${e && e.message ? String(e.message).slice(0, 200) : e}`;
    return { ok: false, error: why };
  }
}

/** Determine enrollment by running `docker scout config`. Returns { ok, configured, text } | { ok:false, error }. */
export async function checkEnrolled(deps = {}) {
  const r = await runScout(["scout", "config"], deps);
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, configured: isScoutConfigured(r.text), text: r.text };
}

/** List running PRISM images via `docker ps`. Returns { ok, images } | { ok:false, error }. */
export async function listRunningImages({ execImpl = execFileAsync, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  try {
    const { stdout } = await execImpl("docker", ["ps", "--format", "{{.Image}}"], { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 });
    return { ok: true, images: parseRunningImages(stdout) };
  } catch (e) {
    return { ok: false, error: `docker ps failed: ${e && e.message ? e.message : e}` };
  }
}

const REPORT_DIR = ["state", "shared", "scout-reports"];

/**
 * Execute one request. All I/O injected -> unit-testable. Returns { exitCode, output }.
 * The not-enrolled gate is checked before any image scan (modes that need Scout features).
 */
export async function runRequest(parsed, deps = {}) {
  const { mode, image, flags } = parsed;
  const scoutDeps = { execImpl: deps.execImpl, timeoutMs: flags.timeout };
  const run = deps.runScout || runScout;
  const enrolledFn = deps.checkEnrolled || checkEnrolled;

  // ---- config: always runnable; reports enrolled y/n ----
  if (mode === "config") {
    const e = await enrolledFn(scoutDeps);
    if (!e.ok) return { exitCode: 3, output: `[docker-scout] ${e.error}` };
    const out = flags.json
      ? JSON.stringify({ mode, configured: e.configured, raw: e.text.trim() }, null, 2)
      : `Scout enrolled: ${e.configured ? "YES" : "NO"}\n${e.text.trim()}${e.configured ? "" : "\n\n" + enrollHint()}`;
    return { exitCode: e.configured ? 0 : 3, output: out };
  }

  // ---- images: list scannable PRISM stack images (no Scout enrollment needed) ----
  if (mode === "images") {
    const li = await (deps.listRunningImages || listRunningImages)(scoutDeps);
    if (!li.ok) return { exitCode: 3, output: `[docker-scout] ${li.error}` };
    const out = flags.json ? JSON.stringify({ mode, images: li.images }, null, 2)
      : (li.images.length ? `Running PRISM stack images (${li.images.length}):\n${li.images.map((i) => `  - ${i}`).join("\n")}` : "(no running containers)");
    return { exitCode: 0, output: out };
  }

  // ---- all Scout-feature modes are GATED on enrollment (fail loud, ready-on-enroll) ----
  const e = await enrolledFn(scoutDeps);
  if (!e.ok) return { exitCode: 3, output: `[docker-scout] ${e.error}` };
  if (!e.configured) return { exitCode: 3, output: `[docker-scout] ${enrollHint()}` };

  if (mode === "policy") {
    const r = await run(buildScoutArgs("policy"), scoutDeps);
    return r.ok ? { exitCode: 0, output: r.text } : { exitCode: 3, output: `[docker-scout] ${r.error}` };
  }

  if (IMAGE_MODES.has(mode)) {
    const r = await run(buildScoutArgs(mode, { image, severity: flags.severity, json: flags.json }), scoutDeps);
    if (!r.ok) return { exitCode: 3, output: `[docker-scout] ${r.error}` };
    if (flags.json && mode !== "recommendations") return { exitCode: 0, output: r.text };
    const sev = mode === "quickview" ? parseQuickviewSeverities(r.text) : null;
    const head = sev ? `severities: ${sev.critical}C / ${sev.high}H / ${sev.medium}M / ${sev.low}L\n` : "";
    return { exitCode: 0, output: head + r.text };
  }

  // ---- scan-all: quickview every running image -> JSONL report ----
  if (mode === "scan-all") {
    const li = await (deps.listRunningImages || listRunningImages)(scoutDeps);
    if (!li.ok) return { exitCode: 3, output: `[docker-scout] ${li.error}` };
    const rows = [];
    for (const img of li.images) {
      // eslint-disable-next-line no-await-in-loop
      const r = await run(buildScoutArgs("quickview", { image: img, severity: flags.severity }), scoutDeps);
      rows.push({ image: img, ok: r.ok, severities: r.ok ? parseQuickviewSeverities(r.text) : null, error: r.ok ? null : r.error });
    }
    const writeReport = deps.writeReport || defaultWriteReport;
    const reportPath = writeReport(rows, deps);
    const out = flags.json ? JSON.stringify({ mode, scanned: rows.length, report: reportPath, rows }, null, 2)
      : `scanned ${rows.length} image(s) -> ${reportPath}\n` + rows.map((r) => `  ${r.image}: ${r.severities ? `${r.severities.critical}C/${r.severities.high}H` : `ERROR ${r.error}`}`).join("\n");
    return { exitCode: 0, output: out };
  }

  return { exitCode: 2, output: `[docker-scout] unhandled mode: ${mode}` };
}

/**
 * Write the scan-all JSONL report. Returns the path. Best-effort dir create. Default stamp is the
 * UTC date (YYYY-MM-DD) so weekly/scheduled scans ACCRETE a dated ledger rather than overwriting one
 * `latest` file (scrutiny P2 -- the assessment specified a JSONL ledger, not a single rolling file).
 */
function defaultWriteReport(rows, { root = resolve(HERE, "..", ".."), stamp = new Date().toISOString().slice(0, 10) } = {}) {
  const dir = join(root, ...REPORT_DIR);
  try { mkdirSync(dir, { recursive: true }); } catch { /* best-effort */ }
  const path = join(dir, `scout-scan-${stamp}.jsonl`);
  try { writeFileSync(path, rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8"); } catch { /* report is advisory */ }
  return path;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const USAGE = `docker-scout -- read-only Docker Scout wrapper (CVE/SBOM/policy; ready-on-enroll)

  node scripts/docker-scout.mjs config                  show org enrollment status
  node scripts/docker-scout.mjs images                  list running PRISM stack images
  node scripts/docker-scout.mjs quickview <image>       compact CVE overview
  node scripts/docker-scout.mjs cves <image>            full CVE list
  node scripts/docker-scout.mjs recommendations <image> base-image remediation
  node scripts/docker-scout.mjs scan-all                quickview every running image -> JSONL report
  node scripts/docker-scout.mjs policy                  org policy list

flags: --json · --timeout <ms> · --severity <critical,high,medium,low>

Needs Docker Business enrollment: docker login + docker scout config organization <org>.`;

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.error) { console.error(`[docker-scout] ${parsed.error}\n\n${USAGE}`); process.exit(2); }
  const { exitCode, output } = await runRequest(parsed);
  (exitCode === 0 ? console.log : console.error)(output);
  process.exit(exitCode);
}

const INVOKED_DIRECTLY = process.argv[1] && resolve(process.argv[1]) === resolve(HERE);
if (INVOKED_DIRECTLY) {
  void main().catch((e) => { console.error(`[docker-scout] fatal: ${e && e.stack ? e.stack : e}`); process.exit(1); });
}
