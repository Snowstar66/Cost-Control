import { enrichStateWithBaselineData, createInitialState } from "../domain/seed";
import type { AppState } from "../domain/types";

type FilePickerWindow = Window & {
  showOpenFilePicker?: (options?: unknown) => Promise<FileSystemFileHandleLike[]>;
  showSaveFilePicker?: (options?: unknown) => Promise<FileSystemFileHandleLike>;
};

type FileSystemWritableFileStreamLike = {
  write: (data: string) => Promise<void>;
  close: () => Promise<void>;
};

export type FileSystemFileHandleLike = {
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<FileSystemWritableFileStreamLike>;
  queryPermission?: (descriptor?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (descriptor?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
};

export type DataFileStatus = "unsupported" | "cache" | "connected" | "saving" | "saved" | "error";

export type DataFileState = {
  supported: boolean;
  status: DataFileStatus;
  fileName?: string;
  savedAt?: string;
  error?: string;
};

type DataFilePayload = {
  kind: "cost-control-app-state";
  version: number;
  savedAt: string;
  state: AppState;
};

const dbName = "cost-control.data-file.v1";
const storeName = "handles";
const primaryKey = "primary";

export function isFileSystemAccessSupported(): boolean {
  const pickerWindow = window as FilePickerWindow;
  return typeof pickerWindow.showOpenFilePicker === "function" && typeof pickerWindow.showSaveFilePicker === "function" && typeof indexedDB !== "undefined";
}

export function buildDataFilePayload(state: AppState): DataFilePayload {
  return {
    kind: "cost-control-app-state",
    version: state.version,
    savedAt: new Date().toISOString(),
    state
  };
}

export function parseDataFile(text: string): AppState {
  const parsed = JSON.parse(text) as Partial<DataFilePayload> | Partial<AppState>;
  const state = "kind" in parsed && parsed.kind === "cost-control-app-state" ? parsed.state : parsed;
  if (!isAppStateLike(state)) {
    throw new Error("Filen ar inte en giltig datafil for Mina Utgifter.");
  }
  return enrichStateWithBaselineData({ ...createInitialState(), ...state });
}

export async function readStateFromHandle(handle: FileSystemFileHandleLike): Promise<AppState> {
  const file = await handle.getFile();
  return parseDataFile(await file.text());
}

export async function writeStateToHandle(handle: FileSystemFileHandleLike, state: AppState): Promise<string> {
  const permission = await requestWritablePermission(handle);
  if (!permission) throw new Error("Appen fick inte rattighet att skriva till datafilen.");
  const savedAt = new Date().toISOString();
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify({ ...buildDataFilePayload(state), savedAt }, null, 2));
  await writable.close();
  return savedAt;
}

export async function openDataFile(): Promise<{ handle: FileSystemFileHandleLike; state: AppState }> {
  const pickerWindow = window as FilePickerWindow;
  if (!pickerWindow.showOpenFilePicker) throw new Error("Din webblasare stodjer inte lokal datafil.");
  const [handle] = await pickerWindow.showOpenFilePicker({
    multiple: false,
    types: [{ description: "Mina Utgifter JSON", accept: { "application/json": [".json"] } }]
  });
  const state = await readStateFromHandle(handle);
  await storeFileHandle(handle);
  return { handle, state };
}

export async function createDataFile(state: AppState): Promise<{ handle: FileSystemFileHandleLike; savedAt: string }> {
  const pickerWindow = window as FilePickerWindow;
  if (!pickerWindow.showSaveFilePicker) throw new Error("Din webblasare stodjer inte lokal datafil.");
  const handle = await pickerWindow.showSaveFilePicker({
    suggestedName: "MinaUtgifter.json",
    types: [{ description: "Mina Utgifter JSON", accept: { "application/json": [".json"] } }]
  });
  const savedAt = await writeStateToHandle(handle, state);
  await storeFileHandle(handle);
  return { handle, savedAt };
}

export async function restoreStoredFileHandle(): Promise<FileSystemFileHandleLike | undefined> {
  if (!isFileSystemAccessSupported()) return undefined;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, "readonly").objectStore(storeName).get(primaryKey);
    request.onsuccess = () => resolve(request.result?.handle as FileSystemFileHandleLike | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function forgetStoredFileHandle(): Promise<void> {
  if (!isFileSystemAccessSupported()) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(storeName, "readwrite").objectStore(storeName).delete(primaryKey);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function hasReadPermission(handle: FileSystemFileHandleLike): Promise<boolean> {
  if (!handle.queryPermission) return true;
  return (await handle.queryPermission({ mode: "read" })) === "granted";
}

async function requestWritablePermission(handle: FileSystemFileHandleLike): Promise<boolean> {
  if (!handle.queryPermission || !handle.requestPermission) return true;
  const descriptor = { mode: "readwrite" as const };
  if ((await handle.queryPermission(descriptor)) === "granted") return true;
  return (await handle.requestPermission(descriptor)) === "granted";
}

async function storeFileHandle(handle: FileSystemFileHandleLike): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(storeName, "readwrite").objectStore(storeName).put({ id: primaryKey, handle });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function isAppStateLike(value: unknown): value is AppState {
  const state = value as Partial<AppState>;
  return Boolean(
    state &&
      typeof state === "object" &&
      typeof state.version === "number" &&
      typeof state.activeContextId === "string" &&
      Array.isArray(state.contexts) &&
      Array.isArray(state.expenses) &&
      Array.isArray(state.costPeriods)
  );
}
