/**
 * useWebSocket — React hook for PRISM real-time WebSocket connection
 *
 * Features:
 * - Auto-connect with JWT auth token
 * - Auto-reconnect with exponential backoff
 * - Room subscription management
 * - Typed message handling
 * - Connection state tracking
 */
import { useState, useEffect, useRef, useCallback } from "react";

export type WSEventType =
  | "machine:status" | "machine:alarm"
  | "job:progress" | "job:complete" | "job:error"
  | "tool:wear" | "tool:change"
  | "safety:alert" | "quote:update"
  | "notification" | "system:health"
  | "ping" | "pong"
  | "subscribe" | "unsubscribe" | "error";

export interface WSMessage {
  type: WSEventType;
  room?: string;
  payload: Record<string, unknown>;
  timestamp: string;
  sender?: string;
  id?: string;
}

export type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

interface UseWebSocketOptions {
  url?: string;
  token?: string;
  autoConnect?: boolean;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  rooms?: string[];
  onMessage?: (msg: WSMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
    token,
    autoConnect = true,
    reconnect = true,
    maxReconnectAttempts = 10,
    rooms = [],
    onMessage,
    onConnect,
    onDisconnect,
  } = options;

  const [state, setState] = useState<ConnectionState>("disconnected");
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;
    setState("connecting");

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setState("connected");
      reconnectAttempts.current = 0;
      onConnect?.();

      // Subscribe to initial rooms
      for (const room of rooms) {
        ws.send(JSON.stringify({ type: "subscribe", room, payload: {} }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        setLastMessage(msg);
        onMessage?.(msg);
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => {
      setState("disconnected");
      onDisconnect?.();

      if (reconnect && reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;
        reconnectTimer.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      setState("error");
    };
  }, [url, token, reconnect, maxReconnectAttempts, rooms, onMessage, onConnect, onDisconnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    reconnectAttempts.current = maxReconnectAttempts; // prevent reconnect
    wsRef.current?.close();
  }, [maxReconnectAttempts]);

  const send = useCallback((message: Omit<WSMessage, "timestamp">) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ ...message, timestamp: new Date().toISOString() }));
    }
  }, []);

  const subscribe = useCallback((room: string) => {
    send({ type: "subscribe", room, payload: {} });
  }, [send]);

  const unsubscribe = useCallback((room: string) => {
    send({ type: "unsubscribe", room, payload: {} });
  }, [send]);

  useEffect(() => {
    if (autoConnect) connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [autoConnect, connect]);

  return {
    state,
    lastMessage,
    connect,
    disconnect,
    send,
    subscribe,
    unsubscribe,
    isConnected: state === "connected",
  };
}
