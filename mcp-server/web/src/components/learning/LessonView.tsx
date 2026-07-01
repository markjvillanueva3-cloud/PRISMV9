import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getCourseById,
  getCourseForLesson,
  getLessonById,
  LEVEL_COLORS,
  LEVEL_LABELS,
  type CourseQuestion,
  type LessonSection,
} from '../../data/academy';
import { useCourses } from '../../hooks/useCourses';
import { useStudentId } from '../../hooks/useStudentId';
import { LessonStudio } from './LessonStudio';
import { LessonVisual } from './LessonVisual';

export function LessonView() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { completeLesson, getLessonProgress, isLessonComplete } = useCourses(useStudentId());
  const lesson = getLessonById(lessonId || '');
  const course = getCourseById(courseId || '') || getCourseForLesson(lessonId || '');

  if (!lesson || !course) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-gray-500">Lesson not found.</p>
        <Link
          to="/learning/academy"
          className="inline-flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm font-medium text-prism-600 transition hover:bg-prism-50 hover:text-prism-700 active:bg-prism-100"
          aria-label="Back to Academy course catalog"
        >
          ← Back to Academy
        </Link>
      </div>
    );
  }

  const activeLesson = lesson;
  const activeCourse = course;
  const lessonIndex = activeCourse.lessons.findIndex(item => item.id === activeLesson.id);
  const prevLesson = lessonIndex > 0 ? activeCourse.lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < activeCourse.lessons.length - 1 ? activeCourse.lessons[lessonIndex + 1] : null;
  const savedProgress = getLessonProgress(activeLesson.id);
  const completed = isLessonComplete(activeLesson.id);
  const [checkpointAnswers, setCheckpointAnswers] = useState<Record<string, string>>({});
  const [finalAnswers, setFinalAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(Boolean(savedProgress?.score));
  const [score, setScore] = useState<number | null>(savedProgress?.score ?? null);

  useEffect(() => {
    setCheckpointAnswers({});
    setFinalAnswers({});
    setSubmitted(Boolean(savedProgress?.score));
    setScore(savedProgress?.score ?? null);
  }, [activeLesson.id, savedProgress?.score]);

  const checkpointSlots = useMemo(
    () => activeLesson.sections.map((_, index) => activeLesson.checkpoint_questions[index] || null),
    [activeLesson.checkpoint_questions, activeLesson.sections],
  );

  const passed = score !== null && score >= activeLesson.passing_score;
  const readyToSubmit = activeLesson.final_test.every(question => finalAnswers[question.id]);

  function submitFinalAssessment() {
    const correctAnswers = activeLesson.final_test.filter(
      question => finalAnswers[question.id] === question.correctOptionId,
    ).length;
    const pct = Math.round((correctAnswers / Math.max(activeLesson.final_test.length, 1)) * 100);
    setSubmitted(true);
    setScore(pct);
    if (pct >= activeLesson.passing_score) {
      completeLesson(activeLesson.id, pct);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link to="/learning/academy" className="text-prism-600 hover:text-prism-700">Academy</Link>
        <span className="text-slate-300">/</span>
        <Link to={`/learning/academy/${activeCourse.id}`} className="text-prism-600 hover:text-prism-700">
          {activeCourse.title}
        </Link>
        <span className="text-slate-300">/</span>
        <span className="font-medium text-slate-600">{activeLesson.title}</span>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white ${LEVEL_COLORS[activeCourse.level]}`}>
                {LEVEL_LABELS[activeCourse.level]}
              </span>
              <span className="text-xs text-slate-500">
                Lesson {lessonIndex + 1} of {activeCourse.lessons.length}
              </span>
              <span className="text-xs text-slate-500">· {activeLesson.duration_min} min</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{activeLesson.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{activeLesson.summary}</p>
            </div>
          </div>

          <div className="grid gap-3 lg:w-80">
            <InfoBadge label="Formula tags" value={`${activeLesson.key_formulas.length}`} />
            <InfoBadge label="Engine links" value={`${activeLesson.engine_links.length}`} />
            <InfoBadge label="Interactive questions" value={`${activeLesson.quiz_questions}`} />
            <InfoBadge label="Passing score" value={`${activeLesson.passing_score}%`} />
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <LessonVisual
            visualKey={activeLesson.visual_key}
            title={activeLesson.title}
            references={activeLesson.reference_assets}
          />

          <LessonStudio
            mediaCards={activeLesson.media_cards}
            labBrief={activeLesson.lab_brief}
          />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              {activeLesson.sections.map((section, index) => (
                <div key={section.id} className="space-y-4">
                  <LessonSectionCard section={section} />
                  {checkpointSlots[index] && (
                    <InlineQuestionCard
                      question={checkpointSlots[index]}
                      selectedOptionId={checkpointAnswers[checkpointSlots[index].id]}
                      onSelect={optionId =>
                        setCheckpointAnswers(prev => ({ ...prev, [checkpointSlots[index]!.id]: optionId }))
                      }
                    />
                  )}
                </div>
              ))}

              <FinalAssessmentCard
                questions={activeLesson.final_test}
                answers={finalAnswers}
                onSelect={(questionId, optionId) =>
                  setFinalAnswers(prev => ({ ...prev, [questionId]: optionId }))
                }
                onSubmit={submitFinalAssessment}
                readyToSubmit={readyToSubmit}
                submitted={submitted}
                score={score}
                passingScore={activeLesson.passing_score}
              />
            </div>

            <aside className="space-y-4">
              <Panel title="What this lesson builds">
                <p className="text-sm leading-6 text-slate-700">{activeCourse.role_outcome}</p>
              </Panel>

              <Panel title="Assessment path">
                <div className="space-y-3 text-sm leading-6 text-slate-700">
                  <p>Checkpoint prompts are woven through the lesson so learners stop and apply what they just saw.</p>
                  <p>The end-of-lesson mastery check needs {activeLesson.passing_score}% to record completion.</p>
                  {score !== null && (
                    <div className={`rounded-2xl px-4 py-3 ${
                      score >= activeLesson.passing_score
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border border-amber-200 bg-amber-50 text-amber-700'
                    }`}>
                      Latest score: <span className="font-semibold">{score}%</span>
                    </div>
                  )}
                </div>
              </Panel>

              {activeLesson.key_formulas.length > 0 && (
                <Panel title="Key formulas">
                  <div className="flex flex-wrap gap-2">
                    {activeLesson.key_formulas.map(formula => (
                      <span key={formula} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {formula}
                      </span>
                    ))}
                  </div>
                </Panel>
              )}

              {activeLesson.engine_links.length > 0 && (
                <Panel title="Kienzle engines in this lesson">
                  <div className="flex flex-wrap gap-2">
                    {activeLesson.engine_links.map(engine => (
                      <span key={engine} className="rounded-full bg-prism-50 px-3 py-1 text-xs font-medium text-prism-700">
                        {engine}
                      </span>
                    ))}
                  </div>
                </Panel>
              )}

              <Panel title="Course capstone">
                <p className="text-sm leading-6 text-slate-700">{activeCourse.capstone}</p>
              </Panel>
            </aside>
          </div>
        </div>
      </section>

      <div className="flex justify-center">
        {completed ? (
          <span className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700">
            ✓ Lesson complete{typeof savedProgress?.score === 'number' ? ` · ${savedProgress.score}%` : ''}
          </span>
        ) : passed ? (
          <span className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700">
            ✓ Mastery check passed · progress saved
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-700">
            Pass the end-of-lesson test to record completion
          </span>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-sm">
        {prevLesson ? (
          <Link to={`/learning/academy/${activeCourse.id}/${prevLesson.id}`} className="font-medium text-prism-600 hover:text-prism-700">
            ← {prevLesson.title}
          </Link>
        ) : <span />}
        {nextLesson ? (
          <Link to={`/learning/academy/${activeCourse.id}/${nextLesson.id}`} className="font-medium text-prism-600 hover:text-prism-700">
            {nextLesson.title} →
          </Link>
        ) : (
          <Link to={`/learning/academy/${activeCourse.id}`} className="font-medium text-emerald-600 hover:text-emerald-700">
            Back to course →
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * Render a lesson section by ContentType. iter43: multi-type rendering for visual
 * learners + mobile tap-target compliance (≥44pt buttons per web/CLAUDE.md).
 *
 * ContentType handling:
 *   - calculator → live link to /calculator with engine+input/output preview
 *   - diagram    → inline SVG or ASCII pre-block (whitespace-pre-wrap; preserves ASCII force-vector diagrams from courses 29-34)
 *   - video      → semantic placeholder (video URL populated by course author)
 *   - 3d_viewer  → semantic placeholder (glTF/USDZ URL populated by course author)
 *   - sandbox    → semantic placeholder (interactive task spec)
 *   - animation  → semantic placeholder
 *   - text       → reading panel (default)
 */
function LessonSectionCard({ section }: { section: LessonSection }) {
  if (section.type === 'calculator') {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Interactive calculator</div>
            <h2 className="mt-2 break-words text-lg font-semibold text-amber-950">{section.title}</h2>
          </div>
          {section.engine && (
            <Link
              to="/calculator"
              className="inline-flex min-h-[44px] items-center rounded-full bg-white px-4 py-2 text-xs font-medium text-amber-800 shadow-sm transition hover:bg-amber-100 active:bg-amber-200"
              aria-label={`Open Calculator Studio for ${section.engine}`}
            >
              Open in Calculator →
            </Link>
          )}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <FieldGroup label="Inputs" values={section.inputFields ?? []} emptyLabel="Defined in engine" />
          <FieldGroup label="Outputs" values={section.outputFields ?? []} emptyLabel="Defined in engine" />
        </div>
      </div>
    );
  }

  if (section.type === 'diagram') {
    return (
      <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="break-words text-lg font-semibold text-slate-900">{section.title}</h2>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-cyan-800 shadow-sm">Visual diagram</span>
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100">
          {section.body}
        </pre>
      </div>
    );
  }

  if (section.type === 'video') {
    // U-VIDEO-EMBED (2026-05-27 lima): if section.body's first line is a YouTube
    // watch / youtu.be URL, embed it. Anything else falls back to the original
    // placeholder so author-defined non-YT video remains supported.
    const firstLine = (section.body ?? '').split(/\r?\n/, 1)[0].trim();
    const ytMatch = firstLine.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
    const description = section.body
      ? section.body.replace(firstLine, '').trim()
      : '';

    if (ytMatch) {
      const videoId = ytMatch[1];
      const embedSrc = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
      return (
        <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="break-words text-lg font-semibold text-slate-900">{section.title}</h2>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-violet-800 shadow-sm">Video walkthrough</span>
          </div>
          <div className="overflow-hidden rounded-2xl bg-slate-950" style={{ aspectRatio: '16 / 9' }}>
            <iframe
              src={embedSrc}
              title={section.title}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{ border: 0, width: '100%', height: '100%' }}
            />
          </div>
          {description && (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{description}</p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer" className="text-violet-700 underline">
              Open in YouTube ↗
            </a>
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="break-words text-lg font-semibold text-slate-900">{section.title}</h2>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-violet-800 shadow-sm">Video walkthrough</span>
        </div>
        <div className="rounded-2xl bg-slate-950 p-6 text-center text-sm text-slate-300">
          <p className="text-base font-medium text-white">▶ Video placeholder</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Paste a YouTube URL on the first line of this section's body to embed it. Other video sources render here as a placeholder.
          </p>
        </div>
        {section.body && (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{section.body}</p>
        )}
      </div>
    );
  }

  if (section.type === '3d_viewer') {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="break-words text-lg font-semibold text-slate-900">{section.title}</h2>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm">3D model</span>
        </div>
        <div className="rounded-2xl bg-slate-950 p-6 text-center text-sm text-slate-300">
          <p className="text-base font-medium text-white">⬢ 3D viewer placeholder</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            glTF/USDZ models render here when the course author populates the model URL.
          </p>
        </div>
      </div>
    );
  }

  if (section.type === 'sandbox') {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="break-words text-lg font-semibold text-slate-900">{section.title}</h2>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-rose-800 shadow-sm">Hands-on sandbox</span>
        </div>
        <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{section.body}</div>
        <p className="mt-4 text-xs leading-5 text-rose-700">
          Apply the technique above against your own job. Kienzle calculators + the controller emulator are linked from the lesson header.
        </p>
      </div>
    );
  }

  if (section.type === 'animation') {
    return (
      <div className="rounded-3xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="break-words text-lg font-semibold text-slate-900">{section.title}</h2>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-indigo-800 shadow-sm">Animation</span>
        </div>
        <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{section.body}</div>
      </div>
    );
  }

  // Default: text content (also handles unknown types — fail-loud via fallback rendering)
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="break-words text-lg font-semibold text-slate-900">{section.title}</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Reading</span>
      </div>
      <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
        {section.body}
      </div>
    </div>
  );
}

function InlineQuestionCard({
  question,
  selectedOptionId,
  onSelect,
}: {
  question: CourseQuestion;
  selectedOptionId?: string;
  onSelect: (optionId: string) => void;
}) {
  const selected = question.options.find(option => option.id === selectedOptionId);
  const correct = selectedOptionId === question.correctOptionId;

  return (
    <div className="rounded-3xl border border-teal-200 bg-teal-50 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-teal-700">Checkpoint prompt</div>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">{question.prompt}</h3>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-teal-700 shadow-sm">{question.focus}</span>
      </div>

      <div className="mt-4 grid gap-3">
        {question.options.map(option => {
          const active = option.id === selectedOptionId;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={`min-h-[44px] rounded-2xl border px-4 py-3 text-left text-sm transition-all ${
                active
                  ? 'border-teal-500 bg-white text-slate-900 shadow-sm'
                  : 'border-teal-100 bg-white/80 text-slate-700 hover:border-teal-300 active:bg-teal-100'
              }`}
              aria-pressed={active}
            >
              {option.text}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className={`mt-4 rounded-2xl px-4 py-3 text-sm leading-6 ${
          correct
            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border border-amber-200 bg-amber-50 text-amber-700'
        }`}>
          <span className="font-semibold">{correct ? 'Nice read.' : 'Take another pass.'}</span> {question.explanation}
        </div>
      )}
    </div>
  );
}

function FinalAssessmentCard({
  questions,
  answers,
  onSelect,
  onSubmit,
  readyToSubmit,
  submitted,
  score,
  passingScore,
}: {
  questions: CourseQuestion[];
  answers: Record<string, string>;
  onSelect: (questionId: string, optionId: string) => void;
  onSubmit: () => void;
  readyToSubmit: boolean;
  submitted: boolean;
  score: number | null;
  passingScore: number;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-200">End-of-lesson test</div>
          <h2 className="mt-2 text-2xl font-semibold">Mastery check</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Answer every question, then submit to score the lesson. Passing score: {passingScore}%.
          </p>
        </div>
        {score !== null && (
          <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${
            score >= passingScore
              ? 'bg-emerald-500/20 text-emerald-200'
              : 'bg-amber-500/20 text-amber-200'
          }`}>
            Current score: {score}%
          </div>
        )}
      </div>

      <div className="mt-5 space-y-4">
        {questions.map((question, index) => (
          <div key={question.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-white">
                {index + 1}. {question.prompt}
              </h3>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">
                {question.focus}
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {question.options.map(option => {
                const active = answers[question.id] === option.id;
                const isCorrectOption = option.id === question.correctOptionId;
                const showResult = submitted && active;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onSelect(question.id, option.id)}
                    aria-pressed={active}
                    className={`min-h-[44px] rounded-2xl border px-4 py-3 text-left text-sm transition-all ${
                      showResult && isCorrectOption
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                        : showResult && !isCorrectOption
                          ? 'border-amber-400 bg-amber-500/20 text-amber-100'
                          : active
                            ? 'border-teal-300 bg-teal-500/20 text-white'
                            : 'border-white/10 bg-white/5 text-slate-200 hover:border-teal-300/70 active:bg-white/10'
                    }`}
                  >
                    {option.text}
                  </button>
                );
              })}
            </div>

            {submitted && (
              <div className={`mt-4 rounded-2xl px-4 py-3 text-sm leading-6 ${
                answers[question.id] === question.correctOptionId
                  ? 'bg-emerald-500/15 text-emerald-100'
                  : 'bg-amber-500/15 text-amber-100'
              }`}>
                {question.explanation}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-300">
          {readyToSubmit
            ? 'All questions answered. Submit whenever you are ready.'
            : `Answer ${questions.length - Object.keys(answers).length} more question${questions.length - Object.keys(answers).length === 1 ? '' : 's'} to unlock scoring.`}
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!readyToSubmit}
          className={`min-h-[44px] rounded-2xl px-5 py-3 text-sm font-medium transition-colors ${
            readyToSubmit
              ? 'bg-teal-400 text-slate-950 hover:bg-teal-300 active:bg-teal-500'
              : 'cursor-not-allowed bg-slate-700 text-slate-400'
          }`}
        >
          Submit mastery check
        </button>
      </div>
    </div>
  );
}

function FieldGroup({
  label,
  values,
  emptyLabel,
}: {
  label: string;
  values: string[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-amber-200/60 bg-white/80 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">{label}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.length > 0 ? values.map(value => (
          <span key={value} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {value}
          </span>
        )) : (
          <span className="text-sm text-slate-500">{emptyLabel}</span>
        )}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function InfoBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
