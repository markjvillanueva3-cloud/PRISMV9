import { createContext, useContext, type ReactNode } from 'react';
import type { OperatingSystemServices } from './contracts';
import { fixtureOperatingSystemServices } from './fixtureProvider';
import { liveOperatingSystemServices } from './liveProvider';
import type { ProviderRuntimeMode } from './providerSurfaceStatus';

const OperatingSystemContext = createContext<OperatingSystemServices>(liveOperatingSystemServices);
const OperatingSystemRuntimeModeContext = createContext<ProviderRuntimeMode>('live-provider');

export function OperatingSystemProvider({
  children,
  services = liveOperatingSystemServices,
}: {
  children: ReactNode;
  services?: OperatingSystemServices;
}) {
  const runtimeMode: ProviderRuntimeMode = services === fixtureOperatingSystemServices ? 'fixture-provider' : 'live-provider';

  return (
    <OperatingSystemRuntimeModeContext.Provider value={runtimeMode}>
      <OperatingSystemContext.Provider value={services}>{children}</OperatingSystemContext.Provider>
    </OperatingSystemRuntimeModeContext.Provider>
  );
}

export function useOperatingSystem() {
  return useContext(OperatingSystemContext);
}

export function useOperatingSystemRuntimeMode() {
  return useContext(OperatingSystemRuntimeModeContext);
}
