import { getAuthHeaders } from './authToken';
/**
 * cadAIStateMachine.ts — thin API client for U-CADC-AI04
 *
 * Mirrors the CADAIStateMachineEngine snapshot/log shapes. Talks to
 * `prism_cad_automation` via the generic dispatcher tool endpoint so
 * no bespoke route is needed for a read-only inspector.
 */

const API_BASE = '/api/v1';

export type CADAIState =
  | 'IDLE'
  | 'DECOMPOSING'
  | 'PLANNING'
  | 'EXECUTING'
  | 'VALIDATING'
  | 'LEARNING'
  | 'FAILED'
  | 'COMPLETE';

export type CADAIEvent =
  | 'start'
  | 'decomposed'
  | 'planned'
  | 'executed'
  | 'validated'
  | 'learned'
  | 'fail'
  | 'reset'
  | 'pause'
  | 'resume';

export interface FSMSnapshot {
  sessionId: string;
  state: CADAIState;
  paused: boolean;
  lastEvent: CADAIEvent | null;
  transitionCount: number;
  startedAt: number | null;
  lastTransitionAt: number | null;
  failedReason?: string;
  terminal: boolean;
}

export interface TransitionEvent {
  id: number;
  sessionId: string;
  from: CADAIState;
  to: CADAIState;
  event: CADAIEvent;
  at: number;
  payload?: unknown;
  refusedDueToPause?: boolean;
}

async function call<T>(action: string, params: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}/dispatch/prism_cad_automation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ action, params }),
  });
  if (!res.ok) throw new Error(`[${action}] ${res.status}`);
  return (await res.json()) as T;
}

export function fsmList(): Promise<{ sessions: string[] }> {
  return call('fsm_list', {});
}

export function fsmOpen(sessionId: string): Promise<FSMSnapshot> {
  return call('fsm_open', { sessionId });
}

export function fsmSnapshot(sessionId: string): Promise<FSMSnapshot> {
  return call('fsm_snapshot', { sessionId });
}

export function fsmLog(
  sessionId: string,
  tail = 100,
): Promise<{ sessionId: string; log: TransitionEvent[] }> {
  return call('fsm_log', { sessionId, tail });
}

export function fsmAllowedEvents(
  sessionId: string,
): Promise<{ sessionId: string; events: CADAIEvent[] }> {
  return call('fsm_allowed_events', { sessionId });
}

export function fsmDispatch(
  sessionId: string,
  event: CADAIEvent,
  payload?: unknown,
): Promise<FSMSnapshot> {
  return call('fsm_dispatch', { sessionId, event, payload });
}
