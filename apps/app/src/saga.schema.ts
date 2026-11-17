// What the store holds of a saga (saga.vibe). The rules are not in it: `decodeState` checks them on the way in.
import { Schema } from "effect";

export const Saved = Schema.Struct({
  forbidden: Schema.Int, ember: Schema.Int, exile: Schema.Int, hollow: Schema.Int, architect: Schema.Int,
  crown: Schema.Int, church: Schema.Int, unbound: Schema.Int, stability: Schema.Int, awakening: Schema.Int,
  known: Schema.Array(Schema.Int),
});
