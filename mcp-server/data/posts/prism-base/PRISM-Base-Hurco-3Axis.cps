/**
 * PRISM-Base-Hurco-3Axis.cps — Tier-1 CHEAP standalone post (slot:echo)
 * ============================================================================
 * The lean BASE post: a real, minimal-COMPLETE Autodesk Fusion / HSMWorks post for a
 * HURCO VM-series 3-axis VMC (WinMax, ISNC). NO add-in required — the operator enters
 * machine + material + per-tool data by hand; the post does the physics. It beats a plain
 * speed/feed calculator because it knows YOUR machine's HP/torque + the cut geometry and
 * runs the unified PRISM Paths adaptive-feed engine per operation.
 *
 * Feed engine: include()s the SHARED no-drift core prism-paths-feed.cps (proven ===
 * prism-paths-feed.mjs by the equivalence test). Every feed factor has an enable toggle;
 * SAFETY factors (stickout, ae/LOC, power/torque guard) stay active unless prove-out.
 *
 * This is the lean base, NOT the 19K-line maximal v11 — it is the foundation the full v11
 * feature set and the Tier-2 add-in build on. Tested headless via the Fusion-API stub
 * harness in scripts/prism-base-hurco.test.mjs (drives onOpen→onSection→onLinear→onClose,
 * lints the emitted NC, asserts the feed reflects the prismPaths multiplier).
 * Re-derive any dialect code only from public Hurco WinMax manuals (U-LEGAL-13).
 */

description = "PRISM Base — Hurco VM 3-Axis (standalone, manual entry)";
vendor = "PRISM Manufacturing Intelligence";
vendorUrl = "";
legal = "Internal — JM Die / PRISM";
certificationLevel = 2;
extension = "nc";
setCodePage("ascii");
capabilities = CAPABILITY_MILLING;
tolerance = (typeof spatial !== "undefined") ? spatial(0.002, MM) : 0.002;
minimumChordLength = (typeof spatial !== "undefined") ? spatial(0.01, MM) : 0.01;
minimumCircularRadius = 0.01;
maximumCircularRadius = 1000;
allowHelicalMoves = true;
allowedCircularPlanes = (1 << PLANE_XY); // base post: XY arcs only

include("prism-paths-feed.cps"); // shared adaptive-feed core → prismPaths(), factor fns

properties = {
  prismProgramNumber:     { title: "Program number", description: "Onnnn program number", group: "general", type: "integer", value: 1000, scope: "post" },
  prismUnits:             { title: "Units (fallback)", description: "Used only if Fusion unit is unavailable", group: "general", type: "enum", values: [{title: "inch", id: "inch"}, {title: "mm", id: "mm"}], value: "inch", scope: "post" },
  prismMachineMaxRPM:     { title: "Spindle max RPM", description: "Speeds are clamped to this", group: "machine", type: "integer", value: 10000, scope: "post" },
  prismSpindleHP:         { title: "Spindle power (HP)", description: "Continuous spindle power — drives the power/torque guard", group: "machine", type: "number", value: 20, scope: "post" },
  prismSpindleTorqueFtLb: { title: "Spindle torque (ft-lb)", description: "Peak spindle torque — drives the power/torque guard", group: "machine", type: "number", value: 100, scope: "post" },
  prismMaterialISO:       { title: "Material ISO group", description: "P steel / M stainless / K iron / N alum / S superalloy / H hardened", group: "material", type: "enum", values: [{title: "P", id: "P"}, {title: "M", id: "M"}, {title: "K", id: "K"}, {title: "N", id: "N"}, {title: "S", id: "S"}, {title: "H", id: "H"}], value: "P", scope: "post" },
  prismMaterialHRC:       { title: "Material hardness (HRC)", description: "0 = unknown (no hardness derate)", group: "material", type: "number", value: 0, scope: "post" },
  prismAggressivenessLevel: { title: "Aggressiveness (1-8)", description: "1 = conservative (0.5x), 8 = max MRR (1.0x)", group: "feed", type: "integer", value: 5, scope: "post" },
  prismEnableHardness:    { title: "Feed: hardness derate", description: "", group: "feed", type: "boolean", value: true, scope: "post" },
  prismEnableChipThinning:{ title: "Feed: chip thinning", description: "", group: "feed", type: "boolean", value: true, scope: "post" },
  prismEnableAxialDepth:  { title: "Feed: axial-depth scaling", description: "", group: "feed", type: "boolean", value: true, scope: "post" },
  prismEnableAdaptive3D:  { title: "Feed: 3D-adaptive boost", description: "", group: "feed", type: "boolean", value: true, scope: "post" },
  prismEnableAggressiveness: { title: "Feed: aggressiveness scalar", description: "", group: "feed", type: "boolean", value: true, scope: "post" },
  // SAFETY toggles (stickout / ae-LOC / power-torque) exist but stay ACTIVE unless prove-out — by design.
  prismEnableStickout:    { title: "Feed: stickout (safety)", description: "Safety — active unless Prove-Out", group: "feed", type: "boolean", value: true, scope: "post" },
  prismEnableAeMaxSafe:   { title: "Feed: ae/LOC limit (safety)", description: "Safety — active unless Prove-Out", group: "feed", type: "boolean", value: true, scope: "post" },
  prismEnablePowerGuard:  { title: "Feed: power/torque guard (safety)", description: "Safety — active unless Prove-Out", group: "feed", type: "boolean", value: true, scope: "post" },
  prismProveOut:          { title: "Prove-out (first article)", description: "Allows safety feed-stages to be skipped", group: "feed", type: "boolean", value: false, scope: "post" },
  prismShowFeedNotes:     { title: "Show feed notes in NC", description: "Emit prismPaths factor notes as comments", group: "output", type: "boolean", value: true, scope: "post" },
  prismCoolant:           { title: "Coolant", description: "", group: "output", type: "enum", values: [{title: "Flood (M8)", id: "flood"}, {title: "Off", id: "off"}], value: "flood", scope: "post" }
};

// ── lean self-contained emit + format layer (a base post owns its formatting) ──
var OUT = []; // capturable output buffer (Fusion: writeln writes to file; harness reads OUT)
function emit(line) { OUT.push(line); if (typeof writeln === "function") writeln(line); }
function comment(text) { emit("(" + String(text).replace(/[()]/g, "") + ")"); } // Hurco/Fanuc () comments
function n3(v) { return (Math.round(v * 1000) / 1000).toString(); }
function n0(v) { return Math.round(v).toString(); }
function block() { var w = [], i; for (i = 0; i < arguments.length; i++) { if (arguments[i] !== undefined && arguments[i] !== null && arguments[i] !== "") w.push(arguments[i]); } if (w.length) emit(w.join(" ")); }

function prop(id, dflt) { try { var v = getProperty(id); return (v === undefined || v === null) ? dflt : v; } catch (e) { return dflt; } }
function getUnits() { if (typeof unit !== "undefined" && typeof MM !== "undefined") return (unit == MM) ? "mm" : "inch"; return prop("prismUnits", "inch"); }

var activeFeedMultiplier = 1.0;
var activeFeedNotes = [];

// ── build the prismPaths ctx for the current section from Fusion globals + properties ──
function buildSectionCtx() {
  var units = getUnits();
  var dia = (typeof tool !== "undefined" && tool.diameter) ? tool.diameter : 0;
  var flute = (typeof tool !== "undefined" && tool.fluteLength) ? tool.fluteLength : 0;
  var body = (typeof tool !== "undefined" && tool.bodyLength) ? tool.bodyLength : 0;
  var flutes = (typeof tool !== "undefined" && tool.numberOfFlutes) ? tool.numberOfFlutes : 0;
  var rpm = (typeof tool !== "undefined" && tool.spindleRPM) ? tool.spindleRPM : 0;
  var ae = secParam("operation:tool_stepover", secParam("operation:stepover", 0));
  var ap = secParam("operation:tool_stepdown", secParam("operation:stepdown", 0));
  var strategy = secParamStr("operation-strategy", "");
  var isFinish = /finish|contour|parallel|scallop|pencil|spiral/i.test(strategy);
  var isAdaptive = /adaptive|3d|pocket|slot/i.test(strategy);
  return {
    units: units, toolDia: dia, fluteLength: flute, toolLength: body > 0 ? body : (flute > 0 ? flute * 1.5 : dia * 3),
    numberOfFlutes: flutes, flutes: flutes, rpm: rpm,
    ae: ae, ap: ap, isFinishing: isFinish, isAdaptive: isAdaptive, isRoughing: !isFinish, is3D: isAdaptive,
    isoGroup: prop("prismMaterialISO", "P"), hrc: Number(prop("prismMaterialHRC", 0)),
    spindleHP: Number(prop("prismSpindleHP", 20)), spindleTorqueFtLb: Number(prop("prismSpindleTorqueFtLb", 100)),
    aggressivenessLevel: Number(prop("prismAggressivenessLevel", 5)), proveOut: prop("prismProveOut", false) === true,
    // the power/torque guard needs a representative feedrate; use the operation's programmed
    // cutting feed (the per-move feed isn't known until onLinear). The guard clamp is exact at
    // this nominal feed; per-move feeds inherit the multiplier (a base-post approximation).
    feed: secParam("operation:tool_feedCutting", 0)
  };
}
function secParam(name, dflt) { try { if (typeof currentSection !== "undefined" && currentSection.hasParameter && currentSection.hasParameter(name)) return currentSection.getParameter(name); } catch (e) {} return dflt; }
function secParamStr(name, dflt) { try { if (typeof currentSection !== "undefined" && currentSection.hasParameter && currentSection.hasParameter(name)) return String(currentSection.getParameter(name)); } catch (e) {} return dflt; }

function disabledStages() {
  var d = [];
  if (prop("prismEnableHardness", true) !== true) d.push("hardnessSpeed");
  if (prop("prismEnableChipThinning", true) !== true) d.push("chipThinning");
  if (prop("prismEnableAxialDepth", true) !== true) d.push("axialDepth");
  if (prop("prismEnableAdaptive3D", true) !== true) d.push("adaptive3D");
  if (prop("prismEnableAggressiveness", true) !== true) d.push("aggressiveness");
  if (prop("prismEnableStickout", true) !== true) d.push("stickoutDeflection");
  if (prop("prismEnableAeMaxSafe", true) !== true) d.push("aeMaxSafe");
  if (prop("prismEnablePowerGuard", true) !== true) d.push("powerTorqueGuard");
  return d;
}

// EXPORTED-FOR-TEST: compute the per-section feed multiplier via the shared prismPaths core.
function computeSectionFeedMultiplier() {
  var ctx = buildSectionCtx();
  var res = prismPaths(1.0, ctx, { disabled: disabledStages() }); // base 1.0 → feed === combinedFactor
  activeFeedNotes = res.warnings.concat(res.notes);
  return res.combinedFactor;
}

// ── Fusion post entry points ──
function onOpen() {
  OUT = [];
  var prog = Number(prop("prismProgramNumber", 1000));
  comment("PRISM BASE - HURCO VM 3-AXIS (standalone)");
  emit("O" + n0(prog));
  block((getUnits() === "mm") ? "G21" : "G20", "G17", "G90", "G94", "G54");
  block("G91", "G28", "Z0."); // safe Z home at start
  block("G90");
}
function onComment(text) { comment(text); }

function onSection() {
  var t = (typeof tool !== "undefined") ? tool : {};
  comment("OP - T" + n0(t.number || 0) + " D" + n3(t.diameter || 0));
  block("T" + n0(t.number || 0), "M06");
  var rpm = Math.min(Number(t.spindleRPM || 0), Number(prop("prismMachineMaxRPM", 10000)));
  if (rpm > 0) block("S" + n0(rpm), "M03");          // spindle ON at speed
  if (prop("prismCoolant", "flood") === "flood") block("M08"); // coolant AFTER spindle (mill rule)
  block("G00", "X0.", "Y0.");
  block("G43", "Z25.", "H" + n0(t.lengthOffset || t.number || 0)); // tool length comp, approach
  activeFeedMultiplier = computeSectionFeedMultiplier();
  if (prop("prismShowFeedNotes", true) === true) {
    comment("PRISM PATHS feed x" + n3(activeFeedMultiplier));
    for (var i = 0; i < activeFeedNotes.length && i < 6; i++) if (activeFeedNotes[i]) comment(activeFeedNotes[i]);
  }
}

function af(feed) { return Math.max(0, feed * activeFeedMultiplier); } // apply prismPaths multiplier
// Every move tracks position so a following arc computes I/J from its true start point
// (else onCircular after an onLinear/onRapid uses a stale center → wrong arc → gouge risk).
function onRapid(x, y, z) { block("G00", "X" + n3(x), "Y" + n3(y), "Z" + n3(z)); setPrev(x, y, z); }
function onLinear(x, y, z, feed) { block("G01", "X" + n3(x), "Y" + n3(y), "Z" + n3(z), "F" + n3(af(feed))); setPrev(x, y, z); }
function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
  var i = cx - getPrev("x"), j = cy - getPrev("y");
  block(clockwise ? "G02" : "G03", "X" + n3(x), "Y" + n3(y), "I" + n3(i), "J" + n3(j), "F" + n3(af(feed)));
  setPrev(x, y, z);
}
var _prev = { x: 0, y: 0, z: 0 };
function getPrev(k) { return _prev[k]; }
function setPrev(x, y, z) { _prev.x = x; _prev.y = y; _prev.z = z; }

// ── canned drilling cycles — WinMax ISNC supports the Fanuc-style G8x family. Fusion calls
// onCyclePoint(x,y,z) per hole with a `cycle` global; the first point emits the full G9x cycle
// definition, later points repeat with just X/Y, and onCycleEnd emits G80. (NOT plunge moves —
// real Hurco posts emit canned cycles so the control owns peck/dwell/retract.)
var _cycleActive = false;
function cycleGcode(type) {
  switch (String(type || "drilling")) {
    case "counter-boring": return "G82"; // spot/counterbore with dwell
    case "chip-breaking":  return "G73"; // high-speed peck (partial retract)
    case "deep-drilling":  return "G83"; // full-retract peck
    case "tapping": case "right-tapping": return "G84";
    case "left-tapping":   return "G74";
    case "reaming": case "boring": case "fine-boring": return "G85";
    default:               return "G81"; // simple drill
  }
}
function onCyclePoint(x, y, z) {
  var c = (typeof cycle !== "undefined" && cycle) ? cycle : {};
  var g = cycleGcode(c.type);
  var zDepth = (c.bottom !== undefined && c.bottom !== null) ? c.bottom : z;       // absolute final Z
  var rPlane = (c.retract !== undefined && c.retract !== null) ? c.retract : 0.1;  // absolute R plane
  if (!_cycleActive) {
    var blk = ["G98", g, "X" + n3(x), "Y" + n3(y), "Z" + n3(zDepth), "R" + n3(rPlane)];
    if (g === "G83" || g === "G73") { var q = Math.abs(Number(c.incrementalDepth || 0)); if (q > 0) blk.push("Q" + n3(q)); }
    if (g === "G82") { var p = Math.max(0, Number(c.dwell || 0)); if (p > 0) blk.push("P" + n0(Math.round(p * 1000))); } // dwell ms
    blk.push("F" + n3(af(Number(c.feedrate || 0))));
    block.apply(null, blk);
    _cycleActive = true;
  } else {
    block("X" + n3(x), "Y" + n3(y)); // repeat the active cycle at the next hole
  }
  setPrev(x, y, z);
}
function onCycleEnd() { if (_cycleActive) { block("G80"); _cycleActive = false; } }

function onSectionEnd() { if (_cycleActive) onCycleEnd(); block("M09"); block("G91", "G28", "Z0."); block("G90"); }
function onClose() { block("M30"); }

// CommonJS export for the headless test harness (no-op inside Fusion)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    onOpen: onOpen, onSection: onSection, onLinear: onLinear, onRapid: onRapid, onCircular: onCircular,
    onCyclePoint: onCyclePoint, onCycleEnd: onCycleEnd,
    onSectionEnd: onSectionEnd, onClose: onClose, onComment: onComment,
    computeSectionFeedMultiplier: computeSectionFeedMultiplier, buildSectionCtx: buildSectionCtx, disabledStages: disabledStages,
    _getOut: function () { return OUT; }, _setPrev: setPrev
  };
}
