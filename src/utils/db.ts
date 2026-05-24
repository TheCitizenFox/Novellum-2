import { Snapshot } from '../types';

const DB_NAME = 'novellum-snapshots-db';
const STORE_NAME = 'snapshots';

export function initDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onerror = () => {
      // Fallback in case of opening error: try to open version 1
      const fallbackRequest = indexedDB.open(DB_NAME, 1);
      fallbackRequest.onerror = () => reject(fallbackRequest.error);
      fallbackRequest.onsuccess = () => resolve(fallbackRequest.result);
    };
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('backups')) {
        db.createObjectStore('backups', { keyPath: 'key' });
      }
    };
  });
}

export async function saveSnapshotDb(snapshot: Snapshot): Promise<void> {
  try {
    const db = await initDb();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        return resolve(); // Handle safety
      }
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(snapshot);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (err) {
    console.error('saveSnapshotDb error', err);
  }
}

export async function deleteSnapshotDb(id: string): Promise<void> {
  try {
    const db = await initDb();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        return resolve();
      }
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (err) {
    console.error('deleteSnapshotDb error', err);
  }
}

export async function loadSnapshotsDb(): Promise<Snapshot[]> {
  try {
    const db = await initDb();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        return resolve([]);
      }
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const snapshots = request.result as Snapshot[];
        snapshots.sort((a, b) => b.timestamp - a.timestamp);
        resolve(snapshots);
      };
    });
  } catch (err) {
    console.error('loadSnapshotsDb error', err);
    return [];
  }
}

export async function saveWorkingBackupDb(stateJson: string): Promise<void> {
  try {
    const db = await initDb();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains('backups')) {
        return resolve();
      }
      const transaction = db.transaction('backups', 'readwrite');
      const store = transaction.objectStore('backups');
      const request = store.put({ key: 'active_project', content: stateJson, timestamp: Date.now() });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (err) {
    console.error('saveWorkingBackupDb error', err);
  }
}

export async function loadWorkingBackupDb(): Promise<{ content: string; timestamp: number } | null> {
  try {
    const db = await initDb();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains('backups')) {
        return resolve(null);
      }
      const transaction = db.transaction('backups', 'readonly');
      const store = transaction.objectStore('backups');
      const request = store.get('active_project');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  } catch (err) {
    console.error('loadWorkingBackupDb error', err);
    return null;
  }
}
