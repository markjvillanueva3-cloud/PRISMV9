import { ApiError, getRequestHeaders } from './client';
import type { PrismResponse } from './types';

const BILLING_BASE = '/api/v1/billing';

export interface BillingStatusResult {
  userId: string;
  plan: string;
  role: string;
  prices: Record<string, { monthly_cents: number; annual_cents: number; label: string }>;
  timestamp: string;
}

async function billingRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>,
): Promise<PrismResponse<T>> {
  const res = await fetch(`${BILLING_BASE}${path}`, {
    method,
    headers: getRequestHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, error.error || 'Billing request failed');
  }

  return res.json();
}

export async function getBillingStatus(): Promise<PrismResponse<BillingStatusResult>> {
  return billingRequest('GET', '/status');
}

export async function purchasePost(
  controllerId: string,
  licenseType: 'permanent' | 'subscription',
): Promise<{ url: string }> {
  const res = await billingRequest<{ url: string }>('POST', '/purchase', {
    controller_id: controllerId,
    license_type: licenseType,
  });
  return res.result;
}

export const billingApi = {
  getBillingStatus,
  purchasePost,
};
