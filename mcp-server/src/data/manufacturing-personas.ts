/**
 * manufacturing-personas.ts — Five domain-expert personas for the PRISM
 * consensus gate.
 *
 * Each persona is a structured prompt prefix + provider-profile preference +
 * a domain-weight vector. The consensus gate routes each review by question
 * domain — when the input touches Kienzle constants, the kienzle-physicist
 * gets a 1.5x weight in the quorum tally; non-experts retain weight 1.0.
 * The diversity rationale is the same as N-of-5 quorum itself: independent
 * domain expertise samples blind spots a single generalist provider misses.
 *
 * Domain detection is heuristic (see `detectDomain()`) — strong keyword
 * signals only. When no domain is detected, weights default to 1.0 across
 * the panel (neutral mode).
 *
 * P4-U05, INTEL-OLLAMA-OBSIDIAN-MS1.
 */

export type PersonaId =
  | "post-processor-engineer"
  | "kienzle-physicist"
  | "shop-floor-safety-auditor"
  | "dialect-translator"
  | "fixture-designer";

export type ManufacturingDomain =
  | "post-processor"
  | "kienzle"
  | "safety"
  | "dialect"
  | "fixture";

export type ProviderProfilePreference = "cloud" | "ollama" | "any";

export interface ManufacturingPersona {
  id: PersonaId;
  name: string;
  domain: ManufacturingDomain;
  /** Prompt fragment prepended to the review request when this persona votes. */
  promptPrefix: string;
  /** Hint to provider-resolver: which provider profile this persona binds best to. */
  providerProfilePreference: ProviderProfilePreference;
  /**
   * Self-weight when the question is in this persona's home domain.
   * Per the P4 phase rationale: "kienzle-physicist weighted 1.5x in the quorum".
   */
  homeDomainWeight: number;
  /**
   * Off-domain weight — what this persona contributes when the question is
   * NOT their domain. 1.0 = neutral, <1 = down-weighted, >1 = always-loud.
   * The default is 1.0 — every persona votes on every question, but only
   * the home-domain expert gets the extra boost.
   */
  offDomainWeight: number;
  /** Short rationale describing what this persona will catch that others miss. */
  catchPhrase: string;
}

const HOME_DOMAIN_WEIGHT = 1.5;
const OFF_DOMAIN_WEIGHT = 1.0;

export const MANUFACTURING_PERSONAS: readonly ManufacturingPersona[] = Object.freeze([
  {
    id: "post-processor-engineer",
    name: "Post-Processor Engineer",
    domain: "post-processor",
    promptPrefix:
      "You are a senior CNC post-processor engineer. Your specialty is " +
      "translating CAM toolpaths into controller-specific G-code while " +
      "preserving cutter-comp, tool-length-comp, work-offset, and rapid-move " +
      "intent. Flag anything that breaks dialect rules, drops decimals, or " +
      "emits modal residue from the previous block.",
    providerProfilePreference: "cloud",
    homeDomainWeight: HOME_DOMAIN_WEIGHT,
    offDomainWeight: OFF_DOMAIN_WEIGHT,
    catchPhrase:
      "Catches: malformed G-code, dropped decimals, modal residue, miscompiled cutter-comp.",
  },
  {
    id: "kienzle-physicist",
    name: "Kienzle Physicist",
    domain: "kienzle",
    promptPrefix:
      "You are a metal-cutting physicist. Your specialty is the Kienzle " +
      "force model (kc1.1, mc, hc), Taylor tool-life model, and Johnson-Cook " +
      "constitutive model. All physics constants in PRISM live in " +
      "`mcp-server/src/physics/constants.ts` — flag any inlined value or " +
      "dimensional inconsistency. Question energy budgets that exceed " +
      "spindle power.",
    providerProfilePreference: "cloud",
    homeDomainWeight: HOME_DOMAIN_WEIGHT,
    offDomainWeight: OFF_DOMAIN_WEIGHT,
    catchPhrase:
      "Catches: inlined Kienzle/Taylor/JC constants, unit drift, spindle-power overruns.",
  },
  {
    id: "shop-floor-safety-auditor",
    name: "Shop-Floor Safety Auditor",
    domain: "safety",
    promptPrefix:
      "You are a shop-floor safety auditor. You enforce the tiered S(x) " +
      "thresholds (shop-floor: Ω≥0.95 / S(x)≥0.98). NCG quality grades " +
      "(Ra), ISO 4287 surface finish, ISO 13041 capability rules, and " +
      "rapid-move clearance margins are non-negotiable. Reject any change " +
      "that softens a guard, weakens a test, or moves a constant inline.",
    providerProfilePreference: "cloud",
    homeDomainWeight: HOME_DOMAIN_WEIGHT,
    offDomainWeight: OFF_DOMAIN_WEIGHT,
    catchPhrase:
      "Catches: softened gates, weakened tests, NCG/ISO violations, clearance regressions.",
  },
  {
    id: "dialect-translator",
    name: "Controller Dialect Translator",
    domain: "dialect",
    promptPrefix:
      "You are a multi-controller dialect translator. You know Fanuc, " +
      "Haas, Okuma OSP (G68.2 tilted-plane syntax), Mazak Matrix, " +
      "Siemens 840D, Heidenhain TNC by heart. Macro variable namespaces, " +
      "modal-state preservation across subroutines, and post-processor " +
      "comment grammar are your core competence.",
    providerProfilePreference: "ollama",
    homeDomainWeight: HOME_DOMAIN_WEIGHT,
    offDomainWeight: OFF_DOMAIN_WEIGHT,
    catchPhrase:
      "Catches: dialect mistranslations, macro-var collisions, lost modal state, malformed G68.2.",
  },
  {
    id: "fixture-designer",
    name: "Fixture Designer",
    domain: "fixture",
    promptPrefix:
      "You are a workholding and fixture designer. You enforce ISO 13041 " +
      "capability rules, evaluate clamp-force adequacy against cutting " +
      "loads, check pull-out resistance, and audit rapid-clearance to " +
      "fixture geometry. Anything within a tool-radius of a fixture face " +
      "without explicit clearance modeling is a red card.",
    providerProfilePreference: "cloud",
    homeDomainWeight: HOME_DOMAIN_WEIGHT,
    offDomainWeight: OFF_DOMAIN_WEIGHT,
    catchPhrase:
      "Catches: clamp-force shortfalls, pull-out risk, ISO 13041 violations, fixture collisions.",
  },
]);

const PERSONA_BY_ID: Record<PersonaId, ManufacturingPersona> = Object.fromEntries(
  MANUFACTURING_PERSONAS.map((p) => [p.id, p])
) as Record<PersonaId, ManufacturingPersona>;

export function getPersona(id: PersonaId): ManufacturingPersona {
  const p = PERSONA_BY_ID[id];
  if (!p) throw new Error(`unknown persona: ${id}`);
  return p;
}

// ─────────────────────────────────────────────────────────────────
// Domain detection
// ─────────────────────────────────────────────────────────────────

interface DomainSignal {
  domain: ManufacturingDomain;
  patterns: RegExp[];
}

const DOMAIN_SIGNALS: readonly DomainSignal[] = [
  {
    domain: "kienzle",
    patterns: [
      /\bkienzle\b/i,
      /\bkc[\s_]?1\.?1\b/i,
      /\b(?:taylor|johnson[-\s]?cook|jc)\b.*(?:tool[-\s]?life|wear|constitutive)/i,
      /\bcutting[-\s]?force\b/i,
      /\bphysics[/\\]constants/i,
      /\bspindle[-\s]?power\b/i,
    ],
  },
  {
    domain: "fixture",
    patterns: [
      /\bfixture\b/i,
      /\biso[-\s]?13041\b/i,
      /\bworkholding\b/i,
      /\bclamp[-\s]?(?:force|pressure)\b/i,
      /\bvise\b/i,
      /\bpull[-\s]?out\b/i,
    ],
  },
  {
    domain: "dialect",
    patterns: [
      /\bg68\.2\b/i,
      /\b(?:okuma|fanuc|haas|mazak|heidenhain|siemens)\b.*(?:syntax|dialect|controller)/i,
      /\bosp[-\s]?(?:p|u)?\d{2,3}\b/i,
      /\btilted[-\s]?plane\b/i,
      /\bmacro[-\s]?variable\b/i,
    ],
  },
  {
    domain: "safety",
    patterns: [
      /\bs\(x\)\b/i,
      /\bomega\s*[≥>=]\s*0\.\d/i,
      /\bncg[-\s]?(?:quality|grade)\b/i,
      /\bra\s*[<>=][^a-z]/i,
      /\bsoften(?:ed|ing)?[-\s]?(?:guard|gate|test)/i,
      /\bcollision\b/i,
      /\bclearance\b/i,
    ],
  },
  {
    domain: "post-processor",
    patterns: [
      /\bpost[-\s]?processor\b/i,
      /\bsandvik\b.*(?:feed|table|coromant)/i,
      /\bcutter[-\s]?comp\b/i,
      /\btool[-\s]?length[-\s]?comp\b/i,
      /\bg-?code\b/i,
      /\bnc[-\s]?(?:program|emit|gen)/i,
    ],
  },
];

/**
 * Detect the manufacturing domain of a review input. Returns the FIRST
 * matching domain (signals are tried in priority order: kienzle → fixture
 * → dialect → safety → post-processor). Returns null when no signal hits.
 */
export function detectDomain(input: string): ManufacturingDomain | null {
  if (typeof input !== "string" || input.length === 0) return null;
  for (const sig of DOMAIN_SIGNALS) {
    for (const rx of sig.patterns) {
      if (rx.test(input)) return sig.domain;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────
// Weight resolution
// ─────────────────────────────────────────────────────────────────

/**
 * Build a `providerId → weight` map for the active persona panel given the
 * detected domain. Each persona contributes their `homeDomainWeight` if their
 * domain matches; otherwise their `offDomainWeight`. A null domain returns
 * a flat 1.0 weight per persona (neutral mode).
 */
export function personaWeightsForDomain(
  domain: ManufacturingDomain | null
): Record<PersonaId, number> {
  const out = {} as Record<PersonaId, number>;
  for (const p of MANUFACTURING_PERSONAS) {
    out[p.id] = domain == null
      ? OFF_DOMAIN_WEIGHT
      : p.domain === domain
      ? p.homeDomainWeight
      : p.offDomainWeight;
  }
  return out;
}

/**
 * Convenience: detect the domain and resolve the weights in one call.
 * Returns `{ domain, weights }` so callers can log which domain was inferred
 * for the arbitration record.
 */
export function resolvePersonaWeights(
  input: string
): { domain: ManufacturingDomain | null; weights: Record<PersonaId, number> } {
  const domain = detectDomain(input);
  return { domain, weights: personaWeightsForDomain(domain) };
}
