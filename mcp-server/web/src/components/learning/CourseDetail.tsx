import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ACADEMY_PROGRAMS,
  DOMAIN_LABELS,
  getTracksForCourse,
  LEVEL_COLORS,
  LEVEL_LABELS,
  getCourseById,
  type Course,
  type CourseLesson,
} from '../../data/academy';
import { useCourses } from '../../hooks/useCourses';
import { useStudentId } from '../../hooks/useStudentId';

export function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { isCourseUnlocked, isCourseComplete, courseProgress } = useCourses(useStudentId());
  const course = getCourseById(courseId || '');

  if (!course) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-gray-500">Course not found.</p>
        <button
          onClick={() => navigate('/learning/academy')}
          className="text-sm font-medium text-prism-600 hover:text-prism-700"
        >
          ← Back to Academy
        </button>
      </div>
    );
  }

  const locked = !isCourseUnlocked(course.id);
  const pct = courseProgress(course.id);
  const program = ACADEMY_PROGRAMS.find(item => item.id === course.programId);
  const lessonCount = course.lessons.length;
  const quizCount = course.lessons.reduce((sum, lesson) => sum + lesson.quiz_questions, 0);
  const engineCount = new Set(course.lessons.flatMap(lesson => lesson.engine_links)).size;
  const tracks = getTracksForCourse(course.id);

  return (
    <div className="space-y-6">
      <Link to="/learning/academy" className="text-sm font-medium text-prism-600 hover:text-prism-700">
        ← All Courses
      </Link>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
          <div className="max-w-4xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white ${LEVEL_COLORS[course.level]}`}>
                {LEVEL_LABELS[course.level]}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {DOMAIN_LABELS[course.domain]}
              </span>
              {program && (
                <span className="rounded-full bg-prism-50 px-2 py-0.5 text-xs font-medium text-prism-700">
                  {program.title}
                </span>
              )}
              {locked && <span className="text-xs font-medium text-amber-700">🔒 prerequisites required</span>}
            </div>

            <div className="flex items-start gap-4">
              <span className="text-5xl">{course.icon}</span>
              <div className="space-y-2">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">{course.title}</h1>
                  <p className="text-base font-medium text-prism-700">{course.subtitle}</p>
                </div>
                <p className="max-w-3xl text-sm leading-6 text-slate-600">{course.description}</p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Outcome</div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{course.role_outcome}</p>
            </div>
          </div>

          <div className="grid gap-3 lg:w-80">
            <QuickStat label="Lessons" value={`${lessonCount}`} />
            <QuickStat label="Duration" value={`${Math.round(course.duration_min / 60)}+ hours`} />
            <QuickStat label="Engines touched" value={`${engineCount}`} />
            <QuickStat label="Interactive questions" value={`${quizCount}`} />
          </div>
        </div>

        {pct > 0 && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
              <span>Course progress</span>
              <span>{pct}% complete</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Mastery outcomes</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {course.mastery_outcomes.map(outcome => (
                <div key={outcome} className="rounded-2xl bg-prism-50 p-4 text-sm text-prism-800">
                  {outcome}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Course lessons</h2>
              <span className="text-sm text-slate-500">{lessonCount} lessons</span>
            </div>
            <div className="mt-4 space-y-3">
              {course.lessons.map((lesson, index) => (
                <LessonRow
                  key={lesson.id}
                  course={course}
                  lesson={lesson}
                  index={index}
                  locked={locked}
                />
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <InfoCard title="Capstone">
            <p className="text-sm leading-6 text-slate-700">{course.capstone}</p>
          </InfoCard>

          <InfoCard title="Machine focus">
            <div className="flex flex-wrap gap-2">
              {course.machine_focus.map(machine => (
                <span key={machine} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {machine}
                </span>
              ))}
            </div>
          </InfoCard>

          {course.prerequisites.length > 0 && (
            <InfoCard title="Prerequisites">
              <div className="space-y-2">
                {course.prerequisites.map(prerequisiteId => {
                  const prerequisite = getCourseById(prerequisiteId);
                  const complete = isCourseComplete(prerequisiteId);
                  return (
                    <Link
                      key={prerequisiteId}
                      to={`/learning/academy/${prerequisiteId}`}
                      className={`block rounded-2xl border px-4 py-3 text-sm ${
                        complete
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                      }`}
                    >
                      {complete ? '✓' : '○'} {prerequisite?.title || prerequisiteId}
                    </Link>
                  );
                })}
              </div>
            </InfoCard>
          )}

          {program && (
            <InfoCard title="Program fit">
              <div className="space-y-2 text-sm leading-6 text-slate-700">
                <div className="font-semibold text-slate-900">{program.title}</div>
                <p>{program.description}</p>
                <p className="text-slate-500">{program.completion_outcome}</p>
              </div>
            </InfoCard>
          )}

          {tracks.length > 0 && (
            <InfoCard title="Specialization fit">
              <div className="space-y-3">
                {tracks.map(track => (
                  <div key={track.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900">{track.title}</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{track.target_role}</p>
                  </div>
                ))}
              </div>
            </InfoCard>
          )}
        </aside>
      </div>
    </div>
  );
}

function LessonRow({
  lesson,
  index,
  course,
  locked,
}: {
  lesson: CourseLesson;
  index: number;
  course: Course;
  locked: boolean;
}) {
  const calculatorCount = lesson.sections.filter(section => section.type === 'calculator').length;

  return (
    <Link
      to={locked ? '#' : `/learning/academy/${course.id}/${lesson.id}`}
      onClick={event => locked && event.preventDefault()}
      className={`block rounded-2xl border p-4 transition-all ${
        locked
          ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
          : 'border-slate-200 bg-white hover:border-prism-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-4">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-prism-100 text-sm font-semibold text-prism-700">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-slate-900">{lesson.title}</h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{lesson.duration_min} min</span>
              {lesson.quiz_questions > 0 && <span>{lesson.quiz_questions} questions</span>}
              {calculatorCount > 0 && <span>{calculatorCount} calculator{calculatorCount > 1 ? 's' : ''}</span>}
              <span>visual coaching</span>
            </div>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{lesson.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {lesson.key_formulas.slice(0, 3).map(formula => (
              <span key={formula} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                {formula}
              </span>
            ))}
            {lesson.engine_links.slice(0, 3).map(engine => (
              <span key={engine} className="rounded-full bg-prism-50 px-2 py-1 text-[11px] font-medium text-prism-700">
                {engine}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}
