type ReconState = {
  firstCallReconDone: boolean;
  compactionRecoveryCallsRemaining: number;
  compactionRecoverySurvival: unknown;
  lastCallTimestamp: number;
};

let firstCallReconDone = false;
let compactionRecoveryCallsRemaining = 0;
let compactionRecoverySurvival: unknown = null;
let lastCallTimestamp = 0;

export function resetReconFlag(): void {
  firstCallReconDone = false;
  compactionRecoveryCallsRemaining = 0;
  compactionRecoverySurvival = null;
  lastCallTimestamp = 0;
}

export function getReconState(): ReconState {
  return {
    firstCallReconDone,
    compactionRecoveryCallsRemaining,
    compactionRecoverySurvival,
    lastCallTimestamp,
  };
}
