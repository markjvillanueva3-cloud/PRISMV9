import { useState } from "react";
import { useLearningAssess } from "../../hooks/useLearning";
import type { LearningDomain, SkillScore } from "../../types/learning";
import {
  PenTool,
  Monitor,
  Wrench,
  Cpu,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  CheckCircle2,
  Target,
  AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Domain metadata
// ---------------------------------------------------------------------------

const DOMAINS: { id: LearningDomain; label: string; Icon: LucideIcon; description: string }[] = [
  { id: "cad", label: "CAD Design", Icon: PenTool, description: "3D modeling, GD&T, file formats" },
  { id: "cam", label: "CAM Programming", Icon: Monitor, description: "Toolpaths, post processing, simulation" },
  { id: "shop_practice", label: "Shop Practice", Icon: Wrench, description: "Measurement, setup, troubleshooting" },
  { id: "machine_operation", label: "Machine Operation", Icon: Cpu, description: "G-code, controllers, offsets" },
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

// ---------------------------------------------------------------------------
// Expanded question bank: 10 per domain = 40 total
// ---------------------------------------------------------------------------

const QUESTION_BANK: Record<LearningDomain, { q: string; options: string[]; correct: number }[]> = {
  cad: [
    { q: "What does GD&T stand for?", options: ["Geometric Dimensioning & Tolerancing", "General Design & Testing", "Global Draft & Tolerance", "Graduated Dimension & Template"], correct: 0 },
    { q: "Which file format preserves solid body data with topology?", options: ["STEP (AP214)", "DXF", "STL", "SVG"], correct: 0 },
    { q: "What is the standard tolerance for a basic dimension in ISO 2768-mK?", options: ["Medium (m) for linear, coarse (K) for angular", "Tight for both", "Fine for linear only", "No standard exists"], correct: 0 },
    { q: "In GD&T, what does the circle-M (M) modifier mean?", options: ["Maximum Material Condition", "Minimum Material Condition", "Mean Material Condition", "Measured Material Condition"], correct: 0 },
    { q: "What is the main advantage of parametric CAD over direct modeling?", options: ["Design intent preserved via feature history", "Faster rendering", "Smaller file sizes", "Better STL exports"], correct: 0 },
    { q: "Which datum reference frame requires minimum 3 datums?", options: ["Full constraint (6 DOF)", "Partial constraint", "Free body", "Planar constraint"], correct: 0 },
    { q: "What does a 'through-all' feature mean in CAD?", options: ["Extends through entire body in one direction", "Visible from all angles", "Applied to all bodies", "Exported to all formats"], correct: 0 },
    { q: "IGES files lose which type of information compared to STEP?", options: ["Assembly structure and constraints", "Color data", "Dimension values", "All metadata"], correct: 0 },
    { q: "What is a fillet in CAD terms?", options: ["A rounded interior or exterior edge", "A chamfered edge", "A hole pattern", "A shell operation"], correct: 0 },
    { q: "True position tolerance in GD&T creates what shape zone?", options: ["Cylindrical zone (for holes)", "Square zone", "Triangular zone", "Conical zone"], correct: 0 },
  ],
  cam: [
    { q: "What is a toolpath lead-in?", options: ["Entry approach to cutting zone", "Tool length offset", "Feed rate override", "Spindle warmup cycle"], correct: 0 },
    { q: "Which strategy minimizes air cutting in pocket milling?", options: ["Adaptive/trochoidal clearing", "Zig-zag raster", "Spiral from center", "Contour only"], correct: 0 },
    { q: "What does 'stock to leave' mean in CAM?", options: ["Material left for finishing pass", "Extra stock for error margin", "Waste material per setup", "Bar remnant length"], correct: 0 },
    { q: "What is the purpose of a post processor?", options: ["Convert toolpath to machine-specific G-code", "Process material after cutting", "Filter CAM warnings", "Optimize feed rates"], correct: 0 },
    { q: "In 5-axis machining, what is RTCP?", options: ["Rotation Tool Center Point compensation", "Real-Time Cutting Parameters", "Rapid Tool Change Protocol", "Radial Tool Correction Program"], correct: 0 },
    { q: "What is rest machining in CAM?", options: ["Removing material left by previous larger tools", "Machining at reduced feed rates", "Final finishing operation", "Idle time between operations"], correct: 0 },
    { q: "Which CAM feature prevents gouging on complex surfaces?", options: ["Gouge checking / collision detection", "Feed rate limiting", "Stepover reduction", "Climb milling mode"], correct: 0 },
    { q: "What is the difference between climb and conventional milling?", options: ["Climb: cutter rotation matches feed direction", "They are identical on CNC", "Climb: uses faster RPM", "Conventional: always preferred"], correct: 0 },
    { q: "Why is toolpath simulation important before running on machine?", options: ["Detects collisions, gouges, and rapid-through-material errors", "Required by ISO 9001", "Reduces file size", "Improves surface finish"], correct: 0 },
    { q: "What does 'stepover' control in surface finishing?", options: ["Distance between adjacent passes (cusp height)", "Depth of each cut", "Spindle speed ramp", "Tool change frequency"], correct: 0 },
  ],
  shop_practice: [
    { q: "When should you use a dial indicator?", options: ["Checking runout and alignment", "Measuring thread pitch", "Setting tool length", "Programming offsets"], correct: 0 },
    { q: "What causes chatter in milling?", options: ["Unstable cutting conditions (harmonics)", "Wrong coolant type", "Incorrect G-code format", "Bad material batch"], correct: 0 },
    { q: "What is the proper way to indicate a bore?", options: ["Rotate the indicator inside while reading TIR", "Push-pull the indicator", "Measure with calipers at two points", "Use a thread gauge"], correct: 0 },
    { q: "When is high-pressure through-spindle coolant critical?", options: ["Deep hole drilling (>3xD)", "All operations", "Face milling only", "Only on aluminum"], correct: 0 },
    { q: "What does TIR stand for?", options: ["Total Indicator Reading (runout)", "Tool Insert Rating", "Temperature Induced Runoff", "Tapping Input Rate"], correct: 0 },
    { q: "How do you check if a vise jaw is parallel to X-axis?", options: ["Sweep fixed jaw with dial indicator", "Use a square against the table", "Measure part after cutting", "Trust factory alignment"], correct: 0 },
    { q: "What causes poor surface finish on turned parts?", options: ["Nose radius too small, feed too high, or tool wear", "Wrong coolant temperature", "Incorrect program format", "Material is too soft"], correct: 0 },
    { q: "What is the purpose of a gage block set?", options: ["Calibration standard for precision measurements", "Setting machine zero", "Holding small parts", "Testing coolant pH"], correct: 0 },
    { q: "When should you use a peck drilling cycle?", options: ["When hole depth exceeds 3x drill diameter", "For all drilling operations", "Only in stainless steel", "When using carbide drills"], correct: 0 },
    { q: "What is the first thing to check after a tool crash?", options: ["Spindle runout and axis alignment", "Program syntax", "Coolant level", "Material certificate"], correct: 0 },
  ],
  machine_operation: [
    { q: "What does G43 do on a Fanuc controller?", options: ["Tool length compensation +", "Canned drilling cycle", "Circular interpolation", "Coordinate rotation"], correct: 0 },
    { q: "What is the purpose of a work offset (G54-G59)?", options: ["Set part zero location", "Define tool geometry", "Set feed rate", "Enable coolant"], correct: 0 },
    { q: "What does G41 activate?", options: ["Cutter compensation left", "Thread cutting cycle", "Tool change macro", "Absolute positioning"], correct: 0 },
    { q: "On a Fanuc control, what is the difference between G90 and G91?", options: ["G90 = absolute, G91 = incremental", "G90 = metric, G91 = imperial", "G90 = rapid, G91 = feed", "No difference"], correct: 0 },
    { q: "What does M06 do?", options: ["Tool change command", "Spindle start CW", "Coolant on", "Program stop"], correct: 0 },
    { q: "What happens when you override feed rate to 0%?", options: ["Machine stops feeding but spindle keeps running", "Machine homes all axes", "Program resets", "Emergency stop activates"], correct: 0 },
    { q: "What is the purpose of G28?", options: ["Return to machine home position", "Start a subroutine", "Enable high-speed mode", "Set tool offset"], correct: 0 },
    { q: "On a lathe, what does G96 activate?", options: ["Constant surface speed (CSS)", "Threading cycle", "Canned drilling", "Tailstock advance"], correct: 0 },
    { q: "What is a macro variable (# variable) used for?", options: ["Parametric programming with math and logic", "Tool length storage only", "Alarm history", "Coolant flow rate"], correct: 0 },
    { q: "Why should you never jog Z-axis down with tool length comp active?", options: ["The comp offset adds to position, risking a crash", "It voids the warranty", "Z-axis motors can't handle it", "It corrupts the program"], correct: 0 },
  ],
};

// Pick N random questions per domain for assessment
function pickQuestions(domains: LearningDomain[], perDomain = 5) {
  return domains.flatMap((d) => {
    const bank = QUESTION_BANK[d] ?? [];
    const shuffled = [...bank].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, perDomain).map((q, i) => ({
      ...q,
      key: `${d}-${i}`,
      domain: d,
    }));
  });
}

// ---------------------------------------------------------------------------
// Score display
// ---------------------------------------------------------------------------

function ScoreBar({ score }: { score: SkillScore }) {
  const levelColors = {
    beginner: "bg-red-500",
    intermediate: "bg-amber-500",
    advanced: "bg-blue-500",
    expert: "bg-green-500",
  };
  const levelBadgeColors = {
    beginner: "bg-red-500/20 text-red-400",
    intermediate: "bg-amber-500/20 text-amber-400",
    advanced: "bg-blue-500/20 text-blue-400",
    expert: "bg-green-500/20 text-green-400",
  };
  return (
    <div className="p-4 rounded-xl border border-slate-700/60 bg-slate-800/70 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-slate-200">
          {DOMAINS.find((d) => d.id === score.domain)?.label ?? score.domain}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelBadgeColors[score.level]}`}>
          {score.level}
        </span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-3 mb-2">
        <div
          className={`h-3 rounded-full ${levelColors[score.level]} transition-all duration-700`}
          style={{ width: `${score.score}%` }}
        />
      </div>
      <div className="text-sm text-slate-300 font-medium">{score.score}/100</div>
      {score.strengths.length > 0 && (
        <div className="mt-2 text-xs text-green-400 flex items-start gap-1">
          <CheckCircle2 size={12} className="mt-0.5 shrink-0" />
          Strengths: {score.strengths.join(", ")}
        </div>
      )}
      {score.weaknesses.length > 0 && (
        <div className="mt-1 text-xs text-red-400 flex items-start gap-1">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          Focus areas: {score.weaknesses.join(", ")}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function Assessment() {
  const [step, setStep] = useState<Step>("domains");
  const [selectedDomains, setSelectedDomains] = useState<LearningDomain[]>([]);
  const [experience, setExperience] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<ReturnType<typeof pickQuestions>>([]);
  const [showCorrect, setShowCorrect] = useState(false);
  const assess = useLearningAssess();

  const toggleDomain = (d: LearningDomain) => {
    setSelectedDomains((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  };

  const startQuestions = () => {
    setQuestions(pickQuestions(selectedDomains, 5));
    setStep("questions");
  };

  const handleSubmit = async () => {
    // Calculate local scores from correct answers
    const result = await assess.execute({
      domains: selectedDomains,
      experience_years: experience,
      answers,
    });
    if (result) {
      setShowCorrect(true);
      setStep("results");
    }
  };

  // Count correct answers locally for instant feedback
  const correctCount = questions.filter(
    (q) => answers[q.key] === q.options[q.correct],
  ).length;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-100 mb-1 flex items-center gap-2">
        <Target size={24} className="text-blue-400" />
        Skill Assessment
      </h1>
      <p className="text-slate-400 text-sm mb-6">Evaluate your current manufacturing knowledge</p>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {(["domains", "experience", "questions", "results"] as Step[]).map((s, i) => {
          const stepIndex = ["domains", "experience", "questions", "results"].indexOf(step);
          const isActive = step === s;
          const isPast = i < stepIndex;
          return (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : isPast
                      ? "bg-green-600 text-white"
                      : "bg-slate-700 text-slate-400"
                }`}
              >
                {isPast ? <CheckCircle2 size={16} /> : i + 1}
              </div>
              {i < 3 && <div className="w-8 h-0.5 bg-slate-700" />}
            </div>
          );
        })}
      </div>

      {/* Step: Domain Selection */}
      {step === "domains" && (
        <div>
          <h2 className="font-semibold text-slate-200 mb-4">Select domains to assess</h2>
          <div className="grid grid-cols-2 gap-3">
            {DOMAINS.map((d) => (
              <button
                key={d.id}
                onClick={() => toggleDomain(d.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedDomains.includes(d.id)
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-slate-700 hover:border-slate-600 bg-slate-800/70"
                }`}
              >
                <d.Icon size={24} className={selectedDomains.includes(d.id) ? "text-blue-400" : "text-slate-400"} />
                <div className="font-medium text-slate-200 mt-2">{d.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{d.description}</div>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep("experience")}
            disabled={selectedDomains.length === 0}
            className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-lg
              hover:bg-blue-700 hover:-translate-y-px hover:shadow-lg
              active:translate-y-0 active:scale-[0.98]
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0
              transition-all duration-150 flex items-center gap-2"
          >
            Continue <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Step: Experience */}
      {step === "experience" && (
        <div>
          <h2 className="font-semibold text-slate-200 mb-4">Manufacturing experience</h2>
          <div className="grid grid-cols-3 gap-3">
            {EXPERIENCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setExperience(opt.value)}
                className={`p-3 rounded-xl border-2 text-sm transition-all ${
                  experience === opt.value
                    ? "border-blue-500 bg-blue-500/10 font-medium text-blue-300"
                    : "border-slate-700 hover:border-slate-600 bg-slate-800/70 text-slate-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep("domains")}
              className="px-4 py-2 text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              <ChevronLeft size={16} /> Back
            </button>
            <button
              onClick={startQuestions}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg
                hover:bg-blue-700 hover:-translate-y-px hover:shadow-lg
                active:translate-y-0 active:scale-[0.98]
                transition-all duration-150 flex items-center gap-2"
            >
              Continue <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step: Questions */}
      {step === "questions" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-200">Knowledge Questions</h2>
            <span className="text-sm text-slate-400">
              {answeredCount}/{questions.length} answered
            </span>
          </div>
          <div className="space-y-6">
            {questions.map((q, qIdx) => (
              <div
                key={q.key}
                className="p-4 rounded-xl border border-slate-700/60 bg-slate-800/70 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-slate-500 uppercase">
                    {DOMAINS.find((d) => d.id === q.domain)?.label}
                  </span>
                  <span className="text-xs text-slate-600">Q{qIdx + 1}</span>
                </div>
                <div className="font-medium text-slate-200 mb-3">{q.q}</div>
                <div className="grid grid-cols-1 gap-2">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = answers[q.key] === opt;
                    const isCorrect = optIdx === q.correct;
                    const showResult = showCorrect && isSelected;
                    return (
                      <button
                        key={opt}
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.key]: opt }))}
                        className={`text-left p-2.5 rounded-lg border text-sm transition-all ${
                          showResult && isCorrect
                            ? "border-green-500 bg-green-500/10 text-green-300"
                            : showResult && !isCorrect
                              ? "border-red-500 bg-red-500/10 text-red-300"
                              : isSelected
                                ? "border-blue-500 bg-blue-500/10 text-blue-300"
                                : "border-slate-700 hover:border-slate-600 text-slate-300"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep("experience")}
              className="px-4 py-2 text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              <ChevronLeft size={16} /> Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={assess.loading || answeredCount === 0}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg
                hover:bg-blue-700 hover:-translate-y-px hover:shadow-lg
                active:translate-y-0 active:scale-[0.98]
                disabled:opacity-50 disabled:hover:translate-y-0
                transition-all duration-150"
            >
              {assess.loading ? "Analyzing..." : `Submit Assessment (${answeredCount}/${questions.length})`}
            </button>
          </div>
        </div>
      )}

      {/* Step: Results */}
      {step === "results" && assess.data && (
        <div>
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-xl mb-6 shadow-lg shadow-blue-500/10">
            <div className="text-sm opacity-80 mb-1">Overall Level</div>
            <div className="text-3xl font-bold capitalize">{assess.data.overall_level}</div>
            <p className="text-sm mt-2 opacity-90">{assess.data.summary}</p>
            {questions.length > 0 && (
              <div className="mt-3 text-sm opacity-80">
                Score: {correctCount}/{questions.length} correct (
                {Math.round((correctCount / questions.length) * 100)}%)
              </div>
            )}
          </div>

          <h2 className="font-semibold text-slate-200 mb-3">Domain Scores</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {assess.data.scores.map((s: SkillScore) => (
              <ScoreBar key={s.domain} score={s} />
            ))}
          </div>

          {assess.data.recommended_focus.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="font-medium text-amber-400 flex items-center gap-2">
                <AlertTriangle size={16} />
                Recommended Focus Areas
              </div>
              <div className="text-sm text-amber-300/80 mt-1">
                {assess.data.recommended_focus
                  .map((d) => DOMAINS.find((x) => x.id === d)?.label)
                  .join(", ")}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setStep("domains");
              setAnswers({});
              setShowCorrect(false);
              setQuestions([]);
              assess.reset();
            }}
            className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-lg
              hover:bg-blue-700 hover:-translate-y-px hover:shadow-lg
              active:translate-y-0 active:scale-[0.98]
              transition-all duration-150 flex items-center gap-2"
          >
            <RotateCcw size={16} /> Retake Assessment
          </button>
        </div>
      )}

      {assess.error && (
        <div className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
          {assess.error}
        </div>
      )}
    </div>
  );
}
