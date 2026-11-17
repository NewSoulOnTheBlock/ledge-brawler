// SPEC.md, "Conformance": spec/app/saga.md against the shell of src/saga.vibe, observed as what its store holds.
import { Effect, Layer } from "effect";
import * as KeyValueStore from "effect/persistence/KeyValueStore";
import { effectDriver } from "vibestack/testing";
import type { Options } from "../../gen/app__saga.conformance.ts";
import type { Event, Saga } from "../../gen/app__saga.ts";
import { Campaign, load, stored } from "../../src/saga.vibe";

const refused = () => Effect.succeed("refused" as const);
/** What the shell did with `input`: a refusal by the rules or the decoder is "refused", any other failure stays one. */
const receive = (_key: string, input: unknown) =>
  Campaign.use((c) => c.receive(input)).pipe(Effect.as("accepted" as const), Effect.catchTags({ Rejected: refused, NotAnEvent: refused }));

export const driver = effectDriver<Event, Saga, Campaign | KeyValueStore.KeyValueStore, never>(Layer.provideMerge(stored, KeyValueStore.layerMemory), { dispatch: receive, receive, observe: () => load() });

/** One saga, so one key. */
export const options: Options = { keys: ["saga"] };
