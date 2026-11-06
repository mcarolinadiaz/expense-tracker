import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { CURRENCY, Currency } from '../core/api/money';
import { APP_TEXT } from '../core/constants/app-text';
import { SummaryService } from '../shared/services/summary.service';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  const getSummary = vi.fn((month: string, currency: Currency) =>
    of({ month, currency, income: '30.00', expense: '10.00', balance: '20.00', by_category: [] }),
  );

  const text = (selector: string) =>
    Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll(selector)).map((element) =>
      element.textContent?.trim(),
    );

  beforeEach(async () => {
    getSummary.mockClear();

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [{ provide: SummaryService, useValue: { getSummary } }],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should request the current month in the default currency', () => {
    expect(getSummary).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}$/), CURRENCY.ARS);
  });

  it('should show the totals from the service in the cards', () => {
    expect(text('app-stat-card .stat-label')).toEqual([
      APP_TEXT.summary.income,
      APP_TEXT.summary.expenses,
      APP_TEXT.summary.balance,
    ]);
    expect(text('app-stat-card .stat-value').map((value) => value?.replace(/[^\d.]/g, ''))).toEqual([
      '30.00',
      '10.00',
      '20.00',
    ]);
  });
});
