import { TestBed } from '@angular/core/testing';
import { AppDb } from '../../core/db/app-db';
import en from '../../core/i18n/en.json';
import { LanguageService } from '../../core/i18n/language.service';
import { provideTestTranslations } from '../../core/i18n/translations.testing';
import { APP_LOCALE } from '../../core/locale-format.service';
import { MonthPicker } from './month-picker';
import { SelectedMonthService } from './selected-month.service';

describe('MonthPicker', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
  });

  afterEach(async () => {
    await TestBed.inject(AppDb).delete();
  });

  it('should show the selected month and move between months', async () => {
    TestBed.inject(SelectedMonthService).set('2026-12');
    const fixture = TestBed.createComponent(MonthPicker);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const button = (label: string) =>
      element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

    expect(element.textContent).toContain('December 2026');

    button(en.month.next).click();
    await fixture.whenStable();
    expect(element.textContent).toContain('January 2027');

    button(en.month.previous).click();
    button(en.month.previous).click();
    await fixture.whenStable();
    expect(element.textContent).toContain('November 2026');
  });

  it('should show the month and its buttons in the new language without being created again', async () => {
    TestBed.inject(SelectedMonthService).set('2026-11');
    const fixture = TestBed.createComponent(MonthPicker);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    await TestBed.inject(LanguageService).use(APP_LOCALE.esAR);
    await fixture.whenStable();

    expect(element.textContent).toContain('Noviembre de 2026');
    expect(
      Array.from(element.querySelectorAll('button')).map((button) =>
        button.getAttribute('aria-label'),
      ),
    ).toEqual(['Mes anterior', 'Mes siguiente']);
  });
});
