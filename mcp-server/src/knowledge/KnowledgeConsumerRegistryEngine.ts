/**
 * KnowledgeConsumerRegistryEngine — U-TK07
 * Tracks which systems/engines consume tribal knowledge tips.
 * Enables usage analytics, impact analysis, and targeted propagation.
 *
 * NOTE: Temporarily located in src/knowledge/ due to src/engines/ directory corruption.
 */

// ── Types ──────────────────────────────────────────────────────────────────

/** A system that consumes tribal knowledge */
export interface KnowledgeConsumer {
  id: string;
  name: string;
  type: ConsumerType;
  description: string;
  subscribed_categories: string[];
  subscribed_tags: string[];
  priority: "low" | "normal" | "high" | "critical";
  notification_channel?: string;
  last_pull?: string;
  tips_consumed: number;
  active: boolean;
}

export type ConsumerType =
  | "engine"           // PRISM engine
  | "dispatcher"       // Action dispatcher
  | "ui_component"     // Frontend component
  | "api_endpoint"     // REST/MCP endpoint
  | "notification"     // Alert/notification system
  | "report"           // Reporting system
  | "external";        // External integration

/** Consumption event */
export interface ConsumptionEvent {
  consumer_id: string;
  tip_id: string;
  timestamp: string;
  context: string;
  action: "read" | "apply" | "dismiss" | "feedback";
  outcome?: "success" | "partial" | "failure" | "unknown";
}

/** Consumer analytics */
export interface ConsumerAnalytics {
  consumer_id: string;
  total_consumed: number;
  by_category: Record<string, number>;
  by_action: Record<string, number>;
  success_rate: number;
  avg_tips_per_day: number;
  most_used_tags: string[];
  last_active: string;
}

/** Propagation target */
export interface PropagationTarget {
  consumer: KnowledgeConsumer;
  tip_ids: string[];
  priority: number;
  reason: string;
}

// ── Registry Storage ───────────────────────────────────────────────────────

const CONSUMERS: Map<string, KnowledgeConsumer> = new Map();
const EVENTS: ConsumptionEvent[] = [];
const MAX_EVENTS = 10000;

// ── Default Consumers (built-in PRISM systems) ─────────────────────────────

const DEFAULT_CONSUMERS: KnowledgeConsumer[] = [
  {
    id: "speed-feed-orchestrator",
    name: "SpeedFeedOrchestratorEngine",
    type: "engine",
    description: "Central speed/feed calculation engine",
    subscribed_categories: ["speeds_feeds", "tooling", "material_handling"],
    subscribed_tags: ["sfm", "ipm", "chip-load", "cutting-parameters"],
    priority: "high",
    tips_consumed: 0,
    active: true,
  },
  {
    id: "tool-selection-engine",
    name: "ToolSelectionEngine",
    type: "engine",
    description: "Tool recommendation and selection",
    subscribed_categories: ["tooling", "toolpath"],
    subscribed_tags: ["endmill", "insert", "drill", "tool-life"],
    priority: "high",
    tips_consumed: 0,
    active: true,
  },
  {
    id: "chatter-stability-engine",
    name: "ChatterStabilityEngine",
    type: "engine",
    description: "Stability lobe and chatter prediction",
    subscribed_categories: ["troubleshooting", "speeds_feeds"],
    subscribed_tags: ["chatter", "vibration", "stability", "harmonics"],
    priority: "high",
    tips_consumed: 0,
    active: true,
  },
  {
    id: "fixture-design-engine",
    name: "FixtureDesignEngine",
    type: "engine",
    description: "Workholding and fixture recommendations",
    subscribed_categories: ["fixturing", "setup"],
    subscribed_tags: ["vise", "clamp", "fixture", "workholding"],
    priority: "normal",
    tips_consumed: 0,
    active: true,
  },
  {
    id: "quality-predictor",
    name: "QualityPredictorEngine",
    type: "engine",
    description: "Surface finish and quality prediction",
    subscribed_categories: ["quality", "surface_finish"],
    subscribed_tags: ["finish", "tolerance", "ra", "inspection"],
    priority: "normal",
    tips_consumed: 0,
    active: true,
  },
  {
    id: "troubleshooting-advisor",
    name: "TroubleshootingAdvisorUI",
    type: "ui_component",
    description: "Operator troubleshooting interface",
    subscribed_categories: ["troubleshooting", "safety"],
    subscribed_tags: ["problem", "solution", "root-cause"],
    priority: "high",
    notification_channel: "ui:toast",
    tips_consumed: 0,
    active: true,
  },
  {
    id: "print-to-program-pipeline",
    name: "PrintToProgramPipeline",
    type: "engine",
    description: "Full manufacturing pipeline",
    subscribed_categories: ["speeds_feeds", "tooling", "toolpath", "setup", "quality"],
    subscribed_tags: [],
    priority: "critical",
    tips_consumed: 0,
    active: true,
  },
  {
    id: "operator-dashboard",
    name: "OperatorDashboard",
    type: "ui_component",
    description: "Shop floor operator interface",
    subscribed_categories: ["safety", "setup", "troubleshooting"],
    subscribed_tags: ["operator", "tip-of-day", "safety-alert"],
    priority: "normal",
    notification_channel: "ui:banner",
    tips_consumed: 0,
    active: true,
  },
];

// Initialize default consumers
for (const consumer of DEFAULT_CONSUMERS) {
  CONSUMERS.set(consumer.id, consumer);
}

// ── Engine Implementation ──────────────────────────────────────────────────

class KnowledgeConsumerRegistryEngine {
  /**
   * Register a new knowledge consumer
   */
  register(consumer: Omit<KnowledgeConsumer, "tips_consumed" | "active">): KnowledgeConsumer {
    const fullConsumer: KnowledgeConsumer = {
      ...consumer,
      tips_consumed: 0,
      active: true,
    };

    CONSUMERS.set(consumer.id, fullConsumer);
    return fullConsumer;
  }

  /**
   * Unregister a consumer
   */
  unregister(consumerId: string): boolean {
    return CONSUMERS.delete(consumerId);
  }

  /**
   * Get a consumer by ID
   */
  get(consumerId: string): KnowledgeConsumer | undefined {
    return CONSUMERS.get(consumerId);
  }

  /**
   * List all registered consumers
   */
  list(options: {
    type?: ConsumerType;
    active_only?: boolean;
    category?: string;
  } = {}): KnowledgeConsumer[] {
    let consumers = Array.from(CONSUMERS.values());

    if (options.type) {
      consumers = consumers.filter(c => c.type === options.type);
    }

    if (options.active_only !== false) {
      consumers = consumers.filter(c => c.active);
    }

    if (options.category) {
      consumers = consumers.filter(c =>
        c.subscribed_categories.includes(options.category!)
      );
    }

    return consumers;
  }

  /**
   * Record a consumption event
   */
  recordConsumption(event: ConsumptionEvent): void {
    EVENTS.push(event);

    // Update consumer stats
    const consumer = CONSUMERS.get(event.consumer_id);
    if (consumer) {
      consumer.tips_consumed++;
      consumer.last_pull = event.timestamp;
    }

    // Trim old events
    if (EVENTS.length > MAX_EVENTS) {
      EVENTS.splice(0, EVENTS.length - MAX_EVENTS);
    }
  }

  /**
   * Get analytics for a consumer
   */
  analytics(consumerId: string): ConsumerAnalytics | null {
    const consumer = CONSUMERS.get(consumerId);
    if (!consumer) return null;

    const consumerEvents = EVENTS.filter(e => e.consumer_id === consumerId);

    // Aggregate by category (from context)
    const by_category: Record<string, number> = {};
    const by_action: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};

    let successCount = 0;
    let totalWithOutcome = 0;

    for (const event of consumerEvents) {
      by_action[event.action] = (by_action[event.action] || 0) + 1;

      if (event.outcome) {
        totalWithOutcome++;
        if (event.outcome === "success") successCount++;
      }

      // Extract category from context if available
      const categoryMatch = event.context.match(/category:(\w+)/);
      if (categoryMatch) {
        const cat = categoryMatch[1];
        by_category[cat] = (by_category[cat] || 0) + 1;
      }
    }

    // Calculate days active
    const firstEvent = consumerEvents[0]?.timestamp;
    const lastEvent = consumerEvents[consumerEvents.length - 1]?.timestamp;
    let daysActive = 1;
    if (firstEvent && lastEvent) {
      daysActive = Math.max(1,
        (new Date(lastEvent).getTime() - new Date(firstEvent).getTime()) /
        (1000 * 60 * 60 * 24)
      );
    }

    // Most used tags from subscriptions
    const most_used_tags = consumer.subscribed_tags.slice(0, 5);

    return {
      consumer_id: consumerId,
      total_consumed: consumer.tips_consumed,
      by_category,
      by_action,
      success_rate: totalWithOutcome > 0 ? successCount / totalWithOutcome : 0,
      avg_tips_per_day: consumer.tips_consumed / daysActive,
      most_used_tags,
      last_active: consumer.last_pull || "never",
    };
  }

  /**
   * Find consumers interested in a specific tip
   */
  findInterestedConsumers(tip: {
    category: string;
    tags: string[];
  }): KnowledgeConsumer[] {
    return Array.from(CONSUMERS.values()).filter(consumer => {
      if (!consumer.active) return false;

      // Check category match
      if (consumer.subscribed_categories.includes(tip.category)) {
        return true;
      }

      // Check tag overlap
      const tagOverlap = tip.tags.filter(t =>
        consumer.subscribed_tags.includes(t)
      );
      return tagOverlap.length > 0;
    });
  }

  /**
   * Get propagation targets for a new/updated tip
   */
  getPropagationTargets(tip: {
    id: string;
    category: string;
    tags: string[];
    confidence: number;
  }): PropagationTarget[] {
    const interested = this.findInterestedConsumers(tip);

    return interested.map(consumer => {
      const categoryMatch = consumer.subscribed_categories.includes(tip.category);
      const tagMatches = tip.tags.filter(t => consumer.subscribed_tags.includes(t)).length;

      // Priority based on match quality and consumer priority
      const priorityBonus = {
        low: 0,
        normal: 10,
        high: 20,
        critical: 30,
      }[consumer.priority];

      const priority = (categoryMatch ? 20 : 0) + (tagMatches * 5) + priorityBonus;

      const reasons: string[] = [];
      if (categoryMatch) reasons.push(`category: ${tip.category}`);
      if (tagMatches > 0) reasons.push(`${tagMatches} tag matches`);

      return {
        consumer,
        tip_ids: [tip.id],
        priority,
        reason: reasons.join(", "),
      };
    }).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Update consumer subscription
   */
  updateSubscription(
    consumerId: string,
    update: {
      add_categories?: string[];
      remove_categories?: string[];
      add_tags?: string[];
      remove_tags?: string[];
      priority?: KnowledgeConsumer["priority"];
    }
  ): KnowledgeConsumer | null {
    const consumer = CONSUMERS.get(consumerId);
    if (!consumer) return null;

    if (update.add_categories) {
      consumer.subscribed_categories.push(
        ...update.add_categories.filter(c => !consumer.subscribed_categories.includes(c))
      );
    }

    if (update.remove_categories) {
      consumer.subscribed_categories = consumer.subscribed_categories.filter(
        c => !update.remove_categories!.includes(c)
      );
    }

    if (update.add_tags) {
      consumer.subscribed_tags.push(
        ...update.add_tags.filter(t => !consumer.subscribed_tags.includes(t))
      );
    }

    if (update.remove_tags) {
      consumer.subscribed_tags = consumer.subscribed_tags.filter(
        t => !update.remove_tags!.includes(t)
      );
    }

    if (update.priority) {
      consumer.priority = update.priority;
    }

    return consumer;
  }

  /**
   * Activate/deactivate a consumer
   */
  setActive(consumerId: string, active: boolean): boolean {
    const consumer = CONSUMERS.get(consumerId);
    if (!consumer) return false;

    consumer.active = active;
    return true;
  }

  /**
   * Get registry stats
   */
  stats(): {
    total_consumers: number;
    active_consumers: number;
    by_type: Record<string, number>;
    total_events: number;
    events_last_24h: number;
  } {
    const consumers = Array.from(CONSUMERS.values());
    const by_type: Record<string, number> = {};

    for (const c of consumers) {
      by_type[c.type] = (by_type[c.type] || 0) + 1;
    }

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const events_last_24h = EVENTS.filter(e =>
      new Date(e.timestamp).getTime() > oneDayAgo
    ).length;

    return {
      total_consumers: consumers.length,
      active_consumers: consumers.filter(c => c.active).length,
      by_type,
      total_events: EVENTS.length,
      events_last_24h,
    };
  }
}

// ── Export Singleton ───────────────────────────────────────────────────────

export const knowledgeConsumerRegistryEngine = new KnowledgeConsumerRegistryEngine();
export { KnowledgeConsumerRegistryEngine };
