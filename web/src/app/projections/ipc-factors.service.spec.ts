import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../core/api-url';
import { IPC_ESTIMATE } from './ipc-factors';
import { IPC_FACTORS_REQUEST, IpcFactorsService } from './ipc-factors.service';

const TEST_API_URL = 'https://api.test/api';

describe('IpcFactorsService', () => {
  let service: IpcFactorsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: TEST_API_URL },
      ],
    });
    service = TestBed.inject(IpcFactorsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should ask for the factors of an average estimate and read the response', async () => {
    const factors = firstValueFrom(
      service.factors({
        from: '2026-11',
        months: 13,
        every: 4,
        lastIncrease: '2026-08',
        settings: { estimate: IPC_ESTIMATE.average, averageMonths: 6 },
      }),
    );

    const request = http.expectOne(
      (req) => req.url === `${TEST_API_URL}${IPC_FACTORS_REQUEST.path}`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.toString()).toBe(
      'from=2026-11&months=13&every=4&last_increase=2026-08&estimate=average&average_months=6',
    );
    request.flush({
      data: [{ month: '2026-11', factor: '1.0000', increases: false, estimated: false }],
      meta: {
        last_month: '2026-09',
        estimate: 'average',
        monthly_estimate: '2.11',
        source: 'INDEC',
      },
    });

    expect(await factors).toEqual({
      months: [{ month: '2026-11', factor: '1.0000', increases: false, estimated: false }],
      lastMonth: '2026-09',
      monthlyEstimate: '2.11',
      source: 'INDEC',
    });
  });

  it('should send the rate of a custom estimate', () => {
    service
      .factors({
        from: '2026-11',
        months: 13,
        every: 1,
        lastIncrease: '2026-11',
        settings: { estimate: IPC_ESTIMATE.custom, rate: '2.5' },
      })
      .subscribe();

    const request = http.expectOne(() => true);
    expect(request.request.params.get('estimate')).toBe(IPC_ESTIMATE.custom);
    expect(request.request.params.get('rate')).toBe('2.5');
    expect(request.request.params.has('average_months')).toBe(false);
    request.flush({
      data: [],
      meta: { last_month: null, estimate: 'custom', monthly_estimate: '2.50', source: 'INDEC' },
    });
  });
});
