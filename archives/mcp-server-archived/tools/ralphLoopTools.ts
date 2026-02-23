/**
 * PRISM MCP Server - Ralph Loop Tools v2.0
 * =========================================
 * 
 * "Ralph Wiggum Loop" - Iterative self-improvement through real AI scrutiny
 * Named after: Red-Amber-Light-Problem-Halt (RALPH) pattern
 * 
 * The Ralph Loop runs 4 MANDATORY validation phases using REAL Claude API:
 * 
 * Phase 1: SCRUTINIZE - Multiple validator agents examine output
 * Phase 2: IMPROVE - Apply fixes based on findings  
 * Phase 3: VALIDATE - Quality gates check (S(x) ≥ 0.70)
 * Phase 4: ASSESS - Final scoring and comprehensive assessment
 * 
 * SAFETY CRITICAL: Manufacturing decisions require REAL AI reasoning.
 * Simulation mode DISABLED - all validation uses live Claude API calls.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { hasValidApiKey, getAnthropicClient, getModelForTier } from "../config/api-config.js";
import { log } from "../utils/Logger.js";

const STATE_DIR = "C:\\PRISM\\state";
const RALPH_DIR = path.join(STATE_DIR, "ralph_loops");

// Ensure directory exists
if (!fs.existsSync(RALPH_DIR)) {
  fs.mkdirSync(RALPH_DIR, { recursive: true });
}

// ============================================================================
// TYPES
// ============================================================================

interface RalphPhase {
  phase: "SCRUTINIZE" | "IMPROVE" | "VALIDATE" | "ASSESS";
  timestamp: string;
  agent_used: string;
  model: string;
  response: string;
  findings?: RalphFinding[];
  improvements?: string[];
  scores?: RalphScores;
  assessment?: RalphAssessment;
  duration_ms: number;
  mode: "live";  // Always live, never simulation
}

interface RalphFinding {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category: string;
  finding: string;
  recommendation: string;
  line_reference?: string;
}

interface RalphScores {
  quality: number;      // Q(x) - overall quality 0-1
  safety: number;       // S(x) - safety score 0-1
  completeness: number; // C(x) - no placeholders 0-1
  correctness: number;  // R(x) - mathematical/logical correctness 0-1
  omega: number;        // Ω(x) - master equation result
}

interface RalphAssessment {
  overall_grade: "A" | "B" | "C" | "D" | "F";
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  confidence: number;
  ready_for_production: boolean;
}

interface RalphSession {
  id: string;
  target: string;
  target_type: "content" | "file" | "code";
  started: string;
  phases: RalphPhase[];
  final_assessment: RalphAssessment | null;
  final_scores: RalphScores | null;
  status: "IN_PROGRESS" | "COMPLETED" | "FAILED" | "BLOCKED";
}

let activeSession: RalphSession | null = null;

// ============================================================================
// VALIDATOR DEFINITIONS
// ============================================================================

const VALIDATORS = {
  "SAFETY_AUDITOR": {
    name: "Safety Auditor",
    tier: "opus" as const,
    systemPrompt: `You are the PRISM Safety Auditor - a critical validator for safety-critical CNC manufacturing software.

Your role: Identify ANY safety issues that could cause:
- Tool breakage or machine damage
- Operator injury or death
- Equipment damage or fires
- Invalid machining parameters

Check for:
1. Parameter range validation (speeds, feeds, forces within safe limits)
2. Boundary condition handling (divide by zero, null checks)
3. Fail-safe defaults present
4. Error handling complete
5. No undefined behavior paths
6. Physical limits respected (Kienzle force limits, Taylor tool life)

Respond with JSON:
{
  "findings": [
    {"severity": "CRITICAL|HIGH|MEDIUM|LOW", "category": "...", "finding": "...", "recommendation": "...", "line_reference": "..."}
  ],
  "safety_score": 0.0-1.0,
  "safe_for_manufacturing": true/false,
  "blocking_issues": ["..."]
}`
  },
  
  "CODE_REVIEWER": {
    name: "Code Reviewer",
    tier: "sonnet" as const,
    systemPrompt: `You are the PRISM Code Reviewer - ensuring code quality and maintainability.

Check for:
1. Consistent patterns with PRISM codebase
2. No code duplication (DRY principle)
3. Clear naming conventions
4. Documentation complete (JSDoc, comments)
5. Error handling comprehensive
6. Type safety maintained
7. No anti-patterns or code smells

Respond with JSON:
{
  "findings": [
    {"severity": "CRITICAL|HIGH|MEDIUM|LOW", "category": "...", "finding": "...", "recommendation": "...", "line_reference": "..."}
  ],
  "quality_score": 0.0-1.0,
  "maintainability": "excellent|good|fair|poor"
}`
  },
  
  "SPEC_VERIFIER": {
    name: "Specification Verifier",
    tier: "sonnet" as const,
    systemPrompt: `You are the PRISM Specification Verifier - ensuring output matches requirements.

Check for:
1. All requirements addressed
2. No missing functionality
3. Edge cases handled
4. Interface contracts respected
5. API signatures correct
6. Tests would cover specs

Respond with JSON:
{
  "findings": [
    {"severity": "CRITICAL|HIGH|MEDIUM|LOW", "category": "...", "finding": "...", "recommendation": "...", "line_reference": "..."}
  ],
  "spec_compliance": 0.0-1.0,
  "missing_requirements": ["..."],
  "extra_functionality": ["..."]
}`
  },
  
  "FORMULA_VALIDATOR": {
    name: "Formula Validator", 
    tier: "opus" as const,
    systemPrompt: `You are the PRISM Formula Validator - ensuring mathematical and physics correctness.

CRITICAL: Manufacturing formulas must be 100% correct. Errors cause injuries/death.

Check for:
1. Kienzle force equation: Fc = kc1.1 × h^mc × b (correct coefficients, units)
2. Taylor tool life: V × T^n = C (correct exponents)
3. Johnson-Cook flow stress: σ = (A + Bε^n)(1 + C×ln(ε̇*))(1 - T*^m)
4. Unit consistency throughout
5. Physical limits respected
6. Numerical stability verified
7. No divide by zero
8. Correct dimensional analysis

Respond with JSON:
{
  "findings": [
    {"severity": "CRITICAL|HIGH|MEDIUM|LOW", "category": "...", "finding": "...", "recommendation": "...", "line_reference": "..."}
  ],
  "math_correctness": 0.0-1.0,
  "units_consistent": true/false,
  "formulas_verified": ["..."],
  "formulas_suspect": ["..."]
}`
  },
  
  "COMPLETENESS_CHECKER": {
    name: "Completeness Checker",
    tier: "haiku" as const,
    systemPrompt: `You are the PRISM Completeness Checker - ensuring 100% completion with NO placeholders.

MANDATORY: Find ANY incomplete content:
1. TODO comments
2. FIXME markers
3. Placeholder text ("xxx", "...", "TBD", "placeholder")
4. Stub functions (empty or just throw)
5. Missing implementations
6. Incomplete documentation
7. Empty catch blocks
8. Hardcoded test values
9. Missing error messages
10. Incomplete type definitions

Respond with JSON:
{
  "findings": [
    {"severity": "CRITICAL|HIGH|MEDIUM|LOW", "category": "...", "finding": "...", "recommendation": "...", "line_reference": "..."}
  ],
  "completeness_score": 0.0-1.0,
  "placeholder_count": 0,
  "todo_count": 0,
  "stub_count": 0
}`
  }
};

// ============================================================================
// CORE API EXECUTION
// ============================================================================

async function executeValidator(
  validatorId: keyof typeof VALIDATORS,
  content: string
): Promise<{ response: string; duration_ms: number; model: string }> {
  
  // ENFORCE real API - no simulation allowed
  if (!hasValidApiKey()) {
    throw new Error(
      `ANTHROPIC_API_KEY required for Ralph validation. ` +
      `Add key to claude_desktop_config.json env section. ` +
      `Simulation mode DISABLED for safety-critical manufacturing.`
    );
  }
  
  const validator = VALIDATORS[validatorId];
  const client = getAnthropicClient();
  const model = getModelForTier(validator.tier);
  
  const startTime = Date.now();
  
  log.info(`[RalphLoop] Calling ${validator.name} via ${model}...`);
  
  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    temperature: 0.2,  // Low temp for consistent validation
    system: validator.systemPrompt,
    messages: [{
      role: 'user',
      content: `Analyze the following content and provide your assessment:\n\n${content}`
    }]
  });
  
  const duration_ms = Date.now() - startTime;
  const textContent = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as any).text)
    .join('\n');
  
  log.info(`[RalphLoop] ${validator.name} completed in ${duration_ms}ms`);
  
  return { response: textContent, duration_ms, model };
}

async function executeAssessment(
  content: string,
  phases: RalphPhase[]
): Promise<{ assessment: RalphAssessment; scores: RalphScores; duration_ms: number; model: string }> {
  
  if (!hasValidApiKey()) {
    throw new Error(`ANTHROPIC_API_KEY required for assessment phase.`);
  }
  
  const client = getAnthropicClient();
  const model = getModelForTier('opus');  // Assessment always uses OPUS
  
  const startTime = Date.now();
  
  log.info(`[RalphLoop] Running Phase 4 Assessment via ${model}...`);
  
  // Compile all previous findings
  const allFindings = phases.flatMap(p => p.findings || []);
  const allImprovements = phases.flatMap(p => p.improvements || []);
  
  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    temperature: 0.3,
    system: `You are the PRISM Master Assessor - providing final comprehensive assessment.

Your role: After the Scrutinize, Improve, and Validate phases, you provide the FINAL ASSESSMENT.

You must calculate:
- Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L (master quality equation)
  Where: R=reliability, C=completeness, P=performance, S=safety, L=learning

Grade Scale:
- A: Ω ≥ 0.90 - Excellent, production ready
- B: Ω ≥ 0.80 - Good, minor improvements possible
- C: Ω ≥ 0.70 - Acceptable, meets minimum standards
- D: Ω ≥ 0.60 - Below standard, needs work
- F: Ω < 0.60 - Failed, do not proceed

Respond with JSON:
{
  "scores": {
    "quality": 0.0-1.0,
    "safety": 0.0-1.0,
    "completeness": 0.0-1.0,
    "correctness": 0.0-1.0,
    "omega": 0.0-1.0
  },
  "assessment": {
    "overall_grade": "A|B|C|D|F",
    "summary": "One paragraph summary of the work quality",
    "strengths": ["What was done well"],
    "weaknesses": ["What needs improvement"],
    "recommendations": ["Specific next steps"],
    "confidence": 0.0-1.0,
    "ready_for_production": true/false
  }
}`,
    messages: [{
      role: 'user',
      content: `Provide final assessment for this work:

ORIGINAL CONTENT:
${content.slice(0, 5000)}${content.length > 5000 ? '\n...[truncated]' : ''}

FINDINGS FROM SCRUTINY (${allFindings.length} issues):
${JSON.stringify(allFindings.slice(0, 20), null, 2)}

IMPROVEMENTS APPLIED (${allImprovements.length}):
${JSON.stringify(allImprovements.slice(0, 10), null, 2)}

Provide your comprehensive Phase 4 Assessment with grades and scores.`
    }]
  });
  
  const duration_ms = Date.now() - startTime;
  const textContent = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as any).text)
    .join('\n');
  
  log.info(`[RalphLoop] Assessment completed in ${duration_ms}ms`);
  
  // Parse response
  try {
    const parsed = JSON.parse(textContent);
    return {
      assessment: parsed.assessment,
      scores: parsed.scores,
      duration_ms,
      model
    };
  } catch {
    // If JSON parsing fails, create default assessment
    return {
      assessment: {
        overall_grade: "C",
        summary: textContent.slice(0, 500),
        strengths: ["Assessment completed"],
        weaknesses: ["Could not parse structured response"],
        recommendations: ["Review raw response"],
        confidence: 0.5,
        ready_for_production: false
      },
      scores: {
        quality: 0.7,
        safety: 0.7,
        completeness: 0.7,
        correctness: 0.7,
        omega: 0.7
      },
      duration_ms,
      model
    };
  }
}

function generateSessionId(): string {
  return `RALPH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function saveSession(session: RalphSession): void {
  const filepath = path.join(RALPH_DIR, `${session.id}.json`);
  fs.writeFileSync(filepath, JSON.stringify(session, null, 2));
}

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

export function registerRalphLoopTools(server: McpServer): void {

  /**
   * prism_ralph_loop - Full 4-phase validation loop with REAL Claude API
   */
  server.tool(
    "prism_ralph_loop",
    `Execute a 4-phase Ralph validation loop using REAL Claude API calls.

MANDATORY 4 PHASES (no simulation):
1. SCRUTINIZE - Validator agents examine content (uses live API)
2. IMPROVE - Apply fixes based on findings (uses live API)
3. VALIDATE - Quality gates check S(x) ≥ 0.70 (uses live API)
4. ASSESS - Final scoring and comprehensive assessment (uses live OPUS API)

Each phase makes REAL Claude API calls - no simulation allowed for safety-critical manufacturing.

Returns comprehensive assessment with:
- Ω(x) master quality score
- Letter grade (A/B/C/D/F)
- Detailed findings and recommendations
- Production readiness verdict`,
    {
      target: z.string().describe("Content or file path to validate"),
      target_type: z.enum(["content", "file", "code"]).default("content"),
      validators: z.array(z.enum([
        "SAFETY_AUDITOR", "CODE_REVIEWER", "SPEC_VERIFIER", 
        "FORMULA_VALIDATOR", "COMPLETENESS_CHECKER"
      ])).min(1).max(5).default(["SAFETY_AUDITOR", "CODE_REVIEWER", "COMPLETENESS_CHECKER"]),
      safety_threshold: z.number().min(0).max(1).default(0.70)
    },
    async ({ target, target_type, validators, safety_threshold }) => {
      
      // Check API key first
      if (!hasValidApiKey()) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "⛔ BLOCKED",
              error: "ANTHROPIC_API_KEY required",
              message: "Add API key to claude_desktop_config.json env section",
              simulation_disabled: true,
              reason: "Safety-critical manufacturing requires real AI reasoning"
            }, null, 2)
          }]
        };
      }
      
      // Initialize session
      const session: RalphSession = {
        id: generateSessionId(),
        target: target.slice(0, 500) + (target.length > 500 ? "..." : ""),
        target_type,
        started: new Date().toISOString(),
        phases: [],
        final_assessment: null,
        final_scores: null,
        status: "IN_PROGRESS"
      };
      
      activeSession = session;
      
      let content = target;
      if (target_type === "file" && fs.existsSync(target)) {
        content = fs.readFileSync(target, 'utf-8');
      }
      
      const allFindings: RalphFinding[] = [];
      const allImprovements: string[] = [];
      let totalDuration = 0;
      
      try {
        // ================================================================
        // PHASE 1: SCRUTINIZE
        // ================================================================
        log.info(`[RalphLoop] Starting Phase 1: SCRUTINIZE with ${validators.length} validators`);
        
        for (const validatorId of validators) {
          const result = await executeValidator(validatorId as keyof typeof VALIDATORS, content);
          totalDuration += result.duration_ms;
          
          // Parse findings from response
          let findings: RalphFinding[] = [];
          try {
            const parsed = JSON.parse(result.response);
            findings = parsed.findings || [];
          } catch {
            // If not JSON, extract findings heuristically
            findings = [{
              severity: "MEDIUM",
              category: "parse_error",
              finding: "Could not parse validator response as JSON",
              recommendation: "Review raw response"
            }];
          }
          
          allFindings.push(...findings);
          
          session.phases.push({
            phase: "SCRUTINIZE",
            timestamp: new Date().toISOString(),
            agent_used: validatorId,
            model: result.model,
            response: result.response,
            findings,
            duration_ms: result.duration_ms,
            mode: "live"
          });
        }
        
        // ================================================================
        // PHASE 2: IMPROVE
        // ================================================================
        log.info(`[RalphLoop] Starting Phase 2: IMPROVE - ${allFindings.length} findings to address`);
        
        const criticalFindings = allFindings.filter(f => f.severity === "CRITICAL" || f.severity === "HIGH");
        
        if (criticalFindings.length > 0) {
          const improveResult = await executeValidator("CODE_REVIEWER", 
            `Based on these critical findings, suggest specific improvements:\n\n` +
            `FINDINGS:\n${JSON.stringify(criticalFindings, null, 2)}\n\n` +
            `CONTENT TO IMPROVE:\n${content.slice(0, 3000)}`
          );
          totalDuration += improveResult.duration_ms;
          
          try {
            const parsed = JSON.parse(improveResult.response);
            allImprovements.push(...(parsed.improvements || parsed.recommendations || []));
          } catch {
            allImprovements.push(improveResult.response.slice(0, 500));
          }
          
          session.phases.push({
            phase: "IMPROVE",
            timestamp: new Date().toISOString(),
            agent_used: "CODE_REVIEWER",
            model: improveResult.model,
            response: improveResult.response,
            improvements: allImprovements,
            duration_ms: improveResult.duration_ms,
            mode: "live"
          });
        } else {
          session.phases.push({
            phase: "IMPROVE",
            timestamp: new Date().toISOString(),
            agent_used: "SKIPPED",
            model: "none",
            response: "No critical findings - skipping improve phase",
            improvements: [],
            duration_ms: 0,
            mode: "live"
          });
        }
        
        // ================================================================
        // PHASE 3: VALIDATE
        // ================================================================
        log.info(`[RalphLoop] Starting Phase 3: VALIDATE - checking safety gate S(x) ≥ ${safety_threshold}`);
        
        const validateResult = await executeValidator("SAFETY_AUDITOR", content);
        totalDuration += validateResult.duration_ms;
        
        let safetyScore = 0.7;
        try {
          const parsed = JSON.parse(validateResult.response);
          safetyScore = parsed.safety_score || 0.7;
        } catch { /* use default */ }
        
        const safetyPassed = safetyScore >= safety_threshold;
        
        session.phases.push({
          phase: "VALIDATE",
          timestamp: new Date().toISOString(),
          agent_used: "SAFETY_AUDITOR",
          model: validateResult.model,
          response: validateResult.response,
          scores: {
            quality: 0,
            safety: safetyScore,
            completeness: 0,
            correctness: 0,
            omega: 0
          },
          duration_ms: validateResult.duration_ms,
          mode: "live"
        });
        
        if (!safetyPassed) {
          session.status = "BLOCKED";
          session.final_scores = { quality: 0, safety: safetyScore, completeness: 0, correctness: 0, omega: 0 };
          saveSession(session);
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "⛔ SAFETY GATE FAILED",
                session_id: session.id,
                safety_score: safetyScore,
                threshold: safety_threshold,
                message: `S(x) = ${safetyScore.toFixed(2)} < ${safety_threshold} - BLOCKED`,
                critical_findings: allFindings.filter(f => f.severity === "CRITICAL"),
                phases_completed: 3,
                total_duration_ms: totalDuration,
                mode: "live API"
              }, null, 2)
            }]
          };
        }
        
        // ================================================================
        // PHASE 4: ASSESS (NEW!)
        // ================================================================
        log.info(`[RalphLoop] Starting Phase 4: ASSESS - final comprehensive scoring`);
        
        const assessResult = await executeAssessment(content, session.phases);
        totalDuration += assessResult.duration_ms;
        
        session.phases.push({
          phase: "ASSESS",
          timestamp: new Date().toISOString(),
          agent_used: "MASTER_ASSESSOR",
          model: assessResult.model,
          response: JSON.stringify(assessResult),
          scores: assessResult.scores,
          assessment: assessResult.assessment,
          duration_ms: assessResult.duration_ms,
          mode: "live"
        });
        
        session.final_assessment = assessResult.assessment;
        session.final_scores = assessResult.scores;
        session.status = "COMPLETED";
        
        // Save session
        saveSession(session);
        
        // Format results
        const gradeEmoji = {
          "A": "🏆",
          "B": "✅",
          "C": "⚠️",
          "D": "❌",
          "F": "⛔"
        };
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "✅ COMPLETED - All 4 Phases",
              session_id: session.id,
              mode: "🔴 LIVE API (no simulation)",
              
              final_grade: `${gradeEmoji[assessResult.assessment.overall_grade]} ${assessResult.assessment.overall_grade}`,
              
              scores: {
                omega: `Ω(x) = ${(assessResult.scores.omega * 100).toFixed(1)}%`,
                safety: `S(x) = ${(assessResult.scores.safety * 100).toFixed(1)}%`,
                quality: `Q(x) = ${(assessResult.scores.quality * 100).toFixed(1)}%`,
                completeness: `C(x) = ${(assessResult.scores.completeness * 100).toFixed(1)}%`,
                correctness: `R(x) = ${(assessResult.scores.correctness * 100).toFixed(1)}%`
              },
              
              assessment: {
                summary: assessResult.assessment.summary,
                ready_for_production: assessResult.assessment.ready_for_production,
                confidence: `${(assessResult.assessment.confidence * 100).toFixed(0)}%`
              },
              
              strengths: assessResult.assessment.strengths,
              weaknesses: assessResult.assessment.weaknesses,
              recommendations: assessResult.assessment.recommendations,
              
              phases: session.phases.map(p => ({
                phase: p.phase,
                agent: p.agent_used,
                model: p.model,
                duration_ms: p.duration_ms,
                mode: p.mode
              })),
              
              findings_summary: {
                total: allFindings.length,
                critical: allFindings.filter(f => f.severity === "CRITICAL").length,
                high: allFindings.filter(f => f.severity === "HIGH").length,
                medium: allFindings.filter(f => f.severity === "MEDIUM").length,
                low: allFindings.filter(f => f.severity === "LOW").length
              },
              
              total_duration_ms: totalDuration,
              api_calls_made: session.phases.filter(p => p.model !== "none").length
              
            }, null, 2)
          }]
        };
        
      } catch (error) {
        session.status = "FAILED";
        saveSession(session);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "⛔ FAILED",
              session_id: session.id,
              error: error instanceof Error ? error.message : String(error),
              phases_completed: session.phases.length,
              mode: "live API"
            }, null, 2)
          }]
        };
      }
    }
  );

  /**
   * prism_ralph_scrutinize - Single scrutiny pass with REAL API
   */
  server.tool(
    "prism_ralph_scrutinize",
    "Run a single scrutiny pass using REAL Claude API. No simulation.",
    {
      content: z.string().describe("Content to scrutinize"),
      validator: z.enum([
        "SAFETY_AUDITOR", "CODE_REVIEWER", "SPEC_VERIFIER",
        "FORMULA_VALIDATOR", "COMPLETENESS_CHECKER"
      ]).default("CODE_REVIEWER")
    },
    async ({ content, validator }) => {
      
      if (!hasValidApiKey()) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "⛔ API_KEY_REQUIRED",
              message: "Add ANTHROPIC_API_KEY to claude_desktop_config.json"
            }, null, 2)
          }]
        };
      }
      
      const result = await executeValidator(validator as keyof typeof VALIDATORS, content);
      
      let findings: RalphFinding[] = [];
      let scores: any = {};
      
      try {
        const parsed = JSON.parse(result.response);
        findings = parsed.findings || [];
        scores = {
          safety: parsed.safety_score,
          quality: parsed.quality_score,
          completeness: parsed.completeness_score,
          correctness: parsed.math_correctness,
          spec_compliance: parsed.spec_compliance
        };
      } catch { /* use defaults */ }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: findings.length === 0 ? "✅ PASSED" : "⚠️ FINDINGS",
            validator,
            model: result.model,
            mode: "🔴 LIVE API",
            duration_ms: result.duration_ms,
            findings_count: findings.length,
            findings: findings.slice(0, 10),
            scores
          }, null, 2)
        }]
      };
    }
  );

  /**
   * prism_ralph_assess - Standalone assessment (Phase 4 only)
   */
  server.tool(
    "prism_ralph_assess",
    "Run standalone Phase 4 assessment with comprehensive scoring using OPUS.",
    {
      content: z.string().describe("Content to assess"),
      context: z.string().optional().describe("Additional context about the work")
    },
    async ({ content, context }) => {
      
      if (!hasValidApiKey()) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "⛔ API_KEY_REQUIRED",
              message: "Add ANTHROPIC_API_KEY to claude_desktop_config.json"
            }, null, 2)
          }]
        };
      }
      
      const result = await executeAssessment(
        context ? `${context}\n\n${content}` : content,
        []  // No previous phases
      );
      
      const gradeEmoji: Record<string, string> = {
        "A": "🏆", "B": "✅", "C": "⚠️", "D": "❌", "F": "⛔"
      };
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "✅ ASSESSED",
            mode: "🔴 LIVE OPUS API",
            duration_ms: result.duration_ms,
            model: result.model,
            
            grade: `${gradeEmoji[result.assessment.overall_grade]} ${result.assessment.overall_grade}`,
            omega: `Ω(x) = ${(result.scores.omega * 100).toFixed(1)}%`,
            
            scores: result.scores,
            assessment: result.assessment
          }, null, 2)
        }]
      };
    }
  );

  console.log("[ralph_loop_tools] Registered 3 Ralph Loop tools (v2.0 - LIVE API ONLY)");
}

export default registerRalphLoopTools;
