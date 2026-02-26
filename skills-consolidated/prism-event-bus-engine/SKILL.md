# PRISM Event Bus Engine

## Purpose
Publish-subscribe event system for cross-engine communication. Enables reactive workflows where one engine's output triggers another engine's action.

## Core Events
- `safety.threshold_crossed` — S(x) dropped below limit
- `tool.wear_alert` — Tool wear exceeded threshold
- `alarm.decoded` — CNC alarm decoded and fix suggested
- `campaign.completed` — Campaign finished all operations
- `material.not_found` — Material lookup failed, trigger search
- `session.checkpoint` — Auto-checkpoint triggered

## Usage Pattern
1. Subscribe: Engine registers handler for event type
2. Publish: Engine emits event with payload
3. Propagate: EventBus delivers to all subscribers
4. Chain: Subscribers can emit further events

## Integration Points
Used by HookEngine for pre/post action events, CadenceExecutor for periodic triggers, SynergyIntegration for F1-F8 cross-feature communication, and SafetyDispatcher for real-time safety alerts.

## Key Parameters
- `event` — Event name (dot-separated namespace)
- `payload` — Event-specific data object
- `priority` — "critical" | "high" | "normal" | "low"
- `subscribers` — Array of handler functions
