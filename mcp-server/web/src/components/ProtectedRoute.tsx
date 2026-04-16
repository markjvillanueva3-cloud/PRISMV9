/**
 * EMP-MS0 U-AUTH3: Protected Route Wrapper
 * Checks authentication and clearance level before rendering children.
 * Redirects to /login if not authenticated, shows 403 if insufficient clearance.
 */
import { Navigate } from 'react-router-dom';
import { useAuth, meetsMinClearance, type ClearanceLevel } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  minClearance?: ClearanceLevel;
}

/** Route access map — which clearance sees which route prefixes */
const ROUTE_CLEARANCE_MAP: Record<string, ClearanceLevel> = {
  // shop_floor (default): machining tools, shop clock, jobs, viewer, troubleshoot
  '/calculator': 'shop_floor',
  '/toolpath': 'shop_floor',
  '/thread-calculator': 'shop_floor',
  '/ppg': 'shop_floor',
  '/post-processor': 'shop_floor',
  '/print-to-cnc': 'shop_floor',
  '/pipeline': 'shop_floor',
  '/safety': 'shop_floor',
  '/alarms': 'shop_floor',
  '/viewer': 'shop_floor',
  '/shop-clock': 'shop_floor',
  '/jobs': 'shop_floor',
  '/troubleshoot': 'shop_floor',
  '/learning': 'shop_floor',
  '/dashboard': 'shop_floor',

  // lead: + reports, scheduling, capacity, orders
  '/reports': 'lead',
  '/scheduling': 'lead',
  '/capacity': 'lead',
  '/orders': 'lead',
  '/job-planner': 'lead',
  '/batch-planning': 'lead',
  '/purchasing': 'lead',
  '/purchase-orders': 'lead',
  '/invoices': 'lead',
  '/profitability': 'lead',
  '/tooling-cost': 'lead',
  '/machine-rates': 'lead',
  '/department': 'lead',
  '/rfq-inbox': 'lead',
  '/sales-pipeline': 'lead',
  '/vendor-scorecard': 'lead',
  '/receiving': 'lead',
  '/shipping': 'lead',
  '/maintenance': 'lead',
  '/assets': 'lead',
  '/work-orders': 'lead',
  '/calibration': 'lead',

  // hr_manager: + employees, payroll, timecards, HR compliance
  '/employees': 'hr_manager',
  '/payroll': 'hr_manager',
  '/timecards': 'hr_manager',
  '/hr': 'hr_manager',
  '/commissions': 'hr_manager',
  '/credit-management': 'hr_manager',
  '/osha': 'hr_manager',
  '/audit-manager': 'hr_manager',

  // admin: everything (no explicit entries needed — admin bypasses all checks)
  '/general-ledger': 'admin',
  '/financial-analysis': 'admin',
  '/executive-dashboard': 'admin',
  '/daily-flash': 'admin',
};

/** Get the minimum clearance required for a path. */
export function getRouteMinClearance(path: string): ClearanceLevel {
  // Exact match first
  if (ROUTE_CLEARANCE_MAP[path]) return ROUTE_CLEARANCE_MAP[path];
  // Prefix match
  for (const [prefix, level] of Object.entries(ROUTE_CLEARANCE_MAP)) {
    if (path.startsWith(prefix)) return level;
  }
  // Default: any authenticated user
  return 'shop_floor';
}

export default function ProtectedRoute({ children, minClearance }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, clearance_level } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: 'var(--text-secondary, #94a3b8)',
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (minClearance && !meetsMinClearance(clearance_level, minClearance)) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        color: 'var(--text-secondary, #94a3b8)',
        textAlign: 'center',
        padding: 32,
      }}>
        <h2 style={{ fontSize: 24, marginBottom: 12 }}>Access Restricted</h2>
        <p>Your clearance level ({clearance_level}) does not have access to this page.</p>
        <p style={{ marginTop: 8 }}>Required: {minClearance} or higher</p>
      </div>
    );
  }

  return <>{children}</>;
}
