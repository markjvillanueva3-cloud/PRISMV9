/**
 * LEARN-MS5 U-LEARN29: Course Viewer Page
 *
 * Browse auto-generated courses from CourseBuilderEngine.
 * Course detail with modules, lessons, and quizzes.
 * Quiz interface with multiple choice + physics calculation questions.
 * Completion badge with score.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ActionButton,
  Field,
  PanelCard,
  Select,
  StatusPill,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';
import type { CoursePricingTier, GeneratedCourse, QuizQuestion } from '../api/knowledge';
import { buildCourse, exportCourse, getCourseCatalog, getCoursePricing, getCourseQuiz } from '../api/knowledge';

type ViewTab = 'catalog' | 'generate' | 'quiz' | 'pricing';

const LEVEL_OPTIONS = ['beginner', 'intermediate', 'advanced'];
const CAM_OPTIONS = ['mastercam', 'fusion360', 'solidcam', 'esprit', 'hypermill', 'gibbscam'];
const ISO_GROUPS = ['P', 'M', 'K', 'N', 'S', 'H'];
const OPERATION_TYPES = ['milling', 'turning', 'drilling', 'grinding', 'threading'];

function CatalogCard({ course, onGenerate }: { course: { id: string; title: string; level: string; modules: number; tips: number }; onGenerate: () => void }) {
  const levelTone = course.level === 'beginner' ? 'emerald' : course.level === 'intermediate' ? 'amber' : 'violet';
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3 transition hover:border-white/16">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{course.title}</h3>
          <p className="mt-1 text-xs text-slate-400">{course.id}</p>
        </div>
        <StatusPill label={course.level} tone={levelTone} />
      </div>
      <div className="flex gap-4 text-xs text-slate-500">
        <span>{course.modules} modules</span>
        <span>{course.tips} tips</span>
      </div>
      <button
        type="button"
        onClick={onGenerate}
        className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
      >
        View Course
      </button>
    </div>
  );
}

function CourseDetailView({ course, onBack }: { course: GeneratedCourse; onBack: () => void }) {
  const [exportFormat, setExportFormat] = useState<'json' | 'markdown' | 'scorm'>('json');
  const [exportContent, setExportContent] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const result = await exportCourse({ cam_system: 'mastercam', level: course.level, format: exportFormat });
      setExportContent(result.content);
    } catch {
      // handled
    } finally {
      setExporting(false);
    }
  }, [course.level, exportFormat]);

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm font-medium text-cyan-400 hover:text-cyan-300">
        &larr; Back to Catalog
      </button>

      <PanelCard title={course.title || course.courseId} subtitle={`${course.level} | ${course.modules.length} modules | ${course.estimatedMinutes} min`}>
        <div className="space-y-4">
          {course.modules.map((mod, i) => (
            <div key={i} className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-100">Module {i + 1}: {mod.title}</h4>
                <span className="text-xs text-slate-500">{mod.estimatedMinutes} min</span>
              </div>
              <div className="space-y-1">
                {mod.tips.map((tip, j) => (
                  <div key={j} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="mt-0.5 text-xs text-slate-600">{j + 1}.</span>
                    <div>
                      <p>{tip.text}</p>
                      <span className="text-xs text-slate-500">Source: {tip.source}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PanelCard>

      <PanelCard title="Export Course" subtitle="Download in multiple formats">
        <div className="flex items-end gap-3">
          <Field label="Format">
            <Select value={exportFormat} onChange={e => setExportFormat((e.target as HTMLSelectElement).value as typeof exportFormat)}>
              <option value="json">JSON</option>
              <option value="markdown">Markdown</option>
              <option value="scorm">SCORM 2004</option>
            </Select>
          </Field>
          <ActionButton onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export'}
          </ActionButton>
        </div>
        {exportContent && (
          <pre className="mt-4 max-h-64 overflow-auto rounded-xl border border-white/8 bg-slate-950 p-4 text-xs text-slate-300">
            {exportContent.slice(0, 3000)}{exportContent.length > 3000 ? '...' : ''}
          </pre>
        )}
      </PanelCard>
    </div>
  );
}

function QuizPanel() {
  const [difficulty, setDifficulty] = useState('medium');
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const generateQuiz = useCallback(async () => {
    setLoading(true);
    setSubmitted(false);
    setAnswers({});
    try {
      const data = await getCourseQuiz({ count, difficulty });
      setQuestions(data.questions);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [count, difficulty]);

  const score = submitted
    ? questions.reduce((sum, q, i) => sum + (answers[i] === q.correct ? 1 : 0), 0)
    : 0;
  const pct = questions.length > 0 ? Math.round(score / questions.length * 100) : 0;

  return (
    <div className="space-y-4">
      <PanelCard title="Generate Quiz" subtitle="Test manufacturing knowledge with auto-generated questions">
        <div className="flex items-end gap-3">
          <Field label="Difficulty">
            <Select value={difficulty} onChange={e => setDifficulty((e.target as HTMLSelectElement).value)}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </Select>
          </Field>
          <Field label="Questions">
            <Select value={String(count)} onChange={e => setCount(Number((e.target as HTMLSelectElement).value))}>
              {[3, 5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
            </Select>
          </Field>
          <ActionButton onClick={generateQuiz} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Quiz'}
          </ActionButton>
        </div>
      </PanelCard>

      {questions.length > 0 && (
        <PanelCard title={submitted ? `Score: ${score}/${questions.length} (${pct}%)` : `${questions.length} Questions`} subtitle={submitted ? (pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Good effort!' : 'Keep practicing!') : 'Select your answers below'}>
          <div className="space-y-6">
            {questions.map((q, qi) => {
              const answered = answers[qi] !== undefined;
              const isCorrect = submitted && answers[qi] === q.correct;
              const isWrong = submitted && answered && !isCorrect;

              return (
                <div key={qi} className={`rounded-xl border p-4 space-y-3 ${isCorrect ? 'border-emerald-400/30 bg-emerald-400/5' : isWrong ? 'border-rose-400/30 bg-rose-400/5' : 'border-white/8 bg-white/[0.02]'}`}>
                  <p className="text-sm font-semibold text-slate-100">Q{qi + 1}: {q.text}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {q.choices.map((choice, ci) => {
                      const selected = answers[qi] === ci;
                      const showCorrect = submitted && ci === q.correct;
                      return (
                        <button
                          key={ci}
                          type="button"
                          disabled={submitted}
                          onClick={() => setAnswers(prev => ({ ...prev, [qi]: ci }))}
                          className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                            showCorrect
                              ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                              : selected && isWrong
                                ? 'border-rose-400/40 bg-rose-400/10 text-rose-200'
                                : selected
                                  ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'
                                  : 'border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/16'
                          }`}
                        >
                          <span className="font-semibold">{String.fromCharCode(65 + ci)}.</span> {choice}
                        </button>
                      );
                    })}
                  </div>
                  {submitted && (
                    <p className="text-xs text-slate-400">{q.explanation}</p>
                  )}
                </div>
              );
            })}

            {!submitted ? (
              <ActionButton
                onClick={() => setSubmitted(true)}
                disabled={Object.keys(answers).length < questions.length}
              >
                Submit Answers ({Object.keys(answers).length}/{questions.length})
              </ActionButton>
            ) : (
              <div className="flex items-center gap-4">
                {pct >= 80 && (
                  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-6 py-3 text-center">
                    <div className="text-lg font-bold text-emerald-200">Certificate Earned</div>
                    <div className="text-xs text-emerald-300">{pct}% Score | {difficulty} difficulty</div>
                  </div>
                )}
                <ActionButton onClick={generateQuiz}>New Quiz</ActionButton>
              </div>
            )}
          </div>
        </PanelCard>
      )}
    </div>
  );
}

function PricingPanel() {
  const [tiers, setTiers] = useState<CoursePricingTier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCoursePricing()
      .then(data => setTiers(data.tiers))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-12 text-center text-sm text-slate-500">Loading pricing...</div>;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tiers.map(tier => (
        <div key={tier.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">{tier.name}</h3>
            <p className="text-2xl font-bold text-cyan-300">{tier.price}</p>
          </div>
          <div className="text-xs text-slate-400">Access: {tier.courseAccess}</div>
          <ul className="space-y-1.5">
            {tier.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="mt-0.5 text-emerald-400">&#10003;</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function CourseViewerPage() {
  const [tab, setTab] = useState<ViewTab>('catalog');
  const [catalog, setCatalog] = useState<Array<{ id: string; title: string; level: string; modules: number; tips: number }>>([]);
  const [selectedCourse, setSelectedCourse] = useState<GeneratedCourse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Course generation form
  const [genCam, setGenCam] = useState('mastercam');
  const [genLevel, setGenLevel] = useState('beginner');
  const [genMaterial, setGenMaterial] = useState('');
  const [genOp, setGenOp] = useState('');

  useEffect(() => {
    getCourseCatalog()
      .then(data => setCatalog(data.courses))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const course = await buildCourse({
        cam_system: genCam,
        level: genLevel,
        material_iso_group: genMaterial || undefined,
        operation_type: genOp || undefined,
      });
      setSelectedCourse(course);
      setTab('catalog');
    } catch {
      // handled
    } finally {
      setGenerating(false);
    }
  }, [genCam, genLevel, genMaterial, genOp]);

  const handleViewCourse = useCallback(async (courseId: string) => {
    setGenerating(true);
    try {
      const course = await buildCourse({ cam_system: courseId, level: 'beginner' });
      setSelectedCourse(course);
    } catch {
      // handled
    } finally {
      setGenerating(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <WorkspaceHero
        eyebrow="Knowledge Pipeline"
        title="Course Viewer"
        description="Browse auto-generated courses built from the knowledge pipeline. Take quizzes with physics-backed questions. Export to JSON, Markdown, or SCORM."
        metrics={
          <>
            <SummaryTile label="Courses" value={String(catalog.length)} hint="auto-generated" accent="from-cyan-400/22 via-cyan-300/10 to-transparent" />
            <SummaryTile label="View" value={tab.charAt(0).toUpperCase() + tab.slice(1)} hint="active" accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
            <SummaryTile label="Formats" value="3" hint="JSON, MD, SCORM" accent="from-violet-400/22 via-violet-300/10 to-transparent" />
          </>
        }
      />

      <div className="flex gap-2">
        <TabButton active={tab === 'catalog'} onClick={() => { setTab('catalog'); setSelectedCourse(null); }}>Catalog</TabButton>
        <TabButton active={tab === 'generate'} onClick={() => setTab('generate')}>Generate</TabButton>
        <TabButton active={tab === 'quiz'} onClick={() => setTab('quiz')}>Quiz</TabButton>
        <TabButton active={tab === 'pricing'} onClick={() => setTab('pricing')}>Pricing</TabButton>
      </div>

      {tab === 'catalog' && !selectedCourse && (
        <div>
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">Loading catalog...</div>
          ) : catalog.length === 0 ? (
            <PanelCard title="No Courses Yet" subtitle="Generate your first course from the Generate tab">
              <p className="text-sm text-slate-400">Auto-generated courses will appear here once created.</p>
            </PanelCard>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.map(c => <CatalogCard key={c.id} course={c} onGenerate={() => handleViewCourse(c.id)} />)}
            </div>
          )}
        </div>
      )}

      {tab === 'catalog' && selectedCourse && (
        <CourseDetailView course={selectedCourse} onBack={() => setSelectedCourse(null)} />
      )}

      {tab === 'generate' && (
        <PanelCard title="Generate Course" subtitle="Build a course from the knowledge pipeline filtered by CAM system, material, or operation">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="CAM System">
                <Select value={genCam} onChange={e => setGenCam((e.target as HTMLSelectElement).value)}>
                  {CAM_OPTIONS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </Select>
              </Field>
              <Field label="Level">
                <Select value={genLevel} onChange={e => setGenLevel((e.target as HTMLSelectElement).value)}>
                  {LEVEL_OPTIONS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                </Select>
              </Field>
              <Field label="Material ISO Group (optional)">
                <Select value={genMaterial} onChange={e => setGenMaterial((e.target as HTMLSelectElement).value)}>
                  <option value="">Any</option>
                  {ISO_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </Select>
              </Field>
              <Field label="Operation Type (optional)">
                <Select value={genOp} onChange={e => setGenOp((e.target as HTMLSelectElement).value)}>
                  <option value="">Any</option>
                  {OPERATION_TYPES.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                </Select>
              </Field>
            </div>
            <ActionButton onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating...' : 'Generate Course'}
            </ActionButton>
          </div>
        </PanelCard>
      )}

      {tab === 'quiz' && <QuizPanel />}
      {tab === 'pricing' && <PricingPanel />}
    </div>
  );
}
