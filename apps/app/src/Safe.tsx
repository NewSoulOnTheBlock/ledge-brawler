// What stands in for the game if the game itself breaks: the page says so and offers the way back, where otherwise
// there would be nothing at all on it.
import { Component, type ReactNode } from "react";

export class Safe extends Component<{ children: ReactNode }, { broken: boolean }> {
  state = { broken: false };
  static getDerivedStateFromError() { return { broken: true }; }
  componentDidCatch(error: unknown) { console.error(error); }
  render() {
    if (!this.state.broken) return this.props.children;
    return (
      <main className="dark grid h-dvh place-items-center bg-[#05080a] px-6 text-center font-mono text-foreground">
        <section aria-labelledby="brokenTitle" className="grid max-w-[460px] justify-items-center gap-4">
          <h1 id="brokenTitle" className="font-sans text-3xl font-bold tracking-[0.14em] uppercase">Something broke</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">The game ran into a problem it could not get past. Nothing you have earned is lost: your progress is kept in this browser.</p>
          <button type="button" autoFocus className="border-2 border-foreground px-5 py-2 font-sans text-sm font-bold tracking-[0.14em] uppercase hover:bg-foreground hover:text-background" onClick={() => location.reload()}>Back to the menu</button>
        </section>
      </main>
    );
  }
}
