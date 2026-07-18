/**
 * cad-primitive-emit.mjs -- DETERMINISTIC cadquery code emitter for simple primitives (slot:delta,
 * U-CAD-PRIMITIVE-EMIT). The robust answer to the 41% metric 25.4x-undersize LLM bug
 * ([[reference_cad_metric_units_bug_2026_07_04]]): for a TRIVIAL primitive (cube/block, cylinder/disc) the
 * correct cadquery is a one-liner, so there is no reason to let an LLM introduce a units/radius bug.
 * parseRequestPrint already resolves every dim to MM (even "2 inch cube" -> 50.8 mm), so the emitted code is
 * dimensionally EXACT for both metric and inch requests, with NO `/25.4` and the correct `circle(D/2)` radius.
 *
 * Bonus: it makes the generation loop RESILIENT -- primitives still generate correctly when Ollama is down
 * (curl exit 28), and they never hit the LLM at all (less load, zero variance). Returns null for anything
 * that is not a clean primitive, so the caller falls back to the LLM for real parts.
 *
 * REUSES parseRequestPrint (R8). Pure: no I/O.
 *
 * @module scripts/lib/cad-primitive-emit
 */

import { parseRequestPrint } from "../cad-request-print.mjs";

const INCH_TO_MM = 25.4;

/** Format a number for code: fixed then trim trailing zeros ("22.2500" -> "22.25", "50.0" -> "50"). */
function fmt(n) {
  const s = Number(n).toFixed(4);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

/** Parse "<num> <unit>? <keyword>" -> mm (inch->x25.4; bare/mm/cm-token treated as mm). null if no match. */
function dimMm(re, s) {
  const m = s.match(re);
  if (!m) return null;
  const v = Number(m[1]);
  if (!Number.isFinite(v) || v <= 0) return null;
  return /inch|inches|in\b|["″]/i.test(m[2] || "") ? v * INCH_TO_MM : v;
}

/**
 * Parse a TUBE/BUSHING/RING/SLEEVE request -> { odMm, idMm, lenMm } or null. A tube is UNAMBIGUOUS (the ID
 * is concentric with the OD by definition -- no location guess), so it is safely deterministic. Handles the
 * corpus format "a bushing: 0.75 inch outer diameter, 0.375 inch bore, 1 inch long" (inch OR mm, per value).
 */
export function parseTubeRequest(request) {
  const s = String(request || "");
  // A flat washer IS an annulus (ID + OD + thickness) -- same geometry as a tube, different noun. "outer/inner
  // diameter" + "thick" are already handled below; only the keyword gate was missing "washer".
  if (!/\b(?:bushing|tube|ring|sleeve|pipe|annulus|collar|washer)\b/i.test(s)) return null;
  const U = "(inch|inches|in|mm|cm|[\"\\u2033])?";
  const odMm = dimMm(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*(?:outer\\s*dia\\w*|o\\.?\\s?d\\.?\\b)`, "i"), s);
  const idMm = dimMm(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*(?:bore|inner\\s*dia\\w*|i\\.?\\s?d\\.?\\b)`, "i"), s);
  const lenMm = dimMm(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*(?:long|length|thick|tall|high|deep)`, "i"), s);
  if (odMm == null || idMm == null || lenMm == null) return null;
  if (!(odMm > idMm && idMm > 0)) return null; // OD must exceed ID for a real tube
  return { odMm, idMm, lenMm };
}

/**
 * Parse a truncated-CONE / tapered-plug / frustum request -> { baseMm, topMm, heightMm } or null. base dia +
 * top dia + height, each with its own unit. A full cone (top dia 0) is allowed. Robust to the two corpus
 * phrasings: "<b> dia at base tapering to <t> dia over <h> length" and "<b> dia base tapering to <t> dia <h> tall".
 */
export function parseConeRequest(request) {
  const s = String(request || "");
  if (!/\b(?:cone|conical|frustum|tapered?|taper)\b/i.test(s)) return null;
  const U = "(inch|inches|in|mm|cm|[\"\\u2033])?";
  const baseMm = dimMm(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*(?:dia\\w*\\s+)?(?:at\\s+(?:the\\s+)?base|base(?:\\s+dia\\w*)?)`, "i"), s)
              || dimMm(new RegExp(`base(?:\\s+dia\\w*)?[^0-9]{0,6}([0-9]*\\.?[0-9]+)\\s*${U}`, "i"), s);
  const topMm = dimMm(new RegExp(`taper\\w*\\s+(?:down\\s+)?to\\s+([0-9]*\\.?[0-9]+)\\s*${U}`, "i"), s)
             || dimMm(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*(?:dia\\w*\\s+)?(?:at\\s+(?:the\\s+)?top|top(?:\\s+dia\\w*)?)`, "i"), s);
  const heightMm = dimMm(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*(?:tall|high|long|length|height)`, "i"), s)
                || dimMm(new RegExp(`over\\s+([0-9]*\\.?[0-9]+)\\s*${U}`, "i"), s);
  if (baseMm == null || topMm == null || heightMm == null) return null;
  if (!(baseMm > 0 && topMm >= 0 && heightMm > 0 && baseMm !== topMm)) return null; // a real frustum/cone
  return { baseMm, topMm, heightMm };
}

/**
 * Parse a hollow SQUARE TUBE request -> { outer, inner, len } mm or null. "1.5 inch square outside with 0.25
 * inch wall thickness, 3 inch long" -> outer 38.1, inner = outer - 2*wall = 25.4, len 76.2. Unambiguous
 * (concentric square annulus). inner = outer - 2*wall.
 */
export function parseSquareTubeRequest(request) {
  const s = String(request || "");
  if (!/\bsquare\b/i.test(s) || !/\bwall\b/i.test(s)) return null; // needs "square ... wall (thickness)"
  const U = "(inch|inches|in|mm|cm|[\"\\u2033])?";
  const outer = dimMm(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*square`, "i"), s);
  const wall = dimMm(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*wall`, "i"), s);
  const len = dimMm(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*(?:long|length)`, "i"), s);
  if (outer == null || wall == null || len == null) return null;
  const inner = outer - 2 * wall;
  if (!(outer > 0 && wall > 0 && len > 0 && inner > 0)) return null; // wall must leave a real bore
  return { outer, inner, len };
}

/** Wrap a cadquery `result = <body>` expression into a full runnable, exporting script. */
function wrapScript(body, desc) {
  return [
    "import cadquery as cq",
    "from cadquery import exporters",
    "import os",
    "",
    `# PRISM DETERMINISTIC primitive (${desc}) -- dims from parseRequestPrint/parseTubeRequest, in mm; circle() takes the RADIUS. No LLM, no unit bug.`,
    `result = ${body}`,
    "",
    "OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')",
    "exporters.export(result, OUTPUT_STEP)",
    "",
  ].join("\n");
}

/**
 * Emit deterministic, dimensionally-exact cadquery for a simple primitive, or null when the request is not a
 * clean primitive (-> caller uses the LLM). Returns { code, shape, desc, dimsMm }.
 * Handles: cube/rect/block (3 linear -> box), cylinder/disc (diameter + 1 linear -> circle(D/2).extrude(L)).
 */
export function emitPrimitiveCode(request) {
  const s = String(request || "");
  // TUBE/BUSHING/RING first -- OD+ID+length is UNAMBIGUOUS (concentric, no location guess). Checked before
  // the feature guard because its "bore" is the DEFINING feature, not a disqualifier.
  const tube = parseTubeRequest(s);
  // A PLAIN tube only: a keyway/groove/slot/flat/thread/etc ON the tube is a FEATURE, not part of the tube ->
  // defer to emitFeatureCode. Drawing the plain tube would silently DROP the feature (R12: never mis-draw a
  // keyed bushing as a plain bushing). The tube's own "bore"/"ID" is NOT a disqualifier (it is the tube).
  if (tube && !/\b(?:keyway|groove|slot|thread|tapped|knurl|hex|chamfer|fillet|radial|cross|spline|flange)\b/i.test(s)) {
    const desc = `tube OD ${fmt(tube.odMm)} ID ${fmt(tube.idMm)} x len ${fmt(tube.lenMm)} mm`;
    const body = `cq.Workplane("XY").circle(${fmt(tube.odMm / 2)}).circle(${fmt(tube.idMm / 2)}).extrude(${fmt(tube.lenMm)})`;
    return { code: wrapScript(body, desc), shape: "tube", desc, dimsMm: [tube.odMm, tube.idMm, tube.lenMm] };
  }
  // TRUNCATED CONE / tapered plug / frustum -- base dia + top dia + height -> makeCone. Checked BEFORE the
  // feature guard because "taper" is one of its bail words, but a cone IS the shape here (not a feature).
  const cone = parseConeRequest(s);
  if (cone) {
    const desc = `truncated cone base dia ${fmt(cone.baseMm)} -> top dia ${fmt(cone.topMm)} x ${fmt(cone.heightMm)} tall mm`;
    const body = `cq.Solid.makeCone(${fmt(cone.baseMm / 2)}, ${fmt(cone.topMm / 2)}, ${fmt(cone.heightMm)})`;
    return { code: wrapScript(body, desc), shape: "cone", desc, dimsMm: [cone.baseMm, cone.topMm, cone.heightMm] };
  }
  // HOLLOW SQUARE TUBE (square outer + wall thickness + length) -- a concentric square annulus, unambiguous.
  // Checked before the feature guard: its "wall" is the defining feature, not a disqualifier.
  const sqtube = parseSquareTubeRequest(s);
  if (sqtube) {
    const desc = `square tube ${fmt(sqtube.outer)} outer, ${fmt(sqtube.inner)} inner x ${fmt(sqtube.len)} long mm`;
    const body = `cq.Workplane("XY").rect(${fmt(sqtube.outer)}, ${fmt(sqtube.outer)}).rect(${fmt(sqtube.inner)}, ${fmt(sqtube.inner)}).extrude(${fmt(sqtube.len)})`;
    return { code: wrapScript(body, desc), shape: "square-tube", desc, dimsMm: [sqtube.outer, sqtube.inner, sqtube.len] };
  }
  // A PLAIN primitive emitter must NEVER silently drop a feature (a hole/pocket/fillet on a "cube" would be
  // lost -- and a hole's LOCATION is ambiguous, so it is NOT safely deterministic). Bail to the LLM (R12).
  if (/\b(?:hole|bore|slot|pocket|fillet|chamfer|counterbore|countersink|thread|groove|keyway|taper|boss|rib|flange|through|drill|tapped|c'?bore|csink)\b/i.test(s)) return null;
  const p = parseRequestPrint(s);
  const dims = Array.isArray(p.dims) ? p.dims : [];
  const shape = p.shape;
  const lin = dims.filter((d) => d && d.type === "linear" && Number.isFinite(d.nominal) && d.nominal > 0).map((d) => d.nominal);
  const dia = dims.find((d) => d && d.type === "diameter" && Number.isFinite(d.nominal) && d.nominal > 0);

  let body = null, desc = null, dimsMm = null;
  // STRICT dim counts: a plain box has EXACTLY 3 linear + no diameter; a plain cylinder EXACTLY 1 diameter +
  // 1 linear. An extra dim (e.g. a second diameter = a bore) means it is NOT a plain primitive -> LLM.
  if ((shape === "cube" || shape === "rect" || shape === "block") && lin.length === 3 && !dia) {
    body = `cq.Workplane("XY").box(${fmt(lin[0])}, ${fmt(lin[1])}, ${fmt(lin[2])})`;
    desc = `box ${fmt(lin[0])}x${fmt(lin[1])}x${fmt(lin[2])} mm`;
    dimsMm = [lin[0], lin[1], lin[2]];
  } else if ((shape === "cylinder" || shape === "disc") && dia && lin.length === 1) {
    body = `cq.Workplane("XY").circle(${fmt(dia.nominal / 2)}).extrude(${fmt(lin[0])})`;
    desc = `cylinder dia ${fmt(dia.nominal)} x len ${fmt(lin[0])} mm`;
    dimsMm = [dia.nominal, lin[0]];
  }
  if (!body) return null;
  return { code: wrapScript(body, desc), shape, desc, dimsMm };
}
