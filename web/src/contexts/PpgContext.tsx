import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { PpgControllerInfo } from "../types/ppg";

const STORAGE_KEY = "prism-ppg-state";
const AUTOSAVE_INTERVAL_MS = 30_000;

interface PpgState {
  activeController: PpgControllerInfo | null;
  editorContent: string;
  setActiveController: (c: PpgControllerInfo | null) => void;
  setEditorContent: (v: string) => void;
}

const PpgContext = createContext<PpgState | null>(null);

interface SavedState {
  controllerId?: string;
  controllerName?: string;
  editorContent?: string;
  savedAt?: string;
}

export function PpgProvider({ children }: { children: ReactNode }) {
  const [activeController, setActiveController] =
    useState<PpgControllerInfo | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const initialized = useRef(false);

  // Restore from localStorage on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved: SavedState = JSON.parse(raw);
      if (saved.editorContent) setEditorContent(saved.editorContent);
    } catch {
      // corrupted storage — ignore
    }
  }, []);

  // Autosave to localStorage every 30s
  const contentRef = useRef(editorContent);
  contentRef.current = editorContent;
  const controllerRef = useRef(activeController);
  controllerRef.current = activeController;

  useEffect(() => {
    const timer = setInterval(() => {
      const state: SavedState = {
        controllerId: controllerRef.current?.id,
        controllerName: controllerRef.current?.name,
        editorContent: contentRef.current,
        savedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // storage full — ignore
      }
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  const setController = useCallback(
    (c: PpgControllerInfo | null) => setActiveController(c),
    [],
  );

  const setContent = useCallback(
    (v: string) => setEditorContent(v),
    [],
  );

  return (
    <PpgContext.Provider
      value={{
        activeController,
        editorContent,
        setActiveController: setController,
        setEditorContent: setContent,
      }}
    >
      {children}
    </PpgContext.Provider>
  );
}

export function usePpgContext(): PpgState {
  const ctx = useContext(PpgContext);
  if (!ctx) {
    throw new Error("usePpgContext must be used within PpgProvider");
  }
  return ctx;
}
