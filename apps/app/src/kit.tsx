// spec/app/saga.md, "Story: Play five campaigns"
// The campaign's interface kit: bars, frames, buttons and icons from the SHADOW Series pixel UI packs
// (art/packs/README.md), drawn at whole multiples of their pixels. The arena keeps its ink and paper.
import { cn } from "@repo/ui";
import { type CSSProperties, type ComponentProps, useEffect, useState } from "react";
import { loadCast } from "./game/cast.ts";
import { loadPlaces } from "./game/places.ts";

const urls = import.meta.glob<string>("./game/packs/ui/*.png", { eager: true, query: "?url", import: "default" });
const url = (name: string) => `url(${urls[`./game/packs/ui/${name}.png`]})`;
const pixels: CSSProperties = { imageRendering: "pixelated", backgroundRepeat: "no-repeat" };
/** One cell of a sheet of `cols` by `rows` equal cells, as a background. */
const cell = (sheet: string, index: number, cols: number, rows: number): CSSProperties => ({
  ...pixels, backgroundImage: url(sheet), backgroundSize: `${cols * 100}% ${rows * 100}%`,
  backgroundPosition: `${cols > 1 ? ((index % cols) / (cols - 1)) * 100 : 0}% ${rows > 1 ? (Math.floor(index / cols) / (rows - 1)) * 100 : 0}%`,
});
/** A hollow frame of the kit around whatever it holds: `slice` of its pixels to an edge, each drawn `k` times its size. */
const framed = (name: string, slice: number, k: number): CSSProperties => ({
  border: `${slice * k}px solid transparent`, borderImage: `${url(name)} ${slice} fill / ${slice * k}px stretch`, imageRendering: "pixelated",
});
const focus = "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const teal = "text-[#9fe3e6]";

/** The kit's gauge, filled as far as `value` of `max`. */
export function KitBar({ label, value, max }: { label: string; value: number; max: number }) {
  // The sheet's twelve frames fill from its second to its last.
  const frame = value <= 0 ? 0 : 1 + Math.round((Math.min(value, max) / max) * 10);
  return <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="h-[75px] w-[236px]" style={cell("bar", frame, 12, 1)} />;
}

/** A panel in one of the kit's frames. */
export function KitPanel({ frame = "border", className, style, ...props }: ComponentProps<"section"> & { frame?: "border" | "frame1" | "frame2" | "frame3" | "frame4" }) {
  return <section className={cn("bg-[#10171b]/92 bg-clip-padding", teal, className)} style={{ ...framed(frame, frame === "border" ? 10 : 8, 2), ...style }} {...props} />;
}

/** A button on the kit's blank plate. */
export function KitButton({ className, style, ...props }: ComponentProps<"button">) {
  return <button type="button" className={cn("font-sans text-[11px] font-bold tracking-[0.14em] uppercase hover:brightness-125 active:translate-y-px", teal, focus, className)} style={{ ...framed("button", 8, 2), ...style }} {...props} />;
}

/** The words the kit has plates for, by where they are on its sheet. */
const WORDS = { Continue: 1, Start: 4, Back: 7, Resume: 10, Restart: 13 } as const;
/** A button that is one of the kit's lettered plates. */
export function KitWord({ word, className, ...props }: Omit<ComponentProps<"button">, "children"> & { word: keyof typeof WORDS }) {
  return <button type="button" aria-label={word} className={cn("h-[66px] w-[186px] hover:brightness-125 active:translate-y-px", focus, className)} style={cell("buttons", WORDS[word], 5, 4)} {...props} />;
}

/** The kit's icons, by where they are on its sheet. */
const ICONS = { play: 0, pause: 1, moves: 7, sound: 12, muted: 15 } as const;
/** A button that is one of the kit's icons; `on` shows it lit. */
export function KitIcon({ icon, label, on, className, ...props }: Omit<ComponentProps<"button">, "children"> & { icon: keyof typeof ICONS; label: string; on?: boolean }) {
  return <button type="button" aria-label={label} className={cn("size-[54px] bg-[#10171b]/70 hover:brightness-125", focus, className)} style={cell(on ? "icons2" : "icons", ICONS[icon], 5, 4)} {...props} />;
}

/** The kit's loading mark, turning. */
function Loading() {
  const [frame, setFrame] = useState(0);
  useEffect(() => { const timer = setInterval(() => setFrame((now) => (now + 1) % 10), 90); return () => clearInterval(timer); }, []);
  return <span role="status" aria-label="Loading" className="inline-block size-7 align-middle" style={cell("loading1", frame, 10, 1)} />;
}

/** Shows the loading mark until the campaign's art is in, then nothing. */
export function ArtLoading() {
  const [ready, setReady] = useState(false);
  useEffect(() => { let live = true; void Promise.all([loadCast(), loadPlaces()]).then(() => { if (live) setReady(true); }); return () => { live = false; }; }, []);
  return ready ? null : <Loading />;
}
