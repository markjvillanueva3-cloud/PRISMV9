import {
  apiConfig,
  getAvailableReasoningProviders,
  getModelForTier,
  getPreferredReasoningProvider,
  hasAnthropicApiKey,
  hasOpenAIApiKey,
  type ReasoningProvider,
  type ReasoningProviderPreference,
  type ReasoningTier,
} from "./api-config.js";

export type PrismRuntimeProfileId = "claude-opus" | "codex-gpt54" | "hybrid-auto";
export type PrismRuntimeProfileProvider = ReasoningProvider | "hybrid";
export type PrismReasoningDepth = "quick" | "balanced" | "deep" | "agentic";

export interface PrismRuntimeProfile {
  id: PrismRuntimeProfileId;
  label: string;
  provider: PrismRuntimeProfileProvider;
  executionProvider: ReasoningProvider;
  coordinatorModel: string;
  tierModels: Record<ReasoningTier, string>;
  samplingHints: string[];
  available: boolean;
  executionState: "live" | "profile-only";
  reasoningDepth: PrismReasoningDepth;
  description: string;
  capabilities: string[];
}

function buildCapabilities(provider: PrismRuntimeProfileProvider) {
  return [
    "PRISMUnifiedOrchestratorEngine coordinates specialist manufacturing flows.",
    "ScientificReasoningEngine, DecisionReasoningEngine, and MultiPathReasoningEngine keep the stack in deep-reasoning mode.",
    "ChainOfThoughtEngine and ExtendedThinkingBridgeEngine preserve multi-step logic across tool calls.",
    "SpeedFeedDeepLearningEngine, FiveAxisDeepLearningEngine, and PostProcessorDeepLearningEngine keep the runtime connected to learned manufacturing priors.",
    provider === "openai"
      ? "Codex/GPT-class prompting is attached for high-agency MCP reasoning and CLI execution."
      : provider === "hybrid"
        ? "Hybrid mode lets Codex/GPT-class and Claude-class runtimes share one PRISM agent definition."
        : "Claude-class delegation remains available for the original PRISM agent path.",
  ];
}

function buildProfile(
  id: PrismRuntimeProfileId,
  provider: PrismRuntimeProfileProvider,
  executionProvider: ReasoningProvider,
  reasoningDepth: PrismReasoningDepth,
  label: string,
  description: string,
): PrismRuntimeProfile {
  const tierModels = {
    haiku: getModelForTier("haiku", executionProvider),
    sonnet: getModelForTier("sonnet", executionProvider),
    opus: getModelForTier("opus", executionProvider),
  };
  const available =
    executionProvider === "anthropic"
      ? hasAnthropicApiKey()
      : hasOpenAIApiKey();

  return {
    id,
    label,
    provider,
    executionProvider,
    coordinatorModel: tierModels.opus,
    tierModels,
    samplingHints: [
      tierModels.opus,
      tierModels.sonnet,
      provider === "openai"
        ? apiConfig.codexCliModel
        : executionProvider === "openai"
          ? apiConfig.gpt54Model
          : apiConfig.opusModel,
    ],
    available,
    executionState: available ? "live" : "profile-only",
    reasoningDepth,
    description,
    capabilities: buildCapabilities(provider),
  };
}

export function getDefaultPrismRuntimeProfileId(): PrismRuntimeProfileId {
  const configured = process.env.PRISM_REASONING_RUNTIME;
  if (
    configured === "claude-opus"
    || configured === "codex-gpt54"
    || configured === "hybrid-auto"
  ) {
    return configured;
  }

  if (apiConfig.preferredReasoningProvider === "openai") {
    return "codex-gpt54";
  }

  return "hybrid-auto";
}

export function listPrismRuntimeProfiles(): PrismRuntimeProfile[] {
  const preferred = getPreferredReasoningProvider();

  return [
    buildProfile(
      "claude-opus",
      "anthropic",
      "anthropic",
      "deep",
      "Claude Opus PRISM Coordinator",
      "Keeps the original Claude-first PRISM agent posture intact while surfacing the deeper reasoning stack to MCP clients.",
    ),
    buildProfile(
      "codex-gpt54",
      "openai",
      "openai",
      "agentic",
      "Codex / GPT-5.4 PRISM Coordinator",
      "Attaches Codex-grade deep reasoning, CLI-native planning, and GPT-class synthesis to the same PRISM agent topology.",
    ),
    buildProfile(
      "hybrid-auto",
      "hybrid",
      preferred,
      preferred === "openai" ? "agentic" : "deep",
      "Hybrid Auto PRISM Coordinator",
      "Selects the best live reasoning provider automatically while keeping both Claude-side and Codex-side model hints discoverable to MCP clients.",
    ),
  ];
}

export function getPrismRuntimeProfile(
  profileId: PrismRuntimeProfileId = getDefaultPrismRuntimeProfileId(),
): PrismRuntimeProfile {
  const profile = listPrismRuntimeProfiles().find((candidate) => candidate.id === profileId);
  return profile ?? listPrismRuntimeProfiles()[0];
}

export function resolvePrismRuntimeProfile(options?: {
  profileId?: PrismRuntimeProfileId;
  providerPreference?: ReasoningProviderPreference;
}): PrismRuntimeProfile {
  if (options?.profileId) {
    return getPrismRuntimeProfile(options.profileId);
  }

  if (options?.providerPreference === "anthropic") {
    return getPrismRuntimeProfile("claude-opus");
  }

  if (options?.providerPreference === "openai") {
    return getPrismRuntimeProfile("codex-gpt54");
  }

  return getPrismRuntimeProfile();
}

export function getPrismRuntimeAvailabilitySummary(): {
  providers: ReasoningProvider[];
  defaultProfileId: PrismRuntimeProfileId;
  defaultProvider: ReasoningProvider;
} {
  const defaultProfile = getPrismRuntimeProfile();
  return {
    providers: getAvailableReasoningProviders(),
    defaultProfileId: defaultProfile.id,
    defaultProvider: defaultProfile.executionProvider,
  };
}
