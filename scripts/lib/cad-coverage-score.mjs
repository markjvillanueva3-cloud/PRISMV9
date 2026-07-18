/**
 * cad-coverage-score.mjs -- pure: score CAD-generation-technique coverage from deterministic grep
 * hit-counts (U-CADGEN-COVERAGE-METER, slot:india 2026-06-12). The agent-free workaround for the
 * rate-limited audit: a coverage AUDIT is a deterministic search problem (R5) -- grep per category-
 * keyword, score in code, reserve the model for nothing. Re-runnable -> the closed-loop training
 * PROGRESS METER (coverage % climbs as gap-closing data is ingested).
 *
 * HONEST (R12): this measures MENTION-coverage (does the corpus reference the technique anywhere),
 * NOT operation-procedure depth. The 2026-06-12 agent audit measured ~7% REAL / ~19% concept-touched
 * by READING files; a grep meter approximates the concept-touched signal. That is still the right
 * progress proxy: as CAD-system command references are ingested, mention-coverage climbs and tracks
 * training-data availability. Pure -> hermetically testable.
 *
 * CATEGORIES mirror the 361-technique taxonomy's 33 buckets, each with CAD-SPECIFIC keywords chosen
 * to minimize cross-domain false positives (e.g. "base flange" not bare "flange"; "parting surface"
 * not bare "parting"). `essential` flags the buckets a draw-ANY-part generator cannot omit.
 */

export const CATEGORIES = Object.freeze([
  { id: 'sketch-additive', label: 'Sketch additive (extrude/revolve/sweep/loft)', essential: true,
    keywords: ['extrude', 'revolve', 'sweep', 'loft', 'boss feature', 'thin feature', 'boundary surface solid'] },
  { id: 'sketch-subtractive', label: 'Sketch subtractive (cut/pocket/groove)', essential: true,
    keywords: ['extruded cut', 'revolved cut', 'swept cut', 'lofted cut', 'pocket feature'] },
  { id: 'dress-up', label: 'Dress-up (fillet/chamfer/shell/draft/rib)', essential: true,
    keywords: ['fillet', 'chamfer', 'shell feature', 'draft angle', 'rib feature', 'variable radius'] },
  { id: 'holes', label: 'Hole family (cbore/csink/tap/wizard)', essential: true,
    keywords: ['counterbore', 'countersink', 'hole wizard', 'tapped hole', 'clearance hole', 'pipe tap'] },
  { id: 'threads-coils', label: 'Threads / helical / coil', essential: true,
    keywords: ['helical thread', 'cosmetic thread', 'helix', 'coil feature', 'helical sweep', 'variable pitch'] },
  { id: 'patterns', label: 'Patterns / replication', essential: true,
    keywords: ['linear pattern', 'circular pattern', 'mirror feature', 'curve driven pattern', 'sketch driven pattern', 'fill pattern', 'table driven pattern'] },
  { id: 'boolean', label: 'Boolean / combine', essential: true,
    keywords: ['boolean union', 'boolean subtract', 'boolean intersect', 'combine bodies', 'split body', 'multibody'] },
  { id: 'surface-patch', label: 'Surface patch types (NURBS/Bezier/Coons)', essential: false,
    keywords: ['nurbs surface', 'bezier surface', 'b-spline surface', 'coons patch', 'gordon surface', 't-spline'] },
  { id: 'surface-generated', label: 'Surface generated (ruled/lofted/swept/boundary/fill)', essential: true,
    keywords: ['ruled surface', 'lofted surface', 'swept surface', 'boundary surface', 'fill surface', 'network surface', 'planar surface'] },
  { id: 'surface-modify', label: 'Surface modify (offset/trim/knit/extend/continuity)', essential: false,
    keywords: ['offset surface', 'trim surface', 'knit surface', 'extend surface', 'surface continuity', 'thicken surface', 'untrim'] },
  { id: 'subd-direct', label: 'Sub-D / direct / mesh-to-BREP', essential: false,
    keywords: ['sub-d', 'subdivision surface', 't-spline', 'sculpt', 'push pull', 'direct edit', 'mesh to brep', 'synchronous', 'move face'] },
  { id: 'reference-geom', label: 'Reference geometry (planes/axes/CS)', essential: true,
    keywords: ['reference plane', 'construction plane', 'datum plane', 'reference axis', 'coordinate system', 'work plane'] },
  { id: 'curves', label: 'Curves (spline/projected/intersection/helix)', essential: true,
    keywords: ['spline', 'projected curve', 'intersection curve', 'composite curve', 'isocline', 'equation curve', '3d sketch'] },
  { id: 'sheet-metal', label: 'Sheet metal (flange/bend/hem/flat-pattern)', essential: true,
    keywords: ['sheet metal', 'base flange', 'edge flange', 'miter flange', 'hem feature', 'sketched bend', 'flat pattern', 'k-factor', 'bend allowance', 'lofted bend', 'jog feature'] },
  { id: 'weldments', label: 'Weldments (members/gusset/weld-bead/cut-list)', essential: true,
    keywords: ['weldment', 'structural member', 'weld bead', 'gusset', 'trim extend', 'cut list', 'end cap', 'frame generator'] },
  { id: 'mold-tooling', label: 'Mold & tooling (parting/core-cavity/electrode)', essential: true,
    keywords: ['parting line', 'parting surface', 'core cavity', 'shut-off surface', 'mold base', 'runner gate', 'cooling channel', 'ejector pin', 'electrode', 'side core', 'slide lifter'] },
  { id: 'die-design', label: 'Die design (strip/blank/draw/springback)', essential: true,
    keywords: ['strip layout', 'blank development', 'draw die', 'pierce blank', 'springback', 'progressive die', 'punch die clearance'] },
  { id: 'casting-plastic', label: 'Casting / plastic features (draft/core-print/snap)', essential: false,
    keywords: ['core print', 'machining allowance', 'living hinge', 'snap fit', 'snap hook', 'insert pocket', 'uniform wall', 'gas vent'] },
  { id: 'assembly-mates', label: 'Assembly mates / joints', essential: true,
    keywords: ['assembly mate', 'concentric mate', 'coincident mate', 'mechanical mate', 'gear mate', 'joint dof', 'revolute joint', 'as-built joint'] },
  { id: 'assembly-patterns', label: 'Assembly component patterns', essential: false,
    keywords: ['component pattern', 'mirror component', 'smart fastener', 'pattern driven component', 'chain pattern'] },
  { id: 'top-down', label: 'Top-down / skeleton', essential: false,
    keywords: ['top-down', 'in-context', 'skeleton model', 'master model', 'layout sketch', 'external reference', 'published geometry'] },
  { id: 'parametric-config', label: 'Parametric / configuration control', essential: true,
    keywords: ['design table', 'configuration', 'family table', 'equation relation', 'global variable', 'suppression state', 'ilogic'] },
  { id: 'import-repair', label: 'Import / repair / feature-recognition', essential: true,
    keywords: ['step import', 'iges import', 'parasolid', 'feature recognition', 'import diagnostics', 'gap healing', 'tolerant modeling', 'heal geometry'] },
  { id: '2d-drawing', label: '2D drawing generation', essential: true,
    keywords: ['section view', 'detail view', 'auxiliary view', 'ordinate dimension', 'hole table', 'gd&t', 'flat pattern view', 'dxf export', 'balloon bom'] },
  { id: 'generative', label: 'Generative / topology optimization', essential: false,
    keywords: ['generative design', 'topology optimization', 'generative shape design', 'knowledgeware', 'lattice'] },
]);

/** Decide a single technique-category coverage state from a hit count. */
export function coverageState(hits, { deepThreshold = 5, shallowThreshold = 1 } = {}) {
  if (hits >= deepThreshold) return 'covered';
  if (hits >= shallowThreshold) return 'shallow';
  return 'absent';
}

/**
 * Score the full matrix.
 * @param {object} hits  - { [galaxy]: { [categoryId]: hitCount } }  (deterministic grep counts)
 * @param {object} [opts]
 * @returns {{ perCategory, perGalaxy, totals }}
 *   perCategory[catId] = { label, essential, state(union across galaxies), coveringGalaxies[], totalHits }
 *   perGalaxy[g] = { covered[], shallow[], absentCount }
 *   totals = { categories, covered, shallow, absent, coveredPct, essentialGaps[] }
 */
export function scoreCoverage(hits, opts = {}) {
  const galaxies = Object.keys(hits || {});
  const perCategory = {};
  for (const cat of CATEGORIES) {
    const covering = [];
    let totalHits = 0;
    let best = 'absent';
    for (const g of galaxies) {
      const h = Number((hits[g] || {})[cat.id]) || 0;
      totalHits += h;
      const st = coverageState(h, opts);
      if (st !== 'absent') covering.push({ galaxy: g, hits: h, state: st });
      if (st === 'covered' || (st === 'shallow' && best === 'absent')) best = st === 'covered' ? 'covered' : 'shallow';
    }
    perCategory[cat.id] = { label: cat.label, essential: cat.essential, state: best, coveringGalaxies: covering, totalHits };
  }
  const perGalaxy = {};
  for (const g of galaxies) {
    const covered = [], shallow = [];
    for (const cat of CATEGORIES) {
      const st = coverageState(Number((hits[g] || {})[cat.id]) || 0, opts);
      if (st === 'covered') covered.push(cat.id);
      else if (st === 'shallow') shallow.push(cat.id);
    }
    perGalaxy[g] = { covered, shallow, absentCount: CATEGORIES.length - covered.length - shallow.length };
  }
  const states = CATEGORIES.map((c) => perCategory[c.id].state);
  const covered = states.filter((s) => s === 'covered').length;
  const shallow = states.filter((s) => s === 'shallow').length;
  const absent = states.filter((s) => s === 'absent').length;
  const essentialGaps = CATEGORIES.filter((c) => c.essential && perCategory[c.id].state === 'absent').map((c) => c.id);
  const totals = {
    categories: CATEGORIES.length, covered, shallow, absent,
    coveredPct: Math.round((covered / CATEGORIES.length) * 1000) / 10,
    touchedPct: Math.round(((covered + shallow) / CATEGORIES.length) * 1000) / 10,
    essentialGaps,
  };
  return { perCategory, perGalaxy, totals };
}
