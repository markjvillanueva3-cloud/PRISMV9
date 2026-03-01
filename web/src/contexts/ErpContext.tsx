import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { ErpJobInfo, ErpOeeMetric } from "../types/erp";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface ErpState {
  activeJobs: ErpJobInfo[];
  pendingQuoteCount: number;
  machineOee: ErpOeeMetric[];
  wsConnected: boolean;
}

interface ErpContextValue extends ErpState {
  updateJob: (job: ErpJobInfo) => void;
  setPendingQuoteCount: (n: number) => void;
}

const ErpCtx = createContext<ErpContextValue | null>(null);

export function useErpContext(): ErpContextValue {
  const ctx = useContext(ErpCtx);
  if (!ctx) throw new Error("useErpContext must be used inside <ErpProvider>");
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface ErpProviderProps {
  children: ReactNode;
  wsUrl?: string;
}

export function ErpProvider({ children, wsUrl = "/ws/erp" }: ErpProviderProps) {
  const [state, setState] = useState<ErpState>({
    activeJobs: [],
    pendingQuoteCount: 0,
    machineOee: [],
    wsConnected: false,
  });

  const wsRef = useRef<WebSocket | null>(null);

  // ---- WebSocket connection ----
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}${wsUrl}`;

    let reconnectTimer: ReturnType<typeof setTimeout>;
    let ws: WebSocket;

    function connect() {
      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setState((s) => ({ ...s, wsConnected: true }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleWsMessage(msg);
        } catch (err) {
          console.warn("[ErpContext] Malformed WebSocket message:", err);
        }
      };

      ws.onclose = () => {
        setState((s) => ({ ...s, wsConnected: false }));
        // Reconnect after 5s
        reconnectTimer = setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsUrl]);

  // ---- WebSocket message handler ----
  const handleWsMessage = useCallback((msg: { type: string; data: unknown }) => {
    const d = msg.data;
    switch (msg.type) {
      case "job_update": {
        if (!d || typeof d !== "object" || !("job_id" in d)) break;
        const job = d as ErpJobInfo;
        setState((s) => ({
          ...s,
          activeJobs: s.activeJobs.some((j) => j.job_id === job.job_id)
            ? s.activeJobs.map((j) => (j.job_id === job.job_id ? job : j))
            : [...s.activeJobs, job],
        }));
        break;
      }
      case "oee_update": {
        if (!d || typeof d !== "object" || !("machine" in d)) break;
        const metric = d as ErpOeeMetric;
        setState((s) => ({
          ...s,
          machineOee: s.machineOee.some((m) => m.machine === metric.machine)
            ? s.machineOee.map((m) => (m.machine === metric.machine ? metric : m))
            : [...s.machineOee, metric],
        }));
        break;
      }
      case "jobs_snapshot": {
        if (!Array.isArray(d)) break;
        setState((s) => ({ ...s, activeJobs: d as ErpJobInfo[] }));
        break;
      }
      case "oee_snapshot": {
        if (!Array.isArray(d)) break;
        setState((s) => ({ ...s, machineOee: d as ErpOeeMetric[] }));
        break;
      }
    }
  }, []);

  // ---- Optimistic updates ----
  const updateJob = useCallback((job: ErpJobInfo) => {
    setState((s) => ({
      ...s,
      activeJobs: s.activeJobs.some((j) => j.job_id === job.job_id)
        ? s.activeJobs.map((j) => (j.job_id === job.job_id ? job : j))
        : [...s.activeJobs, job],
    }));
  }, []);

  const setPendingQuoteCount = useCallback((n: number) => {
    setState((s) => ({ ...s, pendingQuoteCount: n }));
  }, []);

  return (
    <ErpCtx.Provider value={{ ...state, updateJob, setPendingQuoteCount }}>
      {children}
    </ErpCtx.Provider>
  );
}
