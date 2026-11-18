import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CURRENCY } from '../../core/money';
import { STAT_CARD_TONE, StatCard } from './stat-card';

describe('StatCard', () => {
  let fixture: ComponentFixture<StatCard>;

  const element = () => fixture.nativeElement as HTMLElement;
  const value = () => element().querySelector('.stat-value')!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCard],
    }).compileComponents();

    fixture = TestBed.createComponent(StatCard);
    fixture.componentRef.setInput('label', 'Income');
    fixture.componentRef.setInput('amount', 125050);
    fixture.componentRef.setInput('currency', CURRENCY.USD);
    fixture.componentRef.setInput('tone', STAT_CARD_TONE.income);
  });

  it('should show the label and the formatted amount', async () => {
    await fixture.whenStable();

    expect(element().querySelector('.stat-label')!.textContent).toContain('Income');
    expect(value().textContent?.trim()).toBe('$1,250.50');
  });

  it('should write a negative amount with a minus sign', async () => {
    fixture.componentRef.setInput('amount', -125050);
    await fixture.whenStable();

    expect(value().textContent?.trim()).toBe('− $1,250.50');
  });

  it.each([
    [STAT_CARD_TONE.income, 'amount-income'],
    [STAT_CARD_TONE.expense, 'amount-expense'],
  ])('should color an %s amount', async (tone, cssClass) => {
    fixture.componentRef.setInput('tone', tone);
    await fixture.whenStable();

    expect(value().classList).toContain(cssClass);
  });

  it('should show a highlighted amount on a dark card, without color', async () => {
    fixture.componentRef.setInput('tone', STAT_CARD_TONE.highlight);
    await fixture.whenStable();

    expect(element().querySelector('article')!.classList).toContain('card-inverse');
    expect(value().classList).not.toContain('amount-income');
    expect(value().classList).not.toContain('amount-expense');
  });
});
