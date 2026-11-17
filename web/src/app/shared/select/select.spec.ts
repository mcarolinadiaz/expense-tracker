import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { disabled, form, FormField } from '@angular/forms/signals';
import { AXE_TEST_TIMEOUT_MS, expectNoAxeViolations } from '../../core/axe.testing';
import { Select, SelectOption } from './select';

@Component({
  imports: [FormField, Select],
  template: `
    <label for="category">Category</label>
    <app-select inputId="category" [options]="options" [formField]="expense.categoryId" />
  `,
})
class Host {
  readonly options: SelectOption<number>[] = [
    { value: 1, label: 'Comida' },
    { value: 2, label: 'Transporte' },
  ];
  readonly locked = signal(false);
  readonly model = signal({ categoryId: 1 });
  readonly expense = form(this.model, (path) => {
    disabled(path.categoryId, () => this.locked());
  });
}

describe('Select', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  });

  function trigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('#category');
  }

  function options(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
  }

  async function open(): Promise<void> {
    trigger().click();
    await fixture.whenStable();
  }

  it('should show the label of the selected value, named by its label element', () => {
    expect(trigger().textContent?.trim()).toBe('Comida');
    expect(fixture.nativeElement.querySelector('label').control).toBe(trigger());
  });

  it('should mark the selected option when it opens', async () => {
    await open();

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(options().map((option) => option.getAttribute('aria-selected'))).toEqual([
      'true',
      'false',
    ]);
  });

  it(
    'should have no accessibility problems when closed and open',
    async () => {
      await expectNoAxeViolations();

      await open();

      await expectNoAxeViolations();
    },
    AXE_TEST_TIMEOUT_MS,
  );

  it('should update the form field and close when an option is chosen', async () => {
    await open();

    options()[1].click();
    await fixture.whenStable();

    expect(fixture.componentInstance.model().categoryId).toBe(2);
    expect(trigger().textContent?.trim()).toBe('Transporte');
    expect(options()).toHaveLength(0);
  });

  it('should close with Escape without changing the value', async () => {
    await open();

    options()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    expect(options()).toHaveLength(0);
    expect(fixture.componentInstance.model().categoryId).toBe(1);
  });

  it('should show values set from the model', async () => {
    fixture.componentInstance.model.set({ categoryId: 2 });
    await fixture.whenStable();

    expect(trigger().textContent?.trim()).toBe('Transporte');
  });

  it('should not open while the field is disabled', async () => {
    fixture.componentInstance.locked.set(true);
    await fixture.whenStable();

    expect(trigger().disabled).toBe(true);
  });
});
