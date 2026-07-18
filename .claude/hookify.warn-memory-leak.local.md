---
name: warn-memory-leak
enabled: true
event: file
pattern: (setInterval\(|\$on\(|\.subscribe\(|new\s+MutationObserver|new\s+IntersectionObserver|new\s+ResizeObserver)
action: warn
---

**Potential memory leak pattern detected**

Listeners, intervals, observers, and subscriptions that are not cleaned up cause memory leaks in SPAs and long-running processes.

- Every `add`/`set`/`subscribe`/`new Observer` needs a corresponding cleanup (`remove`/`clear`/`unsubscribe`/`disconnect`)
- Use AbortController for addEventListener cleanup in React useEffect
