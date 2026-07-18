#!/usr/bin/env node
// tier: T3
// test-rigor-judge.mjs -- AI test-RIGOR judge CLI. The SEMANTIC layer the
// deterministic rigor floor (detectShallowCriticalTest) defers to: an LLM reads
// a TEST + its SOURCE and answers "would an assertion FAIL if the source
// regressed?". Routes Ollama (free, local) -> Hermes (managed) per the fallback
// ladder; NEVER fabricates a verdict (R12 -- fail loud if both providers fail).
//
// USAGE:
//   node scripts/test-rigor-judge.mjs <path/to/file.test.ts> [--hermes] [--model=ID] [--json]
//   node scripts/test-rigor-judge.mjs --batch [--limit=N] [--json]   # judge thin critical candidates
//
// The judge is ADVISORY tooling (no hook blocks on it). Pre-filtered batch keeps
// LLM cost bounded -- only the ~1.5% thin critical-domain tests are judged.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { resolveSutPath, buildJudgePrompt, parseJudgeResponse } from "./lib/test-rigor-judge-core.mjs";

const REPO = process.env.PRISM_REPO_ROOT || "H:/prism";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const HERMES_URL = process.env.HERMES_URL || "http://127.0.0.1:8645";
const DEFAULT_MODEL = process.env.PRISM_RIGOR_JUDGE_MODEL || "qwen2.5-coder:32b";
const LLM_TIMEOUT_MS = Number(process.env.PRISM_RIGOR_JUDGE_TIMEOUT_MS || 120000);
const DEFAULT_BATCH_LIMIT = 10;
const TEST_RE = /\.(test|spec)\.[cm]?[jt]sx?$/i;
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "coverage", ".claude"]);

function readSafe(p) { try { return fs.readFileSync(p, "utf8"); } catch { return null; } }

async function callOllama(prompt, model) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false, format: "json", options: { temperature: 0 } }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`ollama HTTP ${res.status}`);
    const j = await res.json();
    return j.response || "";
  } finally { clearTimeout(timer); }
}

async function hermesModelId() {
  try {
    // Own timeout -- a TCP-reachable-but-silent Hermes must not hang here (the
    // callHermes AbortController only covers the chat call, not this lookup).
    const res = await fetch(`${HERMES_URL}/v1/models`, { signal: AbortSignal.timeout(LLM_TIMEOUT_MS) });
    if (!res.ok) return null;
    const j = await res.json();
    return (j && j.data && j.data[0] && j.data[0].id) || null;
  } catch { return null; }
}

async function callHermes(prompt, model) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LLM_TIMEOUT_MS);
  try {
    const m = model || (await hermesModelId());
    const res = await fetch(`${HERMES_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: m, messages: [{ role: "user", content: prompt }], temperature: 0 }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`hermes HTTP ${res.status}`);
    const j = await res.json();
    return (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "";
  } finally { clearTimeout(timer); }
}

/** Ollama first (free), Hermes fallback. Returns { text, via } or throws (R12). */
export async function callJudge(prompt, opts = {}, callers = { ollama: callOllama, hermes: callHermes }) {
  // `callers` is injectable so the fallback ladder is R9-testable without network
  // (defaults to the real Ollama/Hermes fetch callers).
  const order = opts.hermesFirst ? ["hermes", "ollama"] : ["ollama", "hermes"];
  const errors = [];
  for (const provider of order) {
    try {
      // `opts.model` is an OLLAMA model id -- it must NOT be forwarded to the
      // Hermes proxy (a different model namespace -> HTTP 400). Hermes uses its
      // own default (or an explicit `--hermes-model`).
      const text = provider === "ollama"
        ? await callers.ollama(prompt, opts.model || DEFAULT_MODEL)
        : await callers.hermes(prompt, opts.hermesModel);
      if (text && text.trim()) return { text, via: provider };
      errors.push(`${provider}: empty`);
    } catch (e) { errors.push(`${provider}: ${e && e.message}`); }
  }
  throw new Error(`all providers failed -- ${errors.join("; ")}`);
}

export async function judgeFile(testPath, opts = {}) {
  const testContent = readSafe(testPath);
  if (testContent == null) return { ok: false, file: testPath, error: "test-file-unreadable" };
  const sutPath = resolveSutPath(testPath, testContent);
  if (!sutPath) return { ok: false, file: testPath, error: "sut-not-resolved" };
  const sutContent = readSafe(sutPath);
  if (sutContent == null) return { ok: false, file: testPath, sut: sutPath, error: "sut-unreadable" };
  const prompt = buildJudgePrompt(testContent, sutContent);
  let resp;
  try { resp = await callJudge(prompt, opts); }
  catch (e) { return { ok: false, file: testPath, sut: sutPath, error: String(e && e.message) }; }
  const parsed = parseJudgeResponse(resp.text);
  if (!parsed.ok) return { ok: false, file: testPath, sut: sutPath, via: resp.via, error: `unparseable: ${parsed.error}` };
  return { ok: true, file: testPath, sut: sutPath, via: resp.via, verdict: parsed.verdict };
}

function walk(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (TEST_RE.test(e.name)) out.push(full);
  }
}

/** Find thin critical-domain candidates via the cheap deterministic pre-filter. */
export async function findCandidates() {
  const legit = await import(
    pathToFileURL(path.join(REPO, ".claude/helpers/lib/test-legitimacy-core.mjs")).href
  );
  const files = [];
  for (const r of ["mcp-server", "web"]) walk(path.join(REPO, r), files);
  const candidates = [];
  for (const f of files) {
    const c = readSafe(f);
    if (c == null) continue;
    if (legit.detectShallowCriticalTest({ filePath: f, content: c }).advise) candidates.push(f);
  }
  return candidates;
}

function rel(p) { return String(p).replace(/\\/g, "/").replace(`${REPO}/`, ""); }

function printOne(r) {
  if (r.ok) {
    const v = r.verdict;
    console.log(`${v.verdict.toUpperCase()} (${v.rigorScore}/100, would-catch-regression=${v.wouldCatchRegression}, via ${r.via})  ${rel(r.file)}`);
    if (v.rationale) console.log(`   ${v.rationale}`);
    if (v.missingCoverage.length) console.log(`   missing: ${v.missingCoverage.join("; ")}`);
  } else {
    console.log(`SKIP (${r.error})  ${rel(r.file)}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const opts = {
    hermesFirst: args.includes("--hermes"),
    model: (args.find((a) => a.startsWith("--model=")) || "").split("=")[1] || undefined,
    hermesModel: (args.find((a) => a.startsWith("--hermes-model=")) || "").split("=")[1] || undefined,
  };

  if (args.includes("--batch")) {
    const limit = Number((args.find((a) => a.startsWith("--limit=")) || "").split("=")[1] || DEFAULT_BATCH_LIMIT);
    const candidates = await findCandidates();
    const picked = candidates.slice(0, limit);
    const results = [];
    for (const f of picked) results.push(await judgeFile(f, opts));
    if (json) { console.log(JSON.stringify({ totalCandidates: candidates.length, judged: results.length, results }, null, 2)); return; }
    console.log(`thin critical candidates: ${candidates.length} (judging first ${picked.length})\n`);
    for (const r of results) printOne(r);
    const weak = results.filter((r) => r.ok && (r.verdict.verdict !== "rigorous")).length;
    console.log(`\n${weak}/${results.length} judged candidate(s) are shallow/weak.`);
    return;
  }

  const target = args.find((a) => !a.startsWith("-"));
  if (!target) {
    console.error("usage: test-rigor-judge.mjs <file.test.ts> [--hermes] [--model=ID] [--json]  |  --batch [--limit=N]");
    process.exit(2);
  }
  const r = await judgeFile(path.isAbsolute(target) ? target : path.resolve(target), opts);
  if (json) { console.log(JSON.stringify(r, null, 2)); return; }
  printOne(r);
  if (!r.ok) process.exitCode = 1;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]).replace(/\\/g, "/") : "";
const self = pathToFileURL(invoked).href;
if (import.meta.url === self || invoked.endsWith("test-rigor-judge.mjs")) {
  main().catch((e) => { console.error("test-rigor-judge fatal:", e && e.message); process.exit(1); });
}
