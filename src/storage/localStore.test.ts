import { describe, expect, it } from "vitest";
import { clearState, loadState } from "./localStore";

const storageKey = "cost-control.state.v1";

describe("localStore", () => {
  it("clears to an empty startup state", () => {
    const next = clearState();

    expect(next.contexts).toHaveLength(0);
    expect(next.activeContextId).toBe("");
    expect(JSON.parse(localStorage.getItem(storageKey) ?? "{}")).toMatchObject({
      activeContextId: "",
      contexts: [],
      onboardingComplete: false
    });
    expect(loadState().contexts).toHaveLength(0);
  });
});
