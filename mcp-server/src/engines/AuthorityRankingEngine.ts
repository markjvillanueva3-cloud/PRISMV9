/**
 * AuthorityRankingEngine — KAR-MS5 U-KAR55
 *
 * Implements authority ranking for PUOA conflict resolution:
 *   User > Proven > MachineIntel > OEM > Registry > Physics > Tribal
 *
 * Authority ranking determines which knowledge source wins when multiple
 * sources provide conflicting information. This is critical for manufacturing
 * where shop floor experience may override theoretical calculations.
 *
 * @version 1.0.0
 * @date 2026-04-14
 */
// ============================================================================
// CONSTANTS
// ============================================================================
/**
 * Default authority rankings.
 * Higher number = higher priority.
 */
export const DEFAULT_AUTHORITY_RANKS = {
    canonical: 11,
    user: 10,
    proven: 9,
    machine_intel: 8,
    manufacturer: 7.5,
    oem: 7,
    handbook: 6.5,
    registry: 6,
    academic: 5.5,
    physics: 5,
    expert: 4.5,
    tribal: 4,
    inferred: 3,
    social: 2,
    unknown: 0,
};
/**
 * Safety-critical fields that require elevated authority.
 */
const SAFETY_CRITICAL_FIELDS = new Set([
    "max_speed",
    "max_force",
    "max_torque",
    "collision_limit",
    "breakage_threshold",
    "thermal_limit",
    "spindle_power",
    "rapid_feed_limit",
]);
// ============================================================================
// ENGINE
// ============================================================================
export class AuthorityRankingEngine {
    ranks;
    config;
    constructor(config?: any) {
        this.config = config || {};
        this.ranks = {
            ...DEFAULT_AUTHORITY_RANKS,
            ...config?.rank_overrides,
        };
    }
    // ── Ranking Queries ────────────────────────────────────────────
    /**
     * Get the rank for an authority source.
     */
    getRank(source: any) {
        return this.ranks[source] ?? 0;
    }
    /**
     * Compare two authority sources.
     * Returns positive if a > b, negative if a < b, zero if equal.
     */
    compare(a: any, b: any) {
        return this.ranks[a] - this.ranks[b];
    }
    /**
     * Check if source A has higher authority than source B.
     */
    hasHigherAuthority(a: any, b: any) {
        return this.ranks[a] > this.ranks[b];
    }
    /**
     * Get authority sources sorted by rank (highest first).
     */
    getSortedSources() {
        return Object.entries(this.ranks)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .map(([source]) => source);
    }
    /**
     * Get the PUOA hierarchy (7 core sources).
     */
    getPUOAHierarchy() {
        return ["user", "proven", "machine_intel", "oem", "registry", "physics", "tribal"];
    }
    // ── Conflict Resolution ────────────────────────────────────────
    /**
     * Resolve a conflict between multiple authority claims.
     *
     * Resolution order:
     * 1. Locked sources cannot be overridden
     * 2. Safety-critical fields require physics/canonical minimum
     * 3. Higher rank wins
     * 4. Equal rank: higher confidence wins
     * 5. Equal confidence: most recent wins
     */
    resolve(claims: any, field: any) {
        if (claims.length === 0) {
            throw new Error("Cannot resolve with no claims");
        }
        if (claims.length === 1) {
            return {
                winner: claims[0],
                loser_claims: [],
                resolution_method: "rank",
                explanation: `Single claim from ${claims[0].source}`,
                rank_delta: 0,
                confidence_delta: 0,
                ai_reasoning: this.buildSingleClaimReasoning(claims[0]),
            };
        }
        // Filter by minimum confidence
        const minConf = this.config.min_confidence || 0;
        const validClaims = claims.filter((c: any) => c.confidence >= minConf);
        if (validClaims.length === 0) {
            // Fall back to highest confidence regardless of threshold
            validClaims.push(...claims);
        }
        // Sort by rank, then confidence, then recency
        const sorted = [...validClaims].sort((a, b) => {
            const rankDiff = this.ranks[b.source] - this.ranks[a.source];
            if (rankDiff !== 0)
                return rankDiff;
            const confDiff = b.confidence - a.confidence;
            if (confDiff !== 0)
                return confDiff;
            // Recency (if timestamps available)
            if (a.timestamp && b.timestamp) {
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            }
            return 0;
        });
        // Check for locked sources
        const lockedSources = this.config.locked_sources || [];
        const lockedClaim = sorted.find(c => lockedSources.includes(c.source));
        if (lockedClaim) {
            const loserClaims = sorted.filter(c => c !== lockedClaim);
            return {
                winner: lockedClaim,
                loser_claims: loserClaims,
                resolution_method: "locked",
                explanation: `Source ${lockedClaim.source} is locked and cannot be overridden`,
                rank_delta: 0,
                confidence_delta: 0,
                ai_reasoning: this.buildLockedReasoning(lockedClaim, loserClaims),
            };
        }
        // Check safety-critical override
        if (field && SAFETY_CRITICAL_FIELDS.has(field)) {
            const safetyClaim = sorted.find(c => c.source === "physics" || c.source === "canonical" || c.source === "oem");
            if (safetyClaim && !this.config.allow_user_override_safety) {
                const userClaim = sorted.find(c => c.source === "user");
                if (userClaim && sorted[0] === userClaim) {
                    // User tried to override safety — defer to physics/canonical
                    const loserClaims = sorted.filter(c => c !== safetyClaim);
                    return {
                        winner: safetyClaim,
                        loser_claims: loserClaims,
                        resolution_method: "safety_override",
                        explanation: `Safety-critical field ${field}: user override blocked, using ${safetyClaim.source}`,
                        rank_delta: this.ranks[safetyClaim.source] - this.ranks["user"],
                        confidence_delta: safetyClaim.confidence - (userClaim?.confidence || 0),
                        ai_reasoning: this.buildSafetyOverrideReasoning(safetyClaim, userClaim, loserClaims, field),
                    };
                }
            }
        }
        const winner = sorted[0];
        const loserClaims = sorted.slice(1);
        const secondBest = loserClaims[0];
        // Calculate weighted scores for all claims
        const weightedScores = validClaims.map((c: any) => ({
            source: c.source,
            raw_rank: this.ranks[c.source],
            confidence: c.confidence,
            effective_score: this.ranks[c.source] * (0.5 + 0.5 * c.confidence),
        })).sort((a: any, b: any) => b.effective_score - a.effective_score);
        // Check if weighted scoring changes the outcome
        const weightedWinner = weightedScores[0];
        const useWeighted = weightedWinner.source !== winner.source;
        // Determine resolution method
        let method = useWeighted ? "weighted" : "rank";
        if (!useWeighted && secondBest && this.ranks[winner.source] === this.ranks[secondBest.source]) {
            method = winner.confidence > secondBest.confidence ? "confidence" : "recency";
        }
        // Build AI reasoning
        const aiReasoning = this.buildAIReasoning(validClaims, winner, loserClaims, weightedScores);
        return {
            winner,
            loser_claims: loserClaims,
            resolution_method: method,
            explanation: this.buildExplanation(winner, secondBest, method),
            rank_delta: secondBest ? this.ranks[winner.source] - this.ranks[secondBest.source] : 0,
            confidence_delta: secondBest ? winner.confidence - secondBest.confidence : 0,
            ai_reasoning: aiReasoning,
        };
    }
    /**
     * Resolve multiple conflicts at once.
     */
    resolveBulk(conflicts: any) {
        const resolutions = [];
        let resolvedByRank = 0;
        let resolvedByConfidence = 0;
        let safetyOverrides = 0;
        const sourcesUsed = new Set<string>();
        for (const conflict of conflicts) {
            const resolution = this.resolve(conflict.claims, conflict.field);
            const isSafetyCritical = SAFETY_CRITICAL_FIELDS.has(conflict.field);
            resolutions.push({
                field: conflict.field,
                claims: conflict.claims,
                resolution,
                is_safety_critical: isSafetyCritical,
            });
            sourcesUsed.add(resolution.winner.source);
            switch (resolution.resolution_method) {
                case "rank":
                case "locked":
                    resolvedByRank++;
                    break;
                case "confidence":
                case "recency":
                    resolvedByConfidence++;
                    break;
                case "safety_override":
                    safetyOverrides++;
                    break;
            }
        }
        // Find highest authority source used
        const sortedUsed = Array.from(sourcesUsed).sort((a, b) => this.ranks[b] - this.ranks[a]);
        return {
            resolutions,
            total_conflicts: conflicts.length,
            resolved_by_rank: resolvedByRank,
            resolved_by_confidence: resolvedByConfidence,
            safety_overrides: safetyOverrides,
            highest_authority_used: sortedUsed[0] || "unknown",
        };
    }
    // ── Authority Validation ───────────────────────────────────────
    /**
     * Validate that a source has sufficient authority for an action.
     */
    validateAuthority(source: any, requiredMinimum: any) {
        const sourceRank = this.ranks[source];
        const requiredRank = this.ranks[requiredMinimum];
        if (sourceRank >= requiredRank) {
            return {
                valid: true,
                reason: `${source} (rank ${sourceRank}) meets minimum ${requiredMinimum} (rank ${requiredRank})`,
            };
        }
        return {
            valid: false,
            reason: `${source} (rank ${sourceRank}) below minimum ${requiredMinimum} (rank ${requiredRank})`,
        };
    }
    /**
     * Check if a source can modify safety-critical fields.
     */
    canModifySafety(source: any) {
        // Only canonical, physics, and oem can modify safety fields without override
        const safetyAuthorities = ["canonical", "physics", "oem"];
        return safetyAuthorities.includes(source);
    }
    // ── Claim Creation ─────────────────────────────────────────────
    /**
     * Create an authority claim.
     */
    createClaim(source: any, value: any, confidence: any, options: any) {
        return {
            source,
            value,
            confidence: Math.max(0, Math.min(1, confidence)), // Clamp 0-1
            timestamp: options?.timestamp || new Date().toISOString(),
            provenance: options?.provenance,
            metadata: options?.metadata,
        };
    }
    /**
     * Create a user override claim (highest authority).
     */
    createUserClaim(value: any, reason: any) {
        return this.createClaim("user", value, 1.0, {
            provenance: reason || "User explicit override",
        });
    }
    /**
     * Create a proven parameters claim.
     */
    createProvenClaim(value: any, confidence: any, machineId: any, programId: any) {
        return this.createClaim("proven", value, confidence, {
            provenance: `Proven on machine ${machineId || "unknown"}, program ${programId || "unknown"}`,
            metadata: { machine_id: machineId, program_id: programId },
        });
    }
    /**
     * Create a physics calculation claim.
     */
    createPhysicsClaim(value: any, confidence: any, formula: any, source: any) {
        return this.createClaim("physics", value, confidence, {
            provenance: `Calculated via ${formula}${source ? ` (${source})` : ""}`,
            metadata: { formula, calculation_source: source },
        });
    }
    // ── Configuration ──────────────────────────────────────────────
    /**
     * Update authority ranks.
     */
    setRanks(ranks: any) {
        this.ranks = { ...this.ranks, ...ranks };
    }
    /**
     * Reset to default ranks.
     */
    resetRanks() {
        this.ranks = { ...DEFAULT_AUTHORITY_RANKS };
    }
    /**
     * Get current configuration.
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update configuration.
     */
    setConfig(config: any) {
        this.config = { ...this.config, ...config };
        if (config.rank_overrides) {
            this.ranks = { ...DEFAULT_AUTHORITY_RANKS, ...config.rank_overrides };
        }
    }
    // ── Utility ────────────────────────────────────────────────────
    /**
     * Build human-readable explanation for resolution.
     */
    buildExplanation(winner: any, secondBest: any, method: any) {
        if (!secondBest) {
            return `${winner.source} is the only claim`;
        }
        switch (method) {
            case "rank":
                return `${winner.source} (rank ${this.ranks[winner.source]}) > ${secondBest.source} (rank ${this.ranks[secondBest.source]})`;
            case "confidence":
                return `${winner.source} confidence ${(winner.confidence * 100).toFixed(0)}% > ${secondBest.source} confidence ${(secondBest.confidence * 100).toFixed(0)}%`;
            case "recency":
                return `${winner.source} is more recent than ${secondBest.source}`;
            case "locked":
                return `${winner.source} is locked and cannot be overridden`;
            case "safety_override":
                return `Safety-critical: ${winner.source} enforced over user override`;
            default:
                return `${winner.source} selected`;
        }
    }
    /**
     * Check if a field is safety-critical.
     */
    isSafetyCritical(field: any) {
        return SAFETY_CRITICAL_FIELDS.has(field);
    }
    /**
     * Get all safety-critical fields.
     */
    getSafetyCriticalFields() {
        return Array.from(SAFETY_CRITICAL_FIELDS);
    }
    // ── AI Reasoning Builders ──────────────────────────────────────
    /**
     * Build AI reasoning for standard multi-claim resolution.
     */
    buildAIReasoning(claims: any, winner: any, loserClaims: any, weightedScores: any) {
        // Detect consensus: multiple sources agreeing on same value
        const consensus = this.detectConsensus(claims);
        // Near-tie warning
        const nearTieWarning = this.detectNearTie(winner, loserClaims);
        // Full loser analysis
        const fullLoserAnalysis = this.buildFullLoserAnalysis(loserClaims);
        // Counterfactual
        const counterfactual = this.buildCounterfactual(winner, loserClaims);
        // Decision trace
        const decisionTrace = [
            `Received ${claims.length} claims from: ${claims.map((c: any) => c.source).join(", ")}`,
            `Applied rank ordering: ${claims.map((c: any) => `${c.source}(${this.ranks[c.source]})`).join(" > ")}`,
            `Calculated weighted scores: ${weightedScores.slice(0, 3).map((w: any) => `${w.source}=${w.effective_score.toFixed(2)}`).join(", ")}`,
            `Winner: ${winner.source} with effective score ${weightedScores[0]?.effective_score.toFixed(2)}`,
        ];
        return {
            weighted_scores: weightedScores,
            near_tie_warning: nearTieWarning,
            full_loser_analysis: fullLoserAnalysis,
            consensus,
            counterfactual,
            decision_trace: decisionTrace,
        };
    }
    /**
     * Build AI reasoning for single claim (no conflict).
     */
    buildSingleClaimReasoning(claim: any) {
        return {
            weighted_scores: [{
                    source: claim.source,
                    raw_rank: this.ranks[claim.source],
                    confidence: claim.confidence,
                    effective_score: this.ranks[claim.source] * (0.5 + 0.5 * claim.confidence),
                }],
            near_tie_warning: null,
            full_loser_analysis: "No competing claims",
            consensus: null,
            counterfactual: "No conflict to resolve; single claim accepted",
            decision_trace: [`Single claim from ${claim.source} accepted without conflict`],
        };
    }
    /**
     * Build AI reasoning for locked source resolution.
     */
    buildLockedReasoning(winner: any, losers: any) {
        return {
            weighted_scores: [winner, ...losers].map(c => ({
                source: c.source,
                raw_rank: this.ranks[c.source],
                confidence: c.confidence,
                effective_score: this.ranks[c.source] * (0.5 + 0.5 * c.confidence),
            })),
            near_tie_warning: null,
            full_loser_analysis: losers.length > 0
                ? `Overridden by lock: ${losers.map((l: any) => `${l.source}(rank ${this.ranks[l.source]})`).join(", ")}`
                : "No competing claims",
            consensus: null,
            counterfactual: "Locked source cannot be overridden regardless of rank or confidence",
            decision_trace: [
                `Source ${winner.source} is locked`,
                `${losers.length} other claims ignored due to lock`,
            ],
        };
    }
    /**
     * Build AI reasoning for safety override.
     */
    buildSafetyOverrideReasoning(winner: any, userClaim: any, losers: any, field: any) {
        return {
            weighted_scores: [winner, userClaim, ...losers.filter((l: any) => l !== userClaim)].map(c => ({
                source: c.source,
                raw_rank: this.ranks[c.source],
                confidence: c.confidence,
                effective_score: this.ranks[c.source] * (0.5 + 0.5 * c.confidence),
            })),
            near_tie_warning: null,
            full_loser_analysis: `User override blocked for safety-critical field "${field}". User value: ${JSON.stringify(userClaim.value)}`,
            consensus: null,
            counterfactual: "User could override if allow_user_override_safety=true in config",
            decision_trace: [
                `Safety-critical field detected: ${field}`,
                `User claim with rank ${this.ranks["user"]} would normally win`,
                `Safety protocol enforces ${winner.source} for this field`,
                `User value ${JSON.stringify(userClaim.value)} → ${winner.source} value ${JSON.stringify(winner.value)}`,
            ],
        };
    }
    /**
     * Detect consensus among claims (3+ sources agreeing).
     */
    detectConsensus(claims: any) {
        if (claims.length < 3)
            return null;
        // Group claims by value (using JSON for comparison)
        const valueGroups = new Map();
        for (const claim of claims) {
            const key = JSON.stringify(claim.value);
            const sources = valueGroups.get(key) || [];
            sources.push(claim.source);
            valueGroups.set(key, sources);
        }
        // Find majority agreement
        const entries = Array.from(valueGroups.entries());
        for (const [valueKey, sources] of entries) {
            if (sources.length >= 3 || sources.length >= claims.length * 0.6) {
                return {
                    detected: true,
                    agreeing_sources: sources,
                    agreed_value: JSON.parse(valueKey),
                };
            }
        }
        return { detected: false, agreeing_sources: [] };
    }
    /**
     * Detect near-tie situations.
     */
    detectNearTie(winner: any, losers: any) {
        if (losers.length === 0)
            return null;
        const secondBest = losers[0];
        const rankDelta = this.ranks[winner.source] - this.ranks[secondBest.source];
        const confDelta = winner.confidence - secondBest.confidence;
        if (rankDelta === 0 && Math.abs(confDelta) < 0.1) {
            return `Near-tie: ${winner.source} vs ${secondBest.source} (rank equal, confidence gap ${(confDelta * 100).toFixed(1)}%)`;
        }
        if (rankDelta === 1 && secondBest.confidence > winner.confidence + 0.2) {
            return `Close call: ${secondBest.source} had higher confidence (${(secondBest.confidence * 100).toFixed(0)}%) but lower rank`;
        }
        return null;
    }
    /**
     * Build full analysis of all losing claims.
     */
    buildFullLoserAnalysis(losers: any) {
        if (losers.length === 0)
            return "No competing claims";
        const analyses = losers.map((l: any) => `${l.source}: rank ${this.ranks[l.source]}, conf ${(l.confidence * 100).toFixed(0)}%, value=${JSON.stringify(l.value)}`);
        return `${losers.length} claim(s) overridden: ${analyses.join("; ")}`;
    }
    /**
     * Build counterfactual reasoning.
     */
    buildCounterfactual(winner: any, losers: any) {
        if (losers.length === 0)
            return "No alternatives; single source accepted";
        const secondBest = losers[0];
        const rankDelta = this.ranks[winner.source] - this.ranks[secondBest.source];
        if (rankDelta === 0) {
            return `${secondBest.source} would win if confidence increased to ${(winner.confidence + 0.01) * 100}%`;
        }
        if (rankDelta === 1) {
            return `${secondBest.source} would win if ranked ${rankDelta + 1} higher (via rank_overrides config)`;
        }
        return `${secondBest.source} needs rank ${rankDelta} higher to compete with ${winner.source}`;
    }
}
export const authorityRankingEngine = new AuthorityRankingEngine();
