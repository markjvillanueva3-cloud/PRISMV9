import type {
  CreateShellSavedViewInput,
  ShellSavedView,
  UpdateShellSavedViewInput,
} from './contracts';

const SHELL_SAVED_VIEWS_KEY = 'prism_shell_saved_views_v1';
const SHELL_SAVED_VIEWS_EVENT = 'prism-shell-saved-views-change';
const SHELL_DEFAULT_USER_ID = 'shell-default';
const MAX_SAVED_VIEWS_PER_USER = 50;

function normalizeWorkspaceTarget(to: string) {
  try {
    const url = new URL(to, 'http://prism.local');
    url.pathname = url.pathname === '/' ? '/dashboard' : url.pathname;
    return `${url.pathname}${url.search}`;
  } catch {
    return '/dashboard';
  }
}

function sortSavedViews(views: ShellSavedView[]) {
  return [...views].sort((left, right) => {
    if (left.isDefault !== right.isDefault) {
      return left.isDefault ? -1 : 1;
    }

    return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
  });
}

function normalizeSavedView(raw: Partial<ShellSavedView>): ShellSavedView | null {
  if (!raw.id || !raw.userId || !raw.name || !raw.entityType || !raw.to || !raw.updatedAt) {
    return null;
  }

  return {
    id: raw.id,
    userId: raw.userId,
    name: raw.name,
    entityType: raw.entityType,
    to: normalizeWorkspaceTarget(raw.to),
    isDefault: raw.isDefault === true,
    updatedAt: raw.updatedAt,
  };
}

function readAllSavedViews() {
  if (typeof window === 'undefined') {
    return [] as ShellSavedView[];
  }

  try {
    const raw = window.localStorage.getItem(SHELL_SAVED_VIEWS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Partial<ShellSavedView>[];
    return sortSavedViews(parsed.flatMap((entry) => {
      const view = normalizeSavedView(entry);
      return view ? [view] : [];
    }));
  } catch {
    return [];
  }
}

function writeAllSavedViews(views: ShellSavedView[]) {
  if (typeof window === 'undefined') {
    return;
  }

  const next = sortSavedViews(views);
  window.localStorage.setItem(SHELL_SAVED_VIEWS_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(SHELL_SAVED_VIEWS_EVENT, { detail: next }));
}

function filterSavedViewsByEntityType(views: ShellSavedView[], entityType?: string) {
  if (!entityType) {
    return sortSavedViews(views);
  }

  return sortSavedViews(
    views.filter((view) => view.entityType.toLowerCase() === entityType.toLowerCase()),
  );
}

function enforceDefaultUniqueness(
  views: ShellSavedView[],
  userId: string,
  entityType: string,
  selectedViewId: string,
  isDefault: boolean,
  updatedAt: string,
) {
  if (!isDefault) {
    return views;
  }

  return views.map((view) =>
    view.userId === userId
    && view.entityType.toLowerCase() === entityType.toLowerCase()
    && view.id !== selectedViewId
      ? { ...view, isDefault: false, updatedAt }
      : view,
  );
}

export function readShellSavedViews(entityType?: string) {
  return filterSavedViewsByEntityType(readAllSavedViews(), entityType);
}

export function createShellSavedView(
  input: CreateShellSavedViewInput,
  userId = SHELL_DEFAULT_USER_ID,
) {
  const current = readAllSavedViews();
  const userViews = current.filter((view) => view.userId === userId);
  if (userViews.length >= MAX_SAVED_VIEWS_PER_USER) {
    throw new Error(`Maximum ${MAX_SAVED_VIEWS_PER_USER} saved views per user`);
  }

  const timestamp = new Date().toISOString();
  const nextView: ShellSavedView = {
    id: `saved-view-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    name: input.name.trim() || 'Saved view',
    entityType: input.entityType,
    to: normalizeWorkspaceTarget(input.to),
    isDefault: input.isDefault === true,
    updatedAt: timestamp,
  };

  const next = enforceDefaultUniqueness(
    [...current, nextView],
    userId,
    nextView.entityType,
    nextView.id,
    nextView.isDefault,
    timestamp,
  );

  writeAllSavedViews(next);
  return filterSavedViewsByEntityType(next, input.entityType);
}

export function updateShellSavedView(
  input: UpdateShellSavedViewInput,
  userId = SHELL_DEFAULT_USER_ID,
) {
  const current = readAllSavedViews();
  const existing = current.find((view) => view.id === input.viewId && view.userId === userId);
  if (!existing) {
    throw new Error(`Saved view ${input.viewId} not found`);
  }

  const timestamp = new Date().toISOString();
  const updatedView: ShellSavedView = {
    ...existing,
    name: input.name?.trim() || existing.name,
    to: input.to ? normalizeWorkspaceTarget(input.to) : existing.to,
    isDefault: input.isDefault ?? existing.isDefault,
    updatedAt: timestamp,
  };

  const next = enforceDefaultUniqueness(
    current.map((view) => (view.id === updatedView.id ? updatedView : view)),
    userId,
    existing.entityType,
    updatedView.id,
    updatedView.isDefault,
    timestamp,
  );

  writeAllSavedViews(next);
  return filterSavedViewsByEntityType(next, existing.entityType);
}

export function deleteShellSavedView(viewId: string, entityType?: string, userId = SHELL_DEFAULT_USER_ID) {
  const current = readAllSavedViews();
  const existing = current.find((view) => view.id === viewId && view.userId === userId);
  if (!existing) {
    throw new Error(`Saved view ${viewId} not found`);
  }

  if (entityType && existing.entityType.toLowerCase() !== entityType.toLowerCase()) {
    throw new Error(`Saved view ${viewId} not found for entity type ${entityType}`);
  }

  const next = current.filter((view) => !(view.id === viewId && view.userId === userId));
  writeAllSavedViews(next);
  return filterSavedViewsByEntityType(next, existing.entityType);
}

export {
  SHELL_DEFAULT_USER_ID,
  SHELL_SAVED_VIEWS_EVENT,
  SHELL_SAVED_VIEWS_KEY,
};
