/**
 * PRISM MCP Server -- SubscriptionStore (U-COMM-03 keystone)
 *
 * Persisted user -> subscription mapping. This is the missing layer that made
 * entitlement enforcement dormant: tierGate.requireTier reads req.user.plan, but
 * nothing ever resolved a user's plan. attachUserPlan middleware reads from here.
 *
 * Design:
 *   - In-memory Map for synchronous getPlan() (middleware hot path).
 *   - Lazy load from disk on first access (sync readFileSync).
 *   - Writes via safeWriteSync (temp + rename).
 *   - FAIL LOUD on an existing-but-unreadable file -- never reset-then-clobber a
 *     populated store (lesson: reference_tribal_index_v8_string_cap clobber class).
 *
 * Source of truth for PLAN VALUES is config/pricing-registry.ts (Plan enum via
 * AuthEngineV7). This store only records WHICH plan each user is on.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { safeWriteSync } from "../utils/atomicWrite.js";
import type { Plan } from "./AuthEngineV7.js";

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "none";

export interface SubscriptionRecord {
  userId: string;
  plan: Plan;
  status: SubscriptionStatus;
  stripeCustomerId?: string;
  updatedAt: string;
}

interface StoreFile {
  schemaVersion: number;
  users: Record<string, SubscriptionRecord>;
}

const SCHEMA_VERSION = 1;
const VALID_PLANS: readonly Plan[] = ["free", "starter", "pro", "shop", "enterprise"];

function defaultPath(): string {
  return join(process.cwd(), "data", "state", "subscription-store.json");
}

export class SubscriptionStore {
  readonly engineName = "SubscriptionStore";
  readonly version = "1.0.0";

  private readonly path: string;
  private users: Map<string, SubscriptionRecord> | null = null;

  constructor(path?: string) {
    this.path = path ?? defaultPath();
  }

  /** Lazy load (sync). Throws on an existing-but-corrupt file (never silent reset). */
  private ensureLoaded(): Map<string, SubscriptionRecord> {
    if (this.users) return this.users;
    const m = new Map<string, SubscriptionRecord>();
    if (existsSync(this.path)) {
      let raw: string;
      try {
        raw = readFileSync(this.path, "utf-8");
      } catch (e) {
        throw new Error(`SubscriptionStore: cannot read existing store at ${this.path}: ${(e as Error).message}`);
      }
      let parsed: StoreFile;
      try {
        parsed = JSON.parse(raw) as StoreFile;
      } catch (e) {
        throw new Error(`SubscriptionStore: corrupt store at ${this.path} (refusing to reset-then-clobber): ${(e as Error).message}`);
      }
      if (parsed && parsed.users && typeof parsed.users === "object") {
        for (const [uid, rec] of Object.entries(parsed.users)) {
          if (rec && typeof rec === "object") m.set(uid, rec);
        }
      }
    }
    this.users = m;
    return m;
  }

  private persist(): void {
    const m = this.ensureLoaded();
    const file: StoreFile = {
      schemaVersion: SCHEMA_VERSION,
      users: Object.fromEntries(m),
    };
    safeWriteSync(this.path, JSON.stringify(file, null, 2));
  }

  /** The user's plan, defaulting to "free" for unknown/empty userId (fail safe). */
  getPlan(userId: string | undefined | null): Plan {
    if (!userId) return "free";
    const rec = this.ensureLoaded().get(userId);
    if (!rec) return "free";
    // ALLOWLIST (scrutiny P1): grant paid entitlements ONLY for an active/trialing
    // subscription. Any other status -- canceled, past_due, unpaid,
    // incomplete[_expired], paused, none, or an unknown Stripe status -- falls back
    // to free, so a non-paying state can never retain entitlements.
    const ENTITLED: readonly SubscriptionStatus[] = ["active", "trialing"];
    if (!ENTITLED.includes(rec.status)) return "free";
    return VALID_PLANS.includes(rec.plan) ? rec.plan : "free";
  }

  getRecord(userId: string): SubscriptionRecord | null {
    if (!userId) return null;
    return this.ensureLoaded().get(userId) ?? null;
  }

  /** Set/upgrade a user's plan. Throws on an unknown plan (fail loud). */
  setPlan(userId: string, plan: Plan, status: SubscriptionStatus = "active"): SubscriptionRecord {
    if (!userId) throw new Error("SubscriptionStore.setPlan: userId required");
    if (!VALID_PLANS.includes(plan)) throw new Error(`SubscriptionStore.setPlan: unknown plan "${plan}"`);
    const m = this.ensureLoaded();
    const existing = m.get(userId);
    const rec: SubscriptionRecord = {
      userId,
      plan,
      status,
      stripeCustomerId: existing?.stripeCustomerId,
      updatedAt: new Date().toISOString(),
    };
    m.set(userId, rec);
    this.persist();
    return rec;
  }

  /** Link a Stripe customer id to a user (for webhook -> user resolution). */
  linkCustomer(userId: string, stripeCustomerId: string): void {
    if (!userId || !stripeCustomerId) throw new Error("SubscriptionStore.linkCustomer: userId and stripeCustomerId required");
    const m = this.ensureLoaded();
    const existing = m.get(userId);
    const rec: SubscriptionRecord = existing
      ? { ...existing, stripeCustomerId, updatedAt: new Date().toISOString() }
      : { userId, plan: "free", status: "none", stripeCustomerId, updatedAt: new Date().toISOString() };
    m.set(userId, rec);
    this.persist();
  }

  /** Resolve the userId for a Stripe customer (webhook handler). */
  getUserIdByCustomer(stripeCustomerId: string): string | null {
    if (!stripeCustomerId) return null;
    for (const rec of this.ensureLoaded().values()) {
      if (rec.stripeCustomerId === stripeCustomerId) return rec.userId;
    }
    return null;
  }

  getStripeCustomerId(userId: string): string | null {
    return this.ensureLoaded().get(userId)?.stripeCustomerId ?? null;
  }

  /** All userIds with a subscription record (for the admin entitlement UI). */
  listUserIds(): string[] {
    return Array.from(this.ensureLoaded().keys());
  }

  /** Test/maintenance: force reload from disk on next access. */
  invalidate(): void {
    this.users = null;
  }
}

export const subscriptionStore = new SubscriptionStore();
