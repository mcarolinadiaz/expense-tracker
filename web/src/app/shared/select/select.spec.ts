import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Select, SelectOption } from './select';

@Component({
  imports: [ReactiveFormsModule, Select],
  template: `
    <label for="category">Category</label>
    <app-select inputId="category" [options]="options" [formControl]="control" />
  `,
})
class Host {
  readonly options: SelectOption<number>[] = [
    { value: 1, label: 'Comida' },
    { value: 2, label: 'Transporte' },
  ];
  readonly control = new FormControl<number | null>(1);
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

  it('should update the form control and close when an option is chosen', async () => {
    await open();

    options()[1].click();
    await fixture.whenStable();

    expect(fixture.componentInstance.control.value).toBe(2);
    expect(trigger().textContent?.trim()).toBe('Transporte');
    expect(options()).toHaveLength(0);
    expect(fixture.componentInstance.control.touched).toBe(true);
  });

  it('should close with Escape without changing the value', async () => {
    await open();

    options()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    expect(options()).toHaveLength(0);
    expect(fixture.componentInstance.control.value).toBe(1);
  });

  it('should show values set from the form control', async () => {
    fixture.componentInstance.control.setValue(2);
    await fixture.whenStable();

    expect(trigger().textContent?.trim()).toBe('Transporte');
  });

  it('should not open while the form control is disabled', async () => {
    fixture.componentInstance.control.disable();
    await fixture.whenStable();

    expect(trigger().disabled).toBe(true);
  });
});
