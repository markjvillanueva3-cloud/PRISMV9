import { expect, type Locator, type Page } from '@playwright/test';
import type { AuthEmployee, ClearanceLevel } from '../../../src/contexts/AuthContext';
import type { PageSweepSignal } from '../../../src/testing/pageSurfaceManifest';

const AUTH_KEY = 'prism-auth-token';
const SHELL_SESSION_KEY = 'prism_shell_session_v1';

const ROLE_EMPLOYEES: Record<ClearanceLevel, AuthEmployee> = {
  shop_floor: {
    id: 'EMP-SHOP-01',
    first_name: 'Avery',
    last_name: 'Stone',
    department: 'Machining',
    role: 'Machinist',
    clearance_level: 'shop_floor',
  },
  lead: {
    id: 'EMP-LEAD-01',
    first_name: 'Jordan',
    last_name: 'Vale',
    department: 'Production',
    role: 'Lead',
    clearance_level: 'lead',
  },
  hr_manager: {
    id: 'EMP-HR-01',
    first_name: 'Morgan',
    last_name: 'Lee',
    department: 'People Ops',
    role: 'HR Manager',
    clearance_level: 'hr_manager',
  },
  admin: {
    id: 'EMP-ADMIN-01',
    first_name: 'Riley',
    last_name: 'Quinn',
    department: 'Operations',
    role: 'Administrator',
    clearance_level: 'admin',
  },
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildPathPattern(path: string) {
  return new RegExp(escapeRegex(path.split('?')[0]));
}

export async function seedAuthenticatedRole(page: Page, clearance: ClearanceLevel) {
  const employee = ROLE_EMPLOYEES[clearance];
  const session = {
    token: `e2e-${clearance}-token`,
    userId: `${employee.id}-user`,
    employee,
  };

  await page.addInitScript(
    ([authKey, shellKey, value]) => {
      window.localStorage.removeItem(shellKey);
      window.localStorage.setItem(authKey, JSON.stringify(value));
    },
    [AUTH_KEY, SHELL_SESSION_KEY, session],
  );
}

export async function clearAuth(page: Page) {
  await page.addInitScript(([authKey, shellKey]) => {
    window.localStorage.removeItem(authKey);
    window.localStorage.removeItem(shellKey);
  }, [AUTH_KEY, SHELL_SESSION_KEY]);
}

export async function openSurface(page: Page, path: string, clearance?: ClearanceLevel) {
  if (clearance) {
    await seedAuthenticatedRole(page, clearance);
  } else {
    await clearAuth(page);
  }

  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
}

export async function openSeededSurface<State>(
  page: Page,
  path: string,
  state: State,
  clearance?: ClearanceLevel,
) {
  await openSurface(page, path, clearance);
  await page.evaluate(
    ([nextPath, nextState]) => {
      const currentState = window.history.state ?? {};
      window.history.replaceState(
        { ...currentState, usr: nextState },
        document.title,
        nextPath,
      );
    },
    [path, state] as const,
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
}

export function getSignalLocator(page: Page, signal: PageSweepSignal): Locator {
  const exact = signal.exact ?? true;
  const name = exact ? signal.value : new RegExp(escapeRegex(signal.value), 'i');

  switch (signal.kind) {
    case 'heading':
      return page.getByRole('heading', { name });
    case 'link':
      return page.getByRole('link', { name });
    case 'button':
      return page.getByRole('button', { name });
    case 'text':
    default:
      return exact ? page.getByText(signal.value, { exact: true }) : page.getByText(name);
  }
}

export async function expectSignalVisible(page: Page, signal: PageSweepSignal) {
  await expect(getSignalLocator(page, signal).first()).toBeVisible({ timeout: 20000 });
}
