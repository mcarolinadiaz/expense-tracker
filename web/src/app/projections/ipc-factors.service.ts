import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_URL } from '../core/api-url';
import { YearMonth } from '../core/dates';
import { IPC_ESTIMATE, IpcFactors, IpcFactorsQuery } from './ipc-factors';

/** The path and query parameters of `GET /api/ipc/factors`. */
export const IPC_FACTORS_REQUEST = {
  path: '/ipc/factors',
  param: {
    from: 'from',
    months: 'months',
    every: 'every',
    lastIncrease: 'last_increase',
    estimate: 'estimate',
    rate: 'rate',
    averageMonths: 'average_months',
  },
} as const;

const { param } = IPC_FACTORS_REQUEST;

interface IpcFactorsResponse {
  data: { month: YearMonth; factor: string; increases: boolean; estimated: boolean }[];
  meta: {
    last_month: YearMonth | null;
    estimate: string;
    monthly_estimate: string;
    source: string;
  };
}

/** Reads IPC adjustment factors from the public API. It only sends months and estimate settings. */
@Service()
export class IpcFactorsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  factors(query: IpcFactorsQuery): Observable<IpcFactors> {
    let params = new HttpParams()
      .set(param.from, query.from)
      .set(param.months, query.months)
      .set(param.every, query.every)
      .set(param.lastIncrease, query.lastIncrease)
      .set(param.estimate, query.settings.estimate);

    params =
      query.settings.estimate === IPC_ESTIMATE.custom
        ? params.set(param.rate, query.settings.rate)
        : params.set(param.averageMonths, query.settings.averageMonths);

    return this.http
      .get<IpcFactorsResponse>(`${this.apiUrl}${IPC_FACTORS_REQUEST.path}`, { params })
      .pipe(
        map(({ data, meta }) => ({
          months: data,
          lastMonth: meta.last_month,
          monthlyEstimate: meta.monthly_estimate,
          source: meta.source,
        })),
      );
  }
}
