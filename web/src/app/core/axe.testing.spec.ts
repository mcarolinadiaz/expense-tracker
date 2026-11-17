import { expectNoAxeViolations } from './axe.testing';

describe('expectNoAxeViolations', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should pass for accessible markup', async () => {
    container.innerHTML = '<button type="button" aria-label="Close">×</button>';

    await expectNoAxeViolations(container);
  });

  it('should fail and name the rule for an icon button without a name', async () => {
    container.innerHTML = '<button type="button"><svg aria-hidden="true"></svg></button>';

    await expect(expectNoAxeViolations(container)).rejects.toThrow('button-name');
  });

  it('should fail for a field without a label', async () => {
    container.innerHTML = '<input type="text" />';

    await expect(expectNoAxeViolations(container)).rejects.toThrow('label');
  });
});
