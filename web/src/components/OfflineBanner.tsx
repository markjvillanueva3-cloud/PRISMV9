import { useState, useEffect } from "react";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const ac = new AbortController();
    window.addEventListener("offline", () => setOffline(true), { signal: ac.signal });
    window.addEventListener("online", () => setOffline(false), { signal: ac.signal });
    return () => ac.abort();
  }, []);

  if (!offline) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-yellow-500
        px-4 py-2 text-sm font-medium text-white shadow-lg"
    >
      You are offline. Some features may be unavailable.
    </div>
  );
}
