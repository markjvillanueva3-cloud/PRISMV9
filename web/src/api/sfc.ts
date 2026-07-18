import { post } from "./client";
import type {
  SfcCalculateRequest, SfcCalculateResult,
  CycleTimeRequest, CycleTimeResult,
  EngagementRequest, EngagementResult,
  DeflectionRequest, DeflectionResult,
  PowerTorqueRequest, PowerTorqueResult,
  SurfaceFinishRequest, SurfaceFinishResult,
  ToolLifeRequest, ToolLifeResult,
} from "../types/sfc";

type Wrapped<T> = { result: T; safety?: SfcCalculateResult["safety"]; meta?: Record<string, unknown> };

export const sfcApi = {
  calculate: (params: SfcCalculateRequest, signal?: AbortSignal) =>
    post<SfcCalculateRequest, Wrapped<SfcCalculateResult>>("/calculate", params, signal),

  cycleTime: (params: CycleTimeRequest, signal?: AbortSignal) =>
    post<CycleTimeRequest, Wrapped<CycleTimeResult>>("/cycle-time", params, signal),

  engagement: (params: EngagementRequest, signal?: AbortSignal) =>
    post<EngagementRequest, Wrapped<EngagementResult>>("/engagement", params, signal),

  deflection: (params: DeflectionRequest, signal?: AbortSignal) =>
    post<DeflectionRequest, Wrapped<DeflectionResult>>("/deflection", params, signal),

  powerTorque: (params: PowerTorqueRequest, signal?: AbortSignal) =>
    post<PowerTorqueRequest, Wrapped<PowerTorqueResult>>("/power-torque", params, signal),

  surfaceFinish: (params: SurfaceFinishRequest, signal?: AbortSignal) =>
    post<SurfaceFinishRequest, Wrapped<SurfaceFinishResult>>("/surface-finish", params, signal),

  toolLife: (params: ToolLifeRequest, signal?: AbortSignal) =>
    post<ToolLifeRequest, Wrapped<ToolLifeResult>>("/tool-life", params, signal),
};
