/**
 * PluginSandboxPolicyEngine — HMPI14 plugin sandbox policy evaluator.
 *
 * Pure-core: evaluates a plugin's requested capability set against a
 * safety-tier policy (shop_floor / dev / sandbox). Returns the granted
 * subset + denials + a verdict (allowed / partial / blocked).
 *
 * @module engines/PluginSandboxPolicyEngine
 */

import { z } from "zod";

export const SafetyTierSchema = z.enum(["shop_floor", "dev", "sandbox"]);
export type SafetyTier = z.infer<typeof SafetyTierSchema>;

export const CapabilitySchema = z.enum([
  "filesystem-read",
  "filesystem-write",
  "network",
  "process-spawn",
  "env-read",
  "env-write",
  "tool-call",
  "memory-read",
  "memory-write",
]);
export type Capability = z.infer<typeof CapabilitySchema>;

export const SandboxRequestSchema = z.object({
  plugin_id: z.string().min(1).max(120),
  tier: SafetyTierSchema,
  requested: z.array(CapabilitySchema).min(1).max(32),
});
export type SandboxRequest = z.infer<typeof SandboxRequestSchema>;

export interface PolicyVerdict {
  plugin_id: string;
  tier: SafetyTier;
  granted: Capability[];
  denied: Array<{ capability: Capability; reason: string }>;
  verdict: "allowed" | "partial" | "blocked";
}

/** Per-tier allowlist. shop_floor is the most restrictive (safety-critical default). */
const TIER_ALLOW: Record<SafetyTier, ReadonlySet<Capability>> = {
  shop_floor: new Set<Capability>([
    "filesystem-read",
    "tool-call",
    "memory-read",
  ]),
  dev: new Set<Capability>([
    "filesystem-read",
    "filesystem-write",
    "network",
    "tool-call",
    "memory-read",
    "memory-write",
    "env-read",
  ]),
  sandbox: new Set<Capability>([
    "filesystem-read",
    "filesystem-write",
    "network",
    "process-spawn",
    "env-read",
    "env-write",
    "tool-call",
    "memory-read",
    "memory-write",
  ]),
};

export class PluginSandboxPolicyEngine {
  static evaluate(req: SandboxRequest): PolicyVerdict {
    const v = SandboxRequestSchema.parse(req);
    const allow = TIER_ALLOW[v.tier];
    const granted: Capability[] = [];
    const denied: Array<{ capability: Capability; reason: string }> = [];
    const seen = new Set<Capability>();

    for (const cap of v.requested) {
      if (seen.has(cap)) continue;
      seen.add(cap);
      if (allow.has(cap)) granted.push(cap);
      else denied.push({ capability: cap, reason: `tier ${v.tier} disallows ${cap}` });
    }

    let verdict: PolicyVerdict["verdict"];
    if (denied.length === 0) verdict = "allowed";
    else if (granted.length === 0) verdict = "blocked";
    else verdict = "partial";

    return { plugin_id: v.plugin_id, tier: v.tier, granted, denied, verdict };
  }

  static renderVerdict(v: PolicyVerdict): string {
    return `[SANDBOX ${v.verdict.toUpperCase()}] ${v.plugin_id} tier=${v.tier} granted=${v.granted.length} denied=${v.denied.length}`;
  }
}

export const pluginSandboxPolicyEngine = PluginSandboxPolicyEngine;
