import axe from 'axe-core';

const JSDOM_UNSUPPORTED_RULES = ['color-contrast'];
const PAGE_RULES = ['region'];
const CHECKED_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/**
 * Time limit for a test that runs axe, as in `it('…', async () => {…}, AXE_TEST_TIMEOUT_MS)`.
 * axe is slower than the default 5 seconds when many test files run at once.
 */
export const AXE_TEST_TIMEOUT_MS = 20_000;

export interface AxeCheckOptions {
  /** True when the context is a whole page, such as the app shell, so page-level rules apply. */
  page?: boolean;
}

/**
 * For tests: fails if axe finds accessibility problems in the element, listing each rule, the
 * elements that break it and how to fix them. By default it checks the whole document body,
 * which also covers overlays such as dialogs and dropdowns, rendered outside the component.
 */
export async function expectNoAxeViolations(
  context: Element = document.body,
  { page = false }: AxeCheckOptions = {},
): Promise<void> {
  const disabled = page ? JSDOM_UNSUPPORTED_RULES : [...JSDOM_UNSUPPORTED_RULES, ...PAGE_RULES];
  const { violations } = await axe.run(context, {
    runOnly: { type: 'tag', values: CHECKED_TAGS },
    rules: Object.fromEntries(disabled.map((rule) => [rule, { enabled: false }])),
  });

  const problems = violations.flatMap((violation) =>
    violation.nodes.map(
      (node) =>
        `${violation.id} on ${node.target.join(' ')}: ${node.failureSummary ?? violation.help}`,
    ),
  );

  if (problems.length > 0) {
    throw new Error(`Accessibility problems found by axe:\n- ${problems.join('\n- ')}`);
  }
}
