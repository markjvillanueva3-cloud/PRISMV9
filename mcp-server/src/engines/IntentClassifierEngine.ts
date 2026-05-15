/**
 * IntentClassifierEngine — KAR-MS5 U-KAR52
 *
 * Extends TaskAgentClassifier for PUOA tier routing. Classifies natural language
 * intents into:
 *   - Execution tier (single_dispatcher, multi_domain, full_chain)
 *   - Manufacturing domains
 *   - Complexity level
 *   - Recommended orchestrators
 *
 * Uses keyword matching, pattern recognition, and context analysis to route
 * tasks to the appropriate PUOA execution path.
 *
 * @version 1.0.0
 * @date 2026-04-14
 */
// WIRE-EXEMPT: invoked directly by PRISMUnifiedOrchestratorEngine.ts + CADFailureTriageEngine.ts via static-method static API — no dispatcher action surface needed. Routing classifier, not a tool.
import { classifyTask, } from "./TaskAgentClassifier.js";
// ============================================================================
// INTENT PATTERNS
// ============================================================================
/** Patterns that indicate specific intent categories */
const CATEGORY_PATTERNS = {
    query: [
        /^(what|which|who|where|when|how|why|is|are|does|do|can|show|list|get|find|lookup)/i,
        /\?$/,
    ],
    calculate: [
        /^(calculate|compute|determine|figure out|solve|find the)/i,
        /(force|speed|feed|mrr|power|torque|stress|deflection|temperature)/i,
    ],
    optimize: [
        /^(optimize|improve|maximize|minimize|best|optimal|tune)/i,
        /(cost|efficiency|performance|productivity|quality)/i,
    ],
    validate: [
        /^(validate|verify|check|confirm|ensure|test)/i,
        /(safe|valid|correct|within|limits)/i,
    ],
    generate: [
        /^(generate|create|produce|make|build|write|draft)/i,
        /(gcode|program|toolpath|report|quote)/i,
    ],
    troubleshoot: [
        /^(troubleshoot|diagnose|debug|fix|repair|resolve|why is)/i,
        /(error|alarm|fault|problem|issue|failing|broken)/i,
    ],
    compare: [
        /^(compare|contrast|difference|versus|vs|between)/i,
        /(better|worse|faster|cheaper|stronger)/i,
    ],
    plan: [
        /^(plan|schedule|organize|sequence|order|prioritize)/i,
        /(steps|phases|stages|timeline|roadmap)/i,
    ],
    execute: [
        /^(run|execute|start|begin|perform|do|apply)/i,
        /(now|immediately|action)/i,
    ],
    unknown: [],
};
/** Domain-specific keywords for entity extraction */
const ENTITY_PATTERNS = {
    material: /\b(steel|aluminum|titanium|carbide|hss|cobalt|inconel|hastelloy|copper|brass|bronze|plastic|wood|graphite|ceramic|\d{4}\s*(?:steel|al|ti)|[ahdms][1-9]\d?|4140|1018|6061|7075)\b/gi,
    machine: /\b(okuma|haas|mazak|dmg|mori|hurco|fanuc|brother|makino|matsuura|roku.?roku|mitsubishi|lathe|mill|cnc|vmc|hmc|turn|grind|edm|wire|sinker)\b/gi,
    tool: /\b(endmill|drill|tap|insert|carbide|hss|coated|uncoated|ball.?nose|flat|corner.?radius|chamfer|spot|center|reamer|boring.?bar|face.?mill)\b/gi,
    operation: /\b(mill|turn|drill|bore|tap|thread|face|contour|pocket|slot|profile|rough|finish|semi.?finish|hsm|adaptive|trochoidal)\b/gi,
    parameter: /\b(speed|feed|rpm|sfm|ipm|mmpm|doc|woc|stepover|stepdown|chip.?load|mrr|ae|ap|fz|vc|n)\b/gi,
    value: /\b(\d+(?:\.\d+)?)\b/g,
    unit: /\b(mm|in|inch|m\/min|ft\/min|sfm|ipm|mmpm|rpm|hp|kw|nm|lb|kg|mpa|ksi|hrc|hb|ra|rms)\b/gi,
};
/** Tier escalation triggers */
const TIER_ESCALATION_KEYWORDS = {
    single_dispatcher: ["get", "list", "show", "what is", "lookup", "find"],
    multi_domain: ["compare", "analyze", "cross", "both", "multiple", "and also"],
    full_chain: ["optimize", "complete", "full", "end to end", "workflow", "critical", "safety"],
};
// ============================================================================
// ENGINE
// ============================================================================
export class IntentClassifierEngine {
    // ── Main Classification ────────────────────────────────────────
    /**
     * Classify a natural language intent for PUOA routing.
     *
     * @param intent Raw intent string from user
     * @param context Optional context for disambiguation
     * @returns Full intent classification with AI reasoning metadata
     */
    classify(intent: any, context: any) {
        const normalized = this.normalizeIntent(intent);
        const categoryResult = this.detectCategoryWithScores(normalized);
        const category = categoryResult.category;
        const entities = this.extractEntities(intent);
        const domains = this.detectDomains(normalized, entities);
        const complexity = this.assessComplexity(normalized, domains, entities);
        const tier = this.determineTier(normalized, domains, complexity, category);
        const orchestrators = this.recommendOrchestrators(domains, category, complexity);
        const authorityHints = this.suggestAuthoritySources(category, domains);
        const confidence = this.calculateConfidence(category, domains, entities);
        // Build AI reasoning metadata
        const aiReasoning = this.buildAIReasoning(normalized, categoryResult, tier, domains, complexity, confidence);
        return {
            intent,
            normalized_intent: normalized,
            tier,
            domains,
            primary_domain: domains[0] || "general",
            complexity,
            confidence,
            recommended_orchestrators: orchestrators,
            authority_hints: authorityHints,
            category,
            entities,
            reasoning: this.buildReasoning(tier, domains, complexity, category, confidence),
            ai_reasoning: aiReasoning,
        };
    }
    /**
     * Quick classification for high-volume use cases.
     * Returns minimal routing information.
     */
    quickClassify(intent: any) {
        const normalized = this.normalizeIntent(intent);
        const category = this.detectCategory(normalized);
        const entities = this.extractEntities(intent);
        const domains = this.detectDomains(normalized, entities);
        const complexity = this.assessComplexity(normalized, domains, entities);
        const tier = this.determineTier(normalized, domains, complexity, category);
        return {
            tier,
            primary_domain: domains[0] || "general",
            complexity,
            category,
        };
    }
    // ── Intent Normalization ───────────────────────────────────────
    /**
     * Normalize intent for consistent processing.
     */
    normalizeIntent(intent: any) {
        return intent
            .toLowerCase()
            .replace(/[^\w\s\d./%-]/g, " ") // Remove special chars except common ones
            .replace(/\s+/g, " ") // Collapse whitespace
            .trim();
    }
    // ── Category Detection ─────────────────────────────────────────
    /**
     * Detect the intent category from text patterns.
     * Returns both the category and full scores for ambiguity detection.
     */
    detectCategory(normalized: any) {
        const result = this.detectCategoryWithScores(normalized);
        return result.category;
    }
    /**
     * Detect category with full scoring details for AI reasoning.
     */
    detectCategoryWithScores(normalized: any) {
        const scores: Record<string, number> = {
            query: 0,
            calculate: 0,
            optimize: 0,
            validate: 0,
            generate: 0,
            troubleshoot: 0,
            compare: 0,
            plan: 0,
            execute: 0,
            unknown: 0,
        };
        for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
            for (const pattern of patterns) {
                if (pattern.test(normalized)) {
                    scores[category] += 1;
                }
            }
        }
        // Find highest scoring categories
        const sortedCategories = Object.entries(scores)
            .filter(([, score]) => score > 0)
            .sort((a, b) => b[1] - a[1]);
        const maxCategory = sortedCategories[0]?.[0] || "unknown";
        const maxScore = sortedCategories[0]?.[1] || 0;
        // Detect ambiguity: multiple categories with same or near-same score
        const tiedCategories = sortedCategories
            .filter(([, score]) => score === maxScore && score > 0)
            .map(([cat]) => cat);
        const gap = sortedCategories.length > 1
            ? maxScore - sortedCategories[1][1]
            : maxScore;
        return {
            category: maxCategory,
            scores,
            ambiguity: {
                detected: tiedCategories.length > 1 || (gap <= 1 && sortedCategories.length > 1),
                tied_categories: tiedCategories.length > 1 ? tiedCategories : [],
                gap,
            },
        };
    }
    // ── Entity Extraction ──────────────────────────────────────────
    /**
     * Extract domain entities from intent text.
     */
    extractEntities(intent: any) {
        const entities = [];
        for (const [type, pattern] of Object.entries(ENTITY_PATTERNS)) {
            // Reset regex lastIndex
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(intent)) !== null) {
                entities.push({
                    type: type,
                    value: match[0],
                    position: { start: match.index, end: match.index + match[0].length },
                    confidence: 0.85,
                });
            }
        }
        // Sort by position
        return entities.sort((a, b) => a.position.start - b.position.start);
    }
    // ── Domain Detection ───────────────────────────────────────────
    /**
     * Detect manufacturing domains from normalized intent and entities.
     */
    detectDomains(normalized: any, entities: any) {
        const domains = new Set();
        // Entity-based domain detection
        for (const entity of entities) {
            switch (entity.type) {
                case "material":
                    domains.add("materials");
                    break;
                case "machine":
                    domains.add("machines");
                    break;
                case "tool":
                    domains.add("tooling");
                    break;
                case "operation":
                    domains.add("machining");
                    break;
            }
        }
        // Keyword-based domain detection
        const DOMAIN_KEYWORDS = {
            materials: ["material", "steel", "aluminum", "hardness", "alloy", "grade"],
            machines: ["machine", "spindle", "axis", "cnc", "controller"],
            tooling: ["tool", "insert", "endmill", "drill", "holder"],
            machining: ["cutting", "milling", "turning", "speed", "feed"],
            physics: ["force", "stress", "deflection", "thermal", "vibration"],
            safety: ["collision", "crash", "breakage", "safety", "limit"],
            quality: ["surface", "finish", "tolerance", "roughness", "inspection"],
            cam: ["toolpath", "gcode", "post", "program", "strategy"],
            threading: ["thread", "tap", "pitch", "helix"],
            edm: ["edm", "sinker", "wire", "electrode"],
            grinding: ["grinding", "wheel", "abrasive"],
            quoting: ["quote", "cost", "price", "estimate"],
        };
        for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
            if (keywords.some(kw => normalized.includes(kw))) {
                domains.add(domain);
            }
        }
        return domains.size > 0 ? Array.from(domains) : ["general"];
    }
    // ── Complexity Assessment ──────────────────────────────────────
    /**
     * Assess task complexity from intent, domains, and entities.
     */
    assessComplexity(normalized: any, domains: any, entities: any) {
        // Critical indicators
        if (/critical|safety|collision|crash|emergency|breakage/.test(normalized)) {
            return "critical";
        }
        // Safety domain escalates to critical
        if (domains.includes("safety") && domains.includes("physics")) {
            return "critical";
        }
        // Complex indicators
        if (/optimize|multi|complete|full|end.?to.?end|workflow|compare/.test(normalized)) {
            return "complex";
        }
        // Multi-domain complexity
        if (domains.length >= 3)
            return "complex";
        if (domains.length >= 2)
            return "moderate";
        // Entity-based complexity
        if (entities.length > 5)
            return "complex";
        if (entities.length > 2)
            return "moderate";
        // Simple indicators
        if (/^(what|get|list|show|find)\b/.test(normalized)) {
            return "simple";
        }
        return "moderate";
    }
    // ── Tier Determination ─────────────────────────────────────────
    /**
     * Determine the PUOA execution tier.
     */
    determineTier(normalized: any, domains: any, complexity: any, category: any) {
        // Critical always goes to full_chain
        if (complexity === "critical") {
            return "full_chain";
        }
        // Check explicit tier keywords
        for (const [tier, keywords] of Object.entries(TIER_ESCALATION_KEYWORDS)) {
            if (keywords.some(kw => normalized.includes(kw))) {
                // Don't demote from multi_domain based on simple keywords
                if (tier === "single_dispatcher" && domains.length >= 2) {
                    continue;
                }
                return tier;
            }
        }
        // Category-based routing
        if (category === "query" && complexity === "simple") {
            return "single_dispatcher";
        }
        if (category === "optimize" || category === "plan") {
            return "full_chain";
        }
        // Domain-based routing
        if (domains.length >= 3) {
            return "full_chain";
        }
        if (domains.length >= 2) {
            return "multi_domain";
        }
        // Complexity-based routing
        if (complexity === "complex") {
            return "multi_domain";
        }
        return "single_dispatcher";
    }
    // ── Orchestrator Recommendations ───────────────────────────────
    /**
     * Recommend orchestrators based on domains and category.
     */
    recommendOrchestrators(domains: any, category: any, complexity: any) {
        const recommendations = [];
        const DOMAIN_ORCHESTRATORS = {
            materials: { id: "materials-orchestrator", name: "Materials Analysis Orchestrator" },
            machines: { id: "machines-orchestrator", name: "Machine Selection Orchestrator" },
            tooling: { id: "tooling-orchestrator", name: "Tool Selection Orchestrator" },
            machining: { id: "speed-feed-orchestrator", name: "Speed & Feed Orchestrator" },
            physics: { id: "physics-orchestrator", name: "Physics Calculation Orchestrator" },
            safety: { id: "safety-orchestrator", name: "Safety Validation Orchestrator" },
            quality: { id: "quality-orchestrator", name: "Quality Analysis Orchestrator" },
            cam: { id: "cam-orchestrator", name: "CAM Strategy Orchestrator" },
            threading: { id: "threading-orchestrator", name: "Threading Orchestrator" },
            edm: { id: "edm-orchestrator", name: "EDM Process Orchestrator" },
            grinding: { id: "grinding-orchestrator", name: "Grinding Process Orchestrator" },
            quoting: { id: "quoting-orchestrator", name: "Quote Generation Orchestrator" },
        };
        for (const domain of domains) {
            const orch = (DOMAIN_ORCHESTRATORS as Record<string, { id: string; name: string }>)[domain];
            if (orch) {
                recommendations.push({
                    orchestrator_id: orch.id,
                    name: orch.name,
                    domain,
                    confidence: domain === domains[0] ? 0.90 : 0.75,
                    reason: `Primary orchestrator for ${domain} domain`,
                });
            }
        }
        // Add validation orchestrator for complex/critical
        if (complexity === "complex" || complexity === "critical") {
            recommendations.push({
                orchestrator_id: "validation-orchestrator",
                name: "Result Validation Orchestrator",
                domain: "validation",
                confidence: 0.85,
                reason: `${complexity} task requires validation`,
            });
        }
        return recommendations.slice(0, 5);
    }
    // ── Authority Source Hints ─────────────────────────────────────
    /**
     * Suggest authority sources based on category and domains.
     */
    suggestAuthoritySources(category: any, domains: any) {
        const sources = [];
        // Category-based suggestions
        switch (category) {
            case "calculate":
            case "validate":
                sources.push("physics", "registry");
                break;
            case "optimize":
                sources.push("proven", "machine_intel");
                break;
            case "troubleshoot":
                sources.push("tribal", "oem");
                break;
            case "generate":
                sources.push("registry", "proven");
                break;
            default:
                sources.push("registry");
        }
        // Domain-based suggestions
        if (domains.includes("safety")) {
            sources.unshift("user"); // User authority for safety
        }
        if (domains.includes("materials") || domains.includes("tooling")) {
            if (!sources.includes("oem"))
                sources.push("oem");
        }
        // Deduplicate
        return Array.from(new Set(sources));
    }
    // ── Confidence Calculation ─────────────────────────────────────
    /**
     * Calculate classification confidence.
     */
    calculateConfidence(category: any, domains: any, entities: any) {
        let confidence = 0.5; // Base confidence
        // Category clarity boost
        if (category !== "unknown") {
            confidence += 0.15;
        }
        // Domain detection boost
        if (domains.length > 0 && domains[0] !== "general") {
            confidence += 0.10;
        }
        // Entity extraction boost
        if (entities.length > 0) {
            confidence += Math.min(entities.length * 0.05, 0.20);
        }
        // Cap at 0.95
        return Math.min(confidence, 0.95);
    }
    // ── Reasoning Builder ──────────────────────────────────────────
    /**
     * Build human-readable reasoning for classification.
     */
    buildReasoning(tier: any, domains: any, complexity: any, category: any, confidence: any) {
        const parts = [];
        parts.push(`Category: ${category}`);
        parts.push(`Domains: [${domains.join(", ")}]`);
        parts.push(`Complexity: ${complexity}`);
        parts.push(`→ Tier: ${tier}`);
        parts.push(`(confidence: ${(confidence * 100).toFixed(0)}%)`);
        return parts.join(" | ");
    }
    // ── AI Reasoning Metadata Builder ──────────────────────────────
    /**
     * Build comprehensive AI reasoning metadata for decision transparency.
     */
    buildAIReasoning(normalized: any, categoryResult: any, tier: any, domains: any, complexity: any, confidence: any) {
        const { category, scores, ambiguity } = categoryResult;
        // Build decision trace
        const decisionTrace = [
            {
                step: "normalize",
                input: `"${normalized.slice(0, 50)}..."`,
                decision: "Lowercased, special chars removed, whitespace collapsed",
                confidence: 1.0,
            },
            {
                step: "category_detection",
                input: (Object.entries(scores) as [string, number][]).filter(([, s]) => s > 0).map(([c, s]) => `${c}:${s}`).join(", ") || "none",
                decision: `Selected ${category} (score: ${scores[category]})`,
                confidence: ambiguity.detected ? 0.6 : 0.9,
            },
            {
                step: "domain_detection",
                input: `${domains.length} domain(s) found`,
                decision: domains.length > 0 ? `Primary: ${domains[0]}` : "Fallback to general",
                confidence: domains[0] !== "general" ? 0.85 : 0.5,
            },
            {
                step: "complexity_assessment",
                input: `domains=${domains.length}, critical_keywords=${/critical|safety/.test(normalized)}`,
                decision: `Assessed as ${complexity}`,
                confidence: 0.8,
            },
            {
                step: "tier_routing",
                input: `complexity=${complexity}, domains=${domains.length}, category=${category}`,
                decision: `Routed to ${tier}`,
                confidence: confidence,
            },
        ];
        // Build alternate interpretations for ambiguous cases
        const alternates = [];
        if (ambiguity.detected) {
            for (const altCategory of ambiguity.tied_categories.filter((c: any) => c !== category)) {
                const altTier = this.determineTier(normalized, domains, complexity, altCategory);
                alternates.push({
                    category: altCategory,
                    tier: altTier,
                    confidence: confidence * 0.9,
                    reason: `Equally valid interpretation; would route to ${altTier}`,
                });
            }
        }
        // Second-best category if close
        const sortedScores = (Object.entries(scores) as [string, number][])
            .filter(([c, s]) => s > 0 && c !== category)
            .sort((a, b) => b[1] - a[1]);
        if (sortedScores.length > 0 && sortedScores[0][1] >= scores[category] - 1) {
            const [secondCat, secondScore] = sortedScores[0];
            if (!alternates.some(a => a.category === secondCat)) {
                const altTier = this.determineTier(normalized, domains, complexity, secondCat);
                alternates.push({
                    category: secondCat,
                    tier: altTier,
                    confidence: (secondScore / Math.max(scores[category], 1)) * confidence,
                    reason: `Near-tie (score gap: ${scores[category] - secondScore})`,
                });
            }
        }
        // Build counterfactual
        const counterfactual = this.buildCounterfactual(tier, domains, complexity);
        // Near-tie warning
        const nearTieWarning = ambiguity.detected
            ? `Ambiguous: ${ambiguity.tied_categories.join(" vs ")} scored equally (${scores[category]})`
            : (ambiguity.gap <= 1 && sortedScores.length > 0)
                ? `Near-tie: ${category} vs ${sortedScores[0][0]} (gap: ${ambiguity.gap})`
                : null;
        return {
            ambiguity_detected: ambiguity.detected,
            alternate_interpretations: alternates,
            calibration_source: "heuristic",
            decision_trace: decisionTrace,
            counterfactual,
            near_tie_warning: nearTieWarning,
        };
    }
    /**
     * Build counterfactual reasoning: what would change the tier.
     */
    buildCounterfactual(tier: any, domains: any, complexity: any) {
        switch (tier) {
            case "single_dispatcher":
                if (domains.length === 1) {
                    return "Would escalate to multi_domain if 2+ domains detected or complexity='complex'";
                }
                return "Would escalate to multi_domain if task involved multiple domains";
            case "multi_domain":
                if (domains.length === 2) {
                    return "Would escalate to full_chain if 3+ domains or 'critical' keyword detected";
                }
                if (complexity === "complex") {
                    return "Would de-escalate to single_dispatcher if only 1 domain and simpler category";
                }
                return "Would escalate to full_chain if safety-critical or 3+ domains";
            case "full_chain":
                return "Already at maximum tier; would de-escalate if safety keywords removed and domains < 3";
            default:
                return "No counterfactual available";
        }
    }
    // ── Integration with TaskAgentClassifier ───────────────────────
    /**
     * Get TaskAgentClassifier result and enhance with PUOA routing.
     * Bridges existing classification system with PUOA.
     */
    classifyWithAgentRecommendations(dispatcher: any, action: any, params: any) {
        const agentClassification = classifyTask(dispatcher, action, params);
        const intent = `${dispatcher}:${action}`;
        const puoaClassification = this.classify(intent, params);
        // Merge recommendations
        const enhancedOrchestrators = puoaClassification.recommended_orchestrators;
        // Add agent recommendations as orchestrators
        for (const agent of agentClassification.recommended_agents) {
            if (!enhancedOrchestrators.some(o => o.orchestrator_id === agent.agent_id)) {
                enhancedOrchestrators.push({
                    orchestrator_id: agent.agent_id,
                    name: agent.name,
                    domain: puoaClassification.primary_domain,
                    confidence: agent.confidence,
                    reason: agent.reason,
                });
            }
        }
        return {
            ...puoaClassification,
            recommended_orchestrators: enhancedOrchestrators.slice(0, 7),
            agent_classification: agentClassification,
        };
    }
}
export const intentClassifierEngine = new IntentClassifierEngine();
//# sourceMappingURL=IntentClassifierEngine.js.map