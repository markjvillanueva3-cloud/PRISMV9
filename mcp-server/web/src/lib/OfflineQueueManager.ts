/**
 * BIZ-MS1 U-BIZ11: Offline Queue Manager
 * IndexedDB-backed queue for shop floor actions.
 * Enqueues when offline, replays when back online.
 */

const DB_NAME = 'prism_offline';
const DB_VERSION = 1;
const STORE_NAME = 'offline_actions';

export interface OfflineAction {
  id?: number;
  action_type: string;
  payload: Record<string, unknown>;
  timestamp: string;
  status: 'pending' | 'syncing' | 'failed';
}

type Subscriber = (count: number) => void;

class OfflineQueueManagerImpl {
  private db: IDBDatabase | null = null;
  private subscribers: Subscriber[] = [];
  private ready: Promise<void>;

  constructor() {
    this.ready = this.init();
  }

  private init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        resolve(); // SSR or no IndexedDB
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
      req.onsuccess = () => {
        this.db = req.result;
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  async enqueue(action_type: string, payload: Record<string, unknown>): Promise<number> {
    await this.ready;
    if (!this.db) return -1;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const action: OfflineAction = {
        action_type,
        payload,
        timestamp: new Date().toISOString(),
        status: 'pending',
      };
      const req = store.add(action);
      req.onsuccess = () => {
        const key = req.result as number;
        this.notifySubscribers();
        resolve(key);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async replayAll(
    executor: (action_type: string, payload: Record<string, unknown>) => Promise<Response>,
  ): Promise<{ replayed: number; skipped: number; failed: number }> {
    await this.ready;
    if (!this.db) return { replayed: 0, skipped: 0, failed: 0 };

    const actions = await this.getAllPending();
    let replayed = 0;
    let skipped = 0;
    let failed = 0;

    for (const action of actions) {
      await this.updateStatus(action.id!, 'syncing');
      try {
        const res = await executor(action.action_type, action.payload);
        if (res.ok) {
          await this.delete(action.id!);
          replayed++;
        } else if (res.status === 409) {
          // Already processed
          await this.delete(action.id!);
          skipped++;
        } else {
          await this.updateStatus(action.id!, 'failed');
          failed++;
          break; // Stop on first non-409 error
        }
      } catch {
        await this.updateStatus(action.id!, 'failed');
        failed++;
        break;
      }
    }

    this.notifySubscribers();
    return { replayed, skipped, failed };
  }

  async getPendingCount(): Promise<number> {
    await this.ready;
    if (!this.db) return 0;
    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const idx = store.index('status');
      const req = idx.count(IDBKeyRange.only('pending'));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
  }

  subscribe(callback: Subscriber): () => void {
    this.subscribers.push(callback);
    // Immediately fire with current count
    void this.getPendingCount().then(callback);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
    };
  }

  private async notifySubscribers(): Promise<void> {
    const count = await this.getPendingCount();
    for (const sub of this.subscribers) sub(count);
  }

  private getAllPending(): Promise<OfflineAction[]> {
    return new Promise((resolve) => {
      if (!this.db) { resolve([]); return; }
      const tx = this.db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const idx = store.index('timestamp');
      const req = idx.getAll();
      req.onsuccess = () => {
        const all = (req.result as OfflineAction[]).filter((a) => a.status === 'pending' || a.status === 'failed');
        resolve(all.sort((a, b) => a.timestamp.localeCompare(b.timestamp)));
      };
      req.onerror = () => resolve([]);
    });
  }

  private updateStatus(id: number, status: OfflineAction['status']): Promise<void> {
    return new Promise((resolve) => {
      if (!this.db) { resolve(); return; }
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result;
        if (record) {
          record.status = status;
          store.put(record);
        }
        resolve();
      };
      getReq.onerror = () => resolve();
    });
  }

  private delete(id: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this.db) { resolve(); return; }
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }
}

export const offlineQueueManager = new OfflineQueueManagerImpl();
