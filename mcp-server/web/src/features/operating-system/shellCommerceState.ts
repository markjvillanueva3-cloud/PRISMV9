import { useEffect, useState } from 'react';
import type { ShellCommerceSelection } from './contracts';
import { DEFAULT_SHELL_COMMERCE_SELECTION } from './commerceFixtures';

const SHELL_COMMERCE_KEY = 'prism_shell_commerce_v1';
const SHELL_COMMERCE_EVENT = 'prism-shell-commerce-change';

function normalizeSelection(raw: Partial<ShellCommerceSelection> | null | undefined): ShellCommerceSelection {
  return {
    unitSystem: raw?.unitSystem === 'metric' ? 'metric' : 'inch',
    tierId: raw?.tierId || DEFAULT_SHELL_COMMERCE_SELECTION.tierId,
    addOnIds: Array.isArray(raw?.addOnIds) ? raw.addOnIds : DEFAULT_SHELL_COMMERCE_SELECTION.addOnIds,
    regionId: raw?.regionId || DEFAULT_SHELL_COMMERCE_SELECTION.regionId,
  };
}

export function readShellCommerceSelection(): ShellCommerceSelection {
  if (typeof window === 'undefined') {
    return DEFAULT_SHELL_COMMERCE_SELECTION;
  }

  try {
    const raw = window.localStorage.getItem(SHELL_COMMERCE_KEY);
    if (!raw) {
      return DEFAULT_SHELL_COMMERCE_SELECTION;
    }
    return normalizeSelection(JSON.parse(raw) as Partial<ShellCommerceSelection>);
  } catch {
    return DEFAULT_SHELL_COMMERCE_SELECTION;
  }
}

function writeShellCommerceSelection(selection: ShellCommerceSelection) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SHELL_COMMERCE_KEY, JSON.stringify(selection));
  window.dispatchEvent(new CustomEvent(SHELL_COMMERCE_EVENT, { detail: selection }));
}

export function updateShellCommerceSelection(
  updater: ShellCommerceSelection | ((current: ShellCommerceSelection) => ShellCommerceSelection),
) {
  const current = readShellCommerceSelection();
  const next = normalizeSelection(typeof updater === 'function' ? updater(current) : updater);
  writeShellCommerceSelection(next);
  return next;
}

export function useShellCommerceSelection() {
  const [selection, setSelection] = useState<ShellCommerceSelection>(() => readShellCommerceSelection());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleChange = () => setSelection(readShellCommerceSelection());
    window.addEventListener(SHELL_COMMERCE_EVENT, handleChange);
    window.addEventListener('storage', handleChange);
    return () => {
      window.removeEventListener(SHELL_COMMERCE_EVENT, handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, []);

  return {
    selection,
    setUnitSystem(unitSystem: ShellCommerceSelection['unitSystem']) {
      return updateShellCommerceSelection((current) => ({ ...current, unitSystem }));
    },
    setTierId(tierId: string) {
      return updateShellCommerceSelection((current) => ({ ...current, tierId }));
    },
    toggleAddOn(addOnId: string) {
      return updateShellCommerceSelection((current) => ({
        ...current,
        addOnIds: current.addOnIds.includes(addOnId)
          ? current.addOnIds.filter((entry) => entry !== addOnId)
          : [...current.addOnIds, addOnId],
      }));
    },
    setRegionId(regionId: string) {
      return updateShellCommerceSelection((current) => ({ ...current, regionId }));
    },
  };
}
