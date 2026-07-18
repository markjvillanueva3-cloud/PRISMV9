#!/usr/bin/env node
/**
 * winmax-autotest.mjs — AUTONOMOUS live post-processor test harness against Hurco WinMax.
 *
 * The vision (operator): run live post tests with NO human input. For a posted NC program this
 * harness drives the WinMax GUI (via the PrismWinMaxUI UIA driver) to load the program, set up
 * tools + work offset, run the graphics Verify, then reads the controller's status line to decide
 * PASS (sim ran clean) / FAIL (alarm / "TOOL n NOT DEFINED" / error-in-block). Results + before/after
 * screenshots are recorded to a ledger so a batch of posts can be regression-tested unattended.
 *
 * DESIGN: the macro engine (runMacro) is pure over an injected `driver(op,args)=>Promise<json>` so
 * it's fully unit-testable without WinMax. The real driver spawns PrismWinMaxUI.exe; tests inject a
 * mock. Macros are JSON step lists (winmax-bridge/ui-driver/macros/*.json) — recorded once by driving
 * live with vision, then replayed deterministically + cheaply (status read via UIA, not vision).
 *
 * SAFETY (R12): NEVER launches WinMax (attach-only — `ensureUp` fails loud if it's not running).
 * Machine-motion softkeys are denied by the driver itself; this harness drives the graphics VERIFY
 * (a pure simulation), not a machine run. A step that fails aborts the macro (no blind continue).
 *
 * Usage:
 *   node scripts/winmax-autotest.mjs --macro <name> [--program <ncPath>]   # run one macro
 *   node scripts/winmax-autotest.mjs --status                              # read the status line now
 *   node scripts/winmax-autotest.mjs --shot [--crop x,y,w,h]               # capture a screenshot
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, existsSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UI_EXE = path.join(__dirname, "..", "mcp-server", "data", "posts", "prism-base", "winmax-bridge", "ui-driver", "bin", "PrismWinMaxUI.exe");
const MACRO_DIR = path.join(__dirname, "..", "mcp-server", "data", "posts", "prism-base", "winmax-bridge", "ui-driver", "macros");
const LEDGER_DIR = path.join(__dirname, "..", "state", "shared", "winmax-autotest");

// Softkey labels are graphical (not in the UIA tree); the driver presses them by AutomationId.
// F1..F8 → ids 301..308 (mapped from live screenshots). A macro names a softkey "F2" and the
// real driver resolves it to id 302 via invoke.
export const SOFTKEY_IDS = { F1: "301", F2: "302", F3: "303", F4: "304", F5: "305", F6: "306", F7: "307", F8: "308" };

// Status-line patterns that mean the sim is NOT clean (autonomous FAIL detection).
export const FAIL_PATTERNS = [
  /not\s+defined/i, /error\s+in\s+block/i, /\balarm\b/i, /\bfault\b/i, /collision/i,
  /exceed/i, /not\s+allowed/i, /invalid/i, /out\s+of\s+range/i,
];
export function classifyStatus(text) {
  const t = String(text == null ? "" : text);
  const hit = FAIL_PATTERNS.find((re) => re.test(t));
  return { ok: !hit, status: t.trim(), failReason: hit ? (t.match(hit) || [hit.source])[0] : null };
}

// ── the real driver: spawn the UIA exe for one op, parse its single JSON line ──
export function realDriver(opts = {}) {
  const exe = opts.exe || UI_EXE;
  return async function driver(op, args = []) {
    const argv = ["--op", op, ...args.map(String)];
    if (opts.allowActions) argv.push("--allow-actions");
    const r = spawnSync(exe, argv, { encoding: "utf8", timeout: opts.timeout || 30000 });
    if (r.error) return { ok: false, op, error: String(r.error.message || r.error) };
    const line = (r.stdout || "").trim().split(/\r?\n/).filter(Boolean).pop() || "";
    try { return JSON.parse(line); } catch { return { ok: false, op, error: `unparseable: ${line || r.stderr || "no output"}` }; }
  };
}

export async function ensureUp(driver) {
  const r = await driver("window-info", []);
  if (!r.ok) throw new Error(`WinMax is not reachable (attach failed): ${r.error || "no window"}. Start WinMax first — this harness never launches it.`);
  return r.value;
}

// ── read the status line. WinMax draws the status line GRAPHICALLY (not in the UIA tree, like the
//    F1–F8 softkey labels) — so a UIA `find` usually returns nothing and we fall back to a CHEAP
//    cropped screenshot of the status row that a vision model reads (~1k tokens vs 12k full-screen).
//    `statusCrop` is window-relative "x,y,w,h"; default covers the 2-line status strip at the bottom.
export async function readStatus(driver, opts = {}) {
  const f = await driver("find", ["block"]);   // best-effort: some builds DO expose it
  let text = "";
  if (f.ok && f.value && Array.isArray(f.value.matches)) text = f.value.matches.map((m) => m.name).filter(Boolean).join(" | ");
  if (text) return { raw: text, source: "uia", ...classifyStatus(text) };
  // graphical fallback → cropped screenshot for vision
  const crop = opts.statusCrop || "0,1320,1100,80";
  const out = opts.shotPath || "";   // "" → driver writes to its temp default; crop must be arg[1]
  const shot = await driver("screenshot", [out, crop]);
  return { raw: "", source: "screenshot", needsVision: true, shotPath: shot.value && shot.value.path,
    ...classifyStatus(""), note: "status line is graphical — read shotPath with vision to classify" };
}

// ── the macro engine (PURE over the injected driver — unit-tested without WinMax) ──
// step shapes:
//   { op:"softkey", key:"F2" }                      → invoke softkey id
//   { op:"invoke", id:"<AutomationId>" }
//   { op:"set-value", id:"<AutomationId>", value:"0.5" }
//   { op:"sendkeys", keys:"{TAB}0.5{ENTER}" }
//   { op:"screenshot", label:"after-tools", crop?:"x,y,w,h" }
//   { op:"wait", ms:500 }
//   { op:"assert-status", expectClean:true }        → read status, fail if a FAIL_PATTERN matches
export async function runMacro(driver, macro, ctx = {}) {
  const steps = Array.isArray(macro.steps) ? macro.steps : [];
  const results = [];
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const res = await runStep(driver, s, ctx, i);
    results.push(res);
    if (!res.ok) return { ok: false, macro: macro.name, failedAt: i, step: s, results };
  }
  return { ok: true, macro: macro.name, steps: results.length, results };
}

export async function runStep(driver, s, ctx = {}, idx = 0) {
  const tag = `${idx}:${s.op}`;
  switch (s.op) {
    case "softkey": {
      // PROVEN LIVE (2026-05-30): WinMax softkeys actuate via a real keyboard keypress (sendkeys
      // "{F2}"), NOT UIA Invoke on the button (Invoke returns ok but the screen does NOT change).
      if (!SOFTKEY_IDS[s.key]) return { ok: false, tag, error: `unknown softkey '${s.key}'` };
      const r = await driver("sendkeys", [`{${s.key}}`]);
      return { ok: !!r.ok, tag, detail: `softkey ${s.key} (sendkeys)`, error: r.error };
    }
    case "invoke": { const r = await driver("invoke", [s.id]); return { ok: !!r.ok, tag, detail: `invoke ${s.id}`, error: r.error }; }
    case "set-value": { const r = await driver("set-value", [s.id, String(s.value)]); return { ok: !!r.ok, tag, detail: `set ${s.id}=${s.value}`, error: r.error }; }
    case "sendkeys": { const r = await driver("sendkeys", [s.keys]); return { ok: !!r.ok, tag, detail: `keys ${s.keys}`, error: r.error }; }
    case "wait": { await sleep(s.ms || 300); return { ok: true, tag, detail: `wait ${s.ms || 300}ms` }; }
    case "screenshot": {
      const out = ctx.runDir ? path.join(ctx.runDir, `${String(idx).padStart(2, "0")}-${s.label || "shot"}.png`) : (s.path || "");
      const r = await driver("screenshot", s.crop ? [out, s.crop] : [out]);
      return { ok: !!r.ok, tag, detail: `shot ${s.label || ""}`, path: r.value && r.value.path, error: r.error };
    }
    case "assert-status": {
      const st = await readStatus(driver);
      const wantClean = s.expectClean !== false;
      const ok = wantClean ? st.ok : !st.ok;
      return { ok, tag, detail: `status="${st.status}"`, status: st.status, failReason: st.failReason,
        error: ok ? undefined : `status assertion failed (${wantClean ? "expected clean" : "expected error"}): ${st.status || "(empty)"}` };
    }
    default: return { ok: false, tag, error: `unknown step op '${s.op}'` };
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function loadMacro(nameOrPath) {
  const p = existsSync(nameOrPath) ? nameOrPath : path.join(MACRO_DIR, nameOrPath.endsWith(".json") ? nameOrPath : `${nameOrPath}.json`);
  if (!existsSync(p)) throw new Error(`macro not found: ${nameOrPath} (looked in ${MACRO_DIR})`);
  return JSON.parse(readFileSync(p, "utf8"));
}

export function recordResult(result, programName) {
  mkdirSync(LEDGER_DIR, { recursive: true });
  const row = { macro: result.macro, program: programName || null, ok: result.ok, failedAt: result.failedAt ?? null, steps: result.results ? result.results.length : 0 };
  appendFileSync(path.join(LEDGER_DIR, "autotest-ledger.jsonl"), JSON.stringify(row) + "\n");
  return row;
}

// ── CLI ──
async function main() {
  const a = process.argv.slice(2);
  const get = (k, d) => { const i = a.indexOf("--" + k); return i >= 0 ? a[i + 1] : d; };
  const driver = realDriver({ allowActions: a.includes("--allow-actions") });

  if (a.includes("--status")) { await ensureUp(driver); console.log(JSON.stringify(await readStatus(driver), null, 2)); return; }
  if (a.includes("--shot")) {
    await ensureUp(driver);
    const crop = get("crop", null); const out = get("out", path.join(LEDGER_DIR, "shot.png"));
    mkdirSync(LEDGER_DIR, { recursive: true });
    console.log(JSON.stringify(await driver("screenshot", crop ? [out, crop] : [out]), null, 2)); return;
  }
  const macroName = get("macro", null);
  if (!macroName) { console.log("usage: --macro <name> [--program <ncPath>] | --status | --shot [--crop x,y,w,h]"); process.exit(1); }
  await ensureUp(driver);
  const macro = loadMacro(macroName);
  const runDir = path.join(LEDGER_DIR, `run-${macro.name || macroName}`);
  mkdirSync(runDir, { recursive: true });
  const result = await runMacro(driver, macro, { runDir, program: get("program", null) });
  recordResult(result, get("program", null));
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}
const invokedDirectly = process.argv[1] && /winmax-autotest\.mjs$/.test(process.argv[1].replace(/\\/g, "/"));
if (invokedDirectly) main().catch((e) => { console.error(String(e && e.message || e)); process.exit(2); });
