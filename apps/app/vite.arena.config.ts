// The arena server's build (arena/README.md): src/arena/main.vibe and what it imports, the game's own sim.ts among
// them, built for Node as the game is built for the browser, with the same plugins, to build/arena/main.js. Its
// packages are installed beside it (arena/Dockerfile).
import vibelang from "vibelang-vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vibelang()],
  publicDir: false,
  build: { ssr: "src/arena/main.vibe", outDir: "build/arena", target: "node26", emptyOutDir: true, rollupOptions: { output: { entryFileNames: "main.js" } } },
});
