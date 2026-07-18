/**
 * cad-feature-emit.mjs -- DETERMINISTIC cadquery emitter for FEATURED prismatic parts, using engineering
 * CONVENTIONS as defaults (slot:delta, U-CAD-FEATURE-EMIT). Operator directive (2026-07-04): "develop more
 * algorithms to accurately draw CAD models." The plain-primitive emitter (cad-primitive-emit.mjs) bails on
 * any feature; this handles the common features a drafter draws WITHOUT ambiguity by applying the standard
 * shop convention -- exactly as a human would: an unspecified hole on a plate is CENTERED and goes THROUGH
 * the thickness. That is not a guess, it is the drafting default. Dimensionally EXACT (dims from
 * parseRequestPrint, already mm) + Ollama-independent.
 *
 * This is a SERIES (each a separate algorithm, extended over units):
 *   [1] box/plate + single centered through-hole   <- THIS unit
 *   [.] hole patterns (bolt-circle / grid / corners), counterbore/countersink, edge fillets/chamfers,
 *       slots/pockets, stepped/flanged shafts       <- subsequent units
 *
 * REUSES parseRequestPrint (R8). Pure: no I/O. Returns null for anything it does not UNAMBIGUOUSLY draw
 * (multi-hole, other features, hole that doesn't fit) -> the caller falls back to the next algorithm / LLM.
 *
 * @module scripts/lib/cad-feature-emit
 */

import { parseRequestPrint } from "../cad-request-print.mjs";
import { parseTubeRequest } from "./cad-primitive-emit.mjs";

function fmt(n) {
  const s = Number(n).toFixed(4);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}
function wrapScript(body, desc) {
  return [
    "import cadquery as cq",
    "from cadquery import exporters",
    "import os",
    "",
    `# PRISM DETERMINISTIC feature (${desc}) -- dims from parseRequestPrint, inch->mm already resolved to mm; engineering-convention defaults. No LLM.`,
    `result = ${body}`,
    "",
    "OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')",
    "exporters.export(result, OUTPUT_STEP)",
    "",
  ].join("\n");
}

// A hole this emitter draws must be a SINGLE, unqualified-location hole. Anything else (a pattern, a
// second feature, an explicit off-center location) is NOT unambiguous here -> defer.
const HAS_HOLE = /\b(?:hole|bore|drilled?)\b/i;
const MULTI_OR_PATTERN = /\b(?:holes|pattern|bolt\s*circle|bolt\s*pattern|grid|each\s*corner|corners|\d+\s*(?:hole|bore)|two|three|four|five|six|array|row)\b/i;
const OTHER_FEATURE = /\b(?:slot|pocket|fillet|chamfer|counterbore|counter-?bore|countersink|counter-?sink|thread|tapped|keyway|taper|groove|c'?bore|c'?sink|boss|rib|flange|spotface)\b/i;
const OFFSET_LOCATION = /\b(?:off-?center|offset|corner|edge|from\s+the\s+(?:edge|corner)|at\s+\()/i;
// A CROSS/radial hole on a round part is NOT concentric with the axis -> not the center-hole default.
const CROSS_HOLE = /\b(?:cross|radial|transverse|perpendicular|side)[\s-]*(?:hole|bore|drill)/i;

/**
 * Emit a box/plate with a SINGLE CENTERED THROUGH-hole (the drafting default for an unqualified hole), or
 * null. Convention: the hole axis is the THINNEST dim (the thickness), centered on the largest face.
 */
export function emitFeatureCode(request) {
  const s = String(request || "");
  return holeFeature(s) || steppedShaft(s) || counterboreFeature(s) || chamferFeature(s) || pocketFeature(s) || twoBodyFeature(s) || slotFeature(s) || grooveFeature(s) || boreKeywayFeature(s) || shoulderedDiscFeature(s);
}

/**
 * [13] SHOULDERED DISC / raised BOSS on a base = two CONCENTRIC stacked cylinders (base disc + a narrower
 * boss on top). Same geometry as the two-body part (#8), but parseRequestPrint returns shape "disc" and DROPS
 * the boss, so it needs a dedicated "base ... boss" parse. "a 1.5 dia by 0.25 thick base with a 0.75 dia by
 * 0.375 tall raised boss centered on top". circle(bd/2).extrude(bt).faces(">Z").workplane().circle(sd/2).extrude(st).
 */
function shoulderedDiscFeature(s) {
  if (!/\bboss\b|shouldered\s+disc/i.test(s)) return null;
  // a plain base+boss only: any other feature (hole/slot/etc.) makes it a multi-feature part -> defer
  if (/\b(?:hole|bore|drill|slot|keyway|thread|tapped|groove|counterbore|countersink|pocket|chamfer|fillet|knurl)\b/i.test(s)) return null;
  const U = "(inch|inches|in|mm|cm|[\"\\u2033])?";
  const baseM = s.match(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*(?:dia\\w*|diameter)\\s+by\\s+([0-9]*\\.?[0-9]+)\\s*${U}\\s*(?:thick|tall|high)\\s+base`, "i"));
  const bossM = s.match(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*(?:dia\\w*|diameter)\\s+by\\s+([0-9]*\\.?[0-9]+)\\s*${U}\\s*(?:tall|thick|high)\\s+(?:raised\\s+)?boss`, "i"));
  if (!baseM || !bossM) return null;
  const inch = (u) => /inch|inches|in\b|["″]/i.test(u || "");
  const bd = inch(baseM[2]) ? Number(baseM[1]) * INCH_TO_MM : Number(baseM[1]);
  const bt = inch(baseM[4]) ? Number(baseM[3]) * INCH_TO_MM : Number(baseM[3]);
  const sd = inch(bossM[2]) ? Number(bossM[1]) * INCH_TO_MM : Number(bossM[1]);
  const st = inch(bossM[4]) ? Number(bossM[3]) * INCH_TO_MM : Number(bossM[3]);
  if (!(bd > 0 && bt > 0 && sd > 0 && st > 0 && sd < bd)) return null; // the boss must be narrower than the base
  const body = `cq.Workplane("XY").circle(${fmt(bd / 2)}).extrude(${fmt(bt)}).faces(">Z").workplane().circle(${fmt(sd / 2)}).extrude(${fmt(st)})`;
  const desc = `shouldered disc: base dia ${fmt(bd)} x ${fmt(bt)} thick + boss dia ${fmt(sd)} x ${fmt(st)} tall mm`;
  return { code: wrapScript(body, desc), shape: "shouldered-disc", desc, dimsMm: [bd, bt, sd, st] };
}

/**
 * [11] KEYED BUSHING = a tube (OD/ID/length) with a KEYWAY cut into the BORE wall (internal keyway). Reuses
 * parseTubeRequest (R8) for the tube, plus a keyway W x D parse. The keyway cuts OUTWARD from the bore wall
 * (radius ID/2) by depth D -> a box tangent to the bore: circle(OD/2).circle(ID/2).extrude(L).cut(box at y=ID/2).
 * Same tangent-box idiom as the external shaft keyway (#9), positioned at the bore wall instead of the OD.
 */
function boreKeywayFeature(s) {
  if (!/keyway\s+in\s+the\s+bore\b/i.test(s)) return null;
  const tube = parseTubeRequest(s);
  if (!tube) return null;
  const U = "(inch|inches|in|mm|cm|[\"\\u2033])?";
  const kw = s.match(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*wide\\s+by\\s+([0-9]*\\.?[0-9]+)\\s*${U}\\s*deep\\s+keyway`, "i"));
  if (!kw) return null;
  const inch = (u) => /inch|inches|in\b|["″]/i.test(u || "");
  const W = inch(kw[2]) ? Number(kw[1]) * INCH_TO_MM : Number(kw[1]);
  const D = inch(kw[4]) ? Number(kw[3]) * INCH_TO_MM : Number(kw[3]);
  const ir = tube.idMm / 2, wall = (tube.odMm - tube.idMm) / 2;
  if (!(W > 0 && D > 0 && W < tube.idMm && D < wall)) return null; // keyway fits the bore + stays in the wall (R12)
  const body = `cq.Workplane("XY").circle(${fmt(tube.odMm / 2)}).circle(${fmt(tube.idMm / 2)}).extrude(${fmt(tube.lenMm)}).cut(cq.Workplane("XY").transformed(offset=(0, ${fmt(ir)}, 0)).box(${fmt(W)}, ${fmt(2 * D)}, ${fmt(tube.lenMm)}, centered=(True, True, False)))`;
  const desc = `keyed bushing OD ${fmt(tube.odMm)} ID ${fmt(tube.idMm)} x ${fmt(tube.lenMm)} long + ${fmt(W)}x${fmt(D)} bore keyway mm`;
  return { code: wrapScript(body, desc), shape: "bore-keyway", desc, dimsMm: [tube.odMm, tube.idMm, tube.lenMm, W, D] };
}

/**
 * [10] GROOVES. Two corpus variants:
 *   shaft + circumferential (O-ring / retaining-ring) groove at "X from one end" -> cut an annular ring
 *     from the OD: circle(r+1).circle(r-D).extrude(W) translated to the groove position.
 *   v-block: a cube + a 90deg V-GROOVE of given depth across the top -> cut a 45deg triangular prism.
 * Both remove material within the envelope (OD/bbox preserved). Validate curved by radius+volume.
 */
function parseShaftGroove(s) {
  if (!/\bgroove\b/i.test(s) || /\bv-?groove\b/i.test(s)) return null; // circumferential only (v-groove is the other branch)
  const U = "(inch|inches|in|mm|cm|[\"\\u2033])?";
  const dia = dimMm(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*(?:dia\\w*\\s+|diameter\\s+)?shaft`, "i"), s);
  const len = dimMm(new RegExp(`shaft\\s+([0-9]*\\.?[0-9]+)\\s*${U}\\s*(?:long|length)`, "i"), s);
  const g = s.match(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*wide\\s+by\\s+([0-9]*\\.?[0-9]+)\\s*${U}\\s*deep\\s+groove`, "i"));
  const pos = dimMm(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*from\\s+(?:one|the)?\\s*end`, "i"), s);
  if (dia == null || len == null || !g || pos == null) return null;
  const inch = (u) => /inch|inches|in\b|["″]/i.test(u || "");
  const W = inch(g[2]) ? Number(g[1]) * INCH_TO_MM : Number(g[1]);
  const D = inch(g[4]) ? Number(g[3]) * INCH_TO_MM : Number(g[3]);
  if (!(dia > 0 && len > 0 && W > 0 && D > 0 && D < dia / 2 && pos - W / 2 > 0 && pos + W / 2 < len)) return null;
  return { dia, len, W, D, pos };
}
function parseVGroove(s) {
  if (!/\bv-?groove\b/i.test(s)) return null;
  if (!/\b90\s*(?:deg|degree|°)/i.test(s)) return null; // only the 90deg V is convention-fixed (walls at 45deg)
  const U = "(inch|inches|in|mm|cm|[\"\\u2033])?";
  const size = dimMm(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*cube`, "i"), s);
  const depth = dimMm(new RegExp(`v-?groove\\s+([0-9]*\\.?[0-9]+)\\s*${U}\\s*deep`, "i"), s)
             || dimMm(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*deep`, "i"), s);
  if (size == null || depth == null) return null;
  if (!(size > 0 && depth > 0 && depth < size / 2)) return null; // a 90deg V of depth d needs 2d < the top face
  return { size, depth };
}
function grooveFeature(s) {
  // shaft + circumferential groove
  const sg = parseShaftGroove(s);
  if (sg) {
    const r = sg.dia / 2;
    // annular cutter: outer radius r+1 (engulfs the OD surface), inner r-D (groove floor), W tall, centered at pos
    const body = `cq.Workplane("XY").circle(${fmt(r)}).extrude(${fmt(sg.len)}).cut(cq.Workplane("XY").circle(${fmt(r + 1)}).circle(${fmt(r - sg.D)}).extrude(${fmt(sg.W)}).translate((0, 0, ${fmt(sg.pos - sg.W / 2)})))`;
    const desc = `shaft dia ${fmt(sg.dia)} x ${fmt(sg.len)} long + ${fmt(sg.W)}x${fmt(sg.D)} groove at ${fmt(sg.pos)} from end mm`;
    return { code: wrapScript(body, desc), shape: "shaft-groove", desc, dimsMm: [sg.dia, sg.len, sg.W, sg.D, sg.pos] };
  }
  // v-block + 90deg v-groove across the top
  const vg = parseVGroove(s);
  if (vg) {
    const t = vg.size / 2, d = vg.depth;
    // 90deg V (45deg walls): top corners (+-d, t), apex (0, t-d); triangular prism cut across the top (both=True)
    const body = `cq.Workplane("XY").box(${fmt(vg.size)}, ${fmt(vg.size)}, ${fmt(vg.size)}).cut(cq.Workplane("XZ").polyline([(${fmt(-d)}, ${fmt(t)}), (${fmt(d)}, ${fmt(t)}), (0, ${fmt(t - d)})]).close().extrude(${fmt(vg.size)}, both=True))`;
    const desc = `v-block ${fmt(vg.size)} cube + 90deg v-groove ${fmt(d)} deep across top mm`;
    return { code: wrapScript(body, desc), shape: "v-groove", desc, dimsMm: [vg.size, d] };
  }
  return null;
}

/**
 * [9] SLOTS / KEYWAYS. Two corpus variants, both drawn deterministically (dims + convention stated):
 *   shaft + axial KEYWAY running the length -> circle(r).extrude(L).cut(box tangent to the top OD)
 *   plate + centered milled SLOT (obround) of given depth -> box(...).faces(">Z").workplane().slot2D(l,w).cutBlind(-depth)
 * Both REMOVE material within the envelope (OD/bbox preserved). Defers bore-keyways / radial / through slots.
 */
function parseShaftKeyway(s) {
  if (!/\bkeyway\b/i.test(s)) return null;
  if (/\bbore\b/i.test(s)) return null; // a keyway IN THE BORE is internal -> a different (later) shape
  const U = "(inch|inches|in|mm|cm|[\"\\u2033])?";
  const dia = dimMm(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*(?:dia\\w*\\s+|diameter\\s+)?shaft`, "i"), s);
  const len = dimMm(new RegExp(`shaft\\s+([0-9]*\\.?[0-9]+)\\s*${U}\\s*(?:long|length)`, "i"), s);
  const kw = s.match(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*(?:by|x|\\u00d7)\\s*([0-9]*\\.?[0-9]+)\\s*${U}\\s*(?:deep\\s+)?keyway`, "i"));
  if (dia == null || len == null || !kw) return null;
  const inch = (u) => /inch|inches|in\b|["″]/i.test(u || "");
  const W = inch(kw[2]) ? Number(kw[1]) * INCH_TO_MM : Number(kw[1]);
  const D = inch(kw[4]) ? Number(kw[3]) * INCH_TO_MM : Number(kw[3]);
  if (!(dia > 0 && len > 0 && W > 0 && D > 0 && W < dia && D < dia / 2)) return null;
  return { dia, len, W, D };
}
function parsePlateSlot(s) {
  if (!/\bslot\b/i.test(s)) return null;
  if (/\b(?:through|thru|radial)\s+slot|slot\s+(?:through|thru)\b/i.test(s)) return null; // through/radial slot -> defer
  const U = "(inch|inches|in|mm|cm|[\"\\u2033])?";
  const slotL = dimMm(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*long\\s+by`, "i"), s);
  const slotW = dimMm(new RegExp(`by\\s+([0-9]*\\.?[0-9]+)\\s*${U}\\s*wide\\s+slot`, "i"), s);
  const depth = dimMm(new RegExp(`slot\\s+milled\\s+([0-9]*\\.?[0-9]+)\\s*${U}\\s*deep`, "i"), s);
  if (slotL == null || slotW == null || depth == null) return null;
  return { slotL, slotW, depth };
}
function slotFeature(s) {
  // shaft + axial keyway running the length
  const kw = parseShaftKeyway(s);
  if (kw) {
    const r = kw.dia / 2;
    // cut a box tangent to the top of the OD: workplane at y=r, box centered in x (width W) + y (2*depth,
    // so half is inside the shaft = depth D), extruded the full length in z. .cut() subtracts it.
    const body = `cq.Workplane("XY").circle(${fmt(r)}).extrude(${fmt(kw.len)}).cut(cq.Workplane("XY").transformed(offset=(0, ${fmt(r)}, 0)).box(${fmt(kw.W)}, ${fmt(2 * kw.D)}, ${fmt(kw.len)}, centered=(True, True, False)))`;
    const desc = `shaft dia ${fmt(kw.dia)} x ${fmt(kw.len)} long + ${fmt(kw.W)}x${fmt(kw.D)} keyway full length mm`;
    return { code: wrapScript(body, desc), shape: "shaft-keyway", desc, dimsMm: [kw.dia, kw.len, kw.W, kw.D] };
  }
  // plate + centered milled slot (obround)
  const ps = parsePlateSlot(s);
  if (ps) {
    if (/\b(?:hole|bore|drill|counterbore|countersink|pocket|chamfer|fillet|keyway)\b/i.test(s)) return null; // 2nd feature -> defer
    const p = parseRequestPrint(s);
    const dims = Array.isArray(p.dims) ? p.dims : [];
    const lin = dims.filter((d) => d && d.type === "linear" && Number.isFinite(d.nominal) && d.nominal > 0).map((d) => d.nominal);
    const dia = dims.find((d) => d && d.type === "diameter" && Number.isFinite(d.nominal) && d.nominal > 0);
    if (!((p.shape === "cube" || p.shape === "rect" || p.shape === "block") && lin.length === 3 && !dia)) return null;
    const [L, W, H] = [...lin].sort((a, b) => b - a);
    const sl = Math.max(ps.slotL, ps.slotW), sw = Math.min(ps.slotL, ps.slotW); // slot2D needs length >= width
    if (!(sl < Math.min(L, W) && ps.depth < H)) return null; // the slot must fit the face + stay blind (R12)
    const body = `cq.Workplane("XY").box(${fmt(L)}, ${fmt(W)}, ${fmt(H)}).faces(">Z").workplane().slot2D(${fmt(sl)}, ${fmt(sw)}).cutBlind(${fmt(-ps.depth)})`;
    const desc = `box ${fmt(L)}x${fmt(W)}x${fmt(H)} mm + centered ${fmt(sl)}x${fmt(sw)} slot ${fmt(ps.depth)} deep`;
    return { code: wrapScript(body, desc), shape: "plate-slot", desc, dimsMm: [L, W, H, sl, sw, ps.depth] };
  }
  return null;
}

/**
 * [8] Generic TWO-BODY part = two CONCENTRIC stacked cylinders, for the phrasings steppedShaft's keyword gate
 * misses -- "a pilot punch: a 0.375 body 1.5 long stepping down to a 0.1875 tip 0.5 long" and "a die button:
 * a 0.5 head 0.25 tall on a 0.375 body, 0.75 tall overall". parseRequestPrint already classifies these as
 * shape "two-body" with 2 diameters + 2 lengths in request order -> reuse it (R8). SEMANTIC catch: when the
 * request says "overall", the 2nd length is the TOTAL height, so segment-2 = overall - segment-1.
 * `circle(d1/2).extrude(l1).faces(">Z").workplane().circle(d2/2).extrude(l2)`.
 */
function twoBodyFeature(s) {
  const p = parseRequestPrint(s);
  if (p.shape !== "two-body") return null;
  // A plain 2-cylinder only: a bore/hole (e.g. "stepped BORE part") is an INTERNAL step -> a different shape.
  if (/\b(?:bore|hole|drill|slot|keyway|thread|tapped|groove|counterbore|countersink|pocket|fillet|chamfer|knurl|ball-?nose|hemispher)\b/i.test(s)) return null;
  const dims = Array.isArray(p.dims) ? p.dims : [];
  const dias = dims.filter((d) => d && d.type === "diameter" && Number.isFinite(d.nominal) && d.nominal > 0).map((d) => d.nominal);
  const lins = dims.filter((d) => d && d.type === "linear" && Number.isFinite(d.nominal) && d.nominal > 0).map((d) => d.nominal);
  if (dias.length !== 2 || lins.length !== 2 || dias[0] === dias[1]) return null;
  // request order is dia1,len1,dia2,len2 (seg1 then seg2). "overall" -> len2 is the TOTAL -> seg2 = total - seg1.
  const d1 = dias[0], l1 = lins[0], d2 = dias[1];
  const l2 = /\boverall\b/i.test(s) ? lins[1] - l1 : lins[1];
  if (!(l1 > 0 && l2 > 0)) return null; // a valid "overall" must exceed segment-1 (R12)
  const body = `cq.Workplane("XY").circle(${fmt(d1 / 2)}).extrude(${fmt(l1)}).faces(">Z").workplane().circle(${fmt(d2 / 2)}).extrude(${fmt(l2)})`;
  const desc = `two-body: seg1 dia ${fmt(d1)} x ${fmt(l1)} + seg2 dia ${fmt(d2)} x ${fmt(l2)} mm (concentric)`;
  return { code: wrapScript(body, desc), shape: "two-body", desc, dimsMm: [d1, l1, d2, l2] };
}

/**
 * [7] BLOCK + a single CENTERED rectangular POCKET ("a 2x2x0.75 block with a 0.4 deep 0.75 wide pocket
 * centered on top"). Width-only (no length) -> SQUARE pocket (width x width) by convention, centered on the
 * top face. `box(L,W,H).faces(">Z").workplane().rect(w,w).cutBlind(-depth)`. Pocket is within the envelope
 * -> bbox validates UNCHANGED. Defers electrode/multi-feature "pocket" phrasings (no "deep"+"wide", or holes).
 */
function parsePocketRequest(s) {
  if (!/\bpocket\b/i.test(s)) return null;
  const U = "(inch|inches|in|mm|cm|[\"\\u2033])?";
  const depth = dimMm(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*deep`, "i"), s);
  const width = dimMm(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*wide`, "i"), s);
  if (depth == null || width == null) return null;
  return { depth, width };
}
function pocketFeature(s) {
  const pk = parsePocketRequest(s);
  if (!pk) return null;
  // keep it a plain block + ONE centered pocket: bail on any other feature or a multi/pattern qualifier
  if (/\b(?:hole|bore|drill|slot|thread|tapped|keyway|counterbore|countersink|groove|boss|fillet|chamfer)\b/i.test(s) || MULTI_OR_PATTERN.test(s)) return null;
  const p = parseRequestPrint(s);
  const dims = Array.isArray(p.dims) ? p.dims : [];
  const lin = dims.filter((d) => d && d.type === "linear" && Number.isFinite(d.nominal) && d.nominal > 0).map((d) => d.nominal);
  const dia = dims.find((d) => d && d.type === "diameter" && Number.isFinite(d.nominal) && d.nominal > 0);
  if (!((p.shape === "cube" || p.shape === "rect" || p.shape === "block") && lin.length === 3 && !dia)) return null;
  const [L, W, H] = [...lin].sort((a, b) => b - a); // H = thinnest = thickness (pocket cut into the top)
  if (!(pk.width < Math.min(L, W) && pk.depth < H)) return null; // the pocket must fit the face + stay blind (R12)
  const body = `cq.Workplane("XY").box(${fmt(L)}, ${fmt(W)}, ${fmt(H)}).faces(">Z").workplane().rect(${fmt(pk.width)}, ${fmt(pk.width)}).cutBlind(${fmt(-pk.depth)})`;
  const desc = `box ${fmt(L)}x${fmt(W)}x${fmt(H)} mm + centered ${fmt(pk.width)}x${fmt(pk.width)} pocket ${fmt(pk.depth)} deep`;
  return { code: wrapScript(body, desc), shape: "pocket-box", desc, dimsMm: [L, W, H, pk.width, pk.depth] };
}

const INCH_TO_MM = 25.4;
/** Parse "<num> <unit>? <keyword>" -> mm (inch->x25.4; bare/mm treated as mm). null if no match. */
function dimMm(re, s) {
  const m = String(s).match(re);
  if (!m) return null;
  const v = Number(m[1]);
  if (!Number.isFinite(v) || v <= 0) return null;
  return /inch|inches|in\b|["″]/i.test(m[2] || "") ? v * INCH_TO_MM : v;
}

/**
 * [5] COUNTERBORED cylinder ("a boss: a 1.5 dia cylinder 1 tall with a 0.5 bore counterbored to 0.75 dia
 * 0.375 deep") -- a core JM Die shape (die button). Concentric + centered -> deterministic:
 * circle(baseD/2).extrude(baseT).faces(">Z").workplane().cboreHole(boreD, cboreD, cboreDepth).
 */
function parseCounterboreRequest(s) {
  if (!/counter-?bored?\b/i.test(s)) return null;
  const U = "(inch|inches|in|mm|cm|[\"\\u2033])?";
  const baseD = dimMm(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*(?:dia\\w*\\s+)?cylinder`, "i"), s);
  const baseT = dimMm(new RegExp(`cylinder\\s+([0-9]*\\.?[0-9]+)\\s*${U}\\s*(?:tall|long|high|thick)`, "i"), s);
  const boreD = dimMm(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*(?:dia\\w*\\s+)?bore\\b`, "i"), s);
  const cboreD = dimMm(new RegExp(`counter-?bored?\\s+to\\s+([0-9]*\\.?[0-9]+)\\s*${U}`, "i"), s);
  const cboreDepth = dimMm(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*deep`, "i"), s);
  if ([baseD, baseT, boreD, cboreD, cboreDepth].some((x) => x == null)) return null;
  if (!(boreD < baseD && cboreD > boreD && cboreD < baseD && cboreDepth < baseT)) return null; // geometrically valid
  return { baseD, baseT, boreD, cboreD, cboreDepth };
}
function counterboreFeature(s) {
  const cb = parseCounterboreRequest(s);
  if (!cb) return null;
  const body = `cq.Workplane("XY").circle(${fmt(cb.baseD / 2)}).extrude(${fmt(cb.baseT)}).faces(">Z").workplane().cboreHole(${fmt(cb.boreD)}, ${fmt(cb.cboreD)}, ${fmt(cb.cboreDepth)})`;
  const desc = `counterbored cylinder OD ${fmt(cb.baseD)} x ${fmt(cb.baseT)} tall, bore ${fmt(cb.boreD)}, cbore ${fmt(cb.cboreD)} x ${fmt(cb.cboreDepth)} deep mm`;
  return { code: wrapScript(body, desc), shape: "counterbore", desc, dimsMm: [cb.baseD, cb.baseT, cb.boreD, cb.cboreD, cb.cboreDepth] };
}

/**
 * [6] EDGE CHAMFER / FILLET on a plain primitive -- the standard "break the edges" operation, drawn WITHOUT
 * ambiguity because the corpus states the edge set ("all four top edges" on a block; "on each end" / "both
 * ends" on a dowel/punch/pin). The chamfer/fillet SIZE is NOT in parseRequestPrint's dims -> dedicated parse.
 * Chamfer/fillet REMOVE material within the envelope, so the bbox (box) / OD+length (cylinder) validate
 * UNCHANGED. Two variants:
 *   box + top-edge break:   box(L,W,H).faces(">Z").edges().chamfer(c)   ("all four top edges")
 *   cylinder + both ends:   circle(r).extrude(L).edges("%CIRCLE").chamfer(c)   (both circular end edges)
 */
function parseChamferRequest(s) {
  const isChamfer = /\bchamfers?\b/i.test(s);
  const isFillet = /\bfillets?\b/i.test(s);
  if (isChamfer === isFillet) return null; // need exactly one (neither, or an ambiguous both -> defer)
  const op = isChamfer ? "chamfer" : "fillet";
  const U = "(inch|inches|in|mm|cm|[\"\\u2033])?";
  // "<size> <unit>? (by 45 degree)? chamfer/fillet(s)" -- the "by 45 degree" is the standard chamfer angle,
  // which is exactly what cadquery's symmetric .chamfer(leg) produces, so we only need the leg length.
  const sizeMm = dimMm(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*(?:by\\s*45\\s*deg\\w*\\s*)?${op}s?\\b`, "i"), s);
  if (sizeMm == null || sizeMm <= 0) return null;
  return { sizeMm, op };
}
/** Direct diameter + length parse for a round part whose shape word parseRequestPrint doesn't know (a
 *  "dowel pin: 0.250 dia, 1.5 long" has no "cylinder" token). Returns { D, L } mm or null. */
function cylDimsMm(s) {
  const U = "(inch|inches|in|mm|cm|[\"\\u2033])?";
  const D = dimMm(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*(?:dia\\w*|diameter)`, "i"), s);
  const L = dimMm(new RegExp(`([0-9]*\\.?[0-9]+)\\s*${U}\\s*(?:long|length|tall|high)\\b`, "i"), s);
  if (D == null || L == null || D <= 0 || L <= 0) return null;
  return { D, L };
}
function chamferFeature(s) {
  const c = parseChamferRequest(s);
  if (!c) return null;
  // Strip the EDGE/END qualifier before the multi-guard: "all four top edges" / "both ends" describe the
  // chamfer's edge set, NOT a hole pattern -- but "four" is in MULTI_OR_PATTERN, so it would false-bail.
  const sNoEdge = s
    .replace(/\b(?:all\s+)?(?:four|two|three|both|each|all)\s+(?:top\s+|bottom\s+|side\s+)?edges?\b/gi, " ")
    .replace(/\b(?:both\s+ends?|each\s+end)\b/gi, " ");
  // Keep it a PLAIN primitive + edge break: bail on any OTHER feature (a hole/slot/etc. + a chamfer is a
  // 2-feature part -> LLM) or a genuine multi/pattern qualifier (after the edge-set words are removed).
  if (/\b(?:hole|bore|slot|pocket|thread|tapped|keyway|counterbore|countersink|groove|c'?bore|c'?sink|boss)\b/i.test(s) || MULTI_OR_PATTERN.test(sNoEdge)) return null;
  const p = parseRequestPrint(s);
  const dims = Array.isArray(p.dims) ? p.dims : [];
  const lin = dims.filter((d) => d && d.type === "linear" && Number.isFinite(d.nominal) && d.nominal > 0).map((d) => d.nominal);
  const dia = dims.find((d) => d && d.type === "diameter" && Number.isFinite(d.nominal) && d.nominal > 0);
  // BOX / block + edge break. "top edges" -> the 4 edges of the top face; "all edges" -> every edge.
  if ((p.shape === "cube" || p.shape === "rect" || p.shape === "block") && lin.length === 3 && !dia) {
    const [L, W, H] = [...lin].sort((a, b) => b - a); // H = thinnest = thickness
    if (!(c.sizeMm < H && 2 * c.sizeMm < Math.min(L, W))) return null; // the break must fit the thickness + face (R12)
    const allEdges = /\ball\s+edges\b/i.test(s) && !/\btop\b/i.test(s);
    const sel = allEdges ? ".edges()" : '.faces(">Z").edges()';
    const where = allEdges ? "all" : "top";
    const body = `cq.Workplane("XY").box(${fmt(L)}, ${fmt(W)}, ${fmt(H)})${sel}.${c.op}(${fmt(c.sizeMm)})`;
    const desc = `box ${fmt(L)}x${fmt(W)}x${fmt(H)} mm + ${fmt(c.sizeMm)} mm ${c.op} on ${where} edges`;
    return { code: wrapScript(body, desc), shape: `${c.op}-box`, desc, dimsMm: [L, W, H, c.sizeMm] };
  }
  // CYLINDER / dowel / punch / pin + a chamfer on BOTH ENDS (the only unambiguous chamfer on a plain
  // cylinder). "%CIRCLE" selects both circular end edges. OD + length unchanged (chamfer is at the tips).
  // parseRequestPrint knows "cylinder/disc/shaft"; a "dowel pin"/"punch"/"rod" needs the direct cyl parse.
  let D = null, L = null;
  if ((p.shape === "cylinder" || p.shape === "disc" || p.shape === "shaft" || p.shape === "round") && dia && lin.length === 1) {
    D = dia.nominal; L = lin[0];
  } else if (/\b(?:dowel|pin|rod|punch|blank|cylinder|shaft|bar|stud)\b/i.test(s)) {
    const cd = cylDimsMm(s);
    if (cd) { D = cd.D; L = cd.L; }
  }
  if (D && L) {
    if (!(c.sizeMm < D / 2 && 2 * c.sizeMm < L)) return null; // must fit the radius + both ends of the length (R12)
    const body = `cq.Workplane("XY").circle(${fmt(D / 2)}).extrude(${fmt(L)}).edges("%CIRCLE").${c.op}(${fmt(c.sizeMm)})`;
    const desc = `cylinder dia ${fmt(D)} x ${fmt(L)} long mm + ${fmt(c.sizeMm)} mm ${c.op} both ends`;
    return { code: wrapScript(body, desc), shape: `${c.op}-cyl`, desc, dimsMm: [D, L, c.sizeMm] };
  }
  return null;
}

/** [3] FLANGED / STEPPED shaft -> two CONCENTRIC stacked cylinders (flange at base, shaft on top). Fully
 *  dimensioned (2 diameters + 2 lengths) -> deterministic. `circle(fD/2).extrude(fT).faces(">Z")...`. */
function steppedShaft(s) {
  if (!/\b(?:flange|flanged|shoulder(?:ed)?|stepped|step-?down|two[- ]?step)\b/i.test(s)) return null;
  // Keep it a PLAIN 2-step: bail on any COMPLICATING feature -- but NOT on "flange" itself (which is in the
  // shared OTHER_FEATURE list; using it here would reject every flange, the very shape this handler draws).
  if (/\b(?:hole|bore|slot|pocket|thread|tapped|keyway|fillet|chamfer|counterbore|countersink|taper|knurl|groove|c'?bore|c'?sink)\b/i.test(s) || MULTI_OR_PATTERN.test(s)) return null;
  const p = parseRequestPrint(s);
  const dims = Array.isArray(p.dims) ? p.dims : [];
  const dias = dims.filter((d) => d && d.type === "diameter" && Number.isFinite(d.nominal) && d.nominal > 0).map((d) => d.nominal);
  const lins = dims.filter((d) => d && d.type === "linear" && Number.isFinite(d.nominal) && d.nominal > 0).map((d) => d.nominal);
  if (dias.length !== 2 || lins.length !== 2 || dias[0] === dias[1]) return null;
  // request order is "<flangeD> flange <flangeT> thick on <shaftD> shaft <shaftL> long" -> dias[i] pairs with
  // lins[i]. The LARGER diameter is the flange (wide base); the smaller is the shaft.
  const [flangeD, flangeT, shaftD, shaftL] = dias[0] > dias[1]
    ? [dias[0], lins[0], dias[1], lins[1]]
    : [dias[1], lins[1], dias[0], lins[0]];
  const body = `cq.Workplane("XY").circle(${fmt(flangeD / 2)}).extrude(${fmt(flangeT)}).faces(">Z").workplane().circle(${fmt(shaftD / 2)}).extrude(${fmt(shaftL)})`;
  const desc = `flanged shaft: flange dia ${fmt(flangeD)} x ${fmt(flangeT)} thick + shaft dia ${fmt(shaftD)} x ${fmt(shaftL)} long mm`;
  return { code: wrapScript(body, desc), shape: "stepped-shaft", desc, dimsMm: [flangeD, flangeT, shaftD, shaftL] };
}

/** [1,2] HOLE features on a plain body (box + centered through-hole; round part + concentric center hole). */
function holeFeature(s) {
  if (!HAS_HOLE.test(s)) return null;                                  // no hole feature
  if (MULTI_OR_PATTERN.test(s) || OTHER_FEATURE.test(s) || OFFSET_LOCATION.test(s)) return null; // ambiguous / later algorithm
  if (/\bstepp(?:ed|ing)\b/i.test(s)) return null;                     // a STEPPED bore (0.6 stepping to 0.5) is not a simple hole/washer -> defer (R12: never mis-draw it as a plain washer)
  const p = parseRequestPrint(s);
  const dims = Array.isArray(p.dims) ? p.dims : [];
  const lin = dims.filter((d) => d && d.type === "linear" && Number.isFinite(d.nominal) && d.nominal > 0).map((d) => d.nominal);
  const dia = dims.find((d) => d && d.type === "diameter" && Number.isFinite(d.nominal) && d.nominal > 0);
  if ((p.shape === "cube" || p.shape === "rect" || p.shape === "block") && lin.length === 3 && dia) {
    const [L, W, H] = [...lin].sort((a, b) => b - a); // H = thinnest = thickness = hole axis
    const D = dia.nominal;
    if (!(D > 0 && D < Math.min(L, W))) return null;  // the hole must fit in the L x W face (R12: don't draw an impossible part)
    const body = `cq.Workplane("XY").box(${fmt(L)}, ${fmt(W)}, ${fmt(H)}).faces(">Z").workplane().hole(${fmt(D)})`;
    const desc = `box ${fmt(L)}x${fmt(W)}x${fmt(H)} mm + centered ${fmt(D)} mm through-hole (thru thickness)`;
    return { code: wrapScript(body, desc), shape: "box-hole", desc, dimsMm: [L, W, H, D] };
  }
  // [2] ROUND part (disc/cylinder/shaft) + a CENTER hole -> a washer/annulus. A hole on a round part is
  // CONCENTRIC with the axis by convention (unless it says cross/radial). Same geometry as a tube, different
  // phrasing ("disc ... with a hole" vs "bushing OD/ID"). circle(OD/2).circle(holeD/2).extrude(thickness).
  if ((p.shape === "disc" || p.shape === "cylinder" || p.shape === "shaft" || p.shape === "round") && lin.length === 1 && !CROSS_HOLE.test(s)) {
    const dias = dims.filter((d) => d && d.type === "diameter" && Number.isFinite(d.nominal) && d.nominal > 0);
    if (dias.length !== 2) return null; // a simple washer has EXACTLY OD + 1 hole; 3+ diameters = a stepped bore etc. -> defer, never silently drop a step (R12)
    const holeD = dias.find((d) => d.feature === "hole");
    const outerD = dias.find((d) => d.feature !== "hole");
    let OD = null, ID = null;
    if (outerD && holeD) { OD = outerD.nominal; ID = holeD.nominal; }
    else if (dias.length === 2) { const s2 = dias.map((d) => d.nominal).sort((a, b) => b - a); [OD, ID] = s2; } // larger = OD
    if (OD && ID && OD > ID) {
      const T = lin[0];
      const body = `cq.Workplane("XY").circle(${fmt(OD / 2)}).circle(${fmt(ID / 2)}).extrude(${fmt(T)})`;
      const desc = `washer/annulus OD ${fmt(OD)} x center hole ${fmt(ID)} x ${fmt(T)} thick mm`;
      return { code: wrapScript(body, desc), shape: "round-hole", desc, dimsMm: [OD, ID, T] };
    }
  }
  return null;
}
