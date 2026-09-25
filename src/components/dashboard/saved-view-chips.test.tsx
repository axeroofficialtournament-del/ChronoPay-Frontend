import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SavedViewChips, SavedView } from "./saved-view-chips";

const h = vi.hoisted(() => ({
  search: new URLSearchParams(),
  router: { replace: vi.fn(), push: vi.fn() },
  pathname: "/dashboard",
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => h.search,
  useRouter: () => h.router,
  usePathname: () => h.pathname,
}));

function setSearch(queryString: string) {
  h.search = new URLSearchParams(queryString);
}

function createStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      data.delete(key);
    }),
  };
}

const STORAGE_KEY = "chronopay-saved-views";

function seedViews(views: SavedView[]): Record<string, string> {
  return { [STORAGE_KEY]: JSON.stringify(views) };
}

function getStoredViews(storage: ReturnType<typeof createStorage>): SavedView[] {
  const setCall = storage.setItem.mock.calls.find(([key]) => key === STORAGE_KEY);
  const raw = setCall ? (setCall[1] as string) : storage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as SavedView[]) : [];
}

describe("SavedViewChips", () => {
  beforeEach(() => {
    setSearch("");
    h.router.replace.mockClear();
  });

  it("shows an empty state with a save affordance when no views exist", () => {
    render(<SavedViewChips storage={createStorage()} />);

    expect(
      screen.getByText("No saved views yet. Configure the grid, then save it for later.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save current view" })).toBeInTheDocument();
  });

  it("renders a skeleton placeholder until persisted views are loaded", async () => {
    const { container } = render(<SavedViewChips storage={createStorage()} />);
    await waitFor(() =>
      expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument()
    );
    expect(screen.getByText(/No saved views yet/)).toBeInTheDocument();
  });

  it("saves the current view to storage", async () => {
    setSearch("sort=price&density=compact");
    const storage = createStorage();
    const user = userEvent.setup();
    render(<SavedViewChips storage={storage} />);

    await user.click(screen.getByRole("button", { name: "Save current view" }));
    await user.type(screen.getByLabelText("Saved view name"), "Cheap soonest");
    await user.click(screen.getByRole("button", { name: "Save view" }));

    expect(screen.getByRole("button", { name: "Cheap soonest" })).toBeInTheDocument();
    const stored = getStoredViews(storage);
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe("Cheap soonest");
    expect(stored[0].params).toBe("sort=price&density=compact");
  });

  it("announces the saved view to assistive tech", async () => {
    setSearch("sort=price");
    const user = userEvent.setup();
    render(<SavedViewChips storage={createStorage()} />);

    await user.click(screen.getByRole("button", { name: "Save current view" }));
    await user.type(screen.getByLabelText("Saved view name"), "On sale");
    await user.click(screen.getByRole("button", { name: "Save view" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Saved view On sale")
    );
  });

  it("cancels the save flow without persisting", async () => {
    const storage = createStorage();
    const user = userEvent.setup();
    render(<SavedViewChips storage={storage} />);

    await user.click(screen.getByRole("button", { name: "Save current view" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByLabelText("Saved view name")).not.toBeInTheDocument();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("does not save unnamed views", async () => {
    const storage = createStorage();
    const user = userEvent.setup();
    render(<SavedViewChips storage={storage} />);

    await user.click(screen.getByRole("button", { name: "Save current view" }));
    await user.click(screen.getByRole("button", { name: "Save view" }));

    expect(screen.getByLabelText("Saved view name")).toBeInTheDocument();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("applies a saved view by writing its params to the URL", async () => {
    const storage = createStorage(
      seedViews([{ id: "v1", name: "Quick wins", params: "sort=price" }])
    );
    const user = userEvent.setup();
    render(<SavedViewChips storage={storage} />);

    await user.click(screen.getByRole("button", { name: "Quick wins" }));

    expect(h.router.replace).toHaveBeenCalledWith("/dashboard?sort=price");
  });

  it("marks the currently-applied view as active", async () => {
    setSearch("sort=price");
    const storage = createStorage(
      seedViews([{ id: "v1", name: "Quick wins", params: "sort=price" }])
    );
    render(<SavedViewChips storage={storage} />);

    expect(screen.getByRole("button", { name: "Quick wins" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("does not mark views whose params differ", async () => {
    setSearch("sort=soonest");
    const storage = createStorage(
      seedViews([{ id: "v1", name: "Quick wins", params: "sort=price" }])
    );
    render(<SavedViewChips storage={storage} />);

    expect(screen.getByRole("button", { name: "Quick wins" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("considers params equivalent regardless of key order", async () => {
    setSearch("density=compact&sort=price");
    const storage = createStorage(
      seedViews([{ id: "v1", name: "Quick wins", params: "sort=price&density=compact" }])
    );
    render(<SavedViewChips storage={storage} />);

    expect(screen.getByRole("button", { name: "Quick wins" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("closes the menu by pressing the trigger again", async () => {
    const storage = createStorage(
      seedViews([{ id: "v1", name: "Quick wins", params: "sort=price" }])
    );
    const user = userEvent.setup();
    render(<SavedViewChips storage={storage} />);

    const more = screen.getByRole("button", {
      name: "More actions for saved view Quick wins",
    });
    await user.click(more);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(more);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(more).toHaveAttribute("aria-expanded", "false");
  });

  it("commits a rename with Enter keyed directly on the menu", async () => {
    const storage = createStorage(
      seedViews([{ id: "v1", name: "Old name", params: "sort=price" }])
    );
    const user = userEvent.setup();
    render(<SavedViewChips storage={storage} />);

    await user.click(screen.getByRole("button", { name: "More actions for saved view Old name" }));
    await user.click(screen.getByRole("menuitem", { name: "Rename" }));
    await user.clear(screen.getByLabelText("Rename saved view Old name"));
    await user.type(screen.getByLabelText("Rename saved view Old name"), "Menu enter");

    fireEvent.keyDown(screen.getByRole("menu"), { key: "Enter" });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Menu enter" })).toBeInTheDocument()
    );
    expect(getStoredViews(storage)[0].name).toBe("Menu enter");
  });

  it("only renames the targeted view when others exist", async () => {
    const storage = createStorage(
      seedViews([
        { id: "v1", name: "First", params: "sort=price" },
        { id: "v2", name: "Second", params: "sort=soonest" },
      ])
    );
    const user = userEvent.setup();
    render(<SavedViewChips storage={storage} />);

    await user.click(screen.getByRole("button", { name: "More actions for saved view First" }));
    await user.click(screen.getByRole("menuitem", { name: "Rename" }));
    await user.clear(screen.getByLabelText("Rename saved view First"));
    await user.type(screen.getByLabelText("Rename saved view First"), "Renamed{Enter}");

    const stored = getStoredViews(storage);
    expect(stored.map((v) => v.name)).toEqual(["Renamed", "Second"]);
  });

  it("keeps sibling views when deleting one", async () => {
    const storage = createStorage(
      seedViews([
        { id: "v1", name: "First", params: "sort=price" },
        { id: "v2", name: "Second", params: "sort=soonest" },
      ])
    );
    const user = userEvent.setup();
    render(<SavedViewChips storage={storage} />);

    await user.click(screen.getByRole("button", { name: "More actions for saved view First" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    await user.click(screen.getByRole("menuitem", { name: "Confirm delete?" }));

    expect(screen.queryByRole("button", { name: "First" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Second" })).toBeInTheDocument();
    expect(getStoredViews(storage).map((v) => v.id)).toEqual(["v2"]);
  });

  it("renames a view via the menu", async () => {
    const storage = createStorage(
      seedViews([{ id: "v1", name: "Quick wins", params: "sort=price" }])
    );
    const user = userEvent.setup();
    render(<SavedViewChips storage={storage} />);

    await user.click(screen.getByRole("button", { name: "More actions for saved view Quick wins" }));
    await user.click(screen.getByRole("menuitem", { name: "Rename" }));
    const input = screen.getByLabelText("Rename saved view Quick wins");
    await user.clear(input);
    await user.type(input, "Bargain bin{Enter}");

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Bargain bin" })).toBeInTheDocument()
    );
    expect(getStoredViews(storage)[0].name).toBe("Bargain bin");
  });

  it("keeps the renamed value when changes are discarded", async () => {
    const storage = createStorage(
      seedViews([{ id: "v1", name: "Quick wins", params: "sort=price" }])
    );
    const user = userEvent.setup();
    render(<SavedViewChips storage={storage} />);

    await user.click(screen.getByRole("button", { name: "More actions for saved view Quick wins" }));
    await user.click(screen.getByRole("menuitem", { name: "Rename" }));
    await user.type(screen.getByLabelText("Rename saved view Quick wins"), "ignored name");
    await user.keyboard("{Escape}");

    expect(screen.getByRole("button", { name: "Quick wins" })).toBeInTheDocument();
    expect(getStoredViews(storage)[0].name).toBe("Quick wins");
  });

  it("deletes a view only after confirming the destructive step", async () => {
    const storage = createStorage(
      seedViews([{ id: "v1", name: "Old setup", params: "sort=price" }])
    );
    const user = userEvent.setup();
    render(<SavedViewChips storage={storage} />);

    await user.click(screen.getByRole("button", { name: "More actions for saved view Old setup" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(screen.getByText("Confirm delete?")).toBeInTheDocument();
    expect(getStoredViews(storage)).toHaveLength(1);

    await user.click(screen.getByRole("menuitem", { name: "Confirm delete?" }));

    expect(screen.queryByRole("button", { name: "Old setup" })).not.toBeInTheDocument();
    expect(getStoredViews(storage)).toHaveLength(0);
  });

  it("Escape dismisses the open menu mid-delete flow", async () => {
    const storage = createStorage(
      seedViews([{ id: "v1", name: "Old setup", params: "sort=price" }])
    );
    const user = userEvent.setup();
    render(<SavedViewChips storage={storage} />);

    const more = screen.getByRole("button", {
      name: "More actions for saved view Old setup",
    });
    await user.click(more);
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByText("Confirm delete?")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Old setup" })).toBeInTheDocument();
    expect(more).toHaveAttribute("aria-expanded", "false");
  });

  it("ignores corrupt storage gracefully", () => {
    const storage = createStorage({ [STORAGE_KEY]: "not-json{{{" });
    render(<SavedViewChips storage={storage} />);

    expect(screen.getByText(/No saved views yet/)).toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("ignores persisted values that are not arrays", () => {
    const storage = createStorage({ [STORAGE_KEY]: JSON.stringify({ not: "a list" }) });
    render(<SavedViewChips storage={storage} />);

    expect(screen.getByText(/No saved views yet/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /More actions/ })).not.toBeInTheDocument();
  });

  it("replaces an existing view whose params duplicate the current ones", async () => {
    setSearch("sort=price");
    const storage = createStorage(
      seedViews([{ id: "v1", name: "Same params", params: "sort=price" }])
    );
    const user = userEvent.setup();
    render(<SavedViewChips storage={storage} />);

    await user.click(screen.getByRole("button", { name: "Save current view" }));
    await user.type(screen.getByLabelText("Saved view name"), "New name");
    await user.click(screen.getByRole("button", { name: "Save view" }));

    const stored = getStoredViews(storage);
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe("New name");
  });

  it("truncates saved view names to the maximum length", async () => {
    const storage = createStorage();
    const user = userEvent.setup();
    render(<SavedViewChips storage={storage} />);

    await user.click(screen.getByRole("button", { name: "Save current view" }));
    await user.type(screen.getByLabelText("Saved view name"), "a".repeat(50));
    await user.click(screen.getByRole("button", { name: "Save view" }));

    expect(getStoredViews(storage)[0].name).toHaveLength(40);
  });

  it("survives a failing storage backend", async () => {
    const throwing = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new Error("quota exceeded");
      }),
      removeItem: vi.fn(),
    };
    const user = userEvent.setup();
    render(<SavedViewChips storage={throwing} />);

    await user.click(screen.getByRole("button", { name: "Save current view" }));
    await user.type(screen.getByLabelText("Saved view name"), "Read only");
    await user.click(screen.getByRole("button", { name: "Save view" }));

    expect(screen.getByRole("button", { name: "Read only" })).toBeInTheDocument();
  });

  it("shows the saved view count", () => {
    const storage = createStorage(
      seedViews([
        { id: "v1", name: "A", params: "sort=price" },
        { id: "v2", name: "B", params: "sort=soonest" },
      ])
    );
    render(<SavedViewChips storage={storage} />);

    expect(screen.getByLabelText("2 saved views").textContent).toContain("(2)");
    const section = screen.getByRole("region", { name: "Saved views" });
    expect(within(section).getAllByRole("button", { name: /More actions/ })).toHaveLength(2);
  });

  it("references the current params in the rename input when reopening the menu", async () => {
    const storage = createStorage(
      seedViews([{ id: "v1", name: "Quick wins", params: "sort=price" }])
    );
    const user = userEvent.setup();
    render(<SavedViewChips storage={storage} />);

    await user.click(screen.getByRole("button", { name: "More actions for saved view Quick wins" }));
    await user.click(screen.getByRole("menuitem", { name: "Rename" }));

    expect(screen.getByLabelText("Rename saved view Quick wins")).toHaveValue("Quick wins");
  });

  it("uses window.localStorage when no storage prop is provided", async () => {
    localStorage.clear();
    const user = userEvent.setup();
    render(<SavedViewChips />);

    expect(screen.getByText(/No saved views yet/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save current view" }));
    await user.type(screen.getByLabelText("Saved view name"), "Browser storage");
    await user.click(screen.getByRole("button", { name: "Save view" }));

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as SavedView[];
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe("Browser storage");
  });

  it("falls back to a generated view id when crypto is unavailable", async () => {
    const fallback = vi.stubGlobal("crypto", undefined);
    const user = userEvent.setup();
    render(<SavedViewChips storage={createStorage()} />);

    await user.click(screen.getByRole("button", { name: "Save current view" }));
    await user.type(screen.getByLabelText("Saved view name"), "Offline");
    await user.click(screen.getByRole("button", { name: "Save view" }));

    expect(screen.getByRole("button", { name: "Offline" })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("filters invalid entries out of persisted view lists", () => {
    const storage = createStorage({
      [STORAGE_KEY]: JSON.stringify([
        null,
        42,
        { id: "v1", name: "", params: "sort=price" },
        { id: "v2", name: "Valid", params: "sort=soonest" },
        "junk",
      ]),
    });
    render(<SavedViewChips storage={storage} />);

    expect(screen.getByRole("button", { name: "Valid" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /More actions/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /More actions/ })).toHaveLength(1);
  });

  it("applies a view that has no params to the bare pathname", async () => {
    const storage = createStorage(
      seedViews([{ id: "v1", name: "Clean slate", params: "" }])
    );
    const user = userEvent.setup();
    render(<SavedViewChips storage={storage} />);

    await user.click(screen.getByRole("button", { name: "Clean slate" }));

    expect(h.router.replace).toHaveBeenCalledWith("/dashboard");
  });

  it("ignores renaming to an empty name", async () => {
    const storage = createStorage(
      seedViews([{ id: "v1", name: "Keep me", params: "sort=price" }])
    );
    const user = userEvent.setup();
    render(<SavedViewChips storage={storage} />);

    await user.click(screen.getByRole("button", { name: "More actions for saved view Keep me" }));
    await user.click(screen.getByRole("menuitem", { name: "Rename" }));
    await user.clear(screen.getByLabelText("Rename saved view Keep me"));
    await user.keyboard("{Enter}");

    expect(getStoredViews(storage)[0].name).toBe("Keep me");
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Keep me" })).toBeInTheDocument();
  });

  it("commits a rename with Enter from the menu context", async () => {
    const storage = createStorage(
      seedViews([{ id: "v1", name: "Old name", params: "sort=price" }])
    );
    const user = userEvent.setup();
    render(<SavedViewChips storage={storage} />);

    await user.click(screen.getByRole("button", { name: "More actions for saved view Old name" }));
    await user.click(screen.getByRole("menuitem", { name: "Rename" }));
    await user.clear(screen.getByLabelText("Rename saved view Old name"));
    await user.type(screen.getByLabelText("Rename saved view Old name"), "Fresh name{Enter}");

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Fresh name" })).toBeInTheDocument()
    );
    expect(getStoredViews(storage)[0].name).toBe("Fresh name");
  });
});