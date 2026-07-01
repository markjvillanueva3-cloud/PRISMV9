/**
 * wizard-node-bridge.mjs — unified wizard contract for mill / lathe /
 * wire-EDM domain wizards.
 *
 * Today PRISM has three domain wizards (mill, lathe, wire_edm) that each
 * carry their own UI flow, state machine, answer collection, and output
 * schema. Operators trained on one wizard get lost in another — and the
 * shop-floor consumer code has to special-case every domain. This unit
 * defines ONE contract that all three wizards (and future wizards)
 * conform to, so the shop-floor UI is one component with three configs.
 *
 * Contract:
 *   - WIZARD_CONTRACT_VERSION
 *   - WIZARD_DOMAINS = ['mill','lathe','wire_edm']
 *   - STEP_KINDS = ['question','computation','validation','emit']
 *   - createWizard({domain, steps[]}) — immutable wizard instance
 *   - advance(wizard, answer) — fold an answer into current step (immutable)
 *   - canAdvance(wizard) — current step has all required input
 *   - currentStep(wizard) — get the step the user is on now
 *   - collectAnswers(wizard) — { stepId: answer } accumulator
 *   - emit(wizard) — if all steps complete, return structured output
 *   - summarizeProgress(wizard) — {current, total, percentage, status}
 *
 * Pure functions only. State is plain JSON; caller persists wherever.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-WIZARD-NODE-BRIDGE
 * @slot echo · @iter 38 · @date 2026-05-27
 */

export const WIZARD_CONTRACT_VERSION = 1;
export const WIZARD_DOMAINS = ["mill", "lathe", "wire_edm"];
export const STEP_KINDS = ["question", "computation", "validation", "emit"];
export const STATUS_VALUES = ["in_progress", "blocked", "complete", "errored"];

/** Pure: create a fresh wizard instance for one domain. */
export function createWizard(args) {
  const a = args || {};
  if (!WIZARD_DOMAINS.includes(a.domain)) return null;
  const stepsIn = Array.isArray(a.steps) ? a.steps : [];
  const steps = [];
  for (const s of stepsIn) {
    if (!s || typeof s !== "object") continue;
    if (typeof s.id !== "string" || s.id.length === 0) continue;
    if (typeof s.kind !== "string" || !STEP_KINDS.includes(s.kind)) continue;
    steps.push({
      id: s.id,
      kind: s.kind,
      prompt: typeof s.prompt === "string" ? s.prompt : "",
      required: s.required !== false,
      validator: typeof s.validator === "function" ? s.validator : null,
    });
  }
  if (steps.length === 0) return null;
  return {
    schemaVersion: WIZARD_CONTRACT_VERSION,
    domain: a.domain,
    wizardId: typeof a.wizardId === "string" ? a.wizardId : "default",
    steps,
    currentIndex: 0,
    answers: {},
    status: "in_progress",
    createdAtIso: typeof a.createdAtIso === "string" ? a.createdAtIso : new Date().toISOString(),
  };
}

/** Pure: get the current step the user is on (null if past end). */
export function currentStep(wizard) {
  if (!wizard || !Array.isArray(wizard.steps)) return null;
  if (wizard.currentIndex < 0 || wizard.currentIndex >= wizard.steps.length) return null;
  return wizard.steps[wizard.currentIndex];
}

/** Pure: can the wizard advance from the current step? */
export function canAdvance(wizard) {
  const step = currentStep(wizard);
  if (!step) return false;
  if (!step.required) return true;
  const ans = wizard.answers[step.id];
  if (ans === undefined || ans === null) return false;
  if (step.validator && typeof step.validator === "function") {
    try {
      return Boolean(step.validator(ans));
    } catch {
      return false;
    }
  }
  return true;
}

/** Pure: fold an answer into the wizard, advancing the cursor if valid. */
export function advance(wizard, answer) {
  if (!wizard) return wizard;
  const step = currentStep(wizard);
  if (!step) return wizard;
  const nextAnswers = answer !== undefined
    ? { ...wizard.answers, [step.id]: answer }
    : wizard.answers;
  const candidate = { ...wizard, answers: nextAnswers };
  if (!canAdvance(candidate)) {
    return { ...candidate, status: "blocked" };
  }
  const nextIndex = wizard.currentIndex + 1;
  const status = nextIndex >= wizard.steps.length ? "complete" : "in_progress";
  return {
    ...candidate,
    currentIndex: nextIndex,
    status,
  };
}

/** Pure: get the collected answers (copy, not reference). */
export function collectAnswers(wizard) {
  if (!wizard || !wizard.answers) return {};
  return { ...wizard.answers };
}

/** Pure: emit the structured wizard output IF complete. Returns null if not. */
export function emit(wizard) {
  if (!wizard || wizard.status !== "complete") return null;
  return {
    schemaVersion: WIZARD_CONTRACT_VERSION,
    domain: wizard.domain,
    wizardId: wizard.wizardId,
    completedAtIso: new Date().toISOString(),
    answers: collectAnswers(wizard),
    stepCount: wizard.steps.length,
  };
}

/** Pure: progress summary {current, total, percentage, status}. */
export function summarizeProgress(wizard) {
  if (!wizard || !Array.isArray(wizard.steps)) {
    return { current: 0, total: 0, percentage: 0, status: "errored" };
  }
  const total = wizard.steps.length;
  const current = Math.min(wizard.currentIndex, total);
  const percentage = total > 0 ? current / total : 0;
  return {
    current,
    total,
    percentage,
    status: wizard.status,
  };
}

/** Pure: rewind the wizard to step 0 (immutable). */
export function reset(wizard) {
  if (!wizard) return wizard;
  return {
    ...wizard,
    currentIndex: 0,
    answers: {},
    status: "in_progress",
  };
}

/** Pure: jump to an arbitrary step index (immutable, refuses out-of-bounds). */
export function jumpToStep(wizard, index) {
  if (!wizard || !Array.isArray(wizard.steps)) return wizard;
  const i = Math.floor(Number(index));
  if (!Number.isFinite(i) || i < 0 || i > wizard.steps.length) return wizard;
  const status = i >= wizard.steps.length ? "complete" : "in_progress";
  return { ...wizard, currentIndex: i, status };
}

/** Pure: per-domain step kind tally for telemetry. */
export function summarizeWizardShape(wizard) {
  const base = {
    schemaVersion: WIZARD_CONTRACT_VERSION,
    domain: wizard ? wizard.domain : null,
    totalSteps: 0,
    byKind: {},
    requiredCount: 0,
  };
  for (const k of STEP_KINDS) base.byKind[k] = 0;
  if (!wizard || !Array.isArray(wizard.steps)) return base;
  base.totalSteps = wizard.steps.length;
  for (const s of wizard.steps) {
    if (s && STEP_KINDS.includes(s.kind)) base.byKind[s.kind]++;
    if (s && s.required) base.requiredCount++;
  }
  return base;
}
