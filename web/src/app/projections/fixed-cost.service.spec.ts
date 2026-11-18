import { TestBed } from '@angular/core/testing';
import { filter, firstValueFrom } from 'rxjs';
import { AppDb } from '../core/db/app-db';
import { CURRENCY } from '../core/money';
import { INCREASE_RULE, NewFixedCost } from './fixed-cost';
import { FixedCostService } from './fixed-cost.service';

describe('FixedCostService', () => {
  let service: FixedCostService;

  const rent: NewFixedCost = {
    name: ' Alquiler ',
    currency: CURRENCY.ARS,
    amount: 62000000,
    every: 4,
    lastIncrease: '2026-08',
    increase: { rule: INCREASE_RULE.ipc },
  };

  beforeEach(() => {
    service = TestBed.inject(FixedCostService);
  });

  afterEach(async () => {
    await TestBed.inject(AppDb).delete();
  });

  it('should save a fixed cost with its name trimmed and list it by currency', async () => {
    await firstValueFrom(service.add(rent));
    await firstValueFrom(
      service.add({
        ...rent,
        name: 'Netflix',
        currency: CURRENCY.USD,
        amount: 1199,
        increase: { rule: INCREASE_RULE.percent, percent: '10' },
      }),
    );

    const ars = await firstValueFrom(service.list(CURRENCY.ARS));

    expect(ars).toEqual([{ ...rent, id: expect.any(Number), name: 'Alquiler' }]);
  });

  it('should sort the fixed costs by name', async () => {
    await firstValueFrom(service.add({ ...rent, name: 'Prepaga' }));
    await firstValueFrom(service.add({ ...rent, name: 'Gimnasio' }));

    const names = (await firstValueFrom(service.list(CURRENCY.ARS))).map((cost) => cost.name);

    expect(names).toEqual(['Gimnasio', 'Prepaga']);
  });

  it('should emit again after deleting a fixed cost', async () => {
    const id = await firstValueFrom(service.add(rent));
    const emptied = firstValueFrom(
      service.list(CURRENCY.ARS).pipe(filter((costs) => costs.length === 0)),
    );

    await firstValueFrom(service.remove(id));

    expect(await emptied).toEqual([]);
  });
});
