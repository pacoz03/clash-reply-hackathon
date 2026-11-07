import { notebookSchema, type Notebook } from '../model';
let database: Promise<IDBDatabase> | undefined;
function openDb() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('margine-notebook', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('notebooks');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return database;
}
export async function loadNotebook(): Promise<Notebook | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction('notebooks').objectStore('notebooks').get('current');
    request.onsuccess = () => {
      if (!request.result) return resolve(null);
      const parsed = notebookSchema.safeParse(request.result);
      if (!parsed.success) return reject(new Error('Il quaderno salvato non è leggibile. I dati originali non sono stati modificati.'));
      const notebook = parsed.data;
      if (!notebook.pages.some(p => p.id === notebook.activePageId)) notebook.activePageId = notebook.pages[0].id;
      resolve(notebook);
    };
    request.onerror = () => reject(request.error);
  });
}
// Serialize transactions so an older snapshot can never overwrite a newer one.
let saveQueue: Promise<void> = Promise.resolve();
export function saveNotebook(notebook: Notebook): Promise<void> {
  const snapshot = structuredClone(notebook);
  const save = saveQueue.catch(() => undefined).then(async () => {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('notebooks', 'readwrite');
      tx.objectStore('notebooks').put(snapshot, 'current');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  });
  saveQueue = save;
  return save;
}
