#!/usr/bin/env node
/**
 * hermes-doctor.mjs -- idempotent pre-launch verify+repair that makes the Hermes
 * desktop app + CLI launch RELIABLY EVERY TIME (HERMES-LAUNCH-RELIABILITY-MS0,
 * slot:bravo 2026-06-30). The permanent fix for "works 1 of 10 tries."
 *
 * A `PRISM Hermes Doctor` scheduled task runs it (--no-warm) every 15 min + AtStartup + AtLogOn so
 * the box stays launch-ready; run it MANUALLY (with warm) right before launch for the fastest first
 * message. (It is NOT prepended into the desktop launcher .bat.) Every check is bounded (can NEVER
 * hang). Idempotent: a healthy
 * box is a no-op. Steps:
 *   1. IPv4 preference -- reassert `prefixpolicy ::ffff:0:0/96 60 1` if missing, so
 *      the Nous boot fetch + NAS-JWT auth can't SYN_SENT-hang on this box's dead IPv6
 *      (the 06-26 root cause; the netsh fix is not durable, so we re-assert it).
 *   2. Config -- run hermes-config-apply.py --apply (pins gpt-oss:120b @>=64K local,
 *      strips the NVIDIA-32K fallback that HARD-FAILS the launch). Idempotent.
 *   3. Ollama -- verify up + Blackwell GPU build (>=0.30.11) + PRE-WARM gpt-oss:120b
 *      so it's loaded before the desktop's 60s connect window (kills the cold-start race).
 *   4. Dead :8645 proxy -- reap a confirmed-dead (listening but /health-fails) xAI-Grok
 *      proxy so it stops wedging the agent's proxy-start + stops the DARK banner. In
 *      local+NVIDIA mode the desktop does not use :8645 at all.
 *   5. Hermes install -- light `hermes --version` liveness.
 * Emits a PASS or a precise operator-action report. Exit 0 unless a HARD step failed.
 *
 * Usage:
 *   node scripts/hermes-doctor.mjs [--json] [--no-warm] [--no-net] [--no-reap]
 *                                  [--no-config] [--warm-model gpt-oss:120b]
 * Exit: 0 healthy/repaired | 1 degraded-needs-operator | 3 hard failure
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { execFile, spawn } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const OLLAMA_URL = process.env.PRISM_OLLAMA_URL || "http://127.0.0.1:11434";
const PROXY_PORT = parseInt(process.env.PRISM_HERMES_PROXY_PORT || "8645", 10);
const SUBPROXY_PORT = parseInt(process.env.PRISM_HERMES_SUBPROXY_PORT || "8766", 10);
const PRIMARY_MODEL = process.env.PRISM_HERMES_PRIMARY_MODEL || "gpt-oss:120b";
const PRIMARY_CTX = parseInt(process.env.PRISM_HERMES_PRIMARY_CTX || "131072", 10);
const MIN_OLLAMA = "0.30.11"; // first Blackwell-CUDA build on this box
const CONFIG_APPLY = resolve(HERE, "hermes-config-apply.py");
const SUBPROXY_SCRIPT = resolve(HERE, "hermes-subscription-proxy.mjs");
const HERMES_DIR = process.env.PRISM_HERMES_DIR || "C:/Users/wompu/AppData/Local/hermes";
const HERMES_PY = process.env.PRISM_HERMES_PY
  || "C:/Users/wompu/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe";
// python candidates for the ruamel config-apply (first that exists wins)
const PY_CANDIDATES = [
  HERMES_PY,
  "H:/Tools/python/python.exe",
  "python",
  "py",
];

// ---- pure helpers (exported, unit-tested) ----------------------------------------------

/** Parse argv -> options. Pure. */
export function parseDoctorArgs(argv) {
  const o = { json: false, warm: true, net: true, reap: true, config: true, subproxy: true, warmModel: PRIMARY_MODEL, error: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") o.json = true;
    else if (a === "--no-warm") o.warm = false;
    else if (a === "--no-net") o.net = false;
    else if (a === "--no-reap") o.reap = false;
    else if (a === "--no-config") o.config = false;
    else if (a === "--no-subproxy") o.subproxy = false;
    else if (a === "--warm-model") o.warmModel = argv[++i] ?? PRIMARY_MODEL;
    else if (a.startsWith("--")) { o.error = `unknown flag: ${a}`; return o; }
  }
  return o;
}

/** True iff the prefixpolicy output already prefers IPv4-mapped (::ffff:0:0/96 precedence >= 60). Pure. */
export function hasIpv4Preference(prefixpolicyText) {
  if (!prefixpolicyText) return false;
  for (const line of String(prefixpolicyText).split(/\r?\n/)) {
    const m = line.match(/^\s*(\d+)\s+\d+\s+::ffff:0:0\/96\s*$/);
    if (m && parseInt(m[1], 10) >= 60) return true;
  }
  return false;
}

/** Classify the :8645 holder. Pure. listening + healthOk=true -> serving; listening + !healthOk -> dead; else free. */
export function classifyProxy({ listening, healthOk }) {
  if (!listening) return "free";
  return healthOk ? "serving" : "dead";
}

/** Compare dotted versions: returns true iff have >= min. Pure. */
export function versionAtLeast(have, min) {
  if (!have) return false;
  const norm = (s) => String(s).replace(/[^0-9.]/g, "").split(".").map((n) => parseInt(n, 10) || 0);
  const a = norm(have), b = norm(min);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x !== y) return x > y;
  }
  return true;
}

/** Body for an Ollama warm/load call (loads the model resident at the target ctx). Pure. */
export function buildWarmBody(model, ctx) {
  return { model, prompt: ".", stream: false, keep_alive: "30m", options: { num_ctx: ctx, num_predict: 1 } };
}

/** First python path that exists on disk (bare names assumed present on PATH). Pure-ish (takes existsFn). */
export function resolvePython(candidates, existsFn = existsSync) {
  for (const p of candidates) {
    if (!p.includes("/") && !p.includes("\\")) return p; // bare name -> rely on PATH
    if (existsFn(p)) return p;
  }
  return null;
}

/** Roll up step results into a verdict. Pure. */
export function summarize(steps) {
  const hard = steps.filter((s) => s.status === "fail");
  const warn = steps.filter((s) => s.status === "warn");
  const verdict = hard.length ? "FAIL" : warn.length ? "DEGRADED" : "PASS";
  const exit = hard.length ? 3 : warn.length ? 1 : 0;
  return { verdict, exit, hard, warn };
}

/** Given a parsed cron jobs.json object, return [{id,name}] of ENABLED jobs. Pure. */
export function enabledCronJobs(jobsObj) {
  const jobs = jobsObj && Array.isArray(jobsObj.jobs) ? jobsObj.jobs : [];
  return jobs.filter((j) => j && j.enabled === true).map((j) => ({ id: j.id || "?", name: j.name || "?" }));
}

// ---- bounded impure ops ----------------------------------------------------------------

function run(cmd, args, { timeoutMs = 15000, cwd } = {}) {
  return new Promise((res) => {
    let done = false;
    const child = execFile(cmd, args, { cwd, windowsHide: true, timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout, stderr) => { if (done) return; done = true; res({ ok: !err, code: err?.code ?? 0, stdout: stdout || "", stderr: stderr || "", err }); });
    child.on("error", (e) => { if (done) return; done = true; res({ ok: false, code: -1, stdout: "", stderr: String(e), err: e }); });
  });
}

async function httpJson(url, { method = "GET", body, timeoutMs = 4000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { method, signal: ctrl.signal,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined });
    const text = await r.text();
    let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
    return { ok: r.ok, status: r.status, json, text };
  } catch (e) { return { ok: false, status: 0, json: null, text: "", err: e }; }
  finally { clearTimeout(t); }
}

// netsh prefixpolicy (Windows). show=no-admin; set=needs-admin.
async function stepIpv4Pref() {
  const show = await run("netsh", ["interface", "ipv6", "show", "prefixpolicies"], { timeoutMs: 8000 });
  if (hasIpv4Preference(show.stdout)) return { name: "ipv4-pref", status: "ok", detail: "IPv4-mapped precedence already set" };
  const set = await run("netsh", ["interface", "ipv6", "set", "prefixpolicy", "::ffff:0:0/96", "60", "1"], { timeoutMs: 8000 });
  if (set.ok) return { name: "ipv4-pref", status: "ok", detail: "reasserted IPv4-mapped precedence (::ffff:0:0/96 60 1)" };
  return { name: "ipv4-pref", status: "warn",
    detail: "could not set prefixpolicy (run elevated once: `netsh interface ipv6 set prefixpolicy ::ffff:0:0/96 60 1`) -- Nous boot may IPv6-hang intermittently until then" };
}

async function stepConfig() {
  const py = resolvePython(PY_CANDIDATES);
  if (!py) return { name: "config", status: "warn", detail: "no python found for hermes-config-apply.py; config not auto-verified" };
  const r = await run(py, [CONFIG_APPLY, "--apply", "--json"], { timeoutMs: 30000, cwd: REPO_ROOT });
  if (!r.ok && r.code === 3) return { name: "config", status: "fail", detail: `config-apply dependency/IO error: ${(r.stderr || r.stdout).slice(0, 300)}` };
  let parsed = null; try { parsed = JSON.parse(r.stdout); } catch { /* */ }
  if (parsed) {
    const applied = (parsed.results || []).filter((x) => x.status === "applied").length;
    return { name: "config", status: "ok",
      detail: applied ? `repaired ${applied} config(s) -> gpt-oss:120b@${PRIMARY_CTX}, stripped <64K cloud fallback` : "config already correct (gpt-oss:120b, no <64K fallback)" };
  }
  return { name: "config", status: r.ok ? "ok" : "warn", detail: (r.stdout || r.stderr).slice(0, 200) };
}

async function stepOllama(warm, warmModel) {
  // Tolerate a slow first response: under a model-swap (e.g. evicting a 37-60GB model)
  // /api/tags can take >4s. Retry once with a generous timeout before declaring it down,
  // so the doctor never false-FAILs on a transient-slow-but-healthy Ollama.
  let tags = await httpJson(`${OLLAMA_URL}/api/tags`, { timeoutMs: 6000 });
  if (!tags.ok) tags = await httpJson(`${OLLAMA_URL}/api/tags`, { timeoutMs: 20000 });
  if (!tags.ok) {
    // best-effort self-heal: local Ollama is the ONLY launch lane (no cloud auto-fallback by
    // design -- the 32K-NVIDIA fallback was the original hard-fail). A down Ollama = no working
    // model, so try to start it, then re-probe before failing loud.
    await run("schtasks", ["/run", "/tn", "PRISM Ollama Serve"], { timeoutMs: 8000 });
    await new Promise((r) => setTimeout(r, 6000));
    tags = await httpJson(`${OLLAMA_URL}/api/tags`, { timeoutMs: 15000 });
  }
  if (!tags.ok) return { name: "ollama", status: "fail", detail: `Ollama DOWN at ${OLLAMA_URL} and could not be auto-started. The desktop has NO cloud auto-fallback by design (local-first), so Hermes has NO working model -- start "PRISM Ollama Serve" / "ollama serve", then relaunch.` };
  const ver = await httpJson(`${OLLAMA_URL}/api/version`, { timeoutMs: 3000 });
  const v = ver.json?.version;
  if (v && !versionAtLeast(v, MIN_OLLAMA)) {
    return { name: "ollama", status: "warn", detail: `Ollama ${v} < ${MIN_OLLAMA} -- Blackwell GPU may fall back to CPU; update Ollama` };
  }
  const has = (tags.json?.models || []).some((m) => m.name === warmModel || m.model === warmModel);
  if (!has) return { name: "ollama", status: "warn", detail: `primary model ${warmModel} not pulled (\`ollama pull ${warmModel}\`)` };
  if (!warm) return { name: "ollama", status: "ok", detail: `Ollama ${v || "?"} up, GPU build; ${warmModel} present (warm skipped)` };
  // pre-warm: load the model resident so the desktop's first connect/message is fast
  const w = await httpJson(`${OLLAMA_URL}/api/generate`, { method: "POST", body: buildWarmBody(warmModel, PRIMARY_CTX), timeoutMs: 120000 });
  return { name: "ollama", status: "ok",
    detail: w.ok ? `Ollama ${v || "?"} up (GPU); pre-warmed ${warmModel} @${PRIMARY_CTX} (resident 30m)` : `Ollama up but warm call did not confirm (${w.status}); model will load on first message` };
}

async function stepProxy(reap) {
  // is :8645 listening? (use netstat parse -- bounded)
  const ns = await run("netstat", ["-ano", "-p", "TCP"], { timeoutMs: 8000 });
  const line = ns.stdout.split(/\r?\n/).find((l) => new RegExp(`:${PROXY_PORT}\\b.*LISTENING`).test(l));
  const listening = !!line;
  let healthOk = false;
  if (listening) {
    const h = await httpJson(`http://127.0.0.1:${PROXY_PORT}/health`, { timeoutMs: 3000 });
    healthOk = h.ok;
  }
  const cls = classifyProxy({ listening, healthOk });
  if (cls === "free") return { name: "proxy-8645", status: "ok", detail: ":8645 free (local+NVIDIA mode does not need the xAI proxy)" };
  if (cls === "serving") return { name: "proxy-8645", status: "ok", detail: ":8645 serving (xAI lane live; unused in local+NVIDIA mode but harmless)" };
  // dead: listening but not serving -> zombie holding the port. Extract the PID via a named group
  // anchored on the trailing column (not a fragile .pop()), and refuse to taskkill if it doesn't match.
  const pidMatch = line.match(/LISTENING\s+(\d+)\s*$/i);
  const pid = pidMatch ? pidMatch[1] : "";
  if (!reap || !pid) return { name: "proxy-8645", status: "warn", detail: `:8645 held by a DEAD proxy (pid ${pid || "unparsed"}); ${reap ? "could not parse the owning PID -- " : ""}reap manually or pass without --no-reap` };
  const k = await run("taskkill", ["/PID", pid, "/F"], { timeoutMs: 6000 });
  return { name: "proxy-8645", status: "ok", detail: k.ok ? `reaped dead :8645 proxy (pid ${pid})` : `could not reap dead :8645 proxy pid ${pid} (${k.stderr.slice(0, 120)})` };
}

async function stepSubscriptionProxy(startIfDown) {
  // The Claude/Codex OpenAI proxy backs the "PRISM Subscription" model-picker provider. If its port is not
  // answering, start it DETACHED (survives this doctor exit) so /model's subscription models can connect.
  // Health-checks first, so a healthy proxy is never restarted (no duplicate-bind churn).
  if (!existsSync(SUBPROXY_SCRIPT)) return { name: "sub-proxy", status: "warn", detail: `subscription proxy script missing at ${SUBPROXY_SCRIPT}` };
  let h = await httpJson(`http://127.0.0.1:${SUBPROXY_PORT}/health`, { timeoutMs: 3000 });
  if (h.ok) return { name: "sub-proxy", status: "ok", detail: `:${SUBPROXY_PORT} up (Claude/Codex pickable in /model)` };
  if (!startIfDown) return { name: "sub-proxy", status: "warn", detail: `:${SUBPROXY_PORT} down (--no-subproxy); the Claude/Codex picker entry won't connect` };
  try {
    const child = spawn(process.execPath, [SUBPROXY_SCRIPT], { detached: true, stdio: "ignore", windowsHide: true });
    child.unref();
  } catch (e) {
    return { name: "sub-proxy", status: "warn", detail: `could not start subscription proxy: ${String((e && e.message) || e)}` };
  }
  await new Promise((r) => setTimeout(r, 2500));
  h = await httpJson(`http://127.0.0.1:${SUBPROXY_PORT}/health`, { timeoutMs: 4000 });
  return { name: "sub-proxy", status: h.ok ? "ok" : "warn",
    detail: h.ok ? `started :${SUBPROXY_PORT} (Claude/Codex pickable)` : `started :${SUBPROXY_PORT} but not answering yet (retries next tick)` };
}


async function stepHermes() {
  if (!existsSync(HERMES_PY)) return { name: "hermes", status: "warn", detail: `hermes venv python missing at ${HERMES_PY}` };
  const r = await run(HERMES_PY, ["-m", "hermes_cli.main", "--version"], { timeoutMs: 20000 });
  const m = (r.stdout || "").match(/Hermes Agent v[\d.]+/);
  if (m) return { name: "hermes", status: "ok", detail: m[0] };
  return { name: "hermes", status: "warn", detail: `hermes --version did not return cleanly (${(r.stderr || r.stdout).slice(0, 120)})` };
}

function readJsonSafe(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

async function stepCrons() {
  // The desktop's profile(s) must fire ZERO in-process crons -- they contend with the
  // 60s gateway-connect window and were the 2026-06-30 desktop breakage (decouple doctrine).
  const candidates = [resolve(HERMES_DIR, "cron/jobs.json")];
  try {
    const profDir = resolve(HERMES_DIR, "profiles");
    for (const name of readdirSync(profDir)) candidates.push(resolve(profDir, name, "cron/jobs.json"));
  } catch { /* no profiles dir */ }
  const offenders = [];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    for (const j of enabledCronJobs(readJsonSafe(p))) {
      offenders.push(`${j.name}(${j.id}) @ ${p.replace(/.*[\\/](profiles[\\/][^\\/]+|cron)[\\/].*/, "$1")}`);
    }
  }
  if (!offenders.length) return { name: "crons", status: "ok", detail: "no in-process desktop crons enabled (decoupled)" };
  return { name: "crons", status: "warn",
    detail: `enabled desktop cron(s) contend with launch -- set enabled:false: ${offenders.slice(0, 4).join("; ")}` };
}

async function main() {
  const args = parseDoctorArgs(process.argv.slice(2));
  if (args.error) { process.stderr.write(`[hermes-doctor] ${args.error}\n`); process.exit(2); }

  const steps = [];
  if (args.net) steps.push(await stepIpv4Pref()); else steps.push({ name: "ipv4-pref", status: "skip", detail: "--no-net" });
  if (args.config) steps.push(await stepConfig()); else steps.push({ name: "config", status: "skip", detail: "--no-config" });
  steps.push(await stepOllama(args.warm, args.warmModel));
  steps.push(await stepProxy(args.reap));
  if (args.subproxy) steps.push(await stepSubscriptionProxy(true)); else steps.push({ name: "sub-proxy", status: "skip", detail: "--no-subproxy" });
  steps.push(await stepCrons());
  steps.push(await stepHermes());

  const { verdict, exit } = summarize(steps);
  if (args.json) {
    process.stdout.write(JSON.stringify({ verdict, exit, primary: PRIMARY_MODEL, steps }, null, 2) + "\n");
  } else {
    process.stdout.write(`\n[hermes-doctor] ${verdict} -- primary=${PRIMARY_MODEL}@${PRIMARY_CTX}\n`);
    for (const s of steps) {
      const icon = s.status === "ok" ? "OK " : s.status === "warn" ? "!! " : s.status === "fail" ? "XX " : ".. ";
      process.stdout.write(`  ${icon}${s.name.padEnd(12)} ${s.detail}\n`);
    }
    if (verdict === "PASS") process.stdout.write(`[hermes-doctor] Hermes is launch-ready. Launch the app/CLI now.\n`);
    else if (verdict === "DEGRADED") process.stdout.write(`[hermes-doctor] launch-ready with caveats above (will still likely connect; address the !! lines for full reliability).\n`);
    else process.stdout.write(`[hermes-doctor] HARD FAILURE -- fix the XX line(s) above before launching.\n`);
  }
  process.exit(exit);
}

const _direct = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/hermes-doctor.mjs");
if (_direct) {
  main().catch((e) => { process.stderr.write(`[hermes-doctor] unexpected: ${e.message}\n`); process.exit(3); });
}
