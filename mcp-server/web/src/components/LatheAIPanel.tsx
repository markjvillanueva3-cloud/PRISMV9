/**
 * LatheAIPanel — AI-powered assistance panel for lathe results
 * Provides troubleshooting, optimization, translation, and natural language queries.
 */

import { useCallback, useState } from 'react';
import { ActionButton, PanelCard, StatusPill } from './workspace/WorkspacePrimitives';
import { useLatheAI } from '../hooks/useLatheAI';

// ── Types ───────────────────────────────────────────────────────────────────

interface LatheAIPanelProps {
  controller: string;
  gcode: string;
  material?: string;
  machineName?: string;
}

type AIFeature = 'ask' | 'debug' | 'optimize' | 'translate' | 'troubleshoot' | 'cycle';

const CONTROLLER_OPTIONS = [
  { id: 'fanuc_oi_tf', label: 'Fanuc 0i-TF' },
  { id: 'fanuc_0m', label: 'Fanuc 0M' },
  { id: 'fanuc_16t', label: 'Fanuc 16T' },
  { id: 'fanuc_31i_a', label: 'Fanuc 31i-A' },
  { id: 'okuma_osp_p300', label: 'Okuma OSP-P300' },
  { id: 'okuma_osp_200', label: 'Okuma OSP-200' },
  { id: 'mazak_mazatrol', label: 'Mazak Mazatrol' },
  { id: 'mazak_matrix', label: 'Mazak Matrix' },
  { id: 'haas_ngc', label: 'Haas NGC' },
  { id: 'siemens_840d', label: 'Siemens 840D' },
  { id: 'siemens_828d', label: 'Siemens 828D' },
  { id: 'dmg_celos', label: 'DMG CELOS' },
  { id: 'hurco_winmax', label: 'Hurco WinMax' },
  { id: 'doosan_fanuc', label: 'Doosan (Fanuc)' },
];

// ── Component ───────────────────────────────────────────────────────────────

export function LatheAIPanel({ controller, gcode, material, machineName }: LatheAIPanelProps) {
  const [activeFeature, setActiveFeature] = useState<AIFeature>('ask');
  const [query, setQuery] = useState('');
  const [targetController, setTargetController] = useState('okuma_osp_p300');
  const [operation, setOperation] = useState('roughing');

  const ai = useLatheAI({ controller, gcode });

  const handleAskQuestion = useCallback(() => {
    if (query.trim()) {
      ai.askQuestion(query);
    }
  }, [ai, query]);

  const handleTroubleshoot = useCallback(() => {
    if (query.trim()) {
      ai.troubleshoot(query);
    }
  }, [ai, query]);

  const features: { id: AIFeature; label: string; icon: string }[] = [
    { id: 'ask', label: 'Ask AI', icon: '\u{1F4AC}' },
    { id: 'debug', label: 'Debug Code', icon: '\u{1F50D}' },
    { id: 'optimize', label: 'Optimize', icon: '\u{26A1}' },
    { id: 'translate', label: 'Translate', icon: '\u{1F504}' },
    { id: 'troubleshoot', label: 'Troubleshoot', icon: '\u{1F6E0}' },
    { id: 'cycle', label: 'Suggest Cycle', icon: '\u{1F504}' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Feature tabs */}
      <div className="flex flex-wrap gap-2">
        {features.map(f => (
          <button
            key={f.id}
            type="button"
            onClick={() => setActiveFeature(f.id)}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              activeFeature === f.id
                ? 'border-violet-400/30 bg-violet-500/20 text-violet-200'
                : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
            }`}
          >
            <span>{f.icon}</span>
            {f.label}
          </button>
        ))}
      </div>

      {/* Context info */}
      <div className="flex gap-3 text-xs text-slate-400">
        <span>Controller: <span className="text-slate-200">{controller}</span></span>
        {material && <span>Material: <span className="text-slate-200">{material}</span></span>}
        {machineName && <span>Machine: <span className="text-slate-200">{machineName}</span></span>}
        <span>G-code lines: <span className="text-slate-200">{gcode.split('\n').length}</span></span>
      </div>

      {/* Ask AI */}
      {activeFeature === 'ask' && (
        <PanelCard title="Ask AI About Your Code" subtitle="Natural language queries about your G-code program">
          <div className="flex flex-col gap-3">
            <textarea
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ask anything about your G-code... e.g., 'What speed is being used for roughing?' or 'Is this program safe for 4140 steel?'"
              className="min-h-[100px] w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:border-violet-400/50 focus:outline-none"
            />
            <ActionButton onClick={handleAskQuestion} disabled={ai.queryLoading || !query.trim()}>
              {ai.queryLoading ? 'Asking...' : 'Ask AI'}
            </ActionButton>

            {ai.queryError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {ai.queryError}
              </div>
            )}

            {ai.queryResult && (
              <div className="flex flex-col gap-3 rounded-lg border border-violet-400/20 bg-violet-500/5 p-4">
                <div>
                  <h4 className="text-sm font-semibold text-violet-200">Answer</h4>
                  <p className="mt-1 text-sm text-slate-300">{ai.queryResult.answer}</p>
                </div>
                {ai.queryResult.reasoning && (
                  <div>
                    <h4 className="text-sm font-semibold text-violet-200">Reasoning</h4>
                    <p className="mt-1 text-sm text-slate-400">{ai.queryResult.reasoning}</p>
                  </div>
                )}
                {ai.queryResult.followUpQuestions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-violet-200">Follow-up Questions</h4>
                    <ul className="mt-1 list-inside list-disc text-sm text-slate-400">
                      {ai.queryResult.followUpQuestions.map((q, i) => (
                        <li key={i} className="cursor-pointer hover:text-violet-300" onClick={() => setQuery(q)}>
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </PanelCard>
      )}

      {/* Debug Code */}
      {activeFeature === 'debug' && (
        <PanelCard title="Debug G-Code" subtitle="AI-powered analysis to find issues in your program">
          <div className="flex flex-col gap-3">
            <ActionButton onClick={ai.runDebug} disabled={ai.debugLoading}>
              {ai.debugLoading ? 'Analyzing...' : 'Analyze Code for Issues'}
            </ActionButton>

            {ai.debugError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {ai.debugError}
              </div>
            )}

            {ai.debugResult && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">Safety Rating:</span>
                  <StatusPill
                    label={`${Math.round(ai.debugResult.safetyRating * 100)}%`}
                    tone={ai.debugResult.safetyRating >= 0.9 ? 'emerald' : ai.debugResult.safetyRating >= 0.7 ? 'amber' : 'rose'}
                  />
                </div>
                <p className="text-sm text-slate-300">{ai.debugResult.summary}</p>
                {ai.debugResult.issues.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <h4 className="text-sm font-semibold text-slate-200">Issues Found ({ai.debugResult.issues.length})</h4>
                    {ai.debugResult.issues.map((issue, i) => (
                      <div
                        key={i}
                        className={`rounded-lg border p-3 ${
                          issue.severity === 'error'
                            ? 'border-red-500/30 bg-red-500/10'
                            : issue.severity === 'warning'
                            ? 'border-amber-500/30 bg-amber-500/10'
                            : 'border-blue-500/30 bg-blue-500/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <StatusPill
                            label={issue.severity}
                            tone={issue.severity === 'error' ? 'rose' : issue.severity === 'warning' ? 'amber' : 'sky'}
                          />
                          <span className="text-xs text-slate-400">Line {issue.line}</span>
                        </div>
                        <p className="mt-1 font-mono text-xs text-slate-300">{issue.code}</p>
                        <p className="mt-1 text-sm text-slate-200">{issue.issue}</p>
                        <p className="mt-1 text-sm text-emerald-300">Suggestion: {issue.suggestion}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                    No issues found! Your code looks good.
                  </div>
                )}
              </div>
            )}
          </div>
        </PanelCard>
      )}

      {/* Optimize */}
      {activeFeature === 'optimize' && (
        <PanelCard title="Optimize G-Code" subtitle="AI suggestions to improve cycle time and efficiency">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <ActionButton onClick={() => ai.runOptimize()} disabled={ai.optimizeLoading}>
                {ai.optimizeLoading ? 'Optimizing...' : 'Run Full Optimization'}
              </ActionButton>
              <ActionButton onClick={() => ai.runOptimize(['modal_grouping'])} disabled={ai.optimizeLoading}>
                Modal Grouping
              </ActionButton>
              <ActionButton onClick={() => ai.runOptimize(['rapid_combining'])} disabled={ai.optimizeLoading}>
                Combine Rapids
              </ActionButton>
              <ActionButton onClick={() => ai.runOptimize(['cycle_selection'])} disabled={ai.optimizeLoading}>
                Cycle Selection
              </ActionButton>
            </div>

            {ai.optimizeError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {ai.optimizeError}
              </div>
            )}

            {ai.optimizeResult && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">Estimated Time Savings:</span>
                  <span className="text-sm font-semibold text-emerald-300">{ai.optimizeResult.estimatedTimeSavings}</span>
                </div>

                {ai.optimizeResult.improvements.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h4 className="text-sm font-semibold text-slate-200">Improvements Applied ({ai.optimizeResult.improvements.length})</h4>
                    {ai.optimizeResult.improvements.map((imp, i) => (
                      <div key={i} className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                        <div className="flex items-center gap-2">
                          <StatusPill label={imp.type} tone="emerald" />
                          <span className="text-xs text-slate-400">{imp.linesAffected.length} lines affected</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-300">{imp.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {ai.optimizeResult.safetyNotes.length > 0 && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <h4 className="text-sm font-semibold text-amber-200">Safety Notes</h4>
                    <ul className="mt-1 list-inside list-disc text-sm text-slate-300">
                      {ai.optimizeResult.safetyNotes.map((note, i) => (
                        <li key={i}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                  <h4 className="mb-2 text-sm font-semibold text-slate-200">Optimized Code</h4>
                  <pre className="max-h-[300px] overflow-auto font-mono text-xs text-emerald-300">
                    {ai.optimizeResult.optimizedCode}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </PanelCard>
      )}

      {/* Translate */}
      {activeFeature === 'translate' && (
        <PanelCard title="Translate G-Code" subtitle="Convert your program to a different controller dialect">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-400">Target Controller:</label>
              <select
                value={targetController}
                onChange={e => setTargetController(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200 focus:border-violet-400/50 focus:outline-none"
              >
                {CONTROLLER_OPTIONS.filter(c => c.id !== controller).map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <ActionButton onClick={() => ai.runTranslate(targetController)} disabled={ai.translateLoading}>
              {ai.translateLoading ? 'Translating...' : `Translate to ${CONTROLLER_OPTIONS.find(c => c.id === targetController)?.label ?? targetController}`}
            </ActionButton>

            {ai.translateError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {ai.translateError}
              </div>
            )}

            {ai.translateResult && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-400">{ai.translateResult.sourceController}</span>
                  <span className="text-violet-400">→</span>
                  <span className="text-slate-200">{ai.translateResult.targetController}</span>
                </div>

                {ai.translateResult.changes.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h4 className="text-sm font-semibold text-slate-200">Changes Made ({ai.translateResult.changes.length})</h4>
                    {ai.translateResult.changes.slice(0, 10).map((change, i) => (
                      <div key={i} className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-2">
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="text-red-300 line-through">{change.original}</span>
                          <span className="text-violet-400">→</span>
                          <span className="text-emerald-300">{change.translated}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{change.reason}</p>
                      </div>
                    ))}
                    {ai.translateResult.changes.length > 10 && (
                      <p className="text-xs text-slate-500">...and {ai.translateResult.changes.length - 10} more changes</p>
                    )}
                  </div>
                )}

                {ai.translateResult.warnings.length > 0 && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <h4 className="text-sm font-semibold text-amber-200">Warnings</h4>
                    <ul className="mt-1 list-inside list-disc text-sm text-slate-300">
                      {ai.translateResult.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                  <h4 className="mb-2 text-sm font-semibold text-slate-200">Translated Code</h4>
                  <pre className="max-h-[300px] overflow-auto font-mono text-xs text-emerald-300">
                    {ai.translateResult.translatedCode}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </PanelCard>
      )}

      {/* Troubleshoot */}
      {activeFeature === 'troubleshoot' && (
        <PanelCard title="Troubleshoot Issues" subtitle="Deep AI reasoning for complex machining problems">
          <div className="flex flex-col gap-3">
            <textarea
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Describe your problem... e.g., 'The surface finish is too rough on the OD' or 'Getting chatter on the finishing pass'"
              className="min-h-[100px] w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:border-violet-400/50 focus:outline-none"
            />
            <ActionButton onClick={handleTroubleshoot} disabled={ai.troubleshootLoading || !query.trim()}>
              {ai.troubleshootLoading ? 'Analyzing...' : 'Troubleshoot Problem'}
            </ActionButton>

            {ai.troubleshootError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {ai.troubleshootError}
              </div>
            )}

            {ai.troubleshootResult && (
              <div className="flex flex-col gap-3">
                {ai.troubleshootResult.chain.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h4 className="text-sm font-semibold text-slate-200">Reasoning Chain</h4>
                    {ai.troubleshootResult.chain.map((step, i) => (
                      <div key={i} className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/30 text-xs font-bold text-violet-200">
                            {step.step}
                          </span>
                          <span className="text-sm font-medium text-violet-200">Step {step.step}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">{step.thought}</p>
                        <p className="mt-1 text-sm font-medium text-emerald-300">{step.conclusion}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-emerald-200">Final Answer</h4>
                    <StatusPill label={`${Math.round(ai.troubleshootResult.confidence * 100)}% confidence`} tone="emerald" />
                  </div>
                  <p className="mt-2 text-sm text-slate-200">{ai.troubleshootResult.finalAnswer}</p>
                </div>

                {ai.troubleshootResult.alternatives.length > 0 && (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <h4 className="text-sm font-semibold text-slate-200">Alternative Solutions</h4>
                    <ul className="mt-1 list-inside list-disc text-sm text-slate-300">
                      {ai.troubleshootResult.alternatives.map((alt, i) => (
                        <li key={i}>{alt}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </PanelCard>
      )}

      {/* Cycle Recommendation */}
      {activeFeature === 'cycle' && (
        <PanelCard title="Suggest Canned Cycle" subtitle="Get the optimal canned cycle for your operation">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-400">Operation:</label>
              <select
                value={operation}
                onChange={e => setOperation(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200 focus:border-violet-400/50 focus:outline-none"
              >
                <option value="roughing">Roughing</option>
                <option value="finishing">Finishing</option>
                <option value="threading">Threading</option>
                <option value="grooving">Grooving</option>
                <option value="drilling">Drilling</option>
                <option value="boring">Boring</option>
              </select>
            </div>

            <ActionButton onClick={() => ai.suggestCycle(operation, material)} disabled={ai.cycleLoading}>
              {ai.cycleLoading ? 'Analyzing...' : 'Suggest Cycle'}
            </ActionButton>

            {ai.cycleError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {ai.cycleError}
              </div>
            )}

            {ai.cycleResult && (
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-4">
                  <h4 className="text-lg font-semibold text-violet-200">{ai.cycleResult.cycle}</h4>
                </div>

                {ai.cycleResult.parameters.length > 0 && (
                  <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                    <h4 className="mb-2 text-sm font-semibold text-slate-200">Parameters</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {ai.cycleResult.parameters.map((param, i) => (
                        <div key={i} className="rounded border border-white/5 bg-white/5 p-2">
                          <span className="font-mono text-xs text-violet-300">{param.param}</span>
                          <span className="text-xs text-slate-400"> = </span>
                          <span className="font-mono text-xs text-emerald-300">{param.value}</span>
                          <p className="mt-1 text-xs text-slate-500">{param.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                  <h4 className="mb-2 text-sm font-semibold text-slate-200">Example Code</h4>
                  <pre className="font-mono text-xs text-emerald-300">{ai.cycleResult.example}</pre>
                </div>

                {ai.cycleResult.notes.length > 0 && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <h4 className="text-sm font-semibold text-amber-200">Notes</h4>
                    <ul className="mt-1 list-inside list-disc text-sm text-slate-300">
                      {ai.cycleResult.notes.map((note, i) => (
                        <li key={i}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </PanelCard>
      )}
    </div>
  );
}
