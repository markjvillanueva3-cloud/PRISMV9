/**
 * useSSE — React hook for Server-Sent Events (SSE) real-time streaming
 *
 * Use for long-running operations where WebSocket overhead isn't needed:
 * - QuoteToShip progress tracking
 * - Program generation status
 * - Pipeline execution progress
 *
 * Features:
 * - Auto-connect with channel subscriptions
 * - Auto-reconnect with exponential backoff
 * - Typed event handling matching WSEventType
 * - Connection state tracking
 */
import { useState, useEffect, useRef, useCallback } from "react";

export type SSEEventType =
  | "machine:status" | "machine:alarm"
  | "job:progress" | "job:complete" | "job:error"
  | "tool:wear" | "tool:change"
  | "safety:alert" | "quote:update"
  | "notification" | "system:health";

export interface SSEMessage {
  type: SSEEventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

export type SSEConnectionState = "connecting" | "connected" | "disconnected" | "error";

interface UseSSEOptions {
  /** SSE endpoint URL (default: /api/v1/realtime/stream) */
  url?: string;
  /** Channels to subscribe to (default: ["system:all"]) */
  channels?: string[];
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
  /** Reconnect on disconnect (default: true) */
  reconnect?: boolean;
  /** Max reconnect attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Handler called for every event */
  onMessage?: (msg: SSEMessage) => void;
  /** Handler for specific event types */
  onEvent?: Partial<Record<SSEEventType, (payload: Record<string, unknown>) => void>>;
  /** Connection state change callback */
  onStateChange?: (state: SSEConnectionState) => void;
}

export function useSSE(options: UseSSEOptions = {}) {
  const {
    url = "/api/v1/realtime/stream",
    channels = ["system:all"],
    autoConnect = true,
    reconnect = true,
    maxReconnectAttempts = 10,
    onMessage,
    onEvent,
    onStateChange,
  } = options;

  const [state, setState] = useState<SSEConnectionState>("disconnected");
  const [lastMessage, setLastMessage] = useState<SSEMessage | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateState = useCallback((newState: SSEConnectionState) => {
    setState(newState);
    onStateChange?.(newState);
  }, [onStateChange]);

  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) return;

    const channelParam = channels.join(",");
    const fullUrl = `${url}?channels=${encodeURIComponent(channelParam)}`;

    updateState("connecting");

    const es = new EventSource(fullUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      updateState("connected");
      reconnectAttempts.current = 0;
    };

    es.onerror = () => {
      updateState("error");
      es.close();
      eventSourceRef.current = null;

      if (reconnect && reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;
        reconnectTimer.current = setTimeout(connect, delay);
      } else {
        updateState("disconnected");
      }
    };

    // Listen for all event types the backend might send
    const eventTypes: SSEEventType[] = [
      "machine:status", "machine:alarm",
      "job:progress", "job:complete", "job:error",
      "tool:wear", "tool:change",
      "safety:alert", "quote:update",
      "notification", "system:health",
    ];

    for (const eventType of eventTypes) {
      es.addEventListener(eventType, (event: MessageEvent) => {
        try {
          const msg: SSEMessage = JSON.parse(event.data);
          setLastMessage(msg);
          onMessage?.(msg);
          onEvent?.[eventType]?.(msg.payload);
        } catch { /* ignore malformed */ }
      });
    }
  }, [url, channels, reconnect, maxReconnectAttempts, onMessage, onEvent, updateState]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    reconnectAttempts.current = maxReconnectAttempts; // prevent reconnect
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    updateState("disconnected");
  }, [maxReconnectAttempts, updateState]);

  useEffect(() => {
    if (autoConnect) connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      eventSourceRef.current?.close();
    };
  }, [autoConnect, connect]);

  return {
    state,
    lastMessage,
    connect,
    disconnect,
    isConnected: state === "connected",
  };
}
