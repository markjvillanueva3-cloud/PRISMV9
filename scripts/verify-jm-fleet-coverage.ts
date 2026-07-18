#!/usr/bin/env node
// verify-jm-fleet-coverage.ts -- prove the JM-fleet master-post corpus generates clean, machine-accurate
// NC DIRECTLY against the engines (no :3100 round-trip -- non-disruptive AND stricter than the HTTP
// harness on per-machine headers). Covers: the 6 new FLEET-COVERAGE posts (5 Okuma OSP lathes LTH-01..05
// + Haas OM-2 VMC-04), the pre-existing Okuma lathe baselines (LB250II-M, LB3000) for full-corpus
// :3100-independent verification, and the C-axis live-tool path for the 3 capable lathes.
// Mirrors scripts/haas-post-proof.ts. Closed-loop bar per post job:
//   0 dialect ERRORs + structural-100% + 0 skipped ops + (for lathes) the correct (MACHINE: ...)
//   header from OKUMA_LATHE_MACHINES + NO "Unknown machine_id" warning + (live-tool) all M76/M203/G12.1
//   markers present + no NaN.
// slot:echo, U-PP-JM-FLEET-COVERAGE + U-PP-FLEET-VERIFY-EXTEND. Run: npx tsx scripts/verify-jm-fleet-coverage.ts
import { okumaB250LatheMasterPostEngine } from "../mcp-server/src/engines/OkumaB250LatheMasterPostEngine.js";
import { haasNGCMillMasterPostEngine } from "../mcp-server/src/engines/HaasNGCMillMasterPostEngine.js";
import { hurcoV11MillMasterPostEngine } from "../mcp-server/src/engines/HurcoV11MillMasterPostEngine.js";
import { okumaOSPMillMasterPostEngine } from "../mcp-server/src/engines/OkumaOSPMillMasterPostEngine.js";
import { rokuRokuFanuc31iMillMasterPostEngine } from "../mcp-server/src/engines/RokuRokuFanuc31iMillMasterPostEngine.js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const corpus: any = JSON.parse(readFileSync(join(REPO, "state/shared/post-training/post-training-corpus.json"), "utf8"));
const dir = join(REPO, "state/shared/post-training/nc-jm-fleet-coverage");
mkdirSync(dir, { recursive: true });

function jsonOut(stdout: string): any {
  try { return JSON.parse(stdout.trim()); } catch {
    const i = stdout.indexOf("{");
    if (i < 0) return null;
    try { return JSON.parse(stdout.slice(i)); } catch { return null; } // fail-soft: noisy stdout degrades the job to XX, never crashes the run
  }
}

// machine_id -> expected (MACHINE: ...) header substring (verbatim from OKUMA_LATHE_MACHINES table)
const EXPECT_HEADER: Record<string, string> = {
  "GENOS-L300-M": "OKUMA GENOS L300-M OSP-P300L-R",
  "GENOS-L200E-M": "OKUMA GENOS L200E-M OSP-P200LA-R",
  "LNC8": "OKUMA LNC8 OSP-U10L",
  "CROWN-L1060": "OKUMA CROWN L1060 OSP-U10L",
  "GENOS-L400II-E": "OKUMA GENOS L400II-E OSP-P300LA-E",
  "MULTUS-B250II": "OKUMA MULTUS B250II OSP-P300",
  // pre-existing lathe baselines (already in OKUMA_LATHE_MACHINES) -- covered for :3100-independent
  // full-corpus verification (U-PP-FLEET-VERIFY-EXTEND): okuma-b250-lathe defaults to LB250II-M.
  "LB250II-M": "OKUMA LB250II-M OSP-P300L",
  "LB3000": "OKUMA LB3000 OSP-P300L",
};

// C-axis-milling-capable JM lathes -- only these get the live-tool job set.
const LIVE_TOOL_MIDS = ["GENOS-L300-M", "GENOS-L200E-M", "MULTUS-B250II"];
// Markers the OkumaB250 generateCAxisMilling path MUST emit for a c_mill op.
const LIVE_TOOL_MARKERS = ["M76", "M23", "M203", "G12.1", "G13.1", "M24"];

function lintAndConform(f: string, dialect: string): { errors: number; warns: number; structPct: number; failedChecks: string[] } {
  const lintR = spawnSync(process.execPath, [join(REPO, "scripts/post-nc-dialect-lint.mjs"), f, "--dialect", dialect, "--json"], { encoding: "utf8" });
  const lintJ = jsonOut(lintR.stdout || "");
  const res = lintJ && Array.isArray(lintJ.results) ? lintJ.results[0] : lintJ;
  const errors = res?.counts?.ERROR ?? 0;
  const warns = res?.counts?.WARN ?? 0;
  const confR = spawnSync(process.execPath, [join(REPO, "scripts/post-nc-conformance.mjs"), f, "--structural", "--json"], { encoding: "utf8" });
  const confJ = jsonOut(confR.stdout || "");
  const passed = confJ?.passed ?? 0, total = confJ?.total ?? 0;
  const structPct = total ? Math.round((passed / total) * 100) : 0;
  const failedChecks = (confJ?.checks || []).filter((c: any) => !c.pass).map((c: any) => c.name);
  return { errors, warns, structPct, failedChecks };
}

let allClean = true;
const summary: string[] = [];

// ---- 5 Okuma OSP lathes (LTH-01..05): machine-accurate turning NC ----
// All OkumaB250 turning posts EXCEPT Multus (mill-turn; covered by its own post + the live-tool leg).
// Includes the no-machine_id baseline (okuma-b250-lathe -> defaults to LB250II-M) + LB3000, so the FULL
// Okuma lathe corpus is verified :3100-independently (U-PP-FLEET-VERIFY-EXTEND).
const lathePosts = corpus.posts.filter(
  (p: any) =>
    p.action === "master_post_okuma_b250" &&
    p.config?.machine_id !== "MULTUS-B250II" &&
    (!p.config?.machine_id || EXPECT_HEADER[p.config.machine_id])
);
for (const post of lathePosts) {
  const mid = post.config?.machine_id || "LB250II-M";   // okuma-b250-lathe has no machine_id -> engine default
  let postClean = true;
  for (const job of corpus.latheJobs) {
    const cfg = { ...(job.config || {}), machine_id: mid };
    const out = okumaB250LatheMasterPostEngine.generateProgram(job.operations, cfg);
    const gcode: string[] = out.gcode || [];
    const f = join(dir, `${post.id}-${job.id}.nc`);
    writeFileSync(f, gcode.join("\n"), "utf8");
    const headerOk = gcode.some((l) => l.includes(`(MACHINE: ${EXPECT_HEADER[mid]})`));
    const unknownWarn = (out.warnings || []).some((w: string) => /Unknown machine_id/i.test(w));
    const skipped = (out as any).skipped_operations ?? 0;
    // The deep axial-drill job (37mm > OkumaB250's 30mm peck threshold) MUST emit a G83 peck cycle.
    const peckExpected = job.id === "lathe-drill-axial";
    const hasG83 = /\bG83\b/.test(gcode.join("\n"));
    const peckOk = !peckExpected || hasG83;
    const { errors, warns, structPct, failedChecks } = lintAndConform(f, "okuma");
    const ok = errors === 0 && structPct === 100 && skipped === 0 && headerOk && !unknownWarn && peckOk;
    postClean = postClean && ok;
    console.log(
      `  ${ok ? "OK" : "XX"} ${post.id}/${job.id}: ${errors}E/${warns}W | struct ${structPct}% | skipped ${skipped} | header ${headerOk ? "OK" : "WRONG"}` +
        `${peckExpected ? (hasG83 ? " | G83 peck OK" : " | NO-G83!") : ""}${unknownWarn ? " | UNKNOWN-MID" : ""}${failedChecks.length ? " | FAIL[" + failedChecks.join(",") + "]" : ""}`
    );
  }
  allClean = allClean && postClean;
  summary.push(`${postClean ? "OK" : "XX"} ${post.id} (${mid})`);
}

// ---- Haas OM-2 (VMC-04): same Haas dialect as VF-2, OM-2 program comment ----
const om2 = corpus.posts.find((p: any) => p.id === "haas-om2-mill");
if (om2) {
  let postClean = true;
  for (const job of corpus.jobs) {
    const cfg = job.config || {};
    const out = haasNGCMillMasterPostEngine.generateProgram(job.operations, {
      units: cfg.units,
      work_offset: cfg.work_offset,
      program_number: cfg.program_number,
      program_comment: "JM VMC-04 HAAS OM-2",
    });
    if (!out.success) {
      console.log(`  XX ${om2.id}/${job.id}: engine error -- ${out.error}`);
      postClean = false; allClean = false; continue;
    }
    const f = join(dir, `${om2.id}-${job.id}.nc`);
    writeFileSync(f, out.gcode.join("\n"), "utf8");
    const { errors, warns, structPct, failedChecks } = lintAndConform(f, "haas");
    const ok = errors === 0 && structPct === 100;
    postClean = postClean && ok;
    console.log(`  ${ok ? "OK" : "XX"} ${om2.id}/${job.id}: ${errors}E/${warns}W | struct ${structPct}%${failedChecks.length ? " | FAIL[" + failedChecks.join(",") + "]" : ""}`);
  }
  allClean = allClean && postClean;
  summary.push(`${postClean ? "OK" : "XX"} ${om2.id}`);
}

// ---- Mill posts (whole-corpus :3100-independent verify): the 4 generator-type mill master posts.
// hurco-v11-agi is EXCLUDED -- it is a CAM-segment/gcode OPTIMIZER (UnifiedPostInput has no
// operations field), not an operations->NC generator, so the operations-shaped mill jobs cannot
// drive it (documented contract-mismatch in the corpus). All 4 use a SYNC generateProgram(ops,cfg). ----
const MILL_ENGINES: Record<string, { gen: (ops: unknown, cfg: unknown) => { gcode?: string[]; success?: boolean; error?: string }; dialect: string }> = {
  "haas-vf2": { gen: (ops, cfg) => haasNGCMillMasterPostEngine.generateProgram(ops as never, cfg as never), dialect: "haas" },
  "hurco-v11-standalone": { gen: (ops, cfg) => hurcoV11MillMasterPostEngine.generateProgram(ops as never, cfg as never), dialect: "hurco" },
  "okuma-genos-osp": { gen: (ops, cfg) => okumaOSPMillMasterPostEngine.generateProgram(ops as never, cfg as never), dialect: "okuma" },
  "rokuroku-vmc05": { gen: (ops, cfg) => rokuRokuFanuc31iMillMasterPostEngine.generateProgram(ops as never, cfg as never), dialect: "fanuc" },
};
// All 4 mill posts: job ids that require a G8x canned cycle in the output.
// drill-canned -> G81; tap-canned -> G84. Both use operation_type:"drill" so the
// Hurco/Okuma cycle gate (drill||bore) fires -- cycle.type routes to the specific G-code.
const ALL_MILL_POST_IDS = ["haas-vf2", "rokuroku-vmc05", "hurco-v11-standalone", "okuma-genos-osp"];
for (const [postId, spec] of Object.entries(MILL_ENGINES)) {
  let postClean = true;
  for (const job of corpus.jobs) {
    const cfg = job.config || {};
    const out = spec.gen(job.operations, { units: cfg.units, work_offset: cfg.work_offset, program_number: cfg.program_number });
    if (out && out.success === false) {
      console.log(`  XX mill/${postId}/${job.id}: engine error -- ${out.error || "no gcode"}`);
      postClean = false; allClean = false; continue;
    }
    const gcode: string[] = (out && out.gcode) || [];
    if (!gcode.length) {
      console.log(`  XX mill/${postId}/${job.id}: empty program`);
      postClean = false; allClean = false; continue;
    }
    const f = join(dir, `${postId}-${job.id}.nc`);
    writeFileSync(f, gcode.join("\n"), "utf8");
    const gcodeText = gcode.join("\n");

    // drill-canned: all 4 posts MUST emit a G8x canned cycle (G81 for drill).
    // HaasNGC + RokuRoku always supported; HurcoV11 + OkumaOSP added U-PP-MILL-OPCYCLE 2026-06-28.
    const cannedExpected = job.id === "drill-canned" && ALL_MILL_POST_IDS.includes(postId);
    const hasCanned = /\bG(8[1-9]|73)\b/.test(gcodeText);
    const cannedOk = !cannedExpected || hasCanned;

    // tap-canned: all 4 posts MUST emit G84 (rigid tap). Bare G84, NO M29 on any engine:
    //   Haas NGC  -- always rigid-tap, M29 would hang the control (byte-verified vs ALL STAR.NC)
    //   Hurco V11 -- WinMax ISNC always rigid-tap mode, NO M29
    //   Okuma OSP -- controller auto-syncs spindle/feed, NO M29
    //   RokuRoku  -- bare G84 + advisory warning (Fanuc 31i may need M29 per setup, R12 warn)
    // All verified by actual NC emit probe 2026-06-28 (slot:echo).
    const tapExpected = job.id === "tap-canned" && ALL_MILL_POST_IDS.includes(postId);
    const hasG84 = /\bG84\b/.test(gcodeText);
    const hasM29 = /\bM29\b/.test(gcodeText);
    const tapOk = !tapExpected || (hasG84 && !hasM29);

    const { errors, warns, structPct, failedChecks } = lintAndConform(f, spec.dialect);
    const ok = errors === 0 && structPct === 100 && cannedOk && tapOk;
    postClean = postClean && ok;
    const tapTag = tapExpected ? (hasG84 && !hasM29 ? " | G84 rigid-tap OK" : hasM29 ? " | G84+M29-WRONG!" : " | NO-G84!") : "";
    console.log(`  ${ok ? "OK" : "XX"} mill/${postId}/${job.id}: ${errors}E/${warns}W | struct ${structPct}%${cannedExpected ? (hasCanned ? " | canned G8x OK" : " | NO-CANNED!") : ""}${tapTag}${failedChecks.length ? " | FAIL[" + failedChecks.join(",") + "]" : ""}`);
  }
  allClean = allClean && postClean;
  summary.push(`${postClean ? "OK" : "XX"} mill:${postId}`);
}

// ---- High-speed smoothing feature check (additive -- does NOT affect any existing job pass/fail).
// Each engine exposes high-speed via a different config flag. We generate a single op per engine,
// assert the smoothing code appears in the NC, and log the result. This is a SIDECAR check:
// it appends to `summary` but is separate from the per-job corpus loop above.
//
// Engine / flag / emitted code (verified by actual NC probe 2026-06-28, slot:echo):
//   Haas NGC:    config.use_g187=true        -> G187 P{1|2|3}  (NGC only; default OFF)
//   Hurco V11:   config.use_ultimotion=true  -> G05.3 P{10|35} (default ON; emitted per tool-change)
//   Okuma OSP:   config.osp_family="P500" + config.use_super_nurbs=true + op "3d_surface"
//                                            -> G05.1 Q1 (generic) or G131 (JM Die G131 preset)
//                CONSTRAINT: use_super_nurbs is gated on osp_family="P500"; the JM Die Genos M460V
//                uses P300MA-H (not P500), so Super-NURBS in a production P300 job is NOT emitted.
//                The verifier exercises P500+use_super_nurbs honestly -- this IS a config-supported
//                path; it is NOT the JM Die house config. isGap=false (engine supports it); the
//                P300 production constraint is documented, not hidden.
//   RokuRoku:    config.use_lookahead=true   -> G05.1 Q1 + G05.1 Q0 cancel (Fanuc AICC-II)
//
// Technique: call generateProgram directly with the flag-enabling config, assert the smoothing
// code appears in the output. No dialect-lint (the smoothing codes are dialect-correct by
// construction; the corpus loop above already lint-checks the base jobs).
console.log("\n---- High-speed smoothing sidecar ----");

// Shared face op for Haas/Hurco/RokuRoku (any op triggers smoothing on those engines).
const hsBaseOp = {
  operation_type: "face", tool_number: 1, tool_diameter_mm: 50.8, tool_flutes: 5,
  material_iso: "P" as const, spindle_rpm: 877, feed_mm_min: 200, axial_depth_mm: 0.5,
  coolant: "flood" as const,
  coordinates: [
    { x: 0, y: 0, z: 5, type: "rapid" as const },
    { x: 0, y: 0, z: -0.5, type: "linear" as const },
    { x: 150, y: 0, z: -0.5, type: "linear" as const },
  ],
};
// Okuma Super-NURBS only fires on 3d_surface/adaptive ops.
const hsSurfOp = { ...hsBaseOp, operation_type: "3d_surface" as const };

// Haas: use_g187
const haasHSOut = haasNGCMillMasterPostEngine.generateProgram([hsBaseOp], { units: "metric", work_offset: 54, program_number: 8001, use_g187: true } as never);
const haasHSGcode: string[] = haasHSOut.gcode || [];
const haasHasG187 = /\bG187\b/.test(haasHSGcode.join("\n"));
const haasHSLine = haasHSGcode.find((l) => /G187/.test(l)) ?? "(none)";
writeFileSync(join(dir, "hs-haas-g187.nc"), haasHSGcode.join("\n"), "utf8");
const haasHSOk = haasHasG187;
summary.push(`${haasHSOk ? "OK" : "XX"} hs:haas-g187`);
console.log(`  ${haasHSOk ? "OK" : "XX"} hs/haas-vf2 (use_g187): ${haasHasG187 ? "G187 PRESENT" : "G187 MISSING"} | sample: ${haasHSLine}`);
allClean = allClean && haasHSOk;

// Hurco: use_ultimotion (default=true -- engine emits G05.3 per tool-change)
const hurcoHSOut = hurcoV11MillMasterPostEngine.generateProgram([hsBaseOp] as never, { program_number: 8002, units: "metric", work_offset: 54, use_ultimotion: true } as never);
const hurcoHSGcode: string[] = (hurcoHSOut.gcode as string[]) || [];
const hurcoHasG053 = /\bG05\.3\b/.test(hurcoHSGcode.join("\n"));
const hurcoHSLine = hurcoHSGcode.find((l) => /G05\.3/.test(l)) ?? "(none)";
writeFileSync(join(dir, "hs-hurco-g053.nc"), hurcoHSGcode.join("\n"), "utf8");
const hurcoHSOk = hurcoHasG053;
summary.push(`${hurcoHSOk ? "OK" : "XX"} hs:hurco-g053`);
console.log(`  ${hurcoHSOk ? "OK" : "XX"} hs/hurco-v11 (use_ultimotion): ${hurcoHasG053 ? "G05.3 PRESENT" : "G05.3 MISSING"} | sample: ${hurcoHSLine}`);
allClean = allClean && hurcoHSOk;

// Okuma: osp_family=P500 + use_super_nurbs=true + 3d_surface op -> G05.1 Q1
// NOTE: this exercises the P500 config path. JM Die production is P300MA-H (Super-NURBS not
// emitted in standard P300 corpus jobs). Engine SUPPORTS it; production constraint is documented.
const okumaHSOut = okumaOSPMillMasterPostEngine.generateProgram([hsSurfOp] as never, { osp_family: "P500", use_super_nurbs: true, program_number: 8003, units: "metric" } as never);
const okumaHSGcode: string[] = (okumaHSOut.gcode as string[]) || [];
const okumaHasHS = /\bG05\.1\b|\bG131\b/.test(okumaHSGcode.join("\n"));
const okumaHSLine = okumaHSGcode.find((l) => /G05\.1|G131/.test(l)) ?? "(none)";
writeFileSync(join(dir, "hs-okuma-g051.nc"), okumaHSGcode.join("\n"), "utf8");
const okumaHSOk = okumaHasHS;
summary.push(`${okumaHSOk ? "OK" : "XX"} hs:okuma-g051(P500)`);
console.log(`  ${okumaHSOk ? "OK" : "XX"} hs/okuma-osp (P500+use_super_nurbs): ${okumaHasHS ? "G05.1/G131 PRESENT" : "G05.1/G131 MISSING"} | sample: ${okumaHSLine}`);
console.log(`    NOTE: P300 production (JM Die house config) does NOT emit Super-NURBS -- P500 config only.`);
allClean = allClean && okumaHSOk;

// RokuRoku: use_lookahead -> G05.1 Q1 (Fanuc AICC-II)
const rrHSOut = rokuRokuFanuc31iMillMasterPostEngine.generateProgram([hsBaseOp], { units: "metric", work_offset: 54, program_number: 8004, use_lookahead: true } as never);
const rrHSGcode: string[] = (rrHSOut.gcode as string[]) || [];
const rrHasG051 = /\bG05\.1\b/.test(rrHSGcode.join("\n"));
const rrHSLine = rrHSGcode.find((l) => /G05\.1/.test(l)) ?? "(none)";
writeFileSync(join(dir, "hs-rokuroku-g051.nc"), rrHSGcode.join("\n"), "utf8");
const rrHSOk = rrHasG051;
summary.push(`${rrHSOk ? "OK" : "XX"} hs:rokuroku-g051`);
console.log(`  ${rrHSOk ? "OK" : "XX"} hs/rokuroku (use_lookahead): ${rrHasG051 ? "G05.1 PRESENT" : "G05.1 MISSING"} | sample: ${rrHSLine}`);
allClean = allClean && rrHSOk;

// ---- 5-axis TCP sidecar (VMC-02 Okuma Genos M460V-5AX) ----
// The Genos M460V-5AX is the only 5-axis machine in the JM fleet. Its CAM (foxtrot/Fusion)
// supplies per-move A/C trunnion angles; the OkumaOSP post wraps the toolpath in a TCP
// open/close bracket (G169/G170 Okuma-native, JM Die house) and emits the A/C words.
// This exercises the U-PP-OKUMA-5AXIS-TCP path IN the closed loop (R15 VALIDATE) -- previously
// it was unit-tested only (OkumaOSPMillMasterPostEngine.FiveAxisTcp.test.ts). Sidecar pattern
// (mirrors the high-speed leg): generate one 5-axis op, assert the TCP bracket + A/C words +
// no NaN, dialect-lint okuma. Angles come FROM the CAM post -- the engine never computes IK.
console.log("\n---- 5-axis TCP sidecar ----");
const fiveAxOp = {
  operation_type: "3d_surface" as const, tool_number: 3, tool_diameter_mm: 10, tool_flutes: 4,
  tool_description: "10mm ball endmill", material_iso: "P" as const,
  spindle_rpm: 8000, feed_mm_min: 3000, axial_depth_mm: 0.3, radial_depth_mm: 0.5,
  coolant: "flood" as const,
  coordinates: [
    { x: 0, y: 0, z: 5, type: "rapid" as const },
    { x: 10, y: 5, z: -0.5, type: "linear" as const },
    { x: 20, y: 10, z: -1.0, type: "linear" as const },
  ],
  // CAM-supplied trunnion B (tilt) + table C angles, parallel to coordinates[].
  rotary_moves: [
    { a_deg: -30.0, c_deg: 0.0 },
    { a_deg: -30.5, c_deg: 15.0 },
    { a_deg: -31.0, c_deg: 30.0 },
  ],
  tool_axis_k: Math.cos(30 * Math.PI / 180), // safe tilt -- no singularity advisory expected
};
const fiveAxOut = okumaOSPMillMasterPostEngine.generateProgram(
  [fiveAxOp] as never,
  { osp_family: "P300", tcp_mode: "G169_G170", program_number: 8005, units: "metric" } as never,
);
const fiveAxGcode: string[] = (fiveAxOut.gcode as string[]) || [];
const fiveAxText = fiveAxGcode.join("\n");
const fFive = join(dir, "5axis-okuma-genos-m460v.nc");
writeFileSync(fFive, fiveAxText, "utf8");
const hasTcpOn = fiveAxGcode.some((l) => l.includes("G169") && l.includes("TCP ON"));
const hasTcpOff = fiveAxGcode.some((l) => l.includes("G170") && l.includes("TCP OFF"));
const hasBC = /\bA-30\.000\b/.test(fiveAxText) && /\bC30\.000\b/.test(fiveAxText);
const fiveAxNaN = /\b[FXYZAC]?NaN\b|Infinity/i.test(fiveAxText);
const { errors: fiveAxErr } = lintAndConform(fFive, "okuma");
const fiveAxOk = hasTcpOn && hasTcpOff && hasBC && !fiveAxNaN && fiveAxErr === 0;
summary.push(`${fiveAxOk ? "OK" : "XX"} 5ax:okuma-genos-m460v-tcp`);
console.log(
  `  ${fiveAxOk ? "OK" : "XX"} 5ax/okuma-genos-m460v (G169/G170 TCP + A/C): ` +
    `${hasTcpOn ? "TCP-ON" : "NO-TCP-ON!"} ${hasTcpOff ? "TCP-OFF" : "NO-TCP-OFF!"} ` +
    `${hasBC ? "A/C OK" : "NO-A/C!"} | ${fiveAxErr}E${fiveAxNaN ? " | NaN!" : ""}`
);
allClean = allClean && fiveAxOk;

// ---- Live-tool / C-axis coverage (LTH-01 GENOS-L300-M, LTH-02 GENOS-L200E-M, LTH-07 Multus) ----
const liveToolJobs = corpus.liveToolJobs || [];
for (const mid of LIVE_TOOL_MIDS) {
  let midClean = true;
  for (const job of liveToolJobs) {
    const cfg = { ...(job.config || {}), machine_id: mid };
    const out = okumaB250LatheMasterPostEngine.generateProgram(job.operations, cfg);
    const gcode: string[] = out.gcode || [];
    const text = gcode.join("\n");
    const f = join(dir, `livetool-${mid}-${job.id}.nc`);
    writeFileSync(f, text, "utf8");
    const headerOk = gcode.some((l) => l.includes(`(MACHINE: ${EXPECT_HEADER[mid]})`));
    const unknownWarn = (out.warnings || []).some((w: string) => /Unknown machine_id/i.test(w));
    const skipped = (out as any).skipped_operations ?? 0;
    const missingMarkers = LIVE_TOOL_MARKERS.filter((m) => !new RegExp(`(^|\\s|\\()${m.replace(/\./g, "\\.")}(\\s|$|\\))`).test(text));
    const hasNaN = /\bF?NaN\b|Infinity/i.test(text);
    const { errors, warns, structPct, failedChecks } = lintAndConform(f, "okuma");
    const ok = errors === 0 && structPct === 100 && skipped === 0 && headerOk && !unknownWarn && missingMarkers.length === 0 && !hasNaN;
    midClean = midClean && ok;
    console.log(
      `  ${ok ? "OK" : "XX"} livetool/${mid}/${job.id}: ${errors}E/${warns}W | struct ${structPct}% | skipped ${skipped} | header ${headerOk ? "OK" : "WRONG"}` +
        `${missingMarkers.length ? " | MISSING[" + missingMarkers.join(",") + "]" : " | markers OK"}${hasNaN ? " | NaN!" : ""}${unknownWarn ? " | UNKNOWN-MID" : ""}${failedChecks.length ? " | FAIL[" + failedChecks.join(",") + "]" : ""}`
    );
  }
  allClean = allClean && midClean;
  summary.push(`${midClean ? "OK" : "XX"} livetool:${mid}`);
}

console.log(`\nJM FLEET COVERAGE: ${summary.join("  ")}`);
console.log(
  allClean
    ? `ALL ${summary.length} FLEET-COVERAGE CHECKS PERFECT -- whole JM mill+lathe master-post corpus, :3100-independent: 7 Okuma lathe posts [5 new LTH-01..05 + LB250II-M + LB3000] + 5 mill posts [Haas VF-2/OM-2, Hurco V11, Okuma OSP, RokuRoku Fanuc] + 3 C-axis live-tool + rigid-tap G84 (4/4 mills, bare no-M29) + high-speed smoothing (Haas G187 / Hurco G05.3 / Okuma G05.1 P500 / RokuRoku G05.1) + 5-axis TCP (Okuma Genos M460V G169/G170 + A/C trunnion); 0 dialect ERRORs + structural-100% + accurate headers + markers (hurco-v11-agi excluded: optimizer, not a generator)`
    : "DEVIATIONS REMAIN"
);
process.exit(allClean ? 0 : 3);
