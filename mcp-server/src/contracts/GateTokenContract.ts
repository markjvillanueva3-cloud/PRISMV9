/**
 * GateTokenContract — HMAC-signed phase gate attestation tokens
 *
 * Each phase emits a signed gate token upon completion. The next phase
 * verifies the predecessor token before starting. This creates a
 * cryptographic chain-of-trust across the milestone execution.
 *
 * @milestone LATHE-PROD-READY-MS0 U-LPR00d
 * @security HMAC-SHA256 with KMS-derived keys; constant-time comparison
 */

import { createHmac, timingSafeEqual } from "crypto";

export interface GateToken {
  phase_id: string;
  milestone_id: string;
  timestamp: string;
  exit_conditions: ExitCondition[];
  attestation_hash: string;
  signature: string;
  key_id: string;
  emitter: string;
  schema_version: number;
}

export interface ExitCondition {
  id: string;
  description: string;
  status: "PASS" | "FAIL" | "SKIP";
  evidence?: string[];
  value?: number | string | boolean;
  threshold?: number | string;
}

export interface GateTokenVerificationResult {
  valid: boolean;
  phase_id: string;
  errors: string[];
  warnings: string[];
  verified_at: string;
}

const SCHEMA_VERSION = 1;
const HASH_ALGORITHM = "sha256";

export class GateTokenEmitter {
  private keyId: string;
  private secretKey: Buffer;

  constructor(keyId: string, secretKey: string | Buffer) {
    this.keyId = keyId;
    this.secretKey = typeof secretKey === "string"
      ? Buffer.from(secretKey, "hex")
      : secretKey;
  }

  /**
   * Emit a signed gate token for a completed phase
   */
  emit(
    milestoneId: string,
    phaseId: string,
    exitConditions: ExitCondition[],
    emitter: string = "claude-code"
  ): GateToken {
    const timestamp = new Date().toISOString();

    // Create canonical JSON for hashing (sorted keys, no whitespace)
    const canonicalPayload = this.canonicalize({
      milestone_id: milestoneId,
      phase_id: phaseId,
      timestamp,
      exit_conditions: exitConditions,
      emitter,
      schema_version: SCHEMA_VERSION,
    });

    // Generate attestation hash (integrity)
    const attestationHash = this.hash(canonicalPayload);

    // Generate HMAC signature (authentication)
    const signature = this.sign(attestationHash);

    return {
      phase_id: phaseId,
      milestone_id: milestoneId,
      timestamp,
      exit_conditions: exitConditions,
      attestation_hash: attestationHash,
      signature,
      key_id: this.keyId,
      emitter,
      schema_version: SCHEMA_VERSION,
    };
  }

  /**
   * Verify a gate token's signature and integrity
   */
  verify(token: GateToken): GateTokenVerificationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check schema version
    if (token.schema_version !== SCHEMA_VERSION) {
      warnings.push(`Schema version mismatch: expected ${SCHEMA_VERSION}, got ${token.schema_version}`);
    }

    // Check key_id matches
    if (token.key_id !== this.keyId) {
      errors.push(`Key ID mismatch: expected ${this.keyId}, got ${token.key_id}`);
    }

    // Recreate canonical payload
    const canonicalPayload = this.canonicalize({
      milestone_id: token.milestone_id,
      phase_id: token.phase_id,
      timestamp: token.timestamp,
      exit_conditions: token.exit_conditions,
      emitter: token.emitter,
      schema_version: token.schema_version,
    });

    // Verify attestation hash (integrity)
    const expectedHash = this.hash(canonicalPayload);
    if (token.attestation_hash !== expectedHash) {
      errors.push("Attestation hash mismatch — token may have been tampered with");
    }

    // Verify HMAC signature (authentication) using constant-time comparison
    const expectedSignature = this.sign(token.attestation_hash);
    const signatureValid = this.constantTimeCompare(token.signature, expectedSignature);
    if (!signatureValid) {
      errors.push("HMAC signature invalid — token not authentic");
    }

    // Check all exit conditions passed
    const failedConditions = token.exit_conditions.filter(c => c.status === "FAIL");
    if (failedConditions.length > 0) {
      errors.push(`${failedConditions.length} exit condition(s) failed: ${failedConditions.map(c => c.id).join(", ")}`);
    }

    return {
      valid: errors.length === 0,
      phase_id: token.phase_id,
      errors,
      warnings,
      verified_at: new Date().toISOString(),
    };
  }

  /**
   * Check if all required predecessor tokens are present and valid
   */
  verifyChain(
    tokens: GateToken[],
    requiredPhases: string[]
  ): { valid: boolean; missing: string[]; invalid: string[] } {
    const tokenMap = new Map(tokens.map(t => [t.phase_id, t]));
    const missing: string[] = [];
    const invalid: string[] = [];

    for (const phaseId of requiredPhases) {
      const token = tokenMap.get(phaseId);
      if (!token) {
        missing.push(phaseId);
      } else {
        const result = this.verify(token);
        if (!result.valid) {
          invalid.push(phaseId);
        }
      }
    }

    return {
      valid: missing.length === 0 && invalid.length === 0,
      missing,
      invalid,
    };
  }

  private canonicalize(obj: object): string {
    return JSON.stringify(obj, Object.keys(obj).sort());
  }

  private hash(data: string): string {
    return createHmac(HASH_ALGORITHM, "attestation")
      .update(data)
      .digest("hex");
  }

  private sign(data: string): string {
    return createHmac(HASH_ALGORITHM, this.secretKey)
      .update(data)
      .digest("hex");
  }

  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}

// Singleton factory for milestone-scoped emitters
const emitterCache = new Map<string, GateTokenEmitter>();

export function getGateTokenEmitter(milestoneId: string, keyId: string, secretKey: string | Buffer): GateTokenEmitter {
  const cacheKey = `${milestoneId}:${keyId}`;
  let emitter = emitterCache.get(cacheKey);
  if (!emitter) {
    emitter = new GateTokenEmitter(keyId, secretKey);
    emitterCache.set(cacheKey, emitter);
  }
  return emitter;
}

export const gateTokenContract = {
  GateTokenEmitter,
  getGateTokenEmitter,
  SCHEMA_VERSION,
};
