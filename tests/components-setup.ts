import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmount rendered trees between tests (no globals, so RTL cannot do it itself)
afterEach(() => cleanup());
