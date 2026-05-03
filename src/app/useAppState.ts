import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { currentContext } from "../domain/calculations";
import type { AppState } from "../domain/types";
import {
  createDataFile,
  forgetStoredFileHandle,
  hasReadPermission,
  isFileSystemAccessSupported,
  openDataFile,
  readStateFromHandle,
  restoreStoredFileHandle,
  type DataFileState,
  type FileSystemFileHandleLike,
  writeStateToHandle
} from "../storage/dataFile";
import {
  clearCloudConfig,
  loadCloudConfig,
  pullCloudState as pullCloudStateFromStore,
  pushCloudState,
  saveCloudConfig,
  type CloudSyncConfig,
  type CloudSyncState
} from "../storage/cloudStore";
import { clearState, loadState, saveState } from "../storage/localStore";

export function useAppState() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [dataFile, setDataFile] = useState<DataFileState>(() => ({
    supported: typeof window !== "undefined" ? isFileSystemAccessSupported() : false,
    status: typeof window !== "undefined" && isFileSystemAccessSupported() ? "cache" : "unsupported"
  }));
  const [cloudSync, setCloudSync] = useState<CloudSyncState>(() => {
    const config = typeof window !== "undefined" ? loadCloudConfig() : { enabled: false, endpoint: "" };
    return { status: config.enabled ? "ready" : "disabled", config };
  });
  const fileHandleRef = useRef<FileSystemFileHandleLike | undefined>(undefined);
  const saveTimerRef = useRef<number | undefined>(undefined);
  const canAutosaveRef = useRef(false);
  const cloudSaveTimerRef = useRef<number | undefined>(undefined);
  const cloudConfigRef = useRef<CloudSyncConfig>(cloudSync.config);
  const cloudReadyRef = useRef(false);
  const applyingCloudStateRef = useRef(false);

  const syncConfig = useCallback((config: CloudSyncConfig, status: CloudSyncState["status"] = config.enabled ? "ready" : "disabled", error?: string) => {
    cloudConfigRef.current = config;
    cloudReadyRef.current = config.enabled && status !== "error" && status !== "conflict";
    setCloudSync({ status, config, error });
  }, []);

  useEffect(() => {
    saveState(state);
    if (!fileHandleRef.current || !canAutosaveRef.current) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    setDataFile((current) => ({ ...current, status: "saving", error: undefined }));
    saveTimerRef.current = window.setTimeout(() => {
      const handle = fileHandleRef.current;
      if (!handle) return;
      writeStateToHandle(handle, state)
        .then((savedAt) => setDataFile({ supported: true, status: "saved", fileName: handle.name, savedAt }))
        .catch((error: Error) => setDataFile({ supported: true, status: "error", fileName: handle.name, error: error.message }));
    }, 700);
  }, [state]);

  useEffect(() => {
    if (!cloudConfigRef.current.enabled || !cloudReadyRef.current || applyingCloudStateRef.current) return;
    if (cloudSaveTimerRef.current) window.clearTimeout(cloudSaveTimerRef.current);
    setCloudSync((current) => ({ ...current, status: "syncing", error: undefined }));
    cloudSaveTimerRef.current = window.setTimeout(() => {
      const config = cloudConfigRef.current;
      pushCloudState(config, state)
        .then(({ revision, savedAt }) => {
          const nextConfig = saveCloudConfig({ ...config, lastRevision: revision ?? config.lastRevision, lastSyncedAt: savedAt });
          syncConfig(nextConfig, "synced");
        })
        .catch((error: Error) => {
          setCloudSync((current) => ({
            ...current,
            status: error.message.includes("annan enhet") ? "conflict" : "error",
            error: error.message
          }));
          cloudReadyRef.current = false;
        });
    }, 1200);
  }, [state, syncConfig]);

  useEffect(() => {
    if (!isFileSystemAccessSupported()) return;
    restoreStoredFileHandle()
      .then(async (handle) => {
        if (!handle) return;
        fileHandleRef.current = handle;
        setDataFile((current) => ({ ...current, status: "connected", fileName: handle.name }));
        if (await hasReadPermission(handle)) {
          const fileState = await readStateFromHandle(handle);
          canAutosaveRef.current = true;
          setState(fileState);
          setDataFile((current) => ({ ...current, status: "saved", fileName: handle.name }));
        }
      })
      .catch((error: Error) => setDataFile({ supported: true, status: "error", error: error.message }));
  }, []);

  useEffect(() => {
    const config = cloudConfigRef.current;
    if (!config.enabled) return;
    setCloudSync((current) => ({ ...current, status: "syncing", error: undefined }));
    pullCloudStateFromStore(config)
      .then((cloud) => {
        const nextConfig = saveCloudConfig({
          ...config,
          lastRevision: cloud.revision ?? config.lastRevision,
          lastSyncedAt: cloud.savedAt ?? config.lastSyncedAt
        });
        if (cloud.state) {
          applyingCloudStateRef.current = true;
          setState(cloud.state);
          window.setTimeout(() => {
            applyingCloudStateRef.current = false;
            syncConfig(nextConfig, "synced");
          }, 0);
          return;
        }
        syncConfig(nextConfig, "ready");
      })
      .catch((error: Error) => syncConfig(config, "error", error.message));
  }, [syncConfig]);

  const context = useMemo(() => currentContext(state), [state]);
  const connectDataFile = useCallback(async () => {
    try {
      const { handle, state: fileState } = await openDataFile();
      fileHandleRef.current = handle;
      canAutosaveRef.current = true;
      setState(fileState);
      setDataFile({ supported: true, status: "saved", fileName: handle.name });
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setDataFile({ supported: true, status: "error", error: (error as Error).message });
    }
  }, []);

  const saveAsDataFile = useCallback(async () => {
    try {
      const { handle, savedAt } = await createDataFile(state);
      fileHandleRef.current = handle;
      canAutosaveRef.current = true;
      setDataFile({ supported: true, status: "saved", fileName: handle.name, savedAt });
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setDataFile({ supported: true, status: "error", error: (error as Error).message });
    }
  }, [state]);

  const saveDataFileNow = useCallback(async () => {
    try {
      if (!fileHandleRef.current) {
        await saveAsDataFile();
        return;
      }
      const handle = fileHandleRef.current;
      setDataFile((current) => ({ ...current, status: "saving", error: undefined }));
      const savedAt = await writeStateToHandle(handle, state);
      setDataFile({ supported: true, status: "saved", fileName: handle.name, savedAt });
    } catch (error) {
      setDataFile((current) => ({ ...current, status: "error", error: (error as Error).message }));
    }
  }, [saveAsDataFile, state]);

  const disconnectDataFile = useCallback(async () => {
    fileHandleRef.current = undefined;
    canAutosaveRef.current = false;
    await forgetStoredFileHandle();
    setDataFile({ supported: true, status: "cache" });
  }, []);

  const configureCloudSync = useCallback(
    (input: { endpoint: string; token?: string; enabled: boolean }) => {
      const config = saveCloudConfig({
        enabled: input.enabled,
        endpoint: input.endpoint,
        token: input.token || undefined
      });
      syncConfig(config, config.enabled ? "ready" : "disabled");
    },
    [syncConfig]
  );

  const pullCloudState = useCallback(async () => {
    const config = cloudConfigRef.current;
    try {
      setCloudSync((current) => ({ ...current, status: "syncing", error: undefined }));
      const cloud = await pullCloudStateFromStore(config);
      const nextConfig = saveCloudConfig({
        ...config,
        lastRevision: cloud.revision ?? config.lastRevision,
        lastSyncedAt: cloud.savedAt ?? config.lastSyncedAt
      });
      if (cloud.state) {
        applyingCloudStateRef.current = true;
        setState(cloud.state);
        window.setTimeout(() => {
          applyingCloudStateRef.current = false;
          syncConfig(nextConfig, "synced");
        }, 0);
        return;
      }
      syncConfig(nextConfig, "ready");
    } catch (error) {
      syncConfig(config, "error", (error as Error).message);
    }
  }, [syncConfig]);

  const pushCloudStateNow = useCallback(async () => {
    const config = cloudConfigRef.current;
    try {
      setCloudSync((current) => ({ ...current, status: "syncing", error: undefined }));
      const saved = await pushCloudState(config, state);
      const nextConfig = saveCloudConfig({ ...config, lastRevision: saved.revision ?? config.lastRevision, lastSyncedAt: saved.savedAt });
      syncConfig(nextConfig, "synced");
    } catch (error) {
      syncConfig(config, (error as Error).message.includes("annan enhet") ? "conflict" : "error", (error as Error).message);
    }
  }, [state, syncConfig]);

  const disconnectCloudSync = useCallback(() => {
    if (cloudSaveTimerRef.current) window.clearTimeout(cloudSaveTimerRef.current);
    syncConfig(clearCloudConfig(), "disabled");
  }, [syncConfig]);

  const reset = async () => {
    fileHandleRef.current = undefined;
    canAutosaveRef.current = false;
    await forgetStoredFileHandle();
    disconnectCloudSync();
    setDataFile((current) => ({ supported: current.supported, status: current.supported ? "cache" : "unsupported" }));
    setState(clearState());
  };

  return {
    state,
    setState,
    context,
    reset,
    dataFile,
    connectDataFile,
    saveAsDataFile,
    saveDataFileNow,
    disconnectDataFile,
    cloudSync,
    configureCloudSync,
    pullCloudState,
    pushCloudStateNow,
    disconnectCloudSync
  };
}
