/**
 * OnboardingEngine.ts — R8-MS3 Onboarding & First 5 Minutes
 * ===========================================================
 *
 * Progressive disclosure system for new PRISM users.
 * Tracks interaction count and adjusts response depth:
 *
 *   Level 0 — INSTANT VALUE: Speed, feed, DOC. Prove competence immediately.
 *   Level 1 — REVEAL DEPTH: After 2-3 queries, mention chatter/strategy/cycle time.
 *   Level 2 — SHOW INTELLIGENCE: After ~5 queries, offer parameter optimization.
 *   Level 3 — OFFER INTEGRATION: After ~10 queries, suggest shop profile.
 *   Level 4 — ENABLE LEARNING: After ~20 queries, offer outcome tracking.
 *
 * Also generates welcome messages and contextual suggestions.
 *
 * @version 1.0.0 — R8-MS3
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type DisclosureLevel = 0 | 1 | 2 | 3 | 4;

export interface UserProfile {
  name?: string;
  company?: string;
  role?: "machinist" | "programmer" | "manager" | "engineer" | "student";
  experience_years?: number;
  machines?: { id: string; nickname?: string }[];
  preferred_tools?: { manufacturer: string }[];
  common_materials?: string[];
  unit_preference?: "imperial" | "metric" | "auto";
  detail_level?: "minimal" | "standard" | "detailed";
  shop_rate_per_hour?: number;
  shift_hours?: number;
  certifications?: string[];
}

export interface OnboardingState {
  interaction_count: number;
  disclosure_level: DisclosureLevel;
  has_profile: boolean;
  first_query_answered: boolean;
  materials_seen: string[];
  machines_seen: string[];
  operations_seen: string[];
}

export interface WelcomeMessage {
  greeting: string;
  suggestions: string[];
  capabilities_hint: string;
}

export interface DisclosureSuggestion {
  level: DisclosureLevel;
  message: string;
  /** Should this be shown as a follow-up after the main answer? */
  is_followup: boolean;
}

// ─── State Management ───────────────────────────────────────────────────────

// In-memory state (per session; persisted via MemoryGraphEngine in production)
const sessions = new Map<string, OnboardingState>();

function getState(sessionId: string): OnboardingState {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      interaction_count: 0,
      disclosure_level: 0,
      has_profile: false,
      first_query_answered: false,
      materials_seen: [],
      machines_seen: [],
      operations_seen: [],
    });
  }
  return sessions.get(sessionId)!;
}

/** Compute disclosure level from interaction count */
function computeLevel(count: number): DisclosureLevel {
  if (count >= 20) return 4;
  if (count >= 10) return 3;
  if (count >= 5) return 2;
  if (count >= 2) return 1;
  return 0;
}

// ─── Welcome Messages ───────────────────────────────────────────────────────

const EXAMPLE_QUERIES = [
  "Parameters for milling 4140 with a 1/2 inch endmill",
  "Best strategy for a deep pocket in Inconel",
  "How should I thread M12x1.75 in 316 stainless?",
  "What speed for roughing 7075 with a 3/4 carbide endmill?",
  "Compare trochoidal vs adaptive clearing for titanium",
];

const CAPABILITIES = {
  materials: "3,500+",
  machines: "800+",
  alarms: "9,200",
  controllers: "12",
};

/** Generate welcome message for new user */
export function generateWelcome(profile?: UserProfile): WelcomeMessage {
  const name = profile?.name ? `, ${profile.name}` : "";
  const greeting = `Hey${name}! I'm PRISM - I help with CNC machining. Give me a material and an operation, and I'll give you cutting parameters, strategy recommendations, and tooling suggestions.`;

  // Pick 3 example queries
  const suggestions = EXAMPLE_QUERIES.slice(0, 3);

  const capabilities_hint = `I know ${CAPABILITIES.materials} materials, ${CAPABILITIES.machines} machines, and ${CAPABILITIES.alarms} alarm codes across ${CAPABILITIES.controllers} controller families. What are you working on?`;

  return { greeting, suggestions, capabilities_hint };
}

// ─── Disclosure Suggestions ─────────────────────────────────────────────────

const LEVEL_SUGGESTIONS: Record<DisclosureLevel, string[]> = {
  0: [], // No suggestions at level 0 — just answer
  1: [
    "By the way - if you tell me which machine you're on, I can check power limits and chatter stability.",
    "I can also compare toolpath strategies and estimate cycle time. Want me to go deeper?",
    "If you're doing multiple operations, I can plan the whole job and generate a setup sheet.",
  ],
  2: [
    "Based on the materials you've been asking about, I could create an optimized parameter set for your most common combinations.",
    "I can run what-if analysis to find the sweet spot between tool life and productivity.",
    "Want me to check if your current parameters are optimal? I can compare against calibrated models.",
  ],
  3: [
    "If I knew your machine and tool inventory, I could give faster, more accurate recommendations. Want to set up your shop profile?",
    "I can schedule jobs across your machines to maximize utilization. Just need to know your fleet.",
    "For repeat jobs, I can remember your proven parameters and suggest them automatically.",
  ],
  4: [
    "If you tell me how these parameters actually performed - tool life, surface finish, any issues - I can learn from your experience.",
    "I can track your tool life data and predict when to change tools before they fail.",
    "Want me to record this job outcome? Over time, my recommendations get better with your data.",
  ],
};

/**
 * Get a disclosure suggestion appropriate for the current level.
 * Returns null if no suggestion is needed (e.g., level 0 or already shown).
 */
export function getDisclosureSuggestion(sessionId: string): DisclosureSuggestion | null {
  const state = getState(sessionId);
  if (state.disclosure_level === 0) return null;

  const suggestions = LEVEL_SUGGESTIONS[state.disclosure_level];
  if (!suggestions || suggestions.length === 0) return null;

  // Rotate through suggestions based on interaction count
  const idx = (state.interaction_count - 1) % suggestions.length;
  return {
    level: state.disclosure_level,
    message: suggestions[idx],
    is_followup: true,
  };
}

// ─── Interaction Tracking ───────────────────────────────────────────────────

/**
 * Record a user interaction and update disclosure level.
 * Call this after answering each manufacturing query.
 */
export function recordInteraction(
  sessionId: string,
  context?: { material?: string; machine?: string; operation?: string },
): OnboardingState {
  const state = getState(sessionId);
  state.interaction_count++;
  state.disclosure_level = computeLevel(state.interaction_count);
  if (!state.first_query_answered && state.interaction_count >= 1) {
    state.first_query_answered = true;
  }

  // Track seen entities
  if (context?.material && !state.materials_seen.includes(context.material)) {
    state.materials_seen.push(context.material);
  }
  if (context?.machine && !state.machines_seen.includes(context.machine)) {
    state.machines_seen.push(context.machine);
  }
  if (context?.operation && !state.operations_seen.includes(context.operation)) {
    state.operations_seen.push(context.operation);
  }

  return { ...state };
}

/** Get current onboarding state */
export function getOnboardingState(sessionId: string): OnboardingState {
  return { ...getState(sessionId) };
}

/** Reset session state (for testing) */
export function resetSession(sessionId: string): void {
  sessions.delete(sessionId);
}

// ─── Profile Helpers ────────────────────────────────────────────────────────

/** Get commonly seen materials for profile suggestion */
export function getCommonMaterials(sessionId: string): string[] {
  return getState(sessionId).materials_seen;
}

// ─── Dispatcher Entry Point ─────────────────────────────────────────────────

/**
 * Dispatcher entry for intelligenceDispatcher routing.
 * Supports: onboarding_welcome, onboarding_state, onboarding_record, onboarding_suggestion
 */
export function onboardingEngine(action: string, params: Record<string, any>): any {
  switch (action) {
    case "onboarding_welcome": {
      const welcome = generateWelcome(params.profile);
      return {
        ...welcome,
        full_message: `${welcome.greeting}\n\nTry something like:\n${welcome.suggestions.map(s => `  '${s}'`).join("\n")}\n\n${welcome.capabilities_hint}`,
      };
    }

    case "onboarding_state": {
      const sessionId = params.session_id ?? "default";
      return getOnboardingState(sessionId);
    }

    case "onboarding_record": {
      const sessionId = params.session_id ?? "default";
      const state = recordInteraction(sessionId, {
        material: params.material,
        machine: params.machine,
        operation: params.operation,
      });
      const suggestion = getDisclosureSuggestion(sessionId);
      return {
        ...state,
        suggestion: suggestion?.message ?? null,
        suggestion_level: suggestion?.level ?? null,
      };
    }

    case "onboarding_suggestion": {
      const sessionId = params.session_id ?? "default";
      const suggestion = getDisclosureSuggestion(sessionId);
      return suggestion ?? { level: 0, message: null, is_followup: false };
    }

    case "onboarding_reset": {
      const sessionId = params.session_id ?? "default";
      resetSession(sessionId);
      return { reset: true, session_id: sessionId };
    }

    default:
      throw new Error(`OnboardingEngine: unknown action "${action}"`);
  }
}
