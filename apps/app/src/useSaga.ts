// .claude/skills/shell/SKILL.md, "The React interface": the saga `Campaign` holds, and the events `enabled` allows, for a component.
import { Effect, Exit, type ManagedRuntime, Stream } from "effect";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { type Event, type Saga, enabled } from "../gen/app__saga.ts";
import { Campaign } from "./saga.vibe";

export function useSaga(runtime: ManagedRuntime.ManagedRuntime<Campaign, unknown>) {
  const store = useMemo(() => {
    let saga: Saga | undefined;
    return {
      get: () => saga,
      subscribe: (notify: () => void) => {
        const fiber = runtime.runFork(Campaign.use((c) => Stream.runForEach(c.changes, (next) => Effect.sync(() => { saga = next; notify(); }))));
        return () => fiber.interruptUnsafe();
      },
    };
  }, [runtime]);
  const saga = useSyncExternalStore(store.subscribe, store.get);
  // One function for the life of the runtime: the arena is built once around it.
  const send = useCallback((event: Event) => runtime.runPromiseExit(Campaign.use((c) => c.receive(event))).then(Exit.isSuccess), [runtime]);
  return {
    /** Undefined until the stored saga has been read. */
    saga,
    can: (event: Event) => saga !== undefined && enabled(saga, event),
    /** Resolves to whether the saga took the event: the rules allowed it and the store kept it. */
    send,
  };
}
