/**
 * JMDieFleetScanStatusPanel — STUB (2026-05-27, slot golf, GOAL-TSC-FIX iter16)
 * ====================================================================
 * The companion test file (JMDieFleetScanStatusPanel.test.tsx) imports from
 * './JMDieFleetScanStatusPanel.js' but the panel was never extracted from
 * the inline page logic. R12 fail-loud: tests can compile + the test's mock
 * substitution works, but the rendered component throws NOT_IMPLEMENTED at
 * runtime — surfacing the architectural debt for a future
 * U-WEB-JMDIE-FLEET-SCAN-PANEL milestone instead of silently passing.
 */
import type { JSX } from 'react';

export interface FleetScanLedgerStats {
  ok: boolean;
  total_rows: number;
  unique_paths: number;
  by_source: Record<string, number>;
  by_kind: Record<string, number>;
  parse_errors: number;
  ledger_path: string;
  [key: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const __testHooks: { fetchLedgerStats: (..._args: any[]) => Promise<FleetScanLedgerStats> } = {
  fetchLedgerStats: () => {
    throw new Error(
      'NOT IMPLEMENTED: JMDieFleetScanStatusPanel.__testHooks.fetchLedgerStats — ' +
      'panel was never extracted. See U-WEB-JMDIE-FLEET-SCAN-PANEL.'
    );
  },
};

export function JMDieFleetScanStatusPanel(): JSX.Element {
  throw new Error(
    'NOT IMPLEMENTED: JMDieFleetScanStatusPanel component was never extracted. ' +
    'See src/__tests__/JMDieFleetScanStatusPanel.test.tsx for the intended API.'
  );
}
