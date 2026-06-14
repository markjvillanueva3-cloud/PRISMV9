import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ACADEMY_PROGRAMS,
  ALL_COURSES,
  DOMAIN_LABELS,
  LEVEL_COLORS,
  LEVEL_LABELS,
  SPECIALIZATION_TRACKS,
  TOTAL_DURATION_MIN,
  TOTAL_LESSONS,
  type AcademyProgram,
  type Course,
  type CourseDomain,
  type CourseLevel,
  type ProgramId,
  type SpecializationTrack,
  type SpecializationTrackId,
} from '../../data/academy';
import { useCourses } from '../../hooks/useCourses';
import { useStudentId } from '../../hooks/useStudentId';

const LEVELS: CourseLevel[] = ['L0', 'L1', 'L2', 'L3'];
const DOMAINS: CourseDomain[] = ['Foundations', 'Programming', 'Machining', 'Optimization', 'Business'];

export function CourseCatalog() {
  const navigate = useNavigate();
  const { completedCourseIds, isCourseUnlocked, isCourseComplete, stats } = useCourses(useStudentId());
  const [levelFilter, setLevelFilter] = useState<CourseLevel | 'ALL'>('ALL');
  const [domainFilter, setDomainFilter] = useState<CourseDomain | 'ALL'>('ALL');
  const [programFilter, setProgramFilter] = useState<ProgramId | 'ALL'>('ALL');
  const [trackFilter, setTrackFilter] = useState<SpecializationTrackId | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ALL_COURSES.filter(course => {
      if (levelFilter !== 'ALL' && course.level !== levelFilter) return false;
      if (domainFilter !== 'ALL' && course.domain !== domainFilter) return false;
      if (programFilter !== 'ALL' && course.programId !== programFilter) return false;
      if (trackFilter !== 'ALL') {
        const track = SPECIALIZATION_TRACKS.find(item => item.id === trackFilter);
        if (!track) return false;
        if (!track.courseIds.includes(course.id) && !track.electiveCourseIds.includes(course.id)) return false;
      }
      if (!query) return true;
      return [
        course.title,
        course.subtitle,
        course.description,
        course.role_outcome,
        ...course.mastery_outcomes,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [domainFilter, levelFilter, programFilter, search, trackFilter]);

  const totalHours = Math.round(TOTAL_DURATION_MIN / 60);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl space-y-4">
            <div className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-200">
              PRISM Academy
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                From first blueprint to 5-axis and mill-turn mastery
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                The web academy now mirrors PRISM&apos;s deeper curriculum: structured foundations,
                operator development, advanced CAM fluency, multi-axis strategy, optimization,
                troubleshooting, and business judgment. This is designed as a real progression,
                not a handful of placeholder lessons.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <HeroStat label="Programs" value={`${ACADEMY_PROGRAMS.length}`} />
            <HeroStat label="Courses" value={`${ALL_COURSES.length}`} />
          <HeroStat label="Lessons" value={`${TOTAL_LESSONS}`} />
            <HeroStat label="Hours" value={`${totalHours}+`} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {ACADEMY_PROGRAMS.map(program => (
          <ProgramCard
            key={program.id}
            program={program}
            active={programFilter === program.id}
            completedCourseIds={completedCourseIds}
            onClick={() => setProgramFilter(current => current === program.id ? 'ALL' : program.id)}
          />
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Specialization tracks</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Train for the job you actually want</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              These tracks group the academy into role-based development paths for mills, lathes, 5-axis, mill-turn/swiss, and process leadership.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTrackFilter('ALL')}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900"
          >
            Clear track filter
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SPECIALIZATION_TRACKS.map(track => (
            <TrackCard
              key={track.id}
              track={track}
              active={trackFilter === track.id}
              completedCourseIds={completedCourseIds}
              onClick={() => setTrackFilter(current => current === track.id ? 'ALL' : track.id)}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</span>
            <input
              type="text"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search by skill, outcome, or course title"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-prism-500 focus:outline-none focus:ring-2 focus:ring-prism-500/20"
            />
          </label>
          <FilterSelect
            label="Level"
            value={levelFilter}
            onChange={value => setLevelFilter(value as CourseLevel | 'ALL')}
            options={[{ value: 'ALL', label: 'All levels' }, ...LEVELS.map(level => ({ value: level, label: LEVEL_LABELS[level] }))]}
          />
          <FilterSelect
            label="Domain"
            value={domainFilter}
            onChange={value => setDomainFilter(value as CourseDomain | 'ALL')}
            options={[{ value: 'ALL', label: 'All domains' }, ...DOMAINS.map(domain => ({ value: domain, label: DOMAIN_LABELS[domain] }))]}
          />
          <FilterSelect
            label="Program"
            value={programFilter}
            onChange={value => setProgramFilter(value as ProgramId | 'ALL')}
            options={[{ value: 'ALL', label: 'All programs' }, ...ACADEMY_PROGRAMS.map(program => ({ value: program.id, label: program.title }))]}
          />
          <FilterSelect
            label="Track"
            value={trackFilter}
            onChange={value => setTrackFilter(value as SpecializationTrackId | 'ALL')}
            options={[{ value: 'ALL', label: 'All tracks' }, ...SPECIALIZATION_TRACKS.map(track => ({ value: track.id, label: track.title }))]}
          />
        </div>
        <div className="flex items-end justify-between gap-4 border-t border-slate-100 pt-3 text-sm text-slate-500 lg:flex-col lg:items-end lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div className="text-right">
            <div className="text-2xl font-semibold text-slate-900">{filtered.length}</div>
            <div>courses shown</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-emerald-600">{stats.percentComplete}%</div>
            <div>academy completion</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map(course => (
          <CourseCard
            key={course.id}
            course={course}
            locked={!isCourseUnlocked(course.id)}
            completed={isCourseComplete(course.id)}
            onClick={() => navigate(`/learning/academy/${course.id}`)}
          />
        ))}
      </section>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
          No courses match the current filters. Try clearing the program, track, or domain filter to see the full mastery path again.
        </div>
      )}
    </div>
  );
}

function TrackCard({
  track,
  active,
  completedCourseIds,
  onClick,
}: {
  track: SpecializationTrack;
  active: boolean;
  completedCourseIds: Set<string>;
  onClick: () => void;
}) {
  const requiredCourses = ALL_COURSES.filter(course => track.courseIds.includes(course.id));
  const completedRequired = requiredCourses.filter(course => completedCourseIds.has(course.id)).length;
  const lessonCount = requiredCourses.reduce((sum, course) => sum + course.lessons.length, 0);
  const hours = Math.round(requiredCourses.reduce((sum, course) => sum + course.duration_min, 0) / 60);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-3xl border p-5 text-left shadow-sm transition-all ${
        active
          ? 'border-prism-400 bg-prism-50 shadow-md'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
      }`}
    >
      <div className={`rounded-2xl bg-gradient-to-br ${track.color} p-4 text-white`}>
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/75">{track.kicker}</div>
        <h3 className="mt-2 text-xl font-semibold">{track.title}</h3>
        <p className="mt-2 text-sm leading-6 text-white/85">{track.description}</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <StatPill label="Required" value={`${requiredCourses.length}`} />
        <StatPill label="Lessons" value={`${lessonCount}`} />
        <StatPill label="Hours" value={`${hours}+`} />
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target role</div>
        <div className="mt-2 text-sm font-semibold text-slate-900">{track.target_role}</div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{track.completion_outcome}</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <FocusMini label="Machines" values={track.machine_focus} />
        <FocusMini label="CAM" values={track.cam_focus} />
        <FocusMini label="Controls" values={track.controller_focus} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
        <span className="font-medium text-slate-700">{completedRequired}/{requiredCourses.length} required complete</span>
        <span className="text-prism-700">{active ? 'Filtering to this path' : 'Show this path'}</span>
      </div>
    </button>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs uppercase tracking-wide text-slate-300">{label}</div>
    </div>
  );
}

function ProgramCard({
  program,
  active,
  completedCourseIds,
  onClick,
}: {
  program: AcademyProgram;
  active: boolean;
  completedCourseIds: Set<string>;
  onClick: () => void;
}) {
  const courses = ALL_COURSES.filter(course => course.programId === program.id);
  const completedCount = courses.filter(course => completedCourseIds.has(course.id)).length;
  const lessonCount = courses.reduce((sum, course) => sum + course.lessons.length, 0);
  const hours = Math.round(courses.reduce((sum, course) => sum + course.duration_min, 0) / 60);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-3xl border p-5 text-left shadow-sm transition-all ${
        active
          ? 'border-prism-400 bg-prism-50 shadow-md'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
      }`}
    >
      <div className={`mb-4 rounded-2xl bg-gradient-to-br ${program.color} p-4 text-white`}>
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/75">{program.kicker}</div>
        <h2 className="mt-2 text-xl font-semibold">{program.title}</h2>
        <p className="mt-2 text-sm leading-6 text-white/85">{program.description}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <StatPill label="Courses" value={`${courses.length}`} />
          <StatPill label="Lessons" value={`${lessonCount}`} />
        <StatPill label="Hours" value={`${hours}+`} />
      </div>
      <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        <div className="font-semibold text-slate-900">{program.target_role}</div>
        <p className="mt-2 leading-6">{program.completion_outcome}</p>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{completedCount}/{courses.length} courses complete</span>
        <span className="text-prism-700">{active ? 'Showing only this track' : 'Filter to this track'}</span>
      </div>
    </button>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-100 px-3 py-2 text-center">
      <div className="text-lg font-semibold text-slate-900">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-prism-500 focus:outline-none focus:ring-2 focus:ring-prism-500/20"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function CourseCard({
  course,
  locked,
  completed,
  onClick,
}: {
  course: Course;
  locked: boolean;
  completed: boolean;
  onClick: () => void;
}) {
  const engineCount = new Set(course.lessons.flatMap(lesson => lesson.engine_links)).size;
  const calculatorCount = course.lessons.reduce(
    (sum, lesson) => sum + lesson.sections.filter(section => section.type === 'calculator').length,
    0,
  );
  const program = ACADEMY_PROGRAMS.find(item => item.id === course.programId);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      className={`w-full rounded-3xl border p-5 text-left shadow-sm transition-all ${
        locked
          ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
          : completed
          ? 'border-emerald-200 bg-emerald-50 hover:shadow-md'
          : 'border-slate-200 bg-white hover:border-prism-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{course.icon}</span>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white ${LEVEL_COLORS[course.level]}`}>
                {LEVEL_LABELS[course.level]}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {DOMAIN_LABELS[course.domain]}
              </span>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{course.title}</h3>
            <p className="text-sm font-medium text-prism-700">{course.subtitle}</p>
          </div>
        </div>
        <div className="text-right text-xs text-slate-500">
          {completed && <div className="font-semibold text-emerald-700">Completed</div>}
          {locked && <div className="font-semibold text-amber-700">Locked</div>}
          {!locked && !completed && <div className="font-semibold text-slate-700">Open</div>}
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">{course.description}</p>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <MetaBlock label="Lessons" value={`${course.lessons.length}`} />
        <MetaBlock label="Hours" value={`${Math.round(course.duration_min / 60)}+`} />
        <MetaBlock label="Engines" value={`${engineCount}`} />
        <MetaBlock label="Calculators" value={`${calculatorCount}`} />
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">By the end</div>
        <p className="mt-2 text-sm leading-6 text-slate-700">{course.role_outcome}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {course.mastery_outcomes.slice(0, 3).map(outcome => (
          <span key={outcome} className="rounded-full bg-prism-50 px-3 py-1 text-xs font-medium text-prism-700">
            {outcome}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
        <span className="text-slate-500">{program?.title ?? 'Academy track'}</span>
        <span className="font-medium text-prism-700">{locked ? 'Complete prerequisites first' : 'Open course'}</span>
      </div>
    </button>
  );
}

function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-100 px-3 py-2">
      <div className="text-lg font-semibold text-slate-900">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function FocusMini({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-2xl bg-slate-100 px-3 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-sm text-slate-700">{values.slice(0, 2).join(' · ')}</div>
    </div>
  );
}
