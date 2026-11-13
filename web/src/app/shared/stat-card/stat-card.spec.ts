import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CURRENCY } from '../../core/money';
import { STAT_CARD_TONE, StatCard } from './stat-card';

describe('StatCard', () => {
  let fixture: ComponentFixture<StatCard>;

  const value = () => (fixture.nativeElement as HTMLElement).querySelector('.stat-value')!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCard],
    }).compileComponents();

    fixture = TestBed.createComponent(StatCard);
    fixture.componentRef.setInput('label', 'Income');
    fixture.componentRef.setInput('amount', '1250.50');
    fixture.componentRef.setInput('currency', CURRENCY.USD);
  });

  it('should show the label and the formatted amount', async () => {
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.stat-label').textContent).toContain('Income');
    expect(value().textContent).toContain('$1,250.50');
  });

  it('should not color a neutral amount', async () => {
    await fixture.whenStable();

    expect(value().classList).not.toContain('amount-income');
    expect(value().classList).not.toContain('amount-expense');
  });

  it.each([
    [STAT_CARD_TONE.income, 'amount-income'],
    [STAT_CARD_TONE.expense, 'amount-expense'],
  ])('should color an %s amount', async (tone, cssClass) => {
    fixture.componentRef.setInput('tone', tone);
    await fixture.whenStable();

    expect(value().classList).toContain(cssClass);
  });
});
