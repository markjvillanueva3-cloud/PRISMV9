/**
 * WebhookSubscriptionEngine — HMPI12 outbound webhook subscription registry.
 *
 * Pure-core: classify webhook subscriptions per safety tier — validates URL
 * scheme (https-only outside test mode), enforces per-tenant subscription
 * caps, and prevents duplicate (url, event) registrations.
 *
 * @module engines/WebhookSubscriptionEngine
 */

import { z } from "zod";

export const WebhookSubscriptionSchema = z.object({
  subscription_id: z.string().min(1).max(120),
  tenant_id: z.string().min(1).max(120),
  url: z.string().min(8).max(2000),
  event: z.string().min(1).max(120),
  active: z.boolean(),
  created_at: z.string(),
  test_mode: z.boolean().optional(),
});
export type WebhookSubscription = z.infer<typeof WebhookSubscriptionSchema>;

export interface SubscriptionVerdict {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class WebhookSubscriptionEngine {
  static readonly MAX_PER_TENANT = 50;

  static validate(s: unknown): WebhookSubscription { return WebhookSubscriptionSchema.parse(s); }

  /**
   * Validate a new subscription against an existing fleet.
   * Rejects: insecure scheme outside test mode, tenant cap exceeded, duplicate (url,event).
   */
  static checkAdd(existing: WebhookSubscription[], proposed: WebhookSubscription): SubscriptionVerdict {
    if (!Array.isArray(existing)) throw new Error("WebhookSubscription.checkAdd: existing must be array");
    const v = WebhookSubscriptionSchema.parse(proposed);
    const errors: string[] = [];
    const warnings: string[] = [];

    const scheme = v.url.split(":")[0]?.toLowerCase() ?? "";
    if (scheme !== "https" && scheme !== "http") errors.push(`unsupported scheme: ${scheme || "none"}`);
    if (scheme === "http" && !v.test_mode) errors.push("insecure http requires test_mode=true");

    const tenantCount = existing.filter((s) => s.tenant_id === v.tenant_id && s.active).length;
    if (tenantCount >= WebhookSubscriptionEngine.MAX_PER_TENANT) {
      errors.push(`tenant ${v.tenant_id} at cap ${WebhookSubscriptionEngine.MAX_PER_TENANT}`);
    }

    const dup = existing.find((s) => s.tenant_id === v.tenant_id && s.url === v.url && s.event === v.event && s.active);
    if (dup) errors.push(`duplicate active subscription (url+event) for tenant ${v.tenant_id}`);

    if (v.url.length > 500) warnings.push(`url length ${v.url.length} unusually long`);

    return { valid: errors.length === 0, errors, warnings };
  }

  static renderVerdict(v: SubscriptionVerdict): string {
    const tag = v.valid ? "[WEBHOOK OK]" : "[WEBHOOK REJECTED]";
    return `${tag} errors=${v.errors.length} warnings=${v.warnings.length}${v.errors.length ? " " + v.errors.join("; ") : ""}`;
  }
}

export const webhookSubscriptionEngine = WebhookSubscriptionEngine;
