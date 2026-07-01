/**
 * EmployeeMachineDomainAcademyEngine — machine-domain-specialized PRISM
 * Academy training paths per shop role.
 *
 * Bridges the generic role-academy (EmployeeRoleAcademyInjectionEngine) with
 * the machine-specific reality of a job shop: a "machinist" on a lathe needs
 * different courses than a "machinist" on a 5-axis mill. This engine adds the
 * (role × machine_domain) × tier dimension on top of the generic role tracks.
 *
 * Eight machine domains (matched to `JULIETT-12CHAT-ALLOCATION-MS0` slot
 * partition + PRISM dispatcher coverage):
 *   - mill          → 3/4/5-axis machining centers (Haas VF, Hurco, DMG Mori)
 *   - lathe         → 2-axis CNC lathes (Okuma LB/Multus base, Daewoo Puma)
 *   - swiss_lathe   → Citizen / Star / Tornos sliding-headstock (live tooling)
 *   - mill_turn     → mill-turn combos (Okuma Multus, Mazak Integrex)
 *   - wedm          → wire EDM (Sodick, Makino, Mitsubishi, Agie)
 *   - sinker_edm    → ram/sinker EDM (Sodick, Makino, OPS-Ingersoll)
 *   - grinder       → surface, cylindrical, ID/OD, centerless
 *   - inspection    → CMM, optical comparator, surface-finish profilometer
 *
 * Each (domain, role, tier) produces a *specialist curriculum* layered on top
 * of the generic role-academy required stack — no duplication. Passing a
 * domain-specific course automatically calls
 * `EmployeeShiftSwapEngine.registerCoursePassed` AND
 * `EmployeeTaskHandoffEngine.registerCoursePassed` so qualification gates in
 * the shift-swap + task-handoff workflows unlock the moment academy progress
 * is recorded — single-source-of-truth for "is this employee qualified to
 * operate machine X?".
 *
 * Lean / Six Sigma / Kaizen integration:
 *   - Domain-tier promotion records a kaizen-event-eligible signal (the
 *     employee has demonstrated capability — Cpk on the qualification part
 *     stays the gate, not seat-time).
 *   - "Respect for people" — every employee gets a recommended growth track,
 *     not just required courses.
 *
 * Hotel-soul invariants: PII-free, Object.frozen returns, R12 fail-loud,
 * idempotent registration.
 *
 * @module EmployeeMachineDomainAcademyEngine
 * @milestone HOTEL/U-MACHINE-DOMAIN-ACADEMY (2026-05-26, slot:hotel)
 */

import { employeeShiftSwapEngine } from "./EmployeeShiftSwapEngine.js";
import { employeeTaskHandoffEngine } from "./EmployeeTaskHandoffEngine.js";

export type MachineDomain =
  | "mill"
  | "lathe"
  | "swiss_lathe"
  | "mill_turn"
  | "wedm"
  | "sinker_edm"
  | "grinder"
  | "honing"           // Sunnen / Engis / Gehring — die-bore + ID finishing
  | "carbide_polishing" // diamond-paste tungsten-carbide die finishing (JM Die)
  | "inspection";

export type SpecialistTier =
  | "trainee" // observing only, no independent work
  | "operator" // independent run-the-job
  | "setup" // independent setup + run
  | "programmer" // posts new programs from scratch
  | "lead"; // sets up + trains others

export type CompletionStatus = "assigned" | "in_progress" | "passed" | "failed";

const ALLOWED_DOMAINS = new Set<MachineDomain>([
  "mill",
  "lathe",
  "swiss_lathe",
  "mill_turn",
  "wedm",
  "sinker_edm",
  "grinder",
  "honing",
  "carbide_polishing",
  "inspection",
]);

const ALLOWED_TIERS = new Set<SpecialistTier>([
  "trainee",
  "operator",
  "setup",
  "programmer",
  "lead",
]);

const TIER_ORDER: ReadonlyArray<SpecialistTier> = [
  "trainee",
  "operator",
  "setup",
  "programmer",
  "lead",
];

export interface DomainCurriculum {
  domain: MachineDomain;
  tier: SpecialistTier;
  required_courses: ReadonlyArray<string>;
  growth_courses: ReadonlyArray<string>;
  /** Min Cpk on a qualification part before tier promotion is unlocked. */
  qualification_cpk_floor: number;
  /** Reference for extracted-knowledge artifacts (per-domain training corpus). */
  extracted_knowledge_refs: ReadonlyArray<string>;
}

export interface DomainAssignment {
  id: string;
  employee_id: string;
  domain: MachineDomain;
  tier: SpecialistTier;
  course_id: string;
  assigned_at: string;
  completed_at?: string;
  status: CompletionStatus;
  /** Machine serials this course unlocks on completion (auto-passed downstream). */
  unlocks_machines: ReadonlyArray<string>;
}

export interface DomainPathReport {
  employee_id: string;
  domain: MachineDomain;
  current_tier: SpecialistTier | null;
  next_tier: SpecialistTier | null;
  required_to_assign: ReadonlyArray<string>;
  growth_suggestions: ReadonlyArray<string>;
  passed_courses: ReadonlyArray<string>;
  qualification_cpk_required: number;
  promotion_eligible: boolean;
  rationale: ReadonlyArray<string>;
}

export interface DomainTransition {
  at: string;
  employee_id: string;
  domain: MachineDomain;
  from_tier: SpecialistTier | null;
  to_tier: SpecialistTier;
  /** Cpk on the qualification part — gates the promotion. */
  observed_cpk: number;
  by_employee_id: string;
}

/**
 * Domain × tier curriculum table.
 *
 * Course IDs follow the convention `<domain>-<tier>-<seq>` so they don't
 * collide with the generic course-0..course-34 set in CurriculumEngine.
 * extracted_knowledge_refs point to corpus dirs under
 * `mcp-server/data/extracted-knowledge/` and `extracted_modules/`.
 */
const DOMAIN_CURRICULUM: Readonly<
  Record<MachineDomain, Readonly<Record<SpecialistTier, DomainCurriculum>>>
> = Object.freeze({
  mill: Object.freeze({
    trainee: Object.freeze({
      domain: "mill" as const,
      tier: "trainee" as const,
      required_courses: Object.freeze([
        "mill-trainee-01-safety",
        "mill-trainee-02-tooling-basics",
        "mill-trainee-03-coolant-basics",
      ]),
      growth_courses: Object.freeze(["mill-operator-01-fanuc-conversational"]),
      qualification_cpk_floor: 0, // trainee = observation only
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/mastercam/mill-basic",
      ]),
    }),
    operator: Object.freeze({
      domain: "mill" as const,
      tier: "operator" as const,
      required_courses: Object.freeze([
        "mill-operator-01-fanuc-conversational",
        "mill-operator-02-cycle-start-procedures",
        "mill-operator-03-tool-offset-update",
        "mill-operator-04-fixture-load-secure",
        "mill-operator-05-chip-load-control",
      ]),
      growth_courses: Object.freeze([
        "mill-setup-01-wcs-establish",
        "mill-setup-02-tool-life-mgmt",
      ]),
      qualification_cpk_floor: 1.0,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/mastercam/mill-2.5d",
        "mcp-server/data/extracted-knowledge/fusion360/mill-3axis",
      ]),
    }),
    setup: Object.freeze({
      domain: "mill" as const,
      tier: "setup" as const,
      required_courses: Object.freeze([
        "mill-setup-01-wcs-establish",
        "mill-setup-02-tool-life-mgmt",
        "mill-setup-03-probe-routines",
        "mill-setup-04-first-article-inspection",
      ]),
      growth_courses: Object.freeze([
        "mill-programmer-01-hypermill-3-axis",
        "mill-programmer-02-mastercam-dynamic",
      ]),
      qualification_cpk_floor: 1.33,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/hypermill/mill-setup",
        "extracted_modules/COMPLETE/probing",
      ]),
    }),
    programmer: Object.freeze({
      domain: "mill" as const,
      tier: "programmer" as const,
      required_courses: Object.freeze([
        "mill-programmer-01-hypermill-3-axis",
        "mill-programmer-02-mastercam-dynamic",
        "mill-programmer-03-fusion-cam",
        "mill-programmer-04-5-axis-trochoidal",
        "mill-programmer-05-post-validation",
      ]),
      growth_courses: Object.freeze(["mill-lead-01-mentor-shift-handoff"]),
      qualification_cpk_floor: 1.67,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/hypermill/mill-advanced",
        "mcp-server/data/extracted-knowledge/fusion360-cam/mill-5axis",
        "mcp-server/data/extracted-knowledge/mit-courses/manufacturing-processes",
      ]),
    }),
    lead: Object.freeze({
      domain: "mill" as const,
      tier: "lead" as const,
      required_courses: Object.freeze([
        "mill-lead-01-mentor-shift-handoff",
        "mill-lead-02-kaizen-event-champion",
      ]),
      growth_courses: Object.freeze([]),
      qualification_cpk_floor: 1.67,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/training/leadership",
      ]),
    }),
  }),
  lathe: Object.freeze({
    trainee: Object.freeze({
      domain: "lathe" as const,
      tier: "trainee" as const,
      required_courses: Object.freeze([
        "lathe-trainee-01-safety",
        "lathe-trainee-02-chuck-jaw-basics",
        "lathe-trainee-03-tailstock-basics",
      ]),
      growth_courses: Object.freeze(["lathe-operator-01-okuma-osp-basics"]),
      qualification_cpk_floor: 0,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/training/lathe-basics",
      ]),
    }),
    operator: Object.freeze({
      domain: "lathe" as const,
      tier: "operator" as const,
      required_courses: Object.freeze([
        "lathe-operator-01-okuma-osp-basics",
        "lathe-operator-02-chuck-pressure",
        "lathe-operator-03-insert-change",
        "lathe-operator-04-bar-pull",
        "lathe-operator-05-coolant-direction",
      ]),
      growth_courses: Object.freeze([
        "lathe-setup-01-soft-jaw-bore",
        "lathe-setup-02-tailstock-alignment",
      ]),
      qualification_cpk_floor: 1.0,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/machines/EXTRACTED/okuma-lb3000",
        "mcp-server/data/machines/EXTRACTED/daewoo-puma",
      ]),
    }),
    setup: Object.freeze({
      domain: "lathe" as const,
      tier: "setup" as const,
      required_courses: Object.freeze([
        "lathe-setup-01-soft-jaw-bore",
        "lathe-setup-02-tailstock-alignment",
        "lathe-setup-03-steady-rest",
        "lathe-setup-04-parting-strategy",
      ]),
      growth_courses: Object.freeze(["lathe-programmer-01-okuma-igo-cycles"]),
      qualification_cpk_floor: 1.33,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/training/lathe-setup",
      ]),
    }),
    programmer: Object.freeze({
      domain: "lathe" as const,
      tier: "programmer" as const,
      required_courses: Object.freeze([
        "lathe-programmer-01-okuma-igo-cycles",
        "lathe-programmer-02-g71-g72-roughing",
        "lathe-programmer-03-thread-cycles",
        "lathe-programmer-04-grooving-parting",
        "lathe-programmer-05-css-vs-g97",
      ]),
      growth_courses: Object.freeze(["lathe-lead-01-mentor"]),
      qualification_cpk_floor: 1.67,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/training/lathe-programming",
        "extracted_modules/COMPLETE/lathe-physics",
      ]),
    }),
    lead: Object.freeze({
      domain: "lathe" as const,
      tier: "lead" as const,
      required_courses: Object.freeze(["lathe-lead-01-mentor", "lathe-lead-02-kaizen-champion"]),
      growth_courses: Object.freeze([]),
      qualification_cpk_floor: 1.67,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/training/leadership",
      ]),
    }),
  }),
  swiss_lathe: Object.freeze({
    trainee: Object.freeze({
      domain: "swiss_lathe" as const,
      tier: "trainee" as const,
      required_courses: Object.freeze([
        "swiss-trainee-01-safety",
        "swiss-trainee-02-guide-bushing-basics",
      ]),
      growth_courses: Object.freeze(["swiss-operator-01-citizen-controls"]),
      qualification_cpk_floor: 0,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/training/swiss-basics",
      ]),
    }),
    operator: Object.freeze({
      domain: "swiss_lathe" as const,
      tier: "operator" as const,
      required_courses: Object.freeze([
        "swiss-operator-01-citizen-controls",
        "swiss-operator-02-bar-feeder-setup",
        "swiss-operator-03-live-tooling-basics",
        "swiss-operator-04-sub-spindle-handoff",
      ]),
      growth_courses: Object.freeze(["swiss-setup-01-guide-bushing-alignment"]),
      qualification_cpk_floor: 1.0,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/training/swiss-citizen",
        "mcp-server/data/extracted-knowledge/training/swiss-star",
      ]),
    }),
    setup: Object.freeze({
      domain: "swiss_lathe" as const,
      tier: "setup" as const,
      required_courses: Object.freeze([
        "swiss-setup-01-guide-bushing-alignment",
        "swiss-setup-02-z1-z2-synchronization",
        "swiss-setup-03-tombstone-load",
      ]),
      growth_courses: Object.freeze(["swiss-programmer-01-multi-spindle-sync"]),
      qualification_cpk_floor: 1.33,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/training/swiss-setup",
      ]),
    }),
    programmer: Object.freeze({
      domain: "swiss_lathe" as const,
      tier: "programmer" as const,
      required_courses: Object.freeze([
        "swiss-programmer-01-multi-spindle-sync",
        "swiss-programmer-02-partmaker",
        "swiss-programmer-03-citizen-d-codes",
      ]),
      growth_courses: Object.freeze(["swiss-lead-01-mentor"]),
      qualification_cpk_floor: 1.67,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/training/swiss-programming",
      ]),
    }),
    lead: Object.freeze({
      domain: "swiss_lathe" as const,
      tier: "lead" as const,
      required_courses: Object.freeze(["swiss-lead-01-mentor"]),
      growth_courses: Object.freeze([]),
      qualification_cpk_floor: 1.67,
      extracted_knowledge_refs: Object.freeze([]),
    }),
  }),
  mill_turn: Object.freeze({
    trainee: Object.freeze({
      domain: "mill_turn" as const,
      tier: "trainee" as const,
      required_courses: Object.freeze([
        "millturn-trainee-01-safety",
        "millturn-trainee-02-dual-axis-basics",
      ]),
      growth_courses: Object.freeze(["millturn-operator-01-mazak-integrex"]),
      qualification_cpk_floor: 0,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/training/millturn-basics",
      ]),
    }),
    operator: Object.freeze({
      domain: "mill_turn" as const,
      tier: "operator" as const,
      required_courses: Object.freeze([
        "millturn-operator-01-mazak-integrex",
        "millturn-operator-02-okuma-multus",
        "millturn-operator-03-c-axis-indexing",
      ]),
      growth_courses: Object.freeze(["millturn-setup-01-sub-spindle-transfer"]),
      qualification_cpk_floor: 1.0,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/machines/EXTRACTED/okuma-multus",
        "mcp-server/data/machines/EXTRACTED/mazak-integrex",
      ]),
    }),
    setup: Object.freeze({
      domain: "mill_turn" as const,
      tier: "setup" as const,
      required_courses: Object.freeze([
        "millturn-setup-01-sub-spindle-transfer",
        "millturn-setup-02-multi-channel-sync",
      ]),
      growth_courses: Object.freeze(["millturn-programmer-01-multichannel-programming"]),
      qualification_cpk_floor: 1.33,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/training/millturn-setup",
      ]),
    }),
    programmer: Object.freeze({
      domain: "mill_turn" as const,
      tier: "programmer" as const,
      required_courses: Object.freeze([
        "millturn-programmer-01-multichannel-programming",
        "millturn-programmer-02-collision-zones",
        "millturn-programmer-03-css-rpm-hybrid",
      ]),
      growth_courses: Object.freeze(["millturn-lead-01-mentor"]),
      qualification_cpk_floor: 1.67,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/training/millturn-programming",
      ]),
    }),
    lead: Object.freeze({
      domain: "mill_turn" as const,
      tier: "lead" as const,
      required_courses: Object.freeze(["millturn-lead-01-mentor"]),
      growth_courses: Object.freeze([]),
      qualification_cpk_floor: 1.67,
      extracted_knowledge_refs: Object.freeze([]),
    }),
  }),
  wedm: Object.freeze({
    trainee: Object.freeze({
      domain: "wedm" as const,
      tier: "trainee" as const,
      required_courses: Object.freeze([
        "wedm-trainee-01-electrical-safety",
        "wedm-trainee-02-dielectric-basics",
        "wedm-trainee-03-wire-types",
      ]),
      growth_courses: Object.freeze(["wedm-operator-01-sodick-controls"]),
      qualification_cpk_floor: 0,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/training/wedm-basics",
      ]),
    }),
    operator: Object.freeze({
      domain: "wedm" as const,
      tier: "operator" as const,
      required_courses: Object.freeze([
        "wedm-operator-01-sodick-controls",
        "wedm-operator-02-mitsubishi-controls",
        "wedm-operator-03-makino-controls",
        "wedm-operator-04-wire-threading",
        "wedm-operator-05-flush-pressure-control",
      ]),
      growth_courses: Object.freeze(["wedm-setup-01-start-hole-strategy"]),
      qualification_cpk_floor: 1.0,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/machines/EXTRACTED/sodick-wedm",
        "mcp-server/data/machines/EXTRACTED/makino-wedm",
        "mcp-server/data/machines/EXTRACTED/mitsubishi-wedm",
      ]),
    }),
    setup: Object.freeze({
      domain: "wedm" as const,
      tier: "setup" as const,
      required_courses: Object.freeze([
        "wedm-setup-01-start-hole-strategy",
        "wedm-setup-02-tab-strategy",
        "wedm-setup-03-multi-pass-planning",
      ]),
      growth_courses: Object.freeze(["wedm-programmer-01-tech-table-derivation"]),
      qualification_cpk_floor: 1.33,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/training/wedm-setup",
      ]),
    }),
    programmer: Object.freeze({
      domain: "wedm" as const,
      tier: "programmer" as const,
      required_courses: Object.freeze([
        "wedm-programmer-01-tech-table-derivation",
        "wedm-programmer-02-recast-prediction",
        "wedm-programmer-03-corner-strategy",
        "wedm-programmer-04-taper-geometry",
      ]),
      growth_courses: Object.freeze(["wedm-lead-01-mentor"]),
      qualification_cpk_floor: 1.67,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/training/wedm-programming",
      ]),
    }),
    lead: Object.freeze({
      domain: "wedm" as const,
      tier: "lead" as const,
      required_courses: Object.freeze(["wedm-lead-01-mentor", "wedm-lead-02-kaizen-champion"]),
      growth_courses: Object.freeze([]),
      qualification_cpk_floor: 1.67,
      extracted_knowledge_refs: Object.freeze([]),
    }),
  }),
  sinker_edm: Object.freeze({
    trainee: Object.freeze({
      domain: "sinker_edm" as const,
      tier: "trainee" as const,
      required_courses: Object.freeze([
        "sinker-trainee-01-electrical-safety",
        "sinker-trainee-02-electrode-basics",
      ]),
      growth_courses: Object.freeze(["sinker-operator-01-sodick-controls"]),
      qualification_cpk_floor: 0,
      extracted_knowledge_refs: Object.freeze([]),
    }),
    operator: Object.freeze({
      domain: "sinker_edm" as const,
      tier: "operator" as const,
      required_courses: Object.freeze([
        "sinker-operator-01-sodick-controls",
        "sinker-operator-02-makino-controls",
        "sinker-operator-03-electrode-load",
        "sinker-operator-04-flush-routine",
      ]),
      growth_courses: Object.freeze(["sinker-setup-01-electrode-design"]),
      qualification_cpk_floor: 1.0,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/machines/EXTRACTED/sodick-sinker",
      ]),
    }),
    setup: Object.freeze({
      domain: "sinker_edm" as const,
      tier: "setup" as const,
      required_courses: Object.freeze([
        "sinker-setup-01-electrode-design",
        "sinker-setup-02-orbit-strategy",
      ]),
      growth_courses: Object.freeze(["sinker-programmer-01-deep-pocket-strategy"]),
      qualification_cpk_floor: 1.33,
      extracted_knowledge_refs: Object.freeze([]),
    }),
    programmer: Object.freeze({
      domain: "sinker_edm" as const,
      tier: "programmer" as const,
      required_courses: Object.freeze([
        "sinker-programmer-01-deep-pocket-strategy",
        "sinker-programmer-02-electrode-pairing",
      ]),
      growth_courses: Object.freeze(["sinker-lead-01-mentor"]),
      qualification_cpk_floor: 1.67,
      extracted_knowledge_refs: Object.freeze([]),
    }),
    lead: Object.freeze({
      domain: "sinker_edm" as const,
      tier: "lead" as const,
      required_courses: Object.freeze(["sinker-lead-01-mentor"]),
      growth_courses: Object.freeze([]),
      qualification_cpk_floor: 1.67,
      extracted_knowledge_refs: Object.freeze([]),
    }),
  }),
  grinder: Object.freeze({
    trainee: Object.freeze({
      domain: "grinder" as const,
      tier: "trainee" as const,
      required_courses: Object.freeze([
        "grinder-trainee-01-wheel-safety",
        "grinder-trainee-02-wheel-mounting",
      ]),
      growth_courses: Object.freeze(["grinder-operator-01-surface-grinder"]),
      qualification_cpk_floor: 0,
      extracted_knowledge_refs: Object.freeze([]),
    }),
    operator: Object.freeze({
      domain: "grinder" as const,
      tier: "operator" as const,
      required_courses: Object.freeze([
        "grinder-operator-01-surface-grinder",
        "grinder-operator-02-cylindrical-grinder",
        "grinder-operator-03-id-od-grinder",
        "grinder-operator-04-wheel-dressing",
      ]),
      growth_courses: Object.freeze(["grinder-setup-01-wheel-selection"]),
      qualification_cpk_floor: 1.0,
      extracted_knowledge_refs: Object.freeze([]),
    }),
    setup: Object.freeze({
      domain: "grinder" as const,
      tier: "setup" as const,
      required_courses: Object.freeze([
        "grinder-setup-01-wheel-selection",
        "grinder-setup-02-coolant-flow",
        "grinder-setup-03-burn-prevention",
      ]),
      growth_courses: Object.freeze(["grinder-programmer-01-creep-feed-cycles"]),
      qualification_cpk_floor: 1.33,
      extracted_knowledge_refs: Object.freeze([]),
    }),
    programmer: Object.freeze({
      domain: "grinder" as const,
      tier: "programmer" as const,
      required_courses: Object.freeze([
        "grinder-programmer-01-creep-feed-cycles",
        "grinder-programmer-02-centerless-strategy",
      ]),
      growth_courses: Object.freeze(["grinder-lead-01-mentor"]),
      qualification_cpk_floor: 1.67,
      extracted_knowledge_refs: Object.freeze([]),
    }),
    lead: Object.freeze({
      domain: "grinder" as const,
      tier: "lead" as const,
      required_courses: Object.freeze(["grinder-lead-01-mentor"]),
      growth_courses: Object.freeze([]),
      qualification_cpk_floor: 1.67,
      extracted_knowledge_refs: Object.freeze([]),
    }),
  }),
  honing: Object.freeze({
    trainee: Object.freeze({
      domain: "honing" as const,
      tier: "trainee" as const,
      required_courses: Object.freeze([
        "honing-trainee-01-abrasive-safety",
        "honing-trainee-02-stone-types-aluminum-oxide-vs-cbn",
        "honing-trainee-03-coolant-routing",
      ]),
      growth_courses: Object.freeze(["honing-operator-01-sunnen-controls"]),
      qualification_cpk_floor: 0,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/training/honing-basics",
      ]),
    }),
    operator: Object.freeze({
      domain: "honing" as const,
      tier: "operator" as const,
      required_courses: Object.freeze([
        "honing-operator-01-sunnen-controls",
        "honing-operator-02-engis-controls",
        "honing-operator-03-mandrel-selection",
        "honing-operator-04-stroke-rate-dwell",
        "honing-operator-05-id-bore-finish-load",
      ]),
      growth_courses: Object.freeze(["honing-setup-01-stone-dressing"]),
      qualification_cpk_floor: 1.0,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/machines/EXTRACTED/sunnen-mbb",
        "mcp-server/data/machines/EXTRACTED/engis-cmh",
      ]),
    }),
    setup: Object.freeze({
      domain: "honing" as const,
      tier: "setup" as const,
      required_courses: Object.freeze([
        "honing-setup-01-stone-dressing",
        "honing-setup-02-torque-feed-setting",
        "honing-setup-03-in-process-id-measurement",
        "honing-setup-04-taper-correction-strategy",
      ]),
      growth_courses: Object.freeze(["honing-programmer-01-multistage-rough-finish"]),
      qualification_cpk_floor: 1.33,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/training/honing-setup",
      ]),
    }),
    programmer: Object.freeze({
      domain: "honing" as const,
      tier: "programmer" as const,
      required_courses: Object.freeze([
        "honing-programmer-01-multistage-rough-finish",
        "honing-programmer-02-feedback-controlled-cycle",
        "honing-programmer-03-cross-hatch-angle-control",
        "honing-programmer-04-die-bore-stack-tolerance",
      ]),
      growth_courses: Object.freeze(["honing-lead-01-mentor"]),
      qualification_cpk_floor: 1.67,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/training/honing-programming",
      ]),
    }),
    lead: Object.freeze({
      domain: "honing" as const,
      tier: "lead" as const,
      required_courses: Object.freeze(["honing-lead-01-mentor", "honing-lead-02-kaizen-champion"]),
      growth_courses: Object.freeze([]),
      qualification_cpk_floor: 1.67,
      extracted_knowledge_refs: Object.freeze([]),
    }),
  }),
  carbide_polishing: Object.freeze({
    trainee: Object.freeze({
      domain: "carbide_polishing" as const,
      tier: "trainee" as const,
      required_courses: Object.freeze([
        "carbide-polish-trainee-01-diamond-paste-ppe-safety",
        "carbide-polish-trainee-02-tungsten-carbide-dust-hazcom",
        "carbide-polish-trainee-03-grit-ladder-fundamentals-320-3000",
      ]),
      growth_courses: Object.freeze(["carbide-polish-operator-01-felt-bob-hand-technique"]),
      qualification_cpk_floor: 0,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/training/carbide-polishing-basics",
      ]),
    }),
    operator: Object.freeze({
      domain: "carbide_polishing" as const,
      tier: "operator" as const,
      required_courses: Object.freeze([
        "carbide-polish-operator-01-felt-bob-hand-technique",
        "carbide-polish-operator-02-wood-bob-vs-plastic-bob",
        "carbide-polish-operator-03-grit-progression-discipline",
        "carbide-polish-operator-04-paste-application-volume-control",
        "carbide-polish-operator-05-cross-grain-vs-with-grain",
        "carbide-polish-operator-06-ra-target-reading-profilometer",
      ]),
      growth_courses: Object.freeze(["carbide-polish-setup-01-bob-selection-by-die-geometry"]),
      qualification_cpk_floor: 1.0,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/training/carbide-polishing-hand",
      ]),
    }),
    setup: Object.freeze({
      domain: "carbide_polishing" as const,
      tier: "setup" as const,
      required_courses: Object.freeze([
        "carbide-polish-setup-01-bob-selection-by-die-geometry",
        "carbide-polish-setup-02-paste-viscosity-adjustment",
        "carbide-polish-setup-03-lapping-plate-flatness",
        "carbide-polish-setup-04-tungsten-vs-steel-abrasive-ladder",
      ]),
      growth_courses: Object.freeze(["carbide-polish-programmer-01-cnc-zeiss-polisher-cycle"]),
      qualification_cpk_floor: 1.33,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/training/carbide-polishing-setup",
      ]),
    }),
    programmer: Object.freeze({
      domain: "carbide_polishing" as const,
      tier: "programmer" as const,
      required_courses: Object.freeze([
        "carbide-polish-programmer-01-cnc-zeiss-polisher-cycle",
        "carbide-polish-programmer-02-surface-metrology-integration",
        "carbide-polish-programmer-03-recast-removal-wedm-followup",
        "carbide-polish-programmer-04-die-life-prediction-from-ra",
      ]),
      growth_courses: Object.freeze(["carbide-polish-lead-01-mentor"]),
      qualification_cpk_floor: 1.67,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/training/carbide-polishing-programming",
      ]),
    }),
    lead: Object.freeze({
      domain: "carbide_polishing" as const,
      tier: "lead" as const,
      required_courses: Object.freeze([
        "carbide-polish-lead-01-mentor",
        "carbide-polish-lead-02-jm-die-tungsten-finish-spec",
      ]),
      growth_courses: Object.freeze([]),
      qualification_cpk_floor: 1.67,
      extracted_knowledge_refs: Object.freeze([]),
    }),
  }),
  inspection: Object.freeze({
    trainee: Object.freeze({
      domain: "inspection" as const,
      tier: "trainee" as const,
      required_courses: Object.freeze([
        "inspection-trainee-01-blueprint-reading",
        "inspection-trainee-02-gd-and-t-basics",
      ]),
      growth_courses: Object.freeze(["inspection-operator-01-cmm-basics"]),
      qualification_cpk_floor: 0,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/training/inspection-basics",
      ]),
    }),
    operator: Object.freeze({
      domain: "inspection" as const,
      tier: "operator" as const,
      required_courses: Object.freeze([
        "inspection-operator-01-cmm-basics",
        "inspection-operator-02-optical-comparator",
        "inspection-operator-03-surface-finish-profilometer",
        "inspection-operator-04-fai-form-fill",
      ]),
      growth_courses: Object.freeze(["inspection-setup-01-pc-dmis"]),
      qualification_cpk_floor: 1.0,
      extracted_knowledge_refs: Object.freeze([
        "mcp-server/data/extracted-knowledge/training/cmm",
      ]),
    }),
    setup: Object.freeze({
      domain: "inspection" as const,
      tier: "setup" as const,
      required_courses: Object.freeze([
        "inspection-setup-01-pc-dmis",
        "inspection-setup-02-calypso",
        "inspection-setup-03-fixture-staging",
      ]),
      growth_courses: Object.freeze(["inspection-programmer-01-cmm-program-from-cad"]),
      qualification_cpk_floor: 1.33,
      extracted_knowledge_refs: Object.freeze([]),
    }),
    programmer: Object.freeze({
      domain: "inspection" as const,
      tier: "programmer" as const,
      required_courses: Object.freeze([
        "inspection-programmer-01-cmm-program-from-cad",
        "inspection-programmer-02-gd-and-t-stackup",
        "inspection-programmer-03-spc-statistical-control",
      ]),
      growth_courses: Object.freeze(["inspection-lead-01-mentor"]),
      qualification_cpk_floor: 1.67,
      extracted_knowledge_refs: Object.freeze([]),
    }),
    lead: Object.freeze({
      domain: "inspection" as const,
      tier: "lead" as const,
      required_courses: Object.freeze(["inspection-lead-01-mentor"]),
      growth_courses: Object.freeze([]),
      qualification_cpk_floor: 1.67,
      extracted_knowledge_refs: Object.freeze([]),
    }),
  }),
});

class EmployeeMachineDomainAcademyEngine {
  private assignments: Map<string, DomainAssignment> = new Map();
  /** employee_id → domain → current tier (highest passed). */
  private currentTier: Map<string, Map<MachineDomain, SpecialistTier>> = new Map();
  /** course_id → machines unlocked on pass (e.g. "lathe-operator-01-okuma-osp-basics" → ["OKUMA-LB3000-001", ...]). */
  private courseToMachines: Map<string, ReadonlyArray<string>> = new Map();
  private transitions: DomainTransition[] = [];
  private nextId = 1;

  /**
   * Map a course-completion to one or more machine_serials. When the employee
   * passes that course, the corresponding ShiftSwap + TaskHandoff engines are
   * notified so their qualification gates unlock.
   */
  mapCourseToMachines(args: {
    course_id: string;
    machine_serials: string[];
  }): void {
    if (!args.course_id) {
      throw new Error(
        "EmployeeMachineDomainAcademyEngine.mapCourseToMachines: course_id required",
      );
    }
    if (!Array.isArray(args.machine_serials)) {
      throw new Error(
        "EmployeeMachineDomainAcademyEngine.mapCourseToMachines: machine_serials must be an array",
      );
    }
    this.courseToMachines.set(
      args.course_id,
      Object.freeze([...args.machine_serials]),
    );
  }

  getDomainCurriculum(
    domain: MachineDomain,
    tier: SpecialistTier,
  ): DomainCurriculum {
    if (!ALLOWED_DOMAINS.has(domain)) {
      throw new Error(
        `EmployeeMachineDomainAcademyEngine.getDomainCurriculum: invalid domain '${domain}'`,
      );
    }
    if (!ALLOWED_TIERS.has(tier)) {
      throw new Error(
        `EmployeeMachineDomainAcademyEngine.getDomainCurriculum: invalid tier '${tier}'`,
      );
    }
    return Object.freeze({ ...DOMAIN_CURRICULUM[domain][tier] });
  }

  listDomains(): ReadonlyArray<MachineDomain> {
    return Object.freeze([...ALLOWED_DOMAINS]);
  }

  listTiers(): ReadonlyArray<SpecialistTier> {
    return Object.freeze([...TIER_ORDER]);
  }

  /**
   * Enroll an employee in a specific (domain, tier) curriculum. Assigns every
   * required course for that tier; idempotent (re-running doesn't duplicate).
   * Use `enrollFullPath` to enroll across all tiers up to a target.
   */
  enroll(args: {
    employee_id: string;
    domain: MachineDomain;
    tier: SpecialistTier;
  }): ReadonlyArray<DomainAssignment> {
    if (!args.employee_id) {
      throw new Error(
        "EmployeeMachineDomainAcademyEngine.enroll: employee_id required",
      );
    }
    const c = this.getDomainCurriculum(args.domain, args.tier);
    const out: DomainAssignment[] = [];
    for (const courseId of c.required_courses) {
      const existing = this.findAssignment(
        args.employee_id,
        args.domain,
        courseId,
      );
      if (existing) {
        out.push(existing);
        continue;
      }
      out.push(
        this.assign({
          employee_id: args.employee_id,
          domain: args.domain,
          tier: args.tier,
          course_id: courseId,
        }),
      );
    }
    return Object.freeze(out.map((a) => Object.freeze({ ...a })));
  }

  /**
   * Enroll all tiers from `trainee` up to and including `target_tier`.
   * The full specialist ladder for the domain.
   */
  enrollFullPath(args: {
    employee_id: string;
    domain: MachineDomain;
    target_tier: SpecialistTier;
  }): ReadonlyArray<DomainAssignment> {
    if (!ALLOWED_TIERS.has(args.target_tier)) {
      throw new Error(
        `EmployeeMachineDomainAcademyEngine.enrollFullPath: invalid target_tier '${args.target_tier}'`,
      );
    }
    const targetIdx = TIER_ORDER.indexOf(args.target_tier);
    const out: DomainAssignment[] = [];
    for (let i = 0; i <= targetIdx; i++) {
      const tier = TIER_ORDER[i]!;
      const tierOut = this.enroll({
        employee_id: args.employee_id,
        domain: args.domain,
        tier,
      });
      out.push(...tierOut);
    }
    return Object.freeze(out);
  }

  /**
   * Mark an assignment passed. On pass, propagate the qualification to
   * ShiftSwap + TaskHandoff engines for every machine_serial mapped to the
   * course — this is the single-source-of-truth unlock path.
   * Updates currentTier if the employee now has all required courses for the
   * assignment's tier.
   */
  markPassed(args: {
    assignment_id: string;
    by_employee_id: string;
    observed_cpk?: number;
  }): DomainAssignment {
    const a = this.requireAssignment(args.assignment_id);
    if (a.status === "passed") {
      // Idempotent — already passed
      return Object.freeze({ ...a });
    }
    if (a.status === "failed") {
      throw new Error(
        `EmployeeMachineDomainAcademyEngine.markPassed: assignment '${args.assignment_id}' was failed — open a new assignment for retake`,
      );
    }
    const now = new Date().toISOString();
    const unlocks =
      this.courseToMachines.get(a.course_id) ?? Object.freeze([]);
    const updated: DomainAssignment = Object.freeze({
      ...a,
      status: "passed" as const,
      completed_at: now,
      unlocks_machines: unlocks,
    });
    this.assignments.set(a.id, updated);

    // Propagate qualification to sibling engines (R8: read-before-write — these
    // engines already exist; we surface the unlock through their existing API).
    for (const machine_serial of unlocks) {
      employeeShiftSwapEngine.registerCoursePassed({
        employee_id: a.employee_id,
        course_id: a.course_id,
      });
      employeeTaskHandoffEngine.registerCoursePassed({
        employee_id: a.employee_id,
        course_id: a.course_id,
      });
      // machine_serial is the unlock target — accept untyped for cross-engine sync
      void machine_serial;
    }

    // Re-evaluate tier — promote if all required courses for this tier are passed
    this.refreshTier(a.employee_id, a.domain, args.by_employee_id, args.observed_cpk);

    return updated;
  }

  markFailed(args: { assignment_id: string }): DomainAssignment {
    const a = this.requireAssignment(args.assignment_id);
    if (a.status === "passed") {
      throw new Error(
        `EmployeeMachineDomainAcademyEngine.markFailed: assignment '${args.assignment_id}' already passed — open a new assignment to retake then fail`,
      );
    }
    const updated: DomainAssignment = Object.freeze({
      ...a,
      status: "failed" as const,
    });
    this.assignments.set(a.id, updated);
    return updated;
  }

  /**
   * Compute a domain-path report for an employee + domain. Returns current
   * tier, next tier, required-to-assign, growth suggestions, passed list, and
   * promotion-eligibility (all required courses for next tier passed).
   */
  reportPath(args: {
    employee_id: string;
    domain: MachineDomain;
  }): DomainPathReport {
    if (!args.employee_id) {
      throw new Error(
        "EmployeeMachineDomainAcademyEngine.reportPath: employee_id required",
      );
    }
    if (!ALLOWED_DOMAINS.has(args.domain)) {
      throw new Error(
        `EmployeeMachineDomainAcademyEngine.reportPath: invalid domain '${args.domain}'`,
      );
    }
    const current = this.currentTier.get(args.employee_id)?.get(args.domain) ?? null;
    const currentIdx = current ? TIER_ORDER.indexOf(current) : -1;
    const nextTier =
      currentIdx + 1 < TIER_ORDER.length ? TIER_ORDER[currentIdx + 1]! : null;

    const passed = new Set<string>();
    for (const a of this.assignments.values()) {
      if (
        a.employee_id === args.employee_id &&
        a.domain === args.domain &&
        a.status === "passed"
      ) {
        passed.add(a.course_id);
      }
    }

    let requiredToAssign: ReadonlyArray<string> = Object.freeze([]);
    let growthSuggestions: ReadonlyArray<string> = Object.freeze([]);
    let qualCpk = 0;
    let promotionEligible = false;
    const rationale: string[] = [];

    if (nextTier) {
      const c = this.getDomainCurriculum(args.domain, nextTier);
      const missing = c.required_courses.filter((cId) => !passed.has(cId));
      requiredToAssign = Object.freeze(missing);
      growthSuggestions = Object.freeze([...c.growth_courses]);
      qualCpk = c.qualification_cpk_floor;
      promotionEligible = missing.length === 0;
      rationale.push(
        `current_tier=${current ?? "none"}, next_tier=${nextTier}, ${missing.length} required course(s) outstanding`,
      );
      if (promotionEligible) {
        rationale.push(
          `eligible for promotion to ${nextTier} (Cpk ≥ ${qualCpk} on qualification part)`,
        );
      }
    } else {
      rationale.push(`current_tier=${current ?? "none"} (top tier reached for ${args.domain})`);
    }

    return Object.freeze({
      employee_id: args.employee_id,
      domain: args.domain,
      current_tier: current,
      next_tier: nextTier,
      required_to_assign: requiredToAssign,
      growth_suggestions: growthSuggestions,
      passed_courses: Object.freeze([...passed]),
      qualification_cpk_required: qualCpk,
      promotion_eligible: promotionEligible,
      rationale: Object.freeze(rationale),
    });
  }

  /** Promote an employee to next tier — requires observed_cpk ≥ floor. */
  promote(args: {
    employee_id: string;
    domain: MachineDomain;
    by_employee_id: string;
    observed_cpk: number;
  }): DomainTransition {
    // SoD check first — identity precedes capability
    if (args.by_employee_id === args.employee_id) {
      throw new Error(
        "EmployeeMachineDomainAcademyEngine.promote: employee cannot promote themselves (segregation of duties)",
      );
    }
    const report = this.reportPath({
      employee_id: args.employee_id,
      domain: args.domain,
    });
    if (!report.next_tier) {
      throw new Error(
        `EmployeeMachineDomainAcademyEngine.promote: ${args.employee_id} is already at top tier for ${args.domain}`,
      );
    }
    if (!report.promotion_eligible) {
      throw new Error(
        `EmployeeMachineDomainAcademyEngine.promote: ${args.employee_id} not eligible — ${report.required_to_assign.length} required course(s) still outstanding for ${report.next_tier}`,
      );
    }
    if (
      !Number.isFinite(args.observed_cpk) ||
      args.observed_cpk < report.qualification_cpk_required
    ) {
      throw new Error(
        `EmployeeMachineDomainAcademyEngine.promote: observed_cpk (${args.observed_cpk}) below qualification floor (${report.qualification_cpk_required}) for ${report.next_tier}`,
      );
    }
    let employeeMap = this.currentTier.get(args.employee_id);
    if (!employeeMap) {
      employeeMap = new Map();
      this.currentTier.set(args.employee_id, employeeMap);
    }
    employeeMap.set(args.domain, report.next_tier);
    const t: DomainTransition = Object.freeze({
      at: new Date().toISOString(),
      employee_id: args.employee_id,
      domain: args.domain,
      from_tier: report.current_tier,
      to_tier: report.next_tier,
      observed_cpk: args.observed_cpk,
      by_employee_id: args.by_employee_id,
    });
    this.transitions.push(t);
    return t;
  }

  listAssignments(args: {
    employee_id?: string;
    domain?: MachineDomain;
    status?: CompletionStatus;
  }): ReadonlyArray<DomainAssignment> {
    if (args.domain !== undefined && !ALLOWED_DOMAINS.has(args.domain)) {
      throw new Error(
        `EmployeeMachineDomainAcademyEngine.listAssignments: invalid domain '${args.domain}'`,
      );
    }
    const out: DomainAssignment[] = [];
    for (const a of this.assignments.values()) {
      if (args.employee_id && a.employee_id !== args.employee_id) continue;
      if (args.domain && a.domain !== args.domain) continue;
      if (args.status && a.status !== args.status) continue;
      out.push(Object.freeze({ ...a }));
    }
    return Object.freeze(out);
  }

  listTransitions(args: {
    employee_id?: string;
    domain?: MachineDomain;
  }): ReadonlyArray<DomainTransition> {
    const out: DomainTransition[] = [];
    for (const t of this.transitions) {
      if (args.employee_id && t.employee_id !== args.employee_id) continue;
      if (args.domain && t.domain !== args.domain) continue;
      out.push(Object.freeze({ ...t }));
    }
    return Object.freeze(out);
  }

  // ─── helpers ───────────────────────────────────────────────────────────

  private findAssignment(
    employee_id: string,
    domain: MachineDomain,
    course_id: string,
  ): DomainAssignment | null {
    for (const a of this.assignments.values()) {
      if (
        a.employee_id === employee_id &&
        a.domain === domain &&
        a.course_id === course_id
      ) {
        return Object.freeze({ ...a });
      }
    }
    return null;
  }

  private assign(args: {
    employee_id: string;
    domain: MachineDomain;
    tier: SpecialistTier;
    course_id: string;
  }): DomainAssignment {
    const id = `MDA-${String(this.nextId++).padStart(6, "0")}`;
    const unlocks =
      this.courseToMachines.get(args.course_id) ?? Object.freeze([]);
    const a: DomainAssignment = Object.freeze({
      id,
      employee_id: args.employee_id,
      domain: args.domain,
      tier: args.tier,
      course_id: args.course_id,
      assigned_at: new Date().toISOString(),
      status: "assigned" as const,
      unlocks_machines: unlocks,
    });
    this.assignments.set(id, a);
    return a;
  }

  private requireAssignment(id: string): DomainAssignment {
    const a = this.assignments.get(id);
    if (!a) {
      throw new Error(
        `EmployeeMachineDomainAcademyEngine: unknown assignment_id "${id}"`,
      );
    }
    return a;
  }

  /**
   * Auto-promote the employee to the highest tier for which all required
   * courses are passed. Records a transition each time the tier advances.
   */
  private refreshTier(
    employee_id: string,
    domain: MachineDomain,
    by_employee_id: string,
    observed_cpk: number | undefined,
  ): void {
    // Auto-promotion through tiers whose Cpk floor is 0 (trainee) — the
    // Cpk-gated tiers (operator+) require explicit promote() call.
    const passed = new Set<string>();
    for (const a of this.assignments.values()) {
      if (
        a.employee_id === employee_id &&
        a.domain === domain &&
        a.status === "passed"
      ) {
        passed.add(a.course_id);
      }
    }
    const current = this.currentTier.get(employee_id)?.get(domain) ?? null;
    const currentIdx = current ? TIER_ORDER.indexOf(current) : -1;
    const nextTier =
      currentIdx + 1 < TIER_ORDER.length ? TIER_ORDER[currentIdx + 1]! : null;
    if (!nextTier) return;
    const c = this.getDomainCurriculum(domain, nextTier);
    const allPassed = c.required_courses.every((cId) => passed.has(cId));
    if (!allPassed) return;
    if (c.qualification_cpk_floor > 0) {
      // Cpk-gated — require explicit promote() with observed_cpk
      if (
        observed_cpk === undefined ||
        observed_cpk < c.qualification_cpk_floor ||
        by_employee_id === employee_id
      ) {
        return;
      }
    }
    // Auto-promote (trainee tier, Cpk floor 0)
    let employeeMap = this.currentTier.get(employee_id);
    if (!employeeMap) {
      employeeMap = new Map();
      this.currentTier.set(employee_id, employeeMap);
    }
    employeeMap.set(domain, nextTier);
    this.transitions.push(
      Object.freeze({
        at: new Date().toISOString(),
        employee_id,
        domain,
        from_tier: current,
        to_tier: nextTier,
        observed_cpk: observed_cpk ?? 0,
        by_employee_id,
      }),
    );
  }

  reset(): void {
    this.assignments.clear();
    this.currentTier.clear();
    this.courseToMachines.clear();
    this.transitions.length = 0;
    this.nextId = 1;
    // Also clear sibling engines to keep test isolation hermetic
    employeeShiftSwapEngine.reset();
    employeeTaskHandoffEngine.reset();
  }
}

export const employeeMachineDomainAcademyEngine =
  new EmployeeMachineDomainAcademyEngine();
