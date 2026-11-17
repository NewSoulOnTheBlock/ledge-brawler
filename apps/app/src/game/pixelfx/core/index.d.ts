// Types for the part of pixelfx (https://github.com/patch-gg/pixelfx, MIT) that the game calls.
export interface FxFrame { w: number; h: number; ox: number; oy: number; color: Uint32Array; light: Uint32Array }
export interface FxModule { meta: { size: [number, number]; origin: [number, number]; duration: number; loop: boolean } }
export interface FxInstance { update(dt: number): void; draw(frame: FxFrame, layer?: "back" | "front"): void; stop(): void; done(): boolean }
/** Colour ramps, dark to bright, by name. */
export const PAL: Record<string, string[]>;
export function createFrame(w: number, h: number, ox?: number, oy?: number): FxFrame;
export function clearFrame(frame: FxFrame): FxFrame;
export function createFx(mod: FxModule, options?: Record<string, unknown>): FxInstance;
export function composite(frame: FxFrame, out: Uint8ClampedArray, bg?: null | number, lightK?: number): Uint8ClampedArray;
