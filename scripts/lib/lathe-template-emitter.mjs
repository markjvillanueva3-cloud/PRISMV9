// lathe-template-emitter.mjs — CLOSED-LOOP-MS0/U-CL5 (slot:whiskey)
//
// RENDERS a U-CL2 toolpath template object → an Okuma-OSP program block, PROPER BY
// CONSTRUCTION: it bakes in the safety gates the assessment (U-CL1) found missing in the
// existing "enhanced" JM programs — a G50 max-RPM cap whenever the template runs G96 CSS,
// and an explicit G95 feed-per-rev declaration (fixes css-no-rpm-cap + feed-mode-undeclared).
// This is the GENERATE side that closes the loop: template → emit → closed-loop-test (U-CL4).
//
// NOT a duplicate of LathePrintProgramEmitterEngine (R8): that engine is the move-level
// production POST from a full generated ToolpathProgram (turret moves, envelope check, dossier);
// this is the lightweight template→canned-cycle SKELETON renderer used to close + test the
// generate loop. It DECIDES nothing — the template (U-CL2) already chose the cycle/params/gates;
// this only renders them, so there is no cycle-selection duplication.
//
// @milestone CLOSED-LOOP-MS0/U-CL5

import { fileURLToPath } from "node:url";
import path from "node:path";

/** Pull a param's default from a U-CL2 template params[] array. */
function paramDefault(template, name, fallback) {
  const p = (template?.params || []).find((x) => x.param === name);
  return p && Number.isFinite(p.default) ? p.default : fallback;
}

/** Render the primary canned-cycle line for a template's cannedCycle + cutting conditions. */
function cycleLine(template, vc, fn, ap) {
  const cyc = template.cannedCycle;
  switch (cyc) {
    case "G71": return `G71 P10 Q20 U0.5 W0.1 D${Math.round((ap ?? 2.5) * 1000)} F${fn}`; // longitudinal rough
    case "G72": return `G72 P10 Q20 U0.5 W0.1 D${Math.round((ap ?? 2.5) * 1000)} F${fn}`; // face rough
    case "G73": return `G73 P10 Q20 U0.5 W0.1 I2.0 K1.0 D3 F${fn}`;                       // pattern rough
    case "G70": return `G70 P10 Q20 F${fn}`;                                              // finish
    case "G75": return `G75 R0.5 P${Math.round((ap ?? 0.3) * 1000)} Q1500 F${fn}`;        // groove/part-off PECK (gate)
    case "G76": return `G76 P020060 Q100 R0.05 F${fn}`;                                    // multi-pass thread
    case "G74": return `G74 R0.5 X0 Z-20.0 P0 Q3000 F${fn}`;                               // peck drill (gate)
    default:    return `G71 P10 Q20 U0.5 W0.1 D${Math.round((ap ?? 2.5) * 1000)} F${fn}`;
  }
}

/**
 * Emit an Okuma-OSP program block from a U-CL2 template — PROPER by construction.
 * @param {object} template  a LatheToolpathTemplateEngine template (cannedCycle, cssMode, params[], category)
 * @param {{partId?:string, maxRpm?:number, rpm?:number, approachX?:number, approachZ?:number}} [opts]
 * @returns {string} Okuma-OSP program text
 */
export function emitFromTemplate(template, opts = {}) {
  if (!template || !template.cannedCycle || !template.cssMode) {
    throw new Error("emitFromTemplate: template missing cannedCycle/cssMode (expected a U-CL2 template)");
  }
  const vc = paramDefault(template, "vc", 200);
  const fn = paramDefault(template, "fn", 0.2);
  const ap = paramDefault(template, "ap", 2.5);
  const maxRpm = opts.maxRpm ?? 3000;
  const rpm = opts.rpm ?? 1200;
  const ax = opts.approachX ?? 5.0;
  const az = opts.approachZ ?? 2.0;

  const L = [];
  L.push(`(PRISM CLOSED-LOOP GENERATED — Okuma OSP — ${template.category} via ${template.cannedCycle})`);
  L.push("G95");                          // feed-per-rev declared (fixes feed-mode-undeclared)
  if (template.cssMode === "G96") {
    L.push(`G50 S${maxRpm}`);             // spindle cap BEFORE CSS (fixes css-no-rpm-cap)
    L.push(`G96 S${vc} M03`);             // constant surface speed at vc (m/min)
  } else {
    L.push(`G97 S${rpm} M03`);            // constant RPM (threading/drilling)
  }
  L.push("T0101");
  L.push(`G00 X${ax.toFixed(3)} Z${az.toFixed(3)}`);
  L.push(cycleLine(template, vc, fn, ap));
  L.push("G00 X10.0 Z5.0");               // retract
  L.push("M05");
  L.push("M30");
  return L.join("\n") + "\n";
}

// ───────────────────────── CLI ─────────────────────────
function main(argv) {
  const args = argv.slice(2);
  const val = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
  // Minimal inline template for CLI demo (normally piped from prism_turning:turning_template_build).
  const cyc = val("--cycle", "G71");
  const css = val("--css", "G96");
  const template = {
    category: val("--category", "rough"), cannedCycle: cyc, cssMode: css,
    params: [{ param: "vc", default: Number(val("--vc", "220")) }, { param: "fn", default: Number(val("--fn", "0.3")) }, { param: "ap", default: Number(val("--ap", "2.5")) }],
  };
  process.stdout.write(emitFromTemplate(template));
}

const isMain = (() => { try { return process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]); } catch { return false; } })();
if (isMain) main(process.argv);
