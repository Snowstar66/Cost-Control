import { createEmptyState, createInitialState, enrichStateWithBaselineData } from "../domain/seed";
import type { AppState } from "../domain/types";

const STORAGE_KEY = "cost-control.state.v1";

export function loadState(): AppState {
  if (typeof localStorage === "undefined") return enrichStateWithBaselineData(createInitialState());
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return enrichStateWithBaselineData(createInitialState());
  try {
    const parsed = JSON.parse(raw) as AppState;
    return enrichStateWithBaselineData({ ...createInitialState(), ...parsed });
  } catch {
    return enrichStateWithBaselineData(createInitialState());
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState(): AppState {
  const emptyState = createEmptyState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyState));
  return emptyState;
}
