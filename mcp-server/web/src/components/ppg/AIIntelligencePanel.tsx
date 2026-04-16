/**
 * AIIntelligencePanel — PP-AI Orchestrator Integration
 *
 * Provides Claude Opus-level AI intelligence for post processor generation:
 * - Intent classification from natural language queries
 * - Expert rules validation with safety/quality/compatibility checks
 * - Neural multi-objective optimization with Pareto front
 * - Proactive suggestions based on G-code analysis
 * - Deep learning pattern recognition results
 *
 * @module components/ppg/AIIntelligencePanel
 */
import { useState, useCallback, useEffect } from "react";
import { Button, Input, Spinner, Badge } from "../ui";
import { useToast } from "../ui/Toast";

// ============================================================================
// TYPES
// ============================================================================

interface AIIntelligencePanelProps {
  gcode: string;
  controller?: string;
  materialIso?: string;
  onApplyRecommendation?: (recommendation: AppliedRecommendation) => void;
}

interface AppliedRecommendation {
  type: "gcode_fix" | "optimization" | "setting_change";
  code?: string;
  description: string;
}

interface IntentClassification {
  primary_intent: string;
  confidence: number;
  secondary_intents: { intent: string; confidence: number }[];
  entities: {
    controllers: string[];
    materials: string[];
    operations: string[];
    issues: string[];
  };
  requires_gcode: boolean;
  complexity: string;
}

interface ExpertRuleResult {
  rule_id: string;
  rule_name: string;
  category: string;
  triggered: boolean;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  recommendation?: string;
  gcode_fix?: string;
}

interface NeuralOptimizationResult {
  original_metrics: {
    cycle_time: number;
    tool_life: number;
    surface_quality: number;
    safety_score: number;
  };
  optimized_metrics: {
    cycle_time: number;
    tool_life: number;
    surface_quality: number;
    safety_score: number;
  };
  pareto_solutions: {
    id: string;
    metrics: Record<string, number>;
    trade_off: string;
  }[];
  recommended_solution: string;
  confidence: number;
}

interface OrchestratorResponse {
  query: string;
  intent: IntentClassification;
  response: {
    summary: string;
    detailed_explanation?: string;
    recommendations: {
      priority: number;
      action: string;
      reason: string;
      impact: string;
    }[];
    code_blocks: { language: string; code: string; description: string }[];
    warnings: { severity: string; message: string }[];
  };
  analysis: {
    expert_rules?: ExpertRuleResult[];
    neural_optimization?: NeuralOptimizationResult;
    consensus_score: number;
  };
  proactive_suggestions: string[];
  confidence: number;
  processing_time_ms: number;
}

const API_BASE = "/api/v1/cam";

// ============================================================================
// SEVERITY COLORS
// ============================================================================

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-600 text-white",
  error: "bg-red-500 text-white",
  warning: "bg-amber-500 text-black",
  info: "bg-cyan-500 text-black",
};

const CATEGORY_COLORS: Record<string, string> = {
  safety: "border-red-500/50",
  optimization: "border-cyan-500/50",
  quality: "border-emerald-500/50",
  compatibility: "border-violet-500/50",
  best_practice: "border-amber-500/50",
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function AIIntelligencePanel({
  gcode,
  controller = "fanuc",
  materialIso = "P",
  onApplyRecommendation,
}: AIIntelligencePanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<OrchestratorResponse | null>(null);
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  // Auto-analyze when G-code changes (debounced)
  useEffect(() => {
    if (!autoAnalyze || !gcode.trim() || gcode.length < 50) return;

    const timer = setTimeout(() => {
      runAnalysis("analyze quality and safety of this G-code");
    }, 1500);

    return () => clearTimeout(timer);
  }, [gcode, autoAnalyze]);

  const runAnalysis = useCallback(
    async (queryText: string) => {
      if (!gcode.trim()) {
        toast("No G-code to analyze", "warning");
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(API_BASE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "pp_ai_orchestrate",
            query: queryText,
            gcode,
            controller,
            material_iso: materialIso,
            output_mode: "structured",
          }),
        });

        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }

        const data = await res.json();
        if (data.result) {
          setResult(data.result);
        } else if (data.error) {
          toast(`Analysis failed: ${data.error}`, "error");
        }
      } catch (err) {
        toast(`Analysis error: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
      } finally {
        setLoading(false);
      }
    },
    [gcode, controller, materialIso, toast]
  );

  const handleQuerySubmit = () => {
    if (query.trim()) {
      runAnalysis(query);
    }
  };

  const applyFix = (ruleId: string, fix: string) => {
    onApplyRecommendation?.({
      type: "gcode_fix",
      code: fix,
      description: `Applied fix for ${ruleId}`,
    });
    toast(`Applied fix for ${ruleId}`, "success");
  };

  // Quick action buttons
  const quickActions = [
    { label: "Validate Safety", query: "validate safety of this program" },
    { label: "Optimize Speed", query: "optimize for faster cycle time" },
    { label: "Check Quality", query: "analyze quality and surface finish" },
    { label: "Troubleshoot", query: "troubleshoot any issues in this code" },
  ];

  // Knowledge base state
  const [kbLoading, setKbLoading] = useState(false);
  const [kbResult, setKbResult] = useState<unknown>(null);
  const [kbSearch, setKbSearch] = useState("");
  const [showKB, setShowKB] = useState(false);

  // Knowledge base lookup
  const searchKnowledgeBase = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setKbLoading(true);
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pp_kb_search",
          query: searchQuery,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setKbResult(data.result);
      }
    } catch (err) {
      console.error("KB search error:", err);
    } finally {
      setKbLoading(false);
    }
  }, []);

  const getEntryFunction = useCallback(async (funcName: string) => {
    setKbLoading(true);
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pp_kb_get_entry_function",
          function_name: funcName,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setKbResult(data.result);
      }
    } catch (err) {
      console.error("KB lookup error:", err);
    } finally {
      setKbLoading(false);
    }
  }, []);

  const getDrillingCycle = useCallback(async (cycleType: string) => {
    setKbLoading(true);
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pp_kb_get_drilling_cycle",
          cycle_type: cycleType,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setKbResult(data.result);
      }
    } catch (err) {
      console.error("KB lookup error:", err);
    } finally {
      setKbLoading(false);
    }
  }, []);

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            AI Intelligence
          </span>
        </div>
        <label className="flex items-center gap-1 text-[10px] text-slate-500">
          <input
            type="checkbox"
            checked={autoAnalyze}
            onChange={(e) => setAutoAnalyze(e.target.checked)}
            className="w-3 h-3 rounded border-slate-600"
          />
          Auto-analyze
        </label>
      </div>

      {/* Query Input */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Ask about your G-code..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleQuerySubmit()}
          className="flex-1 text-xs bg-slate-800 border-slate-700"
        />
        <Button
          onClick={handleQuerySubmit}
          disabled={loading || !query.trim()}
          className="px-3 text-xs"
        >
          {loading ? <Spinner size="sm" /> : "Ask"}
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-1">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => runAnalysis(action.query)}
            disabled={loading}
            className="px-2 py-1 text-[10px] rounded bg-slate-800/50 border border-slate-700/50
              hover:bg-slate-700/50 hover:border-cyan-500/30 transition-colors"
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <Spinner />
          <span className="ml-2 text-xs text-slate-400">Analyzing with AI...</span>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="flex flex-col gap-3 mt-2">
          {/* Summary */}
          <div className="p-3 rounded-lg bg-slate-800/50 border border-cyan-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-cyan-400">Analysis Summary</span>
              <Badge
                variant={result.confidence > 0.8 ? "success" : result.confidence > 0.5 ? "warning" : "error"}
                className="text-[10px]"
              >
                {Math.round(result.confidence * 100)}% confidence
              </Badge>
            </div>
            <p className="text-sm text-slate-300">{result.response.summary}</p>
            <div className="mt-2 text-[10px] text-slate-500">
              Intent: {result.intent.primary_intent} | {result.processing_time_ms}ms
            </div>
          </div>

          {/* Expert Rules */}
          {result.analysis.expert_rules && result.analysis.expert_rules.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-slate-400">Expert Rules Check</span>
              {result.analysis.expert_rules
                .filter((r) => r.triggered)
                .map((rule) => (
                  <div
                    key={rule.rule_id}
                    className={`p-2 rounded border ${CATEGORY_COLORS[rule.category] || "border-slate-700"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={`${SEVERITY_COLORS[rule.severity]} text-[10px] px-1.5`}>
                            {rule.severity.toUpperCase()}
                          </Badge>
                          <span className="text-xs font-medium text-slate-300">{rule.rule_name}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">{rule.message}</p>
                        {rule.recommendation && (
                          <p className="mt-1 text-[11px] text-emerald-400">
                            ▸ {rule.recommendation}
                          </p>
                        )}
                      </div>
                      {rule.gcode_fix && (
                        <Button
                          onClick={() => applyFix(rule.rule_id, rule.gcode_fix!)}
                          className="text-[10px] px-2 py-1"
                          variant="secondary"
                        >
                          Apply Fix
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Neural Optimization */}
          {result.analysis.neural_optimization && (
            <div className="p-3 rounded-lg bg-slate-800/30 border border-violet-500/20">
              <span className="text-xs font-medium text-violet-400">Neural Optimization</span>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500">Cycle Time</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">
                      {result.analysis.neural_optimization.original_metrics.cycle_time}%
                    </span>
                    <span className="text-emerald-400">→</span>
                    <span className="text-emerald-400 font-medium">
                      {result.analysis.neural_optimization.optimized_metrics.cycle_time}%
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Tool Life</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">
                      {result.analysis.neural_optimization.original_metrics.tool_life}%
                    </span>
                    <span className="text-emerald-400">→</span>
                    <span className="text-emerald-400 font-medium">
                      {result.analysis.neural_optimization.optimized_metrics.tool_life}%
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Surface Quality</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">
                      {result.analysis.neural_optimization.original_metrics.surface_quality}%
                    </span>
                    <span className="text-emerald-400">→</span>
                    <span className="text-emerald-400 font-medium">
                      {result.analysis.neural_optimization.optimized_metrics.surface_quality}%
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Safety Score</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">
                      {result.analysis.neural_optimization.original_metrics.safety_score}%
                    </span>
                    <span className="text-emerald-400">→</span>
                    <span className="text-emerald-400 font-medium">
                      {result.analysis.neural_optimization.optimized_metrics.safety_score}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-slate-500">
                Recommendation: {result.analysis.neural_optimization.recommended_solution} solution
              </div>
            </div>
          )}

          {/* Recommendations */}
          {result.response.recommendations.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-slate-400">Recommendations</span>
              {result.response.recommendations.slice(0, 5).map((rec, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded bg-slate-800/30 border border-slate-700/50 text-[11px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 flex items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 text-[9px] font-bold">
                      {rec.priority}
                    </span>
                    <span className="text-slate-300">{rec.action}</span>
                  </div>
                  <p className="mt-1 pl-6 text-slate-500">{rec.reason}</p>
                </div>
              ))}
            </div>
          )}

          {/* Proactive Suggestions */}
          {result.proactive_suggestions.length > 0 && (
            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
              <span className="text-[10px] font-medium text-amber-400">Proactive Suggestions</span>
              <ul className="mt-1 space-y-1">
                {result.proactive_suggestions.map((suggestion, idx) => (
                  <li key={idx} className="text-[11px] text-slate-400 flex items-start gap-1">
                    <span className="text-amber-500">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {result.response.warnings.length > 0 && (
            <div className="p-2 rounded bg-red-500/10 border border-red-500/30">
              <span className="text-[10px] font-medium text-red-400">Warnings</span>
              <ul className="mt-1 space-y-1">
                {result.response.warnings.map((warning, idx) => (
                  <li key={idx} className="text-[11px] text-red-300 flex items-start gap-1">
                    <span className="text-red-500">⚠</span>
                    {warning.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Toggle Details */}
          {result.response.detailed_explanation && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-[10px] text-cyan-400 hover:underline self-start"
            >
              {showDetails ? "Hide details" : "Show detailed explanation"}
            </button>
          )}
          {showDetails && result.response.detailed_explanation && (
            <div className="p-2 rounded bg-slate-900/50 border border-slate-700/30 text-[11px] text-slate-400 whitespace-pre-wrap">
              {result.response.detailed_explanation}
            </div>
          )}

          {/* Code Blocks */}
          {result.response.code_blocks.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-slate-400">G-Code Fixes</span>
              {result.response.code_blocks.map((block, idx) => (
                <div key={idx} className="relative">
                  <div className="text-[10px] text-slate-500 mb-1">{block.description}</div>
                  <pre className="p-2 rounded bg-slate-900 border border-slate-700 text-[11px] text-emerald-400 overflow-x-auto">
                    {block.code}
                  </pre>
                  <Button
                    onClick={() =>
                      onApplyRecommendation?.({
                        type: "gcode_fix",
                        code: block.code,
                        description: block.description,
                      })
                    }
                    className="absolute top-6 right-2 text-[9px] px-1.5 py-0.5"
                    variant="secondary"
                  >
                    Copy
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <div className="py-6 text-center text-slate-500 text-xs">
          <p>Enter G-code and ask a question, or use quick actions above.</p>
          <p className="mt-1 text-[10px]">
            Powered by PP-AI: Deep Learning + Deep Reasoning + Ultimate AI
          </p>
        </div>
      )}

      {/* Knowledge Base Section */}
      <div className="border-t border-slate-700 mt-3 pt-3">
        <button
          onClick={() => setShowKB(!showKB)}
          className="flex items-center justify-between w-full text-xs font-medium text-slate-400 hover:text-slate-300"
        >
          <span>Knowledge Base</span>
          <span className="text-[10px] text-cyan-400">{showKB ? "[-]" : "[+]"}</span>
        </button>

        {showKB && (
          <div className="mt-2 flex flex-col gap-2">
            {/* KB Search */}
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Search KB (e.g., 'circular', 'tapping', 'tcp')"
                value={kbSearch}
                onChange={(e) => setKbSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchKnowledgeBase(kbSearch)}
                className="flex-1 text-xs bg-slate-800 border-slate-700"
              />
              <Button onClick={() => searchKnowledgeBase(kbSearch)} disabled={kbLoading}>
                {kbLoading ? <Spinner /> : "Search"}
              </Button>
            </div>

            {/* Quick KB Lookups */}
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] text-slate-500 w-full">Entry Functions:</span>
              {["onSection", "onCircular", "onCyclePoint", "onLinear5D"].map((fn) => (
                <button
                  key={fn}
                  onClick={() => getEntryFunction(fn)}
                  className="px-1.5 py-0.5 text-[9px] bg-slate-800 hover:bg-slate-700
                    rounded border border-slate-700 text-cyan-400"
                >
                  {fn}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] text-slate-500 w-full">Drilling Cycles:</span>
              {["deep-drilling", "tapping", "chip-breaking", "boring"].map((cycle) => (
                <button
                  key={cycle}
                  onClick={() => getDrillingCycle(cycle)}
                  className="px-1.5 py-0.5 text-[9px] bg-slate-800 hover:bg-slate-700
                    rounded border border-slate-700 text-emerald-400"
                >
                  {cycle}
                </button>
              ))}
            </div>

            {/* KB Result Display */}
            {kbResult && (
              <div className="p-2 rounded bg-slate-900/50 border border-slate-700/30 max-h-48 overflow-y-auto">
                <KBResultDisplay data={kbResult} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// KB Result Display Component
// ============================================================================

interface KBResultDisplayProps {
  data: unknown;
}

function KBResultDisplay({ data }: KBResultDisplayProps) {
  if (!data) return null;

  // Entry function display
  if (typeof data === "object" && data !== null && "signature" in data) {
    const func = data as {
      name: string;
      signature: string;
      description: string;
      category: string;
      parameters: { name: string; type: string; description: string }[];
      commonPatterns: string[];
      bestPractices: string[];
      warnings: string[];
    };
    return (
      <div className="flex flex-col gap-2 text-[11px]">
        <div className="font-semibold text-cyan-400">{func.name}</div>
        <code className="text-[10px] text-slate-400 bg-slate-800 px-1 py-0.5 rounded">
          {func.signature}
        </code>
        <p className="text-slate-300">{func.description}</p>
        <div>
          <span className="text-slate-500">Category:</span>{" "}
          <Badge variant="secondary">{func.category}</Badge>
        </div>
        {func.parameters.length > 0 && (
          <div>
            <span className="text-slate-500">Parameters:</span>
            <ul className="ml-2 text-[10px]">
              {func.parameters.map((p, i) => (
                <li key={i}>
                  <span className="text-violet-400">{p.name}</span>
                  <span className="text-slate-500"> ({p.type})</span>
                  <span className="text-slate-400"> - {p.description}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {func.commonPatterns.length > 0 && (
          <div>
            <span className="text-slate-500">Common Patterns:</span>
            <ul className="ml-2 text-[10px] text-emerald-400">
              {func.commonPatterns.slice(0, 3).map((p, i) => (
                <li key={i}>- {p}</li>
              ))}
            </ul>
          </div>
        )}
        {func.warnings.length > 0 && (
          <div>
            <span className="text-amber-500">Warnings:</span>
            <ul className="ml-2 text-[10px] text-amber-400">
              {func.warnings.map((w, i) => (
                <li key={i}>! {w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Drilling cycle display
  if (typeof data === "object" && data !== null && "cycleType" in data) {
    const cycle = data as {
      cycleType: string;
      description: string;
      gCode: string;
      parameters: { name: string; description: string; required: boolean }[];
      bestPractices: string[];
    };
    return (
      <div className="flex flex-col gap-2 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-emerald-400">{cycle.cycleType}</span>
          <Badge variant="secondary">{cycle.gCode}</Badge>
        </div>
        <p className="text-slate-300">{cycle.description}</p>
        {cycle.parameters.length > 0 && (
          <div>
            <span className="text-slate-500">Parameters:</span>
            <ul className="ml-2 text-[10px]">
              {cycle.parameters.map((p, i) => (
                <li key={i}>
                  <span className={p.required ? "text-violet-400" : "text-slate-400"}>
                    {p.name}
                  </span>
                  {p.required && <span className="text-red-400">*</span>}
                  <span className="text-slate-400"> - {p.description}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {cycle.bestPractices.length > 0 && (
          <div>
            <span className="text-slate-500">Best Practices:</span>
            <ul className="ml-2 text-[10px] text-cyan-400">
              {cycle.bestPractices.map((p, i) => (
                <li key={i}>- {p}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Search results display
  if (typeof data === "object" && data !== null && "entryFunctions" in data) {
    const results = data as {
      entryFunctions: { name: string; description: string }[];
      drillingCycles: { cycleType: string; gCode: string }[];
      upkSwitches: { name: string; description: string }[];
      miscValues: { id: string; name: string }[];
    };
    const totalFound =
      results.entryFunctions.length +
      results.drillingCycles.length +
      results.upkSwitches.length +
      results.miscValues.length;

    if (totalFound === 0) {
      return <p className="text-slate-500 text-[11px]">No matches found.</p>;
    }

    return (
      <div className="flex flex-col gap-2 text-[11px]">
        <div className="text-slate-400">Found {totalFound} matches:</div>
        {results.entryFunctions.length > 0 && (
          <div>
            <span className="text-cyan-400">Entry Functions:</span>
            <ul className="ml-2 text-[10px]">
              {results.entryFunctions.slice(0, 5).map((f, i) => (
                <li key={i} className="text-slate-300">
                  {f.name} - {f.description.slice(0, 60)}...
                </li>
              ))}
            </ul>
          </div>
        )}
        {results.drillingCycles.length > 0 && (
          <div>
            <span className="text-emerald-400">Drilling Cycles:</span>
            <ul className="ml-2 text-[10px]">
              {results.drillingCycles.slice(0, 5).map((c, i) => (
                <li key={i} className="text-slate-300">
                  {c.cycleType} ({c.gCode})
                </li>
              ))}
            </ul>
          </div>
        )}
        {results.upkSwitches.length > 0 && (
          <div>
            <span className="text-violet-400">UPK Switches:</span>
            <ul className="ml-2 text-[10px]">
              {results.upkSwitches.slice(0, 5).map((s, i) => (
                <li key={i} className="text-slate-300">
                  {s.name} - {s.description.slice(0, 50)}...
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Generic JSON display
  return (
    <pre className="text-[10px] text-slate-400 overflow-x-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
