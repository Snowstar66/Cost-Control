import { enrichStateWithBaselineData, createInitialState } from "../domain/seed";
import type { AppState } from "../domain/types";

const CONFIG_KEY = "cost-control.cloud-sync.v1";

export type CloudSyncConfig = {
  enabled: boolean;
  endpoint: string;
  token?: string;
  lastRevision?: string;
  lastSyncedAt?: string;
};

export type CloudSyncStatus = "disabled" | "ready" | "syncing" | "synced" | "conflict" | "error";

export type CloudSyncState = {
  status: CloudSyncStatus;
  config: CloudSyncConfig;
  error?: string;
};

type CloudPayload = {
  kind?: "cost-control-cloud-state";
  version?: number;
  savedAt?: string;
  revision?: string;
  state?: AppState;
};

const emptyConfig: CloudSyncConfig = {
  enabled: false,
  endpoint: ""
};

export function loadCloudConfig(): CloudSyncConfig {
  if (typeof localStorage === "undefined") return emptyConfig;
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) return emptyConfig;
  try {
    const parsed = JSON.parse(raw) as Partial<CloudSyncConfig>;
    return {
      enabled: Boolean(parsed.enabled && parsed.endpoint),
      endpoint: parsed.endpoint ?? "",
      token: parsed.token,
      lastRevision: parsed.lastRevision,
      lastSyncedAt: parsed.lastSyncedAt
    };
  } catch {
    return emptyConfig;
  }
}

export function saveCloudConfig(config: CloudSyncConfig): CloudSyncConfig {
  const next = {
    ...config,
    endpoint: config.endpoint.trim(),
    enabled: Boolean(config.enabled && config.endpoint.trim())
  };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
  return next;
}

export function clearCloudConfig(): CloudSyncConfig {
  localStorage.removeItem(CONFIG_KEY);
  return emptyConfig;
}

export async function pullCloudState(config: CloudSyncConfig): Promise<{ state?: AppState; revision?: string; savedAt?: string }> {
  if (!config.endpoint) throw new Error("Molnendpoint saknas.");
  const response = await fetch(config.endpoint, {
    method: "GET",
    headers: buildHeaders(config)
  });
  if (response.status === 404 || response.status === 204) return {};
  if (!response.ok) throw new Error(`Molnsync kunde inte hamta data (${response.status}).`);
  return parseCloudPayload(await response.json());
}

export async function pushCloudState(config: CloudSyncConfig, state: AppState): Promise<{ revision?: string; savedAt: string }> {
  if (!config.endpoint) throw new Error("Molnendpoint saknas.");
  const savedAt = new Date().toISOString();
  const response = await fetch(config.endpoint, {
    method: "PUT",
    headers: { ...buildHeaders(config), "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "cost-control-cloud-state",
      version: state.version,
      savedAt,
      baseRevision: config.lastRevision,
      state
    })
  });
  if (response.status === 409) throw new Error("Molndatan har andrats pa en annan enhet. Hamta molndata innan du sparar igen.");
  if (!response.ok) throw new Error(`Molnsync kunde inte spara (${response.status}).`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return { savedAt };
  const payload = await response.json();
  const parsed = parseCloudPayload(payload);
  return { revision: parsed.revision, savedAt: parsed.savedAt ?? savedAt };
}

function buildHeaders(config: CloudSyncConfig): HeadersInit {
  return config.token ? { Authorization: `Bearer ${config.token}` } : {};
}

function parseCloudPayload(value: unknown): { state?: AppState; revision?: string; savedAt?: string } {
  const payload = value as CloudPayload | AppState;
  const state = "state" in payload ? payload.state : payload;
  if (state !== undefined && !isAppStateLike(state)) throw new Error("Molndatan ar inte en giltig Mina Utgifter-state.");
  return {
    state: state ? enrichStateWithBaselineData({ ...createInitialState(), ...state }) : undefined,
    revision: "revision" in payload ? payload.revision : undefined,
    savedAt: "savedAt" in payload ? payload.savedAt : undefined
  };
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
      Array.isArray(state.costPeriods) &&
      Array.isArray(state.transactions)
  );
}
