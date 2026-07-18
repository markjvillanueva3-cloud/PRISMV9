import type {
  LearningCourseEnrollment,
  LearningCourseEnrollmentSummary,
  LearningCourseMedia,
  LearningCourseSearchResult,
  LearningProgressionCourse,
} from '../types/learning';
import { fetchJson } from './requestCore';

const API_BASE = '/api/v1/learning';

function buildQuery(params: Record<string, unknown>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          search.append(key, String(item));
        }
      });
      return;
    }

    search.set(key, String(value));
  });

  const query = search.toString();
  return query ? `?${query}` : '';
}

async function get<T>(path: string, params: Record<string, unknown> = {}): Promise<T> {
  const json = await fetchJson<T | { data?: T }>(`${API_BASE}${path}${buildQuery(params)}`, {
    fallbackMessage: 'Learning progression request failed',
  });
  return (typeof json === 'object' && json !== null && 'data' in json ? json.data : json) as T;
}

async function post<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const json = await fetchJson<T | { data?: T }>(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    fallbackMessage: 'Learning progression request failed',
  });
  return (typeof json === 'object' && json !== null && 'data' in json ? json.data : json) as T;
}

export async function listLearningCourses(params: {
  query?: string;
  domain?: string;
  difficulty?: string;
  machine_type?: string;
  material_focus?: string;
  cam_system?: string;
  process_type?: string;
  tags?: string[];
  limit?: number;
} = {}): Promise<LearningCourseSearchResult> {
  return get<LearningCourseSearchResult>('/courses', params);
}

export async function getLearningCourse(courseId: string): Promise<LearningProgressionCourse> {
  return get<LearningProgressionCourse>(`/courses/${encodeURIComponent(courseId)}`);
}

export async function createLearningCourse(params: {
  title: string;
  description?: string;
  domain: string;
  difficulty?: string;
  modules: Array<{
    title: string;
    description?: string;
    estimated_minutes?: number;
    has_checkpoint?: boolean;
    checkpoint_type?: 'quiz' | 'exam' | 'practical';
    pass_threshold?: number;
  }>;
  prerequisites?: string[];
  tags?: string[];
  machine_type?: string;
  material_focus?: string;
  cam_system?: string;
  process_type?: string;
  is_published?: boolean;
  created_by?: string;
}) {
  return post<LearningProgressionCourse>('/courses', params);
}

export async function enrollLearningCourse(params: {
  user_id: string;
  course_id: string;
}) {
  return post<LearningCourseEnrollment>('/enroll', params);
}

export async function getLearningEnrollmentSummary(userId: string) {
  return get<LearningCourseEnrollmentSummary>('/my-progress', { user_id: userId });
}

export async function getLearningCourseProgress(userId: string, courseId: string) {
  return get<LearningCourseEnrollment>('/my-progress', { user_id: userId, course_id: courseId });
}

export async function submitLearningCheckpoint(params: {
  enrollment_id: string;
  module_idx: number;
  answers: Array<{ answer: string }>;
  duration_sec?: number;
}) {
  return post<LearningCourseEnrollment['checkpoints'][number]>('/checkpoint', params);
}

export async function addLearningMedia(params: {
  course_id: string;
  module_idx?: number;
  media_type: 'video' | 'pdf' | 'image' | 'interactive' | 'reference';
  title: string;
  url?: string;
  file_id?: string;
  duration_sec?: number;
}) {
  return post<LearningCourseMedia>('/media', params);
}

export async function listLearningMedia(courseId: string, moduleIdx?: number) {
  return get<LearningCourseMedia[]>(`/media/${encodeURIComponent(courseId)}`, {
    module_idx: moduleIdx,
  });
}

export async function getLearningFacets(params: {
  query?: string;
  domain?: string;
  difficulty?: string;
  machine_type?: string;
  material_focus?: string;
  cam_system?: string;
  process_type?: string;
  tags?: string[];
  limit?: number;
} = {}) {
  return get<LearningCourseSearchResult>('/facets', params);
}
