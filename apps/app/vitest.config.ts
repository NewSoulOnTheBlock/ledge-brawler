import { project } from "vibestack/testing/vitest";
import { solanaStubs } from "./vite.config.ts";

export default project({ root: import.meta.dirname, plugins: [solanaStubs] });
