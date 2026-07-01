/**
 * jm-die-osha-seeds.ts -- HOTEL-ERP-SEED/U-ERP-OSHA-SEED
 * ====================================================
 *
 * Canonical JM Die OSHA incident + PPE seed catalog. Mirrors the
 * `JM_DIE_EMPLOYEE_SEEDS` pattern (src/data/jm-die-employees.ts): in-code,
 * deterministic, stable-id, idempotent seeds that OSHAComplianceEngine loads
 * in its constructor so the OSHACompliancePage renders real shop-floor safety
 * data on launch instead of an empty store.
 *
 * INVARIANT (enforced by the engine's createIncident + the R9 seed test):
 *   recordable === (medical_treatment !== "first_aid" || days_away > 0 || days_restricted > 0)
 * Every seed below sets `recordable` to exactly that derivation -- the test fails
 * the moment a seed's flag drifts from the OSHA recordability rule.
 *
 * Data shape = a realistic die/mold CNC shop: mostly first-aid/near-miss
 * (a well-run shop), a minority recordable. Incidents reference the canonical
 * JM Die employee roster so the dispatcher's employee_name join resolves.
 * Locations map to the JM Die machine fleet (VMC-01..05, lathe/WEDM/grinder cells).
 */
import type { OSHAIncident, PPEAssignment } from "../engines/OSHAComplianceEngine.js";
import { oshaStandardForPPE } from "./osha-ppe-standards.js";

/**
 * 12 canonical incidents spanning 2025-2026. Recordable cases (5): the two
 * 2025 medical-treatment injuries with restricted/away days, the coolant-mist
 * illness, the WEDM burn, and the 2026 noise-exposure illness. The rest are
 * first-aid or near-miss (non-recordable). Each `recordable` is the literal
 * result of the engine's rule for that record (verified by the seed test).
 */
export const JM_DIE_OSHA_INCIDENT_SEEDS: readonly OSHAIncident[] = [
  {
    id: "OSHA-SEED-2025-001",
    incident_date: "2025-02-14",
    employee_id: "EMP-0001",
    employee_name: "Avery Stone",
    location: "VMC-03 deburr station",
    description: "Laceration to left index finger while deburring a hardened D2 die plate edge.",
    injury_type: "injury",
    body_part_affected: "left index finger",
    days_away: 0,
    days_restricted: 3,
    medical_treatment: "medical_beyond_first_aid",
    recordable: true,
    osha_case_number: "JMD-2025-001",
    reported_by: "EMP-0005",
    anonymous: false,
    witnesses: ["EMP-0003"],
    corrective_actions: ["Issued cut-resistant gloves at deburr station", "Added edge-break callout to deburr SOP"],
    created_at: "2025-02-14T15:20:00.000Z",
  },
  {
    id: "OSHA-SEED-2025-002",
    incident_date: "2025-03-22",
    employee_id: "EMP-0003",
    employee_name: "Morgan Blake",
    location: "Surface grinder cell",
    description: "Coolant mist eye irritation; flushed at eyewash and referred to clinic for evaluation.",
    injury_type: "illness",
    body_part_affected: "right eye",
    days_away: 1,
    days_restricted: 0,
    medical_treatment: "medical_beyond_first_aid",
    recordable: true,
    osha_case_number: "JMD-2025-002",
    reported_by: "EMP-0005",
    anonymous: false,
    witnesses: [],
    corrective_actions: ["Serviced mist collector on surface grinder", "Mandated safety glasses with side shields in grinder cell"],
    created_at: "2025-03-22T11:05:00.000Z",
  },
  {
    id: "OSHA-SEED-2025-003",
    incident_date: "2025-05-09",
    employee_id: "EMP-0006",
    employee_name: "Dakota Reeves",
    location: "Fixture build area",
    description: "Lower back strain lifting a 60 lb vise fixture without a lift assist.",
    injury_type: "injury",
    body_part_affected: "lower back",
    days_away: 2,
    days_restricted: 5,
    medical_treatment: "medical_beyond_first_aid",
    recordable: true,
    osha_case_number: "JMD-2025-003",
    reported_by: "EMP-0005",
    anonymous: false,
    witnesses: ["EMP-0002"],
    corrective_actions: ["Staged a hydraulic lift cart at the fixture bench", "Refreshed safe-lifting toolbox talk"],
    created_at: "2025-05-09T09:40:00.000Z",
  },
  {
    id: "OSHA-SEED-2025-004",
    incident_date: "2025-06-18",
    employee_id: "EMP-0002",
    employee_name: "Jordan Vance",
    location: "Lathe cell L-2",
    description: "Minor cut on hand from sheet-stock edge during setup; cleaned and bandaged on site.",
    injury_type: "injury",
    body_part_affected: "right hand",
    days_away: 0,
    days_restricted: 0,
    medical_treatment: "first_aid",
    recordable: false,
    osha_case_number: undefined,
    reported_by: "EMP-0002",
    anonymous: false,
    witnesses: [],
    corrective_actions: ["Deburred stock-staging rack edges"],
    created_at: "2025-06-18T13:15:00.000Z",
  },
  {
    id: "OSHA-SEED-2025-005",
    incident_date: "2025-07-03",
    employee_id: "EMP-0014",
    employee_name: "Morgan Hale",
    location: "Overhead crane bay",
    description: "Near miss: a suspended die block swung within 3 ft of an operator; no contact.",
    injury_type: "near_miss",
    body_part_affected: undefined,
    days_away: 0,
    days_restricted: 0,
    medical_treatment: "first_aid",
    recordable: false,
    osha_case_number: undefined,
    reported_by: "EMP-0014",
    anonymous: false,
    witnesses: ["EMP-0001"],
    corrective_actions: ["Marked crane swing exclusion zone on floor", "Re-trained on tag-line use for slung loads"],
    created_at: "2025-07-03T10:00:00.000Z",
  },
  {
    id: "OSHA-SEED-2025-006",
    incident_date: "2025-08-27",
    employee_id: "EMP-0001",
    employee_name: "Avery Stone",
    location: "VMC-01",
    description: "Slipped on a coolant puddle near the machine; caught self on the enclosure, no injury.",
    injury_type: "near_miss",
    body_part_affected: undefined,
    days_away: 0,
    days_restricted: 0,
    medical_treatment: "first_aid",
    recordable: false,
    osha_case_number: undefined,
    reported_by: "EMP-0001",
    anonymous: false,
    witnesses: [],
    corrective_actions: ["Repaired way-cover seal leaking coolant", "Added absorbent mat at VMC-01 operator station"],
    created_at: "2025-08-27T16:30:00.000Z",
  },
  {
    id: "OSHA-SEED-2025-007",
    incident_date: "2025-10-15",
    employee_id: "EMP-0004",
    employee_name: "Casey Mercer",
    location: "CMM inspection room",
    description: "Minor abrasion from a metal chip on a part edge during inspection handling.",
    injury_type: "injury",
    body_part_affected: "left thumb",
    days_away: 0,
    days_restricted: 0,
    medical_treatment: "first_aid",
    recordable: false,
    osha_case_number: undefined,
    reported_by: "EMP-0004",
    anonymous: false,
    witnesses: [],
    corrective_actions: ["Added chip-brush + glove reminder at inspection bench"],
    created_at: "2025-10-15T14:45:00.000Z",
  },
  {
    id: "OSHA-SEED-2025-008",
    incident_date: "2025-11-30",
    employee_id: "EMP-0003",
    employee_name: "Morgan Blake",
    location: "WEDM cell",
    description: "Thermal burn to forearm from hot wire-EDM flush debris while clearing a fault.",
    injury_type: "injury",
    body_part_affected: "right forearm",
    days_away: 0,
    days_restricted: 1,
    medical_treatment: "medical_beyond_first_aid",
    recordable: true,
    osha_case_number: "JMD-2025-004",
    reported_by: "EMP-0005",
    anonymous: false,
    witnesses: [],
    corrective_actions: ["Required dielectric cooldown before fault clearing", "Issued heat-resistant sleeves at WEDM cell"],
    created_at: "2025-11-30T08:55:00.000Z",
  },
  {
    id: "OSHA-SEED-2026-001",
    incident_date: "2026-01-12",
    employee_id: "EMP-0002",
    employee_name: "Jordan Vance",
    location: "Saw cutoff area",
    description: "Splinter from a wooden pallet while staging bar stock; removed and bandaged on site.",
    injury_type: "injury",
    body_part_affected: "right palm",
    days_away: 0,
    days_restricted: 0,
    medical_treatment: "first_aid",
    recordable: false,
    osha_case_number: undefined,
    reported_by: "EMP-0002",
    anonymous: false,
    witnesses: [],
    corrective_actions: ["Replaced splintered pallets in stock-staging"],
    created_at: "2026-01-12T12:10:00.000Z",
  },
  {
    id: "OSHA-SEED-2026-002",
    incident_date: "2026-02-20",
    employee_id: "EMP-0021",
    employee_name: "Jordan Vale",
    location: "Shipping / receiving",
    description: "Near miss: forklift tine passed near an employee's foot while spotting a receiving load.",
    injury_type: "near_miss",
    body_part_affected: undefined,
    days_away: 0,
    days_restricted: 0,
    medical_treatment: "first_aid",
    recordable: false,
    osha_case_number: undefined,
    reported_by: "EMP-0021",
    anonymous: false,
    witnesses: ["EMP-0006"],
    corrective_actions: ["Marked pedestrian lane in receiving", "Required spotter horn signal before tine movement"],
    created_at: "2026-02-20T09:25:00.000Z",
  },
  {
    id: "OSHA-SEED-2026-003",
    incident_date: "2026-03-14",
    employee_id: "EMP-0006",
    employee_name: "Dakota Reeves",
    location: "Roku-Roku VMC-05",
    description: "Hand pinch near the vise during a workholding change; bruise only, no break in skin.",
    injury_type: "injury",
    body_part_affected: "left hand",
    days_away: 0,
    days_restricted: 0,
    medical_treatment: "first_aid",
    recordable: false,
    osha_case_number: undefined,
    reported_by: "EMP-0006",
    anonymous: false,
    witnesses: [],
    corrective_actions: ["Added pinch-point decals to vise jaws", "Reviewed two-hand clearance during clamp changes"],
    created_at: "2026-03-14T15:50:00.000Z",
  },
  {
    id: "OSHA-SEED-2026-004",
    incident_date: "2026-04-08",
    employee_id: "EMP-0001",
    employee_name: "Avery Stone",
    location: "Surface grinder",
    description: "Hearing discomfort after extended grinding without protection; clinic evaluation and audiometric follow-up.",
    injury_type: "illness",
    body_part_affected: "hearing",
    days_away: 0,
    days_restricted: 2,
    medical_treatment: "medical_beyond_first_aid",
    recordable: true,
    osha_case_number: "JMD-2026-001",
    reported_by: "EMP-0005",
    anonymous: false,
    witnesses: [],
    corrective_actions: ["Posted hearing-protection-required signage in grinder area", "Added grinder cell to the hearing conservation program"],
    created_at: "2026-04-08T10:35:00.000Z",
  },
];

/**
 * 12 canonical PPE assignments across the roster. Mix of conditions so the
 * page's `needs_replacement` flag (condition === "replace") and "worn" review
 * states render with real data.
 */
const PPE_SEED_BASE: readonly Omit<PPEAssignment, "governing_standard">[] = [
  { id: "PPE-SEED-001", employee_id: "EMP-0001", ppe_type: "Safety glasses (side-shield)", size: "Universal", issued_date: "2025-01-06", issued_by: "EMP-0005", condition: "good" },
  { id: "PPE-SEED-002", employee_id: "EMP-0001", ppe_type: "Steel-toe boots", size: "10.5", issued_date: "2025-01-06", issued_by: "EMP-0005", condition: "worn" },
  { id: "PPE-SEED-003", employee_id: "EMP-0002", ppe_type: "Cut-resistant gloves (A4)", size: "L", issued_date: "2025-02-03", issued_by: "EMP-0005", condition: "replace" },
  { id: "PPE-SEED-004", employee_id: "EMP-0002", ppe_type: "Safety glasses (side-shield)", size: "Universal", issued_date: "2025-02-03", issued_by: "EMP-0005", condition: "good" },
  { id: "PPE-SEED-005", employee_id: "EMP-0003", ppe_type: "Hearing protection (28 dB muffs)", size: "Universal", issued_date: "2025-01-20", issued_by: "EMP-0005", condition: "good" },
  { id: "PPE-SEED-006", employee_id: "EMP-0003", ppe_type: "Face shield (grinding)", size: "Universal", issued_date: "2025-01-20", issued_by: "EMP-0005", condition: "replace" },
  { id: "PPE-SEED-007", employee_id: "EMP-0004", ppe_type: "Safety glasses (side-shield)", size: "Universal", issued_date: "2025-03-10", issued_by: "EMP-0005", condition: "good" },
  { id: "PPE-SEED-008", employee_id: "EMP-0004", ppe_type: "Cut-resistant gloves (A4)", size: "M", issued_date: "2025-03-10", issued_by: "EMP-0005", condition: "good" },
  { id: "PPE-SEED-009", employee_id: "EMP-0006", ppe_type: "Steel-toe boots", size: "11", issued_date: "2025-04-01", issued_by: "EMP-0005", condition: "good" },
  { id: "PPE-SEED-010", employee_id: "EMP-0006", ppe_type: "Back-support belt", size: "L", issued_date: "2025-05-12", issued_by: "EMP-0005", condition: "worn" },
  { id: "PPE-SEED-011", employee_id: "EMP-0014", ppe_type: "Hearing protection (28 dB muffs)", size: "Universal", issued_date: "2025-02-18", issued_by: "EMP-0005", condition: "good" },
  { id: "PPE-SEED-012", employee_id: "EMP-0021", ppe_type: "High-visibility vest", size: "L", issued_date: "2025-06-09", issued_by: "EMP-0005", condition: "good" },
];

/**
 * Each seed's governing 29 CFR standard is derived from its ppe_type via the single
 * source `oshaStandardForPPE` (so the cite can never drift from the canonical table).
 * E.g. safety glasses/face shield -> 1910.133, steel-toe boots -> 1910.136,
 * cut-resistant gloves -> 1910.138, hearing muffs -> 1910.95; back-support belt and
 * hi-vis vest (no specific Subpart I standard) -> 1910.132 general requirements.
 */
export const JM_DIE_PPE_SEEDS: readonly PPEAssignment[] = PPE_SEED_BASE.map((p) => ({
  ...p,
  governing_standard: oshaStandardForPPE(p.ppe_type),
}));
