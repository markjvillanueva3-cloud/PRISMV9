/**
 * prism-base-job.mjs — the CANONICAL job definition for the Tier-1 Hurco base-post sample.
 *
 * Single source of truth for: the tool set, the stock + work-offset, the material, and the
 * per-program operation walk-through. The tool library generator (emit-tool-library.mjs), the
 * operator setup-card generator (emit-operator-packet.mjs), and the job pipeline
 * (prepare-hurco-job.mjs) all import from here, so a tool can never describe one thing in the
 * library and another on the operator card. Geometry mirrors emit-rich/base-sample-nc.mjs; the
 * drift guard in prism-base-job.test.mjs fails if they diverge.
 *
 * Why this exists (operator vision): PRISM targets shops with INEXPERIENCED machinists. The
 * program + tools + setup card must travel together and be self-explanatory — the machinist
 * shouldn't need to know speeds/feeds (the post computes them) or how to derive a tool list.
 */

export const UNITS = "inch";
export const MATERIAL = { iso: "P", name: "Steel (P)" };
export const WCS = "G54";

// The machine the base job runs on (Hurco VMX42SRTi — same controller WinMax reports). The SFC
// (prism_calc:speed_feed) REQUIRES spindle.max_rpm + spindle.power to clamp feeds/speeds to machine
// capability (its pre-machine-completeness-gate blocks otherwise), and the post-processor needs the
// same machine context — so it lives here in the single source of truth. Published VMX42SRTi class
// figures; refine against the real machine profile (ShopConfigurationEngine) when wiring to a specific cell.
export const MACHINE = {
  name: "Hurco VMX42SRTi",
  controller: "WinMax Mill",
  spindle: { max_rpm: 12000, power: 18 }, // power in kW (~24 HP)
};
export const STOCK = { x: 4, y: 3, z: 1, units: "inch", wcsCorner: "top-front-left", wcsCornerPlain: "top-front-left corner, top face" };

// num = the T# the program calls; lcf=flute length, oal=overall length, all inches.
export const TOOLS = [
  { num: 1, type: "face mill",     dia: 2.0,   lcf: 0.5,  oal: 2.0,  flutes: 5, rpm: 3000, sig: null, desc: '2" 5FL Face Mill',   pid: "prism-base-fm-200-5fl",  pocket: 'Load a 2" face mill (5 inserts).' },
  { num: 2, type: "flat end mill", dia: 0.5,   lcf: 1.0,  oal: 2.5,  flutes: 4, rpm: 6000, sig: null, desc: '1/2" 4FL End Mill',  pid: "prism-base-em-050-4fl",  pocket: 'Load a 1/2" 4-flute carbide end mill, stick-out ~1".' },
  { num: 3, type: "flat end mill", dia: 0.375, lcf: 0.75, oal: 1.75, flutes: 3, rpm: 8000, sig: null, desc: '3/8" 3FL End Mill',  pid: "prism-base-em-0375-3fl", pocket: 'Load a 3/8" 3-flute carbide end mill.' },
  { num: 4, type: "drill",         dia: 0.25,  lcf: 1.5,  oal: 3.0,  flutes: 2, rpm: 4000, sig: 118,  desc: '1/4" Drill 118deg',  pid: "prism-base-dr-025",      pocket: 'Load a 1/4" jobber drill (118 deg point).' },
  { num: 5, type: "flat end mill", dia: 0.25,  lcf: 0.75, oal: 1.75, flutes: 3, rpm: 9000, sig: null, desc: '1/4" 3FL End Mill',  pid: "prism-base-em-025-3fl",  pocket: 'Load a 1/4" 3-flute carbide end mill.' },
];

export function toolByNum(n) { return TOOLS.find((t) => t.num === n) || null; }

// Workholding for the sample part (4x3x1 plate). Kurt DX6 = 6" milling vise; model is INCH
// (verified via units-guard: STEP CONVERSION_BASED_UNIT 'INCH', ~13.2" extent). Published DX6 specs.
export const VISE = {
  model: "Kurt DX6", kind: "6-inch milling vise", units: "inch",
  modelFile: "resources/3- Basic Training Day 3/Misc. Vice Files/Kurt-DX6-WEB.STEP",
  jawWidth: 6.0, jawHeight: 2.0, maxOpening: 9.0, overallLength: 13.2,
  // sample-part placement: grip the 3" width (jaw opening ~3"), 4" length along the 6" jaw face,
  // raise on parallels so the part top is ~0.75" above the jaws — the program cuts a 0.6" pocket +
  // 0.5" drill from the TOP, so the cut + holder must clear the jaws.
  clampWidth: 3.0, alongJaw: 4.0, stickoutAboveJaw: 0.75,
};

// Per-program operation walk-through, in plain language for an inexperienced operator.
export const PROGRAMS = {
  rich: {
    file: "SAMPLE-PRISM-Base-Hurco-RICH.nc",
    title: "Pocket Plate — full 4-tool demo",
    toolNums: [1, 2, 3, 4],
    ops: [
      { tool: 1, name: "Face the top", plain: "Skim the top of the plate flat with the 2\" face mill (very shallow, 3 passes)." },
      { tool: 2, name: "Rough the pocket", plain: "Hog out the rectangular pocket with the 1/2\" end mill in 3 depth steps. PRISM speeds the feed up automatically on the lighter cuts." },
      { tool: 3, name: "Finish the pocket", plain: "Clean up the pocket walls and the rounded corners at full depth with the 3/8\" end mill." },
      { tool: 4, name: "Drill 4 holes", plain: "Peck-drill four 1/4\" holes with a G83 cycle — the control does the pecking and retracts to clear chips." },
    ],
  },
  basic: {
    file: "SAMPLE-PRISM-Base-Hurco.nc",
    title: "Basic 2-tool demo",
    toolNums: [2, 5],
    ops: [
      { tool: 2, name: "First cut", plain: "A short facing/slot pass with the 1/2\" end mill." },
      { tool: 5, name: "Contour pass", plain: "A light contour pass with the 1/4\" end mill (loaded as T2 in the basic program)." },
    ],
  },
};
