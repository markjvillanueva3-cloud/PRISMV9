/**
 * FirstContactEmailTemplateFormula — sales-outreach email composition
 * (hotel iter21, 2026-05-24, U-FIRST-CONTACT-EMAIL).
 *
 * Composes a professional first-contact email from a prospect profile +
 * JM Die capability declarations + PRISM differentiators. Pure function —
 * no I/O, no email-send (caller decides delivery).
 *
 * Three surfaces:
 *
 *   1. generateFirstContactEmail(profile) → ComposedEmail
 *      Returns subject + body + signature with work-type-targeted hooks.
 *
 *   2. salesApproachGuide(prospect) → ApproachGuide
 *      Returns structured advice: SPIN-selling questions tailored to the
 *      prospect's work-type, BANT qualifying questions, recommended follow-up
 *      cadence, recommended first-quote-trigger.
 *
 *   3. firstQuotePrompts(prospect) → QuotePromptList
 *      Returns the 5-7 questions to extract from a prospect to generate a
 *      meaningful first quote (drawing required? quantity? material?
 *      tolerance class? lead-time pressure?).
 *
 * Hotel-soul: pure / deterministic / no clock dep in body (caller stamps).
 * R12 fail-loud on bad inputs.
 *
 * Reference: Rackham "SPIN Selling" 1988; Dixon/Adamson "Challenger Sale"
 * 2011; Cialdini "Influence" 2006 (reciprocity + authority principles).
 */

import type { ProspectiveCustomer, WorkType } from "../engines/ProspectiveCustomerEngine.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ComposedEmail {
  subject: string;
  body: string;
  signature: string;
  prospect_id: string;
  recipient_email: string;
  work_type_hooks: string[];      // which capability hooks were used
  prism_differentiators_cited: string[];
  fetched_at: string;
}

export interface ApproachGuide {
  prospect_id: string;
  spin_questions: { situation: string[]; problem: string[]; implication: string[]; need_payoff: string[] };
  bant_qualifiers: { budget: string; authority: string; need: string; timeline: string };
  follow_up_cadence_days: number[];
  first_quote_trigger: string;
  cialdini_hooks: string[];        // reciprocity / authority / scarcity / social-proof hints
  fetched_at: string;
}

export interface QuotePromptList {
  prospect_id: string;
  required_questions: string[];    // must answer to quote
  optional_questions: string[];    // nice-to-have for accurate quote
  warning_if_skipped: string[];   // gaps that make quote risky
  fetched_at: string;
}

// ─── Constants — JM Die capability declarations + PRISM differentiators ────

const JM_DIE_CAPABILITIES_BY_WORK_TYPE: Record<WorkType, string> = {
  cnc_milling:           "21 CNC machines including 3, 4 and 5-axis mills (Haas VF series + Fanuc + Doosan); typical tolerances ±0.0005\", surface finish to Ra 8 µin",
  cnc_turning:           "Okuma MA600 + Doosan + multi-spindle lathes for IDs/ODs/threads/grooves; bar-feed automation for production runs; live-tooling for prismatic features",
  wire_edm:              "Sodick + Mitsubishi wire EDM cells; sub-thou positional accuracy on hardened tool steel; PCD/carbide capability; multi-pass surface finish to Ra 0.4 µm",
  progressive_die:       "100+ customer history building progressive dies for high-volume stamping; ITW/Alcoa/Optimas/SFS/Holo-Krome reference base; in-house die-tryout press",
  stamping_die_repair:   "Same-day evaluation + 5-day typical turnaround on press-down emergency die repairs; full re-grind + insert replacement capability",
  fixture_design:        "In-house CAD + CAM + machining for custom workholding + CMM inspection fixtures; quick-turn aluminum + tooling-plate prototypes",
  prototype_machining:   "1-50 piece R&D runs with full first-article inspection; ITAR-aware document handling for aerospace/defense prototype work",
  production_run:        "Lights-out 2nd/3rd shift capability with statistical process control + automated bar-feeders + part-counters; can quote weekly recurring release schedules",
};

const PRISM_DIFFERENTIATORS_BY_WORK_TYPE: Record<WorkType, string[]> = {
  cnc_milling: [
    "Physics-based speed/feed optimization (Kienzle force model + Taylor tool-life) gives competitive 20-40% cycle-time reductions vs handbook values",
    "AI-driven cutting-strategy selection across 18 CAM systems (Mastercam, hyperMILL, NX, etc.) for best-of-breed toolpaths",
  ],
  cnc_turning: [
    "Chatter-stability prediction (regenerative chatter lobe diagrams) eliminates trial-and-error on hard-turning + thin-wall jobs",
    "Tool-life economic optimization tells us WHEN to change inserts to minimize total cost-per-part (not when they look dull)",
  ],
  wire_edm: [
    "EDM process AI tuned on shop-validated programs across 24,000+ JM Die jobs; cut-time + skim-pass tradeoffs computed per geometry, not guessed",
    "Same-day program generation from blueprint → 4-pass wire EDM with finish-Ra prediction",
  ],
  progressive_die: [
    "Die-cost waterfall analysis: per-station cost roll-up + ROI vs lifetime parts-per-hit, so quote includes total-cost-of-ownership not just tool price",
    "Built-in spring-back compensation for tight-tolerance stamping",
  ],
  stamping_die_repair: [
    "Failure-pattern recognition library — your die's wear pattern usually matches a prior repair, so we quote off historical actuals not estimates",
  ],
  fixture_design: [
    "Computational fixture-stiffness analysis (FEM-light) avoids the chatter-on-thin-wall failure mode that scraps the part",
  ],
  prototype_machining: [
    "Full PRISM digital twin: every prototype part has a parameterized toolpath + cost model that scales to production without re-design",
  ],
  production_run: [
    "SPC + machine-utilization dashboard with real-time scrap/yield tracking; we publish weekly KPIs to your team automatically",
    "Predictive maintenance — we forecast tool changes by part count, so you never get a quality surprise mid-run",
  ],
};

// Tailored SPIN questions by work-type
const SPIN_QUESTIONS_BY_WORK_TYPE: Record<WorkType, ApproachGuide["spin_questions"]> = {
  cnc_milling: {
    situation: ["What CNC mills are you currently running internally?", "What's your typical milling lot size?"],
    problem: ["Where are your tolerances tightest — and what's your scrap rate at that tolerance?", "How long does first-article approval typically take on a new mill program?"],
    implication: ["If a mill spindle is down for 2 days, what's the downstream impact on your delivery commitments?", "How much engineering time gets pulled into chasing dimensional issues per quarter?"],
    need_payoff: ["If you had cycle-time-optimized programs delivered with the parts, would that change your quote-to-PO cycle?"],
  },
  cnc_turning: {
    situation: ["What's your current lathe capacity — bar-fed or chuck?", "What's your hardest material on the lathe right now?"],
    problem: ["What's your tool-cost per part on your top-running lathe job?", "How often do you re-tune speed/feed when the material lot changes?"],
    implication: ["Each chatter incident — what's the cost in tooling + scrapped parts?", "If lead time on a recurring lathe job dropped 20%, what would that do for your year?"],
    need_payoff: ["Would real-time cost-per-part visibility per job change how you price the next quote?"],
  },
  wire_edm: {
    situation: ["What wire EDM machines do you have on-site?", "What's your typical material — D2, A2, M2, carbide?"],
    problem: ["What's your skim-pass strategy when you need Ra 8 µin?", "How do you handle taper work on multi-axis wire?"],
    implication: ["When wire breaks mid-finish-pass, what's the recovery cost?", "Have you ever had a customer reject a wire-EDM'd die for taper or finish?"],
    need_payoff: ["If we delivered wire EDM programs with predicted cut-time + finish-Ra guarantees, would you outsource peak-capacity work to us?"],
  },
  progressive_die: {
    situation: ["What stamping presses do you feed?", "What's your typical strip width + thickness?"],
    problem: ["What's your current die-tryout-to-production cycle?", "What's your typical die-life expectation, and how often do you miss it?"],
    implication: ["When a die goes down mid-production run, what's the line-down cost per hour?", "How often do tolerance creep + carry-over force re-builds vs new dies?"],
    need_payoff: ["If we delivered die designs with computed force/stress + cost-per-hit roll-up, would that change your sourcing decision?"],
  },
  stamping_die_repair: {
    situation: ["Where do you currently send dies for emergency repair?", "What's your average repair turnaround vs your target?"],
    problem: ["How many production hours per quarter do you lose to die-repair lead time?", "What's the cost when a stamping cell is idle waiting on tooling?"],
    implication: ["If repair turnaround went from 10 days to 5 days, what does that cost recover?", "Have you tracked emergency-repair frequency vs press-tonnage / die age?"],
    need_payoff: ["Would a 5-day repair guarantee + remote die-health monitoring change which vendor gets your next press-down call?"],
  },
  fixture_design: {
    situation: ["Who currently designs your inspection + workholding fixtures?", "How many new fixtures per quarter?"],
    problem: ["What's your worst fixture-related quality escape this year?", "How long does new-fixture lead time hold up new programs?"],
    implication: ["What does each fixture-related FAI rejection cost?", "How often does fixture stiffness become a part-quality issue?"],
    need_payoff: ["If we delivered fixture designs with FEM-validated stiffness + interference-checked CAD, would that compress your launch timeline?"],
  },
  prototype_machining: {
    situation: ["What's your typical R&D part run size?", "How tightly are your prototype + production programs coupled today?"],
    problem: ["How often do prototype changes break the production toolpath?", "What's the cost of a prototype iteration?"],
    implication: ["If prototype-to-production handoff was zero-rework, what does that compress in the launch cycle?"],
    need_payoff: ["Would a parameterized digital-twin program library that survives the prototype-to-production jump change your sourcing?"],
  },
  production_run: {
    situation: ["What's your highest-volume recurring part right now?", "What's your annual machining spend across all your suppliers?"],
    problem: ["What's your scrap rate on the high-volume parts?", "How predictable is your weekly capacity from your current supplier?"],
    implication: ["When scrap rate climbs 0.5%, what's the annual hit?", "When a supplier misses a weekly release, what's the customer-impact cost?"],
    need_payoff: ["If we gave you SPC dashboards + predictive maintenance + weekly KPI reports, would you consolidate volume with us?"],
  },
};

const DEFAULT_FOLLOW_UP_DAYS: ReadonlyArray<number> = [3, 8, 18];  // industry-empirical
const SIGNATURE_TEMPLATE = "Mark Villanueva\nJM Die Company\n2225 N Mannheim Rd, Melrose Park, IL 60160\nmvillanueva@jmdie.com · jmdie.com";

// ─── Helpers ────────────────────────────────────────────────────────────────

function assertProspect(p: unknown): ProspectiveCustomer {
  if (p === null || typeof p !== "object") throw new Error("prospect: must be an object");
  const o = p as Record<string, unknown>;
  if (typeof o.id !== "string" || o.id.length === 0) throw new Error("prospect.id: required string");
  if (typeof o.company_name !== "string") throw new Error("prospect.company_name: required string");
  if (!Array.isArray(o.work_types_relevant) || o.work_types_relevant.length === 0) {
    throw new Error("prospect.work_types_relevant: required non-empty array");
  }
  if (o.contact === null || typeof o.contact !== "object") throw new Error("prospect.contact: required object");
  return p as ProspectiveCustomer;
}

// ─── Surface 1: Email body composer ────────────────────────────────────────

export function generateFirstContactEmail(prospect: ProspectiveCustomer): ComposedEmail {
  assertProspect(prospect);
  const workTypes = prospect.work_types_relevant;

  // Subject line — outcome-focused (not "Introduction from..." which is generic AI-slop)
  const primaryWorkType = workTypes[0];
  const subjectByWorkType: Record<WorkType, string> = {
    cnc_milling: `${prospect.company_name} — 20-40% cycle reduction on mill jobs via physics-optimized programs`,
    cnc_turning: `${prospect.company_name} — chatter-free hard-turning + tool-cost-per-part visibility`,
    wire_edm: `${prospect.company_name} — wire EDM with predicted cut-time + finish-Ra guarantees`,
    progressive_die: `${prospect.company_name} — progressive dies with cost-per-hit roll-up + force/stress validation`,
    stamping_die_repair: `${prospect.company_name} — 5-day press-down die-repair guarantee`,
    fixture_design: `${prospect.company_name} — FEM-validated fixture designs that don't chatter`,
    prototype_machining: `${prospect.company_name} — prototype programs that scale to production with zero rework`,
    production_run: `${prospect.company_name} — SPC + predictive maintenance for your highest-volume parts`,
  };
  const subject = subjectByWorkType[primaryWorkType];

  const capabilityLines = workTypes.map(wt => `• ${JM_DIE_CAPABILITIES_BY_WORK_TYPE[wt]}`).join("\n");
  const allDiffs = new Set<string>();
  for (const wt of workTypes) {
    for (const d of PRISM_DIFFERENTIATORS_BY_WORK_TYPE[wt]) allDiffs.add(d);
  }
  const diffLines = [...allDiffs].map(d => `• ${d}`).join("\n");

  const body =
`${prospect.contact.primary_contact_name},

I'm reaching out because ${prospect.why_relevant.trim().replace(/[.;]$/, "")}.

JM Die Company has been building precision tooling and CNC-machined parts in Melrose Park, IL since the 1970s for customers like ITW, Alcoa, Optimas, SFS, and Holo-Krome. Specifically for ${prospect.company_name}'s ${workTypes.join(" + ")} needs:

${capabilityLines}

What makes our quote different from the next shop on your list — we run our jobs through PRISM, our in-house manufacturing-intelligence platform:

${diffLines}

The practical effect: when you ask us for a quote, you get a number backed by physics + 24K+ shop-validated jobs of historical data, not a number plus a wide margin to cover unknowns.

I'd appreciate 15 minutes to learn what ${prospect.company_name} is sourcing today and where your current vendors are leaving you exposed. If a single program or repair is press-down today, we can quote within 24 hours.

Best to reach me at this email, or direct at (708) 343-0900.

Regards,`;

  return {
    subject,
    body,
    signature: SIGNATURE_TEMPLATE,
    prospect_id: prospect.id,
    recipient_email: prospect.contact.email,
    work_type_hooks: workTypes.map(wt => JM_DIE_CAPABILITIES_BY_WORK_TYPE[wt]),
    prism_differentiators_cited: [...allDiffs],
    fetched_at: new Date().toISOString(),
  };
}

// ─── Surface 2: Sales-approach guide (SPIN + BANT + Cialdini) ──────────────

export function salesApproachGuide(prospect: ProspectiveCustomer): ApproachGuide {
  assertProspect(prospect);
  const primary = prospect.work_types_relevant[0];
  const spin = SPIN_QUESTIONS_BY_WORK_TYPE[primary];

  const bant: ApproachGuide["bant_qualifiers"] = {
    budget: `Confirm annual machining spend ($${(prospect.estimated_annual_machining_spend_usd ?? 0).toLocaleString()} estimated for ${prospect.company_name}) and whether they have an active purchasing budget cycle or are out-of-cycle.`,
    authority: `Verify ${prospect.contact.primary_contact_name} (${prospect.contact.title}) can authorize a first-quote PO directly, OR identify the buyer/sourcing manager above them.`,
    need: `Confirm specific work-type pull — they need ${prospect.work_types_relevant.join(" + ")} per our research; verify the timing and urgency.`,
    timeline: `Identify whether this is press-down/emergency (1-week close), active sourcing (1-month close), or strategic-vendor-development (3-6 month close).`,
  };

  const cialdiniHooks: string[] = [
    "Reciprocity: lead with a free deliverable — offer to run a cycle-time analysis on a sample part of theirs at no cost; the reciprocity drives a return-quote ask.",
    "Authority: cite specific JM Die customers in their industry (ITW for automotive fasteners, Alcoa for aerospace; reference whichever is closest to their domain).",
    "Social proof: mention that prior 100+ customers stayed >10 years (industry retention is 3-5 years).",
    "Scarcity (use sparingly + only if true): if their press is down today and we have a wire EDM cell with capacity this week, surface that explicitly.",
  ];

  return {
    prospect_id: prospect.id,
    spin_questions: spin,
    bant_qualifiers: bant,
    follow_up_cadence_days: [...DEFAULT_FOLLOW_UP_DAYS],
    first_quote_trigger:
      "Trigger formal quote IMMEDIATELY when prospect provides: (a) part drawing or 3D model, (b) annual EAU or one-time qty, (c) target lead-time. Don't gate on missing material spec — quote in our recommended material with a footnote allowing substitution.",
    cialdini_hooks: cialdiniHooks,
    fetched_at: new Date().toISOString(),
  };
}

// ─── Surface 3: First-quote prompts (data extraction list) ─────────────────

export function firstQuotePrompts(prospect: ProspectiveCustomer): QuotePromptList {
  assertProspect(prospect);
  return {
    prospect_id: prospect.id,
    required_questions: [
      "Drawing or 3D CAD model (PDF/DXF/STEP/PRT) — without geometry we can only quote a range.",
      "Quantity: one-off prototype, EAU (annual), or specific release size?",
      "Required lead-time: drop-dead date or flexible?",
      "Material spec (or accept our recommendation + footnote substitution).",
      "Tolerance class (general per ISO 2768 medium, or per-feature tight tolerances called out on print).",
    ],
    optional_questions: [
      "Surface finish requirement (Ra value or visual standard).",
      "Heat treatment / coating / plating requirements.",
      "Inspection level: standard ISIR vs full FAI vs CMM-per-piece.",
      "Packaging / kitting / labeling requirements.",
      "Target price (if they have a buy-it-now number, save quote-iteration cycles).",
      "Existing supplier baseline (price + lead-time we need to beat).",
    ],
    warning_if_skipped: [
      "No drawing → quote will be a wide range; cannot commit pricing.",
      "No quantity → cannot leverage setup amortization; quote will be conservative.",
      "No material → we'll quote in our recommended material; substitution may invalidate quote.",
      "No tolerance → we'll quote to ISO 2768-m; tighter tolerances will require re-quote.",
    ],
    fetched_at: new Date().toISOString(),
  };
}
