#!/usr/bin/env node
/**
 * tsc-route-by-owner.mjs -- parse a tsc error log (or run tsc) and route each error to the
 * domain-owner slot that can safely fix it, so papa's hand-authored defer punch-list
 * (state/shared/specs/TSC-DEFER-ROUTING-2026-06-17.md) becomes a REPEATABLE artifact that
 * stays fresh as owners clear their errors (slot:papa 2026-06-18, BUILD-QUALITY-PAPA).
 *
 * WHY (papa-core build infra): the all-domains tsc campaign drove 638 -> 89; the remaining are
 * DOMAIN-ENTANGLED (a fix needs a real physics/machine/unit VALUE = the owner's call; papa
 * never fabricates). This tool re-derives "who owns which error" from a live tsc run so the
 * count + routing never go stale, and surfaces the per-owner queue each slot should clear.
 * It automates the one-shot hand routing done in U-TSC-BASELINE-ROUTE (ac3d5de708).
 *
 * Routing is by FILE basename against an ORDERED rule list (first match wins). Ordering is
 * load-bearing: CAM (hyperMILL/Mastercam) MUST precede MILL because "hyperMILL" contains
 * "MILL"; WEDM precedes EDM; RL/AI precedes CAM (ReinforcementLearningCAMFeedback is india).
 * UNKNOWN files fall to review, OR are classified by a local Ollama coder model with
 * --ollama-classify (offload, $0; fail-soft -> stays UNKNOWN).
 *
 * Owners (state/shared/CHAT-SLOT-DOMAINS.md): mike=WEDM/electrode, delta=CAD, oscar=speed-feed/
 * chatter, whiskey=lathe, kilo=CAM, foxtrot=mill, echo=post, charlie=quoting, lima=academy,
 * india=AI-training/RL, hotel=business, safety=S(x), papa=build-infra.
 *
 * Pure core (parseTscErrors / ownerForFile / routeByOwner / summarize / renderMarkdown) is
 * exported + hermetically tested; the CLI shell runs tsc / reads the log / calls Ollama.
 *
 * CLI: node scripts/tsc-route-by-owner.mjs [--log <path>] [--run-tsc] [--json]
 *        [--ollama-classify] [--out <md-path>]
 * Exit: 0 ok - 2 usage/no-input.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

export const OWNERS = Object.freeze([
  "mike", "delta", "oscar", "whiskey", "kilo", "foxtrot",
  "echo", "charlie", "lima", "india", "hotel", "safety", "papa",
]);

// Ordered owner rules -- FIRST MATCH WINS. Order is load-bearing (see header). `re` tests the
// file BASENAME (e.g. "ReinforcementLearningCAMFeedbackEngine.ts").
export const OWNER_RULES = Object.freeze([
  { owner: "india", re: /(ReinforcementLearning|OfflineRL|RLCAM|^Neural|DeepLearning|LoRA|GNN|GraphSAGE)/i, why: "RL / neural / AI-training" },
  { owner: "mike", re: /(WEDM|WireEDM|Electrode|Trilobe|Sinker|^EDM)/i, why: "Wire-EDM / electrode" },
  { owner: "kilo", re: /(Mastercam|PowerMill|SolidCAM|NXCAM|hyperMILL|HyperMill|^CAM|CAMAGI|CAMKernel|CAMRecommend|CAMIntegration)/i, why: "CAM toolpath / strategy" },
  { owner: "delta", re: /^Fusion(AI)?Orchestration/i, why: "Fusion AI orchestration (CAD)" },
  { owner: "delta", re: /(CodeGenerator|^CAD|Fusion|^Creo|^CATIA|^Onshape|^Rhino|^Inventor|^SolidWorks|HyperCAD|^NX)/i, why: "CAD generation / bridge" },
  { owner: "oscar", re: /(SpeedFeed|Chatter|StabilityLobe|Gilbert|SpecificCuttingEnergy|FiveAxis)/i, why: "speed-feed / chatter / cutting physics" },
  { owner: "whiskey", re: /(Lathe|Turning|Turret)/i, why: "lathe / turning" },
  { owner: "foxtrot", re: /(^Mill|Milling)/i, why: "milling" },
  { owner: "echo", re: /(PostProcessor|^PPG|PostEmit|MasterPost|^Post)/i, why: "post-processor" },
  { owner: "charlie", re: /(Quoting|^Quote|CostSavings)/i, why: "quoting / cost" },
  { owner: "lima", re: /(Lecture|Academy|Course|Curriculum)/i, why: "academy / courseware" },
  { owner: "safety", re: /(SafetyEnvelope|SafetyGate|QualityGate)/i, why: "safety / S(x) gate" },
  { owner: "hotel", re: /(ShopMachine|ShopConfig|ERP|Accounting|Docustrata|Payroll|Invoice)/i, why: "business / shop config" },
  { owner: "papa", re: /(^Hook|Roadmap|^auth|Dispatcher|BaseEngine|Registry|ProgramParser|JMDieProgram|ReasoningChainSharing|AutomatedResourceHarvesting|IntelligentSequencing)/i, why: "build-infra (papa)" },
]);

// tsc colorizes with ANSI codes scattered through the line (around the file, the code, and
// after the code before its colon). Strip ALL ANSI first, then match a clean regex -- matching
// ANSI in-place missed the trailing reset (\x1b[0m) between "TS####" and ":".
const ANSI_RE = /\x1b\[[0-9;]*m/g;
const TSC_ERROR_RE = /^([^\s(][^(]*?)\((\d+),(\d+)\):\s*(error\s+TS\d+):\s*(.*)$/;

/** Pure: parse a tsc log into [{file, line, col, code, msg}]. Strips ANSI. Dedups by location. */
export function parseTscErrors(logText) {
  const out = [];
  const seen = new Set();
  for (const raw of String(logText == null ? "" : logText).split(/\r?\n/)) {
    const line = raw.replace(ANSI_RE, "");
    const m = line.match(TSC_ERROR_RE);
    if (!m) continue;
    const [, fileRaw, lineRaw, colRaw, codeRaw, msgRaw] = m;
    const file = fileRaw.trim().replace(/\\/g, "/");
    const rec = { file, line: Number(lineRaw), col: Number(colRaw), code: codeRaw.replace(/^error\s+/, ""), msg: msgRaw.trim() };
    const key = `${rec.file}:${rec.line}:${rec.col}:${rec.code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(rec);
  }
  return out;
}

// Path-significant build-infra dirs: a file whose BASENAME matches no engine rule but lives in
// one of these dirs (e.g. hooks/index.ts -> basename "index.ts") is routed by its directory.
export const DIR_OWNER = Object.freeze({ hooks: "papa", routes: "papa", mcp: "papa", migrations: "papa" });

/** Pure: route a file path to an owner via the ordered rules, then a directory fallback. */
export function ownerForFile(filePath, rules = OWNER_RULES) {
  const p = String(filePath == null ? "" : filePath).replace(/\\/g, "/");
  const base = basename(p);
  for (const r of rules) {
    if (r.re.test(base)) return { owner: r.owner, why: r.why };
  }
  const parts = p.split("/");
  for (let i = parts.length - 2; i >= 0; i--) {
    if (DIR_OWNER[parts[i]]) return { owner: DIR_OWNER[parts[i]], why: `dir:${parts[i]} -> build-infra` };
  }
  return { owner: "UNKNOWN", why: "no rule matched -- review manually / --ollama-classify" };
}

/** Pure: group parsed errors by owner. Returns { owner: { owner, why, count, files[], errors[] } }. */
export function routeByOwner(errors, rules = OWNER_RULES) {
  const by = {};
  for (const e of Array.isArray(errors) ? errors : []) {
    const { owner, why } = ownerForFile(e.file, rules);
    const slot = (by[owner] ||= { owner, why, count: 0, files: new Set(), errors: [] });
    slot.count += 1;
    slot.files.add(e.file);
    slot.errors.push(e);
  }
  return Object.fromEntries(
    Object.entries(by).map(([k, v]) => [k, { ...v, files: [...v.files].sort() }])
  );
}

/** Pure: owner -> count summary, sorted desc by count (UNKNOWN last). */
export function summarize(routed) {
  return Object.values(routed)
    .map((v) => ({ owner: v.owner, count: v.count, files: v.files.length }))
    .sort((a, b) => (a.owner === "UNKNOWN" ? 1 : b.owner === "UNKNOWN" ? -1 : b.count - a.count));
}

/** Pure: render a markdown punch-list grouped by owner. */
export function renderMarkdown(routed, { total = 0, generatedAt = "(stamp post-run)" } = {}) {
  const summary = summarize(routed);
  const lines = [
    `# TSC Routing by Owner (auto-generated)`,
    ``,
    `> Regenerated by \`scripts/tsc-route-by-owner.mjs\`. ${total} tsc error(s) routed to ${summary.length} owner(s).`,
    `> Generated: ${generatedAt}. Papa never fabricates domain values -- each owner fixes their own with real producer types.`,
    ``,
    `## Summary`,
    ``,
    `| Owner | Errors | Files |`,
    `|---|---|---|`,
    ...summary.map((s) => `| ${s.owner} | ${s.count} | ${s.files} |`),
    ``,
  ];
  for (const s of summary) {
    const slot = routed[s.owner];
    lines.push(`## ${s.owner} (${s.count}) -- ${slot.why}`, ``);
    for (const f of slot.files) {
      const errs = slot.errors.filter((e) => e.file === f).sort((a, b) => a.line - b.line);
      lines.push(`- \`${f}\` (${errs.length})`);
      for (const e of errs) lines.push(`  - :${e.line} ${e.code} -- ${e.msg.slice(0, 140)}`);
    }
    lines.push(``);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// CLI shell (impure)
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const f = { log: "", runTsc: false, json: false, ollamaClassify: false, out: "" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--log") f.log = String(argv[++i] || "");
    else if (a === "--run-tsc") f.runTsc = true;
    else if (a === "--json") f.json = true;
    else if (a === "--ollama-classify") f.ollamaClassify = true;
    else if (a === "--out") f.out = String(argv[++i] || "");
  }
  return f;
}

function runTscCapture() {
  // The MANDATORY heap bump: without it tsc OOM-aborts + false-greens (reference_tsc_oom_false_green).
  try {
    execFileSync("npx", ["tsc", "--noEmit", "--incremental", "false"], {
      cwd: resolve("mcp-server"),
      env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=16384" },
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024,
    });
    return "";
  } catch (e) {
    return String(e.stdout || "") + String(e.stderr || "");
  }
}

/**
 * REAL Ollama classifier for one UNKNOWN file basename. POSTs to the local daemon, asks for
 * exactly one owner from OWNERS, returns it or null (fail-soft: daemon down / bad answer -> null).
 * Direct HTTP (no ask-ollama dependency) so the contract is self-contained.
 */
// NOTE: filename-only classification is APPROXIMATE -- even a strong coder model guesses from
// the name alone (qwen2.5-coder:7b mis-routed ProcessIntelligenceRouter -> mike). Results are
// labeled `ollamaSuggested: true` so a reviewer verifies; the deterministic OWNER_RULES path is
// the authoritative one. Default model is the operator's 32b coder for better accuracy.
export async function classifyViaOllama(fileName, owners = OWNERS, opts = {}) {
  const model = opts.model || "qwen2.5-coder:32b";
  const url = opts.url || process.env.OLLAMA_URL || "http://127.0.0.1:11434";
  // "fetchImpl" in opts distinguishes "not provided" (use global fetch) from an EXPLICIT
  // null/false (no fetch -> return null). `opts.fetchImpl || global` could not express the latter.
  const fetchImpl = ("fetchImpl" in opts) ? opts.fetchImpl : (typeof fetch === "function" ? fetch : null);
  if (!fetchImpl) return null;
  // The engine's header docstring (opts.docstring) is a FAR stronger signal than the filename --
  // include it when available (raises accuracy well above the filename-only guess that mis-routed
  // ProcessIntelligenceRouter -> mike).
  const ctx = opts.docstring ? `\n\nThe file's header documentation:\n${String(opts.docstring).slice(0, 1200)}\n` : "";
  const prompt =
    `A TypeScript engine file is named "${fileName}".${ctx} Which manufacturing domain owner should fix its ` +
    `type errors? Reply with EXACTLY ONE lowercase word from this list and nothing else: ${owners.join(", ")}.`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), opts.timeoutMs || 20000);
  try {
    const res = await fetchImpl(`${url}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false, options: { temperature: 0 } }),
      signal: ac.signal,
    });
    if (!res.ok) return null;
    const j = await res.json();
    const ans = String(j.response || "").trim().toLowerCase().split(/\s+/)[0].replace(/[^a-z]/g, "");
    return owners.includes(ans) ? ans : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Read an engine file's leading header docstring -- the strongest domain signal (far better than
 * the filename alone). tsc paths are relative to mcp-server (src/...), so candidate-resolve from
 * there first. Fail-soft (returns "" on any read miss). readImpl injectable for tests.
 */
export function readEngineDocstring(filePath, opts = {}) {
  const readImpl = ("readImpl" in opts)
    ? opts.readImpl
    : ((p) => { try { return readFileSync(p, "utf8"); } catch { return ""; } });
  if (typeof readImpl !== "function") return "";
  const candidates = [resolve("mcp-server", filePath), resolve(filePath), filePath];
  for (const c of candidates) {
    const src = readImpl(c) || "";
    if (src) return src.split(/\r?\n/).slice(0, 40).join("\n").slice(0, 1200);
  }
  return "";
}

/** Reclassify the UNKNOWN bucket via Ollama (real; fail-soft). Returns a new routed object. */
async function ollamaReclassify(routed, opts = {}) {
  const unknown = routed.UNKNOWN;
  if (!unknown || !unknown.files.length) return routed;
  const next = { ...routed };
  const stillUnknown = { ...unknown, files: [], errors: [] };
  for (const f of unknown.files) {
    const docstring = readEngineDocstring(f, opts);
    const suggested = await classifyViaOllama(basename(f), OWNERS, { ...opts, docstring });
    const errs = unknown.errors.filter((e) => e.file === f);
    if (suggested && OWNERS.includes(suggested)) {
      const slot = (next[suggested] ||= { owner: suggested, why: "ollama-suggested", count: 0, files: [], errors: [], ollamaSuggested: true });
      slot.count += errs.length;
      slot.files = [...new Set([...slot.files, f])].sort();
      slot.errors.push(...errs);
    } else {
      stillUnknown.files.push(f);
      stillUnknown.errors.push(...errs);
      stillUnknown.count = (stillUnknown.count || 0);
    }
  }
  stillUnknown.count = stillUnknown.errors.length;
  if (stillUnknown.files.length) next.UNKNOWN = stillUnknown;
  else delete next.UNKNOWN;
  return next;
}

async function main() {
  const f = parseArgs(process.argv.slice(2));
  let logText = "";
  if (f.runTsc) logText = runTscCapture();
  else if (f.log && existsSync(f.log)) logText = readFileSync(f.log, "utf8");
  else {
    const guesses = ["state/shared/tsc-after-c4.log", "state/shared/tsc-now-papa.log"].map((p) => resolve(p));
    const found = guesses.find((p) => existsSync(p));
    if (found) logText = readFileSync(found, "utf8");
  }
  if (!logText) {
    console.error("no input: pass --log <path> or --run-tsc (no default log found)");
    process.exit(2);
  }
  const errors = parseTscErrors(logText);
  let routed = routeByOwner(errors);
  if (f.ollamaClassify) routed = await ollamaReclassify(routed);
  if (f.json) {
    console.log(JSON.stringify({ total: errors.length, summary: summarize(routed), routed }, null, 2));
  } else {
    const md = renderMarkdown(routed, { total: errors.length });
    if (f.out) { writeFileSync(resolve(f.out), md); console.log(`wrote ${f.out} (${errors.length} errors, ${summarize(routed).length} owners)`); }
    else console.log(md);
  }
  process.exit(0);
}

const INVOKED_DIRECTLY = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (INVOKED_DIRECTLY) main().catch((e) => { console.error(e); process.exit(1); });
