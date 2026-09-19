import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// React Testing Library does not auto-clean when `globals` is on for some
// runners; unmounting explicitly keeps one test's DOM out of the next one.
afterEach(() => {
  cleanup();
});
