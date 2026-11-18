import { ComponentFixture, TestBed } from '@angular/core/testing';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { AXE_TEST_TIMEOUT_MS, expectNoAxeViolations } from '../core/axe.testing';
import { provideFixedClock } from '../core/clock.testing';
import { APP_TEXT } from '../core/constants/app-text';
import { shiftMonth } from '../core/dates';
import { AppDb } from '../core/db/app-db';
import { CURRENCY } from '../core/money';
import { INCREASE_RULE, NewFixedCost } from './fixed-cost';
import { FixedCostService } from './fixed-cost.service';
import { IPC_ESTIMATE, IpcFactors, IpcFactorsQuery } from './ipc-factors';
import { IpcFactorsService } from './ipc-factors.service';
import { Projections, PROJECTIONS_IDS } from './projections';

function factorsFor(query: IpcFactorsQuery): IpcFactors {
  return {
    months: Array.from({ length: query.months }, (_, index) => ({
      month: shiftMonth(query.from, index),
      factor: index === 0 ? '1' : '1.1',
      increases: index === 1,
      estimated: index > 1,
    })),
    lastMonth: '2026-09',
    monthlyEstimate: '2.11',
    source: 'INDEC',
  };
}

describe('Projections', () => {
  let fixture: ComponentFixture<Projections>;
  let element: HTMLElement;
  let factors: ReturnType<typeof vi.fn<(query: IpcFactorsQuery) => Observable<IpcFactors>>>;

  const rent: NewFixedCost = {
    name: 'Alquiler',
    currency: CURRENCY.ARS,
    amount: 100000,
    every: 4,
    lastIncrease: '2026-08',
    increase: { rule: INCREASE_RULE.ipc },
  };

  beforeEach(() => {
    factors = vi.fn((query: IpcFactorsQuery) => of(factorsFor(query)));
    TestBed.configureTestingModule({
      providers: [
        provideFixedClock('2026-11-18'),
        { provide: IpcFactorsService, useValue: { factors } },
      ],
    });
  });

  afterEach(async () => {
    await TestBed.inject(AppDb).delete();
  });

  async function addCost(cost: Partial<NewFixedCost> = {}): Promise<void> {
    await firstValueFrom(TestBed.inject(FixedCostService).add({ ...rent, ...cost }));
  }

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(Projections);
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  async function settleUntil(assertion: () => void): Promise<void> {
    await vi.waitFor(async () => {
      await fixture.whenStable();
      assertion();
    });
  }

  function button(label: string): HTMLButtonElement {
    return Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find(
      (candidate) => candidate.textContent?.trim() === label,
    )!;
  }

  function rowTexts(): string[] {
    return Array.from(element.querySelectorAll('tbody th')).map((cell) =>
      Array.from(cell.querySelectorAll('span'))
        .map((part) => part.textContent?.trim())
        .join(' '),
    );
  }

  it(
    'should invite to add the first fixed cost of the currency',
    async () => {
      await render();
      await settleUntil(() =>
        expect(element.textContent).toContain(APP_TEXT.projections.emptyTitle(CURRENCY.ARS)),
      );

      expect(element.querySelector('table')).toBeNull();
      await expectNoAxeViolations(element);
    },
    AXE_TEST_TIMEOUT_MS,
  );

  it(
    'should show each cost month by month, with totals, summary and the IPC estimate',
    async () => {
      await addCost();
      await addCost({
        name: 'Internet',
        amount: 50000,
        every: 1,
        lastIncrease: '2026-11',
        increase: { rule: INCREASE_RULE.percent, percent: '10' },
      });
      await render();
      await settleUntil(() => expect(rowTexts()).toHaveLength(2));

      expect(rowTexts()).toEqual([
        'Alquiler IPC every 4 months · last: Aug 26',
        'Internet + 10% every month · last: Nov 26',
      ]);
      const headers = Array.from(element.querySelectorAll('thead th')).map((cell) =>
        cell.textContent?.trim(),
      );
      expect(headers.slice(0, 3)).toEqual([APP_TEXT.projections.fixedCost, 'Nov 26', 'Dec 26']);
      const totals = Array.from(element.querySelectorAll('tfoot td')).map((cell) =>
        cell.textContent?.trim().replace(/\s/g, ' '),
      );
      expect(totals.slice(0, 2)).toEqual(['ARS 1,500.00', 'ARS 1,650.00']);
      expect(element.querySelectorAll('.cell-increase').length).toBeGreaterThan(0);
      expect(element.textContent).toContain(
        APP_TEXT.projections.ipcSource('INDEC', 'September 2026'),
      );
      expect(element.textContent).toContain('2.11%');
      await expectNoAxeViolations(element);
    },
    AXE_TEST_TIMEOUT_MS,
  );

  it('should only show the costs of the chosen currency', async () => {
    await addCost();
    await addCost({ name: 'Software', currency: CURRENCY.USD, amount: 2400 });
    await render();
    await settleUntil(() => expect(rowTexts()).toHaveLength(1));

    fixture.componentInstance['currency'].set(CURRENCY.USD);

    await settleUntil(() => expect(rowTexts()[0]).toContain('Software'));
  });

  it('should delete a cost', async () => {
    await addCost();
    await render();
    await settleUntil(() => expect(rowTexts()).toHaveLength(1));

    element
      .querySelector<HTMLButtonElement>(
        `[aria-label="${APP_TEXT.projections.deleteCost('Alquiler')}"]`,
      )!
      .click();

    await settleUntil(() =>
      expect(element.textContent).toContain(APP_TEXT.projections.emptyTitle(CURRENCY.ARS)),
    );
  });

  it(
    'should warn while the IPC is unavailable and try again on request',
    async () => {
      factors.mockReturnValueOnce(throwError(() => new Error('offline')));
      await addCost();
      await render();
      await settleUntil(() => expect(element.textContent).toContain(APP_TEXT.projections.ipcDown));

      expect(rowTexts()[0]).toContain(APP_TEXT.projections.ipcPending);
      await expectNoAxeViolations(element);

      button(APP_TEXT.actions.tryAgain).click();

      await settleUntil(() =>
        expect(element.textContent).not.toContain(APP_TEXT.projections.ipcDown),
      );
    },
    AXE_TEST_TIMEOUT_MS,
  );

  it(
    'should start a custom estimate from the current one and only send valid rates',
    async () => {
      await render();
      await settleUntil(() => expect(element.textContent).toContain('2.11%'));

      button(APP_TEXT.projections.estimates[IPC_ESTIMATE.custom]).click();
      await fixture.whenStable();
      const rate = element.querySelector<HTMLInputElement>(`#${PROJECTIONS_IDS.customRate}`)!;
      expect(rate.value).toBe('2.11');
      await settleUntil(() =>
        expect(factors).toHaveBeenLastCalledWith(
          expect.objectContaining({ settings: { estimate: IPC_ESTIMATE.custom, rate: '2.11' } }),
        ),
      );

      const calls = factors.mock.calls.length;
      rate.value = '80';
      rate.dispatchEvent(new Event('input'));
      rate.dispatchEvent(new Event('blur'));
      await settleUntil(() =>
        expect(element.textContent).toContain(APP_TEXT.projections.customRateError),
      );

      expect(factors).toHaveBeenCalledTimes(calls);
      await expectNoAxeViolations(element);
    },
    AXE_TEST_TIMEOUT_MS,
  );
});
