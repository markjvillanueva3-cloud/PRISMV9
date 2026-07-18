/**
 * PRISM MCP Server -- LicenseStore (U-COMM-08)
 *
 * Persisted one-time (perpetual) license grants. These are NON-subscription
 * purchases -- the operator's launch ask: "a logical price for one time payment
 * for the sfc and a single post processor."
 *
 * A license grants a feature FOREVER, independent of the user's subscription plan:
 *   - sfc_perpetual ($299)  -> blanket "speed_feed" grant (above the free 10/day cap)
 *   - post_perpetual ($199) -> a SINGLE controller's post output (controller-scoped)
 *
 * This is the GRANT-ABOVE path, distinct from EntitlementOverrideStore (which only
 * DENIES below the plan ceiling). requireTier consults req.user.licenses (the
 * blanket grants) AFTER the admin-deny check and BEFORE the plan check, so a
 * perpetual buyer is never blocked by free-tier limits, but an admin can still
 * revoke a shop seat. Controller-scoped post grants are checked per-controller via
 * hasPostLicense at the post-generation route (NOT blanket-wired -- a single-post
 * purchase must not unlock ALL program output).
 *
 * Design mirrors SubscriptionStore (U-COMM-03):
 *   - In-memory Map for synchronous reads (middleware hot path).
 *   - Lazy load from disk on first access (sync readFileSync).
 *   - Writes via safeWriteSync (temp + rename).
 *   - FAIL LOUD on an existing-but-unreadable/corrupt file -- never reset-then-clobber
 *     a populated store (lesson: reference_tribal_index_v8_string_cap clobber class).
 *
 * License keys are HMAC-signed so activation can be verified offline:
 *   PRISM-<PRODUCT_ABBR>-<random>-<sig8>
 * The signing secret comes from PRISM_LICENSE_SIGNING_SECRET (operator-provisioned,
 * like the Stripe keys -- U-COMM-07). Absent that, a clearly-non-production dev
 * fallback is assembled at runtime so dev/test work; a warning is logged once.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { safeWriteSync } from "../utils/atomicWrite.js";
import { ONE_TIME_PRODUCTS, isOneTimeProduct } from "../config/pricing-registry.js";
import { isGatedFeature } from "../middleware/tierGate.js";

export type LicenseStatus = "active" | "revoked";

export interface LicenseRecord {
  /** Opaque, HMAC-signed key handed to the buyer (PRISM-...). The store's primary id. */
  licenseKey: string;
  /** Owner once activated; "" for an issued-but-unactivated key. */
  userId: string;
  /** ONE_TIME_PRODUCTS id (sfc_perpetual | post_perpetual). */
  product: string;
  /** Blanket GATED_FEATURES key this grants (null for a controller-scoped product). */
  feature: string | null;
  /** Controller id for a controller-scoped product (post_perpetual); undefined otherwise. */
  scope?: string;
  status: LicenseStatus;
  issuedAt: string;
  activatedAt?: string;
  /** Provenance: "stripe" | "admin" | "manual". */
  source: string;
}

interface StoreFile {
  schemaVersion: number;
  licenses: Record<string, LicenseRecord>;
}

const SCHEMA_VERSION = 1;

function defaultPath(): string {
  return join(process.cwd(), "data", "state", "license-store.json");
}

function resolveSigningSecret(): { secret: string; isDevFallback: boolean } {
  const env = process.env.PRISM_LICENSE_SIGNING_SECRET;
  if (env && env.length >= 16) return { secret: env, isDevFallback: false };
  // Clearly-non-production fallback, assembled at runtime so it is neither a
  // hardcoded secret literal nor mistakable for one. Keys signed with this do not
  // validate once a real PRISM_LICENSE_SIGNING_SECRET is set (by design).
  const secret = ["prism", "license", "dev", "unsigned", "do-not-use-in-prod"].join("-");
  return { secret, isDevFallback: true };
}

function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

const PRODUCT_ABBR: Record<string, string> = {
  sfc_perpetual: "SFC",
  post_perpetual: "POST",
};

export class LicenseStore {
  readonly engineName = "LicenseStore";
  readonly version = "1.0.0";

  private readonly path: string;
  private readonly secret: string;
  /** True when the signing secret is the dev fallback (no real env secret set). */
  private readonly usingDevFallback: boolean;
  private licenses: Map<string, LicenseRecord> | null = null;

  constructor(path?: string, signingSecret?: string) {
    this.path = path ?? defaultPath();
    if (signingSecret && signingSecret.length >= 16) {
      this.secret = signingSecret;
      this.usingDevFallback = false;
    } else {
      const { secret, isDevFallback } = resolveSigningSecret();
      this.secret = secret;
      this.usingDevFallback = isDevFallback;
      if (isDevFallback) {
        console.warn(
          "[LicenseStore] PRISM_LICENSE_SIGNING_SECRET unset -- using a DEV signing fallback. " +
            "Set a real secret in production (U-COMM-07). Minting is REFUSED in production until it is set.",
        );
      }
    }
  }

  /** Lazy load (sync). Throws on an existing-but-corrupt file (never silent reset). */
  private ensureLoaded(): Map<string, LicenseRecord> {
    if (this.licenses) return this.licenses;
    const m = new Map<string, LicenseRecord>();
    if (existsSync(this.path)) {
      let raw: string;
      try {
        raw = readFileSync(this.path, "utf-8");
      } catch (e) {
        throw new Error(`LicenseStore: cannot read existing store at ${this.path}: ${(e as Error).message}`);
      }
      let parsed: StoreFile;
      try {
        parsed = JSON.parse(raw) as StoreFile;
      } catch (e) {
        throw new Error(`LicenseStore: corrupt store at ${this.path} (refusing to reset-then-clobber): ${(e as Error).message}`);
      }
      if (parsed && parsed.licenses && typeof parsed.licenses === "object") {
        for (const [key, rec] of Object.entries(parsed.licenses)) {
          if (rec && typeof rec === "object") m.set(key, rec as LicenseRecord);
        }
      }
    }
    this.licenses = m;
    return m;
  }

  private persist(): void {
    const m = this.ensureLoaded();
    const file: StoreFile = {
      schemaVersion: SCHEMA_VERSION,
      licenses: Object.fromEntries(m),
    };
    safeWriteSync(this.path, JSON.stringify(file, null, 2));
  }

  // --------------------------------------------------------------------------
  // Key generation + verification (HMAC-signed, offline-verifiable)
  // --------------------------------------------------------------------------

  private sign(payload: string): string {
    // 32 hex chars = 128-bit truncation. A short 48-bit truncation is brute-forceable
    // offline (the buyer controls the random part), which would matter for any future
    // offline-verify flow; 128 bits is infeasible to forge without the secret.
    return createHmac("sha256", this.secret).update(payload).digest("hex").slice(0, 32);
  }

  /** Generate a fresh signed key for a product. Format: PRISM-<ABBR>-<rand>-<sig>. */
  generateKey(product: string): string {
    if (!isOneTimeProduct(product)) throw new Error(`LicenseStore.generateKey: unknown product "${product}"`);
    // SECURITY: never mint a real license under the dev signing fallback in production
    // -- the fallback secret is derivable from this source, so a prod key signed with
    // it would be trivially forgeable. Require an operator-provisioned secret (U-COMM-07).
    if (this.usingDevFallback && isProductionEnv()) {
      throw new Error(
        "LicenseStore.generateKey: refusing to mint a license under the DEV signing fallback in production. " +
          "Set PRISM_LICENSE_SIGNING_SECRET (>=16 chars) -- U-COMM-07.",
      );
    }
    const abbr = PRODUCT_ABBR[product] ?? product.toUpperCase().slice(0, 6);
    const rand = randomBytes(12).toString("hex").toUpperCase(); // 24 hex chars
    const sig = this.sign(`${product}:${rand}`).toUpperCase();
    return `PRISM-${abbr}-${rand}-${sig}`;
  }

  /** Verify a key's signature (offline). Does NOT check store membership/status. */
  verifyKey(licenseKey: string): boolean {
    if (typeof licenseKey !== "string") return false;
    const parts = licenseKey.split("-");
    if (parts.length !== 4) return false;
    const [prefix, abbr, rand, sig] = parts;
    if (prefix !== "PRISM" || !abbr || !rand || !sig) return false;
    // recover the product from the abbreviation
    const product = Object.keys(PRODUCT_ABBR).find((p) => PRODUCT_ABBR[p] === abbr);
    if (!product) return false;
    const expected = this.sign(`${product}:${rand}`).toUpperCase();
    if (expected.length !== sig.length) return false;
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
    } catch {
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // Issue / activate / query
  // --------------------------------------------------------------------------

  /**
   * Issue a license. Generates + stores a key. If `userId` is provided the key is
   * issued already-activated (direct grant, e.g. a Stripe one-time payment for a
   * signed-in buyer); otherwise it is unassigned until activate().
   * Throws on an unknown product, a controller-scoped product without a scope, or
   * a product whose grantsFeature is non-null but not an enforceable feature.
   */
  issue(opts: { product: string; userId?: string; scope?: string; source?: string }): LicenseRecord {
    const { product } = opts;
    if (!isOneTimeProduct(product)) throw new Error(`LicenseStore.issue: unknown product "${product}"`);
    const def = ONE_TIME_PRODUCTS[product];
    if (def.scope === "controller" && !opts.scope) {
      throw new Error(`LicenseStore.issue: product "${product}" is controller-scoped and requires a scope (controller id)`);
    }
    if (def.grantsFeature !== null && !isGatedFeature(def.grantsFeature)) {
      // R12: never issue a grant on a feature nothing enforces (silent no-op grant)
      throw new Error(`LicenseStore.issue: product "${product}" grants non-enforceable feature "${def.grantsFeature}"`);
    }
    const m = this.ensureLoaded();
    const licenseKey = this.generateKey(product);
    const now = new Date().toISOString();
    const userId = opts.userId ?? "";
    const rec: LicenseRecord = {
      licenseKey,
      userId,
      product,
      feature: def.grantsFeature,
      ...(def.scope === "controller" ? { scope: opts.scope } : {}),
      status: "active",
      issuedAt: now,
      ...(userId ? { activatedAt: now } : {}),
      source: opts.source ?? "manual",
    };
    m.set(licenseKey, rec);
    this.persist();
    return rec;
  }

  /**
   * Activate an issued key for a user. Verifies the signature, binds the user, and
   * stamps activatedAt. Throws on an invalid signature, an unknown key, a revoked
   * key, or a key already activated to a DIFFERENT user. Re-activating to the same
   * user is idempotent.
   */
  activate(licenseKey: string, userId: string): LicenseRecord {
    if (!userId) throw new Error("LicenseStore.activate: userId required");
    if (!this.verifyKey(licenseKey)) throw new Error("LicenseStore.activate: invalid license key signature");
    const m = this.ensureLoaded();
    const rec = m.get(licenseKey);
    if (!rec) throw new Error("LicenseStore.activate: unknown license key");
    if (rec.status === "revoked") throw new Error("LicenseStore.activate: license has been revoked");
    if (rec.userId && rec.userId !== userId) {
      throw new Error("LicenseStore.activate: license already activated to another account");
    }
    if (rec.userId === userId) return rec; // idempotent
    const updated: LicenseRecord = { ...rec, userId, activatedAt: new Date().toISOString() };
    m.set(licenseKey, updated);
    this.persist();
    return updated;
  }

  /** Revoke a license (e.g. refund/chargeback). Idempotent. Throws on unknown key. */
  revoke(licenseKey: string): LicenseRecord {
    const m = this.ensureLoaded();
    const rec = m.get(licenseKey);
    if (!rec) throw new Error("LicenseStore.revoke: unknown license key");
    if (rec.status === "revoked") return rec;
    const updated: LicenseRecord = { ...rec, status: "revoked" };
    m.set(licenseKey, updated);
    this.persist();
    return updated;
  }

  /** All license records owned by a user (active + revoked). */
  getUserLicenses(userId: string): LicenseRecord[] {
    if (!userId) return [];
    return Array.from(this.ensureLoaded().values()).filter((r) => r.userId === userId);
  }

  /**
   * The blanket GATED_FEATURES keys a user holds via ACTIVE perpetual licenses.
   * Fed onto req.user.licenses by attachUserPlan; requireTier grants on membership.
   * Controller-scoped grants are NOT included here (use hasPostLicense).
   */
  grantedFeatures(userId: string): string[] {
    if (!userId) return [];
    const out = new Set<string>();
    for (const r of this.ensureLoaded().values()) {
      if (r.userId === userId && r.status === "active" && r.feature) out.add(r.feature);
    }
    return Array.from(out);
  }

  /** True if the user holds an ACTIVE perpetual post license for this controller. */
  hasPostLicense(userId: string, controller: string): boolean {
    if (!userId || !controller) return false;
    for (const r of this.ensureLoaded().values()) {
      if (r.userId === userId && r.status === "active" && r.product === "post_perpetual" && r.scope === controller) {
        return true;
      }
    }
    return false;
  }

  /** All records (admin surface). */
  listAll(): LicenseRecord[] {
    return Array.from(this.ensureLoaded().values());
  }

  /** Test/maintenance: force reload from disk on next access. */
  invalidate(): void {
    this.licenses = null;
  }
}

export const licenseStore = new LicenseStore();
