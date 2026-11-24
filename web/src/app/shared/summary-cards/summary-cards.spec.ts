import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AXE_TEST_TIMEOUT_MS, expectNoAxeViolations } from '../../core/axe.testing';
import { provideTestTranslations } from '../../core/i18n/translations.testing';
import { CURRENCY } from '../../core/money';
import { providePhoneScreen } from '../../core/screen-size.testing';
import { STAT_CARD_TONE } from '../stat-card/stat-card';
import { SummaryCards, SummaryFigure } from './summary-cards';

describe('SummaryCards', () => {
  let fixture: ComponentFixture<SummaryCards>;
  let element: HTMLElement;

  const figures: SummaryFigure[] = [
    { label: 'Income', amount: 100000, tone: STAT_CARD_TONE.income },
    { label: 'Expenses', amount: 2400, tone: STAT_CARD_TONE.expense },
    { label: 'Balance', amount: 97600, tone: STAT_CARD_TONE.highlight },
  ];

  const texts = (selector: string) =>
    Array.from(element.querySelectorAll(selector)).map((item) =>
      item.textContent?.replace(/\s+/g, ' ').trim(),
    );

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(SummaryCards);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('figures', figures);
    fixture.componentRef.setInput('currency', CURRENCY.USD);
    fixture.componentRef.setInput('badge', { label: 'Increase', value: '+ 21%' });
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
  });

  it('should show one card per figure and the badge in a card of its own', async () => {
    await render();

    expect(element.classList).toContain('stat-cards');
    expect(texts('.stat-label')).toEqual(['Income', 'Expenses', 'Balance', 'Increase']);
    expect(texts('.stat-value')).toEqual(['$1,000.00', '$24.00', '$976.00', '+ 21%']);
  });

  describe('on a phone', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [providePhoneScreen()] });
    });

    it(
      'should show the last figure as the main one, with the others as details',
      async () => {
        await render();

        expect(element.classList).not.toContain('stat-cards');
        expect(element.querySelector('app-stat-card')).toBeNull();
        expect(texts('.summary-main h2, .summary-value, .summary-badge')).toEqual([
          'Balance',
          '$976.00',
          'Increase: + 21%',
        ]);
        expect(texts('.summary-details dt, .summary-details dd')).toEqual([
          'Income',
          '$1,000.00',
          'Expenses',
          '$24.00',
        ]);
        await expectNoAxeViolations(element);
      },
      AXE_TEST_TIMEOUT_MS,
    );

    it('should show the chosen main figure', async () => {
      await render();
      fixture.componentRef.setInput('mainIndex', 0);
      await fixture.whenStable();

      expect(texts('.summary-total h2, .summary-value')).toEqual(['Income', '$1,000.00']);
    });
  });
});
