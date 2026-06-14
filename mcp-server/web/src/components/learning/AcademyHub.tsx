/**
 * AcademyHub — drill-down hub for the PRISM Academy with desktop responsiveness,
 * picks persistence, per-employee track auto-select, and active learning path commit.
 *
 * History:
 *   - 2026-05-27 (peer 92ef25c0): NEW component, 3-step mobile drill-down
 *     (Domain → Sub-category chips → Generate Optimized Coursework).
 *   - 2026-05-27 (claude-da82938b, this commit): full UX overhaul per operator
 *     directive "do everything to make improvements to make it more user
 *     friendly". Layout responsive on tablet/desktop; selections persist across
 *     refresh; logged-in employee gets their pre-defined track auto-selected
 *     with a one-tap banner accept/skip; generated coursework can be committed
 *     as the user's "active learning path" so CourseDetail + dashboard widgets
 *     reflect their journey.
 *
 * Closes Hub R12 deferrals U-ACADEMY-PICKS-PERSIST and U-ACADEMY-TRACK-AUTOSELECT.
 * U-ACADEMY-TAG-METADATA (keyword predicates → tags: string[]) is the only one
 * still open after this commit — tracked separately because it touches
 * academy.ts (137 KB) and is an architectural migration not pure layout.
 *
 * Karpathy R5+R11: model only for judgment (none here — this is pure UI state
 * machine code). Conform to surrounding Tailwind + slate/cyan palette.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ALL_COURSES,
  type Course,
  type CourseDomain,
  type CourseLevel,
} from '../../data/academy';
import { EMPLOYEE_TRACKS, JM_DIE_EMPLOYEES, type EmployeeRoleId } from '../../data/employee-tracks';
import { useCourses } from '../../hooks/useCourses';
import { useStudentId } from '../../hooks/useStudentId';
import {
  loadPicks,
  savePicks,
  loadActivePath,
  saveActivePath,
  clearActivePath,
  type AcademyPicks,
} from '../../lib/academyPicksStorage';

// ─── Domain → sub-category taxonomy ──────────────────────────────────────
// Keyword predicates match course title / domain. U-ACADEMY-TAG-METADATA will
// move these to explicit Course.tags[] in a follow-up commit. The keyword
// approach is good enough as long as ALL_COURSES titles stay stable.

interface SubCategory {
  id: string;
  label: string;
  description: string;
  predicate: (c: Course) => boolean;
}

interface DomainBlock {
  domain: CourseDomain;
  icon: string;
  blurb: string;
  subcategories: SubCategory[];
}

const DOMAIN_BLOCKS: DomainBlock[] = [
  {
    domain: 'Foundations',
    icon: '🟦',
    blurb: 'Safety · Measurement · Print reading · G-code basics',
    subcategories: [
      {
        id: 'foundations-onboarding',
        label: 'Onboarding & Safety',
        description: 'Day-1 shop-floor essentials',
        predicate: (c) => c.domain === 'Foundations' && (c.id === 'course-0a' || c.id === 'course-0b' || c.id === 'course-0c'),
      },
      {
        id: 'foundations-print-gd-t',
        label: 'Print Reading & GD&T',
        description: 'ASME Y14.5, callouts, datums',
        predicate: (c) => c.domain === 'Foundations' && (c.title.toLowerCase().includes('print') || c.title.toLowerCase().includes('gd&t')),
      },
      {
        id: 'foundations-gcode',
        label: 'G-Code Basics',
        description: 'Reading + writing entry-level programs',
        predicate: (c) => c.title.toLowerCase().includes('g-code') || c.title.toLowerCase().includes('g code'),
      },
      {
        id: 'foundations-all',
        label: 'All Foundations',
        description: 'Every L0/L1 foundations course',
        predicate: (c) => c.domain === 'Foundations',
      },
    ],
  },
  {
    domain: 'Programming',
    icon: '💻',
    blurb: 'CAD · CAM · 5-Axis · Post-processing',
    subcategories: [
      {
        id: 'programming-cad',
        label: 'CAD (SolidWorks, Fusion, Inventor)',
        description: '2D/3D modeling, assemblies, prints',
        predicate: (c) => c.domain === 'Programming' && c.title.toLowerCase().includes('cad'),
      },
      {
        id: 'programming-cam',
        label: 'CAM (Mastercam, hyperMILL, Esprit)',
        description: 'Toolpath generation',
        predicate: (c) => c.domain === 'Programming' && (c.title.toLowerCase().includes('cam') || c.title.toLowerCase().includes('toolpath')),
      },
      {
        id: 'programming-5axis',
        label: '5-Axis Mastery',
        description: 'Kinematics + RTCP + strategy',
        predicate: (c) => c.title.toLowerCase().includes('5-axis') || c.title.toLowerCase().includes('5 axis'),
      },
      {
        id: 'programming-post',
        label: 'Post-Processors',
        description: 'Edit + debug .cps files',
        predicate: (c) => c.title.toLowerCase().includes('post-proc') || c.title.toLowerCase().includes('post processor'),
      },
      {
        id: 'programming-complex-geometry',
        label: 'Complex Geometry CAM',
        description: 'Molds, turbines, aerospace',
        predicate: (c) => c.title.toLowerCase().includes('complex geometry') || c.title.toLowerCase().includes('mold'),
      },
      {
        id: 'programming-all',
        label: 'All Programming',
        description: 'Every Programming-domain course',
        predicate: (c) => c.domain === 'Programming',
      },
    ],
  },
  {
    domain: 'Machining',
    icon: '⚙️',
    blurb: 'Mill · Lathe · WEDM · Sinker EDM · Tooling',
    subcategories: [
      {
        id: 'machining-mill',
        label: 'Mill Operations & Tooling',
        description: 'Spindle holders, end mills, inserts',
        predicate: (c) => c.domain === 'Machining' && c.title.toLowerCase().includes('mill'),
      },
      {
        id: 'machining-lathe',
        label: 'Lathe Operations & Tooling',
        description: 'Turrets, jaws, collets, inserts',
        predicate: (c) => c.domain === 'Machining' && c.title.toLowerCase().includes('lathe'),
      },
      {
        id: 'machining-edm',
        label: 'EDM (Sinker + WEDM)',
        description: 'Electrodes, robot-fed, EA12S',
        predicate: (c) => c.title.toLowerCase().includes('edm') || c.title.toLowerCase().includes('electrode'),
      },
      {
        id: 'machining-hard',
        label: 'Hard Machining (HRC 50+)',
        description: 'CBN, ceramic, hard turning + milling',
        predicate: (c) => c.title.toLowerCase().includes('hard'),
      },
      {
        id: 'machining-jm-fleet',
        label: 'JM Fleet Machines',
        description: 'VMC-01..05, LTH-01..07, EDM-01..02',
        predicate: (c) => c.title.toLowerCase().includes('jm fleet') || c.title.toLowerCase().includes('jm die'),
      },
      {
        id: 'machining-chip-control',
        label: 'Chip Control & Thickness',
        description: 'ISO 3685, breakers, chip-thinning',
        predicate: (c) => c.title.toLowerCase().includes('chip'),
      },
      {
        id: 'machining-all',
        label: 'All Machining',
        description: 'Every Machining-domain course',
        predicate: (c) => c.domain === 'Machining',
      },
    ],
  },
  {
    domain: 'Optimization',
    icon: '📈',
    blurb: 'Speed/Feed · Tooling DB · Workholding · FEA',
    subcategories: [
      {
        id: 'optimization-speed-feed',
        label: 'Speed/Feed Calculator',
        description: 'Kienzle + Taylor + ISO P/M/K/N/S/H',
        predicate: (c) => c.title.toLowerCase().includes('speed') || c.title.toLowerCase().includes('feed'),
      },
      {
        id: 'optimization-tooling',
        label: 'Tooling Database',
        description: 'ISO B212.4 + holder + ATC',
        predicate: (c) => c.title.toLowerCase().includes('tooling database') || c.title.toLowerCase().includes('tooling encyclopedia'),
      },
      {
        id: 'optimization-workholding',
        label: 'Work-Holding Database',
        description: 'Vises, chucks, 3R/Erowa, force balance',
        predicate: (c) => c.title.toLowerCase().includes('work-holding') || c.title.toLowerCase().includes('workholding'),
      },
      {
        id: 'optimization-fea',
        label: 'FEA & Stress Testing',
        description: 'Static, mesh, modal, fatigue',
        predicate: (c) => c.title.toLowerCase().includes('fea') || c.title.toLowerCase().includes('stress'),
      },
      {
        id: 'optimization-cycle-time',
        label: 'Cycle Time & MRR',
        description: 'Optimization for shop throughput',
        predicate: (c) => c.title.toLowerCase().includes('cycle') || c.title.toLowerCase().includes('mrr'),
      },
      {
        id: 'optimization-all',
        label: 'All Optimization',
        description: 'Every Optimization-domain course',
        predicate: (c) => c.domain === 'Optimization',
      },
    ],
  },
  {
    domain: 'Business',
    icon: '💼',
    blurb: 'Quoting · Accounting · Lean/Sigma/Kaizen · Logistics',
    subcategories: [
      {
        id: 'business-quoting',
        label: 'Quoting & Estimation',
        description: 'Real customer-quote workflow',
        predicate: (c) => c.title.toLowerCase().includes('quot'),
      },
      {
        id: 'business-accounting',
        label: 'Accounting & Bookkeeping',
        description: 'QuickBooks, P&L basics',
        predicate: (c) => c.title.toLowerCase().includes('accounting') || c.title.toLowerCase().includes('quickbooks'),
      },
      {
        id: 'business-lean-sigma',
        label: 'Lean / Six Sigma / Kaizen',
        description: '8 wastes, DMAIC, A3 reports',
        predicate: (c) => c.title.toLowerCase().includes('lean') || c.title.toLowerCase().includes('sigma') || c.title.toLowerCase().includes('kaizen'),
      },
      {
        id: 'business-qc',
        label: 'QC & Inspection',
        description: 'CMM, gauging, FAI',
        predicate: (c) => c.title.toLowerCase().includes('qc') || c.title.toLowerCase().includes('inspection'),
      },
      {
        id: 'business-logistics',
        label: 'Logistics & Shipping',
        description: 'Packing, freight, ITAR/EAR basics',
        predicate: (c) => c.title.toLowerCase().includes('logistics') || c.title.toLowerCase().includes('shipping'),
      },
      {
        id: 'business-all',
        label: 'All Business',
        description: 'Every Business-domain course',
        predicate: (c) => c.domain === 'Business',
      },
    ],
  },
];

// ─── Prereq topo-sort (Kahn's algorithm) ─────────────────────────────────

interface SortResult {
  ordered: Course[];
  hadCycle: boolean;
  missingPrereqs: Array<{ courseId: string; missingId: string }>;
}

function topoSortByPrereq(courses: Course[], allCoursesById: Map<string, Course>): SortResult {
  const selectedIds = new Set(courses.map((c) => c.id));
  const missingPrereqs: Array<{ courseId: string; missingId: string }> = [];

  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const c of courses) {
    inDegree.set(c.id, 0);
    dependents.set(c.id, []);
  }
  for (const c of courses) {
    for (const prereqId of c.prerequisites) {
      if (selectedIds.has(prereqId)) {
        inDegree.set(c.id, (inDegree.get(c.id) ?? 0) + 1);
        const list = dependents.get(prereqId);
        if (list) list.push(c.id);
      } else if (allCoursesById.has(prereqId)) {
        missingPrereqs.push({ courseId: c.id, missingId: prereqId });
      }
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id);
  }
  queue.sort((a, b) => {
    const ca = allCoursesById.get(a);
    const cb = allCoursesById.get(b);
    if (!ca || !cb) return 0;
    return compareCourses(ca, cb);
  });

  const ordered: Course[] = [];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const c = allCoursesById.get(id);
    if (c) ordered.push(c);
    const deps = dependents.get(id) ?? [];
    const newlyEnqueueable: string[] = [];
    for (const depId of deps) {
      const newDeg = (inDegree.get(depId) ?? 0) - 1;
      inDegree.set(depId, newDeg);
      if (newDeg === 0) newlyEnqueueable.push(depId);
    }
    newlyEnqueueable.sort((a, b) => {
      const ca = allCoursesById.get(a);
      const cb = allCoursesById.get(b);
      if (!ca || !cb) return 0;
      return compareCourses(ca, cb);
    });
    queue.push(...newlyEnqueueable);
  }

  const hadCycle = ordered.length < courses.length;
  if (hadCycle) {
    for (const c of courses) {
      if (!visited.has(c.id)) ordered.push(c);
    }
  }

  return { ordered, hadCycle, missingPrereqs };
}

function courseSortKey(c: Course): number {
  const levelRank: Record<CourseLevel, number> = { L0: 0, L1: 1, L2: 2, L3: 3 };
  return levelRank[c.level] * 1000 + parseInt(c.id.replace(/[^0-9]/g, '') || '0', 10);
}

/**
 * Tiebreak comparator used after courseSortKey collisions (e.g. course-0a /
 * course-0b / course-0c all collapse to parseInt "0"). Lexical id sort is the
 * stable secondary so peer review can't drift on insertion order. Per scrutiny
 * reviewer P1-1.
 */
function compareCourses(a: Course, b: Course): number {
  const keyDiff = courseSortKey(a) - courseSortKey(b);
  if (keyDiff !== 0) return keyDiff;
  return a.id.localeCompare(b.id);
}

// ─── Employee-track helpers ─────────────────────────────────────────────────

/**
 * Returns the canonical EmployeeRoleId IFF the auth's studentId names a
 * JM Die employee profile. Other studentIds (real shop hires, guest demo)
 * resolve to null and the banner does NOT fire.
 */
function resolveEmployeeRole(studentId: string | null): EmployeeRoleId | null {
  if (!studentId) return null;
  return (studentId in JM_DIE_EMPLOYEES) ? (studentId as EmployeeRoleId) : null;
}

/**
 * For a given employee track, infer the sub-category ids that best cover
 * that track's course list. We match each track course against every
 * sub-category predicate; SPECIFIC sub-cats that capture ≥1 track course
 * are picked.
 *
 * Per scrutiny reviewer P0-4: the previous version fell back to "*-all"
 * sub-cats when a track course had no specific match. That fallback FLOODED
 * the result with courses NOT in the operator's track (e.g. picking
 * "foundations-all" added every Foundations course, not just the 3 from the
 * track). The fallback is removed. Track courses that find no specific sub-cat
 * are reported via console.warn (R12 fail-loud) so a future
 * U-ACADEMY-TAG-METADATA pass can add the missing predicate.
 *
 * Returns sub-category ids (used by the Hub to seed selectedSubIds).
 */
function tracksToSubCatIds(trackCourseIds: string[]): string[] {
  const picked = new Set<string>();
  const coveredCourses = new Set<string>();

  for (const courseId of trackCourseIds) {
    const course = ALL_COURSES.find((c) => c.id === courseId);
    if (!course) continue;
    for (const block of DOMAIN_BLOCKS) {
      for (const sub of block.subcategories) {
        if (sub.id.endsWith('-all')) continue; // never auto-pick "*-all"
        if (sub.predicate(course)) {
          picked.add(sub.id);
          coveredCourses.add(courseId);
        }
      }
    }
  }

  // R12: report any track courses that aren't reachable via current sub-cat
  // predicates. Operator-visible signal that a track needs a sub-cat predicate
  // (or that U-ACADEMY-TAG-METADATA needs to migrate to explicit Course.tags).
  const uncovered = trackCourseIds.filter((id) => !coveredCourses.has(id));
  if (uncovered.length > 0 && typeof console !== 'undefined') {
    // eslint-disable-next-line no-console
    console.warn(
      `[AcademyHub] tracksToSubCatIds: ${uncovered.length} track course(s) not reachable via any sub-cat predicate:`,
      uncovered,
    );
  }

  return Array.from(picked);
}

/**
 * Stable hash of a track's course_ids — used to detect when the employee's
 * curriculum has been edited so the auto-select banner can re-fire. Reviewer
 * P0-5: previously the banner fired exactly once per browser per worker;
 * track edits after that were silently invisible to returning users.
 */
function hashTrackCourseIds(courseIds: string[]): string {
  // Simple non-crypto hash sufficient for "did the list change"
  return courseIds.join('|');
}

// ─── Component ───────────────────────────────────────────────────────────

export function AcademyHub() {
  const studentId = useStudentId();
  const { isCourseComplete, completedCourseIds, stats, startCourse } = useCourses(studentId);

  const [openDomain, setOpenDomain] = useState<CourseDomain | null>(null);
  const [selectedSubIds, setSelectedSubIds] = useState<Set<string>>(new Set());
  const [loadedTrackId, setLoadedTrackId] = useState<string | null>(null);
  const [loadedTrackHash, setLoadedTrackHash] = useState<string | null>(null);
  const [trackBannerDismissed, setTrackBannerDismissed] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [pathSavedAt, setPathSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reviewer P1-2 worker-swap race fix: track the studentId we've hydrated
  // for so the autosave guard re-closes when the worker changes on a shared
  // tablet. A plain boolean leaves a one-render window where the previous
  // worker's state writes to the new worker's localStorage key.
  const hydratedFor = useRef<string | null | undefined>(undefined);

  // ─── Hydration: load persisted picks + active path, or auto-select track ─
  useEffect(() => {
    hydratedFor.current = undefined; // close the autosave guard until we finish

    const persisted = loadPicks(studentId);
    const employeeRole = resolveEmployeeRole(studentId);
    const currentTrackHash = employeeRole
      ? hashTrackCourseIds(EMPLOYEE_TRACKS[employeeRole].course_ids)
      : null;

    if (persisted) {
      // Reviewer P0-5: if the persisted loadedTrackId still matches the
      // current employee AND the track's course list has changed since the
      // last visit, RE-fire the auto-select with a fresh banner so the
      // operator's curriculum edit propagates.
      const persistedRole = resolveEmployeeRole(persisted.loadedTrackId);
      const trackEdited =
        persistedRole !== null &&
        persistedRole === employeeRole &&
        currentTrackHash !== null &&
        persisted.loadedTrackHash !== currentTrackHash;

      if (trackEdited && employeeRole) {
        const track = EMPLOYEE_TRACKS[employeeRole];
        const subs = tracksToSubCatIds(track.course_ids);
        setSelectedSubIds(new Set(subs));
        setOpenDomain(null);
        setLoadedTrackId(employeeRole);
        setLoadedTrackHash(currentTrackHash);
        setTrackBannerDismissed(false);
      } else {
        setSelectedSubIds(new Set(persisted.selectedSubIds));
        setOpenDomain(persisted.openDomain as CourseDomain | null);
        setLoadedTrackId(persisted.loadedTrackId);
        setLoadedTrackHash(persisted.loadedTrackHash ?? null);
        setTrackBannerDismissed(persisted.trackBannerDismissed);
      }
    } else if (employeeRole) {
      // First visit AND logged in as a JM Die employee → seed from their track
      const track = EMPLOYEE_TRACKS[employeeRole];
      const subs = tracksToSubCatIds(track.course_ids);
      setSelectedSubIds(new Set(subs));
      setLoadedTrackId(employeeRole);
      setLoadedTrackHash(currentTrackHash);
      setTrackBannerDismissed(false);
    } else {
      // Anonymous / non-employee — clean slate
      setSelectedSubIds(new Set());
      setOpenDomain(null);
      setLoadedTrackId(null);
      setLoadedTrackHash(null);
      setTrackBannerDismissed(false);
    }

    // Reviewer P1-1: rehydrate the active-path flag so "Path active" survives
    // page refresh and the result panel re-opens to show current progress.
    const path = loadActivePath(studentId);
    if (path) {
      setPathSavedAt(path.startedAt);
      setShowResult(true);
    } else {
      setPathSavedAt(null);
      setShowResult(false);
    }

    hydratedFor.current = studentId;
  }, [studentId]);

  // Autosave on selection change — gated by per-studentId sentinel (P1-2)
  useEffect(() => {
    if (hydratedFor.current !== studentId) return;
    const next: AcademyPicks = {
      selectedSubIds: Array.from(selectedSubIds),
      openDomain,
      loadedTrackId,
      loadedTrackHash,
      trackBannerDismissed,
      updatedAt: new Date().toISOString(),
    };
    const ok = savePicks(studentId, next);
    if (!ok) {
      setSaveError('Could not save your picks — storage is unavailable. Your selections will be lost on refresh.');
    } else if (saveError) {
      setSaveError(null);
    }
  }, [selectedSubIds, openDomain, loadedTrackId, loadedTrackHash, trackBannerDismissed, studentId, saveError]);

  const allCoursesById = useMemo(() => {
    const m = new Map<string, Course>();
    for (const c of ALL_COURSES) m.set(c.id, c);
    return m;
  }, []);

  const selectedCourses = useMemo(() => {
    if (selectedSubIds.size === 0) return [] as Course[];
    const set = new Set<string>();
    for (const block of DOMAIN_BLOCKS) {
      for (const sub of block.subcategories) {
        if (!selectedSubIds.has(sub.id)) continue;
        for (const c of ALL_COURSES) {
          if (sub.predicate(c)) set.add(c.id);
        }
      }
    }
    return Array.from(set).map((id) => allCoursesById.get(id)!).filter(Boolean);
  }, [selectedSubIds, allCoursesById]);

  const sortResult = useMemo(
    () => topoSortByPrereq(selectedCourses, allCoursesById),
    [selectedCourses, allCoursesById],
  );

  const totalHours = sortResult.ordered.reduce((sum, c) => sum + (c.duration_min ?? 0) / 60, 0);
  const completedInResult = sortResult.ordered.filter((c) => completedCourseIds.has(c.id)).length;
  // Reviewer P2: replace unchecked `as EmployeeRoleId` with the validating helper
  const safeLoadedRole = resolveEmployeeRole(loadedTrackId);
  const employee = safeLoadedRole ? JM_DIE_EMPLOYEES[safeLoadedRole] : null;
  const employeeTrack = safeLoadedRole ? EMPLOYEE_TRACKS[safeLoadedRole] : null;
  const trackBannerVisible = Boolean(employee) && !trackBannerDismissed;
  // Reviewer P2: surface an explicit "reload my training path" affordance when
  // the user has a real employee role but no track loaded (e.g. they cleared)
  const userIsEmployee = resolveEmployeeRole(studentId);
  const reloadTrackVisible = userIsEmployee !== null && safeLoadedRole === null;

  const selectedSubLabels = useMemo(() => {
    const labels: Array<{ id: string; label: string; domain: CourseDomain }> = [];
    for (const block of DOMAIN_BLOCKS) {
      for (const sub of block.subcategories) {
        if (selectedSubIds.has(sub.id)) {
          labels.push({ id: sub.id, label: sub.label, domain: block.domain });
        }
      }
    }
    return labels;
  }, [selectedSubIds]);

  function toggleSub(subId: string) {
    setSelectedSubIds((prev) => {
      const next = new Set(prev);
      if (next.has(subId)) next.delete(subId);
      else next.add(subId);
      return next;
    });
    setShowResult(false);
    setPathSavedAt(null);
  }

  function removeSub(subId: string) {
    setSelectedSubIds((prev) => {
      const next = new Set(prev);
      next.delete(subId);
      return next;
    });
    setShowResult(false);
    setPathSavedAt(null);
  }

  function clearAll() {
    setSelectedSubIds(new Set());
    setShowResult(false);
    setOpenDomain(null);
    setPathSavedAt(null);
    setLoadedTrackId(null);
  }

  function dismissTrackBanner() {
    setTrackBannerDismissed(true);
  }

  function skipTrack() {
    setSelectedSubIds(new Set());
    setLoadedTrackId(null);
    setTrackBannerDismissed(true);
    setOpenDomain(null);
  }

  function commitPath() {
    if (sortResult.ordered.length === 0) return;
    const courseIds = sortResult.ordered.map((c) => c.id);
    const startedAt = new Date().toISOString();
    // Reviewer P0-3: pathSavedAt was set regardless of write success → silent
    // "Path active" lie. Gate the UI flip on storage success.
    const ok = saveActivePath(studentId, { courseIds, loadedTrackId, startedAt });
    if (!ok) {
      setSaveError('Could not save your learning path — storage is unavailable. Try again or clear browser storage.');
      return;
    }
    // Reviewer P2: start the first NOT-YET-COMPLETE course so a returning
    // user sees the "next thing to do" tile, not a course they finished.
    const firstUnstarted = courseIds.find((id) => !completedCourseIds.has(id));
    if (firstUnstarted) startCourse(firstUnstarted);
    setPathSavedAt(startedAt);
    setSaveError(null);
  }

  function clearPath() {
    clearActivePath(studentId);
    setPathSavedAt(null);
  }

  function reloadEmployeeTrack() {
    const role = resolveEmployeeRole(studentId);
    if (!role) return;
    const track = EMPLOYEE_TRACKS[role];
    const subs = tracksToSubCatIds(track.course_ids);
    setSelectedSubIds(new Set(subs));
    setOpenDomain(null);
    setLoadedTrackId(role);
    setLoadedTrackHash(hashTrackCourseIds(track.course_ids));
    setTrackBannerDismissed(false);
    setShowResult(false);
    setPathSavedAt(null);
  }

  return (
    <div className="mx-auto max-w-6xl p-4 pb-32 lg:pb-8">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">PRISM Academy</h1>
        <p className="mt-1 text-sm leading-6 text-slate-600 sm:text-base">
          Pick a domain, choose what you want to learn, then tap <strong>Generate Optimized Coursework</strong>.
          {stats.coursesCompleted > 0 && (
            <span className="ml-1 text-emerald-700">
              · {stats.coursesCompleted} of {stats.coursesTotal} courses complete
            </span>
          )}
        </p>
      </header>

      {saveError && (
        <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="status">
          ⚠ {saveError}
        </div>
      )}

      {trackBannerVisible && employee && employeeTrack && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Recommended for you</span>
            <span className="text-sm font-semibold text-slate-900">
              Loaded {employee.first_name}&apos;s training path — {employeeTrack.course_ids.length} courses, ~{employeeTrack.expected_hours}h
            </span>
            <span className="text-xs leading-5 text-slate-600">{employee.role}. Adjust the picks below or accept as-is.</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={skipTrack}
              className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 active:bg-slate-50"
              style={{ minHeight: 44 }}
            >
              Start fresh
            </button>
            <button
              type="button"
              onClick={dismissTrackBanner}
              className="rounded-full bg-cyan-500 px-3 py-2 text-xs font-semibold text-white shadow-sm active:bg-cyan-600"
              style={{ minHeight: 44 }}
            >
              Looks good
            </button>
          </div>
        </div>
      )}

      {reloadTrackVisible && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <span className="text-xs leading-5 text-slate-600">
            Want your role-specific training path back? It groups the right foundations + your daily machines + supporting skills.
          </span>
          <button
            type="button"
            onClick={reloadEmployeeTrack}
            className="rounded-full border border-cyan-300 bg-white px-3 py-2 text-xs font-semibold text-cyan-700 active:bg-cyan-50"
            style={{ minHeight: 44 }}
          >
            Reload my path
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Left column: domain cards */}
        <ol className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:grid-flow-dense">
          {DOMAIN_BLOCKS.map((block) => {
            const isOpen = openDomain === block.domain;
            const selectedInBlock = block.subcategories.filter((s) => selectedSubIds.has(s.id)).length;
            return (
              <li
                key={block.domain}
                className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${
                  isOpen ? 'lg:col-span-2 lg:order-2 lg:row-start-1' : 'lg:order-1'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenDomain(isOpen ? null : block.domain)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-left active:bg-slate-50 hover:bg-slate-50"
                  style={{ minHeight: 64 }}
                  aria-expanded={isOpen}
                >
                  <div className="flex flex-col">
                    <span className="text-lg font-semibold text-slate-900">
                      <span className="mr-2">{block.icon}</span>
                      {block.domain}
                    </span>
                    <span className="text-xs text-slate-500">{block.blurb}</span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                    {selectedInBlock > 0 && (
                      <span className="rounded-full bg-cyan-500 px-2 py-1 font-medium text-white">{selectedInBlock} picked</span>
                    )}
                    <span className="text-slate-400">{isOpen ? '▾' : '▸'}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 p-3">
                    <div className="flex flex-wrap gap-2">
                      {block.subcategories.map((sub) => {
                        const picked = selectedSubIds.has(sub.id);
                        const courseCount = ALL_COURSES.filter(sub.predicate).length;
                        const isEmpty = courseCount === 0;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => !isEmpty && toggleSub(sub.id)}
                            disabled={isEmpty}
                            className={[
                              'rounded-full border px-3 py-2 text-sm transition',
                              isEmpty
                                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                                : picked
                                ? 'border-cyan-500 bg-cyan-500 text-white shadow-sm'
                                : 'border-slate-300 bg-white text-slate-700 hover:border-cyan-400 active:bg-slate-50',
                            ].join(' ')}
                            style={{ minHeight: 44 }}
                            aria-pressed={picked}
                            title={sub.description}
                          >
                            <span className="font-medium">{sub.label}</span>
                            <span className={picked ? 'ml-1 text-white/80' : 'ml-1 text-slate-400'}>({courseCount})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {/* Right column on desktop: live picks preview */}
        <aside className="hidden lg:block">
          <div className="sticky top-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Your picks</div>
            {selectedSubLabels.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Tap a domain card on the left, then choose what you want to learn. Your picks show up here.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {selectedSubLabels.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500">{s.domain}</span>
                      <span className="text-sm font-medium text-slate-900">{s.label}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSub(s.id)}
                      aria-label={`Remove ${s.label}`}
                      className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selectedCourses.length > 0 && (
              <div className="mt-4 rounded-xl bg-cyan-50 p-3 text-center text-xs text-cyan-700">
                <div className="text-2xl font-bold text-cyan-700">{selectedCourses.length}</div>
                courses queued
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Result panel */}
      {showResult && sortResult.ordered.length > 0 && (
        <section className="mt-6 rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Your Optimized Coursework</h2>
              <p className="mt-1 text-xs text-slate-600">
                {sortResult.ordered.length} courses · ~{totalHours.toFixed(0)} hours · ordered by prerequisite chain
                {completedInResult > 0 && (
                  <span className="ml-1 text-emerald-700">· {completedInResult} already complete</span>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {pathSavedAt ? (
                <button
                  type="button"
                  onClick={clearPath}
                  className="rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 active:bg-amber-100"
                  style={{ minHeight: 44 }}
                >
                  Path active · Remove
                </button>
              ) : (
                <button
                  type="button"
                  onClick={commitPath}
                  className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm active:bg-emerald-700"
                  style={{ minHeight: 44 }}
                >
                  Start this path
                </button>
              )}
            </div>
          </div>
          {sortResult.hadCycle && (
            <p className="mt-3 rounded-md bg-amber-100 p-2 text-xs text-amber-900">
              ⚠ Prerequisite cycle detected in the selected courses. Cycle members listed in original order at the end.
            </p>
          )}
          {sortResult.missingPrereqs.length > 0 && (
            <p className="mt-3 rounded-md bg-amber-100 p-2 text-xs text-amber-900">
              ⚠ {sortResult.missingPrereqs.length} prerequisite course(s) reference courses you did NOT pick. They&apos;ll be skipped — consider adding them.
            </p>
          )}
          <ol className="mt-3 flex flex-col gap-2 sm:grid sm:grid-cols-2 sm:gap-3">
            {sortResult.ordered.map((course, idx) => {
              const done = isCourseComplete(course.id);
              return (
                <li key={course.id}>
                  <Link
                    to={`/learning/academy/${course.id}`}
                    className={`flex items-center gap-3 rounded-xl p-3 shadow-sm transition active:bg-slate-50 ${
                      done ? 'bg-emerald-50' : 'bg-white'
                    }`}
                    style={{ minHeight: 56 }}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                      done ? 'bg-emerald-500' : 'bg-cyan-500'
                    }`}>
                      {done ? '✓' : idx + 1}
                    </div>
                    <div className="flex flex-1 flex-col">
                      <span className={`text-sm font-semibold ${done ? 'text-emerald-900' : 'text-slate-900'}`}>
                        {course.title}
                      </span>
                      <span className="text-xs text-slate-500">
                        {course.level} · {course.domain} · {Math.round((course.duration_min ?? 0) / 60)}h
                        {done && <span className="ml-1 font-medium text-emerald-700">· complete</span>}
                      </span>
                    </div>
                    <span className={done ? 'text-emerald-700' : 'text-cyan-700'}>→</span>
                  </Link>
                </li>
              );
            })}
          </ol>
          {pathSavedAt && (
            <p className="mt-3 rounded-md bg-emerald-100 p-2 text-xs text-emerald-900">
              ✓ Saved as your active learning path. Open any course to keep going — your dashboard will track your progress.
            </p>
          )}
        </section>
      )}

      {/* Sticky action bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] lg:static lg:mt-6 lg:rounded-2xl lg:border lg:shadow-sm"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-2">
          <button
            type="button"
            onClick={clearAll}
            disabled={selectedSubIds.size === 0}
            className="rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 disabled:opacity-40"
            style={{ minHeight: 48 }}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setShowResult(true)}
            disabled={selectedSubIds.size === 0}
            className="flex-1 rounded-full bg-cyan-500 px-4 py-3 text-base font-bold text-white shadow-md transition active:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ minHeight: 48 }}
          >
            {selectedSubIds.size === 0
              ? 'Pick a sub-category to start'
              : `Generate Optimized Coursework (${selectedCourses.length} unique courses)`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AcademyHub;
