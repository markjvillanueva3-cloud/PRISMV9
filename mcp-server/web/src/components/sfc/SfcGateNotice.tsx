/**
 * SfcGateNotice -- shown when the speed_feed tier-gate returns 403. The gate
 * returns 403 for distinct reasons (backend `error.code`); this renders the
 * RIGHT prompt for each instead of one blanket "daily limit" message:
 *   - ENTITLEMENT_REVOKED: an admin disabled the feature -> contact-admin (NO
 *     upgrade CTA -- paying more does not restore an admin revoke).
 *   - TIER_LIMIT / other 403: over the free daily cap -> upgrade CTA.
 * Renders the backend's human message as the body when present.
 */
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui';

export interface SfcGateNoticeProps {
  /** Backend error code: TIER_LIMIT (cap) | ENTITLEMENT_REVOKED (admin) | null. */
  code: string | null;
  /** Backend human message (rendered as the body when present). */
  message?: string | null;
}

export default function SfcGateNotice({ code, message }: SfcGateNoticeProps) {
  const navigate = useNavigate();

  if (code === 'ENTITLEMENT_REVOKED') {
    return (
      <div
        role="status"
        className="rounded-xl border border-rose-300 bg-rose-50 px-5 py-4 dark:border-rose-700 dark:bg-rose-950/40"
      >
        <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">
          Access disabled by your administrator
        </p>
        <p className="mt-1 text-sm text-rose-800 dark:text-rose-300">
          {message ||
            'Speed & feed access has been turned off for your account. Contact your shop administrator to restore it.'}
        </p>
      </div>
    );
  }

  // TIER_LIMIT / unknown 403 -> over the free daily cap -> upgrade path.
  return (
    <div
      role="status"
      className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 dark:border-amber-700 dark:bg-amber-950/40"
    >
      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
        Daily free limit reached
      </p>
      <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
        {message ||
          'You have used your free speed & feed calculations for today. Upgrade to Starter for unlimited calculations, the 9-axis orchestrator, SLD/chatter and vendor compare.'}
      </p>
      <div className="mt-3">
        <Button variant="primary" onClick={() => navigate('/pricing')} className="h-11 md:h-auto">
          View Plans
        </Button>
      </div>
    </div>
  );
}
