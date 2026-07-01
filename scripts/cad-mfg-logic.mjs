// cad-mfg-logic.mjs -- Stage-2 of the CAD closed loop (U-DELTA-CAD-MFG-LOGIC, slot:delta).
//
// Operator work order:
//   "...but also logic by deciphering the print and adding material for finishing
//    operations, adding features for clamping or work holding etc..."
//
// Stage 0 (cad-self-check) grades DIMENSIONAL accuracy of a generated CAD vs the print.
// Stage 2 (this module) adds the MANUFACTURING INTERPRETATION the operator asked for --
// it consumes a DECIPHERED print (parseRequestPrint output: {dims, shape, unit, featureCount})
// and produces:
//   (1) deriveStockBody    -- the raw/roughing stock envelope = finished envelope + machining
//                             allowance on every machined face (the "add material for finishing
//                             operations" half: a finish pass needs material left to clean up).
//   (2) proposeWorkholding  -- a rule-based workholding strategy + grip surfaces by envelope
//                             shape (the "add features for clamping or work holding" half).
//
// This is the ADVISORY DECIPHER layer (delta=CAD). Authoritative collision-clearance and
// chuck-jaw/clamp FORCE adequacy stay with the safety engines + Fusion kernel
// (CollisionDetectionEngine, prism_safety S(x)); this layer feeds the offline closed loop the
// same way cad-self-check feeds dimensional accuracy -- decipher now, kernel-verify under Fusion.
//
// UNITS: every value here is mm (parseRequestPrint emits nominal mm). All allowances are
// PER-SIDE mm; a dimension spanning two machined faces grows by 2x the per-side allowance.
// Bad dims (NaN/<=0) THROW -- units-first discipline, never silently coerce (the 25.4x class).
//
// Finishing-allowance reference values are machining-PRACTICE numbers, NOT physics constants
// (the constants.ts ban targets kc1.1/Taylor/Kienzle). Grounded + cited to in-repo CAM corpora:
//   - BobCAD 2D profiling finish stock 0.1-0.2 mm           (mcp-server/src/data/bobcad-cam-tips.ts:135)
//   - WorkNC staged semi-finish/finish 0.05 / 0.02 / 0.0 mm (mcp-server/src/data/worknc-cam-tips.ts:2257)
//   - lathe G71 roughing->finish U0.3 dia / W0.1 axial mm   (mcp-server/src/engines/AutoProgramOrchestratorEngine.ts:3464)

const MM_PER_INCH = 25.4;

// Round/turned envelope shapes -> chuck on the OD + lathe-process allowances. Canonical single
// source (consumed by proposeWorkholding here + cad-self-check-sweep's mfg-coverage). Exported so
// consumers never re-inline the set (it drifted into 3 copies before; scrutiny P3).
export const ROUND_SHAPES = new Set(["disc", "cylinder", "cone", "two-body"]);

// Finish-pass stock left on a near-net surface, PER SIDE, mm. Cited above.
// Bores/critical IDs run tighter than profiled ODs/faces (less spring, reamed/bored to size).
const FINISH_ALLOWANCE_MM = {
  mill: { profile: 0.15, face: 0.15, bore: 0.1, slot: 0.1 },
  lathe: { od: 0.15, face: 0.1, bore: 0.15 }, // od 0.15/side ~= G71 U0.3 on diameter
};

// Default roughing stock left BEFORE the finish pass, per side, mm (semi-finish gets the rest).
// Mill profiling typically roughs to ~0.5-1.0 mm before semi/finish; cited corpora above.
const DEFAULT_ROUGHING_MM = { mill: 0.85, lathe: 1.0 };

// Round a stock dimension UP to the next increment (mm). Stock is never smaller than need.
const STOCK_ROUND_MM = 0.5;

// Minimum depth of part material that must sit IN the vise jaws / chuck for a safe grip, mm.
// ~0.25 in is the shop rule of thumb for a milling vise; thinner parts need toe-clamps/fixture.
const MIN_GRIP_MM = 6.35;

function assertPosFinite(v, name) {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) {
    throw new Error(`cad-mfg-logic: ${name} must be a positive finite mm value, got ${v}`);
  }
}

function roundUpTo(v, inc) {
  return Math.ceil((v - 1e-9) / inc) * inc;
}

function processAllowance(process) {
  const p = String(process || "mill").toLowerCase();
  if (p === "lathe" || p === "turn" || p === "turning") return { key: "lathe", table: FINISH_ALLOWANCE_MM.lathe, rough: DEFAULT_ROUGHING_MM.lathe };
  return { key: "mill", table: FINISH_ALLOWANCE_MM.mill, rough: DEFAULT_ROUGHING_MM.mill };
}

// Split a deciphered print into the EXTERNAL envelope (the stock body grows from these) and
// INTERNAL features (holes/bores/counterbores -- REMOVED material, NOT envelope extents). A
// feature dim carries d.feature ("hole"/"counterbore"/"bore", set by parseRequestPrint).
// Excluding features is load-bearing: otherwise a 0.25 in hole would be "grown" with stock like
// an OD, and a flange's central bore could be picked as the chuck OD (scrutiny arm B, P1).
function envelopeOf(printDims) {
  const linears = [];
  const diameters = [];
  const features = [];
  for (const d of printDims || []) {
    if (!d || typeof d.nominal !== "number" || !Number.isFinite(d.nominal)) continue;
    if (d.feature) { features.push(d); continue; } // internal feature -- never the external envelope
    if (d.type === "linear") linears.push(d.nominal);
    else if (d.type === "diameter") diameters.push(d.nominal);
  }
  return { linears, diameters, features };
}

/**
 * deriveStockBody -- "add material for finishing operations".
 * Given a deciphered print, compute the raw stock envelope: each machined extent grows by
 * 2x (roughing + finishing) per-side allowance, then rounds UP to a standard stock increment.
 * Reports the finishing component separately (that is literally the material left for the finish op).
 *
 * @param {{dims:Array, shape?:string}} decipher  parseRequestPrint output
 * @param {{process?:string, roughingPerSideMm?:number, roundMm?:number}} [opts]
 * @returns {{applicable:boolean, process:string, shape:string,
 *            finishAllowancePerSideMm:object, totalAllowancePerSideMm:number,
 *            stockDims:number[], finishedDims:number[], addedPerDimMm:number[],
 *            notes:string[], reason?:string}}
 */
export function deriveStockBody(decipher, opts = {}) {
  const dims = decipher && Array.isArray(decipher.dims) ? decipher.dims : [];
  const shape = (decipher && decipher.shape) || "unknown";
  const { table, key, rough } = processAllowance(opts.process);
  const roughingPerSide = opts.roughingPerSideMm != null ? opts.roughingPerSideMm : rough;
  const roundMm = opts.roundMm != null ? opts.roundMm : STOCK_ROUND_MM;

  if (roughingPerSide < 0 || !Number.isFinite(roughingPerSide)) {
    throw new Error(`cad-mfg-logic: roughingPerSideMm must be >= 0 finite, got ${roughingPerSide}`);
  }

  const { linears, diameters, features } = envelopeOf(dims);
  if (linears.length === 0 && diameters.length === 0) {
    return { applicable: false, process: key, shape, reason: "no EXTERNAL envelope dims to add stock to (holes/bores alone are not a stock body)", stockDims: [], finishedDims: [], addedPerDimMm: [], internalFeatures: [], notes: [], finishAllowancePerSideMm: {}, totalAllowancePerSideMm: 0 };
  }

  // Finishing allowance per side: use the dominant face class for the process (profile for mill, od for lathe).
  const finishPerSide = key === "lathe" ? table.od : table.profile;
  assertPosFinite(finishPerSide, "finishPerSide");
  const totalPerSide = finishPerSide + roughingPerSide;
  const grow = 2 * totalPerSide; // both opposing faces of an extent are machined

  const finished = [...linears, ...diameters];
  const stockDims = [];
  const added = [];
  for (const v of finished) {
    assertPosFinite(v, "finished dim");
    const stock = roundUpTo(v + grow, roundMm);
    stockDims.push(Number(stock.toFixed(4)));
    added.push(Number((stock - v).toFixed(4)));
  }

  // Internal features (holes/bores) get finish stock on their ID -- the rough bore is left
  // UNDERSIZE so the finish bore/ream cleans up to size (opposite sign to growing an OD). Reported
  // separately; they are NOT part of the external stock envelope.
  const boreFinish = table.bore;
  const internalFeatures = features.map((f) => ({
    nominal: Number(f.nominal.toFixed(4)),
    feature: f.feature || "feature",
    finishAllowancePerSideMm: boreFinish,
    roughBoreNominalMm: Number(Math.max(0, f.nominal - 2 * boreFinish).toFixed(4)),
  }));

  const notes = [
    `finishing stock left for the finish pass: ${finishPerSide} mm/side (${key})`,
    `roughing stock before finish: ${roughingPerSide} mm/side`,
    `stock body = finished + ${grow.toFixed(3)} mm/axis, rounded up to ${roundMm} mm`,
  ];
  if (internalFeatures.length) notes.push(`${internalFeatures.length} internal feature(s): rough UNDERSIZE, finish-bore ${boreFinish} mm/side to size`);

  return {
    applicable: true,
    process: key,
    shape,
    finishAllowancePerSideMm: { ...table },
    totalAllowancePerSideMm: Number(totalPerSide.toFixed(4)),
    finishedDims: finished.map((v) => Number(v.toFixed(4))),
    stockDims,
    addedPerDimMm: added,
    internalFeatures,
    notes,
  };
}

/**
 * proposeWorkholding -- "add features for clamping or work holding".
 * Rule-based by envelope shape. Returns the holding method, the grip surfaces, the grip depth,
 * any clamping features to ADD to the model, and feasibility warnings (e.g. part too thin to
 * vise safely -> toe clamps / fixture plate). Advisory; jaw/clamp FORCE adequacy is the safety
 * engine's call (this only deciphers the strategy + geometry).
 *
 * @param {{dims:Array, shape?:string}} decipher
 * @param {{process?:string, minGripMm?:number}} [opts]
 * @returns {{applicable:boolean, shape:string, method:string, gripSurfaces:string[],
 *            gripDepthMm:number|null, addedFeatures:string[], warnings:string[], reason?:string}}
 */
export function proposeWorkholding(decipher, opts = {}) {
  const shape = (decipher && decipher.shape) || "unknown";
  const dims = decipher && Array.isArray(decipher.dims) ? decipher.dims : [];
  const minGrip = opts.minGripMm != null ? opts.minGripMm : MIN_GRIP_MM;
  const { linears, diameters } = envelopeOf(dims);

  const warnings = [];
  const addedFeatures = [];

  // Round / turned bodies -> chuck on the OD.
  if (ROUND_SHAPES.has(shape)) {
    const od = diameters.length ? Math.max(...diameters) : null;
    const len = linears.length ? Math.max(...linears) : null;
    const gripDepth = len != null ? Math.min(len * 0.25, minGrip * 2) : null;
    if (gripDepth != null && gripDepth < minGrip) {
      warnings.push(`short axial length (${len} mm) -> < ${minGrip} mm chuck grip; use a soft-jaw step or fixture, not a bare 3-jaw`);
    }
    return {
      applicable: od != null,
      shape,
      method: "lathe 3-jaw chuck (or mill soft jaws) on the largest OD",
      gripSurfaces: od != null ? [`OD ${od} mm`] : [],
      gripDepthMm: gripDepth != null ? Number(gripDepth.toFixed(3)) : null,
      addedFeatures,
      warnings,
      reason: od == null ? "round shape but no diameter dim deciphered" : undefined,
    };
  }

  // Prismatic plates / blocks / tubes -> milling vise on two parallel faces.
  const prismatic = new Set(["cube", "rect", "square-plate", "square-tube", "plate"]);
  if (prismatic.has(shape)) {
    const sorted = [...linears].sort((a, b) => b - a);
    const thickness = sorted.length ? sorted[sorted.length - 1] : null; // smallest extent = the part's thinnest dim
    if (thickness != null && thickness < minGrip) {
      warnings.push(`thin part (${thickness} mm < ${minGrip} mm jaw grip) -> toe clamps or a fixture plate with screws, not a milling vise`);
      addedFeatures.push("clamp clearance / toe-clamp ledges (vacuum or fixture-screw holes if no machinable tabs)");
      return { applicable: true, shape, method: "fixture plate / toe clamps (part too thin to vise safely)", gripSurfaces: ["bottom face on fixture, clamped edges"], gripDepthMm: null, addedFeatures, warnings };
    }
    addedFeatures.push("leave clamping stock on two opposing parallel faces (skim after release)");
    return {
      applicable: linears.length >= 2,
      shape,
      method: "milling vise on two parallel faces, part on parallels",
      gripSurfaces: ["two opposing parallel faces"],
      gripDepthMm: thickness != null ? Number(Math.min(thickness, minGrip).toFixed(3)) : null,
      addedFeatures,
      warnings,
      reason: linears.length < 2 ? "prismatic shape but < 2 linear extents deciphered" : undefined,
    };
  }

  // Unknown shape -> do not fabricate a strategy (soul rule: never heuristic-fill).
  return {
    applicable: false,
    shape,
    method: "unknown",
    gripSurfaces: [],
    gripDepthMm: null,
    addedFeatures,
    warnings,
    reason: `shape '${shape}' not deciphered to a workholding strategy -- defer to Fusion setup + safety review`,
  };
}

/**
 * mfgInterpretation -- full Stage-2 decipher: stock body + workholding in one call.
 * The closed-loop consumer (cad-text-to-cadquery / overnight loop) attaches this alongside
 * the Stage-0 self-check so a generation carries BOTH dimensional accuracy AND mfg logic.
 */
export function mfgInterpretation(decipher, opts = {}) {
  if (!decipher || !Array.isArray(decipher.dims) || decipher.dims.length === 0) {
    return { applicable: false, reason: "no deciphered print dims (unparseable request -- never fabricated)" };
  }
  return {
    applicable: true,
    shape: decipher.shape || "unknown",
    process: processAllowance(opts.process).key,
    stock: deriveStockBody(decipher, opts),
    workholding: proposeWorkholding(decipher, opts),
  };
}

export const __test = { FINISH_ALLOWANCE_MM, DEFAULT_ROUGHING_MM, MIN_GRIP_MM, MM_PER_INCH, roundUpTo, processAllowance, envelopeOf };
