// .claude/skills/shell/SKILL.md, "The React interface": the match `Machine` holds, and the events `enabled` allows, for a component and for the arena.
import { Effect, Exit, Stream } from "effect";
import { useMemo, useSyncExternalStore } from "react";
import { Machine } from "../gen/app.effect.vibe";
import { type Event, type Match, enabled } from "../gen/app.ts";
import type { Rules } from "./game/sim.ts";
import type { Runtime } from "./runtime.ts";

/** The match for the arena, which reads and reports within one frame: the machine in memory answers at once. */
export function rulesOf(runtime: Runtime): Rules {
  return {
    get: () => runtime.runSync(Machine.use((m) => m.get())),
    send: (event) => {
      const exit = runtime.runSyncExit(Machine.use((m) => m.send(event)));
      return Exit.isSuccess(exit) ? exit.value : undefined;
    },
  };
}

export function useMatch(runtime: Runtime) {
  const store = useMemo(() => {
    let match: Match | undefined;
    return {
      get: () => match,
      subscribe: (notify: () => void) => {
        const fiber = runtime.runFork(Machine.use((m) => Stream.runForEach(m.changes, (next) => Effect.sync(() => { match = next; notify(); }))));
        return () => fiber.interruptUnsafe();
      },
    };
  }, [runtime]);
  const match = useSyncExternalStore(store.subscribe, store.get);
  const rules = useMemo(() => rulesOf(runtime), [runtime]);
  return {
    /** Undefined until the machine has been read. */
    match,
    rules,
    can: (event: Event) => match !== undefined && enabled(match, event),
    /** False when the rules refuse the event. */
    send: (event: Event) => rules.send(event) !== undefined,
  };
}
