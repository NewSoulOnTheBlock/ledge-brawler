// The contracts' tests (test/**/*.test.ts), on Hardhat's simulated network: the one Vitest configuration of a package.
import { project } from "vibestack/testing/vitest";

export default project({ root: import.meta.dirname });
