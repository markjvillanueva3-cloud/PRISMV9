/**
 * ProspectiveCustomerEngine — sales-pipeline prospect registry
 * (hotel iter21, 2026-05-24, U-PROSPECTIVE-CUSTOMER).
 *
 * Sales-side companion to CustomerKnowledgeEngine (existing-customer
 * intelligence). This engine tracks PROSPECTIVE customers — companies JM
 * Die does not yet do work for but could, with profiles tuned to JM Die's
 * actual capability stack (CNC mill, lathe, wire EDM, precision
 * stamping/progressive-die tooling).
 *
 * Lifecycle: cold → researched → first_contact → engaged → quoted → won/lost.
 *
 * Pure in-memory state engine — caller owns persistence. Singleton
 * `prospectiveCustomerEngine`.
 *
 * Hotel-soul:
 *   - **R12 fail-loud** — bad inputs throw with descriptive errors
 *   - **PII redaction** — contact_memo auto-redacts SSN / card patterns
 *     before storage (never log raw)
 *   - **deterministic** — id ASC sort; reproducible list output
 *   - **defensive copy** — every public read deep-clones internal state
 *   - **state-machine forward-only** — status transitions can't go backwards
 *     (cold → researched → contacted → engaged → quoted → {won|lost})
 *
 * Reference: SPIN selling (Rackham 1988); Challenger Sale (Dixon/Adamson
 * 2011); APICS CSCP §1 (Customer Relationships).
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type ProspectStatus =
  | "cold"          // identified but not researched
  | "researched"    // capability fit confirmed, contact info gathered
  | "first_contact" // first email/call sent
  | "engaged"       // they replied / showed interest
  | "quoted"        // formal quote sent
  | "won"           // converted to active customer
  | "lost";         // declined / not a fit

export type WorkType =
  | "cnc_milling"           // 3-5 axis precision mill
  | "cnc_turning"           // 2-4 axis lathe
  | "wire_edm"              // precision tight-tolerance / hardened material
  | "progressive_die"       // stamping dies for press-feed strip work
  | "stamping_die_repair"   // re-grind / re-build existing tooling
  | "fixture_design"        // workholding / inspection fixtures
  | "prototype_machining"   // low-volume R&D parts
  | "production_run";       // recurring multi-thousand-piece runs

export interface ContactInfo {
  primary_contact_name: string;
  title: string;
  email: string;
  phone?: string;
  linkedin_url?: string;
  best_time_to_reach?: string;  // operator note — never PII
}

export interface ProspectiveCustomerInput {
  company_name: string;
  industry: string;             // e.g. "automotive", "aerospace", "medical-device"
  city: string;
  state: string;                // e.g. "IL", "WI"
  estimated_annual_machining_spend_usd?: number;  // operator estimate
  work_types_relevant: WorkType[];               // which JM Die capabilities apply
  relevance_score: number;                       // 0..1 operator-set fit grade
  why_relevant: string;                          // one-line "they need X, we offer Y"
  contact: ContactInfo;
  contact_memo?: string;                         // free-text, PII-redacted on store
}

export interface ProspectiveCustomer extends ProspectiveCustomerInput {
  id: string;
  status: ProspectStatus;
  first_contact_at?: string;
  quoted_at?: string;
  closed_at?: string;
  contact_memo: string;          // narrows the optional input → required, PII-redacted
  created_at: string;
  updated_at: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ID_PREFIX = "PROSP";
const MAX_NAME_LEN = 200;
const MAX_MEMO_LEN = 5000;
const MAX_WHY_LEN = 500;
const MIN_RELEVANCE = 0;
const MAX_RELEVANCE = 1;

// State machine — forward-only allowed transitions
const VALID_TRANSITIONS: Record<ProspectStatus, ProspectStatus[]> = {
  cold:           ["researched", "lost"],
  researched:     ["first_contact", "lost"],
  first_contact:  ["engaged", "lost"],
  engaged:        ["quoted", "lost"],
  quoted:         ["won", "lost"],
  won:            [],   // terminal
  lost:           [],   // terminal
};

// PII redaction (same patterns as RecurringExpenseEngine)
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
const SSN_REPLACEMENT = "[SSN-REDACTED]";
const CARD_REGEX = /\b\d{13,19}\b/g;
const CARD_REPLACEMENT = "[CARD-REDACTED]";

const VALID_WORK_TYPES: ReadonlyArray<WorkType> = [
  "cnc_milling", "cnc_turning", "wire_edm", "progressive_die",
  "stamping_die_repair", "fixture_design", "prototype_machining", "production_run",
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function assertNonNegative(x: number, label: string): void {
  if (!Number.isFinite(x)) throw new Error(`${label}: must be finite (got ${x})`);
  if (x < 0) throw new Error(`${label}: must be >= 0 (got ${x})`);
}

function assertNonEmptyStr(s: unknown, label: string, max: number): string {
  if (typeof s !== "string") throw new Error(`${label}: must be a string`);
  const t = s.trim();
  if (t.length === 0) throw new Error(`${label}: empty`);
  if (t.length > max) throw new Error(`${label}: exceeds ${max} chars`);
  return t;
}

function assertRelevance(x: unknown): number {
  if (typeof x !== "number" || !Number.isFinite(x)) {
    throw new Error(`relevance_score: must be a finite number (got ${String(x)})`);
  }
  if (x < MIN_RELEVANCE || x > MAX_RELEVANCE) {
    throw new Error(`relevance_score: must be in [${MIN_RELEVANCE}, ${MAX_RELEVANCE}] (got ${x})`);
  }
  return x;
}

function validateWorkTypes(types: unknown): WorkType[] {
  if (!Array.isArray(types)) throw new Error("work_types_relevant: must be an array");
  if (types.length === 0) throw new Error("work_types_relevant: empty (at least 1 required)");
  for (const t of types) {
    if (!VALID_WORK_TYPES.includes(t as WorkType)) {
      throw new Error(`work_types_relevant: unknown type '${String(t)}'`);
    }
  }
  return [...types] as WorkType[];
}

function validateContact(c: unknown): ContactInfo {
  if (c === null || typeof c !== "object") throw new Error("contact: must be an object");
  const o = c as Record<string, unknown>;
  const name = assertNonEmptyStr(o.primary_contact_name, "contact.primary_contact_name", MAX_NAME_LEN);
  const title = assertNonEmptyStr(o.title, "contact.title", MAX_NAME_LEN);
  const email = assertNonEmptyStr(o.email, "contact.email", MAX_NAME_LEN);
  if (!email.includes("@")) throw new Error(`contact.email: must contain '@' (got '${email}')`);
  return {
    primary_contact_name: name,
    title, email,
    phone: typeof o.phone === "string" ? o.phone : undefined,
    linkedin_url: typeof o.linkedin_url === "string" ? o.linkedin_url : undefined,
    best_time_to_reach: typeof o.best_time_to_reach === "string" ? o.best_time_to_reach : undefined,
  };
}

function redactPII(memo: string): string {
  return memo.replace(SSN_REGEX, SSN_REPLACEMENT).replace(CARD_REGEX, CARD_REPLACEMENT);
}

function makeId(seq: number): string {
  return `${ID_PREFIX}-${seq.toString().padStart(6, "0")}`;
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export class ProspectiveCustomerEngine {
  private readonly store = new Map<string, ProspectiveCustomer>();
  private seq = 0;

  create(input: ProspectiveCustomerInput): ProspectiveCustomer {
    const company = assertNonEmptyStr(input.company_name, "company_name", MAX_NAME_LEN);
    const industry = assertNonEmptyStr(input.industry, "industry", MAX_NAME_LEN);
    const city = assertNonEmptyStr(input.city, "city", MAX_NAME_LEN);
    const state = assertNonEmptyStr(input.state, "state", 4);
    const why = assertNonEmptyStr(input.why_relevant, "why_relevant", MAX_WHY_LEN);
    const relevance = assertRelevance(input.relevance_score);
    const workTypes = validateWorkTypes(input.work_types_relevant);
    const contact = validateContact(input.contact);
    if (input.estimated_annual_machining_spend_usd !== undefined) {
      assertNonNegative(input.estimated_annual_machining_spend_usd, "estimated_annual_machining_spend_usd");
    }
    if (input.contact_memo !== undefined && typeof input.contact_memo !== "string") {
      throw new Error("contact_memo: must be a string");
    }
    const memo = redactPII((input.contact_memo ?? "").slice(0, MAX_MEMO_LEN));

    const now = new Date().toISOString();
    this.seq += 1;
    const prospect: ProspectiveCustomer = {
      id: makeId(this.seq),
      company_name: company,
      industry,
      city,
      state,
      estimated_annual_machining_spend_usd: input.estimated_annual_machining_spend_usd,
      work_types_relevant: workTypes,
      relevance_score: relevance,
      why_relevant: why,
      contact,
      contact_memo: memo,
      status: "cold",
      created_at: now,
      updated_at: now,
    };
    this.store.set(prospect.id, prospect);
    return this.deepCopy(prospect);
  }

  get(id: string): ProspectiveCustomer | null {
    if (typeof id !== "string" || id.length === 0) return null;
    const p = this.store.get(id);
    return p ? this.deepCopy(p) : null;
  }

  /**
   * List prospects with optional filters. Returns sorted by relevance_score DESC
   * (highest-fit prospects surface first for sales prioritization), with id
   * ASC tie-break.
   */
  list(filter?: { status?: ProspectStatus; work_type?: WorkType; min_relevance?: number }): ProspectiveCustomer[] {
    const out: ProspectiveCustomer[] = [];
    for (const p of this.store.values()) {
      if (filter?.status && p.status !== filter.status) continue;
      if (filter?.work_type && !p.work_types_relevant.includes(filter.work_type)) continue;
      if (filter?.min_relevance !== undefined && p.relevance_score < filter.min_relevance) continue;
      out.push(this.deepCopy(p));
    }
    out.sort((a, b) => {
      if (b.relevance_score !== a.relevance_score) return b.relevance_score - a.relevance_score;
      return a.id.localeCompare(b.id);
    });
    return out;
  }

  /**
   * Advance pipeline status. Forward-only — backward moves throw.
   *
   * @throws on unknown id, illegal transition (e.g. cold → quoted skipping
   *         intermediate steps; backward moves like quoted → engaged)
   */
  advanceStatus(id: string, newStatus: ProspectStatus): ProspectiveCustomer {
    const p = this.store.get(id);
    if (!p) throw new Error(`prospect '${id}' not found`);
    const allowed = VALID_TRANSITIONS[p.status];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `illegal transition: ${p.status} → ${newStatus} (allowed from ${p.status}: ${allowed.join(", ") || "none — terminal state"})`,
      );
    }
    const now = new Date().toISOString();
    p.status = newStatus;
    p.updated_at = now;
    if (newStatus === "first_contact") p.first_contact_at = now;
    if (newStatus === "quoted") p.quoted_at = now;
    if (newStatus === "won" || newStatus === "lost") p.closed_at = now;
    return this.deepCopy(p);
  }

  /**
   * Pipeline-summary report — counts + value by status, sales-pipeline view.
   */
  pipelineReport(): {
    by_status: Record<ProspectStatus, { count: number; est_spend_total: number }>;
    total_prospects: number;
    total_pipeline_value_usd: number;
    fetched_at: string;
  } {
    const empty = (): { count: number; est_spend_total: number } => ({ count: 0, est_spend_total: 0 });
    const byStatus: Record<ProspectStatus, { count: number; est_spend_total: number }> = {
      cold: empty(), researched: empty(), first_contact: empty(),
      engaged: empty(), quoted: empty(), won: empty(), lost: empty(),
    };
    let total = 0;
    let pipelineValue = 0;
    for (const p of this.store.values()) {
      total += 1;
      const spend = p.estimated_annual_machining_spend_usd ?? 0;
      byStatus[p.status].count += 1;
      byStatus[p.status].est_spend_total = Math.round((byStatus[p.status].est_spend_total + spend) * 100) / 100;
      // "Pipeline value" excludes won/lost (closed) — open pipeline only
      if (p.status !== "won" && p.status !== "lost") pipelineValue += spend;
    }
    return {
      by_status: byStatus,
      total_prospects: total,
      total_pipeline_value_usd: Math.round(pipelineValue * 100) / 100,
      fetched_at: new Date().toISOString(),
    };
  }

  __resetForTests(): void {
    this.store.clear();
    this.seq = 0;
  }

  private deepCopy(p: ProspectiveCustomer): ProspectiveCustomer {
    return {
      ...p,
      work_types_relevant: [...p.work_types_relevant],
      contact: { ...p.contact },
    };
  }
}

export const prospectiveCustomerEngine = new ProspectiveCustomerEngine();
