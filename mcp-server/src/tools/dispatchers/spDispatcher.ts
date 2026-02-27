/**
 * SP Dispatcher - Consolidates developmentProtocolTools (19 tools → 1)
 * Tool: prism_sp
 * Actions: brainstorm, plan, execute, review_spec, review_quality, debug,
 *          cognitive_init, cognitive_check, cognitive_bayes, cognitive_rl,
 *          combination_ilp, context_kv_optimize, context_attention_anchor, context_error_preserve,
 *          session_start_full, session_end_full, evidence_level, validate_gates_full, validate_mathplan
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError } from "../../utils/dispatcherMiddleware.js";
import { hookEngine } from "../../orchestration/HookEngine.js";
import { hasValidApiKey, parallelAPICalls, getModelForTier } from "../../config/api-config.js";
import { knowledgeEngine } from "../../engines/KnowledgeQueryEngine.js";
import { skillRegistry } from "../../registries/SkillRegistry.js";
import { formulaRegistry } from "../../registries/FormulaRegistry.js";
import type { CogState, BrainstormConfig, BrainstormResult } from "../../types/prism-schema.js";
import { PATHS } from "../../constants.js";
import { safeWriteSync } from "../../utils/atomicWrite.js";

const ACTIONS = [
  "brainstorm", "plan", "execute", "review_spec", "review_quality", "debug",
  "cognitive_init", "cognitive_check", "cognitive_bayes", "cognitive_rl",
  "combination_ilp", "context_kv_optimize", "context_attention_anchor", "context_error_preserve",
  "session_start_full", "session_end_full", "evidence_level", "validate_gates_full", "validate_mathplan"
] as const;

function ok(data: any) { return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(data)) }] }; }

const DATA_DIR = PATHS.DATA_DIR;
const COORD_DIR = path.join(DATA_DIR, "coordination");
const STATE_DIR = PATHS.STATE_DIR;
function loadJSON(fp: string) { try { return JSON.parse(fs.readFileSync(fp, "utf-8")); } catch { return null; } }
function saveJSON(fp: string, data: any) { safeWriteSync(fp, JSON.stringify(data, null, 2)); }

async function fireHook(id: string, ctx: Record<string, any>) {
  try { return await hookEngine.executeHook(id, ctx); } catch { return null; }
}

// CogState — imported from prism-schema
let cog: CogState = { bayes_priors:{}, opt_objectives:[], rl_policy:{},
  metrics:{R:0.8,C:0.8,P:0.8,S:0.9,L:0.7,omega:0.82}, decisions:[], errors:[] };
function omega(m: CogState["metrics"]) { return 0.25*m.R+0.20*m.C+0.15*m.P+0.30*m.S+0.10*m.L; }
function safetyGate(S: number) { return S>=0.70 ? {pass:true,msg:`S(x)=${S.toFixed(2)}≥0.70`} : {pass:false,msg:`⛔ S(x)=${S.toFixed(2)}<0.70 BLOCKED`}; }

// ============================================================================
// BRAINSTORM ENGINE — Real analysis, not hardcoded strings
// ============================================================================

const SEVEN_LENSES = [
  { id: "CHALLENGE", name: "Challenge Assumptions", prompt: "What assumptions about this problem might be wrong? What are we taking for granted that could fail?" },
  { id: "MULTIPLY", name: "Multiply Alternatives", prompt: "What are 3-5 fundamentally different approaches to solve this? Don't just vary parameters — propose structurally different solutions." },
  { id: "INVERT", name: "Invert the Problem", prompt: "What if we solved the opposite problem? What would make this WORSE, and how does avoiding those traps inform our solution?" },
  { id: "FUSE", name: "Cross-Domain Fusion", prompt: "What solutions exist in other engineering domains (aerospace, automotive, chemical, software) that could apply here?" },
  { id: "TENX", name: "10X Improvement", prompt: "How could we make this 10x better, not just incrementally? What would a breakthrough solution look like?" },
  { id: "SIMPLIFY", name: "Simplify Ruthlessly", prompt: "What's the simplest possible solution that still meets all hard constraints? What complexity can we eliminate?" },
  { id: "FUTURE", name: "Future-Proof", prompt: "What will change in 6-12 months that could break this? How do we design for adaptability?" }
];

// BrainstormConfig, BrainstormResult — imported from prism-schema

async function runBrainstorm(config: BrainstormConfig): Promise<BrainstormResult> {
  // Input validation
  if (!config.problem || typeof config.problem !== "string" || config.problem.trim().length === 0) {
    return {
      status: "❌ ERROR: 'problem' parameter required (non-empty string)",
      depth: config.depth || "standard", problem: "",
      domain_context: { relevant_skills: [], relevant_formulas: [], knowledge_enrichments: 0, cross_references: [] },
      lenses: {}, synthesis: { recommended_approach: "", gap_inventory: [], risk_matrix: [], phased_plan: [], recommended_tools: [] },
      api_calls_made: 0, tokens_used: { input: 0, output: 0 }, next: "Provide a problem description and retry"
    };
  }
  if (config.depth && !["quick", "standard", "deep"].includes(config.depth)) {
    config.depth = "standard";
  }
  const depth = config.depth || "standard";
  const problem = config.problem || config.context?.goal || "No problem specified";
  const domain = config.domain || detectDomain(problem);
  
  log.info(`[brainstorm] Starting ${depth} brainstorm: "${problem.slice(0, 80)}..."`);

  const result: BrainstormResult = {
    status: "⛔ MANDATORY STOP — Review before proceeding",
    depth,
    problem,
    domain_context: { relevant_skills: [], relevant_formulas: [], knowledge_enrichments: 0, cross_references: [] },
    lenses: {},
    synthesis: { recommended_approach: "", gap_inventory: [], risk_matrix: [], phased_plan: [], recommended_tools: [] },
    api_calls_made: 0,
    tokens_used: { input: 0, output: 0 },
    next: "Review brainstorm output → approve scope → call plan"
  };

  // ── PHASE 1: PRISM Knowledge Grounding (all depths) ──
  try {
    // Find relevant skills
    const skillResults = skillRegistry.search(problem);
    const skillList = (skillResults as any)?.skills || (Array.isArray(skillResults) ? skillResults : []);
    result.domain_context.relevant_skills = skillList.slice(0, 5).map((s: any) => ({
      id: s.id || s.skill_id || "unknown",
      name: s.name || s.title || "unknown",
      relevance: s.relevance_score || s.score || 0.5
    }));

    // Find relevant formulas
    const formulaListResult = await formulaRegistry.list({ limit: 5 });
    const formulaResults = formulaListResult.formulas.filter((f: any) => 
      f.name?.toLowerCase().includes(problem.toLowerCase()) ||
      f.description?.toLowerCase().includes(problem.toLowerCase()) ||
      f.category?.toLowerCase().includes(problem.toLowerCase())
    );
    result.domain_context.relevant_formulas = formulaResults.map((f: any) => ({
      id: f.id || f.formula_id || "unknown",
      name: f.name || f.title || "unknown",
      domain: f.domain || f.category || "general"
    }));

    // Cross-query knowledge
    try {
      await knowledgeEngine.initialize();
      const kq = await (knowledgeEngine as any).crossQuery({ task: problem, context: { operation: domain } });
      result.domain_context.knowledge_enrichments = 
        (kq.results?.materials?.length || 0) + (kq.results?.formulas?.length || 0) + 
        (kq.results?.machines?.length || 0) + (kq.results?.skills?.length || 0);
      result.domain_context.cross_references = kq.suggested_workflow || [];
    } catch { /* knowledge engine may not be initialized */ }
  } catch (e) { log.warn(`[brainstorm] Knowledge grounding partial: ${e}`); }

  // ── PHASE 2: Quick Analysis (no API calls) ──
  if (depth === "quick") {
    result.lenses = generateQuickLenses(problem, config.constraints || []);
    result.synthesis = generateQuickSynthesis(problem, result.domain_context, config.constraints || []);
    return result;
  }

  // ── PHASE 3: API-Powered Lens Analysis (standard + deep) ──
  if (!hasValidApiKey()) {
    log.warn("[brainstorm] No API key — falling back to quick mode");
    result.lenses = generateQuickLenses(problem, config.constraints || []);
    result.synthesis = generateQuickSynthesis(problem, result.domain_context, config.constraints || []);
    result.status += " (⚠️ No API key — quick analysis only)";
    return result;
  }

  const lensCount = Math.min(7, Math.max(1, config.max_lenses || (depth === "deep" ? 7 : 5)));
  const activeLenses = SEVEN_LENSES.slice(0, lensCount);
  const failedLenses: string[] = [];
  
  // Build enrichment context from PRISM data
  const prismContext = [
    result.domain_context.relevant_skills.length > 0 
      ? `Available PRISM skills: ${result.domain_context.relevant_skills.map(s => s.name).join(", ")}` : "",
    result.domain_context.relevant_formulas.length > 0 
      ? `Relevant formulas: ${result.domain_context.relevant_formulas.map(f => `${f.name} (${f.domain})`).join(", ")}` : "",
    result.domain_context.cross_references.length > 0 
      ? `Suggested workflow: ${result.domain_context.cross_references.join(" → ")}` : "",
    config.constraints?.length ? `Hard constraints: ${config.constraints.join("; ")}` : ""
  ].filter(Boolean).join("\n");

  // Fire parallel API calls — one per lens
  const lensPrompts = activeLenses.map(lens => ({
    system: `You are a senior manufacturing systems architect doing deep analysis for PRISM Manufacturing Intelligence.
Domain: ${domain}
${prismContext}

Return ONLY a JSON array of 3-5 specific, actionable insights. No markdown, no preamble.
Example: ["Use Kienzle force model instead of empirical tables for better accuracy", "Risk: Thread insert selection has no fallback if primary geometry fails"]`,
    user: `Problem: ${problem}\n\n${lens.name}: ${lens.prompt}`,
    maxTokens: 512,
    temperature: 0.4
  }));

  try {
    const responses = await parallelAPICalls(lensPrompts);
    
    responses.forEach((resp, i) => {
      result.api_calls_made++;
      result.tokens_used.input += resp.tokens.input;
      result.tokens_used.output += resp.tokens.output;

      if (resp.error) { 
        result.lenses[activeLenses[i].id] = [`⚠️ Lens failed: ${resp.error}`]; 
        failedLenses.push(activeLenses[i].id);
        return; 
      }

      try {
        const cleaned = resp.text.trim().replace(/^```json?\s*/, '').replace(/\s*```$/, '');
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          result.lenses[activeLenses[i].id] = parsed.map(String).slice(0, 5);
        } else {
          result.lenses[activeLenses[i].id] = [resp.text.slice(0, 300)];
        }
      } catch {
        // Extract lines as fallback
        const lines = resp.text.split('\n').map(l => l.replace(/^[-*•\d.)\s"]+/, '').trim()).filter(l => l.length > 10 && l.length < 400);
        result.lenses[activeLenses[i].id] = lines.length > 0 ? lines.slice(0, 5) : [resp.text.slice(0, 300)];
      }
    });
  } catch (e) { log.error(`[brainstorm] Parallel lens calls failed: ${e}`); }

  // ── PHASE 4: Synthesis Call (deep only, uses Opus) ──
  if (depth === "deep") {
    try {
      const allInsights = Object.entries(result.lenses).map(([k, v]) => `${k}: ${v.join("; ")}`).join("\n");
      const synthResp = await parallelAPICalls([{
        system: `You are PRISM's chief architect. Synthesize brainstorm results into an actionable plan.
Return JSON:
{
  "recommended_approach": "one-paragraph description",
  "gap_inventory": ["gap1", "gap2", ...],
  "risk_matrix": [{"risk":"...", "likelihood":"LOW|MED|HIGH", "impact":"LOW|MED|HIGH|CRITICAL", "mitigation":"..."}],
  "phased_plan": [{"phase":1, "name":"...", "deliverable":"...", "effort":"X sessions"}],
  "recommended_tools": ["prism_calc", "prism_safety", ...]
}`,
        user: `Problem: ${problem}\nDomain: ${domain}\nConstraints: ${(config.constraints || []).join("; ")}\n\nLens Insights:\n${allInsights}\n\nPRISM Context:\n${prismContext}\n\nSynthesize into actionable plan.`,
        model: getModelForTier("opus"),
        maxTokens: 2048,
        temperature: 0.2
      }]);

      result.api_calls_made++;
      result.tokens_used.input += synthResp[0].tokens.input;
      result.tokens_used.output += synthResp[0].tokens.output;

      try {
        const cleaned = synthResp[0].text.trim().replace(/^```json?\s*/, '').replace(/\s*```$/, '');
        const parsed = JSON.parse(cleaned);
        result.synthesis = {
          recommended_approach: parsed.recommended_approach || "",
          gap_inventory: parsed.gap_inventory || [],
          risk_matrix: parsed.risk_matrix || [],
          phased_plan: parsed.phased_plan || [],
          recommended_tools: parsed.recommended_tools || []
        };
      } catch { 
        result.synthesis.recommended_approach = synthResp[0].text.slice(0, 500);
      }
    } catch (e) { log.error(`[brainstorm] Synthesis call failed: ${e}`); }
  } else {
    // Standard mode: generate synthesis from lens results without API
    result.synthesis = generateSynthesisFromLenses(problem, result.lenses, result.domain_context, config.constraints || []);
  }

  // Add API health reporting
  if (failedLenses.length > 0) {
    result.status += ` (⚠️ ${failedLenses.length}/${lensCount} lenses failed: ${failedLenses.join(", ")})`;
  }
  if (result.api_calls_made > 0) {
    result.status += ` | ${result.api_calls_made} API calls, ${result.tokens_used.input + result.tokens_used.output} tokens`;
  }

  return result;
}

function detectDomain(problem: string): string {
  const p = problem.toLowerCase();
  if (p.match(/material|alloy|steel|aluminum|titanium|hardness|tensile/)) return "materials";
  if (p.match(/machine|cnc|spindle|axis|controller|fanuc|siemens/)) return "machines";
  if (p.match(/tool|insert|endmill|drill|tap|thread/)) return "tooling";
  if (p.match(/force|speed|feed|mrr|power|torque|deflect/)) return "physics";
  if (p.match(/alarm|error|fault|code|diagnostic/)) return "alarms";
  if (p.match(/safety|collision|clamp|fixture|workholding/)) return "safety";
  if (p.match(/code|dispatch|build|test|registry|hook/)) return "development";
  if (p.match(/agent|swarm|orchestrat|autonom|atcs/)) return "orchestration";
  return "general";
}

function generateQuickLenses(problem: string, constraints: string[]): Record<string, string[]> {
  const domain = detectDomain(problem);
  const lenses: Record<string, string[]> = {};
  
  lenses.CHALLENGE = [
    `Verify that the assumed approach to "${problem.slice(0, 60)}..." is actually the best path`,
    `Check if existing PRISM tools already solve parts of this — avoid rebuilding`,
    constraints.length > 0 ? `Constraint check: ${constraints[0]} — is this truly a hard constraint or negotiable?` : "Identify hidden assumptions in the problem statement"
  ];
  lenses.MULTIPLY = [
    `Option A: Direct implementation — solve exactly as stated`,
    `Option B: Compose existing dispatchers — chain tools instead of building new`,
    `Option C: Decompose differently — break the problem along different boundaries`
  ];
  lenses.SIMPLIFY = [
    `What's the minimum viable version that proves the concept?`,
    `Which features can be deferred to v2 without blocking v1?`,
    domain === "development" ? "Can this be a config change instead of new code?" : "Can this leverage existing registry data?"
  ];

  return lenses;
}

function generateQuickSynthesis(problem: string, domainCtx: any, constraints: string[]): BrainstormResult["synthesis"] {
  return {
    recommended_approach: `Solve "${problem.slice(0, 80)}" using existing PRISM infrastructure where possible. ${domainCtx.relevant_skills.length > 0 ? `Leverage skills: ${domainCtx.relevant_skills.map((s: any) => s.name).join(", ")}.` : "No directly matching skills found — new implementation needed."}`,
    gap_inventory: [
      "Validate that all required data exists in PRISM registries",
      "Verify integration points with existing dispatchers",
      "Confirm safety implications and S(x) gate requirements"
    ],
    risk_matrix: [
      { risk: "Incomplete requirements", likelihood: "MEDIUM", impact: "HIGH", mitigation: "Validate scope before coding" },
      { risk: "Integration breakage", likelihood: "LOW", impact: "HIGH", mitigation: "Anti-regression validation" }
    ],
    phased_plan: [
      { phase: 1, name: "Design", deliverable: "Approved spec with scope boundaries", effort: "1 session" },
      { phase: 2, name: "Implementation", deliverable: "Working code with tests", effort: "1-2 sessions" },
      { phase: 3, name: "Validation", deliverable: "Ralph-validated, build-passing code", effort: "1 session" }
    ],
    recommended_tools: domainCtx.relevant_formulas.length > 0 
      ? ["prism_calc", "prism_validate", "prism_knowledge"]
      : ["prism_dev", "prism_guard", "prism_validate"]
  };
}

function generateSynthesisFromLenses(problem: string, lenses: Record<string, string[]>, domainCtx: any, constraints: string[]): BrainstormResult["synthesis"] {
  const allInsights = Object.values(lenses).flat();
  const simplifyItems = lenses.SIMPLIFY || [];
  const challengeItems = lenses.CHALLENGE || [];
  
  return {
    recommended_approach: simplifyItems[0] || challengeItems[0] || `Direct implementation of: ${problem.slice(0, 100)}`,
    gap_inventory: allInsights.filter(i => i.toLowerCase().includes("risk") || i.toLowerCase().includes("gap") || i.toLowerCase().includes("missing")).slice(0, 5),
    risk_matrix: (lenses.CHALLENGE || []).slice(0, 3).map(c => ({
      risk: c.slice(0, 80), likelihood: "MEDIUM", impact: "HIGH", mitigation: "Validate before implementation"
    })),
    phased_plan: [
      { phase: 1, name: "Foundation", deliverable: "Core implementation", effort: "1-2 sessions" },
      { phase: 2, name: "Integration", deliverable: "Connected to existing systems", effort: "1 session" },
      { phase: 3, name: "Validation", deliverable: "Quality-gated, build-passing", effort: "1 session" }
    ],
    recommended_tools: domainCtx.relevant_skills.map((s: any) => s.id).slice(0, 5)
  };
}

export function registerSpDispatcher(server: any): void {
  server.tool(
    "prism_sp",
    `Development protocol dispatcher (19 actions). Superpowers workflow, cognitive system, ILP, validation gates.\nActions: ${ACTIONS.join(", ")}\n\nbrainstorm: ENHANCED - Real 7-lens analysis (problem, context?, domain?, depth?:"quick"|"standard"|"deep", constraints?, max_lenses?). Quick=free/fast, Standard=5 parallel API calls, Deep=7 lenses+Opus synthesis. Grounded in PRISM knowledge.`,
    { action: z.enum(ACTIONS), params: z.record(z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params: Record<string,any> }) => {
      log.info(`[prism_sp] ${action}`);
      // H1-MS2: Auto-normalize snake_case → camelCase params
      let params = rawParams;
      try {
        const { normalizeParams } = await import("../../utils/paramNormalizer.js");
        params = normalizeParams(rawParams);
      } catch { /* normalizer not available */ }
      try {
        switch (action) {
          case "brainstorm": {
            await fireHook("CALC-BEFORE-EXEC-001", { phase:"brainstorm", goal:params.goal || params.problem });
            const brainstormResult = await runBrainstorm({
              problem: params.problem || params.goal || "",
              context: params.context,
              domain: params.domain,
              depth: params.depth || "standard",
              constraints: params.constraints,
              max_lenses: params.max_lenses
            });
            return ok(brainstormResult);
          }
          case "plan": {
            await fireHook("BATCH-BEFORE-EXEC-001", { phase:"plan", complexity:params.estimated_complexity });
            const plans: Record<string,any> = { SIMPLE:{checkpoints:0,max:8}, MODERATE:{checkpoints:1,max:14}, COMPLEX:{checkpoints:3,max:18}, MULTI_SESSION:{checkpoints:5,max:25} };
            const p = plans[params.estimated_complexity||"MODERATE"];
            return ok({ status:"PLAN CREATED", scope:params.approved_scope, approach:params.approved_approach, complexity:params.estimated_complexity, checkpoints:p?.checkpoints, max_tool_calls:p?.max, buffer_zones:{green:"0-8",yellow:"9-14",red:"15-18",critical:"19+"} });
          }
          case "execute": {
            await fireHook("AGENT-BEFORE-SPAWN-001", { task:params.task_description, calls:params.current_tool_calls });
            const calls = params.current_tool_calls||0;
            const zone = calls>=19?"CRITICAL":calls>=15?"RED":calls>=9?"YELLOW":"GREEN";
            cog.metrics.P = Math.max(0.5, 1.0-(calls/25)); cog.metrics.omega = omega(cog.metrics);
            return ok({ task:params.task_description, tool_calls:calls, buffer_zone:zone, P:cog.metrics.P.toFixed(2), omega:cog.metrics.omega.toFixed(2), checkpoint:params.checkpoint_data||null });
          }
          case "review_spec": {
            const R = params.requirements?.length>0 ? Math.min(1.0, (params.deliverables?.length||0)/params.requirements.length) : 0;
            cog.metrics.R = R; cog.metrics.omega = omega(cog.metrics);
            const pass = R>=0.80 && !params.scope_check?.too_much && !params.scope_check?.too_little;
            return ok({ status:pass?"✅ SPEC PASSED":"❌ SPEC FAILED", R:R.toFixed(2), passed:pass, requirements:params.requirements?.length, deliverables:params.deliverables?.length, next:pass?"review_quality":"Fix gaps" });
          }
          case "review_quality": {
            const checks = [params.code_structured, params.patterns_consistent, params.error_handling, params.edge_cases];
            const C = checks.filter(Boolean).length/checks.length;
            const S = params.safety_score||0.8; const sg = safetyGate(S);
            cog.metrics.C=C; cog.metrics.S=S; cog.metrics.omega = omega(cog.metrics);
            if(S<0.70) await fireHook("CALC-SAFETY-VIOLATION-001", {S_x:S, threshold:0.70});
            return ok({ status:(C>=0.70&&sg.pass)?"✅ QUALITY PASSED":"❌ QUALITY FAILED", C:C.toFixed(2), S:S.toFixed(2), safety_gate:sg, omega:cog.metrics.omega.toFixed(2) });
          }
          case "debug": {
            cog.errors.push({ ts:new Date().toISOString(), phase:params.phase, desc:params.error_description });
            const phases: Record<string,any> = {
              EVIDENCE:{checklist:["Reproduce 3x","Document steps","Capture errors","Note what worked"],next:"ROOT_CAUSE"},
              ROOT_CAUSE:{checklist:["Trace backward","Find FIRST failure","Distinguish symptom/cause","Verify assumptions"],next:"HYPOTHESIS"},
              HYPOTHESIS:{checklist:["Form hypothesis","Design minimal test","Predict outcome","If wrong→ROOT_CAUSE"],next:"FIX"},
              FIX:{checklist:["Fix at root cause","Add validation","3+ defense layers","Regression test","Document"],next:"COMPLETE"}
            };
            return ok({ phase:params.phase, error:params.error_description, checklist:phases[params.phase]?.checklist, evidence:params.evidence, root_cause:params.root_cause, hypothesis:params.hypothesis, fix_applied:params.fix_applied, next_phase:phases[params.phase]?.next });
          }
          // === COGNITIVE ===
          case "cognitive_init": {
            cog.bayes_priors = { success_rate:0.85, error_rate:0.15, complexity:0.5, resources:0.9 };
            if(params.prior_session_data?.metrics) cog.metrics = params.prior_session_data.metrics;
            if(params.task_domain) cog.opt_objectives = [`Optimize for ${params.task_domain}`];
            return ok({ status:"COGNITIVE INITIALIZED", priors:cog.bayes_priors, metrics:cog.metrics, patterns:["Bayesian","Optimization","Multi-Objective","Gradient","RL"] });
          }
          case "cognitive_check": {
            if(params.reasoning_score!==undefined) cog.metrics.R=params.reasoning_score;
            if(params.code_score!==undefined) cog.metrics.C=params.code_score;
            if(params.process_score!==undefined) cog.metrics.P=params.process_score;
            if(params.safety_score!==undefined) cog.metrics.S=params.safety_score;
            if(params.learning_score!==undefined) cog.metrics.L=params.learning_score;
            cog.metrics.omega = omega(cog.metrics); const sg = safetyGate(cog.metrics.S);
            return ok({ R:cog.metrics.R.toFixed(3), C:cog.metrics.C.toFixed(3), P:cog.metrics.P.toFixed(3), S:cog.metrics.S.toFixed(3), L:cog.metrics.L.toFixed(3), omega:cog.metrics.omega.toFixed(3), safety_gate:sg, all_gates_passed:sg.pass&&cog.metrics.omega>=0.70 });
          }
          case "cognitive_bayes": {
            if(params.hook==="BAYES-001") { cog.bayes_priors={...cog.bayes_priors,...params.data}; return ok({hook:"BAYES-001",priors:cog.bayes_priors}); }
            if(params.hook==="BAYES-002") { const r=(params.data?.old_size||1)>0?(params.data?.new_size||0)/(params.data?.old_size||1):1; return ok({hook:"BAYES-002",change_ratio:r.toFixed(3),regression:r<0.80}); }
            if(params.hook==="BAYES-003") { const pr=params.data?.prior_probability||0.5; const ev=params.data?.evidence_strength||0.5; const post=(pr*ev)/((pr*ev)+((1-pr)*(1-ev))); return ok({hook:"BAYES-003",posterior:post.toFixed(3),confidence:post>=0.95?"HIGH":post>=0.70?"MEDIUM":"LOW"}); }
            return ok({ error:"Unknown hook", valid:["BAYES-001","BAYES-002","BAYES-003"] });
          }
          case "cognitive_rl": {
            if(params.hook==="RL-001") return ok({hook:"RL-001",state:{ts:new Date().toISOString(),metrics:cog.metrics,decisions:cog.decisions.length}});
            if(params.hook==="RL-002") { cog.decisions.push({ts:new Date().toISOString(),...params.data}); const sr=cog.decisions.filter((d:any)=>d.success).length/Math.max(1,cog.decisions.length); cog.metrics.L=sr; return ok({hook:"RL-002",success_rate:sr.toFixed(3),total:cog.decisions.length}); }
            if(params.hook==="RL-003") { const recent=cog.decisions.slice(-10); const sr=recent.filter((d:any)=>d.success).length/Math.max(1,recent.length); cog.rl_policy={...cog.rl_policy,updated:new Date().toISOString(),recent_sr:sr}; return ok({hook:"RL-003",recent_success_rate:sr.toFixed(3)}); }
            return ok({ error:"Unknown hook" });
          }
          // === ILP + CONTEXT + SESSION + VALIDATION ===
          case "combination_ilp": {
            const reg = loadJSON(path.join(COORD_DIR,"RESOURCE_REGISTRY.json"));
            if(!reg) return ok({error:"RESOURCE_REGISTRY.json not found", path:COORD_DIR});
            return ok({ task:params.task_description, capabilities:params.required_capabilities, skills:(reg.skills||[]).slice(0,params.max_skills||8).map((s:any)=>s.id||s.name), agents:(reg.agents||[]).slice(0,params.max_agents||8).map((a:any)=>a.id||a.name) });
          }
          case "context_kv_optimize": {
            const sorted = params.data ? JSON.parse(JSON.stringify(params.data, Object.keys(params.data).sort())) : {};
            return ok({ operation:params.operation||"optimize_full", sorted_keys:Object.keys(sorted), stable:true });
          }
          case "context_attention_anchor": {
            return ok({ current_goal:params.current_goal, sub_goals:params.sub_goals||[], completed:params.completed||[], anchor:"ATTENTION REFRESHED" });
          }
          case "context_error_preserve": {
            const err = params.error||{}; cog.errors.push({ts:new Date().toISOString(),...err});
            return ok({ preserved:true, error:err, total_errors:cog.errors.length, learn_from:params.learn_from??true });
          }
          case "session_start_full": {
            const state = loadJSON(path.join(STATE_DIR,"CURRENT_STATE.json"));
            await fireHook("STATE-BEFORE-MUTATE-001", {operation:"session_start"});
            
            // D5: Run session_lifecycle.py for full start protocol (includes context_dna)
            let lifecycleResult: any = null;
            try {
              const { execSync } = await import("child_process");
              const output = execSync(
                `"${PATHS.PYTHON}" "${path.join(PATHS.SCRIPTS_CORE, "session_lifecycle.py")}" start --json`,
                { encoding: 'utf-8', timeout: 15000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }
              );
              lifecycleResult = JSON.parse(output.trim());
            } catch { /* non-fatal — basic start still works */ }
            
            return ok({ 
              status: "SESSION STARTED", 
              state_loaded: !!state, 
              quickResume: state?.quickResume || "No previous state",
              lifecycle: lifecycleResult,
              context_dna: lifecycleResult?.context_dna || null,
              _hint: "Session fully initialized. Use prism_context→todo_update to set task focus."
            });
          }
          case "session_end_full": {
            const state = loadJSON(path.join(STATE_DIR,"CURRENT_STATE.json"))||{};
            state.status = "ENDED"; state.endedAt = new Date().toISOString();
            state.files_saved = params.files_saved||[]; state.next_focus = params.next_session_focus;
            
            // D5: Run session_lifecycle.py for full end protocol (handoff doc + quality scores)
            let lifecycleResult: any = null;
            try {
              const { execSync } = await import("child_process");
              const endArgs = [
                "end",
                "--json",
                ...(params.next_session_focus ? ["--next", params.next_session_focus] : []),
                ...(params.tasks_completed ? ["--summary", JSON.stringify(params.tasks_completed)] : [])
              ];
              const output = execSync(
                `"${PATHS.PYTHON}" "${path.join(PATHS.SCRIPTS_CORE, "session_lifecycle.py")}" ${endArgs.join(" ")}`,
                { encoding: 'utf-8', timeout: 15000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }
              );
              lifecycleResult = JSON.parse(output.trim());
            } catch { /* non-fatal — basic end still works */ }
            
            // D5: Run next_session_prep for handoff
            let nextPrep: any = null;
            try {
              const { execSync } = await import("child_process");
              const prepOutput = execSync(
                `"${PATHS.PYTHON}" "${path.join(PATHS.SCRIPTS_CORE, "next_session_prep.py")}" generate --json --save`,
                { encoding: 'utf-8', timeout: 15000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }
              );
              nextPrep = JSON.parse(prepOutput.trim());
            } catch { /* non-fatal */ }
            
            saveJSON(path.join(STATE_DIR,"CURRENT_STATE.json"), state);
            return ok({ 
              status: "SESSION ENDED", 
              files: params.files_saved, 
              completed: params.tasks_completed, 
              next: params.next_session_focus,
              lifecycle: lifecycleResult,
              next_session_prep: nextPrep,
              _hint: "Session ended. Handoff prepared for next session."
            });
          }
          case "evidence_level": {
            const levels: Record<string,number> = {L1_CLAIM:1,L2_LISTING:2,L3_SAMPLE:3,L4_REPRODUCIBLE:4,L5_VERIFIED:5};
            const lvl = levels[params.evidence_type]||1;
            cog.metrics.omega = omega(cog.metrics);
            return ok({ claim:params.claim, level:params.evidence_type, numeric:lvl, sufficient:lvl>=3, evidence:params.evidence_data||"none", rule:"Minimum L3 for COMPLETE claims" });
          }
          case "validate_gates_full": {
            const sg = safetyGate(params.safety_score||0);
            const gates = { G1_c_drive:params.c_drive_accessible, G2_state:params.state_file_valid, G3_input:params.input_understood, G4_skills:params.skills_available, G5_output:params.output_on_c, G6_evidence:params.evidence_exists, G7_replacement:params.replacement_gte_original, G8_safety:sg.pass, G9_omega:(params.omega_score||0)>=0.70 };
            return ok({ gates, all_passed:Object.values(gates).every(Boolean), safety:sg, omega:params.omega_score });
          }
          case "validate_mathplan": {
            const checks = { decomposition:params.decomposition_complete, dependencies:params.dependencies_mapped, effort:params.effort_estimated, risks:params.risks_identified, scope:params.scope_quantified };
            return ok({ checks, all_passed:Object.values(checks).every(Boolean), gate:Object.values(checks).every(Boolean)?"MATHPLAN PASSED":"MATHPLAN FAILED" });
          }
          default: return ok({ error:`Unknown action: ${action}`, available:ACTIONS });
        }
      } catch(error) { return dispatcherError(error, action, "prism_sp"); }
    }
  );
}
