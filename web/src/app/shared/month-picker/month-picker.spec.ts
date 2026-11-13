import { TestBed } from '@angular/core/testing';
import { APP_TEXT } from '../../core/constants/app-text';
import { APP_LOCALE, LocaleFormat } from '../../core/locale-format.service';
import { MonthPicker } from './month-picker';
import { SelectedMonthService } from './selected-month.service';

describe('MonthPicker', () => {
  it('should show the selected month and move between months', async () => {
    TestBed.inject(SelectedMonthService).set('2026-12');
    const fixture = TestBed.createComponent(MonthPicker);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const button = (label: string) =>
      element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

    expect(element.textContent).toContain('December 2026');

    button(APP_TEXT.month.next).click();
    await fixture.whenStable();
    expect(element.textContent).toContain('January 2027');

    button(APP_TEXT.month.previous).click();
    button(APP_TEXT.month.previous).click();
    await fixture.whenStable();
    expect(element.textContent).toContain('November 2026');
  });

  it('should show the month in the new language without being created again', async () => {
    TestBed.inject(SelectedMonthService).set('2026-11');
    const fixture = TestBed.createComponent(MonthPicker);
    await fixture.whenStable();

    TestBed.inject(LocaleFormat).use(APP_LOCALE.esAR);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Noviembre de 2026');
  });
});
