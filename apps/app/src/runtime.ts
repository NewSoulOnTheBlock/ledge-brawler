// What the page runs on: the match in memory, and the saga in a store (saga.vibe).
import { Layer, ManagedRuntime } from "effect";
import type * as KeyValueStore from "effect/persistence/KeyValueStore";
import { machine } from "../gen/app.effect.vibe";
import { stored } from "./saga.vibe";

/** A runtime with a new match and the saga `store` holds. */
export const runtimeOn = (store: Layer.Layer<KeyValueStore.KeyValueStore>) => ManagedRuntime.make(Layer.mergeAll(machine(), Layer.provide(stored, store)));
export type Runtime = ReturnType<typeof runtimeOn>;
