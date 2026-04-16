import type { EmailLoginOption } from './contracts';
import { getEmployeeShellHomePath } from './employeeShellRoutes';

type ShellSessionIdentity = {
  identityId?: string;
  identityLabel?: string;
  email?: string;
};

export type ShellSession =
  | ({
      kind: 'employee';
      profileId: string;
      updatedAt: string;
    } & ShellSessionIdentity)
  | ({
      kind: 'admin';
      updatedAt: string;
    } & ShellSessionIdentity);

const SHELL_SESSION_KEY = 'prism_shell_session_v1';

function timestamp() {
  return new Date().toISOString();
}

function parseIdentity(parsed: Partial<ShellSession> | null): ShellSessionIdentity {
  return {
    identityId: typeof parsed?.identityId === 'string' ? parsed.identityId : undefined,
    identityLabel: typeof parsed?.identityLabel === 'string' ? parsed.identityLabel : undefined,
    email: typeof parsed?.email === 'string' ? parsed.email : undefined,
  };
}

export function loadShellSession(): ShellSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SHELL_SESSION_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<ShellSession> | null;
    if (!parsed || (parsed.kind !== 'employee' && parsed.kind !== 'admin')) {
      return null;
    }

    const identity = parseIdentity(parsed);

    if (parsed.kind === 'employee' && typeof parsed.profileId === 'string' && parsed.profileId.length > 0) {
      return {
        kind: 'employee',
        profileId: parsed.profileId,
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : timestamp(),
        ...identity,
      };
    }

    if (parsed.kind === 'admin') {
      return {
        kind: 'admin',
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : timestamp(),
        ...identity,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function persistShellSession(session: ShellSession) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SHELL_SESSION_KEY, JSON.stringify(session));
  }
}

function toSessionIdentity(identity?: Pick<EmailLoginOption, 'id' | 'displayName' | 'email'>): ShellSessionIdentity {
  if (!identity) {
    return {};
  }

  return {
    identityId: identity.id,
    identityLabel: identity.displayName,
    email: identity.email,
  };
}

function getExistingIdentity(kind: ShellSession['kind']) {
  const existing = loadShellSession();
  if (!existing || existing.kind !== kind) {
    return {};
  }

  return parseIdentity(existing);
}

export function persistEmployeeShellSession(profileId: string, identity?: Pick<EmailLoginOption, 'id' | 'displayName' | 'email'>) {
  persistShellSession({
    kind: 'employee',
    profileId,
    ...getExistingIdentity('employee'),
    ...toSessionIdentity(identity),
    updatedAt: timestamp(),
  });
}

export function persistAdminShellSession(identity?: Pick<EmailLoginOption, 'id' | 'displayName' | 'email'>) {
  persistShellSession({
    kind: 'admin',
    ...getExistingIdentity('admin'),
    ...toSessionIdentity(identity),
    updatedAt: timestamp(),
  });
}

export function persistEmailShellSession(identity: EmailLoginOption) {
  if (identity.shellKind === 'employee' && identity.profileId) {
    persistEmployeeShellSession(identity.profileId, identity);
    return;
  }

  persistAdminShellSession(identity);
}

export function clearShellSession() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(SHELL_SESSION_KEY);
  }
}

export function getShellSessionDestination(session: ShellSession) {
  if (session.kind === 'employee') {
    return getEmployeeShellHomePath(session.profileId);
  }

  return '/dashboard';
}
