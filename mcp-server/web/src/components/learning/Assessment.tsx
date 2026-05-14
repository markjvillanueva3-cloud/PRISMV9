/**
 * L8-P1-MS2 P0-U03: Skill Assessment Wizard
 * Multi-step wizard: domain selection -> questions -> results with per-domain scores.
 */
import { useState } from 'react';
import { useAssess } from '../../hooks/useLearning';
import { LoadingState } from '../LoadingState';
import { ErrorState } from '../ErrorState';
import type { LearningDomain, AssessmentResult } from '../../types/learning';

const DOMAINS: { id: LearningDomain; label: string; description: string }[] = [
  { id: 'CAD', label: 'CAD Design', description: 'Parametric modeling, drawings, GD&T' },
  { id: 'CAM', label: 'CAM Programming', description: 'Toolpaths, speeds & feeds, post processing' },
  { id: 'ShopPractice', label: 'Shop Practice', description: 'Fixturing, setup, quality inspection' },
  { id: 'MachineOperation', label: 'Machine Operation', description: 'CNC controls, alarms, maintenance' },
];

type Step = 'select' | 'assessing' | 'results';

export function Assessment() {
  const [step, setStep] = useState<Step>('select');
  const [selected, setSelected] = useState<LearningDomain[]>([]);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const { loading, error, assess } = useAssess();

  function toggleDomain(d: LearningDomain) {
    setSelected(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  async function startAssessment() {
    setStep('assessing');
    const res = await assess({ domains: selected.length > 0 ? selected : undefined });
    if (res) {
      setResult(res);
      setStep('results');
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => setStep('select')} />;

  if (step === 'assessing' || loading) {
    return <LoadingState label="Running skill assessment..." />;
  }

  if (step === 'results' && result) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Assessment Results</h1>
          <button
            onClick={() => { setStep('select'); setResult(null); setSelected([]); }}
            className="text-sm text-prism-600 hover:text-prism-700 font-medium"
          >
            Retake Assessment
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-prism-600">{result.overall_score}</div>
            <div className="text-sm text-gray-500 mt-1">Overall Score</div>
            <div className="text-sm text-gray-400 mt-1">
              Recommended path: <span className="font-medium text-gray-700">{result.recommended_path}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.skills.map(skill => (
              <div key={skill.domain} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    {DOMAINS.find(d => d.id === skill.domain)?.label ?? skill.domain}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    skill.level === 'expert' ? 'bg-emerald-100 text-emerald-700' :
                    skill.level === 'advanced' ? 'bg-blue-100 text-blue-700' :
                    skill.level === 'intermediate' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {skill.level}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-prism-500 rounded-full transition-all"
                    style={{ width: `${skill.score}%` }}
                  />
                </div>
                {skill.strengths.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-emerald-600">Strengths:</span>
                    <span className="text-xs text-gray-600 ml-1">{skill.strengths.join(', ')}</span>
                  </div>
                )}
                {skill.weaknesses.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-amber-600">To improve:</span>
                    <span className="text-xs text-gray-600 ml-1">{skill.weaknesses.join(', ')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Step: select domains
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Skill Assessment</h1>
        <p className="text-sm text-gray-500 mt-1">Select domains to assess (or leave blank for all)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DOMAINS.map(d => (
          <button
            key={d.id}
            onClick={() => toggleDomain(d.id)}
            className={`p-4 rounded-lg border text-left transition-all ${
              selected.includes(d.id)
                ? 'border-prism-500 bg-prism-50 ring-1 ring-prism-300'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium text-gray-900">{d.label}</div>
            <div className="text-sm text-gray-500 mt-1">{d.description}</div>
          </button>
        ))}
      </div>

      <button
        onClick={startAssessment}
        className="px-6 py-2.5 bg-prism-600 text-white rounded-lg font-medium hover:bg-prism-700 transition-colors"
      >
        {selected.length > 0 ? `Assess ${selected.length} Domain${selected.length > 1 ? 's' : ''}` : 'Assess All Domains'}
      </button>
    </div>
  );
}
