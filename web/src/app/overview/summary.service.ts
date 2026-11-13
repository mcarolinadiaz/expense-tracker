import { Service } from '@angular/core';
import { Observable, of } from 'rxjs';
import { CURRENCY, Currency } from '../core/money';
import { MonthlySummary } from './summary';

const SAMPLE_SUMMARIES: Record<Currency, Omit<MonthlySummary, 'month' | 'currency'>> = {
  [CURRENCY.ARS]: {
    income: '2090000.00',
    expense: '1221950.50',
    balance: '868049.50',
    by_category: [
      { name: 'Alquiler', total: '620000.00' },
      { name: 'Comida', total: '284350.50' },
      { name: 'Servicios', total: '148900.00' },
      { name: 'Transporte', total: '96200.00' },
      { name: 'Salidas', total: '72500.00' },
    ],
  },
  [CURRENCY.USD]: {
    income: '1200.00',
    expense: '358.50',
    balance: '841.50',
    by_category: [
      { name: 'Viajes', total: '310.50' },
      { name: 'Servicios', total: '48.00' },
    ],
  },
};

@Service()
export class SummaryService {
  getSummary(month: string, currency: Currency): Observable<MonthlySummary> {
    return of({ month, currency, ...SAMPLE_SUMMARIES[currency] });
  }
}
