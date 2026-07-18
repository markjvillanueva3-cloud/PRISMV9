// PRISM Multi-Agent Orchestrator v1.0
// React Artifact for Claude.ai
// 
// USAGE: Create new artifact in Claude, paste this code, save as .jsx
// Then run tasks like: "Add Inconel 718 with full 127-parameter coverage"

import React, { useState, useCallback } from 'react';
import { Play, CheckCircle, XCircle, Loader, Users, Brain, Shield, Code, Search, Copy } from 'lucide-react';

const AGENTS = {
  research: {
    name: 'Research Agent',
    icon: Search,
    color: 'text-blue-400',
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-500/10',
    systemPrompt: `You are the RESEARCH AGENT for PRISM Manufacturing Intelligence.

YOUR ROLE: Gather comprehensive data from authoritative sources.

CONTEXT: PRISM is safety-critical CNC manufacturing software. Wrong data = tool explosions, injury, death.

INSTRUCTIONS:
1. Search for data from multiple sources (ISO standards, ASM Handbook, manufacturers, MatWeb)
2. Extract ALL relevant parameters - NEVER skip data points
3. Note the source and confidence level for each value
4. Flag any conflicting values between sources
5. Prioritize: ISO standards > Manufacturer data > Academic papers > General references

OUTPUT FORMAT (strict JSON):
{
  "task_understood": "<restate the task>",
  "sources_consulted": ["source1", "source2"],
  "data_found": { "parameter_name": { "value": "<value>", "unit": "<unit>", "source": "<source>", "confidence": "HIGH|MEDIUM|LOW" } },
  "conflicts": [{"parameter": "", "source1_value": "", "source2_value": "", "recommendation": ""}],
  "gaps": ["parameters that could not be found"],
  "overall_confidence": "HIGH|MEDIUM|LOW",
  "notes": ""
}

CRITICAL: If data exists, include ALL of it. Completeness over convenience.`
  },
  
  physics: {
    name: 'Physics Validator',
    icon: Brain,
    color: 'text-purple-400',
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-500/10',
    systemPrompt: `You are the PHYSICS VALIDATION AGENT for PRISM Manufacturing Intelligence.

YOUR ROLE: Validate physical plausibility of all manufacturing parameters.

VALIDATION MODELS:
1. KIENZLE: Fc = kc1.1 × h^mc × b (kc1.1: Al 500-900, Steel 1400-2500, Stainless 2000-3000, Superalloys 2500-4000 N/mm²)
2. TAYLOR: VT^n = C (n: 0.1-0.4)
3. JOHNSON-COOK: σ = (A + Bε^n)(1 + C·ln(ε̇*))(1 - T*^m)

OUTPUT FORMAT (strict JSON):
{
  "validation_summary": "PASS|WARNINGS|FAIL",
  "checks_performed": [{ "check_name": "", "status": "VALID|WARNING|INVALID", "notes": "" }],
  "physics_predictions": { "cutting_force_at_1mm_doc": "", "expected_tool_life": "" },
  "critical_warnings": [],
  "overall_confidence": "HIGH|MEDIUM|LOW"
}

CRITICAL: Be rigorous. Question everything. Flag anything suspicious.`
  },
  
  code: {
    name: 'Code Generator',
    icon: Code,
    color: 'text-green-400',
    borderColor: 'border-green-500',
    bgColor: 'bg-green-500/10',
    systemPrompt: `You are the CODE GENERATION AGENT for PRISM Manufacturing Intelligence.

YOUR ROLE: Generate production-ready code artifacts from validated data.

CODE STANDARDS:
- TypeScript with strict types
- Complete JSDoc documentation
- No placeholders, no TODOs
- Every field populated or explicitly null with reason

OUTPUT FORMAT (strict JSON):
{
  "typescript_interface": "<complete interface>",
  "json_data": {<complete JSON object>},
  "validation_function": "<validation code>",
  "files_to_create": [{"path": "", "content": ""}]
}

CRITICAL: No incomplete code. Every field must have a value or null with documented reason.`
  },
  
  safety: {
    name: 'Safety Reviewer',
    icon: Shield,
    color: 'text-red-400',
    borderColor: 'border-red-500',
    bgColor: 'bg-red-500/10',
    systemPrompt: `You are the SAFETY REVIEW AGENT for PRISM Manufacturing Intelligence.

YOUR ROLE: Final quality gate. Your approval means this data is SAFE FOR PRODUCTION.

S(x) SAFETY SCORE:
- Physical Limits (0.20): All values within physically possible ranges
- Force Safety (0.20): Cutting forces won't exceed tool/machine limits
- Thermal Safety (0.15): Temperatures won't damage tool/workpiece
- Tool Life (0.15): Parameters give reasonable tool life (>5 min)
- Machine Capability (0.15): Typical machines can achieve these parameters
- Edge Cases (0.15): Behavior at min/max values is safe

HARD CONSTRAINT: S(x) MUST BE ≥ 0.70 TO APPROVE

OUTPUT FORMAT (strict JSON):
{
  "safety_score": <0.00-1.00>,
  "status": "APPROVED|BLOCKED",
  "component_scores": { "physical_limits": {"score": 0.0, "notes": ""}, ... },
  "critical_issues": [],
  "warnings": [],
  "final_statement": ""
}

CRITICAL: When in doubt, BLOCK. A false negative can KILL SOMEONE.`
  }
};

export default function PRISMOrchestrator() {
  const [task, setTask] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentAgent, setCurrentAgent] = useState(null);
  const [agentResults, setAgentResults] = useState({});
  const [finalResult, setFinalResult] = useState(null);
  const [error, setError] = useState(null);

  const callAgent = async (agentKey, taskContext, previousResults = {}) => {
    const agent = AGENTS[agentKey];
    setCurrentAgent(agentKey);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: agent.systemPrompt,
          messages: [{
            role: "user",
            content: `TASK: ${taskContext}\n\n${Object.keys(previousResults).length > 0 ? `PREVIOUS AGENT RESULTS:\n${JSON.stringify(previousResults, null, 2)}` : ''}\n\nExecute your role. Return ONLY valid JSON.`
          }]
        })
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      const resultText = data.content?.[0]?.text || '';
      
      let parsedResult;
      try {
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        parsedResult = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw_response: resultText, parse_error: "No JSON found" };
      } catch (parseError) {
        parsedResult = { raw_response: resultText, parse_error: parseError.message };
      }

      setAgentResults(prev => ({
        ...prev,
        [agentKey]: { status: 'complete', result: parsedResult, timestamp: new Date().toISOString() }
      }));

      return parsedResult;
    } catch (err) {
      setAgentResults(prev => ({
        ...prev,
        [agentKey]: { status: 'error', result: { error: err.message }, timestamp: new Date().toISOString() }
      }));
      throw err;
    }
  };

  const calculateOmega = (results) => {
    const R = results.research?.overall_confidence === 'HIGH' ? 0.90 : results.research?.overall_confidence === 'MEDIUM' ? 0.70 : 0.50;
    const C = results.code?.json_data ? 0.85 : 0.50;
    const P = Object.keys(results).length === 4 ? 0.90 : 0.60;
    const S = results.safety?.safety_score || 0;
    const L = 0.70;
    return (0.25 * R + 0.20 * C + 0.15 * P + 0.30 * S + 0.10 * L).toFixed(3);
  };

  const runOrchestration = useCallback(async () => {
    if (!task.trim()) return;
    
    setIsRunning(true);
    setAgentResults({});
    setFinalResult(null);
    setError(null);

    try {
      setAgentResults({ research: { status: 'pending' }, physics: { status: 'pending' }, code: { status: 'pending' }, safety: { status: 'pending' } });

      setAgentResults(prev => ({ ...prev, research: { status: 'running' } }));
      const researchResult = await callAgent('research', task);

      setAgentResults(prev => ({ ...prev, physics: { status: 'running' } }));
      const physicsResult = await callAgent('physics', task, { research: researchResult });

      setAgentResults(prev => ({ ...prev, code: { status: 'running' } }));
      const codeResult = await callAgent('code', task, { research: researchResult, physics: physicsResult });

      setAgentResults(prev => ({ ...prev, safety: { status: 'running' } }));
      const safetyResult = await callAgent('safety', task, { research: researchResult, physics: physicsResult, code: codeResult });

      const allResults = { research: researchResult, physics: physicsResult, code: codeResult, safety: safetyResult };
      const omegaScore = calculateOmega(allResults);
      const safetyScore = safetyResult?.safety_score || 0;
      const isApproved = safetyResult?.status === 'APPROVED' && parseFloat(omegaScore) >= 0.70;

      setFinalResult({
        task,
        timestamp: new Date().toISOString(),
        omega_score: parseFloat(omegaScore),
        safety_score: safetyScore,
        status: isApproved ? 'APPROVED' : 'NEEDS_REVIEW',
        status_reason: !isApproved ? (safetyScore < 0.70 ? `Safety score ${safetyScore} below 0.70` : parseFloat(omegaScore) < 0.70 ? `Omega ${omegaScore} below 0.70` : 'Safety agent did not approve') : 'All quality gates passed',
        agents: allResults
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRunning(false);
      setCurrentAgent(null);
    }
  }, [task]);

  const StatusBadge = ({ status }) => {
    const styles = { pending: 'bg-gray-600 text-gray-200', running: 'bg-blue-600 text-white animate-pulse', complete: 'bg-green-600 text-white', error: 'bg-red-600 text-white' };
    const labels = { pending: 'Pending', running: 'Running', complete: 'Complete', error: 'Error' };
    return <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || styles.pending}`}>{labels[status] || 'Unknown'}</span>;
  };

  const copyToClipboard = (text) => navigator.clipboard.writeText(typeof text === 'string' ? text : JSON.stringify(text, null, 2));

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold">PRISM Multi-Agent Orchestrator</h1>
            <p className="text-gray-400 text-sm">Parallel agent execution with quality gates</p>
          </div>
          <span className="ml-auto px-3 py-1 bg-blue-600 rounded text-sm">v1.0</span>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <label className="block text-sm text-gray-400 mb-2">Task Description</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="text" value={task} onChange={(e) => setTask(e.target.value)} placeholder="e.g., Add Inconel 718 with full 127-parameter coverage" className="flex-1 bg-gray-700 border border-gray-600 rounded px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none" disabled={isRunning} onKeyDown={(e) => e.key === 'Enter' && !isRunning && runOrchestration()} />
            <button onClick={runOrchestration} disabled={isRunning || !task.trim()} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-medium flex items-center justify-center gap-2 transition-colors">
              {isRunning ? <><Loader className="w-5 h-5 animate-spin" />Running...</> : <><Play className="w-5 h-5" />Execute</>}
            </button>
          </div>
        </div>

        {error && <div className="bg-red-900/50 border border-red-500 rounded-lg p-4"><div className="flex items-center gap-2 text-red-400"><XCircle className="w-5 h-5" /><span className="font-medium">Error</span></div><p className="mt-2 text-red-200">{error}</p></div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(AGENTS).map(([key, agent]) => {
            const result = agentResults[key];
            const Icon = agent.icon;
            return (
              <div key={key} className={`bg-gray-800 rounded-lg p-4 border-l-4 ${agent.borderColor} ${currentAgent === key ? 'ring-2 ring-blue-500' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded ${agent.bgColor}`}><Icon className={`w-5 h-5 ${agent.color}`} /></div>
                    <span className="font-medium">{agent.name}</span>
                  </div>
                  <StatusBadge status={result?.status} />
                </div>
                {result?.status === 'running' && <div className="flex items-center gap-2 text-blue-400 text-sm"><Loader className="w-4 h-4 animate-spin" />Processing...</div>}
                {result?.status === 'complete' && result.result && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Result preview</span>
                      <button onClick={() => copyToClipboard(result.result)} className="flex items-center gap-1 hover:text-gray-300"><Copy className="w-3 h-3" />Copy</button>
                    </div>
                    <div className="bg-gray-900 rounded p-2 text-xs text-gray-300 max-h-32 overflow-y-auto font-mono">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(result.result, null, 2).slice(0, 500)}{JSON.stringify(result.result, null, 2).length > 500 ? '\n...' : ''}</pre>
                    </div>
                  </div>
                )}
                {result?.status === 'error' && <div className="mt-2 text-red-400 text-sm">{result.result?.error || 'Unknown error'}</div>}
              </div>
            );
          })}
        </div>

        {finalResult && (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className={`p-4 ${finalResult.status === 'APPROVED' ? 'bg-green-900/50' : 'bg-yellow-900/50'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {finalResult.status === 'APPROVED' ? <CheckCircle className="w-8 h-8 text-green-400" /> : <XCircle className="w-8 h-8 text-yellow-400" />}
                  <div><div className="text-2xl font-bold">{finalResult.status}</div><div className="text-sm text-gray-400">{finalResult.status_reason}</div></div>
                </div>
                <div className="flex gap-6">
                  <div className="text-center"><div className="text-xs text-gray-400">Ω(x) Score</div><div className={`text-2xl font-bold ${finalResult.omega_score >= 0.70 ? 'text-green-400' : 'text-yellow-400'}`}>{finalResult.omega_score.toFixed(3)}</div></div>
                  <div className="text-center"><div className="text-xs text-gray-400">S(x) Safety</div><div className={`text-2xl font-bold ${finalResult.safety_score >= 0.70 ? 'text-green-400' : 'text-red-400'}`}>{finalResult.safety_score.toFixed(3)}</div></div>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Complete Result</span>
                <button onClick={() => copyToClipboard(finalResult)} className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"><Copy className="w-4 h-4" />Copy Full JSON</button>
              </div>
              <div className="bg-gray-900 rounded p-4 max-h-96 overflow-y-auto"><pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">{JSON.stringify(finalResult, null, 2)}</pre></div>
            </div>
          </div>
        )}

        <div className="text-center text-xs text-gray-600">PRISM Manufacturing Intelligence • Safety Score ≥ 0.70 Required • Ω(x) ≥ 0.70 Threshold</div>
      </div>
    </div>
  );
}
