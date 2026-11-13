import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { CURRENCIES } from '../../core/api/money';
import { SummaryService } from './summary.service';

describe('SummaryService', () => {
  let service: SummaryService;

  beforeEach(() => {
    service = TestBed.inject(SummaryService);
  });

  it.each(CURRENCIES)(
    'should return the summary for the requested month in %s',
    async (currency) => {
      const summary = await firstValueFrom(service.getSummary('2026-11', currency));

      expect(summary.month).toBe('2026-11');
      expect(summary.currency).toBe(currency);
      expect(summary.by_category.length).toBeGreaterThan(0);
    },
  );
});
