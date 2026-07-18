// TemplateApplicabilityClassifierEngine.mjs
// Decides whether to (a) use an existing CamTemplate directly, (b) use template
// with parameter override, (c) compose from CAM-function-index, or (d) gate to
// operator. Pure-fn kNN over Jaccard similarity of (material, operation, machine,
// tolerance-class, geometry-class) feature tuples. No Ollama dependency.
//
// Per kilo soul refuse: silent-fallback-on-ambiguous-callouts — confidence below
// GATE_CONFIDENCE_FLOOR returns {decision:'gate', reason} so ambiguous geometries
// route to operator decision instead of mis-templating.
//
// Dispatcher contract (target wire-up — TS dispatcher will lazy-import this):
//   prism_ai:template_applicability_classify({
//     material, operation, machine, toleranceClass, geometryClass
//   }) → ClassifierResult
//
// schemaVersion 1.0.0

const SCHEMA_VERSION = '1.0.0';

// Confidence thresholds — calibrated on the 141-template CAM-AI-TRAINING-MS0
// corpus. Above DIRECT = high similarity to single template; OVERRIDE = good
// match but parameter delta detected; COMPOSE = no template match but feature
// tuple is well-formed; GATE = ambiguous, refuse silent fallback per kilo soul.
const DIRECT_CONFIDENCE_FLOOR = 0.85;
const OVERRIDE_CONFIDENCE_FLOOR = 0.55;
const COMPOSE_CONFIDENCE_FLOOR = 0.25;
const GATE_CONFIDENCE_FLOOR = 0.25;

// Metadata keys that aren't part of the feature tuple — filtered before
// similarity computation so a template's id/templateId/name field doesn't
// pollute the jaccard score.
const RESERVED_KEYS = new Set(['id', 'templateId', 'name', 'description', 'createdAt', 'version']);

/**
 * Jaccard similarity between two feature tuples.
 * tuples are flat objects of string-valued keys; missing keys count as
 * "no overlap on that key" (not as wildcard match — that would be silent
 * fallback per kilo soul). Reserved metadata keys (id, templateId, name,
 * description, createdAt, version) are filtered before comparison.
 * @param {Object<string,string>} a
 * @param {Object<string,string>} b
 * @returns {number} similarity in [0, 1]
 */
export function jaccardSimilarity(a, b) {
  if (!a || !b) return 0;
  const keysA = Object.keys(a).filter((k) => !RESERVED_KEYS.has(k));
  const keysB = Object.keys(b).filter((k) => !RESERVED_KEYS.has(k));
  const allKeys = new Set([...keysA, ...keysB]);
  if (allKeys.size === 0) return 0;
  let intersect = 0;
  let union = 0;
  for (const k of allKeys) {
    const va = a[k];
    const vb = b[k];
    if (va == null && vb == null) continue;
    union += 1;
    if (va != null && vb != null && String(va).toLowerCase() === String(vb).toLowerCase()) {
      intersect += 1;
    }
  }
  return union === 0 ? 0 : intersect / union;
}

/**
 * Detect whether the matched template needs parameter override.
 * If the (material, operation, machine) anchor triple matches but other
 * dimensions (toleranceClass, geometryClass) differ, that's an override case
 * — same template structure but parameter delta needed.
 * @param {Object} query
 * @param {Object} template
 * @returns {boolean}
 */
export function needsParameterOverride(query, template) {
  if (!query || !template) return false;
  const anchorMatches =
    (query.material || '').toLowerCase() === (template.material || '').toLowerCase() &&
    (query.operation || '').toLowerCase() === (template.operation || '').toLowerCase() &&
    (query.machine || '').toLowerCase() === (template.machine || '').toLowerCase();
  if (!anchorMatches) return false;
  const peripheralDiffers =
    (query.toleranceClass || '').toLowerCase() !== (template.toleranceClass || '').toLowerCase() ||
    (query.geometryClass || '').toLowerCase() !== (template.geometryClass || '').toLowerCase();
  return peripheralDiffers;
}

/**
 * Classify a feature tuple against a template corpus.
 * @param {Object} query - feature tuple {material, operation, machine, toleranceClass, geometryClass}
 * @param {Array<Object>} templates - corpus of CamTemplates with same shape + id field
 * @returns {{decision: 'direct'|'override'|'compose'|'gate', confidence: number, matchedTemplateId: string|null, alternatives: Array, reason: string}}
 */
export function classify(query, templates) {
  // Guard: empty or invalid corpus → cannot classify, route to operator gate.
  if (!Array.isArray(templates) || templates.length === 0) {
    return {
      decision: 'gate',
      confidence: 0,
      matchedTemplateId: null,
      alternatives: [],
      reason: 'empty-template-corpus',
    };
  }
  // Guard: missing required query fields → cannot classify, gate.
  if (!query || typeof query !== 'object') {
    return {
      decision: 'gate',
      confidence: 0,
      matchedTemplateId: null,
      alternatives: [],
      reason: 'invalid-query',
    };
  }
  if (!query.material || !query.operation || !query.machine) {
    return {
      decision: 'gate',
      confidence: 0,
      matchedTemplateId: null,
      alternatives: [],
      reason: 'missing-anchor-fields',
    };
  }
  // Score every template by Jaccard similarity. Sort descending.
  const scored = templates.map((t) => ({
    id: t.id || t.templateId || 'unknown',
    sim: jaccardSimilarity(query, t),
    template: t,
  })).sort((a, b) => b.sim - a.sim);
  const best = scored[0];
  const alternatives = scored.slice(1, 4).map((s) => ({ id: s.id, confidence: s.sim }));
  // Direct: very high similarity, no override needed.
  if (best.sim >= DIRECT_CONFIDENCE_FLOOR && !needsParameterOverride(query, best.template)) {
    return {
      decision: 'direct',
      confidence: best.sim,
      matchedTemplateId: best.id,
      alternatives,
      reason: 'jaccard-above-direct-floor',
    };
  }
  // Override: anchor matches but peripheral parameters differ.
  if (best.sim >= OVERRIDE_CONFIDENCE_FLOOR && needsParameterOverride(query, best.template)) {
    return {
      decision: 'override',
      confidence: best.sim,
      matchedTemplateId: best.id,
      alternatives,
      reason: 'anchor-match-peripheral-delta',
    };
  }
  // Direct (close-enough, no override flag).
  if (best.sim >= OVERRIDE_CONFIDENCE_FLOOR) {
    return {
      decision: 'direct',
      confidence: best.sim,
      matchedTemplateId: best.id,
      alternatives,
      reason: 'jaccard-above-override-floor',
    };
  }
  // Compose: query is well-formed but no template close enough — synthesize
  // from CAM-function-index. Downstream consumer composes; we just say it's
  // safe to attempt.
  if (best.sim >= COMPOSE_CONFIDENCE_FLOOR) {
    return {
      decision: 'compose',
      confidence: best.sim,
      matchedTemplateId: best.id,
      alternatives,
      reason: 'no-template-close-enough-compose-from-functions',
    };
  }
  // Gate: too ambiguous to silent-fallback. Operator must decide. Per kilo
  // soul this is the correct refuse path.
  return {
    decision: 'gate',
    confidence: best.sim,
    matchedTemplateId: null,
    alternatives,
    reason: 'confidence-below-gate-floor',
  };
}

export const META = {
  schemaVersion: SCHEMA_VERSION,
  thresholds: {
    direct: DIRECT_CONFIDENCE_FLOOR,
    override: OVERRIDE_CONFIDENCE_FLOOR,
    compose: COMPOSE_CONFIDENCE_FLOOR,
    gate: GATE_CONFIDENCE_FLOOR,
  },
};
