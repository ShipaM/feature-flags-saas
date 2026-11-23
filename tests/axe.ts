import axe from "axe-core";
import { expect } from "vitest";

// Runs axe-core on a rendered container and fails with a readable list of violations.
// color-contrast is off: jsdom does not compute styles, so it cannot be checked here.
export const expectNoA11yViolations = async (container: Element) => {
  const { violations } = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });

  const report = violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target).join(", ")})`,
  );

  expect(report).toEqual([]);
};
