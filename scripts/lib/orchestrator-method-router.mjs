// scripts/lib/orchestrator-method-router.mjs
//
// U-MMO-METHOD-ROUTER — programming-method decision (india-owned per spec).
// Sierra-built foundation; india wires real engine data.
//
// PURPOSE
// Per Agent C, ProgrammingMethodOrchestratorEngine does NOT exist. Today
// PRISM defaults to CAM toolpath for everything. But for some parts:
//   - Macro is faster/cheaper (repeated hole pattern on Fanuc/Okuma)
//   - Conversational is faster (Mazatrol on simple parts + experienced op)
//   - On-machine programming is right (proto + simple geom + no CAM seat)
//
// METHODS
const METHODS = Object.freeze(["cam", "macro", "conversational", "on_machine"]);

const METHOD_COMPATIBILITY = Object.freeze({
  cam:              { volumes: ["one_off", "low_10", "med_100", "high_1000", "production_10k"], complexities: ["simple", "medium", "complex", "very_complex"], operators: ["novice", "standard", "expert"] },
  macro:            { volumes: ["med_100", "high_1000", "production_10k"], complexities: ["simple", "medium"], operators: ["standard", "expert"] },
  conversational:   { volumes: ["one_off", "low_10"], complexities: ["simple", "medium"], operators: ["expert"] },
  on_machine:       { volumes: ["one_off"], complexities: ["simple"], operators: ["expert"] },
});

const CONTROLLER_METHOD_SUPPORT = Object.freeze({
  fanuc:        ["cam", "macro", "on_machine"],
  okuma:        ["cam", "macro", "on_machine"],
  haas:         ["cam", "conversational", "on_machine"],
  mazak:        ["cam", "conversational", "on_machine"],
  heidenhain:   ["cam", "conversational"],
  siemens:      ["cam", "macro"],
  mitsubishi:   ["cam", "macro"],
  hurco:        ["cam", "conversational"],
});

/**
 * Route a part to a programming method.
 *
 * @param {object} params
 * @param {string} params.controller       - fanuc|okuma|haas|...
 * @param {string} params.volumeTier       - one_off|low_10|med_100|high_1000|production_10k
 * @param {string} params.complexity       - simple|medium|complex|very_complex
 * @param {string} params.operatorSkill    - novice|standard|expert
 * @param {object} [params.priors]         - { method: count } from win/lose history
 * @returns {{primary, alternates, reasoning: string[]}}
 */
export function routeMethod({ controller, volumeTier, complexity, operatorSkill, priors = {} }) {
  if (!controller || !CONTROLLER_METHOD_SUPPORT[controller]) {
    throw new Error(`routeMethod: unknown controller '${controller}'`);
  }
  if (!volumeTier) throw new Error("routeMethod: volumeTier required");
  if (!complexity) throw new Error("routeMethod: complexity required");
  if (!operatorSkill) throw new Error("routeMethod: operatorSkill required");

  const supported = CONTROLLER_METHOD_SUPPORT[controller];
  const scored = [];
  for (const method of supported) {
    const compat = METHOD_COMPATIBILITY[method];
    if (!compat.volumes.includes(volumeTier)) continue;
    if (!compat.complexities.includes(complexity)) continue;
    if (!compat.operators.includes(operatorSkill)) continue;

    // Score: prior count (Thompson-sampling-style) + base preference
    const prior = priors[method] || 0;
    let score = 1.0 + prior * 0.1;
    // CAM is safest default — slight boost when no priors
    if (method === "cam" && prior === 0) score += 0.05;
    // Macro big boost for high-volume + simple
    if (method === "macro" && ["high_1000", "production_10k"].includes(volumeTier)) score += 0.4;
    // Conversational for simple+low_10 with expert
    if (method === "conversational" && complexity === "simple" && operatorSkill === "expert") score += 0.3;
    scored.push({ method, score });
  }
  if (scored.length === 0) {
    return {
      primary: null,
      alternates: [],
      reasoning: [`no method compatible with controller=${controller}, volume=${volumeTier}, complexity=${complexity}, skill=${operatorSkill}`],
    };
  }
  scored.sort((a, b) => b.score - a.score);
  return {
    primary: scored[0].method,
    alternates: scored.slice(1).map((s) => s.method),
    reasoning: scored.map((s) => `${s.method}: score ${s.score.toFixed(2)}`),
  };
}

export { METHODS, METHOD_COMPATIBILITY, CONTROLLER_METHOD_SUPPORT };
