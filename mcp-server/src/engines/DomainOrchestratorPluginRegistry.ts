/**
 * DomainOrchestratorPluginRegistry
 * Registry for domain-specific orchestrators that handle specialized manufacturing tasks.
 */

export interface DomainOrchestrator {
  domain: string;
  name: string;
  description: string;
  supportedIntents: string[];
  execute: (intent: string, context?: Record<string, unknown>) => Promise<unknown>;
}

export class DomainOrchestratorPluginRegistry {
  private plugins: Map<string, DomainOrchestrator> = new Map();

  constructor() {
    this.initializeDefaultPlugins();
  }

  private initializeDefaultPlugins(): void {
    this.register({
      domain: 'machining',
      name: 'MachiningOrchestrator',
      description: 'Handles machining-related intents (speeds, feeds, tooling)',
      supportedIntents: ['calculate', 'optimize', 'recommend'],
      execute: async (intent) => ({ domain: 'machining', intent, result: 'executed' }),
    });

    this.register({
      domain: 'toolpath',
      name: 'ToolpathOrchestrator',
      description: 'Handles toolpath generation and optimization',
      supportedIntents: ['generate', 'optimize', 'validate'],
      execute: async (intent) => ({ domain: 'toolpath', intent, result: 'executed' }),
    });

    this.register({
      domain: 'quality',
      name: 'QualityOrchestrator',
      description: 'Handles quality control and inspection',
      supportedIntents: ['inspect', 'measure', 'certify'],
      execute: async (intent) => ({ domain: 'quality', intent, result: 'executed' }),
    });

    this.register({
      domain: 'material',
      name: 'MaterialOrchestrator',
      description: 'Handles material selection and properties',
      supportedIntents: ['select', 'lookup', 'compare'],
      execute: async (intent) => ({ domain: 'material', intent, result: 'executed' }),
    });
  }

  register(plugin: DomainOrchestrator): void {
    this.plugins.set(plugin.domain, plugin);
  }

  findByDomain(domain: string): DomainOrchestrator | undefined {
    return this.plugins.get(domain);
  }

  listDomains(): string[] {
    return Array.from(this.plugins.keys());
  }

  getAll(): DomainOrchestrator[] {
    return Array.from(this.plugins.values());
  }

  getStats(): { total: number; domains: string[] } {
    return {
      total: this.plugins.size,
      domains: this.listDomains(),
    };
  }

  findByIntent(intent: string): DomainOrchestrator[] {
    const matches: DomainOrchestrator[] = [];
    const words = intent.toLowerCase().split(/\s+/);

    for (const plugin of this.plugins.values()) {
      const matchesIntent = plugin.supportedIntents.some(supported =>
        words.some(word => word.includes(supported) || supported.includes(word))
      );
      if (matchesIntent) {
        matches.push(plugin);
      }
    }
    return matches;
  }
}

export const domainOrchestratorPluginRegistry = new DomainOrchestratorPluginRegistry();
