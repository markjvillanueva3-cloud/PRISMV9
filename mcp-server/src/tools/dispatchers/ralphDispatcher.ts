/**
 * Ralph Dispatcher - Consolidates 3 ralph tools → 1
 * Actions: loop, scrutinize, assess
 * All use LIVE Claude API calls - no simulation
 * 4 phases: SCRUTINIZE → IMPROVE → VALIDATE → ASSESS
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { apiConfig } from "../../config/api-config.js";
import * as fs from "fs";
import * as path from "path";
import { PATHS } from "../../constants.js";

const VALIDATORS = ["SAFETY_AUDITOR", "CODE_REVIEWER", "SPEC_VERIFIER", "FORMULA_VALIDATOR", "COMPLETENESS_CHECKER"] as const;
const ACTIONS = ["loop", "scrutinize", "assess"] as const;
const RALPH_DIR = path.join(PATHS.STATE_DIR, "ralph_loops");

function getApiKey(): string | null {
  return apiConfig.anthropicApiKey || process.env.ANTHROPIC_API_KEY || null;
}

async function callClaudeApi(systemPrompt: string, userPrompt: string, model: string = apiConfig.sonnetModel): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error(`ANTHROPIC_API_KEY not set. Add key to ${PATHS.MCP_SERVER}\\.env file.`);
  log.info(`[ralph] API call: model=${model}, prompt_len=${userPrompt.length}`);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 4096, system: systemPrompt, messages: [{ role: "user", content: userPrompt }] })
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Claude API ${response.status} ${response.statusText} (model=${model}): ${body.slice(0, 200)}`);
  }
  const data: any = await response.json();
  return data.content?.map((b: any) => b.text || "").join("\n") || "No response";
}

function getValidatorPrompt(validator: string): string {
  const prompts: Record<string, string> = {
    SAFETY_AUDITOR: "You are a safety auditor for manufacturing systems. Check for: unsafe cutting parameters, missing safety checks, potential for tool breakage or machine crashes, operator safety risks. Be thorough and critical.",
    CODE_REVIEWER: "You are a code reviewer for a manufacturing intelligence system. Check for: bugs, error handling gaps, type safety issues, missing edge cases, code quality problems. Be specific about issues found.",
    SPEC_VERIFIER: "You verify implementations against specifications. Check for: missing features, incomplete implementations, spec deviations, untested paths. Compare what was promised vs delivered.",
    FORMULA_VALIDATOR: "You validate manufacturing formulas and calculations. Check for: unit errors, parameter range violations, mathematical mistakes, physically impossible values. Manufacturing errors can cause injury.",
    COMPLETENESS_CHECKER: "You check completeness of deliverables. Look for: TODO items, placeholder content, missing documentation, incomplete error handling, untested scenarios."
  };
  return prompts[validator] || prompts.CODE_REVIEWER;
}

async function executeValidator(content: string, validator: string): Promise<any> {
  const systemPrompt = getValidatorPrompt(validator);
  const userPrompt = `Analyze this content and provide findings:\n\n${content.substring(0, 8000)}\n\nReturn findings as:\n- CRITICAL: (issues that must be fixed)\n- HIGH: (important issues)\n- MEDIUM: (should fix)\n- LOW: (nice to fix)\n- SCORE: (0-1 safety/quality score)`;
  const result = await callClaudeApi(systemPrompt, userPrompt);
  return { validator, findings: result, timestamp: new Date().toISOString() };
}

async function executeAssessment(content: string, context?: string): Promise<any> {
  const systemPrompt = "You are a senior manufacturing systems assessor using Claude Opus. Provide comprehensive quality assessment with letter grade (A/B/C/D/F), Ω(x) score, production readiness verdict, and detailed recommendations.";
  const userPrompt = `Assess this content for production readiness:\n\n${content.substring(0, 8000)}\n\n${context ? `Context: ${context}` : ""}\n\nProvide:\n1. Letter grade (A/B/C/D/F)\n2. Component scores: R(reasoning), C(code), P(process), S(safety), L(learning)\n3. Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L\n4. Production readiness: READY / NOT_READY / CONDITIONAL\n5. Key findings and recommendations`;
  const result = await callClaudeApi(systemPrompt, userPrompt, apiConfig.opusModel);
  return { assessment: result, timestamp: new Date().toISOString(), model: apiConfig.opusModel };
}

export function registerRalphDispatcher(server: any): void {
  server.tool(
    "prism_ralph",
    `Execute 4-phase Ralph validation with REAL Claude API calls.\nActions: ${ACTIONS.join(", ")}\n\nloop: Full 4-phase validation (SCRUTINIZE→IMPROVE→VALIDATE→ASSESS)\nscrutinize: Single validator pass\nassess: Standalone Phase 4 assessment with OPUS\n\nAll phases make REAL Claude API calls - no simulation.`,
    {
      action: z.enum(ACTIONS).describe("Ralph action"),
      params: z.record(z.any()).optional().describe("Action parameters")
    },
    async ({ action, params = {} }: { action: string; params: Record<string, any> }) => {
      log.info(`[prism_ralph] Action: ${action}`);
      let result: any;
      try {
        switch (action) {
          case "loop": {
            const target = params.content || params.target || "";
            if (!target || target.length < 10) {
              result = { error: "No content provided. Pass content= or target= with the text to validate." };
              break;
            }
            const validators: string[] = params.validators || ["SAFETY_AUDITOR", "CODE_REVIEWER", "COMPLETENESS_CHECKER"];
            const safetyThreshold = params.safety_threshold || 0.7;
            const phases: any[] = [];

            // Phase 1: SCRUTINIZE
            const scrutinyResults: any[] = [];
            for (const v of validators) {
              const r = await executeValidator(target, v);
              scrutinyResults.push(r);
            }
            phases.push({ phase: "SCRUTINIZE", results: scrutinyResults });

            // Phase 2: IMPROVE
            const improvePrompt = `Based on these findings, suggest improvements:\n${scrutinyResults.map(r => r.findings).join("\n---\n")}`;
            const improvements = await callClaudeApi("You are a manufacturing systems improvement specialist.", improvePrompt);
            phases.push({ phase: "IMPROVE", improvements });

            // Phase 3: VALIDATE
            const validatePrompt = `Validate that safety score meets threshold ${safetyThreshold}:\n${target.substring(0, 4000)}`;
            const validation = await callClaudeApi("You validate manufacturing system safety. Return PASS or FAIL with S(x) score.", validatePrompt);
            phases.push({ phase: "VALIDATE", validation, threshold: safetyThreshold });

            // Phase 4: ASSESS
            const assessment = await executeAssessment(target, `Validators used: ${validators.join(", ")}`);
            phases.push({ phase: "ASSESS", assessment });

            // Save session
            if (!fs.existsSync(RALPH_DIR)) fs.mkdirSync(RALPH_DIR, { recursive: true });
            const sessionId = `ralph_${Date.now()}`;
            fs.writeFileSync(path.join(RALPH_DIR, `${sessionId}.json`), JSON.stringify({ sessionId, phases, timestamp: new Date().toISOString() }, null, 2));

            result = { sessionId, phases_completed: 4, phases, api_calls: validators.length + 3 };
            break;
          }
          case "scrutinize": {
            const content = params.content || "";
            const validator = params.validator || "CODE_REVIEWER";
            result = await executeValidator(content, validator);
            break;
          }
          case "assess": {
            const content = params.content || "";
            const context = params.context || "";
            result = await executeAssessment(content, context);
            break;
          }
        }
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: JSON.stringify({ error: error.message, action }) }], isError: true };
      }
    }
  );
}
