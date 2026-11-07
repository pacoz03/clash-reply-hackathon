import { notebookSchema } from "../model";
import { createLibrary, librarySchema, type Library } from "../library";
let database: Promise<IDBDatabase> | undefined;
function openDb() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("margine-notebook", 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("notebooks"))
        request.result.createObjectStore("notebooks");
      if (!request.result.objectStoreNames.contains("materials"))
        request.result.createObjectStore("materials");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(
        new Error(
          "Chiudi le altre schede di Margine e ricarica per aggiornare il salvataggio.",
        ),
      );
  });
  return database;
}
async function read(store: string, key: string): Promise<unknown> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(store).objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function loadLibrary(): Promise<Library> {
  const saved = await read("notebooks", "library");
  if (saved) {
    const parsed = librarySchema.safeParse(saved);
    if (!parsed.success)
      throw new Error(
        "La biblioteca salvata non è leggibile. I dati originali non sono stati modificati.",
      );
    for (const entry of parsed.data.notebooks) {
      if (
        !entry.notebook.pages.some((p) => p.id === entry.notebook.activePageId)
      )
        entry.notebook.activePageId = entry.notebook.pages[0].id;
    }
    return parsed.data;
  }
  const legacy = await read("notebooks", "current");
  if (legacy) {
    const parsed = notebookSchema.safeParse(legacy);
    if (!parsed.success)
      throw new Error(
        "Il quaderno salvato non è leggibile. I dati originali non sono stati modificati.",
      );
    const notebook = parsed.data;
    if (!notebook.pages.some((p) => p.id === notebook.activePageId))
      notebook.activePageId = notebook.pages[0].id;
    return createLibrary(notebook);
  }
  return createLibrary();
}
// Keep the legacy key intact; write all new snapshots in order.
let saveQueue: Promise<void> = Promise.resolve();
function write(
  store: string,
  key: string,
  value: unknown,
  remove = false,
): Promise<void> {
  const save = saveQueue
    .catch(() => undefined)
    .then(async () => {
      const db = await openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        if (remove) tx.objectStore(store).delete(key);
        else tx.objectStore(store).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    });
  saveQueue = save;
  return save;
}
export function saveLibrary(library: Library) {
  return write("notebooks", "library", structuredClone(library));
}
export function saveMaterial(id: string, file: Blob) {
  return write("materials", id, file);
}
export async function loadMaterial(id: string): Promise<Blob> {
  const file = await read("materials", id);
  if (!(file instanceof Blob))
    throw new Error(
      "Il file non è disponibile sul dispositivo. Caricalo di nuovo.",
    );
  return file;
}
export function deleteMaterial(id: string) {
  return write("materials", id, undefined, true);
}
