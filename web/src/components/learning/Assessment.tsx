import { useState } from "react";
import { useLearningAssess } from "../../hooks/useLearning";
import type { LearningDomain, SkillScore } from "../../types/learning";

const DOMAINS: { id: LearningDomain; label: string; icon: string }[] = [
  { id: "cad", label: "CAD Design", icon: "📐" },
  { id: "cam", label: "CAM Programming", icon: "💻" },
  { id: "shop_practice", label: "Shop Practice", icon: "🔧" },
  { id: "machine_operation", label: "Machine Operation", icon: "🏭" },
];

const EXPERIENCE_OPTIONS = [
  { value: 0, label: "No experience" },
  { value: 1, label: "< 1 year" },
  { value: 3, label: "1-3 years" },
  { value: 5, label: "3-5 years" },
  { value: 10, label: "5-10 years" },
  { value: 15, label: "10+ years" },
];

type Step = "domains" | "experience" | "questions" | "results";

const SAMPLE_QUESTIONS: Record<LearningDomain, { q: string; options: string[] }[]> = {
  cad: [
    { q: "What does GD&T stand for?", options: ["Geometric Dimensioning & Tolerancing", "General Design & Testing", "Global Draft & Tolerance", "Graduated Dimension & Template"] },
    { q: "Which file format preserves solid body data?", options: ["STEP (AP214)", "DXF", "STL", "SVG"] },
  ],
  cam: [
    { q: "What is a toolpath lead-in?", options: ["Entry approach to cutting zone", "Tool length offset", "Feed rate override", "Spindle warmup cycle"] },
    { q: "Which strategy minimizes air cutting?", options: ["High-speed adaptive", "Zig-zag raster", "Spiral from center", "Contour only"] },
  ],
  shop_practice: [
    { q: "When should you use a dial indicator?", options: ["Checking runout and alignment", "Measuring thread pitch", "Setting tool length", "Programming offsets"] },
    { q: "What causes chatter in milling?", options: ["Unstable cutting conditions", "Wrong coolant type", "Incorrect G-code", "Bad material batch"] },
  ],
  machine_operation: [
    { q: "What does G43 do on a Fanuc controller?", options: ["Tool length compensation", "Canned drilling cycle", "Circular interpolation", "Coordinate rotation"] },
    { q: "What is the purpose of a work offset?", options: ["Set part zero location", "Define tool geometry", "Set feed rate", "Enable coolant"] },
  ],
};

function ScoreBar({ score }: { score: SkillScore }) {
  const levelColors = { beginner: "bg-red-400", intermediate: "bg-amber-400", advanced: "bg-blue-400", expert: "bg-green-400" };
  return (
    <div className="p-4 rounded-lg border border-slate-200 bg-white">
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-slate-800">{DOMAINS.find((d) => d.id === score.domain)?.label ?? score.domain}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full text-white ${levelColors[score.level]}`}>{score.level}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-3 mb-2">
        <div className={`h-3 rounded-full ${levelColors[score.level]} transition-all duration-700`} style={{ width: `${score.score}%` }} />
      </div>
      <div className="text-sm text-slate-600 font-medium">{score.score}/100</div>
      {score.strengths.length > 0 && (
        <div className="mt-2 text-xs text-green-600">Strengths: {score.strengths.join(", ")}</div>
      )}
      {score.weaknesses.length > 0 && (
        <div className="mt-1 text-xs text-red-500">Focus areas: {score.weaknesses.join(", ")}</div>
      )}
    </div>
  );
}

export default function Assessment() {
  const [step, setStep] = useState<Step>("domains");
  const [selectedDomains, setSelectedDomains] = useState<LearningDomain[]>([]);
  const [experience, setExperience] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const assess = useLearningAssess();

  const toggleDomain = (d: LearningDomain) => {
    setSelectedDomains((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const handleSubmit = async () => {
    const result = await assess.execute({
      domains: selectedDomains,
      experience_years: experience,
      answers,
    });
    if (result) setStep("results");
  };

  const questions = selectedDomains.flatMap((d) =>
    (SAMPLE_QUESTIONS[d] ?? []).map((q, i) => ({ ...q, key: `${d}-${i}`, domain: d })),
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Skill Assessment</h1>
      <p className="text-slate-500 text-sm mb-6">Evaluate your current manufacturing knowledge</p>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {(["domains", "experience", "questions", "results"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === s ? "bg-blue-600 text-white" : i < ["domains", "experience", "questions", "results"].indexOf(step) ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500"}`}>
              {i + 1}
            </div>
            {i < 3 && <div className="w-8 h-0.5 bg-slate-200" />}
          </div>
        ))}
      </div>

      {/* Step: Domain Selection */}
      {step === "domains" && (
        <div>
          <h2 className="font-semibold text-slate-800 mb-4">Select domains to assess</h2>
          <div className="grid grid-cols-2 gap-3">
            {DOMAINS.map((d) => (
              <button
                key={d.id}
                onClick={() => toggleDomain(d.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${selectedDomains.includes(d.id) ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}
              >
                <span className="text-2xl">{d.icon}</span>
                <div className="font-medium text-slate-800 mt-2">{d.label}</div>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep("experience")}
            disabled={selectedDomains.length === 0}
            className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step: Experience */}
      {step === "experience" && (
        <div>
          <h2 className="font-semibold text-slate-800 mb-4">Manufacturing experience</h2>
          <div className="grid grid-cols-3 gap-3">
            {EXPERIENCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setExperience(opt.value)}
                className={`p-3 rounded-lg border-2 text-sm transition-all ${experience === opt.value ? "border-blue-500 bg-blue-50 font-medium" : "border-slate-200 hover:border-slate-300"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep("domains")} className="px-4 py-2 text-slate-600 hover:text-slate-800">Back</button>
            <button onClick={() => setStep("questions")} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Continue</button>
          </div>
        </div>
      )}

      {/* Step: Questions */}
      {step === "questions" && (
        <div>
          <h2 className="font-semibold text-slate-800 mb-4">Knowledge Questions</h2>
          <div className="space-y-6">
            {questions.map((q) => (
              <div key={q.key} className="p-4 rounded-lg border border-slate-200 bg-white">
                <div className="text-xs text-slate-400 mb-1 uppercase">{DOMAINS.find((d) => d.id === q.domain)?.label}</div>
                <div className="font-medium text-slate-800 mb-3">{q.q}</div>
                <div className="grid grid-cols-1 gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.key]: opt }))}
                      className={`text-left p-2.5 rounded border text-sm transition-all ${answers[q.key] === opt ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 hover:border-slate-300 text-slate-700"}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep("experience")} className="px-4 py-2 text-slate-600 hover:text-slate-800">Back</button>
            <button
              onClick={handleSubmit}
              disabled={assess.loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {assess.loading ? "Analyzing..." : "Submit Assessment"}
            </button>
          </div>
        </div>
      )}

      {/* Step: Results */}
      {step === "results" && assess.data && (
        <div>
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-xl mb-6">
            <div className="text-sm opacity-80 mb-1">Overall Level</div>
            <div className="text-3xl font-bold capitalize">{assess.data.overall_level}</div>
            <p className="text-sm mt-2 opacity-90">{assess.data.summary}</p>
          </div>
          <h2 className="font-semibold text-slate-800 mb-3">Domain Scores</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {assess.data.scores.map((s: SkillScore) => <ScoreBar key={s.domain} score={s} />)}
          </div>
          {assess.data.recommended_focus.length > 0 && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <div className="font-medium text-amber-800">Recommended Focus Areas</div>
              <div className="text-sm text-amber-700 mt-1">
                {assess.data.recommended_focus.map((d) => DOMAINS.find((x) => x.id === d)?.label).join(", ")}
              </div>
            </div>
          )}
          <button
            onClick={() => { setStep("domains"); setAnswers({}); assess.reset(); }}
            className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retake Assessment
          </button>
        </div>
      )}

      {assess.error && <div className="mt-4 text-sm text-red-500 bg-red-50 p-3 rounded-lg">{assess.error}</div>}
    </div>
  );
}
