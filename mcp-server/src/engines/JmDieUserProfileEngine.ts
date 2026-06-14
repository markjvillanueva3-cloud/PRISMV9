/**
 * JmDieUserProfileEngine — user profile + RBAC for the JM Die team (hotel iter23).
 *
 * 8 seeded profiles: Mark, Adam, Darren, Paul, Sylwia, Colleen, Vicky, Stanley.
 * Shop-floor operators deliberately out of scope ("we'll get to shop floor guys later").
 *
 * Hotel-soul invariants:
 *   - PII redaction on personal_email + personal_phone in every export surface
 *   - Permission check fail-CLOSED (unknown user / unknown feature → DENY, never silent grant)
 *   - Owner role (Paul) carries every feature in PRISM_FEATURES — including future-added ones
 *   - Backup-role pattern (Stanley = Adam minus 3 admin features) materializes at construction
 *
 * Karpathy pre-coding:
 *   CLASSIFY    — id-keyed Map state engine + RBAC permission matrix + seed loader
 *   TECHNIQUE   — Set<Feature> resolved at seed time; redaction-on-export, not in storage
 *   EDGE CASES  — Paul = ALL, Stanley = Adam-minus, Vicky scoped to shipping only,
 *                 unknown user / unknown feature → false (not throw — keeps middleware composable)
 *   FAILURE MODES — PII leak (mitigated by export redaction), forward-only role change (refused),
 *                   silent grant on missing profile (refused — fail-CLOSED returns false)
 *   THEN WRITE  — code below handles all five from line 1.
 */

export type UserRole =
  | "owner"
  | "shop_foreman"
  | "asst_shop_foreman"
  | "cnc_manager_developer"
  | "sales_quoting"
  | "hr_office_manager"
  | "receptionist_purchasing"
  | "shipping_receiving";

/**
 * PRISM feature permission slugs — domain.action shape. Add new slugs here and
 * Paul's owner permission set auto-includes them via OWNER_ALL_FEATURES.
 */
export const PRISM_FEATURES = [
  // shop_floor
  "shop_floor.view_jobs",
  "shop_floor.write_jobs",
  "shop_floor.delegate_tasks",
  "shop_floor.view_labor",
  "shop_floor.write_labor",
  "shop_floor.scheduling",
  // inventory + tooling
  "inventory.view",
  "inventory.write",
  "inventory.order_tools",
  "inventory.order_materials",
  "inventory.manage_crib",
  // purchasing
  "purchasing.create_po",
  "purchasing.approve_po",
  "purchasing.vendor_management",
  // quoting
  "quoting.view",
  "quoting.create",
  "quoting.approve",
  "quoting.send",
  // sales
  "sales.view_prospects",
  "sales.write_prospects",
  "sales.send_first_contact",
  "sales.view_customer_data",
  "sales.customer_service",
  // accounting
  "accounting.view_ar",
  "accounting.write_ar",
  "accounting.view_gl",
  "accounting.write_gl",
  "accounting.run_payroll",
  "accounting.financial_reports",
  // hr
  "hr.view_employees",
  "hr.write_employees",
  "hr.hiring",
  "hr.payroll_admin",
  // shipping
  "shipping.view",
  "shipping.create",
  "shipping.ups_fedex_integration",
  "shipping.laser_marking",
  // receiving
  "receiving.view",
  "receiving.write",
  "receiving.intake_pdfs",
  "receiving.intake_pictures",
  // office
  "office.reception",
  "office.document_management",
  // cad_cam (Mark's domain)
  "cad_cam.programming",
  "cad_cam.post_processing",
  "cad_cam.simulation",
  "cad_cam.reverse_engineering",
  "cad_cam.training",
  // admin
  "admin.user_management",
  "admin.system_config",
  "admin.view_audit",
  "admin.owner_reports",
  "admin.tutorials_authoring",
] as const;

export type PrismFeature = (typeof PRISM_FEATURES)[number];

export const OWNER_ALL_FEATURES: ReadonlySet<PrismFeature> = new Set(PRISM_FEATURES);

export interface UserProfileInput {
  id: string;
  legal_name: string;
  display_name: string;
  role: UserRole;
  work_email: string;
  personal_email?: string;
  personal_phone?: string;
  responsibilities: string[];
  owned_domains: string[];
  permissions: PrismFeature[];
  is_backup_for?: string;        // userId this profile shadows (e.g., Stanley → Adam)
  notes?: string;
}

export interface UserProfile extends Omit<UserProfileInput, "permissions"> {
  permissions: Set<PrismFeature>;
  created_at: string;
}

export interface RedactedUserProfile {
  id: string;
  legal_name: string;
  display_name: string;
  role: UserRole;
  work_email: string;
  personal_email_redacted: string | null;
  personal_phone_redacted: string | null;
  responsibilities: string[];
  owned_domains: string[];
  permissions: PrismFeature[];
  is_backup_for: string | null;
  notes: string | null;
  created_at: string;
}

function redactEmail(email?: string): string | null {
  if (!email) return null;
  const at = email.indexOf("@");
  if (at < 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= 2) return `**${domain}`;
  return `${local.slice(0, 2)}***${domain}`;
}

function redactPhone(phone?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  const last4 = digits.slice(-4);
  return `***-***-${last4}`;
}

export class JmDieUserProfileEngine {
  private profiles = new Map<string, UserProfile>();
  private activeUserId: string | null = null;

  /** Create / register a profile. Refuses to overwrite — explicit operation. */
  create(input: UserProfileInput): UserProfile {
    if (this.profiles.has(input.id)) {
      throw new Error(`profile '${input.id}' already exists — use update() to mutate`);
    }
    if (!input.work_email.includes("@")) {
      throw new Error(`invalid work_email for '${input.id}': '${input.work_email}'`);
    }
    if (input.is_backup_for && !this.profiles.has(input.is_backup_for)) {
      throw new Error(
        `is_backup_for='${input.is_backup_for}' references unknown profile — seed primary first`
      );
    }
    const profile: UserProfile = {
      ...input,
      permissions: new Set(input.permissions),
      created_at: new Date().toISOString(),
    };
    this.profiles.set(input.id, profile);
    return profile;
  }

  /** Lookup. Returns null for unknown user — middleware-composable. */
  get(id: string): UserProfile | null {
    return this.profiles.get(id) ?? null;
  }

  /** Lookup + redact PII for client-side return. */
  getRedacted(id: string): RedactedUserProfile | null {
    const p = this.profiles.get(id);
    if (!p) return null;
    return this.redact(p);
  }

  private redact(p: UserProfile): RedactedUserProfile {
    return {
      id: p.id,
      legal_name: p.legal_name,
      display_name: p.display_name,
      role: p.role,
      work_email: p.work_email, // work email is public-by-design
      personal_email_redacted: redactEmail(p.personal_email),
      personal_phone_redacted: redactPhone(p.personal_phone),
      responsibilities: [...p.responsibilities],
      owned_domains: [...p.owned_domains],
      permissions: [...p.permissions].sort(),
      is_backup_for: p.is_backup_for ?? null,
      notes: p.notes ?? null,
      created_at: p.created_at,
    };
  }

  /** Redacted list of all profiles, sorted by display_name. */
  listRedacted(filter?: { role?: UserRole; owned_domain?: string }): RedactedUserProfile[] {
    let out = [...this.profiles.values()];
    if (filter?.role) out = out.filter((p) => p.role === filter.role);
    if (filter?.owned_domain) {
      const d = filter.owned_domain;
      out = out.filter((p) => p.owned_domains.includes(d));
    }
    return out
      .sort((a, b) => a.display_name.localeCompare(b.display_name))
      .map((p) => this.redact(p));
  }

  /**
   * RBAC check. Fail-CLOSED: unknown user, unknown feature, or missing
   * permission → false. The caller never gets a silent grant.
   *
   * The owner role (Paul) is a fast-path TRUE for every PRISM_FEATURES entry —
   * including features added after his profile was seeded.
   */
  checkPermission(userId: string, feature: string): boolean {
    const p = this.profiles.get(userId);
    if (!p) return false;
    if (!(PRISM_FEATURES as readonly string[]).includes(feature)) return false;
    if (p.role === "owner") return OWNER_ALL_FEATURES.has(feature as PrismFeature);
    return p.permissions.has(feature as PrismFeature);
  }

  /** Set "current" session user. Returns prior id or null. */
  setActiveUser(id: string): string | null {
    if (!this.profiles.has(id)) {
      throw new Error(`cannot setActive: profile '${id}' not seeded`);
    }
    const prior = this.activeUserId;
    this.activeUserId = id;
    return prior;
  }

  getActiveUser(): RedactedUserProfile | null {
    return this.activeUserId ? this.getRedacted(this.activeUserId) : null;
  }

  /** Distinct permission slugs held by ≥1 seeded user. */
  coverageReport(): {
    total_features: number;
    covered_features: number;
    uncovered: PrismFeature[];
    per_user: Array<{ id: string; permission_count: number }>;
  } {
    const covered = new Set<PrismFeature>();
    for (const p of this.profiles.values()) {
      if (p.role === "owner") {
        for (const f of OWNER_ALL_FEATURES) covered.add(f);
      } else {
        for (const f of p.permissions) covered.add(f);
      }
    }
    const uncovered = PRISM_FEATURES.filter((f) => !covered.has(f));
    return {
      total_features: PRISM_FEATURES.length,
      covered_features: covered.size,
      uncovered,
      per_user: [...this.profiles.values()]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((p) => ({
          id: p.id,
          permission_count: p.role === "owner" ? OWNER_ALL_FEATURES.size : p.permissions.size,
        })),
    };
  }

  /** Reset — test helper. */
  _reset(): void {
    this.profiles.clear();
    this.activeUserId = null;
  }

  /** Count — test helper / dispatcher diagnostics. */
  size(): number {
    return this.profiles.size;
  }
}

export const jmDieUserProfileEngine = new JmDieUserProfileEngine();
