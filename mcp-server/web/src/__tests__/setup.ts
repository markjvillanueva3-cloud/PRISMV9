import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

class MockWebSocket extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly url: string;
  readonly protocol = '';
  readonly extensions = '';
  binaryType: BinaryType = 'blob';
  bufferedAmount = 0;
  readyState = MockWebSocket.CONNECTING;

  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string | URL) {
    super();
    this.url = String(url);

    queueMicrotask(() => {
      if (this.readyState !== MockWebSocket.CONNECTING) {
        return;
      }
      this.readyState = MockWebSocket.OPEN;
      const openEvent = new Event('open');
      this.dispatchEvent(openEvent);
      this.onopen?.(openEvent);
    });
  }

  send(_data?: unknown) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('MockWebSocket is not open');
    }
  }

  close() {
    if (this.readyState === MockWebSocket.CLOSED) {
      return;
    }
    this.readyState = MockWebSocket.CLOSED;
    const closeEvent = new Event('close');
    this.dispatchEvent(closeEvent);
    this.onclose?.(closeEvent);
  }
}

vi.stubGlobal('WebSocket', MockWebSocket);
