/**
 * BuyerAccountEngine — the two-sided BUYER account model for the PRISM manufacturing networking
 * marketplace (galaxy:business, slot:hotel). The buyer-side counterpart of
 * {@link SupplierCapabilityProfileEngine}: where the supplier side registers a SHOP's capability
 * profile, this side registers a BUYER's marketplace identity. Buyers register, get verified, and
 * own RFQs (RFQBroadcast gates on {@link BuyerAccountEngine.canPostRFQ}).
 *
 * DEDUP / boundary (R8) — distinct from {@link CustomerManagementEngine}:
 *   {@link CustomerManagementEngine} is the ERP CRM: it owns the customer MASTER record (credit
 *   limit + current balance, pricing tier, discount %, tax-exempt/tax-id, address, comm log, sales
 *   pipeline, win/loss analytics) for the single-tenant job shop's own customers. BuyerAccountEngine
 *   is a DIFFERENT thing: the MARKETPLACE-ACCOUNT layer — a buyer's networking-platform identity
 *   (auth/contact handle, marketplace credit/verification STATUS, active flag, RFQ-posting gate). It
 *   does NOT re-store CRM master data (no credit limit, no balance, no pricing tier, no comm log —
 *   those stay in CustomerManagementEngine). Where a marketplace buyer corresponds to an ERP
 *   customer record the BuyerAccount carries an OPTIONAL `customerId` REFERENCE to that CRM row,
 *   rather than duplicating its fields. The two engines align on contact field names
 *   (companyName↔company, contactEmail↔email, contactPhone↔phone) so a buyer↔customer reconciliation
 *   is a join, not a re-key. A marketplace buyer need not be an ERP customer (an external buyer
 *   sourcing through the platform has no JM-Die CRM row) — hence the reference is optional.
 *
 * SYMMETRY: this engine mirrors {@link SupplierCapabilityProfileEngine}'s shape verbatim — a pure
 * static-class registry keyed by id (here `buyerId`), Zod-validated `z.input` params, fail-loud
 * THROW on bad input/duplicate/unknown id, never-hard-delete (deactivate flips active=false;
 * reactivate restores), active-only listing by default, `__resetForTests()`. No fs / network /
 * wall-clock-in-asserted-values: timestamps are wall-clock metadata (createdAt/updatedAt) only and
 * are never part of a business invariant a test asserts.
 *
 * PII (business/CLAUDE.md §8.2 — HARD): the buyer's raw contact email + phone are stored INTERNALLY
 * (so an internal billing path can reach the real handle), but EVERY record meant for display/log —
 * the return value of registerBuyer/getBuyer/listBuyers/updateBuyer/setCreditStatus/de(re)activate,
 * and the engine's masked-record `toJSON` shape — masks the email (a***@domain) and the phone (last
 * 4 only). The raw handle never appears in JSON.stringify of a public record. getBuyerInternal is
 * the ONE documented unmasked path, for internal billing reconciliation only.
 *
 * INVARIANTS (fail loud — never silent-coerce, never a bogus default):
 *  - buyerId is UNIQUE; a duplicate registration THROWS (would silently overwrite a buyer).
 *  - contactEmail must match a basic local@domain shape; a malformed email THROWS (a masked garbage
 *    handle is worse than a loud rejection — the buyer could never be contacted).
 *  - region ∈ {@link MARKETPLACE_REGIONS}; companyName + contactEmail non-empty.
 *  - creditStatus ∈ {@link CREDIT_STATUSES} (default {@link DEFAULT_CREDIT_STATUS}).
 *  - canPostRFQ ⇔ active && creditStatus !== 'suspended'.
 *  - never hard-delete: deactivateBuyer flips active=false ([[feedback_never_delete_only_disable]]);
 *    reactivateBuyer restores it. listBuyers is active-only by default.
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wiring the stale worktree copy would clobber ~438 main actions on golf-merge. Wire in MAIN post-merge.

import { z } from "zod";
import {
  CREDIT_STATUSES,
  MARKETPLACE_REGIONS,
  DEFAULT_CREDIT_STATUS,
  BUYER_ACCOUNT_POLICY_VERSION,
  EMAIL_MASK_VISIBLE_PREFIX,
  PHONE_MASK_VISIBLE_SUFFIX,
  isValidCreditStatus,
  isValidRegion,
  type CreditStatus,
  type MarketplaceRegion,
} from "../data/buyer-account-policy.js";

// ============================================================================
// PII MASKING (display-masking helpers — widths imported, never inlined)
// ============================================================================

/**
 * Mask an email for display: keep {@link EMAIL_MASK_VISIBLE_PREFIX} leading local-part chars, redact
 * the rest of the local-part with `***`, keep the domain. `alice@shop.com` → `a***@shop.com`.
 * A single-char local-part still masks to `a***@…` (the `***` is always present so a masked handle
 * is unambiguous). The input is assumed already shape-validated by {@link isValidEmailShape}.
 */
function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  // Defensive: validated callers always have an '@', but never index past the string if not.
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visible = local.slice(0, EMAIL_MASK_VISIBLE_PREFIX);
  return `${visible}***@${domain}`;
}

/**
 * Mask a phone for display: reveal only the last {@link PHONE_MASK_VISIBLE_SUFFIX} DIGITS, prefixed
 * with `***`. Non-digit formatting (spaces, dashes, parens, +) is stripped before taking the
 * suffix, so `+1 (860) 555-0142` → `***0142`. A phone with fewer than the suffix-count digits
 * reveals all the digits it has (still prefixed `***`) rather than throwing — a short phone is a
 * data-quality issue for the masked DISPLAY, not a reason to drop the whole record.
 */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D+/g, "");
  const suffix = digits.slice(-PHONE_MASK_VISIBLE_SUFFIX);
  return `***${suffix}`;
}

/**
 * Basic email shape check: exactly one local-part + '@' + a domain with a dot. Deliberately strict
 * enough to reject the obvious garbage (`no-at`, `a@`, `@b.com`, `a@b`) while not pretending to be a
 * full RFC 5322 validator (that is the verification step's job). A FALSE return ⇒ the caller THROWS.
 */
function isValidEmailShape(email: string): boolean {
  // local (no @/whitespace) @ domain-label(.domain-label)+
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================================================
// SCHEMAS — z.input (NOT z.infer) so the defaulted creditStatus stays optional for callers
// ============================================================================

const RegisterBuyerSchema = z.object({
  buyerId: z.string().min(1, "buyerId is required"),
  /** OPTIONAL reference to a CustomerManagementEngine customer id (the ERP CRM row), if this buyer
   * is also an ERP customer. NOT a re-store of CRM data — a join key only. */
  customerId: z.string().min(1).optional(),
  companyName: z.string().min(1, "companyName is required"),
  contactEmail: z.string().min(1, "contactEmail is required"),
  contactPhone: z.string().min(1).optional(),
  region: z.string().min(1, "region is required"),
  creditStatus: z.string().min(1).optional(), // validated against CREDIT_STATUSES below; default applied
});
export type RegisterBuyerInput = z.input<typeof RegisterBuyerSchema>;

/** Mutable fields for {@link BuyerAccountEngine.updateBuyer} (all optional; .strict rejects typos). */
const UpdateBuyerSchema = z
  .object({
    customerId: z.string().min(1).optional(),
    companyName: z.string().min(1).optional(),
    contactEmail: z.string().min(1).optional(),
    contactPhone: z.string().min(1).optional(),
    region: z.string().min(1).optional(),
  })
  .strict();
export type UpdateBuyerInput = z.input<typeof UpdateBuyerSchema>;

// ============================================================================
// DOMAIN TYPES
// ============================================================================

/**
 * The INTERNAL stored buyer account — carries the RAW contact handle. Returned ONLY by
 * {@link BuyerAccountEngine.getBuyerInternal} (internal billing path). Never sent to a display/log
 * surface; the public/masked shape is {@link BuyerAccount}.
 */
export interface BuyerAccountInternal {
  buyerId: string;
  customerId: string | null;
  companyName: string;
  /** RAW email (unmasked) — internal billing only. */
  contactEmail: string;
  /** RAW phone (unmasked), or null if none supplied — internal billing only. */
  contactPhone: string | null;
  region: MarketplaceRegion;
  creditStatus: CreditStatus;
  active: boolean;
  schemaVersion: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * The PUBLIC / display buyer account — contact handle MASKED. This is what every non-internal method
 * returns and what the masked `toJSON` emits. `contactEmailMasked` / `contactPhoneMasked` carry the
 * redacted handles; the raw `contactEmail` / `contactPhone` keys are ABSENT (not present-and-empty),
 * so JSON.stringify of this shape can never leak the raw handle.
 */
export interface BuyerAccount {
  buyerId: string;
  customerId: string | null;
  companyName: string;
  /** masked email, e.g. `a***@shop.com`. */
  contactEmailMasked: string;
  /** masked phone (last 4), e.g. `***0142`, or null if no phone on file. */
  contactPhoneMasked: string | null;
  region: MarketplaceRegion;
  creditStatus: CreditStatus;
  active: boolean;
  schemaVersion: string;
  createdAt: string;
  updatedAt: string;
}

/** Optional filter for {@link BuyerAccountEngine.listBuyers}. */
export interface BuyerListFilter {
  region?: MarketplaceRegion;
  creditStatus?: CreditStatus;
  includeInactive?: boolean;
}

// ============================================================================
// ENGINE
// ============================================================================

export class BuyerAccountEngine {
  /** buyerId → INTERNAL (raw-contact) buyer account. Pure registry (no fs/network). */
  private static buyers = new Map<string, BuyerAccountInternal>();

  /**
   * Register a new marketplace buyer.
   *
   * Validation (fail loud — every violation THROWS):
   *  - buyerId UNIQUE (a duplicate would silently overwrite an existing buyer account).
   *  - companyName + contactEmail + region non-empty (Zod).
   *  - contactEmail matches a basic local@domain.tld shape (a malformed email THROWS — a buyer who
   *    cannot be contacted is never a valid account, and masking garbage hides the defect).
   *  - region ∈ {@link MARKETPLACE_REGIONS}.
   *  - creditStatus, if supplied, ∈ {@link CREDIT_STATUSES}; default {@link DEFAULT_CREDIT_STATUS}.
   *
   * The RAW contact handle is stored internally; the RETURNED record is MASKED.
   *
   * @param input the buyer to register (buyerId/companyName/contactEmail/region + optional
   *              customerId/contactPhone/creditStatus).
   * @returns the stored {@link BuyerAccount} (MASKED, active=true).
   * @throws on duplicate id, malformed email, unknown region/creditStatus, or bad shape.
   */
  static registerBuyer(input: RegisterBuyerInput): BuyerAccount {
    const p = RegisterBuyerSchema.parse(input); // throws on missing/empty fields

    if (BuyerAccountEngine.buyers.has(p.buyerId)) {
      throw new Error(
        `BuyerAccountEngine.registerBuyer: duplicate buyerId '${p.buyerId}' — ids must be unique ` +
          `(a duplicate would silently overwrite an existing buyer account).`,
      );
    }
    if (!isValidEmailShape(p.contactEmail)) {
      throw new Error(
        `BuyerAccountEngine.registerBuyer: malformed contactEmail '${p.contactEmail}' for buyer ` +
          `'${p.buyerId}' — must be a local@domain.tld shape (a buyer who cannot be contacted is ` +
          `not a valid account).`,
      );
    }
    if (!isValidRegion(p.region)) {
      throw new Error(
        `BuyerAccountEngine.registerBuyer: unknown region '${p.region}' for buyer '${p.buyerId}' — ` +
          `must be one of ${MARKETPLACE_REGIONS.join("/")}.`,
      );
    }
    const creditStatus = BuyerAccountEngine.#resolveCreditStatus(p.creditStatus, p.buyerId, "registerBuyer");

    const now = new Date().toISOString();
    const record: BuyerAccountInternal = {
      buyerId: p.buyerId,
      customerId: p.customerId ?? null,
      companyName: p.companyName,
      contactEmail: p.contactEmail,
      contactPhone: p.contactPhone ?? null,
      region: p.region as MarketplaceRegion,
      creditStatus,
      active: true,
      schemaVersion: BUYER_ACCOUNT_POLICY_VERSION,
      createdAt: now,
      updatedAt: now,
    };
    BuyerAccountEngine.buyers.set(record.buyerId, record);
    return BuyerAccountEngine.#toPublic(record);
  }

  /**
   * Fetch a stored buyer by id — MASKED (display/log-safe). The raw contact handle never appears in
   * this record.
   * @param buyerId the buyer id.
   * @returns the masked {@link BuyerAccount}, or null if no buyer has that id.
   */
  static getBuyer(buyerId: string): BuyerAccount | null {
    const b = BuyerAccountEngine.buyers.get(buyerId);
    return b ? BuyerAccountEngine.#toPublic(b) : null;
  }

  /**
   * Fetch the INTERNAL (UNMASKED) buyer record — the ONE documented internal path that exposes the
   * raw contact email + phone. For internal BILLING / contact reconciliation ONLY: a value returned
   * here must NEVER be sent to a display surface or written to a log. Every other read path
   * (getBuyer/listBuyers/…) returns the masked shape.
   *
   * @param buyerId the buyer id.
   * @returns the unmasked {@link BuyerAccountInternal} (a defensive copy — callers cannot mutate the
   *          registry through it).
   * @throws if the buyer is unknown (fail loud — never hand back a null on an internal billing path
   *          where a missing buyer is a hard error).
   */
  static getBuyerInternal(buyerId: string): BuyerAccountInternal {
    const b = BuyerAccountEngine.#mustGet(buyerId, "getBuyerInternal");
    return { ...b }; // defensive copy — the registry stays the single owner of mutable state
  }

  /**
   * List buyers (MASKED), optionally filtered. Active-only by default, sorted by buyerId.
   * @param filter.region include only buyers in this region.
   * @param filter.creditStatus include only buyers with this credit status.
   * @param filter.includeInactive include deactivated buyers (default false → active only).
   * @returns the matching masked {@link BuyerAccount}s, sorted by buyerId.
   */
  static listBuyers(filter: BuyerListFilter = {}): BuyerAccount[] {
    const all = [...BuyerAccountEngine.buyers.values()];
    const filtered = all.filter((b) => {
      if (!filter.includeInactive && !b.active) return false;
      if (filter.region && b.region !== filter.region) return false;
      if (filter.creditStatus && b.creditStatus !== filter.creditStatus) return false;
      return true;
    });
    return filtered.sort((a, b) => a.buyerId.localeCompare(b.buyerId)).map((b) => BuyerAccountEngine.#toPublic(b));
  }

  /**
   * Update mutable contact/identity fields of an existing buyer. Re-validates a supplied email shape
   * + region with the same rules as registration (malformed email / unknown region THROW). buyerId /
   * creditStatus / active / createdAt / schemaVersion are immutable here — use setCreditStatus for
   * status and deactivate/reactivate for `active`.
   *
   * @param buyerId the buyer to update.
   * @param patch the fields to change (.strict — an unknown key THROWS).
   * @returns the updated MASKED {@link BuyerAccount}.
   * @throws if the buyer is unknown, the patch is empty, the email is malformed, or the region is
   *          unknown.
   */
  static updateBuyer(buyerId: string, patch: UpdateBuyerInput): BuyerAccount {
    const current = BuyerAccountEngine.#mustGet(buyerId, "updateBuyer");
    const c = UpdateBuyerSchema.parse(patch); // throws on unknown keys / bad shape

    if (Object.keys(c).length === 0) {
      throw new Error(
        `BuyerAccountEngine.updateBuyer: empty patch for '${buyerId}' — supply at least one mutable ` +
          `field (a no-op update is a surfaced error, not a silent skip).`,
      );
    }
    if (c.contactEmail !== undefined && !isValidEmailShape(c.contactEmail)) {
      throw new Error(
        `BuyerAccountEngine.updateBuyer: malformed contactEmail '${c.contactEmail}' for buyer ` +
          `'${buyerId}' — must be a local@domain.tld shape.`,
      );
    }
    if (c.region !== undefined && !isValidRegion(c.region)) {
      throw new Error(
        `BuyerAccountEngine.updateBuyer: unknown region '${c.region}' for buyer '${buyerId}' — ` +
          `must be one of ${MARKETPLACE_REGIONS.join("/")}.`,
      );
    }

    current.customerId = c.customerId !== undefined ? c.customerId : current.customerId;
    current.companyName = c.companyName ?? current.companyName;
    current.contactEmail = c.contactEmail ?? current.contactEmail;
    current.contactPhone = c.contactPhone !== undefined ? c.contactPhone : current.contactPhone;
    current.region = c.region !== undefined ? (c.region as MarketplaceRegion) : current.region;
    current.updatedAt = new Date().toISOString();
    return BuyerAccountEngine.#toPublic(current);
  }

  /**
   * Transition a buyer's credit/verification status (unverified ↔ verified ↔ suspended). This is the
   * KYB-result + fraud-hold lever; it directly affects {@link BuyerAccountEngine.canPostRFQ} (a
   * `suspended` buyer cannot post). All three statuses are reachable from any other (re-verify a
   * suspended buyer, suspend a verified buyer, demote a verified buyer back to unverified) — there is
   * no illegal transition, only an unknown status value (which THROWS).
   *
   * @param buyerId the buyer to transition.
   * @param status the new credit status (∈ {@link CREDIT_STATUSES}).
   * @returns the updated MASKED {@link BuyerAccount}.
   * @throws if the buyer is unknown or the status is not a recognized credit status.
   */
  static setCreditStatus(buyerId: string, status: CreditStatus): BuyerAccount {
    const b = BuyerAccountEngine.#mustGet(buyerId, "setCreditStatus");
    if (!isValidCreditStatus(status)) {
      throw new Error(
        `BuyerAccountEngine.setCreditStatus: unknown credit status '${status}' for buyer '${buyerId}' — ` +
          `must be one of ${CREDIT_STATUSES.join("/")}.`,
      );
    }
    b.creditStatus = status;
    b.updatedAt = new Date().toISOString();
    return BuyerAccountEngine.#toPublic(b);
  }

  /**
   * Deactivate a buyer. NEVER hard-deletes — flips active=false so the account (identity, contact,
   * credit status, history) is preserved ([[feedback_never_delete_only_disable]]). listBuyers
   * excludes it by default; getBuyer still returns it; canPostRFQ returns false while inactive.
   *
   * @param buyerId the buyer to deactivate.
   * @returns the updated MASKED {@link BuyerAccount} (active=false).
   * @throws if the buyer is unknown.
   */
  static deactivateBuyer(buyerId: string): BuyerAccount {
    const b = BuyerAccountEngine.#mustGet(buyerId, "deactivateBuyer");
    b.active = false;
    b.updatedAt = new Date().toISOString();
    return BuyerAccountEngine.#toPublic(b);
  }

  /**
   * Reactivate a previously-deactivated buyer (restore to the marketplace). Restores ONLY the active
   * flag — the credit status is unchanged (a buyer suspended-then-deactivated comes back suspended,
   * so reactivation never silently re-grants RFQ-posting to a fraud-held account).
   *
   * @param buyerId the buyer to reactivate.
   * @returns the updated MASKED {@link BuyerAccount} (active=true).
   * @throws if the buyer is unknown.
   */
  static reactivateBuyer(buyerId: string): BuyerAccount {
    const b = BuyerAccountEngine.#mustGet(buyerId, "reactivateBuyer");
    b.active = true;
    b.updatedAt = new Date().toISOString();
    return BuyerAccountEngine.#toPublic(b);
  }

  /**
   * Can this buyer post an RFQ to the marketplace? `true` ⇔ the account is active AND its credit
   * status is NOT 'suspended' (an unverified buyer CAN post — posting is gated only by suspension,
   * not by verification; verification governs downstream escrow/payout terms in MarketplaceLedger).
   * RFQBroadcast calls this as its first gate before broadcasting a buyer's RFQ.
   *
   * @param buyerId the buyer to gate.
   * @returns true if the buyer may post an RFQ.
   * @throws if the buyer is unknown (fail loud — a gate that silently returns false on a typo'd id
   *          would mask a caller bug).
   */
  static canPostRFQ(buyerId: string): boolean {
    const b = BuyerAccountEngine.#mustGet(buyerId, "canPostRFQ");
    return b.active && b.creditStatus !== "suspended";
  }

  // --------------------------------------------------------------------------
  // INTERNALS
  // --------------------------------------------------------------------------

  /** Fetch a buyer or THROW (fail loud — never operate on a missing buyer). */
  static #mustGet(buyerId: string, method: string): BuyerAccountInternal {
    const b = BuyerAccountEngine.buyers.get(buyerId);
    if (!b) throw new Error(`BuyerAccountEngine.${method}: unknown buyerId '${buyerId}'.`);
    return b;
  }

  /** Resolve + validate a supplied creditStatus (or apply the default). THROWS on an unknown value. */
  static #resolveCreditStatus(supplied: string | undefined, buyerId: string, method: string): CreditStatus {
    if (supplied === undefined) return DEFAULT_CREDIT_STATUS;
    if (!isValidCreditStatus(supplied)) {
      throw new Error(
        `BuyerAccountEngine.${method}: unknown credit status '${supplied}' for buyer '${buyerId}' — ` +
          `must be one of ${CREDIT_STATUSES.join("/")}.`,
      );
    }
    return supplied;
  }

  /**
   * Project an INTERNAL (raw-contact) record to its PUBLIC / display shape with the contact handle
   * masked. The raw `contactEmail` / `contactPhone` keys are NOT carried over — only the masked
   * forms — so JSON.stringify of the returned object can never leak the raw handle.
   */
  static #toPublic(b: BuyerAccountInternal): BuyerAccount {
    return {
      buyerId: b.buyerId,
      customerId: b.customerId,
      companyName: b.companyName,
      contactEmailMasked: maskEmail(b.contactEmail),
      contactPhoneMasked: b.contactPhone !== null ? maskPhone(b.contactPhone) : null,
      region: b.region,
      creditStatus: b.creditStatus,
      active: b.active,
      schemaVersion: b.schemaVersion,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };
  }

  /** TEST-ONLY: clear the registry. */
  static __resetForTests(): void {
    BuyerAccountEngine.buyers.clear();
  }
}

export const buyerAccountEngine = BuyerAccountEngine;

// Export the masking helpers for re-use by sibling display surfaces (e.g. a bid record that echoes
// a buyer's masked contact). Keeps the §8.2 masking width single-sourced through this engine.
export { maskEmail, maskPhone, isValidEmailShape };
