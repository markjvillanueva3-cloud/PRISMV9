/**
 * authSchema.ts -- Zod schemas for AuthEngineV7 wiring actions in prism_auth.
 *
 * Three new actions wired in U-INDIA-WIRE-4-UNWIRED:
 *   authenticate_v7  -- verify a JWT and return decoded TokenPayload
 *   authorize_v7     -- return TierLimits for a subscription plan (pure, no I/O)
 *   validate_scope_v7 -- hash or verify a password (scrypt, Node crypto)
 *
 * All schemas use .passthrough() so extra debug/metadata keys flow through.
 */

import { z } from "zod";

// ============================================================================
// authenticate_v7
// Verify a compact JWT token signed by AuthEngineV7 (HS256).
// Returns decoded TokenPayload: { userId, role, plan, email? }
// Throws jose errors on expiry / invalid signature -- dispatcher catches.
// ============================================================================

export const authenticate_v7 = z.object({
  token: z
    .string()
    .min(1)
    .describe(
      "Compact JWT access token (HS256, issued by authenticate_v7 / login). " +
      "Throws JWTExpired / JWSInvalid on bad input."
    ),
}).passthrough();

// ============================================================================
// authorize_v7
// Return the TierLimits for a given subscription plan.
// Pure -- no I/O, no side effects, always fast.
// Plans: free | starter | pro | shop | enterprise
// ============================================================================

export const authorize_v7 = z.object({
  plan: z
    .enum(["free", "starter", "pro", "shop", "enterprise"])
    .describe(
      "Subscription plan to fetch limits for. " +
      "Returns TierLimits: speed_feed_per_day, program_generate_per_day, " +
      "materials_count, machines_count, simulation, stochastic, api_access, etc."
    ),
}).passthrough();

// ============================================================================
// validate_scope_v7
// Hash a plaintext password (op='hash') or verify a plaintext vs stored hash
// (op='verify'). Uses scrypt (Node built-in crypto, 64-byte key, 16-byte salt).
// Stored hash format: '<saltHex>:<derivedKeyHex>'.
// ============================================================================

export const validate_scope_v7 = z.object({
  op: z
    .enum(["hash", "verify"])
    .describe(
      "'hash' -- hash plaintext; returns { hash } (saltHex:derivedKeyHex). " +
      "'verify' -- check plaintext against stored hash; returns { match: boolean }."
    ),
  password: z
    .string()
    .min(1)
    .describe("Plaintext password to hash or verify."),
  hash: z
    .string()
    .optional()
    .describe(
      "Stored scrypt hash (required when op='verify'). " +
      "Format: '<saltHex>:<derivedKeyHex>' as produced by op='hash'."
    ),
}).passthrough();

export const AUTH_V7_SCHEMAS = { authenticate_v7, authorize_v7, validate_scope_v7 } as const;
