import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import EntitlementsPanel from "../components/admin/EntitlementsPanel";
import { ENFORCEABLE_FEATURES } from "../types/admin";

// Mock the admin hooks so we drive list/setOne deterministically. vi.hoisted holders
// avoid the TDZ trap of referencing test-scope vars inside the hoisted vi.mock factory.
const h = vi.hoisted(() => ({
  listState: null as unknown as { data: unknown; loading: boolean; error: string | null; execute: ReturnType<typeof vi.fn> },
  setState: null as unknown as { error: string | null; execute: ReturnType<typeof vi.fn> },
}));

vi.mock("../hooks/useAdmin", () => ({
  useAdminEntitlements: () => h.listState,
  useAdminSetEntitlement: () => h.setState,
}));

const f0 = ENFORCEABLE_FEATURES[0];
const f1 = ENFORCEABLE_FEATURES[1];

function aria(label: string, user: string, state: "allowed" | "revoked") {
  return `${label} for ${user}: ${state}`;
}

beforeEach(() => {
  h.listState = {
    data: {
      count: 1,
      users: [{ userId: "u1", plan: "pro", status: "active", effectivePlan: "pro", overrides: {} }],
    },
    loading: false,
    error: null,
    execute: vi.fn(),
  };
  h.setState = { error: null, execute: vi.fn() };
});

describe("EntitlementsPanel toggle (Q6 arm-C P1 fixes)", () => {
  it("inverts the granted flag, merges the server override map, and does NOT refetch", async () => {
    // server confirms the revoke by returning the user's authoritative override map
    h.setState.execute.mockResolvedValue({ userId: "u1", overrides: { [f0.key]: false } });

    render(<EntitlementsPanel />);

    // f0 starts allowed (overrides empty) -- click it to revoke
    const btn = screen.getByLabelText(aria(f0.label, "u1", "allowed"));
    expect(btn).toHaveTextContent("on");
    await act(async () => {
      fireEvent.click(btn);
    });

    // correct invert: allowed -> revoke means granted:false
    expect(h.setState.execute).toHaveBeenCalledWith({ userId: "u1", feature: f0.key, granted: false });

    // the cell flips to revoked from the merged server response...
    await waitFor(() => {
      expect(screen.getByLabelText(aria(f0.label, "u1", "revoked"))).toHaveTextContent("off");
    });
    // ...WITHOUT a destructive full refetch (the P1: list.execute would null the grid)
    expect(h.listState.execute).not.toHaveBeenCalled();
  });

  it("disables every toggle while one mutation is in flight (no concurrent abort/lost-update)", async () => {
    // hold the mutation open so we can observe the in-flight disabled state
    let resolveSet!: (v: unknown) => void;
    h.setState.execute.mockImplementation(() => new Promise((r) => { resolveSet = r; }));

    render(<EntitlementsPanel />);

    const btn0 = screen.getByLabelText(aria(f0.label, "u1", "allowed"));
    const btn1 = screen.getByLabelText(aria(f1.label, "u1", "allowed"));
    expect(btn1).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(btn0);
    });

    // while f0's write is in flight, a different cell's toggle is disabled -- a second
    // click cannot fire and abort the first (the shared AbortController lost-update P1)
    expect(btn1).toBeDisabled();
    expect(btn0).toHaveTextContent("...");

    // resolve the mutation -> all toggles re-enable
    await act(async () => {
      resolveSet({ userId: "u1", overrides: {} });
    });
    await waitFor(() => {
      expect(screen.getByLabelText(aria(f1.label, "u1", "allowed"))).not.toBeDisabled();
    });
  });

  it("surfaces a mutation error and leaves the grid intact (no refetch on failure)", async () => {
    // a failed toggle returns null (useApiCall swallows the throw into setOne.error)
    h.setState = { error: "feature is not an enforceable entitlement key", execute: vi.fn().mockResolvedValue(null) };

    render(<EntitlementsPanel />);

    // the error is shown, the user row is still rendered, and no refetch was triggered.
    // Match the distinctive error phrasing -- the panel intro also contains "enforceable".
    expect(screen.getByText(/not an enforceable entitlement key/)).toBeInTheDocument();
    expect(screen.getByText("u1")).toBeInTheDocument();
    expect(h.listState.execute).not.toHaveBeenCalled();
  });
});
