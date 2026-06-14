#!/usr/bin/env node
/**
 * winmax-probe.mjs — READ-ONLY discovery of Hurco WinMax's automation surface (slot:echo).
 *
 * Delta's CAD/CAM bridges spawn the app with a documented hook (Mastercam NET-Hook, Esprit
 * VBScript COM) + named-pipe IPC. WinMax exposes NO public automation API, so before any
 * driver can exist we must DISCOVER what is actually drivable. This probe is the logical-first
 * step (R13): it inventories the install, configs, registry, file associations, the WCF data
 * service, and the datablock-XML tooling, then classifies the candidate transports
 * (cli-arg / folder-watch / wcf / datablock-xml / ui-automation) by feasibility.
 *
 * SAFETY: strictly read-only. It does NOT launch WinMaxMill.exe / CNC_RT.exe / the GUI/RT
 * services (that would spawn windows + background services on the operator's machine). Any
 * transport that needs a live launch is reported as "needs-live-probe" for an operator-
 * supervised session — never auto-launched here.
 *
 * Usage: node scripts/winmax-probe.mjs [--json] [--out <path>]
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const INSTALL_DIRS = [
  "C:/Program Files/Hurco/MT WinMax Desktop",
  "C:/Program Files (x86)/Hurco/DS WinMax Mill",
  "C:/Hurco/WinMax",
  "C:/Users/wompu/AppData/Local/Hurco/MT WinMax Mill",
  "C:/Users/wompu/AppData/Local/Hurco/MT WinMax Lathe",
];

function safe(fn, dflt) { try { return fn(); } catch (e) { return dflt; } }
function lsExes(dir) { return safe(() => readdirSync(dir).filter((f) => /\.exe$/i.test(f)).map((f) => ({ name: f, kb: Math.round(statSync(path.join(dir, f)).size / 1024) })), []); }
function reg(query) { return safe(() => execFileSync("reg", ["query", query], { encoding: "utf8", timeout: 8000, stdio: ["ignore", "pipe", "ignore"] }), ""); }
function cmd(args) { return safe(() => execFileSync(process.env.ComSpec || "cmd", ["/c", ...args], { encoding: "utf8", timeout: 8000, stdio: ["ignore", "pipe", "ignore"] }), ""); }

const report = { probedAt: new Date().toISOString().slice(0, 10), installs: [], configs: [], registry: {}, fileAssoc: {}, datablockTool: null, wcf: null, candidateTransports: [], notes: [] };

// 1. installs + executables
for (const dir of INSTALL_DIRS) {
  if (!existsSync(dir)) continue;
  const exes = lsExes(dir);
  report.installs.push({ dir, exeCount: exes.length, key: exes.filter((e) => /WinMax(Mill|Lathe)?\.exe|CNC_RT|WcfDataService|CNC_Launcher|CNC_Isa|SerialProgram/i.test(e.name)) });
}

// 2. config XMLs that may reveal service endpoints / watch folders / ports
const CONFIG_HINTS = ["WinmaxHelperServiceSettings.xml", "CNC_HelperAgent.xml", "WcfDataService.exe.config", "CNC_RT.exe.config", "appsettings.json"];
for (const dir of INSTALL_DIRS) {
  for (const cfg of CONFIG_HINTS) {
    const p = path.join(dir, cfg);
    if (!existsSync(p)) continue;
    const txt = safe(() => readFileSync(p, "utf8"), "");
    const ports = [...txt.matchAll(/(?:port|baseAddress|endpoint|:)(\d{3,5})\b/gi)].map((m) => m[1]);
    const pipes = [...txt.matchAll(/net\.pipe:\/\/[^\s"<]+|\\\\\.\\pipe\\[^\s"<]+/gi)].map((m) => m[0]);
    const folders = [...txt.matchAll(/[A-Za-z]:\\[^\s"<>|]+/g)].map((m) => m[0]).slice(0, 6);
    report.configs.push({ file: p, bytes: txt.length, ports: [...new Set(ports)].slice(0, 8), pipes: [...new Set(pipes)].slice(0, 5), folders });
    if (/WcfDataService/i.test(cfg) && (ports.length || pipes.length)) report.wcf = { config: p, ports: [...new Set(ports)], pipes: [...new Set(pipes)] };
  }
}

// 3. datablock-XML tooling (program <-> XML conversion = a file-based transport candidate)
for (const dir of INSTALL_DIRS) {
  const dll = path.join(dir, "WinMaxDataBlockXMLTools.dll");
  if (existsSync(dll)) { report.datablockTool = { dll, kb: Math.round(statSync(dll).size / 1024) }; break; }
}

// 4. registry — Hurco install metadata, any documented CLI / watch path
for (const key of ["HKLM\\SOFTWARE\\Hurco", "HKCU\\SOFTWARE\\Hurco", "HKLM\\SOFTWARE\\WOW6432Node\\Hurco"]) {
  const out = reg(key);
  if (out && out.trim()) report.registry[key] = out.split(/\r?\n/).filter(Boolean).slice(0, 20);
}

// 5. file associations for NC + Hurco program extensions
for (const ext of [".nc", ".hd1", ".max", ".hwp", ".um", ".ncf"]) {
  const a = cmd(["assoc", ext]).trim();
  if (a) { report.fileAssoc[ext] = a; const ft = a.split("=")[1]; if (ft) { const f = cmd(["ftype", ft.trim()]).trim(); if (f) report.fileAssoc[ext + ":cmd"] = f; } }
}

// 6. classify candidate transports by what the evidence supports
function add(transport, feasible, evidence) { report.candidateTransports.push({ transport, feasible, evidence }); }
add("datablock-xml", report.datablockTool ? "likely (needs host)" : "no", report.datablockTool ? `WinMaxDataBlockXMLTools.dll present (${report.datablockTool.kb}KB) — program<->XML; needs a .NET host to invoke` : "tool dll not found");
add("wcf-service", report.wcf ? "needs-live-probe" : "unknown", report.wcf ? `WcfDataService config: ports ${(report.wcf.ports || []).join(",")} pipes ${(report.wcf.pipes || []).join(",")} — requires the RT stack running` : "no WcfDataService config parsed");
add("file-assoc / cli-arg", Object.keys(report.fileAssoc).length ? "needs-live-probe" : "unknown", `assoc: ${JSON.stringify(report.fileAssoc)} — whether WinMaxMill.exe accepts a program path arg needs a supervised launch`);
add("folder-watch (transfer dir)", "needs-live-probe", "SerialProgramFileTransferUtility.exe present — WinMax may watch a transfer/import folder; confirm path with operator");
add("ui-automation (UIA/pywinauto)", "needs-live-probe", "Qt GUI (WinMaxMill.exe) — UIA/pywinauto can drive clicks/keys/reads but requires a live window + UI-tree mapping (operator-supervised)");

report.notes.push("WinMax has NO documented public automation API (unlike Mastercam NET-Hook / Esprit VBScript COM). The bridge transport must be file-based (datablock-XML / folder-watch) and/or UI-automation, validated in an operator-supervised live session.");
report.notes.push("This probe is READ-ONLY — it did not launch any WinMax executable.");

if (process.argv.includes("--json")) { console.log(JSON.stringify(report, null, 2)); }
else {
  console.log("=== WinMax automation-surface probe (" + report.probedAt + ") ===");
  console.log("Installs:"); for (const i of report.installs) console.log("  " + i.dir + "  (" + i.exeCount + " exes; key: " + i.key.map((e) => e.name).join(", ") + ")");
  console.log("Configs parsed: " + report.configs.length + (report.wcf ? "  · WCF ports=" + (report.wcf.ports || []).join(",") : ""));
  console.log("Datablock-XML tool: " + (report.datablockTool ? report.datablockTool.dll : "NOT FOUND"));
  console.log("Registry keys: " + Object.keys(report.registry).join(", ") || "(none)");
  console.log("File assoc: " + JSON.stringify(report.fileAssoc));
  console.log("\nCandidate transports (feasibility):");
  for (const t of report.candidateTransports) console.log("  [" + t.feasible + "] " + t.transport + " — " + t.evidence);
  console.log("\nNotes:"); for (const n of report.notes) console.log("  - " + n);
}
const outArg = process.argv.indexOf("--out");
if (outArg >= 0 && process.argv[outArg + 1]) { writeFileSync(process.argv[outArg + 1], JSON.stringify(report, null, 2)); console.log("\nwrote " + process.argv[outArg + 1]); }
export { report };
