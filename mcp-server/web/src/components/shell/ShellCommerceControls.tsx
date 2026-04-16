import { useEffect, useMemo, useState } from 'react';
import { useOperatingSystem } from '../../features/operating-system/OperatingSystemProvider';
import type { ShellCommerceCatalog, ShellCommerceTier } from '../../features/operating-system/contracts';
import { useShellCommerceSelection } from '../../features/operating-system/shellCommerceState';
import { StatusPill } from '../workspace/WorkspacePrimitives';

function toneClasses(tone: ShellCommerceTier['tone']) {
  switch (tone) {
    case 'emerald':
      return 'border-emerald-300/32 bg-[#11221a] text-emerald-50';
    case 'amber':
      return 'border-amber-300/32 bg-[#231a10] text-amber-50';
    case 'violet':
      return 'border-violet-300/32 bg-[#191524] text-violet-50';
    case 'rose':
      return 'border-rose-300/32 bg-[#241418] text-rose-50';
    case 'slate':
      return 'border-white/14 bg-[#141b22] text-slate-50';
    default:
      return 'border-cyan-300/32 bg-[#102028] text-cyan-50';
  }
}

type CommerceModal = 'tiers' | 'addons' | null;

export function ShellCommerceControls({
  compact = false,
}: {
  compact?: boolean;
}) {
  const operatingSystem = useOperatingSystem();
  const { selection, setUnitSystem, setTierId, toggleAddOn, setRegionId } = useShellCommerceSelection();
  const [catalog, setCatalog] = useState<ShellCommerceCatalog | null>(null);
  const [openModal, setOpenModal] = useState<CommerceModal>(null);

  useEffect(() => {
    let active = true;
    operatingSystem
      .getShellCommerceCatalog()
      .then((nextCatalog) => {
        if (active) {
          setCatalog(nextCatalog);
        }
      })
      .catch(() => {
        if (active) {
          setCatalog(null);
        }
      });

    return () => {
      active = false;
    };
  }, [operatingSystem]);

  const activeTier = useMemo(
    () => catalog?.tiers.find((tier) => tier.id === selection.tierId) ?? catalog?.tiers[0] ?? null,
    [catalog, selection.tierId],
  );
  const activeRegion = useMemo(
    () => catalog?.regions.find((region) => region.id === selection.regionId) ?? catalog?.regions[0] ?? null,
    [catalog, selection.regionId],
  );
  const enabledAddOns = useMemo(
    () => catalog?.addOns.filter((entry) => selection.addOnIds.includes(entry.id)) ?? [],
    [catalog, selection.addOnIds],
  );
  const billingPosture = catalog?.billingPosture ?? null;
  const billingPillLabel = billingPosture?.source === 'live' ? 'Live billing ready' : 'Staged billing posture';
  const billingSummary =
    billingPosture?.source === 'live'
      ? `${billingPosture.currentPlanLabel}${billingPosture.mappedTierLabel && billingPosture.mappedTierLabel !== billingPosture.currentPlanLabel ? ` · maps to ${billingPosture.mappedTierLabel}` : ''}`
      : 'Catalog-backed pricing posture';

  if (!catalog || !activeTier || !activeRegion) {
    return null;
  }

  return (
    <>
      <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'justify-end'}`} data-testid="shell-commerce-controls">
        <div className="inline-flex rounded-full border border-white/10 bg-black/20 p-1">
          {(['inch', 'metric'] as const).map((unit) => {
            const active = selection.unitSystem === unit;
            return (
              <button
                key={unit}
                type="button"
                aria-label={`Unit system ${unit}`}
                aria-pressed={active}
                onClick={() => setUnitSystem(unit)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                  active
                    ? 'bg-cyan-300 text-slate-950'
                    : 'text-slate-300 hover:bg-white/[0.06] hover:text-slate-100'
                }`}
              >
                {unit}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          aria-label="Tier features"
          onClick={() => setOpenModal('tiers')}
          className={`rounded-[20px] border px-4 py-3 text-left transition ${toneClasses(activeTier.tone)} ${compact ? 'min-w-[180px]' : ''}`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-75">Tier features</div>
          <div className="mt-1 text-sm font-semibold">{activeTier.label}</div>
          <div className="mt-1 text-xs opacity-80">{activeTier.priceLabel}</div>
          <div className="mt-1 text-[11px] opacity-75">{billingPillLabel}</div>
        </button>

        <button
          type="button"
          aria-label="Add-on features"
          onClick={() => setOpenModal('addons')}
          className={`rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-slate-100 transition hover:border-white/18 hover:bg-white/[0.06] ${compact ? 'min-w-[180px]' : ''}`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Add-on features</div>
          <div className="mt-1 text-sm font-semibold">
            {enabledAddOns.length > 0 ? `${enabledAddOns.length} active` : 'Optional modules'}
          </div>
          <div className="mt-1 text-xs text-slate-400">{activeRegion.label} sourcing posture</div>
        </button>
      </div>

      {openModal ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-[#05080d] px-4 py-6 md:py-10"
          onClick={() => setOpenModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={openModal === 'tiers' ? 'Tier features' : 'Add-on features'}
            className="max-h-[calc(100vh-3rem)] w-full max-w-5xl overflow-hidden rounded-[30px] border border-white/12 bg-[#0d141b] shadow-[0_32px_120px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-cyan-500/14 bg-[#111923] px-5 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/72">
                    {openModal === 'tiers' ? 'Platform tiers' : 'Optional modules'}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-slate-50">
                    {openModal === 'tiers' ? 'Tier features and pricing' : 'Add-on features and sourcing'}
                  </div>
                  <div className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{catalog.shellNote}</div>
                </div>
                <button
                  type="button"
                  aria-label="Close shell commerce modal"
                  onClick={() => setOpenModal(null)}
                  className="rounded-full border border-white/14 bg-[#0a1016] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300 transition hover:border-white/24 hover:bg-[#0f151d] hover:text-white"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
                <div className="rounded-[22px] border border-cyan-300/18 bg-[#0f1a23] px-4 py-4 text-sm leading-6 text-slate-300">
                  Current posture: <span className="font-semibold text-slate-100">{activeTier.label}</span> ·{' '}
                  <span className="font-semibold text-slate-100">{selection.unitSystem}</span>-first values ·{' '}
                  <span className="font-semibold text-slate-100">{activeRegion.label}</span> sourcing.
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Local sourcing region
                  </span>
                  <select
                    aria-label="Commerce region"
                    value={selection.regionId}
                    onChange={(event) => setRegionId(event.target.value)}
                    className="w-full rounded-2xl border border-white/14 bg-[#0a1118] px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                  >
                    {catalog.regions.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 rounded-[22px] border border-white/10 bg-[#0b1218] px-4 py-4 text-sm leading-6 text-slate-300">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Billing posture
                    </div>
                    <div className="mt-2 text-base font-semibold text-slate-100">{billingSummary}</div>
                  </div>
                  <StatusPill
                    label={billingPosture?.source === 'live' ? 'Live billing status' : 'Catalog only'}
                    tone={billingPosture?.source === 'live' ? 'sky' : 'amber'}
                  />
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-300">{billingPosture?.detail ?? catalog.shellNote}</div>
                {billingPosture?.lastSyncLabel ? (
                  <div className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                    Billing sync {billingPosture.lastSyncLabel}
                  </div>
                ) : null}
                {billingPosture?.planPrices.length ? (
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {billingPosture.planPrices.map((plan) => (
                      <div key={plan.planId} className="rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-3">
                        <div className="text-sm font-semibold text-slate-100">{plan.label}</div>
                        <div className="mt-1 text-xs text-slate-400">{plan.monthlyLabel}</div>
                        <div className="text-xs text-slate-500">{plan.annualLabel}</div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="max-h-[calc(100vh-15rem)] overflow-y-auto bg-[#0d141b] px-5 py-5">
              {openModal === 'tiers' ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {catalog.tiers.map((tier) => {
                    const active = selection.tierId === tier.id;
                    return (
                      <div
                        key={tier.id}
                        className={`rounded-[24px] border px-4 py-4 shadow-[0_18px_48px_rgba(0,0,0,0.18)] ${toneClasses(tier.tone)}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-lg font-semibold">{tier.label}</div>
                            <div className="mt-1 text-sm opacity-85">{tier.summary}</div>
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            {billingPosture?.mappedTierId === tier.id ? (
                              <StatusPill label="Live billing plan" tone="sky" />
                            ) : null}
                            {active ? <StatusPill label="Active tier" tone={tier.tone} /> : null}
                          </div>
                        </div>
                        <div className="mt-4 text-xl font-semibold">{tier.priceLabel}</div>
                        <div className="mt-2 text-sm leading-6 opacity-90">{tier.roiNote}</div>
                        <ul className="mt-4 space-y-2 text-sm leading-6">
                          {tier.features.map((feature) => (
                            <li key={feature}>• {feature}</li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          onClick={() => setTierId(tier.id)}
                          className={`mt-5 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                            active
                              ? 'bg-white/90 text-slate-950'
                              : 'bg-cyan-300 text-slate-950 hover:bg-cyan-200'
                          }`}
                        >
                          {active ? 'Current tier' : 'Select tier'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {catalog.addOns.map((addOn) => {
                    const active = selection.addOnIds.includes(addOn.id);
                    return (
                      <div
                        key={addOn.id}
                        className={`rounded-[24px] border px-4 py-4 shadow-[0_18px_48px_rgba(0,0,0,0.18)] ${toneClasses(addOn.tone)}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-lg font-semibold">{addOn.label}</div>
                            <div className="mt-1 text-sm opacity-85">{addOn.summary}</div>
                          </div>
                          <StatusPill label={addOn.category} tone={addOn.tone} />
                        </div>
                        <div className="mt-4 text-xl font-semibold">{addOn.priceLabel}</div>
                        <div className="mt-2 text-sm leading-6 opacity-90">{addOn.roiNote}</div>
                        <button
                          type="button"
                          onClick={() => toggleAddOn(addOn.id)}
                          className={`mt-5 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                            active
                              ? 'bg-white/90 text-slate-950'
                              : 'bg-cyan-300 text-slate-950 hover:bg-cyan-200'
                          }`}
                        >
                          {active ? 'Selected add-on' : 'Select add-on'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
