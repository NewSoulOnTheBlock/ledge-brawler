import * as KeyValueStore from "effect/persistence/KeyValueStore";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { App } from "../src/App.tsx";
import { runtimeOn } from "../src/runtime.ts";
import { rulesOf } from "../src/useMatch.ts";

const runtime = runtimeOn(KeyValueStore.layerMemory);
const root = createRoot(document.body.appendChild(document.createElement("div")));
const environment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
const previousActEnvironment = environment.IS_REACT_ACT_ENVIRONMENT;

beforeAll(() => { environment.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(async () => { await act(() => Promise.resolve(root.unmount())); await runtime.dispose(); });
afterAll(() => { environment.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment; });

// spec/app/index.md, "Story: Choose a fighter"; spec/app/index.md, "Story: Learn the moves"
// What only a browser shows: the keyboard reaching the match through the page, and the canvas drawing while it does.
it("Choose a fighter, start the fight, and open the move list", async () => {
  await act(() => Promise.resolve(root.render(<App runtime={runtime} />)));
  const match = () => rulesOf(runtime).get();
  await act(() => userEvent.click(page.getByRole("button", { name: "Survival" })));
  // Survival is played Casual, for nothing, or Pro, for an entry fee (ProEntry.tsx).
  await act(() => userEvent.click(page.getByRole("button", { name: /^Casual/ })));
  await act(() => userEvent.keyboard("{ArrowRight}"));
  // spec/app/index.md, "Only on the select screen can a fighter be focused, and only one of the five"
  await expect.poll(() => [match().screen, match().fighter]).toEqual(["Select", 1]);
  await act(() => userEvent.keyboard("{Enter}"));
  // spec/app/index.md, "A fight starts from the select screen with full health, 40 aura and nothing else"
  await expect.poll(() => [match().screen, match().hp]).toEqual(["Play", 125]);
  await expect.element(page.getByRole("meter", { name: "HP" })).toHaveAttribute("aria-valuenow", "125");
  // spec/app/index.md, "The move list opens only during a fight and pauses it; closing it resumes"
  await act(() => userEvent.keyboard("h"));
  await expect.poll(() => match().paused).toBe(true);
  await act(() => userEvent.click(page.getByRole("button", { name: "Resume" })));
  await expect.poll(() => match().paused).toBe(false);
  // spec/app/index.md, "The next wave starts only when no enemy is left, and brings one more enemy than its number, eight at most"
  await expect.poll(() => match().wave, { timeout: 8000 }).toBe(1);
});
