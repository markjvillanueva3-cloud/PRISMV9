#!/usr/bin/env node
/**
 * winmax-bridge.mjs — PRISM ↔ Hurco WinMax automation bridge (slot:echo).
 *
 * Mirrors delta's *AutomationBridge pattern (MastercamAutomationBridge etc.): an action
 * executor over a pluggable transport, composing existing post engines, with a MOCK MODE
 * for headless testing (delta's PRISM_CAD_MOCK=1 → here PRISM_WINMAX_MOCK=1, default on
 * until a live WCF session is wired). Transports discovered by winmax-probe.mjs:
 *   - wcf            : WinMax WcfDataService (net.pipe://localhost · tcp 4502 · http 8080) — primary, needs the RT stack running
 *   - datablock-xml  : WinMaxDataBlockXMLTools.dll via a .NET host — program ↔ XML extraction
 *   - ui-automation  : UIA/pywinauto over the Qt GUI — fallback, operator-supervised
 *   - local          : NO WinMax — our own NC→datablock interpretation (always available, fully testable)
 *
 * The delta source→regen→compare loop here is NC→datablocks(ours) vs WinMax's datablocks:
 * `ncToDatablocks()` is our interpretation (testable now); when WinMax is live, the bridge
 * drives it for WinMax's interpretation and `compareDatablocks()` diffs them.
 *
 * SAFETY: live transports (wcf/ui-automation) are operator-supervised — the bridge NEVER
 * auto-launches WinMaxMill.exe / CNC_RT.exe. `execute()` in a live transport without a
 * running stack returns an AtomicValue warning, never a fabricated result (R12).
 */
import { readFileSync } from "node:fs";
import * as net from "node:net";

export const WINMAX_WCF = { netpipe: "net.pipe://localhost", tcp: "net.tcp://localhost:4502", http: "http://127.0.0.1:8080" };
const MOCK = process.env.PRISM_WINMAX_MOCK !== "0"; // mock-by-default until live WCF is wired

// AtomicValue<T> — delta's return shape (value + confidence + source + warning)
function atomic(value, source, confidence = 1, warning) { return warning ? { value, confidence, source, warning } : { value, confidence, source }; }

// ── local interpretation: NC → datablock model (what WinMax produces from a loaded program) ──
// Faithful to the PRISM base post's ISNC output (Hurco WinMax). Returns a structured program.
export function ncToDatablocks(nc) {
  const text = nc == null ? "" : String(nc);
  const lines = text.split(/\r\n|\r|\n/);
  const program = { programNumber: null, units: null, wcs: null, blocks: [], tools: [], stats: { rapids: 0, feeds: 0, arcs: 0, toolChanges: 0, comments: 0 } };
  let n = 0, modalG = null, modalF = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const block = { n: ++n, raw: line, type: "other" };
    const comment = /^\(([^)]*)\)$/.exec(line);
    if (comment) { block.type = "comment"; block.text = comment[1].trim(); program.stats.comments++; program.blocks.push(block); continue; }
    const oNum = /^O(\d+)/.exec(line); if (oNum) { program.programNumber = Number(oNum[1]); block.type = "program-number"; program.blocks.push(block); continue; }
    if (/\bG2[01]\b/.test(line)) program.units = /\bG20\b/.test(line) ? "inch" : "mm";
    const wcs = /\b(G5[4-9])\b/.exec(line); if (wcs) program.wcs = wcs[1];
    const t = /(?:^|\s)T(\d+)\b/.exec(line), m6 = /\bM0?6\b/.test(line);
    if (t && m6) { block.type = "tool-change"; block.tool = Number(t[1]); program.stats.toolChanges++; if (!program.tools.includes(block.tool)) program.tools.push(block.tool); }
    const s = /(?:^|\s)S(\d+)\b/.exec(line); if (s) block.rpm = Number(s[1]);
    if (/\bM0?3\b/.test(line)) block.spindle = "cw"; if (/\bM0?4\b/.test(line)) block.spindle = "ccw";
    if (/\bM0?8\b/.test(line)) block.coolant = "flood"; if (/\bM0?9\b/.test(line)) block.coolant = "off";
    // motion classification — explicit G0-3 wins; G28/G30/G53 (return-to-reference) and
    // G43/G44 (tool-length-comp approach) are RAPID regardless of the prior modal group
    // (do NOT inherit a stale arc/feed modal — that mis-counts home/approach lines as arcs).
    const explicitG = /\bG0?([0-3])\b/.exec(line);
    const isHome = /\bG(?:28|30|53)\b/.test(line);
    const isToolLen = /\bG4[34]\b/.test(line);
    if (explicitG) modalG = Number(explicitG[1]);
    const hasMotion = /[XYZ]-?\d/.test(line);
    if (hasMotion) {
      let kind = null;
      if (isHome) kind = "rapid";
      else if (explicitG) kind = modalG === 0 ? "rapid" : modalG === 1 ? "feed" : "arc";
      else if (isToolLen) kind = "rapid";
      else if (modalG != null) kind = modalG === 0 ? "rapid" : modalG === 1 ? "feed" : "arc";
      if (kind) {
        block.type = "motion"; block.motion = kind;
        for (const ax of ["X", "Y", "Z", "I", "J", "R"]) { const mm = new RegExp(ax + "(-?[\\d.]+)").exec(line); if (mm) block[ax.toLowerCase()] = Number(mm[1]); }
        const f = /F([\d.]+)/.exec(line); if (f) { block.feed = Number(f[1]); modalF = block.feed; } else if (kind !== "rapid") block.feed = modalF;
        if (kind === "rapid") program.stats.rapids++; else if (kind === "arc") program.stats.arcs++; else program.stats.feeds++;
      }
    }
    if (/\bM30\b|\bM0?2\b/.test(line)) block.type = "program-end";
    program.blocks.push(block);
  }
  program.blockCount = program.blocks.length;
  return program;
}

// ── delta-style compare: our datablocks vs WinMax's (or two programs) ──
export function compareDatablocks(a, b) {
  const diffs = [];
  const fields = ["programNumber", "units", "wcs", "blockCount"];
  for (const f of fields) if (a[f] !== b[f]) diffs.push({ field: f, ours: a[f], theirs: b[f] });
  const aT = (a.tools || []).join(","), bT = (b.tools || []).join(",");
  if (aT !== bT) diffs.push({ field: "tools", ours: aT, theirs: bT });
  for (const k of Object.keys(a.stats || {})) if ((a.stats || {})[k] !== (b.stats || {})[k]) diffs.push({ field: "stats." + k, ours: a.stats[k], theirs: (b.stats || {})[k] });
  return { equivalent: diffs.length === 0, diffCount: diffs.length, diffs };
}

// ── the bridge: action executor over a pluggable transport ──
const ACTIONS = {
  "read-datablocks": (params) => {
    const nc = params.nc != null ? params.nc : (params.ncPath ? readFileSync(params.ncPath, "utf8") : "");
    return atomic(ncToDatablocks(nc), "local:ncToDatablocks");
  },
  "compare": (params) => atomic(compareDatablocks(params.ours, params.theirs), "local:compareDatablocks"),
  "status": () => atomic({ mock: MOCK, transports: Object.keys(WINMAX_WCF) }, "local:status"),
};

export class WinMaxBridge {
  constructor(opts = {}) {
    // per-instance mock flag (read at construction so env changes/tests take effect);
    // default mock-on until a live WCF session is wired.
    this.mock = opts.mock !== undefined ? opts.mock : (process.env.PRISM_WINMAX_MOCK !== "0");
    this.transport = opts.transport || (this.mock ? "local" : "wcf");
    this.wcf = opts.wcf || WINMAX_WCF;
  }

  // local/mock transport: always available, fully deterministic, no WinMax process.
  execute(action, params = {}) {
    if (this.transport === "local" || this.mock) {
      const fn = ACTIONS[action];
      if (!fn) return atomic(null, "local", 0, `unknown action '${action}'`);
      try { return fn(params); } catch (e) { return atomic(null, "local", 0, `action '${action}' failed: ${String(e && e.message || e)}`); }
    }
    // live transports are operator-supervised; never fabricate a result.
    return atomic(null, this.transport, 0, `live transport '${this.transport}' not wired — needs an operator-supervised WinMax session (see winmax-bridge/DESIGN.md). Set PRISM_WINMAX_MOCK=1 for the local interpretation.`);
  }

  // live-discovery (corrected 2026-05-30 against a running stack): the WinMax desktop sim
  // hosts WcfDataService ONLY on net.tcp (4502-4505) + net.pipe — the basicHttpBinding SOAP
  // + mex HTTP endpoints in WcfDataService.exe.config are configured but NOT listening
  // (verified: nothing on :80/:8080; net.tcp:4502 accepts connections). net.tcp WCF is a
  // .NET binary protocol ([MC-NMF] framing + [MC-NBFS] binary SOAP), so the contract
  // (WcfDataServices.IDataService) can't be fetched as HTTP WSDL — it needs a .NET client
  // (svcutil/ChannelFactory) or a raw [MC-NMF] node impl. This probe reports reachability +
  // the chosen-transport requirement; it does NOT fabricate operations.
  probeWcfLive(opts = {}) {
    const host = opts.host || "127.0.0.1", port = opts.port || 4502, timeout = opts.timeout || 1500;
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); } };
      const s = net.connect(port, host);
      s.setTimeout(timeout);
      s.on("connect", () => { s.destroy(); finish(atomic({ transport: "net.tcp", endpoint: `net.tcp://${host}:${port}/DataServicetcp`, contract: "WcfDataServices.IDataService", reachable: true, httpHosted: false, needs: ".NET WCF client (svcutil/ChannelFactory net.tcp) or [MC-NMF] node impl — no HTTP WSDL is hosted" }, "wcf", 1)); });
      s.on("timeout", () => { s.destroy(); finish(atomic(null, "wcf", 0, `net.tcp ${host}:${port} timeout — is the WinMax RT stack running?`)); });
      s.on("error", (e) => { finish(atomic(null, "wcf", 0, `net.tcp ${host}:${port} unreachable (${e && e.code || e}) — start the WinMax RT stack`)); });
    });
  }
}

// ── CLI ──
async function main() {
  const a = process.argv.slice(2);
  const get = (k, d) => { const i = a.indexOf("--" + k); return i >= 0 ? a[i + 1] : d; };
  const bridge = new WinMaxBridge();
  if (a.includes("--probe-wcf")) { console.log(JSON.stringify(await bridge.probeWcfLive(), null, 2)); return; }
  const action = get("action", "read-datablocks");
  const ncPath = get("nc", null);
  const res = bridge.execute(action, { ncPath });
  console.log(JSON.stringify(res, null, 2));
}
const invokedDirectly = process.argv[1] && /winmax-bridge\.mjs$/.test(process.argv[1].replace(/\\/g, "/"));
if (invokedDirectly) main().catch((e) => { console.error(String(e && e.message || e)); process.exit(2); });
